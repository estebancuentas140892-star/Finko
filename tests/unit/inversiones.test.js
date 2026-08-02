/**
 * tests/unit/inversiones.test.js - cobertura de inversiones/logic.js (J.2a + J.2b).
 *
 * Casi todo es lógica pura (logic.js). La excepción es el formulario: INV.1 le
 * agregó la pregunta del origen del dinero, y qué rama se dibuja y cuál viene
 * sugerida depende de `S.cuentas`, así que se prueba el HTML que genera
 * `renderFormInversion()`. El movimiento de saldo en sí (descuento al registrar,
 * devolución al eliminar) vive en index.js y se verifica en
 * `tests/e2e/ahorro-inversion.test.js`, que es donde se puede recorrer el modal
 * y el diálogo de confirmación de verdad.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../../modules/core/state.js';
import { renderFormInversion, renderInversion } from '../../modules/dominio/inversiones/view.js';
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
  TOTAL_MOMENTOS, rasgoTipo, explicacionTipo, fechaVencimientoInversion,
  columnasPortafolio, momentoInversion,
  ORIGENES_INVERSION, DIAS_ORIGEN_RECIENTE, origenSugerido, validarOrigenInversion,
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

// ── normalizarInversion(datos, inversionExistente) - EDIT.1 ────────

describe('normalizarInversion() - modo edición (EDIT.1)', () => {
  const datosEditados = {
    tipo: 'Fondo', nombre: 'Fondo renombrado', monto: '2000000',
    tasaEA: '9', plazoMeses: '6', fechaInicio: '2026-08-01',
  };

  it('sin inversionExistente, se comporta igual que antes: sin cuentaId', () => {
    const r = normalizarInversion(datosEditados);
    expect('cuentaId' in r).toBe(false);
  });

  it('con existente sin cuentaId, el resultado tampoco lo agrega', () => {
    const existente = { id: 'i1', tipo: 'CDT', nombre: 'X', monto: 1_000_000, fechaInicio: '2026-01-01' };
    const r = normalizarInversion(datosEditados, existente);
    expect('cuentaId' in r).toBe(false);
  });

  it('con existente con cuentaId, lo preserva aunque el form no lo envíe', () => {
    const existente = { id: 'i1', tipo: 'CDT', nombre: 'X', monto: 1_000_000, fechaInicio: '2026-01-01', cuentaId: 'cta1' };
    const r = normalizarInversion(datosEditados, existente);
    expect(r.cuentaId).toBe('cta1');
  });

  it('ignora un origen/cuentaId que llegara en datos: el existente manda', () => {
    const existente = { id: 'i1', tipo: 'CDT', nombre: 'X', monto: 1_000_000, fechaInicio: '2026-01-01', cuentaId: 'cta1' };
    const r = normalizarInversion({ ...datosEditados, origen: 'cuenta', cuentaId: 'cta9' }, existente);
    expect(r.cuentaId).toBe('cta1');
  });

  it('actualiza tipo, nombre, monto, tasa, plazo y fecha normalmente', () => {
    const existente = { id: 'i1', tipo: 'CDT', nombre: 'CDT viejo', monto: 1_000_000, tasaEA: 10, plazoMeses: 12, fechaInicio: '2026-01-01' };
    const r = normalizarInversion(datosEditados, existente);
    expect(r).toEqual({
      tipo: 'Fondo', nombre: 'Fondo renombrado', monto: 2_000_000,
      tasaEA: 9, plazoMeses: 6, fechaInicio: '2026-08-01',
    });
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

// ── DIS.17: los tres momentos ──────────────────────────────────────

describe('rasgoTipo() y explicacionTipo()', () => {
  it('cada tipo con rasgo devuelve dos o tres palabras', () => {
    expect(rasgoTipo('CDT')).toBe('plazo fijo');
    expect(rasgoTipo('Fondo')).toBe('riesgo bajo');
    expect(rasgoTipo('Acciones')).toBe('sube o baja');
    expect(rasgoTipo('Cripto')).toBe('sube o baja');
  });

  it('"Otro" y los tipos desconocidos no tienen rasgo', () => {
    expect(rasgoTipo('Otro')).toBe('');
    expect(rasgoTipo('Finca raiz')).toBe('');
    expect(rasgoTipo(undefined)).toBe('');
  });

  it('cada tipo conocido tiene su explicación', () => {
    for (const tipo of TIPOS_INVERSION) {
      expect(explicacionTipo(tipo).length).toBeGreaterThan(40);
    }
  });

  it('un tipo desconocido cae a la explicación de "Otro"', () => {
    expect(explicacionTipo('Finca raiz')).toBe(explicacionTipo('Otro'));
  });
});

// ── fechaVencimientoInversion ──────────────────────────────────────

describe('fechaVencimientoInversion()', () => {
  it('suma el plazo en meses a la fecha de inicio', () => {
    expect(fechaVencimientoInversion({ fechaInicio: '2026-03-15', plazoMeses: 12 }))
      .toBe('2027-03-15');
    expect(fechaVencimientoInversion({ fechaInicio: '2026-03-15', plazoMeses: 6 }))
      .toBe('2026-09-15');
  });

  it('acota el día al último del mes destino', () => {
    expect(fechaVencimientoInversion({ fechaInicio: '2026-01-31', plazoMeses: 1 }))
      .toBe('2026-02-28');
    expect(fechaVencimientoInversion({ fechaInicio: '2028-01-31', plazoMeses: 1 }))
      .toBe('2028-02-29');
  });

  it('devuelve null sin plazo, sin fecha o con formato inválido', () => {
    expect(fechaVencimientoInversion({ fechaInicio: '2026-03-15', plazoMeses: 0 })).toBeNull();
    expect(fechaVencimientoInversion({ fechaInicio: '', plazoMeses: 12 })).toBeNull();
    expect(fechaVencimientoInversion({ fechaInicio: '15/03/2026', plazoMeses: 12 })).toBeNull();
    expect(fechaVencimientoInversion(null)).toBeNull();
  });
});

// ── columnasPortafolio ─────────────────────────────────────────────

describe('columnasPortafolio()', () => {
  const cdt = { tipo: 'CDT', monto: 6_000_000, tasaEA: 10, plazoMeses: 12 };
  const btc = { tipo: 'Cripto', monto: 4_000_000, tasaEA: 0, plazoMeses: 0 };

  it('devuelve null sin capital registrado', () => {
    expect(columnasPortafolio([])).toBeNull();
    expect(columnasPortafolio(null)).toBeNull();
    expect(columnasPortafolio([{ tipo: 'CDT', monto: 0 }])).toBeNull();
  });

  it('las dos columnas comparten escala: cuerpo + tiempo suman 100', () => {
    const c = columnasPortafolio([cdt, btc]);
    expect(c.altoCuerpo + c.altoTiempo).toBeCloseTo(100, 2);
  });

  it('los segmentos del cuerpo suman la altura del cuerpo', () => {
    const c = columnasPortafolio([cdt, btc]);
    const suma = c.segmentos.reduce((s, seg) => s + seg.alto, 0);
    expect(suma).toBeCloseTo(c.altoCuerpo, 1);
  });

  it('un segmento por tipo, de mayor a menor monto', () => {
    const c = columnasPortafolio([btc, cdt]);
    expect(c.segmentos.map(s => s.tipo)).toEqual(['CDT', 'Cripto']);
    expect(c.segmentos[0].pct).toBe(60);
  });

  it('sin nada proyectable el tiempo no aporta altura', () => {
    const c = columnasPortafolio([btc]);
    expect(c.altoTiempo).toBe(0);
    expect(c.altoCuerpo).toBe(100);
    expect(c.proyectables).toBe(0);
    expect(c.noProyectables).toBe(1);
  });

  it('el rendimiento proyectado se refleja en el segmento del tiempo', () => {
    const c = columnasPortafolio([cdt]);
    expect(c.rendimiento).toBeGreaterThan(0);
    expect(c.altoTiempo).toBeGreaterThan(0);
    expect(c.altoTiempo).toBeLessThan(20); // un portafolio joven aporta poco
  });
});

// ── momentoInversion ───────────────────────────────────────────────

describe('momentoInversion()', () => {
  const cdt = { tipo: 'CDT', monto: 5_000_000, tasaEA: 11.5, plazoMeses: 12 };
  const fic = { tipo: 'Fondo', monto: 5_000_000, tasaEA: 8, plazoMeses: 24 };
  const listo = { fondoActivo: true, fondoCompletado: true };

  it('el recorrido tiene tres momentos', () => {
    expect(TOTAL_MOMENTOS).toBe(3);
  });

  it('devuelve null sin inversiones con monto', () => {
    expect(momentoInversion([], listo)).toBeNull();
    expect(momentoInversion(null)).toBeNull();
    expect(momentoInversion([{ tipo: 'CDT', monto: 0 }], listo)).toBeNull();
  });

  it('con una inversión es el momento 1 y explica el instrumento', () => {
    const m = momentoInversion([cdt], listo);
    expect(m.numero).toBe(1);
    expect(m.chip).toBe('aprendiendo');
    expect(m.frase).toBe(explicacionTipo('CDT'));
    expect(m.accion).toBe('Registrar otra inversión');
  });

  it('el momento 1 anticipa el momento 2, que sí se puede construir', () => {
    const m = momentoInversion([cdt], listo);
    expect(m.anticipoKicker).toBe('Siguiente momento');
    expect(m.anticipo).toContain('dos o más inversiones');
  });

  it('con dos o más inversiones es el momento 2', () => {
    const m = momentoInversion([cdt, fic], listo);
    expect(m.numero).toBe(2);
    expect(m.chip).toBe('construyendo');
    expect(m.frase).toContain('2 inversiones');
    expect(m.frase).toContain('2 tipos distintos');
  });

  it('el momento 2 no promete el momento 3, que no se puede construir', () => {
    const m = momentoInversion([cdt, fic], listo);
    expect(m.anticipo).not.toMatch(/rindieron|de verdad/);
    expect(m.anticipo).toContain('interés compuesto');
  });

  it('el refuerzo positivo se absorbe en la frase del momento 2', () => {
    const m = momentoInversion([cdt, fic], listo);
    expect(m.frase).toContain('fondo de emergencia completo');
  });

  it('la concentración se absorbe en la frase, no se apila como nudge', () => {
    const m = momentoInversion(
      [{ ...cdt, monto: 9_000_000 }, { ...fic, monto: 1_000_000 }],
      listo,
    );
    expect(m.frase).toContain('90% de lo que tienes invertido está en CDT');
  });

  it('el nudge del fondo de emergencia sale como aviso', () => {
    const m = momentoInversion([cdt], { fondoActivo: false });
    expect(m.aviso.id).toBe('fondo-primero');
  });

  it('sin aviso cuando el fondo ya está completo', () => {
    expect(momentoInversion([cdt], listo).aviso).toBeNull();
  });

  it('el fondo incompleto también sale como aviso', () => {
    const m = momentoInversion([cdt, fic], { fondoActivo: true, fondoCompletado: false });
    expect(m.aviso.id).toBe('fondo-incompleto');
  });
});

// ── ORIGEN DEL DINERO (INV.1, ADR 053) ─────────────────────────────

describe('ORIGENES_INVERSION', () => {
  it('son exactamente dos ramas: la que mueve dinero y la que no', () => {
    expect(ORIGENES_INVERSION).toEqual(['cuenta', 'preexistente']);
  });
});

describe('origenSugerido()', () => {
  const HOY = '2026-07-29';

  it('la misma fecha de hoy sugiere la cuenta: la inversión se está haciendo ahora', () => {
    expect(origenSugerido(HOY, HOY)).toBe('cuenta');
  });

  it('una fecha dentro del último mes sugiere la cuenta', () => {
    expect(origenSugerido('2026-07-15', HOY)).toBe('cuenta');
    expect(origenSugerido('2026-06-29', HOY)).toBe('cuenta'); // 30 dias exactos
  });

  it('pasado el umbral sugiere preexistente: ese saldo ya lo excluía', () => {
    expect(origenSugerido('2026-06-28', HOY)).toBe('preexistente'); // 31 dias
    expect(origenSugerido('2024-01-10', HOY)).toBe('preexistente');
  });

  it('una fecha futura cuenta como reciente: el dinero sale de una cuenta viva', () => {
    expect(origenSugerido('2026-08-15', HOY)).toBe('cuenta');
  });

  it('el umbral es el que declara la constante, no un número suelto', () => {
    expect(DIAS_ORIGEN_RECIENTE).toBe(30);
  });

  it('ante un dato inválido sugiere la rama que no mueve dinero', () => {
    expect(origenSugerido('', HOY)).toBe('preexistente');
    expect(origenSugerido('julio', HOY)).toBe('preexistente');
    expect(origenSugerido(null, HOY)).toBe('preexistente');
    expect(origenSugerido(HOY, '')).toBe('preexistente');
    expect(origenSugerido(HOY, 'hoy')).toBe('preexistente');
  });
});

describe('validarOrigenInversion()', () => {
  it('sin origen no exige nada: el formulario no dibuja la pregunta sin cuentas activas', () => {
    expect(validarOrigenInversion(undefined, undefined)).toEqual([]);
    expect(validarOrigenInversion(null, null)).toEqual([]);
    expect(validarOrigenInversion('', '')).toEqual([]);
  });

  it('preexistente no necesita cuenta', () => {
    expect(validarOrigenInversion('preexistente', '')).toEqual([]);
    expect(validarOrigenInversion('preexistente', undefined)).toEqual([]);
  });

  it('la rama de cuenta sin cuenta elegida es un error: el descuento no tendría destino', () => {
    expect(validarOrigenInversion('cuenta', '')).toHaveLength(1);
    expect(validarOrigenInversion('cuenta', '   ')).toHaveLength(1);
    expect(validarOrigenInversion('cuenta', undefined)[0]).toContain('cuenta de la que sale');
  });

  it('la rama de cuenta con cuenta elegida es válida', () => {
    expect(validarOrigenInversion('cuenta', 'cta1')).toEqual([]);
  });

  it('una rama que no existe se rechaza en vez de tratarse como preexistente', () => {
    expect(validarOrigenInversion('otra-cosa', 'cta1')).toHaveLength(1);
  });
});

describe('normalizarInversion() - cuentaId (INV.1)', () => {
  const base = {
    tipo: 'CDT', nombre: 'CDT Bancolombia', monto: '5000000',
    tasaEA: '10', plazoMeses: '12', fechaInicio: '2026-07-29',
  };

  it('la rama de cuenta persiste el cuentaId', () => {
    const inv = normalizarInversion({ ...base, origen: 'cuenta', cuentaId: 'cta1' });
    expect(inv.cuentaId).toBe('cta1');
  });

  it('la rama preexistente no agrega la propiedad, ni vacía', () => {
    const inv = normalizarInversion({ ...base, origen: 'preexistente', cuentaId: 'cta1' });
    expect('cuentaId' in inv).toBe(false);
  });

  it('sin origen tampoco la agrega: su presencia es lo que dice que descontó un saldo', () => {
    const inv = normalizarInversion(base);
    expect('cuentaId' in inv).toBe(false);
  });

  it('la rama de cuenta con cuentaId en blanco no guarda un origen falso', () => {
    const inv = normalizarInversion({ ...base, origen: 'cuenta', cuentaId: '  ' });
    expect('cuentaId' in inv).toBe(false);
  });

  it('recorta los espacios del cuentaId', () => {
    const inv = normalizarInversion({ ...base, origen: 'cuenta', cuentaId: ' cta9 ' });
    expect(inv.cuentaId).toBe('cta9');
  });
});

describe('validarInversion() - incluye el origen', () => {
  const base = {
    tipo: 'CDT', nombre: 'CDT', monto: 1_000_000,
    tasaEA: 10, plazoMeses: 12, fechaInicio: '2026-07-29',
  };

  it('un formulario válido sin origen sigue siendo válido', () => {
    expect(validarInversion(base)).toEqual([]);
  });

  it('la rama de cuenta sin cuenta acumula su error con los demás', () => {
    const errores = validarInversion({ ...base, origen: 'cuenta' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toContain('cuenta');
  });
});

// ── renderFormInversion() - la pregunta del origen (INV.1) ─────────

describe('renderFormInversion() - origen del dinero', () => {
  beforeEach(() => {
    S.cuentas = [
      { id: 'cta1', nombre: 'Ahorros Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 3_000_000, activa: true },
      { id: 'cta2', nombre: 'Nequi',               banco: 'Nequi',       tipo: 'Ahorros', saldo:   500_000, activa: true },
    ];
  });

  it('con cuentas activas dibuja las dos ramas, no una casilla', () => {
    const html = renderFormInversion({ fechaInicio: '2026-07-29' });
    expect(html).toContain('name="origen"');
    expect(html).toContain('value="cuenta"');
    expect(html).toContain('value="preexistente"');
    expect(html).toContain('¿De dónde sale este dinero?');
  });

  it('sin ninguna cuenta activa no pregunta: la rama de cuenta no existiría', () => {
    S.cuentas = [{ id: 'cta1', nombre: 'Cerrada', saldo: 0, activa: false }];
    const html = renderFormInversion({ fechaInicio: '2026-07-29' });
    expect(html).not.toContain('name="origen"');
  });

  it('sin cuentas del todo tampoco pregunta', () => {
    S.cuentas = [];
    expect(renderFormInversion({ fechaInicio: '2026-07-29' })).not.toContain('name="origen"');
  });

  it('el selector de cuenta viene visible cuando la rama sugerida es la cuenta', () => {
    document.body.innerHTML = renderFormInversion({ fechaInicio: '2026-07-29' });
    const bloque = document.getElementById('inv-origen-cuenta');
    expect(bloque).not.toBeNull();
    expect(bloque.hidden).toBe(false);
    expect(document.querySelector('input[name="origen"][value="cuenta"]').checked).toBe(true);
    expect(document.querySelector('input[name="cuentaId"]')).not.toBeNull();
  });

  it('con una fecha vieja la rama sugerida es preexistente y el selector arranca oculto', () => {
    document.body.innerHTML = renderFormInversion({ fechaInicio: '2020-01-15' });
    expect(document.getElementById('inv-origen-cuenta').hidden).toBe(true);
    expect(document.querySelector('input[name="origen"][value="preexistente"]').checked).toBe(true);
  });

  it('el selector ofrece las cuentas activas con su saldo, para elegir con el dato a la vista', () => {
    document.body.innerHTML = renderFormInversion({ fechaInicio: '2026-07-29' });
    const radios = [...document.querySelectorAll('#inv-origen-cuenta input[name="cuentaId"]')];
    expect(radios.map(r => r.value)).toEqual(['cta1', 'cta2']);
    expect(document.getElementById('inv-origen-cuenta').textContent).toContain('$3.000.000');
  });

  it('dice qué pasa con cada rama, en pesos y no en jerga', () => {
    const html = renderFormInversion({ fechaInicio: '2026-07-29' });
    expect(html).toContain('le descuenta ese dinero');
    expect(html).toContain('los saldos no se tocan');
  });
});

// ── renderFormInversion(inversion) - modo edición (EDIT.1) ─────────

describe('renderFormInversion() - modo edición (EDIT.1)', () => {
  beforeEach(() => {
    S.cuentas = [
      { id: 'cta1', nombre: 'Ahorros Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 3_000_000, activa: true },
    ];
  });

  const inversionBase = (overrides = {}) => ({
    id: 'i1', tipo: 'CDT', nombre: 'CDT Bancolombia', monto: 5_000_000,
    tasaEA: 10, plazoMeses: 12, fechaInicio: '2026-06-01',
    ...overrides,
  });

  it('sin inversion, arranca en modo creación: botón "Guardar inversión"', () => {
    const html = renderFormInversion({ fechaInicio: '2026-08-02' });
    expect(html).toContain('>Guardar inversión<');
    expect(html).not.toContain('Actualizar inversión');
  });

  it('con una inversión, prellena nombre, monto, tasa, plazo y fecha', () => {
    const inv = inversionBase();
    const html = renderFormInversion({ fechaInicio: inv.fechaInicio, inversion: inv });
    expect(html).toMatch(/id="inv-nombre"[^>]*value="CDT Bancolombia"/);
    expect(html).toMatch(/id="inv-monto"[^>]*value="5000000"/);
    expect(html).toMatch(/id="inv-tasa"[^>]*value="10"/);
    expect(html).toMatch(/id="inv-plazo"[^>]*value="12"/);
    expect(html).toMatch(/id="inv-fecha"[^>]*value="2026-06-01"/);
  });

  it('con una inversión, el botón dice "Actualizar inversión"', () => {
    const html = renderFormInversion({ fechaInicio: '2026-06-01', inversion: inversionBase() });
    expect(html).toContain('>Actualizar inversión<');
    expect(html).not.toContain('>Guardar inversión<');
  });

  it('marca el tipo de la inversión como seleccionado', () => {
    const html = renderFormInversion({ fechaInicio: '2026-06-01', inversion: inversionBase({ tipo: 'Fondo' }) });
    expect(html).toContain('<option value="Fondo" selected>Fondo</option>');
  });

  it('sin cuentaId, no pregunta ni muestra nota de origen', () => {
    const html = renderFormInversion({ fechaInicio: '2026-06-01', inversion: inversionBase() });
    expect(html).not.toContain('name="origen"');
    expect(html).not.toContain('salió de');
  });

  it('con cuentaId, muestra la cuenta de origen en solo lectura, sin volver a preguntar', () => {
    const inv = inversionBase({ cuentaId: 'cta1' });
    const html = renderFormInversion({ fechaInicio: inv.fechaInicio, inversion: inv });
    expect(html).not.toContain('name="origen"');
    expect(html).toContain('Ahorros Bancolombia');
    expect(html).toContain('Finko ajusta el saldo de esa cuenta');
  });

  it('tasa y plazo en 0 quedan vacíos, no "0", en el campo (mismo criterio que placeholder)', () => {
    const inv = inversionBase({ tasaEA: 0, plazoMeses: 0 });
    const html = renderFormInversion({ fechaInicio: inv.fechaInicio, inversion: inv });
    expect(html).toMatch(/id="inv-tasa"[^>]*value=""/);
    expect(html).toMatch(/id="inv-plazo"[^>]*value=""/);
  });
});

// ── _renderItem() (vía renderInversion) - botón Editar (EDIT.1) ────

describe('renderInversion() - botón Editar en la tarjeta (EDIT.1)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-inversion"></div>';
    S.cuentas = [];
  });

  it('cada inversión trae un botón "inversion-editar" con su id', () => {
    S.inversiones = [{ id: 'i1', tipo: 'CDT', nombre: 'CDT Bancolombia', monto: 5_000_000, tasaEA: 10, plazoMeses: 12, fechaInicio: '2026-06-01' }];
    renderInversion();
    const btn = document.querySelector('[data-action="inversion-editar"]');
    expect(btn).not.toBeNull();
    expect(btn.dataset.id).toBe('i1');
    expect(btn.getAttribute('aria-label')).toBe('Editar inversión CDT Bancolombia');
  });
});
