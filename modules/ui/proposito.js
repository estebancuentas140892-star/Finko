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
    titulo: '¿Para qué sirve Calendario?',
    texto: '¿Se te ha pasado un pago y te tocó asumir intereses o recargos? Las fechas se acumulan y es fácil olvidar una. Calendario reúne tus pagos periódicos en un solo lugar para que no se te pase ninguno y evites cobros por mora.',
  },
  presupuesto: {
    titulo: '¿Para qué sirve Límites de gasto?',
    texto: '¿Llegas a fin de mes sin saber por qué no te alcanzó? Mis cuentas te ayuda a repartir tu ingreso en Necesidades, Estilo de vida y Ahorro; Límites de gasto vigila que cumplas ese plan y te avisa antes de pasarte, no después. También puedes fijar un tope por categoría para un control más fino.',
  },
  metas: {
    titulo: '¿Para qué sirve Metas?',
    texto: '¿Tienes un sueño pero no sabes cómo llegar a él? Sin un plan, ahorrar para algo grande se siente imposible. Metas convierte cada objetivo en un plan de ahorro con pasos claros: cuánto apartar y cuándo lo vas a lograr.',
  },
  ahorro: {
    titulo: '¿Para qué sirve Ahorro?',
    texto: '¿Qué pasaría si mañana llega un gasto inesperado? Sin un respaldo, un imprevisto se cubre con deuda o desarma tus planes. Ahorro te ayuda a construir tu fondo de emergencia, el colchón para los momentos difíciles y tu base de tranquilidad.',
  },
  inversion: {
    titulo: '¿Para qué sirve Inversión?',
    texto: '¿Tu dinero está creciendo o solo guardado? El dinero quieto pierde valor con el tiempo por la inflación. Inversión te ayuda a llevar el registro de lo que inviertes y ver cómo tu patrimonio crece más allá del ahorro.',
  },
  tesoreria: {
    titulo: '¿Para qué sirve Mis cuentas?',
    texto: '¿Tienes claro cuánto dinero tienes y dónde está? Con varias cuentas y billeteras es fácil perder el rastro. Mis cuentas reúne todo tu dinero en un solo lugar y te ayuda a distribuir cada ingreso de forma inteligente.',
  },
  analisis: {
    titulo: '¿Para qué sirve Análisis?',
    texto: '¿Tus números te dicen algo o son solo cifras sueltas? Registrar movimientos sirve de poco si no entiendes qué significan. Análisis transforma tus datos en información clara para que tomes mejores decisiones con tu dinero.',
  },
  personales: {
    titulo: '¿Para qué sirve Me deben?',
    texto: '¿Le prestaste dinero a alguien y ya no recuerdas cuánto ni a quién? Los préstamos entre conocidos se olvidan fácil y generan incomodidad. Personales lleva la cuenta de lo que te deben: quién, cuánto y desde cuándo, sin malos ratos.',
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

function _htmlExpandido(seccion, { texto }) {
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
