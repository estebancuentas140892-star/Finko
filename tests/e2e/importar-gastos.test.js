/**
 * importar-gastos.test.js - BUG-029 (HF.0c, ADR 091 P4): el importador CSV de
 * gastos no crea dinero.
 *
 * Un CSV restaura historia que el saldo tecleado de cada cuenta ya refleja.
 * Por eso el gasto importado conserva su cuenta como dato, pero importarlo,
 * editarlo o borrarlo no toca el saldo (P4). Antes, importar no descontaba y
 * borrar reembolsaba: cada importación borrada creaba dinero. Y el CSV que
 * exporta Finko no se podía volver a importar (descripción vacía desde TX.9a).
 *
 * Lo que cubre aquí y no en unit (`normalizarFila`, `hashGasto`,
 * `deltasPorEdicionDeGasto` tienen sus casos puros): el recorrido real por
 * Ajustes, Gastos y Mis cuentas, con recarga y el dinero total exacto. Que un
 * gasto manual siga devolviendo su monto al borrarlo ya lo cubre smoke.test.js
 * ("borrar desde el ledger devuelve el monto a la cuenta").
 *
 * Reloj fijo: la lista de Gastos muestra el mes en curso. Datos inventados.
 */

import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { sembrarSiVacio, leerEstado } from './helpers/estado.js';

const HOY = new Date('2026-10-17T10:00:00');

const NOMINA  = { id: 'cta-nomina',  nombre: 'Cuenta Nómina',  banco: 'Banco de Bogotá', tipo: 'Ahorros', saldo: 500_000, activa: true };
const AHORROS = { id: 'cta-ahorros', nombre: 'Cuenta Ahorros', banco: 'Nequi',           tipo: 'Ahorros', saldo: 300_000, activa: true };

const CSV_EXTRACTO = [
  'fecha,monto,descripcion,categoria,cuenta,nota',
  '2026-10-05,120000,Mercado de prueba,Mercado,Cuenta Nómina,',
  '2026-10-08,45000,Bus de prueba,Transporte,Cuenta Ahorros,pasaje',
].join('\n');

function estado(extra = {}) {
  return {
    perfil: { nombre: 'Prueba', smmlv: 1750905 },
    onboarded: true,
    cuentas: [NOMINA, AHORROS],
    ingresos: [], ingresosPuntuales: [], compromisos: [], metas: [],
    gastos: [],
    config: {},
    ...extra,
  };
}

async function abrir(page, st, hash = '#config') {
  await page.clock.setFixedTime(HOY);
  await sembrarSiVacio(page, st);
  await page.goto(`/${hash}`);
}

/** El dinero que existe: la suma de los saldos de todas las cuentas. */
const dineroTotal = async (page) =>
  ((await leerEstado(page)).cuentas ?? []).reduce((s, c) => s + (c.saldo ?? 0), 0);

/** Abre el importador desde Ajustes, carga el CSV y deja la vista previa. */
async function cargarCSV(page, texto) {
  await page.goto('/#config');
  await page.click('[data-action="abrir-import"]');
  await page.waitForSelector('#modal-import[data-open]', { timeout: 5_000 });
  await page.locator('[data-action="seleccionar-csv"]').setInputFiles({
    name: 'gastos-prueba.csv', mimeType: 'text/csv', buffer: Buffer.from(texto, 'utf8'),
  });
  await expect(page.locator('#modal-import [data-action="confirmar-import"]')).toBeVisible({ timeout: 5_000 });
}

async function importar(page, texto, esperados) {
  await cargarCSV(page, texto);
  await page.click('#modal-import [data-action="confirmar-import"]');
  await page.waitForSelector('#modal-import:not([data-open])', { state: 'attached', timeout: 5_000 });
  await expect.poll(async () => (await leerEstado(page)).gastos?.length ?? 0, { timeout: 5_000 }).toBe(esperados);
}

async function reabrir(page, hash = '#tesoreria') {
  await page.reload();
  await page.goto(`/${hash}`);
  await page.waitForSelector(`#sec-${hash.slice(1)}.active`, { timeout: 10_000 });
}

test.describe('BUG-029 - el gasto importado no toca el saldo', () => {

  test('importar, editar y borrar un gasto importado deja el dinero igual, también al recargar', async ({ page }) => {
    await abrir(page, estado());
    expect(await dineroTotal(page)).toBe(800_000);

    await importar(page, CSV_EXTRACTO, 2);
    let st = await leerEstado(page);
    const mercado    = st.gastos.find(g => g.descripcion === 'Mercado de prueba');
    const transporte = st.gastos.find(g => g.categoria === 'Transporte');
    // La cuenta se conserva como dato (P4).
    expect(mercado).toMatchObject({ cuentaId: 'cta-nomina', monto: 120_000 });
    expect(transporte).toMatchObject({ cuentaId: 'cta-ahorros', monto: 45_000, nota: 'pasaje' });
    expect(await dineroTotal(page)).toBe(800_000);

    // Editar el monto: antes descontaba la diferencia (770.000).
    await page.goto('/#gast');
    await page.click(`[data-action="editar-gasto"][data-id="${mercado.id}"]`);
    await page.waitForSelector('#modal-gasto[data-open]');
    const form = page.locator('#modal-gasto-body form');
    await form.locator('[name="monto"]').fill('150000');
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector('#modal-gasto:not([data-open])', { state: 'attached', timeout: 5_000 });
    await expect.poll(async () => (await leerEstado(page)).gastos.find(g => g.id === mercado.id)?.monto, { timeout: 5_000 }).toBe(150_000);
    expect(await dineroTotal(page)).toBe(800_000);

    // Borrar: antes devolvía 45.000 a Cuenta Ahorros (845.000, dinero creado).
    await page.click(`[data-action="eliminar-gasto"][data-id="${transporte.id}"]`);
    await expect(page.locator('.modal--confirm')).not.toContainText('devuelve');
    await page.locator('[data-role="confirmar"]').click();
    await expect.poll(async () => (await leerEstado(page)).gastos.length, { timeout: 5_000 }).toBe(1);
    expect(await dineroTotal(page)).toBe(800_000);

    await reabrir(page);
    st = await leerEstado(page);
    expect(st.cuentas.map(c => c.saldo)).toEqual([500_000, 300_000]);
    // El gasto queda marcado sin efecto en el saldo, y la marca sobrevive a editar y recargar.
    expect(st.gastos[0]).toMatchObject({ id: mercado.id, monto: 150_000, cuentaId: 'cta-nomina', sinEfectoSaldo: true });
  });

  test('importar el mismo CSV dos veces no duplica gastos ni dinero', async ({ page }) => {
    await abrir(page, estado());
    await importar(page, CSV_EXTRACTO, 2);

    await cargarCSV(page, CSV_EXTRACTO);
    await expect(page.locator('#modal-import [data-action="confirmar-import"]')).toBeDisabled();
    await expect(page.locator('#modal-import .import-row--dup')).toHaveCount(2);
    await page.click('#modal-import [data-action="cancelar-import"]');

    const st = await leerEstado(page);
    expect(st.gastos).toHaveLength(2);
    expect(await dineroTotal(page)).toBe(800_000);
  });

  test('el CSV que exporta Finko se vuelve a importar igual, sin tocar el dinero', async ({ page }) => {
    // Gastos como los deja el formulario desde TX.9a: sin descripción. Dos
    // comparten fecha y monto y solo los distingue la categoría.
    const gastos = [
      { id: 'g-1', descripcion: '', monto: 30_000, categoria: 'Café',       fecha: '2026-10-03', cuentaId: 'cta-nomina',  nota: '' },
      { id: 'g-2', descripcion: '', monto: 30_000, categoria: 'Transporte', fecha: '2026-10-03', cuentaId: 'cta-ahorros', nota: 'taxi de prueba' },
      { id: 'g-3', descripcion: 'Farmacia de prueba', monto: 52_500, categoria: 'Salud', fecha: '2026-10-10', nota: '' },
    ];
    await abrir(page, estado({ gastos }));

    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-action="exportar-gastos-csv"]'),
    ]);
    const exportado = readFileSync(await descarga.path(), 'utf8');

    // En la misma app todo es duplicado: nada nuevo.
    await cargarCSV(page, exportado);
    await expect(page.locator('#modal-import .import-row--dup')).toHaveCount(3);
    await expect(page.locator('#modal-import [data-action="confirmar-import"]')).toBeDisabled();
    await page.click('#modal-import [data-action="cancelar-import"]');

    // En una app sin gastos (otro dispositivo, mismas cuentas) entra completo.
    await page.goto('/manifest.json');
    await page.evaluate(([clave, st]) => localStorage.setItem(clave, JSON.stringify(st)),
      ['fk_v1', estado()]);
    await page.goto('/#config');
    await importar(page, exportado, 3);

    const st = await leerEstado(page);
    const resumen = st.gastos
      .map(g => ({ fecha: g.fecha, monto: g.monto, categoria: g.categoria, descripcion: g.descripcion, cuentaId: g.cuentaId, nota: g.nota, sinEfectoSaldo: g.sinEfectoSaldo }))
      .sort((a, b) => a.categoria.localeCompare(b.categoria));
    expect(resumen).toEqual([
      { fecha: '2026-10-03', monto: 30_000, categoria: 'Café',       descripcion: '', cuentaId: 'cta-nomina',  nota: '',               sinEfectoSaldo: true },
      { fecha: '2026-10-10', monto: 52_500, categoria: 'Salud',      descripcion: 'Farmacia de prueba', cuentaId: null, nota: '', sinEfectoSaldo: true },
      { fecha: '2026-10-03', monto: 30_000, categoria: 'Transporte', descripcion: '', cuentaId: 'cta-ahorros', nota: 'taxi de prueba', sinEfectoSaldo: true },
    ]);
    expect(await dineroTotal(page)).toBe(800_000);
  });
});
