/**
 * personales/view.js - HTML del dominio de préstamos personales.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, esc as _esc } from '../../infra/utils.js';
import { icon, emptyArt } from '../../infra/icons.js';
import {
  calcularPendiente,
  calcularDias,
  clasificarAntiguedad,
  porcentajePagado,
  calcularResumen,
  ordenarPersonales,
} from './logic.js';

// ── LISTA + RESUMEN ──────────────────────────────────────────────

/**
 * Renderiza la lista de préstamos en `#lista-personales` + el resumen arriba.
 * No-op si el contenedor no existe.
 */
export function renderListaPersonales() {
  const el = document.getElementById('lista-personales');
  if (!el) return;

  const lista = Array.isArray(S.personales) ? S.personales : [];
  const resumen = calcularResumen(lista);

  if (lista.length === 0) {
    el.innerHTML = _renderEmptyState();
    return;
  }

  const ordenadas = ordenarPersonales(lista, 'antiguo');
  const hoy = new Date();

  el.innerHTML = `
    ${lista.length >= 2 ? _renderResumen(resumen) : ''}
    <div class="personales-lista">
      ${ordenadas.map(p => _renderPersonalItem(p, hoy)).join('')}
    </div>`;
}

function _renderResumen(r) {
  const barClass = r.pctCobrado >= 100 ? ' progress-bar--complete' : '';
  return `
    <section class="personales-resumen" aria-label="Resumen de préstamos">
      <div class="resumen-card__grid">
        <div class="resumen-card__stat">
          <p class="resumen-card__label">Total prestado</p>
          <p class="resumen-card__value resumen-card__value--sm">${f(r.totalPrestado)}</p>
        </div>
        <div class="resumen-card__stat resumen-card__stat--primary">
          <p class="resumen-card__label">Pendiente</p>
          <p class="resumen-card__value resumen-card__value--sm">${f(r.totalPendiente)}</p>
        </div>
        <div class="resumen-card__stat">
          <p class="resumen-card__label">Te han devuelto</p>
          <p class="resumen-card__value resumen-card__value--sm">${f(r.totalCobrado)}</p>
        </div>
        <div class="resumen-card__stat">
          <p class="resumen-card__label">Activos</p>
          <p class="resumen-card__value resumen-card__value--sm">${r.activos}</p>
        </div>
      </div>
      <div class="personales-resumen__footer">
        <div class="progress" role="progressbar"
             aria-valuenow="${r.pctCobrado}" aria-valuemin="0" aria-valuemax="100"
             aria-label="${r.pctCobrado}% cobrado">
          <div class="progress-bar${barClass}" style="width:${r.pctCobrado}%"></div>
        </div>
        <p class="personales-resumen__hint">${r.pctCobrado}% cobrado</p>
      </div>
    </section>`;
}

/**
 * @param {import('./logic.js').Personal} prestamo
 * @param {Date} hoy
 */
function _renderPersonalItem(prestamo, hoy) {
  const persona   = _esc(prestamo.persona);
  const motivo    = _esc(prestamo.motivo ?? '');
  const pendiente = calcularPendiente(prestamo);
  const dias      = calcularDias(prestamo, hoy);
  const antig     = clasificarAntiguedad(dias);
  const liquidado = pendiente <= 0;
  const pct       = porcentajePagado(prestamo);

  const chipClase = liquidado
    ? 'chip chip-success'
    : antig === 'viejo'
    ? 'chip chip-danger'
    : antig === 'mediano'
    ? 'chip chip-warning'
    : 'chip';

  const chipLabel = liquidado
    ? 'Liquidado'
    : antig === 'viejo'
    ? `${dias} días, ya toca cobrar`
    : antig === 'mediano'
    ? `${dias} días`
    : `${dias} ${dias === 1 ? 'día' : 'días'}`;

  const fechaLim = prestamo.fechaLimite
    ? `<p class="list-item__hint">Pactó devolver: ${fechaLegible(prestamo.fechaLimite)}</p>`
    : '';

  // Cuando hay un abono, la antigüedad cuenta desde ahí: el hint explica
  // por qué el chip de días puede ser bajo aunque el préstamo sea viejo.
  const ultimoPagoHtml = (prestamo.ultimoPago && !liquidado)
    ? `<p class="list-item__hint">Último abono: ${fechaLegible(prestamo.ultimoPago)}</p>`
    : '';

  const motivoHtml = motivo
    ? `<p class="list-item__hint">«${motivo}»</p>`
    : '';

  const accionPago = liquidado
    ? ''
    : `<button class="btn btn-ghost btn-sm"
                data-action="pagar-personal"
                data-id="${_esc(prestamo.id)}"
                aria-label="Registrar pago de ${persona}">Me pagaron</button>`;

  return `
    <article class="list-item" data-id="${_esc(prestamo.id)}">
      <div class="list-item__icon" aria-hidden="true">${liquidado ? icon('check-circle', 'icon icon--pop') : icon('personales')}</div>
      <div class="list-item__body">
        <p class="list-item__title">${persona}
          <span class="${chipClase}">${chipLabel}</span>
        </p>
        <p class="list-item__subtitle">Pendiente: ${f(pendiente)} de ${f(prestamo.monto)}</p>
        <div class="progress" role="progressbar"
             aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
             aria-label="${pct}% pagado">
          <div class="progress-bar${liquidado ? ' progress-bar--complete' : ''}" style="width:${pct}%"></div>
        </div>
        ${motivoHtml}
        ${ultimoPagoHtml}
        ${fechaLim}
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount">${f(prestamo.monto)}</p>
      </div>
      <div class="list-item__action">
        ${accionPago}
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-personal"
                data-id="${_esc(prestamo.id)}"
                aria-label="Eliminar préstamo a ${persona}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('personales')}</div>
      <p class="empty-state__title">Nadie te debe nada (o no lo registraste)</p>
      <p class="empty-state__desc">Registra los préstamos que haces a familia y amigos para no olvidarte. Sin presión: solo es para ti.</p>
      <button class="btn btn-primary" data-action="nuevo-personal">+ Agregar préstamo</button>
    </div>`;
}

// ── FORM DEL MODAL ───────────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de nuevo/editar préstamo.
 * @returns {string}
 */
export function renderFormPersonal() {
  const hoy = _hoyISO();
  return `
    <form id="form-personal" novalidate>
      <div class="form-group">
        <label for="pers-persona" class="label">A quién le prestaste</label>
        <input id="pers-persona" name="persona" class="input" type="text"
               placeholder="Ej. Tía Marta" required aria-required="true"
               autocomplete="off" maxlength="60" />
      </div>
      <div class="form-group">
        <label for="pers-monto" class="label">Monto prestado (COP)</label>
        <input id="pers-monto" name="monto" class="input" type="number"
               min="1" step="1000" placeholder="0" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="pers-fecha" class="label">Fecha del préstamo</label>
        <input id="pers-fecha" name="fecha" class="input" type="date"
               value="${hoy}" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="pers-motivo" class="label">Motivo <span class="form-optional">opcional</span></label>
        <input id="pers-motivo" name="motivo" class="input" type="text"
               placeholder="Ej. mercado, favor" maxlength="80"
               autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="pers-limite" class="label">Fecha pactada de devolución <span class="form-optional">opcional</span></label>
        <input id="pers-limite" name="fechaLimite" class="input" type="date" />
        <p class="form-hint">Si pasa esta fecha, el préstamo se marca como vencido.</p>
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar préstamo</button>
      </div>
    </form>`;
}

// ── FORM PAGO PARCIAL ────────────────────────────────────────────

/**
 * Devuelve el HTML del modal para registrar un pago parcial.
 * @param {import('./logic.js').Personal} prestamo
 * @returns {string}
 */
export function renderFormPagoPersonal(prestamo) {
  const persona   = _esc(prestamo.persona);
  const pendiente = calcularPendiente(prestamo);
  return `
    <form id="form-pago-personal" novalidate data-id="${_esc(prestamo.id)}">
      <p class="modal__intro">
        ¿Cuánto te pagó <strong>${persona}</strong>?<br />
        Pendiente actual: <strong>${f(pendiente)}</strong>
      </p>
      <div class="form-group">
        <label for="pago-monto" class="label">Monto recibido (COP)</label>
        <input id="pago-monto" name="monto" class="input" type="number"
               min="1" max="${pendiente}" step="1000"
               value="${pendiente}" required aria-required="true" />
        <p class="form-hint">El valor que aparece es todo lo que falta por cobrar. Si solo te pagaron una parte, puedes cambiarlo.</p>
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar pago</button>
      </div>
    </form>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

function _hoyISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
