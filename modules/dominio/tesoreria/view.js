/**
 * tesoreria/view.js - generación de HTML para el módulo de tesorería.
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
  const nombre   = _esc(cuenta.nombre);
  const banco    = _esc(cuenta.banco);
  const tipo     = _esc(cuenta.tipo);
  const subtitulo = banco === tipo ? banco : `${banco} · ${tipo}`;

  // Si la cuenta tiene cuota de manejo, mostramos un hint adicional para que
  // el usuario sepa que hay un compromiso vinculado descontandose mes a mes.
  const cuotaHint = cuenta.cuotaManejo
    ? `<p class="list-item__hint">📅 Cuota de manejo: ${f(cuenta.cuotaManejo.monto)} el día ${cuenta.cuotaManejo.diaCobro}</p>`
    : '';

  // Hint informativo si la cuenta está sujeta al GMF (4x1000).
  const gmfHint = cuenta.aplica4x1000
    ? `<p class="list-item__hint">💸 Aplica 4x1000 (GMF)</p>`
    : '';

  return `
    <article class="list-item" data-id="${_esc(cuenta.id)}">
      <div class="list-item__icon" aria-hidden="true">${_bankAvatarHtml(cuenta.banco)}</div>
      <div class="list-item__body">
        <p class="list-item__title">${nombre}</p>
        <p class="list-item__subtitle">${subtitulo}</p>
        ${cuotaHint}
        ${gmfHint}
      </div>
      <div class="list-item__meta">
        <p class="list-item__value">${f(cuenta.saldo)}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="editar-cuenta"
                data-id="${_esc(cuenta.id)}"
                aria-label="Editar cuenta ${nombre}">✎</button>
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
      <p class="empty-state__title">¿Dónde guardás tu plata?</p>
      <p class="empty-state__desc">Agregá tus cuentas bancarias, billeteras digitales o efectivo para ver tu saldo real en el dashboard.</p>
      <button class="btn btn-primary" data-action="nueva-cuenta">+ Agregar cuenta</button>
      <p class="empty-state__tip">💡 Tip: Nequi, Daviplata y el efectivo también cuentan. Todo lo que tenés, en un solo lugar.</p>
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
  const bancoItems = BANCOS_CO.map(b => `
    <li role="option"
        class="bank-picker__item"
        data-value="${_esc(b.id)}"
        aria-selected="false"
        tabindex="-1">
      ${_bankAvatarHtml(b.id)}
      <span>${_esc(b.id)}</span>
    </li>`).join('');

  const tipoOpts = TIPOS_CUENTA
    .map(t => `<option value="${_esc(t)}">${_esc(t)}</option>`)
    .join('');

  return `
    <form id="form-cuenta" novalidate>
      <div class="form-group">
        <label id="label-banco" class="label">Banco o billetera</label>
        <div class="bank-picker"
             role="combobox"
             aria-expanded="false"
             aria-haspopup="listbox"
             aria-labelledby="label-banco">
          <button type="button"
                  class="bank-picker__trigger"
                  aria-controls="banco-list"
                  aria-expanded="false">
            <span class="bank-picker__display">
              <span class="bank-picker__placeholder">Seleccionar…</span>
            </span>
            <span class="bank-picker__chevron" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </button>
          <input type="hidden" name="banco" value="" />
          <ul class="bank-picker__list"
              id="banco-list"
              role="listbox"
              aria-label="Banco o billetera"
              tabindex="-1"
              hidden>
            ${bancoItems}
          </ul>
        </div>
      </div>

      <div class="form-group" id="form-group-tipo">
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

      <div class="form-group form-group--checkbox" id="form-group-4x1000">
        <label class="checkbox-row">
          <input type="checkbox"
                 id="cuenta-4x1000"
                 name="aplica4x1000" />
          <span>A esta cuenta le aplica el 4x1000 (GMF)</span>
        </label>
        <p class="form-hint form-hint--muted">
          El 4x1000 es un impuesto de $4 por cada $1.000 que retirás o transferís. El efectivo no lo paga.
        </p>
      </div>

      <div class="form-group form-group--checkbox">
        <label class="checkbox-row">
          <input type="checkbox"
                 id="cuenta-cuota-toggle"
                 name="cuotaManejoActiva"
                 data-cuota-toggle />
          <span>Esta cuenta cobra cuota de manejo mensual</span>
        </label>
        <p class="form-hint form-hint--muted">
          Opcional. Si no sabés el monto, dejalo desactivado.
        </p>
      </div>

      <fieldset id="cuenta-cuota-fieldset" class="cuota-fieldset" hidden>
        <div class="form-group">
          <label for="cuenta-cuota-monto" class="label">
            Monto de la cuota (COP)
          </label>
          <input id="cuenta-cuota-monto"
                 name="cuotaManejoMonto"
                 class="input"
                 type="number"
                 min="1"
                 step="100"
                 placeholder="Ej. 15000" />
        </div>
        <div class="form-group">
          <label for="cuenta-cuota-dia" class="label">Día de cobro (1-31)</label>
          <input id="cuenta-cuota-dia"
                 name="cuotaManejoDia"
                 class="input"
                 type="number"
                 min="1" max="31" step="1"
                 placeholder="Ej. 15" />
        </div>
        <p class="form-hint form-hint--muted">
          Finko crea un gasto fijo mensual con este monto y día. Lo vas a ver en Agenda y en Deudas.
        </p>
      </fieldset>

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

// ── HELPERS ──────────────────────────────────────────────────────

/**
 * Devuelve el HTML de un avatar circular con las iniciales y el color
 * corporativo del banco. Si el banco no se encuentra en BANCOS_CO,
 * devuelve un avatar generico con "?" y color gris.
 *
 * @param {string} bancoId - valor guardado en cuenta.banco.
 * @returns {string} HTML span del avatar.
 */
function _bankAvatarHtml(bancoId) {
  const banco = BANCOS_CO.find(b => b.id === bancoId);
  const iniciales = banco ? banco.iniciales : '?';
  const color     = banco ? banco.color     : '#6B7280';
  const texto     = banco ? banco.texto     : '#ffffff';
  return `<span class="bank-avatar"
               style="background:${color};color:${texto}"
               aria-hidden="true">${iniciales}</span>`;
}

/** Escapa caracteres HTML para evitar XSS en valores dinámicos. */
function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
