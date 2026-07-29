/**
 * infra/bolsas.js - el plan de aportes de una bolsa con fecha.
 *
 * Una "bolsa" es cualquier sitio donde el usuario reúne dinero poco a poco:
 * fondo de emergencia, meta, apartado, inversión. Este archivo guarda la parte
 * que **más de un dominio necesita leer**: cuántos aportes preveía el plan,
 * cuántos deberían estar hechos hoy y cuántos vale el dinero ya reunido.
 *
 * Existe por la regla ADN #10 (ningún dominio importa a otro). El plan de
 * referencia nació en `apartados/logic.js` con DIS.15 y ahí funcionó mientras
 * su único lector fue la tarjeta de Apartados. La casa de Ahorro necesita el
 * mismo cálculo para dibujar la línea del plan en su carril de Apartados, y
 * replicarlo habría duplicado lógica de negocio no trivial: es el mismo
 * movimiento que hizo `infra/vencimientos.js` con el ritmo de aporte (MC.13b,
 * ADR 041). El dominio sigue siendo el dueño del vocabulario; infra guarda la
 * única copia del cálculo.
 *
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 *
 * Primer paso concreto de ARQ.1: no es el modelo unificado de las cuatro
 * bolsas, es la primera pieza que ya tenía dos lectores.
 */

import { diasPorPeriodo, normalizarFrecuenciaAporte } from './vencimientos.js';

// ── FECHAS ───────────────────────────────────────────────────────

/**
 * Días calendario entre `hoyISO` y `fechaObjetivo`.
 * Devuelve `null` si no hay fecha objetivo o el formato es inválido.
 * Un valor <= 0 significa que la fecha ya pasó.
 *
 * `hoyISO` se inyecta para que el cálculo sea determinista en tests.
 *
 * Metas conserva su propio `diasHastaFecha` de un solo argumento y con otro
 * redondeo: unificarlos cambia resultados y es trabajo de ARQ.1, no de aquí.
 *
 * @param {string|null|undefined} fechaObjetivo - YYYY-MM-DD.
 * @param {string} hoyISO - YYYY-MM-DD (día de referencia).
 * @returns {number|null}
 */
export function diasHastaFecha(fechaObjetivo, hoyISO) {
  if (!fechaObjetivo || !/^\d{4}-\d{2}-\d{2}$/.test(fechaObjetivo)) return null;
  if (!hoyISO || !/^\d{4}-\d{2}-\d{2}$/.test(hoyISO)) return null;
  const objetivo = new Date(fechaObjetivo + 'T00:00:00');
  const hoy      = new Date(hoyISO + 'T00:00:00');
  if (isNaN(objetivo) || isNaN(hoy)) return null;
  return Math.round((objetivo - hoy) / (1000 * 60 * 60 * 24));
}

// ── PLAN DE REFERENCIA ───────────────────────────────────────────

/**
 * Plan de referencia de una bolsa con fecha (DIS.15, arquitectura E "las dos
 * carreras").
 *
 * Es la **segunda carrera** de la tarjeta: cuántos aportes preveía el plan y
 * cuántos ya deberían estar hechos a día de hoy. Sin esto, la tarjeta solo
 * puede decir cuánto llevas; con esto puede decir si vas al día, atrasado o
 * adelantado, que es el logro real de un apartado (no quedar corto el día del
 * cobro).
 *
 * **El referente son aportes, no el reloj.** `calcularAporteSugerido()` no
 * sirve como referencia porque se recalcula desde el faltante de hoy: siempre
 * dice "te faltan N aportes desde ahora", así que comparado consigo mismo el
 * usuario siempre va al día. Y comparar contra el tiempo transcurrido tampoco
 * vale: el dinero entra a saltos (un aporte por período) mientras el calendario
 * corre continuo, así que quien aporta puntualmente aparecería atrasado durante
 * casi todo el período (con una cuota mensual a seis meses el error llega a 17
 * puntos). Por eso el plan se mide en aportes completos y en unidades enteras.
 *
 * **De dónde sale el arranque del plan, sin campo nuevo que migrar.** Del
 * `fechaInicioPlan` que escribe `reiniciarCiclo()` al cerrar un ciclo, y si no
 * existe (todo apartado anterior a DIS.15, y todo primer ciclo) de la
 * `fechaCreacion` que `crud.guardar()` estampa desde siempre. Sin ese fallback
 * un apartado recurrente reiniciado mediría su plan desde el día que se creó y
 * daría "8 de 8" para siempre: acusaría de atraso a quien va al día.
 *
 * Devuelve `null` cuando no hay plan que dibujar: sin fecha objetivo, sin
 * objetivo válido o si la fecha de arranque no es anterior a la de vencimiento.
 *
 * @param {import('../core/state.js').Apartado} bolsa
 * @param {string} hoyISO - YYYY-MM-DD (día de referencia, inyectable).
 * @returns {{
 *   totalAportes: number,
 *   aportesEsperados: number,
 *   aportesEquivalentes: number,
 *   cuotaPrevista: number,
 *   delta: number,
 *   inicio: string,
 * } | null}
 */
export function planDeReferencia(bolsa, hoyISO) {
  const objetivo = Number(bolsa?.montoObjetivo) || 0;
  if (objetivo <= 0) return null;

  const inicio = _inicioDelPlan(bolsa);
  if (!inicio || !hoyISO || !/^\d{4}-\d{2}-\d{2}$/.test(hoyISO)) return null;

  const diasTotales = diasHastaFecha(bolsa?.fechaObjetivo, inicio);
  if (diasTotales === null || diasTotales <= 0) return null;

  const dias = diasPorPeriodo(normalizarFrecuenciaAporte(bolsa?.frecuenciaAporte));
  const totalAportes = Math.max(1, Math.ceil(diasTotales / dias));
  const cuotaPrevista = Math.round(objetivo / totalAportes);

  // Períodos completos corridos desde el arranque: al día 0 no toca ninguno.
  const diasCorridos     = diasHastaFecha(hoyISO, inicio) ?? 0;
  const aportesEsperados = _acotar(Math.floor(diasCorridos / dias), totalAportes);

  // Cuántos aportes "vale" el dinero reunido. Se compara en aportes completos
  // para que las dos carreras se midan con la misma unidad.
  const acumulado = Number(bolsa?.montoActual) || 0;
  const aportesEquivalentes = _acotar(Math.floor(acumulado / cuotaPrevista), totalAportes);

  return {
    totalAportes,
    aportesEsperados,
    aportesEquivalentes,
    cuotaPrevista,
    delta: aportesEquivalentes - aportesEsperados,
    inicio,
  };
}

/** Recorta un entero al rango [0, max]. */
function _acotar(n, max) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(max, Math.trunc(n));
}

/**
 * Día en que arrancó el plan vigente: el cierre del último ciclo si lo hubo,
 * y si no la creación de la bolsa. `fechaCreacion` es ISO 8601 completo
 * (`crud.guardar`), así que se recorta a YYYY-MM-DD.
 * @param {import('../core/state.js').Apartado} bolsa
 * @returns {string|null}
 */
function _inicioDelPlan(bolsa) {
  const candidato = bolsa?.fechaInicioPlan ?? bolsa?.fechaCreacion ?? null;
  if (typeof candidato !== 'string') return null;
  const fecha = candidato.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null;
}
