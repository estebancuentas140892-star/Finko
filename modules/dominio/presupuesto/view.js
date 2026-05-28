/**
 * presupuesto/view.js - generación de HTML para el dominio de presupuesto.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S }                  from '../../core/state.js';
import { f }                  from '../../infra/utils.js';
import { CATEGORIAS_GASTO }   from '../../core/constants.js';
import {
  presupuestosActivos,
  calcularProgreso,
  totalAsignadoMensual,
  categoriasSinPresupuesto,
  tienePresupuesto,
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
    <section class="presupuesto-hero" aria-label="Resumen del presupuesto del mes">
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
             aria-label="Uso total del presupuesto: ${porcentaje}%">
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
                aria-label="Editar presupuesto de ${categoria}">Editar</button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-presupuesto"
                data-id="${_esc(presupuesto.id)}"
                aria-label="Eliminar presupuesto de ${categoria}">✕</button>
      </div>
    </article>`;
}

// ── CATEGORÍAS HUÉRFANAS ─────────────────────────────────────────

function _renderSinPresupuesto(presupuestos) {
  const ahora = new Date();
  const huerfanas = categoriasSinPresupuesto(presupuestos, S.gastos, ahora.getFullYear(), ahora.getMonth() + 1);
  if (huerfanas.length === 0) return '';

  return `
    <section class="envelope-huerfanas" aria-label="Categorías con gastos sin presupuesto">
      <h3 class="envelope-huerfanas__title">Categorías con gastos del mes sin presupuesto asignado</h3>
      <ul class="envelope-huerfanas__list">
        ${huerfanas.map(h => `
          <li>
            <span class="envelope-huerfanas__cat">${_esc(h.categoria)}</span>
            <span class="envelope-huerfanas__monto">${f(h.gastado)}</span>
          </li>
        `).join('')}
      </ul>
      <p class="envelope-huerfanas__hint">Asignales un presupuesto para hacer seguimiento mensual.</p>
    </section>`;
}

// ── EMPTY STATE ──────────────────────────────────────────────────

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <p class="empty-state__icon" aria-hidden="true">📩</p>
      <p class="empty-state__title">Sin presupuestos</p>
      <p class="empty-state__desc">Asigná un monto mensual por categoría, por ejemplo, $500.000 para Alimentación, y Finko te va a avisar cuando te acerques al límite.</p>
      <button class="btn btn-primary" data-action="nuevo-presupuesto">+ Crear presupuesto</button>
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
      return `<option value="${_esc(c)}" ${selected}>${_esc(c)}</option>`;
    })
    .join('');

  return `
    <form id="form-presupuesto" novalidate ${editando ? `data-id="${_esc(actual.id)}"` : ''}>
      <div class="form-group">
        <label for="presupuesto-categoria" class="label">Categoría</label>
        <select id="presupuesto-categoria" name="categoria" class="input" required aria-required="true"
                ${editando ? 'disabled' : ''}>
          <option value="">Elegí una categoría…</option>
          ${opciones}
        </select>
        ${editando
          ? '<p class="form-hint">La categoría no se puede cambiar. Si necesitás otra, eliminá este presupuesto y creá uno nuevo.</p>'
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
        <button type="submit" class="btn btn-primary">${editando ? 'Guardar cambios' : 'Crear presupuesto'}</button>
      </div>
    </form>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

function _claseProgreso(porcentaje) {
  if (porcentaje > 100) return 'progress-bar--danger';
  if (porcentaje >= 75) return 'progress-bar--warn';
  return '';
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
