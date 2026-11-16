/**
 * inicio-rediseno.test.js - Inicio en el teléfono según el tablero "Finko ·
 * Inicio, rediseño" (INI.2, ADR 152).
 *
 * Cubre en el navegador lo que los unitarios no pueden medir:
 * - D1 (INI.2a): el saldo centrado, el "$" volado a la mitad de la cifra y la
 *   ficha "En N cuentas" centrada.
 * - D2 (INI.2a): las cuentas abiertas con su tipo debajo del nombre y "Ver mis
 *   cuentas" al pie.
 *
 * Reloj fijo: lo vencido y lo de hoy dependen del día del mes.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

const HOY = new Date('2026-11-16T10:00:00');

const CUENTAS = [
  { id: 'c1', nombre: 'Banco de Bogotá', banco: 'Banco de Bogotá', tipo: 'Ahorros', saldo: 1_373_900, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' },
  { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 2_180_500, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' },
  { id: 'c3', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 340_000, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' },
];

const fijo = (id, descripcion, monto, diaPago, categoria = 'Servicios') => ({
  id, descripcion, tipo: 'fijo', categoria, monto, frecuencia: 'Mensual',
  diaPago, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z',
});

/** El caso del tablero: un arriendo vencido ayer, Netflix y Claro hoy, el colegio el jueves. */
function estado(extra = {}) {
  return estadoBase({
    perfil: { nombre: 'Linay Muñoz', smmlv: 1750905 },
    cuentas: CUENTAS,
    compromisos: [
      fijo('k1', 'Arriendo', 1_350_000, 15, 'Vivienda'),
      fijo('k2', 'Netflix', 38_900, 16, 'Entretenimiento'),
      fijo('k3', 'Plan Claro', 65_000, 16),
      fijo('k4', 'Colegio', 682_016, 19, 'Educación'),
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

test.describe('INI.2a - el saldo al centro (ADR 152 D1 y D2)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('el saldo, centrado, con el "$" volado y "En 3 cuentas"', async ({ page }) => {
    await abrir(page);
    await expect(page.locator('#hero-saldo-label')).toHaveText('Tu dinero disponible');
    await expect(page.locator('#saldo-total')).toHaveText('$3.894.400');
    await expect(page.locator('#saldo-detalle-label')).toHaveText('En 3 cuentas');

    const medidas = await page.evaluate(() => {
      const caja = (s) => document.querySelector(s).getBoundingClientRect();
      const centro = (b) => b.left + b.width / 2;
      const signo = document.querySelector('#saldo-total .hero-inicio__signo');
      const cifra = document.querySelector('#saldo-total .hero-inicio__cifra');
      const valor = caja('#saldo-total');
      return {
        ancho: window.innerWidth,
        label: centro(caja('#hero-saldo-label')),
        pill: centro(caja('#saldo-detalle-toggle')),
        // El monto ocupa lo que mide, centrado: "$" más cifra.
        monto: (signo.getBoundingClientRect().left + cifra.getBoundingClientRect().right) / 2,
        valorDentro: valor.left >= 0 && valor.right <= window.innerWidth,
        tamSigno: parseFloat(getComputedStyle(signo).fontSize),
        tamCifra: parseFloat(getComputedStyle(cifra).fontSize),
      };
    });
    expect(Math.abs(medidas.label - medidas.ancho / 2)).toBeLessThan(2);
    expect(Math.abs(medidas.pill - medidas.ancho / 2)).toBeLessThan(2);
    expect(Math.abs(medidas.monto - medidas.ancho / 2)).toBeLessThan(3);
    expect(medidas.valorDentro).toBe(true);
    expect(medidas.tamCifra).toBe(56);
    expect(medidas.tamSigno).toBe(28);
  });

  test('las cuentas abiertas dicen su tipo y llevan a Mis cuentas', async ({ page }) => {
    await abrir(page);
    await page.click('#saldo-detalle-toggle');
    const filas = page.locator('#saldo-detalle .hero-inicio__cuenta');
    await expect(filas).toHaveCount(3);
    await expect(filas.nth(0).locator('.hero-inicio__cuenta-tipo')).toHaveText('Ahorros');
    await expect(filas.nth(2).locator('.hero-inicio__cuenta-tipo')).toHaveText('Depósito de bajo monto');
    await expect(filas.nth(2).locator('.hero-inicio__cuenta-saldo')).toHaveText('$340.000');
    const ir = page.locator('#saldo-detalle-caja .hero-inicio__ir-cuentas');
    await expect(ir).toHaveText('Ver mis cuentas');
    await expect(ir).toHaveAttribute('href', '#tesoreria');
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sobra).toBe(0);
  });

  test('a 320px el saldo de mil millones cabe', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await abrir(page, estado({ cuentas: [{ ...CUENTAS[0], saldo: 1_234_567_890 }] }));
    await expect(page.locator('#saldo-total')).toHaveText('$1.234.567.890');
    const dentro = await page.evaluate(() => {
      const b = document.querySelector('#saldo-total .hero-inicio__cifra').getBoundingClientRect();
      return b.left >= 0 && b.right <= window.innerWidth;
    });
    expect(dentro).toBe(true);
  });
});
