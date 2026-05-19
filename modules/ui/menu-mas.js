/**
 * menu-mas.js - manejo del modal "Mas opciones" del bottom nav mobile.
 *
 * Responsabilidades:
 * - Cerrar el modal automaticamente cuando el usuario hace click en un item
 *   con href (navegacion). El theme-toggle NO cierra el modal para que el
 *   usuario pueda ver el cambio inmediato y seguir interactuando.
 * - Sincronizar el icono del boton de tema dentro del modal con el estado
 *   actual (sol / luna) tras cada toggle.
 */

import { cerrarModal } from './modales.js';
import { EventBus } from '../core/state.js';

/**
 * Inicializa el modal "Mas". Se llama una sola vez desde bootstrap.js.
 */
export function initMenuMas() {
  const modal = document.getElementById('modal-mas');
  if (!modal) return;

  // Al hacer click en un link de navegacion adentro del modal, cerrar.
  // El theme-toggle (boton, sin href) se exceptua: el usuario debe ver el
  // cambio sin que el modal desaparezca.
  modal.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (link) cerrarModal(modal);
  });

  // Sincronizar icono del boton tema en el modal segun el estado inicial
  // y suscribirse a cambios via EventBus.
  _syncIconoTema();
  EventBus.on('theme:change', _syncIconoTema);
}

/** Actualiza el emoji del boton de tema dentro del modal segun el tema activo. */
function _syncIconoTema() {
  const btn = document.getElementById('menu-mas-tema');
  if (!btn) return;
  const light = document.body.classList.contains('light-theme');
  const icon  = btn.querySelector('.menu-mas__icon');
  const label = btn.querySelector('.menu-mas__label');
  if (icon)  icon.textContent  = light ? '☀️' : '🌙';
  if (label) label.textContent = light ? 'Tema claro' : 'Tema oscuro';
  btn.setAttribute('aria-pressed', String(light));
}
