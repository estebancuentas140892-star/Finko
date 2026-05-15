/**
 * metas/logic.js — funciones puras del dominio de metas de ahorro.
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 */

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra metas que aún no están completadas.
 * @param {import('../../core/state.js').Meta[]} metas
 */
export function metasActivas(metas) {
  return metas.filter(m => m.completada !== true);
}

/**
 * Calcula el progreso de una meta de ahorro.
 * @param {import('../../core/state.js').Meta} meta
 * @returns {{ porcentaje: number, faltante: number, completada: boolean }}
 */
export function calcularProgreso(meta) {
  const objetivo = meta.montoObjetivo ?? 0;
  const actual   = meta.montoActual   ?? 0;

  if (objetivo <= 0) {
    return { porcentaje: 0, faltante: 0, completada: false };
  }

  const porcentaje = Math.min(100, Math.round((actual / objetivo) * 100));
  const faltante   = Math.max(0, objetivo - actual);

  return { porcentaje, faltante, completada: porcentaje >= 100 };
}

/**
 * Número de días calendario entre hoy y `fechaLimite`.
 * Devuelve `null` si no hay fecha límite.
 * Un valor ≤ 0 significa que el plazo ya venció.
 *
 * @param {string|null|undefined} fechaLimite — YYYY-MM-DD.
 * @returns {number|null}
 */
export function diasHastaFecha(fechaLimite) {
  if (!fechaLimite) return null;
  const hoy   = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(fechaLimite + 'T00:00:00');
  return Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24));
}

/**
 * Cuánto hay que ahorrar por día para alcanzar la meta antes del límite.
 * Devuelve `null` si no hay fecha límite o el plazo ya venció.
 * Devuelve `0` si la meta ya está cubierta.
 *
 * @param {import('../../core/state.js').Meta} meta
 * @returns {number|null}
 */
export function calcularAhorroDiario(meta) {
  const { faltante } = calcularProgreso(meta);
  if (faltante <= 0) return 0;
  const dias = diasHastaFecha(meta.fechaLimite);
  if (dias === null || dias <= 0) return null;
  return Math.ceil(faltante / dias);
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida los datos del formulario de meta.
 * @param {Record<string, string>} datos
 * @returns {string[]} Mensajes de error (vacío = válido).
 */
export function validarMeta(datos) {
  const errores = [];

  if (!datos.nombre?.trim()) {
    errores.push('El nombre de la meta es obligatorio.');
  }
  const objetivo = Number(datos.montoObjetivo);
  if (isNaN(objetivo) || objetivo <= 0) {
    errores.push('El monto objetivo debe ser un número mayor a 0.');
  }

  return errores;
}

/**
 * Valida el monto de un abono a una meta existente.
 * @param {string|number} monto
 * @returns {string[]}
 */
export function validarAbono(monto) {
  const n = Number(monto);
  if (isNaN(n) || n <= 0) {
    return ['El abono debe ser un número mayor a 0.'];
  }
  return [];
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte datos crudos del formulario al shape de S.metas.
 * Asume que los datos ya pasaron `validarMeta()`.
 * @param {Record<string, string>} datos
 */
export function normalizarMeta(datos) {
  return {
    nombre:        datos.nombre.trim(),
    montoObjetivo: Number(datos.montoObjetivo),
    montoActual:   0,
    fechaLimite:   datos.fechaLimite?.trim() || null,
    icono:         datos.icono?.trim()        || '🎯',
    completada:    false,
  };
}
