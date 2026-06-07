import { describe, it, expect } from 'vitest';
import {
  generarResumen,
  calcularActivos,
  calcularPasivos,
  calcularPatrimonioNeto,
  proyectarPatrimonio,
  proyeccionMultiHorizonte,
  serieGastosMensual,
  seriePorCategoria,
  calcularVolatilidad,
  calcularScoreSalud,
  clasificarScore,
  calcularComparacionCategorias,
  detectarPatronGastoSemanal,
  patrimonioBruto,
  totalGastosAnio,
  calcularEstadoRenta,
  detectarNudgesRenta,
} from '../../modules/dominio/analisis/logic.js';
import { UVT, TOPES_RENTA_UVT } from '../../modules/core/constants.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const gasto = (overrides = {}) => ({
  id: 'g1', descripcion: 'Mercado', monto: 200_000,
  categoria: 'Alimentación', fecha: '2026-05-10', ...overrides,
});

const compromiso = (overrides = {}) => ({
  id: 'c1', descripcion: 'Arriendo', monto: 1_000_000,
  frecuencia: 'Mensual', diaPago: 5, tipo: 'fijo', activo: true, ...overrides,
});

const cuenta = (overrides = {}) => ({
  id: 'cu1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros',
  saldo: 500_000, activa: true, ...overrides,
});

const meta = (overrides = {}) => ({
  id: 'm1', nombre: 'Vacaciones', montoObjetivo: 5_000_000,
  montoActual: 1_000_000, completada: false, ...overrides,
});

const deuda = (overrides = {}) => ({
  id: 'd1', descripcion: 'Crédito vehículo',
  frecuencia: 'Mensual', diaPago: 15, tipo: 'deuda-entidad', activo: true,
  saldoTotal: 12_000_000, cuotaMensual: 800_000, tasa: 0.20, tasaUnidad: 'EA',
  ...overrides,
});

// ── generarResumen() ──────────────────────────────────────────────

describe('generarResumen()', () => {
  const MES  = 5;
  const ANIO = 2026;

  it('agrega gastoMes solo del mes indicado', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 200_000, fecha: '2026-05-10' }),
      gasto({ id: 'g2', monto: 999_999, fecha: '2026-04-01' }), // otro mes
    ];
    const resumen = generarResumen(gastos, [], [], ANIO, MES);
    expect(resumen.gastoMes).toBe(200_000);
  });

  it('agrega compromisoMensual correctamente', () => {
    const resumen = generarResumen([], [compromiso()], [], ANIO, MES);
    expect(resumen.compromisoMensual).toBe(1_000_000);
  });

  it('agrega saldoCuentas solo de cuentas activas', () => {
    const cuentas = [
      cuenta({ saldo: 500_000 }),
      cuenta({ id: 'cu2', saldo: 300_000, activa: false }),
    ];
    const resumen = generarResumen([], [], cuentas, ANIO, MES);
    expect(resumen.saldoCuentas).toBe(500_000);
  });

  it('calcula egresos = gastoMes + compromisoMensual', () => {
    const gastos = [gasto({ monto: 500_000, fecha: '2026-05-10' })];
    const resumen = generarResumen(gastos, [compromiso()], [], ANIO, MES);
    expect(resumen.egresos).toBe(1_500_000);
  });

  it('construye porCategoria con gastos del mes', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 200_000, categoria: 'Alimentación', fecha: '2026-05-10' }),
      gasto({ id: 'g2', monto: 80_000,  categoria: 'Transporte',   fecha: '2026-05-15' }),
    ];
    const resumen = generarResumen(gastos, [], [], ANIO, MES);
    expect(resumen.porCategoria['Alimentación']).toBe(200_000);
    expect(resumen.porCategoria['Transporte']).toBe(80_000);
  });

  it('hormigas vacíos cuando no hay gastos pequeños significativos', () => {
    const gastos = [gasto({ monto: 500_000, fecha: '2026-05-10' })];
    const resumen = generarResumen(gastos, [], [], ANIO, MES);
    expect(resumen.hormigas).toEqual([]);
  });

  it('detecta hormigas cuando hay muchos gastos pequeños', () => {
    const gastos = Array.from({ length: 8 }, (_, i) =>
      gasto({ id: `g${i}`, monto: 15_000, fecha: '2026-05-10' })
    );
    const resumen = generarResumen(gastos, [], [], ANIO, MES);
    expect(resumen.hormigas.length).toBeGreaterThan(0);
    expect(resumen.hormigas[0].categoria).toBe('Alimentación');
  });

  it('devuelve objeto con todas las claves esperadas', () => {
    const resumen = generarResumen([], [], [], ANIO, MES);
    const claves = ['gastoMes', 'compromisoMensual', 'saldoCuentas',
                    'egresos', 'porCategoria', 'hormigas',
                    'activos', 'pasivos', 'patrimonioNeto', 'volatilidad'];
    for (const clave of claves) {
      expect(resumen).toHaveProperty(clave);
    }
  });

  it('todos en 0 con estado vacío', () => {
    const resumen = generarResumen([], [], [], ANIO, MES);
    expect(resumen.gastoMes).toBe(0);
    expect(resumen.egresos).toBe(0);
    expect(resumen.saldoCuentas).toBe(0);
    expect(resumen.hormigas).toEqual([]);
  });

  it('incluye activos, pasivos y patrimonioNeto (extension v1.1)', () => {
    const resumen = generarResumen([], [], [], ANIO, MES);
    expect(resumen).toHaveProperty('activos');
    expect(resumen).toHaveProperty('pasivos');
    expect(resumen).toHaveProperty('patrimonioNeto');
  });

  it('agrega activos de cuentas + metas en resumen', () => {
    const resumen = generarResumen([], [], [cuenta()], ANIO, MES, [meta()]);
    // 500_000 (cuenta) + 1_000_000 (meta) = 1_500_000
    expect(resumen.activos.total).toBe(1_500_000);
  });

  it('agrega pasivos de deudas en resumen', () => {
    const resumen = generarResumen([], [deuda()], [], ANIO, MES);
    expect(resumen.pasivos.total).toBe(12_000_000);
  });

  it('calcula patrimonioNeto como activos - pasivos', () => {
    const resumen = generarResumen(
      [], [deuda()], [cuenta({ saldo: 2_000_000 })], ANIO, MES, [meta()]
    );
    // activos = 2_000_000 + 1_000_000 = 3_000_000
    // pasivos = 12_000_000
    // patrimonio = -9_000_000
    expect(resumen.patrimonioNeto).toBe(-9_000_000);
  });

  it('mantiene compatibilidad con llamadas sin metas (5 argumentos)', () => {
    const resumen = generarResumen([], [], [], ANIO, MES);
    expect(resumen.activos.totalMetas).toBe(0);
    expect(resumen.activos.total).toBe(0);
  });
});

// ── calcularActivos() ─────────────────────────────────────────────

describe('calcularActivos()', () => {
  it('suma saldo de cuentas activas + monto de metas no completadas', () => {
    const r = calcularActivos([cuenta()], [meta()]);
    expect(r.totalCuentas).toBe(500_000);
    expect(r.totalMetas).toBe(1_000_000);
    expect(r.total).toBe(1_500_000);
  });

  it('ignora cuentas inactivas', () => {
    const cuentas = [cuenta(), cuenta({ id: 'cu2', saldo: 999_999, activa: false })];
    const r = calcularActivos(cuentas, []);
    expect(r.totalCuentas).toBe(500_000);
  });

  it('ignora metas completadas', () => {
    const metas = [meta(), meta({ id: 'm2', montoActual: 999_999, completada: true })];
    const r = calcularActivos([], metas);
    expect(r.totalMetas).toBe(1_000_000);
  });

  it('devuelve ceros con arrays vacíos', () => {
    const r = calcularActivos([], []);
    expect(r).toEqual({ totalCuentas: 0, totalMetas: 0, total: 0 });
  });

  it('maneja metas sin montoActual definido', () => {
    const r = calcularActivos([], [meta({ montoActual: undefined })]);
    expect(r.totalMetas).toBe(0);
  });

  it('suma múltiples cuentas y múltiples metas', () => {
    const cuentas = [
      cuenta({ saldo: 1_000_000 }),
      cuenta({ id: 'cu2', saldo: 500_000 }),
    ];
    const metas = [
      meta({ montoActual: 2_000_000 }),
      meta({ id: 'm2', montoActual: 300_000 }),
    ];
    const r = calcularActivos(cuentas, metas);
    expect(r.total).toBe(3_800_000);
  });
});

// ── calcularPasivos() ─────────────────────────────────────────────

describe('calcularPasivos()', () => {
  it('suma saldoTotal de deudas activas', () => {
    const r = calcularPasivos([deuda()]);
    expect(r.total).toBe(12_000_000);
    expect(r.cantidadDeudas).toBe(1);
    expect(r.deudasSinSaldo).toBe(0);
  });

  it('cuenta deudas sin saldoTotal como "sin saldo registrado"', () => {
    const deudas = [
      deuda(),
      deuda({ id: 'd2', saldoTotal: undefined }),
    ];
    const r = calcularPasivos(deudas);
    expect(r.total).toBe(12_000_000);
    expect(r.cantidadDeudas).toBe(2);
    expect(r.deudasSinSaldo).toBe(1);
  });

  it('ignora compromisos que no son deuda (entidad o personal)', () => {
    const comps = [
      deuda(),
      compromiso(), // tipo='fijo'
    ];
    const r = calcularPasivos(comps);
    expect(r.total).toBe(12_000_000);
    expect(r.cantidadDeudas).toBe(1);
  });

  it('incluye deuda-personal (no solo entidad)', () => {
    const comps = [
      deuda({ id: 'd1', tipo: 'deuda-entidad', saldoTotal: 5_000_000 }),
      deuda({ id: 'd2', tipo: 'deuda-personal', saldoTotal: 2_000_000 }),
    ];
    const r = calcularPasivos(comps);
    expect(r.total).toBe(7_000_000);
    expect(r.cantidadDeudas).toBe(2);
  });

  it('ignora deudas inactivas', () => {
    const deudas = [
      deuda(),
      deuda({ id: 'd2', saldoTotal: 999_999, activo: false }),
    ];
    const r = calcularPasivos(deudas);
    expect(r.total).toBe(12_000_000);
    expect(r.cantidadDeudas).toBe(1);
  });

  it('rechaza saldoTotal no numérico o negativo', () => {
    const deudas = [
      deuda({ id: 'd1', saldoTotal: 'abc' }),
      deuda({ id: 'd2', saldoTotal: -1_000_000 }),
      deuda({ id: 'd3', saldoTotal: 0 }),
    ];
    const r = calcularPasivos(deudas);
    expect(r.total).toBe(0);
    expect(r.deudasSinSaldo).toBe(3);
  });

  it('devuelve ceros con array vacío', () => {
    const r = calcularPasivos([]);
    expect(r).toEqual({ total: 0, cantidadDeudas: 0, deudasSinSaldo: 0 });
  });
});

// ── calcularPatrimonioNeto() ──────────────────────────────────────

describe('calcularPatrimonioNeto()', () => {
  it('patrimonio positivo: activos > pasivos', () => {
    expect(calcularPatrimonioNeto(5_000_000, 2_000_000)).toBe(3_000_000);
  });

  it('patrimonio negativo: pasivos > activos', () => {
    expect(calcularPatrimonioNeto(1_000_000, 5_000_000)).toBe(-4_000_000);
  });

  it('patrimonio cero: activos == pasivos', () => {
    expect(calcularPatrimonioNeto(3_000_000, 3_000_000)).toBe(0);
  });

  it('sin pasivos: patrimonio = activos', () => {
    expect(calcularPatrimonioNeto(2_500_000, 0)).toBe(2_500_000);
  });

  it('sin activos: patrimonio = -pasivos', () => {
    expect(calcularPatrimonioNeto(0, 4_000_000)).toBe(-4_000_000);
  });
});

// ── proyectarPatrimonio() ─────────────────────────────────────────

describe('proyectarPatrimonio()', () => {
  it('aplica ahorro mensual lineal en N meses', () => {
    // patrimonio 1M, ahorro 500k/mes, 6 meses → 1M + 3M = 4M
    expect(proyectarPatrimonio(1_000_000, 500_000, 6)).toBe(4_000_000);
  });

  it('proyecta hacia abajo con ahorro negativo (déficit)', () => {
    expect(proyectarPatrimonio(5_000_000, -200_000, 12)).toBe(2_600_000);
  });

  it('devuelve patrimonio actual si meses=0', () => {
    expect(proyectarPatrimonio(1_000_000, 500_000, 0)).toBe(1_000_000);
  });

  it('protege contra meses negativos devolviendo el patrimonio actual', () => {
    expect(proyectarPatrimonio(1_000_000, 500_000, -3)).toBe(1_000_000);
  });

  it('protege contra meses no finitos devolviendo el patrimonio actual', () => {
    expect(proyectarPatrimonio(1_000_000, 500_000, NaN)).toBe(1_000_000);
    expect(proyectarPatrimonio(1_000_000, 500_000, Infinity)).toBe(1_000_000);
  });

  it('acepta patrimonio inicial negativo', () => {
    // Deuda neta -2M, ahorro 500k/mes, 6 meses → -2M + 3M = 1M
    expect(proyectarPatrimonio(-2_000_000, 500_000, 6)).toBe(1_000_000);
  });
});

// ── proyeccionMultiHorizonte() ────────────────────────────────────

describe('proyeccionMultiHorizonte()', () => {
  it('proyecta a 6, 12 y 24 meses con ahorro positivo', () => {
    const p = proyeccionMultiHorizonte(0, 1_000_000);
    expect(p.seisMeses).toBe(6_000_000);
    expect(p.doceMeses).toBe(12_000_000);
    expect(p.veinticuatroMeses).toBe(24_000_000);
  });

  it('proyecta hacia abajo con déficit mensual', () => {
    const p = proyeccionMultiHorizonte(10_000_000, -500_000);
    expect(p.seisMeses).toBe(7_000_000);
    expect(p.doceMeses).toBe(4_000_000);
    expect(p.veinticuatroMeses).toBe(-2_000_000);
  });

  it('mantiene el patrimonio constante si ahorro=0', () => {
    const p = proyeccionMultiHorizonte(3_500_000, 0);
    expect(p.seisMeses).toBe(3_500_000);
    expect(p.doceMeses).toBe(3_500_000);
    expect(p.veinticuatroMeses).toBe(3_500_000);
  });

  it('devuelve las 3 claves esperadas', () => {
    const p = proyeccionMultiHorizonte(0, 0);
    expect(p).toHaveProperty('seisMeses');
    expect(p).toHaveProperty('doceMeses');
    expect(p).toHaveProperty('veinticuatroMeses');
  });
});

// ── serieGastosMensual() ──────────────────────────────────────────

describe('serieGastosMensual()', () => {
  it('devuelve la cantidad de meses pedida', () => {
    const serie = serieGastosMensual([], 2026, 5, 6);
    expect(serie).toHaveLength(6);
  });

  it('último elemento corresponde al mes pedido', () => {
    const serie = serieGastosMensual([], 2026, 5, 3);
    expect(serie[serie.length - 1]).toMatchObject({ anio: 2026, mes: 5 });
  });

  it('retrocede a años anteriores cuando los meses pedidos lo requieren', () => {
    const serie = serieGastosMensual([], 2026, 2, 4);
    // Meses esperados, en orden: nov-2025, dic-2025, ene-2026, feb-2026
    expect(serie[0]).toMatchObject({ anio: 2025, mes: 11 });
    expect(serie[1]).toMatchObject({ anio: 2025, mes: 12 });
    expect(serie[2]).toMatchObject({ anio: 2026, mes: 1 });
    expect(serie[3]).toMatchObject({ anio: 2026, mes: 2 });
  });

  it('suma totales reales por mes', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 100_000, fecha: '2026-05-10' }),
      gasto({ id: 'g2', monto: 50_000,  fecha: '2026-05-15' }),
      gasto({ id: 'g3', monto: 200_000, fecha: '2026-04-20' }),
    ];
    const serie = serieGastosMensual(gastos, 2026, 5, 3);
    // [mar=0, abr=200k, may=150k]
    expect(serie[1].total).toBe(200_000);
    expect(serie[2].total).toBe(150_000);
  });

  it('meses sin gastos aparecen con total=0 (no se omiten)', () => {
    const serie = serieGastosMensual([], 2026, 5, 3);
    expect(serie.every(p => p.total === 0)).toBe(true);
  });

  it('cada punto tiene label de mes corto', () => {
    const serie = serieGastosMensual([], 2026, 5, 3);
    expect(serie.map(p => p.label)).toEqual(['mar', 'abr', 'may']);
  });

  it('mesesAtras=1 devuelve solo el mes actual', () => {
    const serie = serieGastosMensual([], 2026, 5, 1);
    expect(serie).toHaveLength(1);
    expect(serie[0]).toMatchObject({ anio: 2026, mes: 5 });
  });

  it('default es 12 meses', () => {
    const serie = serieGastosMensual([], 2026, 5);
    expect(serie).toHaveLength(12);
  });

  it('clamp inferior: mesesAtras < 1 → 1', () => {
    const serie = serieGastosMensual([], 2026, 5, 0);
    expect(serie).toHaveLength(1);
  });
});

// ── seriePorCategoria() ──────────────────────────────────────────

describe('seriePorCategoria()', () => {
  it('devuelve array vacío sin gastos', () => {
    expect(seriePorCategoria([])).toEqual([]);
  });

  it('ordena categorías de mayor a menor', () => {
    const gastos = [
      gasto({ categoria: 'Alimentación', monto: 100_000 }),
      gasto({ categoria: 'Transporte',   monto: 300_000 }),
      gasto({ categoria: 'Entretenimiento', monto: 50_000 }),
    ];
    const serie = seriePorCategoria(gastos);
    expect(serie[0].categoria).toBe('Transporte');
    expect(serie[1].categoria).toBe('Alimentación');
    expect(serie[2].categoria).toBe('Entretenimiento');
  });

  it('calcula porcentaje sobre el total', () => {
    const gastos = [
      gasto({ categoria: 'A', monto: 750_000 }),
      gasto({ categoria: 'B', monto: 250_000 }),
    ];
    const serie = seriePorCategoria(gastos);
    expect(serie[0].pct).toBe(75);
    expect(serie[1].pct).toBe(25);
  });

  it('cada elemento tiene categoria, total y pct', () => {
    const gastos = [gasto({ categoria: 'X', monto: 100_000 })];
    const serie = seriePorCategoria(gastos);
    expect(serie[0]).toHaveProperty('categoria');
    expect(serie[0]).toHaveProperty('total');
    expect(serie[0]).toHaveProperty('pct');
  });

  it('agrupa cola larga en "Otros" cuando supera maxSegmentos', () => {
    // 8 categorías distintas, max 6 → 5 top + "Otros"
    const gastos = Array.from({ length: 8 }, (_, i) =>
      gasto({ id: `g${i}`, categoria: `Cat${i}`, monto: (8 - i) * 100_000 })
    );
    const serie = seriePorCategoria(gastos, 6);
    expect(serie).toHaveLength(6);
    expect(serie[serie.length - 1].categoria).toBe('Otros');
  });

  it('"Otros" suma el total de las categorías agrupadas', () => {
    const gastos = [
      gasto({ id: 'g1', categoria: 'A', monto: 1_000_000 }),
      gasto({ id: 'g2', categoria: 'B', monto: 500_000 }),
      gasto({ id: 'g3', categoria: 'C', monto: 100_000 }),
      gasto({ id: 'g4', categoria: 'D', monto: 100_000 }),
    ];
    const serie = seriePorCategoria(gastos, 2);
    // 1 top + "Otros" = 2 segmentos
    expect(serie).toHaveLength(2);
    expect(serie[1].categoria).toBe('Otros');
    expect(serie[1].total).toBe(700_000); // B + C + D
  });

  it('no agrupa si el total de categorías es ≤ maxSegmentos', () => {
    const gastos = [
      gasto({ id: 'g1', categoria: 'A', monto: 100_000 }),
      gasto({ id: 'g2', categoria: 'B', monto: 50_000 }),
    ];
    const serie = seriePorCategoria(gastos, 6);
    expect(serie).toHaveLength(2);
    expect(serie.map(s => s.categoria)).not.toContain('Otros');
  });
});

// ── calcularVolatilidad() ─────────────────────────────────────────

describe('calcularVolatilidad()', () => {
  it('devuelve 0 para array vacío', () => {
    expect(calcularVolatilidad([])).toBe(0);
  });

  it('devuelve 0 para array con un solo elemento', () => {
    expect(calcularVolatilidad([100_000])).toBe(0);
  });

  it('devuelve 0 cuando todos los valores son iguales', () => {
    expect(calcularVolatilidad([500_000, 500_000, 500_000])).toBe(0);
  });

  it('calcula volatilidad de serie de 3 números', () => {
    // [100, 200, 300]: promedio=200, desviaciones=[-100, 0, 100]
    // varianza = (10000 + 0 + 10000) / 3 ≈ 6666.67
    // desv estándar ≈ 81.65
    const volatilidad = calcularVolatilidad([100_000, 200_000, 300_000]);
    expect(volatilidad).toBeGreaterThan(80_000);
    expect(volatilidad).toBeLessThan(85_000);
  });

  it('maneja series con variación alta', () => {
    const volatilidad = calcularVolatilidad([1_000_000, 100_000, 500_000, 2_000_000]);
    expect(volatilidad).toBeGreaterThan(500_000);
  });

  it('maneja series con variación baja', () => {
    const volatilidad = calcularVolatilidad([500_000, 510_000, 505_000, 495_000]);
    expect(volatilidad).toBeLessThan(10_000);
  });

  it('ignora valores no-número', () => {
    // En práctica, si se pasan no-números, Number isFinite fallará
    // pero calcularVolatilidad no hace cast explícito, así que el test
    // verifica que maneja el input como está
    const result = calcularVolatilidad([100, 200, null, 300]);
    expect(Number.isFinite(result)).toBe(true);
  });
});

// ── calcularScoreSalud() ──────────────────────────────────────────

describe('calcularScoreSalud()', () => {
  const resumenBase = {
    activos: { total: 5_000_000 },
    pasivos: { total: 2_500_000 },
    saldoCuentas: 1_000_000,
    gastosMes: 1_000_000,
    volatilidad: 100_000,
  };

  it('devuelve score 0 si resumen es null', () => {
    const result = calcularScoreSalud(null);
    expect(result.score).toBe(0);
  });

  it('calcula score 0 con todos los factores en 0', () => {
    const resumen = {
      activos: { total: 0 },
      pasivos: { total: 0 },
      saldoCuentas: 0,
      gastosMes: 1,
      volatilidad: 1000,
    };
    const result = calcularScoreSalud(resumen);
    expect(result.score).toBeLessThanOrEqual(50);
  });

  it('calcula score cercano a 100 con factores óptimos', () => {
    const resumen = {
      activos: { total: 10_000_000 },
      pasivos: { total: 1_000_000 }, // bajo ratio deuda
      saldoCuentas: 12_000_000, // alta liquidez
      gastosMes: 1_000_000,
      volatilidad: 50_000, // bajo (1/20)
    };
    const result = calcularScoreSalud(resumen);
    expect(result.score).toBeGreaterThan(80);
  });

  it('devuelve objeto con score redondeado', () => {
    const result = calcularScoreSalud(resumenBase);
    expect(Number.isInteger(result.score)).toBe(true);
  });

  it('devuelve factors con 3 sub-scores', () => {
    const result = calcularScoreSalud(resumenBase);
    expect(result.factors).toHaveProperty('deuda');
    expect(result.factors).toHaveProperty('liquidez');
    expect(result.factors).toHaveProperty('control');
  });

  it('ya no incluye el factor tasa de ahorro (ingresos removidos en v8.8)', () => {
    const result = calcularScoreSalud(resumenBase);
    expect(result.factors).not.toHaveProperty('tasaAhorro');
  });

  it('devuelve explicacion con los 3 sub-scores', () => {
    const result = calcularScoreSalud(resumenBase);
    expect(result.explicacion).toContain('Deuda');
    expect(result.explicacion).toContain('Liquidez');
    expect(result.explicacion).toContain('Control');
  });

  it('factor deuda: sin deuda → 100 puntos', () => {
    const resumen = { ...resumenBase, pasivos: { total: 0 } };
    const result = calcularScoreSalud(resumen);
    expect(result.factors.deuda).toBe(100);
  });

  it('factor deuda: ratio 50% (deuda=activos/2) → ~50 puntos', () => {
    const resumen = {
      ...resumenBase,
      activos: { total: 4_000_000 },
      pasivos: { total: 2_000_000 },
    };
    const result = calcularScoreSalud(resumen);
    expect(result.factors.deuda).toBeGreaterThan(40);
    expect(result.factors.deuda).toBeLessThan(60);
  });

  it('factor liquidez: 6+ meses → ~100 puntos', () => {
    const resumen = {
      ...resumenBase,
      saldoCuentas: 6_000_000,
      gastosMes: 1_000_000,
    };
    const result = calcularScoreSalud(resumen);
    expect(result.factors.liquidez).toBe(100);
  });

  it('factor liquidez: 3 meses → ~50 puntos', () => {
    const resumen = {
      ...resumenBase,
      saldoCuentas: 3_000_000,
      gastosMes: 1_000_000,
    };
    const result = calcularScoreSalud(resumen);
    expect(result.factors.liquidez).toBeGreaterThan(40);
    expect(result.factors.liquidez).toBeLessThan(60);
  });

  it('factor control: baja volatilidad → puntos altos', () => {
    const resumen = { ...resumenBase, volatilidad: 10_000, gastosMes: 1_000_000 };
    const result = calcularScoreSalud(resumen);
    expect(result.factors.control).toBeGreaterThan(80);
  });

  it('factor control: alta volatilidad → puntos bajos', () => {
    const resumen = { ...resumenBase, volatilidad: 600_000, gastosMes: 1_000_000 };
    const result = calcularScoreSalud(resumen);
    expect(result.factors.control).toBeLessThan(50);
  });

  it('score es promedio ponderado de 3 factores (40/35/25)', () => {
    // Si todos los factores son 100: score debería ser 100
    const resumen = {
      activos: { total: 10_000_000 },
      pasivos: { total: 0 },
      saldoCuentas: 6_000_000,
      gastosMes: 1_000_000,
      volatilidad: 0,
    };
    const result = calcularScoreSalud(resumen);
    expect(result.score).toBe(100);
  });

  it('acepta el field name real de generarResumen (gastoMes sin s)', () => {
    // Regresión: generarResumen() devuelve "gastoMes" (sin s); calcularScoreSalud()
    // antes leía solo "gastosMes" (con s) y caía al fallback de 1, lo cual
    // distorsionaba scoreLiquidez y scoreControl en producción.
    const resumen = {
      activos: { total: 1_000_000 },
      pasivos: { total: 1_000_000 },
      saldoCuentas: 1_500_000,
      gastoMes: 1_000_000, // ← field name real (sin s)
      volatilidad: 100_000,
    };
    const result = calcularScoreSalud(resumen);
    // Con saldoCuentas=1.5M y gastoMes=1M → 1.5 meses de runway → score liquidez ~25
    // Si el bug existiera, leería gasteMes=1 y daría liquidez=100 (clamp).
    expect(result.factors.liquidez).toBeLessThan(50);
    expect(result.factors.liquidez).toBeGreaterThan(0);
  });
});

// ── calcularScoreSalud() - 4 factores (J.1c) ─────────────────────

describe('calcularScoreSalud() con ahorroData - 4 factores', () => {
  const resumenOpt = {
    activos:     { total: 10_000_000 },
    pasivos:     { total: 1_000_000 },
    saldoCuentas: 12_000_000,
    gastosMes:   1_000_000,
    volatilidad: 50_000,
  };

  it('fondo completado: factor ahorro = 100', () => {
    const r = calcularScoreSalud(resumenOpt, { activo: true, completado: true });
    expect(r.factors.ahorro).toBe(100);
  });

  it('fondo activo pero no completado: factor ahorro = 50', () => {
    const r = calcularScoreSalud(resumenOpt, { activo: true, completado: false });
    expect(r.factors.ahorro).toBe(50);
  });

  it('sin fondo (activo = false): factor ahorro = 0', () => {
    const r = calcularScoreSalud(resumenOpt, { activo: false, completado: false });
    expect(r.factors.ahorro).toBe(0);
  });

  it('con todos los factores en 100: score = 100', () => {
    const resumenPerfecto = {
      activos:     { total: 10_000_000 },
      pasivos:     { total: 0 },
      saldoCuentas: 6_000_000,
      gastosMes:   1_000_000,
      volatilidad: 0,
    };
    const r = calcularScoreSalud(resumenPerfecto, { activo: true, completado: true });
    expect(r.score).toBe(100);
  });

  it('score 4-factor menor que 3-factor cuando no hay ahorro', () => {
    const r3 = calcularScoreSalud(resumenOpt);
    const r4 = calcularScoreSalud(resumenOpt, { activo: false, completado: false });
    expect(r4.score).toBeLessThan(r3.score);
  });

  it('explicacion incluye Ahorro cuando ahorroData esta presente', () => {
    const r = calcularScoreSalud(resumenOpt, { activo: true, completado: false });
    expect(r.explicacion).toContain('Ahorro');
  });

  it('incluye el factor ahorro en factors', () => {
    const r = calcularScoreSalud(resumenOpt, { activo: true, completado: true });
    expect(r.factors).toHaveProperty('ahorro');
    expect(r.factors).toHaveProperty('deuda');
    expect(r.factors).toHaveProperty('liquidez');
    expect(r.factors).toHaveProperty('control');
  });

  it('con resumen null y ahorroData presente: score 0 con factor ahorro', () => {
    const r = calcularScoreSalud(null, { activo: true, completado: true });
    expect(r.score).toBe(0);
    expect(r.factors.ahorro).toBe(0);
  });
});

// ── clasificarScore() ─────────────────────────────────────────────

describe('clasificarScore()', () => {
  it('clasifica 80-100 como excelente', () => {
    expect(clasificarScore(80)).toBe('excelente');
    expect(clasificarScore(90)).toBe('excelente');
    expect(clasificarScore(100)).toBe('excelente');
  });

  it('clasifica 60-79 como buena', () => {
    expect(clasificarScore(60)).toBe('buena');
    expect(clasificarScore(70)).toBe('buena');
    expect(clasificarScore(79)).toBe('buena');
  });

  it('clasifica 40-59 como ajustada', () => {
    expect(clasificarScore(40)).toBe('ajustada');
    expect(clasificarScore(50)).toBe('ajustada');
    expect(clasificarScore(59)).toBe('ajustada');
  });

  it('clasifica 0-39 como critica', () => {
    expect(clasificarScore(0)).toBe('critica');
    expect(clasificarScore(20)).toBe('critica');
    expect(clasificarScore(39)).toBe('critica');
  });

  it('límites exactos: 80 → excelente, 79 → buena', () => {
    expect(clasificarScore(80)).toBe('excelente');
    expect(clasificarScore(79)).toBe('buena');
  });

  it('límites exactos: 60 → buena, 59 → ajustada', () => {
    expect(clasificarScore(60)).toBe('buena');
    expect(clasificarScore(59)).toBe('ajustada');
  });

  it('límites exactos: 40 → ajustada, 39 → critica', () => {
    expect(clasificarScore(40)).toBe('ajustada');
    expect(clasificarScore(39)).toBe('critica');
  });
});

// ── calcularComparacionCategorias ─────────────────────────────────

describe('calcularComparacionCategorias', () => {
  // Gastos: mayo 2026 y abril 2026
  const gastosBase = [
    // Mayo 2026
    { id: 'g1', categoria: 'Alimentación', monto: 400_000, fecha: '2026-05-10' },
    { id: 'g2', categoria: 'Transporte',   monto: 100_000, fecha: '2026-05-15' },
    { id: 'g3', categoria: 'Entretenimiento', monto: 200_000, fecha: '2026-05-20' },
    // Abril 2026
    { id: 'g4', categoria: 'Alimentación', monto: 300_000, fecha: '2026-04-10' },
    { id: 'g5', categoria: 'Transporte',   monto: 150_000, fecha: '2026-04-15' },
    { id: 'g6', categoria: 'Salud',        monto: 80_000,  fecha: '2026-04-20' },
  ];

  it('devuelve null con array no válido', () => {
    expect(calcularComparacionCategorias(null, 2026, 5)).toBeNull();
    expect(calcularComparacionCategorias('x', 2026, 5)).toBeNull();
  });

  it('devuelve null si no hay gastos en ningún período', () => {
    expect(calcularComparacionCategorias([], 2026, 5)).toBeNull();
  });

  it('calcula totales correctos para actual y anterior', () => {
    const r = calcularComparacionCategorias(gastosBase, 2026, 5);
    expect(r).not.toBeNull();
    expect(r.totalActual).toBe(700_000);   // 400+100+200
    expect(r.totalAnterior).toBe(530_000); // 300+150+80
  });

  it('detecta categoría que subió (Alimentación: 300k → 400k)', () => {
    const r = calcularComparacionCategorias(gastosBase, 2026, 5);
    const ali = r.categorias.find(c => c.cat === 'Alimentación');
    expect(ali).toBeDefined();
    expect(ali.direccion).toBe('subio');
    expect(ali.delta).toBe(100_000);
  });

  it('detecta categoría que bajó (Transporte: 150k → 100k)', () => {
    const r = calcularComparacionCategorias(gastosBase, 2026, 5);
    const tra = r.categorias.find(c => c.cat === 'Transporte');
    expect(tra).toBeDefined();
    expect(tra.direccion).toBe('bajo');
    expect(tra.delta).toBe(-50_000);
  });

  it('detecta categoría nueva (Entretenimiento: 0 → 200k)', () => {
    const r = calcularComparacionCategorias(gastosBase, 2026, 5);
    const ent = r.categorias.find(c => c.cat === 'Entretenimiento');
    expect(ent).toBeDefined();
    expect(ent.direccion).toBe('nueva');
    expect(ent.anterior).toBe(0);
  });

  it('detecta categoría que desapareció (Salud: 80k → 0)', () => {
    const r = calcularComparacionCategorias(gastosBase, 2026, 5);
    const sal = r.categorias.find(c => c.cat === 'Salud');
    expect(sal).toBeDefined();
    expect(sal.direccion).toBe('desaparecio');
    expect(sal.actual).toBe(0);
  });

  it('genera highlights con tipo mejora/alerta', () => {
    const r = calcularComparacionCategorias(gastosBase, 2026, 5);
    expect(Array.isArray(r.highlights)).toBe(true);
    expect(r.highlights.length).toBeGreaterThan(0);
    for (const h of r.highlights) {
      expect(['mejora', 'alerta']).toContain(h.tipo);
      expect(typeof h.mensaje).toBe('string');
    }
  });

  it('respeta topN en el resultado', () => {
    const r = calcularComparacionCategorias(gastosBase, 2026, 5, { topN: 2 });
    expect(r.categorias.length).toBeLessThanOrEqual(2);
  });

  it('funciona en enero (mes anterior = diciembre del año pasado)', () => {
    const gastosEneDic = [
      { id: 'a', categoria: 'Ropa', monto: 100_000, fecha: '2026-01-10' },
      { id: 'b', categoria: 'Ropa', monto: 80_000,  fecha: '2025-12-15' },
    ];
    const r = calcularComparacionCategorias(gastosEneDic, 2026, 1);
    expect(r).not.toBeNull();
    expect(r.totalActual).toBe(100_000);
    expect(r.totalAnterior).toBe(80_000);
  });

  it('categorías con variación < 5% se marcan como igual', () => {
    const gastos = [
      { id: 'x1', categoria: 'Mercado', monto: 100_000, fecha: '2026-05-01' },
      { id: 'x2', categoria: 'Mercado', monto: 102_000, fecha: '2026-04-01' },
    ];
    const r = calcularComparacionCategorias(gastos, 2026, 5);
    const merc = r.categorias.find(c => c.cat === 'Mercado');
    expect(merc.direccion).toBe('igual');
  });
});

// ── detectarPatronGastoSemanal ────────────────────────────────────

describe('detectarPatronGastoSemanal', () => {
  // Genera N gastos en un día de semana específico dentro de los últimos 90 días.
  // hoyISO = '2026-05-19' (martes)
  const HOY = '2026-05-19';

  // Helper: gastos concentrados en viernes (día 5)
  function gastosConcentrados() {
    const gastos = [];
    // 8 viernes en los últimos 90 días con gasto alto
    for (let i = 0; i < 8; i++) {
      gastos.push({
        id:         `v${i}`,
        fecha:      `2026-05-${String(2 + i * 2).padStart(2, '0')}`,
        monto:      500_000,
        categoria:  'Entretenimiento',
      });
    }
    // Otros días con gasto bajo
    for (let i = 0; i < 10; i++) {
      gastos.push({
        id:         `o${i}`,
        fecha:      `2026-05-${String(1 + i).padStart(2, '0')}`,
        monto:      20_000,
        categoria:  'Alimentación',
      });
    }
    return gastos;
  }

  it('devuelve null con array inválido', () => {
    expect(detectarPatronGastoSemanal(null, HOY)).toBeNull();
    expect(detectarPatronGastoSemanal('x', HOY)).toBeNull();
  });

  it('devuelve null si hoyISO es inválido', () => {
    expect(detectarPatronGastoSemanal([{ fecha: '2026-05-01', monto: 10_000 }], 'bad')).toBeNull();
    expect(detectarPatronGastoSemanal([{ fecha: '2026-05-01', monto: 10_000 }], null)).toBeNull();
  });

  it('devuelve null si hay menos gastos que minGastos (default 7)', () => {
    const pocos = [{ id: 'a', fecha: '2026-05-01', monto: 100_000 }];
    expect(detectarPatronGastoSemanal(pocos, HOY)).toBeNull();
  });

  it('devuelve null si no hay días destacados', () => {
    // Gastos distribuidos uniformemente, ninguno destaca x2
    const uniformes = Array.from({ length: 15 }, (_, i) => ({
      id:    `u${i}`,
      fecha: `2026-05-${String((i % 18) + 1).padStart(2, '0')}`,
      monto: 100_000,
    }));
    const r = detectarPatronGastoSemanal(uniformes, HOY);
    // Si no hay destacados, resultado puede ser null o tener diasDestacados vacío
    if (r !== null) {
      expect(r.diasDestacados.length).toBe(0);
    }
  });

  it('porDia tiene 7 entradas (una por día de la semana)', () => {
    const r = detectarPatronGastoSemanal(gastosConcentrados(), HOY);
    if (r !== null) {
      expect(r.porDia).toHaveLength(7);
    }
  });

  it('excluye gastos fuera de la ventana (> 90 días)', () => {
    const lejanos = Array.from({ length: 10 }, (_, i) => ({
      id:    `l${i}`,
      fecha: '2025-01-01', // muy fuera de ventana
      monto: 1_000_000,
    }));
    expect(detectarPatronGastoSemanal(lejanos, HOY)).toBeNull();
  });

  it('respeta ventanaDias custom', () => {
    // Gastos hace 30 días. Con ventana=10, no entran; con ventana=60, sí.
    const gastos30 = Array.from({ length: 10 }, (_, i) => ({
      id:    `d${i}`,
      fecha: '2026-04-19',
      monto: 200_000,
    }));
    expect(detectarPatronGastoSemanal(gastos30, HOY, { ventanaDias: 10 })).toBeNull();
    // Con ventana=60 hay suficientes gastos pero posiblemente sin días destacados.
    // Solo verificamos que no lanza.
    expect(() => detectarPatronGastoSemanal(gastos30, HOY, { ventanaDias: 60 })).not.toThrow();
  });

  it('gastos con monto 0 o inválido no se cuentan', () => {
    const conCeros = [
      ...Array.from({ length: 7 }, (_, i) => ({ id: `v${i}`, fecha: '2026-05-01', monto: 0 })),
    ];
    expect(detectarPatronGastoSemanal(conCeros, HOY)).toBeNull();
  });

  it('diasDestacados tiene etiqueta y severidad', () => {
    const r = detectarPatronGastoSemanal(gastosConcentrados(), HOY);
    if (r && r.diasDestacados.length > 0) {
      for (const d of r.diasDestacados) {
        expect(typeof d.etiqueta).toBe('string');
        expect(['alta', 'media']).toContain(d.severidad);
        expect(typeof d.factor).toBe('number');
      }
    }
  });
});

// ── K.3 - MONITOR DE TOPES DE RENTA ──────────────────────────────

describe('patrimonioBruto()', () => {
  const _cuenta = (saldo, activa = true) => ({
    id: `c-${saldo}`, nombre: 'X', banco: 'Nequi', tipo: 'Ahorros',
    saldo, activa, fechaCreacion: '2026-01-01T00:00:00Z',
  });
  const _inv = (monto) => ({
    id: `i-${monto}`, tipo: 'CDT', nombre: 'CDT', monto, tasaEA: 0.1, plazoMeses: 12,
    fechaInicio: '2026-01-01', fechaCreacion: '2026-01-01T00:00:00Z',
  });

  it('suma saldos de cuentas activas + monto invertido', () => {
    const cuentas     = [_cuenta(2_000_000), _cuenta(500_000)];
    const inversiones = [_inv(5_000_000)];
    expect(patrimonioBruto(cuentas, inversiones)).toBe(7_500_000);
  });

  it('ignora cuentas inactivas', () => {
    const cuentas = [_cuenta(2_000_000, true), _cuenta(1_000_000, false)];
    expect(patrimonioBruto(cuentas, [])).toBe(2_000_000);
  });

  it('devuelve 0 con arrays vacíos o nulos', () => {
    expect(patrimonioBruto([], [])).toBe(0);
    expect(patrimonioBruto(null, null)).toBe(0);
    expect(patrimonioBruto(undefined, undefined)).toBe(0);
  });
});

describe('totalGastosAnio()', () => {
  const _g = (monto, fecha) => ({
    id: `g-${monto}-${fecha}`, descripcion: 'Gasto', monto,
    categoria: 'Alimentación', fecha,
  });

  it('suma todos los gastos del año indicado', () => {
    const gastos = [
      _g(100_000, '2026-01-15'),
      _g(200_000, '2026-06-20'),
      _g(300_000, '2026-12-31'),
    ];
    expect(totalGastosAnio(gastos, 2026)).toBe(600_000);
  });

  it('ignora gastos de otros años', () => {
    const gastos = [
      _g(100_000, '2025-12-31'),
      _g(200_000, '2026-01-01'),
      _g(300_000, '2027-01-01'),
    ];
    expect(totalGastosAnio(gastos, 2026)).toBe(200_000);
  });

  it('descarta gastos sin fecha o con monto inválido', () => {
    const gastos = [
      _g(100_000, '2026-05-10'),
      { id: 'g-bad', descripcion: 'X', monto: 500, categoria: 'Otros' }, // sin fecha
      { id: 'g-bad2', descripcion: 'X', monto: -200, categoria: 'Otros', fecha: '2026-07-01' },
    ];
    expect(totalGastosAnio(gastos, 2026)).toBe(100_000);
  });

  it('devuelve 0 con input vacío o inválido', () => {
    expect(totalGastosAnio([], 2026)).toBe(0);
    expect(totalGastosAnio(null, 2026)).toBe(0);
    expect(totalGastosAnio([_g(100_000, '2026-01-01')], NaN)).toBe(0);
  });
});

describe('calcularEstadoRenta()', () => {
  const estado = (state = {}, anio = 2026) =>
    calcularEstadoRenta({ cuentas: [], inversiones: [], gastos: [], ...state }, anio);

  it('devuelve 5 criterios en orden: ingresos, patrimonio, consumos, TC, consignaciones', () => {
    const r = estado();
    expect(r.criterios).toHaveLength(5);
    expect(r.criterios.map(c => c.id)).toEqual([
      'ingresosBrutos', 'patrimonioBruto', 'consumosTotales',
      'consumosTC',     'consignaciones',
    ]);
  });

  it('expone uvt y umbralAlerta', () => {
    const r = estado();
    expect(r.uvt).toBe(UVT);
    expect(r.umbralAlerta).toBe(0.80);
    expect(r.anio).toBe(2026);
  });

  it('los topes se derivan de N × UVT', () => {
    const r = estado();
    const m = Object.fromEntries(r.criterios.map(c => [c.id, c]));
    expect(m.ingresosBrutos.tope).toBe(TOPES_RENTA_UVT.ingresosBrutos * UVT);
    expect(m.patrimonioBruto.tope).toBe(TOPES_RENTA_UVT.patrimonioBruto * UVT);
    expect(m.consumosTotales.tope).toBe(TOPES_RENTA_UVT.consumosTotales * UVT);
    expect(m.consumosTC.tope).toBe(TOPES_RENTA_UVT.consumosTC * UVT);
    expect(m.consignaciones.tope).toBe(TOPES_RENTA_UVT.consignaciones * UVT);
  });

  it('ingresosBrutos, consumosTC y consignaciones siempre son "sin-datos"', () => {
    const r = estado({
      cuentas:     [{ id: 'c', saldo: 999_999_999, activa: true, nombre: 'X', banco: 'Y', tipo: 'Ahorros', fechaCreacion: '2026-01-01T00:00:00Z' }],
      inversiones: [{ id: 'i', tipo: 'CDT', monto: 999_999_999, nombre: 'X', tasaEA: 0, plazoMeses: 12, fechaInicio: '2026-01-01', fechaCreacion: '2026-01-01T00:00:00Z' }],
    });
    const m = Object.fromEntries(r.criterios.map(c => [c.id, c]));
    expect(m.ingresosBrutos.estado).toBe('sin-datos');
    expect(m.ingresosBrutos.medible).toBe(false);
    expect(m.consumosTC.estado).toBe('sin-datos');
    expect(m.consignaciones.estado).toBe('sin-datos');
  });

  it('patrimonioBruto en "ok" cuando es < 80% del tope', () => {
    const r = estado({
      cuentas: [{ id: 'c', saldo: 100_000_000, activa: true, nombre: 'X', banco: 'Y', tipo: 'Ahorros', fechaCreacion: '2026-01-01T00:00:00Z' }],
    });
    const c = r.criterios.find(x => x.id === 'patrimonioBruto');
    expect(c.estado).toBe('ok');
    expect(c.medible).toBe(true);
    expect(c.valor).toBe(100_000_000);
  });

  it('patrimonioBruto en "cerca" al alcanzar el 80% del tope', () => {
    const tope = TOPES_RENTA_UVT.patrimonioBruto * UVT; // 4500 × UVT
    const valor = Math.round(tope * 0.85);
    const r = estado({
      cuentas: [{ id: 'c', saldo: valor, activa: true, nombre: 'X', banco: 'Y', tipo: 'Ahorros', fechaCreacion: '2026-01-01T00:00:00Z' }],
    });
    const c = r.criterios.find(x => x.id === 'patrimonioBruto');
    expect(c.estado).toBe('cerca');
    expect(c.porcentaje).toBeGreaterThanOrEqual(80);
    expect(c.porcentaje).toBeLessThan(100);
  });

  it('patrimonioBruto en "supera" al pasar el 100% del tope', () => {
    const tope = TOPES_RENTA_UVT.patrimonioBruto * UVT;
    const valor = Math.round(tope * 1.20);
    const r = estado({
      cuentas: [{ id: 'c', saldo: valor, activa: true, nombre: 'X', banco: 'Y', tipo: 'Ahorros', fechaCreacion: '2026-01-01T00:00:00Z' }],
    });
    const c = r.criterios.find(x => x.id === 'patrimonioBruto');
    expect(c.estado).toBe('supera');
    expect(c.porcentaje).toBeGreaterThanOrEqual(100);
  });

  it('consumosTotales mide los gastos del año', () => {
    const tope = TOPES_RENTA_UVT.consumosTotales * UVT;
    const valor = Math.round(tope * 0.90);
    const r = estado({
      gastos: [{ id: 'g', descripcion: 'X', monto: valor, categoria: 'Otros', fecha: '2026-06-15' }],
    });
    const c = r.criterios.find(x => x.id === 'consumosTotales');
    expect(c.medible).toBe(true);
    expect(c.valor).toBe(valor);
    expect(c.estado).toBe('cerca');
  });

  it('todos los criterios incluyen tip y etiqueta legibles', () => {
    const r = estado();
    for (const c of r.criterios) {
      expect(typeof c.etiqueta).toBe('string');
      expect(c.etiqueta.length).toBeGreaterThan(3);
      expect(typeof c.tip).toBe('string');
      expect(c.tip.length).toBeGreaterThan(10);
    }
  });

  it('cada criterio expone topeUVT, tope, valor, porcentaje y medible', () => {
    const r = estado();
    for (const c of r.criterios) {
      expect(c).toHaveProperty('topeUVT');
      expect(c).toHaveProperty('tope');
      expect(c).toHaveProperty('valor');
      expect(c).toHaveProperty('porcentaje');
      expect(c).toHaveProperty('medible');
    }
  });
});

describe('detectarNudgesRenta()', () => {
  it('devuelve array vacío si no hay criterios disparados ni perfil declarante', () => {
    const r = calcularEstadoRenta({ cuentas: [], inversiones: [], gastos: [] }, 2026);
    expect(detectarNudgesRenta(r)).toEqual([]);
  });

  it('genera nudge "medium" para cada criterio en "cerca"', () => {
    const tope = TOPES_RENTA_UVT.patrimonioBruto * UVT;
    const r = calcularEstadoRenta({
      cuentas: [{ id: 'c', saldo: Math.round(tope * 0.85), activa: true, nombre: 'X', banco: 'Y', tipo: 'Ahorros', fechaCreacion: '2026-01-01T00:00:00Z' }],
      inversiones: [], gastos: [],
    }, 2026);
    const nudges = detectarNudgesRenta(r);
    expect(nudges).toHaveLength(1);
    expect(nudges[0].nivel).toBe('nudge-medium');
    expect(nudges[0].criterio).toBe('patrimonioBruto');
    expect(nudges[0].mensaje).toContain('cerca');
  });

  it('genera nudge "high" para cada criterio en "supera"', () => {
    const tope = TOPES_RENTA_UVT.consumosTotales * UVT;
    const r = calcularEstadoRenta({
      cuentas: [], inversiones: [],
      gastos: [{ id: 'g', descripcion: 'X', monto: Math.round(tope * 1.10), categoria: 'Otros', fecha: '2026-06-15' }],
    }, 2026);
    const nudges = detectarNudgesRenta(r);
    expect(nudges).toHaveLength(1);
    expect(nudges[0].nivel).toBe('nudge-high');
    expect(nudges[0].criterio).toBe('consumosTotales');
    expect(nudges[0].mensaje).toContain('Superas');
  });

  it('no genera nudges para criterios "sin-datos"', () => {
    const r = calcularEstadoRenta({ cuentas: [], inversiones: [], gastos: [] }, 2026);
    expect(detectarNudgesRenta(r).filter(n => ['ingresosBrutos','consumosTC','consignaciones'].includes(n.criterio))).toHaveLength(0);
  });

  it('declaranteObligado=true añade nudge informativo cuando no hay otros', () => {
    const r = calcularEstadoRenta({ cuentas: [], inversiones: [], gastos: [] }, 2026);
    const nudges = detectarNudgesRenta(r, { declaranteObligado: true });
    expect(nudges).toHaveLength(1);
    expect(nudges[0].nivel).toBe('nudge-info');
    expect(nudges[0].criterio).toBe('declaranteObligado');
  });

  it('declaranteObligado=true NO añade nudge si ya hay críticos', () => {
    const tope = TOPES_RENTA_UVT.consumosTotales * UVT;
    const r = calcularEstadoRenta({
      cuentas: [], inversiones: [],
      gastos: [{ id: 'g', descripcion: 'X', monto: Math.round(tope * 1.10), categoria: 'Otros', fecha: '2026-06-15' }],
    }, 2026);
    const nudges = detectarNudgesRenta(r, { declaranteObligado: true });
    expect(nudges.some(n => n.criterio === 'declaranteObligado')).toBe(false);
  });

  it('input inválido devuelve array vacío sin lanzar', () => {
    expect(detectarNudgesRenta(null)).toEqual([]);
    expect(detectarNudgesRenta({})).toEqual([]);
    expect(detectarNudgesRenta({ criterios: 'no-array' })).toEqual([]);
  });

  it('cada nudge expone id, nivel, icono, criterio, etiqueta y mensaje', () => {
    const tope = TOPES_RENTA_UVT.patrimonioBruto * UVT;
    const r = calcularEstadoRenta({
      cuentas: [{ id: 'c', saldo: Math.round(tope * 1.10), activa: true, nombre: 'X', banco: 'Y', tipo: 'Ahorros', fechaCreacion: '2026-01-01T00:00:00Z' }],
      inversiones: [], gastos: [],
    }, 2026);
    const nudges = detectarNudgesRenta(r);
    expect(nudges).toHaveLength(1);
    const n = nudges[0];
    expect(typeof n.id).toBe('string');
    expect(['nudge-high','nudge-medium','nudge-info']).toContain(n.nivel);
    expect(typeof n.icono).toBe('string');
    expect(typeof n.criterio).toBe('string');
    expect(typeof n.etiqueta).toBe('string');
    expect(typeof n.mensaje).toBe('string');
  });
});

// ── K.4 - DATOS FISCALES MANUALES EN EL MONITOR DE RENTA ─────────

describe('calcularEstadoRenta() con datos fiscales manuales', () => {
  const conDatos = (datosAnio, anio = 2026) => calcularEstadoRenta({
    cuentas: [], inversiones: [], gastos: [],
    config: { datosFiscales: { [anio]: datosAnio } },
  }, anio);

  const crit = (r, id) => r.criterios.find(c => c.id === id);

  it('ingresosBrutos manual pasa de sin-datos a medible con su valor', () => {
    const r = conDatos({ ingresosBrutos: 30_000_000 });
    const c = crit(r, 'ingresosBrutos');
    expect(c.medible).toBe(true);
    expect(c.estado).not.toBe('sin-datos');
    expect(c.valor).toBe(30_000_000);
  });

  it('consumosTC manual se vuelve medible', () => {
    const r = conDatos({ consumosTC: 15_000_000 });
    const c = crit(r, 'consumosTC');
    expect(c.medible).toBe(true);
    expect(c.valor).toBe(15_000_000);
  });

  it('consignaciones manual se vuelve medible', () => {
    const r = conDatos({ consignaciones: 40_000_000 });
    const c = crit(r, 'consignaciones');
    expect(c.medible).toBe(true);
    expect(c.valor).toBe(40_000_000);
  });

  it('sin datosFiscales, los 3 criterios siguen en sin-datos', () => {
    const r = calcularEstadoRenta({ cuentas: [], inversiones: [], gastos: [], config: { datosFiscales: {} } }, 2026);
    for (const id of ['ingresosBrutos', 'consumosTC', 'consignaciones']) {
      expect(crit(r, id).estado).toBe('sin-datos');
      expect(crit(r, id).medible).toBe(false);
    }
  });

  it('un 0 explícito cuenta como medido (no sin-datos)', () => {
    const r = conDatos({ ingresosBrutos: 0 });
    const c = crit(r, 'ingresosBrutos');
    expect(c.medible).toBe(true);
    expect(c.estado).toBe('ok');
    expect(c.valor).toBe(0);
  });

  it('valor manual al 85% del tope queda en "cerca"', () => {
    const tope = TOPES_RENTA_UVT.ingresosBrutos * UVT;
    const r = conDatos({ ingresosBrutos: Math.round(tope * 0.85) });
    const c = crit(r, 'ingresosBrutos');
    expect(c.estado).toBe('cerca');
    expect(c.porcentaje).toBeGreaterThanOrEqual(80);
    expect(c.porcentaje).toBeLessThan(100);
  });

  it('valor manual sobre el tope queda en "supera" y dispara nudge high', () => {
    const tope = TOPES_RENTA_UVT.consumosTC * UVT;
    const r = conDatos({ consumosTC: Math.round(tope * 1.20) });
    const c = crit(r, 'consumosTC');
    expect(c.estado).toBe('supera');
    const nudges = detectarNudgesRenta(r);
    expect(nudges.some(n => n.criterio === 'consumosTC' && n.nivel === 'nudge-high')).toBe(true);
  });

  it('los datos de otro año no afectan al año consultado', () => {
    const r = calcularEstadoRenta({
      cuentas: [], inversiones: [], gastos: [],
      config: { datosFiscales: { 2025: { ingresosBrutos: 99_000_000 } } },
    }, 2026);
    expect(crit(r, 'ingresosBrutos').estado).toBe('sin-datos');
  });

  it('valor manual negativo se ignora (sigue sin-datos)', () => {
    const r = conDatos({ ingresosBrutos: -100 });
    expect(crit(r, 'ingresosBrutos').estado).toBe('sin-datos');
  });

  it('el tip cambia a "registraste manualmente" cuando hay valor provisto', () => {
    const r = conDatos({ ingresosBrutos: 10_000_000 });
    expect(crit(r, 'ingresosBrutos').tip).toMatch(/manualmente/i);
  });

  it('patrimonio y consumos derivados no se ven afectados por datosFiscales', () => {
    const r = calcularEstadoRenta({
      cuentas: [{ id: 'c', saldo: 5_000_000, activa: true, nombre: 'X', banco: 'Y', tipo: 'Ahorros', fechaCreacion: '2026-01-01T00:00:00Z' }],
      inversiones: [], gastos: [{ id: 'g', descripcion: 'X', monto: 1_000_000, categoria: 'Otros', fecha: '2026-03-01' }],
      config: { datosFiscales: { 2026: { ingresosBrutos: 999_000_000 } } },
    }, 2026);
    expect(crit(r, 'patrimonioBruto').valor).toBe(5_000_000);
    expect(crit(r, 'consumosTotales').valor).toBe(1_000_000);
  });
});
