/**
 * config/index.js - API pública del panel de configuración.
 *
 * Responsabilidades:
 * - Renderizar el panel en #panel-config.
 * - Gestionar: edición de perfil, exportar datos, importar datos, reset.
 * - No usa EventBus (las mutaciones se manejan directamente aquí).
 */

import { S, EventBus } from '../../core/state.js';
import { save, restaurarBlob, borrarTodo } from '../../core/storage.js';
import { registrarAccion } from '../../ui/actions.js';
import { renderSmart } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { hoy, esc } from '../../infra/utils.js';
import { icon } from '../../infra/icons.js';
import { mdToHtml } from '../../infra/markdown.js';
import { SITUACIONES_LABORALES } from '../../core/constants.js';
import { confirmar } from '../../ui/confirm.js';
import { pedirPermiso } from '../../infra/notificaciones.js';
import { LABEL_SECCION_AVISO } from '../../infra/avisos.js';
import { PERSISTENCIA, estadoPersistencia, solicitarPersistencia } from '../../infra/persistencia.js';
import {
  cifradoDisponible, cifrarRespaldo, descifrarRespaldo, esRespaldoCifrado,
} from '../../infra/cripto-respaldo.js';
import { pedirContrasenaRespaldo } from '../../ui/contrasena-respaldo.js';
import { abrirModal } from '../../ui/modales.js';
import { renderPanelConfig, renderModalFiscal, miles, desdeMiles, textoUltimoRespaldo } from './view.js';
import { gastosACSV } from '../export/logic.js';
import { documentoLegalPorId, cargarDocumentoLegal, VERSION_LEGAL } from './legal.js';
import { validarPin, crearBloqueo, verificarPin, limpiarFallos } from './bloqueo.js';
import { confirmarPin } from '../../ui/bloqueo-acceso.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { mostrarToast } from '../../ui/toast.js';

// ── CONFIRMACIÓN VISIBLE DE GUARDADO (R14/R15) ───────────────────
//
// Los tres formularios guardaban, re-renderizaban el panel entero y
// terminaban en `announce()`, que escribe en una live region `sr-only`: el
// usuario vidente no veía nada y encima perdía el foco y la posición de
// scroll. Ahora el chip verde del propio bloque se enciende unos segundos y
// el panel no se vuelve a pintar: los campos ya muestran lo que se guardó.

/** Milisegundos que el chip "Guardado" queda visible. */
const _MS_CONFIRMACION = 3000;

/** @type {Map<string, number>} id del chip → temporizador que lo apaga. */
const _confirmaciones = new Map();

/**
 * Enciende el chip "Guardado" del bloque recién persistido.
 * @param {string} id - id del `<span class="chip chip-success">` del bloque.
 */
function _confirmarGuardado(id) {
  const chip = document.getElementById(id);
  if (!chip) return;
  chip.hidden = false;
  clearTimeout(_confirmaciones.get(id));
  _confirmaciones.set(id, setTimeout(() => { chip.hidden = true; }, _MS_CONFIRMACION));
}

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

async function _exportarDatos() {
  const ok = await confirmarPin();
  if (!ok) return;

  // Cifrado opcional (CFG.4c, ADR 043 D2.3). El PIN de arriba autoriza la
  // acción dentro de la app; esta contraseña abre el archivo. Son secretos
  // distintos y se piden por separado, en ese orden.
  const cifrar = S.config?.respaldoCifrado === true && cifradoDisponible();
  let contrasena = null;
  if (cifrar) {
    contrasena = await pedirContrasenaRespaldo({ modo: 'crear' });
    if (contrasena === null) return; // canceló: no se exporta nada.
  }

  try {
    const plano = JSON.stringify(S, null, 2);
    const json  = contrasena === null ? plano : await cifrarRespaldo(plano, contrasena);
    const blob  = new Blob([json], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const fecha = hoy();
    const a     = document.createElement('a');
    a.href     = url;
    // El nombre distingue los dos archivos: restaurar el que no era pide la
    // contraseña equivocada y confunde justo cuando el usuario tiene prisa.
    a.download = contrasena === null
      ? `finko-backup-${fecha}.json`
      : `finko-backup-cifrado-${fecha}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // Sello del último respaldo (CFG.4b, ADR 043 D2.2). Solo el respaldo
    // completo lo actualiza: exportar gastos a CSV no cuenta, es parcial.
    if (!S.config || typeof S.config !== 'object') S.config = {};
    S.config.ultimoRespaldoISO = fecha;
    save();
    const sello = document.getElementById('config-ultimo-respaldo');
    if (sello) sello.textContent = textoUltimoRespaldo(fecha);

    announce('Datos exportados correctamente.');
  } catch (err) {
    console.error('[config] exportarDatos falló:', err);
    announce('No se pudo exportar. Intenta de nuevo.', 'assertive');
  }
}

/**
 * Abre el selector de archivo del importador de respaldo (B5/R17). El input
 * vive con `hidden`, que sí lo saca del orden de foco y del árbol de
 * accesibilidad; antes era un `<input class="sr-only" aria-hidden="true">`
 * dentro de un `<label class="btn">`: recibía foco estando marcado
 * aria-hidden, justo lo que señala la regla axe `aria-hidden-focus`.
 */
function _abrirImportadorDatos() {
  document.getElementById('config-importar-json')?.click();
}

/** @param {HTMLElement} el - el <input type="file"> */
async function _importarDatos(el) {
  const file = el.files?.[0];
  if (!file) return;

  const ok = await confirmar({
    titulo:         'Importar datos',
    mensaje:        `¿Importar datos desde "${file.name}"? Esto reemplazará TODA tu información actual.`,
    confirmarTexto: 'Importar',
    peligroso:      true,
  });
  if (!ok) {
    el.value = '';
    return;
  }

  const okPin = await confirmarPin();
  if (!okPin) {
    el.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const texto = e.target.result;

    // Detección transparente (CFG.4c, ADR 043 D2.3): el usuario no elige
    // "importar cifrado" en ningún lado; lo dice el archivo. Un respaldo en
    // claro sigue el camino de siempre sin pedir nada.
    let contenido = texto;
    if (esRespaldoCifrado(texto)) {
      const plano = await _descifrarConContrasena(texto);
      if (plano === null) { el.value = ''; return; } // canceló o no acertó.
      contenido = plano;
    }

    const resultado = restaurarBlob(contenido);

    if (resultado === 'ok') {
      announce('Datos importados. Recargando…');
      setTimeout(() => location.reload(), 800);
      return;
    }

    // 'error-escritura' (cupo lleno) no se anuncia acá: `restaurarBlob()` ya
    // emitió `storage:error` y el listener de abajo lo anuncia y repinta el
    // panel con el aviso persistente. Dos mensajes en la misma live region se
    // pisarían entre ellos.
    if (resultado === 'json-invalido') {
      announce('El archivo no es un JSON válido de Finko.', 'assertive');
    }
    el.value = '';
  };
  reader.readAsText(file);
}

/**
 * Pide la contraseña y descifra, dejando reintentar sin cerrar el modal.
 *
 * El error de contraseña se resuelve **dentro** del modal (`verificar`) en vez
 * de cerrarlo y volver a abrirlo: escribir mal una contraseña larga es lo
 * normal, y reabrir el diálogo perdería el foco y el contexto en cada intento.
 *
 * @param {string} texto Contenido crudo del archivo cifrado.
 * @returns {Promise<string|null>} El JSON en claro, o null si canceló.
 */
async function _descifrarConContrasena(texto) {
  let plano = null;

  await pedirContrasenaRespaldo({
    modo: 'abrir',
    verificar: async (contrasena) => {
      const r = await descifrarRespaldo(texto, contrasena);
      if (r.ok) { plano = r.json; return null; }
      return r.motivo === 'contrasena-incorrecta'
        ? 'Esa contraseña no abre este archivo.'
        : 'El archivo está dañado o no es un respaldo de Finko.';
    },
  });

  return plano;
}

// ── BORRADO AUTOMÁTICO DEL NAVEGADOR (CFG.4a, ADR 043 D2.1) ──────
//
// El bloque nace `hidden` en `view.js` porque el estado llega por promesa.
// Estos dos handlers son toda su vida: uno lo pinta al abrir el panel, el otro
// pide la protección y vuelve a pintarlo con lo que el navegador respondió.

/** Copy de cada estado. Sin promesas que la API no cumple (ADR 043, "lo que NO resuelve"). */
const _COPY_PERSISTENCIA = Object.freeze({
  [PERSISTENCIA.CONCEDIDA]:
    'Este navegador ya no borra los datos de Finko por su cuenta para liberar espacio. Aun así guarda un respaldo: esto no te cubre si pierdes el dispositivo.',
  [PERSISTENCIA.NO_CONCEDIDA]:
    'Si este dispositivo se queda sin espacio, el navegador puede borrar los datos de Finko sin avisarte. Puedes pedirle que no lo haga.',
  [PERSISTENCIA.NO_SOPORTADO]:
    'Este navegador no permite pedir esa protección. El respaldo es tu única red: guárdalo de vez en cuando.',
});

/**
 * Pinta el bloque con el estado real. Se llama al inyectar el panel y otra vez
 * después de pedir la protección.
 *
 * Toca solo el texto y los dos `hidden`: no re-renderiza el panel, mismo
 * criterio que el chip de guardado. Un re-render acá cerraría el `<details>` de
 * Impuestos y perdería el scroll por un párrafo que cambia.
 */
async function _pintarPersistencia() {
  const bloque = document.getElementById('config-persistencia');
  if (!bloque) return;

  const estado = await estadoPersistencia();
  const texto  = document.getElementById('config-persistencia-estado');
  const boton  = document.getElementById('config-persistencia-btn');

  if (texto) texto.textContent = _COPY_PERSISTENCIA[estado] ?? '';
  // El botón solo existe cuando hay algo que pedir: concedida no se re-pide y
  // no-soportado no tiene a quién pedirle.
  if (boton) boton.hidden = estado !== PERSISTENCIA.NO_CONCEDIDA;
  bloque.hidden = false;
}

/**
 * Repinta el panel entero **y lo vuelve a cablear**. Es lo que tienen que usar
 * los interruptores, no `renderPanelConfig()` a secas.
 *
 * `renderPanelConfig()` reemplaza el `innerHTML` de `#panel-config`, así que se
 * lleva con él los listeners que `_inyectarPanel()` había puesto sobre nodos
 * concretos: el `change` del `<input type="file">` que importa el respaldo y
 * los `submit` del perfil y de los tres formularios del candado. Las acciones
 * con `data-action` sobreviven porque están delegadas en `actions.js`; estas
 * cuatro no. Desde CFG.4a se sumó un tercer efecto: el bloque de persistencia
 * volvía a quedar `hidden` y vacío, porque su estado no vive en `S`.
 *
 * Los cuatro interruptores llamaban a `renderPanelConfig()` directo, así que
 * tocar cualquiera de ellos dejaba "Restaurar desde un respaldo" sin efecto
 * hasta salir de Ajustes y volver a entrar (CFG.4c).
 */
function _repintarPanel() {
  _inyectarPanel();
}

/**
 * Pide la protección. Quien decide es el navegador (Chromium la concede sin
 * preguntar, Firefox abre un permiso), así que nunca se anuncia éxito por haber
 * llamado: se anuncia lo que devolvió.
 */
async function _protegerDatos() {
  const estado = await solicitarPersistencia();
  await _pintarPersistencia();

  if (estado === PERSISTENCIA.CONCEDIDA) {
    mostrarToast({
      titulo:  'Datos protegidos',
      detalle: 'El navegador ya no los borra para liberar espacio.',
    });
    announce('Tus datos quedaron protegidos del borrado automático.');
    return;
  }

  // Un "no" del navegador no es un error de la app y no se puede forzar: el
  // botón queda visible para reintentar y el mensaje dice qué sí sirve.
  announce('El navegador no concedió la protección. Guarda un respaldo para no depender de eso.', 'assertive');
}

async function _activarNotificaciones() {
  const resultado = await pedirPermiso();
  if (resultado === 'granted') {
    if (!S.config) S.config = {};
    S.config.notificaciones = true;
    save();
    _repintarPanel();
    announce('Recordatorios activados. Recibirás una alerta al abrir Finko si tienes compromisos próximos.');
  } else if (resultado === 'denied') {
    announce('El navegador bloqueó las notificaciones. Habilita el permiso desde la configuración del navegador.', 'assertive');
  } else {
    announce('No se pudo activar los recordatorios en este momento.', 'assertive');
  }
}

/** @param {HTMLElement} el - el <input type="checkbox"> */
function _toggleNotificaciones(el) {
  if (!S.config) S.config = {};
  S.config.notificaciones = el.checked;
  save();
  _repintarPanel();
  announce(el.checked ? 'Recordatorios activados.' : 'Recordatorios desactivados.');
}

/**
 * Interruptor por sección de aviso (CFG.3c, ADR 066 nota 2026-08-13).
 * @param {HTMLElement} el - el <input type="checkbox"> con data-seccion.
 */
function _toggleAvisoSeccion(el) {
  const seccion = el.dataset.seccion;
  if (!seccion) return;
  if (!S.config) S.config = {};
  if (!S.config.avisosPorSeccion) S.config.avisosPorSeccion = {};
  S.config.avisosPorSeccion[seccion] = el.checked;
  save();
  _repintarPanel();
  const label = LABEL_SECCION_AVISO[seccion] ?? seccion;
  announce(`Avisos de ${label} ${el.checked ? 'activados' : 'desactivados'}.`);
}

/**
 * Interruptor de respaldo cifrado (CFG.4c, ADR 043 D2.3). Solo guarda la
 * preferencia: la contraseña se pide al exportar y **nunca** se persiste.
 * @param {HTMLElement} el - el <input type="checkbox">
 */
function _toggleRespaldoCifrado(el) {
  if (!S.config) S.config = {};
  S.config.respaldoCifrado = el.checked;
  save();
  _repintarPanel();
  announce(el.checked
    ? 'El respaldo se va a cifrar con la contraseña que elijas al guardarlo.'
    : 'El respaldo se va a guardar sin contraseña.');
}

/** @param {HTMLElement} el - el <input type="checkbox"> */
function _toggleAtajos(el) {
  if (!S.config) S.config = {};
  S.config.atajosTeclado = el.checked;
  save();
  _repintarPanel();
  announce(el.checked ? 'Atajos de teclado activados.' : 'Atajos de teclado desactivados.');
}

function _exportarGastosCSV() {
  const csv = gastosACSV(S.gastos ?? [], S.cuentas ?? []);
  if (!csv) {
    announce('No hay gastos para exportar.', 'assertive');
    return;
  }
  try {
    const blob  = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url   = URL.createObjectURL(blob);
    const fecha = hoy();
    const a     = document.createElement('a');
    a.href     = url;
    a.download = `finko-gastos-${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    const n = S.gastos?.length ?? 0;
    announce(`${n} gasto${n === 1 ? '' : 's'} exportado${n === 1 ? '' : 's'} a CSV.`);
  } catch (err) {
    console.error('[config] exportarGastosCSV falló:', err);
    announce('No se pudo exportar. Intenta de nuevo.', 'assertive');
  }
}

/**
 * Abre el modal genérico "Centro Legal" con el documento pedido (LEG.1).
 * Muestra un estado de carga mientras `fetch` trae el `.md` (mismo origen;
 * el service worker lo sirve desde cache si el dispositivo está offline),
 * lo convierte con `mdToHtml` y lo pinta. Si falla, un mensaje corto invita
 * a reintentar en vez de dejar el modal en blanco.
 * @param {string} id - id del catálogo `DOCUMENTOS_LEGALES`.
 */
async function _mostrarDocumentoLegal(id) {
  const doc = documentoLegalPorId(id);
  const overlay = document.getElementById('modal-legal');
  const body    = document.getElementById('modal-legal-body');
  const titulo  = document.getElementById('modal-legal-title');
  if (!doc || !overlay || !body) return;

  // B9: la marca de borrador viaja con el documento. Los `.md` traen
  // marcadores `[PENDIENTE: ...]` visibles y sin esto se leen como descuido.
  titulo.innerHTML = `${esc(doc.titulo)} <span class="chip">${esc(VERSION_LEGAL)}</span>`;
  body.innerHTML = '<p class="form-hint form-hint--muted">Cargando…</p>';
  abrirModal(overlay);

  try {
    const md = await cargarDocumentoLegal(doc);
    body.innerHTML = mdToHtml(md);
  } catch (err) {
    console.error('[config] cargarDocumentoLegal falló:', err);
    body.innerHTML = '<p class="form-hint form-hint--muted">No se pudo cargar este documento. Intenta de nuevo.</p>';
  }
}

// ── ASISTENTE FISCAL (CFG.2c, ADR 050 D1) ────────────────────────

/**
 * Cablea los dos formularios del asistente fiscal dentro del nodo que los
 * contiene. Mismo contrato de guardado que tenían montados en Ajustes: cada
 * uno persiste, enciende su propio chip y no cierra el modal (el usuario
 * puede llenar los dos sin que el primero le tape el segundo).
 * @param {HTMLElement} root - `#modal-fiscal-body`, ya con el HTML inyectado.
 */
function _wireFormularioFiscal(root) {
  // Guardar perfil fiscal (K.2).
  root.querySelector('#form-perfil-fiscal')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.target));
    if (!S.config) S.config = {};
    if (typeof S.config.perfilFiscal !== 'object' || S.config.perfilFiscal === null) {
      S.config.perfilFiscal = {};
    }
    S.config.perfilFiscal.ivaResponsable       = datos.ivaResponsable      === 'on';
    S.config.perfilFiscal.obligadoContabilidad = datos.obligadoContabilidad === 'on';
    S.config.perfilFiscal.declaranteObligado   = datos.declaranteObligado   === 'on';
    save();
    _confirmarGuardado('config-fiscal-ok');
    announce('Perfil fiscal guardado.');
  });

  // Guardar datos de renta manuales del año (K.4).
  root.querySelector('#form-datos-fiscales')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const anio  = Number(hoy().slice(0, 4));
    const datos = Object.fromEntries(new FormData(e.target));
    if (!S.config) S.config = {};
    if (typeof S.config.datosFiscales !== 'object' || S.config.datosFiscales === null
        || Array.isArray(S.config.datosFiscales)) {
      S.config.datosFiscales = {};
    }
    // Solo guardamos los campos efectivamente registrados (vacío = no provisto).
    // Los campos son `type="text"` con separador de miles (B4): `desdeMiles`
    // devuelve null cuando no quedó ningún dígito escrito.
    const entrada = {};
    for (const campo of ['ingresosBrutos', 'consumosTC', 'consignaciones']) {
      const n = desdeMiles(datos[campo]);
      if (n !== null && Number.isFinite(n) && n >= 0) entrada[campo] = n;
    }
    if (Object.keys(entrada).length > 0) {
      S.config.datosFiscales[anio] = entrada;
    } else {
      delete S.config.datosFiscales[anio];
    }
    save();
    _confirmarGuardado('config-renta-ok');
    announce('Datos de renta guardados.');
  });

  // Separador de miles mientras se escribe (B4/R16). El cursor queda al final:
  // son campos que se teclean de izquierda a derecha una vez al año.
  for (const campo of root.querySelectorAll('[data-miles]')) {
    campo.addEventListener('input', () => {
      const formateado = miles(campo.value);
      if (formateado === campo.value) return;
      campo.value = formateado;
      campo.setSelectionRange(formateado.length, formateado.length);
    });
  }
}

/**
 * Abre el asistente fiscal (botón "Completar perfil fiscal"). El HTML de los
 * dos formularios se inyecta recién acá, no en `renderPanelConfig()`: es la
 * ejecución de D1 del ADR 050, lo fiscal deja de ocupar Ajustes en reposo.
 */
function _abrirPerfilFiscal() {
  const overlay = document.getElementById('modal-fiscal');
  const body    = document.getElementById('modal-fiscal-body');
  if (!overlay || !body) return;
  body.innerHTML = renderModalFiscal();
  _wireFormularioFiscal(body);
  abrirModal(overlay);
}

/** Delegación de clicks dentro del visor: enlaces `[texto](otro.md)` cambian de documento sin cerrar el modal. */
function _wireLegalLinks() {
  document.getElementById('modal-legal-body')?.addEventListener('click', (e) => {
    const link = e.target.closest('[data-doc-link]');
    if (!link) return;
    e.preventDefault();
    _mostrarDocumentoLegal(link.dataset.docLink);
  });
}

async function _resetearApp() {
  const ok = await confirmar({
    titulo:         'Borrar todos mis datos',
    mensaje:        '¿Borrar TODO lo que tienes en Finko? Perderás gastos, cuentas, metas y compromisos de este dispositivo. No se puede deshacer.',
    confirmarTexto: 'Borrar todo',
    peligroso:      true,
  });
  if (!ok) return;
  const okPin = await confirmarPin();
  if (!okPin) return;
  borrarTodo();
  announce('App reseteada. Recargando…');
  setTimeout(() => location.reload(), 800);
}

// ── INIT ─────────────────────────────────────────────────────────

function _inyectarPanel() {
  renderPanelConfig();

  const panel = document.getElementById('panel-config');
  if (!panel) return;

  // Guardar perfil.
  panel.querySelector('#form-perfil')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const datos  = Object.fromEntries(new FormData(e.target));
    const nombre = datos.nombre?.trim();
    const sit    = String(datos.situacionLaboral ?? '');

    if (nombre) S.perfil.nombre = nombre;
    // Solo se acepta un id conocido o '' (sin especificar): nunca un valor libre.
    S.perfil.situacionLaboral = SITUACIONES_LABORALES.some(s => s.id === sit) ? sit : '';

    save();
    _confirmarGuardado('config-perfil-ok');
    announce('Perfil actualizado.');
  });

  // Importar: el input file no dispara data-action click - usamos change.
  panel.querySelector('#config-importar-json')
    ?.addEventListener('change', (e) => _importarDatos(e.target));

  // Candado de acceso (CFG.5a). Los tres formularios re-renderizan el panel a
  // propósito: la tarjeta cambia de forma (sin candado ↔ con candado), no es
  // el caso de "los campos ya muestran lo guardado" de los tres de arriba.
  panel.querySelector('#form-bloqueo-crear')?.addEventListener('submit', _crearCandado);
  panel.querySelector('#form-bloqueo-cambiar')?.addEventListener('submit', _crearCandado);
  panel.querySelector('#form-bloqueo-quitar')?.addEventListener('submit', _quitarCandado);

  // El bloque de borrado automático se llena aparte: su estado es asíncrono
  // (CFG.4a). Sin `await`: el resto del panel ya está pintado y usable.
  _pintarPersistencia();
}

// ── CANDADO DE ACCESO (CFG.5a, ADR 063) ──────────────────────────

/**
 * Encabezado del bloque de errores de los tres formularios del candado. El
 * default de `mostrarErroresForm()` habla de campos que faltan y acá el error
 * casi nunca es eso: es un PIN que no coincide.
 */
const _TITULO_ERROR_PIN = 'Revisa lo que escribiste:';

/**
 * Activa o cambia el PIN. Un solo handler para los dos formularios: cambiar es
 * crear con un paso previo de verificación, y el campo `pinActual` es lo único
 * que los distingue.
 * @param {SubmitEvent} e
 */
async function _crearCandado(e) {
  e.preventDefault();
  const form  = /** @type {HTMLFormElement} */ (e.target);
  const datos = Object.fromEntries(new FormData(form));
  const pin   = String(datos.pin ?? '');
  const pin2  = String(datos.pin2 ?? '');

  // Cambio de PIN: sin el actual correcto no se sigue.
  const cambio = 'pinActual' in datos;
  if (cambio) {
    const ok = await verificarPin(String(datos.pinActual ?? ''), S.config?.bloqueo);
    if (!ok) {
      mostrarErroresForm(form, ['El PIN actual no coincide.'], _TITULO_ERROR_PIN);
      return;
    }
  }

  const error = validarPin(pin);
  if (error) {
    mostrarErroresForm(form, [error], _TITULO_ERROR_PIN);
    return;
  }
  if (pin !== pin2) {
    mostrarErroresForm(form, ['Los dos PIN no coinciden.'], _TITULO_ERROR_PIN);
    return;
  }

  if (!S.config || typeof S.config !== 'object') S.config = {};
  S.config.bloqueo = await crearBloqueo(pin);
  save();
  limpiarFallos();
  // El panel se repinta (la tarjeta cambia de forma) y con eso el chip de
  // guardado se iría con el DOM viejo: la confirmación va por toast.
  renderSmart(_inyectarPanel, 'config');
  mostrarToast({
    titulo:  cambio ? 'PIN actualizado' : 'Candado activado',
    detalle: 'Finko va a pedir tu PIN al abrir.',
  });
}

/**
 * Quita el candado. Pide el PIN actual: sin eso, cualquiera que llegue al panel
 * con la app ya abierta lo desactiva.
 * @param {SubmitEvent} e
 */
async function _quitarCandado(e) {
  e.preventDefault();
  const form  = /** @type {HTMLFormElement} */ (e.target);
  const datos = Object.fromEntries(new FormData(form));

  const ok = await verificarPin(String(datos.pinActual ?? ''), S.config?.bloqueo);
  if (!ok) {
    mostrarErroresForm(form, ['El PIN actual no coincide.'], _TITULO_ERROR_PIN);
    return;
  }

  S.config.bloqueo = null;
  save();
  limpiarFallos();
  renderSmart(_inyectarPanel, 'config');
  mostrarToast({
    titulo:  'Candado quitado',
    detalle: 'Finko ya no va a pedir PIN al abrir.',
  });
}

export function initConfig() {
  registrarAccion('exportar-datos',         _exportarDatos);
  registrarAccion('importar-datos',         _abrirImportadorDatos);
  registrarAccion('exportar-gastos-csv',    _exportarGastosCSV);
  registrarAccion('resetear-app',           _resetearApp);
  registrarAccion('proteger-datos',         _protegerDatos);
  registrarAccion('activar-notificaciones', _activarNotificaciones);
  registrarAccion('toggle-notificaciones',  _toggleNotificaciones);
  registrarAccion('toggle-atajos',          _toggleAtajos);
  registrarAccion('toggle-aviso-seccion',   _toggleAvisoSeccion);
  registrarAccion('toggle-respaldo-cifrado', _toggleRespaldoCifrado);
  registrarAccion('abrir-legal', (el) => _mostrarDocumentoLegal(el.dataset.doc));
  registrarAccion('abrir-perfil-fiscal', _abrirPerfilFiscal);
  _wireLegalLinks();

  // El panel se inyecta la primera vez que la sección está activa.
  renderSmart(_inyectarPanel, 'config');

  window.addEventListener('hashchange', () => {
    renderSmart(_inyectarPanel, 'config');
  });

  // Cuando la app se instala como PWA, re-renderizar config para
  // cambiar el botón "Instalar" por el mensaje "Ya instalada".
  window.addEventListener('appinstalled', () => {
    renderSmart(_inyectarPanel, 'config');
  });

  // Monitor de almacenamiento (ADR 030). Un guardado que falla (cupo lleno) o
  // el espacio local acercándose al tope avisan al usuario para que exporte un
  // respaldo. `storage:error` es urgente (assertive) y se anuncia siempre; el
  // aviso persistente lo pinta el propio panel de Config al re-renderizar.
  EventBus.on('storage:error', () => {
    announce('No se pudo guardar: el almacenamiento del dispositivo está lleno. Exporta un respaldo desde Ajustes.', 'assertive');
    renderSmart(_inyectarPanel, 'config');
  });
  EventBus.on('storage:cuota', ({ nivel }) => {
    if (nivel === 'critico') {
      announce('Tu almacenamiento local está casi lleno. Exporta un respaldo desde Ajustes.', 'assertive');
    }
    renderSmart(_inyectarPanel, 'config');
  });

  // Resyncar el toggle de tema cuando el usuario lo cambia (desde aqui,
  // desde el sidebar o desde el modal Mas). El handler global `theme-toggle`
  // ya hace el trabajo de aplicar el tema; aqui solo refrescamos el checkbox
  // y el texto del label dentro del panel de config.
  // setTimeout(0): el browser revierte `checked` asíncronamente después de
  // e.preventDefault() en el click del checkbox; hay que esperar ese tick.
  EventBus.on('theme:change', ({ light }) => {
    setTimeout(() => {
      const toggle = document.getElementById('toggle-tema');
      if (!toggle) return;
      toggle.checked = light;
      // TX.11: el input vive dentro de un `.toggle` anidado (atoms.css), un
      // nivel más profundo que antes; `closest('.config-toggle')` sube hasta
      // la etiqueta contenedora sin importar cuántos envoltorios haya.
      const labelEl = toggle.closest('.config-toggle')?.querySelector('.config-toggle__label');
      if (labelEl) {
        // B13: el mismo glifo del sprite que pinta `_renderTema()`. Antes se
        // reescribía con emoji, que era la única iconografía de la app que no
        // hereda currentColor ni responde al tema.
        labelEl.innerHTML = light
          ? `${icon('sun')} Tema claro activo`
          : `${icon('moon')} Tema oscuro activo`;
      }
    }, 0);
  });
}
