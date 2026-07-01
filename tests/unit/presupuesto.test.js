import { describe, it, expect } from 'vitest';
import {
  presupuestosActivos,
  calcularGastadoCategoria,
  calcularProgreso,
  resumenGrupos,
  totalAsignadoMensual,
  categoriasSinPresupuesto,
  tienePresupuesto,
  validarPresupuesto,
  normalizarPresupuesto,
  UMBRAL_ALERTA,
  UMBRAL_EXCEDIDO,
} from '../../modules/dominio/presupuesto/logic.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const presupuesto = (overrides = {}) => ({
  id:           'p1',
  categoria:    'Alimentación',
  montoMensual: 500_000,
  activo:       true,
  fechaCreacion:'2026-05-01T00:00:00.000Z',
  ...overrides,
});

const gasto = (overrides = {}) => ({
  id:          'g1',
  descripcion: 'Mercado',
  monto:       50_000,
  categoria:   'Alimentación',
  fecha:       '2026-05-15',
  cuentaId:    null,
  nota:        '',
  ...overrides,
});

// ── presupuestosActivos() ─────────────────────────────────────────────────────

describe('presupuestosActivos()', () => {
  it('filtra los que tienen activo: false', () => {
    const lista = [presupuesto({ id: 'a' }), presupuesto({ id: 'b', activo: false })];
    expect(presupuestosActivos(lista)).toHaveLength(1);
    expect(presupuestosActivos(lista)[0].id).toBe('a');
  });

  it('considera activos los que no traen flag explícito', () => {
    const lista = [{ id: 'x', categoria: 'Otros', montoMensual: 1000 }];
    expect(presupuestosActivos(lista)).toHaveLength(1);
  });

  it('null/undefined devuelve array vacío', () => {
    expect(presupuestosActivos(null)).toEqual([]);
    expect(presupuestosActivos(undefined)).toEqual([]);
  });
});

// ── calcularGastadoCategoria() ────────────────────────────────────────────────

describe('calcularGastadoCategoria()', () => {
  it('suma gastos de la categoría en el mes indicado', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 50_000, fecha: '2026-05-01' }),
      gasto({ id: 'g2', monto: 30_000, fecha: '2026-05-15' }),
      gasto({ id: 'g3', monto: 80_000, fecha: '2026-05-28' }),
    ];
    expect(calcularGastadoCategoria(gastos, 'Alimentación', 2026, 5)).toBe(160_000);
  });

  it('ignora gastos de otra categoría', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 50_000, categoria: 'Alimentación' }),
      gasto({ id: 'g2', monto: 30_000, categoria: 'Transporte' }),
    ];
    expect(calcularGastadoCategoria(gastos, 'Alimentación', 2026, 5)).toBe(50_000);
  });

  it('ignora gastos de otro mes', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 50_000, fecha: '2026-04-30' }),
      gasto({ id: 'g2', monto: 30_000, fecha: '2026-05-15' }),
    ];
    expect(calcularGastadoCategoria(gastos, 'Alimentación', 2026, 5)).toBe(30_000);
  });

  it('sin gastos devuelve 0', () => {
    expect(calcularGastadoCategoria([], 'Alimentación', 2026, 5)).toBe(0);
  });

  it('gastos null/undefined no rompe', () => {
    expect(calcularGastadoCategoria(null, 'Alimentación', 2026, 5)).toBe(0);
    expect(calcularGastadoCategoria(undefined, 'Alimentación', 2026, 5)).toBe(0);
  });
});

// ── calcularProgreso() ────────────────────────────────────────────────────────

describe('calcularProgreso()', () => {
  it('progreso "ok" con < 75% gastado', () => {
    const gastos = [gasto({ monto: 200_000 })]; // 40% de 500k
    const r = calcularProgreso(presupuesto(), gastos, 2026, 5);
    expect(r.gastado).toBe(200_000);
    expect(r.asignado).toBe(500_000);
    expect(r.restante).toBe(300_000);
    expect(r.porcentaje).toBe(40);
    expect(r.estado).toBe('ok');
  });

  it('progreso "alerta" entre 75% y 100%', () => {
    const gastos = [gasto({ monto: 400_000 })]; // 80% de 500k
    const r = calcularProgreso(presupuesto(), gastos, 2026, 5);
    expect(r.porcentaje).toBe(80);
    expect(r.estado).toBe('alerta');
  });

  it('progreso "alerta" exacto en 75%', () => {
    const gastos = [gasto({ monto: 375_000 })]; // 75% de 500k
    const r = calcularProgreso(presupuesto(), gastos, 2026, 5);
    expect(r.estado).toBe('alerta');
  });

  it('progreso "excedido" cuando supera 100%', () => {
    const gastos = [gasto({ monto: 600_000 })];
    const r = calcularProgreso(presupuesto(), gastos, 2026, 5);
    expect(r.porcentaje).toBe(120);
    expect(r.restante).toBe(-100_000);
    expect(r.estado).toBe('excedido');
  });

  it('exactamente 100% no es excedido - todavía es alerta', () => {
    const gastos = [gasto({ monto: 500_000 })];
    const r = calcularProgreso(presupuesto(), gastos, 2026, 5);
    expect(r.porcentaje).toBe(100);
    expect(r.estado).toBe('alerta');
  });

  it('asignado en 0 no divide por cero - porcentaje 0, estado ok', () => {
    const r = calcularProgreso(presupuesto({ montoMensual: 0 }), [gasto({ monto: 100 })], 2026, 5);
    expect(r.porcentaje).toBe(0);
    expect(r.estado).toBe('ok');
  });

  it('sin gastos del mes devuelve gastado 0 y estado ok', () => {
    const r = calcularProgreso(presupuesto(), [], 2026, 5);
    expect(r.gastado).toBe(0);
    expect(r.restante).toBe(500_000);
    expect(r.estado).toBe('ok');
  });

  it('umbrales accesibles como constantes', () => {
    expect(UMBRAL_ALERTA).toBe(0.75);
    expect(UMBRAL_EXCEDIDO).toBe(1.00);
  });
});

// ── resumenGrupos() (MC.5a, ADR 017) ──────────────────────────────────────────

describe('resumenGrupos()', () => {
  it('devuelve las 3 claves de grupo financiero', () => {
    const r = resumenGrupos({}, {});
    expect(Object.keys(r).sort()).toEqual(['ahorro', 'estilo-de-vida', 'necesidades']);
  });

  it('calcula asignado, ejecutado y restante por grupo', () => {
    const r = resumenGrupos(
      { necesidades: 1_000_000, 'estilo-de-vida': 400_000, ahorro: 200_000 },
      { necesidades: 600_000, 'estilo-de-vida': 100_000, ahorro: 50_000 },
    );
    expect(r.necesidades).toEqual({
      asignado: 1_000_000, ejecutado: 600_000, restante: 400_000, pct: 60, estado: 'ok',
    });
    expect(r['estilo-de-vida']).toEqual({
      asignado: 400_000, ejecutado: 100_000, restante: 300_000, pct: 25, estado: 'ok',
    });
    expect(r.ahorro).toEqual({
      asignado: 200_000, ejecutado: 50_000, restante: 150_000, pct: 25, estado: 'ok',
    });
  });

  it('estado "alerta" entre 75% y 100%', () => {
    const r = resumenGrupos({ necesidades: 500_000 }, { necesidades: 400_000 }); // 80%
    expect(r.necesidades.pct).toBe(80);
    expect(r.necesidades.estado).toBe('alerta');
  });

  it('estado "alerta" exacto en 75%', () => {
    const r = resumenGrupos({ necesidades: 400_000 }, { necesidades: 300_000 }); // 75%
    expect(r.necesidades.estado).toBe('alerta');
  });

  it('estado "excedido" cuando el ejecutado supera el asignado', () => {
    const r = resumenGrupos({ ahorro: 200_000 }, { ahorro: 250_000 });
    expect(r.ahorro.pct).toBe(125);
    expect(r.ahorro.restante).toBe(-50_000);
    expect(r.ahorro.estado).toBe('excedido');
  });

  it('exactamente 100% no es excedido, todavía es alerta', () => {
    const r = resumenGrupos({ ahorro: 200_000 }, { ahorro: 200_000 });
    expect(r.ahorro.pct).toBe(100);
    expect(r.ahorro.estado).toBe('alerta');
  });

  it('asignado en 0 no divide por cero: pct 0, estado ok', () => {
    const r = resumenGrupos({}, { 'estilo-de-vida': 50_000 });
    expect(r['estilo-de-vida'].pct).toBe(0);
    expect(r['estilo-de-vida'].estado).toBe('ok');
  });

  it('grupo sin ejecutado devuelve ejecutado 0 y restante = asignado', () => {
    const r = resumenGrupos({ necesidades: 300_000 }, {});
    expect(r.necesidades.ejecutado).toBe(0);
    expect(r.necesidades.restante).toBe(300_000);
    expect(r.necesidades.estado).toBe('ok');
  });

  it('sin argumentos no rompe: los 3 grupos en 0', () => {
    const r = resumenGrupos();
    for (const grupo of ['necesidades', 'estilo-de-vida', 'ahorro']) {
      expect(r[grupo]).toEqual({ asignado: 0, ejecutado: 0, restante: 0, pct: 0, estado: 'ok' });
    }
  });

  it('usa los mismos umbrales que calcularProgreso', () => {
    // 75% exacto: alerta en ambas funciones.
    const progresoCategoria = calcularProgreso(
      { montoMensual: 400_000, categoria: 'X' },
      [{ monto: 300_000, categoria: 'X', fecha: '2026-05-01' }],
      2026, 5,
    );
    const grupo = resumenGrupos({ necesidades: 400_000 }, { necesidades: 300_000 }).necesidades;
    expect(progresoCategoria.estado).toBe(grupo.estado);
  });
});

// ── totalAsignadoMensual() ────────────────────────────────────────────────────

describe('totalAsignadoMensual()', () => {
  it('suma el monto mensual de envelopes activos', () => {
    const lista = [
      presupuesto({ id: 'a', montoMensual: 500_000 }),
      presupuesto({ id: 'b', montoMensual: 300_000 }),
      presupuesto({ id: 'c', montoMensual: 100_000 }),
    ];
    expect(totalAsignadoMensual(lista)).toBe(900_000);
  });

  it('ignora envelopes inactivos', () => {
    const lista = [
      presupuesto({ id: 'a', montoMensual: 500_000 }),
      presupuesto({ id: 'b', montoMensual: 300_000, activo: false }),
    ];
    expect(totalAsignadoMensual(lista)).toBe(500_000);
  });

  it('lista vacía devuelve 0', () => {
    expect(totalAsignadoMensual([])).toBe(0);
  });
});

// ── categoriasSinPresupuesto() ────────────────────────────────────────────────

describe('categoriasSinPresupuesto()', () => {
  it('detecta categorías con gastos pero sin envelope', () => {
    const presupuestos = [presupuesto({ categoria: 'Alimentación' })];
    const gastos = [
      gasto({ id: 'g1', categoria: 'Alimentación', monto: 50_000 }),
      gasto({ id: 'g2', categoria: 'Transporte',   monto: 30_000 }),
      gasto({ id: 'g3', categoria: 'Salud',        monto: 20_000 }),
    ];
    const result = categoriasSinPresupuesto(presupuestos, gastos, 2026, 5);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.categoria).sort()).toEqual(['Salud', 'Transporte']);
  });

  it('agrupa múltiples gastos de la misma categoría', () => {
    const gastos = [
      gasto({ id: 'g1', categoria: 'Transporte', monto: 5_000 }),
      gasto({ id: 'g2', categoria: 'Transporte', monto: 8_000 }),
    ];
    const result = categoriasSinPresupuesto([], gastos, 2026, 5);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ categoria: 'Transporte', gastado: 13_000 });
  });

  it('ordena por gastado descendente', () => {
    const gastos = [
      gasto({ id: 'g1', categoria: 'Transporte', monto: 5_000 }),
      gasto({ id: 'g2', categoria: 'Ropa',       monto: 100_000 }),
      gasto({ id: 'g3', categoria: 'Salud',      monto: 50_000 }),
    ];
    const result = categoriasSinPresupuesto([], gastos, 2026, 5);
    expect(result.map(r => r.categoria)).toEqual(['Ropa', 'Salud', 'Transporte']);
  });

  it('ignora gastos de otro mes', () => {
    const gastos = [gasto({ categoria: 'Salud', fecha: '2026-04-15', monto: 100_000 })];
    expect(categoriasSinPresupuesto([], gastos, 2026, 5)).toEqual([]);
  });

  it('envelopes inactivos no cuentan como con presupuesto', () => {
    const presupuestos = [presupuesto({ categoria: 'Salud', activo: false })];
    const gastos = [gasto({ categoria: 'Salud', monto: 50_000 })];
    const result = categoriasSinPresupuesto(presupuestos, gastos, 2026, 5);
    expect(result).toHaveLength(1);
    expect(result[0].categoria).toBe('Salud');
  });
});

// ── tienePresupuesto() ────────────────────────────────────────────────────────

describe('tienePresupuesto()', () => {
  it('detecta categoría con envelope activo', () => {
    const lista = [presupuesto({ categoria: 'Alimentación' })];
    expect(tienePresupuesto('Alimentación', lista)).toBe(true);
  });

  it('ignora envelopes inactivos', () => {
    const lista = [presupuesto({ categoria: 'Alimentación', activo: false })];
    expect(tienePresupuesto('Alimentación', lista)).toBe(false);
  });

  it('false si la categoría no aparece', () => {
    expect(tienePresupuesto('Salud', [presupuesto({ categoria: 'Alimentación' })])).toBe(false);
  });
});

// ── validarPresupuesto() ──────────────────────────────────────────────────────

describe('validarPresupuesto()', () => {
  it('válido con categoría y monto correcto', () => {
    expect(validarPresupuesto({ categoria: 'Alimentación', montoMensual: '500000' }, [])).toEqual([]);
  });

  it('error si falta categoría', () => {
    const errs = validarPresupuesto({ montoMensual: '500000' }, []);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/categoría/i);
  });

  it('error si categoría no está en el catálogo', () => {
    const errs = validarPresupuesto({ categoria: 'Inventada', montoMensual: '1000' }, []);
    expect(errs[0]).toMatch(/inválida/i);
  });

  it('error si monto es 0 o negativo', () => {
    const errs1 = validarPresupuesto({ categoria: 'Alimentación', montoMensual: '0' }, []);
    expect(errs1[0]).toMatch(/mayor a 0/i);
    const errs2 = validarPresupuesto({ categoria: 'Alimentación', montoMensual: '-100' }, []);
    expect(errs2[0]).toMatch(/mayor a 0/i);
  });

  it('error si monto no es número', () => {
    const errs = validarPresupuesto({ categoria: 'Alimentación', montoMensual: 'abc' }, []);
    expect(errs[0]).toMatch(/mayor a 0/i);
  });

  it('error si ya existe envelope para esa categoría', () => {
    const existentes = [presupuesto({ categoria: 'Alimentación' })];
    const errs = validarPresupuesto({ categoria: 'Alimentación', montoMensual: '300000' }, existentes);
    expect(errs[0]).toMatch(/ya existe/i);
  });

  it('NO marca duplicado si estamos editando el mismo envelope (id coincide)', () => {
    const existentes = [presupuesto({ id: 'p1', categoria: 'Alimentación' })];
    const errs = validarPresupuesto(
      { categoria: 'Alimentación', montoMensual: '600000' },
      existentes,
      'p1',
    );
    expect(errs).toEqual([]);
  });

  it('marca duplicado si editamos otro envelope hacia una categoría ya usada', () => {
    const existentes = [
      presupuesto({ id: 'p1', categoria: 'Alimentación' }),
      presupuesto({ id: 'p2', categoria: 'Transporte' }),
    ];
    const errs = validarPresupuesto(
      { categoria: 'Alimentación', montoMensual: '500000' },
      existentes,
      'p2',
    );
    expect(errs[0]).toMatch(/ya existe/i);
  });
});

// ── normalizarPresupuesto() ───────────────────────────────────────────────────

describe('normalizarPresupuesto()', () => {
  it('convierte montoMensual a Number', () => {
    const out = normalizarPresupuesto({ categoria: 'Alimentación', montoMensual: '500000' });
    expect(out.montoMensual).toBe(500_000);
    expect(typeof out.montoMensual).toBe('number');
  });

  it('marca activo: true por defecto', () => {
    const out = normalizarPresupuesto({ categoria: 'Alimentación', montoMensual: '100' });
    expect(out.activo).toBe(true);
  });

  it('preserva la categoría tal cual', () => {
    const out = normalizarPresupuesto({ categoria: 'Salud', montoMensual: '200000' });
    expect(out.categoria).toBe('Salud');
  });
});
