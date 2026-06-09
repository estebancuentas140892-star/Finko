/**
 * actions.js - delegador central de data-action.
 *
 * Contrato:
 * - Es el ÚNICO lugar que registra addEventListener en document.
 * - Los dominios llaman registrarAccion() en su propio bootstrap para añadir handlers.
 * - Las acciones built-in del shell (theme-toggle, modal-*) se registran en initAcciones().
 */

import { toggleTheme, toggleSidebarCollapse } from './shell.js';
import { abrirModal, cerrarModal } from './modales.js';
import { navigate } from '../infra/router.js';

/** Mapa de acciones registradas: nombre → función handler. */
const _acciones = new Map();

/**
 * Registra una acción. Los dominios la llaman durante su inicialización.
 * Si el nombre ya existe, sobreescribe silenciosamente.
 *
 * @param {string} nombre - valor de `data-action` en el HTML.
 * @param {(el: HTMLElement, e: Event) => void} fn
 */
export function registrarAccion(nombre, fn) {
  _acciones.set(nombre, fn);
}

/**
 * Despacha un click al handler registrado.
 * Separada de _handleClick para facilitar tests.
 *
 * @param {HTMLElement} el - elemento con data-action.
 * @param {Event} e
 */
export function dispatch(el, e) {
  const fn = _acciones.get(el.dataset.action);
  if (fn) {
    e.preventDefault();
    fn(el, e);
  }
}

/** @param {MouseEvent} e */
function _handleClick(e) {
  const el = e.target.closest('[data-action]');
  if (el) dispatch(el, e);
}

/** @param {KeyboardEvent} e */
function _handleKeydown(e) {
  if (e.key !== 'Escape') return;
  const open = document.querySelector('.modal-overlay[data-open]');
  if (open) cerrarModal(open);
}

/**
 * Registra las acciones built-in y activa la escucha en document.
 * Llamada una sola vez desde bootstrap.js.
 */
export function initAcciones() {
  registrarAccion('theme-toggle', () => toggleTheme());
  registrarAccion('sidebar-toggle', () => toggleSidebarCollapse());

  registrarAccion('modal-open', (el) => {
    const overlay = document.getElementById(el.dataset.modal);
    if (overlay) abrirModal(overlay);
  });

  registrarAccion('modal-close', (el) => {
    const overlay = el.closest('.modal-overlay');
    if (overlay) cerrarModal(overlay);
  });

  // Cierra el modal abierto (si lo hay) y navega a una sección. Necesaria
  // porque dispatch() hace e.preventDefault() para toda data-action, lo que
  // cancela la navegación nativa de un <a href="#seccion">: sin esta acción,
  // un enlace dentro de un modal solo cerraría el modal sin cambiar de sección.
  // El destino sale de data-target o, en su defecto, del hash del href.
  // Reutilizable por todos los CTA "ir a Mis cuentas / a otra sección".
  registrarAccion('ir-a-seccion', (el) => {
    const overlay = el.closest('.modal-overlay');
    if (overlay) cerrarModal(overlay);
    const destino = el.dataset.target
      || (el.getAttribute('href') || '').replace(/^#/, '');
    if (destino) navigate(destino);
  });

  document.addEventListener('click', _handleClick);
  document.addEventListener('keydown', _handleKeydown);
}
