/**
 * proposito.js - banner de propósito de sección (ADR 016, épica EP).
 *
 * Reglas:
 * - htmlBannerProposito() es pura: sin DOM, sin S. Testeable en happy-dom/Node.
 * - renderBannerProposito() inyecta en el DOM leyendo S.config.
 * - initBannersProposito() registra las acciones colapsar/expandir.
 * - reactivarPropositos() se exporta para que config/index.js la llame.
 */

import { S } from '../core/state.js';
import { save } from '../core/storage.js';
import { registrarAccion } from './actions.js';
import { announce } from '../infra/a11y.js';
import { esc as _esc } from '../infra/utils.js';

/**
 * Copy por sección (ADR 016). Agregar aquí en EP.2-EP.4 para sumar secciones.
 * Clave: el hash de la sección (sin '#').
 */
export const PROPOSITOS_SECCION = {
  apartados: {
    titulo: '¿Para qué sirve Apartados?',
    texto: '¿Te ha pasado que, de un momento a otro, debes pagar el SOAT, comprar el alimento de tu mascota, reponer tus productos de aseo personal o cubrir otro gasto importante que no esperabas? Aunque son gastos previsibles, muchas veces olvidamos prepararnos y terminamos usando nuestros ahorros, aplazando metas o endeudándonos. Apartados te ayuda a evitarlo: destina una pequeña parte de tus ingresos para cada gasto futuro y, cuando llegue el momento de pagarlo, ya tendrás el dinero (o gran parte de él) disponible.',
  },
  gast: {
    titulo: '¿Para qué sirve Gastos?',
    texto: '¿Sabes en qué se te va el dinero cada mes? Muchas veces se escapa en compras pequeñas que ni recordamos. Gastos te muestra en qué gastas de verdad, para que descubras hábitos que puedes mejorar y decidas con información.',
  },
  compromisos: {
    titulo: '¿Para qué sirve Deudas?',
    texto: '¿Sientes que pagas y pagas pero la deuda no baja? Sin un plan, los intereses te cobran de más y la salida se alarga. Deudas arma la mejor estrategia para que pagues menos intereses y salgas más rápido, una cuota a la vez.',
  },
  agenda: {
    titulo: '¿Para qué sirve Mi Agenda?',
    texto: '¿Se te ha pasado un pago y te tocó asumir intereses o recargos? Las fechas se acumulan y es fácil olvidar una. Agenda reúne tus pagos periódicos en un solo lugar para que no se te pase ninguno y evites cobros por mora.',
  },
  presupuesto: {
    titulo: '¿Para qué sirve Límites de gasto?',
    texto: '¿Llegas a fin de mes sin saber por qué no te alcanzó? Sin un tope claro, es fácil gastar de más sin darte cuenta. Límites de gasto te deja fijar cuánto quieres gastar por categoría y te avisa antes de pasarte, no después.',
  },
};

// ── RENDER ───────────────────────────────────────────────────────

/**
 * Devuelve el HTML del banner de propósito para `seccion`.
 * Pura: no lee S, no toca el DOM.
 *
 * @param {string} seccion - clave de PROPOSITOS_SECCION (ej. 'apartados').
 * @param {object} [config] - objeto equivalente a S.config.
 * @returns {string} HTML listo para inyectar, o '' si la sección no tiene copy.
 */
export function htmlBannerProposito(seccion, config = {}) {
  const info = PROPOSITOS_SECCION[seccion];
  if (!info) return '';
  const colapsado = (config.propositoColapsado ?? {})[seccion] === true;
  return colapsado ? _htmlColapsado(seccion, info) : _htmlExpandido(seccion, info);
}

function _htmlExpandido(seccion, { titulo, texto }) {
  return `
    <div class="banner-proposito" data-seccion="${_esc(seccion)}">
      <p class="banner-proposito__texto">${texto}</p>
      <button type="button"
              class="banner-proposito__toggle"
              data-action="colapsar-proposito"
              data-seccion="${_esc(seccion)}"
              aria-expanded="true">
        Entendido, ocultar
      </button>
    </div>`;
}

function _htmlColapsado(seccion, { titulo }) {
  return `
    <div class="banner-proposito banner-proposito--colapsado" data-seccion="${_esc(seccion)}">
      <button type="button"
              class="banner-proposito__toggle"
              data-action="expandir-proposito"
              data-seccion="${_esc(seccion)}"
              aria-expanded="false">
        ${titulo}
      </button>
    </div>`;
}

/**
 * Inyecta el banner de propósito en `#proposito-{seccion}`.
 * No-op si el slot no existe en el DOM.
 *
 * @param {string} seccion
 */
export function renderBannerProposito(seccion) {
  const el = document.getElementById(`proposito-${seccion}`);
  if (!el) return;
  el.innerHTML = htmlBannerProposito(seccion, S.config ?? {});
}

// ── HANDLERS ─────────────────────────────────────────────────────

/** @param {HTMLElement} el */
function _colapsarProposito(el) {
  const seccion = el.dataset.seccion;
  if (!seccion) return;
  if (!S.config) S.config = {};
  if (!S.config.propositoColapsado) S.config.propositoColapsado = {};
  S.config.propositoColapsado[seccion] = true;
  save();
  renderBannerProposito(seccion);
}

/** @param {HTMLElement} el */
function _expandirProposito(el) {
  const seccion = el.dataset.seccion;
  if (!seccion) return;
  if (!S.config) S.config = {};
  if (!S.config.propositoColapsado) S.config.propositoColapsado = {};
  delete S.config.propositoColapsado[seccion];
  save();
  renderBannerProposito(seccion);
}

/**
 * Limpia todas las preferencias de colapso, expandiendo todos los banners.
 * Se llama desde Ajustes (acción 'reactivar-propositos').
 */
export function reactivarPropositos() {
  if (!S.config) S.config = {};
  S.config.propositoColapsado = {};
  save();
  for (const seccion of Object.keys(PROPOSITOS_SECCION)) {
    renderBannerProposito(seccion);
  }
  announce('Mensajes de propósito reactivados.');
}

// ── INIT ─────────────────────────────────────────────────────────

export function initBannersProposito() {
  registrarAccion('colapsar-proposito', _colapsarProposito);
  registrarAccion('expandir-proposito', _expandirProposito);
}
