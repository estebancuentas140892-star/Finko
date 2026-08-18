/**
 * compromisos/views/lote.js - pago en lote de "Por pagar" (CAL.5a/CAL.5b,
 * mudado desde Agenda en la ficha 05 de la auditoría móvil, ADR 069).
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { f, esc as _esc } from '../../../infra/utils.js';

/**
 * Tarjeta "paga de una vez lo que ya venció", sobre la lista de "Por pagar".
 *
 * Solo aparece con **dos o más** pendientes: con uno solo el lote no ahorra
 * nada (el CTA individual de cada tarjeta ya resuelve ese caso) y la tarjeta
 * sería ruido que compite con el hero.
 *
 * DIS.11 C5/V-7: la tarjeta dice **cuánto** suma antes de abrir el flujo (una
 * tarjeta que propone mover dinero muestra el monto antes, no dentro). El
 * total no se enmascara con el ojo de privacidad: no es un saldo, es el precio
 * de la acción que se está ofreciendo, mismo criterio que los montos del modal.
 *
 * @param {Array<{id:string, descripcion:string, monto:number, dia:number,
 *   tipo:string, parcial:boolean}>} pendientes
 * @param {string} prefijoMes 'YYYY-MM' del mes a liquidar (siempre el mes en
 *   curso: "Por pagar" no navega meses, a diferencia del viejo Calendario).
 * @returns {string}
 */
export function renderLoteCard(pendientes, prefijoMes) {
  if (!Array.isArray(pendientes) || pendientes.length < 2) return '';

  const n       = pendientes.length;
  const nombres = pendientes.slice(0, 2).map(p => _esc(p.descripcion || 'Sin nombre'));
  const resto   = n - nombres.length;
  const lista   = resto > 0
    ? `${nombres.join(', ')} y ${resto} más`
    : nombres.join(' y ');
  const total   = pendientes.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);

  return `
    <section class="cal-lote" aria-label="Pagos pendientes del mes">
      <div class="cal-lote__body">
        <p class="cal-lote__title">${n} pagos ya vencieron</p>
        <p class="cal-lote__monto">${f(total)}</p>
        <p class="cal-lote__desc">${lista}.</p>
      </div>
      <button type="button" class="cal-lote__cta"
              data-action="compromisos-pagar-lote" data-mes="${_esc(prefijoMes)}"
              aria-label="Pagar juntos los ${n} pagos vencidos">
        Pagar los ${n}
      </button>
    </section>`;
}

/**
 * Subtítulo de una fila del lote: qué es lo que se va a registrar, no solo
 * cuándo vencía. Un fijo se paga entero; una deuda puede traer el resto de la
 * cuota (ya tenía un abono este mes) o el resto del saldo (última cuota).
 *
 * @param {{dia:number, tipo:string, parcial:boolean}} p
 * @returns {string}
 */
function _subFilaLote(p) {
  const cuando = `vencía el ${p.dia}`;
  if (p.tipo !== 'deuda-entidad' && p.tipo !== 'deuda-personal') {
    return `Vencía el ${p.dia}`;
  }
  return p.parcial ? `Resto de la cuota, ${cuando}` : `Cuota de la deuda, ${cuando}`;
}

/**
 * Cuerpo del modal de pago en lote: una fila por pendiente, todas marcadas
 * (la tarjeta prometió "los N"; desmarcar es la excepción, no la regla) y el
 * total en vivo que el handler recalcula al desmarcar.
 *
 * Los montos SÍ se muestran aunque el ojo esté activo: el usuario está por
 * mover ese dinero y ocultarle cuánto sería peligroso, no privado.
 *
 * CAL.5b: el lote también trae deudas, y una deuda no siempre pide la cuota
 * completa (puede quedar el resto de un abono previo, o el resto del saldo).
 * La fila lo dice en su subtítulo en vez de mostrar una cifra sin explicar, y
 * el intro avisa que un abono baja el saldo de la deuda: es un movimiento con
 * más consecuencias que pagar un fijo.
 *
 * @param {Array<{id:string, descripcion:string, monto:number, dia:number,
 *   tipo:string, parcial:boolean}>} pendientes
 * @returns {string}
 */
export function renderFormPagoLote(pendientes) {
  const lista = pendientes ?? [];

  const items = lista.map(p => `
    <label class="lote-row">
      <input type="checkbox" class="lote-row__check" checked
             data-lote-id="${_esc(p.id)}" data-lote-monto="${Number(p.monto) || 0}" />
      <span class="lote-row__body">
        <span class="lote-row__name">${_esc(p.descripcion || 'Sin nombre')}</span>
        <span class="lote-row__sub">${_subFilaLote(p)}</span>
      </span>
      <span class="lote-row__amount">${f(Number(p.monto) || 0)}</span>
    </label>`).join('');

  const hayDeudas = lista.some(p => p.tipo === 'deuda-entidad' || p.tipo === 'deuda-personal');
  const intro = hayDeudas
    ? 'Estos pagos ya vencieron y no están registrados. Lo que abones a una deuda baja su saldo. Desmarca los que aún no hayas pagado.'
    : 'Estos pagos ya vencieron y no están registrados. Desmarca los que aún no hayas pagado.';

  return `
    <p class="lote-intro">${intro}</p>
    <div class="lote-lista">${items}</div>
    <p class="lote-total" data-role="lote-total" aria-live="polite"></p>
    <div class="modal__footer modal__footer--principal">
      <button type="button" class="btn btn-primary" data-action="compromisos-confirmar-lote">
        <svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg>
        <span data-role="lote-cta-texto">Registrar pagos</span>
      </button>
    </div>`;
}
