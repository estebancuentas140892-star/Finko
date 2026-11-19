/**
 * guardado-en.test.js - "¿Dónde lo guardas?" a 390 px (AH.9, ADR 174 D3 y
 * D4): una meta guardada en Nequi, bolsillo Viaje, aparece en la hoja de
 * Nequi con su monto, su ficha lo dice, y aportar a ella propone Nequi.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const CUENTAS = [
  { id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 2_000_000, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
  { id: 'c2', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 400_000, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
];
const META = {
  id: 'm1', nombre: 'Viaje a la playa', montoObjetivo: 2_000_000, montoActual: 300_000, fechaLimite: null,
  categoria: null, icono: null, nota: '', completada: false, planAportes: [],
  guardadoEn: { cuentaId: 'c2', bolsillo: 'Viaje' }, fechaCreacion: '2026-01-01T00:00:00.000Z',
};

test.describe('¿Dónde lo guardas? (AH.9, ADR 174)', () => {
  test('la meta en Nequi, bolsillo Viaje: en la hoja de Nequi, en su ficha y al aportar', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS, metas: [META] }));
    await page.goto('/#tesoreria');
    const sec = page.locator('#sec-tesoreria');
    await sec.locator('.cuenta-card[data-id="c2"] .list-item__detalle').click({ timeout: 10_000 });
    const hoja = page.locator('#modal-detalle-fila[data-open]');
    const aqui = hoja.locator('.guardado-aqui');
    await expect(aqui.locator('.guardado-aqui__titulo')).toHaveText('Guardado aquí');
    await expect(aqui.locator('.guardado-aqui__nombre')).toHaveText('Viaje a la playa');
    await expect(aqui.locator('.guardado-aqui__sub')).toHaveText('Meta · bolsillo Viaje');
    await expect(aqui.locator('.guardado-aqui__monto')).toHaveText('$300.000');
    await expect(aqui).toContainText('Este dinero ya salió del saldo de la cuenta');
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-detalle-fila[data-open]')).toHaveCount(0);

    // Bancolombia no tiene nada guardado.
    await sec.locator('.cuenta-card[data-id="c1"] .list-item__detalle').click();
    await expect(page.locator('#modal-detalle-fila[data-open] .detalle-fila__titulo')).toHaveText('Bancolombia');
    await expect(page.locator('#modal-detalle-fila[data-open] .guardado-aqui')).toHaveCount(0);
    await page.keyboard.press('Escape');

    // La ficha de la meta dice dónde está, y aportar propone Nequi.
    await page.goto('/#metas');
    await page.locator('#lista-metas [data-id="m1"] .list-item__detalle').first().click({ timeout: 10_000 });
    const ficha = page.locator('#modal-detalle-fila[data-open]');
    await expect(ficha.locator('.detalle-gasto__datos')).toContainText('Guardado en');
    await expect(ficha.locator('.detalle-gasto__datos')).toContainText('Nequi, bolsillo Viaje');
    await ficha.locator('[data-target-action="abonar-meta"]').click();
    await expect(page.locator('#modal-abono-meta[data-open] input[name="cuentaId"][value="c2"]')).toBeChecked();
  });
});
