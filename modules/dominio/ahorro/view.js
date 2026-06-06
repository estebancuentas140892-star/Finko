/**
 * ahorro/view.js - HTML del dominio Ahorro (J.1).
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f } from '../../infra/utils.js';
import {
  calcularObjetivoFondo,
  calcularProgresoFondo,
  mesesDeColchon,
  META_MESES_MIN,
  META_MESES_MAX,
} from './logic.js';

// ── RENDER PRINCIPAL ─────────────────────────────────────────────

/**
 * Renderiza el panel de Ahorro en `#panel-ahorro`.
 *
 * @param {number} gastosFijosMensuales COP/mes que el caller (index.js) ya
 *                                      calculó a partir de S.compromisos.
 *                                      No leemos compromisos aquí para
 *                                      respetar la regla ADN #10.
 */
export function renderAhorro(gastosFijosMensuales) {
  const el = document.getElementById('panel-ahorro');
  if (!el) return;

  const fondo = S.ahorro?.fondoEmergencia ?? { activo: false, metaMeses: 3, montoActual: 0 };

  if (!fondo.activo) {
    el.innerHTML = _renderEmptyState(gastosFijosMensuales);
    return;
  }

  el.innerHTML = _renderHero(fondo, gastosFijosMensuales);
}

// ── EMPTY STATE ──────────────────────────────────────────────────

function _renderEmptyState(gastosFijosMensuales) {
  // Si ya hay gastos fijos registrados, mostramos una preview del objetivo
  // (3 meses) para que el usuario vea desde el inicio cuánto vale el colchón.
  const objetivoPreview = calcularObjetivoFondo(gastosFijosMensuales, 3);
  const preview = objetivoPreview > 0
    ? `<p class="empty-state__tip">📊 Con tus gastos fijos actuales, 3 meses de colchón equivalen a <strong>${f(objetivoPreview)}</strong>.</p>`
    : `<p class="empty-state__tip">💡 Tip: registra tus gastos fijos (arriendo, servicios, suscripciones) desde Agenda para que Finko calcule cuánto necesitas en tu fondo.</p>`;

  return `
    <div class="empty-state">
      <p class="empty-state__icon" aria-hidden="true">🐷</p>
      <p class="empty-state__title">Empieza tu fondo de emergencia</p>
      <p class="empty-state__desc">Es la base de cualquier plan financiero: un colchón con 3 a 6 meses de tus gastos fijos para imprevistos (salud, trabajo, casa). Sin esto, una urgencia se paga con deuda cara.</p>
      <button class="btn btn-primary" data-action="ahorro-activar-fondo">+ Activar fondo</button>
      ${preview}
    </div>`;
}

// ── HERO DEL FONDO (estado activo) ───────────────────────────────

function _renderHero(fondo, gastosFijosMensuales) {
  const { metaMeses, montoActual } = fondo;
  const objetivo  = calcularObjetivoFondo(gastosFijosMensuales, metaMeses);
  const progreso  = calcularProgresoFondo(montoActual, objetivo);
  const colchon   = mesesDeColchon(montoActual, gastosFijosMensuales);
  const { porcentaje, faltante, completado } = progreso;

  const claseProgreso = completado
    ? 'progress-bar--complete'
    : porcentaje >= 80 ? 'progress-bar--near' : '';

  // Subtítulo de meses cubiertos. Si no hay gastos fijos registrados aún,
  // mostramos solo el monto sin proyección (sin esto el dato no tiene sentido).
  const subColchon = colchon === null
    ? `<span class="fondo-hero__sub">Registra tus gastos fijos para ver cuántos meses cubre.</span>`
    : completado
      ? `<span class="fondo-hero__sub fondo-hero__sub--ok">✓ Cubre ${_fmtMeses(colchon)} de tus gastos fijos.</span>`
      : `<span class="fondo-hero__sub">Cubre ${_fmtMeses(colchon)} de los ${metaMeses} que apuntas.</span>`;

  // Si no hay objetivo (porque no hay gastos fijos), avisamos al usuario.
  const labelObjetivo = objetivo > 0
    ? `Objetivo: ${f(objetivo)} (${metaMeses} ${metaMeses === 1 ? 'mes' : 'meses'} de gastos fijos)`
    : `Aún no hay un objetivo: registra tus gastos fijos para calcularlo.`;

  const faltanteHtml = !completado && objetivo > 0
    ? `<p class="fondo-hero__faltante">Te faltan <strong>${f(faltante)}</strong>.</p>`
    : '';

  const banner = completado
    ? `<p class="fondo-hero__banner" role="status">🎉 ¡Fondo de emergencia completo! Cualquier aporte extra suma colchón.</p>`
    : '';

  return `
    <article class="fondo-hero" aria-label="Fondo de emergencia">
      <header class="fondo-hero__header">
        <div class="fondo-hero__icon" aria-hidden="true">
          <svg class="icon" aria-hidden="true"><use href="#i-ahorro"/></svg>
        </div>
        <div class="fondo-hero__title-wrap">
          <p class="fondo-hero__label">Fondo de emergencia</p>
          <p class="fondo-hero__title">${f(montoActual)}</p>
          ${subColchon}
        </div>
        <button class="btn btn-ghost btn-icon"
                data-action="ahorro-editar"
                aria-label="Editar fondo de emergencia">
          <svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg>
        </button>
      </header>

      <div class="progress fondo-hero__progress" role="progressbar"
           aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"
           aria-label="Progreso del fondo: ${porcentaje}%">
        <div class="progress-bar ${claseProgreso}" style="width:${porcentaje}%"></div>
      </div>
      <p class="fondo-hero__meta">
        <span class="fondo-hero__pct">${porcentaje}%</span>
        <span class="fondo-hero__meta-label">${labelObjetivo}</span>
      </p>

      ${faltanteHtml}
      ${banner}
    </article>`;
}

// ── FORMULARIO MODAL (activar / editar) ──────────────────────────

/**
 * HTML del formulario para activar el fondo o editarlo (monto + meta de meses).
 * Se inyecta en `#modal-ahorro-body`.
 *
 * @param {Object} opts
 * @param {boolean} opts.editando            true si el fondo ya existe.
 * @param {number}  opts.metaMeses           Valor inicial del input meses.
 * @param {number}  opts.montoActual         Valor inicial del input monto.
 * @param {number}  opts.gastosFijosMensuales COP/mes para preview del objetivo.
 * @returns {string}
 */
export function renderFormFondo({ editando, metaMeses, montoActual, gastosFijosMensuales }) {
  const objetivoPreview = calcularObjetivoFondo(gastosFijosMensuales, metaMeses);
  const previewHtml = objetivoPreview > 0
    ? `<p class="form-hint">Con esa meta tu objetivo sería <strong>${f(objetivoPreview)}</strong> (${metaMeses} ${metaMeses === 1 ? 'mes' : 'meses'} × ${f(gastosFijosMensuales)} de gastos fijos al mes).</p>`
    : `<p class="form-hint">Aún no hay gastos fijos registrados. Cuando los agregues desde Agenda, Finko calcula automáticamente el objetivo.</p>`;

  return `
    <form id="form-fondo" novalidate>
      <div class="form-group">
        <label for="fondo-meta-meses" class="label">Meses de gastos fijos que quieres cubrir</label>
        <input id="fondo-meta-meses" name="metaMeses" class="input" type="number"
               min="${META_MESES_MIN}" max="${META_MESES_MAX}" step="1"
               value="${metaMeses}" required aria-required="true"
               inputmode="numeric" />
        <p class="form-hint">Recomendado: 3 meses si tienes ingresos estables, 6 si son variables.</p>
      </div>

      <div class="form-group">
        <label for="fondo-monto-actual" class="label">¿Cuánto ya tienes apartado? (COP)</label>
        <input id="fondo-monto-actual" name="montoActual" class="input" type="number"
               min="0" step="10000" value="${montoActual}"
               placeholder="0" required aria-required="true"
               inputmode="numeric" />
        <p class="form-hint">Si todavía no tienes nada, déjalo en 0. Lo vas a ir sumando con cada aporte.</p>
      </div>

      ${previewHtml}

      <div class="modal__footer">
        ${editando
          ? `<button type="button" class="btn btn-ghost" data-action="ahorro-desactivar">Desactivar fondo</button>`
          : `<button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>`}
        <button type="submit" class="btn btn-primary">${editando ? 'Guardar cambios' : 'Activar fondo'}</button>
      </div>
    </form>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

/**
 * Formatea una cantidad de meses con 1 decimal pero suprime el ".0" cuando es
 * entero. Ej: 1 → "1 mes", 2.5 → "2,5 meses", 3 → "3 meses".
 */
function _fmtMeses(n) {
  if (n == null) return '';
  const entero = Math.abs(n - Math.round(n)) < 0.05;
  const valor  = entero ? Math.round(n) : n.toString().replace('.', ',');
  return `${valor} ${Math.abs(n - 1) < 0.05 ? 'mes' : 'meses'}`;
}
