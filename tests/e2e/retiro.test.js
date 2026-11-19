/**
 * retiro.test.js - Retirar efectivo (MC.20a, ADR 171 D3 a D5).
 *
 * Lo que solo se ve con la app andando: el botón junto a "Transferir entre
 * cuentas", el formulario que llega a Efectivo (y la crea si no existe), lo
 * que cobró el cajero saliendo con el monto y el 4x1000, y la fila "Retiro
 * de ..." en Movimientos.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase, leerEstado } from './helpers/estado.js';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const BANCOLOMBIA = {
  id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 1_000_000,
  activa: true, exenta4x1000: false, fechaCreacion: '2026-01-01T00:00:00.000Z',
};

/** Escribe un monto con el teclado de Finko. */
async function teclear(form, teclas) {
  for (const t of teclas) await form.locator('[data-kp-zona] button', { hasText: new RegExp(`^${t}$`) }).first().click();
}

test.describe('Retirar efectivo (MC.20a, ADR 171)', () => {
  test('sin Efectivo: lo crea con el retiro y descuenta monto, 4x1000 y lo del cajero', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: [BANCOLOMBIA] }));
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    // Con una sola cuenta no hay "Transferir", pero sí "Retirar efectivo".
    await expect(page.locator('#tesoreria-transferir [data-action="abrir-transferencia"]')).toHaveCount(0);
    await page.locator('#tesoreria-transferir [data-action="abrir-retiro"]').click();
    const modal = page.locator('#modal-transferencia[data-open]');
    await expect(modal.locator('#modal-transferencia-title')).toHaveText('Retirar efectivo');
    const form = modal.locator('#form-transferencia[data-modo="retiro"]');
    await expect(form.locator('#retiro-cuentas')).toContainText('La creamos al guardar');

    // En el teléfono, dos etapas: el monto con el teclado de Finko y luego el resto.
    await expect(form.locator('.pmonto__q')).toHaveText('¿Cuánto sacaste?');
    await teclear(form, ['2', '0', '0', '000']);
    await form.locator('[data-etapa-seguir]').click();
    await form.locator('#transferencia-comision').fill('7200');
    await expect(form.locator('#transferencia-gmf-hint')).toContainText('Se descontarán $800 de 4x1000, además de los $200.000 que sacas.');
    await expect(form.locator('[data-transferir-texto]')).toHaveText('Retirar $200.000');
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#modal-transferencia[data-open]')).toHaveCount(0);

    await page.waitForTimeout(400); // save() con debounce
    const st = await leerEstado(page);
    const efectivo = st.cuentas.find(c => c.banco === 'Efectivo');
    expect(efectivo).toBeTruthy();
    expect(efectivo.saldo).toBe(200_000);
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000 - 200_000 - 800 - 7_200);
    expect(st.transferencias).toHaveLength(1);
    expect(st.transferencias[0]).toMatchObject({ cuentaOrigenId: 'c1', cuentaDestinoId: efectivo.id, monto: 200_000, costoGMF: 800, comision: 7_200 });

    // Movimientos: "Retiro de Bancolombia" y lo que costó.
    await page.goto('/#movimientos');
    const fila = page.locator('.list-item', { hasText: 'Retiro de Bancolombia' }).first();
    await expect(fila).toBeVisible({ timeout: 10_000 });
    await expect(fila).toContainText('incluye $7.200 del cajero y $800 de 4x1000');
  });

  test('con Efectivo: llega a esa cuenta y "Transferir" sigue al lado', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: [
        BANCOLOMBIA,
        { id: 'ef', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 50_000, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
      ],
    }));
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await expect(page.locator('#tesoreria-transferir .transferir-entrada')).toHaveText(['Transferir entre cuentas', 'Retirar efectivo']);

    await page.locator('#tesoreria-transferir [data-action="abrir-retiro"]').click();
    const form = page.locator('#modal-transferencia[data-open] #form-transferencia[data-modo="retiro"]');
    await expect(form.locator('input[name="cuentaDestinoId"]')).toHaveValue('ef');
    await teclear(form, ['1', '0', '0', '000']);
    await form.locator('[data-etapa-seguir]').click();
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#modal-transferencia[data-open]')).toHaveCount(0);

    await page.waitForTimeout(400);
    const st = await leerEstado(page);
    expect(st.cuentas.find(c => c.id === 'ef').saldo).toBe(150_000);
    expect(st.cuentas.filter(c => c.banco === 'Efectivo')).toHaveLength(1);
    expect(st.transferencias[0].comision).toBeUndefined();

    // "Transferir" vuelve a decir su título.
    await page.locator('#tesoreria-transferir [data-action="abrir-transferencia"]').click();
    await expect(page.locator('#modal-transferencia-title')).toHaveText('Transferir entre cuentas');
  });
});
