/**
 * retiro-tarjeta.test.js - La tarjeta como origen del retiro (MC.20c, ADR
 * 171 D3): en "Retirar efectivo" las tarjetas con cupo van en su grupo, y
 * elegir una abre "Sacar un avance" con el monto ya escrito. Nunca guarda una
 * transferencia con cupo (ADR 051 D4).
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const CUENTAS = [
  { id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 1_000_000, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
];
const TARJETA = {
  id: 't1', descripcion: 'Visa Bancolombia', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito',
  saldoTotal: 800_000, cuotaMensual: 120_000, cupoTotal: 3_000_000, tasa: 0.2293, tasaUnidad: 'EA',
  frecuencia: 'Mensual', diaPago: 15, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z',
};

test('elegir la tarjeta en Retirar efectivo abre Sacar un avance con el monto escrito', async ({ page }) => {
  await sembrar(page, estadoBase({ cuentas: CUENTAS, compromisos: [TARJETA] }));
  await page.goto('/#tesoreria');
  await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
  await page.locator('#tesoreria-transferir [data-action="abrir-retiro"]').click();

  const form = page.locator('#modal-transferencia[data-open] #form-transferencia[data-modo="retiro"]');
  for (const t of ['3', '0', '0', '000']) await form.locator('[data-kp-zona] button', { hasText: new RegExp(`^${t}$`) }).first().click();
  await form.locator('[data-etapa-seguir]').click();

  // "Sale de" trae la tarjeta en su grupo, con su cupo.
  const selector = form.locator('.cuenta-sel').first();
  await expect(selector.locator('.cuenta-sel__grupo')).toHaveText('Tarjetas de crédito');
  const cambiar = selector.locator('[data-action="cuenta-sel-cambiar"]');
  if (await cambiar.count()) await cambiar.click();
  await selector.locator('label', { hasText: 'Visa Bancolombia' }).click();

  await expect(page.locator('#modal-transferencia[data-open]')).toHaveCount(0);
  const avance = page.locator('#form-avance');
  await expect(avance).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#modal-abono .modal__title')).toHaveText('Sacar un avance: Visa Bancolombia');
  await expect(avance.locator('[name="monto"]')).toHaveValue('300.000');
});
