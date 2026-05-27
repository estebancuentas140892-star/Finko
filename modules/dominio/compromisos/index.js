/**
 * compromisos/index.js - API pública del dominio de compromisos.
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
import { renderSmart, updateBadge, registrarRender } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { confirmar } from '../../ui/confirm.js';
import { validarCompromiso, normalizarCompromiso } from './logic.js';
import {
  renderNudgeMoraInminente,
  renderListaCompromisos,
  renderFormCompromiso,
  renderEstrategiaPago,
  setEstrategiaUI,
  renderAlertaFijosSinPagar,
  renderAlertaDeudasDurmiendo,
  renderPanelVencidos,
  renderPanelPrioridades,
} from './view.js';

/**
 * Re-renderiza los paneles del dashboard que dependen de compromisos.
 * Se invoca en cada renderAll() (via registrarRender) para que el dashboard
 * refleje cambios cross-domain (ej. al pagar un gasto que cierra un compromiso).
 */
function _renderDashboardPanels() {
  renderPanelVencidos();
  renderPanelPrioridades();
}

/**
 * Re-renderiza ambas vistas del dominio. Se usa cuando cambian datos o
 * el estado UI de la estrategia (extra mensual, toggle).
 */
function _renderTodo() {
  renderNudgeMoraInminente();
  renderAlertaFijosSinPagar();
  renderAlertaDeudasDurmiendo();
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
    mostrarErroresForm(form, errores);
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
async function _eliminarCompromiso(el) {
  const id = el.dataset.id;
  if (!id) return;

  const compromiso = S.compromisos.find(c => c.id === id);
  if (!compromiso) return;

  const ok = await confirmar({
    titulo:         'Eliminar compromiso',
    mensaje:        `¿Querés eliminar "${compromiso.descripcion}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

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

  // Los paneles de Dashboard (Vencidos + Prioridades) se actualizan en cada
  // renderAll() para reflejar cambios cross-domain (ej. al cerrar un compromiso
  // desde otra sección). renderSmart corta si el dashboard no está activo.
  registrarRender(() => renderSmart(_renderDashboardPanels, 'dash'));

  EventBus.on('state:change', ({ section }) => {
    if (section === 'compromisos') {
      renderSmart(_renderTodo, 'compromisos');
      // El dashboard también depende de compromisos: si el usuario crea/edita/
      // elimina uno y luego vuelve a #dash, el panel debe reflejarlo. renderSmart
      // corta si la sección activa no es 'dash', así que es barato llamarlo siempre.
      renderSmart(_renderDashboardPanels, 'dash');
      updateBadge();
    }
  });

  // Re-render al navegar a #compromisos o #dash.
  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1) || 'dash';
    if (hash === 'compromisos') renderSmart(_renderTodo, 'compromisos');
    if (hash === 'dash')        renderSmart(_renderDashboardPanels, 'dash');
  });

  renderSmart(_renderTodo, 'compromisos');
  renderSmart(_renderDashboardPanels, 'dash');
  updateBadge();
}
