/**
 * naturaleza.test.js - HF.1b, ADR 139: nada se cuenta dos veces.
 *
 * Dos partes. La tabla: una prueba por naturaleza de gasto y por lente. La
 * invariante: comprar 100 con la tarjeta y pagar la tarjeta 100 da 100 en las
 * cuatro vistas que antes daban 200 (Análisis, renta, Límites por grupo y la
 * tasa de ahorro), cada una por su lente. Es la prueba que iba a dar el banco
 * de perfiles de HF.0f (ADR 138 D2).
 */

import { describe, it, expect } from 'vitest';

import {
  NATURALEZA_GASTO, naturalezaDeGasto, esConsumo, saleDelIngreso,
  gastosDeConsumo, gastosQueSalenDelIngreso,
} from '../../modules/infra/naturaleza.js';
import {
  generarResumen, serieGastosMensual, totalGastosAnio, calcularEstadoRenta,
  calcularComparacionCategorias,
} from '../../modules/dominio/analisis/logic.js';
import { ejecutadoPorGrupoDelMes, desgloseNecesidadesDelMes } from '../../modules/dominio/presupuesto/logic.js';
import { gastoDelMesQueSaleDelIngreso, calcularTasaAhorro } from '../../modules/dominio/ahorro/logic.js';
import { movimientosDesdeAportes, sumaDeMovimientos } from '../../modules/dominio/movimientos/logic.js';

// ── Datos inventados ─────────────────────────────────────────────

const TARJETA = {
  id: 'tc-1', descripcion: 'Visa', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito',
  frecuencia: 'Mensual', diaPago: 20, activo: true, fechaCreacion: '2026-01-01',
  saldoTotal: 0, cuotaMensual: 100, cupoTotal: 1_000_000,
};
const PRESTAMO = {
  id: 'pr-1', descripcion: 'Libre inversión', tipo: 'deuda-entidad', categoria: 'Crédito de libre inversión',
  frecuencia: 'Mensual', diaPago: 10, activo: true, fechaCreacion: '2026-01-01',
  saldoTotal: 4_500, cuotaMensual: 500,
};
const ARRIENDO = {
  id: 'fx-1', descripcion: 'Arriendo', tipo: 'fijo', categoria: 'Vivienda',
  frecuencia: 'Mensual', diaPago: 1, activo: true, fechaCreacion: '2026-01-01', monto: 800,
};

const compra       = { id: 'g-compra', monto: 100, categoria: 'Restaurantes', fecha: '2026-11-05', compromisoId: 'tc-1', consumoTC: true };
const pagoTarjeta  = { id: 'g-pago-tc', monto: 100, categoria: 'Deudas', fecha: '2026-11-20', compromisoId: 'tc-1', cuentaId: 'c-1', descripcion: 'Abono: Visa' };
const cuotaPrestamo = { id: 'g-cuota', monto: 500, categoria: 'Deudas', fecha: '2026-11-10', compromisoId: 'pr-1', cuentaId: 'c-1', descripcion: 'Abono: Libre inversión' };
const pagoArriendo = { id: 'g-arriendo', monto: 800, categoria: 'Gastos fijos', fecha: '2026-11-01', compromisoId: 'fx-1', cuentaId: 'c-1', descripcion: 'Pago: Arriendo' };
const mercado      = { id: 'g-mercado', monto: 300, categoria: 'Mercado', fecha: '2026-11-08', cuentaId: 'c-1' };

const CUENTAS = [{ id: 'c-1', nombre: 'Nequi', tipo: 'ahorros', saldo: 1_000, activa: true }];

// ── La tabla ─────────────────────────────────────────────────────

describe('naturalezaDeGasto (ADR 139 D1)', () => {
  it('una compra con la tarjeta es consumo con tarjeta, aunque lleve el compromisoId', () => {
    expect(naturalezaDeGasto(compra)).toBe(NATURALEZA_GASTO.CONSUMO_TARJETA);
  });

  it('el pago de la tarjeta y la cuota de un préstamo son pagos de deuda', () => {
    expect(naturalezaDeGasto(pagoTarjeta)).toBe(NATURALEZA_GASTO.PAGO_DE_DEUDA);
    expect(naturalezaDeGasto(cuotaPrestamo)).toBe(NATURALEZA_GASTO.PAGO_DE_DEUDA);
  });

  it('un abono viejo, sin compromisoId, se reconoce por su categoría', () => {
    expect(naturalezaDeGasto({ monto: 50, categoria: 'Deudas', fecha: '2025-03-01' })).toBe(NATURALEZA_GASTO.PAGO_DE_DEUDA);
  });

  it('el pago de un fijo es pago de fijo', () => {
    expect(naturalezaDeGasto(pagoArriendo)).toBe(NATURALEZA_GASTO.PAGO_DE_FIJO);
  });

  it('lo demás es consumo, también sin datos', () => {
    expect(naturalezaDeGasto(mercado)).toBe(NATURALEZA_GASTO.CONSUMO);
    expect(naturalezaDeGasto(undefined)).toBe(NATURALEZA_GASTO.CONSUMO);
  });
});

describe('las dos lentes (ADR 139 D2)', () => {
  it('consumo: todo menos el pago de una deuda', () => {
    expect([compra, pagoTarjeta, cuotaPrestamo, pagoArriendo, mercado].map(esConsumo))
      .toEqual([true, false, false, true, true]);
  });

  it('lo que sale del ingreso: todo menos la compra con tarjeta', () => {
    expect([compra, pagoTarjeta, cuotaPrestamo, pagoArriendo, mercado].map(saleDelIngreso))
      .toEqual([false, true, true, true, true]);
  });

  it('los filtros toleran algo que no es una lista', () => {
    expect(gastosDeConsumo(undefined)).toEqual([]);
    expect(gastosQueSalenDelIngreso(null)).toEqual([]);
  });
});

// ── La invariante ────────────────────────────────────────────────

describe('comprar 100 con la tarjeta y pagarla 100 da 100 (HF.1b)', () => {
  const gastos = [compra, pagoTarjeta];

  it('Análisis: el gasto del mes, la serie y las categorías', () => {
    const r = generarResumen(gastos, [TARJETA], CUENTAS, 2026, 11);
    expect(r.gastoMes).toBe(100);
    expect(r.porCategoria).toEqual({ Restaurantes: 100 });
    expect(serieGastosMensual(gastos, 2026, 11, 1)[0].total).toBe(100);
  });

  it('Análisis: la comparación con el mes anterior no trae la categoría Deudas', () => {
    const c = calcularComparacionCategorias(gastos, 2026, 11);
    expect(c.categorias.map(x => x.cat)).not.toContain('Deudas');
  });

  it('la renta: compras y consumos del año', () => {
    expect(totalGastosAnio(gastos, 2026)).toBe(100);
    const renta = calcularEstadoRenta({ gastos, ingresos: [], ingresosPuntuales: [], cuentas: CUENTAS, inversiones: [] }, 2026);
    expect(renta.criterios.find(x => x.id === 'consumosTotales').valor).toBe(100);
  });

  it('Límites por grupo: el pago de la tarjeta es la cuota de Necesidades y la compra no suma aparte', () => {
    const e = ejecutadoPorGrupoDelMes(gastos, [], 2026, 11, [TARJETA]);
    expect(e.necesidades).toBe(100);
    expect(e['estilo-de-vida']).toBe(0);
  });

  it('la tasa de ahorro: lo que salió del ingreso', () => {
    expect(gastoDelMesQueSaleDelIngreso(gastos, '2026-11')).toBe(100);
    expect(calcularTasaAhorro(1_000, gastoDelMesQueSaleDelIngreso(gastos, '2026-11'))).toBe(90);
  });
});

describe('cada lente con lo que no es tarjeta', () => {
  const gastos = [cuotaPrestamo, pagoArriendo, mercado];

  it('la cuota del préstamo no es consumo: Análisis y la renta la dejan fuera', () => {
    expect(generarResumen(gastos, [PRESTAMO, ARRIENDO], CUENTAS, 2026, 11).gastoMes).toBe(1_100);
    expect(totalGastosAnio(gastos, 2026)).toBe(1_100);
  });

  it('pero sí sale del ingreso: Necesidades y la tasa de ahorro la cuentan', () => {
    const e = ejecutadoPorGrupoDelMes(gastos, [], 2026, 11, [PRESTAMO, ARRIENDO]);
    expect(e.necesidades).toBe(1_300);
    expect(e['estilo-de-vida']).toBe(300);
    expect(gastoDelMesQueSaleDelIngreso(gastos, '2026-11')).toBe(1_600);
  });
});

describe('lo que la compra con tarjeta ya no hace', () => {
  it('no marca como pagada la cuota de la tarjeta en Límites', () => {
    const [item] = desgloseNecesidadesDelMes([TARJETA], [compra], 2026, 11);
    expect(item.ejecutado).toBe(0);
    expect(item.estadoPago).toBe('ninguno');
  });
});

describe('Movimientos: el aporte al Fondo no sale de ninguna cuenta (ADR 139 D3)', () => {
  it('es neutro y no resta del neto', () => {
    const movs = movimientosDesdeAportes([{ id: 'a-1', monto: 200, fecha: '2026-11-03' }]);
    expect(movs[0].direccion).toBe('neutro');
    expect(sumaDeMovimientos(movs)).toEqual({ sale: 0, entra: 0, neto: 0 });
  });
});
