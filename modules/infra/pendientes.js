/**
 * infra/pendientes.js - lo que el usuario dejó a medio registrar
 * (INI.1, [ADR 149](../../docs/DECISIONS/149-inicio-centro-de-atencion-rapida.md) D3).
 *
 * Responde una pregunta distinta a la del motor de avisos (`avisos.js`): no
 * "qué merece avisarte hoy" sino "qué registro tuyo quedó sin terminar". Por
 * eso vive aparte y no entra al interruptor de avisos de Ajustes: un gasto
 * sin nombre no es una notificación que se pueda apagar, es un dato que falta.
 *
 * En Finko todo gasto lleva categoría, así que no hay "sin categorizar"
 * literal. Lo que queda a medias son dos cosas:
 *
 * 1. **Gastos en "Otros" que no dicen en qué fueron**: sin nota, sin
 *    descripción y sin subcategoría. "Otros" con una nota ("recarga") ya está
 *    registrado; "Otros" a secas no dice nada, ni a ti ni a Finko.
 * 2. **La pregunta "¿es un gusto o algo que necesitas?"** (SUS.2c, ADR 147
 *    D1): el concepto que se repite y todavía no tiene respuesta. Es la misma
 *    función que usa Gastos (`preguntaHormiga`), no una copia.
 *
 * Puro y testeable en Node: no lee `S`, no toca el DOM, la fecha entra como
 * `hoyISO`. Devuelve datos, nunca frases (mismo criterio que el ADR 066 D2).
 */

import { preguntaHormiga } from './hormiga.js';

/** Días hacia atrás que se miran para un gasto sin nombre. */
export const DIAS_GASTO_SIN_NOMBRE = 30;

/** El concepto (`conceptoDeGasto`) de un gasto en "Otros" sin nombre. */
const CONCEPTO_OTROS_SIN_NOMBRE = 'c:Otros|';

const _RX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' de `dias` antes de `hoyISO`, en hora local. */
function _haceDias(hoyISO, dias) {
  const d = new Date(`${hoyISO}T12:00:00`);
  d.setDate(d.getDate() - dias);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** true si el texto trae algo más que espacios. */
const _dice = (texto) => typeof texto === 'string' && texto.trim() !== '';

/**
 * Gastos en "Otros" de los últimos `DIAS_GASTO_SIN_NOMBRE` días que no dicen
 * en qué fueron, del más reciente al más viejo. El pago de un fijo o de una
 * deuda nunca entra: lleva su propia categoría y su compromiso.
 *
 * @param {import('../core/state.js').Gasto[]} gastos
 * @param {string} hoyISO 'YYYY-MM-DD'
 * @returns {import('../core/state.js').Gasto[]}
 */
export function gastosSinNombre(gastos, hoyISO) {
  if (!_RX_FECHA.test(String(hoyISO ?? ''))) return [];
  const desde = _haceDias(hoyISO, DIAS_GASTO_SIN_NOMBRE);
  return (Array.isArray(gastos) ? gastos : [])
    .filter(g => g
      && (g.categoria ?? 'Otros') === 'Otros'
      && !g.compromisoId
      && !g.subcategoriaId
      && !_dice(g.nota)
      && !_dice(g.descripcion)
      && typeof g.fecha === 'string'
      && g.fecha.slice(0, 10) >= desde
      && g.fecha.slice(0, 10) <= hoyISO)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/**
 * Lo que hay por completar, en el orden en que se muestra. Cada pieza es un
 * dato con su `tipo`; el copy es de la superficie.
 *
 * @param {object} params
 * @param {import('../core/state.js').Gasto[]} [params.gastos] `S.gastos`.
 * @param {string} params.hoyISO 'YYYY-MM-DD'.
 * @param {object} [params.opcionesHormiga] Las mismas opciones que usa Gastos
 *   para su pregunta: `tope`, `personalizadas` y `aprendidos`.
 * @returns {Array<
 *   { tipo: 'gastos-sin-nombre', gastos: object[], total: number } |
 *   { tipo: 'gusto-o-necesidad', concepto: string, etiqueta: string, veces: number, total: number }
 * >}
 */
export function pendientesPorCompletar({ gastos = [], hoyISO, opcionesHormiga = {} } = {}) {
  if (!_RX_FECHA.test(String(hoyISO ?? ''))) return [];
  const out = [];

  const sinNombre = gastosSinNombre(gastos, hoyISO);
  if (sinNombre.length > 0) {
    out.push({
      tipo: 'gastos-sin-nombre',
      gastos: sinNombre,
      total: sinNombre.reduce((s, g) => s + (Number(g.monto) || 0), 0),
    });
  }

  // "Otros" a secas no se pregunta: primero hay que decir en qué fue, y eso ya
  // lo pide la fila de arriba.
  const pregunta = preguntaHormiga(gastos, hoyISO.slice(0, 7), opcionesHormiga);
  if (pregunta && pregunta.concepto !== CONCEPTO_OTROS_SIN_NOMBRE) {
    out.push({ tipo: 'gusto-o-necesidad', ...pregunta });
  }

  return out;
}
