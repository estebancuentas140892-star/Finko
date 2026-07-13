/**
 * tesoreria/logic/transferencias.js - funciones puras de transferencias entre
 * cuentas propias (MC.17a): validación, normalización, cálculo del traslado y
 * chequeo de saldo.
 *
 * Sub-modulo de tesoreria/logic.js (barrel). Reglas de la capa:
 * - Sin DOM. Sin S directo. Reciben datos, devuelven datos.
 * - Testeable en Node/Vitest sin ningun mock de navegador.
 *
 * Invariante de dominio: una transferencia es un traslado interno, NO un
 * ingreso ni un gasto. La suma de los deltas de saldo es 0, así que el
 * patrimonio neto (Σ saldos − Σ deudas) no cambia. El GMF del retiro (MC.17d)
 * será la única parte real-mundo de una transferencia: cuando exista, el neto
 * bajará exactamente ese costo. Aquí (MC.17a) el traslado es solo `monto`.
 */

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida los datos de una transferencia antes de aplicarla. Devuelve un array
 * de mensajes de error (vacío = válida).
 *
 * El saldo insuficiente NO es un error de validación: es una decisión del
 * usuario (confirmar el sobregiro), que la capa de UI resuelve con
 * `saldoSuficiente()`. Aquí solo se bloquea lo que dejaría datos inconsistentes:
 * cuentas inexistentes/inactivas, origen == destino, monto no positivo, fecha
 * inválida.
 *
 * @param {Record<string, string>} datos - entradas crudas del formulario.
 * @param {import('../../../core/state.js').Cuenta[]} cuentas - lista de S.cuentas.
 * @returns {string[]}
 */
export function validarTransferencia(datos, cuentas) {
  const errores = [];
  const activas = (Array.isArray(cuentas) ? cuentas : []).filter(c => c?.activa !== false);

  const origenId  = datos?.cuentaOrigenId?.trim();
  const destinoId = datos?.cuentaDestinoId?.trim();

  if (!origenId) {
    errores.push('Debes elegir la cuenta de origen.');
  } else if (!activas.some(c => c.id === origenId)) {
    errores.push('La cuenta de origen no existe o no está activa.');
  }

  if (!destinoId) {
    errores.push('Debes elegir la cuenta de destino.');
  } else if (!activas.some(c => c.id === destinoId)) {
    errores.push('La cuenta de destino no existe o no está activa.');
  }

  // Solo tiene sentido comparar cuando ambas se indicaron: si falta una, el
  // error de arriba ya lo cubre y este sería ruido.
  if (origenId && destinoId && origenId === destinoId) {
    errores.push('El origen y el destino deben ser cuentas distintas.');
  }

  const monto = Number(datos?.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    errores.push('El monto debe ser un número mayor a 0.');
  }

  if (!datos?.fecha?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) {
    errores.push('La fecha es obligatoria.');
  }

  return errores;
}

/**
 * Indica si la cuenta de origen tiene saldo suficiente para el monto. Lo usa la
 * UI (MC.17b) para decidir si pide confirmación de sobregiro, no la validación
 * dura. `false` también si la cuenta no existe.
 *
 * @param {import('../../../core/state.js').Cuenta[]} cuentas
 * @param {string} cuentaOrigenId
 * @param {number} monto
 * @returns {boolean}
 */
export function saldoSuficiente(cuentas, cuentaOrigenId, monto) {
  const origen = (Array.isArray(cuentas) ? cuentas : []).find(c => c?.id === cuentaOrigenId);
  if (!origen) return false;
  return (Number(origen.saldo) || 0) >= (Number(monto) || 0);
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte los datos crudos del formulario al shape de `S.transferencias[]`.
 * Asume que los datos ya pasaron `validarTransferencia()`. La nota se omite si
 * viene vacía tras recortar espacios (no guardar `nota: ''` inútil, mismo
 * criterio que `parseDatosTransferencia`).
 *
 * @param {Record<string, string>} datos
 * @returns {Omit<import('../../../core/state.js').Transferencia, 'id' | 'fechaCreacion'>}
 */
export function normalizarTransferencia(datos) {
  const transferencia = {
    cuentaOrigenId:  datos.cuentaOrigenId.trim(),
    cuentaDestinoId: datos.cuentaDestinoId.trim(),
    monto:           Number(datos.monto),
    fecha:           datos.fecha,
  };
  const nota = datos.nota?.trim();
  if (nota) transferencia.nota = nota;
  return transferencia;
}

// ── CÁLCULO DEL TRASLADO (apply atómico, puro) ───────────────────

/**
 * Calcula los saldos resultantes de aplicar una transferencia, SIN mutar nada.
 * El caller (la acción, MC.17b) persiste cada actualización con
 * `editar('cuentas', ...)`; como todo es síncrono en memoria y `save()` es
 * debounced, ambas caen en el mismo flush (traslado atómico).
 *
 * Guarda de seguridad para el apply: devuelve `null` si la transferencia
 * corrompería saldos (cuenta inexistente/inactiva, origen == destino, monto no
 * positivo). No reemplaza a `validarTransferencia` (que da mensajes para el
 * formulario); es el guard final antes de tocar el dinero.
 *
 * La suma de `deltas` es 0 (MC.17a, sin GMF): el patrimonio neto no cambia.
 *
 * @param {{cuentaOrigenId: string, cuentaDestinoId: string, monto: number}} transferencia
 * @param {import('../../../core/state.js').Cuenta[]} cuentas
 * @returns {{ actualizaciones: Array<{cuentaId: string, saldo: number}>,
 *             deltas: Array<{cuentaId: string, delta: number}> } | null}
 */
export function calcularTransferencia(transferencia, cuentas) {
  const lista   = Array.isArray(cuentas) ? cuentas : [];
  const origen  = lista.find(c => c?.id === transferencia?.cuentaOrigenId  && c?.activa !== false);
  const destino = lista.find(c => c?.id === transferencia?.cuentaDestinoId && c?.activa !== false);
  const monto   = Number(transferencia?.monto) || 0;

  if (!origen || !destino || origen.id === destino.id || monto <= 0) return null;

  return {
    actualizaciones: [
      { cuentaId: origen.id,  saldo: (Number(origen.saldo)  || 0) - monto },
      { cuentaId: destino.id, saldo: (Number(destino.saldo) || 0) + monto },
    ],
    deltas: [
      { cuentaId: origen.id,  delta: -monto },
      { cuentaId: destino.id, delta:  monto },
    ],
  };
}
