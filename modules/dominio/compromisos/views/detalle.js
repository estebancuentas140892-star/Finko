/**
 * compromisos/views/detalle.js - la hoja de un pago de "Por pagar" (ADR 132 D7).
 *
 * El tablero pide, al tocar una deuda, lo que se viene a preguntar: cuánto es
 * la cuota del mes y cuándo vence, cuánto falta, a qué tasa y qué día se paga,
 * con "Abonar" a la mano. Hasta acá la fila abría la hoja genérica, que copiaba
 * la fila y sus notas. Un gasto fijo abre la misma hoja con lo suyo. Se arma
 * con los datos del compromiso, no del DOM, como la hoja del gasto (ADR 119 D2).
 *
 * Las acciones viajan por `registrar-abrir`: cierra la hoja y recién ahí abre
 * el abono, el formulario o la confirmación, con el mismo `data-id`.
 *
 * Puede leer S. No puede mutarlo.
 */

import { S } from '../../../core/state.js';
import { f, esc as _esc, hoy, formateadorFecha } from '../../../infra/utils.js';
import { SALDO_MASCARA_CUENTA } from '../../../infra/render.js';
import { esDeuda, tasaEADe, estadoPagoMes, vencidosSinPagar, LABEL_TIPO } from '../logic.js';
import { tejaCompromiso } from './lista.js';

const _MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * La tasa como se lee en la hoja: "2,1 % mensual", "26 % EA", "Sin interés" o
 * "Por confirmar" (una deuda con entidad sin tasa se calcula como 0 %).
 *
 * @param {import('../../../core/state.js').Compromiso} c
 * @returns {string}
 */
export function textoTasa(c) {
  if ((c.tasa === null || c.tasa === undefined) && c.tipo === 'deuda-entidad') return 'Por confirmar';
  const t = Number(c.tasa) || 0;
  if (t <= 0) return 'Sin interés';
  const pct = (n) => (n * 100).toLocaleString('es-CO', { maximumFractionDigits: 2 });
  return c.tasaUnidad === 'mensual' ? `${pct(t)} % mensual` : `${pct(tasaEADe(c))} % EA`;
}

/**
 * Cuándo se paga: "El 25 de cada mes"; otra frecuencia la nombra.
 * @param {import('../../../core/state.js').Compromiso} c
 */
function _sePaga(c) {
  const dia = Number(c.diaPago);
  if (!dia) return _esc(c.frecuencia ?? '');
  return !c.frecuencia || c.frecuencia === 'Mensual'
    ? `El ${dia} de cada mes`
    : `${_esc(c.frecuencia)}, el día ${dia}`;
}

/**
 * La línea bajo el monto: "Vence el miércoles 25", "Vence hoy", "Venció el
 * sábado 1" o "Pagado este mes". Lo vencido sale de `vencidosSinPagar`, como
 * la fila y la pastilla de la pestaña, para que los tres digan lo mismo.
 *
 * @param {import('../../../core/state.js').Compromiso} c
 * @param {string} prefijoMes 'YYYY-MM'
 * @returns {string}
 */
export function cuandoCompromiso(c, prefijoMes) {
  if (estadoPagoMes(S.gastos ?? [], c, prefijoMes) === 'completo') {
    return prefijoMes === hoy().slice(0, 7) ? 'Pagado este mes' : `Pagado en ${_MESES[Number(prefijoMes.slice(5, 7)) - 1]}`;
  }
  const [anio, mes] = prefijoMes.split('-').map(Number);
  const ultimo = new Date(anio, mes, 0).getDate();
  const dia = Math.min(Math.max(Number(c.diaPago) || 1, 1), ultimo);
  const iso = `${prefijoMes}-${String(dia).padStart(2, '0')}`;
  const fecha = formateadorFecha('es-CO', { weekday: 'long', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${iso}T12:00:00Z`)).replace(/,/g, '');
  if (iso === hoy()) return 'Vence hoy';
  const vencido = vencidosSinPagar(S.compromisos ?? [], S.gastos ?? [], hoy()).some(v => v.id === c.id);
  return vencido ? `Venció el ${fecha}` : `Vence el ${fecha}`;
}

/**
 * HTML de la hoja de un pago. El título lleva el id que nombra a la hoja
 * (`#modal-detalle-fila`, `aria-labelledby`).
 *
 * @param {import('../../../core/state.js').Compromiso} c
 * @param {{ prefijoMes: string, monto: number }} contexto el mes del bloque y
 *   lo que falta ese mes (lo mismo que dice la fila).
 * @returns {string}
 */
export function htmlDetalleCompromiso(c, { prefijoMes, monto }) {
  const oculto = S.config?.ocultarSaldo === true;
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const id = _esc(c.id);
  const deuda = esDeuda(c.tipo);
  const saldo = Number(c.saldoTotal) || 0;
  const mes = _MESES[Number(prefijoMes.slice(5, 7)) - 1] ?? '';
  const pagado = estadoPagoMes(S.gastos ?? [], c, prefijoMes) === 'completo';
  const saldada = deuda && saldo <= 0;

  const sub = [LABEL_TIPO[c.tipo], c.categoria].filter(Boolean).map(_esc).join(' · ');
  const datos = (deuda
    ? [['Te falta pagar', m(saldo)], ['Tasa', textoTasa(c)], ['Se paga', _sePaga(c)]]
    : [['Se paga', _sePaga(c)], c.categoria && ['Categoría', _esc(c.categoria)], c.debitoAutomatico && ['Se debita solo', 'Sí']]
  ).filter(Boolean).map(([k, v]) => `
      <div class="detalle-gasto__dato"><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  const boton = (accion, etiqueta, clase, extra = '') => `
        <button type="button" class="${clase} detalle-fila__accion" data-dom="compromisos"
                data-action="registrar-abrir" data-target-action="${accion}" data-id="${id}"${extra}>${etiqueta}</button>`;
  const pagar = pagado || saldada ? ''
    : deuda
      ? boton('abrir-abono', monto > 0 && !oculto ? `Abonar ${f(monto)}` : 'Abonar', 'btn-dominio btn-dominio--bloque')
      : boton('agenda-marcar-pagado-fijo', 'Marcar pagado', 'btn-dominio btn-dominio--bloque', ` data-mes="${_esc(prefijoMes)}"`);
  const editar = boton(deuda ? 'editar-compromiso' : 'agenda-editar-fijo',
    '<svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg>Editar', 'btn btn-secondary');
  const peligro = saldada
    ? boton('archivar-compromiso', '<svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg>Archivar esta deuda', 'btn btn-ghost')
    : boton(deuda ? 'eliminar-compromiso' : 'agenda-eliminar-fijo',
      `<svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg>${deuda ? 'Eliminar esta deuda' : 'Eliminar este gasto fijo'}`,
      'btn btn-ghost detalle-fila__accion--peligro');

  return `
    <div class="detalle-fila__cabeza">
      <div class="detalle-fila__icono" aria-hidden="true">${tejaCompromiso(c)}</div>
      <div class="detalle-fila__textos">
        <h2 class="detalle-fila__titulo" id="detalle-fila-titulo">${_esc(c.descripcion)}</h2>
        ${sub ? `<p class="detalle-fila__sub">${sub}</p>` : ''}
      </div>
    </div>
    <div class="detalle-gasto__monto detalle-compromiso__monto">
      <p class="detalle-compromiso__rotulo">${deuda ? 'Cuota' : 'Pago'} de ${mes}</p>
      <p class="detalle-fila__monto">${m(saldada ? 0 : monto)}</p>
      <p class="detalle-fila__cuando">${_esc(saldada ? 'Sin saldo pendiente' : cuandoCompromiso(c, prefijoMes))}</p>
    </div>
    <dl class="detalle-gasto__datos">${datos}
    </dl>
    <div class="detalle-fila__acciones detalle-compromiso__acciones">${pagar}${editar}
    </div>
    <div class="detalle-fila__peligro">${peligro}
      <p class="detalle-gasto__al-borrar">Te pediremos confirmar.</p>
    </div>`;
}
