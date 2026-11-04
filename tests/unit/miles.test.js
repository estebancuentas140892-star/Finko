/**
 * miles.test.js - el separador de miles de los campos de dinero (ADR 120).
 *
 * - `miles`, `desdeMiles` y `posicionTrasMiles` (infra, puras).
 * - `initMiles`: un campo `data-miles` se reformatea al escribir sin perder
 *   el cursor, y su formulario lo entrega como dígitos al armar `FormData`.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { miles, desdeMiles, posicionTrasMiles } from '../../modules/infra/miles.js';
import { initMiles } from '../../modules/ui/miles.js';

describe('miles() y desdeMiles()', () => {
  it('agrupa con punto y quita lo que no es dígito ni cero a la izquierda', () => {
    expect(miles('1500000')).toBe('1.500.000');
    expect(miles('1.5000.00')).toBe('1.500.000');
    expect(miles('$ 46900')).toBe('46.900');
    expect(miles('000123')).toBe('123');
    expect(miles(980000)).toBe('980.000');
    expect(miles('')).toBe('');
    expect(miles(null)).toBe('');
  });

  it('desdeMiles devuelve el número, o null si no quedó ningún dígito', () => {
    expect(desdeMiles('1.500.000')).toBe(1_500_000);
    expect(desdeMiles('46900')).toBe(46_900);
    expect(desdeMiles('')).toBeNull();
    expect(desdeMiles('abc')).toBeNull();
    expect(desdeMiles('0')).toBe(0);
  });
});

describe('posicionTrasMiles()', () => {
  it('deja el cursor con los mismos dígitos a su derecha', () => {
    expect(posicionTrasMiles('1.234.567', 0)).toBe(9);
    expect(posicionTrasMiles('1.234.567', 3)).toBe(6);
    expect(posicionTrasMiles('1.234.567', 7)).toBe(0);
    expect(posicionTrasMiles('12.345', 2)).toBe(4);
  });
});

describe('initMiles()', () => {
  beforeAll(() => initMiles());

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="f">
        <input id="monto" name="monto" type="text" inputmode="numeric" data-miles>
        <input id="nota" name="nota" type="text">
        <input id="suelto" type="text" inputmode="numeric" data-miles>
      </form>`;
  });

  const escribir = (campo, valor, cursor = valor.length) => {
    campo.value = valor;
    campo.setSelectionRange(cursor, cursor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('reformatea al escribir', () => {
    const campo = document.getElementById('monto');
    escribir(campo, '1500000');
    expect(campo.value).toBe('1.500.000');
  });

  it('escribir en medio del número no manda el cursor al final', () => {
    const campo = document.getElementById('monto');
    // "15.000" con un 0 nuevo después del 1: "105.000" -> cursor tras el "10".
    escribir(campo, '105.000', 2);
    expect(campo.value).toBe('105.000');
    escribir(campo, '1050.000', 3);
    expect(campo.value).toBe('1.050.000');
    expect(campo.selectionStart).toBe(4);
  });

  it('un campo sin la marca no se toca', () => {
    const nota = document.getElementById('nota');
    escribir(nota, '1500000');
    expect(nota.value).toBe('1500000');
  });

  it('el formulario entrega los dígitos al armar FormData', () => {
    const campo = document.getElementById('monto');
    escribir(campo, '46900');
    expect(campo.value).toBe('46.900');
    const datos = Object.fromEntries(new FormData(document.getElementById('f')));
    expect(datos.monto).toBe('46900');
    expect(datos.nota).toBe('');
  });
});
