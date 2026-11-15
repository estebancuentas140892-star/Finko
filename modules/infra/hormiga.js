/**
 * infra/hormiga.js - criterio único de "gasto hormiga" (ADR 092 D11).
 *
 * Funciones puras, sin DOM. Hasta APR.1a el umbral vivía duplicado a
 * propósito en `gastos/logic.js` (`detectarHormigas`) y `logros/logic.js`
 * (`UMBRAL_GASTO_HORMIGA`) para no importar un dominio desde otro (ADN 10).
 * Con un tercer lector (`aprende`) la duplicación deja de ser barata: el
 * criterio sube a infra y los tres lo leen de aquí.
 *
 * El criterio es el tamaño de la transacción, no la categoría: así funciona
 * para todos y no se desactiva recategorizando (ADR 032 D4). El ADR 147
 * reemplaza ese criterio: lo pequeño solo es hormiga si es un gusto. SUS.2a
 * deja el carácter (`caracterDeGasto`); SUS.2b lo aplica en `esGastoHormiga`.
 */

import { CARACTER_CATEGORIA_GASTO, SUBCATEGORIAS_GASTO } from '../core/constants.js';
import { hijoPorId } from './taxonomia.js';

/** Respuestas válidas a "¿Es un gusto o una necesidad?" (ADR 147 D4). */
const _RESPUESTAS = new Set(['gusto', 'necesidad']);

/**
 * El carácter de un gasto (ADR 147 D1): 'necesidad', 'gusto' o 'depende'.
 * Gana lo más específico que el gasto diga:
 *
 *   1. lo que el usuario contestó para ese gasto (`gasto.caracter`, Otros);
 *   2. su subcategoría, si declara uno propio;
 *   3. su categoría personalizada, si el usuario lo contestó al crearla;
 *   4. su categoría nativa (`CARACTER_CATEGORIA_GASTO`);
 *   5. 'depende'.
 *
 * Una subcategoría que no es de la categoría del gasto se ignora: el dato
 * pudo quedar de una edición vieja y no puede decidir por otra categoría.
 *
 * @param {{ categoria?: string, subcategoriaId?: string|null, caracter?: string|null }} gasto
 * @param {ReadonlyArray<{ nombre: string, caracter?: string|null }>} [personalizadas]
 * @returns {'necesidad'|'gusto'|'depende'}
 */
export function caracterDeGasto(gasto, personalizadas = []) {
  if (_RESPUESTAS.has(gasto?.caracter)) return gasto.caracter;
  const categoria = gasto?.categoria ?? '';
  const sub = hijoPorId(SUBCATEGORIAS_GASTO, gasto?.subcategoriaId);
  if (sub?.caracter && sub.categorias.includes(categoria)) return sub.caracter;
  const propia = (personalizadas ?? []).find(c => c?.nombre === categoria);
  if (_RESPUESTAS.has(propia?.caracter)) return propia.caracter;
  return CARACTER_CATEGORIA_GASTO[categoria] ?? 'depende';
}

/** Monto máximo (inclusive) de una transacción para contar como hormiga, por defecto. */
export const UMBRAL_GASTO_HORMIGA = 20_000;

/** Rango que acepta el tope configurable (APR.1b): ni tan bajo que nada cuente, ni tan alto que todo. */
export const TOPE_HORMIGA_MIN = 1_000;
export const TOPE_HORMIGA_MAX = 100_000;

/**
 * Tope vigente: el que el usuario configuró en Límites (`S.config.hormiga.tope`,
 * APR.1b) o el de por defecto si no hay uno válido.
 *
 * @param {{ hormiga?: { tope?: unknown } } | undefined} config - `S.config`.
 * @returns {number}
 */
export function topeHormiga(config) {
  const tope = Number(config?.hormiga?.tope);
  return Number.isFinite(tope) && tope >= TOPE_HORMIGA_MIN && tope <= TOPE_HORMIGA_MAX
    ? tope
    : UMBRAL_GASTO_HORMIGA;
}

/**
 * Límite mensual para lo pequeño, o `null` si el usuario no se puso uno.
 *
 * @param {{ hormiga?: { limite?: unknown } } | undefined} config - `S.config`.
 * @returns {number | null}
 */
export function limiteHormiga(config) {
  const limite = Number(config?.hormiga?.limite);
  return config?.hormiga?.limite != null && Number.isFinite(limite) && limite > 0 ? limite : null;
}

/**
 * ¿Este gasto es hormiga? Monto positivo y menor o igual al tope.
 *
 * @param {{ monto?: unknown }} gasto
 * @param {number} [tope=UMBRAL_GASTO_HORMIGA]
 * @returns {boolean}
 */
export function esGastoHormiga(gasto, tope = UMBRAL_GASTO_HORMIGA) {
  const monto = Number(gasto?.monto);
  return Number.isFinite(monto) && monto > 0 && monto <= tope;
}

/**
 * Resumen del gasto hormiga de un mes calendario: total, número de compras
 * y desglose por categoría, de mayor a menor.
 *
 * @param {import('../core/state.js').Gasto[]} gastos
 * @param {string} mesISO - `YYYY-MM` (o un ISO completo, se usa el prefijo).
 * @param {number} [tope=UMBRAL_GASTO_HORMIGA]
 * @returns {{ total: number, cuantos: number, porCategoria: { categoria: string, total: number, cuantos: number }[] }}
 */
export function resumenHormigaMes(gastos, mesISO, tope = UMBRAL_GASTO_HORMIGA) {
  const vacio = { total: 0, cuantos: 0, porCategoria: [] };
  if (typeof mesISO !== 'string' || mesISO.length < 7) return vacio;
  const mes = mesISO.slice(0, 7);

  let total = 0;
  let cuantos = 0;
  /** @type {Map<string, { categoria: string, total: number, cuantos: number }>} */
  const grupos = new Map();
  for (const g of gastos ?? []) {
    if (typeof g?.fecha !== 'string' || g.fecha.slice(0, 7) !== mes) continue;
    if (!esGastoHormiga(g, tope)) continue;
    const monto = Number(g.monto);
    total += monto;
    cuantos += 1;
    const categoria = g.categoria || 'Otros';
    const grupo = grupos.get(categoria) ?? { categoria, total: 0, cuantos: 0 };
    grupo.total += monto;
    grupo.cuantos += 1;
    grupos.set(categoria, grupo);
  }

  const porCategoria = [...grupos.values()].sort((a, b) => b.total - a.total);
  return { total, cuantos, porCategoria };
}
