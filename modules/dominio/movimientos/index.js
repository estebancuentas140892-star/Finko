/**
 * movimientos/index.js - dominio de solo lectura para la Actividad reciente
 * de Inicio (TX.8a, ADR 028 D5).
 *
 * Sin acciones propias (no crea/edita/borra nada): solo re-renderiza el panel
 * cuando cambian sus fuentes (gastos, ingresos puntuales, ahorro) o al
 * navegar de vuelta a Inicio.
 */

import { EventBus } from '../../core/state.js';
import { registrarAccion } from '../../ui/actions.js';
import { renderSmart, registrarRender } from '../../infra/render.js';
import { renderActividadReciente, renderMovimientosCompletos, cargarMasMovimientos } from './view.js';

/** Secciones cuyos cambios pueden alterar el historial de movimientos. */
const _SECCIONES_FUENTE = ['gastos', 'ingresosPuntuales', 'ahorro', 'transferencias'];

function _renderTodo() {
  renderSmart(renderActividadReciente, 'dash');
  renderSmart(renderMovimientosCompletos, 'movimientos');
}

export function initMovimientos() {
  registrarAccion('movimientos-cargar-mas', cargarMasMovimientos);

  EventBus.on('state:change', ({ section }) => {
    if (_SECCIONES_FUENTE.includes(section)) _renderTodo();
  });

  // Re-render al navegar a #dash o #movimientos - sin esto el panel/vista
  // aparece vacío si el usuario llega navegando desde otra sección.
  window.addEventListener('hashchange', _renderTodo);

  // Para que renderAll() (bootstrap) también pinte ambos.
  registrarRender(_renderTodo);

  _renderTodo();
}
