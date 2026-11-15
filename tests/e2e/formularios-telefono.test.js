/**
 * formularios-telefono.test.js - vigía de la regla del ADR 142 D2 en el
 * teléfono: ningún formulario muestra un `<select>`, un `type="date"` ni un
 * `type="number"` del sistema (FORM.2g). Los campos reales siguen ahí,
 * ocultos, con su `name`: lo que se ve es el control de Finko.
 *
 * Abre cada formulario por su `data-action`, como lo hace la app, a 390 px.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

test.use({ viewport: { width: 390, height: 844 } });

const CUENTAS = [
  { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 1_000_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
  { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 2_000_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
];
const DEUDA = {
  id: 'd1', descripcion: 'Tarjeta de prueba', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito',
  cupoTotal: 3_000_000, saldoTotal: 1_200_000, cuotaMensual: 200_000, frecuencia: 'Mensual', diaPago: 20, activo: true,
};

/** Acción → el formulario que debe abrir. */
const FORMULARIOS = [
  ['nuevo-gasto', {}, '#form-gasto'],
  ['nuevo-compromiso', {}, '#form-compromiso'],
  ['nuevo-gasto-fijo', {}, '#form-gasto-fijo'],
  ['abrir-abono', { id: 'd1' }, '#form-abono'],
  ['nueva-meta', {}, '#form-meta'],
  ['nuevo-ingreso', {}, '#form-ingreso'],
  ['nuevo-ingreso-puntual', {}, '#form-ingreso-puntual'],
  ['nueva-cuenta', {}, '#form-cuenta'],
  ['abrir-transferencia', {}, '#form-transferencia'],
  ['nuevo-apartado', {}, '#form-apartado'],
  ['nuevo-personal', {}, '#form-personal'],
  ['inversion-nueva', {}, '#form-inversion'],
  ['nuevo-presupuesto', {}, '#form-presupuesto'],
];

test.describe('ADR 142 D2: en el teléfono, los controles son de Finko', () => {
  for (const [accion, datos, formulario] of FORMULARIOS) {
    test(`${formulario}: sin <select>, type="date" ni type="number" a la vista`, async ({ page }) => {
      await sembrar(page, estadoBase({ cuentas: CUENTAS, compromisos: [DEUDA] }));
      await page.goto('/#dash');
      await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
      await page.evaluate(([a, d]) => {
        const b = document.createElement('button');
        b.dataset.action = a;
        Object.assign(b.dataset, d);
        document.body.appendChild(b);
        b.click();
        b.remove();
      }, [accion, datos]);
      const form = page.locator(formulario);
      await expect(form).toBeAttached({ timeout: 5_000 });
      await expect(page.locator('.modal-overlay[data-open]')).toHaveCount(1);
      const delSistema = await form.evaluate((f) => [...f.querySelectorAll('select, input[type="date"], input[type="number"]')]
        .filter(el => el.offsetParent !== null || el.getClientRects().length > 0)
        .map(el => el.name || el.id));
      expect(delSistema).toEqual([]);
    });
  }
});

test.describe('FORM.2h: Ajustes, la tasa alta y el banco (ADR 142 D2, D7, D9 y D10)', () => {
  test('Tu nombre se cambia en su mini-hoja y se guarda solo', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#config');
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });
    const form = page.locator('#form-perfil');
    await expect(form).toHaveAttribute('data-ajustes-montados', '');
    const fila = form.locator('.ajustes-lista .recibo__fila').first();
    await expect(fila).toContainText('Tu nombre');
    // "Tu perfil" se abre en su sitio (ADR 112) y adentro es una lista.
    await page.locator('[data-action="config-fila"][data-fila="perfil"]').click();
    await fila.click();
    await form.locator('#config-nombre').fill('Ana de prueba');
    await form.locator('.mini-hoja:not([hidden]) .mini-hoja__pie [data-mini-cerrar]').click();
    await expect(fila).toContainText('Ana de prueba');
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')).perfil?.nombre)).toBe('Ana de prueba');
  });

  test('una tasa muy alta avisa en ámbar y la deuda se guarda igual; la ⓘ abre a Tino', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#compromisos');
    await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
    await page.evaluate(() => { const b = document.createElement('button'); b.dataset.action = 'nuevo-compromiso'; document.body.appendChild(b); b.click(); b.remove(); });
    const form = page.locator('#form-compromiso');
    await form.locator('[data-tipo="deuda-entidad"]').click();
    await form.locator('.chip-cat', { hasText: 'Tarjeta de crédito' }).click();
    await form.locator('#comp-descripcion').fill('Tarjeta alta');
    await form.locator('[data-preguntas-seguir]').click();
    for (const t of ['1', '000', '000']) await form.locator(`[data-pregunta-on] [data-tecla="${t}"]`).click();
    await form.locator('[data-preguntas-seguir]').click();
    for (const t of ['1', '0', '0', '000']) await form.locator(`[data-pregunta-on] [data-tecla="${t}"]`).click();
    await form.locator('[data-preguntas-seguir]').click();
    await form.locator('[data-dia="10"]').click();
    await form.locator('[data-resumen-fichas] .add', { hasText: 'Tasa de interés' }).click();
    await form.locator('#comp-tasa').fill('280');
    await expect(form.locator('#comp-tasa-aviso')).toContainText('muy alto');
    await form.locator('[data-mini-ayuda="comp-tasa-ayuda"]').click();
    await expect(form.locator('#comp-tasa-ayuda .tino-sol[data-pose="explica"]')).toBeVisible();
    await form.locator('#comp-tasa-ayuda .mini-hoja__pie [data-mini-cerrar]').click();
    await form.locator('[data-preguntas-seguir]').click();
    await form.locator('button[type="submit"]').click();
    const dialogo = page.locator('body > .modal-overlay[data-open]:not([id])');
    if (await dialogo.count()) await dialogo.locator('[data-role="confirmar"]').click();
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')).compromisos?.at(-1)?.descripcion)).toBe('Tarjeta alta');
  });

  test('el banco se busca en el desplegable de Finko', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.evaluate(() => { const b = document.createElement('button'); b.dataset.action = 'nueva-cuenta'; document.body.appendChild(b); b.click(); b.remove(); });
    const form = page.locator('#form-cuenta');
    await form.locator('.bank-picker__trigger').click();
    const mini = form.locator('#cuenta-banco-mini');
    await expect(mini).toBeVisible();
    await mini.locator('[data-banco-buscar]').fill('davi');
    await expect(mini.locator('[data-valor]:visible')).toHaveCount(2);
    await mini.locator('[data-valor="Davivienda"]').click();
    await expect(mini).toBeHidden();
    await expect(form.locator('[name="banco"]')).toHaveValue('Davivienda');
  });
});
