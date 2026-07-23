/**
 * agenda/index.js - API pública del dominio Agenda.
 *
 * Responsabilidades:
 * - Registrar acciones data-action (navegación mes anterior/siguiente, alta de gasto fijo).
 * - Re-renderizar cuando cambia S.compromisos o el usuario llega al hash.
 * - Coordinar logic.js + view.js sin generar HTML ni hacer cálculos aquí.
 *
 * Alta de gasto fijo:
 * - La sección Agenda es el único punto de entrada para crear `tipo='fijo'`.
 * - Reusa `validarCompromiso` y `normalizarCompromiso` del dominio Compromisos.
 *
 * Acciones sobre gastos fijos existentes:
 * - Editar: abre modal-gasto-fijo pre-rellenado con los datos del compromiso.
 * - Eliminar: confirmación + elimina de S.compromisos.
 * - Marcar pagado este mes: usa resolverPagoConSelector. Con varias cuentas
 *   muestra el selector de tarjetas para elegir la cuenta preferida y solo abre
 *   el reparto si no alcanza (reparto-fallback, sin dejar negativos); con una
 *   sola cuenta no pregunta. Registra un gasto por cada cuenta usada, vinculado
 *   al compromiso vía compromisoId, para que el badge "Ya pagaste este mes"
 *   aparezca automáticamente en el calendario.
 */

import { S, EventBus } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { renderSmart, updSaldo } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { hoy, f } from '../../infra/utils.js';
import { confirmar } from '../../ui/confirm.js';
import { resolverPagoConSelector } from '../../infra/cuenta-helper.js';
import { asignarSplitsPorItem } from '../../infra/distribuir-pago.js';
import { ocurrenciasEnMes } from '../../infra/vencimientos.js';
import { validarCompromiso, normalizarCompromiso } from '../compromisos/logic.js';
import { renderBannerProposito } from '../../ui/proposito.js';
import { CATEGORIAS_AGENDA } from '../../core/constants.js';
import { wireIconoPicker, setIconoPickerValor } from '../../infra/icon-picker.js';
import { iconoCategoria } from '../../infra/icons.js';
import { eventosDelMes, pendientesDePagoDelMes } from './logic.js';
import { renderAgenda, renderFormGastoFijo, renderFormPagoLote, textoBannerGastoFijo, navegarMes, mostrarDia, marcarEntradaSeccion } from './view.js';

// ── HANDLERS DE NAVEGACIÓN ───────────────────────────────────────

function _prevMes() {
  navegarMes(-1);
  renderAgenda();
}

function _nextMes() {
  navegarMes(+1);
  renderAgenda();
}

function _mostrarDia(el) {
  const dia = parseInt(el?.dataset?.day, 10);
  if (!Number.isInteger(dia)) return;
  mostrarDia(dia);
  renderAgenda();
}

// ── HANDLERS DEL MODAL "GASTO FIJO" (nuevo + edición) ────────────

function _nuevoGastoFijo() {
  const overlay = document.getElementById('modal-gasto-fijo');
  if (!overlay) return;

  // Resetear modo edición y título.
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Nuevo gasto fijo';

  // Re-inyectamos el form en cada apertura para restablecer defaults.
  _inyectarFormGastoFijo();
  abrirModal(overlay);
}

/**
 * Abre el modal de gasto fijo en modo edición con los datos del compromiso pre-rellenados.
 * @param {HTMLElement} el - botón con data-id del compromiso.
 */
function _editarGastoFijo(el) {
  const id = el.dataset.id;
  if (!id) return;

  const comp = S.compromisos.find(c => c.id === id);
  if (!comp) return;

  const overlay = document.getElementById('modal-gasto-fijo');
  if (!overlay) return;

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Editar gasto fijo';

  _inyectarFormGastoFijo(comp);
  abrirModal(overlay);
}

/**
 * (Re)Inyecta el form de gasto fijo en el modal.
 * Si se pasa `compromiso`, pre-rellena los campos y activa el modo edición
 * guardando el id en `form.dataset.id`.
 * @param {object|null} [compromiso]
 */
function _inyectarFormGastoFijo(compromiso = null) {
  const body = document.getElementById('modal-gasto-fijo-body');
  if (!body) return;

  body.innerHTML = renderFormGastoFijo();

  const form = body.querySelector('#form-gasto-fijo');
  if (!form) return;

  // Modo edición: pre-rellenar campos y guardar id.
  if (compromiso) {
    form.dataset.id = compromiso.id;
    const f_desc = form.querySelector('[name="descripcion"]');
    const f_monto = form.querySelector('[name="monto"]');
    const f_frec = form.querySelector('[name="frecuencia"]');
    const f_dia = form.querySelector('[name="diaPago"]');
    const f_btn = form.querySelector('[type="submit"]');
    const categoria = compromiso.categoria ?? '';
    const nombreAuto = categoria && CATEGORIAS_AGENDA.includes(categoria) && categoria !== 'Otro';
    // FORM.1c: la categoría es un chip de radio, no un select; se marca el
    // que corresponda (si `categoria` no está en el catálogo, ninguno queda
    // marcado, igual que antes con un <select> sin esa opción).
    const f_cat = form.querySelector(`[name="categoria"][value="${CSS.escape(categoria)}"]`);
    if (f_cat) f_cat.checked = true;
    // AG.4: con categoría de nombre automático, el campo de texto muestra la
    // nota (no la descripción, que ya es la categoría); si no, la descripción.
    if (f_desc) f_desc.value = nombreAuto ? (compromiso.nota ?? '') : (compromiso.descripcion ?? '');
    if (f_monto) f_monto.value = compromiso.monto ?? '';
    if (f_frec) f_frec.value = compromiso.frecuencia ?? 'Mensual';
    if (f_dia) f_dia.value = compromiso.diaPago ?? '';
    if (f_btn) f_btn.textContent = 'Actualizar gasto fijo';

    // CAT.2f: prellenar el ícono elegido si la categoría es "Otro" y ya
    // tiene uno guardado (el form nace limpio en cada render, no hace falta
    // resetear antes).
    if (categoria === 'Otro' && compromiso.icono) {
      setIconoPickerValor(
        form.querySelector('[data-icono-picker="gfijo-icono"]'),
        compromiso.icono,
        iconoCategoria(compromiso.icono),
      );
    }
  }

  _syncCategoriaGastoFijo(form);
  _actualizarBannerGastoFijo(form);
  // FORM.1c: la categoría son chips-radio; un listener delegado de `change`
  // en el form cubre cualquiera de ellos (mismo patrón de Gastos/Deuda,
  // ADR 042). El banner se recalcula con cualquier `input` del form (tipeo
  // del día, cambio de frecuencia): más barato que filtrar por campo.
  form.addEventListener('change', (e) => {
    if (e.target.name === 'categoria') _syncCategoriaGastoFijo(form);
  });
  form.addEventListener('input', () => _actualizarBannerGastoFijo(form));
  wireIconoPicker(form.querySelector('[data-icono-picker="gfijo-icono"]'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarGastoFijo();
  });
}

/**
 * FORM.1c (ADR 042 D5): recalcula el banner "Aparecerá cada X en tu
 * calendario el día N" leyendo la frecuencia y el día actuales del form.
 * @param {HTMLFormElement} form
 */
function _actualizarBannerGastoFijo(form) {
  const banner = form.querySelector('#gfijo-banner');
  if (!banner) return;
  const frecuencia = form.querySelector('[name="frecuencia"]')?.value ?? 'Mensual';
  const diaPago = form.querySelector('[name="diaPago"]')?.value ?? '';
  banner.textContent = textoBannerGastoFijo(frecuencia, diaPago);
}

/**
 * AG.4: alterna el rol del campo de texto según la categoría elegida.
 * Con una categoría predefinida (no "Otro"), el nombre lo da la categoría:
 * el campo pasa a ser una nota opcional. Sin categoría, o con "Otro", el
 * campo vuelve a ser el nombre obligatorio del registro.
 * @param {HTMLFormElement} form
 */
function _syncCategoriaGastoFijo(form) {
  const nombre   = form.querySelector('[name="descripcion"]');
  const etiqueta = form.querySelector('#gfijo-descripcion-label');
  if (!nombre || !etiqueta) return;

  // FORM.1c: la categoría son chips-radio; ninguno marcado equivale al
  // `<select>` vacío de antes.
  const categoria   = form.querySelector('[name="categoria"]:checked')?.value ?? '';
  const nombreAuto  = categoria && CATEGORIAS_AGENDA.includes(categoria) && categoria !== 'Otro';

  if (nombreAuto) {
    etiqueta.textContent = 'Nota (opcional)';
    nombre.placeholder   = 'Ej. Éxito, unidad 302, Netflix premium…';
    nombre.required      = false;
    nombre.removeAttribute('aria-required');
  } else {
    etiqueta.textContent = 'Descripción';
    nombre.placeholder   = 'Ej. Arriendo, Netflix, agua';
    nombre.required      = true;
    nombre.setAttribute('aria-required', 'true');
  }

  // CAT.2f: el picker de ícono solo tiene sentido con la categoría "Otro".
  const grupoIcono = form.querySelector('#form-group-gfijo-icono');
  if (grupoIcono) grupoIcono.hidden = categoria !== 'Otro';
}

function _guardarGastoFijo() {
  const form = document.getElementById('form-gasto-fijo');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarCompromiso(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const idEdit = form.dataset.id || null;

  if (idEdit) {
    editar('compromisos', idEdit, normalizarCompromiso(datos));
  } else {
    guardar('compromisos', normalizarCompromiso(datos));
  }

  const overlay = document.getElementById('modal-gasto-fijo');
  if (overlay) cerrarModal(overlay);

  renderAgenda();
  announce(idEdit ? 'Gasto fijo actualizado.' : 'Gasto fijo guardado correctamente.');
}

// ── HANDLER: ELIMINAR GASTO FIJO ────────────────────────────────

/**
 * @param {HTMLElement} el - botón con data-id del compromiso a eliminar.
 */
async function _eliminarGastoFijo(el) {
  const id = el.dataset.id;
  if (!id) return;

  const comp = S.compromisos.find(c => c.id === id);
  if (!comp) return;

  const ok = await confirmar({
    titulo:         'Eliminar gasto fijo',
    mensaje:        `¿Quieres eliminar "${comp.descripcion}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('compromisos', id);
  renderAgenda();
  announce(`Gasto fijo "${comp.descripcion}" eliminado.`);
}

// ── HANDLER: MARCAR PAGADO ESTE MES ─────────────────────────────

/**
 * Registra el pago de un gasto fijo en el mes que el usuario está viendo en el
 * calendario (BUG-015), que no siempre es el actual: el botón trae ese mes en
 * `data-mes` y `_fechaPagoDelMes` decide la fecha del gasto.
 *
 * Usa resolverPagoConSelector: con varias cuentas pide elegir la cuenta
 * preferida (selector de tarjetas) y solo reparte si esa cuenta no alcanza,
 * sin dejar ninguna en negativo. Con una sola cuenta no pregunta.
 *
 * **El descuento de la cuenta siempre ocurre ahora, aunque el gasto quede
 * fechado en un mes pasado, y es lo correcto**: el saldo de una cuenta es un
 * valor "de hoy". Si el usuario pagó el arriendo en marzo y no lo registró, el
 * saldo que Finko muestra está inflado; registrarlo ahora lo pone al día con la
 * realidad del banco. No "corregir" esto descontando en la fecha del gasto: los
 * saldos no son históricos.
 *
 * @param {HTMLElement} el - botón con data-id del compromiso y data-mes del mes visible.
 */
async function _marcarPagadoGastoFijo(el) {
  const id = el.dataset.id;
  if (!id) return;

  const comp = S.compromisos.find(c => c.id === id);
  if (!comp || comp.tipo !== 'fijo') return;

  // BUG-015: el pago pertenece al mes VISIBLE del calendario (el botón lo trae
  // en `data-mes`), no al mes actual. Antes se validaba y se fechaba siempre
  // contra hoy: marcar un mes pasado creaba un gasto de ESTE mes, el badge del
  // mes visible no viraba y el botón seguía invitando a re-clickear.
  const prefijo = el.dataset.mes || _prefijoMesActual();

  const fechaPago = _fechaPagoDelMes(comp, prefijo);
  if (!fechaPago) return; // mes futuro o prefijo inválido: no hay nada que pagar

  // Verificar que no esté pagado ya ese mes (defensa ante doble clic).
  const yaPagado = Array.isArray(S.gastos) &&
    S.gastos.some(g => g.compromisoId === id && g.fecha?.startsWith(prefijo));
  if (yaPagado) {
    announce('Este gasto ya está marcado como pagado este mes.');
    return;
  }

  const monto = Number(comp.monto) || 0;

  // Elegir la cuenta preferida (si hay varias) y resolver el reparto-fallback.
  const splits = await resolverPagoConSelector(
    S.cuentas,
    monto,
    `registrar el pago de "${comp.descripcion}"`,
  );
  if (splits === null) return; // canceló o fue redirigido a Mis Cuentas

  // Una sola cuenta: puede quedar en negativo (no hay con qué repartir).
  // Confirmamos el sobregiro, igual que el flujo de cuenta única anterior.
  if (splits.length === 1) {
    const c = S.cuentas.find(x => x.id === splits[0].cuentaId);
    const saldoCuenta = c?.saldo ?? 0;
    if (saldoCuenta < splits[0].monto) {
      const ok = await confirmar({
        titulo:         'Registrar pago',
        mensaje:        `¿Registrar pago de ${f(monto)} de "${comp.descripcion}" desde ${c?.nombre ?? 'la cuenta'}? El saldo disponible es ${f(saldoCuenta)}: quedará en negativo.`,
        confirmarTexto: 'Registrar pago',
        peligroso:      true,
      });
      if (!ok) return;
    }
  }

  _registrarPagosFijos([{ comp, fecha: fechaPago, partes: splits }]);

  renderAgenda();
  updSaldo();
  announce(`Pago de ${f(monto)} registrado para "${comp.descripcion}".`);
}

/**
 * Escribe uno o varios pagos de gastos fijos: un gasto vinculado por cada
 * cuenta usada + el descuento del saldo de esas cuentas.
 *
 * Única copia de esta aritmética dentro de Agenda: la comparten el pago
 * individual ("Marcar pagado") y el pago en lote (CAL.5a). Deliberadamente NO
 * se extrajo todavía a `infra/`: las otras dos copias del proyecto
 * (`compromisos/_guardarAbono` y el apply de `tesoreria/acciones/distribucion.js`)
 * también mueven el `saldoTotal` de una deuda, así que unificarlas es un
 * refactor cross-dominio con su propia tarjeta (**ARQ.2** punto 2). Lo que
 * esta función sí garantiza es que el lote no agregue una cuarta copia.
 *
 * El descuento se acumula por cuenta y se aplica **una sola vez** al final: en
 * un lote la misma cuenta paga varios items, y hacer un `editar` por item
 * leería el saldo ya mutado en cada vuelta (funciona, pero emite N eventos
 * `state:change` por cuenta y re-renderiza toda la app en cada uno).
 *
 * @param {Array<{
 *   comp: import('../../core/state.js').Compromiso,
 *   fecha: string,
 *   partes: Array<{cuentaId:string, monto:number}>,
 * }>} pagos
 */
function _registrarPagosFijos(pagos) {
  /** @type {Map<string, number>} Total a descontar por cuenta. */
  const porCuenta = new Map();

  for (const { comp, fecha, partes } of pagos) {
    const repartido = partes.length > 1;
    for (const p of partes) {
      guardar('gastos', {
        descripcion:  `Pago: ${comp.descripcion}`,
        monto:        p.monto,
        categoria:    'Gastos fijos',
        fecha,
        cuentaId:     p.cuentaId || null,
        nota:         repartido ? 'Pago repartido entre varias cuentas' : '',
        compromisoId: comp.id,
      });
      if (p.cuentaId) {
        porCuenta.set(p.cuentaId, (porCuenta.get(p.cuentaId) ?? 0) + p.monto);
      }
    }
  }

  for (const [cuentaId, total] of porCuenta) {
    const cuenta = S.cuentas.find(x => x.id === cuentaId);
    if (cuenta) editar('cuentas', cuentaId, { saldo: (cuenta.saldo ?? 0) - total });
  }
}

// ── HANDLERS: PAGO EN LOTE (CAL.5a) ─────────────────────────────

/**
 * Gastos fijos vencidos y sin pagar del mes `prefijoMes`, leídos de S.
 * Se recalcula en cada paso del flujo (abrir el modal, confirmar) en vez de
 * confiar en lo que el DOM traía: entre una cosa y otra el usuario pudo pagar
 * uno desde el detalle del día, o eliminar el compromiso.
 *
 * @param {string} prefijoMes 'YYYY-MM'
 * @returns {Array<{id:string, descripcion:string, monto:number, dia:number}>}
 */
function _pendientesDelMes(prefijoMes) {
  const m = /^(\d{4})-(\d{2})$/.exec(prefijoMes ?? '');
  if (!m) return [];
  const eventos = eventosDelMes(S.compromisos ?? [], +m[1], +m[2] - 1);
  return pendientesDePagoDelMes(eventos, S.gastos ?? [], prefijoMes, hoy());
}

/**
 * Abre el modal del lote con todos los pendientes marcados.
 * @param {HTMLElement} el - CTA con data-mes del mes visible.
 */
function _pagarLote(el) {
  const prefijo    = el?.dataset?.mes || _prefijoMesActual();
  const pendientes = _pendientesDelMes(prefijo);

  if (pendientes.length === 0) {
    // El estado cambió desde otra pestaña/sección: repintar y no abrir nada.
    announce('No quedan pagos vencidos sin registrar.');
    renderAgenda();
    return;
  }

  const overlay = document.getElementById('modal-pago-lote');
  const body    = document.getElementById('modal-pago-lote-body');
  if (!overlay || !body) return;

  body.innerHTML   = renderFormPagoLote(pendientes);
  body.dataset.mes = prefijo;
  _actualizarTotalLote();
  abrirModal(overlay);
}

/**
 * Recalcula el total y el texto del botón según lo que quede marcado.
 * Solo toca los nodos del resumen: repintar el cuerpo entero desmarcaría las
 * casillas del usuario (mismo motivo por el que MOV.2 usa un slot dedicado
 * para su botón de limpiar filtros).
 */
function _actualizarTotalLote() {
  const body = document.getElementById('modal-pago-lote-body');
  if (!body) return;

  const marcados = [...body.querySelectorAll('.lote-row__check:checked')];
  const total    = marcados.reduce((acc, ch) => acc + (Number(ch.dataset.loteMonto) || 0), 0);

  const totalEl = body.querySelector('[data-role="lote-total"]');
  if (totalEl) {
    totalEl.textContent = marcados.length === 0
      ? 'Selecciona al menos un pago.'
      : `Total a registrar: ${f(total)}`;
    totalEl.classList.toggle('lote-total--vacio', marcados.length === 0);
  }

  const textoEl = body.querySelector('[data-role="lote-cta-texto"]');
  if (textoEl) {
    textoEl.textContent = marcados.length === 1
      ? 'Registrar 1 pago'
      : `Registrar ${marcados.length} pagos`;
  }

  const btn = body.querySelector('[data-action="agenda-confirmar-lote"]');
  if (btn) btn.disabled = marcados.length === 0;
}

/**
 * Registra en un solo movimiento los pagos marcados en el modal.
 *
 * Resuelve la cuenta **una sola vez para el grupo** (ese es el punto de la
 * tarjeta: hoy son ~5 toques por gasto) usando el mismo
 * `resolverPagoConSelector` del pago individual, y después reparte esos splits
 * entre los items con `asignarSplitsPorItem`: cada compromiso conserva su
 * propio gasto vinculado, que es lo que hace funcionar el badge "Ya pagaste
 * este mes" y el progreso del hero. Un item puede quedar a caballo entre dos
 * cuentas; entonces genera dos gastos, igual que un pago individual repartido.
 *
 * La fecha de cada pago sigue la regla de BUG-015 (`_fechaPagoDelMes`): mes en
 * curso → hoy; mes pasado → la ocurrencia de ese mes. El descuento de las
 * cuentas ocurre ahora en ambos casos (ver la nota de `_marcarPagadoGastoFijo`).
 *
 * El modal se cierra ANTES de pedir la cuenta: el selector es otro overlay con
 * su propio `trapFocus`, y apilarlos dejaría el foco atrapado en el de abajo al
 * cerrarse el de arriba. Si el usuario cancela ahí, vuelve al calendario con la
 * tarjeta del lote intacta (un toque para reintentar).
 */
async function _confirmarLote() {
  const body = document.getElementById('modal-pago-lote-body');
  if (!body) return;

  const prefijo = body.dataset.mes || _prefijoMesActual();
  const ids = [...body.querySelectorAll('.lote-row__check:checked')]
    .map(ch => ch.dataset.loteId)
    .filter(Boolean);
  if (ids.length === 0) return;

  const overlay = document.getElementById('modal-pago-lote');
  if (overlay) cerrarModal(overlay);

  // La fuente de verdad es S, no el DOM que se pintó al abrir el modal.
  const pendientes = _pendientesDelMes(prefijo).filter(p => ids.includes(p.id));
  if (pendientes.length === 0) {
    announce('No quedan pagos vencidos sin registrar.');
    renderAgenda();
    return;
  }

  const total = pendientes.reduce((acc, p) => acc + p.monto, 0);
  const splits = await resolverPagoConSelector(
    S.cuentas,
    total,
    `registrar ${pendientes.length} pagos vencidos`,
  );
  if (splits === null) return; // canceló o fue redirigido a Mis Cuentas

  // Una sola cuenta: puede quedar en negativo (no hay con qué repartir).
  // Mismo criterio y mismo texto que el pago individual.
  if (splits.length === 1) {
    const c = S.cuentas.find(x => x.id === splits[0].cuentaId);
    const saldoCuenta = c?.saldo ?? 0;
    if (saldoCuenta < splits[0].monto) {
      const ok = await confirmar({
        titulo:         'Registrar pagos',
        mensaje:        `¿Registrar ${pendientes.length} pagos por ${f(total)} desde ${c?.nombre ?? 'la cuenta'}? El saldo disponible es ${f(saldoCuenta)}: quedará en negativo.`,
        confirmarTexto: 'Registrar pagos',
        peligroso:      true,
      });
      if (!ok) return;
    }
  }

  const pagos = [];
  for (const asignado of asignarSplitsPorItem(pendientes, splits)) {
    if (asignado.partes.length === 0) continue;
    const comp = S.compromisos.find(c => c.id === asignado.id);
    if (!comp) continue;
    const fecha = _fechaPagoDelMes(comp, prefijo);
    if (!fecha) continue; // mes futuro: defensa en profundidad (BUG-015)
    pagos.push({ comp, fecha, partes: asignado.partes });
  }
  if (pagos.length === 0) return;

  _registrarPagosFijos(pagos);

  renderAgenda();
  updSaldo();
  announce(pagos.length === 1
    ? `1 pago registrado por ${f(total)}.`
    : `${pagos.length} pagos registrados por ${f(total)}.`);
}

// ── HANDLER: DISTRIBUIR DESDE EL DÍA DE INGRESO (ADR 021) ───────

/**
 * CTA del evento de día de ingreso: delega en tesorería vía EventBus
 * (`distribuir:abrir`), que navega a Mis cuentas y abre el asistente
 * "Distribuir mi ingreso". Agenda no conoce el panel ni el motor de reparto.
 */
function _distribuirDesdeAgenda() {
  EventBus.emit('distribuir:abrir');
}

// ── HELPERS ──────────────────────────────────────────────────────

/** Devuelve el prefijo YYYY-MM del mes actual para comparar fechas. */
function _prefijoMesActual() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

/**
 * Fecha con la que se registra el pago de un gasto fijo del mes `prefijoMes`
 * ('YYYY-MM'), que es el mes VISIBLE en el calendario, no necesariamente el
 * actual (BUG-015).
 *
 * - Mes en curso: se fecha con hoy (el pago acaba de ocurrir).
 * - Mes pasado: se fecha con el vencimiento del compromiso en ESE mes (la
 *   última ocurrencia si el fijo cae varias veces); el pago ocurrió entonces,
 *   no hoy. Sin ocurrencia resoluble cae al último día del mes.
 * - Mes futuro: `null`. No se paga lo que aún no vence (Finko registra lo que
 *   pasó, mismo criterio que MC.13c-2); la vista ya oculta el botón y esto es
 *   la defensa en profundidad.
 *
 * @param {import('../../core/state.js').Compromiso} comp
 * @param {string} prefijoMes 'YYYY-MM'
 * @returns {string|null} 'YYYY-MM-DD' o null si el mes es futuro/inválido.
 */
function _fechaPagoDelMes(comp, prefijoMes) {
  const m = /^(\d{4})-(\d{2})$/.exec(prefijoMes ?? '');
  if (!m) return null;

  const anio = Number(m[1]);
  const mes  = Number(m[2]) - 1; // 0-indexed
  if (mes < 0 || mes > 11) return null;

  const d       = new Date();
  const anioHoy = d.getFullYear();
  const mesHoy  = d.getMonth();

  if (anio === anioHoy && mes === mesHoy) return hoy();
  if (anio > anioHoy || (anio === anioHoy && mes > mesHoy)) return null;

  const dias = ocurrenciasEnMes(comp, anio, mes);
  const dia  = dias.length > 0
    ? dias[dias.length - 1]
    : new Date(anio, mes + 1, 0).getDate();
  return `${prefijoMes}-${String(dia).padStart(2, '0')}`;
}

// ── INIT ─────────────────────────────────────────────────────────

export function initAgenda() {
  registrarAccion('agenda-prev-mes',          _prevMes);
  registrarAccion('agenda-next-mes',          _nextMes);
  registrarAccion('agenda-mostrar-dia',       _mostrarDia);
  registrarAccion('nuevo-gasto-fijo',         _nuevoGastoFijo);
  registrarAccion('agenda-editar-fijo',       _editarGastoFijo);
  registrarAccion('agenda-eliminar-fijo',     _eliminarGastoFijo);
  registrarAccion('agenda-marcar-pagado-fijo', _marcarPagadoGastoFijo);
  registrarAccion('agenda-distribuir-ingreso', _distribuirDesdeAgenda);
  registrarAccion('agenda-pagar-lote',        _pagarLote);
  registrarAccion('agenda-confirmar-lote',    _confirmarLote);

  // CAL.5a: el cuerpo del modal se re-inyecta en cada apertura, pero el
  // contenedor persiste; por eso el listener del total cuelga de él una sola
  // vez aquí (colgarlo dentro de `_pagarLote` acumularía uno por apertura).
  document.getElementById('modal-pago-lote-body')
    ?.addEventListener('change', (e) => {
      if (e.target.classList?.contains('lote-row__check')) _actualizarTotalLote();
    });

  // CAL.4a (ADR 037 D7): el ojo del hero del mes comparte el flag
  // S.config.ocultarSaldo con Inicio (IN.2), Mis cuentas (MC.18a) y Deudas
  // (D.16a): un solo control de privacidad en toda la app. El flip con
  // `!== true` es defensivo, igual que en 'saldo-visibilidad' (ui/actions.js).
  // updSaldo() mantiene el hero de Inicio en sincronía.
  registrarAccion('agenda-saldo-visibilidad', () => {
    S.config.ocultarSaldo = S.config.ocultarSaldo !== true;
    save();
    updSaldo();
    renderSmart(renderAgenda, 'agenda');
  });

  _inyectarFormGastoFijo();

  // ADR 021: el calendario también muestra los días de ingreso, así que un
  // cambio en S.ingresos (alta, edición de diaPago, baja) debe re-renderizar.
  // CAL.4a: el hero (pagado del mes) y los badges de estado de pago leen
  // S.gastos, así que un abono o pago registrado/eliminado desde otra
  // sección también refresca (renderSmart solo pinta si la sección está
  // visible; con el calendario cerrado no cuesta nada).
  EventBus.on('state:change', ({ section }) => {
    if (section === 'compromisos' || section === 'ingresos' || section === 'gastos') {
      renderBannerProposito('agenda', S.compromisos.length > 0);
      renderSmart(renderAgenda, 'agenda');
    }
  });

  // Re-render al navegar a #agenda. CAL.3: llegar desde OTRA sección arma
  // el auto-select de "hoy" (marcarEntradaSeccion); un state:change con la
  // sección ya abierta (arriba) no lo arma, para no pisar la selección del
  // usuario. La carga inicial de la app directo en #agenda (recarga,
  // deep-link) queda fuera a propósito: no es el caso de uso real que pidió
  // la tarjeta (navegar hacia la sección desde otra), y evita el efecto
  // extraño de auto-abrir el detalle en el primer pintado de la página.
  window.addEventListener('hashchange', () => {
    if ((location.hash.slice(1) || 'dash') === 'agenda') {
      marcarEntradaSeccion();
      renderBannerProposito('agenda', S.compromisos.length > 0);
      renderSmart(renderAgenda, 'agenda');
    }
  });

  renderBannerProposito('agenda', S.compromisos.length > 0);
  renderSmart(renderAgenda, 'agenda');
}
