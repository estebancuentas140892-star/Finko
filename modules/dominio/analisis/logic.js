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
import { calcularTotalCompromisos, compromisosActivos } from '../compromisos/logic.js';
import { calcularTotalCuentas }                         from '../tesoreria/logic.js';
import { metasActivas }                                 from '../metas/logic.js';

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

// ── PATRIMONIO NETO Y PROYECCIÓN ─────────────────────────────────

/**
 * Suma los activos del usuario: saldo de cuentas activas + monto acumulado
 * en metas no completadas.
 *
 * Las metas se cuentan como activo porque, contablemente, ese dinero pertenece
 * al usuario aunque esté "comprometido" para un objetivo específico.
 *
 * @param {import('../../core/state.js').Cuenta[]} cuentas
 * @param {import('../../core/state.js').Meta[]}   metas
 * @returns {{ totalCuentas: number, totalMetas: number, total: number }}
 */
export function calcularActivos(cuentas, metas) {
  const totalCuentas = calcularTotalCuentas(cuentas);
  const totalMetas   = metasActivas(metas)
    .reduce((acc, m) => acc + (m.montoActual ?? 0), 0);
  return {
    totalCuentas,
    totalMetas,
    total: totalCuentas + totalMetas,
  };
}

/**
 * Suma los pasivos del usuario: saldoPendiente de compromisos tipo 'deuda'
 * que estén activos.
 *
 * El campo `saldoPendiente` es OPCIONAL en el shape de Compromiso. Si un
 * compromiso 'deuda' no lo tiene, su pasivo se considera 0 (desconocido).
 * En la UI se mostrará un CTA para que el usuario complete sus deudas y
 * obtenga una foto real de su patrimonio.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @returns {{
 *   total: number,
 *   cantidadDeudas: number,
 *   deudasSinSaldo: number,
 * }}
 */
export function calcularPasivos(compromisos) {
  const deudasActivas = compromisosActivos(compromisos).filter(c => c.tipo === 'deuda');
  let total = 0;
  let deudasSinSaldo = 0;
  for (const d of deudasActivas) {
    const saldo = Number(d.saldoPendiente);
    if (Number.isFinite(saldo) && saldo > 0) {
      total += saldo;
    } else {
      deudasSinSaldo += 1;
    }
  }
  return {
    total,
    cantidadDeudas: deudasActivas.length,
    deudasSinSaldo,
  };
}

/**
 * Patrimonio neto = activos − pasivos. Puede ser negativo si el usuario
 * debe más de lo que tiene.
 *
 * @param {number} activos
 * @param {number} pasivos
 * @returns {number} Patrimonio neto en COP.
 */
export function calcularPatrimonioNeto(activos, pasivos) {
  return activos - pasivos;
}

/**
 * Proyección lineal del patrimonio neto a N meses.
 *
 * Asume que cada mes el ahorro disponible se suma al patrimonio. No incluye
 * rendimientos de inversión (sería opaco sin tasa explícita) ni amortización
 * automática de deudas (la cuota ya está incluida en el cálculo de gastos
 * mensuales que produce `ahorroMensual`).
 *
 * Fórmula: `patrimonio_futuro = patrimonio_actual + ahorro_mensual × meses`
 *
 * @param {number} patrimonioActual — Patrimonio neto hoy (puede ser negativo).
 * @param {number} ahorroMensual    — Ahorro promedio por mes (puede ser negativo).
 * @param {number} meses            — Horizonte de proyección (≥ 0).
 * @returns {number} Patrimonio proyectado.
 */
export function proyectarPatrimonio(patrimonioActual, ahorroMensual, meses) {
  if (!Number.isFinite(meses) || meses < 0) return patrimonioActual;
  return patrimonioActual + ahorroMensual * meses;
}

/**
 * Proyección multi-horizonte: 6, 12 y 24 meses.
 * Atajo conveniente para la UI; usa `proyectarPatrimonio()` internamente.
 *
 * @param {number} patrimonioActual
 * @param {number} ahorroMensual
 * @returns {{ seisMeses: number, doceMeses: number, veinticuatroMeses: number }}
 */
export function proyeccionMultiHorizonte(patrimonioActual, ahorroMensual) {
  return {
    seisMeses:         proyectarPatrimonio(patrimonioActual, ahorroMensual, 6),
    doceMeses:         proyectarPatrimonio(patrimonioActual, ahorroMensual, 12),
    veinticuatroMeses: proyectarPatrimonio(patrimonioActual, ahorroMensual, 24),
  };
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
 * @param {import('../../core/state.js').Meta[]} [metas=[]]  — opcional para
 *                                                            mantener compatibilidad
 *                                                            con llamadas existentes.
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
 *   activos: { totalCuentas: number, totalMetas: number, total: number },
 *   pasivos: { total: number, cantidadDeudas: number, deudasSinSaldo: number },
 *   patrimonioNeto: number,
 *   proyeccion: { seisMeses: number, doceMeses: number, veinticuatroMeses: number },
 * }}
 */
export function generarResumen(ingresos, gastos, compromisos, cuentas, anio, mes, metas = []) {
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

  const activos        = calcularActivos(cuentas, metas);
  const pasivos        = calcularPasivos(compromisos);
  const patrimonioNeto = calcularPatrimonioNeto(activos.total, pasivos.total);
  const proyeccion     = proyeccionMultiHorizonte(patrimonioNeto, balance);

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
    activos,
    pasivos,
    patrimonioNeto,
    proyeccion,
  };
}
