/**
 * infra/naturaleza.js - qué es cada gasto y en qué cifras cuenta (ADR 139, HF.1b).
 *
 * `S.gastos` guarda tres hechos con la misma forma: lo que compraste, el pago
 * de un gasto fijo y el abono a una deuda (ADR 002). Sumarlos sin distinguir
 * contaba dos veces la tarjeta de crédito: la compra (ADR 051 D3) y su pago.
 * La naturaleza se deriva de lo que el gasto ya guarda, sin campo nuevo
 * (R-HF5 del ADR 091):
 *
 *   consumo-con-tarjeta  `consumoTC === true`
 *   pago-de-deuda        categoría "Deudas" (la pone el abono; el formulario
 *                        de gasto no la ofrece)
 *   pago-de-fijo         categoría "Gastos fijos" (la pone el pago de un fijo)
 *   consumo              todo lo demás
 *
 * Y dos lentes, cada una con su pregunta:
 *
 *   - Consumo, "en qué se fue tu dinero": todo menos el pago de una deuda. La
 *     compra con tarjeta cuenta en su fecha y su categoría. Análisis y la renta.
 *   - Lo que sale del ingreso, "cuánto te queda": todo menos la compra con
 *     tarjeta, que sale cuando se paga la tarjeta, como cuota de deuda
 *     (Necesidades, ADR 013). Límites por grupo y la tasa de ahorro.
 *
 * Existe en infra porque Análisis, Límites y Ahorro la leen, y ningún dominio
 * importa a otro (ADN 10). Pura: sin DOM y sin S.
 */

/** Las cuatro naturalezas de un gasto. */
export const NATURALEZA_GASTO = Object.freeze({
  CONSUMO:          'consumo',
  CONSUMO_TARJETA:  'consumo-con-tarjeta',
  PAGO_DE_FIJO:     'pago-de-fijo',
  PAGO_DE_DEUDA:    'pago-de-deuda',
});

/**
 * @param {import('../core/state.js').Gasto} gasto
 * @returns {'consumo'|'consumo-con-tarjeta'|'pago-de-fijo'|'pago-de-deuda'}
 */
export function naturalezaDeGasto(gasto) {
  if (gasto?.consumoTC === true)        return NATURALEZA_GASTO.CONSUMO_TARJETA;
  if (gasto?.categoria === 'Deudas')     return NATURALEZA_GASTO.PAGO_DE_DEUDA;
  if (gasto?.categoria === 'Gastos fijos') return NATURALEZA_GASTO.PAGO_DE_FIJO;
  return NATURALEZA_GASTO.CONSUMO;
}

/**
 * Lente de consumo: true si el gasto dice en qué se fue el dinero. El pago de
 * una deuda no: lo que compró ese dinero ya se contó, o se contó antes de
 * Finko (P2 del ADR 091).
 * @param {import('../core/state.js').Gasto} gasto
 */
export function esConsumo(gasto) {
  return naturalezaDeGasto(gasto) !== NATURALEZA_GASTO.PAGO_DE_DEUDA;
}

/**
 * Lente del ingreso: true si el gasto ya sacó dinero. La compra con tarjeta
 * todavía no: sale cuando se paga la tarjeta.
 * @param {import('../core/state.js').Gasto} gasto
 */
export function saleDelIngreso(gasto) {
  return naturalezaDeGasto(gasto) !== NATURALEZA_GASTO.CONSUMO_TARJETA;
}

/**
 * @param {import('../core/state.js').Gasto[]} gastos
 * @returns {import('../core/state.js').Gasto[]} los que cuentan como consumo.
 */
export function gastosDeConsumo(gastos) {
  return (Array.isArray(gastos) ? gastos : []).filter(esConsumo);
}

/**
 * @param {import('../core/state.js').Gasto[]} gastos
 * @returns {import('../core/state.js').Gasto[]} los que ya sacaron dinero del ingreso.
 */
export function gastosQueSalenDelIngreso(gastos) {
  return (Array.isArray(gastos) ? gastos : []).filter(saleDelIngreso);
}
