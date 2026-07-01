/**
 * presupuesto/logic.js - funciones puras del dominio de presupuesto por sobre.
 *
 * Modelo "envelope budgeting" simplificado:
 *   - Un envelope por categoría (no por mes).
 *   - Monto mensual recurrente.
 *   - Progreso = gastos del mes en esa categoría / monto asignado.
 *
 * Sin DOM. Sin S directo. Testeable en Node/Vitest.
 */

import { CATEGORIAS_GASTO, GRUPOS_FINANCIEROS } from '../../core/constants.js';
import { gastosMes }        from '../gastos/logic.js';

// ── CONSTANTES ───────────────────────────────────────────────────

/** Umbrales de estado (fracciones del monto asignado). */
export const UMBRAL_ALERTA   = 0.75;
export const UMBRAL_EXCEDIDO = 1.00;

/** Estados posibles del progreso de un envelope. */
export const ESTADOS_PROGRESO = /** @type {const} */ (['ok', 'alerta', 'excedido']);

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra presupuestos con `activo !== false`.
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 */
export function presupuestosActivos(presupuestos) {
  return (presupuestos ?? []).filter(p => p.activo !== false);
}

/**
 * Suma gastos de una categoría específica en el mes dado.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} categoria
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {number} Total en COP.
 */
export function calcularGastadoCategoria(gastos, categoria, anio, mes) {
  return gastosMes(gastos ?? [], anio, mes)
    .filter(g => (g.categoria ?? 'Otros') === categoria)
    .reduce((acc, g) => acc + (g.monto ?? 0), 0);
}

/**
 * Calcula el progreso de un envelope contra los gastos del mes actual.
 *
 * Estados:
 *   - 'ok'        → gastado < 75% del asignado
 *   - 'alerta'    → 75% ≤ gastado ≤ 100%
 *   - 'excedido'  → gastado > 100%
 *
 * @param {import('../../core/state.js').Presupuesto} presupuesto
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {{
 *   gastado: number,
 *   asignado: number,
 *   restante: number,
 *   porcentaje: number,
 *   estado: 'ok' | 'alerta' | 'excedido',
 * }}
 */
export function calcularProgreso(presupuesto, gastos, anio, mes) {
  const asignado = Number(presupuesto?.montoMensual ?? 0);
  const gastado  = calcularGastadoCategoria(gastos, presupuesto?.categoria, anio, mes);
  const restante = asignado - gastado;

  // Porcentaje: si no hay asignado, devolvemos 0 para no dividir por cero.
  const porcentaje = asignado > 0
    ? Math.round((gastado / asignado) * 100)
    : 0;

  let estado;
  if (asignado === 0)                            estado = 'ok';
  else if (gastado > asignado * UMBRAL_EXCEDIDO) estado = 'excedido';
  else if (gastado >= asignado * UMBRAL_ALERTA)  estado = 'alerta';
  else                                           estado = 'ok';

  return { gastado, asignado, restante, porcentaje, estado };
}

// ── RESUMEN POR GRUPO FINANCIERO (MC.5a, ADR 017) ─────────────────

/**
 * Agrega asignado/ejecutado/restante/% por cada uno de los 3 grupos
 * financieros (Necesidades, Estilo de vida, Ahorro), con el mismo criterio
 * de estado que `calcularProgreso` (75% alerta, 100% excedido).
 *
 * Pura: recibe los montos ya sumados por el caller (asignado desde la
 * distribución de ingreso, ejecutado desde los flujos del mes de cada
 * dominio); no lee `S` ni importa otros dominios (regla ADN #10).
 *
 * @param {Partial<Record<'necesidades'|'estilo-de-vida'|'ahorro', number>>} [asignadoPorGrupo]
 * @param {Partial<Record<'necesidades'|'estilo-de-vida'|'ahorro', number>>} [ejecutadoPorGrupo]
 * @returns {Record<string, {
 *   asignado: number,
 *   ejecutado: number,
 *   restante: number,
 *   pct: number,
 *   estado: 'ok' | 'alerta' | 'excedido',
 * }>}
 */
export function resumenGrupos(asignadoPorGrupo = {}, ejecutadoPorGrupo = {}) {
  const resumen = {};

  for (const grupo of GRUPOS_FINANCIEROS) {
    const asignado  = Number(asignadoPorGrupo?.[grupo])  || 0;
    const ejecutado = Number(ejecutadoPorGrupo?.[grupo]) || 0;
    const restante  = asignado - ejecutado;

    const pct = asignado > 0
      ? Math.round((ejecutado / asignado) * 100)
      : 0;

    let estado;
    if (asignado === 0)                             estado = 'ok';
    else if (ejecutado > asignado * UMBRAL_EXCEDIDO) estado = 'excedido';
    else if (ejecutado >= asignado * UMBRAL_ALERTA)  estado = 'alerta';
    else                                              estado = 'ok';

    resumen[grupo] = { asignado, ejecutado, restante, pct, estado };
  }

  return resumen;
}

/**
 * Suma el monto mensual de todos los envelopes activos.
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 */
export function totalAsignadoMensual(presupuestos) {
  return presupuestosActivos(presupuestos)
    .reduce((acc, p) => acc + (p.montoMensual ?? 0), 0);
}

/**
 * Categorías que tienen gastos en el mes actual pero no tienen envelope creado.
 * Útil para mostrar al usuario qué presupuestos le faltan.
 *
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes
 * @returns {Array<{ categoria: string, gastado: number }>}
 */
export function categoriasSinPresupuesto(presupuestos, gastos, anio, mes) {
  const conPresupuesto = new Set(
    presupuestosActivos(presupuestos).map(p => p.categoria),
  );

  const gastosDelMes = gastosMes(gastos ?? [], anio, mes);
  const porCategoria = gastosDelMes.reduce((acc, g) => {
    const cat = g.categoria ?? 'Otros';
    if (!conPresupuesto.has(cat)) {
      acc[cat] = (acc[cat] ?? 0) + (g.monto ?? 0);
    }
    return acc;
  }, {});

  return Object.entries(porCategoria)
    .map(([categoria, gastado]) => ({ categoria, gastado }))
    .sort((a, b) => b.gastado - a.gastado);
}

/**
 * Indica si una categoría ya tiene un envelope activo creado.
 * Útil para evitar duplicados en el formulario de creación.
 *
 * @param {string} categoria
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 * @returns {boolean}
 */
export function tienePresupuesto(categoria, presupuestos) {
  return presupuestosActivos(presupuestos).some(p => p.categoria === categoria);
}

/**
 * Devuelve los envelopes activos que están en estado 'alerta' o 'excedido'
 * en el mes/año dados, ordenados: excedidos primero, luego por porcentaje desc.
 *
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {Array<{categoria:string, estado:string, porcentaje:number, gastado:number, asignado:number}>}
 */
export function alertasLimites(presupuestos, gastos, anio, mes) {
  return presupuestosActivos(presupuestos)
    .map(p => ({ categoria: p.categoria, ...calcularProgreso(p, gastos, anio, mes) }))
    .filter(r => r.estado === 'alerta' || r.estado === 'excedido')
    .sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === 'excedido' ? -1 : 1;
      return b.porcentaje - a.porcentaje;
    });
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida datos crudos de un formulario de presupuesto.
 * Si `presupuestoIdActual` está definido, ignora ese envelope al chequear duplicados
 * (para permitir editar sin que el chequeo falle contra el propio envelope).
 *
 * @param {Record<string,string>} datos
 * @param {import('../../core/state.js').Presupuesto[]} [presupuestosExistentes=[]]
 * @param {string|null} [presupuestoIdActual=null]
 * @returns {string[]} mensajes de error; vacío = válido.
 */
export function validarPresupuesto(datos, presupuestosExistentes = [], presupuestoIdActual = null) {
  const errores = [];

  if (!datos.categoria?.trim()) {
    errores.push('Debes elegir una categoría.');
  } else if (!CATEGORIAS_GASTO.includes(datos.categoria)) {
    errores.push(`Categoría inválida. Usa una de: ${CATEGORIAS_GASTO.join(', ')}.`);
  }

  const monto = Number(datos.montoMensual);
  if (isNaN(monto) || monto <= 0) {
    errores.push('El monto mensual debe ser un número mayor a 0.');
  }

  // Duplicado: solo si NO estamos editando el mismo envelope.
  if (errores.length === 0) {
    const duplicado = presupuestosActivos(presupuestosExistentes)
      .some(p => p.categoria === datos.categoria && p.id !== presupuestoIdActual);
    if (duplicado) {
      errores.push(`Ya existe un límite para "${datos.categoria}". Edita el existente.`);
    }
  }

  return errores;
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte datos crudos del formulario al shape de S.presupuestos.
 * Asume que los datos ya pasaron `validarPresupuesto()`.
 *
 * @param {Record<string,string>} datos
 * @returns {Omit<import('../../core/state.js').Presupuesto, 'id'>}
 */
export function normalizarPresupuesto(datos) {
  return {
    categoria:    datos.categoria,
    montoMensual: Number(datos.montoMensual),
    activo:       true,
  };
}
