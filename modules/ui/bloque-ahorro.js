/**
 * bloque-ahorro.js - la barra de modalidades del bloque Ahorro (móvil).
 *
 * Ficha 04 de la auditoría móvil (ADR 069 D7, hallazgos AH2/AH3/AH5): dentro
 * de Ahorro no se podía ir de lado. De Metas a Reservas había que subir a la
 * casa y volver a bajar (2 toques y un scroll), mientras que en el bloque
 * Gastos cambiar de lente cuesta 1 toque. Los dos bloques de la barra tenían
 * la misma promesa y dos modelos internos distintos.
 *
 * ADR 098 D3 (cambia ADR 069 D7): la casa salió de la fila. Con cinco
 * destinos desbordaba a 390px y escondía "Inversión" (R9), y la subida a la
 * casa ya la da el "‹ Ahorro" de cada hija.
 *
 * ADR 104 (MV2.12): ir de lado es una barra y filtrar, un chip. Las cuatro
 * hijas pintan la barra del bloque Gastos (`.bloque-tabs`), con la etiqueta
 * corta y el nombre completo para el lector de pantalla. Reservas lleva un
 * punto en la esquina cuando una reserva está lista para reiniciar.
 *
 * El orden es el de la casa (`MODALIDADES_AHORRO`), que es el único que
 * significa algo: va por certeza de uso, de lo que ojalá no uses a lo que
 * crece solo. Ninguna hija puede reordenarlo por su cuenta (AH3).
 *
 * Solo se ve bajo 1024px (responsive.css): en escritorio la subnav del
 * sidebar ya permite el salto lateral.
 */

import { S } from '../core/state.js';
import { registrarRender } from '../infra/render.js';
import { MODALIDADES_AHORRO, partirEtiquetaModalidad } from '../dominio/ahorro/logic.js';
import { apartadosActivos, estaListoParaReiniciar } from '../dominio/apartados/logic.js';
import { pintarEstadoLente } from './bloque-gastos.js';

/**
 * Las cuatro modalidades, en el orden de la casa.
 * `seccion` de `MODALIDADES_AHORRO` es el hash de destino, no la clave del
 * dominio (el fondo vive en `#fondo` desde DIS.18).
 */
export const MODALIDADES_BLOQUE_AHORRO = MODALIDADES_AHORRO.map(m => ({
  hash: m.seccion, etiqueta: m.label, corto: partirEtiquetaModalidad(m).corto,
}));

/** Las cuatro hijas que reciben la barra. La casa no: ya tiene la suya. */
const HIJAS = MODALIDADES_AHORRO.map(m => m.seccion);

/** La única modalidad que avisa desde la barra (ADR 104 D3). */
const HASH_RESERVAS = 'apartados';

// ── RENDER ───────────────────────────────────────────────────────

/**
 * Devuelve el HTML de la barra. Pura: no lee S, no toca el DOM.
 *
 * Las etiquetas son constantes del dominio, no datos del usuario: no pasan
 * por esc(). Quien marca la celda vigente es markActiveNav() (shell.js), con
 * el mismo mecanismo del resto del nav: la barra es navegación. El punto de
 * Reservas nace oculto; su estado lo escribe sincronizarBloqueAhorro().
 *
 * @returns {string} HTML listo para inyectar.
 */
export function htmlBarraBloqueAhorro() {
  const celdas = MODALIDADES_BLOQUE_AHORRO.map(({ hash, etiqueta, corto }) => {
    const punto = hash === HASH_RESERVAS
      ? '<span class="badge bloque-tabs__badge bloque-tabs__badge--punto" aria-hidden="true" hidden></span>'
      : '';
    return `
      <a class="bloque-tabs__tab" href="#${hash}" data-section="${hash}" aria-label="${etiqueta}">
        <span class="bloque-tabs__label">${corto}</span>${punto}
      </a>`;
  }).join('');

  return `<nav class="bloque-tabs bloque-tabs--ahorro" aria-label="Modalidades de ahorro">${celdas}</nav>`;
}

/**
 * Cuántas reservas están listas para reiniciar. Mismo criterio que el aviso
 * `apartado-listo` del motor (infra/avisos.js): si contaran distinto, la
 * barra diría una cosa e Inicio otra.
 *
 * @param {typeof S} [state=S]
 * @returns {{reservasListas:number}}
 */
export function estadoBloqueAhorro(state = S) {
  const reservasListas = apartadosActivos(state.apartados).filter(estaListoParaReiniciar).length;
  return { reservasListas };
}

/**
 * Escribe el punto de Reservas en las cuatro copias de la barra.
 * No-op si la barra no está en el DOM.
 *
 * @param {{reservasListas:number}} [estado]
 */
export function sincronizarBloqueAhorro(estado = estadoBloqueAhorro()) {
  pintarEstadoLente(HASH_RESERVAS, estado.reservasListas, 'Reservas',
    n => (n === 1 ? 'una lista para reiniciar' : `${n} listas para reiniciar`), true);
}

// ── INIT ─────────────────────────────────────────────────────────

/**
 * Inyecta la barra en las cuatro hijas y engancha el punto de Reservas al
 * render global. Se llama una sola vez desde bootstrap.js, antes del router:
 * markActiveNav corre en su primera pasada y necesita las celdas ya en el DOM
 * para marcar la vigente.
 */
export function initBloqueAhorro() {
  const html = htmlBarraBloqueAhorro();
  for (const hash of HIJAS) {
    const slot = document.getElementById(`chips-${hash}`);
    if (slot) slot.innerHTML = html;
  }
  sincronizarBloqueAhorro();
  registrarRender(() => sincronizarBloqueAhorro());
}
