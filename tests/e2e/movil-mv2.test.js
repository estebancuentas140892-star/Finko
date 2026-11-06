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
import { sembrar, estadoBase } from './helpers/estado.js';
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
    const top = await page.evaluate((id) => Math.round(
      document.querySelector(`#lista-gastos .list-item[data-id="${id}"]`).getBoundingClientRect().top), leida.id);
    expect(top).toBeLessThan(leida.top + 4);
  });

  test('por la barra inferior no aparece volver contextual', async ({ page }) => {
    await seedConGastos(page);
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });
    await page.click('.sidebar .nav-item[href="#dash"]');
    await expect(page.locator('#sec-dash.active')).toBeVisible();
    await expect(page.locator('.section__volver--contexto')).toHaveCount(0);
  });

  test('la fila mide una línea y abre la hoja; editar desde la hoja abre el gasto (D4)', async ({ page }) => {
    await seedConGastos(page);
    await page.goto('/#gast');
    const fila = page.locator('#lista-gastos .list-item').first();
    await expect(fila).toBeVisible({ timeout: 10_000 });

    const caja = await fila.boundingBox();
    expect(caja.height).toBeLessThan(90);
    await expect(fila.locator('.list-item__action')).toBeHidden();

    await fila.locator('.list-item__detalle').click();
    const hoja = page.locator('#modal-detalle-fila[data-open]');
    await expect(hoja).toHaveCount(1);
    // ADR 119 D2: la hoja del gasto nombra sus acciones como el canvas.
    await expect(hoja.locator('.detalle-fila__accion')).toHaveText([
      'Repetir hoy', 'Editar', 'Borrar este gasto',
    ]);

    await hoja.locator('[data-target-action="editar-gasto"]').click();
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(1);
    await expect(page.locator('#modal-detalle-fila[data-open]')).toHaveCount(0);
    await expect(page.locator('#gasto-monto')).not.toHaveValue('');
  });

  test('el primario del bloque abre el formulario y "Guardar" queda a la vista (D5, D8)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await seedConGastos(page);
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    await expect(page.locator('#sec-gast > .section__header')).toBeHidden();
    await page.click('#sec-gast .bloque-gastos__primario');
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(1);

    const guardar = page.locator('#modal-gasto .modal__footer--principal .btn-primary');
    await expect(guardar).toBeInViewport();
    // Ninguna categoría se esconde detrás de un "ver más" (ADR 042 D2).
    const radios = await page.locator('#form-gasto input[name="categoria"]').count();
    await expect(page.locator('#form-gasto .chip-cat:visible')).toHaveCount(radios);
  });

  test('con el teclado abierto, "Guardar" queda encima del teclado (ADR 115)', async ({ page }) => {
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
    await page.click('#sec-gast .bloque-gastos__primario');
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(1);

    // El teclado de iOS deja visible algo menos de la mitad de arriba.
    await page.evaluate(() => {
      window.visualViewport.height = 380;
      window.visualViewport.dispatchEvent(new Event('resize'));
    });
    await expect(page.locator('html')).toHaveAttribute('data-teclado', 'abierto');
    const guardar = page.locator('#modal-gasto .modal__footer--principal .btn-primary');
    await expect.poll(async () => {
      const b = await guardar.boundingBox();
      return b ? b.y + b.height : Infinity;
    }).toBeLessThanOrEqual(380);

    // Al cerrarse el teclado, la hoja vuelve a su alto de siempre.
    await page.evaluate(() => {
      window.visualViewport.height = window.innerHeight;
      window.visualViewport.dispatchEvent(new Event('resize'));
    });
    await expect(page.locator('html')).not.toHaveAttribute('data-teclado', /.*/);
  });

  test('las categorías plegadas dicen cuántas faltan y se abren (D6)', async ({ page }) => {
    await seedConGastos(page);
    await page.goto('/#gast');
    const mas = page.locator('#panel-filtros-gastos .filtros-bar__mas');
    // ADR 132 D2: plegada, "Todos" y las tres categorías con más gasto.
    await expect(mas).toHaveText(`${CATEGORIAS.length - 3} categorías`, { timeout: 10_000 });
    await expect(page.locator('#panel-filtros-gastos button.chip[data-cat]:visible')).toHaveCount(4);

    await mas.click();
    await expect(page.locator('#panel-filtros-gastos button.chip[data-cat]:visible')).toHaveCount(CATEGORIAS.length + 1);
    await page.locator('#panel-filtros-gastos button.chip[data-cat="Ropa"]').click();
    await expect(page.locator('#panel-filtros-gastos .filtros-bar--abierta')).toHaveCount(0);
    await expect(page.locator('#panel-filtros-gastos button.chip.chip--active')).toHaveText('Ropa');
  });

  test('la fila del título: crear tonal y corto, la frase debajo (ADR 106 D1, D4)', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: CUENTAS,
      personales: [{ id: 'p1', persona: 'Camila', monto: 300_000, pagado: 0, fecha: fechaDelMes(1), liquidado: false, fechaCreacion: '2026-07-01T00:00:00.000Z' }],
    }));
    await page.goto('/#tesoreria');
    const hd = page.locator('#sec-tesoreria > .section__header');
    const crear = hd.locator(':scope > .btn-primary');
    await expect(crear).toHaveText('Cuenta', { timeout: 10_000 });
    await expect(crear).toHaveAttribute('aria-label', 'Nueva cuenta');
    const caja = async (l) => l.boundingBox();
    const [h, b, t, f] = await Promise.all([hd, crear, hd.locator('.section__title'), hd.locator('.section__linea')].map(caja));
    // Crear va en la fila del título, la frase debajo, y el encabezado no pasa de 72px.
    expect(Math.abs(b.y - t.y)).toBeLessThan(16);
    expect(f.y).toBeGreaterThan(t.y + t.height - 1);
    expect(h.height).toBeLessThanOrEqual(72);
    // Tonal: no es el verde lleno de mover dinero (R38).
    expect(await crear.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(
      await page.locator('#topbar-primario').evaluate(el => getComputedStyle(el).backgroundColor));

    // A 320 queda solo el "+" y el título no se parte en dos líneas.
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/#personales');
    const hdP = page.locator('#sec-personales > .section__header');
    const crearP = hdP.locator(':scope > .btn-primary');
    await expect(crearP).toBeVisible({ timeout: 10_000 });
    const bP = await crearP.boundingBox();
    expect(Math.round(bP.width)).toBe(44);
    const tP = await hdP.locator('.section__title').boundingBox();
    expect(tP.height).toBeLessThan(32);
  });

  test('a 320 el nombre va en una línea con puntos y los filtros de Por pagar miden lo mismo (ADR 126 D1, ADR 122 D3)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await sembrar(page, estadoBase({
      perfil: { nombre: 'María Fernanda Restrepo Villegas', smmlv: 1750905 },
      cuentas: CUENTAS,
      compromisos: [{ id: 'f1', tipo: 'fijo', descripcion: 'Arriendo', monto: 900_000, frecuencia: 'Mensual', diaPago: 28, activo: true }],
    }));
    await page.goto('/#dash');
    const nombre = page.locator('#saludo-inicio');
    await expect(nombre).toBeVisible({ timeout: 10_000 });
    // ADR 126 D1 (supera el 122 D2): el nombre va en una sola línea y se corta
    // con puntos; el completo sigue en el nombre accesible del avatar.
    expect(await nombre.evaluate(el => getComputedStyle(el).textOverflow)).toBe('ellipsis');
    expect(await nombre.evaluate(el => Math.round(el.getBoundingClientRect().height))).toBeLessThanOrEqual(24);
    await expect(page.locator('#perfil-boton')).toHaveAttribute('aria-label', /María Fernanda Restrepo Villegas/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

    await page.goto('/#compromisos');
    const chips = page.locator('#lista-compromisos > .filtros-bar > .chip');
    await expect(chips).toHaveCount(4, { timeout: 10_000 });
    const cajas = await chips.evaluateAll(els => els.map(el => el.getBoundingClientRect()));
    expect(new Set(cajas.map(c => Math.round(c.top))).size).toBe(1);
    expect(Math.max(...cajas.map(c => c.width)) - Math.min(...cajas.map(c => c.width))).toBeLessThan(1);
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
    // El vacío calla su propio mensaje y queda un solo "Nuevo préstamo".
    await expect(sec.locator('.empty-state__title')).toBeHidden();
    await expect(sec.locator('[data-action="nuevo-personal"]:visible')).toHaveCount(1);
    await expect(sec.locator('.empty-state [data-action="nuevo-personal"]')).toBeVisible();
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
    for (const alto of await filas.evaluateAll(els => els.map(e => e.getBoundingClientRect().height))) {
      expect(alto).toBeLessThan(70);
    }
    await expect(sec.locator('[data-action^="eliminar"]:visible')).toHaveCount(0);

    // La cuenta: sus acciones en la hoja, eliminar aparte, y el 4x1000 como nota.
    await sec.locator('.cuenta-card[data-id="c2"] .list-item__detalle').click();
    const hoja = page.locator('#modal-detalle-fila[data-open]');
    await expect(hoja.locator('.detalle-fila__acciones .detalle-fila__accion')).toHaveText(['Ver sus movimientos', 'Editar cuenta']);
    await expect(hoja.locator('.detalle-fila__peligro .detalle-fila__accion')).toHaveText('Eliminar cuenta');
    await expect(hoja.locator('.detalle-fila__notas')).toContainText('4x1000');

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
    await expect(page.locator('#distribuir-resumen')).toContainText('Queda disponible en tu cuenta');

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
    // D5: la comparación compacta, dentro del paso 1.
    await expect(hoja.locator('[data-dist-paso="0"] .distribuir-edu--compacto')).toBeVisible();

    const siguiente = hoja.locator('[data-action="distribuir-paso-siguiente"]');
    while (await siguiente.isVisible()) await siguiente.click();
    await page.check('[data-dist-remanente][value="cuenta"]');
    const confirmar = hoja.locator('[data-action="confirmar-distribucion"]');
    await expect(confirmar).toBeDisabled();
    await expect(page.locator('#distribuir-resumen')).toHaveText('Elige arriba desde qué cuenta sale el dinero.');

    await hoja.locator('#distribuir-cuenta').selectOption('c2');
    await expect(hoja.locator('[data-dist-que-sub]')).toHaveText('Salario · desde Bancolombia');
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
    await expect(page.locator('#sec-config .config-grupo__label').first()).toHaveText('Tu cuenta');
    await expect(filas.first()).toContainText('Laura');
    const alto = await page.evaluate(() => document.querySelector('#sec-config').getBoundingClientRect().height);
    expect(alto).toBeLessThan(1500);

    // El candado se abre en su sitio, con su formulario.
    await expect(page.locator('#form-bloqueo-crear')).toBeHidden();
    await page.locator('[data-fila="bloqueo"]').click();
    await expect(page.locator('#form-bloqueo-crear')).toBeVisible();

    // Cambiar el tema repinta el panel: lo abierto sigue abierto.
    await page.locator('[data-fila="tema"]').click();
    await page.locator('label[for="toggle-tema"]').click();
    await expect(page.locator('[data-fila="tema"]')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#form-bloqueo-crear')).toBeVisible();
  });
  test('al bajar, la barra de lentes queda arriba y sigue llevando a su lente (ADR 113)', async ({ page }) => {
    await seedConGastos(page);
    await page.goto('/#gast');
    const barra = page.locator('#sec-gast .bloque-tabs');
    await expect(barra).toBeVisible({ timeout: 10_000 });
    const alCargar = await barra.boundingBox();
    expect(alCargar.y).toBeGreaterThan(100);

    // Se desplaza dentro del sondeo: volver.js deja arriba la sección recién
    // abierta y puede pisar un desplazamiento hecho antes de asentarse.
    await expect.poll(async () => {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      return (await barra.boundingBox()).y;
    }).toBeLessThanOrEqual(1);
    await expect(barra).toBeInViewport();
    await barra.locator('[data-section="compromisos"]').click();
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

    // D4 (R73): cada hija de Ahorro dice su pregunta bajo el título.
    await page.goto('/#metas');
    await expect(page.locator('#sec-metas .section__linea')).toHaveText('Algún día, cuando quieras');
  });

  test('Por pagar va por urgencia, marca con un círculo y la fila abre su hoja (ADR 117 D1, ADR 132 D7)', async ({ page }) => {
    test.skip(new Date().getDate() < 3, 'hace falta que los días 1 y 2 del mes ya hayan pasado');
    await seedPorPagar(page);
    await page.goto('/#compromisos');
    const grupos = page.locator('#lista-compromisos .porpagar-grupo__head span[id]');
    await expect(grupos.first()).toHaveText('Vencidos', { timeout: 10_000 });
    await expect(page.locator('.porpagar-grupo__orden').first()).toHaveText('Del más antiguo al más reciente');
    await expect(page.locator('.porpagar-ayuda')).toContainText('Toca el círculo cuando pagues algo');
    // El lote baja al pie de lo vencido; su tarjeta suelta se oculta.
    await expect(page.locator('.porpagar-grupo__pie [data-action="compromisos-pagar-lote"]')).toHaveText(/^Pagar los 2 · \$1\.620\.000$/);
    await expect(page.locator('#lote-compromisos')).toBeHidden();

    // El círculo es el pago: 44 de blanco táctil y por encima del botón de la fila.
    const fila = page.locator('.deuda-card--fila[data-id="d1"]');
    await expect(fila.locator('.deuda-card__estado')).toContainText('deuda');
    const marca = fila.locator('button.porpagar-marca');
    await expect(marca).toHaveAttribute('aria-label', 'Abonar a Tarjeta Visa Bancolombia');
    const caja = await marca.boundingBox();
    expect(Math.min(caja.width, caja.height)).toBeGreaterThanOrEqual(44);
    await marca.click();
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
    await expect(page.locator('#modal-detalle-fila[data-open]')).toHaveCount(1);

    await page.evaluate(() => window.__vigias.at(-1).close());
    await expect(page.locator('#modal-detalle-fila[data-open]')).toHaveCount(0);
    await expect(page).toHaveURL(/#gast$/);
  });

  test('Por pagar termina en "¿Cómo salir más rápido?" y el plan se abre en su hoja (ADR 119 D1)', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: CUENTAS,
      compromisos: [
        { id: 'd1', tipo: 'deuda-entidad', descripcion: 'Tarjeta Visa', saldoTotal: 3_200_000, cuotaMensual: 420_000,
          frecuencia: 'Mensual', diaPago: 25, activo: true, tasa: 0.28, tasaUnidad: 'EA' },
        { id: 'd2', tipo: 'deuda-personal', descripcion: 'Préstamo de mi hermano', saldoTotal: 700_000,
          cuotaMensual: 100_000, frecuencia: 'Mensual', diaPago: 28, activo: true, tasa: 0 },
      ],
    }));
    await page.goto('/#compromisos');
    const entrada = page.locator('#plan-salida-entrada .plan-salida');
    await expect(entrada).toBeVisible({ timeout: 10_000 });
    await expect(entrada).toContainText('Compara Avalancha y Bola de nieve con tus 2 deudas');
    // El simulador ya no ocupa la sección: vive en la hoja.
    await expect(page.locator('#sec-compromisos > #estrategia-pago')).toHaveCount(0);

    await entrada.click();
    const hoja = page.locator('#modal-plan-salida[data-open]');
    await expect(hoja.locator('#estrategia-pago .estrategia-card__title')).toHaveText('¿Cómo salir más rápido?');
    await hoja.locator('.mas-sheet__close').click();
    await expect(page.locator('#modal-plan-salida[data-open]')).toHaveCount(0);
  });

  test('la hoja del gasto dice de qué cuenta salió, cómo va su límite y lleva a sus gastos del mes (ADR 119 D2)', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: CUENTAS,
      presupuestos: [{ id: 'p1', categoria: 'Mercado', montoMensual: 25_000, activo: true }],
      gastos: gastos(),
    }));
    await page.goto('/#gast');
    const fila = page.locator('#lista-gastos .list-item--detalle[data-id="g0"]');
    await expect(fila).toBeVisible({ timeout: 10_000 });
    await fila.locator('.list-item__detalle').click();
    const hoja = page.locator('#modal-detalle-fila[data-open]');
    await expect(hoja.locator('#detalle-fila-titulo')).toHaveText('Mercado');
    await expect(hoja.locator('.detalle-gasto__dato').first()).toContainText('Nequi');
    await expect(hoja.locator('.detalle-gasto__limite')).toContainText('de su límite de $25.000');
    await expect(hoja.locator('.detalle-gasto__al-borrar')).toHaveText('Te pediremos confirmar. Los $10.000 vuelven a Nequi.');

    const ver = hoja.locator('[data-action="gasto-ver-categoria"]');
    await expect(ver).toContainText('Los 4 gastos de Mercado en');
    await ver.click();
    await expect(page.locator('#sec-movimientos.active')).toBeVisible();
    await expect(page.locator('#modal-detalle-fila[data-open]')).toHaveCount(0);
    await expect(page.locator('#lista-movimientos .list-item')).toHaveCount(4);
  });

  test('con el texto al 200 %, los montos bajan y las lentes van en dos líneas (ADR 117 D4)', async ({ page }) => {
    await seedPorPagar(page);
    await page.goto('/#compromisos');
    await expect(page.locator('.deuda-card--fila').first()).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });

    const fila = page.locator('.deuda-card--fila[data-id="d1"]');
    const nombre = await fila.locator('.deuda-card__nombre').boundingBox();
    const monto = await fila.locator('.deuda-card__saldo').boundingBox();
    expect(monto.y).toBeGreaterThanOrEqual(nombre.y + nombre.height);
    // El monto entero, sin cortes, y nada se desliza a lo ancho.
    expect(await fila.locator('.deuda-card__saldo').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    const lente = page.locator('#sec-compromisos .bloque-tabs__tab.active .bloque-tabs__label');
    expect(await renglones(lente)).toBe(2);
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
    const hoja = page.locator('#modal-detalle-fila[data-open] > .modal');
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
    await expect(page.locator('#modal-detalle-fila[data-open]')).toHaveCount(1);
    await expect(hoja).not.toHaveAttribute('data-arrastre');
    // Vuelve a su sitio: el siguiente dedo tiene que caer sobre ella.
    await quieta();
    expect(Math.round((await hoja.boundingBox()).y)).toBe(Math.round(caja.y));

    await arrastrar(220, 10);
    await expect(page.locator('#modal-detalle-fila[data-open]')).toHaveCount(0);
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
    expect(m.alto).toBeGreaterThanOrEqual(80);
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
