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
import { editar } from '../../../infra/crud.js';
import { registrarAccion } from '../../../ui/actions.js';
import { updSaldo } from '../../../infra/render.js';
import { announce } from '../../../infra/a11y.js';
import { f, hoy } from '../../../infra/utils.js';
import { resolverCuenta } from '../../../infra/cuenta-helper.js';
import { gastoDePagoCompromiso, bajarSaldoDeuda } from '../../../infra/pago-compromiso.js';
import { abrirModal, cerrarModal } from '../../../ui/modales.js';
import {
  esDistribucionPersonalizadaValida,
  resumirPlanDistribucion,
  presupuestosSobreRemanente,
  estadoDistribucion,
  topeAbonoExtraDeuda,
  cuentaIngresoPrincipal,
  planComplementoDeficit,
} from '../logic/distribucion.js';
import { renderDistribucionIngreso, renderAsistenteDistribucion } from '../view.js';

/**
 * Refresca la tarjeta de entrada compacta y, si el asistente está abierto en
 * el modal (ADR 035 D6), también su contenido: cambiar de preset o guardar
 * una distribución personalizada actualiza el split que ambos muestran.
 */
function _refrescarDistribucion() {
  renderDistribucionIngreso();
  const overlay = document.getElementById('modal-distribuir');
  if (overlay && 'open' in overlay.dataset) renderAsistenteDistribucion();
}

/** @param {HTMLElement} el */
function _cambiarPreset(el) {
  const presetId = el.dataset.preset;
  if (!presetId) return;
  if (!S.config) S.config = {};
  S.config.presetDistribucion = presetId;
  save();
  _refrescarDistribucion();
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
  _refrescarDistribucion();
  announce(`Distribución personalizada guardada: ${valores.n}% necesidades, ${valores.e}% estilo de vida, ${valores.a}% ahorro.`);
}

// ── DISTRIBUIR MI INGRESO: grupo Ahorro (ADR 012, MC.4a) ─────────

/** Snapshot de las slices afectadas por la última distribución, para "Deshacer". */
let _snapshotDistribucion = null;
let _snackbarTimer = null;
// 'gastos' (ADR 018 revisión 2026-07-02, R4): el Paso 1 de Necesidades registra
// pagos reales; sin esta slice en el snapshot, "Deshacer" dejaría esos gastos huérfanos.
const _SLICES_DISTRIBUCION = ['cuentas', 'gastos', 'ahorro', 'metas', 'apartados', 'compromisos', 'inversiones', 'logros', 'config'];

/**
 * Respuesta a la pregunta de MC.13f ("¿ya recibiste el pago del [fecha]?"):
 * marca ese cobro como recibido y sigue derecho al asistente, porque confirmar
 * es querer repartirlo.
 *
 * `cobroConfirmadoPeriodo` vive en `S.config` como campo opcional sin declarar
 * ni migrar, igual que `ultimaDistribucionPeriodo` y `presetDistribucion`: es
 * `undefined`-safe en todo lector, así que no hay bump de schema.
 *
 * @param {HTMLElement} el
 */
function _confirmarCobroRecibido(el) {
  const periodoISO = el.dataset.periodo;
  if (!periodoISO) return;

  if (!S.config) S.config = {};
  S.config.cobroConfirmadoPeriodo = periodoISO;
  save();

  renderDistribucionIngreso();

  // Con el asistente ya abierto la pregunta llegó desde un caller externo (el
  // CTA del detalle del día de Calendario, ADR 021): re-inyectar el contenido
  // la reemplaza por los pasos, sin cerrar y reabrir el modal en la cara del
  // usuario. Desde la tarjeta compacta, en cambio, hay que abrirlo.
  const overlay = document.getElementById('modal-distribuir');
  if (overlay && 'open' in overlay.dataset) {
    if (renderAsistenteDistribucion()) {
      const panel = document.getElementById('distribuir-ingreso-panel');
      if (panel) _irAPasoDistribucion(panel, 0, { moverFoco: false });
    }
  } else {
    abrirAsistenteDistribucion();
  }

  announce('Pago confirmado. Ya puedes distribuirlo.');
}

/**
 * CTA del nudge de Inicio (CAL.1, ADR 028 D4): emite el mismo `distribuir:abrir`
 * que ya usa el recordatorio de día de ingreso del Calendario (ADR 021), sin
 * payload (flujo normal, el asistente resuelve la cuenta). El listener de
 * `tesoreria/index.js` navega a Mis cuentas y abre el asistente.
 */
function _distribuirDesdeInicio() {
  EventBus.emit('distribuir:abrir');
}

/**
 * Único punto de entrada al asistente (ADR 035 D6: lanzado como modal, ya no
 * inline). Lo usan por igual el botón "Distribuir mi ingreso" de la tarjeta
 * compacta y el recordatorio de día de ingreso del Calendario (ADR 021).
 * MC.13e-1: un ingreso esporádico ya NO ofrece abrirlo automáticamente
 * (revierte NAV.A2b s2, ver `tesoreria/acciones/ingresos.js`); este sigue
 * siendo el único punto de entrada manual. Inyecta contenido fresco en
 * `#modal-distribuir-body` (`renderAsistenteDistribucion`) y recién entonces
 * abre el modal; si no hay nada que distribuir es no-op, sin abrir un modal
 * vacío.
 */
export function abrirAsistenteDistribucion() {
  const overlay = document.getElementById('modal-distribuir');
  if (!overlay) return;

  if (!renderAsistenteDistribucion()) return;

  abrirModal(overlay);
  const panel = document.getElementById('distribuir-ingreso-panel');
  // Ir al paso 0 recalcula el resumen con el monto (y el modo) recién fijados.
  if (panel) _irAPasoDistribucion(panel, 0, { moverFoco: false });
  // MC.13e-2g: el foco de apertura se deja en manos de `abrirModal` (primer
  // focusable del panel, el botón de cerrar). Antes se movía al monto a
  // distribuir con `preventScroll`, que ahora vive debajo del bloque educativo:
  // el foco habría caído en un control fuera de la vista, invisible para quien
  // navega con teclado. Entrar por el tope también deja que la educación se lea
  // primero, que es el punto 9.
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
 * Cuenta a la que entra el ingreso, hasta donde el asistente puede saberlo sin
 * preguntar: la que el ingreso principal ya tiene guardada (MC.13e-2f-1) si
 * sigue activa, o la única cuenta activa (regla de cuenta única). `null` cuando
 * hay varias y ninguna está guardada: ahí la resuelve `resolverCuenta()` al
 * confirmar, y hasta entonces el bloque de déficit calcula con todas.
 *
 * @returns {string|null}
 */
function _cuentaOrigenDistribucion() {
  const activas   = (S.cuentas ?? []).filter(c => c.activa !== false);
  const preferida = cuentaIngresoPrincipal(S.ingresos ?? []);
  if (preferida && activas.some(c => c.id === preferida)) return preferida;
  return activas.length === 1 ? activas[0].id : null;
}

/** Nombre de una cuenta por id (para los mensajes del déficit). */
function _nombreCuenta(id) {
  return (S.cuentas ?? []).find(c => c.id === id)?.nombre ?? 'otra cuenta';
}

/**
 * Escribe el bloque de déficit (MC.13e-2e): lo marcado supera el monto a
 * distribuir y el asistente ofrece completar la diferencia con el saldo de
 * otras cuentas activas, en vez de obligar a recortar destinos. La oferta es
 * explícita (casilla sin marcar por defecto, mismo espíritu que el resto del
 * asistente: nada se mueve sin que el usuario lo diga) y nunca sobregira: el
 * reparto sale de `planComplementoDeficit`, que reusa `distribuirPago`.
 *
 * Solo escribe texto y `hidden`, igual que `#distribuir-cuentas-resumen`: el
 * markup lo genera la vista.
 *
 * @param {Element} panel
 * @param {number} deficit Salida de `resumirPlanDistribucion`.
 * @returns {{plan: ReturnType<typeof planComplementoDeficit>, aplicable: boolean}}
 *   `aplicable`: hay con qué cubrirlo Y el usuario lo aceptó.
 */
function _actualizarBloqueDeficit(panel, deficit) {
  const plan  = planComplementoDeficit(S.cuentas ?? [], deficit, _cuentaOrigenDistribucion());
  const bloque = panel.querySelector('#distribuir-deficit');
  const msg    = panel.querySelector('#distribuir-deficit-msg');
  const opcion = panel.querySelector('#distribuir-deficit-opcion');
  const chk    = panel.querySelector('[data-dist-completar-deficit]');
  const detalle = panel.querySelector('#distribuir-deficit-detalle');
  if (!bloque || !msg || !opcion || !chk || !detalle) return { plan, aplicable: false };

  if (deficit <= 0) {
    bloque.hidden = true;
    opcion.hidden = true;
    // Sin déficit no hay nada que aceptar: la casilla vuelve a cero para que
    // una aceptación vieja no reviva sola si el usuario marca más destinos.
    chk.checked = false;
    msg.textContent = '';
    detalle.textContent = '';
    return { plan, aplicable: false };
  }

  bloque.hidden = false;
  opcion.hidden = !plan.cubre;
  if (!plan.cubre) chk.checked = false;

  if (plan.cubre) {
    msg.textContent = `Te faltan ${f(plan.deficit)} para cubrir lo que marcaste.`;
    msg.classList.remove('form-hint--danger');
    detalle.textContent = chk.checked
      ? `Saldrán ${plan.splits.map(s => `${f(s.monto)} de ${_nombreCuenta(s.cuentaId)}`).join(' y ')}.`
      : 'Tus otras cuentas alcanzan a cubrirlo. Ninguna queda en negativo.';
  } else {
    msg.textContent = plan.disponible > 0
      ? `Te faltan ${f(plan.deficit)} y tus otras cuentas suman ${f(plan.disponible)}: no alcanzan. Reduce algún destino.`
      : `Te faltan ${f(plan.deficit)} y ninguna otra cuenta tiene saldo para completarlos. Reduce algún destino.`;
    msg.classList.add('form-hint--danger');
    detalle.textContent = '';
  }

  return { plan, aplicable: plan.cubre && chk.checked };
}

/** Destino elegido para el remanente, o `null` si todavía no hay decisión. */
function _decisionRemanente(panel) {
  return panel.querySelector('[data-dist-remanente]:checked')?.value ?? null;
}

/**
 * Escribe el bloque de decisión del remanente (MC.13e-2f-2, punto 18 del
 * brief): lo que queda sin asignar exige una respuesta explícita antes de
 * confirmar. La cifra es `sinAsignar` (lo que sobra del cobro), la misma que ya
 * reporta `#distribuir-resumen`, no el presupuesto de Estilo de vida: el
 * usuario decide sobre el dinero que efectivamente le queda suelto.
 *
 * Solo escribe texto y `hidden`, igual que el bloque de déficit: el markup lo
 * genera la vista, que además decide si el bloque existe (sin fila de ahorro ni
 * de meta no hay decisión que pedir).
 *
 * @param {Element} panel
 * @param {number} sinAsignar Salida de `resumirPlanDistribucion`.
 * @returns {boolean} `true` si falta decidir, y por lo tanto "Distribuir" se bloquea.
 */
function _actualizarBloqueRemanente(panel, sinAsignar) {
  const bloque = panel.querySelector('#distribuir-remanente');
  if (!bloque) return false;

  // Sin remanente no hay pregunta que hacer: repartió todo el cobro.
  bloque.hidden = sinAsignar <= 0;
  if (bloque.hidden) return false;

  const montoEl = bloque.querySelector('[data-dist-remanente-monto]');
  if (montoEl) montoEl.textContent = f(sinAsignar);
  return _decisionRemanente(panel) === null;
}

/**
 * Fila del Paso 2 que recibe el remanente según el destino elegido
 * (MC.13e-2f-2). "Ahorro" prefiere el fondo de emergencia y cae al primer
 * apartado si el fondo no está activo; "meta", la primera meta. Devuelve el
 * input de monto, o `null` si esa fila no existe.
 *
 * @param {Element} panel
 * @param {'ahorro'|'meta'} destino
 * @returns {HTMLInputElement|null}
 */
function _filaDestinoRemanente(panel, destino) {
  const porTipo = (tipo) => panel.querySelector(`.distribuir__monto[data-dist-tipo="${tipo}"]`);
  return destino === 'meta'
    ? porTipo('meta')
    : (porTipo('fondo') ?? porTipo('apartado'));
}

/**
 * Aplica la decisión del remanente (MC.13e-2f-2, punto 18).
 *
 * - "Dejarlo en mi cuenta" es la decisión de no mover nada: solo desbloquea
 *   "Distribuir" (lo hace el recálculo, no hay nada que escribir).
 * - "Mandarlo a mi ahorro" / "a una meta" NO abre una ruta de apply nueva:
 *   suma el remanente a la fila que el Paso 2 ya tiene y devuelve al usuario
 *   ahí, que es donde ese aporte se registra desde siempre. Así el destino
 *   queda editable antes de confirmar y el apply sigue siendo uno solo.
 *
 * @param {HTMLInputElement} radio Radio recién marcado.
 */
function _elegirDestinoRemanente(radio) {
  const panel = document.getElementById('distribuir-ingreso-panel');
  if (!panel) return;
  if (radio.value === 'cuenta') { _recalcularDistribucion(); return; }

  const monto       = Number(document.getElementById('distribuir-monto')?.value) || 0;
  const necesidades = _leerNecesidadesMarcadas(panel);
  const items       = [...necesidades, ..._leerItemsDistribucion(panel, necesidades)];
  const { sinAsignar } = resumirPlanDistribucion(monto, items);

  const inp = _filaDestinoRemanente(panel, radio.value);
  if (!inp || sinAsignar <= 0) { _recalcularDistribucion(); return; }

  const fila   = inp.closest('.distribuir__fila');
  const toggle = fila?.querySelector('[data-dist-destino-toggle]');
  if (toggle && !toggle.checked) { toggle.checked = true; inp.disabled = false; }
  inp.value = (Number(inp.value) || 0) + sinAsignar;

  // R3: la fila del fondo sigue la sugerencia automática hasta que alguien la
  // toca. Elegir un destino cuenta como tocarla, tanto si es la que recibe el
  // remanente como si no: sin sacarla del automático, lo que acabamos de sumar
  // a otra fila se lo descontaría a ella y el remanente no bajaría a cero.
  inp.dataset.editado = '1';
  const auto = panel.querySelector('.distribuir__monto[data-dist-auto="1"]');
  if (auto) auto.dataset.editado = '1';

  // Volver al paso de la fila deja el monto a la vista y editable; el propio
  // salto recalcula el resumen (ver `_irAPasoDistribucion`).
  const idxPaso = Number(fila?.closest('[data-dist-paso]')?.dataset.distPaso);
  if (Number.isInteger(idxPaso)) _irAPasoDistribucion(panel, idxPaso);
  inp.focus({ preventScroll: true });
  inp.select();
  _recalcularDistribucion();

  const nombre = (inp.getAttribute('aria-label') ?? '').replace('Monto para ', '');
  announce(`Sumamos ${f(sinAsignar)} a ${nombre}. Ajusta el monto si quieres.`);
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
  const { asignado, sinAsignar, excede, deficit } = resumirPlanDistribucion(monto, items);

  // MC.13e-2e: el déficit no bloquea por sí solo; se puede completar con el
  // saldo de otras cuentas si el usuario lo acepta explícitamente.
  const { aplicable: deficitCubierto } = _actualizarBloqueDeficit(panel, deficit);

  // MC.13e-2f-2: lo que queda sin asignar exige una decisión explícita antes de
  // confirmar (punto 18). No es un error que corregir: es una pregunta pendiente.
  const faltaDecidirRemanente = _actualizarBloqueRemanente(panel, sinAsignar);

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
  const valido    = monto > 0 && (asignado > 0 || transferido > 0)
    && (!excede || deficitCubierto) && !excedeTransferencia && !faltaDecidirRemanente;

  if (resumenEl) {
    // Con déficit, el "qué hacer" vive en el bloque de abajo (completar con
    // otra cuenta o recortar): el resumen solo reporta la cifra, para no dar
    // dos instrucciones distintas a la vez (MC.13e-2e).
    resumenEl.textContent = excede
      ? `Asignaste ${f(asignado)}, ${f(deficit)} más que tu ingreso de ${f(monto)}.`
      : `Asignado: ${f(asignado)}. Queda disponible en tu cuenta: ${f(sinAsignar)}.`;
    resumenEl.classList.toggle('form-hint--danger', excede && !deficitCubierto);
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

  gastoDePagoCompromiso(comp, { monto: item.monto, fecha: hoy(), cuentaId });
  if (item.tipo === 'necesidad-deuda') bajarSaldoDeuda(comp, item.monto);
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
 * Aplica el complemento del déficit (MC.13e-2e): descuenta de cada cuenta lo
 * que `planComplementoDeficit` repartió. Ninguna queda en negativo (el reparto
 * solo toma hasta el saldo de cada una) y la cuenta de origen nunca está en la
 * lista, así que el descuento de aquí y el saldo final de origen no se pisan.
 *
 * @param {Array<{cuentaId:string, monto:number}>} splits
 * @returns {number} Total efectivamente tomado de las otras cuentas.
 */
function _aplicarComplementoDeficit(splits) {
  let total = 0;
  for (const s of splits ?? []) {
    const cuenta = (S.cuentas ?? []).find(c => c.id === s.cuentaId);
    if (!cuenta || s.monto <= 0) continue;
    editar('cuentas', s.cuentaId, { saldo: (cuenta.saldo ?? 0) - s.monto });
    total += s.monto;
  }
  return total;
}

/**
 * Aplica la distribución: acredita el ingreso a la cuenta de origen, descuenta lo
 * que físicamente sale (Necesidades marcadas + metas/apartados/deudas/inversiones
 * seleccionadas; el aporte al fondo no descuenta, ADR 009), registra los pagos
 * de Necesidades (R1), reparte Estilo de vida entre cuentas si corresponde
 * (MC.7e), completa el déficit con otras cuentas si el usuario lo aceptó
 * (MC.13e-2e) y delega el resto a cada dominio por EventBus. Guarda snapshot
 * para undo (incluye 'cuentas': deshacer devuelve también el complemento).
 */
async function _confirmarDistribucion() {
  const panel = document.getElementById('distribuir-ingreso-panel');
  if (!panel) return;

  const monto       = Number(document.getElementById('distribuir-monto')?.value) || 0;
  const necesidades = _leerNecesidadesMarcadas(panel);
  const items       = _leerItemsDistribucion(panel, necesidades);
  const todos       = [...necesidades, ...items];
  const { asignado, sinAsignar, excede, deficit } = resumirPlanDistribucion(monto, todos);

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
  if (monto <= 0 || (asignado <= 0 && transferido <= 0) || excedeTransferencia) return;

  // MC.13e-2e: lo marcado excede el monto a distribuir. Solo se puede confirmar
  // si el usuario aceptó completar la diferencia con otras cuentas.
  const aceptaComplemento = panel.querySelector('[data-dist-completar-deficit]')?.checked === true;
  if (excede && !aceptaComplemento) return;

  // MC.13e-2f-2: con remanente sin decidir no se confirma. El botón ya está
  // deshabilitado; este guard es el mismo cinturón que el del déficit, para
  // quien llegue acá sin pasar por el botón.
  const pideDecision = panel.querySelector('#distribuir-remanente') !== null;
  if (pideDecision && sinAsignar > 0 && _decisionRemanente(panel) === null) return;

  // MC.13e-2f-1: parte de la cuenta que el ingreso principal ya tiene guardada
  // (MC.13d) en vez de preguntar siempre; solo si esa cuenta sigue activa (o es
  // la única). Sin ella, cae al flujo de siempre (`resolverCuenta`).
  const cuentaId = _cuentaOrigenDistribucion()
    ?? await resolverCuenta(S.cuentas ?? [], 'distribuir tu ingreso');
  if (!cuentaId) return; // 0 cuentas (guía) o el usuario canceló.

  // El reparto del complemento se recalcula con la cuenta de origen ya
  // resuelta: mientras el usuario elegía, ella dejó de ser elegible (el dinero
  // no puede salir de la misma cuenta que lo recibe), así que lo que el panel
  // mostró podía contarla. Si con la cuenta real ya no alcanza, no se aplica
  // nada: sobregirar en silencio sería justo lo que esta rebanada evita.
  const complemento = excede
    ? planComplementoDeficit(S.cuentas ?? [], deficit, cuentaId)
    : { splits: [], cubre: false };
  if (excede && !complemento.cubre) {
    announce('Tus otras cuentas no alcanzan para completar lo que marcaste. Ajusta algún destino.');
    return;
  }

  // Snapshot antes de tocar nada, para un "Deshacer" atómico.
  _snapshotDistribucion = _clonarSlices(_SLICES_DISTRIBUCION);

  // Marcar el periodo como distribuido (guard de de-duplicación, MC.4d). El
  // cobro confirmado a mano (MC.13f) entra acá con la misma llave: es lo que
  // hace que un periodo desbloqueado por confirmación no se pueda distribuir
  // dos veces.
  const estado = estadoDistribucion(
    S.ingresos ?? [],
    S.config?.ultimaDistribucionPeriodo ?? null,
    new Date(),
    S.config?.cobroConfirmadoPeriodo ?? null,
  );
  if (estado.periodoISO) {
    if (!S.config) S.config = {};
    S.config.ultimaDistribucionPeriodo = estado.periodoISO;
  }

  // Transferir primero (MC.7e): mueve saldo hacia las otras cuentas y devuelve
  // el total efectivamente movido (excluye no-ops hacia la propia cuenta de
  // origen), para descontarlo junto con lo demás que sale de esa cuenta.
  const totalTransferido = _aplicarTransferenciasCuentas(transferencias, cuentaId);

  // MC.13e-2e: el complemento sale de las otras cuentas y entra a la de origen,
  // que es desde donde se paga todo lo marcado.
  const totalComplemento = _aplicarComplementoDeficit(complemento.splits);

  // Descontar lo que sale de la cuenta (no el fondo, ADR 009) y lo transferido
  // a otras cuentas: ambos dejan la cuenta de origen. El ingreso se acredita.
  const descontable = todos
    .filter(i => i.tipo !== 'fondo')
    .reduce((s, i) => s + i.monto, 0);
  const cuenta = (S.cuentas ?? []).find(c => c.id === cuentaId);
  if (cuenta) {
    editar('cuentas', cuentaId, {
      saldo: (cuenta.saldo ?? 0) + monto + totalComplemento - descontable - totalTransferido,
    });
  }

  // Necesidades (Paso 1, R1): tesorería aplica directo el pago real.
  for (const it of necesidades) _aplicarNecesidad(it, cuentaId);

  // Ahorro, abonos extra a deudas e inversiones: cada dominio aplica su
  // porción con su propia lógica por EventBus (ADN #10).
  EventBus.emit('distribucion:aplicar', { items, cuentaOrigenId: cuentaId });

  updSaldo();
  announce(totalComplemento > 0
    ? `Distribuiste ${f(asignado)}: ${f(monto)} de tu ingreso y ${f(totalComplemento)} del saldo de tus otras cuentas.`
    : `Distribuiste ${f(asignado)} de tu ingreso.`);

  // Confirmar cierra el modal (ADR 035 D6): ya no queda nada por hacer en el
  // asistente. El snackbar "Deshacer" vive en <body>, sobrevive el cierre.
  const overlay = document.getElementById('modal-distribuir');
  if (overlay) cerrarModal(overlay);

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
  // Nombre heredado de cuando el panel era un toggle inline; ahora abre el
  // modal (ADR 035 D6), pero se conserva para no repintar cada test/caller
  // que ya lo usa como "el botón que lanza el asistente".
  registrarAccion('toggle-distribuir-ingreso', () => abrirAsistenteDistribucion());
  registrarAccion('distribuir-paso-siguiente', _pasoDistribucionSiguiente);
  registrarAccion('distribuir-paso-atras',     _pasoDistribucionAtras);
  registrarAccion('confirmar-distribucion',    _confirmarDistribucion);
  registrarAccion('deshacer-distribucion',     _deshacerDistribucion);
  registrarAccion('distribuir-desde-inicio',   _distribuirDesdeInicio);
  registrarAccion('confirmar-cobro-recibido',  _confirmarCobroRecibido);

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
    } else if (t.hasAttribute('data-dist-completar-deficit')) {
      // MC.13e-2e: aceptar (o retirar) el complemento del déficit habilita o
      // vuelve a bloquear "Distribuir", y cambia el detalle de dónde sale.
      _recalcularDistribucion();
    } else if (t.hasAttribute('data-dist-remanente')) {
      // MC.13e-2f-2: elegir destino para lo que sobra desbloquea "Distribuir" y,
      // si no es "dejarlo en la cuenta", prellena la fila del Paso 2.
      _elegirDestinoRemanente(t);
    } else if (t.hasAttribute('data-nec-toggle')) {
      // Necesidades (Paso 1, R1): sin monto editable que habilitar/deshabilitar,
      // solo recalcular el resumen en vivo.
      _recalcularDistribucion();
    }
  });
}
