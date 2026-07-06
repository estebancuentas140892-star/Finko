/**
 * accesos/logic.js - accesos rápidos personalizables de Inicio (IN.4a, ADR 028 D2).
 *
 * Puro: no lee S, no toca el DOM. Opera sobre el array de ids que guarda
 * `S.config.accesosInicio` y el catálogo `ACCESOS_INICIO` de constants.js.
 */

/**
 * Resuelve los ids guardados contra el catálogo, en el orden guardado
 * (orden de selección, ADR 028 D2). Ids que ya no existen en el catálogo
 * (sección eliminada) se descartan en silencio: nunca rompe el render.
 *
 * @param {string[]} ids
 * @param {import('../../core/constants.js').AccesoInicio[]} catalogo
 * @returns {import('../../core/constants.js').AccesoInicio[]}
 */
export function accesosVisibles(ids, catalogo) {
  if (!Array.isArray(ids) || !Array.isArray(catalogo)) return [];
  const porId = new Map(catalogo.map(a => [a.id, a]));
  return ids.map(id => porId.get(id)).filter(Boolean);
}

/**
 * Agrega o quita un id de la lista de accesos: si ya está, lo quita; si no
 * está, lo agrega al final (nuevo orden de selección). Pura: devuelve un
 * array nuevo, no muta `ids`.
 *
 * @param {string[]} ids
 * @param {string} id
 * @returns {string[]}
 */
export function alternarAcceso(ids, id) {
  const actuales = Array.isArray(ids) ? ids : [];
  return actuales.includes(id)
    ? actuales.filter(x => x !== id)
    : [...actuales, id];
}
