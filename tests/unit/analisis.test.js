import { describe, it, expect } from 'vitest';
import {
  calcularBalance,
  calcularTasaAhorro,
  nivelSalud,
  generarResumen,
} from '../../modules/dominio/analisis/logic.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const ingreso = (overrides = {}) => ({
  id: 'i1', descripcion: 'Salario', monto: 3_000_000,
  frecuencia: 'Mensual', activo: true, ...overrides,
});

const gasto = (overrides = {}) => ({
  id: 'g1', descripcion: 'Mercado', monto: 200_000,
  categoria: 'Alimentación', fecha: '2026-05-10', ...overrides,
});

const compromiso = (overrides = {}) => ({
  id: 'c1', descripcion: 'Arriendo', monto: 1_000_000,
  frecuencia: 'Mensual', diaPago: 5, tipo: 'fijo', activo: true, ...overrides,
});

const cuenta = (overrides = {}) => ({
  id: 'cu1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros',
  saldo: 500_000, activa: true, ...overrides,
});

// ── calcularBalance() ─────────────────────────────────────────────

describe('calcularBalance()', () => {
  it('superávit: ingresos > gastos + compromisos', () => {
    expect(calcularBalance(3_000_000, 500_000, 1_000_000)).toBe(1_500_000);
  });

  it('equilibrio: balance exactamente 0', () => {
    expect(calcularBalance(2_000_000, 1_000_000, 1_000_000)).toBe(0);
  });

  it('déficit: gastos + compromisos > ingresos', () => {
    expect(calcularBalance(1_000_000, 800_000, 500_000)).toBe(-300_000);
  });

  it('sin ingresos devuelve negativo', () => {
    expect(calcularBalance(0, 200_000, 100_000)).toBe(-300_000);
  });

  it('sin gastos ni compromisos devuelve el ingreso completo', () => {
    expect(calcularBalance(2_000_000, 0, 0)).toBe(2_000_000);
  });
});

// ── calcularTasaAhorro() ──────────────────────────────────────────

describe('calcularTasaAhorro()', () => {
  it('ahorra el 50% cuando egresa la mitad', () => {
    expect(calcularTasaAhorro(2_000_000, 1_000_000)).toBe(50);
  });

  it('ahorra el 20% — regla 50/30/20', () => {
    expect(calcularTasaAhorro(2_000_000, 1_600_000)).toBe(20);
  });

  it('tasa 0% si egresa todo', () => {
    expect(calcularTasaAhorro(1_000_000, 1_000_000)).toBe(0);
  });

  it('tasa negativa si egresa más de lo que ingresa', () => {
    expect(calcularTasaAhorro(1_000_000, 1_200_000)).toBe(-20);
  });

  it('devuelve 0 si no hay ingresos', () => {
    expect(calcularTasaAhorro(0, 500_000)).toBe(0);
  });

  it('redondea al entero más cercano', () => {
    // 1/3 ≈ 33.33% → 33
    expect(calcularTasaAhorro(3_000_000, 2_000_000)).toBe(33);
  });
});

// ── nivelSalud() ──────────────────────────────────────────────────

describe('nivelSalud()', () => {
  it('excelente cuando tasa ≥ 20%', () => {
    expect(nivelSalud(20)).toBe('excelente');
    expect(nivelSalud(50)).toBe('excelente');
  });

  it('buena cuando tasa 10–19%', () => {
    expect(nivelSalud(10)).toBe('buena');
    expect(nivelSalud(19)).toBe('buena');
  });

  it('ajustada cuando tasa 0–9%', () => {
    expect(nivelSalud(0)).toBe('ajustada');
    expect(nivelSalud(9)).toBe('ajustada');
  });

  it('critica cuando tasa negativa', () => {
    expect(nivelSalud(-1)).toBe('critica');
    expect(nivelSalud(-50)).toBe('critica');
  });
});

// ── generarResumen() ──────────────────────────────────────────────

describe('generarResumen()', () => {
  const MES  = 5;
  const ANIO = 2026;

  it('agrega ingresoMensual correctamente', () => {
    const resumen = generarResumen([ingreso()], [], [], [], ANIO, MES);
    expect(resumen.ingresoMensual).toBe(3_000_000);
  });

  it('agrega gastoMes solo del mes indicado', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 200_000, fecha: '2026-05-10' }),
      gasto({ id: 'g2', monto: 999_999, fecha: '2026-04-01' }), // otro mes
    ];
    const resumen = generarResumen([], gastos, [], [], ANIO, MES);
    expect(resumen.gastoMes).toBe(200_000);
  });

  it('agrega compromisoMensual correctamente', () => {
    const resumen = generarResumen([], [], [compromiso()], [], ANIO, MES);
    expect(resumen.compromisoMensual).toBe(1_000_000);
  });

  it('agrega saldoCuentas solo de cuentas activas', () => {
    const cuentas = [
      cuenta({ saldo: 500_000 }),
      cuenta({ id: 'cu2', saldo: 300_000, activa: false }),
    ];
    const resumen = generarResumen([], [], [], cuentas, ANIO, MES);
    expect(resumen.saldoCuentas).toBe(500_000);
  });

  it('calcula balance correctamente', () => {
    const gastos = [gasto({ monto: 500_000, fecha: '2026-05-10' })];
    const resumen = generarResumen([ingreso()], gastos, [compromiso()], [], ANIO, MES);
    // 3_000_000 - 500_000 - 1_000_000 = 1_500_000
    expect(resumen.balance).toBe(1_500_000);
  });

  it('calcula egresos = gastoMes + compromisoMensual', () => {
    const gastos = [gasto({ monto: 500_000, fecha: '2026-05-10' })];
    const resumen = generarResumen([ingreso()], gastos, [compromiso()], [], ANIO, MES);
    expect(resumen.egresos).toBe(1_500_000);
  });

  it('calcula tasaAhorro correctamente', () => {
    // Ingreso 3M, egresos 1.5M → 50%
    const gastos = [gasto({ monto: 500_000, fecha: '2026-05-10' })];
    const resumen = generarResumen([ingreso()], gastos, [compromiso()], [], ANIO, MES);
    expect(resumen.tasaAhorro).toBe(50);
  });

  it('asigna nivel de salud correcto', () => {
    const gastos = [gasto({ monto: 500_000, fecha: '2026-05-10' })];
    const resumen = generarResumen([ingreso()], gastos, [compromiso()], [], ANIO, MES);
    expect(resumen.salud).toBe('excelente'); // tasa 50%
  });

  it('construye porCategoria con gastos del mes', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 200_000, categoria: 'Alimentación', fecha: '2026-05-10' }),
      gasto({ id: 'g2', monto: 80_000,  categoria: 'Transporte',   fecha: '2026-05-15' }),
    ];
    const resumen = generarResumen([], gastos, [], [], ANIO, MES);
    expect(resumen.porCategoria['Alimentación']).toBe(200_000);
    expect(resumen.porCategoria['Transporte']).toBe(80_000);
  });

  it('hormigas vacíos cuando no hay gastos pequeños significativos', () => {
    const gastos = [gasto({ monto: 500_000, fecha: '2026-05-10' })];
    const resumen = generarResumen([], gastos, [], [], ANIO, MES);
    expect(resumen.hormigas).toEqual([]);
  });

  it('detecta hormigas cuando hay muchos gastos pequeños', () => {
    const gastos = Array.from({ length: 8 }, (_, i) =>
      gasto({ id: `g${i}`, monto: 15_000, fecha: '2026-05-10' })
    );
    const resumen = generarResumen([], gastos, [], [], ANIO, MES);
    expect(resumen.hormigas.length).toBeGreaterThan(0);
    expect(resumen.hormigas[0].categoria).toBe('Alimentación');
  });

  it('devuelve objeto con todas las claves esperadas', () => {
    const resumen = generarResumen([], [], [], [], ANIO, MES);
    const claves = ['ingresoMensual', 'gastoMes', 'compromisoMensual', 'saldoCuentas',
                    'egresos', 'balance', 'tasaAhorro', 'salud', 'porCategoria', 'hormigas'];
    for (const clave of claves) {
      expect(resumen).toHaveProperty(clave);
    }
  });

  it('todos en 0 con estado vacío', () => {
    const resumen = generarResumen([], [], [], [], ANIO, MES);
    expect(resumen.ingresoMensual).toBe(0);
    expect(resumen.gastoMes).toBe(0);
    expect(resumen.balance).toBe(0);
    expect(resumen.saldoCuentas).toBe(0);
    expect(resumen.hormigas).toEqual([]);
  });
});
