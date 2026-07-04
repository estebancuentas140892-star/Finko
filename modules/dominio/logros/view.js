/**
 * logros/view.js - vitrina de logros (LG.1b, ADR 022).
 *
 * Renderiza la card "🏆 Logros" en `#panel-logros`, contenedor del shell
 * dentro de la sección Ajustes. La renderiza este dominio (no config):
 * ningún dominio importa a otro (ADN #10), así que config no puede pedirla.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (delega a logic.js).
 */

import { S } from '../../core/state.js';
import { esc as _esc } from '../../infra/utils.js';
import { estadoLogros } from './logic.js';

/**
 * Renderiza la vitrina completa en `#panel-logros`.
 * No-op si el contenedor no existe.
 */
export function renderPanelLogros() {
  const el = document.getElementById('panel-logros');
  if (!el) return;

  const estados = estadoLogros(S, S.logros);
  const n       = estados.filter(e => e.desbloqueado).length;
  const total   = estados.length;

  const resumen = n === 0
    ? `Aún no has desbloqueado logros. Cada uno te dice cómo conseguirlo.`
    : n === total
      ? `¡Los desbloqueaste todos! ${n} de ${total} logros conseguidos.`
      : `Llevas ${n} de ${total} logros desbloqueados. Los pendientes te dicen cómo conseguirlos.`;

  el.innerHTML = `
    <section class="config-section" aria-labelledby="config-logros-title">
      <h2 class="config-section__title" id="config-logros-title">🏆 Logros</h2>
      <p class="config-section__desc">${resumen}</p>
      <ul class="logros-lista" role="list">
        ${estados.map(_renderLogroItem).join('')}
      </ul>
    </section>`;
}

/**
 * @param {ReturnType<typeof estadoLogros>[number]} l
 * @returns {string}
 */
function _renderLogroItem(l) {
  const clase = l.desbloqueado ? 'logro-item logro-item--on' : 'logro-item logro-item--off';
  // Desbloqueado: qué se consiguió. Pendiente: cómo desbloquearlo (hint).
  const texto = l.desbloqueado ? l.desc : l.hint;
  const chip  = l.desbloqueado
    ? '<span class="chip chip-success">Desbloqueado</span>'
    : '<span class="chip">Pendiente</span>';

  const progresoHtml = (!l.desbloqueado && l.progreso)
    ? `
        <div class="progress" role="progressbar"
             aria-valuenow="${l.progreso.actual}" aria-valuemin="0" aria-valuemax="${l.progreso.meta}"
             aria-label="Progreso: ${l.progreso.actual} de ${l.progreso.meta}">
          <div class="progress-bar" style="width:${Math.min(100, Math.round((l.progreso.actual / l.progreso.meta) * 100))}%"></div>
        </div>
        <p class="logro-item__progreso">${l.progreso.actual} de ${l.progreso.meta}</p>`
    : '';

  return `
      <li class="${clase}">
        <span class="logro-item__emoji" aria-hidden="true">${l.emoji}</span>
        <div class="logro-item__body">
          <p class="logro-item__nombre">${_esc(l.nombre)} ${chip}</p>
          <p class="logro-item__desc">${_esc(texto)}</p>
          ${progresoHtml}
        </div>
      </li>`;
}
