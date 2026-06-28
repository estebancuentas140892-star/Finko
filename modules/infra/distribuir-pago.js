/**
 * distribuir-pago.js - reparto de un pago entre varias cuentas.
 *
 * Función pura (sin DOM, sin S) que decide cuánto sacar de cada cuenta para
 * cubrir un monto, sin dejar ninguna en negativo. Por defecto cobra primero de
 * la cuenta con más saldo ("mayor saldo primero"). Si se indica `prioridadId`
 * (la cuenta que el usuario eligió), esa se cobra primero y el resto se completa
 * con las demás por mayor saldo. Se detiene al completar el monto.
 *
 * Capa infra: no importa de dominios ni de core. Testeable en Node/Vitest.
 */

/**
 * Reparte `monto` entre las `cuentas` dadas tomando de cada una solo hasta su
 * saldo disponible (nunca la deja negativa).
 *
 * @param {Array<{id:string, saldo?:number}>} cuentas - cuentas elegibles.
 * @param {number} monto - total a cubrir (COP).
 * @param {string|null} [prioridadId] - cuenta a cobrar primero (la elegida).
 * @returns {{
 *   ok: boolean,                              // true si el reparto cubre el monto completo
 *   splits: Array<{cuentaId:string, monto:number}>, // cuánto sacar de cada cuenta (solo > 0)
 *   cubierto: number,                         // total que sí se alcanza a cubrir
 *   faltante: number,                         // lo que queda sin cubrir (0 si ok)
 * }}
 */
export function distribuirPago(cuentas, monto, prioridadId = null) {
  const objetivo = Math.max(0, Math.round(Number(monto) || 0));

  const elegibles = (Array.isArray(cuentas) ? cuentas : [])
    .filter(c => c && c.id != null)
    .map(c => ({ cuentaId: c.id, saldo: Math.max(0, Number(c.saldo) || 0) }))
    .sort((a, b) => b.saldo - a.saldo);

  // Si hay cuenta prioritaria, va primero (el sort es estable: las demás
  // conservan el orden mayor-saldo-primero).
  if (prioridadId) {
    elegibles.sort((a, b) => {
      if (a.cuentaId === prioridadId) return -1;
      if (b.cuentaId === prioridadId) return 1;
      return 0;
    });
  }

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
