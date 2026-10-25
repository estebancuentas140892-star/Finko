/**
 * nino/logic.js - la ruta del niño, sin DOM (APR.3c, ADR 093 D9).
 *
 * A diferencia del adulto (092 D8), el niño sigue la secuencia: la unidad
 * actual es la primera sin terminar, y dentro de ella solo se abre la
 * lección que sigue (más las hechas, para repasar). Así no se pierde.
 */

import { UNIDADES_NINO, unidadTerminada } from '../../infra/ruta-aprende.js';

/** @param {unknown} aprende */
function _hechas(aprende) {
  const h = /** @type {any} */ (aprende)?.hechas;
  return h && typeof h === 'object' && !Array.isArray(h) ? h : {};
}

/**
 * Estado de cada unidad y de cada lección de la unidad actual.
 *
 * - unidad `hecha`: todas sus lecciones terminadas.
 * - unidad `actual`: la primera sin terminar, si ya tiene contenido.
 * - unidad `preparacion`: la primera sin terminar, sin contenido todavía:
 *   la ruta se detiene ahí, no la salta.
 * - unidad `despues`: el resto.
 * - lección `hecha`, `actual` (la que sigue) o `despues`.
 *
 * @param {unknown} aprende - el `aprende` del niño.
 */
export function estadoRutaNino(aprende) {
  const hechas = _hechas(aprende);
  let detenida = false;
  return UNIDADES_NINO.map(unidad => {
    let estado = 'despues';
    if (!detenida && unidadTerminada(unidad, hechas)) estado = 'hecha';
    else if (!detenida) {
      estado = unidad.lecciones.length ? 'actual' : 'preparacion';
      detenida = true;
    }
    let hayActual = false;
    const lecciones = unidad.lecciones.map((leccion, i) => {
      let e = 'despues';
      if (hechas[leccion.id]) e = 'hecha';
      else if (estado === 'actual' && !hayActual) {
        e = 'actual';
        hayActual = true;
      }
      return { leccion, numero: i + 1, estado: e };
    });
    return { unidad, estado, lecciones };
  });
}

/**
 * La lección que sigue en la ruta del niño, o `null` si no queda ninguna
 * escrita por hacer.
 *
 * @param {unknown} aprende
 * @returns {{ unidad: any, leccion: any, numero: number } | null}
 */
export function siguienteLeccionNino(aprende) {
  const actual = estadoRutaNino(aprende).find(e => e.estado === 'actual');
  const l = actual?.lecciones.find(x => x.estado === 'actual');
  return l ? { unidad: actual.unidad, leccion: l.leccion, numero: l.numero } : null;
}

/** Cuántas unidades terminó el niño: cada una es una insignia en "Yo". */
export function unidadesHechasNino(aprende) {
  return estadoRutaNino(aprende).filter(e => e.estado === 'hecha').length;
}

/** Las cuatro pantallas del niño, en el orden de su barra (D9). */
export const VISTAS_NINO = Object.freeze(['inicio', 'aprender', 'alcancia', 'yo']);
