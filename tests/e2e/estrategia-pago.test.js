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
    // Titulo actual (D.16b, ADR 036): "¿Cómo salir más rápido?"; el eyebrow
    // "Estrategia de pago" queda arriba de la card, fuera de ella.
    await expect(card).toContainText('¿Cómo salir más rápido?');
    await expect(page.locator('#estrategia-pago .grupo-eyebrow')).toContainText('Estrategia de pago');
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

  test('la palanca "Aumentar la cuota" muestra el impacto del pago extra (D.15d-2)', async ({ page }) => {
    await inyectarDosDeudas(page);
    await irACompromisos(page);

    // La sección de palancas es siempre visible; elegir "Aumentar la cuota".
    await elegirPalanca(page, 'aumentar');
    await page.waitForSelector('#estrategia-extra', { state: 'visible', timeout: 3_000 });

    // Sin extra, no hay resumen de impacto activo (solo la invitación a escribir).
    await expect(page.locator('.estrategia-card__resumen-extra--activo')).toHaveCount(0);

    // Ingresar $500 000 de extra: el resumen de impacto aparece con el ahorro.
    await page.locator('#estrategia-extra').fill('500000');
    const resumen = page.locator('.estrategia-card__resumen-extra--activo');
    await expect(resumen).toBeVisible({ timeout: 3_000 });
    await expect(resumen).toContainText('menos');
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
 * aparece el botón único de alerta (D.7/D.8) que abre el panel de alternativas.
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

/**
 * Elige una palanca en la sección siempre visible (D.15d-2). Ya no hay que abrir
 * un panel: los 3 tiles están a primer plano. Clica el tile y espera a que quede
 * activo (su herramienta se muestra).
 */
async function elegirPalanca(page, palanca) {
  await page.waitForSelector('.estrategia-card__palancas', { timeout: 5_000 });
  await page.locator(`[data-action="elegir-alternativa"][data-alternativa="${palanca}"]`).click();
  await page.waitForSelector(
    `.estrategia-card__selector-opcion--activa[data-alternativa="${palanca}"]`,
    { timeout: 3_000 },
  );
}

// ── SUITE: Panel de alternativas (D.8) ────────────────────────────────────────

test.describe('Plan inviable: alarma (diagnóstico) + palancas siempre visibles (D.15d-2)', () => {

  test('el plan inviable muestra el botón de alerta y las 3 palancas a primer plano', async ({ page }) => {
    await inyectarPlanInviable(page);
    await irACompromisos(page);

    const boton = page.locator('[data-action="abrir-panel-alternativas"]');
    await expect(boton).toBeVisible({ timeout: 5_000 });
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
    // El diagnóstico (danger) arranca cerrado...
    await expect(page.locator('.estrategia-card__alerta')).toHaveCount(0);
    // ...pero la sección de palancas (la solución) es siempre visible, con los 3 tiles.
    await expect(page.locator('.estrategia-card__palancas')).toBeVisible();
    await expect(page.locator('.estrategia-card__selector-opcion')).toHaveCount(3);
  });

  test('activar el botón abre el diagnóstico (el porqué); las palancas siguen visibles', async ({ page }) => {
    await inyectarPlanInviable(page);
    await irACompromisos(page);

    await page.locator('[data-action="abrir-panel-alternativas"]').click();

    await expect(page.locator('[data-action="abrir-panel-alternativas"]')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.estrategia-card__alerta')).toContainText('Por qué tu plan no se sostiene');
    // El selector NO está dentro del diagnóstico: vive en las palancas, siempre visible.
    await expect(page.locator('.estrategia-card__alerta .estrategia-card__selector')).toHaveCount(0);
    await expect(page.locator('.estrategia-card__palancas .estrategia-card__selector-opcion')).toHaveCount(3);
  });

});

test.describe('Renegociar la tasa (D.3a) dentro del panel de alternativas (D.8)', () => {

  test('la herramienta aparece al elegirla en el selector y compara en vivo', async ({ page }) => {
    await inyectarPlanInviable(page);
    await irACompromisos(page);
    await elegirPalanca(page, 'renegociar');

    const tool = page.locator('.estrategia-card__remedio--renegociar');
    await expect(tool).toBeVisible({ timeout: 5_000 });
    await expect(tool).toContainText('Renegociar la tasa');
    // El remedio "Aumentar la cuota" no se muestra a la vez.
    await expect(page.locator('#estrategia-extra')).toHaveCount(0);

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
    await elegirPalanca(page, 'renegociar');

    // Una tasa muy baja vuelve pagable la deuda grande → todo el plan viable.
    await page.locator('#renegociar-tasa').fill('1');
    const aplicar = page.locator('[data-action="aplicar-renegociacion"]');
    await expect(aplicar).toBeEnabled({ timeout: 3_000 });
    await aplicar.click();

    // Confirmar en el modal de confirmación.
    await page.locator('[data-role="confirmar"]').click();

    // El plan ya no es inviable: el botón de alerta y el panel desaparecen.
    await expect(page.locator('[data-action="abrir-panel-alternativas"]')).toHaveCount(0, { timeout: 3_000 });

    // Y la deuda quedó con la nueva tasa (0.01 EA) en localStorage. save() está
    // debounced 200ms, así que se hace polling hasta que el escritura aterrice.
    await expect.poll(async () => page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('fk_v1'));
      const t = s.compromisos.find(c => c.id === 'reneg-a')?.tasa;
      return Math.abs(t - 0.01) < 1e-6;
    }), { timeout: 2_000 }).toBe(true);
  });

});

// ── SUITE: Consolidar deudas (D.3b) ───────────────────────────────────────────

test.describe('Consolidar deudas (D.3b) dentro del panel de alternativas (D.8)', () => {

  test('la herramienta aparece al elegirla en el selector y compara en vivo', async ({ page }) => {
    await inyectarPlanInviable(page);
    await irACompromisos(page);
    await elegirPalanca(page, 'consolidar');

    const tool = page.locator('.estrategia-card__remedio--consolidar');
    await expect(tool).toBeVisible({ timeout: 5_000 });
    await expect(tool).toContainText('Consolidar tus deudas');
    // El remedio "Aumentar la cuota" no se muestra a la vez.
    await expect(page.locator('#estrategia-extra')).toHaveCount(0);

    const aplicar = page.locator('[data-action="aplicar-consolidacion"]');
    await expect(aplicar).toBeDisabled();

    // Un crédito barato (8% EA) con cuota suficiente vuelve viable el plan.
    await page.locator('#consolidar-tasa').fill('8');
    await page.locator('#consolidar-cuota').fill('400000');
    await expect(page.locator('.estrategia-card__consolidar-comparativa')).toContainText('saldas', { timeout: 3_000 });
    await expect(aplicar).toBeEnabled();
  });

  test('consolidar crea el crédito nuevo y archiva las deudas previas', async ({ page }) => {
    await inyectarPlanInviable(page);
    await irACompromisos(page);
    await elegirPalanca(page, 'consolidar');

    await page.locator('#consolidar-tasa').fill('8');
    await page.locator('#consolidar-cuota').fill('400000');
    const aplicar = page.locator('[data-action="aplicar-consolidacion"]');
    await expect(aplicar).toBeEnabled({ timeout: 3_000 });
    await aplicar.click();

    // Confirmar en el modal.
    await page.locator('[data-role="confirmar"]').click();

    // Tras consolidar: las 2 deudas previas quedan archivadas (activo:false) y
    // hay una deuda nueva activa "Crédito de consolidación" con saldo 10.5 M.
    await expect.poll(async () => page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('fk_v1'));
      const activas = s.compromisos.filter(c => c.activo !== false && (c.tipo === 'deuda-entidad' || c.tipo === 'deuda-personal'));
      const previasArchivadas = ['reneg-a', 'reneg-b'].every(id =>
        s.compromisos.find(c => c.id === id)?.activo === false);
      const nueva = s.compromisos.find(c => c.descripcion === 'Crédito de consolidación');
      return {
        activasCount: activas.length,
        previasArchivadas,
        nuevaSaldo: nueva?.saldoTotal,
        nuevaCuota: nueva?.cuotaMensual,
      };
    }), { timeout: 2_000 }).toEqual({
      activasCount: 1,
      previasArchivadas: true,
      nuevaSaldo: 10_500_000,
      nuevaCuota: 400_000,
    });
  });

});

// ── SUITE: BUG-011 (la simulación de extra no reestructura la card) ───────────

test.describe('BUG-011: el extra simulado no reestructura la card ni se aplica solo', () => {

  test('teclear un extra que volvería viable el plan y cambiar de palanca no lo presenta como saneado', async ({ page }) => {
    await inyectarPlanInviable(page);
    await irACompromisos(page);
    await elegirPalanca(page, 'aumentar');

    // Extra grande: la simulación SÍ completaría el plan. Antes del fix, el
    // siguiente re-render leía este valor como estado real y presentaba el plan
    // como saneado.
    await page.locator('#estrategia-extra').fill('500000');

    // Cambiar a "Renegociar la tasa" re-renderiza la card completa.
    await page.locator('[data-action="elegir-alternativa"][data-alternativa="renegociar"]').click();

    // La herramienta elegida se muestra y el plan SIGUE señalado como inviable
    // (el botón de alerta persiste): la simulación no restructuró la card.
    await expect(page.locator('.estrategia-card__remedio--renegociar')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('[data-action="abrir-panel-alternativas"]')).toBeVisible();
    await expect(page.locator('.estrategia-card__acelerador')).toHaveCount(0);

    // Y las cuotas registradas no cambiaron: la simulación nunca se aplicó.
    const cuotas = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('fk_v1'));
      return ['reneg-a', 'reneg-b'].map(id => s.compromisos.find(c => c.id === id)?.cuotaMensual);
    });
    expect(cuotas).toEqual([50_000, 100_000]);
  });

  test('volver a "Aumentar la cuota" conserva el monto simulado y su resumen', async ({ page }) => {
    await inyectarPlanInviable(page);
    await irACompromisos(page);
    await elegirPalanca(page, 'aumentar');

    await page.locator('#estrategia-extra').fill('500000');
    await page.locator('[data-action="elegir-alternativa"][data-alternativa="renegociar"]').click();
    await page.locator('[data-action="elegir-alternativa"][data-alternativa="aumentar"]').click();

    // La simulación sobrevive al ir y volver: monto en el input, resumen de
    // impacto visible y el botón "Aplicar este aumento" habilitado.
    const input = page.locator('#estrategia-extra');
    await expect(input).toBeVisible({ timeout: 3_000 });
    await expect(input).toHaveValue('500000');
    await expect(page.locator('.estrategia-card__resumen-extra--activo')).toBeVisible();
    await expect(page.locator('[data-action="aplicar-aumento-cuota"]')).toBeEnabled();
  });

});

// ── SUITE: Aumentar la cuota (D.9) ────────────────────────────────────────────

test.describe('Aumentar la cuota (D.9) dentro del panel de alternativas', () => {

  test('aplicar el aumento sube la cuotaMensual de la deuda que crece', async ({ page }) => {
    await inyectarPlanInviable(page);
    await irACompromisos(page);
    await elegirPalanca(page, 'aumentar');

    // Sin extra, el botón "Aplicar este aumento" está deshabilitado.
    const aplicar = page.locator('[data-action="aplicar-aumento-cuota"]');
    await expect(aplicar).toBeVisible({ timeout: 5_000 });
    await expect(aplicar).toBeDisabled();

    // Un extra pequeño (no vuelve viable el plan) habilita el botón.
    await page.locator('#estrategia-extra').fill('100000');
    await expect(aplicar).toBeEnabled({ timeout: 3_000 });
    await aplicar.click();

    // Confirmar en el modal.
    await page.locator('[data-role="confirmar"]').click();

    // La deuda que crece (reneg-a, mayor déficit) sube su cuota de 50.000 a
    // 150.000; la chica sana (reneg-b) no se toca. save() está debounced 200ms.
    await expect.poll(async () => page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('fk_v1'));
      const a = s.compromisos.find(c => c.id === 'reneg-a')?.cuotaMensual;
      const b = s.compromisos.find(c => c.id === 'reneg-b')?.cuotaMensual;
      return { a, b };
    }), { timeout: 2_000 }).toEqual({ a: 150_000, b: 100_000 });
  });

});
