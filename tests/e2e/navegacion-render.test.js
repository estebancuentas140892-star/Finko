/**
 * navegacion-render.test.js - Regresión de race condition de hashchange.
 *
 * Bug reportado (2026-05-18): tras navegar desde el dashboard a tesoreria,
 * metas, ingresos, gastos o compromisos, la sección a veces aparecía
 * completamente vacía (sin lista, sin empty state).
 *
 * Causa: los dominios afectados llamaban a `renderSmart(..., key)` en su init,
 * pero no escuchaban `window.addEventListener('hashchange', ...)`. Si el hash
 * inicial era `#dash` y el usuario navegaba a otra sección sin haber mutado
 * el estado, nunca se rendereaba el contenido.
 *
 * Estos tests siempre arrancan en `#dash` y navegan después - sin el fix,
 * el empty state no aparece y los asserts fallan.
 */

import { test, expect } from '@playwright/test';

async function saltearOnboardingYIrADash(page) {
  await page.addInitScript(() => {
    const estado = {
      _version: 3,
      perfil: { nombre: 'TestUser', smmlv: 1423500 },
      onboarded: true,
      cuentas: [],
      ingresos: [],
      gastos: [],
      compromisos: [],
      metas: [],
      prestamos: [],
      presupuestos: [],
    };
    localStorage.setItem('fk_v1', JSON.stringify(estado));
  });
  // Forzar arranque en dashboard, NO en la sección destino.
  await page.goto('/#dash');
  await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
}

test.describe('Render tras navegación (regresión hashchange)', () => {

  test('Tesorería muestra empty state al navegar desde Dashboard', async ({ page }) => {
    await saltearOnboardingYIrADash(page);

    await page.click('a[href="#tesoreria"]');
    await expect(page.locator('#sec-tesoreria.active')).toBeVisible();

    // Sin el fix, #lista-tesoreria queda vacío.
    await expect(
      page.locator('#lista-tesoreria .empty-state__title')
    ).toHaveText('¿Dónde guardás tu plata?', { timeout: 3_000 });
  });

  test('Metas muestra empty state al navegar desde Dashboard', async ({ page }) => {
    await saltearOnboardingYIrADash(page);

    await page.click('a[href="#metas"]');
    await expect(page.locator('#sec-metas.active')).toBeVisible();

    await expect(
      page.locator('#lista-metas .empty-state__title')
    ).toHaveText('Sin metas de ahorro', { timeout: 3_000 });
  });

  test('Ingresos muestra empty state al navegar desde Dashboard', async ({ page }) => {
    await saltearOnboardingYIrADash(page);

    await page.click('a[href="#ingresos"]');
    await expect(page.locator('#sec-ingresos.active')).toBeVisible();

    await expect(
      page.locator('#lista-ingresos .empty-state__title')
    ).toHaveText('Sin ingresos registrados', { timeout: 3_000 });
  });

  test('Gastos muestra empty state al navegar desde Dashboard', async ({ page }) => {
    await saltearOnboardingYIrADash(page);

    await page.click('a[href="#gast"]');
    await expect(page.locator('#sec-gast.active')).toBeVisible();

    await expect(
      page.locator('#lista-gastos .empty-state__title')
    ).toHaveText('Sin gastos este mes', { timeout: 3_000 });
  });

  test('Compromisos muestra empty state al navegar desde Dashboard', async ({ page }) => {
    await saltearOnboardingYIrADash(page);

    await page.click('a[href="#compromisos"]');
    await expect(page.locator('#sec-compromisos.active')).toBeVisible();

    await expect(
      page.locator('#lista-compromisos .empty-state__title')
    ).toHaveText('Nada que pagar... por ahora', { timeout: 3_000 });
  });

  test('Navegar Tesorería → Metas → Tesorería conserva el render', async ({ page }) => {
    await saltearOnboardingYIrADash(page);

    // Tesorería primero
    await page.click('a[href="#tesoreria"]');
    await expect(
      page.locator('#lista-tesoreria .empty-state__title')
    ).toHaveText('¿Dónde guardás tu plata?', { timeout: 3_000 });

    // Metas después
    await page.click('a[href="#metas"]');
    await expect(
      page.locator('#lista-metas .empty-state__title')
    ).toHaveText('Sin metas de ahorro', { timeout: 3_000 });

    // Volver a Tesorería - el render debe seguir presente
    await page.click('a[href="#tesoreria"]');
    await expect(
      page.locator('#lista-tesoreria .empty-state__title')
    ).toHaveText('¿Dónde guardás tu plata?', { timeout: 3_000 });
  });

});
