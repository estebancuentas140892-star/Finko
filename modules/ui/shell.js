/**
 * shell.js - navigation state + theme toggle
 */

import { EventBus } from '../core/state.js';

const THEME_KEY   = 'fk_theme';
const LIGHT_CLASS = 'light-theme';

// ── THEME ───────────────────────────────────────────────────────

function applyTheme(light) {
  document.body.classList.toggle(LIGHT_CLASS, light);
  localStorage.setItem(THEME_KEY, light ? 'light' : 'dark');
  _syncThemeButton(light);
  EventBus.emit('theme:change', { light });
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
