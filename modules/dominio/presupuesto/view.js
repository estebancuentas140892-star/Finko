/**
 * presupuesto/view.js - generación de HTML para el dominio de presupuesto.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S }                  from '../../core/state.js';
import { f, esc as _esc }     from '../../infra/utils.js';
import { icon, emptyArt }     from '../../infra/icons.js';
import { CATEGORIAS_GASTO, CATEGORIA_EMOJI } from '../../core/constants.js';
import {
  presupuestosActivos,
  calcularProgreso,
  totalAsignadoMensual,
  categoriasSinPresupuesto,
  tienePresupuesto,
  alertasLimites,
} from './logic.js';

// ── RESUMEN + LISTA ──────────────────────────────────────────────

/**
 * Renderiza el panel completo de presupuesto en `#panel-presupuesto`.
 * Incluye: hero (totales del mes), lista de envelopes, categorías huérfanas.
 * No-op si el contenedor no existe.
 */
export function renderPanelPresupuesto() {
  const el = document.getElementById('panel-presupuesto');
  if (!el) return;

  const ahora = new Date();
  const anio  = ahora.getFullYear();
  const mes   = ahora.getMonth() + 1;

  const activos = presupuestosActivos(S.presupuestos);

  el.innerHTML = `
    ${_renderHero(activos, S.gastos, anio, mes)}
    ${activos.length === 0
      ? _renderEmptyState()
      : `<div class="envelope-list">${activos.map(p => _renderEnvelope(p, S.gastos, anio, mes)).join('')}</div>`
    }
    ${_renderSinPresupuesto(activos)}
  `;
}

// ── HERO ─────────────────────────────────────────────────────────

function _renderHero(presupuestos, gastos, anio, mes) {
  const asignado = totalAsignadoMensual(presupuestos);
  const gastado  = presupuestos.reduce((acc, p) => {
    return acc + calcularProgreso(p, gastos, anio, mes).gastado;
  }, 0);
  const restante   = asignado - gastado;
  const porcentaje = asignado > 0 ? Math.round((gastado / asignado) * 100) : 0;

  return `
    <section class="presupuesto-hero" aria-label="Resumen de tus límites de gasto del mes">
      <div class="presupuesto-hero__totales">
        <div class="presupuesto-hero__metric">
          <span class="presupuesto-hero__label">Asignado</span>
          <span class="presupuesto-hero__value">${f(asignado)}</span>
        </div>
        <div class="presupuesto-hero__metric">
          <span class="presupuesto-hero__label">Gastado</span>
          <span class="presupuesto-hero__value">${f(gastado)}</span>
        </div>
        <div class="presupuesto-hero__metric">
          <span class="presupuesto-hero__label">Restante</span>
          <span class="presupuesto-hero__value ${restante < 0 ? 'is-negative' : ''}">${f(restante)}</span>
        </div>
      </div>
      ${asignado > 0 ? `
        <div class="progress" role="progressbar"
             aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"
             aria-label="Uso total de tus límites de gasto: ${porcentaje}%">
          <div class="progress-bar ${_claseProgreso(porcentaje)}" style="width:${Math.min(porcentaje, 100)}%"></div>
        </div>
      ` : ''}
    </section>`;
}

// ── ENVELOPE INDIVIDUAL ──────────────────────────────────────────

/**
 * @param {import('../../core/state.js').Presupuesto} presupuesto
 * @param {import('../../core/state.js').Gasto[]} gastos
 */
function _renderEnvelope(presupuesto, gastos, anio, mes) {
  const { gastado, asignado, restante, porcentaje, estado } = calcularProgreso(presupuesto, gastos, anio, mes);
  const categoria = _esc(presupuesto.categoria);
  const widthVisual = Math.min(porcentaje, 100);
  const estadoIcono = estado === 'excedido' ? '⚠️ ' : estado === 'alerta' ? '⏰ ' : '';

  return `
    <article class="envelope" data-id="${_esc(presupuesto.id)}" data-estado="${estado}">
      <div class="envelope__header">
        <p class="envelope__title">${estadoIcono}${categoria}</p>
        <p class="envelope__subtitle">${f(gastado)} / ${f(asignado)}</p>
      </div>
      <div class="progress" role="progressbar"
           aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"
           aria-label="Progreso de ${categoria}: ${porcentaje}%">
        <div class="progress-bar ${_claseProgreso(porcentaje)}" style="width:${widthVisual}%"></div>
      </div>
      <p class="envelope__meta">
        <span class="envelope__porcentaje">${porcentaje}%</span>
        ${restante >= 0
          ? `· Restante: ${f(restante)}`
          : `· Excedido: <strong>${f(-restante)}</strong>`}
      </p>
      <div class="envelope__actions">
        <button class="btn btn-ghost btn-sm"
                data-action="editar-presupuesto"
                data-id="${_esc(presupuesto.id)}"
                aria-label="Editar límite de gasto de ${categoria}">Editar</button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-presupuesto"
                data-id="${_esc(presupuesto.id)}"
                aria-label="Eliminar límite de gasto de ${categoria}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

// ── CATEGORÍAS HUÉRFANAS ─────────────────────────────────────────

function _renderSinPresupuesto(presupuestos) {
  const ahora = new Date();
  const huerfanas = categoriasSinPresupuesto(presupuestos, S.gastos, ahora.getFullYear(), ahora.getMonth() + 1);
  if (huerfanas.length === 0) return '';

  return `
    <section class="envelope-huerfanas" aria-label="Categorías con gastos sin límite asignado">
      <h3 class="envelope-huerfanas__title">Categorías con gastos del mes sin límite asignado</h3>
      <ul class="envelope-huerfanas__list">
        ${huerfanas.map(h => `
          <li>
            <span class="envelope-huerfanas__cat">${_esc(h.categoria)}</span>
            <span class="envelope-huerfanas__monto">${f(h.gastado)}</span>
          </li>
        `).join('')}
      </ul>
      <p class="envelope-huerfanas__hint">Asígnales un límite para hacer seguimiento mensual.</p>
    </section>`;
}

// ── EMPTY STATE ──────────────────────────────────────────────────

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('presupuesto')}</div>
      <p class="empty-state__title">Sin límites de gasto</p>
      <p class="empty-state__desc">Pon un tope mensual por categoría, por ejemplo, $500.000 para Alimentación, y Finko te avisa cuando te acerques al límite.</p>
      <button class="btn btn-primary" data-action="nuevo-presupuesto">+ Crear límite</button>
      <p class="empty-state__tip">${icon('lightbulb')} Tip: empieza con 2 o 3 categorías donde más gastas. Finko muestra el avance en tiempo real cada vez que registras un gasto.</p>
      <p class="empty-state__tip empty-state__tip--muted">¿Quieres reunir dinero para un gasto que viene (SOAT, vacaciones)? Eso va en Apartados. Aquí solo le pones un tope a lo que gastas.</p>
    </div>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * HTML del formulario de creación/edición.
 * Si se pasa un presupuesto, el formulario viene pre-llenado para editar.
 *
 * @param {import('../../core/state.js').Presupuesto|null} [actual=null]
 * @returns {string}
 */
export function renderFormPresupuesto(actual = null) {
  const editando = !!actual;
  const opciones = CATEGORIAS_GASTO
    .filter(c => editando ? true : !tienePresupuesto(c, S.presupuestos))
    .map(c => {
      const selected = editando && actual.categoria === c ? 'selected' : '';
      return `<option value="${_esc(c)}" ${selected}>${CATEGORIA_EMOJI[c] ?? ''} ${_esc(c)}</option>`;
    })
    .join('');

  return `
    <form id="form-presupuesto" novalidate ${editando ? `data-id="${_esc(actual.id)}"` : ''}>
      <div class="form-group">
        <label for="presupuesto-categoria" class="label">Categoría</label>
        <select id="presupuesto-categoria" name="categoria" class="input" required aria-required="true"
                ${editando ? 'disabled' : ''}>
          <option value="">Elige una categoría…</option>
          ${opciones}
        </select>
        ${editando
          ? '<p class="form-hint">La categoría no se puede cambiar. Si necesitas otra, elimina este límite y crea uno nuevo.</p>'
          : ''}
      </div>
      <div class="form-group">
        <label for="presupuesto-monto" class="label">Monto mensual (COP)</label>
        <input id="presupuesto-monto" name="montoMensual" class="input" type="number"
               min="1" step="10000" required aria-required="true"
               value="${editando ? actual.montoMensual : ''}"
               placeholder="500000" />
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${editando ? 'Guardar cambios' : 'Crear límite'}</button>
      </div>
    </form>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

function _claseProgreso(porcentaje) {
  if (porcentaje > 100) return 'progress-bar--danger';
  if (porcentaje >= 75) return 'progress-bar--warn';
  return '';
}

// ── PANEL DE ALERTAS EN DASHBOARD ───────────────────────────────

/**
 * Renderiza en `#panel-limites` las alertas de límites de gasto del mes actual.
 * Solo aparece cuando hay envelopes en estado 'alerta' (>=75%) o 'excedido' (>100%).
 * No-op si el contenedor no existe.
 */
export function renderPanelLimites() {
  const el = document.getElementById('panel-limites');
  if (!el) return;

  const hoy    = new Date();
  const anio   = hoy.getFullYear();
  const mes    = hoy.getMonth() + 1;
  const alertas = alertasLimites(S.presupuestos ?? [], S.gastos ?? [], anio, mes);

  if (alertas.length === 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const items = alertas.map(a => {
    const emoji    = CATEGORIA_EMOJI[a.categoria] ?? '📦';
    const cls      = a.estado === 'excedido' ? 'excedido' : 'alerta';
    const badgeTxt = a.estado === 'excedido'
      ? `Superado ${a.porcentaje}%`
      : `${a.porcentaje}% usado`;
    const sub = a.estado === 'excedido'
      ? `Gastaste ${f(a.gastado)} de ${f(a.asignado)} (${f(a.gastado - a.asignado)} extra)`
      : `Te quedan ${f(a.asignado - a.gastado)} de ${f(a.asignado)}`;

    return `
      <li class="limites-card__item">
        <div class="limites-card__body">
          <p class="limites-card__name">${emoji} ${_esc(a.categoria)}</p>
          <p class="limites-card__sub">${sub}</p>
        </div>
        <span class="limites-card__badge limites-card__badge--${cls}">${badgeTxt}</span>
      </li>`;
  }).join('');

  const n      = alertas.length;
  const titulo = n === 1 ? '1 límite de gasto en alerta' : `${n} límites de gasto en alerta`;

  el.innerHTML = `
    <section class="limites-card" aria-label="Alertas de límites de gasto">
      <header class="limites-card__header">
        <h2 class="limites-card__title">${icon('presupuesto')} ${titulo}</h2>
        <a href="#presupuesto" class="limites-card__link" aria-label="Ir a Límites de gasto">Ver todos</a>
      </header>
      <ul class="limites-card__list" role="list">
        ${items}
      </ul>
    </section>`;
}
