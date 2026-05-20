/**
 * estrategia-pago.test.js - E2E smoke para F.4 (Avalancha / Bola de nieve).
 *
 * Escenario: 2 deudas con tasas y saldos distintos.
 *   - Deuda A: 30% EA, $15 M saldo, cuota $500 000  → prioritaria en Avalancha
 *   - Deuda B: 12% EA, $1.5 M saldo, cuota $200 000 → prioritaria en Bola de Nieve
 *
 * Verifica:
 *   1. La card aparece al navegar a compromisos.
 *   2. Orden Avalancha: Deuda A (mayor tasa) primero.
 *   3. Toggle a Bola de Nieve: Deuda B (menor saldo) primero.
 *   4. Ingresar extra mensual redibuja la card con nuevos totales.
 *   5. Con solo 1 deuda válida se muestra el hint (no la card completa).
 *   6. Con 0 deudas válidas el contenedor está vacío.
 */

import { test, expect } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** IDs estables para las deudas de prueba */
const ID_A = 'deuda-a-e2e';
const ID_B = 'deuda-b-e2e';

/**
 * Inyecta estado con 2 deudas válidas y salta el onboarding.
 * _version: 3 coincide con el schema actual de Finko.
 */
async function inyectarDosDeudas(page) {
  await page.addInitScript(({ idA, idB }) => {
    const estado = {
      _version: 3,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [],
      ingresos: [],
      gastos: [],
      metas: [],
      prestamos: [],
      presupuestos: [],
      compromisos: [
        {
          id: idA,
          descripcion: 'Crédito caro E2E',
          monto: 500000,
          frecuencia: 'mensual',
          diaPago: 5,
          tipo: 'deuda',
          activo: true,
          saldoPendiente: 15000000,
          tasaEA: 0.30,
        },
        {
          id: idB,
          descripcion: 'Préstamo barato E2E',
          monto: 200000,
          frecuencia: 'mensual',
          diaPago: 15,
          tipo: 'deuda',
          activo: true,
          saldoPendiente: 1500000,
          tasaEA: 0.12,
        },
      ],
    };
    localStorage.setItem('fk_v1', JSON.stringify(estado));
  }, { idA: ID_A, idB: ID_B });
}

/** Inyecta estado con solo 1 deuda válida. */
async function inyectarUnaDeuda(page) {
  await page.addInitScript(({ idA }) => {
    const estado = {
      _version: 3,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [],
      ingresos: [],
      gastos: [],
      metas: [],
      prestamos: [],
      presupuestos: [],
      compromisos: [
        {
          id: idA,
          descripcion: 'Única deuda E2E',
          monto: 300000,
          frecuencia: 'mensual',
          diaPago: 10,
          tipo: 'deuda',
          activo: true,
          saldoPendiente: 5000000,
          tasaEA: 0.20,
        },
      ],
    };
    localStorage.setItem('fk_v1', JSON.stringify(estado));
  }, { idA: ID_A });
}

/** Inyecta estado sin deudas (solo un gasto fijo, no deuda). */
async function inyectarSinDeudas(page) {
  await page.addInitScript(() => {
    const estado = {
      _version: 3,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [],
      ingresos: [],
      gastos: [],
      metas: [],
      prestamos: [],
      presupuestos: [],
      compromisos: [
        {
          id: 'fijo-e2e',
          descripcion: 'Arriendo E2E',
          monto: 1200000,
          frecuencia: 'mensual',
          diaPago: 1,
          tipo: 'fijo',
          activo: true,
        },
      ],
    };
    localStorage.setItem('fk_v1', JSON.stringify(estado));
  });
}

/** Navega a compromisos y espera que la sección quede activa. */
async function irACompromisos(page) {
  await page.goto('/#compromisos');
  await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
}

// ── SUITE: Estrategia de pago ─────────────────────────────────────────────────

test.describe('Estrategia de pago de deudas (F.4)', () => {

  // ── Test 1: card aparece con ≥ 2 deudas ─────────────────────────────────

  test('la card aparece con 2 deudas válidas', async ({ page }) => {
    await inyectarDosDeudas(page);
    await irACompromisos(page);

    const card = page.locator('#estrategia-pago .estrategia-card');
    await expect(card).toBeVisible({ timeout: 5_000 });
    await expect(card).toContainText('Estrategia de pago de deudas');
  });

  // ── Test 2: orden Avalancha (mayor tasa primero) ─────────────────────────

  test('Avalancha muestra la deuda de mayor tasa en posición 1', async ({ page }) => {
    await inyectarDosDeudas(page);
    await irACompromisos(page);

    // Avalancha es la estrategia por defecto
    const pasos = page.locator('#estrategia-pago .estrategia-card__paso');
    await expect(pasos).toHaveCount(2, { timeout: 5_000 });

    // Posición 1 debe ser "Crédito caro E2E" (30% EA)
    await expect(pasos.nth(0)).toContainText('Crédito caro E2E');
    // Posición 2 debe ser "Préstamo barato E2E" (12% EA)
    await expect(pasos.nth(1)).toContainText('Préstamo barato E2E');
  });

  // ── Test 3: toggle → Bola de Nieve invierte el orden ────────────────────

  test('Bola de Nieve muestra la deuda de menor saldo en posición 1', async ({ page }) => {
    await inyectarDosDeudas(page);
    await irACompromisos(page);

    // Click en el botón Bola de Nieve
    await page.locator('[data-action="elegir-estrategia"][data-estrategia="bolaNieve"]').click();

    const pasos = page.locator('#estrategia-pago .estrategia-card__paso');
    await expect(pasos).toHaveCount(2, { timeout: 5_000 });

    // Posición 1 debe ser "Préstamo barato E2E" ($1.5 M - menor saldo)
    await expect(pasos.nth(0)).toContainText('Préstamo barato E2E');
    // Posición 2 debe ser "Crédito caro E2E" ($15 M)
    await expect(pasos.nth(1)).toContainText('Crédito caro E2E');
  });

  // ── Test 4: el toggle de vuelta a Avalancha restaura el orden ────────────

  test('volver a Avalancha tras Bola de Nieve restaura el orden original', async ({ page }) => {
    await inyectarDosDeudas(page);
    await irACompromisos(page);

    await page.locator('[data-action="elegir-estrategia"][data-estrategia="bolaNieve"]').click();
    await page.locator('[data-action="elegir-estrategia"][data-estrategia="avalancha"]').click();

    const pasos = page.locator('#estrategia-pago .estrategia-card__paso');
    await expect(pasos.nth(0)).toContainText('Crédito caro E2E');
  });

  // ── Test 5: extra mensual redibuja la card ───────────────────────────────

  test('ingresar extra mensual actualiza los totales de la card', async ({ page }) => {
    await inyectarDosDeudas(page);
    await irACompromisos(page);

    // Capturar meses sin extra
    const totalLabel = page.locator('#estrategia-pago .estrategia-card__total-valor').first();
    const mesesSinExtra = await totalLabel.textContent();

    // Escribir $500 000 de extra y salir del campo (blur → change)
    const inputExtra = page.locator('#estrategia-extra');
    await inputExtra.fill('500000');
    await inputExtra.blur();

    // La card se redibuja - el valor de meses debe cambiar
    const mesesConExtra = await totalLabel.textContent();
    expect(mesesConExtra).not.toBe(mesesSinExtra);
  });

  // ── Test 6: intereses totales se muestran ───────────────────────────────

  test('la card muestra el total de intereses en formato pesos', async ({ page }) => {
    await inyectarDosDeudas(page);
    await irACompromisos(page);

    // El segundo total es "Intereses totales"
    const interesesLabel = page.locator('#estrategia-pago .estrategia-card__total-valor').nth(1);
    const texto = await interesesLabel.textContent();

    // Debe ser un monto formateado con $ (ej. "$3.500.000")
    expect(texto).toMatch(/^\$/);
  });

  // ── Test 7: 1 deuda → hint (no card completa) ────────────────────────────

  test('con 1 deuda válida muestra hint en lugar de la card completa', async ({ page }) => {
    await inyectarUnaDeuda(page);
    await irACompromisos(page);

    // El hint debe aparecer
    const hint = page.locator('#estrategia-pago .estrategia-card--hint');
    await expect(hint).toBeVisible({ timeout: 5_000 });

    // La card completa no debe estar
    const card = page.locator('#estrategia-pago .estrategia-card__orden');
    await expect(card).toHaveCount(0);
  });

  // ── Test 8: 0 deudas → contenedor vacío ─────────────────────────────────

  test('sin deudas el contenedor #estrategia-pago está vacío', async ({ page }) => {
    await inyectarSinDeudas(page);
    await irACompromisos(page);

    const contenedor = page.locator('#estrategia-pago');
    await expect(contenedor).toBeAttached();
    // No debe contener ninguna card
    await expect(contenedor.locator('.estrategia-card')).toHaveCount(0, { timeout: 3_000 });
  });

});
