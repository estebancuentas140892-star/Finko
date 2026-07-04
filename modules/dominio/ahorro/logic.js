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

import { f } from '../../infra/utils.js';

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

// ── CONSOLIDADO DE AHORRO (F6) ───────────────────────────────────

/**
 * Consolida en una sola vista cuánto tiene el usuario guardado a través de los
 * cuatro vehículos que Finko ya rastrea: fondo de emergencia, metas, apartados
 * e inversiones. Función pura: recibe los totales ya sumados (el caller los lee
 * de S sin que este dominio importe a otro, regla ADN #10).
 *
 * @param {{ fondo?: number, metas?: number, apartados?: number, inversiones?: number }} [montos]
 * @returns {{
 *   total: number,
 *   desglose: Array<{ clave: string, label: string, monto: number, pct: number }>,
 * }}
 *   - desglose excluye los vehículos en 0 y se ordena de mayor a menor monto.
 *   - pct es la participación de cada vehículo en el total (entero 0-100).
 */
export function consolidarAhorro({ fondo = 0, metas = 0, apartados = 0, inversiones = 0 } = {}) {
  const items = [
    { clave: 'fondo',       label: 'Fondo de emergencia', monto: Math.max(0, Number(fondo)       || 0) },
    { clave: 'metas',       label: 'Metas',               monto: Math.max(0, Number(metas)       || 0) },
    { clave: 'apartados',   label: 'Apartados',           monto: Math.max(0, Number(apartados)   || 0) },
    { clave: 'inversiones', label: 'Inversiones',         monto: Math.max(0, Number(inversiones) || 0) },
  ];
  const total = items.reduce((sum, i) => sum + i.monto, 0);
  const desglose = items
    .filter(i => i.monto > 0)
    .map(i => ({ ...i, pct: total > 0 ? Math.round((i.monto / total) * 100) : 0 }))
    .sort((a, b) => b.monto - a.monto);
  return { total, desglose };
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

// ── APORTES (J.1b) ───────────────────────────────────────────────

/**
 * Suma los montos de todos los aportes registrados en el historial.
 *
 * @param {Array<{monto: number}>} aportes
 * @returns {number} Total en COP. 0 si el array está vacío o no es válido.
 */
export function calcularTotalAportes(aportes) {
  if (!Array.isArray(aportes)) return 0;
  return aportes.reduce((sum, a) => sum + (Number(a.monto) || 0), 0);
}

/**
 * Monto total visible del fondo: el balance de apertura declarado al activarlo
 * más la suma de todos los aportes registrados en el historial.
 *
 * @param {number} montoBase  `fondoEmergencia.montoActual` (valor al activar/editar).
 * @param {Array}  aportes    `S.ahorro.aportes`.
 * @returns {number}
 */
export function calcularMontoTotalFondo(montoBase, aportes) {
  return Math.max(0, Number(montoBase) || 0) + calcularTotalAportes(aportes);
}

/**
 * Devuelve los aportes ordenados por fecha descendente (más reciente primero).
 * No muta el array original.
 *
 * @param {Array<{fecha: string}>} aportes
 * @returns {Array}
 */
export function ordenarAportesPorFecha(aportes) {
  if (!Array.isArray(aportes)) return [];
  return [...aportes].sort((a, b) => {
    if (b.fecha > a.fecha) return 1;
    if (b.fecha < a.fecha) return -1;
    return 0;
  });
}

/**
 * Valida el monto de un aporte. Debe ser mayor que cero (a diferencia de
 * `validarMontoActual`, que acepta 0 como saldo inicial).
 *
 * @param {string|number} raw
 * @returns {string[]} Mensajes de error (vacío = válido).
 */
export function validarMontoAporte(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return ['El monto debe ser un número.'];
  if (n <= 0)              return ['El monto del aporte debe ser mayor que cero.'];
  return [];
}

/**
 * Valida una fecha de aporte (formato YYYY-MM-DD, no vacía).
 *
 * @param {string} raw
 * @returns {string[]}
 */
export function validarFechaAporte(raw) {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return ['La fecha es requerida.'];
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return ['El formato de fecha no es válido (se esperaba YYYY-MM-DD).'];
  }
  return [];
}

/**
 * Normaliza el monto de un aporte a entero positivo.
 * Si el valor no es válido o no es positivo devuelve 0.
 *
 * @param {string|number} raw
 * @returns {number}
 */
export function normalizarMontoAporte(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

// ── APORTE SUGERIDO AL FONDO (AH.2) ──────────────────────────────

// Constantes replicadas del motor de distribución de Mis cuentas (ADR 013,
// MC.6a/MC.10) para que la sugerencia del fondo y la de "Distribuir mi
// ingreso" nunca se contradigan. Se replican en vez de importarse porque
// ningún dominio importa a otro (regla ADN #10).
const _PISO_EV_PCT     = 10;  // % mínimo de estilo de vida (sostenibilidad)
const _PISO_AHORRO_PCT = 5;   // % mínimo de ahorro cuando el margen es corto

/** Meses del horizonte para cerrar el fondo incompleto (ADR 013). */
export const HORIZONTE_FONDO_MESES = 12;

/**
 * Aporte mensual sugerido al fondo de emergencia, con explicación (AH.2).
 *
 * Construye la sugerencia con los datos reales del usuario en vez de un
 * número sin contexto. Sigue el mismo modelo de pisos del motor de
 * distribución (ADR 013): cerrar el fondo en 12 meses si el margen alcanza;
 * si no, sugerir lo que el margen permite tras reservar un mínimo de estilo
 * de vida (10%) y el aporte a otras metas con fecha; con margen muy corto,
 * la parte proporcional del piso de ahorro (5 de 15); sin margen, cero y
 * la verdad (mismo espíritu que MC.11: no inventar recomendaciones).
 *
 * @param {{
 *   faltanteFondo?:          number,  // COP que faltan para el objetivo
 *   ingresosMensuales?:      number,  // COP/mes. 0 o ausente = sin datos.
 *   gastosFijosMensuales?:   number,  // COP/mes de fijos activos.
 *   cuotasDeudaMensuales?:   number,  // COP/mes de cuotas de deuda activas.
 *   aporteMensualObjetivos?: number,  // COP/mes que piden metas/apartados con fecha.
 * }} [ctx]
 * @returns {{
 *   monto: number,
 *   base: 'completo'|'meta'|'capacidad'|'piso'|'deficit'|'sin-ingreso',
 *   meses: number|null,   // meses estimados para completar el fondo a ese ritmo
 *   razones: string[],    // explicación en lenguaje humano (1-3 frases)
 * }}
 */
export function calcularAporteSugerido({
  faltanteFondo          = 0,
  ingresosMensuales      = 0,
  gastosFijosMensuales   = 0,
  cuotasDeudaMensuales   = 0,
  aporteMensualObjetivos = 0,
} = {}) {
  const faltante = Math.max(0, Number(faltanteFondo) || 0);
  if (faltante <= 0) {
    return {
      monto: 0, base: 'completo', meses: 0,
      razones: ['Tu fondo ya está completo. Cualquier aporte extra suma colchón.'],
    };
  }

  const ritmoMeta = _redondearMiles(faltante / HORIZONTE_FONDO_MESES);

  const ingreso = Math.max(0, Number(ingresosMensuales) || 0);
  if (ingreso <= 0) {
    return {
      monto: ritmoMeta, base: 'sin-ingreso', meses: HORIZONTE_FONDO_MESES,
      razones: [
        `Te faltan ${f(faltante)}: con ${f(ritmoMeta)} al mes completas tu fondo en unos ${HORIZONTE_FONDO_MESES} meses.`,
        'La sugerencia aún no considera tu capacidad real. Cuéntale a Finko cuánto recibes al mes para afinarla.',
      ],
    };
  }

  const fijos     = Math.max(0, Number(gastosFijosMensuales)   || 0);
  const cuotas    = Math.max(0, Number(cuotasDeudaMensuales)   || 0);
  const objetivos = Math.max(0, Number(aporteMensualObjetivos) || 0);
  const margen    = ingreso - fijos - cuotas;

  if (margen <= 0) {
    return {
      monto: 0, base: 'deficit', meses: null,
      razones: [
        `Tus gastos fijos (${f(fijos)}) y cuotas de deuda (${f(cuotas)}) igualan o superan tu ingreso mensual (${f(ingreso)}).`,
        'Antes de comprometer un aporte, revisa tus gastos en Análisis o ajusta tus fijos en Calendario. El fondo puede esperar; las obligaciones no.',
      ],
    };
  }

  const pisoEV     = ingreso * _PISO_EV_PCT / 100;
  const pisoAhorro = ingreso * _PISO_AHORRO_PCT / 100;
  // Capacidad real para el fondo: margen menos un mínimo de estilo de vida
  // y menos lo que ya piden tus otras metas con fecha.
  const capacidad = margen - pisoEV - objetivos;

  const notaObjetivos = objetivos > 0
    ? ` y el aporte a tus otras metas con fecha (${f(objetivos)})`
    : '';

  if (capacidad >= ritmoMeta) {
    return {
      monto: ritmoMeta, base: 'meta',
      meses: Math.ceil(faltante / ritmoMeta),
      razones: [
        `Te faltan ${f(faltante)}: con ${f(ritmoMeta)} al mes completas tu fondo en unos ${HORIZONTE_FONDO_MESES} meses.`,
        `Te alcanza: tu ingreso (${f(ingreso)}) menos gastos fijos (${f(fijos)})` +
          `${cuotas > 0 ? `, cuotas de deuda (${f(cuotas)})` : ''}${notaObjetivos}` +
          ` deja margen suficiente sin apretar tu estilo de vida.`,
      ],
    };
  }

  if (capacidad >= pisoAhorro) {
    const monto = _redondearMiles(capacidad);
    const meses = Math.ceil(faltante / monto);
    return {
      monto, base: 'capacidad', meses,
      razones: [
        `Para cerrar el fondo en ${HORIZONTE_FONDO_MESES} meses necesitarías ${f(ritmoMeta)}, pero tu margen real da para ${f(monto)} al mes.`,
        `Es tu ingreso (${f(ingreso)}) menos gastos fijos (${f(fijos)})` +
          `${cuotas > 0 ? `, cuotas de deuda (${f(cuotas)})` : ''}${notaObjetivos}` +
          ` y un mínimo para tu estilo de vida.`,
        _fraseRitmo(meses),
      ],
    };
  }

  // Margen corto: parte proporcional del piso de ahorro (5 de 15), igual que
  // el reparto proporcional de pisos de MC.10.
  const montoPiso = _redondearMiles(margen * _PISO_AHORRO_PCT / (_PISO_EV_PCT + _PISO_AHORRO_PCT));
  const meses     = Math.ceil(faltante / montoPiso);
  return {
    monto: montoPiso, base: 'piso', meses,
    razones: [
      `Tu margen está apretado: tras gastos fijos y cuotas te quedan ${f(margen)} al mes.`,
      `Empieza con ${f(montoPiso)} para no frenar el hábito. Cuando tu margen mejore, la sugerencia sube sola.`,
    ],
  };
}

/**
 * Redondea hacia arriba a miles de COP, con mínimo de $1.000.
 * @param {number} x
 * @returns {number}
 */
function _redondearMiles(x) {
  const n = Number(x);
  if (!Number.isFinite(n) || n <= 0) return 1000;
  return Math.max(1000, Math.ceil(n / 1000) * 1000);
}

/**
 * Frase del ritmo estimado. Con más de 36 meses no promete plazos: invita a
 * revisar gastos en su lugar.
 * @param {number} meses
 * @returns {string}
 */
function _fraseRitmo(meses) {
  if (meses > 36) {
    return 'A ese ritmo el fondo tardaría más de 3 años. Si puedes recortar algo de estilo de vida, el plazo baja rápido.';
  }
  return `A ese ritmo completas el fondo en unos ${meses} meses.`;
}

// ── COMPROMISO MENSUAL ("págate primero", J.1b) ──────────────────

/**
 * Valida el monto del compromiso mensual de ahorro.
 * Acepta 0 (= sin compromiso). No acepta negativos.
 *
 * @param {string|number} raw
 * @returns {string[]}
 */
export function validarCompromisoMensual(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return ['El monto debe ser un número.'];
  if (n < 0)               return ['El monto no puede ser negativo.'];
  return [];
}

/**
 * Normaliza el compromiso mensual a entero no-negativo.
 *
 * @param {string|number} raw
 * @returns {number}
 */
export function normalizarCompromisoMensual(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}
