/**
 * distribuir-pago.test.js - reparto de un pago entre varias cuentas.
 *
 * Función pura: cubre orden (mayor saldo primero), tope por saldo (sin
 * negativos), cobertura parcial y casos borde.
 */

import { describe, it, expect } from 'vitest';
import { distribuirPago } from '../../modules/infra/distribuir-pago.js';

const cta = (id, saldo) => ({ id, saldo });

describe('distribuirPago()', () => {
  it('cubre el monto con una sola cuenta cuando alcanza', () => {
    const r = distribuirPago([cta('a', 1_000_000)], 300_000);
    expect(r.ok).toBe(true);
    expect(r.splits).toEqual([{ cuentaId: 'a', monto: 300_000 }]);
    expect(r.cubierto).toBe(300_000);
    expect(r.faltante).toBe(0);
  });

  it('cobra primero de la cuenta con más saldo', () => {
    const r = distribuirPago([cta('chica', 100_000), cta('grande', 900_000)], 500_000);
    expect(r.ok).toBe(true);
    // Toda la cobra de "grande" (mayor saldo primero); "chica" no se usa.
    expect(r.splits).toEqual([{ cuentaId: 'grande', monto: 500_000 }]);
  });

  it('reparte entre dos cuentas cuando una no alcanza', () => {
    const r = distribuirPago([cta('a', 600_000), cta('b', 500_000)], 900_000);
    expect(r.ok).toBe(true);
    expect(r.splits).toEqual([
      { cuentaId: 'a', monto: 600_000 },
      { cuentaId: 'b', monto: 300_000 },
    ]);
    expect(r.splits.reduce((s, x) => s + x.monto, 0)).toBe(900_000);
  });

  it('nunca deja una cuenta en negativo: solo toma hasta el saldo', () => {
    const r = distribuirPago([cta('a', 200_000), cta('b', 150_000)], 1_000_000);
    expect(r.ok).toBe(false);
    expect(r.splits).toEqual([
      { cuentaId: 'a', monto: 200_000 },
      { cuentaId: 'b', monto: 150_000 },
    ]);
    expect(r.cubierto).toBe(350_000);
    expect(r.faltante).toBe(650_000);
  });

  it('ignora cuentas con saldo 0 o negativo', () => {
    const r = distribuirPago([cta('a', 0), cta('b', -50_000), cta('c', 400_000)], 400_000);
    expect(r.ok).toBe(true);
    expect(r.splits).toEqual([{ cuentaId: 'c', monto: 400_000 }]);
  });

  it('devuelve ok=false con monto 0', () => {
    const r = distribuirPago([cta('a', 500_000)], 0);
    expect(r.ok).toBe(false);
    expect(r.splits).toEqual([]);
    expect(r.faltante).toBe(0);
  });

  it('devuelve ok=false sin cuentas', () => {
    const r = distribuirPago([], 100_000);
    expect(r.ok).toBe(false);
    expect(r.splits).toEqual([]);
    expect(r.faltante).toBe(100_000);
  });

  it('es tolerante a entradas inválidas', () => {
    expect(distribuirPago(null, 100).ok).toBe(false);
    expect(distribuirPago(undefined, 100).splits).toEqual([]);
    expect(distribuirPago([cta('a', 500)], 'x').ok).toBe(false);
  });

  it('con prioridadId cobra primero de esa cuenta, luego completa con las demás', () => {
    // La elegida ("chica", 100k) no cubre 300k: se usa toda y el resto sale de "grande".
    const r = distribuirPago([cta('chica', 100_000), cta('grande', 900_000)], 300_000, 'chica');
    expect(r.ok).toBe(true);
    expect(r.splits).toEqual([
      { cuentaId: 'chica', monto: 100_000 },
      { cuentaId: 'grande', monto: 200_000 },
    ]);
  });

  it('con prioridadId, las demás conservan el orden mayor-saldo-primero', () => {
    const r = distribuirPago(
      [cta('pref', 50_000), cta('media', 300_000), cta('alta', 800_000)],
      600_000,
      'pref',
    );
    expect(r.ok).toBe(true);
    // pref (50k) primero, luego alta (800k) cubre el resto; media no se usa.
    expect(r.splits).toEqual([
      { cuentaId: 'pref', monto: 50_000 },
      { cuentaId: 'alta', monto: 550_000 },
    ]);
  });

  it('con prioridadId que cubre por sí sola: solo usa esa cuenta', () => {
    const r = distribuirPago([cta('pref', 900_000), cta('otra', 800_000)], 300_000, 'pref');
    expect(r.splits).toEqual([{ cuentaId: 'pref', monto: 300_000 }]);
  });
});
