/**
 * compromisos/logic/abonos.js - abonos a deudas (ADR 002): aritmetica de saldo, validacion
 * del formulario de abono y estado de pago del mes.
 *
 * Sub-modulo de compromisos/logic.js (barrel). Reglas de la capa:
 * - Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 */

import { esDeuda } from './modelo.js';

// ── ABONOS A DEUDAS (ADR 002) ────────────────────────────────────
//
// Un "abono" es un Gasto categorizado como "Deudas" con el campo opcional
// `compromisoId` apuntando a la deuda. Al crear el abono, el saldoTotal de
// la deuda se reduce por el monto. Al editar/eliminar el gasto, se sincroniza
// de vuelta. Estas funciones puras encapsulan toda la aritmética; los handlers
// las invocan desde compromisos/index.js y gastos/index.js.

/**
 * Resta `monto` del saldo de una deuda sin permitir resultado negativo.
 *
 * @param {number} saldoActual COP. Saldo antes del abono.
 * @param {number} monto       COP del abono.
 * @returns {number} Nuevo saldo (siempre >= 0).
 */
export function aplicarAbonoASaldo(saldoActual, monto) {
  const s = Number(saldoActual);
  const m = Number(monto);
  if (!Number.isFinite(s) || !Number.isFinite(m)) return 0;
  return Math.max(0, s - m);
}

/**
 * Suma `monto` al saldo de una deuda (revierte un abono previo).
 * Usado al eliminar o editar un gasto con `compromisoId`.
 *
 * @param {number} saldoActual COP.
 * @param {number} monto       COP que se va a revertir.
 * @returns {number} Nuevo saldo.
 */
export function revertirAbonoDeSaldo(saldoActual, monto) {
  const s = Number(saldoActual);
  const m = Number(monto);
  if (!Number.isFinite(s)) return Number.isFinite(m) ? m : 0;
  if (!Number.isFinite(m)) return s;
  return s + m;
}

/**
 * Caps `monto` al saldo de la deuda. Si el usuario intentó abonar más de lo
 * que debe, devuelve el monto exacto necesario para saldar la deuda.
 *
 * @param {number} monto       COP del abono solicitado.
 * @param {number} saldoActual COP que se debe.
 * @returns {{ montoAjustado: number, saldaDeuda: boolean }}
 *   montoAjustado: el monto efectivo a registrar (≤ saldoActual).
 *   saldaDeuda:    true si después del abono saldoActual queda en 0.
 */
export function ajustarMontoAbono(monto, saldoActual) {
  const m = Number(monto);
  const s = Number(saldoActual);
  if (!Number.isFinite(m) || m <= 0) {
    return { montoAjustado: 0, saldaDeuda: false };
  }
  if (!Number.isFinite(s) || s <= 0) {
    return { montoAjustado: 0, saldaDeuda: true };
  }
  if (m >= s) {
    return { montoAjustado: s, saldaDeuda: true };
  }
  return { montoAjustado: m, saldaDeuda: false };
}

/**
 * Valida los datos del formulario de abono a una deuda.
 *
 * Reglas:
 *   - monto: número > 0.
 *   - cuentaId: requerido (selector de tarjetas en el formulario). Si esa
 *     cuenta no alcanza, el reparto-fallback se resuelve al confirmar.
 *   - fecha: requerida y con formato YYYY-MM-DD.
 *   - deuda: debe existir, estar activa y tener saldoTotal > 0.
 *
 * @param {{ monto?: string|number, cuentaId?: string, fecha?: string }} datos
 * @param {import('../../../core/state.js').Compromiso | null | undefined} deuda
 * @returns {string[]} Lista de errores (vacía si todo OK).
 */
export function validarAbono(datos, deuda) {
  const errores = [];
  const monto = Number(datos?.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    errores.push('El monto del abono debe ser mayor a 0.');
  }
  if (!datos?.cuentaId?.trim?.()) {
    errores.push('Debes elegir de qué cuenta sale el abono.');
  }
  if (!datos?.fecha?.trim?.()) {
    errores.push('La fecha es obligatoria.');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) {
    errores.push('La fecha debe estar en formato YYYY-MM-DD.');
  }
  if (!deuda) {
    errores.push('No se encontró la deuda a abonar.');
  } else {
    if (!esDeuda(deuda.tipo)) {
      errores.push('Solo se puede abonar a deudas (entidad o personal).');
    }
    if (deuda.activo === false) {
      errores.push('No puedes abonar a una deuda archivada.');
    }
    const saldo = Number(deuda.saldoTotal);
    if (!Number.isFinite(saldo) || saldo <= 0) {
      errores.push('Esta deuda ya está saldada.');
    }
  }
  return errores;
}

/**
 * Suma los abonos de un compromiso en un mes dado.
 * Un abono es un gasto en S.gastos con `compromisoId` apuntando al compromiso
 * y fecha dentro del mes indicado por `prefijoMes` ('YYYY-MM').
 *
 * @param {import('../../../core/state.js').Gasto[]} gastos
 * @param {string} compromisoId
 * @param {string} prefijoMes 'YYYY-MM'
 * @returns {number} Total abonado en COP.
 */
export function calcularAbonosDelMes(gastos, compromisoId, prefijoMes) {
  if (!Array.isArray(gastos) || !compromisoId || !prefijoMes) return 0;
  return gastos
    .filter(g => g.compromisoId === compromisoId && g.fecha?.startsWith(prefijoMes))
    .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
}

/**
 * Estado de pago de un compromiso en el mes indicado por `prefijoMes` ('YYYY-MM').
 *
 * - 'ninguno':  no hay gastos vinculados ese mes.
 * - 'parcial':  hay abonos pero no cubren la cuotaMensual (solo aplica a deudas).
 * - 'completo': los abonos cubren o superan la cuotaMensual; o es un gasto fijo
 *               con cualquier gasto vinculado (los fijos se pagan de una vez).
 *
 * @param {import('../../../core/state.js').Gasto[]} gastos
 * @param {import('../../../core/state.js').Compromiso} compromiso
 * @param {string} prefijoMes 'YYYY-MM'
 * @returns {'ninguno' | 'parcial' | 'completo'}
 */
export function estadoPagoMes(gastos, compromiso, prefijoMes) {
  if (!compromiso?.id || !prefijoMes) return 'ninguno';

  const totalAbonado = calcularAbonosDelMes(gastos, compromiso.id, prefijoMes);
  if (totalAbonado <= 0) return 'ninguno';

  // Gastos fijos: cualquier importe registrado = pagado (no tienen cuota parcial).
  if (compromiso.tipo === 'fijo') return 'completo';

  // Deudas: comparar abonos contra cuota mensual.
  const cuota = Number(compromiso.cuotaMensual) || 0;
  if (cuota <= 0) return 'completo';
  return totalAbonado >= cuota ? 'completo' : 'parcial';
}

/**
 * Calcula el delta a aplicar al `saldoTotal` de uno o dos compromisos cuando
 * un gasto se edita o crea o elimina.
 *
 * Las tres operaciones se modelan con `antes` y `después` así:
 *   - Crear: antes = null, después = el nuevo gasto.
 *   - Editar: antes = gasto previo, después = gasto editado.
 *   - Eliminar: antes = el gasto, después = null.
 *
 * Regla:
 *   - Si un gasto pasa de tener `compromisoId=X` y monto=A
 *     a tener `compromisoId=X` y monto=B: delta sobre X = A - B
 *     (positivo si el monto bajó: el saldo de la deuda sube).
 *   - Si cambia el compromiso (vinculado a otra deuda): el saldo del primero
 *     sube en A (revierte el abono), el del nuevo baja en B (aplica el abono).
 *   - Si solo el de antes tiene compromisoId (se desvinculó): el saldo sube en A.
 *   - Si solo el de después tiene compromisoId (se vinculó): el saldo baja en B.
 *
 * Devuelve un mapa { compromisoId → delta a sumar al saldoTotal }.
 * Un delta positivo significa "el saldo de la deuda sube" (revertir abono);
 * negativo significa "el saldo de la deuda baja" (aplicar abono).
 *
 * @param {{ compromisoId?: string|null, monto?: number } | null | undefined} antes
 * @param {{ compromisoId?: string|null, monto?: number } | null | undefined} despues
 * @returns {Record<string, number>}
 */
export function deltasSaldoCompromisoPorEdicionGasto(antes, despues) {
  const deltas = {};
  const compAntes  = antes?.compromisoId   ?? null;
  const compDesp   = despues?.compromisoId ?? null;
  const montoAntes = Number(antes?.monto   ?? 0);
  const montoDesp  = Number(despues?.monto ?? 0);

  if (compAntes === compDesp) {
    if (compAntes !== null) {
      // Mismo compromiso: solo aplica la diferencia de monto.
      // Si el nuevo monto es mayor, el saldo de la deuda baja más → delta negativo.
      const delta = montoAntes - montoDesp;
      if (delta !== 0) deltas[compAntes] = delta;
    }
    return deltas;
  }

  // Compromisos distintos (incluye desvincular o vincular): revierte en el viejo,
  // aplica en el nuevo.
  if (compAntes !== null) deltas[compAntes] = (deltas[compAntes] ?? 0) + montoAntes;
  if (compDesp  !== null) deltas[compDesp]  = (deltas[compDesp]  ?? 0) - montoDesp;

  return deltas;
}
