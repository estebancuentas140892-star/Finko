/**
 * inicio-hoy.test.js - "Atención hoy" de Inicio en móvil (MV2.15a, ADR 099).
 *
 * Cubre en el navegador lo que los unitarios no pueden medir:
 * - D1: una fila por clase de aviso, tope de tres, y los paneles que reemplaza
 *   no se ven bajo 1024px.
 * - D3: la lente, "Ver los N" y la hoja dicen el mismo número; pagar desde la
 *   hoja la cierra y abre el lote con esos mismos pagos.
 * - D2: lo de mañana no cuenta arriba y sigue en la lista de la semana.
 * - D5 (MV2.15b): "Esta semana", con lo que entra primero y el pie por lado.
 * - Escritorio no cambia: la lista no existe y los paneles siguen.
 * - A 320px nada desborda a lo ancho.
 *
 * Reloj fijo (`page.clock.setFixedTime`): lo vencido, lo de hoy y lo de
 * mañana dependen del día del mes (mismo criterio que BUG-021).
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

const HOY = new Date('2026-08-13T10:00:00');

const fijo = (id, descripcion, monto, diaPago) => ({
  id, descripcion, tipo: 'fijo', categoria: 'Vivienda', monto, frecuencia: 'Mensual',
  diaPago, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z',
});

/**
 * Uso normal en pequeño: un arriendo vencido y un plan que vence hoy (2
 * pagos), un límite pasado, un salario sin distribuir (4 avisos de hoy). Un
 * colegio y un préstamo vencen mañana: no son de hoy.
 */
function estado() {
  return estadoBase({
    perfil: { nombre: 'Laura', smmlv: 1750905 },
    cuentas: [{ id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 3_000_000, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' }],
    ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 4_200_000, frecuencia: 'Mensual', categoria: 'Salario', diaPago: 1, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z', cuentaId: 'c1' }],
    compromisos: [fijo('k1', 'Arriendo', 1_350_000, 5), fijo('k2', 'Plan Claro', 65_000, 13), fijo('k3', 'Colegio', 682_016, 14)],
    presupuestos: [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 200_000, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z' }],
    gastos: [{ id: 'g1', monto: 250_000, categoria: 'Restaurantes', descripcion: 'Cena', fecha: '2026-08-10', cuentaId: 'c1' }],
    personales: [{ id: 'pe1', persona: 'Juan', monto: 100_000, pagado: 0, fecha: '2026-08-01', fechaLimite: '2026-08-14', liquidado: false, fechaCreacion: '2026-08-01T00:00:00.000Z' }],
  });
}

async function abrir(page) {
  await page.clock.setFixedTime(HOY);
  await sembrar(page, estado());
  await page.goto('/#dash');
  await page.waitForSelector('#panel-atencion-hoy:not([hidden]) .atencion-hoy__fila', { timeout: 10_000 });
}

test.describe('MV2.15a - Atención hoy en móvil (ADR 099)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('una fila por clase y los paneles que reemplaza no se ven (D1)', async ({ page }) => {
    await abrir(page);
    const filas = page.locator('#panel-atencion-hoy .atencion-hoy__fila');
    await expect(filas).toHaveCount(3);
    await expect(filas.nth(0)).toContainText('2 pagos para hoy');
    await expect(filas.nth(1)).toContainText('Restaurantes pasó su límite');
    await expect(filas.nth(2)).toContainText('Recibiste tu ingreso');
    for (const id of ['#panel-vencidos', '#panel-limites', '#panel-distribuir-inicio', '#label-atencion-hoy']) {
      await expect(page.locator(id)).toBeHidden();
    }
  });

  test('la lente, "Ver los N" y la hoja dicen el mismo número; lo de mañana no cuenta (D2, D3)', async ({ page }) => {
    await abrir(page);
    await expect(page.locator('#tabs-dash .bloque-tabs__tab[data-section="dash"]')).toHaveAttribute('aria-label', 'Hoy, 4 avisos');
    const ver = page.locator('#panel-atencion-hoy [data-action="atencion-hoy-ver"]');
    await expect(ver).toContainText('Ver los 4');

    await ver.click();
    const hoja = page.locator('#modal-avisos-hoy');
    await expect(hoja).toHaveAttribute('data-open', '');
    await expect(hoja.locator('#avisos-hoy-titulo')).toHaveText('Avisos de hoy · 4');
    await expect(hoja.locator('.avisos-hoy__item')).toHaveCount(4);

    // Lo de mañana sigue abajo, y lo de hoy ya no se repite ahí.
    const prioridades = page.locator('#panel-prioridades');
    await expect(prioridades).toContainText('Colegio');
    await expect(prioridades).toContainText('Juan te debe');
    await expect(prioridades).not.toContainText('Plan Claro');
  });

  test('Esta semana: lo de mañana, lo que entra primero y el pie con cada lado (MV2.15b, D5)', async ({ page }) => {
    await abrir(page);
    const semana = page.locator('#panel-prioridades');
    await expect(semana.locator('.esta-semana__titulo')).toHaveText('Esta semana');
    const filas = semana.locator('.esta-semana__fila');
    await expect(filas).toHaveCount(2);
    await expect(filas.nth(0)).toContainText('Juan te debe');
    await expect(filas.nth(0).locator('.esta-semana__monto')).toHaveText('+$100.000');
    await expect(filas.nth(1)).toContainText('Colegio');
    await expect(filas.nth(1).locator('.esta-semana__tipo')).toHaveText('Mañana · gasto fijo');
    await expect(filas.nth(1).locator('.esta-semana__monto')).toHaveText('-$682.016');
    await expect(semana.locator('.esta-semana__pie')).toContainText('Entra $100.000');
    await expect(semana.locator('.esta-semana__pie')).toContainText('Sale $682.016');
  });

  test('pagar desde la hoja la cierra y abre el lote con esos mismos pagos (D3)', async ({ page }) => {
    await abrir(page);
    await page.locator('#panel-atencion-hoy [data-action="atencion-hoy-ver"]').click();
    await page.locator('#modal-avisos-hoy .avisos-hoy__cta[data-target-action="inicio-pagar-lote"]').click();

    await expect(page.locator('#modal-avisos-hoy')).not.toHaveAttribute('data-open', '');
    await expect(page.locator('#modal-pago-lote')).toHaveAttribute('data-open', '');
    await expect(page.locator('#modal-pago-lote-body input[type="checkbox"]')).toHaveCount(2);
  });

  test('a 320px nada desborda a lo ancho y los botones conservan 44px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await abrir(page);
    const medidas = await page.evaluate(() => ({
      sobra: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      altos: [...document.querySelectorAll('#panel-atencion-hoy .atencion-hoy__accion, #panel-atencion-hoy .atencion-hoy__ver')]
        // Redondeado: bajo carga se midió 43,99997 a mitad de la animación de entrada.
        .map(b => Math.round(b.getBoundingClientRect().height)),
    }));
    expect(medidas.sobra).toBe(0);
    for (const alto of medidas.altos) expect(alto).toBeGreaterThanOrEqual(44);
  });
});

test.describe('MV2.15a - escritorio sin cambios (ADR 099)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('la lista no existe y los paneles de siempre siguen', async ({ page }) => {
    await page.clock.setFixedTime(HOY);
    await sembrar(page, estado());
    await page.goto('/#dash');
    await page.waitForSelector('#panel-vencidos:not([hidden])', { timeout: 10_000 });
    await expect(page.locator('#panel-atencion-hoy')).toBeHidden();
    await expect(page.locator('#label-atencion-hoy')).toBeVisible();
    await expect(page.locator('#panel-limites')).toBeVisible();
    await expect(page.locator('#panel-distribuir-inicio')).toBeVisible();
  });
});
