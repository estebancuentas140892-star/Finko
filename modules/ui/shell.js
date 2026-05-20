/**
 * shell.js - navigation state + theme toggle
 */

import { EventBus } from '../core/state.js';

const THEME_KEY   = 'fk_theme';
const LIGHT_CLASS = 'light-theme';

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

// ── INIT ────────────────────────────────────────────────────────

export function initShell() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === 'light');
}
