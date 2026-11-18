/**
 * llaves.test.js - tus llaves a un toque (MC.19, ADR 170).
 *
 * Cubre en el navegador:
 * - D4 y D5 a 390 px: "Para recibir" en la hoja de la cuenta, el documento
 *   enmascarado hasta tocarlo, Copiar que deja los 10 dígitos en el
 *   portapapeles y lo avisa, y con el ojo cerrado todo enmascarado.
 * - D3 y D6 en escritorio: el formulario con varias llaves, el formato que se
 *   revisa al guardar y el chip de la tarjeta que copia.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

const NEQUI = {
  id: 'n1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 300_000, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z',
  datosTransferencia: { numeroCuenta: '0123456789', llaves: [{ tipo: 'Celular', valor: '3001234567' }, { tipo: 'Documento', valor: '1020304050' }] },
};

const estado = (page) => page.evaluate(async () => {
  const { S } = await import('/modules/core/state.js');
  return JSON.parse(JSON.stringify(S.cuentas));
});

test.describe('MC.19 - "Para recibir" a 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('la hoja lista las llaves, enmascara el documento, copia los 10 dígitos y el ojo tapa todo', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await sembrar(page, estadoBase({ cuentas: [NEQUI] }));
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.locator('.cuenta-card[data-id="n1"] .list-item__detalle').click();
    const hoja = page.locator('#modal-detalle-fila');
    const filas = hoja.locator('.detalle-cuenta__llave');
    await expect(filas.locator('dt')).toHaveText(['Celular', 'Documento', 'Número de cuenta']);
    await expect(filas.locator('dd')).toHaveText(['300 123 4567', '•••• 4050', '•••• 6789']);

    await filas.nth(0).getByRole('button', { name: 'Copiar tu llave de celular' }).click();
    await expect(page.locator('.fk-toast')).toContainText('Copiaste tu llave de celular de Nequi');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('3001234567');

    // Copiar no necesita verlo; tocarlo lo muestra completo.
    await filas.nth(1).getByRole('button', { name: 'Copiar tu llave de documento' }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('1020304050');
    await expect(filas.nth(1).locator('dd')).toHaveText('•••• 4050');
    await filas.nth(1).locator('[data-action="cuenta-llave-ver"]').click();
    await expect(filas.nth(1).locator('dd')).toHaveText('1020304050');

    // Con el ojo de Mis cuentas cerrado, todo enmascarado.
    await page.evaluate(async () => {
      const { S } = await import('/modules/core/state.js');
      S.config.ocultarPorSeccion = { ...(S.config.ocultarPorSeccion ?? {}), tesoreria: true };
    });
    await hoja.locator('[data-action="modal-close"]').first().click();
    await page.locator('.cuenta-card[data-id="n1"] .list-item__detalle').click();
    await expect(filas.locator('dd')).toHaveText(['•••• 4567', '•••• 4050', '•••• 6789']);
  });
});

test.describe('MC.19 - el formulario de varias llaves en escritorio', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('dos llaves: el formato se revisa al guardar y se guardan limpias; el chip copia la primera', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await sembrar(page, estadoBase({ cuentas: [] }));
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');
    const form = page.locator('#modal-cuenta-body form');
    await form.locator('.bank-picker__trigger').click();
    await page.waitForSelector('#banco-list:not([hidden])', { timeout: 5_000 });
    await page.locator('#banco-list .bank-picker__item[data-value="Nequi"]').click();
    await form.locator('#cuenta-saldo').fill('100000');

    await form.locator('#cuenta-transferencia-toggle').check();
    const filas = form.locator('[data-llave-fila]');
    await expect(filas).toHaveCount(1);
    await filas.nth(0).locator('[name="llaveValor"]').fill('300 123 4567');
    await form.locator('[data-action="cuenta-llave-agregar"]').click();
    await expect(filas).toHaveCount(2);
    await filas.nth(1).locator('.chip-fecha', { hasText: 'Correo' }).click();
    await filas.nth(1).locator('[name="llaveValor"]').fill('ana@correo');
    await form.locator('button[type="submit"]').click();
    await expect(form).toContainText('Llave 2: escribe un correo completo');

    await filas.nth(1).locator('[name="llaveValor"]').fill('Ana@Correo.com');
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#modal-cuenta[data-open]')).toHaveCount(0);
    await expect.poll(async () => (await estado(page))[0]?.datosTransferencia).toEqual({
      llaves: [{ tipo: 'Celular', valor: '3001234567' }, { tipo: 'Correo', valor: 'ana@correo.com' }],
    });

    const chip = page.locator('.cuenta-card .chip--copiar');
    await expect(chip).toHaveText('Celular 300 123 4567');
    await chip.click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('3001234567');
  });
});
