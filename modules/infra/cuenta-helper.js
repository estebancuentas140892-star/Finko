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
 * Renderiza un selector de cuenta en-formulario: una tarjeta seleccionable por
 * cuenta activa, con su avatar de entidad, nombre y saldo. El valor elegido se
 * lee del radio `name="cuentaId"`. Pre-selecciona `selectedId` si se indica, o
 * la cuenta de mayor saldo. Devuelve '' si no hay cuentas activas (el caller
 * muestra su propio estado vacío).
 *
 * @param {import('../core/state.js').Cuenta[]} cuentas
 * @param {{ selectedId?: string|null, label?: string }} [opts]
 * @returns {string}
 */
export function renderSelectorCuenta(cuentas, { selectedId = null, label = '¿De qué cuenta sale el dinero?' } = {}) {
  const activas = (cuentas ?? []).filter(c => c.activa !== false);
  if (activas.length === 0) return '';

  const sel = (selectedId && activas.some(c => c.id === selectedId))
    ? selectedId
    : [...activas].sort((a, b) => (b.saldo ?? 0) - (a.saldo ?? 0))[0].id;

  const filas = activas.map(c => `
      <label class="cuenta-sel__row">
        <input type="radio" name="cuentaId" class="cuenta-sel__radio"
               value="${_esc(c.id)}" ${c.id === sel ? 'checked' : ''} />
        <span class="cuenta-picker__main">
          ${bancoAvatar(c.banco)}
          <span class="cuenta-picker__nombre">${_esc(c.nombre)}</span>
        </span>
        <span class="cuenta-picker__saldo">${f(c.saldo ?? 0)}</span>
      </label>`).join('');

  return `
    <div class="form-group">
      <span class="label">${_esc(label)}</span>
      <div class="cuenta-sel__lista" role="radiogroup" aria-label="${_esc(label)}">
        ${filas}
      </div>
    </div>`;
}

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

/**
 * Resuelve el reparto de un pago partiendo de una cuenta preferida (la que el
 * usuario eligió en el formulario):
 *   - 0 cuentas: diálogo guiado a Mis Cuentas. Devuelve null.
 *   - La preferida cubre el monto: la usa por el total. Devuelve un split.
 *   - La preferida no alcanza y es la única cuenta: devuelve un split por el
 *     total (el caller confirma el sobregiro, no hay con qué repartir).
 *   - La preferida no alcanza y hay más cuentas: abre el picker de reparto
 *     pre-sembrado con la preferida, para completar sin dejar negativos.
 *
 * @param {import('../core/state.js').Cuenta[]} cuentas
 * @param {number} monto
 * @param {string|null} preferidaId - cuenta elegida en el formulario.
 * @param {string} [contexto]
 * @returns {Promise<Array<{cuentaId:string, monto:number}>|null>}
 */
export async function resolverPagoConPreferida(cuentas, monto, preferidaId, contexto = 'completar esta operación') {
  const activas = (cuentas ?? []).filter(c => c.activa !== false);
  if (activas.length === 0) {
    _mostrarGuiadoCero(contexto);
    return null;
  }

  const m = Number(monto) || 0;
  const preferida = activas.find(c => c.id === preferidaId) || activas[0];
  const saldoPref = preferida.saldo ?? 0;

  // La cuenta elegida cubre el monto: úsala directamente, sin negativo.
  if (saldoPref >= m) {
    return [{ cuentaId: preferida.id, monto: m }];
  }

  // No alcanza y no hay con qué repartir: un solo split (el caller confirma).
  if (activas.length === 1) {
    return [{ cuentaId: preferida.id, monto: m }];
  }

  // No alcanza y hay más cuentas: repartir, avisando y pre-sembrando la preferida.
  const aviso = `${preferida.nombre} no alcanza para cubrir ${f(m)} (saldo ${f(saldoPref)}). Completa con otra(s) cuenta(s).`;
  return _mostrarPickerMultiCuenta(activas, m, contexto, preferida.id, aviso);
}

/**
 * Resuelve el reparto de un pago cuando NO hay un selector de cuenta en el
 * formulario (flujos de un solo clic, como "Marcar pagado" de Agenda):
 *   - 0 cuentas: diálogo guiado a Mis Cuentas. Devuelve null.
 *   - 1 cuenta: la usa por el total sin preguntar (regla de cuenta única). El
 *     caller confirma el sobregiro si el saldo no alcanza.
 *   - Varias cuentas: muestra el selector de tarjetas para elegir la cuenta
 *     preferida y luego aplica el reparto-fallback de `resolverPagoConPreferida`
 *     (solo abre el picker de reparto si la elegida no cubre el monto).
 *
 * @param {import('../core/state.js').Cuenta[]} cuentas
 * @param {number} monto
 * @param {string} [contexto]
 * @returns {Promise<Array<{cuentaId:string, monto:number}>|null>}
 */
export async function resolverPagoConSelector(cuentas, monto, contexto = 'completar esta operación') {
  const activas = (cuentas ?? []).filter(c => c.activa !== false);
  if (activas.length === 0) {
    _mostrarGuiadoCero(contexto);
    return null;
  }

  const m = Number(monto) || 0;

  // Regla de cuenta única: no se pregunta. El caller confirma el sobregiro.
  if (activas.length === 1) {
    return [{ cuentaId: activas[0].id, monto: m }];
  }

  // Varias cuentas: primero elegir la preferida con el selector de tarjetas.
  const preferidaId = await _mostrarSelectorPreferida(activas, m, contexto);
  if (preferidaId === null) return null; // canceló

  // Reparto-fallback: usa la preferida si cubre; si no, abre el picker.
  return resolverPagoConPreferida(cuentas, m, preferidaId, contexto);
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

/**
 * Muestra el selector de tarjetas para elegir la cuenta preferida de un pago
 * (flujos sin formulario, como "Marcar pagado"). Reusa `renderSelectorCuenta`,
 * de modo que se ve igual que el selector embebido en los formularios de gasto.
 * Resuelve con el id de la cuenta elegida o null si el usuario cancela.
 *
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {number} monto
 * @param {string} contexto
 * @returns {Promise<string|null>}
 */
function _mostrarSelectorPreferida(activas, monto, contexto) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.dataset.open = '';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cuenta-pref-title');

    overlay.innerHTML = `
      <div class="modal modal--confirm" role="document">
        <header class="modal__header">
          <h2 id="cuenta-pref-title" class="modal__title">¿Desde qué cuenta?</h2>
        </header>
        <div class="modal__body">
          <p class="confirm__mensaje">Elige la cuenta para ${_esc(contexto)} de <strong>${f(monto)}</strong>. Si no alcanza, podrás repartirlo entre varias.</p>
          ${renderSelectorCuenta(activas, { label: 'Cuenta de origen' })}
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn-ghost" data-role="cancelar">Cancelar</button>
          <button type="button" class="btn btn-primary" data-role="confirmar">Continuar</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const panel = overlay.querySelector('.modal');
    trapFocus(panel);
    setTimeout(() => overlay.querySelector('.cuenta-sel__radio:checked')?.focus(), 0);

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
        const elegida = overlay.querySelector('input[name="cuentaId"]:checked')?.value || null;
        _cerrar(elegida);
      } else if (btn?.dataset.role === 'cancelar' || e.target === overlay) {
        _cerrar(null);
      }
    });

    document.addEventListener('keydown', _onKey);
  });
}

// ── CASO VARIAS CUENTAS: PAGO REPARTIDO ──────────────────────────

/**
 * Conjunto de cuentas a pre-marcar partiendo de una preferida: incluye la
 * preferida y, si no alcanza, agrega las demás por mayor saldo hasta cubrir.
 *
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {number} monto
 * @param {string} preferidaId
 * @returns {Set<string>}
 */
function _preseleccionConPreferida(activas, monto, preferidaId) {
  const set = new Set();
  let acumulado = 0;
  const pref = activas.find(c => c.id === preferidaId);
  if (pref) {
    set.add(pref.id);
    acumulado += Math.max(0, pref.saldo ?? 0);
  }
  const otras = activas
    .filter(c => c.id !== preferidaId && (c.saldo ?? 0) > 0)
    .sort((a, b) => (b.saldo ?? 0) - (a.saldo ?? 0));
  for (const c of otras) {
    if (acumulado >= monto) break;
    set.add(c.id);
    acumulado += c.saldo ?? 0;
  }
  return set;
}

/**
 * Picker multi-selección: el usuario marca una o varias cuentas y el sistema
 * reparte el monto entre ellas (mayor saldo primero) sin dejar negativos.
 * Resuelve con el array de splits cuando el pago queda cubierto, o null.
 *
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {number} monto
 * @param {string} contexto
 * @param {string|null} [preferidaId] - cuenta a pre-sembrar (la elegida en el form).
 * @param {string} [aviso] - mensaje de advertencia (ej. "la cuenta no alcanza").
 * @returns {Promise<Array<{cuentaId:string, monto:number}>|null>}
 */
function _mostrarPickerMultiCuenta(activas, monto, contexto, preferidaId = null, aviso = '') {
  return new Promise(resolve => {
    // Pre-selección: si hay cuenta preferida, partir de ella y sumar las de
    // mayor saldo hasta cubrir. Si no, el conjunto mínimo (mayor saldo primero);
    // si ni todas alcanzan, se pre-marcan todas.
    let preSel;
    if (preferidaId) {
      preSel = _preseleccionConPreferida(activas, monto, preferidaId);
    } else {
      const previo = distribuirPago(activas, monto);
      preSel = new Set(
        previo.ok ? previo.splits.map(s => s.cuentaId) : activas.map(c => c.id),
      );
    }

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
          ${aviso ? `<p class="cuenta-multi__aviso">${_esc(aviso)}</p>` : ''}
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
      const r = distribuirPago(sel, monto, preferidaId);
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
