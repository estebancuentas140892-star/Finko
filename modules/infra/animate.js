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
