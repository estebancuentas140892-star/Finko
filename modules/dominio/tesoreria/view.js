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
import {
  cuentasActivas,
  diasParaPrimaSemestral,
  estimarSalarioMensual,
  sugerirDistribucionPrima,
} from './logic.js';

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

  return `
    <article class="list-item" data-id="${_esc(cuenta.id)}">
      <div class="list-item__icon" aria-hidden="true">${_bankAvatarHtml(cuenta.banco)}</div>
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
        <label for="cuenta-nombre" class="label">
          Nombre de la cuenta <span class="label__optional">(opcional)</span>
        </label>
        <input id="cuenta-nombre" name="nombre" class="input" type="text"
               placeholder="Ej. Ahorros Davivienda"
               autocomplete="off" />
        <p class="field-hint">Si lo dejás vacío, usaremos el banco y tipo (ej. "Davivienda Ahorros").</p>
      </div>

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

// ── NUDGE PRIMA DE SERVICIOS (G.3.F8) ───────────────────────────

/**
 * Renderiza la sugerencia de prima en `#nudge-prima` (G.3.F8 + G.3.F9).
 *
 * Estados posibles:
 * - Sin ingresos mensuales: nudge-info pidiendo registrar salario.
 * - Con salario, prima > 30 dias: nudge-info con distribucion sugerida.
 * - Con salario, prima ≤ 30 dias: nudge-medium con countdown + distribucion (G.3.F9).
 * - Con salario, prima ≤ 7 dias:  nudge-high con countdown urgente.
 *
 * No-op si el contenedor no existe.
 */
export function renderNudgePrima() {
  const el = document.getElementById('nudge-prima');
  if (!el) return;

  const salario = estimarSalarioMensual(S.ingresos);

  if (salario === 0) {
    el.innerHTML = `
      <div class="nudge nudge-info" role="note">
        <span class="nudge__icon" aria-hidden="true">🎁</span>
        <div class="nudge__body">
          <p class="nudge__title">Calculá tu prima de servicios</p>
          <p class="nudge__desc">
            Registrá al menos un ingreso mensual en la sección Ingresos
            para ver cuánto te corresponde de prima y cómo distribuirla.
          </p>
        </div>
      </div>`;
    return;
  }

  const tieneDeudas = S.compromisos.some(c => c.activo !== false && c.tipo === 'deuda');
  const dist        = sugerirDistribucionPrima(salario, tieneDeudas);
  const timing      = diasParaPrimaSemestral();
  const esCercana   = timing.dias <= 30;

  // Nivel y icono escalan con la proximidad de la prima.
  const nivel = timing.dias <= 7 ? 'nudge-high'
    : esCercana                  ? 'nudge-medium'
    : 'nudge-info';
  const icono = timing.dias <= 7 ? '⚠️' : '🎁';

  const filaDeudasHtml = dist.deudas > 0
    ? `<p class="nudge__desc">💳 Pago de deudas: <strong>${f(dist.deudas)}</strong> (${dist.deudasPct}%)</p>`
    : '';

  // Titulo e intro cambian según si la prima es inminente o no.
  const tituloHtml = esCercana
    ? `<p class="nudge__title">
        ${timing.dias === 0
          ? 'Tu prima llega hoy'
          : timing.dias === 1
          ? 'Tu prima llega mañana'
          : `Tu prima llega en ${timing.dias} días`}
        (semestre ${timing.semestre})
       </p>`
    : `<p class="nudge__title">Prima estimada este semestre: ${f(dist.prima)}</p>`;

  const introHtml = esCercana
    ? `<p class="nudge__desc">Te corresponden aproximadamente <strong>${f(dist.prima)}</strong> basado en ${f(salario)}/mes. Sugerencia:</p>`
    : `<p class="nudge__desc">Basado en tu ingreso mensual de ${f(salario)}. Sugerencia:</p>`;

  el.innerHTML = `
    <div class="nudge ${nivel}" role="${esCercana ? 'alert' : 'note'}">
      <span class="nudge__icon" aria-hidden="true">${icono}</span>
      <div class="nudge__body">
        ${tituloHtml}
        ${introHtml}
        <p class="nudge__desc">🛡️ Fondo de emergencia: <strong>${f(dist.fondo)}</strong> (${dist.fondoPct}%)</p>
        ${filaDeudasHtml}
        <p class="nudge__desc">🎯 Metas y ahorro: <strong>${f(dist.ahorro)}</strong> (${dist.ahorroPct}%)</p>
      </div>
    </div>`;
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
