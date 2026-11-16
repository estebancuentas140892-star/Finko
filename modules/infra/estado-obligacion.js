/**
 * estado-obligacion.js - el estado de una obligación frente a hoy y el
 * conjunto de pagos pendientes del mes (OB.1,
 * [ADR 151](../../docs/DECISIONS/151-el-estado-de-una-obligacion-se-decide-una-vez.md)).
 *
 * Una obligación (gasto fijo o cuota de deuda) está en uno de tres estados
 * según su fecha límite, contada en días de calendario desde hoy:
 *
 * - **vencido**: la fecha ya pasó (días restantes < 0).
 * - **hoy**: la fecha es hoy (0).
 * - **proximo**: todavía no llega, pero cae dentro de la anticipación de la
 *   app (1 a `DIAS_ANTICIPACION_OBLIGACION`, la ventana de "Esta semana" del
 *   ADR 150 D1 y D4). Más lejos no tiene estado.
 *
 * Antes cada superficie lo decidía por su cuenta (Atención hoy por el
 * `sentido` del aviso, el lote por `dia === new Date().getDate()`, el panel
 * de escritorio por `diasAtraso === 0`) y cada una lo escribía con sus
 * palabras: "2 pagos para hoy" sobre dos pagos vencidos. Acá se decide y se
 * dice una sola vez.
 *
 * Las fechas son de calendario (`YYYY-MM-DD`, hora local, `diasHastaFecha`):
 * ningún paso convierte a UTC, así que la fecha guardada y el día del reloj
 * del usuario no se corren.
 *
 * `pagosPendientesDelMes` es el conjunto que se paga en lote. Lo leen el lote
 * de "Por pagar", el panel de Inicio en escritorio, la banda del Calendario y
 * el monto de los avisos de compromisos (Atención hoy): un solo conjunto, un
 * solo monto por pago.
 *
 * Capa infra: compone `logic.js` de compromisos y de agenda (ADN 10: ningún
 * dominio importa al otro; lo hace infra, como el motor de avisos). Sin DOM.
 */

import { vencidosSinPagar } from '../dominio/compromisos/logic.js';
import { eventosDelMes, pendientesDePagoDelMes } from '../dominio/agenda/logic.js';
import { diasHastaFecha } from './bolsas.js';

/**
 * Días de anticipación de "próximo a vencer": la ventana de "Esta semana", de
 * mañana a 7 días, donde vive la pastilla "próximo" (ADR 150 D1 y D4). OB.1b:
 * manda la definición de AH.1; el motor de avisos conserva su propio umbral
 * para `compromiso-proximo` (3 días, `DIAS_COMPROMISO_PROXIMO`), que decide
 * cuándo avisar, no cómo se llama el estado.
 */
export const DIAS_ANTICIPACION_OBLIGACION = 7;

/** @typedef {'vencido'|'hoy'|'proximo'} EstadoObligacion */

/**
 * Un número entero de días, o null. Sin `Number()`: `Number(null)` es 0, y
 * una obligación sin fecha se leería "para hoy".
 * @param {unknown} dias
 * @returns {number|null}
 */
function _dias(dias) {
  return typeof dias === 'number' && Number.isInteger(dias) ? dias : null;
}

/**
 * @param {number} diasRestantes días de hoy a la fecha límite (negativo: ya pasó).
 * @param {number} [anticipacion]
 * @returns {EstadoObligacion|null} null si no es un entero o cae más lejos que la anticipación.
 */
export function estadoObligacion(diasRestantes, anticipacion = DIAS_ANTICIPACION_OBLIGACION) {
  const d = _dias(diasRestantes);
  if (d === null) return null;
  if (d < 0) return 'vencido';
  if (d === 0) return 'hoy';
  return d <= anticipacion ? 'proximo' : null;
}

/**
 * Los días restantes de un aviso del motor (`sentido` + `dias`).
 * @param {{ sentido?: string|null, dias?: number|null }} aviso
 * @returns {number|null}
 */
export function diasRestantesDeAviso(aviso) {
  const d = _dias(aviso?.dias);
  if (d === null) return null;
  return aviso.sentido === 'atraso' ? -d : d;
}

/**
 * Lo que dice una fila de un pago vencido o de hoy, con su tono: "Venció hace
 * 3 días" en rojo, "Vence hoy" en ámbar.
 *
 * Lo próximo no se dice acá: lo dice "Esta semana" con su fecha ("Jue 19 · en
 * 3 días", `cuandoSemana` del ADR 150 D1). OB.1b retiró la segunda forma que
 * había ("Vence en 3 días"): una fecha futura devuelve null.
 *
 * @param {number} diasRestantes
 * @returns {{ estado: 'vencido'|'hoy', texto: string, tono: 'danger'|'warning' } | null}
 */
export function textoEstadoObligacion(diasRestantes) {
  const d = _dias(diasRestantes);
  if (d === null || d > 0) return null;
  if (d < 0) {
    return { estado: 'vencido', tono: 'danger', texto: d === -1 ? 'Venció ayer' : `Venció hace ${-d} días` };
  }
  return { estado: 'hoy', tono: 'warning', texto: 'Vence hoy' };
}

/**
 * Cuántas obligaciones hay en cada estado. Cada ítem trae `estado` o
 * `diasRestantes`; lo que no tiene estado no cuenta.
 *
 * @param {Array<{ estado?: EstadoObligacion|null, diasRestantes?: number }>} lista
 * @returns {{ total: number, vencidos: number, hoy: number, proximos: number }}
 */
export function resumenObligaciones(lista) {
  const r = { total: 0, vencidos: 0, hoy: 0, proximos: 0 };
  for (const it of Array.isArray(lista) ? lista : []) {
    const e = it?.estado !== undefined ? it.estado : estadoObligacion(it?.diasRestantes);
    if (e === 'vencido') r.vencidos++;
    else if (e === 'hoy') r.hoy++;
    else if (e === 'proximo') r.proximos++;
    else continue;
    r.total++;
  }
  return r;
}

/** El único estado del grupo, o null si hay mezcla o no hay nada. */
function _estadoUnico(r) {
  if (r.total === 0) return null;
  if (r.vencidos === r.total) return 'vencido';
  if (r.hoy === r.total) return 'hoy';
  if (r.proximos === r.total) return 'proximo';
  return null;
}

/**
 * El conteo dicho con su estado: "1 pago vencido", "2 pagos vencen hoy",
 * "3 pagos pendientes" (estados mezclados: el desglose lo da
 * `detalleObligaciones`).
 *
 * @param {ReturnType<typeof resumenObligaciones>} r
 * @returns {string}
 */
export function fraseObligaciones(r) {
  const n = r.total;
  const uno = n === 1;
  switch (_estadoUnico(r)) {
    case 'vencido': return uno ? '1 pago vencido' : `${n} pagos vencidos`;
    case 'hoy':     return uno ? '1 pago vence hoy' : `${n} pagos vencen hoy`;
    case 'proximo': return uno ? '1 pago próximo a vencer' : `${n} pagos próximos a vencer`;
    default:        return n === 0 ? 'Sin pagos pendientes' : `${n} pagos pendientes`;
  }
}

/**
 * El desglose, solo si los estados se mezclan: "1 vencido · 2 vencen hoy".
 * Con un solo estado devuelve null: la frase o el título ya lo dicen, y
 * repetirlo debajo es lo que decía "2 pagos para hoy · 2 ya vencidos".
 *
 * @param {ReturnType<typeof resumenObligaciones>} r
 * @returns {string|null}
 */
export function detalleObligaciones(r) {
  const partes = [];
  if (r.vencidos) partes.push(r.vencidos === 1 ? '1 vencido' : `${r.vencidos} vencidos`);
  if (r.hoy) partes.push(r.hoy === 1 ? '1 vence hoy' : `${r.hoy} vencen hoy`);
  if (r.proximos) partes.push(r.proximos === 1 ? '1 próximo' : `${r.proximos} próximos`);
  return partes.length > 1 ? partes.join(' · ') : null;
}

/**
 * El nombre de un grupo de pagos (el grupo de Atención hoy, el título del
 * lote, el rótulo del panel de escritorio): "Pagos vencidos", "Pago para
 * hoy", "Pagos pendientes" si se mezclan.
 *
 * @param {ReturnType<typeof resumenObligaciones>} r
 * @returns {string}
 */
export function tituloObligaciones(r) {
  const uno = r.total === 1;
  switch (_estadoUnico(r)) {
    case 'vencido': return uno ? 'Pago vencido' : 'Pagos vencidos';
    case 'hoy':     return uno ? 'Pago para hoy' : 'Pagos para hoy';
    case 'proximo': return uno ? 'Pago próximo a vencer' : 'Pagos próximos a vencer';
    default:        return 'Pagos pendientes';
  }
}

/**
 * Los pagos pendientes de un mes: lo que ya venció o vence hoy y sigue sin
 * cubrir. Es el conjunto del pago en lote y su monto.
 *
 * Combina dos motores a propósito (era `_pendientesDelMes` de compromisos y
 * `_montosVencidos` de "Por pagar", la misma cuenta escrita dos veces):
 * `vencidosSinPagar` decide QUÉ está pendiente (la fuente de la pastilla de
 * "Por pagar"; descarta, por ejemplo, lo creado después de su día de pago) y
 * `pendientesDePagoDelMes` decide CUÁNTO (resta el abono parcial del mes y
 * topa la cuota al saldo de la deuda).
 *
 * @param {import('../core/state.js').Compromiso[]} compromisos
 * @param {import('../core/state.js').Gasto[]} gastos
 * @param {string} prefijoMes 'YYYY-MM' del mes a liquidar.
 * @param {string} hoyISO 'YYYY-MM-DD'
 * @returns {Array<{ id: string, descripcion: string, monto: number, dia: number,
 *   tipo: string, parcial: boolean, diasRestantes: number, estado: EstadoObligacion }>}
 *   Del más antiguo al más nuevo.
 */
export function pagosPendientesDelMes(compromisos, gastos, prefijoMes, hoyISO) {
  const m = /^(\d{4})-(\d{2})$/.exec(prefijoMes ?? '');
  if (!m || !/^\d{4}-\d{2}-\d{2}$/.test(hoyISO ?? '')) return [];
  const lista = Array.isArray(compromisos) ? compromisos : [];
  const gs = Array.isArray(gastos) ? gastos : [];

  const pendientes = new Set(vencidosSinPagar(lista, gs, hoyISO).map(v => v.id));
  const eventos = eventosDelMes(lista, +m[1], +m[2] - 1);
  return pendientesDePagoDelMes(eventos, gs, prefijoMes, hoyISO)
    .filter(p => pendientes.has(p.id))
    .map((p) => {
      const diasRestantes = diasHastaFecha(`${prefijoMes}-${String(p.dia).padStart(2, '0')}`, hoyISO);
      return { ...p, diasRestantes, estado: estadoObligacion(diasRestantes) };
    });
}
