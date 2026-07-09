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
import { estadoLogros, agruparVitrina, nivelUsuario } from './logic.js';

/**
 * Renderiza la vitrina completa en `#panel-logros`.
 * LG.2b (ADR 032): encabezado con el nivel de usuario derivado del conteo y
 * lista agrupada por familia (una tarjeta por familia: nivel más alto
 * desbloqueado + siguiente nivel como objetivo).
 * No-op si el contenedor no existe.
 */
export function renderPanelLogros() {
  const el = document.getElementById('panel-logros');
  if (!el) return;

  const estados = estadoLogros(S, S.logros);
  const n       = estados.filter(e => e.desbloqueado).length;
  const total   = estados.length;
  const nivel   = nivelUsuario(n);

  const resumen = n === 0
    ? `Aún no has desbloqueado logros. Cada uno te dice cómo conseguirlo.`
    : n === total
      ? `¡Los desbloqueaste todos! ${n} de ${total} logros conseguidos.`
      : `Llevas ${n} de ${total} logros desbloqueados. Los pendientes te dicen cómo conseguirlos.`;

  const items = agruparVitrina(estados)
    .map(item => item.tipo === 'familia' ? _renderFamiliaItem(item) : _renderLogroItem(item.logro))
    .join('');

  el.innerHTML = `
    <section class="config-section" aria-labelledby="config-logros-title">
      <h2 class="config-section__title" id="config-logros-title">🏆 Logros</h2>
      <p class="config-section__desc">Tu nivel: <strong>${_esc(nivel.nombre)}</strong>. ${resumen}</p>
      <ul class="logros-lista" role="list">
        ${items}
      </ul>
    </section>`;
}

/**
 * Tarjeta de una familia de logros (LG.2b, ADR 032 D1): muestra el nivel más
 * alto desbloqueado como estado y el siguiente nivel como objetivo, con su
 * barra de progreso si el nivel pendiente la expone.
 *
 * @param {ReturnType<import('./logic.js').agruparVitrina>[number] & { tipo: 'familia' }} fam
 * @returns {string}
 */
function _renderFamiliaItem(fam) {
  const activa = fam.desbloqueados > 0;
  const clase  = activa ? 'logro-item logro-item--on' : 'logro-item logro-item--off';
  const emoji  = (fam.actual ?? fam.siguiente)?.emoji ?? '🏅';
  const chip   = activa
    ? `<span class="chip chip-success">Nivel ${fam.desbloqueados} de ${fam.totalNiveles}</span>`
    : '<span class="chip">Pendiente</span>';

  // Estado: qué se consiguió (nivel actual) o cómo arrancar (hint del nivel 1).
  const texto = fam.actual ? fam.actual.desc : fam.siguiente?.hint ?? '';

  // Objetivo: el siguiente nivel, con barra si expone progreso.
  const sig = fam.siguiente;
  const siguienteHtml = (activa && sig)
    ? `<p class="logro-item__progreso">Siguiente: ${_esc(sig.hint)}</p>`
    : '';
  const progresoHtml = (sig && sig.progreso)
    ? `
        <div class="progress" role="progressbar"
             aria-valuenow="${sig.progreso.actual}" aria-valuemin="0" aria-valuemax="${sig.progreso.meta}"
             aria-label="Progreso: ${sig.progreso.actual} de ${sig.progreso.meta}">
          <div class="progress-bar" style="width:${Math.min(100, Math.round((sig.progreso.actual / sig.progreso.meta) * 100))}%"></div>
        </div>
        <p class="logro-item__progreso">${sig.progreso.actual} de ${sig.progreso.meta}</p>`
    : '';

  return `
      <li class="${clase}">
        <span class="logro-item__emoji" aria-hidden="true">${emoji}</span>
        <div class="logro-item__body">
          <p class="logro-item__nombre">${_esc(fam.nombre)} ${chip}</p>
          <p class="logro-item__desc">${_esc(texto)}</p>
          ${siguienteHtml}
          ${progresoHtml}
        </div>
      </li>`;
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
