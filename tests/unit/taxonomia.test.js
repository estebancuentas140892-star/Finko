/**
 * taxonomia.test.js - la estructura de dos niveles (ADR 064) y el primer
 * catálogo que la usa, las subcategorías de meta (MT.6a, ADR 048 D1).
 *
 * Dos bloques con propósitos distintos. El primero prueba las funciones puras
 * contra catálogos de juguete: ahí se fija el contrato que van a heredar los
 * otros dos consumidores previstos (categoría a marca del ADR 029, entidad a
 * producto de MC.16), incluidos los bordes que un catálogo real no ejercita
 * (hijo con dos padres, id que ya no existe, catálogo ausente).
 *
 * El segundo prueba el catálogo de datos: ids únicos y estables, y ninguna
 * etiqueta de padre que no sea una categoría de meta real. Un id repetido haría
 * que `hijoPorId` devolviera siempre el primero, y una etiqueta mal escrita
 * dejaría subcategorías invisibles para siempre sin que nada falle.
 */

import { describe, it, expect } from 'vitest';

import {
  hijosDeCategoria,
  hijoPorId,
  categoriasConHijos,
} from '../../modules/infra/taxonomia.js';
import {
  SUBCATEGORIAS_META,
  CATEGORIAS_META,
  CATEGORIAS_META_USUARIO,
} from '../../modules/core/constants.js';

const CATALOGO = [
  { id: 'a1', nombre: 'Uno',  categorias: ['A'] },
  { id: 'a2', nombre: 'Dos',  categorias: ['A', 'B'] },
  { id: 'b1', nombre: 'Tres', categorias: ['B'] },
];

describe('infra/taxonomia.js - hijosDeCategoria', () => {
  it('devuelve los hijos de la categoría en el orden del catálogo', () => {
    expect(hijosDeCategoria(CATALOGO, 'A').map(h => h.id)).toEqual(['a1', 'a2']);
  });

  it('un hijo con dos padres aparece en las dos categorías', () => {
    expect(hijosDeCategoria(CATALOGO, 'B').map(h => h.id)).toEqual(['a2', 'b1']);
  });

  it('categoría sin hijos devuelve array vacío, no null', () => {
    expect(hijosDeCategoria(CATALOGO, 'Z')).toEqual([]);
  });

  it('tolera catálogo ausente, categoría vacía y filas sin etiquetas', () => {
    expect(hijosDeCategoria(null, 'A')).toEqual([]);
    expect(hijosDeCategoria(CATALOGO, '')).toEqual([]);
    expect(hijosDeCategoria([{ id: 'x', nombre: 'X' }], 'A')).toEqual([]);
  });
});

describe('infra/taxonomia.js - hijoPorId', () => {
  it('resuelve el hijo guardado por su id', () => {
    expect(hijoPorId(CATALOGO, 'a2').nombre).toBe('Dos');
  });

  it('un id que ya no está en el catálogo devuelve null', () => {
    expect(hijoPorId(CATALOGO, 'borrado')).toBeNull();
  });

  it('tolera id ausente y catálogo ausente', () => {
    expect(hijoPorId(CATALOGO, null)).toBeNull();
    expect(hijoPorId(undefined, 'a1')).toBeNull();
  });
});

describe('infra/taxonomia.js - categoriasConHijos', () => {
  it('lista las categorías con al menos un hijo, sin repetir', () => {
    expect(categoriasConHijos(CATALOGO)).toEqual(['A', 'B']);
  });

  it('catálogo ausente o vacío no tiene categorías', () => {
    expect(categoriasConHijos(null)).toEqual([]);
    expect(categoriasConHijos([])).toEqual([]);
  });
});

describe('SUBCATEGORIAS_META - integridad del catálogo', () => {
  it('todos los ids son únicos', () => {
    const ids = SUBCATEGORIAS_META.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todas las filas tienen id kebab-case, nombre y al menos un padre', () => {
    for (const sub of SUBCATEGORIAS_META) {
      expect(sub.id).toMatch(/^[a-z0-9-]+$/);
      expect(sub.nombre.trim().length).toBeGreaterThan(0);
      expect(sub.categorias.length).toBeGreaterThan(0);
    }
  });

  it('cada etiqueta de padre es una categoría de meta real', () => {
    for (const sub of SUBCATEGORIAS_META) {
      for (const c of sub.categorias) {
        expect(CATEGORIAS_META).toContain(c);
      }
    }
  });

  it("no declara subcategorías para 'Otra': ahí el usuario nombra a mano (MT.3)", () => {
    expect(hijosDeCategoria(SUBCATEGORIAS_META, 'Otra')).toEqual([]);
  });

  it('cubre todas las categorías que el formulario ofrece salvo Otra', () => {
    const cubiertas = categoriasConHijos(SUBCATEGORIAS_META);
    const esperadas = CATEGORIAS_META_USUARIO.filter(c => c !== 'Otra');
    expect(cubiertas.sort()).toEqual([...esperadas].sort());
  });

  it('resuelve un caso concreto de punta a punta', () => {
    const hijos = hijosDeCategoria(SUBCATEGORIAS_META, 'Vehículo');
    expect(hijos.map(h => h.nombre)).toContain('Moto');
    expect(hijoPorId(SUBCATEGORIAS_META, 'vehiculo-moto').nombre).toBe('Moto');
  });
});
