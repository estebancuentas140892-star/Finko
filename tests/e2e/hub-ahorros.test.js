/**
 * hub-ahorros.test.js - NAV.B: hub "Ahorros" (ADR 024, D4/D5/D6).
 *
 * Cubre:
 * - Menú "Más" v2 (NAV2.1a, ADR 040): hoja agrupada (Gestión del dinero /
 *   Ahorros / Ajustes + tema), tile activo por dominio, toggle de tema.
 * - Franja de pestañas Fondo/Metas/Apartados/Inversión compartida por las
 *   4 secciones (enlaces, cero cambios de router).
 * - Consolidado de ahorro (ADR 009) como cabecera común del hub.
 * - Renombre de la sección "Ahorro" a "Fondo de emergencia".
 * - Sidebar desktop: grupo "Ahorros" (antes "Crecer"), "Herramientas"
 *   disuelto con Análisis dentro de Seguimiento (antes "Gestión", NAV.C).
 */

import { test, expect } from '@playwright/test';

/** Estado mínimo sin ahorros: el consolidado debe quedar oculto. */
async function seedVacio(page) {
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

/** Estado con ahorros: fondo $1.000.000 + meta $500.000 → total $1.500.000. */
async function seedConAhorros(page) {
  await page.addInitScript(() => {
    localStorage.setItem('fk_v1', JSON.stringify({
      perfil: { nombre: 'Ana', smmlv: 1750905 },
      onboarded: true,
      cuentas: [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 100000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
      ],
      ahorro: {
        fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 1_000_000 },
        aportes: [],
      },
      metas: [
        { id: 'm1', nombre: 'Viaje', montoObjetivo: 2_000_000, montoActual: 500_000, fechaCreacion: '2026-01-01' },
      ],
    }));
  });
}

// ── MÓVIL: modal Más, pestañas y consolidado ────────────────────────────────

test.describe('NAV.B - hub Ahorros (móvil)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('el menú Más es una hoja agrupada: Gestión del dinero + Ahorros + Ajustes (NAV2.1a, ADR 040 D1)', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    await page.click('.nav-item[data-modal="modal-mas"]');
    await expect(page.locator('#modal-mas[data-open]')).toHaveCount(1);

    // Dos grupos rotulados (revisa el "sin grupos" del ADR 024 D5).
    const grupos = await page.$$eval('#modal-mas .mas-sheet__group-label', els =>
      els.map(e => e.textContent.trim()));
    expect(grupos).toEqual(['Gestión del dinero', 'Ahorros']);

    // 10 tiles: las 4 secciones de ahorro recuperan entrada directa.
    const labels = await page.$$eval('#modal-mas .mas-tile__label', els =>
      els.map(e => e.textContent.trim()));
    expect(labels).toEqual([
      'Deudas', 'Mis cuentas', 'Me deben', 'Límites de gasto', 'Análisis',
      'Fondo de emergencia', 'Metas', 'Apartados', 'Inversión',
      'Ajustes',
    ]);
  });

  test('el tile "Fondo de emergencia" navega al hub (#ahorro) y cierra la hoja', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    await page.click('.nav-item[data-modal="modal-mas"]');
    await page.click('#modal-mas a[href="#ahorro"]');

    await expect(page.locator('#modal-mas[data-open]')).toHaveCount(0);
    await expect(page.locator('#sec-ahorro.active')).toBeVisible();
    await expect(page.locator('#title-ahorro')).toHaveText('Fondo de emergencia');
  });

  test('la hoja marca la sección activa y el botón de tema alterna sin cerrarla (NAV2.1a, ADR 040 D2/D3)', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#analisis');
    await page.waitForSelector('#sec-analisis.active', { timeout: 10_000 });

    await page.click('.nav-item[data-modal="modal-mas"]');

    // El tile de la sección actual queda resaltado con aria-current.
    await expect(page.locator('#modal-mas .mas-tile[aria-current="page"] .mas-tile__label'))
      .toHaveText('Análisis');

    // El botón de tema alterna a claro, refleja el estado y NO cierra la hoja.
    await page.click('#modal-mas .mas-sheet__theme');
    await expect(page.locator('body')).toHaveClass(/light-theme/);
    await expect(page.locator('#modal-mas .mas-sheet__theme')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#modal-mas[data-open]')).toHaveCount(1);

    // Vuelta a oscuro para no filtrar estado a otros tests.
    await page.click('#modal-mas .mas-sheet__theme');
    await expect(page.locator('body')).not.toHaveClass(/light-theme/);
  });

  test('la franja de pestañas navega entre las 4 secciones y marca la actual', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#ahorro');
    await page.waitForSelector('#sec-ahorro.active', { timeout: 10_000 });

    const tabsAhorro = page.locator('#sec-ahorro .hub-tabs__tab');
    await expect(tabsAhorro).toHaveCount(4);
    await expect(page.locator('#sec-ahorro .hub-tabs__tab[aria-current="page"]')).toHaveText('Fondo');

    // Fondo → Metas
    await page.click('#sec-ahorro .hub-tabs__tab[href="#metas"]');
    await expect(page.locator('#sec-metas.active')).toBeVisible();
    await expect(page.locator('#sec-metas .hub-tabs__tab[aria-current="page"]')).toHaveText('Metas');

    // Metas → Apartados → Inversión (la franja está en todas las secciones)
    await page.click('#sec-metas .hub-tabs__tab[href="#apartados"]');
    await expect(page.locator('#sec-apartados.active')).toBeVisible();
    await page.click('#sec-apartados .hub-tabs__tab[href="#inversion"]');
    await expect(page.locator('#sec-inversion.active')).toBeVisible();
    await expect(page.locator('#sec-inversion .hub-tabs__tab[aria-current="page"]')).toHaveText('Inversión');
  });

  test('el consolidado es la cabecera común: visible en Metas con el total', async ({ page }) => {
    await seedConAhorros(page);
    await page.goto('/#metas');
    await page.waitForSelector('#sec-metas.active', { timeout: 10_000 });

    const slot = page.locator('#sec-metas [data-hub-consolidado]');
    await expect(slot).toBeVisible();
    await expect(slot.locator('.ahorro-total__valor')).toHaveText('$1.500.000');

    // La fila del vehículo de la sección actual no lleva enlace "Ver";
    // las demás sí (aquí: Fondo enlaza a #ahorro, Metas no se enlaza a sí misma).
    await expect(slot.locator('a[href="#ahorro"]')).toHaveCount(1);
    await expect(slot.locator('a[href="#metas"]')).toHaveCount(0);
  });

  test('sin ahorros el consolidado queda oculto en todo el hub', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#ahorro');
    await page.waitForSelector('#sec-ahorro.active', { timeout: 10_000 });

    await expect(page.locator('#sec-ahorro [data-hub-consolidado]')).toBeHidden();

    await page.click('#sec-ahorro .hub-tabs__tab[href="#apartados"]');
    await expect(page.locator('#sec-apartados.active')).toBeVisible();
    await expect(page.locator('#sec-apartados [data-hub-consolidado]')).toBeHidden();
  });

  test('el botón "Más" se resalta al estar en Apartados e Inversión', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#apartados');
    await page.waitForSelector('#sec-apartados.active', { timeout: 10_000 });

    const masBtn = page.locator('.nav-item[data-modal="modal-mas"]');
    await expect(masBtn).toHaveClass(/active/);

    await page.evaluate(() => { window.location.hash = '#inversion'; });
    await page.waitForSelector('#sec-inversion.active', { timeout: 5_000 });
    await expect(masBtn).toHaveClass(/active/);
  });
});

// ── DESKTOP: sidebar con grupo "Ahorros" ────────────────────────────────────

test.describe('NAV.B - sidebar desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('grupos: diario sin rótulo (NAV2.1b), Seguimiento (con Análisis) y Ahorros; sin "Herramientas"', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    // El grupo de uso diario ya no lleva rótulo visible (ADR 040 D4); su
    // nombre queda para lectores de pantalla vía aria-label.
    const grupos = await page.$$eval('#sidebar .nav-group__label', els =>
      els.map(e => e.textContent.trim()));
    expect(grupos).toEqual(['Seguimiento', 'Ahorros']);
    await expect(page.locator('#sidebar [role="group"][aria-label="Uso diario"] a[href="#dash"]'))
      .toHaveCount(1);

    // La marca "F" reemplaza al emoji del logo (ADR 040 D4).
    await expect(page.locator('#sidebar .sidebar__logo-mark')).toHaveText('F');

    // Análisis vive dentro del grupo Seguimiento (Herramientas se disolvió).
    const gestion = page.locator('.nav-group', { has: page.locator('#nav-label-gestion') });
    await expect(gestion.locator('a[href="#analisis"]')).toHaveCount(1);

    // La entrada del fondo usa el nombre nuevo de la sección.
    const fondo = page.locator('#sidebar a[href="#ahorro"] .nav-item__label');
    await expect(fondo).toHaveText('Fondo de emergencia');
  });
});
