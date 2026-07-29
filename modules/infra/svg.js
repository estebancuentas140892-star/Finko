/**
 * infra/svg.js - helpers puros para generar SVG inline.
 *
 * Sin DOM, sin librerías. Cada función devuelve un string `<svg>…</svg>`
 * listo para inyectar vía innerHTML. Probada en Node/Vitest sin happy-dom.
 */

import { esc as _esc } from './utils.js';

// ── SPARKLINE ────────────────────────────────────────────────────

/**
 * Genera una sparkline (mini-gráfico de línea) a partir de un array de valores.
 *
 * El path se normaliza al rango [min, max] del propio array. Si todos los
 * valores son iguales, dibuja una línea horizontal centrada. Si el array
 * tiene un solo valor, dibuja un punto.
 *
 * @param {number[]} valores
 * @param {Object} [opts]
 * @param {number} [opts.width=200]    - Ancho del viewBox.
 * @param {number} [opts.height=60]    - Alto del viewBox.
 * @param {string} [opts.color='currentColor'] - Color del trazo.
 * @param {number} [opts.padding=4]    - Margen interno.
 * @param {boolean}[opts.area=true]    - Renderizar relleno bajo la línea.
 * @param {string} [opts.ariaLabel='Tendencia']
 * @returns {string} SVG completo, o cadena vacía si no hay datos.
 */
export function sparkline(valores, opts = {}) {
  const {
    width      = 200,
    height     = 60,
    color      = 'currentColor',
    padding    = 4,
    area       = true,
    ariaLabel  = 'Tendencia',
  } = opts;

  if (!Array.isArray(valores) || valores.length === 0) return '';

  // Caso degenerado: un solo punto.
  if (valores.length === 1) {
    const cx = width / 2;
    const cy = height / 2;
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${_esc(ariaLabel)}" class="sparkline" preserveAspectRatio="none"><circle cx="${cx}" cy="${cy}" r="3" fill="${color}"/></svg>`;
  }

  const max     = Math.max(...valores);
  const min     = Math.min(...valores);
  const range   = max - min;
  const innerW  = width  - padding * 2;
  const innerH  = height - padding * 2;
  const stepX   = innerW / (valores.length - 1);

  const points = valores.map((v, i) => {
    const x = padding + i * stepX;
    // Si todos los valores son iguales, centramos en mitad del alto.
    const y = range === 0
      ? height / 2
      : padding + innerH - ((v - min) / range) * innerH;
    return [x, y];
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

  const baseY    = padding + innerH;
  const firstX   = points[0][0];
  const lastX    = points[points.length - 1][0];
  const areaPath = `${linePath} L${lastX.toFixed(1)},${baseY} L${firstX.toFixed(1)},${baseY} Z`;

  // Marcador en el último punto.
  const [lastPx, lastPy] = points[points.length - 1];

  // DIS.10 (C4, regla R27): el SVG se estira al ancho del contenedor, así que
  // el trazo y el marcador se declaran inmunes a la escala. Sin
  // `non-scaling-stroke` la línea salía más delgada en los tramos planos que
  // en las subidas (medido: 1,08px contra 2px) y el marcador, un `<circle>`
  // relleno, salía como elipse. El punto es ahora un subpath de longitud cero
  // con tapa redonda: el diámetro lo fija `stroke-width`, no la escala.
  const marcador = `M${lastPx.toFixed(1)},${lastPy.toFixed(1)}L${lastPx.toFixed(1)},${lastPy.toFixed(1)}`;

  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${_esc(ariaLabel)}" class="sparkline" preserveAspectRatio="none">
    ${area ? `<path d="${areaPath}" fill="${color}" fill-opacity="0.15" stroke="none"/>` : ''}
    <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    <path d="${marcador}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

// ── DONUT ────────────────────────────────────────────────────────

/**
 * Genera un donut chart a partir de segmentos con valor y color.
 *
 * Implementación clásica: cada segmento es un `<circle>` separado que
 * usa stroke-dasharray para mostrar solo su porción del círculo, y
 * stroke-dashoffset para posicionarlo.
 *
 * @param {Array<{label: string, valor: number, color: string}>} segmentos
 * @param {Object} [opts]
 * @param {number} [opts.size=140]
 * @param {number} [opts.strokeWidth=20]
 * @param {string} [opts.ariaLabel='Distribución']
 * @returns {string} SVG completo, o cadena vacía si no hay datos válidos.
 */
export function donut(segmentos, opts = {}) {
  const { size = 140, strokeWidth = 20, ariaLabel = 'Distribución' } = opts;

  if (!Array.isArray(segmentos) || segmentos.length === 0) return '';

  const total = segmentos.reduce((acc, s) => acc + (Number(s.valor) || 0), 0);
  if (total <= 0) return '';

  const radius        = (size - strokeWidth) / 2;
  const cx            = size / 2;
  const cy            = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = segmentos
    .filter(s => Number(s.valor) > 0)
    .map(s => {
      const length = (Number(s.valor) / total) * circumference;
      const arc = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${s.color}" stroke-width="${strokeWidth}" stroke-dasharray="${length.toFixed(2)} ${(circumference - length).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"><title>${_esc(s.label)}</title></circle>`;
      offset += length;
      return arc;
    })
    .join('');

  return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${_esc(ariaLabel)}" class="donut">
    ${arcs}
  </svg>`;
}

// ── ANILLO DE PROGRESO ───────────────────────────────────────────

/**
 * Genera un anillo de progreso (gauge circular) para un porcentaje 0-100.
 *
 * Mismo principio que donut(): un track completo y un arco con
 * stroke-dasharray, rotado -90° para empezar arriba. Los colores no van
 * inline: viven en CSS (.progress-ring__track / .progress-ring__bar);
 * el arco usa currentColor, así el contexto decide el color (dominio,
 * estado, etc.). Con pct=0 no se emite el arco: stroke-linecap="round"
 * dibujaría un punto visible aun con longitud cero.
 *
 * El arco usa pathLength="100": normaliza la circunferencia a 100 unidades
 * sin importar el tamaño real. Así dashoffset = 100 - pct para cualquier
 * anillo, y el CSS anima el llenado de entrada con un keyframe genérico
 * (from: dashoffset 100 = oculto; el valor final lo fija el atributo del
 * SVG). Ver .progress-ring__bar en atoms.css.
 *
 * @param {number} porcentaje - 0 a 100; fuera de rango se recorta.
 * @param {Object} [opts]
 * @param {number}  [opts.size=64]       - Lado del viewBox (cuadrado).
 * @param {number}  [opts.strokeWidth=6] - Grosor del track y el arco.
 * @param {boolean} [opts.conLabel=true] - Porcentaje centrado en el anillo.
 * @param {string}  [opts.ariaLabel]     - Default: "Progreso: N%".
 * @returns {string} SVG completo.
 */
export function progressRing(porcentaje, opts = {}) {
  const { size = 64, strokeWidth = 6, conLabel = true, etiqueta } = opts;

  const pct       = Math.max(0, Math.min(100, Number(porcentaje) || 0));
  const pctLabel  = Math.round(pct);
  const ariaLabel = opts.ariaLabel ?? `Progreso: ${pctLabel}%`;

  const radius = (size - strokeWidth) / 2;
  const cx     = size / 2;
  const cy     = size / 2;

  const barHtml = pct > 0
    ? `<circle class="progress-ring__bar" cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${(100 - pct).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`
    : '';

  const displayLabel = etiqueta !== undefined ? _esc(String(etiqueta)) : `${pctLabel}%`;
  const labelHtml = conLabel
    ? `<text class="progress-ring__label" x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${Math.round(size * 0.26)}">${displayLabel}</text>`
    : '';

  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${_esc(ariaLabel)}" class="progress-ring">
    <circle class="progress-ring__track" cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke-width="${strokeWidth}"/>
    ${barHtml}
    ${labelHtml}
  </svg>`;
}

// ── ARCO DE PROGRESO (medidor semicircular) ──────────────────────

/** Geometría del semicírculo: un solo path, reutilizado por track y arco. */
const _ARCO_D    = 'M 18 120 A 102 102 0 0 1 222 120';
const _ARCO_GROSOR = 14;

/**
 * Medidor semicircular de progreso 0-100 (DIS.14, arquitectura A2 de Metas).
 *
 * Hermano de `progressRing()` y con las mismas reglas: track completo, arco
 * con `pathLength="100"` para que `dashoffset = 100 - pct` sirva a cualquier
 * escala, colores por CSS (`.progress-arc__track` / `.progress-arc__bar`, con
 * el arco en `currentColor`, así el contexto decide el color) y sin arco con
 * `pct = 0`, porque `stroke-linecap="round"` dibujaría un punto visible con
 * longitud cero.
 *
 * La diferencia con el anillo no es de estilo: el centro del semicírculo
 * queda libre, y ahí va el ícono de lo que se persigue. El objetivo deja de
 * ser un número que compite con lo acumulado y pasa a ser el extremo derecho
 * de la escala, que la vista rotula fuera del SVG.
 *
 * El `<text>` del porcentaje va `aria-hidden` (regla R11): lo anuncia el
 * `aria-label` del SVG, con el nombre de la meta incluido.
 *
 * @param {number} porcentaje - 0 a 100; fuera de rango se recorta.
 * @param {Object} [opts]
 * @param {boolean} [opts.conLabel=true] - Porcentaje bajo el centro del arco.
 * @param {string}  [opts.ariaLabel]     - Default: "Progreso: N%".
 * @returns {string} SVG completo.
 */
export function arcoProgreso(porcentaje, opts = {}) {
  const { conLabel = true } = opts;

  const pct       = Math.max(0, Math.min(100, Number(porcentaje) || 0));
  const pctLabel  = Math.round(pct);
  const ariaLabel = opts.ariaLabel ?? `Progreso: ${pctLabel}%`;

  const barHtml = pct > 0
    ? `<path class="progress-arc__bar" d="${_ARCO_D}" fill="none" stroke-width="${_ARCO_GROSOR}" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${(100 - pct).toFixed(2)}"/>`
    : '';

  const labelHtml = conLabel
    ? `<text class="progress-arc__label" x="120" y="114" text-anchor="middle" font-size="17" aria-hidden="true">${pctLabel}%</text>`
    : '';

  return `<svg viewBox="0 0 240 132" role="img" aria-label="${_esc(ariaLabel)}" class="progress-arc">
    <path class="progress-arc__track" d="${_ARCO_D}" fill="none" stroke-width="${_ARCO_GROSOR}" stroke-linecap="round"/>
    ${barHtml}
    ${labelHtml}
  </svg>`;
}

// ── PALETA ───────────────────────────────────────────────────────

/**
 * Paleta fija de 7 colores accesibles para categorías.
 * El último (slate) se reserva semánticamente para "Otros".
 *
 * DIS.10 (C5, regla R28): ningún color con significado de dirección de dinero
 * entra a la paleta. Salieron el verde de la marca (`#00dc82`, que pintaba
 * siempre la categoría con más gasto) y el rojo de peligro (`#ef4444`, que
 * aparecía desde la cuarta categoría): en el resto de la app el verde es
 * ingreso o logro y el rojo es deuda o exceso, y esta misma sección declara
 * que subir el gasto nunca se pinta de rojo (ADR 019 / IV.3 / ANL.2c).
 */
export const PALETA_CATEGORIAS = [
  '#3b82f6', // azul
  '#a855f7', // violeta
  '#06b6d4', // cyan
  '#f59e0b', // ámbar
  '#14b8a6', // teal
  '#ec4899', // rosa
  '#94a3b8', // slate - "Otros" / fallback
];

/**
 * Asigna un color de la paleta a cada segmento por su posición (0-indexed).
 * El último segmento usa el color reservado (slate) si su label es "Otros".
 *
 * @param {Array<{categoria:string, total:number, pct:number}>} segmentos
 * @returns {Array<{label:string, valor:number, color:string, pct:number}>}
 */
export function colorearSegmentos(segmentos) {
  return segmentos.map((s, i) => {
    const esOtros = s.categoria === 'Otros';
    const color = esOtros
      ? PALETA_CATEGORIAS[PALETA_CATEGORIAS.length - 1]
      : PALETA_CATEGORIAS[i % (PALETA_CATEGORIAS.length - 1)];
    return {
      label: s.categoria,
      valor: s.total,
      pct:   s.pct,
      color,
    };
  });
}

// ── HELPER ───────────────────────────────────────────────────────

