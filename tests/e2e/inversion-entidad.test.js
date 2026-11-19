/**
 * inversion-entidad.test.js - "¿Dónde la tienes?" (MK.3b, ADR 172 D5) a
 * 390 px: una inversión en trii muestra la teja de la marca y una en
 * Bancolombia, el avatar del banco; sin entidad, el ícono de siempre.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const inv = (id, nombre, tipo, monto, entidad) => ({
  id, nombre, tipo, monto, tasaEA: 0, plazoMeses: 0, fechaInicio: '2026-10-01',
  ...(entidad ? { entidad } : {}), fechaCreacion: '2026-10-01T00:00:00.000Z',
});

test('cada inversión con su banco o su plataforma', async ({ page }) => {
  await sembrar(page, estadoBase({
    inversiones: [
      inv('i1', 'Acciones en trii', 'Acciones', 2_000_000, 'trii'),
      inv('i2', 'CDT a 90 días', 'CDT', 5_000_000, 'Bancolombia'),
      inv('i3', 'Ahorro aparte', 'Otro', 500_000, null),
    ],
  }));
  await page.goto('/#inversion');
  await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 10_000 });

  const trii = page.locator('.inv-fila[data-id="i1"] .inv-fila__teja');
  await expect(trii).toHaveClass(/inv-fila__teja--marca/);
  await expect(trii.locator('.bank-avatar')).toHaveText('TR');

  const cdt = page.locator('.inv-fila[data-id="i2"] .inv-fila__teja');
  await expect(cdt.locator('.bank-avatar use')).toHaveAttribute('href', '#b-bancolombia');

  const otra = page.locator('.inv-fila[data-id="i3"] .inv-fila__teja');
  await expect(otra).not.toHaveClass(/inv-fila__teja--marca/);
  await expect(otra.locator('use')).toHaveAttribute('href', '#i-inversion');
});
