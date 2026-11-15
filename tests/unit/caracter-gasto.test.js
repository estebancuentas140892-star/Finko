/**
 * SUS.2a (ADR 147): Mecato, subcategorías de gasto y el carácter de cada gasto
 * (necesidad, gusto o depende). Catálogo, resolución, normalización, el título
 * de la fila y el bloque del formulario de escritorio.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import {
  CATEGORIAS_GASTO, CATEGORIAS_GASTO_USUARIO, CATEGORIA_ICONO,
  CARACTERES_GASTO, CARACTER_CATEGORIA_GASTO, SUBCATEGORIAS_GASTO,
} from '../../modules/core/constants.js';
import { caracterDeGasto } from '../../modules/infra/hormiga.js';
import { normalizarGasto, subcategoriaValida } from '../../modules/dominio/gastos/logic.js';
import { textosFilaGasto, renderFormGasto, nombreSubcategoriaGasto } from '../../modules/dominio/gastos/view.js';

describe('catálogo (ADR 147 D2 y D3)', () => {
  it('Mecato es una categoría que se ofrece, después de Café, con la hormiga como ícono', () => {
    expect(CATEGORIAS_GASTO_USUARIO).toContain('Mecato');
    expect(CATEGORIAS_GASTO.indexOf('Mecato')).toBe(CATEGORIAS_GASTO.indexOf('Café') + 1);
    expect(CATEGORIA_ICONO.Mecato).toBe('c-hormiga');
  });

  it('toda categoría que se ofrece tiene carácter, y es uno de los tres', () => {
    for (const c of CATEGORIAS_GASTO_USUARIO) {
      expect(CARACTERES_GASTO, c).toContain(CARACTER_CATEGORIA_GASTO[c]);
    }
    expect(CARACTER_CATEGORIA_GASTO.Mecato).toBe('gusto');
    expect(CARACTER_CATEGORIA_GASTO.Salud).toBe('necesidad');
    expect(CARACTER_CATEGORIA_GASTO.Otros).toBe('depende');
  });

  it('las subcategorías tienen ids únicos, una categoría que se ofrece y, si dicen carácter, uno válido', () => {
    const ids = SUBCATEGORIAS_GASTO.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SUBCATEGORIAS_GASTO) {
      expect(s.categorias, s.id).toHaveLength(1);
      expect(CATEGORIAS_GASTO_USUARIO, s.id).toContain(s.categorias[0]);
      if ('caracter' in s) expect(CARACTERES_GASTO, s.id).toContain(s.caracter);
    }
  });

  it('una subcategoría no repite el carácter de su categoría (solo lo declara si cambia)', () => {
    for (const s of SUBCATEGORIAS_GASTO.filter(x => 'caracter' in x)) {
      expect(s.caracter, s.id).not.toBe(CARACTER_CATEGORIA_GASTO[s.categorias[0]]);
    }
  });

  it('Otros no tiene subcategorías: ahí se pregunta (D4)', () => {
    expect(SUBCATEGORIAS_GASTO.some(s => s.categorias.includes('Otros'))).toBe(false);
  });
});

describe('caracterDeGasto() (ADR 147 D1)', () => {
  it('sin nada más, manda la categoría nativa', () => {
    expect(caracterDeGasto({ categoria: 'Mecato' })).toBe('gusto');
    expect(caracterDeGasto({ categoria: 'Salud' })).toBe('necesidad');
    expect(caracterDeGasto({ categoria: 'Restaurantes' })).toBe('depende');
  });

  it('la subcategoría con carácter propio gana a la categoría', () => {
    expect(caracterDeGasto({ categoria: 'Restaurantes', subcategoriaId: 'rest-almuerzo' })).toBe('necesidad');
    expect(caracterDeGasto({ categoria: 'Restaurantes', subcategoriaId: 'rest-rapida' })).toBe('gusto');
    // Sin carácter propio, la de su categoría.
    expect(caracterDeGasto({ categoria: 'Restaurantes', subcategoriaId: 'rest-domicilio' })).toBe('depende');
  });

  it('una subcategoría de otra categoría no decide', () => {
    expect(caracterDeGasto({ categoria: 'Salud', subcategoriaId: 'rest-rapida' })).toBe('necesidad');
  });

  it('lo que el usuario contestó en el gasto gana a todo', () => {
    expect(caracterDeGasto({ categoria: 'Otros', caracter: 'necesidad' })).toBe('necesidad');
    expect(caracterDeGasto({ categoria: 'Otros', caracter: 'gusto' })).toBe('gusto');
    expect(caracterDeGasto({ categoria: 'Otros', caracter: 'otra-cosa' })).toBe('depende');
  });

  it('una categoría propia usa lo contestado al crearla; sin respuesta, depende', () => {
    const propias = [{ nombre: 'Videojuegos', caracter: 'gusto' }, { nombre: 'Gimnasio' }];
    expect(caracterDeGasto({ categoria: 'Videojuegos' }, propias)).toBe('gusto');
    expect(caracterDeGasto({ categoria: 'Gimnasio' }, propias)).toBe('depende');
  });

  it('una categoría vieja o interna cae a depende', () => {
    expect(caracterDeGasto({ categoria: 'Gastos hormiga' })).toBe('depende');
    expect(caracterDeGasto({})).toBe('depende');
    expect(caracterDeGasto(null)).toBe('depende');
  });
});

describe('normalizarGasto() con subcategoría y carácter', () => {
  const base = { monto: '5000', fecha: '2026-11-15', cuentaId: 'c1' };

  it('guarda la subcategoría si es de la categoría', () => {
    expect(normalizarGasto({ ...base, categoria: 'Mecato', subcategoriaId: 'mecato-helado' }).subcategoriaId).toBe('mecato-helado');
  });

  it('descarta una subcategoría de otra categoría o inexistente, explícita en null', () => {
    expect(normalizarGasto({ ...base, categoria: 'Salud', subcategoriaId: 'mecato-helado' })).toHaveProperty('subcategoriaId', null);
    expect(normalizarGasto({ ...base, categoria: 'Mecato', subcategoriaId: 'no-existe' }).subcategoriaId).toBeNull();
    expect(normalizarGasto({ ...base, categoria: 'Mecato' }).subcategoriaId).toBeNull();
  });

  it('la respuesta de carácter solo se guarda en Otros', () => {
    expect(normalizarGasto({ ...base, categoria: 'Otros', caracter: 'necesidad' }).caracter).toBe('necesidad');
    expect(normalizarGasto({ ...base, categoria: 'Mecato', caracter: 'necesidad' })).toHaveProperty('caracter', null);
    expect(normalizarGasto({ ...base, categoria: 'Otros', caracter: 'depende' }).caracter).toBeNull();
  });

  it('subcategoriaValida() es la misma regla', () => {
    expect(subcategoriaValida('cafe-tinto', 'Café')).toBe('cafe-tinto');
    expect(subcategoriaValida('cafe-tinto', 'Mecato')).toBeNull();
    expect(subcategoriaValida(42, 'Café')).toBeNull();
  });
});

describe('textosFilaGasto() con subcategoría (ADR 147 D5)', () => {
  const cuentas = [{ id: 'n', nombre: 'Nequi' }];

  it('sin nota, la subcategoría es el título y la categoría va debajo', () => {
    expect(textosFilaGasto({ categoria: 'Mecato', subcategoriaId: 'mecato-helado', cuentaId: 'n' }, cuentas))
      .toEqual({ titulo: 'Helado', subtitulo: 'Mecato · Nequi' });
  });

  it('con nota, la nota es el título y la subcategoría acompaña a la categoría', () => {
    expect(textosFilaGasto({ categoria: 'Mecato', subcategoriaId: 'mecato-helado', nota: 'Con los niños', cuentaId: 'n' }, cuentas))
      .toEqual({ titulo: 'Con los niños', subtitulo: 'Mecato · Helado · Nequi' });
  });

  it('una subcategoría que no es de su categoría no se muestra', () => {
    expect(textosFilaGasto({ categoria: 'Salud', subcategoriaId: 'mecato-helado' }).titulo).toBe('Salud');
    expect(nombreSubcategoriaGasto({ categoria: 'Salud', subcategoriaId: 'mecato-helado' })).toBeNull();
  });
});

describe('renderFormGasto() - "Sé más específico" y la pregunta (ADR 147 D5)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    S.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', saldo: 100_000, activa: true }];
  });

  const montar = (opciones) => {
    const div = document.createElement('div');
    div.innerHTML = renderFormGasto(opciones);
    return div;
  };

  it('un grupo por categoría con subcategorías y la pregunta, todo oculto y deshabilitado al nacer', () => {
    const div = montar();
    const grupos = [...div.querySelectorAll('[data-sub-grupo]')];
    expect(grupos.map(g => g.dataset.subGrupo)).toContain('Mecato');
    expect(grupos.map(g => g.dataset.subGrupo)).not.toContain('Otros');
    for (const g of [...grupos, div.querySelector('[data-caracter-grupo]')]) {
      expect(g.hidden).toBe(true);
      expect(g.disabled).toBe(true);
    }
    const mecato = div.querySelector('[data-sub-grupo="Mecato"]');
    expect([...mecato.querySelectorAll('[name="subcategoriaId"]')].map(r => r.value))
      .toEqual(['mecato-dulces', 'mecato-paquetes', 'mecato-helado', 'mecato-bebidas', 'mecato-panaderia']);
    expect([...div.querySelectorAll('[data-caracter-grupo] [name="caracter"]')].map(r => r.value)).toEqual(['gusto', 'necesidad']);
  });

  it('el pago de un compromiso (categoría fija) no trae el bloque', () => {
    const div = montar({ categoriaFija: 'Gastos fijos' });
    expect(div.querySelector('[data-sub-grupo], [data-caracter-grupo]')).toBeNull();
  });
});
