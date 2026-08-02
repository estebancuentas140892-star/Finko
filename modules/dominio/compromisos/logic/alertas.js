/**
 * compromisos/logic/alertas.js - detectores de alerta: fijos sin pagar este mes, deudas
 * durmiendo, vencidos del dashboard y agrupadores de prioridades.
 *
 * Sub-modulo de compromisos/logic.js (barrel). Reglas de la capa:
 * - Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 */

import { TIPOS_COMPROMISO, esDeuda } from './modelo.js';
import { estadoPagoMes } from './abonos.js';

// ── DETECTORES DE ALERTA (G.1) ───────────────────────────────────

const _RX_FECHA_COMP = /^(\d{4})-(\d{2})-(\d{2})/;

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
    if (typeof c.fechaCreacion === 'string') {
      const mc = _RX_FECHA_COMP.exec(c.fechaCreacion);
      if (mc) {
        const anioC = +mc[1];
        const mesC  = +mc[2];
        const diaC  = +mc[3];
        if (anioC === anioHoy && mesC === mesHoy && diaC > diaPago) continue;
      }
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

    if (typeof c.fechaCreacion !== 'string') continue;
    const mC = _RX_FECHA_COMP.exec(c.fechaCreacion);
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
 * Limitación conocida: para tipo='agenda' con frecuencia='Única vez' creada
 * en meses anteriores, `diasAtraso` se calcula contra el mes en curso, no
 * contra la fecha original. Si el usuario olvidó desactivar el item, el
 * atraso reportado será menor al real. Aceptable para v1: se resuelve con
 * disciplina del usuario (toggle "activo=false" al pagar).
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

    const diaPago = Number(c.diaPago) || 1;
    if (diaPago < 1 || diaPago > 31) continue;

    const diasAtraso = diaHoy - diaPago;
    if (diasAtraso < umbral) continue;

    // Si el compromiso se creó este mes después de su día de pago, el ciclo
    // de este mes no le aplica: el próximo vencimiento real es el mes siguiente.
    if (typeof c.fechaCreacion === 'string') {
      const mc = _RX_FECHA_COMP.exec(c.fechaCreacion);
      if (mc) {
        const anioC = +mc[1];
        const mesC  = +mc[2];
        const diaC  = +mc[3];
        if (anioC === anioHoy && mesC === mesHoy && diaC > diaPago) continue;
      }
    }

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
  if (vencidos.length === 0) return [];

  const prefijoMes = typeof hoyISO === 'string' ? hoyISO.slice(0, 7) : '';
  if (prefijoMes.length !== 7) return vencidos;

  const porId = new Map(compromisos.map(c => [c?.id, c]));
  return vencidos.filter(v => estadoPagoMes(gastos, porId.get(v.id), prefijoMes) !== 'completo');
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
