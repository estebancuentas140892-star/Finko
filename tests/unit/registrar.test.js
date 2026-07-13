/**
 * registrar.test.js - NAV.A2b: lógica de destinos de la hoja "Registrar".
 *
 * Cubre las funciones puras que deciden qué destinos ofrece la hoja para
 * Abono a deuda y Aporte a ahorro (el patrón 0/1/varias se resuelve en la
 * capa de render a partir de estos arrays).
 */

import { describe, it, expect } from 'vitest';
import { destinosAbono, destinosAporte, cuentasActivasParaTransferir } from '../../modules/ui/registrar.js';

describe('destinosAbono', () => {
  it('incluye solo deudas activas con saldo pendiente', () => {
    const compromisos = [
      { id: 'd1', tipo: 'deuda-entidad',  descripcion: 'Tarjeta',  saldoTotal: 500_000 },
      { id: 'd2', tipo: 'deuda-personal', descripcion: 'Préstamo', saldoTotal: 200_000 },
      { id: 'f1', tipo: 'fijo',           descripcion: 'Arriendo', monto: 1_000_000 },      // no es deuda
      { id: 'd3', tipo: 'deuda-entidad',  descripcion: 'Saldada',  saldoTotal: 0 },          // saldo 0
      { id: 'd4', tipo: 'deuda-entidad',  descripcion: 'Archivada', saldoTotal: 300_000, activo: false }, // archivada
    ];
    const r = destinosAbono(compromisos);
    expect(r.map(d => d.id)).toEqual(['d1', 'd2']);
    expect(r[0]).toEqual({ id: 'd1', label: 'Tarjeta', monto: 500_000 });
  });

  it('devuelve [] con entrada vacía o no-array', () => {
    expect(destinosAbono([])).toEqual([]);
    expect(destinosAbono(undefined)).toEqual([]);
    expect(destinosAbono(null)).toEqual([]);
  });
});

describe('destinosAporte', () => {
  it('incluye fondo activo, metas no completadas y apartados, en ese orden', () => {
    const ahorro = {
      fondoEmergencia: { activo: true, montoActual: 1_000_000 },
      aportes: [{ monto: 200_000 }, { monto: 50_000 }],
    };
    const metas = [
      { id: 'm1', nombre: 'Viaje', montoActual: 300_000 },
      { id: 'm2', nombre: 'Lograda', montoActual: 999, completada: true },  // excluida
    ];
    const apartados = [{ id: 'a1', nombre: 'SOAT', montoActual: 120_000 }];

    const r = destinosAporte(ahorro, metas, apartados);
    expect(r).toEqual([
      { targetAction: 'ahorro-nuevo-aporte', id: null, label: 'Fondo de emergencia', monto: 1_250_000 },
      { targetAction: 'abonar-meta',         id: 'm1', label: 'Viaje',               monto: 300_000 },
      { targetAction: 'aportar-apartado',    id: 'a1', label: 'SOAT',                monto: 120_000 },
    ]);
  });

  it('omite el fondo si no está activo', () => {
    const r = destinosAporte({ fondoEmergencia: { activo: false, montoActual: 500_000 } }, [], []);
    expect(r).toEqual([]);
  });

  it('el fondo sin aportes usa solo su montoActual', () => {
    const r = destinosAporte({ fondoEmergencia: { activo: true, montoActual: 800_000 } }, [], []);
    expect(r).toEqual([
      { targetAction: 'ahorro-nuevo-aporte', id: null, label: 'Fondo de emergencia', monto: 800_000 },
    ]);
  });

  it('tolera slices ausentes', () => {
    expect(destinosAporte(undefined, undefined, undefined)).toEqual([]);
    expect(destinosAporte(null, null, null)).toEqual([]);
  });
});

describe('cuentasActivasParaTransferir', () => {
  it('cuenta solo las cuentas activas (MC.17e)', () => {
    const cuentas = [
      { id: 'c1', activa: true },
      { id: 'c2' },                    // sin campo activa = activa
      { id: 'c3', activa: false },     // archivada, no cuenta
    ];
    expect(cuentasActivasParaTransferir(cuentas)).toBe(2);
  });

  it('devuelve 0 con entrada vacía o no-array', () => {
    expect(cuentasActivasParaTransferir([])).toBe(0);
    expect(cuentasActivasParaTransferir(undefined)).toBe(0);
    expect(cuentasActivasParaTransferir(null)).toBe(0);
  });
});
