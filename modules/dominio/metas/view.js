/**
 * metas/view.js - generación de HTML para el dominio de metas de ahorro.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible } from '../../infra/utils.js';
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

  const claseProgreso = completada
    ? 'progress-bar--complete'
    : porcentaje >= 80 ? 'progress-bar--near' : '';

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
      <div class="list-item__icon" aria-hidden="true">${icono}</div>
      <div class="list-item__body">
        <p class="list-item__title">${nombre}${completada ? ' ✅' : ''}</p>
        <p class="list-item__subtitle">${subtitleParts.join(' · ')}</p>
        <div class="progress" role="progressbar"
             aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"
             aria-label="Progreso de ${nombre}: ${porcentaje}%">
          <div class="progress-bar ${claseProgreso}" style="width:${porcentaje}%"></div>
        </div>
        <p class="list-item__progress-label">${porcentaje}%${faltante > 0 ? ` · Faltante: ${f(faltante)}` : ''}</p>
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
      <p class="empty-state__icon" aria-hidden="true">🎯</p>
      <p class="empty-state__title">Sin metas de ahorro</p>
      <p class="empty-state__desc">Definí una meta, como un viaje, un fondo de emergencia o lo que quieras, y llevá el control de tu progreso.</p>
      <button class="btn btn-primary" data-action="nueva-meta">+ Crear meta</button>
      <p class="empty-state__tip">💡 Tip: una buena primera meta es el fondo de emergencia: al menos 3 meses de tus gastos fijos. Te da tranquilidad antes de cualquier otra meta.</p>
    </div>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

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

// ── HELPER ───────────────────────────────────────────────────────

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
