/**
 * accesos-directos.test.js - HF.3e, ADR 144 D4: los accesos directos del ícono
 * abren la app en `/?accion=...`, y el arranque ejecuta esa acción después de
 * los gates.
 *
 * Lo que los unitarios no cubren: el orden real del arranque (el candado
 * primero, después el formulario) y que la dirección quede limpia.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';
import { createInitialState } from '../../modules/core/state.js';

/** PIN 1234 (mismo candado que `perfiles.test.js`). */
const CANDADO_1234 = {
  hash: 'e3174484ebeec68f0933b4a5518a7ce757ff61899a332e68004eef36a36e788b',
  salt: '5de4f0acfa29e71ebc0497c3d5bf15b2',
  creado: '2026-10-25',
};

/** Config sin `legalAceptado`: la migración lo da por aceptado y el gate no tapa. */
const configSin = (extra = {}) => {
  const { legalAceptado: _sinAceptacion, ...config } = createInitialState().config;
  return { ...config, ...extra };
};

const CUENTA = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 500_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' }];

test.describe('HF.3e - accesos directos del ícono (ADR 144 D4)', () => {
  test('"Registrar gasto" abre el formulario en Gastos y la dirección queda sin la acción', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTA, config: configSin() }));
    await page.goto('/?accion=nuevo-gasto#gast');
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(1);
    await expect(page.locator('#sec-gast.active')).toHaveCount(1);
    expect(new URL(page.url()).search).toBe('');
    expect(new URL(page.url()).hash).toBe('#gast');

    // Recargar no vuelve a abrirlo.
    await page.reload();
    await expect(page.locator('#sec-gast.active')).toHaveCount(1);
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(0);
  });

  test('"Registrar ingreso" abre el formulario en Mis cuentas', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTA, config: configSin() }));
    await page.goto('/?accion=nuevo-ingreso-puntual#tesoreria');
    await expect(page.locator('#modal-ingreso-puntual[data-open]')).toHaveCount(1);
  });

  test('una acción fuera de la lista se ignora y se borra', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTA, config: configSin() }));
    await page.goto('/?accion=resetear-app#dash');
    await expect(page.locator('#sec-dash.active')).toHaveCount(1);
    await expect(page.locator('.modal-overlay[data-open]')).toHaveCount(0);
    expect(new URL(page.url()).search).toBe('');
  });

  test('con candado, primero el PIN y después el formulario', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTA, config: configSin({ bloqueo: CANDADO_1234 }) }));
    await page.goto('/?accion=nuevo-gasto#gast');
    await expect(page.locator('#bloqueo-acceso[data-open]')).toHaveCount(1);
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(0);

    await page.fill('#bloqueo-acceso-pin', '1234');
    await page.click('#form-bloqueo-acceso [type="submit"]');
    await expect(page.locator('#bloqueo-acceso[data-open]')).toHaveCount(0);
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(1);
  });
});
