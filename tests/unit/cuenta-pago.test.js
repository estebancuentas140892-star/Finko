/**
 * cuenta-pago.test.js - la hoja "¿Desde qué cuenta pagas?" (INI.2d, ADR 152
 * D6; antes AH.1c, ADR 150 D5).
 *
 * Cubre:
 * - cuentaPropuesta(): la preferida activa o la de mayor saldo.
 * - cuentaFrenteAlPago(): cuánto queda o cuánto falta.
 * - htmlHojaCuentaPago(): "Total a pagar", una fila por cuenta con su logo,
 *   entidad, tipo, saldo y marca; la marcada que no alcanza lleva un solo
 *   mensaje según el caso (INI.3, ADR 153 D3 y D4).
 * - opcionesSiNoAlcanza(): otra cuenta sola, varias, o ninguna alcanza.
 * - resolverPagoConSelector(): el título, marcar otra repinta y cambia el
 *   botón ("Pagar $X", "Completar con otra cuenta" o apagado), la X cierra,
 *   la flecha devuelve VOLVER.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  cuentaPropuesta,
  cuentaFrenteAlPago,
  htmlHojaCuentaPago,
  opcionesSiNoAlcanza,
  resolverPagoConSelector,
  VOLVER,
} from '../../modules/infra/cuenta-helper.js';
import { f } from '../../modules/infra/utils.js';

const cuenta = (id, nombre, banco, saldo, tipo = 'Ahorros') => ({ id, nombre, banco, saldo, tipo, activa: true });
const CUENTAS = [
  cuenta('c1', 'Bancolombia', 'Bancolombia', 1_840_000),
  cuenta('c2', 'Nequi', 'Nequi', 512_500),
  cuenta('c4', 'Davivienda', 'Davivienda', 9_800),
];
const div = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };

afterEach(() => {
  document.querySelectorAll('.modal-overlay').forEach(o => o.remove());
});

describe('cuentaPropuesta()', () => {
  it('la preferida si está entre las activas; si no, la de mayor saldo', () => {
    expect(cuentaPropuesta(CUENTAS, 'c2').id).toBe('c2');
    expect(cuentaPropuesta(CUENTAS, 'no-existe').id).toBe('c1');
    expect(cuentaPropuesta(CUENTAS).id).toBe('c1');
  });
});

describe('cuentaFrenteAlPago()', () => {
  it('dice cuánto queda si alcanza y cuánto falta si no', () => {
    expect(cuentaFrenteAlPago(CUENTAS[0], 463_800)).toEqual({ alcanza: true, queda: 1_376_200, falta: 0 });
    expect(cuentaFrenteAlPago(CUENTAS[2], 463_800)).toEqual({ alcanza: false, queda: 0, falta: 454_000 });
  });
});

describe('htmlHojaCuentaPago()', () => {
  it('"Total a pagar" y una fila por cuenta: logo, nombre, tipo, saldo y marca', () => {
    const d = div(htmlHojaCuentaPago(CUENTAS, 463_800, 'c1'));
    expect(d.querySelector('.cuenta-pago__total').textContent).toBe(`Total a pagar ${f(463_800)}`);
    const opciones = [...d.querySelectorAll('.cuenta-pago__opcion')];
    expect(opciones).toHaveLength(3);
    expect(d.querySelector('input[name="cuentaId"]:checked').value).toBe('c1');
    expect(opciones[0].querySelector('.cuenta-pago__logo .bank-avatar use').getAttribute('href')).toBe('#b-bancolombia');
    expect(opciones[0].querySelector('.cuenta-pago__tipo').textContent).toBe('Cuenta de ahorros');
    expect(opciones[1].querySelector('.cuenta-pago__tipo').textContent).toBe('Depósito de bajo monto');
    expect(opciones.map(o => o.querySelector('.cuenta-pago__saldo').textContent)).toEqual([f(1_840_000), f(512_500), f(9_800)]);
    expect(opciones[0].querySelector('.cuenta-pago__marca').getAttribute('aria-hidden')).toBe('true');
    expect(d.querySelector('fieldset.cuenta-pago__lista legend').textContent).toBe('Cuenta de origen');
    // La que alcanza no lleva aviso.
    expect(d.querySelector('.cuenta-pago__falta')).toBeNull();
  });

  it('la marcada que no alcanza dice cuánto falta, debajo de su fila', () => {
    const d = div(htmlHojaCuentaPago(CUENTAS, 463_800, 'c4'));
    const falta = d.querySelector('.cuenta-pago__falta');
    expect(falta.getAttribute('role')).toBe('status');
    expect(falta.previousElementSibling.querySelector('input').value).toBe('c4');
    // INI.3 (ADR 153 D4): otra cuenta sola alcanza, así que el mensaje lo dice.
    expect(falta.textContent.trim()).toBe(`No tienes saldo suficiente en esta cuenta para cubrir el pago: faltan ${f(454_000)}. Puedes elegir otra cuenta o varias para completar el valor. Si ya pasaste el dinero a una sola cuenta, elígela para registrar el pago.`);
    expect(d.querySelectorAll('.cuenta-pago__falta')).toHaveLength(1);
  });

  it('INI.3: si solo sumando varias alcanza, no habla de una sola cuenta', () => {
    // 1.840.000 + 512.500 cubren 2.000.000, ninguna sola.
    const d = div(htmlHojaCuentaPago(CUENTAS, 2_000_000, 'c1'));
    expect(d.querySelector('.cuenta-pago__falta').textContent.trim()).toBe(`No tienes saldo suficiente en esta cuenta para cubrir el pago: faltan ${f(160_000)}. Puedes completar el valor con varias cuentas o pasar primero el dinero a una sola.`);
  });

  it('INI.3: si ni sumando todas alcanza, dice cuánto falta en total y qué hacer', () => {
    const d = div(htmlHojaCuentaPago(CUENTAS, 3_000_000, 'c1'));
    const total = 1_840_000 + 512_500 + 9_800;
    expect(d.querySelector('.cuenta-pago__falta').textContent.trim()).toBe(`No tienes saldo suficiente para cubrir el pago, ni sumando todas tus cuentas: faltan ${f(3_000_000 - total)}. Registra primero en tus cuentas el dinero que necesitas.`);
  });

  it('INI.3: la entidad arriba y el tipo debajo, sin repetirlo', () => {
    const d = div(htmlHojaCuentaPago([
      cuenta('a', 'Banco de Bogotá Ahorros', 'Banco de Bogotá', 900_000),
      cuenta('b', 'Davivienda Corriente', 'Davivienda', 50_000, 'Corriente'),
      cuenta('n', 'Nequi', 'Nequi', 10_000, 'Nequi'),
      cuenta('e', 'Efectivo', 'Efectivo', 5_000, 'Efectivo'),
    ], 1_000, 'a'));
    const filas = [...d.querySelectorAll('.cuenta-pago__opcion')].map(o => [
      o.querySelector('.cuenta-pago__nombre').textContent,
      o.querySelector('.cuenta-pago__tipo')?.textContent ?? '',
    ]);
    expect(filas).toEqual([
      ['Banco de Bogotá', 'Cuenta de ahorros'],
      ['Davivienda', 'Cuenta corriente'],
      ['Nequi', 'Depósito de bajo monto'],
      ['Efectivo', ''],
    ]);
  });

  it('los nombres se escapan', () => {
    const d = div(htmlHojaCuentaPago([cuenta('x', '<b>x</b>', 'Otro', 1)], 1));
    expect(d.querySelector('.cuenta-pago__nombre').textContent).toBe('<b>x</b>');
  });
});

describe('opcionesSiNoAlcanza() (INI.3, ADR 153 D4)', () => {
  it('null si la marcada alcanza', () => {
    expect(opcionesSiNoAlcanza(CUENTAS, 463_800, 'c1')).toBeNull();
  });
  it('"otra": otra cuenta sola cubre el pago', () => {
    expect(opcionesSiNoAlcanza(CUENTAS, 463_800, 'c4')).toEqual({ caso: 'otra', falta: 454_000, faltaTotal: 0 });
  });
  it('"varias": ninguna sola, pero sumando sí', () => {
    expect(opcionesSiNoAlcanza(CUENTAS, 2_000_000, 'c1')).toEqual({ caso: 'varias', falta: 160_000, faltaTotal: 0 });
  });
  it('"ninguna": ni sumando todas; una cuenta en negativo no aporta', () => {
    const conNegativa = [...CUENTAS, cuenta('neg', 'Rojo', 'Otro', -500_000)];
    expect(opcionesSiNoAlcanza(conNegativa, 2_400_000, 'c1')).toEqual({ caso: 'ninguna', falta: 560_000, faltaTotal: 37_700 });
  });
});

describe('resolverPagoConSelector(): la hoja', () => {
  const marcar = (id) => {
    const r = document.querySelector(`input[name="cuentaId"][value="${id}"]`);
    r.checked = true;
    r.dispatchEvent(new Event('change', { bubbles: true }));
  };

  it('título, "Pagar $X"; marcar otra repinta y Pagar usa la marcada', async () => {
    const promesa = resolverPagoConSelector(CUENTAS, 463_800, 'pagar', { preferidaId: 'c1' });
    await new Promise(r => setTimeout(r, 0));
    expect(document.getElementById('cuenta-pref-title').textContent).toBe('¿Desde qué cuenta pagas?');
    expect(document.querySelector('.modal--cuenta-pago .confirm__mensaje')).toBeNull();
    // Sin `volver`, no hay flecha.
    expect(document.querySelector('[data-role="volver"]')).toBeNull();
    const pagar = document.querySelector('[data-role="confirmar"]');
    expect(pagar.textContent).toBe(`Pagar ${f(463_800)}`);

    marcar('c2');
    expect(document.querySelector('input[name="cuentaId"]:checked').value).toBe('c2');
    pagar.click();
    expect(await promesa).toEqual([{ cuentaId: 'c2', monto: 463_800 }]);
  });

  it('la que no alcanza: el aviso y "Completar con otra cuenta"', async () => {
    const promesa = resolverPagoConSelector(CUENTAS, 463_800, 'pagar', { preferidaId: 'c1' });
    await new Promise(r => setTimeout(r, 0));
    marcar('c4');
    expect(document.querySelector('.cuenta-pago__falta')).not.toBeNull();
    expect(document.querySelector('[data-role="confirmar"]').textContent).toBe('Completar con otra cuenta');
    marcar('c1');
    expect(document.querySelector('.cuenta-pago__falta')).toBeNull();
    expect(document.querySelector('[data-role="confirmar"]').textContent).toBe(`Pagar ${f(463_800)}`);
    document.querySelector('[data-role="cancelar"]').click();
    expect(await promesa).toBeNull();
  });

  it('INI.3: si ni sumando todas alcanza, el botón se apaga y no cierra la hoja', async () => {
    const promesa = resolverPagoConSelector(CUENTAS, 3_000_000, 'pagar', { preferidaId: 'c1' });
    await new Promise(r => setTimeout(r, 0));
    const pagar = document.querySelector('[data-role="confirmar"]');
    expect(pagar.disabled).toBe(true);
    expect(pagar.textContent).toBe('No alcanza con tus cuentas');
    pagar.click();
    expect(document.querySelector('.modal--cuenta-pago')).not.toBeNull();
    document.querySelector('[data-role="cancelar"]').click();
    expect(await promesa).toBeNull();
  });

  it('INI.3: el dinero ya pasado a una sola cuenta se paga desde ella, sin repartir', async () => {
    // Davivienda no alcanza; Nequi sí (ahí quedó el dinero que se pasó).
    const promesa = resolverPagoConSelector(CUENTAS, 463_800, 'pagar', { preferidaId: 'c4' });
    await new Promise(r => setTimeout(r, 0));
    expect(document.querySelector('[data-role="confirmar"]').textContent).toBe('Completar con otra cuenta');
    marcar('c2');
    const pagar = document.querySelector('[data-role="confirmar"]');
    expect(pagar.textContent).toBe(`Pagar ${f(463_800)}`);
    pagar.click();
    expect(await promesa).toEqual([{ cuentaId: 'c2', monto: 463_800 }]);
  });

  it('la X cierra sin elegir', async () => {
    const promesa = resolverPagoConSelector(CUENTAS, 1_000, 'pagar');
    await new Promise(r => setTimeout(r, 0));
    const cerrar = document.querySelector('.modal--cuenta-pago .modal__close');
    expect(cerrar.getAttribute('aria-label')).toBe('Cerrar');
    cerrar.click();
    expect(await promesa).toBeNull();
  });

  it('con `volver`, la flecha devuelve VOLVER (INI.2d)', async () => {
    const promesa = resolverPagoConSelector(CUENTAS, 1_000, 'pagar', { volver: true });
    await new Promise(r => setTimeout(r, 0));
    const flecha = document.querySelector('.modal--cuenta-pago [data-role="volver"]');
    expect(flecha.getAttribute('aria-label')).toBe('Volver');
    flecha.click();
    expect(await promesa).toBe(VOLVER);
  });
});
