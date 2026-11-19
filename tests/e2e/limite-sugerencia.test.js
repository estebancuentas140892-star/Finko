/**
 * limite-sugerencia.test.js - GAS.9e (ADR 183 D5): al registrar el tercer
 * gasto del mes en una categoría sin límite, Finko sugiere ponerle uno, una
 * sola vez, y "Poner límite" abre Nuevo límite con la categoría elegida.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

test.use({ viewport: { width: 390, height: 844 } });

const CUENTAS = [
  { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 900_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
];

/** Fecha ISO local de hoy. */
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Dos almuerzos de hoy: el tercero es el que se registra en la prueba. */
const DOS = [1, 2].map(i => ({
  id: `g${i}`, monto: 20_000 * i, categoria: 'Restaurantes', fecha: hoyISO(), cuentaId: 'c1', nota: '',
}));

async function registrarRestaurante(page, monto = ['3', '0', '000']) {
  await page.click('.nav-item--registrar');
  const form = page.locator('#modal-gasto[data-open] #form-gasto');
  for (const t of monto) await form.locator(`[data-tecla="${t}"]`).click();
  await form.locator('[data-gasto-seguir="monto"]').click();
  await form.locator('.teja-op', { hasText: 'Restaurantes' }).click();
  await expect(form).toHaveAttribute('data-etapa-actual', /detalle|revisar/);
  const otra = form.locator('[data-etapa="detalle"] fieldset:not([disabled]) .chip-cat', { hasText: 'Otra cosa' });
  if (await otra.count()) await otra.click();
  if (await form.getAttribute('data-etapa-actual') === 'detalle') {
    await form.locator('[data-etapa="detalle"] [data-caracter-grupo] .chip-cat', { hasText: 'Necesidad' }).click();
  }
  await expect(form).toHaveAttribute('data-etapa-actual', 'revisar');
  await form.locator('[data-etapa="revisar"] button[type="submit"]').click();
  await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(0);
}

test('el tercer gasto en Restaurantes sugiere un límite una vez y "Poner límite" lo abre', async ({ page }) => {
  await sembrar(page, estadoBase({ cuentas: CUENTAS, gastos: DOS }));
  await page.goto('/#gast');
  await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

  await registrarRestaurante(page);
  // Primero el aviso del gasto; al cerrarlo llega la sugerencia.
  await page.locator('.fk-toast .fk-toast__cerrar').first().click();
  const sugerencia = page.locator('.fk-toast--tino');
  await expect(sugerencia.locator('.fk-toast__titulo')).toHaveText('Has hecho 3 gastos en Restaurantes este mes');
  await expect(sugerencia.locator('.fk-toast__detalle')).toContainText('¿Quieres ponerle un límite');
  await sugerencia.locator('.fk-toast__accion').click();
  await expect(page.locator('#modal-presupuesto[data-open]')).toHaveCount(1);
  await expect(page.locator('#modal-presupuesto .modal__title')).toHaveText('Nuevo límite');
  await expect(page.locator('#modal-presupuesto')).toContainText('Restaurantes');
  await page.keyboard.press('Escape');

  // Un cuarto gasto el mismo mes ya no la repite.
  await registrarRestaurante(page, ['1', '5', '000']);
  await page.locator('.fk-toast .fk-toast__cerrar').first().click();
  await page.waitForTimeout(600);
  await expect(page.locator('.fk-toast--tino')).toHaveCount(0);
  const vistas = await page.evaluate(async () => {
    const { S } = await import('/modules/core/state.js');
    return S.config.limiteSugerenciasVistas;
  });
  expect(vistas).toHaveLength(1);
  expect(vistas[0]).toMatch(/^\d{4}-\d{2}:Restaurantes$/);
});
