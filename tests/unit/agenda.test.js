import { describe, it, expect } from 'vitest';
import { eventosDelMes, totalEventosDelMes } from '../../modules/dominio/agenda/logic.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const compromisoBase = (overrides = {}) => ({
  id:          'c1',
  descripcion: 'Arriendo',
  monto:       1_500_000,
  frecuencia:  'Mensual',
  diaPago:     5,
  tipo:        'fijo',
  activo:      true,
  ...overrides,
});

// ── VALIDACIÓN DE ENTRADA ────────────────────────────────────────

describe('eventosDelMes - validación de entrada', () => {
  it('devuelve {} si compromisos no es array', () => {
    expect(eventosDelMes(null, 2026, 4)).toEqual({});
    expect(eventosDelMes(undefined, 2026, 4)).toEqual({});
    expect(eventosDelMes({}, 2026, 4)).toEqual({});
  });

  it('devuelve {} si year o month son inválidos', () => {
    expect(eventosDelMes([], NaN, 4)).toEqual({});
    expect(eventosDelMes([], 2026, -1)).toEqual({});
    expect(eventosDelMes([], 2026, 12)).toEqual({});
    expect(eventosDelMes([], 2026, 1.5)).toEqual({});
  });

  it('devuelve {} con lista vacía', () => {
    expect(eventosDelMes([], 2026, 4)).toEqual({});
  });

  it('omite compromisos inactivos', () => {
    const c = compromisoBase({ activo: false });
    expect(eventosDelMes([c], 2026, 4)).toEqual({});
  });

  it('omite compromisos sin diaPago válido', () => {
    expect(eventosDelMes([compromisoBase({ diaPago: 0 })], 2026, 4)).toEqual({});
    expect(eventosDelMes([compromisoBase({ diaPago: 32 })], 2026, 4)).toEqual({});
    expect(eventosDelMes([compromisoBase({ diaPago: null })], 2026, 4)).toEqual({});
    expect(eventosDelMes([compromisoBase({ diaPago: 'x' })], 2026, 4)).toEqual({});
  });
});

// ── FRECUENCIAS ──────────────────────────────────────────────────

describe('eventosDelMes - frecuencia Mensual', () => {
  it('cae en diaPago exacto', () => {
    const c = compromisoBase({ diaPago: 15 });
    const r = eventosDelMes([c], 2026, 4); // mayo 2026, 31 días
    expect(Object.keys(r)).toEqual(['15']);
    expect(r[15]).toHaveLength(1);
    expect(r[15][0].id).toBe('c1');
    expect(r[15][0].dia).toBe(15);
  });

  it('hace clamp a último día del mes si diaPago > daysInMonth (feb no bisiesto)', () => {
    const c = compromisoBase({ diaPago: 31 });
    const r = eventosDelMes([c], 2026, 1); // febrero 2026 = 28 días
    expect(Object.keys(r)).toEqual(['28']);
  });

  it('preserva diaPago=29 en febrero bisiesto', () => {
    const c = compromisoBase({ diaPago: 29 });
    const r = eventosDelMes([c], 2024, 1); // febrero 2024 = 29 días
    expect(Object.keys(r)).toEqual(['29']);
  });
});

describe('eventosDelMes - frecuencia Quincenal', () => {
  it('cae en diaPago y diaPago+15 cuando ambos caben', () => {
    const c = compromisoBase({ frecuencia: 'Quincenal', diaPago: 10 });
    const r = eventosDelMes([c], 2026, 4);
    expect(Object.keys(r).sort((a,b)=>+a-+b)).toEqual(['10', '25']);
  });

  it('cae solo en diaPago si diaPago+15 no cabe en el mes', () => {
    const c = compromisoBase({ frecuencia: 'Quincenal', diaPago: 20 });
    const r = eventosDelMes([c], 2026, 1); // feb 28: 20+15=35 no cabe
    expect(Object.keys(r)).toEqual(['20']);
  });
});

describe('eventosDelMes - frecuencia Semanal', () => {
  it('cae cada 7 días desde diaPago', () => {
    const c = compromisoBase({ frecuencia: 'Semanal', diaPago: 3 });
    const r = eventosDelMes([c], 2026, 4); // mayo: 31 días
    expect(Object.keys(r).sort((a,b)=>+a-+b)).toEqual(['3','10','17','24','31']);
  });

  it('respeta el final del mes', () => {
    const c = compromisoBase({ frecuencia: 'Semanal', diaPago: 28 });
    const r = eventosDelMes([c], 2026, 1); // feb 28
    expect(Object.keys(r)).toEqual(['28']);
  });
});

describe('eventosDelMes - frecuencia Diario', () => {
  it('cae todos los días del mes (28 en feb no bisiesto)', () => {
    const c = compromisoBase({ frecuencia: 'Diario' });
    const r = eventosDelMes([c], 2026, 1);
    expect(Object.keys(r)).toHaveLength(28);
    expect(r[1]).toHaveLength(1);
    expect(r[28]).toHaveLength(1);
  });

  it('cae los 31 días en mes largo', () => {
    const c = compromisoBase({ frecuencia: 'Diario' });
    const r = eventosDelMes([c], 2026, 4); // mayo
    expect(Object.keys(r)).toHaveLength(31);
  });
});

describe('eventosDelMes - frecuencias periódicas con fechaCreacion', () => {
  it('Bimestral con fechaCreacion cae sólo en meses pares desde creación', () => {
    const c = compromisoBase({
      frecuencia: 'Bimestral',
      diaPago: 10,
      fechaCreacion: '2026-01-01',
    });
    expect(eventosDelMes([c], 2026, 0)).toHaveProperty('10'); // ene
    expect(eventosDelMes([c], 2026, 1)).toEqual({});          // feb
    expect(eventosDelMes([c], 2026, 2)).toHaveProperty('10'); // mar
    expect(eventosDelMes([c], 2026, 3)).toEqual({});          // abr
  });

  it('Trimestral con fechaCreacion cae cada 3 meses', () => {
    const c = compromisoBase({
      frecuencia: 'Trimestral',
      diaPago: 5,
      fechaCreacion: '2026-02-01',
    });
    expect(eventosDelMes([c], 2026, 1)).toHaveProperty('5');  // feb
    expect(eventosDelMes([c], 2026, 2)).toEqual({});
    expect(eventosDelMes([c], 2026, 3)).toEqual({});
    expect(eventosDelMes([c], 2026, 4)).toHaveProperty('5');  // may
  });

  it('Semestral con fechaCreacion cae cada 6 meses', () => {
    const c = compromisoBase({
      frecuencia: 'Semestral',
      diaPago: 15,
      fechaCreacion: '2026-01-15',
    });
    expect(eventosDelMes([c], 2026, 0)).toHaveProperty('15');
    expect(eventosDelMes([c], 2026, 5)).toEqual({});
    expect(eventosDelMes([c], 2026, 6)).toHaveProperty('15');
  });

  it('Anual con fechaCreacion cae sólo en el mes del aniversario', () => {
    const c = compromisoBase({
      frecuencia: 'Anual',
      diaPago: 20,
      fechaCreacion: '2025-07-20',
    });
    expect(eventosDelMes([c], 2025, 6)).toHaveProperty('20'); // jul 2025
    expect(eventosDelMes([c], 2026, 6)).toHaveProperty('20'); // jul 2026
    expect(eventosDelMes([c], 2026, 5)).toEqual({});          // jun 2026
  });

  it('no cae en meses anteriores a fechaCreacion', () => {
    const c = compromisoBase({
      frecuencia: 'Anual',
      diaPago: 10,
      fechaCreacion: '2026-06-10',
    });
    expect(eventosDelMes([c], 2026, 5)).toHaveProperty('10');
    expect(eventosDelMes([c], 2026, 4)).toEqual({}); // mayo anterior a creación
  });

  it('frecuencia periódica SIN fechaCreacion: muestra siempre (fallback conservador)', () => {
    const c = compromisoBase({ frecuencia: 'Trimestral', diaPago: 10 });
    expect(eventosDelMes([c], 2026, 0)).toHaveProperty('10');
    expect(eventosDelMes([c], 2026, 1)).toHaveProperty('10');
    expect(eventosDelMes([c], 2026, 2)).toHaveProperty('10');
  });
});

describe('eventosDelMes - frecuencia Única vez', () => {
  it('cae sólo en el mes/año exacto de fechaCreacion', () => {
    const c = compromisoBase({
      frecuencia: 'Única vez',
      diaPago: 14,
      fechaCreacion: '2026-05-14',
    });
    expect(eventosDelMes([c], 2026, 4)).toHaveProperty('14');
    expect(eventosDelMes([c], 2026, 5)).toEqual({});
    expect(eventosDelMes([c], 2025, 4)).toEqual({});
  });

  it('sin fechaCreacion no aparece (no sabemos cuándo)', () => {
    const c = compromisoBase({ frecuencia: 'Única vez', diaPago: 10 });
    expect(eventosDelMes([c], 2026, 4)).toEqual({});
  });
});

describe('eventosDelMes - frecuencia desconocida', () => {
  it('fallback a comportamiento mensual (cae en diaPago)', () => {
    const c = compromisoBase({ frecuencia: 'Inexistente', diaPago: 7 });
    const r = eventosDelMes([c], 2026, 4);
    expect(Object.keys(r)).toEqual(['7']);
  });
});

// ── AGREGACIÓN ───────────────────────────────────────────────────

describe('eventosDelMes - múltiples compromisos', () => {
  it('acumula varios compromisos en el mismo día', () => {
    const c1 = compromisoBase({ id: 'c1', descripcion: 'Arriendo', diaPago: 5 });
    const c2 = compromisoBase({ id: 'c2', descripcion: 'Luz',      diaPago: 5 });
    const r = eventosDelMes([c1, c2], 2026, 4);
    expect(r[5]).toHaveLength(2);
    expect(r[5].map(c => c.id).sort()).toEqual(['c1', 'c2']);
  });

  it('distribuye compromisos por día independiente', () => {
    const c1 = compromisoBase({ id: 'c1', diaPago: 1 });
    const c2 = compromisoBase({ id: 'c2', diaPago: 15 });
    const c3 = compromisoBase({ id: 'c3', diaPago: 28 });
    const r = eventosDelMes([c1, c2, c3], 2026, 4);
    expect(Object.keys(r).sort((a,b)=>+a-+b)).toEqual(['1','15','28']);
    expect(r[1][0].id).toBe('c1');
    expect(r[15][0].id).toBe('c2');
    expect(r[28][0].id).toBe('c3');
  });

  it('cada item del map incluye el día como propiedad', () => {
    const c = compromisoBase({ frecuencia: 'Quincenal', diaPago: 3 });
    const r = eventosDelMes([c], 2026, 4);
    expect(r[3][0].dia).toBe(3);
    expect(r[18][0].dia).toBe(18);
  });

  it('no muta el compromiso original', () => {
    const c = compromisoBase({ diaPago: 10 });
    const original = { ...c };
    eventosDelMes([c], 2026, 4);
    expect(c).toEqual(original);
  });
});

// ── TOTAL ────────────────────────────────────────────────────────

describe('totalEventosDelMes', () => {
  it('devuelve 0 con input vacío o inválido', () => {
    expect(totalEventosDelMes({})).toBe(0);
    expect(totalEventosDelMes(null)).toBe(0);
    expect(totalEventosDelMes(undefined)).toBe(0);
  });

  it('suma la cantidad total de eventos a lo largo del mes', () => {
    const eventos = {
      5:  [{ id: 'a' }, { id: 'b' }],
      15: [{ id: 'c' }],
      20: [{ id: 'd' }, { id: 'e' }, { id: 'f' }],
    };
    expect(totalEventosDelMes(eventos)).toBe(6);
  });

  it('cuenta correctamente lo que devuelve eventosDelMes', () => {
    const c1 = compromisoBase({ id: 'c1', frecuencia: 'Quincenal', diaPago: 5 });
    const c2 = compromisoBase({ id: 'c2', frecuencia: 'Mensual',   diaPago: 15 });
    const r = eventosDelMes([c1, c2], 2026, 4);
    expect(totalEventosDelMes(r)).toBe(3); // 2 quincenal + 1 mensual
  });
});
