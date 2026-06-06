/**
 * ahorro/logic.js - funciones puras del dominio Ahorro (J.1).
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 *
 * El "fondo de emergencia" es el colchón de gastos fijos mensuales que la
 * persona aparta para imprevistos. Aquí calculamos objetivo, progreso y
 * meses de colchón cubiertos a partir de números primitivos: el caller
 * (ahorro/index.js) es quien lee S y calcula `gastosFijosMensuales`. Así
 * respetamos la regla ADN #10: ahorro no importa de otro dominio.
 */

// ── RANGOS PERMITIDOS ────────────────────────────────────────────

/** Mínimo razonable de meses del fondo. */
export const META_MESES_MIN = 1;

/** Máximo razonable: 12 meses ya es muy holgado, evita valores absurdos. */
export const META_MESES_MAX = 12;

/** Default sugerido al activar el fondo: 3 meses (Banco de la República, ABC). */
export const META_MESES_DEFAULT = 3;

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Objetivo del fondo en COP. Es lo que el usuario quiere tener apartado para
 * cubrir `metaMeses` de sus gastos fijos mensuales actuales.
 *
 * @param {number} gastosFijosMensuales COP que el usuario gasta en compromisos
 *                                      fijos por mes (cuotas + servicios).
 * @param {number} metaMeses            Cuántos meses cubrir.
 * @returns {number} COP del objetivo. Nunca negativo; 0 si los inputs no son válidos.
 */
export function calcularObjetivoFondo(gastosFijosMensuales, metaMeses) {
  const fijos = Number(gastosFijosMensuales);
  const meses = Number(metaMeses);
  if (!Number.isFinite(fijos) || fijos <= 0) return 0;
  if (!Number.isFinite(meses) || meses <= 0) return 0;
  return Math.round(fijos * meses);
}

/**
 * Progreso del fondo de emergencia.
 *
 * @param {number} montoActual Lo que ya tiene apartado el usuario.
 * @param {number} objetivo    Lo que necesita para cubrir su meta.
 * @returns {{ porcentaje: number, faltante: number, completado: boolean }}
 *   - porcentaje: 0-100 entero, redondeado.
 *   - faltante:   COP que falta para alcanzar el objetivo (nunca negativo).
 *   - completado: true si `montoActual >= objetivo` y objetivo > 0.
 */
export function calcularProgresoFondo(montoActual, objetivo) {
  const actual = Math.max(0, Number(montoActual) || 0);
  const meta   = Number(objetivo);
  if (!Number.isFinite(meta) || meta <= 0) {
    return { porcentaje: 0, faltante: 0, completado: false };
  }
  const porcentaje = Math.min(100, Math.round((actual / meta) * 100));
  const faltante   = Math.max(0, meta - actual);
  return { porcentaje, faltante, completado: porcentaje >= 100 };
}

/**
 * Cuántos meses de gastos fijos cubre el monto actual. Útil para mostrar al
 * usuario "tu fondo cubre X meses" en vez de solo un porcentaje.
 *
 * @param {number} montoActual           COP que ya tiene apartado.
 * @param {number} gastosFijosMensuales  COP/mes de gastos fijos.
 * @returns {number|null}
 *   - null si no se puede calcular (sin gastos fijos > 0 → ratio indefinido).
 *   - 0 o positivo, con 1 decimal (ej. 2.5 meses).
 */
export function mesesDeColchon(montoActual, gastosFijosMensuales) {
  const actual = Math.max(0, Number(montoActual) || 0);
  const fijos  = Number(gastosFijosMensuales);
  if (!Number.isFinite(fijos) || fijos <= 0) return null;
  return Math.round((actual / fijos) * 10) / 10;
}

/**
 * Tasa de ahorro mensual: qué porcentaje de los ingresos quedó libre tras
 * cubrir los gastos. Útil para el nudge "ahorrás X%" (J.1b).
 *
 * Convención: devuelve null si no se puede calcular (sin ingresos). Si los
 * gastos superan a los ingresos, retorna un porcentaje negativo (info al
 * usuario, no error).
 *
 * @param {number} ingresos COP/mes.
 * @param {number} gastos   COP/mes (egresos: gastos + cuotas).
 * @returns {number|null} porcentaje entero (0-100, puede ser negativo).
 */
export function calcularTasaAhorro(ingresos, gastos) {
  const ing = Number(ingresos);
  const gas = Number(gastos);
  if (!Number.isFinite(ing) || ing <= 0) return null;
  if (!Number.isFinite(gas)) return null;
  return Math.round(((ing - gas) / ing) * 100);
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida la meta de meses ingresada en el form de activación/edición.
 * @param {string|number} raw
 * @returns {string[]} mensajes de error (vacío = válido).
 */
export function validarMetaMeses(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return ['La meta debe ser un número de meses.'];
  }
  if (!Number.isInteger(n)) {
    return ['La meta debe ser un número entero de meses.'];
  }
  if (n < META_MESES_MIN || n > META_MESES_MAX) {
    return [`La meta debe estar entre ${META_MESES_MIN} y ${META_MESES_MAX} meses.`];
  }
  return [];
}

/**
 * Valida el monto actual del fondo (puede ser 0 al activar).
 * @param {string|number} raw
 * @returns {string[]}
 */
export function validarMontoActual(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return ['El monto debe ser un número.'];
  }
  if (n < 0) {
    return ['El monto no puede ser negativo.'];
  }
  return [];
}

// ── NORMALIZACIÓN ────────────────────────────────────────────────

/**
 * Lleva la meta a un entero dentro del rango permitido. Si el valor no es
 * válido cae al default. Usado al guardar el form (asume que pasó validación,
 * pero defiende contra clamp por si acaso).
 *
 * @param {string|number} raw
 * @returns {number}
 */
export function normalizarMetaMeses(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return META_MESES_DEFAULT;
  const entero = Math.round(n);
  if (entero < META_MESES_MIN) return META_MESES_MIN;
  if (entero > META_MESES_MAX) return META_MESES_MAX;
  return entero;
}

/**
 * Lleva el monto a un número no-negativo. Asume que pasó validación.
 * @param {string|number} raw
 * @returns {number}
 */
export function normalizarMontoActual(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}
