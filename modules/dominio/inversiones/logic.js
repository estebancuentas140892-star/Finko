/**
 * inversiones/logic.js - funciones puras del dominio Inversión (J.2).
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 *
 * Registra inversiones reales del usuario (CDT, fondos, acciones, cripto) con
 * monto, tasa EA estimada, plazo y fecha de inicio. En J.2a solo se usa el
 * `monto` para el total invertido; la tasa y el plazo se capturan para que
 * J.2b proyecte el valor al vencimiento sin pedir datos de nuevo.
 *
 * Respeta la regla ADN #10: recibe primitivos/arrays, no importa de otro dominio.
 */

// ── TIPOS DE INVERSIÓN ───────────────────────────────────────────

/**
 * Tipos soportados. El orden define el del selector en el formulario.
 * 'Otro' cubre cualquier vehículo no listado (bonos, finca raíz, etc.).
 */
export const TIPOS_INVERSION = ['CDT', 'Fondo', 'Acciones', 'Cripto', 'Otro'];

/** Tasa EA máxima razonable para un campo de entrada (%). Evita valores absurdos. */
export const TASA_EA_MAX = 100;

/** Plazo máximo razonable en meses (50 años). Evita valores absurdos. */
export const PLAZO_MESES_MAX = 600;

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Suma el monto invertido de todas las inversiones registradas.
 *
 * @param {Array<{monto:number}>} inversiones
 * @returns {number} COP. Nunca negativo; 0 si el input no es válido o está vacío.
 */
export function calcularTotalInvertido(inversiones) {
  if (!Array.isArray(inversiones)) return 0;
  return inversiones.reduce((sum, inv) => {
    const m = Number(inv?.monto);
    return sum + (Number.isFinite(m) && m > 0 ? m : 0);
  }, 0);
}

/**
 * Agrupa el monto invertido por tipo, para un futuro desglose del portafolio.
 * Devuelve solo los tipos con monto > 0, ordenados de mayor a menor.
 *
 * @param {Array<{tipo:string, monto:number}>} inversiones
 * @returns {Array<{tipo:string, total:number, pct:number}>}
 */
export function calcularPorTipo(inversiones) {
  if (!Array.isArray(inversiones)) return [];
  const acc = Object.create(null);
  let total = 0;
  for (const inv of inversiones) {
    const m = Number(inv?.monto);
    if (!Number.isFinite(m) || m <= 0) continue;
    const tipo = typeof inv?.tipo === 'string' && inv.tipo ? inv.tipo : 'Otro';
    acc[tipo] = (acc[tipo] || 0) + m;
    total += m;
  }
  if (total <= 0) return [];
  return Object.entries(acc)
    .map(([tipo, t]) => ({ tipo, total: t, pct: Math.round((t / total) * 100) }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Ordena las inversiones de mayor a menor monto (posición más grande primero).
 * No muta el array original.
 *
 * @param {Array<{monto:number}>} inversiones
 * @returns {Array} copia ordenada.
 */
export function ordenarInversionesPorMonto(inversiones) {
  if (!Array.isArray(inversiones)) return [];
  return [...inversiones].sort((a, b) => (Number(b?.monto) || 0) - (Number(a?.monto) || 0));
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida el tipo de inversión contra TIPOS_INVERSION.
 * @param {string} raw
 * @returns {string[]} mensajes de error (vacío = válido).
 */
export function validarTipoInversion(raw) {
  if (typeof raw !== 'string' || !TIPOS_INVERSION.includes(raw)) {
    return ['Selecciona un tipo de inversión válido.'];
  }
  return [];
}

/**
 * Valida el nombre de la inversión (no vacío, hasta 60 caracteres).
 * @param {string} raw
 * @returns {string[]}
 */
export function validarNombreInversion(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return ['El nombre es requerido.'];
  }
  if (raw.trim().length > 60) {
    return ['El nombre no puede superar los 60 caracteres.'];
  }
  return [];
}

/**
 * Valida el monto invertido (número > 0).
 * @param {string|number} raw
 * @returns {string[]}
 */
export function validarMontoInversion(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return ['El monto debe ser un número.'];
  if (n <= 0)              return ['El monto invertido debe ser mayor que cero.'];
  return [];
}

/**
 * Valida la tasa EA estimada (%). Es opcional: 0 es válido (rentabilidad
 * variable, como acciones o cripto). Rango 0 a TASA_EA_MAX.
 * @param {string|number} raw
 * @returns {string[]}
 */
export function validarTasaEAInversion(raw) {
  if (raw === '' || raw == null) return []; // opcional: vacío = 0
  const n = Number(raw);
  if (!Number.isFinite(n))       return ['La tasa debe ser un número.'];
  if (n < 0)                     return ['La tasa no puede ser negativa.'];
  if (n > TASA_EA_MAX)           return [`La tasa no puede superar ${TASA_EA_MAX}%.`];
  return [];
}

/**
 * Valida el plazo en meses. Opcional: 0 = sin plazo fijo (acciones, cripto).
 * Debe ser entero entre 0 y PLAZO_MESES_MAX.
 * @param {string|number} raw
 * @returns {string[]}
 */
export function validarPlazoMeses(raw) {
  if (raw === '' || raw == null) return []; // opcional: vacío = 0
  const n = Number(raw);
  if (!Number.isFinite(n))         return ['El plazo debe ser un número.'];
  if (!Number.isInteger(n))        return ['El plazo debe ser un número entero de meses.'];
  if (n < 0)                       return ['El plazo no puede ser negativo.'];
  if (n > PLAZO_MESES_MAX)         return [`El plazo no puede superar ${PLAZO_MESES_MAX} meses.`];
  return [];
}

/**
 * Valida la fecha de inicio (formato YYYY-MM-DD requerido).
 * @param {string} raw
 * @returns {string[]}
 */
export function validarFechaInicio(raw) {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return ['La fecha de inicio es requerida.'];
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return ['El formato de fecha no es válido (se esperaba YYYY-MM-DD).'];
  }
  return [];
}

/**
 * Valida todos los campos del formulario de inversión de una sola pasada.
 * @param {{tipo:string, nombre:string, monto:string|number,
 *          tasaEA:string|number, plazoMeses:string|number, fechaInicio:string}} datos
 * @returns {string[]} todos los errores acumulados (vacío = válido).
 */
export function validarInversion(datos) {
  const d = datos ?? {};
  return [
    ...validarTipoInversion(d.tipo),
    ...validarNombreInversion(d.nombre),
    ...validarMontoInversion(d.monto),
    ...validarTasaEAInversion(d.tasaEA),
    ...validarPlazoMeses(d.plazoMeses),
    ...validarFechaInicio(d.fechaInicio),
  ];
}

// ── NORMALIZACIÓN ────────────────────────────────────────────────

/** Redondea el monto a entero COP; 0 si no es válido. */
export function normalizarMontoInversion(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

/** Tasa EA con 2 decimales, acotada a [0, TASA_EA_MAX]; 0 si vacío o inválido. */
export function normalizarTasaEAInversion(raw) {
  if (raw === '' || raw == null) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(Math.min(n, TASA_EA_MAX) * 100) / 100;
}

/** Plazo entero >= 0; 0 si vacío o inválido. */
export function normalizarPlazoMeses(raw) {
  if (raw === '' || raw == null) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), PLAZO_MESES_MAX);
}

/**
 * Construye un objeto inversión normalizado a partir de los datos crudos del
 * formulario. No asigna `id` ni `fechaCreacion`: eso lo hace crud.guardar().
 *
 * @param {{tipo:string, nombre:string, monto:string|number,
 *          tasaEA:string|number, plazoMeses:string|number, fechaInicio:string}} datos
 * @returns {{tipo:string, nombre:string, monto:number, tasaEA:number,
 *           plazoMeses:number, fechaInicio:string}}
 */
export function normalizarInversion(datos) {
  const d = datos ?? {};
  return {
    tipo:        TIPOS_INVERSION.includes(d.tipo) ? d.tipo : 'Otro',
    nombre:      String(d.nombre ?? '').trim(),
    monto:       normalizarMontoInversion(d.monto),
    tasaEA:      normalizarTasaEAInversion(d.tasaEA),
    plazoMeses:  normalizarPlazoMeses(d.plazoMeses),
    fechaInicio: String(d.fechaInicio ?? '').trim(),
  };
}
