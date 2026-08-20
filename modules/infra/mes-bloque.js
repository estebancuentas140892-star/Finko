/**
 * mes-bloque.js - el mes visible del bloque Gastos, en un solo sitio.
 *
 * Ficha 07 de la auditoría móvil (ADR 069 D8, hallazgo G4): las tres lentes
 * del bloque tenían tres modelos de tiempo. "Día a día" navegaba mes a mes con
 * estado propio, "Límites" leía `new Date()` en cada render (clavado al mes en
 * curso) y "Por pagar" miraba hacia adelante. Si el usuario retrocedía a junio
 * en la primera pestaña y saltaba a la tercera, el mes cambiaba sin avisar: un
 * contenedor promete continuidad y tres relojes la rompen.
 *
 * El selector sube al encabezado del bloque y manda sobre las tres. Este
 * módulo es su estado, y vive en `infra/` por la regla del árbol de
 * dependencias: las tres lentes son dominios distintos (`gastos`,
 * `compromisos`, `presupuesto`) y ningún dominio puede importar a otro
 * (ADN 10). Todos pueden leer de infra.
 *
 * El mes va 0-indexed, igual que `Date.getMonth()`, porque es el formato en el
 * que ya lo tenía `gastos/view.js`, que es de donde sube.
 */

/** @type {number|null} */
let _anio = null;
/** @type {number|null} */
let _mes = null;

/** Arranca en el mes corriente la primera vez que alguien pregunta. */
function _asegurar() {
  if (_anio === null || _mes === null) {
    const hoyDate = new Date();
    _anio = hoyDate.getFullYear();
    _mes  = hoyDate.getMonth();
  }
}

/**
 * El mes visible del bloque.
 * @returns {{anio: number, mes: number}} `mes` 0-indexed.
 */
export function mesBloque() {
  _asegurar();
  return { anio: _anio, mes: _mes };
}

/**
 * Mueve el mes visible `delta` pasos (positivo = adelante).
 * No re-renderiza: el caller decide qué repintar, igual que hacía
 * `navegarMesGastos()` antes de que el estado subiera acá.
 *
 * @param {number} delta
 */
export function navegarMesBloque(delta) {
  _asegurar();
  let m = _mes + delta;
  let y = _anio;
  while (m < 0)  { m += 12; y -= 1; }
  while (m > 11) { m -= 12; y += 1; }
  _mes  = m;
  _anio = y;
}

/** Vuelve al mes corriente. */
export function irAMesActualBloque() {
  const hoyDate = new Date();
  _anio = hoyDate.getFullYear();
  _mes  = hoyDate.getMonth();
}

/**
 * Prefijo `YYYY-MM` del mes visible, que es la forma en la que lo consumen
 * las funciones de compromisos y de agenda.
 * @returns {string}
 */
export function prefijoMesBloque() {
  const { anio, mes } = mesBloque();
  return `${anio}-${String(mes + 1).padStart(2, '0')}`;
}

/**
 * El mes visible como rango de fechas ISO inclusivo, que es la forma en la que
 * lo consumen los filtros de Movimientos (G5).
 *
 * `new Date(anio, mes + 1, 0)` es el último día del mes: día 0 del siguiente.
 *
 * @returns {{ desde: string, hasta: string }} 'YYYY-MM-DD' los dos.
 */
export function rangoMesBloque() {
  const { anio, mes } = mesBloque();
  const dosDigitos = (n) => String(n).padStart(2, '0');
  const ultimo = new Date(anio, mes + 1, 0).getDate();
  return {
    desde: `${anio}-${dosDigitos(mes + 1)}-01`,
    hasta: `${anio}-${dosDigitos(mes + 1)}-${dosDigitos(ultimo)}`,
  };
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * "Agosto 2026". Un solo sitio para el rótulo, que ahora lo pintan el
 * encabezado del bloque y el hero de la lente.
 * @returns {string}
 */
export function etiquetaMesBloque() {
  const { anio, mes } = mesBloque();
  return `${MESES[mes]} ${anio}`;
}

/** True si el mes visible es el corriente. */
export function esMesActualBloque() {
  const hoyDate = new Date();
  const { anio, mes } = mesBloque();
  return anio === hoyDate.getFullYear() && mes === hoyDate.getMonth();
}
