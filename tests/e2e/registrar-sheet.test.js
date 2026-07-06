/**
 * registrar-sheet.test.js - NAV.A2a: bottom nav de 5 con botón central
 * "Registrar" y la hoja que enruta a Gasto e Ingreso (ADR 024).
 *
 * Corre en viewport móvil: el botón "+" es mobile-only (en desktop la
 * navegación es el sidebar vertical y el "+" queda oculto).
 */

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

async function seed(page) {
  await page.addInitScript(() => {
    localStorage.setItem('fk_v1', JSON.stringify({
      perfil: { nombre: 'Ana', smmlv: 1750905 },
      onboarded: true,
      cuentas: [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 100000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
      ],
    }));
  });
}

test.describe('NAV.A2a - hoja Registrar', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
  });

  test('el bottom nav muestra 5 destinos con "Registrar" en el centro', async ({ page }) => {
    const labels = await page.$$eval('#sidebar .nav-item', els =>
      els.filter(e => e.offsetParent !== null)
         .map(e => e.querySelector('.nav-item__label')?.textContent?.trim()));
    expect(labels).toEqual(['Inicio', 'Gastos', 'Registrar', 'Calendario', 'Más']);
  });

  test('el botón central abre la hoja y la teja Ingreso abre su modal', async ({ page }) => {
    await page.click('.nav-item--registrar');
    await expect(page.locator('#modal-registrar[data-open]')).toHaveCount(1);

    await page.click('.registrar__tile[data-kind="ingreso"]');
    // La hoja se cierra y se abre el modal de ingreso puntual (sin anidarse).
    await expect(page.locator('#modal-registrar[data-open]')).toHaveCount(0);
    await expect(page.locator('#modal-ingreso-puntual[data-open]')).toHaveCount(1);
    await expect(page.locator('#form-ingreso-puntual')).toHaveCount(1);
  });

  test('la teja Gasto abre el modal de nuevo gasto', async ({ page }) => {
    await page.click('.nav-item--registrar');
    await page.click('.registrar__tile[data-kind="gasto"]');
    await expect(page.locator('#modal-registrar[data-open]')).toHaveCount(0);
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(1);
    await expect(page.locator('#form-gasto')).toHaveCount(1);
  });
});

test.describe('NAV.A2a - registro sin cuentas guía a crear la cuenta', () => {
  test.beforeEach(async ({ page }) => {
    // Usuario nuevo: onboarded pero sin ninguna cuenta creada.
    await page.addInitScript(() => {
      localStorage.setItem('fk_v1', JSON.stringify({
        perfil: { nombre: 'Ana', smmlv: 1750905 },
        onboarded: true,
        cuentas: [],
      }));
    });
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
  });

  test('Nuevo ingreso sin cuentas: el CTA abre directo el formulario de nueva cuenta', async ({ page }) => {
    await page.click('.nav-item--registrar');
    await page.click('.registrar__tile[data-kind="ingreso"]');

    // Sin cuentas no hay form: aparece el estado guiado con el CTA de crear cuenta.
    await expect(page.locator('#modal-ingreso-puntual[data-open]')).toHaveCount(1);
    await expect(page.locator('#form-ingreso-puntual')).toHaveCount(0);
    const cta = page.locator('#modal-ingreso-puntual [data-action="ir-a-crear-cuenta"]');
    await expect(cta).toContainText('Crear una cuenta');

    // El CTA cierra el modal, navega a Mis cuentas y abre el form de nueva cuenta.
    await cta.click();
    await expect(page.locator('#modal-ingreso-puntual[data-open]')).toHaveCount(0);
    await expect(page.locator('#modal-cuenta[data-open]')).toHaveCount(1);
    await expect(page.locator('#modal-cuenta .modal__title')).toHaveText('Nueva cuenta');
    await expect(page).toHaveURL(/#tesoreria$/);
  });

  test('Nuevo gasto sin cuentas: mismo CTA "Crear una cuenta"', async ({ page }) => {
    await page.click('.nav-item--registrar');
    await page.click('.registrar__tile[data-kind="gasto"]');

    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(1);
    await expect(page.locator('#form-gasto')).toHaveCount(0);
    const cta = page.locator('#modal-gasto [data-action="ir-a-crear-cuenta"]');
    await expect(cta).toContainText('Crear una cuenta');

    await cta.click();
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(0);
    await expect(page.locator('#modal-cuenta[data-open]')).toHaveCount(1);
    await expect(page.locator('#modal-cuenta .modal__title')).toHaveText('Nueva cuenta');
    await expect(page).toHaveURL(/#tesoreria$/);
  });
});
