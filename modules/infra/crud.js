/**
 * crud.js - operaciones genéricas sobre el singleton S.
 *
 * Contrato:
 * - `guardar`, `editar`, `eliminar` mutan S, llaman save() y emiten `state:change`.
 * - El caller no necesita tocar save() ni EventBus directamente.
 * - Colección debe ser una clave de S que apunte a un array.
 */

import { S, EventBus } from '../core/state.js';
import { save } from '../core/storage.js';

/**
 * Genera un ID único para cada ítem. Usa crypto.randomUUID() cuando está
 * disponible (navegador y happy-dom v14+) y cae a un fallback basado en
 * tiempo + aleatoriedad para entornos sin Web Crypto.
 *
 * @returns {string}
 */
export function genId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: `t-` + timestamp base36 + 7 caracteres aleatorios.
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Agrega un ítem nuevo a `S[coleccion]`.
 * Asigna `id` (si no viene) y `fechaCreacion` (si no viene) automáticamente.
 *
 * @param {string} coleccion - clave de S que apunta a un array.
 * @param {Record<string, unknown>} item - datos del nuevo ítem.
 * @returns {Record<string, unknown>} el ítem con id y fechaCreacion asignados.
 */
export function guardar(coleccion, item) {
  const entry = {
    fechaCreacion: new Date().toISOString(),
    ...item,
    id: item.id ?? genId(),
  };
  S[coleccion].push(entry);
  save();
  EventBus.emit('state:change', { section: coleccion });
  return entry;
}

/**
 * Actualiza un ítem existente en `S[coleccion]` por su `id`.
 *
 * @param {string} coleccion
 * @param {string} id
 * @param {Record<string, unknown>} cambios - campos a sobreescribir (merge shallow).
 * @returns {Record<string, unknown> | false} el ítem actualizado, o `false` si no existe.
 */
export function editar(coleccion, id, cambios) {
  const arr = S[coleccion];
  const idx = arr.findIndex(x => x.id === id);
  if (idx === -1) return false;
  Object.assign(arr[idx], cambios);
  save();
  EventBus.emit('state:change', { section: coleccion });
  return arr[idx];
}

/**
 * Las filas de un aporte a una meta o a una reserva (HF.1c, ADR 145 D1): una
 * por cuenta del reparto, o una sin cuenta si no hubo de dónde descontar.
 * Pura salvo por los ids.
 *
 * @param {Array<{cuentaId: string, monto: number}>} splits
 * @param {number} monto Total del aporte (vale cuando `splits` está vacío).
 * @param {string} fecha YYYY-MM-DD.
 * @param {{origen?: 'distribucion'}} [extra]
 * @returns {import('../core/state.js').AporteBolsa[]}
 */
export function filasDeAporte(splits, monto, fecha, extra = {}) {
  const partes = Array.isArray(splits) && splits.length > 0
    ? splits.filter(s => Number(s?.monto) > 0).map(s => ({ cuentaId: s.cuentaId ?? null, monto: Number(s.monto) }))
    : [{ cuentaId: null, monto: Number(monto) || 0 }];
  return partes
    .filter(p => p.monto > 0)
    .map(p => ({ id: genId(), fecha, monto: p.monto, cuentaId: p.cuentaId, ...(extra.origen ? { origen: extra.origen } : {}) }));
}

/**
 * Elimina un ítem de `S[coleccion]` por su `id`.
 *
 * @param {string} coleccion
 * @param {string} id
 * @returns {boolean} `true` si se eliminó, `false` si no existía.
 */
export function eliminar(coleccion, id) {
  const arr = S[coleccion];
  const idx = arr.findIndex(x => x.id === id);
  if (idx === -1) return false;
  arr.splice(idx, 1);
  save();
  EventBus.emit('state:change', { section: coleccion });
  return true;
}
