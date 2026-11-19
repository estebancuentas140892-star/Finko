/**
 * boton-central.test.js - el botón central registra según la sección (ADR 148).
 *
 * En el teléfono, el "+" del centro de la barra abre el formulario de alta de
 * la sección activa y, donde no hay nada que crear, la hoja "¿Qué quieres
 * registrar?" de siempre (ADR 024 D2).
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

test.use({ viewport: { width: 390, height: 844 } });

const CUENTA = { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 500000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' };
const FIJO   = { id: 'f1', tipo: 'fijo', descripcion: 'Arriendo', monto: 900000, frecuencia: 'Mensual', diaPago: 5, activo: true };
const DEUDA  = { id: 'd1', tipo: 'deuda-entidad', descripcion: 'Tarjeta', saldoTotal: 800000, cuotaMensual: 100000, frecuencia: 'Mensual', diaPago: 10, activo: true };

async function abrir(page, hash, extra = {}) {
  await sembrar(page, estadoBase({ cuentas: [CUENTA], ...extra }));
  await page.goto(`/#${hash}`);
  await page.waitForSelector(`#sec-${hash}.active`, { timeout: 10_000 });
}

/** Toca el botón central y espera que el único modal abierto sea `modalId`. */
async function centralAbre(page, modalId) {
  await page.click('.nav-item--registrar');
  await expect(page.locator(`#${modalId}[data-open]`)).toHaveCount(1);
  await expect(page.locator('.modal-overlay[data-open]')).toHaveCount(1);
}

test.describe('ADR 148 - el botón central abre el alta de la sección', () => {
  const MAPA = [
    ['gast',        'modal-gasto'],
    ['presupuesto', 'modal-presupuesto'],
    // GAS.8h (ADR 182 D8): en el teléfono, primero qué y en qué entidad.
    ['tesoreria',  'modal-agregar-cuenta'],
    ['personales', 'modal-personal'],
    ['metas',      'modal-meta'],
    ['apartados',  'modal-apartado'],
    ['inversion',  'modal-inversion'],
  ];

  for (const [hash, modal] of MAPA) {
    test(`en #${hash} abre #${modal}`, async ({ page }) => {
      await abrir(page, hash);
      await centralAbre(page, modal);
    });
  }

  test('la pestaña decide: Fijos abre el gasto fijo y Deudas la deuda (ADR 179 D1)', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: [CUENTA], compromisos: [FIJO, DEUDA] }));
    await page.goto('/#fijos');
    await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });

    await centralAbre(page, 'modal-gasto-fijo');
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-overlay[data-open]')).toHaveCount(0);

    await page.click('#sec-compromisos .bloque-tabs__tab[data-section="deudas"]');
    await expect(page).toHaveURL(/#deudas$/);
    await centralAbre(page, 'modal-compromiso');
  });

  test('en el Fondo sin empezar abre "Empezar mi fondo"', async ({ page }) => {
    await abrir(page, 'fondo');
    await centralAbre(page, 'modal-ahorro');
    await expect(page.locator('#form-aporte')).toHaveCount(0);
  });

  test('en el Fondo activo abre el aporte', async ({ page }) => {
    await abrir(page, 'fondo', {
      ahorro: { fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 100_000 }, aportes: [] },
    });
    await centralAbre(page, 'modal-ahorro');
    await expect(page.locator('#form-aporte')).toHaveCount(1);
  });

  test('el nombre accesible sigue a la sección y vuelve al de base', async ({ page }) => {
    await abrir(page, 'metas');
    await expect(page.locator('.nav-item--registrar')).toHaveAttribute('aria-label', 'Nueva meta de ahorro');
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active');
    await expect(page.locator('.nav-item--registrar')).toHaveAttribute('aria-label', 'Registrar: gasto, ingreso, pago o ahorro');
  });
});

test.describe('ADR 148 - donde no hay alta, la hoja de siempre', () => {
  for (const hash of ['dash', 'movimientos', 'agenda', 'analisis', 'config']) {
    test(`en #${hash} abre la hoja Registrar`, async ({ page }) => {
      await abrir(page, hash);
      await centralAbre(page, 'modal-registrar');
    });
  }
});
