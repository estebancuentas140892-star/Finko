/**
 * infra/sugerencias-categoria.js - motor único de sugerencia por categoría
 * (LIM.1c, [ADR 044](../../docs/DECISIONS/044-motor-unico-de-sugerencia-por-categoria.md)).
 *
 * Convierte un patrón de gasto ya registrado en algo ejecutable: cuánto poner
 * de tope, en qué categoría conviene ponerlo y qué suscripción lleva tanto
 * tiempo cobrándose que vale la pena revisarla. Vive en infra porque lo
 * consumen varios dominios (hoy Límites de gasto; mañana Inicio) y ninguno
 * puede importar a otro (regla ADN #10): mismo hogar y mismo patrón que
 * `infra/vencimientos.js`, `infra/financiero.js` y `infra/distribuir-pago.js`.
 *
 * **Devuelve datos, nunca frases.** El copy es de cada superficie dentro del
 * [ADR 003](../../docs/DECISIONS/003-tono-neutral-profesional.md) (ADR 044 D5):
 * tres superficies con el mismo texto sonarían a plantilla, y un motor que
 * arma strings no se puede testear sin fijar el copy.
 *
 * **Sugiere, no ejecuta** (ADR 044, límites de responsabilidad): no muta `S`,
 * no persiste, no toca el DOM y no decide cuándo se muestra nada. Puro y
 * testeable en Node: la fecha entra como `hoyISO`.
 *
 * La base del monto es el histórico de la categoría, acotado por lo que el
 * plan del mes deja sin tope (`coberturaLimitesEstiloVida().sinTope`, ADR 045
 * D6). Los saldos en cuenta y el dinero extraordinario nunca entran.
 */

import { CATEGORIAS_AGENDA_NO_ESENCIALES } from '../core/constants.js';

// ── CONSTANTES DEL MOTOR ─────────────────────────────────────────

/** Meses cerrados que se miran hacia atrás para estimar el gasto habitual. */
export const MESES_HISTORICO = 3;

/** El gasto del mes en curso es "creciente" si supera el promedio por este factor. */
export const UMBRAL_CRECIMIENTO = 1.25;

/**
 * Gasto mensual mínimo para que una categoría merezca una sugerencia de tope.
 * Debajo de esta cifra el tope ordena más de lo que ayuda: son $600.000 al
 * año, el punto donde ponerle un máximo empieza a cambiar algo.
 */
export const UMBRAL_MONTO_SUGERENCIA = 50_000;

/** Redondeo del monto sugerido: el mismo `step` que usa el campo del formulario. */
export const PASO_REDONDEO = 10_000;

/** Meses cobrados a partir de los cuales una suscripción se ofrece a revisión. */
export const MESES_SUSCRIPCION_ANTIGUA = 6;

/** Ventana hacia atrás para contar los cobros de una suscripción. */
export const MESES_VENTANA_SUSCRIPCION = 12;

const _RX_MES = /^(\d{4})-(\d{2})/;

// ── HELPERS DE FECHA ─────────────────────────────────────────────

/** 'YYYY-MM' de un año y un mes 1-12. */
function _clave(anio, mes) {
  return `${anio}-${String(mes).padStart(2, '0')}`;
}

/** {anio, mes} de una fecha ISO, o null si no matchea. */
function _mesDe(fechaISO) {
  const m = _RX_MES.exec(String(fechaISO ?? ''));
  return m ? { anio: +m[1], mes: +m[2] } : null;
}

/** {anio, mes} n meses antes del par recibido (n >= 0). */
function _retroceder(anio, mes, n) {
  const total = (anio * 12 + (mes - 1)) - n;
  return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
}

/** Redondea hacia arriba al siguiente múltiplo de `PASO_REDONDEO`. */
function _redondearArriba(monto) {
  return Math.ceil(monto / PASO_REDONDEO) * PASO_REDONDEO;
}

// ── HISTÓRICO DE UNA CATEGORÍA ───────────────────────────────────

/**
 * Gasto de una categoría en el mes en curso y en los meses cerrados anteriores.
 *
 * El mes en curso va aparte porque está incompleto: promediarlo con meses
 * completos arrastra el promedio hacia abajo el día 3 y hacia arriba el 30. El
 * promedio se saca solo sobre los **meses cerrados con gasto**, no sobre los
 * `meses` mirados: quien empezó a pedir domicilios hace dos meses no tiene por
 * qué ver su promedio dividido entre tres.
 *
 * @param {import('../core/state.js').Gasto[]} gastos
 * @param {string} categoria
 * @param {string} hoyISO - 'YYYY-MM-DD'.
 * @param {number} [meses=MESES_HISTORICO] - meses cerrados hacia atrás.
 * @returns {{ actual:number, promedio:number, mesesConGasto:number, cerrados:number[] }}
 *   `cerrados` va del mes más reciente al más antiguo. Todo en 0 si `hoyISO`
 *   no es una fecha válida.
 */
export function historicoCategoria(gastos, categoria, hoyISO, meses = MESES_HISTORICO) {
  const hoy = _mesDe(hoyISO);
  if (!hoy) return { actual: 0, promedio: 0, mesesConGasto: 0, cerrados: [] };

  const propios = (gastos ?? []).filter(g => (g.categoria ?? 'Otros') === categoria);
  const totalDe = (anio, mes) => {
    const prefijo = _clave(anio, mes);
    return propios
      .filter(g => typeof g?.fecha === 'string' && g.fecha.startsWith(prefijo))
      .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  };

  const actual   = totalDe(hoy.anio, hoy.mes);
  const cerrados = [];
  for (let i = 1; i <= meses; i++) {
    const { anio, mes } = _retroceder(hoy.anio, hoy.mes, i);
    cerrados.push(totalDe(anio, mes));
  }

  const conGasto      = cerrados.filter(t => t > 0);
  const mesesConGasto = conGasto.length;
  const promedio      = mesesConGasto > 0
    ? Math.round(conGasto.reduce((acc, t) => acc + t, 0) / mesesConGasto)
    : 0;

  return { actual, promedio, mesesConGasto, cerrados };
}

// ── MONTO SUGERIDO PARA UN TOPE ──────────────────────────────────

/**
 * Cuánto proponer como tope mensual de una categoría.
 *
 * Base: el promedio de los meses cerrados con gasto; sin histórico, lo que se
 * lleva gastado en el mes en curso. **No se sugiere un recorte**: proponer un
 * tope por debajo de lo que la persona ya gasta es imponer una dieta que no
 * pidió (ADR 003, Finko sugiere). El tope nace en su gasto habitual y es la
 * persona quien decide bajarlo.
 *
 * Techo: `sinTope`, lo que el plan del mes deja sin ningún tope (ADR 045 D6).
 * Sugerir más que eso sería repartir dinero que el plan no tiene. El techo se
 * aplica solo si deja un monto utilizable (al menos un paso de redondeo).
 *
 * @param {import('../core/state.js').Gasto[]} gastos
 * @param {string} categoria
 * @param {string} hoyISO - 'YYYY-MM-DD'.
 * @param {{ sinTope?: number }} [opciones]
 * @returns {{
 *   monto: number,
 *   base: 'promedio'|'mes-actual',
 *   promedio: number,
 *   mesesConGasto: number,
 *   acotado: boolean,
 * }|null} `null` si la categoría no tiene gasto con el que estimar nada.
 */
export function sugerirMontoTope(gastos, categoria, hoyISO, { sinTope = 0 } = {}) {
  const { actual, promedio, mesesConGasto } = historicoCategoria(gastos, categoria, hoyISO);

  const base    = promedio > 0 ? 'promedio' : 'mes-actual';
  const partida = promedio > 0 ? promedio : actual;
  if (partida <= 0) return null;

  let monto   = _redondearArriba(partida);
  let acotado = false;

  const techo = Number(sinTope) || 0;
  if (techo >= PASO_REDONDEO && monto > techo) {
    monto   = Math.floor(techo / PASO_REDONDEO) * PASO_REDONDEO;
    acotado = true;
  }

  return { monto, base, promedio, mesesConGasto, acotado };
}

// ── QUÉ CATEGORÍA PIDE UN TOPE ───────────────────────────────────

/**
 * Ordena las categorías candidatas por qué tanto piden un tope.
 *
 * Entra una categoría cuando gasta lo suficiente (`UMBRAL_MONTO_SUGERENCIA`) y
 * además es **recurrente** (gasto en dos o más meses cerrados) o **creciente**
 * (el mes en curso ya supera el promedio por `UMBRAL_CRECIMIENTO`). Un gasto de
 * un solo mes que no crece es un evento, no un patrón.
 *
 * `categorias` llega ya filtrada por el consumidor: solo las que **puede**
 * recibir un tope y todavía no lo tienen. El motor no conoce el catálogo de
 * categorías de cada superficie ni `S.presupuestos` (ADN #10).
 *
 * Orden: primero lo creciente (es la novedad accionable), después por monto
 * descendente.
 *
 * @param {import('../core/state.js').Gasto[]} gastos
 * @param {string[]} categorias - candidatas elegibles y sin tope.
 * @param {string} hoyISO - 'YYYY-MM-DD'.
 * @param {{ sinTope?: number, umbral?: number }} [opciones]
 * @returns {Array<{
 *   categoria: string,
 *   motivo: 'creciente'|'recurrente',
 *   monto: number,
 *   base: 'promedio'|'mes-actual',
 *   promedio: number,
 *   actual: number,
 *   mesesConGasto: number,
 *   acotado: boolean,
 * }>}
 */
export function sugerirCategoriasParaTope(gastos, categorias, hoyISO, opciones = {}) {
  const { sinTope = 0, umbral = UMBRAL_MONTO_SUGERENCIA } = opciones;

  const candidatas = [];
  for (const categoria of (categorias ?? [])) {
    const { actual, promedio, mesesConGasto } = historicoCategoria(gastos, categoria, hoyISO);
    const referencia = Math.max(promedio, actual);
    if (referencia < umbral) continue;

    const creciente  = promedio > 0 && actual > promedio * UMBRAL_CRECIMIENTO;
    const recurrente = mesesConGasto >= 2;
    if (!creciente && !recurrente) continue;

    const sugerido = sugerirMontoTope(gastos, categoria, hoyISO, { sinTope });
    if (!sugerido) continue;

    candidatas.push({
      categoria,
      motivo: creciente ? 'creciente' : 'recurrente',
      actual,
      ...sugerido,
    });
  }

  return candidatas.sort((a, b) => {
    if (a.motivo !== b.motivo) return a.motivo === 'creciente' ? -1 : 1;
    return Math.max(b.promedio, b.actual) - Math.max(a.promedio, a.actual);
  });
}

// ── SUSCRIPCIONES QUE LLEVAN AÑOS COBRÁNDOSE ─────────────────────

/**
 * Suscripciones y streaming que llevan tantos meses cobrándose que vale la
 * pena mirarlas de nuevo (el "gasto fantasma" del brief de LIM.1).
 *
 * Finko **no sabe** si algo se usa: no hay dato de uso y no se va a inventar.
 * Lo que sí sabe es cuántos meses lleva cobrado y cuánto suma al año, que es
 * la cifra que nadie tiene en la cabeza. La superficie muestra ese hecho y la
 * persona decide (ADR 003).
 *
 * Solo mira los fijos **no esenciales** del [ADR 014](../../docs/DECISIONS/014-taxonomia-categorias-transversal.md)
 * (Streaming y Suscripciones, la misma lista cerrada que LIM.1b usa para el
 * ejecutado): el arriendo también lleva doce meses cobrándose y no es un
 * hallazgo. Los cobros se cuentan por meses distintos con pago registrado, no
 * por número de gastos: dos pagos del mismo mes son un mes.
 *
 * @param {import('../core/state.js').Compromiso[]} compromisos
 * @param {import('../core/state.js').Gasto[]} gastos
 * @param {string} hoyISO - 'YYYY-MM-DD'.
 * @param {{ mesesMinimos?: number, ventana?: number }} [opciones]
 * @returns {Array<{
 *   compromisoId: string,
 *   descripcion: string,
 *   categoria: string,
 *   montoMensual: number,
 *   costoAnual: number,
 *   mesesPagados: number,
 * }>} Ordenado por costo anual descendente.
 */
export function detectarSuscripcionesLargas(compromisos, gastos, hoyISO, opciones = {}) {
  const {
    mesesMinimos = MESES_SUSCRIPCION_ANTIGUA,
    ventana      = MESES_VENTANA_SUSCRIPCION,
  } = opciones;

  const hoy = _mesDe(hoyISO);
  if (!hoy) return [];

  const desde = _retroceder(hoy.anio, hoy.mes, ventana - 1);
  const claveDesde = _clave(desde.anio, desde.mes);
  const claveHasta = _clave(hoy.anio, hoy.mes);

  const candidatos = (compromisos ?? []).filter(c =>
    c?.tipo === 'fijo'
    && c.activo !== false
    && CATEGORIAS_AGENDA_NO_ESENCIALES.includes(c.categoria));

  return candidatos
    .map(c => {
      const meses = new Set(
        (gastos ?? [])
          .filter(g => g?.compromisoId === c.id && typeof g?.fecha === 'string')
          .map(g => g.fecha.slice(0, 7))
          .filter(k => k >= claveDesde && k <= claveHasta),
      );
      const montoMensual = Number(c.monto) || 0;
      return {
        compromisoId: c.id,
        descripcion:  c.descripcion ?? '',
        categoria:    c.categoria,
        montoMensual,
        costoAnual:   montoMensual * 12,
        mesesPagados: meses.size,
      };
    })
    .filter(s => s.mesesPagados >= mesesMinimos && s.montoMensual > 0)
    .sort((a, b) => b.costoAnual - a.costoAnual);
}
