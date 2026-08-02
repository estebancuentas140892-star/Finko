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

/**
 * Los dos tipos de compromiso que se abonan contra `saldoTotal`. Copia local
 * y deliberada de `TIPOS_COMPROMISO` de Compromisos (ADN #10: `agenda/logic.js`
 * no importa de otro dominio), mismo criterio que el orden canónico hardcodeado
 * en `tiposPresentesEnMes`.
 */
const TIPOS_DEUDA = ['deuda-entidad', 'deuda-personal'];

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
 * Compromisos del mes visible que ya vencieron y siguen sin cubrir (CAL.5a,
 * ampliada a deudas por CAL.5b): la lista que alimenta el pago en lote.
 *
 * Aplica la MISMA regla temporal que "Marcar pagado" individual (BUG-015), para
 * que el lote no pueda registrar nada que el botón de a uno no registraría:
 *
 * - Mes en curso: solo los que caen hoy o antes (lo que aún no vence no se paga).
 * - Mes pasado: todos los pendientes (todos están vencidos).
 * - Mes futuro: ninguno. Finko registra lo que pasó, no lo que va a pasar.
 *
 * Alcance: gastos fijos y deudas (`deuda-entidad`, `deuda-personal`). Los dos
 * tipos comparten el flujo pero no la aritmética, y esa diferencia se decide
 * acá, no en el handler (CAL.5b):
 *
 * - **Fijo**: se paga de una vez. Lo que vence es `monto` y cualquier gasto
 *   vinculado ese mes lo cierra.
 * - **Deuda**: lo que vence es `cuotaMensual`, y un abono puede ser parcial. El
 *   lote ofrece **lo que falta de la cuota de este mes**, nunca la cuota
 *   completa: sumar la cuota entera sobre un abono previo cobraría dos veces.
 *   Ese faltante se topa además en `saldoTotal` (la última cuota de una deuda
 *   casi saldada es el resto, mismo criterio que `ajustarMontoAbono`), y una
 *   deuda ya saldada no aparece.
 *
 * Un compromiso aparece **una sola vez** aunque caiga varias veces en el mes
 * (un quincenal): el estado de pago es por mes, no por ocurrencia (lo fija
 * `estadoPagoMes`), así que listarlo dos veces registraría un doble cobro. Se
 * conserva la ocurrencia más antigua, que es la vencida.
 *
 * El cruce "ya cubierto este mes" se hace aquí y no vía `estadoPagoMes` de
 * Compromisos: `agenda/logic.js` no importa de otro dominio (ADN #10), mismo
 * duplicado intencional y por la misma razón que `totalesDelMes` y `totalDia`.
 * El criterio es el mismo que el de `estadoPagoMes`: para un fijo, cualquier
 * gasto vinculado; para una deuda, abonos que alcancen la cuota del mes.
 *
 * @param {ReturnType<typeof eventosDelMes>} eventos Mapa día → eventos del mes
 *   visible (sirve el ya mergeado con ingresos: se filtran por tipo).
 * @param {Array<{compromisoId?:string, fecha?:string, monto?:number}>} gastos
 * @param {string} prefijoMes 'YYYY-MM' del mes visible.
 * @param {string} hoyISO 'YYYY-MM-DD'.
 * @returns {Array<{id:string, descripcion:string, monto:number, dia:number,
 *   tipo:string, parcial:boolean}>} `monto` es lo que falta por cubrir (no
 *   siempre la cuota) y `parcial` marca la deuda que ya tenía un abono este
 *   mes. Ordenados por día ascendente (lo más vencido primero).
 */
export function pendientesDePagoDelMes(eventos, gastos, prefijoMes, hoyISO) {
  if (!eventos || typeof eventos !== 'object') return [];

  const mp = /^(\d{4})-(\d{2})$/.exec(prefijoMes ?? '');
  const mh = /^(\d{4})-(\d{2})-(\d{2})/.exec(hoyISO ?? '');
  if (!mp || !mh) return [];

  const anio = +mp[1], mes = +mp[2];
  if (mes < 1 || mes > 12) return [];
  const anioHoy = +mh[1], mesHoy = +mh[2], diaHoy = +mh[3];

  // Mes futuro: nada que pagar todavía.
  if (anio > anioHoy || (anio === anioHoy && mes > mesHoy)) return [];
  const esMesEnCurso = anio === anioHoy && mes === mesHoy;

  /** @type {Map<string, {id:string, descripcion:string, monto:number, dia:number, tipo:string, tope:number}>} */
  const porId = new Map();

  for (const [diaStr, evs] of Object.entries(eventos)) {
    const dia = Number(diaStr);
    if (!Number.isInteger(dia)) continue;
    if (esMesEnCurso && dia > diaHoy) continue; // aún no vence
    if (!Array.isArray(evs)) continue;

    for (const c of evs) {
      if (!c || typeof c !== 'object') continue;
      // Un compromiso sin `tipo` cuenta como fijo (criterio defensivo, el
      // mismo de `_renderDots` y `tiposPresentesEnMes`). El día de ingreso
      // (ADR 021) no es dinero a pagar y no entra.
      const tipo = c.tipo ?? 'fijo';
      const deuda = TIPOS_DEUDA.includes(tipo);
      if (tipo !== 'fijo' && !deuda) continue;
      if (!c.id) continue;

      // Lo que vence este mes: el monto del fijo, la cuota de la deuda
      // (mismo criterio que `totalDia` y `totalesDelMes`).
      const monto = Number(deuda ? c.cuotaMensual : c.monto);
      if (!Number.isFinite(monto) || monto <= 0) continue;

      // Una deuda saldada no tiene nada que abonar; su saldo es además el
      // techo de lo que se puede ofrecer.
      const tope = deuda ? Number(c.saldoTotal) : Infinity;
      if (deuda && (!Number.isFinite(tope) || tope <= 0)) continue;

      const previo = porId.get(c.id);
      if (!previo) {
        porId.set(c.id, {
          id:          c.id,
          descripcion: c.descripcion ?? '',
          monto,
          dia,
          tipo,
          tope,
        });
      } else if (dia < previo.dia) {
        previo.dia = dia;
      }
    }
  }

  if (porId.size === 0) return [];

  /** @type {Record<string, number>} Abonado en el mes por compromiso. */
  const abonos = {};
  for (const g of (Array.isArray(gastos) ? gastos : [])) {
    if (!g || typeof g !== 'object') continue;
    if (!g.compromisoId || !porId.has(g.compromisoId)) continue;
    if (typeof g.fecha !== 'string' || !g.fecha.startsWith(prefijoMes)) continue;
    const n = Number(g.monto);
    if (Number.isFinite(n) && n > 0) abonos[g.compromisoId] = (abonos[g.compromisoId] ?? 0) + n;
  }

  const out = [];
  for (const p of porId.values()) {
    const abonado = abonos[p.id] ?? 0;

    // Un fijo se paga de una vez: cualquier gasto vinculado ese mes lo cierra.
    if (p.tipo === 'fijo') {
      if (abonado > 0) continue;
      out.push({ id: p.id, descripcion: p.descripcion, monto: p.monto, dia: p.dia, tipo: p.tipo, parcial: false });
      continue;
    }

    // Deuda: se ofrece lo que falta de la cuota, topado al saldo pendiente.
    const falta = Math.min(p.monto - abonado, p.tope);
    if (falta <= 0) continue;
    out.push({ id: p.id, descripcion: p.descripcion, monto: falta, dia: p.dia, tipo: p.tipo, parcial: abonado > 0 });
  }

  return out.sort((a, b) => a.dia - b.dia || a.descripcion.localeCompare(b.descripcion, 'es'));
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
