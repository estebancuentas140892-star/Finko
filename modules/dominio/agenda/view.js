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
import { f, esc as _esc } from '../../infra/utils.js';
import { icon, tejaCategoria } from '../../infra/icons.js';
import { resolverMarca, tejaMarca } from '../../infra/marcas.js';
import { FRECUENCIAS, CATEGORIAS_AGENDA, CATEGORIA_AGENDA_ICONO, CATEGORIA_INGRESO_ICONO, ICONOS_CATEGORIA_PERSONALIZADA } from '../../core/constants.js';
import { renderIconoPicker } from '../../infra/icon-picker.js';
import { SALDO_MASCARA, SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { LABEL_TIPO, ICONO_TIPO, calcularAbonosDelMes, estadoPagoMes } from '../compromisos/logic.js';
import { eventosDelMes, eventosIngresosDelMes, totalEventosDelMes, totalDia, tiposPresentesEnMes, totalesDelMes } from './logic.js';

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

  /** @type {Record<number, any[]>} */
  const eventos = {};
  for (const [d, evs] of Object.entries(eventosIng)) eventos[d] = [...evs];
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

  // AG.6: la leyenda va entre el calendario y el detalle del día (no al
  // final), y es sticky vía CSS: con un día cargado de registros sigue
  // visible mientras se recorre la lista.
  // CAL.4a (ADR 037 D1): el hero del mes encabeza la sección con el total a
  // pagar y el progreso pagado/falta del mes visible.
  const prefijoMes = `${_viewYear}-${String(_viewMonth + 1).padStart(2, '0')}`;

  el.innerHTML = `
    ${_renderHeroMes(eventos, _viewYear, _viewMonth, prefijoMes)}
    <article class="cal-card">
      ${_renderCabecera(_viewYear, _viewMonth, eventosComp)}
      ${_renderDiasSemana()}
      ${_renderGrid(_viewYear, _viewMonth, eventos)}
    </article>
    ${_renderLeyenda(eventos)}
    ${detalleHtml}`;
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
 * - Mes sin pagos programados (puede tener ingresos): variante de guía sin
 *   cifra, sin barra y sin ojo (nada que enmascarar, disciplina ADR 034/035).
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

function _renderCabecera(year, month, eventos) {
  const total    = totalEventosDelMes(eventos);
  const subtitle = total === 0
    ? 'Sin compromisos este mes'
    : total === 1
    ? '1 compromiso este mes'
    : `${total} compromisos este mes`;

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

function _renderGrid(year, month, eventos) {
  const diasEnMes  = new Date(year, month + 1, 0).getDate();
  const firstDay   = new Date(year, month, 1).getDay();        // 0=Dom
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;        // si dom, ponemos en col 7

  const hoy           = new Date();
  const esMesActual   = hoy.getFullYear() === year && hoy.getMonth() === month;
  const diaHoy        = hoy.getDate();

  let html = '<div class="cal-grid" role="grid" aria-label="Días del mes">';

  for (let i = 0; i < startOffset; i++) {
    html += '<div class="cal-day cal-day--empty" aria-hidden="true"></div>';
  }

  for (let d = 1; d <= diasEnMes; d++) {
    const evs       = eventos[d] || [];
    const hayEvs    = evs.length > 0;
    const esHoy     = esMesActual && d === diaHoy;
    const esPasado  = esMesActual && d < diaHoy;
    const esSelecc  = d === _diaSeleccionado;

    const cls = [
      'cal-day',
      esHoy    && 'cal-day--today',
      hayEvs   && 'cal-day--has-events',
      esSelecc && 'cal-day--selected',
      esPasado && !esHoy && 'cal-day--past',
    ].filter(Boolean).join(' ');

    // ADR 021: el aria-label distingue día de ingreso de compromisos a pagar.
    const nIng  = evs.filter(e => e?.tipo === 'ingreso').length;
    const nComp = evs.length - nIng;
    const partes = [];
    if (nIng > 0)  partes.push('día de ingreso');
    if (nComp > 0) partes.push(`${nComp} ${nComp === 1 ? 'compromiso' : 'compromisos'}`);
    const aria = hayEvs
      ? `Día ${d}, ${partes.join(', ')}`
      : `Día ${d}, sin compromisos`;

    // CAL.3: todos los días son interactivos, con o sin eventos. Un día
    // vacío también se puede seleccionar; el detalle muestra "sin
    // compromisos este día" en vez de no responder al click.
    html += `
      <button type="button" class="${cls}"
              role="gridcell"
              aria-label="${aria}"
              data-action="agenda-mostrar-dia" data-day="${d}">
        <span class="cal-day__num">${d}</span>
        ${hayEvs ? _renderDots(evs) : ''}
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

// ── DETALLE DEL DÍA ──────────────────────────────────────────────

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
            <h3 class="cal-detail__title">${titulo}</h3>
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
  const nIng    = evs.filter(e => e?.tipo === 'ingreso').length;
  const nComp   = evs.length - nIng;
  const partes  = [];
  if (nIng > 0)  partes.push('día de ingreso');
  if (nComp > 0) partes.push(nComp === 1 ? '1 compromiso' : `${nComp} compromisos`);
  const resumen = partes.join(' · ');
  // AG.5: total a pagar ese día, visible de inmediato junto al título (no
  // hay que desplazarse por la lista de items para verlo).
  const sumaDia = totalDia(evs);
  const totalPagarHtml = sumaDia > 0
    ? `<p class="cal-detail__total">Total a pagar: <strong>${f(sumaDia)}</strong></p>`
    : '';

  const items = evs.map(c => c?.tipo === 'ingreso'
    ? _renderDetalleItemIngreso(c)
    : _renderDetalleItem(c, year, month)).join('');

  return `
    <section class="cal-detail" aria-label="Compromisos del ${titulo}">
      <header class="cal-detail__header">
        <div class="cal-detail__title-wrap">
          <h3 class="cal-detail__title">${titulo}</h3>
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

  return `
    <li class="cal-detail__item cal-detail__item--ingreso">
      <span class="cal-detail__icon cal-detail__icon--ingreso" aria-hidden="true">${tejaCategoria(CATEGORIA_INGRESO_ICONO[ing.categoria] ?? 'i-saldo', 'ingresos')}</span>
      <div class="cal-detail__body">
        <p class="cal-detail__name">${desc}</p>
        <p class="cal-detail__sub">Ingreso${frec ? ` · ${frec}` : ''}</p>
        <p class="cal-detail__badge-abono" role="status">Hoy llega tu dinero: recuerda apartar para tus objetivos antes de gastarlo.</p>
      </div>
      ${monto > 0 ? `<p class="cal-detail__amount text-success">+${f(monto)}</p>` : ''}
      <div class="cal-detail__actions">
        <button type="button" class="btn btn-sm btn-primary"
                data-action="agenda-distribuir-ingreso"
                aria-label="Distribuir el ingreso ${desc} entre tus objetivos">
          Distribuir →
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
    ? (c.icono || (c.categoria ? CATEGORIA_AGENDA_ICONO[c.categoria] : null))
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
  // Una deuda sin cuota fija (ej. fiado, D.13) no muestra "$0": se abona libre.
  const montoRaw = tipo === 'fijo' ? c.monto : c.cuotaMensual;
  const monto = Number.isFinite(Number(montoRaw)) && Number(montoRaw) > 0 ? f(Number(montoRaw)) : '';
  const idEsc = _esc(c.id ?? '');

  // Badge de estado de pago: distingue cuota cubierta, abono parcial y sin pago.
  // Para deudas se compara el total abonado contra cuotaMensual; para fijos
  // basta con que exista cualquier gasto vinculado ese mes.
  const prefijo    = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const gastos     = Array.isArray(S.gastos) ? S.gastos : [];
  const estadoPago = estadoPagoMes(gastos, c, prefijo);

  let badgeHtml = '';
  if (estadoPago === 'completo') {
    badgeHtml = `<p class="cal-detail__badge-abono" role="status">✓ Ya pagaste este mes</p>`;
  } else if (estadoPago === 'parcial') {
    const totalAbonado = calcularAbonosDelMes(gastos, c.id, prefijo);
    const cuota = Number(c.cuotaMensual) || 0;
    badgeHtml = `<p class="cal-detail__badge-abono cal-detail__badge-abono--parcial" role="status">Abonado ${f(totalAbonado)} de ${f(cuota)} este mes</p>`;
  }

  let accionesHtml = '';
  if (tipo === 'fijo') {
    const btnPagar = estadoPago !== 'completo' ? `
      <button type="button" class="btn btn-sm btn-primary"
              data-action="agenda-marcar-pagado-fijo" data-id="${idEsc}"
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
      <button type="button" class="btn btn-sm btn-primary"
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
export function renderFormGastoFijo() {
  const frecOpts = FRECUENCIAS
    .map(fr => `<option value="${_esc(fr)}"${fr === 'Mensual' ? ' selected' : ''}>${_esc(fr)}</option>`)
    .join('');

  const catOpts = CATEGORIAS_AGENDA
    .map(c => `<option value="${_esc(c)}">${_esc(c)}</option>`)
    .join('');

  return `
    <form id="form-gasto-fijo" novalidate>
      <input type="hidden" name="tipo" value="fijo" />

      <div class="form-group">
        <label for="gfijo-categoria" class="label">Categoría</label>
        <select id="gfijo-categoria" name="categoria" class="input">
          <option value="">Seleccionar…</option>
          ${catOpts}
        </select>
      </div>

      <div class="form-group" id="form-group-gfijo-icono" hidden>
        ${renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'gfijo-icono', label: 'Ícono' })}
      </div>

      <div class="form-group">
        <label for="gfijo-descripcion" class="label" id="gfijo-descripcion-label">Descripción</label>
        <input id="gfijo-descripcion" name="descripcion" class="input" type="text"
               placeholder="Ej. Arriendo, Netflix, agua" required aria-required="true"
               autocomplete="off" />
      </div>

      <div class="form-group">
        <label for="gfijo-monto" class="label">Monto (COP)</label>
        <input id="gfijo-monto" name="monto" class="input" type="number"
               min="1" step="1000" placeholder="0" required aria-required="true"
               autocomplete="off" />
      </div>

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

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar gasto fijo</button>
      </div>
    </form>`;
}

