import { describe, it, expect } from 'vitest';
import {
  historicoCategoria,
  sugerirMontoTope,
  sugerirCategoriasParaTope,
  detectarSuscripcionesLargas,
  MESES_HISTORICO,
  UMBRAL_MONTO_SUGERENCIA,
  PASO_REDONDEO,
} from '../../modules/infra/sugerencias-categoria.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const HOY = '2026-08-13';

const gasto = (overrides = {}) => ({
  id:          'g1',
  descripcion: 'Almuerzo',
  monto:       50_000,
  categoria:   'Restaurantes',
  fecha:       '2026-08-05',
  ...overrides,
});

const fijo = (overrides = {}) => ({
  id:          'c1',
  descripcion: 'Netflix',
  tipo:        'fijo',
  categoria:   'Streaming',
  monto:       25_000,
  frecuencia:  'Mensual',
  diaPago:     5,
  activo:      true,
  fechaCreacion: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

/** Un gasto por mes en la misma categoría, del mes `desde` hacia atrás. */
const serie = (pares, base = {}) =>
  pares.map(([fecha, monto], i) => gasto({ id: `g${i}`, fecha, monto, ...base }));

// ── historicoCategoria() ──────────────────────────────────────────────────────

describe('historicoCategoria()', () => {
  it('separa el mes en curso de los meses cerrados', () => {
    const gastos = serie([
      ['2026-08-02', 90_000],
      ['2026-07-10', 200_000],
      ['2026-06-10', 100_000],
    ]);
    const h = historicoCategoria(gastos, 'Restaurantes', HOY);
    expect(h.actual).toBe(90_000);
    expect(h.cerrados).toEqual([200_000, 100_000, 0]);
  });

  it('el promedio solo divide entre los meses cerrados con gasto', () => {
    const gastos = serie([
      ['2026-07-10', 200_000],
      ['2026-06-10', 100_000],
    ]);
    // 300.000 entre 2 meses con gasto, no entre los 3 mirados.
    expect(historicoCategoria(gastos, 'Restaurantes', HOY).promedio).toBe(150_000);
    expect(historicoCategoria(gastos, 'Restaurantes', HOY).mesesConGasto).toBe(2);
  });

  it('cruza el cambio de año hacia atrás', () => {
    const gastos = serie([
      ['2025-12-10', 120_000],
      ['2025-11-10', 80_000],
    ]);
    const h = historicoCategoria(gastos, 'Restaurantes', '2026-01-20');
    expect(h.cerrados).toEqual([120_000, 80_000, 0]);
    expect(h.promedio).toBe(100_000);
  });

  it('ignora otras categorías y los gastos sin monto', () => {
    const gastos = [
      gasto({ id: 'a', fecha: '2026-07-05', monto: 100_000 }),
      gasto({ id: 'b', fecha: '2026-07-06', monto: 300_000, categoria: 'Transporte' }),
      gasto({ id: 'c', fecha: '2026-07-07', monto: undefined }),
    ];
    expect(historicoCategoria(gastos, 'Restaurantes', HOY).promedio).toBe(100_000);
  });

  it('sin gastos y con fecha inválida devuelve todo en cero', () => {
    expect(historicoCategoria([], 'Restaurantes', HOY).promedio).toBe(0);
    expect(historicoCategoria(null, 'Restaurantes', HOY).actual).toBe(0);
    expect(historicoCategoria([gasto()], 'Restaurantes', 'ayer')).toEqual({
      actual: 0, promedio: 0, mesesConGasto: 0, cerrados: [],
    });
  });

  it('mira MESES_HISTORICO meses cerrados por defecto', () => {
    expect(historicoCategoria([], 'Restaurantes', HOY).cerrados).toHaveLength(MESES_HISTORICO);
  });
});

// ── sugerirMontoTope() ────────────────────────────────────────────────────────

describe('sugerirMontoTope()', () => {
  it('propone el promedio de los meses cerrados, redondeado hacia arriba', () => {
    const gastos = serie([
      ['2026-07-10', 183_000],
      ['2026-06-10', 176_000],
    ]);
    const s = sugerirMontoTope(gastos, 'Restaurantes', HOY);
    // Promedio 179.500 → 180.000 (múltiplo de PASO_REDONDEO).
    expect(s.monto).toBe(180_000);
    expect(s.monto % PASO_REDONDEO).toBe(0);
    expect(s.base).toBe('promedio');
    expect(s.acotado).toBe(false);
  });

  it('sin histórico cae a lo que llevas gastado en el mes en curso', () => {
    const gastos = serie([['2026-08-03', 45_000]]);
    const s = sugerirMontoTope(gastos, 'Restaurantes', HOY);
    expect(s.base).toBe('mes-actual');
    expect(s.monto).toBe(50_000);
  });

  it('nunca propone por debajo del gasto habitual: el recorte lo decide el usuario', () => {
    const gastos = serie([['2026-07-10', 200_000], ['2026-06-10', 200_000]]);
    expect(sugerirMontoTope(gastos, 'Restaurantes', HOY).monto).toBe(200_000);
  });

  it('acota el monto a lo que el plan deja sin tope (ADR 045 D6)', () => {
    const gastos = serie([['2026-07-10', 400_000], ['2026-06-10', 400_000]]);
    const s = sugerirMontoTope(gastos, 'Restaurantes', HOY, { sinTope: 235_000 });
    expect(s.monto).toBe(230_000); // baja al múltiplo que cabe dentro del techo
    expect(s.acotado).toBe(true);
  });

  it('un techo que no alcanza ni un paso de redondeo no acota nada', () => {
    const gastos = serie([['2026-07-10', 200_000], ['2026-06-10', 200_000]]);
    const s = sugerirMontoTope(gastos, 'Restaurantes', HOY, { sinTope: 5_000 });
    expect(s.monto).toBe(200_000);
    expect(s.acotado).toBe(false);
  });

  it('sin gasto con el que estimar devuelve null', () => {
    expect(sugerirMontoTope([], 'Restaurantes', HOY)).toBeNull();
  });
});

// ── sugerirCategoriasParaTope() ───────────────────────────────────────────────

describe('sugerirCategoriasParaTope()', () => {
  const recurrente = (categoria, monto) => serie([
    [`2026-07-10`, monto],
    [`2026-06-10`, monto],
  ], { categoria }).map((g, i) => ({ ...g, id: `${categoria}-${i}` }));

  it('propone la categoría recurrente con su monto', () => {
    const out = sugerirCategoriasParaTope(recurrente('Restaurantes', 200_000), ['Restaurantes'], HOY);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ categoria: 'Restaurantes', motivo: 'recurrente', monto: 200_000 });
  });

  it('un gasto de un solo mes que no crece es un evento, no un patrón', () => {
    const gastos = serie([['2026-07-10', 300_000]]);
    expect(sugerirCategoriasParaTope(gastos, ['Restaurantes'], HOY)).toEqual([]);
  });

  it('marca como creciente el mes en curso que supera el promedio', () => {
    const gastos = [
      ...recurrente('Restaurantes', 200_000),
      gasto({ id: 'act', fecha: '2026-08-10', monto: 300_000 }),
    ];
    const out = sugerirCategoriasParaTope(gastos, ['Restaurantes'], HOY);
    expect(out[0].motivo).toBe('creciente');
    expect(out[0].actual).toBe(300_000);
  });

  it('deja fuera lo que gasta menos del umbral', () => {
    const gastos = recurrente('Restaurantes', UMBRAL_MONTO_SUGERENCIA - 10_000);
    expect(sugerirCategoriasParaTope(gastos, ['Restaurantes'], HOY)).toEqual([]);
  });

  it('solo mira las categorías que el consumidor le pasa', () => {
    const gastos = recurrente('Restaurantes', 200_000);
    expect(sugerirCategoriasParaTope(gastos, ['Transporte'], HOY)).toEqual([]);
    expect(sugerirCategoriasParaTope(gastos, [], HOY)).toEqual([]);
  });

  it('ordena lo creciente primero y después por monto', () => {
    const gastos = [
      ...recurrente('Restaurantes', 500_000),
      ...recurrente('Transporte', 100_000),
      gasto({ id: 'act', categoria: 'Transporte', fecha: '2026-08-10', monto: 200_000 }),
      ...recurrente('Salud', 300_000),
    ];
    const out = sugerirCategoriasParaTope(gastos, ['Restaurantes', 'Transporte', 'Salud'], HOY);
    expect(out.map(o => o.categoria)).toEqual(['Transporte', 'Restaurantes', 'Salud']);
  });

  it('propaga el techo del plan a cada monto', () => {
    const gastos = recurrente('Restaurantes', 400_000);
    const out = sugerirCategoriasParaTope(gastos, ['Restaurantes'], HOY, { sinTope: 150_000 });
    expect(out[0].monto).toBe(150_000);
    expect(out[0].acotado).toBe(true);
  });
});

// ── detectarSuscripcionesLargas() ─────────────────────────────────────────────

describe('detectarSuscripcionesLargas()', () => {
  /** Un pago por mes del compromiso, `meses` meses hacia atrás desde julio 2026. */
  const pagos = (compromisoId, meses) =>
    Array.from({ length: meses }, (_, i) => {
      const mes = 7 - i;
      const anio = mes > 0 ? 2026 : 2025;
      const mm = String(mes > 0 ? mes : mes + 12).padStart(2, '0');
      return gasto({
        id: `${compromisoId}-${i}`, compromisoId, categoria: 'Gastos fijos',
        monto: 25_000, fecha: `${anio}-${mm}-05`,
      });
    });

  it('reporta la suscripción con seis meses o más de cobros', () => {
    const out = detectarSuscripcionesLargas([fijo()], pagos('c1', 6), HOY);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      compromisoId: 'c1', descripcion: 'Netflix', mesesPagados: 6, costoAnual: 300_000,
    });
  });

  it('cinco meses todavía no dan para el aviso', () => {
    expect(detectarSuscripcionesLargas([fijo()], pagos('c1', 5), HOY)).toEqual([]);
  });

  it('dos pagos del mismo mes son un mes', () => {
    const dobles = [...pagos('c1', 6), gasto({ id: 'extra', compromisoId: 'c1', fecha: '2026-07-20' })];
    expect(detectarSuscripcionesLargas([fijo()], dobles, HOY)[0].mesesPagados).toBe(6);
  });

  it('solo mira los fijos no esenciales: el arriendo también lleva meses cobrándose', () => {
    const arriendo = fijo({ id: 'c2', descripcion: 'Arriendo', categoria: 'Arriendo', monto: 1_500_000 });
    const out = detectarSuscripcionesLargas([arriendo], pagos('c2', 8), HOY);
    expect(out).toEqual([]);
  });

  it('ignora los dados de baja y los que no tienen monto', () => {
    const baja = fijo({ id: 'c2', descripcion: 'HBO', activo: false });
    const sinMonto = fijo({ id: 'c3', descripcion: 'Spotify', categoria: 'Suscripciones', monto: 0 });
    const gastos = [...pagos('c2', 8), ...pagos('c3', 8)];
    expect(detectarSuscripcionesLargas([baja, sinMonto], gastos, HOY)).toEqual([]);
  });

  it('ordena por costo anual descendente', () => {
    const caro  = fijo({ id: 'c2', descripcion: 'Suscripción cara', categoria: 'Suscripciones', monto: 90_000 });
    const out = detectarSuscripcionesLargas([fijo(), caro], [...pagos('c1', 7), ...pagos('c2', 7)], HOY);
    expect(out.map(s => s.descripcion)).toEqual(['Suscripción cara', 'Netflix']);
  });

  it('con fecha inválida o sin compromisos devuelve lista vacía', () => {
    expect(detectarSuscripcionesLargas([fijo()], pagos('c1', 8), 'nunca')).toEqual([]);
    expect(detectarSuscripcionesLargas(null, null, HOY)).toEqual([]);
  });
});
