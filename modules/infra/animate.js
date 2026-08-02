/**
 * animate.js - helpers de animación de UI reutilizables.
 *
 * Animaciones que requieren JS (las de CSS viven en los stylesheets).
 * Cada helper respeta prefers-reduced-motion por su cuenta: el llamador
 * no necesita chequearlo.
 */

import { f } from './utils.js';

/** RAF activo por elemento: una nueva llamada sobre el mismo el lo cancela. */
const _rafs = new WeakMap();

/** Timeout de resaltado activo por elemento: reentrante igual que _rafs. */
const _resaltados = new WeakMap();

function _easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

/**
 * Anima el texto de `el` contando desde `from` hasta `to`, formateado
 * como monto con `f()`. Pensado para valores financieros (saldo, totales).
 *
 * - Bajo prefers-reduced-motion fija el valor final sin animar.
 * - Reentrante por elemento: si llega un nuevo valor a mitad de animación,
 *   cancela la anterior y arranca desde donde corresponda el llamador.
 *
 * @param {HTMLElement} el - elemento cuyo textContent se anima.
 * @param {number} to - valor final.
 * @param {Object} [opts]
 * @param {number} [opts.from=0] - valor inicial.
 * @param {number} [opts.duration=500] - duración en ms.
 */
export function countUp(el, to, opts = {}) {
  if (!el) return;
  const { from = 0, duration = 500 } = opts;

  const prev = _rafs.get(el);
  if (prev) cancelAnimationFrame(prev);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = f(to);
    _rafs.delete(el);
    return;
  }

  const start = performance.now();
  const diff  = to - from;
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    el.textContent = f(Math.round(from + diff * _easeOutCubic(t)));
    if (t < 1) {
      _rafs.set(el, requestAnimationFrame(tick));
    } else {
      el.textContent = f(to);
      _rafs.delete(el);
    }
  }
  _rafs.set(el, requestAnimationFrame(tick));
}

/**
 * Cancela la animación de countUp activa sobre `el`, si la hay.
 * El textContent queda en el último frame pintado: el llamador decide qué
 * escribir después (ej. updSaldo al enmascarar el saldo, IN.2). Sin esto,
 * un frame pendiente sobreescribiría el texto nuevo con el monto animado.
 *
 * @param {HTMLElement} el
 */
export function stopCount(el) {
  if (!el) return;
  const prev = _rafs.get(el);
  if (prev) {
    cancelAnimationFrame(prev);
    _rafs.delete(el);
  }
}

/**
 * Resalta una fila (`.list-item`) recién guardada (ADR 033 D4): agrega
 * `.list-item--nuevo`, cuyo pseudo-elemento desvanece un tinte de dominio
 * por opacidad en ~600ms (compositor, sin animar background-color).
 *
 * - Bajo prefers-reduced-motion no agrega la clase: la fila queda visible
 *   igual, solo sin el destello.
 * - Reentrante por elemento: una nueva llamada sobre el mismo el reinicia
 *   el temporizador de limpieza.
 *
 * @param {HTMLElement} el - el `.list-item` recién insertado en el DOM.
 * @param {string} [dominio] - clave de dominio (`--fk-dom-<dominio>-bg`);
 *   sin ella usa el tinte por defecto del token en atoms.css.
 */
export function resaltarFilaNueva(el, dominio) {
  if (!el) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const prev = _resaltados.get(el);
  if (prev) clearTimeout(prev);

  if (dominio) el.style.setProperty('--fk-row-highlight-bg', `var(--fk-dom-${dominio}-bg)`);
  el.classList.add('list-item--nuevo');

  _resaltados.set(el, setTimeout(() => {
    el.classList.remove('list-item--nuevo');
    el.style.removeProperty('--fk-row-highlight-bg');
    _resaltados.delete(el);
  }, 600));
}
