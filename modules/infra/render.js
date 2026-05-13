/**
 * render.js — orquestador de renders y actualizaciones del DOM.
 *
 * Principios:
 * - `renderSmart` evita trabajo si la sección no está visible.
 * - `updSaldo` y `updateBadge` leen S directamente y actualizan el DOM.
 * - `renderAll` es el punto de entrada único para re-renderizar todo.
 * - Los renders de dominio (Fases 7–11) se registran vía `registrarRender`.
 */

import { S } from '../core/state.js';
import { f } from './utils.js';

/** @type {Array<() => void>} Funciones de render registradas por los dominios. */
const _renders = [];

/**
 * Registra una función de render de dominio para que `renderAll` la invoque.
 * Cada dominio llama a esto en su `index.js` durante el bootstrap.
 *
 * @param {() => void} fn
 */
export function registrarRender(fn) {
  if (typeof fn === 'function') _renders.push(fn);
}

// ── RENDER CONDICIONAL ───────────────────────────────────────────

/**
 * Ejecuta `fn` solo si la sección `key` está actualmente visible.
 * Evita re-renders costosos de secciones que el usuario no ve.
 *
 * @param {() => void} fn — función de render del dominio.
 * @param {string} key — hash de la sección (ej. `'gast'`, `'metas'`).
 */
export function renderSmart(fn, key) {
  const el = document.getElementById(`sec-${key}`);
  if (el?.classList.contains('active')) fn();
}

// ── ACTUALIZACIONES DE ESTADO GLOBAL ────────────────────────────

/**
 * Recalcula el saldo total visible en el dashboard.
 *
 * - Suma `saldo` de todas las `S.cuentas` activas.
 * - Actualiza `#saldo-total` con el valor formateado.
 * - Calcula gastos del mes calendario actual y actualiza `#gastos-mes`.
 */
export function updSaldo() {
  const totalCuentas = S.cuentas
    .filter(c => c.activa !== false)
    .reduce((acc, c) => acc + (c.saldo ?? 0), 0);

  const elSaldo = document.getElementById('saldo-total');
  if (elSaldo) elSaldo.textContent = f(totalCuentas);

  const ahora = new Date();
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  const gastosMes = S.gastos
    .filter(g => g.fecha?.startsWith(mesActual))
    .reduce((acc, g) => acc + (g.monto ?? 0), 0);

  const elGastos = document.getElementById('gastos-mes');
  if (elGastos) elGastos.textContent = f(gastosMes);
}

/**
 * Actualiza el contador de compromisos activos en el dashboard.
 * También se usa para un futuro badge en la sidebar (Fase 12).
 */
export function updateBadge() {
  const activos = S.compromisos.filter(c => c.activo !== false).length;

  const elCount = document.getElementById('compromisos-count');
  if (elCount) elCount.textContent = String(activos);
}

// ── ORQUESTADOR ──────────────────────────────────────────────────

/**
 * Re-renderiza todo: métricas globales + todos los dominios registrados.
 * Se invoca tras cualquier mutación de S que afecte múltiples secciones.
 */
export function renderAll() {
  updSaldo();
  updateBadge();
  for (const fn of _renders) {
    try {
      fn();
    } catch (err) {
      console.error('[render] renderAll: un render de dominio falló:', err);
    }
  }
}
