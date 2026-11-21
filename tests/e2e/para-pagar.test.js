/**
 * para-pagar.test.js - ¿a dónde se paga? (PAG.1, ADR 175).
 *
 * A 390 px: un arriendo con la llave de celular de quien lo cobra muestra
 * "Para pagar" en su ficha, Copiar deja los 10 dígitos en el portapapeles y
 * la hoja sigue abierta para marcarlo pagado; "¿Desde qué cuenta pagas?"
 * trae el mismo dato arriba de las cuentas.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

const CREADA = '2025-01-01T00:00:00.000Z';
const CUENTAS = [
  { id: 'c1', nombre: 'Bancolombia Ahorros', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 3_000_000, activa: true, fechaCreacion: CREADA },
  { id: 'c2', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 500_000, activa: true, fechaCreacion: CREADA },
];
const ARRIENDO = {
  id: 'f1', tipo: 'fijo', descripcion: 'Arriendo', categoria: 'Arriendo', monto: 1_200_000, frecuencia: 'Mensual', diaPago: 28,
  activo: true, fechaCreacion: CREADA, debitoAutomatico: false, cuentaDebitoId: null,
  datosPago: { titular: 'Martha Gómez', llave: { tipo: 'Celular', valor: '3001234567' } },
};

test.describe('PAG.1 - "Para pagar" a 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('la ficha copia la llave sin cerrarse y la hoja de la cuenta la trae arriba', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.clock.setFixedTime(new Date('2026-11-18T10:00:00'));
    await sembrar(page, estadoBase({ cuentas: CUENTAS, compromisos: [ARRIENDO] }));
    await page.goto('/#compromisos');
    await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
    await page.locator('#lista-compromisos [data-id="f1"] .list-item__detalle').first().click();

    const hoja = page.locator('#modal-detalle-fila');
    // GAS.13c (ADR 188 D3): el arriendo nombra su dato.
    await expect(hoja.locator('.detalle-cuenta__rotulo')).toHaveText('A quién le pagas · Martha Gómez');
    await expect(hoja.locator('.detalle-cuenta__llave dd')).toHaveText('300 123 4567');
    await hoja.getByRole('button', { name: 'Copiar la llave de Martha Gómez' }).click();
    await expect(page.locator('.fk-toast')).toContainText('Copiaste la llave de Martha Gómez');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('3001234567');
    await expect(hoja).toHaveAttribute('data-open', '');

    // Marcar pagado: la hoja de la cuenta trae el dato arriba, con su Copiar.
    await hoja.locator('[data-target-action="agenda-marcar-pagado-fijo"]').click();
    const cuentaPago = page.locator('.modal--cuenta-pago');
    await expect(cuentaPago.locator('.cuenta-pago__dato')).toContainText('Llave · Celular de Martha Gómez');
    await expect(cuentaPago.locator('.cuenta-pago__dato-v')).toHaveText('300 123 4567');
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await cuentaPago.locator('[data-role="copiar-pago"]').click();
    await expect(cuentaPago.locator('[data-role="copiar-pago"]')).toHaveText('Copiado');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('3001234567');
    await expect(cuentaPago).toBeVisible();
  });
});
