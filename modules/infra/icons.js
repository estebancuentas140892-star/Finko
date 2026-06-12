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

/**
 * Ilustración geométrica para empty states (rediseño 2026, F7).
 *
 * Composición: círculo de fondo sutil, órbita punteada, puntos
 * decorativos flotantes y el icono del dominio centrado. Todo el color
 * vive en CSS (.empty-art__* en atoms.css), cero estilos inline; la
 * animación de órbita/flotado también es CSS y respeta
 * prefers-reduced-motion.
 *
 * @param {string} id - nombre del symbol sin '#i-' (ej: 'metas', 'ahorro')
 * @returns {string}
 */
export function emptyArt(id) {
  return `<svg class="empty-art" viewBox="0 0 120 120" aria-hidden="true">
    <circle class="empty-art__bg" cx="60" cy="60" r="44"/>
    <circle class="empty-art__orbit" cx="60" cy="60" r="55" fill="none" stroke-dasharray="3 8"/>
    <g class="empty-art__dots">
      <circle class="empty-art__dot" cx="101" cy="36" r="3"/>
      <circle class="empty-art__dot empty-art__dot--sm" cx="24" cy="28" r="2"/>
      <circle class="empty-art__dot" cx="17" cy="82" r="2.5"/>
      <path class="empty-art__spark" d="M98 86 v10 M93 91 h10"/>
    </g>
    <use href="#i-${id}" class="empty-art__icon" x="36" y="36" width="48" height="48"/>
  </svg>`;
}
