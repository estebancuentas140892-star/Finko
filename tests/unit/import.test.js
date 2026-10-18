import { describe, it, expect } from 'vitest';
import {
  procesarCSV,
  hashGasto,
  validarFila,
  normalizarFila,
  parsearFecha,
  parsearMonto,
} from '../../modules/dominio/import/logic.js';
import { gastosACSV } from '../../modules/dominio/export/logic.js';

// ── parsearFecha() ────────────────────────────────────────────────

describe('parsearFecha()', () => {
  it('acepta YYYY-MM-DD', () => {
    expect(parsearFecha('2026-05-15')).toBe('2026-05-15');
  });

  it('acepta YYYY/MM/DD', () => {
    expect(parsearFecha('2026/05/15')).toBe('2026-05-15');
  });

  it('acepta DD/MM/YYYY (formato colombiano)', () => {
    expect(parsearFecha('15/05/2026')).toBe('2026-05-15');
  });

  it('acepta DD-MM-YYYY', () => {
    expect(parsearFecha('15-05-2026')).toBe('2026-05-15');
  });

  it('pad de un dígito a dos', () => {
    expect(parsearFecha('5/3/2026')).toBe('2026-03-05');
  });

  it('rechaza día > 31', () => {
    expect(parsearFecha('32/05/2026')).toBe(null);
  });

  it('rechaza mes > 12', () => {
    expect(parsearFecha('15/13/2026')).toBe(null);
  });

  it('rechaza 31 de febrero', () => {
    expect(parsearFecha('31/02/2026')).toBe(null);
  });

  it('valida bisiestos: acepta 29-feb-2024', () => {
    expect(parsearFecha('29/02/2024')).toBe('2024-02-29');
  });

  it('rechaza 29-feb en año no bisiesto', () => {
    expect(parsearFecha('29/02/2025')).toBe(null);
  });

  it('cadena vacía → null', () => {
    expect(parsearFecha('')).toBe(null);
  });

  it('null/undefined → null', () => {
    expect(parsearFecha(null)).toBe(null);
    expect(parsearFecha(undefined)).toBe(null);
  });

  it('texto no fecha → null', () => {
    expect(parsearFecha('ayer')).toBe(null);
  });

  it('trimea espacios', () => {
    expect(parsearFecha('  2026-05-15  ')).toBe('2026-05-15');
  });
});

// ── parsearMonto() ────────────────────────────────────────────────

describe('parsearMonto()', () => {
  it('número entero simple', () => {
    expect(parsearMonto('200000')).toBe(200_000);
  });

  it('con símbolo $', () => {
    expect(parsearMonto('$200000')).toBe(200_000);
  });

  it('separador de miles con punto (formato CO)', () => {
    expect(parsearMonto('200.000')).toBe(200_000);
  });

  it('separador de miles con coma (formato US)', () => {
    expect(parsearMonto('200,000')).toBe(200_000);
  });

  it('decimales con coma (CO)', () => {
    expect(parsearMonto('1234,56')).toBeCloseTo(1234.56);
  });

  it('decimales con punto (US)', () => {
    expect(parsearMonto('1234.56')).toBeCloseTo(1234.56);
  });

  it('formato CO completo: 1.234.567,89', () => {
    expect(parsearMonto('1.234.567,89')).toBeCloseTo(1_234_567.89);
  });

  it('formato US completo: 1,234,567.89', () => {
    expect(parsearMonto('1,234,567.89')).toBeCloseTo(1_234_567.89);
  });

  it('rechaza negativos', () => {
    expect(parsearMonto('-1000')).toBe(null);
  });

  it('vacío → null', () => {
    expect(parsearMonto('')).toBe(null);
  });

  it('texto no numérico → null', () => {
    expect(parsearMonto('mucho')).toBe(null);
  });

  it('cero es válido (lo descarta validarFila después)', () => {
    expect(parsearMonto('0')).toBe(0);
  });

  it('ignora espacios internos', () => {
    expect(parsearMonto('200 000')).toBe(200_000);
  });
});

// ── hashGasto() ───────────────────────────────────────────────────

describe('hashGasto()', () => {
  it('hash idéntico para dos gastos equivalentes', () => {
    const a = { fecha: '2026-05-15', monto: 200_000, descripcion: 'Mercado' };
    const b = { fecha: '2026-05-15', monto: 200_000, descripcion: 'mercado' };
    expect(hashGasto(a)).toBe(hashGasto(b));
  });

  it('hash distinto para fecha distinta', () => {
    const a = { fecha: '2026-05-15', monto: 200_000, descripcion: 'X' };
    const b = { fecha: '2026-05-16', monto: 200_000, descripcion: 'X' };
    expect(hashGasto(a)).not.toBe(hashGasto(b));
  });

  it('hash distinto para monto distinto', () => {
    const a = { fecha: '2026-05-15', monto: 200_000, descripcion: 'X' };
    const b = { fecha: '2026-05-15', monto: 300_000, descripcion: 'X' };
    expect(hashGasto(a)).not.toBe(hashGasto(b));
  });

  it('redondea monto antes de hashear (200000.99 == 200001)', () => {
    const a = { fecha: '2026-05-15', monto: 200_000.5,  descripcion: 'X' };
    const b = { fecha: '2026-05-15', monto: 200_000.49, descripcion: 'X' };
    expect(hashGasto(a)).not.toBe(hashGasto(b));
  });

  it('ignora espacios al inicio/fin de descripción', () => {
    const a = { fecha: '2026-05-15', monto: 100, descripcion: '  Café  ' };
    const b = { fecha: '2026-05-15', monto: 100, descripcion: 'Café' };
    expect(hashGasto(a)).toBe(hashGasto(b));
  });
});

// ── validarFila() ─────────────────────────────────────────────────

describe('validarFila()', () => {
  const filaValida = {
    fecha: '2026-05-15',
    monto: '200000',
    descripcion: 'Mercado',
  };

  it('fila válida → sin errores', () => {
    expect(validarFila(filaValida)).toEqual([]);
  });

  it('fecha vacía → error', () => {
    const errores = validarFila({ ...filaValida, fecha: '' });
    expect(errores.length).toBeGreaterThan(0);
    expect(errores[0]).toMatch(/fecha/i);
  });

  it('fecha inválida → error', () => {
    const errores = validarFila({ ...filaValida, fecha: '32/13/2026' });
    expect(errores[0]).toMatch(/fecha/i);
  });

  it('monto vacío → error', () => {
    const errores = validarFila({ ...filaValida, monto: '' });
    expect(errores.some(e => /monto/i.test(e))).toBe(true);
  });

  it('monto cero → error', () => {
    const errores = validarFila({ ...filaValida, monto: '0' });
    expect(errores.some(e => /mayor a 0/i.test(e))).toBe(true);
  });

  it('monto negativo → error', () => {
    const errores = validarFila({ ...filaValida, monto: '-100' });
    expect(errores.some(e => /monto/i.test(e))).toBe(true);
  });

  it('descripción vacía → error', () => {
    const errores = validarFila({ ...filaValida, descripcion: '   ' });
    expect(errores.some(e => /descripci/i.test(e))).toBe(true);
  });

  it('múltiples errores se acumulan', () => {
    const errores = validarFila({ fecha: '', monto: '', descripcion: '' });
    expect(errores.length).toBeGreaterThanOrEqual(3);
  });
});

// ── normalizarFila() ──────────────────────────────────────────────

describe('normalizarFila()', () => {
  it('convierte fecha y monto a sus tipos correctos', () => {
    const out = normalizarFila({
      fecha: '15/05/2026',
      monto: '200000',
      descripcion: 'Mercado',
    });
    expect(out.fecha).toBe('2026-05-15');
    expect(out.monto).toBe(200_000);
    expect(typeof out.monto).toBe('number');
  });

  it('trimea descripción y nota', () => {
    const out = normalizarFila({
      fecha: '2026-05-15',
      monto: '100',
      descripcion: '  Café  ',
      nota: '  para llevar  ',
    });
    expect(out.descripcion).toBe('Café');
    expect(out.nota).toBe('para llevar');
  });

  it('categoría vacía → "Otros"', () => {
    const out = normalizarFila({
      fecha: '2026-05-15', monto: '100', descripcion: 'X', categoria: '',
    });
    expect(out.categoria).toBe('Otros');
  });

  it('categoría definida se preserva', () => {
    const out = normalizarFila({
      fecha: '2026-05-15', monto: '100', descripcion: 'X', categoria: 'Transporte',
    });
    expect(out.categoria).toBe('Transporte');
  });

  it('matchea cuenta por nombre (case-insensitive)', () => {
    const cuentas = new Map([['nequi', 'cu-123']]);
    const out = normalizarFila({
      fecha: '2026-05-15', monto: '100', descripcion: 'X', cuenta: 'NEQUI',
    }, cuentas);
    expect(out.cuentaId).toBe('cu-123');
  });

  it('cuenta no existente → cuentaId = null', () => {
    const out = normalizarFila({
      fecha: '2026-05-15', monto: '100', descripcion: 'X', cuenta: 'Inexistente',
    }, new Map());
    expect(out.cuentaId).toBe(null);
  });

  it('cuenta vacía → cuentaId = null', () => {
    const out = normalizarFila({
      fecha: '2026-05-15', monto: '100', descripcion: 'X', cuenta: '',
    });
    expect(out.cuentaId).toBe(null);
  });

  it('no incluye id (lo asigna crud)', () => {
    const out = normalizarFila({
      fecha: '2026-05-15', monto: '100', descripcion: 'X',
    });
    expect(out).not.toHaveProperty('id');
  });
});

// ── procesarCSV() ─────────────────────────────────────────────────

describe('procesarCSV()', () => {
  const csvSimple = `fecha,monto,descripcion,categoria
2026-05-15,200000,Mercado,Alimentación
2026-05-16,15000,Café,Alimentación
2026-05-17,50000,Uber,Transporte`;

  it('parsea 3 gastos válidos sin duplicados', () => {
    const out = procesarCSV(csvSimple, [], []);
    expect(out.total).toBe(3);
    expect(out.validos).toHaveLength(3);
    expect(out.duplicados).toHaveLength(0);
    expect(out.errores).toHaveLength(0);
  });

  it('texto vacío → error global', () => {
    const out = procesarCSV('', [], []);
    expect(out.error).toMatch(/vac[íi]o/i);
    expect(out.validos).toHaveLength(0);
  });

  it('headers obligatorios faltantes → error global', () => {
    const csv = 'fecha,monto\n2026-05-15,100';
    const out = procesarCSV(csv, [], []);
    expect(out.error).toMatch(/descripcion|columnas/i);
  });

  it('detecta duplicados contra gastos existentes', () => {
    const existentes = [{
      id: 'g1', fecha: '2026-05-15', monto: 200_000, descripcion: 'Mercado',
    }];
    const out = procesarCSV(csvSimple, existentes, []);
    expect(out.duplicados).toHaveLength(1);
    expect(out.validos).toHaveLength(2);
  });

  it('detecta duplicados internos dentro del propio CSV', () => {
    const csv = `fecha,monto,descripcion
2026-05-15,100,Café
2026-05-15,100,Café`;
    const out = procesarCSV(csv, [], []);
    expect(out.validos).toHaveLength(1);
    expect(out.duplicados).toHaveLength(1);
  });

  it('reporta errores por fila con número de línea', () => {
    const csv = `fecha,monto,descripcion
2026-05-15,200000,Mercado
fecha-mala,100,X
2026-05-17,0,Y`;
    const out = procesarCSV(csv, [], []);
    expect(out.validos).toHaveLength(1);
    expect(out.errores).toHaveLength(2);
    expect(out.errores[0].fila).toBe(3); // 1 header + 1 fila válida + esta
    expect(out.errores[1].fila).toBe(4);
  });

  it('headers desconocidos se listan pero no bloquean', () => {
    const csv = `fecha,monto,descripcion,banco_extra
2026-05-15,100,X,Bancolombia`;
    const out = procesarCSV(csv, [], []);
    expect(out.headersDesconocidos).toContain('banco_extra');
    expect(out.validos).toHaveLength(1);
  });

  it('matchea cuenta cuando existe', () => {
    const csv = `fecha,monto,descripcion,cuenta
2026-05-15,100,X,Nequi`;
    const cuentas = [{ id: 'cu-1', nombre: 'Nequi', activa: true }];
    const out = procesarCSV(csv, [], cuentas);
    expect(out.validos[0].datos.cuentaId).toBe('cu-1');
  });

  it('ignora cuentas inactivas para match', () => {
    const csv = `fecha,monto,descripcion,cuenta
2026-05-15,100,X,Nequi`;
    const cuentas = [{ id: 'cu-1', nombre: 'Nequi', activa: false }];
    const out = procesarCSV(csv, [], cuentas);
    expect(out.validos[0].datos.cuentaId).toBe(null);
  });

  it('headers case-insensitive', () => {
    const csv = `Fecha,MONTO,Descripcion
2026-05-15,100,X`;
    const out = procesarCSV(csv, [], []);
    expect(out.validos).toHaveLength(1);
  });

  it('separador punto y coma se detecta', () => {
    const csv = `fecha;monto;descripcion
2026-05-15;200000;Mercado`;
    const out = procesarCSV(csv, [], []);
    expect(out.validos).toHaveLength(1);
    expect(out.validos[0].datos.descripcion).toBe('Mercado');
  });

  it('numera correctamente las filas (header = 1)', () => {
    const csv = `fecha,monto,descripcion
2026-05-15,100,X`;
    const out = procesarCSV(csv, [], []);
    expect(out.validos[0].fila).toBe(2);
  });
});

// ── BUG-029 (HF.0c, ADR 091 P4) ───────────────────────────────────
// El gasto importado queda sin efecto en el saldo, y el CSV que exporta Finko
// vuelve a entrar igual. Datos inventados.

describe('BUG-029 - el importador no crea dinero y lee lo que Finko exporta', () => {
  const cuentas = [
    { id: 'cta-nomina',  nombre: 'Cuenta Nómina',  activa: true },
    { id: 'cta-ahorros', nombre: 'Cuenta Ahorros', activa: true },
  ];
  // Como los deja el formulario desde TX.9a: sin descripción, la categoría nombra el gasto.
  const gastos = [
    { id: 'g-1', descripcion: '', monto: 30_000, categoria: 'Café',       fecha: '2026-10-03', cuentaId: 'cta-nomina',  nota: '' },
    { id: 'g-2', descripcion: '', monto: 30_000, categoria: 'Transporte', fecha: '2026-10-03', cuentaId: 'cta-ahorros', nota: 'taxi de prueba' },
    { id: 'g-3', descripcion: 'Farmacia de prueba', monto: 52_500, categoria: 'Salud', fecha: '2026-10-10', nota: '' },
  ];
  const nombres = new Map(cuentas.map(c => [c.nombre.toLowerCase(), c.id]));

  it('el gasto importado conserva su cuenta y queda marcado sin efecto en el saldo', () => {
    const out = normalizarFila({ fecha: '2026-10-05', monto: '120000', descripcion: 'Mercado de prueba', cuenta: 'Cuenta Nómina' }, nombres);
    expect(out).toMatchObject({ cuentaId: 'cta-nomina', sinEfectoSaldo: true });
  });

  it('sin cuenta reconocida también queda sin efecto: la marca es del origen, no de la cuenta', () => {
    expect(normalizarFila({ fecha: '2026-10-05', monto: '100', descripcion: 'X' }).sinEfectoSaldo).toBe(true);
  });

  it('una fila sin descripción es válida si trae categoría (TX.9a)', () => {
    expect(validarFila({ fecha: '2026-10-03', monto: '30000', descripcion: '', categoria: 'Café' })).toEqual([]);
    expect(validarFila({ fecha: '2026-10-03', monto: '30000', descripcion: '  ', categoria: '' }).some(e => /descripci/i.test(e))).toBe(true);
  });

  it('sin descripción, la categoría nombra el gasto para detectar duplicados', () => {
    const cafe = { fecha: '2026-10-03', monto: 30_000, descripcion: '', categoria: 'Café' };
    expect(hashGasto(cafe)).not.toBe(hashGasto({ ...cafe, categoria: 'Transporte' }));
    expect(hashGasto(cafe)).toBe(hashGasto({ ...cafe, categoria: 'café' }));
    // Con descripción manda la descripción, como siempre.
    expect(hashGasto({ ...cafe, descripcion: 'Tinto' })).toBe(hashGasto({ ...cafe, descripcion: 'Tinto', categoria: 'Otros' }));
  });

  it('ida y vuelta: lo exportado entra completo en una app sin gastos', () => {
    const out = procesarCSV(gastosACSV(gastos, cuentas), [], cuentas);
    expect(out.errores).toEqual([]);
    expect(out.duplicados).toEqual([]);
    const datos = out.validos.map(v => v.datos).sort((a, b) => a.categoria.localeCompare(b.categoria));
    expect(datos).toEqual([
      { fecha: '2026-10-03', monto: 30_000, descripcion: '', categoria: 'Café',       cuentaId: 'cta-nomina',  nota: '',               sinEfectoSaldo: true },
      { fecha: '2026-10-10', monto: 52_500, descripcion: 'Farmacia de prueba', categoria: 'Salud', cuentaId: null, nota: '', sinEfectoSaldo: true },
      { fecha: '2026-10-03', monto: 30_000, descripcion: '', categoria: 'Transporte', cuentaId: 'cta-ahorros', nota: 'taxi de prueba', sinEfectoSaldo: true },
    ]);
  });

  it('ida y vuelta en la misma app: todo es duplicado, nada entra dos veces', () => {
    const out = procesarCSV(gastosACSV(gastos, cuentas), gastos, cuentas);
    expect(out.validos).toEqual([]);
    expect(out.duplicados).toHaveLength(3);
  });
});
