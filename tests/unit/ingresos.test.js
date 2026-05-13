import { describe, it, expect } from 'vitest';
import {
  ingresosActivos,
  calcularIngresoMensual,
  calcularTotalMensual,
  validarIngreso,
  normalizarIngreso,
} from '../../modules/dominio/ingresos/logic.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const ingresoBase = (overrides = {}) => ({
  id: 'i1',
  descripcion: 'Salario mensual',
  monto: 2_000_000,
  frecuencia: 'Mensual',
  activo: true,
  ...overrides,
});

const datosFormValidos = {
  descripcion: 'Salario quincenal',
  monto: '1000000',
  frecuencia: 'Quincenal',
};

// ── ingresosActivos() ─────────────────────────────────────────────

describe('ingresosActivos()', () => {
  it('devuelve todos cuando todos están activos', () => {
    const ingresos = [ingresoBase(), ingresoBase({ id: 'i2', descripcion: 'Freelance' })];
    expect(ingresosActivos(ingresos)).toHaveLength(2);
  });

  it('excluye ingresos con activo === false', () => {
    const ingresos = [ingresoBase(), ingresoBase({ id: 'i2', activo: false })];
    expect(ingresosActivos(ingresos)).toHaveLength(1);
    expect(ingresosActivos(ingresos)[0].id).toBe('i1');
  });

  it('incluye ingresos sin campo activo (undefined ≠ false)', () => {
    const { activo: _, ...sinActivo } = ingresoBase();
    expect(ingresosActivos([sinActivo])).toHaveLength(1);
  });

  it('devuelve array vacío si no hay ingresos', () => {
    expect(ingresosActivos([])).toEqual([]);
  });
});

// ── calcularIngresoMensual() ──────────────────────────────────────

describe('calcularIngresoMensual()', () => {
  it('mensual × 1 = monto original', () => {
    expect(calcularIngresoMensual(ingresoBase({ monto: 2_000_000, frecuencia: 'Mensual' }))).toBe(2_000_000);
  });

  it('quincenal × 2 = doble del monto', () => {
    expect(calcularIngresoMensual(ingresoBase({ monto: 1_000_000, frecuencia: 'Quincenal' }))).toBe(2_000_000);
  });

  it('semanal × 4.33', () => {
    expect(calcularIngresoMensual(ingresoBase({ monto: 100_000, frecuencia: 'Semanal' }))).toBeCloseTo(433_000);
  });

  it('diario × 30', () => {
    expect(calcularIngresoMensual(ingresoBase({ monto: 50_000, frecuencia: 'Diario' }))).toBe(1_500_000);
  });

  it('única vez devuelve 0 (no aporta a proyección mensual)', () => {
    expect(calcularIngresoMensual(ingresoBase({ monto: 5_000_000, frecuencia: 'Única vez' }))).toBe(0);
  });

  it('anual / 12', () => {
    expect(calcularIngresoMensual(ingresoBase({ monto: 12_000_000, frecuencia: 'Anual' }))).toBe(1_000_000);
  });

  it('trimestral × 1/3', () => {
    expect(calcularIngresoMensual(ingresoBase({ monto: 3_000_000, frecuencia: 'Trimestral' }))).toBeCloseTo(1_000_000);
  });

  it('frecuencia desconocida devuelve 0', () => {
    expect(calcularIngresoMensual(ingresoBase({ frecuencia: 'Raro' }))).toBe(0);
  });

  it('monto undefined se trata como 0', () => {
    const { monto: _, ...sinMonto } = ingresoBase();
    expect(calcularIngresoMensual(sinMonto)).toBe(0);
  });
});

// ── calcularTotalMensual() ────────────────────────────────────────

describe('calcularTotalMensual()', () => {
  it('suma la proyección mensual de todos los ingresos activos', () => {
    const ingresos = [
      ingresoBase({ monto: 2_000_000, frecuencia: 'Mensual' }),
      ingresoBase({ id: 'i2', monto: 500_000, frecuencia: 'Quincenal' }),
    ];
    expect(calcularTotalMensual(ingresos)).toBe(3_000_000);
  });

  it('ignora ingresos inactivos', () => {
    const ingresos = [
      ingresoBase({ monto: 2_000_000, frecuencia: 'Mensual' }),
      ingresoBase({ id: 'i2', monto: 5_000_000, frecuencia: 'Mensual', activo: false }),
    ];
    expect(calcularTotalMensual(ingresos)).toBe(2_000_000);
  });

  it('devuelve 0 con array vacío', () => {
    expect(calcularTotalMensual([])).toBe(0);
  });

  it('devuelve 0 si todos están inactivos', () => {
    const ingresos = [ingresoBase({ activo: false })];
    expect(calcularTotalMensual(ingresos)).toBe(0);
  });
});

// ── validarIngreso() ──────────────────────────────────────────────

describe('validarIngreso()', () => {
  it('retorna array vacío con datos válidos', () => {
    expect(validarIngreso(datosFormValidos)).toEqual([]);
  });

  it('reporta error si descripción está vacía', () => {
    const errores = validarIngreso({ ...datosFormValidos, descripcion: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/descripci/i);
  });

  it('reporta error si descripción es solo espacios', () => {
    const errores = validarIngreso({ ...datosFormValidos, descripcion: '   ' });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('reporta error si monto no es número', () => {
    const errores = validarIngreso({ ...datosFormValidos, monto: 'abc' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/monto/i);
  });

  it('reporta error si monto es 0', () => {
    const errores = validarIngreso({ ...datosFormValidos, monto: '0' });
    expect(errores).toHaveLength(1);
  });

  it('reporta error si monto es negativo', () => {
    const errores = validarIngreso({ ...datosFormValidos, monto: '-500' });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('reporta error si frecuencia no está en la lista', () => {
    const errores = validarIngreso({ ...datosFormValidos, frecuencia: 'Rarísimo' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/frecuencia/i);
  });

  it('reporta error si frecuencia está vacía', () => {
    const errores = validarIngreso({ ...datosFormValidos, frecuencia: '' });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('puede tener múltiples errores a la vez', () => {
    const errores = validarIngreso({ descripcion: '', monto: '0', frecuencia: '' });
    expect(errores.length).toBeGreaterThanOrEqual(2);
  });
});

// ── normalizarIngreso() ───────────────────────────────────────────

describe('normalizarIngreso()', () => {
  it('convierte monto string a número', () => {
    const result = normalizarIngreso(datosFormValidos);
    expect(typeof result.monto).toBe('number');
    expect(result.monto).toBe(1_000_000);
  });

  it('recorta espacios de la descripción', () => {
    const result = normalizarIngreso({ ...datosFormValidos, descripcion: '  Salario  ' });
    expect(result.descripcion).toBe('Salario');
  });

  it('marca activo en true', () => {
    expect(normalizarIngreso(datosFormValidos).activo).toBe(true);
  });

  it('preserva la frecuencia exacta', () => {
    expect(normalizarIngreso(datosFormValidos).frecuencia).toBe('Quincenal');
  });

  it('no incluye id (lo asigna crud.js)', () => {
    expect(normalizarIngreso(datosFormValidos)).not.toHaveProperty('id');
  });
});
