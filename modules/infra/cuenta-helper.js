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
import { bancoAvatar } from './bancos.js';
import { distribuirPago } from './distribuir-pago.js';

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

/**
 * Resuelve el reparto de un pago entre una o varias cuentas, sin dejar ninguna
 * en negativo. Cobra de la(s) cuenta(s) con más saldo primero.
 *
 *   - 0 cuentas activas: diálogo guiado a Mis Cuentas. Devuelve null.
 *   - 1 cuenta activa: la usa por el monto completo (el caller confirma si
 *     queda en negativo, igual que el flujo de una sola cuenta).
 *   - Varias cuentas: picker multi-selección con reparto automático.
 *
 * @param {import('../core/state.js').Cuenta[]} cuentas - lista completa de S.cuentas.
 * @param {number} monto - total a cubrir (COP).
 * @param {string} [contexto] - texto corto para mensajes.
 * @returns {Promise<Array<{cuentaId:string, monto:number}>|null>}
 *   - array: cuánto sacar de cada cuenta (suma = monto cuando cubre).
 *   - null: cancelado o redirigido a Mis Cuentas (el caller aborta).
 */
export async function resolverPagoMultiCuenta(cuentas, monto, contexto = 'completar esta operación') {
  const activas = (cuentas ?? []).filter(c => c.activa !== false);

  if (activas.length === 0) {
    _mostrarGuiadoCero(contexto);
    return null;
  }

  if (activas.length === 1) {
    // Una sola cuenta: la usa por el monto completo. El caller decide si
    // confirma el sobregiro (no hay alternativa para repartir).
    return [{ cuentaId: activas[0].id, monto: Number(monto) || 0 }];
  }

  return _mostrarPickerMultiCuenta(activas, Number(monto) || 0, contexto);
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
        <span class="cuenta-picker__main">
          ${bancoAvatar(c.banco)}
          <span class="cuenta-picker__nombre">${_esc(c.nombre)}</span>
        </span>
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

// ── CASO VARIAS CUENTAS: PAGO REPARTIDO ──────────────────────────

/**
 * Picker multi-selección: el usuario marca una o varias cuentas y el sistema
 * reparte el monto entre ellas (mayor saldo primero) sin dejar negativos.
 * Resuelve con el array de splits cuando el pago queda cubierto, o null.
 *
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {number} monto
 * @param {string} contexto
 * @returns {Promise<Array<{cuentaId:string, monto:number}>|null>}
 */
function _mostrarPickerMultiCuenta(activas, monto, contexto) {
  return new Promise(resolve => {
    // Pre-selección: el conjunto mínimo (mayor saldo primero) que cubre el
    // monto; si ni todas alcanzan, se pre-marcan todas.
    const previo = distribuirPago(activas, monto);
    const preSel = new Set(
      previo.ok ? previo.splits.map(s => s.cuentaId) : activas.map(c => c.id),
    );

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.dataset.open = '';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cuenta-multi-title');

    const filas = activas.map(c => `
      <label class="cuenta-multi__row">
        <input type="checkbox" class="cuenta-multi__check"
               data-cuenta-id="${_esc(c.id)}" ${preSel.has(c.id) ? 'checked' : ''} />
        <span class="cuenta-picker__main">
          ${bancoAvatar(c.banco)}
          <span class="cuenta-picker__nombre">${_esc(c.nombre)}</span>
        </span>
        <span class="cuenta-multi__cifras">
          <span class="cuenta-picker__saldo">${f(c.saldo ?? 0)}</span>
          <span class="cuenta-multi__draw" data-draw-for="${_esc(c.id)}"></span>
        </span>
      </label>`).join('');

    overlay.innerHTML = `
      <div class="modal modal--confirm" role="document">
        <header class="modal__header">
          <h2 id="cuenta-multi-title" class="modal__title">¿Desde qué cuentas?</h2>
        </header>
        <div class="modal__body">
          <p class="confirm__mensaje">Elige una o varias cuentas para ${_esc(contexto)} de <strong>${f(monto)}</strong>. Repartimos automáticamente desde la de mayor saldo, sin dejar ninguna en negativo.</p>
          <div class="cuenta-multi__lista">
            ${filas}
          </div>
          <p class="cuenta-multi__resumen" data-role="resumen" aria-live="polite"></p>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn-ghost" data-role="cancelar">Cancelar</button>
          <button type="button" class="btn btn-primary" data-role="confirmar">Registrar pago</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const panel        = overlay.querySelector('.modal');
    const resumenEl    = overlay.querySelector('[data-role="resumen"]');
    const btnConfirmar = overlay.querySelector('[data-role="confirmar"]');
    let ultimo = { ok: false, splits: [] };

    function _seleccionActual() {
      return [...overlay.querySelectorAll('.cuenta-multi__check:checked')]
        .map(ch => activas.find(c => c.id === ch.dataset.cuentaId))
        .filter(Boolean)
        .map(c => ({ id: c.id, saldo: c.saldo ?? 0 }));
    }

    function _recalcular() {
      const sel = _seleccionActual();
      const r = distribuirPago(sel, monto);
      ultimo = r;

      const porCuenta = new Map(r.splits.map(s => [s.cuentaId, s.monto]));
      overlay.querySelectorAll('[data-draw-for]').forEach(el => {
        const id = el.dataset.drawFor;
        const checked = overlay.querySelector(`.cuenta-multi__check[data-cuenta-id="${id}"]`)?.checked;
        const usa = porCuenta.get(id) || 0;
        if (checked && usa > 0) {
          el.textContent = `Se usará ${f(usa)}`;
          el.classList.remove('cuenta-multi__draw--idle');
        } else if (checked) {
          el.textContent = 'No se usará (ya cubierto)';
          el.classList.add('cuenta-multi__draw--idle');
        } else {
          el.textContent = '';
        }
      });

      if (r.ok) {
        resumenEl.textContent = `✓ Cubre el pago de ${f(monto)}.`;
        resumenEl.classList.remove('cuenta-multi__resumen--danger');
        btnConfirmar.disabled = false;
      } else {
        resumenEl.textContent = sel.length === 0
          ? `Selecciona al menos una cuenta. Necesitas ${f(monto)}.`
          : `Cubres ${f(r.cubierto)} de ${f(monto)}. Faltan ${f(r.faltante)}.`;
        resumenEl.classList.add('cuenta-multi__resumen--danger');
        btnConfirmar.disabled = true;
      }
    }

    overlay.addEventListener('change', e => {
      if (e.target.classList?.contains('cuenta-multi__check')) _recalcular();
    });

    trapFocus(panel);
    _recalcular();
    setTimeout(() => btnConfirmar.focus(), 0);

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
      if (btn?.dataset.role === 'confirmar') {
        if (ultimo.ok) _cerrar(ultimo.splits);
      } else if (btn?.dataset.role === 'cancelar' || e.target === overlay) {
        _cerrar(null);
      }
    });

    document.addEventListener('keydown', _onKey);
  });
}
