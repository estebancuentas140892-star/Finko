/**
 * compromisos/logic/alertas.js - detectores de alerta: fijos sin pagar este mes, deudas
 * durmiendo, vencidos del dashboard y agrupadores de prioridades.
 *
 * Sub-modulo de compromisos/logic.js (barrel). Reglas de la capa:
 * - Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 */

import { TIPOS_COMPROMISO, esDeuda, compromisosActivos, vencimientosDesde } from './modelo.js';
import { estadoPagoMes } from './abonos.js';
import { ocurrenciasEnMes, ocurrenciasEnRango, coberturaDeVencimientos, vencimientosSinPagar } from '../../../infra/vencimientos.js';
import { fechaLocalISO } from '../../../infra/utils.js';

// ── DETECTORES DE ALERTA (G.1) ───────────────────────────────────

const _RX_FECHA_COMP = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Día local de creación de un compromiso (HF.0e, BUG-025), como match de
 * `_RX_FECHA_COMP`, o null si no hay una fecha legible. `fechaCreacion` es un
 * instante UTC: cortarlo a diez caracteres corría al día siguiente lo creado de
 * noche en Colombia, y en el mes siguiente lo creado la noche del último día.
 */
function _creacionLocal(c) {
  // GAS.12d (ADR 187 D4): la fecha del primer pago manda sobre el alta.
  const iso = fechaLocalISO(c?.fechaInicio) ?? fechaLocalISO(c?.fechaCreacion);
  return iso ? _RX_FECHA_COMP.exec(iso) : null;
}

/**
 * Días del mes en curso en que el compromiso ya venció (hoy incluido), según
 * su frecuencia: los mismos días que pinta el Calendario (`ocurrenciasEnMes`,
 * HF.0d). Descarta los anteriores a su creación si se creó este mismo mes:
 * no se puede deber lo que no existía. Ascendentes: el primero es el más
 * atrasado, y es el que ofrece el lote de "Por pagar".
 *
 * @param {import('../../../core/state.js').Compromiso} c
 * @param {number} anio
 * @param {number} mes 1-12
 * @param {number} dia 1-31
 * @returns {number[]}
 */
function _vencimientosCumplidosDelMes(c, anio, mes, dia) {
  let desde = 1;
  const mc = _creacionLocal(c);
  if (mc && +mc[1] === anio && +mc[2] === mes) desde = +mc[3];
  return ocurrenciasEnMes(c, anio, mes - 1).filter(d => d <= dia && d >= desde);
}

/**
 * Una deuda en cero no tiene nada que vencer, aunque su último abono haya sido
 * menor que la cuota (`estadoPagoMes` diría 'parcial'). Mismo criterio que el
 * lote de "Por pagar" (`pendientesDePagoDelMes`) y la distribución. Un saldo
 * que no se conoce no es un saldo en cero: esa deuda sigue avisando.
 */
function _deudaSaldada(c) {
  if (!esDeuda(c?.tipo) || c.saldoTotal === null || c.saldoTotal === undefined) return false;
  const saldo = Number(c.saldoTotal);
  return Number.isFinite(saldo) && saldo <= 0;
}

/**
 * Detecta compromisos fijos activos cuyo día de pago ya pasó en el mes actual.
 * Sirve como recordatorio para registrar el gasto correspondiente.
 *
 * Nota: Finko no persiste un historial de pagos en compromisos.
 * Esta función no verifica si el pago fue registrado - avisa que el plazo ya
 * pasó para que el usuario confirme que lo pagó y lo registró en gastos.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @param {string} hoyISO   YYYY-MM-DD
 * @param {object} [config]
 * @param {number} [config.umbralDiasAtraso=0] Mínimo de días de atraso para incluir.
 * @returns {Array<{
 *   id: string, descripcion: string, monto: number,
 *   diaPago: number, diasAtraso: number, severidad: 'leve'|'moderada'|'urgente'
 * }>}
 */
export function detectarFijosSinPagarEsteMes(compromisos, hoyISO, config = {}) {
  if (!Array.isArray(compromisos) || compromisos.length === 0) return [];
  if (typeof hoyISO !== 'string') return [];

  const mh = _RX_FECHA_COMP.exec(hoyISO);
  if (!mh) return [];

  const anioHoy = +mh[1];
  const mesHoy  = +mh[2];
  const diaHoy  = +mh[3];
  const cfg = typeof config === 'object' && config ? config : {};
  const umbral = Number.isFinite(+cfg.umbralDiasAtraso) && +cfg.umbralDiasAtraso >= 0
    ? Math.floor(+cfg.umbralDiasAtraso) : 0;

  const out = [];

  for (const c of compromisos) {
    if (!c || typeof c !== 'object') continue;
    if (c.activo === false) continue;
    if (c.tipo !== 'fijo') continue;

    const diaPago = Number(c.diaPago) || 1;
    if (diaPago < 1 || diaPago > 31) continue;

    const diasAtraso = diaHoy - diaPago;
    if (diasAtraso < umbral) continue;

    // Si el fijo se creó este mes después de su día de pago, el ciclo de
    // este mes no le aplica: el próximo vencimiento real es el mes siguiente.
    const mc = _creacionLocal(c);
    if (mc) {
      const anioC = +mc[1];
      const mesC  = +mc[2];
      const diaC  = +mc[3];
      if (anioC === anioHoy && mesC === mesHoy && diaC > diaPago) continue;
    }

    const severidad = diasAtraso <= 3 ? 'leve'
      : diasAtraso <= 10             ? 'moderada'
      :                                'urgente';

    out.push({
      id:          c.id,
      descripcion: c.descripcion || 'Sin nombre',
      monto:       Number(c.monto) || 0,
      diaPago,
      diasAtraso,
      severidad,
    });
  }

  // Mas urgentes (mayor atraso) primero.
  out.sort((a, b) => b.diasAtraso - a.diasAtraso);
  return out;
}

/**
 * Detecta deudas activas con saldo pendiente que llevan demasiado tiempo sin
 * actividad desde su creación. Util para recordar revisarlas o liquidarlas.
 *
 * Nota: Finko no persiste historial de pagos en compromisos.
 * "Durmiendo" se define como: deuda (entidad o personal), activa, saldoTotal > 0,
 * y fecha de creación >= umbral meses atrás sin actualización de saldo.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @param {string} hoyISO   YYYY-MM-DD
 * @param {object} [config]
 * @param {number} [config.mesesUmbral=2] Meses mínimos de antigüedad para marcar como durmiendo.
 * @returns {Array<{
 *   id: string, descripcion: string, tipo: string,
 *   saldoTotal: number, cuota: number,
 *   mesesDesdeCreacion: number, severidad: 'baja'|'media'|'alta',
 *   sugerencia: 'liquidar'|'retomar'
 * }>}
 */
export function detectarDeudasDurmiendo(compromisos, hoyISO, config = {}) {
  if (!Array.isArray(compromisos) || compromisos.length === 0) return [];
  if (typeof hoyISO !== 'string') return [];

  const mHoy = _RX_FECHA_COMP.exec(hoyISO);
  if (!mHoy) return [];

  const cfg = typeof config === 'object' && config ? config : {};
  const umbral = Number.isFinite(+cfg.mesesUmbral) && +cfg.mesesUmbral > 0
    ? Math.floor(+cfg.mesesUmbral) : 2;

  const tHoy = Date.UTC(+mHoy[1], +mHoy[2] - 1, +mHoy[3]);
  const out = [];

  for (const c of compromisos) {
    if (!c || typeof c !== 'object') continue;
    if (c.activo === false) continue;
    if (!esDeuda(c.tipo)) continue;

    const saldo = Number(c.saldoTotal);
    if (!Number.isFinite(saldo) || saldo <= 0) continue;

    const mC = _creacionLocal(c);
    if (!mC) continue;

    const tCreacion = Date.UTC(+mC[1], +mC[2] - 1, +mC[3]);
    if (tCreacion > tHoy) continue;

    const dias = Math.floor((tHoy - tCreacion) / 86_400_000);
    const meses = Math.floor(dias / 30);
    if (meses < umbral) continue;

    const severidad = meses >= 6 ? 'alta'
      : meses >= 3               ? 'media'
      :                            'baja';

    const cuota = Number(c.cuotaMensual) || 0;

    out.push({
      id:                 c.id,
      descripcion:        c.descripcion || 'Sin nombre',
      tipo:               c.tipo,
      saldoTotal:         saldo,
      cuota,
      mesesDesdeCreacion: meses,
      severidad,
      sugerencia: (cuota > 0 && saldo <= cuota) ? 'liquidar' : 'retomar',
    });
  }

  const rank = { alta: 0, media: 1, baja: 2 };
  out.sort((a, b) => {
    const r = rank[a.severidad] - rank[b.severidad];
    if (r !== 0) return r;
    return b.saldoTotal - a.saldoTotal;
  });
  return out;
}

// ── DASHBOARD: PRIORIDADES + VENCIDOS ────────────────────────────

/**
 * Detecta compromisos activos cuyo día de pago ya pasó este mes,
 * cubriendo los tres tipos (fijo, deuda, agenda).
 *
 * Generalización de `detectarFijosSinPagarEsteMes` para alimentar el panel
 * "Pendientes/Vencidos" del dashboard. La función vieja queda intacta para
 * el nudge de la sección compromisos (retrocompatibilidad).
 *
 * Regla anti-falso-positivo: si el compromiso se creó este mismo mes/año
 * y su `fechaCreacion` es posterior al día de pago, no se marca como vencido.
 * Recién agregar un fijo cuyo día ya pasó no implica mora (ese ciclo no
 * existía). El próximo vencimiento real es el mes siguiente.
 *
 * **Frecuencia real (HF.0d, BUG-031):** el día de pago sale de las
 * ocurrencias del mes que pinta el Calendario, no de `diaPago` a secas. Un
 * bimestral fuera de su mes no vence, un día 31 vence el 30 en septiembre y el
 * 28 en febrero, y un quincenal con las dos fechas pasadas reporta la más
 * vieja (la que ofrece el lote de "Por pagar"). Una "Única vez" solo vence en
 * el mes en que se creó, que es el único en que el Calendario la pinta.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @param {string} hoyISO   YYYY-MM-DD
 * @param {object} [config]
 * @param {number} [config.umbralDiasAtraso=0] Mínimo de días de atraso para incluir.
 * @returns {Array<{
 *   id: string, descripcion: string, tipo: 'fijo'|'deuda'|'agenda',
 *   monto: number, diaPago: number, diasAtraso: number,
 *   severidad: 'leve'|'moderada'|'urgente'
 * }>}
 */
export function detectarVencidosCompletos(compromisos, hoyISO, config = {}) {
  if (!Array.isArray(compromisos) || compromisos.length === 0) return [];
  if (typeof hoyISO !== 'string') return [];

  const mh = _RX_FECHA_COMP.exec(hoyISO);
  if (!mh) return [];

  const anioHoy = +mh[1];
  const mesHoy  = +mh[2];
  const diaHoy  = +mh[3];
  const cfg = typeof config === 'object' && config ? config : {};
  const umbral = Number.isFinite(+cfg.umbralDiasAtraso) && +cfg.umbralDiasAtraso >= 0
    ? Math.floor(+cfg.umbralDiasAtraso) : 0;

  const out = [];

  for (const c of compromisos) {
    if (!c || typeof c !== 'object') continue;
    if (c.activo === false) continue;
    if (!TIPOS_COMPROMISO.includes(c.tipo)) continue;

    // El más atrasado de lo que ya venció este mes, contado desde su creación.
    const [diaPago] = _vencimientosCumplidosDelMes(c, anioHoy, mesHoy, diaHoy);
    if (diaPago === undefined) continue;

    const diasAtraso = diaHoy - diaPago;
    if (diasAtraso < umbral) continue;

    const severidad = diasAtraso <= 3 ? 'leve'
      : diasAtraso <= 10             ? 'moderada'
      :                                'urgente';

    out.push({
      id:          c.id,
      descripcion: c.descripcion || 'Sin nombre',
      tipo:        c.tipo,
      // Las deudas no tienen `monto` desde v6: lo que vence cada mes es la cuota.
      monto:       esDeuda(c.tipo) ? (Number(c.cuotaMensual) || 0) : (Number(c.monto) || 0),
      diaPago,
      diasAtraso,
      severidad,
    });
  }

  // Más urgentes primero (mayor atraso).
  out.sort((a, b) => b.diasAtraso - a.diasAtraso);
  return out;
}

/**
 * Vencidos del mes que además siguen **sin cubrir** (CAL.5b).
 *
 * `detectarVencidosCompletos` solo mira el calendario: día de pago contra hoy.
 * No sabe si el usuario ya pagó, así que "Pendientes del mes" en Inicio seguía
 * listando lo pagado y su CTA de pago en lote habría ofrecido registrar dos
 * veces el mismo dinero. Este envoltorio le cruza el estado de pago del mes,
 * que ya calcula `estadoPagoMes` de este mismo dominio (una deuda con abono
 * parcial sigue pendiente: solo sale de la lista cuando queda en 'completo').
 *
 * Una deuda ya saldada tampoco cuenta (HF.0d): si el último abono fue menor
 * que la cuota porque era lo que faltaba, el mes queda 'parcial' pero no hay
 * nada que pagar, y el lote de "Por pagar" ya la dejaba fuera.
 *
 * No sustituye a `detectarVencidosCompletos`: el nudge de mora y las alertas
 * siguen razonando sobre el calendario puro.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @param {import('../../../core/state.js').Gasto[]} gastos
 * @param {string} hoyISO YYYY-MM-DD
 * @param {object} [config] Igual que `detectarVencidosCompletos`.
 * @returns {ReturnType<typeof detectarVencidosCompletos>}
 */
export function vencidosSinPagar(compromisos, gastos, hoyISO, config = {}) {
  const vencidos = detectarVencidosCompletos(compromisos, hoyISO, config);
  const prefijoMes = typeof hoyISO === 'string' ? hoyISO.slice(0, 7) : '';
  if (prefijoMes.length !== 7) return vencidos;

  const lista = Array.isArray(compromisos) ? compromisos : [];
  const porId = new Map(lista.map(c => [c?.id, c]));
  const delMes = new Map(vencidos
    .filter((v) => {
      const c = porId.get(v.id);
      return !_deudaSaldada(c) && estadoPagoMes(gastos, c, prefijoMes) !== 'completo';
    })
    .map(v => [v.id, v]));

  // GAS.9c (ADR 183 D3): lo que quedó sin pagar de meses anteriores también
  // está vencido, y el atraso se cuenta desde la fecha pendiente más vieja.
  // El último pago cubre su fecha y todo lo de antes (`pendientesDeObligacion`).
  const cfg = typeof config === 'object' && config ? config : {};
  const umbral = Number.isFinite(+cfg.umbralDiasAtraso) && +cfg.umbralDiasAtraso >= 0
    ? Math.floor(+cfg.umbralDiasAtraso) : 0;
  const out = [];
  for (const c of lista) {
    if (!c || c.activo === false || !TIPOS_COMPROMISO.includes(c.tipo)) continue;
    const delEste = delMes.get(c.id);
    const p = pendientesDeObligacion(c, gastos, hoyISO);
    // Sin pendientes por la regla del último pago: lo de este mes ya está
    // cubierto o no hay nada vencido.
    if (p.pendientes.length === 0) continue;
    const diasAtraso = _diasEntreISO(p.desde, hoyISO);
    if (diasAtraso < umbral) continue;
    // Sin una fecha ya cumplida (lo pendiente es solo lo de hoy, o de meses
    // anteriores con este mes cubierto por otro camino) manda lo de este mes.
    const severidad = diasAtraso <= 3 ? 'leve' : diasAtraso <= 10 ? 'moderada' : 'urgente';
    out.push({
      id:          c.id,
      descripcion: c.descripcion || 'Sin nombre',
      tipo:        c.tipo,
      monto:       delEste?.monto ?? (esDeuda(c.tipo) ? (Number(c.cuotaMensual) || 0) : (Number(c.monto) || 0)),
      diaPago:     Number(p.desde.slice(8, 10)),
      diasAtraso,
      severidad,
      pendientes:  p.pendientes.length,
      desde:       p.desde,
      montoPendiente: p.montoPendiente,
    });
  }
  out.sort((a, b) => b.diasAtraso - a.diasAtraso);
  return out;
}

/** Días de `desdeISO` a `hastaISO` (fechas 'YYYY-MM-DD'), en hora local. */
function _diasEntreISO(desdeISO, hastaISO) {
  const [y1, m1, d1] = desdeISO.slice(0, 10).split('-').map(Number);
  const [y2, m2, d2] = hastaISO.slice(0, 10).split('-').map(Number);
  return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86_400_000);
}

/**
 * GAS.9c (ADR 183 D3): las fechas de una obligación que ya pasaron (hoy
 * incluido) y siguen sin pagar, desde su creación y según su frecuencia.
 *
 * **Un gasto fijo** (GAS.12b, ADR 187 D2): cada pago cubre un vencimiento,
 * del más viejo al más nuevo (`coberturaDeVencimientos`); lo pendiente son
 * los vencimientos ya cumplidos que quedan sin pago, y su monto, uno por
 * cada uno. Lo que sigue es la regla de las **deudas**, que no cambió.
 *
 * La regla de los pagos: **el último pago cubre la fecha de su propio mes**
 * (la última de ese mes; si el mes no tiene fecha, la última anterior al
 * pago) **y todo lo de antes**. Quien registró la mensualidad de noviembre
 * está al día aunque no haya anotado las de antes. En una deuda, un mes con
 * abonos que no completan la cuota (`estadoPagoMes` 'parcial') no cubre su
 * fecha: sigue pendiente por lo que falta. Las compras con la tarjeta
 * (`consumoTC`) no son pagos. Sin pagos, todo desde la creación.
 *
 * Sin `fechaCreacion` legible se mira solo el mes en curso, como antes (no
 * se sabe desde cuándo existe). Una deuda saldada o sin cuota no tiene
 * pendientes.
 *
 * @param {import('../../../core/state.js').Compromiso} c
 * @param {import('../../../core/state.js').Gasto[]} gastos
 * @param {string} hoyISO 'YYYY-MM-DD'
 * @returns {{ pendientes: string[], desde: string|null, montoPendiente: number, ultimoPago: string|null }}
 */
export function pendientesDeObligacion(c, gastos, hoyISO) {
  const vacio = { pendientes: [], desde: null, montoPendiente: 0, ultimoPago: null };
  if (!c || typeof hoyISO !== 'string' || !_RX_FECHA_COMP.test(hoyISO)) return vacio;
  if (c.activo === false || _deudaSaldada(c)) return vacio;
  // Una deuda sin cuota no tiene fecha fija ("Sin fecha fija", ADR 182 D5).
  if (esDeuda(c.tipo) && !((Number(c.cuotaMensual) || 0) > 0)) return vacio;
  const hoyD = hoyISO.slice(0, 10);
  if (c.tipo === 'fijo') {
    const { pendientes, ultimoPago } = vencimientosSinPagar(c, gastos, hoyD);
    if (pendientes.length === 0) return { ...vacio, ultimoPago };
    return { pendientes, desde: pendientes[0], montoPendiente: (Number(c.monto) || 0) * pendientes.length, ultimoPago };
  }
  const mc = _creacionLocal(c);
  const inicio = mc ? `${mc[1]}-${mc[2]}-${mc[3]}` : `${hoyD.slice(0, 7)}-01`;
  const fechas = ocurrenciasEnRango(c, inicio, hoyD);
  if (fechas.length === 0) return vacio;

  const pagos = (Array.isArray(gastos) ? gastos : [])
    .filter(g => g?.compromisoId === c.id && !g.consumoTC && typeof g.fecha === 'string')
    .map(g => g.fecha.slice(0, 10))
    .sort();
  const ultimoPago = pagos.at(-1) ?? null;

  let cubierta = null;
  if (ultimoPago) {
    const mesPago = ultimoPago.slice(0, 7);
    const delMesPago = fechas.filter(f => f.startsWith(mesPago));
    const completo = estadoPagoMes(gastos, c, mesPago) === 'completo';
    if (delMesPago.length > 0) {
      // El mes del pago: cubierto si se completó; si no, cubre lo de antes.
      cubierta = completo ? delMesPago.at(-1) : (fechas.filter(f => f < delMesPago[0]).at(-1) ?? null);
    } else {
      cubierta = fechas.filter(f => f <= ultimoPago).at(-1) ?? null;
    }
  }
  const pendientes = cubierta ? fechas.filter(f => f > cubierta) : fechas;
  if (pendientes.length === 0) return { ...vacio, ultimoPago };

  const deuda = esDeuda(c.tipo);
  const porFecha = deuda ? (Number(c.cuotaMensual) || 0) : (Number(c.monto) || 0);
  // Lo que falta: una cuota o un monto por fecha, menos lo abonado en el mes
  // de la primera pendiente si fue parcial; en una deuda, con techo en su saldo.
  const abonadoParcial = deuda && ultimoPago && pendientes[0].startsWith(ultimoPago.slice(0, 7))
    ? (Array.isArray(gastos) ? gastos : [])
      .filter(g => g?.compromisoId === c.id && !g.consumoTC && g.fecha?.startsWith(ultimoPago.slice(0, 7)))
      .reduce((acc, g) => acc + (Number(g.monto) || 0), 0)
    : 0;
  let montoPendiente = Math.max(0, porFecha * pendientes.length - abonadoParcial);
  if (deuda) {
    const saldo = Number(c.saldoTotal);
    if (Number.isFinite(saldo)) montoPendiente = Math.min(montoPendiente, Math.max(0, saldo));
  }
  return { pendientes, desde: pendientes[0], montoPendiente, ultimoPago };
}

/**
 * Los compromisos activos cuyo próximo vencimiento **sin pagar** cae dentro de
 * `diasLimite` días (hoy incluido). Alimenta "Próximas prioridades" de Inicio y
 * el aviso `compromiso-proximo` del motor (HF.0d, BUG-031).
 *
 * Una sola regla, la del Calendario y "Por pagar":
 *
 * - **Fecha**: la ocurrencia según la frecuencia (`vencimientosDesde`, sobre el
 *   motor compartido del ADR 041), no `diaPago` a secas.
 * - **Pago**: una ocurrencia de un mes con `estadoPagoMes` 'completo' ya está
 *   pagada y se salta; la siguiente legítima sale por su frecuencia. Una deuda
 *   con abono parcial sigue pendiente; una saldada, no.
 * - **Sin duplicar al vencido**: si el mes en curso ya tiene un vencimiento
 *   pasado sin cubrir, ese mes es un pendiente de `vencidosSinPagar`, y lo que
 *   cae después dentro del mismo mes no es otro pago, porque el estado es por
 *   mes y un solo gasto lo cubre (el quincenal del día 20 con el del 5 vencido).
 *
 * **Límite del modelo, no de esta regla:** el estado de pago es por mes. Un
 * gasto cubre las dos quincenas del mes, y un pago registrado en el mes
 * anterior no cubre el vencimiento de este. El Calendario lee igual.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @param {number} [diasLimite=3]
 * @param {Date} [hoy=new Date()] Fecha de referencia (inyectable, BUG-028): el
 *   motor de avisos le pasa su `hoyISO` en vez de dejar que lea el reloj.
 * @param {import('../../../core/state.js').Gasto[]} [gastos=[]] Para saber qué
 *   ya se pagó. Sin gastos, todo vencimiento cuenta como pendiente.
 * @returns {Array<import('../../../core/state.js').Compromiso & { diasRestantes: number, fechaVencimiento: string }>}
 *   Del más cercano al más lejano.
 */
export function compromisosProximos(compromisos, diasLimite = 3, hoy = new Date(), gastos = []) {
  const anio = hoy.getFullYear();
  const mes  = hoy.getMonth() + 1;
  const dia  = hoy.getDate();
  const prefijoHoy = `${anio}-${String(mes).padStart(2, '0')}`;

  const out = [];
  for (const c of compromisosActivos(compromisos)) {
    if (_deudaSaldada(c)) continue;

    // GAS.12b (ADR 187 D2): un fijo tiene un pago por vencimiento. El próximo
    // es el primero desde hoy que sigue sin pago. Con un vencimiento de este
    // mes ya pasado y sin pago, lo que cae después en el mismo mes no se
    // anuncia aparte (HF.0d, ADR 091: ya lo dice lo vencido); lo de otro mes, sí.
    if (c.tipo === 'fijo') {
      const venideros = vencimientosDesde(c, hoy, diasLimite);
      if (venideros.length === 0) continue;
      const hoyISO = `${prefijoHoy}-${String(dia).padStart(2, '0')}`;
      const cob = coberturaDeVencimientos(c, gastos, venideros.at(-1).fecha, { hoyISO });
      const sinPago = cob.fechas.slice(cob.cubiertas);
      const atrasadoEsteMes = sinPago.some(f => f.startsWith(prefijoHoy) && f < hoyISO);
      const pendiente = new Set(sinPago);
      const prox = venideros.find(v => pendiente.has(v.fecha) && !(atrasadoEsteMes && v.fecha.startsWith(prefijoHoy)));
      if (prox) out.push({ ...c, diasRestantes: prox.dias, fechaVencimiento: prox.fecha });
      continue;
    }

    /** @type {Map<string, boolean>} Un estado por mes, no uno por ocurrencia. */
    const pagado = new Map();
    const mesPagado = prefijo => {
      if (!pagado.has(prefijo)) pagado.set(prefijo, estadoPagoMes(gastos, c, prefijo) === 'completo');
      return pagado.get(prefijo);
    };
    const atrasadoEsteMes = !mesPagado(prefijoHoy)
      && _vencimientosCumplidosDelMes(c, anio, mes, dia).some(d => d < dia);

    const proximo = vencimientosDesde(c, hoy, diasLimite).find(({ fecha }) => {
      const prefijo = fecha.slice(0, 7);
      if (prefijo === prefijoHoy && atrasadoEsteMes) return false;
      return !mesPagado(prefijo);
    });
    if (proximo) out.push({ ...c, diasRestantes: proximo.dias, fechaVencimiento: proximo.fecha });
  }

  return out.sort((a, b) => a.diasRestantes - b.diasRestantes);
}

/**
 * Agrupa el resultado de `compromisosProximos()` por días restantes,
 * con labels listos para mostrar en el panel de Prioridades del dashboard.
 *
 * Buckets: HOY (0), Mañana (1), En N días (2-7).
 * El caller decide cuántos días pedir a `compromisosProximos()`.
 *
 * @param {Array<{ diasRestantes: number }>} proximos
 * @returns {Array<{ label: string, dias: number, items: Array<object> }>}
 *   Ordenado por días ascendente. Grupos vacíos se omiten.
 */
export function agruparPorDiasRestantes(proximos) {
  if (!Array.isArray(proximos) || proximos.length === 0) return [];

  const map = new Map();
  for (const p of proximos) {
    const d = Number(p.diasRestantes);
    if (!Number.isInteger(d) || d < 0) continue;
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(p);
  }

  const dias = [...map.keys()].sort((a, b) => a - b);
  return dias.map(d => ({
    label: d === 0 ? 'Hoy'
         : d === 1 ? 'Mañana'
         :           `En ${d} días`,
    dias:  d,
    items: map.get(d),
  }));
}

/**
 * Suma el monto de una lista de items del dashboard (vencidos o próximas
 * prioridades). Cada item trae `monto` (fijos, préstamos, apartados) o
 * `cuotaMensual` (deudas, v6): mismo criterio `monto ?? cuotaMensual` que
 * usa el render de cada item individual (AUD.1).
 *
 * @param {Array<{ monto?: number, cuotaMensual?: number }>} items
 * @returns {number} Total en COP. 0 si la lista está vacía o es inválida.
 */
export function sumarMontos(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, it) => {
    const valor = Number(it.monto ?? it.cuotaMensual ?? 0);
    return acc + (Number.isFinite(valor) ? valor : 0);
  }, 0);
}
