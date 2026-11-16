/**
 * SUS.2c (ADR 147 D1): cambiar el límite o el tope de los gustos pequeños en
 * Límites no puede borrar lo que el usuario ya contestó por concepto
 * (`config.hormiga.conceptos`). Antes `_guardarConfigHormiga` reemplazaba el
 * objeto entero con `{ tope, limite }`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import { dispatch } from '../../modules/ui/actions.js';
import { initPresupuesto } from '../../modules/dominio/presupuesto/index.js';
import { htmlAprendidosHormiga } from '../../modules/dominio/presupuesto/view.js';

const HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

describe('Límites: guardar los gustos pequeños conserva lo aprendido', () => {
  beforeAll(() => {
    const cuerpo = HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/gi, '');
    const tmp = document.createElement('div');
    tmp.innerHTML = cuerpo;
    document.body.innerHTML = `<div class="app-shell"></div><div id="panel-presupuesto"></div>${tmp.querySelector('#modal-presupuesto').outerHTML}`;
    initPresupuesto();
  });

  it('el límite nuevo se guarda junto a los conceptos que ya estaban', () => {
    Object.assign(S, createInitialState());
    S.config.hormiga = { tope: 20_000, limite: null, conceptos: { 'c:Domicilios|': 'gusto' } };

    const boton = document.createElement('button');
    boton.dataset.action = 'hormiga-editar';
    dispatch(boton, new Event('click', { cancelable: true }));

    const form = document.getElementById('form-hormiga');
    form.querySelector('[name="limite"]').value = '80000';
    form.querySelector('[name="tope"]').value = '15000';
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(S.config.hormiga).toEqual({ tope: 15_000, limite: 80_000, conceptos: { 'c:Domicilios|': 'gusto' } });
  });
});

describe('Límites: lo que le contaste a Finko (SUS.2d)', () => {
  const accion = (data) => {
    const b = document.createElement('button');
    b.dataset.action = 'hormiga-concepto';
    Object.assign(b.dataset, data);
    dispatch(b, new Event('click', { cancelable: true }));
  };

  it('la lista sale plegada con cada concepto, su respuesta y sus dos acciones', () => {
    Object.assign(S, createInitialState());
    S.config.hormiga = { tope: 20_000, limite: null, conceptos: { 's:rest-domicilio': 'gusto', 'c:Otros|recarga': 'necesidad' } };
    const div = document.createElement('div');
    div.innerHTML = htmlAprendidosHormiga();
    const lista = div.querySelector('details.hormiga-aprendidos');
    expect(lista.open).toBe(false);
    expect(lista.querySelector('summary').textContent).toBe('Lo que le contaste a Finko (2)');
    const filas = [...lista.querySelectorAll('.hormiga-aprendidos__fila')]
      .map(f => `${f.querySelector('.hormiga-aprendidos__nombre').textContent}:${f.querySelector('.hormiga-aprendidos__valor').textContent}`);
    expect(filas).toEqual(['Domicilio:Un gusto', 'Recarga:Lo necesitas']);
    expect(lista.querySelectorAll('[data-action="hormiga-concepto"]')).toHaveLength(4);
  });

  it('sin respuestas no hay lista', () => {
    Object.assign(S, createInitialState());
    expect(htmlAprendidosHormiga()).toBe('');
  });

  it('"Cambiar" y "Olvidar" reemplazan lo aprendido sin tocar el límite', () => {
    Object.assign(S, createInitialState());
    S.config.hormiga = { tope: 20_000, limite: 50_000, conceptos: { 's:rest-domicilio': 'gusto', 'c:Otros|recarga': 'necesidad' } };
    accion({ concepto: 's:rest-domicilio', etiqueta: 'Domicilio', respuesta: 'necesidad' });
    expect(S.config.hormiga).toEqual({ tope: 20_000, limite: 50_000, conceptos: { 's:rest-domicilio': 'necesidad', 'c:Otros|recarga': 'necesidad' } });
    accion({ concepto: 'c:Otros|recarga', etiqueta: 'Recarga', respuesta: '' });
    expect(S.config.hormiga.conceptos).toEqual({ 's:rest-domicilio': 'necesidad' });
  });
});
