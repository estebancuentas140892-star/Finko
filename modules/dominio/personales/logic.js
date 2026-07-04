/**
 * personales/logic.js - funciones puras del dominio de préstamos personales.
 *
 * Sin DOM. Sin S directo. Testeable en Node/Vitest.
 *
 * Préstamo personal = dinero que TÚ prestaste a familia/amigos (espejo de
 * `compromisos.deuda`, donde tú le debes a alguien). Es informal: registro de
 * monto, pagos parciales, antigüedad y opcionalmente una fecha pactada de
 * devolución. Desde PE.1 admite una tasa de interés mensual opcional (interés
 * simple sobre el capital pendiente, el modelo del préstamo informal en
 * Colombia): con tasa, cada pago cubre primero el interés acumulado y el
 * resto baja el capital.
 *
 * @typedef {Object} Personal
 * @property {string} id                 Identificador único.
 * @property {string} persona            Nombre de a quién le prestaste.
 * @property {number} monto              Capital total prestado en COP.
 * @property {number} pagado             Total recibido hasta ahora (capital + interés).
 * @property {string} fecha              ISO 8601 (YYYY-MM-DD) del préstamo.
 * @property {string} [motivo]           Descripción opcional ("mercado", "favor").
 * @property {string} [fechaLimite]      ISO 8601 opcional, fecha pactada de devolución.
 * @property {string} [ultimoPago]       ISO 8601 (YYYY-MM-DD) del último abono recibido.
 * @property {number|null} [tasa]        Tasa de interés mensual en % (ej. 2 = 2%). null/ausente = sin interés.
 * @property {number} [capitalPagado]    Parte de `pagado` que fue a capital (solo con tasa).
 * @property {number} [interesPagado]    Parte de `pagado` que fue a interés (solo con tasa).
 * @property {number} [interesPendiente] Interés devengado no cobrado al último evento (solo con tasa).
 * @property {boolean} liquidado         true cuando no queda capital ni interés pendiente.
 * @property {string} fechaCreacion      ISO 8601 timestamp.
 */

import { tiempoRelativo } from '../../infra/utils.js';
import { calcularInteresSimple } from '../../infra/financiero.js';

// ── CÁLCULOS POR PRÉSTAMO ────────────────────────────────────────

/**
 * true si el préstamo tiene tasa de interés mensual (PE.1).
 * @param {Personal} prestamo
 * @returns {boolean}
 */
export function tieneInteres(prestamo) {
  return Number(prestamo?.tasa) > 0;
}

/**
 * Capital que aún no te han devuelto (sin contar interés).
 * Sin tasa, todo lo pagado fue capital; con tasa, usa el acumulador
 * `capitalPagado` (el interés cobrado no baja el capital).
 *
 * @param {Personal} prestamo
 * @returns {number} COP de capital pendiente (≥ 0).
 */
export function calcularCapitalPendiente(prestamo) {
  const monto = prestamo?.monto || 0;
  const abonadoACapital = tieneInteres(prestamo)
    ? (Number(prestamo.capitalPagado) || 0)
    : (prestamo?.pagado || 0);
  return Math.max(0, monto - abonadoACapital);
}

/**
 * Interés devengado y aún no cobrado a una fecha de referencia (PE.1).
 * Suma el snapshot `interesPendiente` (devengado hasta el último evento) más
 * el interés simple del capital pendiente desde ese evento hasta `fechaRef`.
 * El ancla de devengo es el último abono; sin abonos, la fecha del préstamo.
 *
 * @param {Personal} prestamo
 * @param {Date|string} [fechaRef] default: ahora.
 * @returns {number} COP de interés pendiente (0 si el préstamo no tiene tasa).
 */
export function calcularInteresPendiente(prestamo, fechaRef = new Date()) {
  if (!tieneInteres(prestamo)) return 0;
  const acumulado   = Math.max(0, Number(prestamo.interesPendiente) || 0);
  const capitalPend = calcularCapitalPendiente(prestamo);
  const ancla       = prestamo.ultimoPago || prestamo.fecha;
  if (!ancla || capitalPend <= 0) return Math.round(acumulado);
  const dias = _diasDesde(ancla, _toRef(fechaRef));
  return Math.round(acumulado + calcularInteresSimple(capitalPend, prestamo.tasa, dias));
}

/**
 * Saldo pendiente de un préstamo (lo que aún no te han devuelto).
 * Nunca negativo: si pagado > monto, devuelve 0.
 * Con tasa de interés (PE.1) incluye el interés devengado a `fechaRef`:
 * capital pendiente + interés pendiente.
 *
 * @param {Personal} prestamo
 * @param {Date|string} [fechaRef] default: ahora. Solo se usa con tasa.
 * @returns {number} COP pendientes.
 */
export function calcularPendiente(prestamo, fechaRef = new Date()) {
  if (!tieneInteres(prestamo)) {
    const monto  = prestamo?.monto  || 0;
    const pagado = prestamo?.pagado || 0;
    return Math.max(0, monto - pagado);
  }
  return calcularCapitalPendiente(prestamo) + calcularInteresPendiente(prestamo, fechaRef);
}

/**
 * Días transcurridos desde el evento más reciente de la relación.
 * Sirve para calcular antigüedad y clasificar la "incomodidad" del cobro.
 *
 * La antigüedad NO se cuenta siempre desde el préstamo original: un abono
 * parcial ("Me pagaron") reinicia el reloj de incomodidad, y una fecha
 * pactada de devolución manda sobre la fecha del préstamo. Tomamos la fecha
 * más reciente entre {fecha, fechaLimite, ultimoPago}; si la más reciente
 * está en el futuro (ej. plazo aún vigente), el Math.max final la lleva a 0.
 *
 * @param {Personal} prestamo
 * @param {Date|string} [fechaRef] default: ahora.
 * @returns {number} días (≥ 0).
 */
export function calcularDias(prestamo, fechaRef = new Date()) {
  if (!prestamo?.fecha && !prestamo?.fechaLimite) return 0;
  const ref = fechaRef instanceof Date ? new Date(fechaRef) : new Date(fechaRef);
  ref.setHours(0, 0, 0, 0);

  // Orden lexicográfico de fechas ISO = orden cronológico: la última es la
  // más reciente. Así un abono posterior a la fecha pactada reinicia el reloj.
  const base = [prestamo.fecha, prestamo.fechaLimite, prestamo.ultimoPago]
    .filter(Boolean)
    .sort()
    .pop();
  const fBase = new Date(base + 'T12:00:00');
  fBase.setHours(0, 0, 0, 0);
  const dias = Math.floor((ref - fBase) / 86_400_000);
  return Math.max(0, dias);
}

/**
 * Clasifica la antigüedad de un préstamo pendiente para el tono UX.
 *
 * - `reciente` : 0-14 días - no hace falta presionar.
 * - `mediano`  : 15-60 días - recordatorio sugerido.
 * - `viejo`    : 61+ días - incomodidad real, hay que hablar.
 *
 * Cortes culturales, no legales - entre amigos/familia colombianos
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
 * Porcentaje pagado (0-100). Util para barras de progreso.
 * Con tasa mide la recuperación del capital (el interés cobrado no cuenta:
 * la barra representa cuánto de lo prestado ya volvió).
 *
 * @param {Personal} prestamo
 * @returns {number} 0-100, redondeado.
 */
export function porcentajePagado(prestamo) {
  const monto = prestamo?.monto || 0;
  if (monto <= 0) return 0;
  const base = tieneInteres(prestamo)
    ? (Number(prestamo.capitalPagado) || 0)
    : (prestamo?.pagado || 0);
  return Math.min(100, Math.round((base / monto) * 100));
}

/**
 * Estado de seguimiento de un préstamo para la UI.
 *
 * A diferencia de `clasificarAntiguedad` (que solo mide incomodidad por días),
 * este estado mira la relación completa: si hay fecha pactada manda esa fecha
 * (próximo / hoy / ya pasó); si no, el último abono o la fecha del préstamo.
 *
 * Tipos y significado de `dias`:
 * - `liquidado` : ya no debe nada. `dias` = 0.
 * - `proximo`   : fecha pactada en el futuro. `dias` = cuántos faltan.
 * - `hoy`       : la fecha pactada es hoy. `dias` = 0.
 * - `vencido`   : la fecha pactada ya pasó. `dias` = cuántos pasaron.
 * - `abonado`   : sin fecha pactada, con abonos. `dias` = desde el último abono.
 * - `pendiente` : sin fecha pactada ni abonos. `dias` = desde el préstamo.
 *
 * @param {Personal} prestamo
 * @param {Date|string} [fechaRef] default: ahora.
 * @returns {{ tipo: 'liquidado'|'proximo'|'hoy'|'vencido'|'abonado'|'pendiente', dias: number }}
 */
export function estadoPrestamo(prestamo, fechaRef = new Date()) {
  if (calcularPendiente(prestamo, fechaRef) <= 0) return { tipo: 'liquidado', dias: 0 };

  const ref = fechaRef instanceof Date ? new Date(fechaRef) : new Date(fechaRef);
  ref.setHours(0, 0, 0, 0);

  if (prestamo?.fechaLimite) {
    const lim = new Date(prestamo.fechaLimite + 'T12:00:00');
    lim.setHours(0, 0, 0, 0);
    const diff = Math.round((lim - ref) / 86_400_000);
    if (diff > 0)   return { tipo: 'proximo', dias: diff };
    if (diff === 0) return { tipo: 'hoy', dias: 0 };
    return { tipo: 'vencido', dias: -diff };
  }

  if (prestamo?.ultimoPago) {
    return { tipo: 'abonado', dias: _diasDesde(prestamo.ultimoPago, ref) };
  }
  return { tipo: 'pendiente', dias: _diasDesde(prestamo?.fecha, ref) };
}

/**
 * Copy del chip de estado, en tono de seguimiento (sin presión de cobro).
 *
 * @param {{ tipo: string, dias: number }} estado - salida de `estadoPrestamo`.
 * @returns {string}
 */
export function labelEstado(estado) {
  switch (estado.tipo) {
    case 'liquidado':
      return 'Liquidado';
    case 'proximo':
      return estado.dias === 1 ? 'Próximo pago mañana' : `Próximo pago en ${estado.dias} días`;
    case 'hoy':
      return 'Pago programado para hoy';
    case 'vencido':
      return `La fecha de pago pasó ${tiempoRelativo(estado.dias)}`;
    case 'abonado':
      return estado.dias === 0 ? 'Recibiste un abono hoy' : `Último abono ${tiempoRelativo(estado.dias)}`;
    default:
      return `Prestado ${tiempoRelativo(estado.dias)}`;
  }
}

// ── AGREGADOS ────────────────────────────────────────────────────

/**
 * Resume el estado total de los préstamos.
 *
 * Con préstamos a interés (PE.1): `totalCobrado` incluye el interés recibido,
 * `totalPendiente` incluye el interés devengado a `fechaRef`, y `pctCobrado`
 * mide solo la recuperación del capital prestado (para que la barra no pase
 * de 100 por los intereses).
 *
 * @param {Personal[]} personales
 * @param {Date|string} [fechaRef] default: ahora. Solo afecta préstamos con tasa.
 * @returns {{
 *   totalPrestado: number,    // suma de montos (capital)
 *   totalCobrado: number,     // total recibido (capital + interés)
 *   totalPendiente: number,   // sumatoria de saldos pendientes (con interés)
 *   activos: number,          // # préstamos no liquidados
 *   liquidados: number,       // # préstamos completos
 *   pctCobrado: number,       // 0-100, capital recuperado / capital prestado
 * }}
 */
export function calcularResumen(personales, fechaRef = new Date()) {
  const lista = Array.isArray(personales) ? personales : [];
  let totalPrestado  = 0;
  let totalCobrado   = 0;
  let totalPendiente = 0;
  let capitalCobrado = 0;
  let activos        = 0;
  let liquidados     = 0;

  for (const p of lista) {
    const monto = p?.monto || 0;
    totalPrestado += monto;

    if (tieneInteres(p)) {
      const capPagado = Math.min(Number(p.capitalPagado) || 0, monto);
      const pendiente = calcularPendiente(p, fechaRef);
      totalCobrado   += p?.pagado || 0;   // incluye interés recibido
      capitalCobrado += capPagado;
      totalPendiente += pendiente;
      if (monto > 0 && pendiente <= 0) liquidados++;
      else if (monto > 0)              activos++;
    } else {
      const pagado = Math.min(p?.pagado || 0, monto);  // clamp por seguridad
      totalCobrado   += pagado;
      capitalCobrado += pagado;
      totalPendiente += Math.max(0, monto - pagado);
      if (monto > 0 && pagado >= monto) liquidados++;
      else if (monto > 0)               activos++;
    }
  }

  const pctCobrado = totalPrestado > 0
    ? Math.round((capitalCobrado / totalPrestado) * 100)
    : 0;

  return { totalPrestado, totalCobrado, totalPendiente, activos, liquidados, pctCobrado };
}

/**
 * Ordena préstamos según el modo elegido. No muta el input.
 *
 * - `antiguo`  : más viejos primero - urge cobrar (default).
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
 * @param {Record<string, string>} datos - FormData crudos.
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
  if (datos.tasa != null && String(datos.tasa).trim() !== '') {
    const tasa = Number(datos.tasa);
    if (!Number.isFinite(tasa) || tasa < 0 || tasa > 100) {
      errores.push('La tasa de interés mensual debe ser un número entre 0 y 100.');
    }
  }
  return errores;
}

/**
 * Normaliza los datos del formulario a un objeto Personal limpio.
 * No asigna id ni fechaCreacion - eso lo hace `crud.guardar`.
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

  // Tasa de interés mensual opcional (PE.1). Con tasa arrancan los
  // acumuladores capital/interés: lo pagado al crear se asume capital.
  const tasa = Number(datos.tasa);
  if (Number.isFinite(tasa) && tasa > 0) {
    item.tasa             = tasa;
    item.capitalPagado    = item.pagado;
    item.interesPagado    = 0;
    item.interesPendiente = 0;
  }
  return item;
}

/**
 * Desglosa un pago en interés y capital SIN aplicarlo (preview puro).
 * Sin tasa, todo el pago va a capital. Con tasa, el pago cubre primero el
 * interés devengado a `fechaPago` y el resto baja el capital. El total
 * aplicado se recorta al pendiente (interés + capital): no se puede cobrar
 * de más.
 *
 * @param {Personal} prestamo
 * @param {number} montoPago
 * @param {string} [fechaPago] ISO 8601 (YYYY-MM-DD). Default: hoy.
 * @returns {{ aplicado: number, aCapital: number, aInteres: number }}
 */
export function desglosarPago(prestamo, montoPago, fechaPago = _hoyISO()) {
  const bruto = Math.max(0, Number(montoPago) || 0);
  if (!tieneInteres(prestamo)) {
    const aplicado = Math.min(bruto, calcularPendiente(prestamo));
    return { aplicado, aCapital: aplicado, aInteres: 0 };
  }
  const interesPend = calcularInteresPendiente(prestamo, fechaPago);
  const capitalPend = calcularCapitalPendiente(prestamo);
  const aplicado    = Math.min(bruto, interesPend + capitalPend);
  const aInteres    = Math.min(aplicado, interesPend);
  return { aplicado, aCapital: aplicado - aInteres, aInteres };
}

/**
 * Aplica un pago a un préstamo. Devuelve el objeto actualizado (no muta).
 * Si el monto pagado cubre todo el pendiente, marca `liquidado: true`.
 *
 * Con tasa (PE.1): el pago cubre primero el interés devengado a `fechaPago`
 * y el resto baja el capital. `interesPendiente` queda como snapshot del
 * devengo a esa fecha y `ultimoPago` pasa a ser la nueva ancla de devengo.
 *
 * Registra `ultimoPago` con la fecha del abono SOLO si efectivamente entró
 * dinero: un pago rechazado (0 o inválido) no debe reiniciar el reloj de
 * antigüedad que usa `calcularDias`, ni mover el ancla de devengo.
 *
 * @param {Personal} prestamo
 * @param {number} montoPago
 * @param {string} [fechaPago] ISO 8601 (YYYY-MM-DD) del abono. Default: hoy.
 * @returns {Personal} objeto actualizado.
 */
export function aplicarPago(prestamo, montoPago, fechaPago = _hoyISO()) {
  if (!tieneInteres(prestamo)) {
    const pendiente = calcularPendiente(prestamo);
    const aplicado  = Math.min(Math.max(0, Number(montoPago) || 0), pendiente);
    const nuevoPagado = (prestamo.pagado || 0) + aplicado;
    const actualizado = {
      ...prestamo,
      pagado:    nuevoPagado,
      liquidado: nuevoPagado >= (prestamo.monto || 0),
    };
    if (aplicado > 0) actualizado.ultimoPago = fechaPago;
    return actualizado;
  }

  const { aplicado, aCapital, aInteres } = desglosarPago(prestamo, montoPago, fechaPago);
  // Pago rechazado: no tocar nada (ni el snapshot de interés, cuyo ancla
  // de devengo seguiría en el evento anterior y contaría doble).
  if (aplicado <= 0) return { ...prestamo };

  const interesPend        = calcularInteresPendiente(prestamo, fechaPago);
  const nuevoCapitalPagado = (Number(prestamo.capitalPagado) || 0) + aCapital;
  const nuevoInteresPend   = interesPend - aInteres;

  return {
    ...prestamo,
    pagado:           (prestamo.pagado || 0) + aplicado,
    capitalPagado:    nuevoCapitalPagado,
    interesPagado:    (Number(prestamo.interesPagado) || 0) + aInteres,
    interesPendiente: nuevoInteresPend,
    liquidado:        nuevoCapitalPagado >= (prestamo.monto || 0) && nuevoInteresPend <= 0,
    ultimoPago:       fechaPago,
  };
}

// ── HELPER ───────────────────────────────────────────────────────

/**
 * Normaliza una referencia de fecha a Date a medianoche local. Un string
 * ISO corto (YYYY-MM-DD) se ancla a mediodía local antes de normalizar,
 * para evitar el corrimiento de día que produce el parseo UTC.
 * @param {Date|string} fechaRef
 * @returns {Date}
 */
function _toRef(fechaRef) {
  const ref = (typeof fechaRef === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaRef))
    ? new Date(fechaRef + 'T12:00:00')
    : new Date(fechaRef);
  ref.setHours(0, 0, 0, 0);
  return ref;
}

/**
 * Días completos desde una fecha ISO hasta la referencia (ya normalizada a
 * medianoche). Sin fecha o fecha futura devuelve 0.
 * @param {string|undefined} iso
 * @param {Date} ref
 * @returns {number}
 */
function _diasDesde(iso, ref) {
  if (!iso) return 0;
  const base = new Date(iso + 'T12:00:00');
  base.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((ref - base) / 86_400_000));
}

function _hoyISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
