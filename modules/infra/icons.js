/**
 * infra/icons.js - helpers para iconos SVG inline usando el sprite de index.html.
 * Sin DOM. Puras funciones que devuelven strings HTML para inyectar via innerHTML.
 *
 * Uso basico: icon('home')
 * Uso con modificador de tamaño: icon('ahorro', 'icon icon--lg')
 *
 * Los ids disponibles se definen como <symbol id="i-*"> en index.html.
 */

/**
 * Devuelve un SVG inline que referencia el sprite por id.
 * @param {string} id  - nombre del symbol sin '#i-' (ej: 'home', 'alert')
 * @param {string} cls - clases CSS del svg (por defecto 'icon')
 * @returns {string}
 */
export function icon(id, cls = 'icon') {
  return `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
}
