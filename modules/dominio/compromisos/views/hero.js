/**
 * compromisos/views/hero.js - hero con el total de deuda (D.16a, ADR 036 D1/D7).
 *
 * Tercer consumidor del estreno parcial del ADR 033 (degradado de identidad +
 * sombra en reposo), espejo de renderHeroTesoreria() (MC.18a). Reglas de la capa:
 * - Puede leer S. No puede mutarlo.
 * - Sin lógica de negocio: el agregado viene de `resumenDeudas()` (logic/modelo.js).
 */

import { S } from '../../../core/state.js';
import { f } from '../../../infra/utils.js';
import { icon } from '../../../infra/icons.js';
import { SALDO_MASCARA } from '../../../infra/render.js';
import { resumenDeudas } from '../logic.js';

/**
 * Renderiza el hero con el total de deuda en `#compromisos-hero`.
 * No-op si el contenedor no existe (sección no montada).
 *
 * - Cifra protagonista: saldo total de las deudas activas (ADR 036, pregunta
 *   abierta 2: la cuota mensual va como chip, no como protagonista).
 * - Enmascarado con `SALDO_MASCARA` cuando `S.config.ocultarSaldo` es true
 *   (mismo flag que el ojo de Inicio y Mis cuentas: un solo control, IN.2).
 * - Ojo de privacidad anclado a la esquina (posición estable, solo cambia el
 *   contenido). Sin deudas no se pinta: no hay nada que enmascarar.
 * - Chip "cuota/mes" + texto "en N deudas": la magnitud mensual acompaña al
 *   total sin competir con él (mockup aprobado).
 */
export function renderHeroCompromisos() {
  const el = document.getElementById('compromisos-hero');
  if (!el) return;

  const { saldoTotal, cuotaMensual, cantidad, saldadas } = resumenDeudas(S.compromisos);
  const sinDeudas = cantidad === 0;
  const oculto    = S.config?.ocultarSaldo === true;

  const label    = sinDeudas ? 'No tienes deudas registradas' : 'Lo que debes en total';
  const totalTxt = sinDeudas ? f(0)
                 : oculto    ? SALDO_MASCARA
                 :             f(saldoTotal);

  const ojoHtml = sinDeudas ? '' : `
      <button class="hero-compromisos__ojo" type="button" id="compromisos-saldo-ojo"
              data-action="compromisos-saldo-visibilidad"
              aria-pressed="${oculto}"
              aria-label="${oculto ? 'Mostrar tus saldos' : 'Ocultar tus saldos'}">
        <svg class="icon" aria-hidden="true"><use href="#i-eye${oculto ? '-off' : ''}"/></svg>
      </button>`;

  const chipHtml = cuotaMensual > 0
    ? `<span class="hero-compromisos__chip">
         ${icon('agenda')}
         ${oculto ? SALDO_MASCARA : f(cuotaMensual)}/mes
       </span>`
    : '';
  const metaHtml = sinDeudas ? '' : `
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
 * Texto del conteo bajo el total (FD7). La cifra grande solo suma lo que se
 * debe, pero la lista muestra también las deudas ya saldadas que aún no se
 * archivan: sin explicarlo, el usuario cuenta 4 tarjetas y lee "en 3 deudas".
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
