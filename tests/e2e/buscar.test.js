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
  test('con el campo vacío ofrece lo buscado antes, categorías y cuentas; un atajo pone su filtro', async ({ page }) => {
    await sembrar(page, conRecientes(['Mercado quincenal']));
    await page.goto('/#movimientos');
    await expect(page.locator('#lista-movimientos .list-item').first()).toBeVisible({ timeout: 10_000 });

    const atajos = page.locator('#movimientos-atajos');
    await expect(atajos).toBeHidden();
    await page.locator('#movimientos-buscar').focus();
    await expect(atajos).toBeVisible();
    await expect(atajos.locator('.movimientos-atajos__titulo')).toHaveText(['Buscaste antes', 'Por categoría', 'Por tipo y cuenta']);
    await expect(atajos.locator('[data-action="movimientos-atajo-cuenta"]')).toHaveText(['Bancolombia Ahorros', 'Efectivo']);

    await atajos.locator('[data-action="movimientos-buscar-reciente"]').click();
    await expect(page.locator('#movimientos-buscar')).toHaveValue('Mercado quincenal');
    await expect(page.locator('#movimientos-atajos')).toBeHidden();
    await expect(page.locator('.movimientos-resumen')).toHaveText('1 resultado · $385.500 en todo tu historial');
  });

  test('cada mes dice su total, sin año si es el actual, y la búsqueda confirmada se recuerda', async ({ page }) => {
    await sembrar(page, conRecientes([]));
    await page.goto('/#movimientos');
    const mes = page.locator('#lista-movimientos .movimientos-mes').first();
    await expect(mes).toBeVisible({ timeout: 10_000 });
    await expect(mes).not.toContainText(String(new Date().getFullYear()));
    await expect(mes.locator('.movimientos-mes__total')).toHaveText(/^[-+]\$[\d.]+$/);

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
