/**
 * infra/taxonomia.js - la estructura de dos niveles, resuelta una sola vez.
 *
 * Tres partes del proyecto piden lo mismo con tres nombres distintos:
 * categoría a subcategoría en Metas (ADR 048 D1), categoría a marca en gastos
 * fijos (ADR 029 D2) y entidad a producto en Deudas y tarjeta de crédito
 * (MC.16). Es un solo problema de modelado, así que acá vive una sola forma de
 * representarlo y un solo par de funciones para leerlo (ADR 064).
 *
 * La forma es un **catálogo plano de hijos, cada uno etiquetado con sus
 * padres**: `{ id, nombre, categorias: string[] }`. Nunca un mapa de padre a
 * lista de hijos. La razón es que un hijo puede pertenecer a varios padres
 * (Amazon está en compras y en streaming) y en el mapa eso obliga a repetirlo,
 * con dos filas que pueden divergir; acá el hijo se declara una vez con dos
 * etiquetas. Cuando la relación es de un solo padre (una subcategoría de meta,
 * un producto de una entidad) el array trae un elemento y la lectura es igual.
 *
 * El `id` es estable y se guarda en `localStorage`: no se renombra nunca. El
 * `nombre` es texto visible y sí puede cambiar.
 *
 * Capa infra: sin DOM, sin estado, sin importar de core ni de dominios. Recibe
 * el catálogo por parámetro justamente para servir a los tres consumidores sin
 * conocer a ninguno.
 */

/**
 * Hijos de una categoría, en el orden en que están escritos en el catálogo.
 *
 * Devuelve un array vacío, nunca `null`: una categoría sin hijos declarados es
 * un caso normal y no un fallo. Un catálogo de dos niveles crece agregando
 * filas (ADR 029 D1), así que las categorías van quedando cubiertas de a poco y
 * la UI tiene que saber tratar "todavía no tiene hijos" como el estado de
 * siempre, no como error.
 *
 * @param {{ id: string, nombre: string, categorias: string[] }[]} catalogo
 * @param {string} categoria - la etiqueta del padre, tal cual está en `categorias`.
 * @returns {{ id: string, nombre: string, categorias: string[] }[]}
 */
export function hijosDeCategoria(catalogo, categoria) {
  if (!Array.isArray(catalogo) || !categoria) return [];
  return catalogo.filter(h => Array.isArray(h?.categorias) && h.categorias.includes(categoria));
}

/**
 * El hijo cuyo `id` coincide, o `null` si el catálogo ya no lo tiene.
 *
 * Es la puerta de vuelta desde el dato guardado: el registro almacena el `id` y
 * la vista necesita el nombre. Que devuelva `null` es parte del contrato: un id
 * guardado hace meses puede haber salido del catálogo, y el consumidor cae a lo
 * que mostraba antes de existir el segundo nivel (la categoría sola), igual que
 * `resolverMarca` cae a null y el consumidor usa su ícono de categoría.
 *
 * @param {{ id: string, nombre: string, categorias: string[] }[]} catalogo
 * @param {string|null|undefined} id
 * @returns {{ id: string, nombre: string, categorias: string[] }|null}
 */
export function hijoPorId(catalogo, id) {
  if (!Array.isArray(catalogo) || !id) return null;
  return catalogo.find(h => h?.id === id) ?? null;
}

/**
 * Las categorías que hoy tienen al menos un hijo declarado.
 *
 * Existe para que un formulario pueda decidir **antes de pintar** si le toca
 * mostrar el segundo control, sin recorrer el catálogo una vez por categoría.
 *
 * @param {{ id: string, nombre: string, categorias: string[] }[]} catalogo
 * @returns {string[]} en el orden en que aparecen en el catálogo, sin repetir.
 */
export function categoriasConHijos(catalogo) {
  if (!Array.isArray(catalogo)) return [];
  const vistas = [];
  for (const hijo of catalogo) {
    if (!Array.isArray(hijo?.categorias)) continue;
    for (const c of hijo.categorias) {
      if (!vistas.includes(c)) vistas.push(c);
    }
  }
  return vistas;
}
