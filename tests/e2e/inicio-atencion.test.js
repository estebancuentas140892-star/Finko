/**
 * inicio-atencion.test.js - Inicio como centro de atención rápida
 * (INI.1, ADR 149).
 *
 * Cubre en el navegador:
 * - D1: el orden de la pantalla, en el teléfono: Atención hoy, Esta semana,
 *   Por completar y Novedades.
 * - D2: lo que es novedad (límite pasado, meta alcanzada) no está en
 *   "Atención hoy"; "Novedades" lo dice con sus filas.
 * - D3: "Por completar" abre el gasto sin nombre y contesta la pregunta de
 *   gusto o necesidad desde Inicio; al resolverse, la fila se va.
 * - Sin nada por completar ni novedades, no hay tarjetas vacías.
 * - Escritorio: los dos bloques van lado a lado; con uno solo, ocupa la fila.
 *
 * Reloj fijo: los 30 días de un gasto sin nombre y los 7 de una meta
 * alcanzada dependen de la fecha.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

const HOY = new Date('2026-11-16T10:00:00');
// GAS.9c (ADR 183 D3): sin pagos, lo que vence desde la creación está vencido;
// los fijos nacen el día 1 del mes del escenario.
const FIJO_CREADO = '2026-11-01T15:00:00.000Z';

const CUENTA = { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 3_000_000, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' };

/** Un arriendo vencido, un colegio en dos días, un límite pasado, dos gastos en
 *  Otros sin nombre, tres domicilios sin contestar y una meta alcanzada hace dos días. */
function completo() {
  return estadoBase({
    perfil: { nombre: 'Laura', smmlv: 1750905 },
    cuentas: [CUENTA],
    compromisos: [
      { id: 'k1', descripcion: 'Arriendo', tipo: 'fijo', categoria: 'Vivienda', monto: 1_350_000, frecuencia: 'Mensual', diaPago: 13, activo: true, fechaCreacion: FIJO_CREADO },
      { id: 'k2', descripcion: 'Colegio', tipo: 'fijo', categoria: 'Educación', monto: 682_016, frecuencia: 'Mensual', diaPago: 18, activo: true, fechaCreacion: FIJO_CREADO },
    ],
    presupuestos: [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 100_000, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z' }],
    gastos: [
      { id: 'g1', monto: 18_000, categoria: 'Otros', fecha: '2026-11-16', cuentaId: 'c1' },
      { id: 'g2', monto: 9_000, categoria: 'Otros', fecha: '2026-11-14', cuentaId: 'c1' },
      { id: 'd1', monto: 15_000, categoria: 'Restaurantes', subcategoriaId: 'rest-domicilio', fecha: '2026-11-15', cuentaId: 'c1' },
      { id: 'd2', monto: 16_000, categoria: 'Restaurantes', subcategoriaId: 'rest-domicilio', fecha: '2026-11-13', cuentaId: 'c1' },
      { id: 'd3', monto: 14_000, categoria: 'Restaurantes', subcategoriaId: 'rest-domicilio', fecha: '2026-11-11', cuentaId: 'c1' },
      { id: 'r1', monto: 90_000, categoria: 'Restaurantes', fecha: '2026-11-12', cuentaId: 'c1' },
    ],
    metas: [{
      id: 'm1', nombre: 'Moto', montoObjetivo: 2_000_000, montoActual: 2_000_000, completada: true,
      fechaCreacion: '2026-01-01T00:00:00.000Z',
      aportes: [{ id: 'a1', fecha: '2026-11-14', monto: 2_000_000, cuentaId: 'c1' }],
    }],
  });
}

async function abrir(page, estado = completo()) {
  await page.clock.setFixedTime(HOY);
  await sembrar(page, estado);
  await page.goto('/#dash');
  await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
}

test.describe('INI.1 - Inicio en el teléfono (ADR 149)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('el orden: Atención hoy, Esta semana, Por completar y Novedades (D1)', async ({ page }) => {
    await abrir(page);
    await expect(page.locator('#panel-novedades')).toBeVisible();
    const tops = await page.evaluate(() => ['#panel-atencion-hoy', '#panel-prioridades', '#panel-por-completar', '#panel-novedades']
      .map(s => document.querySelector(s).getBoundingClientRect().top));
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sobra).toBe(0);
  });

  test('lo que es novedad no está en Atención hoy; Novedades lo dice (D2)', async ({ page }) => {
    await abrir(page);
    const hoy = page.locator('#panel-atencion-hoy');
    await expect(hoy).toContainText('Arriendo');
    await expect(hoy).not.toContainText('Restaurantes');
    await expect(hoy).not.toContainText('Moto');

    const filas = page.locator('#panel-novedades .atencion-hoy__fila');
    await expect(filas).toHaveCount(2);
    await expect(filas.nth(0)).toContainText('Restaurantes pasó su límite');
    await expect(filas.nth(1)).toContainText('Alcanzaste tu meta Moto');
    await expect(filas.nth(1).locator('a')).toHaveAttribute('href', '#metas');
  });

  test('"Completar" abre el gasto sin nombre y, con nota, la fila pasa al siguiente (D3)', async ({ page }) => {
    await abrir(page);
    const bloque = page.locator('#panel-por-completar');
    await expect(bloque).toContainText('2 gastos en Otros no dicen en qué fueron');

    await bloque.locator('[data-action="editar-gasto"]').click();
    await expect(page.locator('#modal-gasto')).toHaveAttribute('data-open', '');
    // El campo de la nota vive en otra etapa de la hoja: se llena directo.
    await page.locator('#modal-gasto [name="nota"]').evaluate((el) => {
      el.value = 'Regalo';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#modal-gasto [type="submit"]').evaluate(b => b.click());
    await expect(page.locator('#modal-gasto')).not.toHaveAttribute('data-open', '');
    await expect(bloque).toContainText('Un gasto en Otros no dice en qué fue');
  });

  test('la pregunta de gusto o necesidad se contesta desde Inicio y se va (D3)', async ({ page }) => {
    await abrir(page);
    const bloque = page.locator('#panel-por-completar');
    await expect(bloque).toContainText('Domicilio: ¿fue una necesidad o un deseo?');
    await bloque.locator('[data-respuesta="necesidad"]').click();
    await expect(bloque).not.toContainText('Domicilio');
    await expect(bloque).toContainText('2 gastos en Otros');
  });

  test('sin nada por completar ni novedades, no hay tarjetas vacías', async ({ page }) => {
    await abrir(page, estadoBase({ perfil: { nombre: 'Laura', smmlv: 1750905 }, cuentas: [CUENTA] }));
    // INI.2f (ADR 152 D8; la hamaca, ADR 155): sin nada hoy ni esta semana, Tino descansa en su lugar.
    await expect(page.locator('#panel-todo-al-dia')).toBeVisible();
    await expect(page.locator('#panel-atencion-hoy')).toBeHidden();
    await expect(page.locator('#panel-por-completar')).toBeHidden();
    await expect(page.locator('#panel-novedades')).toBeHidden();
    await expect(page.locator('.inicio-seguimiento')).toBeHidden();
  });
});

test.describe('INI.1 - Inicio en escritorio (ADR 149)', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('Por completar y Novedades van lado a lado; los avisos de siempre no las repiten', async ({ page }) => {
    await abrir(page);
    const completar = page.locator('#panel-por-completar');
    const novedades = page.locator('#panel-novedades');
    await expect(completar).toBeVisible();
    await expect(novedades).toBeVisible();
    // offsetTop/offsetLeft: la caja de layout, sin la animación de entrada
    // del bento (que desplaza cada celda con su propio retraso).
    const [a, b] = await page.evaluate(() => ['#panel-por-completar', '#panel-novedades']
      .map(s => { const e = document.querySelector(s); return { y: e.offsetTop, x: e.offsetLeft, w: e.offsetWidth }; }));
    expect(a.y).toBe(b.y);
    expect(b.x).toBeGreaterThanOrEqual(a.x + a.w);
    await expect(page.locator('#panel-limites')).toHaveCount(0);
    await expect(page.locator('#panel-avisos')).not.toContainText('Restaurantes');
  });

  test('con un solo bloque, ocupa la fila', async ({ page }) => {
    const estado = completo();
    estado.metas = [];
    estado.presupuestos = [];
    await abrir(page, estado);
    const completar = page.locator('#panel-por-completar');
    await expect(completar).toBeVisible();
    await expect(page.locator('#panel-novedades')).toBeHidden();
    const ancho = await page.evaluate(() => ({
      celda: document.querySelector('#panel-por-completar').getBoundingClientRect().width,
      fila: document.querySelector('.inicio-seguimiento .bento__group-cells').getBoundingClientRect().width,
    }));
    expect(Math.round(ancho.celda)).toBe(Math.round(ancho.fila));
  });
});
