/**
 * movil-mv2.test.js - Finko móvil 2, primera entrega (ADR 098).
 *
 * Cubre en el navegador lo que los unitarios no pueden medir:
 * - D1-D2: volver al origen real y a la misma altura; por la barra no hay
 *   volver contextual.
 * - D4: la fila de Gastos mide una línea y abre la hoja con sus acciones;
 *   editar desde la hoja abre el formulario del gasto, sin apilar modales.
 * - D5 y D8: el primario del bloque abre el formulario y "Guardar" queda a la
 *   vista, con todas las categorías.
 * - D6: las categorías plegadas dicen cuántas faltan y se abren.
 * - ADR 105: los tipos de Movimientos se pliegan igual y "Fechas" va en la
 *   misma fila; nada se desliza a 320.
 * - ADR 106 (MV2.8a): la fila del título lleva teja, título y crear tonal y
 *   corto; la frase va debajo; a 320 crear queda en "+" y el título no se parte.
 * - ADR 106 D3 (MV2.8b): el ojo va en el encabezado de toda pantalla con
 *   montos, el de los heroes se calla, y Movimientos también enmascara.
 * - ADR 106 D6 (MV2.8c): Movimientos desde "Más" no dice "‹ Inicio".
 * - ADR 107 D5 (MV2.13): un vacío, un mensaje y un botón.
 * - ADR 109 (MV2.9): Mis cuentas en filas con hoja, sin papeleras a la vista.
 * - ADR 110 (MV2.19): Distribuir se abre sobre Inicio, con el pie a la vista y
 *   el motivo de un "Distribuir" apagado; arriba, qué se reparte y desde qué
 *   cuenta; al confirmar, la hoja dice qué quedó. En escritorio sigue navegando.
 * - ADR 111 (MV2.27): el mes del Calendario cabe de 320 a 430, el día se marca
 *   en un círculo, los textos no se parten y un mes vacío con datos conserva
 *   su mensaje.
 * - ADR 112 (CFG.6): Ajustes es un índice de filas que se abren en su sitio, y
 *   lo abierto sobrevive al repintado.
 * - ADR 113 (MV2.20): al bajar, la barra de lentes queda arriba, en Gastos y en
 *   las hijas de Ahorro.
 * - ADR 115 (MV2.5): con el teclado abierto, "Guardar" queda encima.
 * - ADR 116: lo que faltaba del canvas (resaltado al llegar, enlaces de 44,
 *   la pregunta de cada modalidad).
 * - ADR 117: Por pagar por urgencia y en filas con hoja; con el texto al
 *   200 % los montos bajan y las lentes van en dos líneas.
 * - ADR 118: el día del Calendario en su hoja (y reabierto al volver de "Por
 *   pagar"); toda hoja se cierra deslizándola y con el atrás del sistema.
 * - ADR 119: el plan de salida en su hoja y la hoja del gasto con sus datos.
 * - Escritorio no cambia: las piezas nuevas no se ven a 1280.
 * - D13: el camino de Aprender del niño no desborda a lo ancho.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase, leerEstado } from './helpers/estado.js';

/**
 * GAS.5c (ADR 162 D1): tras la categoría va "¿En qué fue?". Elige "Otra
 * cosa" y, si la categoría pregunta, "Necesidad", y llega al recibo.
 * @param {import('@playwright/test').Locator} form
 */
async function pasarDetalle(form) {
  await expect(form).toHaveAttribute('data-etapa-actual', 'detalle');
  const otra = form.locator('[data-etapa="detalle"] fieldset:not([disabled]) .chip-cat', { hasText: 'Otra cosa' });
  if (await otra.count()) await otra.click();
  if (await form.getAttribute('data-etapa-actual') === 'detalle') {
    await form.locator('[data-etapa="detalle"] [data-caracter-grupo] .chip-cat', { hasText: 'Necesidad' }).click();
  }
  await expect(form).toHaveAttribute('data-etapa-actual', 'revisar');
}
import { createInitialState } from '../../modules/core/state.js';

const CUENTAS = [
  { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 900_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
];
const CATEGORIAS = ['Mercado', 'Restaurantes', 'Café', 'Transporte', 'Ropa', 'Mascotas'];

/** Fecha ISO local del mes en curso, el día `dia` (acotado a hoy). */
function fechaDelMes(dia) {
  const d = new Date();
  const ultimo = d.getDate();
  const n = Math.max(1, Math.min(dia, ultimo));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
}

/** 24 gastos del mes en seis categorías: una lista que obliga a desplazarse. */
function gastos() {
  return Array.from({ length: 24 }, (_, i) => ({
    id: `g${i}`,
    monto: 10_000 + i * 1_000,
    categoria: CATEGORIAS[i % CATEGORIAS.length],
    descripcion: `Compra ${i}`,
    fecha: fechaDelMes(28 - i),
    cuentaId: 'c1',
    creado: fechaDelMes(28 - i),
  }));
}

async function seedConGastos(page) {
  await sembrar(page, estadoBase({ cuentas: CUENTAS, gastos: gastos() }));
}

/** Cuatro tipos en Movimientos: gasto, ingreso, aporte y transferencia. */
async function seedConTipos(page) {
  await sembrar(page, estadoBase({
    cuentas: [...CUENTAS, { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' }],
    gastos: gastos().slice(0, 3),
    ingresosPuntuales: [{ id: 'ip1', descripcion: 'Venta bici', monto: 300_000, categoria: 'Venta', fecha: fechaDelMes(2), cuentaId: 'c1' }],
    ahorro: { fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 100_000 }, aportes: [{ id: 'a1', monto: 100_000, fecha: fechaDelMes(3) }] },
    transferencias: [{ id: 't1', cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: 50_000, fecha: fechaDelMes(4) }],
  }));
}

/** Mis cuentas con dos cuentas, una fuente fija y un ingreso puntual. */
async function seedMisCuentas(page) {
  await sembrar(page, estadoBase({
    cuentas: [...CUENTAS, { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true,
      aplica4x1000: true, fechaCreacion: '2026-07-01T00:00:00.000Z' }],
    ingresos: [{ id: 'i1', descripcion: 'Salario', categoria: 'Salario', monto: 4_200_000, frecuencia: 'Mensual', diaPago: 30, activo: true }],
    ingresosPuntuales: [{ id: 'ip1', descripcion: 'Venta bici', monto: 300_000, categoria: 'Venta', fecha: fechaDelMes(2), cuentaId: 'c1' }],
  }));
}

/**
 * Un ingreso que se cobra hoy: Inicio ofrece distribuirlo. Con `cuentas`, varias
 * cuentas y el ingreso sin la suya guardada (la cuenta se pregunta al empezar).
 */
async function seedDistribuir(page, cuentas = null) {
  await sembrar(page, estadoBase({
    cuentas: cuentas ?? CUENTAS,
    ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', diaPago: new Date().getDate(), activo: true, cuentaId: cuentas ? null : 'c1' }],
    ahorro: { fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 },
    config: { presetDistribucion: '50-30-20' },
  }));
}

/**
 * Calendario con un mes cargado (MV2.27): ocho pagos con nombres largos, un
 * ingreso y un abono parcial. `inactivo` deja un compromiso que no cae en
 * ningún mes: el usuario tiene datos (el propósito no se ve) y el mes está
 * vacío.
 */
async function seedCalendario(page, { inactivo = false } = {}) {
  const fijo = (id, descripcion, diaPago, monto) => ({ id, tipo: 'fijo', descripcion, monto, frecuencia: 'Mensual', diaPago, activo: !inactivo });
  await sembrar(page, estadoBase({
    cuentas: CUENTAS,
    ingresos: inactivo ? [] : [{ id: 'i1', descripcion: 'Salario', monto: 4_200_000, frecuencia: 'Mensual', diaPago: 18, activo: true }],
    compromisos: inactivo ? [fijo('f1', 'Arriendo', 5, 1_350_000)] : [
      fijo('f1', 'Arriendo', 5, 1_350_000), fijo('f2', 'Gimnasio', 2, 89_900), fijo('f3', 'EPM servicios', 18, 236_000),
      fijo('f4', 'Plan Claro', 29, 65_000), fijo('f5', 'Internet', 7, 98_000), fijo('f6', 'Seguro', 21, 120_000),
      { id: 'd1', tipo: 'deuda-personal', descripcion: 'Préstamo de mi hermano', saldoTotal: 1_200_000, cuotaMensual: 300_000, tasa: 0, frecuencia: 'Mensual', diaPago: 18, activo: true },
      { id: 'd2', tipo: 'deuda-entidad', descripcion: 'Crédito libre inversión', saldoTotal: 9_000_000, cuotaMensual: 510_000, frecuencia: 'Mensual', diaPago: 10, activo: true },
    ],
    gastos: inactivo ? [] : [{ id: 'g1', compromisoId: 'd1', descripcion: 'Abono', monto: 100_000, categoria: 'Otro', fecha: fechaDelMes(1), cuentaId: 'c1' }],
  }));
}

/**
 * Por pagar con dos vencidos (días 1 y 2), un fijo pagado y una deuda que
 * vence a fin de mes (ADR 117).
 */
async function seedPorPagar(page) {
  await sembrar(page, estadoBase({
    cuentas: CUENTAS,
    compromisos: [
      { id: 'f1', tipo: 'fijo', descripcion: 'Arriendo', monto: 1_200_000, frecuencia: 'Mensual', diaPago: 1, activo: true },
      { id: 'd1', tipo: 'deuda-entidad', descripcion: 'Tarjeta Visa Bancolombia', saldoTotal: 3_200_000, cuotaMensual: 420_000,
        frecuencia: 'Mensual', diaPago: 2, activo: true, tasa: 0.28, tasaUnidad: 'EA', categoria: 'Tarjeta de crédito' },
      { id: 'f3', tipo: 'fijo', descripcion: 'Netflix', monto: 40_000, frecuencia: 'Mensual', diaPago: 1, activo: true },
    ],
    gastos: [{ id: 'g1', compromisoId: 'f3', descripcion: 'Netflix', monto: 40_000, categoria: 'Otro', fecha: fechaDelMes(1), cuentaId: 'c1' }],
  }));
}

const scrollY = (page) => page.evaluate(() => window.scrollY);

/** Renglones que ocupa el texto de un elemento. */
const renglones = (loc) => loc.evaluate((el) => {
  const r = document.createRange();
  r.selectNodeContents(el);
  const tops = [...r.getClientRects()].filter(x => x.width > 0).map(x => x.top).sort((a, b) => a - b);
  return tops.filter((t, i) => i === 0 || t - tops[i - 1] > 4).length;
});

test.describe('MV2 - móvil (ADR 098)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('desde el contenido, volver regresa al origen y a la misma altura (D1-D2)', async ({ page }) => {
    await seedConGastos(page);
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active #lista-gastos .list-item', { timeout: 10_000 });

    const historial = page.locator('#sec-gast [data-action="gastos-ver-historial"]');
    // Al fondo de la lista, y quieto: los días fuera de pantalla miden una
    // estimación (`content-visibility`) hasta que se pintan, así que el alto
    // del documento se acomoda unos cuadros después de cada desplazamiento.
    await historial.scrollIntoViewIfNeeded();
    await expect.poll(async () => {
      const antes = await scrollY(page);
      await page.waitForTimeout(250);
      return antes === await scrollY(page);
    }).toBe(true);
    expect(await scrollY(page)).toBeGreaterThan(300);
    // La fila que se estaba leyendo, y dónde estaba en la pantalla.
    const leida = await page.evaluate(() => {
      const el = [...document.querySelectorAll('#lista-gastos .list-item[data-id]')]
        .find(f => { const r = f.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; });
      return el ? { id: el.dataset.id, top: Math.round(el.getBoundingClientRect().top) } : null;
    });
    expect(leida).not.toBeNull();

    // Clic sin desplazar: es el toque del usuario sobre lo que está viendo.
    await historial.evaluate(el => el.click());
    await expect(page.locator('#sec-movimientos.active')).toBeVisible();
    // La sección nueva arranca arriba, no a la altura de la anterior.
    await expect.poll(() => scrollY(page)).toBeLessThan(5);

    const volver = page.locator('#sec-movimientos .section__volver--contexto');
    await expect(volver).toHaveText('Gastos');
    await expect(page.locator('#sec-movimientos > .section__volver:not(.section__volver--contexto)')).toBeHidden();

    await volver.click();
    await expect(page.locator('#sec-gast.active')).toBeVisible();
    // De vuelta en la misma fila, a la misma altura de la pantalla.
    await expect.poll(() => page.evaluate((id) => Math.round(
      document.querySelector(`#lista-gastos .list-item[data-id="${id}"]`).getBoundingClientRect().top), leida.id))
      .toBeGreaterThan(leida.top - 4);
    // GAS.8b (ADR 182 D2): con las semanas anteriores plegadas la lista es
    // corta y la fila puede caer en el primer día, que entra con su cascada
    // (8 px que se asientan en ~100 ms): se mide ya quieta.
    await expect.poll(() => page.evaluate((id) => Math.round(
      document.querySelector(`#lista-gastos .list-item[data-id="${id}"]`).getBoundingClientRect().top), leida.id))
      .toBeLessThan(leida.top + 4);
  });

  test('por la barra inferior no aparece volver contextual', async ({ page }) => {
    await seedConGastos(page);
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });
    await page.click('.sidebar .nav-item[href="#dash"]');
    await expect(page.locator('#sec-dash.active')).toBeVisible();
    await expect(page.locator('.section__volver--contexto')).toHaveCount(0);
  });

  test('la fila mide una línea y abre la ficha del gasto, que es su formulario (D4, ADR 142 D6)', async ({ page }) => {
    await seedConGastos(page);
    await page.goto('/#gast');
    const fila = page.locator('#lista-gastos .list-item').first();
    await expect(fila).toBeVisible({ timeout: 10_000 });

    const caja = await fila.boundingBox();
    expect(caja.height).toBeLessThan(90);
    await expect(fila.locator('.list-item__action')).toBeHidden();

    await fila.locator('.list-item__detalle').click();
    // FORM.2d (ADR 142 D6): la ficha es el formulario; editar ya no reabre el de crear.
    const hoja = page.locator('#modal-gasto[data-open]');
    await expect(hoja).toHaveCount(1);
    // GAS.15f (ADR 194 D1): el nombre del gasto arriba; "Gasto registrado" en el papel.
    await expect(hoja.locator('[data-recibo-titulo]')).toHaveText('Gasto registrado');
    await expect(hoja.locator('[data-gasto-sub]')).toContainText('toca un dato para cambiarlo');
    // GAS.13b (ADR 188 D2): "Repetir este gasto" y la papelera a su lado.
    await expect(hoja.locator('.ficha__acciones .btn')).toHaveText(['Repetir este gasto']);
    await expect(hoja.locator('.modal__header [data-gasto-papelera]')).toHaveAttribute('aria-label', 'Eliminar este gasto');
    await expect(hoja.locator('.ficha__salida')).toContainText('en Movimientos');
    await expect(page.locator('#gasto-monto')).not.toHaveValue('');

    // Un dato se cambia en dos toques y se puede deshacer.
    await hoja.locator('#gasto-fila-fecha').click();
    await hoja.locator('#gasto-mini-fecha .chip-fecha', { hasText: 'Ayer' }).click();
    // GAS.15e (ADR 193 D2): la fecha corta, "Ayer, sáb 21 nov".
    await expect(hoja.locator('#gasto-fila-fecha [data-fila-v]')).toHaveText(/^Ayer, [a-záé]{3} \d{1,2} [a-z]{3}$/);
    await expect(page.locator('.fk-toast__accion')).toHaveText('Deshacer');
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(1);
  });

  test('el botón central abre el gasto por etapas y cada paso tiene su botón a la vista (ADR 148, 142 D4)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await seedConGastos(page);
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    await expect(page.locator('#sec-gast > .section__header')).toBeHidden();
    // GAS.4a (ADR 157 D1): el bloque ya no trae "+ Gasto"; registra el central.
    await expect(page.locator('#sec-gast .bloque-gastos__primario')).toHaveCount(0);
    await page.click('.nav-item--registrar');
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(1);

    // Monto con el teclado de Finko: "Continuar" y el teclado a la vista.
    const form = page.locator('#form-gasto');
    const continuar = form.locator('[data-etapa="monto"] .modal__footer--principal .btn-primary');
    await expect(continuar).toBeInViewport();
    await expect(form.locator('.kp__k[data-tecla="0"]')).toBeInViewport();
    for (const t of ['2', '5', '000']) await form.locator(`[data-tecla="${t}"]`).click();
    await expect(form.locator('#gasto-monto')).toHaveValue('25.000');
    await continuar.click();

    // Ninguna categoría se esconde detrás de un "ver más" (ADR 042 D2).
    const radios = await form.locator('input[name="categoria"]').count();
    await expect(form.locator('.teja-op')).toHaveCount(radios);
    await form.locator('.teja-op').first().click();
    await pasarDetalle(form);
    await expect(form).toHaveAttribute('data-etapa-actual', 'revisar');
    await expect(form.locator('[data-etapa="revisar"] button[type="submit"]')).toBeInViewport();
  });

  test('con el teclado abierto, "Listo" de la nota queda encima del teclado (ADR 115, 142 D8)', async ({ page }) => {
    // El teclado de verdad no existe en Chromium sin pantalla: se reemplaza
    // visualViewport antes de que arranque la app y se le cambia el alto.
    await page.addInitScript(() => {
      const vv = new window.EventTarget();
      Object.assign(vv, { height: window.innerHeight, offsetTop: 0, scale: 1 });
      Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
    });
    await page.setViewportSize({ width: 375, height: 667 });
    await seedConGastos(page);
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });
    await page.click('.nav-item--registrar');
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(1);

    // El monto no abre el teclado del sistema: la nota sí, en su mini-hoja.
    const form = page.locator('#form-gasto');
    await form.locator('[data-tecla="9"]').click();
    await form.locator('[data-gasto-seguir="monto"]').click();
    await form.locator('.teja-op').first().click();
    await pasarDetalle(form);
    await form.locator('#gasto-fila-nota').click();
    await expect(form.locator('#gasto-nota')).toBeFocused();

    // El teclado de iOS deja visible algo menos de la mitad de arriba.
    await page.evaluate(() => {
      window.visualViewport.height = 380;
      window.visualViewport.dispatchEvent(new Event('resize'));
    });
    await expect(page.locator('html')).toHaveAttribute('data-teclado', 'abierto');
    const listo = form.locator('#gasto-mini-nota .mini-hoja__pie .btn-primary');
    await expect.poll(async () => {
      const b = await listo.boundingBox();
      return b ? b.y + b.height : Infinity;
    }).toBeLessThanOrEqual(380);

    // Al cerrarse el teclado, la hoja vuelve a su alto de siempre.
    await page.evaluate(() => {
      window.visualViewport.height = window.innerHeight;
      window.visualViewport.dispatchEvent(new Event('resize'));
    });
    await expect(page.locator('html')).not.toHaveAttribute('data-teclado', /.*/);
  });

  test('las categorías van de más a menos gasto y bajan de línea, sin deslizarse (GAS.4b, ADR 157 D5; TEL.1a, ADR 199 D2)', async ({ page }) => {
    await seedConGastos(page);
    await page.goto('/#gast');
    const chips = page.locator('#panel-filtros-gastos button.chip[data-cat]');
    await expect(chips).toHaveCount(CATEGORIAS.length + 1, { timeout: 10_000 });
    await expect(page.locator('#panel-filtros-gastos .filtros-bar__mas')).toHaveCount(0);
    // Mascotas suma más en la semilla; Mercado, menos. GAS.8b (ADR 182 D2):
    // el chip solo filtra, sin su total (el reparto lo dice la tarjeta).
    await expect(chips.nth(1)).toHaveAttribute('data-cat', 'Mascotas');
    await expect(chips.nth(1).locator('.chip__monto')).toHaveCount(0);
    await expect(chips.last()).toHaveAttribute('data-cat', 'Mercado');
    // TEL.1a (ADR 199 D2, supera la fila deslizable): los chips bajan de
    // línea, ninguno queda fuera del ancho y la página no se ensancha.
    const tops = await chips.evaluateAll(els => els.map(el => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBeGreaterThan(1);
    const barra = page.locator('#panel-filtros-gastos .filtros-bar');
    expect(await barra.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    const derechas = await chips.evaluateAll(els => els.map(el => el.getBoundingClientRect().right));
    expect(Math.max(...derechas)).toBeLessThanOrEqual(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await chips.last().click();
    await expect(page.locator('#panel-filtros-gastos button.chip.chip--active')).toHaveAttribute('data-cat', 'Mercado');
  });

  test('la fila del título: teja, nombre y ojo; crear es el botón central (GAS.4a, ADR 157 D2)', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: CUENTAS,
      personales: [{ id: 'p1', persona: 'Camila', monto: 300_000, pagado: 0, fecha: fechaDelMes(1), liquidado: false, fechaCreacion: '2026-07-01T00:00:00.000Z' }],
    }));
    await page.goto('/#tesoreria');
    const hd = page.locator('#sec-tesoreria > .section__header');
    await expect(hd.locator('.section__title')).toBeVisible({ timeout: 10_000 });
    // El primario sigue en el DOM (lo leen el central y la barra de escritorio),
    // pero no se ve; tampoco la frase.
    const crear = hd.locator(':scope > .btn-primary');
    await expect(crear).toHaveAttribute('aria-label', 'Nueva cuenta');
    await expect(crear).toBeHidden();
    await expect(hd.locator('.section__linea')).toBeHidden();
    await expect(page.locator('.nav-item--registrar')).toHaveAttribute('aria-label', 'Nueva cuenta');
    const caja = async (l) => l.boundingBox();
    const [h, t, o] = await Promise.all([hd, hd.locator('.section__title'), hd.locator('.section__ojo')].map(caja));
    // Una sola fila: el ojo a la altura del nombre y el encabezado no pasa de 60px.
    expect(Math.abs((o.y + o.height / 2) - (t.y + t.height / 2))).toBeLessThan(6);
    expect(h.height).toBeLessThanOrEqual(60);

    // A 320 el título no se parte en dos líneas.
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/#personales');
    const hdP = page.locator('#sec-personales > .section__header');
    await expect(hdP.locator('.section__title')).toBeVisible({ timeout: 10_000 });
    const tP = await hdP.locator('.section__title').boundingBox();
    expect(tP.height).toBeLessThan(32);
  });

  test('a 320 el nombre baja de línea sin puntos y Por pagar cae en su pestaña, sin chips (TEL.1a, ADR 199 D2; ADR 179 D1)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await sembrar(page, estadoBase({
      perfil: { nombre: 'María Fernanda Restrepo Villegas', smmlv: 1750905 },
      cuentas: CUENTAS,
      compromisos: [{ id: 'f1', tipo: 'fijo', descripcion: 'Arriendo', monto: 900_000, frecuencia: 'Mensual', diaPago: 28, activo: true }],
    }));
    await page.goto('/#dash');
    const nombre = page.locator('#saludo-inicio');
    await expect(nombre).toBeVisible({ timeout: 10_000 });
    // TEL.1a (ADR 199 D2, supera el ADR 126 D1): el nombre va entero y, si no
    // cabe, baja de línea; ninguna palabra se parte ni se corta con puntos.
    expect(await nombre.evaluate(el => getComputedStyle(el).textOverflow)).not.toBe('ellipsis');
    expect(await nombre.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await nombre.evaluate(el => Math.round(el.getBoundingClientRect().height))).toBeGreaterThan(24);
    const partidas = await nombre.evaluate((el) => {
      const n = el.firstChild; const out = [];
      for (const m of n.nodeValue.matchAll(/\S+/g)) {
        const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        if ([...r.getClientRects()].filter(x => x.width > 0).length > 1) out.push(m[0]);
      }
      return out;
    });
    expect(partidas).toEqual([]);
    await expect(page.locator('#perfil-boton')).toHaveAttribute('aria-label', /María Fernanda Restrepo Villegas/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

    // ADR 179 D1 (cambia el ADR 122 D3): en el teléfono los chips de Por
    // pagar ceden su lugar a las pestañas Fijos y Deudas.
    await page.goto('/#compromisos');
    await expect(page).toHaveURL(/#fijos$/, { timeout: 10_000 });
    await expect(page.locator('#lista-compromisos .deuda-card').first()).toBeVisible();
    await expect(page.locator('#lista-compromisos > .filtros-bar')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });

  test('a 320 ninguna fila del título pasa de 52 px (tablero 10, ADR 122 D7)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await seedConTipos(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    const altas = [];
    for (const sec of ['movimientos', 'agenda', 'personales', 'tesoreria', 'fondo', 'metas', 'apartados', 'inversion', 'analisis', 'config']) {
      await page.evaluate(s => { window.location.hash = '#' + s; }, sec);
      await page.waitForSelector(`#sec-${sec}.active`, { timeout: 5_000 });
      // La fila: teja, título y acciones del encabezado; la frase va debajo.
      const alto = await page.evaluate((s) => {
        const hd = document.querySelector(`#sec-${s} > .section__header`);
        if (!hd || hd.getBoundingClientRect().height === 0) return null;
        const piezas = [...hd.querySelectorAll('.section__icon, .section__title, :scope > button, :scope > a.btn')]
          .map(el => el.getBoundingClientRect()).filter(r => r.height > 0);
        if (piezas.length === 0) return null;
        return Math.max(...piezas.map(r => r.bottom)) - Math.min(...piezas.map(r => r.top));
      }, sec);
      if (alto !== null && alto > 52.5) altas.push(`#${sec}: ${Math.round(alto)} px`);
    }
    expect(altas, altas.join(', ')).toEqual([]);
  });

  test('el pie de un diálogo corto deja el margen seguro del iPhone (tablero 3, MV2.28 d)', async ({ page }) => {
    // El margen inferior de un iPhone sin botón de inicio, simulado por CDP.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: 34 } });
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    // Confirmar es el diálogo corto más usado: su pie va fuera del cuerpo.
    await page.evaluate(() => import('/modules/ui/confirm.js').then((m) => {
      m.confirmar({ titulo: '¿Borrar este gasto?', mensaje: 'Vuelve a la cuenta.', confirmarTexto: 'Borrar', peligroso: true });
    }));
    const dialogo = page.locator('body > .modal-overlay[data-open]:not([id])');
    const pie = dialogo.locator('.modal > .modal__footer');
    await expect(pie).toBeVisible();
    // Los 16 px del pie más los 34 del margen.
    expect(await pie.evaluate(el => getComputedStyle(el).paddingBottom)).toBe('50px');
    // Con la hoja ya quieta, el botón termina por encima de la barra de inicio.
    const boton = dialogo.locator('[data-role="confirmar"]');
    await expect.poll(async () => {
      const b = await boton.boundingBox();
      return b ? Math.round(b.y + b.height) : Infinity;
    }).toBeLessThanOrEqual(844 - 34);
  });

  test('el ojo va en el encabezado de toda pantalla con montos (ADR 106 D3)', async ({ page }) => {
    await seedConTipos(page);
    await page.goto('/#movimientos');
    for (const sec of ['movimientos', 'fondo', 'metas', 'apartados', 'inversion', 'tesoreria', 'personales', 'agenda', 'analisis']) {
      await page.goto(`/#${sec}`);
      await expect(page.locator(`#sec-${sec} > .section__header .section__ojo`), sec).toBeVisible({ timeout: 10_000 });
    }
    // Ajustes no tiene montos: no lleva ojo.
    await expect(page.locator('#sec-config .section__ojo')).toHaveCount(0);
    // El del hero de Mis cuentas se calla en el teléfono.
    await page.goto('/#tesoreria');
    await expect(page.locator('.hero-tesoreria__ojo')).toBeHidden();

    // En Movimientos, que antes no tenía ojo, la fila se enmascara.
    await page.goto('/#movimientos');
    const monto = page.locator('#lista-movimientos .list-item__amount').first();
    await expect(monto).toContainText('$');
    await page.locator('#sec-movimientos .section__ojo').click();
    await expect(monto).toHaveText(/^[-+]?••••$/);
    await expect(page.locator('#sec-movimientos .section__ojo')).toHaveAttribute('aria-pressed', 'true');
  });

  test('un vacío, un mensaje: el propósito es su título y queda un solo botón (ADR 107 D5)', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#personales');
    const sec = page.locator('#sec-personales');
    await expect(sec.locator('.banner-proposito__titulo')).toHaveText(
      '¿Le prestaste dinero a alguien y ya no recuerdas cuánto ni a quién?', { timeout: 10_000 });
    // El vacío calla su propio mensaje y queda un solo "Registrar un préstamo"
    // (ADR 135 D7), dentro de la tarjeta del banner.
    await expect(sec.locator('.empty-state__title')).toBeHidden();
    await expect(sec.locator('[data-action="nuevo-personal"]:visible')).toHaveCount(1);
    await expect(sec.locator('.empty-state [data-action="nuevo-personal"]')).toBeVisible();
    await expect(sec.locator('.empty-state [data-action="nuevo-personal"]')).toHaveText('Registrar un préstamo');
  });

  test('Movimientos desde "Más" no tiene volver: es nivel raíz (ADR 106 D6)', async ({ page }) => {
    await seedConTipos(page);
    await page.goto('/#dash');
    await page.locator('.nav-item[data-modal="modal-mas"]').click();
    await page.locator('#modal-mas .mas-tile[data-section="movimientos"]').click();
    await expect(page.locator('#sec-movimientos.active')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#sec-movimientos > .section__volver:visible')).toHaveCount(0);
  });

  test('Movimientos pliega sus tipos y lleva "Fechas" en la misma fila (ADR 105)', async ({ page }) => {
    await seedConTipos(page);
    await page.goto('/#movimientos');
    const filtros = page.locator('#movimientos-filtros');
    const mas = filtros.locator('.filtros-bar__mas');
    const tiposVisibles = filtros.locator('button.chip[data-dominio]:visible');

    // Plegada: "Todos", "+4 tipos" y "Fechas"; el rango no ocupa fila propia.
    await expect(mas).toHaveText('+4 tipos', { timeout: 10_000 });
    await expect(tiposVisibles).toHaveCount(1);
    await expect(filtros.locator('.movimientos-filtros__rango > summary')).toBeHidden();
    await expect(page.locator('#movimientos-desde')).toBeHidden();

    // "Fechas" abre el rango sin repintar la fila.
    const fechas = filtros.locator('.movimientos-filtros__fechas-chip');
    await fechas.click();
    await expect(fechas).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#movimientos-desde')).toBeVisible();
    await fechas.click();
    await expect(page.locator('#movimientos-desde')).toBeHidden();

    // Abierta, los cuatro tipos; elegir uno pliega y dice qué se está viendo.
    await mas.click();
    await expect(tiposVisibles).toHaveCount(5);
    await filtros.locator('button.chip[data-dominio="ingresos"]').click();
    await expect(filtros.locator('.filtros-bar--abierta')).toHaveCount(0);
    await expect(filtros.locator('button.chip.chip--active[data-dominio]')).toHaveText('Ingresos');
    await expect(filtros.locator('.movimientos-filtros__resumen')).toHaveText('Solo ingresos');
    await expect(mas).toHaveText('+3 tipos');

    // A 320 la fila baja de línea en vez de deslizarse (R9).
    await page.setViewportSize({ width: 320, height: 640 });
    const desborda = await filtros.locator('.filtros-bar').evaluate(el => el.scrollWidth > el.clientWidth + 1);
    expect(desborda, 'la fila de filtros se desliza a 320px').toBe(false);
  });

  test('Mis cuentas: filas de una línea, ninguna papelera y la hoja con sus acciones (ADR 109)', async ({ page }) => {
    await seedMisCuentas(page);
    await page.goto('/#tesoreria');
    const sec = page.locator('#sec-tesoreria');
    const filas = sec.locator('#lista-tesoreria .cuenta-card, #lista-ingresos .list-item, #lista-ingresos-puntuales .list-item');
    await expect(filas).toHaveCount(4, { timeout: 10_000 });
    // ADR 135 D2: la fila de un ingreso fijo dice cuándo llega y puede ir en
    // dos líneas; las demás siguen en una.
    const altos = await filas.evaluateAll(els => els.map(e => [e.closest('#lista-ingresos') !== null, e.getBoundingClientRect().height]));
    for (const [esFijo, alto] of altos) {
      expect(alto).toBeLessThan(esFijo ? 90 : 70);
    }
    await expect(sec.locator('[data-action^="eliminar"]:visible')).toHaveCount(0);

    // La cuenta: su hoja propia (ADR 135 D4) con el 4x1000 en sus filas, sus
    // movimientos como fila, editar y, aparte, eliminar.
    await sec.locator('.cuenta-card[data-id="c2"] .list-item__detalle').click();
    const hoja = page.locator('#modal-detalle-fila[data-open]');
    await expect(hoja.locator('.detalle-gasto__datos')).toContainText('4x1000');
    await expect(hoja.locator('.detalle-gasto__ver')).toContainText('Ver sus movimientos');
    await expect(hoja.locator('.detalle-fila__acciones .detalle-fila__accion')).toHaveText(['Editar la cuenta']);
    await expect(hoja.locator('.detalle-fila__peligro .detalle-fila__accion')).toHaveText('Eliminar la cuenta');

    // Editar desde la hoja abre el formulario de esa cuenta, sin apilar modales.
    await hoja.locator('[data-target-action="editar-cuenta"]').click();
    await expect(page.locator('#modal-cuenta[data-open]')).toHaveCount(1);
    await expect(page.locator('#modal-detalle-fila[data-open]')).toHaveCount(0);
  });

  test('Distribuir se abre sobre Inicio con el pie a la vista y dice qué falta (ADR 110)', async ({ page }) => {
    await seedDistribuir(page);
    await page.goto('/#dash');
    await page.locator('[data-action="distribuir-desde-inicio"]:visible').first().click({ timeout: 10_000 });
    await expect(page.locator('#modal-distribuir[data-open]')).toHaveCount(1);
    // D1: no cambia de pantalla.
    await expect(page).toHaveURL(/#dash$/);
    await expect(page.locator('#sec-dash.active')).toBeVisible();

    // D2: "Siguiente" está a la vista sin desplazar la hoja.
    const siguiente = page.locator('#modal-distribuir [data-action="distribuir-paso-siguiente"]');
    await expect(siguiente).toBeInViewport();

    // D3: en el último paso, el pie dice por qué "Distribuir" no avanza.
    while (await siguiente.isVisible()) await siguiente.click();
    const confirmar = page.locator('#modal-distribuir [data-action="confirmar-distribucion"]');
    await expect(confirmar).toBeInViewport();
    await expect(confirmar).toBeDisabled();
    await expect(page.locator('#distribuir-resumen')).toContainText('Elige arriba qué hacer con los');
    await expect(page.locator('#distribuir-remanente')).toBeInViewport();
    await page.check('[data-dist-remanente][value="cuenta"]');
    await expect(confirmar).toBeEnabled();
    await expect(page.locator('#distribuir-resumen')).toContainText('Queda $');

    // Cerrar deja donde estabas.
    await page.locator('#modal-distribuir [data-action="modal-close"]').click();
    await expect(page.locator('#sec-dash.active')).toBeVisible();
  });

  test('Distribuir: qué se reparte arriba, la cuenta al empezar y la hoja dice qué quedó (ADR 110 D4-D6)', async ({ page }) => {
    await seedDistribuir(page, [...CUENTAS,
      { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' }]);
    await page.goto('/#dash');
    await page.locator('[data-action="distribuir-desde-inicio"]:visible').first().click({ timeout: 10_000 });
    const hoja = page.locator('#modal-distribuir');

    // D4: el monto arriba; sin cuenta guardada, la pregunta abre desplegada.
    await expect(hoja.locator('[data-dist-que-monto]')).toHaveText('$3.000.000');
    await expect(hoja.locator('#distribuir-cuenta')).toBeVisible();
    // ADR 135 D6: cada paso es una pregunta, con "Paso 1 de 2" y sus puntos;
    // sin necesidades, el primero es el ahorro y "Siguiente" dice a dónde va.
    await expect(hoja.locator('[data-dist-paso="0"] .distribuir__pregunta')).toHaveText('¿Cuánto separas para ahorro, deudas e inversiones?');
    await expect(hoja.locator('[data-dist-paso-indicador]')).toHaveText('Paso 1 de 2');
    await expect(hoja.locator('[data-dist-punto]')).toHaveCount(2);
    await expect(hoja.locator('[data-dist-siguiente-texto]')).toHaveText('Siguiente: estilo de vida');

    const siguiente = hoja.locator('[data-action="distribuir-paso-siguiente"]');
    while (await siguiente.isVisible()) await siguiente.click();
    await page.check('[data-dist-remanente][value="cuenta"]');
    const confirmar = hoja.locator('[data-action="confirmar-distribucion"]');
    await expect(confirmar).toBeDisabled();
    await expect(page.locator('#distribuir-resumen')).toHaveText('Elige arriba desde qué cuenta sale el dinero.');

    await hoja.locator('#distribuir-cuenta').selectOption('c2');
    await expect(hoja.locator('[data-dist-que-sub]')).toHaveText('Salario · entró a Bancolombia');
    await expect(confirmar).toBeEnabled();
    await confirmar.click();

    // D6: la hoja sigue abierta y dice qué quedó; el dinero entró a Bancolombia.
    await expect(page.locator('#distribuir-listo-titulo')).toContainText('Distribuiste');
    await expect(hoja.locator('.distribuir-listo__lista').last()).toContainText('Bancolombia');
    await expect(page).toHaveURL(/#dash$/);
    await expect(page.locator('#snackbar-distribucion')).toHaveCount(0);
    await hoja.locator('.distribuir__pie [data-action="modal-close"]').click();
    await expect(page.locator('#modal-distribuir[data-open]')).toHaveCount(0);
    await expect(page.locator('#snackbar-distribucion')).toBeVisible();
  });

  test('Calendario: el mes cabe de 320 a 430 y desde 358 la celda mide 44 (ADR 111 D1, D2)', async ({ page }) => {
    await seedCalendario(page);
    await page.goto('/#agenda');
    await expect(page.locator('.cal-card')).toBeVisible({ timeout: 10_000 });
    for (const ancho of [320, 360, 375, 390, 412, 430]) {
      await page.setViewportSize({ width: ancho, height: 844 });
      const m = await page.evaluate(() => {
        const card = document.querySelector('.cal-card').getBoundingClientRect();
        const dias = [...document.querySelectorAll('.cal-card .cal-day:not(.cal-day--empty)')].map(d => d.getBoundingClientRect());
        return {
          fuera: dias.filter(d => d.left < card.left || d.right > card.right).length,
          ancho: Math.min(...dias.map(d => d.width)),
          alto: Math.min(...dias.map(d => d.height)),
        };
      });
      expect(m.fuera, `${ancho}px: días fuera de la tarjeta`).toBe(0);
      expect(m.alto, `${ancho}px: alto de la celda`).toBeGreaterThanOrEqual(44);
      if (ancho >= 358) expect(m.ancho, `${ancho}px: ancho de la celda`).toBeGreaterThanOrEqual(44);
    }
  });

  test('Calendario: el día se marca en un círculo y los textos no se parten (ADR 111 D3, D4)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 844 });
    await seedCalendario(page);
    await page.goto('/#agenda');
    const hoy = page.locator('.cal-day--today');
    await expect(hoy).toBeVisible({ timeout: 10_000 });
    const estilo = await hoy.evaluate((el) => ({
      celda: getComputedStyle(el).backgroundColor,
      circulo: getComputedStyle(el.querySelector('.cal-day__num')).backgroundColor,
      radio: getComputedStyle(el.querySelector('.cal-day__num')).borderTopLeftRadius,
    }));
    expect(estilo.celda).toBe('rgba(0, 0, 0, 0)');
    expect(estilo.circulo).not.toBe('rgba(0, 0, 0, 0)');
    expect(parseFloat(estilo.radio)).toBeGreaterThanOrEqual(16);

    // "este mes" calla y el subtítulo cabe en un renglón.
    await expect(page.locator('.cal-card__sub-mes')).toBeHidden();
    expect(await renglones(page.locator('.cal-card__subtitle'))).toBe(1);

    // El 18 trae el ingreso y el abono parcial: cada lado del día va entero y
    // el estado de pago ocupa un solo renglón.
    await page.locator('.cal-day[data-day="18"]').click();
    const lados = page.locator('.cal-detail__total .cal-detail__lado');
    await expect(lados).toHaveCount(2);
    for (const lado of await lados.all()) expect(await renglones(lado)).toBe(1);
    const pill = page.locator('.cal-detail__badge-abono--parcial');
    await expect(pill).toBeVisible();
    expect(await renglones(pill)).toBe(1);
    await expect(page.locator('.cal-detail__title')).toHaveText(/ de [a-z]+$/);
  });

  test('Calendario: un mes vacío de alguien con datos conserva su mensaje y su botón es verde lleno (ADR 111 D5)', async ({ page }) => {
    await seedCalendario(page, { inactivo: true });
    await page.goto('/#agenda');
    const vacio = page.locator('.cal-empty');
    await expect(vacio).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#sec-agenda .banner-proposito')).toHaveCount(0);
    await expect(vacio.locator('.cal-empty__title')).toBeVisible();
    const fondo = await vacio.locator('.btn-primary').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(fondo).not.toBe('rgba(0, 0, 0, 0)');
  });
  test('Ajustes: un índice de filas que se abren en su sitio (ADR 112)', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS, perfil: { nombre: 'Laura', smmlv: 1750905 } }));
    await page.goto('/#config');
    const filas = page.locator('#sec-config .config-fila__boton');
    await expect(filas.first()).toBeVisible({ timeout: 10_000 });
    // ADR 136 D1: "Tú y tu familia" primero, con la inicial en la teja.
    await expect(page.locator('#sec-config .config-grupo__label').first()).toHaveText('Tú y tu familia');
    await expect(filas.first()).toContainText('Laura');
    const alto = await page.evaluate(() => document.querySelector('#sec-config').getBoundingClientRect().height);
    expect(alto).toBeLessThan(1500);

    // El candado se abre en su sitio, con su formulario.
    await expect(page.locator('#form-bloqueo-crear')).toBeHidden();
    await page.locator('[data-fila="bloqueo"]').click();
    await expect(page.locator('#form-bloqueo-crear')).toBeVisible();

    // Cambiar el tema, con el interruptor de su fila (ADR 136 D1), repinta el
    // panel: lo abierto sigue abierto.
    await page.locator('label[for="toggle-tema"]').click();
    await expect(page.locator('.config-tema-fila .config-fila__estado')).toHaveText('Apagado');
    await expect(page.locator('#form-bloqueo-crear')).toBeVisible();
  });
  test('al bajar, la barra de lentes queda arriba y sigue llevando a su lente (ADR 113)', async ({ page }) => {
    await seedConGastos(page);
    await page.goto('/#gast');
    const barra = page.locator('#sec-gast .bloque-tabs');
    await expect(barra).toBeVisible({ timeout: 10_000 });
    const alCargar = await barra.boundingBox();
    // Al cargar va bajo la fila del nombre (GAS.13d, ADR 188 D4: vuelve la
    // cabecera con la lupa).
    expect(alCargar.y).toBeGreaterThan(40);
    expect(alCargar.y).toBeLessThan(100);

    // Se desplaza dentro del sondeo: volver.js deja arriba la sección recién
    // abierta y puede pisar un desplazamiento hecho antes de asentarse.
    await expect.poll(async () => {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      return (await barra.boundingBox()).y;
    }).toBeLessThanOrEqual(1);
    await expect(barra).toBeInViewport();
    await barra.locator('[data-section="fijos"]').click();
    await expect(page.locator('#sec-compromisos.active')).toBeVisible();
  });

  test('las hijas de Ahorro dibujan la misma barra y también queda arriba (ADR 113, ADR 104)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 568 });
    await sembrar(page, estadoBase({ cuentas: CUENTAS, metas: Array.from({ length: 12 }, (_, i) => `Meta ${i + 1}`).map((nombre, i) => ({
      id: `m${i}`, nombre, montoObjetivo: 4_000_000, montoActual: 500_000, fechaCreacion: '2026-01-01' })) }));
    await page.goto('/#metas');
    const barraMetas = page.locator('#sec-metas .bloque-tabs');
    await expect(barraMetas).toBeVisible({ timeout: 10_000 });
    // Se desplaza dentro del sondeo: volver.js deja arriba la sección recién
    // abierta y puede pisar un desplazamiento hecho antes de asentarse.
    await expect.poll(async () => {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      return (await barraMetas.boundingBox()).y;
    }).toBeLessThanOrEqual(1);
  });
  test('lo que faltaba del canvas: resaltado al llegar, enlaces de 44 y la pregunta de cada modalidad (ADR 116)', async ({ page }) => {
    await seedCalendario(page);
    await page.goto('/#agenda');
    await page.locator('.cal-day[data-day="18"]').click();
    await page.locator('.cal-detail [data-action="agenda-ver-en-por-pagar"]').first().click();
    await expect(page.locator('#sec-compromisos.active')).toBeVisible();
    // D1 (N7): la tarjeta pedida se marca al llegar.
    await expect(page.locator('#lista-compromisos .deuda-card.list-item--nuevo')).toHaveCount(1, { timeout: 3_000 });

    // D7 (A2): un enlace de texto tiene zona táctil de 44.
    const zona = await page.evaluate(() => {
      const a = document.createElement('a');
      a.className = 'link'; a.href = '#'; a.textContent = 'Ir';
      document.querySelector('.section.active').appendChild(a);
      const cs = getComputedStyle(a, '::after');
      const r = { alto: cs.minHeight, ancho: cs.minWidth };
      a.remove();
      return r;
    });
    expect(zona).toEqual({ alto: '44px', ancho: '44px' });

    // ADR 133 D1 escribió para qué sirve cada hija de Ahorro bajo el título;
    // GAS.4a (ADR 157 D2) la calla en el teléfono: la frase vive en escritorio.
    await page.goto('/#metas');
    await expect(page.locator('#sec-metas .section__linea')).toHaveText('Para algo que quieres comprar o hacer');
    await expect(page.locator('#sec-metas .section__linea')).toBeHidden();
  });

  test('Fijos y Deudas van por urgencia, marcan con un círculo y la fila abre su hoja (ADR 117 D1, ADR 132 D7, ADR 179 D1)', async ({ page }) => {
    test.skip(new Date().getDate() < 3, 'hace falta que los días 1 y 2 del mes ya hayan pasado');
    await seedPorPagar(page);
    await page.goto('/#compromisos');
    // ADR 179 D1: en el teléfono Por pagar cae en la pestaña con algo vencido.
    await expect(page).toHaveURL(/#fijos$/, { timeout: 10_000 });
    const grupos = page.locator('#lista-compromisos .porpagar-grupo__head span[id]');
    // GAS.7d (ADR 179 D4): en Fijos el grupo es "Vencido", sin la línea de
    // orden (OB.1 sigue en escritorio).
    await expect(grupos.first()).toHaveText('Vencido', { timeout: 10_000 });
    await expect(page.locator('.porpagar-grupo__orden')).toHaveCount(0);
    // VIS.1b (ADR 168 D5): la semilla ya pagó Netflix, así que la línea de
    // "Toca el círculo" no sale; quien no ha pagado nada la ve (unitaria).
    await expect(page.locator('.porpagar-ayuda')).toHaveCount(0);
    // GAS.9b (ADR 183 D2): la pestaña muestra solo su tipo; con un vencido no
    // hay lote, y su tarjeta suelta sigue oculta.
    await expect(page.locator('.deuda-card--fila[data-id="d1"]')).toHaveCount(0);
    await expect(page.locator('.porpagar-grupo__pie [data-action="compromisos-pagar-lote"]')).toHaveCount(0);
    await expect(page.locator('#lote-compromisos')).toBeHidden();

    await page.locator('#sec-compromisos .bloque-tabs__tab[data-section="deudas"]').click();
    await expect(page).toHaveURL(/#deudas$/);

    // GAS.8e (ADR 182 D5): Deudas es el inventario. La fila dice cómo se paga
    // ("Cuota $X · día N", GAS.10g, ADR 185 D8) y lo que falta; la cuota
    // vencida trae su pastilla roja, que abona.
    const fila = page.locator('.deuda-inv__fila[data-id="d1"]');
    // GAS.15c (ADR 191 D8): la entidad y el día; el aviso en su línea y "Pagar" aparte.
    await expect(fila.locator('.deuda-inv__meta')).toHaveText(/^Bancolombia · día \d+$/);
    await expect(fila.locator('.deuda-inv__monto')).toHaveText('$3.200.000');
    await expect(fila.locator('.deuda-inv__vencida-texto')).toContainText('Cuota vencida hace');
    const pagar = fila.locator('button.deuda-inv__pagar');
    await expect(pagar).toHaveText('Pagar');
    // Zona sensible de 44 (R4) por encima del botón de la fila.
    const zona = await pagar.evaluate(el => getComputedStyle(el, '::before').height);
    expect(zona).toBe('44px');
    await pagar.click();
    await expect(page.locator('#modal-abono[data-open]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-abono[data-open]')).toHaveCount(0);

    // La fila entera abre la hoja de la deuda, armada con sus datos.
    await fila.locator('.list-item__detalle').click();
    const hoja = page.locator('#modal-detalle-fila[data-open]');
    await expect(hoja.locator('.detalle-fila__titulo')).toHaveText('Tarjeta Visa Bancolombia');
    await expect(hoja.locator('.detalle-compromiso__rotulo')).toHaveText(/^Cuota de /);
    await expect(hoja.locator('.detalle-gasto__dato dt')).toHaveText(['Te falta pagar', 'Tasa', 'Se paga']);
    await expect(hoja.locator('.detalle-fila__accion')).toHaveText(['Abonar $420.000', 'Editar', 'Eliminar esta deuda']);
  });

  test('Límites: los topes son filas en una tarjeta y cada una abre su hoja (ADR 132 D8)', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: CUENTAS,
      presupuestos: [
        { id: 'p1', categoria: 'Restaurantes', montoMensual: 200_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
        { id: 'p2', categoria: 'Mercado', montoMensual: 600_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
      ],
      gastos: [
        { id: 'g1', categoria: 'Restaurantes', monto: 215_900, fecha: fechaDelMes(1), cuentaId: 'c1' },
        { id: 'g2', categoria: 'Mercado', monto: 300_700, fecha: fechaDelMes(1), cuentaId: 'c1' },
        { id: 'g3', categoria: 'Ropa', monto: 159_900, fecha: fechaDelMes(1), cuentaId: 'c1' },
      ],
    }));
    await page.goto('/#presupuesto');
    const filas = page.locator('.limites-lista .limite-fila');
    await expect(filas).toHaveCount(2, { timeout: 10_000 });
    await expect(page.locator('.envelope')).toHaveCount(0);
    // GAS.15j (ADR 196 D1): una lista, lo usado y el estado en la barra, sin
    // la suma de los límites al pie.
    await expect(page.locator('.estilo-olla')).toHaveCount(0);
    await expect(filas.first()).toHaveAttribute('data-estado', 'excedido');
    await expect(filas.nth(1)).toHaveAttribute('data-estado', 'ok');
    await expect(filas.first().locator('.limite-fila__queda')).toHaveText(/Te pasaste\s*\$15\.900/);
    await expect(filas.first().locator('.limite-fila__uso')).toHaveText('$215.900 de $200.000');
    await expect(page.locator('.envelope-huerfanas__btn').first()).toContainText('Límite');

    await filas.first().locator('.list-item__detalle').click();
    const hoja = page.locator('#modal-detalle-fila[data-open]');
    await expect(hoja.locator('.detalle-fila__titulo')).toHaveText('Restaurantes');
    await expect(hoja.locator('.detalle-limite__estado')).toHaveText('Pasó su límite por $15.900 · 108%');
    await expect(hoja.locator('.detalle-fila__accion')).toHaveText(['Cambiar el límite', 'Quitar este límite']);
    await hoja.locator('[data-target-action="editar-presupuesto"]').click();
    await expect(page.locator('#modal-presupuesto[data-open]')).toBeVisible();
    await expect(page.locator('#modal-detalle-fila[data-open]')).toHaveCount(0);
  });

  test('Nuevo gasto: pregunta en frase y "Sale de" se cambia en el desplegable de Finko (ADR 132 D9, 142 D4)', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: [
        { id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 3_000_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
        { id: 'c2', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 450_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
      ],
    }));
    await page.goto('/#gast');
    await page.locator('.nav-item--registrar').click();
    const form = page.locator('#form-gasto');
    await expect(form.locator('.pmonto__q')).toHaveText('¿Cuánto gastaste?', { timeout: 10_000 });
    expect(await form.locator('.pmonto__q').evaluate(el => getComputedStyle(el).textTransform)).toBe('none');
    for (const t of ['4', '5', '000']) await form.locator(`[data-tecla="${t}"]`).click();
    await expect(form.locator('#gasto-monto-lee')).toHaveText('Cuarenta y cinco mil pesos');
    await form.locator('[data-gasto-seguir="monto"]').click();
    await expect(form.locator('.tejas__area').first()).toHaveText('Comida');
    await form.locator('.teja-op', { hasText: 'Mercado' }).click();
    await pasarDetalle(form);

    // El recibo muestra la cuenta (la de más saldo, sin historial) y lo que le queda.
    const fila = form.locator('#gasto-fila-cuenta');
    await expect(fila).toContainText('Bancolombia');
    await expect(fila).toContainText('queda $2.955.000');
    await fila.click();
    const mini = form.locator('#gasto-mini-cuenta');
    await expect(mini).toBeVisible();
    await mini.locator('.cuenta-pago__opcion', { hasText: 'Nequi' }).click();
    // Elegir otra la deja elegida y vuelve al recibo.
    await expect(form.locator('input[name="cuentaId"][value="c2"]')).toBeChecked();
    await expect(mini).toBeHidden();
    await expect(fila).toContainText('Nequi');
    await expect(fila).toBeFocused();
  });

  test('Calendario: el día se abre en una hoja sobre el mes y al cerrarla vuelve a su celda (ADR 118 D1)', async ({ page }) => {
    await seedCalendario(page);
    await page.goto('/#agenda');
    const celda = page.locator('.cal-day[data-day="18"]');
    await expect(celda).toBeVisible({ timeout: 10_000 });
    // Al entrar no se abre nada solo: la hoja taparía el mes.
    await expect(page.locator('#modal-dia-calendario[data-open]')).toHaveCount(0);
    const y0 = await scrollY(page);

    await celda.click();
    const hoja = page.locator('#modal-dia-calendario[data-open]');
    await expect(hoja.locator('.cal-detail__title')).toHaveText(/ 18 de [a-z]+$/);
    // La respuesta se ve sin bajar a buscarla (R46): la página no se movió.
    expect(await scrollY(page)).toBe(y0);
    await expect(hoja.locator('.cal-detail__close')).toBeHidden();

    await hoja.locator('.mas-sheet__close').click();
    await expect(page.locator('#modal-dia-calendario[data-open]')).toHaveCount(0);
    await expect(page.locator('.cal-day--selected')).toHaveCount(0);
    await expect(page.locator('.cal-day[data-day="18"]')).toBeFocused();
  });

  test('Calendario: a "Por pagar" desde la hoja y de vuelta, el día sigue abierto (ADR 118 D2)', async ({ page }) => {
    await seedCalendario(page);
    await page.goto('/#agenda');
    await page.locator('.cal-day[data-day="18"]').click();
    await page.locator('#modal-dia-calendario [data-action="agenda-ver-en-por-pagar"]').first().click();
    await expect(page.locator('#sec-compromisos.active')).toBeVisible();
    await expect(page.locator('#modal-dia-calendario[data-open]')).toHaveCount(0);

    const volver = page.locator('#sec-compromisos .section__volver--contexto');
    await expect(volver).toContainText('Calendario');
    await volver.click();
    await expect(page.locator('#sec-agenda.active')).toBeVisible();
    await expect(page.locator('#modal-dia-calendario[data-open] .cal-detail__title')).toHaveText(/ 18 de /);
  });

  test('el atrás del sistema cierra la hoja de arriba y no cambia de pantalla (ADR 118 D3)', async ({ page }) => {
    // El atrás de Android llega a la página como el "close" del vigía de la
    // hoja (CloseWatcher); acá se dispara a mano.
    await page.addInitScript(() => {
      const Real = window.CloseWatcher;
      if (typeof Real !== 'function') return;
      window.__vigias = [];
      window.CloseWatcher = class extends Real {
        constructor(...args) { super(...args); window.__vigias.push(this); }
      };
    });
    await seedConGastos(page);
    await page.goto('/#gast');
    test.skip(!(await page.evaluate(() => Array.isArray(window.__vigias))), 'este Chromium no trae CloseWatcher');
    const fila = page.locator('#lista-gastos .list-item--detalle').first();
    await expect(fila).toBeVisible({ timeout: 10_000 });
    await fila.locator('.list-item__detalle').click();
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(1);

    await page.evaluate(() => window.__vigias.at(-1).close());
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(0);
    await expect(page).toHaveURL(/#gast$/);
  });

  test('Deudas termina en "¿Cómo salir más rápido?" y el plan se abre en su hoja (ADR 119 D1, ADR 132 D10, ADR 182 D5)', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: CUENTAS,
      compromisos: [
        { id: 'd1', tipo: 'deuda-entidad', descripcion: 'Tarjeta Visa', saldoTotal: 3_200_000, cuotaMensual: 420_000,
          frecuencia: 'Mensual', diaPago: 25, activo: true, tasa: 0.28, tasaUnidad: 'EA' },
        { id: 'd2', tipo: 'deuda-personal', descripcion: 'Préstamo de mi hermano', saldoTotal: 700_000,
          cuotaMensual: 100_000, frecuencia: 'Mensual', diaPago: 28, activo: true, tasa: 0 },
      ],
    }));
    // GAS.8d (ADR 182 D4): el plan para salir vive en Deudas, no en Por pagar.
    // GAS.8e (D5): va en la puerta de las entidades, como sugerencia girasol.
    await page.goto('/#deudas');
    const entrada = page.locator('#lista-compromisos .plan-salida--sugerencia');
    await expect(entrada).toBeVisible({ timeout: 10_000 });
    // GAS.13h (ADR 188 D7): la tarjeta "Finko revisó tus deudas".
    // GAS.15c (ADR 191 D8): dice cuántas revisó.
    await expect(entrada.locator('.plan-salida__titulo')).toHaveText('Finko revisó tus 2 deudas');
    await expect(page.locator('#plan-salida-entrada')).toBeEmpty();
    // El simulador ya no ocupa la sección: vive en la hoja.
    await expect(page.locator('#sec-compromisos > #estrategia-pago')).toHaveCount(0);

    await entrada.click();
    const hoja = page.locator('#modal-plan-salida[data-open]');
    // GAS.15a (ADR 190): la página 8 del lienzo. La recomendación primero.
    await expect(hoja.locator('#plan-hoja-titulo')).toHaveText('Tu plan para salir de deudas');
    await expect(hoja.locator('.plan-reco__eyebrow')).toHaveText(/finko te recomienda/i);
    await expect(hoja.locator('.plan-cambia__dato')).toHaveCount(3);
    await expect(hoja.locator('.plan-orden__fila')).toHaveCount(2);
    await expect(hoja.locator('.plan-hoja__aplicar')).toHaveText('Aplicar este plan');

    // Comparar: el extra en chips y las formas de pagar. El préstamo del
    // hermano no cobra interés: no hay qué unificar (ADR 189 D5, regla 6).
    await hoja.locator('[data-action="plan-ver-comparar"]').click();
    await expect(hoja.locator('#plan-hoja-titulo')).toHaveText('Compara formas de pagar');
    await hoja.locator('.plan-cmp__chip[data-monto="100000"]').click();
    await expect(hoja.locator('.plan-cmp__chip[data-monto="100000"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(hoja.locator('.plan-cmp__nombre')).toHaveText(['Avalancha', 'Bola de nieve', 'Seguir como vas']);
    const otra = hoja.locator('.plan-cmp__opcion[aria-pressed="false"]');
    const nombreOtra = (await otra.locator('.plan-cmp__nombre').textContent()).trim();
    await otra.click();
    await expect(hoja.locator('.plan-cmp__opcion--activa .plan-cmp__nombre')).toHaveText(nombreOtra);
    await expect(hoja.locator('.plan-hoja__aplicar')).toHaveText(`Aplicar ${nombreOtra}`);

    // De vuelta: es "Tu elección" y el extra va a la primera del orden.
    await hoja.locator('[data-action="plan-volver"]').click();
    await expect(hoja.locator('.plan-reco__eyebrow')).toHaveText(/tu elección/i);
    await expect(hoja.locator('.plan-reco__nombre')).toHaveText(nombreOtra);
    await expect(hoja.locator('.plan-orden__estado--primera')).toHaveText('Aquí va el extra');
    await expect(hoja.locator('.plan-cambia__dato').nth(2)).toContainText('$100.000');

    // Cómo funciona, mes a mes.
    await hoja.locator('[data-action="plan-ver-como"]').click();
    await expect(hoja.locator('.plan-hoja__subtitulo')).toHaveText('Cómo funciona, mes a mes');
    await expect(hoja.locator('.plan-como__fila')).toHaveCount(2);

    // Aplicar: con extra sube las cuotas, tras confirmar, y la hoja se cierra.
    await hoja.locator('.plan-hoja__aplicar').click();
    await page.locator('[data-role="confirmar"]').click();
    await expect(page.locator('#modal-plan-salida[data-open]')).toHaveCount(0);
    await expect.poll(async () => (await leerEstado(page)).compromisos
      .reduce((a, c) => a + (Number(c.cuotaMensual) || 0), 0)).toBe(620_000);
  });

  test('la ficha del gasto dice de qué cuenta salió, cómo va su límite y lleva a sus gastos del mes (ADR 119 D2, 142 D6)', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: CUENTAS,
      presupuestos: [{ id: 'p1', categoria: 'Mercado', montoMensual: 25_000, activo: true }],
      gastos: gastos(),
    }));
    await page.goto('/#gast');
    // GAS.7c (ADR 179 D3): la semilla junta varios gastos en el día de hoy y
    // el día se pliega; "N gastos más" lo abre.
    await expect(page.locator('#lista-gastos .list-item--detalle').first()).toBeVisible({ timeout: 10_000 });
    const mas = page.locator('#lista-gastos [data-action="gastos-dia-mas"]');
    if (await mas.count()) await mas.first().click();
    const fila = page.locator('#lista-gastos .list-item--detalle[data-id="g0"]');
    await expect(fila).toBeVisible({ timeout: 10_000 });
    await fila.locator('.list-item__detalle').click();
    const hoja = page.locator('#modal-gasto[data-open]');
    await expect(hoja.locator('[data-recibo-cat]')).toHaveText('Mercado');
    await expect(hoja.locator('#gasto-fila-cuenta')).toContainText('Nequi');
    await expect(hoja.locator('.detalle-gasto__limite')).toContainText('de su límite de $25.000');

    const ver = hoja.locator('[data-action="gasto-ver-categoria"]');
    // GAS.15f (ADR 194 D1): la salida dice cuántos gastos de su categoría hay en su mes.
    await expect(ver).toHaveText(/^Ver los \d+ gastos de Mercado en Movimientos$/);
    await ver.click();
    await expect(page.locator('#sec-movimientos.active')).toBeVisible();
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(0);
    await expect(page.locator('#lista-movimientos .list-item')).toHaveCount(4);
  });

  test('con el texto al 200 %, los montos bajan y las lentes van en dos líneas (ADR 117 D4)', async ({ page }) => {
    await seedPorPagar(page);
    // GAS.8e (ADR 182 D5): las filas de una línea con su monto son las de
    // Fijos (GAS.9b, ADR 183 D2: solo fijos).
    await page.goto('/#fijos');
    await expect(page.locator('.deuda-card--fila').first()).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });

    const fila = page.locator('.deuda-card--fila[data-id="f1"]');
    const nombre = await fila.locator('.deuda-card__nombre').boundingBox();
    const monto = await fila.locator('.deuda-card__saldo').boundingBox();
    expect(monto.y).toBeGreaterThanOrEqual(nombre.y + nombre.height);
    // El monto entero, sin cortes, y nada se desliza a lo ancho.
    expect(await fila.locator('.deuda-card__saldo').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    const lente = page.locator('#sec-compromisos .bloque-tabs__tab.active .bloque-tabs__label');
    // "Fijos" cabe entero o baja de renglón, nunca se corta con puntos.
    expect(await renglones(lente)).toBeGreaterThanOrEqual(1);
    expect(await lente.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await lente.evaluate(el => getComputedStyle(el).textOverflow)).not.toBe('ellipsis');
  });
});

test.describe('MV2 - hojas con el dedo (ADR 118)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('deslizar la hoja hacia abajo la cierra; un tirón corto la deja en su sitio', async ({ page }) => {
    await seedConGastos(page);
    await page.goto('/#gast');
    const fila = page.locator('#lista-gastos .list-item--detalle').first();
    await expect(fila).toBeVisible({ timeout: 10_000 });
    await fila.locator('.list-item__detalle').tap();
    const hoja = page.locator('#modal-gasto[data-open] > .modal');
    await expect(hoja).toBeVisible();
    // La hoja entra y vuelve con una transición: se mide quieta, cuando dos
    // lecturas seguidas dan la misma altura.
    const quieta = async () => {
      let previa = NaN;
      await expect.poll(async () => {
        const y = (await hoja.boundingBox()).y;
        const igual = Math.abs(y - previa) < 0.5;
        previa = y;
        return igual;
      }).toBe(true);
    };
    await quieta();

    const caja = await hoja.boundingBox();
    const x = caja.x + caja.width / 2;
    const y = caja.y + 12;
    const cdp = await page.context().newCDPSession(page);
    const arrastrar = async (dy, pasos) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= pasos; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (dy * i) / pasos }] });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };

    await arrastrar(30, 6);
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(1);
    await expect(hoja).not.toHaveAttribute('data-arrastre');
    // Vuelve a su sitio: el siguiente dedo tiene que caer sobre ella.
    await quieta();
    expect(Math.round((await hoja.boundingBox()).y)).toBe(Math.round(caja.y));

    await arrastrar(220, 10);
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(0);
  });
});

test.describe('MV2 - escritorio sin cambios', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('las piezas móviles no se ven y la fila conserva sus botones', async ({ page }) => {
    await seedConGastos(page);
    await page.goto('/#gast');
    const fila = page.locator('#lista-gastos .list-item').first();
    await expect(fila).toBeVisible({ timeout: 10_000 });
    await expect(fila.locator('.list-item__detalle')).toBeHidden();
    await expect(fila.locator('.list-item__action')).toBeVisible();
    await expect(page.locator('#panel-filtros-gastos .filtros-bar__mas')).toBeHidden();
    await expect(page.locator('#panel-filtros-gastos button.chip[data-cat]:visible')).toHaveCount(CATEGORIAS.length + 1);

    await page.locator('#sec-gast [data-action="gastos-ver-historial"]').click();
    await expect(page.locator('#sec-movimientos.active')).toBeVisible();
    await expect(page.locator('.section__volver--contexto')).toBeHidden();

    // ADR 105 D5: Movimientos conserva todos sus tipos y su desplegable de fechas.
    await expect(page.locator('#movimientos-filtros .filtros-bar__mas')).toBeHidden();
    await expect(page.locator('#movimientos-filtros .movimientos-filtros__fechas-chip')).toBeHidden();
    await expect(page.locator('#movimientos-filtros .movimientos-filtros__rango > summary')).toBeVisible();
  });

  test('Por pagar conserva sus tarjetas por tipo y la tarjeta de lote (ADR 117, ADR 073)', async ({ page }) => {
    await seedPorPagar(page);
    await page.goto('/#compromisos');
    await expect(page.locator('#lista-compromisos .deuda-card').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#lista-compromisos .porpagar-grupo')).toHaveCount(0);
    // ADR 119 D1: el simulador sigue en su columna y la entrada del teléfono no se ve.
    await expect(page.locator('#sec-compromisos > #estrategia-pago .estrategia-card')).toBeVisible();
    await expect(page.locator('#plan-salida-entrada')).toBeHidden();
    await expect(page.locator('#lista-compromisos .deuda-card__chips').first()).toBeVisible();
    if (new Date().getDate() >= 3) await expect(page.locator('#lote-compromisos .cal-lote')).toBeVisible();
  });

  test('Mis cuentas conserva sus tarjetas con botones (ADR 109)', async ({ page }) => {
    await seedMisCuentas(page);
    await page.goto('/#tesoreria');
    const card = page.locator('#lista-tesoreria .cuenta-card[data-id="c2"]');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card.locator('.list-item__detalle')).toBeHidden();
    await expect(card.locator('[data-action="eliminar-cuenta"]')).toBeVisible();
    await expect(page.locator('#lista-ingresos-puntuales [data-action="eliminar-ingreso-puntual"]')).toBeVisible();
    await expect(page.locator('#sec-tesoreria .list-item__solo-hoja:visible')).toHaveCount(0);
  });

  test('Calendario conserva la celda pintada y "este mes" (ADR 111)', async ({ page }) => {
    await seedCalendario(page);
    await page.goto('/#agenda');
    const hoy = page.locator('.cal-day--today');
    await expect(hoy).toBeVisible({ timeout: 10_000 });
    const m = await hoy.evaluate((el) => ({
      celda: getComputedStyle(el).backgroundColor,
      alto: el.getBoundingClientRect().height,
    }));
    expect(m.celda).not.toBe('rgba(0, 0, 0, 0)');
    // La celda de escritorio es cuadrada (hasta 72) y la fila crece con los
    // pagos de su semana: en una semana con un solo pago mide 70. Lo que se
    // vigila es que no se compacte a los 44 del teléfono (TEL.1a: el 80 fijo
    // fallaba según la fecha del día).
    expect(m.alto).toBeGreaterThanOrEqual(60);
    await expect(page.locator('.cal-card__sub-mes')).toBeVisible();
  });

  test('Ajustes conserva sus bloques abiertos y su orden (ADR 112)', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#config');
    await expect(page.locator('#form-perfil')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#sec-config .config-fila__boton')).toHaveCount(0);
    await expect(page.locator('#sec-config .config-grupo__label').first()).toHaveText('La app');
    await expect(page.locator('#toggle-atajos')).toBeAttached();
  });

  test('Distribuir desde Inicio sigue llevando a Mis cuentas (ADR 110 D1)', async ({ page }) => {
    await seedDistribuir(page);
    await page.goto('/#dash');
    await page.locator('[data-action="distribuir-desde-inicio"]:visible').first().click({ timeout: 10_000 });
    await expect(page.locator('#modal-distribuir[data-open]')).toHaveCount(1);
    await expect(page).toHaveURL(/#tesoreria$/);
  });
});

test.describe('MV2 - perfil niño', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('el camino de Aprender no desborda a lo ancho y la barra sigue en su sitio (D13)', async ({ page }) => {
    const { legalAceptado: _sin, ...config } = createInitialState().config;
    await sembrar(page, estadoBase({
      config: { ...config, bloqueo: { hash: 'e3174484ebeec68f0933b4a5518a7ce757ff61899a332e68004eef36a36e788b', salt: '5de4f0acfa29e71ebc0497c3d5bf15b2', creado: '2026-10-25' } },
      perfiles: [{ id: 'n-sofi', nombre: 'Sofía', edad: 8, dibujo: 'cometa', teNombra: 'Papá', creado: '2026-10-25' }],
    }));
    await page.goto('/#dash');
    await page.locator('#quien-usa[data-open] [data-role="nino"]').click();
    await expect(page.locator('body.kid')).toHaveCount(1);

    await page.click('#nino-nav [data-vista="aprender"]');
    await expect(page.locator('#nino-main .kruta__actual')).toBeVisible();
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(desborde).toBeLessThanOrEqual(0);

    // La barra del niño se sigue pudiendo usar sin alejar la página.
    await page.click('#nino-nav [data-vista="alcancia"]');
    await expect(page.locator('#nino-main h1')).toContainText('alcancía');
  });
});

// ── ADR 133: Ahorro en el teléfono ──────────────────────────────────────────

/** Fecha ISO local a N días de hoy. */
function enDias(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test.describe('MV2.30 - Ahorro en el teléfono (ADR 133)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Reservas: la fila abre su hoja, el interruptor cambia sin cerrarla y el círculo abre "Aportar" (D4)', async ({ page }) => {
    const reserva = (id, nombre, montoActual, montoObjetivo, dias, extra = {}) => ({
      id, nombre, icono: '🛵', montoActual, montoObjetivo, fechaObjetivo: dias === null ? null : enDias(dias),
      frecuenciaAporte: 'Mensual', recurrente: false, periodoMeses: null, completado: false,
      fechaCreacion: '2026-03-01T00:00:00.000Z', ...extra,
    });
    await sembrar(page, estadoBase({
      cuentas: CUENTAS,
      apartados: [
        reserva('r1', 'SOAT de la moto', 390_000, 520_000, 20),
        reserva('r2', 'Regalos', 150_000, 600_000, 90),
      ],
    }));
    await page.goto('/#apartados');
    await expect(page.locator('#sec-apartados.active')).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('.reservas-resumen__total')).toHaveText('$540.000');
    await expect(page.locator('#apartados-nudge-proximos')).toBeHidden();
    await expect(page.locator('.bolsa-grupo__titulo')).toHaveText(['Vencen en 30 días', 'Más adelante']);

    // La fila abre su hoja; el interruptor de la recurrencia cambia ahí mismo.
    await page.locator('.reserva-fila[data-id="r1"] .list-item__detalle').click();
    const hoja = page.locator('#modal-detalle-fila');
    await expect(hoja.locator('.detalle-fila__titulo')).toHaveText('SOAT de la moto');
    const repite = hoja.locator('.detalle-reserva__repite input');
    await expect(repite).not.toBeChecked();
    await hoja.locator('.detalle-reserva__repite').click();
    await expect(hoja).toBeVisible();
    await expect(hoja.locator('.detalle-reserva__repite input')).toBeChecked();
    await page.keyboard.press('Escape');
    await expect(page.locator('.reserva-fila[data-id="r1"] .reserva-fila__dato')).toContainText('cada año');

    // El círculo abre "Aportar": la pregunta en frase y el botón con el monto.
    await page.locator('.reserva-fila[data-id="r1"] .bolsa-circulo').click();
    const aporte = page.locator('#modal-aporte-apartado');
    await expect(aporte.locator('.modal__title')).toHaveText('Aportar a SOAT de la moto');
    // ADR 142 D4 (FORM.2c): primero el monto, con su pregunta; luego "Revisar".
    await expect(aporte.locator('.pmonto__q')).toHaveText('¿Cuánto vas a aportar?');
    await aporte.locator('#aporte-apartado-monto').fill('90.000');
    await aporte.locator('[data-etapa-seguir]').click();
    await expect(aporte.locator('#aporte-apartado-enviar')).toHaveText('Aportar $90.000');
    await aporte.locator('#aporte-apartado-enviar').click();
    await expect(page.locator('.reserva-fila[data-id="r1"] .reserva-fila__dato')).toContainText('$480.000 de $520.000');
  });

  test('Reservas vacía: el botón vive dentro de la tarjeta y el "+" del encabezado se va (D4)', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS, apartados: [] }));
    await page.goto('/#apartados');
    await expect(page.locator('#sec-apartados.active')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.reservas-vacio__crear')).toBeVisible();
    await expect(page.locator('#sec-apartados .section__header > .btn-primary')).toBeHidden();
    await expect(page.locator('.reservas-vacio__pie a')).toHaveAttribute('href', '#presupuesto');
  });
});

test.describe('MV2.30 - Metas en el teléfono (ADR 133 D5)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('la fila abre su hoja y el círculo abre el aporte', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: CUENTAS,
      metas: [
        { id: 'm1', nombre: 'Viaje a San Andrés', categoria: 'Viajes', montoObjetivo: 4_500_000, montoActual: 2_610_000, fechaLimite: enDias(60), completada: false },
        { id: 'm2', nombre: 'Carro', montoObjetivo: 85_000_000, montoActual: 4_200_000, fechaLimite: null, completada: false },
      ],
    }));
    await page.goto('/#metas');
    await expect(page.locator('#sec-metas.active')).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('#lista-metas > .hero-metas')).toBeVisible();
    await expect(page.locator('.bolsa-grupo__titulo')).toHaveText(['Con plazo', 'Sin plazo']);

    await page.locator('.meta-linea[data-id="m1"] .list-item__detalle').click();
    const hoja = page.locator('#modal-detalle-fila');
    await expect(hoja.locator('.detalle-fila__titulo')).toHaveText('Viaje a San Andrés');
    await expect(hoja.locator('.detalle-meta__de')).toHaveText('de $4.500.000 · 58%');
    await hoja.locator('[data-target-action="editar-meta"]').click();
    await expect(page.locator('#modal-meta[data-open]')).toHaveCount(1);
    await page.keyboard.press('Escape');

    await page.locator('.meta-linea[data-id="m2"] .bolsa-circulo').click();
    await expect(page.locator('#modal-abono-meta[data-open], #modal-aporte-meta[data-open]')).toHaveCount(1);
  });
});

test.describe('MV2.30 - Inversión en el teléfono (ADR 133 D6)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('la etapa con su barra, la fila abre su hoja y registrar es el botón central', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: CUENTAS,
      inversiones: [{ id: 'v1', tipo: 'CDT', nombre: 'CDT Bancolombia 360 días', monto: 5_000_000, tasaEA: 10.2, plazoMeses: 12, fechaInicio: enDias(-150), fechaCreacion: '2026-06-10T00:00:00.000Z' }],
      ahorro: { fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 500_000 }, aportes: [], compromisoMensual: 0 },
    }));
    await page.goto('/#inversion');
    await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('#panel-inversion .reservas-resumen__total')).toHaveText('$5.000.000');
    await expect(page.locator('.inv-etapa__kicker')).toHaveText('Aprendiendo · 1 inversión');
    // GAS.4a (ADR 157 D2): el primario del encabezado se oculta y el central lo dispara.
    await expect(page.locator('#sec-inversion .section__header [data-action="inversion-nueva"]')).toBeAttached();
    await expect(page.locator('.nav-item--registrar')).toHaveAttribute('aria-label', 'Nueva inversión');

    await page.locator('.inv-fila[data-id="v1"] .list-item__detalle').click();
    const hoja = page.locator('#modal-detalle-fila');
    await expect(hoja.locator('.detalle-fila__titulo')).toHaveText('CDT Bancolombia 360 días');
    await expect(hoja.locator('.detalle-gasto__dato').first()).toContainText('10,2% efectivo anual');
    await hoja.locator('[data-target-action="inversion-editar"]').click();
    await expect(page.locator('#modal-inversion[data-open]')).toHaveCount(1);
  });

  test('en escritorio la barra de arriba no copia el "+ Inversión" del teléfono', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await sembrar(page, estadoBase({
      inversiones: [{ id: 'v1', tipo: 'CDT', nombre: 'CDT', monto: 5_000_000, tasaEA: 10.2, plazoMeses: 12, fechaInicio: enDias(-150) }],
      ahorro: { fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 500_000 }, aportes: [], compromisoMensual: 0 },
    }));
    await page.goto('/#inversion');
    await expect(page.locator('#sec-inversion.active')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#topbar-primario')).toBeHidden();
    await expect(page.locator('.inversion-momento')).toBeVisible();
  });
});

test.describe('MV2.30 - la hoja "Nueva reserva" (ADR 133 D7)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('las plantillas llenan el nombre, "N más" abre las otras y la frecuencia se elige a la vista', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS, apartados: [{
      id: 'r0', nombre: 'Predial', icono: '🏠', montoActual: 0, montoObjetivo: 900_000, fechaObjetivo: null,
      frecuenciaAporte: 'Mensual', recurrente: false, periodoMeses: null, completado: false, fechaCreacion: '2026-03-01T00:00:00.000Z',
    }] }));
    await page.goto('/#apartados');
    await expect(page.locator('#sec-apartados.active')).toBeVisible({ timeout: 10_000 });
    await page.click('.nav-item--registrar');
    const form = page.locator('#modal-apartado[data-open] form');
    await expect(form.locator('.reserva-form__pregunta')).toHaveText('¿Para qué pago te quieres preparar?');

    await form.locator('[data-action="apartado-plantilla"][data-nombre="SOAT"]').click();
    await expect(form.locator('#apartado-nombre')).toHaveValue('SOAT');

    await form.locator('.chip-cat--mas').click();
    await expect(form.locator('.chips-mas [data-action="apartado-plantilla"]').first()).toBeVisible();

    // ADR 142 D5 (FORM.2g): de a una pregunta; la fecha y la frecuencia, en el resumen.
    await form.locator('[data-preguntas-seguir]').click();
    await expect(form.locator('[data-preguntas-t]')).toHaveText('¿Cuánto necesitas reunir?');
    await form.locator('#apartado-objetivo').fill('520.000');
    await form.locator('[data-preguntas-seguir]').click();
    await expect(form.locator('[data-preguntas-t]')).toHaveText('Así queda tu reserva');
    await form.locator('[data-preguntas-ir]', { hasText: 'Cada cuánto aportas' }).click();
    // Elegir una opción responde y vuelve solo al resumen.
    await form.locator('.familia-segmento__op', { hasText: 'Quincenal' }).click();
    await expect(form.locator('[data-preguntas-t]')).toHaveText('Así queda tu reserva');
    await form.locator('[data-preguntas-ir]', { hasText: 'Para cuándo' }).click();
    await form.locator('#apartado-fecha-finko').click();
    for (let i = 0; i < 4; i++) await form.locator('#apartado-fecha-mini [data-calf-mover="1"]').click();
    await form.locator('#apartado-fecha-mini [data-calf-dia$="-15"]').click();
    await expect(form.locator('#apartado-sugerencia-live')).toContainText('por quincena');
    await form.locator('[data-preguntas-seguir]').click();

    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#modal-apartado[data-open]')).toHaveCount(0);
    await expect(page.locator('.reserva-fila .reserva-fila__nombre', { hasText: 'SOAT' })).toBeVisible();
  });
});

test.describe('MV2.30 - Calendario en el teléfono (ADR 134)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('lo del mes va en listas bajo el mes y cada fila abre su día (D4)', async ({ page }) => {
    await seedCalendario(page);
    await page.goto('/#agenda');
    await expect(page.locator('#sec-agenda.active')).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('.cal-card__subtitle')).toContainText('8 pagos');
    await expect(page.locator('.cal-legend')).toContainText('Sale un pago');
    const listas = page.locator('#panel-agenda .cal-listas .cal-lista');
    expect(await listas.count()).toBeGreaterThan(0);

    await page.locator('.cal-listas .cal-lista__fila').first().click();
    await expect(page.locator('#modal-dia-calendario[data-open]')).toHaveCount(1);
  });
});

test.describe('MV2.30 - Análisis en el teléfono (ADR 134 D7)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('dos lentes, Tus gastos y Tu situación, con filas que abren su hoja (ADR 176 D1 y D9)', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: CUENTAS,
      gastos: [
        { id: 'g1', descripcion: '', monto: 300_000, categoria: 'Mercado', fecha: fechaDelMes(1), cuentaId: 'c1' },
        { id: 'g2', descripcion: '', monto: 150_000, categoria: 'Ropa', fecha: fechaDelMes(1), cuentaId: 'c1' },
      ],
    }));
    await page.goto('/#analisis');
    await expect(page.locator('#sec-analisis.active')).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('#sec-analisis .section__linea')).toBeHidden();
    await expect(page.locator('#panel-analisis details.analisis-grupo')).toHaveCount(0);
    // Entra por Tus gastos.
    await expect(page.locator('.ana-lentes__tab.active')).toHaveText('Tus gastos');
    await expect(page.locator('.ana-salud__num')).toHaveCount(0);
    // La barra mide la parte del total (ADR 176 D5): 300.000 de 450.000.
    await expect(page.locator('.ana-barra--gastos > span').first()).toHaveAttribute('style', /width:67%/);
    // "Más detalle de tus gastos" ya no es fila: se reparte (ADR 176 D6).
    await expect(page.locator('.ana-fila[data-hoja="detalle"]')).toHaveCount(0);
    const hoja = page.locator('#modal-detalle-fila[data-open]');

    // Tu situación: la salud, lo que realmente tienes y la renta.
    await page.locator('.ana-lentes__tab[data-lente="situacion"]').click();
    await expect(page.locator('.ana-lentes__tab.active')).toHaveText('Tu situación');
    await expect(page.locator('.ana-salud__num')).toBeVisible();
    await page.locator('.ana-fila[data-hoja="renta"]').click();
    await expect(hoja).toHaveCount(1);
    await expect(hoja.locator('#detalle-fila-titulo')).toContainText('Estado de tu renta');
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-detalle-fila[data-open]')).toHaveCount(0);

    await page.locator('.ana-fila[data-hoja="tienes"]').click();
    await expect(hoja.locator('#detalle-fila-titulo')).toHaveText('Lo que tienes');
    await page.keyboard.press('Escape');
    await page.locator('.ana-fila[data-hoja="factores"]').click();
    await expect(hoja.locator('.ana-factor')).toHaveCount(4);
  });

  test('Tus gastos por periodo: día, semana, mes y año con flechas (ADR 176 D2 a D5 y D7)', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: CUENTAS,
      gastos: [
        { id: 'g1', descripcion: '', monto: 300_000, categoria: 'Mercado', fecha: fechaDelMes(1), cuentaId: 'c1' },
        { id: 'g2', descripcion: '', monto: 150_000, categoria: 'Ropa', fecha: fechaDelMes(1), cuentaId: 'c1' },
      ],
    }));
    await page.goto('/#analisis');
    await expect(page.locator('#sec-analisis.active')).toBeVisible({ timeout: 10_000 });

    // Entra por el mes: la pastilla del encabezado, el ritmo y la parte de cada categoría.
    const pastilla = page.locator('#analisis-periodo');
    await expect(pastilla).toBeVisible();
    await expect(page.locator('.ana-periodos__btn.active')).toHaveText('Mes');
    await expect(page.locator('.hero-analisis .ana-ritmo')).toBeVisible();
    await expect(pastilla.locator('[data-delta="1"]')).toBeDisabled();
    await expect(page.locator('.ana-frase')).toContainText('Mercado es tu mayor gasto: 67%');

    // El año: doce barras y el promedio por mes.
    await page.locator('.ana-periodos__btn[data-periodo="anio"]').click();
    await expect(page.locator('.ana-barras--anio .ana-barras__col')).toHaveCount(12);
    await expect(page.locator('.hero-analisis .ana-pastilla')).toContainText('Promedio por mes');

    // La semana: siete barras.
    await page.locator('.ana-periodos__btn[data-periodo="semana"]').click();
    await expect(pastilla.locator('.ana-pastilla-periodo__label')).not.toHaveText('');

    // El día de hoy, sin gastos si hoy no es el 1: Tino tranquilo y registrar.
    await page.locator('.ana-periodos__btn[data-periodo="dia"]').click();
    await expect(pastilla.locator('.ana-pastilla-periodo__label')).toHaveText('Hoy');
    if (new Date().getDate() !== 1) {
      await expect(page.locator('.ana-vacio .tino-sol[data-pose="tranquilo"]')).toBeVisible();
      await expect(page.locator('.ana-vacio [data-action="nuevo-gasto"]')).toHaveText(/Registrar un gasto/);
    }

    // Tu situación no lleva la pastilla del periodo.
    await page.locator('.ana-lentes__tab[data-lente="situacion"]').click();
    await expect(pastilla).toBeHidden();
  });

  test('una categoría abre su detalle y "‹ Análisis" vuelve al mismo periodo (ADR 176 D8)', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: CUENTAS,
      gastos: [
        { id: 'g1', descripcion: '', monto: 300_000, categoria: 'Mercado', fecha: fechaDelMes(1), cuentaId: 'c1' },
        { id: 'g2', descripcion: '', monto: 150_000, categoria: 'Ropa', fecha: fechaDelMes(1), cuentaId: 'c1' },
      ],
    }));
    await page.goto('/#analisis');
    await expect(page.locator('#sec-analisis.active')).toBeVisible({ timeout: 10_000 });

    await page.locator('.ana-parte--abre[data-categoria="Mercado"]').click();
    await expect(page.locator('#ana-cat-titulo')).toHaveText('Mercado');
    await expect(page.locator('.ana-cat__total')).toHaveText('$300.000');
    await expect(page.locator('[data-action="analisis-ver-movimientos"][data-categoria="Mercado"]')).toHaveText(/Ver el gasto en Gastos/);
    await expect(page.locator('#analisis-periodo')).toBeVisible();

    await page.locator('.ana-volver').click();
    await expect(page.locator('#ana-cat-titulo')).toHaveCount(0);
    await expect(page.locator('.ana-periodos__btn.active')).toHaveText('Mes');
  });
});

test.describe('MV2.30 - Mis cuentas en el teléfono (ADR 135 D1 a D3)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('la pastilla con las cuentas, "Tus cuentas", cuándo llega el ingreso y "Reparte"', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: [
        ...CUENTAS,
        { id: 'c2', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 96_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
      ],
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 4_200_000, frecuencia: 'Mensual', diaPago: 1, activo: true, fechaCreacion: '2026-01-01' }],
    }));
    await page.goto('/#tesoreria');
    await expect(page.locator('#sec-tesoreria.active')).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('.hero-tesoreria__cuantas')).toHaveText('2 cuentas activas');
    await expect(page.locator('.hero-tesoreria__compo')).toBeHidden();
    await expect(page.locator('.tesoreria-col--cuentas > .tesoreria-lb')).toBeVisible();
    await expect(page.locator('.cuenta-card', { hasText: 'Efectivo' }).locator('.cuenta-card__tipo')).toHaveText('Lo que llevas encima');

    await expect(page.locator('#lista-ingresos .list-item__subtitle')).toHaveText(/^Cada mes, el día 1/);
    await expect(page.locator('#ingresos-nudge-proximo')).toBeHidden();
    await expect(page.locator('#ingresos-altas [data-action="nuevo-ingreso-puntual"]')).toHaveText('De una vez');

    const reparte = page.locator('.distribuir-card');
    await expect(reparte.locator('.distribuir-card__title')).toHaveText('Reparte tus $4.200.000');
    await expect(reparte.locator('.distribuir-card__item')).toHaveCount(3);
    await expect(reparte.locator('.distribuir-card__pct').first()).toHaveText(/lo recomendado es 50%$/);
  });
});

test.describe('FORM.2e - Nueva deuda por preguntas (ADR 142 D5)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('una pregunta por pantalla, el resumen y "Agrega si quieres"', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#compromisos');
    await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
    await page.evaluate(() => {
      const b = document.createElement('button');
      b.dataset.action = 'nuevo-compromiso';
      document.body.appendChild(b);
      b.click();
      b.remove();
    });
    const form = page.locator('#form-compromiso');
    const titulo = form.locator('[data-preguntas-t]');
    // GAS.15b (ADR 191): la página 7 del lienzo. "¿Con quién es?" sin barra de pasos.
    await expect(titulo).toHaveText('¿Con quién es?');
    await expect(form.locator('.preguntas__cab .etapas')).toBeHidden();
    await expect(form.locator('.deuda-con__tarjeta')).toContainText('Se agrega en Mis cuentas');
    await form.locator('[data-tipo="deuda-entidad"]').click();
    // Crédito: el tipo y la entidad en una pantalla, sin título grande.
    await expect(form.locator('.preguntas__cab .etapa')).toHaveText(['Crédito', 'Cuánto', 'Cuota', 'Revisar']);
    await expect(titulo).toHaveText('¿Qué crédito es?');
    // GAS.9d (ADR 183 D4): desde Deudas no se crea una tarjeta: dice dónde.
    await expect(form.locator('.chip-cat', { hasText: 'Tarjeta de crédito' })).toHaveCount(0);
    await expect(form.locator('.deuda-sin-tarjeta [data-action="tc-agregar"]')).toHaveText('Agrégala en Mis cuentas');
    await form.locator('.chip-cat', { hasText: 'Libre inversión' }).click();
    await form.locator('.deuda-entidad__op', { hasText: 'Davivienda' }).click();
    await form.locator('[data-preguntas-seguir]').click();
    await expect(titulo).toHaveText('¿Cuánto debes hoy?');
    // El paso hecho dice lo elegido.
    await expect(form.locator('.preguntas__cab .etapa').first()).toHaveText('Davivienda');
    for (const t of ['3', '2', '0', '0', '000']) await form.locator(`[data-pregunta-on] [data-tecla="${t}"]`).click();
    await form.locator('[data-preguntas-seguir]').click();
    // Cuota: la cuota y el día en una pantalla, con el teclado del teléfono.
    await expect(form.locator('[data-pregunta-on] [data-kp-zona]')).toHaveCount(0);
    await form.locator('#comp-cuota').fill('350000');
    await form.locator('[data-dia="28"]').first().click();
    await form.locator('[data-preguntas-seguir]').click();

    await expect(titulo).toHaveText('Así queda tu deuda');
    await expect(form.locator('.preguntas__cab .etapa')).toHaveText(['Davivienda', '$3.200.000', '$350.000', 'Revisar']);
    // La factura: la teja de la entidad, el tipo, y lo que debes a su lado.
    await expect(form.locator('.factura__quien .factura__quien-n')).toHaveText('Libre inversión');
    await expect(form.locator('.factura__quien .factura__quien-s')).toHaveText('Davivienda');
    await expect(form.locator('[data-resumen-monto]')).toHaveText('$3.200.000');
    await expect(form.locator('[data-resumen-que]')).toHaveText('debes hoy');
    await expect(form.locator('[data-resumen-filas]')).toContainText('$350.000 · el 28 de cada mes');
    await form.locator('[data-resumen-notas] .recibo__fila', { hasText: 'Nota' }).click();
    await expect(titulo).toHaveText('Nota');
    await form.locator('#comp-nota').fill('Referencia 123');
    await form.locator('[data-preguntas-seguir]').click();
    await expect(form.locator('[data-resumen-notas]')).toContainText('Referencia 123');

    await form.locator('button[type="submit"]').click();
    const dialogo = page.locator('body > .modal-overlay[data-open]:not([id])');
    if (await dialogo.count()) await dialogo.locator('[data-role="confirmar"]').click();
    await expect(page.locator('#modal-compromiso[data-open]')).toHaveCount(0);
    // save() va con espera de 200 ms: se lee hasta que llegue.
    await expect.poll(async () => (await leerEstado(page)).compromisos?.at(-1)?.descripcion).toBe('Libre inversión Davivienda');
    expect((await leerEstado(page)).compromisos.at(-1)).toMatchObject({ saldoTotal: 3_200_000, cuotaMensual: 350_000, diaPago: 28, nota: 'Referencia 123' });
  });

  test('GAS.15b (ADR 191): la deuda con una persona, sin volver a preguntar con quién; "Cómo pagas" con la cuota y el día', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#deudas');
    await page.locator('.deudas-vacio [data-tipo="deuda-personal"]').click();
    const form = page.locator('#modal-compromiso[data-open] #form-compromiso');
    const titulo = form.locator('[data-preguntas-t]');
    await expect(form.locator('.preguntas__cab .etapa')).toHaveText(['Quién', 'Cuánto', 'Cómo pagas', 'Revisar']);
    await expect(titulo).toHaveText('¿A quién le debes?');
    await form.locator('#comp-descripcion').fill('Juan Diego');
    await expect(form.locator('#comp-quien-avatar')).toHaveText('JD');
    await form.locator('.chip-cat', { hasText: 'Familiar' }).click();
    await form.locator('[data-preguntas-seguir]').click();
    for (const t of ['6', '0', '0', '000']) await form.locator(`[data-pregunta-on] [data-tecla="${t}"]`).click();
    await form.locator('[data-preguntas-seguir]').click();
    await form.locator('.deuda-forma__op', { hasText: 'Una cuota cada mes' }).click();
    await form.locator('#comp-cuota').fill('100000');
    await form.locator('[data-dia-rapido="10"]').click();
    await form.locator('[data-preguntas-seguir]').click();
    await expect(titulo).toHaveText('Así queda tu deuda');
    await expect(form.locator('.preguntas__cab .etapa')).toHaveText(['Juan Diego', '$600.000', 'Cada mes', 'Revisar']);
    await expect(form.locator('.factura__quien')).toContainText('JD');
    await expect(form.locator('.factura__quien .factura__quien-s')).toHaveText('Familiar');
    await expect(form.locator('[data-resumen-que]')).toHaveText('le debes');
    await expect(form.locator('[data-resumen-filas]')).toContainText('$100.000 · el 10 de cada mes');
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#modal-compromiso[data-open]')).toHaveCount(0);
    await expect.poll(async () => (await leerEstado(page)).compromisos?.at(-1)?.descripcion).toBe('Juan Diego');
    expect((await leerEstado(page)).compromisos.at(-1)).toMatchObject({ tipo: 'deuda-personal', categoria: 'Familiar', saldoTotal: 600_000, cuotaMensual: 100_000, diaPago: 10, frecuencia: 'Mensual', tasa: 0 });
  });
});

test.describe('FORM.2f - Gasto fijo y cuenta por preguntas (ADR 142 D5)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  const abrir = async (page, accion) => page.evaluate((a) => {
    const b = document.createElement('button');
    b.dataset.action = a;
    document.body.appendChild(b);
    b.click();
    b.remove();
  }, accion);

  test('GF.2 y GF.3 (ADR 177 y 178): el gasto fijo en cuatro pasos con nombre, elegir es seguir, y el resumen con íconos', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#compromisos');
    await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
    await abrir(page, 'nuevo-gasto-fijo');
    const form = page.locator('#form-gasto-fijo');
    const titulo = form.locator('[data-preguntas-t]');
    const paso = form.locator('.preguntas__cab .etapa--on');
    const seguir = form.locator('[data-preguntas-seguir]');
    await expect(form.locator('.preguntas__cab .etapa')).toHaveText(['Monto', 'Qué es', 'Cuándo', 'Revisar']);
    await expect(paso).toHaveText('Monto');
    // GF.1 (ADR 167 D1): el monto se ve como el de Registrar gasto: la
    // pregunta al centro sobre la cifra, la lectura y el teclado de Finko,
    // sin el título grande ni la salida al teclado del teléfono.
    const cifra = form.locator('[data-pregunta-on] .pmonto');
    await expect(cifra.locator('.pmonto__q')).toHaveText('¿Cuánto pagas?');
    await expect(titulo).toBeHidden();
    await expect(cifra.locator('.pmonto__lee')).toHaveText('Márcalo con el teclado de abajo');
    await expect(form.locator('[data-kp-sistema]')).toHaveCount(0);
    await expect(form.locator('#gfijo-monto')).toHaveAttribute('inputmode', 'none');
    const centro = async (sel) => form.locator(sel).evaluate((el) => { const r = el.getBoundingClientRect(); return Math.round(r.left + r.width / 2); });
    expect(Math.abs(await centro('[data-pregunta-on] .pmonto__q') - 195)).toBeLessThanOrEqual(2);
    for (const t of ['8', '5', '000']) await form.locator(`[data-pregunta-on] [data-tecla="${t}"]`).click();
    await expect(cifra.locator('.pmonto__lee')).toHaveText('Ochenta y cinco mil pesos');
    await seguir.click();

    // "¿Qué es?": las familias; tocar una lleva a la pantalla siguiente, sin
    // botón de seguir (GF.3, ADR 178). GAS.10e (ADR 185 D6): sin "Pagas $X"
    // ni el título a la vista. GAS.15h (ADR 195 D3): la cifra la dice su paso
    // en la barra, no el título de la hoja.
    await expect(titulo).toHaveText('¿Qué es?');
    await expect(paso).toHaveText('Qué es');
    await expect(form.locator('[data-preguntas-ctx]')).toBeHidden();
    await expect(page.locator('#modal-gasto-fijo .modal__titulo-sub')).toBeHidden();
    await expect(form.locator('.preguntas__cab .etapa')).toHaveText(['$85.000', 'Qué es', 'Cuándo', 'Revisar']);
    await expect(form.locator('[data-pregunta-on] .familia-cat__t')).toHaveText([
      'Casa', 'Conexión y entretenimiento', 'Salud y bienestar', 'Estudio, banco e impuestos', '¿No está en la lista?',
    ]);
    await expect(seguir).toBeHidden();
    await form.locator('.chip-cat', { hasText: 'Servicios públicos' }).click();

    // La empresa, en su pantalla del mismo paso: los logos y, al final, "No
    // está aquí" (GAS.15h); sin tarjeta, aviso ni pie. El paso ya dice la
    // categoría elegida (ADR 195 D3).
    await expect(titulo).toHaveText('¿Con qué empresa?');
    await expect(paso).toHaveText('Servicios públicos');
    await expect(form.locator('[data-preguntas-saltar]')).toBeHidden();
    await expect(seguir).toBeHidden();
    await expect(form.locator('[data-preguntas-ctx]')).toBeHidden();
    await expect(form.locator('[data-plataforma-grupo]:not([hidden]) .chip-cat--sin')).toBeVisible();
    await page.locator('#modal-gasto-fijo [data-preguntas-atras]').click();
    await expect(titulo).toHaveText('¿Qué es?');
    // Tocar otra vez la ya elegida también sigue.
    await form.locator('.chip-cat', { hasText: 'Servicios públicos' }).click();
    await expect(titulo).toHaveText('¿Con qué empresa?');
    await form.locator('[data-pregunta-on] .chip-cat--marca:has(input[value="epm"])').click();

    // "¿Cuándo lo pagas?" (GAS.15i, ADR 195 D5): los rótulos a la vista,
    // "Otra" con seis; tocar el día lo marca y la pantalla pide "Continuar".
    await expect(titulo).toHaveText('¿Cuándo lo pagas?');
    await expect(paso).toHaveText('Cuándo');
    await expect(form.locator('.preguntas__cab .etapa')).toHaveText(['$85.000', 'EPM', 'Cuándo', 'Revisar']);
    await expect(form.locator('[data-preguntas-ctx]')).toHaveText(/EPM · \$85\.000/);
    await expect(form.locator('#gfijo-frecuencia-label')).toBeVisible();
    await expect(seguir).toBeHidden();
    await expect(form.locator('#gfijo-inicio .campo-finko')).toHaveText(/Primer pago\s*Elegir fecha/);
    await form.locator('#gfijo-cuando .chip-fecha', { hasText: 'Quincenal' }).click();
    // GAS.10f (ADR 185 D7): "Otra" despliega sus chips; elegir uno escribe
    // la frecuencia.
    await form.locator('#gfijo-cuando .chip-fecha', { hasText: 'Otra' }).click();
    await expect(form.locator('#gfijo-frecuencia-otra .chip-fecha')).toHaveText(['Cada semana', 'Cada 2 meses', 'Cada 3 meses', 'Cada 6 meses', 'Todos los días', 'Una sola vez']);
    await form.locator('#gfijo-frecuencia-otra .chip-fecha', { hasText: 'Cada 2 meses' }).click();
    await expect(form.locator('#gfijo-frecuencia')).toHaveValue('Bimestral');
    // Cada semana: los siete días en vez de los del mes; el sábado deja el
    // primer pago en el próximo sábado (hoy, si es sábado).
    await form.locator('#gfijo-frecuencia-otra .chip-fecha', { hasText: 'Cada semana' }).click();
    await expect(form.locator('#gfijo-semana')).toBeVisible();
    await expect(form.locator('#gfijo-cuando [data-control="dia"]')).toBeHidden();
    await expect(seguir).toBeHidden();
    await form.locator('.gfijo-semana__dia').nth(5).click();
    const sabado = await page.evaluate(() => {
      const d = new Date();
      d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    await expect(form.locator('#gfijo-fecha-inicio')).toHaveValue(sabado);
    await expect(form.locator('#gfijo-dia')).toHaveValue(String(Number(sabado.slice(8))));
    await expect(form.locator('#gfijo-inicio .campo-finko')).toHaveText(/Primer pago\s*Sáb /);
    await expect(seguir).toBeVisible();
    // De vuelta a Mensual, sin primer pago: los días del mes.
    await form.locator('#gfijo-cuando .chip-fecha', { hasText: 'Mensual' }).click();
    await expect(form.locator('#gfijo-frecuencia-otra')).toBeHidden();
    await expect(form.locator('#gfijo-semana')).toBeHidden();
    await form.locator('#gfijo-fecha-inicio').evaluate((i) => { i.value = ''; i.dispatchEvent(new Event('change', { bubbles: true })); });
    await expect(form.locator('.form-error, .form-errors')).toHaveCount(0);
    await form.locator('[data-dia="15"]').click();
    await expect(titulo).toHaveText('¿Cuándo lo pagas?');
    await expect(form.locator('#gfijo-inicio .campo-finko')).toHaveText(/Primer pago\s*\S{3} 15 \S{3}/);
    await expect(seguir).toHaveText('Continuar');
    await seguir.click();

    await expect(titulo).toHaveText('Así queda tu gasto fijo');
    await expect(paso).toHaveText('Revisar');
    // GAS.15i (ADR 195 D6), como el lienzo: la hoja sigue diciendo "Nuevo
    // gasto fijo" con la barra de pasos; la factura, la teja, el nombre y la
    // categoría con la cifra y "cada mes"; "Se paga" con el próximo; lo
    // opcional en dos líneas y el código de barras.
    await expect(page.locator('#modal-gasto-fijo [data-titulo-base]')).toBeVisible();
    await expect(page.locator('#modal-gasto-fijo .modal__titulo-resumen')).toBeHidden();
    await expect(form.locator('.preguntas__cab .etapa')).toHaveText(['$85.000', 'EPM', 'Día 15', 'Revisar']);
    await expect(titulo).toBeHidden();
    await expect(form.locator('[data-resumen-quien] .factura__quien-n')).toHaveText('EPM');
    await expect(form.locator('[data-resumen-quien] .factura__quien-s')).toHaveText('Servicios públicos');
    await expect(form.locator('[data-resumen-quien] .factura__quien-teja .bank-avatar')).toHaveCount(1);
    await expect(form.locator('[data-resumen-monto]')).toHaveText('$85.000');
    await expect(form.locator('[data-resumen-que]')).toHaveText('cada mes');
    await expect(form.locator('[data-resumen-filas] .recibo__k')).toHaveText(['Se paga']);
    await expect(form.locator('[data-resumen-filas] .recibo__v')).toHaveText(['El 15 de cada mes']);
    await expect(form.locator('[data-resumen-filas] .recibo__s')).toHaveText([/^próximo 15 /]);
    await expect(form.locator('[data-resumen-aviso-caja]')).toBeHidden();
    await expect(form.locator('[data-resumen-notas] .recibo__k')).toHaveText(['Débito automático', 'Número de contrato', 'Nota']);
    await expect(form.locator('[data-resumen-notas] .recibo__interruptor')).toHaveCount(1);
    await expect(form.locator('[data-resumen-notas] .recibo__v')).toHaveText(['Opcional', 'Opcional']);
    await expect(form.locator('[data-resumen-notas] .recibo__agregar')).toHaveText(['Agregar', 'Agregar']);
    await expect(form.locator('[data-preguntas-resumen] .factura__barras')).toBeVisible();
    await expect(form.locator('[data-resumen-agregar]')).toBeHidden();
    // La factura cabe sin desplazar a 390 x 844.
    expect(await page.locator('#modal-gasto-fijo .modal__body').evaluate(b => b.scrollHeight - b.clientHeight)).toBeLessThanOrEqual(1);
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#modal-gasto-fijo[data-open]')).toHaveCount(0);
    await expect.poll(async () => (await leerEstado(page)).compromisos?.at(-1)?.monto).toBe(85_000);
    expect((await leerEstado(page)).compromisos.at(-1)).toMatchObject({
      categoria: 'Servicios públicos', descripcion: 'EPM', marcaId: 'epm', frecuencia: 'Mensual', diaPago: 15,
    });
  });

  test('GAS.10e y GAS.15h (ADR 185 D6, 195 D4): Streaming por grupos y "No está aquí" abre el nombre en la misma pantalla', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#compromisos');
    await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
    await abrir(page, 'nuevo-gasto-fijo');
    const form = page.locator('#form-gasto-fijo');
    const titulo = form.locator('[data-preguntas-t]');
    const seguir = form.locator('[data-preguntas-seguir]');
    for (const t of ['2', '0', '000']) await form.locator(`[data-pregunta-on] [data-tecla="${t}"]`).click();
    await seguir.click();
    await form.locator('.chip-cat', { hasText: 'Streaming' }).click();
    await expect(titulo).toHaveText('¿Cuál plataforma?');
    await expect(form.locator('[data-plataforma-grupo]:not([hidden]) .marcas-grupo__t')).toHaveText(['Series y películas', 'Música']);
    // Cuatro logos por fila.
    const xs = await form.locator('[data-plataforma-grupo]:not([hidden]) .chip-cat--marca').evaluateAll(els => els.slice(0, 5).map(e => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(xs.slice(0, 4)).size).toBe(1);
    expect(xs[4]).toBeGreaterThan(xs[0]);
    await expect(seguir).toBeHidden();
    await form.locator('[data-plataforma-grupo]:not([hidden]) .chip-cat--sin').click();
    // La misma pantalla: la tarjeta del nombre, a la vista sobre "Continuar",
    // con la teja de la categoría y luego las iniciales de lo escrito.
    await expect(titulo).toHaveText('¿Cuál plataforma?');
    const tarjeta = form.locator('#gfijo-sin-empresa');
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta.locator('label')).toHaveText('Nombre de la empresa o del servicio');
    await expect(form.locator('#gfijo-servicio-teja .familia-ico')).toHaveCount(1);
    await expect(form.locator('#gfijo-servicio')).toBeFocused();
    await expect(seguir).toHaveText('Continuar');
    await expect(seguir).toBeVisible();
    const abajo = await tarjeta.evaluate(e => e.getBoundingClientRect().bottom);
    const pie = await form.locator('.preguntas__pie').evaluate(e => e.getBoundingClientRect().top);
    expect(abajo).toBeLessThanOrEqual(pie);
    await form.locator('#gfijo-servicio').fill('Cine de la casa');
    await expect(form.locator('#gfijo-servicio-teja .gfijo-servicio__iniciales')).toHaveText('CC');
    await form.locator('#gfijo-servicio').fill('Mubi');
    await expect(form.locator('#gfijo-servicio-teja .gfijo-servicio__iniciales')).toHaveText('M');
    await seguir.click();
    await expect(titulo).toHaveText('¿Cuándo lo pagas?');
    await expect(form.locator('.preguntas__cab .etapa')).toHaveText(['$20.000', 'Mubi', 'Cuándo', 'Revisar']);
    await form.locator('[data-dia="15"]').click();
    await seguir.click();
    await expect(form.locator('[data-resumen-quien] .factura__quien-n')).toHaveText('Mubi');
    await expect(form.locator('[data-resumen-quien] .factura__quien-s')).toHaveText('Streaming');
    await expect(form.locator('[data-resumen-quien] .gfijo-servicio__iniciales')).toHaveText('M');
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#modal-gasto-fijo[data-open]')).toHaveCount(0);
    await expect.poll(async () => (await leerEstado(page)).compromisos?.at(-1)?.descripcion).toBe('Mubi');
    expect((await leerEstado(page)).compromisos.at(-1)).toMatchObject({ categoria: 'Streaming', marcaId: null, monto: 20_000 });
  });

  test('GF.2 (ADR 177 D4): "Crear categoría" lleva a su pantalla y el fijo se llama como ella', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#compromisos');
    await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
    await abrir(page, 'nuevo-gasto-fijo');
    const form = page.locator('#form-gasto-fijo');
    const titulo = form.locator('[data-preguntas-t]');
    const seguir = form.locator('[data-preguntas-seguir]');
    for (const t of ['4', '0', '000']) await form.locator(`[data-pregunta-on] [data-tecla="${t}"]`).click();
    await seguir.click();
    await form.locator('.chip-cat--crear').click();
    await expect(titulo).toHaveText('Crea tu categoría');
    // Lo que se escribe conserva su botón.
    await expect(seguir).toHaveText('Usar esta categoría');
    // Sin nombre ni ícono no sigue.
    await seguir.click();
    await expect(titulo).toHaveText('Crea tu categoría');
    await form.locator('#gfijo-categoria-nueva-nombre').fill('Parqueadero');
    await form.locator('[data-pregunta-on] .icono-picker__btn[data-icon="c-carro"]').click();
    await seguir.click();
    await expect(titulo).toHaveText('¿Cuándo lo pagas?');
    await expect(form.locator('[data-preguntas-ctx]')).toHaveText('Parqueadero · $40.000');
    await form.locator('[data-dia="10"]').click();
    await seguir.click();
    await expect(form.locator('[data-resumen-quien] .factura__quien-n')).toHaveText('Parqueadero');
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#modal-gasto-fijo[data-open]')).toHaveCount(0);
    await expect.poll(async () => (await leerEstado(page)).compromisos?.at(-1)?.descripcion).toBe('Parqueadero');
    const estado = await leerEstado(page);
    expect(estado.compromisos.at(-1)).toMatchObject({ categoria: 'Parqueadero', monto: 40_000, diaPago: 10 });
    expect(estado.categoriasPersonalizadas.at(-1)).toMatchObject({ nombre: 'Parqueadero', icono: 'c-carro', seccion: 'fijo' });
  });

  test('la cuenta pregunta dónde, qué tipo y cuánto, y editar abre en el resumen', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await abrir(page, 'nueva-cuenta');
    // GAS.8h (ADR 182 D8): "Agregar cuenta" pregunta qué y en qué entidad;
    // el formulario llega con el banco y el tipo, en el saldo.
    const hoja = page.locator('#modal-agregar-cuenta[data-open]');
    await expect(hoja.locator('.limite-pasos__paso')).toHaveText('Paso 1 de 3');
    await hoja.locator('[data-action="cuenta-agregar-tipo"][data-tipo="ahorros"]').click();
    await hoja.locator('[data-action="cuenta-agregar-entidad"][data-banco="Davivienda"]').click();
    await expect(page.locator('#modal-agregar-cuenta[data-open]')).toHaveCount(0);
    const form = page.locator('#form-cuenta');
    const titulo = form.locator('[data-preguntas-t]');
    await expect(form.locator('[name="tipo"]')).toHaveValue('Ahorros');
    await expect(titulo).toHaveText('¿Cuánto tienes hoy en esta cuenta?');
    for (const t of ['5', '0', '0', '000']) await form.locator(`[data-pregunta-on] [data-tecla="${t}"]`).click();
    await form.locator('[data-preguntas-seguir]').click();
    // GMF.1 (ADR 165): una de ahorros dice si es la marcada exenta del 4x1000.
    await expect(titulo).toHaveText('¿Es tu cuenta marcada exenta del 4x1000?');
    await form.locator('#form-group-4x1000 .chip-cat:has(input[value="si"])').click();
    await expect(titulo).toHaveText('Así queda tu cuenta');
    await form.locator('button[type="submit"]').click();
    await expect.poll(async () => (await leerEstado(page)).cuentas?.length).toBe(CUENTAS.length + 1);
    expect((await leerEstado(page)).cuentas.at(-1)).toMatchObject({ banco: 'Davivienda', tipo: 'Ahorros', saldo: 500_000, exenta4x1000: true, aplica4x1000: false });
  });
});

test.describe('MV2.30 - Transferir en el teléfono (ADR 135 D5)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('"Sale de" y "Entra a", "Cambiar" invierte y el botón lleva el monto', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: [
        ...CUENTAS,
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 3_000_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
      ],
    }));
    await page.goto('/#tesoreria');
    await page.locator('[data-action="abrir-transferencia"]:visible').click({ timeout: 10_000 });
    const hoja = page.locator('#modal-transferencia[data-open]');
    // ADR 142 D4 (FORM.2c): el monto con el teclado de Finko, después las cuentas.
    for (const t of ['2', '0', '0', '000']) await hoja.locator(`[data-tecla="${t}"]`).click();
    await expect(hoja.locator('#transferencia-monto')).toHaveValue('200.000');
    await hoja.locator('[data-etapa-seguir]').click();
    await expect(hoja.locator('.transferir-de-a__rotulo')).toHaveText(['Sale de', 'Entra a']);
    await expect(hoja.locator('.transferir-cuenta__nombre').first()).toHaveText('Bancolombia');
    await hoja.locator('[data-action="invertir-transferencia"]').click();
    await expect(hoja.locator('.transferir-cuenta__nombre').first()).toHaveText('Nequi');
    await expect(hoja.locator('#transferencia-enviar')).toHaveText('Transferir $200.000');
  });
});

test.describe('MV2.30 - Me deben en el teléfono (ADR 135 D7 y D8)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('los grupos con su suma, la hoja de un préstamo y "Me pagó" desde el círculo', async ({ page }) => {
    const hace = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
    await sembrar(page, estadoBase({
      cuentas: CUENTAS,
      personales: [
        { id: 'p1', persona: 'Mamá', monto: 120_000, pagado: 0, fecha: hace(30), motivo: 'mercado', liquidado: false },
        { id: 'p2', persona: 'Andrés', monto: 250_000, pagado: 100_000, fecha: hace(42), motivo: 'arreglo del carro', cuentaId: 'c1', liquidado: false },
      ],
    }));
    await page.goto('/#personales');
    await expect(page.locator('#sec-personales.active')).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('#sec-personales .section__linea')).toBeHidden();
    await expect(page.locator('.medeben-total__cifra')).toHaveText('$270.000');
    await expect(page.locator('.medeben-grupo__titulo')).toHaveText(['Sin fecha pactada']);
    await expect(page.locator('.medeben-grupo__suma')).toHaveText(['$270.000']);

    await page.locator('.medeben-fila__abrir[data-id="p2"]').click();
    const hoja = page.locator('#modal-detalle-fila[data-open]');
    await expect(hoja.locator('#detalle-fila-titulo')).toHaveText('Andrés');
    await expect(hoja.locator('.detalle-prestamo__devuelto')).toHaveText('Te devolvió $100.000 de $250.000 · 40%');
    await page.keyboard.press('Escape');

    await page.locator('.medeben-fila__pago[data-id="p2"]').click();
    const pago = page.locator('#modal-pago-personal[data-open]');
    await expect(pago.locator('#modal-pago-personal-title')).toHaveText('Te pagó Andrés');
    await expect(pago.locator('[data-pago-texto]')).toHaveText('Registrar $150.000');
  });
});
