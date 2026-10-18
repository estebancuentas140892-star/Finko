/**
 * distribucion-credito-automatico.test.js - BUG-030 (HF.0b) y BUG-032 (HF.0h),
 * ADR 091: un cobro de ingreso aumenta el saldo de las cuentas una sola vez,
 * sin importar cuál de los dos caminos llega primero.
 *
 * Con crédito automático (PA.1b, ADR 052), la hoja "Pagos automáticos" acredita
 * el cobro y lo registra como `IngresoPuntual` con `ingresoId`. "Distribuir mi
 * ingreso" acreditaba ese mismo cobro otra vez al confirmar (BUG-030). Y al
 * revés: si se posponía la hoja y se distribuía, la hoja volvía a ofrecer el
 * cobro en la siguiente apertura (BUG-032). Lo que cubre aquí y no en unit
 * (`montoYaAcreditadoDelCobro`, `cobrosQueAcreditaLaDistribucion` y
 * `pendientesDeCreditoDelMes` tienen sus casos puros): los dos recorridos
 * reales, con recarga de la app y el dinero total exacto.
 *
 * Reloj fijo (`page.clock.setFixedTime`): el cobro y la ventana del arriendo
 * dependen del día, y un test que pasa solo algunos días es el patrón que
 * BUGS.md vigila. Todos los datos son inventados.
 */

import { test, expect } from '@playwright/test';
import { sembrar, sembrarSiVacio, leerEstado } from './helpers/estado.js';

const HOY = new Date('2026-10-15T10:00:00');

const NOMINA  = { id: 'cta-nomina',  nombre: 'Cuenta Nómina',  banco: 'Banco de Bogotá', tipo: 'Ahorros', saldo: 500_000, activa: true };
const AHORROS = { id: 'cta-ahorros', nombre: 'Cuenta Ahorros', banco: 'Nequi',           tipo: 'Ahorros', saldo: 300_000, activa: true };

const salario = (extra = {}) => ({
  id: 'ing-salario', descripcion: 'Salario de prueba', monto: 4_000_000,
  frecuencia: 'Mensual', diaPago: 15, activo: true, cuentaId: 'cta-nomina',
  fechaCreacion: '2026-01-10T15:00:00.000Z', ...extra,
});

// Septiembre ya se cobró: la hoja solo trae el cobro de octubre, uno.
const COBRO_SEPTIEMBRE = {
  id: 'ip-sep', descripcion: 'Salario de prueba', monto: 4_000_000, categoria: null,
  cuentaId: 'cta-nomina', fecha: '2026-09-15', ingresoId: 'ing-salario',
};

// Necesidad dentro de la ventana del cobro (15 oct a 14 nov): marcada por defecto.
const ARRIENDO = {
  id: 'cf-arriendo', descripcion: 'Arriendo de prueba', tipo: 'fijo',
  frecuencia: 'Mensual', diaPago: 20, monto: 1_200_000, activo: true, categoria: null,
};

function estado({
  cuentas = [NOMINA], ingreso = salario({ creditoAutomatico: true }), ingresos = [ingreso],
  puntuales = [COBRO_SEPTIEMBRE], config = {},
} = {}) {
  return {
    perfil: { nombre: 'Prueba', smmlv: 1750905 },
    onboarded: true,
    cuentas,
    ingresos,
    ingresosPuntuales: puntuales,
    compromisos: [ARRIENDO],
    gastos: [],
    metas: [],
    // Sin fondo ni metas no hay destino para el remanente, así que el asistente
    // no pregunta por él (MC.13e-2f-2) y "Distribuir" queda habilitado.
    ahorro: { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 },
    config,
  };
}

async function abrir(page, st) {
  await page.clock.setFixedTime(HOY);
  await sembrar(page, st);
  await page.goto('/#tesoreria');
}

/**
 * Como `abrir`, pero la siembra no pisa lo que la app guardó: los tests que
 * recargan afirman justo sobre lo persistido.
 */
async function abrirPersistente(page, st, hoy = HOY) {
  await page.clock.setFixedTime(hoy);
  await sembrarSiVacio(page, st);
  await page.goto('/#tesoreria');
}

/** Cierra y vuelve a abrir la app, como quien la reabre otro día. */
async function reabrir(page, hoy = HOY) {
  await page.clock.setFixedTime(hoy);
  await page.reload();
  await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
  // La hoja se evalúa en el arranque, detrás de los gates (ADR 052 D1).
  await page.waitForTimeout(300);
}

/** Pulsa "Ahora no" en la hoja: posponer no escribe nada. */
async function posponerHojaAutomaticos(page) {
  await page.waitForSelector('#modal-automaticos[data-open]', { timeout: 10_000 });
  await page.locator('#modal-automaticos').getByRole('button', { name: 'Ahora no' }).click();
  await page.waitForSelector('#modal-automaticos:not([data-open])', { timeout: 5_000 });
}

/** Lo que ofrece la hoja abierta, una entrada por fila: "nombre +$monto". */
async function filasHoja(page) {
  await page.waitForSelector('#modal-automaticos[data-open]', { timeout: 10_000 });
  const filas = page.locator('#modal-automaticos .lote-row');
  const out = [];
  for (let i = 0; i < await filas.count(); i++) {
    const nombre = await filas.nth(i).locator('.lote-row__name').textContent();
    const monto  = await filas.nth(i).locator('.lote-row__amount').textContent();
    out.push(`${nombre.trim()} ${monto.trim()}`);
  }
  return out;
}

/** El dinero que existe: la suma de los saldos de todas las cuentas. */
const dineroTotal = async (page) =>
  ((await leerEstado(page)).cuentas ?? []).reduce((s, c) => s + (c.saldo ?? 0), 0);

/** Confirma la hoja de automáticos, que al abrir trae el cobro de octubre. */
async function confirmarHojaAutomaticos(page) {
  await page.waitForSelector('#modal-automaticos[data-open]', { timeout: 10_000 });
  const hoja = page.locator('#modal-automaticos');
  await expect(hoja.locator('.lote-row')).toHaveCount(1);
  await expect(hoja.locator('.lote-row__amount').first()).toHaveText('+$4.000.000');
  await hoja.locator('[data-action="agenda-confirmar-automaticos"]').click();
  await page.waitForSelector('#modal-automaticos:not([data-open])', { timeout: 5_000 });
}

const saldoDe = async (page, id) => (await leerEstado(page)).cuentas.find(c => c.id === id)?.saldo;

async function abrirAsistente(page) {
  await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
  await page.click('[data-action="toggle-distribuir-ingreso"]');
  await expect(page.locator('#distribuir-ingreso-panel')).toBeVisible({ timeout: 5_000 });
}

async function irAlUltimoPaso(page) {
  const siguiente = page.locator('[data-action="distribuir-paso-siguiente"]');
  for (let i = 0; i < 5 && await siguiente.isVisible(); i++) await siguiente.click();
}

async function confirmarDistribucion(page) {
  await irAlUltimoPaso(page);
  await page.click('[data-action="confirmar-distribucion"]');
  await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });
  await page.waitForTimeout(400); // save() debounced (ADN #5)
}

test.describe('BUG-030 - un cobro de ingreso se acredita una sola vez', () => {

  test('crédito automático confirmado + Distribuir: un solo crédito', async ({ page }) => {
    await abrir(page, estado());
    await confirmarHojaAutomaticos(page);
    await expect.poll(() => saldoDe(page, 'cta-nomina'), { timeout: 5_000 }).toBe(4_500_000);

    await abrirAsistente(page);
    await confirmarDistribucion(page);

    const st = await leerEstado(page);
    // 500.000 + 4.000.000 del crédito automático - 1.200.000 del arriendo.
    // Con el bug: 4.500.000 + 4.000.000 otra vez - 1.200.000 = 7.300.000.
    expect(st.cuentas.find(c => c.id === 'cta-nomina').saldo).toBe(3_300_000);
    expect(st.gastos.find(g => g.compromisoId === 'cf-arriendo')?.monto).toBe(1_200_000);
    // El cobro de octubre quedó registrado una vez, por la hoja.
    const octubre = st.ingresosPuntuales.filter(ip => ip.ingresoId === 'ing-salario' && ip.fecha.startsWith('2026-10'));
    expect(octubre).toHaveLength(1);
  });

  test('sin crédito automático, Distribuir sigue acreditando el cobro', async ({ page }) => {
    await abrir(page, estado({ ingreso: salario() }));
    await expect(page.locator('#modal-automaticos[data-open]')).toHaveCount(0);

    await abrirAsistente(page);
    await confirmarDistribucion(page);

    // 500.000 + 4.000.000 que acredita el asistente - 1.200.000 del arriendo.
    expect(await saldoDe(page, 'cta-nomina')).toBe(3_300_000);
  });

  test('las transferencias del asistente cuadran y el total es el dinero que existe', async ({ page }) => {
    await abrir(page, estado({ cuentas: [NOMINA, AHORROS], config: { presetDistribucion: '50-30-20' } }));
    await confirmarHojaAutomaticos(page);
    await expect.poll(() => saldoDe(page, 'cta-nomina'), { timeout: 5_000 }).toBe(4_500_000);

    await abrirAsistente(page);
    const siguiente = page.locator('[data-action="distribuir-paso-siguiente"]');
    const destino = page.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="cta-ahorros"]');
    for (let i = 0; i < 5 && !(await destino.isVisible()); i++) await siguiente.click();
    const fila = page.locator('.distribuir__fila').filter({ has: destino });
    await fila.locator('[data-dist-destino-toggle]').check();
    await destino.fill('500000');
    await confirmarDistribucion(page);

    const st = await leerEstado(page);
    const nomina  = st.cuentas.find(c => c.id === 'cta-nomina').saldo;
    const ahorros = st.cuentas.find(c => c.id === 'cta-ahorros').saldo;
    expect(nomina).toBe(2_800_000);   // 4.500.000 - 1.200.000 - 500.000 transferidos
    expect(ahorros).toBe(800_000);    // 300.000 + 500.000
    // Dinero que existe: 800.000 de partida + 4.000.000 de un solo cobro - 1.200.000 pagados.
    expect(nomina + ahorros).toBe(3_600_000);
  });
});

// Honorarios: el mismo cobro mensual del salario (misma frecuencia principal),
// pero con otro día. Su cobro de septiembre ya entró por la hoja.
const honorarios = (extra = {}) => ({
  id: 'ing-honorarios', descripcion: 'Honorarios de prueba', monto: 1_000_000,
  frecuencia: 'Mensual', diaPago: 25, activo: true, cuentaId: 'cta-nomina',
  creditoAutomatico: true, fechaCreacion: '2026-01-10T15:00:00.000Z', ...extra,
});
const HONORARIOS_SEPTIEMBRE = {
  id: 'ip-hon-sep', descripcion: 'Honorarios de prueba', monto: 1_000_000, categoria: null,
  cuentaId: 'cta-nomina', fecha: '2026-09-25', ingresoId: 'ing-honorarios',
};

test.describe('BUG-032 - Distribuir primero y la hoja después: un solo crédito', () => {

  test('pospuesta la hoja y distribuido el cobro, al reabrir la hoja no lo ofrece', async ({ page }) => {
    await abrirPersistente(page, estado({ cuentas: [NOMINA, AHORROS] }));
    expect(await dineroTotal(page)).toBe(800_000);

    expect(await filasHoja(page)).toEqual(['Salario de prueba +$4.000.000']);
    await posponerHojaAutomaticos(page);
    expect(await dineroTotal(page)).toBe(800_000);

    await abrirAsistente(page);
    await confirmarDistribucion(page);
    // 800.000 de partida + 4.000.000 de un solo cobro - 1.200.000 del arriendo.
    await expect.poll(() => dineroTotal(page), { timeout: 5_000 }).toBe(3_600_000);
    expect(await saldoDe(page, 'cta-nomina')).toBe(3_300_000);

    await reabrir(page);
    // Con el bug, la hoja vuelve a ofrecer "+$4.000.000" y confirmarla deja
    // 7.600.000: el mismo cobro contado dos veces.
    await expect(page.locator('#modal-automaticos[data-open]')).toHaveCount(0);
    expect(await dineroTotal(page)).toBe(3_600_000);
    // HF.0h no adelanta HF.1d: Distribuir sigue sin escribir `IngresoPuntual`.
    const st = await leerEstado(page);
    expect(st.ingresosPuntuales.filter(ip => ip.fecha.startsWith('2026-10'))).toHaveLength(0);
  });

  test('"Ahora no" no marca nada: al reabrir, la hoja vuelve a ofrecer el cobro', async ({ page }) => {
    await abrirPersistente(page, estado());
    await posponerHojaAutomaticos(page);
    await reabrir(page);

    expect(await filasHoja(page)).toEqual(['Salario de prueba +$4.000.000']);
    expect(await dineroTotal(page)).toBe(500_000);
  });

  test('deshacer la distribución devuelve el cobro a la hoja', async ({ page }) => {
    await abrirPersistente(page, estado({ cuentas: [NOMINA, AHORROS] }));
    await posponerHojaAutomaticos(page);
    await abrirAsistente(page);
    await confirmarDistribucion(page);
    await expect.poll(() => dineroTotal(page), { timeout: 5_000 }).toBe(3_600_000);

    await page.click('[data-action="deshacer-distribucion"]');
    await expect.poll(() => dineroTotal(page), { timeout: 5_000 }).toBe(800_000);

    // El dinero del cobro salió de la cuenta, así que el cobro vuelve a estar
    // pendiente: si la guarda sobreviviera al deshacer, se perdería.
    await reabrir(page);
    expect(await filasHoja(page)).toEqual(['Salario de prueba +$4.000.000']);
  });

  test('otro ingreso y otro periodo siguen en la hoja: solo se oculta lo que Distribuir acreditó', async ({ page }) => {
    await abrirPersistente(page, estado({
      cuentas:   [NOMINA, AHORROS],
      ingresos:  [salario({ creditoAutomatico: true }), honorarios()],
      puntuales: [COBRO_SEPTIEMBRE, HONORARIOS_SEPTIEMBRE],
    }));
    expect(await filasHoja(page)).toEqual(['Salario de prueba +$4.000.000']);
    await posponerHojaAutomaticos(page);

    await abrirAsistente(page);
    await confirmarDistribucion(page);
    // Los honorarios de septiembre ya estaban en la cuenta (HF.0b): entra solo
    // el salario. 800.000 + 4.000.000 - 1.200.000.
    await expect.poll(() => dineroTotal(page), { timeout: 5_000 }).toBe(3_600_000);

    // Día 26: ya cayeron los honorarios de octubre, que nadie acreditó.
    await reabrir(page, new Date('2026-10-26T10:00:00'));
    expect(await filasHoja(page)).toEqual(['Honorarios de prueba +$1.000.000']);
    await page.locator('#modal-automaticos [data-action="agenda-confirmar-automaticos"]').click();
    await page.waitForSelector('#modal-automaticos:not([data-open])', { timeout: 5_000 });
    await expect.poll(() => dineroTotal(page), { timeout: 5_000 }).toBe(4_600_000);

    // Nada más pendiente: cada cobro aumentó el dinero una vez.
    await reabrir(page, new Date('2026-10-26T10:00:00'));
    await expect(page.locator('#modal-automaticos[data-open]')).toHaveCount(0);
    expect(await dineroTotal(page)).toBe(4_600_000);
  });

  test('salario de noviembre: distribuir octubre no oculta el cobro siguiente', async ({ page }) => {
    await abrirPersistente(page, estado({ cuentas: [NOMINA, AHORROS] }));
    await posponerHojaAutomaticos(page);
    await abrirAsistente(page);
    await confirmarDistribucion(page);
    await expect.poll(() => dineroTotal(page), { timeout: 5_000 }).toBe(3_600_000);

    await reabrir(page, new Date('2026-11-16T10:00:00'));
    expect(await filasHoja(page)).toEqual(['Salario de prueba +$4.000.000']);
  });
});
