/**
 * infra/gmf.js - el 4x1000 (GMF) de cada cuenta, según la norma vigente
 * (GMF.1, [ADR 165](../../docs/DECISIONS/165-el-4x1000-segun-la-cuenta.md)).
 *
 * Estatuto Tributario: el gravamen es 4 por mil de cada retiro (arts. 871 y
 * 872). No lo paga, hasta 350 UVT al mes, la cuenta de ahorros que la persona
 * marcó como exenta (art. 879 num. 1; casi siempre la de nómina). Un depósito
 * de bajo monto (Nequi, Daviplata) no lo paga hasta 65 UVT al mes, aparte
 * (num. 25). Las cuentas corrientes no tienen esa exención. Los traslados
 * entre cuentas del mismo titular en el mismo banco no lo pagan (num. 14).
 *
 * Puro: no lee `S` ni toca el DOM. Lo comparten Mis cuentas, las
 * transferencias y, desde GMF.1b, los gastos.
 */

import { GMF, UVT, GMF_EXENTO_UVT, GMF_BAJO_MONTO_UVT, BANCOS_BAJO_MONTO, BANCOS_CO } from '../core/constants.js';

/** Tope exento al mes de la cuenta marcada (350 UVT del año vigente). */
export const TOPE_GMF_MARCADA = GMF_EXENTO_UVT * UVT;
/** Tope exento al mes de un depósito de bajo monto (65 UVT). */
export const TOPE_GMF_BAJO_MONTO = GMF_BAJO_MONTO_UVT * UVT;

const _clase = (banco) => BANCOS_CO.find(b => b.id === banco)?.clase ?? 'otro';

/**
 * ¿Es un depósito de bajo monto? Nequi y Daviplata, salvo que la cuenta diga
 * que no (`bajoMonto: false`, o la casilla de antes que decía que pagaba).
 * @param {{ banco?: string, bajoMonto?: boolean } | null | undefined} cuenta
 * @returns {boolean}
 */
export function esBajoMonto(cuenta) {
  if (!BANCOS_BAJO_MONTO.includes(cuenta?.banco) || cuenta.bajoMonto === false) return false;
  // Antes de GMF.1 la casilla "aplica 4x1000" marcada decía que pagaba: se
  // respeta lo que la persona dijo de esa cuenta.
  if (cuenta.bajoMonto !== true && cuenta.aplica4x1000 === true && cuenta.exenta4x1000 == null) return false;
  return true;
}

/**
 * ¿La cuenta puede ser la marcada exenta? Una de ahorros de un banco, de
 * "Otro" o de una billetera que no es de bajo monto (Nu, Lulo). Ni el
 * efectivo, ni una corriente, ni un depósito de bajo monto.
 * @param {{ banco?: string, tipo?: string, bajoMonto?: boolean } | null | undefined} cuenta
 * @returns {boolean}
 */
export function puedeSerMarcada(cuenta) {
  if (!cuenta?.banco) return false;
  const clase = _clase(cuenta.banco);
  if (clase === 'efectivo') return false;
  if (esBajoMonto(cuenta)) return false;
  if (clase === 'billetera') return true;
  return cuenta.tipo !== 'Corriente';
}

/**
 * Cómo paga el 4x1000 una cuenta.
 *
 * - `no-aplica`: el efectivo (no hay movimiento financiero).
 * - `exenta`: la marcada (tope 350 UVT al mes) o un depósito de bajo monto
 *   (65 UVT); sobre lo que pase del tope, paga.
 * - `sujeta`: paga en cada retiro (una corriente, o una de ahorros que no es
 *   la marcada).
 * - `sin-definir`: una cuenta de antes de GMF.1 que no dice si es la marcada.
 *   No se cobra nada hasta que la persona lo diga.
 *
 * @param {{ banco?: string, tipo?: string, exenta4x1000?: boolean|null, aplica4x1000?: boolean, bajoMonto?: boolean } | null | undefined} cuenta
 * @returns {{ tipo: 'no-aplica'|'exenta'|'sujeta'|'sin-definir', tope: number }}
 */
export function regimenGMF(cuenta) {
  if (!cuenta?.banco || _clase(cuenta.banco) === 'efectivo') return { tipo: 'no-aplica', tope: 0 };
  if (esBajoMonto(cuenta)) return { tipo: 'exenta', tope: TOPE_GMF_BAJO_MONTO };
  if (cuenta.tipo === 'Corriente' && _clase(cuenta.banco) !== 'billetera') return { tipo: 'sujeta', tope: 0 };
  if (cuenta.exenta4x1000 === true) return { tipo: 'exenta', tope: TOPE_GMF_MARCADA };
  if (cuenta.exenta4x1000 === false) return { tipo: 'sujeta', tope: 0 };
  // Antes de GMF.1 la casilla "aplica 4x1000" decía que pagaba.
  if (cuenta.aplica4x1000 === true) return { tipo: 'sujeta', tope: 0 };
  return { tipo: 'sin-definir', tope: 0 };
}

/**
 * ¿El traslado entre estas dos cuentas está exento? Mismo banco (y no
 * efectivo ni "Otro", que no dice qué banco es): son del mismo titular.
 * @param {{ banco?: string } | null | undefined} origen
 * @param {{ banco?: string } | null | undefined} destino
 * @returns {boolean}
 */
export function trasladoMismoBanco(origen, destino) {
  const b = origen?.banco;
  return Boolean(b) && b === destino?.banco && b !== 'Otro' && _clase(b) !== 'efectivo';
}

/**
 * Lo que una cuenta ya retiró en el mes, que es lo que consume su tope
 * exento: los gastos que salieron de ella (no los importados, que no
 * movieron el saldo) y las transferencias que salieron hacia otro banco.
 *
 * @param {string} cuentaId
 * @param {{ gastos?: object[], transferencias?: object[], cuentas?: object[] }} datos
 * @param {string} mesISO - `YYYY-MM`.
 * @param {{ excluirId?: string|null }} [opciones] - un registro que no cuenta
 *   (el que se está editando).
 * @returns {number}
 */
export function retirosGMFDelMes(cuentaId, { gastos = [], transferencias = [], cuentas = [] } = {}, mesISO, { excluirId = null } = {}) {
  if (!cuentaId || typeof mesISO !== 'string') return 0;
  const mes = mesISO.slice(0, 7);
  const enMes = (f) => typeof f === 'string' && f.slice(0, 7) === mes;
  let total = 0;
  for (const g of gastos ?? []) {
    if (!g || g.id === excluirId || g.cuentaId !== cuentaId || g.sinEfectoSaldo === true || !enMes(g.fecha)) continue;
    total += Number(g.monto) || 0;
  }
  const origen = (cuentas ?? []).find(c => c?.id === cuentaId);
  for (const t of transferencias ?? []) {
    if (!t || t.id === excluirId || t.cuentaOrigenId !== cuentaId || !enMes(t.fecha)) continue;
    const destino = (cuentas ?? []).find(c => c?.id === t.cuentaDestinoId);
    if (trasladoMismoBanco(origen, destino)) continue;
    total += Number(t.monto) || 0;
  }
  return total;
}

/**
 * El 4x1000 de un retiro de `monto` desde `cuenta`, con lo que ya retiró en
 * el mes (`acumulado`). Exenta: solo paga lo que pase del tope. Redondeado al
 * peso.
 *
 * @param {Parameters<typeof regimenGMF>[0]} cuenta
 * @param {number} monto
 * @param {number} [acumulado=0]
 * @returns {number}
 */
export function costoGMF(cuenta, monto, acumulado = 0) {
  const m = Math.max(0, Number(monto) || 0);
  if (m === 0) return 0;
  const { tipo, tope } = regimenGMF(cuenta);
  if (tipo === 'sujeta') return Math.round(m * GMF);
  if (tipo !== 'exenta') return 0;
  const libre = Math.max(0, tope - Math.max(0, Number(acumulado) || 0));
  return Math.round(Math.max(0, m - libre) * GMF);
}

/**
 * Lo que la interfaz dice del 4x1000 de una cuenta, en una línea, o '' si no
 * aplica.
 * @param {Parameters<typeof regimenGMF>[0]} cuenta
 * @param {(n: number) => string} f - el formateador de pesos.
 * @returns {string}
 */
export function textoRegimenGMF(cuenta, f) {
  const { tipo, tope } = regimenGMF(cuenta);
  if (tipo === 'no-aplica') return '';
  if (tipo === 'sujeta') return 'Paga 4x1000 en cada retiro';
  if (tipo === 'sin-definir') return 'Sin definir: dinos si es tu cuenta marcada';
  return esBajoMonto(cuenta)
    ? `Bajo monto: no paga 4x1000 hasta ${f(tope)} al mes`
    : `Cuenta marcada: no paga 4x1000 hasta ${f(tope)} al mes`;
}
