/**
 * cuenta-helper.js - selección inteligente de cuenta para movimientos financieros.
 *
 * Resuelve qué cuenta usar antes de registrar cualquier pago/gasto:
 *   - 0 cuentas activas: muestra diálogo guiado y navega a Mis Cuentas. Devuelve null.
 *   - 1 cuenta activa: auto-selecciona sin interrumpir al usuario. Devuelve el id.
 *   - Varias cuentas: muestra un picker tipo-modal. Devuelve el id elegido o null si cancela.
 *
 * Sin DOM en la función pura `resolverCuenta`: solo construye el resultado.
 * La capa de presentación (diálogos) vive en las funciones privadas `_*`.
 *
 * Reglas ADN:
 *   - Sin S directo: recibe las cuentas como parámetro.
 *   - Sin imports de dominios: solo infra.
 */

import { trapFocus, releaseFocus } from './a11y.js';
import { esc as _esc, f } from './utils.js';
import { navigate } from './router.js';

// ── API PÚBLICA ──────────────────────────────────────────────────

/**
 * Resuelve la cuenta a usar para un movimiento de forma inteligente.
 *
 * @param {import('../core/state.js').Cuenta[]} cuentas - lista completa de S.cuentas.
 * @param {string} [contexto] - texto corto para mensajes: "registrar el pago", etc.
 * @returns {Promise<string|null>}
 *   - string: id de la cuenta elegida (auto o por el usuario).
 *   - null: el flujo fue cancelado o se redirigió a Mis Cuentas (el caller debe abortar).
 */
export async function resolverCuenta(cuentas, contexto = 'completar esta operación') {
  const activas = (cuentas ?? []).filter(c => c.activa !== false);

  if (activas.length === 0) {
    _mostrarGuiadoCero(contexto);
    return null;
  }

  if (activas.length === 1) {
    return activas[0].id;
  }

  return _mostrarPickerCuenta(activas, contexto);
}

// ── CASO 0 CUENTAS ───────────────────────────────────────────────

/**
 * Muestra un diálogo informativo y navega a Tesorería.
 * @param {string} contexto
 */
function _mostrarGuiadoCero(contexto) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.dataset.open = '';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'cta-sin-cuentas-title');

  overlay.innerHTML = `
    <div class="modal modal--confirm" role="document">
      <header class="modal__header">
        <h2 id="cta-sin-cuentas-title" class="modal__title">Necesitas una cuenta primero</h2>
      </header>
      <div class="modal__body">
        <p class="confirm__mensaje">Para ${_esc(contexto)}, primero agrega al menos una cuenta en Mis Cuentas. Solo te toma un momento.</p>
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-role="cancelar">Ahora no</button>
        <button type="button" class="btn btn-primary" data-role="ir">Ir a Mis Cuentas</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const panel = overlay.querySelector('.modal');
  trapFocus(panel);
  setTimeout(() => overlay.querySelector('[data-role="ir"]')?.focus(), 0);

  function _cerrar() {
    releaseFocus();
    overlay.remove();
    document.removeEventListener('keydown', _onKey);
  }

  function _onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); _cerrar(); }
  }

  overlay.addEventListener('click', e => {
    const btn = e.target.closest('[data-role]');
    if (btn?.dataset.role === 'ir') {
      _cerrar();
      navigate('tesoreria');
    } else if (btn?.dataset.role === 'cancelar' || e.target === overlay) {
      _cerrar();
    }
  });

  document.addEventListener('keydown', _onKey);
}

// ── CASO VARIAS CUENTAS ──────────────────────────────────────────

/**
 * Muestra un picker de cuenta y resuelve con el id elegido o null si cancela.
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {string} contexto
 * @returns {Promise<string|null>}
 */
function _mostrarPickerCuenta(activas, contexto) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.dataset.open = '';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cuenta-picker-title');

    const botones = activas.map(c => `
      <button type="button"
              class="cuenta-picker__btn"
              data-role="elegir"
              data-cuenta-id="${_esc(c.id)}"
              aria-label="Usar cuenta ${_esc(c.nombre)}, saldo ${f(c.saldo ?? 0)}">
        <span class="cuenta-picker__nombre">${_esc(c.nombre)}</span>
        <span class="cuenta-picker__saldo">${f(c.saldo ?? 0)}</span>
      </button>`).join('');

    overlay.innerHTML = `
      <div class="modal modal--confirm" role="document">
        <header class="modal__header">
          <h2 id="cuenta-picker-title" class="modal__title">¿Desde qué cuenta?</h2>
        </header>
        <div class="modal__body">
          <p class="confirm__mensaje">Elige la cuenta desde la que quieres ${_esc(contexto)}.</p>
          <div class="cuenta-picker__lista" role="list">
            ${botones}
          </div>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn-ghost" data-role="cancelar">Cancelar</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const panel = overlay.querySelector('.modal');
    trapFocus(panel);
    setTimeout(() => overlay.querySelector('[data-role="elegir"]')?.focus(), 0);

    function _cerrar(valor) {
      releaseFocus();
      overlay.remove();
      document.removeEventListener('keydown', _onKey);
      resolve(valor);
    }

    function _onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); _cerrar(null); }
    }

    overlay.addEventListener('click', e => {
      const btn = e.target.closest('[data-role]');
      if (btn?.dataset.role === 'elegir') {
        _cerrar(btn.dataset.cuentaId || null);
      } else if (btn?.dataset.role === 'cancelar' || e.target === overlay) {
        _cerrar(null);
      }
    });

    document.addEventListener('keydown', _onKey);
  });
}
