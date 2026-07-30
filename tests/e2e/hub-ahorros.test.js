/**
 * hub-ahorros.test.js - la casa de Ahorro (DIS.18) y el menú "Más" v2.
 *
 * Cubre:
 * - Menú "Más" v2 (NAV2.1a, ADR 040): hoja agrupada, tile activo por dominio,
 *   toggle de tema. Desde DIS.18 el grupo "Ahorros" y sus 4 tejas se reducen a
 *   una sola entrada a ancho completo: "Ahorro".
 * - La casa `#ahorro` (DIS.18, ADR 009 restaurado): el total una sola vez y las
 *   cuatro modalidades como filas navegables, cada una con su propósito y su
 *   estado en su propia unidad.
 * - El fondo de emergencia se muda de `#ahorro` a `#fondo`.
 * - Cada sección hija abre con "volver a Ahorro" y sin franja de pestañas ni
 *   card consolidada repetida (las dos se retiraron con DIS.18).
 * - Sidebar desktop: grupo "Ahorro" con una entrada.
 */

import { test, expect } from '@playwright/test';

/** Estado mínimo sin ahorros: la casa muestra las cuatro filas en cero. */
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

// ── MÓVIL: menú Más y la casa de Ahorro ─────────────────────────────────────

test.describe('DIS.18 - la casa de Ahorro (móvil)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('el menú Más deja un solo grupo rotulado y una entrada de Ahorro (DIS.18)', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    await page.click('.nav-item[data-modal="modal-mas"]');
    await expect(page.locator('#modal-mas[data-open]')).toHaveCount(1);

    // El rótulo "Ahorros" se retira con sus 4 tejas: sobre una sola entrada,
    // un rótulo de grupo no agrupa nada.
    const grupos = await page.$$eval('#modal-mas .mas-sheet__group-label', els =>
      els.map(e => e.textContent.trim()));
    expect(grupos).toEqual(['Gestión del dinero']);

    const labels = await page.$$eval('#modal-mas .mas-tile__label', els =>
      els.map(e => e.textContent.trim()));
    expect(labels).toEqual([
      'Deudas', 'Mis cuentas', 'Movimientos', 'Me deben', 'Límites de gasto', 'Análisis',
      'Ahorro',
      'Ajustes',
    ]);
  });

  test('el tile "Ahorro" abre la casa (#ahorro) y cierra la hoja', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    await page.click('.nav-item[data-modal="modal-mas"]');
    await page.click('#modal-mas a[href="#ahorro"]');

    await expect(page.locator('#modal-mas[data-open]')).toHaveCount(0);
    await expect(page.locator('#sec-ahorro.active')).toBeVisible();
    await expect(page.locator('#title-ahorro')).toHaveText('Ahorro');
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

  test('la casa muestra el total una vez y las cuatro modalidades con propósito y estado', async ({ page }) => {
    await seedConAhorros(page);
    await page.goto('/#ahorro');
    await page.waitForSelector('#sec-ahorro.active', { timeout: 10_000 });

    // DIS.19: el total bajó al pie del hub y la fila pasó a ser un carril.
    await expect(page.locator('#sec-ahorro .hub__total')).toContainText('Todo lo que tienes guardado');
    await expect(page.locator('#casa-ahorro-total')).toHaveText('$1.500.000');

    const carriles = page.locator('#sec-ahorro .lane');
    await expect(carriles).toHaveCount(4);
    // DIS.19 reemplazó el propósito por el momento de uso, que es lo que ahora
    // ordena los cuatro carriles con una sola pregunta.
    await expect(carriles.locator('.lane__cuando').first())
      .toHaveText('Ojalá nunca lo uses');
    await expect(page.locator('#carril-metas .lane__estado'))
      .toContainText('1 en curso');
  });

  test('los carriles son la navegación: cada uno entra a su sección y se puede volver', async ({ page }) => {
    await seedConAhorros(page);
    await page.goto('/#ahorro');
    await page.waitForSelector('#sec-ahorro.active', { timeout: 10_000 });

    // DIS.19: la salida del carril es su enlace "Ver todo", no la fila entera.
    await page.click('#carril-fondo .lane__ver');
    await expect(page.locator('#sec-fondo.active')).toBeVisible();
    await expect(page.locator('#title-fondo')).toHaveText('Fondo de emergencia');

    // Y desde la hija se puede subir, que es lo que antes no existía.
    await page.click('#sec-fondo .section__volver');
    await expect(page.locator('#sec-ahorro.active')).toBeVisible();

    await page.click('#carril-apartados .lane__ver');
    await expect(page.locator('#sec-apartados.active')).toBeVisible();
    await expect(page.locator('#sec-apartados .section__volver')).toHaveAttribute('href', '#ahorro');
  });

  test('las cuatro hijas abren sin pestañas y sin la card consolidada repetida', async ({ page }) => {
    await seedConAhorros(page);
    await page.goto('/#metas');
    await page.waitForSelector('#sec-metas.active', { timeout: 10_000 });

    await expect(page.locator('.hub-tabs')).toHaveCount(0);
    await expect(page.locator('[data-hub-consolidado]')).toHaveCount(0);
    // El consolidado existe una sola vez, y no es en una hija. DIS.19: el hub
    // es `.hub` y su total el pie `.hub__total`.
    await expect(page.locator('#sec-metas .hub')).toHaveCount(0);
    await expect(page.locator('.hub__total')).toHaveCount(1);

    for (const hash of ['#fondo', '#apartados', '#inversion']) {
      await page.evaluate((h) => { window.location.hash = h; }, hash);
      await expect(page.locator(`${hash.replace('#', '#sec-')}.active .section__volver`)).toHaveCount(1);
    }
  });

  test('sin ahorros la casa igual muestra los cuatro carriles: lo que no aparece no se descubre', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#ahorro');
    await page.waitForSelector('#sec-ahorro.active', { timeout: 10_000 });

    await expect(page.locator('#casa-ahorro-total')).toHaveText('$0');
    await expect(page.locator('#sec-ahorro .lane')).toHaveCount(4);
    await expect(page.locator('#carril-fondo .lane__estado'))
      .toContainText('sin empezar');
  });

  test('el botón "Más" se resalta y nombra la sección en la casa y en sus hijas', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#ahorro');
    await page.waitForSelector('#sec-ahorro.active', { timeout: 10_000 });

    const masBtn = page.locator('.nav-item[data-modal="modal-mas"]');
    await expect(masBtn).toHaveClass(/active/);
    await expect(masBtn.locator('.nav-item__label')).toHaveText('Ahorro');

    await page.evaluate(() => { window.location.hash = '#fondo'; });
    await page.waitForSelector('#sec-fondo.active', { timeout: 5_000 });
    await expect(masBtn).toHaveClass(/active/);
    await expect(masBtn.locator('.nav-item__label')).toHaveText('Fondo');

    await page.evaluate(() => { window.location.hash = '#inversion'; });
    await page.waitForSelector('#sec-inversion.active', { timeout: 5_000 });
    await expect(masBtn).toHaveClass(/active/);
  });
});

// ── DESKTOP: sidebar con grupo "Ahorro" ─────────────────────────────────────

test.describe('DIS.18 - sidebar desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('grupos: diario sin rótulo (NAV2.1b), Seguimiento (con Análisis) y Ahorro con una entrada', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    // El grupo de uso diario ya no lleva rótulo visible (ADR 040 D4); su
    // nombre queda para lectores de pantalla vía aria-label.
    const grupos = await page.$$eval('#sidebar .nav-group__label', els =>
      els.map(e => e.textContent.trim()));
    expect(grupos).toEqual(['Seguimiento', 'Ahorro']);
    await expect(page.locator('#sidebar [role="group"][aria-label="Uso diario"] a[href="#dash"]'))
      .toHaveCount(1);

    // La marca "F" reemplaza al emoji del logo (ADR 040 D4).
    await expect(page.locator('#sidebar .sidebar__logo-mark')).toHaveText('F');

    // Análisis vive dentro del grupo Seguimiento (Herramientas se disolvió).
    const gestion = page.locator('.nav-group', { has: page.locator('#nav-label-gestion') });
    await expect(gestion.locator('a[href="#analisis"]')).toHaveCount(1);

    // El grupo lo encabeza la casa; las 4 modalidades quedan como atajos de
    // desktop, y el fondo apunta a su ruta nueva.
    const ahorros = page.locator('.nav-group', { has: page.locator('#nav-label-ahorros') });
    await expect(ahorros.locator('a')).toHaveCount(5);
    await expect(ahorros.locator('a').first()).toHaveAttribute('href', '#ahorro');
    await expect(ahorros.locator('a[href="#fondo"] .nav-item__label')).toHaveText('Fondo de emergencia');
    await expect(ahorros.locator('a[href="#ahorro"] .nav-item__label')).toHaveText('Ahorro');
  });
});
