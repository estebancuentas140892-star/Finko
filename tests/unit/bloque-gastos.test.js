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
 * - GAS.4a (ADR 157 D1): una sola fila con el nombre, la pastilla del mes, la
 *   lupa y el ojo; sin frase ni primario espejo (crear es el botón central).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LENTES_BLOQUE_GASTOS,
  htmlBloqueGastos,
  estadoLentesGastos,
  sincronizarBloqueGastos,
  initBloqueGastos,
  irABuscar,
  primerMesFinko,
  filasHojaMeses,
  irAMesDelBloque,
  claveDelOjo,
  partesDelMes,
  htmlHojaMeses,
} from '../../modules/ui/bloque-gastos.js';
import { totalesDiaADiaDelAnio } from '../../modules/dominio/gastos/logic.js';
import { htmlMesDelRotulo } from '../../modules/infra/mes-bloque.js';
import { htmlOjoTarjeta } from '../../modules/infra/privacidad.js';
import { resumenLimitesDelMes } from '../../modules/dominio/presupuesto/logic.js';
import { EventBus } from '../../modules/core/state.js';
import {
  mesBloque, navegarMesBloque, irAMesActualBloque,
  prefijoMesBloque, rangoMesBloque, etiquetaMesBloque, etiquetaCortaMesBloque, esMesActualBloque,
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

  it('la pastilla calla el año corriente y acorta el mes de otro año (GAS.4a)', () => {
    irAMesActualBloque();
    const { anio, mes } = mesBloque();
    navegarMesBloque((2026 - anio) * 12 + (10 - mes));
    expect(etiquetaCortaMesBloque(new Date(2026, 10, 16))).toBe('Noviembre');
    expect(etiquetaCortaMesBloque(new Date(2027, 0, 5))).toBe('Nov 2026');
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
  it('pinta las cuatro lentes en orden, con su hash y su etiqueta (GAS.7a, ADR 179 D1)', () => {
    document.body.innerHTML = htmlBloqueGastos();
    const tabs = [...document.querySelectorAll('.bloque-tabs__tab')];

    expect(tabs.map(t => t.dataset.section)).toEqual(['gast', 'fijos', 'deudas', 'presupuesto']);
    expect(tabs.map(t => t.getAttribute('href'))).toEqual(['#gast', '#fijos', '#deudas', '#presupuesto']);
    // "Día a día" sale del propio código (ficha 07): el filtro de categorías
    // internas existe para enfocarse en lo que el usuario decide gastar día a
    // día, así que la etiqueta nombra lo que la lente muestra y, por
    // contraste, explica qué no muestra.
    expect(tabs.map(t => t.querySelector('.bloque-tabs__label').textContent)).toEqual([
      'Día a día', 'Fijos', 'Deudas', 'Límites',
    ]);
  });

  it('la portada es la primera lente: el bloque aterriza en el miembro dominante (R81)', () => {
    expect(LENTES_BLOQUE_GASTOS[0].hash).toBe('gast');
  });

  it('las pastillas nacen ocultas y decorativas', () => {
    document.body.innerHTML = htmlBloqueGastos();
    const badges = [...document.querySelectorAll('.bloque-tabs__badge')];
    expect(badges).toHaveLength(4);
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

  it('parte los vencidos por tipo: fijos a su pestaña, cuotas a la suya (ADR 179 D1)', () => {
    const state = estadoConVencido();
    state.compromisos = [
      ...state.compromisos,
      { id: 'd1', tipo: 'deuda-entidad', descripcion: 'Crédito', saldoTotal: 1_000_000, cuotaMensual: 100_000, frecuencia: 'Mensual', diaPago: 2, activo: true, fechaCreacion: '2026-07-01' },
    ];
    const e = estadoLentesGastos(state, HOY);
    expect(e.vencidos).toBe(e.vencidosFijos + e.vencidasDeudas);
    expect(e.vencidosFijos).toBe(state.compromisos.filter(c => c.tipo === 'fijo').length);
    expect(e.vencidasDeudas).toBe(1);
  });

  it('sin datos devuelve ceros y no revienta con S vacío', () => {
    expect(estadoLentesGastos({}, HOY)).toEqual({ vencidos: 0, vencidosFijos: 0, vencidasDeudas: 0, excedidos: 0 });
  });
});

describe('sincronizarBloqueGastos()', () => {
  beforeEach(() => {
    document.body.innerHTML = htmlBloqueGastos();
  });

  const tab   = (s) => document.querySelector(`.bloque-tabs__tab[data-section="${s}"]`);
  const badge = (s) => tab(s).querySelector('.bloque-tabs__badge');

  // GAS.13d (ADR 188 D4): una insignia roja con el número; el conteo
  // también lo dice el nombre accesible.
  it('avisa lo vencido con una insignia con el número y lo cuenta en el nombre accesible', () => {
    sincronizarBloqueGastos({ vencidosFijos: 2, vencidasDeudas: 1, excedidos: 1 });

    expect(badge('fijos').hidden).toBe(false);
    expect(badge('fijos').textContent).toBe('2');
    expect(badge('fijos').classList.contains('bloque-tabs__badge--punto')).toBe(false);
    expect(tab('fijos').getAttribute('aria-label')).toBe('Fijos, 2 vencidos');
    expect(badge('deudas').textContent).toBe('1');
    expect(tab('deudas').getAttribute('aria-label')).toBe('Deudas, 1 cuota vencida');
  });

  it('"Límites" cuenta los límites pasados', () => {
    sincronizarBloqueGastos({ vencidosFijos: 0, vencidasDeudas: 0, excedidos: 3 });

    expect(badge('presupuesto').hidden).toBe(false);
    expect(badge('presupuesto').textContent).toBe('3');
    expect(tab('presupuesto').getAttribute('aria-label')).toBe('Límites, 3 límites pasados');
  });

  it('singular y plural en la frase del nombre accesible', () => {
    sincronizarBloqueGastos({ vencidosFijos: 1, vencidasDeudas: 2, excedidos: 1 });
    expect(tab('fijos').getAttribute('aria-label')).toBe('Fijos, 1 vencido');
    expect(tab('deudas').getAttribute('aria-label')).toBe('Deudas, 2 cuotas vencidas');
    expect(tab('presupuesto').getAttribute('aria-label')).toBe('Límites, un límite pasado');
  });

  it('sin dato oculta la pastilla y devuelve la etiqueta limpia', () => {
    sincronizarBloqueGastos({ vencidosFijos: 2, vencidasDeudas: 1, excedidos: 1 });
    sincronizarBloqueGastos({ vencidosFijos: 0, vencidasDeudas: 0, excedidos: 0 });

    expect(badge('fijos').hidden).toBe(true);
    expect(badge('fijos').textContent).toBe('');
    expect(tab('fijos').getAttribute('aria-label')).toBe('Fijos');
    expect(tab('deudas').getAttribute('aria-label')).toBe('Deudas');
    expect(tab('presupuesto').getAttribute('aria-label')).toBe('Límites');
  });

  it('la portada nunca lleva pastilla: su dato es la pantalla entera', () => {
    sincronizarBloqueGastos({ vencidosFijos: 2, vencidasDeudas: 1, excedidos: 1 });
    expect(badge('gast').hidden).toBe(true);
    expect(tab('gast').getAttribute('aria-label')).toBe('Día a día');
  });
});

describe('initBloqueGastos()', () => {
  it('inyecta la misma franja en las tres secciones (Fijos y Deudas comparten la suya)', () => {
    document.body.innerHTML = `
      <div id="tabs-gast"></div>
      <div id="tabs-compromisos"></div>
      <div id="tabs-presupuesto"></div>
    `;
    initBloqueGastos();

    expect(document.querySelectorAll('.bloque-tabs')).toHaveLength(3);
    expect(document.querySelectorAll('.bloque-tabs__tab')).toHaveLength(12);
  });

  it('no revienta si los slots no están en el DOM', () => {
    document.body.innerHTML = '';
    expect(() => initBloqueGastos()).not.toThrow();
  });
});

describe('cabecera en una fila (GAS.4a, ADR 157 D1)', () => {
  const montar = () => {
    document.body.innerHTML = `
      <section id="sec-gast">
        <header class="section__header"><button class="btn btn-primary" data-action="nuevo-gasto">Registrar gasto</button></header>
        <div id="tabs-gast"></div>
      </section>
      <section id="sec-compromisos">
        <header class="section__header"><button class="btn btn-primary" data-action="comp-elegir-tipo-nuevo" aria-label="Agregar un gasto fijo o una deuda">Agregar</button></header>
        <div id="tabs-compromisos"></div>
      </section>
      <section id="sec-presupuesto">
        <header class="section__header"><button class="btn btn-primary" id="btn-nuevo-presupuesto" data-action="nuevo-presupuesto" aria-label="Nuevo límite de gasto por categoría" hidden>Nuevo límite</button></header>
        <div id="tabs-presupuesto"></div>
      </section>`;
    initBloqueGastos();
  };

  it('sin frase ni primario espejo: crear es el botón central (ADR 148)', () => {
    montar();
    expect(document.querySelector('.bloque-gastos__sub')).toBeNull();
    expect(document.querySelector('.bloque-gastos__primario')).toBeNull();
    expect(document.querySelector('[data-action="bloque-primario"]')).toBeNull();
    // El primario original del encabezado sigue: lo leen el botón central y la
    // barra superior de escritorio.
    expect(document.querySelector('#sec-gast > .section__header > .btn-primary')).not.toBeNull();
  });

  it('GAS.13d (ADR 188 D4): la fila del nombre con la teja, "Gastos" y la lupa, sin ojo; luego las pestañas', () => {
    montar();
    const bloque = document.querySelector('#sec-gast .bloque-gastos');
    expect([...bloque.children].map(el => el.className)).toEqual(['bloque-gastos__cab', 'bloque-tabs']);
    expect(bloque.querySelector('.bloque-gastos__titulo').textContent).toBe('Gastos');
    expect(document.querySelectorAll('#tabs-gast [data-action="bloque-buscar"]')).toHaveLength(1);
    expect(document.querySelectorAll('#tabs-gast [data-action="bloque-saldo-visibilidad"]')).toHaveLength(0);
  });

  it('GAS.13d: la lupa de una pestaña abre Movimientos con su apartado y el mes', () => {
    montar();
    const oyente = vi.fn();
    EventBus.on('movimientos:ver', oyente);
    irABuscar(document.querySelector('#tabs-gast [data-action="bloque-buscar"]'));
    EventBus.off?.('movimientos:ver', oyente);
    expect(oyente).toHaveBeenCalledTimes(1);
    const filtros = oyente.mock.calls[0][0];
    expect(filtros.dominio).toBe('gastos');
    expect(filtros.desde).toMatch(/^\d{4}-\d{2}-01$/);
    expect(filtros.hasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('el ojo de una tarjeta tapa la sección donde está (ADR 166)', () => {
    document.body.innerHTML = '<section id="sec-presupuesto"><div class="hero-limites"><button data-action="bloque-saldo-visibilidad"></button></div></section>';
    expect(claveDelOjo(document.querySelector('[data-action="bloque-saldo-visibilidad"]'))).toBe('presupuesto');
  });

  it('la lupa de Inicio va al historial sin filtros por EventBus', () => {
    const oyente = vi.fn();
    EventBus.on('movimientos:ver', oyente);
    irABuscar();
    expect(oyente).toHaveBeenCalledWith({});
    EventBus.off('movimientos:ver', oyente);
  });
});

describe('la hoja "Elige el mes" (GAS.7b, ADR 179 D2)', () => {
  const g = (fecha, monto, categoria = 'Mercado') => ({ id: fecha + monto, fecha, monto, categoria });

  it('totalesDiaADiaDelAnio: suma por mes y deja fuera fijos y deudas', () => {
    const t = totalesDiaADiaDelAnio([
      g('2026-11-02', 100), g('2026-11-20', 50), g('2026-10-01', 70),
      g('2026-11-03', 999, 'Gastos fijos'), g('2026-11-04', 999, 'Deudas'), g('2025-11-01', 5),
    ], 2026);
    expect(t).toHaveLength(12);
    expect(t[10]).toBe(150);
    expect(t[9]).toBe(70);
    expect(t.reduce((a, b) => a + b, 0)).toBe(220);
  });

  it('primerMesFinko: el onboarding o el gasto más viejo, el que sea antes', () => {
    const hoy = new Date(2026, 10, 18);
    expect(primerMesFinko({ config: { primerUsoISO: '2026-08-10' }, gastos: [g('2026-09-01', 1)] }, hoy)).toEqual({ anio: 2026, mes: 7 });
    expect(primerMesFinko({ config: { primerUsoISO: '2026-08-10' }, gastos: [g('2025-12-31', 1)] }, hoy)).toEqual({ anio: 2025, mes: 11 });
    expect(primerMesFinko({}, hoy)).toEqual({ anio: 2026, mes: 10 });
  });

  it('filasHojaMeses: del mes tope al primero, con su barra, "Este mes", el primero y el visto', () => {
    const hoy = new Date(2026, 10, 18);
    const filas = filasHojaMeses(2026, {
      gastos: [g('2026-11-02', 1_284_600), g('2026-10-02', 1_396_200), g('2026-09-02', 1_180_400)],
      tope: { anio: 2026, mes: 10 }, primero: { anio: 2026, mes: 7 }, visto: { anio: 2026, mes: 10 }, hoyDate: hoy,
    });
    expect(filas.map(f => f.mes)).toEqual([10, 9, 8, 7]);
    expect(filas[0]).toMatchObject({ esActual: true, esVisto: true, esPrimero: false });
    expect(filas[1].pct).toBe(100);
    expect(filas[3]).toMatchObject({ total: 0, pct: 0, esPrimero: true });
  });

  it('filasHojaMeses: un año fuera de la historia no tiene filas; uno anterior va de diciembre al primero', () => {
    const base = { gastos: [], tope: { anio: 2026, mes: 10 }, primero: { anio: 2025, mes: 9 }, visto: { anio: 2026, mes: 10 } };
    expect(filasHojaMeses(2027, base)).toEqual([]);
    expect(filasHojaMeses(2024, base)).toEqual([]);
    expect(filasHojaMeses(2025, base).map(f => f.mes)).toEqual([11, 10, 9]);
  });

  it('irAMesDelBloque: lleva el reloj del bloque al mes elegido', () => {
    irAMesActualBloque();
    const { anio } = mesBloque();
    irAMesDelBloque(anio - 1, 3);
    expect(mesBloque()).toEqual({ anio: anio - 1, mes: 3 });
    irAMesActualBloque();
  });

  it('htmlMesDelRotulo: en escritorio el mes es texto; el año solo si no es el corriente', () => {
    irAMesActualBloque();
    const html = htmlMesDelRotulo();
    expect(html).not.toContain('<button');
    expect(html).toBe(html.toLowerCase());
    navegarMesBloque(-12);
    expect(htmlMesDelRotulo()).toMatch(/ \d{4}$/);
    irAMesActualBloque();
  });

  it('htmlMesDelRotulo: en el teléfono es el botón que abre la hoja', () => {
    const real = window.matchMedia;
    window.matchMedia = (q) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} });
    try {
      irAMesActualBloque();
      document.body.innerHTML = htmlMesDelRotulo();
      const btn = document.querySelector('button.mes-rotulo');
      expect(btn.dataset.action).toBe('bloque-elegir-mes');
      expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
      expect(btn.getAttribute('aria-label')).toMatch(/elegir otro mes$/);
    } finally {
      window.matchMedia = real;
    }
  });

  it('htmlOjoTarjeta: el ojo de la tarjeta es el control de la sección', () => {
    document.body.innerHTML = htmlOjoTarjeta(true);
    const btn = document.querySelector('.tarjeta-ojo');
    expect(btn.dataset.action).toBe('bloque-saldo-visibilidad');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.getAttribute('aria-label')).toBe('Mostrar tus saldos');
  });
});

describe('la tarjeta de Límites (GAS.7b, ADR 179 D2 y D6)', () => {
  it('resumenLimitesDelMes: lo que queda, lo usado y los topes pasados', () => {
    const presupuestos = [
      { id: 'p1', categoria: 'Restaurantes', montoMensual: 300_000, activo: true },
      { id: 'p2', categoria: 'Mercado', montoMensual: 500_000, activo: true },
      { id: 'p3', categoria: 'Ropa', montoMensual: 200_000, activo: false },
    ];
    const gastos = [
      { id: 'a', categoria: 'Restaurantes', monto: 345_000, fecha: '2026-11-10' },
      { id: 'b', categoria: 'Mercado', monto: 412_000, fecha: '2026-11-11' },
      { id: 'c', categoria: 'Ropa', monto: 50_000, fecha: '2026-11-12' },
    ];
    expect(resumenLimitesDelMes(presupuestos, gastos, 2026, 11)).toEqual({
      asignado: 800_000, gastado: 757_000, queda: 43_000, excedidos: 1, cantidad: 2,
    });
    expect(resumenLimitesDelMes([], gastos, 2026, 11).cantidad).toBe(0);
  });
});

describe('GAS.13e (ADR 188 D5): el resumen del apartado', () => {
  const g = (id, categoria, monto, fecha, extra = {}) => ({ id, categoria, monto, fecha, ...extra });

  it('Día a día: las categorías del mes de mayor a menor, sin pagos de fijos ni deudas', () => {
    const gastos = [
      g('a', 'Mercado', 60_000, '2026-11-03'), g('b', 'Café', 40_000, '2026-11-04'),
      g('c', 'Gastos fijos', 900_000, '2026-11-05', { compromisoId: 'f1' }), g('d', 'Mercado', 10_000, '2026-10-30'),
    ];
    const partes = partesDelMes('gast', { gastos, compromisos: [{ id: 'f1', tipo: 'fijo' }] }, 2026, 10);
    expect(partes.map(p => [p.nombre, p.total, p.pct, p.categoria])).toEqual([['Mercado', 60_000, 60, 'Mercado'], ['Café', 40_000, 40, 'Café']]);
  });

  it('Fijos y Deudas: cada pago o abono por su compromiso; Límites, solo lo que tiene límite', () => {
    const compromisos = [{ id: 'f1', tipo: 'fijo', descripcion: 'Arriendo', categoria: 'Arriendo' }, { id: 'd1', tipo: 'deuda-entidad', descripcion: 'Visa' }];
    const gastos = [
      g('p1', 'Gastos fijos', 900_000, '2026-11-05', { compromisoId: 'f1' }),
      g('p2', 'Deudas', 200_000, '2026-11-06', { compromisoId: 'd1' }),
      g('a', 'Mercado', 60_000, '2026-11-03'), g('b', 'Café', 40_000, '2026-11-04'),
    ];
    expect(partesDelMes('fijos', { gastos, compromisos }, 2026, 10).map(p => [p.nombre, p.total, p.categoria])).toEqual([['Arriendo', 900_000, null]]);
    expect(partesDelMes('deudas', { gastos, compromisos }, 2026, 10).map(p => p.nombre)).toEqual(['Visa']);
    const presupuestos = [{ id: 'l1', categoria: 'Café', montoMensual: 50_000, activo: true }];
    expect(partesDelMes('presupuesto', { gastos, compromisos, presupuestos }, 2026, 10).map(p => p.nombre)).toEqual(['Café']);
  });

  it('la hoja: doce barras, el total del mes a la vista y sus partes con el filtro de Movimientos', () => {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const pre = `${anio}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    const estado = { gastos: [g('a', 'Mercado', 60_000, `${pre}-01`)], compromisos: [], presupuestos: [], config: {} };
    const div = document.createElement('div');
    div.innerHTML = htmlHojaMeses(anio, estado, hoy, 'gast');
    expect(div.querySelectorAll('.resumen-barra')).toHaveLength(12);
    expect(div.querySelector('.resumen__total .resumen__cifra').textContent).toBe('$60.000');
    const parte = div.querySelector('.resumen__parte');
    expect(parte.dataset).toMatchObject({ action: 'resumen-ver', dominio: 'gastos', categoria: 'Mercado', desde: `${pre}-01` });
    expect(div.querySelector('.mes-hoja__ayuda')).toBeNull();
  });
});

describe('GAS.14c (ADR 189 D3): el resumen de Límites respeta "Solo una parte"', () => {
  it('un límite de solo Tinto cuenta solo el tinto', () => {
    const presupuestos = [{ id: 'l', categoria: 'Café', montoMensual: 20_000, subcategorias: { 'cafe-tinto': 20_000 }, soloParte: true, activo: true }];
    const gastos = [
      { id: 'a', categoria: 'Café', subcategoriaId: 'cafe-tinto', monto: 15_000, fecha: '2026-11-03' },
      { id: 'b', categoria: 'Café', subcategoriaId: 'cafe-cafeteria', monto: 40_000, fecha: '2026-11-04' },
    ];
    expect(partesDelMes('presupuesto', { gastos, presupuestos }, 2026, 10).map(p => [p.nombre, p.total])).toEqual([['Café', 15_000]]);
  });
});
