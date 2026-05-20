/**
 * gastos/index.js - API pública del dominio de gastos.
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
import { renderSmart, updSaldo } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { hoy } from '../../infra/utils.js';
import { confirmar } from '../../ui/confirm.js';
import { validarGasto, normalizarGasto } from './logic.js';
import { renderListaGastos, renderResumenGastos, renderFormGasto } from './view.js';

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _nuevoGasto() {
  const overlay = document.getElementById('modal-gasto');
  if (!overlay) return;
  resetModal(overlay);

  // Pre-rellenar la fecha con hoy para mejor UX.
  const fechaInput = overlay.querySelector('#gasto-fecha');
  if (fechaInput) fechaInput.value = hoy();

  abrirModal(overlay);
}

function _guardarGasto() {
  const form = document.getElementById('form-gasto');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarGasto(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  guardar('gastos', normalizarGasto(datos));

  const overlay = document.getElementById('modal-gasto');
  if (overlay) cerrarModal(overlay);

  renderResumenGastos();
  renderListaGastos();
  updSaldo();
  announce('Gasto guardado correctamente.');
}

/** @param {HTMLElement} el */
async function _eliminarGasto(el) {
  const id = el.dataset.id;
  if (!id) return;

  const gasto = S.gastos.find(g => g.id === id);
  if (!gasto) return;

  const ok = await confirmar({
    titulo:         'Eliminar gasto',
    mensaje:        `¿Querés eliminar "${gasto.descripcion}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('gastos', id);
  renderResumenGastos();
  renderListaGastos();
  updSaldo();
  announce(`Gasto "${gasto.descripcion}" eliminado.`);
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────

function _inyectarForm() {
  const body = document.getElementById('modal-gasto-body');
  if (!body) return;

  body.innerHTML = renderFormGasto();

  body.querySelector('#form-gasto')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarGasto();
  });
}

export function initGastos() {
  registrarAccion('nuevo-gasto', _nuevoGasto);
  registrarAccion('eliminar-gasto', _eliminarGasto);

  _inyectarForm();

  EventBus.on('state:change', ({ section }) => {
    if (section === 'gastos') {
      renderSmart(renderListaGastos, 'gast');
      renderResumenGastos();
      updSaldo();
    }
  });

  // Re-render al navegar a #gast - sin esto la sección puede aparecer vacía
  // cuando el usuario llega navegando desde otra (no hay state:change que la dispare).
  window.addEventListener('hashchange', () => {
    renderSmart(renderListaGastos, 'gast');
  });

  renderSmart(renderListaGastos, 'gast');
  renderResumenGastos();
}
