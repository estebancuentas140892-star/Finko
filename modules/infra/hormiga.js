/**
 * infra/hormiga.js - criterio único de "gasto hormiga" (ADR 092 D11).
 *
 * Funciones puras, sin DOM. Hasta APR.1a el umbral vivía duplicado a
 * propósito en `gastos/logic.js` (`detectarHormigas`) y `logros/logic.js`
 * (`UMBRAL_GASTO_HORMIGA`) para no importar un dominio desde otro (ADN 10).
 * Con un tercer lector (`aprende`) la duplicación deja de ser barata: el
 * criterio sube a infra y los tres lo leen de aquí.
 *
 * El criterio es el tamaño de la transacción, no la categoría: así funciona
 * para todos y no se desactiva recategorizando (ADR 032 D4).
 */

/** Monto máximo (inclusive) de una transacción para contar como hormiga. */
export const UMBRAL_GASTO_HORMIGA = 20_000;

/**
 * ¿Este gasto es hormiga? Monto positivo y menor o igual al tope.
 *
 * @param {{ monto?: unknown }} gasto
 * @param {number} [tope=UMBRAL_GASTO_HORMIGA]
 * @returns {boolean}
 */
export function esGastoHormiga(gasto, tope = UMBRAL_GASTO_HORMIGA) {
  const monto = Number(gasto?.monto);
  return Number.isFinite(monto) && monto > 0 && monto <= tope;
}

/**
 * Resumen del gasto hormiga de un mes calendario: total, número de compras
 * y desglose por categoría, de mayor a menor.
 *
 * @param {import('../core/state.js').Gasto[]} gastos
 * @param {string} mesISO - `YYYY-MM` (o un ISO completo, se usa el prefijo).
 * @param {number} [tope=UMBRAL_GASTO_HORMIGA]
 * @returns {{ total: number, cuantos: number, porCategoria: { categoria: string, total: number, cuantos: number }[] }}
 */
export function resumenHormigaMes(gastos, mesISO, tope = UMBRAL_GASTO_HORMIGA) {
  const vacio = { total: 0, cuantos: 0, porCategoria: [] };
  if (typeof mesISO !== 'string' || mesISO.length < 7) return vacio;
  const mes = mesISO.slice(0, 7);

  let total = 0;
  let cuantos = 0;
  /** @type {Map<string, { categoria: string, total: number, cuantos: number }>} */
  const grupos = new Map();
  for (const g of gastos ?? []) {
    if (typeof g?.fecha !== 'string' || g.fecha.slice(0, 7) !== mes) continue;
    if (!esGastoHormiga(g, tope)) continue;
    const monto = Number(g.monto);
    total += monto;
    cuantos += 1;
    const categoria = g.categoria || 'Otros';
    const grupo = grupos.get(categoria) ?? { categoria, total: 0, cuantos: 0 };
    grupo.total += monto;
    grupo.cuantos += 1;
    grupos.set(categoria, grupo);
  }

  const porCategoria = [...grupos.values()].sort((a, b) => b.total - a.total);
  return { total, cuantos, porCategoria };
}
