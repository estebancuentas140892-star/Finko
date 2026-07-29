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

// ── SILUETA QUE SE LLENA ─────────────────────────────────────────

/**
 * Geometría de las diez siluetas de meta (DIS.19). Todas en el mismo lienzo de
 * 24x24 del sprite y todas **cerradas**: un trazo abierto no se puede rellenar
 * por altura sin que el nivel se lea como un error de dibujo.
 *
 * Derivadas de los glifos que `CATEGORIA_META_ICONO` ya resuelve, así que la
 * meta se sigue reconociendo igual; lo que cambia es que ahora también mide.
 * El mapeo categoría a forma vive en `core/constants.js`
 * (`CATEGORIA_META_SILUETA`): esto es solo el dibujo.
 */
export const SILUETAS = {
  avion:      'M12 2.9c1.05 0 1.75 1.5 1.75 3.3v3.5l6.75 3.9v2.4l-6.75-2v3.4l1.95 1.6v2.1L12 20l-3.7 1.1V19l1.95-1.6V14l-6.75 2v-2.4l6.75-3.9V6.2c0-1.8.7-3.3 1.75-3.3z',
  hogar:      'M12 2.6 21.4 11v9.1a1.7 1.7 0 0 1-1.7 1.7h-4.5v-6.3h-6.4v6.3H4.3a1.7 1.7 0 0 1-1.7-1.7V11z',
  carro:      'M2.8 17.3v-2.9a1.9 1.9 0 0 1 1.35-1.82l1.75-.53 2.5-3.35A3 3 0 0 1 10.8 7.5h4.1a3 3 0 0 1 2.1.86l2.9 2.84 1.5.5a1.9 1.9 0 0 1 1.3 1.8v3.8a1.2 1.2 0 0 1-1.2 1.2h-1.3a2.55 2.55 0 0 0-5.1 0H9.3a2.55 2.55 0 0 0-5.1 0H4a1.2 1.2 0 0 1-1.2-1.2z',
  computador: 'M4.3 5.6h15.4v9.2H4.3zm-2.6 10.6h20.6l-1.1 2.3a1.6 1.6 0 0 1-1.45.9H4.25a1.6 1.6 0 0 1-1.45-.9z',
  telefono:   'M8.1 2.7h7.8a2.4 2.4 0 0 1 2.4 2.4v13.8a2.4 2.4 0 0 1-2.4 2.4H8.1a2.4 2.4 0 0 1-2.4-2.4V5.1a2.4 2.4 0 0 1 2.4-2.4z',
  libro:      'M12 6.4c-1.9-1.6-4.3-2.3-7.2-2.3a1.4 1.4 0 0 0-1.4 1.4v11.6a1.4 1.4 0 0 0 1.4 1.4c2.9 0 5.3.7 7.2 2.3 1.9-1.6 4.3-2.3 7.2-2.3a1.4 1.4 0 0 0 1.4-1.4V5.5a1.4 1.4 0 0 0-1.4-1.4c-2.9 0-5.3.7-7.2 2.3z',
  anillo:     'M12 8.2a6.4 6.4 0 1 1 0 12.8 6.4 6.4 0 0 1 0-12.8zm0 3.1a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6zM12 2.6 15.1 7H8.9z',
  biberon:    'M9.6 2.7h4.8v1.7a2.2 2.2 0 0 1-.9 1.77l-.4.3v1.36h1.3a2.3 2.3 0 0 1 2.3 2.3v9.4a2.3 2.3 0 0 1-2.3 2.3H9.6a2.3 2.3 0 0 1-2.3-2.3v-9.4a2.3 2.3 0 0 1 2.3-2.3h1.3V6.44l-.4-.3a2.2 2.2 0 0 1-.9-1.77z',
  cohete:     'M12 2.4c2.6 2.6 4.1 6 4.1 9.7l2.4 2.9v3.1l-3.3-1.6-.9 3.4h-4.6l-.9-3.4-3.3 1.6v-3.1l2.4-2.9c0-3.7 1.5-7.1 4.1-9.7z',
  caja:       'M7.33 4.05h9.34A1.7 1.7 0 0 1 18.2 5L20 8.6v10.2a1.9 1.9 0 0 1-1.9 1.9H5.9A1.9 1.9 0 0 1 4 18.8V8.6L5.8 5a1.7 1.7 0 0 1 1.53-.95z',
  // La gota no es categoría de meta: mide el compromiso del mes en el fondo
  // (DIS.19, item 7). Vive acá porque se llena igual que las otras y así hay
  // una sola implementación del relleno por altura, no dos.
  gota:       'M12 2.5c4.2 4.6 6.8 8.4 6.8 11.6a6.8 6.8 0 0 1-13.6 0c0-3.2 2.6-7 6.8-11.6z',
};

/** Lado del lienzo de las siluetas. El mismo del sprite. */
const _SILUETA_LADO = 24;

/**
 * Silueta de una meta llena hasta su porcentaje (DIS.19).
 *
 * Hermana de `progressRing()` y `arcoProgreso()`, con las mismas reglas: los
 * colores viven en CSS (`.silueta__*`), el porcentaje se recorta al rango y el
 * `<svg>` lleva su propio `role="img"` con la etiqueta que arma el llamador.
 *
 * **Cómo se llena.** El agua es un `<rect>` que crece desde abajo y va recortado
 * por la propia silueta con un `<clipPath>`. La alternativa (tapar la parte seca
 * con un rectángulo del color del fondo) daba el mismo dibujo pero solo mientras
 * el contenedor tuviera exactamente ese color: al montar la silueta en un
 * carril con otro fondo, el rectángulo aparecía como un bloque. El recorte no
 * depende del contexto.
 *
 * El `<clipPath>` necesita un id único en el documento y hay varias siluetas en
 * pantalla a la vez, así que el llamador pasa la clave que ya identifica su
 * fila (el id de la meta). Sin `clave` no se emite el recorte: la silueta se
 * dibuja vacía en vez de rellenarse con el recorte de otra.
 *
 * @param {number} porcentaje - 0 a 100; fuera de rango se recorta.
 * @param {Object} opts
 * @param {string} opts.forma          - clave de `SILUETAS`. Sin coincidencia, la caja.
 * @param {string} opts.clave          - id único para el `<clipPath>` (ej. el id de la meta).
 * @param {string} [opts.ariaLabel]    - Default: "Progreso: N%".
 * @param {boolean}[opts.conLinea=true]- Línea del nivel donde termina el agua.
 * @param {boolean}[opts.decorativa=false] - Sin `role="img"` ni etiqueta: el
 *   dibujo no aporta información que el contexto no diga ya. Es lo correcto
 *   cuando la silueta acompaña a un medidor que ya anuncia el porcentaje (el
 *   arco de la tarjeta de meta) o va dentro de un botón con nombre propio (el
 *   carril de la casa de Ahorro). Emitir un `role="img"` dentro de un ancestro
 *   `aria-hidden` sería peor que no emitirlo: parecería el defecto que la regla
 *   R52 vino a corregir, con la etiqueta borrada sin que se note.
 * @returns {string} SVG completo.
 */
export function siluetaMeta(porcentaje, opts = {}) {
  const { forma, clave, conLinea = true, decorativa = false } = opts;

  const d        = SILUETAS[forma] ?? SILUETAS.caja;
  const pct      = Math.max(0, Math.min(100, Number(porcentaje) || 0));
  const pctLabel = Math.round(pct);
  const ariaLabel = opts.ariaLabel ?? `Progreso: ${pctLabel}%`;
  const semantica = decorativa
    ? 'aria-hidden="true" focusable="false"'
    : `role="img" aria-label="${_esc(ariaLabel)}"`;

  // Altura del agua contada desde arriba: con 0% el nivel está en el borde
  // inferior y con 100% en el superior.
  const nivel = Number((_SILUETA_LADO * (1 - pct / 100)).toFixed(2));
  const alto  = Number((_SILUETA_LADO - nivel).toFixed(2));

  const clipId  = clave ? `silueta-${_esc(String(clave))}` : '';
  const recorte = clipId ? ` clip-path="url(#${clipId})"` : '';

  const aguaHtml = (clipId && pct > 0)
    ? `<defs><clipPath id="${clipId}"><path d="${d}"/></clipPath></defs>
    <rect class="silueta__llena" x="0" y="${nivel}" width="${_SILUETA_LADO}" height="${alto}"${recorte}/>
    ${conLinea && pct < 100 ? `<line class="silueta__linea" x1="0" y1="${nivel}" x2="${_SILUETA_LADO}" y2="${nivel}"${recorte}/>` : ''}`
    : '';

  return `<svg viewBox="0 0 ${_SILUETA_LADO} ${_SILUETA_LADO}" ${semantica} class="silueta">
    <path class="silueta__vacia" d="${d}"/>
    ${aguaHtml}
    <path class="silueta__borde" d="${d}"/>
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

