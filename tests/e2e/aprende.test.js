/**
 * aprende.test.js - APR.1a: la ruta de Aprende y una lección completa a
 * pantalla completa, de punta a punta en el navegador (ADR 092 D7 y D8).
 *
 * Cubre lo que los unitarios no pueden: la carga del contenido con
 * `import()`, el overlay a pantalla completa, el foco en cada paso, el
 * avance guardado para retomar y el Aplícalo con los gastos sembrados.
 */

import { test, expect } from '@playwright/test';
import { sembrarSiVacio, estadoBase, leerEstado, parchar } from './helpers/estado.js';

/** Fecha de este mes, para que los gastos caigan en el Aplícalo. */
function diaDelMes(dia) {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

test.describe('APR.1a - Aprende', () => {
  test.beforeEach(async ({ page }) => {
    await sembrarSiVacio(page, estadoBase({
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 500_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' }],
      gastos: [
        { id: 'g1', descripcion: '', monto: 6_500, categoria: 'Restaurantes', fecha: diaDelMes(1), cuentaId: 'c1' },
        { id: 'g2', descripcion: '', monto: 15_000, categoria: 'Transporte', fecha: diaDelMes(1), cuentaId: 'c1' },
        { id: 'g3', descripcion: '', monto: 300_000, categoria: 'Mercado', fecha: diaDelMes(1), cuentaId: 'c1' },
      ],
    }));
    await page.goto('/#aprende');
    await page.waitForSelector('#sec-aprende.active', { timeout: 10_000 });
  });

  test('la ruta recomienda la unidad 3 y su lección 1', async ({ page }) => {
    await expect(page.locator('.aprende-unidad--actual')).toContainText('Unidad 3 · vas aquí');
    await expect(page.locator('.aprende-unidad__cta')).toHaveText('Empezar la lección 1');
    await expect(page.locator('.aprende-grupo')).toContainText('Fondo de emergencia');
  });

  test('una lección completa: casi, clasificar, control y Aplícalo con tus datos', async ({ page }) => {
    // Nada se bloquea (D8): la lección 2 se abre desde su fila sin hacer la 1.
    await page.click('.aprende-paso__boton[data-id="u3-l2"]');
    const leccion = page.locator('#modal-leccion[data-open]');
    await expect(leccion).toHaveCount(1);
    await expect(page.locator('.leccion__cuenta')).toHaveText('1 de 5');
    await expect(page.locator('#leccion-titulo')).toBeFocused();

    await page.click('.leccion__pie [data-action="leccion-continuar"]');
    // Equivocarse muestra "Casi" (nunca rojo) y la pregunta vuelve al final.
    await page.click('[data-action="leccion-elegir"][data-idx="2"]');
    await expect(page.locator('.leccion-fb--casi')).toContainText('Esta pregunta vuelve al final');
    await expect(page.locator('#leccion-fb-titulo')).toBeFocused();
    await page.click('.leccion-fb [data-action="leccion-continuar"]');

    // Clasificar con los botones, la alternativa accesible al gesto.
    await expect(page.locator('.leccion__cuenta')).toHaveText('3 de 5');
    const esHormiga = ['Recarga del celular', 'Pandebono y café', 'Domicilio de almuerzo'];
    for (let i = 0; i < 6; i++) {
      const titulo = (await page.locator('.leccion-tarjeta--arriba .leccion-tarjeta__titulo').textContent()).trim();
      await page.click(`[data-lado="${esHormiga.includes(titulo) ? 'si' : 'no'}"]`);
      if (i < 5) await expect(page.locator('.leccion__conteo-faltan')).toHaveText(`Faltan ${5 - i}`);
    }
    await expect(page.locator('.leccion-fb--bien')).toBeVisible();
    await page.click('.leccion-fb [data-action="leccion-continuar"]');

    // Mover el control recalcula en vivo.
    await expect(page.locator('.leccion-resultado__cifra')).toHaveText('$1.170.000');
    await page.locator('.leccion-rango').fill('7');
    await expect(page.locator('.leccion-resultado__cifra')).toHaveText('$1.638.000');
    await page.click('.leccion__pie [data-action="leccion-continuar"]');

    // La pregunta fallada vuelve antes del cierre.
    await expect(page.locator('.leccion__eyebrow').first()).toHaveText('Otra vez');
    await page.click('[data-action="leccion-elegir"][data-idx="1"]');
    await page.click('.leccion-fb [data-action="leccion-continuar"]');

    // Cierre: lección lista y el Aplícalo con los gastos pequeños sembrados.
    await expect(page.locator('.leccion__cuenta')).toHaveText('Lista');
    await expect(page.locator('.leccion-aplica__cifra')).toHaveText('$21.500');
    await expect(page.locator('.leccion-aplica')).toContainText('Son 2 compras');
    // save() va con debounce (ADN 5): se espera a que lo terminado quede escrito.
    await expect.poll(async () => Object.keys((await leerEstado(page)).aprende?.hechas ?? {}))
      .toEqual(['u3-l2']);
    expect((await leerEstado(page)).aprende.enCurso).toBeNull();

    // El botón dice el monto (R50) y pone el límite en Límites, su dueño.
    await expect(page.locator('[data-action="leccion-limite-hormiga"]')).toHaveText('Poner un límite de $20.000');
    await page.click('[data-action="leccion-limite-hormiga"]');
    await expect(leccion).toHaveCount(0);
    await expect(page.locator('#sec-presupuesto.active')).toHaveCount(1);
    await expect(page.locator('.envelope--hormiga')).toContainText('Gastos pequeños');
    await expect.poll(async () => (await leerEstado(page)).config?.hormiga?.limite).toBe(20_000);
  });

  test('salir guarda el avance y la ruta ofrece seguir donde quedó', async ({ page }) => {
    await page.click('.aprende-unidad__cta');
    await page.click('.leccion__pie [data-action="leccion-continuar"]');
    await page.click('[data-action="leccion-elegir"][data-idx="2"]');
    await page.click('.leccion-fb [data-action="leccion-continuar"]');
    await page.click('[data-action="leccion-salir"]');
    await expect(page.locator('#modal-leccion[data-open]')).toHaveCount(0);
    await expect(page.locator('.aprende-unidad__cta')).toHaveText('Seguir la lección 1');
    await expect.poll(async () => (await leerEstado(page)).aprende?.enCurso?.paso).toBe(2);

    await page.reload();
    await page.waitForSelector('#sec-aprende.active', { timeout: 10_000 });
    await page.click('.aprende-unidad__cta');
    await expect(page.locator('.leccion__cuenta')).toHaveText('3 de 4');
  });

  test('terminar la unidad celebra con la insignia y la ruta lo dice', async ({ page }) => {
    // parchar corre antes de cada carga: el flush al salir de la página no lo pisa.
    await parchar(page, {
      aprende: { hechas: { 'u3-l1': '2026-10-01', 'u3-l2': '2026-10-01', 'u3-l3': '2026-10-01' }, sabidas: [], semanas: [], enCurso: null },
    });
    await page.reload();
    await page.waitForSelector('#sec-aprende.active', { timeout: 10_000 });
    await expect(page.locator('.aprende-unidad__cta')).toHaveText('Empezar la lección 4');
    await page.click('.aprende-unidad__cta');

    // Lección 4: clasificar cuatro tarjetas y una pregunta.
    const esHormiga = ['Gaseosa en la tienda', 'Propina del parqueadero'];
    for (let i = 0; i < 4; i++) {
      const titulo = (await page.locator('.leccion-tarjeta--arriba .leccion-tarjeta__titulo').textContent()).trim();
      await page.click(`[data-lado="${esHormiga.includes(titulo) ? 'si' : 'no'}"]`);
      // La tarjeta sale animada: se espera a la siguiente antes de leerla.
      if (i < 3) await expect(page.locator('.leccion__conteo-faltan')).toHaveText(`Faltan ${3 - i}`);
    }
    await page.click('.leccion-fb [data-action="leccion-continuar"]');
    await page.click('[data-action="leccion-elegir"][data-idx="1"]');
    await page.click('.leccion-fb [data-action="leccion-continuar"]');

    await expect(page.locator('#leccion-titulo')).toHaveText('Terminaste la unidad 3');
    await expect(page.locator('.leccion-insignia')).toBeVisible();
    await page.click('.leccion__pie [data-action="leccion-salir"]');
    await expect(page.locator('.aprende-ruta__aviso')).toContainText('Ya hiciste todas las lecciones disponibles');
  });
});

test.describe('APR.1c - el bloque Inicio en móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await sembrarSiVacio(page, estadoBase({
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 500_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' }],
      gastos: [{ id: 'g1', descripcion: '', monto: 6_500, categoria: 'Restaurantes', fecha: diaDelMes(1), cuentaId: 'c1' }],
    }));
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
  });

  test('Hoy, Aprende y Tu progreso son pestañas con su estado, y la barra no cambia', async ({ page }) => {
    const tabs = page.locator('#tabs-dash .bloque-tabs__tab');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toContainText('Hoy');
    await expect(tabs.nth(1)).toContainText('Aprende');
    await expect(tabs.nth(1)).toContainText('3 min');
    await expect(tabs.nth(2)).toContainText('Tu progreso');

    const labels = await page.$$eval('#sidebar .nav-item', els =>
      els.filter(e => e.offsetParent !== null)
         .map(e => e.querySelector('.nav-item__label')?.textContent?.trim()));
    expect(labels).toEqual(['Inicio', 'Gastos', 'Registrar', 'Ahorro', 'Más']);

    await tabs.nth(1).click();
    await page.waitForSelector('#sec-aprende.active', { timeout: 5_000 });
    await expect(page.locator('#tabs-aprende .bloque-tabs__tab.active')).toContainText('Aprende');
    // La barra sigue diciendo "estás en Inicio" desde una lente.
    await expect(page.locator('.nav-item[data-section="dash"]')).toHaveClass(/nav-item--bloque-activo/);

    await page.locator('#tabs-aprende .bloque-tabs__tab[data-section="progreso"]').click();
    await page.waitForSelector('#sec-progreso.active', { timeout: 5_000 });
    await expect(page.locator('#panel-progreso')).toContainText('Lo que sabes');
  });

  test('Tu siguiente paso ocupa la celda de la tarjeta de logros y abre la lección', async ({ page }) => {
    const paso = page.locator('#panel-siguiente-paso');
    await expect(paso).toBeVisible();
    await expect(paso).toContainText('Lo pequeño también suma');
    await expect(paso).toContainText('Este mes hiciste 1 compra');
    await paso.locator('[data-action="leccion-abrir"]').click();
    await expect(page.locator('#modal-leccion[data-open]')).toHaveCount(1);
  });
});

