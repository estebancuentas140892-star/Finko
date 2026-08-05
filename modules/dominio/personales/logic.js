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
 * @property {string} [cuentaId]         Cuenta de la que salió el dinero (PE.7). Ausente = el
 *                                       préstamo no movió ningún saldo y no cuenta como activo.
 * @property {Abono[]} [abonos]          Historial de abonos recibidos (PE.6b, schema v34).
 * @property {boolean} liquidado         true cuando no queda capital ni interés pendiente.
 * @property {string} fechaCreacion      ISO 8601 timestamp.
 *
 * Un abono del historial (PE.6b, ADR 047 D3). Antes de v34 solo existía el
 * acumulador `pagado`, así que un préstamo con cinco abonos y uno con un solo
 * pago eran indistinguibles: sin historial no hay rendimiento (D4) ni
 * estadísticas por persona (D5).
 *
 * Invariante: la suma de `monto` del historial es igual a `pagado`. La
 * migración lo respeta agrupando lo ya cobrado en un abono `agrupado`, en vez
 * de dejar el historial vacío y desincronizado con el acumulado. La única
 * excepción es una edición que baje el `monto` por debajo de lo ya abonado: el
 * clamp de `pagado` es anterior a PE.6b y se conserva tal cual.
 *
 * @typedef {Object} Abono
 * @property {string} fecha        ISO 8601 (YYYY-MM-DD) del abono.
 * @property {number} monto        COP recibidos en ese abono.
 * @property {number} aCapital     Parte que bajó el capital.
 * @property {number} aInteres     Parte que cubrió interés devengado (0 sin tasa).
 * @property {string} [cuentaId]   Cuenta donde entró el dinero. Ausente = no movió saldos.
 * @property {boolean} [agrupado]  true solo en el abono sintético de la migración v33 → v34:
 *                                 resume todo lo cobrado antes de que existiera el historial.
 *                                 La fecha es la del último abono conocido, no la de cada uno.
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
 * Capital pendiente que cuenta como ACTIVO en el patrimonio (PE.7): la suma del
 * capital aún no devuelto, contando **solo los préstamos con `cuentaId`**.
 *
 * Por qué solo esos, y por qué esto no es un descuido:
 *   La regla del patrimonio (ver `calcularActivos` en analisis/logic.js) es que
 *   un bucket se suma aparte únicamente si su dinero YA SALIÓ de `cuentas`. Un
 *   préstamo con `cuentaId` descontó esa cuenta al registrarse, así que su
 *   capital pendiente es dinero que ya no está en `cuentas`: sumarlo no duplica,
 *   y de hecho es necesario (prestar convierte efectivo en un derecho de cobro,
 *   no destruye riqueza). Un préstamo SIN `cuentaId` (registro anterior a PE.7,
 *   o efectivo que Finko nunca vio) no movió ninguna cuenta: su dinero sigue
 *   contado dentro de `cuentas` y sumarlo aquí lo contaría DOS VECES.
 *   Es el mismo criterio que excluye al fondo de emergencia de los activos.
 *
 * El interés pendiente se excluye a propósito: no se ha ganado ni cobrado, y
 * el usuario puede perdonarlo. Solo capital.
 *
 * @param {Personal[]} personales
 * @returns {number} COP de capital por cobrar que ya salió de una cuenta (≥ 0).
 */
export function calcularTotalPorCobrar(personales) {
  return (Array.isArray(personales) ? personales : [])
    .filter(p => p && p.cuentaId)
    .reduce((acc, p) => acc + calcularCapitalPendiente(p), 0);
}

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
 * EDIT.1: con `existente`, edita un préstamo en vez de crear uno. La cuenta de
 * origen NO se vuelve a preguntar (mismo criterio que Inversión, ADR 053):
 * se decide una sola vez al crear y el form de edición no la muestra como
 * campo, así que siempre se conserva la de `existente`. El histórico de
 * abonos (`pagado`, `capitalPagado`, `interesPagado`, `interesPendiente`,
 * `ultimoPago`) se conserva igual; solo `liquidado` se recalcula, porque el
 * monto editado pudo cambiar el pendiente. Si la tasa cambia de 0 a con
 * interés, lo pagado hasta ahora se asume capital (mismo criterio que al
 * crear); si pasa de con interés a sin interés, los acumuladores de interés
 * se limpian y `pagado` queda como capital simple.
 *
 * @param {Record<string, string>} datos
 * @param {Personal|null} [existente] préstamo a editar; `null` = crear.
 * @returns {Omit<Personal, 'id' | 'fechaCreacion'>}
 */
export function normalizarPersonal(datos, existente = null) {
  const d           = datos ?? {};
  const monto       = Number(d.monto);
  const persona     = (d.persona ?? '').trim();
  const motivo      = (d.motivo  ?? '').trim();
  const fechaLimite = d.fechaLimite || undefined;
  const tasa        = Number(d.tasa);
  const conTasa     = Number.isFinite(tasa) && tasa > 0;

  if (existente) {
    const fecha = d.fecha || existente.fecha;
    const item = { persona, monto, fecha, liquidado: false };
    // A diferencia de crear, acá sí se asignan aunque queden vacíos: si el
    // usuario borra el campo para limpiarlo, `editar()` (Object.assign) debe
    // sobreescribir el valor viejo, no conservarlo por omitir la clave.
    item.motivo      = motivo || undefined;
    item.fechaLimite = fechaLimite;
    if (existente.cuentaId) item.cuentaId = existente.cuentaId;
    if (existente.ultimoPago) item.ultimoPago = existente.ultimoPago;
    // PE.6b: el historial es el registro de lo que pasó, no un derivado del
    // préstamo actual. Cambiar la tasa reescribe los acumuladores (abajo), pero
    // NO los abonos ya recibidos: su desglose capital/interés fue real cuando
    // se cobró, y reetiquetarlo hacia atrás sería inventar historia.
    item.abonos = Array.isArray(existente.abonos) ? existente.abonos : [];

    if (conTasa) {
      item.tasa = tasa;
      // Con tasa antes: conserva el histórico. Sin tasa antes: arranca los
      // acumuladores igual que al crear, lo pagado hasta hoy se asume capital.
      item.capitalPagado    = tieneInteres(existente) ? (Number(existente.capitalPagado) || 0) : (existente.pagado || 0);
      item.interesPagado    = tieneInteres(existente) ? (Number(existente.interesPagado) || 0) : 0;
      item.interesPendiente = tieneInteres(existente) ? (Number(existente.interesPendiente) || 0) : 0;
      item.pagado           = existente.pagado || 0;
      item.liquidado        = item.capitalPagado >= monto && item.interesPendiente <= 0;
    } else {
      // Sin tasa: si venía con interés, sus acumuladores se limpian (undefined
      // explícito, no se omiten: un `tasa` viejo truthy dejaría `tieneInteres`
      // en true aunque el usuario haya quitado la tasa).
      item.tasa             = undefined;
      item.capitalPagado    = undefined;
      item.interesPagado    = undefined;
      item.interesPendiente = undefined;
      item.pagado           = Math.min(existente.pagado || 0, monto);
      item.liquidado        = item.pagado >= monto;
    }
    return item;
  }

  const pagado = Number(d.pagado) || 0;
  const fecha  = d.fecha || _hoyISO();

  const item = {
    persona,
    monto,
    pagado: Math.min(pagado, monto),
    fecha,
    liquidado: pagado >= monto,
    // PE.6b: el historial nace con el préstamo, no al primer cobro. Si el alta
    // ya viene con algo abonado, ese monto entra como primer abono a la fecha
    // del préstamo: es lo que mantiene la suma del historial igual a `pagado`.
    abonos: [],
  };
  if (item.pagado > 0) {
    item.abonos = [{ fecha, monto: item.pagado, aCapital: item.pagado, aInteres: 0 }];
  }
  if (motivo)      item.motivo      = motivo;
  if (fechaLimite) item.fechaLimite = fechaLimite;

  // PE.7: cuenta de la que salió el dinero. Se incluye SOLO si viene con valor
  // (patrón condicional de MC.13d): omitirlo es lo que permite que `editar()`
  // (Object.assign) conserve la cuenta ya guardada, y que un préstamo sin
  // cuenta vinculada quede sin el campo en vez de con un `undefined` explícito.
  // Sin cuenta, el préstamo vale como seguimiento y no toca ningún saldo.
  const cuentaId = typeof d.cuentaId === 'string' ? d.cuentaId.trim() : '';
  if (cuentaId) item.cuentaId = cuentaId;

  // Tasa de interés mensual opcional (PE.1). Con tasa arrancan los
  // acumuladores capital/interés: lo pagado al crear se asume capital.
  if (conTasa) {
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
 * PE.6b: el mismo abono se anexa al historial (`abonos`), con su desglose ya
 * calculado y la cuenta donde entró el dinero. Se guarda el desglose y no solo
 * el monto porque recalcularlo después es imposible: depende del interés
 * devengado a esa fecha, que el siguiente abono ya movió.
 *
 * @param {Personal} prestamo
 * @param {number} montoPago
 * @param {string} [fechaPago] ISO 8601 (YYYY-MM-DD) del abono. Default: hoy.
 * @param {string|null} [cuentaId] cuenta donde entró el dinero (PE.7). null = no movió saldos.
 * @returns {Personal} objeto actualizado.
 */
export function aplicarPago(prestamo, montoPago, fechaPago = _hoyISO(), cuentaId = null) {
  if (!tieneInteres(prestamo)) {
    const pendiente = calcularPendiente(prestamo);
    const aplicado  = Math.min(Math.max(0, Number(montoPago) || 0), pendiente);
    const nuevoPagado = (prestamo.pagado || 0) + aplicado;
    const actualizado = {
      ...prestamo,
      pagado:    nuevoPagado,
      liquidado: nuevoPagado >= (prestamo.monto || 0),
    };
    if (aplicado > 0) {
      actualizado.ultimoPago = fechaPago;
      actualizado.abonos     = _conAbono(prestamo, {
        fecha: fechaPago, monto: aplicado, aCapital: aplicado, aInteres: 0, cuentaId,
      });
    }
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
    abonos:           _conAbono(prestamo, { fecha: fechaPago, monto: aplicado, aCapital, aInteres, cuentaId }),
  };
}

/**
 * Historial de abonos listo para mostrar: el más reciente primero (PE.6b).
 * No muta el input y tolera el préstamo anterior a v34 (sin el campo).
 *
 * El desempate por fecha usa el orden de registro invertido, no el criterio del
 * navegador: dos abonos del mismo día tienen que salir en orden inverso al que
 * entraron, y `Array.sort` solo garantiza estabilidad, no ese orden.
 *
 * @param {Personal} prestamo
 * @returns {Abono[]}
 */
export function historialAbonos(prestamo) {
  const lista = Array.isArray(prestamo?.abonos) ? prestamo.abonos : [];
  return lista
    .map((abono, i) => ({ abono, i }))
    .sort((a, b) => String(b.abono.fecha || '').localeCompare(String(a.abono.fecha || '')) || (b.i - a.i))
    .map(({ abono }) => abono);
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

/**
 * Anexa un abono al historial del préstamo (PE.6b). No muta el input.
 * `cuentaId` se incluye solo si viene con valor, mismo patrón condicional que
 * `Personal.cuentaId`: un abono en efectivo queda sin el campo, no con un
 * `undefined` explícito que después habría que filtrar al leer.
 *
 * @param {Personal} prestamo
 * @param {{ fecha: string, monto: number, aCapital: number, aInteres: number, cuentaId?: string|null }} abono
 * @returns {Abono[]}
 */
function _conAbono(prestamo, abono) {
  const previos = Array.isArray(prestamo?.abonos) ? prestamo.abonos : [];
  const item = {
    fecha:    abono.fecha,
    monto:    abono.monto,
    aCapital: abono.aCapital,
    aInteres: abono.aInteres,
  };
  if (abono.cuentaId) item.cuentaId = abono.cuentaId;
  return [...previos, item];
}

function _hoyISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
