/**
 * personales/index.js - API pública del dominio de préstamos personales.
 *
 * Responsabilidades:
 * - Registrar acciones data-action (nuevo, pagar, eliminar).
 * - Inyectar el formulario del modal al arranque.
 * - Suscribirse a EventBus para re-renderizar cuando cambia S.personales.
 * - Coordinar logic.js + view.js sin hacer cálculos ni generar HTML aquí.
 */

import { S, EventBus } from '../../core/state.js';
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal, resetModal } from '../../ui/modales.js';
import { renderSmart, registrarRender } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { confirmar } from '../../ui/confirm.js';
import { validarPersonal, normalizarPersonal, aplicarPago, calcularPendiente } from './logic.js';
import { renderListaPersonales, renderFormPersonal, renderFormPagoPersonal } from './view.js';

// ── HANDLERS NUEVO / GUARDAR ─────────────────────────────────────

function _nuevoPersonal() {
  const overlay = document.getElementById('modal-personal');
  if (!overlay) return;
  resetModal(overlay);
  abrirModal(overlay);
}

function _guardarPersonal() {
  const form = document.getElementById('form-personal');
  if (!form) return;

  const datos   = Object.fromEntries(new FormData(form));
  const errores = validarPersonal(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  guardar('personales', normalizarPersonal(datos));

  const overlay = document.getElementById('modal-personal');
  if (overlay) cerrarModal(overlay);

  renderListaPersonales();
  announce('Préstamo guardado correctamente.');
}

// ── HANDLERS PAGAR ───────────────────────────────────────────────

function _abrirPagoPersonal(el) {
  const id = el.dataset.id;
  if (!id) return;
  const prestamo = S.personales.find(p => p.id === id);
  if (!prestamo) return;

  const overlay = document.getElementById('modal-pago-personal');
  const body    = document.getElementById('modal-pago-personal-body');
  if (!overlay || !body) return;

  body.innerHTML = renderFormPagoPersonal(prestamo);
  body.querySelector('#form-pago-personal')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _confirmarPagoPersonal();
  });

  abrirModal(overlay);
}

function _confirmarPagoPersonal() {
  const form = document.getElementById('form-pago-personal');
  if (!form) return;

  const id    = form.dataset.id;
  const monto = Number(new FormData(form).get('monto'));

  const prestamo = S.personales.find(p => p.id === id);
  if (!prestamo) return;

  if (!Number.isFinite(monto) || monto <= 0) {
    announce('Poné un monto mayor a 0.', 'assertive');
    return;
  }

  const pendiente = calcularPendiente(prestamo);
  if (pendiente <= 0) {
    announce('Este préstamo ya está liquidado.', 'assertive');
    return;
  }

  const actualizado = aplicarPago(prestamo, monto);
  editar('personales', id, {
    pagado:     actualizado.pagado,
    liquidado:  actualizado.liquidado,
    ultimoPago: actualizado.ultimoPago,
  });

  const overlay = document.getElementById('modal-pago-personal');
  if (overlay) cerrarModal(overlay);

  renderListaPersonales();
  announce(actualizado.liquidado
    ? `Préstamo de ${prestamo.persona} marcado como liquidado.`
    : `Pago de ${prestamo.persona} registrado.`);
}

// ── HANDLER ELIMINAR ─────────────────────────────────────────────

/** @param {HTMLElement} el */
async function _eliminarPersonal(el) {
  const id = el.dataset.id;
  if (!id) return;

  const prestamo = S.personales.find(p => p.id === id);
  if (!prestamo) return;

  const ok = await confirmar({
    titulo:         'Borrar préstamo',
    mensaje:        `¿Borrar el préstamo a ${prestamo.persona}? Esto no devuelve el dinero, solo limpia el registro.`,
    confirmarTexto: 'Borrar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('personales', id);
  renderListaPersonales();
  announce(`Préstamo a ${prestamo.persona} eliminado.`);
}

// ── INIT ─────────────────────────────────────────────────────────

function _inyectarForm() {
  const body = document.getElementById('modal-personal-body');
  if (!body) return;
  body.innerHTML = renderFormPersonal();
  body.querySelector('#form-personal')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarPersonal();
  });
}

export function initPersonales() {
  registrarAccion('nuevo-personal',    _nuevoPersonal);
  registrarAccion('pagar-personal',    _abrirPagoPersonal);
  registrarAccion('eliminar-personal', _eliminarPersonal);

  _inyectarForm();

  EventBus.on('state:change', ({ section }) => {
    if (section === 'personales') {
      renderSmart(renderListaPersonales, 'personales');
    }
  });

  // Re-render en cada navegación a #personales (sigue patrón de calculadoras).
  window.addEventListener('hashchange', () => {
    renderSmart(renderListaPersonales, 'personales');
  });

  // Render inicial: si la sección está activa al bootstrap.
  // registrarRender garantiza que renderAll() lo dispare después del initRouter.
  registrarRender(() => renderSmart(renderListaPersonales, 'personales'));
  renderSmart(renderListaPersonales, 'personales');
}
