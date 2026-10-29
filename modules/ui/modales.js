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
 * En el perfil niño (APR.3a) el fondo es su propia app, `#nino-app`.
 * @returns {HTMLElement | null}
 */
const _fondo = () => (document.body.classList.contains('kid')
  ? document.getElementById('nino-app')
  : document.querySelector('.app-shell'));

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
  //
  // Un cuadro después, no en el mismo: `inert` obliga a recalcular el estilo de
  // todo el fondo visible, y con la lista de Gastos a la vista son ~3.400
  // elementos, ~90 ms en un teléfono de gama media (PERF.11, medido con
  // scripts/perf/fluidez.js). Hecho acá retrasaba el primer cuadro de la hoja;
  // después del cuadro corre mientras la hoja entra animada en el compositor.
  // Mientras tanto el foco ya está atrapado y `aria-modal` ya avisa.
  requestAnimationFrame(() => setTimeout(() => {
    // Si se cerró antes de llegar acá, el fondo ya no debe quedar inerte.
    if ('open' in overlay.dataset) _fondo()?.setAttribute('inert', '');
  }, 0));
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
