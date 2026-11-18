/**
 * gmf.test.js - el 4x1000 de cada cuenta (GMF.1, ADR 165): la marcada no paga
 * hasta 350 UVT al mes, un depósito de bajo monto hasta 65 UVT, una corriente
 * paga en cada retiro y los traslados entre cuentas del mismo banco no pagan.
 * Valores de 2026 (UVT $52.374). Todos los datos son inventados.
 */
import { describe, it, expect } from 'vitest';
import {
  regimenGMF, costoGMF, retirosGMFDelMes, trasladoMismoBanco, puedeSerMarcada, esBajoMonto,
  textoRegimenGMF, TOPE_GMF_MARCADA, TOPE_GMF_BAJO_MONTO,
} from '../../modules/infra/gmf.js';
import { f } from '../../modules/infra/utils.js';

const ahorros = (extra = {}) => ({ id: 'a', banco: 'Bancolombia', tipo: 'Ahorros', ...extra });

describe('regimenGMF()', () => {
  it('los topes son los de 2026', () => {
    expect(TOPE_GMF_MARCADA).toBe(18_330_900);
    expect(TOPE_GMF_BAJO_MONTO).toBe(3_404_310);
  });

  it('cada cuenta según su clase, su tipo y la marca', () => {
    expect(regimenGMF({ banco: 'Efectivo', tipo: 'Efectivo' }).tipo).toBe('no-aplica');
    expect(regimenGMF({ banco: 'Bancolombia', tipo: 'Corriente', exenta4x1000: true }).tipo).toBe('sujeta');
    expect(regimenGMF(ahorros({ exenta4x1000: true }))).toEqual({ tipo: 'exenta', tope: TOPE_GMF_MARCADA });
    expect(regimenGMF(ahorros({ exenta4x1000: false })).tipo).toBe('sujeta');
    expect(regimenGMF({ banco: 'Nequi', tipo: 'Nequi' })).toEqual({ tipo: 'exenta', tope: TOPE_GMF_BAJO_MONTO });
    expect(regimenGMF({ banco: 'Nubank', tipo: 'Nubank', exenta4x1000: true }).tipo).toBe('exenta');
  });

  it('una cuenta de antes: con la casilla de pagar, paga; sin nada, no se cobra hasta que lo diga', () => {
    expect(regimenGMF(ahorros({ aplica4x1000: true })).tipo).toBe('sujeta');
    expect(regimenGMF(ahorros()).tipo).toBe('sin-definir');
    // Un Nequi que decía pagar sigue pagando: se respeta lo que la persona dijo.
    expect(esBajoMonto({ banco: 'Nequi', aplica4x1000: true })).toBe(false);
    expect(regimenGMF({ banco: 'Nequi', tipo: 'Nequi', aplica4x1000: true }).tipo).toBe('sujeta');
  });

  it('puede ser la marcada una de ahorros o una billetera que no es de bajo monto', () => {
    expect(puedeSerMarcada(ahorros())).toBe(true);
    expect(puedeSerMarcada({ banco: 'Bancolombia', tipo: 'Corriente' })).toBe(false);
    expect(puedeSerMarcada({ banco: 'Nequi', tipo: 'Nequi' })).toBe(false);
    expect(puedeSerMarcada({ banco: 'Lulo Bank', tipo: 'Lulo Bank' })).toBe(true);
    expect(puedeSerMarcada({ banco: 'Efectivo', tipo: 'Efectivo' })).toBe(false);
  });

  it('lo dice en una línea', () => {
    expect(textoRegimenGMF(ahorros({ exenta4x1000: true }), f)).toBe('Cuenta marcada: no paga 4x1000 hasta $18.330.900 al mes');
    expect(textoRegimenGMF({ banco: 'Daviplata', tipo: 'Daviplata' }, f)).toBe('Bajo monto: no paga 4x1000 hasta $3.404.310 al mes');
    expect(textoRegimenGMF(ahorros({ exenta4x1000: false }), f)).toBe('Paga 4x1000 en cada retiro');
    expect(textoRegimenGMF({ banco: 'Efectivo' }, f)).toBe('');
  });
});

describe('costoGMF()', () => {
  it('una cuenta que paga: el 0,4 % redondeado', () => {
    expect(costoGMF(ahorros({ exenta4x1000: false }), 200_000)).toBe(800);
    expect(costoGMF(ahorros({ exenta4x1000: false }), 12_345)).toBe(49);
  });

  it('la marcada: solo lo que pasa del tope del mes', () => {
    const marcada = ahorros({ exenta4x1000: true });
    expect(costoGMF(marcada, 1_000_000, 0)).toBe(0);
    expect(costoGMF(marcada, 1_000_000, TOPE_GMF_MARCADA - 500_000)).toBe(2_000); // 500.000 gravados
    expect(costoGMF(marcada, 1_000_000, TOPE_GMF_MARCADA + 1)).toBe(4_000);
  });

  it('sin definir, el efectivo o un monto vacío: nada', () => {
    expect(costoGMF(ahorros(), 1_000_000)).toBe(0);
    expect(costoGMF({ banco: 'Efectivo' }, 1_000_000)).toBe(0);
    expect(costoGMF(ahorros({ exenta4x1000: false }), 0)).toBe(0);
  });
});

describe('retirosGMFDelMes() y trasladoMismoBanco()', () => {
  const cuentas = [
    { id: 'a', banco: 'Bancolombia' }, { id: 'b', banco: 'Bancolombia' }, { id: 'n', banco: 'Nequi' },
  ];

  it('suma los gastos y las transferencias a otro banco del mes; no los importados ni los traslados propios', () => {
    const gastos = [
      { id: 'g1', cuentaId: 'a', monto: 100_000, fecha: '2026-11-03' },
      { id: 'g2', cuentaId: 'a', monto: 50_000, fecha: '2026-10-30' },
      { id: 'g3', cuentaId: 'a', monto: 70_000, fecha: '2026-11-05', sinEfectoSaldo: true },
      { id: 'g4', cuentaId: 'n', monto: 9_000, fecha: '2026-11-05' },
    ];
    const transferencias = [
      { id: 't1', cuentaOrigenId: 'a', cuentaDestinoId: 'n', monto: 200_000, fecha: '2026-11-07' },
      { id: 't2', cuentaOrigenId: 'a', cuentaDestinoId: 'b', monto: 300_000, fecha: '2026-11-08' },
    ];
    expect(retirosGMFDelMes('a', { gastos, transferencias, cuentas }, '2026-11')).toBe(300_000);
    expect(retirosGMFDelMes('a', { gastos, transferencias, cuentas }, '2026-11-20', { excluirId: 'g1' })).toBe(200_000);
  });

  it('mismo banco: no paga; "Otro" o el efectivo no dicen qué banco es', () => {
    expect(trasladoMismoBanco(cuentas[0], cuentas[1])).toBe(true);
    expect(trasladoMismoBanco(cuentas[0], cuentas[2])).toBe(false);
    expect(trasladoMismoBanco({ banco: 'Otro' }, { banco: 'Otro' })).toBe(false);
    expect(trasladoMismoBanco({ banco: 'Efectivo' }, { banco: 'Efectivo' })).toBe(false);
  });
});
