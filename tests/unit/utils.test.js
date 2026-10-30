import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { f, hoy, fechaLegible, fechaDiaMes, tiempoRelativo, formateadorFecha } from '../../modules/infra/utils.js';

describe('f() - formato moneda COP', () => {
  it('formatea cero', () => {
    expect(f(0)).toBe('$0');
  });

  it('formatea valores menores a 1000 sin separador', () => {
    expect(f(500)).toBe('$500');
    expect(f(999)).toBe('$999');
  });

  it('agrega punto de miles en valores >= 1000', () => {
    expect(f(1000)).toBe('$1.000');
    expect(f(1500)).toBe('$1.500');
  });

  it('formatea millones correctamente', () => {
    expect(f(1_423_500)).toBe('$1.423.500');
    expect(f(10_000_000)).toBe('$10.000.000');
  });

  it('redondea decimales (COP no usa centavos en UI)', () => {
    expect(f(1500.75)).toBe('$1.501');
    expect(f(1500.4)).toBe('$1.500');
  });

  it('maneja valores negativos', () => {
    expect(f(-500)).toBe('-$500');
    expect(f(-1_000_000)).toBe('-$1.000.000');
  });

  it('maneja valores muy grandes', () => {
    expect(f(100_000_000)).toBe('$100.000.000');
  });
});

describe('hoy() - fecha de hoy', () => {
  it('devuelve string en formato YYYY-MM-DD', () => {
    const result = hoy();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('año, mes y día corresponden a la fecha real', () => {
    const result = hoy();
    const d = new Date();
    const esperado = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(result).toBe(esperado);
  });

  it('devuelve siempre 10 caracteres', () => {
    expect(hoy()).toHaveLength(10);
  });
});

describe('fechaLegible() - el año solo si no es el de hoy (ADR 102)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 29, 10, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('del año en curso: día y mes en tres letras, sin año', () => {
    expect(fechaLegible('2026-10-28')).toBe('28 de oct');
    expect(fechaLegible('2026-05-12')).toBe('12 de may');
  });

  it('del año anterior y del siguiente: con el año', () => {
    expect(fechaLegible('2024-06-30')).toBe('30 de jun de 2024');
    expect(fechaLegible('2025-12-31')).toBe('31 de dic de 2025');
    expect(fechaLegible('2027-04-30')).toBe('30 de abr de 2027');
  });

  it('septiembre también en tres letras (Intl diría "sept")', () => {
    expect(fechaLegible('2026-09-05')).toBe('5 de sep');
  });

  it('el año lo pone el reloj: el 1 de enero, lo del 31 de diciembre ya es de otro año', () => {
    vi.setSystemTime(new Date(2027, 0, 1, 0, 30, 0));
    expect(fechaLegible('2026-12-31')).toBe('31 de dic de 2026');
    expect(fechaLegible('2027-01-01')).toBe('1 de ene');
  });

  it('no tiene off-by-one por zona horaria: lee el día del texto', () => {
    expect(fechaLegible('2026-03-01')).toBe('1 de mar');
  });

  it('sin fecha válida devuelve texto vacío', () => {
    expect(fechaLegible(null)).toBe('');
    expect(fechaLegible('')).toBe('');
    expect(fechaLegible('2026-13-01')).toBe('');
  });
});

describe('fechaDiaMes() - día y mes, para listas agrupadas por mes (ADR 102 D2)', () => {
  it('nunca pone el año', () => {
    expect(fechaDiaMes('2026-10-28')).toBe('28 de oct');
    expect(fechaDiaMes('2024-06-30')).toBe('30 de jun');
  });

  it('sin fecha válida devuelve texto vacío', () => {
    expect(fechaDiaMes(undefined)).toBe('');
  });
});

describe('formateadorFecha() - Intl.DateTimeFormat cacheado (PERF.7)', () => {
  it('devuelve un Intl.DateTimeFormat con format()', () => {
    const fmt = formateadorFecha('es-CO', { year: 'numeric', timeZone: 'UTC' });
    expect(typeof fmt.format).toBe('function');
  });

  it('reutiliza la misma instancia para la misma firma (locale + opciones)', () => {
    const a = formateadorFecha('es-CO', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    const b = formateadorFecha('es-CO', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    expect(a).toBe(b);
  });

  it('devuelve instancias distintas para firmas distintas', () => {
    const largo = formateadorFecha('es-CO', { month: 'long', timeZone: 'UTC' });
    const corto = formateadorFecha('es-CO', { month: 'short', timeZone: 'UTC' });
    expect(largo).not.toBe(corto);
  });

  it('su format() coincide con toLocaleDateString equivalente', () => {
    const opciones = { day: 'numeric', month: 'short', timeZone: 'UTC' };
    const d = new Date('2026-07-01T12:00:00Z');
    expect(formateadorFecha('es-CO', opciones).format(d)).toBe(d.toLocaleDateString('es-CO', opciones));
  });
});

describe('tiempoRelativo() - días como texto natural (PE.2)', () => {
  it('0 días → hoy, 1 día → ayer', () => {
    expect(tiempoRelativo(0)).toBe('hoy');
    expect(tiempoRelativo(1)).toBe('ayer');
  });

  it('2 a 6 días → hace N días', () => {
    expect(tiempoRelativo(2)).toBe('hace 2 días');
    expect(tiempoRelativo(6)).toBe('hace 6 días');
  });

  it('7 a 29 días → semanas, con singular', () => {
    expect(tiempoRelativo(7)).toBe('hace 1 semana');
    expect(tiempoRelativo(13)).toBe('hace 1 semana');
    expect(tiempoRelativo(15)).toBe('hace 2 semanas');
    expect(tiempoRelativo(29)).toBe('hace 4 semanas');
  });

  it('30 a 364 días → meses, con singular', () => {
    expect(tiempoRelativo(30)).toBe('hace 1 mes');
    expect(tiempoRelativo(59)).toBe('hace 1 mes');
    expect(tiempoRelativo(240)).toBe('hace 8 meses');
  });

  it('365+ días → años, con singular', () => {
    expect(tiempoRelativo(365)).toBe('hace 1 año');
    expect(tiempoRelativo(1825)).toBe('hace 5 años');
  });

  it('valores negativos o inválidos cuentan como hoy', () => {
    expect(tiempoRelativo(-3)).toBe('hoy');
    expect(tiempoRelativo(NaN)).toBe('hoy');
    expect(tiempoRelativo(undefined)).toBe('hoy');
  });

  it('trunca decimales antes de clasificar', () => {
    expect(tiempoRelativo(1.9)).toBe('ayer');
    expect(tiempoRelativo(6.99)).toBe('hace 6 días');
  });
});