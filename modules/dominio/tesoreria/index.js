/**
 * tesoreria/index.js - API pública del dominio de tesorería.
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
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { validarCuenta, normalizarCuenta } from './logic.js';
import { renderNudgePrima, renderListaCuentas, renderFormCuenta } from './view.js';

// ── RENDER COMPLETO ──────────────────────────────────────────────

/** Re-renderiza ambas vistas del dominio. */
function _renderTodo() {
  renderNudgePrima();
  renderListaCuentas();
}

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

/** Abre el modal y resetea el formulario. */
function _nuevaCuenta() {
  const overlay = document.getElementById('modal-cuenta');
  if (!overlay) return;
  resetModal(overlay);
  // resetModal limpia inputs/selects pero NO el display visual del bank-picker
  // (que vive fuera del overlay tras moverlo a body). Hay que resetearlo aparte
  // para no mostrar el banco anterior con el hidden value ya vacio.
  _resetBankPicker();
  abrirModal(overlay);
}

/**
 * Restaura el bank-picker a su estado inicial:
 * - El display visual vuelve al placeholder.
 * - Se quita aria-selected de todos los items.
 *
 * El input hidden name="banco" ya lo limpia resetModal() (vive dentro del overlay).
 */
function _resetBankPicker() {
  const display = document.querySelector('#modal-cuenta .bank-picker__display');
  if (display) {
    display.innerHTML = '<span class="bank-picker__placeholder">Seleccionar…</span>';
  }
  // Items estan fuera del overlay (en body), por eso hay que buscarlos por id.
  document.querySelectorAll('#banco-list [role="option"]').forEach(item => {
    item.setAttribute('aria-selected', 'false');
  });
}

/** Lee el formulario, valida, guarda y actualiza el DOM. */
function _guardarCuenta() {
  const form = document.getElementById('form-cuenta');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarCuenta(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  guardar('cuentas', normalizarCuenta(datos));

  const overlay = document.getElementById('modal-cuenta');
  if (overlay) cerrarModal(overlay);

  updSaldo();
  _renderTodo();
  announce('Cuenta guardada correctamente.');
}

/**
 * Pide confirmación y elimina la cuenta por id.
 * @param {HTMLElement} el - el botón con data-id.
 */
function _eliminarCuenta(el) {
  const id = el.dataset.id;
  if (!id) return;

  const cuenta = S.cuentas.find(c => c.id === id);
  if (!cuenta) return;

  if (!dialogo(`¿Eliminar "${cuenta.nombre}"? Esta acción no se puede deshacer.`)) return;

  eliminar('cuentas', id);
  updSaldo();
  _renderTodo();
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

  // Inicializar el custom bank picker.
  const picker = body.querySelector('.bank-picker');
  if (picker) _initBankPicker(picker);
}

/**
 * Inicializa el comportamiento del custom bank picker:
 * toggle, seleccion de banco, navegacion por teclado y cierre al click externo.
 *
 * El dropdown (.bank-picker__list) se MUEVE a <body> al inicializar. Razon:
 * el .modal padre tiene `transform: translateY/scale` (animacion de entrada),
 * y cualquier elemento con `transform != none` crea un containing block para
 * los descendientes con `position: fixed`, lo que desplaza el dropdown
 * respecto al viewport. Como hijo directo de <body> queda anclado al viewport
 * real y los coords de getBoundingClientRect funcionan correctamente.
 *
 * @param {HTMLElement} picker - el elemento .bank-picker raiz.
 */
function _initBankPicker(picker) {
  const trigger = picker.querySelector('.bank-picker__trigger');
  const list    = picker.querySelector('.bank-picker__list');
  const hidden  = picker.querySelector('input[name="banco"]');
  if (!trigger || !list || !hidden) return;

  // Mover el dropdown a <body> (ver explicacion arriba).
  document.body.appendChild(list);

  // Posicionar el dropdown con position:fixed debajo del trigger.
  // Si el dropdown se saldria del viewport por abajo, se abre hacia arriba.
  function _posicionar() {
    const r = trigger.getBoundingClientRect();
    const vh = window.innerHeight;
    const altoMax = 260; // coincide con max-height del CSS
    const espacioAbajo = vh - r.bottom;
    const espacioArriba = r.top;

    list.style.left  = `${r.left}px`;
    list.style.width = `${r.width}px`;

    if (espacioAbajo < altoMax && espacioArriba > espacioAbajo) {
      // Abrir hacia arriba: usar bottom en lugar de top.
      list.style.top    = 'auto';
      list.style.bottom = `${vh - r.top + 4}px`;
    } else {
      list.style.bottom = 'auto';
      list.style.top    = `${r.bottom + 4}px`;
    }
  }

  function _open() {
    _posicionar();
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    picker.setAttribute('aria-expanded', 'true');
    // Foco al item seleccionado o al primero.
    const sel = list.querySelector('[aria-selected="true"]')
             ?? list.querySelector('[role="option"]');
    sel?.focus();
  }

  function _close() {
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    picker.setAttribute('aria-expanded', 'false');
  }

  function _selectItem(item) {
    const val = item.dataset.value;
    if (!val) return;

    hidden.value = val;

    // Actualizar display del trigger con el avatar + nombre del banco.
    const display = trigger.querySelector('.bank-picker__display');
    if (display) display.innerHTML = item.innerHTML;

    // Actualizar aria-selected.
    list.querySelectorAll('[role="option"]').forEach(i => {
      i.setAttribute('aria-selected', i === item ? 'true' : 'false');
    });
  }

  // Toggle al click en el trigger.
  trigger.addEventListener('click', () => {
    if (list.hidden) _open(); else _close();
  });

  // Seleccion al click en un item.
  list.addEventListener('click', (e) => {
    const item = e.target.closest('[role="option"]');
    if (!item) return;
    _selectItem(item);
    _close();
    trigger.focus();
  });

  // Teclado dentro de la lista.
  list.addEventListener('keydown', (e) => {
    const items = [...list.querySelectorAll('[role="option"]')];
    const idx   = items.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[Math.min(idx + 1, items.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[Math.max(idx - 1, 0)]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const focused = document.activeElement;
      if (focused.getAttribute('role') === 'option') {
        _selectItem(focused);
        _close();
        trigger.focus();
      }
    } else if (e.key === 'Escape') {
      _close();
      trigger.focus();
    }
  });

  // Abrir con flecha abajo desde el trigger.
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      _open();
    }
  });

  // Cerrar al click fuera del picker Y de la lista (que esta en position:fixed).
  document.addEventListener('pointerdown', (e) => {
    if (!picker.contains(e.target) && !list.contains(e.target)) {
      _close();
    }
  }, { capture: true });
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
    if (section === 'cuentas' || section === 'tesoreria' || section === 'ingresos' || section === 'compromisos') {
      renderSmart(_renderTodo, 'tesoreria');
      updSaldo();
    }
  });

  // Re-render al navegar a #tesoreria - sin esto la sección aparece vacía
  // cuando el usuario llega navegando desde otra (no hay state:change que la dispare).
  window.addEventListener('hashchange', () => {
    renderSmart(_renderTodo, 'tesoreria');
  });

  // Render inicial si ya estamos en #tesoreria al cargar.
  renderSmart(_renderTodo, 'tesoreria');
}
