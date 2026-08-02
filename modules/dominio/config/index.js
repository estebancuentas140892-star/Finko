/**
 * config/index.js - API pública del panel de configuración.
 *
 * Responsabilidades:
 * - Renderizar el panel en #panel-config.
 * - Gestionar: edición de perfil, exportar datos, importar datos, reset.
 * - No usa EventBus (las mutaciones se manejan directamente aquí).
 */

import { S, EventBus } from '../../core/state.js';
import { save, STORAGE_KEY } from '../../core/storage.js';
import { registrarAccion } from '../../ui/actions.js';
import { renderSmart } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { hoy, esc } from '../../infra/utils.js';
import { icon } from '../../infra/icons.js';
import { mdToHtml } from '../../infra/markdown.js';
import { SITUACIONES_LABORALES } from '../../core/constants.js';
import { confirmar } from '../../ui/confirm.js';
import { pedirPermiso } from '../../infra/notificaciones.js';
import { abrirModal } from '../../ui/modales.js';
import { renderPanelConfig, miles, desdeMiles } from './view.js';
import { gastosACSV } from '../export/logic.js';
import { documentoLegalPorId, cargarDocumentoLegal, VERSION_LEGAL } from './legal.js';

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

function _exportarDatos() {
  try {
    const json  = JSON.stringify(S, null, 2);
    const blob  = new Blob([json], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const fecha = hoy();
    const a     = document.createElement('a');
    a.href     = url;
    a.download = `finko-backup-${fecha}.json`;
    a.click();
    URL.revokeObjectURL(url);
    announce('Datos exportados correctamente.');
  } catch (err) {
    console.error('[config] exportarDatos falló:', err);
    announce('No se pudo exportar. Intentá de nuevo.', 'assertive');
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

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      JSON.parse(e.target.result); // Valida JSON antes de escribir.
      localStorage.setItem(STORAGE_KEY, e.target.result);
      announce('Datos importados. Recargando…');
      setTimeout(() => location.reload(), 800);
    } catch {
      announce('El archivo no es un JSON válido de Finko.', 'assertive');
      el.value = '';
    }
  };
  reader.readAsText(file);
}

async function _activarNotificaciones() {
  const resultado = await pedirPermiso();
  if (resultado === 'granted') {
    if (!S.config) S.config = {};
    S.config.notificaciones = true;
    save();
    renderPanelConfig();
    announce('Recordatorios activados. Recibirás una alerta al abrir Finko si tienes compromisos próximos.');
  } else if (resultado === 'denied') {
    announce('El navegador bloqueó las notificaciones. Habilitá el permiso desde la configuración del navegador.', 'assertive');
  } else {
    announce('No se pudo activar los recordatorios en este momento.', 'assertive');
  }
}

/** @param {HTMLElement} el - el <input type="checkbox"> */
function _toggleNotificaciones(el) {
  if (!S.config) S.config = {};
  S.config.notificaciones = el.checked;
  save();
  renderPanelConfig();
  announce(el.checked ? 'Recordatorios activados.' : 'Recordatorios desactivados.');
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
    announce('No se pudo exportar. Intentá de nuevo.', 'assertive');
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
  localStorage.clear();
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

  // Guardar perfil fiscal (K.2).
  panel.querySelector('#form-perfil-fiscal')?.addEventListener('submit', (e) => {
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
  panel.querySelector('#form-datos-fiscales')?.addEventListener('submit', (e) => {
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
  for (const campo of panel.querySelectorAll('[data-miles]')) {
    campo.addEventListener('input', () => {
      const formateado = miles(campo.value);
      if (formateado === campo.value) return;
      campo.value = formateado;
      campo.setSelectionRange(formateado.length, formateado.length);
    });
  }

  // Importar: el input file no dispara data-action click - usamos change.
  panel.querySelector('#config-importar-json')
    ?.addEventListener('change', (e) => _importarDatos(e.target));
}

export function initConfig() {
  registrarAccion('exportar-datos',         _exportarDatos);
  registrarAccion('importar-datos',         _abrirImportadorDatos);
  registrarAccion('exportar-gastos-csv',    _exportarGastosCSV);
  registrarAccion('resetear-app',           _resetearApp);
  registrarAccion('activar-notificaciones', _activarNotificaciones);
  registrarAccion('toggle-notificaciones',  _toggleNotificaciones);
  registrarAccion('abrir-legal', (el) => _mostrarDocumentoLegal(el.dataset.doc));
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
