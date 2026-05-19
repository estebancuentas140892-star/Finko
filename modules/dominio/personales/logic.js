/**
 * personales/logic.js — funciones puras del dominio de préstamos personales.
 *
 * Sin DOM. Sin S directo. Testeable en Node/Vitest.
 *
 * Préstamo personal = plata que TÚ prestaste a familia/amigos (espejo de
 * `compromisos.deuda`, donde tú le debes a alguien). Es informal, sin tasa
 * de interés ni amortización — solo registro de monto, pagos parciales,
 * antigüedad y opcionalmente una fecha pactada de devolución.
 *
 * @typedef {Object} Personal
 * @property {string} id              Identificador único.
 * @property {string} persona         Nombre de a quién le prestaste.
 * @property {number} monto           Monto total prestado en COP.
 * @property {number} pagado          Cuánto te ha devuelto hasta ahora (≤ monto).
 * @property {string} fecha           ISO 8601 (YYYY-MM-DD) del préstamo.
 * @property {string} [motivo]        Descripción opcional ("mercado", "favor").
 * @property {string} [fechaLimite]   ISO 8601 opcional, fecha pactada de devolución.
 * @property {boolean} liquidado      true cuando pagado ≥ monto.
 * @property {string} fechaCreacion   ISO 8601 timestamp.
 */

// ── CÁLCULOS POR PRÉSTAMO ────────────────────────────────────────

/**
 * Saldo pendiente de un préstamo (lo que aún no te han devuelto).
 * Nunca negativo: si pagado > monto, devuelve 0.
 *
 * @param {Personal} prestamo
 * @returns {number} COP pendientes.
 */
export function calcularPendiente(prestamo) {
  const monto  = prestamo?.monto  || 0;
  const pagado = prestamo?.pagado || 0;
  return Math.max(0, monto - pagado);
}

/**
 * Días transcurridos desde la fecha del préstamo (o desde fechaLimite si la hay).
 * Sirve para calcular antigüedad y clasificar la "incomodidad" del cobro.
 *
 * @param {Personal} prestamo
 * @param {Date|string} [fechaRef] default: ahora.
 * @returns {number} días (≥ 0).
 */
export function calcularDias(prestamo, fechaRef = new Date()) {
  if (!prestamo?.fecha && !prestamo?.fechaLimite) return 0;
  const ref = fechaRef instanceof Date ? fechaRef : new Date(fechaRef);
  ref.setHours(0, 0, 0, 0);

  // Si hay fechaLimite y ya pasó, contamos desde ahí (mora real).
  // Sino contamos desde la fecha del préstamo.
  const base  = prestamo.fechaLimite || prestamo.fecha;
  const fBase = new Date(base + 'T12:00:00');
  fBase.setHours(0, 0, 0, 0);
  const dias = Math.floor((ref - fBase) / 86_400_000);
  return Math.max(0, dias);
}

/**
 * Clasifica la antigüedad de un préstamo pendiente para el tono UX.
 *
 * - `reciente` : 0–14 días — no hace falta presionar.
 * - `mediano`  : 15–60 días — recordatorio sugerido.
 * - `viejo`    : 61+ días — incomodidad real, hay que hablar.
 *
 * Cortes culturales, no legales — entre amigos/familia colombianos
 * la deuda > 2 meses genera tensión.
 *
 * @param {number} dias
 * @returns {'reciente' | 'mediano' | 'viejo'}
 */
export function clasificarAntiguedad(dias) {
  if (dias <= 14) return 'reciente';
  if (dias <= 60) return 'mediano';
  return 'viejo';
}

/**
 * Porcentaje pagado (0–100). Util para barras de progreso.
 *
 * @param {Personal} prestamo
 * @returns {number} 0–100, redondeado.
 */
export function porcentajePagado(prestamo) {
  const monto  = prestamo?.monto  || 0;
  const pagado = prestamo?.pagado || 0;
  if (monto <= 0) return 0;
  return Math.min(100, Math.round((pagado / monto) * 100));
}

// ── AGREGADOS ────────────────────────────────────────────────────

/**
 * Resume el estado total de los préstamos.
 *
 * @param {Personal[]} personales
 * @returns {{
 *   totalPrestado: number,    // suma de montos
 *   totalCobrado: number,     // suma de pagado
 *   totalPendiente: number,   // sumatoria de saldos pendientes
 *   activos: number,          // # préstamos no liquidados
 *   liquidados: number,       // # préstamos completos
 *   pctCobrado: number,       // 0–100
 * }}
 */
export function calcularResumen(personales) {
  const lista = Array.isArray(personales) ? personales : [];
  let totalPrestado  = 0;
  let totalCobrado   = 0;
  let totalPendiente = 0;
  let activos        = 0;
  let liquidados     = 0;

  for (const p of lista) {
    const monto  = p?.monto  || 0;
    const pagado = Math.min(p?.pagado || 0, monto);  // clamp por seguridad
    totalPrestado  += monto;
    totalCobrado   += pagado;
    totalPendiente += Math.max(0, monto - pagado);
    if (monto > 0 && pagado >= monto) liquidados++;
    else if (monto > 0)               activos++;
  }

  const pctCobrado = totalPrestado > 0
    ? Math.round((totalCobrado / totalPrestado) * 100)
    : 0;

  return { totalPrestado, totalCobrado, totalPendiente, activos, liquidados, pctCobrado };
}

/**
 * Ordena préstamos según el modo elegido. No muta el input.
 *
 * - `antiguo`  : más viejos primero — urge cobrar (default).
 * - `reciente` : más recientes primero.
 * - `monto`    : mayor pendiente primero.
 *
 * @param {Personal[]} personales
 * @param {'antiguo' | 'reciente' | 'monto'} [modo='antiguo']
 * @returns {Personal[]} nueva lista ordenada.
 */
export function ordenarPersonales(personales, modo = 'antiguo') {
  const copia = [...(personales || [])];
  if (modo === 'reciente') {
    copia.sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  } else if (modo === 'monto') {
    copia.sort((a, b) => calcularPendiente(b) - calcularPendiente(a));
  } else {
    copia.sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')));
  }
  return copia;
}

// ── VALIDACIÓN / NORMALIZACIÓN ────────────────────────────────────

/**
 * Valida los datos crudos del formulario.
 * @param {Record<string, string>} datos — FormData crudos.
 * @returns {string[]} Lista de errores. Vacía si todo OK.
 */
export function validarPersonal(datos) {
  const errores = [];
  const persona = (datos.persona ?? '').trim();
  const monto   = Number(datos.monto);

  if (!persona) {
    errores.push('Faltó el nombre de la persona.');
  }
  if (!Number.isFinite(monto) || monto <= 0) {
    errores.push('El monto debe ser mayor a 0.');
  }
  if (datos.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) {
    errores.push('La fecha del préstamo no es válida.');
  }
  if (datos.fechaLimite && !/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaLimite)) {
    errores.push('La fecha pactada no es válida.');
  }
  return errores;
}

/**
 * Normaliza los datos del formulario a un objeto Personal limpio.
 * No asigna id ni fechaCreacion — eso lo hace `crud.guardar`.
 *
 * @param {Record<string, string>} datos
 * @returns {Omit<Personal, 'id' | 'fechaCreacion'>}
 */
export function normalizarPersonal(datos) {
  const monto       = Number(datos.monto);
  const pagado      = Number(datos.pagado) || 0;
  const persona     = (datos.persona ?? '').trim();
  const motivo      = (datos.motivo  ?? '').trim();
  const fecha       = datos.fecha       || _hoyISO();
  const fechaLimite = datos.fechaLimite || undefined;

  const item = {
    persona,
    monto,
    pagado: Math.min(pagado, monto),
    fecha,
    liquidado: pagado >= monto,
  };
  if (motivo)      item.motivo      = motivo;
  if (fechaLimite) item.fechaLimite = fechaLimite;
  return item;
}

/**
 * Aplica un pago a un préstamo. Devuelve el objeto actualizado (no muta).
 * Si el monto pagado iguala o supera el saldo, marca `liquidado: true`.
 *
 * @param {Personal} prestamo
 * @param {number} montoPago
 * @returns {Personal} objeto actualizado.
 */
export function aplicarPago(prestamo, montoPago) {
  const pendiente = calcularPendiente(prestamo);
  const aplicado  = Math.min(Math.max(0, Number(montoPago) || 0), pendiente);
  const nuevoPagado = (prestamo.pagado || 0) + aplicado;
  return {
    ...prestamo,
    pagado:    nuevoPagado,
    liquidado: nuevoPagado >= (prestamo.monto || 0),
  };
}

// ── HELPER ───────────────────────────────────────────────────────

function _hoyISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
