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

/**
 * Fecha de hoy en `YYYY-MM-DD`, hora local (no UTC).
 * Replica `hoy()` de `modules/infra/utils.js`: usar `toISOString()` es
 * incorrecto porque en zonas horarias negativas (Colombia UTC-5) puede
 * devolver el dia siguiente cerca de medianoche, y la app filtra "este mes"
 * en hora local.
 */
function hoyLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ── SUITE A: Ahorro ─────────────────────────────────────────────────────────

test.describe('Ahorro - fondo de emergencia (J.1)', () => {
  test.beforeEach(async ({ page }) => {
    await estadoBaseV8(page);
    await irADash(page);
  });

  // A.1 - Empty state --------------------------------------------------------

  test('muestra el empty state al navegar desde Dashboard', async ({ page }) => {
    // DIS.18: se entra por la casa de Ahorro, y el fondo es su primera fila.
    await page.click('a[href="#ahorro"]');
    await expect(page.locator('#sec-ahorro.active')).toBeVisible({ timeout: 5_000 });
    await page.click('#carril-fondo .lane__ver');
    await expect(page.locator('#sec-fondo.active')).toBeVisible({ timeout: 5_000 });

    await expect(
      page.locator('#panel-ahorro .fondo-card__pregunta')
    ).toHaveText('¿Cuánto tiempo aguantarías sin ingresos?', { timeout: 3_000 });

    // El CTA de activación está presente
    await expect(page.locator('#sec-fondo [data-action="ahorro-activar-fondo"]')).toBeVisible();
  });

  // A.2 - Activar fondo: modal → form → hero --------------------------------

  test('activar fondo: modal abre, form se envía, hero muestra el monto base', async ({ page }) => {
    // DIS.18: se entra por la casa de Ahorro, y el fondo es su primera fila.
    await page.click('a[href="#ahorro"]');
    await expect(page.locator('#sec-ahorro.active')).toBeVisible({ timeout: 5_000 });
    await page.click('#carril-fondo .lane__ver');
    await expect(page.locator('#sec-fondo.active')).toBeVisible({ timeout: 5_000 });

    // Abrir modal de activación
    await page.click('#sec-fondo [data-action="ahorro-activar-fondo"]');
    await page.waitForSelector('#modal-ahorro[data-open]', { timeout: 5_000 });

    const form = page.locator('#modal-ahorro-body form#form-fondo');

    // Rellenar: 3 meses de meta, $500.000 ya apartados
    await form.locator('[name="metaMeses"]').fill('3');
    await form.locator('[name="montoActual"]').fill('500000');
    await form.locator('button[type="submit"]').click();

    // El modal debe cerrarse
    await expect(page.locator(modalCerrado('modal-ahorro'))).toBeAttached({ timeout: 3_000 });

    // El hero debe mostrarse con el monto base
    await expect(page.locator('.fondo-card')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('.fondo-card__dato--fuerte')).toContainText('$500.000');
  });

  // A.3 - Aporte: historial + monto del hero sube ----------------------------

  test('registrar aporte: aparece en historial y el hero suma el monto', async ({ page }) => {
    // Precondición: activar fondo con $500.000 de base
    // DIS.18: se entra por la casa de Ahorro, y el fondo es su primera fila.
    await page.click('a[href="#ahorro"]');
    await expect(page.locator('#sec-ahorro.active')).toBeVisible({ timeout: 5_000 });
    await page.click('#carril-fondo .lane__ver');
    await expect(page.locator('#sec-fondo.active')).toBeVisible({ timeout: 5_000 });
    await page.click('#sec-fondo [data-action="ahorro-activar-fondo"]');
    await page.waitForSelector('#modal-ahorro[data-open]', { timeout: 5_000 });
    const formFondo = page.locator('#modal-ahorro-body form#form-fondo');
    await formFondo.locator('[name="metaMeses"]').fill('3');
    await formFondo.locator('[name="montoActual"]').fill('500000');
    await formFondo.locator('button[type="submit"]').click();
    await expect(page.locator('.fondo-card__dato--fuerte')).toContainText('$500.000', { timeout: 3_000 });

    // Registrar un aporte de $200.000
    await page.click('#sec-fondo [data-action="ahorro-nuevo-aporte"]');
    await page.waitForSelector('#modal-ahorro[data-open]', { timeout: 5_000 });
    const formAporte = page.locator('#modal-ahorro-body form#form-aporte');
    await formAporte.locator('[name="monto"]').fill('200000');
    const hoy = hoyLocal();
    await formAporte.locator('[name="fecha"]').fill(hoy);
    await formAporte.locator('button[type="submit"]').click();

    // Modal cierra
    await expect(page.locator(modalCerrado('modal-ahorro'))).toBeAttached({ timeout: 3_000 });

    // Hero debe mostrar la suma: $500.000 + $200.000 = $700.000
    await expect(page.locator('.fondo-card__dato--fuerte')).toContainText('$700.000', { timeout: 3_000 });

    // El aporte aparece en el historial
    await expect(page.locator('.ahorro-habito__lista')).toContainText('$200.000', { timeout: 3_000 });
  });

  // A.4 - Persistencia -------------------------------------------------------

  test('fondo persiste tras recarga de página', async ({ page }) => {
    // Activar fondo con $300.000
    // DIS.18: se entra por la casa de Ahorro, y el fondo es su primera fila.
    await page.click('a[href="#ahorro"]');
    await expect(page.locator('#sec-ahorro.active')).toBeVisible({ timeout: 5_000 });
    await page.click('#carril-fondo .lane__ver');
    await expect(page.locator('#sec-fondo.active')).toBeVisible({ timeout: 5_000 });
    await page.click('#sec-fondo [data-action="ahorro-activar-fondo"]');
    await page.waitForSelector('#modal-ahorro[data-open]', { timeout: 5_000 });
    const formFondo = page.locator('#modal-ahorro-body form#form-fondo');
    await formFondo.locator('[name="metaMeses"]').fill('3');
    await formFondo.locator('[name="montoActual"]').fill('300000');
    await formFondo.locator('button[type="submit"]').click();
    await expect(page.locator('.fondo-card__dato--fuerte')).toContainText('$300.000', { timeout: 3_000 });

    // Esperar que el debounce de save() (200ms) complete
    await page.waitForTimeout(400);

    // Recargar: el hash #fondo se conserva, la sección se reactiva al bootear.
    // No esperamos #saldo-total porque vive en el dashboard (no activo aquí).
    await page.reload();
    await expect(page.locator('#sec-fondo.active')).toBeVisible({ timeout: 10_000 });

    // El hero debe mostrar los mismos datos
    await expect(page.locator('.fondo-card')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('.fondo-card__dato--fuerte')).toContainText('$300.000');
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
    // #inversion ya no es un clic directo desde Dashboard: INT.1b la anida
    // bajo "Ahorro" en el sidebar. Esta suite prueba Inversión, no la
    // navegación, así que va directo a la ruta (mismo criterio que MT.1).
    await page.goto('/#inversion');
    await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 5_000 });

    await expect(
      page.locator('#panel-inversion .empty-state__title')
    ).toHaveText('Registra tus inversiones', { timeout: 3_000 });

    // El CTA de alta está presente
    await expect(page.locator('#sec-inversion [data-action="inversion-nueva"]').first()).toBeVisible();
  });

  // B.2 - Alta inversión: lista + tarjeta del momento ------------------------

  test('registrar inversión: aparece en lista y la tarjeta muestra el total', async ({ page }) => {
    // #inversion ya no es un clic directo desde Dashboard: INT.1b la anida
    // bajo "Ahorro" en el sidebar. Esta suite prueba Inversión, no la
    // navegación, así que va directo a la ruta (mismo criterio que MT.1).
    await page.goto('/#inversion');
    await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 5_000 });

    await page.click('#sec-inversion [data-action="inversion-nueva"]');
    await page.waitForSelector('#modal-inversion[data-open]', { timeout: 5_000 });

    const form = page.locator('#modal-inversion-body form#form-inversion');
    await form.locator('select[name="tipo"]').selectOption('CDT');
    await form.locator('[name="nombre"]').fill('CDT Bancolombia E2E');
    await form.locator('[name="monto"]').fill('5000000');
    const hoy = hoyLocal();
    await form.locator('[name="fechaInicio"]').fill(hoy);
    await form.locator('button[type="submit"]').click();

    // Modal cierra
    await expect(page.locator(modalCerrado('modal-inversion'))).toBeAttached({ timeout: 3_000 });

    // La inversión aparece en la lista
    await expect(
      page.locator('.inversion-lista__items')
    ).toContainText('CDT Bancolombia E2E', { timeout: 3_000 });

    // La tarjeta del momento muestra lo que el usuario ha construido (DIS.17)
    await expect(page.locator('.inversion-momento__monto')).toHaveText('$5.000.000', { timeout: 3_000 });
    await expect(page.locator('.inversion-momento__kicker').first()).toHaveText('Momento 1 de 3');
  });

  // B.3 - CDT con tasa y plazo: proyección visible en el item ----------------

  test('CDT con tasa y plazo muestra la proyección al vencimiento en el item', async ({ page }) => {
    // #inversion ya no es un clic directo desde Dashboard: INT.1b la anida
    // bajo "Ahorro" en el sidebar. Esta suite prueba Inversión, no la
    // navegación, así que va directo a la ruta (mismo criterio que MT.1).
    await page.goto('/#inversion');
    await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 5_000 });

    await page.click('#sec-inversion [data-action="inversion-nueva"]');
    await page.waitForSelector('#modal-inversion[data-open]', { timeout: 5_000 });

    const form = page.locator('#modal-inversion-body form#form-inversion');
    await form.locator('select[name="tipo"]').selectOption('CDT');
    await form.locator('[name="nombre"]').fill('CDT Davivienda E2E');
    await form.locator('[name="monto"]').fill('10000000');
    await form.locator('[name="tasaEA"]').fill('10');
    await form.locator('[name="plazoMeses"]').fill('12');
    const hoy = hoyLocal();
    await form.locator('[name="fechaInicio"]').fill(hoy);
    await form.locator('button[type="submit"]').click();

    await expect(page.locator(modalCerrado('modal-inversion'))).toBeAttached({ timeout: 3_000 });

    // El item de la lista debe tener la línea de proyección
    // CDT 10M al 10% EA por 12 meses: VF bruto $11.000.000, retención 7% sobre
    // $1.000.000 = $70.000, VF neto = $10.930.000
    const item = page.locator('.inversion-lista__items .list-item')
      .filter({ hasText: 'CDT Davivienda E2E' });
    await expect(item.locator('.inversion-item__proy')).toBeVisible({ timeout: 3_000 });
    await expect(item.locator('.inversion-item__proy')).toContainText('$10.930.000');
    // DIS.17: la linea separa lo que puso el usuario de lo que pone el tiempo.
    await expect(item.locator('.inversion-item__proy')).toContainText('los pone el tiempo');
    await expect(item.locator('.inversion-item__proy')).toContainText('$930.000');
  });

  // B.4 - Eliminar inversión -------------------------------------------------

  test('eliminar inversión la quita de la lista', async ({ page }) => {
    // #inversion ya no es un clic directo desde Dashboard: INT.1b la anida
    // bajo "Ahorro" en el sidebar. Esta suite prueba Inversión, no la
    // navegación, así que va directo a la ruta (mismo criterio que MT.1).
    await page.goto('/#inversion');
    await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 5_000 });

    // Registrar para poder eliminar
    await page.click('#sec-inversion [data-action="inversion-nueva"]');
    await page.waitForSelector('#modal-inversion[data-open]', { timeout: 5_000 });
    const form = page.locator('#modal-inversion-body form#form-inversion');
    await form.locator('select[name="tipo"]').selectOption('Fondo');
    await form.locator('[name="nombre"]').fill('Fondo a eliminar E2E');
    await form.locator('[name="monto"]').fill('2000000');
    const hoy = hoyLocal();
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
    // #inversion ya no es un clic directo desde Dashboard: INT.1b la anida
    // bajo "Ahorro" en el sidebar. Esta suite prueba Inversión, no la
    // navegación, así que va directo a la ruta (mismo criterio que MT.1).
    await page.goto('/#inversion');
    await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 5_000 });

    // Registrar inversión
    await page.click('#sec-inversion [data-action="inversion-nueva"]');
    await page.waitForSelector('#modal-inversion[data-open]', { timeout: 5_000 });
    const form = page.locator('#modal-inversion-body form#form-inversion');
    await form.locator('select[name="tipo"]').selectOption('Acciones');
    await form.locator('[name="nombre"]').fill('Acciones Colombia E2E');
    await form.locator('[name="monto"]').fill('8000000');
    const hoy = hoyLocal();
    await form.locator('[name="fechaInicio"]').fill(hoy);
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('.inversion-momento__monto')).toHaveText('$8.000.000', { timeout: 3_000 });

    // Esperar el debounce de save() (200ms)
    await page.waitForTimeout(400);

    // Recargar: el hash #inversion se conserva, la sección se reactiva al bootear.
    await page.reload();
    await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 10_000 });

    // La inversión persiste
    await expect(
      page.locator('.inversion-lista__items')
    ).toContainText('Acciones Colombia E2E', { timeout: 3_000 });
    await expect(page.locator('.inversion-momento__monto')).toHaveText('$8.000.000');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INV.1 - EL ORIGEN DEL DINERO (ADR 053, invariante de patrimonio)
// ═══════════════════════════════════════════════════════════════════════════
//
// Los tests de arriba corren con `cuentas: []`, así que la pregunta del origen
// no se dibuja y siguen valiendo tal cual. Este bloque siembra una cuenta con
// saldo, que es la única forma de que la pregunta aparezca, y verifica lo que la
// invariante exige: que el mismo peso no se cuente dos veces en el patrimonio.

/**
 * Estado con una cuenta de $6.000.000 y sin inversiones. Igual que
 * `estadoBaseV8` pero con la cuenta, para que el formulario de inversión pueda
 * preguntar de dónde sale el dinero.
 */
async function estadoConCuenta(page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('fk_v1')) return;
    const estado = {
      _version:    8,
      perfil:      { nombre: 'TestUser', smmlv: 1750905 },
      onboarded:   true,
      cuentas: [{
        id: 'cta-e2e', nombre: 'Ahorros E2E', banco: 'Bancolombia',
        tipo: 'Ahorros', saldo: 6000000, activa: true,
      }],
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

/** Saldo de la cuenta sembrada, leído de localStorage. */
async function saldoCuenta(page) {
  return page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('fk_v1'));
    return st.cuentas.find(c => c.id === 'cta-e2e').saldo;
  });
}

/** Abre el formulario de inversión y devuelve su locator. */
async function abrirFormInversion(page) {
  await page.click('#sec-inversion [data-action="inversion-nueva"]');
  await page.waitForSelector('#modal-inversion[data-open]', { timeout: 5_000 });
  return page.locator('#modal-inversion-body form#form-inversion');
}

/**
 * Elige una rama del origen del dinero (INV.1).
 *
 * Los dos chips reusan el patrón de FORM.1 (ADR 042 D1): el radio va oculto
 * detrás de su `<label class="chip-fecha">`, así que hay que clickear el label.
 * Llamar `.check()` sobre el input no sirve: el label intercepta el puntero. Es
 * la misma razón por la que `smoke.test.js` tiene su helper `elegirChip()`.
 *
 * @param {import('@playwright/test').Locator} form
 * @param {'cuenta'|'preexistente'} valor
 */
async function elegirOrigen(form, valor) {
  await form.locator(`.chip-fecha:has(input[name="origen"][value="${valor}"])`).click();
}

test.describe('Inversión - origen del dinero (INV.1)', () => {
  test.beforeEach(async ({ page }) => {
    await estadoConCuenta(page);
    await irADash(page);
    // #inversion ya no es un clic directo desde Dashboard: INT.1b la anida
    // bajo "Ahorro" en el sidebar. Esta suite prueba Inversión, no la
    // navegación, así que va directo a la ruta (mismo criterio que MT.1).
    await page.goto('/#inversion');
    await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 5_000 });
  });

  // C.1 - La pregunta aparece y viene sugerida ------------------------------

  test('con una cuenta activa el formulario pregunta el origen, con la rama sugerida por la fecha', async ({ page }) => {
    const form = await abrirFormInversion(page);

    // Fecha de hoy (la que prellena el formulario): sugiere la cuenta.
    await expect(form.locator('input[name="origen"][value="cuenta"]')).toBeChecked();
    await expect(form.locator('#inv-origen-cuenta')).toBeVisible();
    await expect(form.locator('input[name="cuentaId"][value="cta-e2e"]')).toBeChecked();

    // Una fecha vieja mueve la sugerencia a preexistente y esconde el selector.
    await form.locator('[name="fechaInicio"]').fill('2019-03-01');
    await expect(form.locator('input[name="origen"][value="preexistente"]')).toBeChecked();
    await expect(form.locator('#inv-origen-cuenta')).toBeHidden();
  });

  test('elegir la rama a mano gana sobre la sugerencia de la fecha', async ({ page }) => {
    const form = await abrirFormInversion(page);

    // El usuario contesta: preexistente.
    await elegirOrigen(form, 'preexistente');
    await expect(form.locator('#inv-origen-cuenta')).toBeHidden();

    // Cambiar la fecha ya no le pisa la respuesta.
    await form.locator('[name="fechaInicio"]').fill(hoyLocal());
    await expect(form.locator('input[name="origen"][value="preexistente"]')).toBeChecked();
    await expect(form.locator('#inv-origen-cuenta')).toBeHidden();
  });

  // C.2 - Alta con cuenta de origen: descuenta ------------------------------

  test('registrar con cuenta de origen descuenta ese saldo: el patrimonio no se duplica', async ({ page }) => {
    expect(await saldoCuenta(page)).toBe(6_000_000);

    const form = await abrirFormInversion(page);
    await form.locator('select[name="tipo"]').selectOption('CDT');
    await form.locator('[name="nombre"]').fill('CDT con origen E2E');
    await form.locator('[name="monto"]').fill('2000000');
    await form.locator('[name="fechaInicio"]').fill(hoyLocal());
    await elegirOrigen(form, 'cuenta');
    await form.locator('input[name="cuentaId"][value="cta-e2e"]').check();
    await form.locator('button[type="submit"]').click();

    await expect(page.locator(modalCerrado('modal-inversion'))).toBeAttached({ timeout: 3_000 });
    await expect(page.locator('.inversion-lista__items')).toContainText('CDT con origen E2E', { timeout: 3_000 });

    await page.waitForTimeout(400); // debounce de save()
    expect(await saldoCuenta(page)).toBe(4_000_000);
  });

  // C.3 - Alta preexistente: no toca saldos --------------------------------

  test('registrar una inversión que ya existía no toca ningún saldo', async ({ page }) => {
    const form = await abrirFormInversion(page);
    await form.locator('select[name="tipo"]').selectOption('Fondo');
    await form.locator('[name="nombre"]').fill('Fondo preexistente E2E');
    await form.locator('[name="monto"]').fill('2000000');
    await form.locator('[name="fechaInicio"]').fill('2018-05-20');
    await elegirOrigen(form, 'preexistente');
    await form.locator('button[type="submit"]').click();

    await expect(page.locator(modalCerrado('modal-inversion'))).toBeAttached({ timeout: 3_000 });
    await expect(page.locator('.inversion-lista__items')).toContainText('Fondo preexistente E2E', { timeout: 3_000 });

    await page.waitForTimeout(400);
    expect(await saldoCuenta(page)).toBe(6_000_000);
  });

  // C.4 - Reversa al eliminar (ADR 053 I3) ---------------------------------

  test('eliminar una inversión con cuenta de origen devuelve el dinero a esa cuenta', async ({ page }) => {
    const form = await abrirFormInversion(page);
    await form.locator('select[name="tipo"]').selectOption('CDT');
    await form.locator('[name="nombre"]').fill('CDT reversible E2E');
    await form.locator('[name="monto"]').fill('1500000');
    await form.locator('[name="fechaInicio"]').fill(hoyLocal());
    await elegirOrigen(form, 'cuenta');
    await form.locator('input[name="cuentaId"][value="cta-e2e"]').check();
    await form.locator('button[type="submit"]').click();

    await expect(page.locator('.inversion-lista__items')).toContainText('CDT reversible E2E', { timeout: 3_000 });
    await page.waitForTimeout(400);
    expect(await saldoCuenta(page)).toBe(4_500_000);

    const item = page.locator('.inversion-lista__items .list-item')
      .filter({ hasText: 'CDT reversible E2E' });
    await item.locator('[data-action="inversion-eliminar"]').click();

    // El diálogo dice a dónde vuelve el dinero antes de confirmar.
    await expect(page.locator('.modal--confirm')).toContainText('Se devolverán $1.500.000 a Ahorros E2E');
    await page.locator('[data-role="confirmar"]').click();

    await expect(page.locator('#panel-inversion .empty-state__title'))
      .toHaveText('Registra tus inversiones', { timeout: 3_000 });
    await page.waitForTimeout(400);
    expect(await saldoCuenta(page)).toBe(6_000_000);
  });

  test('eliminar una inversión preexistente no devuelve nada, porque nada salió', async ({ page }) => {
    const form = await abrirFormInversion(page);
    await form.locator('select[name="tipo"]').selectOption('Cripto');
    await form.locator('[name="nombre"]').fill('Cripto vieja E2E');
    await form.locator('[name="monto"]').fill('900000');
    await form.locator('[name="fechaInicio"]').fill('2017-11-02');
    await elegirOrigen(form, 'preexistente');
    await form.locator('button[type="submit"]').click();

    await expect(page.locator('.inversion-lista__items')).toContainText('Cripto vieja E2E', { timeout: 3_000 });

    const item = page.locator('.inversion-lista__items .list-item')
      .filter({ hasText: 'Cripto vieja E2E' });
    await item.locator('[data-action="inversion-eliminar"]').click();

    // Sin cuenta de origen el diálogo no promete ninguna devolución.
    await expect(page.locator('.modal--confirm')).not.toContainText('Se devolverán');
    await page.locator('[data-role="confirmar"]').click();

    await expect(page.locator('#panel-inversion .empty-state__title'))
      .toHaveText('Registra tus inversiones', { timeout: 3_000 });
    await page.waitForTimeout(400);
    expect(await saldoCuenta(page)).toBe(6_000_000);
  });

  // C.5 - Sobregiro: se confirma, no se bloquea ----------------------------

  test('si el saldo no alcanza avisa que quedará en negativo y deja decidir', async ({ page }) => {
    const form = await abrirFormInversion(page);
    await form.locator('select[name="tipo"]').selectOption('Otro');
    await form.locator('[name="nombre"]').fill('Finca raiz E2E');
    await form.locator('[name="monto"]').fill('9000000');
    await form.locator('[name="fechaInicio"]').fill(hoyLocal());
    await elegirOrigen(form, 'cuenta');
    await form.locator('input[name="cuentaId"][value="cta-e2e"]').check();
    await form.locator('button[type="submit"]').click();

    await expect(page.locator('.modal--confirm')).toContainText('quedará en negativo');
    await page.locator('[data-role="confirmar"]').click();

    await expect(page.locator('.inversion-lista__items')).toContainText('Finca raiz E2E', { timeout: 3_000 });
    await page.waitForTimeout(400);
    expect(await saldoCuenta(page)).toBe(-3_000_000);
  });
});

