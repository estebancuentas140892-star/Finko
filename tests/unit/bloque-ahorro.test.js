/**
 * bloque-ahorro.test.js - la fila de chips del bloque Ahorro (ADR 069 D7).
 *
 * Cubre:
 * - htmlChipsBloqueAhorro(): los cuatro chips, en el orden de la casa, con el
 *   hash de destino de cada modalidad. La casa ya no va en la fila (ADR 098
 *   D3): la subida la da el "‹ Ahorro" de cada hija.
 * - partirEtiquetaModalidad(): la etiqueta corta de móvil y su cola.
 * - initBloqueAhorro(): inyecta la misma fila en las cuatro hijas y no en la
 *   casa, que ya tiene la suya.
 * - markActiveNav() marca el chip vigente: la fila es navegación.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CHIPS_BLOQUE_AHORRO,
  htmlChipsBloqueAhorro,
  initBloqueAhorro,
} from '../../modules/ui/bloque-ahorro.js';
import { markActiveNav } from '../../modules/ui/shell.js';
import {
  MODALIDADES_AHORRO,
  partirEtiquetaModalidad,
} from '../../modules/dominio/ahorro/logic.js';

describe('htmlChipsBloqueAhorro()', () => {
  beforeEach(() => {
    document.body.innerHTML = htmlChipsBloqueAhorro();
  });

  const chips = () => [...document.querySelectorAll('.bloque-chips__chip')];

  it('pinta las cuatro modalidades, sin la casa (ADR 098 D3)', () => {
    expect(chips().map(c => c.dataset.section))
      .toEqual(['fondo', 'apartados', 'metas', 'inversion']);
    expect(chips().map(c => c.textContent.trim()))
      .toEqual(['Fondo de emergencia', 'Reservas', 'Metas', 'Inversión']);
  });

  it('el fondo lleva la cola aparte para callarla en móvil', () => {
    const fondo = chips()[0];
    expect(fondo.querySelector('.chip__cola').textContent).toBe(' de emergencia');
    expect(document.querySelectorAll('.chip__cola')).toHaveLength(1);
  });

  // AH3: la casa, la subnav de escritorio y el DOM ordenaban las cuatro de
  // tres formas distintas. El orden de la casa es el único que significa algo
  // (va por certeza de uso) y es el que se repite en todas las superficies.
  it('el orden sale de la casa, no de una lista propia', () => {
    expect(CHIPS_BLOQUE_AHORRO.map(c => c.hash))
      .toEqual(MODALIDADES_AHORRO.map(m => m.seccion));
  });

  it('cada chip navega por hash, no por acción', () => {
    expect(chips().map(c => c.getAttribute('href')))
      .toEqual(['#fondo', '#apartados', '#metas', '#inversion']);
    expect(document.querySelectorAll('.bloque-chips__chip[data-action]')).toHaveLength(0);
  });
});

describe('initBloqueAhorro()', () => {
  it('inyecta la fila en las cuatro hijas', () => {
    document.body.innerHTML = `
      <div id="chips-fondo"></div>
      <div id="chips-apartados"></div>
      <div id="chips-metas"></div>
      <div id="chips-inversion"></div>`;
    initBloqueAhorro();

    expect(document.querySelectorAll('.bloque-chips')).toHaveLength(4);
    expect(document.querySelectorAll('.bloque-chips__chip')).toHaveLength(16);
  });

  it('la casa no recibe fila: ya tiene la suya', () => {
    document.body.innerHTML = '<div id="chips-ahorro"></div>';
    initBloqueAhorro();
    expect(document.getElementById('chips-ahorro').innerHTML).toBe('');
  });

  it('no revienta si los slots no están en el DOM', () => {
    document.body.innerHTML = '';
    expect(() => initBloqueAhorro()).not.toThrow();
  });
});

describe('el chip vigente lo marca markActiveNav()', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <a class="nav-item" data-section="gast"></a>
      <button class="nav-item" data-modal="modal-mas"></button>
      ${htmlChipsBloqueAhorro()}`;
  });

  const chip = (s) => document.querySelector(`.bloque-chips__chip[data-section="${s}"]`);

  it('marca la modalidad activa y apaga las demás', () => {
    markActiveNav('metas');
    expect(chip('metas').classList.contains('active')).toBe(true);
    expect(chip('metas').getAttribute('aria-current')).toBe('page');
    expect(chip('fondo').classList.contains('active')).toBe(false);
  });

  it('en la casa no se marca ninguno: la casa ya no está en la fila', () => {
    markActiveNav('ahorro');
    expect(document.querySelectorAll('.bloque-chips__chip.active')).toHaveLength(0);
  });

  it('fuera del bloque no marca ninguno', () => {
    markActiveNav('metas');
    markActiveNav('gast');
    expect(document.querySelectorAll('.bloque-chips__chip.active')).toHaveLength(0);
  });
});

describe('partirEtiquetaModalidad()', () => {
  it('corto + cola reconstruye siempre la etiqueta', () => {
    for (const m of MODALIDADES_AHORRO) {
      const { corto, cola } = partirEtiquetaModalidad(m);
      expect(corto + cola).toBe(m.label);
    }
  });

  it('sin corto, o con un corto que no es prefijo, no parte nada', () => {
    expect(partirEtiquetaModalidad({ label: 'Metas' })).toEqual({ corto: 'Metas', cola: '' });
    expect(partirEtiquetaModalidad({ label: 'Metas', corto: 'Otra' })).toEqual({ corto: 'Metas', cola: '' });
  });
});
