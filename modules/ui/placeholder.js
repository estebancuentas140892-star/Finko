/**
 * placeholder.js - el texto de ayuda de un campo nunca se corta (TEL.1c,
 * ADR 199 D17).
 *
 * "Busca por nombre, nota o categoría" mide 253 px y el campo de Movimientos
 * da 230 a 320 de ancho (o con la letra del sistema grande): se cortaba. El
 * campo lleva una versión corta, "Nombre, nota, categoría", que se usa solo
 * cuando la larga no cabe. El CSS no sabe medir un placeholder, así que se
 * mide aquí con la letra del campo, al montarlo y cada vez que cambia su
 * ancho.
 */

let _lienzo = null;
const _vigilados = new WeakSet();
let _observador = null;

/** Ancho de `texto` con la letra de `input`. */
function _ancho(input, texto) {
  _lienzo ??= document.createElement('canvas').getContext('2d');
  if (!_lienzo) return 0;
  const cs = getComputedStyle(input);
  _lienzo.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return _lienzo.measureText(texto).width;
}

/**
 * Elige el texto de ayuda que cabe: el largo (`data-placeholder-largo`) si
 * cabe en el espacio para escribir; si no, el corto (`data-placeholder-corto`).
 *
 * @param {HTMLInputElement} input
 */
export function elegirPlaceholder(input) {
  const { placeholderLargo: largo, placeholderCorto: corto } = input.dataset;
  if (!largo || !corto || !input.clientWidth) return;
  const cs = getComputedStyle(input);
  const libre = input.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2;
  const texto = _ancho(input, largo) <= libre ? largo : corto;
  if (input.placeholder !== texto) input.placeholder = texto;
}

/**
 * Elige ahora y cada vez que el campo cambia de ancho.
 *
 * @param {HTMLInputElement | null} input
 */
export function vigilarPlaceholder(input) {
  if (!input) return;
  elegirPlaceholder(input);
  if (typeof ResizeObserver === 'undefined' || _vigilados.has(input)) return;
  _vigilados.add(input);
  _observador ??= new ResizeObserver((entradas) => {
    for (const e of entradas) elegirPlaceholder(e.target);
  });
  _observador.observe(input);
}
