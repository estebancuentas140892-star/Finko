/**
 * registrar-destinos.test.js - NAV.A2b: Abono a deuda y Aporte a ahorro en la
 * hoja "Registrar", con selector de destino (ADR 024 D2).
 *
 * Corre en viewport móvil: el botón "+" que abre la hoja es mobile-only.
 * Verifica el patrón 0/1/varias: sin destino la teja no aparece; con uno
 * enruta directo; con varios abre el selector "¿a cuál?".
 */

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

const BASE = {
  perfil: { nombre: 'Ana', smmlv: 1750905 },
  onboarded: true,
  cuentas: [
    { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 1_000_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
  ],
};

const DOS_DEUDAS = [
  { id: 'd1', tipo: 'deuda-entidad',  descripcion: 'Tarjeta Bancolombia', saldoTotal: 2_500_000, cuotaMensual: 300_000, tasa: 0.28, tasaUnidad: 'EA', frecuencia: 'Mensual', diaPago: 15, categoria: 'Tarjeta de crédito' },
  { id: 'd2', tipo: 'deuda-personal', descripcion: 'Préstamo tía Marta',  saldoTotal: 800_000,   cuotaMensual: 100_000, tasa: 0, frecuencia: 'Mensual', diaPago: 28 },
];

const AHORRO_TRES = {
  ahorro:    { fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 1_000_000 }, aportes: [{ id: 'ap1', monto: 250_000, fecha: '2026-07-01' }] },
  metas:     [{ id: 'm1', nombre: 'Viaje a San Andrés', montoObjetivo: 2_000_000, montoActual: 500_000, fechaCreacion: '2026-01-01' }],
  apartados: [{ id: 'a1', nombre: 'SOAT', montoActual: 120_000, montoObjetivo: 600_000 }],
};

async function seed(page, extra) {
  await page.addInitScript((data) => {
    localStorage.setItem('fk_v1', JSON.stringify(data));
  }, { ...BASE, ...extra });
  await page.goto('/#dash');
  await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
}

async function abrirHoja(page) {
  await page.click('.nav-item--registrar');
  await expect(page.locator('#modal-registrar[data-open]')).toHaveCount(1);
}

test.describe('NAV.A2b - destinos de la hoja Registrar', () => {

  test('sin deudas ni ahorro solo aparecen Gasto e Ingreso', async ({ page }) => {
    await seed(page, {});
    await abrirHoja(page);
    const labels = await page.$$eval('#registrar-grid .registrar__tile .menu-mas__label',
      els => els.map(e => e.textContent.trim()));
    expect(labels).toEqual(['Gasto', 'Ingreso']);
  });

  test('con 2 deudas y 3 destinos de ahorro aparecen las 4 tejas como selector', async ({ page }) => {
    await seed(page, { compromisos: DOS_DEUDAS, ...AHORRO_TRES });
    await abrirHoja(page);

    const labels = await page.$$eval('#registrar-grid .registrar__tile .menu-mas__label',
      els => els.map(e => e.textContent.trim()));
    expect(labels).toEqual(['Gasto', 'Ingreso', 'Abono a deuda', 'Aporte a ahorro']);

    // 2+ destinos → la teja es un selector, no enruta directo.
    const abono = page.locator('.registrar__tile[data-kind="abono"]');
    await expect(abono).toHaveAttribute('data-action', 'registrar-elegir-destino');
    await expect(abono.locator('.registrar__tile-desc')).toHaveText('Elige a cuál');
  });

  test('Abono con varias deudas abre el selector y enruta al modal de abono', async ({ page }) => {
    await seed(page, { compromisos: DOS_DEUDAS });
    await abrirHoja(page);

    await page.click('.registrar__tile[data-kind="abono"]');
    // La vista destino lista las 2 deudas.
    const items = page.locator('#registrar-vista-destino .registrar__destino-item');
    await expect(items).toHaveCount(2);
    await expect(items.first().locator('.registrar__destino-nombre')).toHaveText('Tarjeta Bancolombia');
    await expect(page.locator('#modal-registrar-title')).toHaveText('¿A qué deuda quieres abonar?');

    // Elegir una cierra la hoja y abre el modal de abono de esa deuda.
    await items.first().click();
    await expect(page.locator('#modal-registrar[data-open]')).toHaveCount(0);
    await expect(page.locator('#modal-abono[data-open]')).toHaveCount(1);
    await expect(page.locator('#modal-abono .modal__title')).toContainText('Tarjeta Bancolombia');
  });

  test('Aporte con fondo, meta y apartado lista los 3 y enruta al fondo', async ({ page }) => {
    await seed(page, { ...AHORRO_TRES });
    await abrirHoja(page);

    await page.click('.registrar__tile[data-kind="aporte"]');
    const nombres = await page.$$eval('#registrar-vista-destino .registrar__destino-nombre',
      els => els.map(e => e.textContent.trim()));
    expect(nombres).toEqual(['Fondo de emergencia', 'Viaje a San Andrés', 'SOAT']);

    // El fondo enruta a su modal de aporte (sin data-id: handler global).
    await page.click('.registrar__destino-item:has-text("Fondo de emergencia")');
    await expect(page.locator('#modal-registrar[data-open]')).toHaveCount(0);
    await expect(page.locator('#modal-ahorro[data-open]')).toHaveCount(1);
  });

  test('"Volver" regresa del selector a las tejas de registro', async ({ page }) => {
    await seed(page, { compromisos: DOS_DEUDAS });
    await abrirHoja(page);

    await page.click('.registrar__tile[data-kind="abono"]');
    await expect(page.locator('#registrar-vista-destino')).toBeVisible();
    await page.click('.registrar__volver');
    await expect(page.locator('#registrar-vista-destino')).toBeHidden();
    await expect(page.locator('#registrar-vista-raiz')).toBeVisible();
    await expect(page.locator('#modal-registrar-title')).toHaveText('¿Qué quieres registrar?');
  });

  test('un solo destino enruta directo, sin pasar por el selector', async ({ page }) => {
    await seed(page, { compromisos: [DOS_DEUDAS[0]] });
    await abrirHoja(page);

    const abono = page.locator('.registrar__tile[data-kind="abono"]');
    await expect(abono).toHaveAttribute('data-action', 'registrar-abrir');
    await expect(abono).toHaveAttribute('data-id', 'd1');
    await expect(abono.locator('.registrar__tile-desc')).toHaveText('Tarjeta Bancolombia');

    await abono.click();
    await expect(page.locator('#modal-registrar[data-open]')).toHaveCount(0);
    await expect(page.locator('#modal-abono[data-open]')).toHaveCount(1);
  });
});
