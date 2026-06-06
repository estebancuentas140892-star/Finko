/**
 * tests/unit/inversiones.test.js - cobertura de inversiones/logic.js (J.2a).
 *
 * Solo lógica pura (logic.js). La vista y el cableado (index.js) se verifican
 * manualmente en la app y vía E2E.
 */

import { describe, it, expect } from 'vitest';
import {
  TIPOS_INVERSION, TASA_EA_MAX, PLAZO_MESES_MAX,
  calcularTotalInvertido, calcularPorTipo, ordenarInversionesPorMonto,
  validarTipoInversion, validarNombreInversion, validarMontoInversion,
  validarTasaEAInversion, validarPlazoMeses, validarFechaInicio, validarInversion,
  normalizarMontoInversion, normalizarTasaEAInversion, normalizarPlazoMeses,
  normalizarInversion,
} from '../../modules/dominio/inversiones/logic.js';

// ── Constantes ─────────────────────────────────────────────────────

describe('TIPOS_INVERSION', () => {
  it('incluye los tipos esperados', () => {
    expect(TIPOS_INVERSION).toEqual(['CDT', 'Fondo', 'Acciones', 'Cripto', 'Otro']);
  });
});

// ── calcularTotalInvertido ─────────────────────────────────────────

describe('calcularTotalInvertido()', () => {
  it('devuelve 0 con input no válido', () => {
    expect(calcularTotalInvertido(null)).toBe(0);
    expect(calcularTotalInvertido(undefined)).toBe(0);
    expect(calcularTotalInvertido('x')).toBe(0);
  });

  it('devuelve 0 con array vacío', () => {
    expect(calcularTotalInvertido([])).toBe(0);
  });

  it('suma los montos válidos', () => {
    expect(calcularTotalInvertido([
      { monto: 1_000_000 }, { monto: 2_500_000 }, { monto: 500_000 },
    ])).toBe(4_000_000);
  });

  it('ignora montos no positivos o no numéricos', () => {
    expect(calcularTotalInvertido([
      { monto: 1_000_000 }, { monto: -5000 }, { monto: 0 }, { monto: 'abc' }, {},
    ])).toBe(1_000_000);
  });
});

// ── calcularPorTipo ────────────────────────────────────────────────

describe('calcularPorTipo()', () => {
  it('devuelve [] con input no válido o vacío', () => {
    expect(calcularPorTipo(null)).toEqual([]);
    expect(calcularPorTipo([])).toEqual([]);
  });

  it('agrupa por tipo, suma y calcula porcentajes', () => {
    const r = calcularPorTipo([
      { tipo: 'CDT', monto: 6_000_000 },
      { tipo: 'Acciones', monto: 2_000_000 },
      { tipo: 'CDT', monto: 2_000_000 },
    ]);
    expect(r).toEqual([
      { tipo: 'CDT', total: 8_000_000, pct: 80 },
      { tipo: 'Acciones', total: 2_000_000, pct: 20 },
    ]);
  });

  it('ordena de mayor a menor monto', () => {
    const r = calcularPorTipo([
      { tipo: 'Cripto', monto: 1_000_000 },
      { tipo: 'Fondo', monto: 9_000_000 },
    ]);
    expect(r[0].tipo).toBe('Fondo');
  });

  it('trata items sin tipo como "Otro"', () => {
    const r = calcularPorTipo([{ monto: 1_000_000 }]);
    expect(r[0].tipo).toBe('Otro');
  });

  it('ignora montos no positivos', () => {
    const r = calcularPorTipo([{ tipo: 'CDT', monto: 0 }, { tipo: 'CDT', monto: -1 }]);
    expect(r).toEqual([]);
  });
});

// ── ordenarInversionesPorMonto ─────────────────────────────────────

describe('ordenarInversionesPorMonto()', () => {
  it('devuelve [] con input no válido', () => {
    expect(ordenarInversionesPorMonto(null)).toEqual([]);
  });

  it('ordena descendente por monto sin mutar el original', () => {
    const orig = [{ monto: 1 }, { monto: 100 }, { monto: 50 }];
    const r = ordenarInversionesPorMonto(orig);
    expect(r.map(x => x.monto)).toEqual([100, 50, 1]);
    expect(orig.map(x => x.monto)).toEqual([1, 100, 50]); // sin mutar
  });
});

// ── Validaciones ───────────────────────────────────────────────────

describe('validarTipoInversion()', () => {
  it('acepta tipos válidos', () => {
    for (const t of TIPOS_INVERSION) expect(validarTipoInversion(t)).toEqual([]);
  });
  it('rechaza tipo no listado o no string', () => {
    expect(validarTipoInversion('Bono')).toHaveLength(1);
    expect(validarTipoInversion('')).toHaveLength(1);
    expect(validarTipoInversion(null)).toHaveLength(1);
  });
});

describe('validarNombreInversion()', () => {
  it('acepta un nombre normal', () => {
    expect(validarNombreInversion('CDT Bancolombia')).toEqual([]);
  });
  it('rechaza vacío o solo espacios', () => {
    expect(validarNombreInversion('')).toHaveLength(1);
    expect(validarNombreInversion('   ')).toHaveLength(1);
    expect(validarNombreInversion(null)).toHaveLength(1);
  });
  it('rechaza nombre de más de 60 caracteres', () => {
    expect(validarNombreInversion('a'.repeat(61))).toHaveLength(1);
    expect(validarNombreInversion('a'.repeat(60))).toEqual([]);
  });
});

describe('validarMontoInversion()', () => {
  it('acepta monto positivo', () => {
    expect(validarMontoInversion(1_000_000)).toEqual([]);
    expect(validarMontoInversion('500000')).toEqual([]);
  });
  it('rechaza cero, negativo o no numérico', () => {
    expect(validarMontoInversion(0)).toHaveLength(1);
    expect(validarMontoInversion(-100)).toHaveLength(1);
    expect(validarMontoInversion('abc')).toHaveLength(1);
  });
});

describe('validarTasaEAInversion()', () => {
  it('acepta vacío (opcional)', () => {
    expect(validarTasaEAInversion('')).toEqual([]);
    expect(validarTasaEAInversion(null)).toEqual([]);
  });
  it('acepta 0 y valores dentro de rango', () => {
    expect(validarTasaEAInversion(0)).toEqual([]);
    expect(validarTasaEAInversion(12.5)).toEqual([]);
    expect(validarTasaEAInversion(TASA_EA_MAX)).toEqual([]);
  });
  it('rechaza negativo, fuera de rango o no numérico', () => {
    expect(validarTasaEAInversion(-1)).toHaveLength(1);
    expect(validarTasaEAInversion(TASA_EA_MAX + 1)).toHaveLength(1);
    expect(validarTasaEAInversion('abc')).toHaveLength(1);
  });
});

describe('validarPlazoMeses()', () => {
  it('acepta vacío (opcional) y 0', () => {
    expect(validarPlazoMeses('')).toEqual([]);
    expect(validarPlazoMeses(0)).toEqual([]);
  });
  it('acepta entero positivo dentro de rango', () => {
    expect(validarPlazoMeses(12)).toEqual([]);
    expect(validarPlazoMeses(PLAZO_MESES_MAX)).toEqual([]);
  });
  it('rechaza no entero, negativo o fuera de rango', () => {
    expect(validarPlazoMeses(1.5)).toHaveLength(1);
    expect(validarPlazoMeses(-3)).toHaveLength(1);
    expect(validarPlazoMeses(PLAZO_MESES_MAX + 1)).toHaveLength(1);
  });
});

describe('validarFechaInicio()', () => {
  it('acepta formato YYYY-MM-DD', () => {
    expect(validarFechaInicio('2026-06-01')).toEqual([]);
  });
  it('rechaza vacío o formato inválido', () => {
    expect(validarFechaInicio('')).toHaveLength(1);
    expect(validarFechaInicio('01/06/2026')).toHaveLength(1);
    expect(validarFechaInicio(null)).toHaveLength(1);
  });
});

describe('validarInversion()', () => {
  const valido = {
    tipo: 'CDT', nombre: 'CDT XYZ', monto: 1_000_000,
    tasaEA: 11, plazoMeses: 12, fechaInicio: '2026-06-01',
  };

  it('no devuelve errores con datos válidos', () => {
    expect(validarInversion(valido)).toEqual([]);
  });

  it('acumula múltiples errores', () => {
    const errores = validarInversion({
      tipo: 'Bono', nombre: '', monto: 0,
      tasaEA: -5, plazoMeses: 1.5, fechaInicio: 'mal',
    });
    expect(errores.length).toBeGreaterThanOrEqual(6);
  });

  it('campos opcionales vacíos no generan error', () => {
    expect(validarInversion({ ...valido, tasaEA: '', plazoMeses: '' })).toEqual([]);
  });

  it('tolera datos null', () => {
    expect(Array.isArray(validarInversion(null))).toBe(true);
    expect(validarInversion(null).length).toBeGreaterThan(0);
  });
});

// ── Normalización ──────────────────────────────────────────────────

describe('normalizarMontoInversion()', () => {
  it('redondea a entero', () => {
    expect(normalizarMontoInversion('1000000.7')).toBe(1_000_001);
  });
  it('devuelve 0 para inválido o no positivo', () => {
    expect(normalizarMontoInversion('abc')).toBe(0);
    expect(normalizarMontoInversion(-5)).toBe(0);
  });
});

describe('normalizarTasaEAInversion()', () => {
  it('redondea a 2 decimales', () => {
    expect(normalizarTasaEAInversion('11.456')).toBe(11.46);
  });
  it('acota al máximo', () => {
    expect(normalizarTasaEAInversion(TASA_EA_MAX + 50)).toBe(TASA_EA_MAX);
  });
  it('devuelve 0 para vacío o inválido', () => {
    expect(normalizarTasaEAInversion('')).toBe(0);
    expect(normalizarTasaEAInversion('abc')).toBe(0);
    expect(normalizarTasaEAInversion(-1)).toBe(0);
  });
});

describe('normalizarPlazoMeses()', () => {
  it('trunca a entero', () => {
    expect(normalizarPlazoMeses('12.9')).toBe(12);
  });
  it('acota al máximo', () => {
    expect(normalizarPlazoMeses(PLAZO_MESES_MAX + 10)).toBe(PLAZO_MESES_MAX);
  });
  it('devuelve 0 para vacío o inválido', () => {
    expect(normalizarPlazoMeses('')).toBe(0);
    expect(normalizarPlazoMeses(-3)).toBe(0);
  });
});

describe('normalizarInversion()', () => {
  it('construye un objeto normalizado completo', () => {
    const r = normalizarInversion({
      tipo: 'CDT', nombre: '  CDT XYZ  ', monto: '1000000.4',
      tasaEA: '11.5', plazoMeses: '12', fechaInicio: '2026-06-01',
    });
    expect(r).toEqual({
      tipo: 'CDT', nombre: 'CDT XYZ', monto: 1_000_000,
      tasaEA: 11.5, plazoMeses: 12, fechaInicio: '2026-06-01',
    });
  });

  it('tipo no válido cae a "Otro"', () => {
    expect(normalizarInversion({ tipo: 'Bono', nombre: 'x', monto: 1, fechaInicio: '2026-01-01' }).tipo).toBe('Otro');
  });

  it('opcionales ausentes quedan en 0', () => {
    const r = normalizarInversion({ tipo: 'Cripto', nombre: 'BTC', monto: 500_000, fechaInicio: '2026-06-01' });
    expect(r.tasaEA).toBe(0);
    expect(r.plazoMeses).toBe(0);
  });

  it('tolera datos null sin lanzar', () => {
    const r = normalizarInversion(null);
    expect(r.tipo).toBe('Otro');
    expect(r.monto).toBe(0);
  });
});
