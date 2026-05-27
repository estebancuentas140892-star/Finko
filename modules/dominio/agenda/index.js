/**
 * agenda/index.js - API pública del dominio Agenda.
 *
 * Responsabilidades:
 * - Registrar acciones data-action (navegación mes anterior/siguiente, alta de gasto fijo).
 * - Re-renderizar cuando cambia S.compromisos o el usuario llega al hash.
 * - Coordinar logic.js + view.js sin generar HTML ni hacer cálculos aquí.
 *
 * Alta de gasto fijo:
 * - La sección Agenda es el único punto de entrada para crear `tipo='fijo'`.
 * - Reusa `validarCompromiso` y `normalizarCompromiso` del dominio Compromisos
 *   (las dos funciones son puras y ya cubren el shape de `fijo`).
 */

import { EventBus } from '../../core/state.js';
import { guardar } from '../../infra/crud.js';
import { renderSmart, updateBadge } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { validarCompromiso, normalizarCompromiso } from '../compromisos/logic.js';
import { renderAgenda, renderFormGastoFijo, navegarMes, mostrarDia } from './view.js';

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

// ── HANDLERS DEL MODAL "NUEVO GASTO FIJO" ────────────────────────

function _nuevoGastoFijo() {
  const overlay = document.getElementById('modal-gasto-fijo');
  if (!overlay) return;
  // Re-inyectamos el form en cada apertura: `resetModal` borraría los defaults
  // del select (Mensual) y el hidden `tipo=fijo`, dejando el form invalido.
  _inyectarFormGastoFijo();
  abrirModal(overlay);
}

function _guardarGastoFijo() {
  const form = document.getElementById('form-gasto-fijo');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarCompromiso(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  guardar('compromisos', normalizarCompromiso(datos));

  const overlay = document.getElementById('modal-gasto-fijo');
  if (overlay) cerrarModal(overlay);

  renderAgenda();
  updateBadge();
  announce('Gasto fijo guardado correctamente.');
}

function _inyectarFormGastoFijo() {
  const body = document.getElementById('modal-gasto-fijo-body');
  if (!body) return;

  body.innerHTML = renderFormGastoFijo();

  body.querySelector('#form-gasto-fijo')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarGastoFijo();
  });
}

// ── INIT ─────────────────────────────────────────────────────────

export function initAgenda() {
  registrarAccion('agenda-prev-mes',    _prevMes);
  registrarAccion('agenda-next-mes',    _nextMes);
  registrarAccion('agenda-mostrar-dia', _mostrarDia);
  registrarAccion('nuevo-gasto-fijo',   _nuevoGastoFijo);

  _inyectarFormGastoFijo();

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
