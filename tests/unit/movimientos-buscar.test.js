/**
 * movimientos-buscar.test.js - lo puro de buscar en Movimientos (ADR 121 D1):
 * cuánto suman los resultados, el total de cada mes, las categorías más
 * usadas para los atajos y la lista de búsquedas recientes.
 */

import { describe, it, expect } from 'vitest';
import {
  sumaDeMovimientos, categoriasFrecuentes, anotarBusquedaReciente, BUSQUEDAS_RECIENTES_MAX,
} from '../../modules/dominio/movimientos/logic.js';

const mov = (o) => ({ id: o.id ?? 'x', fecha: '2026-10-27', monto: 0, direccion: 'egreso', tipo: 'gasto', ...o });

describe('sumaDeMovimientos()', () => {
  it('separa lo que sale de lo que entra y da el neto', () => {
    const r = sumaDeMovimientos([
      mov({ monto: 46_900 }),
      mov({ monto: 140_700 }),
      mov({ monto: 300_000, direccion: 'ingreso', tipo: 'ingreso' }),
      mov({ monto: 50_000, direccion: 'neutro', tipo: 'transferencia' }),
    ]);
    expect(r).toEqual({ sale: 187_600, entra: 300_000, neto: 112_400 });
  });

  it('sin movimientos todo es cero', () => {
    expect(sumaDeMovimientos([])).toEqual({ sale: 0, entra: 0, neto: 0 });
  });
});

describe('categoriasFrecuentes()', () => {
  it('las más usadas primero, sin repetir, hasta el tope', () => {
    const movs = [
      ...Array.from({ length: 3 }, (_, i) => mov({ id: `m${i}`, categoria: 'Mercado' })),
      ...Array.from({ length: 5 }, (_, i) => mov({ id: `r${i}`, categoria: 'Restaurantes' })),
      mov({ id: 't', categoria: 'Transporte' }),
      mov({ id: 'n', categoria: null }),
    ];
    expect(categoriasFrecuentes(movs, 2)).toEqual(['Restaurantes', 'Mercado']);
    expect(categoriasFrecuentes(movs)).toEqual(['Restaurantes', 'Mercado', 'Transporte']);
  });

  it('a igual uso, en orden alfabético', () => {
    const movs = [mov({ id: 'a', categoria: 'Ropa' }), mov({ id: 'b', categoria: 'Café' })];
    expect(categoriasFrecuentes(movs)).toEqual(['Café', 'Ropa']);
  });
});

describe('anotarBusquedaReciente()', () => {
  it('la última va primero, sin repetir (sin importar mayúsculas)', () => {
    expect(anotarBusquedaReciente(['Arriendo', 'Netflix'], 'rappi')).toEqual(['rappi', 'Arriendo', 'Netflix']);
    expect(anotarBusquedaReciente(['Arriendo', 'Rappi', 'Netflix'], 'rappi')).toEqual(['rappi', 'Arriendo', 'Netflix']);
  });

  it('guarda las cinco últimas y no anota una búsqueda vacía', () => {
    const lista = ['a', 'b', 'c', 'd', 'e'];
    expect(anotarBusquedaReciente(lista, 'f')).toEqual(['f', 'a', 'b', 'c', 'd']);
    expect(BUSQUEDAS_RECIENTES_MAX).toBe(5);
    expect(anotarBusquedaReciente(lista, '   ')).toEqual(lista);
    expect(anotarBusquedaReciente(undefined, ' Rappi ')).toEqual(['Rappi']);
  });
});
