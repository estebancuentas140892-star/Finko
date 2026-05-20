/**
 * gastos/view.js - generación de HTML para el dominio de gastos.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, hoy } from '../../infra/utils.js';
import { CATEGORIAS_GASTO } from '../../core/constants.js';
import { gastosMes, totalGastosMes } from './logic.js';

// ── BENTO CELL (dashboard) ───────────────────────────────────────

/**
 * Actualiza el display `#gastos-mes` en el dashboard.
 * No-op si el elemento no existe.
 */
export function renderResumenGastos() {
  const el = document.getElementById('gastos-mes');
  if (!el) return;
  const fechaHoy = hoy();
  const anio = Number(fechaHoy.slice(0, 4));
  const mes  = Number(fechaHoy.slice(5, 7));
  el.textContent = f(totalGastosMes(S.gastos, anio, mes));
}

// ── LISTA DE GASTOS ──────────────────────────────────────────────

/**
 * Renderiza la lista de gastos en `#lista-gastos`.
 * No-op si el contenedor no existe.
 */
export function renderListaGastos() {
  const el = document.getElementById('lista-gastos');
  if (!el) return;

  const fechaHoy = hoy();
  const anio = Number(fechaHoy.slice(0, 4));
  const mes  = Number(fechaHoy.slice(5, 7));
  const delMes = gastosMes(S.gastos, anio, mes);

  el.innerHTML = delMes.length === 0
    ? _renderEmptyState()
    : delMes.map(_renderGastoItem).join('');
}

/** @param {import('../../core/state.js').Gasto} gasto */
function _renderGastoItem(gasto) {
  // Un gasto sin descripcion (o con flag pendienteCompletar) es uno que se
  // registro con "Gasto rapido" y todavia no se completo. Muestra un placeholder
  // y un badge para que el usuario sepa que esta pendiente de describir.
  const sinCompletar = gasto.pendienteCompletar === true || !gasto.descripcion?.trim();
  const desc = sinCompletar
    ? '<span class="list-item__placeholder">Sin completar</span>'
    : _esc(gasto.descripcion);
  const cat  = _esc(gasto.categoria ?? 'Otros');
  const nota = gasto.nota ? ` · ${_esc(gasto.nota)}` : '';
  const badge = sinCompletar
    ? '<span class="badge badge--warn" title="Tocá editar para completar este gasto">📝 Pendiente</span> '
    : '';

  return `
    <article class="list-item" data-id="${_esc(gasto.id)}">
      <div class="list-item__icon" aria-hidden="true">💸</div>
      <div class="list-item__body">
        <p class="list-item__title">${badge}${desc}</p>
        <p class="list-item__subtitle">${cat} · ${_esc(gasto.fecha)}${nota}</p>
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount">${f(gasto.monto)}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="editar-gasto"
                data-id="${_esc(gasto.id)}"
                aria-label="Editar gasto">✎</button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-gasto"
                data-id="${_esc(gasto.id)}"
                aria-label="Eliminar gasto">✕</button>
      </div>
    </article>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <p class="empty-state__icon" aria-hidden="true">💸</p>
      <p class="empty-state__title">Sin gastos este mes</p>
      <p class="empty-state__desc">Registrá tus gastos para llevar el control de tu plata.</p>
      <button class="btn btn-primary" data-action="nuevo-gasto">+ Registrar gasto</button>
    </div>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de nuevo gasto.
 *
 * Incluye un selector de cuenta obligatorio y un display reactivo
 * `#gasto-saldo-disponible` que muestra el saldo de la cuenta elegida
 * (lo actualiza el listener `change` en `gastos/index.js`).
 *
 * @returns {string}
 */
export function renderFormGasto() {
  const catOpts = CATEGORIAS_GASTO
    .map(c => `<option value="${_esc(c)}">${_esc(c)}</option>`)
    .join('');

  const cuentas = S.cuentas.filter(c => c.activa !== false);
  const cuentaOpts = cuentas
    .map(c => `<option value="${_esc(c.id)}">${_esc(c.nombre)}</option>`)
    .join('');

  // Si no hay cuentas activas, mostramos un estado vacío en lugar del form.
  // El gasto no puede existir sin cuenta de origen.
  if (cuentas.length === 0) {
    return `
      <div class="form-empty">
        <p class="form-empty__icon" aria-hidden="true">🏦</p>
        <p class="form-empty__title">Primero necesitás una cuenta</p>
        <p class="form-empty__desc">Para registrar un gasto, agregá al menos una cuenta o billetera en la sección Tesorería. Así sabés de dónde sale la plata.</p>
        <a class="btn btn-primary" href="#tesor" data-action="modal-close">Ir a Tesorería</a>
      </div>`;
  }

  return `
    <form id="form-gasto" novalidate>
      <div class="form-group">
        <label for="gasto-descripcion" class="label">Descripción</label>
        <input id="gasto-descripcion" name="descripcion" class="input" type="text"
               placeholder="Ej. Almuerzo en restaurante" required aria-required="true" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="gasto-cuenta" class="label">De qué cuenta sale</label>
        <select id="gasto-cuenta" name="cuentaId" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${cuentaOpts}
        </select>
        <p id="gasto-saldo-disponible" class="form-hint form-hint--muted" aria-live="polite">
          Elegí una cuenta para ver el saldo disponible.
        </p>
      </div>
      <div class="form-group">
        <label for="gasto-monto" class="label">Monto (COP)</label>
        <input id="gasto-monto" name="monto" class="input" type="number"
               min="1" step="1000" placeholder="0" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="gasto-categoria" class="label">Categoría</label>
        <select id="gasto-categoria" name="categoria" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${catOpts}
        </select>
      </div>
      <div class="form-group">
        <label for="gasto-fecha" class="label">Fecha</label>
        <input id="gasto-fecha" name="fecha" class="input" type="date"
               required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="gasto-nota" class="label">Nota (opcional)</label>
        <input id="gasto-nota" name="nota" class="input" type="text"
               placeholder="Detalle adicional" autocomplete="off" />
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar gasto</button>
      </div>
    </form>`;
}

// ── HELPER ───────────────────────────────────────────────────────

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
