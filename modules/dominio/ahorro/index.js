/**
 * ahorro/index.js - API pública del dominio Ahorro (J.1).
 *
 * Responsabilidades:
 * - Registrar acciones: ahorro-activar-fondo, ahorro-editar, ahorro-desactivar.
 * - Calcular `gastosFijosMensuales` localmente desde S.compromisos para no
 *   importar de otro dominio (regla ADN #10). Replica el `FACTOR_MENSUAL`
 *   de compromisos en una constante local con el mismo comentario explicativo.
 * - Coordinar logic.js + view.js. Persistir con save().
 * - Suscribirse a EventBus para re-render cuando cambia el ahorro o cuando
 *   cambian compromisos (porque el objetivo del fondo depende de los gastos fijos).
 */

import { S, EventBus }              from '../../core/state.js';
import { save }                     from '../../core/storage.js';
import { registrarAccion }          from '../../ui/actions.js';
import { abrirModal, cerrarModal }  from '../../ui/modales.js';
import { renderSmart, registrarRender } from '../../infra/render.js';
import { announce }                 from '../../infra/a11y.js';
import { mostrarErroresForm }       from '../../infra/form-errors.js';
import { confirmar }                from '../../ui/confirm.js';
import { hoy }                      from '../../infra/utils.js';
import { genId }                    from '../../infra/crud.js';
import {
  validarMetaMeses, validarMontoActual,
  normalizarMetaMeses, normalizarMontoActual,
  validarMontoAporte, validarFechaAporte, normalizarMontoAporte,
  validarCompromisoMensual, normalizarCompromisoMensual,
  calcularTasaAhorro,
  calcularObjetivoFondo, calcularProgresoFondo, calcularMontoTotalFondo,
  calcularAporteSugerido,
} from './logic.js';
import {
  renderAhorro, renderFormFondo,
  renderFormAporte, renderFormCompromisoMensual,
  renderCasaAhorro, renderCajaSugerencia,
} from './view.js';
import { renderBannerProposito } from '../../ui/proposito.js';

// ── FACTOR DE FRECUENCIA ─────────────────────────────────────────

/**
 * Cuántas veces ocurre cada frecuencia en un mes calendario promedio.
 * Replicado localmente desde compromisos/logic.js para no crear dependencia
 * cruzada entre dominios (regla ADN #10).
 */
const FACTOR_MENSUAL = {
  'Diario':     30,
  'Semanal':    4.33,
  'Quincenal':  2,
  'Mensual':    1,
  'Bimestral':  0.5,
  'Trimestral': 1 / 3,
  'Semestral':  1 / 6,
  'Anual':      1 / 12,
  'Única vez':  0,
};

/**
 * Suma los gastos fijos mensuales del usuario a partir de S.compromisos.
 *
 * Solo cuenta compromisos activos de tipo `'fijo'` (las deudas no son
 * "gastos fijos" en el sentido del fondo de emergencia: son obligaciones
 * a saldar, no costos recurrentes a cubrir). Aplica `FACTOR_MENSUAL` para
 * proyectar a unidad mensual frecuencias no-mensuales.
 *
 * @returns {number} COP/mes.
 */
function _gastosFijosMensuales() {
  const compromisos = Array.isArray(S.compromisos) ? S.compromisos : [];
  let total = 0;
  for (const c of compromisos) {
    if (!c || c.activo === false) continue;
    if (c.tipo !== 'fijo') continue;
    const factor = FACTOR_MENSUAL[c.frecuencia] ?? 0;
    total += (Number(c.monto) || 0) * factor;
  }
  return total;
}

// ── APORTE SUGERIDO (AH.2) ───────────────────────────────────────

/**
 * Cuotas mínimas mensuales de todas las deudas activas. Réplica del cálculo
 * de `construirContextoDistribucion` (tesorería, ADR 013) para no importar
 * de otro dominio (regla ADN #10).
 * @returns {number} COP/mes
 */
function _cuotasDeudaMensuales() {
  return (Array.isArray(S.compromisos) ? S.compromisos : [])
    .filter(c => c && c.activo !== false
      && (c.tipo === 'deuda-entidad' || c.tipo === 'deuda-personal'))
    .reduce((sum, c) => sum + (Number(c.cuotaMensual) || 0), 0);
}

/**
 * COP/mes que piden las metas y apartados con fecha objetivo: el faltante de
 * cada uno repartido entre los meses que quedan. Réplica compacta de
 * `calcularAporteMensualObjetivos` (tesorería, ADR 013), misma fórmula.
 * @returns {number} COP/mes
 */
function _aporteMensualObjetivos() {
  const tsHoy = Date.now();
  const ritmo = (montoObjetivo, montoActual, fecha) => {
    const faltante = Math.max(0, (Number(montoObjetivo) || 0) - (Number(montoActual) || 0));
    if (faltante <= 0 || !fecha) return 0;
    const msRestantes = new Date(fecha).getTime() - tsHoy;
    if (msRestantes <= 0) return 0;
    const mesesRestantes = Math.max(1, Math.round(msRestantes / (1000 * 60 * 60 * 24 * 30.44)));
    return Math.ceil(faltante / mesesRestantes);
  };

  const deMetas = (Array.isArray(S.metas) ? S.metas : [])
    .filter(m => m && !m.completada && m.fechaLimite)
    .reduce((sum, m) => sum + ritmo(m.montoObjetivo, m.montoActual, m.fechaLimite), 0);
  const deApartados = (Array.isArray(S.apartados) ? S.apartados : [])
    .filter(a => a && !a.completado && a.fechaObjetivo)
    .reduce((sum, a) => sum + ritmo(a.montoObjetivo, a.montoActual, a.fechaObjetivo), 0);
  return deMetas + deApartados;
}

/**
 * Arma el aporte sugerido (AH.2) con los datos reales de S. Devuelve null si
 * no se puede calcular un objetivo del fondo (fondo inactivo o sin gastos
 * fijos registrados): sin objetivo no hay faltante que planear.
 *
 * @param {number|null} [ingresoOverride] Ingreso mensual escrito por el
 *   usuario en el form (cuando no hay ingresos registrados). No se persiste.
 * @returns {ReturnType<typeof calcularAporteSugerido>|null}
 */
function _construirSugerenciaAporte(ingresoOverride = null) {
  const fondo = S.ahorro?.fondoEmergencia;
  if (!fondo?.activo) return null;

  const gastosFijos = _gastosFijosMensuales();
  const objetivo    = calcularObjetivoFondo(gastosFijos, fondo.metaMeses ?? 3);
  if (objetivo <= 0) return null;

  const aportes  = Array.isArray(S.ahorro?.aportes) ? S.ahorro.aportes : [];
  const total    = calcularMontoTotalFondo(fondo.montoActual, aportes);
  const faltante = Math.max(0, objetivo - total);

  return calcularAporteSugerido({
    faltanteFondo:          faltante,
    ingresosMensuales:      ingresoOverride ?? _calcularIngresosMensuales(),
    gastosFijosMensuales:   gastosFijos,
    cuotasDeudaMensuales:   _cuotasDeudaMensuales(),
    aporteMensualObjetivos: _aporteMensualObjetivos(),
  });
}

// ── CÁLCULO TASA DE AHORRO (J.1b) ────────────────────────────────

/**
 * Suma los ingresos recurrentes activos proyectados a unidad mensual.
 * Replica FACTOR_MENSUAL localmente (igual que _gastosFijosMensuales):
 * ahorro no puede importar lógica de otro dominio (regla ADN #10).
 *
 * @returns {number} COP/mes
 */
function _calcularIngresosMensuales() {
  const ingresos = Array.isArray(S.ingresos) ? S.ingresos : [];
  let total = 0;
  for (const ing of ingresos) {
    if (!ing || ing.activo === false) continue;
    const factor = FACTOR_MENSUAL[ing.frecuencia] ?? 0;
    total += (Number(ing.monto) || 0) * factor;
  }
  return total;
}

/**
 * Suma los gastos registrados en el mes calendario actual.
 * @returns {number} COP
 */
function _calcularGastosEsteMes() {
  const ahora = new Date();
  const mesStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  const gastos = Array.isArray(S.gastos) ? S.gastos : [];
  return gastos
    .filter(g => g && typeof g.fecha === 'string' && g.fecha.startsWith(mesStr))
    .reduce((sum, g) => sum + (Number(g.monto) || 0), 0);
}

/**
 * Tasa de ahorro mensual: (ingresos - gastos) / ingresos.
 * Devuelve null si no hay ingresos activos registrados.
 *
 * @returns {number|null}
 */
function _calcularTasaAhorro() {
  const ingresos = _calcularIngresosMensuales();
  const gastos   = _calcularGastosEsteMes();
  return calcularTasaAhorro(ingresos, gastos);
}

// ── COMPLETADO FLAG (J.1c) ────────────────────────────────────────

/**
 * Recalcula y persiste el flag `completado` en S.ahorro.fondoEmergencia.
 * Llamar ANTES de save() en cualquier mutacion que afecte el progreso del fondo.
 * El flag es leido por el logro `fondo-emergencia` y por el Score de Salud.
 */
function _actualizarCompletado() {
  const fondo = S.ahorro?.fondoEmergencia;
  if (!fondo) return;
  if (!fondo.activo) {
    fondo.completado = false;
    return;
  }
  const aportes    = Array.isArray(S.ahorro?.aportes) ? S.ahorro.aportes : [];
  const montoTotal = calcularMontoTotalFondo(fondo.montoActual, aportes);
  const objetivo   = calcularObjetivoFondo(_gastosFijosMensuales(), fondo.metaMeses);
  const { completado } = calcularProgresoFondo(montoTotal, objetivo);
  fondo.completado = completado;
}

// ── HELPERS DE MODAL ─────────────────────────────────────────────

function _getOverlay() {
  return document.getElementById('modal-ahorro');
}

function _setBody(html) {
  const body = document.getElementById('modal-ahorro-body');
  if (body) body.innerHTML = html;
}

function _wireForm() {
  const form = document.getElementById('form-fondo');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarFondo(form);
  });
}

function _abrirFormFondo(editando) {
  const overlay = _getOverlay();
  if (!overlay) return;

  const fondo = S.ahorro?.fondoEmergencia ?? { metaMeses: 3, montoActual: 0 };
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = editando ? 'Editar fondo de emergencia' : 'Activar fondo de emergencia';

  _setBody(renderFormFondo({
    editando,
    metaMeses:           fondo.metaMeses   ?? 3,
    montoActual:         fondo.montoActual ?? 0,
    gastosFijosMensuales: _gastosFijosMensuales(),
  }));
  _wireForm();
  abrirModal(overlay);
}

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _activarFondo() {
  _abrirFormFondo(/* editando */ false);
}

function _editarFondo() {
  _abrirFormFondo(/* editando */ true);
}

/** @param {HTMLFormElement} form */
function _guardarFondo(form) {
  const datos   = Object.fromEntries(new FormData(form));
  const errores = [...validarMetaMeses(datos.metaMeses), ...validarMontoActual(datos.montoActual)];

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const metaMeses   = normalizarMetaMeses(datos.metaMeses);
  const montoActual = normalizarMontoActual(datos.montoActual);

  const yaActivo = S.ahorro?.fondoEmergencia?.activo === true;
  S.ahorro.fondoEmergencia = { activo: true, metaMeses, montoActual };
  _actualizarCompletado();
  save();
  EventBus.emit('state:change', { section: 'ahorro' });

  const overlay = _getOverlay();
  if (overlay) cerrarModal(overlay);

  _renderAhorroBound();
  announce(yaActivo
    ? 'Fondo de emergencia actualizado.'
    : '¡Fondo de emergencia activado!'
  );
}

async function _desactivarFondo() {
  const ok = await confirmar({
    titulo:         'Desactivar fondo de emergencia',
    mensaje:        'Vas a quitar el fondo del seguimiento. Los datos se guardan, pero la sección vuelve a mostrar la pantalla inicial para activarlo. ¿Continuar?',
    confirmarTexto: 'Desactivar',
    peligroso:      true,
  });
  if (!ok) return;

  if (S.ahorro?.fondoEmergencia) {
    S.ahorro.fondoEmergencia.activo = false;
  }
  _actualizarCompletado();
  save();
  EventBus.emit('state:change', { section: 'ahorro' });

  const overlay = _getOverlay();
  if (overlay) cerrarModal(overlay);

  _renderAhorroBound();
  announce('Fondo de emergencia desactivado.');
}

// ── ACCIONES: APORTES (J.1b) ─────────────────────────────────────

function _nuevoAporte() {
  const overlay = _getOverlay();
  if (!overlay) return;

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Registrar aporte';

  // AH.5a: mismo cálculo (AH.2) que ya se sugiere para el compromiso mensual,
  // aplicado aquí para prellenar el aporte real en vez de dejarlo en blanco.
  _setBody(renderFormAporte({ fecha: hoy(), sugerencia: _construirSugerenciaAporte() }));

  const form = document.getElementById('form-aporte');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      _guardarAporte(form);
    });
  }
  abrirModal(overlay);
}

/** @param {HTMLFormElement} form */
function _guardarAporte(form) {
  const datos   = Object.fromEntries(new FormData(form));
  const errores = [
    ...validarMontoAporte(datos.monto),
    ...validarFechaAporte(datos.fecha),
  ];

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const aporte = {
    id:    genId(),
    monto: normalizarMontoAporte(datos.monto),
    fecha: datos.fecha.trim(),
    nota:  datos.nota?.trim() || undefined,
  };

  if (!Array.isArray(S.ahorro.aportes)) S.ahorro.aportes = [];
  S.ahorro.aportes.push(aporte);
  _actualizarCompletado();
  save();
  EventBus.emit('state:change', { section: 'ahorro' });

  const overlay = _getOverlay();
  if (overlay) cerrarModal(overlay);

  _renderAhorroBound();
  announce(`Aporte de ${aporte.monto.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })} registrado.`);
}

/** @param {HTMLElement} el */
async function _eliminarAporte(el) {
  const id = el.dataset.id;
  if (!id) return;

  const aportes = Array.isArray(S.ahorro?.aportes) ? S.ahorro.aportes : [];
  const aporte  = aportes.find(a => a.id === id);
  if (!aporte) return;

  const ok = await confirmar({
    titulo:         'Eliminar aporte',
    mensaje:        `¿Quieres eliminar el aporte de ${aporte.monto.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })} del ${aporte.fecha}? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  S.ahorro.aportes = S.ahorro.aportes.filter(a => a.id !== id);
  _actualizarCompletado();
  save();
  EventBus.emit('state:change', { section: 'ahorro' });

  _renderAhorroBound();
  announce('Aporte eliminado.');
}

// ── ACCIONES: COMPROMISO MENSUAL (J.1b) ──────────────────────────

function _editarCompromisoMensual() {
  const overlay = _getOverlay();
  if (!overlay) return;

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Compromiso mensual de ahorro';

  const compromisoActual = Number(S.ahorro?.compromisoMensual) || 0;
  _setBody(renderFormCompromisoMensual(compromisoActual, _construirSugerenciaAporte()));

  const form = document.getElementById('form-compromiso');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      _guardarCompromisoMensual(form);
    });
  }

  // AH.2: sin ingresos registrados, el form pide el promedio mensual y la
  // caja de sugerencia se recalcula en vivo mientras el usuario escribe.
  const inputIngreso = document.getElementById('sugerencia-ingreso');
  if (inputIngreso) {
    inputIngreso.addEventListener('input', () => {
      const caja = document.getElementById('caja-sugerencia');
      if (!caja) return;
      const val = Number(inputIngreso.value);
      const override = Number.isFinite(val) && val > 0 ? val : null;
      caja.innerHTML = renderCajaSugerencia(_construirSugerenciaAporte(override));
    });
  }

  abrirModal(overlay);
}

/**
 * Copia el monto sugerido (AH.2) al campo del compromiso mensual.
 * @param {HTMLElement} el botón con data-monto.
 */
function _usarAporteSugerido(el) {
  const monto = Number(el.dataset.monto);
  const input = document.getElementById('compromiso-monto');
  if (!input || !Number.isFinite(monto) || monto <= 0) return;
  input.value = monto;
  input.focus();
}

/** @param {HTMLFormElement} form */
function _guardarCompromisoMensual(form) {
  const datos   = Object.fromEntries(new FormData(form));
  const errores = validarCompromisoMensual(datos.compromisoMensual);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  S.ahorro.compromisoMensual = normalizarCompromisoMensual(datos.compromisoMensual);
  save();
  EventBus.emit('state:change', { section: 'ahorro' });

  const overlay = _getOverlay();
  if (overlay) cerrarModal(overlay);

  _renderAhorroBound();
  announce(S.ahorro.compromisoMensual > 0
    ? `Compromiso mensual de ${S.ahorro.compromisoMensual.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })} guardado.`
    : 'Compromiso mensual eliminado.'
  );
}

// ── INIT ─────────────────────────────────────────────────────────

/**
 * Wrapper que renderSmart/registrarRender pueden invocar sin argumentos.
 * Calcula gastosFijosMensuales al vuelo desde S.compromisos.
 */
function _renderAhorroBound() {
  renderAhorro(_gastosFijosMensuales(), _calcularTasaAhorro(), _construirSugerenciaAporte());
  renderCasaAhorro(_gastosFijosMensuales());
}

/**
 * Render condicionado a la sección visible. Este dominio dibuja dos pantallas:
 * la tarjeta del fondo en `#fondo` y la casa de Ahorro en `#ahorro` (DIS.18),
 * que reemplazó al consolidado repetido en las cuatro hijas del hub.
 */
function _renderSegunSeccion() {
  // El banner de propósito conserva la clave 'ahorro': su copy es el del fondo
  // (el dominio no cambió de nombre, cambió su ruta) y su slot es
  // #proposito-ahorro, que sigue viviendo dentro de la sección del fondo.
  renderBannerProposito('ahorro', _tieneDatosAhorro());
  renderSmart(_renderAhorroBound, 'fondo');
  renderSmart(() => renderCasaAhorro(_gastosFijosMensuales()), 'ahorro');
}

export function initAhorro() {
  registrarAccion('ahorro-activar-fondo',     _activarFondo);
  registrarAccion('ahorro-editar',            _editarFondo);
  registrarAccion('ahorro-desactivar',        _desactivarFondo);
  registrarAccion('ahorro-nuevo-aporte',      _nuevoAporte);
  registrarAccion('ahorro-eliminar-aporte',   _eliminarAporte);
  registrarAccion('ahorro-editar-compromiso', _editarCompromisoMensual);
  registrarAccion('ahorro-usar-sugerido',     _usarAporteSugerido);

  // El objetivo del fondo depende de gastos fijos: re-render ante cambios en
  // ahorro, compromisos, ingresos o gastos (la tasa de ahorro usa los 3 últimos).
  // metas/apartados/inversiones alimentan las filas de la casa de Ahorro (DIS.18).
  EventBus.on('state:change', ({ section }) => {
    if (
      section === 'ahorro'      ||
      section === 'compromisos' ||
      section === 'ingresos'    ||
      section === 'gastos'      ||
      section === 'metas'       ||
      section === 'apartados'   ||
      section === 'inversiones'
    ) {
      _renderSegunSeccion();
    }
  });

  // "Distribuir mi ingreso" (ADR 012, MC.4a): tesorería emite el plan y cada
  // dominio aplica su porción. Aquí, los aportes al fondo de emergencia. El
  // aporte NO descuenta cuenta (su dinero "se queda" donde está, ADR 009):
  // tesorería solo descuenta lo de metas/apartados, no lo del fondo.
  EventBus.on('distribucion:aplicar', ({ items }) => {
    const aportesFondo = (items ?? []).filter(i => i.tipo === 'fondo' && i.monto > 0);
    if (aportesFondo.length === 0) return;
    if (!S.ahorro?.fondoEmergencia?.activo) return;
    if (!Array.isArray(S.ahorro.aportes)) S.ahorro.aportes = [];
    for (const it of aportesFondo) {
      S.ahorro.aportes.push({ id: genId(), monto: it.monto, fecha: hoy(), nota: 'Distribución de ingreso' });
    }
    _actualizarCompletado();
    save();
    EventBus.emit('state:change', { section: 'ahorro' });
  });

  // Para que renderAll() también dibuje esta sección.
  registrarRender(_renderAhorroBound);

  // Re-render al navegar a cualquier sección del hub (patrón de metas/presupuesto).
  window.addEventListener('hashchange', _renderSegunSeccion);

  _renderSegunSeccion();
}

/** true si el fondo de emergencia está activo o ya hay algún aporte registrado. */
function _tieneDatosAhorro() {
  return Boolean(S.ahorro?.fondoEmergencia?.activo) || (S.ahorro?.aportes ?? []).length > 0;
}
