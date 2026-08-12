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
import { apartadosActivos }                             from '../apartados/logic.js';
import { calcularTotalInvertido }                       from '../inversiones/logic.js';
import { calcularTotalPorCobrar, calcularPrestamosSinCuenta } from '../personales/logic.js';
import { UVT, TOPES_RENTA_UVT, UMBRAL_ALERTA_RENTA }    from '../../core/constants.js';

// Regex reutilizada en funciones de deteccion.
const _RX_FECHA_ANA = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Reparte 100 puntos porcentuales entre un conjunto de valores por el método
 * del resto mayor.
 *
 * DIS.10 (C5, regla R28): redondear cada porcentaje por separado hacía que la
 * columna sumara 99 o 101 (medido: 31+18+16+13+8+7+6 = 99 en la card de
 * categorías). El reparto por resto mayor entrega la parte entera a cada uno y
 * asigna el sobrante a los que tienen la fracción más alta, así que la suma
 * siempre da 100 y el orden por tamaño se conserva.
 *
 * @param {number[]} valores  Valores no negativos.
 * @returns {number[]} Porcentajes enteros en el mismo orden; suman 100 (o
 *                     todos 0 si el total no es positivo).
 */
export function repartirPorcentajes(valores) {
  if (!Array.isArray(valores) || valores.length === 0) return [];

  const total = valores.reduce((acc, v) => acc + (Number(v) || 0), 0);
  if (total <= 0) return valores.map(() => 0);

  const exactos = valores.map(v => ((Number(v) || 0) / total) * 100);
  const pcts    = exactos.map(Math.floor);
  let sobrante  = 100 - pcts.reduce((acc, v) => acc + v, 0);

  const porFraccion = exactos
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; sobrante > 0 && k < porFraccion.length; k++, sobrante--) {
    pcts[porFraccion[k].i] += 1;
  }

  return pcts;
}

// ── PATRIMONIO NETO Y PROYECCIÓN ─────────────────────────────────

/**
 * Suma los activos del usuario: saldo de cuentas activas + dinero ya apartado
 * fuera de las cuentas (metas, apartados) + monto invertido.
 *
 * Por qué estos buckets, y no el fondo de emergencia:
 *   - Metas y Apartados descuentan el saldo de la cuenta al aportar, así que su
 *     `montoActual` es dinero que ya NO está en `cuentas`: sumarlo no duplica.
 *   - Inversiones es dinero que salió de las cuentas hacia un instrumento real
 *     (mismo criterio que `patrimonioBruto` del monitor de renta).
 *   - El fondo de emergencia se excluye a propósito: su aporte NO descuenta la
 *     cuenta (es un tracker paralelo), por lo que ese dinero ya está contado
 *     dentro de `cuentas`. Sumarlo lo contaría dos veces.
 *   - "Por cobrar" (PE.7) suma el capital pendiente de los préstamos que SÍ
 *     descontaron una cuenta al registrarse (los que tienen `cuentaId`). Misma
 *     regla: prestar sacó el dinero de `cuentas`, así que sumarlo no duplica y
 *     es necesario, porque prestar convierte efectivo en un derecho de cobro,
 *     no destruye riqueza. Los préstamos sin `cuentaId` quedan fuera por la
 *     razón inversa: nunca movieron un saldo, su dinero sigue dentro de
 *     `cuentas`. El filtro vive en `calcularTotalPorCobrar`.
 *
 * Las metas/apartados se cuentan como activo porque, contablemente, ese dinero
 * pertenece al usuario aunque esté "comprometido" para un objetivo específico.
 *
 * @param {import('../../core/state.js').Cuenta[]}    cuentas
 * @param {import('../../core/state.js').Meta[]}      metas
 * @param {import('../../core/state.js').Apartado[]}  [apartados=[]]
 * @param {import('../../core/state.js').Inversion[]} [inversiones=[]]
 * @param {import('../personales/logic.js').Personal[]} [personales=[]]
 * @returns {{ totalCuentas: number, totalMetas: number, totalApartados: number, totalInversiones: number, totalPorCobrar: number, prestamosSinCuenta: number, total: number }}
 */
export function calcularActivos(cuentas, metas, apartados = [], inversiones = [], personales = []) {
  const totalCuentas = calcularTotalCuentas(cuentas);
  const totalMetas   = metasActivas(metas)
    .reduce((acc, m) => acc + (m.montoActual ?? 0), 0);
  const totalApartados = apartadosActivos(apartados)
    .reduce((acc, a) => acc + (Number(a.montoActual) || 0), 0);
  const totalInversiones = calcularTotalInvertido(inversiones);
  const totalPorCobrar   = calcularTotalPorCobrar(personales);
  // ANL.3: préstamos con saldo pendiente que no cuentan como activo (sin
  // cuentaId), para que el patrimonio pueda explicar por qué no los incluye.
  const prestamosSinCuenta = calcularPrestamosSinCuenta(personales);
  return {
    totalCuentas,
    totalMetas,
    totalApartados,
    totalInversiones,
    totalPorCobrar,
    prestamosSinCuenta,
    total: totalCuentas + totalMetas + totalApartados + totalInversiones + totalPorCobrar,
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
 * @param {import('../../core/state.js').Apartado[]} [apartados=[]]  - opcional.
 * @param {import('../../core/state.js').Inversion[]} [inversiones=[]]  - opcional.
 * @returns {{
 *   gastoMes: number,
 *   compromisoMensual: number,
 *   saldoCuentas: number,
 *   egresos: number,
 *   porCategoria: Record<string, number>,
 *   hormigas: Array<{categoria:string, total:number, cantidad:number, promedio:number}>,
 *   activos: { totalCuentas: number, totalMetas: number, totalApartados: number, totalInversiones: number, totalPorCobrar: number, prestamosSinCuenta: number, total: number },
 *   pasivos: { total: number, cantidadDeudas: number, deudasSinSaldo: number },
 *   patrimonioNeto: number,
 *   volatilidad: number,
 * }}
 */
export function generarResumen(gastos, compromisos, cuentas, anio, mes, metas = [], apartados = [], inversiones = [], personales = []) {
  const gastoMes          = totalGastosMes(gastos, anio, mes);
  const compromisoMensual = calcularTotalCompromisos(compromisos);
  const saldoCuentas      = calcularTotalCuentas(cuentas);
  const egresos           = gastoMes + compromisoMensual;
  const gastosMesActual   = gastosMes(gastos, anio, mes);
  const porCategoria      = gastosPorCategoria(gastosMesActual);
  const hormigas          = detectarHormigas(gastosMesActual);

  const activos        = calcularActivos(cuentas, metas, apartados, inversiones, personales);
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

  let segmentos = ordenadas;
  if (ordenadas.length > maxSegmentos) {
    const resto = ordenadas.slice(maxSegmentos - 1);
    segmentos = [
      ...ordenadas.slice(0, maxSegmentos - 1),
      {
        categoria: 'Otros',
        total:     resto.reduce((acc, s) => acc + s.total, 0),
      },
    ];
  }

  // DIS.10 (C5): el porcentaje se reparte al final sobre los segmentos ya
  // formados, por resto mayor, para que la columna sume 100.
  const pcts = repartirPorcentajes(segmentos.map(s => s.total));
  return segmentos.map((s, i) => ({ ...s, pct: pcts[i] }));
}

// ── LECTURA INTERPRETATIVA DE LAS CARDS (ANL.1a, ADR 046 D3) ─────

/*
 * Las tres funciones de abajo escriben la línea que explica qué significa el
 * número que la card ya muestra. Extienden el patrón que `_fraseScore()`
 * (view.js) fundó en el hero del score, con las reglas del ADR 046 D3:
 *
 *   - Una sola línea, derivada del dato real: nunca una frase fija (el ADR 038
 *     ya descartó las del mockup por ser falsas para un usuario concreto).
 *   - Describe, no ordena. Convertir el hallazgo en acción es del ADR 044.
 *   - Cadena vacía cuando el dato no alcanza para decir algo cierto. La card
 *     ya tiene su propio vacío; inventar una lectura sería peor que callar.
 *
 * Son puras y sin DOM: la vista solo las imprime.
 */

/**
 * Lectura de la card de patrimonio: qué parte de lo que tienes está
 * comprometida con deudas. Es el significado de "activos menos pasivos", que
 * hoy la card muestra como cifra sin explicar.
 *
 * @param {{total:number}} activos
 * @param {{total:number}} pasivos
 * @param {number} patrimonioNeto
 * @returns {string} Línea lista para imprimir, o '' si no hay nada que leer.
 */
export function lecturaPatrimonio(activos, pasivos, patrimonioNeto) {
  const totalActivos = Number(activos?.total) || 0;
  const totalPasivos = Number(pasivos?.total) || 0;

  // Sin ninguna de las dos mitades no hay patrimonio del que hablar.
  if (totalActivos <= 0 && totalPasivos <= 0) return '';

  if (patrimonioNeto < 0) {
    return 'Hoy debes más de lo que tienes: por eso tu patrimonio es negativo.';
  }
  if (totalPasivos <= 0) {
    return 'Nada de lo que tienes está comprometido: hoy no registras deudas.';
  }

  const pct = Math.round((totalPasivos / totalActivos) * 100);
  if (pct >= 50) return 'Tus deudas pesan más de la mitad de lo que tienes.';
  return `Tus deudas equivalen al ${pct}% de lo que tienes.`;
}

/**
 * Lectura de la card de tendencia: el mes en curso contra el promedio de los
 * meses anteriores con gasto. El chip de la card ya compara contra el mes
 * pasado; el promedio dice si ese mes pasado era representativo.
 *
 * Los meses en cero no entran al promedio: son meses sin registro, y contarlos
 * como "gasté cero" hundiría la base y haría ver cualquier mes normal como un
 * desborde.
 *
 * @param {ReturnType<serieGastosMensual>} serie
 * @returns {string} Línea lista para imprimir, o '' si no hay base de comparación.
 */
export function lecturaTendencia(serie) {
  if (!Array.isArray(serie) || serie.length < 2) return '';

  const actual    = Number(serie[serie.length - 1]?.total) || 0;
  const previos   = serie.slice(0, -1).map(p => Number(p?.total) || 0).filter(t => t > 0);
  if (previos.length === 0) return '';

  if (actual <= 0) return 'Este mes todavía no registras gastos.';

  const promedio = previos.reduce((acc, t) => acc + t, 0) / previos.length;
  const pct      = Math.round(((actual - promedio) / promedio) * 100);

  // Margen de ruido: un 10 % arriba o abajo no es un cambio de hábito, y
  // anunciarlo como tal entrenaría al usuario a ignorar la línea.
  if (Math.abs(pct) <= 10) {
    return 'Este mes vas en línea con tu promedio de los últimos meses.';
  }
  return pct > 0
    ? `Este mes vas ${pct}% por encima de tu promedio de los últimos meses.`
    : `Este mes vas ${Math.abs(pct)}% por debajo de tu promedio de los últimos meses.`;
}

/**
 * Lectura de la card de categorías: qué tan concentrado está el gasto del mes.
 * La dona ya nombra la categoría más grande; lo que falta es si esa categoría
 * manda sobre el resto o si el gasto está repartido.
 *
 * @param {ReturnType<seriePorCategoria>} segmentos  Ordenados de mayor a menor.
 * @returns {string} Línea lista para imprimir, o '' si no hay gasto este mes.
 */
export function lecturaCategorias(segmentos) {
  if (!Array.isArray(segmentos) || segmentos.length === 0) return '';

  const top = segmentos[0];
  const cat = String(top?.categoria ?? '');
  const pct = Number(top?.pct) || 0;
  if (cat === '') return '';

  if (segmentos.length === 1) return `Todo tu gasto de este mes está en ${cat}.`;

  // 'Otros' es la cola larga que agrupa `seriePorCategoria`: que encabece
  // significa lo contrario a una categoría dominante.
  if (cat === 'Otros') {
    return 'Tu gasto de este mes está repartido en muchas categorías pequeñas.';
  }

  if (pct >= 50) return `Más de la mitad de tu gasto de este mes se va en ${cat}.`;
  return `${cat} concentra el ${pct}% de tu gasto de este mes.`;
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
        etiqueta: `Los ${d.nombre.toLowerCase()} gastas ${factor}× el promedio`,
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
 * Tres criterios no se pueden derivar de los datos de Finko (ingresos brutos,
 * consumos con tarjeta de crédito, consignaciones). Para ellos se leen los
 * valores que el usuario haya registrado manualmente en
 * `config.datosFiscales[anio]` (K.4). Si no hay valor registrado, el criterio
 * queda en `sin-datos`; si lo hay (incluido un 0 explícito), pasa a medible.
 *
 * @param {{
 *   cuentas:     import('../../core/state.js').Cuenta[],
 *   inversiones: import('../../core/state.js').Inversion[],
 *   gastos:      import('../../core/state.js').Gasto[],
 *   config?:     { datosFiscales?: Record<string, { ingresosBrutos?: number, consumosTC?: number, consignaciones?: number }> },
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

  // Valores manuales del año (K.4). Solo cuentan los campos efectivamente
  // registrados como número finito; un 0 explícito es "medido en cero".
  const df = (s.config && typeof s.config.datosFiscales === 'object' && s.config.datosFiscales !== null)
    ? s.config.datosFiscales[anio] : null;
  const man = (df && typeof df === 'object') ? df : {};
  const provisto = (k) =>
    Object.prototype.hasOwnProperty.call(man, k) && Number.isFinite(Number(man[k])) && Number(man[k]) >= 0;
  const valorManual = (k) => (provisto(k) ? Number(man[k]) : 0);
  const tipManual = (k, base) =>
    provisto(k) ? 'Valor que registraste manualmente en Configuración.' : base;

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
      construir('ingresosBrutos',  'Ingresos brutos',                t.ingresosBrutos,
        valorManual('ingresosBrutos'), provisto('ingresosBrutos'),
        tipManual('ingresosBrutos', 'Finko no rastrea ingresos. Regístralos en Configuración para incluirlos.')),
      construir('patrimonioBruto', 'Patrimonio bruto a 31 dic',      t.patrimonioBruto, valorPB, true,
        'Saldos de cuentas activas más monto invertido.'),
      construir('consumosTotales', 'Compras y consumos totales',     t.consumosTotales, valorCG, true,
        'Suma de tus gastos registrados durante el año.'),
      construir('consumosTC',      'Consumos con tarjeta de crédito', t.consumosTC,
        valorManual('consumosTC'), provisto('consumosTC'),
        tipManual('consumosTC', 'Finko no distingue tarjeta de crédito. Regístralos en Configuración para incluirlos.')),
      construir('consignaciones',  'Consignaciones y depósitos',     t.consignaciones,
        valorManual('consignaciones'), provisto('consignaciones'),
        tipManual('consignaciones', 'Finko no separa consignaciones de otros ingresos. Regístralas en Configuración para incluirlas.')),
    ],
  };
}

// ── CFG.2b · INFERENCIA DEL ESTADO DE DECLARANTE ─────────────────
//
// Framing: decisión D2 del ADR 050, alternativa C acotada. Finko afirma la
// REGLA general ("superar cualquiera de los 5 topes normalmente obliga a
// declarar") y describe dónde está el usuario respecto de ella, pero nunca
// afirma la obligación como hecho personal ni sustituye al contador (ADR 003).
// Por eso el vocabulario es "es probable", nunca "debes".

/** Encuadre por situación laboral (CFG.1a). Aplica a cualquier conclusión. */
const ENCUADRE_LABORAL = {
  empleado:      'Como empleado, tu empleador ya reporta a la DIAN lo que te paga y lo que te retiene. Que te retengan en la nómina no reemplaza la declaración.',
  independiente: 'Como independiente, el reporte de tus ingresos corre por tu cuenta: reúne facturas y cuentas de cobro del año antes de declarar.',
  pensionado:    'Como pensionado, tu pensión tiene un tratamiento propio en la declaración, pero tu patrimonio y tus otros ingresos sí cuentan para estos topes.',
  mixto:         'Con ingresos de empleo e independientes, los topes se miden sobre el total del año, no sobre cada fuente por separado.',
  otro:          'Antes de declarar, reúne los soportes de todo lo que recibiste durante el año.',
};

/** Encuadre cuando el usuario no registró su situación laboral. */
const ENCUADRE_SIN_SITUACION =
  'Registra tu situación laboral en Ajustes y Finko ajusta esta explicación a tu caso.';

/** Une etiquetas en una enumeración legible: "A", "A y B", "A, B y C". */
function _enumerar(etiquetas) {
  if (etiquetas.length === 0) return '';
  if (etiquetas.length === 1) return etiquetas[0];
  return `${etiquetas.slice(0, -1).join(', ')} y ${etiquetas[etiquetas.length - 1]}`;
}

/**
 * Infiere el estado de declarante de renta a partir de los 5 criterios del
 * monitor, el perfil fiscal y la situación laboral. Reemplaza la lectura del
 * checkbox manual como única fuente: ese checkbox sobrevive solo como override
 * positivo (la DIAN notifica con datos que Finko no ve), nunca como negación.
 *
 * Estados devueltos:
 *   - `'probable'`:      hay al menos un tope superado, o la DIAN ya notificó.
 *   - `'posible'`:       ningún tope superado pero al menos uno ≥ 80 %.
 *   - `'sin-conclusion'`: nada disparado y aún faltan criterios por registrar.
 *   - `'improbable'`:    los 5 criterios medidos y ninguno llega a su tope.
 *
 * @param {ReturnType<calcularEstadoRenta>} estadoRenta
 * @param {{ declaranteObligado?: boolean } | null} [perfilFiscal=null]
 * @param {string} [situacionLaboral=''] - id de `SITUACIONES_LABORALES`.
 * @returns {{
 *   estado: 'probable'|'posible'|'sin-conclusion'|'improbable',
 *   nivel: 'nudge-high'|'nudge-medium'|'nudge-info',
 *   icono: string,
 *   origen: 'notificacion'|'criterios'|'datos-incompletos',
 *   superados: string[],
 *   cerca: string[],
 *   sinDato: number,
 *   titulo: string,
 *   mensaje: string,
 *   encuadre: string,
 * } | null} `null` si el estado de renta no es válido.
 */
export function inferirEstadoDeclarante(estadoRenta, perfilFiscal = null, situacionLaboral = '') {
  if (!estadoRenta || !Array.isArray(estadoRenta.criterios)) return null;

  const anio      = estadoRenta.anio;
  const superados = estadoRenta.criterios.filter(c => c.estado === 'supera').map(c => c.etiqueta);
  const cerca     = estadoRenta.criterios.filter(c => c.estado === 'cerca').map(c => c.etiqueta);
  const sinDato   = estadoRenta.criterios.filter(c => c.estado === 'sin-datos').length;
  const notificado = perfilFiscal?.declaranteObligado === true;

  const encuadre = typeof situacionLaboral === 'string' && situacionLaboral !== ''
    ? (ENCUADRE_LABORAL[situacionLaboral] ?? ENCUADRE_LABORAL.otro)
    : ENCUADRE_SIN_SITUACION;

  let estado, nivel, icono, origen, titulo, mensaje;

  if (notificado) {
    estado = 'probable';
    nivel  = 'nudge-high';
    icono  = 'alert';
    origen = 'notificacion';
    titulo = `La DIAN te tiene registrado como declarante`;
    mensaje = `Marcaste que la DIAN te notificó: ese registro obliga a declarar aunque no superes ningún tope. Prepara tu declaración de ${anio}.`;
    if (superados.length > 0) {
      mensaje += ` Además, superas el tope de ${_enumerar(superados)}.`;
    }
  } else if (superados.length > 0) {
    estado = 'probable';
    nivel  = 'nudge-high';
    icono  = 'alert';
    origen = 'criterios';
    titulo = `Es probable que debas declarar renta por ${anio}`;
    mensaje = `Superas el tope de ${_enumerar(superados)}. Superar cualquiera de los 5 criterios de la DIAN normalmente obliga a declarar. Finko no puede confirmarlo por ti: verifícalo con un contador.`;
  } else if (cerca.length > 0) {
    estado = 'posible';
    nivel  = 'nudge-medium';
    icono  = 'alert';
    origen = 'criterios';
    titulo = `Estás cerca de quedar obligado a declarar`;
    mensaje = `Todavía no superas ningún tope, pero ${_enumerar(cerca)} ya pasa del 80 %. Si ${anio} cierra así, es probable que tengas que declarar.`;
  } else if (sinDato > 0) {
    estado = 'sin-conclusion';
    nivel  = 'nudge-info';
    icono  = 'info';
    origen = 'datos-incompletos';
    titulo = `Faltan datos para estimar si debes declarar`;
    mensaje = `Con lo que Finko ve hoy no superas ningún tope, pero ${sinDato} de los 5 criterios siguen sin dato. Regístralos en Ajustes para que la estimación signifique algo.`;
  } else {
    estado = 'improbable';
    nivel  = 'nudge-info';
    icono  = 'info';
    origen = 'criterios';
    titulo = `Con tus datos de ${anio} no estarías obligado a declarar`;
    mensaje = `Ninguno de los 5 criterios de la DIAN llega a su tope. Esto puede cambiar si tus ingresos o tu patrimonio suben antes de que termine el año.`;
  }

  return { estado, nivel, icono, origen, superados, cerca, sinDato, titulo, mensaje, encuadre };
}

/**
 * Genera nudges preventivos a partir del estado de renta.
 *
 * Reglas:
 *   - Por cada criterio en `'supera'`: nudge nivel `high`.
 *   - Por cada criterio en `'cerca'` (≥ 80 %): nudge nivel `medium`.
 *   - Criterios en `'ok'` o `'sin-datos'`: no generan nudge propio.
 *
 * CFG.2b: la conclusión sobre si el usuario debe declarar salió de acá y vive
 * en `inferirEstadoDeclarante()`. Esta función solo describe criterio a
 * criterio; quién concluye es una sola pieza y no dos.
 *
 * DIS.10 (C8): `icono` devuelve el NOMBRE de un símbolo del sprite ('alert',
 * 'info'), no un emoji. El glifo del sistema operativo no hereda el color del
 * texto ni la métrica del ícono, y ADR 037/038 fijaron "cero íconos nuevos"
 * justamente porque el sprite ya tiene los que hacen falta. La vista lo
 * resuelve con `icon(n.icono)`.
 *
 * @param {ReturnType<calcularEstadoRenta>} estadoRenta
 * @returns {Array<{
 *   id: string,
 *   nivel: 'nudge-high'|'nudge-medium'|'nudge-info',
 *   icono: string,
 *   criterio: string,
 *   etiqueta: string,
 *   mensaje: string,
 * }>}
 */
export function detectarNudgesRenta(estadoRenta) {
  const nudges = [];
  if (!estadoRenta || !Array.isArray(estadoRenta.criterios)) return nudges;

  for (const c of estadoRenta.criterios) {
    if (c.estado === 'supera') {
      nudges.push({
        id:       `renta-supera-${c.id}`,
        nivel:    'nudge-high',
        icono:    'alert',
        criterio: c.id,
        etiqueta: c.etiqueta,
        mensaje:  `Superas el tope de "${c.etiqueta}" (${Math.round(c.porcentaje)} % del límite).`,
      });
    } else if (c.estado === 'cerca') {
      nudges.push({
        id:       `renta-cerca-${c.id}`,
        nivel:    'nudge-medium',
        icono:    'alert',
        criterio: c.id,
        etiqueta: c.etiqueta,
        mensaje:  `Estás cerca del tope de "${c.etiqueta}" (${Math.round(c.porcentaje)} % del límite).`,
      });
    }
  }

  return nudges;
}
