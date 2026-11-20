/**
 * gastos-cifras-vencimientos.test.js - cada pestaña con su cifra y cada
 * vencimiento con su pago (GAS.12, ADR 187).
 *
 * Cubre:
 * - D1 (GAS.12a): la hoja "Elige el mes" de cada pestaña con sus propios
 *   registros, Fijos en un mes con solo sus vencimientos, "Pagaste" con todos
 *   los pagos de fijos y Límites con lo mismo que Día a día.
 *
 * Los datos son de ejemplo: el escenario del pedido (noviembre con $500.000
 * del día a día, $800.000 en fijos y $300.000 en abonos a deudas).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { S } from '../../modules/core/state.js';
import { filasHojaMeses, totalesDeLaLente, lenteDeLaHoja } from '../../modules/ui/bloque-gastos.js';
import { totalesPagadosDelAnio } from '../../modules/dominio/compromisos/logic.js';
import { faltaPorPagarDelMes, resumenFijosDelMes, renderListaCompromisos, setFiltroPorPagar } from '../../modules/dominio/compromisos/views/lista.js';
import { irAMesActualBloque, navegarMesBloque } from '../../modules/infra/mes-bloque.js';
import { vencimientosDelMes, inicioDeVencimientos } from '../../modules/infra/vencimientos.js';
import {
  calcularGastadoCategoria, sinLimiteDelMes, resumenLimitesDelMes, totalesLimitesDelAnio, gastoPorSubcategoria,
} from '../../modules/dominio/presupuesto/logic.js';
import { totalesDiaADiaDelAnio } from '../../modules/dominio/gastos/logic.js';

// ── El escenario del pedido ─────────────────────────────────────

const fijos = [
  { id: 'arriendo', descripcion: 'Arriendo', tipo: 'fijo', monto: 700_000, frecuencia: 'Mensual', diaPago: 5, activo: true, fechaCreacion: '2026-06-01T12:00:00' },
  { id: 'disney', descripcion: 'Disney+', tipo: 'fijo', monto: 100_000, frecuencia: 'Mensual', diaPago: 15, activo: true, fechaCreacion: '2026-07-15T12:00:00' },
];
const deudas = [
  { id: 'visa', descripcion: 'Visa', tipo: 'deuda-entidad', saldoTotal: 2_000_000, cuotaMensual: 300_000, frecuencia: 'Mensual', diaPago: 10, activo: true, fechaCreacion: '2026-06-01T12:00:00' },
];
const gastosNoviembre = [
  // Día a día: $500.000, con una compra con la tarjeta (sí es día a día).
  { id: 'g1', categoria: 'Mercado', monto: 300_000, fecha: '2026-11-03' },
  { id: 'g2', categoria: 'Restaurantes', monto: 120_000, fecha: '2026-11-08' },
  { id: 'g3', categoria: 'Ropa', monto: 80_000, fecha: '2026-11-09', compromisoId: 'visa', consumoTC: true },
  // Fijos: $800.000.
  { id: 'p1', categoria: 'Gastos fijos', monto: 700_000, fecha: '2026-11-05', compromisoId: 'arriendo' },
  { id: 'p2', categoria: 'Gastos fijos', monto: 100_000, fecha: '2026-11-15', compromisoId: 'disney' },
  // Deudas: $300.000.
  { id: 'a1', categoria: 'Deudas', monto: 300_000, fecha: '2026-11-10', compromisoId: 'visa' },
];

describe('GAS.12a: la hoja "Elige el mes" habla de la pestaña que la abre (ADR 187 D1)', () => {
  const datos = { gastos: gastosNoviembre, compromisos: [...fijos, ...deudas], presupuestos: [] };

  it('Día a día $500.000, Fijos $800.000 y Deudas $300.000, sin mezclarse', () => {
    expect(totalesDeLaLente('gast', datos, 2026)[10]).toBe(500_000);
    expect(totalesDeLaLente('fijos', datos, 2026)[10]).toBe(800_000);
    expect(totalesDeLaLente('deudas', datos, 2026)[10]).toBe(300_000);
  });

  it('la compra con la tarjeta no es un abono, y un pago sin su compromiso se reconoce por la categoría', () => {
    const t = totalesPagadosDelAnio([
      ...gastosNoviembre,
      { id: 'x', categoria: 'Deudas', monto: 50_000, fecha: '2026-11-20', compromisoId: 'borrada' },
      { id: 'y', categoria: 'Gastos fijos', monto: 40_000, fecha: '2026-11-21', compromisoId: 'otra-borrada' },
    ], [...fijos, ...deudas], 2026, 'deuda');
    expect(t[10]).toBe(350_000);
    expect(totalesPagadosDelAnio(gastosNoviembre, [...fijos, ...deudas], 2025, 'fijo').every(n => n === 0)).toBe(true);
  });

  it('Límites suma lo gastado en sus categorías', () => {
    const presupuestos = [{ id: 'l1', categoria: 'Mercado', montoMensual: 400_000, activo: true }];
    expect(totalesDeLaLente('presupuesto', { ...datos, presupuestos }, 2026)[10]).toBe(300_000);
    expect(totalesLimitesDelAnio(presupuestos, gastosNoviembre, 2026)[9]).toBe(0);
  });

  it('las filas de Fijos llevan los totales de Fijos', () => {
    const filas = filasHojaMeses(2026, {
      ...datos, lente: 'fijos',
      tope: { anio: 2026, mes: 10 }, primero: { anio: 2026, mes: 9 }, visto: { anio: 2026, mes: 10 },
      hoyDate: new Date(2026, 10, 20),
    });
    expect(filas.map(f => [f.mes, f.total])).toEqual([[10, 800_000], [9, 0]]);
  });

  it('sin pestaña, la hoja sigue siendo la del día a día', () => {
    const filas = filasHojaMeses(2026, {
      gastos: gastosNoviembre,
      tope: { anio: 2026, mes: 10 }, primero: { anio: 2026, mes: 10 }, visto: { anio: 2026, mes: 10 },
    });
    expect(filas[0].total).toBe(totalesDiaADiaDelAnio(gastosNoviembre, 2026)[10]);
  });

  it('lenteDeLaHoja: la tarjeta donde se tocó el mes; Fijos y Deudas por el hash', () => {
    document.body.innerHTML = `
      <section id="sec-gast"><button id="b1"></button></section>
      <section id="sec-compromisos"><button id="b2"></button></section>
      <section id="sec-presupuesto"><button id="b3"></button></section>`;
    expect(lenteDeLaHoja(document.getElementById('b1'), 'gast')).toBe('gast');
    expect(lenteDeLaHoja(document.getElementById('b2'), 'fijos')).toBe('fijos');
    expect(lenteDeLaHoja(document.getElementById('b2'), 'deudas')).toBe('deudas');
    expect(lenteDeLaHoja(document.getElementById('b3'), 'presupuesto')).toBe('presupuesto');
  });
});

describe('GAS.12a: los vencimientos de un mes (ADR 187 D1)', () => {
  it('un quincenal trae dos; un anual fuera de su mes, ninguno; lo creado después, ninguno', () => {
    const quincenal = { frecuencia: 'Quincenal', diaPago: 5, fechaCreacion: '2026-01-10T12:00:00' };
    expect(vencimientosDelMes(quincenal, '2026-11')).toEqual(['2026-11-05', '2026-11-20']);
    const anual = { frecuencia: 'Anual', diaPago: 15, fechaCreacion: '2026-03-01T12:00:00' };
    expect(vencimientosDelMes(anual, '2026-11')).toEqual([]);
    expect(vencimientosDelMes(anual, '2027-03')).toEqual(['2027-03-15']);
    expect(vencimientosDelMes(fijos[1], '2026-06')).toEqual([]);
    expect(vencimientosDelMes(fijos[1], '2026-07')).toEqual(['2026-07-15']);
  });

  it('el día 31 cae el último día de los meses cortos', () => {
    const fin = { frecuencia: 'Mensual', diaPago: 31, fechaCreacion: '2026-01-01T12:00:00' };
    expect(vencimientosDelMes(fin, '2026-02')).toEqual(['2026-02-28']);
    expect(vencimientosDelMes(fin, '2028-02')).toEqual(['2028-02-29']);
    expect(vencimientosDelMes(fin, '2026-09')).toEqual(['2026-09-30']);
  });

  it('inicioDeVencimientos: el día local del alta; sin fecha, null', () => {
    expect(inicioDeVencimientos({ fechaCreacion: '2026-07-15' })).toBe('2026-07-15');
    expect(inicioDeVencimientos({})).toBeNull();
  });
});

describe('GAS.12a: Fijos en un mes cuenta solo sus vencimientos (ADR 187 D1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 20, 12));
    document.body.innerHTML = '<div id="lista-compromisos"></div>';
    location.hash = '#fijos';
    setFiltroPorPagar('todo');
    irAMesActualBloque();
  });
  afterEach(() => {
    location.hash = '';
    irAMesActualBloque();
    vi.useRealTimers();
  });

  it('en octubre no queda "sin pagar" lo que se creó en noviembre ni el anual de marzo', () => {
    S.compromisos = [
      fijos[0],
      { id: 'nuevo', descripcion: 'Gimnasio', tipo: 'fijo', monto: 90_000, frecuencia: 'Mensual', diaPago: 2, activo: true, fechaCreacion: '2026-11-01T12:00:00' },
      { id: 'soat', descripcion: 'SOAT', tipo: 'fijo', monto: 600_000, frecuencia: 'Anual', diaPago: 15, activo: true, fechaCreacion: '2026-03-01T12:00:00' },
    ];
    S.gastos = [];
    navegarMesBloque(-1);
    expect(faltaPorPagarDelMes()).toMatchObject({ total: 700_000, cantidad: 1, esActual: false });
  });

  it('un quincenal sin pagar en octubre son dos vencimientos', () => {
    S.compromisos = [{ id: 'q', descripcion: 'Aseo', tipo: 'fijo', monto: 50_000, frecuencia: 'Quincenal', diaPago: 5, activo: true, fechaCreacion: '2026-01-01T12:00:00' }];
    S.gastos = [];
    navegarMesBloque(-1);
    expect(faltaPorPagarDelMes().total).toBe(100_000);
  });

  it('"Pagaste" suma todos los pagos de fijos del mes, y nada de deudas ni del día a día', () => {
    S.compromisos = [...fijos, ...deudas];
    S.gastos = gastosNoviembre;
    const r = resumenFijosDelMes();
    expect(r.pagado).toBe(800_000);
  });

  it('la lista de Fijos del teléfono en un mes pasado no trae lo que no existía', () => {
    const real = window.matchMedia;
    window.matchMedia = (q) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} });
    try {
      S.compromisos = [
        fijos[0],
        { id: 'nuevo', descripcion: 'Gimnasio', tipo: 'fijo', monto: 90_000, frecuencia: 'Mensual', diaPago: 2, activo: true, fechaCreacion: '2026-11-01T12:00:00' },
      ];
      S.gastos = [];
      navegarMesBloque(-1);
      renderListaCompromisos();
      const ids = [...document.querySelectorAll('#lista-compromisos [data-id]')].map(e => e.dataset.id);
      expect(ids).toContain('arriendo');
      expect(ids).not.toContain('nuevo');
    } finally {
      window.matchMedia = real;
    }
  });
});

describe('GAS.12a: Límites cuenta lo mismo que Día a día (ADR 187 D1)', () => {
  const gastos = [
    { id: 'r1', categoria: 'Entretenimiento', monto: 30_000, fecha: '2026-11-02' },
    // Un pago de Disney+ al que se le puso Entretenimiento a mano.
    { id: 'r2', categoria: 'Entretenimiento', monto: 100_000, fecha: '2026-11-15', compromisoId: 'disney', subcategoriaId: 'x' },
    { id: 'r3', categoria: 'Gastos fijos', monto: 700_000, fecha: '2026-11-05', compromisoId: 'arriendo' },
    { id: 'r4', categoria: 'Deudas', monto: 300_000, fecha: '2026-11-10', compromisoId: 'visa' },
  ];

  it('un pago de un fijo no gasta el límite de su categoría', () => {
    expect(calcularGastadoCategoria(gastos, 'Entretenimiento', 2026, 11)).toBe(30_000);
    expect(gastoPorSubcategoria(gastos, 'Entretenimiento', 2026, 11)).toEqual({});
    const presupuestos = [{ id: 'l', categoria: 'Entretenimiento', montoMensual: 50_000, activo: true }];
    expect(resumenLimitesDelMes(presupuestos, gastos, 2026, 11).gastado).toBe(30_000);
  });

  it('las categorías sin límite no traen lo pagado en fijos ni en deudas', () => {
    expect(sinLimiteDelMes([], gastos, 2026, 11).map(s => s.categoria)).toEqual(['Entretenimiento']);
  });
});
