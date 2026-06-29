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
    // Titulo actual (v7+): "Estrategia de pago" (sin "de deudas")
    await expect(card).toContainText('Estrategia de pago');
  });

  // ── Test 2: orden Avalancha (mayor tasa primero) ─────────────────────────

  test('Avalancha prioriza la deuda de mayor tasa', async ({ page }) => {
    await inyectarDosDeudas(page);
    await irACompromisos(page);

    // Seleccionar Avalancha (no hay estrategia elegida por defecto)
    await page.locator('[data-action="elegir-estrategia"][data-estrategia="avalancha"]').click();

    // "Apuntás primero a" debe ser la de mayor tasa: 30% EA
    const target = page.locator('.estrategia-card__metrica-valor--info');
    await expect(target).toContainText('Crédito caro E2E', { timeout: 3_000 });
  });

  // ── Test 3: toggle → Bola de Nieve invierte el orden ────────────────────

  test('Bola de Nieve prioriza la deuda de menor saldo', async ({ page }) => {
    await inyectarDosDeudas(page);
    await irACompromisos(page);

    await page.locator('[data-action="elegir-estrategia"][data-estrategia="bolaNieve"]').click();

    // "Apuntás primero a" debe ser la de menor saldo: $1.5 M
    const target = page.locator('.estrategia-card__metrica-valor--info');
    await expect(target).toContainText('Préstamo barato E2E', { timeout: 3_000 });
  });

  // ── Test 4: el toggle de vuelta a Avalancha restaura el orden ────────────

  test('volver a Avalancha tras Bola de Nieve restaura la prioridad', async ({ page }) => {
    await inyectarDosDeudas(page);
    await irACompromisos(page);

    await page.locator('[data-action="elegir-estrategia"][data-estrategia="bolaNieve"]').click();
    await page.locator('[data-action="elegir-estrategia"][data-estrategia="avalancha"]').click();

    // De vuelta a Avalancha: debe priorizar la de mayor tasa
    const target = page.locator('.estrategia-card__metrica-valor--info');
    await expect(target).toContainText('Crédito caro E2E', { timeout: 3_000 });
  });

  // ── Test 5: extra mensual redibuja la card ───────────────────────────────

  test('ingresar extra mensual actualiza el total de intereses', async ({ page }) => {
    await inyectarDosDeudas(page);
    await irACompromisos(page);

    // Seleccionar Avalancha para ver las métricas (--danger = total intereses)
    await page.locator('[data-action="elegir-estrategia"][data-estrategia="avalancha"]').click();
    await page.waitForSelector('.estrategia-card__metrica-valor--danger', { timeout: 3_000 });

    // Capturar total de intereses sin extra
    const interesesLabel = page.locator('.estrategia-card__metrica-valor--danger').first();
    const sinExtra = await interesesLabel.textContent();

    // El input de extra vive en un <details> colapsado (D.2a): abrirlo primero.
    await page.locator('.estrategia-card__acelerador-summary').click();
    await page.waitForSelector('#estrategia-extra', { state: 'visible', timeout: 3_000 });

    // Ingresar $500 000 de extra: el input dispara cambiar-extra-estrategia
    const inputExtra = page.locator('#estrategia-extra');
    await inputExtra.fill('500000');
    await inputExtra.blur();

    // La card se redibuja: con extra, los intereses totales deben bajar
    const conExtra = await interesesLabel.textContent();
    expect(conExtra).not.toBe(sinExtra);
  });

  // ── Test 6: intereses totales se muestran ───────────────────────────────

  test('la card muestra el total de intereses en formato pesos', async ({ page }) => {
    await inyectarDosDeudas(page);
    await irACompromisos(page);

    // Seleccionar Avalancha para que aparezca .estrategia-card__metrica-valor--danger
    await page.locator('[data-action="elegir-estrategia"][data-estrategia="avalancha"]').click();

    const interesesEl = page.locator('.estrategia-card__metrica-valor--danger').first();
    await expect(interesesEl).toBeVisible({ timeout: 3_000 });
    const texto = await interesesEl.textContent();

    // Debe ser un monto formateado con $ (ej. "$3.500.000")
    expect(texto?.trim()).toMatch(/^\$/);
  });

  // ── Test 7: 1 deuda → hint (no card completa) ────────────────────────────

  test('con 1 deuda válida muestra el mensaje de una sola deuda (sin selector de estrategia)', async ({ page }) => {
    await inyectarUnaDeuda(page);
    await irACompromisos(page);

    // Con 1 deuda: se renderiza .estrategia-card__placeholder en lugar del par de pick cards
    const placeholder = page.locator('#estrategia-pago .estrategia-card__placeholder');
    await expect(placeholder).toBeVisible({ timeout: 5_000 });
    await expect(placeholder).toContainText('una sola deuda');

    // No hay pick cards (se necesitan >= 2 deudas para compararlas)
    await expect(page.locator('#estrategia-pago .estrategia-card-pick')).toHaveCount(0);
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

// ── SUITE: Renegociar la tasa (D.3a) ──────────────────────────────────────────

/**
 * Inyecta un plan inviable: una deuda grande cuya cuota no cubre el interés
 * (crece mes a mes) más una chica. Ninguna estrategia cierra el plan, así que
 * aparece el bloque "Tu plan no se sostiene" con la herramienta de renegociar.
 */
async function inyectarPlanInviable(page) {
  await page.addInitScript(() => {
    const estado = {
      _version: 18,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [], ingresos: [], gastos: [], metas: [],
      prestamos: [], presupuestos: [], apartados: [], config: {},
      compromisos: [
        {
          id: 'reneg-a', descripcion: 'Tarjeta cara E2E',
          monto: 50000, frecuencia: 'Mensual', diaPago: 5,
          tipo: 'deuda-entidad', activo: true,
          saldoTotal: 10000000, cuotaMensual: 50000,
          tasa: 0.30, tasaUnidad: 'EA', categoria: null,
        },
        {
          id: 'reneg-b', descripcion: 'Préstamo chico E2E',
          monto: 100000, frecuencia: 'Mensual', diaPago: 15,
          tipo: 'deuda-personal', activo: true,
          saldoTotal: 500000, cuotaMensual: 100000,
          tasa: 0.10, tasaUnidad: 'mensual', categoria: null,
        },
      ],
    };
    localStorage.setItem('fk_v1', JSON.stringify(estado));
  });
}

test.describe('Renegociar la tasa (D.3a)', () => {

  test('la herramienta aparece en el bloque inviable y compara en vivo', async ({ page }) => {
    await inyectarPlanInviable(page);
    await irACompromisos(page);

    const tool = page.locator('.estrategia-card__remedio--renegociar');
    await expect(tool).toBeVisible({ timeout: 5_000 });
    await expect(tool).toContainText('Renegociar la tasa');

    // Sin tasa nueva, el botón Aplicar está deshabilitado.
    const aplicar = page.locator('[data-action="aplicar-renegociacion"]');
    await expect(aplicar).toBeDisabled();

    // Escribir una tasa baja vuelve viable la deuda: la comparación se actualiza
    // y el botón se habilita.
    await page.locator('#renegociar-tasa').fill('2');
    await expect(page.locator('.estrategia-card__renegociar-comparativa')).toContainText('saldas', { timeout: 3_000 });
    await expect(aplicar).toBeEnabled();
  });

  test('aplicar la nueva tasa la escribe en la deuda y vuelve viable el plan', async ({ page }) => {
    await inyectarPlanInviable(page);
    await irACompromisos(page);

    // Una tasa muy baja vuelve pagable la deuda grande → todo el plan viable.
    await page.locator('#renegociar-tasa').fill('1');
    const aplicar = page.locator('[data-action="aplicar-renegociacion"]');
    await expect(aplicar).toBeEnabled({ timeout: 3_000 });
    await aplicar.click();

    // Confirmar en el modal de confirmación.
    await page.locator('[data-role="confirmar"]').click();

    // El plan ya no es inviable: el bloque de alerta desaparece.
    await expect(page.locator('.estrategia-card__alerta')).toHaveCount(0, { timeout: 3_000 });

    // Y la deuda quedó con la nueva tasa (0.01 EA) en localStorage. save() está
    // debounced 200ms, así que se hace polling hasta que el escritura aterrice.
    await expect.poll(async () => page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('fk_v1'));
      const t = s.compromisos.find(c => c.id === 'reneg-a')?.tasa;
      return Math.abs(t - 0.01) < 1e-6;
    }), { timeout: 2_000 }).toBe(true);
  });

});
