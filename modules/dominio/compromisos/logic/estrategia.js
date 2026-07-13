/**
 * compromisos/logic/estrategia.js - estrategia de pago de deudas: simulaciones mes a mes
 * (Avalancha/Bola de nieve, renegociacion, consolidacion), motor de
 * recomendacion y reparto del pago extra en cuotas.
 *
 * Sub-modulo de compromisos/logic.js (barrel). Reglas de la capa:
 * - Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 */

import { compromisosActivos, esDeuda, tasaEADe } from './modelo.js';

// ── ESTRATEGIAS DE PAGO (F.4) ────────────────────────────────────

/**
 * Tope duro de meses en la simulación para evitar loops infinitos cuando
 * el aporte mensual no alcanza ni para cubrir los intereses. 600 meses = 50 años.
 */
const MAX_MESES_SIMULACION = 600;

/**
 * Simula el pago de una deuda individual mes a mes con interés compuesto.
 * Devuelve cuántos meses toma saldarla y cuánto se paga en intereses.
 *
 * @param {number} saldo         Saldo actual en COP.
 * @param {number} tasaEA        Tasa efectiva anual como decimal (0.28 = 28%).
 * @param {number} cuotaMensual  Cuota mensual fija (sin el extra).
 * @param {number} [abonoExtra=0] Monto extra que se agrega a la cuota cada mes.
 * @returns {{ meses: number, intereses: number, completo: boolean }}
 *   `completo=false` cuando la cuota no cubre el interés y la deuda no se salda
 *   dentro del tope de meses (en ese caso `intereses` es una cifra divergente,
 *   no un total real: no debe restarse contra otro escenario).
 */
export function simularPagoDeuda(saldo, tasaEA, cuotaMensual, abonoExtra = 0) {
  if (!Number.isFinite(saldo) || saldo <= 0) return { meses: 0, intereses: 0, completo: true };

  const tasaMensual = tasaEA > 0 ? _tasaMensualDesdeEA(tasaEA) : 0;
  const cuotaTotal  = (cuotaMensual || 0) + (abonoExtra || 0);
  if (cuotaTotal <= 0) return { meses: MAX_MESES_SIMULACION, intereses: 0, completo: false };

  let s = saldo;
  let meses = 0;
  let intereses = 0;

  while (s > 0.01 && meses < MAX_MESES_SIMULACION) {
    meses++;
    const interesMes = s * tasaMensual;
    s += interesMes;
    intereses += interesMes;
    s -= Math.min(cuotaTotal, s);
  }

  return { meses, intereses: Math.round(intereses), completo: s <= 0.01 };
}

/**
 * Simula renegociar la tasa de UNA deuda: compara el plan con la tasa vigente
 * contra el plan con una tasa EA nueva, manteniendo la misma cuota mensual.
 * What-if puro (reusa `simularPagoDeuda`): no muta nada.
 *
 * El ahorro solo se calcula si ambos escenarios saldan la deuda. Si el plan
 * actual no cierra (la cuota no cubre el interés) pero el nuevo sí, la mejora
 * es cualitativa ("de no pagarse a pagarse"): no se resta una cifra divergente.
 *
 * @param {{ saldo: number, tasaEA: number, cuota: number }} deuda
 * @param {number} nuevaTasaEA  Nueva tasa efectiva anual (decimal, 0.20 = 20%).
 * @returns {{
 *   actual: { meses: number, intereses: number, completo: boolean },
 *   nueva:  { meses: number, intereses: number, completo: boolean },
 *   ahorroMeses: number,
 *   ahorroIntereses: number,
 *   mejora: boolean,
 * } | null}  null si los datos de la deuda no permiten simular.
 */
export function simularRenegociacion(deuda, nuevaTasaEA) {
  if (!deuda) return null;
  const saldo      = Number(deuda.saldo);
  const cuota      = Number(deuda.cuota);
  const tasaActual = Number(deuda.tasaEA);
  const tasaNueva  = Number(nuevaTasaEA);
  if (!(saldo > 0) || !(cuota > 0)) return null;
  if (!Number.isFinite(tasaActual) || tasaActual < 0) return null;
  if (!Number.isFinite(tasaNueva)  || tasaNueva  < 0) return null;

  const actual = simularPagoDeuda(saldo, tasaActual, cuota, 0);
  const nueva  = simularPagoDeuda(saldo, tasaNueva,  cuota, 0);

  const ambosCompletan  = actual.completo && nueva.completo;
  const ahorroMeses     = ambosCompletan ? Math.max(0, actual.meses - nueva.meses) : 0;
  const ahorroIntereses = ambosCompletan ? Math.max(0, actual.intereses - nueva.intereses) : 0;

  // La nueva tasa "mejora" si vuelve pagable una deuda que no lo era, o si
  // (siendo ambas pagables) acorta el plazo o reduce intereses de forma real.
  const mejora = (!actual.completo && nueva.completo)
    || (ambosCompletan && (ahorroMeses > 0 || ahorroIntereses > 0.5));

  return { actual, nueva, ahorroMeses, ahorroIntereses, mejora };
}

/**
 * Simula consolidar TODAS las deudas en un crédito nuevo único. Compara el plan
 * actual (mejor estrategia, Avalancha, sin extra) contra un crédito nuevo con
 * saldo = suma de los saldos, su propia tasa EA y su propia cuota mensual.
 * What-if puro: no muta nada.
 *
 * El ahorro de intereses solo se calcula si ambos planes cierran. Igual que en
 * renegociar, un plan actual inviable que el crédito nuevo vuelve pagable es una
 * mejora cualitativa (no se resta una cifra divergente). El ahorro de meses se
 * deja con signo: consolidar a una cuota menor puede alargar el plazo aunque
 * baje el interés, y el renderer debe poder decirlo con honestidad.
 *
 * @param {ReturnType<typeof filtrarDeudasPagables>} deudas
 * @param {{ tasaEA: number, cuota: number }} nuevoCredito  tasa EA decimal + cuota mensual.
 * @returns {{
 *   actual:      { meses: number, intereses: number, completo: boolean, cuotaMensual: number },
 *   consolidado: { meses: number, intereses: number, completo: boolean, cuotaMensual: number, saldo: number },
 *   ahorroIntereses: number,
 *   ahorroMeses: number,
 *   mejora: boolean,
 * } | null}  null si los datos no permiten simular.
 */
export function simularConsolidacion(deudas, nuevoCredito) {
  if (!Array.isArray(deudas) || deudas.length === 0) return null;

  const saldoTotal       = deudas.reduce((a, d) => a + (Number(d.saldo)  || 0), 0);
  const cuotaActualTotal = deudas.reduce((a, d) => a + (Number(d.cuota)  || 0), 0);
  const tasaNueva  = Number(nuevoCredito?.tasaEA);
  const cuotaNueva = Number(nuevoCredito?.cuota);
  if (!(saldoTotal > 0)) return null;
  if (!Number.isFinite(tasaNueva) || tasaNueva < 0) return null;
  if (!(cuotaNueva > 0)) return null;

  const planActual = simularEstrategiaPago(deudas, 0, 'avalancha');
  const cons       = simularPagoDeuda(saldoTotal, tasaNueva, cuotaNueva, 0);

  const actual = {
    meses:        planActual.meses,
    intereses:    Math.round(planActual.interesesTotales),
    completo:     planActual.completo,
    cuotaMensual: cuotaActualTotal,
  };
  const consolidado = {
    meses:        cons.meses,
    intereses:    cons.intereses,
    completo:     cons.completo,
    cuotaMensual: cuotaNueva,
    saldo:        saldoTotal,
  };

  const ambosCompletan  = actual.completo && consolidado.completo;
  const ahorroIntereses = ambosCompletan ? actual.intereses - consolidado.intereses : 0;
  const ahorroMeses     = ambosCompletan ? actual.meses - consolidado.meses : 0; // con signo

  // Consolidar "mejora" si vuelve pagable un plan inviable, o si (cerrando ambos)
  // reduce el total de intereses. Bajar solo la cuota (a más interés total) no se
  // marca como mejora: el botón "Aplicar" se reserva para un beneficio real.
  const mejora = (!actual.completo && consolidado.completo)
    || (ambosCompletan && ahorroIntereses > 0.5);

  return { actual, consolidado, ahorroIntereses, ahorroMeses, mejora };
}

/**
 * Filtra compromisos que pueden entrar en una estrategia de pago.
 * Requiere: deuda (entidad o personal), activo, saldoTotal>0, cuotaMensual>0.
 * La tasa se convierte a EA si está en mensual; si no hay tasa válida, queda 0.
 *
 * `tasaDesconocida` marca las deudas con entidad cuya tasa el usuario no registró
 * (tasa null). En la simulación se tratan como 0%, lo que subestima sus intereses:
 * el motor de recomendación lo señala para que el usuario confirme la tasa real.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @returns {Array<{ id: string, descripcion: string, tipo: string,
 *                   saldo: number, tasaEA: number, cuota: number,
 *                   tasaDesconocida: boolean }>}
 */
export function filtrarDeudasPagables(compromisos) {
  return compromisosActivos(compromisos)
    .filter(c => esDeuda(c.tipo))
    .filter(c => Number.isFinite(c.saldoTotal) && c.saldoTotal > 0)
    .filter(c => Number.isFinite(c.cuotaMensual) && c.cuotaMensual > 0)
    .map(c => ({
      id:          c.id,
      descripcion: c.descripcion,
      tipo:        c.tipo,
      saldo:       c.saldoTotal,
      tasaEA:      tasaEADe(c),
      cuota:       c.cuotaMensual,
      // Unidad nativa de la tasa registrada: la herramienta de renegociación
      // pregunta y aplica en la misma unidad (EA para entidad, mensual para
      // los gota a gota / préstamos personales).
      tasaUnidad:  c.tasaUnidad === 'mensual' ? 'mensual' : 'EA',
      tasaDesconocida: c.tipo === 'deuda-entidad' && (c.tasa === null || c.tasa === undefined),
    }));
}

/**
 * Convierte una tasa efectiva anual a su equivalente mensual exacto.
 * tasaMensual = (1 + tasaEA)^(1/12) - 1
 * @param {number} tasaEA decimal (0.28 = 28% EA)
 */
function _tasaMensualDesdeEA(tasaEA) {
  return Math.pow(1 + tasaEA, 1 / 12) - 1;
}

/**
 * Simula el pago mes a mes de un conjunto de deudas siguiendo una estrategia.
 *
 * Algoritmo:
 * 1. Ordenar deudas según estrategia (avalancha = tasa↓, bolaNieve = saldo↑).
 * 2. Cada mes: aplicar interés, pagar cuota mínima en todas, volcar
 *    (extraMensual + cuotas liberadas) en la deuda prioritaria.
 * 3. Cuando una deuda llega a saldo ≤ 0, su cuota se libera para la siguiente.
 * 4. Repetir hasta saldo total = 0 o tope de meses alcanzado.
 *
 * @param {ReturnType<typeof filtrarDeudasPagables>} deudas
 * @param {number} extraMensual COP adicionales por mes (≥ 0).
 * @param {'avalancha' | 'bolaNieve'} estrategia
 * @returns {{
 *   orden: Array<{ id: string, descripcion: string, mesPagado: number | null }>,
 *   meses: number,
 *   interesesTotales: number,
 *   pagadoTotal: number,
 *   completo: boolean,
 * }}
 */
export function simularEstrategiaPago(deudas, extraMensual, estrategia) {
  if (!Array.isArray(deudas) || deudas.length === 0) {
    return { orden: [], meses: 0, interesesTotales: 0, pagadoTotal: 0, completo: true };
  }

  const extra = Number.isFinite(extraMensual) && extraMensual > 0 ? extraMensual : 0;

  // Copia mutable, ordenada según estrategia.
  const sortFn = estrategia === 'bolaNieve'
    ? (a, b) => a.saldo - b.saldo
    : (a, b) => b.tasaEA - a.tasaEA;

  const deudasSim = deudas.map(d => ({
    id:          d.id,
    descripcion: d.descripcion,
    saldo:       d.saldo,
    tasaEA:      d.tasaEA,
    tasaMensual: _tasaMensualDesdeEA(d.tasaEA),
    cuota:       d.cuota,
    pagada:      false,
    mesPagado:   null,
  })).sort(sortFn);

  let meses = 0;
  let interesesTotales = 0;
  let pagadoTotal = 0;

  while (deudasSim.some(d => !d.pagada) && meses < MAX_MESES_SIMULACION) {
    meses++;

    // 1. Aplicar interés mensual a deudas activas.
    for (const d of deudasSim) {
      if (d.pagada) continue;
      const interes = d.saldo * d.tasaMensual;
      d.saldo += interes;
      interesesTotales += interes;
    }

    // 2. Calcular "presupuesto" disponible este mes: cuotas de TODAS las deudas
    //    (activas y pagadas - las pagadas liberan su cuota) + extra mensual.
    let presupuesto = extra + deudasSim.reduce((acc, d) => acc + d.cuota, 0);

    // 3. Pagar cuota mínima en deudas no prioritarias (de la 2da en adelante).
    for (let i = 1; i < deudasSim.length; i++) {
      const d = deudasSim[i];
      if (d.pagada) continue;
      const pago = Math.min(d.cuota, d.saldo, presupuesto);
      d.saldo -= pago;
      presupuesto -= pago;
      pagadoTotal += pago;
      if (d.saldo <= 0.01) {
        d.saldo = 0;
        d.pagada = true;
        d.mesPagado = meses;
      }
    }

    // 4. Volcar TODO lo restante en la deuda prioritaria (índice 0 activo).
    const prioritaria = deudasSim.find(d => !d.pagada);
    if (prioritaria && presupuesto > 0) {
      const pago = Math.min(prioritaria.saldo, presupuesto);
      prioritaria.saldo -= pago;
      presupuesto -= pago;
      pagadoTotal += pago;
      if (prioritaria.saldo <= 0.01) {
        prioritaria.saldo = 0;
        prioritaria.pagada = true;
        prioritaria.mesPagado = meses;
      }
    }

    // 5. Safety: si presupuesto < interés mensual mínimo total → no avanzamos.
    //    Detectamos esto si todas las deudas siguen vivas y ninguna bajó saldo.
    //    En la práctica, el tope MAX_MESES_SIMULACION lo agarra.
  }

  const completo = deudasSim.every(d => d.pagada);

  return {
    orden: deudasSim.map(d => ({
      id:          d.id,
      descripcion: d.descripcion,
      mesPagado:   d.mesPagado,
    })),
    meses:            completo ? meses : MAX_MESES_SIMULACION,
    interesesTotales,
    pagadoTotal,
    completo,
  };
}

/**
 * Compara las dos estrategias para un mismo conjunto de deudas.
 * Devuelve los resultados de ambas + el ahorro (meses + intereses) de la
 * mejor sobre la peor.
 *
 * @param {ReturnType<typeof filtrarDeudasPagables>} deudas
 * @param {number} extraMensual
 * @returns {{
 *   avalancha: ReturnType<typeof simularEstrategiaPago>,
 *   bolaNieve: ReturnType<typeof simularEstrategiaPago>,
 *   ahorroIntereses: number,
 *   ahorroMeses: number,
 *   mejor: 'avalancha' | 'bolaNieve' | 'empate',
 * }}
 */
export function compararEstrategias(deudas, extraMensual) {
  const avalancha = simularEstrategiaPago(deudas, extraMensual, 'avalancha');
  const bolaNieve = simularEstrategiaPago(deudas, extraMensual, 'bolaNieve');

  // Avalancha es matemáticamente óptima (≤ intereses). Cuando empata,
  // suele ser porque las tasas son idénticas o sólo hay una deuda.
  const ahorroIntereses = Math.max(0, bolaNieve.interesesTotales - avalancha.interesesTotales);
  const ahorroMeses     = Math.max(0, bolaNieve.meses - avalancha.meses);

  let mejor = 'empate';
  if (avalancha.interesesTotales < bolaNieve.interesesTotales - 0.5) mejor = 'avalancha';
  else if (bolaNieve.interesesTotales < avalancha.interesesTotales - 0.5) mejor = 'bolaNieve';

  return { avalancha, bolaNieve, ahorroIntereses, ahorroMeses, mejor };
}

/**
 * Ahorro de intereses (COP) a partir del cual avalancha "vale el esfuerzo"
 * frente a bola de nieve cuando ambas estrategias completan el plan. Por debajo,
 * el ahorro marginal no compensa la motivación de cerrar deudas chicas primero.
 */
const UMBRAL_AHORRO_MATERIAL = 50_000;

/**
 * Recomienda una estrategia de pago analizando la simulación real de ambas
 * estrategias, no solo la dispersión de tasas. El motor decide en este orden:
 *
 *  1. 0 o 1 deuda → no recomienda nada (una sola deuda no necesita estrategia).
 *  2. Ninguna estrategia completa el plan (`viable: false`) → no recomienda
 *     avalancha ni bola: diagnostica qué deudas crecen porque su cuota no cubre
 *     el interés, y calcula el pago extra mínimo para que el plan sí termine.
 *  3. Solo una estrategia completa → esa (la otra dejaría una deuda creciendo).
 *  4. Ambas completan:
 *     - Todas sin interés → bola de nieve (avalancha no aporta nada).
 *     - Avalancha ahorra de forma material (≥ UMBRAL_AHORRO_MATERIAL en
 *       intereses o ≥ 1 mes) → avalancha.
 *     - Ahorro inmaterial o empate → bola de nieve (la motivación pesa más).
 *
 * Si una sola deuda cobra intereses, la razón lo nombra: atacarla primero no
 * "reduce" el costo de intereses, lo elimina (D.11).
 *
 * La decisión usa `extraMensual` porque cambia el resultado: un plan inviable
 * sin extra puede volverse viable (y cambiar de recomendación) con un aporte.
 *
 * @param {ReturnType<typeof filtrarDeudasPagables>} deudas
 * @param {number} [extraMensual=0] COP adicionales por mes que el usuario aporta.
 * @returns {{
 *   estrategia: 'avalancha' | 'bolaNieve' | null,
 *   razon: string,
 *   viable: boolean,
 *   diagnostico: {
 *     deudasCrecientes: Array<{ id: string, descripcion: string, deficitMensual: number }>,
 *     extraMinimo: number | null,
 *   } | null,
 *   ahorroIntereses: number,
 *   ahorroMeses: number,
 * }}
 */
export function recomendarEstrategia(deudas, extraMensual = 0) {
  const vacia = {
    estrategia: null, razon: '', viable: true, diagnostico: null,
    ahorroIntereses: 0, ahorroMeses: 0,
  };
  if (!Array.isArray(deudas) || deudas.length < 2) return vacia;

  const comp = compararEstrategias(deudas, extraMensual);
  const avalanchaCompleta = comp.avalancha.completo;
  const bolaCompleta      = comp.bolaNieve.completo;

  // Caso 2: ningún plan cierra → inviable. Diagnóstico + pago extra mínimo.
  if (!avalanchaCompleta && !bolaCompleta) {
    return {
      estrategia: null,
      razon: '',
      viable: false,
      diagnostico: _diagnosticarInviabilidad(deudas),
      ahorroIntereses: 0,
      ahorroMeses: 0,
    };
  }

  // Caso 3: solo una estrategia logra terminar el plan.
  if (avalanchaCompleta && !bolaCompleta) {
    return {
      estrategia: 'avalancha',
      razon: 'Con tu pago actual, solo atacando primero la deuda más cara (Avalancha) logras terminar de pagar todo. Con Bola de nieve, la deuda de interés más alto seguiría creciendo.',
      viable: true, diagnostico: null,
      ahorroIntereses: comp.ahorroIntereses, ahorroMeses: comp.ahorroMeses,
    };
  }
  if (bolaCompleta && !avalanchaCompleta) {
    return {
      estrategia: 'bolaNieve',
      razon: 'Con tu pago actual, el orden Bola de nieve es el único que logra cerrar todas tus deudas. Liberar cuotas al cerrar las más chicas te da el flujo para terminar.',
      viable: true, diagnostico: null,
      ahorroIntereses: comp.ahorroIntereses, ahorroMeses: comp.ahorroMeses,
    };
  }

  // Caso 4: ambas completan. Decidir por ahorro real.
  const todasSinInteres = deudas.every(d => (d.tasaEA ?? 0) === 0);
  if (todasSinInteres) {
    return {
      estrategia: 'bolaNieve',
      razon: 'Tus deudas no cobran intereses, así que cerrar la más pequeña primero te da progreso visible sin perder dinero por elegir un orden u otro.',
      viable: true, diagnostico: null,
      ahorroIntereses: 0, ahorroMeses: 0,
    };
  }

  // D.11: si una sola deuda cobra intereses, la recomendación nombra ese hecho.
  const conInteres = deudas.filter(d => (d.tasaEA ?? 0) > 0);
  const unicaConInteres = conInteres.length === 1 ? conInteres[0] : null;

  const ahorroMaterial = comp.ahorroIntereses >= UMBRAL_AHORRO_MATERIAL || comp.ahorroMeses >= 1;
  if (comp.mejor === 'avalancha' && ahorroMaterial) {
    return {
      estrategia: 'avalancha',
      razon: unicaConInteres
        ? `"${unicaConInteres.descripcion}" es la única de tus deudas que cobra intereses. Pagarla primero no solo reduce ese costo: lo elimina, y el resto del plan avanza sin generar intereses.`
        : 'Atacar primero la deuda con la tasa más alta te ahorra más en intereses y/o te hace terminar antes. Mira el detalle para ver cuánto.',
      viable: true, diagnostico: null,
      ahorroIntereses: comp.ahorroIntereses, ahorroMeses: comp.ahorroMeses,
    };
  }

  // Bola de nieve ataca primero la de menor saldo (mismo orden que la simulación).
  const primeraBola = [...deudas].sort((a, b) => a.saldo - b.saldo)[0];
  const bolaEliminaInteres = unicaConInteres !== null && primeraBola?.id === unicaConInteres.id;

  return {
    estrategia: 'bolaNieve',
    razon: bolaEliminaInteres
      ? `Cerrar primero la deuda más chica te da impulso visible, y en tu caso esa ("${unicaConInteres.descripcion}") es además la única que cobra intereses: al liquidarla, el resto del plan deja de generar intereses.`
      : 'El ahorro por priorizar la deuda más cara es pequeño en tu caso, así que pesa más la motivación: cerrar primero la deuda más chica te da impulso visible para seguir.',
    viable: true, diagnostico: null,
    ahorroIntereses: comp.ahorroIntereses, ahorroMeses: comp.ahorroMeses,
  };
}

/**
 * Diagnostica por qué un plan de deudas no cierra: lista las deudas cuya cuota
 * no alcanza a cubrir su propio interés mensual (crecen mes a mes) y calcula el
 * pago extra mínimo que volvería viable el plan completo.
 *
 * @param {ReturnType<typeof filtrarDeudasPagables>} deudas
 * @returns {{
 *   deudasCrecientes: Array<{ id: string, descripcion: string, deficitMensual: number }>,
 *   extraMinimo: number | null,
 * }}
 */
function _diagnosticarInviabilidad(deudas) {
  const deudasCrecientes = deudas
    .map(d => {
      const tasaMensual    = _tasaMensualDesdeEA(d.tasaEA ?? 0);
      const interesMensual = d.saldo * tasaMensual;
      return {
        id:             d.id,
        descripcion:    d.descripcion,
        deficitMensual: interesMensual - (d.cuota || 0),
      };
    })
    .filter(x => x.deficitMensual > 0.01)
    .map(({ id, descripcion, deficitMensual }) => ({ id, descripcion, deficitMensual }));

  return {
    deudasCrecientes,
    extraMinimo: _calcularExtraMinimoViable(deudas),
  };
}

/**
 * Calcula el pago extra mensual mínimo (múltiplo de $10.000) que hace que el
 * plan complete bajo la estrategia Avalancha (la óptima en intereses).
 *
 * Cota superior segura: si el extra cubre todo el interés del primer mes
 * (cuando los saldos, y por tanto los intereses, son máximos), el saldo total
 * baja desde el inicio y el plan cierra. Sobre esa cota se hace búsqueda binaria.
 *
 * @param {ReturnType<typeof filtrarDeudasPagables>} deudas
 * @returns {number | null} Extra mínimo en COP, o null si no se pudo determinar.
 */
function _calcularExtraMinimoViable(deudas) {
  const PASO = 10_000;
  const interesPrimerMes = deudas.reduce(
    (acc, d) => acc + d.saldo * _tasaMensualDesdeEA(d.tasaEA ?? 0), 0);
  const sumaCuotas = deudas.reduce((acc, d) => acc + (d.cuota || 0), 0);

  // Extra que faltaría para cubrir el interés del primer mes, redondeado al
  // siguiente múltiplo de PASO (estrictamente por encima del punto de equilibrio
  // para garantizar que el saldo total baje y no se estanque).
  let hi = Math.ceil(Math.max(PASO, interesPrimerMes - sumaCuotas) / PASO) * PASO;

  // Seguridad: si la cota teórica no cerrara (no debería), ampliar una vez.
  if (!simularEstrategiaPago(deudas, hi, 'avalancha').completo) {
    hi *= 2;
    if (!simularEstrategiaPago(deudas, hi, 'avalancha').completo) return null;
  }

  // Búsqueda binaria del menor múltiplo de PASO en [0, hi] que completa el plan.
  let lo = 0;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / (2 * PASO)) * PASO;
    if (simularEstrategiaPago(deudas, mid, 'avalancha').completo) {
      hi = mid;
    } else {
      lo = mid + PASO;
    }
  }
  return lo;
}

/**
 * Reparte un pago extra mensual entre las cuotas de las deudas (D.9, ADR 011
 * rev. D.7). Es la traducción del "extra" what-if (un monto que la simulación
 * vuelca dinámicamente sobre la deuda prioritaria) a incrementos concretos de
 * `cuotaMensual` por deuda, que sí se pueden persistir y alimentan los pagos
 * programados y la distribución de ingreso.
 *
 * Criterio fijo (decidido con el usuario): **automático, siempre conviene**.
 * No se le pregunta al usuario a qué deuda aplicarlo: una elección manual mal
 * hecha pierde la intención de Finko. El reparto:
 *
 *   1. **Frena el crecimiento primero.** Cubre el déficit mensual
 *      (`interesMensual - cuota`) de las deudas que crecen, empezando por las
 *      que más rápido crecen, hasta agotar el extra. Cada peso aquí evita que
 *      una deuda siga subiendo.
 *   2. **El remanente, a la deuda de mayor tasa** (criterio Avalancha): donde
 *      cada peso adicional ahorra más intereses.
 *
 * Función pura: no muta `deudas` ni `S`. El handler que aplica escribe las
 * `cuotaNueva` resultantes sobre cada deuda con confirmación.
 *
 * Limitación v1: `cuotaMensual` es estático y no replica el "volcado" dinámico
 * de la simulación (cuando una deuda cierra, su cuota liberada no se reasigna
 * sola). Si el extra no alcanza a cubrir todos los déficits, algunas deudas
 * crecen más lento pero no se frenan del todo; el usuario puede re-aplicar.
 *
 * @param {ReturnType<typeof filtrarDeudasPagables>} deudas
 * @param {number} extra  Pago extra mensual total a repartir (COP, > 0).
 * @returns {{
 *   incrementos: Array<{ id: string, descripcion: string, cuotaActual: number, incremento: number, cuotaNueva: number }>,
 *   totalRepartido: number,
 * }}  incrementos solo incluye las deudas cuya cuota cambia (incremento >= 1).
 */
export function repartirExtraEnCuotas(deudas, extra) {
  const monto = Number(extra);
  if (!Array.isArray(deudas) || deudas.length === 0 || !(monto > 0)) {
    return { incrementos: [], totalRepartido: 0 };
  }

  const trabajo = deudas.map(d => {
    const tasaEA         = Number(d.tasaEA) || 0;
    const cuotaActual    = Number(d.cuota)  || 0;
    const interesMensual = (Number(d.saldo) || 0) * _tasaMensualDesdeEA(tasaEA);
    return {
      id:          d.id,
      descripcion: d.descripcion,
      tasaEA,
      cuotaActual,
      deficit:     interesMensual - cuotaActual,
      incremento:  0,
    };
  });

  let restante = monto;

  // 1. Cubrir el déficit de las que más rápido crecen, hasta agotar el extra.
  const crecientes = trabajo
    .filter(t => t.deficit > 0.01)
    .sort((a, b) => b.deficit - a.deficit);
  for (const t of crecientes) {
    if (restante <= 0.01) break;
    const asignar = Math.min(restante, t.deficit);
    t.incremento += asignar;
    restante     -= asignar;
  }

  // 2. El remanente, a la deuda de mayor tasa (Avalancha).
  if (restante > 0.01) {
    const prioritaria = trabajo.reduce(
      (mejor, t) => (t.tasaEA > mejor.tasaEA ? t : mejor), trabajo[0]);
    prioritaria.incremento += restante;
    restante = 0;
  }

  const incrementos = trabajo
    .map(t => {
      const incremento = Math.round(t.incremento);
      return {
        id:          t.id,
        descripcion: t.descripcion,
        cuotaActual: t.cuotaActual,
        incremento,
        cuotaNueva:  t.cuotaActual + incremento,
      };
    })
    .filter(t => t.incremento > 0);

  return {
    incrementos,
    totalRepartido: incrementos.reduce((a, t) => a + t.incremento, 0),
  };
}

// ── RECOMENDACIÓN DE PALANCA (D.15d) ─────────────────────────────

/**
 * Umbral de tasa efectiva anual a partir del cual una deuda se considera "cara"
 * para la recomendación de palanca. Es una heurística de producto, NO una
 * constante legal: la tasa de usura se eliminó del proyecto a propósito (ADR 004)
 * por su costo de mantenimiento. 25% EA separa con holgura la deuda bancaria de
 * consumo típica de la deuda claramente costosa (tarjetas al límite, crédito
 * informal) donde renegociar o consolidar rinde de verdad.
 */
const TASA_ALTA_EA = 0.25;

/**
 * Margen libre mensual mínimo (COP) para recomendar "Aumentar la cuota" como
 * palanca principal. Por debajo, sugerir pagar más sería sordo a la realidad:
 * no hay dinero que sumar. 20.000 ≈ dos "pasos" del reparto
 * (`repartirExtraEnCuotas` usa incrementos de 10.000): lo mínimo para que
 * aumentar haga algo concreto.
 */
const UMBRAL_CAPACIDAD_MINIMA = 20_000;

/**
 * Motor de recomendación de PALANCA (D.15d): qué ACCIÓN tomar sobre el plan de
 * deudas (Aumentar la cuota / Renegociar la tasa / Consolidar), ortogonal al
 * motor de ORDEN (`recomendarEstrategia`, Avalancha/Bola de nieve). Las 3
 * palancas ya existen como simulaciones; este motor decide cuál es la principal
 * según la situación y en qué orden de relevancia mostrarlas (pesos visuales
 * distintos, no 3 botones iguales).
 *
 * Función pura: NO lee S ni importa tesorería. Recibe la capacidad de pago como
 * parámetros; la vista los calcula (ingreso vía
 * `infra/financiero.estimarSalarioMensual`, fijos vía la suma de compromisos
 * tipo 'fijo').
 *
 * Capacidad = margen libre real = `ingresoMensual - fijosMensuales - Σ cuotas de
 * deuda`. Es el dinero realmente disponible para más pago, no el ingreso bruto.
 * `fijosMensuales` NO incluye las cuotas de deuda (se restan aparte vía `deudas`):
 * el llamador pasa solo los compromisos tipo 'fijo'.
 *
 * Decisión de la principal (honesta con la situación):
 *  - Con margen libre (`capacidad ≥ UMBRAL`) → Aumentar: la vía más simple y
 *    barata (sin negociar, sin crédito nuevo) de salir antes.
 *  - Sin margen + ≥ 2 deudas caras → Consolidar: unificar a menor tasa baja el
 *    costo sin exigir más flujo mensual.
 *  - Sin margen + 1 deuda cara → Renegociar: bajar esa tasa sin más flujo.
 *  - Sin margen + sin tasas altas → Aumentar (cuando se libere margen):
 *    renegociar/consolidar no ayudan a una deuda barata o al 0%; la única palanca
 *    real ahí es sumar a la cuota.
 *
 * @param {ReturnType<typeof filtrarDeudasPagables>} deudas
 * @param {{ ingresoMensual?: number, fijosMensuales?: number }} [contexto]
 * @returns {{
 *   principal: 'aumentar' | 'renegociar' | 'consolidar' | null,
 *   orden: Array<'aumentar' | 'renegociar' | 'consolidar'>,
 *   capacidad: number,
 *   tieneCapacidad: boolean,
 *   razon: string,
 * }}
 */
export function recomendarPalanca(deudas, contexto = {}) {
  const lista = Array.isArray(deudas) ? deudas : [];
  if (lista.length === 0) {
    return { principal: null, orden: [], capacidad: 0, tieneCapacidad: false, razon: '' };
  }

  const ingresoMensual = Number(contexto.ingresoMensual) || 0;
  const fijosMensuales = Number(contexto.fijosMensuales) || 0;
  const sumaCuotas     = lista.reduce((acc, d) => acc + (Number(d.cuota) || 0), 0);
  const capacidad      = ingresoMensual - fijosMensuales - sumaCuotas;
  const tieneCapacidad = capacidad >= UMBRAL_CAPACIDAD_MINIMA;

  const costosas       = lista.filter(d => (Number(d.tasaEA) || 0) >= TASA_ALTA_EA);
  const hayTasaAlta    = costosas.length >= 1;
  const variasCostosas = costosas.length >= 2;

  // Disponibilidad de cada palanca (misma regla que ofrece la vista):
  //  - aumentar: siempre (hay al menos una deuda con cuota que subir).
  //  - renegociar: exige al menos una deuda con tasa > 0 (no se negocia el 0%).
  //  - consolidar: exige >= 2 deudas (no se consolida una sola).
  const disponibles = {
    aumentar:   true,
    renegociar: lista.some(d => (Number(d.tasaEA) || 0) > 0),
    consolidar: lista.length >= 2,
  };

  const orden = _ordenarPalancas({ tieneCapacidad, hayTasaAlta, variasCostosas })
    .filter(id => disponibles[id]);
  const principal = orden[0] ?? 'aumentar';

  return {
    principal,
    orden,
    capacidad,
    tieneCapacidad,
    razon: _razonPalanca(principal, tieneCapacidad),
  };
}

/**
 * Orden de relevancia de las 3 palancas según la situación (principal primero).
 * Devuelve siempre las 3; el llamador filtra las no disponibles. Declarativo a
 * propósito: la decisión financiera debe leerse de un vistazo y ser determinista.
 *
 * @param {{ tieneCapacidad: boolean, hayTasaAlta: boolean, variasCostosas: boolean }} sit
 * @returns {Array<'aumentar' | 'renegociar' | 'consolidar'>}
 */
function _ordenarPalancas({ tieneCapacidad, hayTasaAlta, variasCostosas }) {
  if (tieneCapacidad) {
    if (variasCostosas) return ['aumentar', 'consolidar', 'renegociar'];
    if (hayTasaAlta)    return ['aumentar', 'renegociar', 'consolidar'];
    return ['aumentar', 'consolidar', 'renegociar'];
  }
  if (variasCostosas) return ['consolidar', 'renegociar', 'aumentar'];
  if (hayTasaAlta)    return ['renegociar', 'consolidar', 'aumentar'];
  return ['aumentar', 'consolidar', 'renegociar'];
}

/**
 * Explicación de por qué la palanca principal, en tono cercano (ADR 003/008).
 * `tieneCapacidad` desambigua los dos casos en que la principal es 'aumentar'
 * (con margen real vs. sin tasas altas que renegociar).
 *
 * @param {'aumentar' | 'renegociar' | 'consolidar'} principal
 * @param {boolean} tieneCapacidad
 * @returns {string}
 */
function _razonPalanca(principal, tieneCapacidad) {
  if (principal === 'aumentar' && tieneCapacidad) {
    return 'Después de cubrir tus gastos fijos y las cuotas de tus deudas, todavía te queda dinero libre cada mes. Súmalo a tus cuotas: es la forma más simple y barata de salir de deudas antes, sin pedir nada nuevo.';
  }
  if (principal === 'consolidar') {
    return 'Tienes varias deudas con tasas altas y tu presupuesto ya está ajustado. Unirlas en un solo crédito de menor tasa puede bajar lo que pagas en intereses y dejarte una sola cuota, sin exigirte más dinero cada mes.';
  }
  if (principal === 'renegociar') {
    return 'Tu presupuesto ya está ajustado, pero una de tus deudas cobra una tasa alta. Negociar una tasa más baja reduce lo que pagas en intereses sin pedirte más dinero cada mes.';
  }
  // 'aumentar' sin capacidad: sin tasas altas que renegociar o consolidar.
  return 'Tus deudas no cobran tasas altas que valga la pena renegociar, así que la vía para salir antes es aumentar la cuota. Cuando liberes algo de margen en tu presupuesto, súmalo aquí.';
}
