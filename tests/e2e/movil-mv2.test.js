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
