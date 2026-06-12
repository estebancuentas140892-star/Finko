/**
 * render.js - orquestador de renders y actualizaciones del DOM.
 *
 * Principios:
 * - `renderSmart` evita trabajo si la sección no está visible.
 * - `updSaldo` lee S directamente y actualiza el saldo total del dashboard.
 * - `renderAll` es el punto de entrada único para re-renderizar todo.
 * - Los renders de dominio (Fases 7-11) se registran vía `registrarRender`.
 */

import { S } from '../core/state.js';
import { f } from './utils.js';
import { countUp } from './animate.js';

/** @type {Array<() => void>} Funciones de render registradas por los dominios. */
const _renders = [];

/** Último saldo mostrado: permite animar solo cuando el valor cambia. */
let _prevSaldo = null;

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
 * Ejecuta `fn` solo si la sección `key` corresponde al hash actual de la URL.
 *
 * Por qué chequea hash y no `.active`:
 *   Los listeners de `hashchange` corren en orden de registro. Los dominios
 *   registran su listener ANTES que el router, así que cuando el listener del
 *   dominio se ejecuta, el router aún no ha actualizado la clase `.active`.
 *   En cambio, `location.hash` se actualiza sincrónicamente ANTES de que
 *   se disparen los listeners de hashchange, así que es el único valor
 *   confiable en ese momento.
 *
 * @param {() => void} fn - función de render del dominio.
 * @param {string} key - hash de la sección (ej. `'gast'`, `'metas'`).
 */
export function renderSmart(fn, key) {
  const hashActual = location.hash.slice(1) || 'dash';
  if (hashActual === key) fn();
}

// ── ACTUALIZACIONES DE ESTADO GLOBAL ────────────────────────────

/**
 * Recalcula el saldo total visible en el dashboard.
 *
 * - Suma `saldo` de todas las `S.cuentas` activas.
 * - Actualiza `#saldo-total` con el valor formateado.
 * - Si el usuario aún no registró cuentas, muestra la guía de primeros pasos
 *   (`#hero-guia-saldo`) y oculta la descripción (`#saldo-desc`); con cuentas,
 *   al revés. Así un usuario nuevo sabe qué hacer ante el saldo en $0.
 */
export function updSaldo() {
  const cuentasActivas = S.cuentas.filter(c => c.activa !== false);
  const totalCuentas   = cuentasActivas.reduce((acc, c) => acc + (c.saldo ?? 0), 0);
  const sinCuentas     = cuentasActivas.length === 0;

  const elSaldo = document.getElementById('saldo-total');
  if (elSaldo) {
    if (!sinCuentas) {
      const onDash = (location.hash.slice(1) || 'dash') === 'dash';
      // countUp respeta prefers-reduced-motion por su cuenta.
      if (onDash && _prevSaldo !== totalCuentas) {
        countUp(elSaldo, totalCuentas, { from: _prevSaldo ?? 0 });
      } else {
        elSaldo.textContent = f(totalCuentas);
      }
    } else {
      elSaldo.textContent = f(0);
    }
    _prevSaldo = totalCuentas;
  }

  // Con cuentas: muestra el saldo normal y oculta la guía de primeros pasos.
  // Sin cuentas: oculta el ícono, label y valor para no confundir;
  //              muestra la guía de onboarding con el CTA a Mis cuentas.
  const guia  = document.getElementById('hero-guia-saldo');
  const desc  = document.getElementById('saldo-desc');
  const icon  = document.getElementById('hero-saldo-icon');
  const label = document.getElementById('hero-saldo-label');
  const valor = document.getElementById('saldo-total');

  if (guia)  guia.hidden  = !sinCuentas;
  if (desc)  desc.hidden  =  sinCuentas;
  if (icon)  icon.hidden  =  sinCuentas;
  if (label) label.hidden =  sinCuentas;
  if (valor) valor.hidden =  sinCuentas;
}

// ── ORQUESTADOR ──────────────────────────────────────────────────

/**
 * Re-renderiza todo: métricas globales + todos los dominios registrados.
 * Se invoca tras cualquier mutación de S que afecte múltiples secciones.
 */
export function renderAll() {
  updSaldo();
  for (const fn of _renders) {
    try {
      fn();
    } catch (err) {
      console.error('[render] renderAll: un render de dominio falló:', err);
    }
  }
}
