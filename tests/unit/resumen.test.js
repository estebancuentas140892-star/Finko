import { describe, it, expect } from 'vitest';
import {
  gastoUltimos7Dias,
  gastoSemanaPrevia,
  registrosUltimos7Dias,
  compararSemanas,
  categoriaTopSemana,
  diasActivosMes,
  resumenSemanal,
  hayResumen,
} from '../../modules/dominio/resumen/logic.js';

// ── FIXTURES ─────────────────────────────────────────────────────
//
// Hoy de referencia: 2026-06-13.
//   Semana actual (0-6 días atrás): 2026-06-07 .. 2026-06-13
//   Semana previa  (7-13 días atrás): 2026-05-31 .. 2026-06-06

const HOY = '2026-06-13';

const gasto = (overrides = {}) => ({
  id: 'g',
  descripcion: 'Gasto',
  monto: 10_000,
  categoria: 'Alimentación',
  fecha: '2026-06-13',
  cuentaId: null,
  nota: '',
  ...overrides,
});

// ── gastoUltimos7Dias() ──────────────────────────────────────────

describe('gastoUltimos7Dias()', () => {
  it('suma solo los gastos de los últimos 7 días (hoy incluido)', () => {
    const gastos = [
      gasto({ fecha: '2026-06-13', monto: 5_000 }),   // hoy
      gasto({ fecha: '2026-06-07', monto: 3_000 }),   // hace 6 días (límite)
      gasto({ fecha: '2026-06-06', monto: 9_000 }),   // hace 7 días (fuera)
    ];
    expect(gastoUltimos7Dias(gastos, HOY)).toBe(8_000);
  });

  it('ignora gastos futuros', () => {
    const gastos = [gasto({ fecha: '2026-06-20', monto: 4_000 })];
    expect(gastoUltimos7Dias(gastos, HOY)).toBe(0);
  });

  it('devuelve 0 con lista vacía o nula', () => {
    expect(gastoUltimos7Dias([], HOY)).toBe(0);
    expect(gastoUltimos7Dias(undefined, HOY)).toBe(0);
  });
});

// ── gastoSemanaPrevia() ──────────────────────────────────────────

describe('gastoSemanaPrevia()', () => {
  it('suma solo los gastos de la semana anterior (7-13 días atrás)', () => {
    const gastos = [
      gasto({ fecha: '2026-06-06', monto: 2_000 }),   // hace 7 días (entra)
      gasto({ fecha: '2026-05-31', monto: 6_000 }),   // hace 13 días (límite)
      gasto({ fecha: '2026-05-30', monto: 1_000 }),   // hace 14 días (fuera)
      gasto({ fecha: '2026-06-13', monto: 9_000 }),   // hoy (fuera)
    ];
    expect(gastoSemanaPrevia(gastos, HOY)).toBe(8_000);
  });
});

// ── registrosUltimos7Dias() ──────────────────────────────────────

describe('registrosUltimos7Dias()', () => {
  it('cuenta cuántos gastos hay en la última semana', () => {
    const gastos = [
      gasto({ fecha: '2026-06-13' }),
      gasto({ fecha: '2026-06-10' }),
      gasto({ fecha: '2026-06-01' }),   // fuera de la ventana
    ];
    expect(registrosUltimos7Dias(gastos, HOY)).toBe(2);
  });
});

// ── compararSemanas() ────────────────────────────────────────────

describe('compararSemanas()', () => {
  it('detecta subida con su porcentaje', () => {
    expect(compararSemanas(150, 100)).toEqual({ direccion: 'subió', delta: 50, pct: 50 });
  });

  it('detecta bajada con su porcentaje', () => {
    expect(compararSemanas(75, 100)).toEqual({ direccion: 'bajó', delta: -25, pct: 25 });
  });

  it('detecta igualdad cuando ambas tienen el mismo gasto', () => {
    expect(compararSemanas(100, 100)).toEqual({ direccion: 'igual', delta: 0, pct: 0 });
  });

  it('marca sin-previa cuando la semana pasada no tuvo gasto', () => {
    expect(compararSemanas(80, 0)).toEqual({ direccion: 'sin-previa', delta: 80, pct: null });
  });

  it('redondea el porcentaje al entero más cercano', () => {
    expect(compararSemanas(133, 100).pct).toBe(33);
    expect(compararSemanas(100, 99).pct).toBe(1);
  });
});

// ── categoriaTopSemana() ─────────────────────────────────────────

describe('categoriaTopSemana()', () => {
  it('devuelve la categoría con más gasto de la semana', () => {
    const gastos = [
      gasto({ fecha: '2026-06-13', categoria: 'Alimentación', monto: 30_000 }),
      gasto({ fecha: '2026-06-12', categoria: 'Transporte',   monto: 50_000 }),
      gasto({ fecha: '2026-06-11', categoria: 'Alimentación', monto: 10_000 }),
    ];
    expect(categoriaTopSemana(gastos, HOY)).toEqual({ categoria: 'Transporte', total: 50_000 });
  });

  it('solo considera gastos de la última semana', () => {
    const gastos = [
      gasto({ fecha: '2026-06-13', categoria: 'Salud',        monto: 5_000 }),
      gasto({ fecha: '2026-05-01', categoria: 'Vivienda',     monto: 99_000 }),  // viejo
    ];
    expect(categoriaTopSemana(gastos, HOY)).toEqual({ categoria: 'Salud', total: 5_000 });
  });

  it('agrupa "Otros" cuando la categoría falta', () => {
    const gastos = [gasto({ fecha: '2026-06-13', categoria: undefined, monto: 7_000 })];
    expect(categoriaTopSemana(gastos, HOY)).toEqual({ categoria: 'Otros', total: 7_000 });
  });

  it('devuelve null si no hubo gasto en la semana', () => {
    const gastos = [gasto({ fecha: '2026-05-01' })];
    expect(categoriaTopSemana(gastos, HOY)).toBeNull();
  });
});

// ── diasActivosMes() ─────────────────────────────────────────────

describe('diasActivosMes()', () => {
  it('cuenta días distintos del mes con al menos un gasto', () => {
    const gastos = [
      gasto({ fecha: '2026-06-01' }),
      gasto({ fecha: '2026-06-01' }),   // mismo día, no suma
      gasto({ fecha: '2026-06-13' }),
    ];
    expect(diasActivosMes(gastos, '2026-06')).toBe(2);
  });

  it('ignora gastos de otros meses', () => {
    const gastos = [
      gasto({ fecha: '2026-06-10' }),
      gasto({ fecha: '2026-05-31' }),
      gasto({ fecha: '2026-07-01' }),
    ];
    expect(diasActivosMes(gastos, '2026-06')).toBe(1);
  });

  it('acepta un ISO completo y usa solo el prefijo del mes', () => {
    const gastos = [gasto({ fecha: '2026-06-10' })];
    expect(diasActivosMes(gastos, HOY)).toBe(1);
  });

  it('devuelve 0 con mes inválido', () => {
    expect(diasActivosMes([gasto()], '')).toBe(0);
    expect(diasActivosMes([gasto()], undefined)).toBe(0);
  });
});

// ── resumenSemanal() ─────────────────────────────────────────────

describe('resumenSemanal()', () => {
  it('compone todos los agregados en un solo objeto', () => {
    const gastos = [
      gasto({ fecha: '2026-06-13', categoria: 'Transporte',   monto: 60_000 }),
      gasto({ fecha: '2026-06-10', categoria: 'Alimentación', monto: 40_000 }),
      gasto({ fecha: '2026-06-02', categoria: 'Vivienda',     monto: 50_000 }),  // semana previa
    ];
    const r = resumenSemanal(gastos, HOY);
    expect(r.actual).toBe(100_000);
    expect(r.previa).toBe(50_000);
    expect(r.comparacion.direccion).toBe('subió');
    expect(r.comparacion.pct).toBe(100);
    expect(r.top).toEqual({ categoria: 'Transporte', total: 60_000 });
    expect(r.registros).toBe(2);
    expect(r.diasActivos).toBe(3);
  });
});

// ── hayResumen() ─────────────────────────────────────────────────

describe('hayResumen()', () => {
  it('es true cuando hay al menos un gasto esta semana', () => {
    expect(hayResumen([gasto({ fecha: '2026-06-13' })], HOY)).toBe(true);
  });

  it('es false cuando no hubo gasto en los últimos 7 días', () => {
    expect(hayResumen([gasto({ fecha: '2026-06-01' })], HOY)).toBe(false);
    expect(hayResumen([], HOY)).toBe(false);
  });
});
