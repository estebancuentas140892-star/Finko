/**
 * aprende.test.js - Finko del adulto ayuda a decidir; no enseña con lecciones
 * (ADR 101, que retira del adulto la capa del ADR 092).
 *
 * Antes cubría la ruta de Aprende del adulto, el bloque Inicio con tres lentes,
 * "Tu siguiente paso", la oferta del Fondo y la prueba de ubicación. Todo eso
 * salió de la app del adulto; acá se verifica que no vuelva a aparecer. El
 * motor de lecciones lo sigue usando el niño: su recorrido está en
 * perfiles.test.js.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase, leerEstado } from './helpers/estado.js';

const CUENTA = { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 900_000, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' };

test.describe('ADR 101 - el adulto no ve Aprende ni Tu progreso', () => {
  test('móvil: Inicio es una sola pantalla, sin lentes, sin "Tu siguiente paso" y sin Accesos (D1)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await sembrar(page, estadoBase({ cuentas: [CUENTA] }));
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await expect(page.locator('.bloque-tabs--inicio')).toHaveCount(0);
    await expect(page.locator('#panel-siguiente-paso')).toHaveCount(0);
    await expect(page.locator('#accesos-actividad-movil')).toHaveCount(0);
  });

  test('escritorio: la barra lateral no ofrece Aprende ni Tu progreso (D2)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await sembrar(page, estadoBase({ cuentas: [CUENTA] }));
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await expect(page.locator('#sidebar a[href="#aprende"]')).toHaveCount(0);
    await expect(page.locator('#sidebar a[href="#progreso"]')).toHaveCount(0);
  });

  test('un enlace viejo a #aprende o #progreso llega a Inicio (D2)', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: [CUENTA] }));
    for (const hash of ['aprende', 'progreso']) {
      await page.goto(`/#${hash}`);
      await expect(page.locator('#sec-dash.active')).toHaveCount(1);
      await expect(page.locator(`#sec-${hash}`)).toHaveCount(0);
    }
  });

  test('el Fondo no ofrece lección (D2)', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: [CUENTA] }));
    await page.goto('/#fondo');
    await page.waitForSelector('#sec-fondo.active', { timeout: 10_000 });
    await expect(page.locator('#fondo-leccion, #fondo-leccion-pie, .leccion-oferta')).toHaveCount(0);
  });

  test('los logros se guardan en silencio: sin avisos ni confeti (D3)', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: [CUENTA] }));
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await page.waitForTimeout(600);
    await expect(page.locator('.logro-toast')).toHaveCount(0);
    await expect(page.locator('.confetti-piece')).toHaveCount(0);
    const estado = await leerEstado(page);
    expect(estado.logros.length).toBeGreaterThan(0);
  });
});
