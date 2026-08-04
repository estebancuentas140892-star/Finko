import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../../modules/core/state.js';
import { SALDO_MASCARA, SALDO_MASCARA_CUENTA } from '../../modules/infra/render.js';
import { renderListaPersonales, renderFormPersonal } from '../../modules/dominio/personales/view.js';
import {
  calcularPendiente,
  calcularCapitalPendiente,
  calcularInteresPendiente,
  calcularDias,
  clasificarAntiguedad,
  estadoPrestamo,
  labelEstado,
  porcentajePagado,
  calcularResumen,
  ordenarPersonales,
  validarPersonal,
  normalizarPersonal,
  aplicarPago,
  desglosarPago,
  tieneInteres,
  calcularTotalPorCobrar,
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

// ── calcularTotalPorCobrar() - activo del patrimonio (PE.7) ───────

describe('calcularTotalPorCobrar()', () => {
  it('suma el capital pendiente de los préstamos con cuenta vinculada', () => {
    const lista = [
      { monto: 500_000, pagado: 0,       cuentaId: 'c1' },
      { monto: 300_000, pagado: 100_000, cuentaId: 'c1' },
    ];
    expect(calcularTotalPorCobrar(lista)).toBe(700_000);
  });

  it('EXCLUYE los préstamos sin cuentaId: su dinero nunca salió de cuentas y contarlo lo duplicaría', () => {
    // Es el invariante central de PE.7. Un préstamo sin cuenta vinculada
    // (registro anterior, o efectivo que Finko nunca vio) sigue contado dentro
    // de `cuentas`: sumarlo aquí inflaría el patrimonio.
    const lista = [
      { monto: 500_000, pagado: 0, cuentaId: 'c1' },
      { monto: 900_000, pagado: 0 },
      { monto: 400_000, pagado: 0, cuentaId: '' },
      { monto: 700_000, pagado: 0, cuentaId: null },
    ];
    expect(calcularTotalPorCobrar(lista)).toBe(500_000);
  });

  it('un préstamo ya cobrado por completo no aporta nada', () => {
    const lista = [{ monto: 500_000, pagado: 500_000, cuentaId: 'c1' }];
    expect(calcularTotalPorCobrar(lista)).toBe(0);
  });

  it('con tasa cuenta SOLO el capital, nunca el interés devengado', () => {
    // El interés no se ha ganado ni cobrado y el usuario puede perdonarlo:
    // contarlo inflaría el patrimonio con dinero incierto.
    const prestamo = {
      monto: 1_000_000, pagado: 0, cuentaId: 'c1',
      tasa: 5, capitalPagado: 0, interesPagado: 0, interesPendiente: 250_000,
      fecha: '2020-01-01',
    };
    expect(calcularTotalPorCobrar([prestamo])).toBe(1_000_000);
  });

  it('con tasa y abonos usa capitalPagado, no el total pagado (el interés cobrado no baja capital)', () => {
    const prestamo = {
      monto: 1_000_000, pagado: 300_000, cuentaId: 'c1',
      tasa: 2, capitalPagado: 200_000, interesPagado: 100_000, interesPendiente: 0,
    };
    expect(calcularTotalPorCobrar([prestamo])).toBe(800_000);
  });

  it('tolera entradas vacías o inválidas', () => {
    expect(calcularTotalPorCobrar([])).toBe(0);
    expect(calcularTotalPorCobrar(null)).toBe(0);
    expect(calcularTotalPorCobrar(undefined)).toBe(0);
    expect(calcularTotalPorCobrar([null, undefined])).toBe(0);
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

  it('tras un abono, cuenta desde ultimoPago (no desde la fecha del préstamo)', () => {
    const ref = new Date('2026-05-18T12:00:00');
    const dias = calcularDias({ fecha: '2026-01-01', ultimoPago: '2026-05-15' }, ref);
    expect(dias).toBe(3);
  });

  it('un abono posterior a una fechaLimite vencida reinicia el reloj', () => {
    const ref = new Date('2026-05-18T12:00:00');
    const dias = calcularDias(
      { fecha: '2026-01-01', fechaLimite: '2026-02-01', ultimoPago: '2026-05-15' },
      ref,
    );
    expect(dias).toBe(3);
  });

  it('un plazo pactado futuro mantiene el préstamo al día aunque haya abono', () => {
    const ref = new Date('2026-05-18T12:00:00');
    const dias = calcularDias(
      { fecha: '2026-01-01', fechaLimite: '2026-12-31', ultimoPago: '2026-05-15' },
      ref,
    );
    expect(dias).toBe(0);
  });
});

// ── clasificarAntiguedad() ────────────────────────────────────────

describe('clasificarAntiguedad()', () => {
  it('0-14 días → reciente', () => {
    expect(clasificarAntiguedad(0)).toBe('reciente');
    expect(clasificarAntiguedad(7)).toBe('reciente');
    expect(clasificarAntiguedad(14)).toBe('reciente');
  });

  it('15-60 días → mediano', () => {
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

// ── estadoPrestamo() ──────────────────────────────────────────────

describe('estadoPrestamo() (PE.3/PE.4)', () => {
  const ref = new Date('2026-05-18T12:00:00');

  it('liquidado manda sobre todo lo demás', () => {
    const r = estadoPrestamo(
      { monto: 100, pagado: 100, fecha: '2026-01-01', fechaLimite: '2026-02-01' },
      ref,
    );
    expect(r).toEqual({ tipo: 'liquidado', dias: 0 });
  });

  it('fecha pactada futura → proximo, con los días que faltan', () => {
    const r = estadoPrestamo({ monto: 100, pagado: 0, fecha: '2026-01-01', fechaLimite: '2026-05-23' }, ref);
    expect(r).toEqual({ tipo: 'proximo', dias: 5 });
  });

  it('fecha pactada hoy → hoy', () => {
    const r = estadoPrestamo({ monto: 100, pagado: 0, fecha: '2026-01-01', fechaLimite: '2026-05-18' }, ref);
    expect(r).toEqual({ tipo: 'hoy', dias: 0 });
  });

  it('fecha pactada pasada → vencido, con los días que pasaron', () => {
    const r = estadoPrestamo({ monto: 100, pagado: 0, fecha: '2026-01-01', fechaLimite: '2026-05-10' }, ref);
    expect(r).toEqual({ tipo: 'vencido', dias: 8 });
  });

  it('sin fecha pactada, con abono → abonado desde el último abono', () => {
    const r = estadoPrestamo({ monto: 100, pagado: 30, fecha: '2026-01-01', ultimoPago: '2026-05-15' }, ref);
    expect(r).toEqual({ tipo: 'abonado', dias: 3 });
  });

  it('abono hoy → abonado con 0 días', () => {
    const r = estadoPrestamo({ monto: 100, pagado: 30, fecha: '2026-01-01', ultimoPago: '2026-05-18' }, ref);
    expect(r).toEqual({ tipo: 'abonado', dias: 0 });
  });

  it('sin fecha pactada ni abonos → pendiente desde el préstamo', () => {
    const r = estadoPrestamo({ monto: 100, pagado: 0, fecha: '2026-05-01' }, ref);
    expect(r).toEqual({ tipo: 'pendiente', dias: 17 });
  });

  it('la fecha pactada manda aunque haya abono posterior', () => {
    const r = estadoPrestamo(
      { monto: 100, pagado: 30, fecha: '2026-01-01', fechaLimite: '2026-02-01', ultimoPago: '2026-05-15' },
      ref,
    );
    expect(r.tipo).toBe('vencido');
  });

  it('tolera préstamo sin fechas', () => {
    expect(estadoPrestamo({ monto: 100, pagado: 0 }, ref)).toEqual({ tipo: 'pendiente', dias: 0 });
  });
});

// ── labelEstado() ─────────────────────────────────────────────────

describe('labelEstado() (PE.3/PE.4, copy de seguimiento)', () => {
  it('liquidado', () => {
    expect(labelEstado({ tipo: 'liquidado', dias: 0 })).toBe('Liquidado');
  });

  it('proximo: singular mañana, plural en N días', () => {
    expect(labelEstado({ tipo: 'proximo', dias: 1 })).toBe('Próximo pago mañana');
    expect(labelEstado({ tipo: 'proximo', dias: 5 })).toBe('Próximo pago en 5 días');
  });

  it('hoy', () => {
    expect(labelEstado({ tipo: 'hoy', dias: 0 })).toBe('Pago programado para hoy');
  });

  it('vencido humaniza los días transcurridos', () => {
    expect(labelEstado({ tipo: 'vencido', dias: 1 })).toBe('La fecha de pago pasó ayer');
    expect(labelEstado({ tipo: 'vencido', dias: 60 })).toBe('La fecha de pago pasó hace 2 meses');
  });

  it('abonado: hoy con copy propio, resto humanizado', () => {
    expect(labelEstado({ tipo: 'abonado', dias: 0 })).toBe('Recibiste un abono hoy');
    expect(labelEstado({ tipo: 'abonado', dias: 1 })).toBe('Último abono ayer');
    expect(labelEstado({ tipo: 'abonado', dias: 15 })).toBe('Último abono hace 2 semanas');
  });

  it('pendiente humaniza la antigüedad (adiós "1.825 días")', () => {
    expect(labelEstado({ tipo: 'pendiente', dias: 0 })).toBe('Prestado hoy');
    expect(labelEstado({ tipo: 'pendiente', dias: 1825 })).toBe('Prestado hace 5 años');
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

  it('antiguo (default): fecha ASC - más viejos primero', () => {
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

  it('registra ultimoPago con la fecha del abono cuando entra dinero', () => {
    const r = aplicarPago({ monto: 100, pagado: 20 }, 30, '2026-05-15');
    expect(r.ultimoPago).toBe('2026-05-15');
  });

  it('no registra ultimoPago si el pago fue rechazado (0 o inválido)', () => {
    const r1 = aplicarPago({ monto: 100, pagado: 50 }, -10, '2026-05-15');
    expect(r1.ultimoPago).toBeUndefined();
    const r2 = aplicarPago({ monto: 100, pagado: 100 }, 50, '2026-05-15');
    expect(r2.ultimoPago).toBeUndefined();  // ya liquidado, pendiente 0
  });
});

// ── PE.1: tasa de interés opcional ────────────────────────────────

describe('tieneInteres() (PE.1)', () => {
  it('true solo con tasa numérica mayor a 0', () => {
    expect(tieneInteres({ tasa: 2 })).toBe(true);
    expect(tieneInteres({ tasa: 0.5 })).toBe(true);
  });

  it('false sin tasa, con tasa 0, null o inválida', () => {
    expect(tieneInteres({})).toBe(false);
    expect(tieneInteres({ tasa: 0 })).toBe(false);
    expect(tieneInteres({ tasa: null })).toBe(false);
    expect(tieneInteres({ tasa: 'abc' })).toBe(false);
    expect(tieneInteres(null)).toBe(false);
  });
});

describe('calcularCapitalPendiente() (PE.1)', () => {
  it('sin tasa: monto menos pagado (comportamiento clásico)', () => {
    expect(calcularCapitalPendiente({ monto: 100_000, pagado: 40_000 })).toBe(60_000);
  });

  it('con tasa: usa capitalPagado, no pagado (el interés no baja capital)', () => {
    const p = { monto: 100_000, pagado: 30_000, tasa: 2, capitalPagado: 10_000, interesPagado: 20_000 };
    expect(calcularCapitalPendiente(p)).toBe(90_000);
  });

  it('nunca negativo', () => {
    expect(calcularCapitalPendiente({ monto: 100, pagado: 500 })).toBe(0);
    expect(calcularCapitalPendiente({ monto: 100, tasa: 2, capitalPagado: 500 })).toBe(0);
  });
});

describe('calcularInteresPendiente() (PE.1)', () => {
  it('0 para préstamos sin tasa', () => {
    expect(calcularInteresPendiente({ monto: 100_000, pagado: 0, fecha: '2026-01-01' })).toBe(0);
  });

  it('devenga interés simple desde la fecha del préstamo', () => {
    // 1.000.000 al 2% mensual, 30 días → 20.000
    const p = { monto: 1_000_000, pagado: 0, fecha: '2026-05-01', tasa: 2,
                capitalPagado: 0, interesPagado: 0, interesPendiente: 0 };
    expect(calcularInteresPendiente(p, new Date('2026-05-31T12:00:00'))).toBe(20_000);
  });

  it('tras un abono, devenga desde ultimoPago y suma el snapshot pendiente', () => {
    // Snapshot de 5.000 sin cobrar + 15 días más al 2% sobre 500.000 = 5.000
    const p = { monto: 1_000_000, pagado: 500_000, fecha: '2026-01-01', tasa: 2,
                capitalPagado: 500_000, interesPagado: 0, interesPendiente: 5_000,
                ultimoPago: '2026-05-01' };
    expect(calcularInteresPendiente(p, new Date('2026-05-16T12:00:00'))).toBe(10_000);
  });

  it('con el capital en 0 no devenga interés nuevo, solo devuelve el snapshot', () => {
    const p = { monto: 100_000, pagado: 100_000, fecha: '2026-01-01', tasa: 2,
                capitalPagado: 100_000, interesPagado: 0, interesPendiente: 3_000,
                ultimoPago: '2026-03-01' };
    expect(calcularInteresPendiente(p, new Date('2026-06-01T12:00:00'))).toBe(3_000);
  });

  it('acepta fechaRef como string ISO corto sin corrimiento de día', () => {
    const p = { monto: 1_000_000, pagado: 0, fecha: '2026-05-01', tasa: 2,
                capitalPagado: 0, interesPagado: 0, interesPendiente: 0 };
    expect(calcularInteresPendiente(p, '2026-05-31')).toBe(20_000);
  });
});

describe('calcularPendiente() con tasa (PE.1)', () => {
  it('incluye capital pendiente más interés devengado', () => {
    const p = { monto: 1_000_000, pagado: 0, fecha: '2026-05-01', tasa: 2,
                capitalPagado: 0, interesPagado: 0, interesPendiente: 0 };
    expect(calcularPendiente(p, new Date('2026-05-31T12:00:00'))).toBe(1_020_000);
  });

  it('sin tasa el segundo parámetro no cambia nada (retrocompatible)', () => {
    expect(calcularPendiente({ monto: 100_000, pagado: 40_000 }, new Date('2030-01-01'))).toBe(60_000);
  });
});

describe('desglosarPago() (PE.1)', () => {
  const base = { monto: 1_000_000, pagado: 0, fecha: '2026-05-01', tasa: 2,
                 capitalPagado: 0, interesPagado: 0, interesPendiente: 0 };

  it('sin tasa: todo el pago va a capital', () => {
    const r = desglosarPago({ monto: 100_000, pagado: 0 }, 30_000);
    expect(r).toEqual({ aplicado: 30_000, aCapital: 30_000, aInteres: 0 });
  });

  it('con tasa: cubre primero el interés devengado', () => {
    // A 30 días hay 20.000 de interés. Pago de 50.000: 20.000 interés + 30.000 capital.
    const r = desglosarPago(base, 50_000, '2026-05-31');
    expect(r).toEqual({ aplicado: 50_000, aCapital: 30_000, aInteres: 20_000 });
  });

  it('un pago menor al interés devengado va completo a interés', () => {
    const r = desglosarPago(base, 8_000, '2026-05-31');
    expect(r).toEqual({ aplicado: 8_000, aCapital: 0, aInteres: 8_000 });
  });

  it('recorta el pago al pendiente total (interés + capital)', () => {
    const r = desglosarPago(base, 5_000_000, '2026-05-31');
    expect(r).toEqual({ aplicado: 1_020_000, aCapital: 1_000_000, aInteres: 20_000 });
  });

  it('no muta el préstamo', () => {
    const copia = { ...base };
    desglosarPago(base, 50_000, '2026-05-31');
    expect(base).toEqual(copia);
  });
});

describe('aplicarPago() con tasa (PE.1)', () => {
  const base = { monto: 1_000_000, pagado: 0, fecha: '2026-05-01', tasa: 2,
                 capitalPagado: 0, interesPagado: 0, interesPendiente: 0 };

  it('actualiza acumuladores de capital e interés y el total pagado', () => {
    const r = aplicarPago(base, 50_000, '2026-05-31');
    expect(r.pagado).toBe(50_000);
    expect(r.interesPagado).toBe(20_000);
    expect(r.capitalPagado).toBe(30_000);
    expect(r.interesPendiente).toBe(0);
    expect(r.ultimoPago).toBe('2026-05-31');
    expect(r.liquidado).toBe(false);
  });

  it('un pago parcial del interés deja el resto como snapshot pendiente', () => {
    const r = aplicarPago(base, 8_000, '2026-05-31');
    expect(r.interesPagado).toBe(8_000);
    expect(r.capitalPagado).toBe(0);
    expect(r.interesPendiente).toBe(12_000);
    expect(r.liquidado).toBe(false);
  });

  it('liquida solo cuando no queda capital NI interés pendiente', () => {
    // Un pago del tamaño del capital no liquida: el interés se cobra primero,
    // así que quedan 20.000 de capital pendiente.
    const soloCapital = aplicarPago(base, 1_000_000, '2026-05-31');
    expect(soloCapital.liquidado).toBe(false);
    expect(soloCapital.interesPagado).toBe(20_000);
    expect(soloCapital.capitalPagado).toBe(980_000);
    expect(soloCapital.interesPendiente).toBe(0);

    // Pagar todo (capital + interés) sí liquida.
    const todo = aplicarPago(base, 1_020_000, '2026-05-31');
    expect(todo.liquidado).toBe(true);
    expect(todo.interesPendiente).toBe(0);
    expect(todo.capitalPagado).toBe(1_000_000);
    expect(todo.interesPagado).toBe(20_000);
  });

  it('el devengo continúa tras el abono sin contar doble el periodo anterior', () => {
    // Abono al día 30 que cubre todo el interés y deja 500.000 de capital.
    const tras = aplicarPago(base, 520_000, '2026-05-31');
    expect(tras.capitalPagado).toBe(500_000);
    expect(tras.interesPendiente).toBe(0);
    // 30 días después: interés solo sobre los 500.000 restantes = 10.000.
    expect(calcularInteresPendiente(tras, new Date('2026-06-30T12:00:00'))).toBe(10_000);
  });

  it('pago inválido no cambia nada (tampoco el ancla de devengo)', () => {
    const r = aplicarPago(base, -10, '2026-05-31');
    expect(r.pagado).toBe(0);
    expect(r.interesPendiente).toBe(0);
    expect(r.ultimoPago).toBeUndefined();
  });

  it('no muta el objeto original', () => {
    const copia = { ...base };
    aplicarPago(base, 50_000, '2026-05-31');
    expect(base).toEqual(copia);
  });
});

describe('porcentajePagado() con tasa (PE.1)', () => {
  it('mide recuperación de capital, no el total recibido', () => {
    const p = { monto: 100_000, pagado: 60_000, tasa: 2, capitalPagado: 40_000, interesPagado: 20_000 };
    expect(porcentajePagado(p)).toBe(40);
  });
});

describe('calcularResumen() con tasa (PE.1)', () => {
  const ref = new Date('2026-05-31T12:00:00');

  it('el pendiente incluye interés devengado y el cobrado incluye interés recibido', () => {
    const r = calcularResumen([
      { monto: 1_000_000, pagado: 0, fecha: '2026-05-01', tasa: 2,
        capitalPagado: 0, interesPagado: 0, interesPendiente: 0 },
      { monto: 100_000, pagado: 40_000 },
    ], ref);
    expect(r.totalPrestado).toBe(1_100_000);
    expect(r.totalPendiente).toBe(1_020_000 + 60_000);
    expect(r.totalCobrado).toBe(40_000);
  });

  it('pctCobrado no se infla con los intereses cobrados', () => {
    // Capital totalmente recuperado + 20.000 de interés cobrado: 100%, no 102%.
    const r = calcularResumen([
      { monto: 1_000_000, pagado: 1_020_000, fecha: '2026-05-01', tasa: 2,
        capitalPagado: 1_000_000, interesPagado: 20_000, interesPendiente: 0,
        ultimoPago: '2026-05-31' },
    ], ref);
    expect(r.pctCobrado).toBe(100);
    expect(r.liquidados).toBe(1);
    expect(r.activos).toBe(0);
  });

  it('un préstamo con capital pagado pero interés pendiente sigue activo', () => {
    const r = calcularResumen([
      { monto: 100_000, pagado: 100_000, fecha: '2026-01-01', tasa: 2,
        capitalPagado: 100_000, interesPagado: 0, interesPendiente: 3_000,
        ultimoPago: '2026-03-01' },
    ], ref);
    expect(r.activos).toBe(1);
    expect(r.liquidados).toBe(0);
    expect(r.totalPendiente).toBe(3_000);
  });
});

describe('validarPersonal() con tasa (PE.1)', () => {
  it('acepta tasa vacía, ausente o válida', () => {
    expect(validarPersonal({ persona: 'X', monto: '100' })).toEqual([]);
    expect(validarPersonal({ persona: 'X', monto: '100', tasa: '' })).toEqual([]);
    expect(validarPersonal({ persona: 'X', monto: '100', tasa: '2' })).toEqual([]);
    expect(validarPersonal({ persona: 'X', monto: '100', tasa: '0.5' })).toEqual([]);
  });

  it('rechaza tasa negativa, mayor a 100 o no numérica', () => {
    expect(validarPersonal({ persona: 'X', monto: '100', tasa: '-1' })).toContainEqual(
      expect.stringMatching(/tasa/i),
    );
    expect(validarPersonal({ persona: 'X', monto: '100', tasa: '101' })).toContainEqual(
      expect.stringMatching(/tasa/i),
    );
    expect(validarPersonal({ persona: 'X', monto: '100', tasa: 'abc' })).toContainEqual(
      expect.stringMatching(/tasa/i),
    );
  });
});

describe('normalizarPersonal() con tasa (PE.1)', () => {
  it('con tasa inicializa los acumuladores capital/interés', () => {
    const r = normalizarPersonal({ persona: 'X', monto: '100000', tasa: '2' });
    expect(r.tasa).toBe(2);
    expect(r.capitalPagado).toBe(0);
    expect(r.interesPagado).toBe(0);
    expect(r.interesPendiente).toBe(0);
  });

  it('sin tasa (o tasa 0/vacía) no agrega campos de interés', () => {
    const r1 = normalizarPersonal({ persona: 'X', monto: '100' });
    expect(r1.tasa).toBeUndefined();
    expect(r1.capitalPagado).toBeUndefined();
    const r2 = normalizarPersonal({ persona: 'X', monto: '100', tasa: '' });
    expect(r2.tasa).toBeUndefined();
    const r3 = normalizarPersonal({ persona: 'X', monto: '100', tasa: '0' });
    expect(r3.tasa).toBeUndefined();
  });
});

// ── normalizarPersonal(datos, existente) - modo edición (EDIT.1) ──

describe('normalizarPersonal() - modo edición (EDIT.1)', () => {
  const datosEditados = {
    persona: 'Tía Marta renombrada', monto: '200000', fecha: '2026-06-01',
  };

  it('actualiza persona, monto y fecha', () => {
    const existente = { id: 'p1', persona: 'Tía Marta', monto: 100_000, pagado: 0, fecha: '2026-01-01' };
    const r = normalizarPersonal(datosEditados, existente);
    expect(r.persona).toBe('Tía Marta renombrada');
    expect(r.monto).toBe(200_000);
    expect(r.fecha).toBe('2026-06-01');
  });

  it('sin fecha en datos, conserva la fecha del existente', () => {
    const existente = { id: 'p1', persona: 'X', monto: 100_000, pagado: 0, fecha: '2026-01-01' };
    const r = normalizarPersonal({ persona: 'X', monto: '100000' }, existente);
    expect(r.fecha).toBe('2026-01-01');
  });

  it('conserva el pagado acumulado (sin tasa)', () => {
    const existente = { id: 'p1', persona: 'X', monto: 100_000, pagado: 40_000, fecha: '2026-01-01' };
    const r = normalizarPersonal({ persona: 'X', monto: '200000' }, existente);
    expect(r.pagado).toBe(40_000);
    expect(r.liquidado).toBe(false);
  });

  it('clampea el pagado si el monto editado baja por debajo de lo ya pagado', () => {
    const existente = { id: 'p1', persona: 'X', monto: 100_000, pagado: 40_000, fecha: '2026-01-01' };
    const r = normalizarPersonal({ persona: 'X', monto: '30000' }, existente);
    expect(r.pagado).toBe(30_000);
    expect(r.liquidado).toBe(true);
  });

  it('preserva cuentaId del existente aunque el form no lo envíe', () => {
    const existente = { id: 'p1', persona: 'X', monto: 100_000, pagado: 0, fecha: '2026-01-01', cuentaId: 'c1' };
    const r = normalizarPersonal(datosEditados, existente);
    expect(r.cuentaId).toBe('c1');
  });

  it('ignora un cuentaId que llegara en datos: el existente manda', () => {
    const existente = { id: 'p1', persona: 'X', monto: 100_000, pagado: 0, fecha: '2026-01-01', cuentaId: 'c1' };
    const r = normalizarPersonal({ ...datosEditados, cuentaId: 'c9' }, existente);
    expect(r.cuentaId).toBe('c1');
  });

  it('sin cuentaId en el existente, el resultado tampoco lo agrega', () => {
    const existente = { id: 'p1', persona: 'X', monto: 100_000, pagado: 0, fecha: '2026-01-01' };
    const r = normalizarPersonal(datosEditados, existente);
    expect('cuentaId' in r).toBe(false);
  });

  it('actualiza motivo y fechaLimite', () => {
    const existente = { id: 'p1', persona: 'X', monto: 100_000, pagado: 0, fecha: '2026-01-01' };
    const r = normalizarPersonal({ ...datosEditados, motivo: 'mercado', fechaLimite: '2026-07-01' }, existente);
    expect(r.motivo).toBe('mercado');
    expect(r.fechaLimite).toBe('2026-07-01');
  });

  it('borrar motivo en el form lo limpia (editar() sobreescribe, no conserva)', () => {
    const existente = { id: 'p1', persona: 'X', monto: 100_000, pagado: 0, fecha: '2026-01-01', motivo: 'mercado' };
    const r = normalizarPersonal({ ...datosEditados, motivo: '' }, existente);
    expect(r.motivo).toBeUndefined();
  });

  it('borrar la fecha pactada en el form la limpia', () => {
    const existente = {
      id: 'p1', persona: 'X', monto: 100_000, pagado: 0, fecha: '2026-01-01', fechaLimite: '2026-07-01',
    };
    const r = normalizarPersonal({ ...datosEditados, fechaLimite: '' }, existente);
    expect(r.fechaLimite).toBeUndefined();
  });

  describe('transición de tasa al editar', () => {
    it('con tasa antes y ahora: conserva capitalPagado/interesPagado/interesPendiente', () => {
      const existente = {
        id: 'p1', persona: 'X', monto: 1_000_000, pagado: 50_000, fecha: '2026-01-01',
        tasa: 2, capitalPagado: 30_000, interesPagado: 20_000, interesPendiente: 5_000,
        ultimoPago: '2026-05-01',
      };
      const r = normalizarPersonal({ persona: 'X', monto: '1000000', tasa: '3' }, existente);
      expect(r.tasa).toBe(3);
      expect(r.capitalPagado).toBe(30_000);
      expect(r.interesPagado).toBe(20_000);
      expect(r.interesPendiente).toBe(5_000);
      expect(r.pagado).toBe(50_000);
      expect(r.ultimoPago).toBe('2026-05-01');
    });

    it('sin tasa antes, con tasa ahora: lo pagado hasta hoy se asume capital', () => {
      const existente = { id: 'p1', persona: 'X', monto: 1_000_000, pagado: 100_000, fecha: '2026-01-01' };
      const r = normalizarPersonal({ persona: 'X', monto: '1000000', tasa: '2' }, existente);
      expect(r.tasa).toBe(2);
      expect(r.capitalPagado).toBe(100_000);
      expect(r.interesPagado).toBe(0);
      expect(r.interesPendiente).toBe(0);
    });

    it('con tasa antes, sin tasa ahora: limpia los acumuladores de interés', () => {
      const existente = {
        id: 'p1', persona: 'X', monto: 1_000_000, pagado: 50_000, fecha: '2026-01-01',
        tasa: 2, capitalPagado: 30_000, interesPagado: 20_000, interesPendiente: 5_000,
      };
      const r = normalizarPersonal({ persona: 'X', monto: '1000000' }, existente);
      expect(r.tasa).toBeUndefined();
      expect(r.capitalPagado).toBeUndefined();
      expect(r.interesPagado).toBeUndefined();
      expect(r.interesPendiente).toBeUndefined();
      expect(r.pagado).toBe(50_000);
    });

    it('liquida con tasa cuando el capital y el interés pendiente llegan a 0', () => {
      const existente = {
        id: 'p1', persona: 'X', monto: 100_000, pagado: 100_000, fecha: '2026-01-01',
        tasa: 2, capitalPagado: 100_000, interesPagado: 2_000, interesPendiente: 0,
      };
      const r = normalizarPersonal({ persona: 'X', monto: '100000', tasa: '2' }, existente);
      expect(r.liquidado).toBe(true);
    });
  });
});

// ── normalizarPersonal() con cuenta (PE.7) ────────────────────────

describe('normalizarPersonal() con cuenta de origen (PE.7)', () => {
  it('guarda cuentaId cuando el form la trae', () => {
    const r = normalizarPersonal({ persona: 'X', monto: '100000', cuentaId: 'c1' });
    expect(r.cuentaId).toBe('c1');
  });

  it('OMITE la clave por completo cuando no hay cuenta, no la pone en undefined', () => {
    // Omitirla es lo que permite que `editar()` (Object.assign) conserve una
    // cuenta ya guardada, y distingue "sin cuenta" de "cuenta borrada".
    const r = normalizarPersonal({ persona: 'X', monto: '100000' });
    expect('cuentaId' in r).toBe(false);
  });

  it('trata cadena vacía o solo espacios como sin cuenta', () => {
    expect('cuentaId' in normalizarPersonal({ persona: 'X', monto: '1', cuentaId: '' })).toBe(false);
    expect('cuentaId' in normalizarPersonal({ persona: 'X', monto: '1', cuentaId: '   ' })).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// DIS.3 - auditoría de diseño de Me deben (hallazgos M1 a M12).
// La vista es la que cambia: `logic.js` no se toca en toda la tarea.
// ════════════════════════════════════════════════════════════════

describe('renderListaPersonales() - fila de préstamo (DIS.3)', () => {
  const prestamo = (over = {}) => ({
    id: 'p1', persona: 'Camilo Restrepo', monto: 500_000, pagado: 0,
    fecha: '2026-03-10', liquidado: false, ...over,
  });

  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-personales"></div>';
    S.personales = [];
    S.config = { ...(S.config ?? {}), ocultarSaldo: false };
  });

  const render = (lista) => {
    S.personales = lista;
    renderListaPersonales();
    return document.getElementById('lista-personales');
  };

  // ── V-2 / regla R19: el monto ancla es lo vigente ──────────────

  it('V-2: el monto ancla es el PENDIENTE, no lo prestado', () => {
    const el = render([prestamo({ monto: 1_000_000, pagado: 400_000 })]);
    expect(el.querySelector('.list-item__amount').textContent.trim()).toBe('$600.000');
  });

  it('V-2: el histórico acompaña en `.personal-item__de` solo cuando hubo abonos', () => {
    const conAbono = render([prestamo({ monto: 1_000_000, pagado: 400_000 })]);
    expect(conAbono.querySelector('.personal-item__de').textContent.trim()).toBe('de $1.000.000');

    const sinAbono = render([prestamo({ monto: 1_000_000, pagado: 0 })]);
    expect(sinAbono.querySelector('.personal-item__de')).toBeNull();
  });

  it('V-2: el liquidado conserva el monto histórico y no repite el "de $X"', () => {
    const el = render([prestamo({ monto: 200_000, pagado: 200_000, liquidado: true })]);
    expect(el.querySelector('.list-item__amount').textContent.trim()).toBe('$200.000');
    expect(el.querySelector('.personal-item__de')).toBeNull();
  });

  it('V-2: sin tasa no hay subtítulo (duplicaba la cifra del meta)', () => {
    const el = render([prestamo({ monto: 500_000, pagado: 100_000 })]);
    expect(el.querySelector('.list-item__subtitle')).toBeNull();
  });

  it('V-2: con tasa el subtítulo se queda solo con el desglose capital + interés', () => {
    const el = render([prestamo({
      monto: 1_000_000, pagado: 0, tasa: 2,
      capitalPagado: 0, interesPagado: 0, interesPendiente: 0,
    })]);
    const sub = el.querySelector('.list-item__subtitle').textContent.trim();
    expect(sub.startsWith('capital ')).toBe(true);
    expect(sub).toContain('+ interés ');
    expect(sub).not.toContain('Pendiente:');
  });

  // ── V-1 / regla R22: el chip de estado en su propia línea ──────

  it('V-1: el chip sale del título y vive en `.personal-item__estado`', () => {
    const el = render([prestamo({ fechaLimite: '2026-07-04' })]);
    expect(el.querySelector('.list-item__title .chip')).toBeNull();
    expect(el.querySelector('.personal-item__estado .chip')).not.toBeNull();
    expect(el.querySelector('.list-item__title').textContent.trim()).toBe('Camilo Restrepo');
  });

  // ── V-9: un solo verbo para la métrica de recuperación ─────────

  it('V-9: la barra de la fila dice "cobrado", no "pagado"', () => {
    const el = render([prestamo({ monto: 1_000_000, pagado: 400_000 })]);
    const label = el.querySelector('.list-item__body .progress').getAttribute('aria-label');
    expect(label).toBe('40% cobrado');
    expect(label).not.toContain('pagado');
  });

  // ── V-10 / regla R8: piso táctil de 44px ───────────────────────

  it('V-10: "Me pagaron" ya no lleva btn-sm', () => {
    const el = render([prestamo()]);
    const btn = el.querySelector('[data-action="pagar-personal"]');
    expect(btn.className).not.toContain('btn-sm');
    expect(btn.className).toContain('btn-ghost');
  });

  // ── V-5 / V-6: ancla de foco tras el re-render ─────────────────

  it('V-5/V-6: cada tarjeta es enfocable por programa (tabindex -1)', () => {
    const el = render([prestamo()]);
    expect(el.querySelector('article[data-id="p1"]').getAttribute('tabindex')).toBe('-1');
  });

  // ── V-8 / regla R21: lo terminado no compite ───────────────────

  it('V-8: los liquidados van al final aunque sean los más antiguos', () => {
    const el = render([
      prestamo({ id: 'viejo-liquidado', monto: 200_000, pagado: 200_000, liquidado: true, fecha: '2026-01-05' }),
      prestamo({ id: 'activo-nuevo', fecha: '2026-07-18' }),
      prestamo({ id: 'activo-viejo', fecha: '2026-03-10' }),
    ]);
    const ids = [...el.querySelectorAll('article[data-id]')].map(a => a.dataset.id);
    expect(ids).toEqual(['activo-viejo', 'activo-nuevo', 'viejo-liquidado']);
  });
});

describe('renderListaPersonales() - resumen y privacidad (DIS.3)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-personales"></div>';
    S.personales = [
      { id: 'p1', persona: 'A', monto: 1_000_000, pagado: 400_000, fecha: '2026-03-10', liquidado: false },
      { id: 'p2', persona: 'B', monto: 500_000, pagado: 0, fecha: '2026-05-01', liquidado: false },
    ];
    S.config = { ...(S.config ?? {}), ocultarSaldo: false };
  });

  const render = () => {
    renderListaPersonales();
    return document.getElementById('lista-personales');
  };

  // ── V-3: el resumen responde primero lo que se pregunta primero ─

  it('V-3: el orden de los stats es [Pendiente, Te han devuelto, Total prestado, Activos]', () => {
    const labels = [...render().querySelectorAll('.resumen-card__label')].map(p => p.textContent.trim());
    expect(labels).toEqual(['Pendiente', 'Te han devuelto', 'Total prestado', 'Activos']);
  });

  it('V-3: "Pendiente" es el stat primario y no lleva el modificador --sm', () => {
    const stat = render().querySelector('.resumen-card__stat--primary');
    expect(stat.querySelector('.resumen-card__label').textContent.trim()).toBe('Pendiente');
    expect(stat.querySelector('.resumen-card__value').className).not.toContain('resumen-card__value--sm');
  });

  // ── V-4 / regla R20: el ojo no tiene excepciones ───────────────

  it('V-4: con el ojo activo el resumen usa la máscara larga', () => {
    S.config.ocultarSaldo = true;
    const valores = [...render().querySelectorAll('.resumen-card__value')].map(p => p.textContent.trim());
    // Los 3 montos enmascarados; "Activos" es un conteo, no dinero.
    expect(valores.slice(0, 3)).toEqual([SALDO_MASCARA, SALDO_MASCARA, SALDO_MASCARA]);
    expect(valores[3]).toBe('2');
  });

  it('V-4: con el ojo activo los montos por fila usan la máscara corta', () => {
    S.config.ocultarSaldo = true;
    const el = render();
    expect(el.querySelector('.list-item__amount').textContent.trim()).toBe(SALDO_MASCARA_CUENTA);
    expect(el.querySelector('.personal-item__de').textContent.trim()).toBe(`de ${SALDO_MASCARA_CUENTA}`);
    expect(el.innerHTML).not.toContain('$1.000.000');
    expect(el.innerHTML).not.toContain('$600.000');
  });

  it('V-4: con el ojo activo el desglose y el interés cobrado también se enmascaran', () => {
    S.personales = [{
      id: 'p1', persona: 'A', monto: 1_000_000, pagado: 400_000, fecha: '2026-03-10',
      liquidado: false, tasa: 2, capitalPagado: 350_000, interesPagado: 50_000, interesPendiente: 0,
    }];
    S.config.ocultarSaldo = true;
    const el = render();
    expect(el.querySelector('.list-item__subtitle').textContent.trim())
      .toBe(`capital ${SALDO_MASCARA_CUENTA} + interés ${SALDO_MASCARA_CUENTA}`);
    expect(el.innerHTML).toContain(`Ya cobraste ${SALDO_MASCARA_CUENTA} en intereses`);
    expect(el.innerHTML).not.toContain('$50.000');
  });

  it('V-4: la barra de progreso se conserva: muestra proporción, no magnitud', () => {
    S.config.ocultarSaldo = true;
    const el = render();
    const barra = el.querySelector('.personales-resumen .progress');
    expect(barra.getAttribute('aria-valuenow')).toBe('27');
    expect(el.querySelector('.personales-resumen__hint').textContent.trim()).toBe('27% cobrado');
  });

  it('V-4: sin el ojo activo nada cambia respecto de antes', () => {
    const el = render();
    expect(el.querySelector('.list-item__amount').textContent.trim()).toBe('$600.000');
    expect(el.innerHTML).not.toContain(SALDO_MASCARA_CUENTA);
  });
});

describe('vacío y formulario de Me deben (DIS.3)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-personales"></div>';
    S.personales = [];
    S.config = { ...(S.config ?? {}), ocultarSaldo: false };
    S.cuentas = [{ id: 'c1', nombre: 'Bancolombia', tipo: 'ahorros', saldo: 1_000_000, activa: true }];
  });

  // ── V-7 / reglas R11 y R18: un solo primario por pantalla ──────

  it('V-7: el CTA del vacío es secundario y usa el mismo verbo del encabezado', () => {
    renderListaPersonales();
    const btn = document.querySelector('.empty-state [data-action="nuevo-personal"]');
    expect(btn.className).toContain('btn-secondary');
    expect(btn.className).not.toContain('btn-primary');
    expect(btn.textContent.trim()).toBe('+ Agregar préstamo');
  });

  // ── V-11 / V-12: lo esencial primero ──────────────────────────

  it('V-11: pregunta persona, monto, fecha y cuenta antes de lo opcional', () => {
    document.body.innerHTML = `<div id="host">${renderFormPersonal()}</div>`;
    const campos = [...document.querySelectorAll('#form-personal input')].map(i => i.id || i.name);
    expect(campos.indexOf('pers-fecha')).toBeLessThan(campos.indexOf('pers-tasa'));
    expect(campos.indexOf('cuentaId')).toBeLessThan(campos.indexOf('pers-tasa'));
    expect(campos.indexOf('pers-tasa')).toBeLessThan(campos.indexOf('pers-motivo'));
    expect(campos.indexOf('pers-motivo')).toBeLessThan(campos.indexOf('pers-limite'));
  });

  it('V-12: el hint de la tasa cabe en una línea y no repite el badge "opcional"', () => {
    document.body.innerHTML = `<div id="host">${renderFormPersonal()}</div>`;
    const hint = document.getElementById('pers-tasa')
      .closest('.form-group').querySelector('.form-hint').textContent.trim();
    expect(hint).toBe('Se calcula sobre el capital pendiente; cada pago cubre primero el interés.');
    expect(hint).not.toContain('Déjalo vacío');
  });
});

// ── renderFormPersonal({ prestamo }) - modo edición (EDIT.1) ──────

describe('renderFormPersonal({ prestamo }) - modo edición (EDIT.1)', () => {
  beforeEach(() => {
    S.cuentas = [{ id: 'c1', nombre: 'Bancolombia', tipo: 'ahorros', saldo: 1_000_000, activa: true }];
  });

  const prestamo = {
    id: 'p1', persona: 'Tía Marta', monto: 500_000, pagado: 100_000,
    fecha: '2026-03-10', motivo: 'mercado', fechaLimite: '2026-08-01',
    tasa: 2, cuentaId: 'c1',
  };

  it('prellena persona, monto, fecha, motivo, fechaLimite y tasa', () => {
    document.body.innerHTML = `<div id="host">${renderFormPersonal({ prestamo })}</div>`;
    expect(document.getElementById('pers-persona').value).toBe('Tía Marta');
    expect(document.getElementById('pers-monto').value).toBe('500000');
    expect(document.getElementById('pers-fecha').value).toBe('2026-03-10');
    expect(document.getElementById('pers-motivo').value).toBe('mercado');
    expect(document.getElementById('pers-limite').value).toBe('2026-08-01');
    expect(document.getElementById('pers-tasa').value).toBe('2');
  });

  it('el botón dice "Actualizar préstamo", no "Guardar préstamo"', () => {
    document.body.innerHTML = `<div id="host">${renderFormPersonal({ prestamo })}</div>`;
    expect(document.querySelector('#form-personal button[type="submit"]').textContent.trim())
      .toBe('Actualizar préstamo');
  });

  it('con cuentaId, la cuenta sale como nota de solo lectura, no como selector', () => {
    document.body.innerHTML = `<div id="host">${renderFormPersonal({ prestamo })}</div>`;
    expect(document.querySelector('#form-personal input[name="cuentaId"]')).toBeNull();
    expect(document.getElementById('host').textContent).toContain('Bancolombia');
  });

  it('sin cuentaId, no se vuelve a preguntar el origen (a diferencia de crear)', () => {
    const sinCuenta = { ...prestamo, cuentaId: undefined };
    document.body.innerHTML = `<div id="host">${renderFormPersonal({ prestamo: sinCuenta })}</div>`;
    expect(document.querySelector('#form-personal input[name="cuentaId"]')).toBeNull();
    expect(document.getElementById('host').textContent).not.toContain('¿De qué cuenta sale el dinero?');
  });

  it('sin prestamo (crear), el botón sigue diciendo "Guardar préstamo"', () => {
    document.body.innerHTML = `<div id="host">${renderFormPersonal()}</div>`;
    expect(document.querySelector('#form-personal button[type="submit"]').textContent.trim())
      .toBe('Guardar préstamo');
  });
});
