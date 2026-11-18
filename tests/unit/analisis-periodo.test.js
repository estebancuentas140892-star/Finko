/**
 * analisis-periodo.test.js - los periodos de Tus gastos (ADR 176 D2 a D5).
 *
 * Rangos de día, semana (lunes a domingo), mes y año; moverse entre ellos;
 * comparar a la misma altura (un 31 contra un mes de 30, febrero); las
 * categorías con su parte; y lo que cada periodo pinta en el teléfono.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  rangoPeriodo, moverPeriodo, periodoAnteriorALaAltura, variacionContra,
  categoriasDelPeriodo, datosPeriodo,
} from '../../modules/dominio/analisis/logic.js';
import {
  nombrePeriodo, montoCorto, comparacionPeriodo, parteEnPalabras, filasCategorias,
  cambiarPeriodoAnalisis, periodoAnalisis, moverPeriodoAnalisis, htmlPastillaPeriodo, cambiarLenteAnalisis,
} from '../../modules/dominio/analisis/telefono.js';
import { renderAnalisis } from '../../modules/dominio/analisis/view.js';
import { S } from '../../modules/core/state.js';

const m = (n) => `$${n}`;
const g = (id, fecha, monto, categoria = 'Mercado', extra = {}) => ({ id, fecha, monto, categoria, ...extra });

describe('rangoPeriodo y moverPeriodo (ADR 176 D2)', () => {
  it('la semana va de lunes a domingo, también si cruza el mes', () => {
    expect(rangoPeriodo('semana', '2026-11-18')).toEqual({ tipo: 'semana', desde: '2026-11-16', hasta: '2026-11-22' });
    expect(rangoPeriodo('semana', '2026-11-22')).toEqual({ tipo: 'semana', desde: '2026-11-16', hasta: '2026-11-22' });
    expect(rangoPeriodo('semana', '2026-12-01')).toEqual({ tipo: 'semana', desde: '2026-11-30', hasta: '2026-12-06' });
  });

  it('el mes y el año de punta a punta; el día es él mismo', () => {
    expect(rangoPeriodo('mes', '2026-02-10')).toEqual({ tipo: 'mes', desde: '2026-02-01', hasta: '2026-02-28' });
    expect(rangoPeriodo('anio', '2026-07-04')).toEqual({ tipo: 'anio', desde: '2026-01-01', hasta: '2026-12-31' });
    expect(rangoPeriodo('dia', '2026-11-08')).toEqual({ tipo: 'dia', desde: '2026-11-08', hasta: '2026-11-08' });
  });

  it('moverse da el inicio del periodo vecino', () => {
    expect(moverPeriodo('dia', '2026-11-01', -1)).toBe('2026-10-31');
    expect(moverPeriodo('semana', '2026-11-18', -1)).toBe('2026-11-09');
    expect(moverPeriodo('mes', '2026-01-31', -1)).toBe('2025-12-01');
    expect(moverPeriodo('mes', '2026-11-18', 1)).toBe('2026-12-01');
    expect(moverPeriodo('anio', '2026-11-18', -1)).toBe('2025-01-01');
  });
});

describe('periodoAnteriorALaAltura (ADR 176 D4)', () => {
  it('el mes en curso contra el anterior hasta el mismo día', () => {
    expect(periodoAnteriorALaAltura(rangoPeriodo('mes', '2026-11-18'), '2026-11-18'))
      .toEqual({ desde: '2026-10-01', hasta: '2026-10-18', alaAltura: true });
  });

  it('un 31 contra un mes de 30 se queda en el último día', () => {
    expect(periodoAnteriorALaAltura(rangoPeriodo('mes', '2026-12-31'), '2026-12-31').hasta).toBe('2026-11-30');
    expect(periodoAnteriorALaAltura(rangoPeriodo('mes', '2026-03-30'), '2026-03-30').hasta).toBe('2026-02-28');
  });

  it('la semana en curso contra los mismos días de la anterior', () => {
    expect(periodoAnteriorALaAltura(rangoPeriodo('semana', '2026-11-18'), '2026-11-18'))
      .toEqual({ desde: '2026-11-09', hasta: '2026-11-11', alaAltura: true });
  });

  it('un periodo cerrado se compara completo', () => {
    expect(periodoAnteriorALaAltura(rangoPeriodo('mes', '2026-10-05'), '2026-11-18'))
      .toEqual({ desde: '2026-09-01', hasta: '2026-09-30', alaAltura: false });
  });
});

describe('variacionContra y categoriasDelPeriodo', () => {
  it('sin base no hay comparación; con base, porcentaje y dirección', () => {
    expect(variacionContra(100, 0)).toBeNull();
    expect(variacionContra(88, 100)).toEqual({ pct: 12, delta: -12, direccion: 'baja' });
    expect(variacionContra(116, 100)).toEqual({ pct: 16, delta: 16, direccion: 'sube' });
    expect(variacionContra(100, 100).direccion).toBe('igual');
  });

  it('agrupa por categoría, de mayor a menor, con partes que suman 100', () => {
    const cats = categoriasDelPeriodo([g('a', '2026-11-01', 100, 'Café'), g('b', '2026-11-02', 200), g('c', '2026-11-03', 100, 'Café'), g('d', '2026-11-03', 1)]);
    expect(cats.map(c => [c.categoria, c.total, c.cuantos])).toEqual([['Mercado', 201, 2], ['Café', 200, 2]]);
    expect(cats.reduce((s, c) => s + c.pct, 0)).toBe(100);
  });
});

describe('datosPeriodo (ADR 176 D3 y D4)', () => {
  const gastos = [
    g('o1', '2026-10-05', 100_000), g('o2', '2026-10-18', 50_000), g('o3', '2026-10-25', 300_000),
    g('n1', '2026-11-02', 60_000, 'Café'), g('n2', '2026-11-18', 30_000),
    // Un abono a una deuda no es consumo (ADR 139 D2).
    g('x', '2026-11-10', 999_000, 'Deudas', { compromisoId: 'd1' }),
  ];

  it('el mes en curso: total, ritmo y la comparación a la misma altura', () => {
    const p = datosPeriodo(gastos, 'mes', '2026-11-18', '2026-11-18');
    expect(p.total).toBe(90_000);
    expect(p.anterior).toMatchObject({ desde: '2026-10-01', hasta: '2026-10-18', total: 150_000, alaAltura: true });
    expect(p.variacion).toEqual({ pct: 40, delta: -60_000, direccion: 'baja' });
    expect(p.ritmo).toHaveLength(30);
    expect(p.ritmo[1]).toBe(60_000);
    expect(p.ritmo[17]).toBe(90_000);
    expect(p.ritmo[18]).toBeNull();
    expect(p.ritmoAnterior).toHaveLength(31);
    expect(p.ritmoAnterior[30]).toBe(450_000);
    expect(p.primerGasto).toBe('2026-10-05');
  });

  it('el día: su total contra el promedio diario del mes', () => {
    const p = datosPeriodo(gastos, 'dia', '2026-11-18', '2026-11-18');
    expect(p.total).toBe(30_000);
    expect(p.diasPromedio).toBe(18);
    expect(p.promedioDiario).toBe(5_000);
    expect(p.variacion.direccion).toBe('sube');
  });

  it('la semana: siete días con los que no llegan', () => {
    const p = datosPeriodo(gastos, 'semana', '2026-11-18', '2026-11-18');
    expect(p.dias.map(d => d.fecha)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']);
    expect(p.dias.map(d => d.futuro)).toEqual([false, false, false, true, true, true, true]);
    expect(p.dias[2].total).toBe(30_000);
  });

  it('el año: el promedio sale de los meses cerrados con gasto', () => {
    const p = datosPeriodo(gastos, 'anio', '2026-11-18', '2026-11-18');
    expect(p.total).toBe(540_000);
    expect(p.meses[9].total).toBe(450_000);
    expect(p.meses[10]).toMatchObject({ enCurso: true, total: 90_000 });
    expect(p.meses[11].futuro).toBe(true);
    expect(p.promedioMes).toBe(450_000);
    expect(p.mesesPromedio).toBe(1);
  });
});

describe('las frases del periodo (ADR 176 D2 a D5)', () => {
  it('el nombre de la pastilla', () => {
    const hoy = '2026-11-18';
    expect(nombrePeriodo(rangoPeriodo('dia', hoy), hoy)).toBe('Hoy');
    expect(nombrePeriodo(rangoPeriodo('dia', '2026-11-08'), hoy)).toBe('Dom 8 nov');
    expect(nombrePeriodo(rangoPeriodo('semana', hoy), hoy)).toBe('16 al 22 nov');
    expect(nombrePeriodo(rangoPeriodo('semana', '2026-12-01'), hoy)).toBe('30 nov al 6 dic');
    expect(nombrePeriodo(rangoPeriodo('mes', hoy), hoy)).toBe('Noviembre');
    expect(nombrePeriodo(rangoPeriodo('mes', '2025-10-03'), hoy)).toBe('Octubre 2025');
    expect(nombrePeriodo(rangoPeriodo('anio', hoy), hoy)).toBe('2026');
  });

  it('montos cortos para rotular barras', () => {
    expect(montoCorto(57_000)).toBe('$57 mil');
    expect(montoCorto(2_340_000)).toBe('$2,34 M');
    expect(montoCorto(800)).toBe('$800');
  });

  it('la comparación: a esta altura en curso, verde solo al bajar', () => {
    const hoy = '2026-11-18';
    const gastos = [g('o', '2026-10-10', 100), g('n', '2026-11-10', 88)];
    const c = comparacionPeriodo(datosPeriodo(gastos, 'mes', hoy, hoy), hoy, m);
    expect(c).toEqual({ texto: '12% menos que octubre a esta altura', baja: true });
    const cerrado = comparacionPeriodo(datosPeriodo([g('s', '2026-09-10', 100), g('o', '2026-10-10', 116)], 'mes', '2026-10-01', hoy), hoy, m);
    expect(cerrado).toEqual({ texto: '16% más que septiembre', baja: false });
    const dia = comparacionPeriodo(datosPeriodo([g('a', '2026-11-01', 180), g('b', hoy, 0.5)], 'dia', hoy, hoy), hoy, m);
    expect(dia.baja).toBe(true);
    expect(dia.texto).toMatch(/menos que un día normal$/);
  });

  it('una parte del día en palabras', () => {
    expect(parteEnPalabras(46)).toBe('casi la mitad');
    expect(parteEnPalabras(50)).toBe('la mitad');
    expect(parteEnPalabras(70)).toBe('más de la mitad');
    expect(parteEnPalabras(33)).toBe('un tercio');
    expect(parteEnPalabras(12)).toBe('el 12%');
  });

  it('cinco filas y "Otras" desde siete categorías, con sus nombres', () => {
    const cats = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c, i) => ({ categoria: c, total: 70 - i, cuantos: 1, pct: 14 }));
    const filas = filasCategorias(cats);
    expect(filas).toHaveLength(6);
    expect(filas[5]).toMatchObject({ categoria: 'Otras 2 categorías', otras: ['F', 'G'], total: 129, pct: 28 });
    expect(filasCategorias(cats.slice(0, 6))).toHaveLength(6);
  });
});

describe('el periodo visible (ADR 176 D2)', () => {
  afterEach(() => cambiarPeriodoAnalisis('mes'));

  it('entra por el mes de hoy; cambiar de tipo vuelve a hoy', () => {
    expect(periodoAnalisis('2026-11-18')).toEqual({ tipo: 'mes', ancla: '2026-11-18' });
    cambiarPeriodoAnalisis('semana');
    expect(periodoAnalisis('2026-11-18')).toEqual({ tipo: 'semana', ancla: '2026-11-18' });
    cambiarPeriodoAnalisis('otro');
    expect(periodoAnalisis('2026-11-18').tipo).toBe('mes');
  });

  it('no pasa del periodo en curso ni antes del primer gasto', () => {
    moverPeriodoAnalisis(1, '2026-11-18', '2026-10-05');
    expect(periodoAnalisis('2026-11-18').ancla).toBe('2026-11-18');
    moverPeriodoAnalisis(-1, '2026-11-18', '2026-10-05');
    expect(periodoAnalisis('2026-11-18').ancla).toBe('2026-10-01');
    moverPeriodoAnalisis(-1, '2026-11-18', '2026-10-05');
    expect(periodoAnalisis('2026-11-18').ancla).toBe('2026-10-01');
    moverPeriodoAnalisis(1, '2026-11-18', '2026-10-05');
    expect(periodoAnalisis('2026-11-18').ancla).toBe('2026-11-18');
  });

  it('la pastilla apaga atrás en el primer periodo y adelante en el de hoy', () => {
    document.body.innerHTML = `<div>${htmlPastillaPeriodo('2026-11-18', '2026-11-02')}</div>`;
    const [atras, adelante] = document.querySelectorAll('button');
    expect(atras.disabled).toBe(true);
    expect(adelante.disabled).toBe(true);
    expect(document.querySelector('.ana-pastilla-periodo__label').textContent).toBe('Noviembre');
  });
});

describe('Tus gastos en el teléfono (ADR 176 D3, D5 y D7)', () => {
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
    S.ingresos = []; S.ingresosPuntuales = []; S.presupuestos = [];
    S.ahorro = { fondoEmergencia: { activo: false }, aportes: [] };
    S.gastos = [g('g1', hoy(), 300_000, 'Mercado', { cuentaId: 'c1' }), g('g2', hoy(), 100_000, 'Ropa', { cuentaId: 'c1' })];
  });

  afterEach(() => {
    window.matchMedia = matchMediaReal;
    cambiarPeriodoAnalisis('mes');
    cambiarLenteAnalisis('gastos');
  });

  it('el mes: tarjeta de identidad, ritmo y la barra mide la parte del total', () => {
    renderAnalisis();
    expect(document.querySelectorAll('.ana-periodos__btn')).toHaveLength(4);
    expect(document.querySelector('.ana-periodos__btn.active').dataset.periodo).toBe('mes');
    expect(document.querySelector('.hero-analisis .ana-hero__monto').textContent).toBe('$400.000');
    expect(document.querySelector('.ana-ritmo__actual')).not.toBeNull();
    expect([...document.querySelectorAll('.ana-barra--gastos > span')].map(s => s.style.width)).toEqual(['75%', '25%']);
    expect(document.querySelector('.ana-frase').textContent).toMatch(/^Mercado es tu mayor gasto: 75% de /);
  });

  it('el día: cada gasto de mayor a menor y la salida a Gastos', () => {
    cambiarPeriodoAnalisis('dia');
    renderAnalisis();
    expect(document.querySelector('#ana-que-titulo').textContent).toBe('En qué gastaste hoy');
    expect([...document.querySelectorAll('.ana-parte--gasto .ana-parte__nombre')].map(n => n.textContent)).toEqual(['Mercado', 'Ropa']);
    expect(document.querySelector('.ana-parte--gasto .ana-parte__sub').textContent).toBe('Nequi');
    const ver = document.querySelector('[data-action="analisis-ver-movimientos"]');
    expect(ver.dataset.desde).toBe(hoy());
    expect(document.querySelector('.ana-frase').textContent).toBe('Mercado suma $300.000: más de la mitad de tu día.');
  });

  it('un día sin gastos: Tino tranquilo y registrar con la fecha de ese día', () => {
    S.gastos = [g('g1', '2020-01-01', 1000)];
    cambiarPeriodoAnalisis('dia');
    renderAnalisis();
    expect(document.querySelector('.ana-vacio .tino-sol').dataset.pose).toBe('tranquilo');
    expect(document.querySelector('.ana-vacio__titulo').textContent).toBe('Hoy todavía no registras gastos');
    expect(document.querySelector('[data-action="nuevo-gasto"][data-fecha]').dataset.fecha).toBe(hoy());
    expect(document.querySelector('.hero-analisis')).toBeNull();
  });

  it('la semana y el año pintan sus barras', () => {
    cambiarPeriodoAnalisis('semana');
    renderAnalisis();
    expect(document.querySelectorAll('.ana-barras--semana .ana-barras__col')).toHaveLength(7);
    cambiarPeriodoAnalisis('anio');
    renderAnalisis();
    expect(document.querySelectorAll('.ana-barras--anio .ana-barras__col')).toHaveLength(12);
    expect(document.querySelector('.ana-pastilla').textContent).toMatch(/^Promedio por mes: /);
  });
});
