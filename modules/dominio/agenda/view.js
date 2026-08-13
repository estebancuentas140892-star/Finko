/**
 * agenda/view.js - render del dominio Agenda (calendario mensual).
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (delega a logic.js).
 *
 * Estado local de la vista:
 *   _viewYear / _viewMonth identifican el mes actualmente visualizado.
 *   _diaSeleccionado     identifica el día con detalle expandido (o null).
 *   Mutado solo por navegarMes(), resetearVistaAlMesActual() y mostrarDia().
 *   _entradaInicialPendiente (CAL.3) arma el auto-selección de "hoy" en el
 *   próximo renderAgenda(); solo lo activa marcarEntradaSeccion(), llamada
 *   por index.js al entrar a la sección (nunca por un renderAgenda() suelto).
 */

import { S } from '../../core/state.js';
import { f, esc as _esc, hoy } from '../../infra/utils.js';
import { icon, tejaCategoria } from '../../infra/icons.js';
import { resolverMarca, tejaMarca } from '../../infra/marcas.js';
import { FRECUENCIAS, CATEGORIAS_AGENDA, CATEGORIA_INGRESO_ICONO, ICONOS_CATEGORIA_PERSONALIZADA, iconoDeCategoriaGasto } from '../../core/constants.js';
import { renderIconoPicker } from '../../infra/icon-picker.js';
import { renderBloqueDebitoAutomatico } from '../../infra/cuenta-helper.js';
import { SALDO_MASCARA, SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { LABEL_TIPO, ICONO_TIPO, calcularAbonosDelMes, estadoPagoMes } from '../compromisos/logic.js';
import { eventosDelMes, eventosIngresosDelMes, eventosMetasDelMes, totalEventosDelMes, totalDia, tiposPresentesEnMes, totalesDelMes, pendientesDePagoDelMes } from './logic.js';

// ── ESTADO LOCAL ─────────────────────────────────────────────────

let _viewYear         = null;
let _viewMonth        = null;
let _diaSeleccionado  = null;
let _entradaInicialPendiente = false;

const MONTHS = [
  'Enero',     'Febrero', 'Marzo',   'Abril',
  'Mayo',      'Junio',   'Julio',   'Agosto',
  'Septiembre','Octubre', 'Noviembre','Diciembre',
];

const DOW_LARGO = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles',
  'Jueves', 'Viernes', 'Sábado',
];

function _ensureFecha() {
  if (_viewYear === null || _viewMonth === null) {
    const hoy = new Date();
    _viewYear  = hoy.getFullYear();
    _viewMonth = hoy.getMonth();
  }
}

/**
 * Mueve el mes visualizado en N (positivo o negativo). Wrappa años.
 * No re-renderiza; el caller debe llamar `renderAgenda()` después.
 * @param {number} delta
 */
export function navegarMes(delta) {
  _ensureFecha();
  let m = _viewMonth + delta;
  let y = _viewYear;
  while (m < 0)  { m += 12; y -= 1; }
  while (m > 11) { m -= 12; y += 1; }
  _viewYear         = y;
  _viewMonth        = m;
  _diaSeleccionado  = null;
}

/** Lleva la vista al mes actual real (botón "hoy" futuro o test setup). */
export function resetearVistaAlMesActual() {
  const hoy = new Date();
  _viewYear         = hoy.getFullYear();
  _viewMonth        = hoy.getMonth();
  _diaSeleccionado  = null;
}

/**
 * Selecciona el día `dia` para mostrar su detalle, o lo cierra si ya está
 * seleccionado (toggle). No-op si `dia` no es un entero válido.
 * El caller debe llamar `renderAgenda()` después.
 * @param {number} dia
 */
export function mostrarDia(dia) {
  if (!Number.isInteger(dia)) return;
  _diaSeleccionado = (_diaSeleccionado === dia) ? null : dia;
}

/**
 * CAL.3: marca que el usuario acaba de navegar hacia la sección desde otra
 * (no una carga inicial de la app directo en #agenda: agenda/index.js solo
 * la llama en el listener de `hashchange`, no en el render de arranque).
 * El próximo `renderAgenda()` intenta auto-seleccionar el día de hoy si
 * tiene compromisos/ingresos y no hay ningún día ya seleccionado; se
 * consume una sola vez, así que navegar entre meses/días dentro de la
 * sección o un re-render por cambio de datos no vuelve a forzar la
 * selección.
 * Debe llamarla el caller (agenda/index.js) antes de renderAgenda(), nunca
 * el propio renderAgenda(): así los tests que llaman renderAgenda()
 * directo no disparan el auto-select por accidente.
 */
export function marcarEntradaSeccion() {
  _entradaInicialPendiente = true;
}

// ── RENDER PRINCIPAL ─────────────────────────────────────────────

/**
 * Renderiza la vista calendario en `#panel-agenda`.
 * No-op si el contenedor no existe.
 */
export function renderAgenda() {
  const el = document.getElementById('panel-agenda');
  if (!el) return;

  _ensureFecha();

  const compromisos = Array.isArray(S.compromisos) ? S.compromisos : [];
  const eventosComp = eventosDelMes(compromisos, _viewYear, _viewMonth);

  // ADR 021: los días de pago de los ingresos activos también son eventos
  // (recordatorio de apartar para los objetivos). Se mergean por día, con el
  // ingreso primero: es el "dinero que entra" del día.
  const ingresos    = Array.isArray(S.ingresos) ? S.ingresos : [];
  const eventosIng  = eventosIngresosDelMes(ingresos, _viewYear, _viewMonth);

  // MT.6d (ADR 048 D3): el plan de aportes de cada meta activa, ya generado y
  // guardado por Metas (MT.6c). Igual que el ingreso, es recordatorio, no
  // pago: entra al mismo mapa mergeado para compartir grilla, detalle del
  // día y leyenda, pero `totalDia`/`totalesDelMes` lo excluyen de la suma.
  const metas       = Array.isArray(S.metas) ? S.metas : [];
  const eventosMeta = eventosMetasDelMes(metas, _viewYear, _viewMonth);

  /** @type {Record<number, any[]>} */
  const eventos = {};
  for (const [d, evs] of Object.entries(eventosIng)) eventos[d] = [...evs];
  for (const [d, evs] of Object.entries(eventosMeta)) {
    eventos[d] = eventos[d] ? [...eventos[d], ...evs] : [...evs];
  }
  for (const [d, evs] of Object.entries(eventosComp)) {
    eventos[d] = eventos[d] ? [...eventos[d], ...evs] : [...evs];
  }

  // CAL.3: al entrar a la sección, si hoy tiene compromisos/ingresos y no
  // hay ningún día ya seleccionado, cargar su detalle automáticamente. Solo
  // se dispara si `marcarEntradaSeccion()` armó el flag (ver su doc); un
  // renderAgenda() disparado por navegar meses/días o por state:change no
  // lo activa, así que no pisa lo que el usuario ya tenía abierto.
  if (_entradaInicialPendiente) {
    _entradaInicialPendiente = false;
    const hoy = new Date();
    const esMesVisibleHoy = _viewYear === hoy.getFullYear() && _viewMonth === hoy.getMonth();
    if (esMesVisibleHoy && _diaSeleccionado === null && eventos[hoy.getDate()]?.length > 0) {
      _diaSeleccionado = hoy.getDate();
    }
  }

  // Si el día seleccionado se quedó sin eventos (ej. se eliminó el
  // compromiso desde otra sección, o el usuario seleccionó a propósito un
  // día vacío), `_renderDetalleDia` muestra un estado vacío explícito en
  // vez de cerrarse solo (CAL.3).
  const detalleHtml = _diaSeleccionado !== null
    ? _renderDetalleDia(eventos[_diaSeleccionado] ?? [], _viewYear, _viewMonth, _diaSeleccionado)
    : '';

  // DIS.11 C1/V-3 (revisa AG.6): la leyenda pasa a pie de la tarjeta del
  // calendario (dentro de .cal-card, sin sticky) y el detalle del día queda
  // inmediatamente después de la tarjeta: nace pegado al mes que lo abrió y
  // 78px más arriba, que es el presupuesto vertical que le faltaba.
  // CAL.4a (ADR 037 D1): el hero del mes encabeza la sección con el total a
  // pagar y el progreso pagado/falta del mes visible.
  const prefijoMes = `${_viewYear}-${String(_viewMonth + 1).padStart(2, '0')}`;

  // CAL.4b (ADR 037 D6): mes sin ningún evento → card de guía a la acción
  // bajo el calendario. La grilla sigue visible (se puede navegar) y los
  // días vacíos siguen clickeables (CAL.3 intacta).
  const emptyMesHtml = totalEventosDelMes(eventos) === 0
    ? _renderEmptyMes(_viewMonth)
    : '';

  // CAL.5a: gastos fijos ya vencidos y sin pagar del mes visible. Con dos o
  // más, se ofrece pagarlos en un solo movimiento (ver `_renderLoteCard`).
  const gastosS   = Array.isArray(S.gastos) ? S.gastos : [];
  const pendientes = pendientesDePagoDelMes(eventos, gastosS, prefijoMes, hoy());

  // DIS.11 C2/V-5: cuántos pagos vencidos y sin registrar tiene cada día. Se
  // reusa `pendientes` (ya calculado para la tarjeta de lote), no se
  // recalcula nada: la grilla y la tarjeta cuentan lo mismo.
  /** @type {Record<number, number>} */
  const vencidosPorDia = {};
  for (const p of pendientes) {
    vencidosPorDia[p.dia] = (vencidosPorDia[p.dia] ?? 0) + 1;
  }

  el.innerHTML = `
    ${_renderHeroMes(eventos, _viewYear, _viewMonth, prefijoMes)}
    ${_renderLoteCard(pendientes, prefijoMes)}
    <article class="cal-card">
      ${_renderCabecera(_viewYear, _viewMonth, eventosComp, eventosIng, eventosMeta)}
      ${_renderDiasSemana()}
      ${_renderGrid(_viewYear, _viewMonth, eventos, vencidosPorDia)}
      ${_renderLeyenda(eventos)}
    </article>
    ${detalleHtml}
    ${emptyMesHtml}`;
}

/**
 * Resumen hablado del mes visible, para `announce()` tras repintar
 * (DIS.11 V-4, regla "repintar también se anuncia"): "Julio 2026, 9
 * compromisos y 1 ingreso". Recorre los mismos mapas de eventos que
 * `renderAgenda()`; index.js no conoce `_viewYear`/`_viewMonth`, que son
 * privados de la vista.
 * @returns {string}
 */
export function resumenMesVisible() {
  _ensureFecha();
  const compromisos = Array.isArray(S.compromisos) ? S.compromisos : [];
  const ingresos    = Array.isArray(S.ingresos) ? S.ingresos : [];
  const metas       = Array.isArray(S.metas) ? S.metas : [];
  const nComp = totalEventosDelMes(eventosDelMes(compromisos, _viewYear, _viewMonth));
  const nIng  = totalEventosDelMes(eventosIngresosDelMes(ingresos, _viewYear, _viewMonth));
  const nMeta = totalEventosDelMes(eventosMetasDelMes(metas, _viewYear, _viewMonth));

  const partes = [
    nComp === 0 ? 'sin compromisos'
      : nComp === 1 ? '1 compromiso'
      : `${nComp} compromisos`,
  ];
  if (nIng > 0)  partes.push(nIng === 1 ? '1 ingreso' : `${nIng} ingresos`);
  if (nMeta > 0) partes.push(nMeta === 1 ? '1 aporte a meta' : `${nMeta} aportes a metas`);

  return `${MONTHS[_viewMonth]} ${_viewYear}, ${partes.join(' y ')}`;
}

/**
 * Día con detalle abierto, o `null`. Lo consulta agenda/index.js después de
 * repintar para decidir a dónde va el foco (DIS.11 V-1): al título del panel
 * si el día se abrió, de vuelta a la celda si se cerró.
 * @returns {number|null}
 */
export function diaSeleccionado() {
  return _diaSeleccionado;
}

// ── PARTES ───────────────────────────────────────────────────────

/**
 * Hero del mes (CAL.4a, ADR 037 D1/D7): total a pagar del mes visible +
 * barra de progreso pagado/falta + ojo de privacidad. Cuarto consumidor del
 * estreno parcial del ADR 033 (degradado de identidad + sombra en reposo),
 * espejo de renderHeroCompromisos() (D.16a).
 *
 * - Enmascarado con `SALDO_MASCARA`/`SALDO_MASCARA_CUENTA` cuando
 *   `S.config.ocultarSaldo` es true (mismo flag que el ojo de Inicio, Mis
 *   cuentas y Deudas: un solo control, IN.2).
 * - Mes sin pagos programados pero con algún evento (ej. solo ingresos):
 *   variante de guía sin cifra, sin barra y sin ojo (nada que enmascarar,
 *   disciplina ADR 034/035).
 * - Mes sin ningún evento (DIS.11 C8/V-8): no se renderiza. La card
 *   `.cal-empty` ya dice lo mismo y con el banner de propósito arriba eran
 *   tres bloques con un solo mensaje.
 * - La barra es decorativa (`aria-hidden`); los montos en texto portan la
 *   información (SC 1.4.11).
 *
 * @param {Record<number, any[]>} eventos Mapa día → eventos ya mergeado.
 * @param {number} year
 * @param {number} month 0-indexed.
 * @param {string} prefijoMes 'YYYY-MM' del mes visible.
 * @returns {string}
 */
function _renderHeroMes(eventos, year, month, prefijoMes) {
  const gastos = Array.isArray(S.gastos) ? S.gastos : [];
  const { total, pagado } = totalesDelMes(eventos, gastos, prefijoMes);
  const oculto = S.config?.ocultarSaldo === true;

  if (total <= 0) {
    // DIS.11 C8/V-8: mes completamente vacío → guía una sola vez, en la card.
    if (totalEventosDelMes(eventos) === 0) return '';
    return `
      <div class="hero-agenda">
        <p class="hero-agenda__label">${MONTHS[month]} ${year}</p>
        <p class="hero-agenda__titulo">Sin pagos programados</p>
        <p class="hero-agenda__guia">Cuando agregues un gasto fijo o una deuda con fecha, aparecerán aquí y en el mes.</p>
      </div>`;
  }

  const falta = Math.max(0, total - pagado);
  const pct   = Math.max(0, Math.min(100, Math.round((pagado / total) * 100)));

  const totalTxt  = oculto ? SALDO_MASCARA : f(total);
  const pagadoTxt = oculto ? SALDO_MASCARA_CUENTA : f(pagado);
  const faltaTxt  = oculto ? SALDO_MASCARA_CUENTA : f(falta);

  return `
    <div class="hero-agenda">
      <button class="hero-agenda__ojo" type="button" id="agenda-saldo-ojo"
              data-action="agenda-saldo-visibilidad"
              aria-pressed="${oculto}"
              aria-label="${oculto ? 'Mostrar tus saldos' : 'Ocultar tus saldos'}">
        <svg class="icon" aria-hidden="true"><use href="#i-eye${oculto ? '-off' : ''}"/></svg>
      </button>
      <p class="hero-agenda__label">Compromisos de ${MONTHS[month].toLowerCase()}</p>
      <p class="hero-agenda__valor">${totalTxt}</p>
      <div class="hero-agenda__barra" aria-hidden="true">
        <div class="hero-agenda__barra-fill" style="width:${pct}%"></div>
      </div>
      <div class="hero-agenda__meta">
        <span class="hero-agenda__pagado">Pagado ${pagadoTxt}</span>
        <span class="hero-agenda__falta">Falta ${faltaTxt}</span>
      </div>
    </div>`;
}

// ── PAGO EN LOTE (CAL.5a) ────────────────────────────────────────

/**
 * Tarjeta "paga de una vez lo que ya venció" bajo el hero del mes.
 *
 * Solo aparece con **dos o más** pendientes: con uno solo el lote no ahorra
 * nada (el CTA "Marcar pagado" del detalle del día ya resuelve ese caso) y la
 * tarjeta sería ruido que compite con el hero.
 *
 * DIS.11 C5/V-7: la tarjeta dice **cuánto** suma antes de abrir el flujo (una
 * tarjeta que propone mover dinero muestra el monto antes, no dentro). El
 * total no se enmascara con el ojo de privacidad: no es un saldo, es el precio
 * de la acción que se está ofreciendo, mismo criterio que los montos del modal.
 * La descripción se queda con la lista de nombres; el "eligiendo la cuenta una
 * sola vez" ya lo explica el modal.
 *
 * @param {Array<{id:string, descripcion:string, monto:number, dia:number,
 *   tipo:string, parcial:boolean}>} pendientes
 * @param {string} prefijoMes 'YYYY-MM' del mes visible (viaja al handler, que
 *   no conoce `_viewYear`/`_viewMonth`, mismo patrón que BUG-015).
 * @returns {string}
 */
function _renderLoteCard(pendientes, prefijoMes) {
  if (!Array.isArray(pendientes) || pendientes.length < 2) return '';

  const n       = pendientes.length;
  const nombres = pendientes.slice(0, 2).map(p => _esc(p.descripcion || 'Sin nombre'));
  const resto   = n - nombres.length;
  const lista   = resto > 0
    ? `${nombres.join(', ')} y ${resto} más`
    : nombres.join(' y ');
  const total   = pendientes.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);

  return `
    <section class="cal-lote" aria-label="Pagos pendientes del mes">
      <div class="cal-lote__body">
        <p class="cal-lote__title">${n} pagos ya vencieron</p>
        <p class="cal-lote__monto">${f(total)}</p>
        <p class="cal-lote__desc">${lista}.</p>
      </div>
      <button type="button" class="cal-lote__cta"
              data-action="agenda-pagar-lote" data-mes="${_esc(prefijoMes)}"
              aria-label="Pagar juntos los ${n} pagos vencidos">
        Pagar los ${n}
      </button>
    </section>`;
}

/**
 * Subtítulo de una fila del lote: qué es lo que se va a registrar, no solo
 * cuándo vencía. Un fijo se paga entero; una deuda puede traer el resto de la
 * cuota (ya tenía un abono este mes) o el resto del saldo (última cuota).
 *
 * @param {{dia:number, tipo:string, parcial:boolean}} p
 * @returns {string}
 */
function _subFilaLote(p) {
  const cuando = `vencía el ${p.dia}`;
  if (p.tipo !== 'deuda-entidad' && p.tipo !== 'deuda-personal') {
    return `Vencía el ${p.dia}`;
  }
  return p.parcial ? `Resto de la cuota, ${cuando}` : `Cuota de la deuda, ${cuando}`;
}

/**
 * Cuerpo del modal de pago en lote: una fila por pendiente, todas marcadas
 * (la tarjeta prometió "los N"; desmarcar es la excepción, no la regla) y el
 * total en vivo que el handler recalcula al desmarcar.
 *
 * Los montos SÍ se muestran aunque el ojo esté activo: el usuario está por
 * mover ese dinero y ocultarle cuánto sería peligroso, no privado. El mismo
 * criterio con que los formularios de gasto nunca enmascaran lo que se escribe.
 *
 * CAL.5b: el lote también trae deudas, y una deuda no siempre pide la cuota
 * completa (puede quedar el resto de un abono previo, o el resto del saldo).
 * La fila lo dice en su subtítulo en vez de mostrar una cifra sin explicar, y
 * el intro avisa que un abono baja el saldo de la deuda: es un movimiento con
 * más consecuencias que pagar un fijo.
 *
 * @param {Array<{id:string, descripcion:string, monto:number, dia:number,
 *   tipo:string, parcial:boolean}>} pendientes
 * @returns {string}
 */
export function renderFormPagoLote(pendientes) {
  const lista = pendientes ?? [];

  const items = lista.map(p => `
    <label class="lote-row">
      <input type="checkbox" class="lote-row__check" checked
             data-lote-id="${_esc(p.id)}" data-lote-monto="${Number(p.monto) || 0}" />
      <span class="lote-row__body">
        <span class="lote-row__name">${_esc(p.descripcion || 'Sin nombre')}</span>
        <span class="lote-row__sub">${_subFilaLote(p)}</span>
      </span>
      <span class="lote-row__amount">${f(Number(p.monto) || 0)}</span>
    </label>`).join('');

  const hayDeudas = lista.some(p => p.tipo === 'deuda-entidad' || p.tipo === 'deuda-personal');
  const intro = hayDeudas
    ? 'Estos pagos ya vencieron y no están registrados. Lo que abones a una deuda baja su saldo. Desmarca los que aún no hayas pagado.'
    : 'Estos pagos ya vencieron y no están registrados. Desmarca los que aún no hayas pagado.';

  return `
    <p class="lote-intro">${intro}</p>
    <div class="lote-lista">${items}</div>
    <p class="lote-total" data-role="lote-total" aria-live="polite"></p>
    <div class="modal__footer modal__footer--principal">
      <button type="button" class="btn btn-primary" data-action="agenda-confirmar-lote">
        <svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg>
        <span data-role="lote-cta-texto">Registrar pagos</span>
      </button>
    </div>`;
}

/**
 * "5 de agosto" a partir de un 'YYYY-MM-DD'. Sin año a propósito: la ventana
 * del catch-up es de dos meses (ADR 052 D1), así que el año no desambigua nada
 * y alarga la fila. Reusa el catálogo `MONTHS` de esta misma vista en vez de
 * pagar un `Intl.DateTimeFormat` por fila.
 * @param {string} iso
 * @returns {string}
 */
function _fechaCorta(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!m) return '';
  const mes = MONTHS[+m[2] - 1];
  return mes ? `${+m[3]} de ${mes.toLowerCase()}` : '';
}

/**
 * Subtítulo de una fila de la hoja de pagos automáticos: la fecha real del
 * débito y, cuando la fila está bloqueada, por qué no se puede confirmar.
 *
 * @param {{fecha:string, cuentaNombre:string|null, bloqueo:string|null, falta:number}} it
 * @returns {string}
 */
function _subFilaAutomatico(it) {
  const cuando = `Venció el ${_fechaCorta(it.fecha)}`;
  if (it.bloqueo === 'cuenta') {
    return `${cuando} &middot; sin cuenta asignada: edítalo y elige de cuál sale`;
  }
  if (it.bloqueo === 'saldo') {
    return `${cuando} &middot; a ${_esc(it.cuentaNombre ?? 'la cuenta')} le faltan ${f(it.falta)}`;
  }
  return `${cuando} &middot; ${_esc(it.cuentaNombre ?? 'tu cuenta')}`;
}

/**
 * Cuerpo de la hoja "Pagos automáticos" (PA.1a, ADR 052 D1 y D2): lo que el
 * banco debitó solo mientras la app estaba cerrada, listo para confirmar.
 *
 * Reusa el lenguaje visual del pago en lote (`lote-*`): es la misma operación
 * vista desde el otro lado, y darle un componente propio sería vocabulario
 * nuevo sin nada nuevo que decir. La diferencia real está en el intro (acá el
 * usuario no eligió pagar: viene a revisar lo que ya pasó) y en la fila
 * bloqueada, que explica qué falta en vez de dejar registrar a ciegas.
 *
 * Las filas bloqueadas van desmarcadas y deshabilitadas, nunca ocultas: el
 * usuario tiene que enterarse de que ese débito no se pudo cubrir (esa es la
 * alerta accionable que pedía el brief), no descubrirlo por ausencia.
 *
 * @param {Array<{id:string, descripcion:string, monto:number, fecha:string,
 *   tipo:string, cuentaNombre:string|null, bloqueo:string|null, falta:number}>} items
 * @returns {string}
 */
export function renderFormAutomaticos(items) {
  const lista = items ?? [];

  const filas = lista.map(it => `
    <label class="lote-row${it.bloqueo ? ' lote-row--bloqueada' : ''}">
      <input type="checkbox" class="lote-row__check"${it.bloqueo ? ' disabled' : ' checked'}
             data-auto-id="${_esc(it.id)}" data-auto-fecha="${_esc(it.fecha)}"
             data-lote-monto="${Number(it.monto) || 0}" />
      <span class="lote-row__body">
        <span class="lote-row__name">${_esc(it.descripcion || 'Sin nombre')}</span>
        <span class="lote-row__sub">${_subFilaAutomatico(it)}</span>
      </span>
      <span class="lote-row__amount">${f(Number(it.monto) || 0)}</span>
    </label>`).join('');

  const bloqueadas = lista.filter(it => it.bloqueo).length;
  const aviso = bloqueadas === 0 ? '' : `
    <p class="form-hint form-hint--danger">${bloqueadas === 1
      ? 'Uno de estos débitos no se puede registrar todavía. La fila dice qué falta.'
      : `${bloqueadas} de estos débitos no se pueden registrar todavía. Cada fila dice qué falta.`}</p>`;

  return `
    <p class="lote-intro">Estos pagos se descuentan solos de tus cuentas y ya vencieron. Confírmalos para registrarlos con su fecha real, o desmarca los que tu banco no haya cobrado.</p>
    <div class="lote-lista">${filas}</div>
    ${aviso}
    <p class="lote-total" data-role="auto-total" aria-live="polite"></p>
    <div class="modal__footer modal__footer--principal">
      <button type="button" class="btn btn-ghost" data-action="modal-close">Ahora no</button>
      <button type="button" class="btn btn-primary" data-action="agenda-confirmar-automaticos">
        <svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg>
        <span data-role="auto-cta-texto">Confirmar pagos</span>
      </button>
    </div>`;
}

function _renderCabecera(year, month, eventos, eventosIng = {}, eventosMeta = {}) {
  const total = totalEventosDelMes(eventos);
  // CAL.4b (ADR 037 D2): el subtítulo separa compromisos de ingresos; el
  // día de ingreso no es un pago y no debe contarse como tal (ADR 021).
  // MT.6d: los aportes de meta se cuentan aparte, mismo criterio.
  const nIng  = totalEventosDelMes(eventosIng);
  const nMeta = totalEventosDelMes(eventosMeta);
  const partes = [
    total === 0
      ? 'Sin compromisos este mes'
      : total === 1
      ? '1 compromiso este mes'
      : `${total} compromisos este mes`,
  ];
  if (nIng > 0)  partes.push(nIng === 1 ? '1 ingreso' : `${nIng} ingresos`);
  if (nMeta > 0) partes.push(nMeta === 1 ? '1 aporte a meta' : `${nMeta} aportes a metas`);
  const subtitle = partes.join(' · ');

  return `
    <header class="cal-card__header">
      <button type="button" class="cal-card__nav"
              data-action="agenda-prev-mes"
              aria-label="Mes anterior">‹</button>
      <div class="cal-card__title-wrap">
        <h2 class="cal-card__title">${MONTHS[month]} ${year}</h2>
        <p class="cal-card__subtitle">${subtitle}</p>
      </div>
      <button type="button" class="cal-card__nav"
              data-action="agenda-next-mes"
              aria-label="Mes siguiente">›</button>
    </header>`;
}

function _renderDiasSemana() {
  // Convención CO: semana empieza en lunes.
  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  return `
    <div class="cal-grid cal-grid--header" aria-hidden="true">
      ${dias.map(d => `<span class="cal-grid__dow">${d}</span>`).join('')}
    </div>`;
}

/**
 * Grilla del mes.
 *
 * DIS.11 V-6: sin `role="grid"` ni `role="gridcell"`. El patrón grid exige
 * filas (`role="row"`) y un teclado de flechas; acá hay una lista de botones,
 * cada uno con su aria-label completo, y eso es lo que se anuncia. `role
 * ="group"` conserva el nombre accesible del conjunto sin prometer una
 * navegación que no existe.
 *
 * @param {number} year
 * @param {number} month 0-indexed.
 * @param {Record<number, any[]>} eventos
 * @param {Record<number, number>} [vencidosPorDia] Pagos vencidos y sin
 *   registrar por día (DIS.11 C2/V-5), calculados una sola vez en
 *   `renderAgenda()` a partir de `pendientesDePagoDelMes`.
 * @returns {string}
 */
function _renderGrid(year, month, eventos, vencidosPorDia = {}) {
  const diasEnMes  = new Date(year, month + 1, 0).getDate();
  const firstDay   = new Date(year, month, 1).getDay();        // 0=Dom
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;        // si dom, ponemos en col 7

  const hoy           = new Date();
  const esMesActual   = hoy.getFullYear() === year && hoy.getMonth() === month;
  const diaHoy        = hoy.getDate();

  let html = '<div class="cal-grid" role="group" aria-label="Días del mes">';

  for (let i = 0; i < startOffset; i++) {
    html += '<div class="cal-day cal-day--empty" aria-hidden="true"></div>';
  }

  for (let d = 1; d <= diasEnMes; d++) {
    const evs       = eventos[d] || [];
    const hayEvs    = evs.length > 0;
    const esHoy     = esMesActual && d === diaHoy;
    const esPasado  = esMesActual && d < diaHoy;
    const esSelecc  = d === _diaSeleccionado;
    // DIS.11 C2/V-5: día con pagos ya vencidos y sin registrar. Toma el
    // amarillo de aviso (familia warning, nunca danger: deber un pago no es
    // un error del usuario, ADR 019) y queda fuera de la atenuación de
    // "pasado", que pintaba lo que hay que atender como lo más tenue del mes.
    const nVencidos = vencidosPorDia?.[d] ?? 0;

    const cls = [
      'cal-day',
      esHoy    && 'cal-day--today',
      hayEvs   && 'cal-day--has-events',
      esSelecc && 'cal-day--selected',
      esPasado && !esHoy && 'cal-day--past',
      nVencidos > 0 && 'cal-day--vencido',
    ].filter(Boolean).join(' ');

    // ADR 021: el aria-label distingue día de ingreso de compromisos a pagar.
    // MT.6d: un aporte de meta tampoco es un compromiso, se nombra aparte.
    const nIng  = evs.filter(e => e?.tipo === 'ingreso').length;
    const nMeta = evs.filter(e => e?.tipo === 'meta').length;
    const nComp = evs.length - nIng - nMeta;
    const partes = [];
    if (nIng > 0)  partes.push('día de ingreso');
    if (nMeta > 0) partes.push(`${nMeta} ${nMeta === 1 ? 'aporte a meta' : 'aportes a metas'}`);
    if (nComp > 0) partes.push(`${nComp} ${nComp === 1 ? 'compromiso' : 'compromisos'}`);
    if (nVencidos > 0) partes.push(`${nVencidos} ${nVencidos === 1 ? 'vencido' : 'vencidos'}`);
    const aria = hayEvs
      ? `Día ${d}, ${partes.join(', ')}`
      : `Día ${d}, sin compromisos`;

    // CAL.3: todos los días son interactivos, con o sin eventos. Un día
    // vacío también se puede seleccionar; el detalle muestra "sin
    // compromisos este día" en vez de no responder al click.
    // CAL.4b: la fila de dots se pinta siempre (vacía si no hay eventos)
    // para que el número quede a la misma altura en todas las celdas del
    // grid centrado.
    html += `
      <button type="button" class="${cls}"
              aria-label="${aria}"
              data-action="agenda-mostrar-dia" data-day="${d}">
        <span class="cal-day__num">${d}</span>
        ${hayEvs ? _renderDots(evs) : '<div class="cal-day__dots" aria-hidden="true"></div>'}
      </button>`;
  }

  html += '</div>';
  return html;
}

/**
 * Hasta 3 dots por celda, uno por compromiso, coloreado por tipo.
 * Si hay > 3, el último muestra "+N".
 */
function _renderDots(evs) {
  const visibles = evs.slice(0, 3);
  let dots = visibles.map(c => {
    const tipo = c.tipo ?? 'fijo';
    return `<span class="cal-dot cal-dot--${tipo}" aria-hidden="true"></span>`;
  }).join('');

  if (evs.length > 3) {
    dots += `<span class="cal-day__more" aria-hidden="true">+${evs.length - 3}</span>`;
  }

  return `<div class="cal-day__dots">${dots}</div>`;
}

/** Etiqueta de leyenda por tipo de evento (color e ícono ya los da `cal-dot--*`, CSS). */
const _LABEL_LEYENDA = {
  'ingreso':        'Día de ingreso',
  'meta':           'Aporte a meta',
  'fijo':           'Gasto fijo',
  'deuda-entidad':  'Deuda entidad',
  'deuda-personal': 'Deuda personal',
};

/**
 * Leyenda de tipos (CAL.2): dinámica, solo lista los tipos de evento que
 * realmente aparecen en el mes visible, en el orden canónico de
 * `tiposPresentesEnMes`. Color, ícono y nomenclatura son los oficiales de
 * cada tipo (`cal-dot--*`, ya usados en los puntos del calendario); esta
 * función solo decide qué entradas mostrar, no cómo se ven.
 *
 * DIS.11 C6/V-3 (revisa AG.6): se emite DENTRO de `.cal-card`, como pie de la
 * tarjeta que explica, y sin sticky. La clave queda junto al mapa y el panel
 * del día sube 78px.
 *
 * @param {ReturnType<import('./logic.js').eventosDelMes>} eventos
 */
function _renderLeyenda(eventos) {
  const tipos = tiposPresentesEnMes(eventos);
  if (tipos.length === 0) return '';

  const items = tipos.map(t => `
      <span class="cal-legend__item">
        <span class="cal-dot cal-dot--${t}" aria-hidden="true"></span> ${_LABEL_LEYENDA[t]}
      </span>`).join('');

  return `<div class="cal-legend" aria-label="Leyenda de tipos">${items}</div>`;
}

/**
 * Empty state del mes (CAL.4b, ADR 037 D6): mes visible sin ningún evento.
 * Guía a la acción en vez de dejar la pantalla vacía: teja índigo de la
 * sección + CTA que abre el modal de gasto fijo (acción existente).
 *
 * @param {number} month 0-indexed.
 * @returns {string}
 */
function _renderEmptyMes(month) {
  return `
    <div class="cal-empty">
      <span class="cal-empty__teja" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#i-agenda"/></svg></span>
      <p class="cal-empty__title">${MONTHS[month]} está despejado</p>
      <p class="cal-empty__desc">Programa tus gastos fijos y deudas para no perder ningún pago.</p>
      <button type="button" class="btn btn-primary" data-action="nuevo-gasto-fijo">
        + Agregar gasto fijo
      </button>
    </div>`;
}

// ── DETALLE DEL DÍA ──────────────────────────────────────────────

/**
 * Panel del día seleccionado. El título lleva `tabindex="-1"` porque
 * agenda/index.js le manda el foco después de abrir un día (DIS.11 C1/V-1):
 * el navegador lo trae a pantalla y el lector lo anuncia. Sin eso, tocar un
 * día no cambiaba nada visible: el panel nacía fuera del viewport.
 */
function _renderDetalleDia(evs, year, month, dia) {
  const fecha   = new Date(year, month, dia);
  const dow     = DOW_LARGO[fecha.getDay()];
  const titulo  = `${dow} ${dia} de ${MONTHS[month]}`;

  // CAL.3: día seleccionado sin compromisos ni ingresos (a propósito, o
  // porque se eliminó el compromiso desde otra sección). En vez de no
  // mostrar nada, decirlo explícito: mismo encabezado, sin total ni lista.
  if (evs.length === 0) {
    return `
      <section class="cal-detail" aria-label="Compromisos del ${titulo}">
        <header class="cal-detail__header">
          <div class="cal-detail__title-wrap">
            <h3 class="cal-detail__title" tabindex="-1">${titulo}</h3>
            <p class="cal-detail__subtitle">Sin compromisos ni ingresos este día</p>
          </div>
          <button type="button" class="cal-detail__close"
                  data-action="agenda-mostrar-dia"
                  data-day="${dia}"
                  aria-label="Cerrar detalle del día"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>
        </header>
      </section>`;
  }

  // ADR 021: el resumen separa el día de ingreso de los compromisos a pagar.
  // MT.6d: el aporte de meta se nombra aparte, mismo criterio.
  const nIng    = evs.filter(e => e?.tipo === 'ingreso').length;
  const nMeta   = evs.filter(e => e?.tipo === 'meta').length;
  const nComp   = evs.length - nIng - nMeta;
  const partes  = [];
  if (nIng > 0)  partes.push('día de ingreso');
  if (nMeta > 0) partes.push(nMeta === 1 ? '1 aporte a meta' : `${nMeta} aportes a metas`);
  if (nComp > 0) partes.push(nComp === 1 ? '1 compromiso' : `${nComp} compromisos`);
  const resumen = partes.join(' · ');
  // AG.5: total a pagar ese día, visible de inmediato junto al título (no
  // hay que desplazarse por la lista de items para verlo).
  // CAL.4c (ADR 037 D5): cuando todos los compromisos del día están
  // completos, el label cambia a "Pagado este día" (verde): refuerzo en
  // positivo, no alarma (ADR 019).
  // CAL.4c (ADR 037 D7): el ojo del hero también enmascara este total.
  const prefijo = `${year}-${String(month + 1).padStart(2, '0')}`;
  const gastos  = Array.isArray(S.gastos) ? S.gastos : [];
  const oculto  = S.config?.ocultarSaldo === true;
  const comps   = evs.filter(e => e?.tipo !== 'ingreso' && e?.tipo !== 'meta');
  const todoPagado = comps.length > 0 &&
    comps.every(c => estadoPagoMes(gastos, c, prefijo) === 'completo');

  const sumaDia  = totalDia(evs);
  const totalTxt = oculto ? SALDO_MASCARA : f(sumaDia);
  const totalPagarHtml = sumaDia > 0
    ? `<p class="cal-detail__total${todoPagado ? ' cal-detail__total--pagado' : ''}">${todoPagado ? 'Pagado este día' : 'Total a pagar'}: <strong>${totalTxt}</strong></p>`
    : '';

  const items = evs.map(c => {
    if (c?.tipo === 'ingreso') return _renderDetalleItemIngreso(c);
    if (c?.tipo === 'meta')    return _renderDetalleItemMeta(c);
    return _renderDetalleItem(c, year, month);
  }).join('');

  return `
    <section class="cal-detail" aria-label="Compromisos del ${titulo}">
      <header class="cal-detail__header">
        <div class="cal-detail__title-wrap">
          <h3 class="cal-detail__title" tabindex="-1">${titulo}</h3>
          <p class="cal-detail__subtitle">${resumen}</p>
          ${totalPagarHtml}
        </div>
        <button type="button" class="cal-detail__close"
                data-action="agenda-mostrar-dia"
                data-day="${dia}"
                aria-label="Cerrar detalle del día"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>
      </header>
      <ul class="cal-detail__list">
        ${items}
      </ul>
    </section>`;
}

/**
 * Item de detalle para un día de ingreso (ADR 021). Muestra el ingreso que
 * llega ese día y el recordatorio de apartar para los objetivos, con el CTA
 * que abre el asistente "Distribuir mi ingreso" de Mis cuentas (una sola
 * fuente de verdad para los montos sugeridos: sin réplica del motor aquí).
 *
 * @param {{ id:string, descripcion?:string, monto?:number, frecuencia?:string }} ing
 * @returns {string}
 */
function _renderDetalleItemIngreso(ing) {
  const desc  = _esc(ing.descripcion ?? 'Ingreso');
  const frec  = _esc(ing.frecuencia ?? '');
  const monto = Number(ing.monto) || 0;
  // CAL.4c (ADR 037 D7): el ojo del hero también enmascara el monto.
  const oculto   = S.config?.ocultarSaldo === true;
  const montoTxt = oculto ? SALDO_MASCARA_CUENTA : f(monto);

  // CAL.4c (ADR 037 D4): el recordatorio de apartar (ADR 021) pasa de línea
  // de texto a callout verde con ícono, fuera del cuerpo para ocupar el
  // ancho completo de la tarjeta.
  return `
    <li class="cal-detail__item cal-detail__item--ingreso">
      <span class="cal-detail__icon cal-detail__icon--ingreso" aria-hidden="true">${tejaCategoria(CATEGORIA_INGRESO_ICONO[ing.categoria] ?? 'i-saldo', 'ingresos')}</span>
      <div class="cal-detail__body">
        <p class="cal-detail__name">${desc}</p>
        <p class="cal-detail__sub">Ingreso${frec ? ` · ${frec}` : ''}</p>
      </div>
      ${monto > 0 ? `<p class="cal-detail__amount text-success">+${montoTxt}</p>` : ''}
      <div class="cal-detail__callout-ingreso" role="status">
        <svg class="icon" aria-hidden="true"><use href="#i-lightbulb"/></svg>
        <p>Hoy llega tu dinero: recuerda apartar para tus objetivos antes de gastarlo.</p>
      </div>
      <div class="cal-detail__actions">
        <button type="button" class="btn btn-sm btn-primary"
                data-action="agenda-distribuir-ingreso"
                aria-label="Distribuir el ingreso ${desc} entre tus objetivos">
          Distribuir →
        </button>
      </div>
    </li>`;
}

/**
 * Item de detalle para un aporte del plan de una meta (MT.6d, ADR 048 D3).
 * El plan es **visible y recordatorio, nunca ejecución**: no hay botón que
 * registre el aporte solo, el CTA abre el mismo modal de aporte que ya usa
 * Metas (`data-action="abonar-meta"`, registrado por `metas/index.js` en el
 * bootstrap de la app). Agenda no importa Metas (ADN #10): solo reutiliza la
 * acción global ya cableada.
 *
 * @param {{ id:string, descripcion?:string, monto?:number }} m
 * @returns {string}
 */
function _renderDetalleItemMeta(m) {
  const desc  = _esc(m.descripcion || 'Meta');
  const monto = Number(m.monto) || 0;
  const oculto   = S.config?.ocultarSaldo === true;
  const montoTxt = oculto ? SALDO_MASCARA_CUENTA : f(monto);

  return `
    <li class="cal-detail__item cal-detail__item--meta">
      <span class="cal-detail__icon cal-detail__icon--meta" aria-hidden="true">${tejaCategoria('i-metas', 'metas')}</span>
      <div class="cal-detail__body">
        <p class="cal-detail__name">${desc}</p>
        <p class="cal-detail__sub">Aporte sugerido a tu meta</p>
      </div>
      ${monto > 0 ? `<p class="cal-detail__amount">${montoTxt}</p>` : ''}
      <div class="cal-detail__actions">
        <button type="button" class="btn btn-sm btn-primary"
                data-action="abonar-meta" data-id="${_esc(m.id)}"
                aria-label="Aportar a ${desc}">
          Aportar →
        </button>
      </div>
    </li>`;
}

function _renderDetalleItem(c, viewYear, viewMonth) {
  const tipo  = c.tipo ?? 'fijo';
  const label = _esc(LABEL_TIPO[tipo] ?? tipo);
  const desc  = _esc(c.descripcion ?? '(sin descripción)');
  const frec  = _esc(c.frecuencia ?? '');
  // MK.2 (ADR 025): si el nombre menciona una marca conocida (Netflix, Claro,
  // Bancolombia...), la teja de marca es el ícono principal. Con categoría
  // predefinida el nombre que escribió el usuario vive en `nota` (AG.4), por
  // eso se buscan ambos campos. Sin marca aplica AG.2/ID.3: con categoría,
  // la teja de categoría es el ícono principal (izquierda), como en Gastos;
  // sin categoría (o en deudas, campo exclusivo de tipo=fijo), el ícono
  // genérico del tipo. Con categoría, la teja usa el color de esa
  // categoría (dominio "presupuesto", igual que en Gastos); sin ella, el
  // círculo genérico de "fijo" usa el índigo propio del calendario
  // (IV.2c, ADR 031): el color que .cal-dot--fijo ya usa para "fijo".
  const marca = resolverMarca(`${c.descripcion ?? ''} ${c.nota ?? ''}`);
  // CAT.2f: categoría "Otro" con ícono elegido por el usuario prevalece
  // sobre el fijo por categoría (mismo patrón que Deudas, CAT.2d).
  const simboloCategoria = (!marca && tipo === 'fijo')
    ? (c.icono || (c.categoria ? iconoDeCategoriaGasto(c.categoria, S.categoriasPersonalizadas) : null))
    : null;
  const icono   = marca ? tejaMarca(marca)
    : simboloCategoria ? tejaCategoria(simboloCategoria, 'presupuesto')
    : icon(ICONO_TIPO[tipo] ?? 'recurring');
  // AG.4: con categoría predefinida, el título (desc) ya ES la categoría
  // (normalizarCompromiso), así que repetirla aquí sería redundante. Solo se
  // muestra cuando difieren (p. ej. categoría "Otro" con nombre propio).
  const catLabel = (tipo === 'fijo' && c.categoria && c.categoria !== c.descripcion)
    ? ` · ${_esc(c.categoria)}`
    : '';
  const notaLabel = (tipo === 'fijo' && c.nota) ? ` · ${_esc(c.nota)}` : '';
  // CAL.4c (ADR 037 D7): el ojo del hero también enmascara los montos del
  // detalle, con la máscara corta por item (mismo criterio que el hero de
  // Inicio, IN.8c).
  const oculto = S.config?.ocultarSaldo === true;
  // Una deuda sin cuota fija (ej. fiado, D.13) no muestra "$0": se abona libre.
  const montoRaw = tipo === 'fijo' ? c.monto : c.cuotaMensual;
  const monto = Number.isFinite(Number(montoRaw)) && Number(montoRaw) > 0
    ? (oculto ? SALDO_MASCARA_CUENTA : f(Number(montoRaw)))
    : '';
  const idEsc = _esc(c.id ?? '');

  // Badge de estado de pago: distingue cuota cubierta, abono parcial y sin pago.
  // Para deudas se compara el total abonado contra cuotaMensual; para fijos
  // basta con que exista cualquier gasto vinculado ese mes.
  // CAL.4c (ADR 037 D5): pagado como pill verde con ícono; el estado parcial
  // se preserva como pill neutra (mandato explícito del doc de diseño).
  const prefijo    = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const gastos     = Array.isArray(S.gastos) ? S.gastos : [];
  const estadoPago = estadoPagoMes(gastos, c, prefijo);

  let badgeHtml = '';
  if (estadoPago === 'completo') {
    badgeHtml = `<p class="cal-detail__badge-abono" role="status"><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg>Ya pagaste este mes</p>`;
  } else if (estadoPago === 'parcial') {
    const abonadoTxt = oculto ? SALDO_MASCARA_CUENTA : f(calcularAbonosDelMes(gastos, c.id, prefijo));
    const cuotaTxt   = oculto ? SALDO_MASCARA_CUENTA : f(Number(c.cuotaMensual) || 0);
    badgeHtml = `<p class="cal-detail__badge-abono cal-detail__badge-abono--parcial" role="status">Abonado ${abonadoTxt} de ${cuotaTxt} este mes</p>`;
  }

  // CAL.4c (ADR 037 D4): el CTA principal lleva la identidad del tipo
  // (mismo criterio que .deuda-card__abonar, ADR 036 D5: un abono no es un
  // ingreso, no va en verde; "Marcar pagado" usa el índigo de la sección).
  let accionesHtml = '';
  if (tipo === 'fijo') {
    // BUG-015: el pago pertenece al mes VISIBLE, no al actual, así que el botón
    // viaja con `data-mes` (el handler no conoce _viewYear/_viewMonth). Un mes
    // futuro no se puede pagar: aún no ha vencido y Finko registra lo que pasó
    // (mismo criterio que MC.13c-2, que rechazó gastos con fecha futura).
    const hoyD = new Date();
    const esMesFuturo = viewYear > hoyD.getFullYear()
      || (viewYear === hoyD.getFullYear() && viewMonth > hoyD.getMonth());

    const btnPagar = (estadoPago !== 'completo' && !esMesFuturo) ? `
      <button type="button" class="cal-detail__cta cal-detail__cta--fijo"
              data-action="agenda-marcar-pagado-fijo" data-id="${idEsc}"
              data-mes="${prefijo}"
              aria-label="Marcar como pagado este mes: ${desc}">
        Marcar pagado
      </button>` : '';

    accionesHtml = `
      <div class="cal-detail__actions">
        <button type="button" class="btn btn-sm btn-ghost"
                data-action="agenda-editar-fijo" data-id="${idEsc}"
                aria-label="Editar ${desc}">Editar</button>
        <button type="button" class="btn btn-sm btn-ghost"
                data-action="agenda-eliminar-fijo" data-id="${idEsc}"
                aria-label="Eliminar ${desc}"
                style="color: var(--fk-danger-text);">Eliminar</button>
        ${btnPagar}
      </div>`;
  } else if (tipo === 'deuda-entidad' || tipo === 'deuda-personal') {
    const btnAbonar = estadoPago !== 'completo' ? `
      <button type="button" class="cal-detail__cta cal-detail__cta--${tipo}"
              data-action="abrir-abono" data-id="${idEsc}"
              aria-label="Registrar abono a ${desc}">
        Abonar
      </button>` : '';

    accionesHtml = `
      <div class="cal-detail__actions">
        <button type="button" class="btn btn-sm btn-ghost"
                data-action="editar-compromiso" data-id="${idEsc}"
                aria-label="Editar ${desc}">Editar</button>
        <button type="button" class="btn btn-sm btn-ghost"
                data-action="eliminar-compromiso" data-id="${idEsc}"
                aria-label="Eliminar ${desc}"
                style="color: var(--fk-danger-text);">Eliminar</button>
        ${btnAbonar}
      </div>`;
  }

  return `
    <li class="cal-detail__item cal-detail__item--${tipo}">
      <span class="cal-detail__icon cal-detail__icon--${tipo}" aria-hidden="true">${icono}</span>
      <div class="cal-detail__body">
        <p class="cal-detail__name">${desc}</p>
        <p class="cal-detail__sub">${label}${frec ? ` · ${frec}` : ''}${catLabel}${notaLabel}</p>
        ${badgeHtml}
      </div>
      ${monto ? `<p class="cal-detail__amount">${monto}</p>` : ''}
      ${accionesHtml}
    </li>`;
}

// ── FORMULARIO: NUEVO GASTO FIJO ─────────────────────────────────

/**
 * Devuelve el HTML del formulario simplificado de gasto fijo.
 *
 * Campos visibles: categoria (opcional), descripcion/nota, monto, frecuencia, diaPago.
 * `tipo` va como input hidden con valor 'fijo' para que `normalizarCompromiso`
 * lo guarde como un compromiso de tipo fijo en S.compromisos.
 *
 * AG.4: con una categoría predefinida (cualquiera salvo "Otro"), el nombre
 * del registro es la propia categoría, así que pedirlo aparte es redundante;
 * el campo de texto pasa a ser una nota opcional. `_syncCategoriaGastoFijo`
 * (en index.js) alterna el label/placeholder/`required` de este campo según
 * la categoría elegida; el HTML nace en el estado por defecto (sin categoría,
 * nombre obligatorio) y ese handler ajusta el resto en cada apertura.
 *
 * @returns {string}
 */
/**
 * Frase "cada X" (o "una vez") de cada frecuencia, para el banner dinámico
 * del gasto fijo (ver `textoBannerGastoFijo`). Cubre las 9 FRECUENCIAS;
 * "Única vez" es la única sin ritmo de repetición.
 */
const _FRASE_FRECUENCIA = {
  'Diario':     'cada día',
  'Semanal':    'cada semana',
  'Quincenal':  'cada quincena',
  'Mensual':    'cada mes',
  'Bimestral':  'cada dos meses',
  'Trimestral': 'cada tres meses',
  'Semestral':  'cada seis meses',
  'Anual':      'cada año',
  'Única vez':  'una vez',
};

/**
 * Texto del banner informativo del form de gasto fijo (FORM.1c, ADR 042 D5):
 * lee la frecuencia y el día de pago elegidos y arma "Aparecerá cada mes en
 * tu calendario el día 5." Sin día válido (campo vacío o fuera de 1-31),
 * usa un cierre neutro en vez de inventar una fecha.
 * @param {string} frecuencia
 * @param {string|number} diaPago
 * @returns {string}
 */
export function textoBannerGastoFijo(frecuencia, diaPago) {
  const frase = _FRASE_FRECUENCIA[frecuencia] ?? 'cada mes';
  const dia = Number(diaPago);
  const diaTexto = Number.isInteger(dia) && dia >= 1 && dia <= 31
    ? `el día ${dia}`
    : 'el día que elijas';
  return `Aparecerá ${frase} en tu calendario ${diaTexto}.`;
}

/** Sentinela del chip "Categoría nueva" del formulario de gasto fijo (CAT.3c). */
export const CATEGORIA_NUEVA_VALUE_FIJO = '__nueva__';

export function renderFormGastoFijo() {
  const frecOpts = FRECUENCIAS
    .map(fr => `<option value="${_esc(fr)}"${fr === 'Mensual' ? ' selected' : ''}>${_esc(fr)}</option>`)
    .join('');

  // FORM.1c (ADR 042 D5): la categoría son chips de ícono en grilla de 3
  // columnas (mismo lenguaje que Registrar gasto y Nueva deuda), no un
  // desplegable. Radios reales name="categoria" dentro del label: el
  // contrato FormData y validarCompromiso() no cambian.
  // CAT.3c: se suman las personalizadas de sección 'fijo' y, al final, el
  // chip "Categoría nueva" (mismo lenguaje que "Otra categoría" de Gastos,
  // con nombre distinto porque 'Otro' ya es miembro literal de este catálogo).
  const chipCat = (valor, etiqueta, simbolo) => `
        <label class="chip-cat">
          <input type="radio" name="categoria" class="chip-cat__radio" value="${_esc(valor)}" />
          <svg class="icon" aria-hidden="true"><use href="#${_esc(simbolo)}"/></svg>
          <span class="chip-cat__label">${_esc(etiqueta)}</span>
        </label>`;
  const personalizadasFijo = (S.categoriasPersonalizadas ?? []).filter(c => c.seccion === 'fijo');
  const chipsCategoria = [
    ...CATEGORIAS_AGENDA.map(c => chipCat(c, c, iconoDeCategoriaGasto(c, S.categoriasPersonalizadas))),
    ...personalizadasFijo.map(c => chipCat(c.nombre, c.nombre, iconoDeCategoriaGasto(c.nombre, S.categoriasPersonalizadas))),
    chipCat(CATEGORIA_NUEVA_VALUE_FIJO, 'Categoría nueva', 'i-plus'),
  ].join('');

  return `
    <form id="form-gasto-fijo" novalidate>
      <input type="hidden" name="tipo" value="fijo" />

      <div class="form-group">
        <span class="label" id="gfijo-categoria-label">Categoría</span>
        <div class="chips-cat" role="radiogroup" aria-labelledby="gfijo-categoria-label">
          ${chipsCategoria}
        </div>
      </div>

      <div class="form-group" id="form-group-gfijo-icono" hidden>
        ${renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'gfijo-icono', label: 'Ícono' })}
      </div>

      <div class="form-group" id="gfijo-categoria-nueva-fields" hidden>
        <label for="gfijo-categoria-nueva-nombre" class="label">Nombre de tu categoría</label>
        <input id="gfijo-categoria-nueva-nombre" name="categoriaNuevaNombre" class="input" type="text"
               placeholder="Ej. Gimnasio, Netflix" autocomplete="off" />
        ${renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'gfijo-categoria-nueva-icono', nombreCampo: 'categoriaNuevaIcono' })}
      </div>

      <div class="form-group">
        <label for="gfijo-descripcion" class="label" id="gfijo-descripcion-label">Descripción</label>
        <input id="gfijo-descripcion" name="descripcion" class="input" type="text"
               placeholder="Ej. Arriendo, Netflix, agua" required aria-required="true"
               autocomplete="off" />
      </div>

      <div class="monto-hero">
        <label class="monto-hero__label" for="gfijo-monto">Monto (COP)</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="gfijo-monto" name="monto" class="input input--big-amount" type="number"
                 min="1" step="1000" placeholder="0" required aria-required="true"
                 autocomplete="off" inputmode="numeric" />
        </div>
        <span class="monto-hero__hint">COP</span>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="gfijo-frecuencia" class="label">Frecuencia</label>
          <select id="gfijo-frecuencia" name="frecuencia" class="input" required aria-required="true">
            ${frecOpts}
          </select>
        </div>
        <div class="form-group">
          <label for="gfijo-dia" class="label">Día de pago (1-31)</label>
          <input id="gfijo-dia" name="diaPago" class="input" type="number"
                 min="1" max="31" step="1" placeholder="1" required aria-required="true" />
        </div>
      </div>

      <p class="form-hint form-hint--info" id="gfijo-banner" aria-live="polite">${textoBannerGastoFijo('Mensual', '')}</p>

      ${renderBloqueDebitoAutomatico(S.cuentas ?? [], { id: 'gfijo-debito' })}

      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary"><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg>Guardar gasto fijo</button>
      </div>
    </form>`;
}

