/**
 * vencimiento-unico.test.js - una sola regla de vencimiento (HF.0d, BUG-031,
 * ADR 041 y ADR 066).
 *
 * Calendario, Inicio, Por pagar y el motor de avisos tienen que leer la misma
 * fecha y el mismo estado de pago de cada compromiso. El Calendario es la
 * referencia: sus piezas (`eventosDelMes` sobre `ocurrenciasEnMes`, y
 * `estadoPagoMes` por mes) ya respetaban la frecuencia y los pagos. Las otras
 * tres superficies se comparan contra esas piezas, no contra una copia de la
 * regla escrita en el test.
 *
 * El estado de pago es **por mes** (`estadoPagoMes`): un gasto vinculado en el
 * mes cubre todas las ocurrencias de ese mes. Con un quincenal eso no distingue
 * la primera quincena de la segunda, y un pago hecho en el mes anterior no
 * cubre el vencimiento del mes siguiente. Son límites del modelo, no de esta
 * regla, y los tests que los fijan lo dicen en su nombre.
 *
 * Todos los datos son inventados. Las pruebas de lógica corren con el reloj
 * fijado años después de la fecha que inyectan: si alguna superficie volviera a
 * leer `new Date()`, fallan cualquier día. Las de render fijan el reloj en la
 * fecha del escenario, porque en la app las vistas sí leen el reloj.
 *
 * Las `fechaCreacion` van a las 15:00 UTC (10:00 en Colombia): la fecha es la
 * misma en UTC y en hora local, así que nada de esto depende de BUG-025 (HF.0e).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  compromisosProximos,
  proximoVencimiento,
  urgencia,
  vencidosSinPagar,
  estadoPagoMes,
} from '../../modules/dominio/compromisos/logic.js';
import { eventosDelMes, pendientesDePagoDelMes } from '../../modules/dominio/agenda/logic.js';
import { recolectarAvisos } from '../../modules/infra/avisos.js';
import { renderListaCompromisos, setFiltroPorPagar } from '../../modules/dominio/compromisos/views/lista.js';
import { renderPanelPrioridades, renderPanelVencidos } from '../../modules/dominio/compromisos/views/dashboard.js';
import { irAMesActualBloque } from '../../modules/infra/mes-bloque.js';
import { S } from '../../modules/core/state.js';

// ── FIXTURES (inventados) ────────────────────────────────────────

const CREADO_ENERO = '2026-01-10T15:00:00.000Z';
const CREADO_AGOSTO = '2026-08-05T15:00:00.000Z';

const internet = (o = {}) => ({
  id: 'internet', descripcion: 'Internet', tipo: 'fijo', categoria: 'Servicios',
  monto: 100_000, frecuencia: 'Mensual', diaPago: 18, activo: true,
  fechaCreacion: CREADO_ENERO, ...o,
});

/** Bimestral creado en agosto: su ciclo es agosto, octubre, diciembre, febrero. */
const seguro = (o = {}) => ({
  id: 'seguro', descripcion: 'Seguro del carro', tipo: 'fijo', categoria: 'Transporte',
  monto: 200_000, frecuencia: 'Bimestral', diaPago: 10, activo: true,
  fechaCreacion: CREADO_AGOSTO, ...o,
});

/** Trimestral creado en agosto: agosto, noviembre, febrero. */
const club = (o = {}) => ({
  id: 'club', descripcion: 'Club deportivo', tipo: 'fijo', categoria: 'Entretenimiento',
  monto: 150_000, frecuencia: 'Trimestral', diaPago: 20, activo: true,
  fechaCreacion: CREADO_AGOSTO, ...o,
});

/** Anual creado en marzo de 2026: vence cada 15 de marzo. */
const dominio = (o = {}) => ({
  id: 'dominio', descripcion: 'Renovación de dominio', tipo: 'fijo', categoria: 'Servicios',
  monto: 80_000, frecuencia: 'Anual', diaPago: 15, activo: true,
  fechaCreacion: '2026-03-02T15:00:00.000Z', ...o,
});

/** Quincenal de día 5: cae el 5 y el 20 de cada mes. */
const gimnasio = (o = {}) => ({
  id: 'gimnasio', descripcion: 'Gimnasio', tipo: 'fijo', categoria: 'Salud',
  monto: 50_000, frecuencia: 'Quincenal', diaPago: 5, activo: true,
  fechaCreacion: CREADO_ENERO, ...o,
});

const tarjeta = (o = {}) => ({
  id: 'tarjeta', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito',
  saldoTotal: 2_000_000, cuotaMensual: 300_000, frecuencia: 'Mensual', diaPago: 18,
  tasa: 0.28, tasaUnidad: 'EA', activo: true, fechaCreacion: CREADO_ENERO, ...o,
});

const pago = (compromisoId, fecha, monto) => ({
  id: `g-${compromisoId}-${fecha}`, compromisoId, fecha, monto,
  categoria: 'Servicios', descripcion: 'Pago',
});

// ── HELPERS ──────────────────────────────────────────────────────

/** Mediodía local de la fecha: el mismo criterio con el que el motor de avisos arma su `Date`. */
const ref = iso => new Date(`${iso}T12:00:00`);

/** Los avisos de compromisos que el motor genera para ese día. */
const avisosDe = (compromisos, gastos, hoyISO) =>
  recolectarAvisos({ compromisos, gastos, hoyISO }).filter(a => a.seccion === 'compromisos');

/** El próximo pendiente de un solo compromiso, como lo entrega Inicio (o `undefined`). */
const proximoDe = (c, gastos, hoyISO, dias = 400) =>
  compromisosProximos([c], dias, ref(hoyISO), gastos)[0];

/**
 * Próxima fecha pendiente según el Calendario, armada solo con sus piezas: los
 * días en que pinta el compromiso (`eventosDelMes`) y el estado del mes que usa
 * para marcarlo pagado (`estadoPagoMes`). No sabe nada de la regla nueva.
 */
function proximaSegunCalendario(c, gastos, hoyISO, meses = 14) {
  const [y, m] = hoyISO.split('-').map(Number);
  for (let i = 0; i < meses; i++) {
    const inicio  = new Date(y, m - 1 + i, 1);
    const anio    = inicio.getFullYear();
    const mes     = inicio.getMonth();
    const prefijo = `${anio}-${String(mes + 1).padStart(2, '0')}`;
    if (estadoPagoMes(gastos, c, prefijo) === 'completo') continue;
    const dias = Object.keys(eventosDelMes([c], anio, mes)).map(Number).sort((a, b) => a - b);
    for (const dia of dias) {
      const fecha = `${prefijo}-${String(dia).padStart(2, '0')}`;
      if (fecha >= hoyISO) return fecha;
    }
  }
  return null;
}

/** Fija el reloj lejos de cualquier fecha inyectada. */
function relojLejano() {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2031, 5, 3, 9)); });
  afterEach(()  => { vi.useRealTimers(); });
}

// ── PROBLEMA A: pagado antes de vencer ───────────────────────────

describe('HF.0d - pagado antes de vencer no sigue avisando', () => {
  relojLejano();

  const HOY = '2026-10-17';
  const gastos = [pago('internet', '2026-10-15', 100_000)];

  it('Por pagar reconoce el pago: estado completo y fuera del lote', () => {
    expect(estadoPagoMes(gastos, internet(), '2026-10')).toBe('completo');
    const eventos = eventosDelMes([internet()], 2026, 9);
    expect(pendientesDePagoDelMes(eventos, gastos, '2026-10', HOY)).toEqual([]);
  });

  it('el Calendario lo pinta el 18 y lo marca pagado', () => {
    const eventos = eventosDelMes([internet()], 2026, 9);
    expect(eventos[18].map(e => e.id)).toEqual(['internet']);
    expect(estadoPagoMes(gastos, eventos[18][0], '2026-10')).toBe('completo');
  });

  it('Inicio no lo anuncia como pendiente', () => {
    expect(compromisosProximos([internet()], 7, ref(HOY), gastos)).toEqual([]);
    expect(vencidosSinPagar([internet()], gastos, HOY)).toEqual([]);
  });

  it('el motor de avisos no genera "Internet vence mañana" ni ningún otro aviso del compromiso', () => {
    expect(avisosDe([internet()], gastos, HOY)).toEqual([]);
  });

  it('el siguiente vencimiento legítimo sigue la frecuencia: 18 de noviembre, igual que el Calendario', () => {
    const p = proximoDe(internet(), gastos, HOY);
    expect(p.fechaVencimiento).toBe('2026-11-18');
    expect(p.diasRestantes).toBe(32);
    expect(p.fechaVencimiento).toBe(proximaSegunCalendario(internet(), gastos, HOY));
  });

  it('control: sin el pago, el mismo día sí avisa que vence mañana', () => {
    const avisos = avisosDe([internet()], [], HOY);
    expect(avisos.map(a => [a.tipo, a.dias, a.severidad])).toEqual([['compromiso-proximo', 1, 'alta']]);
  });

  it('una deuda con la cuota completa abonada antes de vencer tampoco avisa', () => {
    const abono = [pago('tarjeta', '2026-10-12', 300_000)];
    expect(avisosDe([tarjeta()], abono, HOY)).toEqual([]);
    expect(compromisosProximos([tarjeta()], 7, ref(HOY), abono)).toEqual([]);
  });

  it('una deuda con abono parcial sigue pendiente: avisa y sale en Inicio', () => {
    const abono = [pago('tarjeta', '2026-10-12', 100_000)];
    expect(estadoPagoMes(abono, tarjeta(), '2026-10')).toBe('parcial');
    expect(avisosDe([tarjeta()], abono, HOY).map(a => [a.tipo, a.dias])).toEqual([['compromiso-proximo', 1]]);
    expect(compromisosProximos([tarjeta()], 7, ref(HOY), abono).map(c => c.id)).toEqual(['tarjeta']);
  });

  it('en ningún día del mes pagado aparece un aviso del compromiso', () => {
    const pagoTemprano = [pago('internet', '2026-10-01', 100_000)];
    for (let dia = 1; dia <= 31; dia++) {
      const hoyISO = `2026-10-${String(dia).padStart(2, '0')}`;
      expect(avisosDe([internet()], pagoTemprano, hoyISO), hoyISO).toEqual([]);
    }
  });
});

// ── PROBLEMA B: bimestral ────────────────────────────────────────

describe('HF.0d - un bimestral vence solo en los meses de su ciclo', () => {
  relojLejano();

  it('el Calendario lo pinta en octubre y no en septiembre ni noviembre', () => {
    expect(eventosDelMes([seguro()], 2026, 8)).toEqual({});
    expect(Object.keys(eventosDelMes([seguro()], 2026, 9))).toEqual(['10']);
    expect(eventosDelMes([seguro()], 2026, 10)).toEqual({});
  });

  it('en septiembre su próximo vencimiento es el 10 de octubre en Inicio y en Por pagar', () => {
    const HOY = '2026-09-08';
    const p = proximoDe(seguro(), [], HOY);
    expect(p.fechaVencimiento).toBe('2026-10-10');
    expect(p.diasRestantes).toBe(32);
    expect(proximoVencimiento(seguro(), ref(HOY))).toBe(32);
    expect(urgencia(seguro(), ref(HOY))).toBe('normal');
    expect(p.fechaVencimiento).toBe(proximaSegunCalendario(seguro(), [], HOY));
  });

  it('en septiembre no avisa que vence ni que se venció', () => {
    expect(avisosDe([seguro()], [], '2026-09-08')).toEqual([]);
    expect(avisosDe([seguro()], [], '2026-09-15')).toEqual([]);
  });

  it('en septiembre no cuenta como vencido en Inicio ni en Por pagar', () => {
    expect(vencidosSinPagar([seguro()], [], '2026-09-15')).toEqual([]);
    const eventos = eventosDelMes([seguro()], 2026, 8);
    expect(pendientesDePagoDelMes(eventos, [], '2026-09', '2026-09-15')).toEqual([]);
  });

  it('en su mes avisa con la fecha del Calendario', () => {
    const HOY = '2026-10-08';
    expect(avisosDe([seguro()], [], HOY).map(a => [a.tipo, a.dias])).toEqual([['compromiso-proximo', 2]]);
    expect(proximoDe(seguro(), [], HOY).fechaVencimiento).toBe('2026-10-10');
  });

  it('vencido y sin pagar en su mes sigue apareciendo; pagado deja de aparecer', () => {
    expect(vencidosSinPagar([seguro()], [], '2026-10-12').map(v => [v.id, v.diasAtraso])).toEqual([['seguro', 2]]);
    const gastos = [pago('seguro', '2026-10-12', 200_000)];
    expect(vencidosSinPagar([seguro()], gastos, '2026-10-12')).toEqual([]);
    expect(avisosDe([seguro()], gastos, '2026-10-12')).toEqual([]);
  });

  it('pagado el de octubre, el siguiente es el 10 de diciembre: no se suma un mes', () => {
    const gastos = [pago('seguro', '2026-10-09', 200_000)];
    const p = proximoDe(seguro(), gastos, '2026-10-17');
    expect(p.fechaVencimiento).toBe('2026-12-10');
    expect(p.diasRestantes).toBe(54);
    expect(p.fechaVencimiento).toBe(proximaSegunCalendario(seguro(), gastos, '2026-10-17'));
  });
});

// ── PROBLEMA C: quincenal ────────────────────────────────────────

describe('HF.0d - un quincenal cae el mismo día en todas las secciones', () => {
  relojLejano();

  it('el Calendario lo pinta el 5 y el 20', () => {
    expect(Object.keys(eventosDelMes([gimnasio()], 2026, 9))).toEqual(['5', '20']);
  });

  it('creado después del 5, su próximo vencimiento es el 20, no el 5 del mes siguiente', () => {
    const c = gimnasio({ fechaCreacion: '2026-10-10T15:00:00.000Z' });
    const HOY = '2026-10-18';
    const p = proximoDe(c, [], HOY);
    expect(p.fechaVencimiento).toBe('2026-10-20');
    expect(p.diasRestantes).toBe(2);
    expect(p.fechaVencimiento).toBe(proximaSegunCalendario(c, [], HOY));
    expect(avisosDe([c], [], HOY).map(a => [a.tipo, a.dias])).toEqual([['compromiso-proximo', 2]]);
    expect(vencidosSinPagar([c], [], HOY)).toEqual([]);
  });

  it('con el mes sin pagar y la primera quincena vencida, hay un solo aviso: el vencido', () => {
    for (const hoyISO of ['2026-10-18', '2026-10-19', '2026-10-20']) {
      const avisos = avisosDe([gimnasio()], [], hoyISO);
      expect(avisos.map(a => a.tipo), hoyISO).toEqual(['compromiso-vencido']);
    }
    // Inicio tampoco lo lista dos veces: está en "Ya se venció", no en los próximos.
    expect(compromisosProximos([gimnasio()], 7, ref('2026-10-18'), [])).toEqual([]);
    expect(vencidosSinPagar([gimnasio()], [], '2026-10-18').map(v => v.diasAtraso)).toEqual([13]);
  });

  it('antes de la primera quincena avisa el 5 con la fecha del Calendario', () => {
    expect(avisosDe([gimnasio()], [], '2026-10-03').map(a => [a.tipo, a.dias])).toEqual([['compromiso-proximo', 2]]);
    expect(proximoDe(gimnasio(), [], '2026-10-03').fechaVencimiento).toBe('2026-10-05');
  });

  it('limitación documentada: el estado de pago es por mes y un pago cubre las dos quincenas', () => {
    const gastos = [pago('gimnasio', '2026-10-05', 50_000)];
    // El Calendario ya pinta pagada la del 20: el modelo no sabe a qué quincena
    // pertenece un gasto, así que Inicio y los avisos leen lo mismo que él.
    expect(estadoPagoMes(gastos, gimnasio(), '2026-10')).toBe('completo');
    expect(avisosDe([gimnasio()], gastos, '2026-10-18')).toEqual([]);
    const p = proximoDe(gimnasio(), gastos, '2026-10-18');
    expect(p.fechaVencimiento).toBe('2026-11-05');
    expect(p.fechaVencimiento).toBe(proximaSegunCalendario(gimnasio(), gastos, '2026-10-18'));
  });

  it('en febrero la segunda quincena se clampea al 28, igual que en el Calendario', () => {
    const c = gimnasio({ diaPago: 14, fechaCreacion: '2027-02-20T15:00:00.000Z' });
    expect(Object.keys(eventosDelMes([c], 2027, 1))).toEqual(['14', '28']);
    const p = proximoDe(c, [], '2027-02-26');
    expect(p.fechaVencimiento).toBe('2027-02-28');
    expect(p.diasRestantes).toBe(2);
  });
});

// ── PROBLEMA D: vencimientos reales ──────────────────────────────

describe('HF.0d - vencimientos reales', () => {
  relojLejano();

  const HOY = '2026-10-17';

  it('vence hoy: aviso próximo de 0 días (alta) y en "Ya se venció" de Inicio, nunca dos avisos', () => {
    const c = internet({ diaPago: 17 });
    expect(avisosDe([c], [], HOY).map(a => [a.tipo, a.dias, a.severidad])).toEqual([['compromiso-proximo', 0, 'alta']]);
    expect(vencidosSinPagar([c], [], HOY).map(v => v.diasAtraso)).toEqual([0]);
    expect(proximoDe(c, [], HOY).diasRestantes).toBe(0);
  });

  it('vence mañana: alta; en tres días: media', () => {
    expect(avisosDe([internet({ diaPago: 18 })], [], HOY).map(a => [a.dias, a.severidad])).toEqual([[1, 'alta']]);
    expect(avisosDe([internet({ diaPago: 20 })], [], HOY).map(a => [a.dias, a.severidad])).toEqual([[3, 'media']]);
    expect(avisosDe([internet({ diaPago: 21 })], [], HOY)).toEqual([]);
  });

  it('vencido y sin pagar sigue apareciendo en Inicio, Por pagar y avisos', () => {
    const c = internet({ diaPago: 9 });
    expect(vencidosSinPagar([c], [], HOY).map(v => [v.id, v.diasAtraso])).toEqual([['internet', 8]]);
    expect(avisosDe([c], [], HOY).map(a => [a.tipo, a.dias])).toEqual([['compromiso-vencido', 8]]);
    const eventos = eventosDelMes([c], 2026, 9);
    expect(pendientesDePagoDelMes(eventos, [], '2026-10', HOY).map(p => p.id)).toEqual(['internet']);
  });

  it('inactivo: ni avisos, ni Inicio, ni Calendario', () => {
    const c = internet({ activo: false });
    expect(avisosDe([c], [], HOY)).toEqual([]);
    expect(compromisosProximos([c], 400, ref(HOY), [])).toEqual([]);
    expect(vencidosSinPagar([c], [], HOY)).toEqual([]);
    expect(eventosDelMes([c], 2026, 9)).toEqual({});
  });

  it('una deuda saldada con un último abono menor a la cuota no queda "vencida"', () => {
    // La cuota es 300.000 pero solo faltaban 150.000: el abono la saldó.
    const saldada = tarjeta({ diaPago: 5, saldoTotal: 0 });
    const gastos = [pago('tarjeta', '2026-10-03', 150_000)];
    expect(estadoPagoMes(gastos, saldada, '2026-10')).toBe('parcial');
    expect(vencidosSinPagar([saldada], gastos, HOY)).toEqual([]);
    expect(avisosDe([saldada], gastos, HOY)).toEqual([]);
    expect(compromisosProximos([saldada], 400, ref(HOY), gastos)).toEqual([]);
    // Mismo criterio que el lote de Por pagar, que ya la dejaba fuera.
    const eventos = eventosDelMes([saldada], 2026, 9);
    expect(pendientesDePagoDelMes(eventos, gastos, '2026-10', HOY)).toEqual([]);
  });

  it('cambio de mes: pagado octubre, el 30 avisa el 2 de noviembre a tres días', () => {
    const c = internet({ diaPago: 2 });
    const gastos = [pago('internet', '2026-10-02', 100_000)];
    const p = proximoDe(c, gastos, '2026-10-30');
    expect(p.fechaVencimiento).toBe('2026-11-02');
    expect(p.diasRestantes).toBe(3);
    expect(avisosDe([c], gastos, '2026-10-30').map(a => [a.tipo, a.dias])).toEqual([['compromiso-proximo', 3]]);
  });

  it('limitación documentada: un pago de octubre no cubre el vencimiento de noviembre', () => {
    // Pagado por adelantado el 29 de octubre, además del pago del 2 de octubre.
    // El estado es por mes: noviembre sigue sin pago, también en el Calendario.
    const c = internet({ diaPago: 2 });
    const gastos = [pago('internet', '2026-10-02', 100_000), pago('internet', '2026-10-29', 100_000)];
    expect(estadoPagoMes(gastos, c, '2026-11')).toBe('ninguno');
    expect(proximoDe(c, gastos, '2026-10-30').fechaVencimiento).toBe('2026-11-02');
  });

  it('febrero: un día 30 vence el 28 en todas las secciones', () => {
    const c = internet({ diaPago: 30 });
    expect(Object.keys(eventosDelMes([c], 2027, 1))).toEqual(['28']);
    const p = proximoDe(c, [], '2027-02-26');
    expect(p.fechaVencimiento).toBe('2027-02-28');
    expect(p.diasRestantes).toBe(2);
    expect(avisosDe([c], [], '2027-02-28').map(a => [a.tipo, a.dias])).toEqual([['compromiso-proximo', 0]]);
    expect(vencidosSinPagar([c], [], '2027-02-28').map(v => v.diasAtraso)).toEqual([0]);
  });

  it('días 29, 30 y 31 se clampean al último día del mes, también en año bisiesto', () => {
    expect(proximoDe(internet({ diaPago: 31 }), [], '2026-09-29').fechaVencimiento).toBe('2026-09-30');
    expect(proximoVencimiento(internet({ diaPago: 31 }), ref('2026-09-29'))).toBe(1);
    expect(proximoDe(internet({ diaPago: 29 }), [], '2027-02-27').fechaVencimiento).toBe('2027-02-28');
    expect(proximoDe(internet({ diaPago: 30 }), [], '2026-11-29').fechaVencimiento).toBe('2026-11-30');
    expect(proximoDe(internet({ diaPago: 29 }), [], '2028-02-27').fechaVencimiento).toBe('2028-02-29');
    expect(proximoDe(internet({ diaPago: 31 }), [], '2026-10-30').fechaVencimiento).toBe('2026-10-31');
    // Un 31 sin pagar vence hoy el 30 de septiembre.
    expect(vencidosSinPagar([internet({ diaPago: 31 })], [], '2026-09-30').map(v => v.diasAtraso)).toEqual([0]);
  });

  it('trimestral y anual fechan con su ciclo, no con el mes siguiente', () => {
    expect(proximoDe(club(), [], HOY).fechaVencimiento).toBe('2026-11-20');
    expect(avisosDe([club()], [], HOY)).toEqual([]);
    expect(proximoDe(dominio(), [], HOY).fechaVencimiento).toBe('2027-03-15');
    expect(avisosDe([dominio()], [], '2026-11-14')).toEqual([]);
    expect(vencidosSinPagar([dominio()], [], '2026-11-20')).toEqual([]);
  });
});

// ── CONSISTENCIA ENTRE SECCIONES ─────────────────────────────────

describe('HF.0d - Inicio y avisos fechan igual que el Calendario', () => {
  relojLejano();

  const casos = [
    ['mensual',    internet()],
    ['quincenal',  gimnasio({ fechaCreacion: '2026-10-10T15:00:00.000Z' })],
    ['bimestral',  seguro()],
    ['trimestral', club()],
    ['anual',      dominio()],
    ['día 31',     internet({ id: 'luz', diaPago: 31 })],
  ];
  // Días sin una ocurrencia vencida y sin pagar antes de hoy dentro del mes,
  // para que el próximo pendiente sea, sin más, lo siguiente que pinta el Calendario.
  const dias = ['2026-08-01', '2026-09-03', '2026-09-30', '2026-10-01', '2026-11-01', '2026-12-01', '2027-02-01'];

  for (const [nombre, c] of casos) {
    it(`${nombre}: la fecha de Inicio es la del Calendario`, () => {
      for (const hoyISO of dias) {
        expect(proximoDe(c, [], hoyISO)?.fechaVencimiento ?? null, hoyISO)
          .toBe(proximaSegunCalendario(c, [], hoyISO));
      }
    });

    it(`${nombre}: el aviso "próximo" cuenta los mismos días que Inicio`, () => {
      for (const hoyISO of dias) {
        const p = proximoDe(c, [], hoyISO, 3);
        const avisos = avisosDe([c], [], hoyISO).filter(a => a.tipo === 'compromiso-proximo');
        expect(avisos.map(a => a.dias), hoyISO).toEqual(p ? [p.diasRestantes] : []);
      }
    });
  }

  it('ningún compromiso recibe dos avisos el mismo día, pagado o no', () => {
    const todos = casos.map(([, c]) => c).concat([gimnasio({ id: 'gim2' }), tarjeta()]);
    const conPagos = [pago('internet', '2026-10-15', 100_000), pago('gim2', '2026-10-05', 50_000)];
    for (let dia = 1; dia <= 31; dia++) {
      const hoyISO = `2026-10-${String(dia).padStart(2, '0')}`;
      for (const gastos of [[], conPagos]) {
        const porId = new Map();
        for (const a of avisosDe(todos, gastos, hoyISO)) {
          const id = a.id.split(':')[1];
          porId.set(id, (porId.get(id) ?? 0) + 1);
        }
        for (const [id, n] of porId) expect(n, `${hoyISO} ${id}`).toBe(1);
      }
    }
  });

  it('dos meses distintos sí son dos avisos: octubre vencido y noviembre próximo, no se contradicen', () => {
    // Día 1 sin pagar en octubre: el 29 lleva 28 días vencido y el de noviembre
    // vence en tres. Son dos pagos reales (ADR 041 D2), y pagar octubre deja
    // solo el de noviembre.
    const c = internet({ diaPago: 1 });
    expect(avisosDe([c], [], '2026-10-29').map(a => [a.tipo, a.dias]))
      .toEqual([['compromiso-vencido', 28], ['compromiso-proximo', 3]]);
    const gastos = [pago('internet', '2026-10-29', 100_000)];
    expect(avisosDe([c], gastos, '2026-10-29').map(a => [a.tipo, a.dias])).toEqual([['compromiso-proximo', 3]]);
  });

  it('el resultado no depende del reloj del sistema', () => {
    const lista = casos.map(([, c]) => c);
    const gastos = [pago('internet', '2026-10-15', 100_000)];
    const antes = { p: compromisosProximos(lista, 60, ref('2026-10-17'), gastos), a: avisosDe(lista, gastos, '2026-10-17') };
    vi.setSystemTime(new Date(2020, 0, 1, 23, 59));
    const despues = { p: compromisosProximos(lista, 60, ref('2026-10-17'), gastos), a: avisosDe(lista, gastos, '2026-10-17') };
    expect(despues).toEqual(antes);
  });
});

// ── SUPERFICIES: lo que se pinta ─────────────────────────────────

describe('HF.0d - Inicio y Por pagar pintan la regla única', () => {
  const _matchMediaReal = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = () => ({ matches: false }); // Inicio en móvil: celda de prioridades propia
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="panel-prioridades"></div><div id="panel-vencidos"></div><div id="lista-compromisos"></div>';
    S.compromisos = [];
    S.gastos = [];
    S.personales = [];
    S.apartados = [];
    setFiltroPorPagar('todo');
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = _matchMediaReal;
    irAMesActualBloque();
  });

  const enFecha = iso => { vi.setSystemTime(ref(iso)); irAMesActualBloque(); };

  it('Inicio: Internet pagado el 15 no sale en las próximas prioridades del 17', () => {
    enFecha('2026-10-17');
    S.compromisos = [internet()];
    S.gastos = [pago('internet', '2026-10-15', 100_000)];
    renderPanelPrioridades();
    const html = document.getElementById('panel-prioridades').innerHTML;
    expect(html).not.toContain('Internet');
    expect(html).toContain('Todo al día');
  });

  it('Inicio: sin el pago, Internet sí sale mañana', () => {
    enFecha('2026-10-17');
    S.compromisos = [internet()];
    renderPanelPrioridades();
    expect(document.getElementById('panel-prioridades').innerHTML).toContain('Internet');
  });

  it('Inicio: el bimestral no sale en septiembre, ni como próximo ni como vencido', () => {
    enFecha('2026-09-08');
    S.compromisos = [seguro()];
    renderPanelPrioridades();
    expect(document.getElementById('panel-prioridades').innerHTML).not.toContain('Seguro del carro');
    enFecha('2026-09-15');
    renderPanelVencidos();
    expect(document.getElementById('panel-vencidos').innerHTML).not.toContain('Seguro del carro');
  });

  it('Por pagar: el bimestral en septiembre dice cuándo vence de verdad', () => {
    enFecha('2026-09-15');
    S.compromisos = [seguro()];
    renderListaCompromisos();
    const card = document.querySelector('.deuda-card[data-id="seguro"]');
    expect(card.textContent).toContain('Vence en 25 días');
    expect(card.textContent).not.toContain('Venció');
  });

  it('Por pagar: Internet pagado el 15 conserva "Pagado este mes" y pierde su botón', () => {
    enFecha('2026-10-17');
    S.compromisos = [internet()];
    S.gastos = [pago('internet', '2026-10-15', 100_000)];
    renderListaCompromisos();
    const card = document.querySelector('.deuda-card[data-id="internet"]');
    expect(card.textContent).toContain('Pagado este mes');
    expect(card.querySelector('[data-action="agenda-marcar-pagado-fijo"]')).toBeNull();
  });
});
