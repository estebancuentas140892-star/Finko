/**
 * registro-saldo.test.js - todo cambio de saldo deja registro (HF.1d-1,
 * ADR 143). La regla R-HF2 del ADR 091: el saldo de hoy de una cuenta es su
 * saldo de apertura más lo que dicen sus filas de Movimientos.
 *
 * - Puras: las filas nuevas (lo prestado, lo recibido de una deuda, el ajuste
 *   a mano), `efectoEnCuenta` y lo que vuelve al borrar un préstamo.
 * - La migración v49 (`ajustesSaldo`).
 * - Una prueba de R-HF2 por ruta, con los manejadores reales: ajustar el
 *   saldo a mano, prestar, cobrar un abono y borrar el préstamo, y distribuir
 *   el ingreso (HF.1d-2, ADR 143 D6).
 *
 * Todos los datos son inventados.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import { loadData, STORAGE_KEY } from '../../modules/core/storage.js';
import { guardar, editar } from '../../modules/infra/crud.js';
import { validarAvance, normalizarAvance, aplicarAvance } from '../../modules/dominio/compromisos/logic.js';
import { dispatch } from '../../modules/ui/actions.js';
import { vaciarRendersProgramados } from '../../modules/infra/render.js';
import {
  movimientosDesdePrestamos, movimientosDesdeDeudasRecibidas, movimientosDesdeAjustes,
  efectoEnCuenta, movimientosCompletos,
} from '../../modules/dominio/movimientos/logic.js';
import { reversionAlBorrar } from '../../modules/dominio/personales/logic.js';
import { initPersonales } from '../../modules/dominio/personales/index.js';
import { initAccionesCuentas, inyectarFormCuenta } from '../../modules/dominio/tesoreria/acciones/cuentas.js';
import { initMiles } from '../../modules/ui/miles.js';
import { initCompromisos } from '../../modules/dominio/compromisos/index.js';
import { initAccionesDistribucion, abrirAsistenteDistribucion } from '../../modules/dominio/tesoreria/acciones/distribucion.js';

// ── PURAS ────────────────────────────────────────────────────────

describe('las filas nuevas (ADR 143 D2 y D3)', () => {
  it('un préstamo con cuenta sale de ella; sin cuenta no da fila', () => {
    const filas = movimientosDesdePrestamos([
      { id: 'p1', persona: 'Mamá', monto: 200_000, fecha: '2026-11-10', cuentaId: 'c1' },
      { id: 'p2', persona: 'Andrés', monto: 50_000, fecha: '2026-11-11', cuentaId: null },
    ]);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ tipo: 'prestamo', direccion: 'egreso', monto: 200_000, cuentaId: 'c1', descripcion: 'Le prestaste a Mamá' });
  });

  it('una deuda recibida en una cuenta entra por lo acreditado, en su día local', () => {
    const [fila] = movimientosDesdeDeudasRecibidas([
      { id: 'd1', descripcion: 'Crédito libre', cuentaOrigenId: 'c1', montoAcreditado: 3_000_000, fechaCreacion: '2026-11-10T15:00:00.000Z' },
      { id: 'd2', descripcion: 'Tarjeta', saldoTotal: 900_000 },
    ]);
    expect(fila).toMatchObject({ tipo: 'recibido', direccion: 'ingreso', monto: 3_000_000, cuentaId: 'c1', fecha: '2026-11-10' });
  });

  it('un ajuste entra o sale según su signo; uno en cero no da fila', () => {
    const filas = movimientosDesdeAjustes([
      { id: 'a1', cuentaId: 'c1', fecha: '2026-11-12', monto: 15_000 },
      { id: 'a2', cuentaId: 'c1', fecha: '2026-11-13', monto: -4_000 },
      { id: 'a3', cuentaId: 'c1', fecha: '2026-11-13', monto: 0 },
    ]);
    expect(filas.map(f => [f.direccion, f.monto])).toEqual([['ingreso', 15_000], ['egreso', 4_000]]);
  });
});

describe('efectoEnCuenta() (R-HF2)', () => {
  it('entra suma, sale resta, la transferencia con su 4x1000 y el gasto importado no cuenta', () => {
    const movs = [
      { tipo: 'ingreso', direccion: 'ingreso', monto: 100, cuentaId: 'c1' },
      { tipo: 'gasto', direccion: 'egreso', monto: 30, cuentaId: 'c1' },
      { tipo: 'gasto', direccion: 'egreso', monto: 999, cuentaId: 'c1', sinEfectoSaldo: true },
      { tipo: 'transferencia', direccion: 'neutro', monto: 50, costoGMF: 2, cuentaOrigenId: 'c1', cuentaDestinoId: 'c2' },
      { tipo: 'aporte', direccion: 'neutro', monto: 10, cuentaId: null },
    ];
    expect(efectoEnCuenta(movs, 'c1')).toBe(100 - 30 - 52);
    expect(efectoEnCuenta(movs, 'c2')).toBe(50);
  });
});

describe('reversionAlBorrar() (ADR 143 D4)', () => {
  it('el desembolso vuelve y cada abono sale de donde entró; el abono sin cuenta no se toca', () => {
    const r = reversionAlBorrar({
      monto: 300_000, cuentaId: 'c1',
      abonos: [
        { monto: 100_000, cuentaId: 'c1' },
        { monto: 50_000, cuentaId: 'c2' },
        { monto: 20_000, agrupado: true },
      ],
    });
    expect(r.deltas).toEqual({ c1: 200_000, c2: -50_000 });
    expect(r.abonosSinCuenta).toBe(1);
  });

  it('un préstamo sin cuenta y sin abonos no mueve nada', () => {
    expect(reversionAlBorrar({ monto: 80_000 })).toEqual({ deltas: {}, abonosSinCuenta: 0 });
  });
});

describe('migración v49: ajustesSaldo', () => {
  beforeEach(() => { Object.assign(S, createInitialState()); });

  it('un estado v48 arranca sin ajustes', () => {
    const v48 = { ...createInitialState(), _version: 48 };
    delete v48.ajustesSaldo;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v48));
    loadData();
    expect(S.ajustesSaldo).toEqual([]);
  });

  it('descarta lo que no es un ajuste y conserva los válidos', () => {
    const v48 = { ...createInitialState(), _version: 48 };
    v48.ajustesSaldo = [{ id: 'a1', cuentaId: 'c1', fecha: '2026-11-12', monto: 5 }, { cuentaId: 'c1' }, null];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v48));
    loadData();
    expect(S.ajustesSaldo.map(a => a.id)).toEqual(['a1']);
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

/** Escribe un campo como lo haría la persona y avisa. */
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

async function aceptarDialogo() {
  await esperar();
  const d = document.querySelector('body > .modal-overlay[data-open]:not([id])');
  if (!d) throw new Error('No apareció la confirmación');
  const texto = d.textContent.replace(/\s+/g, ' ');
  d.querySelector('[data-role="confirmar"]').click();
  await esperar();
  return texto;
}

/** Las filas de todas las fuentes, como las arma Movimientos. */
const filas = () => movimientosCompletos({
  gastos: S.gastos, ingresosPuntuales: S.ingresosPuntuales, aportes: S.ahorro?.aportes,
  transferencias: S.transferencias, personales: S.personales, compromisos: S.compromisos,
  ajustesSaldo: S.ajustesSaldo, categoriasPersonalizadas: S.categoriasPersonalizadas,
});
const saldo = (id) => S.cuentas.find(c => c.id === id).saldo;

describe('R-HF2: el saldo es su apertura más sus filas, ruta por ruta', () => {
  const APERTURA = { c1: 1_000_000, c2: 500_000 };

  beforeAll(() => {
    montarModales(['modal-cuenta', 'modal-personal', 'modal-pago-personal', 'modal-compromiso', 'modal-distribuir']);
    location.hash = '#registro-saldo';
    initMiles();
    initPersonales();
    initAccionesCuentas();
    initCompromisos();
    initAccionesDistribucion();
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

  it('ajustar el saldo a mano deja su fila (D3)', async () => {
    inyectarFormCuenta();
    accion('editar-cuenta', { id: 'c1' });
    const form = document.getElementById('form-cuenta');
    escribir(form, 'saldo', '1.012.500');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    expect(saldo('c1')).toBe(1_012_500);
    expect(S.ajustesSaldo).toHaveLength(1);
    expect(S.ajustesSaldo[0]).toMatchObject({ cuentaId: 'c1', monto: 12_500, saldoAntes: 1_000_000, saldoDespues: 1_012_500 });
    cuadra();
  });

  it('prestar, cobrar un abono y borrar el préstamo: cuadra en cada paso y al final no queda nada (D2, D4, D5)', async () => {
    accion('nuevo-personal');
    let form = document.getElementById('form-personal');
    escribir(form, 'persona', 'Mamá');
    escribir(form, 'monto', '300.000');
    escribir(form, 'cuentaId', 'c1');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    const prestamo = S.personales[0];
    expect(saldo('c1')).toBe(700_000);
    cuadra();

    accion('pagar-personal', { id: prestamo.id });
    form = document.getElementById('form-pago-personal');
    escribir(form, 'monto', '100.000');
    escribir(form, 'cuentaId', 'c2');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    expect(saldo('c2')).toBe(600_000);
    const abono = S.personales[0].abonos.at(-1);
    expect(typeof abono.id).toBe('string');
    expect(filas().some(m => m.id === abono.id)).toBe(true);
    cuadra();

    accion('eliminar-personal', { id: prestamo.id });
    const texto = await aceptarDialogo();
    expect(texto).toContain('vuelven a Nequi');
    expect(texto).toContain('salen de Banco');
    expect(saldo('c1')).toBe(APERTURA.c1);
    expect(saldo('c2')).toBe(APERTURA.c2);
    expect(filas()).toHaveLength(0);
    cuadra();
  });

  it('una deuda recibida en una cuenta entra con su fila y borrarla la saca (D.14, D2)', async () => {
    accion('nuevo-compromiso');
    const form = document.getElementById('form-compromiso');
    escribir(form, 'categoria', 'Libre inversión');
    escribir(form, 'descripcion', 'Crédito de prueba');
    escribir(form, 'saldoTotal', '2.000.000');
    escribir(form, 'cuotaMensual', '150.000');
    escribir(form, 'diaPago', '15');
    escribir(form, 'recibioDinero', 'on');
    escribir(form, 'cuentaId', 'c2');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    if (document.querySelector('body > .modal-overlay[data-open]:not([id])')) await aceptarDialogo();
    expect(saldo('c2')).toBe(2_500_000);
    expect(filas().some(m => m.tipo === 'recibido' && m.cuentaId === 'c2')).toBe(true);
    cuadra();

    accion('eliminar-compromiso', { id: S.compromisos.at(-1).id });
    await aceptarDialogo();
    expect(saldo('c2')).toBe(APERTURA.c2);
    cuadra();
  });

  it('un avance entra a su cuenta con su fila y borrar la tarjeta lo saca (AVC.1a, ADR 169)', async () => {
    guardar('compromisos', {
      id: 'tc', descripcion: 'Visa', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito',
      saldoTotal: 300_000, cuotaMensual: 50_000, cupoTotal: 3_000_000, tasa: 0.25, tasaUnidad: 'EA',
      frecuencia: 'Mensual', diaPago: 15, activo: true,
    });
    const tarjeta = S.compromisos.find(c => c.id === 'tc');
    const datos = { monto: '400000', cuentaId: 'c1', cuotas: '12', comision: '7400', fecha: '2026-11-18' };
    expect(validarAvance(datos, { tarjeta, cuentas: S.cuentas })).toEqual([]);
    const r = aplicarAvance(tarjeta, S.cuentas, { id: 'av1', ...normalizarAvance(datos, tarjeta) });
    editar('compromisos', 'tc', r.tarjeta);
    editar('cuentas', r.cuenta.id, { saldo: r.cuenta.saldo });
    expect(saldo('c1')).toBe(1_400_000);
    expect(filas().some(m => m.tipo === 'avance' && m.cuentaId === 'c1')).toBe(true);
    cuadra();

    accion('eliminar-compromiso', { id: 'tc' });
    await aceptarDialogo();
    expect(saldo('c1')).toBe(APERTURA.c1);
    expect(filas().some(m => m.tipo === 'avance')).toBe(false);
    cuadra();
  });

  it('distribuir el ingreso deja el cobro y la transferencia; deshacer los quita (HF.1d-2)', async () => {
    S.ingresos = [{
      id: 'ing1', descripcion: 'Salario de prueba', monto: 2_000_000, frecuencia: 'Mensual', diaPago: 1,
      activo: true, cuentaId: 'c1', categoria: 'Salario', fechaCreacion: '2026-01-01T00:00:00.000Z',
    }];
    S.config = { ...S.config, presetDistribucion: '50-30-20' };
    abrirAsistenteDistribucion();
    const panel = document.getElementById('distribuir-ingreso-panel');
    const destino = panel.querySelector('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c2"]');
    const toggle = destino.closest('.distribuir__fila').querySelector('[data-dist-destino-toggle]');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    destino.value = '100.000';
    destino.dispatchEvent(new Event('input', { bubbles: true }));
    const dejar = panel.querySelector('[data-dist-remanente][value="cuenta"]');
    if (dejar) { dejar.checked = true; dejar.dispatchEvent(new Event('change', { bubbles: true })); }

    accion('confirmar-distribucion');
    await esperar();
    expect(saldo('c1')).toBe(APERTURA.c1 + 2_000_000 - 100_000);
    expect(saldo('c2')).toBe(APERTURA.c2 + 100_000);
    expect(S.ingresosPuntuales).toEqual([expect.objectContaining({
      ingresoId: 'ing1', monto: 2_000_000, cuentaId: 'c1', origen: 'distribucion', repartido: true,
    })]);
    expect(S.transferencias).toEqual([expect.objectContaining({ cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: 100_000 })]);
    expect(S.config.cobrosDistribuidos).toBeUndefined();
    cuadra();

    accion('deshacer-distribucion');
    await esperar();
    expect(saldo('c1')).toBe(APERTURA.c1);
    expect(saldo('c2')).toBe(APERTURA.c2);
    expect(S.ingresosPuntuales).toHaveLength(0);
    expect(S.transferencias).toHaveLength(0);
    cuadra();
  });
});
