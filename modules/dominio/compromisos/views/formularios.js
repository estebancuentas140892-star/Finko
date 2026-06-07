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
import { FRECUENCIAS } from '../../../core/constants.js';

// ── FORMULARIO MODAL: ABONAR A DEUDA (ADR 002) ───────────────────

/**
 * Devuelve el HTML del formulario para registrar un abono a una deuda.
 * Si no hay cuentas activas, devuelve un estado vacío con instrucción.
 * @param {import('../../../core/state.js').Compromiso} deuda
 * @returns {string}
 */
export function renderFormAbono(deuda) {
  const cuentas = S.cuentas.filter(c => c.activa !== false);
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
  const cuentaOpts = cuentas.map(c =>
    `<option value="${_esc(c.id)}">${_esc(c.nombre)}</option>`
  ).join('');
  const fechaHoy = new Date().toISOString().slice(0, 10);

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
      </div>

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
 * Entidad: tasa EA obligatoria (la tasa anual efectiva del crédito).
 * Personal: tasa mensual opcional (gota a gota suele cobrar 5-20% mensual).
 *
 * El tipo va en un hidden para que `normalizarCompromiso` lo recoja sin que
 * el usuario tenga que seleccionarlo (ya eligió en el chooser del paso 1).
 *
 * @param {'deuda-entidad'|'deuda-personal'} tipo
 * @returns {string}
 */
export function renderFormDeuda(tipo) {
  const esEntidad = tipo === 'deuda-entidad';
  const frecOpts  = FRECUENCIAS
    .map(fr => `<option value="${_esc(fr)}"${fr === 'Mensual' ? ' selected' : ''}>${_esc(fr)}</option>`)
    .join('');

  const tasaLabel = esEntidad
    ? 'Tasa de interés (%)'
    : 'Tasa de interés mensual % (opcional)';

  const tasaPlaceholder = esEntidad ? '28.5' : '10';

  const tasaHint = esEntidad
    ? 'Ingresa la tasa anual efectiva (% EA) que te cobran. La encuentras en tu extracto, contrato o la app del banco.'
    : 'Si no cobra interés, deja el campo en blanco. Los prestamistas particulares (natilleras, persona natural) suelen cobrar entre 5% y 20% mensual.';

  const descPlaceholder = esEntidad
    ? 'Ej. Tarjeta Visa Bancolombia'
    : 'Ej. Préstamo de mamá, Crédito particular';

  return `
    <form id="form-compromiso" novalidate>
      <input type="hidden" name="tipo" value="${_esc(tipo)}" />

      <div class="form-group">
        <label for="comp-descripcion" class="label">¿Cuál es la deuda?</label>
        <input id="comp-descripcion" name="descripcion" class="input" type="text"
               placeholder="${_esc(descPlaceholder)}" required aria-required="true"
               autocomplete="off" />
      </div>

      <div class="form-group">
        <label for="comp-saldo" class="label">¿Cuánto debes en total? (COP)</label>
        <input id="comp-saldo" name="saldoTotal" class="input" type="number"
               min="1" step="10000" placeholder="0" required aria-required="true"
               autocomplete="off" />
        <p class="form-hint">El total que todavía debés. Finko lo muestra en tu resumen general.</p>
      </div>

      <div class="form-group">
        <label for="comp-cuota" class="label">¿Cuánto pagas cada mes? (COP)</label>
        <input id="comp-cuota" name="cuotaMensual" class="input" type="number"
               min="1" step="10000" placeholder="0" required aria-required="true"
               autocomplete="off" />
        <p class="form-hint">Finko la incluye en tu resumen mensual para que veas cuánto te queda libre.</p>
      </div>

      <div class="form-group">
        <label for="comp-tasa" class="label">${_esc(tasaLabel)}</label>
        <div class="tasa-input-group">
          <input id="comp-tasa" name="tasa" class="input" type="number"
                 min="0" max="${esEntidad ? '200' : '100'}" step="0.01"
                 placeholder="${_esc(tasaPlaceholder)}"
                 aria-describedby="comp-tasa-hint"
                 ${esEntidad ? 'required aria-required="true"' : ''}
                 autocomplete="off" />
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
               min="1" max="31" step="1" placeholder="1" required aria-required="true" />
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost"
                data-action="comp-volver-chooser">← Volver</button>
        <button type="submit" class="btn btn-primary">Guardar deuda</button>
      </div>
    </form>`;
}
