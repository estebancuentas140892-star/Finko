/**
 * infra/credito-ingreso.js - registrar el cobro de un crédito automático de
 * ingreso fijo (PA.1b, ADR 052 D2/D3).
 *
 * Espejo de `infra/pago-compromiso.js` visto desde el otro lado: un
 * `IngresoPuntual` vinculado por `ingresoId` en vez de un `Gasto` vinculado por
 * `compromisoId`. El crédito de la cuenta NO vive acá, mismo motivo que el
 * débito de `pago-compromiso.js`: el caller (la hoja "Pagos automáticos") lo
 * acumula por cuenta y lo aplica una sola vez al final del lote.
 */

import { guardar } from './crud.js';

/**
 * Escribe el ingreso puntual vinculado a un cobro de crédito automático
 * (mismo criterio que `gastoDePagoCompromiso`, BUG-006: sin este registro el
 * cobro queda invisible para Movimientos y Análisis).
 *
 * @param {import('../core/state.js').Ingreso} ingreso
 * @param {{monto:number, fecha:string, cuentaId:string|null}} datos
 */
export function ingresoPuntualDeCreditoAutomatico(ingreso, { monto, fecha, cuentaId }) {
  guardar('ingresosPuntuales', {
    descripcion: ingreso.descripcion,
    monto,
    categoria:   ingreso.categoria ?? null,
    cuentaId:    cuentaId || null,
    fecha,
    ingresoId:   ingreso.id,
  });
}
