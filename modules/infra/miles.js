/**
 * miles.js - el separador de miles de los campos de dinero (ADR 120).
 *
 * Puro, sin DOM. Vivía duplicado en `apartados/view.js` y `config/view.js`;
 * con el resto de los campos de dinero son muchos más lectores, así que sube
 * a infra (regla 3 del ADR 060). Los dos dominios lo reexportan con el mismo
 * nombre de siempre.
 */

/**
 * Agrupa miles con punto para mostrar dentro de un campo de texto.
 * Devuelve '' si no hay dígitos. Conserva un "-" al comienzo: el saldo de una
 * cuenta puede estar en negativo (sobregiro) y editarla no debe volverlo
 * positivo.
 *
 * @param {string | number | null | undefined} valor
 * @returns {string} - ej. `980.000`, `-120.000`
 */
export function miles(valor) {
  const texto = String(valor ?? '');
  const signo = /^\s*-/.test(texto) ? '-' : '';
  const digitos = texto.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (digitos === '') return signo;
  return signo + digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Inversa de `miles()`: lee lo escrito en el campo y devuelve el número.
 * `null` si no quedó ningún dígito (campo vacío, distinto de cero).
 *
 * @param {string | number | null | undefined} texto
 * @returns {number | null}
 */
export function desdeMiles(texto) {
  const crudo = String(texto ?? '');
  const digitos = crudo.replace(/\D/g, '');
  if (digitos === '') return null;
  return /^\s*-/.test(crudo) ? -Number(digitos) : Number(digitos);
}

/**
 * Dónde dejar el cursor después de reformatear: con los mismos dígitos a su
 * derecha que tenía antes. Así borrar o escribir en medio del número no manda
 * el cursor al final.
 *
 * @param {string} formateado Valor nuevo del campo.
 * @param {number} digitosALaDerecha Dígitos que había a la derecha del cursor.
 * @returns {number} Posición del cursor en `formateado`.
 */
export function posicionTrasMiles(formateado, digitosALaDerecha) {
  let vistos = 0;
  for (let i = formateado.length; i > 0; i--) {
    if (vistos === digitosALaDerecha) return i;
    if (/\d/.test(formateado[i - 1])) vistos += 1;
  }
  return vistos === digitosALaDerecha ? 0 : formateado.length;
}
