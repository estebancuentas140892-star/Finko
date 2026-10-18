/**
 * consumo-no-es-pago.test.js - una compra con la tarjeta no es un pago de la
 * tarjeta (BUG-037, ADR 051 D2 y D3, ADR 002).
 *
 * El consumo con tarjeta y el abono a esa misma tarjeta llevan el mismo
 * `compromisoId`; lo que los distingue es `consumoTC` (ADR 051 D3). Un consumo
 * sube la deuda y la cuota (D2), no sale de ninguna cuenta y **no cuenta como
 * lo pagado de la obligación**: ni en el estado del mes, ni en la fecha del
 * último abono, ni en lo que el Calendario, Por pagar, Inicio, los avisos, la
 * hoja de automáticos o Distribuir dan por cubierto.
 *
 * Un abono escrito por `infra/pago-compromiso.js` (Por pagar, Calendario,
 * Distribuir, débitos automáticos) no trae el campo `consumoTC`: la ausencia
 * vale como abono, igual que un `false` explícito.
 *
 * Dos bloques: la lógica pura con el reloj fijado lejos de las fechas
 * inyectadas (si algo leyera `new Date()`, falla cualquier día), y las rutas
 * reales de Gastos y Abonar desde sus formularios, con el reloj en la fecha del
 * escenario, porque ahí los handlers sí leen `hoy()`.
 *
 * Todos los datos son inventados.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import {
  calcularAbonosDelMes,
  estadoPagoMes,
  fechaUltimoAbono,
  vencidosSinPagar,
  compromisosProximos,
} from '../../modules/dominio/compromisos/logic.js';
import { eventosDelMes, pendientesDePagoDelMes, totalesDelMes } from '../../modules/dominio/agenda/logic.js';
import { normalizarGasto } from '../../modules/dominio/gastos/logic.js';
import { recolectarAvisos } from '../../modules/infra/avisos.js';
import { obligacionesYAportesDelCobro } from '../../modules/infra/vencimientos.js';
import { TARJETA_PREFIJO } from '../../modules/core/constants.js';
import { S, createInitialState } from '../../modules/core/state.js';
import { guardar } from '../../modules/infra/crud.js';
import { dispatch } from '../../modules/ui/actions.js';
import { vaciarRendersProgramados } from '../../modules/infra/render.js';
import { initGastos } from '../../modules/dominio/gastos/index.js';
import { initCompromisos } from '../../modules/dominio/compromisos/index.js';

// ── FIXTURES (inventados) ────────────────────────────────────────

const CREADO_ENERO = '2026-01-10T15:00:00.000Z';

/** Tarjeta operable (con cupo), cuota de $200.000, vence el 16. */
const tarjeta = (o = {}) => ({
  id: 'tc', descripcion: 'Tarjeta de prueba', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito',
  cupoTotal: 3_000_000, saldoTotal: 900_000, cuotaMensual: 200_000, frecuencia: 'Mensual', diaPago: 16,
  tasa: 0.28, tasaUnidad: 'EA', activo: true, fechaCreacion: CREADO_ENERO, ...o,
});

/** La misma tarjeta después de sumarle las compras (ADR 051 D2): saldo + monto, cuota + monto/cuotas. */
const tarjetaCon = (compras, o = {}) => {
  const base = tarjeta(o);
  return {
    ...base,
    saldoTotal:   base.saldoTotal   + compras.reduce((a, c) => a + c.monto, 0),
    cuotaMensual: base.cuotaMensual + compras.reduce((a, c) => a + Math.round(c.monto / (c.cuotas ?? 1)), 0),
  };
};

/** Compra con la tarjeta, con la forma exacta que escribe el formulario de Gastos. */
let _n = 0;
const compra = (fecha, monto, cuotas = 1, tarjetaId = 'tc') => ({
  id: `compra-${++_n}`,
  ...normalizarGasto({
    monto: String(monto), categoria: 'Restaurantes', fecha,
    cuentaId: `${TARJETA_PREFIJO}${tarjetaId}`, cuotas: String(cuotas),
  }),
});

/** Abono como lo escribe `infra/pago-compromiso.js`: sin campo `consumoTC`. */
const abono = (compromisoId, fecha, monto) => ({
  id: `abono-${++_n}`, descripcion: 'Abono: Tarjeta de prueba', monto, categoria: 'Deudas',
  fecha, cuentaId: 'cta', nota: '', compromisoId,
});

/** Abono editado desde el formulario de Gastos: `consumoTC` explícito en false. */
const abonoEditado = (compromisoId, fecha, monto) => ({ ...abono(compromisoId, fecha, monto), consumoTC: false });

const prestamo = (o = {}) => ({
  id: 'prestamo', descripcion: 'Préstamo de un amigo', tipo: 'deuda-personal', categoria: 'Familiar',
  saldoTotal: 500_000, cuotaMensual: 100_000, frecuencia: 'Mensual', diaPago: 10,
  activo: true, fechaCreacion: CREADO_ENERO, ...o,
});

const arriendo = (o = {}) => ({
  id: 'arriendo', descripcion: 'Arriendo', tipo: 'fijo', categoria: 'Vivienda',
  monto: 1_200_000, frecuencia: 'Mensual', diaPago: 5, activo: true, fechaCreacion: CREADO_ENERO, ...o,
});

const pagoFijo = (compromisoId, fecha, monto) => ({
  id: `pago-${++_n}`, descripcion: 'Pago: Arriendo', monto, categoria: 'Gastos fijos',
  fecha, cuentaId: 'cta', nota: '', compromisoId,
});

// ── HELPERS ──────────────────────────────────────────────────────

/** Mediodía local de la fecha: el criterio con el que el motor de avisos arma su `Date`. */
const ref = iso => new Date(`${iso}T12:00:00`);

/** Ids de los avisos de compromisos que el motor genera ese día. */
const avisosDe = (compromisos, gastos, hoyISO) =>
  recolectarAvisos({ compromisos, gastos, hoyISO }).filter(a => a.seccion === 'compromisos').map(a => a.id);

/** Eventos del Calendario para el mes 'YYYY-MM'. */
const eventosDe = (compromisos, prefijo) => {
  const [y, m] = prefijo.split('-').map(Number);
  return eventosDelMes(compromisos, y, m - 1);
};

/** Fija el reloj lejos de cualquier fecha inyectada. */
function relojLejano() {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2031, 5, 3, 9)); });
  afterEach(()  => { vi.useRealTimers(); });
}

// ── 1 a 3: SIN PAGOS NO HAY NADA PAGADO ──────────────────────────

describe('BUG-037 - una compra con la tarjeta no la deja pagada', () => {
  relojLejano();

  it('1. tarjeta sin compras ni pagos: estado ninguno', () => {
    const tc = tarjeta();
    expect(calcularAbonosDelMes([], 'tc', '2026-02')).toBe(0);
    expect(estadoPagoMes([], tc, '2026-02')).toBe('ninguno');
  });

  it('2. compra de $600.000 a seis cuotas sin ningún pago: estado ninguno, nada abonado', () => {
    const g = compra('2026-02-10', 600_000, 6);
    const tc = tarjetaCon([g]);
    expect(tc.cuotaMensual).toBe(300_000); // la regla de cuotas del ADR 051 D2 no cambia
    expect(calcularAbonosDelMes([g], 'tc', '2026-02')).toBe(0);
    expect(estadoPagoMes([g], tc, '2026-02')).toBe('ninguno');
  });

  it('3. compra a una cuota sin ningún pago: estado ninguno, no parcial', () => {
    const g = compra('2026-02-10', 600_000, 1);
    const tc = tarjetaCon([g]);
    expect(tc.cuotaMensual).toBe(800_000);
    expect(calcularAbonosDelMes([g], 'tc', '2026-02')).toBe(0);
    expect(estadoPagoMes([g], tc, '2026-02')).toBe('ninguno');
  });

  it('6. varias compras en el mes, que juntas superan la cuota, sin pagos: no queda pagada', () => {
    const compras = [
      compra('2026-02-03', 300_000, 6),
      compra('2026-02-09', 300_000, 6),
      compra('2026-02-14', 600_000, 6),
    ];
    const tc = tarjetaCon(compras);
    expect(tc.cuotaMensual).toBe(400_000);
    expect(calcularAbonosDelMes(compras, 'tc', '2026-02')).toBe(0);
    expect(estadoPagoMes(compras, tc, '2026-02')).toBe('ninguno');
  });
});

// ── 4, 5 y 7: EL ESTADO SALE SOLO DE LOS ABONOS ──────────────────

describe('BUG-037 - el estado de pago de la tarjeta sale solo de sus abonos', () => {
  relojLejano();

  it('4. compra y abono real de $50.000: abonado $50.000, estado parcial', () => {
    const g = compra('2026-02-10', 600_000, 6);
    const tc = tarjetaCon([g]);
    const gastos = [g, abono('tc', '2026-02-12', 50_000)];
    expect(calcularAbonosDelMes(gastos, 'tc', '2026-02')).toBe(50_000);
    expect(estadoPagoMes(gastos, tc, '2026-02')).toBe('parcial');
  });

  it('5. compra y abono que cubre la cuota: completo; un peso menos sigue parcial', () => {
    const g = compra('2026-02-10', 600_000, 6);
    const tc = tarjetaCon([g]);
    expect(estadoPagoMes([g, abono('tc', '2026-02-12', 300_000)], tc, '2026-02')).toBe('completo');
    expect(estadoPagoMes([g, abono('tc', '2026-02-12', 299_999)], tc, '2026-02')).toBe('parcial');
  });

  it('5b. un abono con consumoTC false explícito (editado desde Gastos) también cuenta', () => {
    const g = compra('2026-02-10', 600_000, 6);
    const tc = tarjetaCon([g]);
    const gastos = [g, abonoEditado('tc', '2026-02-12', 300_000)];
    expect(calcularAbonosDelMes(gastos, 'tc', '2026-02')).toBe(300_000);
    expect(estadoPagoMes(gastos, tc, '2026-02')).toBe('completo');
  });

  it('7. compra en febrero y pago en marzo: cada mes con su estado y la fecha del pago', () => {
    const g = compra('2026-02-10', 600_000, 6);
    const tc = tarjetaCon([g]);
    const pago = abono('tc', '2026-03-05', 300_000);
    const gastos = [g, pago];
    expect(estadoPagoMes(gastos, tc, '2026-02')).toBe('ninguno');
    expect(estadoPagoMes(gastos, tc, '2026-03')).toBe('completo');
    expect(fechaUltimoAbono(gastos, 'tc')).toBe('2026-03-05');
  });

  it('7b. una compra posterior al último pago no mueve la fecha del último abono', () => {
    const gastos = [abono('tc', '2026-03-05', 300_000), compra('2026-03-20', 90_000)];
    expect(fechaUltimoAbono(gastos, 'tc')).toBe('2026-03-05');
  });

  it('7c. con solo compras no hay fecha de último abono', () => {
    expect(fechaUltimoAbono([compra('2026-02-10', 600_000, 6), compra('2026-03-01', 40_000)], 'tc')).toBeNull();
  });
});

// ── 9: CALENDARIO, POR PAGAR, INICIO, AVISOS Y DISTRIBUIR ────────

describe('BUG-037 - con solo compras el vencimiento de la tarjeta sigue en todas las superficies', () => {
  relojLejano();

  const g  = compra('2026-02-10', 600_000, 6);
  const tc = tarjetaCon([g]);

  it('avisos: vencida y sin pagar el 18 de febrero', () => {
    expect(avisosDe([tc], [g], '2026-02-18')).toContain('compromiso-vencido:tc');
  });

  it('Inicio y Por pagar: sigue entre los vencidos sin pagar', () => {
    expect(vencidosSinPagar([tc], [g], '2026-02-18').map(v => v.id)).toEqual(['tc']);
  });

  it('Inicio: antes de vencer anuncia el 16 de febrero aunque ya haya compras', () => {
    const p = compromisosProximos([tc], 7, ref('2026-02-14'), [g]);
    expect(p.map(x => [x.id, x.fechaVencimiento])).toEqual([['tc', '2026-02-16']]);
    expect(avisosDe([tc], [g], '2026-02-14')).toContain('compromiso-proximo:tc');
  });

  it('Calendario: la hoja de automáticos ofrece la cuota completa y el hero no la da por pagada', () => {
    const eventos = eventosDe([tc], '2026-02');
    expect(pendientesDePagoDelMes(eventos, [g], '2026-02', '2026-02-18'))
      .toEqual([expect.objectContaining({ id: 'tc', monto: 300_000, parcial: false })]);
    expect(totalesDelMes(eventos, [g], '2026-02')).toEqual({ total: 300_000, pagado: 0 });
  });

  it('Calendario: con compra y abono de $50.000 cuenta solo el abono', () => {
    const gastos = [g, abono('tc', '2026-02-12', 50_000)];
    const eventos = eventosDe([tc], '2026-02');
    expect(pendientesDePagoDelMes(eventos, gastos, '2026-02', '2026-02-18'))
      .toEqual([expect.objectContaining({ id: 'tc', monto: 250_000, parcial: true })]);
    expect(totalesDelMes(eventos, gastos, '2026-02').pagado).toBe(50_000);
  });

  it('Distribuir: una compra dentro de la ventana no cuenta como lo pagado de la tarjeta', () => {
    const hoy = compra('2026-02-14', 600_000, 6);
    const r = obligacionesYAportesDelCobro({
      cobro: { frecuencia: 'Mensual', fechaISO: '2026-02-14' },
      compromisos: [tarjetaCon([hoy])], gastos: [hoy], hoyISO: '2026-02-14',
    });
    expect(r.enVentana.map(o => [o.id, o.montoPagado, o.pagado])).toEqual([['tc', 0, false]]);
  });
});

// ── 10: PAGOS REALES Y DEUDAS QUE NO SON TARJETA ─────────────────

describe('BUG-037 - los pagos reales siguen contando', () => {
  relojLejano();

  it('abono a una deuda personal (sin campo consumoTC): cuenta y la completa', () => {
    const gastos = [abono('prestamo', '2026-02-08', 100_000)];
    expect(calcularAbonosDelMes(gastos, 'prestamo', '2026-02')).toBe(100_000);
    expect(estadoPagoMes(gastos, prestamo(), '2026-02')).toBe('completo');
    expect(fechaUltimoAbono(gastos, 'prestamo')).toBe('2026-02-08');
  });

  it('pago de un gasto fijo: completo, fuera de la hoja y sumado al hero del Calendario', () => {
    const c = arriendo();
    const gastos = [pagoFijo('arriendo', '2026-02-04', 1_200_000)];
    expect(estadoPagoMes(gastos, c, '2026-02')).toBe('completo');
    const eventos = eventosDe([c], '2026-02');
    expect(pendientesDePagoDelMes(eventos, gastos, '2026-02', '2026-02-18')).toEqual([]);
    expect(totalesDelMes(eventos, gastos, '2026-02')).toEqual({ total: 1_200_000, pagado: 1_200_000 });
  });

  it('una deuda pagada no avisa aunque la tarjeta del mismo usuario solo tenga compras', () => {
    const g = compra('2026-02-10', 600_000, 6);
    const compromisos = [tarjetaCon([g]), prestamo()];
    const gastos = [g, abono('prestamo', '2026-02-08', 100_000)];
    const avisos = avisosDe(compromisos, gastos, '2026-02-18');
    expect(avisos).toContain('compromiso-vencido:tc');
    expect(avisos).not.toContain('compromiso-vencido:prestamo');
  });

  it('Distribuir: el pago real de la tarjeta en la ventana sí la cubre', () => {
    const g = compra('2026-02-14', 600_000, 6);
    const r = obligacionesYAportesDelCobro({
      cobro: { frecuencia: 'Mensual', fechaISO: '2026-02-14' },
      compromisos: [tarjetaCon([g])], gastos: [g, abono('tc', '2026-02-14', 300_000)], hoyISO: '2026-02-14',
    });
    expect(r.enVentana.map(o => [o.id, o.montoPagado, o.pagado])).toEqual([['tc', 300_000, true]]);
  });
});

// ── 4, 5 y 8 POR LAS RUTAS REALES: FORMULARIOS DE GASTOS Y ABONAR ─
//
// Los consumos, abonos, ediciones y borrados los escriben los handlers de
// producción desde sus formularios (`data-action` + `submit`), sobre los
// modales reales de `index.html`. Nada de lo que se afirma lo arma la prueba.

const HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

function montarModales(ids) {
  const cuerpo = HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/gi, '');
  const tmp = document.createElement('div');
  tmp.innerHTML = cuerpo;
  document.body.innerHTML = `<div class="app-shell"></div>${ids.map(id => tmp.querySelector(`#${id}`).outerHTML).join('')}`;
}

function fijarDia(fechaISO) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  vi.setSystemTime(new Date(a, m - 1, d, 10, 0, 0));
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

/** Llena por `name` (radios incluidos) y envía; falla si el formulario no guardó. */
async function enviar(formId, valores) {
  const form = document.getElementById(formId);
  if (!form) throw new Error(`No está abierto #${formId}`);
  for (const [name, valor] of Object.entries(valores)) {
    const campos = [...form.querySelectorAll(`[name="${name}"]`)];
    if (campos.length === 0) throw new Error(`#${formId} no tiene el campo "${name}"`);
    let tocado = campos[0];
    if (campos[0].type === 'radio') {
      for (const c of campos) c.checked = c.value === String(valor);
      tocado = campos.find(c => c.checked);
      if (!tocado) throw new Error(`"${name}" no ofrece "${valor}" en #${formId}`);
    } else {
      campos[0].value = String(valor);
    }
    tocado.dispatchEvent(new Event('input', { bubbles: true }));
    tocado.dispatchEvent(new Event('change', { bubbles: true }));
  }
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  await esperar();
  const errores = form.querySelector('.form-errors');
  if (errores) throw new Error(`#${formId} no se guardó: ${errores.textContent.replace(/\s+/g, ' ').trim()}`);
}

/** Acepta el diálogo de confirmación abierto (borrar un gasto). */
async function confirmarDialogo() {
  await esperar();
  const d = document.querySelector('body > .modal-overlay[data-open]:not([id])');
  if (!d) throw new Error('No apareció el diálogo de confirmación');
  d.querySelector('[data-role="confirmar"]').click();
  await esperar();
}

const comprarConTarjeta = async (monto, fecha, cuotas) => {
  accion('nuevo-gasto');
  await enviar('form-gasto', { monto, categoria: 'Restaurantes', fechaOpcion: 'otra', fecha, cuentaId: `${TARJETA_PREFIJO}tc`, cuotas });
  return S.gastos.at(-1);
};

const abonarTarjeta = async (monto, fecha) => {
  accion('abrir-abono', { id: 'tc' });
  await enviar('form-abono', { monto, fecha, cuentaId: 'cta' });
  return S.gastos.at(-1);
};

const tc  = () => S.compromisos.find(c => c.id === 'tc');
const cta = () => S.cuentas.find(c => c.id === 'cta');

describe('BUG-037 - rutas reales: comprar, abonar, editar y borrar', () => {
  let zonaOriginal;

  beforeAll(() => {
    zonaOriginal = process.env.TZ;
    process.env.TZ = 'America/Bogota';
    vi.useFakeTimers({ toFake: ['Date'] });
    montarModales(['modal-gasto', 'modal-abono']);
    location.hash = '#bug-037'; // ninguna sección coincide: los renders reactivos se saltan
    initGastos();
    initCompromisos();
  });

  afterAll(() => {
    vi.useRealTimers();
    if (zonaOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = zonaOriginal;
  });

  beforeEach(() => {
    Object.assign(S, createInitialState());
    S.onboarded = true;
    fijarDia('2026-01-20');
    guardar('cuentas', { id: 'cta', nombre: 'Cuenta de prueba', banco: 'Otro', tipo: 'Ahorros', saldo: 1_000_000, activa: true });
    guardar('compromisos', tarjeta());
    fijarDia('2026-02-10');
  });

  it('la compra sube deuda y cuota, no toca la cuenta y no deja la tarjeta pagada', async () => {
    const g = await comprarConTarjeta(600_000, '2026-02-10', 6);
    expect(g).toMatchObject({ compromisoId: 'tc', consumoTC: true, cuentaId: null });
    expect(tc()).toMatchObject({ saldoTotal: 1_500_000, cuotaMensual: 300_000 });
    expect(cta().saldo).toBe(1_000_000);
    expect(estadoPagoMes(S.gastos, tc(), '2026-02')).toBe('ninguno');
    expect(avisosDe(S.compromisos, S.gastos, '2026-02-18')).toContain('compromiso-vencido:tc');
  });

  it('4. compra y abono real de $50.000 desde Abonar: parcial, solo cuenta el abono', async () => {
    await comprarConTarjeta(600_000, '2026-02-10', 6);
    const a = await abonarTarjeta(50_000, '2026-02-12');
    expect(a).toMatchObject({ compromisoId: 'tc', cuentaId: 'cta', monto: 50_000 });
    expect(a.consumoTC).toBeFalsy();
    expect(cta().saldo).toBe(950_000);
    expect(tc().saldoTotal).toBe(1_450_000);
    expect(calcularAbonosDelMes(S.gastos, 'tc', '2026-02')).toBe(50_000);
    expect(estadoPagoMes(S.gastos, tc(), '2026-02')).toBe('parcial');
  });

  it('5. compra y abono que cubre la cuota desde Abonar: completo y sin aviso', async () => {
    await comprarConTarjeta(600_000, '2026-02-10', 6);
    await abonarTarjeta(300_000, '2026-02-12');
    expect(estadoPagoMes(S.gastos, tc(), '2026-02')).toBe('completo');
    expect(avisosDe(S.compromisos, S.gastos, '2026-02-18')).not.toContain('compromiso-vencido:tc');
  });

  it('8. editar el monto de la compra la deja como compra: ni abono ni pago', async () => {
    const g = await comprarConTarjeta(600_000, '2026-02-10', 6);
    accion('editar-gasto', { id: g.id });
    await enviar('form-gasto', { monto: 900_000 });
    const editado = S.gastos.find(x => x.id === g.id);
    expect(editado).toMatchObject({ compromisoId: 'tc', consumoTC: true, cuentaId: null, monto: 900_000 });
    expect(tc()).toMatchObject({ saldoTotal: 1_800_000, cuotaMensual: 350_000 });
    expect(cta().saldo).toBe(1_000_000);
    expect(calcularAbonosDelMes(S.gastos, 'tc', '2026-02')).toBe(0);
    expect(estadoPagoMes(S.gastos, tc(), '2026-02')).toBe('ninguno');
    expect(fechaUltimoAbono(S.gastos, 'tc')).toBeNull();
  });

  it('8b. borrar la compra deja solo el abono como pagado', async () => {
    const g = await comprarConTarjeta(600_000, '2026-02-10', 6);
    await abonarTarjeta(50_000, '2026-02-12');
    accion('eliminar-gasto', { id: g.id });
    await confirmarDialogo();
    expect(S.gastos.some(x => x.id === g.id)).toBe(false);
    expect(tc()).toMatchObject({ saldoTotal: 850_000, cuotaMensual: 200_000 });
    expect(calcularAbonosDelMes(S.gastos, 'tc', '2026-02')).toBe(50_000);
    expect(estadoPagoMes(S.gastos, tc(), '2026-02')).toBe('parcial');
    expect(fechaUltimoAbono(S.gastos, 'tc')).toBe('2026-02-12');
  });

  it('8c. borrar la única compra: la tarjeta queda sin nada pagado y vuelve a avisar', async () => {
    const g = await comprarConTarjeta(600_000, '2026-02-10', 1);
    accion('eliminar-gasto', { id: g.id });
    await confirmarDialogo();
    expect(tc()).toMatchObject({ saldoTotal: 900_000, cuotaMensual: 200_000 });
    expect(estadoPagoMes(S.gastos, tc(), '2026-02')).toBe('ninguno');
    expect(avisosDe(S.compromisos, S.gastos, '2026-02-18')).toContain('compromiso-vencido:tc');
  });
});
