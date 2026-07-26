/**
 * shell-nav.test.js - navegación del shell (NAV2.1a, ADR 040).
 *
 * Cubre:
 * - markActiveNav(): marca .nav-item Y .mas-tile de la sección activa
 *   (clase + aria-current), y resalta el botón "Más" cuando la sección
 *   vive detrás del menú (MAS_SECTIONS).
 * - El botón "Más" ubicado (DIS.6/C3, regla R30): dentro de una sección del
 *   menú dice su nombre, muestra su ícono y toma su data-section (de donde
 *   sale el color de dominio); al volver a la barra se limpia.
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

describe('el botón "Más" nombra la sección donde estás (DIS.6/C3)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <a class="nav-item" data-section="gast"></a>
      <button class="nav-item" data-modal="modal-mas" aria-label="Mas opciones">
        <svg class="nav-item__icon icon"><use href="#i-mas"></use></svg>
        <span class="nav-item__label">Más</span>
      </button>
    `;
  });

  const masBtn = () => document.querySelector('.nav-item[data-modal="modal-mas"]');

  it('dentro de una sección del menú toma su nombre, su ícono y su data-section', () => {
    markActiveNav('analisis');
    const btn = masBtn();
    expect(btn.dataset.section).toBe('analisis');
    expect(btn.querySelector('.nav-item__label').textContent).toBe('Análisis');
    expect(btn.querySelector('use').getAttribute('href')).toBe('#i-analisis');
    expect(btn.getAttribute('aria-label')).toBe('Análisis. Abrir más opciones');
    expect(btn.classList.contains('nav-item--mas-ubicado')).toBe(true);
  });

  it('al pasar de una sección del menú a otra, cambia de nombre y de color', () => {
    markActiveNav('analisis');
    markActiveNav('metas');
    const btn = masBtn();
    expect(btn.dataset.section).toBe('metas');
    expect(btn.querySelector('.nav-item__label').textContent).toBe('Metas');
    expect(btn.querySelector('use').getAttribute('href')).toBe('#i-metas');
    expect(btn.classList.contains('active')).toBe(true);
  });

  it('al volver a una sección de la barra limpia el data-section y vuelve a "Más"', () => {
    markActiveNav('analisis');
    markActiveNav('gast');
    const btn = masBtn();
    expect(btn.dataset.section).toBeUndefined();
    expect(btn.querySelector('.nav-item__label').textContent).toBe('Más');
    expect(btn.querySelector('use').getAttribute('href')).toBe('#i-mas');
    expect(btn.getAttribute('aria-label')).toBe('Mas opciones');
    expect(btn.classList.contains('nav-item--mas-ubicado')).toBe(false);
  });

  it('Movimientos ya cuenta como sección del menú (DIS.6/C6)', () => {
    markActiveNav('movimientos');
    const btn = masBtn();
    expect(btn.classList.contains('active')).toBe(true);
    expect(btn.querySelector('.nav-item__label').textContent).toBe('Movimientos');
    expect(btn.querySelector('use').getAttribute('href')).toBe('#i-saldo');
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
