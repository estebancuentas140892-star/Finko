/**
 * compromisos/index.js — API pública del dominio de compromisos.
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
import { renderSmart, updateBadge } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { dialogo } from '../../infra/utils.js';
import { validarCompromiso, normalizarCompromiso } from './logic.js';
import {
  renderNudgeMoraInminente,
  renderListaCompromisos,
  renderFormCompromiso,
  renderEstrategiaPago,
  setEstrategiaUI,
} from './view.js';

/**
 * Re-renderiza ambas vistas del dominio. Se usa cuando cambian datos o
 * el estado UI de la estrategia (extra mensual, toggle).
 */
function _renderTodo() {
  renderNudgeMoraInminente();
  renderListaCompromisos();
  renderEstrategiaPago();
}

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _nuevoCompromiso() {
  const overlay = document.getElementById('modal-compromiso');
  if (!overlay) return;
  resetModal(overlay);
  abrirModal(overlay);
}

function _guardarCompromiso() {
  const form = document.getElementById('form-compromiso');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarCompromiso(datos);

  if (errores.length > 0) {
    announce(errores[0], 'assertive');
    return;
  }

  guardar('compromisos', normalizarCompromiso(datos));

  const overlay = document.getElementById('modal-compromiso');
  if (overlay) cerrarModal(overlay);

  _renderTodo();
  updateBadge();
  announce('Compromiso guardado correctamente.');
}

/** @param {HTMLElement} el */
function _eliminarCompromiso(el) {
  const id = el.dataset.id;
  if (!id) return;

  const compromiso = S.compromisos.find(c => c.id === id);
  if (!compromiso) return;

  if (!dialogo(`¿Eliminar "${compromiso.descripcion}"? Esta acción no se puede deshacer.`)) return;

  eliminar('compromisos', id);
  _renderTodo();
  updateBadge();
  announce(`Compromiso "${compromiso.descripcion}" eliminado.`);
}

// Handlers de la card de estrategia (F.4).
function _elegirEstrategia(el) {
  const estrategia = el.dataset.estrategia;
  if (estrategia !== 'avalancha' && estrategia !== 'bolaNieve') return;
  setEstrategiaUI({ estrategia });
  renderEstrategiaPago();
}

function _cambiarExtraEstrategia(el) {
  setEstrategiaUI({ extraMensual: el.value });
  renderEstrategiaPago();
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────

function _inyectarForm() {
  const body = document.getElementById('modal-compromiso-body');
  if (!body) return;

  body.innerHTML = renderFormCompromiso();

  body.querySelector('#form-compromiso')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarCompromiso();
  });

  // Mostrar/ocultar campos extra cuando el usuario elige tipo='deuda'.
  const selectTipo   = body.querySelector('#comp-tipo');
  const campasDeuda  = body.querySelector('#comp-deuda-campos');
  if (selectTipo && campasDeuda) {
    selectTipo.addEventListener('change', () => {
      campasDeuda.classList.toggle('d-none', selectTipo.value !== 'deuda');
    });
  }
}

export function initCompromisos() {
  registrarAccion('nuevo-compromiso',    _nuevoCompromiso);
  registrarAccion('eliminar-compromiso', _eliminarCompromiso);
  registrarAccion('elegir-estrategia',   _elegirEstrategia);

  _inyectarForm();

  // El input de "extra mensual" usa `change` (al blur) en vez de click,
  // así no perdemos focus durante el tipeo. Delegado a nivel documento.
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.dataset.action === 'cambiar-extra-estrategia') {
      _cambiarExtraEstrategia(t);
    }
  });

  EventBus.on('state:change', ({ section }) => {
    if (section === 'compromisos') {
      renderSmart(_renderTodo, 'compromisos');
      updateBadge();
    }
  });

  // Re-render al navegar a #compromisos — sin esto la sección puede aparecer vacía
  // cuando el usuario llega navegando desde otra (no hay state:change que la dispare).
  window.addEventListener('hashchange', () => {
    renderSmart(_renderTodo, 'compromisos');
  });

  renderSmart(_renderTodo, 'compromisos');
  updateBadge();
}
