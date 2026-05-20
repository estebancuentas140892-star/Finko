/**
 * agenda/view.js - render del dominio Agenda (calendario mensual).
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (delega a logic.js).
 *
 * Estado local de la vista:
 *   _viewYear / _viewMonth identifican el mes actualmente visualizado.
 *   Mutado solo por navegarMes() y resetearVistaAlMesActual().
 */

import { S } from '../../core/state.js';
import { eventosDelMes, totalEventosDelMes } from './logic.js';

// ── ESTADO LOCAL ─────────────────────────────────────────────────

let _viewYear  = null;
let _viewMonth = null;

const MONTHS = [
  'Enero',     'Febrero', 'Marzo',   'Abril',
  'Mayo',      'Junio',   'Julio',   'Agosto',
  'Septiembre','Octubre', 'Noviembre','Diciembre',
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
  _viewYear  = y;
  _viewMonth = m;
}

/** Lleva la vista al mes actual real (botón "hoy" futuro o test setup). */
export function resetearVistaAlMesActual() {
  const hoy = new Date();
  _viewYear  = hoy.getFullYear();
  _viewMonth = hoy.getMonth();
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
  const eventos     = eventosDelMes(compromisos, _viewYear, _viewMonth);

  el.innerHTML = `
    <article class="cal-card">
      ${_renderCabecera(_viewYear, _viewMonth, eventos)}
      ${_renderDiasSemana()}
      ${_renderGrid(_viewYear, _viewMonth, eventos)}
    </article>
    ${_renderLeyenda()}`;
}

// ── PARTES ───────────────────────────────────────────────────────

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
    const evs    = eventos[d] || [];
    const hayEvs = evs.length > 0;
    const esHoy  = esMesActual && d === diaHoy;
    const esPasado = esMesActual && d < diaHoy;

    const cls = [
      'cal-day',
      esHoy   && 'cal-day--today',
      hayEvs  && 'cal-day--has-events',
      esPasado && !esHoy && 'cal-day--past',
    ].filter(Boolean).join(' ');

    const aria = hayEvs
      ? `Día ${d}, ${evs.length} ${evs.length === 1 ? 'compromiso' : 'compromisos'}`
      : `Día ${d}, sin compromisos`;

    html += `
      <button type="button" class="${cls}"
              role="gridcell"
              aria-label="${aria}"
              data-action="agenda-mostrar-dia"
              data-day="${d}">
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

function _renderLeyenda() {
  return `
    <div class="cal-legend" aria-label="Leyenda de tipos">
      <span class="cal-legend__item">
        <span class="cal-dot cal-dot--fijo" aria-hidden="true"></span> Fijo
      </span>
      <span class="cal-legend__item">
        <span class="cal-dot cal-dot--deuda" aria-hidden="true"></span> Deuda
      </span>
      <span class="cal-legend__item">
        <span class="cal-dot cal-dot--agenda" aria-hidden="true"></span> Agenda
      </span>
    </div>`;
}
