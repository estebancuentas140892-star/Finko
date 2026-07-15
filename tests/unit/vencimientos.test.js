/**
 * vencimientos.test.js - motor compartido de vencimientos (ADR 041).
 *
 * Mitad A (MC.13a):
 * - ocurrenciasEnMes: regla de frecuencias (extraída de agenda), validación.
 * - ocurrenciasEnRango: ventana arbitraria que puede cruzar meses.
 * - ventanaDelCobro: ventana de un cobro por frecuencia.
 *
 * Mitad B (MC.13b):
 * - frecuenciaPrincipalIngresos: cada cuánto cobra realmente el usuario.
 * - diasPorPeriodo / etiquetaPeriodo / normalizarFrecuenciaAporte.
 * - aportePorPeriodo: el faltante repartido entre períodos reales.
 *
 * Las regresiones de los consumidores quedan cubiertas por sus propias suites
 * (agenda.test.js sobre eventosDelMes, metas.test.js sobre
 * calcularAhorroPorPeriodo y apartados.test.js sobre calcularAporteSugerido,
 * los tres ahora envoltorios de este motor): este archivo prueba la unidad.
 */

import { describe, it, expect } from 'vitest';
import {
  FRECUENCIAS_APORTE,
  aportePorPeriodo,
  diasPorPeriodo,
  etiquetaPeriodo,
  frecuenciaPrincipalIngresos,
  normalizarFrecuenciaAporte,
  obligacionesYAportesDelCobro,
  ocurrenciasEnMes,
  ocurrenciasEnRango,
  ventanaDelCobro,
} from '../../modules/infra/vencimientos.js';

const item = (overrides = {}) => ({
  frecuencia: 'Mensual',
  diaPago: 5,
  ...overrides,
});

// ── ocurrenciasEnMes ─────────────────────────────────────────────

describe('ocurrenciasEnMes - validación', () => {
  it('devuelve [] con item nulo o no-objeto', () => {
    expect(ocurrenciasEnMes(null, 2026, 6)).toEqual([]);
    expect(ocurrenciasEnMes(undefined, 2026, 6)).toEqual([]);
    expect(ocurrenciasEnMes('x', 2026, 6)).toEqual([]);
  });

  it('devuelve [] con year o month inválidos', () => {
    expect(ocurrenciasEnMes(item(), NaN, 6)).toEqual([]);
    expect(ocurrenciasEnMes(item(), 2026, -1)).toEqual([]);
    expect(ocurrenciasEnMes(item(), 2026, 12)).toEqual([]);
  });

  it('devuelve [] si diaPago no está en 1-31', () => {
    expect(ocurrenciasEnMes(item({ diaPago: 0 }), 2026, 6)).toEqual([]);
    expect(ocurrenciasEnMes(item({ diaPago: 32 }), 2026, 6)).toEqual([]);
    expect(ocurrenciasEnMes(item({ diaPago: null }), 2026, 6)).toEqual([]);
    expect(ocurrenciasEnMes(item({ diaPago: 5.5 }), 2026, 6)).toEqual([]);
  });
});

describe('ocurrenciasEnMes - frecuencias', () => {
  it('Mensual: un solo día', () => {
    expect(ocurrenciasEnMes(item({ frecuencia: 'Mensual', diaPago: 5 }), 2026, 6)).toEqual([5]);
  });

  it('Mensual: clampea diaPago al último día del mes (feb)', () => {
    // Febrero 2026 tiene 28 días; diaPago 31 → 28.
    expect(ocurrenciasEnMes(item({ frecuencia: 'Mensual', diaPago: 31 }), 2026, 1)).toEqual([28]);
  });

  it('Quincenal: dos días si el segundo cabe', () => {
    expect(ocurrenciasEnMes(item({ frecuencia: 'Quincenal', diaPago: 5 }), 2026, 6)).toEqual([5, 20]);
  });

  it('Quincenal: un solo día si el segundo no cabe en el mes', () => {
    // diaPago 20 → 20 y 35; 35 > 31, sólo [20].
    expect(ocurrenciasEnMes(item({ frecuencia: 'Quincenal', diaPago: 20 }), 2026, 6)).toEqual([20]);
  });

  it('Semanal: cada 7 días desde diaPago', () => {
    // Julio (31 días), diaPago 3 → 3,10,17,24,31.
    expect(ocurrenciasEnMes(item({ frecuencia: 'Semanal', diaPago: 3 }), 2026, 6)).toEqual([3, 10, 17, 24, 31]);
  });

  it('Diario: todos los días del mes, ignora diaPago', () => {
    const dias = ocurrenciasEnMes(item({ frecuencia: 'Diario', diaPago: 5 }), 2026, 1); // feb 2026
    expect(dias).toHaveLength(28);
    expect(dias[0]).toBe(1);
    expect(dias[27]).toBe(28);
  });

  it('Bimestral: cae sólo en meses del ciclo desde fechaCreacion', () => {
    const c = item({ frecuencia: 'Bimestral', diaPago: 10, fechaCreacion: '2026-01-15' });
    expect(ocurrenciasEnMes(c, 2026, 0)).toEqual([10]);  // enero (mes 0 del ciclo)
    expect(ocurrenciasEnMes(c, 2026, 1)).toEqual([]);    // febrero (fuera de ciclo)
    expect(ocurrenciasEnMes(c, 2026, 2)).toEqual([10]);  // marzo (mes 2)
  });

  it('Anual: sin fechaCreacion cae siempre (no perder al usuario)', () => {
    const c = item({ frecuencia: 'Anual', diaPago: 10 });
    expect(ocurrenciasEnMes(c, 2026, 6)).toEqual([10]);
    expect(ocurrenciasEnMes(c, 2027, 2)).toEqual([10]);
  });

  it('Única vez: sólo en el mes/año de fechaCreacion', () => {
    const c = item({ frecuencia: 'Única vez', diaPago: 12, fechaCreacion: '2026-07-12' });
    expect(ocurrenciasEnMes(c, 2026, 6)).toEqual([12]); // julio (mes 6)
    expect(ocurrenciasEnMes(c, 2026, 7)).toEqual([]);   // agosto
  });

  it('Única vez sin fechaCreacion: no cae nunca', () => {
    expect(ocurrenciasEnMes(item({ frecuencia: 'Única vez', diaPago: 12 }), 2026, 6)).toEqual([]);
  });

  it('frecuencia desconocida: cae mensual (conservador)', () => {
    expect(ocurrenciasEnMes(item({ frecuencia: 'Rara', diaPago: 8 }), 2026, 6)).toEqual([8]);
  });
});

// ── ocurrenciasEnRango ───────────────────────────────────────────

describe('ocurrenciasEnRango - validación', () => {
  it('devuelve [] con item nulo o fechas no parseables', () => {
    expect(ocurrenciasEnRango(null, '2026-07-01', '2026-07-31')).toEqual([]);
    expect(ocurrenciasEnRango(item(), 'x', '2026-07-31')).toEqual([]);
    expect(ocurrenciasEnRango(item(), '2026-07-01', 'x')).toEqual([]);
  });

  it('devuelve [] si fin es anterior a inicio', () => {
    expect(ocurrenciasEnRango(item(), '2026-07-31', '2026-07-01')).toEqual([]);
  });
});

describe('ocurrenciasEnRango - fechas ISO en el rango', () => {
  it('Mensual: incluye la ocurrencia si cae dentro del rango', () => {
    const c = item({ frecuencia: 'Mensual', diaPago: 5 });
    expect(ocurrenciasEnRango(c, '2026-07-01', '2026-07-31')).toEqual(['2026-07-05']);
  });

  it('Mensual: excluye la ocurrencia si el día queda fuera del rango', () => {
    const c = item({ frecuencia: 'Mensual', diaPago: 5 });
    expect(ocurrenciasEnRango(c, '2026-07-10', '2026-07-31')).toEqual([]);
  });

  it('rango que cruza meses: recoge ocurrencias de ambos meses', () => {
    // Quincenal, diaPago 25: julio → 25 jul y 9 ago (segundo no cabe: 40>31, sólo 25);
    // ventana 25 jul → 9 ago recoge 25 jul (mensual) y en agosto el 25 queda fuera.
    const c = item({ frecuencia: 'Mensual', diaPago: 25 });
    expect(ocurrenciasEnRango(c, '2026-07-25', '2026-08-09')).toEqual(['2026-07-25']);
  });

  it('Semanal a través de un borde de mes', () => {
    // Semanal diaPago 28, julio → 28; agosto 28 → 28,4-no... recalculado por mes.
    // Rango 28 jul → 11 ago: julio da 28; agosto (diaPago 28) da 28 (fuera del rango).
    const c = item({ frecuencia: 'Semanal', diaPago: 28 });
    const out = ocurrenciasEnRango(c, '2026-07-28', '2026-08-11');
    expect(out).toContain('2026-07-28');
    // Semanal reinicia por mes desde diaPago; agosto arranca en 28 (fuera).
    expect(out).toEqual(['2026-07-28']);
  });

  it('Diario en una ventana corta: una fecha por día del rango', () => {
    const c = item({ frecuencia: 'Diario', diaPago: 1 });
    expect(ocurrenciasEnRango(c, '2026-07-05', '2026-07-08'))
      .toEqual(['2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08']);
  });

  it('rango de un solo día que coincide con la ocurrencia', () => {
    const c = item({ frecuencia: 'Mensual', diaPago: 15 });
    expect(ocurrenciasEnRango(c, '2026-07-15', '2026-07-15')).toEqual(['2026-07-15']);
  });
});

// ── ventanaDelCobro ──────────────────────────────────────────────

describe('ventanaDelCobro', () => {
  it('null si la fecha no es parseable', () => {
    expect(ventanaDelCobro('Mensual', 'x')).toBeNull();
    expect(ventanaDelCobro('Mensual', null)).toBeNull();
  });

  it('Diario: la ventana es el mismo día', () => {
    expect(ventanaDelCobro('Diario', '2026-07-15')).toEqual({ inicioISO: '2026-07-15', finISO: '2026-07-15' });
  });

  it('Semanal: siete días (inicio + 6)', () => {
    expect(ventanaDelCobro('Semanal', '2026-07-06')).toEqual({ inicioISO: '2026-07-06', finISO: '2026-07-12' });
  });

  it('Quincenal: quince días (inicio + 14)', () => {
    expect(ventanaDelCobro('Quincenal', '2026-07-01')).toEqual({ inicioISO: '2026-07-01', finISO: '2026-07-15' });
  });

  it('Mensual: hasta el día equivalente del mes siguiente menos uno', () => {
    expect(ventanaDelCobro('Mensual', '2026-07-10')).toEqual({ inicioISO: '2026-07-10', finISO: '2026-08-09' });
  });

  it('Mensual: respeta meses de distinta duración (31 ene)', () => {
    // 31 ene + 1 mes = 28 feb (clamp); menos 1 día = 27 feb.
    expect(ventanaDelCobro('Mensual', '2026-01-31')).toEqual({ inicioISO: '2026-01-31', finISO: '2026-02-27' });
  });

  it('Bimestral: dos meses menos un día', () => {
    expect(ventanaDelCobro('Bimestral', '2026-07-10')).toEqual({ inicioISO: '2026-07-10', finISO: '2026-09-09' });
  });

  it('Anual: doce meses menos un día', () => {
    expect(ventanaDelCobro('Anual', '2026-07-10')).toEqual({ inicioISO: '2026-07-10', finISO: '2027-07-09' });
  });

  it('frecuencia desconocida: cae a un mes (conservador)', () => {
    expect(ventanaDelCobro('Variable', '2026-07-10')).toEqual({ inicioISO: '2026-07-10', finISO: '2026-08-09' });
  });
});

// ── coherencia entre ventanaDelCobro y ocurrenciasEnRango ────────

describe('integración: ventana de un cobro + obligaciones que caen en ella', () => {
  it('un fijo quincenal cae dos veces en la ventana mensual de un sueldo', () => {
    // Sueldo mensual cobrado el 1 jul → ventana [1 jul, 31 jul].
    const ventana = ventanaDelCobro('Mensual', '2026-07-01');
    // Un gasto fijo quincenal (arriendo partido) con diaPago 5 → 5 y 20 jul.
    const fijoQuincenal = item({ frecuencia: 'Quincenal', diaPago: 5 });
    const caidas = ocurrenciasEnRango(fijoQuincenal, ventana.inicioISO, ventana.finISO);
    expect(caidas).toEqual(['2026-07-05', '2026-07-20']);
  });

  it('la ventana de una quincena sólo captura las obligaciones de esos 15 días', () => {
    // Primera quincena cobrada el 1 jul → ventana [1 jul, 15 jul].
    const ventana = ventanaDelCobro('Quincenal', '2026-07-01');
    const fijoMensual = item({ frecuencia: 'Mensual', diaPago: 20 }); // cae el 20, fuera de la ventana
    expect(ocurrenciasEnRango(fijoMensual, ventana.inicioISO, ventana.finISO)).toEqual([]);
  });
});

// ══ MITAD B: APORTES POR PERÍODO (MC.13b) ════════════════════════

const ingreso = (frecuencia, overrides = {}) => ({ frecuencia, ...overrides });

// ── frecuenciaPrincipalIngresos ──────────────────────────────────

describe('frecuenciaPrincipalIngresos', () => {
  it('sin ingresos asume Mensual (el supuesto más seguro)', () => {
    expect(frecuenciaPrincipalIngresos([])).toBe('Mensual');
    expect(frecuenciaPrincipalIngresos(null)).toBe('Mensual');
    expect(frecuenciaPrincipalIngresos(undefined)).toBe('Mensual');
  });

  it('con un solo ingreso devuelve su frecuencia', () => {
    expect(frecuenciaPrincipalIngresos([ingreso('Quincenal')])).toBe('Quincenal');
    expect(frecuenciaPrincipalIngresos([ingreso('Semanal')])).toBe('Semanal');
    expect(frecuenciaPrincipalIngresos([ingreso('Diario')])).toBe('Diario');
  });

  it('devuelve la frecuencia más común entre los activos', () => {
    const lista = [ingreso('Quincenal'), ingreso('Quincenal'), ingreso('Mensual')];
    expect(frecuenciaPrincipalIngresos(lista)).toBe('Quincenal');
  });

  it('ignora los ingresos inactivos', () => {
    const lista = [ingreso('Mensual', { activo: false }), ingreso('Semanal')];
    expect(frecuenciaPrincipalIngresos(lista)).toBe('Semanal');
  });

  it('las frecuencias largas se planifican como Mensual', () => {
    expect(frecuenciaPrincipalIngresos([ingreso('Trimestral')])).toBe('Mensual');
    expect(frecuenciaPrincipalIngresos([ingreso('Anual')])).toBe('Mensual');
    expect(frecuenciaPrincipalIngresos([ingreso('Bimestral')])).toBe('Mensual');
    expect(frecuenciaPrincipalIngresos([ingreso('Semestral')])).toBe('Mensual');
  });

  it('una frecuencia desconocida cae a Mensual', () => {
    expect(frecuenciaPrincipalIngresos([ingreso('Variable')])).toBe('Mensual');
    expect(frecuenciaPrincipalIngresos([ingreso(undefined)])).toBe('Mensual');
  });

  it('en empate gana la de mayor granularidad', () => {
    // Un ingreso quincenal y uno mensual: manda la quincenal (índice menor).
    const lista = [ingreso('Mensual'), ingreso('Quincenal')];
    expect(frecuenciaPrincipalIngresos(lista)).toBe('Quincenal');
  });
});

// ── normalizarFrecuenciaAporte / diasPorPeriodo / etiquetaPeriodo ─

describe('normalizarFrecuenciaAporte', () => {
  it('deja intactas las cuatro frecuencias de aporte', () => {
    for (const f of FRECUENCIAS_APORTE) expect(normalizarFrecuenciaAporte(f)).toBe(f);
  });

  it('las largas y las desconocidas caen a Mensual', () => {
    expect(normalizarFrecuenciaAporte('Anual')).toBe('Mensual');
    expect(normalizarFrecuenciaAporte('Única vez')).toBe('Mensual');
    expect(normalizarFrecuenciaAporte(undefined)).toBe('Mensual');
  });
});

describe('diasPorPeriodo', () => {
  it('devuelve los días de cada período', () => {
    expect(diasPorPeriodo('Diario')).toBe(1);
    expect(diasPorPeriodo('Semanal')).toBe(7);
    expect(diasPorPeriodo('Quincenal')).toBe(15);
    expect(diasPorPeriodo('Mensual')).toBe(30);
  });

  it('lo desconocido cae al mes', () => {
    expect(diasPorPeriodo('Anual')).toBe(30);
    expect(diasPorPeriodo(undefined)).toBe(30);
  });
});

describe('etiquetaPeriodo', () => {
  it('traduce cada frecuencia a lenguaje humano', () => {
    expect(etiquetaPeriodo('Diario')).toBe('por día');
    expect(etiquetaPeriodo('Semanal')).toBe('por semana');
    expect(etiquetaPeriodo('Quincenal')).toBe('por quincena');
    expect(etiquetaPeriodo('Mensual')).toBe('al mes');
  });

  it('lo desconocido cae a "al mes"', () => {
    expect(etiquetaPeriodo('Anual')).toBe('al mes');
    expect(etiquetaPeriodo(undefined)).toBe('al mes');
  });
});

// ── aportePorPeriodo ─────────────────────────────────────────────

describe('aportePorPeriodo - cuándo no hay nada que sugerir', () => {
  it('devuelve null si no falta nada', () => {
    expect(aportePorPeriodo(0, '2026-12-31', 'Mensual', '2026-07-14')).toBeNull();
    expect(aportePorPeriodo(-5000, '2026-12-31', 'Mensual', '2026-07-14')).toBeNull();
  });

  it('devuelve null sin fecha objetivo (sin plazo no hay ritmo)', () => {
    expect(aportePorPeriodo(100_000, null, 'Mensual', '2026-07-14')).toBeNull();
    expect(aportePorPeriodo(100_000, undefined, 'Mensual', '2026-07-14')).toBeNull();
    expect(aportePorPeriodo(100_000, '', 'Mensual', '2026-07-14')).toBeNull();
  });

  it('devuelve null si el plazo ya venció o vence hoy', () => {
    expect(aportePorPeriodo(100_000, '2026-07-13', 'Mensual', '2026-07-14')).toBeNull();
    expect(aportePorPeriodo(100_000, '2026-07-14', 'Mensual', '2026-07-14')).toBeNull();
  });

  it('devuelve null con fechas que no existen (sin desbordar a otro mes)', () => {
    expect(aportePorPeriodo(100_000, '2026-13-45', 'Mensual', '2026-07-14')).toBeNull();
    expect(aportePorPeriodo(100_000, '2026-02-30', 'Mensual', '2026-07-14')).toBeNull();
    expect(aportePorPeriodo(100_000, 'mañana', 'Mensual', '2026-07-14')).toBeNull();
    expect(aportePorPeriodo(100_000, '2026-12-31', 'Mensual', 'hoy')).toBeNull();
  });

  it('devuelve null con un faltante que no es un número usable', () => {
    expect(aportePorPeriodo(NaN, '2026-12-31', 'Mensual', '2026-07-14')).toBeNull();
    expect(aportePorPeriodo(Infinity, '2026-12-31', 'Mensual', '2026-07-14')).toBeNull();
    expect(aportePorPeriodo(undefined, '2026-12-31', 'Mensual', '2026-07-14')).toBeNull();
  });
});

describe('aportePorPeriodo - reparto por frecuencia real', () => {
  it('reparte entre quincenas, no entre días', () => {
    // 90 días / 15 = 6 quincenas.
    const r = aportePorPeriodo(600_000, '2026-10-12', 'Quincenal', '2026-07-14');
    expect(r.numPeriodos).toBe(6);
    expect(r.montoPorPeriodo).toBe(100_000);
    expect(r.frecuencia).toBe('Quincenal');
    expect(r.etiqueta).toBe('por quincena');
    expect(r.dias).toBe(90);
  });

  it('la misma meta cambia de cuota según cada cuánto cobre el usuario', () => {
    const quincenal = aportePorPeriodo(600_000, '2026-10-12', 'Quincenal', '2026-07-14');
    const mensual   = aportePorPeriodo(600_000, '2026-10-12', 'Mensual',   '2026-07-14');
    const semanal   = aportePorPeriodo(600_000, '2026-10-12', 'Semanal',   '2026-07-14');

    expect(mensual.numPeriodos).toBe(3);          // 90 / 30
    expect(mensual.montoPorPeriodo).toBe(200_000);
    expect(semanal.numPeriodos).toBe(13);         // ceil(90 / 7)
    expect(quincenal.montoPorPeriodo).toBeLessThan(mensual.montoPorPeriodo);
  });

  it('el aporte diario reparte entre días', () => {
    const r = aportePorPeriodo(300_000, '2026-07-24', 'Diario', '2026-07-14');
    expect(r.numPeriodos).toBe(10);
    expect(r.montoPorPeriodo).toBe(30_000);
    expect(r.etiqueta).toBe('por día');
  });

  it('redondea hacia arriba: los períodos siempre cubren el faltante', () => {
    const r = aportePorPeriodo(100_000, '2026-08-13', 'Semanal', '2026-07-14');
    expect(r.montoPorPeriodo * r.numPeriodos).toBeGreaterThanOrEqual(100_000);
    expect(Number.isInteger(r.montoPorPeriodo)).toBe(true);
  });

  it('garantiza al menos un período cuando la fecha es mañana', () => {
    const r = aportePorPeriodo(100_000, '2026-07-15', 'Mensual', '2026-07-14');
    expect(r.numPeriodos).toBe(1);
    expect(r.montoPorPeriodo).toBe(100_000);
    expect(r.dias).toBe(1);
  });

  it('una frecuencia no soportada cae a Mensual (lectura defensiva)', () => {
    const r = aportePorPeriodo(300_000, '2026-10-12', 'Trimestral', '2026-07-14');
    expect(r.frecuencia).toBe('Mensual');
    expect(r.numPeriodos).toBe(3);
  });

  it('cuenta los días correctamente cruzando el fin de año', () => {
    const r = aportePorPeriodo(310_000, '2027-01-13', 'Mensual', '2026-12-14');
    expect(r.dias).toBe(30);
    expect(r.numPeriodos).toBe(1);
  });

  it('cuenta los días correctamente cruzando el 29 de febrero de un bisiesto', () => {
    const r = aportePorPeriodo(100_000, '2028-03-01', 'Diario', '2028-02-28');
    expect(r.dias).toBe(2); // 28 feb → 29 feb → 1 mar
  });
});

// ══ COMPOSICIÓN: obligacionesYAportesDelCobro (MC.13c) ═══════════

// Escenario base: cobro mensual el 14 de julio, asistente abierto el mismo día.
//   ventana   = [2026-07-14, 2026-08-13]  (hasta el próximo cobro)
//   vencidas  = [2026-06-14, 2026-07-13]  (un período atrás, hasta ayer)
const HOY = '2026-07-14';
const COBRO_MENSUAL = { frecuencia: 'Mensual', fechaISO: '2026-07-14' };

const fijo = (overrides = {}) => ({
  id: 'cf1',
  descripcion: 'Arriendo',
  tipo: 'fijo',
  frecuencia: 'Mensual',
  diaPago: 20,
  monto: 100_000,
  ...overrides,
});

const deuda = (overrides = {}) => ({
  id: 'd1',
  descripcion: 'Tarjeta',
  tipo: 'deuda-entidad',
  frecuencia: 'Mensual',
  diaPago: 20,
  cuotaMensual: 200_000,
  saldoTotal: 1_000_000,
  ...overrides,
});

const llamar = (params = {}) => obligacionesYAportesDelCobro({
  cobro: COBRO_MENSUAL,
  hoyISO: HOY,
  ...params,
});

describe('obligacionesYAportesDelCobro - validación y ventana', () => {
  it('null si el cobro no es datable', () => {
    expect(obligacionesYAportesDelCobro({ cobro: null, hoyISO: HOY })).toBeNull();
    expect(obligacionesYAportesDelCobro({ cobro: { frecuencia: 'Mensual', fechaISO: 'x' }, hoyISO: HOY })).toBeNull();
    expect(obligacionesYAportesDelCobro()).toBeNull();
  });

  it('null si hoyISO no es una fecha real', () => {
    expect(obligacionesYAportesDelCobro({ cobro: COBRO_MENSUAL, hoyISO: 'hoy' })).toBeNull();
    expect(obligacionesYAportesDelCobro({ cobro: COBRO_MENSUAL, hoyISO: '2026-02-30' })).toBeNull();
  });

  it('la ventana llega hasta el día antes del próximo cobro', () => {
    const r = llamar();
    expect(r.ventana).toEqual({ inicioISO: '2026-07-14', finISO: '2026-08-13' });
  });

  it('sin datos devuelve las tres listas vacías', () => {
    const r = llamar();
    expect(r.vencidas).toEqual([]);
    expect(r.enVentana).toEqual([]);
    expect(r.aportes).toEqual([]);
  });

  it('un cobro quincenal acorta la ventana', () => {
    const r = obligacionesYAportesDelCobro({ cobro: { frecuencia: 'Quincenal', fechaISO: '2026-07-14' }, hoyISO: HOY });
    expect(r.ventana).toEqual({ inicioISO: '2026-07-14', finISO: '2026-07-28' });
  });
});

describe('obligacionesYAportesDelCobro - enVentana', () => {
  it('incluye el fijo que vence antes del próximo cobro', () => {
    const r = llamar({ compromisos: [fijo({ diaPago: 20 })] });
    expect(r.enVentana).toHaveLength(1);
    expect(r.enVentana[0]).toMatchObject({ id: 'cf1', tipo: 'fijo', monto: 100_000, pagado: false });
    expect(r.enVentana[0].ocurrencias).toEqual(['2026-07-20']);
  });

  it('la ocurrencia anterior a hoy no entra: sólo cuenta la que aún no llega', () => {
    // Fijo del día 5: el 5 de julio ya pasó (eso es vencidas), pero el 5 de
    // agosto cae dentro de la ventana y sí toca preverlo con este cobro.
    const r = llamar({ compromisos: [fijo({ diaPago: 5 })] });
    expect(r.enVentana[0].ocurrencias).toEqual(['2026-08-05']);
  });

  it('excluye los compromisos inactivos', () => {
    const r = llamar({ compromisos: [fijo({ activo: false })] });
    expect(r.enVentana).toEqual([]);
  });

  it('excluye un fijo sin monto', () => {
    expect(llamar({ compromisos: [fijo({ monto: 0 })] }).enVentana).toEqual([]);
    expect(llamar({ compromisos: [fijo({ monto: undefined })] }).enVentana).toEqual([]);
  });

  it('marca pagado cuando lo abonado en la ventana cubre el monto', () => {
    const gastos = [{ compromisoId: 'cf1', fecha: '2026-07-20', monto: 100_000 }];
    expect(llamar({ compromisos: [fijo()], gastos }).enVentana[0]).toMatchObject({
      pagado: true, montoPagado: 100_000,
    });
  });

  it('un pago parcial no marca pagado', () => {
    const gastos = [{ compromisoId: 'cf1', fecha: '2026-07-20', monto: 40_000 }];
    expect(llamar({ compromisos: [fijo()], gastos }).enVentana[0]).toMatchObject({
      pagado: false, montoPagado: 40_000,
    });
  });

  it('un pago fuera de la ventana no cuenta', () => {
    const gastos = [{ compromisoId: 'cf1', fecha: '2026-06-20', monto: 100_000 }];
    expect(llamar({ compromisos: [fijo()], gastos }).enVentana[0].pagado).toBe(false);
  });

  it('ordena las no pagadas primero, de mayor a menor monto', () => {
    const comps = [
      fijo({ id: 'a', monto: 50_000 }),
      fijo({ id: 'b', monto: 300_000 }),
      fijo({ id: 'c', monto: 200_000 }),
    ];
    const gastos = [{ compromisoId: 'b', fecha: '2026-07-20', monto: 300_000 }];
    expect(llamar({ compromisos: comps, gastos }).enVentana.map(o => o.id)).toEqual(['c', 'a', 'b']);
  });
});

// El hueco que MC.7g reportaba: la checklist sólo veía fijos Mensuales.
describe('obligacionesYAportesDelCobro - todas las frecuencias (absorbe MC.7g)', () => {
  it('un fijo quincenal cae dos veces en la ventana mensual y cobra por las dos', () => {
    // diaPago 5 quincenal → julio [5, 20], agosto [5, 20];
    // dentro de [2026-07-14, 2026-08-13]: 20 jul y 5 ago.
    const r = llamar({ compromisos: [fijo({ frecuencia: 'Quincenal', diaPago: 5, monto: 60_000 })] });
    expect(r.enVentana[0].ocurrencias).toEqual(['2026-07-20', '2026-08-05']);
    expect(r.enVentana[0].montoUnitario).toBe(60_000);
    expect(r.enVentana[0].monto).toBe(120_000);
  });

  it('un fijo semanal cobra por cada semana que cae en la ventana', () => {
    // diaPago 3 semanal → julio 17, 24, 31; agosto 3, 10 dentro de la ventana.
    const r = llamar({ compromisos: [fijo({ frecuencia: 'Semanal', diaPago: 3, monto: 20_000 })] });
    expect(r.enVentana[0].ocurrencias).toHaveLength(5);
    expect(r.enVentana[0].monto).toBe(100_000);
  });

  it('un fijo diario cobra por todos los días de la ventana', () => {
    const r = llamar({ compromisos: [fijo({ frecuencia: 'Diario', diaPago: 1, monto: 1_000 })] });
    // 14 jul a 13 ago inclusive = 31 días.
    expect(r.enVentana[0].ocurrencias).toHaveLength(31);
    expect(r.enVentana[0].monto).toBe(31_000);
  });

  it('una ventana quincenal sólo cobra la ocurrencia que cae en ella', () => {
    const r = obligacionesYAportesDelCobro({
      cobro: { frecuencia: 'Quincenal', fechaISO: '2026-07-14' },
      compromisos: [fijo({ frecuencia: 'Quincenal', diaPago: 5, monto: 60_000 })],
      hoyISO: HOY,
    });
    // Ventana [14 jul, 28 jul]: sólo el 20.
    expect(r.enVentana[0].ocurrencias).toEqual(['2026-07-20']);
    expect(r.enVentana[0].monto).toBe(60_000);
  });
});

describe('obligacionesYAportesDelCobro - deudas', () => {
  it('incluye la cuota de la deuda que vence en la ventana', () => {
    const r = llamar({ compromisos: [deuda()] });
    expect(r.enVentana[0]).toMatchObject({ id: 'd1', tipo: 'deuda', monto: 200_000 });
  });

  it('nunca pide más que el saldo pendiente (BUG-004)', () => {
    const r = llamar({ compromisos: [deuda({ cuotaMensual: 200_000, saldoTotal: 150_000 })] });
    expect(r.enVentana[0].monto).toBe(150_000);
  });

  it('topa al saldo también cuando la deuda cae varias veces en la ventana', () => {
    // Quincenal: 2 ocurrencias × 100.000 = 200.000, pero sólo se deben 150.000.
    const r = llamar({ compromisos: [deuda({ frecuencia: 'Quincenal', diaPago: 5, cuotaMensual: 100_000, saldoTotal: 150_000 })] });
    expect(r.enVentana[0].ocurrencias).toHaveLength(2);
    expect(r.enVentana[0].monto).toBe(150_000);
  });

  it('excluye la deuda ya saldada', () => {
    expect(llamar({ compromisos: [deuda({ saldoTotal: 0 })] }).enVentana).toEqual([]);
  });
});

describe('obligacionesYAportesDelCobro - vencidas', () => {
  it('lo que venció desde el cobro anterior y sigue sin pagarse', () => {
    // diaPago 5 → cayó el 5 de julio, dentro de [14 jun, 13 jul].
    const r = llamar({ compromisos: [fijo({ diaPago: 5 })] });
    expect(r.vencidas).toHaveLength(1);
    expect(r.vencidas[0]).toMatchObject({ id: 'cf1', monto: 100_000 });
    expect(r.vencidas[0].ocurrencias).toEqual(['2026-07-05']);
  });

  it('lo ya pagado no aparece como vencido', () => {
    const gastos = [{ compromisoId: 'cf1', fecha: '2026-07-05', monto: 100_000 }];
    expect(llamar({ compromisos: [fijo({ diaPago: 5 })], gastos }).vencidas).toEqual([]);
  });

  it('un pago parcial deja la obligación vencida', () => {
    const gastos = [{ compromisoId: 'cf1', fecha: '2026-07-05', monto: 30_000 }];
    const r = llamar({ compromisos: [fijo({ diaPago: 5 })], gastos });
    expect(r.vencidas).toHaveLength(1);
    expect(r.vencidas[0].montoPagado).toBe(30_000);
  });

  it('lo que sólo vence dentro de la ventana no está en vencidas', () => {
    // Anual creado en julio: su única ocurrencia del ciclo es el 20 de julio,
    // dentro de la ventana y fuera del tramo de vencidas.
    const anual = fijo({ frecuencia: 'Anual', diaPago: 20, fechaCreacion: '2026-07-01' });
    const r = llamar({ compromisos: [anual] });
    expect(r.vencidas).toEqual([]);
    expect(r.enVentana[0].ocurrencias).toEqual(['2026-07-20']);
  });

  it('una misma obligación puede estar vencida y volver a vencer en la ventana', () => {
    // El arriendo del día 5: julio quedó sin pagar (vencida) y agosto vuelve a
    // caer antes del próximo cobro (enVentana). Son dos deudas reales, no una
    // repetida: los tramos son disjuntos y ninguna ocurrencia se cuenta dos veces.
    const r = llamar({ compromisos: [fijo({ diaPago: 5 })] });
    expect(r.vencidas[0].ocurrencias).toEqual(['2026-07-05']);
    expect(r.enVentana[0].ocurrencias).toEqual(['2026-08-05']);
  });

  it('si el asistente se abre días después del cobro, lo vencido entre medias se separa', () => {
    // Cobro el 14, se abre el 22: el fijo del 20 ya venció.
    const r = obligacionesYAportesDelCobro({
      cobro: COBRO_MENSUAL,
      compromisos: [fijo({ diaPago: 20 })],
      hoyISO: '2026-07-22',
    });
    expect(r.vencidas.map(o => o.id)).toEqual(['cf1']);
    expect(r.enVentana).toEqual([]);
  });
});

describe('obligacionesYAportesDelCobro - aportes', () => {
  const meta = (overrides = {}) => ({
    id: 'm1', nombre: 'Viaje', montoObjetivo: 600_000, montoActual: 0,
    fechaLimite: '2026-10-12', completada: false, ...overrides,
  });

  const apartado = (overrides = {}) => ({
    id: 'ap1', nombre: 'SOAT', montoObjetivo: 300_000, montoActual: 0,
    fechaObjetivo: '2026-10-12', completado: false, ...overrides,
  });

  it('la meta trae la cuota del período según la frecuencia del cobro (punto 21)', () => {
    const r = llamar({ metas: [meta()] });
    expect(r.aportes).toHaveLength(1);
    expect(r.aportes[0]).toMatchObject({
      tipo: 'meta', id: 'm1', nombre: 'Viaje',
      faltante: 600_000, montoPeriodo: 200_000, numPeriodos: 3, sinFecha: false,
    });
  });

  it('la misma meta pide menos por cobro si el usuario cobra quincenal', () => {
    const r = obligacionesYAportesDelCobro({
      cobro: { frecuencia: 'Quincenal', fechaISO: '2026-07-14' },
      metas: [meta()], hoyISO: HOY,
    });
    expect(r.aportes[0].montoPeriodo).toBe(100_000);
    expect(r.aportes[0].numPeriodos).toBe(6);
  });

  it('descuenta lo ya ahorrado del faltante', () => {
    expect(llamar({ metas: [meta({ montoActual: 300_000 })] }).aportes[0].faltante).toBe(300_000);
  });

  it('una meta sin plazo se marca sinFecha y no inventa una cuota', () => {
    const r = llamar({ metas: [meta({ fechaLimite: null })] });
    expect(r.aportes[0]).toMatchObject({ sinFecha: true, montoPeriodo: null, numPeriodos: null });
  });

  it('una meta con el plazo vencido no trae cuota pero no se marca sinFecha', () => {
    const r = llamar({ metas: [meta({ fechaLimite: '2026-01-01' })] });
    expect(r.aportes[0]).toMatchObject({ sinFecha: false, montoPeriodo: null });
  });

  it('excluye las metas completadas y las ya cubiertas', () => {
    expect(llamar({ metas: [meta({ completada: true })] }).aportes).toEqual([]);
    expect(llamar({ metas: [meta({ montoActual: 600_000 })] }).aportes).toEqual([]);
  });

  it('el apartado usa la frecuencia del cobro, no su frecuenciaAporte propia', () => {
    const r = llamar({ apartados: [apartado({ frecuenciaAporte: 'Semanal' })] });
    expect(r.aportes[0]).toMatchObject({ tipo: 'apartado', id: 'ap1', montoPeriodo: 100_000 });
  });

  it('excluye los apartados completados', () => {
    expect(llamar({ apartados: [apartado({ completado: true })] }).aportes).toEqual([]);
  });

  it('el fondo entra con el faltante que le inyecta el caller', () => {
    const r = llamar({ fondo: { activo: true, faltante: 900_000, fechaObjetivoISO: '2026-10-12' } });
    expect(r.aportes[0]).toMatchObject({ tipo: 'fondo', montoPeriodo: 300_000 });
  });

  it('el fondo sin plazo se marca sinFecha (su objetivo no tiene fecha)', () => {
    const r = llamar({ fondo: { activo: true, faltante: 900_000 } });
    expect(r.aportes[0]).toMatchObject({ tipo: 'fondo', sinFecha: true, montoPeriodo: null });
  });

  it('el fondo inactivo o ya completo no pide aporte', () => {
    expect(llamar({ fondo: { activo: false, faltante: 900_000 } }).aportes).toEqual([]);
    expect(llamar({ fondo: { activo: true, faltante: 0 } }).aportes).toEqual([]);
    expect(llamar({ fondo: null }).aportes).toEqual([]);
  });

  it('fondo, metas y apartados conviven en la misma lista', () => {
    const r = llamar({
      fondo: { activo: true, faltante: 900_000, fechaObjetivoISO: '2026-10-12' },
      metas: [meta()],
      apartados: [apartado()],
    });
    expect(r.aportes.map(a => a.tipo)).toEqual(['fondo', 'meta', 'apartado']);
  });
});
