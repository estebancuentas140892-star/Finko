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
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal, resetModal } from '../../ui/modales.js';
import { renderSmart, updSaldo } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { hoy } from '../../infra/utils.js';
import { confirmar } from '../../ui/confirm.js';
import { validarGasto, normalizarGasto, validarGastoRapido, normalizarGastoRapido } from './logic.js';
import { renderListaGastos, renderResumenGastos, renderFormGasto } from './view.js';

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _nuevoGasto() {
  const overlay = document.getElementById('modal-gasto');
  if (!overlay) return;
  resetModal(overlay);

  // Pre-rellenar la fecha con hoy para mejor UX.
  const fechaInput = overlay.querySelector('#gasto-fecha');
  if (fechaInput) fechaInput.value = hoy();

  // Limpiar marcador de edicion para que el form se comporte como "nuevo".
  const form = document.getElementById('form-gasto');
  if (form) delete form.dataset.id;
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Nuevo gasto';

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

  const idEdit = form.dataset.id || null;
  const gasto  = normalizarGasto(datos);

  if (idEdit) {
    editar('gastos', idEdit, gasto);
  } else {
    guardar('gastos', gasto);
  }

  const overlay = document.getElementById('modal-gasto');
  if (overlay) cerrarModal(overlay);

  renderResumenGastos();
  renderListaGastos();
  updSaldo();
  announce(idEdit ? 'Gasto actualizado.' : 'Gasto guardado correctamente.');
}

/** Abre el modal de gasto en modo edicion con datos pre-rellenados. */
function _editarGasto(el) {
  const id = el.dataset.id;
  if (!id) return;
  const gasto = S.gastos.find(g => g.id === id);
  if (!gasto) return;

  const overlay = document.getElementById('modal-gasto');
  if (!overlay) return;

  resetModal(overlay);
  const form = document.getElementById('form-gasto');
  if (!form) return;

  form.dataset.id = id;
  form.querySelector('[name="descripcion"]').value = gasto.descripcion ?? '';
  form.querySelector('[name="monto"]').value       = gasto.monto       ?? 0;
  form.querySelector('[name="categoria"]').value   = gasto.categoria   ?? 'Otros';
  form.querySelector('[name="fecha"]').value       = gasto.fecha       ?? hoy();
  const notaEl = form.querySelector('[name="nota"]');
  if (notaEl) notaEl.value = gasto.nota ?? '';

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) {
    titulo.textContent = gasto.pendienteCompletar
      ? '📝 Completar gasto'
      : 'Editar gasto';
  }

  abrirModal(overlay);
}

// ── GASTO RAPIDO ─────────────────────────────────────────────────

/** Abre el modal de gasto rapido con focus en el input de monto. */
function _abrirGastoRapido() {
  const overlay = document.getElementById('modal-gasto-rapido');
  if (!overlay) return;
  const form = overlay.querySelector('#form-gasto-rapido');
  if (form) {
    // Quitar bloque de errores si quedo de un intento anterior.
    form.querySelector('.form-errors')?.remove();
    form.querySelectorAll('.field-invalid').forEach(el => el.classList.remove('field-invalid'));
    form.querySelector('[name="monto"]').value = '';
  }
  abrirModal(overlay);
  // Focus en el input despues de la animacion de entrada.
  setTimeout(() => {
    overlay.querySelector('#gasto-rapido-monto')?.focus();
  }, 200);
}

function _guardarGastoRapido() {
  const form = document.getElementById('form-gasto-rapido');
  if (!form) return;

  const monto = form.querySelector('[name="monto"]').value;
  const errores = validarGastoRapido(monto);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const nuevo = normalizarGastoRapido(monto, hoy());
  guardar('gastos', nuevo);

  // Tomar el id del ultimo gasto (crud.js lo asigno).
  const ultimo = S.gastos[S.gastos.length - 1];

  const overlay = document.getElementById('modal-gasto-rapido');
  if (overlay) cerrarModal(overlay);

  renderResumenGastos();
  renderListaGastos();
  updSaldo();

  announce('Gasto rápido guardado. Lo podés completar después en Gastos.');
  _toastGastoRapido(ultimo);
}

/**
 * Muestra un toast con accion "Completar" para abrir el edit del gasto recien creado.
 * Auto-cierra a los 4s. Se elimina si el usuario navega o cierra manualmente.
 */
function _toastGastoRapido(gasto) {
  // Limpiar toast anterior si existe.
  document.querySelector('.quick-toast')?.remove();

  const toast = document.createElement('div');
  toast.className = 'quick-toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <span class="quick-toast__check" aria-hidden="true">✓</span>
    <span class="quick-toast__body">
      <span class="quick-toast__title">Gasto guardado</span>
      <span class="quick-toast__amount">${_fmtMonto(gasto.monto)}</span>
    </span>
    <button type="button" class="quick-toast__action"
            data-action="editar-gasto" data-id="${gasto.id}">
      Completar
    </button>
    <button type="button" class="quick-toast__close" aria-label="Cerrar">×</button>`;

  document.body.appendChild(toast);

  const cerrar = () => {
    toast.classList.add('fade');
    setTimeout(() => toast.remove(), 300);
  };
  toast.querySelector('.quick-toast__close').addEventListener('click', cerrar);

  // El boton "Completar" tiene data-action="editar-gasto" data-id="...".
  // No registramos listener especifico aqui: actions.js delega el click
  // al handler _editarGasto via burbujeo. Lo unico que hacemos es quitar
  // el toast TRAS abrir el modal (microtask delay para que el modal
  // termine de renderizarse).
  toast.querySelector('.quick-toast__action').addEventListener('click', () => {
    setTimeout(cerrar, 50);
  });

  // Auto-cerrar a los 4 segundos.
  setTimeout(() => {
    if (document.body.contains(toast)) cerrar();
  }, 4000);
}

function _fmtMonto(n) {
  const abs = Math.abs(Math.round(n));
  return '$' + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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

  // El form de gasto rapido vive directamente en index.html (no necesita inyectar
  // HTML porque es muy simple). Atachar el submit aqui.
  document.getElementById('form-gasto-rapido')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarGastoRapido();
  });
}

export function initGastos() {
  registrarAccion('nuevo-gasto', _nuevoGasto);
  registrarAccion('editar-gasto', _editarGasto);
  registrarAccion('eliminar-gasto', _eliminarGasto);
  registrarAccion('gasto-rapido', _abrirGastoRapido);

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
