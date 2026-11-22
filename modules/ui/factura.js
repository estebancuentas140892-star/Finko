/**
 * factura.js - Las piezas de la factura de Finko (FAC.1, ADR 180).
 *
 * La pantalla final de registro (el recibo de "Registrar gasto" y el resumen
 * de los flujos por preguntas: gasto fijo, deuda, ingreso fijo...) es un
 * papel de factura electrónica: marco bosque con la franja de los tres
 * colores del isotipo, el sello con el isotipo, el título y la cifra, las
 * filas de "rótulo y valor" y un código de barras al pie. El marco, la
 * franja, los separadores y la tipografía son CSS (`.factura` en
 * components/captura.css); acá viven las dos piezas con marcado propio.
 */

import { isotipo } from '../infra/icons.js';

/**
 * La cabecera del papel (GAS.13g, ADR 188 D6): el isotipo de 22, "Finko" y
 * el tipo de la factura (COMPROBANTE, GASTO FIJO, DEUDA). Solo adorna: el
 * título de la hoja ya dice qué es.
 * @param {string} [tipo]
 * @returns {string}
 */
export function htmlFacturaSello(tipo = 'Comprobante') {
  return `<div class="factura__sello" aria-hidden="true">
          <span class="factura__disco">${isotipo()}</span>
          <span class="factura__marca">Finko</span>
          <span class="factura__tipo">${String(tipo).replace(/[<>&"]/g, '')}</span>
        </div>`;
}

/**
 * Un número de 32 bits estable para una cadena (FNV-1a).
 * @param {string} s
 */
function _hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Las barras del pie, a todo el ancho del papel. Solo adornan; se derivan de
 * `semilla` (el id del movimiento o del formulario) para que cada factura
 * tenga las suyas y no cambien al volver a pintarla.
 *
 * @param {string} [semilla]
 * @returns {string} un `<svg>` estirable (preserveAspectRatio="none").
 */
export function htmlFacturaBarras(semilla = 'finko') {
  let x = _hash(String(semilla)) || 1;
  // xorshift32: rápido y suficiente para repartir anchos.
  const azar = () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 0x100000000;
  };
  const ANCHO = 180;
  const partes = [];
  let pos = 0;
  while (pos < ANCHO) {
    const w = 1 + Math.floor(azar() * 3);          // barra de 1 a 3
    const w2 = Math.min(w, ANCHO - pos);
    partes.push(`M${pos} 0h${w2}v10h-${w2}z`);
    pos += w2 + 1 + Math.floor(azar() * 2);         // hueco de 1 o 2
  }
  return `<svg class="factura__barras" viewBox="0 0 ${ANCHO} 10" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="${partes.join('')}"/></svg>`;
}
