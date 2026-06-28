/**
 * distribuir-pago.js - reparto de un pago entre varias cuentas.
 *
 * Función pura (sin DOM, sin S) que decide cuánto sacar de cada cuenta para
 * cubrir un monto, sin dejar ninguna en negativo. Cobra primero de la cuenta
 * con más saldo (orden "mayor saldo primero") y se detiene al completar.
 *
 * Capa infra: no importa de dominios ni de core. Testeable en Node/Vitest.
 */

/**
 * Reparte `monto` entre las `cuentas` dadas, de mayor a menor saldo, tomando
 * de cada una solo hasta su saldo disponible (nunca la deja negativa).
 *
 * @param {Array<{id:string, saldo?:number}>} cuentas - cuentas elegibles.
 * @param {number} monto - total a cubrir (COP).
 * @returns {{
 *   ok: boolean,                              // true si el reparto cubre el monto completo
 *   splits: Array<{cuentaId:string, monto:number}>, // cuánto sacar de cada cuenta (solo > 0)
 *   cubierto: number,                         // total que sí se alcanza a cubrir
 *   faltante: number,                         // lo que queda sin cubrir (0 si ok)
 * }}
 */
export function distribuirPago(cuentas, monto) {
  const objetivo = Math.max(0, Math.round(Number(monto) || 0));

  const elegibles = (Array.isArray(cuentas) ? cuentas : [])
    .filter(c => c && c.id != null)
    .map(c => ({ cuentaId: c.id, saldo: Math.max(0, Number(c.saldo) || 0) }))
    .sort((a, b) => b.saldo - a.saldo);

  const splits = [];
  let restante = objetivo;

  for (const c of elegibles) {
    if (restante <= 0) break;
    const toma = Math.min(restante, c.saldo);
    if (toma > 0) {
      splits.push({ cuentaId: c.cuentaId, monto: toma });
      restante -= toma;
    }
  }

  return {
    ok: objetivo > 0 && restante <= 0,
    splits,
    cubierto: objetivo - restante,
    faltante: Math.max(0, restante),
  };
}
