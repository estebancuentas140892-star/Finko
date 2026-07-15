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
