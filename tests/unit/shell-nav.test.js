/**
 * shell-nav.test.js - navegación del shell (NAV2.1a, ADR 040).
 *
 * Cubre:
 * - markActiveNav(): marca .nav-item Y .mas-tile de la sección activa
 *   (clase + aria-current), y resalta el botón "Más" cuando la sección
 *   vive detrás del menú (MAS_SECTIONS).
 * - _syncThemeButton vía toggleTheme(): sincroniza TODOS los toggles
 *   presentes (checkbox de Ajustes + botón de icono del sheet, que
 *   alterna el glifo luna/sol y aria-pressed).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { markActiveNav, toggleTheme } from '../../modules/ui/shell.js';

describe('markActiveNav()', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <a class="nav-item" data-section="gast"></a>
      <a class="nav-item" data-section="analisis"></a>
      <button class="nav-item" data-modal="modal-mas"></button>
      <a class="mas-tile" data-section="analisis"></a>
      <a class="mas-tile" data-section="config"></a>
    `;
  });

  it('marca el nav-item y el mas-tile de la sección activa con clase y aria-current', () => {
    markActiveNav('analisis');
    const navItem = document.querySelector('.nav-item[data-section="analisis"]');
    const masTile = document.querySelector('.mas-tile[data-section="analisis"]');
    expect(navItem.classList.contains('active')).toBe(true);
    expect(navItem.getAttribute('aria-current')).toBe('page');
    expect(masTile.classList.contains('active')).toBe(true);
    expect(masTile.getAttribute('aria-current')).toBe('page');
  });

  it('desmarca los items de las demás secciones', () => {
    markActiveNav('analisis');
    markActiveNav('gast');
    const navAnalisis = document.querySelector('.nav-item[data-section="analisis"]');
    const tileAnalisis = document.querySelector('.mas-tile[data-section="analisis"]');
    const tileConfig = document.querySelector('.mas-tile[data-section="config"]');
    expect(navAnalisis.classList.contains('active')).toBe(false);
    expect(navAnalisis.getAttribute('aria-current')).toBe('false');
    expect(tileAnalisis.classList.contains('active')).toBe(false);
    expect(tileConfig.classList.contains('active')).toBe(false);
  });

  it('resalta el botón "Más" cuando la sección activa vive detrás del menú', () => {
    markActiveNav('analisis');
    const masBtn = document.querySelector('.nav-item[data-modal="modal-mas"]');
    expect(masBtn.classList.contains('active')).toBe(true);
    expect(masBtn.getAttribute('aria-current')).toBe('page');
  });

  it('apaga el botón "Más" cuando la sección activa está en la barra', () => {
    markActiveNav('analisis');
    markActiveNav('gast');
    const masBtn = document.querySelector('.nav-item[data-modal="modal-mas"]');
    expect(masBtn.classList.contains('active')).toBe(false);
    expect(masBtn.getAttribute('aria-current')).toBe('false');
  });
});

describe('toggleTheme() sincroniza todos los toggles presentes', () => {
  beforeEach(() => {
    document.body.classList.remove('light-theme');
    localStorage.removeItem('fk_theme');
    document.body.innerHTML = `
      <button class="mas-sheet__theme" data-action="theme-toggle" aria-pressed="false">
        <svg class="icon"><use href="#i-moon"></use></svg>
      </button>
      <input type="checkbox" data-action="theme-toggle">
    `;
  });

  it('al pasar a claro: glifo sol, aria-pressed=true y checkbox marcado', async () => {
    toggleTheme();
    expect(document.body.classList.contains('light-theme')).toBe(true);

    const btn = document.querySelector('.mas-sheet__theme');
    expect(btn.querySelector('use').getAttribute('href')).toBe('#i-sun');
    expect(btn.getAttribute('aria-pressed')).toBe('true');

    // El checkbox se sincroniza en un setTimeout(0).
    await new Promise((r) => setTimeout(r, 0));
    expect(document.querySelector('input[type="checkbox"]').checked).toBe(true);
  });

  it('al volver a oscuro: glifo luna y aria-pressed=false', async () => {
    toggleTheme();
    toggleTheme();
    expect(document.body.classList.contains('light-theme')).toBe(false);

    const btn = document.querySelector('.mas-sheet__theme');
    expect(btn.querySelector('use').getAttribute('href')).toBe('#i-moon');
    expect(btn.getAttribute('aria-pressed')).toBe('false');

    await new Promise((r) => setTimeout(r, 0));
    expect(document.querySelector('input[type="checkbox"]').checked).toBe(false);
  });
});
