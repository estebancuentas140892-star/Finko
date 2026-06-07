/**
 * ahorro-inversion.test.js - Smoke E2E para los dominios Ahorro (J.1) e Inversión (J.2).
 *
 * Cubre:
 *
 * Suite A: Ahorro (fondo de emergencia)
 *   A.1 - Empty state visible al navegar desde el Dashboard.
 *   A.2 - Activar el fondo: modal + form + hero con monto correcto.
 *   A.3 - Registrar un aporte: aparece en historial y el monto del hero sube.
 *   A.4 - Fondo y aporte persisten tras recarga de página.
 *
 * Suite B: Inversión (portafolio real)
 *   B.1 - Empty state visible al navegar desde el Dashboard.
 *   B.2 - Registrar inversión: aparece en lista y el hero muestra el total.
 *   B.3 - CDT con tasa y plazo: proyección al vencimiento visible en el item.
 *   B.4 - Eliminar inversión: desaparece de la lista.
 *   B.5 - Inversiones persisten tras recarga de página.
 *
 * Nota: el empty state de Ahorro al navegar desde #dash también tiene cobertura
 * en navegacion-render.test.js (regresión hashchange). Aquí se cubre de forma
 * más explícita con estado v8 y selectors directos.
 */

import { test, expect } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Inyecta el estado mínimo v8 con onboarding completado y los dominios
 * Ahorro e Inversión vacíos. Usa addInitScript para que corra antes de que
 * la app inicialice y lea localStorage.
 *
 * IMPORTANTE: addInitScript corre en CADA carga, incluida `page.reload()`.
 * Por eso solo siembra si `fk_v1` aún no existe: así los tests de persistencia
 * pueden crear datos, recargar, y que el seed NO los pise al re-ejecutarse.
 */
async function estadoBaseV8(page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('fk_v1')) return; // ya sembrado o con datos del test
    const estado = {
      _version:    8,
      perfil:      { nombre: 'TestUser', smmlv: 1750905 },
      onboarded:   true,
      cuentas:     [],
      ingresos:    [],
      gastos:      [],
      compromisos: [],
      metas:       [],
      prestamos:   [],
      presupuestos: [],
      ahorro: {
        fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0, completado: false },
        aportes:         [],
        compromisoMensual: 0,
      },
      inversiones: [],
    };
    localStorage.setItem('fk_v1', JSON.stringify(estado));
  });
}

/** Navega al Dashboard y espera que cargue antes de iniciar cada test. */
async function irADash(page) {
  await page.goto('/#dash');
  await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
}

/**
 * Selector para modal cerrado: modales.js pone data-open="" al abrir
 * y removeAttribute('data-open') al cerrar.
 */
const modalCerrado = (id) => `#${id}:not([data-open])`;

// ── SUITE A: Ahorro ─────────────────────────────────────────────────────────

test.describe('Ahorro - fondo de emergencia (J.1)', () => {
  test.beforeEach(async ({ page }) => {
    await estadoBaseV8(page);
    await irADash(page);
  });

  // A.1 - Empty state --------------------------------------------------------

  test('muestra el empty state al navegar desde Dashboard', async ({ page }) => {
    await page.click('a[href="#ahorro"]');
    await expect(page.locator('#sec-ahorro.active')).toBeVisible({ timeout: 5_000 });

    await expect(
      page.locator('#panel-ahorro .empty-state__title')
    ).toHaveText('Empieza tu fondo de emergencia', { timeout: 3_000 });

    // El CTA de activación está presente
    await expect(page.locator('[data-action="ahorro-activar-fondo"]')).toBeVisible();
  });

  // A.2 - Activar fondo: modal → form → hero --------------------------------

  test('activar fondo: modal abre, form se envía, hero muestra el monto base', async ({ page }) => {
    await page.click('a[href="#ahorro"]');
    await expect(page.locator('#sec-ahorro.active')).toBeVisible({ timeout: 5_000 });

    // Abrir modal de activación
    await page.click('[data-action="ahorro-activar-fondo"]');
    await page.waitForSelector('#modal-ahorro[data-open]', { timeout: 5_000 });

    const form = page.locator('#modal-ahorro-body form#form-fondo');

    // Rellenar: 3 meses de meta, $500.000 ya apartados
    await form.locator('[name="metaMeses"]').fill('3');
    await form.locator('[name="montoActual"]').fill('500000');
    await form.locator('button[type="submit"]').click();

    // El modal debe cerrarse
    await expect(page.locator(modalCerrado('modal-ahorro'))).toBeAttached({ timeout: 3_000 });

    // El hero debe mostrarse con el monto base
    await expect(page.locator('.fondo-hero')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('.fondo-hero__title')).toHaveText('$500.000');
  });

  // A.3 - Aporte: historial + monto del hero sube ----------------------------

  test('registrar aporte: aparece en historial y el hero suma el monto', async ({ page }) => {
    // Precondición: activar fondo con $500.000 de base
    await page.click('a[href="#ahorro"]');
    await expect(page.locator('#sec-ahorro.active')).toBeVisible({ timeout: 5_000 });
    await page.click('[data-action="ahorro-activar-fondo"]');
    await page.waitForSelector('#modal-ahorro[data-open]', { timeout: 5_000 });
    const formFondo = page.locator('#modal-ahorro-body form#form-fondo');
    await formFondo.locator('[name="metaMeses"]').fill('3');
    await formFondo.locator('[name="montoActual"]').fill('500000');
    await formFondo.locator('button[type="submit"]').click();
    await expect(page.locator('.fondo-hero__title')).toHaveText('$500.000', { timeout: 3_000 });

    // Registrar un aporte de $200.000
    await page.click('[data-action="ahorro-nuevo-aporte"]');
    await page.waitForSelector('#modal-ahorro[data-open]', { timeout: 5_000 });
    const formAporte = page.locator('#modal-ahorro-body form#form-aporte');
    await formAporte.locator('[name="monto"]').fill('200000');
    const hoy = new Date().toISOString().slice(0, 10);
    await formAporte.locator('[name="fecha"]').fill(hoy);
    await formAporte.locator('button[type="submit"]').click();

    // Modal cierra
    await expect(page.locator(modalCerrado('modal-ahorro'))).toBeAttached({ timeout: 3_000 });

    // Hero debe mostrar la suma: $500.000 + $200.000 = $700.000
    await expect(page.locator('.fondo-hero__title')).toHaveText('$700.000', { timeout: 3_000 });

    // El aporte aparece en el historial
    await expect(page.locator('.ahorro-habito__lista')).toContainText('$200.000', { timeout: 3_000 });
  });

  // A.4 - Persistencia -------------------------------------------------------

  test('fondo persiste tras recarga de página', async ({ page }) => {
    // Activar fondo con $300.000
    await page.click('a[href="#ahorro"]');
    await expect(page.locator('#sec-ahorro.active')).toBeVisible({ timeout: 5_000 });
    await page.click('[data-action="ahorro-activar-fondo"]');
    await page.waitForSelector('#modal-ahorro[data-open]', { timeout: 5_000 });
    const formFondo = page.locator('#modal-ahorro-body form#form-fondo');
    await formFondo.locator('[name="metaMeses"]').fill('3');
    await formFondo.locator('[name="montoActual"]').fill('300000');
    await formFondo.locator('button[type="submit"]').click();
    await expect(page.locator('.fondo-hero__title')).toHaveText('$300.000', { timeout: 3_000 });

    // Esperar que el debounce de save() (200ms) complete
    await page.waitForTimeout(400);

    // Recargar: el hash #ahorro se conserva, la sección se reactiva al bootear.
    // No esperamos #saldo-total porque vive en el dashboard (no activo aquí).
    await page.reload();
    await expect(page.locator('#sec-ahorro.active')).toBeVisible({ timeout: 10_000 });

    // El hero debe mostrar los mismos datos
    await expect(page.locator('.fondo-hero')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('.fondo-hero__title')).toHaveText('$300.000');
  });
});

// ── SUITE B: Inversión ──────────────────────────────────────────────────────

test.describe('Inversión - portafolio real (J.2)', () => {
  test.beforeEach(async ({ page }) => {
    await estadoBaseV8(page);
    await irADash(page);
  });

  // B.1 - Empty state --------------------------------------------------------

  test('muestra el empty state al navegar desde Dashboard', async ({ page }) => {
    await page.click('a[href="#inversion"]');
    await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 5_000 });

    await expect(
      page.locator('#panel-inversion .empty-state__title')
    ).toHaveText('Registra tus inversiones', { timeout: 3_000 });

    // El CTA de alta está presente
    await expect(page.locator('[data-action="inversion-nueva"]').first()).toBeVisible();
  });

  // B.2 - Alta inversión: lista + hero ----------------------------------------

  test('registrar inversión: aparece en lista y el hero muestra el total', async ({ page }) => {
    await page.click('a[href="#inversion"]');
    await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 5_000 });

    await page.click('[data-action="inversion-nueva"]');
    await page.waitForSelector('#modal-inversion[data-open]', { timeout: 5_000 });

    const form = page.locator('#modal-inversion-body form#form-inversion');
    await form.locator('select[name="tipo"]').selectOption('CDT');
    await form.locator('[name="nombre"]').fill('CDT Bancolombia E2E');
    await form.locator('[name="monto"]').fill('5000000');
    const hoy = new Date().toISOString().slice(0, 10);
    await form.locator('[name="fechaInicio"]').fill(hoy);
    await form.locator('button[type="submit"]').click();

    // Modal cierra
    await expect(page.locator(modalCerrado('modal-inversion'))).toBeAttached({ timeout: 3_000 });

    // La inversión aparece en la lista
    await expect(
      page.locator('.inversion-lista__items')
    ).toContainText('CDT Bancolombia E2E', { timeout: 3_000 });

    // El hero muestra el total invertido
    await expect(page.locator('.inversion-hero__title')).toHaveText('$5.000.000', { timeout: 3_000 });
  });

  // B.3 - CDT con tasa y plazo: proyección visible en el item ----------------

  test('CDT con tasa y plazo muestra la proyección al vencimiento en el item', async ({ page }) => {
    await page.click('a[href="#inversion"]');
    await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 5_000 });

    await page.click('[data-action="inversion-nueva"]');
    await page.waitForSelector('#modal-inversion[data-open]', { timeout: 5_000 });

    const form = page.locator('#modal-inversion-body form#form-inversion');
    await form.locator('select[name="tipo"]').selectOption('CDT');
    await form.locator('[name="nombre"]').fill('CDT Davivienda E2E');
    await form.locator('[name="monto"]').fill('10000000');
    await form.locator('[name="tasaEA"]').fill('10');
    await form.locator('[name="plazoMeses"]').fill('12');
    const hoy = new Date().toISOString().slice(0, 10);
    await form.locator('[name="fechaInicio"]').fill(hoy);
    await form.locator('button[type="submit"]').click();

    await expect(page.locator(modalCerrado('modal-inversion'))).toBeAttached({ timeout: 3_000 });

    // El item de la lista debe tener la línea de proyección
    // CDT 10M al 10% EA por 12 meses: VF bruto $11.000.000, retención 7% sobre
    // $1.000.000 = $70.000, VF neto = $10.930.000
    const item = page.locator('.inversion-lista__items .list-item')
      .filter({ hasText: 'CDT Davivienda E2E' });
    await expect(item.locator('.inversion-item__proy')).toBeVisible({ timeout: 3_000 });
    await expect(item.locator('.inversion-item__proy')).toContainText('Al vencimiento:');
    await expect(item.locator('.inversion-item__proy')).toContainText('$10.930.000');
  });

  // B.4 - Eliminar inversión -------------------------------------------------

  test('eliminar inversión la quita de la lista', async ({ page }) => {
    await page.click('a[href="#inversion"]');
    await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 5_000 });

    // Registrar para poder eliminar
    await page.click('[data-action="inversion-nueva"]');
    await page.waitForSelector('#modal-inversion[data-open]', { timeout: 5_000 });
    const form = page.locator('#modal-inversion-body form#form-inversion');
    await form.locator('select[name="tipo"]').selectOption('Fondo');
    await form.locator('[name="nombre"]').fill('Fondo a eliminar E2E');
    await form.locator('[name="monto"]').fill('2000000');
    const hoy = new Date().toISOString().slice(0, 10);
    await form.locator('[name="fechaInicio"]').fill(hoy);
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('.inversion-lista__items')).toContainText(
      'Fondo a eliminar E2E',
      { timeout: 3_000 }
    );

    // Eliminar: click en el botón trash del item
    const item = page.locator('.inversion-lista__items .list-item')
      .filter({ hasText: 'Fondo a eliminar E2E' });
    await item.locator('[data-action="inversion-eliminar"]').click();

    // Confirmar en el diálogo de confirmación
    await page.locator('[data-role="confirmar"]').click();

    // Era la única inversión: al eliminarla, el panel vuelve al empty state.
    await expect(page.locator('#panel-inversion')).not.toContainText(
      'Fondo a eliminar E2E',
      { timeout: 3_000 }
    );
    await expect(
      page.locator('#panel-inversion .empty-state__title')
    ).toHaveText('Registra tus inversiones', { timeout: 3_000 });
  });

  // B.5 - Persistencia -------------------------------------------------------

  test('inversiones persisten tras recarga de página', async ({ page }) => {
    await page.click('a[href="#inversion"]');
    await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 5_000 });

    // Registrar inversión
    await page.click('[data-action="inversion-nueva"]');
    await page.waitForSelector('#modal-inversion[data-open]', { timeout: 5_000 });
    const form = page.locator('#modal-inversion-body form#form-inversion');
    await form.locator('select[name="tipo"]').selectOption('Acciones');
    await form.locator('[name="nombre"]').fill('Acciones Colombia E2E');
    await form.locator('[name="monto"]').fill('8000000');
    const hoy = new Date().toISOString().slice(0, 10);
    await form.locator('[name="fechaInicio"]').fill(hoy);
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('.inversion-hero__title')).toHaveText('$8.000.000', { timeout: 3_000 });

    // Esperar el debounce de save() (200ms)
    await page.waitForTimeout(400);

    // Recargar: el hash #inversion se conserva, la sección se reactiva al bootear.
    await page.reload();
    await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 10_000 });

    // La inversión persiste
    await expect(
      page.locator('.inversion-lista__items')
    ).toContainText('Acciones Colombia E2E', { timeout: 3_000 });
    await expect(page.locator('.inversion-hero__title')).toHaveText('$8.000.000');
  });
});
