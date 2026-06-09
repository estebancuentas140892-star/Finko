import { describe, it, expect } from 'vitest';
import {
  legalVigente,
  legalDelAnio,
  aniosPublicados,
  estadoVigenciaLegal,
} from '../../modules/core/constants.js';

// Fechas en hora local (mes 0-indexado) para evitar corrimientos de zona.
const enAnio = (anio) => new Date(anio, 5, 15);

describe('legalVigente', () => {
  it('devuelve los valores del año actual cuando existe entrada', () => {
    const v = legalVigente(enAnio(2026));
    expect(v.anio).toBe(2026);
    expect(v.smmlv).toBe(1_750_905);
    expect(v.uvt).toBe(52_374);
  });

  it('respeta un año histórico publicado', () => {
    const v = legalVigente(enAnio(2025));
    expect(v.anio).toBe(2025);
    expect(v.smmlv).toBe(1_300_000);
  });

  it('cae al último año publicado cuando el año en curso no tiene entrada', () => {
    const v = legalVigente(enAnio(2027));
    expect(v.anio).toBe(2026);
    expect(v.smmlv).toBe(1_750_905);
  });

  it('mantiene el fallback varios años hacia adelante', () => {
    expect(legalVigente(enAnio(2030)).anio).toBe(2026);
  });
});

describe('legalDelAnio', () => {
  it('devuelve el objeto de un año publicado', () => {
    expect(legalDelAnio(2026)?.uvt).toBe(52_374);
  });

  it('devuelve null para un año sin valores cargados', () => {
    expect(legalDelAnio(2027)).toBeNull();
    expect(legalDelAnio(1999)).toBeNull();
  });
});

describe('aniosPublicados', () => {
  it('lista solo los años con valores cargados, ordenados', () => {
    const anios = aniosPublicados();
    expect(anios).toContain(2025);
    expect(anios).toContain(2026);
    expect(anios).not.toContain(2027); // 2027 está como null
    expect([...anios]).toEqual([...anios].sort((a, b) => a - b));
  });
});

describe('estadoVigenciaLegal', () => {
  it('no marca desactualizado cuando el año en curso tiene valores', () => {
    const e = estadoVigenciaLegal(enAnio(2026));
    expect(e.desactualizado).toBe(false);
    expect(e.anioActual).toBe(2026);
    expect(e.anioVigente).toBe(2026);
  });

  it('no marca desactualizado en un año histórico publicado', () => {
    const e = estadoVigenciaLegal(enAnio(2025));
    expect(e.desactualizado).toBe(false);
    expect(e.anioVigente).toBe(2025);
  });

  it('marca desactualizado cuando el año en curso aún no tiene valores', () => {
    const e = estadoVigenciaLegal(enAnio(2027));
    expect(e.desactualizado).toBe(true);
    expect(e.anioActual).toBe(2027);
    expect(e.anioVigente).toBe(2026); // referencia provisional
  });

  it('sigue marcando desactualizado varios años después', () => {
    const e = estadoVigenciaLegal(enAnio(2031));
    expect(e.desactualizado).toBe(true);
    expect(e.anioActual).toBe(2031);
    expect(e.anioVigente).toBe(2026);
  });

  it('usa la fecha actual por defecto y retorna las tres claves', () => {
    const e = estadoVigenciaLegal();
    expect(typeof e.desactualizado).toBe('boolean');
    expect(Number.isInteger(e.anioActual)).toBe(true);
    expect(Number.isInteger(e.anioVigente)).toBe(true);
    expect(e.anioVigente).toBeLessThanOrEqual(e.anioActual);
  });
});
