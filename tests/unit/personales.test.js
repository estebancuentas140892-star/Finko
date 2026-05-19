import { describe, it, expect } from 'vitest';
import {
  calcularPendiente,
  calcularDias,
  clasificarAntiguedad,
  porcentajePagado,
  calcularResumen,
  ordenarPersonales,
  validarPersonal,
  normalizarPersonal,
  aplicarPago,
} from '../../modules/dominio/personales/logic.js';

// ── calcularPendiente() ───────────────────────────────────────────

describe('calcularPendiente()', () => {
  it('retorna monto cuando pagado es 0', () => {
    expect(calcularPendiente({ monto: 100_000, pagado: 0 })).toBe(100_000);
  });

  it('retorna la diferencia cuando pagado < monto', () => {
    expect(calcularPendiente({ monto: 100_000, pagado: 40_000 })).toBe(60_000);
  });

  it('retorna 0 cuando pagado >= monto', () => {
    expect(calcularPendiente({ monto: 100_000, pagado: 100_000 })).toBe(0);
    expect(calcularPendiente({ monto: 100_000, pagado: 200_000 })).toBe(0);
  });

  it('tolera prestamo null o sin campos', () => {
    expect(calcularPendiente(null)).toBe(0);
    expect(calcularPendiente({})).toBe(0);
    expect(calcularPendiente({ monto: 50_000 })).toBe(50_000);
  });
});

// ── calcularDias() ────────────────────────────────────────────────

describe('calcularDias()', () => {
  it('retorna 0 si no hay fecha ni fechaLimite', () => {
    expect(calcularDias({})).toBe(0);
    expect(calcularDias(null)).toBe(0);
  });

  it('cuenta días desde la fecha del préstamo', () => {
    const ref = new Date('2026-05-18T12:00:00');
    const dias = calcularDias({ fecha: '2026-05-01' }, ref);
    expect(dias).toBe(17);
  });

  it('si hay fechaLimite, cuenta desde ahí (no desde fecha)', () => {
    const ref = new Date('2026-05-18T12:00:00');
    const dias = calcularDias({ fecha: '2026-01-01', fechaLimite: '2026-05-10' }, ref);
    expect(dias).toBe(8);
  });

  it('nunca devuelve días negativos (futuro)', () => {
    const ref = new Date('2026-05-18T12:00:00');
    const dias = calcularDias({ fecha: '2026-06-01' }, ref);
    expect(dias).toBe(0);
  });
});

// ── clasificarAntiguedad() ────────────────────────────────────────

describe('clasificarAntiguedad()', () => {
  it('0–14 días → reciente', () => {
    expect(clasificarAntiguedad(0)).toBe('reciente');
    expect(clasificarAntiguedad(7)).toBe('reciente');
    expect(clasificarAntiguedad(14)).toBe('reciente');
  });

  it('15–60 días → mediano', () => {
    expect(clasificarAntiguedad(15)).toBe('mediano');
    expect(clasificarAntiguedad(30)).toBe('mediano');
    expect(clasificarAntiguedad(60)).toBe('mediano');
  });

  it('61+ días → viejo', () => {
    expect(clasificarAntiguedad(61)).toBe('viejo');
    expect(clasificarAntiguedad(180)).toBe('viejo');
    expect(clasificarAntiguedad(9999)).toBe('viejo');
  });
});

// ── porcentajePagado() ────────────────────────────────────────────

describe('porcentajePagado()', () => {
  it('retorna 0 si monto es 0 o falta', () => {
    expect(porcentajePagado({ monto: 0, pagado: 100 })).toBe(0);
    expect(porcentajePagado({})).toBe(0);
  });

  it('calcula porcentaje correctamente', () => {
    expect(porcentajePagado({ monto: 100, pagado: 50 })).toBe(50);
    expect(porcentajePagado({ monto: 200, pagado: 100 })).toBe(50);
    expect(porcentajePagado({ monto: 100_000, pagado: 25_000 })).toBe(25);
  });

  it('clamp a 100 si pagado > monto', () => {
    expect(porcentajePagado({ monto: 100, pagado: 200 })).toBe(100);
  });
});

// ── calcularResumen() ─────────────────────────────────────────────

describe('calcularResumen()', () => {
  it('tolera input vacío o inválido', () => {
    const r = calcularResumen([]);
    expect(r.totalPrestado).toBe(0);
    expect(r.totalCobrado).toBe(0);
    expect(r.totalPendiente).toBe(0);
    expect(r.activos).toBe(0);
    expect(r.liquidados).toBe(0);
    expect(r.pctCobrado).toBe(0);
    expect(calcularResumen(null).totalPrestado).toBe(0);
  });

  it('suma montos, pagados y pendientes', () => {
    const r = calcularResumen([
      { monto: 100_000, pagado: 40_000 },
      { monto: 50_000, pagado: 50_000 },
      { monto: 200_000, pagado: 0 },
    ]);
    expect(r.totalPrestado).toBe(350_000);
    expect(r.totalCobrado).toBe(90_000);
    expect(r.totalPendiente).toBe(260_000);
  });

  it('cuenta activos vs liquidados', () => {
    const r = calcularResumen([
      { monto: 100, pagado: 100 },  // liquidado
      { monto: 100, pagado: 99 },   // activo
      { monto: 100, pagado: 0 },    // activo
    ]);
    expect(r.liquidados).toBe(1);
    expect(r.activos).toBe(2);
  });

  it('calcula pctCobrado redondeado', () => {
    const r = calcularResumen([
      { monto: 100_000, pagado: 33_333 },
    ]);
    expect(r.pctCobrado).toBe(33);
  });

  it('clampea pagado > monto para no inflar el cobrado', () => {
    const r = calcularResumen([
      { monto: 100, pagado: 200 },
    ]);
    expect(r.totalCobrado).toBe(100);
    expect(r.totalPendiente).toBe(0);
  });
});

// ── ordenarPersonales() ───────────────────────────────────────────

describe('ordenarPersonales()', () => {
  const lista = [
    { id: 'a', fecha: '2026-03-01', monto: 100, pagado: 0 },
    { id: 'b', fecha: '2026-01-01', monto: 500, pagado: 250 },
    { id: 'c', fecha: '2026-05-01', monto: 200, pagado: 100 },
  ];

  it('antiguo (default): fecha ASC — más viejos primero', () => {
    const r = ordenarPersonales(lista);
    expect(r.map(p => p.id)).toEqual(['b', 'a', 'c']);
  });

  it('reciente: fecha DESC', () => {
    const r = ordenarPersonales(lista, 'reciente');
    expect(r.map(p => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('monto: por pendiente DESC', () => {
    const r = ordenarPersonales(lista, 'monto');
    // pendientes: a=100, b=250, c=100 → b primero
    expect(r[0].id).toBe('b');
  });

  it('no muta el array original', () => {
    const original = [...lista];
    ordenarPersonales(lista, 'reciente');
    expect(lista).toEqual(original);
  });
});

// ── validarPersonal() ─────────────────────────────────────────────

describe('validarPersonal()', () => {
  it('acepta datos válidos', () => {
    expect(validarPersonal({
      persona: 'Tía Marta',
      monto: '50000',
      fecha: '2026-05-18',
    })).toEqual([]);
  });

  it('rechaza nombre vacío', () => {
    const errores = validarPersonal({ persona: '', monto: '50000' });
    expect(errores.length).toBeGreaterThan(0);
    expect(errores[0]).toMatch(/nombre/i);
  });

  it('rechaza monto inválido', () => {
    expect(validarPersonal({ persona: 'X', monto: '0' })).toContainEqual(
      expect.stringMatching(/monto/i),
    );
    expect(validarPersonal({ persona: 'X', monto: '-5' })).toContainEqual(
      expect.stringMatching(/monto/i),
    );
    expect(validarPersonal({ persona: 'X', monto: 'abc' })).toContainEqual(
      expect.stringMatching(/monto/i),
    );
  });

  it('rechaza fechas con formato inválido', () => {
    expect(validarPersonal({
      persona: 'X', monto: '100', fecha: '2026/05/18',
    })).toContainEqual(expect.stringMatching(/fecha/i));
  });
});

// ── normalizarPersonal() ──────────────────────────────────────────

describe('normalizarPersonal()', () => {
  it('convierte tipos y aplica defaults', () => {
    const r = normalizarPersonal({
      persona: '  Tía Marta  ',
      monto: '50000',
      fecha: '2026-05-18',
    });
    expect(r.persona).toBe('Tía Marta');
    expect(r.monto).toBe(50000);
    expect(r.pagado).toBe(0);
    expect(r.liquidado).toBe(false);
  });

  it('omite motivo y fechaLimite si están vacíos', () => {
    const r = normalizarPersonal({ persona: 'X', monto: '100' });
    expect(r.motivo).toBeUndefined();
    expect(r.fechaLimite).toBeUndefined();
  });

  it('incluye motivo y fechaLimite si vienen llenos', () => {
    const r = normalizarPersonal({
      persona: 'X', monto: '100',
      motivo: 'mercado',
      fechaLimite: '2026-06-01',
    });
    expect(r.motivo).toBe('mercado');
    expect(r.fechaLimite).toBe('2026-06-01');
  });

  it('clamp pagado a monto', () => {
    const r = normalizarPersonal({ persona: 'X', monto: '100', pagado: '200' });
    expect(r.pagado).toBe(100);
    expect(r.liquidado).toBe(true);
  });
});

// ── aplicarPago() ─────────────────────────────────────────────────

describe('aplicarPago()', () => {
  it('suma el pago al campo pagado', () => {
    const r = aplicarPago({ monto: 100, pagado: 20 }, 30);
    expect(r.pagado).toBe(50);
    expect(r.liquidado).toBe(false);
  });

  it('marca liquidado cuando pagado alcanza monto', () => {
    const r = aplicarPago({ monto: 100, pagado: 80 }, 20);
    expect(r.pagado).toBe(100);
    expect(r.liquidado).toBe(true);
  });

  it('no permite pagar más del pendiente', () => {
    const r = aplicarPago({ monto: 100, pagado: 80 }, 50);
    expect(r.pagado).toBe(100);  // solo aplicó 20
    expect(r.liquidado).toBe(true);
  });

  it('rechaza montos inválidos (no cambia el préstamo)', () => {
    const original = { monto: 100, pagado: 50 };
    const r1 = aplicarPago(original, -10);
    expect(r1.pagado).toBe(50);
    const r2 = aplicarPago(original, NaN);
    expect(r2.pagado).toBe(50);
  });

  it('no muta el objeto original', () => {
    const original = { id: 'x', monto: 100, pagado: 20 };
    aplicarPago(original, 30);
    expect(original.pagado).toBe(20);
  });
});
