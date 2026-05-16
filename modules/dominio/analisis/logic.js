/**
 * analisis/logic.js — funciones puras de agregación financiera.
 *
 * Decisión arquitectónica:
 *   Este módulo es la ÚNICA capa que importa de múltiples dominios.
 *   Es de sólo lectura: no muta S, no usa EventBus, no toca el DOM.
 *   Razón: el análisis es inherentemente cross-domain; centralizar aquí
 *   evita que los dominios se importen entre sí.
 */

import { calcularTotalMensual }    from '../ingresos/logic.js';
import { totalGastosMes, gastosMes, gastosPorCategoria, detectarHormigas }
  from '../gastos/logic.js';
import { calcularTotalCompromisos } from '../compromisos/logic.js';
import { calcularTotalCuentas }     from '../tesoreria/logic.js';

// ── MÉTRICAS DERIVADAS ───────────────────────────────────────────

/**
 * Balance neto del mes: ingresos − gastos del mes − compromisos mensuales.
 * Positivo = superávit. Negativo = déficit.
 *
 * @param {number} ingresoMensual
 * @param {number} gastoMes
 * @param {number} compromisoMensual
 * @returns {number}
 */
export function calcularBalance(ingresoMensual, gastoMes, compromisoMensual) {
  return ingresoMensual - gastoMes - compromisoMensual;
}

/**
 * Tasa de ahorro como porcentaje del ingreso mensual.
 * Devuelve 0 si no hay ingreso. Puede ser negativa (déficit).
 *
 * @param {number} ingresoMensual
 * @param {number} egresos — gastos + compromisos del mes.
 * @returns {number} Porcentaje (puede ser negativo).
 */
export function calcularTasaAhorro(ingresoMensual, egresos) {
  if (ingresoMensual <= 0) return 0;
  return Math.round(((ingresoMensual - egresos) / ingresoMensual) * 100);
}

/**
 * Nivel de salud financiera basado en la tasa de ahorro.
 *
 * | Nivel      | Tasa de ahorro | Regla de referencia     |
 * |------------|----------------|-------------------------|
 * | excelente  | ≥ 20 %         | Regla 50/30/20          |
 * | buena      | 10–19 %        | Ahorro moderado         |
 * | ajustada   | 0–9 %          | Margen mínimo           |
 * | critica    | < 0 %          | Gasta más de lo que gana|
 *
 * @param {number} tasaAhorro
 * @returns {'excelente' | 'buena' | 'ajustada' | 'critica'}
 */
export function nivelSalud(tasaAhorro) {
  if (tasaAhorro >= 20) return 'excelente';
  if (tasaAhorro >= 10) return 'buena';
  if (tasaAhorro >= 0)  return 'ajustada';
  return 'critica';
}

// ── RESUMEN CONSOLIDADO ──────────────────────────────────────────

/**
 * Genera el resumen financiero completo del mes/año indicados.
 * Agrega datos de todos los dominios.
 *
 * @param {import('../../core/state.js').Ingreso[]}     ingresos
 * @param {import('../../core/state.js').Gasto[]}       gastos
 * @param {import('../../core/state.js').Compromiso[]}  compromisos
 * @param {import('../../core/state.js').Cuenta[]}      cuentas
 * @param {number} anio
 * @param {number} mes  1–12
 * @returns {{
 *   ingresoMensual: number,
 *   gastoMes: number,
 *   compromisoMensual: number,
 *   saldoCuentas: number,
 *   balance: number,
 *   egresos: number,
 *   tasaAhorro: number,
 *   salud: string,
 *   porCategoria: Record<string, number>,
 *   hormigas: Array<{categoria:string, total:number, cantidad:number, promedio:number}>,
 * }}
 */
export function generarResumen(ingresos, gastos, compromisos, cuentas, anio, mes) {
  const ingresoMensual    = calcularTotalMensual(ingresos);
  const gastoMes          = totalGastosMes(gastos, anio, mes);
  const compromisoMensual = calcularTotalCompromisos(compromisos);
  const saldoCuentas      = calcularTotalCuentas(cuentas);
  const egresos           = gastoMes + compromisoMensual;
  const balance           = calcularBalance(ingresoMensual, gastoMes, compromisoMensual);
  const tasaAhorro        = calcularTasaAhorro(ingresoMensual, egresos);
  const salud             = nivelSalud(tasaAhorro);
  const gastosMesActual   = gastosMes(gastos, anio, mes);
  const porCategoria      = gastosPorCategoria(gastosMesActual);
  const hormigas          = detectarHormigas(gastosMesActual);

  return {
    ingresoMensual,
    gastoMes,
    compromisoMensual,
    saldoCuentas,
    egresos,
    balance,
    tasaAhorro,
    salud,
    porCategoria,
    hormigas,
  };
}
