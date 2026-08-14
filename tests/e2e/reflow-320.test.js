/**
 * reflow-320.test.js - RWD.1: reflow real a 320px de ancho (WCAG 1.4.10).
 *
 * 320px CSS es el punto de verificación oficial de reflow (equivale a una
 * pantalla de 1280px con zoom 400%, y cubre de sobra el zoom 200% en
 * pantallas comunes). A ese ancho ninguna sección debe generar scroll
 * horizontal ni sacar la barra inferior del viewport, y los modales con
 * `.input--big-amount` (señalados en el board como caso de riesgo) deben
 * caber completos.
 *
 * El estado sembrado tiene datos en casi todas las secciones: el overflow
 * aparece con contenido real (montos largos, chips, barras), no con empties.
 */

import { test, expect } from '@playwright/test';
import { sembrar } from './helpers/estado.js';

test.use({ viewport: { width: 320, height: 568 } });

// Hash de cada sección = id sin el prefijo "sec-".
const SECCIONES = [
  'dash', 'gast', 'compromisos', 'agenda', 'personales', 'tesoreria',
  'presupuesto', 'ahorro', 'inversion', 'metas', 'apartados', 'analisis',
  'config',
];

async function seedDatos(page) {
  const d = new Date();
  const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  await sembrar(page, {
      version: 1,
      perfil: { nombre: 'Usuaria de prueba', smmlv: 1750905 },
      onboarded: true,
      cuentas: [
        { id: 'c1', nombre: 'Bancolombia Ahorros', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 12_345_678, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
        { id: 'c2', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 987_654, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
      ],
      ingresos: [
        { id: 'i1', descripcion: 'Salario mensual', monto: 3_500_000, frecuencia: 'Mensual', activo: true, fechaCreacion: '2026-01-01' },
      ],
      gastos: [
        { id: 'g1', descripcion: 'Mercado quincenal completo', monto: 385_500, categoria: 'Mercado', fecha, cuentaId: 'c1' },
        { id: 'g2', descripcion: 'Restaurantes con amigos', monto: 125_000, categoria: 'Restaurantes', fecha, cuentaId: 'c2' },
      ],
      compromisos: [
        { id: 'd1', tipo: 'deuda-entidad', descripcion: 'Tarjeta de crédito Bancolombia', saldoTotal: 4_850_000, cuotaMensual: 385_000, tasa: null, frecuencia: 'Mensual', diaPago: 15, categoria: 'Tarjeta de crédito' },
        { id: 'd2', tipo: 'deuda-personal', descripcion: 'Préstamo de la tía Marta', saldoTotal: 1_200_000, cuotaMensual: 100_000, tasa: 0, frecuencia: 'Mensual', diaPago: 28 },
        { id: 'f1', tipo: 'fijo', descripcion: 'Arriendo apartamento centro', monto: 1_200_000, frecuencia: 'Mensual', diaPago: 1, categoria: 'Arriendo' },
      ],
      metas: [
        { id: 'm1', nombre: 'Viaje a San Andrés en diciembre', montoObjetivo: 4_000_000, montoActual: 1_250_000, fechaCreacion: '2026-01-01' },
      ],
      personales: [
        { id: 'p1', persona: 'Compañera de oficina', monto: 850_000, pagado: 200_000, fecha: '2025-06-15', fechaLimite: '2026-01-15', liquidado: false, fechaCreacion: '2025-06-15T00:00:00.000Z' },
      ],
      presupuestos: [
        { id: 'pr1', categoria: 'Restaurantes', montoMensual: 300_000, activo: true },
      ],
      ahorro: {
        fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 1_000_000 },
        aportes: [{ id: 'ap1', monto: 250_000, fecha, nota: 'Aporte de la quincena' }],
      },
  });
}

/** Falla si el documento tiene más ancho que el viewport (scroll horizontal). */
async function assertSinScrollHorizontal(page, contexto) {
  const medidas = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    medidas.scrollWidth,
    `${contexto}: scrollWidth ${medidas.scrollWidth}px supera el viewport de ${medidas.clientWidth}px`,
  ).toBeLessThanOrEqual(medidas.clientWidth);
}

test.describe('Reflow a 320px (RWD.1, WCAG 1.4.10)', () => {

  test('ninguna sección genera scroll horizontal', async ({ page }) => {
    await seedDatos(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    for (const sec of SECCIONES) {
      await page.evaluate(s => { window.location.hash = '#' + s; }, sec);
      await page.waitForSelector(`#sec-${sec}.active`, { timeout: 5_000 });
      // Margen para renders asíncronos (charts, calendario).
      await page.waitForTimeout(150);
      await assertSinScrollHorizontal(page, `Sección #${sec}`);
    }
  });

  test('la barra inferior (sidebar móvil) queda completa dentro del viewport', async ({ page }) => {
    await seedDatos(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    // En móvil la sidebar se vuelve barra inferior fija (responsive.css).
    const nav = page.locator('#sidebar');
    await expect(nav).toBeVisible();
    const box = await nav.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
  });

  test('el modal de ingreso puntual (.input--big-amount) cabe completo', async ({ page }) => {
    await seedDatos(page);
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    // El ingreso puntual se abre desde la hoja "Registrar" del bottom nav.
    await page.click('.nav-item--registrar');
    await page.click('.registrar__tile[data-kind="ingreso"]');
    await page.waitForSelector('#modal-ingreso-puntual[data-open]', { timeout: 5_000 });

    const modal = page.locator('#modal-ingreso-puntual .modal');
    const box = await modal.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);

    const input = page.locator('#modal-ingreso-puntual .input--big-amount');
    await expect(input).toBeVisible();
    const inputBox = await input.boundingBox();
    expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(320);

    await assertSinScrollHorizontal(page, 'Modal de ingreso puntual');
  });

  test('el asistente "Distribuir mi ingreso" cabe completo', async ({ page }) => {
    await seedDatos(page);
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    const btn = page.locator('[data-action="toggle-distribuir-ingreso"]');
    if (!(await btn.isVisible())) test.skip(true, 'Botón de distribución no visible con este estado');
    await btn.click();
    await page.waitForTimeout(300);
    await assertSinScrollHorizontal(page, 'Asistente Distribuir mi ingreso');
  });

});
