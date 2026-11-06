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
 * catálogo. Desde el ADR 127 (D6) Tino también acompaña al adulto, con los
 * dibujos originales del personaje (`htmlTinoSol`), nunca con una versión
 * redibujada.
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

/**
 * Las poses del dibujo original de Tino (ADR 127 D6), una por archivo en
 * `assets/tino/`: los SVG que entregó Esteban, sin cambiar un trazo (solo se
 * quitó el envoltorio de metadatos de Illustrator). `tino` es la pose base.
 * Cada una con su lienzo, para reservar el alto sin saltos al cargar.
 */
export const TINO_ORIGINAL = Object.freeze({
  tino:             { ancho: 637, alto: 957 },
  saluda:           { ancho: 662, alto: 1004 },
  explica:          { ancho: 651, alto: 987 },
  celebra:          { ancho: 649, alto: 998 },
  'celebra-grande': { ancho: 755, alto: 1001 },
  anima:            { ancho: 693, alto: 1022 },
  // ADR 129: las poses de la ronda 2, para los vacíos y avisos que no tenían la suya.
  pensando:         { ancho: 499, alto: 747 },
  reserva:          { ancho: 518, alto: 799 },
  sembrar:          { ancho: 881, alto: 713 },
  compartir:        { ancho: 1103, alto: 748 },
  'con-lupa':       { ancho: 479, alto: 717 },
  'con-calendario': { ancho: 619, alto: 738 },
  'meta-cumplida':  { ancho: 978, alto: 781 },
  tranquilo:        { ancho: 1240, alto: 727 },
});

/**
 * Tino del adulto (ADR 127 D6): el dibujo original sobre su sol, un disco
 * crema fijo en los dos temas (como la teja del isotipo, ADR 103 D2), así
 * el personaje conserva sus colores de siempre también en el tema oscuro.
 * Decorativo: lo que dice va en el texto de al lado.
 *
 * @param {string} pose - clave de TINO_ORIGINAL; otra cae en `saluda`.
 * @param {{ tamano?: number, clase?: string }} [opciones] - diámetro del sol en px.
 * @returns {string}
 */
export function htmlTinoSol(pose, { tamano = 112, clase = '' } = {}) {
  const p = Object.hasOwn(TINO_ORIGINAL, pose) ? pose : 'saluda';
  const { ancho, alto } = TINO_ORIGINAL[p];
  const archivo = p === 'tino' ? 'tino' : `tino-${p}`;
  const encaje = encajeTinoSol(ancho, alto);
  const forma = encaje ? ' tino-sol--ancho' : '';
  const medidas = encaje ? `;--tino-ancho:${encaje.ancho}%;--tino-base:${encaje.base}%` : '';
  return `<span class="tino-sol${forma}${clase ? ` ${esc(clase)}` : ''}" style="--tino-sol:${Number(tamano) || 112}px${medidas}" data-pose="${p}" aria-hidden="true">`
    + `<img class="tino-sol__img" src="assets/tino/${archivo}.svg" alt="" width="${ancho}" height="${alto}" decoding="async" draggable="false"></span>`;
}

/**
 * Cómo cabe en el sol un dibujo más ancho que alto (ADR 129 D2): Tino
 * acostado, sembrando o con otro animal al lado. De pie, el dibujo va al 86 %
 * del alto y apoyado abajo (CSS); a lo ancho, eso lo sacaría del disco. Acá
 * la caja del dibujo se mide para que sus esquinas casi toquen el borde del
 * círculo (las esquinas de estos dibujos son vacías, por eso el 6 % de más) y
 * se centra un poco por debajo de la mitad, donde el sol es más ancho.
 *
 * @param {number} ancho - del lienzo original.
 * @param {number} alto
 * @returns {{ ancho: number, base: number } | null} en % del diámetro; `null`
 *   si el dibujo es de pie.
 */
export function encajeTinoSol(ancho, alto) {
  const r = Number(ancho) / Number(alto);
  if (!(r > 1)) return null;
  const w = Math.min(0.92, 1.06 / Math.sqrt(1 + 1 / (r * r)));
  const base = (1 - w / r) / 2 - 0.02;
  return { ancho: Math.round(w * 1000) / 10, base: Math.round(base * 1000) / 10 };
}

/** Altura útil del frasco en su retícula 88x104: del fondo (y 86) a la boca (y 24). */
const _FONDO = 86;
const _BOCA = 24;

/**
 * El relleno del frasco para una proporción de 0 a 1 contra la meta de ESE
 * frasco (R60). Vacío no dibuja nada; lleno redondea los hombros. Sin uso en
 * la app desde el ADR 131 (el vidrio ya no lleva tinte).
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
 * Los granos de café que llenan el frasco (ADR 128), de abajo hacia arriba:
 * centro y giro de cada uno en la retícula 88x104. Filas de tres y de dos,
 * trabadas como granos que caen, dentro del relleno (x 20 a 68, fondo en
 * y 96). El giro varía para que el montón no se lea como una rejilla.
 * @type {ReadonlyArray<{ x: number, y: number, giro: number }>}
 */
export const GRANOS_FRASCO = Object.freeze([
  { x: 28, y: 89, giro: -18 }, { x: 44, y: 89, giro: 12 }, { x: 60, y: 89, giro: -8 },
  { x: 36, y: 80.5, giro: 22 }, { x: 52, y: 80.5, giro: -14 },
  { x: 28, y: 72, giro: 6 }, { x: 44, y: 72, giro: -20 }, { x: 60, y: 72, giro: 16 },
  { x: 36, y: 63.5, giro: -10 }, { x: 52, y: 63.5, giro: 18 },
  { x: 28, y: 55, giro: 14 }, { x: 44, y: 55, giro: -6 }, { x: 60, y: 55, giro: -22 },
  { x: 36, y: 46.5, giro: -16 }, { x: 52, y: 46.5, giro: 8 },
  { x: 28, y: 38, giro: 10 }, { x: 44, y: 38, giro: -12 }, { x: 60, y: 38, giro: 20 },
  { x: 36, y: 29.5, giro: -6 }, { x: 52, y: 29.5, giro: 14 },
].map(Object.freeze));

/** Medida del grano en la retícula del frasco (el símbolo `il-cafe` es 20x14). */
const _GRANO_ANCHO = 15;
const _GRANO_ALTO = 10.5;

/**
 * Los granos que caben hasta el nivel de una proporción: entra cada grano
 * cuyo centro queda bajo la superficie (con medio grano de holgura, así el
 * montón asoma un poco sobre el tinte). Con algo de dinero, aunque sea
 * poco, se ve la primera fila: el llenado mínimo (5 %) ya la alcanza.
 *
 * @param {number} proporcion - 0 a 1 contra la meta del frasco.
 * @returns {typeof GRANOS_FRASCO[number][]}
 */
export function granosFrasco(proporcion) {
  const p = Math.min(1, Math.max(0, Number(proporcion) || 0));
  if (p === 0) return [];
  const nivel = _FONDO - p * (_FONDO - _BOCA);
  return GRANOS_FRASCO.filter(g => g.y >= nivel + 2.5);
}

/** Un grano (o su hueco) en su sitio del frasco. */
function _usoGrano(simbolo, g) {
  return `<use href="#${simbolo}" x="${g.x - _GRANO_ANCHO / 2}" y="${g.y - _GRANO_ALTO / 2}" width="${_GRANO_ANCHO}" height="${_GRANO_ALTO}" transform="rotate(${g.giro} ${g.x} ${g.y})"/>`;
}

/**
 * Un frasco de vidrio con los granos de café de Tino (ADR 128 y 131): el
 * vidrio es transparente, sin líquido ni tinte, y el color del frasco va en
 * su tapa. Con `huecos`, el frasco lleno es la referencia (la mesada de
 * Gastar o Compartir) y cada grano que falta deja su hueco punteado: el
 * niño ve lo que usó. Sin `huecos` (Ahorrar), arriba queda vidrio libre para
 * seguir guardando. Ningún color va solo (R49): quien lo usa pone al lado el
 * nombre y el monto; la etiqueta es para quien no ve el dibujo.
 *
 * @param {'ahorrar'|'gastar'|'compartir'} frasco
 * @param {number} proporcion - 0 a 1 contra la referencia del frasco.
 * @param {{ etiqueta?: string | null, ancho?: number, huecos?: boolean }} [opciones]
 * @returns {string}
 */
export function htmlFrasco(frasco, proporcion, { etiqueta = null, ancho = 76, huecos = false } = {}) {
  const color = _COLOR_FRASCO[frasco] ?? _COLOR_FRASCO.ahorrar;
  const alto = Math.round(ancho * 104 / 88);
  const a11y = etiqueta ? `role="img" aria-label="${esc(etiqueta)}"` : 'aria-hidden="true"';
  const llenos = new Set(granosFrasco(proporcion));
  const granos = GRANOS_FRASCO.map(g => {
    if (llenos.has(g)) return _usoGrano('il-cafe', g);
    return huecos ? _usoGrano('il-cafe-hueco', g) : '';
  }).join('');
  return `<svg class="frasco" width="${ancho}" height="${alto}" viewBox="0 0 88 104" style="--il-a: ${color}" ${a11y}>`
    + '<use href="#il-frasco"/>'
    + granos
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
