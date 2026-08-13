import { describe, it, expect, beforeEach } from 'vitest';
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
  estimarIngresosBrutosAnio,
  detectarNudgesRenta,
  inferirEstadoDeclarante,
  repartirPorcentajes,
  lecturaPatrimonio,
  lecturaTendencia,
  lecturaCategorias,
  lecturaComparacion,
} from '../../modules/dominio/analisis/logic.js';
import { descuentaSaldo } from '../../modules/infra/bolsas.js';
import { UVT, TOPES_RENTA_UVT } from '../../modules/core/constants.js';
import { renderAnalisis, precalentarAnalisis } from '../../modules/dominio/analisis/view.js';
import { S } from '../../modules/core/state.js';

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

const apartado = (overrides = {}) => ({
  id: 'ap1', nombre: 'SOAT', icono: '🚗', montoObjetivo: 600_000,
  montoActual: 200_000, fechaObjetivo: '2026-08-15', frecuenciaAporte: 'Mensual',
  recurrente: true, periodoMeses: 12, completado: false, ...overrides,
});

const inversion = (overrides = {}) => ({
  id: 'inv1', tipo: 'CDT', nombre: 'CDT Bancolombia', monto: 2_000_000,
  tasaEA: 10.5, plazoMeses: 12, fechaInicio: '2026-03-01', ...overrides,
});

const ingreso = (overrides = {}) => ({
  id: 'in1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual',
  categoria: 'Salario', diaPago: 30, activo: true,
  fechaCreacion: '2026-01-01T00:00:00Z', ...overrides,
});

const ingresoPuntual = (overrides = {}) => ({
  id: 'ip1', descripcion: 'Freelance', monto: 2_000_000, categoria: 'Otros',
  cuentaId: 'cu1', fecha: '2026-04-10',
  fechaCreacion: '2026-04-10T00:00:00Z', ...overrides,
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

  it('agrega apartados e inversiones a los activos del resumen', () => {
    const resumen = generarResumen(
      [], [], [cuenta()], ANIO, MES, [meta()], [apartado()], [inversion()]
    );
    // 500_000 + 1_000_000 + 200_000 + 2_000_000 = 3_700_000
    expect(resumen.activos.totalApartados).toBe(200_000);
    expect(resumen.activos.totalInversiones).toBe(2_000_000);
    expect(resumen.activos.total).toBe(3_700_000);
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
    expect(r).toEqual({
      totalCuentas: 0, totalMetas: 0, totalApartados: 0, totalInversiones: 0,
      totalPorCobrar: 0, prestamosSinCuenta: 0, total: 0,
    });
  });

  it('suma el montoActual de apartados activos', () => {
    const r = calcularActivos([], [], [apartado()]);
    expect(r.totalApartados).toBe(200_000);
    expect(r.total).toBe(200_000);
  });

  it('ignora apartados no recurrentes ya completados (su dinero ya se gastó)', () => {
    const apartados = [
      apartado(),
      apartado({ id: 'ap2', montoActual: 999_999, completado: true, recurrente: false }),
    ];
    const r = calcularActivos([], [], apartados);
    expect(r.totalApartados).toBe(200_000);
  });

  it('incluye apartados recurrentes completados (el dinero sigue reservado)', () => {
    const r = calcularActivos([], [], [
      apartado({ montoActual: 600_000, completado: true, recurrente: true }),
    ]);
    expect(r.totalApartados).toBe(600_000);
  });

  it('suma el monto invertido de las inversiones', () => {
    const r = calcularActivos([], [], [], [inversion()]);
    expect(r.totalInversiones).toBe(2_000_000);
    expect(r.total).toBe(2_000_000);
  });

  it('combina cuentas + metas + apartados + inversiones en el total', () => {
    const r = calcularActivos([cuenta()], [meta()], [apartado()], [inversion()]);
    // 500_000 + 1_000_000 + 200_000 + 2_000_000
    expect(r.total).toBe(3_700_000);
  });

  it('excluye el fondo de emergencia (no recibe ese bucket): no duplica cuentas', () => {
    // calcularActivos no toma el fondo como parámetro a propósito; su dinero ya
    // vive en `cuentas` porque el aporte al fondo no descuenta la cuenta.
    const r = calcularActivos([cuenta({ saldo: 1_000_000 })], []);
    expect(r.total).toBe(1_000_000);
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

  // ── "Por cobrar" (PE.7) ──

  it('suma como activo el capital pendiente de préstamos con cuenta vinculada', () => {
    const personales = [{ monto: 400_000, pagado: 0, cuentaId: 'cu1' }];
    const r = calcularActivos([], [], [], [], personales);
    expect(r.totalPorCobrar).toBe(400_000);
    expect(r.total).toBe(400_000);
  });

  it('prestar NO mueve el patrimonio: la cuenta baja y "por cobrar" sube lo mismo', () => {
    // Invariante central de PE.7. Prestar convierte efectivo en un derecho de
    // cobro; no destruye riqueza. Si esta identidad se rompe, el patrimonio
    // del usuario cae (o sube) solo por registrar un préstamo.
    const antes = calcularActivos([cuenta({ saldo: 1_000_000 })], []);

    // Presta 400.000 desde esa cuenta: el saldo baja y nace el préstamo.
    const despues = calcularActivos(
      [cuenta({ saldo: 600_000 })], [], [], [],
      [{ monto: 400_000, pagado: 0, cuentaId: 'cu1' }],
    );

    expect(antes.total).toBe(1_000_000);
    expect(despues.total).toBe(1_000_000);
  });

  it('un préstamo SIN cuenta vinculada no suma: su dinero sigue dentro de cuentas', () => {
    // Misma razón por la que se excluye el fondo de emergencia. Sumarlo aquí
    // contaría dos veces el mismo dinero.
    const r = calcularActivos(
      [cuenta({ saldo: 1_000_000 })], [], [], [],
      [{ monto: 400_000, pagado: 0 }],
    );
    expect(r.totalPorCobrar).toBe(0);
    expect(r.total).toBe(1_000_000);
  });

  it('sin préstamos el bucket queda en 0 y no altera el total', () => {
    const r = calcularActivos([cuenta()], [meta()], [apartado()], [inversion()]);
    expect(r.totalPorCobrar).toBe(0);
    expect(r.total).toBe(3_700_000);
  });

  it('prestamosSinCuenta cuenta los préstamos con saldo pendiente que quedaron fuera del activo (ANL.3)', () => {
    const r = calcularActivos([], [], [], [], [
      { monto: 400_000, pagado: 0 },
      { monto: 200_000, pagado: 0, cuentaId: 'cu1' },
      { monto: 300_000, pagado: 300_000 },
    ]);
    expect(r.prestamosSinCuenta).toBe(1);
  });

  // ── invariante de patrimonio (ADR 053, propiedad "descuenta saldo") ──
  // descuentaSaldo() vive en infra/bolsas.js (ARQ.1): es la tabla del ADR
  // hecha código, no una entrada nueva de este cálculo (I4: la regla de suma
  // no se toca de forma retroactiva).

  it('metas y apartados siempre descuentan saldo: por eso su bucket entra completo', () => {
    expect(descuentaSaldo('metas')).toBe(true);
    expect(descuentaSaldo('apartados')).toBe(true);
  });

  it('el fondo nunca descuenta saldo (ADR 020): por eso no tiene bucket propio acá', () => {
    expect(descuentaSaldo('fondo')).toBe(false);
  });

  it('una inversión descuenta saldo solo si declaró cuenta de origen (INV.1)', () => {
    expect(descuentaSaldo('inversion', inversion({ cuentaId: 'cu1' }))).toBe(true);
    expect(descuentaSaldo('inversion', inversion({ cuentaId: undefined }))).toBe(false);
  });

  it('brecha aceptada (ADR 053 I4): una inversión sin cuenta de origen igual suma a activos', () => {
    // No es un bug: sin backfill de procedencia (I4), calcularActivos no puede
    // distinguir esta inversión de una que sí descontó una cuenta real.
    const sinOrigen = inversion({ cuentaId: undefined });
    const r = calcularActivos([], [], [], [sinOrigen]);
    expect(descuentaSaldo('inversion', sinOrigen)).toBe(false);
    expect(r.totalInversiones).toBe(sinOrigen.monto);
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

  it('sin ingresos registrados ni datos manuales, los 3 criterios quedan "sin-datos"', () => {
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

  // CFG.2b: la conclusión sobre declarar salió de acá y vive en
  // `inferirEstadoDeclarante()`. Esta función ya no lee el perfil fiscal.
  it('el perfil fiscal ya no genera nudges: solo los criterios los generan', () => {
    const r = calcularEstadoRenta({ cuentas: [], inversiones: [], gastos: [] }, 2026);
    expect(detectarNudgesRenta(r, { declaranteObligado: true })).toEqual([]);
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

// ── CFG.2b - INFERENCIA DEL ESTADO DE DECLARANTE ─────────────────

describe('inferirEstadoDeclarante()', () => {
  const base = { cuentas: [], inversiones: [], gastos: [] };
  const conTodo = (extra = {}) => calcularEstadoRenta({
    ...base,
    config: { datosFiscales: { 2026: { ingresosBrutos: 0, consumosTC: 0, consignaciones: 0, ...extra } } },
  }, 2026);

  const conGasto = (factor) => {
    const tope = TOPES_RENTA_UVT.consumosTotales * UVT;
    return calcularEstadoRenta({
      ...base,
      gastos: [{ id: 'g', descripcion: 'X', monto: Math.round(tope * factor), categoria: 'Otros', fecha: '2026-06-15' }],
    }, 2026);
  };

  it('input inválido devuelve null sin lanzar', () => {
    expect(inferirEstadoDeclarante(null)).toBeNull();
    expect(inferirEstadoDeclarante({})).toBeNull();
    expect(inferirEstadoDeclarante({ criterios: 'no-array' })).toBeNull();
  });

  it('un tope superado da estado "probable" y nombra el criterio', () => {
    const v = inferirEstadoDeclarante(conGasto(1.20));
    expect(v.estado).toBe('probable');
    expect(v.nivel).toBe('nudge-high');
    expect(v.origen).toBe('criterios');
    expect(v.superados).toContain('Compras y consumos totales');
    expect(v.mensaje).toContain('Compras y consumos totales');
  });

  it('nunca afirma la obligación como hecho: usa "es probable" y deriva al contador', () => {
    const v = inferirEstadoDeclarante(conGasto(1.20));
    expect(v.titulo).toContain('probable');
    expect(v.mensaje).toContain('contador');
    expect(v.mensaje).not.toContain('Debes declarar');
  });

  it('un criterio por encima del 80 % sin superar da "posible"', () => {
    const v = inferirEstadoDeclarante(conGasto(0.85));
    expect(v.estado).toBe('posible');
    expect(v.nivel).toBe('nudge-medium');
    expect(v.cerca).toContain('Compras y consumos totales');
  });

  it('sin nada disparado y con criterios sin dato da "sin-conclusion" y los cuenta', () => {
    const v = inferirEstadoDeclarante(calcularEstadoRenta(base, 2026));
    expect(v.estado).toBe('sin-conclusion');
    expect(v.nivel).toBe('nudge-info');
    expect(v.sinDato).toBe(3);
    expect(v.mensaje).toContain('3 de los 5');
  });

  it('los 5 criterios medidos y ninguno en su tope da "improbable"', () => {
    const v = inferirEstadoDeclarante(conTodo());
    expect(v.estado).toBe('improbable');
    expect(v.sinDato).toBe(0);
    expect(v.nivel).toBe('nudge-info');
  });

  it('declaranteObligado=true manda sobre los criterios: siempre "probable"', () => {
    const v = inferirEstadoDeclarante(conTodo(), { declaranteObligado: true });
    expect(v.estado).toBe('probable');
    expect(v.origen).toBe('notificacion');
    expect(v.mensaje).toContain('2026');
  });

  it('notificado y además superando un tope: menciona las dos cosas', () => {
    const v = inferirEstadoDeclarante(conGasto(1.20), { declaranteObligado: true });
    expect(v.origen).toBe('notificacion');
    expect(v.mensaje).toContain('Además');
    expect(v.mensaje).toContain('Compras y consumos totales');
  });

  it('declaranteObligado=false no niega la conclusión de los criterios', () => {
    const v = inferirEstadoDeclarante(conGasto(1.20), { declaranteObligado: false });
    expect(v.estado).toBe('probable');
    expect(v.origen).toBe('criterios');
  });

  it('el encuadre cambia con la situación laboral', () => {
    const r = conGasto(1.20);
    const emp = inferirEstadoDeclarante(r, null, 'empleado');
    const ind = inferirEstadoDeclarante(r, null, 'independiente');
    expect(emp.encuadre).toContain('empleador');
    expect(ind.encuadre).toContain('independiente');
    expect(emp.encuadre).not.toBe(ind.encuadre);
    // La conclusión NO cambia con la situación laboral, solo el encuadre.
    expect(emp.estado).toBe(ind.estado);
    expect(emp.mensaje).toBe(ind.mensaje);
  });

  it('sin situación laboral el encuadre invita a registrarla', () => {
    const v = inferirEstadoDeclarante(conGasto(1.20), null, '');
    expect(v.encuadre).toContain('Ajustes');
  });

  it('una situación laboral desconocida cae en el encuadre genérico', () => {
    const v = inferirEstadoDeclarante(conGasto(1.20), null, 'inventada');
    expect(v.encuadre).toBe(inferirEstadoDeclarante(conGasto(1.20), null, 'otro').encuadre);
  });

  it('enumera varios criterios superados con comas y "y"', () => {
    const topeC = TOPES_RENTA_UVT.consumosTotales * UVT;
    const topeP = TOPES_RENTA_UVT.patrimonioBruto * UVT;
    const r = calcularEstadoRenta({
      cuentas: [{ id: 'c', saldo: Math.round(topeP * 1.10), activa: true, nombre: 'X', banco: 'Y', tipo: 'Ahorros', fechaCreacion: '2026-01-01T00:00:00Z' }],
      inversiones: [],
      gastos: [{ id: 'g', descripcion: 'X', monto: Math.round(topeC * 1.10), categoria: 'Otros', fecha: '2026-06-15' }],
    }, 2026);
    const v = inferirEstadoDeclarante(r);
    expect(v.superados).toHaveLength(2);
    expect(v.mensaje).toContain(' y ');
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

  it('sin datosFiscales y sin ingresos, los 3 criterios siguen en sin-datos', () => {
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

// ── CFG.2a: ingresos brutos derivados ─────────────────────────────

describe('estimarIngresosBrutosAnio()', () => {
  it('sin nada que proyectar devuelve 0', () => {
    expect(estimarIngresosBrutosAnio([], [], 2026)).toBe(0);
    expect(estimarIngresosBrutosAnio(undefined, undefined, 2026)).toBe(0);
    expect(estimarIngresosBrutosAnio(null, null, 2026)).toBe(0);
  });

  it('un año no finito devuelve 0', () => {
    expect(estimarIngresosBrutosAnio([ingreso()], [], NaN)).toBe(0);
  });

  it('proyecta el sueldo mensual a los 12 meses del año', () => {
    expect(estimarIngresosBrutosAnio([ingreso({ monto: 3_000_000 })], [], 2026)).toBe(36_000_000);
  });

  it('la quincena se proyecta a 24 pagos', () => {
    const i = ingreso({ monto: 1_500_000, frecuencia: 'Quincenal' });
    expect(estimarIngresosBrutosAnio([i], [], 2026)).toBe(36_000_000);
  });

  it('incluye las frecuencias que la proyección mensual descarta (prima semestral)', () => {
    const prima = ingreso({ id: 'in2', descripcion: 'Prima', monto: 3_000_000, frecuencia: 'Semestral' });
    expect(estimarIngresosBrutosAnio([prima], [], 2026)).toBe(6_000_000);
  });

  it('"Única vez" no se proyecta: no se puede atribuir a un año', () => {
    const i = ingreso({ monto: 5_000_000, frecuencia: 'Única vez' });
    expect(estimarIngresosBrutosAnio([i], [], 2026)).toBe(0);
  });

  it('los ingresos inactivos no cuentan', () => {
    const i = ingreso({ activo: false });
    expect(estimarIngresosBrutosAnio([i], [], 2026)).toBe(0);
  });

  it('suma los ingresos puntuales del año consultado', () => {
    const r = estimarIngresosBrutosAnio([ingreso()], [ingresoPuntual({ monto: 2_000_000 })], 2026);
    expect(r).toBe(38_000_000);
  });

  it('los ingresos puntuales de otro año no entran', () => {
    const viejo = ingresoPuntual({ fecha: '2025-12-31', monto: 9_000_000 });
    expect(estimarIngresosBrutosAnio([], [viejo], 2026)).toBe(0);
  });

  it('ignora puntuales sin fecha válida o con monto no positivo', () => {
    const malos = [
      ingresoPuntual({ id: 'a', fecha: null }),
      ingresoPuntual({ id: 'b', monto: -100 }),
      ingresoPuntual({ id: 'c', monto: 'x' }),
    ];
    expect(estimarIngresosBrutosAnio([], malos, 2026)).toBe(0);
  });

  it('un monto corrupto no propaga NaN al resultado', () => {
    expect(estimarIngresosBrutosAnio([ingreso({ monto: NaN })], [], 2026)).toBe(0);
  });
});

describe('calcularEstadoRenta() con ingresos derivados (CFG.2a)', () => {
  const conIngresos = (ingresos, puntuales = [], extra = {}) => calcularEstadoRenta({
    cuentas: [], inversiones: [], gastos: [],
    ingresos, ingresosPuntuales: puntuales, ...extra,
  }, 2026);

  const crit = (r) => r.criterios.find(c => c.id === 'ingresosBrutos');

  it('con ingresos registrados el criterio deja de ser "sin-datos"', () => {
    const c = crit(conIngresos([ingreso({ monto: 3_000_000 })]));
    expect(c.medible).toBe(true);
    expect(c.estado).not.toBe('sin-datos');
    expect(c.valor).toBe(36_000_000);
  });

  it('el tip dice que es una estimación, no un valor medido', () => {
    const c = crit(conIngresos([ingreso()]));
    expect(c.tip).toMatch(/estimación/i);
    expect(c.tip).not.toMatch(/manualmente/i);
  });

  it('el valor manual manda sobre la estimación', () => {
    const c = crit(conIngresos([ingreso({ monto: 3_000_000 })], [], {
      config: { datosFiscales: { 2026: { ingresosBrutos: 10_000_000 } } },
    }));
    expect(c.valor).toBe(10_000_000);
    expect(c.tip).toMatch(/manualmente/i);
  });

  it('un 0 manual también manda: apaga la estimación', () => {
    const c = crit(conIngresos([ingreso({ monto: 3_000_000 })], [], {
      config: { datosFiscales: { 2026: { ingresosBrutos: 0 } } },
    }));
    expect(c.valor).toBe(0);
    expect(c.estado).toBe('ok');
  });

  it('un sueldo sobre el tope pasa el criterio a "supera" sin captura manual', () => {
    const tope  = TOPES_RENTA_UVT.ingresosBrutos * UVT;
    const suelo = Math.ceil((tope * 1.2) / 12);
    const c = crit(conIngresos([ingreso({ monto: suelo })]));
    expect(c.estado).toBe('supera');
  });

  it('la estimación alcanza para que el veredicto deje de ser sin-conclusión', () => {
    const tope  = TOPES_RENTA_UVT.ingresosBrutos * UVT;
    const suelo = Math.ceil((tope * 1.2) / 12);
    const v = inferirEstadoDeclarante(conIngresos([ingreso({ monto: suelo })]));
    expect(v.estado).toBe('probable');
    expect(v.superados).toContain('Ingresos brutos');
  });

  it('sin ingresos ni valor manual el criterio sigue en sin-datos', () => {
    const c = crit(conIngresos([], []));
    expect(c.estado).toBe('sin-datos');
    expect(c.medible).toBe(false);
    expect(c.tip).toMatch(/Regístralo|Agrégalos/i);
  });
});

// ── renderAnalisis() - variación de tendencia ────────────────────

describe('renderAnalisis() - variación sin base (regresión: "↑ 0%" en rojo)', () => {
  /** Fecha YYYY-MM-DD del día `dia` del mes actual + offset. */
  const fechaMes = (offset, dia) => {
    const ahora = new Date();
    const d = new Date(ahora.getFullYear(), ahora.getMonth() + offset, dia);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-analisis"></div>';
    S.gastos      = [];
    S.compromisos = [];
    S.cuentas     = [];
    S.metas       = [];
    S.apartados   = [];
    S.inversiones = [];
  });

  it('sin gastos el mes anterior muestra el aviso neutro, no un porcentaje', () => {
    S.gastos = [gasto({ fecha: fechaMes(0, 1), monto: 387_000 })];
    renderAnalisis();
    const html = document.getElementById('panel-analisis').innerHTML;
    expect(html).toContain('Sin gastos el mes anterior para comparar');
    expect(html).not.toContain('0% vs mes anterior');
  });

  it('con gastos en ambos meses sí muestra el porcentaje de variación', () => {
    S.gastos = [
      gasto({ id: 'g1', fecha: fechaMes(-1, 1), monto: 200_000 }),
      gasto({ id: 'g2', fecha: fechaMes(0, 1),  monto: 300_000 }),
    ];
    renderAnalisis();
    const html = document.getElementById('panel-analisis').innerHTML;
    expect(html).toContain('↑ 50% vs mes anterior');
  });
});

describe('renderAnalisis() - ANL.2c paleta unificada: las filas nacen de los segmentos de la dona', () => {
  const fechaMesActual = (dia) => {
    const ahora = new Date();
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    return `${ahora.getFullYear()}-${mm}-${String(dia).padStart(2, '0')}`;
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-analisis"></div>';
    S.gastos      = [];
    S.compromisos = [];
    S.cuentas     = [];
    S.metas       = [];
    S.apartados   = [];
    S.inversiones = [];
  });

  it('cada fila lleva el color del segmento de la dona en el mismo orden', () => {
    S.gastos = [
      gasto({ id: 'g1', categoria: 'Mercado',    monto: 600_000, fecha: fechaMesActual(2) }),
      gasto({ id: 'g2', categoria: 'Transporte', monto: 300_000, fecha: fechaMesActual(3) }),
    ];
    renderAnalisis();

    const filas = [...document.querySelectorAll('.catg-card__row')];
    expect(filas.length).toBe(2);
    const arcos = [...document.querySelectorAll('.catg-card__donut .donut circle')];
    expect(arcos.length).toBe(2);

    filas.forEach((fila, i) => {
      const dot = fila.querySelector('.catg-card__dot');
      expect(dot.style.background, `fila ${i}`).not.toBe('');
      // El color inline del dot es exactamente el stroke del arco i.
      expect(arcos[i].getAttribute('stroke')).toBeTruthy();
      expect(dot.getAttribute('style')).toContain(arcos[i].getAttribute('stroke'));
    });

    // Mayor gasto primero: Mercado encabeza la lista y el centro de la dona.
    expect(filas[0].querySelector('.catg-card__nombre').textContent).toBe('Mercado');
    expect(filas[0].querySelector('.catg-card__monto').textContent).toBe('$600.000');
    expect(filas[0].querySelector('.catg-card__pct').textContent).toBe('67%');
  });
});

// ── PERF.3: cómputo diferido del grupo "Más detalle de tus gastos" ──

describe('renderAnalisis() - PERF.3 detalle de gastos diferido', () => {
  const fechaMesActual = (dia) => {
    const ahora = new Date();
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    return `${ahora.getFullYear()}-${mm}-${String(dia).padStart(2, '0')}`;
  };
  const fechaMesAnterior = (dia) => {
    const ahora = new Date();
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${String(dia).padStart(2, '0')}`;
  };
  const detalle = () => document.querySelector('.analisis-grupo--detalle');
  const abrir = (el) => { el.open = true; el.dispatchEvent(new Event('toggle')); };

  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-analisis"></div>';
    S.gastos = []; S.compromisos = []; S.cuentas = [];
    S.ingresos = []; S.ingresosPuntuales = [];
    S.metas = []; S.apartados = []; S.inversiones = [];
  });

  it('con gasto este mes, muestra el grupo pero difiere su cuerpo hasta abrirlo', () => {
    S.gastos = [
      gasto({ id: 'g1', categoria: 'Alimentación', monto: 200_000, fecha: fechaMesActual(3) }),
      gasto({ id: 'g2', categoria: 'Transporte',   monto: 120_000, fecha: fechaMesActual(4) }),
    ];
    renderAnalisis();

    const grupo = detalle();
    expect(grupo, 'el grupo colapsable debe existir').not.toBeNull();
    // Cuerpo diferido: sin marcar como cargado y sin la comparación pintada.
    // (ANL.2d: "Vs mes anterior" ahora aparece en el subtítulo del summary,
    // así que el marcador de "comparación pintada" es su tabla, no el texto.)
    expect(grupo.dataset.cargado).toBeUndefined();
    expect(grupo.querySelector('.analisis-grupo__body').innerHTML.trim()).toBe('');
    expect(grupo.innerHTML).not.toContain('comparacion__tabla');
  });

  it('al abrir el grupo por primera vez, calcula y pinta el detalle', () => {
    S.gastos = [
      gasto({ id: 'g1', categoria: 'Alimentación', monto: 200_000, fecha: fechaMesActual(3) }),
      gasto({ id: 'g2', categoria: 'Transporte',   monto: 120_000, fecha: fechaMesActual(4) }),
    ];
    renderAnalisis();
    const grupo = detalle();
    abrir(grupo);

    expect(grupo.dataset.cargado).toBe('1');
    expect(grupo.querySelector('.analisis-grupo__body').innerHTML).toContain('Vs mes anterior');
  });

  it('sin gasto este mes pero con historial, pinta el detalle sin esperar el toggle', () => {
    // gastoMes === 0 → ruta ansiosa: el grupo se decide (y llena) en el render,
    // porque la comparación con el mes anterior ("desapareció") sí tiene datos.
    S.gastos = [
      gasto({ id: 'g1', categoria: 'Alimentación', monto: 200_000, fecha: fechaMesAnterior(10) }),
      gasto({ id: 'g2', categoria: 'Transporte',   monto: 120_000, fecha: fechaMesAnterior(12) }),
    ];
    renderAnalisis();

    const grupo = detalle();
    expect(grupo, 'el grupo debe mostrarse con la comparación del mes anterior').not.toBeNull();
    expect(grupo.dataset.cargado).toBe('1');
    expect(grupo.querySelector('.analisis-grupo__body').innerHTML).toContain('Vs mes anterior');
  });

  it('sin gastos, no dibuja el grupo de detalle', () => {
    renderAnalisis();
    expect(detalle()).toBeNull();
  });

  it('sin abrirlo, cada render vuelve a diferir el cuerpo', () => {
    S.gastos = [gasto({ id: 'g1', categoria: 'Alimentación', monto: 200_000, fecha: fechaMesActual(3) })];
    renderAnalisis();
    renderAnalisis();

    const grupo = detalle();
    expect(grupo.open).toBe(false);
    expect(grupo.dataset.cargado).toBeUndefined();
    expect(grupo.querySelector('.analisis-grupo__body').innerHTML.trim()).toBe('');
  });

  it('DIS.10 (C11): lo que el usuario abrió sigue abierto y cargado tras un re-render', () => {
    S.gastos = [gasto({ id: 'g1', categoria: 'Alimentación', monto: 200_000, fecha: fechaMesActual(3) })];
    renderAnalisis();
    abrir(detalle());
    expect(detalle().dataset.cargado).toBe('1');

    // Registrar un gasto estando en Análisis repinta el panel: antes el grupo
    // se cerraba solo y se descartaba el cómputo diferido de PERF.3.
    renderAnalisis();
    const grupo = detalle();
    expect(grupo.open).toBe(true);
    expect(grupo.dataset.cargado).toBe('1');
    expect(grupo.querySelector('.analisis-grupo__body').innerHTML).toContain('Vs mes anterior');
  });
});

// ── renderAnalisis() - PERF.7d: calcularEstadoRenta memoizada ──────

describe('renderAnalisis() - PERF.7d Estado de tu renta memoizado, sin quedar obsoleto', () => {
  const anioActual = new Date().getFullYear();

  // Los otros 4 criterios (patrimonio, consumos, consumosTC, consignaciones)
  // no se tocan en este describe: acotar la búsqueda a "Ingresos brutos" evita
  // falsos negativos/positivos con consumosTC/consignaciones, que aquí siempre
  // están sin dato.
  const criterioIngresos = () => {
    const articulos = [...document.querySelectorAll('.renta-criterio')];
    return articulos.find(a => a.querySelector('.renta-criterio__label')?.textContent === 'Ingresos brutos');
  };
  // DIS.10 (C7): un criterio sin dato ya no es una ficha con valor "N/D": es
  // una línea de la lista compacta, con su tope al lado.
  const ingresosSinDato = () => [...document.querySelectorAll('.renta-sindatos__row')]
    .find(r => r.querySelector('.renta-sindatos__label')?.textContent === 'Ingresos brutos');

  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-analisis"></div>';
    // Una cuenta con saldo: dato mínimo para que ANL.2d no corto-circuite el
    // panel al empty state. No toca el criterio consultado (Ingresos brutos
    // es manual) y su identidad es estable dentro de cada test (memo intacta).
    S.gastos = []; S.compromisos = []; S.cuentas = [cuenta({ saldo: 500_000 })];
    S.ingresos = []; S.ingresosPuntuales = [];
    S.metas = []; S.apartados = []; S.inversiones = [];
    S.config = { datosFiscales: {} };
  });

  it('sin datos fiscales del año, el criterio de ingresos brutos aparece sin datos', () => {
    renderAnalisis();
    expect(criterioIngresos()).toBeUndefined();
    const fila = ingresosSinDato();
    expect(fila).not.toBeUndefined();
    expect(fila.querySelector('.renta-sindatos__tope').textContent).toContain('tope ');
  });

  it('editar datosFiscales entre dos renders refleja el valor nuevo (no sirve caché obsoleta)', () => {
    // 1er render: sin datos fiscales, memoiza el resultado "sin-datos".
    renderAnalisis();
    expect(ingresosSinDato()).not.toBeUndefined();

    // Simula exactamente lo que hace config/index.js al guardar el formulario:
    // reemplaza la entrada del año con un objeto NUEVO, sin pasar por EventBus.
    S.config.datosFiscales[anioActual] = { ingresosBrutos: 50_000_000 };
    renderAnalisis();

    const art = criterioIngresos();
    expect(art).not.toBeUndefined();
    expect(art.querySelector('.renta-criterio__badge').textContent).not.toBe('Sin datos en Finko');
    expect(art.querySelector('.renta-criterio__valor').textContent).toContain('$50.000.000');
    expect(ingresosSinDato()).toBeUndefined();
  });

  it('borrar los datos fiscales del año también se refleja (vuelve a sin-datos)', () => {
    S.config.datosFiscales[anioActual] = { ingresosBrutos: 30_000_000 };
    renderAnalisis();
    expect(criterioIngresos().querySelector('.renta-criterio__valor').textContent).toContain('$30.000.000');

    // Simula el handler cuando el usuario borra el campo y reenvía el form.
    delete S.config.datosFiscales[anioActual];
    renderAnalisis();

    expect(criterioIngresos()).toBeUndefined();
    expect(ingresosSinDato()).not.toBeUndefined();
  });

  it('un segundo render sin ningún cambio no rompe (cache hit correcto)', () => {
    S.config.datosFiscales[anioActual] = { ingresosBrutos: 10_000_000 };
    renderAnalisis();
    renderAnalisis();
    expect(criterioIngresos().querySelector('.renta-criterio__valor').textContent).toContain('$10.000.000');
  });

  // CFG.2a: el criterio ya no depende solo de datosFiscales. Registrar un
  // ingreso tiene que invalidar la misma caché, o el usuario guarda su sueldo
  // y Análisis le sigue diciendo que le faltan datos.
  it('registrar un ingreso entre dos renders saca al criterio de sin-datos', () => {
    renderAnalisis();
    expect(ingresosSinDato()).not.toBeUndefined();

    S.ingresos = [ingreso({ monto: 4_000_000 })];
    renderAnalisis();

    const art = criterioIngresos();
    expect(art).not.toBeUndefined();
    expect(art.querySelector('.renta-criterio__valor').textContent).toContain('$48.000.000');
    expect(ingresosSinDato()).toBeUndefined();
  });

  it('un ingreso puntual del año también invalida la caché', () => {
    S.ingresos = [ingreso({ monto: 1_000_000 })];
    renderAnalisis();
    expect(criterioIngresos().querySelector('.renta-criterio__valor').textContent).toContain('$12.000.000');

    S.ingresosPuntuales = [ingresoPuntual({ monto: 3_000_000, fecha: `${anioActual}-04-10` })];
    renderAnalisis();

    expect(criterioIngresos().querySelector('.renta-criterio__valor').textContent).toContain('$15.000.000');
  });
});

// ── precalentarAnalisis() - PERF.7c warm-up en idle ────────────────

describe('precalentarAnalisis()', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-analisis"></div>';
    S.gastos = [gasto()]; S.compromisos = []; S.cuentas = [cuenta({ saldo: 500_000 })];
    S.ingresos = []; S.ingresosPuntuales = [];
    S.metas = []; S.apartados = []; S.inversiones = []; S.personales = [];
    S.config = { datosFiscales: {} };
  });

  it('no lanza sin ningún contenedor en el DOM', () => {
    document.body.innerHTML = '';
    expect(() => precalentarAnalisis()).not.toThrow();
  });

  it('no toca el DOM', () => {
    precalentarAnalisis();
    expect(document.getElementById('panel-analisis').innerHTML).toBe('');
  });

  it('precalentar antes de renderAnalisis() no cambia el resultado', () => {
    precalentarAnalisis();
    renderAnalisis();
    const html = document.getElementById('panel-analisis').innerHTML;
    expect(html.length).toBeGreaterThan(0);

    document.body.innerHTML = '<div id="panel-analisis"></div>';
    renderAnalisis();
    expect(document.getElementById('panel-analisis').innerHTML).toBe(html);
  });
});

// ── renderAnalisis() - ANL.2a: score hero + chip de mes (ADR 038 D1/D6) ──

describe('renderAnalisis() - ANL.2a score de salud como héroe', () => {
  const fechaMesActual = (dia) => {
    const ahora = new Date();
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    return `${ahora.getFullYear()}-${mm}-${String(dia).padStart(2, '0')}`;
  };

  /** Fecha YYYY-MM-DD de hace 6 meses: escapa del empty state de ANL.2d sin
   *  tocar el score (gastoMes sigue en 0: mismos factores que "todo vacío"). */
  const fechaAntigua = () => {
    const ahora = new Date();
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - 6, 2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${String(d.getDate()).padStart(2, '0')}`;
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-analisis"></div>';
    // Un gasto viejo como dato mínimo (ANL.2d corto-circuita el panel entero
    // si no hay gastos, activos ni deudas); sin gasto ESTE mes, los factores
    // del score son los mismos del estado vacío: 20, banda crítica.
    S.gastos = [gasto({ fecha: fechaAntigua() })];
    S.compromisos = []; S.cuentas = [];
    S.ingresos = []; S.ingresosPuntuales = [];
    S.metas = []; S.apartados = []; S.inversiones = [];
    S.ahorro = { fondoEmergencia: { activo: false, completado: false } };
  });

  it('renderiza el hero con la clase de su banda y el pill con texto + ícono', () => {
    // Sin gasto del mes, sin activos, sin deudas: score 20 (solo control
    // aporta) → banda crítica.
    renderAnalisis();
    const hero = document.querySelector('.score-hero');
    expect(hero).not.toBeNull();
    expect(hero.classList.contains('score-hero--critica')).toBe(true);

    const pill = hero.querySelector('.score-hero__pill');
    expect(pill.textContent).toContain('Crítica');
    expect(pill.querySelector('svg use').getAttribute('href')).toBe('#i-alert');
  });

  it('muestra el score dentro del anillo con la escala "de 100"', () => {
    renderAnalisis();
    const hero = document.querySelector('.score-hero');
    expect(hero.querySelector('.score-hero__num').textContent).toBe('20');
    expect(hero.querySelector('.score-hero__de').textContent).toBe('de 100');
    expect(hero.querySelector('.progress-ring')).not.toBeNull();
  });

  it('pinta los 4 factores en tiles con valor numérico junto a la barra (SC 1.4.11)', () => {
    renderAnalisis();
    const factores = [...document.querySelectorAll('.score-hero__factor')];
    expect(factores.length).toBe(4);
    const labels = factores.map(fct => fct.querySelector('.score-hero__factor-label').textContent);
    expect(labels).toEqual(['Deuda', 'Liquidez', 'Control', 'Ahorro']);
    for (const fct of factores) {
      const valor = fct.querySelector('.score-hero__factor-valor').textContent;
      expect(valor).toMatch(/^\d+$/);
      expect(fct.querySelector('.progress-bar').getAttribute('style')).toContain(`width:${valor}%`);
    }
  });

  it('la explicación nombra el factor más débil real, no una frase fija de banda', () => {
    // Sin deudas (deuda 100), saldo bajo frente al gasto (liquidez baja),
    // fondo activo (ahorro 50): el más débil es liquidez, banda ajustada.
    S.cuentas = [cuenta({ saldo: 500_000 })];
    S.gastos  = [gasto({ fecha: fechaMesActual(2), monto: 1_000_000 })];
    S.ahorro  = { fondoEmergencia: { activo: true, completado: false } };
    renderAnalisis();

    const frase = document.querySelector('.score-hero__explicacion').textContent;
    expect(frase).toContain('Atención a tu liquidez');
    // El desglose técnico "Deuda 80/100 • ..." ya no se imprime.
    expect(document.querySelector('.score-hero').textContent).not.toContain('•');
  });

  it('en banda excelente la frase es de refuerzo, sin señalar factor', () => {
    S.cuentas = [cuenta({ saldo: 6_000_000 })];
    S.gastos  = [gasto({ fecha: fechaMesActual(2), monto: 1_000_000 })];
    S.ahorro  = { fondoEmergencia: { activo: true, completado: true } };
    renderAnalisis();

    const hero = document.querySelector('.score-hero');
    expect(hero.classList.contains('score-hero--excelente')).toBe(true);
    expect(hero.querySelector('.score-hero__explicacion').textContent).toContain('Vas muy bien');
  });

  it('escribe el mes y el año actuales en el rótulo del grupo mensual (ANL.3)', () => {
    document.body.innerHTML = `<div id="panel-analisis"></div>`;
    renderAnalisis();

    const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    // El año importa porque el monitor de renta al final de la página habla de
    // un año completo. ANL.3: el chip del header se movió al rótulo del grupo
    // "A dónde va tu dinero" (el único bloque de la página que mide ese mes).
    const esperado = `${MESES[new Date().getMonth()]} ${new Date().getFullYear()}`;
    expect(document.querySelector('.analisis__group-label').textContent).toBe(`A dónde va tu dinero · ${esperado}`);
  });
});

// ── renderAnalisis() - ANL.2b: patrimonio card-héroe (ADR 038 D2) ──

describe('renderAnalisis() - ANL.2b patrimonio con composición y ojo', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-analisis"></div>';
    S.gastos = []; S.compromisos = []; S.cuentas = [];
    S.ingresos = []; S.ingresosPuntuales = [];
    S.metas = []; S.apartados = []; S.inversiones = []; S.personales = [];
    S.config.ocultarSaldo = false;
  });

  it('declara su propio alcance: "hoy" (ANL.3, Z1)', () => {
    S.cuentas = [cuenta({ saldo: 500_000 })];
    renderAnalisis();
    expect(document.querySelector('.patri-card__hint').textContent).toContain('hoy');
  });

  it('el link de deudas sin saldo dice "Deudas", no "Compromisos" (ANL.3, Z3)', () => {
    S.compromisos = [deuda({ saldoTotal: undefined })];
    renderAnalisis();

    const link = document.querySelector('.analisis__hint a[href="#compromisos"]');
    expect(link.textContent).toBe('Deudas');
  });

  it('avisa cuando hay préstamos sin cuenta vinculada: no suman al patrimonio (ANL.3, Z2)', () => {
    S.cuentas = [cuenta({ saldo: 500_000 })];
    S.personales = [{ id: 'p1', monto: 400_000, pagado: 0 }];
    renderAnalisis();

    const hints = [...document.querySelectorAll('.analisis__hint')].map(p => p.textContent);
    expect(hints.some(t => t.includes('1 préstamo') && t.includes('no suma a tu patrimonio'))).toBe(true);
    expect(document.querySelector('a[href="#personales"]')).not.toBeNull();
  });

  it('sin préstamos excluidos no muestra el aviso', () => {
    S.cuentas = [cuenta({ saldo: 500_000 })];
    renderAnalisis();
    const hints = [...document.querySelectorAll('.analisis__hint')].map(p => p.textContent);
    expect(hints.some(t => t.includes('no suma a tu patrimonio'))).toBe(false);
  });

  it('neto positivo: cifra grande en positivo + columnas Activos/Pasivos con sus montos', () => {
    S.cuentas = [cuenta({ saldo: 500_000 })];
    renderAnalisis();

    const card = document.querySelector('.patri-card');
    expect(card).not.toBeNull();
    const valor = card.querySelector('.patri-card__valor');
    expect(valor.classList.contains('patri-card__valor--positivo')).toBe(true);
    expect(valor.textContent.trim()).toBe('$500.000');

    const cols = [...card.querySelectorAll('.patri-card__col')];
    expect(cols.length).toBe(2);
    expect(cols[0].querySelector('.patri-card__col-valor').textContent).toBe('$500.000');
    expect(cols[1].querySelector('.patri-card__col-valor').textContent).toBe('$0');
    expect(cols[1].querySelector('.patri-card__col-desc').textContent).toContain('Sin deudas registradas');
  });

  it('neto negativo: signo − y clase negativa', () => {
    S.cuentas     = [cuenta({ saldo: 500_000 })];
    S.compromisos = [deuda({ saldoTotal: 12_000_000 })];
    renderAnalisis();

    const valor = document.querySelector('.patri-card__valor');
    expect(valor.classList.contains('patri-card__valor--negativo')).toBe(true);
    expect(valor.textContent.trim()).toBe('−$11.500.000');
  });

  it('barra de composición: un segmento por bucket > 0 y porcentajes en texto (SC 1.4.11)', () => {
    S.cuentas     = [cuenta({ saldo: 500_000 })];
    S.metas       = [meta({ montoActual: 1_000_000 })];
    S.inversiones = [inversion({ monto: 2_000_000 })];
    renderAnalisis();

    const segs = [...document.querySelectorAll('.patri-card__seg')];
    expect(segs.length).toBe(3);
    expect(segs[0].className).toContain('patri-card__seg--cuentas');
    expect(segs[0].getAttribute('style')).toContain('width:14%');
    expect(segs[1].className).toContain('patri-card__seg--metas');
    expect(segs[1].getAttribute('style')).toContain('width:29%');
    expect(segs[2].className).toContain('patri-card__seg--inversion');
    expect(segs[2].getAttribute('style')).toContain('width:57%');

    const desc = document.querySelector('.patri-card__col-desc').textContent;
    expect(desc).toContain('Cuentas 14%');
    expect(desc).toContain('Metas 29%');
    expect(desc).toContain('Inversión 57%');
  });

  it('sin activos no dibuja la barra y lo dice en texto', () => {
    S.compromisos = [deuda({ saldoTotal: 1_000_000 })];
    renderAnalisis();
    expect(document.querySelector('.patri-card__comp')).toBeNull();
    expect(document.querySelector('.patri-card__col-desc').textContent).toContain('Sin activos registrados');
  });

  it('el ojo enmascara neto, activos y pasivos; los porcentajes de composición siguen visibles', () => {
    S.cuentas     = [cuenta({ saldo: 500_000 })];
    S.compromisos = [deuda({ saldoTotal: 200_000 })];
    S.config.ocultarSaldo = true;
    renderAnalisis();

    const card = document.querySelector('.patri-card');
    expect(card.querySelector('.patri-card__valor').textContent.trim()).toBe('$••••••');
    const cols = [...card.querySelectorAll('.patri-card__col-valor')];
    expect(cols[0].textContent).toBe('••••');
    expect(cols[1].textContent).toBe('••••');

    const ojo = card.querySelector('.patri-card__ojo');
    expect(ojo.getAttribute('aria-pressed')).toBe('true');
    expect(ojo.querySelector('use').getAttribute('href')).toBe('#i-eye-off');
    // La proporción no revela montos: no se enmascara.
    expect(card.querySelector('.patri-card__col-desc').textContent).toContain('Cuentas 100%');

    S.config.ocultarSaldo = false;
  });
});

// ── renderAnalisis() - ANL.2c: "A dónde va tu dinero" (ADR 038 D3/D4) ──

describe('renderAnalisis() - ANL.2c tendencia con chip + categorías agrupadas', () => {
  /** Fecha YYYY-MM-DD del día `dia` del mes actual + offset de meses. */
  const fechaMes = (offset, dia) => {
    const ahora = new Date();
    const d = new Date(ahora.getFullYear(), ahora.getMonth() + offset, dia);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${String(d.getDate()).padStart(2, '0')}`;
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-analisis"></div>';
    S.gastos = []; S.compromisos = []; S.cuentas = [];
    S.ingresos = []; S.ingresosPuntuales = [];
    S.metas = []; S.apartados = []; S.inversiones = [];
  });

  it('tendencia y categorías viven bajo el rótulo "A dónde va tu dinero"', () => {
    S.gastos = [gasto({ fecha: fechaMes(0, 2), monto: 100_000 })];
    renderAnalisis();

    const grupo = document.querySelector('.analisis__group');
    expect(grupo).not.toBeNull();
    expect(grupo.querySelector('.analisis__group-label').textContent).toContain('A dónde va tu dinero');
    expect(grupo.querySelector('.tend-card')).not.toBeNull();
    expect(grupo.querySelector('.catg-card')).not.toBeNull();
  });

  it('el gasto que baja se celebra en verde con ícono de bajada (ADR 019)', () => {
    S.gastos = [
      gasto({ id: 'g1', fecha: fechaMes(-1, 2), monto: 400_000 }),
      gasto({ id: 'g2', fecha: fechaMes(0, 2),  monto: 300_000 }),
    ];
    renderAnalisis();

    const chip = document.querySelector('.tend-card__chip');
    expect(chip.classList.contains('tend-card__chip--baja')).toBe(true);
    expect(chip.textContent).toContain('↓ 25% vs mes anterior');
    expect(chip.querySelector('use').getAttribute('href')).toBe('#i-trending-down');
  });

  it('el gasto que sube queda neutro, nunca en rojo', () => {
    S.gastos = [
      gasto({ id: 'g1', fecha: fechaMes(-1, 2), monto: 200_000 }),
      gasto({ id: 'g2', fecha: fechaMes(0, 2),  monto: 300_000 }),
    ];
    renderAnalisis();

    const chip = document.querySelector('.tend-card__chip');
    expect(chip.classList.contains('tend-card__chip--baja')).toBe(false);
    expect(chip.textContent).toContain('↑ 50% vs mes anterior');
    expect(chip.querySelector('use').getAttribute('href')).toBe('#i-trending-up');
  });

  it('las 3 stats acompañan al sparkline: Este mes, Máximo y Mínimo', () => {
    S.gastos = [
      gasto({ id: 'g1', fecha: fechaMes(-1, 2), monto: 400_000 }),
      gasto({ id: 'g2', fecha: fechaMes(0, 2),  monto: 300_000 }),
    ];
    renderAnalisis();

    const stats = [...document.querySelectorAll('.tend-card__stat')];
    expect(stats.length).toBe(3);
    expect(stats.map(s => s.querySelector('.tend-card__stat-label').textContent))
      .toEqual(['Este mes', 'Máximo', 'Mínimo']);
    expect(stats[0].querySelector('.tend-card__stat-valor').textContent).toBe('$300.000');
    expect(stats[1].querySelector('.tend-card__stat-valor').textContent).toBe('$400.000');
    expect(stats[2].querySelector('.tend-card__stat-valor').textContent).toBe('$0');
  });

  it('la card de categorías ancla el total del mes y el top vive al centro de la dona', () => {
    S.gastos = [
      gasto({ id: 'g1', categoria: 'Mercado',    monto: 600_000, fecha: fechaMes(0, 2) }),
      gasto({ id: 'g2', categoria: 'Transporte', monto: 300_000, fecha: fechaMes(0, 3) }),
    ];
    renderAnalisis();

    const card = document.querySelector('.catg-card');
    expect(card.querySelector('.catg-card__total').textContent).toBe('$900.000');
    expect(card.querySelector('.catg-card__centro-label').textContent).toBe('Top');
    expect(card.querySelector('.catg-card__centro-cat').textContent).toBe('Mercado');
    expect(card.querySelector('.catg-card__centro-pct').textContent).toBe('67%');
  });
});

// ── renderAnalisis() - ANL.2d: filas colapsables + empty state (ADR 038 D5/D7) ──

describe('renderAnalisis() - ANL.2d filas colapsables limpias + empty state único', () => {
  const anioActual = new Date().getFullYear();
  const fechaMesActual = (dia) => {
    const ahora = new Date();
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    return `${ahora.getFullYear()}-${mm}-${String(dia).padStart(2, '0')}`;
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-analisis"></div>';
    S.gastos = []; S.compromisos = []; S.cuentas = [];
    S.ingresos = []; S.ingresosPuntuales = [];
    S.metas = []; S.apartados = []; S.inversiones = [];
    S.config = {};
  });

  it('sin gastos, activos ni deudas, el panel corto-circuita a un único empty state con CTA', () => {
    renderAnalisis();
    const panel = document.getElementById('panel-analisis');
    const empty = panel.querySelector('.analisis-empty');
    expect(empty).not.toBeNull();
    expect(empty.querySelector('.analisis-empty__title').textContent).toBe('Aún no hay suficientes datos');
    expect(empty.querySelector('[data-action="nuevo-gasto"]')).not.toBeNull();
    expect(empty.querySelector('use').getAttribute('href')).toBe('#i-analisis');
    // Nada más se dibuja: ni hero, ni patrimonio, ni colapsables.
    expect(panel.querySelector('.score-hero')).toBeNull();
    expect(panel.querySelector('.patri-card')).toBeNull();
    expect(panel.querySelector('.analisis-grupo')).toBeNull();
  });

  it('con datos parciales (una cuenta con saldo) el panel completo se muestra', () => {
    S.cuentas = [cuenta({ saldo: 500_000 })];
    renderAnalisis();
    expect(document.querySelector('.analisis-empty')).toBeNull();
    expect(document.querySelector('.score-hero')).not.toBeNull();
    expect(document.querySelector('.patri-card')).not.toBeNull();
  });

  it('los datos fiscales manuales también cuentan como datos: el monitor de renta no se esconde', () => {
    S.config = { datosFiscales: { [anioActual]: { ingresosBrutos: 10_000_000 } } };
    renderAnalisis();
    expect(document.querySelector('.analisis-empty')).toBeNull();
    expect(document.querySelector('.renta-criterios')).not.toBeNull();
  });

  it('el summary del detalle de gastos es una fila con teja, título y subtítulo (D5)', () => {
    S.gastos = [gasto({ fecha: fechaMesActual(2) })];
    renderAnalisis();
    const summary = document.querySelector('.analisis-grupo--detalle .analisis-grupo__summary');
    expect(summary.querySelector('.analisis-grupo__teja use').getAttribute('href')).toBe('#i-bar-chart');
    expect(summary.querySelector('.analisis-grupo__title').textContent).toBe('Más detalle de tus gastos');
    expect(summary.querySelector('.analisis-grupo__sub').textContent).toBe('Vs mes anterior · patrón semanal · hormigas');
  });

  it('el summary de renta lleva teja y conteo de criterios, sin badge cuando no hay alertas', () => {
    S.cuentas = [cuenta({ saldo: 500_000 })];
    renderAnalisis();
    const grupos = [...document.querySelectorAll('.analisis-grupo--fila')];
    const renta = grupos.find(g => g.querySelector('.analisis-grupo__title')?.textContent.startsWith('Estado de tu renta'));
    expect(renta).not.toBeUndefined();
    expect(renta.querySelector('.analisis-grupo__teja use').getAttribute('href')).toBe('#i-percent');
    expect(renta.querySelector('.analisis-grupo__sub').textContent).toBe('5 criterios DIAN · topes por UVT');
    expect(renta.querySelector('.analisis-grupo__badge')).toBeNull();
  });

  it('con un criterio cerca del tope, el badge ámbar cuenta las alertas', () => {
    // Patrimonio bruto al 85% del tope (4500 UVT) → estado "cerca" → badge 1.
    const tope = TOPES_RENTA_UVT.patrimonioBruto * UVT;
    S.cuentas = [cuenta({ saldo: Math.round(tope * 0.85) })];
    renderAnalisis();
    const badge = document.querySelector('.analisis-grupo__badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent.trim()).toMatch(/^1/);
  });
});

// ── renderAnalisis() - DIS.10: auditoría de diseño de Análisis ─────
// Cubre lo que cada corrección cambió en el marcado. C1 (el filete ámbar del
// aviso) y C3 (la frase a ancho completo) son CSS puro y no tienen test aquí.

describe('renderAnalisis() - DIS.10 auditoría de diseño', () => {
  const anioActual = new Date().getFullYear();
  const fechaMesActual = (dia) => {
    const ahora = new Date();
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    return `${ahora.getFullYear()}-${mm}-${String(dia).padStart(2, '0')}`;
  };
  const fechaMesAnterior = (dia) => {
    const ahora = new Date();
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${String(dia).padStart(2, '0')}`;
  };
  const abrirDetalle = () => {
    const g = document.querySelector('.analisis-grupo--detalle');
    g.open = true;
    g.dispatchEvent(new Event('toggle'));
    return g;
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-analisis"></div>';
    S.gastos = []; S.compromisos = []; S.cuentas = [];
    S.ingresos = []; S.ingresosPuntuales = [];
    S.metas = []; S.apartados = []; S.inversiones = []; S.personales = [];
    S.config = {};
  });

  // ── C2b + C8: el cuerpo del colapsable en lenguaje v2 ───────────

  it('C2b: la comparación es una lista rankeada, no una tabla', () => {
    S.gastos = [
      gasto({ id: 'g1', categoria: 'Mercado',    monto: 300_000, fecha: fechaMesActual(2) }),
      gasto({ id: 'g2', categoria: 'Mercado',    monto: 500_000, fecha: fechaMesAnterior(2) }),
      gasto({ id: 'g3', categoria: 'Transporte', monto: 200_000, fecha: fechaMesActual(3) }),
    ];
    renderAnalisis();
    const cuerpo = abrirDetalle().querySelector('.analisis-grupo__body');

    expect(cuerpo.querySelector('table')).toBeNull();
    const filas = [...cuerpo.querySelectorAll('.comparacion__fila')];
    expect(filas.length).toBeGreaterThan(0);
    const mercado = filas.find(fl => fl.querySelector('.comparacion__fila-cat').textContent === 'Mercado');
    expect(mercado.querySelector('.comparacion__fila-monto').textContent).toBe('$300.000');
    // Bajó el gasto: verde, con el ícono de tendencia a la baja (ADR 019).
    const delta = mercado.querySelector('.comparacion__fila-delta');
    expect(delta.classList.contains('comparacion__fila-delta--baja')).toBe(true);
    expect(delta.querySelector('use').getAttribute('href')).toBe('#i-trending-down');
    expect(delta.textContent).toContain('bajó');
  });

  it('C8: el cuerpo del colapsable no deja un solo emoji y su título trae el ícono del sprite', () => {
    S.gastos = [
      gasto({ id: 'g1', categoria: 'Mercado', monto: 300_000, fecha: fechaMesActual(2) }),
      gasto({ id: 'g2', categoria: 'Mercado', monto: 500_000, fecha: fechaMesAnterior(2) }),
    ];
    renderAnalisis();
    const cuerpo = abrirDetalle().querySelector('.analisis-grupo__body');

    expect(cuerpo.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    const titulo = cuerpo.querySelector('#analisis-comparacion-title');
    expect(titulo.tagName).toBe('H3');
    expect(titulo.querySelector('use').getAttribute('href')).toBe('#i-bar-chart');
  });

  it('C8: los dos colapsables llevan el chevron del sprite, no el carácter de texto', () => {
    S.gastos = [gasto({ fecha: fechaMesActual(2) })];
    renderAnalisis();
    const grupos = [...document.querySelectorAll('.analisis-grupo--fila')];
    expect(grupos.length).toBe(2);
    for (const g of grupos) {
      const chevron = g.querySelector('.analisis-grupo__summary .analisis-grupo__chevron');
      expect(chevron).not.toBeNull();
      expect(chevron.querySelector('use').getAttribute('href')).toBe('#i-chevron-right');
    }
  });

  // ── C6: un rótulo, un mensaje ───────────────────────────────────

  it('C6: con activos pero sin gastos, el grupo pone un solo vacío', () => {
    S.cuentas = [cuenta({ saldo: 500_000 })];
    renderAnalisis();
    const grupo = document.querySelector('.analisis__group');

    const vacios = grupo.querySelectorAll('.analisis__empty');
    expect(vacios.length).toBe(1);
    expect(vacios[0].textContent).toContain('Aún no registras gastos este mes');
    expect(grupo.querySelector('.tend-card')).toBeNull();
    expect(grupo.querySelector('.catg-card')).toBeNull();
  });

  // ── C7: lo que Finko no puede medir ─────────────────────────────

  it('C7: los criterios sin dato salen de la grilla y van a la lista compacta con su tope', () => {
    S.cuentas = [cuenta({ saldo: 500_000 })];
    renderAnalisis();

    const fichas = [...document.querySelectorAll('.renta-criterio')];
    expect(fichas.length).toBeGreaterThan(0);
    expect(fichas.every(a => !a.classList.contains('renta-criterio--sin-datos'))).toBe(true);

    const lista = document.querySelector('.renta-sindatos');
    expect(lista).not.toBeNull();
    const filas = [...lista.querySelectorAll('.renta-sindatos__row')];
    expect(filas.length).toBe(3);
    for (const fila of filas) {
      expect(fila.querySelector('.renta-sindatos__tope').textContent).toMatch(/^tope \$/);
    }
    // El enlace a Ajustes es uno solo, no uno por criterio.
    expect(lista.querySelectorAll('a[href="#config"]').length).toBe(1);
  });

  // ── C9: la estructura de encabezados ────────────────────────────

  it('C9: el rótulo del grupo es un encabezado y sus cards cuelgan de él', () => {
    S.gastos = [gasto({ fecha: fechaMesActual(2) })];
    renderAnalisis();

    expect(document.querySelector('.analisis__group-label').tagName).toBe('H2');
    expect(document.querySelector('#analisis-tendencia-title').tagName).toBe('H3');
    expect(document.querySelector('#analisis-cat-title').tagName).toBe('H3');
  });

  it('C9: el título de cada colapsable es un encabezado, no un span', () => {
    S.gastos = [gasto({ fecha: fechaMesActual(2) })];
    renderAnalisis();
    const titulos = [...document.querySelectorAll('.analisis-grupo--fila .analisis-grupo__title')];
    expect(titulos.length).toBe(2);
    for (const t of titulos) expect(t.tagName).toBe('H2');
  });

  // ── C10: región viva solo para lo que responde a una acción ─────

  // CFG.2b: el flag de la sonda pasó de `declaranteObligado` a
  // `ivaResponsable`. El primero ya no alimenta la recomendación de perfil
  // fiscal (ahora decide el veredicto de renta); el segundo sigue siendo el
  // caso que estas dos regresiones querían cubrir.
  it('C10: el panel no deja ningún role="status"', () => {
    S.config  = { perfilFiscal: { ivaResponsable: true } };
    S.cuentas = [cuenta({ saldo: 500_000 })];
    renderAnalisis();

    expect(document.querySelectorAll('#panel-analisis [role="status"]').length).toBe(0);
    // El contenido sigue ahí: solo se retiró el rol.
    expect(document.querySelector('.nudge-info')).not.toBeNull();
  });

  it('C8: el nudge de perfil fiscal usa el sprite, no un emoji', () => {
    S.config  = { perfilFiscal: { ivaResponsable: true } };
    S.cuentas = [cuenta({ saldo: 500_000 })];
    renderAnalisis();
    const nudge = document.querySelector('.nudge-info:not(.nudge--veredicto)');
    expect(nudge.querySelector('.nudge__icon use').getAttribute('href')).toBe('#i-info');
  });

  // ── C12: cada card declara su ventana de tiempo ─────────────────

  it('C12: la card de categorías declara que es de este mes', () => {
    S.gastos = [gasto({ fecha: fechaMesActual(2) })];
    renderAnalisis();
    expect(document.querySelector('.catg-card__sub').textContent).toBe('Por categoría, este mes');
  });

  it('C12: el monitor de renta nombra el año corriente', () => {
    S.cuentas = [cuenta({ saldo: 500_000 })];
    renderAnalisis();
    const renta = document.querySelector('.analisis-grupo--renta .analisis-grupo__title');
    expect(renta.textContent).toBe(`Estado de tu renta (${anioActual})`);
  });

  // ── C4 y C5: el gráfico y el reparto de porcentajes ─────────────

  it('C4: la sparkline se genera a 360 de ancho, no a 600', () => {
    S.gastos = [
      gasto({ id: 'g1', monto: 100_000, fecha: fechaMesActual(2) }),
      gasto({ id: 'g2', monto: 200_000, fecha: fechaMesAnterior(2) }),
    ];
    renderAnalisis();
    expect(document.querySelector('.sparkline').getAttribute('viewBox')).toBe('0 0 360 80');
  });

  it('C5: la composición de activos reparte 100% exactos', () => {
    S.cuentas     = [cuenta({ saldo: 1_000_000 })];
    S.metas       = [meta({ montoActual: 1_000_000 })];
    S.inversiones = [inversion({ montoInvertido: 1_000_000 })];
    renderAnalisis();

    const segs = [...document.querySelectorAll('.patri-card__seg')];
    expect(segs.length).toBe(3);
    const suma = segs.reduce((acc, s) => acc + Number(s.getAttribute('style').match(/(\d+)%/)[1]), 0);
    expect(suma).toBe(100);
  });
});

// ── repartirPorcentajes() - DIS.10 (C5, regla R28) ─────────────────

describe('repartirPorcentajes()', () => {
  it('reparte 100 exactos donde el redondeo por separado daba 99', () => {
    // Los datos de la auditoría: 31+18+16+13+8+7+6 = 99 con Math.round suelto.
    const valores = [720_000, 430_000, 385_000, 310_000, 195_000, 160_000, 150_000];
    const pcts = repartirPorcentajes(valores);
    expect(pcts.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('conserva el orden por tamaño: el mayor nunca queda por debajo del menor', () => {
    const pcts = repartirPorcentajes([720_000, 430_000, 150_000]);
    expect(pcts[0]).toBeGreaterThanOrEqual(pcts[1]);
    expect(pcts[1]).toBeGreaterThanOrEqual(pcts[2]);
  });

  it('reparte tercios como 34/33/33', () => {
    expect(repartirPorcentajes([1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(100);
    expect(repartirPorcentajes([1, 1, 1]).sort((a, b) => b - a)).toEqual([34, 33, 33]);
  });

  it('un solo valor se lleva el 100', () => {
    expect(repartirPorcentajes([500])).toEqual([100]);
  });

  it('sin valores, o con total cero, no inventa porcentajes', () => {
    expect(repartirPorcentajes([])).toEqual([]);
    expect(repartirPorcentajes([0, 0])).toEqual([0, 0]);
    expect(repartirPorcentajes(null)).toEqual([]);
  });
});

// ── LECTURA INTERPRETATIVA - ANL.1a (ADR 046 D3) ──────────────────

describe('lecturaPatrimonio()', () => {
  it('calla cuando no hay ni activos ni pasivos', () => {
    expect(lecturaPatrimonio({ total: 0 }, { total: 0 }, 0)).toBe('');
  });

  it('nombra el caso negativo sin culpar al usuario', () => {
    const txt = lecturaPatrimonio({ total: 1_000_000 }, { total: 3_000_000 }, -2_000_000);
    expect(txt).toBe('Hoy debes más de lo que tienes: por eso tu patrimonio es negativo.');
  });

  it('sin deudas dice que nada esta comprometido', () => {
    const txt = lecturaPatrimonio({ total: 5_000_000 }, { total: 0 }, 5_000_000);
    expect(txt).toContain('no registras deudas');
  });

  it('con deudas por encima de la mitad usa la fraccion, no el porcentaje', () => {
    const txt = lecturaPatrimonio({ total: 10_000_000 }, { total: 6_000_000 }, 4_000_000);
    expect(txt).toBe('Tus deudas pesan más de la mitad de lo que tienes.');
  });

  it('con deudas por debajo de la mitad da el porcentaje exacto', () => {
    const txt = lecturaPatrimonio({ total: 10_000_000 }, { total: 2_500_000 }, 7_500_000);
    expect(txt).toBe('Tus deudas equivalen al 25% de lo que tienes.');
  });

  it('tolera entradas incompletas sin romper', () => {
    expect(lecturaPatrimonio(null, null, 0)).toBe('');
    expect(lecturaPatrimonio(undefined, { total: 500 }, -500)).toContain('negativo');
  });
});

describe('lecturaTendencia()', () => {
  const serie = totales => totales.map((total, i) => ({ anio: 2026, mes: i + 1, total, label: 'x' }));

  it('calla sin base de comparacion', () => {
    expect(lecturaTendencia([])).toBe('');
    expect(lecturaTendencia(serie([500_000]))).toBe('');
    // Todos los meses previos en cero: no hay promedio real contra el cual leer.
    expect(lecturaTendencia(serie([0, 0, 500_000]))).toBe('');
  });

  it('avisa cuando el mes en curso aun no tiene gasto', () => {
    expect(lecturaTendencia(serie([500_000, 0]))).toBe('Este mes todavía no registras gastos.');
  });

  it('trata un desvio de hasta 10 % como estar en linea', () => {
    // Promedio de los previos = 1.000.000; el mes en curso queda 5 % arriba.
    const txt = lecturaTendencia(serie([1_000_000, 1_000_000, 1_050_000]));
    expect(txt).toBe('Este mes vas en línea con tu promedio de los últimos meses.');
  });

  it('cuantifica el exceso sobre el promedio', () => {
    const txt = lecturaTendencia(serie([1_000_000, 1_000_000, 1_500_000]));
    expect(txt).toBe('Este mes vas 50% por encima de tu promedio de los últimos meses.');
  });

  it('cuantifica la baja en positivo, sin signo negativo', () => {
    const txt = lecturaTendencia(serie([1_000_000, 1_000_000, 600_000]));
    expect(txt).toBe('Este mes vas 40% por debajo de tu promedio de los últimos meses.');
  });

  it('los meses sin registro no hunden el promedio', () => {
    // Con los ceros dentro, el promedio caeria a 400.000 y un mes normal
    // aparentaria un desborde del 150 %.
    const txt = lecturaTendencia(serie([1_000_000, 0, 0, 0, 1_000_000]));
    expect(txt).toBe('Este mes vas en línea con tu promedio de los últimos meses.');
  });
});

describe('lecturaCategorias()', () => {
  const seg = (categoria, pct) => ({ categoria, total: pct * 1000, pct });

  it('calla sin gasto este mes', () => {
    expect(lecturaCategorias([])).toBe('');
    expect(lecturaCategorias(null)).toBe('');
  });

  it('con una sola categoria lo dice sin porcentaje', () => {
    expect(lecturaCategorias([seg('Mercado', 100)])).toBe('Todo tu gasto de este mes está en Mercado.');
  });

  it('con la categoria top por encima de la mitad usa la fraccion', () => {
    const txt = lecturaCategorias([seg('Mercado', 62), seg('Transporte', 38)]);
    expect(txt).toBe('Más de la mitad de tu gasto de este mes se va en Mercado.');
  });

  it('con gasto repartido nombra la categoria y su porcentaje', () => {
    const txt = lecturaCategorias([seg('Mercado', 40), seg('Transporte', 35), seg('Ocio', 25)]);
    expect(txt).toBe('Mercado concentra el 40% de tu gasto de este mes.');
  });

  it('si "Otros" encabeza, la lectura es lo contrario a una categoria dominante', () => {
    const txt = lecturaCategorias([seg('Otros', 45), seg('Mercado', 30), seg('Ocio', 25)]);
    expect(txt).toBe('Tu gasto de este mes está repartido en muchas categorías pequeñas.');
  });

  it('calla si el segmento top no tiene nombre', () => {
    expect(lecturaCategorias([{ categoria: '', total: 100, pct: 100 }])).toBe('');
  });
});

describe('lecturaComparacion()', () => {
  const comp = (totalActual, totalAnterior) => ({
    categorias: [{ cat: 'Mercado', actual: totalActual, anterior: totalAnterior, delta: totalActual - totalAnterior, deltaPct: 0, direccion: 'igual' }],
    highlights: [],
    totalActual,
    totalAnterior,
  });

  it('calla sin categorias que comparar', () => {
    expect(lecturaComparacion(null)).toBe('');
    expect(lecturaComparacion({ categorias: [], totalActual: 0, totalAnterior: 0 })).toBe('');
  });

  it('calla si no hay mes anterior con qué comparar', () => {
    expect(lecturaComparacion(comp(500_000, 0))).toBe('Todavía no tienes un mes anterior con qué comparar.');
  });

  it('dentro del margen de ruido del 10% dice que se mantuvo estable', () => {
    expect(lecturaComparacion(comp(1_050_000, 1_000_000))).toBe('Tu gasto total se mantuvo estable frente al mes anterior.');
  });

  it('por encima del margen dice cuánto más gastó', () => {
    expect(lecturaComparacion(comp(1_500_000, 1_000_000))).toBe('Gastaste 50% más que el mes anterior.');
  });

  it('por debajo del margen dice cuánto menos gastó', () => {
    expect(lecturaComparacion(comp(600_000, 1_000_000))).toBe('Gastaste 40% menos que el mes anterior.');
  });
});
