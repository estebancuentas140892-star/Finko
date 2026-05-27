/**
 * agenda/index.js - API pública del dominio Agenda.
 *
 * Responsabilidades:
 * - Registrar acciones data-action (navegación mes anterior/siguiente).
 * - Re-renderizar cuando cambia S.compromisos o el usuario llega al hash.
 * - Coordinar logic.js + view.js sin generar HTML ni hacer cálculos aquí.
 */

import { EventBus } from '../../core/state.js';
import { renderSmart } from '../../infra/render.js';
import { registrarAccion } from '../../ui/actions.js';
import { renderAgenda, navegarMes, mostrarDia } from './view.js';

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _prevMes() {
  navegarMes(-1);
  renderAgenda();
}

function _nextMes() {
  navegarMes(+1);
  renderAgenda();
}

function _mostrarDia(el) {
  const dia = parseInt(el?.dataset?.day, 10);
  if (!Number.isInteger(dia)) return;
  mostrarDia(dia);
  renderAgenda();
}

// ── INIT ─────────────────────────────────────────────────────────

export function initAgenda() {
  registrarAccion('agenda-prev-mes',  _prevMes);
  registrarAccion('agenda-next-mes',  _nextMes);
  registrarAccion('agenda-mostrar-dia', _mostrarDia);

  EventBus.on('state:change', ({ section }) => {
    if (section === 'compromisos') {
      renderSmart(renderAgenda, 'agenda');
    }
  });

  // Re-render al navegar a #agenda.
  window.addEventListener('hashchange', () => {
    if ((location.hash.slice(1) || 'dash') === 'agenda') {
      renderSmart(renderAgenda, 'agenda');
    }
  });

  renderSmart(renderAgenda, 'agenda');
}
