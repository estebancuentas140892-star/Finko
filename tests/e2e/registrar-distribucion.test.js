/**
 * registrar-distribucion.test.js - NAV.A2b slice 2: oferta de distribución tras
 * un ingreso puntual, con el asistente en modo "ya acreditado" (ADR 024 D3).
 *
 * El invariante crítico es el no-doble-abono: el ingreso puntual ya subió el
 * saldo al registrarse, así que el asistente NO debe volver a sumarlo. Como
 * `_confirmarDistribucion` lee el DOM, esto se verifica de punta a punta.
 */

import { test, expect } from '@playwright/test';

/** Avanza el asistente paginado hasta el último paso (donde vive "Distribuir"). */
async function avanzarDistribuir(page) {
  const siguiente = page.locator('[data-action="distribuir-paso-siguiente"]');
  for (let i = 0; i < 5; i++) {
    if (!(await siguiente.isVisible())) return;
    await siguiente.click();
  }
}

async function seed(page, estado) {
  await page.addInitScript((data) => {
    localStorage.setItem('fk_v1', JSON.stringify(data));
  }, { perfil: { nombre: 'Ana', smmlv: 1750905 }, onboarded: true, ...estado });
  await page.goto('/#tesoreria');
  await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
}

/** Registra un ingreso puntual del monto dado (1 cuenta activa → sin preguntar cuenta). */
async function registrarIngresoPuntual(page, monto) {
  await page.click('[data-action="nuevo-ingreso-puntual"]');
  await page.waitForSelector('#modal-ingreso-puntual[data-open]', { timeout: 5_000 });
  await page.fill('#ingreso-p-monto', String(monto));
  await page.click('#form-ingreso-puntual button[type="submit"]');
}

test.describe('NAV.A2b s2 - oferta de distribución tras un ingreso puntual', () => {

  test('modo "ya acreditado": distribuir el ingreso no vuelve a sumar el saldo', async ({ page }) => {
    await seed(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas:  [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
      compromisos: [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ],
    });

    // Registrar $1.000.000: la cuenta pasa de 1.000.000 a 2.000.000.
    await registrarIngresoPuntual(page, 1_000_000);

    // Aparece la oferta; aceptarla abre el asistente con el monto pre-cargado.
    const oferta = page.locator('.modal--confirm');
    await expect(oferta).toBeVisible({ timeout: 3_000 });
    await expect(oferta).toContainText('$1.000.000');
    await oferta.locator('[data-role="confirmar"]').click();

    await expect(page.locator('#distribuir-ingreso-panel')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('#distribuir-monto')).toHaveValue('1000000');

    // El Arriendo (Necesidad fija) viene marcado por defecto: se paga con el ingreso.
    await avanzarDistribuir(page);
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.waitForTimeout(400); // save() debounced (ADN #5)
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));

    // Saldo = 2.000.000 (ya acreditado) - 800.000 (arriendo). SIN el +1.000.000
    // del flujo normal: eso sería el doble abono (daría 3.000.000).
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_200_000);
    // El ingreso puntual quedó registrado y el arriendo se pagó.
    expect((st.ingresosPuntuales ?? []).length).toBe(1);
    expect(st.gastos.some(g => g.compromisoId === 'cf1' && g.monto === 800_000)).toBe(true);
    // El periodo del ingreso recurrente NO se consume con un ingreso puntual.
    expect(st.config?.ultimaDistribucionPeriodo ?? null).toBeNull();
  });

  test('"Ahora no" registra el ingreso pero no abre el asistente', async ({ page }) => {
    await seed(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas:  [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
    });

    await registrarIngresoPuntual(page, 500_000);

    const oferta = page.locator('.modal--confirm');
    await expect(oferta).toBeVisible({ timeout: 3_000 });
    await oferta.locator('[data-role="cancelar"]').click();

    await expect(page.locator('#distribuir-ingreso-panel')).toBeHidden();
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_500_000); // solo el ingreso, sin distribuir
  });

  test('sin ingreso recurrente no hay asistente: no se ofrece distribuir', async ({ page }) => {
    await seed(page, {
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
    });

    await registrarIngresoPuntual(page, 500_000);

    // El modal de ingreso se cerró y NO aparece ninguna oferta de distribución.
    await expect(page.locator('#modal-ingreso-puntual')).not.toHaveAttribute('data-open', '', { timeout: 3_000 });
    await expect(page.locator('.modal--confirm')).toHaveCount(0);
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_500_000);
  });
});
