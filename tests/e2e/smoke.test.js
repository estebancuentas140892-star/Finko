/**
 * smoke.test.js - Tests E2E de los flujos críticos de Finko.
 *
 * Cubre:
 * 1. Dashboard - carga correcta, métricas visibles.
 * 2. Onboarding - wizard aparece, se completa, no vuelve a aparecer.
 * 3. Navegación - secciones se activan con el router hash.
 * 4. Gastos - registrar gasto, verifica en lista.
 * 5. Tesorería - agregar cuenta, saldo en dashboard se actualiza.
 * 7. Gastos-Cuenta integrado - crear gasto con selector cuenta obligatorio,
 *    verificar saldo decrementado, editar (cambiar monto), eliminar y restaurar.
 * 8. Tema - toggle claro/oscuro actualiza aria-pressed.
 * 9. Sidebar - colapsable en desktop, estado persiste.
 * 10. Agenda - calendario mensual, navegación prev/next.
 * 11. Agenda - badge "Ya abonaste este mes" (ADR 002).
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

/**
 * Crea una cuenta de tipo Efectivo con el saldo indicado.
 *
 * El form de cuenta fue rediseñado en v8.7-v8.9:
 * - Ya no tiene campo `nombre`; el nombre se autogenera como banco + tipo.
 * - El banco se elige con un custom bank-picker cuya lista flotante (_initBankPicker)
 *   se mueve a <body> con position:fixed, por eso los items se buscan desde `page`.
 * - Para "Efectivo" el campo tipo se oculta automáticamente (no requiere selección).
 * - Nombre autogenerado resultante: "Efectivo".
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} saldo - saldo inicial de la cuenta (entero, COP)
 */
async function crearCuentaEfectivo(page, saldo) {
  await page.click('[data-action="nueva-cuenta"]');
  await page.waitForSelector('#modal-cuenta[data-open]');

  // Abrir el bank-picker y seleccionar Efectivo (primer banco en la lista).
  // La lista flotante se mueve a <body> por JS; hay que buscarla desde page.
  const form = page.locator('#modal-cuenta-body form');
  await form.locator('.bank-picker__trigger').click();
  await page.waitForSelector('#banco-list:not([hidden])', { timeout: 5_000 });
  await page.locator('#banco-list .bank-picker__item[data-value="Efectivo"]').click();

  // Tipo se oculta para Efectivo; solo rellenar saldo.
  await form.locator('[name="saldo"]').fill(String(saldo));
  await form.locator('button[type="submit"]').click();

  // Esperar cierre del modal antes de continuar.
  await page.waitForSelector(modalCerrado('modal-cuenta'), { timeout: 5_000 });
}

// ── SUITE 1: Dashboard ──────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
  });

  test('carga el dashboard y activa la sección principal', async ({ page }) => {
    await expect(page.locator('#sec-dash.active')).toBeVisible();
    // Con cuentas vacías, I.1 muestra la guía de primeros pasos
    await expect(page.locator('#hero-guia-saldo')).toBeVisible();
  });

  test('con una cuenta nueva, el saldo total es $0', async ({ page }) => {
    // El beforeEach siembra estado vacío. Aquí agregamos una cuenta con saldo 0
    // (segundo addInitScript: lee el estado ya sembrado y agrega la cuenta).
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.cuentas = [{ id: 'c1', nombre: 'Efectivo', tipo: 'efectivo', saldo: 0, activa: true }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/');
    await page.waitForSelector('#saldo-total', { timeout: 10_000 });
    await expect(page.locator('#saldo-total')).toHaveText('$0');
  });

  test('sin cuentas registradas muestra la guía de primeros pasos hacia Tesorería', async ({ page }) => {
    // Estado vacío: la guía es visible y la descripción técnica se oculta.
    await expect(page.locator('#hero-guia-saldo')).toBeVisible();
    await expect(page.locator('#saldo-desc')).toBeHidden();

    // El botón de la guía lleva directo a Tesorería.
    await page.click('#hero-guia-saldo a[href="#tesoreria"]');
    await expect(page.locator('#sec-tesoreria.active')).toBeVisible();
  });

  test('con una cuenta registrada oculta la guía y muestra el saldo', async ({ page }) => {
    // El beforeEach siembra estado vacío vía addInitScript. Como addInitScript
    // se acumula y corre en CADA navegación, agregamos otro que inyecta una
    // cuenta (corre después del seed base) y recién ahí navegamos.
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.cuentas = [{ id: 'c1', nombre: 'Efectivo', tipo: 'efectivo', saldo: 500000, activa: true }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/');
    await page.waitForSelector('#saldo-total', { timeout: 10_000 });

    await expect(page.locator('#hero-guia-saldo')).toBeHidden();
    await expect(page.locator('#saldo-desc')).toBeVisible();
    await expect(page.locator('#saldo-total')).toHaveText('$500.000');
  });
});

// ── SUITE 2: Onboarding ─────────────────────────────────────────────────────
// Modo serial: el SW compartido entre workers paralelos puede interferir con
// los tests de onboarding (que dependen de localStorage vacío). Serial garantiza
// ejecución secuencial dentro de esta suite sin afectar el resto.

test.describe.serial('Onboarding', () => {
  test('aparece el wizard en la primera visita (localStorage vacío)', async ({ page }) => {
    await page.goto('/');
    // Esperar el modal abierto (data-open="" y sin aria-hidden)
    await expect(page.locator('#onboarding[data-open]')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('se puede completar el wizard y no reaparece tras recarga', async ({ page }) => {
    // Cada test tiene su propio contexto de browser (localStorage limpio por defecto).
    // Solo navegamos directo; si hay contaminación por workers del SW, el retry
    // configurado en playwright.config.js lo resuelve.
    await page.goto('/');

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
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await expect(page.locator('#onboarding[data-open]')).toHaveCount(0);
  });
});

// ── SUITE 3: Navegación ─────────────────────────────────────────────────────

test.describe('Navegación hash', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
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
      await page.click(`.nav-item[href="${href}"]`);
      await expect(page.locator(`#${seccion}`)).toHaveClass(/active/);
    });
  }
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

    await crearCuentaEfectivo(page, 500000);
    await expect(page.locator('#lista-tesoreria')).toContainText('Efectivo', { timeout: 3_000 });

    // Ir a Gastos
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');

    const form = page.locator('#modal-gasto-body form');
    await form.locator('[name="descripcion"]').fill('Mercado prueba E2E');
    await form.locator('[name="monto"]').fill('150000');
    // Con una sola cuenta activa la cuenta se asume (hidden, sin selector).
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
    await crearCuentaEfectivo(page, 850000);

    // Cuenta aparece en la lista con nombre auto-generado "Efectivo"
    await expect(page.locator('#lista-tesoreria')).toContainText(
      'Efectivo',
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
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
  });

  test('crear cuenta, gasto con selector, verificar saldo decrementado', async ({ page }) => {
    // 1. Crear una cuenta
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await crearCuentaEfectivo(page, 1000000);

    // Cuenta aparece en la lista con nombre auto-generado "Efectivo"
    await expect(page.locator('#lista-tesoreria')).toContainText(
      'Efectivo',
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

    // Con una sola cuenta activa la cuenta se asume (hidden, sin selector).

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

    // 4. Ir a Dashboard y verificar "Tu dinero disponible hoy" muestra $900.000
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
    await crearCuentaEfectivo(page, 500000);
    await expect(page.locator('#lista-tesoreria')).toContainText(
      'Efectivo',
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
    // Con una sola cuenta activa la cuenta se asume (hidden, sin selector).
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
    await crearCuentaEfectivo(page, 800000);
    await expect(page.locator('#lista-tesoreria')).toContainText(
      'Efectivo',
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
    // Con una sola cuenta activa la cuenta se asume (hidden, sin selector).
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
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
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
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

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

    // Leyenda de tipos (Gasto fijo, Deuda entidad, Deuda personal)
    await expect(page.locator('.cal-legend')).toBeVisible();
    await expect(page.locator('.cal-legend')).toContainText('Gasto fijo');
    await expect(page.locator('.cal-legend')).toContainText('Deuda entidad');
    await expect(page.locator('.cal-legend')).toContainText('Deuda personal');
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

// ── SUITE 11: Agenda - badge abono (ADR 002) ────────────────────────────────
// Verifica que el badge "Ya abonaste este mes" aparece en el panel de detalle
// del día cuando hay un gasto-abono del mes actual vinculado al compromiso.

test.describe('Agenda - badge abono', () => {
  test('muestra badge "Ya pagaste este mes" en el detalle del día', async ({ page }) => {
    const compromisoId = 'comp-badge-e2e';
    const hoy     = new Date();
    const anio    = hoy.getFullYear();
    const mes     = String(hoy.getMonth() + 1).padStart(2, '0');
    const diaPago = 15;

    await page.addInitScript(({ compromisoId, anio, mes, diaPago }) => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos: [{
          id:          'gasto-abono-badge',
          compromisoId,
          descripcion: 'Abono cuota E2E',
          monto:       100000,
          categoria:   'Compromisos',
          cuentaId:    null,
          fecha:       `${anio}-${mes}-10`,
        }],
        compromisos: [{
          id:           compromisoId,
          tipo:         'deuda-entidad',
          descripcion:  'Deuda Badge E2E',
          saldoTotal:   400000,
          cuotaMensual: 100000,
          tasa:         24,
          tasaUnidad:   'EA',
          frecuencia:   'Mensual',
          diaPago,
        }],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { compromisoId, anio, mes, diaPago });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    // El día 15 tiene el compromiso: debe ser un botón con data-action
    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    // El panel de detalle debe mostrar el badge de abono
    const badge = page.locator('.cal-detail__badge-abono');
    await expect(badge).toBeVisible({ timeout: 3_000 });
    await expect(badge).toContainText('Ya pagaste este mes');
  });
});
