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
 *   `label` vacío ('') omite el `<span>` de etiqueta (uso compacto, ej. junto
 *   a un campo de nombre que ya trae su propia etiqueta, CAT.2c).
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

  const labelHtml   = label ? `<span class="label">${_esc(label)}</span>` : '';
  const labelPanel  = label || 'Elegir ícono';

  return `
    <div class="icono-picker-field" data-icono-picker="${_esc(id)}">
      ${labelHtml}
      <button type="button" class="icono-picker__recuadro" id="${_esc(id)}-recuadro"
              aria-expanded="false" aria-controls="${_esc(id)}-panel"
              aria-label="Elegir ícono">
        ${previewHtml}
      </button>
      <div class="icono-picker__panel" id="${_esc(id)}-panel"
           role="group" aria-label="${_esc(labelPanel)}" hidden>
        ${botones}
      </div>
      <input type="hidden" name="${_esc(nombreCampo)}" id="${_esc(id)}" value="${_esc(valorActual ?? '')}" />
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

/**
 * Limpia la selección: vacía el input oculto, devuelve el recuadro al
 * placeholder, desmarca todos los botones y colapsa el panel. Para
 * consumidores donde el picker solo tiene sentido con una condición externa
 * (ej. Metas: el emoji manual solo aplica con categoría "Otra") y necesitan
 * resetearlo cuando esa condición deja de cumplirse.
 *
 * @param {HTMLElement|null} container - el nodo `[data-icono-picker]` de `renderIconoPicker`.
 */
export function resetIconoPicker(container) {
  if (!container) return;
  const recuadro = container.querySelector('.icono-picker__recuadro');
  const panel    = container.querySelector('.icono-picker__panel');
  const input    = container.querySelector('input[type="hidden"]');
  if (!recuadro || !panel || !input) return;

  input.value = '';
  recuadro.innerHTML = '<span class="icono-picker__vacio" aria-hidden="true">+</span>';
  panel.querySelectorAll('.icono-picker__btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
  panel.hidden = true;
  recuadro.setAttribute('aria-expanded', 'false');
}

/**
 * Fija un valor externo al picker (ej. una plantilla rápida que no vive en
 * la grilla del catálogo, como las plantillas de Apartados con emoji propio).
 * A diferencia de elegir un ícono de la grilla, `valor` puede no coincidir
 * con ningún `data-icon` del catálogo: en ese caso ningún botón queda
 * marcado (correcto, ya que ninguno representa la elección real), pero el
 * recuadro y el input oculto sí reflejan el valor externo.
 *
 * @param {HTMLElement|null} container - el nodo `[data-icono-picker]` de `renderIconoPicker`.
 * @param {string} valor - el valor a guardar en el input oculto (id de sprite o, como en
 *   este caso, un emoji crudo que la vista sabrá distinguir al renderizar).
 * @param {string} previewHtml - el HTML a mostrar en el recuadro (ej. el emoji tal cual).
 */
export function setIconoPickerValor(container, valor, previewHtml) {
  if (!container) return;
  const recuadro = container.querySelector('.icono-picker__recuadro');
  const panel    = container.querySelector('.icono-picker__panel');
  const input    = container.querySelector('input[type="hidden"]');
  if (!recuadro || !panel || !input) return;

  input.value = valor ?? '';
  recuadro.innerHTML = previewHtml || '<span class="icono-picker__vacio" aria-hidden="true">+</span>';
  panel.querySelectorAll('.icono-picker__btn').forEach(b =>
    b.setAttribute('aria-pressed', b.dataset.icon === valor ? 'true' : 'false'));
  panel.hidden = true;
  recuadro.setAttribute('aria-expanded', 'false');
}
