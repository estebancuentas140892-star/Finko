/**
 * presupuesto/index.js — API pública del dominio de presupuesto.
 *
 * Responsabilidades:
 * - Registrar acciones data-action: nuevo-presupuesto, editar-presupuesto, eliminar-presupuesto.
 * - Coordinar logic.js + view.js.
 * - Inyectar el formulario en el modal según contexto (crear vs editar).
 * - Suscribirse a EventBus para re-render cuando cambian presupuestos O gastos
 *   (los gastos afectan el progreso visual de los envelopes).
 */

import { S, EventBus }                from '../../core/state.js';
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { registrarAccion }           from '../../ui/actions.js';
import { abrirModal, cerrarModal }   from '../../ui/modales.js';
import { renderSmart }               from '../../infra/render.js';
import { announce }                  from '../../infra/a11y.js';
import { dialogo }                   from '../../infra/utils.js';
import { validarPresupuesto, normalizarPresupuesto } from './logic.js';
import { renderPanelPresupuesto, renderFormPresupuesto } from './view.js';

// ── HELPERS DE MODAL ─────────────────────────────────────────────

function _getOverlay() {
  return document.getElementById('modal-presupuesto');
}

function _setBody(html) {
  const body = document.getElementById('modal-presupuesto-body');
  if (body) body.innerHTML = html;
}

function _wireForm() {
  const form = document.getElementById('form-presupuesto');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarPresupuesto(form);
  });
}

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _nuevoPresupuesto() {
  const overlay = _getOverlay();
  if (!overlay) return;
  _setBody(renderFormPresupuesto(null));
  _wireForm();
  abrirModal(overlay);
}

/** @param {HTMLElement} el */
function _editarPresupuesto(el) {
  const id = el.dataset.id;
  if (!id) return;
  const actual = S.presupuestos.find(p => p.id === id);
  if (!actual) return;

  const overlay = _getOverlay();
  if (!overlay) return;
  _setBody(renderFormPresupuesto(actual));
  _wireForm();
  abrirModal(overlay);
}

/** @param {HTMLFormElement} form */
function _guardarPresupuesto(form) {
  const datos    = Object.fromEntries(new FormData(form));
  const idActual = form.dataset.id || null;
  const errores  = validarPresupuesto(datos, S.presupuestos, idActual);

  if (errores.length > 0) {
    announce(errores[0], 'assertive');
    return;
  }

  if (idActual) {
    editar('presupuestos', idActual, { montoMensual: Number(datos.montoMensual) });
    announce('Presupuesto actualizado.');
  } else {
    guardar('presupuestos', normalizarPresupuesto(datos));
    announce(`Presupuesto creado para "${datos.categoria}".`);
  }

  const overlay = _getOverlay();
  if (overlay) cerrarModal(overlay);
  renderPanelPresupuesto();
}

/** @param {HTMLElement} el */
function _eliminarPresupuesto(el) {
  const id = el.dataset.id;
  if (!id) return;
  const p = S.presupuestos.find(x => x.id === id);
  if (!p) return;

  if (!dialogo(`¿Eliminar el presupuesto de "${p.categoria}"? Los gastos no se ven afectados.`)) return;

  eliminar('presupuestos', id);
  renderPanelPresupuesto();
  announce(`Presupuesto de "${p.categoria}" eliminado.`);
}

// ── INIT ─────────────────────────────────────────────────────────

export function initPresupuesto() {
  registrarAccion('nuevo-presupuesto',    _nuevoPresupuesto);
  registrarAccion('editar-presupuesto',   _editarPresupuesto);
  registrarAccion('eliminar-presupuesto', _eliminarPresupuesto);

  // Los gastos afectan el progreso visual; re-render ante cualquier cambio
  // de gastos o de presupuestos.
  EventBus.on('state:change', ({ section }) => {
    if (section === 'presupuestos' || section === 'gastos') {
      renderSmart(renderPanelPresupuesto, 'presupuesto');
    }
  });

  renderSmart(renderPanelPresupuesto, 'presupuesto');

  // El hash routing puede entrar tarde a esta sección; re-renderizamos al navegar.
  window.addEventListener('hashchange', () => {
    renderSmart(renderPanelPresupuesto, 'presupuesto');
  });
}
