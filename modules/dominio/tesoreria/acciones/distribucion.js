/**
 * tesoreria/acciones/distribucion.js - handlers del asistente "Distribuir mi ingreso":
 * presets, editor personalizado, pasos, recalculo en vivo, aplicar y deshacer.
 *
 * Sub-modulo de tesoreria/index.js. Reglas de la capa:
 * - Handlers de data-action y wiring de formularios del subsistema.
 * - Coordina logic/ + views/ sin hacer calculos ni generar HTML aqui.
 */

import { S, EventBus } from '../../../core/state.js';
import { save } from '../../../core/storage.js';
import { guardar, editar } from '../../../infra/crud.js';
import { registrarAccion } from '../../../ui/actions.js';
import { updSaldo } from '../../../infra/render.js';
import { announce } from '../../../infra/a11y.js';
import { f, hoy } from '../../../infra/utils.js';
import { resolverCuenta } from '../../../infra/cuenta-helper.js';
import {
  esDistribucionPersonalizadaValida,
  resumirPlanDistribucion,
  presupuestosSobreRemanente,
  estadoDistribucion,
  topeAbonoExtraDeuda,
} from '../logic/distribucion.js';
import { renderDistribucionIngreso } from '../view.js';

/** @param {HTMLElement} el */
function _cambiarPreset(el) {
  const presetId = el.dataset.preset;
  if (!presetId) return;
  if (!S.config) S.config = {};
  S.config.presetDistribucion = presetId;
  save();
  renderDistribucionIngreso();
}

// ── DISTRIBUCIÓN PERSONALIZADA (porcentajes propios) ────────────

/** Lee los 3 porcentajes del editor. Valores no numéricos cuentan como 0. */
function _leerInputsDistribucionPersonalizada(fieldset) {
  const get = (key) => Number(fieldset.querySelector(`[data-dist-pct="${key}"]`)?.value) || 0;
  return { n: get('n'), e: get('e'), a: get('a') };
}

/** Abre/cierra el editor sin re-renderizar el nudge (mismo patrón que _toggleCuotaFieldset). */
function _toggleDistribucionPersonalizada(el) {
  const fieldset = document.getElementById('distribucion-personalizada-fieldset');
  if (!fieldset) return;
  fieldset.hidden = !fieldset.hidden;
  el.setAttribute('aria-expanded', String(!fieldset.hidden));
  if (!fieldset.hidden) {
    _actualizarSumaDistribucionPersonalizada();
    fieldset.querySelector('[data-dist-pct="n"]')?.focus();
  }
}

/** Actualiza el mensaje de suma y habilita/deshabilita "Guardar" en vivo, sin re-render. */
function _actualizarSumaDistribucionPersonalizada() {
  const fieldset = document.getElementById('distribucion-personalizada-fieldset');
  const msg      = document.getElementById('distribucion-personalizada-msg');
  const boton    = fieldset?.querySelector('[data-action="guardar-distribucion-personalizada"]');
  if (!fieldset || !msg || !boton) return;

  const valores = _leerInputsDistribucionPersonalizada(fieldset);
  const suma    = valores.n + valores.e + valores.a;
  const valida  = esDistribucionPersonalizadaValida(valores);

  msg.textContent = valida
    ? `Suma: ${suma}%. Lista para guardar.`
    : `Suma: ${suma}%. Debe ser exactamente 100%.`;
  msg.classList.toggle('form-hint--danger', !valida);
  boton.disabled = !valida;
}

/** Persiste la distribución personalizada y la activa como preset. */
function _guardarDistribucionPersonalizada() {
  const fieldset = document.getElementById('distribucion-personalizada-fieldset');
  if (!fieldset) return;

  const valores = _leerInputsDistribucionPersonalizada(fieldset);
  if (!esDistribucionPersonalizadaValida(valores)) return;

  if (!S.config) S.config = {};
  S.config.distribucionPersonalizada = valores;
  S.config.presetDistribucion = 'personalizado';
  save();
  renderDistribucionIngreso();
  announce(`Distribución personalizada guardada: ${valores.n}% necesidades, ${valores.e}% estilo de vida, ${valores.a}% ahorro.`);
}

// ── DISTRIBUIR MI INGRESO: grupo Ahorro (ADR 012, MC.4a) ─────────

/** Snapshot de las slices afectadas por la última distribución, para "Deshacer". */
let _snapshotDistribucion = null;
let _snackbarTimer = null;
/**
 * Modo "ya acreditado" (NAV.A2b s2, ADR 024 D3). Cuando un ingreso puntual ya
 * subió el saldo de su cuenta y el usuario opta por distribuirlo, el asistente
 * corre en este modo: NO re-acredita la cuenta (`+ monto`), usa la cuenta del
 * ingreso como origen y no marca el periodo del ingreso recurrente. `null` = el
 * flujo normal (el cobro recurrente aún no entró, el asistente lo acredita).
 * @type {null | { cuentaId: string, monto: number }}
 */
let _distribucionPreacreditada = null;
// 'gastos' (ADR 018 revisión 2026-07-02, R4): el Paso 1 de Necesidades registra
// pagos reales; sin esta slice en el snapshot, "Deshacer" dejaría esos gastos huérfanos.
const _SLICES_DISTRIBUCION = ['cuentas', 'gastos', 'ahorro', 'metas', 'apartados', 'compromisos', 'inversiones', 'logros', 'config'];

/** Abre/cierra el panel sin re-renderizar el nudge (igual que el editor personalizado). */
function _toggleDistribuirIngreso(el) {
  const panel = document.getElementById('distribuir-ingreso-panel');
  if (!panel) return;
  // Abrir/cerrar a mano es siempre el flujo normal (el cobro recurrente aún no
  // entró): descarta cualquier modo "ya acreditado" que quedara de una oferta.
  _distribucionPreacreditada = null;
  panel.hidden = !panel.hidden;
  el.setAttribute('aria-expanded', String(!panel.hidden));
  if (!panel.hidden) {
    // El asistente siempre arranca en el primer paso (MC.7d, shell paginado).
    // `moverFoco: false` porque el foco real de apertura es el monto a
    // distribuir (línea siguiente), no el contenedor del paso (MC.7f).
    _irAPasoDistribucion(panel, 0, { moverFoco: false });
    document.getElementById('distribuir-monto')?.focus();
  }
}

/**
 * Abre el asistente (sin toggle) en el primer paso. Lo usan el recordatorio de
 * día de ingreso del Calendario (ADR 021, sin payload) y la oferta tras un
 * ingreso puntual (NAV.A2b s2, con `preacreditado`). No-op si el panel no
 * existe. Sincroniza aria-expanded del botón y trae el panel a la vista.
 *
 * @param {{ preacreditado?: { cuentaId: string, monto: number } | null }} [opts]
 */
export function abrirAsistenteDistribucion({ preacreditado = null } = {}) {
  const panel = document.getElementById('distribuir-ingreso-panel');
  if (!panel) return;

  // Fijar el modo antes de recalcular: el resumen y el apply lo consultan.
  _distribucionPreacreditada = preacreditado;

  // Con un monto ya conocido (el ingreso recién acreditado), pre-cargarlo para
  // que el asistente reparta esa cifra en vez del estimado del salario mensual.
  if (preacreditado) {
    const inputMonto = document.getElementById('distribuir-monto');
    if (inputMonto) inputMonto.value = String(preacreditado.monto);
  }

  if (panel.hidden) {
    panel.hidden = false;
    document.querySelector('[data-action="toggle-distribuir-ingreso"]')
      ?.setAttribute('aria-expanded', 'true');
  }
  // Ir al paso 0 recalcula el resumen con el monto (y el modo) recién fijados.
  _irAPasoDistribucion(panel, 0, { moverFoco: false });
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('distribuir-monto')?.focus({ preventScroll: true });
}

// ── ASISTENTE PAGINADO (MC.7d, ADR 018) ──────────────────────────

/** Pasos del asistente (secciones paginadas del panel), en orden. */
function _pasosDistribucion(panel) {
  return [...panel.querySelectorAll('[data-dist-paso]')];
}

/** Índice del paso visible (0 si no hay ninguno, estado imposible tras render). */
function _pasoActualDistribucion(panel) {
  const idx = _pasosDistribucion(panel).findIndex(p => !p.hidden);
  return idx === -1 ? 0 : idx;
}

/**
 * Muestra el paso `idx` (base 0) del asistente y ajusta navegación e indicador
 * (MC.7d: shell paginado con confirmación única al final). "Atrás" existe desde
 * el segundo paso; en el último, "Siguiente" cede su lugar a "Distribuir".
 *
 * Foco (MC.7f, a11y): al avanzar/retroceder, el foco se mueve al contenedor
 * del paso recién mostrado (`tabindex="-1"`, `role="group"` con `aria-label`
 * "Paso X de N: <título>"). El foco por sí solo anuncia el cambio a lectores
 * de pantalla, el patrón recomendado para asistentes multi-paso (WAI-ARIA
 * APG), sin depender de que el usuario ya esté enfocado cerca del indicador
 * `role="status"`. Se omite (`moverFoco: false`) en la apertura inicial del
 * panel, donde el caller ya enfoca el monto a distribuir.
 *
 * @param {Element} panel
 * @param {number} idx
 * @param {{moverFoco?: boolean}} [opts]
 */
function _irAPasoDistribucion(panel, idx, { moverFoco = true } = {}) {
  const pasos = _pasosDistribucion(panel);
  if (pasos.length === 0 || idx < 0 || idx >= pasos.length) return;
  pasos.forEach((p, i) => { p.hidden = i !== idx; });

  const esUltimo  = idx === pasos.length - 1;
  const atras     = panel.querySelector('[data-action="distribuir-paso-atras"]');
  const siguiente = panel.querySelector('[data-action="distribuir-paso-siguiente"]');
  const confirmar = panel.querySelector('[data-action="confirmar-distribucion"]');
  if (atras)     atras.hidden     = idx === 0;
  if (siguiente) siguiente.hidden = esUltimo;
  if (confirmar) confirmar.hidden = !esUltimo;

  const indicador = panel.querySelector('[data-dist-paso-indicador]');
  if (indicador) {
    indicador.textContent = `Paso ${idx + 1} de ${pasos.length}: ${pasos[idx].dataset.distPasoTitulo ?? ''}`;
  }

  if (moverFoco) pasos[idx].focus({ preventScroll: true });

  // Al entrar a un paso, las sugerencias R3 y el resumen quedan al día.
  _recalcularDistribucion();
}

function _pasoDistribucionSiguiente() {
  const panel = document.getElementById('distribuir-ingreso-panel');
  if (panel) _irAPasoDistribucion(panel, _pasoActualDistribucion(panel) + 1);
}

function _pasoDistribucionAtras() {
  const panel = document.getElementById('distribuir-ingreso-panel');
  if (panel) _irAPasoDistribucion(panel, _pasoActualDistribucion(panel) - 1);
}

/** Saldo pendiente actual de una deuda (0 si no existe). */
function _saldoDeuda(id) {
  const d = (S.compromisos ?? []).find(c => c.id === id);
  return Number(d?.saldoTotal) || 0;
}

/**
 * Lee las filas activas (toggle on) con monto > 0 del panel. Para deudas, topa
 * el abono al saldo pendiente restando la cuota que el checklist de
 * Necesidades ya haya marcado para esa misma deuda (BUG-009): sin esto, la
 * cuota y el extra topaban por separado contra el mismo saldo previo y podían
 * sumar más de lo que la deuda debe. Así el resumen y el apply usan el mismo
 * monto efectivo.
 *
 * Las filas de tipo 'cuenta' (transferencias de Estilo de vida entre cuentas,
 * MC.7e) quedan explícitamente excluidas: no son parte del "asignado" del
 * ingreso (no es gasto ni ahorro nuevo, es dinero que ya era del usuario
 * moviéndose entre sus propias cuentas); se leen aparte con
 * `_leerTransferenciasCuentas`.
 *
 * @param {Element} panel
 * @param {Array<{tipo:string, id:string, monto:number}>} [necesidades] Salida de `_leerNecesidadesMarcadas`.
 */
function _leerItemsDistribucion(panel, necesidades = []) {
  return [...panel.querySelectorAll('.distribuir__fila')]
    .filter(fila => fila.querySelector('[data-dist-destino-toggle]')?.checked)
    .map(fila => {
      const inp = fila.querySelector('.distribuir__monto');
      const tipo = inp?.dataset.distTipo;
      const id   = inp?.dataset.distId || null;
      let monto  = Number(inp?.value) || 0;
      if (tipo === 'deuda') {
        const cuotaMarcada = necesidades
          .filter(n => n.tipo === 'necesidad-deuda' && n.id === id)
          .reduce((s, n) => s + n.monto, 0);
        monto = topeAbonoExtraDeuda(_saldoDeuda(id), cuotaMarcada, monto);
      }
      return { tipo, id, monto };
    })
    .filter(it => it.tipo !== 'cuenta' && it.monto > 0);
}

/**
 * Lee las transferencias de Estilo de vida hacia otras cuentas marcadas en el
 * Paso 3 (MC.7e, ADR 018 decisión 4): filas `data-dist-tipo="cuenta"` con su
 * toggle activado y monto > 0. No pasan por `topeAbonoExtraDeuda` ni cuentan
 * como "asignado" del ingreso (ver `_leerItemsDistribucion`): son
 * redistribuciones internas, validadas aparte contra el presupuesto de Estilo
 * de vida en `_recalcularDistribucion`.
 *
 * @param {Element} panel
 * @returns {Array<{cuentaId:string, monto:number}>}
 */
function _leerTransferenciasCuentas(panel) {
  return [...panel.querySelectorAll('.distribuir__fila')]
    .filter(fila => fila.querySelector('[data-dist-destino-toggle]')?.checked)
    .map(fila => {
      const inp = fila.querySelector('.distribuir__monto');
      if (inp?.dataset.distTipo !== 'cuenta') return null;
      return { cuentaId: inp.dataset.distId || null, monto: Number(inp.value) || 0 };
    })
    .filter(it => it && it.monto > 0);
}

/**
 * Lee las Necesidades marcadas del checklist del Paso 1 (ADR 018 revisión
 * 2026-07-02, R1). A diferencia de `_leerItemsDistribucion`, el monto no es
 * editable (viene fijo en `data-nec-monto`). Las ya pagadas quedan marcadas Y
 * deshabilitadas (para comunicar "esto ya está cubierto"), pero un checkbox
 * `checked disabled` sigue reportando `.checked === true`: sin excluir
 * `disabled` explícitamente, confirmar la distribución volvía a pagar una
 * Necesidad ya pagada (BUG-003). `tipo` distingue 'necesidad-fijo'/
 * 'necesidad-deuda' del tipo 'deuda' de los abonos extra (Paso 2), para que
 * `_confirmarDistribucion` los aplique distinto.
 */
function _leerNecesidadesMarcadas(panel) {
  return [...panel.querySelectorAll('[data-nec-toggle]')]
    .filter(chk => chk.checked && !chk.disabled)
    .map(chk => ({
      tipo:  chk.dataset.necTipo === 'deuda' ? 'necesidad-deuda' : 'necesidad-fijo',
      id:    chk.dataset.necId || null,
      monto: Number(chk.dataset.necMonto) || 0,
    }))
    .filter(it => it.monto > 0);
}

/**
 * Recalcula en vivo las sugerencias que dependen del remanente real (ADR 018
 * revisión 2026-07-02, R3): el monto del hint de ahorro, la fila del fondo
 * (mientras el usuario no la edite a mano, absorbe el excedente del presupuesto
 * de ahorro tras los aportes marcados a metas/apartados) y la fila informativa
 * de Estilo de vida. Se invoca desde `_recalcularDistribucion` antes de sumar
 * el plan, para que el resumen use los montos ya actualizados. Sin tocar S.
 *
 * @param {Element} panel
 * @param {number} monto Monto a distribuir actual.
 * @param {Array<{tipo:string, id:string|null, monto:number}>} necesidades Salida de `_leerNecesidadesMarcadas`.
 * @returns {{ahorro:number, estiloVida:number}} Presupuestos recién calculados
 *   (para que `_recalcularDistribucion` valide las transferencias de MC.7e sin
 *   tener que releer el DOM que esta misma función acaba de escribir).
 */
function _actualizarSugerenciasRemanente(panel, monto, necesidades) {
  const totalNec = necesidades.reduce((s, n) => s + n.monto, 0);
  const { ahorro, estiloVida } = presupuestosSobreRemanente(
    monto,
    totalNec,
    Number(panel.dataset.ahorroPct) || 0,
    Number(panel.dataset.estiloVidaPct) || 0,
  );

  const hintEl = panel.querySelector('[data-dist-sugerencia-ahorro]');
  if (hintEl) hintEl.textContent = f(ahorro);

  // La fila del fondo sigue la sugerencia automática (data-dist-auto, R3) hasta
  // que el usuario la edite a mano (data-editado) o la excluya del plan (disabled).
  const fondoInp = panel.querySelector('.distribuir__monto[data-dist-auto="1"]');
  if (fondoInp && fondoInp.dataset.editado !== '1' && !fondoInp.disabled) {
    const aportesMarcados = [...panel.querySelectorAll('.distribuir__monto')]
      .filter(inp => inp.dataset.distTipo === 'meta' || inp.dataset.distTipo === 'apartado')
      .filter(inp => inp.closest('.distribuir__fila')?.querySelector('[data-dist-destino-toggle]')?.checked)
      .reduce((s, inp) => s + (Number(inp.value) || 0), 0);
    fondoInp.value = Math.max(0, ahorro - aportesMarcados);
  }

  const evEl = panel.querySelector('[data-dist-info="estiloVida"]');
  if (evEl) evEl.textContent = f(estiloVida);

  return { ahorro, estiloVida };
}

/**
 * Valida las transferencias de Estilo de vida a otras cuentas (Paso 3, MC.7e)
 * contra el presupuesto de Estilo de vida ya recalculado sobre el remanente
 * real (R3): no se puede mover más de lo que ese presupuesto contiene. Reusa
 * `resumirPlanDistribucion` (mismo shape `{monto}` que el resto del plan).
 *
 * @param {number} evBudget Presupuesto de Estilo de vida (`_actualizarSugerenciasRemanente`).
 * @param {Array<{cuentaId:string, monto:number}>} transferencias Salida de `_leerTransferenciasCuentas`.
 * @returns {{transferido:number, disponible:number, excede:boolean}}
 */
function _validarTransferenciasCuentas(evBudget, transferencias) {
  const { asignado, sinAsignar, excede } = resumirPlanDistribucion(evBudget, transferencias);
  return { transferido: asignado, disponible: sinAsignar, excede };
}

/** Recalcula el resumen en vivo y habilita/deshabilita "Distribuir". Sin tocar S. */
function _recalcularDistribucion() {
  const panel = document.getElementById('distribuir-ingreso-panel');
  if (!panel) return;
  const monto       = Number(document.getElementById('distribuir-monto')?.value) || 0;
  const necesidades = _leerNecesidadesMarcadas(panel);
  // R3: primero refrescar las sugerencias sobre el remanente, para que el
  // resumen de abajo sume los montos ya actualizados.
  const { estiloVida: evBudget } = _actualizarSugerenciasRemanente(panel, monto, necesidades);
  const items       = [...necesidades, ..._leerItemsDistribucion(panel, necesidades)];
  const { asignado, sinAsignar, excede } = resumirPlanDistribucion(monto, items);

  // Paso 3 (MC.7e): transferencias hacia otras cuentas, validadas aparte
  // contra el presupuesto de Estilo de vida (no contra el ingreso total).
  const transferencias = _leerTransferenciasCuentas(panel);
  const { transferido, excede: excedeTransferencia } = _validarTransferenciasCuentas(evBudget, transferencias);
  const cuentasResumenEl = document.getElementById('distribuir-cuentas-resumen');
  if (cuentasResumenEl) {
    cuentasResumenEl.textContent = excedeTransferencia
      ? `Repartiste ${f(transferido)}, más de los ${f(evBudget)} de Estilo de vida disponibles.`
      : `Repartido entre cuentas: ${f(transferido)} de ${f(evBudget)} disponibles.`;
    cuentasResumenEl.classList.toggle('form-hint--danger', excedeTransferencia);
  }

  const resumenEl = document.getElementById('distribuir-resumen');
  const boton     = panel.querySelector('[data-action="confirmar-distribucion"]');
  // "Distribuir" se habilita si hay algo real que registrar: Necesidades/Ahorro/
  // Deudas/Inversiones (asignado) o, con MC.7e, una transferencia entre cuentas
  // (transferido), aunque no haya nada más marcado en los otros pasos.
  const valido    = monto > 0 && (asignado > 0 || transferido > 0) && !excede && !excedeTransferencia;

  if (resumenEl) {
    resumenEl.textContent = excede
      ? `Asignaste ${f(asignado)}, más que tu ingreso de ${f(monto)}. Reduce algún destino.`
      : `Asignado: ${f(asignado)}. Queda disponible en tu cuenta: ${f(sinAsignar)}.`;
    resumenEl.classList.toggle('form-hint--danger', excede);
  }

  if (boton) boton.disabled = !valido;
}

/** Habilita/deshabilita el input de monto de una fila según su toggle, y recalcula. */
function _onToggleDestinoDistribucion(checkbox) {
  const fila = checkbox.closest('.distribuir__fila');
  const inp  = fila?.querySelector('.distribuir__monto');
  if (inp) inp.disabled = !checkbox.checked;
  _recalcularDistribucion();
}

/** Copia profunda de las slices indicadas (S es JSON-serializable). */
function _clonarSlices(keys) {
  const snap = {};
  for (const k of keys) snap[k] = JSON.parse(JSON.stringify(S[k] ?? null));
  return snap;
}

/** Restaura las slices desde un snapshot previo. */
function _restaurarSlices(snap) {
  for (const k of Object.keys(snap)) S[k] = snap[k];
}

/**
 * Aplica el pago de una Necesidad marcada del Paso 1 (ADR 018 revisión
 * 2026-07-02, R1): genera exactamente el mismo registro que su flujo
 * individual existente, para que quede coherente con Agenda, Deudas, Análisis
 * y el ejecutado de Límites (ADR 017). Escribe directo en 'gastos', el mismo
 * patrón que ya usan Agenda y Compromisos (ledger compartido entre dominios,
 * no una violación de ADN #10: `cuentas` y `gastos` los edita cualquier
 * dominio con `guardar`/`editar` de crud.js, igual que aquí).
 *
 * - Fijo: mismo gasto que "Marcar pagado este mes" de Agenda (categoría
 *   "Gastos fijos", vinculado por `compromisoId`).
 * - Deuda: mismo gasto que el formulario de abono individual (categoría
 *   "Deudas") más el descuento de `saldoTotal`, topado en 0.
 *
 * @param {{tipo:'necesidad-fijo'|'necesidad-deuda', id:string, monto:number}} item
 * @param {string} cuentaId
 */
function _aplicarNecesidad(item, cuentaId) {
  const comp = (S.compromisos ?? []).find(c => c.id === item.id);
  if (!comp) return;

  if (item.tipo === 'necesidad-fijo') {
    guardar('gastos', {
      descripcion:        `Pago: ${comp.descripcion}`,
      monto:              item.monto,
      categoria:          'Gastos fijos',
      fecha:              hoy(),
      cuentaId,
      nota:               '',
      compromisoId:       item.id,
      pendienteCompletar: false,
    });
    return;
  }

  guardar('gastos', {
    descripcion:        `Abono: ${comp.descripcion}`,
    monto:              item.monto,
    categoria:          'Deudas',
    fecha:              hoy(),
    cuentaId,
    nota:               '',
    compromisoId:       item.id,
    pendienteCompletar: false,
  });
  const nuevoSaldo = Math.max(0, (Number(comp.saldoTotal) || 0) - item.monto);
  editar('compromisos', item.id, { saldoTotal: nuevoSaldo });
}

/**
 * Aplica las transferencias de Estilo de vida hacia otras cuentas (Paso 3,
 * MC.7e): mueve saldo de la cuenta de origen a cada cuenta destino. Una
 * transferencia hacia la propia cuenta de origen es un no-op (el dinero ya
 * está ahí: puede pasar si el usuario marcó una fila antes de que
 * `resolverCuenta` resolviera cuál es la cuenta de origen, ya que ambos pasos
 * son independientes por diseño, ver R2 del ADR 018).
 *
 * @param {Array<{cuentaId:string, monto:number}>} transferencias
 * @param {string} cuentaOrigenId
 * @returns {number} Total efectivamente transferido (excluye el no-op consigo misma).
 */
function _aplicarTransferenciasCuentas(transferencias, cuentaOrigenId) {
  let total = 0;
  for (const t of transferencias) {
    if (!t.cuentaId || t.cuentaId === cuentaOrigenId || t.monto <= 0) continue;
    const destino = (S.cuentas ?? []).find(c => c.id === t.cuentaId);
    if (!destino) continue;
    editar('cuentas', t.cuentaId, { saldo: (destino.saldo ?? 0) + t.monto });
    total += t.monto;
  }
  return total;
}

/**
 * Aplica la distribución: acredita el ingreso a la cuenta de origen, descuenta lo
 * que físicamente sale (Necesidades marcadas + metas/apartados/deudas/inversiones
 * seleccionadas; el aporte al fondo no descuenta, ADR 009), registra los pagos
 * de Necesidades (R1), reparte Estilo de vida entre cuentas si corresponde
 * (MC.7e) y delega el resto a cada dominio por EventBus. Guarda snapshot para undo.
 */
async function _confirmarDistribucion() {
  const panel = document.getElementById('distribuir-ingreso-panel');
  if (!panel) return;

  const monto       = Number(document.getElementById('distribuir-monto')?.value) || 0;
  const necesidades = _leerNecesidadesMarcadas(panel);
  const items       = _leerItemsDistribucion(panel, necesidades);
  const todos       = [...necesidades, ...items];
  const { asignado, excede } = resumirPlanDistribucion(monto, todos);

  // Paso 3 (MC.7e): las transferencias a otras cuentas se validan contra el
  // presupuesto de Estilo de vida sobre el remanente real (R3), no contra el
  // ingreso total (mismo cálculo que `_recalcularDistribucion`).
  const totalNec = necesidades.reduce((s, n) => s + n.monto, 0);
  const { estiloVida: evBudget } = presupuestosSobreRemanente(
    monto, totalNec,
    Number(panel.dataset.ahorroPct) || 0,
    Number(panel.dataset.estiloVidaPct) || 0,
  );
  const transferencias = _leerTransferenciasCuentas(panel);
  const { transferido, excede: excedeTransferencia } = _validarTransferenciasCuentas(evBudget, transferencias);

  // Igual que en `_recalcularDistribucion`: una transferencia entre cuentas
  // (MC.7e) por sí sola ya es una acción válida, aunque nada más esté marcado.
  if (monto <= 0 || (asignado <= 0 && transferido <= 0) || excede || excedeTransferencia) return;

  // Modo "ya acreditado" (NAV.A2b s2): si el ingreso puntual ya subió el saldo,
  // la cuenta de origen es la suya (no se vuelve a preguntar) y no se re-acredita.
  // Si esa cuenta ya no existe (se borró entre registrar y distribuir), se cae al
  // flujo normal (resolver cuenta + acreditar), para no perder el reparto.
  const pre = _distribucionPreacreditada;
  const yaAcreditado = !!pre && (S.cuentas ?? []).some(c => c.id === pre.cuentaId && c.activa !== false);

  const cuentaId = yaAcreditado
    ? pre.cuentaId
    : await resolverCuenta(S.cuentas ?? [], 'distribuir tu ingreso');
  if (!cuentaId) return; // 0 cuentas (guía) o el usuario canceló.

  // Snapshot antes de tocar nada, para un "Deshacer" atómico.
  _snapshotDistribucion = _clonarSlices(_SLICES_DISTRIBUCION);

  // Marcar el periodo como distribuido (guard de de-duplicación, MC.4d). Solo en
  // el flujo normal: el guard es del ingreso recurrente del mes; un ingreso
  // puntual ya acreditado es un evento aparte y no debe consumir ese periodo.
  if (!yaAcreditado) {
    const estado = estadoDistribucion(S.ingresos ?? [], S.config?.ultimaDistribucionPeriodo ?? null);
    if (estado.periodoISO) {
      if (!S.config) S.config = {};
      S.config.ultimaDistribucionPeriodo = estado.periodoISO;
    }
  }

  // Transferir primero (MC.7e): mueve saldo hacia las otras cuentas y devuelve
  // el total efectivamente movido (excluye no-ops hacia la propia cuenta de
  // origen), para descontarlo junto con lo demás que sale de esa cuenta.
  const totalTransferido = _aplicarTransferenciasCuentas(transferencias, cuentaId);

  // Descontar lo que sale de la cuenta (no el fondo, ADR 009) y lo transferido a
  // otras cuentas: ambos dejan la cuenta de origen. El ingreso solo se acredita
  // en el flujo normal; en modo "ya acreditado" el dinero ya está en la cuenta,
  // así que sumar `monto` otra vez sería un doble abono (ADR 024 D3).
  const creditoIngreso = yaAcreditado ? 0 : monto;
  const descontable = todos
    .filter(i => i.tipo !== 'fondo')
    .reduce((s, i) => s + i.monto, 0);
  const cuenta = (S.cuentas ?? []).find(c => c.id === cuentaId);
  if (cuenta) {
    editar('cuentas', cuentaId, { saldo: (cuenta.saldo ?? 0) + creditoIngreso - descontable - totalTransferido });
  }

  // Necesidades (Paso 1, R1): tesorería aplica directo el pago real.
  for (const it of necesidades) _aplicarNecesidad(it, cuentaId);

  // Ahorro, abonos extra a deudas e inversiones: cada dominio aplica su
  // porción con su propia lógica por EventBus (ADN #10).
  EventBus.emit('distribucion:aplicar', { items, cuentaOrigenId: cuentaId });

  // El modo "ya acreditado" es de un solo uso: consumido, se vuelve al normal.
  _distribucionPreacreditada = null;

  updSaldo();
  announce(`Distribuiste ${f(asignado)} de tu ingreso.`);
  _mostrarSnackbarDeshacer();
}

/** Revierte la última distribución restaurando el snapshot. */
function _deshacerDistribucion() {
  if (!_snapshotDistribucion) return;
  _restaurarSlices(_snapshotDistribucion);
  _snapshotDistribucion = null;
  _quitarSnackbarDeshacer();
  save();
  _SLICES_DISTRIBUCION.forEach(s => EventBus.emit('state:change', { section: s }));
  updSaldo();
  announce('Distribución deshecha. Tu dinero volvió a como estaba.');
}

/** Muestra un snackbar no bloqueante con "Deshacer" (vive en body, sobrevive re-renders). */
function _mostrarSnackbarDeshacer() {
  _quitarSnackbarDeshacer();
  const bar = document.createElement('div');
  bar.className = 'snackbar';
  bar.id = 'snackbar-distribucion';
  bar.setAttribute('role', 'status');
  bar.innerHTML = `
    <span class="snackbar__msg">Distribución aplicada.</span>
    <button type="button" class="btn btn-ghost btn-sm" data-action="deshacer-distribucion">Deshacer</button>`;
  document.body.appendChild(bar);
  _snackbarTimer = setTimeout(_quitarSnackbarDeshacer, 8000);
}

/** Quita el snackbar y limpia el timer. */
function _quitarSnackbarDeshacer() {
  if (_snackbarTimer) { clearTimeout(_snackbarTimer); _snackbarTimer = null; }
  document.getElementById('snackbar-distribucion')?.remove();
}

// ── REGISTRO ─────────────────────────────────────────────────────

/**
 * Registra los data-action del asistente y los listeners delegados de
 * recalculo en vivo (input/change a nivel de document).
 */
export function initAccionesDistribucion() {
  registrarAccion('cambiar-preset-distribucion', _cambiarPreset);
  registrarAccion('toggle-distribucion-personalizada', _toggleDistribucionPersonalizada);
  registrarAccion('guardar-distribucion-personalizada', _guardarDistribucionPersonalizada);
  registrarAccion('toggle-distribuir-ingreso', _toggleDistribuirIngreso);
  registrarAccion('distribuir-paso-siguiente', _pasoDistribucionSiguiente);
  registrarAccion('distribuir-paso-atras',     _pasoDistribucionAtras);
  registrarAccion('confirmar-distribucion',    _confirmarDistribucion);
  registrarAccion('deshacer-distribucion',     _deshacerDistribucion);

  // Recalculo en vivo (sin re-render completo, igual que el extra mensual de
  // deudas en ADR 011 S1): el editor personalizado y el panel "Distribuir mi
  // ingreso" comparten el patrón de listener delegado por dataset.action.
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.dataset.action === 'ajustar-distribucion-personalizada') {
      _actualizarSumaDistribucionPersonalizada();
    } else if (t.dataset.action === 'recalcular-distribucion') {
      // R3: una fila editada a mano deja de seguir la sugerencia automática
      // (solo la usa la fila del fondo, ver _actualizarSugerenciasRemanente).
      if (t.classList.contains('distribuir__monto')) t.dataset.editado = '1';
      _recalcularDistribucion();
    }
  });

  // Los toggles de cada destino del panel disparan `change`, no `input`.
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.hasAttribute('data-dist-destino-toggle')) {
      _onToggleDestinoDistribucion(t);
    } else if (t.hasAttribute('data-nec-toggle')) {
      // Necesidades (Paso 1, R1): sin monto editable que habilitar/deshabilitar,
      // solo recalcular el resumen en vivo.
      _recalcularDistribucion();
    }
  });
}
