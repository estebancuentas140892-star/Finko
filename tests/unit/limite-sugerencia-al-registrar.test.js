/**
 * GAS.9e (ADR 183 D5): al registrar un gasto, Finko sugiere un límite para
 * la categoría cuando aporta, una vez por categoría y mes, y como mucho una
 * al día. El ejemplo del pedido: varios gastos en Restaurantes sin límite.
 */

import { describe, it, expect } from 'vitest';
import { sugerenciaDeLimiteAlRegistrar, MINIMO_GASTOS_SUGERIR_LIMITE } from '../../modules/dominio/presupuesto/logic.js';

const HOY = '2026-11-19';

let n = 0;
const g = (categoria, monto, o = {}) => ({ id: `g${++n}`, categoria, monto, fecha: HOY, cuentaId: 'nequi', ...o });

/** Tres almuerzos y lo que se pida; el último es el que se acaba de guardar. */
const conTres = (extra = []) => {
  const gastos = [g('Restaurantes', 30_000, { fecha: '2026-11-03' }), g('Restaurantes', 25_000, { fecha: '2026-11-10' }), ...extra, g('Restaurantes', 40_000)];
  return { gastos, gasto: gastos.at(-1) };
};

const sugerir = (o) => sugerenciaDeLimiteAlRegistrar({ presupuestos: [], hoyISO: HOY, ...o });

describe('sugerenciaDeLimiteAlRegistrar()', () => {
  it('el tercer gasto del mes en Restaurantes sin límite sugiere ponerle uno', () => {
    expect(MINIMO_GASTOS_SUGERIR_LIMITE).toBe(3);
    const s = sugerir(conTres());
    expect(s).toEqual({ categoria: 'Restaurantes', parte: null, cantidad: 3, gastado: 95_000, gastadoParte: 0, clave: '2026-11:Restaurantes' });
  });

  it('con dos gastos todavía no dice nada', () => {
    const gastos = [g('Restaurantes', 30_000, { fecha: '2026-11-03' }), g('Restaurantes', 40_000)];
    expect(sugerir({ gastos, gasto: gastos[1] })).toBeNull();
  });

  it('los gastos de otro mes no cuentan', () => {
    const gastos = [g('Restaurantes', 30_000, { fecha: '2026-10-28' }), g('Restaurantes', 25_000, { fecha: '2026-10-30' }), g('Restaurantes', 40_000)];
    expect(sugerir({ gastos, gasto: gastos[2] })).toBeNull();
  });

  it('si la categoría ya tiene un límite, de toda o de una parte, no sugiere', () => {
    expect(sugerir({ ...conTres(), presupuestos: [{ id: 'p', categoria: 'Restaurantes', montoMensual: 300_000, activo: true }] })).toBeNull();
    const deUnaParte = { id: 'p', categoria: 'Restaurantes', montoMensual: 100_000, subcategorias: { 'rest-domicilio': 100_000 }, soloParte: true, activo: true };
    expect(sugerir({ ...conTres(), presupuestos: [deUnaParte] })).toBeNull();
    // Un límite inactivo no cuenta.
    expect(sugerir({ ...conTres(), presupuestos: [{ ...deUnaParte, activo: false }] })).not.toBeNull();
  });

  it('una vez por categoría y mes: ni repetida ni después de "Ahora no"', () => {
    expect(sugerir({ ...conTres(), vistas: ['2026-11:Restaurantes'] })).toBeNull();
    expect(sugerir({ ...conTres(), descartada: '2026-11:Restaurantes' })).toBeNull();
    // La del mes pasado no impide la de este.
    expect(sugerir({ ...conTres(), vistas: ['2026-10:Restaurantes'] })).not.toBeNull();
  });

  it('como mucho una al día, aunque sea otra categoría', () => {
    expect(sugerir({ ...conTres(), ultimoDia: HOY })).toBeNull();
    expect(sugerir({ ...conTres(), ultimoDia: '2026-11-18' })).not.toBeNull();
  });

  it('solo el día a día: el pago de un fijo o de una deuda no suma ni dispara', () => {
    const pagoFijo = g('Restaurantes', 500_000, { compromisoId: 'club', fecha: '2026-11-05' });
    const gastos = [g('Restaurantes', 30_000, { fecha: '2026-11-03' }), pagoFijo, g('Restaurantes', 40_000)];
    expect(sugerir({ gastos, gasto: gastos[2] })).toBeNull();
    expect(sugerir({ gastos: [pagoFijo], gasto: pagoFijo })).toBeNull();
    const deudas = [g('Deudas', 1), g('Deudas', 2), g('Deudas', 3)];
    expect(sugerir({ gastos: deudas, gasto: deudas[2] })).toBeNull();
  });

  it('una compra con la tarjeta sí es un gasto del día a día', () => {
    const { gastos, gasto } = conTres();
    gasto.consumoTC = true;
    gasto.compromisoId = 'visa';
    gasto.cuentaId = null;
    expect(sugerir({ gastos, gasto })?.cantidad).toBe(3);
  });

  it('si una parte pesa la mayoría, la sugerencia es para esa parte', () => {
    const gastos = [
      g('Restaurantes', 45_000, { fecha: '2026-11-03', subcategoriaId: 'rest-domicilio' }),
      g('Restaurantes', 15_000, { fecha: '2026-11-08', subcategoriaId: 'rest-rapida' }),
      g('Restaurantes', 40_000, { subcategoriaId: 'rest-domicilio' }),
    ];
    const s = sugerir({ gastos, gasto: gastos[2] });
    expect(s.parte).toEqual({ id: 'rest-domicilio', nombre: 'Domicilio' });
    expect([s.gastado, s.gastadoParte]).toEqual([100_000, 85_000]);
  });

  it('si todo es de una sola parte, la categoría entera dice lo mismo', () => {
    const gastos = [1, 2, 3].map(i => g('Restaurantes', 10_000 * i, { subcategoriaId: 'rest-domicilio' }));
    expect(sugerir({ gastos, gasto: gastos[2] }).parte).toBeNull();
  });

  it('una categoría propia del usuario también puede pedir límite; una interna no', () => {
    const gatos = [1, 2, 3].map(() => g('Gatos', 20_000));
    expect(sugerir({ gastos: gatos, gasto: gatos[2] })).toBeNull();
    expect(sugerir({ gastos: gatos, gasto: gatos[2], personalizadas: [{ nombre: 'Gatos' }] })?.categoria).toBe('Gatos');
    const fijos = [1, 2, 3].map(() => g('Gastos fijos', 20_000));
    expect(sugerir({ gastos: fijos, gasto: fijos[2] })).toBeNull();
  });
});
