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
 *   volatilidad: number,
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

  // Volatilidad: std dev de gastos últimos 12 meses (para score de salud)
  const serieMeses = serieGastosMensual(gastos, anio, mes, 12);
  const gastosMontos = serieMeses.map(s => s.total);
  const volatilidad = calcularVolatilidad(gastosMontos);

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
    volatilidad,
  };
}

// ── SCORE DE SALUD FINANCIERA (F.3) ──────────────────────────────

/**
 * Calcula la desviación estándar (volatilidad) de una serie de números.
 * Devuelve 0 si hay 0 o 1 elementos.
 *
 * @param {number[]} valores
 * @returns {number}
 */
export function calcularVolatilidad(valores) {
  if (!Array.isArray(valores) || valores.length < 2) return 0;
  const n = valores.length;
  const promedio = valores.reduce((acc, v) => acc + v, 0) / n;
  const sumSquares = valores.reduce((acc, v) => acc + Math.pow(v - promedio, 2), 0);
  return Math.sqrt(sumSquares / n);
}

/**
 * Calcula el score de salud financiera (0–100) como promedio ponderado de 4 factores:
 *   - Tasa de ahorro (40 %): ≥ 20 % → 100, 0 % → 50, < 0 % → 0
 *   - Ratio deuda-activos (25 %): 0 → 100, 1 → 50, 2+ → 0
 *   - Ratio de liquidez (20 %): 6+ meses → 100, 3 meses → 50, < 1 mes → 0
 *   - Control de gastos (15 %): Volatilidad baja → 100, alta → 0
 *
 * Devuelve un objeto con el score total (redondeado) y los sub-scores por factor.
 *
 * @param {{
 *   tasaAhorro: number,
 *   activos: {total: number},
 *   pasivos: {total: number},
 *   saldoCuentas: number,
 *   gastosMes: number,
 *   volatilidad: number,
 * }} resumen — Objeto generado por generarResumen().
 * @returns {{
 *   score: number,
 *   factors: {tasaAhorro: number, deuda: number, liquidez: number, control: number},
 *   explicacion: string,
 * }}
 */
export function calcularScoreSalud(resumen) {
  if (!resumen) {
    return {
      score: 0,
      factors: { tasaAhorro: 0, deuda: 0, liquidez: 0, control: 0 },
      explicacion: 'Sin datos para calcular.',
    };
  }

  const tasaAhorro = resumen.tasaAhorro ?? 0;
  const activos = resumen.activos?.total ?? 0;
  const pasivos = resumen.pasivos?.total ?? 0;
  const saldoCuentas = resumen.saldoCuentas ?? 0;
  // generarResumen() expone "gastoMes" (sin s); tests legacy lo llaman "gastosMes".
  // Aceptamos ambos para no romper fixtures ni el flujo real.
  const gasteMes = resumen.gastoMes ?? resumen.gastosMes ?? 1;
  const volatilidad = resumen.volatilidad ?? 0;

  // Factor 1: Tasa de ahorro (40 %)
  const scoreTasa = Math.min(100, Math.max(0, (tasaAhorro / 20) * 100));

  // Factor 2: Ratio deuda-activos (25 %)
  const ratioDeuda = activos > 0 ? pasivos / activos : 1;
  const scoreDeuda = Math.max(0, 100 - ratioDeuda * 100);

  // Factor 3: Ratio liquidez (20 %)
  const mesesRunway = gasteMes > 0 ? saldoCuentas / gasteMes : 0;
  const scoreLiquidez = Math.min(100, Math.max(0, (mesesRunway / 6) * 100));

  // Factor 4: Control de gastos (15 %)
  const coeficienteVariacion = gasteMes > 0 ? volatilidad / gasteMes : 0;
  const scoreControl = Math.max(0, Math.min(100, 100 - coeficienteVariacion * 100));

  // Promedio ponderado
  const score =
    scoreTasa * 0.4 +
    scoreDeuda * 0.25 +
    scoreLiquidez * 0.2 +
    scoreControl * 0.15;

  return {
    score: Math.round(score),
    factors: {
      tasaAhorro: Math.round(scoreTasa),
      deuda: Math.round(scoreDeuda),
      liquidez: Math.round(scoreLiquidez),
      control: Math.round(scoreControl),
    },
    explicacion:
      `Ahorro ${Math.round(scoreTasa)}/100 • Deuda ${Math.round(scoreDeuda)}/100 • ` +
      `Liquidez ${Math.round(scoreLiquidez)}/100 • Control ${Math.round(scoreControl)}/100`,
  };
}

/**
 * Clasifica un score (0–100) en una banda visual (excelente/buena/ajustada/crítica).
 *
 * @param {number} score
 * @returns {string}
 */
export function clasificarScore(score) {
  if (score >= 80) return 'excelente';
  if (score >= 60) return 'buena';
  if (score >= 40) return 'ajustada';
  return 'critica';
}

// ── SERIES TEMPORALES (D.3 — gráficos) ───────────────────────────

const _MESES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

/**
 * Construye una serie temporal de gastos para los últimos N meses, terminando
 * en (anio, mes) inclusive. Devuelve los meses ordenados del más antiguo al
 * más reciente — listo para alimentar una sparkline.
 *
 * Un mes sin gastos aparece como `total: 0` (no se omite). Esto es lo correcto
 * para una serie temporal: el "cero" tiene significado.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio       — Año del último mes de la serie.
 * @param {number} mes        — Mes (1–12) del último mes de la serie.
 * @param {number} [mesesAtras=12] — Cantidad de meses a incluir (≥ 1).
 * @returns {Array<{anio:number, mes:number, total:number, label:string}>}
 */
export function serieGastosMensual(gastos, anio, mes, mesesAtras = 12) {
  const n = Math.max(1, Math.floor(mesesAtras));
  const serie = [];
  for (let i = n - 1; i >= 0; i--) {
    let y = anio;
    let m = mes - i;
    while (m <= 0) { m += 12; y -= 1; }
    serie.push({
      anio:  y,
      mes:   m,
      total: totalGastosMes(gastos, y, m),
      label: _MESES_CORTO[m - 1] ?? '',
    });
  }
  return serie;
}

/**
 * Distribución de gastos por categoría, ordenada de mayor a menor y con
 * porcentaje sobre el total. Agrupa la cola larga en "Otros" cuando el
 * número de categorías supera `maxSegmentos`.
 *
 * Devuelve [] si no hay gastos. Pensado para alimentar un donut chart.
 *
 * @param {import('../../core/state.js').Gasto[]} gastosDelMes — ya filtrados.
 * @param {number} [maxSegmentos=6] — Máximo de segmentos antes de agrupar.
 * @returns {Array<{categoria:string, total:number, pct:number}>}
 */
export function seriePorCategoria(gastosDelMes, maxSegmentos = 6) {
  const porCat = gastosPorCategoria(gastosDelMes);
  const total  = Object.values(porCat).reduce((acc, v) => acc + v, 0);
  if (total <= 0) return [];

  const ordenadas = Object.entries(porCat)
    .map(([categoria, t]) => ({ categoria, total: t }))
    .sort((a, b) => b.total - a.total);

  const conPct = (s) => ({ ...s, pct: Math.round((s.total / total) * 100) });

  if (ordenadas.length <= maxSegmentos) {
    return ordenadas.map(conPct);
  }

  const top         = ordenadas.slice(0, maxSegmentos - 1).map(conPct);
  const resto       = ordenadas.slice(maxSegmentos - 1);
  const restoTotal  = resto.reduce((acc, s) => acc + s.total, 0);

  return [
    ...top,
    {
      categoria: 'Otros',
      total:     restoTotal,
      pct:       Math.round((restoTotal / total) * 100),
    },
  ];
}
