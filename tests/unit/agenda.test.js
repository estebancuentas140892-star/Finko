import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eventosDelMes, eventosIngresosDelMes, totalEventosDelMes, totalDia, eventosDeHoy, eventosEnProximos, tiposPresentesEnMes, totalesDelMes, pendientesDePagoDelMes } from '../../modules/dominio/agenda/logic.js';
import { renderFormGastoFijo, renderFormPagoLote, textoBannerGastoFijo, renderAgenda, mostrarDia, navegarMes, resetearVistaAlMesActual, marcarEntradaSeccion, resumenMesVisible, diaSeleccionado } from '../../modules/dominio/agenda/view.js';
import { S } from '../../modules/core/state.js';
import { CATEGORIAS_AGENDA, CATEGORIA_AGENDA_ICONO } from '../../modules/core/constants.js';

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

  it('cae en el último día del mes si diaPago+15 no cabe (BUG-017)', () => {
    const c = compromisoBase({ frecuencia: 'Quincenal', diaPago: 20 });
    const r = eventosDelMes([c], 2026, 1); // feb 28: 20+15=35 se clampea a 28
    expect(Object.keys(r).sort((a, b) => +a - +b)).toEqual(['20', '28']);
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

// ── LEYENDA DINÁMICA (CAL.2) ──────────────────────────────────────

describe('tiposPresentesEnMes', () => {
  it('devuelve [] con input vacío o inválido', () => {
    expect(tiposPresentesEnMes({})).toEqual([]);
    expect(tiposPresentesEnMes(null)).toEqual([]);
    expect(tiposPresentesEnMes(undefined)).toEqual([]);
  });

  it('sin eventos en ningún día, devuelve []', () => {
    expect(tiposPresentesEnMes({ 5: [], 15: [] })).toEqual([]);
  });

  it('devuelve solo los tipos presentes, en el orden canónico de la leyenda', () => {
    const eventos = {
      5:  [{ tipo: 'deuda-personal' }],
      15: [{ tipo: 'fijo' }],
    };
    expect(tiposPresentesEnMes(eventos)).toEqual(['fijo', 'deuda-personal']);
  });

  it('con los cuatro tipos presentes, los devuelve todos en orden', () => {
    const eventos = {
      1: [{ tipo: 'ingreso' }, { tipo: 'fijo' }],
      2: [{ tipo: 'deuda-entidad' }, { tipo: 'deuda-personal' }],
    };
    expect(tiposPresentesEnMes(eventos)).toEqual(['ingreso', 'fijo', 'deuda-entidad', 'deuda-personal']);
  });

  it('no duplica un tipo que aparece en varios días', () => {
    const eventos = {
      5:  [{ tipo: 'fijo' }],
      10: [{ tipo: 'fijo' }],
      20: [{ tipo: 'fijo' }],
    };
    expect(tiposPresentesEnMes(eventos)).toEqual(['fijo']);
  });

  it('un compromiso sin tipo cuenta como "fijo" (mismo criterio defensivo que _renderDots)', () => {
    const eventos = { 5: [{ descripcion: 'Sin tipo explícito' }] };
    expect(tiposPresentesEnMes(eventos)).toEqual(['fijo']);
  });

  it('coincide con lo que produce eventosDelMes + eventosIngresosDelMes reales', () => {
    const compromisos = [
      compromisoBase({ id: 'f1', tipo: 'fijo', diaPago: 5 }),
      compromisoBase({ id: 'd1', tipo: 'deuda-entidad', diaPago: 10 }),
    ];
    const eventos = eventosDelMes(compromisos, 2026, 4);
    expect(tiposPresentesEnMes(eventos)).toEqual(['fijo', 'deuda-entidad']);
  });
});

// ── TOTAL A PAGAR POR DÍA (AG.5) ─────────────────────────────────

describe('totalDia', () => {
  it('devuelve 0 con input vacío o inválido', () => {
    expect(totalDia([])).toBe(0);
    expect(totalDia(null)).toBe(0);
    expect(totalDia(undefined)).toBe(0);
  });

  it('suma el monto de los gastos fijos', () => {
    const evs = [
      compromisoBase({ id: 'c1', tipo: 'fijo', monto: 100_000 }),
      compromisoBase({ id: 'c2', tipo: 'fijo', monto: 50_000 }),
    ];
    expect(totalDia(evs)).toBe(150_000);
  });

  it('suma la cuotaMensual de las deudas, no el saldoTotal', () => {
    const evs = [
      compromisoBase({ id: 'c1', tipo: 'deuda-entidad', cuotaMensual: 200_000, saldoTotal: 5_000_000 }),
      compromisoBase({ id: 'c2', tipo: 'deuda-personal', cuotaMensual: 80_000, saldoTotal: 1_000_000 }),
    ];
    expect(totalDia(evs)).toBe(280_000);
  });

  it('mezcla fijos y deudas el mismo día', () => {
    const evs = [
      compromisoBase({ id: 'c1', tipo: 'fijo', monto: 100_000 }),
      compromisoBase({ id: 'c2', tipo: 'deuda-entidad', cuotaMensual: 200_000 }),
    ];
    expect(totalDia(evs)).toBe(300_000);
  });

  it('ignora montos no numéricos sin reventar', () => {
    const evs = [
      compromisoBase({ id: 'c1', tipo: 'fijo', monto: 100_000 }),
      compromisoBase({ id: 'c2', tipo: 'fijo', monto: undefined }),
      { id: 'c3' }, // sin tipo ni monto
    ];
    expect(totalDia(evs)).toBe(100_000);
  });

  it('ignora entradas nulas o no-objeto en la lista', () => {
    const evs = [compromisoBase({ id: 'c1', tipo: 'fijo', monto: 100_000 }), null, undefined];
    expect(totalDia(evs)).toBe(100_000);
  });
});

// ── EVENTOS DE HOY ───────────────────────────────────────────────

describe('eventosDeHoy', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(()  => { vi.useRealTimers(); });

  it('devuelve los compromisos que caen en el día actual', () => {
    vi.setSystemTime(new Date(2026, 4, 5)); // 5 mayo 2026
    const c = compromisoBase({ diaPago: 5, frecuencia: 'Mensual' });
    const r = eventosDeHoy([c]);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('c1');
  });

  it('devuelve [] si no hay compromisos en el día de hoy', () => {
    vi.setSystemTime(new Date(2026, 4, 10)); // 10 mayo, compromiso cae el 5
    const c = compromisoBase({ diaPago: 5, frecuencia: 'Mensual' });
    expect(eventosDeHoy([c])).toEqual([]);
  });

  it('devuelve [] con lista vacía', () => {
    vi.setSystemTime(new Date(2026, 4, 5));
    expect(eventosDeHoy([])).toEqual([]);
  });

  it('devuelve [] con input no-array', () => {
    vi.setSystemTime(new Date(2026, 4, 5));
    expect(eventosDeHoy(null)).toEqual([]);
    expect(eventosDeHoy(undefined)).toEqual([]);
  });

  it('incluye todos los compromisos que caen hoy (varios)', () => {
    vi.setSystemTime(new Date(2026, 4, 15)); // 15 mayo
    const c1 = compromisoBase({ id: 'c1', diaPago: 15, frecuencia: 'Mensual' });
    const c2 = compromisoBase({ id: 'c2', diaPago: 1,  frecuencia: 'Quincenal' }); // 1 y 16
    const c3 = compromisoBase({ id: 'c3', diaPago: 15, frecuencia: 'Mensual' });
    const r = eventosDeHoy([c1, c2, c3]);
    // c2 cae en 1 y 16, no en 15
    expect(r.map(c => c.id).sort()).toEqual(['c1', 'c3']);
  });

  it('omite compromisos inactivos', () => {
    vi.setSystemTime(new Date(2026, 4, 5));
    const activo   = compromisoBase({ id: 'activo',   diaPago: 5, activo: true });
    const inactivo = compromisoBase({ id: 'inactivo', diaPago: 5, activo: false });
    const r = eventosDeHoy([activo, inactivo]);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('activo');
  });
});

// ── EVENTOS EN PRÓXIMOS ──────────────────────────────────────────

describe('eventosEnProximos', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(()  => { vi.useRealTimers(); });

  it('devuelve el primer día con compromisos dentro de la ventana', () => {
    vi.setSystemTime(new Date(2026, 4, 1)); // 1 mayo, compromiso el día 5
    const c = compromisoBase({ diaPago: 5, frecuencia: 'Mensual' });
    const r = eventosEnProximos([c], 14);
    expect(r).not.toBeNull();
    expect(r.diasRestantes).toBe(4);
    expect(r.eventos).toHaveLength(1);
    expect(r.fecha.getDate()).toBe(5);
  });

  it('devuelve null si no hay compromisos en la ventana', () => {
    vi.setSystemTime(new Date(2026, 4, 6)); // 6 mayo, compromiso era el 5
    const c = compromisoBase({ diaPago: 5, frecuencia: 'Mensual' });
    expect(eventosEnProximos([c], 14)).toBeNull();
  });

  it('no incluye el día de hoy (busca desde +1 día)', () => {
    vi.setSystemTime(new Date(2026, 4, 5)); // hoy ES el día del compromiso
    const c = compromisoBase({ diaPago: 5, frecuencia: 'Mensual' });
    // Próximo sería el mes siguiente (5 junio = 31 días fuera, ventana 14)
    expect(eventosEnProximos([c], 14)).toBeNull();
  });

  it('respeta la ventana de búsqueda (diasMax)', () => {
    vi.setSystemTime(new Date(2026, 4, 1)); // 1 mayo, compromiso el 20 mayo
    const c = compromisoBase({ diaPago: 20, frecuencia: 'Mensual' });
    expect(eventosEnProximos([c], 14)).toBeNull();  // 20 queda fuera de 14 días
    expect(eventosEnProximos([c], 20)).not.toBeNull(); // 20 entra con ventana=20
  });

  it('calcula diasRestantes y fecha correctamente', () => {
    vi.setSystemTime(new Date(2026, 4, 10)); // 10 mayo, compromiso el 15 mayo
    const c = compromisoBase({ diaPago: 15, frecuencia: 'Mensual' });
    const r = eventosEnProximos([c], 14);
    expect(r).not.toBeNull();
    expect(r.diasRestantes).toBe(5);
    expect(r.fecha.getDate()).toBe(15);
    expect(r.fecha.getMonth()).toBe(4); // mayo (0-indexed)
  });

  it('devuelve null con lista vacía', () => {
    vi.setSystemTime(new Date(2026, 4, 1));
    expect(eventosEnProximos([], 14)).toBeNull();
  });

  it('atraviesa el cambio de mes correctamente', () => {
    vi.setSystemTime(new Date(2026, 4, 28)); // 28 mayo, compromiso el 3 de junio
    const c = compromisoBase({ diaPago: 3, frecuencia: 'Mensual' });
    const r = eventosEnProximos([c], 10);
    expect(r).not.toBeNull();
    expect(r.diasRestantes).toBe(6); // 28 + 6 = 3 junio
    expect(r.fecha.getMonth()).toBe(5); // junio
    expect(r.fecha.getDate()).toBe(3);
  });
});

// ── renderFormGastoFijo() - selector de categoría (Agenda) ────────
// FORM.1c (ADR 042 D5): la categoría son chips de ícono (radios reales
// name="categoria"), no un <select>; mismo lenguaje que Registrar gasto
// (FORM.1a) y Nueva deuda (FORM.1b).

describe('renderFormGastoFijo() - selector de categoría', () => {
  it('incluye un chip de radio para cada categoría de CATEGORIAS_AGENDA (ID.3)', () => {
    const html = renderFormGastoFijo();
    expect(html).toContain('chips-cat');
    expect(html).not.toContain('<select id="gfijo-categoria"');
    // CAT.3c: +1 por el chip sentinela "Categoría nueva" (S.categoriasPersonalizadas
    // sin entradas de sección 'fijo' en este describe, así que no suma más chips).
    const radios = html.match(/name="categoria"/g) ?? [];
    expect(radios).toHaveLength(CATEGORIAS_AGENDA.length + 1);
    for (const c of CATEGORIAS_AGENDA) {
      expect(html).toContain(`value="${c}"`);
      expect(html).toContain(`<use href="#${CATEGORIA_AGENDA_ICONO[c]}"/>`);
    }
  });

  it('CAT.3c: incluye el chip sentinela "Categoría nueva" al final del catálogo', () => {
    const html = renderFormGastoFijo();
    expect(html).toContain('value="__nueva__"');
    expect(html).toContain('Categoría nueva');
    expect(html).toContain('#i-plus');
  });

  it('CAT.3c: suma un chip por cada personalizada de sección fijo, filtrando las de gasto', () => {
    S.categoriasPersonalizadas = [
      { id: 'p1', nombre: 'Netflix', icono: 'c-streaming', seccion: 'fijo', fechaCreacion: '2026-01-01' },
      { id: 'p2', nombre: 'Almuerzo', icono: 'c-mercado', seccion: 'gasto', fechaCreacion: '2026-01-01' },
    ];
    try {
      const html = renderFormGastoFijo();
      expect(html).toContain('value="Netflix"');
      expect(html).not.toContain('value="Almuerzo"');
    } finally {
      S.categoriasPersonalizadas = [];
    }
  });

  it('la categoría es opcional: ningún chip nace marcado', () => {
    const html = renderFormGastoFijo();
    const div = document.createElement('div');
    div.innerHTML = html;
    expect(div.querySelector('input[name="categoria"]:checked')).toBeNull();
  });

  it('AG.4: la categoría va antes que el campo de nombre en el DOM', () => {
    const html = renderFormGastoFijo();
    expect(html.indexOf('id="gfijo-categoria-label"')).toBeLessThan(html.indexOf('id="gfijo-descripcion"'));
  });

  it('AG.4: en el estado por defecto (sin categoría), el campo nace requerido con label "Descripción"', () => {
    const html = renderFormGastoFijo();
    expect(html).toContain('id="gfijo-descripcion-label">Descripción<');
    const inputMatch = html.match(/<input id="gfijo-descripcion"[^>]*>/);
    expect(inputMatch).not.toBeNull();
    expect(inputMatch[0]).toContain('required');
  });
});

// ── renderFormGastoFijo() - lenguaje v2 (FORM.1c, ADR 042 D5) ─────

describe('renderFormGastoFijo() - lenguaje de formularios v2', () => {
  it('el monto vive en el hero con el input grande centrado', () => {
    const html = renderFormGastoFijo();
    expect(html).toContain('monto-hero__box');
    expect(html).toContain('input--big-amount');
  });

  it('frecuencia y día de pago comparten una fila', () => {
    const html = renderFormGastoFijo();
    const div = document.createElement('div');
    div.innerHTML = html;
    const fila = div.querySelector('.form-row');
    expect(fila).not.toBeNull();
    expect(fila.querySelector('[name="frecuencia"]')).not.toBeNull();
    expect(fila.querySelector('[name="diaPago"]')).not.toBeNull();
  });

  it('el pie usa el botón primario a lo ancho con el glifo de confirmación', () => {
    const html = renderFormGastoFijo();
    expect(html).toContain('modal__footer--principal');
    expect(html).toContain('#i-check-circle');
  });

  it('el banner informativo nace con el texto de Mensual sin día (valor por defecto del form)', () => {
    const html = renderFormGastoFijo();
    expect(html).toContain('id="gfijo-banner"');
    expect(html).toContain(textoBannerGastoFijo('Mensual', ''));
  });
});

// ── textoBannerGastoFijo() (FORM.1c, ADR 042 D5) ──────────────────

describe('textoBannerGastoFijo()', () => {
  it('arma la frase con la frecuencia y el día elegidos', () => {
    expect(textoBannerGastoFijo('Mensual', 5)).toBe('Aparecerá cada mes en tu calendario el día 5.');
    expect(textoBannerGastoFijo('Quincenal', '20')).toBe('Aparecerá cada quincena en tu calendario el día 20.');
    expect(textoBannerGastoFijo('Anual', 15)).toBe('Aparecerá cada año en tu calendario el día 15.');
  });

  it('"Única vez" no repite "cada"', () => {
    expect(textoBannerGastoFijo('Única vez', 3)).toBe('Aparecerá una vez en tu calendario el día 3.');
  });

  it('sin día válido, cierra con un texto neutro en vez de inventar una fecha', () => {
    expect(textoBannerGastoFijo('Mensual', '')).toBe('Aparecerá cada mes en tu calendario el día que elijas.');
    expect(textoBannerGastoFijo('Mensual', 0)).toBe('Aparecerá cada mes en tu calendario el día que elijas.');
    expect(textoBannerGastoFijo('Mensual', 32)).toBe('Aparecerá cada mes en tu calendario el día que elijas.');
  });

  it('frecuencia desconocida cae al mismo criterio de "Mensual"', () => {
    expect(textoBannerGastoFijo('', 10)).toBe('Aparecerá cada mes en tu calendario el día 10.');
  });
});

// ── renderFormGastoFijo() - picker de ícono para "Otro" (CAT.2f) ──

describe('renderFormGastoFijo() - picker de ícono para "Otro" (CAT.2f)', () => {
  it('incluye el grupo del picker, oculto por defecto', () => {
    const html = renderFormGastoFijo();
    expect(html).toMatch(/id="form-group-gfijo-icono"[^>]*hidden/);
    expect(html).toContain('data-icono-picker="gfijo-icono"');
  });
});

// ── renderFormGastoFijo() - nombre + ícono de categoría nueva (CAT.3c) ──

describe('renderFormGastoFijo() - campos de categoría nueva (CAT.3c)', () => {
  it('incluye el grupo de nombre + ícono, oculto por defecto', () => {
    const html = renderFormGastoFijo();
    expect(html).toMatch(/id="gfijo-categoria-nueva-fields"[^>]*hidden/);
    expect(html).toContain('name="categoriaNuevaNombre"');
    expect(html).toContain('data-icono-picker="gfijo-categoria-nueva-icono"');
  });
});

// ── renderAgenda() - categoría en el detalle del día ──────────────

describe('renderAgenda() - categoría en el detalle del día', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('AG.2/ID.3: con categoría, la teja de categoría es el ícono principal (izquierda)', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual', categoria: 'Internet' })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const item = document.querySelector('.cal-detail__item');
    const teja = item.querySelector('.cal-detail__icon .cat-teja');
    expect(teja).not.toBeNull();
    expect(teja.innerHTML).toContain(`#${CATEGORIA_AGENDA_ICONO['Internet']}`);
    expect(item.querySelector('.cal-detail__sub').textContent).toContain('Internet');
  });

  it('sin categoría no agrega nada después de la frecuencia en el detalle', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual', categoria: null })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const html = document.getElementById('panel-agenda').innerHTML;
    expect(html).toContain('Gasto fijo · Mensual</p>');
  });

  it('las deudas no muestran categoría (campo exclusivo de tipo=fijo)', () => {
    S.compromisos = [compromisoBase({
      diaPago: 15, frecuencia: 'Mensual', tipo: 'deuda-personal',
      cuotaMensual: 100_000, saldoTotal: 1_000_000, categoria: 'Internet',
    })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const html = document.getElementById('panel-agenda').innerHTML;
    expect(html).not.toContain('🌐');
    expect(html).not.toContain('Internet');
  });

  it('CAT.2f: categoría "Otro" con ícono elegido por el usuario prevalece sobre el ícono genérico', () => {
    S.compromisos = [compromisoBase({
      diaPago: 15, frecuencia: 'Mensual', categoria: 'Otro', icono: 'c-cohete', descripcion: 'Suscripción rara',
    })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const item = document.querySelector('.cal-detail__item');
    const teja = item.querySelector('.cal-detail__icon .cat-teja');
    expect(teja).not.toBeNull();
    expect(teja.innerHTML).toContain('#c-cohete');
  });

  it('CAT.2f: categoría "Otro" sin ícono elegido conserva el ícono fijo del catálogo (c-otros)', () => {
    S.compromisos = [compromisoBase({
      diaPago: 15, frecuencia: 'Mensual', categoria: 'Otro', descripcion: 'Suscripción rara',
    })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const item = document.querySelector('.cal-detail__item');
    const teja = item.querySelector('.cal-detail__icon .cat-teja');
    expect(teja).not.toBeNull();
    expect(teja.innerHTML).toContain(`#${CATEGORIA_AGENDA_ICONO['Otro']}`);
  });
});

// ── renderAgenda() - emoji de categoría como ícono principal (AG.2) ─

describe('renderAgenda() - emoji de categoría como ícono principal', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sin categoría, el ícono principal usa el ícono genérico del tipo (fallback)', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual', categoria: null })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const iconoEl = document.querySelector('.cal-detail__icon');
    expect(iconoEl.querySelector('svg')).not.toBeNull();
  });

  it('con categoría, el ícono principal es la teja de categoría con el glifo del sprite (ID.3)', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual', categoria: 'Internet' })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const iconoEl = document.querySelector('.cal-detail__icon');
    const teja = iconoEl.querySelector('.cat-teja');
    expect(teja).not.toBeNull();
    expect(teja.getAttribute('data-dom')).toBe('presupuesto');
    expect(teja.innerHTML).toContain(`#${CATEGORIA_AGENDA_ICONO['Internet']}`);
  });

  it('una deuda con entidad usa el ícono genérico del tipo, no hay campo categoría', () => {
    S.compromisos = [compromisoBase({
      id: 'd1', diaPago: 15, frecuencia: 'Mensual', tipo: 'deuda-entidad',
      cuotaMensual: 200_000, saldoTotal: 2_000_000,
    })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const iconoEl = document.querySelector('.cal-detail__icon');
    expect(iconoEl.querySelector('svg')).not.toBeNull();
  });
});

// ── renderAgenda() - teja de marca como ícono principal (MK.2) ────

describe('renderAgenda() - teja de marca como ícono principal', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('con la marca en la nota (AG.4: categoría predefinida), la teja de marca gana a la de categoría', () => {
    S.compromisos = [compromisoBase({
      diaPago: 15, frecuencia: 'Mensual',
      descripcion: 'Streaming', categoria: 'Streaming', nota: 'Netflix',
    })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const iconoEl = document.querySelector('.cal-detail__icon');
    expect(iconoEl.querySelector('.bank-avatar')).not.toBeNull();
    expect(iconoEl.innerHTML).toContain('#b-netflix');
    expect(iconoEl.querySelector('.cat-teja')).toBeNull();
  });

  it('con la marca en la descripción (categoría "Otro"), también resuelve', () => {
    S.compromisos = [compromisoBase({
      diaPago: 15, frecuencia: 'Mensual', descripcion: 'Spotify familiar', categoria: 'Otro',
    })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    expect(document.querySelector('.cal-detail__icon').innerHTML).toContain('#b-spotify');
  });

  it('un compromiso que nombra una marca sin glifo muestra su teja con iniciales y color', () => {
    // Con BR.3 completo, todo banco/billetera real del catálogo ya tiene
    // glifo propio; ChatGPT (MARCAS) sigue sin símbolo y ejemplifica el
    // fallback de iniciales sobre el flujo completo de resolverMarca().
    S.compromisos = [compromisoBase({
      id: 'd1', diaPago: 15, frecuencia: 'Mensual', tipo: 'deuda-entidad',
      descripcion: 'Suscripción ChatGPT', cuotaMensual: 200_000, saldoTotal: 2_000_000,
    })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const teja = document.querySelector('.cal-detail__icon .bank-avatar');
    expect(teja).not.toBeNull();
    expect(teja.textContent).toBe('AI');
    expect(teja.getAttribute('style')).toContain('background:#10A37F');
  });

  it('sin marca en el nombre, el fallback de AG.2 queda intacto (teja de categoría o ícono del tipo)', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual', categoria: 'Internet' })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const iconoEl = document.querySelector('.cal-detail__icon');
    expect(iconoEl.querySelector('.bank-avatar')).toBeNull();
    expect(iconoEl.innerHTML).toContain(`#${CATEGORIA_AGENDA_ICONO['Internet']}`);
  });
});

// ── renderAgenda() - nombre automático por categoría (AG.4) ───────

describe('renderAgenda() - nombre automático por categoría', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('con descripción igual a la categoría (nombre automático), no repite la categoría en el subtítulo', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual', descripcion: 'Mercado', categoria: 'Mercado' })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const item = document.querySelector('.cal-detail__item');
    expect(item.querySelector('.cal-detail__name').textContent).toBe('Mercado');
    // "Mercado" solo debe aparecer una vez: en el título, no repetido en el subtítulo.
    const sub = item.querySelector('.cal-detail__sub').textContent;
    expect(sub).not.toContain('Mercado');
  });

  it('con categoría "Otro" y nombre propio (distinto de la categoría), sí muestra la categoría en el subtítulo', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual', descripcion: 'Suscripción Xbox', categoria: 'Otro' })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const item = document.querySelector('.cal-detail__item');
    expect(item.querySelector('.cal-detail__name').textContent).toBe('Suscripción Xbox');
    expect(item.querySelector('.cal-detail__sub').textContent).toContain('Otro');
  });

  it('con nota, la muestra en el subtítulo del registro', () => {
    S.compromisos = [compromisoBase({
      diaPago: 15, frecuencia: 'Mensual', descripcion: 'Mercado', categoria: 'Mercado', nota: 'Éxito de la esquina',
    })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const item = document.querySelector('.cal-detail__item');
    expect(item.querySelector('.cal-detail__sub').textContent).toContain('Éxito de la esquina');
  });

  it('sin nota, no agrega nada extra al subtítulo', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual', descripcion: 'Mercado', categoria: 'Mercado' })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const item = document.querySelector('.cal-detail__item');
    expect(item.querySelector('.cal-detail__sub').textContent).toBe('Gasto fijo · Mensual');
  });
});

// ── renderAgenda() - total a pagar por día (AG.5) ─────────────────

describe('renderAgenda() - total a pagar por día', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('con un compromiso, muestra "Total a pagar" con el monto', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual', monto: 300_000 })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const html = document.getElementById('panel-agenda').innerHTML;
    expect(html).toContain('cal-detail__total');
    expect(html).toContain('Total a pagar');
    expect(html).toContain('$300.000');
  });

  it('con varios compromisos, el total es la suma de todos', () => {
    S.compromisos = [
      compromisoBase({ id: 'c1', diaPago: 15, frecuencia: 'Mensual', monto: 300_000 }),
      compromisoBase({
        id: 'c2', diaPago: 15, frecuencia: 'Mensual', tipo: 'deuda-entidad',
        cuotaMensual: 200_000, saldoTotal: 5_000_000,
      }),
    ];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const html = document.getElementById('panel-agenda').innerHTML;
    expect(html).toContain('$500.000');
  });

  it('sin monto en ningún compromiso del día, no muestra la línea de total', () => {
    S.compromisos = [compromisoBase({
      diaPago: 15, frecuencia: 'Mensual', tipo: 'deuda-entidad',
      cuotaMensual: undefined, saldoTotal: 1_000_000,
    })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const html = document.getElementById('panel-agenda').innerHTML;
    expect(html).not.toContain('cal-detail__total');
  });

  it('sin día seleccionado, no hay panel de detalle ni total', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual', monto: 300_000 })];
    renderAgenda();
    const html = document.getElementById('panel-agenda').innerHTML;
    expect(html).not.toContain('cal-detail__total');
  });
});

// ── renderAgenda() - leyenda bajo el calendario (AG.6) ────────────

describe('renderAgenda() - leyenda bajo el calendario', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('con los tres tipos presentes en el mes, la leyenda los muestra a todos con su dot de color', () => {
    S.compromisos = [
      compromisoBase({ id: 'f1', tipo: 'fijo',           diaPago: 5 }),
      compromisoBase({ id: 'd1', tipo: 'deuda-entidad',  diaPago: 10, cuotaMensual: 200_000 }),
      compromisoBase({ id: 'd2', tipo: 'deuda-personal', diaPago: 20, cuotaMensual: 100_000 }),
    ];
    renderAgenda();
    const leyenda = document.querySelector('.cal-legend');
    expect(leyenda).not.toBeNull();
    expect(leyenda.querySelector('.cal-dot--fijo')).not.toBeNull();
    expect(leyenda.querySelector('.cal-dot--deuda-entidad')).not.toBeNull();
    expect(leyenda.querySelector('.cal-dot--deuda-personal')).not.toBeNull();
  });

  // DIS.11 C6/V-3 (revisa AG.6): la leyenda es el pie de la tarjeta que
  // explica, y el detalle del día nace pegado a la grilla que lo abrió.
  it('la leyenda vive dentro de la tarjeta del calendario, como su pie', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual', monto: 300_000 })];
    renderAgenda();
    const card = document.querySelector('.cal-card');
    expect(card.querySelector('.cal-legend')).not.toBeNull();
    // Último hijo de la tarjeta: va después de la grilla, no antes.
    expect(card.lastElementChild.classList.contains('cal-legend')).toBe(true);
  });

  it('con un día abierto, el detalle queda justo después de la tarjeta del calendario', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual', monto: 300_000 })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const hijos    = [...document.getElementById('panel-agenda').children];
    const iCard    = hijos.findIndex(el => el.classList.contains('cal-card'));
    const iDetalle = hijos.findIndex(el => el.classList.contains('cal-detail'));
    expect(iCard).toBeGreaterThan(-1);
    expect(iDetalle).toBe(iCard + 1);
    // La leyenda ya no es hermana del detalle: quedó dentro de la tarjeta.
    expect(hijos.some(el => el.classList.contains('cal-legend'))).toBe(false);
  });

  // CAL.2: la leyenda es dinámica, solo lista los tipos que el usuario ya usa.

  it('CAL.2: sin ningún compromiso ni ingreso este mes, no dibuja la leyenda', () => {
    renderAgenda();
    expect(document.querySelector('.cal-legend')).toBeNull();
  });

  it('CAL.2: con un solo tipo presente, la leyenda muestra solo esa entrada', () => {
    S.compromisos = [compromisoBase({ id: 'f1', tipo: 'fijo', diaPago: 5 })];
    renderAgenda();
    const leyenda = document.querySelector('.cal-legend');
    expect(leyenda).not.toBeNull();
    expect(leyenda.querySelectorAll('.cal-legend__item').length).toBe(1);
    expect(leyenda.querySelector('.cal-dot--fijo')).not.toBeNull();
    expect(leyenda.querySelector('.cal-dot--deuda-entidad')).toBeNull();
    expect(leyenda.querySelector('.cal-dot--deuda-personal')).toBeNull();
    expect(leyenda.querySelector('.cal-dot--ingreso')).toBeNull();
  });

  it('CAL.2: si el usuario registra un tipo nuevo, la leyenda lo suma solo', () => {
    S.compromisos = [compromisoBase({ id: 'f1', tipo: 'fijo', diaPago: 5 })];
    renderAgenda();
    expect(document.querySelector('.cal-legend').querySelectorAll('.cal-legend__item').length).toBe(1);

    S.compromisos.push(compromisoBase({ id: 'd1', tipo: 'deuda-entidad', diaPago: 10, cuotaMensual: 200_000 }));
    renderAgenda();
    const leyenda = document.querySelector('.cal-legend');
    expect(leyenda.querySelectorAll('.cal-legend__item').length).toBe(2);
    expect(leyenda.querySelector('.cal-dot--deuda-entidad')).not.toBeNull();
  });
});

// ── renderAgenda() - marca de color por tipo en el detalle (AG.7) ─

describe('renderAgenda() - marca de color por tipo en el detalle', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('un gasto fijo trae la clase cal-detail__item--fijo', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, tipo: 'fijo' })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const item = document.querySelector('.cal-detail__item');
    expect(item.classList.contains('cal-detail__item--fijo')).toBe(true);
    expect(item.querySelector('.cal-detail__icon--fijo')).not.toBeNull();
  });

  it('una deuda con entidad trae la clase cal-detail__item--deuda-entidad', () => {
    S.compromisos = [compromisoBase({
      id: 'd1', diaPago: 15, tipo: 'deuda-entidad',
      cuotaMensual: 200_000, saldoTotal: 2_000_000,
    })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const item = document.querySelector('.cal-detail__item');
    expect(item.classList.contains('cal-detail__item--deuda-entidad')).toBe(true);
  });

  it('una deuda personal trae la clase cal-detail__item--deuda-personal', () => {
    S.compromisos = [compromisoBase({
      id: 'd2', diaPago: 15, tipo: 'deuda-personal',
      cuotaMensual: 80_000, saldoTotal: 500_000,
    })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const item = document.querySelector('.cal-detail__item');
    expect(item.classList.contains('cal-detail__item--deuda-personal')).toBe(true);
  });

  it('con varios tipos el mismo día, cada item lleva la clase de su propio tipo', () => {
    S.compromisos = [
      compromisoBase({ id: 'f1', diaPago: 15, tipo: 'fijo' }),
      compromisoBase({
        id: 'e1', diaPago: 15, tipo: 'deuda-entidad',
        cuotaMensual: 200_000, saldoTotal: 2_000_000,
      }),
      compromisoBase({
        id: 'p1', diaPago: 15, tipo: 'deuda-personal',
        cuotaMensual: 80_000, saldoTotal: 500_000,
      }),
    ];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const items = [...document.querySelectorAll('.cal-detail__item')];
    expect(items).toHaveLength(3);
    expect(items.some(el => el.classList.contains('cal-detail__item--fijo'))).toBe(true);
    expect(items.some(el => el.classList.contains('cal-detail__item--deuda-entidad'))).toBe(true);
    expect(items.some(el => el.classList.contains('cal-detail__item--deuda-personal'))).toBe(true);
  });
});

// ── eventosIngresosDelMes() (ADR 021) ────────────────────────────

const ingresoBase = (overrides = {}) => ({
  id:            'i1',
  descripcion:   'Salario',
  monto:         2_000_000,
  frecuencia:    'Mensual',
  diaPago:       15,
  categoria:     null,
  activo:        true,
  fechaCreacion: '2026-01-10T10:00:00Z',
  ...overrides,
});

describe('eventosIngresosDelMes() (ADR 021)', () => {
  it('mapea el ingreso mensual a su día de pago con tipo ingreso', () => {
    const evs = eventosIngresosDelMes([ingresoBase()], 2026, 5);
    expect(Object.keys(evs)).toEqual(['15']);
    expect(evs[15][0].tipo).toBe('ingreso');
    expect(evs[15][0].dia).toBe(15);
    expect(evs[15][0].descripcion).toBe('Salario');
  });

  it('quincenal genera dos ocurrencias (diaPago y diaPago+15)', () => {
    const evs = eventosIngresosDelMes([ingresoBase({ frecuencia: 'Quincenal', diaPago: 1 })], 2026, 5);
    expect(evs[1]).toHaveLength(1);
    expect(evs[16]).toHaveLength(1);
  });

  it('ignora ingresos inactivos o sin diaPago (dato no capturado)', () => {
    expect(eventosIngresosDelMes([ingresoBase({ activo: false })], 2026, 5)).toEqual({});
    expect(eventosIngresosDelMes([ingresoBase({ diaPago: null })], 2026, 5)).toEqual({});
  });

  it('tolera input inválido', () => {
    expect(eventosIngresosDelMes(null, 2026, 5)).toEqual({});
    expect(eventosIngresosDelMes([ingresoBase()], 2026, 99)).toEqual({});
  });
});

describe('totalDia() con día de ingreso (ADR 021)', () => {
  it('no suma el ingreso al total a pagar del día', () => {
    const evs = [
      { tipo: 'ingreso', monto: 2_000_000 },
      { tipo: 'fijo', monto: 100_000 },
      { tipo: 'deuda-entidad', cuotaMensual: 50_000 },
    ];
    expect(totalDia(evs)).toBe(150_000);
  });
});

// ── renderAgenda() - día de ingreso (ADR 021) ────────────────────

describe('renderAgenda() - día de ingreso (ADR 021)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos = [];
    S.ingresos = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    S.ingresos = [];
    vi.useRealTimers();
  });

  it('el día de pago del ingreso muestra dot verde y detalle con CTA Distribuir', () => {
    S.ingresos = [ingresoBase({ diaPago: 15 })];
    renderAgenda();
    expect(document.querySelector('.cal-dot--ingreso')).not.toBeNull();

    mostrarDia(15);
    renderAgenda();
    const item = document.querySelector('.cal-detail__item--ingreso');
    expect(item).not.toBeNull();
    expect(item.textContent).toContain('Salario');
    expect(item.textContent).toContain('+$2.000.000');
    expect(item.querySelector('[data-action="agenda-distribuir-ingreso"]')).not.toBeNull();
  });

  it('el ingreso no infla el "Total a pagar" del día', () => {
    S.ingresos    = [ingresoBase({ diaPago: 15 })];
    S.compromisos = [compromisoBase({ diaPago: 15 })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const total = document.querySelector('.cal-detail__total');
    expect(total.textContent).toContain('$1.500.000');
    expect(total.textContent).not.toContain('$3.500.000');
  });

  it('el ingreso aparece antes que los compromisos del mismo día', () => {
    S.ingresos    = [ingresoBase({ diaPago: 15 })];
    S.compromisos = [compromisoBase({ diaPago: 15 })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const items = [...document.querySelectorAll('.cal-detail__item')];
    expect(items[0].classList.contains('cal-detail__item--ingreso')).toBe(true);
  });

  it('la leyenda incluye la entrada de día de ingreso cuando hay un ingreso este mes', () => {
    S.ingresos = [ingresoBase({ diaPago: 15 })];
    renderAgenda();
    expect(document.querySelector('.cal-legend').textContent).toContain('Día de ingreso');
  });

  it('la cabecera sigue contando solo compromisos (el ingreso no es uno)', () => {
    S.ingresos = [ingresoBase({ diaPago: 15 })];
    renderAgenda();
    expect(document.querySelector('.cal-card__subtitle').textContent).toContain('Sin compromisos');
  });

  it('el resumen del día distingue ingreso de compromisos', () => {
    S.ingresos    = [ingresoBase({ diaPago: 15 })];
    S.compromisos = [compromisoBase({ diaPago: 15 })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const sub = document.querySelector('.cal-detail__subtitle');
    expect(sub.textContent).toContain('día de ingreso');
    expect(sub.textContent).toContain('1 compromiso');
  });
});

// ── CAL.3 - selección automática del día actual al entrar ────────

describe('CAL.3 - marcarEntradaSeccion() + renderAgenda() auto-selección', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos = [];
    S.ingresos = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026 = "hoy"
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('con marcarEntradaSeccion() y compromisos hoy, auto-abre el detalle de hoy', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual' })];
    marcarEntradaSeccion();
    renderAgenda();
    const detalle = document.querySelector('.cal-detail');
    expect(detalle).not.toBeNull();
    expect(detalle.querySelector('.cal-detail__title').textContent).toContain('15');
  });

  it('sin marcarEntradaSeccion(), un renderAgenda() suelto no auto-selecciona nada', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual' })];
    renderAgenda();
    expect(document.querySelector('.cal-detail')).toBeNull();
  });

  it('si hoy no tiene compromisos ni ingresos, no auto-abre nada', () => {
    S.compromisos = [compromisoBase({ diaPago: 20, frecuencia: 'Mensual' })];
    marcarEntradaSeccion();
    renderAgenda();
    expect(document.querySelector('.cal-detail')).toBeNull();
  });

  it('no pisa un día ya seleccionado manualmente antes de entrar', () => {
    S.compromisos = [
      compromisoBase({ id: 'c1', diaPago: 15, frecuencia: 'Mensual' }),
      compromisoBase({ id: 'c2', diaPago: 20, frecuencia: 'Mensual' }),
    ];
    renderAgenda();
    mostrarDia(20);
    marcarEntradaSeccion();
    renderAgenda();
    expect(document.querySelector('.cal-detail__title').textContent).toContain('20');
  });

  it('se consume una sola vez: un segundo renderAgenda() no vuelve a forzar la selección', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual' })];
    marcarEntradaSeccion();
    renderAgenda();
    mostrarDia(15); // el usuario cierra el detalle auto-abierto (toggle)
    renderAgenda();
    expect(document.querySelector('.cal-detail')).toBeNull();
  });
});

describe('CAL.3 - seleccionar un día sin registros muestra estado vacío', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos = [];
    S.ingresos = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15));
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('un día sin eventos es clickeable en el grid (data-action presente)', () => {
    S.compromisos = [compromisoBase({ diaPago: 5, frecuencia: 'Mensual' })];
    renderAgenda();
    const diaVacio = document.querySelector('[data-day="10"]');
    expect(diaVacio).not.toBeNull();
    expect(diaVacio.getAttribute('data-action')).toBe('agenda-mostrar-dia');
    expect(diaVacio.hasAttribute('aria-disabled')).toBe(false);
  });

  it('seleccionar un día sin registros muestra un mensaje explícito, no cierra el detalle', () => {
    S.compromisos = [];
    renderAgenda();
    mostrarDia(10);
    renderAgenda();
    const detalle = document.querySelector('.cal-detail');
    expect(detalle).not.toBeNull();
    expect(detalle.querySelector('.cal-detail__subtitle').textContent)
      .toBe('Sin compromisos ni ingresos este día');
    expect(detalle.querySelector('.cal-detail__total')).toBeNull();
    expect(detalle.querySelector('.cal-detail__list')).toBeNull();
  });

  it('volver a hacer click en el mismo día vacío lo cierra (toggle intacto)', () => {
    S.compromisos = [];
    renderAgenda();
    mostrarDia(10);
    renderAgenda();
    mostrarDia(10);
    renderAgenda();
    expect(document.querySelector('.cal-detail')).toBeNull();
  });
});

// ── CAL.4a (ADR 037 D1) - totalesDelMes ──────────────────────────

describe('totalesDelMes - agregador del hero del mes', () => {
  const PREFIJO = '2026-06';

  it('devuelve {0,0} con eventos inválidos o vacíos', () => {
    expect(totalesDelMes(null, [], PREFIJO)).toEqual({ total: 0, pagado: 0 });
    expect(totalesDelMes(undefined, [], PREFIJO)).toEqual({ total: 0, pagado: 0 });
    expect(totalesDelMes({}, [], PREFIJO)).toEqual({ total: 0, pagado: 0 });
  });

  it('suma monto de fijos y cuotaMensual de deudas; excluye ingresos', () => {
    const eventos = eventosDelMes([
      compromisoBase({ id: 'f1', tipo: 'fijo', monto: 300_000, diaPago: 5 }),
      compromisoBase({ id: 'd1', tipo: 'deuda-entidad', cuotaMensual: 450_000, monto: undefined, diaPago: 10 }),
    ], 2026, 5);
    eventos[15] = [...(eventos[15] ?? []), { id: 'i1', tipo: 'ingreso', monto: 2_000_000, dia: 15 }];
    const r = totalesDelMes(eventos, [], PREFIJO);
    expect(r.total).toBe(750_000);
    expect(r.pagado).toBe(0);
  });

  it('un quincenal cuenta dos veces en el total del mes', () => {
    const eventos = eventosDelMes([
      compromisoBase({ id: 'f1', tipo: 'fijo', monto: 100_000, frecuencia: 'Quincenal', diaPago: 5 }),
    ], 2026, 5); // junio: cae el 5 y el 20
    const r = totalesDelMes(eventos, [], PREFIJO);
    expect(r.total).toBe(200_000);
  });

  it('una deuda sin cuota fija (fiado, D.13) no suma al total', () => {
    const eventos = eventosDelMes([
      compromisoBase({ id: 'd1', tipo: 'deuda-personal', cuotaMensual: null, monto: undefined, diaPago: 10 }),
    ], 2026, 5);
    expect(totalesDelMes(eventos, [], PREFIJO).total).toBe(0);
  });

  it('un gasto vinculado en el mes suma al pagado (criterio calcularAbonosDelMes)', () => {
    const eventos = eventosDelMes([
      compromisoBase({ id: 'f1', tipo: 'fijo', monto: 300_000, diaPago: 5 }),
    ], 2026, 5);
    const gastos = [{ compromisoId: 'f1', fecha: '2026-06-05', monto: 300_000 }];
    expect(totalesDelMes(eventos, gastos, PREFIJO)).toEqual({ total: 300_000, pagado: 300_000 });
  });

  it('un abono parcial de deuda cuenta lo abonado, no la cuota completa', () => {
    const eventos = eventosDelMes([
      compromisoBase({ id: 'd1', tipo: 'deuda-entidad', cuotaMensual: 450_000, monto: undefined, diaPago: 10 }),
    ], 2026, 5);
    const gastos = [{ compromisoId: 'd1', fecha: '2026-06-10', monto: 100_000 }];
    expect(totalesDelMes(eventos, gastos, PREFIJO).pagado).toBe(100_000);
  });

  it('pagar de más no infla el progreso: el pagado se topa en lo adeudado', () => {
    const eventos = eventosDelMes([
      compromisoBase({ id: 'd1', tipo: 'deuda-entidad', cuotaMensual: 300_000, monto: undefined, diaPago: 10 }),
    ], 2026, 5);
    const gastos = [{ compromisoId: 'd1', fecha: '2026-06-10', monto: 500_000 }];
    expect(totalesDelMes(eventos, gastos, PREFIJO).pagado).toBe(300_000);
  });

  it('ignora gastos de otro mes, sin compromisoId o de compromisos fuera del mes', () => {
    const eventos = eventosDelMes([
      compromisoBase({ id: 'f1', tipo: 'fijo', monto: 300_000, diaPago: 5 }),
    ], 2026, 5);
    const gastos = [
      { compromisoId: 'f1', fecha: '2026-05-05', monto: 300_000 }, // mes anterior
      { fecha: '2026-06-05', monto: 300_000 },                     // sin vínculo
      { compromisoId: 'zzz', fecha: '2026-06-05', monto: 300_000 }, // otro compromiso
    ];
    expect(totalesDelMes(eventos, gastos, PREFIJO).pagado).toBe(0);
  });

  it('con gastos inválidos o prefijo inválido devuelve pagado 0 sin romper', () => {
    const eventos = eventosDelMes([
      compromisoBase({ id: 'f1', tipo: 'fijo', monto: 300_000, diaPago: 5 }),
    ], 2026, 5);
    expect(totalesDelMes(eventos, null, PREFIJO).pagado).toBe(0);
    expect(totalesDelMes(eventos, [{ compromisoId: 'f1', fecha: '2026-06-05', monto: 300_000 }], '').pagado).toBe(0);
  });
});

// ── CAL.4a (ADR 037 D1/D7) - hero del mes en renderAgenda() ─────

describe('renderAgenda() - hero del mes (CAL.4a)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos = [];
    S.ingresos = [];
    S.config.ocultarSaldo = false;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    S.config.ocultarSaldo = false;
    vi.useRealTimers();
  });

  it('con compromisos muestra el total del mes y el progreso pagado/falta', () => {
    S.compromisos = [
      compromisoBase({ id: 'f1', tipo: 'fijo', monto: 300_000, diaPago: 5 }),
      compromisoBase({ id: 'd1', tipo: 'deuda-entidad', cuotaMensual: 200_000, monto: undefined, diaPago: 10 }),
    ];
    S.gastos = [{ id: 'g1', compromisoId: 'f1', fecha: '2026-06-05', monto: 300_000 }];
    renderAgenda();

    const hero = document.querySelector('.hero-agenda');
    expect(hero).not.toBeNull();
    expect(hero.querySelector('.hero-agenda__label').textContent).toBe('Compromisos de junio');
    expect(hero.querySelector('.hero-agenda__valor').textContent).toContain('500.000');
    expect(hero.querySelector('.hero-agenda__pagado').textContent).toContain('300.000');
    expect(hero.querySelector('.hero-agenda__falta').textContent).toContain('200.000');
    expect(hero.querySelector('.hero-agenda__barra-fill').style.width).toBe('60%');
  });

  // DIS.11 C8/V-8: la variante de guía tiene sentido cuando el mes SÍ tiene
  // algo (ej. solo ingresos) pero nada que pagar. Con el mes completamente
  // vacío el hero desaparece: la card .cal-empty ya guía, y con el banner de
  // propósito arriba eran tres bloques diciendo lo mismo.
  it('un mes solo con ingresos muestra la variante de guía, sin cifra ni ojo', () => {
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 2_000_000, frecuencia: 'Mensual', diaPago: 15, activo: true }];
    renderAgenda();
    const hero = document.querySelector('.hero-agenda');
    expect(hero).not.toBeNull();
    expect(hero.querySelector('.hero-agenda__titulo').textContent).toBe('Sin pagos programados');
    expect(hero.querySelector('.hero-agenda__label').textContent).toBe('Junio 2026');
    expect(hero.querySelector('.hero-agenda__valor')).toBeNull();
    expect(hero.querySelector('.hero-agenda__ojo')).toBeNull();
    expect(hero.querySelector('.hero-agenda__barra')).toBeNull();
  });

  it('DIS.11 C8: un mes sin ningún evento no renderiza el hero', () => {
    renderAgenda();
    expect(document.querySelector('.hero-agenda')).toBeNull();
    // El único mensaje queda en la card de vacío.
    expect(document.querySelector('.cal-empty')).not.toBeNull();
  });

  it('con ocultarSaldo enmascara total, pagado y falta (IN.2/ADR 037 D7)', () => {
    S.compromisos = [compromisoBase({ id: 'f1', tipo: 'fijo', monto: 300_000, diaPago: 5 })];
    S.config.ocultarSaldo = true;
    renderAgenda();
    const hero = document.querySelector('.hero-agenda');
    expect(hero.querySelector('.hero-agenda__valor').textContent).toBe('$••••••');
    expect(hero.querySelector('.hero-agenda__pagado').textContent).toBe('Pagado ••••');
    expect(hero.querySelector('.hero-agenda__falta').textContent).toBe('Falta ••••');
    expect(hero.textContent).not.toContain('300.000');
    const ojo = hero.querySelector('.hero-agenda__ojo');
    expect(ojo.getAttribute('aria-pressed')).toBe('true');
    expect(ojo.innerHTML).toContain('#i-eye-off');
  });

  it('el ojo visible expone la acción agenda-saldo-visibilidad con aria-pressed=false', () => {
    S.compromisos = [compromisoBase({ id: 'f1', tipo: 'fijo', monto: 300_000, diaPago: 5 })];
    renderAgenda();
    const ojo = document.querySelector('.hero-agenda__ojo');
    expect(ojo.getAttribute('data-action')).toBe('agenda-saldo-visibilidad');
    expect(ojo.getAttribute('aria-pressed')).toBe('false');
    expect(ojo.innerHTML).toContain('#i-eye');
  });

  it('la barra queda al 100% cuando todo el mes está pagado y el caption no queda en negativo', () => {
    S.compromisos = [compromisoBase({ id: 'f1', tipo: 'fijo', monto: 300_000, diaPago: 5 })];
    S.gastos = [{ id: 'g1', compromisoId: 'f1', fecha: '2026-06-05', monto: 300_000 }];
    renderAgenda();
    expect(document.querySelector('.hero-agenda__barra-fill').style.width).toBe('100%');
    expect(document.querySelector('.hero-agenda__falta').textContent).toContain('$');
  });

  it('el hero sigue al mes visible: navegar de mes recalcula el label y el total', () => {
    S.compromisos = [compromisoBase({
      id: 'f1', tipo: 'fijo', monto: 300_000, diaPago: 5,
      frecuencia: 'Única vez', fechaCreacion: '2026-06-01',
    })];
    renderAgenda();
    expect(document.querySelector('.hero-agenda__label').textContent).toBe('Compromisos de junio');
    navegarMes(+1);
    renderAgenda();
    // Julio no tiene ese pago único ni ningún otro evento: sin hero (C8) y
    // con la card de vacío como único mensaje.
    expect(document.querySelector('.hero-agenda')).toBeNull();
    expect(document.querySelector('.cal-card__title').textContent).toBe('Julio 2026');
    expect(document.querySelector('.cal-empty__title').textContent).toBe('Julio está despejado');
  });
});

// ── CAL.4b (ADR 037 D2/D6) - subtítulo del mes + empty state ─────

describe('renderAgenda() - subtítulo y empty state del mes (CAL.4b)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos = [];
    S.ingresos = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('el subtítulo separa compromisos de ingresos (el ingreso no es un pago)', () => {
    S.compromisos = [
      compromisoBase({ id: 'f1', diaPago: 5 }),
      compromisoBase({ id: 'f2', diaPago: 20 }),
    ];
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 1_000_000, frecuencia: 'Mensual', diaPago: 15, activo: true }];
    renderAgenda();
    expect(document.querySelector('.cal-card__subtitle').textContent)
      .toBe('2 compromisos este mes · 1 ingreso');
  });

  it('sin ingresos el subtítulo no agrega la parte de ingresos', () => {
    S.compromisos = [compromisoBase({ id: 'f1', diaPago: 5 })];
    renderAgenda();
    expect(document.querySelector('.cal-card__subtitle').textContent)
      .toBe('1 compromiso este mes');
  });

  it('mes sin ningún evento muestra la card de empty state con el CTA de gasto fijo', () => {
    renderAgenda();
    const empty = document.querySelector('.cal-empty');
    expect(empty).not.toBeNull();
    expect(empty.querySelector('.cal-empty__title').textContent).toBe('Junio está despejado');
    expect(empty.querySelector('[data-action="nuevo-gasto-fijo"]')).not.toBeNull();
    // La grilla sigue visible: el mes se puede navegar (CAL.3 intacta).
    expect(document.querySelector('.cal-grid')).not.toBeNull();
  });

  it('con cualquier evento (aunque sea solo un ingreso) no hay empty state', () => {
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 1_000_000, frecuencia: 'Mensual', diaPago: 15, activo: true }];
    renderAgenda();
    expect(document.querySelector('.cal-empty')).toBeNull();
  });

  it('el empty state convive con el detalle de un día vacío seleccionado (CAL.3)', () => {
    renderAgenda();
    mostrarDia(10);
    renderAgenda();
    expect(document.querySelector('.cal-empty')).not.toBeNull();
    expect(document.querySelector('.cal-detail__subtitle').textContent)
      .toBe('Sin compromisos ni ingresos este día');
  });

  it('todas las celdas de día pintan la fila de dots (alineación del número)', () => {
    S.compromisos = [compromisoBase({ id: 'f1', diaPago: 5 })];
    renderAgenda();
    const dias = document.querySelectorAll('.cal-day:not(.cal-day--empty)');
    const filas = document.querySelectorAll('.cal-day .cal-day__dots');
    expect(dias.length).toBe(30); // junio 2026
    expect(filas.length).toBe(30);
  });
});

// ── DIS.11 (auditoría de diseño) - grilla del mes ────────────────

describe('renderAgenda() - grilla del mes (DIS.11 C2/V-5, V-6)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos      = [];
    S.ingresos    = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // V-6: un grid sin filas y sin teclado de flechas promete algo que no
  // cumple. Queda la lista de botones, cada uno con su aria-label completo.
  it('V-6: la grilla no declara role=grid ni role=gridcell', () => {
    S.compromisos = [compromisoBase({ id: 'f1', diaPago: 5 })];
    renderAgenda();
    expect(document.querySelector('[role="grid"]')).toBeNull();
    expect(document.querySelector('[role="gridcell"]')).toBeNull();
    const grid = document.querySelector('.cal-grid:not(.cal-grid--header)');
    expect(grid.getAttribute('role')).toBe('group');
    expect(grid.getAttribute('aria-label')).toBe('Días del mes');
  });

  // C2/V-5: lo vencido deja de ser lo más tenue del mes.
  it('C2: el día con un pago vencido y sin registrar lleva .cal-day--vencido', () => {
    S.compromisos = [compromisoBase({ id: 'f1', descripcion: 'Arriendo', diaPago: 5, monto: 900_000 })];
    renderAgenda();
    const dia5 = document.querySelector('[data-action="agenda-mostrar-dia"][data-day="5"]');
    expect(dia5.classList.contains('cal-day--vencido')).toBe(true);
    expect(dia5.getAttribute('aria-label')).toBe('Día 5, 1 compromiso, 1 vencido');
  });

  it('C2: el día con el pago ya registrado no se marca como vencido', () => {
    S.compromisos = [compromisoBase({ id: 'f1', descripcion: 'Arriendo', diaPago: 5, monto: 900_000 })];
    S.gastos = [{ id: 'g1', compromisoId: 'f1', fecha: '2026-06-05', monto: 900_000 }];
    renderAgenda();
    const dia5 = document.querySelector('[data-action="agenda-mostrar-dia"][data-day="5"]');
    expect(dia5.classList.contains('cal-day--vencido')).toBe(false);
    expect(dia5.getAttribute('aria-label')).toBe('Día 5, 1 compromiso');
  });

  it('C2: un día futuro del mes no está vencido todavía', () => {
    S.compromisos = [compromisoBase({ id: 'f1', diaPago: 25, monto: 900_000 })];
    renderAgenda();
    const dia25 = document.querySelector('[data-action="agenda-mostrar-dia"][data-day="25"]');
    expect(dia25.classList.contains('cal-day--vencido')).toBe(false);
  });

  it('C2: el conteo de vencidos del día es el mismo de la tarjeta de lote', () => {
    S.compromisos = [
      compromisoBase({ id: 'a', descripcion: 'Arriendo', diaPago: 5, monto: 900_000 }),
      compromisoBase({ id: 'b', descripcion: 'Agua',     diaPago: 5, monto: 60_000 }),
    ];
    renderAgenda();
    const dia5 = document.querySelector('[data-action="agenda-mostrar-dia"][data-day="5"]');
    expect(dia5.getAttribute('aria-label')).toBe('Día 5, 2 compromisos, 2 vencidos');
    expect(document.querySelector('.cal-lote__title').textContent).toBe('2 pagos ya vencieron');
  });
});

// ── DIS.11 V-4 - resumen hablado del mes visible ─────────────────

describe('resumenMesVisible() (DIS.11 V-4)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos      = [];
    S.ingresos    = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('nombra el mes, los compromisos y los ingresos', () => {
    S.compromisos = [
      compromisoBase({ id: 'a', diaPago: 5 }),
      compromisoBase({ id: 'b', diaPago: 20 }),
    ];
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 1_000_000, frecuencia: 'Mensual', diaPago: 15, activo: true }];
    expect(resumenMesVisible()).toBe('Junio 2026, 2 compromisos y 1 ingreso');
  });

  it('sin ingresos no los menciona, y el singular concuerda', () => {
    S.compromisos = [compromisoBase({ id: 'a', diaPago: 5 })];
    expect(resumenMesVisible()).toBe('Junio 2026, 1 compromiso');
  });

  it('un mes vacío también se anuncia', () => {
    expect(resumenMesVisible()).toBe('Junio 2026, sin compromisos');
  });

  it('sigue al mes visible tras navegar', () => {
    navegarMes(+1);
    expect(resumenMesVisible()).toBe('Julio 2026, sin compromisos');
  });
});

// ── DIS.11 V-1 - a dónde va el foco después de repintar ──────────

describe('diaSeleccionado() (DIS.11 V-1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15));
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // index.js lo consulta tras renderAgenda() para decidir si el foco va al
  // título del panel (día abierto) o de vuelta a la celda (día cerrado).
  it('refleja el día abierto y vuelve a null con el toggle', () => {
    expect(diaSeleccionado()).toBeNull();
    mostrarDia(15);
    expect(diaSeleccionado()).toBe(15);
    mostrarDia(15);
    expect(diaSeleccionado()).toBeNull();
  });

  it('navegar de mes cierra el día abierto', () => {
    mostrarDia(15);
    navegarMes(+1);
    expect(diaSeleccionado()).toBeNull();
  });
});

// ── CAL.4c (ADR 037 D4/D5/D7) - detalle del día accionable ───────

describe('renderAgenda() - detalle del día accionable (CAL.4c)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos = [];
    S.ingresos = [];
    S.config.ocultarSaldo = false;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    S.config.ocultarSaldo = false;
    vi.useRealTimers();
  });

  const abrirDia15 = () => {
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
  };

  it('con pagos pendientes el total dice "Total a pagar" en neutro', () => {
    S.compromisos = [compromisoBase({ id: 'f1', diaPago: 15, monto: 300_000 })];
    abrirDia15();
    const total = document.querySelector('.cal-detail__total');
    expect(total.textContent).toContain('Total a pagar');
    expect(total.classList.contains('cal-detail__total--pagado')).toBe(false);
  });

  it('con todos los compromisos del día cubiertos el total pasa a "Pagado este día" (D5)', () => {
    S.compromisos = [compromisoBase({ id: 'f1', diaPago: 15, monto: 300_000 })];
    S.gastos = [{ id: 'g1', compromisoId: 'f1', fecha: '2026-06-15', monto: 300_000 }];
    abrirDia15();
    const total = document.querySelector('.cal-detail__total');
    expect(total.textContent).toContain('Pagado este día');
    expect(total.classList.contains('cal-detail__total--pagado')).toBe(true);
  });

  it('un día mixto (pagado + pendiente) sigue diciendo "Total a pagar"', () => {
    S.compromisos = [
      compromisoBase({ id: 'f1', diaPago: 15, monto: 300_000 }),
      compromisoBase({ id: 'f2', diaPago: 15, monto: 100_000, descripcion: 'Internet' }),
    ];
    S.gastos = [{ id: 'g1', compromisoId: 'f1', fecha: '2026-06-15', monto: 300_000 }];
    abrirDia15();
    expect(document.querySelector('.cal-detail__total').textContent).toContain('Total a pagar');
  });

  it('el badge de pagado es una pill con ícono y oculta el CTA (D5)', () => {
    S.compromisos = [compromisoBase({ id: 'f1', diaPago: 15, monto: 300_000 })];
    S.gastos = [{ id: 'g1', compromisoId: 'f1', fecha: '2026-06-15', monto: 300_000 }];
    abrirDia15();
    const badge = document.querySelector('.cal-detail__badge-abono');
    expect(badge.textContent).toContain('Ya pagaste este mes');
    expect(badge.querySelector('use').getAttribute('href')).toBe('#i-check-circle');
    expect(document.querySelector('[data-action="agenda-marcar-pagado-fijo"]')).toBeNull();
  });

  it('el estado parcial se preserva: "Abonado $X de $Y este mes" (D5)', () => {
    S.compromisos = [compromisoBase({
      id: 'd1', tipo: 'deuda-entidad', diaPago: 15,
      cuotaMensual: 300_000, saldoTotal: 2_000_000, monto: undefined,
    })];
    S.gastos = [{ id: 'g1', compromisoId: 'd1', fecha: '2026-06-10', monto: 100_000 }];
    abrirDia15();
    const badge = document.querySelector('.cal-detail__badge-abono--parcial');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('Abonado');
    expect(badge.textContent).toContain('100.000');
    expect(badge.textContent).toContain('300.000');
    // Parcial no es completo: el CTA Abonar sigue disponible.
    expect(document.querySelector('[data-action="abrir-abono"]')).not.toBeNull();
  });

  // ── BUG-015: el pago pertenece al mes visible, no al actual ──────

  it('el CTA "Marcar pagado" viaja con el mes visible en data-mes (BUG-015)', () => {
    S.compromisos = [compromisoBase({ id: 'f1', diaPago: 15, monto: 300_000 })];
    abrirDia15();
    const pagar = document.querySelector('[data-action="agenda-marcar-pagado-fijo"]');
    expect(pagar.dataset.mes).toBe('2026-06');
  });

  it('en un mes futuro no se ofrece marcar pagado: aún no vence (BUG-015)', () => {
    S.compromisos = [compromisoBase({ id: 'f1', diaPago: 15, monto: 300_000 })];
    renderAgenda();
    navegarMes(1); // julio 2026, con hoy = 15 jun
    mostrarDia(15);
    renderAgenda();

    expect(document.querySelector('[data-action="agenda-marcar-pagado-fijo"]')).toBeNull();
    // Solo se bloquea el pago: editar y eliminar siguen disponibles.
    expect(document.querySelector('[data-action="agenda-editar-fijo"]')).not.toBeNull();
    expect(document.querySelector('[data-action="agenda-eliminar-fijo"]')).not.toBeNull();
  });

  it('en un mes pasado sí se puede marcar pagado, con SU mes en data-mes (BUG-015)', () => {
    S.compromisos = [compromisoBase({ id: 'f1', diaPago: 15, monto: 300_000 })];
    renderAgenda();
    navegarMes(-1); // mayo 2026: venció y quedó sin registrar (ponerse al día)
    mostrarDia(15);
    renderAgenda();

    const pagar = document.querySelector('[data-action="agenda-marcar-pagado-fijo"]');
    expect(pagar).not.toBeNull();
    expect(pagar.dataset.mes).toBe('2026-05');
  });

  it('un gasto de un mes pasado marca pagado ESE mes, no el actual (BUG-015)', () => {
    S.compromisos = [compromisoBase({ id: 'f1', diaPago: 15, monto: 300_000 })];
    // El pago de mayo ya está registrado con fecha de mayo.
    S.gastos = [{ id: 'g1', compromisoId: 'f1', fecha: '2026-05-15', monto: 300_000 }];

    renderAgenda();
    navegarMes(-1); // mayo: pagado → badge, sin CTA
    mostrarDia(15);
    renderAgenda();
    expect(document.querySelector('.cal-detail__badge-abono').textContent).toContain('Ya pagaste este mes');
    expect(document.querySelector('[data-action="agenda-marcar-pagado-fijo"]')).toBeNull();

    // Junio (mes actual) sigue pendiente: el pago de mayo no lo cubre.
    navegarMes(1);
    mostrarDia(15);
    renderAgenda();
    const pagarJunio = document.querySelector('[data-action="agenda-marcar-pagado-fijo"]');
    expect(pagarJunio).not.toBeNull();
    expect(pagarJunio.dataset.mes).toBe('2026-06');
  });

  it('el CTA lleva la identidad del tipo: Marcar pagado índigo, Abonar frambuesa/rosa (D4)', () => {
    S.compromisos = [
      compromisoBase({ id: 'f1', diaPago: 15, monto: 300_000 }),
      compromisoBase({ id: 'd1', tipo: 'deuda-entidad', diaPago: 15, cuotaMensual: 200_000, saldoTotal: 1_000_000, monto: undefined, descripcion: 'Visa' }),
      compromisoBase({ id: 'd2', tipo: 'deuda-personal', diaPago: 15, cuotaMensual: 100_000, saldoTotal: 500_000, monto: undefined, descripcion: 'Préstamo' }),
    ];
    abrirDia15();
    const pagar = document.querySelector('[data-action="agenda-marcar-pagado-fijo"]');
    expect(pagar.className).toContain('cal-detail__cta--fijo');
    const abonos = [...document.querySelectorAll('[data-action="abrir-abono"]')];
    expect(abonos[0].className).toContain('cal-detail__cta--deuda-entidad');
    expect(abonos[1].className).toContain('cal-detail__cta--deuda-personal');
    // Editar y Eliminar siguen presentes como acciones ghost (intactas).
    expect(document.querySelector('[data-action="agenda-editar-fijo"]')).not.toBeNull();
    expect(document.querySelector('[data-action="agenda-eliminar-fijo"]')).not.toBeNull();
    expect(document.querySelector('[data-action="editar-compromiso"]')).not.toBeNull();
    expect(document.querySelector('[data-action="eliminar-compromiso"]')).not.toBeNull();
  });

  it('el recordatorio del día de ingreso es un callout con ícono y conserva Distribuir (D4)', () => {
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 2_000_000, frecuencia: 'Mensual', diaPago: 15, activo: true }];
    abrirDia15();
    const callout = document.querySelector('.cal-detail__callout-ingreso');
    expect(callout).not.toBeNull();
    expect(callout.textContent).toContain('Hoy llega tu dinero');
    expect(callout.querySelector('use').getAttribute('href')).toBe('#i-lightbulb');
    expect(document.querySelector('[data-action="agenda-distribuir-ingreso"]')).not.toBeNull();
  });

  it('el ojo enmascara total del día, montos por item y el badge parcial (D7)', () => {
    S.config.ocultarSaldo = true;
    S.compromisos = [compromisoBase({
      id: 'd1', tipo: 'deuda-entidad', diaPago: 15,
      cuotaMensual: 300_000, saldoTotal: 2_000_000, monto: undefined,
    })];
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 2_000_000, frecuencia: 'Mensual', diaPago: 15, activo: true }];
    S.gastos = [{ id: 'g1', compromisoId: 'd1', fecha: '2026-06-10', monto: 100_000 }];
    abrirDia15();
    const detalle = document.querySelector('.cal-detail');
    expect(detalle.querySelector('.cal-detail__total').textContent).toContain('$••••••');
    const montos = [...detalle.querySelectorAll('.cal-detail__amount')].map(e => e.textContent);
    expect(montos).toContain('••••');
    expect(montos).toContain('+••••');
    expect(detalle.querySelector('.cal-detail__badge-abono--parcial').textContent)
      .toBe('Abonado •••• de •••• este mes');
    expect(detalle.textContent).not.toContain('300.000');
    expect(detalle.textContent).not.toContain('2.000.000');
  });
});

// ── CAL.5a: PENDIENTES DE PAGO DEL MES (LOTE) ────────────────────

describe('pendientesDePagoDelMes (CAL.5a)', () => {
  it('devuelve los fijos ya vencidos del mes en curso, ordenados por día', () => {
    const comps = [
      compromisoBase({ id: 'a', descripcion: 'Arriendo', diaPago: 5,  monto: 900_000 }),
      compromisoBase({ id: 'b', descripcion: 'Netflix',  diaPago: 12, monto:  40_000 }),
    ];
    const r = pendientesDePagoDelMes(eventosDelMes(comps, 2026, 5), [], '2026-06', '2026-06-15');
    expect(r.map(p => p.id)).toEqual(['a', 'b']);
    expect(r[0]).toMatchObject({ descripcion: 'Arriendo', monto: 900_000, dia: 5 });
  });

  it('excluye lo que aún no vence en el mes en curso', () => {
    const comps = [
      compromisoBase({ id: 'a', diaPago: 5 }),
      compromisoBase({ id: 'b', diaPago: 25 }),
    ];
    const r = pendientesDePagoDelMes(eventosDelMes(comps, 2026, 5), [], '2026-06', '2026-06-15');
    expect(r.map(p => p.id)).toEqual(['a']);
  });

  it('incluye el que vence HOY (el borde es inclusivo)', () => {
    const comps = [compromisoBase({ id: 'a', diaPago: 15 })];
    const r = pendientesDePagoDelMes(eventosDelMes(comps, 2026, 5), [], '2026-06', '2026-06-15');
    expect(r.map(p => p.id)).toEqual(['a']);
  });

  it('en un mes pasado incluye todos los pendientes, sin filtro de día', () => {
    const comps = [compromisoBase({ id: 'a', diaPago: 28 })];
    const r = pendientesDePagoDelMes(eventosDelMes(comps, 2026, 4), [], '2026-05', '2026-06-15');
    expect(r.map(p => p.id)).toEqual(['a']);
  });

  it('en un mes futuro no devuelve nada (BUG-015: no se paga lo que no venció)', () => {
    const comps = [compromisoBase({ id: 'a', diaPago: 5 })];
    const r = pendientesDePagoDelMes(eventosDelMes(comps, 2026, 6), [], '2026-07', '2026-06-15');
    expect(r).toEqual([]);
  });

  it('excluye los que ya tienen un gasto vinculado ese mes', () => {
    const comps = [
      compromisoBase({ id: 'a', diaPago: 5 }),
      compromisoBase({ id: 'b', diaPago: 6 }),
    ];
    const gastos = [{ id: 'g1', compromisoId: 'a', fecha: '2026-06-05', monto: 900_000 }];
    const r = pendientesDePagoDelMes(eventosDelMes(comps, 2026, 5), gastos, '2026-06', '2026-06-15');
    expect(r.map(p => p.id)).toEqual(['b']);
  });

  it('un gasto vinculado de OTRO mes no lo marca como pagado', () => {
    const comps  = [compromisoBase({ id: 'a', diaPago: 5 })];
    const gastos = [{ id: 'g1', compromisoId: 'a', fecha: '2026-05-05', monto: 900_000 }];
    const r = pendientesDePagoDelMes(eventosDelMes(comps, 2026, 5), gastos, '2026-06', '2026-06-15');
    expect(r.map(p => p.id)).toEqual(['a']);
  });

  it('un fijo quincenal aparece UNA sola vez, con su ocurrencia más antigua', () => {
    const comps = [compromisoBase({ id: 'a', diaPago: 15, frecuencia: 'Quincenal' })];
    const r = pendientesDePagoDelMes(eventosDelMes(comps, 2026, 5), [], '2026-06', '2026-06-30');
    expect(r).toHaveLength(1);
    expect(r[0].dia).toBe(15);
  });

  it('ignora los días de ingreso: no son dinero a pagar (ADR 021)', () => {
    const comps   = [compromisoBase({ id: 'a', diaPago: 5 })];
    const eventos = eventosDelMes(comps, 2026, 5);
    const ing = eventosIngresosDelMes(
      [{ id: 'i1', descripcion: 'Salario', monto: 2_000_000, frecuencia: 'Mensual', diaPago: 5, activo: true }],
      2026, 5,
    );
    for (const [d, evs] of Object.entries(ing)) eventos[d] = [...(eventos[d] ?? []), ...evs];

    const r = pendientesDePagoDelMes(eventos, [], '2026-06', '2026-06-15');
    expect(r.map(p => p.id)).toEqual(['a']);
  });

  it('ignora fijos sin monto positivo (no hay nada que registrar)', () => {
    const comps = [
      compromisoBase({ id: 'a', diaPago: 5, monto: 0 }),
      compromisoBase({ id: 'b', diaPago: 5, monto: -100 }),
    ];
    const r = pendientesDePagoDelMes(eventosDelMes(comps, 2026, 5), [], '2026-06', '2026-06-15');
    expect(r).toEqual([]);
  });

  it('tolera entradas inválidas', () => {
    expect(pendientesDePagoDelMes(null, [], '2026-06', '2026-06-15')).toEqual([]);
    expect(pendientesDePagoDelMes({}, [], 'basura', '2026-06-15')).toEqual([]);
    expect(pendientesDePagoDelMes({}, [], '2026-06', 'basura')).toEqual([]);
    expect(pendientesDePagoDelMes({}, [], '2026-13', '2026-06-15')).toEqual([]);
  });

  it('marca el tipo de cada pendiente (la vista lo necesita para el subtítulo)', () => {
    const comps = [compromisoBase({ id: 'a', diaPago: 5 })];
    const r = pendientesDePagoDelMes(eventosDelMes(comps, 2026, 5), [], '2026-06', '2026-06-15');
    expect(r[0]).toMatchObject({ tipo: 'fijo', parcial: false });
  });
});

// ── CAL.5b: LAS DEUDAS TAMBIÉN ENTRAN AL LOTE ────────────────────

describe('pendientesDePagoDelMes con deudas (CAL.5b)', () => {
  const deuda = (over = {}) => compromisoBase({
    id:           'd1',
    descripcion:  'Tarjeta Visa',
    tipo:         'deuda-entidad',
    monto:        undefined,
    cuotaMensual: 300_000,
    saldoTotal:   2_000_000,
    diaPago:      5,
    ...over,
  });

  it('incluye la deuda vencida por su cuota mensual, no por su saldo', () => {
    const r = pendientesDePagoDelMes(eventosDelMes([deuda()], 2026, 5), [], '2026-06', '2026-06-15');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: 'd1', monto: 300_000, tipo: 'deuda-entidad', parcial: false });
  });

  it('incluye también la deuda personal', () => {
    const r = pendientesDePagoDelMes(
      eventosDelMes([deuda({ id: 'd2', tipo: 'deuda-personal' })], 2026, 5), [], '2026-06', '2026-06-15',
    );
    expect(r.map(p => p.id)).toEqual(['d2']);
  });

  it('un abono parcial del mes deja SOLO el resto de la cuota, marcado como parcial', () => {
    const gastos = [{ id: 'g1', compromisoId: 'd1', fecha: '2026-06-07', monto: 100_000 }];
    const r = pendientesDePagoDelMes(eventosDelMes([deuda()], 2026, 5), gastos, '2026-06', '2026-06-15');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ monto: 200_000, parcial: true });
  });

  it('un abono que cubre la cuota la saca del lote', () => {
    const gastos = [{ id: 'g1', compromisoId: 'd1', fecha: '2026-06-07', monto: 300_000 }];
    const r = pendientesDePagoDelMes(eventosDelMes([deuda()], 2026, 5), gastos, '2026-06', '2026-06-15');
    expect(r).toEqual([]);
  });

  it('varios abonos del mes se suman antes de decidir el resto', () => {
    const gastos = [
      { id: 'g1', compromisoId: 'd1', fecha: '2026-06-07', monto: 100_000 },
      { id: 'g2', compromisoId: 'd1', fecha: '2026-06-09', monto: 120_000 },
    ];
    const r = pendientesDePagoDelMes(eventosDelMes([deuda()], 2026, 5), gastos, '2026-06', '2026-06-15');
    expect(r[0].monto).toBe(80_000);
  });

  it('la última cuota se topa al saldo pendiente, nunca lo supera', () => {
    const r = pendientesDePagoDelMes(
      eventosDelMes([deuda({ saldoTotal: 120_000 })], 2026, 5), [], '2026-06', '2026-06-15',
    );
    expect(r[0].monto).toBe(120_000);
  });

  it('una deuda saldada no aparece aunque su día ya pasó', () => {
    const r = pendientesDePagoDelMes(
      eventosDelMes([deuda({ saldoTotal: 0 })], 2026, 5), [], '2026-06', '2026-06-15',
    );
    expect(r).toEqual([]);
  });

  it('una deuda sin cuota mensual (fiado, D.13) no entra al lote', () => {
    const r = pendientesDePagoDelMes(
      eventosDelMes([deuda({ cuotaMensual: 0 })], 2026, 5), [], '2026-06', '2026-06-15',
    );
    expect(r).toEqual([]);
  });

  it('mezcla fijos y deudas ordenados por día', () => {
    const comps = [
      deuda({ id: 'd1', diaPago: 10 }),
      compromisoBase({ id: 'a', descripcion: 'Arriendo', diaPago: 3, monto: 900_000 }),
    ];
    const r = pendientesDePagoDelMes(eventosDelMes(comps, 2026, 5), [], '2026-06', '2026-06-15');
    expect(r.map(p => p.id)).toEqual(['a', 'd1']);
  });

  it('respeta la misma regla temporal que los fijos: nada del mes futuro', () => {
    const r = pendientesDePagoDelMes(eventosDelMes([deuda()], 2026, 6), [], '2026-07', '2026-06-15');
    expect(r).toEqual([]);
  });

  it('una deuda quincenal aparece una sola vez y por una sola cuota', () => {
    const r = pendientesDePagoDelMes(
      eventosDelMes([deuda({ frecuencia: 'Quincenal', diaPago: 5 })], 2026, 5), [], '2026-06', '2026-06-30',
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ monto: 300_000, dia: 5 });
  });
});

// ── CAL.5a: TARJETA DEL LOTE EN EL CALENDARIO ────────────────────

describe('renderAgenda() - tarjeta de pago en lote (CAL.5a)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-agenda"></div>';
    S.compromisos = [];
    S.gastos      = [];
    S.ingresos    = [];
    S.config      = { ...S.config, ocultarSaldo: false };
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026
    resetearVistaAlMesActual();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('con 2 o más vencidos muestra la tarjeta con el conteo y el CTA', () => {
    S.compromisos = [
      compromisoBase({ id: 'a', descripcion: 'Arriendo', diaPago: 5 }),
      compromisoBase({ id: 'b', descripcion: 'Netflix',  diaPago: 12, monto: 40_000 }),
    ];
    renderAgenda();
    const lote = document.querySelector('.cal-lote');
    expect(lote).not.toBeNull();
    expect(lote.querySelector('.cal-lote__title').textContent).toBe('2 pagos ya vencieron');
    expect(lote.querySelector('.cal-lote__desc').textContent).toContain('Arriendo y Netflix');
    const cta = lote.querySelector('[data-action="agenda-pagar-lote"]');
    expect(cta.dataset.mes).toBe('2026-06');
  });

  // DIS.11 C5/V-7: la tarjeta propone mover dinero, así que dice cuánto
  // antes de abrir el flujo (el modal ya no es el primer lugar donde aparece).
  it('DIS.11 C5: la tarjeta muestra el total de lo que propone pagar', () => {
    S.compromisos = [
      compromisoBase({ id: 'a', descripcion: 'Arriendo', diaPago: 5, monto: 900_000 }),
      compromisoBase({ id: 'b', descripcion: 'Netflix',  diaPago: 12, monto: 40_000 }),
    ];
    renderAgenda();
    expect(document.querySelector('.cal-lote__monto').textContent).toContain('940.000');
  });

  it('DIS.11 C5: el total no se enmascara con el ojo (es el precio de la acción)', () => {
    S.compromisos = [
      compromisoBase({ id: 'a', descripcion: 'Arriendo', diaPago: 5, monto: 900_000 }),
      compromisoBase({ id: 'b', descripcion: 'Netflix',  diaPago: 12, monto: 40_000 }),
    ];
    S.config.ocultarSaldo = true;
    renderAgenda();
    expect(document.querySelector('.cal-lote__monto').textContent).toContain('940.000');
  });

  it('con más de dos vencidos resume la lista con "y N más"', () => {
    S.compromisos = [
      compromisoBase({ id: 'a', descripcion: 'Arriendo', diaPago: 5 }),
      compromisoBase({ id: 'b', descripcion: 'Netflix',  diaPago: 6, monto: 40_000 }),
      compromisoBase({ id: 'c', descripcion: 'Agua',     diaPago: 7, monto: 60_000 }),
    ];
    renderAgenda();
    expect(document.querySelector('.cal-lote__desc').textContent)
      .toContain('Arriendo, Netflix y 1 más');
  });

  it('con un solo vencido NO muestra la tarjeta (el CTA del día ya lo cubre)', () => {
    S.compromisos = [compromisoBase({ id: 'a', diaPago: 5 })];
    renderAgenda();
    expect(document.querySelector('.cal-lote')).toBeNull();
  });

  it('no muestra la tarjeta en un mes futuro', () => {
    S.compromisos = [
      compromisoBase({ id: 'a', diaPago: 5 }),
      compromisoBase({ id: 'b', diaPago: 6, monto: 40_000 }),
    ];
    navegarMes(+1);
    renderAgenda();
    expect(document.querySelector('.cal-lote')).toBeNull();
  });

  it('deja de mostrarse cuando ya solo queda uno sin pagar', () => {
    S.compromisos = [
      compromisoBase({ id: 'a', diaPago: 5 }),
      compromisoBase({ id: 'b', diaPago: 6, monto: 40_000 }),
    ];
    S.gastos = [{ id: 'g1', compromisoId: 'a', fecha: '2026-06-05', monto: 1_500_000 }];
    renderAgenda();
    expect(document.querySelector('.cal-lote')).toBeNull();
  });
});

// ── CAL.5a: CUERPO DEL MODAL DEL LOTE ────────────────────────────

describe('renderFormPagoLote (CAL.5a)', () => {
  it('pinta una fila por pendiente, todas marcadas, con su monto y día', () => {
    document.body.innerHTML = renderFormPagoLote([
      { id: 'a', descripcion: 'Arriendo', monto: 900_000, dia: 5 },
      { id: 'b', descripcion: 'Netflix',  monto:  40_000, dia: 12 },
    ]);
    const filas = document.querySelectorAll('.lote-row');
    expect(filas).toHaveLength(2);
    expect([...document.querySelectorAll('.lote-row__check')].every(c => c.checked)).toBe(true);
    expect(filas[0].querySelector('.lote-row__check').dataset.loteId).toBe('a');
    expect(filas[0].querySelector('.lote-row__check').dataset.loteMonto).toBe('900000');
    expect(filas[0].querySelector('.lote-row__amount').textContent).toContain('900.000');
    expect(filas[1].querySelector('.lote-row__sub').textContent).toBe('Vencía el 12');
  });

  it('el botón de confirmar lleva la acción del lote y los slots vivos', () => {
    document.body.innerHTML = renderFormPagoLote([{ id: 'a', descripcion: 'X', monto: 1, dia: 1 }]);
    expect(document.querySelector('[data-action="agenda-confirmar-lote"]')).not.toBeNull();
    expect(document.querySelector('[data-role="lote-cta-texto"]')).not.toBeNull();
    expect(document.querySelector('[data-role="lote-total"]')).not.toBeNull();
  });

  // CAL.5b: el modal ya no habla solo de gastos fijos.
  it('una fila de deuda dice que es la cuota, y el intro avisa que baja el saldo', () => {
    document.body.innerHTML = renderFormPagoLote([
      { id: 'd1', descripcion: 'Visa', monto: 300_000, dia: 5, tipo: 'deuda-entidad', parcial: false },
    ]);
    expect(document.querySelector('.lote-row__sub').textContent).toBe('Cuota de la deuda, vencía el 5');
    expect(document.querySelector('.lote-intro').textContent).toContain('baja su saldo');
  });

  it('una deuda con abono previo dice que es el resto de la cuota', () => {
    document.body.innerHTML = renderFormPagoLote([
      { id: 'd1', descripcion: 'Visa', monto: 200_000, dia: 5, tipo: 'deuda-personal', parcial: true },
    ]);
    expect(document.querySelector('.lote-row__sub').textContent).toBe('Resto de la cuota, vencía el 5');
  });

  it('sin deudas el intro no menciona saldos', () => {
    document.body.innerHTML = renderFormPagoLote([
      { id: 'a', descripcion: 'Arriendo', monto: 900_000, dia: 5, tipo: 'fijo', parcial: false },
    ]);
    expect(document.querySelector('.lote-intro').textContent).not.toContain('saldo');
  });
});
