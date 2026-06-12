/**
 * metas/view.js - generación de HTML para el dominio de metas de ahorro.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, esc as _esc } from '../../infra/utils.js';
import { icon } from '../../infra/icons.js';
import { progressRing } from '../../infra/svg.js';
import { metasActivas, calcularProgreso, calcularAhorroDiario, diasHastaFecha } from './logic.js';

// ── LISTA DE METAS ───────────────────────────────────────────────

/**
 * Renderiza la lista de metas en `#lista-metas`.
 * No-op si el contenedor no existe.
 */
export function renderListaMetas() {
  const el = document.getElementById('lista-metas');
  if (!el) return;

  const activas = metasActivas(S.metas);
  el.innerHTML = activas.length === 0
    ? _renderEmptyState()
    : activas.map(_renderMetaItem).join('');
}

/** @param {import('../../core/state.js').Meta} meta */
function _renderMetaItem(meta) {
  const nombre  = _esc(meta.nombre);
  const icono   = _esc(meta.icono ?? '🎯');
  const { porcentaje, faltante, completada } = calcularProgreso(meta);
  const diario  = calcularAhorroDiario(meta);
  const dias    = diasHastaFecha(meta.fechaLimite);

  const claseAnillo = completada ? 'complete' : porcentaje >= 80 ? 'near' : 'default';

  const subtitleParts = [`${f(meta.montoActual ?? 0)} / ${f(meta.montoObjetivo ?? 0)}`];
  if (meta.fechaLimite) {
    subtitleParts.push(`Límite: ${fechaLegible(meta.fechaLimite)}`);
  }
  if (dias !== null && dias > 0 && !completada) {
    subtitleParts.push(`${dias} días restantes`);
  }
  if (diario !== null && diario > 0) {
    subtitleParts.push(`${f(diario)}/día`);
  }

  return `
    <article class="list-item" data-id="${_esc(meta.id)}">
      <div class="list-item__icon list-item__icon--ring progress-ring-wrap progress-ring-wrap--${claseAnillo}" aria-hidden="true">
        ${progressRing(porcentaje, { size: 56, strokeWidth: 5, ariaLabel: `Progreso de ${nombre}: ${porcentaje}%` })}
      </div>
      <div class="list-item__body">
        <p class="list-item__title">${icono} ${nombre}${completada ? ` ${icon('check-circle', 'icon icon--pop')}` : ''}</p>
        <p class="list-item__subtitle">${subtitleParts.join(' · ')}</p>
        ${faltante > 0 ? `<p class="list-item__progress-label">Falta: ${f(faltante)}</p>` : ''}
      </div>
      <div class="list-item__action">
        ${!completada ? `<button class="btn btn-ghost btn-sm"
                data-action="abonar-meta"
                data-id="${_esc(meta.id)}"
                aria-label="Abonar a ${nombre}">+ Abonar</button>` : ''}
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-meta"
                data-id="${_esc(meta.id)}"
                aria-label="Eliminar meta ${nombre}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${icon('metas', 'icon icon--lg')}</div>
      <p class="empty-state__title">Sin metas de ahorro</p>
      <p class="empty-state__desc">Define un objetivo libre: un viaje, una laptop, la boda o lo que quieras. Para gastos que sabes que vienen (SOAT, impuestos, arriendo), usa Apartados: ahí Finko calcula cuánto separar en cada cobro.</p>
      <button class="btn btn-primary" data-action="nueva-meta">+ Crear meta</button>
      <p class="empty-state__tip">Tip: para el fondo de emergencia, entra a la sección Ahorro. Finko calcula cuántos meses de colchón ya tienes y te avisa cuánto falta.</p>
    </div>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de abono a una meta existente.
 * Si hay cuentas activas, incluye selector para descontar del saldo.
 * @param {import('../../core/state.js').Meta} meta
 * @returns {string}
 */
export function renderFormAbonoMeta(meta) {
  const { porcentaje, faltante } = calcularProgreso(meta);
  const faltanteHtml = faltante > 0
    ? ` · Faltante: <strong>${f(faltante)}</strong>`
    : '';

  const cuentasActivas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const cuentaHtml     = _renderCuentaSelectorAbono(cuentasActivas);

  return `
    <form id="form-abono-meta" novalidate>
      <input type="hidden" name="metaId" value="${_esc(meta.id)}" />
      <p class="form-hint form-hint--muted">
        Progreso de <strong>${_esc(meta.nombre)}</strong>:
        <strong>${f(meta.montoActual ?? 0)} de ${f(meta.montoObjetivo ?? 0)}</strong> (${porcentaje}%)${faltanteHtml}
      </p>
      <div class="form-group">
        <label for="abono-meta-monto" class="label">Monto del abono (COP)</label>
        <input id="abono-meta-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="0"
               required aria-required="true"
               autocomplete="off" inputmode="numeric" />
      </div>
      ${cuentaHtml}
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar abono</button>
      </div>
    </form>`;
}

/**
 * Devuelve el HTML del formulario de nueva meta.
 * @returns {string}
 */
export function renderFormMeta() {
  return `
    <form id="form-meta" novalidate>
      <div class="form-group">
        <label for="meta-nombre" class="label">Nombre de la meta</label>
        <input id="meta-nombre" name="nombre" class="input" type="text"
               placeholder="Ej. Fondo de emergencia" required aria-required="true" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="meta-objetivo" class="label">Monto objetivo (COP)</label>
        <input id="meta-objetivo" name="montoObjetivo" class="input" type="number"
               min="1" step="10000" placeholder="0" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="meta-fecha" class="label">Fecha límite (opcional)</label>
        <input id="meta-fecha" name="fechaLimite" class="input" type="date" />
      </div>
      <div class="form-group">
        <label for="meta-icono" class="label">Emoji (opcional)</label>
        <input id="meta-icono" name="icono" class="input" type="text"
               maxlength="4" placeholder="🎯" autocomplete="off" />
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar meta</button>
      </div>
    </form>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

/**
 * Devuelve el HTML del selector de cuenta para el abono.
 * - 0 cuentas: sin selector (el abono sigue siendo válido como seguimiento).
 * - 1 cuenta:  hidden input + hint con nombre y saldo disponible.
 * - Varias:    select visible con todas las cuentas activas.
 *
 * @param {import('../../core/state.js').Cuenta[]} cuentas - solo las activas.
 * @returns {string}
 */
function _renderCuentaSelectorAbono(cuentas) {
  if (cuentas.length === 0) return '';

  if (cuentas.length === 1) {
    const c = cuentas[0];
    return `
      <input type="hidden" name="cuentaId" value="${_esc(c.id)}" />
      <p class="form-hint quick-add__cuenta-hint">
        Sale de: ${_esc(c.nombre)} · Disponible: ${f(c.saldo ?? 0)}
      </p>`;
  }

  const opts = cuentas
    .map(c => `<option value="${_esc(c.id)}">${_esc(c.nombre)} (${f(c.saldo ?? 0)})</option>`)
    .join('');
  return `
    <div class="form-group">
      <label for="abono-meta-cuenta" class="label">¿Desde qué cuenta?</label>
      <select id="abono-meta-cuenta" name="cuentaId" class="input" required aria-required="true">
        <option value="">Elegir cuenta…</option>
        ${opts}
      </select>
    </div>`;
}

