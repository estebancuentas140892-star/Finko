/**
 * estado-obligacion.test.js - el estado de una obligación frente a hoy y el
 * conjunto de pagos pendientes del mes (OB.1, ADR 151).
 *
 * Los tres estados con fechas reales: vencido, para hoy y próximo a vencer.
 * Las fechas entran como texto `YYYY-MM-DD`; ningún caso depende del reloj
 * ni de la zona horaria del equipo que corre la prueba.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  DIAS_ANTICIPACION_OBLIGACION,
  estadoObligacion,
  diasRestantesDeAviso,
  textoEstadoObligacion,
  resumenObligaciones,
  fraseObligaciones,
  detalleObligaciones,
  tituloObligaciones,
  pagosPendientesDelMes,
} from '../../modules/infra/estado-obligacion.js';
import { DIAS_COMPROMISO_PROXIMO } from '../../modules/infra/avisos.js';

const HOY = '2026-11-16';

const fijo = (o = {}) => ({
  id: 'f1', descripcion: 'Netflix', tipo: 'fijo', categoria: 'Streaming', monto: 44_900,
  frecuencia: 'Mensual', diaPago: 10, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z', ...o,
});

const deuda = (o = {}) => ({
  id: 'd1', descripcion: 'Tarjeta Bancolombia', tipo: 'deuda-entidad', saldoTotal: 2_000_000,
  cuotaMensual: 300_000, frecuencia: 'Mensual', diaPago: 12, activo: true,
  fechaCreacion: '2026-01-01T00:00:00.000Z', ...o,
});

// ── ESTADO ───────────────────────────────────────────────────────

describe('estadoObligacion()', () => {
  it('la fecha que ya pasó es vencido; la de hoy, hoy; la que llega pronto, próximo', () => {
    expect(estadoObligacion(-1)).toBe('vencido');
    expect(estadoObligacion(-30)).toBe('vencido');
    expect(estadoObligacion(0)).toBe('hoy');
    expect(estadoObligacion(1)).toBe('proximo');
    expect(estadoObligacion(DIAS_ANTICIPACION_OBLIGACION)).toBe('proximo');
  });

  // OB.1b: "próximo" es la ventana de "Esta semana" (ADR 150 D1 y D4).
  it('la anticipación es la semana: de mañana a 7 días; más allá no tiene estado', () => {
    expect(DIAS_ANTICIPACION_OBLIGACION).toBe(7);
    expect(estadoObligacion(7)).toBe('proximo');
    expect(estadoObligacion(8)).toBeNull();
    expect(estadoObligacion(3, 2)).toBeNull();
  });

  it('sin un número entero no inventa un estado', () => {
    expect(estadoObligacion(null)).toBeNull();
    expect(estadoObligacion(undefined)).toBeNull();
    expect(estadoObligacion(1.5)).toBeNull();
    expect(estadoObligacion('x')).toBeNull();
  });

  it('el motor de avisos conserva su propio umbral de 3 días', () => {
    expect(DIAS_COMPROMISO_PROXIMO).toBe(3);
  });
});

describe('diasRestantesDeAviso()', () => {
  it('el atraso cuenta hacia atrás; lo restante, hacia adelante', () => {
    expect(diasRestantesDeAviso({ sentido: 'atraso', dias: 3 })).toBe(-3);
    expect(diasRestantesDeAviso({ sentido: 'restante', dias: 0 })).toBe(0);
    expect(diasRestantesDeAviso({ sentido: 'restante', dias: 2 })).toBe(2);
    expect(diasRestantesDeAviso({ sentido: null, dias: null })).toBeNull();
  });
});

describe('textoEstadoObligacion()', () => {
  it('dice el estado de lo vencido y lo de hoy con palabras y su tono', () => {
    expect(textoEstadoObligacion(-1)).toEqual({ estado: 'vencido', texto: 'Venció ayer', tono: 'danger' });
    expect(textoEstadoObligacion(-4)).toEqual({ estado: 'vencido', texto: 'Venció hace 4 días', tono: 'danger' });
    expect(textoEstadoObligacion(0)).toEqual({ estado: 'hoy', texto: 'Vence hoy', tono: 'warning' });
  });

  // OB.1b: lo próximo lo dice "Esta semana" ("Jue 19 · en 3 días", ADR 150 D1).
  it('una fecha futura no tiene un segundo texto', () => {
    expect(textoEstadoObligacion(1)).toBeNull();
    expect(textoEstadoObligacion(3)).toBeNull();
    expect(textoEstadoObligacion(9)).toBeNull();
  });

  it('sin fecha no dice nada: null no es "hoy"', () => {
    expect(textoEstadoObligacion(null)).toBeNull();
    expect(textoEstadoObligacion(undefined)).toBeNull();
  });
});

// ── RESUMEN Y FRASES ─────────────────────────────────────────────

describe('resumen, frase, desglose y título de un grupo', () => {
  const r = (...dias) => resumenObligaciones(dias.map(d => ({ diasRestantes: d })));

  it('cuenta por estado y deja fuera lo que no tiene', () => {
    expect(r(-3, -1, 0, 2, 9)).toEqual({ total: 4, vencidos: 2, hoy: 1, proximos: 1 });
    expect(resumenObligaciones([{ estado: 'hoy' }, { estado: null }])).toEqual({ total: 1, vencidos: 0, hoy: 1, proximos: 0 });
    expect(resumenObligaciones(null)).toEqual({ total: 0, vencidos: 0, hoy: 0, proximos: 0 });
  });

  // El defecto que abrió OB.1: dos vencidos se leían "2 pagos para hoy".
  it('dos vencidos son "2 pagos vencidos", sin desglose', () => {
    expect(fraseObligaciones(r(-3, -1))).toBe('2 pagos vencidos');
    expect(detalleObligaciones(r(-3, -1))).toBeNull();
    expect(tituloObligaciones(r(-3, -1))).toBe('Pagos vencidos');
  });

  it('lo de hoy es "para hoy"', () => {
    expect(fraseObligaciones(r(0))).toBe('1 pago vence hoy');
    expect(fraseObligaciones(r(0, 0))).toBe('2 pagos vencen hoy');
    expect(tituloObligaciones(r(0))).toBe('Pago para hoy');
    expect(tituloObligaciones(r(0, 0))).toBe('Pagos para hoy');
  });

  it('lo próximo es "próximo a vencer"', () => {
    expect(fraseObligaciones(r(2))).toBe('1 pago próximo a vencer');
    expect(tituloObligaciones(r(1, 3))).toBe('Pagos próximos a vencer');
  });

  it('mezclados son "pendientes" y el desglose dice cuántos de cada uno', () => {
    expect(fraseObligaciones(r(-3, 0, 0))).toBe('3 pagos pendientes');
    expect(detalleObligaciones(r(-3, 0, 0))).toBe('1 vencido · 2 vencen hoy');
    expect(detalleObligaciones(r(-3, -2, 0, 2))).toBe('2 vencidos · 1 vence hoy · 1 próximo');
    // AH.1e (ADR 150 D7): lo vencido con lo de hoy es "Pagos para hoy", como
    // el tablero; con lo próximo, "Pagos pendientes".
    expect(tituloObligaciones(r(-3, 0))).toBe('Pagos para hoy');
    expect(tituloObligaciones(r(-3, 2))).toBe('Pagos pendientes');
  });

  it('un vencido solo es singular', () => {
    expect(fraseObligaciones(r(-1))).toBe('1 pago vencido');
    expect(tituloObligaciones(r(-1))).toBe('Pago vencido');
  });

  it('sin nada no dice "0 pagos vencidos"', () => {
    expect(fraseObligaciones(r())).toBe('Sin pagos pendientes');
  });
});

// ── EL CONJUNTO DEL LOTE ─────────────────────────────────────────

describe('pagosPendientesDelMes()', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('trae lo vencido y lo de hoy, con su estado y sus días; lo próximo no entra', () => {
    const lista = pagosPendientesDelMes([
      fijo({ id: 'vencido', diaPago: 10 }),
      fijo({ id: 'hoy', descripcion: 'Disney+', diaPago: 16 }),
      fijo({ id: 'proximo', descripcion: 'HBO Max', diaPago: 18 }),
    ], [], '2026-11', HOY);
    expect(lista.map(p => [p.id, p.diasRestantes, p.estado])).toEqual([
      ['vencido', -6, 'vencido'],
      ['hoy', 0, 'hoy'],
    ]);
  });

  it('lo pagado este mes no está pendiente', () => {
    const lista = pagosPendientesDelMes([fijo()],
      [{ id: 'g1', compromisoId: 'f1', monto: 44_900, fecha: '2026-11-10', categoria: 'Gastos fijos' }],
      '2026-11', HOY);
    expect(lista).toEqual([]);
  });

  it('una deuda con abono parcial pide lo que falta de la cuota', () => {
    const lista = pagosPendientesDelMes([deuda()],
      [{ id: 'g1', compromisoId: 'd1', monto: 100_000, fecha: '2026-11-05', categoria: 'Deudas' }],
      '2026-11', HOY);
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ id: 'd1', monto: 200_000, parcial: true, estado: 'vencido', diasRestantes: -4 });
  });

  it('una deuda personal sin cuota no tiene nada que pagar en lote', () => {
    const lista = pagosPendientesDelMes([deuda({ tipo: 'deuda-personal', cuotaMensual: 0 })], [], '2026-11', HOY);
    expect(lista).toEqual([]);
  });

  it('lo creado después de su día de pago no se debe este mes', () => {
    const lista = pagosPendientesDelMes([fijo({ fechaCreacion: '2026-11-14T15:00:00.000Z' })], [], '2026-11', HOY);
    expect(lista).toEqual([]);
  });

  it('cuenta contra el hoyISO que recibe, no contra el reloj ni su zona horaria', () => {
    // El reloj, a otra fecha y casi a medianoche: si la cuenta usara `new
    // Date()` o pasara por UTC, el día 16 se leería como otro día.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2027, 2, 1, 23, 59));
    const lista = pagosPendientesDelMes([fijo({ id: 'hoy', diaPago: 16 })], [], '2026-11', HOY);
    expect(lista.map(p => [p.id, p.diasRestantes, p.estado])).toEqual([['hoy', 0, 'hoy']]);
  });

  it('el día 31 de un mes de 30 días vence el 30', () => {
    const lista = pagosPendientesDelMes([fijo({ diaPago: 31 })], [], '2026-11', '2026-11-30');
    expect(lista.map(p => [p.dia, p.estado])).toEqual([[30, 'hoy']]);
  });

  it('sin datos válidos devuelve una lista vacía', () => {
    expect(pagosPendientesDelMes(null, null, '2026-11', HOY)).toEqual([]);
    expect(pagosPendientesDelMes([fijo()], [], 'noviembre', HOY)).toEqual([]);
    expect(pagosPendientesDelMes([fijo()], [], '2026-11', '16/11/2026')).toEqual([]);
  });
});
