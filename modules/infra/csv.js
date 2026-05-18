/**
 * infra/csv.js — parser y serializador CSV puro (RFC 4180 simplificado).
 *
 * Sin DOM, sin librerías. Tolerante a variantes comunes:
 * - Separador configurable (`,` por defecto, autodetecta `;` si el primero falla)
 * - Quote escaping con `""` dentro de campo entrecomillado
 * - BOM UTF-8 (`﻿`) al inicio se descarta
 * - Fin de línea LF, CRLF y CR
 * - Cells con saltos de línea internos dentro de quotes
 *
 * NO maneja: codificaciones distintas a UTF-8 (eso lo resuelve FileReader),
 * cuotes raras de Excel viejas (`'` simple), múltiples encabezados.
 */

const QUOTE = '"';

/**
 * Detecta el separador más probable mirando la primera línea no-vacía.
 * Compara cuántos `,` vs `;` aparecen FUERA de quotes — gana el de mayor cuenta.
 *
 * @param {string} text
 * @returns {','|';'} Separador detectado. Default `,`.
 */
export function detectarSeparador(text) {
  // Primera línea no-vacía, descartando BOM.
  const limpio = text.replace(/^﻿/, '');
  const fin = limpio.indexOf('\n');
  const primera = fin === -1 ? limpio : limpio.slice(0, fin);

  let comas = 0, puntoComas = 0;
  let enQuote = false;
  for (let i = 0; i < primera.length; i++) {
    const ch = primera[i];
    if (ch === QUOTE) { enQuote = !enQuote; continue; }
    if (enQuote) continue;
    if (ch === ',') comas++;
    else if (ch === ';') puntoComas++;
  }
  return puntoComas > comas ? ';' : ',';
}

/**
 * Parsea un texto CSV completo. Devuelve headers + filas como arrays de strings.
 * No interpreta tipos: todos los valores son strings (trim ligero, sin descartar).
 *
 * @param {string} text
 * @param {{ separador?: string }} [opts]
 * @returns {{ headers: string[], filas: string[][] }}
 */
export function parsearCSV(text, opts = {}) {
  if (typeof text !== 'string' || text.length === 0) {
    return { headers: [], filas: [] };
  }

  // Descartar BOM UTF-8 si está presente.
  const src = text.replace(/^﻿/, '');
  const sep = opts.separador ?? detectarSeparador(src);

  const todasFilas = _parsearTodasFilas(src, sep);
  if (todasFilas.length === 0) return { headers: [], filas: [] };

  const headers = todasFilas[0].map(h => h.trim());
  const filas   = todasFilas.slice(1)
    // Descartar filas completamente vacías (todos los campos en blanco).
    .filter(f => f.some(cell => cell.trim() !== ''));

  return { headers, filas };
}

/**
 * Convierte parsearCSV() en array de objetos usando los headers como keys.
 *
 * @param {string} text
 * @param {{ separador?: string }} [opts]
 * @returns {Array<Record<string, string>>}
 */
export function parsearCSVaObjetos(text, opts = {}) {
  const { headers, filas } = parsearCSV(text, opts);
  return filas.map(fila => {
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = (fila[i] ?? '').trim();
    }
    return obj;
  });
}

/**
 * Serializa un array de objetos a CSV. Headers se infieren de las keys del primer
 * objeto (o `headers` explícito). Aplica quoting solo cuando es necesario.
 *
 * @param {Array<Record<string, unknown>>} filas
 * @param {{ headers?: string[], separador?: string }} [opts]
 * @returns {string}
 */
export function serializarCSV(filas, opts = {}) {
  if (!Array.isArray(filas) || filas.length === 0) return '';

  const sep     = opts.separador ?? ',';
  const headers = opts.headers ?? Object.keys(filas[0] ?? {});

  const lineas = [
    headers.map(h => _escaparCelda(h, sep)).join(sep),
    ...filas.map(f =>
      headers.map(h => _escaparCelda(f[h] ?? '', sep)).join(sep)
    ),
  ];
  return lineas.join('\n');
}

// ── INTERNAS ─────────────────────────────────────────────────────

/**
 * Parser de bajo nivel. Devuelve TODAS las filas (incluyendo header).
 * Implementación con estado: itera carácter a carácter, gestiona quotes y saltos.
 */
function _parsearTodasFilas(text, sep) {
  const filas = [];
  let fila = [];
  let cell = '';
  let enQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const sig = text[i + 1];

    if (enQuote) {
      if (ch === QUOTE) {
        if (sig === QUOTE) {
          // Quote escapado: "" → "
          cell += QUOTE;
          i++;
        } else {
          enQuote = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    // Fuera de quote.
    if (ch === QUOTE) {
      enQuote = true;
      continue;
    }
    if (ch === sep) {
      fila.push(cell);
      cell = '';
      continue;
    }
    if (ch === '\r') {
      // Si viene \n después, lo tratamos como un solo fin de línea (CRLF).
      if (sig === '\n') i++;
      fila.push(cell);
      filas.push(fila);
      fila = [];
      cell = '';
      continue;
    }
    if (ch === '\n') {
      fila.push(cell);
      filas.push(fila);
      fila = [];
      cell = '';
      continue;
    }
    cell += ch;
  }

  // Última fila (si el texto no termina en \n).
  if (cell !== '' || fila.length > 0) {
    fila.push(cell);
    filas.push(fila);
  }
  return filas;
}

function _escaparCelda(valor, sep) {
  const str = String(valor ?? '');
  const necesita = str.includes(sep) || str.includes(QUOTE) || str.includes('\n') || str.includes('\r');
  if (!necesita) return str;
  return `"${str.replace(/"/g, '""')}"`;
}
