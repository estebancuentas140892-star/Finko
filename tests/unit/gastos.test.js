import { describe, it, expect, beforeEach } from 'vitest';
import {
  gastosMes,
  totalGastos,
  totalGastosMes,
  gastosPorCategoria,
  detectarHormigas,
  validarGasto,
  normalizarGasto,
  validarGastoRapido,
  normalizarGastoRapido,
  aplicarGastoASaldo,
  revertirGastoDeSaldo,
  deltasPorEdicionDeGasto,
  filtrarGastos,
  esGastoPendiente,
  gastosPendientes,
} from '../../modules/dominio/gastos/logic.js';
import { renderFormGasto } from '../../modules/dominio/gastos/view.js';
import { S } from '../../modules/core/state.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const gastoBase = (overrides = {}) => ({
  id: 'g1',
  descripcion: 'Almuerzo',
  monto: 15_000,
  categoria: 'Alimentación',
  fecha: '2026-05-10',
  cuentaId: null,
  nota: '',
  ...overrides,
});

const datosFormValidos = {
  descripcion: 'Gasolina',
  monto: '80000',
  categoria: 'Transporte',
  fecha: '2026-05-12',
  cuentaId: 'c1',
  nota: '',
};

// ── gastosMes() ──────────────────────────────────────────────────

describe('gastosMes()', () => {
  it('filtra solo los gastos del mes y año indicados', () => {
    const gastos = [
      gastoBase({ fecha: '2026-05-10' }),
      gastoBase({ id: 'g2', fecha: '2026-04-30' }),
      gastoBase({ id: 'g3', fecha: '2026-05-31' }),
    ];
    const resultado = gastosMes(gastos, 2026, 5);
    expect(resultado).toHaveLength(2);
    expect(resultado.map(g => g.id)).toEqual(['g1', 'g3']);
  });

  it('devuelve vacío si no hay gastos en ese mes', () => {
    const gastos = [gastoBase({ fecha: '2026-04-10' })];
    expect(gastosMes(gastos, 2026, 5)).toEqual([]);
  });

  it('maneja meses con padding de cero (mes 1 = enero)', () => {
    const gastos = [gastoBase({ fecha: '2026-01-15' })];
    expect(gastosMes(gastos, 2026, 1)).toHaveLength(1);
  });

  it('devuelve vacío con array de gastos vacío', () => {
    expect(gastosMes([], 2026, 5)).toEqual([]);
  });
});

// ── totalGastos() ────────────────────────────────────────────────

describe('totalGastos()', () => {
  it('suma los montos de todos los gastos', () => {
    const gastos = [
      gastoBase({ monto: 15_000 }),
      gastoBase({ id: 'g2', monto: 80_000 }),
    ];
    expect(totalGastos(gastos)).toBe(95_000);
  });

  it('devuelve 0 con array vacío', () => {
    expect(totalGastos([])).toBe(0);
  });

  it('trata monto undefined como 0', () => {
    const { monto: _, ...sinMonto } = gastoBase();
    expect(totalGastos([sinMonto])).toBe(0);
  });
});

// ── totalGastosMes() ─────────────────────────────────────────────

describe('totalGastosMes()', () => {
  it('combina el filtro por mes con la suma', () => {
    const gastos = [
      gastoBase({ monto: 15_000, fecha: '2026-05-10' }),
      gastoBase({ id: 'g2', monto: 80_000, fecha: '2026-05-15' }),
      gastoBase({ id: 'g3', monto: 999_999, fecha: '2026-04-01' }),
    ];
    expect(totalGastosMes(gastos, 2026, 5)).toBe(95_000);
  });

  it('devuelve 0 si no hay gastos en el mes', () => {
    expect(totalGastosMes([gastoBase()], 2025, 5)).toBe(0);
  });
});

// ── gastosPorCategoria() ─────────────────────────────────────────

describe('gastosPorCategoria()', () => {
  it('agrupa y suma por categoría correctamente', () => {
    const gastos = [
      gastoBase({ monto: 15_000, categoria: 'Alimentación' }),
      gastoBase({ id: 'g2', monto: 10_000, categoria: 'Alimentación' }),
      gastoBase({ id: 'g3', monto: 80_000, categoria: 'Transporte' }),
    ];
    const result = gastosPorCategoria(gastos);
    expect(result['Alimentación']).toBe(25_000);
    expect(result['Transporte']).toBe(80_000);
  });

  it('usa "Otros" si la categoría es undefined', () => {
    const { categoria: _, ...sinCat } = gastoBase({ monto: 5_000 });
    const result = gastosPorCategoria([sinCat]);
    expect(result['Otros']).toBe(5_000);
  });

  it('devuelve objeto vacío con array vacío', () => {
    expect(gastosPorCategoria([])).toEqual({});
  });
});

// ── detectarHormigas() ───────────────────────────────────────────

describe('detectarHormigas()', () => {
  it('detecta categorías con muchos gastos pequeños que suman bastante', () => {
    const gastos = Array.from({ length: 8 }, (_, i) =>
      gastoBase({ id: `g${i}`, monto: 15_000, categoria: 'Alimentación' })
    );
    const hormigas = detectarHormigas(gastos, 20_000, 100_000);
    expect(hormigas).toHaveLength(1);
    expect(hormigas[0].categoria).toBe('Alimentación');
    expect(hormigas[0].total).toBe(120_000);
    expect(hormigas[0].cantidad).toBe(8);
  });

  it('no incluye categorías que no superan el umbral total', () => {
    const gastos = [
      gastoBase({ monto: 15_000, categoria: 'Alimentación' }),
      gastoBase({ id: 'g2', monto: 15_000, categoria: 'Alimentación' }),
    ];
    const hormigas = detectarHormigas(gastos, 20_000, 100_000);
    expect(hormigas).toHaveLength(0);
  });

  it('excluye transacciones que superan el umbral de monto individual', () => {
    const gastos = [
      gastoBase({ monto: 50_000, categoria: 'Alimentación' }),
      gastoBase({ id: 'g2', monto: 50_000, categoria: 'Alimentación' }),
      gastoBase({ id: 'g3', monto: 50_000, categoria: 'Alimentación' }),
    ];
    const hormigas = detectarHormigas(gastos, 20_000, 100_000);
    expect(hormigas).toHaveLength(0);
  });

  it('ordena por total descendente', () => {
    const gastosAlim = Array.from({ length: 7 }, (_, i) =>
      gastoBase({ id: `a${i}`, monto: 18_000, categoria: 'Alimentación' })
    );
    const gastosTransp = Array.from({ length: 10 }, (_, i) =>
      gastoBase({ id: `t${i}`, monto: 12_000, categoria: 'Transporte' })
    );
    const hormigas = detectarHormigas([...gastosAlim, ...gastosTransp], 20_000, 100_000);
    expect(hormigas[0].total).toBeGreaterThanOrEqual(hormigas[1].total);
  });

  it('calcula el promedio correctamente', () => {
    const gastos = Array.from({ length: 7 }, (_, i) =>
      gastoBase({ id: `g${i}`, monto: 16_000, categoria: 'Entretenimiento' })
    );
    const hormigas = detectarHormigas(gastos, 20_000, 100_000);
    expect(hormigas).toHaveLength(1);
    expect(hormigas[0].promedio).toBe(16_000);
  });

  it('devuelve array vacío con gastos vacíos', () => {
    expect(detectarHormigas([], 20_000, 100_000)).toEqual([]);
  });
});

// ── validarGasto() ────────────────────────────────────────────────

describe('validarGasto()', () => {
  it('retorna array vacío con datos válidos', () => {
    expect(validarGasto(datosFormValidos)).toEqual([]);
  });

  it('reporta error si descripción está vacía', () => {
    const errores = validarGasto({ ...datosFormValidos, descripcion: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/descripci/i);
  });

  it('reporta error si monto es 0', () => {
    const errores = validarGasto({ ...datosFormValidos, monto: '0' });
    expect(errores).toHaveLength(1);
  });

  it('reporta error si monto no es número', () => {
    const errores = validarGasto({ ...datosFormValidos, monto: 'texto' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/monto/i);
  });

  it('reporta error si categoría está vacía', () => {
    const errores = validarGasto({ ...datosFormValidos, categoria: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/categor/i);
  });

  it('reporta error si fecha está vacía', () => {
    const errores = validarGasto({ ...datosFormValidos, fecha: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/fecha/i);
  });

  it('reporta error si no se eligió cuenta', () => {
    const errores = validarGasto({ ...datosFormValidos, cuentaId: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/cuenta/i);
  });

  it('puede tener múltiples errores a la vez', () => {
    const errores = validarGasto({ descripcion: '', monto: '0', categoria: '', fecha: '', cuentaId: '' });
    expect(errores.length).toBeGreaterThanOrEqual(4);
  });
});

// ── normalizarGasto() ─────────────────────────────────────────────

describe('normalizarGasto()', () => {
  it('convierte monto string a número', () => {
    const result = normalizarGasto(datosFormValidos);
    expect(typeof result.monto).toBe('number');
    expect(result.monto).toBe(80_000);
  });

  it('recorta espacios de la descripción', () => {
    const result = normalizarGasto({ ...datosFormValidos, descripcion: '  Gasolina  ' });
    expect(result.descripcion).toBe('Gasolina');
  });

  it('preserva la categoría exacta', () => {
    expect(normalizarGasto(datosFormValidos).categoria).toBe('Transporte');
  });

  it('preserva la fecha exacta', () => {
    expect(normalizarGasto(datosFormValidos).fecha).toBe('2026-05-12');
  });

  it('nota vacía queda como string vacío', () => {
    const result = normalizarGasto({ ...datosFormValidos, nota: '' });
    expect(result.nota).toBe('');
  });

  it('recorta espacios de la nota', () => {
    const result = normalizarGasto({ ...datosFormValidos, nota: '  con descuento  ' });
    expect(result.nota).toBe('con descuento');
  });

  it('preserva cuentaId si viene', () => {
    const result = normalizarGasto(datosFormValidos);
    expect(result.cuentaId).toBe('c1');
  });

  it('cuentaId null si no viene', () => {
    const { cuentaId: _omitido, ...sinCuenta } = datosFormValidos;
    const result = normalizarGasto(sinCuenta);
    expect(result.cuentaId).toBeNull();
  });

  it('no incluye id (lo asigna crud.js)', () => {
    expect(normalizarGasto(datosFormValidos)).not.toHaveProperty('id');
  });

  it('pendienteCompletar es false por defecto en gasto normal', () => {
    expect(normalizarGasto(datosFormValidos).pendienteCompletar).toBe(false);
  });
});

// ── validarGastoRapido() ──────────────────────────────────────────

describe('validarGastoRapido()', () => {
  it('acepta un monto positivo', () => {
    expect(validarGastoRapido(50000)).toEqual([]);
    expect(validarGastoRapido('50000')).toEqual([]);
  });
  it('rechaza monto 0', () => {
    expect(validarGastoRapido(0).length).toBeGreaterThan(0);
  });
  it('rechaza monto negativo', () => {
    expect(validarGastoRapido(-100).length).toBeGreaterThan(0);
  });
  it('rechaza monto no numerico', () => {
    expect(validarGastoRapido('abc').length).toBeGreaterThan(0);
  });
  it('rechaza string vacio', () => {
    expect(validarGastoRapido('').length).toBeGreaterThan(0);
  });
  it('sin requiereCuenta (default), acepta cuentaId nulo o vacio', () => {
    expect(validarGastoRapido(50000, null)).toEqual([]);
    expect(validarGastoRapido(50000, '')).toEqual([]);
  });
  it('con requiereCuenta=true, rechaza cuentaId vacio o nulo', () => {
    expect(validarGastoRapido(50000, null, true).length).toBeGreaterThan(0);
    expect(validarGastoRapido(50000, '', true).length).toBeGreaterThan(0);
  });
  it('con requiereCuenta=true, acepta cuentaId valido', () => {
    expect(validarGastoRapido(50000, 'cuenta-123', true)).toEqual([]);
  });
});

// ── normalizarGastoRapido() ───────────────────────────────────────

describe('normalizarGastoRapido()', () => {
  it('crea un gasto con descripcion vacia y categoria Otros', () => {
    const g = normalizarGastoRapido(50000, '2026-05-20');
    expect(g.descripcion).toBe('');
    expect(g.categoria).toBe('Otros');
    expect(g.fecha).toBe('2026-05-20');
    expect(g.monto).toBe(50000);
    expect(g.pendienteCompletar).toBe(true);
  });

  it('convierte monto string a numero', () => {
    const g = normalizarGastoRapido('75000', '2026-05-20');
    expect(typeof g.monto).toBe('number');
    expect(g.monto).toBe(75000);
  });

  it('sin cuentaId: queda en null y nota vacia', () => {
    const g = normalizarGastoRapido(10000, '2026-05-20');
    expect(g.cuentaId).toBeNull();
    expect(g.nota).toBe('');
  });

  it('con cuentaId: lo guarda en el gasto', () => {
    const g = normalizarGastoRapido(30000, '2026-06-01', 'cuenta-abc');
    expect(g.cuentaId).toBe('cuenta-abc');
  });

  it('cuentaId vacio o nulo queda en null', () => {
    expect(normalizarGastoRapido(10000, '2026-06-01', '').cuentaId).toBeNull();
    expect(normalizarGastoRapido(10000, '2026-06-01', null).cuentaId).toBeNull();
  });
});

// ── aplicarGastoASaldo() ─────────────────────────────────────────

describe('aplicarGastoASaldo()', () => {
  it('descuenta el monto del saldo', () => {
    expect(aplicarGastoASaldo(100_000, 30_000)).toBe(70_000);
  });
  it('permite saldo negativo (no impide sobregirar)', () => {
    expect(aplicarGastoASaldo(10_000, 50_000)).toBe(-40_000);
  });
  it('trata saldo undefined como 0', () => {
    expect(aplicarGastoASaldo(undefined, 25_000)).toBe(-25_000);
  });
  it('trata monto undefined como 0', () => {
    expect(aplicarGastoASaldo(100_000, undefined)).toBe(100_000);
  });
});

// ── revertirGastoDeSaldo() ───────────────────────────────────────

describe('revertirGastoDeSaldo()', () => {
  it('devuelve el monto al saldo', () => {
    expect(revertirGastoDeSaldo(70_000, 30_000)).toBe(100_000);
  });
  it('aplicar + revertir es idempotente', () => {
    const inicial = 250_000;
    const monto   = 80_000;
    const tras = revertirGastoDeSaldo(aplicarGastoASaldo(inicial, monto), monto);
    expect(tras).toBe(inicial);
  });
});

// ── deltasPorEdicionDeGasto() ────────────────────────────────────

describe('deltasPorEdicionDeGasto()', () => {
  it('misma cuenta, mismo monto: no genera deltas', () => {
    const antes   = { cuentaId: 'c1', monto: 50_000 };
    const despues = { cuentaId: 'c1', monto: 50_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({});
  });

  it('misma cuenta, monto sube: delta negativo (descontar la diferencia)', () => {
    const antes   = { cuentaId: 'c1', monto: 50_000 };
    const despues = { cuentaId: 'c1', monto: 80_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({ c1: -30_000 });
  });

  it('misma cuenta, monto baja: delta positivo (devolver la diferencia)', () => {
    const antes   = { cuentaId: 'c1', monto: 80_000 };
    const despues = { cuentaId: 'c1', monto: 50_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({ c1: 30_000 });
  });

  it('cambia de cuenta: revierte en la vieja, descuenta en la nueva', () => {
    const antes   = { cuentaId: 'c1', monto: 40_000 };
    const despues = { cuentaId: 'c2', monto: 40_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({ c1: 40_000, c2: -40_000 });
  });

  it('cambia cuenta y monto', () => {
    const antes   = { cuentaId: 'c1', monto: 40_000 };
    const despues = { cuentaId: 'c2', monto: 60_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({ c1: 40_000, c2: -60_000 });
  });

  it('el gasto antes no tenía cuenta (migración de gasto viejo)', () => {
    const antes   = { cuentaId: null, monto: 40_000 };
    const despues = { cuentaId: 'c2', monto: 40_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({ c2: -40_000 });
  });

  it('el gasto pierde la cuenta (caso defensivo)', () => {
    const antes   = { cuentaId: 'c1', monto: 40_000 };
    const despues = { cuentaId: null, monto: 40_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({ c1: 40_000 });
  });

  it('ambos sin cuenta: no genera deltas', () => {
    const antes   = { cuentaId: null, monto: 40_000 };
    const despues = { cuentaId: null, monto: 60_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({});
  });
});

// ── FILTRAR GASTOS ───────────────────────────────────────────────

describe('filtrarGastos()', () => {
  const gastos = [
    gastoBase({ id: 'g1', categoria: 'Alimentación' }),
    gastoBase({ id: 'g2', categoria: 'Transporte'   }),
    gastoBase({ id: 'g3', categoria: 'Alimentación' }),
    gastoBase({ id: 'g4', categoria: 'Salud'        }),
  ];

  it('devuelve todos cuando categoria es null', () => {
    expect(filtrarGastos(gastos, null)).toHaveLength(4);
  });

  it('devuelve todos cuando categoria es cadena vacía', () => {
    expect(filtrarGastos(gastos, '')).toHaveLength(4);
  });

  it('devuelve todos cuando categoria es undefined', () => {
    expect(filtrarGastos(gastos, undefined)).toHaveLength(4);
  });

  it('filtra por categoría exacta', () => {
    const r = filtrarGastos(gastos, 'Alimentación');
    expect(r).toHaveLength(2);
    expect(r.map(g => g.id).sort()).toEqual(['g1', 'g3']);
  });

  it('devuelve array vacío si ningún gasto coincide', () => {
    expect(filtrarGastos(gastos, 'Vivienda')).toEqual([]);
  });

  it('trata gasto sin categoría como "Otros"', () => {
    const sinCat = [gastoBase({ id: 'x', categoria: undefined })];
    expect(filtrarGastos(sinCat, 'Otros')).toHaveLength(1);
    expect(filtrarGastos(sinCat, 'Alimentación')).toHaveLength(0);
  });

  it('no muta el array original', () => {
    const copia = [...gastos];
    filtrarGastos(gastos, 'Salud');
    expect(gastos).toEqual(copia);
  });

  it('devuelve array vacío con input vacío', () => {
    expect(filtrarGastos([], 'Alimentación')).toEqual([]);
  });
});

// ── PENDIENTES POR ORGANIZAR ─────────────────────────────────────

describe('esGastoPendiente()', () => {
  it('marca pendiente un gasto rápido (flag pendienteCompletar)', () => {
    const g = gastoBase({ descripcion: '', pendienteCompletar: true });
    expect(esGastoPendiente(g)).toBe(true);
  });

  it('marca pendiente un gasto sin descripción aunque no tenga el flag', () => {
    const g = gastoBase({ descripcion: '   ', pendienteCompletar: false });
    expect(esGastoPendiente(g)).toBe(true);
  });

  it('no marca pendiente un gasto completo', () => {
    const g = gastoBase({ descripcion: 'Almuerzo', pendienteCompletar: false });
    expect(esGastoPendiente(g)).toBe(false);
  });

  it('no marca pendiente un gasto viejo sin el flag pero con descripción', () => {
    const g = gastoBase({ descripcion: 'Mercado' });
    delete g.pendienteCompletar;
    expect(esGastoPendiente(g)).toBe(false);
  });

  it('es defensivo ante null/undefined', () => {
    expect(esGastoPendiente(null)).toBe(true);
    expect(esGastoPendiente(undefined)).toBe(true);
  });
});

describe('gastosPendientes()', () => {
  it('filtra solo los gastos sin organizar, de cualquier mes', () => {
    const gastos = [
      gastoBase({ id: 'g1', fecha: '2026-05-10', descripcion: '', pendienteCompletar: true }),
      gastoBase({ id: 'g2', fecha: '2026-03-02', descripcion: 'Arriendo' }),
      gastoBase({ id: 'g3', fecha: '2026-01-20', descripcion: '', pendienteCompletar: true }),
    ];
    const r = gastosPendientes(gastos);
    expect(r).toHaveLength(2);
    expect(r.map(g => g.id)).toEqual(['g1', 'g3']);
  });

  it('devuelve vacío cuando no hay pendientes', () => {
    const gastos = [gastoBase({ descripcion: 'Café' })];
    expect(gastosPendientes(gastos)).toEqual([]);
  });

  it('es defensivo ante array vacío o nulo', () => {
    expect(gastosPendientes([])).toEqual([]);
    expect(gastosPendientes(undefined)).toEqual([]);
  });

  it('no muta el array original', () => {
    const gastos = [gastoBase({ descripcion: '', pendienteCompletar: true })];
    const copia = [...gastos];
    gastosPendientes(gastos);
    expect(gastos).toEqual(copia);
  });
});

// ── renderFormGasto() - selector de cuenta ───────────────────────

describe('renderFormGasto() - selector de cuenta', () => {
  const cuenta = (id, nombre, saldo = 500_000) => ({
    id, nombre, saldo, banco: 'Nequi', tipo: 'Ahorros', activa: true,
  });

  beforeEach(() => {
    S.cuentas = [];
  });

  it('sin cuentas: empty state guiado, sin form', () => {
    S.cuentas = [];
    const html = renderFormGasto();
    expect(html).not.toContain('form-gasto');
    expect(html).toContain('Ir a Mis cuentas');
  });

  it('1 cuenta activa: hidden input + hint con nombre y saldo, sin select', () => {
    S.cuentas = [cuenta('c1', 'Nequi principal', 1_000_000)];
    const html = renderFormGasto();
    expect(html).toContain('type="hidden"');
    expect(html).toContain('name="cuentaId"');
    expect(html).toContain('value="c1"');
    expect(html).toContain('Sale de:');
    expect(html).toContain('Nequi principal');
    expect(html).not.toContain('<select id="gasto-cuenta"');
  });

  it('1 cuenta con saldo en cero: hint con clase de advertencia', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 0)];
    const html = renderFormGasto();
    expect(html).toContain('form-hint--danger');
  });

  it('1 cuenta activa + 1 inactiva: se asume la activa', () => {
    S.cuentas = [
      cuenta('c1', 'Bancolombia'),
      { ...cuenta('c2', 'Cerrada'), activa: false },
    ];
    const html = renderFormGasto();
    expect(html).toContain('value="c1"');
    expect(html).not.toContain('<select id="gasto-cuenta"');
  });

  it('varias cuentas: select visible con todas las activas', () => {
    S.cuentas = [
      cuenta('c1', 'Bancolombia'),
      cuenta('c2', 'Nequi'),
    ];
    const html = renderFormGasto();
    expect(html).toContain('<select id="gasto-cuenta"');
    expect(html).toContain('name="cuentaId"');
    expect(html).toContain('value="c1"');
    expect(html).toContain('value="c2"');
    expect(html).not.toContain('type="hidden"');
  });
});
