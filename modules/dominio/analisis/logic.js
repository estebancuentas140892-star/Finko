/**
 * analisis/logic.js - funciones puras de agregación financiera.
 *
 * Decisión arquitectónica:
 *   Este módulo es la ÚNICA capa que importa de múltiples dominios.
 *   Es de sólo lectura: no muta S, no usa EventBus, no toca el DOM.
 *   Razón: el análisis es inherentemente cross-domain; centralizar aquí
 *   evita que los dominios se importen entre sí.
 */

import { totalGastosMes, gastosMes, gastosPorCategoria, detectarHormigas }
  from '../gastos/logic.js';
import { calcularTotalCompromisos, compromisosActivos, esDeuda } from '../compromisos/logic.js';
import { calcularTotalCuentas }                         from '../tesoreria/logic.js';
import { metasActivas }                                 from '../metas/logic.js';
import { calcularTotalInvertido }                       from '../inversiones/logic.js';
import { UVT, TOPES_RENTA_UVT, UMBRAL_ALERTA_RENTA }    from '../../core/constants.js';

// Regex reutilizada en funciones de deteccion.
const _RX_FECHA_ANA = /^(\d{4})-(\d{2})-(\d{2})/;

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
 * Suma los pasivos del usuario: saldoTotal de compromisos de tipo deuda
 * (entidad o personal) que estén activos.
 *
 * `saldoTotal` es obligatorio al crear una deuda en v6, pero por seguridad
 * tratamos como "deuda sin saldo" cualquier item que llegue sin él.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @returns {{
 *   total: number,
 *   cantidadDeudas: number,
 *   deudasSinSaldo: number,
 * }}
 */
export function calcularPasivos(compromisos) {
  const deudasActivas = compromisosActivos(compromisos).filter(c => esDeuda(c.tipo));
  let total = 0;
  let deudasSinSaldo = 0;
  for (const d of deudasActivas) {
    const saldo = Number(d.saldoTotal);
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
 * @param {number} patrimonioActual - Patrimonio neto hoy (puede ser negativo).
 * @param {number} ahorroMensual    - Ahorro promedio por mes (puede ser negativo).
 * @param {number} meses            - Horizonte de proyección (≥ 0).
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
 * Desde v8.8 la app no rastrea ingresos: el resumen se centra en gastos,
 * compromisos y patrimonio (saldos − deudas). No expone ingreso, balance,
 * tasa de ahorro ni proyección de flujo de caja.
 *
 * @param {import('../../core/state.js').Gasto[]}       gastos
 * @param {import('../../core/state.js').Compromiso[]}  compromisos
 * @param {import('../../core/state.js').Cuenta[]}      cuentas
 * @param {number} anio
 * @param {number} mes  1-12
 * @param {import('../../core/state.js').Meta[]} [metas=[]]  - opcional.
 * @returns {{
 *   gastoMes: number,
 *   compromisoMensual: number,
 *   saldoCuentas: number,
 *   egresos: number,
 *   porCategoria: Record<string, number>,
 *   hormigas: Array<{categoria:string, total:number, cantidad:number, promedio:number}>,
 *   activos: { totalCuentas: number, totalMetas: number, total: number },
 *   pasivos: { total: number, cantidadDeudas: number, deudasSinSaldo: number },
 *   patrimonioNeto: number,
 *   volatilidad: number,
 * }}
 */
export function generarResumen(gastos, compromisos, cuentas, anio, mes, metas = []) {
  const gastoMes          = totalGastosMes(gastos, anio, mes);
  const compromisoMensual = calcularTotalCompromisos(compromisos);
  const saldoCuentas      = calcularTotalCuentas(cuentas);
  const egresos           = gastoMes + compromisoMensual;
  const gastosMesActual   = gastosMes(gastos, anio, mes);
  const porCategoria      = gastosPorCategoria(gastosMesActual);
  const hormigas          = detectarHormigas(gastosMesActual);

  const activos        = calcularActivos(cuentas, metas);
  const pasivos        = calcularPasivos(compromisos);
  const patrimonioNeto = calcularPatrimonioNeto(activos.total, pasivos.total);

  // Volatilidad: std dev de gastos últimos 12 meses (para score de salud)
  const serieMeses = serieGastosMensual(gastos, anio, mes, 12);
  const gastosMontos = serieMeses.map(s => s.total);
  const volatilidad = calcularVolatilidad(gastosMontos);

  return {
    gastoMes,
    compromisoMensual,
    saldoCuentas,
    egresos,
    porCategoria,
    hormigas,
    activos,
    pasivos,
    patrimonioNeto,
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
 * Calcula el score de salud financiera (0-100) como promedio ponderado de factores.
 *
 * Modo 3 factores (ahorroData = null, comportamiento legacy):
 *   - Ratio deuda-activos (40 %): 0 → 100, 1 → 50, 2+ → 0
 *   - Ratio de liquidez (35 %): 6+ meses cubiertos → 100, 3 → 50, < 1 → 0
 *   - Control de gastos (25 %): volatilidad baja → 100, alta → 0
 *
 * Modo 4 factores (ahorroData provisto, J.1c):
 *   - Deuda (30 %), Liquidez (25 %), Control (20 %), Ahorro (25 %)
 *   - Ahorro: fondo completado → 100, fondo activo → 50, sin fondo → 0
 *
 * La separación backward-compat permite que los tests legacy existentes
 * sigan pasando sin cambios (llaman sin ahorroData).
 *
 * @param {{
 *   activos: {total: number},
 *   pasivos: {total: number},
 *   saldoCuentas: number,
 *   gastosMes: number,
 *   volatilidad: number,
 * }} resumen - Objeto generado por generarResumen().
 * @param {{ activo: boolean, completado: boolean } | null} [ahorroData=null]
 *   Estado del fondo de emergencia. null = modo 3 factores.
 * @returns {{
 *   score: number,
 *   factors: {deuda: number, liquidez: number, control: number, ahorro?: number},
 *   explicacion: string,
 * }}
 */
export function calcularScoreSalud(resumen, ahorroData = null) {
  const con4 = ahorroData !== null;

  if (!resumen) {
    return con4
      ? { score: 0, factors: { deuda: 0, liquidez: 0, control: 0, ahorro: 0 }, explicacion: 'Sin datos para calcular.' }
      : { score: 0, factors: { deuda: 0, liquidez: 0, control: 0 },            explicacion: 'Sin datos para calcular.' };
  }

  const activos = resumen.activos?.total ?? 0;
  const pasivos = resumen.pasivos?.total ?? 0;
  const saldoCuentas = resumen.saldoCuentas ?? 0;
  // generarResumen() expone "gastoMes" (sin s); tests legacy lo llaman "gastosMes".
  // Aceptamos ambos para no romper fixtures ni el flujo real.
  const gasteMes = resumen.gastoMes ?? resumen.gastosMes ?? 1;
  const volatilidad = resumen.volatilidad ?? 0;

  // Factor 1: Ratio deuda-activos
  const ratioDeuda = activos > 0 ? pasivos / activos : 1;
  const scoreDeuda = Math.max(0, 100 - ratioDeuda * 100);

  // Factor 2: Ratio liquidez
  const mesesRunway = gasteMes > 0 ? saldoCuentas / gasteMes : 0;
  const scoreLiquidez = Math.min(100, Math.max(0, (mesesRunway / 6) * 100));

  // Factor 3: Control de gastos
  const coeficienteVariacion = gasteMes > 0 ? volatilidad / gasteMes : 0;
  const scoreControl = Math.max(0, Math.min(100, 100 - coeficienteVariacion * 100));

  if (con4) {
    // Modo 4 factores: Deuda 30 %, Liquidez 25 %, Control 20 %, Ahorro 25 %
    const scoreAhorro = ahorroData.completado ? 100 : ahorroData.activo ? 50 : 0;
    const score =
      scoreDeuda   * 0.30 +
      scoreLiquidez * 0.25 +
      scoreControl  * 0.20 +
      scoreAhorro   * 0.25;
    return {
      score: Math.round(score),
      factors: {
        deuda:    Math.round(scoreDeuda),
        liquidez: Math.round(scoreLiquidez),
        control:  Math.round(scoreControl),
        ahorro:   Math.round(scoreAhorro),
      },
      explicacion:
        `Deuda ${Math.round(scoreDeuda)}/100 • ` +
        `Liquidez ${Math.round(scoreLiquidez)}/100 • ` +
        `Control ${Math.round(scoreControl)}/100 • ` +
        `Ahorro ${Math.round(scoreAhorro)}/100`,
    };
  }

  // Modo 3 factores (legacy): Deuda 40 %, Liquidez 35 %, Control 25 %
  const score =
    scoreDeuda   * 0.40 +
    scoreLiquidez * 0.35 +
    scoreControl  * 0.25;

  return {
    score: Math.round(score),
    factors: {
      deuda:    Math.round(scoreDeuda),
      liquidez: Math.round(scoreLiquidez),
      control:  Math.round(scoreControl),
    },
    explicacion:
      `Deuda ${Math.round(scoreDeuda)}/100 • ` +
      `Liquidez ${Math.round(scoreLiquidez)}/100 • Control ${Math.round(scoreControl)}/100`,
  };
}

/**
 * Clasifica un score (0-100) en una banda visual (excelente/buena/ajustada/crítica).
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

// ── SERIES TEMPORALES (D.3 - gráficos) ───────────────────────────

const _MESES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

/**
 * Construye una serie temporal de gastos para los últimos N meses, terminando
 * en (anio, mes) inclusive. Devuelve los meses ordenados del más antiguo al
 * más reciente - listo para alimentar una sparkline.
 *
 * Un mes sin gastos aparece como `total: 0` (no se omite). Esto es lo correcto
 * para una serie temporal: el "cero" tiene significado.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio       - Año del último mes de la serie.
 * @param {number} mes        - Mes (1-12) del último mes de la serie.
 * @param {number} [mesesAtras=12] - Cantidad de meses a incluir (≥ 1).
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
 * @param {import('../../core/state.js').Gasto[]} gastosDelMes - ya filtrados.
 * @param {number} [maxSegmentos=6] - Máximo de segmentos antes de agrupar.
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

// ── K.3 · MONITOR DE TOPES DE RENTA ──────────────────────────────
//
// 5 criterios de obligación de declarar renta para persona natural en Colombia.
// Cada tope se calcula como `N × UVT_VIGENTE`, así que actualizar la UVT del año
// recalcula los topes solos. Solo se "miden" los criterios para los que Finko
// tiene datos suficientes; el resto se reporta como `estado: 'sin-datos'` con
// una sugerencia de dónde consultar el valor real.
//
// Honestidad explícita: en vez de inventar datos cuando no hay (ingresos sin
// dominio, tarjeta de crédito sin tipo en TIPOS_CUENTA, consignaciones sin
// stream propio), el monitor muestra el tope para referencia y deja claro que
// la verificación debe hacerse fuera de Finko.

/**
 * Patrimonio bruto = saldos de cuentas activas + monto invertido.
 * No descuenta deudas (eso sería patrimonio neto, no bruto, que es lo que
 * mide la DIAN para el criterio del 31 de diciembre).
 *
 * @param {import('../../core/state.js').Cuenta[]}    cuentas
 * @param {import('../../core/state.js').Inversion[]} inversiones
 * @returns {number} COP.
 */
export function patrimonioBruto(cuentas, inversiones) {
  const c = Array.isArray(cuentas)     ? calcularTotalCuentas(cuentas)     : 0;
  const i = Array.isArray(inversiones) ? calcularTotalInvertido(inversiones) : 0;
  return c + i;
}

/**
 * Suma de gastos del año indicado. Equivalente anualizado de `totalGastosMes`.
 * Aproxima el criterio de "compras y consumos totales" de la DIAN.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @returns {number} COP.
 */
export function totalGastosAnio(gastos, anio) {
  if (!Array.isArray(gastos))         return 0;
  if (!Number.isFinite(anio))         return 0;
  const pref = `${anio}-`;
  let total = 0;
  for (const g of gastos) {
    if (!g || typeof g.fecha !== 'string') continue;
    if (!g.fecha.startsWith(pref))         continue;
    const m = Number(g.monto);
    if (Number.isFinite(m) && m > 0) total += m;
  }
  return total;
}

/**
 * Construye el estado de renta del año indicado a partir de los datos del
 * usuario y la UVT del año vigente. Devuelve los 5 criterios con su tope
 * en pesos, el valor actual (si es medible), el porcentaje sobre el tope y
 * el estado clasificatorio.
 *
 * Estados de cada criterio:
 *   - `'sin-datos'`: Finko no puede medirlo (criterio informativo).
 *   - `'ok'`:     porcentaje < UMBRAL_ALERTA_RENTA (80 % por defecto).
 *   - `'cerca'`:  80 % ≤ porcentaje < 100 %.
 *   - `'supera'`: porcentaje ≥ 100 %.
 *
 * @param {{
 *   cuentas:     import('../../core/state.js').Cuenta[],
 *   inversiones: import('../../core/state.js').Inversion[],
 *   gastos:      import('../../core/state.js').Gasto[],
 * }} state - usualmente `S` completo, o un subset para tests.
 * @param {number} anio
 * @returns {{
 *   anio: number,
 *   uvt: number,
 *   umbralAlerta: number,
 *   criterios: Array<{
 *     id: string,
 *     etiqueta: string,
 *     topeUVT: number,
 *     tope: number,
 *     valor: number,
 *     porcentaje: number,
 *     estado: 'sin-datos'|'ok'|'cerca'|'supera',
 *     medible: boolean,
 *     tip: string,
 *   }>,
 * }}
 */
export function calcularEstadoRenta(state, anio) {
  const s   = (state && typeof state === 'object') ? state : {};
  const uvt = Number.isFinite(UVT) && UVT > 0 ? UVT : 0;
  const t   = TOPES_RENTA_UVT;

  const valorPB = patrimonioBruto(s.cuentas, s.inversiones);
  const valorCG = totalGastosAnio(s.gastos, anio);

  const construir = (id, etiqueta, topeUVT, valor, medible, tip) => {
    const tope = topeUVT * uvt;
    let porcentaje = 0;
    let estado;
    if (!medible) {
      estado = 'sin-datos';
    } else if (tope <= 0) {
      estado = 'sin-datos';
    } else {
      porcentaje = Math.min(999, (valor / tope) * 100);
      if      (porcentaje >= 100)                       estado = 'supera';
      else if (porcentaje >= UMBRAL_ALERTA_RENTA * 100) estado = 'cerca';
      else                                              estado = 'ok';
    }
    return {
      id, etiqueta, topeUVT, tope,
      valor:      medible ? valor : 0,
      porcentaje: medible ? +porcentaje.toFixed(1) : 0,
      estado, medible, tip,
    };
  };

  return {
    anio,
    uvt,
    umbralAlerta: UMBRAL_ALERTA_RENTA,
    criterios: [
      construir('ingresosBrutos',  'Ingresos brutos',                t.ingresosBrutos,  0, false,
        'Finko no rastrea ingresos. Compara con tu certificado de ingresos del año.'),
      construir('patrimonioBruto', 'Patrimonio bruto a 31 dic',      t.patrimonioBruto, valorPB, true,
        'Saldos de cuentas activas más monto invertido.'),
      construir('consumosTotales', 'Compras y consumos totales',     t.consumosTotales, valorCG, true,
        'Suma de tus gastos registrados durante el año.'),
      construir('consumosTC',      'Consumos con tarjeta de crédito', t.consumosTC,     0, false,
        'Finko no distingue tarjeta de crédito. Revisa los extractos de tus tarjetas.'),
      construir('consignaciones',  'Consignaciones y depósitos',     t.consignaciones,  0, false,
        'Finko no separa consignaciones de otros ingresos. Revisa los extractos bancarios.'),
    ],
  };
}

/**
 * Genera nudges preventivos a partir del estado de renta.
 *
 * Reglas:
 *   - Por cada criterio en `'supera'`: nudge nivel `high`.
 *   - Por cada criterio en `'cerca'` (≥ 80 %): nudge nivel `medium`.
 *   - Criterios en `'ok'` o `'sin-datos'`: no generan nudge propio.
 *   - Si `perfilFiscal.declaranteObligado === true` y no hay nudges críticos:
 *     se añade un nudge informativo recordando preparar la declaración.
 *
 * @param {ReturnType<calcularEstadoRenta>} estadoRenta
 * @param {{ declaranteObligado?: boolean } | null} [perfilFiscal=null]
 * @returns {Array<{
 *   id: string,
 *   nivel: 'nudge-high'|'nudge-medium'|'nudge-info',
 *   icono: string,
 *   criterio: string,
 *   etiqueta: string,
 *   mensaje: string,
 * }>}
 */
export function detectarNudgesRenta(estadoRenta, perfilFiscal = null) {
  const nudges = [];
  if (!estadoRenta || !Array.isArray(estadoRenta.criterios)) return nudges;

  for (const c of estadoRenta.criterios) {
    if (c.estado === 'supera') {
      nudges.push({
        id:       `renta-supera-${c.id}`,
        nivel:    'nudge-high',
        icono:    '🚨',
        criterio: c.id,
        etiqueta: c.etiqueta,
        mensaje:  `Superas el tope de "${c.etiqueta}" (${Math.round(c.porcentaje)} % del límite). Confirma con un contador.`,
      });
    } else if (c.estado === 'cerca') {
      nudges.push({
        id:       `renta-cerca-${c.id}`,
        nivel:    'nudge-medium',
        icono:    '⚠️',
        criterio: c.id,
        etiqueta: c.etiqueta,
        mensaje:  `Estás cerca del tope de "${c.etiqueta}" (${Math.round(c.porcentaje)} % del límite).`,
      });
    }
  }

  // Refuerzo para declarantes obligados aunque no haya criterios disparados.
  if (perfilFiscal?.declaranteObligado === true && nudges.length === 0) {
    nudges.push({
      id:       'renta-declarante',
      nivel:    'nudge-info',
      icono:    '📋',
      criterio: 'declaranteObligado',
      etiqueta: 'Declarante notificado por la DIAN',
      mensaje:  'La DIAN te tiene registrado como declarante. Prepara la declaración aunque no superes los topes.',
    });
  }

  return nudges;
}
