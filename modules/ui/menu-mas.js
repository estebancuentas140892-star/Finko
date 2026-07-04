/**
 * menu-mas.js - manejo del modal "Mas opciones" del bottom nav mobile.
 *
 * Responsabilidad: cerrar el modal automaticamente cuando el usuario hace
 * click en un item con href (navegacion). Desde NAV.B el modal es una sola
 * cuadricula de 7 tarjetas de navegacion, sin grupos ni botones de estado
 * (el toggle de tema que vivia aqui se retiro en una fase anterior).
 */

import { cerrarModal } from './modales.js';

/**
 * Inicializa el modal "Mas". Se llama una sola vez desde bootstrap.js.
 */
export function initMenuMas() {
  const modal = document.getElementById('modal-mas');
  if (!modal) return;

  // Al hacer click en un link de navegacion adentro del modal, cerrar.
  modal.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (link) cerrarModal(modal);
  });
}
