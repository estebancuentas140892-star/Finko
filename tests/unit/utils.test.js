import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { f, hoy, fechaLegible, dialogo } from '../../modules/infra/utils.js';

describe('f() — formato moneda COP', () => {
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

describe('hoy() — fecha de hoy', () => {
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

describe('fechaLegible() — formato largo en español', () => {
  it('formatea una fecha ISO a texto legible', () => {
    const result = fechaLegible('2026-05-12');
    // Verificamos que contiene el año y que tiene formato verbal.
    expect(result).toContain('2026');
    expect(result.length).toBeGreaterThan(8);
  });

  it('no tiene off-by-one por zona horaria', () => {
    // Verifica que el día 12 aparezca en la salida.
    const result = fechaLegible('2026-05-12');
    expect(result).toContain('12');
  });
});

describe('dialogo() — wrapper de diálogo', () => {
  beforeEach(() => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('tipo confirm: delega en window.confirm y retorna su valor', () => {
    window.confirm.mockReturnValue(false);
    expect(dialogo('¿Eliminar?', 'confirm')).toBe(false);
    expect(window.confirm).toHaveBeenCalledWith('¿Eliminar?');
  });

  it('tipo confirm: valor por defecto', () => {
    window.confirm.mockReturnValue(true);
    expect(dialogo('¿Continuar?')).toBe(true);
  });

  it('tipo alert: llama window.alert y retorna true', () => {
    expect(dialogo('Guardado', 'alert')).toBe(true);
    expect(window.alert).toHaveBeenCalledWith('Guardado');
  });
});
