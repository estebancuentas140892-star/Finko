/**
 * metas/index.js — API pública del dominio de metas de ahorro.
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
import { renderSmart } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { dialogo } from '../../infra/utils.js';
import { validarMeta, normalizarMeta, validarAbono, calcularProgreso } from './logic.js';
import { renderListaMetas, renderFormMeta } from './view.js';

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _nuevaMeta() {
  const overlay = document.getElementById('modal-meta');
  if (!overlay) return;
  resetModal(overlay);
  abrirModal(overlay);
}

function _guardarMeta() {
  const form = document.getElementById('form-meta');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarMeta(datos);

  if (errores.length > 0) {
    announce(errores[0], 'assertive');
    return;
  }

  guardar('metas', normalizarMeta(datos));

  const overlay = document.getElementById('modal-meta');
  if (overlay) cerrarModal(overlay);

  renderListaMetas();
  announce('Meta creada correctamente.');
}

/** @param {HTMLElement} el */
function _eliminarMeta(el) {
  const id = el.dataset.id;
  if (!id) return;

  const meta = S.metas.find(m => m.id === id);
  if (!meta) return;

  if (!dialogo(`¿Eliminar la meta "${meta.nombre}"? Esta acción no se puede deshacer.`)) return;

  eliminar('metas', id);
  renderListaMetas();
  announce(`Meta "${meta.nombre}" eliminada.`);
}

/** @param {HTMLElement} el */
function _abonarMeta(el) {
  const id = el.dataset.id;
  if (!id) return;

  const meta = S.metas.find(m => m.id === id);
  if (!meta) return;

  const rawAbono = window.prompt(`¿Cuánto querés abonar a "${meta.nombre}"? (COP)`);
  if (rawAbono === null) return; // usuario canceló

  const errores = validarAbono(rawAbono);
  if (errores.length > 0) {
    dialogo(errores[0], 'alert');
    return;
  }

  const abono = Number(rawAbono);
  const nuevoMonto = (meta.montoActual ?? 0) + abono;
  const { completada } = calcularProgreso({ ...meta, montoActual: nuevoMonto });

  editar('metas', id, { montoActual: nuevoMonto, completada });

  renderListaMetas();
  announce(completada
    ? `¡Meta "${meta.nombre}" completada! 🎉`
    : `Abono de ${abono.toLocaleString('es-CO')} registrado.`
  );
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────

function _inyectarForm() {
  const body = document.getElementById('modal-meta-body');
  if (!body) return;

  body.innerHTML = renderFormMeta();

  body.querySelector('#form-meta')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarMeta();
  });
}

export function initMetas() {
  registrarAccion('nueva-meta',    _nuevaMeta);
  registrarAccion('eliminar-meta', _eliminarMeta);
  registrarAccion('abonar-meta',   _abonarMeta);

  _inyectarForm();

  EventBus.on('state:change', ({ section }) => {
    if (section === 'metas') {
      renderSmart(renderListaMetas, 'metas');
    }
  });

  renderSmart(renderListaMetas, 'metas');
}
