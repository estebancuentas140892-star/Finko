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
 * Mapea el plan de aportes de cada meta activa a los días del mes en que cae
 * (MT.6d, ADR 048 D3). A diferencia de `eventosDelMes`/`eventosIngresosDelMes`,
 * no recalcula ocurrencias por frecuencia: `Meta.planAportes` (MT.6c) ya trae
 * fechas concretas generadas y regeneradas por el dominio Metas, así que acá
 * solo se filtran las que caen en el mes visible. Cada evento queda marcado
 * con `tipo: 'meta'` para que la vista lo distinga de un compromiso o un
 * ingreso, y `totalDia`/`totalesDelMes` no lo sumen como dinero a pagar (un
 * aporte a una meta propia no es una obligación con un tercero).
 *
 * @param {import('../../core/state.js').Meta[]} metas
 * @param {number} year   Año completo (ej. 2026).
 * @param {number} month  Mes 0-indexed (0=Enero, 11=Diciembre).
 * @returns {Record<number, Array<{id:string, descripcion:string, monto:number, dia:number, tipo:'meta'}>>}
 */
export function eventosMetasDelMes(metas, year, month) {
  if (!Array.isArray(metas)) return {};
  if (!Number.isInteger(year))  return {};
  if (!Number.isInteger(month) || month < 0 || month > 11) return {};

  const prefijo = `${year}-${String(month + 1).padStart(2, '0')}-`;

  /** @type {Record<number, any[]>} */
  const eventos = {};

  for (const m of metas) {
    if (!m || typeof m !== 'object') continue;
    if (m.completada === true) continue;
    if (!Array.isArray(m.planAportes)) continue;

    for (const aporte of m.planAportes) {
      if (!aporte || typeof aporte.fecha !== 'string' || !aporte.fecha.startsWith(prefijo)) continue;
      const dia = Number(aporte.fecha.slice(8, 10));
      if (!Number.isInteger(dia)) continue;
      if (!eventos[dia]) eventos[dia] = [];
      eventos[dia].push({ id: m.id, descripcion: m.nombre ?? '', monto: Number(aporte.monto) || 0, dia, tipo: 'meta' });
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
  const ORDEN = ['ingreso', 'meta', 'fijo', 'deuda-entidad', 'deuda-personal'];
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
    // Un aporte de meta (MT.6d) tampoco: es recordatorio de ahorro propio, no
    // una obligación con un tercero (ADR 048 D3, "visible y recordatorio,
    // nunca ejecución").
    if (c.tipo === 'ingreso' || c.tipo === 'meta') continue;
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
      if (c.tipo === 'ingreso' || c.tipo === 'meta') continue;
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
 * El mes entero sobre la misma línea de tiempo: lo que entra, lo que sale, lo
 * que queda, y en qué día cae lo primero de cada lado (K1 y K4, ficha 08).
 *
 * El defecto que corrige: el hero sumaba solo salidas con `totalesDelMes()`
 * mientras la grilla pintaba también los ingresos con `eventosIngresosDelMes()`.
 * La cifra que encabezaba la pantalla no incluía nada de lo verde, así que el
 * resumen respondía a la misma pregunta que "Por pagar" y la respondía peor,
 * porque no traía la lista. Las dos cifras ya se calculaban: acá se dejan de
 * ignorar.
 *
 * Las metas quedan fuera de las dos sumas, igual que en `totalesDelMes()`: un
 * aporte planeado es un recordatorio, no dinero que se movió.
 *
 * `queda` puede ser negativo, y eso es información, no un error: significa que
 * en el mes sale más de lo que entra.
 *
 * @param {Record<number, any[]>} eventos Mapa día → eventos ya mergeado.
 * @returns {{ entra: number, sale: number, queda: number,
 *             diaPrimeraSalida: number|null, diaPrimerIngreso: number|null }}
 */
export function flujoDelMes(eventos) {
  const out = { entra: 0, sale: 0, queda: 0, diaPrimeraSalida: null, diaPrimerIngreso: null };
  if (!eventos || typeof eventos !== 'object') return out;

  for (const [diaRaw, evs] of Object.entries(eventos)) {
    if (!Array.isArray(evs)) continue;
    const dia = Number(diaRaw);
    if (!Number.isInteger(dia)) continue;

    for (const e of evs) {
      if (!e || typeof e !== 'object') continue;
      if (e.tipo === 'meta') continue;

      const raw = e.tipo === 'ingreso' ? e.monto
        : e.tipo === 'fijo' ? e.monto
        : e.cuotaMensual;
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) continue;

      if (e.tipo === 'ingreso') {
        out.entra += n;
        if (out.diaPrimerIngreso === null || dia < out.diaPrimerIngreso) out.diaPrimerIngreso = dia;
      } else {
        out.sale += n;
        if (out.diaPrimeraSalida === null || dia < out.diaPrimeraSalida) out.diaPrimeraSalida = dia;
      }
    }
  }

  out.queda = out.entra - out.sale;
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
 * Meses hacia atrás que revisa el catch-up de pagos automáticos, además del mes
 * en curso (ADR 052 D1): uno. Un débito que lleva dos meses sin registrarse ya
 * no es catch-up, es historia que se revisa a mano en el calendario, y
 * arrastrarla a cada apertura vuelve la hoja inservible.
 */
export const MESES_CATCHUP_AUTOMATICOS = 1;

/**
 * Débitos automáticos que ya vencieron y siguen sin registrarse (PA.1a,
 * ADR 052 D1): la lista que alimenta la hoja "Pagos automáticos" al abrir la app.
 *
 * No es un motor nuevo: filtra los compromisos marcados con `debitoAutomatico`
 * y recorre con ellos el mes en curso y los `mesesAtras` anteriores, aplicando
 * en cada uno la MISMA regla del pago en lote (`pendientesDePagoDelMes`). Así
 * la hoja nunca puede ofrecer un pago que el lote no ofrecería, y hereda gratis
 * la aritmética de deudas (resto de la cuota, tope en el saldo) y el criterio
 * temporal de BUG-015 (en el mes en curso, solo lo que ya venció).
 *
 * Igual que el lote, un compromiso aparece **una vez por mes** aunque caiga
 * varias veces en él (un quincenal): el estado de pago es por mes, no por
 * ocurrencia. `fecha` es la del vencimiento más antiguo sin cubrir de ese mes,
 * que es con la que se registra el gasto (ADR 052 D2).
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @param {Array<{compromisoId?:string, fecha?:string, monto?:number}>} gastos
 * @param {string} hoyISO 'YYYY-MM-DD'.
 * @param {number} [mesesAtras=MESES_CATCHUP_AUTOMATICOS] Meses previos a revisar.
 * @returns {Array<{id:string, descripcion:string, monto:number, dia:number,
 *   tipo:string, parcial:boolean, fecha:string, cuentaDebitoId:string|null}>}
 *   Del vencimiento más antiguo al más reciente.
 */
export function debitosAutomaticosVencidos(compromisos, gastos, hoyISO, mesesAtras = MESES_CATCHUP_AUTOMATICOS) {
  const mh = /^(\d{4})-(\d{2})-(\d{2})/.exec(hoyISO ?? '');
  if (!mh || !Array.isArray(compromisos)) return [];

  const automaticos = compromisos.filter(c => c?.debitoAutomatico === true && c.activo !== false);
  if (automaticos.length === 0) return [];

  const meses = Number.isInteger(mesesAtras) && mesesAtras >= 0 ? mesesAtras : MESES_CATCHUP_AUTOMATICOS;
  const anioHoy = +mh[1];
  const mesHoy  = +mh[2] - 1; // 0-indexed

  const out = [];
  for (let i = meses; i >= 0; i--) {
    // `new Date(anio, mes - i, 1)` normaliza el cruce de año solo.
    const inicio  = new Date(anioHoy, mesHoy - i, 1);
    const anio    = inicio.getFullYear();
    const mes     = inicio.getMonth();
    const prefijo = `${anio}-${String(mes + 1).padStart(2, '0')}`;

    const eventos = eventosDelMes(automaticos, anio, mes);
    for (const p of pendientesDePagoDelMes(eventos, gastos, prefijo, hoyISO)) {
      const comp = automaticos.find(c => c.id === p.id);
      out.push({
        ...p,
        fecha:          `${prefijo}-${String(p.dia).padStart(2, '0')}`,
        cuentaDebitoId: comp?.cuentaDebitoId ?? null,
      });
    }
  }
  return out;
}

/**
 * Ocurrencias de ingreso del mes que ya vencieron y siguen sin cobrarse
 * (PA.1b, ADR 052 D2/D3): mismo criterio de `pendientesDePagoDelMes` visto
 * desde el otro lado. No hay concepto de deuda ni de abono parcial: un ingreso
 * fijo se cobra completo o no se cobra, así que basta con saber si ya existe
 * un `IngresoPuntual` vinculado (`ingresoId`) fechado en el mismo mes.
 *
 * Un ingreso aparece **una sola vez** por mes aunque caiga varias veces (un
 * quincenal), mismo motivo que un compromiso: el estado de cobro es por mes,
 * no por ocurrencia.
 *
 * @param {ReturnType<typeof eventosIngresosDelMes>} eventos
 * @param {Array<{ingresoId?:string, fecha?:string}>} ingresosPuntuales
 * @param {string} prefijoMes 'YYYY-MM' del mes visible.
 * @param {string} hoyISO 'YYYY-MM-DD'.
 * @returns {Array<{id:string, descripcion:string, monto:number, dia:number, tipo:'ingreso'}>}
 */
export function pendientesDeCreditoDelMes(eventos, ingresosPuntuales, prefijoMes, hoyISO) {
  if (!eventos || typeof eventos !== 'object') return [];

  const mp = /^(\d{4})-(\d{2})$/.exec(prefijoMes ?? '');
  const mh = /^(\d{4})-(\d{2})-(\d{2})/.exec(hoyISO ?? '');
  if (!mp || !mh) return [];

  const anio = +mp[1], mes = +mp[2];
  if (mes < 1 || mes > 12) return [];
  const anioHoy = +mh[1], mesHoy = +mh[2], diaHoy = +mh[3];

  if (anio > anioHoy || (anio === anioHoy && mes > mesHoy)) return [];
  const esMesEnCurso = anio === anioHoy && mes === mesHoy;

  /** @type {Map<string, {id:string, descripcion:string, monto:number, dia:number}>} */
  const porId = new Map();

  for (const [diaStr, evs] of Object.entries(eventos)) {
    const dia = Number(diaStr);
    if (!Number.isInteger(dia)) continue;
    if (esMesEnCurso && dia > diaHoy) continue;
    if (!Array.isArray(evs)) continue;

    for (const ing of evs) {
      if (!ing || typeof ing !== 'object' || ing.tipo !== 'ingreso') continue;
      if (!ing.id) continue;
      const monto = Number(ing.monto);
      if (!Number.isFinite(monto) || monto <= 0) continue;

      const previo = porId.get(ing.id);
      if (!previo) {
        porId.set(ing.id, { id: ing.id, descripcion: ing.descripcion ?? '', monto, dia });
      } else if (dia < previo.dia) {
        previo.dia = dia;
      }
    }
  }

  if (porId.size === 0) return [];

  const yaCobrados = new Set();
  for (const ip of (Array.isArray(ingresosPuntuales) ? ingresosPuntuales : [])) {
    if (!ip || typeof ip !== 'object') continue;
    if (!ip.ingresoId || !porId.has(ip.ingresoId)) continue;
    if (typeof ip.fecha !== 'string' || !ip.fecha.startsWith(prefijoMes)) continue;
    yaCobrados.add(ip.ingresoId);
  }

  const out = [];
  for (const p of porId.values()) {
    if (yaCobrados.has(p.id)) continue;
    out.push({ id: p.id, descripcion: p.descripcion, monto: p.monto, dia: p.dia, tipo: 'ingreso' });
  }

  return out.sort((a, b) => a.dia - b.dia || a.descripcion.localeCompare(b.descripcion, 'es'));
}

/**
 * Créditos automáticos que ya vencieron y siguen sin registrarse (PA.1b, ADR
 * 052 D2/D3): la mitad "ingreso" de la hoja "Pagos automáticos", mismo motor
 * que `debitosAutomaticosVencidos` visto desde el otro lado. Recorre el mes en
 * curso y los `mesesAtras` anteriores con `pendientesDeCreditoDelMes`, así
 * hereda gratis la regla temporal de BUG-015 (en el mes en curso, solo lo que
 * ya venció) y la ventana de catch-up de D1.
 *
 * @param {import('../../core/state.js').Ingreso[]} ingresos
 * @param {Array<{ingresoId?:string, fecha?:string}>} ingresosPuntuales
 * @param {string} hoyISO 'YYYY-MM-DD'.
 * @param {number} [mesesAtras=MESES_CATCHUP_AUTOMATICOS] Meses previos a revisar.
 * @returns {Array<{id:string, descripcion:string, monto:number, dia:number,
 *   tipo:'ingreso', fecha:string, cuentaId:string|null}>} Del vencimiento más
 *   antiguo al más reciente.
 */
export function creditosAutomaticosVencidos(ingresos, ingresosPuntuales, hoyISO, mesesAtras = MESES_CATCHUP_AUTOMATICOS) {
  const mh = /^(\d{4})-(\d{2})-(\d{2})/.exec(hoyISO ?? '');
  if (!mh || !Array.isArray(ingresos)) return [];

  const automaticos = ingresos.filter(i => i?.creditoAutomatico === true && i.activo !== false);
  if (automaticos.length === 0) return [];

  const meses = Number.isInteger(mesesAtras) && mesesAtras >= 0 ? mesesAtras : MESES_CATCHUP_AUTOMATICOS;
  const anioHoy = +mh[1];
  const mesHoy  = +mh[2] - 1;

  const out = [];
  for (let i = meses; i >= 0; i--) {
    const inicio  = new Date(anioHoy, mesHoy - i, 1);
    const anio    = inicio.getFullYear();
    const mes     = inicio.getMonth();
    const prefijo = `${anio}-${String(mes + 1).padStart(2, '0')}`;

    const eventos = eventosIngresosDelMes(automaticos, anio, mes);
    for (const p of pendientesDeCreditoDelMes(eventos, ingresosPuntuales, prefijo, hoyISO)) {
      const ing = automaticos.find(i => i.id === p.id);
      out.push({
        ...p,
        fecha:    `${prefijo}-${String(p.dia).padStart(2, '0')}`,
        cuentaId: ing?.cuentaId ?? null,
      });
    }
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
