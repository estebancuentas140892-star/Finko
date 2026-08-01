/**
 * metas/logic.js - funciones puras del dominio de metas de ahorro.
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 *
 * El ritmo de ahorro (cada cuánto cobra el usuario y cuánto le toca por
 * período) ya no vive aquí: es del motor compartido `infra/vencimientos.js`
 * (MC.13b, ADR 041). Antes estaba duplicado carácter por carácter en
 * `apartados/logic.js`, porque ADN #10 impide que un dominio importe a otro;
 * la copia única vive en infra, que sí pueden importar los dos.
 */

import {
  FRECUENCIAS_APORTE,
  aportePorPeriodo,
  etiquetaPeriodo,
  frecuenciaPrincipalIngresos,
} from '../../infra/vencimientos.js';
import { hoy } from '../../infra/utils.js';

// ── RITMO DE AHORRO (MT.4, motor compartido desde MC.13b) ─────────

/**
 * Frecuencias con sentido como "cada cuánto ahorro para esta meta", alineadas
 * a la frecuencia con la que el usuario recibe ingresos. Nombre propio del
 * dominio para la lista única del motor.
 */
export const FRECUENCIAS_AHORRO = FRECUENCIAS_APORTE;

export { frecuenciaPrincipalIngresos };

/**
 * Etiqueta legible del periodo de ahorro para usar en la lista de metas.
 * @param {string} frecuencia - una de FRECUENCIAS_AHORRO.
 * @returns {string} ej. "por quincena", "al mes".
 */
export const etiquetaPeriodoAhorro = etiquetaPeriodo;

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra metas que aún no están completadas.
 * @param {import('../../core/state.js').Meta[]} metas
 */
export function metasActivas(metas) {
  return metas.filter(m => m.completada !== true);
}

/**
 * Filtra las metas ya cumplidas, hermana de `metasActivas()` (DIS.13, MT.d).
 * Hasta esta auditoría una meta cumplida salía de la lista y no había ninguna
 * otra pantalla donde verla: no se podía revisar, ni editar, ni eliminar,
 * porque el DOM de la fila ni se pintaba. El corte de las dos funciones es el
 * mismo campo (`completada`), así que ninguna meta puede caer en las dos ni
 * quedarse fuera de ambas.
 * @param {import('../../core/state.js').Meta[]} metas
 */
export function metasCumplidas(metas) {
  return metas.filter(m => m.completada === true);
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
 * @param {string|null|undefined} fechaLimite - YYYY-MM-DD.
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
 * Calcula cuánto ahorrar por periodo (según la frecuencia de ingreso del
 * usuario) para alcanzar la meta antes de la fecha límite. Reemplaza el
 * antiguo "$X por día" fijo (MT.4): reparte el faltante entre los periodos
 * de la frecuencia real con la que el usuario cobra, no entre días sueltos.
 *
 * Envoltorio del motor (`aportePorPeriodo`, MC.13b) con el vocabulario de este
 * dominio: aporta el faltante de la meta y su fecha límite, y devuelve el
 * resultado con los nombres que ya usa la vista.
 *
 * Devuelve `null` cuando no hay nada que sugerir:
 *   - la meta ya está cubierta (faltante <= 0), o
 *   - no hay fecha límite (sin plazo no hay ritmo), o
 *   - la fecha ya pasó.
 *
 * @param {import('../../core/state.js').Meta} meta
 * @param {string} frecuenciaIngresos - una de FRECUENCIAS_AHORRO; cualquier
 *   otro valor cae a 'Mensual' (lectura defensiva).
 * @returns {{
 *   montoPorPeriodo: number,
 *   numPeriodos: number,
 *   frecuencia: string,
 *   etiqueta: string,
 * }|null}
 */
export function calcularAhorroPorPeriodo(meta, frecuenciaIngresos) {
  const { faltante } = calcularProgreso(meta);
  const r = aportePorPeriodo(faltante, meta?.fechaLimite, frecuenciaIngresos, hoy());
  if (!r) return null;

  return {
    montoPorPeriodo: r.montoPorPeriodo,
    numPeriodos:     r.numPeriodos,
    frecuencia:      r.frecuencia,
    etiqueta:        r.etiqueta,
  };
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
 *
 * Ícono (MT.1, revisado en ID.3): `icono` solo guarda el emoji que el
 * usuario escribe a mano (el form MT.3 lo ofrece con la categoría 'Otra');
 * con categoría predefinida el ícono ya no se almacena, la vista lo
 * resuelve desde CATEGORIA_META_ICONO al renderizar (así un cambio futuro
 * del sprite no deja emojis viejos congelados en los datos). Sin emoji
 * manual queda null y la vista cae a la diana i-metas.
 *
 * EDIT.1: `metaExistente` (opcional) distingue crear de editar. Al crear,
 * `montoActual` arranca en 0 (nada aportado todavía). Al editar, el
 * histórico de aportes **se conserva tal cual** (recomendación explícita
 * de la auditoría, patrón P3: corregir un dato no debe borrar progreso ya
 * hecho); `completada` sí se recalcula, porque cambiar el objetivo puede
 * cruzar el umbral de cumplimiento en cualquier dirección con el mismo
 * `montoActual` de siempre.
 *
 * @param {Record<string, string>} datos
 * @param {import('../../core/state.js').Meta|null} [metaExistente] modo edición si se pasa.
 */
export function normalizarMeta(datos, metaExistente = null) {
  const categoria     = datos.categoria?.trim() || null;
  const montoObjetivo = Number(datos.montoObjetivo);
  const montoActual   = metaExistente ? (metaExistente.montoActual ?? 0) : 0;
  const { completada } = calcularProgreso({ montoObjetivo, montoActual });

  return {
    nombre:        datos.nombre.trim(),
    montoObjetivo,
    montoActual,
    fechaLimite:   datos.fechaLimite?.trim() || null,
    categoria,
    icono:         datos.icono?.trim() || null,
    nota:          datos.nota?.trim() || '',
    completada,
  };
}
