import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eventosDelMes, eventosIngresosDelMes, totalEventosDelMes, totalDia, eventosDeHoy, eventosEnProximos } from '../../modules/dominio/agenda/logic.js';
import { renderFormGastoFijo, renderAgenda, mostrarDia, resetearVistaAlMesActual } from '../../modules/dominio/agenda/view.js';
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

describe('renderFormGastoFijo() - selector de categoría', () => {
  it('incluye un <option> en texto plano para cada categoría de CATEGORIAS_AGENDA (ID.3)', () => {
    const html = renderFormGastoFijo();
    for (const c of CATEGORIAS_AGENDA) {
      expect(html).toContain(`<option value="${c}">${c}</option>`);
    }
  });

  it('la categoría es opcional: el select no es required', () => {
    const html = renderFormGastoFijo();
    const selectMatch = html.match(/<select id="gfijo-categoria"[^>]*>/);
    expect(selectMatch).not.toBeNull();
    expect(selectMatch[0]).not.toContain('required');
  });

  it('AG.4: la categoría va antes que el campo de nombre en el DOM', () => {
    const html = renderFormGastoFijo();
    expect(html.indexOf('id="gfijo-categoria"')).toBeLessThan(html.indexOf('id="gfijo-descripcion"'));
  });

  it('AG.4: en el estado por defecto (sin categoría), el campo nace requerido con label "Descripción"', () => {
    const html = renderFormGastoFijo();
    expect(html).toContain('id="gfijo-descripcion-label">Descripción<');
    const inputMatch = html.match(/<input id="gfijo-descripcion"[^>]*>/);
    expect(inputMatch).not.toBeNull();
    expect(inputMatch[0]).toContain('required');
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

  it('una deuda que nombra un banco muestra su teja con iniciales y color', () => {
    S.compromisos = [compromisoBase({
      id: 'd1', diaPago: 15, frecuencia: 'Mensual', tipo: 'deuda-entidad',
      descripcion: 'Tarjeta Bancolombia', cuotaMensual: 200_000, saldoTotal: 2_000_000,
    })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const teja = document.querySelector('.cal-detail__icon .bank-avatar');
    expect(teja).not.toBeNull();
    expect(teja.textContent).toBe('BC');
    expect(teja.getAttribute('style')).toContain('background:#FFC727');
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

  it('la leyenda cubre los tres tipos actuales, cada uno con su dot de color', () => {
    renderAgenda();
    const leyenda = document.querySelector('.cal-legend');
    expect(leyenda).not.toBeNull();
    expect(leyenda.querySelector('.cal-dot--fijo')).not.toBeNull();
    expect(leyenda.querySelector('.cal-dot--deuda-entidad')).not.toBeNull();
    expect(leyenda.querySelector('.cal-dot--deuda-personal')).not.toBeNull();
  });

  it('con un día abierto, la leyenda queda antes del detalle en el DOM', () => {
    S.compromisos = [compromisoBase({ diaPago: 15, frecuencia: 'Mensual', monto: 300_000 })];
    renderAgenda();
    mostrarDia(15);
    renderAgenda();
    const hijos    = [...document.getElementById('panel-agenda').children];
    const iLeyenda = hijos.findIndex(el => el.classList.contains('cal-legend'));
    const iDetalle = hijos.findIndex(el => el.classList.contains('cal-detail'));
    expect(iLeyenda).toBeGreaterThan(-1);
    expect(iDetalle).toBeGreaterThan(-1);
    expect(iLeyenda).toBeLessThan(iDetalle);
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

  it('la leyenda incluye la entrada de día de ingreso', () => {
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
