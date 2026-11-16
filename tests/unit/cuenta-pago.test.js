/**
 * cuenta-pago.test.js - la hoja "¿Desde qué cuenta vas a realizar el pago?"
 * (AH.1c, ADR 150 D5).
 *
 * Cubre:
 * - cuentaPropuesta(): la preferida activa o la de mayor saldo.
 * - cuentaFrenteAlPago(): cuánto queda o cuánto falta.
 * - htmlHojaCuentaPago(): plegada con la propuesta, su saldo y lo que queda;
 *   la lista con todas, la que no alcanza lo dice; los radios siempre ahí.
 * - resolverPagoConSelector(): el título, "Cambiar" abre la lista, "Pagar $X"
 *   confirma la elegida, la X cierra sin elegir.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  cuentaPropuesta,
  cuentaFrenteAlPago,
  htmlHojaCuentaPago,
  resolverPagoConSelector,
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
  it('plegada: la propuesta con su logo, su tipo, su saldo y lo que queda', () => {
    const d = div(htmlHojaCuentaPago(CUENTAS, 463_800, 'c1'));
    expect(d.querySelector('.cuenta-pago').dataset.vista).toBe('plegada');
    const elegida = d.querySelector('.cuenta-pago__elegida');
    expect(elegida.querySelector('.cuenta-pago__nombre').textContent).toBe('Bancolombia');
    expect(elegida.querySelector('.cuenta-pago__tipo').textContent).toBe('Cuenta de ahorros');
    expect(elegida.querySelector('.cuenta-pago__logo .bank-avatar use').getAttribute('href')).toBe('#b-bancolombia');
    expect(elegida.querySelector('.cuenta-pago__rotulo').textContent).toBe('Saldo disponible');
    expect(elegida.querySelector('.cuenta-pago__saldo').textContent).toBe(f(1_840_000));
    expect(elegida.querySelector('.cuenta-pago__despues').textContent).toBe(`Después del pago te quedan ${f(1_376_200)}`);
    expect(elegida.querySelector('[data-role="cambiar"]').getAttribute('aria-expanded')).toBe('false');
  });

  it('la propuesta que no alcanza lo dice en vez de lo que queda', () => {
    const d = div(htmlHojaCuentaPago(CUENTAS, 463_800, 'c4'));
    expect(d.querySelector('.cuenta-pago__despues').textContent).toContain(`faltan ${f(454_000)}`);
  });

  it('la lista: una opción por cuenta, la propuesta marcada, la que no alcanza lo dice', () => {
    const d = div(htmlHojaCuentaPago(CUENTAS, 463_800, 'c1'));
    const opciones = [...d.querySelectorAll('.cuenta-pago__opcion')];
    expect(opciones).toHaveLength(3);
    expect(d.querySelector('input[name="cuentaId"]:checked').value).toBe('c1');
    expect(opciones.map(o => o.querySelector('.cuenta-pago__opcion-saldo').textContent)).toEqual([f(1_840_000), f(512_500), f(9_800)]);
    expect(opciones[0].querySelector('.cuenta-pago__opcion-falta')).toBeNull();
    expect(opciones[2].querySelector('.cuenta-pago__opcion-falta').textContent).toBe(`No alcanza sola · faltan ${f(454_000)}`);
    expect(d.querySelector('.cuenta-pago__lista').getAttribute('role')).toBe('radiogroup');
  });

  it('los nombres se escapan', () => {
    const d = div(htmlHojaCuentaPago([cuenta('x', '<b>x</b>', 'Otro', 1)], 1));
    expect(d.querySelector('.cuenta-pago__nombre').textContent).toBe('<b>x</b>');
  });
});

describe('resolverPagoConSelector(): la hoja', () => {
  it('título, "Pagar $X", Cambiar abre la lista y Pagar usa la elegida', async () => {
    const promesa = resolverPagoConSelector(CUENTAS, 463_800, 'pagar', { preferidaId: 'c1' });
    await new Promise(r => setTimeout(r, 0));
    expect(document.getElementById('cuenta-pref-title').textContent).toBe('¿Desde qué cuenta vas a realizar el pago?');
    expect(document.querySelector('.modal--cuenta-pago .confirm__mensaje')).toBeNull();
    const pagar = document.querySelector('[data-role="confirmar"]');
    expect(pagar.textContent).toBe(`Pagar ${f(463_800)}`);

    const cambiar = document.querySelector('[data-role="cambiar"]');
    cambiar.click();
    expect(document.querySelector('.cuenta-pago').dataset.vista).toBe('lista');
    expect(cambiar.getAttribute('aria-expanded')).toBe('true');

    document.querySelector('input[name="cuentaId"][value="c2"]').checked = true;
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
});
