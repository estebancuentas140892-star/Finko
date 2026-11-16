/**
 * movimientos-deshacer.test.js - "Deshacer movimiento" en Movimientos (MOV.3,
 * ADR 154).
 *
 * Cubre en el navegador:
 * - D1: la fila de un gasto, un ingreso o una transferencia ofrece "Deshacer
 *   movimiento"; en el teléfono, en su hoja.
 * - D2: deshacer quita el registro y devuelve los saldos, sin dejar nada en el
 *   historial (ni una fila de reversa).
 * - D3: un pago desde dos cuentas sale entero, y la obligación vuelve a
 *   quedar pendiente en Inicio.
 * - D5: si no es seguro (un ingreso ya repartido), lo dice con un solo botón y
 *   no toca nada.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

const HOY = new Date('2026-11-16T10:00:00');
const CREADA = '2025-01-01T00:00:00.000Z';

const CUENTAS = [
  { id: 'c1', nombre: 'Bancolombia Ahorros', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 1_000_000, activa: true, fechaCreacion: CREADA },
  { id: 'c2', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 300_000, activa: true, fechaCreacion: CREADA },
];

const NETFLIX = { id: 'k1', descripcion: 'Netflix', tipo: 'fijo', categoria: 'Entretenimiento', monto: 38_900, frecuencia: 'Mensual', diaPago: 16, activo: true, fechaCreacion: CREADA };

async function abrir(page, extra = {}, hash = '#movimientos') {
  await page.clock.setFixedTime(HOY);
  await sembrar(page, estadoBase({ cuentas: CUENTAS, ...extra }));
  await page.goto(`/${hash}`);
  await page.waitForSelector(`#sec-${hash.slice(1)}.active`, { timeout: 10_000 });
}

/** El estado vivo de la app. */
const estado = (page) => page.evaluate(async () => {
  const { S } = await import('/modules/core/state.js');
  return JSON.parse(JSON.stringify({ cuentas: S.cuentas, gastos: S.gastos, ingresosPuntuales: S.ingresosPuntuales, transferencias: S.transferencias }));
});

const saldos = async (page) => Object.fromEntries((await estado(page)).cuentas.map(c => [c.id, c.saldo]));

test.describe('MOV.3 - deshacer en escritorio (ADR 154)', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('deshacer un gasto lo quita del historial y devuelve el saldo', async ({ page }) => {
    await abrir(page, {
      cuentas: CUENTAS.map(c => (c.id === 'c1' ? { ...c, saldo: 950_000 } : c)),
      gastos: [{ id: 'g1', monto: 50_000, categoria: 'Mercado', descripcion: 'Éxito', fecha: '2026-11-16', cuentaId: 'c1', nota: '', fechaCreacion: '2026-11-16T09:00:00.000Z' }],
    });
    const fila = page.locator('#lista-movimientos .list-item[data-id="g1"]');
    await expect(fila).toBeVisible();
    const boton = fila.locator('[data-action="deshacer-movimiento"]');
    await expect(boton).toHaveAttribute('aria-label', 'Deshacer movimiento: Éxito');
    await boton.click();

    const dialogo = page.locator('.modal--confirm');
    await expect(dialogo.locator('#confirm-title')).toHaveText('Deshacer movimiento');
    await expect(dialogo.locator('.confirm__mensaje')).toHaveText('"Éxito" de $50.000 sale de tus registros, como si no se hubiera anotado. Vuelven $50.000 a Bancolombia Ahorros.');
    await dialogo.locator('[data-role="confirmar"]').click();

    await expect(fila).toHaveCount(0);
    await expect(page.locator('#lista-movimientos .list-item')).toHaveCount(0);
    expect(await saldos(page)).toEqual({ c1: 1_000_000, c2: 300_000 });
    expect((await estado(page)).gastos).toEqual([]);
  });

  test('un ingreso ya repartido no se deshace: lo dice con un solo botón', async ({ page }) => {
    await abrir(page, {
      ingresosPuntuales: [{ id: 'i1', descripcion: 'Salario', monto: 2_000_000, categoria: null, cuentaId: 'c1', fecha: '2026-11-15', origen: 'distribucion', repartido: true, fechaCreacion: '2026-11-15T09:00:00.000Z' }],
    });
    await page.locator('#lista-movimientos .list-item[data-id="i1"] [data-action="deshacer-movimiento"]').click();
    const dialogo = page.locator('.modal--confirm');
    await expect(dialogo.locator('#confirm-title')).toHaveText('No se puede deshacer');
    await expect(dialogo.locator('.confirm__mensaje')).toContainText('ya lo repartiste con "Distribuir mi ingreso"');
    await expect(dialogo.locator('[data-role="cancelar"]')).toHaveCount(0);
    await dialogo.locator('[data-role="confirmar"]').click();
    await expect(page.locator('#lista-movimientos .list-item[data-id="i1"]')).toBeVisible();
    expect((await estado(page)).ingresosPuntuales).toHaveLength(1);
    expect(await saldos(page)).toEqual({ c1: 1_000_000, c2: 300_000 });
  });

  test('dos toques seguidos abren una sola confirmación', async ({ page }) => {
    await abrir(page, {
      gastos: [{ id: 'g1', monto: 50_000, categoria: 'Mercado', descripcion: 'Éxito', fecha: '2026-11-16', cuentaId: 'c1', nota: '', fechaCreacion: '2026-11-16T09:00:00.000Z' }],
    });
    const boton = page.locator('#lista-movimientos .list-item[data-id="g1"] [data-action="deshacer-movimiento"]');
    await boton.click();
    await boton.dispatchEvent('click');
    await expect(page.locator('.modal--confirm')).toHaveCount(1);
    await page.locator('.modal--confirm [data-role="confirmar"]').click();
    await expect(page.locator('.modal--confirm')).toHaveCount(0);
    expect(await saldos(page)).toEqual({ c1: 1_050_000, c2: 300_000 });
  });
});

test.describe('MOV.3 - deshacer en el teléfono (ADR 154)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('un pago desde dos cuentas sale entero y Netflix vuelve a "Atención hoy"', async ({ page }) => {
    const parte = (id, cuentaId, monto) => ({
      id, monto, cuentaId, fecha: '2026-11-16', categoria: 'Gastos fijos', descripcion: 'Pago: Netflix',
      nota: 'Pago repartido entre varias cuentas', compromisoId: 'k1', operacionId: 'op-1', fechaCreacion: '2026-11-16T09:00:00.000Z',
    });
    await abrir(page, {
      cuentas: [{ ...CUENTAS[0], saldo: 980_000 }, { ...CUENTAS[1], saldo: 281_100 }],
      compromisos: [NETFLIX],
      gastos: [parte('p1', 'c1', 20_000), parte('p2', 'c2', 18_900)],
    });
    await expect(page.locator('#lista-movimientos .list-item')).toHaveCount(2);

    // La fila abre la hoja del gasto, que ofrece deshacer.
    await page.locator('#lista-movimientos .list-item[data-id="p2"] .list-item__detalle').click();
    const hoja = page.locator('#modal-detalle-fila');
    await expect(hoja).toHaveAttribute('data-open', '');
    const deshacer = hoja.locator('[data-target-action="deshacer-movimiento"]');
    await expect(deshacer).toHaveText('Deshacer movimiento');
    await deshacer.click();

    const dialogo = page.locator('.modal--confirm');
    await expect(dialogo.locator('.confirm__mensaje')).toHaveText('"Pago: Netflix" de $38.900 (sus 2 partes, una por cuenta) sale de tus registros, como si no se hubiera anotado. Vuelven $20.000 a Bancolombia Ahorros, vuelven $18.900 a Nequi y "Netflix" vuelve a quedar por pagar.');
    await dialogo.locator('[data-role="confirmar"]').click();

    await expect(page.locator('#lista-movimientos .list-item')).toHaveCount(0);
    expect(await saldos(page)).toEqual({ c1: 1_000_000, c2: 300_000 });

    await page.evaluate(() => { location.hash = '#dash'; });
    await page.waitForSelector('#sec-dash.active');
    await expect(page.locator('#panel-atencion-hoy .atencion-hoy__frase').first()).toHaveText('Netflix vence hoy');
  });

  test('una transferencia se deshace desde su hoja: vuelven los dos saldos', async ({ page }) => {
    await abrir(page, {
      cuentas: [{ ...CUENTAS[0], saldo: 900_000 }, { ...CUENTAS[1], saldo: 400_000 }],
      transferencias: [{ id: 't1', cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: 100_000, fecha: '2026-11-16', fechaCreacion: '2026-11-16T09:00:00.000Z' }],
    });
    await page.locator('#lista-movimientos .list-item[data-id="t1"] .list-item__detalle').click();
    const hoja = page.locator('#modal-detalle-fila');
    const deshacer = hoja.locator('.detalle-fila__peligro [data-target-action="deshacer-movimiento"]');
    await expect(deshacer).toHaveText('Deshacer movimiento');
    await deshacer.click();
    await page.locator('.modal--confirm [data-role="confirmar"]').click();
    await expect(page.locator('#lista-movimientos .list-item')).toHaveCount(0);
    expect(await saldos(page)).toEqual({ c1: 1_000_000, c2: 300_000 });
    expect((await estado(page)).transferencias).toEqual([]);
  });
});
