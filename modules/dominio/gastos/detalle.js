/**
 * gastos/detalle.js - la hoja de un gasto (ADR 119 D2, MV2.3 tanda 4).
 *
 * Hasta acá la hoja de la fila copiaba lo que la fila ya decía y sus tres
 * botones (ADR 098 D4). La pantalla "Detalle de un gasto" del canvas pide lo
 * que se viene a preguntar al tocar un gasto: de qué cuenta salió, cómo va el
 * límite de su categoría ese mes, cuántos gastos más hay de esa categoría y qué
 * pasa si se borra. Se arma acá, con los datos del gasto y no del DOM.
 *
 * Las acciones viajan por `registrar-abrir`, el mismo puente de la hoja
 * genérica: cierra la hoja y recién ahí abre el formulario o la confirmación.
 *
 * Puede leer S. No puede mutarlo.
 */

import { S } from '../../core/state.js';
import { f, hoy, formateadorFecha, esc as _esc } from '../../infra/utils.js';
import { icon, tejaCategoria } from '../../infra/icons.js';
import { SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { iconoDeCategoriaGasto } from '../../core/constants.js';
import { calcularProgreso, presupuestosActivos } from '../presupuesto/logic.js';
import { iconoPorOrigen, deltasPorEdicionDeGasto } from './logic.js';

const _MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Fecha ISO de hace `dias` días, en hora local. */
function _isoHace(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * "Ayer, martes 27 de octubre": hoy y ayer se nombran; el año, solo si no es
 * el actual. Mediodía UTC para que el día no se corra en GMT-5.
 *
 * @param {string} iso 'YYYY-MM-DD'
 * @returns {string}
 */
export function cuandoGasto(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) return '';
  const opciones = { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' };
  if (iso.slice(0, 4) !== hoy().slice(0, 4)) opciones.year = 'numeric';
  const fecha = formateadorFecha('es-CO', opciones).format(new Date(`${iso}T12:00:00Z`)).replace(/,/g, '');
  if (iso === hoy()) return `Hoy, ${fecha}`;
  if (iso === _isoHace(1)) return `Ayer, ${fecha}`;
  return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

/**
 * HTML de la hoja de un gasto. El título lleva el id que nombra a la hoja
 * (`#modal-detalle-fila`, `aria-labelledby`).
 *
 * @param {import('../../core/state.js').Gasto} gasto
 * @returns {string}
 */
export function htmlDetalleGasto(gasto) {
  const oculto = S.config?.ocultarSaldo === true;
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const id = _esc(gasto.id);
  const catKey = gasto.categoria ?? 'Otros';
  const cat = _esc(catKey);
  const simbolo = iconoPorOrigen(gasto, S.compromisos, S.categoriasPersonalizadas)
    ?? iconoDeCategoriaGasto(catKey, S.categoriasPersonalizadas);

  const cuenta = (S.cuentas ?? []).find(c => c.id === gasto.cuentaId)?.nombre ?? '';
  const nota = [gasto.descripcion?.trim(), gasto.nota?.trim()].filter(Boolean).join(' · ');
  const datos = [
    cuenta && ['Salió de', cuenta],
    nota && ['Nota', nota],
    ['Categoría', catKey],
  ].filter(Boolean).map(([k, v]) => `
      <div class="detalle-gasto__dato"><dt>${k}</dt><dd>${_esc(v)}</dd></div>`).join('');

  // El mes del gasto, no el actual: un gasto de septiembre habla de septiembre.
  const anio = Number(String(gasto.fecha).slice(0, 4));
  const mesNum = Number(String(gasto.fecha).slice(5, 7));
  const mes = _MESES[mesNum - 1] ?? '';
  const prefijo = String(gasto.fecha).slice(0, 7);
  const ultimo = new Date(anio, mesNum, 0).getDate();

  const tope = presupuestosActivos(S.presupuestos).find(p => p.categoria === catKey);
  const limite = tope
    ? (() => {
        const { gastado, asignado } = calcularProgreso(tope, S.gastos ?? [], anio, mesNum);
        return `
      <p class="detalle-gasto__limite">${cat} lleva <strong>${m(gastado)}</strong> de su límite de ${m(asignado)} en ${mes}.
        <a class="link" href="#presupuesto" data-action="ir-a-seccion" data-target="presupuesto">Ver límite</a></p>`;
      })()
    : '';

  const delMes = (S.gastos ?? []).filter(g => g.fecha?.startsWith(prefijo) && (g.categoria ?? 'Otros') === catKey).length;
  const cuantos = delMes === 1 ? `El único gasto de ${cat} en ${mes}` : `Los ${delMes} gastos de ${cat} en ${mes}`;

  // Lo que dice la confirmación, dicho antes: borrar devuelve el monto a su
  // cuenta (un gasto importado no mueve saldos, HF.0c).
  const devuelve = Object.entries(deltasPorEdicionDeGasto(gasto, null));
  const alBorrar = devuelve.length === 1 && cuenta
    ? `Te pediremos confirmar. Los ${m(devuelve[0][1])} vuelven a ${_esc(cuenta)}.`
    : 'Te pediremos confirmar.';

  const boton = (accion, etiqueta, simboloBtn, clase = 'btn-secondary') => `
        <button type="button" class="btn ${clase} detalle-fila__accion"
                data-action="registrar-abrir" data-target-action="${accion}" data-id="${id}">
          <svg class="icon" aria-hidden="true"><use href="#${simboloBtn}"/></svg>${etiqueta}</button>`;

  return `
    <div class="detalle-fila__cabeza">
      <div class="detalle-fila__icono" aria-hidden="true">${tejaCategoria(simbolo, 'gastos')}</div>
      <div class="detalle-fila__textos">
        <h2 class="detalle-fila__titulo" id="detalle-fila-titulo">${cat}</h2>
      </div>
    </div>
    <div class="detalle-gasto__monto">
      <p class="detalle-fila__monto">${m(Number(gasto.monto) || 0)}</p>
      <p class="detalle-fila__cuando">${_esc(cuandoGasto(gasto.fecha))}</p>
    </div>
    <dl class="detalle-gasto__datos">${datos}
    </dl>${limite}
    <div class="detalle-fila__acciones detalle-gasto__acciones">${boton('repetir-gasto', 'Repetir hoy', 'i-recurring')}${boton('editar-gasto', 'Editar', 'i-edit')}
    </div>
    <button type="button" class="detalle-gasto__ver" data-action="gasto-ver-categoria"
            data-categoria="${cat}" data-desde="${prefijo}-01" data-hasta="${prefijo}-${String(ultimo).padStart(2, '0')}">
      <span class="detalle-gasto__ver-textos">
        <span class="detalle-gasto__ver-titulo">${cuantos}</span>
        <span class="detalle-gasto__ver-sub">Se abre Movimientos con el filtro puesto</span>
      </span>
      ${icon('chevron-right')}
    </button>
    <div class="detalle-fila__peligro">${boton('eliminar-gasto', 'Borrar este gasto', 'i-trash', 'btn-ghost detalle-fila__accion--peligro')}
      <p class="detalle-gasto__al-borrar">${alBorrar}</p>
    </div>`;
}
