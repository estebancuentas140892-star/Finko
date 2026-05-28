/**
 * infra/financiero.js - fórmulas financieras puras para Colombia.
 * Sin DOM. Sin S. Sin efectos secundarios. Testeable en Node/Vitest.
 *
 * Movido desde dominio/calculadoras/logic.js (v8.1) para que cualquier
 * dominio pueda importarlo sin violar la regla "ningún dominio importa a otro".
 *
 * Constantes legales usadas (resueltas dinámicamente vía `constants.js`):
 *   - SMMLV vigente y auxilio de transporte (Mintrabajo, anual).
 *   - Tasa de usura vigente (SFC, trimestral).
 *   - Retención en la fuente sobre rendimientos CDT: 7 % sobre rendimiento bruto.
 *   - GMF (4x1000): 0.4 % sobre movimientos financieros (informativo).
 *
 * Los valores numéricos viven en `modules/core/constants.js` - para actualizarlos
 * basta con agregar una entrada al año/trimestre nuevo allí.
 */

import {
  SMMLV,
  AUXILIO_TRANSPORTE,
  SALUD_INDEPEND,
  PENSION_INDEPEND,
  ARL_CLASE_I,
  TASA_USURA,
} from '../core/constants.js';

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

// ── PRIMA DE SERVICIOS (Colombia) ─────────────────────────────────

/**
 * Estima la prima de servicios semestral según la Ley 1788 de 2016.
 *
 * Fórmula: `prima = (salario_base + auxilio* + variables) × días / 360`
 * (*) El auxilio de transporte se suma solo si salario ≤ 2 × SMMLV vigente.
 * Máximo de días por liquidación semestral: 180.
 *
 * `variablesPromedio` permite incluir el promedio mensual de horas extras,
 * recargos y bonos habituales (no esporádicos) para mayor precisión.
 * Si se omite o es 0, el resultado equivale al caso de salario fijo puro.
 *
 * @param {number} salario            - Salario mensual base en COP.
 * @param {number} dias               - Días trabajados en el semestre (máx. 180).
 * @param {number} [variablesPromedio=0] - Promedio mensual de horas extras, recargos y bonos habituales (COP).
 * @returns {{
 *   prima: number,
 *   incluyeAuxilio: boolean,
 *   auxilioAplicado: number,
 *   salarioBase: number,
 *   variablesAplicadas: number,
 * }}
 */
export function calcularPrima(salario, dias, variablesPromedio = 0) {
  const diasEfectivos      = Math.min(dias, 180);
  const incluyeAuxilio     = salario <= 2 * SMMLV;
  const auxilioAplicado    = incluyeAuxilio ? AUXILIO_TRANSPORTE : 0;
  const salarioBase        = salario + auxilioAplicado;
  const variablesAplicadas = Math.max(0, Math.round(variablesPromedio));
  const baseTotal          = salarioBase + variablesAplicadas;
  const prima              = (baseTotal * diasEfectivos) / 360;

  return {
    prima:              Math.round(prima),
    incluyeAuxilio,
    auxilioAplicado,
    salarioBase,
    variablesAplicadas,
  };
}

// ── PILA (aportes de independientes) ──────────────────────────────

/**
 * Calcula el aporte mensual a la PILA (Planilla Integrada de Liquidación
 * de Aportes) para trabajadores independientes - Decreto 1273/2018.
 *
 * IBC = max(ingreso × 40 %, 1 SMMLV).
 * Salud:   12.5 % del IBC.
 * Pensión: 16 % del IBC.
 * ARL:     según clase de riesgo (clase I = 0.522 %).
 *
 * @param {number} ingreso  - Ingreso mensual bruto en COP.
 * @param {number} [arl]    - Tasa ARL como decimal (default: clase I).
 * @returns {{
 *   ibc: number,
 *   salud: number,
 *   pension: number,
 *   arlMonto: number,
 *   total: number,
 * } | null} `null` si ingreso ≤ 0.
 */
export function calcularPILA(ingreso, arl = ARL_CLASE_I) {
  if (ingreso <= 0) return null;
  const ibc      = Math.max(ingreso * 0.40, SMMLV);
  const salud    = ibc * SALUD_INDEPEND;
  const pension  = ibc * PENSION_INDEPEND;
  const arlMonto = ibc * arl;
  const total    = salud + pension + arlMonto;
  return {
    ibc:      Math.round(ibc),
    salud:    Math.round(salud),
    pension:  Math.round(pension),
    arlMonto: Math.round(arlMonto),
    total:    Math.round(total),
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

// ── CLASIFICADOR DE TASA DE CRÉDITO ───────────────────────────────

/**
 * Clasifica una tasa EA contra la tasa de usura vigente (SFC).
 *
 * Bandas (ratio = tasaEA / usura):
 *   - `usura`     → tasa > usura legal (ilegal).
 *   - `alta`      → 85 % ≤ ratio ≤ 100 % (cercana al tope).
 *   - `estandar`  → 65 % ≤ ratio < 85 % (típica de mercado).
 *   - `razonable` → ratio < 65 % o tasa ≤ 0.
 *
 * @param {number} taEA   - Tasa efectiva anual como decimal (ej. 0.20 = 20 %).
 * @param {number} [usura] - Usura vigente como decimal (default: `TASA_USURA` del trimestre actual).
 * @returns {'usura' | 'alta' | 'estandar' | 'razonable'}
 */
export function clasificarTasaCredito(taEA, usura = TASA_USURA) {
  if (taEA > usura) return 'usura';
  if (taEA <= 0)    return 'razonable';
  const ratio = taEA / usura;
  if (ratio < 0.65) return 'razonable';
  if (ratio < 0.85) return 'estandar';
  return 'alta';
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
