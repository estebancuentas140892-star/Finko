/**
 * distribucion-remanente.test.js - MC.13e-2f-2 (punto 18 del brief): lo que
 * queda sin asignar al final del asistente "Distribuir mi ingreso" deja de ser
 * informativo y exige una decision explicita antes de confirmar.
 *
 * Lo que cubre aqui y no en unit: el cableado completo, que es donde vive el
 * riesgo. Que la decision sea obligatoria y sin preseleccion, que mandar el
 * remanente a ahorro reuse la fila del Paso 2 (sin ruta de apply nueva) y que
 * la pregunta no aparezca cuando no hay ningun destino al que mandarlo.
 */

import { test, expect } from '@playwright/test';

async function seed(page, estado) {
  await page.addInitScript((data) => {
    localStorage.setItem('fk_v1', JSON.stringify(data));
  }, { perfil: { nombre: 'Ana', smmlv: 1750905 }, onboarded: true, ...estado });
  await page.goto('/#tesoreria');
  await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
}

// Ingreso mensual de 3.000.000 con preset 50-30-20 y sin Necesidades: el fondo
// arranca con los 600.000 del presupuesto de ahorro y quedan 2.400.000 sin
// asignar, que es justo lo que esta rebanada obliga a decidir.
const ESTADO_BASE = {
  ingresos: [
    { id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true },
  ],
  cuentas: [
    { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
  ],
  config: { presetDistribucion: '50-30-20' },
  ahorro: {
    fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 },
    aportes: [], compromisoMensual: 0,
  },
};

async function abrirAsistente(page) {
  await page.click('[data-action="toggle-distribuir-ingreso"]');
  await expect(page.locator('#distribuir-ingreso-panel')).toBeVisible({ timeout: 5_000 });
}

/** Avanza hasta el ultimo paso, donde viven el bloque del remanente y "Distribuir". */
async function irAlUltimoPaso(page) {
  const siguiente = page.locator('[data-action="distribuir-paso-siguiente"]');
  for (let i = 0; i < 5 && await siguiente.isVisible(); i++) await siguiente.click();
}

test.describe('MC.13e-2f-2 - decision explicita del remanente', () => {

  test('sin decidir no se puede distribuir; "dejarlo en mi cuenta" desbloquea', async ({ page }) => {
    await seed(page, ESTADO_BASE);
    await abrirAsistente(page);
    await irAlUltimoPaso(page);

    const bloque = page.locator('#distribuir-remanente');
    await expect(bloque).toBeVisible();
    await expect(bloque).toContainText('2.400.000');

    // Sin preseleccion: la respuesta es del usuario, no de Finko.
    await expect(page.locator('[data-dist-remanente]:checked')).toHaveCount(0);
    const confirmar = page.locator('[data-action="confirmar-distribucion"]');
    await expect(confirmar).toBeDisabled();

    await page.check('[data-dist-remanente][value="cuenta"]');
    await expect(confirmar).toBeEnabled();
    // Decidir dejarlo no mueve nada: el remanente sigue siendo el mismo.
    await expect(bloque).toContainText('2.400.000');
  });

  test('mandarlo al ahorro suma el remanente a la fila del Paso 2 y lo deja en cero', async ({ page }) => {
    await seed(page, ESTADO_BASE);
    await abrirAsistente(page);
    await irAlUltimoPaso(page);

    const fondo = page.locator('.distribuir__monto[data-dist-tipo="fondo"]');
    await page.check('[data-dist-remanente][value="ahorro"]');

    // Reusa el Paso 2: la fila queda prellenada y a la vista para ajustarla,
    // sin ruta de apply nueva.
    await expect(fondo).toBeVisible();
    await expect(fondo).toHaveValue('3000000'); // 600.000 del split + 2.400.000 del remanente
    await expect(page.locator('#distribuir-resumen')).toContainText('Queda disponible en tu cuenta: $0');

    // Ya no queda nada sin asignar: la pregunta desaparece.
    await expect(page.locator('#distribuir-remanente')).toBeHidden();
  });

  test('con fondo y meta, la pregunta ofrece las tres opciones', async ({ page }) => {
    const futura = new Date();
    futura.setMonth(futura.getMonth() + 6);
    await seed(page, {
      ...ESTADO_BASE,
      metas: [{
        id: 'm1', nombre: 'Viaje', montoObjetivo: 1_200_000, montoActual: 0,
        fechaLimite: futura.toISOString().slice(0, 10), completada: false,
      }],
    });
    await abrirAsistente(page);
    await irAlUltimoPaso(page);

    await expect(page.locator('[data-dist-remanente]')).toHaveCount(3);

    await page.check('[data-dist-remanente][value="meta"]');
    await expect(page.locator('.distribuir__monto[data-dist-tipo="meta"][data-dist-id="m1"]')).toBeFocused();
    await expect(page.locator('#distribuir-resumen')).toContainText('Queda disponible en tu cuenta: $0');
  });

  test('sin ningun destino de ahorro ni meta, no hay pregunta que hacer', async ({ page }) => {
    await seed(page, {
      ...ESTADO_BASE,
      ahorro: { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 },
      compromisos: [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ],
    });
    await abrirAsistente(page);
    await irAlUltimoPaso(page);

    // Una pregunta con una sola respuesta posible seria friccion, no decision.
    await expect(page.locator('#distribuir-remanente')).toHaveCount(0);
    await expect(page.locator('[data-action="confirmar-distribucion"]')).toBeEnabled();
  });

  test('confirmar tras elegir ahorro registra el aporte y no descuenta la cuenta', async ({ page }) => {
    await seed(page, ESTADO_BASE);
    await abrirAsistente(page);
    await irAlUltimoPaso(page);

    await page.check('[data-dist-remanente][value="ahorro"]');
    await irAlUltimoPaso(page); // el prellenado devolvio al Paso 2
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.waitForTimeout(400); // save() debounced (ADN #5)
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));

    const aportado = (st.ahorro?.aportes ?? []).reduce((s, a) => s + a.monto, 0);
    expect(aportado).toBe(3_000_000);
    // El aporte al fondo no sale de la cuenta (ADR 009): solo entra el ingreso.
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(4_000_000);
  });
});
