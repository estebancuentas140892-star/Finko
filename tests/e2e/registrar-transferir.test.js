/**
 * registrar-transferir.test.js - "Transferir o retirar" en la hoja de
 * registrar (MC.20b, ADR 171 D2): aparece con una sola cuenta y su selector
 * "¿A dónde fue el dinero?" lleva al registro de siempre de cada caso.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

const BANCOLOMBIA = {
  id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 1_000_000,
  activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z',
};

/** Abre la hoja de registrar como lo hace su botón. */
async function abrirHoja(page) {
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.dataset.action = 'registrar-abrir-hoja';
    document.body.appendChild(b);
    b.click();
    b.remove();
  });
  await expect(page.locator('#modal-registrar[data-open]')).toHaveCount(1);
}

test.describe('Transferir o retirar (MC.20b, ADR 171 D2)', () => {
  test('con una sola cuenta: la fila está y "Le presté dinero" abre Nuevo préstamo', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: [BANCOLOMBIA] }));
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await abrirHoja(page);

    const fila = page.locator('#registrar-lista [data-picker="transferir"]');
    await expect(fila).toContainText('Transferir o retirar');
    await expect(fila).toContainText('A tu cuenta, a otra persona o en el cajero');
    await fila.click();

    await expect(page.locator('#modal-registrar-title')).toHaveText('¿A dónde fue el dinero?');
    const opciones = page.locator('#registrar-vista-destino .registrar__destino-nombre');
    await expect(opciones).toHaveText(['Lo saqué en efectivo', 'Le pagué algo a alguien', 'Le presté dinero']);

    await page.locator('#registrar-vista-destino .registrar__destino-item', { hasText: 'Le presté dinero' }).click();
    await expect(page.locator('#modal-registrar[data-open]')).toHaveCount(0);
    await expect(page.locator('#form-personal')).toBeVisible({ timeout: 5_000 });
  });

  test('"Lo saqué en efectivo" abre Retirar efectivo', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: [BANCOLOMBIA] }));
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await abrirHoja(page);
    await page.locator('#registrar-lista [data-picker="transferir"]').click();
    await page.locator('#registrar-vista-destino .registrar__destino-item', { hasText: 'Lo saqué en efectivo' }).click();
    await expect(page.locator('#modal-transferencia-title')).toHaveText('Retirar efectivo');
    await expect(page.locator('#form-transferencia[data-modo="retiro"]')).toHaveCount(1);
  });
});
