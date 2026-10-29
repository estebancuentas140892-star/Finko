/**
 * onboarding-nino.test.js - el niño empieza solo (APR.6a, ADR 100).
 *
 * Cubre en el navegador, desde un teléfono vacío:
 * - D1: la primera pantalla pregunta quién va a usar Finko, con el código de
 *   la familia (NUBE.3) en esa misma pantalla.
 * - D2 a D4: el niño llega a su app en tres pantallas, sin PIN ni cuenta, y al
 *   recargar sigue en su app: ni onboarding, ni "¿Quién usa Finko?", ni el
 *   paso legal del adulto, ni "Cambiar de perfil".
 * - "Tengo 13 años o más" y "Volver" llevan al camino del adulto y de vuelta.
 * - APR.6b (D5): "Este teléfono es de un adulto" crea el adulto con PIN y
 *   documentos; el niño sigue con lo suyo. No se ofrece si hay nube.
 */

import { test, expect } from '@playwright/test';
import { leerEstado, sembrarSiVacio, estadoBase } from './helpers/estado.js';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('APR.6a - el niño empieza solo (ADR 100)', () => {
  test('la primera pantalla pregunta quién va a usar Finko (D1)', async ({ page }) => {
    await page.goto('/');
    const onb = page.locator('#onboarding[data-open]');
    await expect(onb.locator('[data-action="onboarding-adulto"]')).toBeVisible();
    await expect(onb.locator('[data-action="onboarding-nino"]')).toBeVisible();
    await expect(onb.locator('[data-action="nube-codigo-nino"]')).toBeVisible();
  });

  test('el niño llega a su app en tres pantallas y al recargar sigue ahí (D2 a D4)', async ({ page }) => {
    await page.goto('/');
    const onb = page.locator('#onboarding');
    await onb.locator('[data-action="onboarding-nino"]').click();

    // 1. Nombre y edad: sin ellos, lo dice en su voz.
    await onb.locator('#form-onboarding-nino-nombre [type="submit"]').click();
    await expect(onb.locator('#form-onboarding-nino-nombre')).toContainText('Escribe tu nombre.');
    await onb.locator('#onboarding-nino-nombre').fill('Sofía');
    await onb.locator('.onboarding-edad', { hasText: '8' }).click();
    await onb.locator('#form-onboarding-nino-nombre [type="submit"]').click();

    // 2. Su dibujo.
    await expect(onb.locator('#onboarding-nino-titulo')).toHaveText('Elige tu dibujo, Sofía');
    await onb.locator('.familia-dibujo').nth(2).click();
    await onb.locator('#form-onboarding-nino-dibujo [type="submit"]').click();

    // 3. Antes de empezar: un toque, sin casilla de contrato.
    await expect(onb.locator('#form-onboarding-nino-antes input[type="checkbox"]')).toHaveCount(0);
    await onb.locator('#form-onboarding-nino-antes [type="submit"]').click();

    await expect(page.locator('body')).toHaveClass(/\bkid\b/);
    await expect(page.locator('#nino-main h1')).toHaveText('¡Hola, Sofía!');

    // save() es diferido 200ms (ADN 5): se lee después de que escribe.
    await page.waitForTimeout(400);
    const estado = await leerEstado(page);
    expect(estado.config.dispositivoNino).toBe(estado.perfiles[0].id);
    expect(estado.config.legalAceptado.via).toBe('nino');
    expect(estado.perfiles[0]).toMatchObject({ nombre: 'Sofía', edad: 8, teNombra: 'Tu familia' });

    // Recarga: su teléfono, sin ningún paso del adulto.
    await page.reload();
    await expect(page.locator('#nino-main h1')).toHaveText('¡Hola, Sofía!');
    await expect(page.locator('.modal-overlay[data-open]')).toHaveCount(0);
    await expect(page.locator('body')).toHaveClass(/\bkid-propio\b/);
  });

  test('"Tengo 13 años o más" lleva al camino del adulto, y "Volver" a la primera pantalla', async ({ page }) => {
    await page.goto('/');
    const onb = page.locator('#onboarding');
    await onb.locator('[data-action="onboarding-nino"]').click();
    await onb.locator('#form-onboarding-nino-nombre [data-action="onboarding-adulto"]').click();
    await expect(onb.locator('#onboarding-nombre')).toBeVisible();
    await onb.locator('#form-onboarding [data-action="onboarding-volver"]').click();
    await expect(onb.locator('[data-action="onboarding-nino"]')).toBeVisible();
  });
});

// ── APR.6b: "Este teléfono es de un adulto" (ADR 100 D5) ────────────────────

test.describe('APR.6b - este teléfono es de un adulto (ADR 100)', () => {
  /** Un teléfono que empezó como de Sofía (APR.6a), con algo en su alcancía. */
  async function telefonoDeSofia(page) {
    await sembrarSiVacio(page, estadoBase({
      perfil: { nombre: '', smmlv: 1750905 },
      perfiles: [{ id: 'n-sofi', nombre: 'Sofía', edad: 8, dibujo: 'bici', teNombra: 'Tu familia', creado: '2026-10-29',
        movimientos: [{ id: 'm1', frasco: 'ahorrar', tipo: 'entra', monto: 5000, fecha: '2026-10-29', nota: 'Regalo' }] }],
      config: { dispositivoNino: 'n-sofi', legalAceptado: { version: 'Borrador v0.1', fecha: '2026-10-29', via: 'nino' } },
    }));
    await page.goto('/');
    await expect(page.locator('#nino-main h1')).toHaveText('¡Hola, Sofía!');
  }

  test('desde "Yo", con confirmación, nombre, PIN y documentos: el adulto entra y Sofía sigue', async ({ page }) => {
    await telefonoDeSofia(page);
    await page.locator('.knav [data-vista="yo"]').click();
    const enlace = page.locator('.knino-adulto');
    await expect(enlace).toBeVisible();
    await enlace.click();
    await page.getByRole('button', { name: 'Sí, soy un adulto' }).click();

    const onb = page.locator('#onboarding');
    await onb.locator('#telefono-adulto-nombre').fill('Laura');
    await onb.locator('#telefono-adulto-pin').fill('1234');
    await onb.locator('#telefono-adulto-pin2').fill('1234');
    await onb.locator('#form-telefono-adulto [type="submit"]').click();
    await onb.locator('#form-telefono-adulto-legal input[name="acepto"]').check();
    await onb.locator('#form-telefono-adulto-legal [type="submit"]').click();

    await expect(page.locator('body')).not.toHaveClass(/\bkid\b/);
    await expect(page.locator('#saludo-inicio')).toHaveText('Laura');

    await page.waitForTimeout(400);
    const estado = await leerEstado(page);
    expect(estado.config.dispositivoNino).toBeUndefined();
    expect(estado.config.bloqueo.hash).toBeTruthy();
    expect(estado.config.legalAceptado.via).toBeUndefined();
    expect(estado.perfiles[0].movimientos).toHaveLength(1);

    // Al volver a abrir: "¿Quién usa Finko?", el adulto con PIN y Sofía.
    await page.reload();
    const quien = page.locator('#quien-usa[data-open]');
    await expect(quien).toContainText('Laura');
    await expect(quien).toContainText('Sofía');
  });

  test('en un teléfono unido a la nube de su familia no se ofrece', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('fk_nube_nino', JSON.stringify({ token: 't', ninoId: 'n-sofi' })));
    await telefonoDeSofia(page);
    await page.locator('.knav [data-vista="yo"]').click();
    await expect(page.locator('.knino-adulto')).toBeHidden();
  });
});
