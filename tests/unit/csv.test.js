import { describe, it, expect } from 'vitest';
import {
  parsearCSV,
  parsearCSVaObjetos,
  serializarCSV,
  detectarSeparador,
} from '../../modules/infra/csv.js';

// ── detectarSeparador() ───────────────────────────────────────────

describe('detectarSeparador()', () => {
  it('detecta coma como separador por defecto', () => {
    expect(detectarSeparador('a,b,c\n1,2,3')).toBe(',');
  });

  it('detecta punto y coma cuando es más frecuente', () => {
    expect(detectarSeparador('a;b;c\n1;2;3')).toBe(';');
  });

  it('coma gana en empate (default seguro)', () => {
    expect(detectarSeparador('a,b;c')).toBe(',');
  });

  it('ignora separadores dentro de quotes', () => {
    expect(detectarSeparador('"a;b;c";d;e')).toBe(';');
  });

  it('texto vacío → coma por default', () => {
    expect(detectarSeparador('')).toBe(',');
  });
});

// ── parsearCSV() ──────────────────────────────────────────────────

describe('parsearCSV()', () => {
  it('parsea CSV simple', () => {
    const out = parsearCSV('a,b,c\n1,2,3\n4,5,6');
    expect(out.headers).toEqual(['a', 'b', 'c']);
    expect(out.filas).toEqual([['1', '2', '3'], ['4', '5', '6']]);
  });

  it('descarta BOM UTF-8 al inicio', () => {
    const out = parsearCSV('﻿a,b\n1,2');
    expect(out.headers).toEqual(['a', 'b']);
  });

  it('trimea espacios alrededor de headers', () => {
    const out = parsearCSV(' a , b , c \n1,2,3');
    expect(out.headers).toEqual(['a', 'b', 'c']);
  });

  it('reconoce CRLF como salto de línea', () => {
    const out = parsearCSV('a,b\r\n1,2\r\n3,4');
    expect(out.filas).toEqual([['1', '2'], ['3', '4']]);
  });

  it('reconoce CR solo (Mac clásico)', () => {
    const out = parsearCSV('a,b\r1,2\r3,4');
    expect(out.filas).toHaveLength(2);
  });

  it('maneja campos entrecomillados con separador interno', () => {
    const out = parsearCSV('a,b\n"Hola, mundo",2');
    expect(out.filas[0]).toEqual(['Hola, mundo', '2']);
  });

  it('maneja quotes escapadas dentro de campo', () => {
    const out = parsearCSV('a,b\n"Dijo ""hola""",2');
    expect(out.filas[0][0]).toBe('Dijo "hola"');
  });

  it('maneja saltos de línea dentro de quotes', () => {
    const out = parsearCSV('a,b\n"línea 1\nlínea 2",2');
    expect(out.filas[0][0]).toBe('línea 1\nlínea 2');
  });

  it('detecta separador punto y coma automáticamente', () => {
    const out = parsearCSV('a;b\n1;2');
    expect(out.headers).toEqual(['a', 'b']);
    expect(out.filas[0]).toEqual(['1', '2']);
  });

  it('permite forzar separador via opciones', () => {
    const out = parsearCSV('a;b\n1;2', { separador: ',' });
    // Con `,` forzado, no se split: la primera fila es un solo campo
    expect(out.headers).toEqual(['a;b']);
  });

  it('descarta filas completamente vacías', () => {
    const out = parsearCSV('a,b\n1,2\n\n3,4\n');
    expect(out.filas).toEqual([['1', '2'], ['3', '4']]);
  });

  it('mantiene campos vacíos legítimos', () => {
    const out = parsearCSV('a,b,c\n1,,3');
    expect(out.filas[0]).toEqual(['1', '', '3']);
  });

  it('texto vacío → headers y filas vacíos', () => {
    expect(parsearCSV('')).toEqual({ headers: [], filas: [] });
  });

  it('texto null/undefined → vacío', () => {
    expect(parsearCSV(null)).toEqual({ headers: [], filas: [] });
    expect(parsearCSV(undefined)).toEqual({ headers: [], filas: [] });
  });

  it('solo headers sin filas', () => {
    const out = parsearCSV('a,b,c');
    expect(out.headers).toEqual(['a', 'b', 'c']);
    expect(out.filas).toEqual([]);
  });
});

// ── parsearCSVaObjetos() ──────────────────────────────────────────

describe('parsearCSVaObjetos()', () => {
  it('mapea filas a objetos usando headers como keys', () => {
    const out = parsearCSVaObjetos('nombre,edad\nAna,30\nBob,25');
    expect(out).toEqual([
      { nombre: 'Ana', edad: '30' },
      { nombre: 'Bob', edad: '25' },
    ]);
  });

  it('trimea valores en los objetos', () => {
    const out = parsearCSVaObjetos('a,b\n  hola  ,  mundo  ');
    expect(out[0]).toEqual({ a: 'hola', b: 'mundo' });
  });

  it('campos faltantes en filas se convierten a cadena vacía', () => {
    const out = parsearCSVaObjetos('a,b,c\n1,2');
    expect(out[0]).toEqual({ a: '1', b: '2', c: '' });
  });

  it('texto vacío → array vacío', () => {
    expect(parsearCSVaObjetos('')).toEqual([]);
  });
});

// ── serializarCSV() ───────────────────────────────────────────────

describe('serializarCSV()', () => {
  it('serializa array de objetos con headers automáticos', () => {
    const out = serializarCSV([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
    expect(out).toBe('a,b\n1,2\n3,4');
  });

  it('escapa celdas con separador (las entrecomilla)', () => {
    const out = serializarCSV([{ a: 'Hola, mundo', b: 'x' }]);
    expect(out).toContain('"Hola, mundo"');
  });

  it('escapa celdas con quotes (dobles "")', () => {
    const out = serializarCSV([{ a: 'Dijo "hola"' }]);
    expect(out).toContain('"Dijo ""hola"""');
  });

  it('escapa celdas con saltos de línea', () => {
    const out = serializarCSV([{ a: 'línea 1\nlínea 2' }]);
    expect(out).toContain('"línea 1\nlínea 2"');
  });

  it('no escapa celdas simples', () => {
    const out = serializarCSV([{ a: 'simple', b: '123' }]);
    expect(out).not.toContain('"');
  });

  it('respeta separador custom', () => {
    const out = serializarCSV([{ a: '1', b: '2' }], { separador: ';' });
    expect(out).toBe('a;b\n1;2');
  });

  it('respeta headers explícitos', () => {
    const out = serializarCSV([{ a: '1', b: '2', c: '3' }], { headers: ['b', 'a'] });
    expect(out).toBe('b,a\n2,1');
  });

  it('array vacío → cadena vacía', () => {
    expect(serializarCSV([])).toBe('');
  });

  it('round-trip: parsearCSV ↔ serializarCSV', () => {
    const csv = 'nombre,monto\nAna,1000\n"Bob, Jr",2000';
    const objetos = parsearCSVaObjetos(csv);
    const re = serializarCSV(objetos);
    expect(re).toBe(csv);
  });
});
