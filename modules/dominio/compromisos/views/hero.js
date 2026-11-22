/**
 * compromisos/views/hero.js - hero de "Por pagar": lo que te falta pagar este
 * mes (REV.2a, ADR 140, que ajusta el ADR 036 D1) y, debajo, lo que debes en
 * total cuando hay deudas.
 *
 * Tercer consumidor del estreno parcial del ADR 033 (degradado de identidad +
 * sombra en reposo), espejo de renderHeroTesoreria() (MC.18a). Reglas de la capa:
 * - Puede leer S. No puede mutarlo.
 * - Sin lógica de negocio: la cifra grande sale de `faltaPorPagarDelMes()`
 *   (el mismo reparto que pinta la lista) y la de abajo, de `resumenDeudas()`.
 */

import { S } from '../../../core/state.js';
import { f, fechaLocalISO } from '../../../infra/utils.js';
import { SALDO_MASCARA } from '../../../infra/render.js';
import { resumenDeudas, compromisosActivos, esDeuda, calcularCompromisoMensual, calcularAbonosDelMes } from '../logic.js';
import { faltaPorPagarDelMes, filtroDeLente, resumenFijosDelMes } from './lista.js';
import { montosOcultos, ojoDePorPagar } from '../../../infra/privacidad.js';
import { htmlMesDelRotulo, prefijoMesBloque } from '../../../infra/mes-bloque.js';

/**
 * GAS.7b (ADR 179 D2): el rótulo de la tarjeta según la pestaña, con el mes
 * como su última palabra (un botón en el teléfono).
 *
 * @param {'fijo'|'deuda'|null} lente
 * @param {boolean} esActual
 */
function _rotulo(lente, esActual) {
  const mes = htmlMesDelRotulo();
  if (lente === 'deuda') return esActual ? `Cuotas por pagar en ${mes}` : `Cuotas sin pagar en ${mes}`;
  if (lente === 'fijo') return esActual ? `Te falta pagar en ${mes}` : `Quedó sin pagar en ${mes}`;
  return esActual ? `Te falta pagar en ${mes}` : `Sin pagar en ${mes}`;
}

/**
 * Renderiza el hero en `#compromisos-hero`.
 * No-op si el contenedor no existe (sección no montada).
 *
 * - Cifra protagonista: lo vencido más lo que falta del mes, fijos y cuotas
 *   (ADR 140 D1). Con solo un arriendo ya dice algo; antes decía "No tienes
 *   deudas registradas" y $0 sobre una lista con un pago pendiente.
 * - Debajo, solo con deudas: "Lo que debes en total" con el saldo y el conteo
 *   (ADR 036 D1 y FD7). La cuota/mes sale: ya está dentro de la cifra grande.
 * - Enmascarado con `SALDO_MASCARA` cuando `S.config.ocultarSaldo` es true
 *   (mismo flag que el ojo de Inicio y Mis cuentas: un solo control, IN.2).
 * - Ojo de privacidad anclado a la esquina (posición estable, solo cambia el
 *   contenido). Sin pagos registrados no se pinta: no hay nada que enmascarar.
 */
export function renderHeroCompromisos() {
  const el = document.getElementById('compromisos-hero');
  if (!el) return;

  const falta = faltaPorPagarDelMes();
  const { saldoTotal, cantidad, saldadas } = resumenDeudas(S.compromisos);
  const oculto = montosOcultos(ojoDePorPagar());
  const m = (n) => (oculto ? SALDO_MASCARA : f(n));
  const lente0 = filtroDeLente();

  // ADR 179 D4 y D5: una pestaña sin nada de su tipo no lleva tarjeta; su
  // vacío ya dice qué hacer.
  if (lente0 && !falta.hayPagos) {
    el.innerHTML = '';
    return;
  }

  const lente = filtroDeLente();
  // GAS.8e (ADR 182 D5): Deudas es el inventario; su tarjeta dice lo que
  // debes en total, no las cuotas del mes.
  if (lente === 'deuda') {
    el.innerHTML = htmlHeroDeudas(S.compromisos, oculto);
    return;
  }
  const label = !falta.hayPagos ? 'No tienes pagos registrados'
              : _rotulo(lente, falta.esActual);
  const totalTxt = falta.hayPagos ? m(falta.total) : f(0);

  const ojoHtml = !falta.hayPagos ? '' : _htmlOjo(oculto);

  // "Lo que debes en total" es otra pregunta (el saldo, no el mes): va abajo y
  // con su nombre, distinto del "suman" del pie de Inicio (ADR 140 D2).
  const chipHtml = saldoTotal > 0
    ? `<span class="hero-compromisos__chip">Lo que debes en total: ${m(saldoTotal)}</span>`
    : '';
  // ADR 179 D1: en la pestaña Fijos no se habla de deudas; desde GAS.8d
  // (ADR 182 D4), tampoco en Por pagar: lo que debes es la pestaña de al lado.
  const metaHtml = cantidad === 0 || lente === 'fijo' ? '' : `
      <div class="hero-compromisos__meta">
        ${chipHtml}
        <span class="hero-compromisos__meta-txt">${_conteoTxt(cantidad, saldadas)}</span>
      </div>`;

  // GAS.7d (ADR 179 D4): en Fijos, la barra de lo pagado y la línea
  // "Pagaste $X de $Y · 3 de 10 pagos". GAS.7e (D5): en Deudas, lo que se
  // debe en total en una línea, sin pastilla.
  let pieHtml = metaHtml;
  if (lente === 'deuda' && cantidad > 0) {
    pieHtml = `
      <p class="hero-compromisos__linea">Debes en total <strong>${m(saldoTotal)}</strong> ${_conteoTxt(cantidad, saldadas)}</p>`;
  }
  // GAS.9b (ADR 183 D2): la tarjeta de Fijos habla solo de fijos.
  if (lente === 'fijo') {
    const r = resumenFijosDelMes();
    const pct = r.total > 0 ? Math.round((r.pagado / r.total) * 100) : 0;
    // GAS.13d (ADR 188 D4): con el ojo puesto salen la barra y la línea.
    pieHtml = r.cantidad === 0 || oculto ? '' : `
      <div class="hero-compromisos__barra" aria-hidden="true"><span class="hero-compromisos__barra-fill" style="--pagado-pct: ${pct}%"></span></div>
      <p class="hero-compromisos__linea">Pagaste ${m(r.pagado)} de ${m(r.total)} · ${r.pagados} de ${r.cantidad} ${r.cantidad === 1 ? 'pago' : 'pagos'}</p>`;
  }

  el.innerHTML = `
    <div class="hero-compromisos">
      <p class="hero-compromisos__label">${label}</p>
      <p class="hero-compromisos__valor">${_conSigno(totalTxt)}</p>${ojoHtml}
      ${pieHtml}
    </div>`;
}

/**
 * La tarjeta de Deudas (GAS.8e, ADR 182 D5): "Debes en total", la cifra,
 * "Este mes pagas $X en cuotas" y la barra partida en entidades y personas,
 * con su leyenda. Con el ojo puesto no va la barra: diría la proporción.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @param {boolean} oculto
 * @returns {string}
 */
/**
 * GAS.13h (ADR 188 D7): lo que se debía de una deuda al cierre de un mes
 * pasado: el saldo de hoy más lo que se abonó después y menos lo que se
 * compró con la tarjeta después. Lo importado sin efecto en el saldo no
 * cuenta. Una deuda creada después de ese mes no se debía. Pura.
 *
 * @param {import('../../../core/state.js').Compromiso} c
 * @param {import('../../../core/state.js').Gasto[]} gastos
 * @param {string} prefijoMes 'YYYY-MM'
 * @returns {number}
 */
export function saldoDeudaAlCierre(c, gastos, prefijoMes) {
  // GAS.14c: el mes del alta en hora local, no el del sello UTC.
  const alta = fechaLocalISO(c?.fechaCreacion);
  if (alta && alta.slice(0, 7) > prefijoMes) return 0;
  let saldo = Number(c?.saldoTotal) || 0;
  for (const g of Array.isArray(gastos) ? gastos : []) {
    if (g?.compromisoId !== c.id || g.sinEfectoSaldo || typeof g.fecha !== 'string' || g.fecha.slice(0, 7) <= prefijoMes) continue;
    const monto = Number(g.monto) || 0;
    saldo += g.consumoTC ? -monto : monto;
  }
  return Math.max(0, saldo);
}

export function htmlHeroDeudas(compromisos, oculto, { gastos = S.gastos ?? [], prefijoMes = prefijoMesBloque(), hoyDate = new Date() } = {}) {
  const m = (n) => (oculto ? SALDO_MASCARA : f(n));
  const actual0 = `${hoyDate.getFullYear()}-${String(hoyDate.getMonth() + 1).padStart(2, '0')}`;
  const pasado = prefijoMes < actual0;
  // GAS.13h (ADR 188 D7): en un mes pasado, cada deuda con lo que se debía
  // al cierre de ese mes; en el actual, lo que se debe hoy.
  const saldoDe = (c) => (pasado ? saldoDeudaAlCierre(c, gastos, prefijoMes) : (Number(c.saldoTotal) || 0));
  const vivas = compromisosActivos(compromisos)
    .filter(c => esDeuda(c.tipo) && saldoDe(c) > 0);
  const suma = (tipo) => vivas.filter(c => c.tipo === tipo)
    .reduce((acc, c) => acc + saldoDe(c), 0);
  const entidades = suma('deuda-entidad');
  const personas = suma('deuda-personal');
  const total = entidades + personas;
  const cuotas = vivas.reduce((acc, c) => acc + calcularCompromisoMensual(c), 0);

  // GAS.9b (ADR 183 D2): la línea habla del mes del encabezado: cuánto se
  // pagó de las cuotas (los abonos, no las compras con la tarjeta).
  // GAS.14c (ADR 189 D3): lo abonado a una deuda archivada también se pagó.
  const pagado = (compromisos ?? []).filter(c => esDeuda(c?.tipo))
    .reduce((acc, c) => acc + calcularAbonosDelMes(gastos, c.id, prefijoMes), 0);
  const actual = `${hoyDate.getFullYear()}-${String(hoyDate.getMonth() + 1).padStart(2, '0')}`;
  const nombreMes = _MESES[Number(prefijoMes.slice(5, 7)) - 1] ?? '';
  let linea;
  if (prefijoMes !== actual) {
    linea = pagado > 0 ? `En ${nombreMes} pagaste ${m(pagado)} en cuotas` : `En ${nombreMes} no pagaste cuotas`;
  } else if (total <= 0) {
    linea = 'Ya no le debes nada a nadie';
  } else if (cuotas > 0) {
    // GAS.10g (ADR 185 D8): "Cuotas de noviembre: $680.000".
    linea = `Cuotas de ${nombreMes}: <strong>${m(cuotas)}</strong>${pagado > 0 ? ` · llevas ${m(pagado)}` : ''}`;
  } else {
    linea = pagado > 0 ? `Sin cuotas fijas · este mes pagaste ${m(pagado)}` : 'Sin cuotas fijas cada mes';
  }
  const tramos = [
    { clase: 'entidad', nombre: 'Entidades', monto: entidades },
    { clase: 'persona', nombre: 'Personas', monto: personas },
  ].filter(t => t.monto > 0);
  const reparto = total <= 0 || oculto ? '' : `
      <div class="hero-gastos__reparto" aria-hidden="true">${tramos.map(t =>
        `<span class="hero-gastos__tramo hero-deudas__tramo--${t.clase}" style="flex-grow:${t.monto}"></span>`).join('')}</div>
      <div class="hero-gastos__leyenda">${tramos.map(t => `
        <span class="hero-gastos__ley"><span class="hero-gastos__punto hero-deudas__punto--${t.clase}"></span>${t.nombre} ${m(t.monto)}</span>`).join('')}
      </div>`;

  // GAS.13d (ADR 188 D4): el ojo, pegado a la cifra; con él puesto salen la
  // línea, la barra y la leyenda.
  return `
    <div class="hero-compromisos hero-deudas">
      <p class="hero-compromisos__label">${pasado ? `Debías al cierre de ${htmlMesDelRotulo()}` : 'Debes en total'}</p>
      <p class="hero-compromisos__valor">${_conSigno(m(total))}</p>${_htmlOjo(oculto)}${oculto ? '' : `
      <p class="hero-compromisos__linea">${linea}</p>${reparto}`}
    </div>`;
}

/** El ojo de la tarjeta de Por pagar: tapa Fijos y Deudas (ADR 166). */
function _htmlOjo(oculto) {
  return `
      <button class="hero-compromisos__ojo" type="button" id="compromisos-saldo-ojo"
              data-action="compromisos-saldo-visibilidad"
              aria-pressed="${oculto}"
              aria-label="${oculto ? 'Mostrar tus saldos' : 'Ocultar tus saldos'}">
        <svg class="icon" aria-hidden="true"><use href="#i-eye${oculto ? '-off' : ''}"/></svg>
      </button>`;
}

const _MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** El "$" chico y arriba, como en la tarjeta de Día a día (ADR 157 D4). */
function _conSigno(txt) {
  return txt.startsWith('$') ? `<span class="hero-compromisos__signo">$</span>${txt.slice(1)}` : txt;
}

/**
 * Texto del conteo junto a "Lo que debes en total" (FD7). La lista muestra
 * también las deudas ya saldadas que aún no se archivan: sin explicarlo, el
 * usuario cuenta 4 tarjetas y lee "en 3 deudas".
 *
 * - Sin saldadas: "en N deudas" (el texto de siempre).
 * - Con saldadas: "en N deudas por pagar · M saldada(s)".
 * - Todas saldadas: "sin deudas por pagar · M saldada(s)".
 *
 * @param {number} cantidad Total de deudas activas (saldadas incluidas).
 * @param {number} saldadas Cuántas de ellas están en cero.
 */
function _conteoTxt(cantidad, saldadas) {
  if (saldadas === 0) return `en ${cantidad} ${cantidad === 1 ? 'deuda' : 'deudas'}`;

  const porPagar    = cantidad - saldadas;
  const saldadasTxt = `${saldadas} ${saldadas === 1 ? 'saldada' : 'saldadas'}`;
  if (porPagar === 0) return `sin deudas por pagar · ${saldadasTxt}`;
  return `en ${porPagar} ${porPagar === 1 ? 'deuda' : 'deudas'} por pagar · ${saldadasTxt}`;
}
