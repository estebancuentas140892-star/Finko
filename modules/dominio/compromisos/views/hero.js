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
import { f } from '../../../infra/utils.js';
import { SALDO_MASCARA } from '../../../infra/render.js';
import { resumenDeudas } from '../logic.js';
import { faltaPorPagarDelMes } from './lista.js';

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
  const oculto = S.config?.ocultarSaldo === true;
  const m = (n) => (oculto ? SALDO_MASCARA : f(n));

  const label = !falta.hayPagos ? 'No tienes pagos registrados'
              : falta.esActual  ? 'Te falta pagar este mes'
              :                   `Sin pagar en ${falta.mes}`;
  const totalTxt = falta.hayPagos ? m(falta.total) : f(0);

  const ojoHtml = !falta.hayPagos ? '' : `
      <button class="hero-compromisos__ojo" type="button" id="compromisos-saldo-ojo"
              data-action="compromisos-saldo-visibilidad"
              aria-pressed="${oculto}"
              aria-label="${oculto ? 'Mostrar tus saldos' : 'Ocultar tus saldos'}">
        <svg class="icon" aria-hidden="true"><use href="#i-eye${oculto ? '-off' : ''}"/></svg>
      </button>`;

  // "Lo que debes en total" es otra pregunta (el saldo, no el mes): va abajo y
  // con su nombre, distinto del "suman" del pie de Inicio (ADR 140 D2).
  const chipHtml = saldoTotal > 0
    ? `<span class="hero-compromisos__chip">Lo que debes en total: ${m(saldoTotal)}</span>`
    : '';
  const metaHtml = cantidad === 0 ? '' : `
      <div class="hero-compromisos__meta">
        ${chipHtml}
        <span class="hero-compromisos__meta-txt">${_conteoTxt(cantidad, saldadas)}</span>
      </div>`;

  el.innerHTML = `
    <div class="hero-compromisos">
      ${ojoHtml}
      <p class="hero-compromisos__label">${label}</p>
      <p class="hero-compromisos__valor">${totalTxt}</p>
      ${metaHtml}
    </div>`;
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
