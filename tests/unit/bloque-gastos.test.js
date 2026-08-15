/**
 * bloque-gastos.test.js - la franja de lentes del bloque Gastos (ADR 069).
 *
 * Cubre:
 * - htmlTabsBloqueGastos(): las tres lentes, en orden, con hash y etiqueta.
 * - estadoLentesGastos(): el conteo de vencidos y de límites excedidos, puro
 *   respecto al DOM (recibe estado y fecha).
 * - sincronizarTabsBloqueGastos(): la pastilla aparece con dato y desaparece
 *   sin él, y el nombre accesible de la pestaña lleva el conteo en palabras.
 * - initBloqueGastos(): inyecta la misma franja en las tres lentes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LENTES_BLOQUE_GASTOS,
  htmlTabsBloqueGastos,
  estadoLentesGastos,
  sincronizarTabsBloqueGastos,
  initBloqueGastos,
} from '../../modules/ui/bloque-gastos.js';

const HOY = '2026-08-15';

/** Estado mínimo con una deuda vencida y sin pagar. */
function estadoConVencido() {
  return {
    compromisos: [
      {
        id: 'c1',
        nombre: 'Arriendo',
        tipo: 'fijo',
        monto: 1_150_000,
        diaPago: 1,
        activo: true,
      },
    ],
    gastos: [],
    presupuestos: [],
  };
}

describe('htmlTabsBloqueGastos()', () => {
  it('pinta las tres lentes en orden, con su hash y su etiqueta', () => {
    document.body.innerHTML = htmlTabsBloqueGastos();
    const tabs = [...document.querySelectorAll('.bloque-tabs__tab')];

    expect(tabs.map(t => t.dataset.section)).toEqual(['gast', 'compromisos', 'presupuesto']);
    expect(tabs.map(t => t.getAttribute('href'))).toEqual(['#gast', '#compromisos', '#presupuesto']);
    expect(tabs.map(t => t.querySelector('.bloque-tabs__label').textContent)).toEqual([
      'Lo que gastaste', 'Por pagar', 'Límites',
    ]);
  });

  it('la portada es la primera lente: el bloque aterriza en el miembro dominante (R81)', () => {
    expect(LENTES_BLOQUE_GASTOS[0].hash).toBe('gast');
  });

  it('las pastillas nacen ocultas y decorativas', () => {
    document.body.innerHTML = htmlTabsBloqueGastos();
    const badges = [...document.querySelectorAll('.bloque-tabs__badge')];
    expect(badges).toHaveLength(3);
    expect(badges.every(b => b.hidden)).toBe(true);
    expect(badges.every(b => b.getAttribute('aria-hidden') === 'true')).toBe(true);
  });
});

describe('estadoLentesGastos()', () => {
  it('cuenta los compromisos vencidos y sin pagar del mes', () => {
    const { vencidos } = estadoLentesGastos(estadoConVencido(), HOY);
    expect(vencidos).toBe(1);
  });

  it('un compromiso vencido y ya pagado no cuenta', () => {
    const state = estadoConVencido();
    state.gastos = [
      { id: 'g1', monto: 1_150_000, fecha: '2026-08-01', categoria: 'Vivienda', compromisoId: 'c1' },
    ];
    expect(estadoLentesGastos(state, HOY).vencidos).toBe(0);
  });

  it('cuenta solo los límites excedidos, no los que están en alerta', () => {
    const state = {
      compromisos: [],
      presupuestos: [
        { id: 'p1', categoria: 'Restaurantes', montoMensual: 350_000, activo: true },
        { id: 'p2', categoria: 'Mercado',      montoMensual: 700_000, activo: true },
      ],
      gastos: [
        { id: 'g1', monto: 412_000, fecha: '2026-08-04', categoria: 'Restaurantes' },
        { id: 'g2', monto: 560_000, fecha: '2026-08-06', categoria: 'Mercado' },
      ],
    };
    // Restaurantes está en 118% (excedido); Mercado en 80% (alerta).
    expect(estadoLentesGastos(state, HOY).excedidos).toBe(1);
  });

  it('sin datos devuelve ceros y no revienta con S vacío', () => {
    expect(estadoLentesGastos({}, HOY)).toEqual({ vencidos: 0, excedidos: 0 });
  });
});

describe('sincronizarTabsBloqueGastos()', () => {
  beforeEach(() => {
    document.body.innerHTML = htmlTabsBloqueGastos();
  });

  const tab   = (s) => document.querySelector(`.bloque-tabs__tab[data-section="${s}"]`);
  const badge = (s) => tab(s).querySelector('.bloque-tabs__badge');

  it('muestra el conteo y lo dice en el nombre accesible de la pestaña', () => {
    sincronizarTabsBloqueGastos({ vencidos: 2, excedidos: 1 });

    expect(badge('compromisos').hidden).toBe(false);
    expect(badge('compromisos').textContent).toBe('2');
    expect(tab('compromisos').getAttribute('aria-label')).toBe('Por pagar, 2 vencidos');

    expect(badge('presupuesto').textContent).toBe('1');
    expect(tab('presupuesto').getAttribute('aria-label')).toBe('Límites, 1 límite excedido');
  });

  it('singular y plural en la frase del nombre accesible', () => {
    sincronizarTabsBloqueGastos({ vencidos: 1, excedidos: 3 });
    expect(tab('compromisos').getAttribute('aria-label')).toBe('Por pagar, 1 vencido');
    expect(tab('presupuesto').getAttribute('aria-label')).toBe('Límites, 3 límites excedidos');
  });

  it('sin dato oculta la pastilla y devuelve la etiqueta limpia', () => {
    sincronizarTabsBloqueGastos({ vencidos: 2, excedidos: 1 });
    sincronizarTabsBloqueGastos({ vencidos: 0, excedidos: 0 });

    expect(badge('compromisos').hidden).toBe(true);
    expect(badge('compromisos').textContent).toBe('');
    expect(tab('compromisos').getAttribute('aria-label')).toBe('Por pagar');
    expect(tab('presupuesto').getAttribute('aria-label')).toBe('Límites');
  });

  it('la portada nunca lleva pastilla: su dato es la pantalla entera', () => {
    sincronizarTabsBloqueGastos({ vencidos: 2, excedidos: 1 });
    expect(badge('gast').hidden).toBe(true);
    expect(tab('gast').getAttribute('aria-label')).toBe('Lo que gastaste');
  });
});

describe('initBloqueGastos()', () => {
  it('inyecta la misma franja en las tres lentes', () => {
    document.body.innerHTML = `
      <div id="tabs-gast"></div>
      <div id="tabs-compromisos"></div>
      <div id="tabs-presupuesto"></div>
    `;
    initBloqueGastos();

    expect(document.querySelectorAll('.bloque-tabs')).toHaveLength(3);
    expect(document.querySelectorAll('.bloque-tabs__tab')).toHaveLength(9);
  });

  it('no revienta si los slots no están en el DOM', () => {
    document.body.innerHTML = '';
    expect(() => initBloqueGastos()).not.toThrow();
  });
});
