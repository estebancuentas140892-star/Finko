/**
 * ingresos/logic.js - funciones puras del dominio de ingresos.
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 */

import { FRECUENCIAS } from '../../core/constants.js';

// ── FACTORES DE CONVERSIÓN A MENSUAL ─────────────────────────────

/**
 * Cuántas veces ocurre cada frecuencia en un mes calendario promedio.
 * 'Única vez' = 0 (no aporta a la proyección mensual recurrente).
 */
const FACTOR_MENSUAL = {
  'Diario':      30,
  'Semanal':     4.33,
  'Quincenal':   2,
  'Mensual':     1,
  'Bimestral':   0.5,
  'Trimestral':  1 / 3,
  'Semestral':   1 / 6,
  'Anual':       1 / 12,
  'Única vez':   0,
};

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra ingresos con `activo !== false`.
 * @param {import('../../core/state.js').Ingreso[]} ingresos
 */
export function ingresosActivos(ingresos) {
  return ingresos.filter(i => i.activo !== false);
}

/**
 * Proyecta el monto de un ingreso en términos mensuales.
 * @param {import('../../core/state.js').Ingreso} ingreso
 * @returns {number} COP / mes equivalente.
 */
export function calcularIngresoMensual(ingreso) {
  const factor = FACTOR_MENSUAL[ingreso.frecuencia] ?? 0;
  return (ingreso.monto ?? 0) * factor;
}

/**
 * Suma la proyección mensual de todos los ingresos activos.
 * @param {import('../../core/state.js').Ingreso[]} ingresos
 * @returns {number} Total mensual en COP.
 */
export function calcularTotalMensual(ingresos) {
  return ingresosActivos(ingresos)
    .reduce((acc, i) => acc + calcularIngresoMensual(i), 0);
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida los datos del formulario de ingreso.
 * @param {Record<string, string>} datos
 * @returns {string[]} Array de mensajes de error (vacío = válido).
 */
export function validarIngreso(datos) {
  const errores = [];

  if (!datos.descripcion?.trim()) {
    errores.push('La descripción del ingreso es obligatoria.');
  }
  const monto = Number(datos.monto);
  if (isNaN(monto) || monto <= 0) {
    errores.push('El monto debe ser un número mayor a 0.');
  }
  if (!datos.frecuencia || !FRECUENCIAS.includes(datos.frecuencia)) {
    errores.push('Debés elegir la frecuencia del ingreso.');
  }

  return errores;
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte datos crudos del formulario al shape de S.ingresos.
 * Asume que los datos ya pasaron `validarIngreso()`.
 * @param {Record<string, string>} datos
 */
export function normalizarIngreso(datos) {
  return {
    descripcion: datos.descripcion.trim(),
    monto: Number(datos.monto),
    frecuencia: datos.frecuencia,
    activo: true,
  };
}
