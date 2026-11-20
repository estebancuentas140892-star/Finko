/**
 * inicio-control-pago.test.js - Inicio: el desplegable de cuentas, "Todo al
 * día" y el control del pago (INI.3, ADR 153).
 *
 * Cubre en el navegador:
 * - D2: el desplegable de cuentas se cierra al navegar, al tocar fuera y con
 *   Escape; al volver a Inicio no sigue abierto.
 * - D3: en las hojas del pago y en el desplegable, la entidad arriba y el tipo
 *   debajo, sin repetirlo ("Banco de Bogotá" / "Cuenta de ahorros").
 * - D4: un solo mensaje cuando la cuenta no alcanza, según el caso; si ni
 *   sumando todas alcanza, el botón se apaga.
 * - D6: lo desmarcado no se paga y nada se paga dos veces (si el pago entró
 *   por otro lado mientras se elegía la cuenta, no se registra).
 * - D7: "Esta semana" vacía no pinta tarjeta; Tino dice "Todo al día" solo si
 *   tampoco hay pagos hoy.
 *
 * Reloj fijo: lo vencido y lo de hoy dependen del día del mes.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

const HOY = new Date('2026-11-16T10:00:00');
const CREADA = '2025-01-01T00:00:00.000Z';
// GAS.9c (ADR 183 D3): sin pagos, lo que vence desde la creación está vencido;
// los fijos nacen el día 1 del mes del escenario.
const FIJO_CREADO = '2026-11-01T15:00:00.000Z';

// Nombres como los deja el formulario de Mis cuentas (`_autoNombre`).
const CUENTAS = [
  { id: 'c1', nombre: 'Banco de Bogotá Ahorros', banco: 'Banco de Bogotá', tipo: 'Ahorros', saldo: 1_373_900, activa: true, fechaCreacion: CREADA },
  { id: 'c2', nombre: 'Bancolombia Corriente', banco: 'Bancolombia', tipo: 'Corriente', saldo: 2_180_500, activa: true, fechaCreacion: CREADA },
  { id: 'c3', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 340_000, activa: true, fechaCreacion: CREADA },
];

const fijo = (id, descripcion, monto, diaPago, categoria = 'Servicios') => ({
  id, descripcion, tipo: 'fijo', categoria, monto, frecuencia: 'Mensual',
  diaPago, activo: true, fechaCreacion: FIJO_CREADO,
});

/** Un arriendo vencido ayer y Netflix y Claro hoy; nada más en la semana. */
function estado(extra = {}) {
  return estadoBase({
    perfil: { nombre: 'Linay Muñoz', smmlv: 1750905 },
    cuentas: CUENTAS,
    compromisos: [
      fijo('k1', 'Arriendo', 1_350_000, 15, 'Vivienda'),
      fijo('k2', 'Netflix', 38_900, 16, 'Entretenimiento'),
      fijo('k3', 'Plan Claro', 65_000, 16),
    ],
    ...extra,
  });
}

async function abrir(page, st = estado()) {
  await page.clock.setFixedTime(HOY);
  await sembrar(page, st);
  await page.goto('/#dash');
  await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
}

/** Los gastos del estado vivo de la app, por compromiso. */
const gastosPorCompromiso = (page) => page.evaluate(async () => {
  const { S } = await import('/modules/core/state.js');
  const cuenta = {};
  for (const g of S.gastos) if (g.compromisoId) cuenta[g.compromisoId] = (cuenta[g.compromisoId] ?? 0) + 1;
  return cuenta;
});

test.describe('INI.3 - el desplegable de cuentas (ADR 153 D2)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  const ficha = (page) => page.locator('#saldo-lado-bancos');
  const caja = (page) => page.locator('#saldo-detalle-caja');

  test('se cierra al navegar y no sigue abierto al volver a Inicio', async ({ page }) => {
    await abrir(page);
    await ficha(page).click();
    await expect(caja(page)).toBeVisible();
    await expect(ficha(page)).toHaveAttribute('aria-expanded', 'true');
    await page.evaluate(() => { location.hash = '#tesoreria'; });
    await page.waitForSelector('#sec-tesoreria.active');
    await page.evaluate(() => { location.hash = '#dash'; });
    await page.waitForSelector('#sec-dash.active');
    await expect(caja(page)).toBeHidden();
    await expect(ficha(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('"Ver mis cuentas" lleva a Mis cuentas y deja el desplegable cerrado', async ({ page }) => {
    await abrir(page);
    await ficha(page).click();
    await caja(page).locator('.hero-inicio__ir-cuentas').click();
    await page.waitForSelector('#sec-tesoreria.active');
    await page.goBack();
    await page.waitForSelector('#sec-dash.active');
    await expect(caja(page)).toBeHidden();
  });

  test('tocar dentro lo deja abierto; tocar fuera o abrir otra acción lo cierra', async ({ page }) => {
    await abrir(page);
    await ficha(page).click();
    await caja(page).locator('.hero-inicio__cuenta').first().click();
    await expect(caja(page)).toBeVisible();
    await page.locator('#hero-saldo-label').click();
    await expect(caja(page)).toBeHidden();

    await ficha(page).click();
    await expect(caja(page)).toBeVisible();
    await page.locator('#panel-atencion-hoy [data-action="inicio-pagar-lote"]').click();
    await expect(page.locator('#modal-pago-lote')).toHaveAttribute('data-open', '');
    await expect(caja(page)).toBeHidden();
  });

  test('Escape lo cierra y devuelve el foco a la ficha', async ({ page }) => {
    await abrir(page);
    await ficha(page).click();
    await page.keyboard.press('Escape');
    await expect(caja(page)).toBeHidden();
    await expect(ficha(page)).toBeFocused();
  });

  test('las cuentas abiertas dicen la entidad y su tipo, sin repetirlo', async ({ page }) => {
    await abrir(page);
    await ficha(page).click();
    const filas = caja(page).locator('.hero-inicio__cuenta');
    await expect(filas.locator('.hero-inicio__cuenta-nombre')).toHaveText(['Banco de Bogotá', 'Bancolombia', 'Nequi']);
    await expect(filas.locator('.hero-inicio__cuenta-tipo')).toHaveText(['Ahorros', 'Corriente', 'Depósito de bajo monto']);
  });
});

test.describe('INI.3 - el control del pago (ADR 153 D3 a D6)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  async function hastaLaCuenta(page) {
    await page.locator('#panel-atencion-hoy [data-action="inicio-pagar-lote"]').click();
    await page.locator('#modal-pago-lote [data-action="compromisos-confirmar-lote"]').click();
    const hoja = page.locator('.modal--cuenta-pago');
    await expect(hoja.locator('#cuenta-pref-title')).toHaveText('¿Desde qué cuenta pagas?');
    return hoja;
  }

  test('la entidad arriba y el tipo debajo, en las dos hojas', async ({ page }) => {
    await abrir(page);
    const hoja = await hastaLaCuenta(page);
    await expect(hoja.locator('.cuenta-pago__nombre')).toHaveText(['Banco de Bogotá', 'Bancolombia', 'Nequi']);
    await expect(hoja.locator('.cuenta-pago__tipo')).toHaveText(['Cuenta de ahorros', 'Cuenta corriente', 'Depósito de bajo monto']);

    await hoja.locator('.cuenta-pago__opcion').nth(0).click();
    await hoja.locator('[data-role="confirmar"]').click();
    const completar = page.locator('.modal--completar');
    await expect(completar.locator('.cuenta-pago__nombre')).toHaveText(['Banco de Bogotá', 'Bancolombia', 'Nequi']);
  });

  test('un solo mensaje por caso: otra cuenta alcanza, y si ya pasaste el dinero la eliges', async ({ page }) => {
    await abrir(page);
    const hoja = await hastaLaCuenta(page);
    await hoja.locator('.cuenta-pago__opcion').nth(0).click();
    const falta = hoja.locator('.cuenta-pago__falta');
    await expect(falta).toHaveCount(1);
    await expect(falta).toHaveText('No tienes saldo suficiente en esta cuenta para cubrir el pago: faltan $80.000. Puedes elegir otra cuenta o varias para completar el valor. Si ya pasaste el dinero a una sola cuenta, elígela para registrar el pago.');
    await expect(hoja).not.toContainText('Elige una o varias cuentas para registrar');
    await expect(hoja).not.toContainText('mayor saldo');
  });

  test('ni sumando todas alcanza: lo dice y el botón se apaga', async ({ page }) => {
    const pocas = CUENTAS.map(c => ({ ...c, saldo: 100_000 }));
    await abrir(page, estado({ cuentas: pocas }));
    const hoja = await hastaLaCuenta(page);
    await expect(hoja.locator('.cuenta-pago__falta')).toHaveText('No tienes saldo suficiente para cubrir el pago, ni sumando todas tus cuentas: faltan $1.153.900. Registra primero en tus cuentas el dinero que necesitas.');
    const boton = hoja.locator('[data-role="confirmar"]');
    await expect(boton).toBeDisabled();
    await expect(boton).toHaveText('No alcanza con tus cuentas');
  });

  test('lo desmarcado no se paga: Netflix sigue pendiente', async ({ page }) => {
    await abrir(page);
    await page.locator('#panel-atencion-hoy [data-action="inicio-pagar-lote"]').click();
    const lote = page.locator('#modal-pago-lote');
    await lote.locator('.lote-row', { hasText: 'Netflix' }).click();
    await expect(lote.locator('[data-role="lote-total"]')).toHaveText('$1.415.000');
    await lote.locator('[data-action="compromisos-confirmar-lote"]').click();
    const hoja = page.locator('.modal--cuenta-pago');
    await expect(hoja.locator('.cuenta-pago__total')).toHaveText('Total a pagar $1.415.000');
    await hoja.locator('[data-role="confirmar"]').click();
    await expect(hoja).toHaveCount(0);

    expect(await gastosPorCompromiso(page)).toEqual({ k1: 1, k3: 1 });
    await expect(page.locator('#panel-atencion-hoy .atencion-hoy__frase').first()).toHaveText('Netflix vence hoy');
  });

  test('si un pago entra por otro lado mientras eliges la cuenta, no se registra dos veces', async ({ page }) => {
    await abrir(page);
    const hoja = await hastaLaCuenta(page);
    // El arriendo llega pagado desde otro lado (otra pestaña, la nube).
    await page.evaluate(async () => {
      const { S } = await import('/modules/core/state.js');
      S.gastos.push({
        id: 'externo', compromisoId: 'k1', descripcion: 'Arriendo', categoria: 'Vivienda',
        monto: 1_350_000, fecha: '2026-11-16', cuentaId: 'c2', fechaCreacion: '2026-11-16T09:00:00.000Z',
      });
    });
    await hoja.locator('[data-role="confirmar"]').click();
    await expect(hoja).toHaveCount(0);
    expect(await gastosPorCompromiso(page)).toEqual({ k1: 1 });
    await expect(page.locator('[aria-live]').filter({ hasText: 'cambiaron mientras elegías la cuenta' })).toHaveCount(1);
  });
});

test.describe('INI.3 - "Esta semana" vacía y "Todo al día" (ADR 153 D7)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('con pagos hoy y nada en la semana: sin tarjeta vacía y sin Tino', async ({ page }) => {
    await abrir(page);
    await expect(page.locator('#panel-atencion-hoy')).toBeVisible();
    await expect(page.locator('#panel-prioridades')).toBeHidden();
    await expect(page.locator('#sec-dash')).not.toContainText('Sin vencimientos en los próximos 7 días');
    await expect(page.locator('#panel-todo-al-dia')).toBeHidden();
  });

  test('sin pagos pero con algo para hoy (me deben): Tino debajo de Atención hoy', async ({ page }) => {
    await abrir(page, estado({
      compromisos: [fijo('k9', 'Seguro', 90_000, 28)],
      personales: [{ id: 'pe1', persona: 'Juan', monto: 100_000, pagado: 0, fecha: '2026-11-01', fechaLimite: '2026-11-16', liquidado: false, fechaCreacion: '2026-11-01T00:00:00.000Z' }],
    }));
    const hoy = page.locator('#panel-atencion-hoy');
    await expect(hoy).toBeVisible();
    await expect(hoy.locator('[data-seccion="personales"]')).toHaveCount(1);
    await expect(page.locator('#panel-prioridades')).toBeHidden();
    const tino = page.locator('#panel-todo-al-dia');
    await expect(tino).toBeVisible();
    // INI.4 (ADR 155): la misma hamaca, más chica y sin colgar del saldo.
    await expect(tino.locator('img')).toHaveAttribute('src', 'assets/tino/tino-hamaca.svg');
    await expect(tino.getByRole('heading', { level: 2 })).toHaveText('¡Fuera preocupaciones!');
    // Debajo de la tarjeta, centrada y a su alto: no empuja la página.
    await expect.poll(() => page.evaluate(() => {
      const t = document.querySelector('#panel-todo-al-dia').getBoundingClientRect();
      const h = document.querySelector('#panel-atencion-hoy').getBoundingClientRect();
      const m = document.querySelector('#panel-todo-al-dia .todo-al-dia__mece').getBoundingClientRect();
      return t.top >= h.bottom && m.top >= h.bottom && t.height < 320
        && Math.abs(m.left + m.width / 2 - (t.left + t.width / 2)) < 2;
    })).toBe(true);
  });
});
