/**
 * a11y.js - utilidades de accesibilidad.
 *
 * - `announce`: notifica a screen readers sin interrumpir la UI.
 * - `trapFocus` / `releaseFocus`: ciclo de foco para modales (WCAG 2.4.3).
 */

/** Selector de todos los elementos interactivos dentro de un contenedor. */
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Elemento que tenía el foco antes de abrir el modal. */
let _prevFocus = null;

/** Contenedor del trap activo. */
let _trapEl = null;

// ── LIVE REGION ──────────────────────────────────────────────────

/**
 * Anuncia un mensaje a los screen readers sin cambiar el foco.
 * `polite` espera a que el lector termine; `assertive` interrumpe.
 *
 * @param {string} msg
 * @param {'polite' | 'assertive'} [politeness='polite']
 */
export function announce(msg, politeness = 'polite') {
  const region = _getOrCreateLiveRegion(politeness);
  // Vaciar primero para forzar re-anuncio si el mensaje es idéntico al anterior.
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = msg;
  });
}

/**
 * Obtiene (o crea) la live region aria del tipo indicado.
 * Se inyecta una sola vez en `document.body` con clase `sr-only`.
 *
 * @param {'polite' | 'assertive'} politeness
 * @returns {HTMLElement}
 */
function _getOrCreateLiveRegion(politeness) {
  const id = `fk-live-${politeness}`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.setAttribute('aria-live', politeness);
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    document.body.appendChild(el);
  }
  return el;
}

// ── TRAP DE FOCO ─────────────────────────────────────────────────

/**
 * Activa el trap de foco dentro de `el`.
 * Guarda el elemento activo para restaurarlo en `releaseFocus`.
 * Mueve el foco al primer elemento interactivo del contenedor.
 *
 * @param {HTMLElement} el - contenedor del modal o panel.
 */
export function trapFocus(el) {
  _prevFocus = document.activeElement;
  _trapEl = el;
  el.addEventListener('keydown', _handleTrap);

  const focusable = el.querySelectorAll(FOCUSABLE_SELECTOR);
  focusable[0]?.focus();
}

/**
 * Libera el trap de foco y devuelve el foco al elemento anterior.
 */
export function releaseFocus() {
  if (_trapEl) {
    _trapEl.removeEventListener('keydown', _handleTrap);
    _trapEl = null;
  }
  _prevFocus?.focus();
  _prevFocus = null;
}

/**
 * Handler interno: cicla el foco con Tab / Shift+Tab dentro del trap.
 *
 * @param {KeyboardEvent} e
 */
function _handleTrap(e) {
  if (e.key !== 'Tab' || !_trapEl) return;

  const focusable = [..._trapEl.querySelectorAll(FOCUSABLE_SELECTOR)];
  if (focusable.length === 0) {
    e.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
