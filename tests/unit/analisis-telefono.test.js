/**
 * analisis-telefono.test.js - Análisis en el teléfono (ADR 134 D7, tanda 4).
 *
 * Las frases que cambian con los datos (lo que frena la salud, la comparación
 * del mes, el aviso de la renta), las filas de "Más análisis" y sus hojas, y
 * que bajo 1024px la sección se pinta en filas.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loQueFrena, fraseDelMes, avisoRenta, htmlMasAnalisis, subRenta, SUB_DETALLE,
} from '../../modules/dominio/analisis/telefono.js';
import { renderAnalisis, htmlHojaAnalisis } from '../../modules/dominio/analisis/view.js';
import { S } from '../../modules/core/state.js';

const m = (n) => `$${n}`;
const FACTORES = { deuda: 80, liquidez: 90, control: 70, ahorro: 50 };

function fechaDelMes(dia) {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(Math.min(dia, d.getDate())).padStart(2, '0')}`;
}

describe('loQueFrena (ADR 134 D7)', () => {
  beforeEach(() => {
    S.ahorro = { fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 1_000_000 }, aportes: [] };
    S.compromisos = [{ id: 'f1', tipo: 'fijo', monto: 1_000_000, frecuencia: 'Mensual', activo: true }];
  });

  it('con la banda buena dice lo que puede mejorar, no lo que frena', () => {
    const r = loQueFrena('buena', FACTORES);
    expect(r.frase).toBe('Tienes una base saludable. Lo que más puede mejorar es tu fondo de emergencia.');
    expect(r.salida).toEqual({ href: '#fondo', texto: 'Ir a tu fondo de emergencia' });
  });

  it('con la banda ajustada dice cuánto cubre el fondo frente a lo propuesto', () => {
    expect(loQueFrena('ajustada', FACTORES).frase)
      .toBe('Lo que más la frena es tu fondo de emergencia: cubre 1 mes de los 3 meses que te propusiste.');
  });

  it('cuando frena el control habla de los gastos en plural, con su salida', () => {
    const r = loQueFrena('critica', { deuda: 80, liquidez: 90, control: 10, ahorro: 50 });
    expect(r.frase).toBe('Lo que más la frena son los gastos que pasan sus límites.');
    expect(r.salida.href).toBe('#presupuesto');
  });

  it('con la banda excelente no hay salida', () => {
    expect(loQueFrena('excelente', FACTORES).salida).toBeNull();
  });
});

describe('fraseDelMes (ADR 134 D7)', () => {
  it('compara con el mes anterior en porcentaje y monto', () => {
    const serie = [{ anio: 2026, mes: 10, total: 270_000 }, { anio: 2026, mes: 11, total: 897_000 }];
    expect(fraseDelMes(serie, m)).toBe('Este mes llevas <strong class="ana-meses__monto">$897000</strong>, 232% más que octubre ($270000).');
  });

  it('si el mes anterior no tuvo gastos, dice que no hay con qué comparar', () => {
    const serie = [{ anio: 2026, mes: 10, total: 0 }, { anio: 2026, mes: 11, total: 500 }];
    expect(fraseDelMes(serie, m)).toBe('Este mes llevas <strong class="ana-meses__monto">$500</strong>. En octubre no registraste gastos, así que todavía no hay con qué comparar.');
  });

  it('sin mes anterior en la serie, solo lo que llevas', () => {
    expect(fraseDelMes([{ anio: 2026, mes: 11, total: 500 }], m)).toBe('Este mes llevas <strong class="ana-meses__monto">$500</strong>.');
  });
});

describe('avisoRenta y la fila de la renta (ADR 134 D7)', () => {
  it('pasar un tope pesa más que estar cerca; sin alerta, nada', () => {
    expect(avisoRenta([{ estado: 'cerca' }, { estado: 'supera' }])).toEqual({ texto: 'Pasas un tope para declarar', nivel: 'peligro' });
    expect(avisoRenta([{ estado: 'cerca' }])).toEqual({ texto: 'Estás cerca de un tope para declarar', nivel: 'atencion' });
    expect(avisoRenta([{ estado: 'dentro' }])).toBeNull();
  });

  it('las dos filas abren su hoja; sin detalle queda solo la renta', () => {
    document.body.innerHTML = htmlMasAnalisis({ conDetalle: true, anio: 2026, criterios: [{ estado: 'cerca' }, {}, {}, {}, {}] });
    const filas = [...document.querySelectorAll('.ana-fila[data-action="analisis-hoja"]')];
    expect(filas.map(f => f.dataset.hoja)).toEqual(['detalle', 'renta']);
    expect(filas[0].textContent).toContain(SUB_DETALLE);
    expect(filas[1].textContent).toContain('Estado de tu renta (2026)');
    expect(filas[1].textContent).toContain('5 criterios de la DIAN y sus topes');
    expect(filas[1].querySelector('.ana-fila__aviso--atencion').textContent).toBe('Estás cerca de un tope para declarar');

    document.body.innerHTML = htmlMasAnalisis({ conDetalle: false, anio: 2026, criterios: [{}] });
    expect([...document.querySelectorAll('.ana-fila')].map(f => f.dataset.hoja)).toEqual(['renta']);
    expect(subRenta(1)).toBe('1 criterio de la DIAN y sus topes');
  });
});

describe('Análisis bajo 1024px (ADR 134 D7)', () => {
  const matchMediaReal = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = q => ({ matches: /max-width/.test(q), addEventListener() {} });
    document.body.innerHTML = '<div id="panel-analisis"></div>';
    S.config = {};
    S.cuentas = [{ id: 'c1', nombre: 'Nequi', saldo: 1_000_000, activa: true }];
    S.compromisos = []; S.metas = []; S.apartados = []; S.inversiones = []; S.personales = [];
    S.ingresos = []; S.ingresosPuntuales = [];
    S.ahorro = { fondoEmergencia: { activo: false }, aportes: [] };
    S.gastos = [
      { id: 'g1', monto: 300_000, categoria: 'Mercado', fecha: fechaDelMes(1) },
      { id: 'g2', monto: 150_000, categoria: 'Ropa', fecha: fechaDelMes(1) },
    ];
  });

  afterEach(() => { window.matchMedia = matchMediaReal; });

  it('pinta las filas y no los grupos de escritorio', () => {
    renderAnalisis();
    const panel = document.getElementById('panel-analisis');
    expect(panel.querySelector('.ana-salud')).not.toBeNull();
    expect(panel.querySelector('.ana-mas')).not.toBeNull();
    expect(panel.querySelector('.analisis-grupo')).toBeNull();
    expect(panel.querySelector('.score-hero')).toBeNull();
  });

  it('la barra de cada categoría se mide contra la mayor', () => {
    renderAnalisis();
    const anchos = [...document.querySelectorAll('.ana-barra--gastos > span')].map(s => s.style.width);
    expect(anchos).toEqual(['100%', '50%']);
  });

  it('la banda de la salud lleva su ícono', () => {
    renderAnalisis();
    expect(document.querySelector('.ana-salud__banda use')).not.toBeNull();
  });

  it('las hojas traen el mismo cuerpo que los grupos de escritorio', () => {
    document.body.innerHTML = `<div>${htmlHojaAnalisis('renta')}</div>`;
    expect(document.getElementById('detalle-fila-titulo').textContent).toMatch(/^Estado de tu renta \(\d{4}\)$/);
    expect(document.querySelector('.analisis-hoja .analisis-grupo__body .analisis__hint')).not.toBeNull();

    document.body.innerHTML = `<div>${htmlHojaAnalisis('detalle')}</div>`;
    expect(document.getElementById('detalle-fila-titulo').textContent).toBe('Más detalle de tus gastos');
    expect(document.querySelector('.analisis-hoja .analisis-grupo__body')).not.toBeNull();
  });
});
