/**
 * cuenta-pago.test.js - la hoja "¿Desde qué cuenta pagas?" (INI.2d, ADR 152
 * D6; antes AH.1c, ADR 150 D5).
 *
 * Cubre:
 * - cuentaPropuesta(): la preferida activa o la de mayor saldo.
 * - cuentaFrenteAlPago(): cuánto queda o cuánto falta.
 * - htmlHojaCuentaPago(): "Total a pagar", una fila por cuenta con su logo,
 *   tipo, saldo y marca; la marcada que no alcanza dice cuánto falta.
 * - resolverPagoConSelector(): el título, marcar otra repinta y cambia el
 *   botón ("Pagar $X" o "Completar con otra cuenta"), la X cierra, la flecha
 *   devuelve VOLVER.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  cuentaPropuesta,
  cuentaFrenteAlPago,
  htmlHojaCuentaPago,
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
    expect(falta.textContent.trim()).toBe(`No tienes saldo suficiente en esta cuenta para cubrir el pago: faltan ${f(454_000)}. Puedes elegir otra cuenta para completar el valor.`);
  });

  it('los nombres se escapan', () => {
    const d = div(htmlHojaCuentaPago([cuenta('x', '<b>x</b>', 'Otro', 1)], 1));
    expect(d.querySelector('.cuenta-pago__nombre').textContent).toBe('<b>x</b>');
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
