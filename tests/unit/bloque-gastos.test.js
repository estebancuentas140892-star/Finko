/**
 * bloque-gastos.test.js - la franja de lentes del bloque Gastos (ADR 069).
 *
 * Cubre:
 * - htmlBloqueGastos(): las tres lentes, en orden, con hash y etiqueta.
 * - estadoLentesGastos(): el conteo de vencidos y de límites excedidos, puro
 *   respecto al DOM (recibe estado y fecha).
 * - sincronizarBloqueGastos(): la pastilla aparece con dato y desaparece
 *   sin él, y el nombre accesible de la pestaña lleva el conteo en palabras.
 * - initBloqueGastos(): inyecta la misma franja en las tres lentes.
 * - el reloj del bloque (infra/mes-bloque.js): el rango del mes visible, que
 *   es lo que consume el acceso prefiltrado a Movimientos (G5).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LENTES_BLOQUE_GASTOS,
  htmlBloqueGastos,
  estadoLentesGastos,
  sincronizarBloqueGastos,
  initBloqueGastos,
} from '../../modules/ui/bloque-gastos.js';
import {
  mesBloque, navegarMesBloque, irAMesActualBloque,
  prefijoMesBloque, rangoMesBloque, etiquetaMesBloque, esMesActualBloque,
} from '../../modules/infra/mes-bloque.js';

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

// ── El reloj del bloque (G4, ADR 069 D8) ─────────────────────────

describe('mes-bloque', () => {
  beforeEach(() => irAMesActualBloque());

  it('arranca en el mes corriente', () => {
    expect(esMesActualBloque()).toBe(true);
    const hoyDate = new Date();
    expect(mesBloque()).toEqual({ anio: hoyDate.getFullYear(), mes: hoyDate.getMonth() });
  });

  it('navegar cruza el año en los dos sentidos', () => {
    irAMesActualBloque();
    const { anio } = mesBloque();
    navegarMesBloque(-13);
    expect(mesBloque().anio).toBe(anio - 1);
    irAMesActualBloque();
    navegarMesBloque(13);
    expect(mesBloque().anio).toBe(anio + 1);
  });

  it('el prefijo y el rango describen el mismo mes, con el último día correcto', () => {
    irAMesActualBloque();
    // Un mes conocido: febrero de 2026 tiene 28 días, y es el caso que rompe
    // cualquier cálculo que sume 30 o 31 a ciegas.
    const { anio, mes } = mesBloque();
    navegarMesBloque((2026 - anio) * 12 + (1 - mes));
    expect(prefijoMesBloque()).toBe('2026-02');
    expect(rangoMesBloque()).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
    expect(etiquetaMesBloque()).toBe('Febrero 2026');
  });

  it('el rango de un mes de 31 días llega al 31', () => {
    irAMesActualBloque();
    const { anio, mes } = mesBloque();
    navegarMesBloque((2026 - anio) * 12 + (0 - mes));
    expect(rangoMesBloque()).toEqual({ desde: '2026-01-01', hasta: '2026-01-31' });
  });

  it('un año bisiesto da 29 de febrero', () => {
    irAMesActualBloque();
    const { anio, mes } = mesBloque();
    navegarMesBloque((2028 - anio) * 12 + (1 - mes));
    expect(rangoMesBloque().hasta).toBe('2028-02-29');
  });
});

describe('htmlBloqueGastos()', () => {
  it('pinta las tres lentes en orden, con su hash y su etiqueta', () => {
    document.body.innerHTML = htmlBloqueGastos();
    const tabs = [...document.querySelectorAll('.bloque-tabs__tab')];

    expect(tabs.map(t => t.dataset.section)).toEqual(['gast', 'compromisos', 'presupuesto']);
    expect(tabs.map(t => t.getAttribute('href'))).toEqual(['#gast', '#compromisos', '#presupuesto']);
    // "Día a día" sale del propio código (ficha 07): el filtro de categorías
    // internas existe para enfocarse en lo que el usuario decide gastar día a
    // día, así que la etiqueta nombra lo que la lente muestra y, por
    // contraste, explica qué no muestra.
    expect(tabs.map(t => t.querySelector('.bloque-tabs__label').textContent)).toEqual([
      'Día a día', 'Por pagar', 'Límites',
    ]);
  });

  it('la portada es la primera lente: el bloque aterriza en el miembro dominante (R81)', () => {
    expect(LENTES_BLOQUE_GASTOS[0].hash).toBe('gast');
  });

  it('las pastillas nacen ocultas y decorativas', () => {
    document.body.innerHTML = htmlBloqueGastos();
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

describe('sincronizarBloqueGastos()', () => {
  beforeEach(() => {
    document.body.innerHTML = htmlBloqueGastos();
  });

  const tab   = (s) => document.querySelector(`.bloque-tabs__tab[data-section="${s}"]`);
  const badge = (s) => tab(s).querySelector('.bloque-tabs__badge');

  it('muestra el conteo de vencidos y lo dice en el nombre accesible', () => {
    sincronizarBloqueGastos({ vencidos: 2, excedidos: 1 });

    expect(badge('compromisos').hidden).toBe(false);
    expect(badge('compromisos').textContent).toBe('2');
    expect(tab('compromisos').getAttribute('aria-label')).toBe('Por pagar, 2 vencidos');
  });

  // Ficha 07: en "Límites" el dato importante es que pasó algo, no cuántos.
  it('"Límites" avisa con un punto, no con un número', () => {
    sincronizarBloqueGastos({ vencidos: 0, excedidos: 3 });

    expect(badge('presupuesto').hidden).toBe(false);
    expect(badge('presupuesto').textContent).toBe('');
    expect(badge('presupuesto').classList.contains('bloque-tabs__badge--punto')).toBe(true);
    expect(tab('presupuesto').getAttribute('aria-label')).toBe('Límites, topes excedidos');
  });

  it('singular y plural en la frase del nombre accesible', () => {
    sincronizarBloqueGastos({ vencidos: 1, excedidos: 1 });
    expect(tab('compromisos').getAttribute('aria-label')).toBe('Por pagar, 1 vencido');
    expect(tab('presupuesto').getAttribute('aria-label')).toBe('Límites, un tope excedido');
  });

  it('sin dato oculta la pastilla y devuelve la etiqueta limpia', () => {
    sincronizarBloqueGastos({ vencidos: 2, excedidos: 1 });
    sincronizarBloqueGastos({ vencidos: 0, excedidos: 0 });

    expect(badge('compromisos').hidden).toBe(true);
    expect(badge('compromisos').textContent).toBe('');
    expect(tab('compromisos').getAttribute('aria-label')).toBe('Por pagar');
    expect(tab('presupuesto').getAttribute('aria-label')).toBe('Límites');
  });

  it('la portada nunca lleva pastilla: su dato es la pantalla entera', () => {
    sincronizarBloqueGastos({ vencidos: 2, excedidos: 1 });
    expect(badge('gast').hidden).toBe(true);
    expect(tab('gast').getAttribute('aria-label')).toBe('Día a día');
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
