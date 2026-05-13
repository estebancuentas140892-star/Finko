/**
 * ingresos/index.js — API pública del dominio de ingresos.
 *
 * Responsabilidades:
 * - Registrar acciones data-action propias del dominio.
 * - Inyectar el formulario en el modal en el arranque.
 * - Suscribirse a EventBus para re-renderizar cuando el estado cambia.
 * - Coordinar logic.js + view.js sin hacer cálculos ni generar HTML aquí.
 */

import { S, EventBus } from '../../core/state.js';
import { guardar, eliminar } from '../../infra/crud.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal, resetModal } from '../../ui/modales.js';
import { renderSmart, updSaldo, registrarRender } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { dialogo } from '../../infra/utils.js';
import { validarIngreso, normalizarIngreso } from './logic.js';
import { renderListaIngresos, renderResumenIngresos, renderFormIngreso } from './view.js';

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _nuevoIngreso() {
  const overlay = document.getElementById('modal-ingreso');
  if (!overlay) return;
  resetModal(overlay);
  abrirModal(overlay);
}

function _guardarIngreso() {
  const form = document.getElementById('form-ingreso');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarIngreso(datos);

  if (errores.length > 0) {
    announce(errores[0], 'assertive');
    return;
  }

  guardar('ingresos', normalizarIngreso(datos));

  const overlay = document.getElementById('modal-ingreso');
  if (overlay) cerrarModal(overlay);

  renderResumenIngresos();
  renderListaIngresos();
  updSaldo();
  announce('Ingreso guardado correctamente.');
}

/** @param {HTMLElement} el */
function _eliminarIngreso(el) {
  const id = el.dataset.id;
  if (!id) return;

  const ingreso = S.ingresos.find(i => i.id === id);
  if (!ingreso) return;

  if (!dialogo(`¿Eliminar "${ingreso.descripcion}"? Esta acción no se puede deshacer.`)) return;

  eliminar('ingresos', id);
  renderResumenIngresos();
  renderListaIngresos();
  updSaldo();
  announce(`Ingreso "${ingreso.descripcion}" eliminado.`);
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────

function _inyectarForm() {
  const body = document.getElementById('modal-ingreso-body');
  if (!body) return;

  body.innerHTML = renderFormIngreso();

  body.querySelector('#form-ingreso')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarIngreso();
  });
}

export function initIngresos() {
  registrarAccion('nuevo-ingreso', _nuevoIngreso);
  registrarAccion('eliminar-ingreso', _eliminarIngreso);

  _inyectarForm();
  registrarRender(renderResumenIngresos);

  EventBus.on('state:change', ({ section }) => {
    if (section === 'ingresos') {
      renderSmart(renderListaIngresos, 'ingresos');
      renderResumenIngresos();
      updSaldo();
    }
  });

  renderSmart(renderListaIngresos, 'ingresos');
  renderResumenIngresos();
}
