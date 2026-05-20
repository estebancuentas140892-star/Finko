/**
 * shell.js - navigation state, theme toggle y sidebar colapsable.
 */

import { EventBus } from '../core/state.js';

const THEME_KEY    = 'fk_theme';
const LIGHT_CLASS  = 'light-theme';
const SIDEBAR_KEY  = 'fk_sidebar_collapsed';

// ── THEME ───────────────────────────────────────────────────────

// Timer para quitar .theme-transitioning. Se guarda para resetear si el
// usuario hace toggle varias veces seguidas.
let _transitionTimer = null;

/**
 * Aplica el tema (dark/light) y activa una transicion CSS suave.
 *
 * Tecnica "class transitioning": se agrega .theme-transitioning al body
 * ANTES del cambio de clase para que los descendientes interpolen
 * background-color, border-color y color en lugar de cambiar de golpe.
 * La clase se quita despues de 350ms (ligeramente mayor que los 280ms
 * de la transicion CSS para dar margen a slow-mo mobile).
 *
 * @param {boolean} light - true = tema claro, false = tema oscuro.
 */
function applyTheme(light) {
  // Activar transicion antes del swap de clase de tema.
  if (_transitionTimer) clearTimeout(_transitionTimer);
  document.body.classList.add('theme-transitioning');

  document.body.classList.toggle(LIGHT_CLASS, light);
  localStorage.setItem(THEME_KEY, light ? 'light' : 'dark');
  _syncThemeButton(light);
  EventBus.emit('theme:change', { light });

  // Limpiar la clase cuando la transicion ya termino.
  _transitionTimer = setTimeout(() => {
    document.body.classList.remove('theme-transitioning');
    _transitionTimer = null;
  }, 350);
}

function _syncThemeButton(light) {
  const btn = document.querySelector('[data-action="theme-toggle"]');
  if (!btn) return;
  const icon  = btn.querySelector('.nav-item__icon');
  const label = btn.querySelector('.nav-item__label');
  if (icon)  icon.textContent  = light ? '☀️' : '🌙';
  if (label) label.textContent = light ? 'Modo claro' : 'Modo oscuro';
  btn.setAttribute('aria-pressed', String(light));
}

export function toggleTheme() {
  applyTheme(!document.body.classList.contains(LIGHT_CLASS));
}

// ── ACTIVE NAV ──────────────────────────────────────────────────

export function markActiveNav(hash) {
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    const active = item.dataset.section === hash;
    item.classList.toggle('active', active);
    item.setAttribute('aria-current', active ? 'page' : 'false');
  });
}

// ── SIDEBAR COLLAPSE ────────────────────────────────────────────

/**
 * Sincroniza el boton colapsar: aria-expanded, aria-label y label de texto.
 * @param {boolean} collapsed
 */
function _syncCollapseButton(collapsed) {
  const btn = document.querySelector('[data-action="sidebar-toggle"]');
  if (!btn) return;
  btn.setAttribute('aria-expanded', String(!collapsed));
  btn.setAttribute('aria-label', collapsed ? 'Expandir navegación' : 'Colapsar navegación');
  const label = btn.querySelector('.nav-item__label');
  if (label) label.textContent = collapsed ? 'Expandir' : 'Colapsar';
}

/**
 * Agrega/quita title en los nav items del sidebar para mostrar un tooltip
 * nativo del navegador cuando los labels estan ocultos (modo colapsado).
 * @param {boolean} collapsed
 */
function _syncNavTitles(collapsed) {
  document.querySelectorAll('#sidebar .nav-item').forEach(item => {
    const label = item.querySelector('.nav-item__label');
    if (!label) return;
    if (collapsed) {
      item.title = label.textContent.trim();
    } else {
      item.removeAttribute('title');
    }
  });
}

let _sidebarTimer = null;

/**
 * Alterna el estado colapsado del sidebar y persiste en localStorage.
 * Activa la transicion CSS solo durante el toggle (clase sidebar-animating),
 * no en la carga inicial ni al redimensionar la ventana.
 */
export function toggleSidebarCollapse() {
  // Activar transicion antes del toggle de clase
  if (_sidebarTimer) clearTimeout(_sidebarTimer);
  document.body.classList.add('sidebar-animating');

  const collapsed = document.body.classList.toggle('sidebar-collapsed');
  localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  _syncCollapseButton(collapsed);
  _syncNavTitles(collapsed);

  // Limpiar la clase de transicion cuando el layout ya termino de animar
  _sidebarTimer = setTimeout(() => {
    document.body.classList.remove('sidebar-animating');
    _sidebarTimer = null;
  }, 300);
}

/**
 * Restaura el estado del sidebar desde localStorage al iniciar la app.
 * Se llama sincronamente antes del primer render para evitar parpadeo.
 */
export function initSidebarCollapse() {
  const collapsed = localStorage.getItem(SIDEBAR_KEY) === 'true';
  if (collapsed) {
    document.body.classList.add('sidebar-collapsed');
    _syncCollapseButton(true);
    _syncNavTitles(true);
  }
}

// ── INIT ────────────────────────────────────────────────────────

export function initShell() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === 'light');
}
