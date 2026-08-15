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
import { sembrar } from './helpers/estado.js';

/** Cuenta única compartida por los dos estados de esta suite. */
const CUENTAS = [
  { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 100000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
];

/** Estado mínimo sin ahorros: la casa muestra las cuatro filas en cero. */
async function seedVacio(page) {
  await sembrar(page, {
    perfil: { nombre: 'Ana', smmlv: 1750905 },
    onboarded: true,
    cuentas: CUENTAS,
  });
}

/** Estado con ahorros: fondo $1.000.000 + meta $500.000 → total $1.500.000. */
async function seedConAhorros(page) {
  await sembrar(page, {
      perfil: { nombre: 'Ana', smmlv: 1750905 },
      onboarded: true,
      cuentas: CUENTAS,
      ahorro: {
        fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 1_000_000 },
        aportes: [],
      },
      metas: [
        { id: 'm1', nombre: 'Viaje', montoObjetivo: 2_000_000, montoActual: 500_000, fechaCreacion: '2026-01-01' },
      ],
  });
}

// ── MÓVIL: menú Más y la casa de Ahorro ─────────────────────────────────────

test.describe('DIS.18 - la casa de Ahorro (móvil)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('el menú Más queda en dos rótulos que sí excluyen (ADR 069)', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    await page.click('.nav-item[data-modal="modal-mas"]');
    await expect(page.locator('#modal-mas[data-open]')).toHaveCount(1);

    // "Gestión del dinero" cubría las 15 secciones de una app de finanzas, así
    // que no reducía nada (hallazgo H7). Lo reemplazan dos rótulos que sí
    // dejan secciones fuera.
    const grupos = await page.$$eval('#modal-mas .mas-sheet__group-label', els =>
      els.map(e => e.textContent.trim()));
    expect(grupos).toEqual(['Consultar', 'Tu dinero']);

    // Deudas y Límites salen de la hoja: son lentes del bloque Gastos. Ahorro
    // ya se había ido a la barra inferior (AH.7a, ADR 065 D2).
    const labels = await page.$$eval('#modal-mas .mas-tile__label', els =>
      els.map(e => e.textContent.trim()));
    expect(labels).toEqual([
      'Calendario', 'Movimientos', 'Análisis',
      'Mis cuentas', 'Me deben',
      'Ajustes',
    ]);
  });

  test('la casa (#ahorro) se alcanza desde la barra inferior, sin abrir "Más" (AH.7a)', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    await expect(page.locator('#modal-mas a[href="#ahorro"]')).toHaveCount(0);
    await page.click('.nav-item--mobile-only[href="#ahorro"]');

    await expect(page.locator('#sec-ahorro.active')).toBeVisible();
    await expect(page.locator('#title-ahorro')).toHaveText('Ahorro');
  });

  test('el tile "Calendario" abre la sección y cierra la hoja (AH.7a)', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    await page.click('.nav-item[data-modal="modal-mas"]');
    await page.click('#modal-mas a[href="#agenda"]');

    await expect(page.locator('#modal-mas[data-open]')).toHaveCount(0);
    await expect(page.locator('#sec-agenda.active')).toBeVisible();
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

  test('la pestaña "Ahorro" se resalta en la casa y en sus hijas, y "Más" se queda apagado (AH.7a)', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#ahorro');
    await page.waitForSelector('#sec-ahorro.active', { timeout: 10_000 });

    const ahorroBtn = page.locator('.nav-item--mobile-only[href="#ahorro"]');
    const masBtn = page.locator('.nav-item[data-modal="modal-mas"]');
    await expect(ahorroBtn).toHaveClass(/active/);
    await expect(masBtn).not.toHaveClass(/active/);
    await expect(masBtn.locator('.nav-item__label')).toHaveText('Más');

    for (const hija of ['fondo', 'metas', 'apartados', 'inversion']) {
      await page.evaluate((h) => { window.location.hash = `#${h}`; }, hija);
      await page.waitForSelector(`#sec-${hija}.active`, { timeout: 5_000 });
      await expect(ahorroBtn).toHaveClass(/active/);
      await expect(ahorroBtn).toHaveAttribute('aria-current', 'page');
      await expect(masBtn).not.toHaveClass(/active/);
    }

    // Fuera del grupo la pestaña se apaga.
    await page.evaluate(() => { window.location.hash = '#gast'; });
    await page.waitForSelector('#sec-gast.active', { timeout: 5_000 });
    await expect(ahorroBtn).not.toHaveClass(/active/);
  });

  test('el botón "Más" se resalta detrás del menú pero nunca cambia de palabra (ADR 069, H5)', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#agenda');
    await page.waitForSelector('#sec-agenda.active', { timeout: 10_000 });

    const masBtn = page.locator('.nav-item[data-modal="modal-mas"]');
    await expect(masBtn).toHaveClass(/active/);
    await expect(masBtn.locator('.nav-item__label')).toHaveText('Más');

    await page.evaluate(() => { window.location.hash = '#analisis'; });
    await page.waitForSelector('#sec-analisis.active', { timeout: 5_000 });
    await expect(masBtn).toHaveClass(/active/);
    await expect(masBtn.locator('.nav-item__label')).toHaveText('Más');
    await expect(masBtn).toHaveAttribute('aria-label', 'Mas opciones');
  });

  // Ficha 04 (ADR 069 D7): dentro de Ahorro no se podía ir de lado. De Metas
  // a Reservas había que subir a la casa y volver a bajar; en el bloque
  // Gastos cambiar de lente cuesta 1 toque. La fila de chips cierra la
  // brecha sin inventar un patrón: es la misma que la casa ya tenía.
  test('las cuatro modalidades se alcanzan entre sí con un toque (ADR 069 D7)', async ({ page }) => {
    await seedConAhorros(page);
    await page.goto('/#metas');
    await page.waitForSelector('#sec-metas.active', { timeout: 10_000 });

    const chips = page.locator('#sec-metas .bloque-chips__chip');
    await expect(chips).toHaveText([
      'Ahorro', 'Fondo de emergencia', 'Reservas', 'Metas', 'Inversión',
    ]);
    await expect(chips.filter({ hasText: 'Metas' })).toHaveClass(/active/);

    // De Metas a Reservas sin pasar por la casa.
    await chips.nth(2).click();
    await page.waitForSelector('#sec-apartados.active', { timeout: 5_000 });
    await expect(page.locator('#sec-apartados .bloque-chips__chip[data-section="apartados"]'))
      .toHaveClass(/active/);
    // La barra sigue diciendo el bloque mientras los chips dicen el lugar.
    await expect(page.locator('.nav-item--mobile-only[data-section="ahorro"]')).toHaveClass(/active/);

    // Y el primer chip devuelve a la casa, que no lleva fila inyectada.
    await page.locator('#sec-apartados .bloque-chips__chip[data-section="ahorro"]').click();
    await page.waitForSelector('#sec-ahorro.active', { timeout: 5_000 });
    await expect(page.locator('#sec-ahorro .bloque-chips')).toHaveCount(0);
  });

  // AH1: tres textos mandaban al usuario móvil a "la pestaña Fondo (arriba)",
  // que solo existe en la subnav de escritorio, y dos de ellos son estados
  // vacíos: el texto roto se le aparecía justo al usuario nuevo.
  test('el estado vacío de Metas señala el fondo con un enlace, no con una posición (R85)', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#metas');
    await page.waitForSelector('#sec-metas.active', { timeout: 10_000 });

    const tip = page.locator('#sec-metas .empty-state__tip');
    await expect(tip).not.toContainText('pestaña');
    await expect(tip.locator('a')).toHaveAttribute('href', '#fondo');

    await tip.locator('a').click();
    await expect(page.locator('#sec-fondo.active')).toBeVisible();
  });

  // Ficha 03 (ADR 069 D6): R83, "Más" no scrollea. El techo son 444 px (60%
  // de 740, el alto útil más corto de los cuatro dispositivos de referencia) y
  // es UN solo número para todos los anchos, no uno por dispositivo. Este test
  // es la compuerta de esa regla: si una teja nueva rompe el techo, la teja no
  // es el problema, es la señal de que algo ya no pertenece a la hoja.
  test('la hoja "Más" cabe entera bajo el techo de 444 px y no scrollea (R83)', async ({ page }) => {
    await seedVacio(page);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    await page.click('.nav-item[data-modal="modal-mas"]');
    await expect(page.locator('#modal-mas[data-open]')).toHaveCount(1);

    const medida = await page.$eval('#modal-mas .modal--sheet', (hoja) => ({
      alto:    Math.round(hoja.getBoundingClientRect().height),
      scrollH: hoja.scrollHeight,
      clientH: hoja.clientHeight,
    }));

    expect(medida.alto).toBeLessThanOrEqual(444);
    expect(medida.scrollH).toBeLessThanOrEqual(medida.clientH + 1);
  });

  test('el bloque Gastos enseña sus tres lentes y su estado (ADR 069)', async ({ page }) => {
    // Un fijo vencido y un límite excedido: las dos pastillas con dato.
    await sembrar(page, {
      perfil: { nombre: 'Ana', smmlv: 1750905 },
      onboarded: true,
      cuentas: CUENTAS,
      compromisos: [
        { id: 'k1', descripcion: 'Arriendo', tipo: 'fijo', monto: 1_150_000, diaPago: 1, activo: true },
      ],
      presupuestos: [
        { id: 'p1', categoria: 'Restaurantes', montoMensual: 350_000, activo: true },
      ],
      gastos: [
        { id: 'g1', monto: 412_000, fecha: `${new Date().toISOString().slice(0, 7)}-04`, categoria: 'Restaurantes' },
      ],
    });
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    const franja = page.locator('#sec-gast .bloque-tabs');
    await expect(franja.locator('.bloque-tabs__label')).toHaveText([
      'Lo que gastaste', 'Por pagar', 'Límites',
    ]);
    await expect(franja.locator('.bloque-tabs__tab[data-section="gast"]')).toHaveClass(/active/);

    // Cada pestaña lleva su estado encima: es lo que reemplaza al menú.
    await expect(franja.locator('.bloque-tabs__tab[data-section="compromisos"] .bloque-tabs__badge'))
      .toHaveText('1');
    await expect(franja.locator('.bloque-tabs__tab[data-section="presupuesto"] .bloque-tabs__badge'))
      .toHaveText('1');

    // La lente se abre desde la franja y la barra sigue diciendo "Gastos".
    await franja.locator('.bloque-tabs__tab[data-section="compromisos"]').click();
    await page.waitForSelector('#sec-compromisos.active', { timeout: 5_000 });
    await expect(page.locator('.nav-item[data-section="gast"]')).toHaveClass(/nav-item--bloque-activo/);
    await expect(page.locator('.nav-item[data-modal="modal-mas"]')).not.toHaveClass(/active/);
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

  test('las 4 hijas se anidan: ocultas fuera del grupo, desplegadas dentro (INT.1b)', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    const subnav = page.locator('#nav-subnav-ahorro');
    const trigger = page.locator('[aria-controls="nav-subnav-ahorro"]');
    await expect(subnav).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    for (const hash of ['#ahorro', '#fondo', '#metas', '#apartados', '#inversion']) {
      await page.evaluate((h) => { window.location.hash = h; }, hash);
      await page.waitForSelector(`${hash.replace('#', '#sec-')}.active`, { timeout: 5_000 });
      await expect(subnav).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    }

    await page.evaluate(() => { window.location.hash = '#gast'; });
    await page.waitForSelector('#sec-gast.active', { timeout: 5_000 });
    await expect(subnav).toBeHidden();
  });

  test('el nav cabe sin desbordar a 1280x799 (BUG-026, resuelto por el anidado)', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    const nav = page.locator('.sidebar__nav');
    const [scrollH, clientH] = await nav.evaluate(el => [el.scrollHeight, el.clientHeight]);
    expect(scrollH).toBeLessThanOrEqual(clientH);
  });

  test('el "volver a Ahorro" de las 4 hijas se oculta en desktop: la casa ya está anidada', async ({ page }) => {
    await seedVacio(page);
    await page.goto('/#fondo');
    await page.waitForSelector('#sec-fondo.active', { timeout: 10_000 });
    await expect(page.locator('#sec-fondo .section__volver')).toBeHidden();
  });
});
