/**
 * tesoreria/views/cuentas.js - lista de cuentas, formulario del modal e indicador GMF.
 *
 * Sub-modulo de tesoreria/view.js (barrel). Reglas de la capa:
 * - Puede leer S. No puede mutarlo.
 * - Devuelve strings HTML o escribe en el DOM (no ambas cosas en la misma funcion).
 * - Sin logica de negocio: delegar a logic/.
 */

import { S } from '../../../core/state.js';
import { f, hoy, esc as _esc } from '../../../infra/utils.js';
import { icon, emptyArt } from '../../../infra/icons.js';
import { bancoAvatar } from '../../../infra/bancos.js';
import { BANCOS_CO, TIPOS_LLAVE } from '../../../core/constants.js';
import { cuentasActivas, calcularCostoGMF, detectarNudgeGMF } from '../logic/cuentas.js';

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
 * @param {import('../../../core/state.js').Cuenta} cuenta
 * @returns {string}
 */
function _renderCuentaItem(cuenta) {
  const nombre = _esc(cuenta.nombre);
  const banco  = cuenta.banco;
  const tipo   = cuenta.tipo;

  // MC.15 (1): el form actual no ofrece un campo para escribir un nombre
  // propio, así que `nombre` sale siempre de `_autoNombre(banco, tipo)`
  // (logic/cuentas.js) y ya contiene banco + tipo ("Banco de Bogotá
  // Ahorros"). Mostrar además "Banco de Bogotá · Ahorros" debajo era ruido
  // puro. `normalizarCuenta()` sí respeta un nombre explícito si algún día
  // se habilita ese campo (ver sus tests): en ese caso el subtítulo vuelve
  // a aportar información y se muestra.
  const combinado = banco === tipo ? banco : `${banco} ${tipo}`;
  const esAutoNombre = (cuenta.nombre ?? '').trim().toLowerCase() === combinado.trim().toLowerCase();
  const subtituloHtml = esAutoNombre
    ? ''
    : `<p class="list-item__subtitle">${_esc(banco === tipo ? banco : `${banco} · ${tipo}`)}</p>`;

  // Si la cuenta tiene cuota de manejo, mostramos un hint adicional para que
  // el usuario sepa que hay un compromiso vinculado descontandose mes a mes.
  const cuotaHint = cuenta.cuotaManejo
    ? `<p class="list-item__hint">📅 Cuota de manejo: ${f(cuenta.cuotaManejo.monto)} el día ${cuenta.cuotaManejo.diaCobro}</p>`
    : '';

  // Hint informativo si la cuenta está sujeta al GMF (4x1000).
  const gmfHint = cuenta.aplica4x1000
    ? `<p class="list-item__hint">💸 Aplica 4x1000 (GMF)</p>`
    : '';

  // MC.14: datos de transferencia como punto de consulta rápida (no para
  // ejecutar transferencias). Se combinan en un solo hint compacto.
  const transferenciaHint = _formatDatosTransferencia(cuenta.datosTransferencia);

  return `
    <article class="list-item" data-id="${_esc(cuenta.id)}">
      <div class="list-item__icon" aria-hidden="true">${_bankAvatarHtml(cuenta.banco)}</div>
      <div class="list-item__body">
        <p class="list-item__title">${nombre}</p>
        ${subtituloHtml}
        ${cuotaHint}
        ${gmfHint}
        ${transferenciaHint}
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

/**
 * Formatea los datos de transferencia de una cuenta (MC.14) en un solo hint
 * compacto para la tarjeta de lista. Devuelve '' si la cuenta no tiene datos
 * de transferencia guardados.
 *
 * @param {import('../../../core/state.js').DatosTransferencia|null|undefined} dt
 * @returns {string}
 */
function _formatDatosTransferencia(dt) {
  if (!dt) return '';
  const partes = [];
  if (dt.numeroCuenta) partes.push(`N.° ${_esc(dt.numeroCuenta)}`);
  if (dt.llave)        partes.push(`${_esc(dt.tipoLlave ?? 'Llave')} ${_esc(dt.llave)}`);
  if (dt.alias)        partes.push(_esc(dt.alias));
  if (partes.length === 0) return '';
  return `<p class="list-item__hint">🔑 ${partes.join(' · ')}</p>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('cuentas')}</div>
      <p class="empty-state__title">Agrega tu primera cuenta</p>
      <p class="empty-state__desc">Bancaria, billetera digital o efectivo: verás tu saldo real en Inicio.</p>
      <button class="btn btn-primary" data-action="nueva-cuenta">+ Agregar cuenta</button>
      <p class="empty-state__tip">${icon('lightbulb')} Tip: Nequi, Daviplata y el efectivo también cuentan. Todo lo que tienes, en un solo lugar.</p>
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
      </div>

      <div class="form-group form-group--checkbox">
        <label class="checkbox-row">
          <input type="checkbox"
                 id="cuenta-cuota-toggle"
                 name="cuotaManejoActiva"
                 data-cuota-toggle />
          <span>Esta cuenta cobra cuota de manejo mensual</span>
        </label>
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
          Finko crea un gasto fijo mensual con este monto y día. Lo verás en Calendario.
        </p>
      </fieldset>

      <div class="form-group form-group--checkbox" id="form-group-transferencia">
        <label class="checkbox-row">
          <input type="checkbox"
                 id="cuenta-transferencia-toggle"
                 name="transferenciaActiva"
                 data-transferencia-toggle />
          <span>Guardar los datos que compartes cuando alguien te va a consignar</span>
        </label>
      </div>

      <fieldset id="cuenta-transferencia-fieldset" class="cuota-fieldset" hidden>
        <div class="form-group">
          <label for="cuenta-numero" class="label">
            Número de cuenta <span class="form-optional">opcional</span>
          </label>
          <input id="cuenta-numero"
                 name="numeroCuenta"
                 class="input"
                 type="text"
                 autocomplete="off"
                 placeholder="Ej. 1234567890" />
        </div>
        <div class="form-group">
          <label for="cuenta-tipo-llave" class="label">
            Tipo de llave <span class="form-optional">opcional</span>
          </label>
          <select id="cuenta-tipo-llave" name="tipoLlave" class="input">
            <option value="">Seleccionar…</option>
            ${TIPOS_LLAVE.map(t => `<option value="${_esc(t)}">${_esc(t)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="cuenta-llave" class="label">
            Llave de transferencia <span class="form-optional">opcional</span>
          </label>
          <input id="cuenta-llave"
                 name="llave"
                 class="input"
                 type="text"
                 autocomplete="off"
                 placeholder="Ej. 300 123 4567, correo@ejemplo.com" />
        </div>
        <div class="form-group">
          <label for="cuenta-alias" class="label">
            Alias <span class="form-optional">opcional</span>
          </label>
          <input id="cuenta-alias"
                 name="alias"
                 class="input"
                 type="text"
                 autocomplete="off"
                 placeholder="Ej. @mi-alias" />
        </div>
        <p class="form-hint form-hint--muted">
          Finko solo guarda estos datos como referencia para que los consultes rápido. No ejecuta transferencias ni pide contraseñas o claves.
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
      <span class="nudge__icon" aria-hidden="true">${icon(nudge.icono)}</span>
      <div class="nudge__body">
        <p class="nudge__title">4x1000 estimado este mes: ${f(nudge.costoGMF)}</p>
        <p class="nudge__desc">Calculado desde ${f(nudge.gastosGravados)} en gastos registrados desde ${_esc(n)} con GMF. Las cuentas de nómina y AFC están exentas: consulta con tu banco si aplica.</p>
      </div>
    </div>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

/**
 * Devuelve el HTML de la teja de marca del banco (glifo oficial o iniciales
 * sobre el color corporativo, ADR 025). Si el banco no se encuentra en
 * BANCOS_CO, devuelve una teja generica con "?" y color gris.
 *
 * @param {string} bancoId - valor guardado en cuenta.banco.
 * @returns {string} HTML span de la teja.
 */
function _bankAvatarHtml(bancoId) {
  return bancoAvatar(bancoId);
}

