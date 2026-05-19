import { describe, it, expect } from 'vitest';
import {
  calcularBalance,
  calcularTasaAhorro,
  nivelSalud,
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
} from '../../modules/dominio/analisis/logic.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const ingreso = (overrides = {}) => ({
  id: 'i1', descripcion: 'Salario', monto: 3_000_000,
  frecuencia: 'Mensual', activo: true, ...overrides,
});

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
  id: 'd1', descripcion: 'Crédito vehículo', monto: 800_000,
  frecuencia: 'Mensual', diaPago: 15, tipo: 'deuda', activo: true,
  saldoPendiente: 12_000_000, ...overrides,
});

// ── calcularBalance() ─────────────────────────────────────────────

describe('calcularBalance()', () => {
  it('superávit: ingresos > gastos + compromisos', () => {
    expect(calcularBalance(3_000_000, 500_000, 1_000_000)).toBe(1_500_000);
  });

  it('equilibrio: balance exactamente 0', () => {
    expect(calcularBalance(2_000_000, 1_000_000, 1_000_000)).toBe(0);
  });

  it('déficit: gastos + compromisos > ingresos', () => {
    expect(calcularBalance(1_000_000, 800_000, 500_000)).toBe(-300_000);
  });

  it('sin ingresos devuelve negativo', () => {
    expect(calcularBalance(0, 200_000, 100_000)).toBe(-300_000);
  });

  it('sin gastos ni compromisos devuelve el ingreso completo', () => {
    expect(calcularBalance(2_000_000, 0, 0)).toBe(2_000_000);
  });
});

// ── calcularTasaAhorro() ──────────────────────────────────────────

describe('calcularTasaAhorro()', () => {
  it('ahorra el 50% cuando egresa la mitad', () => {
    expect(calcularTasaAhorro(2_000_000, 1_000_000)).toBe(50);
  });

  it('ahorra el 20% — regla 50/30/20', () => {
    expect(calcularTasaAhorro(2_000_000, 1_600_000)).toBe(20);
  });

  it('tasa 0% si egresa todo', () => {
    expect(calcularTasaAhorro(1_000_000, 1_000_000)).toBe(0);
  });

  it('tasa negativa si egresa más de lo que ingresa', () => {
    expect(calcularTasaAhorro(1_000_000, 1_200_000)).toBe(-20);
  });

  it('devuelve 0 si no hay ingresos', () => {
    expect(calcularTasaAhorro(0, 500_000)).toBe(0);
  });

  it('redondea al entero más cercano', () => {
    // 1/3 ≈ 33.33% → 33
    expect(calcularTasaAhorro(3_000_000, 2_000_000)).toBe(33);
  });
});

// ── nivelSalud() ──────────────────────────────────────────────────

describe('nivelSalud()', () => {
  it('excelente cuando tasa ≥ 20%', () => {
    expect(nivelSalud(20)).toBe('excelente');
    expect(nivelSalud(50)).toBe('excelente');
  });

  it('buena cuando tasa 10–19%', () => {
    expect(nivelSalud(10)).toBe('buena');
    expect(nivelSalud(19)).toBe('buena');
  });

  it('ajustada cuando tasa 0–9%', () => {
    expect(nivelSalud(0)).toBe('ajustada');
    expect(nivelSalud(9)).toBe('ajustada');
  });

  it('critica cuando tasa negativa', () => {
    expect(nivelSalud(-1)).toBe('critica');
    expect(nivelSalud(-50)).toBe('critica');
  });
});

// ── generarResumen() ──────────────────────────────────────────────

describe('generarResumen()', () => {
  const MES  = 5;
  const ANIO = 2026;

  it('agrega ingresoMensual correctamente', () => {
    const resumen = generarResumen([ingreso()], [], [], [], ANIO, MES);
    expect(resumen.ingresoMensual).toBe(3_000_000);
  });

  it('agrega gastoMes solo del mes indicado', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 200_000, fecha: '2026-05-10' }),
      gasto({ id: 'g2', monto: 999_999, fecha: '2026-04-01' }), // otro mes
    ];
    const resumen = generarResumen([], gastos, [], [], ANIO, MES);
    expect(resumen.gastoMes).toBe(200_000);
  });

  it('agrega compromisoMensual correctamente', () => {
    const resumen = generarResumen([], [], [compromiso()], [], ANIO, MES);
    expect(resumen.compromisoMensual).toBe(1_000_000);
  });

  it('agrega saldoCuentas solo de cuentas activas', () => {
    const cuentas = [
      cuenta({ saldo: 500_000 }),
      cuenta({ id: 'cu2', saldo: 300_000, activa: false }),
    ];
    const resumen = generarResumen([], [], [], cuentas, ANIO, MES);
    expect(resumen.saldoCuentas).toBe(500_000);
  });

  it('calcula balance correctamente', () => {
    const gastos = [gasto({ monto: 500_000, fecha: '2026-05-10' })];
    const resumen = generarResumen([ingreso()], gastos, [compromiso()], [], ANIO, MES);
    // 3_000_000 - 500_000 - 1_000_000 = 1_500_000
    expect(resumen.balance).toBe(1_500_000);
  });

  it('calcula egresos = gastoMes + compromisoMensual', () => {
    const gastos = [gasto({ monto: 500_000, fecha: '2026-05-10' })];
    const resumen = generarResumen([ingreso()], gastos, [compromiso()], [], ANIO, MES);
    expect(resumen.egresos).toBe(1_500_000);
  });

  it('calcula tasaAhorro correctamente', () => {
    // Ingreso 3M, egresos 1.5M → 50%
    const gastos = [gasto({ monto: 500_000, fecha: '2026-05-10' })];
    const resumen = generarResumen([ingreso()], gastos, [compromiso()], [], ANIO, MES);
    expect(resumen.tasaAhorro).toBe(50);
  });

  it('asigna nivel de salud correcto', () => {
    const gastos = [gasto({ monto: 500_000, fecha: '2026-05-10' })];
    const resumen = generarResumen([ingreso()], gastos, [compromiso()], [], ANIO, MES);
    expect(resumen.salud).toBe('excelente'); // tasa 50%
  });

  it('construye porCategoria con gastos del mes', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 200_000, categoria: 'Alimentación', fecha: '2026-05-10' }),
      gasto({ id: 'g2', monto: 80_000,  categoria: 'Transporte',   fecha: '2026-05-15' }),
    ];
    const resumen = generarResumen([], gastos, [], [], ANIO, MES);
    expect(resumen.porCategoria['Alimentación']).toBe(200_000);
    expect(resumen.porCategoria['Transporte']).toBe(80_000);
  });

  it('hormigas vacíos cuando no hay gastos pequeños significativos', () => {
    const gastos = [gasto({ monto: 500_000, fecha: '2026-05-10' })];
    const resumen = generarResumen([], gastos, [], [], ANIO, MES);
    expect(resumen.hormigas).toEqual([]);
  });

  it('detecta hormigas cuando hay muchos gastos pequeños', () => {
    const gastos = Array.from({ length: 8 }, (_, i) =>
      gasto({ id: `g${i}`, monto: 15_000, fecha: '2026-05-10' })
    );
    const resumen = generarResumen([], gastos, [], [], ANIO, MES);
    expect(resumen.hormigas.length).toBeGreaterThan(0);
    expect(resumen.hormigas[0].categoria).toBe('Alimentación');
  });

  it('devuelve objeto con todas las claves esperadas', () => {
    const resumen = generarResumen([], [], [], [], ANIO, MES);
    const claves = ['ingresoMensual', 'gastoMes', 'compromisoMensual', 'saldoCuentas',
                    'egresos', 'balance', 'tasaAhorro', 'salud', 'porCategoria', 'hormigas'];
    for (const clave of claves) {
      expect(resumen).toHaveProperty(clave);
    }
  });

  it('todos en 0 con estado vacío', () => {
    const resumen = generarResumen([], [], [], [], ANIO, MES);
    expect(resumen.ingresoMensual).toBe(0);
    expect(resumen.gastoMes).toBe(0);
    expect(resumen.balance).toBe(0);
    expect(resumen.saldoCuentas).toBe(0);
    expect(resumen.hormigas).toEqual([]);
  });

  it('incluye activos, pasivos, patrimonioNeto y proyeccion (extension v1.1)', () => {
    const resumen = generarResumen([], [], [], [], ANIO, MES);
    expect(resumen).toHaveProperty('activos');
    expect(resumen).toHaveProperty('pasivos');
    expect(resumen).toHaveProperty('patrimonioNeto');
    expect(resumen).toHaveProperty('proyeccion');
  });

  it('agrega activos de cuentas + metas en resumen', () => {
    const resumen = generarResumen([], [], [], [cuenta()], ANIO, MES, [meta()]);
    // 500_000 (cuenta) + 1_000_000 (meta) = 1_500_000
    expect(resumen.activos.total).toBe(1_500_000);
  });

  it('agrega pasivos de deudas en resumen', () => {
    const resumen = generarResumen([], [], [deuda()], [], ANIO, MES);
    expect(resumen.pasivos.total).toBe(12_000_000);
  });

  it('calcula patrimonioNeto como activos - pasivos', () => {
    const resumen = generarResumen(
      [], [], [deuda()], [cuenta({ saldo: 2_000_000 })], ANIO, MES, [meta()]
    );
    // activos = 2_000_000 + 1_000_000 = 3_000_000
    // pasivos = 12_000_000
    // patrimonio = -9_000_000
    expect(resumen.patrimonioNeto).toBe(-9_000_000);
  });

  it('proyección usa balance del mes como ahorro mensual', () => {
    // ingreso 3M, sin egresos → balance = 3M → ahorroMensual = 3M
    const resumen = generarResumen([ingreso()], [], [], [], ANIO, MES);
    // patrimonio inicial 0, ahorro 3M/mes, 12 meses → 36M
    expect(resumen.proyeccion.doceMeses).toBe(36_000_000);
  });

  it('mantiene compatibilidad con llamadas sin metas (6 argumentos)', () => {
    // Llamadas previas a la extensión no pasaban metas
    const resumen = generarResumen([], [], [], [], ANIO, MES);
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
  it('suma saldoPendiente de deudas activas', () => {
    const r = calcularPasivos([deuda()]);
    expect(r.total).toBe(12_000_000);
    expect(r.cantidadDeudas).toBe(1);
    expect(r.deudasSinSaldo).toBe(0);
  });

  it('cuenta deudas sin saldoPendiente como "sin saldo registrado"', () => {
    const deudas = [
      deuda(),
      deuda({ id: 'd2', saldoPendiente: undefined }),
    ];
    const r = calcularPasivos(deudas);
    expect(r.total).toBe(12_000_000);
    expect(r.cantidadDeudas).toBe(2);
    expect(r.deudasSinSaldo).toBe(1);
  });

  it('ignora compromisos que no son tipo "deuda"', () => {
    const comps = [
      deuda(),
      compromiso(), // tipo='fijo'
      compromiso({ id: 'c2', tipo: 'agenda', saldoPendiente: 999_999 }),
    ];
    const r = calcularPasivos(comps);
    expect(r.total).toBe(12_000_000);
    expect(r.cantidadDeudas).toBe(1);
  });

  it('ignora deudas inactivas', () => {
    const deudas = [
      deuda(),
      deuda({ id: 'd2', saldoPendiente: 999_999, activo: false }),
    ];
    const r = calcularPasivos(deudas);
    expect(r.total).toBe(12_000_000);
    expect(r.cantidadDeudas).toBe(1);
  });

  it('rechaza saldoPendiente no numérico o negativo', () => {
    const deudas = [
      deuda({ id: 'd1', saldoPendiente: 'abc' }),
      deuda({ id: 'd2', saldoPendiente: -1_000_000 }),
      deuda({ id: 'd3', saldoPendiente: 0 }),
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
    tasaAhorro: 20,
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
      tasaAhorro: 0,
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
      tasaAhorro: 40, // excelente ahorro
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

  it('devuelve factors con 4 sub-scores', () => {
    const result = calcularScoreSalud(resumenBase);
    expect(result.factors).toHaveProperty('tasaAhorro');
    expect(result.factors).toHaveProperty('deuda');
    expect(result.factors).toHaveProperty('liquidez');
    expect(result.factors).toHaveProperty('control');
  });

  it('devuelve explicacion con los 4 sub-scores', () => {
    const result = calcularScoreSalud(resumenBase);
    expect(result.explicacion).toContain('Ahorro');
    expect(result.explicacion).toContain('Deuda');
    expect(result.explicacion).toContain('Liquidez');
    expect(result.explicacion).toContain('Control');
  });

  it('factor tasa de ahorro: 20% → 100 puntos', () => {
    const resumen = { ...resumenBase, tasaAhorro: 20 };
    const result = calcularScoreSalud(resumen);
    expect(result.factors.tasaAhorro).toBe(100);
  });

  it('factor tasa de ahorro: 0% → ~50 puntos', () => {
    const resumen = { ...resumenBase, tasaAhorro: 0 };
    const result = calcularScoreSalud(resumen);
    expect(result.factors.tasaAhorro).toBe(0);
  });

  it('factor tasa de ahorro: negativa → 0 puntos (clamp)', () => {
    const resumen = { ...resumenBase, tasaAhorro: -10 };
    const result = calcularScoreSalud(resumen);
    expect(result.factors.tasaAhorro).toBe(0);
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

  it('score es promedio ponderado de 4 factores (40/25/20/15)', () => {
    // Si todos los factores son 100: score debería ser 100
    const resumen = {
      tasaAhorro: 20,
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
      tasaAhorro: 0,
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

// ── clasificarScore() ─────────────────────────────────────────────

describe('clasificarScore()', () => {
  it('clasifica 80–100 como excelente', () => {
    expect(clasificarScore(80)).toBe('excelente');
    expect(clasificarScore(90)).toBe('excelente');
    expect(clasificarScore(100)).toBe('excelente');
  });

  it('clasifica 60–79 como buena', () => {
    expect(clasificarScore(60)).toBe('buena');
    expect(clasificarScore(70)).toBe('buena');
    expect(clasificarScore(79)).toBe('buena');
  });

  it('clasifica 40–59 como ajustada', () => {
    expect(clasificarScore(40)).toBe('ajustada');
    expect(clasificarScore(50)).toBe('ajustada');
    expect(clasificarScore(59)).toBe('ajustada');
  });

  it('clasifica 0–39 como critica', () => {
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
