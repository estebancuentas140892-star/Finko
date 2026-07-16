/**
 * registrar-distribucion.test.js - MC.13e-1 (ADR 041, decisión (a) confirmada
 * 2026-07-15): un ingreso esporádico (puntual) ya NO ofrece distribuirlo.
 *
 * Reemplaza la cobertura de NAV.A2b slice 2 (ADR 024 D3), que ofrecía el
 * asistente en modo "ya acreditado" tras registrar un ingreso puntual: ese
 * modo se eliminó por completo (revierte el ADR 024 D3, decisión formal de
 * Esteban). El invariante que importa ahora es el inverso: NINGÚN ingreso
 * puntual abre el asistente, con o sin ingreso recurrente registrado.
 */

import { test, expect } from '@playwright/test';

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

test.describe('MC.13e-1 - un ingreso esporádico ya no ofrece distribuirlo', () => {

  test('con ingreso recurrente registrado: acredita en silencio, sin ninguna oferta', async ({ page }) => {
    await seed(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas:  [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
    });

    await registrarIngresoPuntual(page, 1_000_000);

    // El modal de ingreso se cierra y NO aparece ningún diálogo de confirmación.
    await expect(page.locator('#modal-ingreso-puntual')).not.toHaveAttribute('data-open', '', { timeout: 3_000 });
    await expect(page.locator('.modal--confirm')).toHaveCount(0);
    await expect(page.locator('#distribuir-ingreso-panel')).toBeHidden();

    await page.waitForTimeout(400); // save() debounced (ADN #5)
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(2_000_000);
    expect((st.ingresosPuntuales ?? []).length).toBe(1);
    // El periodo del ingreso recurrente no se toca: un ingreso puntual no es una distribución.
    expect(st.config?.ultimaDistribucionPeriodo ?? null).toBeNull();
  });

  test('sin ingreso recurrente: mismo comportamiento, tampoco hay oferta', async ({ page }) => {
    await seed(page, {
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
    });

    await registrarIngresoPuntual(page, 500_000);

    await expect(page.locator('#modal-ingreso-puntual')).not.toHaveAttribute('data-open', '', { timeout: 3_000 });
    await expect(page.locator('.modal--confirm')).toHaveCount(0);
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_500_000);
  });

  test('el asistente sigue accesible manualmente desde Mis cuentas tras el ingreso puntual', async ({ page }) => {
    await seed(page, {
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }],
      cuentas:  [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }],
      // La tarjeta "Distribuir mi ingreso" solo muestra su CTA con al menos un
      // destino fondeable (hayDestinos); un fijo Mensual alcanza para eso.
      compromisos: [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ],
    });

    await registrarIngresoPuntual(page, 1_000_000);
    await expect(page.locator('#modal-ingreso-puntual')).not.toHaveAttribute('data-open', '', { timeout: 3_000 });

    // El acceso manual (MC.18e) sigue funcionando: abre el asistente normal,
    // con el monto estimado del ingreso recurrente (no el del ingreso puntual).
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await expect(page.locator('#distribuir-ingreso-panel')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('#distribuir-monto')).toHaveValue('3000000');
  });
});
