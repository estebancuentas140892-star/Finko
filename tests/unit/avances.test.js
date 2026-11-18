/**
 * avances.test.js - el avance con tarjeta de crédito (AVC.1a, ADR 169).
 *
 * Un avance que llega a una cuenta no es un gasto: la tarjeta presta y la
 * cuenta recibe (D4). Se prueba:
 * - Puras: el costo en pesos (D2, con el ejemplo del ADR), la validación, el
 *   avance normalizado, sus efectos y la búsqueda por id.
 * - La fila de Movimientos (D5) y la regla R-HF2: el saldo de la cuenta es su
 *   apertura más sus filas. El patrimonio solo baja la comisión (ADR 053).
 * - Deshacer (D6): vuelve todo a como estaba, y sus tres bloqueos.
 * - La migración v56, que no cambia nada.
 *
 * Todos los datos son inventados.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import { loadData, STORAGE_KEY, SCHEMA_VERSION } from '../../modules/core/storage.js';
import { editar } from '../../modules/infra/crud.js';
import {
  CUOTAS_AVANCE, esTarjetaOperable, costoDeAvance, validarAvance, normalizarAvance,
  deltasDeAvance, aplicarAvance, buscarAvance, reversionAvancesAlBorrar,
  textoCostoDeAvance, leerTasaEscrita, erroresTasaEscrita, cuentaEfectivoNueva, EFECTIVO_NUEVO,
} from '../../modules/dominio/compromisos/logic.js';
import {
  movimientosDesdeAvances, efectoEnCuenta, movimientosCompletos, filasDelMesParaExcel,
} from '../../modules/dominio/movimientos/logic.js';
import { calcularActivos, calcularPasivos } from '../../modules/dominio/analisis/logic.js';
import { planDeshacer, aplicarDeshacer, huellaPlan, mensajeDeshacer } from '../../modules/infra/deshacer.js';

const cuenta = (id, nombre, saldo) => ({ id, nombre, banco: 'Otro', tipo: 'Ahorros', saldo, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' });
const tarjeta = (extra = {}) => ({
  id: 't1', descripcion: 'Visa Bancolombia', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito',
  saldoTotal: 800_000, cuotaMensual: 120_000, cupoTotal: 5_000_000, tasa: 0.2293, tasaUnidad: 'EA',
  frecuencia: 'Mensual', diaPago: 15, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z', ...extra,
});
const datos = (extra = {}) => ({ monto: '500000', cuentaId: 'efe', cuotas: '24', comision: '9870', fecha: '2026-11-18', ...extra });

// ── PURAS ────────────────────────────────────────────────────────

describe('costoDeAvance() (D2)', () => {
  it('el ejemplo del ADR: $500.000 a 24 cuotas y 22,93 % EA', () => {
    expect(costoDeAvance({ monto: 500_000, tasaEA: 0.2293, cuotas: 24, comision: 9_870 })).toEqual({
      cuota: 25_649, intereses: 115_586, comision: 9_870, costo: 125_456, total: 625_456,
    });
  });

  it('a la usura de noviembre (28,34 % EA) cuesta más', () => {
    const { intereses } = costoDeAvance({ monto: 500_000, tasaEA: 0.2834, cuotas: 24 });
    expect(intereses).toBeGreaterThan(115_586);
  });

  it('con tasa 0 la cuota es monto / cuotas y no hay intereses', () => {
    expect(costoDeAvance({ monto: 300_000, tasaEA: 0, cuotas: 3 })).toMatchObject({ cuota: 100_000, intereses: 0, total: 300_000 });
  });

  it('a una cuota cobra un mes de intereses', () => {
    const { cuota, intereses } = costoDeAvance({ monto: 100_000, tasaEA: 0.2293, cuotas: 1 });
    expect(intereses).toBe(Math.round(100_000 * (Math.pow(1.2293, 1 / 12) - 1)));
    expect(cuota).toBe(100_000 + intereses);
  });

  it('sin monto no cuesta nada más que la comisión', () => {
    expect(costoDeAvance({ monto: 0, tasaEA: 0.25, cuotas: 12, comision: 7_400 })).toMatchObject({ cuota: 0, intereses: 0, costo: 7_400 });
  });
});

describe('textoCostoDeAvance() (D2, AVC.1b)', () => {
  it('dice el costo en pesos, a la centena, con la cuota exacta', () => {
    expect(textoCostoDeAvance({ monto: 500_000, tasaEA: 0.2293, cuotas: 24, comision: 9_870 }))
      .toBe('Este avance te cuesta unos $125.500: $115.600 de intereses en 24 cuotas de $25.649 y $9.870 de comisión. Pagarás unos $625.500 por $500.000.');
  });

  it('sin comisión no la nombra; a una cuota lo dice en singular', () => {
    expect(textoCostoDeAvance({ monto: 500_000, tasaEA: 0.2293, cuotas: 24 })).not.toContain('comisión');
    expect(textoCostoDeAvance({ monto: 100_000, tasaEA: 0.2293, cuotas: 1 })).toContain('en 1 cuota de');
  });

  it('sin monto no dice nada; sin tasa o sin cuotas dice qué falta', () => {
    expect(textoCostoDeAvance({ monto: 0, tasaEA: 0.25, cuotas: 12 })).toBe('');
    expect(textoCostoDeAvance({ monto: 100_000, tasaEA: 0, cuotas: 12 })).toBe('Escribe la tasa de tu tarjeta para ver cuánto te cuesta.');
    expect(textoCostoDeAvance({ monto: 100_000, tasaEA: 0.25, cuotas: 0 })).toBe('Elige a cuántas cuotas para ver cuánto te cuesta.');
  });
});

describe('la tasa escrita y la cuenta Efectivo nueva (D1, AVC.1b)', () => {
  it('lee la tasa con coma, punto o el signo de porcentaje', () => {
    expect(leerTasaEscrita('25,5')).toBe(25.5);
    expect(leerTasaEscrita('25.5 %')).toBe(25.5);
    expect(leerTasaEscrita('')).toBeNull();
    expect(leerTasaEscrita('abc')).toBeNull();
  });

  it('vacía no es error; mal escrita o imposible, sí', () => {
    expect(erroresTasaEscrita('')).toEqual([]);
    expect(erroresTasaEscrita('22,93')).toEqual([]);
    expect(erroresTasaEscrita('abc')).toEqual(['Escribe la tasa con números. Por ejemplo: 28,5']);
    expect(erroresTasaEscrita('5000')[0]).toMatch(/no parece una tasa real/);
  });

  it('la cuenta Efectivo nace en $0, sin 4x1000 ni datos de transferencia', () => {
    expect(cuentaEfectivoNueva()).toEqual({
      nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 0, icono: null, activa: true,
      cuotaManejo: null, aplica4x1000: false, exenta4x1000: null, datosTransferencia: null,
    });
    expect(EFECTIVO_NUEVO).toBe('efectivo-nuevo');
  });
});

describe('esTarjetaOperable()', () => {
  it('solo la tarjeta con cupo y activa', () => {
    expect(esTarjetaOperable(tarjeta())).toBe(true);
    expect(esTarjetaOperable(tarjeta({ cupoTotal: null }))).toBe(false);
    expect(esTarjetaOperable(tarjeta({ activo: false }))).toBe(false);
    expect(esTarjetaOperable(tarjeta({ categoria: 'Crédito de libre inversión' }))).toBe(false);
    expect(esTarjetaOperable(null)).toBe(false);
  });
});

describe('validarAvance() (D1)', () => {
  const cuentas = [cuenta('efe', 'Efectivo', 0), { ...cuenta('vieja', 'Cerrada', 0), activa: false }];

  it('datos completos no tienen errores; la comisión es opcional', () => {
    expect(validarAvance(datos(), { tarjeta: tarjeta(), cuentas })).toEqual([]);
    expect(validarAvance(datos({ comision: '' }), { tarjeta: tarjeta(), cuentas })).toEqual([]);
  });

  it('pide la tasa si la tarjeta no la tiene', () => {
    expect(validarAvance(datos(), { tarjeta: tarjeta({ tasa: null }), cuentas }))
      .toEqual(['Escribe la tasa de tu tarjeta. Está en el extracto, como EA.']);
  });

  it('una tarjeta sin cupo no saca avances', () => {
    expect(validarAvance(datos(), { tarjeta: tarjeta({ cupoTotal: 0 }), cuentas })[0]).toMatch(/tarjeta de crédito con cupo/);
  });

  it('dice qué hacer con cada dato que falta o no sirve', () => {
    const errores = validarAvance(
      { monto: '0', cuentaId: 'vieja', cuotas: '5', comision: '-1', fecha: '18/11/2026' },
      { tarjeta: tarjeta(), cuentas },
    );
    expect(errores).toEqual([
      'Escribe cuánto sacaste. Por ejemplo: 200.000',
      'Elige a qué cuenta llegó el dinero.',
      'Elige a cuántas cuotas lo difirieron.',
      'Escribe la comisión que te cobraron, o déjala vacía. Por ejemplo: 8.294',
      'Elige la fecha del avance.',
    ]);
  });

  it('las cuotas son las del consumo más 36', () => {
    expect(CUOTAS_AVANCE).toEqual([1, 2, 3, 6, 9, 12, 18, 24, 36]);
  });
});

describe('normalizarAvance(), deltasDeAvance() y aplicarAvance() (D4, D5)', () => {
  it('guarda la cuota con intereses calculada con la tasa de la tarjeta', () => {
    expect(normalizarAvance(datos(), tarjeta())).toEqual({
      fecha: '2026-11-18', monto: 500_000, cuentaId: 'efe', cuotas: 24, cuota: 25_649, comision: 9_870,
    });
    expect(normalizarAvance(datos({ comision: '' }), tarjeta()).comision).toBe(0);
  });

  it('una tarjeta con tasa mensual la pasa a EA', () => {
    const mensual = tarjeta({ tasa: 0.0174, tasaUnidad: 'mensual' });
    const { cuota } = normalizarAvance(datos({ cuotas: '12', comision: '0' }), mensual);
    expect(cuota).toBe(costoDeAvance({ monto: 500_000, tasaEA: Math.pow(1.0174, 12) - 1, cuotas: 12 }).cuota);
  });

  it('la cuenta recibe el monto; la deuda sube monto y comisión; la cuota, la del avance', () => {
    const avance = { id: 'av1', ...normalizarAvance(datos(), tarjeta()) };
    expect(deltasDeAvance(avance)).toEqual({ cuenta: 500_000, deuda: 509_870, cuota: 25_649 });
    expect(aplicarAvance(tarjeta(), [cuenta('efe', 'Efectivo', 20_000)], avance)).toEqual({
      tarjeta: { saldoTotal: 1_309_870, cuotaMensual: 145_649, avances: [avance] },
      cuenta: { id: 'efe', saldo: 520_000 },
    });
  });

  it('no aplica sin id, con la cuenta cerrada o en una tarjeta sin cupo', () => {
    const avance = normalizarAvance(datos(), tarjeta());
    const efe = [cuenta('efe', 'Efectivo', 0)];
    expect(aplicarAvance(tarjeta(), efe, avance)).toBeNull();
    expect(aplicarAvance(tarjeta(), [{ ...efe[0], activa: false }], { id: 'a', ...avance })).toBeNull();
    expect(aplicarAvance(tarjeta({ cupoTotal: 0 }), efe, { id: 'a', ...avance })).toBeNull();
  });

  it('suma a los avances que la tarjeta ya tenía', () => {
    const previo = { id: 'av0', fecha: '2026-10-02', monto: 100_000, cuentaId: 'efe', cuotas: 1, cuota: 101_000, comision: 0 };
    const nuevo = { id: 'av1', ...normalizarAvance(datos(), tarjeta()) };
    const r = aplicarAvance(tarjeta({ avances: [previo] }), [cuenta('efe', 'Efectivo', 0)], nuevo);
    expect(r.tarjeta.avances.map(a => a.id)).toEqual(['av0', 'av1']);
  });

  it('reversionAvancesAlBorrar() saca de cada cuenta lo que le entró (I3 del ADR 053)', () => {
    const t = tarjeta({ avances: [
      { id: 'a1', monto: 200_000, cuentaId: 'efe', comision: 8_294 },
      { id: 'a2', monto: 100_000, cuentaId: 'efe' },
      { id: 'a3', monto: 50_000, cuentaId: 'nq' },
    ] });
    expect(reversionAvancesAlBorrar(t)).toEqual({ efe: -300_000, nq: -50_000 });
    expect(reversionAvancesAlBorrar(tarjeta())).toEqual({});
  });

  it('buscarAvance() encuentra el avance con su tarjeta', () => {
    const avance = { id: 'av1', ...normalizarAvance(datos(), tarjeta()) };
    const t = tarjeta({ avances: [avance] });
    expect(buscarAvance([{ id: 'otro' }, t], 'av1')).toEqual({ tarjeta: t, avance });
    expect(buscarAvance([t], 'nada')).toBeNull();
    expect(buscarAvance(undefined, 'av1')).toBeNull();
  });
});

// ── MOVIMIENTOS Y R-HF2 ──────────────────────────────────────────

describe('la fila del avance en Movimientos (D5)', () => {
  it('entra a la cuenta de destino por el monto, en el dominio de Por pagar', () => {
    const filas = movimientosDesdeAvances([
      tarjeta({ avances: [{ id: 'av1', fecha: '2026-11-18', monto: 500_000, cuentaId: 'efe', cuotas: 24, cuota: 25_649, comision: 9_870 }] }),
      { id: 'd1', descripcion: 'Crédito', avances: [{ id: 'roto', monto: 0, cuentaId: 'efe' }] },
      { id: 'd2', descripcion: 'Otra' },
    ]);
    expect(filas).toEqual([{
      id: 'av1', fecha: '2026-11-18', tipo: 'avance', descripcion: 'Avance de Visa Bancolombia',
      monto: 500_000, direccion: 'ingreso', icono: 'i-deudas', cuentaId: 'efe', dominio: 'compromisos',
    }]);
  });

  it('el Excel del mes la nombra como avance de tarjeta', () => {
    const [fila] = movimientosDesdeAvances([tarjeta({ avances: [{ id: 'av1', fecha: '2026-11-18', monto: 500_000, cuentaId: 'efe' }] })]);
    const [excel] = filasDelMesParaExcel([fila], '2026-11', [cuenta('efe', 'Efectivo', 0)]);
    expect(excel).toMatchObject({ Categoría: 'Avance de tarjeta', Cuenta: 'Efectivo', Entrada: 500_000 });
  });
});

/** Saca un avance como lo hará el formulario (AVC.1b): valida, normaliza, aplica y guarda. */
let _n = 0;
function sacarAvance(extra = {}) {
  const t = S.compromisos.find(c => c.id === 't1');
  const d = datos(extra);
  expect(validarAvance(d, { tarjeta: t, cuentas: S.cuentas })).toEqual([]);
  const avance = { id: `av-${++_n}`, ...normalizarAvance(d, t) };
  const r = aplicarAvance(t, S.cuentas, avance);
  editar('compromisos', t.id, r.tarjeta);
  editar('cuentas', r.cuenta.id, { saldo: r.cuenta.saldo });
  return avance;
}

const foto = () => JSON.parse(JSON.stringify({ cuentas: S.cuentas, compromisos: S.compromisos }));
const patrimonio = () => calcularActivos(S.cuentas, S.metas, S.apartados, S.inversiones, S.personales).total
  - calcularPasivos(S.compromisos).total;

describe('R-HF2 y patrimonio con un avance', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    S.cuentas = [cuenta('efe', 'Efectivo', 20_000), cuenta('nq', 'Nequi', 300_000)];
    S.compromisos = [tarjeta()];
  });

  it('el saldo de Efectivo es su apertura más sus filas', () => {
    const apertura = 20_000;
    sacarAvance();
    const movs = movimientosCompletos({ compromisos: S.compromisos });
    expect(S.cuentas.find(c => c.id === 'efe').saldo).toBe(apertura + efectoEnCuenta(movs, 'efe'));
    expect(efectoEnCuenta(movs, 'nq')).toBe(0);
  });

  it('el patrimonio solo baja la comisión (ADR 053)', () => {
    const antes = patrimonio();
    sacarAvance();
    expect(patrimonio()).toBe(antes - 9_870);
  });
});

// ── DESHACER (D6) ────────────────────────────────────────────────

describe('deshacer un avance (D6)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    S.cuentas = [cuenta('efe', 'Efectivo', 20_000), cuenta('nq', 'Nequi', 300_000)];
    S.compromisos = [tarjeta({ avances: [] })];
  });

  it('deja la cuenta y la tarjeta exactamente como antes', () => {
    const antes = foto();
    const avance = sacarAvance();
    const plan = planDeshacer(S, avance.id);
    expect(plan).toMatchObject({
      ok: true, tipo: 'avance', nombre: 'Avance de Visa Bancolombia', monto: 500_000,
      cuentas: { efe: -500_000 }, deudas: { t1: -509_870 }, cuotas: { t1: -25_649 },
    });
    expect(aplicarDeshacer(plan)).toBe(true);
    expect(foto()).toEqual(antes);
    expect(movimientosDesdeAvances(S.compromisos)).toEqual([]);
  });

  it('quita solo ese avance y deja los otros', () => {
    const primero = sacarAvance({ monto: '100000', comision: '' });
    const segundo = sacarAvance();
    expect(aplicarDeshacer(planDeshacer(S, segundo.id))).toBe(true);
    expect(S.compromisos[0].avances.map(a => a.id)).toEqual([primero.id]);
  });

  it('la confirmación dice qué sale de dónde', () => {
    const avance = sacarAvance();
    const mensaje = mensajeDeshacer(planDeshacer(S, avance.id), S);
    expect(mensaje).toContain('"Avance de Visa Bancolombia" de $500.000 sale de tus registros');
    expect(mensaje).toContain('$500.000 de Efectivo');
    expect(mensaje).toContain('"Visa Bancolombia" baja a $800.000');
  });

  it('no se deshace si el dinero ya se usó: la cuenta quedaría bajo $0', () => {
    const avance = sacarAvance();
    editar('cuentas', 'efe', { saldo: 120_000 });
    expect(planDeshacer(S, avance.id)).toEqual({
      ok: false, motivo: 'ya-usado',
      mensaje: 'Ese dinero ya salió de Efectivo. Si el avance está mal, corrige primero lo que pagaste con él.',
    });
  });

  it('no se deshace si la tarjeta ya se pagó por debajo del avance', () => {
    const avance = sacarAvance();
    editar('compromisos', 't1', { saldoTotal: 300_000 });
    expect(planDeshacer(S, avance.id)).toMatchObject({ ok: false, motivo: 'ya-pagada' });
  });

  it('no se deshace en una tarjeta archivada', () => {
    const avance = sacarAvance();
    editar('compromisos', 't1', { activo: false });
    expect(planDeshacer(S, avance.id)).toMatchObject({ ok: false, motivo: 'deuda-archivada' });
  });

  it('una cuenta borrada no bloquea: no hay saldo que devolverle', () => {
    const avance = sacarAvance();
    S.cuentas = S.cuentas.filter(c => c.id !== 'efe');
    const plan = planDeshacer(S, avance.id);
    expect(plan).toMatchObject({ ok: true, cuentas: {} });
    expect(aplicarDeshacer(plan)).toBe(true);
    expect(S.compromisos[0]).toMatchObject({ saldoTotal: 800_000, cuotaMensual: 120_000, avances: [] });
  });

  it('deshacer dos veces no devuelve el dinero dos veces', () => {
    const avance = sacarAvance();
    const plan = planDeshacer(S, avance.id);
    expect(aplicarDeshacer(plan)).toBe(true);
    const despues = foto();
    expect(aplicarDeshacer(plan)).toBe(false);
    expect(foto()).toEqual(despues);
    expect(planDeshacer(S, avance.id)).toMatchObject({ ok: false, motivo: 'no-existe' });
  });

  it('la huella mide lo que se quita, no los saldos que cambian alrededor', () => {
    const avance = sacarAvance();
    const huella = huellaPlan(planDeshacer(S, avance.id));
    expect(huella).not.toBe('');
    editar('cuentas', 'efe', { saldo: 900_000 });
    editar('compromisos', 't1', { saldoTotal: 2_000_000 });
    expect(huellaPlan(planDeshacer(S, avance.id))).toBe(huella);
  });
});

// ── MIGRACIÓN v56 ────────────────────────────────────────────────

describe('migración v56: avances en la tarjeta', () => {
  beforeEach(() => { Object.assign(S, createInitialState()); });

  it('un estado v55 sube a la versión vigente sin tocar sus tarjetas ni sus gastos', () => {
    const v55 = { ...createInitialState(), _version: 55 };
    v55.compromisos = [tarjeta()];
    v55.gastos = [{ id: 'g1', monto: 200_000, categoria: 'Otros', fecha: '2026-10-01', compromisoId: 't1', consumoTC: true, avanceTC: true }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v55));
    loadData();
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(56);
    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.compromisos[0]).toMatchObject(tarjeta());
    expect(S.compromisos[0].avances).toBeUndefined();
    expect(S.gastos[0]).toMatchObject({ avanceTC: true, consumoTC: true });
  });
});
