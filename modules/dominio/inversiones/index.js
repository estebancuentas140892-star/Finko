/**
 * inversiones/index.js - API pública del dominio Inversión (J.2).
 *
 * Responsabilidades:
 * - Registrar acciones: inversion-nueva, inversion-eliminar.
 * - Coordinar logic.js + view.js. Persistir vía crud.js (inversiones es una
 *   colección top-level de S, así que guardar()/eliminar() aplican directo).
 * - Suscribirse a EventBus para re-render cuando cambian las inversiones.
 */

import { S, EventBus }               from '../../core/state.js';
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { registrarAccion }           from '../../ui/actions.js';
import { abrirModal, cerrarModal }   from '../../ui/modales.js';
import { renderSmart, registrarRender } from '../../infra/render.js';
import { announce }                  from '../../infra/a11y.js';
import { mostrarErroresForm }        from '../../infra/form-errors.js';
import { confirmar }                 from '../../ui/confirm.js';
import { f, hoy }                    from '../../infra/utils.js';
import { validarInversion, normalizarInversion } from './logic.js';
import { renderInversion, renderFormInversion }  from './view.js';
import { renderBannerProposito } from '../../ui/proposito.js';

// ── HELPERS DE MODAL ─────────────────────────────────────────────

function _getOverlay() {
  return document.getElementById('modal-inversion');
}

function _setBody(html) {
  const body = document.getElementById('modal-inversion-body');
  if (body) body.innerHTML = html;
}

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _nuevaInversion() {
  const overlay = _getOverlay();
  if (!overlay) return;

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Registrar inversión';

  _setBody(renderFormInversion({ fechaInicio: hoy() }));

  const form = document.getElementById('form-inversion');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      _guardarInversion(form);
    });
  }
  abrirModal(overlay);
}

/** @param {HTMLFormElement} form */
function _guardarInversion(form) {
  const datos   = Object.fromEntries(new FormData(form));
  const errores = validarInversion(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const inversion = normalizarInversion(datos);
  guardar('inversiones', inversion);

  const overlay = _getOverlay();
  if (overlay) cerrarModal(overlay);

  announce(`Inversión "${inversion.nombre}" registrada por ${f(inversion.monto)}.`);
}

/** @param {HTMLElement} el */
async function _eliminarInversion(el) {
  const id = el.dataset.id;
  if (!id) return;

  const inversiones = Array.isArray(S.inversiones) ? S.inversiones : [];
  const inv = inversiones.find(x => x.id === id);
  if (!inv) return;

  const ok = await confirmar({
    titulo:         'Eliminar inversión',
    mensaje:        `¿Quieres eliminar "${inv.nombre}" (${f(inv.monto)})? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('inversiones', id);
  announce('Inversión eliminada.');
}

// ── INIT ─────────────────────────────────────────────────────────

function _renderInversionBound() {
  renderInversion();
}

export function initInversiones() {
  registrarAccion('inversion-nueva',     _nuevaInversion);
  registrarAccion('inversion-eliminar',  _eliminarInversion);

  // Re-render ante cambios en la colección de inversiones.
  EventBus.on('state:change', ({ section }) => {
    if (section === 'inversiones') {
      renderSmart(_renderInversionBound, 'inversion');
    }
  });

  // "Distribuir mi ingreso" (ADR 012, MC.4e): aplica los aportes a inversiones del
  // plan. Solo incrementa el capital (`monto`) del holding; el descuento de la
  // cuenta de origen lo centraliza tesorería (no aquí), igual que metas/apartados.
  EventBus.on('distribucion:aplicar', ({ items }) => {
    const aportes = (items ?? []).filter(i => i.tipo === 'inversion' && i.monto > 0);
    for (const it of aportes) {
      const inv = (S.inversiones ?? []).find(x => x.id === it.id);
      if (!inv) continue;
      editar('inversiones', it.id, { monto: (Number(inv.monto) || 0) + it.monto });
    }
  });

  // Para que renderAll() también dibuje esta sección.
  registrarRender(_renderInversionBound);

  // Re-render al navegar a #inversion (mismo patrón que ahorro/metas).
  window.addEventListener('hashchange', () => {
    renderBannerProposito('inversion');
    renderSmart(_renderInversionBound, 'inversion');
  });

  renderBannerProposito('inversion');
  renderSmart(_renderInversionBound, 'inversion');
}
