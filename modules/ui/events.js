/**
 * events.js — bootstrap
 * Entry point: registers all data-action handlers and initializes the app.
 */

import { initRouter } from '../infra/router.js';
import { initShell, markActiveNav, toggleTheme } from './shell.js';
import { loadData } from '../core/storage.js';

// ── MODAL HELPERS ───────────────────────────────────────────────

export function openModal(overlay) {
  overlay.dataset.open = '';
  overlay.removeAttribute('aria-hidden');
  const focusable = overlay.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  focusable?.focus();
}

export function closeModal(overlay) {
  delete overlay.dataset.open;
  overlay.setAttribute('aria-hidden', 'true');
}

// ── ACTION REGISTRY ─────────────────────────────────────────────

const ACTIONS = {
  'theme-toggle': () => toggleTheme(),

  'modal-open': (el) => {
    const id = el.dataset.modal;
    const overlay = document.getElementById(id);
    if (overlay) openModal(overlay);
  },

  'modal-close': (el) => {
    const overlay = el.closest('.modal-overlay');
    if (overlay) closeModal(overlay);
  },
};

// ── EVENT DELEGATION ────────────────────────────────────────────

function handleClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = ACTIONS[el.dataset.action];
  if (action) {
    e.preventDefault();
    action(el, e);
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    const open = document.querySelector('.modal-overlay[data-open]');
    if (open) closeModal(open);
  }
}

// ── BOOTSTRAP ───────────────────────────────────────────────────

document.addEventListener('click', handleClick);
document.addEventListener('keydown', handleKeydown);

loadData();
initShell();
initRouter(markActiveNav);
