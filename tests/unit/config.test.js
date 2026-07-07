import { describe, it, expect, beforeEach } from 'vitest';
import { renderPanelConfig } from '../../modules/dominio/config/view.js';
import { S, createInitialState } from '../../modules/core/state.js';

// ── PERFIL: situación laboral (CFG.1) ────────────────────────────

describe('renderPanelConfig() - perfil con situación laboral (CFG.1)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    document.body.innerHTML = '<div id="panel-config"></div>';
  });

  const html = () => document.getElementById('panel-config').innerHTML;

  it('el encabezado del perfil ya no muestra el SMMLV muerto', () => {
    renderPanelConfig();
    expect(html()).not.toContain('SMMLV configurado');
    expect(html()).not.toContain('id="config-smmlv"');
  });

  it('muestra el selector de situación laboral con la opción "Sin especificar"', () => {
    renderPanelConfig();
    const select = document.getElementById('config-situacion');
    expect(select).not.toBeNull();
    expect(select.querySelector('option[value=""]')?.textContent).toBe('Sin especificar');
  });

  it('sin situación laboral registrada, el resumen dice "Sin especificar"', () => {
    S.perfil.situacionLaboral = '';
    renderPanelConfig();
    const dd = [...document.querySelectorAll('.config-info dd')].map(d => d.textContent);
    expect(dd).toContain('Sin especificar');
  });

  it('con una situación laboral registrada, la preselecciona y muestra su etiqueta', () => {
    S.perfil.situacionLaboral = 'independiente';
    renderPanelConfig();

    // La opción correcta lleva el atributo `selected` (el comportamiento real de
    // `select.value` lo verifica el E2E en Chromium: happy-dom no lo sincroniza
    // desde el atributo puesto vía innerHTML).
    const opcion = document.querySelector('#config-situacion option[value="independiente"]');
    expect(opcion).not.toBeNull();
    expect(opcion.hasAttribute('selected')).toBe(true);

    const dd = [...document.querySelectorAll('.config-info dd')].map(d => d.textContent);
    expect(dd).toContain('Independiente o freelance');
  });

  it('una situación laboral corrupta (id desconocido) cae a "Sin especificar" en el resumen', () => {
    S.perfil.situacionLaboral = 'valor-invalido';
    renderPanelConfig();
    const dd = [...document.querySelectorAll('.config-info dd')].map(d => d.textContent);
    expect(dd).toContain('Sin especificar');
  });
});
