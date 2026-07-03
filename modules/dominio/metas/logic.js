/**
 * metas/logic.js - funciones puras del dominio de metas de ahorro.
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 */

import { CATEGORIA_META_EMOJI } from '../../core/constants.js';

// ── CONSTANTES DE RITMO DE AHORRO (MT.4) ──────────────────────────

/**
 * Frecuencias con sentido como "cada cuánto ahorro para esta meta", alineadas
 * a la frecuencia con la que el usuario recibe ingresos. Subconjunto de
 * FRECUENCIAS (core/constants.js). Duplicado intencional de la misma idea en
 * `apartados/logic.js` (`FRECUENCIAS_APORTE`): Metas no puede importar de
 * Apartados (ADN #10, ningún dominio importa a otro).
 */
export const FRECUENCIAS_AHORRO = ['Diario', 'Semanal', 'Quincenal', 'Mensual'];

/** Mapeo de FRECUENCIAS (core) → FRECUENCIAS_AHORRO; las más largas caen a 'Mensual'. */
const MAPA_FRECUENCIA_A_AHORRO = {
  Diario:     'Diario',
  Semanal:    'Semanal',
  Quincenal:  'Quincenal',
  Mensual:    'Mensual',
  Bimestral:  'Mensual',
  Trimestral: 'Mensual',
  Semestral:  'Mensual',
  Anual:      'Mensual',
};

/** Días calendario que dura cada periodo de ahorro (promedio). */
const DIAS_POR_PERIODO_AHORRO = {
  Diario:    1,
  Semanal:   7,
  Quincenal: 15,
  Mensual:   30,
};

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
 * Devuelve la frecuencia de ahorro recomendada a partir de los ingresos del
 * usuario: la más común entre los ingresos activos, mapeada a una de
 * FRECUENCIAS_AHORRO. Si no hay ingresos activos, devuelve 'Mensual'.
 *
 * Se inyecta `ingresos` (no se lee S ni se importa tesorería) para respetar
 * ADN #10. Misma lógica que `frecuenciaPrincipalIngresos` de Apartados.
 *
 * @param {import('../../core/state.js').Ingreso[]} ingresos
 * @returns {string} Una de FRECUENCIAS_AHORRO.
 */
export function frecuenciaPrincipalIngresos(ingresos) {
  const activos = (ingresos ?? []).filter(i => i.activo !== false);
  if (activos.length === 0) return 'Mensual';

  const conteo = {};
  for (const i of activos) {
    const f = MAPA_FRECUENCIA_A_AHORRO[i.frecuencia] ?? 'Mensual';
    conteo[f] = (conteo[f] ?? 0) + 1;
  }

  // Más frecuente primero; en empate, la de mayor granularidad (índice menor).
  return Object.entries(conteo)
    .sort((a, b) => b[1] - a[1] || FRECUENCIAS_AHORRO.indexOf(a[0]) - FRECUENCIAS_AHORRO.indexOf(b[0]))
    .at(0)?.[0] ?? 'Mensual';
}

/**
 * Etiqueta legible del periodo de ahorro para usar en la lista de metas.
 * @param {string} frecuencia - una de FRECUENCIAS_AHORRO.
 * @returns {string} ej. "por quincena", "al mes".
 */
export function etiquetaPeriodoAhorro(frecuencia) {
  switch (frecuencia) {
    case 'Diario':    return 'por día';
    case 'Semanal':   return 'por semana';
    case 'Quincenal': return 'por quincena';
    case 'Mensual':   return 'al mes';
    default:          return 'al mes';
  }
}

/**
 * Calcula cuánto ahorrar por periodo (según la frecuencia de ingreso del
 * usuario) para alcanzar la meta antes de la fecha límite. Reemplaza el
 * antiguo "$X por día" fijo (MT.4): reparte el faltante entre los periodos
 * de la frecuencia real con la que el usuario cobra, no entre días sueltos.
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
  if (faltante <= 0) return null;

  const dias = diasHastaFecha(meta.fechaLimite);
  if (dias === null || dias <= 0) return null;

  const frecuencia = FRECUENCIAS_AHORRO.includes(frecuenciaIngresos) ? frecuenciaIngresos : 'Mensual';
  const diasPorPeriodo = DIAS_POR_PERIODO_AHORRO[frecuencia];

  const numPeriodos     = Math.max(1, Math.ceil(dias / diasPorPeriodo));
  const montoPorPeriodo = Math.ceil(faltante / numPeriodos);

  return {
    montoPorPeriodo,
    numPeriodos,
    frecuencia,
    etiqueta: etiquetaPeriodoAhorro(frecuencia),
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
 * Prioridad del ícono (MT.1): emoji escrito a mano > emoji de la categoría
 * elegida > 🎯 por defecto. Así una categoría predefinida (Viajes, Boda...)
 * ya trae su emoji sin que el usuario tenga que elegirlo. El form (MT.3)
 * solo deja escribir un emoji a mano con la categoría 'Otra', pero esta
 * función no depende de esa restricción de UI: sigue funcionando igual
 * si algún día otro flujo manda ambos campos.
 *
 * @param {Record<string, string>} datos
 */
export function normalizarMeta(datos) {
  const categoria = datos.categoria?.trim() || null;
  return {
    nombre:        datos.nombre.trim(),
    montoObjetivo: Number(datos.montoObjetivo),
    montoActual:   0,
    fechaLimite:   datos.fechaLimite?.trim() || null,
    categoria,
    icono:         datos.icono?.trim() || CATEGORIA_META_EMOJI[categoria] || '🎯',
    completada:    false,
  };
}
