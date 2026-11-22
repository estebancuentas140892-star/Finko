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
import { f, esc as _esc, hoy, formateadorFecha, fechaLegible } from '../../../infra/utils.js';
import { SALDO_MASCARA_CUENTA } from '../../../infra/render.js';
import { esDeuda, tasaEADe, estadoPagoMes, vencidosSinPagar, LABEL_TIPO, esTarjetaOperable } from '../logic.js';
import { situacionDelFijo } from '../../../infra/vencimientos.js';
import { tejaCompromiso } from './lista.js';
import { montosOcultos } from '../../../infra/privacidad.js';
import { datosDePago, nombreDatoPago, textoLlave } from '../../../infra/llaves.js';
import { datoPagoDeFijo, DATO_PAGO_FIJO_OTROS } from '../../../core/constants.js';

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
  // GAS.14b (ADR 189 D2): un fijo dice su vencimiento real (el más antiguo
  // sin pago o el próximo), no el día de pago en el mes que se mira: un anual
  // ya pagado decía "Vence el martes 10" con una fecha pasada.
  if (c.tipo === 'fijo' && prefijoMes === hoy().slice(0, 7)) {
    const sit = situacionDelFijo(c, S.gastos ?? [], hoy());
    if (sit.fecha) {
      // En el mes en curso, con el día de la semana ("el jueves 5"); de otro
      // mes, con el mes ("el 15 de jul").
      const enEsteMes = sit.fecha.slice(0, 7) === prefijoMes;
      const cuando = enEsteMes
        ? formateadorFecha('es-CO', { weekday: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${sit.fecha}T12:00:00Z`)).replace(/,/g, '')
        : fechaLegible(sit.fecha);
      if (sit.vencido) return `Venció el ${cuando}${sit.pendientes > 1 ? ` · ${sit.pendientes} pagos` : ''}`;
      if (sit.fecha === hoy()) return 'Vence hoy';
      if (!enEsteMes && estadoPagoMes(S.gastos ?? [], c, prefijoMes) === 'completo') return 'Pagado este mes';
      return `Vence el ${cuando}`;
    }
  }
  if (estadoPagoMes(S.gastos ?? [], c, prefijoMes) === 'completo') {
    return prefijoMes === hoy().slice(0, 7) ? 'Pagado este mes' : `Pagado en ${_MESES[Number(prefijoMes.slice(5, 7)) - 1]}`;
  }
  const [anio, mes] = prefijoMes.split('-').map(Number);
  const ultimo = new Date(anio, mes, 0).getDate();
  const dia = Math.min(Math.max(Number(c.diaPago) || 1, 1), ultimo);
  const iso = `${prefijoMes}-${String(dia).padStart(2, '0')}`;
  const fecha = formateadorFecha('es-CO', { weekday: 'long', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${iso}T12:00:00Z`)).replace(/,/g, '');
  const v = vencidosSinPagar(S.compromisos ?? [], S.gastos ?? [], hoy()).find(x => x.id === c.id);
  // GAS.12b (ADR 187 D2): en el mes en curso, lo vencido se dice desde el
  // vencimiento más viejo y, si son varios, cuántos: "Venció el 15 de julio ·
  // 5 pagos", no el día de este mes.
  if (v?.desde && v.desde < hoy() && prefijoMes === hoy().slice(0, 7)) {
    const cuando = v.desde.startsWith(prefijoMes) ? fecha : fechaLegible(v.desde);
    const cuantos = c.tipo === 'fijo' && v.pendientes > 1 ? ` · ${v.pendientes} pagos` : '';
    return `Venció el ${cuando}${cuantos}`;
  }
  if (iso === hoy()) return 'Vence hoy';
  return v ? `Venció el ${fecha}` : `Vence el ${fecha}`;
}

/**
 * Sobre qué es el monto de la hoja: "Pago de noviembre", "Cuota de
 * noviembre" o, con varios vencimientos de un fijo sin pagar (GAS.12b, ADR
 * 187 D2), "Pagos pendientes": la cifra los suma todos.
 */
function _rotuloDelMonto(c, deuda, mes, prefijoMes) {
  if (deuda) return `Cuota de ${mes}`;
  const v = prefijoMes === hoy().slice(0, 7)
    ? vencidosSinPagar(S.compromisos ?? [], S.gastos ?? [], hoy()).find(x => x.id === c.id)
    : null;
  return (v?.pendientes ?? 1) > 1 ? 'Pagos pendientes' : `Pago de ${mes}`;
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
/**
 * "Para pagar" en la ficha del pago (PAG.1, ADR 175 D2 y D3): la llave, el
 * número de cuenta y la referencia, cada uno con Copiar, que no cierra la
 * hoja. El documento y el número van enmascarados hasta tocarlos; con el ojo
 * de Por pagar cerrado, todo. Las mismas filas de "Para recibir" (MC.19).
 * @param {import('../../../core/state.js').Compromiso} c
 * @param {boolean} oculto
 * @returns {string} '' sin dato para pagar.
 */
function _htmlParaPagar(c, oculto) {
  const datos = datosDePago(c.datosPago);
  if (datos.length === 0) return '';
  const id = _esc(c.id);
  const quien = c.datosPago?.titular || c.descripcion;
  const filas = datos.map(d => {
    const texto = textoLlave(d.tipo, d.valor, { oculto });
    const enmascarado = texto !== textoLlave(d.tipo, d.valor, { ver: true });
    const valor = enmascarado && !oculto
      ? `<button type="button" class="detalle-cuenta__ver" data-action="pago-ver" data-id="${id}" data-dato="${d.dato}" aria-label="Ver ${_esc(nombreDatoPago(d.dato, quien))} completo">${_esc(texto)}</button>`
      : `<span class="detalle-cuenta__valor">${_esc(texto)}</span>`;
    return `
      <div class="detalle-gasto__dato detalle-cuenta__llave">
        <dt>${_esc(d.rotulo)}</dt>
        <dd>${valor}</dd>
        <button type="button" class="btn btn-ghost detalle-cuenta__copiar" data-action="pago-copiar"
                data-id="${id}" data-dato="${d.dato}" aria-label="Copiar ${_esc(nombreDatoPago(d.dato, quien))}">Copiar</button>
      </div>`;
  }).join('');
  const titular = c.datosPago?.titular ? ` a ${_esc(c.datosPago.titular)}` : '';
  // GAS.13c (ADR 188 D3): el fijo nombra el dato de su tipo, nunca "Para pagar".
  const rotulo = c.tipo === 'fijo'
    ? `${_esc(datoPagoDeFijo(c.categoria).cobra ? DATO_PAGO_FIJO_OTROS.rotulo : datoPagoDeFijo(c.categoria).rotulo)}${c.datosPago?.titular ? ` · ${_esc(c.datosPago.titular)}` : ''}`
    : `Para pagar${titular}`;
  return `
    <p class="detalle-cuenta__rotulo">${rotulo}</p>
    <dl class="detalle-gasto__datos detalle-cuenta__llaves">${filas}
    </dl>`;
}

/**
 * Los avances de una tarjeta en su hoja (AVC.1d, ADR 169 D6), del más nuevo al
 * más viejo: la fecha, a qué cuenta llegó y el monto, con "Deshacer". La
 * acción viaja por `registrar-abrir` (cierra la hoja y pregunta) con el id del
 * avance: `deshacerConConfirmacion` ya sabe deshacerlo y frenar lo que no se
 * puede (el dinero ya salió de la cuenta, la tarjeta ya se pagó por debajo).
 *
 * @param {import('../../../core/state.js').Compromiso} c
 * @param {(n: number) => string} m el monto, o su máscara con el ojo cerrado
 * @returns {string} '' si la tarjeta no tiene avances.
 */
function _htmlAvances(c, m) {
  const avances = (Array.isArray(c.avances) ? c.avances : [])
    .slice()
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  if (avances.length === 0) return '';
  const cuenta = (id) => (S.cuentas ?? []).find(x => x.id === id)?.nombre;
  const filas = avances.map(a => {
    const destino = cuenta(a.cuentaId);
    const cuando = [fechaLegible(a.fecha), destino && `a ${destino}`].filter(Boolean).join(' · ');
    return `
      <div class="detalle-gasto__dato detalle-compromiso__avance">
        <dt>${_esc(cuando)}</dt>
        <dd>${m(Number(a.monto) || 0)}</dd>
        <button type="button" class="btn btn-ghost detalle-compromiso__deshacer" data-dom="compromisos"
                data-action="registrar-abrir" data-target-action="deshacer-avance" data-id="${_esc(a.id)}"
                aria-label="Deshacer el avance de ${_esc(fechaLegible(a.fecha))}">Deshacer</button>
      </div>`;
  }).join('');
  return `
    <p class="detalle-compromiso__rotulo detalle-compromiso__rotulo--avances">${avances.length === 1 ? 'Tu avance' : 'Tus avances'}</p>
    <dl class="detalle-gasto__datos detalle-compromiso__avances">${filas}
    </dl>`;
}

/**
 * Desde cuándo se paga un fijo y su último pago (GAS.14b, ADR 189 D2): el
 * motor los conoce y la hoja no los decía.
 * @param {import('../../../core/state.js').Compromiso} c
 * @returns {Array<[string, string]>}
 */
function _fechasDelFijo(c) {
  const sit = situacionDelFijo(c, S.gastos ?? [], hoy());
  return [
    sit.inicio && ['Desde', _esc(fechaLegible(sit.inicio))],
    ['Último pago', sit.ultimoPago ? _esc(fechaLegible(sit.ultimoPago)) : 'Todavía ninguno'],
  ].filter(Boolean);
}

export function htmlDetalleCompromiso(c, { prefijoMes, monto }) {
  const oculto = montosOcultos();
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const id = _esc(c.id);
  const deuda = esDeuda(c.tipo);
  const saldo = Number(c.saldoTotal) || 0;
  const mes = _MESES[Number(prefijoMes.slice(5, 7)) - 1] ?? '';
  const pagado = estadoPagoMes(S.gastos ?? [], c, prefijoMes) === 'completo';
  const saldada = deuda && saldo <= 0;

  const sub = [LABEL_TIPO[c.tipo], c.categoria].filter(Boolean).map(_esc).join(' · ');
  // GAS.9d (ADR 183 D4): la tarjeta dice su cupo y lo que queda de él.
  const tarjeta = esTarjetaOperable(c);
  const cupo = Number(c.cupoTotal) || 0;
  const datos = (deuda
    ? [['Te falta pagar', m(saldo)],
      tarjeta && ['Cupo', m(cupo)],
      tarjeta && ['Disponible', m(Math.max(cupo - saldo, 0))],
      ['Tasa', textoTasa(c)], ['Se paga', _sePaga(c)]]
    : [['Se paga', _sePaga(c)], c.categoria && ['Categoría', _esc(c.categoria)], c.debitoAutomatico && ['Se debita solo', 'Sí'], ..._fechasDelFijo(c)]
  ).filter(Boolean).map(([k, v]) => `
      <div class="detalle-gasto__dato"><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  const boton = (accion, etiqueta, clase, extra = '') => `
        <button type="button" class="${clase} detalle-fila__accion" data-dom="compromisos"
                data-action="registrar-abrir" data-target-action="${accion}" data-id="${id}"${extra}>${etiqueta}</button>`;
  const pagar = pagado || saldada ? ''
    : deuda
      ? boton('abrir-abono', monto > 0 && !oculto ? `Abonar ${f(monto)}` : 'Abonar', 'btn-dominio btn-dominio--bloque')
      : boton('agenda-marcar-pagado-fijo', 'Marcar pagado', 'btn-dominio btn-dominio--bloque', ` data-mes="${_esc(prefijoMes)}"`);
  // AVC.1b (ADR 169 D1): una tarjeta con cupo saca avances, deba o no.
  const avance = tarjeta ? boton('abrir-avance', 'Sacar un avance', 'btn btn-secondary') : '';
  // GAS.12c (ADR 187 D3): un fijo con vencimientos sin pagar se puede anotar
  // como pagado por fuera de Finko, sin mover dinero. Uno por toque, del más
  // viejo al más nuevo; la hoja se queda abierta con lo que falta.
  const vencido = !deuda && prefijoMes === hoy().slice(0, 7)
    ? vencidosSinPagar(S.compromisos ?? [], S.gastos ?? [], hoy()).find(x => x.id === c.id && x.desde < hoy())
    : null;
  const porFuera = !vencido ? '' : `
        <button type="button" class="btn btn-secondary detalle-fila__accion" data-dom="compromisos"
                data-action="fijo-ya-pagado" data-id="${id}" data-mes="${_esc(prefijoMes)}"
                aria-label="Ya lo había pagado: anotar el del ${_esc(fechaLegible(vencido.desde))} sin mover dinero">Ya lo había pagado</button>`;
  // GAS.9d (ADR 183 D4): fuera de Mis cuentas, la tarjeta lleva a donde se
  // administra; en Mis cuentas, a su deuda.
  const enCuentas = typeof location !== 'undefined' && location.hash.slice(1) === 'tesoreria';
  const ir = !tarjeta ? '' : `
        <button type="button" class="btn btn-ghost detalle-fila__accion" data-action="${enCuentas ? 'tc-ver-deuda' : 'tc-ver-en-cuentas'}"
                data-id="${id}">${enCuentas ? 'Ver la deuda en Deudas' : 'Ver en Mis cuentas'}</button>`;
  // AVC.1d (ADR 169 D6): los avances de la tarjeta, cada uno con "Deshacer",
  // el mismo de Movimientos. Un avance no se edita: se deshace y se vuelve a sacar.
  const avances = _htmlAvances(c, m);
  const paraPagar = _htmlParaPagar(c, oculto);
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
      <p class="detalle-compromiso__rotulo">${_rotuloDelMonto(c, deuda, mes, prefijoMes)}</p>
      <p class="detalle-fila__monto">${m(saldada ? 0 : monto)}</p>
      <p class="detalle-fila__cuando">${_esc(saldada ? 'Sin saldo pendiente' : cuandoCompromiso(c, prefijoMes))}</p>
    </div>
    <dl class="detalle-gasto__datos">${datos}
    </dl>${paraPagar}${avances}
    <div class="detalle-fila__acciones detalle-compromiso__acciones">${pagar}${porFuera}${avance}${editar}${ir}
    </div>
    <div class="detalle-fila__peligro">${peligro}
      <p class="detalle-gasto__al-borrar">Te pediremos confirmar.</p>
    </div>`;
}
