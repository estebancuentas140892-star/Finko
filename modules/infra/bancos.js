/**
 * bancos.js - helpers presentacionales para entidades bancarias.
 *
 * Centraliza el avatar de banco (iniciales + color corporativo) y el emoji
 * por clase de entidad, para que Tesorería, Gastos, Agenda y el picker de
 * cuentas muestren la misma identidad visual sin duplicar la lógica.
 *
 * Capa infra: solo importa de core (BANCOS_CO). Sin DOM, sin estado.
 */

import { BANCOS_CO } from '../core/constants.js';

/** Emoji por clase de entidad, para usar en contextos donde no cabe el avatar
 *  con color (ej. un <option> nativo de un <select>). */
const CLASE_EMOJI = {
  efectivo:  '💵',
  banco:     '🏦',
  billetera: '📱',
  otro:      '🔹',
};

/**
 * Devuelve el HTML de un avatar circular con las iniciales y el color
 * corporativo del banco. Si el banco no está en BANCOS_CO, devuelve un
 * avatar genérico con "?" y color gris.
 *
 * @param {string} bancoId - valor guardado en cuenta.banco.
 * @returns {string} HTML del span `.bank-avatar`.
 */
export function bancoAvatar(bancoId) {
  const banco     = BANCOS_CO.find(b => b.id === bancoId);
  const iniciales = banco ? banco.iniciales : '?';
  const color     = banco ? banco.color     : '#6B7280';
  const texto     = banco ? banco.texto     : '#ffffff';
  return `<span class="bank-avatar"
               style="background:${color};color:${texto}"
               aria-hidden="true">${iniciales}</span>`;
}

/**
 * Devuelve el emoji que representa la clase de la entidad (efectivo, banco,
 * billetera u otro). Útil para prefijar opciones de un <select> nativo.
 *
 * @param {string} bancoId - valor guardado en cuenta.banco.
 * @returns {string} Un emoji.
 */
export function bancoClaseEmoji(bancoId) {
  const banco = BANCOS_CO.find(b => b.id === bancoId);
  return CLASE_EMOJI[banco?.clase] ?? CLASE_EMOJI.otro;
}
