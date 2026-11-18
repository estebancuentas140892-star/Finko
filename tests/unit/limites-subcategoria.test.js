/**
 * limites-subcategoria.test.js - LIM.2 (ADR 164): el límite de una categoría
 * puede ser uno solo o uno por cada subcategoría. Por subcategoría, el máximo
 * de la categoría es la suma y lo que se gasta sin una de esas subcategorías
 * cuenta solo en el total. Todos los datos son inventados.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import { guardar } from '../../modules/infra/crud.js';
import { dispatch } from '../../modules/ui/actions.js';
import { initPresupuesto } from '../../modules/dominio/presupuesto/index.js';
import { renderFormPresupuesto, htmlSubcategoriasLimite } from '../../modules/dominio/presupuesto/view.js';
import {
  subcategoriasDeFormulario, normalizarPresupuesto, validarPresupuesto,
  calcularProgresoSubcategorias, esLimitePorSubcategoria, calcularProgreso,
} from '../../modules/dominio/presupuesto/logic.js';

const HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

const gasto = (subcategoriaId, monto, fecha = '2026-11-10') => ({ categoria: 'Restaurantes', subcategoriaId, monto, fecha });

describe('LIM.2 - la lógica', () => {
  it('lee del formulario solo los máximos de la categoría elegida y mayores que cero', () => {
    expect(subcategoriasDeFormulario({
      categoria: 'Restaurantes',
      'limiteSub.rest-almuerzo': '300000',
      'limiteSub.rest-domicilio': '',
      'limiteSub.rest-rapida': '0',
      'limiteSub.transp-taxi': '50000',
    })).toEqual({ 'rest-almuerzo': 300_000 });
  });

  it('por subcategoría, el monto del tope es la suma; toda la categoría deja subcategorias en null', () => {
    expect(normalizarPresupuesto({
      categoria: 'Restaurantes', modoLimite: 'subcategorias',
      'limiteSub.rest-almuerzo': '300000', 'limiteSub.rest-domicilio': '80000', montoMensual: '999',
    })).toEqual({ categoria: 'Restaurantes', montoMensual: 380_000, subcategorias: { 'rest-almuerzo': 300_000, 'rest-domicilio': 80_000 }, activo: true });
    expect(normalizarPresupuesto({ categoria: 'Restaurantes', modoLimite: 'categoria', montoMensual: '400000' }))
      .toEqual({ categoria: 'Restaurantes', montoMensual: 400_000, subcategorias: null, activo: true });
  });

  it('por subcategoría pide al menos un máximo, y no el monto único', () => {
    expect(validarPresupuesto({ categoria: 'Restaurantes', modoLimite: 'subcategorias' }))
      .toEqual(['Escribe el máximo de al menos una subcategoría. Por ejemplo: 200.000']);
    expect(validarPresupuesto({ categoria: 'Restaurantes', modoLimite: 'subcategorias', 'limiteSub.rest-almuerzo': '300000' })).toEqual([]);
    expect(validarPresupuesto({ categoria: 'Restaurantes', modoLimite: 'categoria', montoMensual: '' }))
      .toEqual(['Escribe cuánto quieres gastar al mes. Por ejemplo: 600.000']);
  });

  it('cada subcategoría con máximo lleva su progreso; lo demás cuenta solo en el total', () => {
    const p = { categoria: 'Restaurantes', montoMensual: 380_000, subcategorias: { 'rest-almuerzo': 300_000, 'rest-domicilio': 80_000 } };
    const gastos = [
      gasto('rest-almuerzo', 240_000), gasto('rest-domicilio', 90_000), gasto('rest-rapida', 20_000), gasto(null, 10_000),
      gasto('rest-almuerzo', 50_000, '2026-10-30'),
    ];
    expect(esLimitePorSubcategoria(p)).toBe(true);
    const { subs, sinLimite } = calcularProgresoSubcategorias(p, gastos, 2026, 11);
    expect(subs.map(s => [s.id, s.nombre, s.gastado, s.asignado, s.porcentaje, s.estado])).toEqual([
      ['rest-almuerzo', 'Almuerzo de trabajo', 240_000, 300_000, 80, 'alerta'],
      ['rest-domicilio', 'Domicilio', 90_000, 80_000, 113, 'excedido'],
    ]);
    expect(sinLimite).toBe(30_000);
    // El total de la categoría no cambia: 360.000 de 380.000.
    expect(calcularProgreso(p, gastos, 2026, 11)).toMatchObject({ gastado: 360_000, asignado: 380_000 });
  });

  it('un tope de toda la categoría no tiene subcategorías', () => {
    expect(esLimitePorSubcategoria({ categoria: 'Mercado', montoMensual: 500_000 })).toBe(false);
    expect(calcularProgresoSubcategorias({ categoria: 'Mercado', montoMensual: 500_000 }, [], 2026, 11)).toEqual({ subs: [], sinLimite: 0 });
    expect(htmlSubcategoriasLimite({ categoria: 'Mercado', montoMensual: 500_000 }, [], 2026, 11)).toBe('');
  });
});

describe('LIM.2 - el formulario y la lista', () => {
  beforeAll(() => {
    const cuerpo = HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/gi, '');
    const tmp = document.createElement('div');
    tmp.innerHTML = cuerpo;
    document.body.innerHTML = `<div class="app-shell"></div><div id="panel-presupuesto"></div>${tmp.querySelector('#modal-presupuesto').outerHTML}`;
    initPresupuesto();
  });

  beforeEach(() => {
    Object.assign(S, createInitialState());
  });

  const accion = (nombre, data = {}) => {
    const el = document.createElement('button');
    el.dataset.action = nombre;
    Object.assign(el.dataset, data);
    dispatch(el, new Event('click', { cancelable: true }));
  };
  const elegir = (form, name, valor) => {
    const radio = form.querySelector(`input[name="${name}"][value="${valor}"]`);
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  };

  it('sin categoría, ni el modo ni los montos por subcategoría se ven', () => {
    const div = document.createElement('div');
    div.innerHTML = renderFormPresupuesto();
    expect(div.querySelector('[data-limite-modo]').hidden).toBe(true);
    expect(div.querySelector('[data-limite-subs-bloque]').hidden).toBe(true);
    for (const g of div.querySelectorAll('[data-limite-subs]')) expect(g.disabled).toBe(true);
  });

  it('crear por subcategoría: el modo aparece con la categoría, suma el total y guarda cada máximo', () => {
    accion('nuevo-presupuesto');
    const form = document.getElementById('form-presupuesto');
    elegir(form, 'categoria', 'Restaurantes');
    expect(form.querySelector('[data-limite-modo]').hidden).toBe(false);
    expect(form.querySelector('[data-limite-subs-bloque]').hidden).toBe(true);
    elegir(form, 'modoLimite', 'subcategorias');
    expect(form.querySelector('[data-limite-monto]').hidden).toBe(true);
    expect(form.querySelector('[data-limite-subs="Restaurantes"]').disabled).toBe(false);
    expect(form.querySelector('[data-limite-subs="Transporte"]').disabled).toBe(true);
    const campo = (id) => form.querySelector(`[name="limiteSub.${id}"]`);
    campo('rest-almuerzo').value = '300000';
    campo('rest-almuerzo').dispatchEvent(new Event('input', { bubbles: true }));
    campo('rest-domicilio').value = '80000';
    campo('rest-domicilio').dispatchEvent(new Event('input', { bubbles: true }));
    expect(form.querySelector('[data-limite-total]').textContent).toBe('$380.000');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(S.presupuestos).toHaveLength(1);
    expect(S.presupuestos[0]).toMatchObject({ categoria: 'Restaurantes', montoMensual: 380_000, subcategorias: { 'rest-almuerzo': 300_000, 'rest-domicilio': 80_000 } });
  });

  it('una categoría sin subcategorías no ofrece el modo', () => {
    guardar('categoriasPersonalizadas', { nombre: 'Gimnasio', icono: 'c-pesa', seccion: 'gasto' });
    accion('nuevo-presupuesto');
    const form = document.getElementById('form-presupuesto');
    elegir(form, 'categoria', 'Gimnasio');
    expect(form.querySelector('[data-limite-modo]').hidden).toBe(true);
    expect(form.querySelector('[data-limite-monto]').hidden).toBe(false);
  });

  it('editar trae los máximos y volver a toda la categoría los limpia', () => {
    guardar('presupuestos', { id: 'p1', categoria: 'Restaurantes', montoMensual: 380_000, subcategorias: { 'rest-almuerzo': 300_000, 'rest-domicilio': 80_000 }, activo: true });
    accion('editar-presupuesto', { id: 'p1' });
    const form = document.getElementById('form-presupuesto');
    expect(form.querySelector('input[name="modoLimite"][value="subcategorias"]').checked).toBe(true);
    expect(form.querySelector('[name="limiteSub.rest-almuerzo"]').value).toBe('300.000');
    expect(form.querySelector('[data-limite-total]').textContent).toBe('$380.000');
    elegir(form, 'modoLimite', 'categoria');
    form.querySelector('[name="montoMensual"]').value = '400000';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(S.presupuestos[0]).toMatchObject({ montoMensual: 400_000, subcategorias: null });
  });

  it('la lista pinta cada subcategoría bajo su tope y lo que va sin límite propio', () => {
    const p = { id: 'p1', categoria: 'Restaurantes', montoMensual: 380_000, subcategorias: { 'rest-almuerzo': 300_000, 'rest-domicilio': 80_000 } };
    const div = document.createElement('div');
    div.innerHTML = htmlSubcategoriasLimite(p, [gasto('rest-almuerzo', 240_000), gasto(null, 10_000)], 2026, 11);
    const filas = [...div.querySelectorAll('.limite-sub-fila')];
    expect(filas.map(f => f.querySelector('.limite-sub-fila__nombre').textContent)).toEqual(['Almuerzo de trabajo', 'Domicilio']);
    expect(filas[0].querySelector('.limite-sub-fila__cifra').textContent).toBe('$240.000 de $300.000');
    expect(div.querySelector('.limite-subs-lista__resto').textContent).toBe('Sin límite propio: $10.000, cuenta en el total.');
  });
});
