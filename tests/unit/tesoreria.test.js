import { describe, it, expect } from 'vitest';
import {
  cuentasActivas,
  calcularTotalCuentas,
  validarCuenta,
  normalizarCuenta,
} from '../../modules/dominio/tesoreria/logic.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const cuentaBase = (overrides = {}) => ({
  id: 'c1',
  nombre: 'Nequi principal',
  banco: 'Nequi',
  tipo: 'Ahorros',
  saldo: 500_000,
  icono: '💚',
  activa: true,
  fechaCreacion: '2026-05-12T00:00:00Z',
  ...overrides,
});

const datosFormValidos = {
  nombre: 'Cuenta corriente',
  banco: 'Bancolombia',
  tipo: 'Corriente',
  saldo: '1500000',
};

// ── cuentasActivas() ─────────────────────────────────────────────

describe('cuentasActivas()', () => {
  it('devuelve todas las cuentas cuando todas están activas', () => {
    const cuentas = [cuentaBase(), cuentaBase({ id: 'c2', nombre: 'BBVA' })];
    expect(cuentasActivas(cuentas)).toHaveLength(2);
  });

  it('excluye cuentas con activa === false', () => {
    const cuentas = [cuentaBase(), cuentaBase({ id: 'c2', activa: false })];
    expect(cuentasActivas(cuentas)).toHaveLength(1);
    expect(cuentasActivas(cuentas)[0].id).toBe('c1');
  });

  it('incluye cuentas sin campo activa (undefined ≠ false)', () => {
    const { activa: _, ...sinActiva } = cuentaBase();
    expect(cuentasActivas([sinActiva])).toHaveLength(1);
  });

  it('devuelve array vacío si no hay cuentas', () => {
    expect(cuentasActivas([])).toEqual([]);
  });
});

// ── calcularTotalCuentas() ───────────────────────────────────────

describe('calcularTotalCuentas()', () => {
  it('suma los saldos de todas las cuentas activas', () => {
    const cuentas = [
      cuentaBase({ saldo: 500_000 }),
      cuentaBase({ id: 'c2', saldo: 1_000_000 }),
    ];
    expect(calcularTotalCuentas(cuentas)).toBe(1_500_000);
  });

  it('ignora cuentas inactivas en el cálculo', () => {
    const cuentas = [
      cuentaBase({ saldo: 500_000 }),
      cuentaBase({ id: 'c2', saldo: 999_999, activa: false }),
    ];
    expect(calcularTotalCuentas(cuentas)).toBe(500_000);
  });

  it('devuelve 0 con array vacío', () => {
    expect(calcularTotalCuentas([])).toBe(0);
  });

  it('devuelve 0 si todas las cuentas están inactivas', () => {
    const cuentas = [cuentaBase({ activa: false })];
    expect(calcularTotalCuentas(cuentas)).toBe(0);
  });

  it('trata saldo undefined como 0', () => {
    const { saldo: _, ...sinSaldo } = cuentaBase();
    expect(calcularTotalCuentas([sinSaldo])).toBe(0);
  });
});

// ── validarCuenta() ──────────────────────────────────────────────

describe('validarCuenta()', () => {
  it('retorna array vacío cuando los datos son válidos', () => {
    expect(validarCuenta(datosFormValidos)).toEqual([]);
  });

  it('reporta error si nombre está vacío', () => {
    const errores = validarCuenta({ ...datosFormValidos, nombre: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/nombre/i);
  });

  it('reporta error si nombre es solo espacios', () => {
    const errores = validarCuenta({ ...datosFormValidos, nombre: '   ' });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('reporta error si banco no se seleccionó', () => {
    const errores = validarCuenta({ ...datosFormValidos, banco: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/banco/i);
  });

  it('reporta error si tipo no se seleccionó', () => {
    const errores = validarCuenta({ ...datosFormValidos, tipo: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/tipo/i);
  });

  it('reporta error si saldo no es número', () => {
    const errores = validarCuenta({ ...datosFormValidos, saldo: 'abc' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/saldo/i);
  });

  it('reporta error si saldo es negativo', () => {
    const errores = validarCuenta({ ...datosFormValidos, saldo: '-100' });
    expect(errores).toHaveLength(1);
  });

  it('acepta saldo 0 como válido', () => {
    expect(validarCuenta({ ...datosFormValidos, saldo: '0' })).toEqual([]);
  });

  it('puede tener múltiples errores a la vez', () => {
    const errores = validarCuenta({ nombre: '', banco: '', tipo: '', saldo: 'x' });
    expect(errores.length).toBeGreaterThanOrEqual(3);
  });
});

// ── normalizarCuenta() ───────────────────────────────────────────

describe('normalizarCuenta()', () => {
  it('convierte el saldo string a número', () => {
    const result = normalizarCuenta(datosFormValidos);
    expect(typeof result.saldo).toBe('number');
    expect(result.saldo).toBe(1_500_000);
  });

  it('recorta espacios del nombre', () => {
    const result = normalizarCuenta({ ...datosFormValidos, nombre: '  Mi cuenta  ' });
    expect(result.nombre).toBe('Mi cuenta');
  });

  it('marca activa en true', () => {
    expect(normalizarCuenta(datosFormValidos).activa).toBe(true);
  });

  it('asigna emoji según banco si no viene icono', () => {
    const result = normalizarCuenta({ ...datosFormValidos, banco: 'Nequi' });
    expect(result.icono).toBe('💚');
  });

  it('usa emoji genérico para banco no mapeado', () => {
    const result = normalizarCuenta({ ...datosFormValidos, banco: 'Bancolombia' });
    expect(result.icono).toBe('🏦');
  });

  it('no incluye id ni fechaCreacion (los asigna crud.js)', () => {
    const result = normalizarCuenta(datosFormValidos);
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('fechaCreacion');
  });
});
