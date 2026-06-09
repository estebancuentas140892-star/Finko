/**
 * infra/financiero.js - fórmulas financieras puras para Colombia.
 * Sin DOM. Sin S. Sin efectos secundarios. Testeable en Node/Vitest.
 *
 * Movido desde dominio/calculadoras/logic.js (v8.1) para que cualquier
 * dominio pueda importarlo sin violar la regla "ningún dominio importa a otro".
 *
 * Fórmulas disponibles: CDT, crédito (sistema francés), interés compuesto,
 * regla del 72, rentabilidad real (Fisher), validarCampos.
 * Las fórmulas laborales (prima, PILA, aportes, cesantías) se eliminaron
 * en L.1 junto con el simulador laboral (2026-06-07).
 */

// ── CDT (Certificado de Depósito a Término) ──────────────────────

/**
 * Calcula el rendimiento de un CDT.
 *
 * Fórmula: `VF = P × (1 + tasa_EA)^(días/365)`
 * La retención en la fuente es del 7 % sobre el rendimiento bruto
 * (aplica a personas naturales no declarantes; tasa estándar SFC).
 *
 * @param {number} principal    - Capital invertido en COP.
 * @param {number} tasaEA       - Tasa efectiva anual como decimal (ej. 0.12 = 12%).
 * @param {number} plazo        - Plazo en días (mín. 1).
 * @returns {{
 *   valorFuturo: number,
 *   rendimientoBruto: number,
 *   retencion: number,
 *   rendimientoNeto: number,
 *   totalNeto: number,
 * }}
 */
export function calcularCDT(principal, tasaEA, plazo) {
  const valorFuturo      = principal * Math.pow(1 + tasaEA, plazo / 365);
  const rendimientoBruto = valorFuturo - principal;
  const retencion        = rendimientoBruto * 0.07;        // retención 7%
  const rendimientoNeto  = rendimientoBruto - retencion;
  const totalNeto        = principal + rendimientoNeto;

  return {
    valorFuturo:      Math.round(valorFuturo),
    rendimientoBruto: Math.round(rendimientoBruto),
    retencion:        Math.round(retencion),
    rendimientoNeto:  Math.round(rendimientoNeto),
    totalNeto:        Math.round(totalNeto),
  };
}

// ── CRÉDITO (cuota fija - sistema francés) ────────────────────────

/**
 * Calcula la cuota mensual fija de un crédito (sistema francés / amortización constante).
 *
 * Conversión EA → mensual: `i_m = (1 + i_EA)^(1/12) - 1`
 * Cuota: `C = P × i_m × (1 + i_m)^n / ((1 + i_m)^n - 1)`
 *
 * @param {number} principal   - Monto del crédito en COP.
 * @param {number} tasaEA      - Tasa efectiva anual como decimal.
 * @param {number} plazoMeses  - Número de cuotas mensuales.
 * @returns {{
 *   cuotaMensual: number,
 *   totalPagado: number,
 *   totalIntereses: number,
 *   tasaMensual: number,
 * }}
 */
export function calcularCredito(principal, tasaEA, plazoMeses) {
  const tasaMensual = Math.pow(1 + tasaEA, 1 / 12) - 1;

  let cuotaMensual;
  if (tasaMensual === 0) {
    cuotaMensual = principal / plazoMeses;
  } else {
    const factor = Math.pow(1 + tasaMensual, plazoMeses);
    cuotaMensual = principal * (tasaMensual * factor) / (factor - 1);
  }

  const totalPagado    = cuotaMensual * plazoMeses;
  const totalIntereses = totalPagado - principal;

  return {
    cuotaMensual:   Math.round(cuotaMensual),
    totalPagado:    Math.round(totalPagado),
    totalIntereses: Math.round(totalIntereses),
    tasaMensual:    Number((tasaMensual * 100).toFixed(4)),  // % con 4 decimales
  };
}

// ── INTERÉS COMPUESTO ─────────────────────────────────────────────

/**
 * Proyecta el crecimiento de una inversión con capitalización periódica.
 *
 * Fórmula: `M = P × (1 + r/n)^(n×t)`
 *
 * @param {number} principal          - Capital inicial en COP.
 * @param {number} tasaAnualPct       - Tasa anual como porcentaje (ej. 12 = 12%).
 * @param {number} periodosPorAnio    - Capitalización: 1=anual, 2=semestral, 12=mensual, 365=diaria.
 * @param {number} anios              - Horizonte en años.
 * @returns {{
 *   montoFinal: number,
 *   ganancia: number,
 *   factorCrecimiento: number,
 * }}
 */
export function calcularInteresCompuesto(principal, tasaAnualPct, periodosPorAnio, anios) {
  const r = tasaAnualPct / 100;
  const montoFinal = principal * Math.pow(1 + r / periodosPorAnio, periodosPorAnio * anios);
  const ganancia   = montoFinal - principal;

  return {
    montoFinal:        Math.round(montoFinal),
    ganancia:          Math.round(ganancia),
    factorCrecimiento: Number((montoFinal / principal).toFixed(4)),
  };
}

// ── REGLA DEL 72 ─────────────────────────────────────────────────

/**
 * Estima en cuántos años se duplica un capital a una tasa dada.
 * Aproximación clásica: `años ≈ 72 / tasa_%`.
 * Resultado exacto (logarítmico) incluido para comparación.
 *
 * @param {number} tasaAnualPct - Tasa anual como porcentaje (ej. 12 = 12%).
 * @returns {{
 *   aniosAproximados: number,
 *   aniosExactos: number,
 * }}
 */
export function calcularRegla72(tasaAnualPct) {
  const aniosAproximados = 72 / tasaAnualPct;
  const aniosExactos     = Math.log(2) / Math.log(1 + tasaAnualPct / 100);

  return {
    aniosAproximados: Number(aniosAproximados.toFixed(2)),
    aniosExactos:     Number(aniosExactos.toFixed(2)),
  };
}

// ── RENTABILIDAD REAL (fórmula de Fisher) ─────────────────────────

/**
 * Calcula la rentabilidad real ajustada por inflación.
 *
 * Fórmula de Fisher: `r_real = (1 + r_nominal) / (1 + inflación) - 1`
 *
 * @param {number} capital       - Capital invertido en COP.
 * @param {number} tasaPct       - Tasa nominal anual en porcentaje.
 * @param {number} inflacionPct  - Inflación anual en porcentaje.
 * @returns {{
 *   tasaRealPct: number,
 *   gananciaNominal: number,
 *   gananciaReal: number,
 *   perdidaInflacion: number,
 * }}
 */
export function calcularRentabilidadReal(capital, tasaPct, inflacionPct) {
  const tasaRealPct      = (((1 + tasaPct / 100) / (1 + inflacionPct / 100)) - 1) * 100;
  const gananciaNominal  = capital * (tasaPct / 100);
  const gananciaReal     = capital * (tasaRealPct / 100);
  const perdidaInflacion = gananciaNominal - gananciaReal;
  return {
    tasaRealPct:      Number(tasaRealPct.toFixed(4)),
    gananciaNominal:  Math.round(gananciaNominal),
    gananciaReal:     Math.round(gananciaReal),
    perdidaInflacion: Math.round(perdidaInflacion),
  };
}

// ── VALIDADORES ───────────────────────────────────────────────────

/**
 * Valida los campos numéricos de cualquier calculadora.
 * @param {Record<string, string>} campos - { nombre: valor_string }.
 * @param {Record<string, { min?: number, max?: number, entero?: boolean }>} reglas
 * @returns {string[]} Mensajes de error.
 */
export function validarCampos(campos, reglas) {
  const errores = [];
  for (const [nombre, regla] of Object.entries(reglas)) {
    const val = Number(campos[nombre]);
    if (isNaN(val)) {
      errores.push(`"${nombre}" debe ser un número.`);
      continue;
    }
    if (regla.min !== undefined && val < regla.min) {
      errores.push(`"${nombre}" debe ser al menos ${regla.min}.`);
    }
    if (regla.max !== undefined && val > regla.max) {
      errores.push(`"${nombre}" debe ser como máximo ${regla.max}.`);
    }
    if (regla.entero && !Number.isInteger(val)) {
      errores.push(`"${nombre}" debe ser un número entero.`);
    }
  }
  return errores;
}
