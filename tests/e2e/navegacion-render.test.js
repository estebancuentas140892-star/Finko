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
import { sembrar, estadoBase } from './helpers/estado.js';

async function saltearOnboardingYIrADash(page) {
  await sembrar(page, estadoBase({
    _version:     3,
    prestamos:    [],
    presupuestos: [],
  }));
  // Forzar arranque en dashboard, NO en la sección destino.
  await page.goto('/#dash');
  await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
}

test.describe('Render tras navegación (regresión hashchange)', () => {

  test('Tesorería muestra empty state al navegar desde Dashboard', async ({ page }) => {
    await saltearOnboardingYIrADash(page);

    await page.click('.nav-item[href="#tesoreria"]');
    await expect(page.locator('#sec-tesoreria.active')).toBeVisible();

    // Sin el fix, #lista-tesoreria queda vacío.
    await expect(
      page.locator('#lista-tesoreria .empty-state__title')
    ).toHaveText('Agrega tu primera cuenta', { timeout: 3_000 });
  });

  test('Metas muestra empty state al navegar desde Dashboard', async ({ page }) => {
    await saltearOnboardingYIrADash(page);

    // #metas ya no es un clic directo desde Dashboard (INT.1b la anida bajo
    // "Ahorro"); hashchange dispara igual por goto, que es lo que este
    // archivo prueba (ver el caso de Movimientos, más abajo).
    await page.goto('/#metas');
    await expect(page.locator('#sec-metas.active')).toBeVisible();

    await expect(
      page.locator('#lista-metas .empty-state__title')
    ).toHaveText('Sin metas de ahorro', { timeout: 3_000 });
  });

  test('Fondo de emergencia muestra empty state al entrar desde la casa de Ahorro', async ({ page }) => {
    await saltearOnboardingYIrADash(page);

    await page.click('.nav-item--no-mobile[href="#ahorro"]');
    await expect(page.locator('#sec-ahorro.active')).toBeVisible();

    // DIS.19: la casa es el destino, y la salida de cada carril es "Ver todo".
    await page.click('#carril-fondo .lane__ver');
    await expect(page.locator('#sec-fondo.active')).toBeVisible();

    await expect(
      page.locator('#panel-ahorro .fondo-card__pregunta')
    ).toHaveText('¿Cuánto tiempo aguantarías sin ingresos?', { timeout: 3_000 });
  });

  test('Gastos muestra empty state al navegar desde Dashboard', async ({ page }) => {
    await saltearOnboardingYIrADash(page);

    await page.click('a[href="#gast"]');
    await expect(page.locator('#sec-gast.active')).toBeVisible();

    await expect(
      page.locator('#lista-gastos .gastos-empty__title')
    ).toHaveText('Sin gastos este mes', { timeout: 3_000 });
  });

  test('Compromisos muestra empty state al navegar desde Dashboard', async ({ page }) => {
    await saltearOnboardingYIrADash(page);

    await page.click('a[href="#compromisos"]');
    await expect(page.locator('#sec-compromisos.active')).toBeVisible();

    await expect(
      page.locator('#lista-compromisos .empty-state__title')
    ).toHaveText('Sin deudas registradas', { timeout: 3_000 });
  });

  test('Movimientos muestra estado vacío al navegar directo por hash (TX.8b, sin ícono de nav)', async ({ page }) => {
    await saltearOnboardingYIrADash(page);

    // Sin ícono en la barra: se llega por hash directo (como el link "Ver todo").
    await page.goto('/#movimientos');
    await expect(page.locator('#sec-movimientos.active')).toBeVisible();

    await expect(
      page.locator('#lista-movimientos .empty-state__title')
    ).toHaveText('Todavía no hay movimientos', { timeout: 3_000 });
  });

  test('Navegar Tesorería → Metas → Tesorería conserva el render', async ({ page }) => {
    await saltearOnboardingYIrADash(page);

    // Tesorería primero
    await page.click('.nav-item[href="#tesoreria"]');
    await expect(
      page.locator('#lista-tesoreria .empty-state__title')
    ).toHaveText('Agrega tu primera cuenta', { timeout: 3_000 });

    // Metas después (goto: ya no es un clic directo, ver nota arriba)
    await page.goto('/#metas');
    await expect(
      page.locator('#lista-metas .empty-state__title')
    ).toHaveText('Sin metas de ahorro', { timeout: 3_000 });

    // Volver a Tesorería - el render debe seguir presente
    await page.click('.nav-item[href="#tesoreria"]');
    await expect(
      page.locator('#lista-tesoreria .empty-state__title')
    ).toHaveText('Agrega tu primera cuenta', { timeout: 3_000 });
  });

});
