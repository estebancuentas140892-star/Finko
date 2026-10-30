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

const scrollY = (page) => page.evaluate(() => window.scrollY);

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
    await expect(hoja.locator('.detalle-fila__accion')).toHaveText([
      'Repetir este gasto', 'Editar gasto', 'Eliminar gasto',
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

  test('las categorías plegadas dicen cuántas faltan y se abren (D6)', async ({ page }) => {
    await seedConGastos(page);
    await page.goto('/#gast');
    const mas = page.locator('#panel-filtros-gastos .filtros-bar__mas');
    await expect(mas).toHaveText(`+${CATEGORIAS.length} categorías`, { timeout: 10_000 });
    await expect(page.locator('#panel-filtros-gastos button.chip[data-cat]:visible')).toHaveCount(1);

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

  test('el ojo va en el encabezado de toda pantalla con montos (ADR 106 D3)', async ({ page }) => {
    await seedConTipos(page);
    await page.goto('/#movimientos');
    for (const sec of ['movimientos', 'ahorro', 'fondo', 'metas', 'apartados', 'inversion', 'tesoreria', 'personales', 'agenda', 'analisis']) {
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
    await expect(page.locator('#nino-main .kcamino')).toBeVisible();
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(desborde).toBeLessThanOrEqual(0);

    // La barra del niño se sigue pudiendo usar sin alejar la página.
    await page.click('#nino-nav [data-vista="alcancia"]');
    await expect(page.locator('#nino-main h1')).toContainText('alcancía');
  });
});
