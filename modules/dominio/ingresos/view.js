/**
 * ingresos/view.js - generación de HTML para el dominio de ingresos.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 *
 * Ingresos ya no tiene sección propia. Vive como card compacta
 * dentro de Tesorería (#panel-ingresos-card).
 */

import { S } from '../../core/state.js';
import { f } from '../../infra/utils.js';
import { FRECUENCIAS } from '../../core/constants.js';
import { ingresosActivos, calcularTotalMensual, calcularIngresoMensual } from './logic.js';

// ── BENTO CELL (dashboard) ───────────────────────────────────────

/**
 * Actualiza el display `#ingresos-mes` en el dashboard.
 * No-op si el elemento no existe.
 */
export function renderResumenIngresos() {
  const el = document.getElementById('ingresos-mes');
  if (!el) return;
  el.textContent = f(calcularTotalMensual(S.ingresos));
}

// ── CARD EN TESORERÍA ────────────────────────────────────────────

/**
 * Renderiza la card compacta de ingresos en `#panel-ingresos-card` (dentro de Tesorería).
 * Muestra el total mensual, la lista de ingresos activos y el botón para agregar.
 * No-op si el contenedor no existe.
 */
export function renderCardIngresos() {
  const el = document.getElementById('panel-ingresos-card');
  if (!el) return;

  const activos = ingresosActivos(S.ingresos);
  const total   = calcularTotalMensual(S.ingresos);

  const lista = activos.length === 0
    ? `<p class="ingresos-card__empty">Todavía no registraste ingresos.</p>`
    : activos.map(_renderIngresoItem).join('');

  el.innerHTML = `
    <section class="ingresos-card" aria-labelledby="ingresos-card-title">
      <div class="ingresos-card__header">
        <h2 class="ingresos-card__title" id="ingresos-card-title">💰 Mis ingresos</h2>
        <div class="ingresos-card__meta">
          ${total > 0 ? `<span class="ingresos-card__total">${f(total)}/mes</span>` : ''}
          <button class="btn btn-ghost btn-sm" data-action="nuevo-ingreso"
                  aria-label="Registrar nuevo ingreso">+ Agregar</button>
        </div>
      </div>
      <div class="ingresos-card__list" role="list">
        ${lista}
      </div>
    </section>`;
}

// ── ITEMS ────────────────────────────────────────────────────────

/** @param {import('../../core/state.js').Ingreso} ingreso */
function _renderIngresoItem(ingreso) {
  const desc    = _esc(ingreso.descripcion);
  const frec    = _esc(ingreso.frecuencia);
  const mensual = calcularIngresoMensual(ingreso);

  return `
    <article class="list-item" role="listitem" data-id="${_esc(ingreso.id)}">
      <div class="list-item__icon" aria-hidden="true">💰</div>
      <div class="list-item__body">
        <p class="list-item__title">${desc}</p>
        <p class="list-item__subtitle">${frec} · ${f(ingreso.monto)} c/vez
          ${mensual !== ingreso.monto ? `· ${f(mensual)}/mes` : ''}
        </p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-ingreso"
                data-id="${_esc(ingreso.id)}"
                aria-label="Eliminar ingreso ${desc}">✕</button>
      </div>
    </article>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de nuevo ingreso.
 * @returns {string}
 */
export function renderFormIngreso() {
  const frecOpts = FRECUENCIAS
    .map(fr => `<option value="${_esc(fr)}">${_esc(fr)}</option>`)
    .join('');

  return `
    <form id="form-ingreso" novalidate>
      <div class="form-group">
        <label for="ingreso-descripcion" class="label">Descripción</label>
        <input id="ingreso-descripcion" name="descripcion" class="input" type="text"
               placeholder="Ej. Salario quincenal" required aria-required="true" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="ingreso-monto" class="label">Monto (COP)</label>
        <input id="ingreso-monto" name="monto" class="input" type="number"
               min="1" step="1000" placeholder="0" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="ingreso-frecuencia" class="label">Frecuencia</label>
        <select id="ingreso-frecuencia" name="frecuencia" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${frecOpts}
        </select>
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar ingreso</button>
      </div>
    </form>`;
}

// ── HELPER ───────────────────────────────────────────────────────

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
