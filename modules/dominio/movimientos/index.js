/**
 * movimientos/index.js - dominio de solo lectura para la Actividad reciente
 * de Inicio (TX.8a, ADR 028 D5).
 *
 * Sin acciones propias (no crea/edita/borra nada): solo re-renderiza el panel
 * cuando cambian sus fuentes (gastos, ingresos puntuales, ahorro) o al
 * navegar de vuelta a Inicio.
 */

import { EventBus } from '../../core/state.js';
import { renderSmart, registrarRender } from '../../infra/render.js';
import { renderActividadReciente } from './view.js';

/** Secciones cuyos cambios pueden alterar el historial de movimientos. */
const _SECCIONES_FUENTE = ['gastos', 'ingresosPuntuales', 'ahorro'];

export function initMovimientos() {
  EventBus.on('state:change', ({ section }) => {
    if (_SECCIONES_FUENTE.includes(section)) {
      renderSmart(renderActividadReciente, 'dash');
    }
  });

  // Re-render al navegar a #dash - sin esto el panel aparece vacío si el
  // usuario llega navegando desde otra sección.
  window.addEventListener('hashchange', () => {
    renderSmart(renderActividadReciente, 'dash');
  });

  // Para que renderAll() (bootstrap) también pinte el panel.
  registrarRender(() => renderSmart(renderActividadReciente, 'dash'));

  renderSmart(renderActividadReciente, 'dash');
}
