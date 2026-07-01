/**
 * modales.js - factory de modales con contrato uniforme.
 *
 * Contrato:
 * - abrirModal: activa overlay, quita aria-hidden, marca el fondo inerte, atrapa foco.
 * - cerrarModal: desactiva overlay, restaura aria-hidden, libera el fondo y el foco.
 * - resetModal: limpia campos del formulario interno.
 */

import { trapFocus, releaseFocus } from '../infra/a11y.js';

/**
 * Fondo de la app (todo menos los modales, que viven como hermanos de este nodo).
 * Se marca `inert` mientras hay un modal abierto para que el lector de pantalla
 * no pueda navegar el contenido de atrás (WCAG 2.4.3, refuerza `aria-modal`).
 * @returns {HTMLElement | null}
 */
const _fondo = () => document.querySelector('.app-shell');

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
  // Inertizar el fondo después de trapFocus: trapFocus ya guardó el botón que
  // abrió el modal para restaurarlo al cerrar, así que marcar el fondo inerte
  // ahora no le roba ese elemento (el foco ya está dentro del modal).
  _fondo()?.setAttribute('inert', '');
}

/**
 * Cierra un modal overlay y devuelve el foco al elemento que lo abrió.
 *
 * @param {HTMLElement} overlay
 */
export function cerrarModal(overlay) {
  delete overlay.dataset.open;
  overlay.setAttribute('aria-hidden', 'true');
  // Liberar el fondo ANTES de restaurar el foco: el botón que abrió el modal
  // vive dentro del fondo y no puede recibir foco mientras siga inerte.
  _fondo()?.removeAttribute('inert');
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
