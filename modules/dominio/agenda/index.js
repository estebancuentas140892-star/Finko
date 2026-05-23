/**
 * agenda/index.js - API pública del dominio Agenda.
 *
 * Responsabilidades:
 * - Registrar acciones data-action (navegación mes anterior/siguiente).
 * - Re-renderizar cuando cambia S.compromisos o el usuario llega al hash.
 * - Coordinar logic.js + view.js sin generar HTML ni hacer cálculos aquí.
 */

import { EventBus } from '../../core/state.js';
import { renderSmart, registrarRender } from '../../infra/render.js';
import { registrarAccion } from '../../ui/actions.js';
import { renderAgenda, navegarMes, mostrarDia, renderCardHoy } from './view.js';

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

  // Card "Hoy" en Dashboard: se mantiene sincronizada en cada render global.
  registrarRender(() => renderSmart(renderCardHoy, 'dash'));

  EventBus.on('state:change', ({ section }) => {
    if (section === 'compromisos') {
      renderSmart(renderAgenda, 'agenda');
    }
  });

  // Re-render al navegar: agenda y también el dashboard (card Hoy).
  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1) || 'dash';
    if (hash === 'agenda') renderSmart(renderAgenda, 'agenda');
    if (hash === 'dash')   renderSmart(renderCardHoy, 'dash');
  });

  renderSmart(renderAgenda, 'agenda');
  renderSmart(renderCardHoy, 'dash');
}
