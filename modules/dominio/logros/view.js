/**
 * logros/view.js - "Tu progreso" (LG.2d, ADR 032 D6) y la vitrina de logros.
 *
 * Dos superficies, un solo dominio (ningún dominio importa a otro, ADN #10):
 * - `renderProgresoAnalisis()`: apartado colapsable en Análisis (bloque 6 del
 *   ADR 046 D4), la vitrina completa agrupada por familia.
 * - `renderTarjetaProgresoInicio()`: tarjeta compacta en Inicio (nivel actual
 *   + último logro + próximo objetivo).
 * Mudanza desde Ajustes: el ADR 022 (vitrina en `#panel-logros`) queda
 * Superada. Puede leer S. No puede mutarlo. Sin lógica de negocio (delega a
 * logic.js).
 */

import { S } from '../../core/state.js';
import { esc as _esc } from '../../infra/utils.js';
import { icon } from '../../infra/icons.js';
import { estadoLogros, agruparVitrina, nivelUsuario } from './logic.js';

/**
 * Renderiza el apartado "Tu progreso" en `#panel-analisis-progreso`, fila
 * colapsable (mismo lenguaje que los otros grupos de Análisis: teja + título
 * + subtítulo + chevron, DIS.10). No-op si el contenedor no existe.
 *
 * Preserva el estado abierto/cerrado entre renders (mismo criterio DIS.10 C11
 * que `analisis/view.js` aplica a sus dos colapsables): este contenedor se
 * repinta en cada `state:change` global, no solo al navegar a Análisis.
 */
export function renderProgresoAnalisis() {
  const el = document.getElementById('panel-analisis-progreso');
  if (!el) return;

  const estados = estadoLogros(S, S.logros);
  const n       = estados.filter(e => e.desbloqueado).length;
  const total   = estados.length;
  const nivel   = nivelUsuario(n);

  const items = agruparVitrina(estados)
    .map(item => item.tipo === 'familia' ? _renderFamiliaItem(item) : _renderLogroItem(item.logro))
    .join('');

  const previo  = el.querySelector('.analisis-grupo--progreso');
  const abierto = previo ? previo.open : null;

  el.innerHTML = `
    <details class="analisis-grupo analisis-grupo--fila analisis-grupo--progreso">
      <summary class="analisis-grupo__summary">
        <span class="analisis-grupo__teja" aria-hidden="true">${icon('trophy')}</span>
        <span class="analisis-grupo__texto">
          <h2 class="analisis-grupo__title">Tu progreso</h2>
          <span class="analisis-grupo__sub">Nivel ${_esc(nivel.nombre)} · ${n} de ${total} logros</span>
        </span>
        <svg class="icon analisis-grupo__chevron" aria-hidden="true"><use href="#i-chevron-right"/></svg>
      </summary>
      <div class="analisis-grupo__body">
        <ul class="logros-lista" role="list">${items}</ul>
      </div>
    </details>`;

  const nodo = el.querySelector('.analisis-grupo--progreso');
  if (nodo && abierto !== null) nodo.open = abierto;
}

/**
 * Renderiza la tarjeta compacta en `#panel-progreso-inicio` (ADR 032 D6):
 * nivel actual, último logro desbloqueado y próximo objetivo. Oculta hasta
 * el primer logro (una tarjeta vacía no orienta a nadie). No-op si el
 * contenedor no existe.
 */
export function renderTarjetaProgresoInicio() {
  const el = document.getElementById('panel-progreso-inicio');
  if (!el) return;

  const estados = estadoLogros(S, S.logros);
  const n = estados.filter(e => e.desbloqueado).length;
  if (n === 0) { el.hidden = true; return; }

  const total = estados.length;
  const nivel = nivelUsuario(n);

  // Sin fecha de desbloqueo (ADR 032 D1): el orden de inserción de S.logros
  // es el mejor proxy de "último logro" disponible.
  const ultimoId = S.logros[S.logros.length - 1];
  const ultimo   = ultimoId ? estados.find(e => e.id === ultimoId) : null;
  const objetivo = _proximoObjetivo(agruparVitrina(estados));

  el.hidden = false;
  el.innerHTML = `
    <div class="card__header">
      <h2 class="card__title">Tu progreso</h2>
      <span class="chip chip-success">Nivel ${_esc(nivel.nombre)}</span>
    </div>
    <p class="config-section__desc">${n} de ${total} logros desbloqueados.</p>
    <ul class="logros-lista" role="list">
      ${ultimo ? _renderLogroItem(ultimo) : ''}
      ${objetivo ? _renderLogroItem(objetivo) : ''}
    </ul>
    <a href="#analisis" class="link">Ver todo tu progreso</a>`;
}

/**
 * Primer objetivo pendiente en orden de vitrina: el siguiente nivel de la
 * primera familia que aún tenga uno, o el primer logro suelto sin desbloquear.
 * `null` si ya no queda nada pendiente (catálogo completo).
 *
 * @param {ReturnType<typeof agruparVitrina>} vitrina
 * @returns {ReturnType<typeof estadoLogros>[number] | null}
 */
function _proximoObjetivo(vitrina) {
  for (const item of vitrina) {
    if (item.tipo === 'familia') {
      if (item.siguiente) return item.siguiente;
    } else if (!item.logro.desbloqueado) {
      return item.logro;
    }
  }
  return null;
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
