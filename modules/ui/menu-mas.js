/**
 * menu-mas.js - manejo del menu "Mas opciones" del bottom nav mobile.
 *
 * Responsabilidad: cerrar la hoja automaticamente cuando el usuario hace
 * click en un item con href (navegacion). Desde NAV2.1a (ADR 040) es una
 * hoja inferior agrupada (Gestion del dinero / Ahorros / Ajustes + tema);
 * el boton de tema es un <button> sin href, asi que alternar el tema NO
 * cierra la hoja (a proposito: es un ajuste, no una navegacion).
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
