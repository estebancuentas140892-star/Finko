/**
 * compromisos/views/formularios.js - formularios modales del dominio.
 *
 * Tres formularios:
 *   - Chooser de tipo de deuda (paso 1 del modal de nueva deuda)
 *   - Form tailored entidad / personal (paso 2)
 *   - Form de abono a deuda existente (ADR 002)
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../../core/state.js';
import { f, esc as _esc } from '../../../infra/utils.js';
import { FRECUENCIAS }   from '../../../core/constants.js';
import { tasaEADe }      from '../logic.js';

// ── FORMULARIO MODAL: ABONAR A DEUDA (ADR 002) ───────────────────

/**
 * Devuelve el HTML del formulario para registrar un abono a una deuda.
 *
 * Selección de cuenta según la cantidad de cuentas activas en S:
 *   - 0 cuentas: estado vacío con instrucción.
 *   - 1 cuenta:  hidden input + hint con nombre y saldo (se asume sin preguntar).
 *   - Varias:    select obligatorio + display reactivo `#abono-saldo-disponible`.
 *
 * @param {import('../../../core/state.js').Compromiso} deuda
 * @returns {string}
 */
export function renderFormAbono(deuda) {
  const cuentas = (S.cuentas ?? []).filter(c => c.activa !== false);
  if (cuentas.length === 0) {
    return `
      <div class="empty-state">
        <p class="empty-state__desc">Necesitas tener al menos una cuenta activa para registrar un abono.</p>
        <div class="modal__footer">
          <button type="button" class="btn btn-ghost" data-action="modal-close">Cerrar</button>
        </div>
      </div>`;
  }

  const saldo = Number(deuda.saldoTotal) || 0;
  const cuota = Number(deuda.cuotaMensual) || 0;
  const fechaHoy = new Date().toISOString().slice(0, 10);

  // Una sola cuenta: se asume automáticamente, sin preguntar.
  let cuentaHtml;
  if (cuentas.length === 1) {
    const c = cuentas[0];
    const saldoCuenta = c.saldo ?? 0;
    cuentaHtml = `
      <input type="hidden" name="cuentaId" value="${_esc(c.id)}" />
      <p class="form-hint quick-add__cuenta-hint${saldoCuenta <= 0 ? ' form-hint--danger' : ''}" role="status">
        💳 Sale de: <strong>${_esc(c.nombre)}</strong> · Disponible: ${f(saldoCuenta)}
      </p>`;
  } else {
    const cuentaOpts = cuentas.map(c =>
      `<option value="${_esc(c.id)}">${_esc(c.nombre)}</option>`
    ).join('');
    cuentaHtml = `
      <div class="form-group">
        <label for="abono-cuenta" class="label">¿De qué cuenta sale el dinero?</label>
        <select id="abono-cuenta" name="cuentaId" class="input"
                required aria-required="true">
          <option value="">Elige una cuenta</option>
          ${cuentaOpts}
        </select>
        <p id="abono-saldo-disponible" class="form-hint form-hint--muted" aria-live="polite">
          Elige una cuenta para ver el saldo disponible.
        </p>
      </div>`;
  }

  return `
    <form id="form-abono" novalidate
          data-saldo="${saldo}"
          data-cuota="${cuota}">
      <input type="hidden" name="compromisoId" value="${_esc(deuda.id)}" />

      <p class="form-hint form-hint--muted">
        Saldo pendiente de <strong>${_esc(deuda.descripcion)}</strong>:
        <strong>${f(saldo)}</strong>
      </p>

      <div class="form-group">
        <label for="abono-monto" class="label">Monto del abono (COP)</label>
        <input id="abono-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="0"
               required aria-required="true"
               autocomplete="off" inputmode="numeric" />
        <p class="form-hint form-hint--muted">Máximo ${f(saldo)}. Si abonas más, se ajusta al saldo pendiente.</p>
        <p id="abono-tip-proyeccion" class="form-hint form-hint--muted" aria-live="polite"></p>
      </div>

      ${cuentaHtml}

      <div class="form-group">
        <label for="abono-fecha" class="label">Fecha del abono</label>
        <input id="abono-fecha" name="fecha" class="input" type="date"
               value="${_esc(fechaHoy)}" required aria-required="true" />
      </div>

      <div class="form-group">
        <label for="abono-nota" class="label">Nota (opcional)</label>
        <input id="abono-nota" name="nota" class="input" type="text"
               placeholder="Ej. Cuota extra de mayo" autocomplete="off" />
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar abono</button>
      </div>
    </form>`;
}

// ── FORMULARIO DEL MODAL: PASO 1 - CHOOSER ───────────────────────

/**
 * Devuelve el HTML del paso 1 del modal: dos botones grandes para elegir
 * si la deuda es con entidad o personal. Al hacer click en uno, index.js
 * oculta este paso y muestra el formulario tailored (paso 2).
 *
 * @returns {string}
 */
export function renderChooserCompromiso() {
  return `
    <p class="comp-chooser__pregunta">¿Con quién es la deuda?</p>
    <div class="comp-chooser" role="group" aria-label="Elegir tipo de deuda">
      <button type="button" class="comp-chooser__btn"
              data-action="comp-elegir-tipo" data-tipo="deuda-entidad"
              aria-label="Deuda con entidad: banco, fintech, tarjeta de crédito">
        <span class="comp-chooser__icon" aria-hidden="true">🏦</span>
        <strong class="comp-chooser__label">Entidad</strong>
        <span class="comp-chooser__desc">
          Banco, fintech, tarjeta de crédito, ICETEX.
          La tasa va en % EA (anual efectivo).
        </span>
      </button>
      <button type="button" class="comp-chooser__btn"
              data-action="comp-elegir-tipo" data-tipo="deuda-personal"
              aria-label="Deuda personal: familiar, amigo o prestamista particular">
        <span class="comp-chooser__icon" aria-hidden="true">🤝</span>
        <strong class="comp-chooser__label">Personal</strong>
        <span class="comp-chooser__desc">
          Familiar, amigo, natillera o prestamista particular.
          La tasa en % mensual es opcional.
        </span>
      </button>
    </div>
    <div class="modal__footer">
      <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
    </div>`;
}

// ── FORMULARIO DEL MODAL: PASO 2 - FORM TAILORED ─────────────────

/**
 * Devuelve el HTML del formulario tailored para el tipo de deuda elegido.
 *
 * Entidad: tasa EA opcional (muchas personas no la conocen; si falta, se guarda
 *          null y la app invita a consultarla para análisis más precisos).
 * Personal: tasa mensual opcional (gota a gota suele cobrar 5-20% mensual).
 *
 * El tipo va en un hidden para que `normalizarCompromiso` lo recoja sin que
 * el usuario tenga que seleccionarlo (ya eligió en el chooser del paso 1).
 *
 * @param {'deuda-entidad'|'deuda-personal'} tipo
 * @param {import('../../../core/state.js').Compromiso|null} [deuda] Cuando se pasa, activa el modo edición (pre-rellena los campos).
 * @returns {string}
 */
export function renderFormDeuda(tipo, deuda = null) {
  const esEntidad = tipo === 'deuda-entidad';
  const modoEdit  = deuda !== null;
  const frecOpts  = FRECUENCIAS
    .map(fr => {
      const selFr = modoEdit ? deuda.frecuencia : 'Mensual';
      return `<option value="${_esc(fr)}"${fr === selFr ? ' selected' : ''}>${_esc(fr)}</option>`;
    })
    .join('');

  const tasaLabel = esEntidad
    ? 'Tasa de interés anual % EA (opcional)'
    : 'Tasa de interés mensual % (opcional)';

  const tasaPlaceholder = esEntidad ? '28.5' : '10';

  const tasaHint = esEntidad
    ? 'La encuentras en tu extracto, contrato o la app del banco. ¿No conoces tu tasa? Puedes continuar sin este dato, pero te recomendamos consultarla con tu banco o entidad financiera para obtener recomendaciones más precisas sobre tus deudas.'
    : 'Si no cobra interés, deja el campo en blanco. Los prestamistas particulares (natilleras, persona natural) suelen cobrar entre 5% y 20% mensual.';

  const descPlaceholder = esEntidad
    ? 'Ej. Tarjeta Visa Bancolombia'
    : 'Ej. Préstamo de mamá, Crédito particular';

  const vDesc  = modoEdit ? _esc(deuda.descripcion ?? '') : '';
  const vSaldo = modoEdit ? (deuda.saldoTotal ?? '') : '';
  const vCuota = modoEdit ? (deuda.cuotaMensual ?? '') : '';
  const vTasa  = modoEdit && deuda.tasa != null ? deuda.tasa : '';
  const vDia   = modoEdit ? (deuda.diaPago ?? '') : '';

  const volverBtn = modoEdit
    ? `<button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>`
    : `<button type="button" class="btn btn-ghost" data-action="comp-volver-chooser">← Volver</button>`;

  return `
    <form id="form-compromiso" novalidate>
      <input type="hidden" name="tipo" value="${_esc(tipo)}" />

      <div class="form-group">
        <label for="comp-descripcion" class="label">¿Cuál es la deuda?</label>
        <input id="comp-descripcion" name="descripcion" class="input" type="text"
               placeholder="${_esc(descPlaceholder)}" required aria-required="true"
               autocomplete="off" value="${vDesc}" />
      </div>

      <div class="form-group">
        <label for="comp-saldo" class="label">¿Cuánto debes en total? (COP)</label>
        <input id="comp-saldo" name="saldoTotal" class="input" type="number"
               min="1" step="10000" placeholder="0" required aria-required="true"
               autocomplete="off" value="${vSaldo}" />
        <p class="form-hint">El total que todavía debes. Finko lo muestra en tu resumen general.</p>
      </div>

      <div class="form-group">
        <label for="comp-cuota" class="label">¿Cuánto pagas cada mes? (COP)</label>
        <input id="comp-cuota" name="cuotaMensual" class="input" type="number"
               min="1" step="10000" placeholder="0" required aria-required="true"
               autocomplete="off" value="${vCuota}" />
        <p class="form-hint">Finko la incluye en tu resumen mensual para que veas cuánto te queda libre.</p>
      </div>

      <div class="form-group">
        <label for="comp-tasa" class="label">${_esc(tasaLabel)}</label>
        <div class="tasa-input-group">
          <input id="comp-tasa" name="tasa" class="input" type="number"
                 min="0" max="${esEntidad ? '200' : '100'}" step="0.01"
                 placeholder="${_esc(tasaPlaceholder)}"
                 aria-describedby="comp-tasa-hint"
                 autocomplete="off" value="${vTasa}" />
          <input type="hidden" name="tasaUnidad" value="${esEntidad ? 'EA' : 'mensual'}" />
        </div>
        <p id="comp-tasa-hint" class="form-hint">${_esc(tasaHint)}</p>
      </div>

      <div class="form-group">
        <label for="comp-frecuencia" class="label">Frecuencia de pago</label>
        <select id="comp-frecuencia" name="frecuencia" class="input" required aria-required="true">
          ${frecOpts}
        </select>
      </div>

      <div class="form-group">
        <label for="comp-dia" class="label">Día de pago del mes (1-31)</label>
        <input id="comp-dia" name="diaPago" class="input" type="number"
               min="1" max="31" step="1" placeholder="1" required aria-required="true"
               value="${vDia}" />
      </div>

      <div class="modal__footer">
        ${volverBtn}
        <button type="submit" class="btn btn-primary">${modoEdit ? 'Actualizar deuda' : 'Guardar deuda'}</button>
      </div>
    </form>`;
}

// ── SIMULACIÓN DE ABONO EXTRA ───────────────────────────────────

/**
 * Panel de solo lectura para simular el impacto de un abono extra mensual.
 * El input `#sim-extra` dispara la actualización del resultado `#sim-resultado`
 * desde `index.js`.
 *
 * @param {import('../../../core/state.js').Compromiso} deuda
 * @returns {string}
 */
export function renderSimulacion(deuda) {
  const saldo = Number(deuda.saldoTotal) || 0;
  const cuota = Number(deuda.cuotaMensual) || 0;
  const tasa  = tasaEADe(deuda);

  const tasaLabel = deuda.tasa > 0
    ? (deuda.tasaUnidad === 'mensual'
        ? `${Math.round(deuda.tasa * 100)}% mensual`
        : `${Math.round(tasa * 100)}% EA`)
    : 'sin interés';

  return `
    <div id="panel-simulacion"
         data-saldo="${saldo}" data-cuota="${cuota}" data-tasa="${tasa}">
      <p class="form-hint form-hint--muted">
        Saldo: <strong>${f(saldo)}</strong> · Cuota: ${f(cuota)}/mes · ${_esc(tasaLabel)}
      </p>
      <div class="form-group">
        <label for="sim-extra" class="label">Monto extra mensual (COP)</label>
        <input id="sim-extra" type="number" class="input"
               min="1" step="10000" placeholder="Ej. 100000"
               inputmode="numeric" autocomplete="off" />
        <p class="form-hint">¿Cuánto podrías pagar de más cada mes, además de tu cuota?</p>
      </div>
      <div id="sim-resultado" aria-live="polite"></div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cerrar</button>
      </div>
    </div>`;
}
