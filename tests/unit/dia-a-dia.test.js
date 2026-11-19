/**
 * dia-a-dia.test.js - Día a día en el teléfono (GAS.8b, ADR 182 D2): la
 * comparación en pesos a la misma altura del mes, el reparto por categoría y
 * las semanas del mes.
 */

import { describe, it, expect } from 'vitest';
import { comparacionDelMes, repartoPorCategoria, semanasDelMes, agruparPorDia } from '../../modules/dominio/gastos/logic.js';

const g = (fecha, monto, categoria = 'Mercado') => ({ fecha, monto, categoria });

describe('comparacionDelMes', () => {
  const hoy = new Date(2026, 10, 19); // jueves 19 de noviembre

  it('en el mes corriente compara contra el anterior hasta el mismo día', () => {
    const gastos = [g('2026-11-03', 100_000), g('2026-10-05', 120_000), g('2026-10-25', 500_000)];
    expect(comparacionDelMes(gastos, 2026, 10, hoy)).toEqual({ diferencia: -20_000, mesPrevio: 9, aLaAltura: true });
  });

  it('en un mes cerrado compara contra el anterior entero', () => {
    const gastos = [g('2026-10-05', 120_000), g('2026-10-25', 500_000), g('2026-09-30', 600_000)];
    expect(comparacionDelMes(gastos, 2026, 9, hoy)).toEqual({ diferencia: 20_000, mesPrevio: 8, aLaAltura: false });
  });

  it('enero mira a diciembre del año anterior', () => {
    expect(comparacionDelMes([g('2025-12-02', 50_000), g('2026-01-02', 80_000)], 2026, 0, new Date(2026, 0, 10)))
      .toEqual({ diferencia: 30_000, mesPrevio: 11, aLaAltura: true });
  });

  it('sin base no hay comparación', () => {
    expect(comparacionDelMes([g('2026-11-03', 100_000)], 2026, 10, hoy)).toBeNull();
    expect(comparacionDelMes([g('2026-10-25', 100_000)], 2026, 10, hoy)).toBeNull();
  });
});

describe('repartoPorCategoria', () => {
  it('de más a menos, con su porcentaje redondeado', () => {
    const r = repartoPorCategoria([g('', 54, 'Mercado'), g('', 22, 'Restaurantes'), g('', 22, 'Ropa'), g('', 2, 'Transporte')]);
    expect(r.map(x => [x.categoria, x.pct])).toEqual([['Mercado', 54], ['Restaurantes', 22], ['Ropa', 22], ['Transporte', 2]]);
  });

  it('sin categoría cuenta como Otros y lo que suma cero no entra', () => {
    expect(repartoPorCategoria([{ monto: 10 }, g('', 0, 'Café')])).toEqual([{ categoria: 'Otros', total: 10, pct: 100 }]);
  });
});

describe('semanasDelMes', () => {
  it('de lunes a domingo, la más reciente primero, recortadas al mes', () => {
    const dias = agruparPorDia([
      g('2026-11-19', 12_000), g('2026-11-17', 38_000),
      g('2026-11-13', 300_000), g('2026-11-11', 8_000),
      g('2026-11-01', 5_000),
    ]);
    const s = semanasDelMes(dias, 2026, 10);
    expect(s.map(x => [x.desde, x.hasta, x.cantidad, x.total])).toEqual([
      [16, 22, 2, 50_000],
      [9, 15, 2, 308_000],
      [1, 1, 1, 5_000],
    ]);
    expect(s[0].dias.map(d => d.fecha)).toEqual(['2026-11-19', '2026-11-17']);
  });

  it('la última semana del mes termina el último día', () => {
    const s = semanasDelMes(agruparPorDia([g('2026-09-30', 1)]), 2026, 8);
    expect([s[0].desde, s[0].hasta]).toEqual([28, 30]);
  });
});
