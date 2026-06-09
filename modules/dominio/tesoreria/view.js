/**
 * tesoreria/view.js - generación de HTML para el módulo de tesorería.
 *
 * Reglas:
 * - Puede leer S. No puede mutarlo.
 * - Devuelve strings HTML o escribe en el DOM (no ambas cosas en la misma función).
 * - Sin lógica de negocio: delegar a logic.js.
 */

import { S } from '../../core/state.js';
import { f, hoy, esc as _esc } from '../../infra/utils.js';
import { BANCOS_CO, FRECUENCIAS } from '../../core/constants.js';
import { cuentasActivas, calcularCostoGMF, detectarNudgeGMF } from './logic.js';

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
                aria-label="Editar cuenta ${nombre}"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-cuenta"
                data-id="${_esc(cuenta.id)}"
                aria-label="Eliminar cuenta ${nombre}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <p class="empty-state__icon" aria-hidden="true">🏦</p>
      <p class="empty-state__title">¿Dónde tienes tu dinero?</p>
      <p class="empty-state__desc">Agrega tus cuentas bancarias, billeteras digitales o efectivo para ver tu saldo real en el dashboard.</p>
      <button class="btn btn-primary" data-action="nueva-cuenta">+ Agregar cuenta</button>
      <p class="empty-state__tip">💡 Tip: Nequi, Daviplata y el efectivo también cuentan. Todo lo que tienes, en un solo lugar.</p>
    </div>`;
}

// ── INGRESOS RECURRENTES ─────────────────────────────────────────

/**
 * Renderiza la lista de ingresos activos en `#lista-ingresos`.
 * No-op si el contenedor no existe.
 */
export function renderListaIngresos() {
  const el = document.getElementById('lista-ingresos');
  if (!el) return;

  const ingresos = Array.isArray(S.ingresos)
    ? S.ingresos.filter(i => i.activo !== false)
    : [];

  el.innerHTML = ingresos.length === 0
    ? _renderEmptyStateIngresos()
    : ingresos.map(_renderIngresoItem).join('');
}

function _renderEmptyStateIngresos() {
  return `
    <div class="empty-state empty-state--small">
      <p class="empty-state__desc">Sin fuentes de ingreso registradas. Agrega tu salario u otras fuentes para ver tu tasa de ahorro.</p>
    </div>`;
}

/**
 * @param {import('../../core/state.js').Ingreso} ing
 * @returns {string}
 */
function _renderIngresoItem(ing) {
  const desc = _esc(ing.descripcion);
  const frec = _esc(ing.frecuencia);
  return `
    <article class="list-item" data-id="${_esc(ing.id)}">
      <div class="list-item__body">
        <p class="list-item__title">${desc}</p>
        <p class="list-item__subtitle">${frec}</p>
      </div>
      <div class="list-item__meta">
        <p class="list-item__value">${f(ing.monto)}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="editar-ingreso"
                data-id="${_esc(ing.id)}"
                aria-label="Editar ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-ingreso"
                data-id="${_esc(ing.id)}"
                aria-label="Eliminar ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

/**
 * Devuelve el HTML del formulario de nuevo/editar ingreso.
 * @param {import('../../core/state.js').Ingreso|null} [ingreso]
 * @returns {string}
 */
export function renderFormIngreso(ingreso = null) {
  const frecOpts = FRECUENCIAS
    .map(fr => `<option value="${_esc(fr)}"${ingreso?.frecuencia === fr ? ' selected' : ''}>${_esc(fr)}</option>`)
    .join('');

  return `
    <form id="form-ingreso" novalidate>
      <div class="form-group">
        <label for="ingreso-desc" class="label">Descripción</label>
        <input id="ingreso-desc" name="descripcion" class="input" type="text"
               value="${ingreso ? _esc(ingreso.descripcion) : ''}"
               placeholder="Ej. Salario empresa, Arriendo apartamento"
               required aria-required="true" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="ingreso-monto" class="label">Monto (COP)</label>
        <input id="ingreso-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="0"
               value="${ingreso ? ingreso.monto : ''}"
               required aria-required="true" inputmode="numeric" />
      </div>
      <div class="form-group">
        <label for="ingreso-frec" class="label">Frecuencia</label>
        <select id="ingreso-frec" name="frecuencia" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${frecOpts}
        </select>
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${ingreso ? 'Actualizar' : 'Guardar'}</button>
      </div>
    </form>`;
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

      <div class="form-group" id="form-group-tipo" hidden>
        <label for="cuenta-tipo" class="label">Tipo de cuenta</label>
        <select id="cuenta-tipo" name="tipo" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
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
          El 4x1000 es un impuesto de $4 por cada $1.000 que retiras o transfieres. Las cuentas de nómina y AFC están exentas por ley: si la tuya lo es, deja esta opción desmarcada.
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
          Opcional. Si no sabes el monto, déjalo desactivado.
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

// ── INDICADOR GMF (K.1) ──────────────────────────────────────────

/**
 * Renderiza el nudge de costo del GMF en `#tesoreria-gmf`.
 * Muestra el costo estimado del 4x1000 para el mes actual basado en
 * los gastos registrados desde cuentas con GMF. No-op si el contenedor
 * no existe o si no hay costo que reportar este mes.
 */
export function renderGMFIndicador() {
  const el = document.getElementById('tesoreria-gmf');
  if (!el) return;

  const fechaHoy = hoy();
  const anio = Number(fechaHoy.slice(0, 4));
  const mes  = Number(fechaHoy.slice(5, 7));

  const gmfData = calcularCostoGMF(S.gastos, S.cuentas, anio, mes);
  const nudge   = detectarNudgeGMF(gmfData);

  el.innerHTML = nudge ? _renderNudgeGMF(nudge) : '';
}

/**
 * @param {{ icono: string, nivel: string, cantidadCuentasGMF: number,
 *           gastosGravados: number, costoGMF: number }} nudge
 * @returns {string}
 */
function _renderNudgeGMF(nudge) {
  const n = nudge.cantidadCuentasGMF === 1 ? '1 cuenta' : `${nudge.cantidadCuentasGMF} cuentas`;
  return `
    <div class="nudge nudge-info" role="status">
      <span class="nudge__icon" aria-hidden="true">${nudge.icono}</span>
      <div class="nudge__body">
        <p class="nudge__title">4x1000 estimado este mes: ${f(nudge.costoGMF)}</p>
        <p class="nudge__desc">Calculado desde ${f(nudge.gastosGravados)} en gastos registrados desde ${_esc(n)} con GMF. Las cuentas de nómina y AFC están exentas: consulta con tu banco si aplica.</p>
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

