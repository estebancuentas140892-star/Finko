/**
 * GAS.11a (ADR 186): Movimientos como el lugar donde se encuentra todo.
 * El título de un gasto con su nota o su subcategoría, el tipo que separa
 * fijos de deudas, la búsqueda sin tildes, la subcategoría, las opciones de
 * los filtros y los atajos de periodo.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  movimientosDesdeGastos, movimientosDesdeIngresosPuntuales, movimientosDesdeTransferencias,
  filtrarMovimientos, claseMovimiento, opcionesDeFiltro, rangoDePeriodo,
} from '../../modules/dominio/movimientos/logic.js';
import {
  renderFiltrosMovimientos, renderMovimientosCompletos, limpiarFiltrosMovimientos,
  ponerFiltrosMovimientos,
} from '../../modules/dominio/movimientos/view.js';
import { S } from '../../modules/core/state.js';

const gasto = (o = {}) => ({ id: 'g', monto: 10_000, categoria: 'Mercado', fecha: '2026-11-10', cuentaId: 'c1', ...o });

const gastos = [
  gasto({ id: 'g1', categoria: 'Restaurantes', nota: 'Almuerzo de trabajo' }),
  gasto({ id: 'g2', categoria: 'Bus, taxi y apps', subcategoriaId: 'transp-taxi', cuentaId: 'c2' }),
  gasto({ id: 'g3', categoria: 'Bus, taxi y apps', subcategoriaId: 'transp-bus' }),
  gasto({ id: 'g4', categoria: 'Café', subcategoriaId: 'cafe-tinto' }),
  gasto({ id: 'g5', categoria: 'Gastos fijos', descripcion: 'Netflix' }),
  gasto({ id: 'g6', categoria: 'Deudas', descripcion: 'Crédito libre inversión' }),
  // Una subcategoría que no es de su categoría no cuenta (dato viejo).
  gasto({ id: 'g7', categoria: 'Mercado', subcategoriaId: 'transp-taxi' }),
];

describe('movimientosDesdeGastos: el título de la fila de Gastos (ADR 186 D1)', () => {
  const movs = movimientosDesdeGastos(gastos);
  const de = (id) => movs.find(m => m.id === id);

  it('la nota es el título, como en Gastos', () => {
    expect(de('g1').descripcion).toBe('Almuerzo de trabajo');
    expect(de('g1').nota).toBe('Almuerzo de trabajo');
  });

  it('sin texto propio, la subcategoría; sin ella, la categoría', () => {
    expect(de('g2').descripcion).toBe('Taxi');
    expect(de('g2').subcategoriaId).toBe('transp-taxi');
    expect(de('g7').descripcion).toBe('Mercado');
    expect(de('g7').subcategoriaId).toBeNull();
  });

  it('la descripción de antes manda sobre la nota', () => {
    const [m] = movimientosDesdeGastos([gasto({ descripcion: 'Mercado del mes', nota: 'con la tarjeta' })]);
    expect(m.descripcion).toBe('Mercado del mes');
  });
});

describe('claseMovimiento: el tipo no mezcla fijos con deudas (ADR 186 D3)', () => {
  it('gasto del día, pago de un fijo y pago de una deuda son tres tipos', () => {
    const movs = movimientosDesdeGastos(gastos);
    expect(claseMovimiento(movs.find(m => m.id === 'g1'))).toBe('gastos');
    expect(claseMovimiento(movs.find(m => m.id === 'g5'))).toBe('fijos');
    expect(claseMovimiento(movs.find(m => m.id === 'g6'))).toBe('deudas');
  });

  it('ingreso, transferencia, ajuste, préstamo y aportes tienen el suyo', () => {
    expect(claseMovimiento({ tipo: 'ingreso' })).toBe('ingresos');
    expect(claseMovimiento({ tipo: 'transferencia' })).toBe('transferencias');
    expect(claseMovimiento({ tipo: 'ajuste' })).toBe('ajustes');
    expect(claseMovimiento({ tipo: 'recibido' })).toBe('deudas');
    expect(claseMovimiento({ tipo: 'avance' })).toBe('deudas');
    expect(claseMovimiento({ tipo: 'prestamo' })).toBe('personales');
    expect(claseMovimiento({ tipo: 'abono' })).toBe('personales');
    expect(claseMovimiento({ tipo: 'aporte-meta' })).toBe('metas');
    expect(claseMovimiento({ tipo: 'aporte' })).toBe('ahorro');
  });

  it('el filtro "deudas" no trae Netflix ni el gasto del día', () => {
    const r = filtrarMovimientos(movimientosDesdeGastos(gastos), { dominio: 'deudas' });
    expect(r.map(m => m.id)).toEqual(['g6']);
  });

  it('"gastos" sigue siendo el gasto del día (la llegada desde Gastos no cambia)', () => {
    const r = filtrarMovimientos(movimientosDesdeGastos(gastos), { dominio: 'gastos' });
    expect(r.map(m => m.id).sort()).toEqual(['g1', 'g2', 'g3', 'g4', 'g7']);
  });
});

describe('filtrarMovimientos: búsqueda y subcategoría (ADR 186 D2)', () => {
  const movs = [
    ...movimientosDesdeGastos(gastos),
    ...movimientosDesdeIngresosPuntuales([{ id: 'i1', monto: 100, descripcion: 'Salario', fecha: '2026-11-01', cuentaId: 'c1' }]),
  ];

  it('busca en la nota, sin distinguir tildes', () => {
    expect(filtrarMovimientos(movs, { texto: 'almuerzo' }).map(m => m.id)).toEqual(['g1']);
    expect(filtrarMovimientos(movs, { texto: 'cafe' }).map(m => m.id)).toEqual(['g4']);
    expect(filtrarMovimientos(movs, { texto: 'CRÉDITO' }).map(m => m.id)).toEqual(['g6']);
  });

  it('busca en la categoría aunque el título sea la nota', () => {
    expect(filtrarMovimientos(movs, { texto: 'restaurantes' }).map(m => m.id)).toEqual(['g1']);
  });

  it('la subcategoría se cruza con la categoría', () => {
    const r = filtrarMovimientos(movs, { categoria: 'Bus, taxi y apps', subcategoriaId: 'transp-taxi' });
    expect(r.map(m => m.id)).toEqual(['g2']);
  });
});

describe('opcionesDeFiltro', () => {
  const movs = [
    ...movimientosDesdeGastos(gastos),
    ...movimientosDesdeTransferencias([{ id: 't1', monto: 5, cuentaOrigenId: 'c2', cuentaDestinoId: 'c3', fecha: '2026-11-02' }]),
  ];
  const o = opcionesDeFiltro(movs);

  it('las categorías del día a día, sin los pagos de fijos y deudas', () => {
    expect(o.categorias).not.toContain('Gastos fijos');
    expect(o.categorias).not.toContain('Deudas');
    expect(o.categorias[0]).toBe('Bus, taxi y apps');
  });

  it('las subcategorías que hay, en el orden del catálogo', () => {
    expect(o.subcategorias['Bus, taxi y apps'].map(s => s.id)).toEqual(['transp-bus', 'transp-taxi']);
    expect(o.subcategorias.Mercado).toBeUndefined();
  });

  it('las cuentas que aparecen, también las dos de una transferencia', () => {
    expect(o.cuentaIds.sort()).toEqual(['c1', 'c2', 'c3']);
  });
});

describe('rangoDePeriodo (ADR 186 D4)', () => {
  it('este mes, mes pasado, tres meses y este año', () => {
    expect(rangoDePeriodo('mes', '2026-11-20')).toEqual({ desde: '2026-11-01', hasta: '2026-11-20' });
    expect(rangoDePeriodo('mes-pasado', '2026-11-20')).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    expect(rangoDePeriodo('tres-meses', '2026-11-20')).toEqual({ desde: '2026-09-01', hasta: '2026-11-20' });
    expect(rangoDePeriodo('anio', '2026-11-20')).toEqual({ desde: '2026-01-01', hasta: '2026-11-20' });
  });

  it('enero: el mes pasado es diciembre del año anterior', () => {
    expect(rangoDePeriodo('mes-pasado', '2027-01-15')).toEqual({ desde: '2026-12-01', hasta: '2026-12-31' });
    expect(rangoDePeriodo('tres-meses', '2027-01-15')).toEqual({ desde: '2026-11-01', hasta: '2027-01-15' });
  });

  it('un periodo o una fecha que no existen dan null', () => {
    expect(rangoDePeriodo('siglo', '2026-11-20')).toBeNull();
    expect(rangoDePeriodo('mes', 'hoy')).toBeNull();
  });
});

describe('la barra de filtros: Categoría, Cuenta y el detalle', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="movimientos-filtros"></div><div id="lista-movimientos"></div>';
    S.gastos = gastos.map(g => ({ ...g }));
    S.ingresosPuntuales = [];
    S.ahorro = { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 };
    S.transferencias = [];
    S.personales = [];
    S.cuentas = [{ id: 'c1', nombre: 'Nequi', saldo: 0 }, { id: 'c2', nombre: 'Bancolombia', saldo: 0 }];
    limpiarFiltrosMovimientos();
  });
  afterEach(() => limpiarFiltrosMovimientos());

  const filtros = () => document.getElementById('movimientos-filtros');

  // MOV.4 (ADR 200): la categoría, la subcategoría y la cuenta se eligen en
  // la hoja de filtros (movimientos-hoja.test.js); aquí, lo que la lista hace.
  it('una subcategoría sola filtra la lista y trae el resumen', () => {
    ponerFiltrosMovimientos({ subcategorias: ['transp-taxi'] });
    renderMovimientosCompletos();
    const filas = document.querySelectorAll('#lista-movimientos .list-item');
    expect(filas).toHaveLength(1);
    expect(filas[0].dataset.id).toBe('g2');
    expect(document.querySelector('#lista-movimientos .movimientos-resumen')).not.toBeNull();
  });

  it('la categoría entera trae todas sus subcategorías', () => {
    ponerFiltrosMovimientos({ categorias: ['Bus, taxi y apps'] });
    renderMovimientosCompletos();
    expect(document.querySelectorAll('#lista-movimientos .list-item').length).toBeGreaterThan(1);
  });

  it('el placeholder dice qué se puede buscar (S1, 1)', () => {
    renderFiltrosMovimientos();
    expect(filtros().querySelector('#movimientos-buscar').placeholder).toBe('Netflix, Nequi, 45.000...');
  });
});

describe('GAS.14c (ADR 189 D3): los pagos de un fijo o una deuda', () => {
  it('la fila lleva su compromiso y el filtro deja solo los suyos', async () => {
    const { movimientosDesdeGastos, filtrarMovimientos: filtrar } = await import('../../modules/dominio/movimientos/logic.js');
    const movs = movimientosDesdeGastos([
      { id: 'p1', categoria: 'Gastos fijos', compromisoId: 'fx', monto: 44_900, fecha: '2026-11-02', cuentaId: 'c1' },
      { id: 'p2', categoria: 'Gastos fijos', compromisoId: 'fy', monto: 90_000, fecha: '2026-11-03', cuentaId: 'c1' },
      { id: 'g1', categoria: 'Mercado', monto: 20_000, fecha: '2026-11-04', cuentaId: 'c1' },
    ]);
    expect(movs.find(m => m.id === 'p1').compromisoId).toBe('fx');
    expect(filtrar(movs, { compromisoId: 'fx' }).map(m => m.id)).toEqual(['p1']);
  });
});
