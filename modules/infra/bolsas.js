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
 *
 * ARQ.1a suma la segunda pieza: `progresoDeBolsa`, que las cuatro bolsas
 * calculaban por separado (`calcularProgreso` en Metas y en Apartados,
 * `calcularProgresoFondo` en Ahorro, y una cuarta copia dentro de
 * `estadoDeBolsa`, acá mismo). Cada dominio conserva su envoltorio con el
 * nombre y el vocabulario de siempre.
 */

import { diasPorPeriodo, normalizarFrecuenciaAporte } from './vencimientos.js';

// ── PROGRESO ─────────────────────────────────────────────────────

/**
 * Cuánto lleva reunido una bolsa frente a lo que quiere reunir (ARQ.1a).
 *
 * Recibe dos números y no una bolsa, porque el fondo de emergencia no es un
 * registro guardado: su objetivo se deriva de los gastos fijos del mes. La
 * forma más chica que sirve a las cuatro bolsas son los dos montos sueltos, y
 * cada dominio arma su llamada con los campos que sí tiene.
 *
 * **Los bordes son los más estrictos de las tres copias que reemplaza**, no un
 * promedio: Metas dejaba pasar un objetivo `NaN` hasta la vista (el porcentaje
 * salía `NaN` y se pintaba tal cual), y ni Metas ni Apartados recortaban un
 * acumulado negativo. Solo el fondo protegía los dos casos, así que su criterio
 * es el que queda. Ningún test existente dependía de los bordes laxos.
 *
 * @param {number|string|null|undefined} objetivo - lo que la bolsa quiere reunir.
 * @param {number|string|null|undefined} actual   - lo que ya lleva reunido.
 * @returns {{ porcentaje: number, faltante: number, completado: boolean }}
 *   - porcentaje: entero 0-100, redondeado.
 *   - faltante:   COP que faltan para el objetivo, nunca negativo.
 *   - completado: el porcentaje ya llegó a 100.
 */
export function progresoDeBolsa(objetivo, actual) {
  const meta    = Number(objetivo);
  const reunido = Math.max(0, Number(actual) || 0);

  if (!Number.isFinite(meta) || meta <= 0) {
    return { porcentaje: 0, faltante: 0, completado: false };
  }

  const porcentaje = Math.min(100, Math.round((reunido / meta) * 100));
  const faltante   = Math.max(0, meta - reunido);

  return { porcentaje, faltante, completado: porcentaje >= 100 };
}

// ── FECHAS ───────────────────────────────────────────────────────

/**
 * Días calendario entre `hoyISO` y `fechaObjetivo`.
 * Devuelve `null` si no hay fecha objetivo o el formato es inválido.
 * Un valor <= 0 significa que la fecha ya pasó.
 *
 * `hoyISO` se inyecta para que el cálculo sea determinista en tests.
 *
 * Metas tenía su propio `diasHastaFecha` de un solo argumento, que leía el
 * reloj por dentro. ARQ.1a lo retiró sin reemplazarlo: no lo llamaba nadie en
 * `modules/`, solo su propio test. Esta es la única medida de días de una bolsa.
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

// ── ESTADO COMPARABLE DE UNA BOLSA ───────────────────────────────

/**
 * Lo que hace falta para dibujar una bolsa como columna comparable (DIS.19).
 *
 * Traduce una bolsa a tres números y un estado, sin una palabra de copy: eso lo
 * pone cada pantalla en su propio vocabulario. Está acá porque el comparador
 * tiene dos consumidores (la lista de Apartados y el carril de la casa de
 * Ahorro) y calcular esto dos veces habría vuelto a duplicar el plan.
 *
 * `reunido` es más ancho que "listo para reiniciar" del dominio Apartados: acá
 * describe un **dibujo** (la columna llena) y allá gobierna una **acción** (usar
 * el dinero y arrancar el ciclo), que solo tiene sentido en las recurrentes.
 *
 * @param {import('../core/state.js').Apartado} bolsa
 * @param {string} hoyISO - YYYY-MM-DD.
 * @returns {{
 *   pct: number,
 *   planPct: number|null,
 *   dias: number|null,
 *   reunido: boolean,
 *   atrasada: boolean,
 * }}
 */
export function estadoDeBolsa(bolsa, hoyISO) {
  const objetivo = Number(bolsa?.montoObjetivo) || 0;
  const actual   = Number(bolsa?.montoActual) || 0;

  const { porcentaje: pct } = progresoDeBolsa(objetivo, actual);

  // `reunido` compara los montos, no el porcentaje: con un objetivo de 1.000 y
  // 996 reunidos la barra ya se dibuja llena (redondea a 100) pero el dinero no
  // alcanza. Acá manda el dinero, porque de esto cuelga "listo para usarse".
  const reunido = objetivo > 0 && actual >= objetivo;

  const plan    = planDeReferencia(bolsa, hoyISO);
  const planPct = plan === null
    ? null
    : reunido ? 100 : Math.min(100, Math.round((plan.aportesEsperados / plan.totalAportes) * 100));

  return {
    pct,
    planPct,
    dias:     diasHastaFecha(bolsa?.fechaObjetivo, hoyISO),
    reunido,
    atrasada: !reunido && planPct !== null && pct < planPct,
  };
}

// ── DESCUENTA SALDO (ADR 053) ────────────────────────────────────

/**
 * Si aportar a esta bolsa descuenta la cuenta de origen, la propiedad que el
 * ADR 053 (I2, invariante de patrimonio) pidió modelar explícitamente en el
 * modelo unificado: antes vivía como folclore de cada dominio.
 *
 * Metas y Apartados siempre descuentan (aportan solo desde una cuenta real).
 * El fondo nunca (ADR 020: excluido de `activos`, su dinero sigue en
 * `cuentas`). Inversión depende del registro puntual: `cuentaId` presente es
 * la marca de que esa inversión sí salió de una cuenta (INV.1); sin ella la
 * app no puede saberlo (preexistente, nómina, reinversión, efectivo).
 *
 * `calcularActivos()` (`analisis/logic.js`) no llama esta función: su regla
 * de suma no se toca de forma retroactiva (ADR 053 I4). Esta función es la
 * tabla de la invariante hecha código y test, no una entrada nueva del
 * cálculo de patrimonio.
 *
 * @param {'metas'|'apartados'|'fondo'|'inversion'} tipoBolsa
 * @param {{cuentaId?: string|null}} [registro] - solo lo usa 'inversion'.
 * @returns {boolean}
 */
export function descuentaSaldo(tipoBolsa, registro = null) {
  switch (tipoBolsa) {
    case 'metas':
    case 'apartados':
      return true;
    case 'fondo':
      return false;
    case 'inversion':
      return Boolean(registro?.cuentaId);
    default:
      return false;
  }
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
