/**
 * agenda/index.js - API pública del dominio Agenda.
 *
 * Responsabilidades:
 * - Registrar acciones data-action (navegación mes anterior/siguiente).
 * - Re-renderizar cuando cambia S.compromisos o el usuario llega al hash.
 * - Coordinar logic.js + view.js sin generar HTML ni hacer cálculos aquí.
 *
 * Crear/editar/eliminar un gasto fijo y el pago en lote son de `compromisos/`
 * (ficha 05 de la auditoría móvil, ADR 069): Agenda ya no es su dueña, aunque
 * el modal `#modal-gasto-fijo` y el botón "Editar"/"Eliminar" del detalle del
 * día lo sigan abriendo (mismo patrón que "Abonar" con una deuda: la acción
 * está registrada por `compromisos/index.js`, el botón vive acá).
 *
 * Marcar pagado este mes (el único trigger de pago que sigue siendo de
 * Agenda, por depender del mes VISIBLE del calendario, BUG-015):
 * - Usa resolverPagoConSelector. Con varias cuentas muestra el selector de
 *   tarjetas para elegir la cuenta preferida y solo abre el reparto si no
 *   alcanza (reparto-fallback, sin dejar negativos); con una sola cuenta no
 *   pregunta. Registra un gasto por cada cuenta usada, vinculado al
 *   compromiso vía compromisoId, para que el badge "Ya pagaste este mes"
 *   aparezca automáticamente en el calendario.
 */

import { S, EventBus } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { editar } from '../../infra/crud.js';
import { fechaPagoDelMes, aplicarPagosCompromisos } from '../../infra/pago-compromiso.js';
import { ingresoPuntualDeCreditoAutomatico } from '../../infra/credito-ingreso.js';
import { renderSmart, updSaldo, programarRender } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import { hoy, f } from '../../infra/utils.js';
import { confirmar } from '../../ui/confirm.js';
import { resolverPagoConSelector } from '../../infra/cuenta-helper.js';
import { renderBannerProposito } from '../../ui/proposito.js';
import { debitosAutomaticosVencidos, creditosAutomaticosVencidos } from './logic.js';
import { renderAgenda, renderFormAutomaticos, navegarMes, mostrarDia, marcarEntradaSeccion, resumenMesVisible, diaSeleccionado } from './view.js';

// ── HANDLERS DE NAVEGACIÓN ───────────────────────────────────────

/**
 * DIS.11 V-1/V-4: `renderAgenda()` reemplaza el innerHTML entero de
 * `#panel-agenda`, así que el control que el usuario acababa de activar deja
 * de existir y el foco cae al body. Tras cada repintado se devuelve el foco a
 * su equivalente en el DOM nuevo. No-op si el selector no existe (los tests
 * unitarios repintan sin haber tocado nada).
 * @param {string} selector
 */
function _devolverFoco(selector) {
  document.querySelector(`#panel-agenda ${selector}`)?.focus();
}

function _prevMes() {
  navegarMes(-1);
  renderAgenda();
  _devolverFoco('[data-action="agenda-prev-mes"]');
  announce(resumenMesVisible());
}

function _nextMes() {
  navegarMes(+1);
  renderAgenda();
  _devolverFoco('[data-action="agenda-next-mes"]');
  announce(resumenMesVisible());
}

function _mostrarDia(el) {
  const dia = parseInt(el?.dataset?.day, 10);
  if (!Number.isInteger(dia)) return;
  mostrarDia(dia);
  renderAgenda();
  // Día abierto: el foco va al título del panel (lo trae a pantalla y lo
  // anuncia). Día cerrado (toggle): vuelve a la celda que lo cerró.
  _devolverFoco(diaSeleccionado() === dia
    ? '.cal-detail__title'
    : `[data-action="agenda-mostrar-dia"][data-day="${dia}"]`);
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

  const fechaPago = fechaPagoDelMes(comp, prefijo);
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

  aplicarPagosCompromisos([{ comp, fecha: fechaPago, partes: splits }]);

  renderAgenda();
  updSaldo();
  announce(`Pago de ${f(monto)} registrado para "${comp.descripcion}".`);
}

// ── HANDLERS: PAGOS AUTOMÁTICOS (PA.1a, ADR 052) ────────────────

/**
 * Los débitos automáticos vencidos, resueltos contra las cuentas de S: cuál
 * paga cada uno y si alcanza el saldo.
 *
 * El saldo se consume **en cascada y en orden de vencimiento**: si la misma
 * cuenta debe cubrir tres débitos, el tercero se bloquea cuando el dinero se
 * acabó en los dos primeros. Sumar cada uno contra el saldo completo diría que
 * los tres caben y el banco solo pudo cobrar dos.
 *
 * Motivos de bloqueo (la fila los explica, nunca se ocultan):
 *   - `'cuenta'`: el compromiso no dice de qué cuenta sale, o esa cuenta ya no
 *     existe o está inactiva. Registrarlo obligaría a elegir por el usuario.
 *   - `'saldo'`: la cuenta no alcanza. Finko no simula un débito que el banco
 *     no pudo hacer (ADR 052 D2).
 *
 * @returns {Array<{id:string, descripcion:string, monto:number, fecha:string,
 *   tipo:string, cuentaDebitoId:string|null, cuentaNombre:string|null,
 *   bloqueo:'cuenta'|'saldo'|null, falta:number}>}
 */
function _debitosPendientes() {
  const vencidos = debitosAutomaticosVencidos(S.compromisos ?? [], S.gastos ?? [], hoy());
  if (vencidos.length === 0) return [];

  /** @type {Map<string, number>} Saldo que le va quedando a cada cuenta. */
  const restante = new Map();
  for (const c of S.cuentas ?? []) {
    if (c?.activa !== false) restante.set(c.id, Number(c.saldo) || 0);
  }

  return vencidos.map((v) => {
    const cuenta = (S.cuentas ?? []).find(c => c.id === v.cuentaDebitoId && c.activa !== false);
    if (!cuenta) {
      return { ...v, cuentaNombre: null, bloqueo: 'cuenta', falta: 0 };
    }

    const disponible = restante.get(cuenta.id) ?? 0;
    if (disponible < v.monto) {
      return { ...v, cuentaNombre: cuenta.nombre, bloqueo: 'saldo', falta: v.monto - disponible };
    }

    restante.set(cuenta.id, disponible - v.monto);
    return { ...v, cuentaNombre: cuenta.nombre, bloqueo: null, falta: 0 };
  });
}

/**
 * Los créditos automáticos vencidos, resueltos contra las cuentas de S (PA.1b,
 * ADR 052 D2/D3): mismo criterio que `_debitosPendientes` visto desde el otro
 * lado, sin cascada de saldo porque abonar dinero nunca puede "no alcanzar".
 *
 * Único motivo de bloqueo: `'cuenta'`, el ingreso no dice a qué cuenta llega,
 * o esa cuenta ya no existe o está inactiva.
 *
 * @returns {Array<{id:string, descripcion:string, monto:number, fecha:string,
 *   tipo:'ingreso', cuentaId:string|null, cuentaNombre:string|null,
 *   bloqueo:'cuenta'|null, falta:number}>}
 */
function _creditosPendientes() {
  const vencidos = creditosAutomaticosVencidos(S.ingresos ?? [], S.ingresosPuntuales ?? [], hoy());

  return vencidos.map((v) => {
    const cuenta = (S.cuentas ?? []).find(c => c.id === v.cuentaId && c.activa !== false);
    return cuenta
      ? { ...v, cuentaNombre: cuenta.nombre, bloqueo: null, falta: 0 }
      : { ...v, cuentaNombre: null, bloqueo: 'cuenta', falta: 0 };
  });
}

/**
 * Débitos y créditos automáticos vencidos, combinados para la hoja "Pagos
 * automáticos" (PA.1b une lo que PA.1a dejó solo del lado del débito). Se
 * distinguen por `tipo`: `'ingreso'` es siempre un crédito, cualquier otro
 * valor (`'fijo'`, `'deuda-entidad'`, `'deuda-personal'`) es un débito.
 */
function _automaticosPendientes() {
  return [..._debitosPendientes(), ..._creditosPendientes()];
}

/**
 * Abre la hoja de pagos automáticos si hay algo que confirmar: débitos de
 * compromisos (PA.1a) y créditos de ingreso fijo (PA.1b), la misma hoja para
 * los dos lados (ADR 052 D3). El nombre quedó del alcance original (PA.1a);
 * renombrarlo no cambia el contrato que ya consume `bootstrap.js`. La llama al
 * arrancar, detrás de los gates (ADR 052 D1).
 *
 * No se apila sobre otro overlay abierto (candado, aceptación legal, novedades):
 * dos diálogos modales se pelean el foco. Si hay uno, la hoja espera a la
 * siguiente apertura, y no se pierde nada porque no había nada escrito.
 */
export function revisarDebitosAutomaticos() {
  const overlay = document.getElementById('modal-automaticos');
  const body    = document.getElementById('modal-automaticos-body');
  if (!overlay || !body) return;
  if (document.querySelector('.modal-overlay[aria-hidden="false"]')) return;

  const items = _automaticosPendientes();
  if (items.length === 0) return;

  body.innerHTML = renderFormAutomaticos(items);
  _actualizarTotalAutomaticos();
  abrirModal(overlay);
}

/**
 * Recalcula el total y el texto del botón de la hoja según lo que quede
 * marcado. Mismo criterio que `_actualizarTotalLote`: solo toca los nodos del
 * resumen, repintar el cuerpo desmarcaría las casillas del usuario.
 */
function _actualizarTotalAutomaticos() {
  const body = document.getElementById('modal-automaticos-body');
  if (!body) return;

  const marcados = [...body.querySelectorAll('.lote-row__check:checked')];
  const total    = marcados.reduce((acc, ch) => acc + (Number(ch.dataset.loteMonto) || 0), 0);

  const totalEl = body.querySelector('[data-role="auto-total"]');
  if (totalEl) {
    totalEl.textContent = marcados.length === 0
      ? 'Selecciona al menos un movimiento.'
      : `Total a mover: ${f(total)}`;
    totalEl.classList.toggle('lote-total--vacio', marcados.length === 0);
  }

  const textoEl = body.querySelector('[data-role="auto-cta-texto"]');
  if (textoEl) {
    textoEl.textContent = marcados.length === 1 ? 'Confirmar 1 movimiento' : `Confirmar ${marcados.length} movimientos`;
  }

  const btn = body.querySelector('[data-action="agenda-confirmar-automaticos"]');
  if (btn) btn.disabled = marcados.length === 0;
}

/**
 * Registra los créditos automáticos confirmados: un ingreso puntual vinculado
 * por cuenta (mismo criterio de batching que `aplicarPagosCompromisos`, un
 * solo `editar` de saldo por cuenta al final) más el abono de esa cuenta.
 *
 * @param {Array<{ing:import('../../core/state.js').Ingreso, fecha:string,
 *   monto:number, cuentaId:string|null}>} cobros
 */
function _registrarCobrosIngresos(cobros) {
  /** @type {Map<string, number>} Total a abonar por cuenta. */
  const porCuenta = new Map();

  for (const { ing, fecha, monto, cuentaId } of cobros) {
    ingresoPuntualDeCreditoAutomatico(ing, { monto, fecha, cuentaId });
    if (cuentaId) porCuenta.set(cuentaId, (porCuenta.get(cuentaId) ?? 0) + monto);
  }

  for (const [cuentaId, total] of porCuenta) {
    const cuenta = S.cuentas.find(x => x.id === cuentaId);
    if (cuenta) editar('cuentas', cuentaId, { saldo: (cuenta.saldo ?? 0) + total });
  }
}

/**
 * Registra los débitos y créditos automáticos que el usuario confirmó (PA.1a +
 * PA.1b, misma hoja).
 *
 * A diferencia del lote, **no pregunta de qué cuenta sale ni a cuál llega**:
 * eso es lo que el usuario ya declaró al marcar el compromiso o el ingreso
 * como automático, y volver a preguntarlo anularía el sentido de la hoja. Por
 * lo mismo no hay reparto entre cuentas ni confirmación de sobregiro: lo que
 * no alcanza (débito) o no tiene cuenta (crédito) llega bloqueado desde
 * `_automaticosPendientes` y no se puede marcar.
 *
 * Cada movimiento se fecha con su vencimiento real (el 5, no hoy) y el ajuste
 * de la cuenta ocurre ahora, mismo criterio que `_marcarPagadoGastoFijo`: el
 * saldo de una cuenta es un valor de hoy, no un histórico.
 */
function _confirmarAutomaticos() {
  const body = document.getElementById('modal-automaticos-body');
  if (!body) return;

  const marcados = [...body.querySelectorAll('.lote-row__check:checked')]
    .map(ch => `${ch.dataset.autoId}|${ch.dataset.autoFecha}`);
  if (marcados.length === 0) return;

  const overlay = document.getElementById('modal-automaticos');
  if (overlay) cerrarModal(overlay);

  // La fuente de verdad es S, no el DOM con el que se pintó la hoja: entre
  // abrirla y confirmar, el usuario pudo registrar uno desde otra pestaña.
  const items = _automaticosPendientes()
    .filter(it => !it.bloqueo && marcados.includes(`${it.id}|${it.fecha}`));
  if (items.length === 0) {
    announce('No quedan movimientos automáticos por confirmar.');
    return;
  }

  const pagos = [];
  const cobros = [];
  for (const it of items) {
    if (it.tipo === 'ingreso') {
      const ing = S.ingresos.find(i => i.id === it.id);
      if (!ing) continue;
      cobros.push({ ing, fecha: it.fecha, monto: it.monto, cuentaId: it.cuentaId });
      continue;
    }
    const comp = S.compromisos.find(c => c.id === it.id);
    if (!comp) continue;
    pagos.push({ comp, fecha: it.fecha, partes: [{ cuentaId: it.cuentaDebitoId, monto: it.monto }] });
  }
  if (pagos.length === 0 && cobros.length === 0) return;

  if (pagos.length > 0) aplicarPagosCompromisos(pagos);
  if (cobros.length > 0) _registrarCobrosIngresos(cobros);

  const total = pagos.reduce((acc, p) => acc + p.partes[0].monto, 0)
    + cobros.reduce((acc, c) => acc + c.monto, 0);
  const cantidad = pagos.length + cobros.length;
  renderAgenda();
  updSaldo();
  announce(cantidad === 1
    ? `1 movimiento automático confirmado por ${f(total)}.`
    : `${cantidad} movimientos automáticos confirmados por ${f(total)}.`);
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
 * Render reactivo del calendario, con identidad estable para el coalescer de
 * PERF.6: observa 4 secciones y un lote de pagos emite `compromisos` y `gastos`
 * varias veces dentro del mismo tick.
 */
function _renderReactivo() {
  renderBannerProposito('agenda', S.compromisos.length > 0);
  renderSmart(renderAgenda, 'agenda');
}

// ── INIT ─────────────────────────────────────────────────────────

export function initAgenda() {
  registrarAccion('agenda-prev-mes',          _prevMes);
  registrarAccion('agenda-next-mes',          _nextMes);
  registrarAccion('agenda-mostrar-dia',       _mostrarDia);
  registrarAccion('agenda-marcar-pagado-fijo', _marcarPagadoGastoFijo);
  registrarAccion('agenda-distribuir-ingreso', _distribuirDesdeAgenda);
  registrarAccion('agenda-confirmar-automaticos', _confirmarAutomaticos);

  // PA.1a: contenedor persistente, cuerpo re-inyectado en cada apertura.
  document.getElementById('modal-automaticos-body')
    ?.addEventListener('change', (e) => {
      if (e.target.classList?.contains('lote-row__check')) _actualizarTotalAutomaticos();
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

  // ADR 021: el calendario también muestra los días de ingreso, así que un
  // cambio en S.ingresos (alta, edición de diaPago, baja) debe re-renderizar.
  // CAL.4a: el hero (pagado del mes) y los badges de estado de pago leen
  // S.gastos, así que un abono o pago registrado/eliminado desde otra
  // sección también refresca (renderSmart solo pinta si la sección está
  // visible; con el calendario cerrado no cuesta nada).
  EventBus.on('state:change', ({ section }) => {
    // MT.6d: el plan de aportes de una meta (generado/regenerado por Metas)
    // también se pinta acá, así que un cambio de metas repinta el calendario.
    if (section === 'compromisos' || section === 'ingresos' || section === 'gastos' || section === 'metas') {
      programarRender(_renderReactivo);
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
