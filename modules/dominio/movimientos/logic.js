/**
 * movimientos/logic.js - deriva un historial unificado de movimientos desde
 * los registros que ya existen en otros dominios (TX.8a, ADR 028 D5).
 *
 * No hay log paralelo: se normaliza lo que ya está en S.gastos,
 * S.ingresosPuntuales y S.ahorro.aportes a un shape común. Puro: no lee S
 * directamente, no toca el DOM. Recibe los arrays como parámetros (el
 * caller, view.js, es quien lee S). Ningún dominio importa a otro (ADN 10):
 * los íconos salen de catálogos en core/constants.js, no de otros dominios.
 *
 * Limitación aceptada v1: metas y apartados no tienen historial fechado por
 * aporte (solo `montoActual`), así que no aparecen en el historial todavía.
 */

import { CATEGORIA_ICONO, CATEGORIA_INGRESO_ICONO } from '../../core/constants.js';

/**
 * @typedef {Object} Movimiento
 * @property {string} id
 * @property {string} fecha        ISO 8601 (YYYY-MM-DD).
 * @property {'gasto'|'ingreso'|'aporte'} tipo
 * @property {string} descripcion
 * @property {number} monto
 * @property {'ingreso'|'egreso'} direccion
 * @property {string} icono        Id de símbolo del sprite.
 * @property {string|null} cuentaId
 * @property {'gastos'|'compromisos'|'ingresos'|'ahorro'} dominio  Sección dueña
 *   del movimiento (TX.8b): colorea la teja del ícono en la vista completa
 *   (`cat-teja[data-dom]`, ADR 025 D1/D3), igual que el resto de la app.
 */

/**
 * Categorías internas de `S.gastos` que en realidad son un pago de deuda o de
 * un fijo del Calendario (ver `docs/MAPA.md`: "Deudas incluye también gastos
 * fijos"), no gasto cotidiano. El dominio dueño es `compromisos`, no `gastos`.
 */
const _CATEGORIAS_COMPROMISOS = new Set(['Deudas', 'Gastos fijos']);

/**
 * Normaliza `S.gastos` a Movimiento. Los gastos con categoría interna
 * ('Deudas', 'Gastos fijos') ya revelan su origen real vía el propio
 * catálogo de íconos (TX.6/TX.7 no hace falta: `CATEGORIA_ICONO` alcanza) y
 * vía `dominio: 'compromisos'` (colorea distinto de un gasto cotidiano).
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @returns {Movimiento[]}
 */
export function movimientosDesdeGastos(gastos) {
  if (!Array.isArray(gastos)) return [];
  return gastos.map(g => ({
    id:          g.id,
    fecha:       g.fecha,
    tipo:        'gasto',
    descripcion: g.descripcion,
    monto:       g.monto,
    direccion:   'egreso',
    icono:       CATEGORIA_ICONO[g.categoria] ?? 'i-gastos',
    cuentaId:    g.cuentaId ?? null,
    dominio:     _CATEGORIAS_COMPROMISOS.has(g.categoria) ? 'compromisos' : 'gastos',
  }));
}

/**
 * Normaliza `S.ingresosPuntuales` a Movimiento.
 *
 * @param {import('../../core/state.js').IngresoPuntual[]} ingresosPuntuales
 * @returns {Movimiento[]}
 */
export function movimientosDesdeIngresosPuntuales(ingresosPuntuales) {
  if (!Array.isArray(ingresosPuntuales)) return [];
  return ingresosPuntuales.map(i => ({
    id:          i.id,
    fecha:       i.fecha,
    tipo:        'ingreso',
    descripcion: i.descripcion,
    monto:       i.monto,
    direccion:   'ingreso',
    icono:       CATEGORIA_INGRESO_ICONO[i.categoria] ?? 'i-saldo',
    cuentaId:    i.cuentaId ?? null,
    dominio:     'ingresos',
  }));
}

/**
 * Normaliza `S.ahorro.aportes` a Movimiento. Un aporte no tiene categoría ni
 * cuenta (Aporte solo guarda id/monto/fecha/nota); la nota, si existe, sirve
 * de descripción.
 *
 * @param {import('../../core/state.js').Aporte[]} aportes
 * @returns {Movimiento[]}
 */
export function movimientosDesdeAportes(aportes) {
  if (!Array.isArray(aportes)) return [];
  return aportes.map(a => ({
    id:          a.id,
    fecha:       a.fecha,
    tipo:        'aporte',
    descripcion: a.nota?.trim() || 'Aporte al fondo de emergencia',
    monto:       a.monto,
    direccion:   'egreso',
    icono:       'i-ahorro',
    cuentaId:    null,
    dominio:     'ahorro',
  }));
}

/**
 * Combina y ordena (más reciente primero) los movimientos de las 3 fuentes.
 * A igualdad de fecha, el orden entre movimientos de tipos distintos no está
 * garantizado (no hay hora de creación en el dato de origen); dentro de un
 * mismo tipo se conserva el orden de inserción de su colección.
 *
 * @param {{ gastos?: unknown, ingresosPuntuales?: unknown, aportes?: unknown }} fuentes
 * @param {number} [limite=5]
 * @returns {Movimiento[]}
 */
export function movimientosRecientes({ gastos, ingresosPuntuales, aportes } = {}, limite = 5) {
  const todos = [
    ...movimientosDesdeGastos(gastos),
    ...movimientosDesdeIngresosPuntuales(ingresosPuntuales),
    ...movimientosDesdeAportes(aportes),
  ];
  return todos
    .filter(m => typeof m.fecha === 'string' && m.fecha)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, limite);
}

/**
 * Historial completo (TX.8b): las 3 fuentes combinadas y ordenadas por fecha
 * descendente, sin límite. Vista completa de Movimientos en ruta propia.
 *
 * @param {{ gastos?: unknown, ingresosPuntuales?: unknown, aportes?: unknown }} fuentes
 * @returns {Movimiento[]}
 */
export function movimientosCompletos(fuentes = {}) {
  return movimientosRecientes(fuentes, Infinity);
}
