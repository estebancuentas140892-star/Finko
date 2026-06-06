/**
 * tests/unit/inversiones.test.js - cobertura de inversiones/logic.js (J.2a + J.2b).
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
  esProyectable, proyectarInversion, proyectarPortafolio,
  tasaPromedioPonderada, calcularRentabilidadRealPortafolio,
  detectarNudgesInversion, UMBRAL_CONCENTRACION_PCT, UMBRAL_VARIABLE_PCT,
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

// ── J.2b: proyección al vencimiento ────────────────────────────────

describe('esProyectable()', () => {
  it('true con tasa, plazo y monto positivos', () => {
    expect(esProyectable({ monto: 1_000_000, tasaEA: 10, plazoMeses: 12 })).toBe(true);
  });
  it('false sin tasa (retorno variable)', () => {
    expect(esProyectable({ monto: 1_000_000, tasaEA: 0, plazoMeses: 12 })).toBe(false);
  });
  it('false sin plazo (posición abierta)', () => {
    expect(esProyectable({ monto: 1_000_000, tasaEA: 10, plazoMeses: 0 })).toBe(false);
  });
  it('false sin monto válido', () => {
    expect(esProyectable({ monto: 0, tasaEA: 10, plazoMeses: 12 })).toBe(false);
    expect(esProyectable(null)).toBe(false);
  });
});

describe('proyectarInversion()', () => {
  it('CDT a 12 meses aplica retención 7 % sobre el rendimiento', () => {
    // 5.000.000 al 11,5 % EA por 12 meses (≈365 días).
    const r = proyectarInversion({ tipo: 'CDT', monto: 5_000_000, tasaEA: 11.5, plazoMeses: 12 });
    expect(r.aplicaRetencion).toBe(true);
    expect(r.valorFuturoBruto).toBe(5_575_000);
    expect(r.retencion).toBe(40_250);          // 575.000 × 7 %
    expect(r.valorFuturo).toBe(5_534_750);      // neto tras retención
    expect(r.rendimiento).toBe(534_750);
  });

  it('Fondo crece compuesto al EA sin retención', () => {
    // 2.000.000 al 8 % EA por 24 meses → ×(1,08)^2 = 2.332.800.
    const r = proyectarInversion({ tipo: 'Fondo', monto: 2_000_000, tasaEA: 8, plazoMeses: 24 });
    expect(r.aplicaRetencion).toBe(false);
    expect(r.retencion).toBe(0);
    expect(r.valorFuturo).toBe(2_332_800);
    expect(r.rendimiento).toBe(332_800);
  });

  it('Acciones con tasa y plazo se proyectan como crecimiento compuesto', () => {
    const r = proyectarInversion({ tipo: 'Acciones', monto: 1_000_000, tasaEA: 10, plazoMeses: 12 });
    expect(r.aplicaRetencion).toBe(false);
    expect(r.valorFuturo).toBe(1_100_000);
  });

  it('devuelve null si no es proyectable', () => {
    expect(proyectarInversion({ tipo: 'Cripto', monto: 1_000_000, tasaEA: 0, plazoMeses: 0 })).toBeNull();
    expect(proyectarInversion(null)).toBeNull();
  });
});

describe('proyectarPortafolio()', () => {
  it('devuelve base en cero con input no válido', () => {
    const r = proyectarPortafolio(null);
    expect(r.totalInvertido).toBe(0);
    expect(r.proyectables).toBe(0);
  });

  it('agrega proyectables y cuenta los no proyectables a su valor invertido', () => {
    const r = proyectarPortafolio([
      { tipo: 'CDT', monto: 5_000_000, tasaEA: 11.5, plazoMeses: 12 }, // → 5.534.750
      { tipo: 'Cripto', monto: 1_000_000, tasaEA: 0, plazoMeses: 0 },  // no proyectable
    ]);
    expect(r.totalInvertido).toBe(6_000_000);
    expect(r.totalProyectado).toBe(6_534_750); // 5.534.750 + 1.000.000
    expect(r.rendimientoEsperado).toBe(534_750);
    expect(r.proyectables).toBe(1);
    expect(r.noProyectables).toBe(1);
  });

  it('ignora montos no positivos', () => {
    const r = proyectarPortafolio([{ tipo: 'CDT', monto: 0, tasaEA: 10, plazoMeses: 12 }]);
    expect(r.totalInvertido).toBe(0);
  });
});

describe('tasaPromedioPonderada()', () => {
  it('pondera por monto solo los proyectables', () => {
    // (5M×11,5 + 2M×8) / 7M = 10,5.
    const r = tasaPromedioPonderada([
      { tipo: 'CDT', monto: 5_000_000, tasaEA: 11.5, plazoMeses: 12 },
      { tipo: 'Fondo', monto: 2_000_000, tasaEA: 8, plazoMeses: 24 },
      { tipo: 'Cripto', monto: 9_000_000, tasaEA: 0, plazoMeses: 0 }, // excluido
    ]);
    expect(r).toBe(10.5);
  });

  it('null si no hay proyectables', () => {
    expect(tasaPromedioPonderada([{ tipo: 'Cripto', monto: 1_000_000, tasaEA: 0, plazoMeses: 0 }])).toBeNull();
    expect(tasaPromedioPonderada(null)).toBeNull();
  });
});

describe('calcularRentabilidadRealPortafolio()', () => {
  it('ajusta la tasa nominal ponderada por inflación (Fisher)', () => {
    const r = calcularRentabilidadRealPortafolio([
      { tipo: 'CDT', monto: 5_000_000, tasaEA: 11.5, plazoMeses: 12 },
      { tipo: 'Fondo', monto: 2_000_000, tasaEA: 8, plazoMeses: 24 },
    ], 3);
    expect(r.tasaNominalPct).toBe(10.5);
    expect(r.capital).toBe(7_000_000);
    // real = (1,105/1,03 - 1) ≈ 7,28 %.
    expect(r.tasaRealPct).toBeGreaterThan(7);
    expect(r.tasaRealPct).toBeLessThan(7.5);
    expect(r.tasaRealPct).toBeLessThan(r.tasaNominalPct);
  });

  it('null si no hay holdings proyectables', () => {
    expect(calcularRentabilidadRealPortafolio([], 3)).toBeNull();
    expect(calcularRentabilidadRealPortafolio([{ tipo: 'Cripto', monto: 1_000_000, tasaEA: 0, plazoMeses: 0 }], 3)).toBeNull();
  });
});

// ── J.2c: nudges educativos ────────────────────────────────────────

describe('detectarNudgesInversion()', () => {
  const cdt  = { tipo: 'CDT', monto: 5_000_000, tasaEA: 11.5, plazoMeses: 12 };
  const fic  = { tipo: 'Fondo', monto: 5_000_000, tasaEA: 8, plazoMeses: 24 };
  const btc  = { tipo: 'Cripto', monto: 5_000_000, tasaEA: 0, plazoMeses: 0 };

  const ids = (nudges) => nudges.map(n => n.id);

  it('devuelve [] sin inversiones', () => {
    expect(detectarNudgesInversion([], { fondoActivo: true, fondoCompletado: true })).toEqual([]);
    expect(detectarNudgesInversion(null)).toEqual([]);
  });

  it('ignora montos no positivos al evaluar', () => {
    expect(detectarNudgesInversion([{ tipo: 'CDT', monto: 0 }], { fondoActivo: true, fondoCompletado: true })).toEqual([]);
  });

  it('fondo no activo: nudge high "fondo-primero"', () => {
    const n = detectarNudgesInversion([cdt], { fondoActivo: false });
    const fondo = n.find(x => x.id === 'fondo-primero');
    expect(fondo).toBeDefined();
    expect(fondo.nivel).toBe('nudge-high');
  });

  it('fondo activo pero incompleto: nudge medium "fondo-incompleto"', () => {
    const n = detectarNudgesInversion([cdt], { fondoActivo: true, fondoCompletado: false });
    const fondo = n.find(x => x.id === 'fondo-incompleto');
    expect(fondo).toBeDefined();
    expect(fondo.nivel).toBe('nudge-medium');
  });

  it('fondo completo: no aparece ningún nudge de fondo', () => {
    const n = detectarNudgesInversion([cdt, fic], { fondoActivo: true, fondoCompletado: true });
    expect(ids(n)).not.toContain('fondo-primero');
    expect(ids(n)).not.toContain('fondo-incompleto');
  });

  it('concentración: un tipo >= umbral con 2+ holdings dispara el nudge', () => {
    // 9M CDT + 1M Fondo → CDT 90% (>= 70).
    const n = detectarNudgesInversion(
      [{ ...cdt, monto: 9_000_000 }, { ...fic, monto: 1_000_000 }],
      { fondoActivo: true, fondoCompletado: true },
    );
    const conc = n.find(x => x.id === 'concentracion');
    expect(conc).toBeDefined();
    expect(conc.titulo).toContain('90%');
    expect(conc.titulo).toContain('CDT');
  });

  it('no marca concentración con un solo holding (trivialmente 100%)', () => {
    const n = detectarNudgesInversion([cdt], { fondoActivo: true, fondoCompletado: true });
    expect(ids(n)).not.toContain('concentracion');
  });

  it('no marca concentración si está repartido bajo el umbral', () => {
    // 5M + 5M → 50% cada uno (< 70).
    const n = detectarNudgesInversion([cdt, fic], { fondoActivo: true, fondoCompletado: true });
    expect(ids(n)).not.toContain('concentracion');
  });

  it('retorno variable >= umbral dispara el nudge info', () => {
    // 5M CDT (fijo) + 6M cripto (variable) → variable 54% (>= 50).
    const n = detectarNudgesInversion(
      [cdt, { ...btc, monto: 6_000_000 }],
      { fondoActivo: true, fondoCompletado: true },
    );
    const riesgo = n.find(x => x.id === 'riesgo-variable');
    expect(riesgo).toBeDefined();
    expect(riesgo.nivel).toBe('nudge-info');
  });

  it('no marca riesgo variable si el peso variable es bajo', () => {
    // 9M CDT (fijo) + 1M cripto → variable 10%.
    const n = detectarNudgesInversion(
      [{ ...cdt, monto: 9_000_000 }, { ...btc, monto: 1_000_000 }],
      { fondoActivo: true, fondoCompletado: true },
    );
    expect(ids(n)).not.toContain('riesgo-variable');
  });

  it('refuerzo positivo: fondo completo + diversificado', () => {
    const n = detectarNudgesInversion([cdt, fic], { fondoActivo: true, fondoCompletado: true });
    expect(ids(n)).toContain('base-sana');
  });

  it('sin refuerzo positivo si el fondo no está completo', () => {
    const n = detectarNudgesInversion([cdt, fic], { fondoActivo: true, fondoCompletado: false });
    expect(ids(n)).not.toContain('base-sana');
  });

  it('prioriza el nudge de fondo de primero en el orden', () => {
    const n = detectarNudgesInversion(
      [{ ...cdt, monto: 9_000_000 }, { ...fic, monto: 1_000_000 }],
      { fondoActivo: false },
    );
    expect(n[0].id).toBe('fondo-primero');
  });

  it('los umbrales se exportan como números', () => {
    expect(typeof UMBRAL_CONCENTRACION_PCT).toBe('number');
    expect(typeof UMBRAL_VARIABLE_PCT).toBe('number');
  });
});
