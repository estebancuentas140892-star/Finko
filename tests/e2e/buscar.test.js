/**
 * buscar.test.js - buscar en Movimientos, la nube en la hoja del avatar y las
 * filas de espera (ADR 121 D1-D3).
 */

import { test, expect } from '@playwright/test';
import { sembrar, leerEstado } from './helpers/estado.js';
import { semillaNormal, semillaGrande } from './helpers/semillas.js';

test.use({ viewport: { width: 390, height: 844 } });

const conRecientes = (recientes) => {
  const e = semillaNormal();
  return { ...e, config: { ...(e.config ?? {}), busquedasRecientes: recientes } };
};

test.describe('Buscar en Movimientos (ADR 121 D1)', () => {
  // MOV.4 (ADR 200 D1): al enfocar se entra al modo búsqueda; con el campo
  // vacío, "Buscaste antes" y "Puedes buscar por" (ADR 137 D5: nada más
  // hasta escribir).
  test('con el campo vacío ofrece lo buscado antes, y un reciente lo vuelve a buscar', async ({ page }) => {
    await sembrar(page, conRecientes(['Mercado quincenal']));
    await page.goto('/#movimientos');
    await expect(page.locator('#lista-movimientos .list-item').first()).toBeVisible({ timeout: 10_000 });

    const panel = page.locator('#movimientos-sugerencias');
    await expect(panel).toBeHidden();
    await page.locator('#movimientos-buscar').focus();
    await expect(panel).toBeVisible();
    await expect(page.locator('#sec-movimientos > .section__header')).toBeHidden();
    await expect(page.locator('.mov-barra__volver')).toBeVisible();
    await expect(panel.locator('.mov-sugerencias__titulo')).toHaveText(['Buscaste antes', 'Puedes buscar por']);
    await expect(panel.locator('.mov-sug--reciente')).toHaveCount(1);

    await panel.locator('[data-action="movimientos-buscar-reciente"]').click();
    await expect(page.locator('#movimientos-buscar')).toHaveValue('Mercado quincenal');
    await expect(panel).toBeHidden();
    await expect(page.locator('.movimientos-resumen')).toHaveText('1 movimiento · salieron $385.500');

    // ← sale del modo búsqueda, borra el texto y vuelve el encabezado.
    await page.locator('.mov-barra__volver').click();
    await expect(page.locator('#movimientos-buscar')).toHaveValue('');
    await expect(page.locator('#sec-movimientos > .section__header')).toBeVisible();
  });

  test('cada mes dice su total, sin año si es el actual, y la búsqueda confirmada se recuerda', async ({ page }) => {
    await sembrar(page, conRecientes([]));
    await page.goto('/#movimientos');
    const mes = page.locator('#lista-movimientos .movimientos-mes').first();
    await expect(mes).toBeVisible({ timeout: 10_000 });
    await expect(mes).not.toContainText(String(new Date().getFullYear()));
    await expect(mes.locator('.movimientos-mes__total')).toHaveText(/^[-+]\$[\d.]+$/);

    // Sin búsquedas recientes el panel solo dice por qué se puede buscar.
    await page.locator('#movimientos-buscar').focus();
    await expect(page.locator('#movimientos-sugerencias .mov-sugerencias__titulo')).toHaveText(['Puedes buscar por']);

    await page.locator('#movimientos-buscar').fill('Restaurantes');
    await page.locator('#movimientos-buscar').press('Enter');
    await expect.poll(async () => (await leerEstado(page)).config?.busquedasRecientes).toEqual(['Restaurantes']);
  });

  test('con un historial grande, al llegar se ven filas de espera y luego la lista', async ({ page }) => {
    test.setTimeout(60_000);
    await sembrar(page, semillaGrande());
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 15_000 });
    const fantasmas = await page.evaluate(() => new Promise((ok) => {
      window.addEventListener('hashchange', () => ok(document.querySelectorAll('#lista-movimientos .list-item--fantasma').length), { once: true });
      location.hash = '#movimientos';
    }));
    expect(fantasmas).toBeGreaterThan(0);
    await expect(page.locator('#lista-movimientos .list-item--fantasma')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('#lista-movimientos .list-item').first()).toBeVisible();
    await expect(page.locator('#lista-movimientos')).not.toHaveAttribute('aria-busy', 'true');
  });
});

test.describe('La nube en la hoja del avatar (ADR 121 D2)', () => {
  test('sin conexión dice que los cambios quedan en el teléfono', async ({ page, context }) => {
    const carga = globalThis.btoa(JSON.stringify({ email: 'laura@correo.co', sub: 'u-1' })).replace(/=+$/, '');
    const sesion = {
      access_token: `x.${carga}.y`, refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600,
      usuario: 'u-1', email: 'laura@correo.co', porDecidir: false,
    };
    await page.route('https://*.supabase.co/**', route => route.abort());
    await page.addInitScript((s) => localStorage.setItem('fk_nube', JSON.stringify(s)), sesion);
    await sembrar(page, semillaNormal());
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    await context.setOffline(true);
    await page.locator('[data-action="perfil-abrir"]').first().click();
    await expect(page.locator('[data-bloque="nube"]')).toContainText('Sin conexión · tus cambios quedan en este teléfono y se envían al volver');
    await context.setOffline(false);
  });
});
