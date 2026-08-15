/**
 * bloque-gastos.js - la franja de pestañas del bloque Gastos (móvil).
 *
 * Ficha 01 de la auditoría móvil (ADR 069): en la barra inferior "Gastos"
 * deja de nombrar una sección y pasa a nombrar un bloque con tres lentes:
 * "Lo que gastaste" (la portada), "Por pagar" y "Límites". Las tres siguen
 * siendo secciones con hash propio; el bloque es una capa de navegación, no
 * un contenedor nuevo de estado. Por eso no hay hash nuevo en router.js.
 *
 * La franja se inyecta en las tres secciones (`#tabs-{hash}`) con el mismo
 * patrón con el que proposito.js inyecta su banner. Quien marca la pestaña
 * activa es markActiveNav() (shell.js): la franja es navegación y el nav ya
 * sabe leer `data-section`. Acá solo se pinta el estado que cada pestaña
 * lleva encima (vencidos y límites excedidos), que es lo que conserva la
 * promesa de R74 sin gastar una pantalla en un menú.
 *
 * Solo se ve bajo 1024px (responsive.css): en escritorio el sidebar ya lista
 * las tres lentes en filas propias.
 */

import { S } from '../core/state.js';
import { hoy } from '../infra/utils.js';
import { registrarRender } from '../infra/render.js';
import { vencidosSinPagar } from '../dominio/compromisos/logic.js';
import { alertasLimites } from '../dominio/presupuesto/logic.js';

/**
 * Las tres lentes del bloque, en el orden en que se leen. La primera es la
 * portada: el bloque aterriza en ella porque domina a sus hermanas (R81).
 */
export const LENTES_BLOQUE_GASTOS = [
  { hash: 'gast',        etiqueta: 'Lo que gastaste' },
  { hash: 'compromisos', etiqueta: 'Por pagar' },
  { hash: 'presupuesto', etiqueta: 'Límites' },
];

// ── RENDER ───────────────────────────────────────────────────────

/**
 * Devuelve el HTML de la franja. Pura: no lee S, no toca el DOM.
 *
 * Las etiquetas son constantes del módulo, no datos del usuario: no pasan
 * por esc(). La pastilla nace vacía y `hidden`; el número lo escribe
 * sincronizarTabsBloqueGastos().
 *
 * @returns {string} HTML listo para inyectar.
 */
export function htmlTabsBloqueGastos() {
  const tabs = LENTES_BLOQUE_GASTOS.map(({ hash, etiqueta }) => `
      <a class="bloque-tabs__tab" href="#${hash}" data-section="${hash}" aria-label="${etiqueta}">
        <span class="bloque-tabs__label">${etiqueta}</span>
        <span class="badge bloque-tabs__badge" aria-hidden="true" hidden></span>
      </a>`).join('');

  return `<nav class="bloque-tabs" aria-label="Lentes de Gastos">${tabs}</nav>`;
}

/**
 * El estado que cada pestaña muestra encima. Puro respecto al DOM: recibe el
 * estado y la fecha, así que se testea sin app.
 *
 * `vencidos` usa la misma llamada que el bloque "Atención hoy" de Inicio
 * (compromisos/views/dashboard.js), sin config propia: si los dos contaran
 * distinto, la barra diría un número y el inicio otro.
 *
 * @param {typeof S} [state=S]
 * @param {string} [hoyISO=hoy()] YYYY-MM-DD
 * @returns {{vencidos:number, excedidos:number}}
 */
export function estadoLentesGastos(state = S, hoyISO = hoy()) {
  const anio = Number(hoyISO.slice(0, 4));
  const mes  = Number(hoyISO.slice(5, 7));

  const vencidos = vencidosSinPagar(state.compromisos ?? [], state.gastos ?? [], hoyISO).length;
  const excedidos = alertasLimites(state.presupuestos ?? [], state.gastos ?? [], anio, mes)
    .filter(a => a.estado === 'excedido').length;

  return { vencidos, excedidos };
}

/**
 * Escribe el estado en las pastillas de las tres copias de la franja.
 * No-op si la franja no está en el DOM.
 *
 * @param {{vencidos:number, excedidos:number}} [estado]
 */
export function sincronizarTabsBloqueGastos(estado = estadoLentesGastos()) {
  _pintarBadge('compromisos', estado.vencidos,
    'Por pagar', n => `${n} ${n === 1 ? 'vencido' : 'vencidos'}`);
  _pintarBadge('presupuesto', estado.excedidos,
    'Límites', n => `${n} ${n === 1 ? 'límite excedido' : 'límites excedidos'}`);
}

/**
 * La pastilla es decorativa (`aria-hidden`): un número suelto leído en voz
 * alta no dice de qué. Lo que oye el lector es el nombre accesible de la
 * pestaña, que se reescribe con el conteo.
 *
 * @param {string} hash
 * @param {number} n
 * @param {string} etiqueta
 * @param {(n:number) => string} frase
 */
function _pintarBadge(hash, n, etiqueta, frase) {
  document.querySelectorAll(`.bloque-tabs__tab[data-section="${hash}"]`).forEach((tab) => {
    const badge = tab.querySelector('.bloque-tabs__badge');
    if (badge) {
      badge.textContent = n > 0 ? String(n) : '';
      badge.hidden = n === 0;
    }
    tab.setAttribute('aria-label', n > 0 ? `${etiqueta}, ${frase(n)}` : etiqueta);
  });
}

// ── INIT ─────────────────────────────────────────────────────────

/**
 * Inyecta la franja en las tres lentes y engancha su estado al render
 * global. Se llama una sola vez desde bootstrap.js.
 */
export function initBloqueGastos() {
  const html = htmlTabsBloqueGastos();
  for (const { hash } of LENTES_BLOQUE_GASTOS) {
    const slot = document.getElementById(`tabs-${hash}`);
    if (slot) slot.innerHTML = html;
  }

  sincronizarTabsBloqueGastos();
  registrarRender(() => sincronizarTabsBloqueGastos());
}
