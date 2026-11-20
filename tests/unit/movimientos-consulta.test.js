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
  setFiltroCategoria, setFiltroSubcategoria, alternarPanelMovimientos,
} from '../../modules/dominio/movimientos/view.js';
import { S } from '../../modules/core/state.js';

const gasto = (o = {}) => ({ id: 'g', monto: 10_000, categoria: 'Mercado', fecha: '2026-11-10', cuentaId: 'c1', ...o });

const gastos = [
  gasto({ id: 'g1', categoria: 'Restaurantes', nota: 'Almuerzo de trabajo' }),
  gasto({ id: 'g2', categoria: 'Transporte', subcategoriaId: 'transp-taxi', cuentaId: 'c2' }),
  gasto({ id: 'g3', categoria: 'Transporte', subcategoriaId: 'transp-bus' }),
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
    const r = filtrarMovimientos(movs, { categoria: 'Transporte', subcategoriaId: 'transp-taxi' });
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
    expect(o.categorias[0]).toBe('Transporte');
  });

  it('las subcategorías que hay, en el orden del catálogo', () => {
    expect(o.subcategorias.Transporte.map(s => s.id)).toEqual(['transp-bus', 'transp-taxi']);
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

  it('ofrece los chips "Categoría" y "Cuenta" con sus paneles cerrados', () => {
    renderFiltrosMovimientos();
    expect(filtros().querySelector('[data-panel="categoria"]')).not.toBeNull();
    expect(filtros().querySelector('[data-panel="cuenta"]')).not.toBeNull();
    expect(filtros().querySelector('#movimientos-panel-categoria').hidden).toBe(true);
  });

  it('el panel abierto lista las categorías del historial', () => {
    alternarPanelMovimientos('categoria');
    renderFiltrosMovimientos();
    const panel = filtros().querySelector('#movimientos-panel-categoria');
    expect(panel.hidden).toBe(false);
    const nombres = [...panel.querySelectorAll('[data-action="movimientos-elegir-categoria"]')].map(b => b.dataset.categoria);
    expect(nombres).toContain('Transporte');
    expect(nombres).not.toContain('Deudas');
  });

  it('con una categoría puesta, la pastilla y su detalle; el detalle filtra la lista', () => {
    setFiltroCategoria('Transporte');
    renderFiltrosMovimientos();
    const subs = [...filtros().querySelectorAll('[data-action="movimientos-elegir-sub"]')].map(b => b.textContent.trim());
    expect(subs).toEqual(['Todo', 'Transporte público', 'Taxi']);
    setFiltroSubcategoria('transp-taxi');
    renderMovimientosCompletos();
    const filas = document.querySelectorAll('#lista-movimientos .list-item');
    expect(filas).toHaveLength(1);
    expect(filas[0].dataset.id).toBe('g2');
    expect(document.querySelector('#lista-movimientos .movimientos-resumen')).not.toBeNull();
  });

  it('cambiar de categoría suelta la subcategoría', () => {
    setFiltroCategoria('Transporte');
    setFiltroSubcategoria('transp-taxi');
    setFiltroCategoria('Café');
    renderMovimientosCompletos();
    expect(document.querySelectorAll('#lista-movimientos .list-item')).toHaveLength(1);
  });

  it('el placeholder dice dónde busca', () => {
    renderFiltrosMovimientos();
    expect(filtros().querySelector('#movimientos-buscar').placeholder).toBe('Busca por nombre, nota o categoría');
  });
});
