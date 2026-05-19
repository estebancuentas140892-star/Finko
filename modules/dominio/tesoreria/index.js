/**
 * tesoreria/index.js — API pública del dominio de tesorería.
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
import { dialogo } from '../../infra/utils.js';
import { validarCuenta, normalizarCuenta } from './logic.js';
import { renderListaCuentas, renderFormCuenta } from './view.js';

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

/** Abre el modal y resetea el formulario. */
function _nuevaCuenta() {
  const overlay = document.getElementById('modal-cuenta');
  if (!overlay) return;
  resetModal(overlay);
  abrirModal(overlay);
}

/** Lee el formulario, valida, guarda y actualiza el DOM. */
function _guardarCuenta() {
  const form = document.getElementById('form-cuenta');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarCuenta(datos);

  if (errores.length > 0) {
    announce(errores[0], 'assertive');
    return;
  }

  guardar('cuentas', normalizarCuenta(datos));

  const overlay = document.getElementById('modal-cuenta');
  if (overlay) cerrarModal(overlay);

  updSaldo();
  renderListaCuentas();
  announce('Cuenta guardada correctamente.');
}

/**
 * Pide confirmación y elimina la cuenta por id.
 * @param {HTMLElement} el — el botón con data-id.
 */
function _eliminarCuenta(el) {
  const id = el.dataset.id;
  if (!id) return;

  const cuenta = S.cuentas.find(c => c.id === id);
  if (!cuenta) return;

  if (!dialogo(`¿Eliminar "${cuenta.nombre}"? Esta acción no se puede deshacer.`)) return;

  eliminar('cuentas', id);
  updSaldo();
  renderListaCuentas();
  announce(`Cuenta "${cuenta.nombre}" eliminada.`);
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────

/**
 * Inyecta el formulario en el modal y registra acciones.
 * Llamada una sola vez desde bootstrap.js.
 */
function _inyectarForm() {
  const body = document.getElementById('modal-cuenta-body');
  if (!body) return;

  body.innerHTML = renderFormCuenta();

  // El submit del form no va por data-action para respetar el contrato HTML5 de validación.
  body.querySelector('#form-cuenta')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarCuenta();
  });
}

/**
 * Inicializa el dominio de tesorería.
 * Registra acciones, inyecta el form, suscribe al EventBus y hace el primer render.
 */
export function initTesoreria() {
  registrarAccion('nueva-cuenta', _nuevaCuenta);
  registrarAccion('eliminar-cuenta', _eliminarCuenta);

  _inyectarForm();

  EventBus.on('state:change', ({ section }) => {
    if (section === 'cuentas' || section === 'tesoreria') {
      renderSmart(renderListaCuentas, 'tesoreria');
      updSaldo();
    }
  });

  // Re-render al navegar a #tesoreria — sin esto la sección aparece vacía
  // cuando el usuario llega navegando desde otra (no hay state:change que la dispare).
  window.addEventListener('hashchange', () => {
    renderSmart(renderListaCuentas, 'tesoreria');
  });

  // Render inicial si ya estamos en #tesoreria al cargar.
  renderSmart(renderListaCuentas, 'tesoreria');
}
