/**
 * resumen/view.js - card de resumen semanal en el dashboard (F8).
 *
 * Renderiza en `#panel-resumen` un panel de solo lectura con el gasto de la
 * semana, su comparación con la semana previa, la categoría top y los días
 * activos del mes. Aparece solo cuando hay actividad (patrón [hidden] del bento).
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (toda en logic.js).
 */

import { S } from '../../core/state.js';
import { f, esc as _esc, hoy } from '../../infra/utils.js';
import { icon } from '../../infra/icons.js';
import { resumenSemanal, hayResumen } from './logic.js';

/**
 * Texto de la tendencia según la comparación con la semana previa.
 * Tono neutral, sin castigo: la subida no se presenta como alarma (ADR 008).
 *
 * @param {{ direccion: string, pct: number|null }} comp
 * @returns {string}
 */
function _textoTendencia(comp) {
  switch (comp.direccion) {
    case 'subió': return `Gastaste ${comp.pct}% más que la semana pasada`;
    case 'bajó':  return `Gastaste ${comp.pct}% menos que la semana pasada`;
    case 'igual': return 'Casi igual que la semana pasada';
    default:      return 'Sin gastos la semana pasada para comparar';
  }
}

/**
 * Modificador de color de la tendencia.
 * Solo la bajada se refuerza en positivo (acento); la subida queda neutra
 * para no convertir el resumen en un regaño.
 *
 * @param {string} direccion
 * @returns {string}
 */
function _tonoTendencia(direccion) {
  if (direccion === 'bajó')  return 'resumen-card__trend--baja';
  if (direccion === 'subió') return 'resumen-card__trend--sube';
  return 'resumen-card__trend--neutro';
}

/**
 * Renderiza la card de resumen semanal. No-op si el contenedor no existe.
 * Oculta el panel cuando no hay actividad suficiente esta semana.
 */
export function renderPanelResumen() {
  const el = document.getElementById('panel-resumen');
  if (!el) return;

  const hoyISO = hoy();
  const gastos = S.gastos;

  if (!hayResumen(gastos, hoyISO)) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const r = resumenSemanal(gastos, hoyISO);

  const statTop = r.top
    ? `
      <div class="resumen-card__stat">
        <p class="resumen-card__label">Categoría con más gasto</p>
        <p class="resumen-card__value resumen-card__value--sm">${_esc(r.top.categoria)}</p>
        <p class="resumen-card__sub">${f(r.top.total)}</p>
      </div>`
    : '';

  const registrosTxt = r.registros === 1
    ? '1 registro esta semana'
    : `${r.registros} registros esta semana`;

  const diasTxt = r.diasActivos === 1
    ? '1 día activo este mes'
    : `${r.diasActivos} días activos este mes`;

  el.innerHTML = `
    <section class="resumen-card" aria-label="Resumen de la semana">
      <header class="resumen-card__header">
        <h2 class="resumen-card__title">${icon('analisis')} Resumen de la semana</h2>
      </header>
      <div class="resumen-card__grid">
        <div class="resumen-card__stat resumen-card__stat--primary">
          <p class="resumen-card__label">Gastaste estos 7 días</p>
          <p class="resumen-card__value">${f(r.actual)}</p>
          <p class="resumen-card__trend ${_tonoTendencia(r.comparacion.direccion)}">${_textoTendencia(r.comparacion)}</p>
        </div>
        ${statTop}
        <div class="resumen-card__stat">
          <p class="resumen-card__label">Constancia</p>
          <p class="resumen-card__value resumen-card__value--sm">${diasTxt}</p>
          <p class="resumen-card__sub">${registrosTxt}</p>
        </div>
      </div>
    </section>`;
}
