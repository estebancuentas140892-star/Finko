/**
 * movimientos-excel.test.js - descargar el mes para Excel (REV.3a).
 *
 * - `filasDelMesParaExcel()`: las columnas, el orden, el mes pedido y que
 *   Entrada menos Salida dé el total que la lista pone junto al mes.
 * - `csvDelMesParaExcel()`: separador `;`, BOM y las celdas que necesitan
 *   comillas.
 * - La vista: cada mes trae su botón de descarga, y la descarga baja lo que
 *   la lista muestra de ese mes.
 *
 * Todos los datos son inventados.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import {
  movimientosCompletos, filasDelMesParaExcel, csvDelMesParaExcel, sumaDeMovimientos, COLUMNAS_EXCEL,
} from '../../modules/dominio/movimientos/logic.js';
import { parsearCSV } from '../../modules/infra/csv.js';
import { renderMovimientosCompletos, setFiltroTexto, limpiarFiltrosMovimientos } from '../../modules/dominio/movimientos/view.js';
import { initMovimientos } from '../../modules/dominio/movimientos/index.js';
import { dispatch } from '../../modules/ui/actions.js';

const CUENTAS = [
  { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 0, activa: true },
  { id: 'c2', nombre: 'Banco; principal', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 0, activa: true },
];

const FUENTES = {
  gastos: [
    { id: 'g1', descripcion: 'Almuerzo', monto: 25_000, categoria: 'Restaurantes', fecha: '2026-11-03', cuentaId: 'c1' },
    { id: 'g2', descripcion: 'Mercado "grande"', monto: 180_000, categoria: 'Mercado', fecha: '2026-11-10', cuentaId: 'c2' },
    { id: 'g3', descripcion: 'Taxi', monto: 15_000, categoria: 'Transporte', fecha: '2026-10-30', cuentaId: 'c1' },
  ],
  ingresosPuntuales: [
    { id: 'ip1', descripcion: 'Venta bici', monto: 400_000, categoria: null, cuentaId: 'c1', fecha: '2026-11-05' },
  ],
  transferencias: [
    { id: 't1', cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: 100_000, fecha: '2026-11-06' },
  ],
};

const movs = () => movimientosCompletos(FUENTES);

describe('filasDelMesParaExcel() (REV.3a)', () => {
  it('solo el mes pedido, de la más vieja a la más reciente, con las seis columnas', () => {
    const filas = filasDelMesParaExcel(movs(), '2026-11', CUENTAS);
    expect(filas.map(r => r.Fecha)).toEqual(['2026-11-03', '2026-11-05', '2026-11-06', '2026-11-10']);
    expect(Object.keys(filas[0])).toEqual(COLUMNAS_EXCEL);
  });

  it('el gasto sale con su categoría y su cuenta; el ingreso entra con su tipo', () => {
    const [almuerzo, venta] = filasDelMesParaExcel(movs(), '2026-11', CUENTAS);
    expect(almuerzo).toEqual({ Fecha: '2026-11-03', 'Descripción': 'Almuerzo', 'Categoría': 'Restaurantes', Cuenta: 'Nequi', Entrada: '', Salida: 25_000 });
    expect(venta).toMatchObject({ 'Categoría': 'Ingreso', Cuenta: 'Nequi', Entrada: 400_000, Salida: '' });
  });

  it('una transferencia no suma: su monto va en la descripción y la cuenta queda vacía', () => {
    const t = filasDelMesParaExcel(movs(), '2026-11', CUENTAS).find(r => r['Categoría'] === 'Transferencia');
    expect(t).toMatchObject({ 'Descripción': 'Nequi → Banco; principal: $100.000', Cuenta: '', Entrada: '', Salida: '' });
  });

  it('Entrada menos Salida es el total que la lista pone junto al mes', () => {
    const filas = filasDelMesParaExcel(movs(), '2026-11', CUENTAS);
    const neto = filas.reduce((s, r) => s + (Number(r.Entrada) || 0) - (Number(r.Salida) || 0), 0);
    const delMes = movs().filter(m => m.fecha.startsWith('2026-11'));
    expect(neto).toBe(sumaDeMovimientos(delMes).neto);
  });

  it('un mes sin movimientos no da filas', () => {
    expect(filasDelMesParaExcel(movs(), '2026-09', CUENTAS)).toEqual([]);
    expect(filasDelMesParaExcel(undefined, '2026-09')).toEqual([]);
  });
});

describe('csvDelMesParaExcel() (REV.3a)', () => {
  it('BOM, separador punto y coma y comillas solo donde hacen falta', () => {
    const csv = csvDelMesParaExcel(filasDelMesParaExcel(movs(), '2026-11', CUENTAS));
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    const lineas = csv.slice(1).split('\n');
    expect(lineas[0]).toBe('Fecha;Descripción;Categoría;Cuenta;Entrada;Salida');
    expect(lineas.at(-1)).toBe('2026-11-10;"Mercado ""grande""";Mercado;"Banco; principal";;180000');
  });

  it('vuelve a leerse con las mismas columnas', () => {
    const { headers, filas: rows } = parsearCSV(csvDelMesParaExcel(filasDelMesParaExcel(movs(), '2026-11', CUENTAS)), { separador: ';' });
    expect(headers).toEqual(COLUMNAS_EXCEL);
    expect(rows).toHaveLength(4);
    expect(rows.every(f => f.length === 6)).toBe(true);
  });

  it('sin filas, sin archivo', () => {
    expect(csvDelMesParaExcel([])).toBe('');
  });
});

describe('la vista: cada mes con su descarga (REV.3a)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    S.onboarded = true;
    S.cuentas = CUENTAS.map(c => ({ ...c }));
    S.gastos = FUENTES.gastos.map(g => ({ ...g }));
    S.ingresosPuntuales = FUENTES.ingresosPuntuales.map(i => ({ ...i }));
    S.transferencias = FUENTES.transferencias.map(t => ({ ...t }));
    document.body.innerHTML = '<div id="movimientos-filtros"></div><div id="lista-movimientos"></div>';
    limpiarFiltrosMovimientos();
  });

  it('el divisor de cada mes trae su botón, con el nombre del mes', () => {
    renderMovimientosCompletos();
    const botones = [...document.querySelectorAll('[data-action="movimientos-descargar-mes"]')];
    expect(botones.map(b => b.dataset.mes)).toEqual(['2026-11', '2026-10']);
    expect(botones[0].getAttribute('aria-label')).toMatch(/^Descargar .+ para Excel$/);
  });

  it('descarga lo que la lista muestra de ese mes, filtros incluidos', async () => {
    initMovimientos();
    const blobs = [];
    const crear = vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => { blobs.push(b); return 'blob:x'; });
    const soltar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clic = vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    setFiltroTexto('mercado');
    renderMovimientosCompletos();
    const boton = document.querySelector('[data-action="movimientos-descargar-mes"][data-mes="2026-11"]');
    dispatch(boton, new Event('click', { cancelable: true }));

    expect(clic).toHaveBeenCalledTimes(1);
    const texto = await blobs[0].text();
    const lineas = texto.replace(/^﻿/, '').split('\n');
    expect(lineas).toHaveLength(2);
    expect(lineas[1]).toContain('Mercado');
    crear.mockRestore(); soltar.mockRestore(); clic.mockRestore();
  });
});
