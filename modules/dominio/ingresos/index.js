/**
 * ingresos/index.js - API pública del dominio de ingresos.
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
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { confirmar } from '../../ui/confirm.js';
import { validarIngreso, normalizarIngreso } from './logic.js';
import { renderCardIngresos, renderResumenIngresos, renderFormIngreso } from './view.js';

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
    mostrarErroresForm(form, errores);
    return;
  }

  guardar('ingresos', normalizarIngreso(datos));

  const overlay = document.getElementById('modal-ingreso');
  if (overlay) cerrarModal(overlay);

  renderResumenIngresos();
  renderCardIngresos();
  updSaldo();
  announce('Ingreso guardado correctamente.');
}

/** @param {HTMLElement} el */
async function _eliminarIngreso(el) {
  const id = el.dataset.id;
  if (!id) return;

  const ingreso = S.ingresos.find(i => i.id === id);
  if (!ingreso) return;

  const ok = await confirmar({
    titulo:         'Eliminar ingreso',
    mensaje:        `¿Querés eliminar "${ingreso.descripcion}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('ingresos', id);
  renderResumenIngresos();
  renderCardIngresos();
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

  // Re-render la card cuando hay cambios de estado mientras tesorería está visible.
  EventBus.on('state:change', ({ section }) => {
    if (section === 'tesoreria') {
      renderSmart(renderCardIngresos, 'tesoreria');
      renderResumenIngresos();
      updSaldo();
    }
  });

  // Re-render al navegar a #tesoreria (la card puede estar vacía si el usuario
  // llega navegando directamente sin state:change previo).
  window.addEventListener('hashchange', () => {
    renderSmart(renderCardIngresos, 'tesoreria');
  });

  renderSmart(renderCardIngresos, 'tesoreria');
  renderResumenIngresos();
}
