/**
 * tesoreria/view.js — generación de HTML para el módulo de tesorería.
 *
 * Reglas:
 * - Puede leer S. No puede mutarlo.
 * - Devuelve strings HTML o escribe en el DOM (no ambas cosas en la misma función).
 * - Sin lógica de negocio: delegar a logic.js.
 */

import { S } from '../../core/state.js';
import { f } from '../../infra/utils.js';
import { BANCOS_CO, TIPOS_CUENTA } from '../../core/constants.js';
import { cuentasActivas } from './logic.js';

// ── LISTA DE CUENTAS ─────────────────────────────────────────────

/**
 * Renderiza la lista de cuentas en `#lista-tesoreria`.
 * No-op si el contenedor no existe (sección no montada).
 */
export function renderListaCuentas() {
  const el = document.getElementById('lista-tesoreria');
  if (!el) return;

  const cuentas = cuentasActivas(S.cuentas);
  el.innerHTML = cuentas.length === 0
    ? _renderEmptyState()
    : cuentas.map(_renderCuentaItem).join('');
}

/**
 * @param {import('../../core/state.js').Cuenta} cuenta
 * @returns {string}
 */
function _renderCuentaItem(cuenta) {
  const nombre = _esc(cuenta.nombre);
  const banco  = _esc(cuenta.banco);
  const tipo   = _esc(cuenta.tipo);
  const icono  = _esc(cuenta.icono ?? '🏦');

  return `
    <article class="list-item" data-id="${_esc(cuenta.id)}">
      <div class="list-item__icon" aria-hidden="true">${icono}</div>
      <div class="list-item__body">
        <p class="list-item__title">${nombre}</p>
        <p class="list-item__subtitle">${banco} · ${tipo}</p>
      </div>
      <div class="list-item__action">
        <p class="list-item__value">${f(cuenta.saldo)}</p>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-cuenta"
                data-id="${_esc(cuenta.id)}"
                aria-label="Eliminar cuenta ${nombre}">✕</button>
      </div>
    </article>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <p class="empty-state__icon" aria-hidden="true">🏦</p>
      <p class="empty-state__title">Sin cuentas todavía</p>
      <p class="empty-state__desc">Agregá tu primera cuenta para ver tu saldo total.</p>
      <button class="btn btn-primary" data-action="nueva-cuenta">
        + Agregar cuenta
      </button>
    </div>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de nueva cuenta para inyectar en `#modal-cuenta-body`.
 * La función es pura: no toca el DOM.
 *
 * @returns {string}
 */
export function renderFormCuenta() {
  const bancoOpts = BANCOS_CO
    .map(b => `<option value="${_esc(b)}">${_esc(b)}</option>`)
    .join('');
  const tipoOpts = TIPOS_CUENTA
    .map(t => `<option value="${_esc(t)}">${_esc(t)}</option>`)
    .join('');

  return `
    <form id="form-cuenta" novalidate>
      <div class="form-group">
        <label for="cuenta-nombre" class="label">Nombre de la cuenta</label>
        <input id="cuenta-nombre" name="nombre" class="input" type="text"
               placeholder="Ej. Ahorros Davivienda"
               required aria-required="true" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="cuenta-banco" class="label">Banco o billetera</label>
        <select id="cuenta-banco" name="banco" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${bancoOpts}
        </select>
      </div>
      <div class="form-group">
        <label for="cuenta-tipo" class="label">Tipo de cuenta</label>
        <select id="cuenta-tipo" name="tipo" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${tipoOpts}
        </select>
      </div>
      <div class="form-group">
        <label for="cuenta-saldo" class="label">Saldo actual (COP)</label>
        <input id="cuenta-saldo" name="saldo" class="input" type="number"
               min="0" step="1000" placeholder="0" value="0" />
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">
          Cancelar
        </button>
        <button type="submit" class="btn btn-primary">
          Guardar cuenta
        </button>
      </div>
    </form>`;
}

// ── HELPER ───────────────────────────────────────────────────────

/** Escapa caracteres HTML para evitar XSS en valores dinámicos. */
function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
