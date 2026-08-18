/**
 * infra/pago-compromiso.js - registrar el pago o abono de un compromiso (ARQ.2 punto 2).
 *
 * Antes escrito por separado en compromisos/index.js (_guardarAbono y el
 * listener de 'distribucion:aplicar'), tesoreria/acciones/distribucion.js
 * (_aplicarNecesidad) y agenda/index.js (_registrarPagosFijos): mismo gasto
 * vinculado + mismo descuento de saldoTotal para una deuda, escrito cuatro
 * veces con el mismo shape. El descuento de la cuenta de origen NO vive acá:
 * cada caller lo aplica en un momento distinto (inmediato por split, acumulado
 * por cuenta, o fusionado con otro movimiento de la misma cuenta), y esa
 * estrategia de batching es deliberada en cada uno (ver sus propios comentarios).
 */

import { S } from '../core/state.js';
import { guardar, editar } from './crud.js';
import { ocurrenciasEnMes } from './vencimientos.js';
import { hoy } from './utils.js';

/** true si el compromiso es una deuda (cualquiera de sus dos tipos). */
export function esCompromisoDeuda(compromiso) {
  return compromiso?.tipo === 'deuda-entidad' || compromiso?.tipo === 'deuda-personal';
}

/**
 * Escribe el gasto vinculado a un pago o abono de compromiso: "Pago: X" en
 * categoría "Gastos fijos" para un fijo, "Abono: X" en "Deudas" para una deuda
 * (mismo criterio que el resto de la app, BUG-006: sin este registro el pago
 * queda invisible para Agenda, Análisis y el ejecutado de Límites).
 *
 * @param {import('../core/state.js').Compromiso} compromiso
 * @param {{monto:number, fecha:string, cuentaId:string|null, nota?:string}} datos
 */
export function gastoDePagoCompromiso(compromiso, { monto, fecha, cuentaId, nota = '' }) {
  const deuda = esCompromisoDeuda(compromiso);
  guardar('gastos', {
    descripcion:  `${deuda ? 'Abono' : 'Pago'}: ${compromiso.descripcion}`,
    monto,
    categoria:    deuda ? 'Deudas' : 'Gastos fijos',
    fecha,
    cuentaId:     cuentaId || null,
    nota,
    compromisoId: compromiso.id,
  });
}

/**
 * Baja el saldoTotal de una deuda por el total abonado (topado en 0). Se
 * llama una sola vez con el monto TOTAL del abono, aunque este se haya
 * repartido en varios gastos vinculados (varias cuentas): el saldo de la
 * deuda no se descuenta por split.
 *
 * @param {import('../core/state.js').Compromiso} compromiso
 * @param {number} montoTotalAbonado
 */
export function bajarSaldoDeuda(compromiso, montoTotalAbonado) {
  const nuevoSaldo = Math.max(0, (Number(compromiso.saldoTotal) || 0) - (Number(montoTotalAbonado) || 0));
  editar('compromisos', compromiso.id, { saldoTotal: nuevoSaldo });
}

/**
 * Fecha con la que se registra el pago de un compromiso del mes `prefijoMes`
 * ('YYYY-MM'), que puede no ser el mes actual (BUG-015, ej. el calendario
 * muestra un mes pasado). Compartida por el pago individual de un gasto fijo
 * (agenda/index.js) y el pago en lote (compromisos/index.js).
 *
 * - Mes en curso: se fecha con hoy (el pago acaba de ocurrir).
 * - Mes pasado: se fecha con el vencimiento del compromiso en ESE mes (la
 *   última ocurrencia si el fijo cae varias veces); el pago ocurrió entonces,
 *   no hoy. Sin ocurrencia resoluble cae al último día del mes.
 * - Mes futuro: `null`. No se paga lo que aún no vence.
 *
 * @param {import('../core/state.js').Compromiso} comp
 * @param {string} prefijoMes 'YYYY-MM'
 * @returns {string|null} 'YYYY-MM-DD' o null si el mes es futuro/inválido.
 */
export function fechaPagoDelMes(comp, prefijoMes) {
  const m = /^(\d{4})-(\d{2})$/.exec(prefijoMes ?? '');
  if (!m) return null;

  const anio = Number(m[1]);
  const mes  = Number(m[2]) - 1; // 0-indexed
  if (mes < 0 || mes > 11) return null;

  const d       = new Date();
  const anioHoy = d.getFullYear();
  const mesHoy  = d.getMonth();

  if (anio === anioHoy && mes === mesHoy) return hoy();
  if (anio > anioHoy || (anio === anioHoy && mes > mesHoy)) return null;

  const dias = ocurrenciasEnMes(comp, anio, mes);
  const dia  = dias.length > 0
    ? dias[dias.length - 1]
    : new Date(anio, mes + 1, 0).getDate();
  return `${prefijoMes}-${String(dia).padStart(2, '0')}`;
}

/**
 * Escribe uno o varios pagos de compromiso: un gasto vinculado por cada cuenta
 * usada + el descuento del saldo de esas cuentas + la baja de `saldoTotal` si
 * el compromiso es una deuda. Compartida por el pago individual ("Marcar
 * pagado", solo fijos, en agenda/index.js) y el pago en lote (compromisos/index.js).
 *
 * El descuento se acumula por cuenta y se aplica **una sola vez** al final: en
 * un lote la misma cuenta paga varios items, y hacer un `editar` por item
 * leería el saldo ya mutado en cada vuelta (funciona, pero emite N eventos
 * `state:change` por cuenta y re-renderiza toda la app en cada uno).
 *
 * `bajarSaldoDeuda` sí va una vez **por compromiso** y con el total abonado,
 * aunque ese total se haya repartido en varios gastos: el saldo de la deuda no
 * se descuenta por split.
 *
 * @param {Array<{
 *   comp: import('../core/state.js').Compromiso,
 *   fecha: string,
 *   partes: Array<{cuentaId:string, monto:number}>,
 * }>} pagos
 */
export function aplicarPagosCompromisos(pagos) {
  /** @type {Map<string, number>} Total a descontar por cuenta. */
  const porCuenta = new Map();

  for (const { comp, fecha, partes } of pagos) {
    const repartido = partes.length > 1;
    let totalCompromiso = 0;

    for (const p of partes) {
      gastoDePagoCompromiso(comp, {
        monto:    p.monto,
        fecha,
        cuentaId: p.cuentaId,
        nota:     repartido ? 'Pago repartido entre varias cuentas' : '',
      });
      totalCompromiso += p.monto;
      if (p.cuentaId) {
        porCuenta.set(p.cuentaId, (porCuenta.get(p.cuentaId) ?? 0) + p.monto);
      }
    }

    if (totalCompromiso > 0 && esCompromisoDeuda(comp)) {
      bajarSaldoDeuda(comp, totalCompromiso);
    }
  }

  for (const [cuentaId, total] of porCuenta) {
    const cuenta = S.cuentas.find(x => x.id === cuentaId);
    if (cuenta) editar('cuentas', cuentaId, { saldo: (cuenta.saldo ?? 0) - total });
  }
}
