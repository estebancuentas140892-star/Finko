/**
 * fecha-creacion-local.test.js - `fechaCreacion` se lee como fecha local
 * (HF.0e, BUG-025, P3 del ADR 091).
 *
 * `crud.guardar()` sella `fechaCreacion` con `new Date().toISOString()`: un
 * instante UTC correcto, que no se toca ni se migra. El defecto estaba en
 * leerlo cortando sus diez primeros caracteres como si fueran el día local:
 * quien crea algo en Colombia a las 8:00 p. m. del 31 de julio guarda
 * `2026-08-01T01:00:00.000Z`, y Finko leía 1 de agosto.
 *
 * Cada prueba fija la zona horaria (`process.env.TZ`) y la restaura al salir:
 * ninguna depende de la zona de la máquina. Colombia (UTC-5) reproduce el caso
 * del bug; Madrid (UTC+2 en verano) reproduce el sentido inverso, donde el corte
 * UTC hace creer que el registro ya existía el día anterior. Todos los datos
 * son inventados.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as utils from '../../modules/infra/utils.js';
import { ocurrenciasEnMes } from '../../modules/infra/vencimientos.js';
import { planDeReferencia } from '../../modules/infra/bolsas.js';
import { estadoDistribucion } from '../../modules/dominio/tesoreria/logic/distribucion.js';
import {
  compromisosProximos,
  proximoVencimiento,
  vencidosSinPagar,
  detectarDeudasDurmiendo,
  detectarFijosSinPagarEsteMes,
} from '../../modules/dominio/compromisos/logic.js';
import { eventosDelMes, pendientesDePagoDelMes } from '../../modules/dominio/agenda/logic.js';

// ── ZONA HORARIA CONTROLADA ──────────────────────────────────────

const TZ_ORIGINAL = process.env.TZ;

/** Fija la zona horaria del proceso para el resto de la prueba. */
function zona(tz) {
  process.env.TZ = tz;
}

afterEach(() => {
  if (TZ_ORIGINAL === undefined) delete process.env.TZ;
  else process.env.TZ = TZ_ORIGINAL;
  vi.useRealTimers();
});

/** 31 de julio de 2026 a las 8:00 p. m. en Colombia (UTC-5). */
const NOCHE_31_JULIO_CO = '2026-08-01T01:00:00.000Z';

/** 1 de agosto de 2026 a las 00:30 en Madrid (UTC+2): en UTC todavía es 31 de julio. */
const MADRUGADA_1_AGOSTO_MADRID = '2026-07-31T22:30:00.000Z';

/** Mediodía local de la fecha, para las funciones que reciben un `Date`. */
const ref = iso => new Date(`${iso}T12:00:00`);

const compromiso = (o = {}) => ({
  id: 'seguro', descripcion: 'Seguro del carro', tipo: 'fijo', categoria: 'Transporte',
  monto: 200_000, frecuencia: 'Bimestral', diaPago: 15, activo: true,
  fechaCreacion: NOCHE_31_JULIO_CO, ...o,
});

// ── EL HELPER ────────────────────────────────────────────────────

describe('HF.0e - fechaLocalISO(): instante, fecha de calendario o nada', () => {
  const fechaLocalISO = v => utils.fechaLocalISO(v);

  it('un instante UTC de la noche colombiana es el día local, no el del corte UTC', () => {
    zona('America/Bogota');
    expect(fechaLocalISO(NOCHE_31_JULIO_CO)).toBe('2026-07-31');
  });

  it('el sentido inverso: en Madrid la madrugada del 1 de agosto es 1 de agosto', () => {
    zona('Europe/Madrid');
    expect(fechaLocalISO(MADRUGADA_1_AGOSTO_MADRID)).toBe('2026-08-01');
  });

  it('usa la zona del entorno, no una fija: en UTC el mismo instante es 1 de agosto', () => {
    zona('UTC');
    expect(fechaLocalISO(NOCHE_31_JULIO_CO)).toBe('2026-08-01');
  });

  it('una fecha de calendario ya es un día: no se desplaza en ninguna zona', () => {
    for (const tz of ['America/Bogota', 'Europe/Madrid', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'UTC']) {
      zona(tz);
      expect(fechaLocalISO('2026-07-31'), tz).toBe('2026-07-31');
      expect(fechaLocalISO('2028-02-29'), tz).toBe('2028-02-29');
    }
  });

  it('un instante sin zona se lee como hora local', () => {
    zona('America/Bogota');
    expect(fechaLocalISO('2026-07-31T20:00:00')).toBe('2026-07-31');
  });

  it('bordes de medianoche, de mes, de año y de bisiesto en Colombia', () => {
    zona('America/Bogota');
    expect(fechaLocalISO('2026-03-15T04:59:59.999Z')).toBe('2026-03-14');
    expect(fechaLocalISO('2026-03-15T05:00:00.000Z')).toBe('2026-03-15');
    expect(fechaLocalISO('2026-08-01T04:59:59.999Z')).toBe('2026-07-31');
    expect(fechaLocalISO('2027-01-01T03:00:00.000Z')).toBe('2026-12-31');
    expect(fechaLocalISO('2028-03-01T02:00:00.000Z')).toBe('2028-02-29');
  });

  it('ausente o inválido devuelve null: no se inventa una fecha', () => {
    zona('America/Bogota');
    for (const v of [null, undefined, '', '   ', 'no-date', '2026-02-30', '2026-13-01', '2026-13-01T00:00:00.000Z', 'mañana', 20260731, {}]) {
      expect(fechaLocalISO(v), String(v)).toBeNull();
    }
  });
});

// ── B: el ciclo de las frecuencias largas ────────────────────────

describe('HF.0e - un bimestral creado la noche del 31 de julio ancla su ciclo en julio', () => {
  it('el motor lo hace caer en julio y septiembre, no en agosto', () => {
    zona('America/Bogota');
    const c = compromiso();
    expect(ocurrenciasEnMes(c, 2026, 6)).toEqual([15]);
    expect(ocurrenciasEnMes(c, 2026, 7)).toEqual([]);
    expect(ocurrenciasEnMes(c, 2026, 8)).toEqual([15]);
  });

  it('el Calendario lo pinta en septiembre y Por pagar fecha el 15 de septiembre', () => {
    zona('America/Bogota');
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2031, 0, 5, 9)); // reloj lejos: la fecha va inyectada
    const c = compromiso();
    expect(Object.keys(eventosDelMes([c], 2026, 8))).toEqual(['15']);
    expect(eventosDelMes([c], 2026, 7)).toEqual({});
    expect(proximoVencimiento(c, ref('2026-08-10'))).toBe(36);
    expect(compromisosProximos([c], 60, ref('2026-08-10'), [])[0].fechaVencimiento).toBe('2026-09-15');
  });

  it('en agosto no inventa mora: ni vencido en Inicio, ni en el lote de Por pagar', () => {
    zona('America/Bogota');
    const c = compromiso();
    expect(vencidosSinPagar([c], [], '2026-08-20')).toEqual([]);
    expect(pendientesDePagoDelMes(eventosDelMes([c], 2026, 7), [], '2026-08', '2026-08-20')).toEqual([]);
  });

  it('un anual creado la noche del 31 de diciembre vence cada diciembre, no cada enero', () => {
    zona('America/Bogota');
    const c = compromiso({ frecuencia: 'Anual', diaPago: 31, fechaCreacion: '2027-01-01T02:00:00.000Z' });
    expect(ocurrenciasEnMes(c, 2027, 0)).toEqual([]);
    expect(ocurrenciasEnMes(c, 2027, 11)).toEqual([31]);
  });

  it('una "Única vez" creada la noche del 31 de julio cae en julio', () => {
    zona('America/Bogota');
    const c = compromiso({ frecuencia: 'Única vez', diaPago: 31 });
    expect(ocurrenciasEnMes(c, 2026, 6)).toEqual([31]);
    expect(ocurrenciasEnMes(c, 2026, 7)).toEqual([]);
  });

  it('medianoche exacta: 23:59:59 del 31 ancla en julio y 00:00 del 1 en agosto', () => {
    zona('America/Bogota');
    expect(ocurrenciasEnMes(compromiso({ fechaCreacion: '2026-08-01T04:59:59.000Z' }), 2026, 6)).toEqual([15]);
    expect(ocurrenciasEnMes(compromiso({ fechaCreacion: '2026-08-01T05:00:00.000Z' }), 2026, 7)).toEqual([15]);
  });
});

// ── C: el ingreso y Distribuir ───────────────────────────────────

describe('HF.0e - estadoDistribucion() data la creación del ingreso en hora local', () => {
  const ingreso = (o = {}) => ({
    id: 'salario', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual',
    diaPago: 31, activo: true, ...o,
  });

  it('creado la noche de su día de cobro en Colombia: el cobro de ese día ya cuenta', () => {
    zona('America/Bogota');
    const r = estadoDistribucion([ingreso({ fechaCreacion: NOCHE_31_JULIO_CO })], null, new Date(2026, 7, 3, 12));
    expect(r).toMatchObject({ estado: 'listo', periodoISO: '2026-07-31' });
  });

  it('creado en la madrugada siguiente en Madrid: no existía durante el cobro del 31, se pregunta', () => {
    zona('Europe/Madrid');
    const r = estadoDistribucion([ingreso({ fechaCreacion: MADRUGADA_1_AGOSTO_MADRID })], null, new Date(2026, 7, 3, 12));
    expect(r).toMatchObject({ estado: 'por-confirmar', periodoISO: '2026-07-31' });
  });

  it('creado días después de su cobro sigue preguntando, en cualquier zona', () => {
    for (const tz of ['America/Bogota', 'Europe/Madrid']) {
      zona(tz);
      const r = estadoDistribucion(
        [ingreso({ diaPago: 15, fechaCreacion: '2026-07-21T01:30:00.000Z' })], null, new Date(2026, 6, 25, 12),
      );
      expect(r, tz).toMatchObject({ estado: 'por-confirmar', periodoISO: '2026-07-15' });
    }
  });

  it('una fecha de calendario o un registro sin fecha conservan su lectura', () => {
    zona('America/Bogota');
    const hoy = new Date(2026, 7, 3, 12);
    expect(estadoDistribucion([ingreso({ fechaCreacion: '2026-07-31' })], null, hoy).estado).toBe('listo');
    expect(estadoDistribucion([ingreso({ fechaCreacion: '2026-08-01' })], null, hoy).estado).toBe('por-confirmar');
    expect(estadoDistribucion([ingreso()], null, hoy).estado).toBe('listo');
    expect(estadoDistribucion([ingreso({ fechaCreacion: 'no-date' })], null, hoy).estado).toBe('listo');
  });
});

// ── D: Reservas (apartados) ──────────────────────────────────────

describe('HF.0e - el plan de una reserva arranca el día local de su creación', () => {
  const bolsa = (o = {}) => ({
    id: 'soat', nombre: 'SOAT', montoObjetivo: 600_000, montoActual: 100_000,
    fechaObjetivo: '2027-01-31', frecuenciaAporte: 'Mensual', recurrente: false,
    fechaCreacion: NOCHE_31_JULIO_CO, ...o,
  });

  it('sin fechaInicioPlan, el arranque es el 31 de julio y el 30 de agosto ya toca un aporte', () => {
    zona('America/Bogota');
    const p = planDeReferencia(bolsa(), '2026-08-30');
    expect(p.inicio).toBe('2026-07-31');
    expect(p.aportesEsperados).toBe(1);
  });

  it('fechaInicioPlan es una fecha de calendario: se conserva sin desplazarse', () => {
    for (const tz of ['America/Bogota', 'Pacific/Kiritimati', 'Pacific/Honolulu']) {
      zona(tz);
      expect(planDeReferencia(bolsa({ fechaInicioPlan: '2026-08-01' }), '2026-08-30').inicio, tz).toBe('2026-08-01');
    }
  });

  it('sin ninguna fecha legible no hay plan que dibujar', () => {
    zona('America/Bogota');
    expect(planDeReferencia(bolsa({ fechaCreacion: undefined }), '2026-08-30')).toBeNull();
    expect(planDeReferencia(bolsa({ fechaCreacion: 'no-date' }), '2026-08-30')).toBeNull();
  });
});

// ── E: deudas y alertas ──────────────────────────────────────────

describe('HF.0e - antigüedad de la deuda y vencimientos anteriores al alta', () => {
  it('una deuda creada la noche del 31 de mayo cumple dos meses el 30 de julio', () => {
    zona('America/Bogota');
    const deuda = {
      id: 'moto', descripcion: 'Préstamo moto', tipo: 'deuda-entidad', saldoTotal: 2_000_000,
      cuotaMensual: 300_000, frecuencia: 'Mensual', diaPago: 10, activo: true,
      fechaCreacion: '2026-06-01T02:00:00.000Z',
    };
    expect(detectarDeudasDurmiendo([deuda], '2026-07-30').map(d => d.mesesDesdeCreacion)).toEqual([2]);
  });

  it('creado el 10 de agosto de madrugada en Madrid con día de pago 9: no hay mora del 9', () => {
    zona('Europe/Madrid');
    const fijo = compromiso({ frecuencia: 'Mensual', diaPago: 9, fechaCreacion: '2026-08-09T22:30:00.000Z' });
    expect(vencidosSinPagar([fijo], [], '2026-08-12')).toEqual([]);
    expect(detectarFijosSinPagarEsteMes([fijo], '2026-08-12')).toEqual([]);
  });

  it('creado el 9 de agosto por la noche en Colombia con día de pago 9: ese día sí venció', () => {
    // Mismo criterio de siempre: lo creado el día del vencimiento cuenta ese día.
    zona('America/Bogota');
    const fijo = compromiso({ frecuencia: 'Mensual', diaPago: 9, fechaCreacion: '2026-08-10T01:00:00.000Z' });
    expect(vencidosSinPagar([fijo], [], '2026-08-12').map(v => v.diasAtraso)).toEqual([3]);
    expect(detectarFijosSinPagarEsteMes([fijo], '2026-08-12').map(v => v.diasAtraso)).toEqual([3]);
  });
});

// ── G: registros de versiones anteriores ─────────────────────────

describe('HF.0e - compatibilidad sin backfill', () => {
  it('fecha de calendario: ancla igual en Colombia, en UTC+14 y en UTC-11', () => {
    for (const tz of ['America/Bogota', 'Pacific/Kiritimati', 'Pacific/Pago_Pago']) {
      zona(tz);
      const c = compromiso({ fechaCreacion: '2026-07-31' });
      expect(ocurrenciasEnMes(c, 2026, 6), tz).toEqual([15]);
      expect(ocurrenciasEnMes(c, 2026, 7), tz).toEqual([]);
    }
  });

  it('sin fecha o con una inválida, la frecuencia larga cae todos los meses, como antes', () => {
    zona('America/Bogota');
    for (const fechaCreacion of [undefined, null, '', 'no-date', '2026-02-30']) {
      const c = compromiso({ fechaCreacion });
      expect(ocurrenciasEnMes(c, 2026, 6), String(fechaCreacion)).toEqual([15]);
      expect(ocurrenciasEnMes(c, 2026, 7), String(fechaCreacion)).toEqual([15]);
    }
  });

  it('el registro guardado no se toca: leerlo no cambia su fechaCreacion', () => {
    zona('America/Bogota');
    const c = compromiso();
    ocurrenciasEnMes(c, 2026, 6);
    vencidosSinPagar([c], [], '2026-08-20');
    expect(c.fechaCreacion).toBe(NOCHE_31_JULIO_CO);
  });
});
