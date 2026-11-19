/**
 * retiro.test.js - Retirar efectivo (MC.20a, ADR 171 D3 a D5): la comisión
 * del cajero viaja con la transferencia y cuenta como el 4x1000 en el cálculo,
 * en lo que las filas dicen de una cuenta (R-HF2) y en Movimientos.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizarTransferencia, calcularTransferencia, validarRetiro, cuentasDeRetiro,
  cuentaEfectivoNueva, esCuentaEfectivo, EFECTIVO_NUEVO,
} from '../../modules/dominio/tesoreria/logic/transferencias.js';
import {
  movimientosDesdeTransferencias, efectoEnCuenta, descripcionMovimiento, esRetiro,
} from '../../modules/dominio/movimientos/logic.js';

const banco = { id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 1_000_000, activa: true };
const efectivo = { id: 'ef', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 50_000, activa: true };
const datos = (o = {}) => ({ cuentaOrigenId: 'c1', cuentaDestinoId: 'ef', monto: '200000', fecha: '2026-11-19', ...o });

describe('la comisión del retiro (ADR 171 D4)', () => {
  it('normalizar la guarda solo si es positiva, junto al 4x1000', () => {
    expect(normalizarTransferencia(datos(), 800, 7_200)).toMatchObject({ monto: 200_000, costoGMF: 800, comision: 7_200 });
    expect(normalizarTransferencia(datos(), 0, 0)).not.toHaveProperty('comision');
    expect(normalizarTransferencia(datos(), 0, -5)).not.toHaveProperty('comision');
  });

  it('calcular la saca del origen con el monto y el 4x1000; al destino llega el monto', () => {
    const plan = calcularTransferencia({ cuentaOrigenId: 'c1', cuentaDestinoId: 'ef', monto: 200_000, costoGMF: 800, comision: 7_200 }, [banco, efectivo]);
    expect(plan.actualizaciones).toEqual([{ cuentaId: 'c1', saldo: 792_000 }, { cuentaId: 'ef', saldo: 250_000 }]);
    expect(plan.deltas.reduce((s, d) => s + d.delta, 0)).toBe(-8_000);
  });

  it('las filas dicen lo mismo que el cálculo (R-HF2)', () => {
    const movs = movimientosDesdeTransferencias([{ id: 't1', cuentaOrigenId: 'c1', cuentaDestinoId: 'ef', monto: 200_000, costoGMF: 800, comision: 7_200, fecha: '2026-11-19' }]);
    expect(movs[0].comision).toBe(7_200);
    expect(efectoEnCuenta(movs, 'c1')).toBe(-208_000);
    expect(efectoEnCuenta(movs, 'ef')).toBe(200_000);
  });
});

describe('Retirar efectivo (ADR 171 D3)', () => {
  it('sale de las cuentas que no son efectivo y llega a las de efectivo', () => {
    const { origenes, efectivos } = cuentasDeRetiro([banco, efectivo, { ...banco, id: 'x', activa: false }]);
    expect(origenes.map(c => c.id)).toEqual(['c1']);
    expect(efectivos.map(c => c.id)).toEqual(['ef']);
    expect(esCuentaEfectivo(efectivo)).toBe(true);
    expect(esCuentaEfectivo({ tipo: 'Efectivo' })).toBe(true);
    expect(esCuentaEfectivo(banco)).toBe(false);
  });

  it('sin Efectivo, el destino nuevo es válido y la cuenta que se crea es un efectivo en $0', () => {
    expect(validarRetiro(datos({ cuentaDestinoId: EFECTIVO_NUEVO }), [banco])).toEqual([]);
    expect(cuentaEfectivoNueva()).toMatchObject({ nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 0, aplica4x1000: false });
  });

  it('pide el monto con sus palabras y una comisión que sea un número', () => {
    expect(validarRetiro(datos({ monto: '' }), [banco, efectivo])).toContain('Escribe cuánto sacaste. Por ejemplo: 200.000');
    expect(validarRetiro(datos({ comision: 'abc' }), [banco, efectivo])).toContain('Escribe cuánto te cobraron, o déjalo en blanco.');
    expect(validarRetiro(datos({ comision: '' }), [banco, efectivo])).toEqual([]);
  });
});

describe('cómo se ve en Movimientos (ADR 171 D5)', () => {
  it('una transferencia a efectivo es "Retiro de ..."; las demás no cambian', () => {
    const nequi = { id: 'c2', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', activa: true };
    const cuentas = [banco, efectivo, nequi];
    const retiro = { tipo: 'transferencia', cuentaOrigenId: 'c1', cuentaDestinoId: 'ef' };
    const traslado = { tipo: 'transferencia', cuentaOrigenId: 'c1', cuentaDestinoId: 'c2' };
    expect(esRetiro(retiro, cuentas)).toBe(true);
    expect(descripcionMovimiento(retiro, cuentas)).toBe('Retiro de Bancolombia');
    expect(esRetiro(traslado, cuentas)).toBe(false);
    expect(descripcionMovimiento(traslado, cuentas)).toBe('Bancolombia → Nequi');
  });
});
