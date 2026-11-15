/**
 * aportes-bolsas.test.js - los aportes a metas y reservas tienen fecha, y "Ya
 * lo usé" deja su gasto (HF.1c, ADR 145).
 *
 * - Puras: las filas de un aporte, las dos fuentes nuevas de Movimientos, su
 *   efecto en la cuenta y el gasto de la reserva usada.
 * - La migración v50.
 * - R-HF2 por ruta, con los manejadores reales: aportar a una meta (con el
 *   aporte repartido entre dos cuentas), aportar a una reserva y "Ya lo usé",
 *   y lo que llega por Distribuir.
 *
 * Todos los datos son inventados.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { S, EventBus, createInitialState } from '../../modules/core/state.js';
import { loadData, STORAGE_KEY } from '../../modules/core/storage.js';
import { guardar, editar, filasDeAporte } from '../../modules/infra/crud.js';
import { dispatch } from '../../modules/ui/actions.js';
import { vaciarRendersProgramados } from '../../modules/infra/render.js';
import { hoy } from '../../modules/infra/utils.js';
import {
  movimientosDesdeAportesMetas, movimientosDesdeAportesReservas, efectoEnCuenta, movimientosCompletos,
} from '../../modules/dominio/movimientos/logic.js';
import { gastoDeReservaUsada } from '../../modules/dominio/apartados/logic.js';
import { normalizarMeta } from '../../modules/dominio/metas/logic.js';
import { initMetas } from '../../modules/dominio/metas/index.js';
import { initApartados } from '../../modules/dominio/apartados/index.js';
import { initMiles } from '../../modules/ui/miles.js';

// ── PURAS ────────────────────────────────────────────────────────

describe('filasDeAporte() (ADR 145 D1)', () => {
  it('una fila por cuenta del reparto, con su fecha', () => {
    const filas = filasDeAporte([{ cuentaId: 'c1', monto: 30_000 }, { cuentaId: 'c2', monto: 20_000 }], 50_000, '2026-11-15');
    expect(filas.map(f => [f.cuentaId, f.monto, f.fecha])).toEqual([['c1', 30_000, '2026-11-15'], ['c2', 20_000, '2026-11-15']]);
    expect(new Set(filas.map(f => f.id)).size).toBe(2);
  });

  it('sin cuentas, una fila sin cuenta por el total; lo de Distribuir dice su origen', () => {
    expect(filasDeAporte([], 50_000, '2026-11-15')).toEqual([expect.objectContaining({ cuentaId: null, monto: 50_000 })]);
    const [f] = filasDeAporte([{ cuentaId: 'c1', monto: 10 }], 10, '2026-11-15', { origen: 'distribucion' });
    expect(f.origen).toBe('distribucion');
  });

  it('un monto en cero no deja fila', () => {
    expect(filasDeAporte([], 0, '2026-11-15')).toEqual([]);
  });
});

describe('Movimientos: los aportes a metas y reservas (ADR 145 D3)', () => {
  const metas = [{ id: 'm1', nombre: 'Viaje', aportes: [{ id: 'a1', fecha: '2026-11-10', monto: 80_000, cuentaId: 'c1' }] }];
  const reservas = [{ id: 'r1', nombre: 'SOAT', aportes: [{ id: 'a2', fecha: '2026-11-12', monto: 40_000, cuentaId: null }] }];

  it('un aporte a una meta sale en Movimientos en su fecha, neutro y con su cuenta', () => {
    expect(movimientosDesdeAportesMetas(metas)).toEqual([expect.objectContaining({
      id: 'a1', tipo: 'aporte-meta', fecha: '2026-11-10', monto: 80_000, direccion: 'neutro', cuentaId: 'c1',
      descripcion: 'Aporte a Viaje', dominio: 'metas',
    })]);
    expect(movimientosDesdeAportesReservas(reservas)[0]).toMatchObject({ tipo: 'aporte-reserva', descripcion: 'Aporte a SOAT', dominio: 'ahorro' });
  });

  it('entran al historial completo, ordenados con lo demás', () => {
    const todos = movimientosCompletos({ metas, apartados: reservas, gastos: [{ id: 'g1', fecha: '2026-11-11', monto: 5, categoria: 'Otros' }] });
    expect(todos.map(m => m.id)).toEqual(['a2', 'g1', 'a1']);
  });

  it('una meta o reserva sin aportes[] (anterior a la v50) no da filas', () => {
    expect(movimientosDesdeAportesMetas([{ id: 'm', nombre: 'Vieja', montoActual: 9 }])).toEqual([]);
    expect(movimientosDesdeAportesReservas(null)).toEqual([]);
  });

  it('el aporte resta de su cuenta en efectoEnCuenta; uno sin cuenta no toca ninguna', () => {
    const movs = [...movimientosDesdeAportesMetas(metas), ...movimientosDesdeAportesReservas(reservas)];
    expect(efectoEnCuenta(movs, 'c1')).toBe(-80_000);
    expect(efectoEnCuenta(movs, 'c2')).toBe(0);
  });
});

describe('gastoDeReservaUsada() (V5, ADR 145 D4)', () => {
  it('lo liberado queda como gasto en "Otros", con el nombre de la reserva y sin efecto en saldo', () => {
    expect(gastoDeReservaUsada({ id: 'r1', nombre: 'SOAT' }, 900_000, '2026-11-15')).toEqual({
      monto: 900_000, categoria: 'Otros', descripcion: 'SOAT', fecha: '2026-11-15', apartadoId: 'r1', sinEfectoSaldo: true,
    });
  });

  it('si no se liberó nada, no hay gasto', () => {
    expect(gastoDeReservaUsada({ id: 'r1', nombre: 'SOAT' }, 0, '2026-11-15')).toBeNull();
    expect(gastoDeReservaUsada(null, 10, '2026-11-15')).toBeNull();
  });
});

// ── MIGRACIÓN v50 ────────────────────────────────────────────────

describe('migración v50: aportes[] en metas y reservas (ADR 145 D2)', () => {
  beforeEach(() => { Object.assign(S, createInitialState()); });

  it('un estado v49 arranca con aportes vacíos y sin tocar montoActual', () => {
    const v49 = { ...createInitialState(), _version: 49 };
    v49.metas = [{ id: 'm1', nombre: 'Viaje', montoObjetivo: 1_000_000, montoActual: 300_000, completada: false }];
    v49.apartados = [{ id: 'r1', nombre: 'SOAT', montoObjetivo: 900_000, montoActual: 450_000, completado: false }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v49));
    loadData();
    expect(S.metas[0]).toMatchObject({ montoActual: 300_000, aportes: [] });
    expect(S.apartados[0]).toMatchObject({ montoActual: 450_000, aportes: [] });
  });

  it('es idempotente: conserva los aportes válidos y descarta lo que no tiene forma', () => {
    const v49 = { ...createInitialState(), _version: 49 };
    v49.metas = [{ id: 'm1', nombre: 'Viaje', montoActual: 1, aportes: [{ id: 'a1', fecha: '2026-11-10', monto: 1, cuentaId: null }, { monto: 5 }, null] }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v49));
    loadData();
    expect(S.metas[0].aportes.map(a => a.id)).toEqual(['a1']);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...S }));
    loadData();
    expect(S.metas[0].aportes.map(a => a.id)).toEqual(['a1']);
  });
});

// ── R-HF2 POR RUTA ───────────────────────────────────────────────

const HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

function montarModales(ids) {
  const cuerpo = HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/gi, '');
  const tmp = document.createElement('div');
  tmp.innerHTML = cuerpo;
  document.body.innerHTML = `<div class="app-shell"></div>${ids.map(id => tmp.querySelector(`#${id}`).outerHTML).join('')}`;
}

async function esperar(vueltas = 20) {
  for (let i = 0; i < vueltas; i++) await Promise.resolve();
  vaciarRendersProgramados();
}

function accion(nombre, data = {}) {
  const el = document.createElement('button');
  el.dataset.action = nombre;
  Object.assign(el.dataset, data);
  dispatch(el, new Event('click', { cancelable: true }));
}

function escribir(form, name, valor) {
  const campos = [...form.querySelectorAll(`[name="${name}"]`)];
  if (campos.length === 0) throw new Error(`falta el campo ${name}`);
  const radio = campos.find(c => c.type === 'radio' && c.value === String(valor));
  const campo = radio ?? campos[0];
  if (campo.type === 'radio' || campo.type === 'checkbox') campo.checked = true;
  else campo.value = String(valor);
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  campo.dispatchEvent(new Event('change', { bubbles: true }));
}

/** El diálogo que esté abierto (confirmar o repartir entre cuentas). */
function dialogo() {
  return document.querySelector('body > .modal-overlay[data-open]:not([id])');
}

const filas = () => movimientosCompletos({
  gastos: S.gastos, ingresosPuntuales: S.ingresosPuntuales, aportes: S.ahorro?.aportes,
  transferencias: S.transferencias, personales: S.personales, compromisos: S.compromisos,
  ajustesSaldo: S.ajustesSaldo, categoriasPersonalizadas: S.categoriasPersonalizadas,
  metas: S.metas, apartados: S.apartados,
});
const saldo = (id) => S.cuentas.find(c => c.id === id).saldo;

describe('R-HF2: aportar a metas y reservas deja su fila (ADR 145)', () => {
  const APERTURA = { c1: 100_000, c2: 500_000 };

  beforeAll(() => {
    montarModales(['modal-abono-meta', 'modal-aporte-apartado']);
    location.hash = '#aportes-bolsas';
    initMiles();
    initMetas();
    initApartados();
  });

  beforeEach(() => {
    Object.assign(S, createInitialState());
    S.onboarded = true;
    guardar('cuentas', { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: APERTURA.c1, activa: true });
    guardar('cuentas', { id: 'c2', nombre: 'Banco', banco: 'Bancolombia', tipo: 'Ahorros', saldo: APERTURA.c2, activa: true });
  });

  const cuadra = () => {
    for (const id of ['c1', 'c2']) expect(saldo(id) - APERTURA[id]).toBe(efectoEnCuenta(filas(), id));
  };

  it('un aporte a una meta repartido entre dos cuentas deja una fila por cuenta y cuadra', async () => {
    guardar('metas', { id: 'm1', nombre: 'Viaje', montoObjetivo: 2_000_000, montoActual: 0, completada: false, aportes: [] });
    accion('abonar-meta', { id: 'm1' });
    const form = document.getElementById('form-abono-meta');
    escribir(form, 'monto', '150000');
    escribir(form, 'cuentaId', 'c1');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    // Nequi no alcanza: el reparto se completa con la otra cuenta.
    const reparto = dialogo();
    expect(reparto).not.toBeNull();
    reparto.querySelector('[data-role="confirmar"]').click();
    await esperar();

    const meta = S.metas.find(m => m.id === 'm1');
    expect(meta.montoActual).toBe(150_000);
    expect(meta.aportes.reduce((s, a) => s + a.monto, 0)).toBe(150_000);
    expect(meta.aportes.every(a => a.fecha === hoy() && a.cuentaId)).toBe(true);
    expect(filas().filter(f => f.tipo === 'aporte-meta')).toHaveLength(meta.aportes.length);
    cuadra();
  });

  it('un aporte a una reserva y su "Ya lo usé": la fila, el gasto sin efecto en saldo, y cuadra', async () => {
    guardar('apartados', {
      id: 'r1', nombre: 'SOAT', icono: '🚗', montoObjetivo: 50_000, montoActual: 0, fechaObjetivo: '2026-12-01',
      frecuenciaAporte: 'Mensual', recurrente: true, periodoMeses: 12, completado: false, aportes: [],
    });
    accion('aportar-apartado', { id: 'r1' });
    const form = document.getElementById('form-aporte-apartado');
    escribir(form, 'monto', '50000');
    escribir(form, 'cuentaId', 'c2');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    expect(saldo('c2')).toBe(APERTURA.c2 - 50_000);
    expect(S.apartados[0].aportes).toEqual([expect.objectContaining({ cuentaId: 'c2', monto: 50_000 })]);
    cuadra();

    accion('reiniciar-apartado', { id: 'r1' });
    await esperar();
    const d = dialogo();
    expect(d.textContent).toContain('quedan como un gasto');
    d.querySelector('[data-role="confirmar"]').click();
    await esperar();

    expect(S.apartados[0].montoActual).toBe(0);
    expect(S.gastos).toEqual([expect.objectContaining({
      monto: 50_000, categoria: 'Otros', descripcion: 'SOAT', apartadoId: 'r1', sinEfectoSaldo: true,
    })]);
    expect(saldo('c2')).toBe(APERTURA.c2 - 50_000);
    cuadra();
  });

  it('lo que llega por Distribuir lleva la cuenta de origen y su marca', () => {
    guardar('metas', { id: 'm1', nombre: 'Viaje', montoObjetivo: 2_000_000, montoActual: 0, completada: false, aportes: [] });
    guardar('apartados', { id: 'r1', nombre: 'SOAT', montoObjetivo: 900_000, montoActual: 0, completado: false, aportes: [] });
    EventBus.emit('distribucion:aplicar', {
      items: [{ tipo: 'meta', id: 'm1', monto: 70_000 }, { tipo: 'apartado', id: 'r1', monto: 30_000 }],
      cuentaOrigenId: 'c1',
    });
    expect(S.metas[0].aportes).toEqual([expect.objectContaining({ cuentaId: 'c1', monto: 70_000, origen: 'distribucion' })]);
    expect(S.apartados[0].aportes).toEqual([expect.objectContaining({ cuentaId: 'c1', monto: 30_000, origen: 'distribucion' })]);
  });

  it('editar una meta no borra su historia: la edición se fusiona sobre la meta', () => {
    guardar('metas', { id: 'm1', nombre: 'Viaje', montoObjetivo: 2_000_000, montoActual: 10, completada: false,
      aportes: [{ id: 'a1', fecha: '2026-11-01', monto: 10, cuentaId: 'c1' }] });
    // La misma ruta que `_guardarMeta` en modo edición: normalizar y fusionar.
    const cambios = normalizarMeta({ nombre: 'Viaje a Cartagena', montoObjetivo: '3000000' }, S.metas[0]);
    expect(cambios).not.toHaveProperty('aportes');
    editar('metas', 'm1', cambios);
    expect(S.metas[0]).toMatchObject({ nombre: 'Viaje a Cartagena', montoActual: 10 });
    expect(S.metas[0].aportes.map(a => a.id)).toEqual(['a1']);
  });
});
