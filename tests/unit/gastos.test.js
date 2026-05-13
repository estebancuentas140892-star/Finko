import { describe, it, expect } from 'vitest';
import {
  gastosMes,
  totalGastos,
  totalGastosMes,
  gastosPorCategoria,
  detectarHormigas,
  validarGasto,
  normalizarGasto,
} from '../../modules/dominio/gastos/logic.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const gastoBase = (overrides = {}) => ({
  id: 'g1',
  descripcion: 'Almuerzo',
  monto: 15_000,
  categoria: 'Alimentación',
  fecha: '2026-05-10',
  cuentaId: null,
  nota: '',
  ...overrides,
});

const datosFormValidos = {
  descripcion: 'Gasolina',
  monto: '80000',
  categoria: 'Transporte',
  fecha: '2026-05-12',
  nota: '',
};

// ── gastosMes() ──────────────────────────────────────────────────

describe('gastosMes()', () => {
  it('filtra solo los gastos del mes y año indicados', () => {
    const gastos = [
      gastoBase({ fecha: '2026-05-10' }),
      gastoBase({ id: 'g2', fecha: '2026-04-30' }),
      gastoBase({ id: 'g3', fecha: '2026-05-31' }),
    ];
    const resultado = gastosMes(gastos, 2026, 5);
    expect(resultado).toHaveLength(2);
    expect(resultado.map(g => g.id)).toEqual(['g1', 'g3']);
  });

  it('devuelve vacío si no hay gastos en ese mes', () => {
    const gastos = [gastoBase({ fecha: '2026-04-10' })];
    expect(gastosMes(gastos, 2026, 5)).toEqual([]);
  });

  it('maneja meses con padding de cero (mes 1 = enero)', () => {
    const gastos = [gastoBase({ fecha: '2026-01-15' })];
    expect(gastosMes(gastos, 2026, 1)).toHaveLength(1);
  });

  it('devuelve vacío con array de gastos vacío', () => {
    expect(gastosMes([], 2026, 5)).toEqual([]);
  });
});

// ── totalGastos() ────────────────────────────────────────────────

describe('totalGastos()', () => {
  it('suma los montos de todos los gastos', () => {
    const gastos = [
      gastoBase({ monto: 15_000 }),
      gastoBase({ id: 'g2', monto: 80_000 }),
    ];
    expect(totalGastos(gastos)).toBe(95_000);
  });

  it('devuelve 0 con array vacío', () => {
    expect(totalGastos([])).toBe(0);
  });

  it('trata monto undefined como 0', () => {
    const { monto: _, ...sinMonto } = gastoBase();
    expect(totalGastos([sinMonto])).toBe(0);
  });
});

// ── totalGastosMes() ─────────────────────────────────────────────

describe('totalGastosMes()', () => {
  it('combina el filtro por mes con la suma', () => {
    const gastos = [
      gastoBase({ monto: 15_000, fecha: '2026-05-10' }),
      gastoBase({ id: 'g2', monto: 80_000, fecha: '2026-05-15' }),
      gastoBase({ id: 'g3', monto: 999_999, fecha: '2026-04-01' }),
    ];
    expect(totalGastosMes(gastos, 2026, 5)).toBe(95_000);
  });

  it('devuelve 0 si no hay gastos en el mes', () => {
    expect(totalGastosMes([gastoBase()], 2025, 5)).toBe(0);
  });
});

// ── gastosPorCategoria() ─────────────────────────────────────────

describe('gastosPorCategoria()', () => {
  it('agrupa y suma por categoría correctamente', () => {
    const gastos = [
      gastoBase({ monto: 15_000, categoria: 'Alimentación' }),
      gastoBase({ id: 'g2', monto: 10_000, categoria: 'Alimentación' }),
      gastoBase({ id: 'g3', monto: 80_000, categoria: 'Transporte' }),
    ];
    const result = gastosPorCategoria(gastos);
    expect(result['Alimentación']).toBe(25_000);
    expect(result['Transporte']).toBe(80_000);
  });

  it('usa "Otros" si la categoría es undefined', () => {
    const { categoria: _, ...sinCat } = gastoBase({ monto: 5_000 });
    const result = gastosPorCategoria([sinCat]);
    expect(result['Otros']).toBe(5_000);
  });

  it('devuelve objeto vacío con array vacío', () => {
    expect(gastosPorCategoria([])).toEqual({});
  });
});

// ── detectarHormigas() ───────────────────────────────────────────

describe('detectarHormigas()', () => {
  it('detecta categorías con muchos gastos pequeños que suman bastante', () => {
    const gastos = Array.from({ length: 8 }, (_, i) =>
      gastoBase({ id: `g${i}`, monto: 15_000, categoria: 'Alimentación' })
    );
    const hormigas = detectarHormigas(gastos, 20_000, 100_000);
    expect(hormigas).toHaveLength(1);
    expect(hormigas[0].categoria).toBe('Alimentación');
    expect(hormigas[0].total).toBe(120_000);
    expect(hormigas[0].cantidad).toBe(8);
  });

  it('no incluye categorías que no superan el umbral total', () => {
    const gastos = [
      gastoBase({ monto: 15_000, categoria: 'Alimentación' }),
      gastoBase({ id: 'g2', monto: 15_000, categoria: 'Alimentación' }),
    ];
    const hormigas = detectarHormigas(gastos, 20_000, 100_000);
    expect(hormigas).toHaveLength(0);
  });

  it('excluye transacciones que superan el umbral de monto individual', () => {
    const gastos = [
      gastoBase({ monto: 50_000, categoria: 'Alimentación' }),
      gastoBase({ id: 'g2', monto: 50_000, categoria: 'Alimentación' }),
      gastoBase({ id: 'g3', monto: 50_000, categoria: 'Alimentación' }),
    ];
    const hormigas = detectarHormigas(gastos, 20_000, 100_000);
    expect(hormigas).toHaveLength(0);
  });

  it('ordena por total descendente', () => {
    const gastosAlim = Array.from({ length: 7 }, (_, i) =>
      gastoBase({ id: `a${i}`, monto: 18_000, categoria: 'Alimentación' })
    );
    const gastosTransp = Array.from({ length: 10 }, (_, i) =>
      gastoBase({ id: `t${i}`, monto: 12_000, categoria: 'Transporte' })
    );
    const hormigas = detectarHormigas([...gastosAlim, ...gastosTransp], 20_000, 100_000);
    expect(hormigas[0].total).toBeGreaterThanOrEqual(hormigas[1].total);
  });

  it('calcula el promedio correctamente', () => {
    const gastos = Array.from({ length: 7 }, (_, i) =>
      gastoBase({ id: `g${i}`, monto: 16_000, categoria: 'Entretenimiento' })
    );
    const hormigas = detectarHormigas(gastos, 20_000, 100_000);
    expect(hormigas).toHaveLength(1);
    expect(hormigas[0].promedio).toBe(16_000);
  });

  it('devuelve array vacío con gastos vacíos', () => {
    expect(detectarHormigas([], 20_000, 100_000)).toEqual([]);
  });
});

// ── validarGasto() ────────────────────────────────────────────────

describe('validarGasto()', () => {
  it('retorna array vacío con datos válidos', () => {
    expect(validarGasto(datosFormValidos)).toEqual([]);
  });

  it('reporta error si descripción está vacía', () => {
    const errores = validarGasto({ ...datosFormValidos, descripcion: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/descripci/i);
  });

  it('reporta error si monto es 0', () => {
    const errores = validarGasto({ ...datosFormValidos, monto: '0' });
    expect(errores).toHaveLength(1);
  });

  it('reporta error si monto no es número', () => {
    const errores = validarGasto({ ...datosFormValidos, monto: 'texto' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/monto/i);
  });

  it('reporta error si categoría está vacía', () => {
    const errores = validarGasto({ ...datosFormValidos, categoria: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/categor/i);
  });

  it('reporta error si fecha está vacía', () => {
    const errores = validarGasto({ ...datosFormValidos, fecha: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/fecha/i);
  });

  it('puede tener múltiples errores a la vez', () => {
    const errores = validarGasto({ descripcion: '', monto: '0', categoria: '', fecha: '' });
    expect(errores.length).toBeGreaterThanOrEqual(3);
  });
});

// ── normalizarGasto() ─────────────────────────────────────────────

describe('normalizarGasto()', () => {
  it('convierte monto string a número', () => {
    const result = normalizarGasto(datosFormValidos);
    expect(typeof result.monto).toBe('number');
    expect(result.monto).toBe(80_000);
  });

  it('recorta espacios de la descripción', () => {
    const result = normalizarGasto({ ...datosFormValidos, descripcion: '  Gasolina  ' });
    expect(result.descripcion).toBe('Gasolina');
  });

  it('preserva la categoría exacta', () => {
    expect(normalizarGasto(datosFormValidos).categoria).toBe('Transporte');
  });

  it('preserva la fecha exacta', () => {
    expect(normalizarGasto(datosFormValidos).fecha).toBe('2026-05-12');
  });

  it('nota vacía queda como string vacío', () => {
    const result = normalizarGasto({ ...datosFormValidos, nota: '' });
    expect(result.nota).toBe('');
  });

  it('recorta espacios de la nota', () => {
    const result = normalizarGasto({ ...datosFormValidos, nota: '  con descuento  ' });
    expect(result.nota).toBe('con descuento');
  });

  it('cuentaId null si no viene', () => {
    const result = normalizarGasto(datosFormValidos);
    expect(result.cuentaId).toBeNull();
  });

  it('no incluye id (lo asigna crud.js)', () => {
    expect(normalizarGasto(datosFormValidos)).not.toHaveProperty('id');
  });
});
