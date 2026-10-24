/**
 * aprende.test.js - APR.1a: la ruta de Aprende y una lección completa a
 * pantalla completa, de punta a punta en el navegador (ADR 092 D7 y D8).
 *
 * Cubre lo que los unitarios no pueden: la carga del contenido con
 * `import()`, el overlay a pantalla completa, el foco en cada paso, el
 * avance guardado para retomar y el Aplícalo con los gastos sembrados.
 */

import { test, expect } from '@playwright/test';
import { sembrarSiVacio, estadoBase, leerEstado } from './helpers/estado.js';

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

  test('la ruta recomienda la unidad 3 y la lección 2', async ({ page }) => {
    await expect(page.locator('.aprende-unidad--actual')).toContainText('Unidad 3 · vas aquí');
    await expect(page.locator('.aprende-unidad__cta')).toHaveText('Empezar la lección 2');
    await expect(page.locator('.aprende-grupo')).toContainText('Fondo de emergencia');
  });

  test('una lección completa: casi, clasificar, control y Aplícalo con tus datos', async ({ page }) => {
    await page.click('.aprende-unidad__cta');
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

    await page.click('[data-action="ir-a-seccion"][data-target="presupuesto"]');
    await expect(leccion).toHaveCount(0);
    await expect(page.locator('#sec-presupuesto.active')).toHaveCount(1);
  });

  test('salir guarda el avance y la ruta ofrece seguir donde quedó', async ({ page }) => {
    await page.click('.aprende-unidad__cta');
    await page.click('.leccion__pie [data-action="leccion-continuar"]');
    await page.click('[data-action="leccion-elegir"][data-idx="1"]');
    await page.click('.leccion-fb [data-action="leccion-continuar"]');
    await page.click('[data-action="leccion-salir"]');
    await expect(page.locator('#modal-leccion[data-open]')).toHaveCount(0);
    await expect(page.locator('.aprende-unidad__cta')).toHaveText('Seguir la lección 2');
    await expect.poll(async () => (await leerEstado(page)).aprende?.enCurso?.paso).toBe(2);

    await page.reload();
    await page.waitForSelector('#sec-aprende.active', { timeout: 10_000 });
    await page.click('.aprende-unidad__cta');
    await expect(page.locator('.leccion__cuenta')).toHaveText('3 de 5');
  });
});
