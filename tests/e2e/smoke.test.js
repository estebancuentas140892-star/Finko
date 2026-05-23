/**
 * smoke.test.js - Tests E2E de los flujos críticos de Finko.
 *
 * Cubre:
 * 1. Dashboard - carga correcta, 6 métricas visibles.
 * 2. Onboarding - wizard aparece, se completa, no vuelve a aparecer.
 * 3. Navegación - secciones se activan con el router hash.
 * 4. Ingresos - registrar ingreso, verifica en lista.
 * 5. Gastos - registrar gasto, verifica en lista.
 * 6. Tesorería - agregar cuenta, saldo en dashboard se actualiza.
 * 7. Gastos-Cuenta integrado - crear gasto con selector cuenta obligatorio,
 *    verificar saldo decrementado, editar (cambiar monto), eliminar y restaurar.
 * 8. Tema - toggle claro/oscuro actualiza aria-pressed.
 * 9. Sidebar - colapsable en desktop, estado persiste.
 * 10. Agenda - calendario mensual, navegación prev/next.
 */

import { test, expect } from '@playwright/test';

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Inyecta un estado inicial en localStorage para saltear el onboarding.
 * Se llama en `page.addInitScript` antes de que la app cargue.
 */
async function saltearOnboarding(page) {
  await page.addInitScript(() => {
    const estado = {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [],
      ingresos: [],
      gastos: [],
      compromisos: [],
      metas: [],
    };
    localStorage.setItem('fk_v1', JSON.stringify(estado));
  });
}

/**
 * Selector robusto para modal cerrado:
 * - cerrarModal() hace setAttribute('aria-hidden', 'true')
 * - abrirModal() hace removeAttribute('aria-hidden') + dataset.open = ''
 */
const modalCerrado = (id) =>
  `#${id}:not([data-open])`;

// ── SUITE 1: Dashboard ──────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('#saldo-total', { timeout: 10_000 });
  });

  test('carga y muestra las 6 métricas del bento grid', async ({ page }) => {
    await expect(page.locator('#saldo-total')).toBeVisible();
    await expect(page.locator('#ingresos-mes')).toBeVisible();
    await expect(page.locator('#gastos-mes')).toBeVisible();
    await expect(page.locator('#compromisos-count')).toBeVisible();
    await expect(page.locator('#metas-count')).toBeVisible();
    await expect(page.locator('#balance-mes')).toBeVisible();
  });

  test('valores iniciales en $0 o 0 con localStorage vacío', async ({ page }) => {
    await expect(page.locator('#saldo-total')).toHaveText('$0');
    await expect(page.locator('#compromisos-count')).toHaveText('0');
    await expect(page.locator('#metas-count')).toHaveText('0');
  });
});

// ── SUITE 2: Onboarding ─────────────────────────────────────────────────────

test.describe('Onboarding', () => {
  test('aparece el wizard en la primera visita (localStorage vacío)', async ({ page }) => {
    await page.goto('/');
    // Esperar el modal abierto (data-open="" y sin aria-hidden)
    await expect(page.locator('#onboarding[data-open]')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('se puede completar el wizard y no reaparece tras recarga', async ({ page }) => {
    // Navegar primero para tener contexto de origin, luego limpiar localStorage
    // para evitar contaminación de otros tests que dejaron S.onboarded=true.
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await page.waitForSelector('#onboarding[data-open]', { timeout: 5_000 });

    // Llenar nombre y enviar
    await page.locator('#onboarding input[name="nombre"]').fill('María Camila');
    await page.locator('#onboarding button[type="submit"]').click();

    // Wizard debe cerrarse
    await expect(page.locator(modalCerrado('onboarding'))).toBeAttached({
      timeout: 3_000,
    });

    // Esperar que el debounce de save() (200ms) complete antes de recargar.
    await page.waitForTimeout(400);

    // Recargar - el wizard no debe volver a aparecer
    await page.reload();
    await page.waitForSelector('#saldo-total', { timeout: 10_000 });
    await expect(page.locator('#onboarding[data-open]')).toHaveCount(0);
  });
});

// ── SUITE 3: Navegación ─────────────────────────────────────────────────────

test.describe('Navegación hash', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('#saldo-total', { timeout: 10_000 });
  });

  const secciones = [
    { href: '#gast',        seccion: 'sec-gast' },
    { href: '#compromisos',  seccion: 'sec-compromisos' },
    { href: '#agenda',      seccion: 'sec-agenda' },
    { href: '#tesoreria',   seccion: 'sec-tesoreria' },
    { href: '#metas',       seccion: 'sec-metas' },
    { href: '#analisis',    seccion: 'sec-analisis' },
    { href: '#config',      seccion: 'sec-config' },
    { href: '#dash',        seccion: 'sec-dash' },
  ];

  for (const { href, seccion } of secciones) {
    test(`navega a ${href} y activa #${seccion}`, async ({ page }) => {
      await page.click(`a[href="${href}"]`);
      await expect(page.locator(`#${seccion}`)).toHaveClass(/active/);
    });
  }
});

// ── SUITE 4: Ingresos (card dentro de Tesorería) ────────────────────────────
// Ingresos ya no tiene sección propia. Vive como card compacta dentro de Tesorería.

test.describe('Ingresos - card en Tesorería', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
  });

  test('muestra card de ingresos dentro de Tesorería', async ({ page }) => {
    await expect(page.locator('.ingresos-card')).toBeVisible();
    await expect(page.locator('.ingresos-card__title')).toBeVisible();
    // Botón agregar debe existir dentro de la card
    await expect(page.locator('.ingresos-card [data-action="nuevo-ingreso"]')).toBeVisible();
  });

  test('abrir modal ingreso y cerrar con Escape', async ({ page }) => {
    await page.click('.ingresos-card [data-action="nuevo-ingreso"]');
    await expect(page.locator('#modal-ingreso[data-open]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator(modalCerrado('modal-ingreso'))).toBeAttached();
  });

  test('registrar ingreso mensual y verifica en card', async ({ page }) => {
    await page.click('.ingresos-card [data-action="nuevo-ingreso"]');
    await page.waitForSelector('#modal-ingreso[data-open]');

    const form = page.locator('#modal-ingreso-body form');
    await form.locator('[name="descripcion"]').fill('Salario prueba E2E');
    await form.locator('[name="monto"]').fill('3000000');
    await form.locator('select[name="frecuencia"]').selectOption({ index: 1 });
    await form.locator('button[type="submit"]').click();

    // Modal se cierra
    await expect(page.locator(modalCerrado('modal-ingreso'))).toBeAttached({
      timeout: 3_000,
    });

    // El ingreso aparece en la card dentro de Tesorería
    await expect(page.locator('.ingresos-card__list')).toContainText(
      'Salario prueba E2E',
      { timeout: 3_000 }
    );
  });
});

// ── SUITE 5: Gastos ─────────────────────────────────────────────────────────

test.describe('Gastos - CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });
  });

  test('registrar gasto y verifica en lista', async ({ page }) => {
    // Precondición: crear una cuenta (cuentaId es obligatorio en gastos)
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');
    const formCuenta = page.locator('#modal-cuenta-body form');
    await formCuenta.locator('[name="nombre"]').fill('Cta E2E Gastos');
    await formCuenta.locator('.bank-picker__trigger').click();
    await page.locator('.bank-picker__item').first().click();
    await formCuenta.locator('select[name="tipo"]').selectOption({ index: 1 });
    await formCuenta.locator('[name="saldo"]').fill('500000');
    await formCuenta.locator('button[type="submit"]').click();
    await expect(page.locator('#lista-tesoreria')).toContainText('Cta E2E Gastos', { timeout: 3_000 });

    // Ir a Gastos
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');

    const form = page.locator('#modal-gasto-body form');
    await form.locator('[name="descripcion"]').fill('Mercado prueba E2E');
    await form.locator('[name="monto"]').fill('150000');
    // Selector de cuenta (obligatorio)
    await form.locator('select[name="cuentaId"]').selectOption('Cta E2E Gastos');
    // Seleccionar la primera opción real del select de categoría
    await form.locator('select[name="categoria"]').selectOption({ index: 1 });
    // Fecha (pre-rellenada por hoy() en el index.js; rellenar por si acaso)
    const hoy = new Date().toISOString().slice(0, 10);
    await form.locator('[name="fecha"]').fill(hoy);
    await form.locator('button[type="submit"]').click();

    await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({
      timeout: 3_000,
    });
    await expect(page.locator('#lista-gastos')).toContainText(
      'Mercado prueba E2E',
      { timeout: 3_000 }
    );
  });
});

// ── SUITE 6: Tesorería ──────────────────────────────────────────────────────

test.describe('Tesorería - cuenta y saldo', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
  });

  test('agregar cuenta actualiza saldo en dashboard', async ({ page }) => {
    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');

    const form = page.locator('#modal-cuenta-body form');
    await form.locator('[name="nombre"]').fill('Ahorros prueba E2E');
    // banco: abrir el custom picker y elegir el primer banco de la lista.
    // La lista usa position:fixed, por eso se busca desde page y no desde form.
    await form.locator('.bank-picker__trigger').click();
    await page.locator('.bank-picker__item').first().click();
    await form.locator('select[name="tipo"]').selectOption({ index: 1 });
    await form.locator('[name="saldo"]').fill('850000');
    await form.locator('button[type="submit"]').click();

    // Cuenta aparece en la lista
    await expect(page.locator('#lista-tesoreria')).toContainText(
      'Ahorros prueba E2E',
      { timeout: 3_000 }
    );

    // Ir al dashboard - saldo debe actualizar
    await page.click('a[href="#dash"]');
    await expect(page.locator('#saldo-total')).toHaveText('$850.000', {
      timeout: 3_000,
    });
  });
});

// ── SUITE 7: Gastos-Cuenta (flujo integrado) ────────────────────────────────
// Smoke test del flujo crítico: crear cuenta → crear gasto (selector cuenta
// obligatorio) → verificar saldo decrementado → editar gasto (cambiar monto/cuenta)
// → verificar saldo recalculado → eliminar gasto → verificar saldo restaurado.

test.describe('Gastos-Cuenta (integrado)', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    // Estado inicial: sin cuentas, sin gastos (localStorage vacío excepto onboarded)
    await page.goto('/');
    await page.waitForSelector('#saldo-total', { timeout: 10_000 });
  });

  test('crear cuenta, gasto con selector, verificar saldo decrementado', async ({ page }) => {
    // 1. Crear una cuenta
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');

    const formCuenta = page.locator('#modal-cuenta-body form');
    await formCuenta.locator('[name="nombre"]').fill('Cuenta Prueba Gastos');
    await formCuenta.locator('.bank-picker__trigger').click();
    await page.locator('.bank-picker__item').first().click();
    await formCuenta.locator('select[name="tipo"]').selectOption({ index: 1 });
    await formCuenta.locator('[name="saldo"]').fill('1000000');
    await formCuenta.locator('button[type="submit"]').click();

    // Esperar cierre y que la cuenta aparezca en la lista
    await expect(page.locator('#lista-tesoreria')).toContainText(
      'Cuenta Prueba Gastos',
      { timeout: 3_000 }
    );

    // 2. Ir a Gastos y crear un gasto con selector de cuenta
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');

    const formGasto = page.locator('#modal-gasto-body form');
    await formGasto.locator('[name="descripcion"]').fill('Mercado gastos-cuenta');
    await formGasto.locator('[name="monto"]').fill('100000');
    await formGasto.locator('select[name="categoria"]').selectOption({ index: 1 });

    // Selector de cuenta OBLIGATORIO - debe estar visible
    await formGasto.locator('select[name="cuentaId"]').selectOption('Cuenta Prueba Gastos');

    const hoy = new Date().toISOString().slice(0, 10);
    await formGasto.locator('[name="fecha"]').fill(hoy);
    await formGasto.locator('button[type="submit"]').click();

    // Esperar cierre y que el gasto aparezca
    await expect(page.locator('#lista-gastos')).toContainText(
      'Mercado gastos-cuenta',
      { timeout: 3_000 }
    );

    // 3. Ir a Tesorería y verificar que el saldo decrementó de 1000000 a 900000
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    // Buscar la cuenta en la lista - debe contener el nuevo saldo $900.000
    await expect(page.locator('#lista-tesoreria')).toContainText('$900.000', {
      timeout: 3_000,
    });

    // 4. Ir a Dashboard y verificar "Tu plata disponible hoy" muestra $900.000
    await page.goto('/#dash');
    await page.waitForSelector('#saldo-total', { timeout: 10_000 });
    await expect(page.locator('#saldo-total')).toHaveText('$900.000', {
      timeout: 3_000,
    });
  });

  test('editar gasto: cambiar monto, verificar saldo recalculado', async ({ page }) => {
    // Precondición: crear cuenta y gasto (similar a test anterior)
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    // Crear cuenta
    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');
    const formCuenta = page.locator('#modal-cuenta-body form');
    await formCuenta.locator('[name="nombre"]').fill('Cuenta Edit Prueba');
    await formCuenta.locator('.bank-picker__trigger').click();
    await page.locator('.bank-picker__item').first().click();
    await formCuenta.locator('select[name="tipo"]').selectOption({ index: 1 });
    await formCuenta.locator('[name="saldo"]').fill('500000');
    await formCuenta.locator('button[type="submit"]').click();
    await expect(page.locator('#lista-tesoreria')).toContainText(
      'Cuenta Edit Prueba',
      { timeout: 3_000 }
    );

    // Crear gasto
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });
    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');
    const formGasto = page.locator('#modal-gasto-body form');
    await formGasto.locator('[name="descripcion"]').fill('Gasto a editar');
    await formGasto.locator('[name="monto"]').fill('100000');
    await formGasto.locator('select[name="categoria"]').selectOption({ index: 1 });
    await formGasto.locator('select[name="cuentaId"]').selectOption('Cuenta Edit Prueba');
    const hoy = new Date().toISOString().slice(0, 10);
    await formGasto.locator('[name="fecha"]').fill(hoy);
    await formGasto.locator('button[type="submit"]').click();
    await expect(page.locator('#lista-gastos')).toContainText(
      'Gasto a editar',
      { timeout: 3_000 }
    );

    // Saldo debe estar en 400000 (500000 - 100000)
    await page.goto('/#tesoreria');
    await expect(page.locator('#lista-tesoreria')).toContainText(
      '$400.000',
      { timeout: 3_000 }
    );

    // EDITAR: cambiar monto de 100000 a 150000 (total descuento 150000, saldo debe ser 350000)
    await page.goto('/#gast');

    // Buscar el list-item que contiene "Gasto a editar" y clickear su botón de editar
    const gastoList = page.locator('#lista-gastos');
    const gastoItem = gastoList.locator('article').filter({ hasText: 'Gasto a editar' }).first();
    const editBtn = gastoItem.locator('[data-action="editar-gasto"]');
    await editBtn.click();

    await page.waitForSelector('#modal-gasto[data-open]');
    const formGastoEdit = page.locator('#modal-gasto-body form');
    await formGastoEdit.locator('[name="monto"]').fill('150000');
    await formGastoEdit.locator('button[type="submit"]').click();

    // Verificar que se cerró el modal
    await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({
      timeout: 3_000,
    });

    // Ir a Tesorería y verificar que el saldo ahora es $350.000 (500000 - 150000)
    await page.goto('/#tesoreria');
    await expect(page.locator('#lista-tesoreria')).toContainText(
      '$350.000',
      { timeout: 3_000 }
    );
  });

  test('eliminar gasto, verificar saldo restaurado', async ({ page }) => {
    // Precondición: crear cuenta y gasto
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    // Crear cuenta con saldo 800000
    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');
    const formCuenta = page.locator('#modal-cuenta-body form');
    await formCuenta.locator('[name="nombre"]').fill('Cuenta Delete Prueba');
    await formCuenta.locator('.bank-picker__trigger').click();
    await page.locator('.bank-picker__item').first().click();
    await formCuenta.locator('select[name="tipo"]').selectOption({ index: 1 });
    await formCuenta.locator('[name="saldo"]').fill('800000');
    await formCuenta.locator('button[type="submit"]').click();
    await expect(page.locator('#lista-tesoreria')).toContainText(
      'Cuenta Delete Prueba',
      { timeout: 3_000 }
    );

    // Crear gasto de 200000
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });
    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');
    const formGasto = page.locator('#modal-gasto-body form');
    await formGasto.locator('[name="descripcion"]').fill('Gasto a eliminar');
    await formGasto.locator('[name="monto"]').fill('200000');
    await formGasto.locator('select[name="categoria"]').selectOption({ index: 1 });
    await formGasto.locator('select[name="cuentaId"]').selectOption('Cuenta Delete Prueba');
    const hoy = new Date().toISOString().slice(0, 10);
    await formGasto.locator('[name="fecha"]').fill(hoy);
    await formGasto.locator('button[type="submit"]').click();
    await expect(page.locator('#lista-gastos')).toContainText(
      'Gasto a eliminar',
      { timeout: 3_000 }
    );

    // Saldo debe estar en 600000 (800000 - 200000)
    await page.goto('/#tesoreria');
    await expect(page.locator('#lista-tesoreria')).toContainText(
      '$600.000',
      { timeout: 3_000 }
    );

    // ELIMINAR gasto
    await page.goto('/#gast');
    const gastoList = page.locator('#lista-gastos');
    const gastoItem = gastoList.locator('article').filter({ hasText: 'Gasto a eliminar' }).first();
    const deleteBtn = gastoItem.locator('[data-action="eliminar-gasto"]');
    await deleteBtn.click();

    // Confirmar eliminación (modal de confirmación con data-role)
    const confirmBtn = page.locator('[data-role="confirmar"]');
    await confirmBtn.click();

    // El gasto debe desaparecer de la lista
    await expect(page.locator('#lista-gastos')).not.toContainText(
      'Gasto a eliminar',
      { timeout: 3_000 }
    );

    // Ir a Tesorería y verificar que el saldo volvió a 800000
    await page.goto('/#tesoreria');
    await expect(page.locator('#lista-tesoreria')).toContainText(
      '$800.000',
      { timeout: 3_000 }
    );
  });
});

// ── SUITE 8: Tema ────────────────────────────────────────────────────────────
// El toggle de tema vive solo en la sección Ajustes (#config), visible en
// todos los tamaños de pantalla. Es un <input type="checkbox">.

test.describe('Tema claro/oscuro', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#config');
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });
  });

  test('toggle cambia la clase light-theme en el body', async ({ page }) => {
    const checkbox = page.locator('#toggle-tema');

    // Estado inicial: oscuro (body sin light-theme)
    await expect(page.locator('body')).not.toHaveClass(/light-theme/);

    // Toggle → claro
    await checkbox.click();
    await expect(page.locator('body')).toHaveClass(/light-theme/);

    // Doble toggle → oscuro de nuevo
    await checkbox.click();
    await expect(page.locator('body')).not.toHaveClass(/light-theme/);
  });

  test('el tema persiste tras recarga', async ({ page }) => {
    await page.locator('#toggle-tema').click();
    await expect(page.locator('body')).toHaveClass(/light-theme/);

    await page.reload();
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });

    // Body debe seguir en light tras recarga
    await expect(page.locator('body')).toHaveClass(/light-theme/);
  });
});

// ── SUITE 8: Sidebar colapsable ──────────────────────────────────────────────
// Solo aplica en desktop (viewport >= 1024px). El viewport por defecto de
// Playwright Chromium es 1280x720, suficiente para activar el sidebar lateral.

test.describe('Sidebar colapsable (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('#saldo-total', { timeout: 10_000 });
  });

  test('colapsa el sidebar y oculta los labels', async ({ page }) => {
    const btn = page.locator('[data-action="sidebar-toggle"]');

    // Estado inicial: expandido
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.sidebar__logo-text')).toBeVisible();

    // Colapsar
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.sidebar__logo-text')).not.toBeVisible();
  });

  test('expande el sidebar nuevamente', async ({ page }) => {
    const btn = page.locator('[data-action="sidebar-toggle"]');

    // Colapsar y volver a expandir
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');

    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.sidebar__logo-text')).toBeVisible();
  });

  test('el estado colapsado persiste tras recarga', async ({ page }) => {
    const btn = page.locator('[data-action="sidebar-toggle"]');

    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');

    await page.reload();
    await page.waitForSelector('#saldo-total', { timeout: 10_000 });

    // Debe seguir colapsado
    await expect(
      page.locator('[data-action="sidebar-toggle"]')
    ).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.sidebar__logo-text')).not.toBeVisible();
  });
});

// ── SUITE 9: Agenda ─────────────────────────────────────────────────────────
// Calendario mensual de compromisos. Verifica que la sección carga,
// muestra título, grilla días, y leyenda. Navega prev/next mes.

test.describe('Agenda', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
  });

  test('carga y muestra calendario del mes', async ({ page }) => {
    // Heading "Mi Agenda"
    await expect(page.locator('h1').filter({ hasText: 'Mi Agenda' })).toBeVisible();

    // Cabecera calendario: mes actual (Mayo o similar)
    await expect(page.locator('.cal-card__title')).toBeVisible();
    await expect(page.locator('.cal-card__subtitle')).toBeVisible();

    // Grilla con al menos un día visible
    await expect(page.locator('[role="grid"]').first()).toBeVisible();

    // Leyenda de tipos (Fijo, Deuda, Agenda)
    await expect(page.locator('.cal-legend')).toBeVisible();
    await expect(page.locator('.cal-legend').locator('text=Fijo')).toBeVisible();
    await expect(page.locator('.cal-legend').locator('text=Deuda')).toBeVisible();
    await expect(page.locator('.cal-legend').locator('text=Agenda')).toBeVisible();
  });

  test('navega mes anterior con botón <', async ({ page }) => {
    const btnPrev = page.locator('[data-action="agenda-prev-mes"]');
    const titulo = page.locator('.cal-card__title');

    const mesBefore = await titulo.textContent();

    await btnPrev.click();
    await page.waitForTimeout(100);

    const mesAfter = await titulo.textContent();

    // Debe cambiar el mes mostrado
    expect(mesBefore).not.toBe(mesAfter);
  });

  test('navega mes siguiente con botón >', async ({ page }) => {
    const btnNext = page.locator('[data-action="agenda-next-mes"]');
    const titulo = page.locator('.cal-card__title');

    const mesBefore = await titulo.textContent();

    await btnNext.click();
    await page.waitForTimeout(100);

    const mesAfter = await titulo.textContent();

    // Debe cambiar el mes mostrado
    expect(mesBefore).not.toBe(mesAfter);
  });
});
