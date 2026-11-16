/**
 * deshacer.js - "Deshacer movimiento" (MOV.3, [ADR 154](../../docs/DECISIONS/154-deshacer-un-movimiento.md)).
 *
 * Deshacer es quitar la operación como si nunca se hubiera registrado: se
 * borran sus registros y se devuelven sus efectos a las cuentas y a la
 * obligación. No se crea ningún registro de reversa ni de compensación.
 *
 * Dos partes:
 * - `planDeshacer(estado, id)`: puro. Encuentra la operación a la que
 *   pertenece el registro, junta sus partes (un pago repartido entre varias
 *   cuentas son varios gastos de una sola operación), calcula los efectos con
 *   los mismos deltas de Gastos y Mis cuentas y decide si es seguro.
 * - `aplicarDeshacer(plan)`: aplica todo o nada. Si algo falla a mitad,
 *   devuelve lo que alcanzó a tocar.
 *
 * Los efectos son deltas, no valores viejos: devolver $80.000 a una cuenta no
 * pisa lo que pasó en esa cuenta después. Por eso solo se bloquea cuando lo
 * de después depende de esta operación (un ingreso ya repartido, una compra
 * con tarjeta ya pagada, una deuda archivada, una reserva ya usada).
 *
 * Importa lógica pura de Gastos, como `infra/avisos.js` lee la de cada dominio.
 */

import { S, EventBus } from '../core/state.js';
import { save } from '../core/storage.js';
import { editar, eliminar } from './crud.js';
import { f } from './utils.js';
import {
  deltasPorEdicionDeGasto,
  deltasPorEdicionEnDeuda,
  deltasPorEdicionEnCuotaMensual,
} from '../dominio/gastos/logic.js';

/** La marca que dejan en la nota las partes de un registro repartido. */
const NOTA_REPARTIDO = 'repartido entre varias cuentas';

/** Distancia máxima entre partes viejas (sin `operacionId`) de una misma operación. */
const MS_MISMA_OPERACION = 10_000;

// ── PURAS ────────────────────────────────────────────────────────

/**
 * ¿`b` es otra parte de la misma operación que `a`? Con `operacionId` (desde
 * MOV.3) es exacto. Antes, las partes de un registro repartido solo tenían en
 * común la nota "… repartido entre varias cuentas", la fecha, la obligación,
 * la categoría y el momento en que se guardaron (el mismo ciclo, segundos).
 *
 * @param {import('../core/state.js').Gasto} a
 * @param {import('../core/state.js').Gasto} b
 * @returns {boolean}
 */
export function mismaOperacion(a, b) {
  if (!a || !b) return false;
  if (a.id === b.id) return true;
  if (a.operacionId || b.operacionId) return Boolean(a.operacionId) && a.operacionId === b.operacionId;
  const nota = String(a.nota ?? '');
  if (!nota.includes(NOTA_REPARTIDO) || nota !== String(b.nota ?? '')) return false;
  if (a.fecha !== b.fecha || a.categoria !== b.categoria) return false;
  if ((a.compromisoId ?? null) !== (b.compromisoId ?? null)) return false;
  if ((a.cuentaId ?? null) === (b.cuentaId ?? null)) return false;
  const ta = Date.parse(a.fechaCreacion ?? '');
  const tb = Date.parse(b.fechaCreacion ?? '');
  return Number.isFinite(ta) && Number.isFinite(tb) && Math.abs(ta - tb) <= MS_MISMA_OPERACION;
}

/** Suma un mapa de deltas dentro de otro. */
function _sumar(destino, deltas) {
  for (const [id, d] of Object.entries(deltas)) {
    destino[id] = (destino[id] ?? 0) + d;
    if (destino[id] === 0) delete destino[id];
  }
}

/** Un plan que no se puede aplicar, con lo que se le dice al usuario. */
function _bloqueo(motivo, mensaje) {
  return { ok: false, motivo, mensaje };
}

/**
 * Qué hay que quitar y devolver para deshacer el movimiento `id`. Puro: lee
 * `estado`, no lo cambia.
 *
 * @param {{ gastos?: object[], ingresosPuntuales?: object[], transferencias?: object[], cuentas?: object[], compromisos?: object[] }} estado
 * @param {string} id - el id del registro (el mismo de la fila de Movimientos).
 * @returns {{ ok: false, motivo: string, mensaje: string } | {
 *   ok: true,
 *   tipo: 'gasto'|'ingreso'|'transferencia',
 *   nombre: string,
 *   monto: number,
 *   registros: Array<{ coleccion: string, id: string }>,
 *   cuentas: Record<string, number>,
 *   deudas: Record<string, number>,
 *   cuotas: Record<string, number>,
 *   pendientes: string[],
 * }}
 *   `cuentas`, `deudas` y `cuotas` son deltas de `saldo`, `saldoTotal` y
 *   `cuotaMensual`. `pendientes`: los fijos que vuelven a quedar por pagar.
 */
export function planDeshacer(estado, id) {
  const gastos = estado?.gastos ?? [];
  const gasto = gastos.find(g => g.id === id);
  if (gasto) return _planGasto(estado, gasto);

  const ingreso = (estado?.ingresosPuntuales ?? []).find(i => i.id === id);
  if (ingreso) return _planIngreso(estado, ingreso);

  const transferencia = (estado?.transferencias ?? []).find(t => t.id === id);
  if (transferencia) return _planTransferencia(estado, transferencia);

  return _bloqueo('no-existe', 'Este movimiento ya no está en tus registros: puede que ya lo hayas deshecho.');
}

/** Solo los deltas de cuentas que siguen existiendo: de una cuenta borrada no hay saldo que devolver. */
function _cuentasExistentes(estado, deltas) {
  const ids = new Set((estado?.cuentas ?? []).map(c => c.id));
  return Object.fromEntries(Object.entries(deltas).filter(([cid]) => ids.has(cid)));
}

function _planGasto(estado, gasto) {
  const partes = (estado.gastos ?? []).filter(g => mismaOperacion(gasto, g));
  const compromisos = estado.compromisos ?? [];

  // "Ya lo usé" de una reserva (HF.1c) deja el gasto y además reinicia la
  // reserva: quitar solo el gasto no la devuelve a como estaba.
  if (partes.some(g => g.apartadoId)) {
    return _bloqueo('reserva', 'Este gasto lo dejó "Ya lo usé" de una reserva, que además la reinició. Deshacerlo aquí no devolvería la reserva: corrígelo desde Reservas.');
  }

  const cuentas = {};
  const deudas = {};
  const cuotas = {};
  for (const g of partes) {
    _sumar(cuentas, deltasPorEdicionDeGasto(g, null));
    _sumar(deudas, deltasPorEdicionEnDeuda(g, null, compromisos));
    _sumar(cuotas, deltasPorEdicionEnCuotaMensual(g, null));
  }

  // Una obligación que ya no existe no tiene saldo que devolver.
  for (const mapa of [deudas, cuotas]) {
    for (const cid of Object.keys(mapa)) {
      if (!compromisos.some(c => c.id === cid)) delete mapa[cid];
    }
  }

  for (const [cid, delta] of Object.entries(deudas)) {
    const c = compromisos.find(x => x.id === cid);
    if (c.activo === false) {
      return _bloqueo('deuda-archivada', `"${c.descripcion ?? 'La deuda'}" se archivó después de este movimiento. Deshacerlo le cambiaría el saldo a una deuda archivada: reactívala primero en Por pagar.`);
    }
    if ((Number(c.saldoTotal) || 0) + delta < 0) {
      return _bloqueo('ya-pagada', `Lo que debías por esta compra en "${c.descripcion ?? 'la tarjeta'}" ya se pagó después. Deshacerla dejaría su saldo por debajo de cero: corrige primero ese pago.`);
    }
  }

  // Los fijos que, sin estas partes, quedan sin ningún pago en ese mes.
  const ids = new Set(partes.map(g => g.id));
  const pendientes = [];
  for (const cid of new Set(partes.map(g => g.compromisoId).filter(Boolean))) {
    const c = compromisos.find(x => x.id === cid);
    if (!c || c.tipo !== 'fijo') continue;
    const mes = String(gasto.fecha ?? '').slice(0, 7);
    const quedan = (estado.gastos ?? []).some(g => !ids.has(g.id) && g.compromisoId === cid && String(g.fecha ?? '').startsWith(mes));
    if (!quedan) pendientes.push(cid);
  }

  return {
    ok: true,
    tipo: 'gasto',
    nombre: gasto.descripcion?.trim() || gasto.categoria || 'Gasto',
    monto: partes.reduce((s, g) => s + (Number(g.monto) || 0), 0),
    registros: partes.map(g => ({ coleccion: 'gastos', id: g.id })),
    cuentas: _cuentasExistentes(estado, cuentas),
    deudas,
    cuotas,
    pendientes,
  };
}

function _planIngreso(estado, ingreso) {
  // "Distribuir mi ingreso" (HF.1d-2) ya repartió este dinero en aportes,
  // pagos y transferencias que no quedan ligados a él: quitar el ingreso
  // dejaría ese reparto sin su origen.
  if (ingreso.repartido === true) {
    return _bloqueo('distribuido', 'Este ingreso ya lo repartiste con "Distribuir mi ingreso": lo repartido salió de este dinero y no queda ligado a él. Deshacerlo solo dejaría ese reparto sin su origen, así que Finko no lo deshace.');
  }
  const monto = Number(ingreso.monto) || 0;
  return {
    ok: true,
    tipo: 'ingreso',
    nombre: ingreso.descripcion?.trim() || 'Ingreso',
    monto,
    registros: [{ coleccion: 'ingresosPuntuales', id: ingreso.id }],
    cuentas: _cuentasExistentes(estado, ingreso.cuentaId && monto ? { [ingreso.cuentaId]: -monto } : {}),
    deudas: {},
    cuotas: {},
    pendientes: [],
  };
}

function _planTransferencia(estado, t) {
  // Espejo de `calcularTransferencia` (MC.17a), como el deshacer de MC.17f:
  // al origen vuelve lo que llegó más el 4x1000; del destino sale lo que llegó.
  const monto = Number(t.monto) || 0;
  const gmf = Number(t.costoGMF) || 0;
  const cuentas = {};
  _sumar(cuentas, { [t.cuentaOrigenId]: monto + gmf });
  _sumar(cuentas, { [t.cuentaDestinoId]: -monto });
  return {
    ok: true,
    tipo: 'transferencia',
    nombre: 'Transferencia',
    monto,
    registros: [{ coleccion: 'transferencias', id: t.id }],
    cuentas: _cuentasExistentes(estado, cuentas),
    deudas: {},
    cuotas: {},
    pendientes: [],
  };
}

/**
 * Huella de un plan: si entre preguntar y aplicar cambió algo de lo que se
 * iba a tocar (otra pestaña, la nube, un segundo toque), la huella cambia y
 * no se aplica.
 * @param {ReturnType<typeof planDeshacer>} plan
 * @returns {string}
 */
export function huellaPlan(plan) {
  if (!plan?.ok) return '';
  const orden = (o) => Object.entries(o).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify([plan.registros.map(r => r.id).sort(), orden(plan.cuentas), orden(plan.deudas), orden(plan.cuotas)]);
}

/**
 * Lo que dice la confirmación: qué se quita y qué vuelve a cada cuenta y a
 * cada obligación, con los efectos reales del plan. Puro.
 *
 * @param {Extract<ReturnType<typeof planDeshacer>, { ok: true }>} plan
 * @param {{ cuentas?: object[], compromisos?: object[] }} estado
 * @returns {string}
 */
export function mensajeDeshacer(plan, estado) {
  const nombreCuenta = (id) => (estado?.cuentas ?? []).find(c => c.id === id)?.nombre ?? 'tu cuenta';
  const comp = (id) => (estado?.compromisos ?? []).find(c => c.id === id);
  const efectos = [];
  for (const [cid, d] of Object.entries(plan.cuentas)) {
    efectos.push(d > 0 ? `vuelven ${f(d)} a ${nombreCuenta(cid)}` : `salen ${f(-d)} de ${nombreCuenta(cid)}`);
  }
  for (const [cid, d] of Object.entries(plan.deudas)) {
    const c = comp(cid);
    const saldo = (Number(c?.saldoTotal) || 0) + d;
    efectos.push(d > 0
      ? `"${c?.descripcion ?? 'la deuda'}" vuelve a deber ${f(saldo)}`
      : `"${c?.descripcion ?? 'la tarjeta'}" baja a ${f(saldo)}`);
  }
  for (const cid of plan.pendientes) {
    efectos.push(`"${comp(cid)?.descripcion ?? 'el pago'}" vuelve a quedar por pagar`);
  }
  const partes = plan.registros.length > 1 ? ` (sus ${plan.registros.length} partes, una por cuenta)` : '';
  const lista = efectos.length === 0 ? ''
    : efectos.length === 1 ? ` ${_mayuscula(efectos[0])}.`
    : ` ${_mayuscula(efectos.slice(0, -1).join(', '))} y ${efectos.at(-1)}.`;
  return `"${plan.nombre}" de ${f(plan.monto)}${partes} sale de tus registros, como si no se hubiera anotado.${lista}`;
}

function _mayuscula(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── APLICAR ──────────────────────────────────────────────────────

/**
 * Aplica un plan de `planDeshacer`: devuelve los saldos, los saldos y cuotas
 * de las obligaciones y borra los registros. Todo o nada: guarda antes lo que
 * va a tocar y, si algo falla a mitad, lo deja como estaba.
 *
 * @param {Extract<ReturnType<typeof planDeshacer>, { ok: true }>} plan
 * @returns {boolean} true si se aplicó entero.
 */
export function aplicarDeshacer(plan) {
  if (!plan?.ok) return false;
  // Un plan viejo (ya aplicado, o con un registro que se borró por otro lado)
  // no toca nada: deshacer dos veces devolvería el dinero dos veces.
  if (!plan.registros.every(r => (S[r.coleccion] ?? []).some(x => x.id === r.id))) return false;
  const respaldoCuentas = Object.keys(plan.cuentas).map(id => [id, S.cuentas.find(c => c.id === id)?.saldo]);
  const idsComp = [...new Set([...Object.keys(plan.deudas), ...Object.keys(plan.cuotas)])];
  const respaldoComp = idsComp.map(id => {
    const c = S.compromisos.find(x => x.id === id);
    return [id, { saldoTotal: c?.saldoTotal, cuotaMensual: c?.cuotaMensual }];
  });
  const respaldoRegistros = plan.registros.map(r => {
    const idx = S[r.coleccion].findIndex(x => x.id === r.id);
    return { ...r, idx, item: S[r.coleccion][idx] };
  });

  try {
    for (const [id, d] of Object.entries(plan.cuentas)) {
      const c = S.cuentas.find(x => x.id === id);
      editar('cuentas', id, { saldo: (Number(c.saldo) || 0) + d });
    }
    for (const [id, d] of Object.entries(plan.deudas)) {
      const c = S.compromisos.find(x => x.id === id);
      editar('compromisos', id, { saldoTotal: (Number(c.saldoTotal) || 0) + d });
    }
    for (const [id, d] of Object.entries(plan.cuotas)) {
      const c = S.compromisos.find(x => x.id === id);
      // Acotada en cero, como al borrar un consumo desde Gastos (MC.16d).
      editar('compromisos', id, { cuotaMensual: Math.max(0, (Number(c.cuotaMensual) || 0) + d) });
    }
    for (const r of plan.registros) {
      if (!eliminar(r.coleccion, r.id)) throw new Error(`deshacer: ${r.coleccion}/${r.id} ya no estaba`);
    }
    return true;
  } catch (err) {
    console.error('[deshacer] se devuelve lo tocado:', err);
    for (const [id, saldo] of respaldoCuentas) {
      const c = S.cuentas.find(x => x.id === id);
      if (c) c.saldo = saldo;
    }
    for (const [id, valores] of respaldoComp) {
      const c = S.compromisos.find(x => x.id === id);
      if (c) Object.assign(c, valores);
    }
    for (const r of respaldoRegistros.sort((a, b) => a.idx - b.idx)) {
      if (r.item && r.idx >= 0 && !S[r.coleccion].some(x => x.id === r.id)) S[r.coleccion].splice(r.idx, 0, r.item);
    }
    save();
    for (const seccion of new Set(['cuentas', 'compromisos', ...plan.registros.map(r => r.coleccion)])) {
      EventBus.emit('state:change', { section: seccion });
    }
    return false;
  }
}
