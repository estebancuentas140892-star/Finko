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
import { renderSmart, updSaldo, registrarRender } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { hoy, f } from '../../infra/utils.js';
import { confirmar } from '../../ui/confirm.js';
import { resolverPagoConPreferida } from '../../infra/cuenta-helper.js';
import {
  validarGasto, normalizarGasto,
  validarGastoRapido, normalizarGastoRapido,
  deltasPorEdicionDeGasto,
} from './logic.js';
import { renderBannerProposito } from '../../ui/proposito.js';
import { CATEGORIAS_TIPICAMENTE_FIJAS } from '../../core/constants.js';
import { renderListaGastos, renderFormGasto, renderFormGastoRapido, renderFiltrosGastos, setFiltroCategoria, navegarMesGastos, renderPendientesOrganizar } from './view.js';

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _nuevoGasto() {
  const overlay = document.getElementById('modal-gasto');
  if (!overlay) return;
  resetModal(overlay);

  // Re-inyectar el form cada vez: las tarjetas del selector de cuenta
  // dependen de S.cuentas, que puede haber cambiado desde la última apertura.
  _montarFormGasto();

  // Pre-rellenar la fecha con hoy para mejor UX.
  const fechaInput = overlay.querySelector('#gasto-fecha');
  if (fechaInput) fechaInput.value = hoy();

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Nuevo gasto';

  abrirModal(overlay);
}

async function _guardarGasto() {
  const form = document.getElementById('form-gasto');
  if (!form) return;

  const datos  = Object.fromEntries(new FormData(form));
  const idEdit = form.dataset.id || null;

  // La cuenta de origen viene del selector de tarjetas (radio name="cuentaId").
  const errores = validarGasto(datos);
  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  if (idEdit) {
    // En edición calculamos los deltas a aplicar a los saldos comparando
    // contra el gasto anterior. Maneja cambios de monto y/o de cuenta.
    const gasto = normalizarGasto(datos);
    const anterior = S.gastos.find(g => g.id === idEdit);
    if (anterior) {
      const deltas = deltasPorEdicionDeGasto(
        { cuentaId: anterior.cuentaId, monto: anterior.monto },
        { cuentaId: gasto.cuentaId,    monto: gasto.monto    },
      );
      _aplicarDeltasASaldos(deltas);

      // Preservar compromisoId del gasto original (el form no lo expone).
      if (anterior.compromisoId) gasto.compromisoId = anterior.compromisoId;

      // Sincronizar saldoTotal si el gasto era un gasto-abono.
      if (anterior.compromisoId) {
        _ajustarSaldoDeuda(anterior.compromisoId, anterior.monto - gasto.monto);
      }
    }
    editar('gastos', idEdit, gasto);
  } else {
    // En creación: se usa la cuenta elegida. Si no alcanza, el reparto entre
    // varias se resuelve al confirmar, sin dejar ninguna en negativo. Un
    // registro por cuenta usada.
    const base = normalizarGasto(datos); // incluye la cuenta elegida
    const splits = await resolverPagoConPreferida(
      S.cuentas, base.monto, base.cuentaId, 'registrar el gasto',
    );
    if (splits === null) return; // canceló o fue redirigido a Mis Cuentas

    // Una sola cuenta que no alcanza: confirmar el sobregiro (no hay reparto).
    if (splits.length === 1) {
      const c = S.cuentas.find(x => x.id === splits[0].cuentaId);
      const saldoCuenta = c?.saldo ?? 0;
      if (saldoCuenta < splits[0].monto) {
        const ok = await confirmar({
          titulo:         'Registrar gasto',
          mensaje:        `${c?.nombre ?? 'La cuenta'} tiene ${f(saldoCuenta)} y el gasto es ${f(splits[0].monto)}: quedará en negativo. ¿Registrar de todas formas?`,
          confirmarTexto: 'Registrar gasto',
          peligroso:      true,
        });
        if (!ok) return;
      }
    }

    const repartido = splits.length > 1;
    for (const s of splits) {
      guardar('gastos', {
        ...base,
        cuentaId: s.cuentaId || null,
        monto:    s.monto,
        nota:     repartido ? [base.nota, 'Gasto repartido entre varias cuentas'].filter(Boolean).join(' · ') : base.nota,
      });
      _ajustarSaldoCuenta(s.cuentaId, -s.monto);
    }
  }

  const overlay = document.getElementById('modal-gasto');
  if (overlay) cerrarModal(overlay);

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

  // Precargar la cuenta del gasto en el selector de tarjetas. Si el gasto venía
  // sin cuenta (versiones previas), queda la pre-selección por defecto.
  if (gasto.cuentaId) {
    const radio = form.querySelector(`input[name="cuentaId"][value="${gasto.cuentaId}"]`);
    if (radio) radio.checked = true;
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

/**
 * (Re)Inyecta el HTML del gasto rápido en el modal y adjunta el listener de submit.
 * Se llama en cada apertura para reflejar cambios en S.cuentas (puede haber
 * agregado o eliminado cuentas desde la última vez que se abrió el modal).
 */
function _inyectarFormGastoRapido() {
  const body = document.getElementById('modal-gasto-rapido-body');
  if (!body) return;

  body.innerHTML = renderFormGastoRapido();

  const form = body.querySelector('#form-gasto-rapido');
  if (!form) return; // empty state (0 cuentas): no hay form, no hay listener.

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarGastoRapido();
  });
}

/** Abre el modal de gasto rapido con focus en el input de monto. */
function _abrirGastoRapido() {
  const overlay = document.getElementById('modal-gasto-rapido');
  if (!overlay) return;

  // Re-inyectar en cada apertura: S.cuentas puede haber cambiado desde la última vez.
  _inyectarFormGastoRapido();

  abrirModal(overlay);
  // Focus en el input despues de la animacion de entrada.
  setTimeout(() => {
    overlay.querySelector('#gasto-rapido-monto')?.focus();
  }, 200);
}

async function _guardarGastoRapido() {
  const form = document.getElementById('form-gasto-rapido');
  if (!form) return;

  const monto    = form.querySelector('[name="monto"]')?.value ?? '';
  const cuentaId = form.querySelector('input[name="cuentaId"]:checked')?.value || null;

  const errores = validarGastoRapido(monto, cuentaId, true);
  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  // Usa la cuenta elegida; si no alcanza y hay más cuentas, abre el reparto.
  const splits = await resolverPagoConPreferida(S.cuentas, Number(monto), cuentaId, 'registrar el gasto');
  if (splits === null) return; // canceló o fue redirigido a Mis Cuentas

  // Una sola cuenta que no alcanza: confirmar el sobregiro.
  if (splits.length === 1) {
    const c = S.cuentas.find(x => x.id === splits[0].cuentaId);
    const saldoCuenta = c?.saldo ?? 0;
    if (saldoCuenta < splits[0].monto) {
      const ok = await confirmar({
        titulo:         'Registrar gasto',
        mensaje:        `${c?.nombre ?? 'La cuenta'} tiene ${f(saldoCuenta)} y el gasto es ${f(splits[0].monto)}: quedará en negativo. ¿Registrar de todas formas?`,
        confirmarTexto: 'Registrar gasto',
        peligroso:      true,
      });
      if (!ok) return;
    }
  }

  for (const s of splits) {
    guardar('gastos', normalizarGastoRapido(s.monto, hoy(), s.cuentaId));
    _ajustarSaldoCuenta(s.cuentaId, -s.monto);
  }

  // Tomar el id del último gasto (crud.js lo asignó).
  const ultimo = S.gastos[S.gastos.length - 1];

  const overlay = document.getElementById('modal-gasto-rapido');
  if (overlay) cerrarModal(overlay);

  renderListaGastos();
  updSaldo();

  announce('Gasto rápido guardado. Lo puedes completar después en Gastos.');
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
    <button type="button" class="quick-toast__close" aria-label="Cerrar"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>`;

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

// ── NAVEGACIÓN DE MES ────────────────────────────────────────────

function _prevMes() {
  navegarMesGastos(-1);
  renderFiltrosGastos();
  renderListaGastos();
}

function _nextMes() {
  navegarMesGastos(+1);
  renderFiltrosGastos();
  renderListaGastos();
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
    mensaje:        `¿Quieres eliminar "${gasto.descripcion}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  // Devolver el monto al saldo de la cuenta (si el gasto tenía cuenta).
  _ajustarSaldoCuenta(gasto.cuentaId, +gasto.monto);

  // Revertir el abono en la deuda si era un gasto-abono.
  if (gasto.compromisoId) _ajustarSaldoDeuda(gasto.compromisoId, +gasto.monto);

  eliminar('gastos', id);
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
 * Útil al editar un gasto que puede mover dinero entre cuentas.
 * @param {Record<string, number>} deltas
 */
function _aplicarDeltasASaldos(deltas) {
  for (const [cuentaId, delta] of Object.entries(deltas)) {
    _ajustarSaldoCuenta(cuentaId, delta);
  }
}

/**
 * Ajusta el saldoTotal de una deuda cuando se edita o elimina un gasto-abono.
 * delta positivo: revierte un abono (saldo sube). delta negativo: suma un abono (saldo baja).
 * @param {string} compromisoId
 * @param {number} delta
 */
function _ajustarSaldoDeuda(compromisoId, delta) {
  if (!compromisoId || !Number.isFinite(delta) || delta === 0) return;
  const comp = S.compromisos.find(c => c.id === compromisoId);
  if (!comp) return;
  const nuevoSaldo = Math.max(0, (Number(comp.saldoTotal) || 0) + delta);
  editar('compromisos', compromisoId, { saldoTotal: nuevoSaldo });
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────

/**
 * (Re)Inyecta el HTML del formulario de gasto en el modal y attacha el
 * listener de submit. Se llama desde `_nuevoGasto()` y `_editarGasto()` cada
 * vez que el modal se abre, porque las tarjetas del selector de cuenta
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

  const catSelect = form.querySelector('[name="categoria"]');
  const hintFija  = form.querySelector('#hint-categoria-fija');
  if (catSelect && hintFija) {
    catSelect.addEventListener('change', () => {
      const esFija = CATEGORIAS_TIPICAMENTE_FIJAS.has(catSelect.value);
      hintFija.hidden = !esFija;
      if (esFija) {
        hintFija.innerHTML =
          `Esta categoría suele ser un gasto fijo mensual. ` +
          `Si es recurrente, puedes <a href="#agenda" data-action="modal-close" ` +
          `class="link">registrarlo en Agenda</a> para llevarlo mejor.`;
      }
    });
  }
}

export function initGastos() {
  registrarAccion('nuevo-gasto', _nuevoGasto);
  registrarAccion('editar-gasto', _editarGasto);
  registrarAccion('eliminar-gasto', _eliminarGasto);
  registrarAccion('gasto-rapido', _abrirGastoRapido);
  registrarAccion('gastos-prev-mes',    _prevMes);
  registrarAccion('gastos-next-mes',    _nextMes);
  registrarAccion('gastos-filtrar-cat', _filtrarCategoria);

  // El form completo se monta on-demand desde _nuevoGasto/_editarGasto.
  // El form rápido también se monta on-demand desde _abrirGastoRapido.

  // La card de pendientes vive en el dashboard, no en #gast, así que se
  // registra en renderAll (boot + mutaciones globales) en lugar de gatearse
  // por hash. Es idempotente y barata: escribe en un contenedor siempre
  // presente, aunque la sección esté oculta.
  registrarRender(renderPendientesOrganizar);

  EventBus.on('state:change', ({ section }) => {
    if (section === 'gastos') {
      renderSmart(renderFiltrosGastos, 'gast');
      renderSmart(renderListaGastos, 'gast');
      renderPendientesOrganizar();
      updSaldo();
    }
  });

  // Re-render al navegar a #gast: filtros + lista.
  window.addEventListener('hashchange', () => {
    renderBannerProposito('gast');
    renderSmart(renderFiltrosGastos, 'gast');
    renderSmart(renderListaGastos, 'gast');
  });

  renderBannerProposito('gast');
  renderSmart(renderFiltrosGastos, 'gast');
  renderSmart(renderListaGastos, 'gast');
}
