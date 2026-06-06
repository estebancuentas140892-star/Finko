import { describe, it, expect } from 'vitest';
import {
  calcularObjetivoFondo,
  calcularProgresoFondo,
  mesesDeColchon,
  calcularTasaAhorro,
  validarMetaMeses,
  validarMontoActual,
  normalizarMetaMeses,
  normalizarMontoActual,
  META_MESES_MIN,
  META_MESES_MAX,
  META_MESES_DEFAULT,
} from '../../modules/dominio/ahorro/logic.js';

// ── calcularObjetivoFondo ────────────────────────────────────────

describe('calcularObjetivoFondo', () => {
  it('multiplica gastos fijos por meta de meses', () => {
    expect(calcularObjetivoFondo(2_000_000, 3)).toBe(6_000_000);
    expect(calcularObjetivoFondo(1_500_000, 6)).toBe(9_000_000);
  });

  it('redondea el resultado a entero', () => {
    expect(calcularObjetivoFondo(1_234_567, 3)).toBe(3_703_701);
  });

  it('devuelve 0 si los gastos fijos no son válidos o no positivos', () => {
    expect(calcularObjetivoFondo(0, 3)).toBe(0);
    expect(calcularObjetivoFondo(-100, 3)).toBe(0);
    expect(calcularObjetivoFondo(NaN, 3)).toBe(0);
    expect(calcularObjetivoFondo(undefined, 3)).toBe(0);
  });

  it('devuelve 0 si la meta de meses no es válida o no positiva', () => {
    expect(calcularObjetivoFondo(1_000_000, 0)).toBe(0);
    expect(calcularObjetivoFondo(1_000_000, -3)).toBe(0);
    expect(calcularObjetivoFondo(1_000_000, NaN)).toBe(0);
  });
});

// ── calcularProgresoFondo ────────────────────────────────────────

describe('calcularProgresoFondo', () => {
  it('calcula porcentaje y faltante con valores intermedios', () => {
    expect(calcularProgresoFondo(1_500_000, 6_000_000))
      .toEqual({ porcentaje: 25, faltante: 4_500_000, completado: false });
  });

  it('redondea el porcentaje al entero más cercano', () => {
    expect(calcularProgresoFondo(1_000_000, 3_000_000).porcentaje).toBe(33);
    expect(calcularProgresoFondo(2_000_000, 3_000_000).porcentaje).toBe(67);
  });

  it('marca completado cuando montoActual alcanza el objetivo', () => {
    const r = calcularProgresoFondo(6_000_000, 6_000_000);
    expect(r.porcentaje).toBe(100);
    expect(r.faltante).toBe(0);
    expect(r.completado).toBe(true);
  });

  it('limita porcentaje a 100 cuando hay exceso de ahorro', () => {
    const r = calcularProgresoFondo(10_000_000, 6_000_000);
    expect(r.porcentaje).toBe(100);
    expect(r.faltante).toBe(0);
    expect(r.completado).toBe(true);
  });

  it('devuelve estructura vacía si el objetivo no es positivo', () => {
    expect(calcularProgresoFondo(500_000, 0))
      .toEqual({ porcentaje: 0, faltante: 0, completado: false });
    expect(calcularProgresoFondo(500_000, -100))
      .toEqual({ porcentaje: 0, faltante: 0, completado: false });
  });

  it('trata monto negativo o no válido como 0', () => {
    expect(calcularProgresoFondo(-500_000, 1_000_000).porcentaje).toBe(0);
    expect(calcularProgresoFondo(NaN, 1_000_000).porcentaje).toBe(0);
  });
});

// ── mesesDeColchon ───────────────────────────────────────────────

describe('mesesDeColchon', () => {
  it('cuenta los meses que cubre el monto actual con 1 decimal', () => {
    expect(mesesDeColchon(3_000_000, 1_500_000)).toBe(2);
    expect(mesesDeColchon(2_250_000, 1_500_000)).toBe(1.5);
  });

  it('redondea a 1 decimal', () => {
    expect(mesesDeColchon(1_000_000, 750_000)).toBe(1.3);
  });

  it('devuelve null si no hay gastos fijos > 0 (ratio indefinido)', () => {
    expect(mesesDeColchon(1_000_000, 0)).toBeNull();
    expect(mesesDeColchon(1_000_000, -50_000)).toBeNull();
    expect(mesesDeColchon(1_000_000, NaN)).toBeNull();
  });

  it('devuelve 0 si el usuario aún no ha apartado nada', () => {
    expect(mesesDeColchon(0, 1_500_000)).toBe(0);
  });

  it('trata monto negativo o no válido como 0', () => {
    expect(mesesDeColchon(-500_000, 1_000_000)).toBe(0);
    expect(mesesDeColchon(NaN, 1_000_000)).toBe(0);
  });
});

// ── calcularTasaAhorro ───────────────────────────────────────────

describe('calcularTasaAhorro', () => {
  it('devuelve el porcentaje de ingresos no gastados', () => {
    expect(calcularTasaAhorro(4_000_000, 3_000_000)).toBe(25);
    expect(calcularTasaAhorro(2_000_000, 1_500_000)).toBe(25);
  });

  it('devuelve 0 cuando gastos = ingresos', () => {
    expect(calcularTasaAhorro(2_000_000, 2_000_000)).toBe(0);
  });

  it('permite resultado negativo si los gastos superan ingresos', () => {
    expect(calcularTasaAhorro(2_000_000, 2_500_000)).toBe(-25);
  });

  it('devuelve null si los ingresos no son > 0', () => {
    expect(calcularTasaAhorro(0, 100_000)).toBeNull();
    expect(calcularTasaAhorro(-100, 50_000)).toBeNull();
    expect(calcularTasaAhorro(NaN, 50_000)).toBeNull();
  });

  it('devuelve null si los gastos no son numéricos', () => {
    expect(calcularTasaAhorro(2_000_000, NaN)).toBeNull();
  });
});

// ── validarMetaMeses ─────────────────────────────────────────────

describe('validarMetaMeses', () => {
  it('acepta enteros dentro del rango permitido', () => {
    expect(validarMetaMeses(3)).toEqual([]);
    expect(validarMetaMeses('6')).toEqual([]);
    expect(validarMetaMeses(META_MESES_MIN)).toEqual([]);
    expect(validarMetaMeses(META_MESES_MAX)).toEqual([]);
  });

  it('rechaza valores fuera del rango', () => {
    expect(validarMetaMeses(0).length).toBe(1);
    expect(validarMetaMeses(META_MESES_MAX + 1).length).toBe(1);
    expect(validarMetaMeses(-3).length).toBe(1);
  });

  it('rechaza decimales y NaN', () => {
    expect(validarMetaMeses(2.5).length).toBe(1);
    expect(validarMetaMeses('abc').length).toBe(1);
    expect(validarMetaMeses(NaN).length).toBe(1);
  });
});

// ── validarMontoActual ───────────────────────────────────────────

describe('validarMontoActual', () => {
  it('acepta 0 y positivos', () => {
    expect(validarMontoActual(0)).toEqual([]);
    expect(validarMontoActual('1500000')).toEqual([]);
  });

  it('rechaza negativos y no-numéricos', () => {
    expect(validarMontoActual(-100).length).toBe(1);
    expect(validarMontoActual('abc').length).toBe(1);
    expect(validarMontoActual(NaN).length).toBe(1);
  });
});

// ── normalizarMetaMeses ──────────────────────────────────────────

describe('normalizarMetaMeses', () => {
  it('clampa al rango permitido', () => {
    expect(normalizarMetaMeses(0)).toBe(META_MESES_MIN);
    expect(normalizarMetaMeses(99)).toBe(META_MESES_MAX);
  });

  it('redondea decimales', () => {
    expect(normalizarMetaMeses(3.7)).toBe(4);
  });

  it('cae al default ante valores no numéricos', () => {
    expect(normalizarMetaMeses('abc')).toBe(META_MESES_DEFAULT);
    expect(normalizarMetaMeses(NaN)).toBe(META_MESES_DEFAULT);
  });
});

// ── normalizarMontoActual ────────────────────────────────────────

describe('normalizarMontoActual', () => {
  it('redondea a entero', () => {
    expect(normalizarMontoActual(1_500_000.7)).toBe(1_500_001);
    expect(normalizarMontoActual('2000000')).toBe(2_000_000);
  });

  it('convierte negativos y no-numéricos a 0', () => {
    expect(normalizarMontoActual(-500)).toBe(0);
    expect(normalizarMontoActual('abc')).toBe(0);
    expect(normalizarMontoActual(NaN)).toBe(0);
  });
});
