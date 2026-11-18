/**
 * analisis-telefono.test.js - Análisis en el teléfono (ADR 134 D7, tanda 4).
 *
 * Las frases que cambian con los datos (lo que frena la salud, la comparación
 * del mes, el aviso de la renta), las dos lentes del ADR 176 (Tus gastos y Tu
 * situación) con sus filas y sus hojas, y que bajo 1024px la sección se pinta
 * en filas.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loQueFrena, avisoRenta, htmlFilaRenta, subRenta, SUB_DETALLE,
  nombresEnLinea, fraseHoy, cambiarLenteAnalisis, lenteAnalisis,
} from '../../modules/dominio/analisis/telefono.js';
import { renderAnalisis, htmlHojaAnalisis } from '../../modules/dominio/analisis/view.js';
import { S } from '../../modules/core/state.js';

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

describe('avisoRenta y la fila de la renta (ADR 134 D7)', () => {
  it('pasar un tope pesa más que estar cerca; sin alerta, nada', () => {
    expect(avisoRenta([{ estado: 'cerca' }, { estado: 'supera' }])).toEqual({ texto: 'Pasas un tope para declarar', nivel: 'peligro' });
    expect(avisoRenta([{ estado: 'cerca' }])).toEqual({ texto: 'Estás cerca de un tope para declarar', nivel: 'atencion' });
    expect(avisoRenta([{ estado: 'dentro' }])).toBeNull();
  });

  it('la fila de la renta abre su hoja y solo avisa con alerta (ADR 176 D9)', () => {
    document.body.innerHTML = htmlFilaRenta(2026, [{ estado: 'cerca' }, {}, {}, {}, {}]);
    const fila = document.querySelector('.ana-fila[data-action="analisis-hoja"]');
    expect(fila.dataset.hoja).toBe('renta');
    expect(fila.textContent).toContain('Estado de tu renta (2026)');
    expect(fila.textContent).toContain('5 criterios de la DIAN y sus topes');
    expect(fila.querySelector('.ana-fila__aviso--atencion').textContent).toBe('Estás cerca de un tope para declarar');

    document.body.innerHTML = htmlFilaRenta(2026, [{}]);
    expect(document.querySelector('.ana-fila__aviso')).toBeNull();
    expect(subRenta(1)).toBe('1 criterio de la DIAN y sus topes');
  });
});

describe('frases de Tu situación (ADR 176 D9)', () => {
  it('hasta cuatro nombres van todos; desde cinco, tres y los que faltan', () => {
    expect(nombresEnLinea(['Tarjeta'])).toBe('Tarjeta');
    expect(nombresEnLinea(['Tarjeta', 'Carro'])).toBe('Tarjeta y Carro');
    expect(nombresEnLinea(['Salud', 'Ropa', 'Hogar', 'Mascotas'])).toBe('Salud, Ropa, Hogar y Mascotas');
    expect(nombresEnLinea(['Cuentas', 'Inversión', 'Metas', 'Reservas', 'Por cobrar'], { minuscula: true }))
      .toBe('Cuentas, inversión, metas y 2 más');
  });

  it('dice hoy con el día de la semana y el mes', () => {
    expect(fraseHoy('2026-11-18')).toBe('Hoy, miércoles 18 de noviembre');
    expect(fraseHoy('')).toBe('Hoy');
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

  afterEach(() => {
    window.matchMedia = matchMediaReal;
    cambiarLenteAnalisis('gastos');
  });

  it('entra por Tus gastos, con las dos lentes y sin los grupos de escritorio (ADR 176 D1)', () => {
    renderAnalisis();
    const panel = document.getElementById('panel-analisis');
    const tabs = [...panel.querySelectorAll('.ana-lentes__tab')];
    expect(tabs.map(t => t.textContent.trim())).toEqual(['Tus gastos', 'Tu situación']);
    expect(tabs.map(t => t.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    expect(lenteAnalisis()).toBe('gastos');
    expect(panel.querySelector('.ana-salud')).toBeNull();
    expect(panel.querySelector('.analisis-grupo')).toBeNull();
    expect(panel.querySelector('.score-hero')).toBeNull();
  });

  it('Tu situación trae la salud, lo que realmente tienes y la renta, con sus filas (ADR 176 D9)', () => {
    S.compromisos = [
      { id: 'd1', tipo: 'deuda-entidad', descripcion: 'Tarjeta', saldoTotal: 200_000, activo: true },
      { id: 'd2', tipo: 'deuda-personal', descripcion: 'Carro', saldoTotal: 100_000, activo: true },
    ];
    cambiarLenteAnalisis('situacion');
    renderAnalisis();
    const panel = document.getElementById('panel-analisis');
    expect(panel.querySelector('.ana-alcance').textContent).toMatch(/^Hoy, \S+ \d+ de \S+$/);
    expect(panel.querySelector('.ana-salud .ana-salud__num')).not.toBeNull();
    expect([...panel.querySelectorAll('.ana-fila')].map(f => f.dataset.hoja)).toEqual(['factores', 'tienes', 'debes', 'renta']);
    expect(panel.querySelector('.ana-fila[data-hoja="debes"]').textContent).toContain('2 deudas: Tarjeta y Carro');
    expect(panel.querySelector('.ana-tienes .ana-texto').innerHTML).toContain('<strong>30% de lo que tienes</strong>');
  });

  it('sin deudas no hay fila de lo que debes', () => {
    cambiarLenteAnalisis('situacion');
    renderAnalisis();
    expect(document.querySelector('.ana-fila[data-hoja="debes"]')).toBeNull();
  });

  it('un valor desconocido vuelve a Tus gastos', () => {
    cambiarLenteAnalisis('otra');
    expect(lenteAnalisis()).toBe('gastos');
  });

  it('la barra de cada categoría mide su parte del total (ADR 176 D5)', () => {
    renderAnalisis();
    const anchos = [...document.querySelectorAll('.ana-barra--gastos > span')].map(s => s.style.width);
    expect(anchos).toEqual(['67%', '33%']);
  });

  it('la banda de la salud lleva su ícono y la barra su color', () => {
    cambiarLenteAnalisis('situacion');
    renderAnalisis();
    expect(document.querySelector('.ana-salud__banda use')).not.toBeNull();
    const banda = [...document.querySelector('.ana-salud__banda').classList].find(c => c.startsWith('ana-salud__banda--')).slice('ana-salud__banda--'.length);
    expect(document.querySelector('.ana-barra--salud').classList.contains(`ana-barra--${banda}`)).toBe(true);
  });

  it('las hojas de Tu situación: los cuatro factores, las partes y las deudas', () => {
    S.compromisos = [{ id: 'd1', tipo: 'deuda-entidad', descripcion: 'Tarjeta', saldoTotal: 200_000, activo: true },
      { id: 'd2', tipo: 'deuda-entidad', descripcion: 'Sin saldo', activo: true }];
    document.body.innerHTML = `<div>${htmlHojaAnalisis('factores')}</div>`;
    expect(document.getElementById('detalle-fila-titulo').textContent).toMatch(/^De dónde sale el \d+$/);
    expect(document.querySelectorAll('.ana-factor')).toHaveLength(4);

    document.body.innerHTML = `<div>${htmlHojaAnalisis('tienes')}</div>`;
    expect(document.getElementById('detalle-fila-titulo').textContent).toBe('Lo que tienes');
    expect([...document.querySelectorAll('.ana-parte__nombre')].map(n => n.textContent)).toEqual(['Cuentas']);

    document.body.innerHTML = `<div>${htmlHojaAnalisis('debes')}</div>`;
    expect(document.getElementById('detalle-fila-titulo').textContent).toBe('Lo que debes');
    expect([...document.querySelectorAll('.ana-parte__nombre')].map(n => n.textContent)).toEqual(['Tarjeta']);
    const completar = document.querySelector('[data-action="analisis-completar-deuda"]');
    expect(completar.dataset.id).toBe('d2');
    expect(document.querySelector('.detalle-fila__cabeza').hasAttribute('data-hoja-analisis')).toBe(true);
  });

  it('las hojas traen el mismo cuerpo que los grupos de escritorio', () => {
    document.body.innerHTML = `<div>${htmlHojaAnalisis('renta')}</div>`;
    expect(document.getElementById('detalle-fila-titulo').textContent).toMatch(/^Estado de tu renta \(\d{4}\)$/);
    expect(document.querySelector('.analisis-hoja .analisis-grupo__body .analisis__hint')).not.toBeNull();

    // El detalle de gastos ya no es fila en el teléfono (ADR 176 D6); su rama sigue.
    document.body.innerHTML = `<div>${htmlHojaAnalisis('detalle')}</div>`;
    expect(document.getElementById('detalle-fila-titulo').textContent).toBe('Más detalle de tus gastos');
    expect(SUB_DETALLE).toBe('Contra el mes anterior, por día de la semana y gastos hormiga');
    expect(document.querySelector('.analisis-hoja .analisis-grupo__body')).not.toBeNull();
  });
});
