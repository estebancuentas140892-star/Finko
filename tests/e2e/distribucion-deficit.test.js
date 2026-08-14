/**
 * distribucion-deficit.test.js - MC.13e-2e (punto 14 del brief): lo marcado en
 * el asistente "Distribuir mi ingreso" supera el monto a distribuir, y en vez
 * de obligar a recortar destinos, el asistente ofrece completar la diferencia
 * con el saldo de otra cuenta activa.
 *
 * Lo que cubre aquí y no en unit (`planComplementoDeficit` ya tiene sus casos
 * puros): el cableado completo, que es donde vive el riesgo. Que la oferta sea
 * explícita (sin marcar la casilla no se puede confirmar), que el complemento
 * salga de la cuenta correcta y que los dos saldos queden exactos.
 */

import { test, expect } from '@playwright/test';
import { sembrar, leerEstado } from './helpers/estado.js';

async function seed(page, estado) {
  await sembrar(page, { perfil: { nombre: 'Ana', smmlv: 1750905 }, onboarded: true, ...estado });
  await page.goto('/#tesoreria');
  await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
}

// El cobro se data hoy (día de pago = hoy): así la ventana del cobro es el mes
// completo que arranca hoy y contiene exactamente una ocurrencia del arriendo,
// sea cual sea su día. Con un día fijo, la ventana se encoge según la fecha en
// que corra la suite y el checklist queda vacío (mismo defecto de reloj que
// BUG-020).
const DIA_HOY = new Date().getDate();

/** Ingreso mensual + arriendo más caro que el ingreso = déficit garantizado. */
const ESTADO_DEFICIT = {
  ingresos: [
    { id: 'i1', descripcion: 'Salario', monto: 1_000_000, frecuencia: 'Mensual', diaPago: DIA_HOY, activo: true },
  ],
  cuentas: [
    { id: 'c1', nombre: 'Nequi',        banco: 'Nequi',        tipo: 'Ahorros', saldo: 200_000, activa: true },
    { id: 'c2', nombre: 'Bancolombia',  banco: 'Bancolombia',  tipo: 'Ahorros', saldo: 900_000, activa: true },
  ],
  compromisos: [
    { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 1_500_000, activo: true, categoria: null },
  ],
};

async function abrirAsistente(page) {
  await page.click('[data-action="toggle-distribuir-ingreso"]');
  await expect(page.locator('#distribuir-ingreso-panel')).toBeVisible({ timeout: 5_000 });
}

test.describe('MC.13e-2e - completar el déficit con el saldo de otra cuenta', () => {

  test('la oferta es explícita: sin aceptarla no se puede distribuir', async ({ page }) => {
    await seed(page, ESTADO_DEFICIT);
    await abrirAsistente(page);

    // Arriendo (1.500.000) marcado por defecto contra un ingreso de 1.000.000.
    const bloque = page.locator('#distribuir-deficit');
    await expect(bloque).toBeVisible();
    await expect(page.locator('#distribuir-deficit-msg')).toContainText('500.000');

    // Último paso: ahí vive el botón "Distribuir".
    await page.click('[data-action="distribuir-paso-siguiente"]');
    const confirmar = page.locator('[data-action="confirmar-distribucion"]');
    await expect(confirmar).toBeDisabled();

    await page.check('[data-dist-completar-deficit]');
    await expect(confirmar).toBeEnabled();

    // Retirar la aceptación vuelve a bloquear: nada se mueve sin decirlo.
    await page.uncheck('[data-dist-completar-deficit]');
    await expect(confirmar).toBeDisabled();
  });

  test('al confirmar, el complemento sale de la otra cuenta y ninguna queda en negativo', async ({ page }) => {
    await seed(page, ESTADO_DEFICIT);
    await abrirAsistente(page);

    await page.click('[data-action="distribuir-paso-siguiente"]');
    await page.check('[data-dist-completar-deficit]');
    await page.click('[data-action="confirmar-distribucion"]');

    // Dos cuentas activas y ningún `Ingreso.cuentaId` guardado: el asistente
    // pregunta a cuál entra el ingreso (MC.13e-2f-1 solo evita la pregunta
    // cuando ya está guardada).
    await page.click('.cuenta-picker__btn[data-cuenta-id="c1"]');

    await page.waitForTimeout(500); // save() debounced (ADN #5)
    const st = await leerEstado(page);

    // Origen: 200.000 + 1.000.000 de ingreso + 500.000 de complemento - 1.500.000 del arriendo.
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(200_000);
    // La otra cuenta aporta exactamente el déficit, sin pasarse de su saldo.
    expect(st.cuentas.find(c => c.id === 'c2').saldo).toBe(400_000);

    // El pago del arriendo quedó registrado como cualquier otro (R1).
    const gasto = (st.gastos ?? []).find(g => g.compromisoId === 'cf1');
    expect(gasto?.monto).toBe(1_500_000);
  });

  test('si las otras cuentas no alcanzan, no hay oferta que aceptar', async ({ page }) => {
    await seed(page, {
      ...ESTADO_DEFICIT,
      cuentas: [
        { id: 'c1', nombre: 'Nequi',       banco: 'Nequi',       tipo: 'Ahorros', saldo: 200_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo:  50_000, activa: true },
      ],
    });
    await abrirAsistente(page);

    await expect(page.locator('#distribuir-deficit')).toBeVisible();
    await expect(page.locator('#distribuir-deficit-msg')).toContainText('no alcanzan');
    await expect(page.locator('#distribuir-deficit-opcion')).toBeHidden();

    await page.click('[data-action="distribuir-paso-siguiente"]');
    await expect(page.locator('[data-action="confirmar-distribucion"]')).toBeDisabled();
  });

  test('sin déficit el bloque no aparece', async ({ page }) => {
    await seed(page, {
      ...ESTADO_DEFICIT,
      compromisos: [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 400_000, activo: true, categoria: null },
      ],
    });
    await abrirAsistente(page);

    await expect(page.locator('#distribuir-deficit')).toBeHidden();
    await page.click('[data-action="distribuir-paso-siguiente"]');
    await expect(page.locator('[data-action="confirmar-distribucion"]')).toBeEnabled();
  });
});
