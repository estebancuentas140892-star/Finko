/**
 * compromisos/logic/motor-deudas.js - el motor de recomendaciones de deudas
 * (GAS.14e, [ADR 189](../../../../docs/DECISIONS/189-revision-tecnica-de-gastos-y-motor-de-deudas.md) D5).
 *
 * Un solo análisis decide y explica: qué se sabe y qué falta de cada deuda,
 * qué escenarios se pueden calcular, cuál se recomienda y por qué, qué pasa
 * (estimado) y qué alternativas valen la pena. Las simulaciones son las de
 * `estrategia.js`; este módulo decide cuáles correr y qué decir.
 *
 * Reglas de la capa: pura, sin DOM y sin S. Lo desconocido no se inventa:
 * una deuda con entidad sin tasa no entra a comparar y se lista en
 * `faltantes`; una deuda sin cuota tampoco se simula.
 */

import { f } from '../../../infra/utils.js';
import { compromisosActivos, esDeuda, tasaEADe } from './modelo.js';
import { simularPagoDeuda, simularEstrategiaPago, compararEstrategias } from './estrategia.js';

/** Una deuda es cara desde 25 % EA (la misma heurística de `recomendarPalanca`). */
export const TASA_CARA_EA = 0.25;
/** Lo mínimo libre al mes para proponer pagar más (como `recomendarPalanca`). */
export const CAPACIDAD_MINIMA = 20_000;
/** Lo que Avalancha debe ahorrar para preferirla (como `recomendarEstrategia`). */
export const AHORRO_MATERIAL = 50_000;
/** El extra mínimo se redondea a este paso. */
const PASO = 10_000;

/** Los supuestos de toda simulación (ADR 189 D5, regla 10). */
export const SUPUESTOS_MOTOR = Object.freeze([
  'La tasa de cada deuda no cambia.',
  'Pagas cada cuota completa y a tiempo.',
  'No haces compras nuevas con la tarjeta.',
  'No se suman seguros ni comisiones que Finko no conoce.',
]);

const _tasaMensual = (tasaEA) => (tasaEA > 0 ? Math.pow(1 + tasaEA, 1 / 12) - 1 : 0);
const _meses = (n) => `${n} ${n === 1 ? 'mes' : 'meses'}`;
const _lista = (nombres) => (nombres.length <= 1 ? nombres.join('')
  : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`);

/** 'YYYY-MM' de sumar `meses` al mes de `hoyISO`, o null. */
export function mesMas(hoyISO, meses) {
  const m = /^(\d{4})-(\d{2})/.exec(String(hoyISO ?? ''));
  if (!m || !Number.isFinite(meses)) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1 + meses, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Lo que se sabe de cada deuda activa con saldo (regla 1).
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 */
export function inventarioDeudas(compromisos) {
  return compromisosActivos(compromisos ?? [])
    .filter(c => esDeuda(c.tipo) && (Number(c.saldoTotal) || 0) > 0)
    .map((c) => {
      const saldo = Number(c.saldoTotal) || 0;
      const cuota = Number(c.cuotaMensual) || 0;
      // Con entidad, sin tasa es desconocida. La personal en blanco se guarda
      // como "no cobra interés" (lo dice su pregunta), así que es 0 %.
      const tasaConocida = !(c.tipo === 'deuda-entidad' && (c.tasa === null || c.tasa === undefined || c.tasa === ''));
      const tasaEA = tasaConocida ? tasaEADe(c) : null;
      const interesMes = tasaEA ? saldo * _tasaMensual(tasaEA) : 0;
      return {
        id: c.id,
        descripcion: c.descripcion ?? '',
        tipo: c.tipo,
        saldo,
        cuota,
        tasaEA,
        tasaUnidad: c.tasaUnidad === 'mensual' ? 'mensual' : 'EA',
        tasaConocida,
        sinCuota: !(cuota > 0),
        sinInteres: tasaConocida && !(tasaEA > 0),
        cara: tasaConocida && tasaEA >= TASA_CARA_EA,
        crece: tasaConocida && cuota > 0 && cuota <= interesMes,
        deficitMes: tasaConocida && cuota > 0 ? Math.max(0, interesMes - cuota) : 0,
        interesMes: Math.round(interesMes),
      };
    });
}

/**
 * Las deudas que se pueden simular (regla 2): con tasa conocida y con cuota.
 * Tienen la forma de `filtrarDeudasPagables`, para las simulaciones y las
 * herramientas de la hoja.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 */
export function deudasSimulables(compromisos) {
  return inventarioDeudas(compromisos).filter(d => d.tasaConocida && !d.sinCuota);
}

/**
 * Lo que queda libre al mes para las deudas (regla 9): ingresos menos fijos,
 * cuotas y el promedio del día a día. Sin ingresos, desconocida (no negativa).
 * Sin promedio del día a día (`null`: ningún mes cerrado con gastos), también
 * desconocida: restar 0 la inflaría.
 *
 * @param {{ ingresoMensual?: number|null, fijosMensuales?: number, cuotas?: number, diaADia?: number|null }} d
 * @returns {{ valor: number|null, conocida: boolean }}
 */
export function capacidadDePago({ ingresoMensual = null, fijosMensuales = 0, cuotas = 0, diaADia = null } = {}) {
  if (!(Number(ingresoMensual) > 0) || diaADia === null || diaADia === undefined) return { valor: null, conocida: false };
  const valor = Number(ingresoMensual) - (Number(fijosMensuales) || 0) - (Number(cuotas) || 0) - (Number(diaADia) || 0);
  return { valor: Math.round(valor), conocida: true };
}

/**
 * Lo mínimo al mes, en pasos de 10.000, para que lo que crece deje de crecer:
 * un poco más que la suma de lo que le falta a cada cuota para cubrir su
 * interés del mes. 0 si nada crece.
 *
 * @param {ReturnType<typeof inventarioDeudas>} deudas
 */
export function extraParaFrenar(deudas) {
  const crecen = (deudas ?? []).filter(d => d.crece);
  if (crecen.length === 0) return 0;
  const deficit = crecen.reduce((a, d) => a + d.deficitMes, 0);
  return (Math.floor(deficit / PASO) + 1) * PASO;
}

/**
 * Sin cambiar nada: cada deuda con su cuota; lo que se libera no se mueve.
 * @param {ReturnType<typeof deudasSimulables>} deudas
 */
function _escenarioBase(deudas) {
  let meses = 0;
  let intereses = 0;
  let completo = true;
  for (const d of deudas) {
    const r = simularPagoDeuda(d.saldo, d.tasaEA ?? 0, d.cuota);
    meses = Math.max(meses, r.meses);
    intereses += r.intereses;
    completo = completo && r.completo;
  }
  return { meses, intereses: Math.round(intereses), completo };
}

/**
 * Un abono único a capital (regla 5), en sus dos formas: *reducir plazo*
 * (misma cuota, menos meses) y *reducir cuota* (mismo plazo, cuota nueva).
 * La entidad decide cuál ofrece. null si no hay cuota, si el abono salda la
 * deuda o si con la cuota de hoy la deuda no se termina.
 *
 * @param {{ saldo:number, tasaEA:number|null, cuota:number }} deuda
 * @param {number} monto
 * @returns {null | { plazo: { mesesMenos:number, interesesMenos:number }, cuota: { cuotaNueva:number, interesesMenos:number } }}
 */
export function efectoAbonoUnico(deuda, monto) {
  const m = Number(monto) || 0;
  const tasa = Number(deuda?.tasaEA) || 0;
  if (!deuda || !(m > 0) || !(deuda.cuota > 0) || m >= deuda.saldo) return null;
  const hoy = simularPagoDeuda(deuda.saldo, tasa, deuda.cuota);
  if (!hoy.completo) return null;
  const resto = deuda.saldo - m;
  const plazo = simularPagoDeuda(resto, tasa, deuda.cuota);
  // Mismo plazo: la cuota que paga `resto` en los meses que faltaban.
  const r = _tasaMensual(tasa);
  const n = hoy.meses;
  const cuotaNueva = r > 0 ? resto * r / (1 - Math.pow(1 + r, -n)) : resto / n;
  const conCuota = simularPagoDeuda(resto, tasa, cuotaNueva);
  return {
    plazo: { mesesMenos: hoy.meses - plazo.meses, interesesMenos: Math.max(0, hoy.intereses - plazo.intereses) },
    cuota: { cuotaNueva: Math.ceil(cuotaNueva), interesesMenos: Math.max(0, hoy.intereses - conCuota.intereses) },
  };
}

/**
 * Las deudas que se pueden unir en un crédito nuevo (regla 6): con tasa
 * conocida mayor que 0 y con cuota. Una personal sin interés nunca: no es un
 * crédito y unirla solo le pondría intereses (regla 8); una personal con
 * interés (un gota a gota) sí, porque pagarla con un crédito más barato es
 * justo el caso que conviene. La comparación la hace `simularConsolidacion`,
 * con los costos del crédito nuevo si se conocen.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 */
export function deudasUnibles(compromisos) {
  return deudasSimulables(compromisos).filter(d => d.tasaEA > 0);
}

/** Las consecuencias de un escenario frente a no cambiar nada. */
function _consecuencias(e, base) {
  const comparable = e.completo && base.completo;
  return {
    meses: e.meses,
    completo: e.completo,
    mesSalida: e.mesSalida,
    intereses: e.intereses,
    ahorroIntereses: comparable ? Math.max(0, base.intereses - e.intereses) : null,
    ahorroMeses: comparable ? Math.max(0, base.meses - e.meses) : null,
    // Calculado con tus datos; la fecha de salida es estimada (regla 10).
    calidad: 'calculado',
  };
}

const _ordenDe = (r) => [...r.orden].sort((a, b) => (a.mesPagado ?? 1e9) - (b.mesPagado ?? 1e9));

/**
 * El análisis completo (ADR 189 D5). `extra` es lo que el usuario escribió en
 * la hoja (0 si nada); `ingresoMensual`, `fijosMensuales` y `diaADia` dan la
 * capacidad (regla 9).
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @param {{ hoyISO: string, extra?: number, ingresoMensual?: number|null, fijosMensuales?: number, diaADia?: number|null }} contexto
 */
export function analizarDeudas(compromisos, { hoyISO, extra = 0, ingresoMensual = null, fijosMensuales = 0, diaADia = null } = {}) {
  const inventario = inventarioDeudas(compromisos);
  const vacio = { inventario, faltantes: [], simulables: [], capacidad: { valor: null, conocida: false },
    escenarios: null, principal: null, alternativas: [], supuestos: [], resumen: '' };
  if (inventario.length === 0) return { estado: 'sin-deudas', ...vacio };

  // Regla 2: lo que falta, sin inventarlo.
  const faltantes = [];
  for (const d of inventario) {
    if (!d.tasaConocida) faltantes.push({ id: d.id, dato: 'tasa', texto: `la tasa de ${d.descripcion}` });
    if (d.sinCuota) {
      faltantes.push({ id: d.id, dato: 'cuota',
        texto: d.tipo === 'deuda-personal' ? `cuánto y cuándo le pagas a ${d.descripcion}` : `la cuota de ${d.descripcion}` });
    }
  }
  const simulables = inventario.filter(d => d.tasaConocida && !d.sinCuota);
  const fuera = inventario.filter(d => !(d.tasaConocida && !d.sinCuota));
  const notaFuera = fuera.length
    ? `${_lista(fuera.map(d => d.descripcion))} no ${fuera.length === 1 ? 'entra' : 'entran'} en las cuentas: falta ${_lista(faltantes.map(x => x.texto))}.`
    : null;
  const capacidad = capacidadDePago({ ingresoMensual, fijosMensuales, cuotas: inventario.reduce((a, d) => a + d.cuota, 0), diaADia });
  const ex = Number(extra) > 0 ? Number(extra) : 0;
  const supuestos = [...SUPUESTOS_MOTOR];
  const alternativas = [];

  // Regla 8: una deuda personal sin cuota se acuerda, no se simula.
  const sinAcuerdo = inventario.filter(d => d.sinCuota && d.tipo === 'deuda-personal');
  if (sinAcuerdo.length) {
    alternativas.push({ id: 'acordar-cuota', titulo: 'Acordar una cuota',
      texto: `Con ${_lista(sinAcuerdo.map(d => d.descripcion))} no hay cuota fija. Acordar cuánto y cuándo pagas la mete en el plan.`,
      calidad: 'sugerencia' });
  }

  // Sin dos deudas con datos completos (y alguna sin ellos) no hay qué
  // comparar: lo primero es completar lo que falta.
  if (simulables.length === 0 || (simulables.length === 1 && fuera.length > 0)) {
    return { ...vacio, estado: 'analisis', faltantes, simulables, capacidad, alternativas, supuestos,
      principal: { id: 'completar-datos', titulo: 'Completa los datos de tus deudas',
        porque: [`Para comparar formas de pagar falta ${_lista(faltantes.map(x => x.texto))}.`],
        consecuencias: null, orden: [], extraMinimo: null },
      resumen: 'Falta información para recomendarte un plan.' };
  }

  // Regla 3: los escenarios.
  const conFecha = (r) => ({ meses: r.meses, completo: r.completo,
    // Sin terminar, los intereses de 50 años no dicen nada: null.
    intereses: r.completo ? Math.round(r.interesesTotales ?? r.intereses ?? 0) : null,
    mesSalida: r.completo ? mesMas(hoyISO, r.meses) : null });
  const comp = compararEstrategias(simulables, ex);
  const escenarios = {
    base: conFecha(_escenarioBase(simulables)),
    avalancha: conFecha(comp.avalancha),
    bolaNieve: conFecha(comp.bolaNieve),
  };

  // Regla 4: la recomendación principal.
  let principal;
  const crecen = simulables.filter(d => d.crece);
  const minimo = extraParaFrenar(simulables);
  if (crecen.length && ex < minimo) {
    // 4a. Detener lo que crece.
    const alcanza = capacidad.conocida && capacidad.valor >= minimo;
    const quien = crecen.every(d => d.tipo === 'deuda-personal') ? 'quien te prestó' : 'la entidad';
    const nombres = _lista(crecen.map(d => d.descripcion));
    principal = {
      id: 'detener-crecimiento',
      titulo: capacidad.conocida && !alcanza ? `Habla con ${quien}` : `Paga ${f(minimo)} más al mes`,
      porque: [
        `${nombres} ${crecen.length === 1 ? 'crece' : 'crecen'}: la cuota no alcanza a cubrir los intereses del mes, así que lo que debes sube.`,
        capacidad.conocida && !alcanza
          ? `Para frenarlo hacen falta ${f(minimo)} más al mes y con lo que te queda libre no alcanza (estimado). Pedir una tasa más baja o una cuota distinta es el camino; ${quien} decide si lo acepta.`
          : `Con ${f(minimo)} más al mes repartidos en ${crecen.length === 1 ? 'su cuota, deja' : 'esas cuotas, dejan'} de crecer.${alcanza ? ' Con lo que te queda libre te alcanza (estimado).' : ''}`,
        ...(notaFuera ? [notaFuera] : []),
      ],
      consecuencias: null,
      orden: [],
      extraMinimo: minimo,
    };
    alternativas.push({ id: 'renegociar', titulo: 'Renegociar',
      texto: `Pide a ${quien} una tasa más baja o una cuota distinta. Finko no puede asegurar que lo acepte.`, calidad: 'sugerencia' });
  } else if (simulables.every(d => d.sinInteres)) {
    // 4b. Sin intereses, el orden no cambia el costo.
    principal = { id: 'bolaNieve', titulo: simulables.length > 1 ? 'Empieza por la más pequeña' : `Sigue con la cuota de ${simulables[0].descripcion}`,
      porque: [
        simulables.length > 1
          ? 'Ninguna cobra interés: el orden no cambia lo que pagas. Terminar primero la más pequeña te libera su cuota antes.'
          : 'No cobra interés: lo que cambia el resultado es pagar más.',
        ...(notaFuera ? [notaFuera] : []),
      ],
      consecuencias: _consecuencias(escenarios.bolaNieve, escenarios.base),
      orden: _ordenDe(comp.bolaNieve), extraMinimo: null };
  } else if (simulables.length >= 2) {
    // 4c. Avalancha si ahorra de verdad; si no, Bola de nieve.
    const a = escenarios.avalancha;
    const b = escenarios.bolaNieve;
    const ahorro = b.intereses - a.intereses;
    const mesesAntes = b.meses - a.meses;
    const avalancha = a.completo && (!b.completo || ahorro >= AHORRO_MATERIAL || mesesAntes >= 1);
    const id = avalancha ? 'avalancha' : 'bolaNieve';
    const orden = _ordenDe(comp[id]);
    // La que recibe primero lo que sobra (no la que se termina primero).
    const primera = [...simulables].sort(avalancha ? (x, y) => y.tasaEA - x.tasaEA : (x, y) => x.saldo - y.saldo)[0]?.descripcion ?? '';
    let razon;
    if (!avalancha) {
      razon = `Entre los dos órdenes la diferencia en intereses es pequeña (${f(Math.abs(ahorro))}). Terminar primero ${primera} te libera su cuota antes.`;
    } else if (!b.completo) {
      razon = `Lo que te sobre va primero a ${primera}. Empezando por la más pequeña no alcanzas a terminar.`;
    } else {
      razon = `Lo que te sobre va primero a ${primera}. Frente a empezar por la más pequeña pagas ${f(Math.max(0, ahorro))} menos en intereses${mesesAntes > 0 ? ` y terminas ${_meses(mesesAntes)} antes` : ''}.`;
    }
    principal = {
      id,
      titulo: avalancha ? 'Empieza por la que más interés cobra' : 'Empieza por la más pequeña',
      porque: [razon, ...(notaFuera ? [notaFuera] : [])],
      consecuencias: _consecuencias(escenarios[id], escenarios.base),
      orden,
      extraMinimo: null,
    };
    const otra = avalancha ? 'bolaNieve' : 'avalancha';
    if (escenarios[otra].completo) {
      alternativas.push({ id: otra,
        titulo: avalancha ? 'Empezar por la más pequeña' : 'Empezar por la que más interés cobra',
        texto: `Terminas en ${_meses(escenarios[otra].meses)} y pagas ${f(escenarios[otra].intereses)} en intereses.`,
        calidad: 'calculado' });
    }
  } else {
    // 4d. Una sola deuda: seguir con la cuota.
    const d = simulables[0];
    principal = { id: 'cuota-actual', titulo: `Sigue con la cuota de ${d.descripcion}`,
      porque: ['Con una sola deuda no hay orden que elegir: lo que cambia el resultado es pagar más.', ...(notaFuera ? [notaFuera] : [])],
      consecuencias: _consecuencias(escenarios.avalancha, escenarios.base),
      orden: _ordenDe(comp.avalancha), extraMinimo: null };
  }

  // Regla 5: con lo que queda libre, el efecto de sumarlo cada mes.
  if (principal.id !== 'detener-crecimiento' && ex === 0 && capacidad.conocida && capacidad.valor >= CAPACIDAD_MINIMA) {
    const est = principal.id === 'bolaNieve' ? 'bolaNieve' : 'avalancha';
    const con = simularEstrategiaPago(simulables, capacidad.valor, est);
    const sin = escenarios[est];
    if (con.completo && sin.completo && con.meses < sin.meses) {
      const menos = Math.max(0, sin.intereses - Math.round(con.interesesTotales));
      alternativas.unshift({ id: 'abono-extra', titulo: 'Pagar más cada mes', extra: capacidad.valor,
        texto: `Si sumas lo que te queda libre (${f(capacidad.valor)} al mes), terminas en ${_meses(con.meses)} en vez de ${_meses(sin.meses)}${menos > 0 ? ` y pagas ${f(menos)} menos en intereses` : ''}.`,
        calidad: 'estimado' });
    }
  }
  // Regla 7: renegociar también cuando las cuotas no caben.
  if (capacidad.conocida && capacidad.valor < 0 && !alternativas.some(x => x.id === 'renegociar')) {
    alternativas.push({ id: 'renegociar', titulo: 'Renegociar',
      texto: 'Tus cuotas pasan de lo que te queda cada mes (estimado). Pide a la entidad un plazo o una tasa distinta; Finko no puede asegurar que la acepte.',
      calidad: 'sugerencia' });
  }
  // Regla 6: unir solo se evalúa con una oferta; se sugiere pedirla con dos o
  // más deudas con entidad y alguna cara.
  const unibles = deudasUnibles(compromisos);
  if (unibles.length >= 2 && unibles.some(d => d.cara)) {
    alternativas.push({ id: 'consolidar', titulo: 'Unir tus deudas con un crédito nuevo',
      texto: 'Si te ofrecen uno, escribe su tasa, su cuota y sus costos: Finko lo recomienda solo si en total pagas menos, no solo porque baje la cuota.',
      calidad: 'sugerencia' });
  }

  const c = principal.consecuencias;
  let resumen = principal.titulo;
  if (c?.completo) {
    resumen = fuera.length
      ? `${principal.titulo}. Sin contar ${_lista(fuera.map(d => d.descripcion))}, sales en ${_meses(c.meses)} (estimado).`
      : `${principal.titulo}: sales de deudas en ${_meses(c.meses)} (estimado).`;
  }
  else if (principal.id === 'detener-crecimiento') {
    resumen = `${_lista(crecen.map(d => d.descripcion))} ${crecen.length === 1 ? 'crece' : 'crecen'} cada mes. Mira cómo frenarlo.`;
  }
  // SIT.1b (ADR 202 D6): los nombres de lo que crece, para que el aviso los
  // liste en vez de meterlos en un párrafo.
  const queCrecen = principal.id === 'detener-crecimiento' && !c?.completo ? crecen.map(d => d.descripcion) : [];
  return { estado: 'analisis', inventario, faltantes, simulables, capacidad, escenarios, principal, alternativas, supuestos, resumen, crecen: queCrecen };
}
