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

import { guardar, editar } from './crud.js';

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
