/**
 * agenda/logic.js - funciones puras del dominio Agenda.
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 *
 * La Agenda es una vista calendario sobre S.compromisos (no agrega datos
 * nuevos). Mapea cada compromiso activo a los días del mes en que cae,
 * respetando su frecuencia (Mensual, Quincenal, Bimestral, etc).
 *
 * La regla de frecuencias (en qué días cae un item según su frecuencia) vive
 * en `infra/vencimientos.js` (`ocurrenciasEnMes`, MC.13a/ADR 041): Agenda la
 * consume, ya no la duplica. Antes vivía aquí como `_diasParaCompromiso`; se
 * extrajo para que la Distribución v2, los pagos automáticos y este dominio
 * compartan una sola fuente de verdad (regla 2.7).
 */

import { ocurrenciasEnMes } from '../../infra/vencimientos.js';

// ── API PÚBLICA ──────────────────────────────────────────────────

/**
 * Mapea compromisos a los días del mes en que caen.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @param {number} year   Año completo (ej. 2026).
 * @param {number} month  Mes 0-indexed (0=Enero, 11=Diciembre). Match con Date.
 * @returns {Record<number, Array<import('../../core/state.js').Compromiso & {dia:number}>>}
 *   Mapa { dia: [compromiso, ...] }. Sólo incluye días que tienen al menos un evento.
 */
export function eventosDelMes(compromisos, year, month) {
  if (!Array.isArray(compromisos)) return {};
  if (!Number.isInteger(year))    return {};
  if (!Number.isInteger(month) || month < 0 || month > 11) return {};

  /** @type {Record<number, any[]>} */
  const eventos = {};

  for (const c of compromisos) {
    if (!c || typeof c !== 'object') continue;
    if (c.activo === false) continue;

    // `ocurrenciasEnMes` valida el diaPago (devuelve [] si es inválido) y
    // resuelve la frecuencia: Agenda sólo agrega el filtro de dominio.
    for (const d of ocurrenciasEnMes(c, year, month)) {
      if (!eventos[d]) eventos[d] = [];
      eventos[d].push({ ...c, dia: d });
    }
  }

  return eventos;
}

/**
 * Mapea los ingresos activos a los días del mes en que llega su pago
 * (ADR 021: recordatorio de día de ingreso). Reusa la misma lógica de
 * frecuencia que los compromisos: un Ingreso tiene la misma forma relevante
 * (`frecuencia`, `diaPago`, `fechaCreacion`). Cada evento queda marcado con
 * `tipo: 'ingreso'` para que la vista lo distinga de un compromiso y
 * `totalDia` no lo sume como dinero a pagar.
 *
 * @param {Array<{descripcion:string, monto:number, frecuencia:string,
 *                diaPago:number|null, activo:boolean, fechaCreacion?:string}>} ingresos
 * @param {number} year   Año completo (ej. 2026).
 * @param {number} month  Mes 0-indexed (0=Enero, 11=Diciembre).
 * @returns {Record<number, Array<Object>>} Mapa { dia: [evento, ...] }.
 */
export function eventosIngresosDelMes(ingresos, year, month) {
  if (!Array.isArray(ingresos)) return {};
  if (!Number.isInteger(year))  return {};
  if (!Number.isInteger(month) || month < 0 || month > 11) return {};

  /** @type {Record<number, any[]>} */
  const eventos = {};

  for (const ing of ingresos) {
    if (!ing || typeof ing !== 'object') continue;
    if (ing.activo === false) continue;

    for (const d of ocurrenciasEnMes(ing, year, month)) {
      if (!eventos[d]) eventos[d] = [];
      eventos[d].push({ ...ing, dia: d, tipo: 'ingreso' });
    }
  }

  return eventos;
}

/**
 * Cuenta total de eventos en el mes (suma de longitudes de cada día).
 * Útil para badges o resúmenes en la cabecera del calendario.
 *
 * @param {ReturnType<typeof eventosDelMes>} eventos
 * @returns {number}
 */
export function totalEventosDelMes(eventos) {
  if (!eventos || typeof eventos !== 'object') return 0;
  return Object.values(eventos).reduce((acc, arr) => acc + (arr?.length ?? 0), 0);
}

/**
 * Tipos de evento (`ingreso`, `fijo`, `deuda-entidad`, `deuda-personal`) que
 * aparecen en el mes visible, en el orden canónico de la leyenda (CAL.2). Un
 * compromiso sin `tipo` cuenta como `fijo` (mismo criterio defensivo que
 * `_renderDots` en la vista).
 *
 * @param {ReturnType<typeof eventosDelMes>} eventos
 * @returns {string[]}
 */
export function tiposPresentesEnMes(eventos) {
  const ORDEN = ['ingreso', 'fijo', 'deuda-entidad', 'deuda-personal'];
  if (!eventos || typeof eventos !== 'object') return [];

  const presentes = new Set();
  for (const evs of Object.values(eventos)) {
    if (!Array.isArray(evs)) continue;
    for (const e of evs) {
      if (!e || typeof e !== 'object') continue;
      presentes.add(e.tipo ?? 'fijo');
    }
  }

  return ORDEN.filter(t => presentes.has(t));
}

/**
 * Devuelve los compromisos que caen hoy según la lógica de frecuencia.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @returns {Array<import('../../core/state.js').Compromiso & {dia:number}>}
 */
export function eventosDeHoy(compromisos) {
  const hoy = new Date();
  const eventos = eventosDelMes(compromisos, hoy.getFullYear(), hoy.getMonth());
  return eventos[hoy.getDate()] ?? [];
}

/**
 * Suma cuánto hay que pagar en un día del calendario: `monto` para gastos
 * fijos, `cuotaMensual` para deudas (mismo criterio que usa el render de
 * cada item individual y que `sumarMontos` de compromisos/logic.js, AUD.1).
 * Duplicado intencional y no una importación cruzada: Agenda no puede
 * importar de Compromisos (ADN #10, ningún dominio importa a otro).
 *
 * @param {Array<{ tipo?: string, monto?: number, cuotaMensual?: number }>} evs
 * @returns {number} Total en COP. 0 si la lista está vacía o es inválida.
 */
export function totalDia(evs) {
  if (!Array.isArray(evs)) return 0;
  let total = 0;
  for (const c of evs) {
    if (!c || typeof c !== 'object') continue;
    // Un día de ingreso (ADR 021) no es dinero a pagar: se excluye del total.
    if (c.tipo === 'ingreso') continue;
    const raw = c.tipo === 'fijo' ? c.monto : c.cuotaMensual;
    const n = Number(raw);
    if (Number.isFinite(n)) total += n;
  }
  return total;
}

/**
 * Totales financieros del mes visible para el hero (CAL.4a, ADR 037 D1).
 *
 * - `total`: suma de cada aparición de compromiso en el mes (`monto` para
 *   fijos, `cuotaMensual` para deudas, mismo criterio que `totalDia`): un
 *   quincenal cuenta dos veces. Los días de ingreso no son dinero a pagar
 *   (ADR 021) y las apariciones sin monto positivo (ej. fiado sin cuota
 *   fija, D.13) no suman.
 * - `pagado`: cruza `gastos` por `compromisoId` + prefijo de mes (mismo
 *   criterio que `calcularAbonosDelMes` de compromisos/logic.js; duplicado
 *   intencional y no una importación cruzada, ADN #10, misma nota que
 *   `totalDia`), con tope en lo adeudado por compromiso: pagar de más no
 *   infla el progreso del mes.
 *
 * @param {ReturnType<typeof eventosDelMes>} eventos  Mapa día → eventos del
 *   mes visible, ya mergeado (compromisos + ingresos) por la vista.
 * @param {Array<{compromisoId?:string, fecha?:string, monto?:number}>} gastos
 * @param {string} prefijoMes 'YYYY-MM' del mes visible.
 * @returns {{ total:number, pagado:number }} Montos en COP.
 */
export function totalesDelMes(eventos, gastos, prefijoMes) {
  const out = { total: 0, pagado: 0 };
  if (!eventos || typeof eventos !== 'object') return out;

  /** @type {Record<string, number>} Adeudado del mes por compromiso. */
  const adeudado = {};
  for (const evs of Object.values(eventos)) {
    if (!Array.isArray(evs)) continue;
    for (const c of evs) {
      if (!c || typeof c !== 'object') continue;
      if (c.tipo === 'ingreso') continue;
      const raw = c.tipo === 'fijo' ? c.monto : c.cuotaMensual;
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) continue;
      out.total += n;
      if (c.id) adeudado[c.id] = (adeudado[c.id] ?? 0) + n;
    }
  }

  if (out.total === 0 || !Array.isArray(gastos) ||
      typeof prefijoMes !== 'string' || prefijoMes === '') {
    return out;
  }

  /** @type {Record<string, number>} Abonado en el mes por compromiso. */
  const abonos = {};
  for (const g of gastos) {
    if (!g || typeof g !== 'object') continue;
    const id = g.compromisoId;
    if (!id || !(id in adeudado)) continue;
    if (typeof g.fecha !== 'string' || !g.fecha.startsWith(prefijoMes)) continue;
    const n = Number(g.monto);
    if (Number.isFinite(n) && n > 0) abonos[id] = (abonos[id] ?? 0) + n;
  }

  for (const [id, deuda] of Object.entries(adeudado)) {
    out.pagado += Math.min(abonos[id] ?? 0, deuda);
  }
  return out;
}

/**
 * Busca el primer día con compromisos dentro de los próximos `diasMax` días
 * (sin incluir hoy). Útil para el mensaje "próximo vencimiento" cuando hoy
 * no tiene eventos.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @param {number} [diasMax=14] Ventana de búsqueda en días.
 * @returns {{ diasRestantes: number, fecha: Date,
 *             eventos: Array<import('../../core/state.js').Compromiso & {dia:number}> } | null}
 */
export function eventosEnProximos(compromisos, diasMax = 14) {
  const hoy = new Date();

  for (let i = 1; i <= diasMax; i++) {
    const proxima = new Date(hoy);
    proxima.setDate(hoy.getDate() + i);

    const mapa = eventosDelMes(compromisos, proxima.getFullYear(), proxima.getMonth());
    const diaEventos = mapa[proxima.getDate()] ?? [];

    if (diaEventos.length > 0) {
      return { diasRestantes: i, fecha: proxima, eventos: diaEventos };
    }
  }
  return null;
}
