/**
 * avance.test.js - "Sacar un avance" de una tarjeta (AVC.1b, ADR 169).
 *
 * Cubre en el navegador, en escritorio y a 390 px:
 * - D1: el botón en la tarjeta (escritorio) y en su hoja (teléfono).
 * - D2: el costo en pesos antes de guardar.
 * - D4: Efectivo se crea y recibe el avance; la tarjeta sube deuda y cuota.
 * - D6: deshacerlo desde Movimientos devuelve todo a como estaba.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

const HOY = new Date('2026-11-18T10:00:00');
const CREADA = '2025-01-01T00:00:00.000Z';

const BANCO = { id: 'c1', nombre: 'Bancolombia Ahorros', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 1_000_000, activa: true, fechaCreacion: CREADA };
const VISA = {
  id: 't1', descripcion: 'Visa Bancolombia', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito',
  saldoTotal: 800_000, cuotaMensual: 120_000, cupoTotal: 3_000_000, tasa: 0.2293, tasaUnidad: 'EA',
  frecuencia: 'Mensual', diaPago: 25, activo: true, fechaCreacion: CREADA,
};
const COSTO = 'Este avance te cuesta unos $125.500: $115.600 de intereses en 24 cuotas de $25.649 y $9.870 de comisión. Pagarás unos $625.500 por $500.000.';

async function abrir(page) {
  await page.clock.setFixedTime(HOY);
  await sembrar(page, estadoBase({ cuentas: [BANCO], compromisos: [VISA] }));
  await page.goto('/#compromisos');
  await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
}

/** Lo que importa del estado vivo. */
const estado = (page) => page.evaluate(async () => {
  const { S } = await import('/modules/core/state.js');
  return JSON.parse(JSON.stringify({ cuentas: S.cuentas, compromisos: S.compromisos, gastos: S.gastos }));
});

/** Después de guardar: Efectivo con el avance y la tarjeta arriba. */
async function comprobarGuardado(page) {
  const st = await estado(page);
  const efe = st.cuentas.find(c => c.banco === 'Efectivo');
  expect(efe).toMatchObject({ nombre: 'Efectivo', saldo: 500_000 });
  expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000);
  const visa = st.compromisos.find(c => c.id === 't1');
  expect(visa).toMatchObject({ saldoTotal: 1_309_870, cuotaMensual: 145_649 });
  expect(visa.avances).toHaveLength(1);
  expect(st.gastos).toEqual([]);
  return visa.avances[0].id;
}

test.describe('AVC.1b - sacar un avance en escritorio', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('el costo antes de guardar; Efectivo recibe el avance y deshacerlo lo devuelve', async ({ page }) => {
    await abrir(page);
    await page.locator('.deuda-card[data-id="t1"] [data-action="abrir-avance"]').click();
    const form = page.locator('#form-avance');
    await expect(form).toBeVisible();
    await expect(page.locator('#modal-abono .modal__title')).toHaveText('Sacar un avance: Visa Bancolombia');

    await form.locator('#avance-monto').fill('500000');
    await form.locator('.chip-fecha', { hasText: '24 cuotas' }).click();
    await form.locator('#avance-comision').fill('9870');
    await expect(form.locator('#avance-costo')).toBeVisible();
    await expect(form.locator('[data-avance-costo]')).toHaveText(COSTO);

    await form.getByRole('button', { name: 'Guardar avance' }).click();
    await expect(form).toBeHidden();
    const avanceId = await comprobarGuardado(page);

    // Un cambio de hash no vuelve a sembrar: lo guardado sigue ahí.
    await page.evaluate(() => { location.hash = '#movimientos'; });
    const fila = page.locator(`#lista-movimientos .list-item[data-id="${avanceId}"]`);
    await expect(fila).toContainText('Avance de Visa Bancolombia');
    await fila.locator('[data-action="deshacer-movimiento"]').click();
    const dialogo = page.locator('.modal--confirm');
    await expect(dialogo.locator('.confirm__mensaje')).toContainText('Salen $500.000 de Efectivo');
    await dialogo.locator('[data-role="confirmar"]').click();
    await expect(fila).toHaveCount(0);

    const st = await estado(page);
    expect(st.cuentas.find(c => c.banco === 'Efectivo').saldo).toBe(0);
    expect(st.compromisos.find(c => c.id === 't1')).toMatchObject({ saldoTotal: 800_000, cuotaMensual: 120_000, avances: [] });
  });
});

test.describe('AVC.1b - sacar un avance a 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('desde la hoja de la tarjeta, en dos etapas con el teclado de Finko', async ({ page }) => {
    await abrir(page);
    await page.locator('.deuda-card--fila[data-id="t1"] .list-item__detalle').click();
    const accion = page.locator('#modal-detalle-fila [data-target-action="abrir-avance"]');
    await expect(accion).toHaveText('Sacar un avance');
    await accion.click();

    const form = page.locator('#form-avance');
    await expect(form.locator('.pmonto__q')).toHaveText('¿Cuánto sacaste?');
    for (const tecla of ['5', '0', '0', '000']) {
      await form.locator('[data-kp-zona] button', { hasText: new RegExp(`^${tecla}$`) }).first().click();
    }
    await form.locator('[data-etapa-seguir]').click();
    await expect(form.locator('[data-etapa="revisar"]')).toBeVisible();

    await form.locator('.chip-fecha', { hasText: '24 cuotas' }).click();
    await form.locator('#avance-comision').fill('9870');
    await expect(form.locator('[data-avance-costo]')).toHaveText(COSTO);
    await form.getByRole('button', { name: 'Guardar avance' }).click();
    await expect(form).toBeHidden();
    const avanceId = await comprobarGuardado(page);

    // AVC.1d (ADR 169 D6): la hoja de la tarjeta lista el avance y lo deshace.
    await page.locator('.deuda-card--fila[data-id="t1"] .list-item__detalle').click();
    const hoja = page.locator('#modal-detalle-fila');
    await expect(hoja.locator('.detalle-compromiso__rotulo--avances')).toHaveText('Tu avance');
    const deshacer = hoja.locator(`[data-target-action="deshacer-avance"][data-id="${avanceId}"]`);
    await expect(hoja.locator('.detalle-compromiso__avance')).toContainText('$500.000');
    await deshacer.click();
    const dialogo = page.locator('.modal--confirm');
    await expect(dialogo.locator('.confirm__mensaje')).toContainText('Salen $500.000 de Efectivo');
    await dialogo.locator('[data-role="confirmar"]').click();
    await expect.poll(async () => (await estado(page)).compromisos.find(c => c.id === 't1').avances).toEqual([]);
    const st = await estado(page);
    expect(st.cuentas.find(c => c.banco === 'Efectivo').saldo).toBe(0);
    expect(st.compromisos.find(c => c.id === 't1')).toMatchObject({ saldoTotal: 800_000, cuotaMensual: 120_000 });
  });
});

test.describe('AVC.1c - el aviso de avances seguidos a 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('dos avances en tres meses: Novedades lo dice y "Ver tu plan de salida" abre el plan en Por pagar', async ({ page }) => {
    await page.clock.setFixedTime(HOY);
    const avance = (id, fecha, monto) => ({ id, fecha, monto, cuentaId: 'c1', cuotas: 12, cuota: 50_000, comision: 0 });
    const conAvances = { ...VISA, avances: [avance('a1', '2026-09-20', 500_000), avance('a2', '2026-11-10', 300_000)] };
    const moto = { ...VISA, id: 't2', descripcion: 'Crédito de la moto', categoria: 'Vehículo', saldoTotal: 4_000_000, cuotaMensual: 300_000, cupoTotal: undefined, diaPago: 10 };
    await sembrar(page, estadoBase({ cuentas: [BANCO], compromisos: [conAvances, moto] }));
    await page.goto('/#dash');
    const fila = page.locator('#panel-novedades [data-seccion="avances"]');
    await expect(fila).toContainText('Llevas 2 avances en tres meses');
    await expect(fila).toContainText('Suman $800.000. Es señal de que el mes no alcanza.');
    await fila.locator('button[data-action="compromisos-ver-plan"]').click();
    await expect(page).toHaveURL(/#compromisos$/);
    const plan = page.locator('#modal-plan-salida');
    await expect(plan).toHaveAttribute('data-open', '');
    await expect(plan.locator('#plan-salida-body #estrategia-pago')).toBeVisible();
  });
});
