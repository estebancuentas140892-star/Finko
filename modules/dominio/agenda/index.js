/**
 * agenda/index.js - API pública del dominio Agenda.
 *
 * Responsabilidades:
 * - Suscribirse a EventBus para re-renderizar cuando cambian compromisos.
 * - Re-render al navegar a #agenda.
 * - Coordinar logic.js + view.js (sub-tareas 2-4).
 */

import { EventBus } from '../../core/state.js';
import { renderSmart } from '../../infra/render.js';
import { renderAgenda } from './view.js';

export function initAgenda() {
  EventBus.on('state:change', ({ section }) => {
    if (section === 'compromisos') {
      renderSmart(renderAgenda, 'agenda');
    }
  });

  // Re-render al navegar a #agenda. Sin esto la sección puede aparecer vacía
  // cuando el usuario llega navegando desde otra (no hay state:change que la dispare).
  window.addEventListener('hashchange', () => {
    if (location.hash.slice(1) === 'agenda') {
      renderSmart(renderAgenda, 'agenda');
    }
  });

  renderSmart(renderAgenda, 'agenda');
}
