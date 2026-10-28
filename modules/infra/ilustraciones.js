/**
 * infra/ilustraciones.js - el catálogo de dibujos del niño, Tino y el frasco
 * (APR.3b, ADR 093 D7 y D8; Tino, ADR 094 y 095).
 *
 * Funciones puras que devuelven HTML de `<svg><use href="#il-*"/></svg>`
 * contra el sprite de index.html (pipeline `il-`, scripts/sync-sprite.py).
 * Las comparten el perfil niño, el alta del niño en Ajustes y la lección:
 * como ningún dominio importa a otro (ADN 10), viven acá.
 *
 * Nunca fotos ni emojis (D8): cada meta y cada avatar es un dibujo de este
 * catálogo. Tino nunca aparece en el perfil adulto (D7).
 */

import { esc } from './utils.js';

/**
 * @typedef {Object} Dibujo
 * @property {string} id      - sufijo del símbolo `il-<id>`.
 * @property {string} nombre  - texto visible y nombre accesible.
 * @property {string} dominio - sufijo de `--fk-dom-*`: el color del dibujo y
 *                              de la teja que lo aloja.
 * @property {string} [dominioB] - segundo color, para los dibujos que lo usan.
 */

/** Metas y avatares del niño, en el orden del diseño. @type {Dibujo[]} */
export const DIBUJOS = [
  { id: 'balon',     nombre: 'Balón',      dominio: 'tesoreria' },
  { id: 'libro',     nombre: 'Libro',      dominio: 'tesoreria' },
  { id: 'bici',      nombre: 'Bicicleta',  dominio: 'gastos' },
  { id: 'tenis',     nombre: 'Tenis',      dominio: 'metas' },
  { id: 'cometa',    nombre: 'Cometa',     dominio: 'personales', dominioB: 'presupuesto' },
  { id: 'colores',   nombre: 'Colores',    dominio: 'gastos' },
  { id: 'audifonos', nombre: 'Audífonos',  dominio: 'inversion' },
  { id: 'patineta',  nombre: 'Patineta',   dominio: 'ahorro' },
];

/** Las cinco poses de Tino (094 D5): nunca triste. @type {readonly string[]} */
export const POSES_TINO = Object.freeze(['saluda', 'explica', 'celebra', 'celebra-grande', 'anima']);

/**
 * @param {string} id
 * @returns {Dibujo | null}
 */
export function dibujoPorId(id) {
  return DIBUJOS.find(d => d.id === id) ?? null;
}

/**
 * Un dibujo del catálogo. Con `etiqueta` es una imagen con nombre; sin ella,
 * decorativo (el texto de al lado ya lo nombra).
 *
 * @param {string} id
 * @param {{ tamano?: number, etiqueta?: string | null }} [opciones]
 * @returns {string} HTML; `''` si el id no está en el catálogo.
 */
export function htmlDibujo(id, { tamano = 48, etiqueta = null } = {}) {
  const d = dibujoPorId(id);
  if (!d) return '';
  const colores = `--il-a: var(--fk-dom-${d.dominio})${d.dominioB ? `; --fk-il-b: var(--fk-dom-${d.dominioB})` : ''}`;
  const a11y = etiqueta ? `role="img" aria-label="${esc(etiqueta)}"` : 'aria-hidden="true"';
  return `<svg class="il" width="${tamano}" height="${tamano}" viewBox="0 0 64 64" style="${colores}" ${a11y}><use href="#il-${d.id}"/></svg>`;
}

/**
 * Tino en una de sus poses. Decorativo: lo que dice va en el texto de al
 * lado. Trae sus colores por rol (`--fk-tino-*`, 095 D2); el tono de la
 * pose lo pone el panel que lo rodea (094 D3).
 *
 * @param {string} pose
 * @param {{ tamano?: number }} [opciones]
 * @returns {string}
 */
export function htmlTino(pose, { tamano = 96 } = {}) {
  const p = POSES_TINO.includes(pose) ? pose : 'saluda';
  return `<span class="tino" style="width:${tamano}px;height:${tamano}px" aria-hidden="true"><svg viewBox="0 0 120 120"><use href="#il-tino-${p}"/></svg></span>`;
}

/** Altura útil del frasco en su retícula 88x104: del fondo (y 86) a la boca (y 24). */
const _FONDO = 86;
const _BOCA = 24;

/**
 * El relleno del frasco para una proporción de 0 a 1 contra la meta de ESE
 * frasco (R60). Vacío no dibuja nada; lleno redondea los hombros.
 *
 * @param {number} proporcion
 * @returns {string} el atributo `d` del relleno, o `''` si está vacío.
 */
export function rellenoFrasco(proporcion) {
  const p = Math.min(1, Math.max(0, Number(proporcion) || 0));
  if (p === 0) return '';
  const base = 'V86 Q68 96 58 96 H30 Q20 96 20 86 Z';
  if (p === 1) return `M20 30 Q20 24 26 24 H62 Q68 24 68 30 ${base}`;
  const y = Math.round((_FONDO - p * (_FONDO - _BOCA)) * 10) / 10;
  return `M20 ${y} H68 ${base}`;
}

/** Color de cada frasco (D5): hues de dominio que ya existen. */
const _COLOR_FRASCO = {
  ahorrar: 'var(--fk-kid-ahorrar, var(--fk-dom-ahorro))',
  gastar: 'var(--fk-kid-gastar, var(--fk-dom-gastos))',
  compartir: 'var(--fk-kid-compartir, var(--fk-dom-personales))',
};

/**
 * Un frasco con su relleno. Ningún color va solo (R49): quien lo usa pone al
 * lado el nombre y el monto; la etiqueta es para quien no ve el dibujo.
 *
 * @param {'ahorrar'|'gastar'|'compartir'} frasco
 * @param {number} proporcion - 0 a 1 contra la meta del frasco.
 * @param {{ etiqueta?: string | null, ancho?: number }} [opciones]
 * @returns {string}
 */
export function htmlFrasco(frasco, proporcion, { etiqueta = null, ancho = 76 } = {}) {
  const color = _COLOR_FRASCO[frasco] ?? _COLOR_FRASCO.ahorrar;
  const d = rellenoFrasco(proporcion);
  const alto = Math.round(ancho * 104 / 88);
  const a11y = etiqueta ? `role="img" aria-label="${esc(etiqueta)}"` : 'aria-hidden="true"';
  return `<svg class="frasco" width="${ancho}" height="${alto}" viewBox="0 0 88 104" style="--il-a: ${color}" ${a11y}>`
    + '<use href="#il-frasco"/>'
    + (d ? `<path d="${d}" fill="currentColor"/>` : '')
    + '<use href="#il-frasco-borde"/></svg>';
}

/**
 * Los ocho destellos estáticos de la celebración del niño (D9), escalonados
 * con `--i` (styles/components/nino.css). Decorativos.
 *
 * @returns {string}
 */
export function htmlDestellos() {
  return Array.from({ length: 8 }, (_, i) =>
    `<i class="destellos__punto" style="--i:${i}" aria-hidden="true"></i>`).join('');
}
