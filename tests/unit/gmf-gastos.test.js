/**
 * gmf-gastos.test.js - GMF.1b (ADR 165 D4): un gasto o un pago que sale de
 * una cuenta que paga 4x1000 lo descuenta del saldo y lo guarda; editar,
 * borrar y deshacer lo devuelven; Movimientos lo cuenta. Nunca deja la cuenta
 * bajo $0. Valores de 2026. Todos los datos son inventados.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import { guardar } from '../../modules/infra/crud.js';
import { gmfDeRetiro, aplicarPagosCompromisos } from '../../modules/infra/pago-compromiso.js';
import { deltasPorEdicionDeGasto, planSiNoAlcanza } from '../../modules/dominio/gastos/logic.js';
import { movimientosDesdeGastos, efectoEnCuenta } from '../../modules/dominio/movimientos/logic.js';

const PAGA = { id: 'b', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', exenta4x1000: false, aplica4x1000: true, activa: true };

describe('GMF.1b - la lógica pura', () => {
  it('lo que el gasto movió incluye su 4x1000: borrar lo devuelve entero', () => {
    expect(deltasPorEdicionDeGasto({ cuentaId: 'b', monto: 100_000, costoGMF: 400 }, null)).toEqual({ b: 100_400 });
    // Subir el monto: la diferencia con su 4x1000 nuevo.
    expect(deltasPorEdicionDeGasto({ cuentaId: 'b', monto: 100_000, costoGMF: 400 }, { cuentaId: 'b', monto: 150_000, costoGMF: 600 }))
      .toEqual({ b: -50_200 });
  });

  it('al editar, lo que el gasto ya descontó con su 4x1000 vuelve a contar', () => {
    const cuentas = [{ id: 'b', nombre: 'Bancolombia', saldo: 0, activa: true }];
    expect(planSiNoAlcanza(cuentas, 100_000, 'b', { cuentaId: 'b', monto: 100_000, costoGMF: 400 })).toBeNull();
  });

  it('Movimientos resta el 4x1000 del gasto y lo trae en la fila', () => {
    const movs = movimientosDesdeGastos([{ id: 'g1', cuentaId: 'b', monto: 100_000, costoGMF: 400, fecha: '2026-11-10', categoria: 'Mercado' }]);
    expect(movs[0].costoGMF).toBe(400);
    expect(efectoEnCuenta(movs, 'b')).toBe(-100_400);
  });
});

describe('GMF.1b - con el estado', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
  });

  it('gmfDeRetiro: el 0,4 % de una cuenta que paga, sin dejarla bajo $0', () => {
    guardar('cuentas', { ...PAGA, saldo: 500_000 });
    expect(gmfDeRetiro('b', 100_000, '2026-11-10')).toBe(400);
    // Si el saldo apenas cubre el monto, cobra lo que alcance.
    expect(gmfDeRetiro('b', 499_800, '2026-11-10')).toBe(200);
    expect(gmfDeRetiro('b', 500_000, '2026-11-10')).toBe(0);
  });

  it('gmfDeRetiro: la marcada no paga hasta su tope; sin definir, nada', () => {
    guardar('cuentas', { ...PAGA, id: 'm', exenta4x1000: true, aplica4x1000: false, saldo: 30_000_000 });
    guardar('cuentas', { id: 's', nombre: 'Davivienda', banco: 'Davivienda', tipo: 'Ahorros', saldo: 1_000_000, activa: true });
    expect(gmfDeRetiro('m', 1_000_000, '2026-11-10')).toBe(0);
    guardar('gastos', { id: 'g0', cuentaId: 'm', monto: 18_000_000, fecha: '2026-11-02', categoria: 'Hogar' });
    expect(gmfDeRetiro('m', 1_000_000, '2026-11-10')).toBe(2_676); // 669.100 sobre el tope
    expect(gmfDeRetiro('s', 100_000, '2026-11-10')).toBe(0);
  });

  it('un pago de un fijo descuenta el monto más su 4x1000 y lo guarda en el gasto', () => {
    guardar('cuentas', { ...PAGA, saldo: 1_000_000 });
    const comp = guardar('compromisos', { id: 'k1', descripcion: 'Arriendo', tipo: 'fijo', categoria: 'Vivienda', monto: 800_000, activo: true });
    aplicarPagosCompromisos([{ comp, fecha: '2026-11-05', partes: [{ cuentaId: 'b', monto: 800_000 }] }]);
    expect(S.gastos.at(-1)).toMatchObject({ monto: 800_000, costoGMF: 3_200, cuentaId: 'b' });
    expect(S.cuentas.find(c => c.id === 'b').saldo).toBe(196_800);
  });
});
