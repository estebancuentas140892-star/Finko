/**
 * miles.test.js - los campos de dinero muestran el separador de miles
 * mientras se escribe y se guardan como número (ADR 120).
 *
 * En el navegador real: el reformateo al teclear, el cursor que no salta al
 * final, el evento `formdata` que entrega dígitos al formulario, y el saldo
 * negativo de una cuenta que sobrevive a editarla.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase, leerEstado } from './helpers/estado.js';

test.use({ viewport: { width: 390, height: 844 } });

const CUENTAS = [
  { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 3_000_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
];

test.describe('Separador de miles en los montos (ADR 120)', () => {
  test('el gasto se lee con puntos mientras se escribe y se guarda como número', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });
    // ADR 132 D6: con la lente vacía, el primario es el del vacío.
    await page.click('#lista-gastos .gastos-empty [data-action="nuevo-gasto"]');
    const form = page.locator('#form-gasto');
    const monto = form.locator('#gasto-monto');

    await monto.pressSequentially('150000');
    await expect(monto).toHaveValue('150.000');

    // Un cero de más en medio: el cursor queda donde se escribió.
    await monto.evaluate(el => el.setSelectionRange(1, 1));
    await monto.pressSequentially('2');
    await expect(monto).toHaveValue('1.250.000');
    expect(await monto.evaluate(el => el.selectionStart)).toBe(3);

    await form.locator('.chip-cat:has(input[value="Mercado"])').click();
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(0);
    await expect.poll(async () => (await leerEstado(page)).gastos?.[0]?.monto).toBe(1_250_000);
  });

  test('una cuenta en negativo conserva el signo al editarla', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: [{ ...CUENTAS[0], saldo: -120_000 }],
    }));
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.locator('#lista-tesoreria .cuenta-card[data-id="c1"] .list-item__detalle').click();
    await page.locator('#modal-detalle-fila [data-target-action="editar-cuenta"]').click();
    const saldo = page.locator('#cuenta-saldo');
    await expect(saldo).toHaveValue('-120.000');
    await page.locator('#form-cuenta button[type="submit"]').click();
    await expect.poll(async () => (await leerEstado(page)).cuentas?.[0]?.saldo).toBe(-120_000);
  });
});
