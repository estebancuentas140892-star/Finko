/**
 * bloque-ahorro.js - la fila de chips del bloque Ahorro (móvil).
 *
 * Ficha 04 de la auditoría móvil (ADR 069 D7, hallazgos AH2/AH3/AH5): dentro
 * de Ahorro no se podía ir de lado. De Metas a Reservas había que subir a la
 * casa y volver a bajar (2 toques y un scroll), mientras que en el bloque
 * Gastos cambiar de lente cuesta 1 toque. Los dos bloques de la barra tenían
 * la misma promesa y dos modelos internos distintos.
 *
 * La fila que la casa ya tiene baja a las cuatro hijas. Misma forma,
 * comportamiento distinto según dónde viva: en la casa los chips mueven el
 * scroll (son botones con acción) y en las hijas navegan (son enlaces con
 * hash). Es el mismo reparto que ya tienen las columnas del comparador,
 * interactivas en la casa e inertes en Reservas.
 *
 * ADR 098 D3 (cambia ADR 069 D7): la casa salió de la fila. Con cinco chips
 * desbordaba a 390px y escondía "Inversión" (R9), y la subida a la casa ya la
 * da el "‹ Ahorro" de cada hija. Las cuatro van en cuatro columnas iguales,
 * con la etiqueta corta en móvil.
 *
 * El orden es el de la casa (`MODALIDADES_AHORRO`), que es el único que
 * significa algo: va por certeza de uso, de lo que ojalá no uses a lo que
 * crece solo. Ninguna hija puede reordenarlo por su cuenta (AH3).
 *
 * Solo se ve bajo 1024px (responsive.css): en escritorio la subnav del
 * sidebar ya permite el salto lateral.
 */

import { MODALIDADES_AHORRO, partirEtiquetaModalidad } from '../dominio/ahorro/logic.js';

/**
 * Los cuatro chips, en el orden de la casa.
 * `seccion` de `MODALIDADES_AHORRO` es el hash de destino, no la clave del
 * dominio (el fondo vive en `#fondo` desde DIS.18).
 */
export const CHIPS_BLOQUE_AHORRO = MODALIDADES_AHORRO.map(m => ({
  hash: m.seccion, etiqueta: m.label, ...partirEtiquetaModalidad(m),
}));

/** Las cuatro hijas que reciben la fila. La casa no: ya tiene la suya. */
const HIJAS = MODALIDADES_AHORRO.map(m => m.seccion);

// ── RENDER ───────────────────────────────────────────────────────

/**
 * Devuelve el HTML de la fila. Pura: no lee S, no toca el DOM.
 *
 * Las etiquetas son constantes del dominio, no datos del usuario: no pasan
 * por esc(). Quien marca el chip vigente es markActiveNav() (shell.js), con
 * el mismo mecanismo del resto del nav: la fila es navegación.
 *
 * @returns {string} HTML listo para inyectar.
 */
export function htmlChipsBloqueAhorro() {
  const chips = CHIPS_BLOQUE_AHORRO.map(({ hash, corto, cola }) => {
    const colaHtml = cola ? `<span class="chip__cola">${cola}</span>` : '';
    return `
      <a class="chip bloque-chips__chip" href="#${hash}" data-section="${hash}">${corto}${colaHtml}</a>`;
  }).join('');

  return `<nav class="bloque-chips chips" aria-label="Modalidades de ahorro">${chips}</nav>`;
}

// ── INIT ─────────────────────────────────────────────────────────

/**
 * Inyecta la fila en las cuatro hijas. Se llama una sola vez desde
 * bootstrap.js, antes del router: markActiveNav corre en su primera pasada y
 * necesita los chips ya en el DOM para marcar el vigente.
 */
export function initBloqueAhorro() {
  const html = htmlChipsBloqueAhorro();
  for (const hash of HIJAS) {
    const slot = document.getElementById(`chips-${hash}`);
    if (slot) slot.innerHTML = html;
  }
}
