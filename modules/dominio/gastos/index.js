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
import { hoy, f } from '../../infra/utils.js';
import { confirmar } from '../../ui/confirm.js';
import {
  validarGasto, normalizarGasto,
  validarGastoRapido, normalizarGastoRapido,
  aplicarGastoASaldo, revertirGastoDeSaldo, deltasPorEdicionDeGasto,
} from './logic.js';
import { renderListaGastos, renderResumenGastos, renderFormGasto, renderFiltrosGastos, setFiltroCategoria } from './view.js';

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _nuevoGasto() {
  const overlay = document.getElementById('modal-gasto');
  if (!overlay) return;
  resetModal(overlay);

  // Re-inyectar el form cada vez: las opciones del selector de cuenta
  // dependen de S.cuentas, que puede haber cambiado desde la última apertura.
  _montarFormGasto();

  // Pre-rellenar la fecha con hoy para mejor UX.
  const fechaInput = overlay.querySelector('#gasto-fecha');
  if (fechaInput) fechaInput.value = hoy();

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
    // En edición calculamos los deltas a aplicar a los saldos comparando
    // contra el gasto anterior. Maneja cambios de monto y/o de cuenta.
    const anterior = S.gastos.find(g => g.id === idEdit);
    if (anterior) {
      const deltas = deltasPorEdicionDeGasto(
        { cuentaId: anterior.cuentaId, monto: anterior.monto },
        { cuentaId: gasto.cuentaId,    monto: gasto.monto    },
      );
      _aplicarDeltasASaldos(deltas);
    }
    editar('gastos', idEdit, gasto);
  } else {
    // En creación descontamos el monto del saldo de la cuenta elegida.
    _ajustarSaldoCuenta(gasto.cuentaId, -gasto.monto);
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
  _montarFormGasto();

  const form = document.getElementById('form-gasto');
  if (!form) return;

  form.dataset.id = id;
  form.querySelector('[name="descripcion"]').value = gasto.descripcion ?? '';
  form.querySelector('[name="monto"]').value       = gasto.monto       ?? 0;
  form.querySelector('[name="categoria"]').value   = gasto.categoria   ?? 'Otros';
  form.querySelector('[name="fecha"]').value       = gasto.fecha       ?? hoy();
  const notaEl = form.querySelector('[name="nota"]');
  if (notaEl) notaEl.value = gasto.nota ?? '';

  // Precargar cuenta si el gasto la tenía (los gastos de versiones previas
  // pueden venir con cuentaId null - el usuario tendrá que elegir una).
  const cuentaSel = form.querySelector('[name="cuentaId"]');
  if (cuentaSel) {
    cuentaSel.value = gasto.cuentaId ?? '';
    _actualizarSaldoDisponible();
  }

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

// ── FILTRO DE CATEGORÍA ──────────────────────────────────────────

/** Cambia el chip activo y re-renderiza filtros + lista. */
function _filtrarCategoria(el) {
  const cat = el?.dataset?.cat || null;
  setFiltroCategoria(cat);
  renderFiltrosGastos();
  renderListaGastos();
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

  // Devolver el monto al saldo de la cuenta (si el gasto tenía cuenta).
  _ajustarSaldoCuenta(gasto.cuentaId, +gasto.monto);

  eliminar('gastos', id);
  renderResumenGastos();
  renderListaGastos();
  updSaldo();
  announce(`Gasto "${gasto.descripcion}" eliminado.`);
}

// ── HELPERS DE SALDO ─────────────────────────────────────────────

/**
 * Ajusta el saldo de la cuenta indicada en `delta` (positivo o negativo).
 * No-op si `cuentaId` es null/undefined o la cuenta no existe.
 * Usa `editar()` para que dispare save() + state:change.
 *
 * @param {string|null|undefined} cuentaId
 * @param {number} delta - positivo suma, negativo descuenta.
 */
function _ajustarSaldoCuenta(cuentaId, delta) {
  if (!cuentaId || delta === 0) return;
  const cuenta = S.cuentas.find(c => c.id === cuentaId);
  if (!cuenta) return;
  const nuevoSaldo = (cuenta.saldo ?? 0) + delta;
  editar('cuentas', cuentaId, { saldo: nuevoSaldo });
}

/**
 * Aplica un mapa de deltas { cuentaId → delta } a los saldos.
 * Útil al editar un gasto que puede mover plata entre cuentas.
 * @param {Record<string, number>} deltas
 */
function _aplicarDeltasASaldos(deltas) {
  for (const [cuentaId, delta] of Object.entries(deltas)) {
    _ajustarSaldoCuenta(cuentaId, delta);
  }
}

/**
 * Refresca el texto del display `#gasto-saldo-disponible` según la cuenta
 * seleccionada en el `<select name="cuentaId">`. Si no hay cuenta elegida,
 * muestra el placeholder original. Si la cuenta tiene saldo negativo,
 * usa una clase de advertencia.
 */
function _actualizarSaldoDisponible() {
  const sel = document.getElementById('gasto-cuenta');
  const tip = document.getElementById('gasto-saldo-disponible');
  if (!sel || !tip) return;

  const cuentaId = sel.value;
  if (!cuentaId) {
    tip.textContent = 'Elegí una cuenta para ver el saldo disponible.';
    tip.classList.remove('form-hint--danger');
    tip.classList.add('form-hint--muted');
    return;
  }

  const cuenta = S.cuentas.find(c => c.id === cuentaId);
  if (!cuenta) {
    tip.textContent = 'Cuenta no encontrada.';
    return;
  }

  const saldo = cuenta.saldo ?? 0;
  tip.textContent = `Saldo disponible en ${cuenta.nombre}: ${f(saldo)}`;
  tip.classList.toggle('form-hint--danger', saldo <= 0);
  tip.classList.toggle('form-hint--muted',  saldo >  0);
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────

/**
 * (Re)Inyecta el HTML del formulario de gasto en el modal y attacha los
 * listeners. Se llama desde `_nuevoGasto()` y `_editarGasto()` cada vez
 * que el modal se abre, porque las opciones del selector de cuenta
 * dependen de `S.cuentas`, que puede cambiar entre aperturas.
 */
function _montarFormGasto() {
  const body = document.getElementById('modal-gasto-body');
  if (!body) return;

  body.innerHTML = renderFormGasto();

  const form = body.querySelector('#form-gasto');
  if (!form) return;  // empty state (sin cuentas): no hay form, no hay listeners.

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarGasto();
  });

  // Cada cambio del select actualiza el display de saldo disponible.
  body.querySelector('#gasto-cuenta')?.addEventListener('change', _actualizarSaldoDisponible);
}

/** Attacha submit del form de gasto rápido que vive estático en index.html. */
function _attacharGastoRapido() {
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
  registrarAccion('gastos-filtrar-cat', _filtrarCategoria);

  // El form completo se monta on-demand desde _nuevoGasto/_editarGasto.
  // Solo dejamos attachado el listener del form rápido (HTML estático).
  _attacharGastoRapido();

  EventBus.on('state:change', ({ section }) => {
    if (section === 'gastos') {
      renderSmart(renderFiltrosGastos, 'gast');
      renderSmart(renderListaGastos, 'gast');
      renderResumenGastos();
      updSaldo();
    }
  });

  // Re-render al navegar a #gast: filtros + lista.
  window.addEventListener('hashchange', () => {
    renderSmart(renderFiltrosGastos, 'gast');
    renderSmart(renderListaGastos, 'gast');
  });

  renderSmart(renderFiltrosGastos, 'gast');
  renderSmart(renderListaGastos, 'gast');
  renderResumenGastos();
}
