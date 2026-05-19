/**
 * modales.js - factory de modales con contrato uniforme.
 *
 * Contrato:
 * - abrirModal: activa overlay, quita aria-hidden, atrapa foco.
 * - cerrarModal: desactiva overlay, restaura aria-hidden, libera foco.
 * - resetModal: limpia campos del formulario interno.
 */

import { trapFocus, releaseFocus } from '../infra/a11y.js';

/**
 * Abre un modal overlay.
 *
 * @param {HTMLElement} overlay - elemento `.modal-overlay` a abrir.
 */
export function abrirModal(overlay) {
  overlay.dataset.open = '';
  overlay.removeAttribute('aria-hidden');
  // Atrapar foco en el panel interno del modal (no en el overlay/backdrop).
  const panel = overlay.querySelector('.modal') ?? overlay;
  trapFocus(panel);
}

/**
 * Cierra un modal overlay y devuelve el foco al elemento que lo abrió.
 *
 * @param {HTMLElement} overlay
 */
export function cerrarModal(overlay) {
  delete overlay.dataset.open;
  overlay.setAttribute('aria-hidden', 'true');
  releaseFocus();
}

/**
 * Resetea todos los campos de formulario dentro de un modal.
 * Llamar antes de abrir un modal en modo "nuevo" para evitar datos residuales.
 *
 * @param {HTMLElement} modal - puede ser el overlay o el panel `.modal`.
 */
export function resetModal(modal) {
  modal.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = false;
    } else {
      el.value = '';
    }
  });
}
