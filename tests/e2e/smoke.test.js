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
// MC.16a: la versión de schema se lee de su fuente, no se teclea. Antes estaba
// hardcodeada (27) y el bump a v28 la dejó en rojo sin que el cambio la tocara.
import { SCHEMA_VERSION as SCHEMA_VERSION_VIGENTE } from '../../modules/core/storage.js';
// PERF.10b: la clave del estado se nombra en un solo sitio de los tests E2E.
import { sembrar, sembrarSiVacio, parchar, leerEstado } from './helpers/estado.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Inyecta un estado inicial en localStorage para saltear el onboarding.
 * Se llama en `page.addInitScript` antes de que la app cargue.
 */
async function saltearOnboarding(page) {
  await sembrar(page, {
    version: 1,
    perfil: { nombre: 'TestUser', smmlv: 1750905 },
    onboarded: true,
    cuentas: [],
    ingresos: [],
    gastos: [],
    compromisos: [],
    metas: [],
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
 * Toca un chip de categoría del lenguaje de formularios v2 (FORM.1, ADR 042):
 * la categoría son chips con radios ocultos, así que se clickea el label
 * (`.chip-cat`) que contiene el radio con ese value, no el input directo
 * (no es visible). Sin `value`, toca el primer chip del catálogo.
 *
 * @param {import('@playwright/test').Locator} form
 * @param {string} [value] - value del radio (nombre de la categoría o '__nueva__')
 */
async function elegirChip(form, value) {
  const chip = value
    ? form.locator(`.chip-cat:has(input[value="${value}"])`)
    : form.locator('.chip-cat').first();
  await chip.click();
}

/**
 * Elige una categoría en el form de gasto v2 (FORM.1a): sin `value`, toca el
 * primer chip (Mercado, la primera categoría del catálogo). La fecha ya no
 * se rellena en estos flujos: el chip "Hoy" viene seleccionado por defecto.
 * @param {import('@playwright/test').Locator} form
 * @param {string} [value]
 */
async function elegirCategoriaGasto(form, value) {
  await elegirChip(form, value);
}

/**
 * Abre el formulario de gasto fijo desde "Por pagar" (ficha 05, ADR 069): un
 * solo "+ Agregar" en el encabezado abre el chooser de tipo, y el chip "Gasto
 * fijo" lleva a su modal. Antes de esa ficha el alta vivía en el Calendario y
 * el modal se abría con un solo click.
 *
 * La página debe estar ya en `#compromisos`.
 * @param {import('@playwright/test').Page} page
 */
async function abrirFormGastoFijo(page) {
  await page.click('[data-action="comp-elegir-tipo-nuevo"]');
  await page.waitForSelector('#modal-compromiso-tipo[data-open]', { timeout: 3_000 });
  await page.click('[data-action="comp-elegir-tipo-nuevo-ir"][data-tipo="fijo"]');
  await expect(page.locator('#form-gasto-fijo')).toBeVisible({ timeout: 3_000 });
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
    await parchar(page, {
      cuentas: [{ id: 'c1', nombre: 'Efectivo', tipo: 'efectivo', saldo: 0, activa: true }],
    });
    await page.goto('/');
    await page.waitForSelector('#saldo-total', { timeout: 10_000 });
    await expect(page.locator('#saldo-total')).toHaveText('$0');
  });

  test('sin cuentas registradas muestra la guía de primeros pasos hacia Tesorería', async ({ page }) => {
    // Estado vacío: la guía es visible y la descripción técnica se oculta.
    await expect(page.locator('#hero-guia-saldo')).toBeVisible();
    await expect(page.locator('#saldo-desc')).toBeHidden();

    // El botón de la guía lleva directo a Tesorería. IN.9e (ADR 057 D6) renderiza
    // dos variantes (móvil/escritorio) a la vez, una oculta por CSS según el ancho:
    // el viewport de este test es de escritorio, así que apunta a esa variante.
    await page.click('#hero-guia-saldo .hero-guia__escritorio a[href="#tesoreria"]');
    await expect(page.locator('#sec-tesoreria.active')).toBeVisible();
  });

  test('con una cuenta registrada oculta la guía y muestra el saldo', async ({ page }) => {
    // El beforeEach siembra estado vacío vía addInitScript. Como addInitScript
    // se acumula y corre en CADA navegación, agregamos otro que inyecta una
    // cuenta (corre después del seed base) y recién ahí navegamos.
    await parchar(page, {
      cuentas: [{ id: 'c1', nombre: 'Efectivo', tipo: 'efectivo', saldo: 500000, activa: true }],
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
    await sembrarSiVacio(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [{ id: 'c1', nombre: 'Efectivo', tipo: 'efectivo', saldo: 500000, activa: true }],
      ingresos: [],
      gastos: [],
      compromisos: [],
      metas: [],
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

  test('la posición del ojo no cambia al alternar la máscara (IN.8b, ADR 034 D3)', async ({ page }) => {
    // Mismo motivo que el test de la fila final 6+6: esta prueba mide
    // geometría y la cascada de entrada (`cardIn`, layout.css) desliza cada
    // celda desde translateY(8px). El `waitForTimeout(250)` de `enReposo()`
    // es una espera a ciegas y la primera medición puede caer con la celda
    // aún a 8px de su sitio. `reduce` apaga la cascada por CSS (vive dentro
    // de un `@media no-preference`) y la medición deja de depender del reloj.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await sembrarSiVacio(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [{ id: 'c1', nombre: 'Efectivo', tipo: 'efectivo', saldo: 2485000, activa: true }],
      ingresos: [],
      gastos: [],
      compromisos: [],
      metas: [],
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await expect(page.locator('#saldo-total')).toHaveText('$2.485.000');

    // El hover de .bento__cell aplica un lift de -2px por diseño: se mide en
    // reposo, con el mouse fuera de la card, en los tres estados.
    const enReposo = async () => {
      await page.mouse.move(5, 700);
      await page.waitForTimeout(250);
      return page.locator('#saldo-ojo').boundingBox();
    };

    const antes = await enReposo();
    await page.click('#saldo-ojo');
    await expect(page.locator('#saldo-total')).toHaveText('$••••••');
    const oculto = await enReposo();
    await page.click('#saldo-ojo');
    await expect(page.locator('#saldo-total')).toHaveText('$2.485.000');
    const despues = await enReposo();

    // Antes de IN.8b el ojo vivía en flujo junto al monto y se desplazaba
    // porque la máscara tiene otro ancho; ahora es absoluto al hero.
    expect(oculto.x).toBe(antes.x);
    expect(oculto.y).toBe(antes.y);
    expect(despues.x).toBe(antes.x);
    expect(despues.y).toBe(antes.y);
  });

  test('móvil: el detalle por cuenta expande, respeta la máscara y no persiste (IN.8c, ADR 034 D4)', async ({ page }) => {
    // IN.9c (ADR 057 D3) acota el acordeón a móvil: desde 1024px el detalle
    // vive en su columna propia y el pill no se pinta. El ancho se declara.
    await page.setViewportSize({ width: 390, height: 844 });
    await sembrarSiVacio(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [
        { id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 1450000, activa: true },
        { id: 'c2', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 350000, activa: true },
      ],
      ingresos: [],
      gastos: [],
      compromisos: [],
      metas: [],
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    // Colapsado por defecto: conteo real visible, sin filas.
    await expect(page.locator('#saldo-detalle')).toBeHidden();
    await expect(page.locator('#saldo-desc')).toHaveText('efectivo + 1 cuenta bancaria');

    // Expandir: una fila por cuenta con su saldo; el conteo se oculta.
    await page.click('#saldo-detalle-toggle');
    await expect(page.locator('#saldo-detalle .hero-inicio__cuenta')).toHaveCount(2);
    await expect(page.locator('#saldo-detalle')).toContainText('Bancolombia');
    await expect(page.locator('#saldo-detalle')).toContainText('$1.450.000');
    await expect(page.locator('#saldo-desc')).toBeHidden();

    // El ojo enmascara total Y detalle juntos (extensión IN.2).
    await page.click('#saldo-ojo');
    await expect(page.locator('#saldo-total')).toHaveText('$••••••');
    await expect(page.locator('#saldo-detalle')).not.toContainText('1.450.000');
    await page.click('#saldo-ojo');
    await expect(page.locator('#saldo-detalle')).toContainText('$1.450.000');

    // Estado solo de UI: tras recargar vuelve colapsado (no se persiste).
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await expect(page.locator('#saldo-detalle')).toBeHidden();
    await expect(page.locator('#saldo-detalle-toggle')).toHaveAttribute('aria-expanded', 'false');
  });

  test('escritorio: el detalle por cuenta es columna propia y el mismo ojo la cubre (IN.9c, ADR 057 D3)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    // Este test mide geometría y `boundingBox()` incluye el transform. La
    // cascada de entrada del dashboard (`cardIn`, layout.css) desliza cada
    // celda desde translateY(8px) con 40ms de stagger: el hero (nth-child 1,
    // delay 0) aterriza antes que la columna (nth-child 2, delay 40ms) y entre
    // medio sus `y` difieren hasta 8px. Esa era la causa del flaky (fallaba con
    // 98 contra 104): bajo carga en paralelo la ventana dura más que la
    // medición. `reduce` apaga la cascada por CSS (el bloque vive dentro de un
    // `@media no-preference`) y deja en pie lo único que el test afirma: que
    // las dos celdas comparten fila. El test de IN.9d, más abajo, hace lo
    // mismo por la misma razón.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await sembrarSiVacio(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [
        { id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 1450000, activa: true },
        { id: 'c2', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 350000, activa: true },
      ],
      ingresos: [],
      gastos: [],
      compromisos: [],
      metas: [],
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    // La columna se pinta sola: no hay nada que expandir.
    const panel = page.locator('#panel-cuentas-detalle');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.hero-inicio__cuenta')).toHaveCount(2);
    await expect(panel).toContainText('Bancolombia');
    await expect(panel).toContainText('$1.450.000');

    // El acordeón no existe acá, y el conteo del hero convive con la columna.
    await expect(page.locator('#saldo-detalle-toggle')).toBeHidden();
    await expect(page.locator('#saldo-detalle')).toBeHidden();
    await expect(page.locator('#saldo-desc')).toHaveText('efectivo + 1 cuenta bancaria');

    // DSK.1b (ADR 070 D6): hero y columna dejan de ser dos celdas y pasan a
    // ser una sola banda. Siguen lado a lado (el saldo a la izquierda), pero
    // ahora centrados entre sí dentro de la misma superficie, así que lo que
    // coincide es el centro vertical, no el borde de arriba.
    const cajaBanda = await page.locator('.banda-inicio').boundingBox();
    const cajaHero  = await page.locator('.hero-inicio').boundingBox();
    const cajaPanel = await panel.boundingBox();
    expect(cajaPanel.x).toBeGreaterThan(cajaHero.x);
    const centro = (c) => Math.round(c.y + c.height / 2);
    expect(Math.abs(centro(cajaHero) - centro(cajaPanel))).toBeLessThanOrEqual(1);
    // Los dos caben dentro de la banda: es su celda, no su vecina.
    expect(cajaHero.x).toBeGreaterThanOrEqual(cajaBanda.x);
    expect(cajaPanel.x + cajaPanel.width).toBeLessThanOrEqual(cajaBanda.x + cajaBanda.width + 1);

    // Una superficie, un borde: los dos hijos pierden el suyo (D9 empieza acá,
    // "sin caja dentro de caja").
    const bordeHero = await page.locator('.hero-inicio')
      .evaluate(el => getComputedStyle(el).borderTopWidth);
    expect(bordeHero).toBe('0px');

    // D4: fuera las dos capas verdes. El gradiente de identidad y el blob
    // decorativo eran la única superficie teñida de la pantalla, y en esta app
    // el verde significa estado.
    const heroFondo = await page.locator('.hero-inicio')
      .evaluate(el => getComputedStyle(el).backgroundImage);
    expect(heroFondo).toBe('none');
    await expect(page.locator('.hero-inicio > .decor')).toBeHidden();

    // D5: el ojo deja la esquina absoluta y se pega al final de su etiqueta,
    // sin caja. Sin moverlo del DOM: en móvil sigue donde estaba.
    const ojo = page.locator('#saldo-ojo');
    const estiloOjo = await ojo.evaluate(el => {
      const c = getComputedStyle(el);
      return { position: c.position, borde: c.borderTopWidth };
    });
    expect(estiloOjo.position).toBe('static');
    expect(estiloOjo.borde).toBe('0px');
    const cajaLabel = await page.locator('#hero-saldo-label').boundingBox();
    const cajaOjo   = await ojo.boundingBox();
    // A la derecha del texto, no en la otra punta de la banda.
    expect(cajaOjo.x).toBeGreaterThan(cajaLabel.x + cajaLabel.width - 1);
    expect(cajaOjo.x - (cajaLabel.x + cajaLabel.width)).toBeLessThan(24);

    // D6: cada cuenta es una ficha con su nombre y su cifra juntos, no un
    // renglón con el nombre a un extremo y el saldo a 360px de distancia.
    const fichas = panel.locator('.hero-inicio__cuenta');
    const cajaF0 = await fichas.nth(0).boundingBox();
    const cajaF1 = await fichas.nth(1).boundingBox();
    expect(Math.round(cajaF0.y)).toBe(Math.round(cajaF1.y)); // en fila
    const cajaNombre = await fichas.nth(0).locator('.hero-inicio__cuenta-nombre').boundingBox();
    const cajaSaldo  = await fichas.nth(0).locator('.hero-inicio__cuenta-saldo').boundingBox();
    // La cifra va debajo del nombre, dentro de la misma ficha.
    expect(cajaSaldo.y).toBeGreaterThan(cajaNombre.y);
    expect(cajaSaldo.x + cajaSaldo.width).toBeLessThanOrEqual(cajaF0.x + cajaF0.width + 1);
    // El título de la columna sale de la vista: la banda ya está nombrada por
    // la etiqueta del saldo. Sigue en el DOM porque aria-labelledby lo usa.
    await expect(page.locator('#cuentas-detalle-titulo')).toBeHidden();
    await expect(panel).toHaveAttribute('aria-labelledby', 'cuentas-detalle-titulo');

    // PI4: un solo ojo cubre el total y la columna.
    await page.click('#saldo-ojo');
    await expect(page.locator('#saldo-total')).toHaveText('$••••••');
    await expect(panel).not.toContainText('1.450.000');
    await expect(panel).not.toContainText('350.000');
    await page.click('#saldo-ojo');
    await expect(panel).toContainText('$1.450.000');
  });

  test('móvil: la banda de escritorio no existe y el hero conserva gradiente, blob y ojo en la esquina (DSK.1b, ADR 070 D4/D5/D6)', async ({ page }) => {
    // Contracara del test anterior, y la compuerta que protege a MOV.1: el
    // envoltorio `.banda-inicio` es `display: contents` bajo 1024px, así que
    // sus dos hijos vuelven a ser celdas sueltas del bento y nada del hero
    // cambia. Si alguien quita ese `contents`, este test cae.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await sembrarSiVacio(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [
        { id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 1450000, activa: true },
      ],
      ingresos: [],
      gastos: [],
      compromisos: [],
      metas: [],
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    const banda = await page.locator('.banda-inicio')
      .evaluate(el => getComputedStyle(el).display);
    expect(banda).toBe('contents');

    // El hero sigue siendo su propia superficie, con su decoración.
    const hero = await page.locator('.hero-inicio').evaluate(el => {
      const c = getComputedStyle(el);
      return { borde: c.borderTopWidth, fondo: c.backgroundImage };
    });
    expect(hero.borde).toBe('1px');
    expect(hero.fondo.startsWith('linear-gradient')).toBe(true);

    // El ojo no se movió del DOM ni de su sitio: sigue siendo hermano de la
    // etiqueta, no un hijo suyo, así que no le suma alto a la fila del rótulo.
    const ojoEsHijoDelLabel = await page.locator('#saldo-ojo')
      .evaluate(el => el.parentElement.id === 'hero-saldo-label');
    expect(ojoEsHijoDelLabel).toBe(false);
    const altoLabel = await page.locator('#hero-saldo-label')
      .evaluate(el => Math.round(el.getBoundingClientRect().height));
    expect(altoLabel).toBeLessThan(32);

    // Y la columna de escritorio sigue sin existir acá: el detalle es el
    // acordeón de siempre.
    await expect(page.locator('#panel-cuentas-detalle')).toBeHidden();
    await expect(page.locator('#saldo-detalle-toggle')).toBeVisible();
  });

  test('Pendientes del mes sin línea roja, badge corto y "Ver calendario" al calendario (IN.8e, ADR 034 D5)', async ({ page }) => {
    // Móvil explícito desde DSK.1d (ADR 070 D8): en escritorio estas dos
    // tarjetas ya no existen por separado, viven fusionadas en "Lo que tienes
    // que pagar". Lo que este test cubre es la forma de móvil, que no cambió,
    // así que declara el ancho en vez de heredar el 1280 del proyecto.
    await page.setViewportSize({ width: 390, height: 844 });
    // BUG-021: el caso que esta prueba describe ("venció hace 2 días" junto a
    // "vence hoy") solo existe en un día del mes con margen a ambos lados, así
    // que el reloj se fija en vez de derivar los días de la fecha real. La
    // aritmética anterior (`((dia - 2 + 27) % 28) + 1`) envolvía en el rango
    // 1..28 en vez de restar 2, y sembraba el día equivocado los días 1, 2, 3
    // y 31 del mes: el 31 de julio esperaba "hace 2 días" contra un
    // compromiso del día 1. Misma familia de defecto de reloj que BUG-019 y
    // BUG-020. `setFixedTime` no toca los timers reales, así que el debounce
    // de `save()` (ADN 5) sigue corriendo igual.
    const DIA = 15;
    const DIA_VENCIDO = DIA - 2;
    await page.clock.setFixedTime(new Date(`2026-03-${DIA}T10:00:00`));
    const dia = DIA;
    const diaPasado = DIA_VENCIDO;
    await sembrarSiVacio(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [],
      ingresos: [],
      gastos: [],
      compromisos: [
        { id: 'v1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad', cuotaMensual: 180000, diaPago: diaPasado, activo: true, frecuencia: 'Mensual' },
        { id: 'v2', descripcion: 'Netflix', tipo: 'fijo', monto: 44900, diaPago: dia, activo: true, frecuencia: 'Mensual' },
      ],
      metas: [],
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    const panel = page.locator('#panel-vencidos');
    await expect(panel).toBeVisible();

    // Sin línea roja de alarma en toda la tarjeta (ADR 019: gastar no es incumplir).
    await expect(panel.locator('.vencidos-card')).toHaveCSS('border-left-width', '1px');

    // Título sin conteo embebido; el número vive en el badge circular.
    await expect(panel.locator('.vencidos-card__title')).toHaveText('Pendientes del mes 2');
    await expect(panel.locator('.vencidos-card__counter')).toHaveText('2');

    // Ítem vencido: badge corto "Deuda" + estado en color danger, sin borde propio.
    const item1 = panel.locator('.vencidos-card__item').first();
    await expect(item1).toContainText('Deuda');
    await expect(item1.locator('.vencidos-card__estado')).toHaveText('Venció hace 2 días');
    await expect(item1.locator('.vencidos-card__estado')).toHaveClass(/--danger/);

    // Ítem que vence hoy: badge corto "Gasto fijo" + estado en color warning.
    const item2 = panel.locator('.vencidos-card__item').nth(1);
    await expect(item2).toContainText('Gasto fijo');
    await expect(item2.locator('.vencidos-card__estado')).toHaveText('Vence hoy');
    await expect(item2.locator('.vencidos-card__estado')).toHaveClass(/--warning/);

    // Ficha 02 (ADR 069): la salida del panel apunta a la lente "Por pagar",
    // que es la duena del contenido. Antes iba al calendario, que ademas bajo
    // al menu "Mas".
    const verTodos = panel.locator('.vencidos-card__link');
    await expect(verTodos).toHaveText('Ver todos');
    await expect(verTodos).toHaveAttribute('href', '#compromisos');
    await verTodos.click();
    await expect(page.locator('#sec-compromisos.active')).toBeVisible();
  });

  test('Avisos: apartado listo, día de pago y préstamo vencido, sin repetir lo de otros paneles (CFG.3b, ADR 066)', async ({ page }) => {
    const DIA = 15;
    await page.clock.setFixedTime(new Date(`2026-03-${DIA}T10:00:00`));
    const dia = DIA;
    await sembrarSiVacio(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [],
      ingresos: [
        { id: 'i1', descripcion: 'Salario', monto: 2000000, frecuencia: 'Mensual', categoria: 'Salario', diaPago: dia, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z' },
      ],
      gastos: [],
      compromisos: [],
      presupuestos: [],
      apartados: [
        { id: 'a1', nombre: 'SOAT', icono: '📦', montoObjetivo: 500000, montoActual: 500000, fechaObjetivo: null, frecuenciaAporte: 'Mensual', recurrente: true, periodoMeses: 12, completado: true, fechaCreacion: '2025-01-01T00:00:00.000Z' },
      ],
      personales: [
        { id: 'pe1', persona: 'Juan', monto: 300000, pagado: 0, fecha: '2026-01-01', fechaLimite: `2026-03-${dia - 5}`, liquidado: false, fechaCreacion: '2026-01-01T00:00:00.000Z' },
      ],
      metas: [],
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    const panel = page.locator('#panel-avisos');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.avisos-card__title')).toHaveText('3 avisos');

    const items = panel.locator('.avisos-card__item');
    await expect(items).toHaveCount(3);
    await expect(panel.locator('.avisos-card__badge--listo')).toHaveText('Listo');
    await expect(panel).toContainText('SOAT');
    await expect(panel).toContainText('Ya reuniste $500.000');
    await expect(panel).toContainText('Salario');
    await expect(panel).toContainText('Te llega hoy · $2.000.000');
    await expect(panel).toContainText('Juan');
    await expect(panel).toContainText('Acordaron esta fecha hace 5 días');
  });

  test('móvil: Resumen de la semana visual: monto, chip, barras y categoría top (IN.8f, ADR 034 D6; acotado a móvil desde DSK.1a, ADR 070 D2)', async ({ page }) => {
    // DSK.1a: en escritorio este panel ya no existe (es tendencia, y la
    // tendencia no tiene fecha límite: pertenece a Análisis). Lo que mide
    // este test sigue vigente bajo 1024px, así que el viewport pasa a ser
    // explícito en vez de heredar el "Desktop Chrome" de la config.
    await page.setViewportSize({ width: 390, height: 844 });
    const hoy = new Date();
    const iso = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    const haceNDias = (n) => {
      const d = new Date(hoy);
      d.setDate(d.getDate() - n);
      return iso(d);
    };
    await sembrarSiVacio(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [],
      ingresos: [],
      gastos: [
        { id: 'g1', descripcion: 'Mercado semanal', categoria: 'Mercado', monto: 180000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g2', descripcion: 'Bus', categoria: 'Transporte', monto: 20000, fecha: haceNDias(3), cuentaId: null, nota: '' },
      ],
      compromisos: [],
      metas: [],
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    const panel = page.locator('#panel-resumen');
    await expect(panel).toBeVisible();
    // Ficha 02 (ADR 069): la etiqueta declara su alcance, porque esta cifra
    // suma todo S.gastos y el hero de Gastos excluye fijos y cuotas.
    await expect(panel.locator('.resumen-semana__label')).toHaveText('Todo lo que salió esta semana');
    await expect(panel.locator('.resumen-semana__alcance')).toHaveText('incluye fijos y cuotas de deuda');
    await expect(panel.locator('.resumen-semana__monto')).toHaveText('$200.000');
    // Sin semana previa con datos: el chip no alarma con rojo (ADR 019).
    await expect(panel.locator('.resumen-semana__chip')).toContainText('Sin semana previa para comparar');
    await expect(panel.locator('.resumen-semana__chip')).toHaveClass(/--neutro/);

    await expect(panel.locator('.resumen-semana__barra')).toHaveCount(7);
    await expect(panel.locator('.resumen-semana__barra-fill--pico')).toHaveCount(1);

    await expect(panel.locator('.resumen-semana__top-titulo')).toHaveText('Mercado fue tu categoría top');
    await expect(panel.locator('.resumen-semana__top-sub')).toContainText('2 de 7 días activos');
    await expect(panel.locator('.resumen-semana__top-monto')).toHaveText('$180.000');
  });

  test('móvil: Accesos rápidos + Actividad reciente fusionados en un solo bloque (IN.8g, ADR 034 D7; acotado a móvil desde IN.9d, ADR 057 D4)', async ({ page }) => {
    // Desde 1024px cada uno vive por separado (ver el test de escritorio,
    // más abajo); acá se verifica que la fusión móvil sigue intacta.
    await page.setViewportSize({ width: 390, height: 844 });
    const hoy = new Date();
    const iso = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    await sembrarSiVacio(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [],
      ingresos: [],
      // Seis gastos y no uno: desde la ficha 02 (ADR 069) el enlace "Ver todo"
      // solo se dibuja cuando hay mas historial que las filas que caben, y
      // estos tests afirman sobre ese enlace.
      gastos: [
        { id: 'g1', descripcion: 'Mercado semanal', categoria: 'Mercado', monto: 50000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g2', descripcion: 'Bus', categoria: 'Transporte', monto: 5000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g3', descripcion: 'Cafe', categoria: 'Restaurantes', monto: 8000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g4', descripcion: 'Panaderia', categoria: 'Mercado', monto: 12000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g5', descripcion: 'Recarga', categoria: 'Otros', monto: 20000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g6', descripcion: 'Farmacia', categoria: 'Otros', monto: 30000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g7', descripcion: 'Gasolina', categoria: 'Transporte', monto: 60000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g8', descripcion: 'Cine', categoria: 'Otros', monto: 25000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g9', descripcion: 'Libro', categoria: 'Otros', monto: 40000, fecha: iso(hoy), cuentaId: null, nota: '' },
      ],
      compromisos: [],
      metas: [],
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    // Un solo contenedor visual: ambas secciones son hijas directas del
    // mismo .accesos-actividad, no dos bento__cell separados.
    const contenedor = page.locator('.accesos-actividad');
    await expect(contenedor).toBeVisible();
    await expect(contenedor.locator('.accesos-actividad__label').first()).toHaveText('Accesos rápidos');
    await expect(contenedor.locator('[data-action="accesos-personalizar"]')).toBeVisible();
    await expect(page.locator('#accesos-inicio-grid .menu-mas__item').first()).toBeVisible();

    const actividad = page.locator('#panel-actividad-reciente');
    await expect(actividad).toBeVisible();
    await expect(actividad.locator('.accesos-actividad__label')).toHaveText('Actividad reciente');
    await expect(actividad.locator('.actividad-reciente__ver-todo')).toHaveAttribute('href', '#movimientos');
    await expect(actividad).toContainText('Mercado semanal');

    // El separador vive en la sección de actividad, no en toda la tarjeta.
    await expect(actividad).toHaveClass(/accesos-actividad__seccion--actividad/);
  });

  test('escritorio: Inicio avisa y no resume: sin Accesos rápidos, sin Actividad reciente y sin Resumen semanal (DSK.1a, ADR 070 D2 y D10)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    // La cascada de entrada (`cardIn`, layout.css) no afecta a un test de
    // presencia, pero sí al saludo, que se mide por visibilidad: `reduce`
    // apaga la animación por CSS y quita la espera a ciegas.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const hoy = new Date();
    const iso = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    await sembrarSiVacio(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [],
      ingresos: [],
      // Seis gastos y no uno: desde la ficha 02 (ADR 069) el enlace "Ver todo"
      // solo se dibuja cuando hay mas historial que las filas que caben, y
      // estos tests afirman sobre ese enlace.
      gastos: [
        { id: 'g1', descripcion: 'Mercado semanal', categoria: 'Mercado', monto: 50000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g2', descripcion: 'Bus', categoria: 'Transporte', monto: 5000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g3', descripcion: 'Cafe', categoria: 'Restaurantes', monto: 8000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g4', descripcion: 'Panaderia', categoria: 'Mercado', monto: 12000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g5', descripcion: 'Recarga', categoria: 'Otros', monto: 20000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g6', descripcion: 'Farmacia', categoria: 'Otros', monto: 30000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g7', descripcion: 'Gasolina', categoria: 'Transporte', monto: 60000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g8', descripcion: 'Cine', categoria: 'Otros', monto: 25000, fecha: iso(hoy), cuentaId: null, nota: '' },
        { id: 'g9', descripcion: 'Libro', categoria: 'Otros', monto: 40000, fecha: iso(hoy), cuentaId: null, nota: '' },
      ],
      compromisos: [],
      metas: [],
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    // La fusión móvil sigue oculta en escritorio, como desde IN.9d.
    await expect(page.locator('#accesos-actividad-movil')).toBeHidden();

    // Los dos contenedores que IN.9d creó salen del DOM, no se ocultan:
    // escritorio era su único hogar, así que dejarlos sería marcado muerto.
    await expect(page.locator('#panel-accesos-escritorio')).toHaveCount(0);
    await expect(page.locator('#panel-actividad-reciente-escritorio')).toHaveCount(0);
    await expect(page.locator('#accesos-inicio-grid-escritorio')).toHaveCount(0);

    // El Resumen semanal sí sigue en el DOM (bajo 1024px no cambió nada),
    // pero render.js lo fuerza oculto por ancho aunque haya datos de sobra:
    // estos nueve gastos son de hoy y llenarían sus barras.
    await expect(page.locator('#panel-resumen')).toBeHidden();

    // Y ninguno de los tres deja rastro visible. "Personalizar" sigue en el
    // DOM porque vive dentro de la fusión móvil, que es la que se oculta:
    // esa es justamente la dependencia abierta que deja D2 (necesita sitio
    // en Ajustes para volver a existir en escritorio).
    await expect(page.locator('[data-action="accesos-personalizar"]')).toBeHidden();
    await expect(page.locator('.resumen-semana__monto')).toBeHidden();

    // D10: el saludo pierde la marca "F" (el logo está a 240px, en la barra
    // lateral) y el engranaje (tercera entrada a Ajustes de la pantalla).
    // El avatar y el saludo se quedan.
    const saludo = page.locator('.perfil-inicio');
    await expect(saludo.locator('.perfil-inicio__marca')).toBeHidden();
    await expect(saludo.locator('.perfil-inicio__ajustes')).toBeHidden();
    await expect(saludo.locator('.perfil-inicio__franja')).toBeVisible();

    // La barra superior ya no tiene engranaje: DSK.10c (ADR 079 D8) lo retiró
    // por ser la segunda de tres entradas a la misma sección, y sin etiqueta.
    // Queda el conmutador de tema, que no es navegación.
    await expect(page.locator('.topbar__actions a[href="#config"]')).toHaveCount(0);
    await expect(page.locator('.topbar__actions [data-action="theme-toggle"]')).toBeVisible();
  });

  test('móvil: el saludo conserva marca "F" y engranaje (DSK.1a, ADR 070 D10)', async ({ page }) => {
    // La contracara del test anterior: acá la barra lateral no tiene logo
    // visible y no hay barra superior, así que las dos piezas se ganan su
    // sitio. Es la compuerta contra retirarlas de las dos plataformas.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await sembrarSiVacio(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [],
      ingresos: [],
      gastos: [],
      compromisos: [],
      metas: [],
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    const saludo = page.locator('.perfil-inicio');
    await expect(saludo.locator('.perfil-inicio__marca')).toBeVisible();
    await expect(saludo.locator('.perfil-inicio__ajustes')).toBeVisible();
  });
});

// ── SUITE 1c: Metas - categorías con emoji (MT.1 + MT.3) ─────────────────────

test.describe('Metas - categorías con emoji (MT.1)', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    // #metas ya no es un clic directo desde el sidebar (INT.1b la anida
    // bajo "Ahorro"); esta suite prueba el contenido de Metas, no la
    // navegación, así que va directo a la ruta.
    await page.goto('/#metas');
    await page.waitForSelector('#sec-metas.active', { timeout: 10_000 });
  });

  // DIS.14 (arquitectura A2): el ícono pasó al centro del arco y el nombre
  // vive en su propia línea, arriba de la tarjeta.
  // DIS.19: una categoría predefinida ya no pinta el glifo del sprite en el
  // arco, pinta su silueta que se llena. Acá se verifica el flujo completo
  // (elegir categoría, guardar, ver la tarjeta con su silueta); que la forma
  // sea exactamente el anillo lo fija `tests/unit/metas.test.js` contra
  // `SILUETAS.anillo`, que es donde se puede comparar el path sin acoplar el E2E.
  test('crear una meta con categoría "Boda" muestra su silueta en el arco (ID.3)', async ({ page }) => {
    await page.locator('#topbar-primario[data-action="nueva-meta"]:visible, #sec-metas .section__header [data-action="nueva-meta"]:visible').click();
    await page.waitForSelector('#modal-meta[data-open]');

    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Fiesta de matrimonio');
    await form.locator('#meta-objetivo').fill('5000000');
    await elegirChip(form, 'Boda');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    const glifo = page.locator('#lista-metas .meta-card__arco-icono');
    await expect(glifo).toHaveClass(/meta-card__arco-icono--silueta/);
    await expect(glifo.locator('svg.silueta')).toHaveCount(1);
    await expect(page.locator('#lista-metas .meta-card__nombre')).toContainText('Fiesta de matrimonio');
  });

  test('MT.3: el campo de emoji está oculto salvo con categoría "Otra"', async ({ page }) => {
    await page.locator('#topbar-primario[data-action="nueva-meta"]:visible, #sec-metas .section__header [data-action="nueva-meta"]:visible').click();
    await page.waitForSelector('#modal-meta[data-open]');

    const form = page.locator('#modal-meta-body form');
    await expect(form.locator('#form-group-meta-icono')).toBeHidden();

    // Cualquier categoría predefinida mantiene el emoji oculto: ya trae el suyo.
    await elegirChip(form, 'Viajes');
    await expect(form.locator('#form-group-meta-icono')).toBeHidden();

    // Solo "Otra" habilita elegir el emoji a mano.
    await elegirChip(form, 'Otra');
    await expect(form.locator('#form-group-meta-icono')).toBeVisible();
  });

  test('CAT.2b: con categoría "Otra" el ícono elegido en el picker queda en la lista', async ({ page }) => {
    await page.locator('#topbar-primario[data-action="nueva-meta"]:visible, #sec-metas .section__header [data-action="nueva-meta"]:visible').click();
    await page.waitForSelector('#modal-meta[data-open]');

    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Estudio de grabación');
    await form.locator('#meta-objetivo').fill('3000000');
    await elegirChip(form, 'Otra');
    // El selector compacto (CAT.2b) reemplazó al input de emoji libre: tocar
    // el recuadro despliega la grilla, elegir un ícono la cierra.
    await form.locator('[data-icono-picker="meta-icono"] .icono-picker__recuadro').click();
    await form.locator('[data-icono-picker="meta-icono"] [data-icon="c-torta"]').click();
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    const glifo = page.locator('#lista-metas .meta-card__arco-icono');
    await expect(glifo.locator('use[href="#c-torta"]')).toHaveCount(1);
  });

  test('CAT.2b: volver de "Otra" a otra categoría limpia el ícono elegido a mano', async ({ page }) => {
    await page.locator('#topbar-primario[data-action="nueva-meta"]:visible, #sec-metas .section__header [data-action="nueva-meta"]:visible').click();
    await page.waitForSelector('#modal-meta[data-open]');

    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Reforma de la casa');
    await form.locator('#meta-objetivo').fill('4000000');

    // El usuario prueba "Otra" y elige un ícono, pero se arrepiente y vuelve
    // a una categoría predefinida antes de guardar.
    await elegirChip(form, 'Otra');
    await form.locator('[data-icono-picker="meta-icono"] .icono-picker__recuadro').click();
    await form.locator('[data-icono-picker="meta-icono"] [data-icon="c-torta"]').click();
    await elegirChip(form, 'Vivienda');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    // Manda Vivienda, no el ícono que el usuario alcanzó a elegir con "Otra".
    // DIS.19: una categoría predefinida se dibuja como silueta, así que la
    // prueba es que aparezca la silueta y NO quede el sprite elegido a mano.
    const glifo = page.locator('#lista-metas .meta-card__arco-icono');
    await expect(glifo).toHaveClass(/meta-card__arco-icono--silueta/);
    await expect(glifo.locator('svg.silueta')).toHaveCount(1);
    await expect(glifo.locator('use[href="#c-torta"]')).toHaveCount(0);
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
    await page.locator('#topbar-primario[data-action="nueva-meta"]:visible, #sec-metas .section__header [data-action="nueva-meta"]:visible').click();
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

    // Progreso de la meta actualizado en la lista. DIS.14: el acumulado es la
    // cifra grande de la tarjeta y el objetivo, el extremo de la escala del
    // arco (deja de ser un número que compite con lo logrado).
    await expect(page.locator('#lista-metas .meta-card__monto')).toHaveText('$200.000');
    await expect(page.locator('#lista-metas .meta-card__escala')).toContainText('$3.000.000');

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
    await expect(page.locator('.modal--confirm .modal__title')).toHaveText('Registrar aporte');
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
    await sembrar(page, {
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
    });
    await page.goto('/#metas');
    await expect(page.locator('#sec-metas.active')).toBeVisible();

    const futura = new Date();
    futura.setDate(futura.getDate() + 90);
    const anio = futura.getFullYear();
    const mes  = String(futura.getMonth() + 1).padStart(2, '0');
    const dia  = String(futura.getDate()).padStart(2, '0');

    await page.locator('#topbar-primario[data-action="nueva-meta"]:visible, #sec-metas .section__header [data-action="nueva-meta"]:visible').click();
    await page.waitForSelector('#modal-meta[data-open]');
    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Estudio de idiomas');
    await form.locator('#meta-objetivo').fill('600000');
    await form.locator('#meta-fecha').fill(`${anio}-${mes}-${dia}`);
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    // DIS.14: el ritmo de ahorro se cuenta en aportes y vive entre los datos
    // de la tarjeta ("N aportes de $X por quincena").
    const ritmo = page.locator('#lista-metas .meta-card__dato', { hasText: 'aportes de' });
    await expect(ritmo).toContainText('por quincena');
    await expect(ritmo).not.toContainText('/día');
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

  test('se puede completar el wizard (nombre + aceptación legal, LEG.2) y no reaparece tras recarga', async ({ page }) => {
    // Cada test tiene su propio contexto de browser (localStorage limpio por defecto).
    // Solo navegamos directo; si hay contaminación por workers del SW, el retry
    // configurado en playwright.config.js lo resuelve.
    await page.goto('/');

    // Paso 1: nombre.
    await page.locator('#onboarding input[name="nombre"]').fill('María Camila');
    await page.locator('#onboarding button[type="submit"]').click();

    // Paso 2: aceptación obligatoria del paquete legal. El wizard sigue
    // abierto (mismo overlay #onboarding, contenido reemplazado).
    await expect(page.locator('#onboarding[data-open]')).toBeVisible({ timeout: 3_000 });
    await page.locator('#form-onboarding-legal input[name="acepto"]').check();
    await page.locator('#form-onboarding-legal button[type="submit"]').click();

    // Ahora sí, el wizard debe cerrarse.
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

  test('sin marcar la casilla de aceptación, el paso 2 no avanza', async ({ page }) => {
    await page.goto('/');

    await page.locator('#onboarding input[name="nombre"]').fill('Julián');
    await page.locator('#onboarding button[type="submit"]').click();

    await expect(page.locator('#onboarding[data-open]')).toBeVisible({ timeout: 3_000 });
    await page.locator('#form-onboarding-legal button[type="submit"]').click();

    // Sigue en el paso 2: el checkbox no se marcó, no hay forma de continuar.
    await expect(page.locator('#form-onboarding-legal')).toBeVisible();
    await expect(page.locator('#onboarding[data-open]')).toBeVisible();
  });
});

// ── SUITE 3: Navegación ─────────────────────────────────────────────────────

test.describe('Navegación hash', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
  });

  // #metas (y sus 3 hermanas) ya no son un clic directo desde cualquier
  // sección: INT.1b (ADR 059 D6) las anidó bajo "Ahorro", visibles solo
  // dentro del grupo. La casa (#ahorro) es el atajo permanente que las
  // reemplaza en esta lista; el camino de dos clics se prueba abajo.
  const secciones = [
    { href: '#gast',        seccion: 'sec-gast' },
    { href: '#compromisos',  seccion: 'sec-compromisos' },
    { href: '#agenda',      seccion: 'sec-agenda' },
    { href: '#tesoreria',   seccion: 'sec-tesoreria' },
    { href: '#ahorro',      seccion: 'sec-ahorro' },
    { href: '#analisis',    seccion: 'sec-analisis' },
    { href: '#config',      seccion: 'sec-config' },
    { href: '#dash',        seccion: 'sec-dash' },
  ];

  // El viewport por defecto es de escritorio, y desde AH.7a (ADR 065 D1)
  // "Ahorro" tiene dos entradas de nav: la casa del sidebar y la pestaña
  // mobile-only de la barra inferior. Se apunta siempre a la de escritorio.
  for (const { href, seccion } of secciones) {
    test(`navega a ${href} y activa #${seccion}`, async ({ page }) => {
      await page.click(`.nav-item:not(.nav-item--mobile-only)[href="${href}"]`);
      await expect(page.locator(`#${seccion}`)).toHaveClass(/active/);
    });
  }

  test('una hija de Ahorro (ej. Metas) se alcanza en dos clics: Ahorro despliega el sub-nivel (INT.1b)', async ({ page }) => {
    await page.click('.nav-item--no-mobile[href="#ahorro"]');
    await page.click('.nav-item[href="#metas"]');
    await expect(page.locator('#sec-metas')).toHaveClass(/active/);
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

    await crearCuentaEfectivo(page, 500000);
    await expect(page.locator('#lista-tesoreria')).toContainText('Efectivo', { timeout: 3_000 });

    // Ir a Gastos
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');

    const form = page.locator('#modal-gasto-body form');
    // FORM.1a: la categoría se elige con chips (el título de la lista pasa a
    // mostrar la elegida: Mercado, primer chip del catálogo) y la fecha queda
    // en "Hoy" por defecto, sin rellenar nada.
    await elegirCategoriaGasto(form);
    await form.locator('[name="monto"]').fill('150000');
    await form.locator('button[type="submit"]').click();

    await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({
      timeout: 3_000,
    });
    await expect(page.locator('#lista-gastos')).toContainText(
      'Mercado',
      { timeout: 3_000 }
    );
  });

  test('GAS.1a: el hero del mes muestra el total protagonista y el ojo lo enmascara', async ({ page }) => {
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await crearCuentaEfectivo(page, 500000);
    await expect(page.locator('#lista-tesoreria')).toContainText('Efectivo', { timeout: 3_000 });

    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    // Registrar un gasto de $150.000 (categoría = primer chip, fecha = Hoy).
    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');
    const form = page.locator('#modal-gasto-body form');
    await elegirCategoriaGasto(form);
    await form.locator('[name="monto"]').fill('150000');
    await form.locator('button[type="submit"]').click();
    await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({ timeout: 3_000 });

    // El hero (ADR 039 D1) muestra el total protagonista, su label y la
    // navegación de mes integrada.
    const hero = page.locator('.hero-gastos');
    // DIS.4/G1: el label nombra el mes visible, nunca un "este mes" fijo.
    const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    await expect(hero.locator('.hero-gastos__label'))
      .toHaveText(`Gastaste en ${MESES_ES[new Date().getMonth()]}`, { timeout: 3_000 });
    await expect(hero.locator('.hero-gastos__valor')).toHaveText('$150.000');
    await expect(hero.locator('[data-action="gastos-prev-mes"]')).toBeVisible();

    // El ojo enmascara y desenmascara el total (flag único IN.2, D9).
    await page.click('[data-action="gastos-saldo-visibilidad"]');
    await expect(hero.locator('.hero-gastos__valor')).toHaveText('$••••••');
    await page.click('[data-action="gastos-saldo-visibilidad"]');
    await expect(hero.locator('.hero-gastos__valor')).toHaveText('$150.000');
  });

  test('GAS.1b: la lista agrupa por día bajo "Hoy" con total, y el ojo enmascara los montos', async ({ page }) => {
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await crearCuentaEfectivo(page, 500000);
    await expect(page.locator('#lista-tesoreria')).toContainText('Efectivo', { timeout: 3_000 });

    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    // Dos gastos de hoy → un solo grupo "Hoy" con el total del día.
    for (const monto of ['85000', '32000']) {
      await page.click('[data-action="nuevo-gasto"]');
      await page.waitForSelector('#modal-gasto[data-open]');
      const form = page.locator('#modal-gasto-body form');
      await elegirCategoriaGasto(form);
      await form.locator('[name="monto"]').fill(monto);
      await form.locator('button[type="submit"]').click();
      await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({ timeout: 3_000 });
    }

    const grupo = page.locator('#lista-gastos .gastos-dia').first();
    await expect(grupo.locator('.gastos-dia__label')).toHaveText('Hoy', { timeout: 3_000 });
    await expect(grupo.locator('.gastos-dia__total')).toHaveText('$117.000');
    await expect(grupo.locator('.list-item')).toHaveCount(2);

    // El ojo enmascara el total del día y los montos de los ítems (D9).
    await page.click('[data-action="gastos-saldo-visibilidad"]');
    await expect(grupo.locator('.gastos-dia__total')).toHaveText('••••');
    await expect(grupo.locator('.list-item__amount').first()).toHaveText('••••');
  });

  test('GAS.1c: el insight de gastos hormiga aparece en la vista "Todos" y se oculta al filtrar', async ({ page }) => {
    // Sembrar 6 domicilios pequeños de hoy (≤ $20.000 c/u, suman $108.000):
    // exactamente el patrón que detectarHormigas() reporta. Vía initScript
    // (se registra DESPUÉS del de saltearOnboarding, así que gana al re-boot)
    // + reload (un goto a la misma URL con hash es navegación same-document:
    // no re-ejecuta init scripts ni re-arranca la app).
    const d = new Date();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await sembrar(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [],
      ingresos: [],
      gastos: Array.from({ length: 6 }, (_, i) => ({
        id: `h${i}`, categoria: 'Domicilios', monto: 18000, fecha: iso, cuentaId: null, nota: '',
      })),
      compromisos: [],
      metas: [],
    });
    await page.reload();
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    const insight = page.locator('#lista-gastos .gastos-insight');
    await expect(insight).toBeVisible();
    await expect(insight.locator('.gastos-insight__title')).toHaveText('Gastos hormiga: Domicilios');
    await expect(insight.locator('.gastos-insight__desc')).toContainText('6 gastos pequeños suman');
    await expect(insight.locator('.gastos-insight__desc')).toContainText('$108.000');

    // Con un filtro de categoría activo el insight se oculta (solo "Todos").
    await page.click('.filtros-bar [data-cat="Domicilios"]');
    await expect(page.locator('#lista-gastos .gastos-insight')).toHaveCount(0);
    await expect(page.locator('#lista-gastos .list-item')).toHaveCount(6);
  });

  test('TX.9b: crear categoría personalizada, verla en la lista y reusarla en un segundo gasto', async ({ page }) => {
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await crearCuentaEfectivo(page, 500000);
    await expect(page.locator('#lista-tesoreria')).toContainText('Efectivo', { timeout: 3_000 });

    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });
    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');

    const form = page.locator('#modal-gasto-body form');
    await elegirCategoriaGasto(form, '__nueva__');
    await expect(page.locator('#categoria-nueva-fields')).toBeVisible();

    await form.locator('#categoria-nueva-nombre').fill('Suplementos');
    // CAT.2: el selector de ícono nace como recuadro colapsado; hay que
    // tocarlo primero para desplegar la grilla antes de elegir un ícono.
    // Acotado a `form`: con CAT.2b (Metas) el picker vive en más de un
    // formulario inyectado en la página a la vez (aunque el otro modal esté
    // cerrado), así que un locator global sería ambiguo.
    await form.locator('.icono-picker__recuadro').click();
    await form.locator('.icono-picker__btn[data-icon="c-pesa"]').click();
    // Elegir un ícono colapsa el panel de nuevo (el recuadro ya muestra el elegido).
    await expect(form.locator('.icono-picker__panel')).toBeHidden();

    await form.locator('[name="monto"]').fill('80000');
    await form.locator('button[type="submit"]').click();

    await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({ timeout: 3_000 });
    await expect(page.locator('#lista-gastos .list-item__title')).toHaveText('Suplementos', { timeout: 3_000 });

    // Registrar un segundo gasto: "Suplementos" ya aparece como chip normal
    // (se comporta igual que una categoría nativa, sin duplicar el flujo).
    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');
    const form2 = page.locator('#modal-gasto-body form');
    await expect(form2.locator('input[name="categoria"][value="Suplementos"]')).toHaveCount(1);
    await elegirCategoriaGasto(form2, 'Suplementos');
    await expect(page.locator('#categoria-nueva-fields')).toBeHidden();
    await form2.locator('[name="monto"]').fill('30000');
    await form2.locator('button[type="submit"]').click();

    await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({ timeout: 3_000 });
    const items = page.locator('#lista-gastos .list-item__title', { hasText: 'Suplementos' });
    await expect(items).toHaveCount(2);
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

  test('MC.18a: el hero muestra el total en cuentas y el ojo lo enmascara', async ({ page }) => {
    // Sin cuentas: hero en estado vacío, sin ojo.
    await expect(page.locator('#tesoreria-hero')).toContainText('Aún no tienes cuentas');
    await expect(page.locator('#tesoreria-saldo-ojo')).toHaveCount(0);

    await crearCuentaEfectivo(page, 1000000);

    // Con cuenta: label, total y resumen de composición.
    const hero = page.locator('#tesoreria-hero');
    await expect(hero).toContainText('Tu dinero en cuentas', { timeout: 3_000 });
    await expect(hero.locator('.hero-tesoreria__valor')).toHaveText('$1.000.000');
    // MC-DIS.9 (hallazgo H4, regla R23): el resumen dice lo que dibuja la
    // barra, no el conteo de cuentas (antes: "1 cuenta · efectivo").
    await expect(hero).toContainText('Efectivo 100%');
    await expect(hero.locator('.hero-tesoreria__compo-seg')).toHaveCount(1);

    // El ojo enmascara el total y queda presionado; el monto real no viaja al DOM.
    await page.click('#tesoreria-saldo-ojo');
    await expect(hero.locator('.hero-tesoreria__valor')).toHaveText('$••••••');
    await expect(page.locator('#tesoreria-saldo-ojo')).toHaveAttribute('aria-pressed', 'true');

    // Es el mismo flag de Inicio (IN.2): el saldo del dashboard también queda oculto.
    await page.click('a[href="#dash"]');
    await expect(page.locator('#saldo-total')).toHaveText('$••••••', { timeout: 3_000 });

    // Volver y destapar: el total regresa.
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('#tesoreria-saldo-ojo');
    await expect(hero.locator('.hero-tesoreria__valor')).toHaveText('$1.000.000');
  });

  test('MC.18b: la tarjeta de cuenta muestra nombre, tipo, saldo, chips y se enmascara con el ojo', async ({ page }) => {
    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');
    const form = page.locator('#modal-cuenta-body form');

    await form.locator('.bank-picker__trigger').click();
    await page.waitForSelector('#banco-list:not([hidden])', { timeout: 5_000 });
    await page.locator('#banco-list .bank-picker__item[data-value="Bancolombia"]').click();
    await form.locator('#cuenta-tipo').selectOption('Ahorros');
    await form.locator('#cuenta-saldo').fill('1450000');
    await form.locator('#cuenta-4x1000').check();
    await form.locator('#cuenta-cuota-toggle').check();
    await form.locator('#cuenta-cuota-monto').fill('15000');
    await form.locator('#cuenta-cuota-dia').fill('15');
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-cuenta'), { timeout: 5_000 });

    const card = page.locator('.cuenta-card').first();
    await expect(card.locator('.cuenta-card__nombre')).toHaveText('Bancolombia');
    await expect(card.locator('.cuenta-card__tipo')).toHaveText('Ahorros');
    await expect(card.locator('.cuenta-card__saldo')).toHaveText('$1.450.000');
    await expect(card).toContainText('Cuota $15.000 · día 15');
    await expect(card).toContainText('4x1000');
    await expect(card.locator('[data-action="editar-cuenta"]')).toBeVisible();
    await expect(card.locator('[data-action="eliminar-cuenta"]')).toBeVisible();

    // El ojo del hero también enmascara el saldo de la tarjeta.
    await page.click('#tesoreria-saldo-ojo');
    await expect(card.locator('.cuenta-card__saldo')).toHaveText('••••');
    await expect(card).not.toContainText('1.450.000');
  });

  test('MC.18c: la tarjeta insight del GMF aparece bajo las cuentas cuando hay costo este mes', async ({ page }) => {
    // Sin gastos aún: el contenedor de GMF no pinta nada.
    await expect(page.locator('#tesoreria-gmf')).toBeEmpty();

    // Cuenta con 4x1000 activo.
    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');
    const form = page.locator('#modal-cuenta-body form');
    await form.locator('.bank-picker__trigger').click();
    await page.waitForSelector('#banco-list:not([hidden])', { timeout: 5_000 });
    await page.locator('#banco-list .bank-picker__item[data-value="Bancolombia"]').click();
    await form.locator('#cuenta-tipo').selectOption('Ahorros');
    await form.locator('#cuenta-saldo').fill('1000000');
    await form.locator('#cuenta-4x1000').check();
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-cuenta'), { timeout: 5_000 });

    // Sin gastos aún, la tarjeta insight sigue vacía.
    await expect(page.locator('#tesoreria-gmf')).toBeEmpty();

    // Un gasto este mes desde esa cuenta genera el costo del gravamen.
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });
    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');
    const formGasto = page.locator('#modal-gasto-body form');
    await elegirCategoriaGasto(formGasto);
    await formGasto.locator('[name="monto"]').fill('500000');
    await formGasto.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-gasto'), { timeout: 3_000 });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    const insight = page.locator('.gmf-insight');
    await expect(insight).toContainText('4x1000 estimado este mes: $2.000');
    await expect(insight).toContainText('1 cuenta');
  });

  test('MC.18d: fuentes de ingreso fijas y puntuales agrupadas bajo un solo encabezado', async ({ page }) => {
    await crearCuentaEfectivo(page, 500000);

    // Un solo encabezado, y sus dos altas al pie de las listas. ADR 080 D2:
    // los botones salieron del sub-encabezado, que ahora solo nombra el grupo.
    const subHeader = page.locator('.section__sub-header', { hasText: 'Fuentes de ingreso' });
    await expect(subHeader).toBeVisible();
    await expect(subHeader.locator('button')).toHaveCount(0);

    const altas = page.locator('#ingresos-altas');
    await expect(altas.locator('[data-action="nuevo-ingreso"]')).toBeVisible();
    await expect(altas.locator('[data-action="nuevo-ingreso-puntual"]')).toBeVisible();
    // El puntual es un atajo declarado a la teja "Ingreso" de Registrar (R72).
    await expect(altas.locator('[data-action="nuevo-ingreso-puntual"]')).toContainText('Atajo');

    // Crear un ingreso fijo.
    await altas.locator('[data-action="nuevo-ingreso"]').click();
    await page.waitForSelector('#modal-ingreso[data-open]');
    const formFijo = page.locator('#modal-ingreso-body form');
    await formFijo.locator('#ingreso-cat').selectOption({ index: 1 });
    await formFijo.locator('#ingreso-desc').fill('Salario empresa');
    await formFijo.locator('#ingreso-monto').fill('1850000');
    await formFijo.locator('#ingreso-frec').selectOption('Mensual');
    await formFijo.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-ingreso'), { timeout: 5_000 });
    await expect(page.locator('#lista-ingresos')).toContainText('Salario empresa');

    // Crear un ingreso puntual.
    await altas.locator('[data-action="nuevo-ingreso-puntual"]').click();
    await page.waitForSelector('#modal-ingreso-puntual[data-open]');
    const formPuntual = page.locator('#modal-ingreso-puntual-body form');
    await formPuntual.locator('#ingreso-p-monto').fill('450000');
    await formPuntual.locator('#ingreso-p-desc').fill('Venta de la bici');
    await formPuntual.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-ingreso-puntual'), { timeout: 5_000 });
    await expect(page.locator('#lista-ingresos-puntuales')).toContainText('Venta de la bici');

    // NAV.A2b s2: con un ingreso fijo ya registrado, el asistente existe y
    // el ingreso puntual ofrece distribuirlo. No es el foco de este test.
    const confirmDistribuir = page.locator('[role="dialog"][aria-labelledby="confirm-title"]');
    if (await confirmDistribuir.isVisible().catch(() => false)) {
      await confirmDistribuir.locator('[data-role="cancelar"]').click();
    }

    // Ambas listas viven una tras otra bajo el mismo encabezado, sin
    // sub-header propio entre ellas (solo el de "Fuentes de ingreso"; la
    // tarjeta "Distribuir mi ingreso" de MC.18e agrega un segundo sub-header
    // legítimo y distinto al final de la sección, fuera del alcance de este check).
    await expect(page.locator('.section__sub-header', { hasText: 'Fuentes de ingreso' })).toHaveCount(1);

    // El ojo del hero también enmascara los montos de ambas listas (D5).
    await expect(page.locator('#lista-ingresos .list-item__value')).toHaveText('$1.850.000');
    await expect(page.locator('#lista-ingresos-puntuales .list-item__value')).toHaveText('+$450.000');
    await page.click('#tesoreria-saldo-ojo');
    await expect(page.locator('#lista-ingresos .list-item__value')).toHaveText('••••');
    await expect(page.locator('#lista-ingresos-puntuales .list-item__value')).toHaveText('+••••');
  });

  test('MC.13d: el ingreso fijo registra en qué cuenta se recibe', async ({ page }) => {
    await crearCuentaEfectivo(page, 500000);

    // Con una sola cuenta activa no se pregunta (regla de cuenta única): el form
    // informa dónde cae el dinero y manda el id en un hidden.
    await page.locator('[data-action="nuevo-ingreso"]').first().click();
    await page.waitForSelector('#modal-ingreso[data-open]');
    const form = page.locator('#modal-ingreso-body form');
    await expect(form).toContainText('¿Dónde recibes este dinero?');
    await expect(form.locator('input[type="hidden"][name="cuentaId"]')).toHaveCount(1);

    await form.locator('#ingreso-desc').fill('Salario empresa');
    await form.locator('#ingreso-monto').fill('1850000');
    await form.locator('#ingreso-frec').selectOption('Mensual');
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-ingreso'), { timeout: 5_000 });

    // El recorrido completo: el id elegido llega hasta localStorage y apunta a
    // una cuenta real (es lo que el asistente leerá en MC.13e). Se consulta con
    // reintento porque `save()` es debounced 200ms (ADN #5): leer de una sola
    // vez justo tras cerrar el modal gana la carrera y ve el estado anterior.
    await expect.poll(async () => {
      const st = await leerEstado(page);
      const ing = (st.ingresos ?? []).find(i => i.descripcion === 'Salario empresa');
      if (!ing) return null;
      return {
        version:      st._version,
        cuentaExiste: (st.cuentas ?? []).some(c => c.id === ing.cuentaId),
      };
    }, { timeout: 5_000 }).toEqual({ version: SCHEMA_VERSION_VIGENTE, cuentaExiste: true });
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
    await elegirCategoriaGasto(formGasto);
    await formGasto.locator('[name="monto"]').fill('100000');
    await formGasto.locator('button[type="submit"]').click();

    // Esperar cierre y que el gasto aparezca (título = categoría, TX.9a)
    await expect(page.locator('#lista-gastos')).toContainText(
      'Mercado',
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
    await elegirCategoriaGasto(formGasto);
    await formGasto.locator('[name="monto"]').fill('100000');
    await formGasto.locator('button[type="submit"]').click();
    await expect(page.locator('#lista-gastos')).toContainText(
      'Mercado',
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

    // Único gasto en la lista: no hace falta filtrar por texto (TX.9a: el
    // título ahora es la categoría, no un texto libre distintivo).
    const gastoList = page.locator('#lista-gastos');
    const gastoItem = gastoList.locator('article').first();
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
    await elegirCategoriaGasto(formGasto);
    await formGasto.locator('[name="monto"]').fill('200000');
    await formGasto.locator('button[type="submit"]').click();
    await expect(page.locator('#lista-gastos')).toContainText(
      'Mercado',
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
    const gastoItem = gastoList.locator('article').first();
    const deleteBtn = gastoItem.locator('[data-action="eliminar-gasto"]');
    await deleteBtn.click();

    // TX.9a: sin descripción, el mensaje de confirmación cae a la categoría
    // (no debe mostrar "undefined").
    await expect(page.locator('.confirm__mensaje')).toContainText('Mercado');
    await expect(page.locator('.confirm__mensaje')).not.toContainText('undefined');

    // Confirmar eliminación (modal de confirmación con data-role)
    const confirmBtn = page.locator('[data-role="confirmar"]');
    await confirmBtn.click();

    // El gasto debe desaparecer de la lista (vuelve al estado vacío)
    await expect(page.locator('#lista-gastos .gastos-empty__title')).toHaveText(
      'Sin gastos este mes',
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
// todos los tamaños de pantalla. TX.11 (2026-07-15): el <input type="checkbox">
// real queda visualmente oculto dentro de `.toggle` (mismo componente que
// D.14/Deudas y los chips de otros formularios); se clickea la etiqueta
// visible (`label[for="toggle-tema"]`), que reenvía el click al input anidado.

test.describe('Tema claro/oscuro', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#config');
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });
  });

  test('toggle cambia la clase light-theme en el body', async ({ page }) => {
    const label = page.locator('label[for="toggle-tema"]');

    // Estado inicial: oscuro (body sin light-theme)
    await expect(page.locator('body')).not.toHaveClass(/light-theme/);

    // Toggle → claro
    await label.click();
    await expect(page.locator('body')).toHaveClass(/light-theme/);

    // Doble toggle → oscuro de nuevo
    await label.click();
    await expect(page.locator('body')).not.toHaveClass(/light-theme/);
  });

  test('el tema persiste tras recarga', async ({ page }) => {
    await page.locator('label[for="toggle-tema"]').click();
    await expect(page.locator('body')).toHaveClass(/light-theme/);

    await page.reload();
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });

    // Body debe seguir en light tras recarga
    await expect(page.locator('body')).toHaveClass(/light-theme/);
  });
});

// ── SUITE 8b: Perfil - situación laboral (CFG.1) ─────────────────────────────
// El encabezado del perfil en Ajustes reemplazó el SMMLV muerto por un selector
// de situación laboral. Verifica que se guarda y persiste tras recarga.

test.describe('Perfil - situación laboral', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#config');
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });
  });

  test('el encabezado del perfil ya no muestra el campo SMMLV', async ({ page }) => {
    await expect(page.locator('#config-situacion')).toBeVisible();
    await expect(page.locator('#config-smmlv')).toHaveCount(0);
  });

  test('guarda la situación laboral, confirma en pantalla y la persiste', async ({ page }) => {
    await page.locator('#config-situacion').selectOption('independiente');
    await page.locator('#form-perfil button[type="submit"]').click();

    // B12/R14: la confirmación es visible, no solo para lectores de pantalla, y
    // el panel ya no se re-renderiza entero, así que el campo conserva su valor
    // sin perder foco ni posición de scroll.
    await expect(page.locator('#config-perfil-ok')).toBeVisible();
    await expect(page.locator('#config-situacion')).toHaveValue('independiente');

    // Persistencia real: el dato queda en localStorage (save debounced 200 ms).
    // No se recarga porque el addInitScript de saltearOnboarding resembraría
    // el estado en cada carga; el chequeo del store es la prueba de persistencia.
    await expect.poll(
      async () => (await leerEstado(page))?.perfil?.situacionLaboral,
      { timeout: 5_000 },
    ).toBe('independiente');
  });
});

// ── SUITE 8c: Centro Legal (LEG.1) ───────────────────────────────────────────
// Fetch real de docs/legal/*.md (mismo origen, servido por el server de test)
// + conversión con infra/markdown.js. Cubre: abrir un documento, navegar a
// otro por su enlace interno (data-doc-link) y cerrar el modal.

test.describe('Centro Legal', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#config');
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });
  });

  test('lista los 10 documentos y abre uno con su contenido real', async ({ page }) => {
    const botones = page.locator('[data-action="abrir-legal"]');
    await expect(botones).toHaveCount(10);

    // B9: Términos y Privacidad quedan sueltos; los otros ocho, dentro del
    // desplegable "Más documentos (8)".
    await expect(page.locator('[data-action="abrir-legal"]:visible')).toHaveCount(2);

    await page.locator('[data-action="abrir-legal"][data-doc="politica-de-privacidad"]').click();
    await expect(page.locator('#modal-legal')).toHaveAttribute('data-open', '');
    await expect(page.locator('#modal-legal-title')).toContainText('Política de privacidad');
    // La marca de borrador viaja con el documento, no se queda en la lista.
    await expect(page.locator('#modal-legal-title .chip')).toHaveText('Borrador v0.1');
    await expect(page.locator('#modal-legal-body')).toContainText('localStorage');
  });

  test('un enlace interno (.md) cambia de documento sin cerrar el modal', async ({ page }) => {
    await page.locator('[data-action="abrir-legal"][data-doc="politica-de-privacidad"]').click();
    await expect(page.locator('#modal-legal-body')).toContainText('localStorage');

    // politica-de-privacidad.md enlaza a tratamiento-de-datos-personales.md.
    await page.locator('#modal-legal-body [data-doc-link="tratamiento-de-datos-personales"]').first().click();

    await expect(page.locator('#modal-legal-title')).toContainText('Tratamiento de datos personales');
    await expect(page.locator('#modal-legal')).toHaveAttribute('data-open', '');
  });

  test('cierra el modal con el botón de cerrar', async ({ page }) => {
    // "Aviso legal" vive dentro del desplegable de los ocho documentos (B9).
    await page.locator('section[aria-labelledby="config-legal-title"] summary').click();
    await page.locator('[data-action="abrir-legal"][data-doc="aviso-legal"]').click();
    await expect(page.locator('#modal-legal')).toHaveAttribute('data-open', '');

    await page.locator('#modal-legal [data-action="modal-close"]').click();
    await expect(page.locator('#modal-legal')).not.toHaveAttribute('data-open', '');
  });
});

// ── SUITE 8d: "Tu progreso" en Análisis con niveles (LG.2d, ADR 032) ─────────
// El apartado "Tu progreso" (mudado desde Ajustes, ADR 022 Superada) agrupa
// por familia y muestra el nivel de usuario derivado del conteo. El seed
// trae onboarded=true (logro primer-paso vivo).

test.describe('Tu progreso (niveles)', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#analisis');
    await page.waitForSelector('#sec-analisis.active', { timeout: 10_000 });
  });

  test('muestra el nivel de usuario y la familia agrupada sin listar sus niveles sueltos', async ({ page }) => {
    const panel = page.locator('#panel-analisis-progreso');
    await expect(panel).toContainText('Tu progreso');
    await expect(panel).toContainText('Constancia de registro');
    // La familia colapsa a una tarjeta: el nivel 2 no aparece como item propio.
    await expect(panel).not.toContainText('Hábito registrado');
  });
});

// ── SUITE 8e: Familia "deudas saldadas" en "Tu progreso" (LG.2c, ADR 032) ────

test.describe('Tu progreso - familia deudas (LG.2c)', () => {
  test('saldar una deuda desbloquea "Una deuda menos" agrupado en la familia', async ({ page }) => {
    await sembrar(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [],
      ingresos: [],
      gastos: [],
      compromisos: [
        { id: 'd1', descripcion: 'Tarjeta pagada', tipo: 'deuda-entidad', saldoTotal: 0, cuotaMensual: 50000, diaPago: 5, activo: true },
      ],
      metas: [],
    });
    await page.goto('/#analisis');
    await page.waitForSelector('#sec-analisis.active', { timeout: 10_000 });

    const panel = page.locator('#panel-analisis-progreso');
    await expect(panel).toContainText('Deudas saldadas');
    await expect(panel).toContainText('Nivel 1 de 2');
    await expect(panel).toContainText('Saldaste una deuda por completo.');
    await expect(panel).toContainText('Siguiente:');
    // La familia colapsa a una tarjeta: el nombre del nivel 2 ("Rompedeudas")
    // no aparece suelto, solo el nombre de la familia y los textos de estado.
    await expect(panel).not.toContainText('Rompedeudas');
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

    // Grilla con al menos un día visible. DIS.11 V-6: es una lista de
    // botones, sin role=grid (que exigiría filas y teclado de flechas).
    await expect(page.locator('.cal-grid').first()).toBeVisible();
    await expect(page.locator('[role="grid"]')).toHaveCount(0);
  });

  test('CAL.2: sin compromisos ni ingresos este mes, la leyenda no se dibuja', async ({ page }) => {
    // El beforeEach siembra estado vacío: sin nada que explicar todavía.
    await expect(page.locator('.cal-legend')).toHaveCount(0);
  });

  test('navega mes anterior con botón <', async ({ page }) => {
    const btnPrev = page.locator('[data-action="agenda-prev-mes"]');
    const titulo = page.locator('.cal-card__title');

    const mesBefore = await titulo.textContent();

    await btnPrev.click();

    // El repintado del mes es la señal: `toHaveText` reintenta hasta que el
    // título deja de decir lo mismo. Antes se esperaban 100ms a ciegas, el
    // margen más corto del repo, y el handler no solo repinta (también hace
    // `_devolverFoco()` y `announce()`, DIS.11 V-4).
    await expect(titulo).not.toHaveText(mesBefore);
  });

  test('navega mes siguiente con botón >', async ({ page }) => {
    const btnNext = page.locator('[data-action="agenda-next-mes"]');
    const titulo = page.locator('.cal-card__title');

    const mesBefore = await titulo.textContent();

    await btnNext.click();

    // Misma señal que el test de arriba: el título repintado, no un reloj.
    await expect(titulo).not.toHaveText(mesBefore);
  });
});

// ── SUITE 10b: Agenda - leyenda dinámica (CAL.2) ────────────────────────────
// La leyenda bajo el calendario solo lista los tipos de evento que el usuario
// ya usa este mes (no las 4 categorías fijas de siempre).

test.describe('Agenda - leyenda dinámica con los tres tipos de compromiso', () => {
  test('con un compromiso de cada tipo este mes, la leyenda los muestra a los tres', async ({ page }) => {
    const hoy  = new Date();
    const anio = hoy.getFullYear();
    const mes  = String(hoy.getMonth() + 1).padStart(2, '0');

    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [],
      ingresos:  [],
      gastos:    [],
      compromisos: [
        { id: 'f1', tipo: 'fijo',           descripcion: 'Arriendo', monto: 500000,        frecuencia: 'Mensual', diaPago: 1, activo: true, fechaCreacion: `${anio}-${mes}-01T00:00:00Z` },
        { id: 'd1', tipo: 'deuda-entidad',  descripcion: 'Crédito',  cuotaMensual: 200000,  frecuencia: 'Mensual', diaPago: 1, activo: true, fechaCreacion: `${anio}-${mes}-01T00:00:00Z` },
        { id: 'd2', tipo: 'deuda-personal', descripcion: 'Préstamo',cuotaMensual: 100000,  frecuencia: 'Mensual', diaPago: 1, activo: true, fechaCreacion: `${anio}-${mes}-01T00:00:00Z` },
      ],
      metas: [],
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    await expect(page.locator('.cal-legend')).toBeVisible();
    await expect(page.locator('.cal-legend')).toContainText('Gasto fijo');
    await expect(page.locator('.cal-legend')).toContainText('Deuda entidad');
    await expect(page.locator('.cal-legend')).toContainText('Deuda personal');
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

    await sembrar(page, {
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
    });

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

    await sembrar(page, {
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
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    const total = page.locator('.cal-detail__total');
    await expect(total).toBeVisible({ timeout: 3_000 });
    // Ficha 08 (K1): el día se mide con sus dos lados.
    await expect(total).toContainText('Sale');
    await expect(total).toContainText('$1.050.000'); // 900.000 + 150.000
    await expect(total).toContainText('no entra nada');
  });
});

// ── SUITE 12c: Agenda - hero del mes (CAL.4a, ADR 037 D1/D7) ─────────────────
// El hero al tope de la sección muestra el total a pagar del mes visible y el
// progreso pagado/falta cruzando S.gastos por compromisoId; el ojo comparte
// S.config.ocultarSaldo con el resto de la app y enmascara los tres montos.

test.describe('Agenda - hero del mes (CAL.4a)', () => {
  test('muestra el total del mes y el progreso pagado/falta', async ({ page }) => {
    const hoy  = new Date();
    const anio = hoy.getFullYear();
    const mes  = String(hoy.getMonth() + 1).padStart(2, '0');

    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [],
      ingresos:  [],
      gastos: [{
        id: 'gasto-hero-e2e', compromisoId: 'fijo-hero-e2e',
        descripcion: 'Pago: Arriendo Hero E2E', monto: 900000,
        categoria: 'Gastos fijos', cuentaId: null, fecha: `${anio}-${mes}-05`,
      }],
      compromisos: [
        {
          id: 'fijo-hero-e2e', tipo: 'fijo', descripcion: 'Arriendo Hero E2E',
          monto: 900000, frecuencia: 'Mensual', diaPago: 5,
        },
        {
          id: 'deuda-hero-e2e', tipo: 'deuda-entidad', descripcion: 'Tarjeta Hero E2E',
          saldoTotal: 3000000, cuotaMensual: 150000, tasa: 24, tasaUnidad: 'EA',
          frecuencia: 'Mensual', diaPago: 20,
        },
      ],
      metas: [],
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    const hero = page.locator('.hero-agenda');
    await expect(hero).toBeVisible();
    // Ficha 08 (K1): el hero pasa de medir el total a pagar y su progreso a
    // medir el mes entero. Sin ingresos sembrados, lo que "queda" es negativo
    // y se dice como lo que falta.
    await expect(hero.locator('.hero-agenda__label')).toContainText('Te falta en');
    await expect(hero.locator('.hero-agenda__valor')).toHaveText('$1.050.000');
    await expect(hero.locator('.hero-agenda__flujo-item').nth(1)).toHaveText('Sale $1.050.000');
    await expect(hero.locator('.hero-agenda__barra')).toHaveCount(0);
  });

  test('el ojo enmascara los montos del hero y persiste el flag compartido', async ({ page }) => {
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [],
      ingresos:  [],
      gastos:    [],
      compromisos: [{
        id: 'fijo-ojo-e2e', tipo: 'fijo', descripcion: 'Arriendo Ojo E2E',
        monto: 900000, frecuencia: 'Mensual', diaPago: 5,
      }],
      metas: [],
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    await page.locator('[data-action="agenda-saldo-visibilidad"]').click();

    const hero = page.locator('.hero-agenda');
    await expect(hero.locator('.hero-agenda__valor')).toHaveText('$••••••');
    await expect(hero.locator('.hero-agenda__flujo-item').nth(1)).toHaveText('Sale ••••');
    await expect(hero.locator('[data-action="agenda-saldo-visibilidad"]'))
      .toHaveAttribute('aria-pressed', 'true');

    // El flag es el mismo de toda la app (IN.2): queda persistido en el estado.
    // save() es debounced 200ms (ADN 5), así que se espera con poll.
    await expect.poll(
      async () => (await leerEstado(page)).config?.ocultarSaldo,
      { timeout: 3_000 },
    ).toBe(true);
  });

  // DIS.11 C8/V-8: la variante de guía queda para el mes que tiene algo (un
  // ingreso) pero nada que pagar. Con el mes del todo vacío el hero
  // desaparece: el banner de propósito, el hero y la card de vacío decían lo
  // mismo, con dos primarios a la vez.
  test('un mes solo con ingresos muestra la variante de guía sin ojo', async ({ page }) => {
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [],
      ingresos:  [{
        id: 'ing-guia-e2e', descripcion: 'Salario Guía E2E', monto: 2000000,
        frecuencia: 'Mensual', diaPago: 15, activo: true,
      }],
      gastos:    [],
      compromisos: [],
      metas:     [],
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    const hero = page.locator('.hero-agenda');
    await expect(hero).toBeVisible();
    // Ficha 08: el mes tiene dinero entrando, así que tiene cifra. Antes decía
    // "Sin pagos programados" porque el hero solo sabía mirar un lado.
    await expect(hero.locator('.hero-agenda__label')).toContainText('Te queda en');
    await expect(hero.locator('.hero-agenda__valor')).toHaveText('$2.000.000');
    await expect(hero.locator('.hero-agenda__flujo-item').first()).toHaveText('Entra $2.000.000');
    await expect(hero.locator('.hero-agenda__titulo')).toHaveCount(0);
  });

  test('DIS.11 C8: con el mes vacío el único mensaje es la card, con un solo primario', async ({ page }) => {
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [],
      ingresos:  [],
      gastos:    [],
      compromisos: [],
      metas:     [],
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    await expect(page.locator('.hero-agenda')).toHaveCount(0);
    await expect(page.locator('.cal-empty')).toBeVisible();

    // El CTA de la card baja a secundario: fondo transparente, no el verde
    // del primario del encabezado.
    const fondo = await page.evaluate(
      () => window.getComputedStyle(document.querySelector('.cal-empty .btn-primary')).backgroundColor,
    );
    expect(fondo).toBe('rgba(0, 0, 0, 0)');
  });
});

// ── SUITE 12e: Agenda - detalle del día accionable (CAL.4c, ADR 037 D4/D5) ───
// Con todos los compromisos del día cubiertos, el total del detalle pasa a
// "Pagado este día"; los CTA llevan la identidad de su tipo (Marcar pagado
// índigo, Abonar frambuesa) en vez del verde genérico.

test.describe('Agenda - detalle del día accionable (CAL.4c)', () => {
  test('día pagado muestra "Pagado este día" y el CTA Abonar lleva la clase de su tipo', async ({ page }) => {
    const hoy  = new Date();
    const anio = hoy.getFullYear();
    const mes  = String(hoy.getMonth() + 1).padStart(2, '0');

    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [],
      ingresos:  [],
      gastos: [{
        id: 'gasto-cal4c-e2e', compromisoId: 'fijo-cal4c-e2e',
        descripcion: 'Pago: Arriendo CAL4c', monto: 900000,
        categoria: 'Gastos fijos', cuentaId: null, fecha: `${anio}-${mes}-15`,
      }],
      compromisos: [
        {
          id: 'fijo-cal4c-e2e', tipo: 'fijo', descripcion: 'Arriendo CAL4c',
          monto: 900000, frecuencia: 'Mensual', diaPago: 15,
        },
        {
          id: 'deuda-cal4c-e2e', tipo: 'deuda-entidad', descripcion: 'Tarjeta CAL4c',
          saldoTotal: 3000000, cuotaMensual: 150000, tasa: 24, tasaUnidad: 'EA',
          frecuencia: 'Mensual', diaPago: 20,
        },
      ],
      metas: [],
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    // Día 15: el fijo está pagado → total en verde + pill con ícono, sin CTA.
    await page.locator('[data-action="agenda-mostrar-dia"][data-day="15"]').click();
    const total = page.locator('.cal-detail__total');
    await expect(total).toContainText('Pagado este día');
    await expect(page.locator('.cal-detail__badge-abono')).toContainText('Ya pagaste este mes');
    await expect(page.locator('[data-action="agenda-marcar-pagado-fijo"]')).toHaveCount(0);

    // Día 20: la deuda está pendiente y su fila ya no ofrece abonar (ficha 08,
    // K3): el detalle es lectura y su única salida es la lente que sí opera.
    await page.locator('[data-action="agenda-mostrar-dia"][data-day="20"]').click();
    await expect(page.locator('[data-action="abrir-abono"]')).toHaveCount(0);
    const salida = page.locator('[data-action="agenda-ver-en-por-pagar"]');
    await expect(salida).toBeVisible();
    await expect(salida).toHaveText('Ver en Por pagar');
    await expect(page.locator('.cal-detail__total')).toContainText('Sale');
  });
});

// ── SUITE 12f: Agenda - el pago se registra en el mes visible (BUG-015) ──────
// Antes, "Marcar pagado" en cualquier mes navegado creaba un gasto fechado HOY:
// el badge del mes visible no viraba y el pago quedaba en el mes equivocado.
// Ahora el pago pertenece al mes visible; un mes futuro no se puede pagar.

test.describe('Agenda - marcar pagado usa el mes visible (BUG-015)', () => {
  const ESTADO_BUG015 = {
    version:   1,
    perfil:    { nombre: 'TestUser', smmlv: 1750905 },
    onboarded: true,
    cuentas:   [{ id: 'c-bug015', nombre: 'Bancolombia', tipo: 'ahorros', saldo: 5000000, activa: true }],
    ingresos:  [],
    gastos:    [],
    compromisos: [{
      id: 'fijo-bug015', tipo: 'fijo', descripcion: 'Arriendo BUG015',
      monto: 900000, frecuencia: 'Mensual', diaPago: 15, activo: true, categoria: null,
    }],
    metas: [],
  };

  // Ficha 08: el botón se mudó a la lista de "Por pagar", y el mes lo pone el
  // reloj del bloque. La garantía es la misma; cambia la superficie que la da.
  test('marcar pagado en el mes anterior fecha el gasto en ESE mes, no hoy', async ({ page }) => {
    await sembrar(page, ESTADO_BUG015);
    // El encabezado del bloque, con su selector de mes, solo existe bajo
    // 1024px: en escritorio cada lente conserva su propio hero.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#compromisos');
    await page.waitForSelector('#lista-compromisos', { timeout: 10_000 });

    const hoy       = new Date();
    const anterior  = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const prefijoAnt = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, '0')}`;

    await page.locator('#sec-compromisos [data-action="bloque-mes-prev"]').click();

    const pagar = page.locator('[data-action="agenda-marcar-pagado-fijo"]');
    await expect(pagar).toBeVisible();
    await expect(pagar).toHaveAttribute('data-mes', prefijoAnt);

    await pagar.click();

    // El gasto queda fechado en el mes anterior (save() es debounced 200ms).
    await expect.poll(async () => {
      const st = await leerEstado(page);
      const g = (st.gastos || []).find(x => x.compromisoId === 'fijo-bug015');
      return g ? g.fecha.slice(0, 7) : null;
    }, { timeout: 5_000 }).toBe(prefijoAnt);

    // El botón desaparece: no invita a re-pagar el mes que ya se pagó.
    await expect(page.locator('[data-action="agenda-marcar-pagado-fijo"]')).toHaveCount(0);
  });

  test('el mes siguiente no se puede ni visitar: el reloj se corta en el actual', async ({ page }) => {
    await sembrar(page, ESTADO_BUG015);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#compromisos');
    await page.waitForSelector('#lista-compromisos', { timeout: 10_000 });

    // Antes el guardia vivía en el botón de pagar; ahora vive antes, en la
    // navegación: no se llega a un mes que aún no ha vencido.
    await expect(page.locator('#sec-compromisos [data-action="bloque-mes-next"]')).toBeDisabled();
    await expect(page.locator('[data-action="agenda-marcar-pagado-fijo"]')).toBeVisible();
  });

  test('el detalle del día del Calendario ya no ofrece pagar: solo su salida', async ({ page }) => {
    await sembrar(page, ESTADO_BUG015);
    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    await page.locator('[data-action="agenda-mostrar-dia"][data-day="15"]').click();
    await expect(page.locator('[data-action="agenda-marcar-pagado-fijo"]')).toHaveCount(0);
    await expect(page.locator('[data-action="agenda-editar-fijo"]')).toHaveCount(0);
    await expect(page.locator('[data-action="agenda-ver-en-por-pagar"]')).toBeVisible();
  });
});

// ── SUITE 12g: Me deben conectado a cuentas y patrimonio (PE.7) ──────────────
// Prestar saca el dinero de la cuenta elegida y cobrar lo devuelve. El capital
// pendiente entra al patrimonio como "Por cobrar", de modo que prestar NO mueve
// el patrimonio neto: convierte efectivo en un derecho de cobro.

test.describe('Me deben conectado a cuentas y patrimonio (PE.7)', () => {
  const saldoDe = async (page, id) => {
    const st = await leerEstado(page);
    return st.cuentas.find(c => c.id === id).saldo;
  };

  test.beforeEach(async ({ page }) => {
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [{ id: 'c-pe7', nombre: 'Bancolombia', tipo: 'ahorros', saldo: 1000000, activa: true }],
      ingresos: [], gastos: [], compromisos: [], metas: [],
      apartados: [], inversiones: [], personales: [], transferencias: [],
    });
    await page.goto('/#personales');
    await page.waitForSelector('#sec-personales', { timeout: 10_000 });
  });

  test('prestar descuenta la cuenta elegida', async ({ page }) => {
    await page.locator('#topbar-primario[data-action="nuevo-personal"]:visible, #sec-personales .section__header [data-action="nuevo-personal"]:visible').click();
    await page.locator('#pers-persona').fill('Tía Marta');
    await page.locator('#pers-monto').fill('400000');

    // El selector de cuenta aparece y viene preseleccionado (una sola cuenta).
    await expect(page.locator('#form-personal input[name="cuentaId"]')).toBeChecked();
    await page.locator('#form-personal button[type="submit"]').click();

    await expect.poll(() => saldoDe(page, 'c-pe7'), { timeout: 5_000 }).toBe(600_000);
  });

  test('cobrar devuelve el dinero a la cuenta', async ({ page }) => {
    await page.locator('#topbar-primario[data-action="nuevo-personal"]:visible, #sec-personales .section__header [data-action="nuevo-personal"]:visible').click();
    await page.locator('#pers-persona').fill('Tía Marta');
    await page.locator('#pers-monto').fill('400000');
    await page.locator('#form-personal button[type="submit"]').click();
    await expect.poll(() => saldoDe(page, 'c-pe7'), { timeout: 5_000 }).toBe(600_000);

    // Cobra la mitad: el saldo sube esa mitad, no el total del préstamo.
    await page.locator('[data-action="pagar-personal"]').first().click();
    await page.locator('#pago-monto').fill('150000');
    await page.locator('#form-pago-personal button[type="submit"]').click();

    await expect.poll(() => saldoDe(page, 'c-pe7'), { timeout: 5_000 }).toBe(750_000);
  });

  test('prestar no mueve el patrimonio neto: la cuenta baja y "Por cobrar" sube igual', async ({ page }) => {
    const netoDelPanel = async () => {
      await page.goto('/#analisis');
      await page.waitForSelector('.patri-card', { timeout: 10_000 });
      return (await page.locator('.patri-card__valor').first().textContent())?.trim();
    };

    const netoAntes = await netoDelPanel();

    await page.goto('/#personales');
    await page.locator('#topbar-primario[data-action="nuevo-personal"]:visible, #sec-personales .section__header [data-action="nuevo-personal"]:visible').click();
    await page.locator('#pers-persona').fill('Tía Marta');
    await page.locator('#pers-monto').fill('400000');
    await page.locator('#form-personal button[type="submit"]').click();
    await expect.poll(() => saldoDe(page, 'c-pe7'), { timeout: 5_000 }).toBe(600_000);

    expect(await netoDelPanel()).toBe(netoAntes);
    // Y el bucket "Por cobrar" aparece en la composición de activos.
    await expect(page.locator('.patri-card__seg--porcobrar')).toHaveCount(1);
  });

  test('sin cuenta vinculada el préstamo se registra igual y no toca ningún saldo', async ({ page }) => {
    // Se desmarca el radio para simular "no quiero vincular cuenta".
    await page.locator('#topbar-primario[data-action="nuevo-personal"]:visible, #sec-personales .section__header [data-action="nuevo-personal"]:visible').click();
    await page.locator('#pers-persona').fill('Vecino');
    await page.locator('#pers-monto').fill('200000');
    await page.evaluate(() => {
      document.querySelectorAll('#form-personal input[name="cuentaId"]').forEach(r => { r.checked = false; });
    });
    await page.locator('#form-personal button[type="submit"]').click();

    await expect.poll(async () => {
      const st = await leerEstado(page);
      return st.personales.length;
    }, { timeout: 5_000 }).toBe(1);
    expect(await saldoDe(page, 'c-pe7')).toBe(1_000_000);
  });
});

// ── SUITE 12h: Movimientos - ledger accionable (MOV.1) ───────────────────────
// La fila del ledger delega en el dominio dueño: borrar desde acá aplica las
// MISMAS reversas que borrar desde la sección de origen (devolver el monto a
// la cuenta), y el ledger se repinta solo por el `state:change` de la fuente.

test.describe('Movimientos - ledger accionable (MOV.1)', () => {
  test.beforeEach(async ({ page }) => {
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [{ id: 'c-mov1', nombre: 'Bancolombia', tipo: 'ahorros', saldo: 500000, activa: true }],
      gastos: [{
        id: 'g-mov1', descripcion: 'Mercado MOV1', monto: 80000,
        categoria: 'Mercado', fecha: '2026-07-04', cuentaId: 'c-mov1',
      }],
      ingresosPuntuales: [{
        id: 'ip-mov1', descripcion: 'Venta bici', monto: 300000,
        categoria: 'Otros', fecha: '2026-07-03', cuentaId: 'c-mov1',
      }],
      ingresos: [], compromisos: [], metas: [],
      apartados: [], inversiones: [], personales: [], transferencias: [],
    });
    await page.goto('/#movimientos');
    await page.waitForSelector('#lista-movimientos .list-item', { timeout: 10_000 });
  });

  test('la fila de un gasto ofrece editar y eliminar', async ({ page }) => {
    const fila = page.locator('#lista-movimientos .list-item[data-id="g-mov1"]');
    await expect(fila.locator('[data-action="editar-gasto"]')).toHaveCount(1);
    await expect(fila.locator('[data-action="eliminar-gasto"]')).toHaveCount(1);
  });

  test('borrar desde el ledger devuelve el monto a la cuenta y quita la fila', async ({ page }) => {
    await page.locator('#lista-movimientos [data-action="eliminar-gasto"]').click();
    await page.locator('[data-role="confirmar"]').click();

    // La reversa la aplica el handler de Gastos, no el ledger: 500.000 + 80.000.
    await expect.poll(async () => {
      const st = await leerEstado(page);
      return st.cuentas.find(c => c.id === 'c-mov1').saldo;
    }, { timeout: 5_000 }).toBe(580_000);

    // Y el ledger se repinta solo (state:change de 'gastos').
    await expect(page.locator('#lista-movimientos .list-item[data-id="g-mov1"]')).toHaveCount(0);
  });

  test('editar desde el ledger abre el formulario de Gastos con el dato cargado', async ({ page }) => {
    await page.locator('#lista-movimientos [data-action="editar-gasto"]').click();
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(1);
    await expect(page.locator('#form-gasto [name="monto"]')).toHaveValue('80000');
  });

  test('borrar un ingreso puntual desde el ledger revierte su crédito', async ({ page }) => {
    // Otra fuente, otra reversa: un ingreso puntual acreditó la cuenta al
    // registrarse, así que borrarlo desde el ledger se la vuelve a quitar.
    await page.locator('#lista-movimientos .list-item[data-id="ip-mov1"] [data-action="eliminar-ingreso-puntual"]').click();
    await page.locator('[data-role="confirmar"]').click();

    await expect.poll(async () => {
      const st = await leerEstado(page);
      return st.cuentas.find(c => c.id === 'c-mov1').saldo;
    }, { timeout: 5_000 }).toBe(200_000);
    await expect(page.locator('#lista-movimientos .list-item[data-id="ip-mov1"]')).toHaveCount(0);
  });
});

// ── SUITE 12i: Movimientos - búsqueda y filtros (MOV.2) ──────────────────────
// Escribir en el buscador y clickear un chip son interacciones cableadas a
// mano en index.js (no data-action de clic los dos), que los unit tests de
// view.js no alcanzan: esto prueba el wiring real en un navegador.

test.describe('Movimientos - búsqueda y filtros (MOV.2)', () => {
  test.beforeEach(async ({ page }) => {
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [{ id: 'c-mov2', nombre: 'Bancolombia', tipo: 'ahorros', saldo: 1000000, activa: true }],
      gastos: [
        { id: 'g-mov2a', descripcion: 'Mercado', monto: 80000, categoria: 'Mercado', fecha: '2026-07-04', cuentaId: 'c-mov2' },
        { id: 'g-mov2b', descripcion: 'Abono: Préstamo moto', monto: 150000, categoria: 'Deudas', fecha: '2026-07-15', cuentaId: 'c-mov2' },
      ],
      ingresos: [], ingresosPuntuales: [], compromisos: [], metas: [],
      apartados: [], inversiones: [], personales: [], transferencias: [],
    });
    await page.goto('/#movimientos');
    await page.waitForSelector('#lista-movimientos .list-item', { timeout: 10_000 });
  });

  test('escribir en el buscador filtra la lista en vivo, sin perder el foco', async ({ page }) => {
    const buscador = page.locator('#movimientos-buscar');
    await buscador.fill('mercado');

    await expect(page.locator('#lista-movimientos .list-item')).toHaveCount(1);
    await expect(page.locator('#lista-movimientos .list-item[data-id="g-mov2a"]')).toHaveCount(1);
    // El input sigue siendo el mismo nodo enfocado: renderFiltrosMovimientos()
    // no se repintó al escribir (si lo hiciera, perdería foco a mitad de palabra).
    await expect(buscador).toBeFocused();
  });

  test('un filtro de solo texto (sin tocar el dominio) también muestra "Limpiar filtros"', async ({ page }) => {
    // Bug real detectado al verificar en la app: el handler de texto solo
    // repinta la lista (para no perder el foco), así que sin un slot dedicado
    // para el botón, "Limpiar filtros" se quedaba sin aparecer hasta que algo
    // más forzara un repintado completo de la barra (ej. cambiar de dominio).
    await page.locator('#movimientos-buscar').fill('mercado');
    await expect(page.locator('[data-action="movimientos-limpiar-filtros"]')).toHaveCount(1);
  });

  test('clickear el chip de un dominio aísla ese grupo y lo marca activo', async ({ page }) => {
    await page.locator('[data-action="movimientos-filtrar-dominio"][data-dominio="compromisos"]').click();

    await expect(page.locator('#lista-movimientos .list-item')).toHaveCount(1);
    await expect(page.locator('#lista-movimientos .list-item[data-id="g-mov2b"]')).toHaveCount(1);
    await expect(page.locator('[data-action="movimientos-filtrar-dominio"][data-dominio="compromisos"]')).toHaveClass(/chip--active/);
  });

  test('volver a "Todos" quita el filtro de dominio', async ({ page }) => {
    await page.locator('[data-action="movimientos-filtrar-dominio"][data-dominio="compromisos"]').click();
    await expect(page.locator('#lista-movimientos .list-item')).toHaveCount(1);

    await page.locator('[data-action="movimientos-filtrar-dominio"][data-dominio=""]').click();
    await expect(page.locator('#lista-movimientos .list-item')).toHaveCount(2);
  });

  test('el rango de fechas filtra la lista', async ({ page }) => {
    await page.fill('#movimientos-desde', '2026-07-10');
    await expect(page.locator('#lista-movimientos .list-item')).toHaveCount(1);
    await expect(page.locator('#lista-movimientos .list-item[data-id="g-mov2b"]')).toHaveCount(1);
  });

  test('sin resultados muestra el empty de "sin resultados" con boton para limpiar, y limpiar restaura todo', async ({ page }) => {
    await page.locator('#movimientos-buscar').fill('esto no existe');

    await expect(page.locator('#lista-movimientos .empty-state__title')).toHaveText('Nada coincide con esos filtros');
    await page.locator('#lista-movimientos [data-action="movimientos-limpiar-filtros"]').click();

    await expect(page.locator('#lista-movimientos .list-item')).toHaveCount(2);
    await expect(page.locator('#movimientos-buscar')).toHaveValue('');
  });
});

// ── SUITE 12d: Agenda - empty state del mes (CAL.4b, ADR 037 D6) ─────────────
// Un mes sin ningún evento muestra la card de guía bajo el calendario. Desde la
// ficha 05 (ADR 069) su salida es un enlace a "Por pagar", que es la sección
// dueña del alta: el Calendario ya no crea nada.

test.describe('Agenda - empty state del mes (CAL.4b)', () => {
  test('mes vacío muestra "está despejado" y su salida lleva a Por pagar', async ({ page }) => {
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [],
      ingresos:  [],
      gastos:    [],
      compromisos: [],
      metas:     [],
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    const empty = page.locator('.cal-empty');
    await expect(empty).toBeVisible();
    await expect(empty.locator('.cal-empty__title')).toContainText('está despejado');
    await expect(empty.locator('[data-action="nuevo-gasto-fijo"]')).toHaveCount(0);

    await empty.locator('a[href="#compromisos"]').click();
    await expect(page.locator('#sec-compromisos')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('#title-compromisos')).toHaveText('Por pagar');
  });
});

// ── SUITE 12b: Agenda - CAL.3 selección automática del día actual ────────────
// Al navegar HACIA Calendario desde otra sección, si hoy tiene compromisos,
// el detalle se auto-abre sin que el usuario haga click. El fixture usa el
// día real de hoy (calculado en el navegador) para que el test sea válido
// sin importar qué día se ejecute. Cubre también que una carga directa en
// #agenda (page.goto) NO auto-abre nada: el mecanismo solo arma con
// hashchange, a propósito (ver agenda/index.js).

test.describe('Agenda - CAL.3 selección automática del día actual', () => {
  test('navegar desde otra sección auto-abre el detalle de hoy si hay compromisos', async ({ page }) => {
    const diaPago = new Date().getDate();
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [],
      ingresos:  [],
      gastos:    [],
      compromisos: [
        {
          id: 'cal3-e2e', tipo: 'fijo', descripcion: 'Suscripción CAL.3 E2E',
          monto: 45000, frecuencia: 'Mensual', diaPago,
        },
      ],
      metas: [],
    });

    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    await page.click('.nav-item[href="#agenda"]');
    await page.waitForSelector('#sec-agenda.active', { timeout: 10_000 });

    const detalle = page.locator('.cal-detail');
    await expect(detalle).toBeVisible({ timeout: 3_000 });
    await expect(detalle.locator('.cal-detail__item')).toContainText('Suscripción CAL.3 E2E');
  });

  test('cargar la app directo en #agenda no auto-abre el detalle (solo aplica a navegar hacia la sección)', async ({ page }) => {
    const diaPago = new Date().getDate();
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [],
      ingresos:  [],
      gastos:    [],
      compromisos: [
        {
          id: 'cal3-boot-e2e', tipo: 'fijo', descripcion: 'Suscripción CAL.3 boot',
          monto: 45000, frecuencia: 'Mensual', diaPago,
        },
      ],
      metas: [],
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    await expect(page.locator('.cal-detail')).toHaveCount(0);
  });

  test('seleccionar un día sin compromisos muestra un mensaje explícito', async ({ page }) => {
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [],
      ingresos:  [],
      gastos:    [],
      compromisos: [],
      metas:     [],
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    // Cualquier día del grid es clickeable ahora, tenga o no eventos.
    await page.locator('[data-action="agenda-mostrar-dia"]').first().click();

    const detalle = page.locator('.cal-detail');
    await expect(detalle).toBeVisible({ timeout: 3_000 });
    await expect(detalle.locator('.cal-detail__subtitle')).toHaveText('Sin compromisos ni ingresos este día');
  });
});

// ── Agenda - leyenda al pie de la tarjeta (DIS.11 C6, revisa AG.6) ──────────
// AG.6 la puso entre el calendario y el detalle, y sticky. Medido a 390px eso
// costaba 65,7px de chrome permanente que arrancaban en 834,1px (fuera del
// primer pantallazo) y se pegaba justo mientras el usuario recorría el día,
// explicando una grilla que ya no estaba en pantalla. Ahora es el pie de la
// tarjeta que explica y el panel del día ocupa ese espacio.

test.describe('Agenda - leyenda al pie de la tarjeta', () => {
  test('la leyenda vive dentro de la tarjeta y el detalle nace pegado a la grilla', async ({ page }) => {
    const diaPago = 15;

    const compromisos = [];
    for (let i = 1; i <= 10; i++) {
      compromisos.push({
        id: `leyenda-e2e-${i}`, tipo: 'fijo', descripcion: `Fijo leyenda ${i}`,
        monto: 50000, frecuencia: 'Mensual', diaPago,
      });
    }
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [],
      ingresos:  [],
      gastos:    [],
      compromisos,
      metas:     [],
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    await expect(page.locator('.cal-card .cal-legend')).toHaveCount(1);
    const posicion = await page.evaluate(
      () => window.getComputedStyle(document.querySelector('.cal-legend')).position,
    );
    expect(posicion).toBe('static');

    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();
    await expect(page.locator('.cal-detail')).toBeVisible({ timeout: 3_000 });

    // El panel del día es el hermano inmediato de la tarjeta del calendario.
    const esHermanoInmediato = await page.evaluate(() => {
      const card = document.querySelector('#panel-agenda .cal-card');
      return card?.nextElementSibling?.classList.contains('cal-detail') === true;
    });
    expect(esHermanoInmediato).toBe(true);
  });

  test('DIS.11 C1/V-1: abrir un día lleva el foco al título del panel', async ({ page }) => {
    const diaPago = 15;

    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [],
      ingresos:  [],
      gastos:    [],
      compromisos: [{
        id: 'foco-e2e-1', tipo: 'fijo', descripcion: 'Arriendo foco',
        monto: 900000, frecuencia: 'Mensual', diaPago,
      }],
      metas:     [],
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    const celda = page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).first();
    await celda.click();
    await expect(page.locator('.cal-detail')).toBeVisible({ timeout: 3_000 });

    // Sin esto el panel se pinta fuera de la pantalla y nada avisa que pasó algo.
    await expect(page.locator('.cal-detail__title')).toBeFocused();

    // Al cerrar, el foco vuelve a la celda que lo abrió.
    await page.locator('.cal-detail__close').click();
    await expect(page.locator('.cal-detail')).toHaveCount(0);
    await expect(celda).toBeFocused();
  });

  test('DIS.11 V-4: navegar de mes conserva el foco en la flecha y anuncia el mes', async ({ page }) => {
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [],
      ingresos:  [],
      gastos:    [],
      compromisos: [],
      metas:     [],
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    await page.locator('[data-action="agenda-next-mes"]').click();
    // El innerHTML se reemplaza entero: sin devolver el foco caería al body.
    await expect(page.locator('[data-action="agenda-next-mes"]')).toBeFocused();

    const mes = await page.locator('.cal-card__title').textContent();
    await expect(page.locator('#fk-live-polite')).toContainText(mes.trim(), { timeout: 3_000 });
  });
});

// ── Agenda - marca de color por tipo en el detalle (AG.7, IV.2c) ────────────
// Cada registro del detalle del día lleva un fondo teñido de color según su
// tipo (mismos --fk-dom-* que los dots del calendario, AG.6), para distinguir
// de un vistazo qué es qué en fechas cargadas. Reemplaza la franja lateral
// (IV.2c, ADR 031: "la línea comunica poco").

test.describe('Agenda - marca de color por tipo', () => {
  test('un fijo y una deuda entidad el mismo día llevan fondos de color distintos', async ({ page }) => {
    const diaPago = 15;

    await sembrar(page, {
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
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    const itemFijo  = page.locator('.cal-detail__item--fijo');
    const itemDeuda = page.locator('.cal-detail__item--deuda-entidad');
    await expect(itemFijo).toBeVisible({ timeout: 3_000 });
    await expect(itemDeuda).toBeVisible({ timeout: 3_000 });

    const colorFijo  = await itemFijo.evaluate(el => window.getComputedStyle(el).backgroundColor);
    const colorDeuda = await itemDeuda.evaluate(el => window.getComputedStyle(el).backgroundColor);
    // sin modificador de tipo, .cal-detail__item queda en --fk-bg-elevated
    // puro (sin tinte): compararlo (mismo elemento base, sin clase --tipo)
    // confirma que fijo/deuda SÍ están teñidos, no solo que son distintos
    // entre sí.
    const colorSinTenir = await page.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'cal-detail__item';
      document.body.appendChild(el);
      const c = window.getComputedStyle(el).backgroundColor;
      el.remove();
      return c;
    });
    expect(colorFijo).not.toBe(colorDeuda);
    expect(colorFijo).not.toBe(colorSinTenir);
    expect(colorDeuda).not.toBe(colorSinTenir);
  });
});

// ── Agenda - teja de categoría como ícono principal (AG.2/ID.3) ──────────────
// Un gasto fijo con categoría muestra la teja de esa categoría como ícono
// principal (izquierda), no el genérico por tipo; sin categoría, cae al
// ícono genérico.

test.describe('Agenda - teja de categoría como ícono principal', () => {
  test('con categoría, el ícono principal es la teja con el glifo del sprite', async ({ page }) => {
    const diaPago = 15;

    await sembrar(page, {
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
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    const iconoEl = page.locator('.cal-detail__icon');
    await expect(iconoEl).toBeVisible({ timeout: 3_000 });
    await expect(iconoEl.locator('.cat-teja')).toHaveCount(1);
    await expect(iconoEl.locator('use[href="#c-internet"]')).toHaveCount(1);
  });

  test('sin categoría, el ícono principal es el genérico del tipo (con <svg>)', async ({ page }) => {
    const diaPago = 15;

    await sembrar(page, {
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
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    const iconoEl = page.locator('.cal-detail__icon');
    await expect(iconoEl).toBeVisible({ timeout: 3_000 });
    await expect(iconoEl.locator('svg')).toHaveCount(1);
  });
});

// ── Por pagar - nombre automático según la categoría (AG.4) ──────────────────
// Con una categoría predefinida, el nombre del gasto fijo pasa a ser la
// categoría y el campo de texto se convierte en una nota opcional; con
// "Otro" o sin categoría, el campo sigue siendo el nombre obligatorio.
// El formulario se abre desde "Por pagar" desde la ficha 05 (ADR 069).

test.describe('Por pagar - nombre automático según la categoría del fijo', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#compromisos');
    await page.waitForSelector('#lista-compromisos', { timeout: 10_000 });
    await abrirFormGastoFijo(page);
  });

  test('al elegir una categoría predefinida, el campo pasa a "Nota (opcional)" y deja de ser obligatorio', async ({ page }) => {
    const form = page.locator('#form-gasto-fijo');
    const label = page.locator('#gfijo-descripcion-label');
    const input = page.locator('#gfijo-descripcion');
    await expect(label).toHaveText('Descripción');

    await elegirChip(form, 'Mercado');

    await expect(label).toHaveText('Nota (opcional)');
    await expect(input).not.toHaveAttribute('aria-required', 'true');
  });

  test('al volver a "Otro", el campo vuelve a ser "Descripción" obligatoria', async ({ page }) => {
    const form = page.locator('#form-gasto-fijo');
    const label = page.locator('#gfijo-descripcion-label');
    const input = page.locator('#gfijo-descripcion');

    await elegirChip(form, 'Mercado');
    await expect(label).toHaveText('Nota (opcional)');

    await elegirChip(form, 'Otro');
    await expect(label).toHaveText('Descripción');
    await expect(input).toHaveAttribute('aria-required', 'true');
  });

  test('guardar con categoría predefinida y sin texto: el registro usa la categoría como nombre', async ({ page }) => {
    const form = page.locator('#form-gasto-fijo');
    await elegirChip(form, 'Mercado');
    await page.fill('#gfijo-monto', '150000');
    await page.fill('#gfijo-dia', '10');
    await page.click('#form-gasto-fijo button[type="submit"]');

    await expect(page.locator('#modal-gasto-fijo')).not.toHaveAttribute('data-open');
    // Ficha 05: se crea en "Por pagar" y aparece en el Calendario, que sigue
    // siendo la vista de fechas del mismo dato.
    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
    await page.click(`[data-action="agenda-mostrar-dia"][data-day="10"]`);

    const item = page.locator('.cal-detail__item').first();
    await expect(item.locator('.cal-detail__name')).toHaveText('Mercado');
  });

  test('guardar con categoría predefinida y una nota: la nota queda en el subtítulo, el nombre es la categoría', async ({ page }) => {
    const form = page.locator('#form-gasto-fijo');
    await elegirChip(form, 'Mercado');
    await page.fill('#gfijo-descripcion', 'Éxito de la esquina');
    await page.fill('#gfijo-monto', '150000');
    await page.fill('#gfijo-dia', '11');
    await page.click('#form-gasto-fijo button[type="submit"]');

    await expect(page.locator('#modal-gasto-fijo')).not.toHaveAttribute('data-open');
    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
    await page.click(`[data-action="agenda-mostrar-dia"][data-day="11"]`);

    const item = page.locator('.cal-detail__item').first();
    await expect(item.locator('.cal-detail__name')).toHaveText('Mercado');
    await expect(item.locator('.cal-detail__sub')).toContainText('Éxito de la esquina');
  });

  test('FORM.1c: el banner informativo refleja la frecuencia y el día elegidos', async ({ page }) => {
    const form = page.locator('#form-gasto-fijo');
    const banner = page.locator('#gfijo-banner');
    await expect(banner).toHaveText('Aparecerá cada mes en tu calendario el día que elijas.');

    await page.fill('#gfijo-dia', '20');
    await expect(banner).toHaveText('Aparecerá cada mes en tu calendario el día 20.');

    await form.locator('#gfijo-frecuencia').selectOption('Quincenal');
    await expect(banner).toHaveText('Aparecerá cada quincena en tu calendario el día 20.');
  });
});

// ── Por pagar - picker de ícono del fijo para "Otro" (CAT.2f) ───────────────

test.describe('Por pagar - picker de ícono del fijo para "Otro" (CAT.2f)', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#compromisos');
    await page.waitForSelector('#lista-compromisos', { timeout: 10_000 });
    await abrirFormGastoFijo(page);
  });

  test('elegir "Otro" revela el picker de ícono; una categoría predefinida lo oculta de nuevo', async ({ page }) => {
    const form = page.locator('#form-gasto-fijo');
    const grupoIcono = page.locator('#form-group-gfijo-icono');
    await expect(grupoIcono).toBeHidden();

    await elegirChip(form, 'Otro');
    await expect(grupoIcono).toBeVisible();

    await elegirChip(form, 'Mercado');
    await expect(grupoIcono).toBeHidden();
  });

  test('crear un gasto fijo con categoría "Otro" y un ícono elegido queda en el detalle del día', async ({ page }) => {
    const form = page.locator('#form-gasto-fijo');
    await elegirChip(form, 'Otro');
    await form.locator('[data-icono-picker="gfijo-icono"] .icono-picker__recuadro').click();
    await form.locator('[data-icono-picker="gfijo-icono"] [data-icon="c-cohete"]').click();
    await form.locator('#gfijo-descripcion').fill('Suscripción rara');
    await form.locator('#gfijo-monto').fill('50000');
    await form.locator('#gfijo-dia').fill('12');
    await form.locator('button[type="submit"]').click();

    await expect(page.locator('#modal-gasto-fijo')).not.toHaveAttribute('data-open');
    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
    await page.click('[data-action="agenda-mostrar-dia"][data-day="12"]');

    const item = page.locator('.cal-detail__item').first();
    await expect(item.locator('.cal-detail__icon .cat-teja use[href="#c-cohete"]')).toHaveCount(1);
  });
});

// ── Bloque Gastos: un reloj y un número honesto (ficha 07, ADR 069 D8) ─────

test.describe('Bloque Gastos - el encabezado del contenedor', () => {
  test('un solo reloj gobierna las tres lentes y el hero no repite el suyo', async ({ page }) => {
    await saltearOnboarding(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    const bloque = page.locator('#sec-gast .bloque-gastos');
    await expect(bloque).toBeVisible();
    await expect(bloque.locator('.bloque-gastos__titulo')).toHaveText('Gastos');

    // G4: el selector del hero de la portada desaparece, porque el del bloque
    // manda sobre las tres. Dos relojes en la misma pantalla es el defecto.
    await expect(page.locator('#sec-gast .hero-gastos__top')).toBeHidden();

    const etiqueta = bloque.locator('.bloque-gastos__mes-label');
    const mesInicial = await etiqueta.textContent();
    await bloque.locator('[data-action="bloque-mes-prev"]').click();
    await expect(etiqueta).not.toHaveText(mesInicial);

    // Y el mes viaja con el usuario a la otra lente: es lo único que un
    // contenedor tiene que garantizar.
    const mesAtras = await etiqueta.textContent();
    await bloque.locator('.bloque-tabs__tab[data-section="presupuesto"]').click();
    await page.waitForSelector('#sec-presupuesto.active', { timeout: 5_000 });
    await expect(page.locator('#sec-presupuesto .bloque-gastos__mes-label')).toHaveText(mesAtras);

    // El mes siguiente se corta en el tope: no se navega al futuro.
    await page.locator('#sec-presupuesto [data-action="bloque-mes-next"]').click();
    await expect(page.locator('#sec-presupuesto .bloque-gastos__mes-label')).toHaveText(mesInicial);
    await expect(page.locator('#sec-presupuesto [data-action="bloque-mes-next"]')).toBeDisabled();
  });

  test('G5: de un tope a los movimientos que lo forman, con el filtro puesto', async ({ page }) => {
    // El mes visible del bloque es el corriente, y el rango que viaja con el
    // filtro es el de ese mes: los consumos tienen que caer dentro.
    const hoy = new Date();
    const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

    await saltearOnboarding(page);
    await parchar(page, {
      presupuestos: [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 200_000, activo: true }],
      gastos: [
        { id: 'g1', descripcion: 'Almuerzo', monto: 32_000, categoria: 'Restaurantes', fecha: `${mes}-05` },
        { id: 'g2', descripcion: 'Mercado del mes', monto: 210_000, categoria: 'Mercado', fecha: `${mes}-03` },
      ],
    });
    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const ver = page.locator('[data-action="presupuesto-ver-movimientos"]').first();
    await expect(ver).toBeVisible();
    await ver.click();

    await page.waitForSelector('#sec-movimientos.active', { timeout: 5_000 });
    const pastilla = page.locator('[data-action="movimientos-quitar-categoria"]');
    await expect(pastilla).toContainText('Restaurantes');

    // Llega filtrado de verdad: el gasto de Mercado queda fuera.
    const filas = page.locator('#lista-movimientos .list-item');
    await expect(filas).toHaveCount(1);
    await expect(filas.first()).toContainText('Almuerzo');

    // La pastilla se puede quitar sin perder el rango de fechas con el que se
    // llegó: quien amplía a todo el mes no quiere volver a escribirlo.
    await pastilla.click();
    await expect(page.locator('[data-action="movimientos-quitar-categoria"]')).toHaveCount(0);
    await expect(filas).toHaveCount(2);
    await expect(page.locator('#movimientos-desde')).toHaveValue(`${mes}-01`);
  });
});

// ── Por pagar: los cuatro chips de la lente (ADR 080 D6) ───────────────────

test.describe('Por pagar - chips de la lente', () => {
  test('los cuatro chips filtran la lista y el vacío del filtro no es el de la sección', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#compromisos');
    await page.waitForSelector('#lista-compromisos', { timeout: 10_000 });

    // Sin nada registrado no hay chips que ofrecer: filtrarían un conjunto vacío.
    await expect(page.locator('#lista-compromisos .filtros-bar')).toHaveCount(0);

    await abrirFormGastoFijo(page);
    const form = page.locator('#form-gasto-fijo');
    await elegirChip(form, 'Mercado');
    await form.locator('#gfijo-monto').fill('400000');
    await form.locator('#gfijo-dia').fill('8');
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#modal-gasto-fijo')).not.toHaveAttribute('data-open');

    const chips = page.locator('#lista-compromisos .filtros-bar .chip');
    await expect(chips).toHaveText(['Todo', 'Fijos', 'Deudas', 'Pagado']);
    await expect(page.locator('#lista-compromisos .deuda-card')).toHaveCount(1);

    // "Deudas" no deja nada: hay datos, pero el filtro los esconde, así que el
    // mensaje es otro y la salida es cambiar de chip, no crear algo.
    await chips.filter({ hasText: 'Deudas' }).click();
    await expect(page.locator('#lista-compromisos .deuda-card')).toHaveCount(0);
    await expect(page.locator('#lista-compromisos .empty-state__desc')).toContainText('Nada en "Deudas"');
    await expect(chips).toHaveCount(4);

    await chips.filter({ hasText: 'Todo' }).click();
    await expect(page.locator('#lista-compromisos .deuda-card')).toHaveCount(1);
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
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
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
    const hoy = hoyLocal();
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      compromisos: [{
        id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual',
        diaPago: 5, monto: 800_000, activo: true, categoria: null,
        fechaCreacion: '2026-01-01T00:00:00.000Z',
      }],
      gastos: [{
        id: 'g1', descripcion: 'Pago arriendo', monto: 800_000, categoria: 'Vivienda',
        fecha: hoy, cuentaId: null, nota: '', compromisoId: 'cf1',
      }],
    });

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
    const hoy = hoyLocal();
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      ahorro: {
        fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 100_000 },
        aportes: [{ id: 'a1', monto: 50_000, fecha: hoy }],
        compromisoMensual: 0,
      },
    });

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const card = page.locator('.grupo-card[data-grupo="ahorro"]');
    await card.locator('.grupo-card__desglose summary').click();
    await expect(card.locator('.grupo-card__item')).toHaveCount(1);
    await expect(card.locator('.grupo-card__item-nombre')).toContainText('Fondo de emergencia');
    await expect(card.locator('.grupo-card__item-sub')).toContainText('este mes');
  });

  // DIS.7 (hallazgo L8): el copy del ADR 019 D3 no cambia, cambia de sitio. El
  // mensaje de una categoría baja a su propio sobre, donde el usuario puede
  // editar o eliminar ese tope, en vez de apilarse en la cabecera de la tarjeta
  // describiendo un sobre que estaba unos 400px más abajo.
  test('alerta de Estilo de vida (MC.5d): un límite por categoría en 80% muestra el mensaje exacto del ADR en su sobre', async ({ page }) => {
    await saltearOnboarding(page);
    const hoy = hoyLocal();
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      presupuestos: [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 100_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }],
      gastos: [{ id: 'g1', descripcion: 'Almuerzo', monto: 80_000, categoria: 'Restaurantes', fecha: hoy, cuentaId: null, nota: '' }],
    });

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const nota = page.locator('.envelope[data-id="p1"] .envelope__nota');
    await expect(nota).toBeVisible({ timeout: 3_000 });
    await expect(nota).toHaveText('Ya usaste el 80% de tu presupuesto para Restaurantes. Intenta moderar este tipo de gastos los próximos días.');
    // Y ya no se repite arriba: la tarjeta solo lleva mensajes de nivel de grupo.
    await expect(page.locator('.grupo-card[data-grupo="estilo-de-vida"] > .nudge')).toHaveCount(0);
  });

  test('refuerzo de Ahorro (MC.8a): cumplir justo el ahorro planeado muestra el refuerzo "Cumpliste"', async ({ page }) => {
    await saltearOnboarding(page);
    const hoy = hoyLocal();
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      // Preset fijo 50/30/20: ahorro = 20% de 3.000.000 = 600.000. Se aporta justo eso.
      config: { notificaciones: false, presetDistribucion: '50-30-20' },
      ahorro: {
        fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 },
        aportes: [{ id: 'a1', monto: 600_000, fecha: hoy }],
        compromisoMensual: 0,
      },
    });

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const nudge = page.locator('.grupo-card[data-grupo="ahorro"] .nudge-success .nudge__title');
    await expect(nudge).toBeVisible({ timeout: 3_000 });
    await expect(nudge).toHaveText('Vas por buen camino. Cumpliste con el ahorro que planeaste este mes.');
  });

  test('refuerzo de Ahorro (MC.8a): superar lo planeado muestra el refuerzo más cálido', async ({ page }) => {
    await saltearOnboarding(page);
    const hoy = hoyLocal();
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      // Ahorro planeado 600.000; se aporta 900.000 (más de lo planeado).
      config: { notificaciones: false, presetDistribucion: '50-30-20' },
      ahorro: {
        fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 },
        aportes: [{ id: 'a1', monto: 900_000, fecha: hoy }],
        compromisoMensual: 0,
      },
    });

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const nudge = page.locator('.grupo-card[data-grupo="ahorro"] .nudge-success .nudge__title');
    await expect(nudge).toBeVisible({ timeout: 3_000 });
    await expect(nudge).toHaveText('¡Excelente! Este mes estás ahorrando más de lo planeado. Cada peso que ahorras hoy es tranquilidad mañana.');
  });

  test('MC.8: superar la meta de Ahorro se ve en verde (logro), nunca en rojo', async ({ page }) => {
    await saltearOnboarding(page);
    const hoy = hoyLocal();
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      config: { notificaciones: false, presetDistribucion: '50-30-20' }, // ahorro planeado 600.000
      ahorro: {
        fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 },
        aportes: [{ id: 'a1', monto: 900_000, fecha: hoy }], // aporta más de lo planeado
        compromisoMensual: 0,
      },
    });

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

  test('EP.7b: la nota de complementariedad con Mis cuentas ya no vive en el resumen (la cubre el banner de propósito)', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
    });
    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    await expect(page.locator('.grupos-resumen__nota')).toHaveCount(0);
  });

  test('MC.8b: los topes por categoría viven dentro de la tarjeta de Estilo de vida, sin bloque suelto', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      presupuestos: [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 300_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }],
    });
    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const card = page.locator('.grupo-card[data-grupo="estilo-de-vida"]');
    // Los topes viven DENTRO de la tarjeta: eso es lo que este test protege.
    await expect(card.locator('.estilo-limites')).toBeVisible();
    await expect(card.locator('.envelope[data-id="p1"]')).toBeVisible();
    // DSK.8b (ADR 077 D4): con plan del mes el pie ya no repite el botón del
    // encabezado. Antes había dos con el mismo texto y el mismo destino a
    // 1333px de distancia. La regla es la inversa de la que ya ocultaba el de
    // arriba en el estado vacío: un botón siempre, nunca dos.
    await expect(card.locator('.estilo-limites [data-action="nuevo-presupuesto"]')).toHaveCount(0);
    await expect(page.locator('#btn-nuevo-presupuesto')).toHaveText('Nuevo límite');
    // El bloque suelto y el hero antiguos ya no existen en ningún lado.
    await expect(page.locator('.estilo-detalle')).toHaveCount(0);
    await expect(page.locator('.presupuesto-hero')).toHaveCount(0);
  });

  test('MC.8b: la "olla finita" indica cuánto del Estilo de vida cubren los topes', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      // Preset 50/30/20: Estilo de vida = 30% de 3.000.000 = 900.000.
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      config: { notificaciones: false, presetDistribucion: '50-30-20' },
      presupuestos: [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 300_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }],
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
    const hoy = hoyLocal();
    await parchar(page, {
      // Preset 50/30/20 con ingreso 1.000.000: Necesidades asignado = 500.000.
      // Se ejecutan 600.000 (por encima). Antes de MC.8b la tarjeta iba en rojo.
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 1_000_000, frecuencia: 'Mensual', activo: true }],
      config: { notificaciones: false, presetDistribucion: '50-30-20' },
      compromisos: [{
        id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual',
        diaPago: 5, monto: 600_000, activo: true, categoria: null,
        fechaCreacion: '2026-01-01T00:00:00.000Z',
      }],
      gastos: [{
        id: 'g1', descripcion: 'Pago arriendo', monto: 600_000, categoria: 'Vivienda',
        fecha: hoy, cuentaId: null, nota: '', compromisoId: 'cf1',
      }],
    });
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

// ── Mis cuentas: Transferir entre cuentas propias (MC.17b) ───────────────────

test.describe('Mis cuentas - Transferir entre cuentas propias (MC.17b)', () => {
  test('con menos de 2 cuentas activas, la entrada no aparece', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 300_000, activa: true }],
    });
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await expect(page.locator('#tesoreria-transferir')).toBeEmpty();
  });

  test('con exactamente 2 cuentas: el widget de par transfiere y actualiza ambos saldos', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      cuentas: [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 300_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 900_000, activa: true },
      ],
    });
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await page.click('[data-action="abrir-transferencia"]');
    await page.waitForSelector('#modal-transferencia[data-open]', { timeout: 5_000 });

    // Origen por defecto = mayor saldo (Bancolombia, $900.000).
    const wrap = page.locator('#transferencia-par-wrap');
    await expect(wrap).toContainText('Bancolombia');
    await expect(wrap).toContainText('Nequi');

    await page.fill('#transferencia-monto', '100000');
    await page.click('#form-transferencia button[type="submit"]');
    await page.waitForSelector(modalCerrado('modal-transferencia'), { timeout: 5_000 });

    await page.waitForTimeout(400); // save() debounced (ADN #5)
    const st = await leerEstado(page);
    expect(st.cuentas.find(c => c.id === 'c2').saldo).toBe(800_000); // origen: 900.000 - 100.000
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(400_000); // destino: 300.000 + 100.000
    expect(st.transferencias).toHaveLength(1);
    expect(st.transferencias[0]).toMatchObject({ cuentaOrigenId: 'c2', cuentaDestinoId: 'c1', monto: 100_000 });

    // El traslado es interno: el patrimonio total en cuentas no cambia.
    const cardBancolombia = page.locator('.cuenta-card', { hasText: 'Bancolombia' });
    const cardNequi       = page.locator('.cuenta-card', { hasText: 'Nequi' });
    await expect(cardBancolombia.locator('.cuenta-card__saldo')).toHaveText('$800.000');
    await expect(cardNequi.locator('.cuenta-card__saldo')).toHaveText('$400.000');
  });

  test('invertir el par cambia cuál cuenta es el origen', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      cuentas: [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 300_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 900_000, activa: true },
      ],
    });
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await page.click('[data-action="abrir-transferencia"]');
    await page.waitForSelector('#modal-transferencia[data-open]', { timeout: 5_000 });

    const origenAntes = await page.locator('#transferencia-par-wrap input[name="cuentaOrigenId"]').inputValue();
    await page.click('[data-action="invertir-transferencia"]');
    const origenDespues = await page.locator('#transferencia-par-wrap input[name="cuentaOrigenId"]').inputValue();

    expect(origenDespues).not.toBe(origenAntes);
  });

  test('con 3+ cuentas: dos selectores independientes, la transferencia mueve el saldo correcto', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      cuentas: [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 300_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 900_000, activa: true },
        { id: 'c3', nombre: 'Daviplata', banco: 'Daviplata', tipo: 'Ahorros', saldo: 50_000, activa: true },
      ],
    });
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await page.click('[data-action="abrir-transferencia"]');
    await page.waitForSelector('#modal-transferencia[data-open]', { timeout: 5_000 });

    await expect(page.locator('#transferencia-par-wrap')).toHaveCount(0);
    await page.locator('input[name="cuentaOrigenId"][value="c2"]').check();
    await page.locator('input[name="cuentaDestinoId"][value="c3"]').check();
    await page.fill('#transferencia-monto', '50000');
    await page.click('#form-transferencia button[type="submit"]');
    await page.waitForSelector(modalCerrado('modal-transferencia'), { timeout: 5_000 });

    await page.waitForTimeout(400);
    const st = await leerEstado(page);
    expect(st.cuentas.find(c => c.id === 'c2').saldo).toBe(850_000);
    expect(st.cuentas.find(c => c.id === 'c3').saldo).toBe(100_000);
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(300_000); // sin tocar
  });

  test('GMF (MC.17d): origen no exento descuenta monto + 4x1000 y lo traza en el ledger', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      cuentas: [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 300_000, activa: true, aplica4x1000: false },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 900_000, activa: true, aplica4x1000: true },
      ],
    });
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await page.click('[data-action="abrir-transferencia"]');
    await page.waitForSelector('#modal-transferencia[data-open]', { timeout: 5_000 });

    // Origen por defecto = mayor saldo = Bancolombia (no exenta): el checkbox aparece marcado.
    const gmf = page.locator('input[name="aplicarGMF"]');
    await expect(gmf).toBeChecked();

    await page.fill('#transferencia-monto', '200000');
    await page.click('#form-transferencia button[type="submit"]');
    await page.waitForSelector(modalCerrado('modal-transferencia'), { timeout: 5_000 });

    await page.waitForTimeout(400); // save() debounced (ADN #5)
    const st = await leerEstado(page);
    expect(st.cuentas.find(c => c.id === 'c2').saldo).toBe(699_200); // 900.000 - 200.000 - 800
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(500_000); // 300.000 + 200.000
    expect(st.transferencias[0].costoGMF).toBe(800);

    // El ledger de Movimientos traza el gravamen en el subtítulo de la fila.
    await page.goto('/#movimientos');
    await page.waitForSelector('#lista-movimientos', { timeout: 10_000 });
    const fila = page.locator('.list-item', { hasText: 'Nequi' }).first();
    await expect(fila.locator('.list-item__subtitle')).toContainText('incluye $800 de 4x1000');
  });
});

// ── Mis cuentas: sin accesos cruzados en la tarjeta (MC.13e-2a, punto 11) ────
// Los accesos cruzados ("Ver progreso del fondo", "Ver tu seguimiento en
// Límites de gasto"...) dejaron de renderizarse en la tarjeta de "Distribuir
// mi ingreso" (antes MC.5e/ADR 017 los mostraba siempre ahí). MC.13e-2g los
// reintrodujo dentro del asistente, uno en el paso de su categoría (punto 10):
// la tarjeta sigue sin ninguno.

test.describe('Mis cuentas - la tarjeta de distribución ya no muestra accesos cruzados', () => {
  test('sin enlace a Límites de gasto ni a ninguna otra sección', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
    });
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await expect(page.locator('#ingresos-distribucion a[href="#presupuesto"]')).toHaveCount(0);
    await expect(page.locator('.distribucion-ctas')).toHaveCount(0);
    await expect(page.locator('#ingresos-distribucion .distribuir__cta')).toHaveCount(0);
  });
});

// ── Mis cuentas: MC.13e-2g, el asistente abre educando y reparte los accesos ──

test.describe('Mis cuentas - Distribuir mi ingreso: educación primero, accesos por paso', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
      compromisos: [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', categoria: 'Arriendo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true },
        { id: 'd1', descripcion: 'Tarjeta', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito', saldoTotal: 2_000_000, cuotaMensual: 250_000, diaPago: 15, activo: true },
      ],
      metas: [{ id: 'm1', nombre: 'Viaje', montoObjetivo: 1_200_000, montoActual: 0, fechaLimite: null, completada: false }],
    });
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
  });

  test('el asistente abre con la referencia 50/30/20 y el primer paso ya listo, sin clic extra', async ({ page }) => {
    const edu = page.locator('.distribuir-edu');
    await expect(edu).toBeVisible({ timeout: 3_000 });
    await expect(edu).toContainText('Así reparten los expertos');
    await expect(edu.locator('.distribuir-edu__ref')).toHaveText(['50%', '30%', '20%']);
    await expect(edu.locator('.distribuir-edu__tuyo')).toHaveCount(3);

    // La educación no cobra un paso: el checklist del Paso 1 ya está a la vista
    // y marcado, como antes de MC.13e-2g.
    await expect(page.locator('[data-dist-paso-indicador]')).toContainText('Paso 1 de 3: Necesidades');
    await expect(page.locator('[data-nec-id="cf1"]')).toBeChecked();
  });

  test('cada acceso cruzado aparece en el paso de su categoría', async ({ page }) => {
    const ctaDeudas = page.locator('.distribuir__cta[href="#compromisos"]');
    const ctaAhorro = page.locator('.distribuir__cta[href="#ahorro"]');
    const ctaLimites = page.locator('.distribuir__cta[href="#presupuesto"]');

    // Paso 1: solo el de deudas (sus cuotas se pagan acá).
    await expect(ctaDeudas).toBeVisible({ timeout: 3_000 });
    await expect(ctaAhorro).toBeHidden();
    await expect(ctaLimites).toBeHidden();

    await page.click('[data-action="distribuir-paso-siguiente"]');
    await expect(ctaAhorro).toBeVisible();
    await expect(ctaDeudas).toBeHidden();

    await page.click('[data-action="distribuir-paso-siguiente"]');
    await expect(ctaLimites).toBeVisible();
    await expect(ctaAhorro).toBeHidden();
  });

  test('un acceso cruzado cierra el asistente y lleva a su sección', async ({ page }) => {
    await page.click('.distribuir__cta[href="#compromisos"]');

    await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
    // Cerrado se verifica por el contrato del overlay (`:not([data-open])`), no
    // por visibilidad: un modal cerrado queda en opacity 0, que Playwright sigue
    // contando como visible.
    await page.waitForSelector(modalCerrado('modal-distribuir'), { timeout: 5_000 });
  });
});

// ── Mis cuentas: aporte de ahorro por objetivo en "Distribuir mi ingreso" (MC.7a/MC.7b, ADR 018) ──

test.describe('Mis cuentas - Distribuir mi ingreso: aporte por objetivo', () => {
  test('una meta con fecha muestra un aporte sugerido (no 0) y el fondo recibe el excedente', async ({ page }) => {
    await saltearOnboarding(page);
    const futura = new Date();
    futura.setMonth(futura.getMonth() + 6);
    const fechaLimite = futura.toISOString().slice(0, 10);
    await parchar(page, {

      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      config: { presetDistribucion: '50-30-20' }, // ahorro = 20% de 3.000.000 = 600.000
      metas: [{ id: 'm1', nombre: 'Viaje', montoObjetivo: 1_200_000, montoActual: 0, fechaLimite, completada: false }],
      ahorro: {
        fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 100_000 },
        aportes: [], compromisoMensual: 0,
      },
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
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      config: { presetDistribucion: '50-30-20' },
      metas: [{ id: 'm1', nombre: 'Viaje', montoObjetivo: 1_200_000, montoActual: 0, fechaLimite: null, completada: false }],
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
  test('lista lo que vence antes del próximo cobro: fijos de cualquier frecuencia y deudas, marcadas por defecto (MC.7g)', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
      compromisos: [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', categoria: 'Arriendo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true },
        { id: 'cf2', descripcion: 'Mercado', tipo: 'fijo', categoria: 'Mercado', frecuencia: 'Quincenal', diaPago: 1, monto: 150_000, activo: true },
        { id: 'd1', descripcion: 'Tarjeta Bancolombia', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito', saldoTotal: 2_000_000, cuotaMensual: 250_000, diaPago: 15, activo: true },
      ],
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    // MC.13c-2 cierra MC.7g: el fijo Quincenal ya no queda fuera. La ventana de
    // un cobro mensual dura un mes, así que el mensual y la deuda caen una vez
    // cada uno y el quincenal (días 1 y 16) cae dos: su fila cobra por las dos.
    // Los conteos no dependen del día en que corra el test: en una ventana de un
    // mes siempre cae 1 ocurrencia de un mensual y 2 de un quincenal.
    await expect(page.locator('[data-nec-toggle]')).toHaveCount(3);
    await expect(page.locator('[data-nec-id="cf1"]')).toBeChecked();
    await expect(page.locator('[data-nec-id="d1"]')).toBeChecked();
    await expect(page.locator('[data-nec-id="cf2"]')).toBeChecked();

    const panel = page.locator('#distribuir-ingreso-panel');
    await expect(panel).toContainText('Arriendo');
    await expect(panel).toContainText('día 5');
    await expect(panel).toContainText('Tarjeta Bancolombia');
    await expect(panel).toContainText('Mercado');
    // 2 × $150.000: el quincenal cobra por sus dos vencimientos de la ventana.
    await expect(page.locator('[data-nec-id="cf2"]')).toHaveAttribute('data-nec-monto', '300000');
  });

  test('una Necesidad ya pagada este periodo aparece marcada, deshabilitada, con "Ya pagado"', async ({ page }) => {
    await saltearOnboarding(page);
    const hoy = hoyLocal();
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
      compromisos: [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ],
      gastos: [{
        id: 'g1', descripcion: 'Pago: Arriendo', monto: 800_000, categoria: 'Gastos fijos',
        fecha: hoy, cuentaId: 'c1', compromisoId: 'cf1', nota: '',
      }],
    });

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
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
      compromisos: [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ],
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page); // "Distribuir" vive en el último paso (MC.7d)
    await page.click('[data-action="confirmar-distribucion"]');

    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    // save() está debounced 200ms (ADN #5): esperar el flush antes de leer localStorage.
    await page.waitForTimeout(400);
    const st = await leerEstado(page);
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(3_200_000); // 1.000.000 + 3.000.000 (ingreso) - 800.000 (pago)
    const gasto = st.gastos.find(g => g.compromisoId === 'cf1');
    expect(gasto).toBeTruthy();
    expect(gasto.monto).toBe(800_000);
    expect(gasto.categoria).toBe('Gastos fijos');
    expect(gasto.cuentaId).toBe('c1');
  });

  test('Deshacer revierte el pago de una Necesidad: borra el gasto y restaura el saldo de la cuenta', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
      compromisos: [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ],
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
    const st = await leerEstado(page);
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000);
    expect(st.gastos.find(g => g.compromisoId === 'cf1')).toBeUndefined();
  });

  test('BUG-003: confirmar con una Necesidad ya pagada presente no la vuelve a pagar', async ({ page }) => {
    await saltearOnboarding(page);
    const hoy = hoyLocal();
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
      compromisos: [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
        { id: 'cf2', descripcion: 'Internet', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 10, monto: 200_000, activo: true, categoria: null },
      ],
      gastos: [{
        id: 'g1', descripcion: 'Pago: Arriendo', monto: 800_000, categoria: 'Gastos fijos',
        fecha: hoy, cuentaId: 'c1', compromisoId: 'cf1', nota: '',
      }],
    });

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
    const st = await leerEstado(page);

    expect(st.gastos.filter(g => g.compromisoId === 'cf1')).toHaveLength(1); // sigue existiendo solo el original
    expect(st.gastos.find(g => g.compromisoId === 'cf2')).toBeTruthy();
    // 1.000.000 + 3.000.000 (ingreso) - 200.000 (solo cf2, cf1 ya estaba pagado).
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(3_800_000);
  });

  test('BUG-004: el checklist topa la cuota de una deuda a su saldo pendiente y excluye una deuda saldada', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
      compromisos: [
        { id: 'd1', descripcion: 'Tarjeta', tipo: 'deuda-entidad', saldoTotal: 50_000, cuotaMensual: 200_000, diaPago: 15, activo: true },
        { id: 'd2', descripcion: 'Ya saldada', tipo: 'deuda-entidad', saldoTotal: 0, cuotaMensual: 300_000, diaPago: 20, activo: true },
      ],
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
    const st = await leerEstado(page);

    const abono = st.gastos.find(g => g.compromisoId === 'd1');
    expect(abono.monto).toBe(50_000);
    expect(st.compromisos.find(c => c.id === 'd1').saldoTotal).toBe(0);
    // 1.000.000 + 3.000.000 (ingreso) - 50.000 (solo lo que realmente se debía).
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(3_950_000);
  });

  test('BUG-005: una cuota de manejo guardada con frecuencia "mensual" se migra a "Mensual" y aparece en el checklist', async ({ page }) => {
    await saltearOnboarding(page);
    // Estado pre-fix (schema v19): la cuota de manejo nació con 'mensual' minúscula.
    // Al cargar, la migración v19→v20 debe capitalizarla, y entonces la cuota
    // entra al checklist de Necesidades (antes quedaba excluida por el filtro Mensual).
    await parchar(page, {
      _version: 19,
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true,
        cuotaManejo: { monto: 15_000, diaCobro: 5 } }],
      compromisos: [
        { id: 'cm1', descripcion: 'Cuota de manejo Nequi', monto: 15_000, frecuencia: 'mensual',
          diaPago: 5, tipo: 'fijo', activo: true, cuentaId: 'c1', esCuotaManejo: true },
      ],
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
    const frec = (await leerEstado(page)).compromisos.find(c => c.id === 'cm1').frecuencia;
    expect(frec).toBe('Mensual');
  });
});

// ── Mis cuentas: asistente paginado + presupuesto sobre el remanente (MC.7d, ADR 018 R3) ──

test.describe('Mis cuentas - Distribuir mi ingreso: asistente paginado (MC.7d)', () => {
  test('el panel navega Necesidades → Ahorro → Estilo de vida con Atrás/Siguiente y confirma solo al final', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
      config: { presetDistribucion: '50-30-20' },
      compromisos: [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ],
      ahorro: {
        fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 },
        aportes: [], compromisoMensual: 0,
      },
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

  test('MC.7f: al avanzar/retroceder el foco se mueve al contenedor del paso (a11y)', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
      config: { presetDistribucion: '50-30-20' },
      compromisos: [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ],
      ahorro: {
        fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 },
        aportes: [], compromisoMensual: 0,
      },
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    // Apertura inicial: el foco NO es el paso 1 ni el monto a distribuir.
    // Desde MC.13e-2g lo fija `abrirModal` (primer focusable del panel, el botón
    // de cerrar): el monto quedó debajo del bloque educativo y enfocarlo con
    // `preventScroll` dejaba el foco fuera de la vista.
    await expect(page.locator('#modal-distribuir .modal__close')).toBeFocused();
    await expect(page.locator('[data-dist-paso="0"]')).not.toBeFocused();

    await page.click('[data-action="distribuir-paso-siguiente"]');
    await expect(page.locator('[data-dist-paso="1"]')).toBeFocused();

    await page.click('[data-action="distribuir-paso-atras"]');
    await expect(page.locator('[data-dist-paso="0"]')).toBeFocused();
  });

  test('MC.7f: con un solo paso no se muestra el indicador "Paso X de N"', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      // Sin compromisos, sin ahorro/metas/apartados/inversiones: el único
      // contenido accionable es el reparto de Estilo de vida entre cuentas
      // (MC.7e), así que el asistente arranca y termina en un solo paso.
      cuentas: [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true },
      ],
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    await expect(page.locator('[data-dist-paso-indicador]')).toHaveCount(0);
    await expect(page.locator('[data-action="distribuir-paso-siguiente"]')).toBeHidden();
    await expect(page.locator('[data-action="confirmar-distribucion"]')).toBeVisible();
  });

  test('MC.7f: sin Necesidades marcables, el Paso 2 no muestra la sugerencia de ahorro si no hay dónde ponerla', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
      // Sin fondo activo, sin metas ni apartados: ninguna fila de Ahorro. Con una
      // inversión para que el paso 2 sí exista, sin mostrar el hint de
      // "sugerencia de ahorro" (estado vacío corregido en MC.7f).
      inversiones: [
        { id: 'inv1', nombre: 'CDT', tipo: 'CDT', monto: 500_000 },
      ],
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    await expect(page.locator('text=💰 Ahorro, deudas e inversiones · ajusta cuánto destinar a cada una:')).toBeVisible();
    await expect(page.locator('[data-dist-sugerencia-ahorro]')).toHaveCount(0);
    await expect(page.locator('.distribuir__monto[data-dist-tipo="inversion"]')).toBeVisible();
  });

  test('R3: la sugerencia de ahorro se recalcula sobre el remanente real y respeta la edición manual del fondo', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
      // Preset 50-30-20: teórico de ahorro = 600.000. El arriendo de 2.700.000
      // (marcado por defecto) deja un remanente de 300.000, que se reparte
      // 20:30 entre Ahorro y Estilo de vida: 120.000 y 180.000.
      config: { presetDistribucion: '50-30-20' },
      compromisos: [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 2_700_000, activo: true, categoria: null },
      ],
      ahorro: {
        fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 },
        aportes: [], compromisoMensual: 0,
      },
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
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
      // El fondo activo asegura que el panel tenga contenido que mostrar
      // (Ahorro): sin él, con una sola cuenta y sin compromisos, no habría
      // ningún destino ni Necesidad, y el botón "Distribuir" no aparecería.
      ahorro: {
        fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 },
        aportes: [], compromisoMensual: 0,
      },
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
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      config: { presetDistribucion: '50-30-20' }, // Estilo de vida = 30% de 3.000.000 = 900.000
      cuentas: [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true },
      ],
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
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      config: { presetDistribucion: '50-30-20' }, // Estilo de vida = 30% de 3.000.000 = 900.000
      cuentas: [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true },
      ],
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
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      config: { presetDistribucion: '50-30-20' }, // Estilo de vida = 30% de 3.000.000 = 900.000
      cuentas: [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true },
      ],
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
    const st = await leerEstado(page);

    // Bancolombia recibió la transferencia; Nequi (origen) la descontó junto al resto.
    expect(st.cuentas.find(c => c.id === 'c2').saldo).toBe(500_000 + 300_000);
    // Nequi: 1.000.000 + 3.000.000 (ingreso) - 300.000 (transferencia a Bancolombia).
    // Sin Necesidades ni Ahorro marcados en este estado (sin compromisos ni fondo activo).
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000 + 3_000_000 - 300_000);
  });

  test('Deshacer revierte la transferencia entre cuentas junto con el resto de la distribución', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      config: { presetDistribucion: '50-30-20' }, // Estilo de vida = 30% de 3.000.000 = 900.000
      cuentas: [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true },
      ],
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
    const st = await leerEstado(page);
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000);
    expect(st.cuentas.find(c => c.id === 'c2').saldo).toBe(500_000);
  });
});

test.describe('Mis cuentas - Distribuir mi ingreso: cuenta del ingreso principal (MC.13e-2f-1)', () => {
  test('con Ingreso.cuentaId guardado, confirmar distribuye directo sin preguntar la cuenta', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true, cuentaId: 'c2' }],
      cuentas: [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true },
      ],
      compromisos: [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ],
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page);

    await page.click('[data-action="confirmar-distribucion"]');
    // Con 2+ cuentas, sin cuentaId el picker aparece (ver el test de MC.7e
    // "Deshacer revierte la transferencia..."); con cuentaId guardado no debe
    // aparecer: la distribución se acredita directo a Bancolombia (c2).
    await expect(page.locator('[data-role="elegir"]')).toHaveCount(0);
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.waitForTimeout(400);
    const st = await leerEstado(page);
    expect(st.cuentas.find(c => c.id === 'c2').saldo).toBe(500_000 + 3_000_000 - 800_000);
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000);
  });

  test('si la cuenta guardada ya no está activa, cae al picker como antes', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true, cuentaId: 'c2' }],
      cuentas: [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: false },
      ],
      compromisos: [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ],
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page);

    await page.click('[data-action="confirmar-distribucion"]');
    // Una sola cuenta activa (c1): regla de cuenta única, auto-selecciona sin
    // preguntar (mismo comportamiento de siempre, no el picker de varias).
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.waitForTimeout(400);
    const st = await leerEstado(page);
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000 + 3_000_000 - 800_000);
  });
});

// ── SUITE: Agenda - día de ingreso (ADR 021) ─────────────────────────────────
// El día de pago de un ingreso activo aparece en el calendario como evento
// propio, y su CTA "Distribuir" navega a Mis cuentas y abre el asistente
// "Distribuir mi ingreso" (una sola fuente de verdad para el reparto).

test.describe('Agenda - día de ingreso (ADR 021)', () => {
  test('el día de pago muestra el evento y Distribuir abre el asistente en Mis cuentas', async ({ page }) => {
    // El día de pago es HOY: así el gating por fecha del asistente (MC.4d)
    // queda en 'listo' y el panel existe al llegar desde el calendario.
    const diaPago = new Date().getDate();

    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [
        { id: 'cta-ing-e2e', nombre: 'Nequi', tipo: 'Billetera digital', saldo: 500000, activa: true },
        { id: 'cta-ing-e2e-2', nombre: 'Bancolombia', tipo: 'Ahorros', saldo: 200000, activa: true },
      ],
      ingresos:  [{
        id: 'ing-e2e', descripcion: 'Salario', monto: 2000000,
        frecuencia: 'Mensual', diaPago, categoria: null, activo: true,
        fechaCreacion: '2026-01-10T10:00:00Z',
      }],
      gastos: [], compromisos: [],
      // Una meta con fecha: destino de ahorro fondeable para que el
      // asistente tenga pasos que mostrar.
      metas: [{
        id: 'meta-ing-e2e', nombre: 'Viaje', montoObjetivo: 3000000,
        montoActual: 0, fechaLimite: '2027-06-01', completada: false,
        fechaCreacion: '2026-01-10T10:00:00Z',
      }],
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    // El día del ingreso es interactivo y su detalle muestra el evento verde.
    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    const item = page.locator('.cal-detail__item--ingreso');
    await expect(item).toBeVisible({ timeout: 3_000 });
    await expect(item).toContainText('Salario');

    // El CTA navega a Mis cuentas y abre el asistente.
    await item.locator('[data-action="agenda-distribuir-ingreso"]').click();

    await expect(page).toHaveURL(/#tesoreria/);
    const panel = page.locator('#distribuir-ingreso-panel');
    await expect(panel).toBeVisible({ timeout: 3_000 });
  });
});

// ── SUITE: Reservas - el orden que el dominio ya tenía escrito (ficha 10) ────
// La doc del aviso de proximidad declaraba "con la lista ordenada por urgencia,
// el primero es el que apura", y la lista era un `filter` sin `sort`. El aviso
// contaba reservas que no nombraba y no tenía dónde aterrizar.

test.describe('Reservas - la lista se ordena por urgencia (ADR 083)', () => {
  /** YYYY-MM-DD a N días de hoy, en hora local (mismo criterio que hoyLocal). */
  function enDiasLocal(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  test.beforeEach(async ({ page }) => {
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas:   [{ id: 'c-10', nombre: 'Bancolombia', tipo: 'ahorros', saldo: 5000000, activa: true }],
      ingresos: [], gastos: [], compromisos: [], metas: [],
      apartados: [
        // Creada primero y la que menos apura: con el orden viejo encabezaba.
        { id: 'soat',      nombre: 'SOAT',              icono: '🚗', montoObjetivo: 850000,  montoActual: 530000,  fechaObjetivo: enDiasLocal(47), frecuenciaAporte: 'Mensual', completado: false, recurrente: true,  periodoMeses: 12, fechaCreacion: enDiasLocal(-120) },
        { id: 'matricula', nombre: 'Matricula',         icono: '🎓', montoObjetivo: 2400000, montoActual: 2400000, fechaObjetivo: enDiasLocal(9),  frecuenciaAporte: 'Mensual', completado: true,  recurrente: true,  periodoMeses: 12, fechaCreacion: enDiasLocal(-180) },
        { id: 'predial',   nombre: 'Impuesto predial',  icono: '🏠', montoObjetivo: 1200000, montoActual: 180000,  fechaObjetivo: enDiasLocal(24), frecuenciaAporte: 'Mensual', completado: false, recurrente: false, fechaCreacion: enDiasLocal(-150) },
        { id: 'llantas',   nombre: 'Cambio de llantas', icono: '🛞', montoObjetivo: 600000,  montoActual: 150000,  fechaObjetivo: null,            frecuenciaAporte: 'Mensual', completado: false, recurrente: false, fechaCreacion: enDiasLocal(-30) },
      ],
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#apartados');
    await expect(page.locator('#sec-apartados.active')).toBeVisible();
  });

  test('cuatro grupos por lo que pide cada reserva, y el comparador se reordena con la lista', async ({ page }) => {
    await expect(page.locator('#lista-apartados .grupo-eyebrow'))
      .toHaveText(['Listas para usar', 'Vencen en 30 días', 'Más adelante', 'Sin fecha']);

    // El Predial (24 días) sube por encima del SOAT (47), que era el primero
    // solo por haberse creado antes.
    const tarjetas = page.locator('#lista-apartados .apartado-card');
    await expect(tarjetas.nth(0)).toHaveAttribute('data-id', 'predial');
    await expect(tarjetas.nth(1)).toHaveAttribute('data-id', 'soat');

    // V3: el comparador no se toca y sigue al orden nuevo, porque comparte el
    // mismo array que la lista.
    const columnas = page.locator('#lista-apartados .apartados-comparador [class*="__lb"]');
    await expect(columnas.nth(0)).toContainText('Matricula');
    await expect(columnas.nth(1)).toContainText('Impuesto predial');
  });

  test('la reserva ya reunida es una fila con su botón, y va arriba', async ({ page }) => {
    const fila = page.locator('#lista-apartados .apartado-fila');
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText('$2.400.000 listos');
    await expect(fila.locator('[data-action="reiniciar-apartado"]')).toHaveText('Ya lo usé');

    // 62px contra los 307 de la tarjeta, y sin perder la acción.
    const alto = await fila.evaluate(el => Math.round(el.getBoundingClientRect().height));
    expect(alto).toBeLessThan(90);

    // Arriba, no al final: es lo único que se puede cerrar hoy.
    const orden = await page.locator('#lista-apartados [data-id]').evaluateAll(
      els => els.map(e => e.dataset.id));
    expect(orden.indexOf('matricula')).toBe(0);
  });
});

// ── SUITE: Apartados - selector de ícono compacto (CAT.2c) ───────────────────

test.describe('Apartados - selector de ícono compacto (CAT.2c)', () => {

  test('crear un apartado con una plantilla rápida conserva su emoji propio', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#apartados');
    await page.waitForSelector('#sec-apartados.active', { timeout: 10_000 });
    await page.locator('#topbar-primario[data-action="nuevo-apartado"]:visible, #sec-apartados .section__header [data-action="nuevo-apartado"]:visible').click();
    await page.waitForSelector('#modal-apartado[data-open]');

    const form = page.locator('#modal-apartado-body form');
    // La plantilla SOAT (🚗) rellena nombre + ícono sin pasar por la grilla
    // del picker: el emoji curado de la plantilla se conserva tal cual.
    await form.locator('[data-action="apartado-plantilla"][data-nombre="SOAT"]').click();
    await expect(form.locator('#apartado-nombre')).toHaveValue('SOAT');
    await form.locator('#apartado-objetivo').fill('300000');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-apartado'), { timeout: 5_000 });

    const titulo = page.locator('#lista-apartados .apartado-card__nombre');
    await expect(titulo).toContainText('SOAT');
    // DIS.15: retirado el anillo, la identidad vive en el glifo de la cabecera.
    await expect(page.locator('#lista-apartados .apartado-card__glifo')).toContainText('🚗');
  });

  test('crear un apartado con nombre propio y un ícono elegido en el picker', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#apartados');
    await page.waitForSelector('#sec-apartados.active', { timeout: 10_000 });
    await page.locator('#topbar-primario[data-action="nuevo-apartado"]:visible, #sec-apartados .section__header [data-action="nuevo-apartado"]:visible').click();
    await page.waitForSelector('#modal-apartado[data-open]');

    const form = page.locator('#modal-apartado-body form');
    await form.locator('#apartado-nombre').fill('Repuestos del carro');
    // El selector nace como recuadro colapsado (CAT.2): tocarlo despliega la
    // grilla; elegir un ícono la cierra de nuevo.
    await form.locator('[data-icono-picker="apartado-icono"] .icono-picker__recuadro').click();
    await form.locator('[data-icono-picker="apartado-icono"] [data-icon="c-carro"]').click();
    await expect(form.locator('[data-icono-picker="apartado-icono"] .icono-picker__panel')).toBeHidden();
    await form.locator('#apartado-objetivo').fill('500000');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-apartado'), { timeout: 5_000 });

    const titulo = page.locator('#lista-apartados .apartado-card__nombre');
    await expect(titulo).toContainText('Repuestos del carro');
    await expect(page.locator('#lista-apartados .apartado-card__glifo use[href="#c-carro"]')).toHaveCount(1);
  });

  test('elegir una plantilla y luego cambiar el ícono a mano reemplaza el emoji de la plantilla', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#apartados');
    await page.waitForSelector('#sec-apartados.active', { timeout: 10_000 });
    await page.locator('#topbar-primario[data-action="nuevo-apartado"]:visible, #sec-apartados .section__header [data-action="nuevo-apartado"]:visible').click();
    await page.waitForSelector('#modal-apartado[data-open]');

    const form = page.locator('#modal-apartado-body form');
    await form.locator('[data-action="apartado-plantilla"][data-nombre="Regalos"]').click();
    // El usuario se arrepiente del emoji de la plantilla y elige uno propio.
    await form.locator('[data-icono-picker="apartado-icono"] .icono-picker__recuadro').click();
    await form.locator('[data-icono-picker="apartado-icono"] [data-icon="c-torta"]').click();
    await form.locator('#apartado-objetivo').fill('200000');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-apartado'), { timeout: 5_000 });

    await expect(page.locator('#lista-apartados .apartado-card__glifo use[href="#c-torta"]')).toHaveCount(1);
  });

});

// ── SUITE: Deudas - selector de ícono para categoría "Otra"/"Otro" (CAT.2d) ──

test.describe('Deudas - picker de ícono en categoría "Otra"/"Otro" (CAT.2d)', () => {

  test('crear una deuda con entidad y categoría "Otra" con ícono elegido queda en la lista', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#compromisos');
    await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
    // Ficha 05 (ADR 069): el estado vacío abre el chooser de tipo, igual que el
    // "+ Agregar" del encabezado; el chip lleva al form de deuda.
    await page.click('.empty-state [data-action="comp-elegir-tipo-nuevo"]');
    await page.waitForSelector('#modal-compromiso-tipo[data-open]');
    await page.click('[data-action="comp-elegir-tipo-nuevo-ir"][data-tipo="deuda-entidad"]');
    await page.waitForSelector('#modal-compromiso[data-open]');

    // FORM.1b (ADR 042): el form arranca directo en Entidad (segmented
    // inline, sin chooser de dos pasos); no hace falta tocar el segmented.
    const form = page.locator('#modal-compromiso-body form');
    await elegirChip(form, 'Otra');
    // El picker (oculto salvo con "Otra") se despliega al tocar el recuadro.
    await expect(form.locator('#grupo-comp-icono')).toBeVisible();
    await form.locator('[data-icono-picker="comp-icono"] .icono-picker__recuadro').click();
    await form.locator('[data-icono-picker="comp-icono"] [data-icon="c-avion"]').click();
    await form.locator('#comp-descripcion').fill('Crédito de viaje');
    await form.locator('#comp-saldo').fill('2000000');
    await form.locator('#comp-cuota').fill('200000');
    await form.locator('#comp-dia').fill('10');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-compromiso'), { timeout: 5_000 });

    const card = page.locator('.deuda-card', { hasText: 'Crédito de viaje' });
    await expect(card.locator('.deuda-card__icon .cat-teja use[href="#c-avion"]')).toHaveCount(1);
    await expect(card.locator('.deuda-card__chip--entidad use[href="#c-avion"]')).toHaveCount(1);
  });

  test('sin elegir "Otro", el picker de ícono permanece oculto', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#compromisos');
    await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
    // Ficha 05: chooser de tipo desde el estado vacío.
    await page.click('.empty-state [data-action="comp-elegir-tipo-nuevo"]');
    await page.waitForSelector('#modal-compromiso-tipo[data-open]');
    await page.click('[data-action="comp-elegir-tipo-nuevo-ir"][data-tipo="deuda-entidad"]');
    await page.waitForSelector('#modal-compromiso[data-open]');

    // El segmented arranca en Entidad; se toca "Personal" para este flujo.
    await page.click('[data-action="comp-elegir-tipo"][data-tipo="deuda-personal"]');

    const form = page.locator('#modal-compromiso-body form');
    await expect(form.locator('#grupo-comp-icono')).toBeHidden();
    await elegirChip(form, 'Familiar');
    await expect(form.locator('#grupo-comp-icono')).toBeHidden();
    await elegirChip(form, 'Otro');
    await expect(form.locator('#grupo-comp-icono')).toBeVisible();
  });

});

// ── SUITE: Mis cuentas - picker de ícono para banco "Otro" (CAT.2e) ──────────

test.describe('Mis cuentas - picker de ícono para banco "Otro" (CAT.2e)', () => {

  test('crear una cuenta con banco "Otro" y un ícono elegido queda en la teja de la lista', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');

    const form = page.locator('#modal-cuenta-body form');
    await form.locator('.bank-picker__trigger').click();
    await page.waitForSelector('#banco-list:not([hidden])', { timeout: 5_000 });
    await page.locator('#banco-list .bank-picker__item[data-value="Otro"]').click();

    await expect(form.locator('#form-group-icono')).toBeVisible();
    await form.locator('[data-icono-picker="cuenta-icono"] .icono-picker__recuadro').click();
    await form.locator('[data-icono-picker="cuenta-icono"] [data-icon="c-avion"]').click();

    await form.locator('#cuenta-tipo').selectOption('Ahorros');
    await form.locator('[name="saldo"]').fill('100000');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-cuenta'), { timeout: 5_000 });

    const teja = page.locator('#lista-tesoreria .cuenta-card__icon .bank-avatar');
    await expect(teja.locator('use[href="#c-avion"]')).toHaveCount(1);
  });

  test('sin elegir "Otro", el picker de ícono permanece oculto; volver a un banco con glifo lo oculta de nuevo', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');

    const form = page.locator('#modal-cuenta-body form');
    await expect(form.locator('#form-group-icono')).toBeHidden();

    await form.locator('.bank-picker__trigger').click();
    await page.waitForSelector('#banco-list:not([hidden])', { timeout: 5_000 });
    await page.locator('#banco-list .bank-picker__item[data-value="Otro"]').click();
    await expect(form.locator('#form-group-icono')).toBeVisible();

    await form.locator('.bank-picker__trigger').click();
    await page.waitForSelector('#banco-list:not([hidden])', { timeout: 5_000 });
    await page.locator('#banco-list .bank-picker__item[data-value="Nequi"]').click();
    await expect(form.locator('#form-group-icono')).toBeHidden();
  });

});

// ── SUITE: Análisis v2 - score hero + chip de mes (ANL.2a, ADR 038) ──────────

test.describe('Análisis v2 - score hero + chip de mes (ANL.2a)', () => {

  test('el score se presenta como hero con anillo, pill de banda y 4 factores; el chip del header muestra el mes', async ({ page }) => {
    await saltearOnboarding(page);
    // Una cuenta con saldo + un gasto del mes: datos suficientes para que el
    // panel calcule un score real (banda distinta de "sin datos").
    const d = new Date();
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await parchar(page, {
      cuentas: [{ id: 'cu1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 2_000_000, activa: true }],
      gastos: [{ id: 'g1', descripcion: 'Mercado', monto: 300_000, categoria: 'Mercado', fecha: hoy, cuentaId: 'cu1' }],
    });
    await page.goto('/#analisis');
    await page.waitForSelector('#sec-analisis.active', { timeout: 10_000 });

    const hero = page.locator('.score-hero');
    await expect(hero).toBeVisible();
    await expect(hero.locator('.progress-ring')).toBeVisible();
    await expect(hero.locator('.score-hero__num')).toHaveText(/^\d+$/);
    await expect(hero.locator('.score-hero__pill')).toHaveText(/Excelente|Buena|Ajustada|Crítica/);
    await expect(hero.locator('.score-hero__factor')).toHaveCount(4);

    const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    // ANL.3: el chip del header se movió al rótulo del grupo "A dónde va tu
    // dinero" (el único bloque de la página que mide ese mes).
    const periodo = `${MESES[new Date().getMonth()]} ${new Date().getFullYear()}`;
    await expect(page.locator('.analisis__group-label')).toHaveText(`A dónde va tu dinero · ${periodo}`);

    // DIS.10 (C3): la frase interpretativa vive a ancho completo, fuera de la
    // columna del anillo, entre el bloque superior y la grilla de factores.
    await expect(hero.locator(':scope > .score-hero__explicacion')).toBeVisible();
  });

  test('el ojo del patrimonio enmascara neto, activos y pasivos (ANL.2b)', async ({ page }) => {
    await saltearOnboarding(page);
    await parchar(page, {
      cuentas: [{ id: 'cu1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 800_000, activa: true }],
    });
    await page.goto('/#analisis');
    await page.waitForSelector('#sec-analisis.active', { timeout: 10_000 });

    const card = page.locator('.patri-card');
    await expect(card.locator('.patri-card__valor')).toHaveText('$800.000');

    await page.click('[data-action="analisis-saldo-visibilidad"]');
    await expect(card.locator('.patri-card__valor')).toHaveText('$••••••');
    await expect(card.locator('.patri-card__col-valor').first()).toHaveText('••••');
    await expect(page.locator('#analisis-saldo-ojo')).toHaveAttribute('aria-pressed', 'true');

    await page.click('[data-action="analisis-saldo-visibilidad"]');
    await expect(card.locator('.patri-card__valor')).toHaveText('$800.000');
  });

  test('"A dónde va tu dinero" agrupa tendencia (chip de variación) y categorías (top al centro) (ANL.2c)', async ({ page }) => {
    await saltearOnboarding(page);
    const d = new Date();
    const fecha = (offset, dia) => {
      const x = new Date(d.getFullYear(), d.getMonth() + offset, dia);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    };
    await parchar(page, {
      cuentas: [{ id: 'cu1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 2_000_000, activa: true }],
      gastos: [
        { id: 'g1', descripcion: 'Mercado', monto: 400_000, categoria: 'Mercado', fecha: fecha(-1, 2), cuentaId: 'cu1' },
        { id: 'g2', descripcion: 'Mercado', monto: 300_000, categoria: 'Mercado', fecha: fecha(0, 2), cuentaId: 'cu1' },
      ],
    });
    await page.goto('/#analisis');
    await page.waitForSelector('#sec-analisis.active', { timeout: 10_000 });

    const grupo = page.locator('.analisis__group');
    // ANL.3: el rótulo lleva el mes que antes vivía en el chip del header.
    await expect(grupo.locator('.analisis__group-label')).toContainText('A dónde va tu dinero');
    // Bajó el gasto → chip verde con la variación (ADR 019: solo bajar se celebra).
    await expect(grupo.locator('.tend-card__chip')).toContainText('↓ 25% vs mes anterior');
    await expect(grupo.locator('.tend-card__stat')).toHaveCount(3);
    await expect(grupo.locator('.catg-card__centro-cat')).toHaveText('Mercado');
    await expect(grupo.locator('.catg-card__total')).toHaveText('$300.000');
  });

  test('DIS.10: el cuerpo del colapsable es v2 (cards, sprite, lista) y sobrevive a registrar un gasto', async ({ page }) => {
    await saltearOnboarding(page);
    const d = new Date();
    const fecha = (offset, dia) => {
      const x = new Date(d.getFullYear(), d.getMonth() + offset, dia);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    };
    await parchar(page, {
      cuentas: [{ id: 'cu1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 2_000_000, activa: true }],
      gastos: [
        { id: 'g1', descripcion: 'Mercado', monto: 500_000, categoria: 'Mercado', fecha: fecha(-1, 2), cuentaId: 'cu1' },
        { id: 'g2', descripcion: 'Mercado', monto: 300_000, categoria: 'Mercado', fecha: fecha(0, 2), cuentaId: 'cu1' },
        { id: 'g3', descripcion: 'Bus', monto: 120_000, categoria: 'Transporte', fecha: fecha(0, 3), cuentaId: 'cu1' },
      ],
    });
    await page.goto('/#analisis');
    await page.waitForSelector('#sec-analisis.active', { timeout: 10_000 });

    const grupo = page.locator('.analisis-grupo--detalle');
    // C8: chevron del sprite, no el carácter de texto.
    await expect(grupo.locator('.analisis-grupo__summary .analisis-grupo__chevron')).toHaveCount(1);
    await grupo.locator('summary').click();

    const cuerpo = grupo.locator('.analisis-grupo__body');
    // C2b: la comparación es lista, no tabla. C2: cada bloque es una card v2.
    await expect(cuerpo.locator('table')).toHaveCount(0);
    await expect(cuerpo.locator('.comparacion__fila').first()).toBeVisible();
    await expect(cuerpo.locator('#analisis-comparacion-title')).toHaveJSProperty('tagName', 'H3');
    await expect(cuerpo.locator('.analisis__section').first()).toHaveCSS('border-radius', '24px');

    // C11: registrar un gasto SIN salir de Análisis no cierra lo que se abrió.
    // A 390px, que es donde vive el botón Registrar de la barra inferior.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('[data-action="registrar-abrir-hoja"]');
    await page.waitForSelector('#modal-registrar[data-open]');
    await page.click('[data-action="registrar-abrir"][data-target-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');

    const form = page.locator('#modal-gasto-body form');
    await elegirCategoriaGasto(form);
    await form.locator('[name="monto"]').fill('25000');
    await form.locator('button[type="submit"]').click();
    await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({ timeout: 3_000 });

    await expect(page.locator('.analisis-grupo--detalle')).toHaveJSProperty('open', true);
    await expect(page.locator('.analisis-grupo--detalle .comparacion__fila').first()).toBeVisible();
  });

  test('sin ningún dato, Análisis muestra un único empty state y su CTA abre el registro de gasto (ANL.2d)', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#analisis');
    await page.waitForSelector('#sec-analisis.active', { timeout: 10_000 });

    // Un solo empty state: sin hero de score, sin patrimonio, sin colapsables.
    const empty = page.locator('.analisis-empty');
    await expect(empty).toBeVisible();
    await expect(empty.locator('.analisis-empty__title')).toHaveText('Aún no hay suficientes datos');
    await expect(page.locator('.score-hero')).toHaveCount(0);
    await expect(page.locator('.patri-card')).toHaveCount(0);
    await expect(page.locator('#panel-analisis .analisis-grupo')).toHaveCount(0);

    // El CTA reutiliza la acción global de gasto: abre el modal.
    await empty.locator('[data-action="nuevo-gasto"]').click();
    await page.waitForSelector('#modal-gasto[data-open]');
  });

});

// ── SUITE 12f: Por pagar - pagar en lote lo vencido (CAL.5a, ficha 05) ───────
// La tarjeta bajo el hero aparece con dos o más gastos fijos vencidos sin
// registrar; el modal los lista todos marcados y, al confirmar, se registran
// juntos resolviendo la cuenta una sola vez (con una sola cuenta ni se
// pregunta: regla de cuenta única del helper).

test.describe('Por pagar - pago en lote (CAL.5a, mudado en la ficha 05)', () => {
  /** Siembra dos fijos vencidos (día 1, siempre <= hoy) y una cuenta con saldo. */
  async function sembrarLote(page) {
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [{
        id: 'cta-lote-e2e', nombre: 'Ahorros E2E', tipo: 'ahorros',
        banco: 'Bancolombia', saldo: 500000, activa: true,
      }],
      ingresos: [],
      gastos:   [],
      compromisos: [
        {
          id: 'lote-a-e2e', tipo: 'fijo', descripcion: 'Arriendo Lote E2E',
          monto: 100000, frecuencia: 'Mensual', diaPago: 1,
        },
        {
          id: 'lote-b-e2e', tipo: 'fijo', descripcion: 'Internet Lote E2E',
          monto: 50000, frecuencia: 'Mensual', diaPago: 1,
        },
      ],
      metas: [],
    });
  }

  test('registra los dos pagos juntos y la tarjeta desaparece', async ({ page }) => {
    await sembrarLote(page);
    await page.goto('/#compromisos');
    await page.waitForSelector('#lista-compromisos', { timeout: 10_000 });

    const lote = page.locator('.cal-lote');
    await expect(lote).toBeVisible({ timeout: 3_000 });
    await expect(lote.locator('.cal-lote__title')).toHaveText('2 pagos ya vencieron');
    // DIS.11 C5: cuánto suma, antes de abrir el flujo.
    await expect(lote.locator('.cal-lote__monto')).toHaveText('$150.000');

    await lote.locator('[data-action="compromisos-pagar-lote"]').click();

    const modal = page.locator('#modal-pago-lote');
    await expect(modal).toBeVisible({ timeout: 3_000 });
    await expect(modal.locator('.lote-row')).toHaveCount(2);
    await expect(modal.locator('[data-role="lote-total"]')).toContainText('$150.000');

    await modal.locator('[data-action="compromisos-confirmar-lote"]').click();

    // Una sola cuenta con saldo suficiente: sin picker ni confirmación.
    await expect(page.locator('.cal-lote')).toHaveCount(0, { timeout: 5_000 });
    // Los dos fijos viran a "Pagado este mes" (ficha 05: el chip mira el mes).
    await expect(page.locator('.deuda-card__chips .chip').first()).toContainText('Pagado este mes');

    // El saldo de la cuenta bajó por el total del lote (500.000 - 150.000).
    await page.locator('.nav-item[href="#tesoreria"]').first().click();
    await expect(page.locator('.cuenta-card__saldo').first())
      .toHaveText('$350.000', { timeout: 5_000 });
  });

  test('desmarcar un pendiente recalcula el total y el texto del botón', async ({ page }) => {
    await sembrarLote(page);
    await page.goto('/#compromisos');
    await page.waitForSelector('#lista-compromisos', { timeout: 10_000 });

    await page.locator('[data-action="compromisos-pagar-lote"]').click();
    const modal = page.locator('#modal-pago-lote');
    await expect(modal).toBeVisible({ timeout: 3_000 });

    await modal.locator('.lote-row__check').first().uncheck();
    await expect(modal.locator('[data-role="lote-total"]')).toContainText('$50.000');
    await expect(modal.locator('[data-role="lote-cta-texto"]')).toHaveText('Registrar 1 pago');

    await modal.locator('[data-action="compromisos-confirmar-lote"]').click();

    // Queda uno solo pendiente: la tarjeta del lote ya no tiene sentido.
    await expect(page.locator('.cal-lote')).toHaveCount(0, { timeout: 5_000 });
    // Y el pago quedó registrado: el fijo que sí se pagó vira su chip. El hero
    // del Calendario ya no cuenta lo pagado (ficha 08: mide el flujo del mes,
    // no el progreso), así que la prueba mira donde el dato vive ahora.
    await expect(page.locator('.deuda-card').filter({ hasText: 'Internet Lote E2E' }).locator('.chip').first())
      .toContainText('Pagado este mes', { timeout: 5_000 });
  });
});

// ── SUITE 12f-bis: el lote también cubre deudas y se ofrece desde Inicio (CAL.5b) ──
// Dos ampliaciones del mismo flujo: una deuda entra al lote por su cuota (y el
// abono baja su saldoTotal, no solo el de la cuenta), y el bloque "Pendientes
// del mes" de Inicio abre el mismo modal sin navegar. Desde la ficha 05 (ADR
// 069) el lote es de "Por pagar", así que Inicio ya no lo pide por EventBus.

test.describe('Lote con deudas y entrada desde Inicio (CAL.5b)', () => {
  /** Un fijo y una deuda, ambos vencidos el día 1, con una cuenta que alcanza. */
  async function sembrarMixto(page) {
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [{
        id: 'cta-5b-e2e', nombre: 'Ahorros E2E', tipo: 'ahorros',
        banco: 'Bancolombia', saldo: 500000, activa: true,
      }],
      ingresos: [],
      gastos:   [],
      compromisos: [
        {
          id: 'fijo-5b-e2e', tipo: 'fijo', descripcion: 'Arriendo 5b E2E',
          monto: 100000, frecuencia: 'Mensual', diaPago: 1,
        },
        {
          id: 'deuda-5b-e2e', tipo: 'deuda-entidad', descripcion: 'Visa 5b E2E',
          cuotaMensual: 80000, saldoTotal: 400000, frecuencia: 'Mensual', diaPago: 1,
        },
      ],
      metas: [],
    });
  }

  test('la deuda entra al lote por su cuota y el abono baja su saldoTotal', async ({ page }) => {
    await sembrarMixto(page);
    await page.goto('/#compromisos');
    await page.waitForSelector('#lista-compromisos', { timeout: 10_000 });

    const lote = page.locator('.cal-lote');
    await expect(lote).toBeVisible({ timeout: 3_000 });
    // 100.000 del fijo + 80.000 de la cuota de la deuda (no su saldo de 400.000).
    await expect(lote.locator('.cal-lote__monto')).toHaveText('$180.000');

    await lote.locator('[data-action="compromisos-pagar-lote"]').click();
    const modal = page.locator('#modal-pago-lote');
    await expect(modal).toBeVisible({ timeout: 3_000 });
    await expect(modal.locator('.lote-row')).toHaveCount(2);
    await expect(modal.locator('.lote-row__sub')).toContainText(['Vencía el 1', 'Cuota de la deuda, vencía el 1']);
    await expect(modal.locator('.lote-intro')).toContainText('baja su saldo');

    await modal.locator('[data-action="compromisos-confirmar-lote"]').click();
    await expect(page.locator('.cal-lote')).toHaveCount(0, { timeout: 5_000 });

    // save() está debounced 200ms: se consulta el estado persistido con poll.
    await expect.poll(async () => {
      const s = await leerEstado(page);
      const d = s.compromisos.find(c => c.id === 'deuda-5b-e2e');
      return { saldo: d.saldoTotal, cuenta: s.cuentas[0].saldo };
    }, { timeout: 5_000 }).toEqual({ saldo: 320000, cuenta: 320000 });
  });

  test('Inicio ofrece el mismo lote sin salir del dashboard', async ({ page }) => {
    await sembrarMixto(page);
    await page.goto('/#dash');
    // El proyecto corre a 1280, así que acá manda la tarjeta fusionada de
    // DSK.1d (ADR 070 D8): mismo botón y mismo flujo, dentro de "Lo que
    // tienes que pagar" en vez de dentro de "Pendientes del mes". La cifra
    // en el texto es lo que el lote va a pagar.
    await page.waitForSelector('#panel-vencidos.obligaciones-card', { timeout: 10_000 });

    const cta = page.locator('.vencidos-card__pagar');
    await expect(cta).toHaveText('Pagar lo vencido · $180.000');
    await cta.click();

    const modal = page.locator('#modal-pago-lote');
    await expect(modal).toBeVisible({ timeout: 3_000 });
    await expect(modal.locator('.lote-row')).toHaveCount(2);
    // Sin navegar: el hash sigue siendo el del dashboard.
    expect(new URL(page.url()).hash).toBe('#dash');

    await modal.locator('[data-action="compromisos-confirmar-lote"]').click();

    // Registrado el lote, el grupo de vencidos se vacía solo (ya no hay nada
    // pendiente este mes) sin recargar ni cambiar de sección.
    await expect(page.locator('.obligaciones-card__lb--vencido')).toHaveCount(0, { timeout: 5_000 });
    await expect(page.locator('.vencidos-card__pagar')).toHaveCount(0);
  });
});

// ── SUITE 12f-ter: pagos automáticos al abrir la app (PA.1a, ADR 052) ───────
// El compromiso marcado como débito automático no se registra solo: al abrir,
// Finko abre la hoja con lo vencido ya resuelto (monto, cuenta y fecha real) y
// el usuario confirma de un toque. Lo que la cuenta no alcanza a cubrir llega
// bloqueado y con el motivo escrito, nunca registrado a medias.

test.describe('Pagos automáticos al abrir (PA.1a)', () => {
  /**
   * Dos débitos automáticos vencidos el día 1 sobre la misma cuenta de 500.000:
   * el primero cabe (100.000), el segundo no (900.000). El orden importa: el
   * saldo se consume en cascada.
   */
  async function sembrarAutomaticos(page) {
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [{
        id: 'cta-pa1-e2e', nombre: 'Ahorros PA1', tipo: 'ahorros',
        banco: 'Bancolombia', saldo: 500000, activa: true,
      }],
      ingresos: [],
      gastos:   [],
      compromisos: [
        {
          id: 'auto-ok-e2e', tipo: 'fijo', descripcion: 'Netflix PA1',
          monto: 100000, frecuencia: 'Mensual', diaPago: 1,
          debitoAutomatico: true, cuentaDebitoId: 'cta-pa1-e2e',
        },
        {
          id: 'auto-sin-saldo-e2e', tipo: 'fijo', descripcion: 'Arriendo PA1',
          monto: 900000, frecuencia: 'Mensual', diaPago: 1,
          debitoAutomatico: true, cuentaDebitoId: 'cta-pa1-e2e',
        },
      ],
      metas: [],
    });
  }

  test('la hoja se abre sola, confirma con la fecha real y descuenta la cuenta', async ({ page }) => {
    await sembrarAutomaticos(page);
    await page.goto('/');

    // El modal cerrado sigue en el DOM con opacity 0 (contrato de modals.css),
    // así que el estado se lee por `[data-open]`, no por visibilidad.
    await page.waitForSelector('#modal-automaticos[data-open]', { timeout: 10_000 });
    const hoja = page.locator('#modal-automaticos');
    // Dos compromisos por los dos meses de la ventana del catch-up (ADR 052 D1).
    await expect(hoja.locator('.lote-row')).toHaveCount(4);

    // Solo lo que la cuenta cubre viene marcado; el resto llega bloqueado y explicado.
    await expect(hoja.locator('[data-role="auto-total"]')).toContainText('$200.000');
    await expect(hoja.locator('[data-role="auto-cta-texto"]')).toHaveText('Confirmar 2 movimientos');
    const bloqueada = hoja.locator('.lote-row--bloqueada');
    await expect(bloqueada).toHaveCount(2);
    await expect(bloqueada.first().locator('.lote-row__sub')).toContainText('le faltan');
    await expect(hoja.locator('.form-hint--danger')).toContainText('no se pueden registrar');

    await hoja.locator('[data-action="agenda-confirmar-automaticos"]').click();
    await page.waitForSelector(modalCerrado('modal-automaticos'), { timeout: 5_000 });

    // Cada gasto queda fechado el día de SU vencimiento, no hoy, y la cuenta baja.
    const prefijoMes = hoyLocal().slice(0, 7);
    await expect.poll(async () => {
      const s = await leerEstado(page);
      const g = s.gastos.filter(x => x.compromisoId === 'auto-ok-e2e');
      return { fechas: g.map(x => x.fecha).sort(), montos: g.map(x => x.monto), cuenta: s.cuentas[0].saldo, gastos: s.gastos.length };
    }, { timeout: 5_000 }).toMatchObject({ montos: [100000, 100000], cuenta: 300000, gastos: 2 });

    // El del mes en curso lleva el día 1 de este mes; el otro, el del mes anterior.
    const fechas = (await leerEstado(page)).gastos.map(g => g.fecha).sort();
    expect(fechas[1]).toBe(`${prefijoMes}-01`);
  });

  test('sin nada vencido la hoja no aparece', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await expect(page.locator('#modal-automaticos[data-open]')).toHaveCount(0);
  });
});

// ── SUITE 12f-quater: créditos automáticos al abrir la app (PA.1b, ADR 052) ─
// El ingreso fijo marcado como crédito automático es el mismo problema visto
// del otro lado: al abrir, la misma hoja de PA.1a lo deja listo con su fecha
// real y su cuenta, y el usuario lo confirma de un toque. Un ingreso sin
// cuenta llega bloqueado, nunca registrado a ciegas.

test.describe('Créditos automáticos al abrir (PA.1b)', () => {
  async function sembrarCredito(page) {
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [{
        id: 'cta-pa1b-e2e', nombre: 'Ahorros PA1b', tipo: 'ahorros',
        banco: 'Bancolombia', saldo: 500000, activa: true,
      }],
      ingresos: [{
        id: 'credito-ok-e2e', descripcion: 'Salario PA1b',
        monto: 3000000, frecuencia: 'Mensual', diaPago: 1,
        creditoAutomatico: true, cuentaId: 'cta-pa1b-e2e',
      }],
      gastos:      [],
      compromisos: [],
      metas:       [],
    });
  }

  test('la hoja trae el crédito con signo +, confirma y abona la cuenta', async ({ page }) => {
    await sembrarCredito(page);
    await page.goto('/');

    await page.waitForSelector('#modal-automaticos[data-open]', { timeout: 10_000 });
    const hoja = page.locator('#modal-automaticos');
    // Dos meses de ventana de catch-up (ADR 052 D1), igual que PA.1a.
    await expect(hoja.locator('.lote-row')).toHaveCount(2);
    await expect(hoja.locator('.lote-row__amount').first()).toHaveText('+$3.000.000');
    await expect(hoja.locator('[data-role="auto-cta-texto"]')).toHaveText('Confirmar 2 movimientos');

    await hoja.locator('[data-action="agenda-confirmar-automaticos"]').click();
    await page.waitForSelector(modalCerrado('modal-automaticos'), { timeout: 5_000 });

    const prefijoMes = hoyLocal().slice(0, 7);
    await expect.poll(async () => {
      const s = await leerEstado(page);
      const ip = s.ingresosPuntuales.filter(x => x.ingresoId === 'credito-ok-e2e');
      return { fechas: ip.map(x => x.fecha).sort(), montos: ip.map(x => x.monto), cuenta: s.cuentas[0].saldo, ingresosPuntuales: s.ingresosPuntuales.length };
    }, { timeout: 5_000 }).toMatchObject({ montos: [3000000, 3000000], cuenta: 6500000, ingresosPuntuales: 2 });

    const fechas = (await leerEstado(page)).ingresosPuntuales.map(ip => ip.fecha).sort();
    expect(fechas[1]).toBe(`${prefijoMes}-01`);
  });

  test('sin cuenta asignada el crédito llega bloqueado y no se registra', async ({ page }) => {
    await sembrar(page, {
      version: 1, perfil: { nombre: 'TestUser', smmlv: 1750905 }, onboarded: true,
      cuentas: [{ id: 'c1', nombre: 'Ahorros', tipo: 'ahorros', banco: 'Bancolombia', saldo: 500000, activa: true }],
      ingresos: [{
        id: 'credito-sin-cuenta-e2e', descripcion: 'Freelance PA1b',
        monto: 1000000, frecuencia: 'Mensual', diaPago: 1, creditoAutomatico: true,
      }],
      gastos: [], compromisos: [], metas: [], ingresosPuntuales: [],
    });
    await page.goto('/');

    await page.waitForSelector('#modal-automaticos[data-open]', { timeout: 10_000 });
    const hoja = page.locator('#modal-automaticos');
    await expect(hoja.locator('.lote-row--bloqueada').first().locator('.lote-row__sub')).toContainText('elige a cuál llega');

    await expect.poll(
      async () => ((await leerEstado(page)).ingresosPuntuales ?? []).length,
      { timeout: 2_000 },
    ).toBe(0);
  });
});

// ── SUITE 12g: Gastos - gastos frecuentes y "Repetir" (TX.12) ────────────────
// El gasto cotidiano (almuerzo, café, Uber) se repite; el formulario ofrece
// chips derivados del historial que prellenan todo, y cada fila de la lista
// ofrece "Repetir" para una fila puntual. Ninguno pide un dato nuevo.

test.describe('Gastos - gastos frecuentes y Repetir (TX.12)', () => {
  /**
   * ISO 'YYYY-MM-DD' de hace N días, **sin salir del mes en curso**: la lista
   * de gastos muestra el mes actual, así que una fecha del mes anterior deja
   * la lista vacía y el test falla según el día en que se corra (los primeros
   * días del mes, siempre). El tope en el día 1 mantiene el gasto visible.
   */
  function isoHaceNDias(n) {
    const d = new Date();
    d.setDate(Math.max(d.getDate() - n, 1));
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  async function sembrarTx12(page, fechas) {
    await sembrar(page, {
      version:   1,
      perfil:    { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [{
        id: 'cta-tx12-e2e', nombre: 'Bancolombia', tipo: 'ahorros',
        banco: 'Bancolombia', saldo: 500000, activa: true,
      }],
      ingresos: [],
      gastos: [
        // 3 repeticiones de "Mercado" $15.000: dispara el chip de frecuentes.
        { id: 'f1', categoria: 'Mercado', monto: 15000, fecha: fechas[0], cuentaId: 'cta-tx12-e2e', nota: '' },
        { id: 'f2', categoria: 'Mercado', monto: 15000, fecha: fechas[1], cuentaId: 'cta-tx12-e2e', nota: '' },
        { id: 'f3', categoria: 'Mercado', monto: 15000, fecha: fechas[2], cuentaId: 'cta-tx12-e2e', nota: '' },
        // 1 gasto puntual distinto, para probar "Repetir" desde su fila.
        { id: 'g1', categoria: 'Transporte', monto: 20000, fecha: fechas[3], cuentaId: 'cta-tx12-e2e', nota: 'Uber al trabajo' },
      ],
      compromisos: [],
      metas: [],
    });
  }

  test('chip de gasto frecuente prellena monto, categoría y cuenta', async ({ page }) => {
    await sembrarTx12(page, [isoHaceNDias(10), isoHaceNDias(8), isoHaceNDias(6), isoHaceNDias(4)]);
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');
    const form = page.locator('#modal-gasto-body form');

    const chip = form.locator('.gastos-frecuentes__chip');
    await expect(chip).toHaveCount(1);
    await expect(chip).toContainText('Mercado');
    await expect(chip).toContainText('$15.000');

    await chip.click();

    await expect(form.locator('[name="monto"]')).toHaveValue('15000');
    await expect(form.locator('input[name="categoria"][value="Mercado"]')).toBeChecked();
    await expect(form.locator('input[name="cuentaId"][value="cta-tx12-e2e"]')).toBeChecked();

    await form.locator('button[type="submit"]').click();
    await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({ timeout: 3_000 });

    // 4 sembrados (3 Mercado + 1 Transporte) + el Mercado nuevo repetido.
    await expect(page.locator('#lista-gastos [data-action="repetir-gasto"]')).toHaveCount(5, { timeout: 3_000 });

    await page.goto('/#tesoreria');
    await expect(page.locator('.cuenta-card__saldo').first()).toHaveText('$485.000', { timeout: 5_000 });
  });

  test('"Repetir" desde una fila abre el modal en modo creación, prellenado y sin chips de frecuentes', async ({ page }) => {
    await sembrarTx12(page, [isoHaceNDias(10), isoHaceNDias(8), isoHaceNDias(6), isoHaceNDias(4)]);
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    const filaTransporte = page.locator('#lista-gastos article', { hasText: 'Transporte' });
    await filaTransporte.locator('[data-action="repetir-gasto"]').click();

    await page.waitForSelector('#modal-gasto[data-open]');
    await expect(page.locator('#modal-gasto .modal__title')).toHaveText('Repetir gasto');

    const form = page.locator('#modal-gasto-body form');
    // Sin sugerencias en este flujo: el usuario ya eligió qué repetir, aunque
    // el historial sí tenga un patrón frecuente ("Mercado").
    await expect(form.locator('.gastos-frecuentes__chip')).toHaveCount(0);

    await expect(form.locator('[name="monto"]')).toHaveValue('20000');
    await expect(form.locator('input[name="categoria"][value="Transporte"]')).toBeChecked();
    await expect(form.locator('[name="nota"]')).toHaveValue('Uber al trabajo');
    // Fecha HOY, no la del gasto original (es un registro nuevo).
    const hoyIso = isoHaceNDias(0);
    await expect(form.locator('#gasto-fecha')).toHaveValue(hoyIso);

    await form.locator('button[type="submit"]').click();
    await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({ timeout: 3_000 });

    // 2 filas de "Transporte" ahora: la original + la repetida.
    await expect(page.locator('#lista-gastos article', { hasText: 'Transporte' })).toHaveCount(2, { timeout: 3_000 });

    await page.goto('/#tesoreria');
    // 500.000 - 20.000 (repetida) = 480.000 (el gasto original ya estaba
    // sembrado sin descontar saldo, mismo criterio que otros fixtures del suite).
    await expect(page.locator('.cuenta-card__saldo').first()).toHaveText('$480.000', { timeout: 5_000 });
  });
});

// ── SUITE 1f: Metas - editar sin destruir (EDIT.1a) ──────────────────────────
// Antes, corregir un nombre o un objetivo mal escrito obligaba a eliminar y
// recrear la meta, perdiendo el progreso acumulado. Ahora "Editar" reusa el
// mismo formulario, prellenado, y conserva montoActual tal cual.

test.describe('Metas - editar sin destruir (EDIT.1a)', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#metas');
    await expect(page.locator('#sec-metas.active')).toBeVisible();
  });

  test('editar prellena los campos actuales y actualiza nombre/objetivo/fecha', async ({ page }) => {
    await page.locator('#topbar-primario[data-action="nueva-meta"]:visible, #sec-metas .section__header [data-action="nueva-meta"]:visible').click();
    await page.waitForSelector('#modal-meta[data-open]');
    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Viaje a la costa');
    await form.locator('#meta-objetivo').fill('2000000');
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    await page.click('.meta-card__secundaria[data-action="editar-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');
    await expect(page.locator('#modal-meta-title')).toHaveText('Editar meta');

    const formEdit = page.locator('#modal-meta-body form');
    await expect(formEdit.locator('#meta-nombre')).toHaveValue('Viaje a la costa');
    await expect(formEdit.locator('#meta-objetivo')).toHaveValue('2000000');
    await expect(formEdit.locator('button[type="submit"]')).toHaveText('Actualizar meta');

    await formEdit.locator('#meta-nombre').fill('Viaje a Cartagena');
    await formEdit.locator('#meta-objetivo').fill('2500000');
    await formEdit.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    // DIS.14: la meta sigue en cero, así que la cifra grande cede su línea a la
    // frase del primer aporte; el objetivo es el extremo de la escala.
    const item = page.locator('#lista-metas .meta-card');
    await expect(item.locator('.meta-card__nombre')).toContainText('Viaje a Cartagena');
    await expect(item.locator('.meta-card__frase')).toContainText('Tu primer aporte');
    await expect(item.locator('.meta-card__escala')).toContainText('$2.500.000');
  });

  test('editar conserva el progreso ya aportado: no lo resetea a 0', async ({ page }) => {
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await crearCuentaEfectivo(page, 1_000_000);

    await page.goto('/#metas');
    await expect(page.locator('#sec-metas.active')).toBeVisible();
    await page.locator('#topbar-primario[data-action="nueva-meta"]:visible, #sec-metas .section__header [data-action="nueva-meta"]:visible').click();
    await page.waitForSelector('#modal-meta[data-open]');
    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Laptop nueva');
    await form.locator('#meta-objetivo').fill('3000000');
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    // Un abono real antes de editar: esto es lo que NO se debe perder.
    await page.click('[data-action="abonar-meta"]');
    await page.waitForSelector('#modal-abono-meta[data-open]');
    await page.locator('#abono-meta-monto').fill('500000');
    await page.locator('#form-abono-meta button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-abono-meta'), { timeout: 5_000 });
    await expect(page.locator('#lista-metas .meta-card__monto')).toHaveText('$500.000');

    // Editar solo el nombre (corregir un typo): el progreso debe seguir intacto.
    await page.click('.meta-card__secundaria[data-action="editar-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');
    const formEdit = page.locator('#modal-meta-body form');
    await expect(formEdit.locator('#meta-objetivo')).toHaveValue('3000000');
    await formEdit.locator('#meta-nombre').fill('Laptop nueva (corregido)');
    await formEdit.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    await expect(page.locator('#lista-metas')).toContainText('Laptop nueva (corregido)');
    await expect(page.locator('#lista-metas .meta-card__monto')).toHaveText('$500.000');
    await expect(page.locator('#lista-metas .meta-card__escala')).toContainText('$3.000.000');

    // El saldo de la cuenta tampoco se tocó al editar (solo el abono lo movió).
    await page.goto('/#tesoreria');
    await expect(page.locator('.cuenta-card__saldo').first()).toHaveText('$500.000', { timeout: 3_000 });
  });

  test('bajar el objetivo por debajo de lo ya aportado marca la meta como completada', async ({ page }) => {
    await page.locator('#topbar-primario[data-action="nueva-meta"]:visible, #sec-metas .section__header [data-action="nueva-meta"]:visible').click();
    await page.waitForSelector('#modal-meta[data-open]');
    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Fondo cámara');
    await form.locator('#meta-objetivo').fill('2000000');
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    await page.click('[data-action="abonar-meta"]');
    await page.waitForSelector('#modal-abono-meta[data-open]');
    await page.locator('#abono-meta-monto').fill('1500000');
    await page.locator('#form-abono-meta button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-abono-meta'), { timeout: 5_000 });

    // Bajar el objetivo a 1.000.000: el aporte de 1.500.000 ya lo supera.
    await page.click('.meta-card__secundaria[data-action="editar-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');
    const formEdit = page.locator('#modal-meta-body form');
    await formEdit.locator('#meta-objetivo').fill('1000000');
    await formEdit.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    // Meta completada. DIS.13 (FM4): ya no desaparece de la app. Ficha 09
    // (ADR 082 D3): tampoco conserva la tarjeta, que cobraba 290px por meta
    // lograda. Baja a la fila compacta, bajo el divisor con contador, y
    // conserva sus dos acciones: la fila entera abre el editar y el eliminar
    // tiene su propio boton.
    await expect(page.locator('#lista-metas .grupo-eyebrow', { hasText: 'Cumplidas' })).toBeVisible();
    const cumplida = page.locator('#lista-metas .meta-fila');
    await expect(cumplida).toContainText('Fondo cámara');
    await expect(cumplida.locator('[data-action="abonar-meta"]')).toHaveCount(0);
    await expect(cumplida.locator('.meta-fila__btn[data-action="editar-meta"]')).toHaveCount(1);
    await expect(cumplida.locator('[data-action="eliminar-meta"]')).toHaveCount(1);
    await expect(page.locator('#lista-metas .meta-card')).toHaveCount(0);
  });

  test('editar preserva la categoría e ícono elegidos', async ({ page }) => {
    await page.locator('#topbar-primario[data-action="nueva-meta"]:visible, #sec-metas .section__header [data-action="nueva-meta"]:visible').click();
    await page.waitForSelector('#modal-meta[data-open]');
    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Boda de mi hermana');
    await form.locator('#meta-objetivo').fill('4000000');
    await elegirChip(form, 'Boda');
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    await page.click('.meta-card__secundaria[data-action="editar-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');
    const formEdit = page.locator('#modal-meta-body form');
    await expect(formEdit.locator('.chip-cat:has(input[value="Boda"]) input')).toBeChecked();
    // El grupo de ícono sigue oculto: "Boda" ya trae su propio glifo.
    await expect(formEdit.locator('#form-group-meta-icono')).toBeHidden();

    await formEdit.locator('#meta-objetivo').fill('4500000');
    await formEdit.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    // DIS.19: la categoría sobrevivió a la edición, y una predefinida se
    // dibuja como silueta (la forma exacta la fija el unit test de metas).
    const glifo = page.locator('#lista-metas .meta-card__arco-icono');
    await expect(glifo).toHaveClass(/meta-card__arco-icono--silueta/);
    await expect(glifo.locator('svg.silueta')).toHaveCount(1);
  });

  // MT.6b (ADR 048 D1 / ADR 064): la subcategoría es el segundo control, y el
  // riesgo que anotó la tarjeta era que cambiar de categoría dejara un
  // subcategoriaId huérfano de otro padre. El fieldset disabled lo evita en
  // el DOM, no solo en la lógica: se verifica guardando y reabriendo.
  test('MT.6b: elegir subcategoría la guarda, y cambiar de categoría la limpia', async ({ page }) => {
    await page.locator('#topbar-primario[data-action="nueva-meta"]:visible, #sec-metas .section__header [data-action="nueva-meta"]:visible').click();
    await page.waitForSelector('#modal-meta[data-open]');
    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Moto nueva');
    await form.locator('#meta-objetivo').fill('8000000');
    await elegirChip(form, 'Vehículo');

    const grupoVehiculo = form.locator('[data-subcategoria-grupo="Vehículo"]');
    await expect(grupoVehiculo).toBeVisible();
    await grupoVehiculo.locator('.chip-cat:has(input[value="vehiculo-moto"])').click();

    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    await page.click('.meta-card__secundaria[data-action="editar-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');
    const formEdit = page.locator('#modal-meta-body form');
    await expect(formEdit.locator('.chip-cat:has(input[value="vehiculo-moto"]) input')).toBeChecked();

    // Cambia a una categoría sin relación con "moto": el grupo de Vehículo se
    // oculta y deshabilita, así que guardar no manda ese subcategoriaId.
    await elegirChip(formEdit, 'Educación');
    await expect(formEdit.locator('[data-subcategoria-grupo="Vehículo"]')).toBeHidden();
    await formEdit.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    await page.click('.meta-card__secundaria[data-action="editar-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');
    const formReabierto = page.locator('#modal-meta-body form');
    await expect(formReabierto.locator('.chip-cat:has(input[value="vehiculo-moto"]) input')).not.toBeChecked();
  });
});

// ── SUITE 1g: Metas - cabeza, orden y un final que pesa poco (ficha 09) ──────
// La tarjeta no se toca. Lo que cambia es la lista: antes las metas salían en
// orden de creación y, como solo cabe una tarjeta y media a 390px, ese orden
// era la respuesta al azar a "¿a cuál le aporto?".

test.describe('Metas - la lista gana cabeza y orden (ADR 082)', () => {
  const ESTADO_METAS_09 = {
    version:   1,
    perfil:    { nombre: 'TestUser', smmlv: 1750905 },
    onboarded: true,
    cuentas:   [{ id: 'c-09', nombre: 'Bancolombia', tipo: 'ahorros', saldo: 5000000, activa: true }],
    ingresos:  [],
    gastos:    [],
    compromisos: [],
    metas: [
      // Creada primero y vence de última: con el orden viejo encabezaba la lista.
      { id: 'm-viaje',  nombre: 'Viaje a Cartagena', montoObjetivo: 3500000, montoActual: 1200000, fechaLimite: '2026-12-15', completada: false },
      { id: 'm-laptop', nombre: 'Laptop nueva',      montoObjetivo: 4200000, montoActual: 3780000, fechaLimite: '2026-09-30', completada: false },
      { id: 'm-curso',  nombre: 'Curso de inglés',   montoObjetivo: 1800000, montoActual: 0,       fechaLimite: null,         completada: false },
      { id: 'm-moto',   nombre: 'Moto',              montoObjetivo: 1400000, montoActual: 1400000, fechaLimite: '2026-05-12', completada: true },
    ],
  };

  test.beforeEach(async ({ page }) => {
    await sembrar(page, ESTADO_METAS_09);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#metas');
    await expect(page.locator('#sec-metas.active')).toBeVisible();
  });

  test('la primera tarjeta es la meta que vence primero, y la franja dice cuánto suman', async ({ page }) => {
    // D1: las tres cifras que la portada de Ahorro ya anunciaba y que la
    // sección perdía al entrar. El alcance va declarado (R82).
    const franja = page.locator('#lista-metas .hero-metas');
    await expect(franja.locator('.hero-metas__label')).toContainText('en tus 3 metas');
    await expect(franja.locator('.hero-metas__valor')).toHaveText('$4.980.000');
    await expect(franja.locator('.hero-metas__meta')).toContainText('$4.520.000');

    // D2: urgencia primero. "Laptop" vence en septiembre y "Viaje" en
    // diciembre, aunque "Viaje" se creó antes.
    const nombres = page.locator('#lista-metas .meta-card__nombre');
    await expect(nombres).toHaveText(['Laptop nueva', 'Viaje a Cartagena', 'Curso de inglés']);

    // La meta sin plazo va al final, bajo su divisor.
    await expect(page.locator('#lista-metas .grupo-eyebrow')).toHaveText(['Con plazo', 'Sin plazo', 'Cumplidas']);
  });

  test('la meta cumplida pesa una fila, no una tarjeta, y su fila abre el editar', async ({ page }) => {
    // D3: 52px en vez de 290. La tarjeta desaparece; la meta, no.
    const fila = page.locator('#lista-metas .meta-fila');
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText('Moto');
    await expect(fila.locator('.meta-fila__monto')).toHaveText('$1.400.000');
    await expect(page.locator('#lista-metas .meta-card--cumplida')).toHaveCount(0);

    const alto = await fila.evaluate(el => Math.round(el.getBoundingClientRect().height));
    expect(alto).toBeLessThan(90);

    await fila.locator('.meta-fila__btn').click();
    await page.waitForSelector('#modal-meta[data-open]');
    await expect(page.locator('#modal-meta-body form #meta-nombre')).toHaveValue('Moto');
  });
});

// ── DSK.10c: una entrada a Ajustes y movimiento de puntero fino ─────────────

test.describe('DSK.10c - el armazón deja de moverse como una app de dedo (ADR 079)', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  /** Estado mínimo con datos en las dos mitades del bento. */
  const SEMILLA = {
    version: 1,
    perfil: { nombre: 'TestUser', smmlv: 1750905 },
    onboarded: true,
    cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 500000, activa: true }],
    ingresos: [],
    gastos: [{ id: 'g1', descripcion: 'Mercado', categoria: 'Mercado', monto: 50000, fecha: '2026-08-10', cuentaId: 'c1', nota: '' }],
    compromisos: [],
    metas: [],
  };

  /** Lee del CSSOM las reglas que levantan una celda del bento al pasar. */
  async function reglasDeLevante(page) {
    return page.evaluate(() => {
      const res = [];
      const walk = (rules, cond) => {
        for (const r of rules) {
          // El orden importa: con anidamiento de CSS, una regla normal
          // también expone `cssRules` (vacío), así que preguntar por él
          // primero se traga todas las reglas y no llega ninguna al filtro.
          if (r.styleSheet) { walk(r.styleSheet.cssRules, cond); continue; }
          if (r.selectorText) {
            if (r.selectorText.includes('bento__cell') && r.selectorText.includes('hover') && r.style.transform) {
              res.push({ cond, sel: r.selectorText, transform: r.style.transform });
            }
            continue;
          }
          if (r.cssRules) { walk(r.cssRules, r.conditionText || cond); }
        }
      };
      walk(document.styleSheets[0].cssRules, '');
      return res;
    });
  }

  // D8: Ajustes tenía tres entradas en la misma pantalla y dos eran un
  // engranaje sin etiqueta. La del saludo ya salía por CSS desde DSK.1a.
  test('Ajustes queda con una sola entrada visible, y es la que lleva etiqueta', async ({ page }) => {
    await sembrarSiVacio(page, SEMILLA);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    // El chrome de escritorio son tres sitios: la barra lateral, la barra
    // superior y el saludo de Inicio. Queda uno, y dice su nombre. (La hoja
    // "Más" lleva su propia entrada, pero es cromo de móvil: acá está a
    // `opacity: 0` y `pointer-events: none`.)
    await expect(page.locator('#topbar a[href="#config"]')).toHaveCount(0);
    await expect(page.locator('.perfil-inicio > .perfil-inicio__ajustes')).toBeHidden();

    const entrada = page.locator('#sidebar a[href="#config"]');
    await expect(entrada).toHaveCount(1);
    await expect(entrada).toBeVisible();
    await expect(entrada).toHaveText('Ajustes');

    // El conmutador de tema se queda arriba: no es navegación.
    await expect(page.locator('.topbar__actions [data-action="theme-toggle"]')).toBeVisible();
  });

  // D9: las celdas se levantaban 2px al pasar el puntero, con `cursor:
  // default`. El gesto prometía un clic que la mayoría no tiene.
  test('solo se levanta la celda del bento que se puede pulsar', async ({ page }) => {
    await sembrarSiVacio(page, SEMILLA);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    const reglas = await reglasDeLevante(page);
    expect(reglas).toHaveLength(1);
    expect(reglas[0].cond).toBe('(hover: hover)');
    expect(reglas[0].sel).toContain(':has(a, button, [data-action])');

    // El selector reparte de verdad. Se prueba sobre celdas construidas y no
    // sobre las de la pantalla: cuáles tienen acción depende de los datos.
    const reparto = await page.evaluate(() => {
      const sel = 'a.bento__cell, .bento__cell:has(a, button, [data-action])';
      const hacer = (html) => {
        const d = document.createElement('div');
        d.className = 'bento__cell';
        d.innerHTML = html;
        return d.matches(sel);
      };
      return {
        conEnlace: hacer('<a href="#movimientos">Ver todos</a>'),
        conBoton: hacer('<button type="button">Revisar</button>'),
        conAccion: hacer('<li data-action="aviso-abrir">Aviso</li>'),
        sinNada: hacer('<p>Solo texto</p>'),
      };
    });
    expect(reparto).toEqual({ conEnlace: true, conBoton: true, conAccion: true, sinNada: false });
  });

  // D10: la cascada retrasa hasta 160ms cinco bloques que en monitor ya caben
  // en el primer pliegue. Bajo el umbral el descubrimiento por desplazamiento
  // sigue siendo real, así que ahí se queda.
  test('la cascada de entrada se retira en monitor y sigue bajo el umbral', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await sembrarSiVacio(page, SEMILLA);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    const animEn = () => page.evaluate(() => {
      const celdas = [...document.querySelectorAll('#sec-dash .bento--dash .bento__cell')]
        .filter(c => !c.hidden);
      return [...new Set(celdas.map(c => getComputedStyle(c).animationName))];
    });

    expect(await animEn()).toEqual(['none']);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    expect(await animEn()).toEqual(['cardIn']);
  });

  // D10: el encogido al pulsar es respuesta táctil. Con puntero fino solo
  // mueve un blanco de 40px de alto mientras se hace clic.
  test('el encogido de la navegación al pulsar queda para puntero grueso', async ({ page }) => {
    await sembrarSiVacio(page, SEMILLA);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    const cond = await page.evaluate(() => {
      let encontrado = null;
      const walk = (rules, c) => {
        for (const r of rules) {
          if (r.styleSheet) { walk(r.styleSheet.cssRules, c); continue; }
          if (r.selectorText) {
            if (r.selectorText === '.nav-item:active') encontrado = c;
            continue;
          }
          if (r.cssRules) { walk(r.cssRules, r.conditionText || c); }
        }
      };
      walk(document.styleSheets[0].cssRules, '');
      return encontrado;
    });
    expect(cond).toBe('(pointer: coarse)');
  });
});

// ── DSK.1d: obligaciones en una sola línea de tiempo ────────────────────────

test.describe('DSK.1d - "Lo que tienes que pagar" (ADR 070 D8/D9)', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  /** Dos vencidos y dos por vencer, el reparto del que salió la auditoría. */
  async function sembrarObligaciones(page) {
    await page.clock.setFixedTime(new Date('2026-03-15T10:00:00'));
    await sembrar(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 500000, activa: true }],
      ingresos: [],
      gastos: [],
      compromisos: [
        { id: 'v1', descripcion: 'Crédito de libre inversión', tipo: 'deuda-entidad', cuotaMensual: 1284500, saldoTotal: 9000000, frecuencia: 'Mensual', diaPago: 13, activo: true },
        { id: 'v2', descripcion: 'Plan familiar Claro', tipo: 'fijo', monto: 189900, frecuencia: 'Mensual', diaPago: 14, activo: true },
        { id: 'p1', descripcion: 'Internet hogar Movistar', tipo: 'fijo', monto: 139900, frecuencia: 'Mensual', diaPago: 16, activo: true },
      ],
      metas: [],
    });
    await page.goto('/#dash');
    await page.waitForSelector('#panel-vencidos.obligaciones-card', { timeout: 10_000 });
  }

  // El defecto que corrige: la misma pregunta partida en dos tarjetas, y para
  // saber cuánto debía en total el usuario tenía que sumar dos cifras.
  test('las dos listas se leen como una sola, con lo vencido al frente', async ({ page }) => {
    await sembrarObligaciones(page);

    const panel = page.locator('#panel-vencidos');
    await expect(panel.locator('.card__title')).toHaveText('Lo que tienes que pagar');
    await expect(page.locator('#panel-prioridades')).toBeHidden();

    const grupos = panel.locator('.prioridades-card__group-label');
    await expect(grupos.first()).toHaveText('Ya se venció');
    await expect(panel.locator('.prioridades-card__item')).toHaveCount(3);

    // Un solo total, y va en el pie con la acción al lado.
    await expect(panel.locator('.vencidos-card__pagar')).toHaveText('Pagar lo vencido · $1.474.400');
    await expect(panel.locator('.obligaciones-card__resto')).toHaveText('3 pagos · en total debes $1.614.300');
  });

  // D9: la tarjeta ES la celda. El defecto medido era su borde 24px por dentro
  // del de la columna de al lado, y el botón a 1px del canto inferior.
  test('el borde cae a plomo con la banda y el botón deja de rozar el canto', async ({ page }) => {
    await sembrarObligaciones(page);

    const medidas = await page.evaluate(() => {
      const celda = document.getElementById('panel-vencidos');
      const banda = document.querySelector('.banda-inicio');
      const boton = celda.querySelector('.vencidos-card__pagar');
      return {
        desfaseIzquierdo: Math.round(celda.getBoundingClientRect().left - banda.getBoundingClientRect().left),
        aireBajoBoton: Math.round(celda.getBoundingClientRect().bottom - boton.getBoundingClientRect().bottom),
        tieneTarjetaDentro: !!celda.querySelector('.vencidos-card'),
        esPlana: celda.classList.contains('bento__cell--flat'),
      };
    });

    expect(medidas).toEqual({
      desfaseIzquierdo: 0,
      aireBajoBoton: 33,
      tieneTarjetaDentro: false,
      esPlana: false,
    });
  });
});

// ── DSK.1c: avisos estrechos + obligaciones anchas (ADR 070 D7) ─────────────

test.describe('DSK.1c - "Atención hoy" deja de ser un 2x2 dependiente del estado', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  const hoyISO = (offsetDias = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  /** Un nudge de distribuir, una alerta de límite y dos obligaciones vencidas. */
  async function sembrarAtencionHoy(page) {
    await sembrar(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 500000, activa: true }],
      ingresos: [{ id: 'i1', descripcion: 'Nómina', monto: 2000000, frecuencia: 'Mensual', categoria: 'Salario', diaPago: new Date().getDate(), activo: true, cuentaId: 'c1', fechaCreacion: '2025-01-01T00:00:00Z' }],
      gastos: [
        { id: 'g1', descripcion: 'Bus', categoria: 'Transporte', monto: 450000, fecha: hoyISO(-1), cuentaId: 'c1', nota: '' },
      ],
      presupuestos: [{ id: 'p1', categoria: 'Transporte', montoMensual: 420000, grupo: 'necesidades' }],
      compromisos: [
        { id: 'v1', descripcion: 'Crédito Bancolombia', tipo: 'deuda-entidad', cuotaMensual: 1284500, frecuencia: 'Mensual', diaPago: new Date(new Date().setDate(new Date().getDate() - 2)).getDate(), activo: true },
        { id: 'v2', descripcion: 'Plan Claro', tipo: 'fijo', monto: 189900, frecuencia: 'Mensual', diaPago: new Date(new Date().setDate(new Date().getDate() - 1)).getDate(), activo: true },
      ],
      metas: [],
    });
    await page.goto('/#dash');
    await page.waitForSelector('#panel-limites:not([hidden])', { timeout: 10_000 });
  }

  // El defecto que corrige: el emparejamiento por tipo (avisos con avisos,
  // listas con listas) solo se daba con los cuatro paneles visibles; con un
  // número impar, media fila quedaba vacía.
  test('avisos en columna estrecha, obligaciones en columna ancha, sin importar cuántos avisos haya', async ({ page }) => {
    await sembrarAtencionHoy(page);

    const medidas = await page.evaluate(() => {
      const avisos = document.querySelector('.atencion-hoy__avisos');
      const obligaciones = document.querySelector('.atencion-hoy__obligaciones');
      const banda = document.querySelector('.banda-inicio');
      return {
        avisosAncho: Math.round(avisos.getBoundingClientRect().width),
        obligacionesAncho: Math.round(obligaciones.getBoundingClientRect().width),
        avisosIzq: Math.round(avisos.getBoundingClientRect().left),
        bandaIzq: Math.round(banda.getBoundingClientRect().left),
        proporcion: obligaciones.getBoundingClientRect().width / avisos.getBoundingClientRect().width,
      };
    });

    // ~4/12 y ~8/12 de los 1376 de contenido: la proporción es lo estable,
    // no el píxel exacto (depende del hueco entre columnas).
    expect(medidas.proporcion).toBeGreaterThan(1.9);
    expect(medidas.proporcion).toBeLessThan(2.15);
    expect(medidas.avisosIzq).toBe(medidas.bandaIzq);

    // Los dos avisos (nudge + límites) están en la columna estrecha; la
    // obligación fusionada (DSK.1d), en la ancha.
    await expect(page.locator('.atencion-hoy__avisos #panel-distribuir-inicio')).toBeVisible();
    await expect(page.locator('.atencion-hoy__avisos #panel-limites')).toBeVisible();
    await expect(page.locator('.atencion-hoy__obligaciones #panel-vencidos')).toBeVisible();
  });

  // Sin ningún aviso visible, la obligación no deja un hueco muerto a su
  // derecha: ocupa la fila entera, la misma silueta que M7 rechazó en
  // Accesos rápidos.
  test('sin avisos visibles, las obligaciones ocupan la fila entera', async ({ page }) => {
    await sembrar(page, {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 500000, activa: true }],
      ingresos: [],
      gastos: [],
      presupuestos: [],
      compromisos: [
        { id: 'v1', descripcion: 'Arriendo', tipo: 'fijo', monto: 900000, frecuencia: 'Mensual', diaPago: new Date(new Date().setDate(new Date().getDate() - 1)).getDate(), activo: true },
      ],
      metas: [],
    });
    await page.goto('/#dash');
    await page.waitForSelector('#panel-vencidos.obligaciones-card', { timeout: 10_000 });

    await expect(page.locator('#panel-distribuir-inicio')).toBeHidden();
    await expect(page.locator('#panel-limites')).toBeHidden();
    await expect(page.locator('#panel-avisos')).toBeHidden();

    const anchos = await page.evaluate(() => ({
      obligaciones: Math.round(document.querySelector('.atencion-hoy__obligaciones').getBoundingClientRect().width),
      banda: Math.round(document.querySelector('.banda-inicio').getBoundingClientRect().width),
    }));
    expect(anchos.obligaciones).toBe(anchos.banda);
  });

  // Móvil no se toca por CSS (ADR 070, alcance desde 1024px): los
  // envoltorios desaparecen de la caja y las celdas siguen apilándose por
  // orden de DOM. Ese orden sí se movió (panel-avisos sube junto a los
  // otros dos avisos, antes quedaba suelto al final): es la misma regla
  // "los avisos primero, las listas después" que ya aplicó IN.9a, que
  // panel-avisos no había seguido porque llegó después.
  test('bajo 1024px los envoltorios desaparecen y el orden del DOM no cambia', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await sembrarAtencionHoy(page);

    const orden = await page.evaluate(() => {
      const wrap = document.querySelector('.atencion-hoy__avisos');
      const sel = '#panel-distribuir-inicio, #panel-limites, #panel-vencidos, #panel-prioridades, #panel-avisos';
      return {
        avisosEsContents: getComputedStyle(wrap).display === 'contents',
        secuencia: [...document.querySelectorAll(sel)].map(c => c.id),
      };
    });
    expect(orden.avisosEsContents).toBe(true);
    expect(orden.secuencia).toEqual([
      'panel-distribuir-inicio', 'panel-limites', 'panel-avisos', 'panel-vencidos', 'panel-prioridades',
    ]);
  });
});
