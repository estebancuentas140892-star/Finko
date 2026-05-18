/**
 * infra/svg.js — helpers puros para generar SVG inline.
 *
 * Sin DOM, sin librerías. Cada función devuelve un string `<svg>…</svg>`
 * listo para inyectar vía innerHTML. Probada en Node/Vitest sin happy-dom.
 */

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
 * @param {number} [opts.width=200]    — Ancho del viewBox.
 * @param {number} [opts.height=60]    — Alto del viewBox.
 * @param {string} [opts.color='currentColor'] — Color del trazo.
 * @param {number} [opts.padding=4]    — Margen interno.
 * @param {boolean}[opts.area=true]    — Renderizar relleno bajo la línea.
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

  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${_esc(ariaLabel)}" class="sparkline" preserveAspectRatio="none">
    ${area ? `<path d="${areaPath}" fill="${color}" fill-opacity="0.15" stroke="none"/>` : ''}
    <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${lastPx.toFixed(1)}" cy="${lastPy.toFixed(1)}" r="2.5" fill="${color}"/>
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

// ── PALETA ───────────────────────────────────────────────────────

/**
 * Paleta fija de 7 colores accesibles para categorías.
 * El último (slate) se reserva semánticamente para "Otros".
 */
export const PALETA_CATEGORIAS = [
  '#00dc82', // verde accent — finko brand
  '#3b82f6', // azul
  '#f59e0b', // ámbar
  '#ef4444', // rojo
  '#a855f7', // violeta
  '#06b6d4', // cyan
  '#94a3b8', // slate — "Otros" / fallback
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

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
