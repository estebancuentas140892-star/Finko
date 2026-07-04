/**
 * proposito.js - banner de propósito de sección (ADR 016, revisión 2026-07-03: EP.7).
 *
 * Reglas:
 * - htmlBannerProposito() es pura: sin DOM, sin S. Testeable en happy-dom/Node.
 * - Divulgación progresiva: el banner es la única descripción de la sección y
 *   solo se muestra mientras la sección no tiene datos (`tieneDatos === false`).
 * - renderBannerProposito() inyecta en el DOM; cada dominio decide su propio
 *   `tieneDatos` reusando el predicado de su empty state.
 */

import { esc as _esc } from '../infra/utils.js';

/**
 * Copy por sección (ADR 016). Agregar aquí en EP.2-EP.4 para sumar secciones.
 * Clave: el hash de la sección (sin '#').
 */
export const PROPOSITOS_SECCION = {
  apartados: {
    titulo: '¿Para qué sirve Apartados?',
    texto: '¿Te ha pasado que de un momento a otro debes pagar el SOAT o cubrir otro gasto que no esperabas? Aunque son previsibles, es fácil no prepararte y terminar usando tus ahorros o endeudándote. Apartados te ayuda a evitarlo: separa poco a poco el dinero de cada gasto futuro, y cuando llegue el momento ya lo tendrás listo.',
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
    texto: '¿Llegas a fin de mes sin saber por qué no te alcanzó? Sin un tope claro, es fácil gastar de más sin darte cuenta. Límites de gasto vigila el plan que armaste en Mis cuentas (Necesidades, Estilo de vida y Ahorro) y te avisa antes de pasarte, no después.',
  },
  metas: {
    titulo: '¿Para qué sirve Metas?',
    texto: '¿Tienes un sueño pero no sabes cómo llegar a él? Sin un plan, ahorrar para algo grande se siente imposible. Metas convierte cada objetivo en un plan de ahorro con pasos claros: cuánto apartar y cuándo lo vas a lograr.',
  },
  ahorro: {
    titulo: '¿Para qué sirve el Fondo de emergencia?',
    texto: '¿Qué pasaría si mañana llega un gasto inesperado? Sin un respaldo, un imprevisto se cubre con deuda o desarma tus planes. Fondo de emergencia es tu colchón para los momentos difíciles: aquí lo construyes poco a poco y ves cuántos meses de tranquilidad ya tienes.',
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
    texto: '¿Le prestaste dinero a alguien y ya no recuerdas cuánto ni a quién? Los préstamos entre conocidos se olvidan fácil y generan incomodidad. Me deben lleva la cuenta de lo que te deben: quién, cuánto y desde cuándo, sin malos ratos.',
  },
};

// ── RENDER ───────────────────────────────────────────────────────

/**
 * Devuelve el HTML del banner de propósito para `seccion`, o '' si la sección
 * no tiene copy o ya tiene datos (divulgación progresiva).
 * Pura: no lee S, no toca el DOM.
 *
 * @param {string} seccion - clave de PROPOSITOS_SECCION (ej. 'apartados').
 * @param {boolean} tieneDatos - true si la sección ya tiene datos del usuario.
 * @returns {string} HTML listo para inyectar, o ''.
 */
export function htmlBannerProposito(seccion, tieneDatos = false) {
  const info = PROPOSITOS_SECCION[seccion];
  if (!info || tieneDatos) return '';
  return `
    <div class="banner-proposito" data-seccion="${_esc(seccion)}">
      <p class="banner-proposito__texto">${info.texto}</p>
    </div>`;
}

/**
 * Inyecta el banner de propósito en `#proposito-{seccion}`.
 * No-op si el slot no existe en el DOM.
 *
 * @param {string} seccion
 * @param {boolean} tieneDatos - true si la sección ya tiene datos del usuario.
 */
export function renderBannerProposito(seccion, tieneDatos) {
  const el = document.getElementById(`proposito-${seccion}`);
  if (!el) return;
  el.innerHTML = htmlBannerProposito(seccion, tieneDatos);
}
