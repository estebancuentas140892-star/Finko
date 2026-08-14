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
 * Como `icon()`, pero recibe el id COMPLETO del symbol, con prefijo
 * ('c-mercado', 'i-home'...). Es la forma que guardan los catálogos
 * CATEGORIA_*_ICONO de constants.js (ID.3): un glifo de categoría puede
 * reusar un símbolo estructural i-* cuando la metáfora ya existe.
 *
 * @param {string} id  - id completo del symbol (ej: 'c-libro', 'i-deudas')
 * @param {string} cls - clases CSS del svg (por defecto 'icon')
 * @returns {string}
 */
export function iconoCategoria(id, cls = 'icon') {
  return `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
}

/**
 * Teja de categoría (ADR 025 D1/D3): el glifo de categoría dentro del
 * contenedor redondeado teñido con el color del dominio (`--fk-dom-*` al
 * 14% de fondo, glifo al 100%). Hermana de `tejaMarca()` (infra/marcas.js):
 * marca = glifo sobre color corporativo, categoría = glifo sobre tinte de
 * su sección; la geometría del contenedor es la misma.
 *
 * El color vive en CSS (.cat-teja[data-dom="..."], atoms.css): aquí solo se
 * declara a qué dominio pertenece la superficie. Dentro de la teja
 * currentColor ES el color del dominio, así que la chispa de los símbolos
 * v2 cae a él sin declarar --fk-icon-dot.
 *
 * @param {string} id      - id completo del symbol (ej: 'c-mercado')
 * @param {string} dominio - sufijo de token de dominio: 'gastos',
 *                           'ingresos', 'presupuesto', 'compromisos',
 *                           'personales', 'metas', 'tesoreria', 'ahorro',
 *                           'inversion' o 'analisis'
 * @returns {string} HTML del span `.cat-teja`.
 */
export function tejaCategoria(id, dominio) {
  return `<span class="cat-teja" data-dom="${dominio}" aria-hidden="true">${iconoCategoria(id)}</span>`;
}

/**
 * Dominios del lote P4 (ADR 033 D3, DV.2d): cada uno tiene una ilustración
 * en assets/svg/ilustraciones/ pendiente de arte final (data-placeholder).
 * Mientras el placeholder siga fuera del sprite, `document.getElementById`
 * no la encuentra y `emptyArt()` sigue devolviendo la composición geométrica.
 */
const DOMINIOS_CON_ILUSTRACION = new Set([
  'ahorro', 'apartados', 'cuentas', 'deudas',
  'inversion', 'metas', 'personales', 'recurring',
]);

/**
 * Ilustración para empty states (rediseño 2026, F7; DV.2d).
 *
 * Si el sprite ya trae el symbol `il-<id>` (arte final de Esteban
 * reemplazó el placeholder y sync-sprite.py lo integró), la usa tal
 * cual, sin composición adicional. Si no, cae a la ilustración
 * geométrica original: círculo de fondo sutil, órbita punteada, puntos
 * decorativos flotantes y el icono del dominio centrado. Todo el color
 * vive en CSS (.empty-art__* en atoms.css) o en roles de token dentro
 * del propio SVG de ilustración, cero estilos inline; la animación de
 * órbita/flotado también es CSS y respeta prefers-reduced-motion.
 *
 * @param {string} id - nombre del symbol sin '#i-' (ej: 'metas', 'ahorro')
 * @returns {string}
 */
export function emptyArt(id) {
  if (DOMINIOS_CON_ILUSTRACION.has(id) && document.getElementById(`il-${id}`)) {
    return `<svg class="empty-art" viewBox="0 0 120 120" aria-hidden="true"><use href="#il-${id}"/></svg>`;
  }
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
