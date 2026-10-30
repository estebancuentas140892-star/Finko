/**
 * bloque-ahorro.test.js - la barra de modalidades del bloque Ahorro
 * (ADR 069 D7, ADR 104).
 *
 * Cubre:
 * - htmlBarraBloqueAhorro(): las cuatro celdas, en el orden de la casa, con
 *   el hash de destino de cada modalidad y la misma barra de Gastos. La casa
 *   ya no va en la barra (ADR 098 D3): la subida la da el "‹ Ahorro".
 * - estadoBloqueAhorro() y sincronizarBloqueAhorro(): el punto de Reservas
 *   cuando una reserva está lista para reiniciar (ADR 104 D3).
 * - partirEtiquetaModalidad(): la etiqueta corta de móvil y su cola.
 * - initBloqueAhorro(): inyecta la misma barra en las cuatro hijas y no en la
 *   casa, que ya tiene la suya.
 * - markActiveNav() marca la celda vigente: la barra es navegación.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MODALIDADES_BLOQUE_AHORRO,
  htmlBarraBloqueAhorro,
  estadoBloqueAhorro,
  sincronizarBloqueAhorro,
  initBloqueAhorro,
} from '../../modules/ui/bloque-ahorro.js';
import { markActiveNav } from '../../modules/ui/shell.js';
import {
  MODALIDADES_AHORRO,
  partirEtiquetaModalidad,
} from '../../modules/dominio/ahorro/logic.js';

const celdas = () => [...document.querySelectorAll('.bloque-tabs__tab')];
const celda = (s) => document.querySelector(`.bloque-tabs__tab[data-section="${s}"]`);

describe('htmlBarraBloqueAhorro()', () => {
  beforeEach(() => {
    document.body.innerHTML = htmlBarraBloqueAhorro();
  });

  it('pinta las cuatro modalidades en la barra de Gastos, sin la casa (ADR 104 D1)', () => {
    expect(document.querySelector('nav.bloque-tabs.bloque-tabs--ahorro')).not.toBeNull();
    expect(celdas().map(c => c.dataset.section))
      .toEqual(['fondo', 'apartados', 'metas', 'inversion']);
  });

  it('se lee corto y se oye completo: "Fondo" dice "Fondo de emergencia" al lector', () => {
    expect(celdas().map(c => c.textContent.trim()))
      .toEqual(['Fondo', 'Reservas', 'Metas', 'Inversión']);
    expect(celdas().map(c => c.getAttribute('aria-label')))
      .toEqual(['Fondo de emergencia', 'Reservas', 'Metas', 'Inversión']);
  });

  it('solo Reservas trae punto, y nace oculto', () => {
    const puntos = document.querySelectorAll('.bloque-tabs__badge--punto');
    expect(puntos).toHaveLength(1);
    expect(puntos[0].closest('.bloque-tabs__tab').dataset.section).toBe('apartados');
    expect(puntos[0].hidden).toBe(true);
  });

  // AH3: la casa, la subnav de escritorio y el DOM ordenaban las cuatro de
  // tres formas distintas. El orden de la casa es el único que significa algo
  // (va por certeza de uso) y es el que se repite en todas las superficies.
  it('el orden sale de la casa, no de una lista propia', () => {
    expect(MODALIDADES_BLOQUE_AHORRO.map(c => c.hash))
      .toEqual(MODALIDADES_AHORRO.map(m => m.seccion));
  });

  it('cada celda navega por hash, no por acción', () => {
    expect(celdas().map(c => c.getAttribute('href')))
      .toEqual(['#fondo', '#apartados', '#metas', '#inversion']);
    expect(document.querySelectorAll('.bloque-tabs__tab[data-action]')).toHaveLength(0);
  });
});

describe('el punto de Reservas (ADR 104 D3)', () => {
  const reserva = (extra) => ({
    id: 'r1', nombre: 'SOAT', montoObjetivo: 360_000, montoActual: 360_000,
    recurrente: true, periodoMeses: 12, ...extra,
  });

  it('cuenta las reservas recurrentes que ya reunieron su dinero', () => {
    expect(estadoBloqueAhorro({ apartados: [reserva()] })).toEqual({ reservasListas: 1 });
    expect(estadoBloqueAhorro({ apartados: [reserva({ montoActual: 100_000 })] }))
      .toEqual({ reservasListas: 0 });
    expect(estadoBloqueAhorro({ apartados: [reserva({ recurrente: false, completado: true })] }))
      .toEqual({ reservasListas: 0 });
    expect(estadoBloqueAhorro({})).toEqual({ reservasListas: 0 });
  });

  it('muestra el punto y el lector oye por qué', () => {
    document.body.innerHTML = htmlBarraBloqueAhorro();
    sincronizarBloqueAhorro({ reservasListas: 1 });
    expect(celda('apartados').querySelector('.bloque-tabs__badge').hidden).toBe(false);
    expect(celda('apartados').getAttribute('aria-label')).toBe('Reservas, una lista para reiniciar');
  });

  it('sin reservas listas no hay punto y el nombre vuelve a ser el corto', () => {
    document.body.innerHTML = htmlBarraBloqueAhorro();
    sincronizarBloqueAhorro({ reservasListas: 2 });
    expect(celda('apartados').getAttribute('aria-label')).toBe('Reservas, 2 listas para reiniciar');
    sincronizarBloqueAhorro({ reservasListas: 0 });
    expect(celda('apartados').querySelector('.bloque-tabs__badge').hidden).toBe(true);
    expect(celda('apartados').getAttribute('aria-label')).toBe('Reservas');
  });
});

describe('initBloqueAhorro()', () => {
  it('inyecta la barra en las cuatro hijas', () => {
    document.body.innerHTML = `
      <div id="chips-fondo"></div>
      <div id="chips-apartados"></div>
      <div id="chips-metas"></div>
      <div id="chips-inversion"></div>`;
    initBloqueAhorro();

    expect(document.querySelectorAll('.bloque-tabs--ahorro')).toHaveLength(4);
    expect(document.querySelectorAll('.bloque-tabs__tab')).toHaveLength(16);
  });

  it('la casa no recibe barra: ya tiene la suya', () => {
    document.body.innerHTML = '<div id="chips-ahorro"></div>';
    initBloqueAhorro();
    expect(document.getElementById('chips-ahorro').innerHTML).toBe('');
  });

  it('no revienta si los slots no están en el DOM', () => {
    document.body.innerHTML = '';
    expect(() => initBloqueAhorro()).not.toThrow();
  });
});

describe('la celda vigente la marca markActiveNav()', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <a class="nav-item" data-section="gast"></a>
      <button class="nav-item" data-modal="modal-mas"></button>
      ${htmlBarraBloqueAhorro()}`;
  });

  it('marca la modalidad activa y apaga las demás', () => {
    markActiveNav('metas');
    expect(celda('metas').classList.contains('active')).toBe(true);
    expect(celda('metas').getAttribute('aria-current')).toBe('page');
    expect(celda('fondo').classList.contains('active')).toBe(false);
  });

  it('en la casa no se marca ninguna: la casa ya no está en la barra', () => {
    markActiveNav('ahorro');
    expect(document.querySelectorAll('.bloque-tabs__tab.active')).toHaveLength(0);
  });

  it('fuera del bloque no marca ninguna', () => {
    markActiveNav('metas');
    markActiveNav('gast');
    expect(document.querySelectorAll('.bloque-tabs__tab.active')).toHaveLength(0);
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
