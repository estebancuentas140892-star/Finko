/**
 * analisis-hallazgos.test.js - Lo que Finko encontró (ADR 176 D6 y D7).
 *
 * Hasta tres hallazgos por periodo, ordenados por dinero (el día de la
 * semana, que no suma, al final); a mitad de periodo solo lo que subió; sin
 * hallazgos no hay bloque; "Ver cuáles" abre la hoja de las compras pequeñas.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { datosPeriodo, hallazgosDelPeriodo, hormigaEnRango } from '../../modules/dominio/analisis/logic.js';
import { fraseHallazgo, cambiarPeriodoAnalisis, cambiarLenteAnalisis, htmlHojaHormiga } from '../../modules/dominio/analisis/telefono.js';
import { renderAnalisis } from '../../modules/dominio/analisis/view.js';
import { S } from '../../modules/core/state.js';

const m = (n) => `$${n}`;
const g = (id, fecha, monto, categoria = 'Mercado', extra = {}) => ({ id, fecha, monto, categoria, ...extra });
const HOY = '2026-11-18';

describe('hallazgosDelPeriodo (ADR 176 D6)', () => {
  it('el día no busca nada', () => {
    const p = datosPeriodo([g('a', HOY, 100)], 'dia', HOY, HOY);
    expect(hallazgosDelPeriodo(p, [g('a', HOY, 100)], HOY)).toEqual([]);
  });

  it('la semana: el día que se llevó al menos el 40 %', () => {
    const gastos = [g('a', '2026-11-16', 98_000), g('b', '2026-11-16', 20_000, 'Café'), g('c', '2026-11-17', 40_000), g('d', '2026-11-18', 40_000)];
    const p = datosPeriodo(gastos, 'semana', HOY, HOY);
    const [h] = hallazgosDelPeriodo(p, gastos, HOY);
    expect(h).toMatchObject({ tipo: 'dia-pesado', fecha: '2026-11-16', pct: 60, categoria: 'Mercado', montoCategoria: 98_000 });
    expect(fraseHallazgo(h, p, HOY, m).frase).toBe('El lunes se llevó el <strong>60% de tu semana</strong>, sobre todo en Mercado ($98000).');
  });

  it('a mitad de mes solo anuncia lo que subió; al cerrar, también lo que bajó', () => {
    const gastos = [
      g('o1', '2026-10-05', 100_000, 'Restaurantes'), g('o2', '2026-10-06', 200_000, 'Mercado'),
      g('n1', '2026-11-05', 150_000, 'Restaurantes'), g('n2', '2026-11-06', 50_000, 'Mercado'),
    ];
    const enCurso = hallazgosDelPeriodo(datosPeriodo(gastos, 'mes', HOY, HOY), gastos, HOY);
    expect(enCurso.filter(h => h.tipo === 'cambio')).toEqual([
      { tipo: 'cambio', categoria: 'Restaurantes', pct: 50, delta: 50_000, alaAltura: true, dinero: 50_000 },
    ]);
    const cerrado = hallazgosDelPeriodo(datosPeriodo(gastos, 'mes', '2026-11-01', '2026-12-10'), gastos, '2026-12-10');
    expect(cerrado.find(h => h.tipo === 'cambio')).toMatchObject({ categoria: 'Mercado', delta: -150_000, alaAltura: false });
  });

  it('un cambio bajo el margen de ruido no se anuncia', () => {
    const gastos = [g('o', '2026-10-05', 100_000, 'Restaurantes'), g('n', '2026-11-05', 105_000, 'Restaurantes')];
    expect(hallazgosDelPeriodo(datosPeriodo(gastos, 'mes', HOY, HOY), gastos, HOY).some(h => h.tipo === 'cambio')).toBe(false);
  });

  it('la hormiga del mes: tres compras pequeñas de gusto o más', () => {
    const gustos = [1, 2, 3].map(i => g(`h${i}`, `2026-11-0${i}`, 8_000, 'Antojos'));
    const p = datosPeriodo(gustos, 'mes', HOY, HOY);
    const h = hallazgosDelPeriodo(p, gustos, HOY, { tope: 20_000 }).find(x => x.tipo === 'hormiga');
    expect(h).toMatchObject({ cuantos: 3, total: 24_000 });
    expect(fraseHallazgo(h, p, HOY, m).enlace.texto).toBe('Ver cuáles');
    expect(hormigaEnRango(gustos, '2026-11-01', '2026-11-02', { tope: 20_000 }).cuantos).toBe(2);
  });

  it('el año: el mes cerrado más alto contra el promedio, con su salida', () => {
    const gastos = [g('a', '2026-01-10', 100), g('b', '2026-02-10', 100), g('c', '2026-03-10', 400), g('d', '2026-11-10', 50)];
    const p = datosPeriodo(gastos, 'anio', HOY, HOY);
    const h = hallazgosDelPeriodo(p, gastos, HOY).find(x => x.tipo === 'mes-alto');
    expect(h).toMatchObject({ mes: 3, total: 400, pct: 100 });
    const x = fraseHallazgo(h, p, HOY, m);
    expect(x.frase).toBe('Marzo fue tu mes con más gasto: <strong>$400</strong>, 100% sobre tu promedio.');
    expect(x.enlace.atributos).toContain('data-ancla="2026-03-01"');
  });

  it('nunca más de tres, ordenados por dinero', () => {
    const gastos = [
      ...[1, 2, 3, 4].map(i => g(`h${i}`, `2026-11-0${i}`, 9_000, 'Antojos')),
      g('o', '2026-10-05', 100_000, 'Restaurantes'), g('n', '2026-11-05', 300_000, 'Restaurantes'),
    ];
    const lista = hallazgosDelPeriodo(datosPeriodo(gastos, 'mes', HOY, HOY), gastos, HOY, { tope: 20_000 });
    expect(lista.length).toBeLessThanOrEqual(3);
    expect(lista.map(h => h.dinero)).toEqual([...lista.map(h => h.dinero)].sort((a, b) => b - a));
    expect(lista[0].tipo).toBe('cambio');
  });
});

describe('Lo que Finko encontró en el teléfono (ADR 176 D6 y D7)', () => {
  const matchMediaReal = window.matchMedia;
  const hoy = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  beforeEach(() => {
    window.matchMedia = q => ({ matches: /max-width/.test(q), addEventListener() {} });
    document.body.innerHTML = '<div id="panel-analisis"></div>';
    S.config = { hormiga: { tope: 20_000 } };
    S.cuentas = [{ id: 'c1', nombre: 'Nequi', saldo: 1_000_000, activa: true }];
    S.compromisos = []; S.metas = []; S.apartados = []; S.inversiones = []; S.personales = [];
    S.ingresos = []; S.ingresosPuntuales = []; S.presupuestos = []; S.categoriasPersonalizadas = [];
    S.ahorro = { fondoEmergencia: { activo: false }, aportes: [] };
  });

  afterEach(() => {
    window.matchMedia = matchMediaReal;
    cambiarPeriodoAnalisis('mes');
    cambiarLenteAnalisis('gastos');
  });

  it('sin hallazgos el bloque no aparece, y el detalle de escritorio ya no es fila', () => {
    S.gastos = [g('a', hoy(), 100_000)];
    renderAnalisis();
    expect(document.querySelector('.ana-encontro')).toBeNull();
    expect(document.querySelector('.ana-fila[data-hoja="detalle"]')).toBeNull();
  });

  it('con hallazgos: Tino con lupa y la hoja de las compras pequeñas', () => {
    const d = hoy();
    S.gastos = [1, 2, 3].map(i => g(`h${i}`, d, 8_000, 'Antojos', { cuentaId: 'c1' }));
    renderAnalisis();
    expect(document.querySelector('.ana-encontro .tino-sol').dataset.pose).toBe('con-lupa');
    expect(document.querySelector('.ana-hallazgo [data-hoja="hormiga"]')).not.toBeNull();
    document.body.innerHTML = `<div>${htmlHojaHormiga(d)}</div>`;
    expect(document.getElementById('detalle-fila-titulo').textContent).toBe('Compras pequeñas de gusto');
    expect(document.querySelector('.ana-parte__nombre').textContent).toBe('Antojos');
  });
});
