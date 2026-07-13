/**
 * icon-picker.js - selector compacto de ícono para categorías/entidades
 * personalizadas (CAT.2). Un recuadro muestra el ícono elegido (o un
 * placeholder vacío); tocarlo despliega una grilla de íconos para elegir uno,
 * que se colapsa de nuevo al seleccionar. Reemplaza la grilla siempre-visible
 * de TX.9b (invasiva: llena la pantalla con el catálogo completo) por un
 * patrón compacto reutilizable en varios dominios (Gastos, Fijos, Deudas,
 * Cuentas, Apartados, Metas).
 *
 * Sin modal anidado a propósito (mismo criterio original de TX.9b, comentario
 * en gastos/index.js): un panel colapsable dentro del mismo formulario, no un
 * overlay nuevo. Evita además el bug latente de foco anidado que ya existe
 * en los pickers de `cuenta-helper.js` (trapFocus/releaseFocus son singleton).
 *
 * Reglas ADN:
 *   - Sin S: recibe el catálogo de íconos y el valor actual como parámetros.
 *   - Sin imports de dominios: solo infra.
 */

import { iconoCategoria } from './icons.js';
import { esc as _esc } from './utils.js';

/**
 * Renderiza el campo completo: recuadro + panel colapsado con la grilla +
 * input oculto que viaja con el FormData del formulario.
 *
 * @param {Array<{icono: string, etiqueta: string}>} iconos - catálogo a mostrar.
 * @param {{ id?: string, nombreCampo?: string, valorActual?: string|null, label?: string }} [opts]
 * @returns {string}
 */
export function renderIconoPicker(iconos, {
  id = 'icono-picker',
  nombreCampo = 'icono',
  valorActual = null,
  label = 'Ícono',
} = {}) {
  const botones = iconos.map(({ icono, etiqueta }) => `
    <button type="button" class="icono-picker__btn" data-icon="${_esc(icono)}"
            aria-pressed="${icono === valorActual ? 'true' : 'false'}"
            aria-label="${_esc(etiqueta)}" title="${_esc(etiqueta)}">
      ${iconoCategoria(icono)}
    </button>`).join('');

  const previewHtml = valorActual
    ? iconoCategoria(valorActual)
    : '<span class="icono-picker__vacio" aria-hidden="true">+</span>';

  return `
    <div class="icono-picker-field" data-icono-picker="${_esc(id)}">
      <span class="label">${_esc(label)}</span>
      <button type="button" class="icono-picker__recuadro" id="${_esc(id)}-recuadro"
              aria-expanded="false" aria-controls="${_esc(id)}-panel"
              aria-label="Elegir ícono">
        ${previewHtml}
      </button>
      <div class="icono-picker__panel" id="${_esc(id)}-panel"
           role="group" aria-label="${_esc(label)}" hidden>
        ${botones}
      </div>
      <input type="hidden" name="${_esc(nombreCampo)}" value="${_esc(valorActual ?? '')}" />
    </div>`;
}

/**
 * Conecta la interacción de un campo ya inyectado en el DOM: tocar el
 * recuadro abre/cierra el panel; elegir un ícono lo marca, actualiza el
 * recuadro y el input oculto, cierra el panel y dispara `onSeleccionar` si
 * se pasó.
 *
 * @param {HTMLElement|null} container - el nodo `[data-icono-picker]` de `renderIconoPicker`.
 * @param {{ onSeleccionar?: (icono: string) => void }} [opts]
 */
export function wireIconoPicker(container, { onSeleccionar } = {}) {
  if (!container) return;
  const recuadro = container.querySelector('.icono-picker__recuadro');
  const panel    = container.querySelector('.icono-picker__panel');
  const input    = container.querySelector('input[type="hidden"]');
  if (!recuadro || !panel || !input) return;

  recuadro.addEventListener('click', () => {
    const vaAAbrir = panel.hidden;
    panel.hidden = !vaAAbrir;
    recuadro.setAttribute('aria-expanded', vaAAbrir ? 'true' : 'false');
  });

  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('.icono-picker__btn');
    if (!btn) return;
    panel.querySelectorAll('.icono-picker__btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
    input.value = btn.dataset.icon;
    recuadro.innerHTML = iconoCategoria(btn.dataset.icon);
    panel.hidden = true;
    recuadro.setAttribute('aria-expanded', 'false');
    onSeleccionar?.(btn.dataset.icon);
  });
}
