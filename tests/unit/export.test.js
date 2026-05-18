import { describe, it, expect } from 'vitest';
import { gastosACSV } from '../../modules/dominio/export/logic.js';

const CUENTA = { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Digital', saldo: 0, activa: true, fechaCreacion: '' };

const gasto = (overrides = {}) => ({
  id: '1',
  fecha: '2026-01-15',
  monto: 50000,
  descripcion: 'Mercado',
  categoria: 'Alimentación',
  cuentaId: null,
  nota: '',
  ...overrides,
});

// ── gastosACSV() ──────────────────────────────────────────────────

describe('gastosACSV()', () => {
  it('devuelve string vacío si no hay gastos', () => {
    expect(gastosACSV([])).toBe('');
  });

  it('devuelve string vacío si gastos es null/undefined', () => {
    expect(gastosACSV(null)).toBe('');
    expect(gastosACSV(undefined)).toBe('');
  });

  it('incluye BOM UTF-8 al inicio', () => {
    const csv = gastosACSV([gasto()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('primera línea contiene los 6 headers en orden correcto', () => {
    const csv = gastosACSV([gasto()]);
    const primeraLinea = csv.slice(1).split('\n')[0];
    expect(primeraLinea).toBe('fecha,monto,descripcion,categoria,cuenta,nota');
  });

  it('serializa un gasto sin cuenta ni nota correctamente', () => {
    const csv = gastosACSV([gasto()]);
    const lineas = csv.slice(1).split('\n');
    expect(lineas[1]).toBe('2026-01-15,50000,Mercado,Alimentación,,');
  });

  it('resuelve cuentaId al nombre legible de la cuenta', () => {
    const csv = gastosACSV([gasto({ cuentaId: 'c1' })], [CUENTA]);
    expect(csv).toContain('Nequi');
  });

  it('deja la columna cuenta vacía si cuentaId no matchea', () => {
    const csv = gastosACSV([gasto({ cuentaId: 'x999' })], [CUENTA]);
    const lineas = csv.slice(1).split('\n');
    expect(lineas[1]).toContain(',,');
  });

  it('incluye la nota cuando existe', () => {
    const csv = gastosACSV([gasto({ nota: 'Con tarjeta' })]);
    expect(csv).toContain('Con tarjeta');
  });

  it('ordena por fecha más reciente primero', () => {
    const gastos = [
      gasto({ id: '1', fecha: '2026-01-01' }),
      gasto({ id: '2', fecha: '2026-03-01' }),
      gasto({ id: '3', fecha: '2026-02-01' }),
    ];
    const csv = gastosACSV(gastos);
    const lineas = csv.slice(1).split('\n').slice(1);
    expect(lineas[0]).toContain('2026-03-01');
    expect(lineas[1]).toContain('2026-02-01');
    expect(lineas[2]).toContain('2026-01-01');
  });

  it('no muta el array original', () => {
    const gastos = [gasto({ id: '2', fecha: '2026-01-01' }), gasto({ id: '1', fecha: '2026-03-01' })];
    const primerIdAntes = gastos[0].id;
    gastosACSV(gastos);
    expect(gastos[0].id).toBe(primerIdAntes);
  });

  it('escapea comas en descripcion con comillas', () => {
    const csv = gastosACSV([gasto({ descripcion: 'Mercado, frutas y verduras' })]);
    expect(csv).toContain('"Mercado, frutas y verduras"');
  });

  it('escapea comillas dobles en campos', () => {
    const csv = gastosACSV([gasto({ descripcion: 'Restaurante "El buen sabor"' })]);
    expect(csv).toContain('"Restaurante ""El buen sabor"""');
  });

  it('exporta múltiples gastos con una fila por gasto', () => {
    const gastos = [
      gasto({ id: '1', fecha: '2026-02-01', descripcion: 'A' }),
      gasto({ id: '2', fecha: '2026-01-01', descripcion: 'B' }),
    ];
    const csv = gastosACSV(gastos);
    const lineas = csv.slice(1).split('\n').filter(Boolean);
    expect(lineas).toHaveLength(3); // header + 2 filas
  });
});
