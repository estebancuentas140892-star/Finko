import { describe, it, expect } from 'vitest';
import {
  metasActivas,
  calcularProgreso,
  calcularAhorroDiario,
  diasHastaFecha,
  validarMeta,
  validarAbono,
  normalizarMeta,
} from '../../modules/dominio/metas/logic.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const metaBase = (overrides = {}) => ({
  id: 'm1',
  nombre: 'Fondo de emergencia',
  montoObjetivo: 5_000_000,
  montoActual:   1_000_000,
  fechaLimite:   null,
  icono:         '🛡️',
  completada:    false,
  ...overrides,
});

const datosFormValidos = {
  nombre:        'Viaje a Cartagena',
  montoObjetivo: '2000000',
  fechaLimite:   '',
  icono:         '✈️',
};

// ── metasActivas() ────────────────────────────────────────────────

describe('metasActivas()', () => {
  it('devuelve todas cuando ninguna está completada', () => {
    const metas = [metaBase(), metaBase({ id: 'm2', nombre: 'Vacaciones' })];
    expect(metasActivas(metas)).toHaveLength(2);
  });

  it('excluye metas con completada === true', () => {
    const metas = [metaBase(), metaBase({ id: 'm2', completada: true })];
    expect(metasActivas(metas)).toHaveLength(1);
    expect(metasActivas(metas)[0].id).toBe('m1');
  });

  it('incluye metas sin campo completada (undefined ≠ true)', () => {
    const { completada: _, ...sinCompletada } = metaBase();
    expect(metasActivas([sinCompletada])).toHaveLength(1);
  });

  it('devuelve array vacío si no hay metas', () => {
    expect(metasActivas([])).toEqual([]);
  });
});

// ── calcularProgreso() ────────────────────────────────────────────

describe('calcularProgreso()', () => {
  it('calcula porcentaje correctamente (20%)', () => {
    const meta = metaBase({ montoActual: 1_000_000, montoObjetivo: 5_000_000 });
    expect(calcularProgreso(meta).porcentaje).toBe(20);
  });

  it('devuelve completada: true cuando alcanza el 100%', () => {
    const meta = metaBase({ montoActual: 5_000_000, montoObjetivo: 5_000_000 });
    const { completada, porcentaje, faltante } = calcularProgreso(meta);
    expect(completada).toBe(true);
    expect(porcentaje).toBe(100);
    expect(faltante).toBe(0);
  });

  it('no supera 100% aunque montoActual > montoObjetivo', () => {
    const meta = metaBase({ montoActual: 6_000_000, montoObjetivo: 5_000_000 });
    expect(calcularProgreso(meta).porcentaje).toBe(100);
    expect(calcularProgreso(meta).faltante).toBe(0);
  });

  it('faltante es objetivo − actual cuando incompleto', () => {
    const meta = metaBase({ montoActual: 2_000_000, montoObjetivo: 5_000_000 });
    expect(calcularProgreso(meta).faltante).toBe(3_000_000);
  });

  it('devuelve 0 porcentaje y 0 faltante cuando montoObjetivo es 0', () => {
    const meta = metaBase({ montoObjetivo: 0 });
    const result = calcularProgreso(meta);
    expect(result.porcentaje).toBe(0);
    expect(result.faltante).toBe(0);
    expect(result.completada).toBe(false);
  });

  it('trata montoActual undefined como 0', () => {
    const { montoActual: _, ...sinActual } = metaBase();
    expect(calcularProgreso(sinActual).porcentaje).toBe(0);
  });

  it('redondea al entero más cercano', () => {
    const meta = metaBase({ montoActual: 1_000_000, montoObjetivo: 3_000_000 });
    expect(calcularProgreso(meta).porcentaje).toBe(33);
  });
});

// ── diasHastaFecha() ──────────────────────────────────────────────

describe('diasHastaFecha()', () => {
  it('devuelve null si fechaLimite es null', () => {
    expect(diasHastaFecha(null)).toBeNull();
  });

  it('devuelve null si fechaLimite es undefined', () => {
    expect(diasHastaFecha(undefined)).toBeNull();
  });

  it('devuelve null si fechaLimite es string vacío', () => {
    expect(diasHastaFecha('')).toBeNull();
  });

  it('devuelve un número positivo para fechas futuras', () => {
    const futura = new Date();
    futura.setDate(futura.getDate() + 30);
    const iso = futura.toISOString().slice(0, 10);
    const dias = diasHastaFecha(iso);
    expect(dias).toBeGreaterThan(0);
    expect(dias).toBeLessThanOrEqual(31);
  });

  it('devuelve un número ≤ 0 para fechas pasadas', () => {
    expect(diasHastaFecha('2020-01-01')).toBeLessThanOrEqual(0);
  });
});

// ── calcularAhorroDiario() ────────────────────────────────────────

describe('calcularAhorroDiario()', () => {
  it('devuelve 0 si la meta ya está completa', () => {
    const meta = metaBase({ montoActual: 5_000_000, montoObjetivo: 5_000_000 });
    expect(calcularAhorroDiario(meta)).toBe(0);
  });

  it('devuelve null si no hay fechaLimite', () => {
    const meta = metaBase({ fechaLimite: null });
    expect(calcularAhorroDiario(meta)).toBeNull();
  });

  it('devuelve null si la fecha ya venció', () => {
    const meta = metaBase({ fechaLimite: '2020-01-01' });
    expect(calcularAhorroDiario(meta)).toBeNull();
  });

  it('devuelve número positivo con fecha futura', () => {
    const futura = new Date();
    futura.setDate(futura.getDate() + 100);
    const iso = futura.toISOString().slice(0, 10);
    const meta = metaBase({
      montoActual: 0,
      montoObjetivo: 1_000_000,
      fechaLimite: iso,
    });
    const diario = calcularAhorroDiario(meta);
    expect(diario).toBeGreaterThan(0);
    expect(diario).toBeLessThanOrEqual(10_500); // ~1_000_000 / 100 + rounding
  });
});

// ── validarMeta() ─────────────────────────────────────────────────

describe('validarMeta()', () => {
  it('retorna array vacío con datos válidos', () => {
    expect(validarMeta(datosFormValidos)).toEqual([]);
  });

  it('reporta error si nombre está vacío', () => {
    const errores = validarMeta({ ...datosFormValidos, nombre: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/nombre/i);
  });

  it('reporta error si nombre es solo espacios', () => {
    const errores = validarMeta({ ...datosFormValidos, nombre: '   ' });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('reporta error si montoObjetivo es 0', () => {
    const errores = validarMeta({ ...datosFormValidos, montoObjetivo: '0' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/monto/i);
  });

  it('reporta error si montoObjetivo es negativo', () => {
    const errores = validarMeta({ ...datosFormValidos, montoObjetivo: '-500' });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('reporta error si montoObjetivo no es número', () => {
    const errores = validarMeta({ ...datosFormValidos, montoObjetivo: 'mucho' });
    expect(errores).toHaveLength(1);
  });

  it('acepta fechaLimite vacío (campo opcional)', () => {
    expect(validarMeta({ ...datosFormValidos, fechaLimite: '' })).toEqual([]);
  });

  it('puede tener múltiples errores a la vez', () => {
    const errores = validarMeta({ nombre: '', montoObjetivo: '0' });
    expect(errores.length).toBeGreaterThanOrEqual(2);
  });
});

// ── validarAbono() ────────────────────────────────────────────────

describe('validarAbono()', () => {
  it('retorna array vacío con monto válido', () => {
    expect(validarAbono('100000')).toEqual([]);
  });

  it('reporta error si el monto es 0', () => {
    expect(validarAbono('0').length).toBeGreaterThan(0);
  });

  it('reporta error si el monto es negativo', () => {
    expect(validarAbono('-1000').length).toBeGreaterThan(0);
  });

  it('reporta error si el monto no es número', () => {
    expect(validarAbono('nada').length).toBeGreaterThan(0);
  });
});

// ── normalizarMeta() ──────────────────────────────────────────────

describe('normalizarMeta()', () => {
  it('convierte montoObjetivo string a número', () => {
    const result = normalizarMeta(datosFormValidos);
    expect(typeof result.montoObjetivo).toBe('number');
    expect(result.montoObjetivo).toBe(2_000_000);
  });

  it('inicia montoActual en 0', () => {
    expect(normalizarMeta(datosFormValidos).montoActual).toBe(0);
  });

  it('recorta espacios del nombre', () => {
    const result = normalizarMeta({ ...datosFormValidos, nombre: '  Viaje  ' });
    expect(result.nombre).toBe('Viaje');
  });

  it('marca completada en false', () => {
    expect(normalizarMeta(datosFormValidos).completada).toBe(false);
  });

  it('usa 🎯 como icono por defecto si no viene', () => {
    const result = normalizarMeta({ ...datosFormValidos, icono: '' });
    expect(result.icono).toBe('🎯');
  });

  it('preserva el icono si se proporciona', () => {
    expect(normalizarMeta(datosFormValidos).icono).toBe('✈️');
  });

  it('fechaLimite vacía queda como null', () => {
    const result = normalizarMeta({ ...datosFormValidos, fechaLimite: '' });
    expect(result.fechaLimite).toBeNull();
  });

  it('fechaLimite con fecha queda como string', () => {
    const result = normalizarMeta({ ...datosFormValidos, fechaLimite: '2026-12-31' });
    expect(result.fechaLimite).toBe('2026-12-31');
  });

  it('no incluye id (lo asigna crud.js)', () => {
    expect(normalizarMeta(datosFormValidos)).not.toHaveProperty('id');
  });
});
