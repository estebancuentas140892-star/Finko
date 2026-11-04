/**
 * distribucion-mes-siguiente.test.js - BUG-036: Distribuir paga lo que vence
 * el mes siguiente fechado en ese mes, no hoy.
 *
 * Con el salario el 25, la ventana del cobro llega al 24 del mes siguiente, así
 * que Distribuir propone el arriendo del 3. Antes lo pagaba con la fecha de
 * hoy: ese mes quedaba sin pagar en el Calendario y la hoja de automáticos
 * volvía a ofrecer el débito (doble pago si se confirmaba). Lo que cubre aquí
 * y no en unit (`pagosDeNecesidadPorMes` tiene sus casos puros): el recorrido
 * real, con recarga de la app el mes siguiente.
 *
 * Reloj fijo (`page.clock.setFixedTime`): la ventana depende del día. Todos los
 * datos son inventados.
 */

import { test, expect } from '@playwright/test';
import { sembrar, sembrarSiVacio, leerEstado } from './helpers/estado.js';

const HOY = new Date('2026-10-25T10:00:00');

const NOMINA = { id: 'cta-nomina', nombre: 'Cuenta Nómina', banco: 'Banco de Bogotá', tipo: 'Ahorros', saldo: 500_000, activa: true };

const SALARIO = {
  id: 'ing-salario', descripcion: 'Salario de prueba', monto: 4_000_000,
  frecuencia: 'Mensual', diaPago: 25, activo: true, cuentaId: 'cta-nomina',
  fechaCreacion: '2026-01-10T15:00:00.000Z',
};

// Débito automático: si noviembre quedara sin pagar, la hoja lo ofrecería.
// Registrado el 1 de octubre: la hoja no propone lo anterior al alta (HF.0j),
// así que el único mes previo que mira es octubre, ya pagado.
const ARRIENDO = {
  id: 'cf-arriendo', descripcion: 'Arriendo de prueba', tipo: 'fijo', categoria: null,
  frecuencia: 'Mensual', diaPago: 3, monto: 1_200_000, activo: true,
  debitoAutomatico: true, cuentaDebitoId: 'cta-nomina',
  fechaCreacion: '2026-10-01T15:00:00.000Z',
};

// El arriendo de octubre ya se pagó el 3: octubre no debe recibir un segundo pago.
const PAGO_OCTUBRE = {
  id: 'g-oct', descripcion: 'Pago: Arriendo de prueba', monto: 1_200_000, categoria: 'Gastos fijos',
  fecha: '2026-10-03', cuentaId: 'cta-nomina', nota: '', compromisoId: 'cf-arriendo',
};

const estado = () => ({
  perfil: { nombre: 'Prueba', smmlv: 1750905 },
  onboarded: true,
  cuentas: [NOMINA],
  ingresos: [SALARIO],
  ingresosPuntuales: [],
  compromisos: [ARRIENDO],
  gastos: [PAGO_OCTUBRE],
  metas: [],
  ahorro: { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 },
  config: {},
});

async function confirmarDistribucion(page) {
  await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
  await page.click('[data-action="toggle-distribuir-ingreso"]');
  await expect(page.locator('#distribuir-ingreso-panel')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('[data-nec-id="cf-arriendo"]')).toBeChecked();
  const siguiente = page.locator('[data-action="distribuir-paso-siguiente"]');
  for (let i = 0; i < 5 && await siguiente.isVisible(); i++) await siguiente.click();
  await page.click('[data-action="confirmar-distribucion"]');
  await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });
  await page.waitForTimeout(400); // save() debounced (ADN #5)
}

test.describe('BUG-036 - lo del mes siguiente se paga en su mes', () => {

  test('el arriendo del 3 de noviembre queda fechado el 3 de noviembre', async ({ page }) => {
    await page.clock.setFixedTime(HOY);
    await sembrar(page, estado());
    await page.goto('/#tesoreria');
    await confirmarDistribucion(page);

    const st = await leerEstado(page);
    const pagos = st.gastos.filter(g => g.compromisoId === 'cf-arriendo').map(g => g.fecha).sort();
    // Con el bug: ['2026-10-03', '2026-10-25'] (octubre pagado dos veces, noviembre en cero).
    expect(pagos).toEqual(['2026-10-03', '2026-11-03']);
    // El dinero sale hoy: 500.000 + 4.000.000 del cobro - 1.200.000 del arriendo.
    expect(st.cuentas.find(c => c.id === 'cta-nomina').saldo).toBe(3_300_000);
  });

  test('en noviembre la hoja de automáticos no vuelve a ofrecer el arriendo', async ({ page }) => {
    await page.clock.setFixedTime(HOY);
    // Al recargar, la siembra no pisa lo que la app guardó.
    await sembrarSiVacio(page, estado());
    await page.goto('/#tesoreria');
    await confirmarDistribucion(page);

    await page.clock.setFixedTime(new Date('2026-11-05T10:00:00'));
    await page.reload();
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.waitForTimeout(500); // la hoja se evalúa en el arranque (ADR 052 D1)
    await expect(page.locator('#modal-automaticos[data-open]')).toHaveCount(0);

    const st = await leerEstado(page);
    expect(st.gastos.filter(g => g.compromisoId === 'cf-arriendo')).toHaveLength(2);
    expect(st.cuentas.find(c => c.id === 'cta-nomina').saldo).toBe(3_300_000);
  });
});
