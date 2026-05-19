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

// Regex reutilizada en funciones de deteccion.
const _RX_FECHA_ANA = /^(\d{4})-(\d{2})-(\d{2})/;

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

// ── COMPARACIÓN DE CATEGORÍAS MES ACTUAL vs MES ANTERIOR (G.2) ───

/**
 * Compara los gastos por categoría del mes indicado contra el mes anterior.
 * Util para mostrar al usuario qué categorias subieron o bajaron.
 *
 * La comparación es interna: calcula ambos catMaps desde el array de gastos,
 * sin depender de un historial externo.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio   Año del mes actual.
 * @param {number} mes    Mes del mes actual (1-12).
 * @param {object} [config]
 * @param {number} [config.topN=5] Máximo de categorías en el resultado.
 * @returns {{
 *   categorias: Array<{cat:string, actual:number, anterior:number, delta:number, deltaPct:number, direccion:string}>,
 *   highlights: Array<{tipo:'mejora'|'alerta', cat:string, mensaje:string}>,
 *   totalActual: number,
 *   totalAnterior: number,
 * } | null}
 */
export function calcularComparacionCategorias(gastos, anio, mes, config = {}) {
  if (!Array.isArray(gastos)) return null;

  const cfg  = typeof config === 'object' && config ? config : {};
  const topN = Number.isFinite(+cfg.topN) && +cfg.topN > 0 ? Math.floor(+cfg.topN) : 5;

  // Mes anterior: si estamos en enero, el anterior es diciembre del año pasado.
  const anioAnt = mes === 1 ? anio - 1 : anio;
  const mesAnt  = mes === 1 ? 12 : mes - 1;

  const cmActual   = gastosPorCategoria(gastosMes(gastos, anio,    mes));
  const cmAnterior = gastosPorCategoria(gastosMes(gastos, anioAnt, mesAnt));

  // Union de todas las categorias presentes en cualquiera de los dos períodos.
  const cats = new Set([...Object.keys(cmActual), ...Object.keys(cmAnterior)]);
  if (cats.size === 0) return null;

  const out = [];
  let totalActual = 0;
  let totalAnterior = 0;

  for (const cat of cats) {
    const actual   = Number(cmActual[cat])   || 0;
    const anterior = Number(cmAnterior[cat]) || 0;
    if (actual <= 0 && anterior <= 0) continue;

    totalActual   += actual;
    totalAnterior += anterior;

    const delta = actual - anterior;
    let deltaPct;
    if (anterior <= 0)  deltaPct = actual > 0 ? 100 : 0;
    else                deltaPct = +(delta / anterior * 100).toFixed(1);

    let direccion;
    if      (anterior <= 0 && actual > 0)  direccion = 'nueva';
    else if (anterior > 0  && actual <= 0) direccion = 'desaparecio';
    else if (Math.abs(deltaPct) < 5)       direccion = 'igual';
    else if (delta > 0)                    direccion = 'subio';
    else                                   direccion = 'bajo';

    out.push({ cat, actual, anterior, delta, deltaPct, direccion });
  }

  // Mayor delta absoluto (en pesos) primero. Empate: orden alfabetico.
  out.sort((a, b) => {
    const d = Math.abs(b.delta) - Math.abs(a.delta);
    return d !== 0 ? d : a.cat.localeCompare(b.cat);
  });

  // Highlights: top 3 cambios significativos con etiqueta 'mejora' o 'alerta'.
  const cambios    = out.filter(c => c.direccion !== 'igual');
  const highlights = cambios.slice(0, 3).map(c => {
    const esMejora = c.direccion === 'bajo' || c.direccion === 'desaparecio';
    let mensaje;
    if      (c.direccion === 'nueva')       mensaje = `Empezaste a gastar en ${c.cat}`;
    else if (c.direccion === 'desaparecio') mensaje = `Dejaste de gastar en ${c.cat}`;
    else if (c.direccion === 'subio')       mensaje = `Subió ${c.deltaPct}% en ${c.cat}`;
    else                                    mensaje = `Bajó ${Math.abs(c.deltaPct)}% en ${c.cat}`;
    return { tipo: esMejora ? 'mejora' : 'alerta', cat: c.cat, mensaje };
  });

  return {
    categorias:    out.slice(0, topN),
    highlights,
    totalActual,
    totalAnterior,
  };
}

// ── PATRÓN DE GASTO SEMANAL (G.2) ────────────────────────────────

const _DIAS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * Detecta si hay un día de la semana donde consistentemente se gasta más.
 * Analiza los gastos de los últimos `ventanaDias` días y señala los días
 * cuyo total es >= `factorUmbral` veces el promedio global.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} hoyISO   YYYY-MM-DD.
 * @param {object} [config]
 * @param {number} [config.ventanaDias=90]      Ventana de análisis en días.
 * @param {number} [config.factorUmbral=2.0]    Factor sobre promedio para marcar día.
 * @param {number} [config.minGastos=7]         Mínimo de transacciones para activar.
 * @param {number} [config.minOcurrencias=2]    Mínimo de veces que el día debe aparecer.
 * @returns {{
 *   porDia: Array<{dia:number, nombre:string, total:number, ocurrencias:number, promedioPorOcurrencia:number}>,
 *   diasDestacados: Array<{dia:number, nombre:string, factor:number, severidad:'alta'|'media', etiqueta:string}>,
 *   promedioGlobalDia: number,
 *   totalAnalizado: number,
 *   gastosAnalizados: number,
 * } | null}
 */
export function detectarPatronGastoSemanal(gastos, hoyISO, config = {}) {
  if (!Array.isArray(gastos))     return null;
  if (typeof hoyISO !== 'string') return null;

  const mHoy = _RX_FECHA_ANA.exec(hoyISO);
  if (!mHoy) return null;

  const cfg           = typeof config === 'object' && config ? config : {};
  const ventana       = Number.isFinite(+cfg.ventanaDias)    && +cfg.ventanaDias    > 0 ? Math.floor(+cfg.ventanaDias)    : 90;
  const factorUmbral  = Number.isFinite(+cfg.factorUmbral)   && +cfg.factorUmbral   > 0 ? +cfg.factorUmbral               : 2.0;
  const minGastos     = Number.isFinite(+cfg.minGastos)      && +cfg.minGastos      > 0 ? Math.floor(+cfg.minGastos)      : 7;
  const minOcurr      = Number.isFinite(+cfg.minOcurrencias) && +cfg.minOcurrencias > 0 ? Math.floor(+cfg.minOcurrencias) : 2;

  const tHoy   = Date.UTC(+mHoy[1], +mHoy[2] - 1, +mHoy[3]);
  const tLimite = tHoy - ventana * 86_400_000;

  const totales     = new Array(7).fill(0);
  const ocurrencias = new Array(7).fill(0);
  let gastosContados = 0;
  let totalAnalizado = 0;

  for (const g of gastos) {
    if (!g || typeof g !== 'object')     continue;
    if (typeof g.fecha !== 'string')     continue;
    const mg = _RX_FECHA_ANA.exec(g.fecha);
    if (!mg) continue;
    const tG = Date.UTC(+mg[1], +mg[2] - 1, +mg[3]);
    if (tG < tLimite || tG > tHoy) continue;

    const monto = Number(g.monto) || 0;
    if (monto <= 0) continue;

    const diaSemana = new Date(tG).getUTCDay(); // 0=Dom … 6=Sáb
    totales[diaSemana]     += monto;
    ocurrencias[diaSemana] += 1;
    gastosContados++;
    totalAnalizado += monto;
  }

  if (gastosContados < minGastos) return null;

  const diasConDatos = totales.filter((t, i) => ocurrencias[i] > 0).length;
  if (diasConDatos === 0) return null;

  const promedioGlobalDia = totalAnalizado / diasConDatos;

  const porDia = _DIAS_ES.map((nombre, dia) => ({
    dia,
    nombre,
    total:                  totales[dia],
    ocurrencias:            ocurrencias[dia],
    promedioPorOcurrencia:  ocurrencias[dia] > 0 ? Math.round(totales[dia] / ocurrencias[dia]) : 0,
  }));

  const diasDestacados = porDia
    .filter(d => d.ocurrencias >= minOcurr && d.total >= promedioGlobalDia * factorUmbral)
    .map(d => {
      const factor    = +(d.total / promedioGlobalDia).toFixed(1);
      const severidad = factor >= 3.0 ? 'alta' : 'media';
      return {
        dia:      d.dia,
        nombre:   d.nombre,
        factor,
        severidad,
        etiqueta: `Los ${d.nombre.toLowerCase()} gastás ${factor}× el promedio`,
      };
    })
    .sort((a, b) => b.factor - a.factor);

  return {
    porDia,
    diasDestacados,
    promedioGlobalDia: Math.round(promedioGlobalDia),
    totalAnalizado,
    gastosAnalizados:  gastosContados,
  };
}
