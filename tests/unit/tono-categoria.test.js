/**
 * tono-categoria.test.js - un tono por categoría de gasto (GAS.8a, ADR 182 D1).
 *
 * Cada categoría pinta su teja con un token `--fk-cat-*` que tiene que
 * existir en los dos temas; la teja lo recibe como `data-cat`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CATEGORIAS_GASTO, TONO_CATEGORIA, tonoDeCategoria } from '../../modules/core/constants.js';
import { tejaCategoria } from '../../modules/infra/icons.js';

const leer = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const TOKENS = leer('styles/tokens.css');
const TEMAS = leer('styles/themes.css');
const ATOMOS = leer('styles/components/atoms.css');

describe('tonoDeCategoria (ADR 182 D1)', () => {
  it('los nueve tonos del tablero', () => {
    expect(['Mercado', 'Restaurantes', 'Transporte', 'Ropa', 'Café', 'Salud', 'Hogar', 'Entretenimiento', 'Servicios públicos'].map(tonoDeCategoria))
      .toEqual(['mercado', 'restaurantes', 'transporte', 'ropa', 'cafe', 'salud', 'hogar', 'entretenimiento', 'servicios']);
  });

  it('las parientes toman el tono de su familia y lo que no está, el neutro', () => {
    // GAS.10b (ADR 185 D3): los tonos del tablero de Colombia.
    expect(tonoDeCategoria('Antojos')).toBe('cuidado');
    expect(tonoDeCategoria('Carro o moto')).toBe('servicios');
    expect(tonoDeCategoria('Familia')).toBe('restaurantes');
    expect(tonoDeCategoria('Mascotas')).toBe('cafe');
    expect(tonoDeCategoria('Alimentación')).toBe('mercado');
    expect(tonoDeCategoria('Vivienda')).toBe('hogar');
    expect(tonoDeCategoria('Otros')).toBe('servicios');
    expect(tonoDeCategoria('Mi categoría propia')).toBe('servicios');
  });

  it('cada tono tiene su token en los dos temas, su barra y su regla de teja', () => {
    const tonos = new Set([...CATEGORIAS_GASTO.map(tonoDeCategoria), ...Object.values(TONO_CATEGORIA)]);
    for (const t of tonos) {
      expect(TOKENS, t).toMatch(new RegExp(`--fk-cat-${t}:\\s+#`));
      expect(TOKENS, `${t}-barra`).toMatch(new RegExp(`--fk-cat-${t}-barra:\\s+#`));
      expect(TEMAS, t).toMatch(new RegExp(`--fk-cat-${t}:\\s+#`));
      expect(ATOMOS, t).toContain(`.cat-teja[data-cat="${t}"]`);
    }
  });
});

describe('tejaCategoria con tono', () => {
  it('lleva data-cat solo si recibe tono', () => {
    expect(tejaCategoria('c-mercado', 'gastos', 'mercado')).toContain('data-cat="mercado"');
    expect(tejaCategoria('c-mercado', 'gastos')).not.toContain('data-cat');
  });
});
