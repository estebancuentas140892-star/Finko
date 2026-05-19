/**
 * install-prompt.test.js: smoke E2E del banner de instalacion PWA.
 *
 * Cubre el flujo del modulo modules/ui/install-prompt.js:
 *
 *   1. Antes del onboarding: banner oculto.
 *   2. Tras el onboarding (UA iOS): banner visible.
 *   3. Tocar "Instalar" abre el modal iOS con 3 pasos.
 *   4. El modal lista los 3 pasos esperados.
 *   5. Tocar el boton X descarta el banner y persiste en localStorage.
 *   6. Si fk_install esta en estado 'installed', el banner no aparece.
 *
 * Notas:
 *   Se usa UA iOS porque Playwright/Chromium headless no dispara el evento
 *   beforeinstallprompt sin sitio "installable". En iOS la rama del codigo
 *   no requiere ese evento y depende solo de S.onboarded + estado guardado.
 */

import { test, expect } from '@playwright/test';

// UA real de iPhone Safari: el detector lee navigator.userAgent y busca iPhone.
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
               'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 ' +
               'Mobile/15E148 Safari/604.1';

/**
 * Inyecta un estado base en localStorage.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {boolean} [opts.onboarded=true] - si el perfil ya esta onboarded.
 * @param {object}  [opts.install]        - valor a guardar en fk_install (opcional).
 */
async function inyectarEstado(page, { onboarded = true, install } = {}) {
  await page.addInitScript(({ onboarded, install }) => {
    const estado = {
      _version: 4,
      perfil: { nombre: 'TestUser', smmlv: 1423500 },
      onboarded,
      cuentas: [],
      ingresos: [],
      gastos: [],
      compromisos: [],
      metas: [],
      prestamos: [],
      presupuestos: [],
      logros: [],
    };
    localStorage.setItem('fk_v1', JSON.stringify(estado));
    if (install) {
      localStorage.setItem('fk_install', JSON.stringify(install));
    }
  }, { onboarded, install });
}

// ── Banner en UA iOS ─────────────────────────────────────────────────────────

test.describe('Banner de instalacion PWA (UA iOS)', () => {
  test.use({ userAgent: UA_IOS });

  test('Banner oculto antes del onboarding', async ({ page }) => {
    await inyectarEstado(page, { onboarded: false });
    await page.goto('/');

    // El atributo hidden esta presente en el HTML inicial y no se quita
    // hasta que onboarded sea true.
    await expect(page.locator('#install-banner')).toBeHidden();
  });

  test('Banner visible tras el onboarding', async ({ page }) => {
    await inyectarEstado(page, { onboarded: true });
    await page.goto('/');

    // El modulo init evalua S.onboarded al arrancar y lo muestra si aplica.
    await expect(page.locator('#install-banner')).toBeVisible();
  });

  test('Tocar "Instalar" abre el modal iOS', async ({ page }) => {
    await inyectarEstado(page, { onboarded: true });
    await page.goto('/');

    await expect(page.locator('#install-banner')).toBeVisible();
    await page.click('#install-banner [data-action="install-pwa"]');

    // El modal se abre seteando el atributo data-open.
    await expect(page.locator('#modal-install-ios')).toHaveAttribute('data-open', '');
  });

  test('Modal iOS lista los 3 pasos esperados', async ({ page }) => {
    await inyectarEstado(page, { onboarded: true });
    await page.goto('/');

    await page.click('#install-banner [data-action="install-pwa"]');
    await expect(page.locator('#modal-install-ios')).toHaveAttribute('data-open', '');

    const pasos = page.locator('#modal-install-ios .install-ios__step');
    await expect(pasos).toHaveCount(3);
    await expect(pasos.nth(0)).toContainText('Compartir');
    await expect(pasos.nth(1)).toContainText('Agregar a pantalla de inicio');
    await expect(pasos.nth(2)).toContainText('Agregar');
  });

  test('Descartar oculta el banner y persiste en localStorage', async ({ page }) => {
    await inyectarEstado(page, { onboarded: true });
    await page.goto('/');

    await expect(page.locator('#install-banner')).toBeVisible();
    await page.click('#install-banner [data-action="dismiss-install"]');

    await expect(page.locator('#install-banner')).toBeHidden();

    const guardado = await page.evaluate(() => localStorage.getItem('fk_install'));
    expect(guardado).not.toBeNull();
    const data = JSON.parse(guardado);
    expect(data.estado).toBe('dismissed');
    expect(typeof data.ts).toBe('number');
  });

  test('No reaparece si fk_install tiene estado installed', async ({ page }) => {
    await inyectarEstado(page, {
      onboarded: true,
      install: { estado: 'installed', ts: Date.now() },
    });
    await page.goto('/');

    // Aunque onboarded sea true, el estado installed bloquea la aparicion.
    await expect(page.locator('#install-banner')).toBeHidden();
  });
});
