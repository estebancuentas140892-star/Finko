/**
 * agenda/view.js - render del dominio Agenda (calendario mensual).
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (delega a logic.js).
 *
 * Estado local de la vista:
 *   _viewYear / _viewMonth identifican el mes actualmente visualizado.
 *   _diaSeleccionado     identifica el día con detalle expandido (o null).
 *   Mutado solo por navegarMes(), resetearVistaAlMesActual() y mostrarDia().
 */

import { S } from '../../core/state.js';
import { f } from '../../infra/utils.js';
import { LABEL_TIPO, ICONO_TIPO } from '../compromisos/logic.js';
import { eventosDelMes, totalEventosDelMes, eventosDeHoy, eventosEnProximos } from './logic.js';

// ── ESTADO LOCAL ─────────────────────────────────────────────────

let _viewYear         = null;
let _viewMonth        = null;
let _diaSeleccionado  = null;

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

  // Si el día seleccionado se quedó sin eventos (ej. usuario eliminó el
  // compromiso desde otra sección), cerramos el detalle para no mostrar
  // un panel vacío.
  if (_diaSeleccionado !== null && !(eventos[_diaSeleccionado]?.length > 0)) {
    _diaSeleccionado = null;
  }

  const detalleHtml = _diaSeleccionado !== null
    ? _renderDetalleDia(eventos[_diaSeleccionado], _viewYear, _viewMonth, _diaSeleccionado)
    : '';

  el.innerHTML = `
    <article class="cal-card">
      ${_renderCabecera(_viewYear, _viewMonth, eventos)}
      ${_renderDiasSemana()}
      ${_renderGrid(_viewYear, _viewMonth, eventos)}
    </article>
    ${detalleHtml}
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
      !hayEvs  && 'cal-day--inactive',
    ].filter(Boolean).join(' ');

    const aria = hayEvs
      ? `Día ${d}, ${evs.length} ${evs.length === 1 ? 'compromiso' : 'compromisos'}`
      : `Día ${d}, sin compromisos`;

    // Solo días con eventos son interactivos: tener data-action sólo en
    // ellos evita "clicks muertos" cuando el día está vacío.
    const actionAttrs = hayEvs
      ? `data-action="agenda-mostrar-dia" data-day="${d}"`
      : 'aria-disabled="true" tabindex="-1"';

    html += `
      <button type="button" class="${cls}"
              role="gridcell"
              aria-label="${aria}"
              ${actionAttrs}>
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

// ── DETALLE DEL DÍA ──────────────────────────────────────────────

function _renderDetalleDia(evs, year, month, dia) {
  const fecha   = new Date(year, month, dia);
  const dow     = DOW_LARGO[fecha.getDay()];
  const titulo  = `${dow} ${dia} de ${MONTHS[month]}`;
  const total   = evs.length;
  const resumen = total === 1 ? '1 compromiso' : `${total} compromisos`;

  const items = evs.map(_renderDetalleItem).join('');

  return `
    <section class="cal-detail" aria-label="Compromisos del ${titulo}">
      <header class="cal-detail__header">
        <div class="cal-detail__title-wrap">
          <h3 class="cal-detail__title">${titulo}</h3>
          <p class="cal-detail__subtitle">${resumen}</p>
        </div>
        <button type="button" class="cal-detail__close"
                data-action="agenda-mostrar-dia"
                data-day="${dia}"
                aria-label="Cerrar detalle del día">×</button>
      </header>
      <ul class="cal-detail__list">
        ${items}
      </ul>
    </section>`;
}

function _renderDetalleItem(c) {
  const tipo  = c.tipo ?? 'fijo';
  const icono = _esc(ICONO_TIPO[tipo] ?? '🔁');
  const label = _esc(LABEL_TIPO[tipo] ?? tipo);
  const desc  = _esc(c.descripcion ?? '(sin descripción)');
  const frec  = _esc(c.frecuencia ?? '');
  const monto = Number.isFinite(Number(c.monto)) ? f(Number(c.monto)) : '';

  return `
    <li class="cal-detail__item">
      <span class="cal-detail__icon cal-detail__icon--${tipo}" aria-hidden="true">${icono}</span>
      <div class="cal-detail__body">
        <p class="cal-detail__name">${desc}</p>
        <p class="cal-detail__sub">${label}${frec ? ` · ${frec}` : ''}</p>
      </div>
      ${monto ? `<p class="cal-detail__amount">${monto}</p>` : ''}
    </li>`;
}

// ── CARD HOY (Dashboard) ─────────────────────────────────────────

/**
 * Renderiza la mini-agenda del día en el Dashboard (#panel-hoy).
 * Muestra los compromisos de hoy o el próximo en los siguientes 14 días.
 * No-op si el contenedor no existe o no hay compromisos activos registrados.
 */
export function renderCardHoy() {
  const el = document.getElementById('panel-hoy');
  if (!el) return;

  const compromisos = Array.isArray(S.compromisos) ? S.compromisos : [];

  // Sin compromisos activos: limpiar el panel para no generar ruido en
  // usuarios nuevos que aún no configuraron nada.
  if (compromisos.filter(c => c.activo !== false).length === 0) {
    el.innerHTML = '';
    return;
  }

  const hoy = new Date();
  const dow = DOW_LARGO[hoy.getDay()];
  const dia = hoy.getDate();
  const mes = MONTHS[hoy.getMonth()];

  const eventosHoy = eventosDeHoy(compromisos);
  let bodyHtml;

  if (eventosHoy.length > 0) {
    const visibles = eventosHoy.slice(0, 3);
    const items = visibles.map(c => {
      const tipo  = c.tipo ?? 'fijo';
      const icono = _esc(ICONO_TIPO[tipo] ?? '🔁');
      const desc  = _esc(c.descripcion ?? '(sin descripción)');
      const monto = Number.isFinite(Number(c.monto)) ? f(Number(c.monto)) : '';
      return `
          <li class="hoy-card__item">
            <span class="hoy-card__dot cal-dot--${tipo}" aria-hidden="true">${icono}</span>
            <span class="hoy-card__name">${desc}</span>
            ${monto ? `<span class="hoy-card__amount">${monto}</span>` : ''}
          </li>`;
    }).join('');

    const mas = eventosHoy.length > 3
      ? `<li class="hoy-card__more">+${eventosHoy.length - 3} más</li>`
      : '';

    bodyHtml = `<ul class="hoy-card__list" role="list">${items}${mas}</ul>`;
  } else {
    const prox = eventosEnProximos(compromisos, 14);
    if (prox) {
      const nombre  = _esc(prox.eventos[0]?.descripcion ?? 'compromiso');
      const cuantos = prox.diasRestantes === 1 ? 'mañana' : `en ${prox.diasRestantes} días`;
      bodyHtml = `
        <p class="hoy-card__empty">Sin compromisos hoy.
          <span class="hoy-card__prox">Próximo: <strong>${nombre}</strong> ${cuantos}.</span>
        </p>`;
    } else {
      bodyHtml = `<p class="hoy-card__empty">Sin compromisos próximos. 🎉</p>`;
    }
  }

  el.innerHTML = `
    <div class="hoy-card">
      <div class="hoy-card__header">
        <h2 class="hoy-card__title">📅 Hoy, ${dow} ${dia} de ${mes}</h2>
        <a href="#agenda" class="hoy-card__link" aria-label="Ir a la agenda completa">Ver agenda</a>
      </div>
      <div class="hoy-card__body">
        ${bodyHtml}
      </div>
    </div>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
