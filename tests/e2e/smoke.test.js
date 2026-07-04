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

/**
 * Avanza el asistente "Distribuir mi ingreso" (MC.7d, shell paginado) hasta
 * que `selector` sea visible, o hasta el último paso si no se pasa selector
 * (donde vive el botón "Distribuir"). El panel debe estar ya abierto.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string|null} [selector] - selector CSS que se busca al avanzar.
 */
async function avanzarDistribuirHasta(page, selector = null) {
  const siguiente = page.locator('[data-action="distribuir-paso-siguiente"]');
  for (let i = 0; i < 5; i++) {
    if (selector && await page.locator(selector).first().isVisible()) return;
    if (!(await siguiente.isVisible())) return;
    await siguiente.click();
  }
}

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

// ── SUITE 1b: Ocultar/mostrar el dinero disponible (IN.2) ───────────────────
// Suite propia sin el beforeEach de Dashboard: el seed debe ser CONDICIONAL
// (solo si localStorage está vacío) porque los addInitScript corren de nuevo
// en cada navegación y un seed incondicional pisaría la preferencia
// `config.ocultarSaldo` que la app guarda a mitad del test, justo lo que el
// reload quiere verificar.

test.describe('Ocultar/mostrar el dinero disponible (IN.2)', () => {
  test('el ojo oculta el saldo, persiste tras recargar y lo vuelve a mostrar', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('fk_v1')) return;
      const estado = {
        version: 1,
        perfil: { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas: [{ id: 'c1', nombre: 'Efectivo', tipo: 'efectivo', saldo: 500000, activa: true }],
        ingresos: [],
        gastos: [],
        compromisos: [],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    // Estado inicial: monto visible, ojo sin presionar.
    await expect(page.locator('#saldo-total')).toHaveText('$500.000');
    await expect(page.locator('#saldo-ojo')).toHaveAttribute('aria-pressed', 'false');

    // Click en el ojo: el monto se enmascara.
    await page.click('#saldo-ojo');
    await expect(page.locator('#saldo-total')).toHaveText('$••••••');
    await expect(page.locator('#saldo-ojo')).toHaveAttribute('aria-pressed', 'true');

    // Persistencia entre sesiones: esperar el debounce de save() (200ms)
    // y recargar; la app debe arrancar con el saldo ya enmascarado.
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await expect(page.locator('#saldo-total')).toHaveText('$••••••');
    await expect(page.locator('#saldo-ojo')).toHaveAttribute('aria-pressed', 'true');

    // Segundo click: el monto vuelve.
    await page.click('#saldo-ojo');
    await expect(page.locator('#saldo-total')).toHaveText('$500.000');
    await expect(page.locator('#saldo-ojo')).toHaveAttribute('aria-pressed', 'false');
  });
});

// ── SUITE 1c: Metas - categorías con emoji (MT.1 + MT.3) ─────────────────────

test.describe('Metas - categorías con emoji (MT.1)', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await page.click('a[href="#metas"]');
    await expect(page.locator('#sec-metas.active')).toBeVisible();
  });

  test('crear una meta con categoría "Boda" muestra 💍 junto al nombre en la lista', async ({ page }) => {
    await page.click('[data-action="nueva-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');

    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Fiesta de matrimonio');
    await form.locator('#meta-objetivo').fill('5000000');
    await form.locator('#meta-categoria').selectOption('Boda');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    const titulo = page.locator('#lista-metas .list-item__title');
    await expect(titulo).toContainText('💍');
    await expect(titulo).toContainText('Fiesta de matrimonio');
  });

  test('MT.3: el campo de emoji está oculto salvo con categoría "Otra"', async ({ page }) => {
    await page.click('[data-action="nueva-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');

    const form = page.locator('#modal-meta-body form');
    await expect(form.locator('#form-group-meta-icono')).toBeHidden();

    // Cualquier categoría predefinida mantiene el emoji oculto: ya trae el suyo.
    await form.locator('#meta-categoria').selectOption('Viajes');
    await expect(form.locator('#form-group-meta-icono')).toBeHidden();

    // Solo "Otra" habilita elegir el emoji a mano.
    await form.locator('#meta-categoria').selectOption('Otra');
    await expect(form.locator('#form-group-meta-icono')).toBeVisible();
  });

  test('MT.3: con categoría "Otra" el emoji escrito a mano queda en la lista', async ({ page }) => {
    await page.click('[data-action="nueva-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');

    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Estudio de grabación');
    await form.locator('#meta-objetivo').fill('3000000');
    await form.locator('#meta-categoria').selectOption('Otra');
    await form.locator('#meta-icono').fill('🎸');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    const titulo = page.locator('#lista-metas .list-item__title');
    await expect(titulo).toContainText('🎸');
    await expect(titulo).not.toContainText('📦');
  });

  test('MT.3: volver de "Otra" a otra categoría limpia el emoji manual', async ({ page }) => {
    await page.click('[data-action="nueva-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');

    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Reforma de la casa');
    await form.locator('#meta-objetivo').fill('4000000');

    // El usuario prueba "Otra" y escribe un emoji, pero se arrepiente y
    // vuelve a una categoría predefinida antes de guardar.
    await form.locator('#meta-categoria').selectOption('Otra');
    await form.locator('#meta-icono').fill('🎸');
    await form.locator('#meta-categoria').selectOption('Vivienda');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    // El emoji guardado es el de Vivienda (🏠), no el 🎸 que quedó escrito.
    const titulo = page.locator('#lista-metas .list-item__title');
    await expect(titulo).toContainText('🏠');
    await expect(titulo).not.toContainText('🎸');
  });
});

// ── SUITE 1d: Metas - abono con selector de cuenta compartido (MT.5) ─────────
// Antes el abono usaba un <select> propio y descontaba solo si el usuario
// elegía cuenta manualmente. MT.5 lo unifica con el selector de tarjetas de
// Apartados (AP.1): preselecciona la cuenta de mayor saldo y, si no alcanza,
// confirma el sobregiro (0/1 cuenta) o reparte (varias). Se verifica el
// descuento real de saldo en Tesorería, igual que la suite Gastos-Cuenta.

test.describe('Metas - abono con selector de cuenta compartido (MT.5)', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
  });

  /** Crea una meta simple (sin categoría) y devuelve al llamador para encadenar. */
  async function crearMetaSimple(page, nombre, montoObjetivo) {
    await page.goto('/#metas');
    await expect(page.locator('#sec-metas.active')).toBeVisible();
    await page.click('[data-action="nueva-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');
    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill(nombre);
    await form.locator('#meta-objetivo').fill(String(montoObjetivo));
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });
  }

  test('con una cuenta, el abono preselecciona su tarjeta y descuenta el saldo', async ({ page }) => {
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await crearCuentaEfectivo(page, 1_000_000);

    await crearMetaSimple(page, 'Laptop nueva', 3_000_000);

    await page.click('[data-action="abonar-meta"]');
    await page.waitForSelector('#modal-abono-meta[data-open]');

    // El selector compartido preselecciona la única cuenta activa.
    await expect(page.locator('#modal-abono-meta-body .cuenta-sel__radio')).toBeChecked();

    await page.locator('#abono-meta-monto').fill('200000');
    await page.locator('#form-abono-meta button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-abono-meta'), { timeout: 5_000 });

    // Progreso de la meta actualizado en la lista.
    await expect(page.locator('#lista-metas')).toContainText('$200.000 / $3.000.000');

    // Saldo de la cuenta descontado (1.000.000 - 200.000).
    await page.goto('/#tesoreria');
    await expect(page.locator('#lista-tesoreria')).toContainText('$800.000', { timeout: 3_000 });
  });

  test('un abono que no alcanza pide confirmar el sobregiro', async ({ page }) => {
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await crearCuentaEfectivo(page, 50_000);

    await crearMetaSimple(page, 'Viaje sorpresa', 1_000_000);

    await page.click('[data-action="abonar-meta"]');
    await page.waitForSelector('#modal-abono-meta[data-open]');

    await page.locator('#abono-meta-monto').fill('200000');
    await page.locator('#form-abono-meta button[type="submit"]').click();

    // Con una sola cuenta y sin alcanzar, se pide confirmar el sobregiro.
    await expect(page.locator('.modal--confirm .modal__title')).toHaveText('Registrar abono');
    await expect(page.locator('.confirm__mensaje')).toContainText('quedará en negativo');

    await page.click('.modal--confirm [data-role="confirmar"]');
    await page.waitForSelector(modalCerrado('modal-abono-meta'), { timeout: 5_000 });

    // Saldo queda en negativo (50.000 - 200.000 = -150.000).
    await page.goto('/#tesoreria');
    await expect(page.locator('#lista-tesoreria')).toContainText('-$150.000', { timeout: 3_000 });
  });
});

// ── SUITE 1e: Metas - ritmo de ahorro según frecuencia (MT.4) ────────────────
// Antes la lista siempre mostraba "$X/día". Ahora reparte el faltante entre
// los periodos de la frecuencia con la que el usuario cobra (S.ingresos).

test.describe('Metas - ritmo de ahorro según frecuencia (MT.4)', () => {
  test('con un ingreso Quincenal, la meta muestra el monto "por quincena", no "por día"', async ({ page }) => {
    await page.addInitScript(() => {
      const estado = {
        version: 1,
        perfil: { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas: [],
        ingresos: [{
          id: 'i1', descripcion: 'Nómina', monto: 1500000,
          frecuencia: 'Quincenal', activo: true, fechaCreacion: '2026-01-01',
        }],
        gastos: [],
        compromisos: [],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });
    await page.goto('/#metas');
    await expect(page.locator('#sec-metas.active')).toBeVisible();

    const futura = new Date();
    futura.setDate(futura.getDate() + 90);
    const anio = futura.getFullYear();
    const mes  = String(futura.getMonth() + 1).padStart(2, '0');
    const dia  = String(futura.getDate()).padStart(2, '0');

    await page.click('[data-action="nueva-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');
    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Estudio de idiomas');
    await form.locator('#meta-objetivo').fill('600000');
    await form.locator('#meta-fecha').fill(`${anio}-${mes}-${dia}`);
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    const subtitulo = page.locator('#lista-metas .list-item__subtitle');
    await expect(subtitulo).toContainText('por quincena');
    await expect(subtitulo).not.toContainText('/día');
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
    const hoy = hoyLocal();
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

// ── SUITE 6b: Fondo inerte con modal abierto (A11Y.4) ───────────────────────
// Con un modal abierto, el fondo `.app-shell` debe quedar `inert` para que el
// lector de pantalla y el teclado no alcancen el contenido de atrás; al cerrar,
// el `inert` se libera. Se valida en navegador real (happy-dom no aplica inert).

test.describe('Accesibilidad - fondo inerte con modal', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
  });

  test('abrir un modal marca .app-shell inert y cerrarlo lo libera', async ({ page }) => {
    const shell = page.locator('.app-shell');

    // Estado inicial: fondo interactivo.
    await expect(shell).not.toHaveAttribute('inert', '');

    // Abrir el modal de nueva cuenta.
    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');
    await expect(shell).toHaveAttribute('inert', '');

    // Cerrar el modal libera el fondo.
    await page.click('#modal-cuenta [data-action="modal-close"]');
    await page.waitForSelector(modalCerrado('modal-cuenta'), { timeout: 5_000 });
    await expect(shell).not.toHaveAttribute('inert', '');
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

    const hoy = hoyLocal();
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
    const hoy = hoyLocal();
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
    const hoy = hoyLocal();
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
    // Heading "Calendario"
    await expect(page.locator('h1').filter({ hasText: 'Calendario' })).toBeVisible();

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

// ── SUITE 12: Agenda - total a pagar por día (AG.5) ──────────────────────────
// Con dos compromisos el mismo día (un fijo y una deuda), el panel de
// detalle debe mostrar la sumatoria de ambos, no solo listarlos por separado.

test.describe('Agenda - total a pagar por día', () => {
  test('el detalle del día suma el gasto fijo y la cuota de la deuda', async ({ page }) => {
    const diaPago = 20;

    await page.addInitScript(({ diaPago }) => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos: [
          {
            id: 'fijo-total-e2e', tipo: 'fijo', descripcion: 'Arriendo E2E',
            monto: 900000, frecuencia: 'Mensual', diaPago,
          },
          {
            id: 'deuda-total-e2e', tipo: 'deuda-entidad', descripcion: 'Tarjeta E2E',
            saldoTotal: 3000000, cuotaMensual: 150000, tasa: 24, tasaUnidad: 'EA',
            frecuencia: 'Mensual', diaPago,
          },
        ],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { diaPago });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    const total = page.locator('.cal-detail__total');
    await expect(total).toBeVisible({ timeout: 3_000 });
    await expect(total).toContainText('Total a pagar');
    await expect(total).toContainText('$1.050.000'); // 900.000 + 150.000
  });
});

// ── Agenda - leyenda sticky (AG.6) ───────────────────────────────────────────
// La leyenda va justo debajo del calendario y es sticky: con un día cargado
// de registros debe seguir dentro del viewport al desplazarse hasta el final
// del detalle. Cubre también la regresión de overflow en .main-content
// (un ancestro con overflow-x: hidden anularía el sticky).

test.describe('Agenda - leyenda sticky', () => {
  test('la leyenda sigue visible tras desplazarse al fondo del detalle', async ({ page }) => {
    const diaPago = 15;

    await page.addInitScript(({ diaPago }) => {
      const compromisos = [];
      for (let i = 1; i <= 10; i++) {
        compromisos.push({
          id: `sticky-e2e-${i}`, tipo: 'fijo', descripcion: `Fijo sticky ${i}`,
          monto: 50000, frecuencia: 'Mensual', diaPago,
        });
      }
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos,
        metas:     [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { diaPago });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();
    await expect(page.locator('.cal-detail')).toBeVisible({ timeout: 3_000 });

    // Desplazarse al final del documento. El guard de scrollY > 0 evita que
    // el test pase trivialmente si el contenido no alcanzara a desbordar.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);

    // Sin sticky, la leyenda quedaría fuera del viewport por arriba.
    const box      = await page.locator('.cal-legend').boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  });
});

// ── Agenda - marca de color por tipo en el detalle (AG.7) ────────────────────
// Cada registro del detalle del día lleva una franja lateral de color según
// su tipo (mismos --fk-dom-* que los dots del calendario, AG.6), para
// distinguir de un vistazo qué es qué en fechas cargadas.

test.describe('Agenda - marca de color por tipo', () => {
  test('un fijo y una deuda entidad el mismo día llevan colores de franja distintos', async ({ page }) => {
    const diaPago = 15;

    await page.addInitScript(({ diaPago }) => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos: [
          { id: 'fijo-color-e2e', tipo: 'fijo', descripcion: 'Mercado E2E',
            monto: 100000, frecuencia: 'Mensual', diaPago },
          { id: 'deuda-color-e2e', tipo: 'deuda-entidad', descripcion: 'Tarjeta E2E',
            saldoTotal: 2000000, cuotaMensual: 200000, tasa: 24, tasaUnidad: 'EA',
            frecuencia: 'Mensual', diaPago },
        ],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { diaPago });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    const itemFijo  = page.locator('.cal-detail__item--fijo');
    const itemDeuda = page.locator('.cal-detail__item--deuda-entidad');
    await expect(itemFijo).toBeVisible({ timeout: 3_000 });
    await expect(itemDeuda).toBeVisible({ timeout: 3_000 });

    const colorFijo  = await itemFijo.evaluate(el => window.getComputedStyle(el).borderLeftColor);
    const colorDeuda = await itemDeuda.evaluate(el => window.getComputedStyle(el).borderLeftColor);
    expect(colorFijo).not.toBe(colorDeuda);
    // transparent se resuelve a rgba(0, 0, 0, 0); ninguna franja debe quedar sin color.
    expect(colorFijo).not.toBe('rgba(0, 0, 0, 0)');
    expect(colorDeuda).not.toBe('rgba(0, 0, 0, 0)');
  });
});

// ── Agenda - emoji de categoría como ícono principal (AG.2) ──────────────────
// Un gasto fijo con categoría muestra el emoji de esa categoría como ícono
// principal (izquierda), no el genérico por tipo; sin categoría, cae al
// ícono genérico.

test.describe('Agenda - emoji de categoría como ícono principal', () => {
  test('con categoría, el ícono principal es el emoji (sin <svg>)', async ({ page }) => {
    const diaPago = 15;

    await page.addInitScript(({ diaPago }) => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos: [
          { id: 'fijo-emoji-e2e', tipo: 'fijo', descripcion: 'Internet E2E',
            categoria: 'Internet', monto: 100000, frecuencia: 'Mensual', diaPago },
        ],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { diaPago });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    const iconoEl = page.locator('.cal-detail__icon');
    await expect(iconoEl).toBeVisible({ timeout: 3_000 });
    await expect(iconoEl.locator('svg')).toHaveCount(0);
    await expect(iconoEl).toContainText('🌐');
  });

  test('sin categoría, el ícono principal es el genérico del tipo (con <svg>)', async ({ page }) => {
    const diaPago = 15;

    await page.addInitScript(({ diaPago }) => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos: [
          { id: 'fijo-sin-cat-e2e', tipo: 'fijo', descripcion: 'Sin categoría E2E',
            monto: 100000, frecuencia: 'Mensual', diaPago },
        ],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { diaPago });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    const iconoEl = page.locator('.cal-detail__icon');
    await expect(iconoEl).toBeVisible({ timeout: 3_000 });
    await expect(iconoEl.locator('svg')).toHaveCount(1);
  });
});

// ── Agenda - nombre automático según la categoría (AG.4) ─────────────────────
// Con una categoría predefinida, el nombre del gasto fijo pasa a ser la
// categoría y el campo de texto se convierte en una nota opcional; con
// "Otro" o sin categoría, el campo sigue siendo el nombre obligatorio.

test.describe('Agenda - nombre automático según la categoría', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
    await page.click('[data-action="nuevo-gasto-fijo"]');
    await expect(page.locator('#form-gasto-fijo')).toBeVisible({ timeout: 3_000 });
  });

  test('al elegir una categoría predefinida, el campo pasa a "Nota (opcional)" y deja de ser obligatorio', async ({ page }) => {
    const label = page.locator('#gfijo-descripcion-label');
    const input = page.locator('#gfijo-descripcion');
    await expect(label).toHaveText('Descripción');

    await page.selectOption('#gfijo-categoria', 'Mercado');

    await expect(label).toHaveText('Nota (opcional)');
    await expect(input).not.toHaveAttribute('aria-required', 'true');
  });

  test('al volver a "Otro", el campo vuelve a ser "Descripción" obligatoria', async ({ page }) => {
    const label = page.locator('#gfijo-descripcion-label');
    const input = page.locator('#gfijo-descripcion');

    await page.selectOption('#gfijo-categoria', 'Mercado');
    await expect(label).toHaveText('Nota (opcional)');

    await page.selectOption('#gfijo-categoria', 'Otro');
    await expect(label).toHaveText('Descripción');
    await expect(input).toHaveAttribute('aria-required', 'true');
  });

  test('guardar con categoría predefinida y sin texto: el registro usa la categoría como nombre', async ({ page }) => {
    await page.selectOption('#gfijo-categoria', 'Mercado');
    await page.fill('#gfijo-monto', '150000');
    await page.fill('#gfijo-dia', '10');
    await page.click('#form-gasto-fijo button[type="submit"]');

    await expect(page.locator('#modal-gasto-fijo')).not.toHaveAttribute('data-open');
    await page.click(`[data-action="agenda-mostrar-dia"][data-day="10"]`);

    const item = page.locator('.cal-detail__item').first();
    await expect(item.locator('.cal-detail__name')).toHaveText('Mercado');
  });

  test('guardar con categoría predefinida y una nota: la nota queda en el subtítulo, el nombre es la categoría', async ({ page }) => {
    await page.selectOption('#gfijo-categoria', 'Mercado');
    await page.fill('#gfijo-descripcion', 'Éxito de la esquina');
    await page.fill('#gfijo-monto', '150000');
    await page.fill('#gfijo-dia', '11');
    await page.click('#form-gasto-fijo button[type="submit"]');

    await expect(page.locator('#modal-gasto-fijo')).not.toHaveAttribute('data-open');
    await page.click(`[data-action="agenda-mostrar-dia"][data-day="11"]`);

    const item = page.locator('.cal-detail__item').first();
    await expect(item.locator('.cal-detail__name')).toHaveText('Mercado');
    await expect(item.locator('.cal-detail__sub')).toContainText('Éxito de la esquina');
  });
});

// ── Límites de gasto: resumen por grupo (MC.5b, ADR 017) ─────────────────────

test.describe('Límites de gasto - resumen por grupo', () => {
  test('sin ingreso registrado guía a Mis cuentas', async ({ page }) => {
    await saltearOnboarding(page); // ingresos: []
    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const vacio = page.locator('.grupos-resumen--vacio');
    await expect(vacio).toBeVisible({ timeout: 3_000 });
    await expect(vacio.locator('a[href="#tesoreria"]')).toBeVisible();
  });

  test('con ingreso registrado muestra las 3 tarjetas de grupo', async ({ page }) => {
    await saltearOnboarding(page);
    // Segundo addInitScript: agrega un ingreso mensual al estado ya sembrado.
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    await expect(page.locator('.grupos-resumen__grid .grupo-card')).toHaveCount(3);
    await expect(page.locator('.grupo-card[data-grupo="necesidades"]')).toBeVisible();
    await expect(page.locator('.grupo-card[data-grupo="estilo-de-vida"]')).toBeVisible();
    await expect(page.locator('.grupo-card[data-grupo="ahorro"]')).toBeVisible();
  });

  test('desglose de Necesidades (MC.5c): un fijo pagado este mes aparece en el detalle', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.compromisos = [{
        id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual',
        diaPago: 5, monto: 800_000, activo: true, categoria: null,
        fechaCreacion: '2026-01-01T00:00:00.000Z',
      }];
      st.gastos = [{
        id: 'g1', descripcion: 'Pago arriendo', monto: 800_000, categoria: 'Vivienda',
        fecha: hoy, cuentaId: null, nota: '', compromisoId: 'cf1',
      }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const card = page.locator('.grupo-card[data-grupo="necesidades"]');
    await card.locator('.grupo-card__desglose summary').click();
    await expect(card.locator('.grupo-card__item')).toHaveCount(1);
    await expect(card.locator('.grupo-card__item-nombre')).toContainText('Arriendo');
    await expect(card.locator('.grupo-card__item-sub')).toContainText('Pagado');
  });

  test('desglose de Ahorro (MC.5c): fondo activo muestra aportado este mes', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.ahorro = {
        fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 100_000 },
        aportes: [{ id: 'a1', monto: 50_000, fecha: hoy }],
        compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const card = page.locator('.grupo-card[data-grupo="ahorro"]');
    await card.locator('.grupo-card__desglose summary').click();
    await expect(card.locator('.grupo-card__item')).toHaveCount(1);
    await expect(card.locator('.grupo-card__item-nombre')).toContainText('Fondo de emergencia');
    await expect(card.locator('.grupo-card__item-sub')).toContainText('este mes');
  });

  test('alerta de Estilo de vida (MC.5d): un límite por categoría en 80% muestra el nudge exacto del ADR', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.presupuestos = [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 100_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
      st.gastos = [{ id: 'g1', descripcion: 'Almuerzo', monto: 80_000, categoria: 'Restaurantes', fecha: hoy, cuentaId: null, nota: '' }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const nudge = page.locator('.grupo-card[data-grupo="estilo-de-vida"] .nudge-medium .nudge__title');
    await expect(nudge).toBeVisible({ timeout: 3_000 });
    await expect(nudge).toHaveText('Ya usaste el 80% de tu presupuesto para Restaurantes. Intenta moderar este tipo de gastos los próximos días.');
  });

  test('refuerzo de Ahorro (MC.8a): cumplir justo el ahorro planeado muestra el refuerzo "Cumpliste"', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      // Preset fijo 50/30/20: ahorro = 20% de 3.000.000 = 600.000. Se aporta justo eso.
      st.config = { notificaciones: false, presetDistribucion: '50-30-20' };
      st.ahorro = {
        fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 },
        aportes: [{ id: 'a1', monto: 600_000, fecha: hoy }],
        compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const nudge = page.locator('.grupo-card[data-grupo="ahorro"] .nudge-success .nudge__title');
    await expect(nudge).toBeVisible({ timeout: 3_000 });
    await expect(nudge).toHaveText('Vas por buen camino. Cumpliste con el ahorro que planeaste este mes.');
  });

  test('refuerzo de Ahorro (MC.8a): superar lo planeado muestra el refuerzo más cálido', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      // Ahorro planeado 600.000; se aporta 900.000 (más de lo planeado).
      st.config = { notificaciones: false, presetDistribucion: '50-30-20' };
      st.ahorro = {
        fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 },
        aportes: [{ id: 'a1', monto: 900_000, fecha: hoy }],
        compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const nudge = page.locator('.grupo-card[data-grupo="ahorro"] .nudge-success .nudge__title');
    await expect(nudge).toBeVisible({ timeout: 3_000 });
    await expect(nudge).toHaveText('¡Excelente! Este mes estás ahorrando más de lo planeado. Cada peso que ahorras hoy es tranquilidad mañana.');
  });

  test('MC.8: superar la meta de Ahorro se ve en verde (logro), nunca en rojo', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { notificaciones: false, presetDistribucion: '50-30-20' }; // ahorro planeado 600.000
      st.ahorro = {
        fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 },
        aportes: [{ id: 'a1', monto: 900_000, fecha: hoy }], // aporta más de lo planeado
        compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const card = page.locator('.grupo-card[data-grupo="ahorro"]');
    // Estado visual "logro" (verde), no "excedido" (rojo).
    await expect(card).toHaveAttribute('data-estado', 'logro');
    // Barra de progreso verde (progress-bar--complete), no roja (--danger).
    await expect(card.locator('.progress-bar.progress-bar--complete')).toBeVisible();
    await expect(card.locator('.progress-bar--danger')).toHaveCount(0);
    // La tercera cifra celebra el excedente en positivo, no lo marca como "Excedido" rojo.
    const fig = card.locator('.grupo-card__fig').last();
    await expect(fig.locator('dt')).toHaveText('Ahorrado de más');
    await expect(fig.locator('dd')).toHaveClass(/is-positive/);
    await expect(fig.locator('dd.is-negative')).toHaveCount(0);
  });

  test('MC.5e: la nota de la sección menciona la complementariedad con Mis cuentas', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    await expect(page.locator('.grupos-resumen__nota')).toHaveText(
      'Mis cuentas planifica cómo repartes tu ingreso; Límites de gasto vigila que cumplas ese plan. Lo ejecutado refleja lo que registras en Finko este mes.',
    );
  });

  test('MC.8b: los topes por categoría viven dentro de la tarjeta de Estilo de vida, sin bloque suelto', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.presupuestos = [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 300_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const card = page.locator('.grupo-card[data-grupo="estilo-de-vida"]');
    // El envelope y el botón "Agregar límite" viven DENTRO de la tarjeta.
    await expect(card.locator('.estilo-limites')).toBeVisible();
    await expect(card.locator('.envelope[data-id="p1"]')).toBeVisible();
    await expect(card.locator('.estilo-limites [data-action="nuevo-presupuesto"]')).toHaveText('+ Agregar límite');
    // El bloque suelto y el hero antiguos ya no existen en ningún lado.
    await expect(page.locator('.estilo-detalle')).toHaveCount(0);
    await expect(page.locator('.presupuesto-hero')).toHaveCount(0);
  });

  test('MC.8b: la "olla finita" indica cuánto del Estilo de vida cubren los topes', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      // Preset 50/30/20: Estilo de vida = 30% de 3.000.000 = 900.000.
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { notificaciones: false, presetDistribucion: '50-30-20' };
      st.presupuestos = [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 300_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const olla = page.locator('.grupo-card[data-grupo="estilo-de-vida"] .estilo-olla');
    await expect(olla).toBeVisible({ timeout: 3_000 });
    await expect(olla).toHaveText(
      'Tus límites cubren $300.000 de los $900.000 de tu Estilo de vida. Te quedan $600.000 sin tope.',
    );
  });

  test('MC.8b: Necesidades se monitorea sin alarma, aunque supere lo previsto', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      // Preset 50/30/20 con ingreso 1.000.000: Necesidades asignado = 500.000.
      // Se ejecutan 600.000 (por encima). Antes de MC.8b la tarjeta iba en rojo.
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 1_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { notificaciones: false, presetDistribucion: '50-30-20' };
      st.compromisos = [{
        id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual',
        diaPago: 5, monto: 600_000, activo: true, categoria: null,
        fechaCreacion: '2026-01-01T00:00:00.000Z',
      }];
      st.gastos = [{
        id: 'g1', descripcion: 'Pago arriendo', monto: 600_000, categoria: 'Vivienda',
        fecha: hoy, cuentaId: null, nota: '', compromisoId: 'cf1',
      }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());
    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const card = page.locator('.grupo-card[data-grupo="necesidades"]');
    // Estado neutro "monitor": nunca "excedido" (rojo) ni "alerta" (ámbar).
    await expect(card).toHaveAttribute('data-estado', 'monitor');
    await expect(card.locator('.progress-bar--danger')).toHaveCount(0);
    await expect(card.locator('.progress-bar--warn')).toHaveCount(0);
    // La tercera cifra informa el exceso sin pintarlo de rojo.
    const fig = card.locator('.grupo-card__fig').last();
    await expect(fig.locator('dt')).toHaveText('Sobre lo previsto');
    await expect(fig.locator('dd.is-negative')).toHaveCount(0);
  });
});

// ── Mis cuentas: CTA cruzado a Límites de gasto (MC.5e, ADR 017) ─────────────

test.describe('Mis cuentas - CTA cruzado a Límites de gasto', () => {
  test('la distribución sugerida siempre enlaza a Límites de gasto', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    const cta = page.locator('#ingresos-distribucion a[href="#presupuesto"]');
    await expect(cta).toBeVisible({ timeout: 3_000 });
    await expect(cta).toContainText('Ver tu seguimiento en Límites de gasto');
  });
});

// ── Mis cuentas: aporte de ahorro por objetivo en "Distribuir mi ingreso" (MC.7a/MC.7b, ADR 018) ──

test.describe('Mis cuentas - Distribuir mi ingreso: aporte por objetivo', () => {
  test('una meta con fecha muestra un aporte sugerido (no 0) y el fondo recibe el excedente', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      const futura = new Date();
      futura.setMonth(futura.getMonth() + 6);
      const fechaLimite = futura.toISOString().slice(0, 10);

      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { presetDistribucion: '50-30-20' }; // ahorro = 20% de 3.000.000 = 600.000
      st.metas = [{ id: 'm1', nombre: 'Viaje', montoObjetivo: 1_200_000, montoActual: 0, fechaLimite, completada: false }];
      st.ahorro = {
        fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 100_000 },
        aportes: [], compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    const inputMeta  = page.locator('input.distribuir__monto[data-dist-tipo="meta"][data-dist-id="m1"]');
    const inputFondo = page.locator('input.distribuir__monto[data-dist-tipo="fondo"]');
    await expect(inputMeta).toBeVisible({ timeout: 3_000 });

    const montoMeta  = Number(await inputMeta.inputValue());
    const montoFondo = Number(await inputFondo.inputValue());
    expect(montoMeta).toBeGreaterThan(0);
    expect(montoMeta).toBeLessThanOrEqual(1_200_000);
    expect(montoFondo).toBe(600_000 - montoMeta); // el fondo recibe el excedente, no el budget completo
  });

  test('una meta sin fecha sugiere 0 y muestra el hint invitando a ponerle fecha', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { presetDistribucion: '50-30-20' };
      st.metas = [{ id: 'm1', nombre: 'Viaje', montoObjetivo: 1_200_000, montoActual: 0, fechaLimite: null, completada: false }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    const inputMeta = page.locator('input.distribuir__monto[data-dist-tipo="meta"][data-dist-id="m1"]');
    await expect(inputMeta).toBeVisible({ timeout: 3_000 });
    await expect(inputMeta).toHaveValue('0');

    const hint = page.locator('.distribuir__hint a[href="#metas"]');
    await expect(hint).toBeVisible({ timeout: 3_000 });
  });

});

// ── Mis cuentas: checklist accionable de Necesidades (MC.7d, ADR 018 revisión 2026-07-02) ──

test.describe('Mis cuentas - Distribuir mi ingreso: checklist de Necesidades', () => {
  test('lista fijos mensuales y deudas, marcadas por defecto, con día de pago; excluye un fijo Quincenal', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.compromisos = [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', categoria: 'Arriendo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true },
        { id: 'cf2', descripcion: 'Mercado', tipo: 'fijo', categoria: 'Mercado', frecuencia: 'Quincenal', diaPago: 1, monto: 150_000, activo: true },
        { id: 'd1', descripcion: 'Tarjeta Bancolombia', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito', saldoTotal: 2_000_000, cuotaMensual: 250_000, diaPago: 15, activo: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    await expect(page.locator('[data-nec-toggle]')).toHaveCount(2); // cf1 + d1; cf2 (Quincenal) queda fuera
    await expect(page.locator('[data-nec-id="cf1"]')).toBeChecked();
    await expect(page.locator('[data-nec-id="d1"]')).toBeChecked();
    await expect(page.locator('[data-nec-id="cf2"]')).toHaveCount(0);

    const panel = page.locator('#distribuir-ingreso-panel');
    await expect(panel).toContainText('Arriendo');
    await expect(panel).toContainText('día 5');
    await expect(panel).toContainText('Tarjeta Bancolombia');
  });

  test('una Necesidad ya pagada este periodo aparece marcada, deshabilitada, con "Ya pagado"', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.compromisos = [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ];
      st.gastos = [{
        id: 'g1', descripcion: 'Pago: Arriendo', monto: 800_000, categoria: 'Gastos fijos',
        fecha: hoy, cuentaId: 'c1', compromisoId: 'cf1', nota: '',
      }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    const chk = page.locator('[data-nec-id="cf1"]');
    await expect(chk).toBeChecked();
    await expect(chk).toBeDisabled();
    await expect(page.locator('.distribuir__fila--pagado')).toContainText('Ya pagado');
  });

  test('confirmar con una Necesidad de fijo marcada registra el mismo pago que "Marcar pagado" y descuenta la cuenta', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.compromisos = [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page); // "Distribuir" vive en el último paso (MC.7d)
    await page.click('[data-action="confirmar-distribucion"]');

    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    // save() está debounced 200ms (ADN #5): esperar el flush antes de leer localStorage.
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(3_200_000); // 1.000.000 + 3.000.000 (ingreso) - 800.000 (pago)
    const gasto = st.gastos.find(g => g.compromisoId === 'cf1');
    expect(gasto).toBeTruthy();
    expect(gasto.monto).toBe(800_000);
    expect(gasto.categoria).toBe('Gastos fijos');
    expect(gasto.cuentaId).toBe('c1');
  });

  test('Deshacer revierte el pago de una Necesidad: borra el gasto y restaura el saldo de la cuenta', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.compromisos = [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page); // "Distribuir" vive en el último paso (MC.7d)
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.click('[data-action="deshacer-distribucion"]');

    // save() está debounced 200ms (ADN #5): esperar el flush antes de leer localStorage.
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000);
    expect(st.gastos.find(g => g.compromisoId === 'cf1')).toBeUndefined();
  });

  test('BUG-003: confirmar con una Necesidad ya pagada presente no la vuelve a pagar', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.compromisos = [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
        { id: 'cf2', descripcion: 'Internet', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 10, monto: 200_000, activo: true, categoria: null },
      ];
      st.gastos = [{
        id: 'g1', descripcion: 'Pago: Arriendo', monto: 800_000, categoria: 'Gastos fijos',
        fecha: hoy, cuentaId: 'c1', compromisoId: 'cf1', nota: '',
      }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    await expect(page.locator('[data-nec-id="cf1"]')).toBeChecked();
    await expect(page.locator('[data-nec-id="cf1"]')).toBeDisabled();

    // El resumen en vivo no debe contar la fila "Ya pagado": solo cf2 (200.000).
    await expect(page.locator('#distribuir-resumen')).toContainText('200.000');

    await avanzarDistribuirHasta(page);
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));

    expect(st.gastos.filter(g => g.compromisoId === 'cf1')).toHaveLength(1); // sigue existiendo solo el original
    expect(st.gastos.find(g => g.compromisoId === 'cf2')).toBeTruthy();
    // 1.000.000 + 3.000.000 (ingreso) - 200.000 (solo cf2, cf1 ya estaba pagado).
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(3_800_000);
  });

  test('BUG-004: el checklist topa la cuota de una deuda a su saldo pendiente y excluye una deuda saldada', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.compromisos = [
        { id: 'd1', descripcion: 'Tarjeta', tipo: 'deuda-entidad', saldoTotal: 50_000, cuotaMensual: 200_000, diaPago: 15, activo: true },
        { id: 'd2', descripcion: 'Ya saldada', tipo: 'deuda-entidad', saldoTotal: 0, cuotaMensual: 300_000, diaPago: 20, activo: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    // d1 aparece topada a su saldo (50.000, no 200.000); d2 no aparece (saldada).
    await expect(page.locator('[data-nec-id="d1"]')).toHaveAttribute('data-nec-monto', '50000');
    await expect(page.locator('[data-nec-id="d2"]')).toHaveCount(0);

    await avanzarDistribuirHasta(page);
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));

    const abono = st.gastos.find(g => g.compromisoId === 'd1');
    expect(abono.monto).toBe(50_000);
    expect(st.compromisos.find(c => c.id === 'd1').saldoTotal).toBe(0);
    // 1.000.000 + 3.000.000 (ingreso) - 50.000 (solo lo que realmente se debía).
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(3_950_000);
  });

  test('BUG-005: una cuota de manejo guardada con frecuencia "mensual" se migra a "Mensual" y aparece en el checklist', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      // Estado pre-fix (schema v19): la cuota de manejo nació con 'mensual' minúscula.
      // Al cargar, la migración v19→v20 debe capitalizarla, y entonces la cuota
      // entra al checklist de Necesidades (antes quedaba excluida por el filtro Mensual).
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st._version = 19;
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true,
        cuotaManejo: { monto: 15_000, diaCobro: 5 } }];
      st.compromisos = [
        { id: 'cm1', descripcion: 'Cuota de manejo Nequi', monto: 15_000, frecuencia: 'mensual',
          diaPago: 5, tipo: 'fijo', activo: true, cuentaId: 'c1', esCuotaManejo: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    // La migración v19→v20 corre en memoria (S) al cargar, como todas las
    // migraciones del proyecto (no fuerza un save; persiste en el próximo
    // guardado, idempotente en cada carga). El efecto observable es que la
    // cuota ya cuenta como Necesidad Mensual en el panel de distribución.
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await expect(page.locator('[data-nec-id="cm1"]')).toHaveCount(1);
    await expect(page.locator('[data-nec-id="cm1"]')).toHaveAttribute('data-nec-monto', '15000');

    // Al confirmar (dispara save), la frecuencia migrada ya queda persistida.
    await avanzarDistribuirHasta(page);
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });
    await page.waitForTimeout(400); // flush del save() debounced (ADN #5)
    const frec = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('fk_v1')).compromisos.find(c => c.id === 'cm1').frecuencia);
    expect(frec).toBe('Mensual');
  });
});

test.describe('Mis cuentas - Distribuir mi ingreso: abono extra a deudas (BUG-006)', () => {
  test('el abono extra a una deuda registra el gasto, baja el saldo y descuenta la cuenta una sola vez', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      // cuotaMensual 0: la deuda no aparece en el checklist de Necesidades, solo
      // en "Abonar extra a deudas". Así se aísla la ruta del abono extra (BUG-006).
      st.compromisos = [
        { id: 'd1', descripcion: 'Tarjeta', tipo: 'deuda-entidad', saldoTotal: 2_000_000, cuotaMensual: 0, diaPago: 15, activo: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    // No hay fila de checklist (cuotaMensual 0); sí un input de abono extra.
    await expect(page.locator('[data-nec-toggle]')).toHaveCount(0);
    const inputExtra = page.locator('.distribuir__monto[data-dist-tipo="deuda"]');
    await expect(inputExtra).toHaveCount(1);
    await inputExtra.fill('500000');

    await avanzarDistribuirHasta(page);
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.waitForTimeout(400); // flush del save() debounced (ADN #5)
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));

    // BUG-006: ahora existe el gasto-abono, con el mismo shape que el abono individual.
    const abono = st.gastos.find(g => g.compromisoId === 'd1');
    expect(abono).toBeTruthy();
    expect(abono.monto).toBe(500_000);
    expect(abono.categoria).toBe('Deudas');
    expect(abono.cuentaId).toBe('c1');
    // La deuda bajó y la cuenta se descontó una sola vez (tesorería centraliza el descuento).
    expect(st.compromisos.find(c => c.id === 'd1').saldoTotal).toBe(1_500_000);
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000 + 3_000_000 - 500_000);
  });

  test('Deshacer revierte el abono extra: borra el gasto y restaura el saldo de la deuda y la cuenta', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.compromisos = [
        { id: 'd1', descripcion: 'Tarjeta', tipo: 'deuda-entidad', saldoTotal: 2_000_000, cuotaMensual: 0, diaPago: 15, activo: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await page.locator('.distribuir__monto[data-dist-tipo="deuda"]').fill('500000');
    await avanzarDistribuirHasta(page);
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.click('[data-action="deshacer-distribucion"]');

    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));
    expect(st.gastos.find(g => g.compromisoId === 'd1')).toBeUndefined();
    expect(st.compromisos.find(c => c.id === 'd1').saldoTotal).toBe(2_000_000);
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000);
  });
});

test.describe('Mis cuentas - Distribuir mi ingreso: cuota del checklist + abono extra a la misma deuda no sobrepaga (BUG-009)', () => {
  test('el extra se topa a lo que queda tras la cuota marcada: la deuda llega a 0, nunca a negativo, y la cuenta se debita exactamente el saldo', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      // saldoTotal 300.000 con cuotaMensual 100.000: la deuda aparece a la vez en
      // el checklist (cuota, marcada por defecto) y en "Abonar extra a deudas".
      st.compromisos = [
        { id: 'd1', descripcion: 'Tarjeta', tipo: 'deuda-entidad', saldoTotal: 300_000, cuotaMensual: 100_000, diaPago: 15, activo: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    // La cuota (100.000) llega marcada por defecto en el checklist.
    const checklist = page.locator('[data-nec-toggle][data-nec-tipo="deuda"][data-nec-id="d1"]');
    await expect(checklist).toBeChecked();
    await expect(checklist).toHaveAttribute('data-nec-monto', '100000');

    // El usuario pide un extra de 300.000: más de lo que queda tras la cuota (200.000).
    // El abono extra vive en el paso 2 del asistente (MC.7d).
    await avanzarDistribuirHasta(page, '.distribuir__monto[data-dist-tipo="deuda"][data-dist-id="d1"]');
    const inputExtra = page.locator('.distribuir__monto[data-dist-tipo="deuda"][data-dist-id="d1"]');
    await inputExtra.fill('300000');

    // El resumen en vivo ya refleja el tope coordinado: asignado = 100.000 (cuota) + 200.000 (extra topado), no 400.000.
    await expect(page.locator('#distribuir-resumen')).toContainText('Asignado: $300.000');

    await avanzarDistribuirHasta(page);
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.waitForTimeout(400); // flush del save() debounced (ADN #5)
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));

    // La deuda queda exactamente en 0, nunca negativa.
    expect(st.compromisos.find(c => c.id === 'd1').saldoTotal).toBe(0);
    // La suma de los dos gastos (cuota + extra topado) es el saldo real de la deuda, no más.
    const gastosDeuda = st.gastos.filter(g => g.compromisoId === 'd1');
    const totalAbonado = gastosDeuda.reduce((s, g) => s + g.monto, 0);
    expect(totalAbonado).toBe(300_000);
    // La cuenta se debita exactamente el saldo pagado, no cuota + extra sin topar (400.000).
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000 + 3_000_000 - 300_000);
  });
});

// ── Mis cuentas: asistente paginado + presupuesto sobre el remanente (MC.7d, ADR 018 R3) ──

test.describe('Mis cuentas - Distribuir mi ingreso: asistente paginado (MC.7d)', () => {
  test('el panel navega Necesidades → Ahorro → Estilo de vida con Atrás/Siguiente y confirma solo al final', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.config = { presetDistribucion: '50-30-20' };
      st.compromisos = [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ];
      st.ahorro = {
        fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 },
        aportes: [], compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    const indicador = page.locator('[data-dist-paso-indicador]');
    const atras     = page.locator('[data-action="distribuir-paso-atras"]');
    const siguiente = page.locator('[data-action="distribuir-paso-siguiente"]');
    const confirmar = page.locator('[data-action="confirmar-distribucion"]');

    // Paso 1: Necesidades visible, los demás ocultos; sin Atrás ni Distribuir.
    await expect(indicador).toHaveText('Paso 1 de 3: Necesidades');
    await expect(page.locator('[data-dist-paso="0"]')).toBeVisible();
    await expect(page.locator('[data-dist-paso="1"]')).toBeHidden();
    await expect(page.locator('[data-nec-id="cf1"]')).toBeVisible();
    await expect(atras).toBeHidden();
    await expect(siguiente).toBeVisible();
    await expect(confirmar).toBeHidden();

    // Paso 2: asignaciones (fondo) visible, checklist oculta, aparece Atrás.
    await siguiente.click();
    await expect(indicador).toHaveText('Paso 2 de 3: Ahorro, deudas e inversiones');
    await expect(page.locator('.distribuir__monto[data-dist-tipo="fondo"]')).toBeVisible();
    await expect(page.locator('[data-nec-id="cf1"]')).toBeHidden();
    await expect(atras).toBeVisible();

    // Paso 3 (último): Estilo de vida + Distribuir; Siguiente desaparece.
    await siguiente.click();
    await expect(indicador).toHaveText('Paso 3 de 3: Estilo de vida');
    await expect(page.locator('[data-dist-info="estiloVida"]')).toBeVisible();
    await expect(confirmar).toBeVisible();
    await expect(siguiente).toBeHidden();

    // Atrás regresa al paso 2 y Distribuir vuelve a ocultarse.
    await atras.click();
    await expect(indicador).toHaveText('Paso 2 de 3: Ahorro, deudas e inversiones');
    await expect(confirmar).toBeHidden();
  });

  test('R3: la sugerencia de ahorro se recalcula sobre el remanente real y respeta la edición manual del fondo', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      // Preset 50-30-20: teórico de ahorro = 600.000. El arriendo de 2.700.000
      // (marcado por defecto) deja un remanente de 300.000, que se reparte
      // 20:30 entre Ahorro y Estilo de vida: 120.000 y 180.000.
      st.config = { presetDistribucion: '50-30-20' };
      st.compromisos = [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 2_700_000, activo: true, categoria: null },
      ];
      st.ahorro = {
        fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 },
        aportes: [], compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    const fondo = page.locator('.distribuir__monto[data-dist-tipo="fondo"]');
    const hint  = page.locator('[data-dist-sugerencia-ahorro]');
    const ev    = page.locator('[data-dist-info="estiloVida"]');

    // Con el arriendo marcado, la sugerencia sale del remanente (no del 20% teórico).
    await expect(fondo).toHaveValue('120000');
    await expect(hint).toHaveText('$120.000');
    await expect(ev).toHaveText('$180.000');

    // Desmarcar el arriendo libera remanente: la sugerencia sube en vivo,
    // topada al teórico del split (600.000, no el 40% del remanente).
    await page.locator('[data-nec-id="cf1"]').uncheck();
    await expect(fondo).toHaveValue('600000');
    await expect(hint).toHaveText('$600.000');
    await expect(ev).toHaveText('$900.000');

    // Editar el fondo a mano lo saca del modo automático: re-marcar el
    // arriendo actualiza el hint pero ya no pisa el valor del usuario.
    await avanzarDistribuirHasta(page, '.distribuir__monto[data-dist-tipo="fondo"]');
    await fondo.fill('50000');
    await page.locator('[data-action="distribuir-paso-atras"]').click();
    await page.locator('[data-nec-id="cf1"]').check();
    await expect(hint).toHaveText('$120.000');
    await expect(fondo).toHaveValue('50000');
  });
});

// ── Mis cuentas: Paso 3 accionable, reparto de Estilo de vida entre cuentas (MC.7e, ADR 018 decisión 4) ──

test.describe('Mis cuentas - Distribuir mi ingreso: reparto de Estilo de vida entre cuentas (MC.7e)', () => {
  test('con una sola cuenta activa, el paso final es solo informativo (sin filas de transferencia)', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      // El fondo activo asegura que el panel tenga contenido que mostrar
      // (Ahorro): sin él, con una sola cuenta y sin compromisos, no habría
      // ningún destino ni Necesidad, y el botón "Distribuir" no aparecería.
      st.ahorro = {
        fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 },
        aportes: [], compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page);

    await expect(page.locator('.distribuir__monto[data-dist-tipo="cuenta"]')).toHaveCount(0);
    await expect(page.locator('text=¿Quieres mover parte a otras cuentas?')).toHaveCount(0);
  });

  test('con 2+ cuentas, el usuario reparte Estilo de vida sin marcar nada por defecto (todo queda en la cuenta de origen)', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { presetDistribucion: '50-30-20' }; // Estilo de vida = 30% de 3.000.000 = 900.000
      st.cuentas = [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page);

    // Dos filas de cuenta (Nequi con más saldo primero), ambas sin marcar por defecto.
    const filasCuenta = page.locator('.distribuir__monto[data-dist-tipo="cuenta"]');
    await expect(filasCuenta).toHaveCount(2);
    const filaNequiDiv = page.locator('.distribuir__fila').filter({ has: page.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c1"]') });
    const filaNequi = filaNequiDiv.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c1"]');
    const toggleNequi = filaNequiDiv.locator('[data-dist-destino-toggle]');
    await expect(toggleNequi).not.toBeChecked();
    await expect(filaNequi).toBeDisabled();

    await expect(page.locator('#distribuir-cuentas-resumen')).toContainText('Repartido entre cuentas: $0 de $900.000 disponibles.');
  });

  test('marcar una transferencia se refleja en el resumen y bloquea "Distribuir" si excede el presupuesto de Estilo de vida', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { presetDistribucion: '50-30-20' }; // Estilo de vida = 30% de 3.000.000 = 900.000
      st.cuentas = [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page);

    const filaBancolombiaDiv = page.locator('.distribuir__fila').filter({ has: page.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c2"]') });
    const filaBancolombia = filaBancolombiaDiv.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c2"]');
    const toggleBancolombia = filaBancolombiaDiv.locator('[data-dist-destino-toggle]');
    await toggleBancolombia.check();
    await filaBancolombia.fill('300000');

    await expect(page.locator('#distribuir-cuentas-resumen')).toContainText('Repartido entre cuentas: $300.000 de $900.000 disponibles.');
    await expect(page.locator('[data-action="confirmar-distribucion"]')).toBeEnabled();

    // Pedir más de lo disponible en Estilo de vida bloquea la confirmación.
    await filaBancolombia.fill('1000000');
    await expect(page.locator('#distribuir-cuentas-resumen')).toContainText('más de los $900.000 de Estilo de vida disponibles');
    await expect(page.locator('[data-action="confirmar-distribucion"]')).toBeDisabled();
  });

  test('confirmar con una transferencia marcada mueve el saldo entre cuentas (sin afectar Necesidades ni Ahorro)', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { presetDistribucion: '50-30-20' }; // Estilo de vida = 30% de 3.000.000 = 900.000
      st.cuentas = [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page);

    const filaBancolombiaDiv = page.locator('.distribuir__fila').filter({ has: page.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c2"]') });
    const filaBancolombia = filaBancolombiaDiv.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c2"]');
    const toggleBancolombia = filaBancolombiaDiv.locator('[data-dist-destino-toggle]');
    await toggleBancolombia.check();
    await filaBancolombia.fill('300000');

    await page.click('[data-action="confirmar-distribucion"]');
    // Con 2 cuentas, resolverCuenta abre un picker: la de mayor saldo aparece
    // primero y recibe foco; Nequi (mayor saldo) queda como cuenta de origen.
    await page.click('[data-role="elegir"][data-cuenta-id="c1"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.waitForTimeout(400); // flush del save() debounced (ADN #5)
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));

    // Bancolombia recibió la transferencia; Nequi (origen) la descontó junto al resto.
    expect(st.cuentas.find(c => c.id === 'c2').saldo).toBe(500_000 + 300_000);
    // Nequi: 1.000.000 + 3.000.000 (ingreso) - 300.000 (transferencia a Bancolombia).
    // Sin Necesidades ni Ahorro marcados en este estado (sin compromisos ni fondo activo).
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000 + 3_000_000 - 300_000);
  });

  test('Deshacer revierte la transferencia entre cuentas junto con el resto de la distribución', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { presetDistribucion: '50-30-20' }; // Estilo de vida = 30% de 3.000.000 = 900.000
      st.cuentas = [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page);

    const filaBancolombiaDiv = page.locator('.distribuir__fila').filter({ has: page.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c2"]') });
    const filaBancolombia = filaBancolombiaDiv.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c2"]');
    const toggleBancolombia = filaBancolombiaDiv.locator('[data-dist-destino-toggle]');
    await toggleBancolombia.check();
    await filaBancolombia.fill('300000');

    await page.click('[data-action="confirmar-distribucion"]');
    await page.click('[data-role="elegir"][data-cuenta-id="c1"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.click('[data-action="deshacer-distribucion"]');

    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000);
    expect(st.cuentas.find(c => c.id === 'c2').saldo).toBe(500_000);
  });
});
