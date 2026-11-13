/**
 * inversiones/detalle.js - Inversión en el teléfono (ADR 133 D6): lo que
 * pusiste a crecer, la tarjeta de la etapa con una barra partida, las
 * inversiones en filas y la hoja de una inversión.
 *
 * El tablero "rediseño2" dice lo mismo que la tarjeta del momento (DIS.17),
 * en otro orden: el total arriba y suelto con lo que suma el tiempo en una
 * pastilla; la etapa con su frase y una barra partida (lo que pusiste y lo que
 * pone el tiempo; con varias, por tipo) en vez de las dos columnas; el aviso
 * del fondo como tarjeta; y cada inversión como una fila que abre su hoja con
 * lo que tendrías al vencer, la tasa, el plazo y de dónde salió el dinero.
 * Registrar va al "+ Inversión" del encabezado. Desde 1024px sigue la tarjeta
 * del momento con su acción.
 *
 * Las acciones de la hoja viajan por `registrar-abrir`.
 *
 * Puede leer S. No puede mutarlo.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, formateadorFecha, esc as _esc } from '../../infra/utils.js';
import { iconoCategoria } from '../../infra/icons.js';
import { SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import {
  calcularTotalInvertido,
  ordenarInversionesPorMonto,
  proyectarInversion,
  columnasPortafolio,
  momentoInversion,
  fechaVencimientoInversion,
  rasgoTipo,
} from './logic.js';

const _m = (valor) => (S.config?.ocultarSaldo === true ? SALDO_MASCARA_CUENTA : f(valor));
const _icono = (id) => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
const MES_CORTO = formateadorFecha('es-CO', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "jun de 2027": el vencimiento sin día, como lo dice el tablero. */
export function mesCorto(iso) {
  return MES_CORTO.format(new Date(`${iso}T12:00:00Z`)).replace('.', '');
}

/** 12 → "12", 12.5 → "12,5", 7.2816 → "7,28" (mismo criterio que la vista). */
export function fmtTasa(n) {
  const num = Math.round((Number(n) || 0) * 100) / 100;
  const entero = Math.abs(num - Math.round(num)) < 0.005;
  return entero ? String(Math.round(num)) : num.toString().replace('.', ',');
}

/**
 * Lo que dice la fila bajo el nombre: el monto, el tipo y su rasgo, la tasa y
 * cuándo vence ("$5.000.000 · CDT · 10,2% al año · vence en jun de 2027").
 * Una de las que suben o bajan dice desde cuándo la tienes.
 *
 * @param {import('../../core/state.js').Inversion} inv
 * @returns {string}
 */
export function datoInversion(inv) {
  const partes = [`<strong>${_m(Number(inv.monto) || 0)}</strong>`, _esc(inv.tipo)];
  if (Number(inv.tasaEA) > 0) partes.push(`${fmtTasa(inv.tasaEA)}% al año`);
  else if (rasgoTipo(inv.tipo)) partes.push(_esc(rasgoTipo(inv.tipo)));
  const vence = fechaVencimientoInversion(inv);
  if (vence) partes.push(`vence en ${mesCorto(vence)}`);
  else if (Number(inv.tasaEA) > 0) partes.push('sin plazo fijo');
  else if (inv.fechaInicio) partes.push(`desde ${mesCorto(inv.fechaInicio)}`);
  return partes.join(' · ');
}

/** La fila de una inversión: la fila entera abre su hoja. */
function _fila(inv) {
  const id = _esc(inv.id);
  const nombre = _esc(inv.nombre);
  return `
    <article class="inv-fila list-item--detalle" data-id="${id}" data-dom="inversion">
      <button type="button" class="list-item__detalle" data-action="inversion-detalle" data-id="${id}"
              aria-label="Ver detalle: ${nombre}"></button>
      <span class="inv-fila__teja" aria-hidden="true">${iconoCategoria('i-inversion', 'icon')}</span>
      <div class="inv-fila__info">
        <p class="inv-fila__nombre">${nombre}</p>
        <p class="inv-fila__dato">${datoInversion(inv)}</p>
      </div>
    </article>`;
}

/**
 * La barra partida: un tramo por tipo (con una sola inversión, uno) y, al
 * final, rayado, lo que pone el tiempo. Los anchos salen de la misma escala de
 * `columnasPortafolio()` que dibujaba las columnas.
 */
function _barra(cols) {
  const escala = cols.totalInvertido + cols.rendimiento;
  const ancho = (n) => Math.max(0, Math.round((n / escala) * 10000) / 100);
  const tramos = cols.segmentos.map((s, i) => `<span data-seg="${Math.min(i, 4)}" style="width:${ancho(s.monto)}%"></span>`).join('');
  const tiempo = cols.rendimiento > 0 ? `<span data-seg="tiempo" style="width:${ancho(cols.rendimiento)}%"></span>` : '';
  return `<span class="inv-barra" aria-hidden="true">${tramos}${tiempo}</span>`;
}

/**
 * Inversión en el teléfono. `nota` es la frase de la inflación que arma la
 * vista (`_renderNotaMomento`), así no se calcula dos veces.
 *
 * @param {import('../../core/state.js').Inversion[]} inversiones
 * @param {{ nota: string }} extra
 * @returns {string}
 */
export function htmlInversionTelefono(inversiones, { nota }) {
  const fondo = S.ahorro?.fondoEmergencia;
  const momento = momentoInversion(inversiones, {
    fondoActivo: fondo?.activo === true,
    fondoCompletado: fondo?.completado === true,
  });
  const total = calcularTotalInvertido(inversiones);
  const cols = columnasPortafolio(inversiones);
  const unica = momento?.numero === 1 ? inversiones.find(i => Number(i?.monto) > 0) : null;
  const vence = unica ? fechaVencimientoInversion(unica) : null;

  const pastilla = cols && cols.rendimiento > 0
    ? `<p class="reservas-resumen__pastilla">${_icono('i-trending-up')}Al vencer, el tiempo le suma <strong class="inv-tiempo">${_m(cols.rendimiento)}</strong></p>`
    : '';

  let leyenda = '';
  if (cols && unica) {
    leyenda = `
        <li><i data-seg="0"></i><span>Lo pusiste tú</span><strong>${_m(cols.totalInvertido)}</strong></li>
        ${cols.rendimiento > 0 ? `<li><i data-seg="tiempo"></i><span>Lo pone el tiempo${vence ? `, a ${mesCorto(vence)}` : ''}</span><strong class="inv-tiempo">${_m(cols.rendimiento)}</strong></li>` : ''}`;
  } else if (cols) {
    leyenda = cols.segmentos.map((s, i) => `
        <li><i data-seg="${Math.min(i, 4)}"></i><span>${_esc(s.tipo)}${rasgoTipo(s.tipo) ? ` · ${_esc(rasgoTipo(s.tipo))}` : ''}</span><strong>${s.pct}%</strong></li>`).join('');
  }

  const etapa = momento ? `
    <article class="inv-etapa" data-dom="inversion" aria-labelledby="inv-etapa-titulo">
      <p class="inv-etapa__kicker">${_esc(momento.etapa)} · ${_esc(momento.chip)}</p>
      <h2 class="inv-etapa__titulo" id="inv-etapa-titulo">${_esc(momento.titulo)}</h2>
      <p class="inv-etapa__frase">${_esc(momento.frase)}</p>
      ${cols ? _barra(cols) : ''}
      ${leyenda ? `<ul class="inv-leyenda" role="list">${leyenda}</ul>` : ''}
      ${nota ? `<div class="inv-etapa__nota">${nota}</div>` : ''}
      <p class="inv-etapa__sigue"><strong>${_esc(momento.anticipoKicker)}:</strong> ${_esc(momento.anticipo.charAt(0).toLowerCase() + momento.anticipo.slice(1))}</p>
    </article>` : '';

  const aviso = momento?.aviso ? `
    <p class="metas-fondo">${_icono('i-ahorro')}<span class="metas-fondo__texto">${_esc(momento.aviso.titulo)}. ${_esc(momento.aviso.desc)}</span> <a class="link metas-fondo__ir" href="#fondo">Ir al fondo</a></p>` : '';

  const ordenadas = ordenarInversionesPorMonto(inversiones);
  const pie = cols && cols.proyectables > 0
    ? '<p class="inv-pie">Son cálculos con la tasa y el plazo que registraste, no una promesa. Confírmalos con tu entidad.</p>'
    : '';

  return `
    <section class="reservas-resumen" aria-labelledby="inv-resumen-titulo">
      <h2 class="reservas-resumen__rotulo" id="inv-resumen-titulo">Lo que pusiste a crecer</h2>
      <p class="reservas-resumen__total">${_m(total)}</p>
      ${pastilla}
    </section>
    ${etapa}
    ${aviso}
    <section class="bolsa-grupo" aria-labelledby="inv-lista-titulo">
      <div class="bolsa-grupo__head">
        <h2 class="bolsa-grupo__titulo inv-lista__titulo" id="inv-lista-titulo">Tus inversiones</h2>
        ${ordenadas.length > 1 ? `<p class="bolsa-grupo__suma">${ordenadas.length}</p>` : ''}
      </div>
      <div class="bolsa-lista">${ordenadas.map(_fila).join('')}</div>
    </section>
    ${pie}`;
}

/**
 * HTML de la hoja de una inversión. El título lleva el id que nombra a la
 * hoja (`#modal-detalle-fila`, `aria-labelledby`).
 *
 * @param {import('../../core/state.js').Inversion} inv
 * @returns {string}
 */
export function htmlDetalleInversion(inv) {
  const id = _esc(inv.id);
  const nombre = _esc(inv.nombre);
  const monto = Number(inv.monto) || 0;
  const proy = proyectarInversion(inv);
  const vence = fechaVencimientoInversion(inv);

  const sub = [_esc(inv.tipo), inv.fechaInicio ? `desde el ${fechaLegible(inv.fechaInicio)}` : ''].filter(Boolean).join(' · ');

  let cifra;
  if (proy) {
    const escala = monto + Math.max(0, proy.rendimiento);
    const ancho = Math.round((monto / escala) * 10000) / 100;
    cifra = `
    <p class="detalle-inv__rotulo">Al vencer${vence ? `, en ${mesCorto(vence)},` : ''} tendrías</p>
    <p class="detalle-fila__monto">${_m(proy.valorFuturo)}</p>
    <span class="inv-barra" aria-hidden="true"><span data-seg="0" style="width:${ancho}%"></span><span data-seg="tiempo" style="width:${Math.round((100 - ancho) * 100) / 100}%"></span></span>
    <ul class="inv-leyenda" role="list">
      <li><i data-seg="0"></i><span>Lo pusiste tú</span><strong>${_m(monto)}</strong></li>
      <li><i data-seg="tiempo"></i><span>Lo pone el tiempo</span><strong class="inv-tiempo">${_m(proy.rendimiento)}</strong></li>
    </ul>
    <p class="detalle-inv__nota">Es un cálculo con la tasa y el plazo que registraste, no una promesa.</p>`;
  } else {
    cifra = `
    <p class="detalle-inv__rotulo">Lo que pusiste</p>
    <p class="detalle-fila__monto">${_m(monto)}</p>
    <p class="detalle-inv__nota">${Number(inv.tasaEA) > 0
      ? 'Agrega el plazo y Finko calcula cuánto tendrías al final.'
      : 'Es de las que suben o bajan: no tiene una ganancia fija que calcular.'}</p>`;
  }

  const cuenta = inv.cuentaId ? (S.cuentas ?? []).find(c => c.id === inv.cuentaId) : null;
  const datos = [
    ['Tasa', Number(inv.tasaEA) > 0 ? `${fmtTasa(inv.tasaEA)}% efectivo anual` : 'Variable'],
    ['Plazo', Number(inv.plazoMeses) > 0
      ? `${inv.plazoMeses} ${Number(inv.plazoMeses) === 1 ? 'mes' : 'meses'}${vence ? ` · vence el ${fechaLegible(vence)}` : ''}`
      : 'Sin plazo fijo'],
    ['Origen del dinero', inv.cuentaId
      ? `Salió de ${_esc(cuenta?.nombre ?? 'una de tus cuentas')}`
      : 'Ya existía, no salió de tus cuentas'],
  ].map(([k, v]) => `
      <div class="detalle-gasto__dato"><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  const boton = (accion, etiqueta, clase) => `
        <button type="button" class="${clase} detalle-fila__accion" data-dom="inversion"
                data-action="registrar-abrir" data-target-action="${accion}" data-id="${id}">${etiqueta}</button>`;

  return `
    <div class="detalle-fila__cabeza">
      <div class="detalle-fila__icono inv-fila__teja" aria-hidden="true">${iconoCategoria('i-inversion', 'icon')}</div>
      <div class="detalle-fila__textos">
        <h2 class="detalle-fila__titulo" id="detalle-fila-titulo">${nombre}</h2>
        <p class="detalle-fila__sub">${sub}</p>
      </div>
    </div>
    ${cifra}
    <dl class="detalle-gasto__datos">${datos}
    </dl>
    <div class="detalle-fila__acciones detalle-compromiso__acciones">${boton('inversion-editar', `${_icono('i-edit')}Editar la inversión`, 'btn btn-secondary')}
    </div>
    <div class="detalle-fila__peligro">${boton('inversion-eliminar', `${_icono('i-trash')}Eliminar esta inversión`, 'btn btn-ghost detalle-fila__accion--peligro')}
      <p class="detalle-gasto__al-borrar">Te pediremos confirmar.</p>
    </div>`;
}
