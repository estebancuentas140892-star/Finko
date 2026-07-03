/**
 * metas/view.js - generación de HTML para el dominio de metas de ahorro.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, esc as _esc } from '../../infra/utils.js';
import { icon, emptyArt } from '../../infra/icons.js';
import { progressRing } from '../../infra/svg.js';
import { renderSelectorCuenta } from '../../infra/cuenta-helper.js';
import { CATEGORIAS_META, CATEGORIA_META_EMOJI } from '../../core/constants.js';
import {
  metasActivas, calcularProgreso, calcularAhorroPorPeriodo,
  frecuenciaPrincipalIngresos, diasHastaFecha,
} from './logic.js';

// ── LISTA DE METAS ───────────────────────────────────────────────

/**
 * Renderiza la lista de metas en `#lista-metas`.
 * No-op si el contenedor no existe.
 */
export function renderListaMetas() {
  const el = document.getElementById('lista-metas');
  if (!el) return;

  const activas = metasActivas(S.metas);
  // MT.4: el ritmo de ahorro sugerido usa la frecuencia real de ingreso del
  // usuario (quincenal, mensual...), no "por día" fijo. Se calcula una sola
  // vez para toda la lista: es la misma frecuencia para todas las metas.
  const frecuenciaIngresos = frecuenciaPrincipalIngresos(S.ingresos);
  el.innerHTML = activas.length === 0
    ? _renderEmptyState()
    : activas.map(m => _renderMetaItem(m, frecuenciaIngresos)).join('');
}

/**
 * @param {import('../../core/state.js').Meta} meta
 * @param {string} frecuenciaIngresos - una de FRECUENCIAS_AHORRO (MT.4).
 */
function _renderMetaItem(meta, frecuenciaIngresos) {
  const nombre  = _esc(meta.nombre);
  const icono   = _esc(meta.icono ?? '🎯');
  const { porcentaje, faltante, completada } = calcularProgreso(meta);
  const ahorro  = calcularAhorroPorPeriodo(meta, frecuenciaIngresos);
  const dias    = diasHastaFecha(meta.fechaLimite);

  const claseAnillo = completada ? 'complete' : porcentaje >= 80 ? 'near' : 'default';

  const subtitleParts = [`${f(meta.montoActual ?? 0)} / ${f(meta.montoObjetivo ?? 0)}`];
  if (meta.fechaLimite) {
    subtitleParts.push(`Límite: ${fechaLegible(meta.fechaLimite)}`);
  }
  if (dias !== null && dias > 0 && !completada) {
    subtitleParts.push(`${dias} días restantes`);
  }
  if (ahorro) {
    subtitleParts.push(`${f(ahorro.montoPorPeriodo)} ${ahorro.etiqueta}`);
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
      <div class="empty-state__icon">${emptyArt('metas')}</div>
      <p class="empty-state__title">Sin metas de ahorro</p>
      <p class="empty-state__desc">Define un objetivo libre: un viaje, una laptop, la boda o lo que quieras. Para gastos que sabes que vienen (SOAT, impuestos, arriendo), usa Apartados: ahí Finko calcula cuánto separar en cada cobro.</p>
      <button class="btn btn-primary" data-action="nueva-meta">+ Crear meta</button>
      <p class="empty-state__tip">Tip: para el fondo de emergencia, entra a la sección Ahorro. Finko calcula cuántos meses de colchón ya tienes y te avisa cuánto falta.</p>
    </div>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de abono a una meta existente.
 * Si hay cuentas activas, incluye el selector de tarjetas compartido
 * (MT.5, mismo patrón que Apartados/AP.1): preselecciona la cuenta de
 * mayor saldo; `index.js` resuelve el reparto real con
 * `resolverPagoConPreferida` al guardar.
 * @param {import('../../core/state.js').Meta} meta
 * @returns {string}
 */
export function renderFormAbonoMeta(meta) {
  const { porcentaje, faltante } = calcularProgreso(meta);
  const faltanteHtml = faltante > 0
    ? ` · Faltante: <strong>${f(faltante)}</strong>`
    : '';

  const cuentasActivas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const cuentaHtml     = renderSelectorCuenta(cuentasActivas, { label: '¿De qué cuenta sale el abono?' });

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
      <p class="modal__intro">Escribe lo que quieres lograr. Con una fecha límite, Finko calcula cuánto guardar cada día para llegar a tiempo.</p>
      <div class="form-group">
        <label for="meta-nombre" class="label">Nombre de la meta</label>
        <input id="meta-nombre" name="nombre" class="input" type="text"
               placeholder="Ej. Viaje a la playa, laptop nueva, boda" required aria-required="true" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="meta-objetivo" class="label">Monto objetivo (COP)</label>
        <input id="meta-objetivo" name="montoObjetivo" class="input" type="number"
               min="1" step="10000" placeholder="0" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="meta-fecha" class="label">Fecha límite (opcional)</label>
        <input id="meta-fecha" name="fechaLimite" class="input" type="date" />
        <p class="form-hint">Sin fecha, la meta queda abierta. Con fecha, Finko muestra cuánto guardar por día para llegar a tiempo.</p>
      </div>
      <div class="form-group">
        <label for="meta-categoria" class="label">Categoría (opcional)</label>
        <select id="meta-categoria" name="categoria" class="input">
          <option value="">Sin categoría</option>
          ${_renderOpcionesCategoria()}
        </select>
        <p class="form-hint">Elige una categoría y Finko le pone el emoji automáticamente.</p>
      </div>
      <!-- MT.3: el emoji ya no es un campo suelto para toda meta; solo con
           categoría "Otra" tiene sentido elegirlo a mano (el resto ya trae
           el emoji de su categoría). index.js (_syncCategoriaMeta) alterna
           [hidden] al cambiar la categoría y limpia el valor al ocultarlo. -->
      <div class="form-group" id="form-group-meta-icono" hidden>
        <label for="meta-icono" class="label">Elige un emoji para tu meta</label>
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
 * Devuelve las `<option>` de CATEGORIAS_META con su emoji (MT.1), en el
 * orden del catálogo.
 * @returns {string}
 */
function _renderOpcionesCategoria() {
  return CATEGORIAS_META
    .map(cat => `<option value="${_esc(cat)}">${CATEGORIA_META_EMOJI[cat]} ${_esc(cat)}</option>`)
    .join('');
}
