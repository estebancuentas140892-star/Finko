/**
 * GAS.9c (ADR 183 D3): el vencimiento de un fijo o una deuda se cuenta desde
 * lo que quedó sin pagar, no solo dentro del mes en curso.
 *
 * El caso del pedido: Disney+ mensual registrado el 15 de julio, sin pagos. El
 * 19 de noviembre decía "Venció hace 4 días" (el 15 de noviembre); lleva sin
 * pagarse desde julio.
 *
 * GAS.12b (ADR 187 D2) cambia la regla de los fijos: cada pago salda el
 * vencimiento más viejo, así que un pago de noviembre ya no deja al día los
 * meses de antes. Las deudas siguen con la regla del ADR 183 D3.
 */

import { describe, it, expect } from 'vitest';
import { pendientesDeObligacion, vencidosSinPagar } from '../../modules/dominio/compromisos/logic.js';
import { pagosPendientesDelMes, textoEstadoObligacion } from '../../modules/infra/estado-obligacion.js';
import { recolectarAvisos } from '../../modules/infra/avisos.js';

// ── FIXTURES (inventados) ────────────────────────────────────────

const HOY = '2026-11-19';

const disney = (o = {}) => ({
  id: 'disney', descripcion: 'Disney+', tipo: 'fijo', categoria: 'Suscripciones', monto: 38_900,
  frecuencia: 'Mensual', diaPago: 15, activo: true, fechaCreacion: '2026-07-15T15:00:00.000Z', ...o,
});

const credito = (o = {}) => ({
  id: 'credito', descripcion: 'Crédito libre inversión', tipo: 'deuda-entidad', saldoTotal: 3_000_000,
  cuotaMensual: 250_000, frecuencia: 'Mensual', diaPago: 10, activo: true,
  fechaCreacion: '2026-09-01T15:00:00.000Z', ...o,
});

const pago = (compromisoId, fecha, monto, extra = {}) => ({
  id: `g-${compromisoId}-${fecha}-${monto}`, compromisoId, fecha, monto, categoria: 'Gastos fijos', descripcion: 'Pago', ...extra,
});

// ── LA REGLA ─────────────────────────────────────────────────────

describe('pendientesDeObligacion(): fechas que ya pasaron sin pagar', () => {
  it('Disney+ desde el 15 de julio sin pagos: cinco pagos pendientes, vencido desde julio', () => {
    const p = pendientesDeObligacion(disney(), [], HOY);
    expect(p.pendientes).toEqual(['2026-07-15', '2026-08-15', '2026-09-15', '2026-10-15', '2026-11-15']);
    expect(p.desde).toBe('2026-07-15');
    expect(p.montoPendiente).toBe(5 * 38_900);
    expect(p.ultimoPago).toBeNull();
  });

  it('el atraso se cuenta desde julio y se dice en meses, no "hace 4 días"', () => {
    const [v] = vencidosSinPagar([disney()], [], HOY);
    expect(v).toMatchObject({ id: 'disney', diasAtraso: 127, pendientes: 5, desde: '2026-07-15', severidad: 'urgente' });
    expect(textoEstadoObligacion(-v.diasAtraso).texto).toBe('Venció hace 4 meses');
  });

  it('ADR 187 D2: un pago de noviembre salda julio; los de agosto a noviembre siguen pendientes', () => {
    const gastos = [pago('disney', '2026-11-16', 38_900)];
    expect(pendientesDeObligacion(disney(), gastos, HOY).pendientes)
      .toEqual(['2026-08-15', '2026-09-15', '2026-10-15', '2026-11-15']);
    expect(vencidosSinPagar([disney()], gastos, HOY)).toMatchObject([{ desde: '2026-08-15', pendientes: 4 }]);
  });

  it('pagado hasta octubre: solo noviembre, vencido hace 4 días', () => {
    const gastos = ['2026-07-15', '2026-08-15', '2026-09-15', '2026-10-15'].map(f => pago('disney', f, 38_900));
    const p = pendientesDeObligacion(disney(), gastos, HOY);
    expect(p.pendientes).toEqual(['2026-11-15']);
    const [v] = vencidosSinPagar([disney()], gastos, HOY);
    expect(v.diasAtraso).toBe(4);
    expect(textoEstadoObligacion(-v.diasAtraso).texto).toBe('Venció hace 4 días');
  });

  it('ADR 187 D2: dos pagos en el mismo mes cubren dos vencimientos; el segundo adelanta el siguiente', () => {
    const octubre = disney({ fechaCreacion: '2026-10-01T15:00:00.000Z' });
    const gastos = [pago('disney', '2026-10-15', 38_900), pago('disney', '2026-10-20', 38_900)];
    expect(pendientesDeObligacion(octubre, gastos, HOY).pendientes).toEqual([]);
  });

  it('ADR 187 D2: un pago en un mes sin fecha salda la fecha más vieja sin pagar', () => {
    // Bimestral creado en julio: fechas el 15 de julio, septiembre y noviembre.
    const seguro = disney({ id: 'seguro', frecuencia: 'Bimestral' });
    const gastos = [pago('seguro', '2026-10-02', 38_900)];
    expect(pendientesDeObligacion(seguro, gastos, HOY).pendientes).toEqual(['2026-09-15', '2026-11-15']);
    expect(pendientesDeObligacion(seguro, [], HOY).pendientes).toEqual(['2026-07-15', '2026-09-15', '2026-11-15']);
  });

  it('lo que vence hoy está pendiente con 0 días de atraso: no es atraso todavía', () => {
    const [v] = vencidosSinPagar([disney({ fechaCreacion: '2026-11-01T15:00:00.000Z' })], [], '2026-11-15');
    expect(v.diasAtraso).toBe(0);
  });

  it('lo creado después de su fecha no se debe ese mes', () => {
    const tarde = disney({ fechaCreacion: '2026-07-20T15:00:00.000Z' });
    expect(pendientesDeObligacion(tarde, [], HOY).pendientes[0]).toBe('2026-08-15');
  });

  it('sin fecha de creación se mira solo el mes en curso, como antes', () => {
    const sinFecha = disney({ fechaCreacion: undefined });
    expect(pendientesDeObligacion(sinFecha, [], HOY).pendientes).toEqual(['2026-11-15']);
  });

  it('una compra con la tarjeta no es un pago', () => {
    const tarjeta = credito({ id: 'visa', cupoTotal: 5_000_000 });
    const gastos = [pago('visa', '2026-11-12', 80_000, { consumoTC: true })];
    expect(pendientesDeObligacion(tarjeta, gastos, HOY).pendientes).toEqual(['2026-09-10', '2026-10-10', '2026-11-10']);
  });
});

describe('pendientesDeObligacion(): deudas', () => {
  it('cada cuota sin pagar desde su creación, con techo en el saldo', () => {
    const p = pendientesDeObligacion(credito({ saldoTotal: 600_000 }), [], HOY);
    expect(p.pendientes).toEqual(['2026-09-10', '2026-10-10', '2026-11-10']);
    expect(p.montoPendiente).toBe(600_000);
  });

  it('un abono parcial en el mes no cubre su cuota: falta lo que no se pagó', () => {
    const gastos = [pago('credito', '2026-10-10', 250_000), pago('credito', '2026-11-11', 100_000)];
    const p = pendientesDeObligacion(credito(), gastos, HOY);
    expect(p.pendientes).toEqual(['2026-11-10']);
    expect(p.montoPendiente).toBe(150_000);
  });

  it('la cuota completa del mes deja la deuda al día', () => {
    const gastos = [pago('credito', '2026-11-10', 250_000)];
    expect(pendientesDeObligacion(credito(), gastos, HOY).pendientes).toEqual([]);
  });

  it('una deuda saldada o sin cuota no vence', () => {
    expect(pendientesDeObligacion(credito({ saldoTotal: 0 }), [], HOY).pendientes).toEqual([]);
    expect(pendientesDeObligacion(credito({ tipo: 'deuda-personal', cuotaMensual: 0 }), [], HOY).pendientes).toEqual([]);
  });
});

// ── LO QUE SE PAGA Y LO QUE SE AVISA ─────────────────────────────

describe('lo vencido de meses anteriores en el lote y en los avisos', () => {
  it('el lote del mes trae lo de antes aunque su fecha de este mes no haya llegado', () => {
    // Arriendo del 25: octubre sin pagar; el 25 de noviembre aún no llega.
    const arriendo = disney({ id: 'arriendo', descripcion: 'Arriendo', monto: 1_200_000, diaPago: 25, fechaCreacion: '2026-10-01T15:00:00.000Z' });
    const lista = pagosPendientesDelMes([arriendo], [], '2026-11', HOY);
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ id: 'arriendo', diasRestantes: -25, estado: 'vencido', pendientes: 1, desde: '2026-10-25' });
  });

  it('Disney+ con cinco pagos pendientes avisa una vez, con el atraso desde julio', () => {
    const avisos = recolectarAvisos({ compromisos: [disney()], gastos: [], hoyISO: HOY })
      .filter(a => a.tipo.startsWith('compromiso-'));
    expect(avisos.map(a => [a.tipo, a.dias])).toEqual([['compromiso-vencido', 127]]);
  });

  it('vencido de antes y la fecha de este mes por llegar: un solo aviso mientras siga vencido', () => {
    const gym = disney({ id: 'gym', descripcion: 'Gimnasio', diaPago: 21, fechaCreacion: '2026-10-01T15:00:00.000Z' });
    const avisos = recolectarAvisos({ compromisos: [gym], gastos: [], hoyISO: HOY })
      .filter(a => a.tipo.startsWith('compromiso-'));
    expect(avisos.map(a => [a.tipo, a.dias])).toEqual([['compromiso-vencido', 29]]);
    // ADR 187 D2: pagado hoy, ese pago salda octubre; el 21 de noviembre es
    // otro pago y avisa que vence en dos días.
    const pagado = recolectarAvisos({ compromisos: [gym], gastos: [pago('gym', HOY, 38_900)], hoyISO: HOY })
      .filter(a => a.tipo.startsWith('compromiso-'));
    expect(pagado.map(a => [a.tipo, a.dias])).toEqual([['compromiso-proximo', 2]]);
  });
});
