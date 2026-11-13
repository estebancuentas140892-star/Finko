/**
 * presupuesto/detalle.js - la hoja de un tope de Límites (ADR 132 D8).
 *
 * El tablero pide, al tocar un tope, lo que se viene a mirar: lo gastado
 * contra el tope con su barra, en cuánto se pasó o cuánto queda, el aviso de
 * ese tope, la salida a sus gastos del mes y "Cambiar el límite"; quitarlo va
 * aparte. Hasta acá cada sobre llevaba tres botones a la vista. Se arma con
 * los datos del tope, no con el DOM, como la hoja del gasto (ADR 119 D2).
 *
 * Las acciones viajan por `registrar-abrir`: cierra la hoja y recién ahí abre
 * el formulario, la confirmación o Movimientos, con el mismo `data-*`.
 *
 * Puede leer S. No puede mutarlo.
 */

import { S } from '../../core/state.js';
import { f, esc as _esc } from '../../infra/utils.js';
import { tejaCategoria } from '../../infra/icons.js';
import { iconoDeCategoriaGasto } from '../../core/constants.js';
import { calcularProgreso, alertasLimites, generarMensajesLimites, progresoHormiga } from './logic.js';
import { estadoDeLimite } from './view.js';

const _MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const _icono = (id) => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;

/**
 * El cuerpo común: cabeza, lo gastado "de" el tope, la barra, el estado con
 * su porcentaje y el aviso. Las acciones las pone cada hoja.
 */
function _cuerpo({ titulo, icono, mes, progreso, aviso }) {
  const { gastado, asignado, porcentaje } = progreso;
  const { texto, tono } = estadoDeLimite(progreso);
  const estado = tono === 'danger'
    ? `Pasó su límite por ${f(-progreso.restante)} · ${porcentaje}%`
    : `${texto} · ${porcentaje}%`;
  const clase = porcentaje > 100 ? 'progress-bar--danger' : porcentaje >= 75 ? 'progress-bar--warn' : '';
  return `
    <div class="detalle-fila__cabeza">
      <div class="detalle-fila__icono" aria-hidden="true">${tejaCategoria(icono, 'presupuesto')}</div>
      <div class="detalle-fila__textos">
        <h2 class="detalle-fila__titulo" id="detalle-fila-titulo">${titulo}</h2>
        <p class="detalle-fila__sub">Límite de ${mes}</p>
      </div>
    </div>
    <div class="detalle-limite__cifra">
      <p class="detalle-fila__monto">${f(gastado)}</p>
      <span class="detalle-limite__tope">de ${f(asignado)}</span>
    </div>
    <div class="progress" role="progressbar" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"
         aria-label="Progreso de ${titulo}: ${porcentaje}%">
      <div class="progress-bar ${clase}" style="width:${Math.min(porcentaje, 100)}%"></div>
    </div>
    <p class="detalle-limite__estado${tono ? ` detalle-limite__estado--${tono}` : ''}">${estado}</p>
    ${aviso ? `<p class="detalle-limite__aviso">${_esc(aviso)}</p>` : ''}`;
}

const _boton = (accion, etiqueta, clase, datos) => `
        <button type="button" class="btn ${clase} detalle-fila__accion" data-action="registrar-abrir"
                data-target-action="${accion}"${datos}>${etiqueta}</button>`;

/**
 * HTML de la hoja de un tope por categoría, en el mes del bloque.
 *
 * @param {import('../../core/state.js').Presupuesto} presupuesto
 * @param {{ anio: number, mes: number }} cuando - mes 1-12.
 * @returns {string}
 */
export function htmlDetalleLimite(presupuesto, { anio, mes }) {
  const gastos = S.gastos ?? [];
  const progreso = calcularProgreso(presupuesto, gastos, anio, mes);
  const cat = _esc(presupuesto.categoria);
  const id = ` data-id="${_esc(presupuesto.id)}"`;
  const nombreMes = _MESES[mes - 1] ?? '';

  // El mismo aviso que el sobre de escritorio (ADR 019 D3), del mismo motor.
  const alerta = alertasLimites([presupuesto], gastos, anio, mes);
  const aviso = generarMensajesLimites({ alertasCategoria: alerta })
    .find(m => m.id === `categoria-${presupuesto.categoria}`)?.mensaje ?? '';

  const prefijo = `${anio}-${String(mes).padStart(2, '0')}`;
  const cuantos = gastos.filter(g => g.fecha?.startsWith(prefijo) && g.categoria === presupuesto.categoria).length;
  const titulo = cuantos === 1 ? `El único gasto de ${cat} en ${nombreMes}`
    : cuantos === 0 ? `Los gastos de ${cat} en ${nombreMes}`
      : `Los ${cuantos} gastos de ${cat} en ${nombreMes}`;

  return `${_cuerpo({ titulo: cat, icono: iconoDeCategoriaGasto(presupuesto.categoria, S.categoriasPersonalizadas), mes: nombreMes, progreso, aviso })}
    <button type="button" class="detalle-gasto__ver" data-action="registrar-abrir"
            data-target-action="presupuesto-ver-movimientos" data-categoria="${cat}">
      <span class="detalle-gasto__ver-textos">
        <span class="detalle-gasto__ver-titulo">${titulo}</span>
        <span class="detalle-gasto__ver-sub">Se abre Movimientos con el filtro puesto</span>
      </span>
      ${_icono('i-chevron-right')}
    </button>
    <div class="detalle-fila__acciones">${_boton('editar-presupuesto', `${_icono('i-edit')}Cambiar el límite`, 'btn-secondary', id)}
    </div>
    <div class="detalle-fila__peligro">${_boton('eliminar-presupuesto', `${_icono('i-trash')}Quitar este límite`, 'btn-ghost detalle-fila__accion--peligro', id)}
      <p class="detalle-gasto__al-borrar">Tus gastos no se borran. Te pediremos confirmar.</p>
    </div>`;
}

/**
 * HTML de la hoja del límite de gastos pequeños: compras de hasta el tope, de
 * cualquier categoría, así que no tiene salida a una categoría de Movimientos.
 *
 * @param {{ anio: number, mes: number }} cuando - mes 1-12.
 * @returns {string}
 */
export function htmlDetalleHormiga({ anio, mes }) {
  const p = progresoHormiga(S.gastos ?? [], S.config, anio, mes);
  const progreso = { gastado: p.gastado, asignado: p.limite ?? 0, restante: p.restante, porcentaje: p.porcentaje, estado: p.estado };
  const compras = `${p.cuantos} ${p.cuantos === 1 ? 'compra' : 'compras'} de ${f(p.tope)} o menos, de cualquier categoría.`;
  return `${_cuerpo({ titulo: 'Gastos pequeños', icono: 'c-hormiga', mes: _MESES[mes - 1] ?? '', progreso, aviso: compras })}
    <div class="detalle-fila__acciones">${_boton('hormiga-editar', `${_icono('i-edit')}Cambiar el límite`, 'btn-secondary', '')}
    </div>
    <div class="detalle-fila__peligro">${_boton('hormiga-quitar', `${_icono('i-trash')}Quitar este límite`, 'btn-ghost detalle-fila__accion--peligro', '')}
      <p class="detalle-gasto__al-borrar">Tus gastos no se borran. Te pediremos confirmar.</p>
    </div>`;
}
