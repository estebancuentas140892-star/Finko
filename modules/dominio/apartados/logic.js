/**
 * apartados/logic.js - funciones puras del dominio de apartados.
 *
 * Un "apartado" es un sobre donde el usuario reúne dinero, poco a poco, para un
 * gasto previsible (SOAT, impuestos, productos personales, vacaciones). A
 * diferencia de una Meta (un objetivo único como un viaje), el apartado existe
 * para prepararse ante gastos que de otro modo llegarían como una emergencia.
 *
 * El valor central es `calcularAporteSugerido`: dado el faltante, la fecha en
 * que se necesita y cada cuánto cobra el usuario, dice cuánto separar por
 * periodo ("aparta $30.000 por quincena").
 *
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 */

// ── CONSTANTES ───────────────────────────────────────────────────

/**
 * Frecuencias de aporte soportadas, alineadas a la frecuencia con la que el
 * usuario recibe ingresos. Subconjunto de FRECUENCIAS (core/constants.js): solo
 * las que tienen sentido como "cada cuánto aparto" para un gasto cercano.
 */
export const FRECUENCIAS_APORTE = ['Diario', 'Semanal', 'Quincenal', 'Mensual'];

/** Días calendario que dura cada periodo de aporte (promedio). */
const DIAS_POR_PERIODO = {
  Diario:    1,
  Semanal:   7,
  Quincenal: 15,
  Mensual:   30,
};

/**
 * Plantillas de gastos previsibles frecuentes en Colombia, para que el usuario
 * cree un apartado de un toque sin escribir el nombre. El fondo de emergencia
 * se omite a propósito: ya vive en el dominio Ahorro.
 */
export const PLANTILLAS_APARTADO = [
  { nombre: 'SOAT',                     icono: '🚗' },
  { nombre: 'Impuestos',               icono: '🧾' },
  { nombre: 'Mantenimiento del vehículo', icono: '🔧' },
  { nombre: 'Arriendo',                 icono: '🏠' },
  { nombre: 'Mercado',                  icono: '🛒' },
  { nombre: 'Productos personales',     icono: '🧴' },
  { nombre: 'Útiles escolares',         icono: '📚' },
  { nombre: 'Regalos',                  icono: '🎁' },
  { nombre: 'Vacaciones',               icono: '✈️' },
];

/** Icono por defecto cuando el usuario no elige uno. */
export const ICONO_APARTADO_DEFAULT = '📦';

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra apartados que aún no están completados.
 * @param {import('../../core/state.js').Apartado[]} apartados
 */
export function apartadosActivos(apartados) {
  return (apartados ?? []).filter(a => a.completado !== true);
}

/**
 * Calcula el progreso de un apartado.
 * @param {import('../../core/state.js').Apartado} apartado
 * @returns {{ porcentaje: number, faltante: number, completado: boolean }}
 */
export function calcularProgreso(apartado) {
  const objetivo = Number(apartado?.montoObjetivo) || 0;
  const actual   = Number(apartado?.montoActual)   || 0;

  if (objetivo <= 0) {
    return { porcentaje: 0, faltante: 0, completado: false };
  }

  const porcentaje = Math.min(100, Math.round((actual / objetivo) * 100));
  const faltante   = Math.max(0, objetivo - actual);

  return { porcentaje, faltante, completado: porcentaje >= 100 };
}

/**
 * Días calendario entre `hoyISO` y `fechaObjetivo`.
 * Devuelve `null` si no hay fecha objetivo o el formato es inválido.
 * Un valor <= 0 significa que la fecha ya pasó.
 *
 * `hoyISO` se inyecta para que el cálculo sea determinista en tests.
 *
 * @param {string|null|undefined} fechaObjetivo - YYYY-MM-DD.
 * @param {string} hoyISO - YYYY-MM-DD (día de referencia).
 * @returns {number|null}
 */
export function diasHastaFecha(fechaObjetivo, hoyISO) {
  if (!fechaObjetivo || !/^\d{4}-\d{2}-\d{2}$/.test(fechaObjetivo)) return null;
  if (!hoyISO || !/^\d{4}-\d{2}-\d{2}$/.test(hoyISO)) return null;
  const objetivo = new Date(fechaObjetivo + 'T00:00:00');
  const hoy      = new Date(hoyISO + 'T00:00:00');
  if (isNaN(objetivo) || isNaN(hoy)) return null;
  return Math.round((objetivo - hoy) / (1000 * 60 * 60 * 24));
}

/**
 * Calcula cuánto debería apartar el usuario por periodo para reunir el faltante
 * antes de la fecha objetivo, según su frecuencia de aporte.
 *
 * Devuelve `null` cuando no hay nada que sugerir:
 *   - el apartado ya está completo (faltante <= 0), o
 *   - no hay fecha objetivo (sin plazo no hay ritmo), o
 *   - la fecha ya pasó (dias <= 0).
 *
 * @param {import('../../core/state.js').Apartado} apartado
 * @param {string} hoyISO - YYYY-MM-DD (día de referencia, inyectable).
 * @returns {{
 *   aportePorPeriodo: number,
 *   numPeriodos: number,
 *   frecuencia: string,
 *   etiquetaPeriodo: string,
 *   dias: number,
 * } | null}
 */
export function calcularAporteSugerido(apartado, hoyISO) {
  const { faltante } = calcularProgreso(apartado);
  if (faltante <= 0) return null;

  const dias = diasHastaFecha(apartado?.fechaObjetivo, hoyISO);
  if (dias === null || dias <= 0) return null;

  const frecuencia = FRECUENCIAS_APORTE.includes(apartado?.frecuenciaAporte)
    ? apartado.frecuenciaAporte
    : 'Mensual';
  const diasPorPeriodo = DIAS_POR_PERIODO[frecuencia];

  const numPeriodos      = Math.max(1, Math.ceil(dias / diasPorPeriodo));
  const aportePorPeriodo = Math.ceil(faltante / numPeriodos);

  return {
    aportePorPeriodo,
    numPeriodos,
    frecuencia,
    etiquetaPeriodo: etiquetaPeriodo(frecuencia),
    dias,
  };
}

/**
 * Etiqueta legible del periodo de aporte para usar en mensajes.
 * @param {string} frecuencia - una de FRECUENCIAS_APORTE.
 * @returns {string} ej. "por quincena", "al mes".
 */
export function etiquetaPeriodo(frecuencia) {
  switch (frecuencia) {
    case 'Diario':    return 'por día';
    case 'Semanal':   return 'por semana';
    case 'Quincenal': return 'por quincena';
    case 'Mensual':   return 'al mes';
    default:          return 'al mes';
  }
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida los datos del formulario de apartado.
 * @param {Record<string, string>} datos
 * @returns {string[]} Mensajes de error (vacío = válido).
 */
export function validarApartado(datos) {
  const errores = [];

  if (!datos?.nombre?.trim()) {
    errores.push('El nombre del apartado es obligatorio.');
  }

  const objetivo = Number(datos?.montoObjetivo);
  if (!Number.isFinite(objetivo) || objetivo <= 0) {
    errores.push('El monto objetivo debe ser un número mayor a 0.');
  }

  // Fecha objetivo es opcional. Si viene, debe tener formato válido.
  if (datos?.fechaObjetivo?.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaObjetivo.trim())) {
    errores.push('La fecha objetivo debe estar en formato YYYY-MM-DD.');
  }

  // Frecuencia es opcional (default Mensual); si viene, debe ser válida.
  if (datos?.frecuenciaAporte && !FRECUENCIAS_APORTE.includes(datos.frecuenciaAporte)) {
    errores.push('La frecuencia de aporte no es válida.');
  }

  return errores;
}

/**
 * Valida el monto de un aporte a un apartado existente.
 * @param {string|number} monto
 * @returns {string[]}
 */
export function validarAbonoApartado(monto) {
  const n = Number(monto);
  if (!Number.isFinite(n) || n <= 0) {
    return ['El aporte debe ser un número mayor a 0.'];
  }
  return [];
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte datos crudos del formulario al shape de S.apartados.
 * Asume que los datos ya pasaron `validarApartado()`.
 * @param {Record<string, string>} datos
 */
export function normalizarApartado(datos) {
  const frecuencia = FRECUENCIAS_APORTE.includes(datos.frecuenciaAporte)
    ? datos.frecuenciaAporte
    : 'Mensual';

  return {
    nombre:           datos.nombre.trim(),
    icono:            datos.icono?.trim() || ICONO_APARTADO_DEFAULT,
    montoObjetivo:    Number(datos.montoObjetivo),
    montoActual:      0,
    fechaObjetivo:    datos.fechaObjetivo?.trim() || null,
    frecuenciaAporte: frecuencia,
    completado:       false,
  };
}
