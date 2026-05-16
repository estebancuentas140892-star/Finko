/**
 * compromisos/view.js — generación de HTML para el dominio de compromisos.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f } from '../../infra/utils.js';
import { FRECUENCIAS } from '../../core/constants.js';
import {
  compromisosActivos,
  calcularCompromisoMensual,
  proximoVencimiento,
  urgencia,
  TIPOS_COMPROMISO,
  LABEL_TIPO,
  ICONO_TIPO,
} from './logic.js';

// ── LISTA DE COMPROMISOS ─────────────────────────────────────────

/**
 * Renderiza la lista de compromisos en `#lista-compromisos`.
 * No-op si el contenedor no existe.
 */
export function renderListaCompromisos() {
  const el = document.getElementById('lista-compromisos');
  if (!el) return;

  const activos = compromisosActivos(S.compromisos);
  // Ordenar: más urgentes primero.
  const ordenados = [...activos].sort(
    (a, b) => proximoVencimiento(a) - proximoVencimiento(b)
  );

  el.innerHTML = ordenados.length === 0
    ? _renderEmptyState()
    : ordenados.map(_renderCompromisoItem).join('');
}

/** @param {import('../../core/state.js').Compromiso} compromiso */
function _renderCompromisoItem(compromiso) {
  const desc     = _esc(compromiso.descripcion);
  const tipo     = compromiso.tipo ?? 'fijo';
  const icono    = _esc(ICONO_TIPO[tipo] ?? '🔁');
  const label    = _esc(LABEL_TIPO[tipo] ?? tipo);
  const frec     = _esc(compromiso.frecuencia);
  const dias     = proximoVencimiento(compromiso);
  const nivel    = urgencia(compromiso);
  const mensual  = calcularCompromisoMensual(compromiso);

  const chipClase = nivel === 'urgente'
    ? 'chip chip--danger'
    : nivel === 'proximo'
    ? 'chip chip--warning'
    : 'chip chip--neutral';

  const diasLabel = dias === 0
    ? 'Vence hoy'
    : dias === 1
    ? 'Mañana'
    : `${dias} días`;

  const subtitleParts = [
    `Día ${compromiso.diaPago} · ${frec}`,
    label,
  ];
  if (mensual !== compromiso.monto) {
    subtitleParts.push(`${f(mensual)}/mes`);
  }

  return `
    <article class="list-item" data-id="${_esc(compromiso.id)}">
      <div class="list-item__icon" aria-hidden="true">${icono}</div>
      <div class="list-item__body">
        <p class="list-item__title">${desc}
          <span class="${chipClase}" aria-label="Vence en ${diasLabel}">${diasLabel}</span>
        </p>
        <p class="list-item__subtitle">${subtitleParts.join(' · ')}</p>
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount">${f(compromiso.monto)}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-compromiso"
                data-id="${_esc(compromiso.id)}"
                aria-label="Eliminar compromiso ${desc}">✕</button>
      </div>
    </article>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <p class="empty-state__icon" aria-hidden="true">🔗</p>
      <p class="empty-state__title">Sin compromisos registrados</p>
      <p class="empty-state__desc">Agregá tus gastos fijos, deudas y pagos recurrentes para no olvidar ningún vencimiento.</p>
      <button class="btn btn-primary" data-action="nuevo-compromiso">+ Agregar compromiso</button>
    </div>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de nuevo compromiso.
 * @returns {string}
 */
export function renderFormCompromiso() {
  const frecOpts = FRECUENCIAS
    .map(fr => `<option value="${_esc(fr)}">${_esc(fr)}</option>`)
    .join('');

  const tipoOpts = TIPOS_COMPROMISO
    .map(t => `<option value="${_esc(t)}">${_esc(LABEL_TIPO[t])}</option>`)
    .join('');

  return `
    <form id="form-compromiso" novalidate>
      <div class="form-group">
        <label for="comp-descripcion" class="label">Descripción</label>
        <input id="comp-descripcion" name="descripcion" class="input" type="text"
               placeholder="Ej. Arriendo apartamento" required aria-required="true" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="comp-monto" class="label">Monto (COP)</label>
        <input id="comp-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="0" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="comp-frecuencia" class="label">Frecuencia</label>
        <select id="comp-frecuencia" name="frecuencia" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${frecOpts}
        </select>
      </div>
      <div class="form-group">
        <label for="comp-dia" class="label">Día de pago (1–31)</label>
        <input id="comp-dia" name="diaPago" class="input" type="number"
               min="1" max="31" step="1" placeholder="1" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="comp-tipo" class="label">Tipo</label>
        <select id="comp-tipo" name="tipo" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${tipoOpts}
        </select>
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar compromiso</button>
      </div>
    </form>`;
}

// ── HELPER ───────────────────────────────────────────────────────

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
