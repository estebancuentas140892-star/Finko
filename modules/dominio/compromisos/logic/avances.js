/**
 * compromisos/logic/avances.js - el avance con tarjeta de crédito (AVC.1a,
 * [ADR 169](../../../../docs/DECISIONS/169-un-avance-no-es-un-gasto.md)).
 *
 * Cuando el dinero de un avance llega a una cuenta (el efectivo del cajero, tu
 * Nequi), no es un gasto: la tarjeta presta y la cuenta recibe (D4). La deuda
 * sube el monto más la comisión, la cuota sube la del avance con intereses y
 * la cuenta sube el monto. El gasto ocurre después, cuando se usa ese dinero.
 * El avance vive dentro de su tarjeta, en `Compromiso.avances` (D5).
 *
 * Sub-modulo de compromisos/logic.js (barrel). Reglas de la capa:
 * - Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 */

import { tasaEADe, TASA_IMPOSIBLE } from './modelo.js';
import { f } from '../../../infra/utils.js';

/** Las cuotas que se ofrecen (D1): las del consumo (MC.16d) más 36. */
export const CUOTAS_AVANCE = Object.freeze([1, 2, 3, 6, 9, 12, 18, 24, 36]);

/**
 * El valor de "¿A dónde llegó?" cuando no hay cuenta Efectivo (D1): elegirlo
 * la crea al guardar, en $0, y el avance la sube.
 */
export const EFECTIVO_NUEVO = 'efectivo-nuevo';

/**
 * La cuenta Efectivo que se crea al vuelo (AVC.1b, ADR 169 D1), con la forma
 * que le da `normalizarCuenta` de Mis cuentas a un efectivo: sin tipo
 * bancario, sin 4x1000, sin datos de transferencia. Crearla en $0 es su
 * apertura (ADR 143 D3); la fila del avance explica lo que entra.
 * Duplicada a propósito: ningún dominio importa a otro (ADN 10).
 *
 * @returns {Omit<import('../../../core/state.js').Cuenta, 'id' | 'fechaCreacion'>}
 */
export function cuentaEfectivoNueva() {
  return {
    nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 0, icono: null, activa: true,
    cuotaManejo: null, aplica4x1000: false, exenta4x1000: null, datosTransferencia: null,
  };
}

/**
 * La tasa EA que escribe el usuario cuando la tarjeta no tiene ("25,5" o
 * "25.5"), en porcentaje. `null` si está vacía o no es un número.
 *
 * @param {string|number|null|undefined} texto
 * @returns {number|null}
 */
export function leerTasaEscrita(texto) {
  const s = String(texto ?? '').trim().replace('%', '').replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Los errores de la tasa escrita en el formulario del avance: la misma regla
 * de una deuda con entidad (`validarCompromiso`). Vacía no es error acá: si
 * la tarjeta no tiene tasa, lo dice `validarAvance`.
 *
 * @param {string|undefined} texto
 * @returns {string[]}
 */
export function erroresTasaEscrita(texto) {
  if (String(texto ?? '').trim() === '') return [];
  const n = leerTasaEscrita(texto);
  if (n === null || n <= 0) return ['Escribe la tasa con números. Por ejemplo: 28,5'];
  if (n > TASA_IMPOSIBLE.EA) return [`${String(n).replace('.', ',')} % al año no parece una tasa real. Revisa tu extracto.`];
  return [];
}

/** A la centena: el costo se dice "unos $125.500", no "$125.456". */
const _centena = (n) => Math.round(n / 100) * 100;

/**
 * Lo que el formulario dice antes de guardar (D2): el costo en pesos, no en
 * porcentaje. Sin monto no dice nada; sin tasa o sin cuotas, qué falta para
 * poder decirlo. Explica el costo, no juzga (ADR 051 D7).
 *
 * @param {{ monto: number, tasaEA: number, cuotas: number, comision?: number }} datos
 * @returns {string}
 */
export function textoCostoDeAvance({ monto, tasaEA, cuotas, comision = 0 } = {}) {
  const m = Math.round(Number(monto) || 0);
  if (m <= 0) return '';
  if (!((Number(tasaEA) || 0) > 0)) return 'Escribe la tasa de tu tarjeta para ver cuánto te cuesta.';
  const n = Number(cuotas);
  if (!CUOTAS_AVANCE.includes(n)) return 'Elige a cuántas cuotas para ver cuánto te cuesta.';
  const c = costoDeAvance({ monto: m, tasaEA, cuotas: n, comision });
  const plazo = n === 1 ? `1 cuota de ${f(c.cuota)}` : `${n} cuotas de ${f(c.cuota)}`;
  const comisionTxt = c.comision > 0 ? ` y ${f(c.comision)} de comisión` : '';
  const costo = _centena(c.costo);
  return `Este avance te cuesta unos ${f(costo)}: ${f(_centena(c.intereses))} de intereses en ${plazo}${comisionTxt}. Pagarás unos ${f(m + costo)} por ${f(m)}.`;
}

/**
 * ¿Es una tarjeta de crédito que puede sacar un avance? La misma tarjeta
 * operable del ADR 051 D1: deuda con entidad, categoría "Tarjeta de crédito",
 * con cupo y activa. Una deuda de tarjeta sin cupo no lo ofrece.
 *
 * @param {import('../../../core/state.js').Compromiso|null|undefined} c
 * @returns {boolean}
 */
export function esTarjetaOperable(c) {
  return Boolean(c)
    && c.tipo === 'deuda-entidad'
    && c.categoria === 'Tarjeta de crédito'
    && (Number(c.cupoTotal) || 0) > 0
    && c.activo !== false;
}

/**
 * Lo que cuesta un avance en pesos (D2): la cuota fija con la que lo cobra el
 * banco (sistema francés, con la tasa EA de la tarjeta pasada a mensual), los
 * intereses de todo el plazo y la comisión. Con tasa 0, la cuota es
 * `monto / cuotas` y no hay intereses.
 *
 * Ejemplo del ADR: $500.000 a 24 cuotas y 22,93 % EA dan una cuota de
 * $25.649 y $115.586 de intereses; con $9.870 de comisión, $125.456 de costo.
 *
 * @param {{ monto: number, tasaEA: number, cuotas: number, comision?: number }} datos
 *   `tasaEA` como decimal (0.2293 = 22,93 %).
 * @returns {{ cuota: number, intereses: number, comision: number, costo: number, total: number }}
 *   En pesos redondeados. `costo` = intereses + comisión; `total` = monto + costo.
 */
export function costoDeAvance({ monto, tasaEA, cuotas, comision = 0 } = {}) {
  const m   = Math.max(0, Number(monto) || 0);
  const n   = Math.max(1, Math.trunc(Number(cuotas) || 1));
  const ea  = Math.max(0, Number(tasaEA) || 0);
  const com = Math.max(0, Math.round(Number(comision) || 0));
  if (m <= 0) return { cuota: 0, intereses: 0, comision: com, costo: com, total: com };

  const r = ea > 0 ? Math.pow(1 + ea, 1 / 12) - 1 : 0;
  const cuotaExacta = r > 0 ? (m * r) / (1 - Math.pow(1 + r, -n)) : m / n;
  const intereses = Math.max(0, Math.round(cuotaExacta * n - m));
  return {
    cuota: Math.round(cuotaExacta),
    intereses,
    comision: com,
    costo: intereses + com,
    total: Math.round(m) + intereses + com,
  };
}

/**
 * Valida los datos de "Sacar un avance" (D1). Recibe lo que manda el
 * formulario (cifras ya sin separador de miles) y devuelve los errores en el
 * mismo tono que el resto de los formularios: qué hacer, no qué falló.
 *
 * @param {Record<string, string>} datos  `monto`, `cuentaId`, `cuotas`, `comision` (opcional), `fecha`.
 * @param {{ tarjeta?: object, cuentas?: object[] }} contexto
 * @returns {string[]}
 */
export function validarAvance(datos, { tarjeta, cuentas } = {}) {
  const errores = [];

  if (!esTarjetaOperable(tarjeta)) {
    errores.push('Elige una tarjeta de crédito con cupo: el avance sale de ahí.');
  } else if (tasaEADe(tarjeta) <= 0) {
    errores.push('Escribe la tasa de tu tarjeta. Está en el extracto, como EA.');
  }

  const monto = Number(datos?.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    errores.push('Escribe cuánto sacaste. Por ejemplo: 200.000');
  }

  const cuentaId = String(datos?.cuentaId ?? '').trim();
  const activas = (Array.isArray(cuentas) ? cuentas : []).filter(c => c?.activa !== false);
  if (!cuentaId || !activas.some(c => c.id === cuentaId)) {
    errores.push('Elige a qué cuenta llegó el dinero.');
  }

  if (!CUOTAS_AVANCE.includes(Number(datos?.cuotas))) {
    errores.push('Elige a cuántas cuotas lo difirieron.');
  }

  const comision = String(datos?.comision ?? '').trim();
  if (comision !== '' && (!Number.isFinite(Number(comision)) || Number(comision) < 0)) {
    errores.push('Escribe la comisión que te cobraron, o déjala vacía. Por ejemplo: 8.294');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(datos?.fecha ?? ''))) {
    errores.push('Elige la fecha del avance.');
  }

  return errores;
}

/**
 * El avance que se guarda en la tarjeta (D5), sin `id`: lo asigna quien lo
 * registra. `cuota` es lo que el avance suma a `cuotaMensual`, con intereses
 * (D4), calculada con la tasa vigente de la tarjeta. Asume datos validados.
 *
 * @param {Record<string, string>} datos
 * @param {import('../../../core/state.js').Compromiso} tarjeta
 * @returns {Omit<import('../../../core/state.js').Avance, 'id'>}
 */
export function normalizarAvance(datos, tarjeta) {
  const monto    = Math.round(Number(datos.monto) || 0);
  const cuotas   = Number(datos.cuotas);
  const comision = Math.max(0, Math.round(Number(datos.comision) || 0));
  const { cuota } = costoDeAvance({ monto, tasaEA: tasaEADe(tarjeta), cuotas, comision });
  return {
    fecha:    String(datos.fecha),
    monto,
    cuentaId: String(datos.cuentaId).trim(),
    cuotas,
    cuota,
    comision,
  };
}

/**
 * Lo que un avance le suma a cada cosa (D4), en positivo: la cuenta recibe el
 * monto, la deuda de la tarjeta sube el monto más la comisión y su cuota sube
 * la del avance. Deshacer usa los mismos números con el signo contrario (D6).
 *
 * @param {Partial<import('../../../core/state.js').Avance>|null|undefined} avance
 * @returns {{ cuenta: number, deuda: number, cuota: number }}
 */
export function deltasDeAvance(avance) {
  const monto    = Math.max(0, Number(avance?.monto) || 0);
  const comision = Math.max(0, Number(avance?.comision) || 0);
  const cuota    = Math.max(0, Number(avance?.cuota) || 0);
  return { cuenta: monto, deuda: monto + comision, cuota };
}

/**
 * Aplica un avance ya normalizado y con `id` (D4), sin tocar nada: devuelve
 * lo que cambia en la tarjeta y en la cuenta. `null` si la tarjeta no es
 * operable, la cuenta no está activa o el avance no trae id ni monto.
 *
 * @param {import('../../../core/state.js').Compromiso} tarjeta
 * @param {import('../../../core/state.js').Cuenta[]} cuentas
 * @param {import('../../../core/state.js').Avance} avance
 * @returns {{
 *   tarjeta: { saldoTotal: number, cuotaMensual: number, avances: import('../../../core/state.js').Avance[] },
 *   cuenta: { id: string, saldo: number },
 * } | null}
 */
export function aplicarAvance(tarjeta, cuentas, avance) {
  if (!esTarjetaOperable(tarjeta) || !avance?.id) return null;
  const cuenta = (Array.isArray(cuentas) ? cuentas : [])
    .find(c => c?.id === avance.cuentaId && c?.activa !== false);
  const d = deltasDeAvance(avance);
  if (!cuenta || d.cuenta <= 0) return null;
  return {
    tarjeta: {
      saldoTotal:   (Number(tarjeta.saldoTotal) || 0) + d.deuda,
      cuotaMensual: (Number(tarjeta.cuotaMensual) || 0) + d.cuota,
      avances:      [...(Array.isArray(tarjeta.avances) ? tarjeta.avances : []), avance],
    },
    cuenta: { id: cuenta.id, saldo: (Number(cuenta.saldo) || 0) + d.cuenta },
  };
}

/**
 * Lo que vuelve a salir de cada cuenta al borrar la tarjeta (I3 del ADR 053):
 * el dinero de sus avances entró a esas cuentas, y sin la tarjeta no queda
 * fila que lo explique. Mismo trato que la deuda recibida (D.14) al borrarse.
 *
 * @param {import('../../../core/state.js').Compromiso|null|undefined} tarjeta
 * @returns {Record<string, number>} cuentaId → delta (negativo).
 */
export function reversionAvancesAlBorrar(tarjeta) {
  const deltas = {};
  for (const a of Array.isArray(tarjeta?.avances) ? tarjeta.avances : []) {
    const { cuenta } = deltasDeAvance(a);
    if (!a?.cuentaId || cuenta <= 0) continue;
    deltas[a.cuentaId] = (deltas[a.cuentaId] ?? 0) - cuenta;
  }
  return deltas;
}

/**
 * Encuentra un avance por su id entre todas las tarjetas, con la tarjeta que
 * lo tiene. Lo usan Movimientos y deshacer: la fila lleva el id del avance.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @param {string} id
 * @returns {{ tarjeta: import('../../../core/state.js').Compromiso, avance: import('../../../core/state.js').Avance } | null}
 */
export function buscarAvance(compromisos, id) {
  if (!id) return null;
  for (const tarjeta of Array.isArray(compromisos) ? compromisos : []) {
    const avance = (Array.isArray(tarjeta?.avances) ? tarjeta.avances : []).find(a => a?.id === id);
    if (avance) return { tarjeta, avance };
  }
  return null;
}
