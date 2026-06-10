/**
 * metas/index.js - API pública del dominio de metas de ahorro.
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
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { confirmar } from '../../ui/confirm.js';
import { f } from '../../infra/utils.js';
import { validarMeta, normalizarMeta, validarAbono, calcularProgreso } from './logic.js';
import { renderListaMetas, renderFormMeta, renderFormAbonoMeta } from './view.js';

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
    mostrarErroresForm(form, errores);
    return;
  }

  guardar('metas', normalizarMeta(datos));

  const overlay = document.getElementById('modal-meta');
  if (overlay) cerrarModal(overlay);

  renderListaMetas();
  announce('Meta creada correctamente.');
}

/** @param {HTMLElement} el */
async function _eliminarMeta(el) {
  const id = el.dataset.id;
  if (!id) return;

  const meta = S.metas.find(m => m.id === id);
  if (!meta) return;

  const ok = await confirmar({
    titulo:         'Eliminar meta',
    mensaje:        `¿Quieres eliminar la meta "${meta.nombre}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('metas', id);
  renderListaMetas();
  announce(`Meta "${meta.nombre}" eliminada.`);
}

/** @param {HTMLElement} el */
function _abrirAbonoMeta(el) {
  const id = el.dataset.id;
  if (!id) return;

  const meta = S.metas.find(m => m.id === id);
  if (!meta) return;

  const overlay = document.getElementById('modal-abono-meta');
  if (!overlay) return;

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = `Abonar: ${meta.nombre}`;

  const body = overlay.querySelector('.modal__body');
  if (body) {
    body.innerHTML = renderFormAbonoMeta(meta);
    body.querySelector('#form-abono-meta')?.addEventListener('submit', (e) => {
      e.preventDefault();
      _guardarAbonoMeta();
    });
    body.querySelector('#abono-meta-monto')?.focus();
  }

  abrirModal(overlay);
}

function _guardarAbonoMeta() {
  const form = document.getElementById('form-abono-meta');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));

  // Si hay varias cuentas activas el select es obligatorio.
  const cuentasActivas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const requiereCuenta = cuentasActivas.length > 1;
  const erroresCuenta  = requiereCuenta && !datos.cuentaId
    ? ['Debes elegir desde qué cuenta sale el dinero.']
    : [];
  const errores = [...validarAbono(datos.monto), ...erroresCuenta];

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const meta = S.metas.find(m => m.id === datos.metaId);
  if (!meta) return;

  const abono = Number(datos.monto);
  const nuevoMonto = (meta.montoActual ?? 0) + abono;
  const { completada } = calcularProgreso({ ...meta, montoActual: nuevoMonto });

  editar('metas', datos.metaId, { montoActual: nuevoMonto, completada });

  // Descontar del saldo de la cuenta de origen (si se eligió una).
  if (datos.cuentaId) {
    _ajustarSaldoCuenta(datos.cuentaId, -abono);
  }

  const overlay = document.getElementById('modal-abono-meta');
  if (overlay) cerrarModal(overlay);

  renderListaMetas();
  announce(completada
    ? `¡Meta "${meta.nombre}" completada! 🎉`
    : `Abono de ${f(abono)} registrado.`
  );
}

/**
 * Ajusta el saldo de la cuenta indicada en `delta` (positivo o negativo).
 * No-op si `cuentaId` es null/undefined o la cuenta no existe.
 *
 * @param {string|null|undefined} cuentaId
 * @param {number} delta
 */
function _ajustarSaldoCuenta(cuentaId, delta) {
  if (!cuentaId || delta === 0) return;
  const cuenta = (S.cuentas ?? []).find(c => c.id === cuentaId);
  if (!cuenta) return;
  editar('cuentas', cuentaId, { saldo: (cuenta.saldo ?? 0) + delta });
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
  registrarAccion('abonar-meta',   _abrirAbonoMeta);

  _inyectarForm();

  EventBus.on('state:change', ({ section }) => {
    if (section === 'metas') {
      renderSmart(renderListaMetas, 'metas');
    }
  });

  // Re-render al navegar a #metas - sin esto la sección aparece vacía
  // cuando el usuario llega navegando desde otra (no hay state:change que la dispare).
  window.addEventListener('hashchange', () => {
    renderSmart(renderListaMetas, 'metas');
  });

  renderSmart(renderListaMetas, 'metas');
}
