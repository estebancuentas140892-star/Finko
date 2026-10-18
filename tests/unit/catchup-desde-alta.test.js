/**
 * catchup-desde-alta.test.js - la hoja "Pagos automáticos" no ofrece cobros ni
 * pagos anteriores al alta del registro (HF.0j, ADR 091, acota el ADR 052 D1).
 *
 * Finko no asume que un movimiento anterior a la creación de su registro
 * ocurrió. Quien registra hoy un salario automático de día 15 no recibe en la
 * hoja el 15 de este mes ni el del mes pasado; quien lo tenía desde antes
 * conserva su catch-up de dos meses. Un registro histórico anterior al alta es
 * siempre una acción explícita, nunca algo que la hoja propone.
 *
 * El filtro va por ocurrencia y antes de la agrupación mensual: un quincenal
 * creado el 17 pierde el 15, no el 30. Y va solo en la hoja: el Calendario
 * sigue pintando las ocurrencias del ciclo y el lote de "Por pagar" no cambia.
 *
 * La zona horaria se fija en Colombia y la fecha va inyectada: nada depende de
 * la máquina ni del reloj. Todos los datos son inventados.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  creditosAutomaticosVencidos,
  debitosAutomaticosVencidos,
  eventosIngresosDelMes,
  eventosDelMes,
  pendientesDePagoDelMes,
} from '../../modules/dominio/agenda/logic.js';

const TZ_ORIGINAL = process.env.TZ;
beforeEach(() => { process.env.TZ = 'America/Bogota'; });
afterEach(() => {
  if (TZ_ORIGINAL === undefined) delete process.env.TZ;
  else process.env.TZ = TZ_ORIGINAL;
});

/** Instante UTC de las 10:00 a. m. en Colombia de ese día: misma fecha en UTC y en local. */
const manana = iso => `${iso}T15:00:00.000Z`;

const salario = (o = {}) => ({
  id: 'salario', descripcion: 'Salario', monto: 4_000_000, frecuencia: 'Mensual',
  diaPago: 15, activo: true, creditoAutomatico: true, cuentaId: 'cta1',
  fechaCreacion: manana('2026-10-17'), ...o,
});

const internet = (o = {}) => ({
  id: 'internet', descripcion: 'Internet', tipo: 'fijo', categoria: 'Servicios',
  monto: 95_000, frecuencia: 'Mensual', diaPago: 12, activo: true,
  debitoAutomatico: true, cuentaDebitoId: 'cta1',
  fechaCreacion: manana('2026-10-17'), ...o,
});

const fechasCredito = (ingresos, hoyISO, puntuales = [], acreditados = []) =>
  creditosAutomaticosVencidos(ingresos, puntuales, hoyISO, undefined, acreditados).map(x => x.fecha);

const fechasDebito = (compromisos, hoyISO, gastos = []) =>
  debitosAutomaticosVencidos(compromisos, gastos, hoyISO).map(x => x.fecha);

// ── A y B: recién creado después de su día ───────────────────────

describe('HF.0j - un registro recién creado no trae cobros ni pagos de antes del alta', () => {
  it('A: salario de día 15 creado el 17 de octubre: ni septiembre ni el 15 de octubre', () => {
    expect(fechasCredito([salario()], '2026-10-17')).toEqual([]);
  });

  it('A: su primera ocurrencia válida es la de noviembre, y el Calendario sigue pintando octubre', () => {
    expect(fechasCredito([salario()], '2026-11-16')).toEqual(['2026-11-15']);
    expect(Object.keys(eventosIngresosDelMes([salario()], 2026, 9))).toEqual(['15']);
    expect(Object.keys(eventosIngresosDelMes([salario()], 2026, 10))).toEqual(['15']);
  });

  it('B: Internet de día 12 creado el 17 de octubre: ni septiembre ni el 12 de octubre', () => {
    expect(fechasDebito([internet()], '2026-10-17')).toEqual([]);
  });

  it('B: su primera ocurrencia válida es la de noviembre', () => {
    expect(fechasDebito([internet()], '2026-11-13')).toEqual(['2026-11-12']);
  });

  it('el filtro es de la hoja: el lote de "Por pagar" y el Calendario no cambian', () => {
    const eventos = eventosDelMes([internet()], 2026, 9);
    expect(Object.keys(eventos)).toEqual(['12']);
    expect(pendientesDePagoDelMes(eventos, [], '2026-10', '2026-10-17').map(p => p.id)).toEqual(['internet']);
  });
});

// ── C: registros que ya existían ─────────────────────────────────

describe('HF.0j - lo que ya existía conserva su catch-up (ADR 052 D1)', () => {
  it('C: Internet desde agosto con septiembre sin registrar trae septiembre y octubre', () => {
    const c = internet({ fechaCreacion: manana('2026-08-03') });
    expect(fechasDebito([c], '2026-10-17')).toEqual(['2026-09-12', '2026-10-12']);
  });

  it('C: con septiembre ya pagado solo queda octubre', () => {
    const c = internet({ fechaCreacion: manana('2026-08-03') });
    const gastos = [{ compromisoId: 'internet', fecha: '2026-09-12', monto: 95_000 }];
    expect(fechasDebito([c], '2026-10-17', gastos)).toEqual(['2026-10-12']);
  });

  it('un salario de hace meses trae septiembre y octubre, y respeta lo ya cobrado', () => {
    const s = salario({ fechaCreacion: manana('2026-03-01') });
    expect(fechasCredito([s], '2026-10-17')).toEqual(['2026-09-15', '2026-10-15']);
    const puntuales = [{ ingresoId: 'salario', fecha: '2026-10-15', monto: 4_000_000 }];
    expect(fechasCredito([s], '2026-10-17', puntuales)).toEqual(['2026-09-15']);
  });

  it('lo que Distribuir ya acreditó sigue fuera (HF.0h)', () => {
    const s = salario({ fechaCreacion: manana('2026-03-01') });
    expect(fechasCredito([s], '2026-10-17', [], [{ ingresoId: 'salario', fecha: '2026-09-15' }])).toEqual(['2026-10-15']);
  });

  it('creado antes de una ocurrencia del mismo mes: esa ocurrencia sí entra', () => {
    expect(fechasDebito([internet({ fechaCreacion: manana('2026-10-03') })], '2026-10-17')).toEqual(['2026-10-12']);
    expect(fechasCredito([salario({ fechaCreacion: manana('2026-10-02') })], '2026-10-17')).toEqual(['2026-10-15']);
  });
});

// ── D: varias ocurrencias en un mes ──────────────────────────────

describe('HF.0j - se filtra cada ocurrencia antes de agrupar por mes', () => {
  it('D: quincenal de días 15 y 30 creado el 17: el 15 no corresponde, el 30 sí', () => {
    const q = salario({ frecuencia: 'Quincenal' });
    expect(fechasCredito([q], '2026-10-17')).toEqual([]);
    expect(fechasCredito([q], '2026-10-31')).toEqual(['2026-10-30']);
  });

  it('D: un compromiso quincenal de días 5 y 20 creado el 10 ofrece el 20, no el 5', () => {
    const q = internet({ frecuencia: 'Quincenal', diaPago: 5, fechaCreacion: manana('2026-10-10') });
    expect(fechasDebito([q], '2026-10-21')).toEqual(['2026-10-20']);
  });

  it('D: el quincenal que ya existía sigue saliendo una vez por mes, con su ocurrencia más vieja', () => {
    const q = salario({ frecuencia: 'Quincenal', fechaCreacion: manana('2026-03-01') });
    expect(fechasCredito([q], '2026-10-31')).toEqual(['2026-09-15', '2026-10-15']);
  });
});

// ── E y F: el mismo día y de noche ───────────────────────────────

describe('HF.0j - el día del alta cuenta, leído en hora local', () => {
  it('E: creado el mismo día de su vencimiento, esa ocurrencia es elegible (y sigue pidiendo confirmación)', () => {
    const s = salario({ fechaCreacion: manana('2026-10-15') });
    const r = creditosAutomaticosVencidos([s], [], '2026-10-17');
    expect(r.map(x => x.fecha)).toEqual(['2026-10-15']);
    // La hoja propone; no escribe. El registro no cambia por proponerlo.
    expect(s.fechaCreacion).toBe(manana('2026-10-15'));
    expect(fechasDebito([internet({ fechaCreacion: manana('2026-10-12') })], '2026-10-17')).toEqual(['2026-10-12']);
  });

  it('F: creado el 17 a las 8:00 p. m. en Colombia (18 en UTC): el 17 es elegible', () => {
    const noche17 = '2026-10-18T01:00:00.000Z';
    expect(fechasCredito([salario({ diaPago: 17, fechaCreacion: noche17 })], '2026-10-19')).toEqual(['2026-10-17']);
    expect(fechasDebito([internet({ diaPago: 17, fechaCreacion: noche17 })], '2026-10-19')).toEqual(['2026-10-17']);
  });

  it('cruce de año: la noche del 31 de diciembre en Colombia cuenta el 31; el 2 de enero ya no', () => {
    const s = salario({ diaPago: 31, fechaCreacion: '2027-01-01T01:00:00.000Z' });
    expect(fechasCredito([s], '2027-01-03')).toEqual(['2026-12-31']);
    expect(fechasCredito([salario({ diaPago: 31, fechaCreacion: manana('2027-01-02') })], '2027-01-03')).toEqual([]);
  });

  it('cruce de mes: creado el 1 no trae el 31 del mes anterior', () => {
    expect(fechasDebito([internet({ diaPago: 31, fechaCreacion: manana('2026-11-01') })], '2026-11-05')).toEqual([]);
  });
});

// ── Frecuencias largas ───────────────────────────────────────────

describe('HF.0j - bimestral, trimestral y anual empiezan después del alta', () => {
  it('bimestral creado el 17 de octubre con día 12: nada en octubre, el 12 de diciembre sí', () => {
    const b = internet({ frecuencia: 'Bimestral' });
    expect(fechasDebito([b], '2026-10-17')).toEqual([]);
    expect(fechasDebito([b], '2026-12-13')).toEqual(['2026-12-12']);
  });

  it('trimestral creado el 17 de octubre: el primero es el 12 de enero', () => {
    const t = salario({ frecuencia: 'Trimestral', diaPago: 12 });
    expect(fechasCredito([t], '2026-10-17')).toEqual([]);
    expect(fechasCredito([t], '2027-01-13')).toEqual(['2027-01-12']);
  });

  it('anual creado el 17 de octubre con día 12: no ofrece el de este año', () => {
    expect(fechasDebito([internet({ frecuencia: 'Anual' })], '2026-10-17')).toEqual([]);
    expect(fechasCredito([salario({ frecuencia: 'Anual', diaPago: 12 })], '2026-10-17')).toEqual([]);
  });
});

// ── G: registros heredados ───────────────────────────────────────

describe('HF.0j - sin fecha de alta no se inventa una', () => {
  it('G: sin fechaCreacion la hoja ofrece su ventana completa, como antes', () => {
    expect(fechasCredito([salario({ fechaCreacion: undefined })], '2026-10-17')).toEqual(['2026-09-15', '2026-10-15']);
    expect(fechasDebito([internet({ fechaCreacion: undefined })], '2026-10-17')).toEqual(['2026-09-12', '2026-10-12']);
  });

  it('G: una fecha ilegible se trata como ausente', () => {
    expect(fechasDebito([internet({ fechaCreacion: 'no-date' })], '2026-10-17')).toEqual(['2026-09-12', '2026-10-12']);
  });

  it('una fecha de calendario se respeta sin zona horaria', () => {
    expect(fechasDebito([internet({ fechaCreacion: '2026-10-12' })], '2026-10-17')).toEqual(['2026-10-12']);
    expect(fechasDebito([internet({ fechaCreacion: '2026-10-13' })], '2026-10-17')).toEqual([]);
  });
});

// ── Dinero y persistencia ────────────────────────────────────────

describe('HF.0j - la hoja no escribe ni cambia dinero', () => {
  it('no muta registros, cuentas ni historial, y da lo mismo tras guardar y recargar', () => {
    const estado = {
      cuentas:     [{ id: 'cta1', nombre: 'Cuenta de prueba', saldo: 1_000_000 }],
      ingresos:    [salario(), salario({ id: 'viejo', fechaCreacion: manana('2026-03-01') })],
      compromisos: [internet(), internet({ id: 'viejo-int', fechaCreacion: manana('2026-08-03') })],
      gastos:      [{ compromisoId: 'viejo-int', fecha: '2026-09-12', monto: 95_000 }],
      puntuales:   [],
    };
    const antes = JSON.stringify(estado);

    const leer = st => ({
      creditos: creditosAutomaticosVencidos(st.ingresos, st.puntuales, '2026-10-17').map(x => [x.id, x.fecha, x.monto]),
      debitos:  debitosAutomaticosVencidos(st.compromisos, st.gastos, '2026-10-17').map(x => [x.id, x.fecha, x.monto]),
    });
    const r = leer(estado);
    expect(r).toEqual({
      creditos: [['viejo', '2026-09-15', 4_000_000], ['viejo', '2026-10-15', 4_000_000]],
      debitos:  [['viejo-int', '2026-10-12', 95_000]],
    });

    expect(JSON.stringify(estado)).toBe(antes);
    expect(leer(JSON.parse(antes))).toEqual(r);
    expect(estado.cuentas[0].saldo).toBe(1_000_000);
  });
});
