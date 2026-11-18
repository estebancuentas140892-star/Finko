/**
 * analisis-categoria.test.js - el detalle de una categoría (ADR 176 D8).
 *
 * Su total y su parte, la comparación a la misma altura, el límite del mes,
 * las subcategorías ("Sin detalle" para lo de antes de la v52), los seis
 * meses contra el promedio y los cinco gastos más grandes con su salida.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { datosCategoria, SIN_DETALLE } from '../../modules/dominio/analisis/logic.js';
import {
  abrirCategoriaAnalisis, categoriaAnalisis, cambiarPeriodoAnalisis, cambiarLenteAnalisis,
} from '../../modules/dominio/analisis/telefono.js';
import { renderAnalisis } from '../../modules/dominio/analisis/view.js';
import { S } from '../../modules/core/state.js';

const g = (id, fecha, monto, categoria = 'Restaurantes', extra = {}) => ({ id, fecha, monto, categoria, ...extra });
const HOY = '2026-11-18';
const nombres = { dom: 'Domicilio', sal: 'Salida a comer' };

describe('datosCategoria (ADR 176 D8)', () => {
  const gastos = [
    g('o1', '2026-10-10', 300_000, 'Restaurantes', { subcategoriaId: 'dom' }),
    g('o2', '2026-10-25', 999_000),
    g('a', '2026-06-10', 400_000), g('b', '2026-07-10', 500_000),
    g('n1', '2026-11-02', 186_000, 'Restaurantes', { subcategoriaId: 'dom' }),
    g('n2', '2026-11-14', 128_000, 'Restaurantes', { subcategoriaId: 'sal' }),
    g('n3', '2026-11-16', 34_000),
    g('m', '2026-11-03', 652_000, 'Mercado'),
  ];

  it('total, parte del periodo y la comparación a la misma altura', () => {
    const c = datosCategoria(gastos, 'Restaurantes', 'mes', HOY, HOY, id => nombres[id] ?? '');
    expect(c.total).toBe(348_000);
    expect(c.cuantos).toBe(3);
    expect(c.pctDelPeriodo).toBe(35);
    expect(c.anterior).toMatchObject({ desde: '2026-10-01', hasta: '2026-10-18', total: 300_000, alaAltura: true });
    expect(c.variacion).toEqual({ pct: 16, delta: 48_000, direccion: 'sube' });
  });

  it('las subcategorías con su parte; sin subcategoría, "Sin detalle"', () => {
    const c = datosCategoria(gastos, 'Restaurantes', 'mes', HOY, HOY, id => nombres[id] ?? '');
    expect(c.subcategorias.map(s => [s.nombre, s.total, s.cuantos])).toEqual([
      ['Domicilio', 186_000, 1], ['Salida a comer', 128_000, 1], [SIN_DETALLE, 34_000, 1],
    ]);
    expect(c.subcategorias.reduce((s, x) => s + x.pct, 0)).toBe(100);
  });

  it('seis meses y el promedio de los cinco anteriores desde el primer gasto', () => {
    const c = datosCategoria(gastos, 'Restaurantes', 'mes', HOY, HOY);
    expect(c.meses.map(x => x.mes)).toEqual([6, 7, 8, 9, 10, 11]);
    expect(c.meses.map(x => x.total)).toEqual([400_000, 500_000, 0, 0, 1_299_000, 348_000]);
    expect(c.mesesPromedio).toBe(5);
    expect(c.promedioMeses).toBe(439_800);
    expect(c.meses[5].enCurso).toBe(true);
  });

  it('los cinco más grandes, de mayor a menor', () => {
    const c = datosCategoria(gastos, 'Restaurantes', 'mes', HOY, HOY);
    expect(c.mayores.map(x => x.id)).toEqual(['n1', 'n2', 'n3']);
  });
});

describe('el detalle en el teléfono (ADR 176 D8)', () => {
  const matchMediaReal = window.matchMedia;
  const hoy = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  beforeEach(() => {
    window.matchMedia = q => ({ matches: /max-width/.test(q), addEventListener() {} });
    document.body.innerHTML = '<div id="panel-analisis"></div>';
    S.config = {};
    S.cuentas = [{ id: 'c1', nombre: 'Nequi', saldo: 1_000_000, activa: true }];
    S.compromisos = []; S.metas = []; S.apartados = []; S.inversiones = []; S.personales = [];
    S.ingresos = []; S.ingresosPuntuales = []; S.categoriasPersonalizadas = [];
    S.presupuestos = [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 450_000, activo: true }];
    S.ahorro = { fondoEmergencia: { activo: false }, aportes: [] };
    S.gastos = [g('a', hoy(), 300_000, 'Restaurantes', { cuentaId: 'c1' }), g('b', hoy(), 100_000, 'Mercado', { cuentaId: 'c1' })];
  });

  afterEach(() => {
    window.matchMedia = matchMediaReal;
    abrirCategoriaAnalisis(null);
    cambiarPeriodoAnalisis('mes');
    cambiarLenteAnalisis('gastos');
  });

  it('cada fila de En qué gastas abre su categoría', () => {
    renderAnalisis();
    const filas = [...document.querySelectorAll('.ana-parte--abre[data-action="analisis-categoria"]')];
    expect(filas.map(f => f.dataset.categoria)).toEqual(['Restaurantes', 'Mercado']);
  });

  it('el detalle: volver, el total, el límite, los gastos más grandes y su salida', () => {
    abrirCategoriaAnalisis('Restaurantes');
    expect(categoriaAnalisis()).toBe('Restaurantes');
    renderAnalisis();
    expect(document.querySelector('.ana-volver').textContent.trim()).toBe('Análisis');
    expect(document.querySelector('#ana-cat-titulo').textContent).toBe('Restaurantes');
    expect(document.querySelector('.ana-cat__total').textContent).toBe('$300.000');
    expect(document.querySelector('.ana-limite__cifras').textContent).toBe('$300.000 de $450.000');
    expect(document.querySelector('.ana-limite__texto').textContent).toMatch(/^Te quedan \$150\.000/);
    const ver = document.querySelector('[data-action="analisis-ver-movimientos"][data-categoria="Restaurantes"]');
    expect(ver.textContent.trim()).toBe('Ver el gasto en Gastos');
    expect(document.querySelector('.ana-periodos')).toBeNull();
    expect(document.querySelector('.ana-lentes')).toBeNull();
  });

  it('volver deja el periodo como estaba', () => {
    cambiarPeriodoAnalisis('anio');
    abrirCategoriaAnalisis('Restaurantes');
    abrirCategoriaAnalisis(null);
    renderAnalisis();
    expect(document.querySelector('.ana-periodos__btn.active').dataset.periodo).toBe('anio');
  });
});
