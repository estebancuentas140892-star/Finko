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

/**
 * Reparte los splits de un pago en LOTE (CAL.5a) entre los items que lo
 * componen, para que cada item quede con su(s) propio(s) movimiento(s).
 *
 * El problema que resuelve: `distribuirPago` (y todo el helper de cuentas)
 * razona sobre un monto único, pero un lote paga N compromisos y cada uno
 * necesita su propio gasto vinculado (`compromisoId`) para que el badge "Ya
 * pagaste este mes" y el progreso del hero funcionen. Con una sola cuenta la
 * asignación es trivial; con reparto entre varias hay que decidir de cuál sale
 * cada item, y un item puede quedar a caballo entre dos cuentas (entonces
 * genera dos movimientos, igual que el pago individual repartido).
 *
 * Criterio: se consumen las cuentas **en el orden en que vienen** (el helper ya
 * las ordena con la preferida del usuario primero) y los items en el orden en
 * que se listan. Así el dinero de la cuenta elegida se agota antes de tocar las
 * demás, que es lo que el usuario espera al haberla elegido.
 *
 * No valida que los splits cubran el total: si faltara, los últimos items
 * quedan con `faltante > 0` y el caller decide (hoy no puede pasar, el picker
 * solo confirma cuando cubre).
 *
 * @param {Array<{id?:string, monto?:number}>} items - qué se paga, en orden.
 * @param {Array<{cuentaId:string, monto:number}>} splits - de dónde sale, en orden.
 * @returns {Array<{
 *   id: string|null,
 *   partes: Array<{cuentaId:string, monto:number}>,  // solo > 0
 *   faltante: number,                                 // 0 cuando quedó cubierto
 * }>}
 */
export function asignarSplitsPorItem(items, splits) {
  const bolsas = (Array.isArray(splits) ? splits : [])
    .filter(s => s && s.cuentaId != null)
    .map(s => ({ cuentaId: s.cuentaId, restante: Math.max(0, Math.round(Number(s.monto) || 0)) }));

  let i = 0;
  const out = [];

  for (const it of (Array.isArray(items) ? items : [])) {
    let falta = Math.max(0, Math.round(Number(it?.monto) || 0));
    const partes = [];

    while (falta > 0 && i < bolsas.length) {
      const bolsa = bolsas[i];
      if (bolsa.restante <= 0) { i += 1; continue; }
      const toma = Math.min(falta, bolsa.restante);
      partes.push({ cuentaId: bolsa.cuentaId, monto: toma });
      bolsa.restante -= toma;
      falta          -= toma;
    }

    out.push({ id: it?.id ?? null, partes, faltante: falta });
  }

  return out;
}
