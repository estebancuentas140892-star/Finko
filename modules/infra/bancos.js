/**
 * bancos.js - helpers presentacionales para entidades bancarias.
 *
 * Centraliza la teja de marca del banco (glifo oficial o iniciales sobre su
 * color corporativo, ADR 025) y el emoji por clase de entidad, para que
 * Tesorería, Gastos, Agenda y el picker de cuentas muestren la misma
 * identidad visual sin duplicar la lógica.
 *
 * Capa infra: solo importa de core (BANCOS_CO). Sin DOM, sin estado.
 */

import { BANCOS_CO } from '../core/constants.js';
import { tejaMarca } from './marcas.js';

/** Emoji por clase de entidad, para usar en contextos donde no cabe el avatar
 *  con color (ej. un <option> nativo de un <select>). */
const CLASE_EMOJI = {
  efectivo:  '💵',
  banco:     '🏦',
  billetera: '📱',
  otro:      '🔹',
};

/**
 * Devuelve el HTML de la teja de marca del banco (ADR 025): el glifo oficial
 * del sprite si la entrada tiene `simbolo`, o sus iniciales como fallback,
 * siempre sobre el color corporativo. Si el banco no está en BANCOS_CO,
 * devuelve una teja genérica con "?" y color gris.
 *
 * La clase se mantiene como `.bank-avatar` (la teja de marca ES el avatar
 * evolucionado): todos los consumidores y el CSS existentes siguen válidos.
 *
 * @param {string} bancoId - valor guardado en cuenta.banco.
 * @param {string|null} [icono] - CAT.2e: `cuenta.icono` elegido con el picker
 *   compartido para el banco "Otro" (que no tiene `simbolo` propio en
 *   `BANCOS_CO`). Solo se aplica cuando `bancoId === 'Otro'` Y el valor tiene
 *   forma de id de sprite (`c-avion`, nunca un emoji): datos viejos de antes
 *   de CAT.2e guardaban aquí un emoji que nadie leía (`_iconoPorBanco()`,
 *   retirado), y un `<use href="#💚">` roto no debe colarse por ese dato huérfano.
 * @returns {string} HTML del span `.bank-avatar`.
 */
export function bancoAvatar(bancoId, icono = null) {
  const banco = BANCOS_CO.find(b => b.id === bancoId) ?? null;
  const esSpriteId = typeof icono === 'string' && /^[a-z]-[a-z0-9-]+$/.test(icono);
  const marca = (banco?.id === 'Otro' && esSpriteId) ? { ...banco, simbolo: icono } : banco;
  // MK.2: el render de la teja vive en infra/marcas.js (una sola fuente);
  // con banco desconocido, tejaMarca(null) devuelve la teja gris con "?".
  return tejaMarca(marca);
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

/**
 * Clase de la entidad según el catálogo ('efectivo' | 'banco' | 'billetera'
 * | 'otro'). Espejo en infra de `claseEntidad()` (tesoreria/logic/cuentas.js),
 * para consumidores de infra que no pueden importar dominios (ADN 10), como
 * el conteo "efectivo + N cuentas bancarias" del hero (IN.8c).
 *
 * @param {string} bancoId - valor guardado en cuenta.banco.
 * @returns {string}
 */
export function bancoClase(bancoId) {
  return BANCOS_CO.find(b => b.id === bancoId)?.clase ?? 'otro';
}
