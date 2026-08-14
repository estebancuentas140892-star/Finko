/**
 * bloqueo-acceso.js - pantalla de candado al abrir la app (CFG.5a, ADR 063).
 *
 * Contrato:
 * - `initBloqueoAcceso()` solo actúa si el usuario activó candado y ya completó
 *   el onboarding: un usuario nuevo no tiene PIN que pedir.
 * - El overlay `#bloqueo-acceso` es bloqueante (`data-bloqueante`, ver
 *   actions.js): sin botón de cerrar y el Escape global lo ignora. Mismo patrón
 *   que el gate de aceptación legal (`aceptacion-legal.js`).
 * - El fondo es opaco (`--fk-bg-base`, ver `modals.css`), no el overlay
 *   translúcido de siempre: una pantalla de privacidad que deja leer los saldos
 *   detrás del blur no cumple su único trabajo.
 * - Alcance real, tal cual lo fija el ADR 063: esto tapa la pantalla frente a
 *   otra persona. No cifra `fk_v1`. Quien abra devtools o un respaldo lo ve todo.
 */

import { S, EventBus } from '../core/state.js';
import { borrarTodo } from '../core/storage.js';
import { abrirModal, cerrarModal } from './modales.js';
import { announce, trapFocus, releaseFocus } from '../infra/a11y.js';
import { esc as _esc } from '../infra/utils.js';
import { confirmar } from './confirm.js';
import {
  candadoActivo, verificarPin, registrarFallo, msDeFreno, limpiarFallos,
  FALLOS_ANTES_DE_FRENO, PIN_LARGO_MAX,
} from '../dominio/config/bloqueo.js';

/** true si hay que pedir el PIN antes de dejar usar la app. */
export function faltaDesbloquear() {
  return S.onboarded === true && candadoActivo(S.config?.bloqueo);
}

/** Inicializa el gate. No-op si el usuario no tiene candado activo. */
export function initBloqueoAcceso() {
  if (!faltaDesbloquear()) return;

  const overlay = document.getElementById('bloqueo-acceso');
  if (!overlay) return;

  const body = overlay.querySelector('#bloqueo-acceso-body');
  if (body) {
    body.innerHTML = `
      <form id="form-bloqueo-acceso" novalidate>
        <h2 class="onboarding__title">Finko está con candado</h2>
        <p class="onboarding__desc">Escribe tu PIN para entrar.</p>
        <div class="form-group">
          <label for="bloqueo-acceso-pin" class="label">Tu PIN</label>
          <input id="bloqueo-acceso-pin" name="pin" class="input" type="password"
                 inputmode="numeric" autocomplete="current-password"
                 maxlength="${PIN_LARGO_MAX}" autofocus />
        </div>
        <p class="form-hint form-hint--muted" id="bloqueo-acceso-error" role="alert"></p>
        <div class="onboarding__footer">
          <button type="submit" class="btn btn-primary btn-lg">Entrar</button>
          <button type="button" class="btn btn-ghost" data-role="olvide-pin">Olvidé mi PIN</button>
        </div>
      </form>`;
  }

  // El freno NO se limpia al montar: vive en `sessionStorage` justamente para
  // que recargar la pestaña no sea la forma de saltarse la espera anunciada.
  abrirModal(overlay);
  overlay.addEventListener('submit', _onSubmit);
  overlay.addEventListener('click', _onClick);
}

/** @param {string} texto */
function _error(texto) {
  const el = document.getElementById('bloqueo-acceso-error');
  if (el) el.textContent = texto;
  if (texto) announce(texto, 'assertive');
}

/**
 * Verifica un PIN contra el freno de intentos vigente. Comparte el desenlace
 * (freno activo, PIN correcto, PIN incorrecto) entre el gate de arranque y el
 * guard de acciones críticas (CFG.5b): mismo freno, mismos mensajes.
 * @param {string} pin
 * @returns {Promise<{ok: boolean, mensaje: string|null}>}
 */
async function _intentoPin(pin) {
  const espera = msDeFreno();
  if (espera > 0) {
    return { ok: false, mensaje: `Demasiados intentos. Espera ${Math.ceil(espera / 1000)} segundos.` };
  }
  if (await verificarPin(pin, S.config?.bloqueo)) {
    limpiarFallos();
    return { ok: true, mensaje: null };
  }
  const freno = registrarFallo();
  return {
    ok: false,
    mensaje: freno > 0
      ? `PIN incorrecto. Van ${FALLOS_ANTES_DE_FRENO} intentos: espera ${Math.ceil(freno / 1000)} segundos.`
      : 'PIN incorrecto. Intenta de nuevo.',
  };
}

/** @param {SubmitEvent} e */
async function _onSubmit(e) {
  e.preventDefault();
  const form = /** @type {HTMLFormElement} */ (e.target);
  if (form.id !== 'form-bloqueo-acceso') return;

  const campo = /** @type {HTMLInputElement|null} */ (form.querySelector('[name="pin"]'));
  const pin   = campo?.value ?? '';
  const { ok, mensaje } = await _intentoPin(pin);

  if (ok) {
    if (campo) campo.value = '';
    _error('');
    const overlay = document.getElementById('bloqueo-acceso');
    if (overlay) cerrarModal(overlay);
    announce('Candado abierto.');
    // bootstrap.js tiene detrás de este evento el gate legal y las novedades.
    EventBus.emit('bloqueo:abierto');
    return;
  }

  if (campo) {
    campo.value = '';
    campo.focus();
  }
  _error(mensaje);
}

/** @param {MouseEvent} e */
async function _onClick(e) {
  const boton = /** @type {HTMLElement} */ (e.target).closest('[data-role="olvide-pin"]');
  if (!boton) return;

  // Única salida honesta (ADR 063 punto 7): los datos no están cifrados, así que
  // no hay nada que "recuperar" con el PIN correcto ni servidor que lo reponga.
  const ok = await confirmar({
    titulo:         'Olvidé mi PIN',
    mensaje:        'Tu PIN no se puede recuperar: Finko no lo guarda en ninguna parte. La única forma de volver a entrar es borrar todo lo que tienes en este dispositivo (gastos, cuentas, metas y compromisos) y empezar de cero. No se puede deshacer.',
    confirmarTexto: 'Borrar todo y empezar de cero',
    peligroso:      true,
  });
  if (!ok) return;

  borrarTodo();
  announce('Datos borrados. Recargando…');
  setTimeout(() => location.reload(), 800);
}

// ── RE-AUTENTICACIÓN EN ACCIONES CRÍTICAS (CFG.5b, ADR 063) ──────
//
// Restablecer la app, borrar toda la información y exportar el respaldo
// completo no se pueden deshacer: con el candado activo, exigen el PIN aunque
// la app ya esté abierta. Con el candado apagado no piden nada: el guard no
// se puede convertir en un muro para quien nunca activó el candado.

/**
 * Pide el PIN antes de ejecutar una acción crítica. Mismo contrato que
 * `confirmar()`: Promise<boolean>. Si no hay candado activo, resuelve `true`
 * sin mostrar nada.
 * @param {{titulo?: string, mensaje?: string}} [opciones]
 * @returns {Promise<boolean>}
 */
export function confirmarPin(opciones = {}) {
  if (!candadoActivo(S.config?.bloqueo)) return Promise.resolve(true);

  const {
    titulo  = 'Confirma tu PIN',
    mensaje = 'Escribe tu PIN para confirmar esta acción.',
  } = opciones;

  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.dataset.open = '';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'confirm-pin-title');
    overlay.innerHTML = `
      <div class="modal modal--confirm" role="document">
        <header class="modal__header">
          <h2 id="confirm-pin-title" class="modal__title">${_esc(titulo)}</h2>
        </header>
        <div class="modal__body">
          <p class="confirm__mensaje">${_esc(mensaje)}</p>
          <div class="form-group">
            <label for="confirm-pin-input" class="label">Tu PIN</label>
            <input id="confirm-pin-input" class="input" type="password"
                   inputmode="numeric" autocomplete="current-password"
                   maxlength="${PIN_LARGO_MAX}" autofocus />
          </div>
          <p class="form-hint form-hint--muted" id="confirm-pin-error" role="alert"></p>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn-ghost" data-role="cancelar">Cancelar</button>
          <button type="button" class="btn btn-primary" data-role="confirmar">Continuar</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const panel = overlay.querySelector('.modal');
    trapFocus(panel);
    setTimeout(() => {
      overlay.querySelector('#confirm-pin-input')?.focus();
    }, 0);

    function _cerrar(valor) {
      releaseFocus();
      overlay.remove();
      document.removeEventListener('keydown', _onKey);
      resolve(valor);
    }

    function _error(texto) {
      const el = overlay.querySelector('#confirm-pin-error');
      if (el) el.textContent = texto;
      if (texto) announce(texto, 'assertive');
    }

    async function _intentar() {
      const campo = /** @type {HTMLInputElement|null} */ (overlay.querySelector('#confirm-pin-input'));
      const pin   = campo?.value ?? '';
      const { ok, mensaje: error } = await _intentoPin(pin);

      if (ok) {
        _cerrar(true);
        return;
      }
      if (campo) {
        campo.value = '';
        campo.focus();
      }
      _error(error);
    }

    function _onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        _cerrar(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        _intentar();
      }
    }

    overlay.addEventListener('click', e => {
      const target = e.target.closest('[data-role]');
      if (target?.dataset.role === 'confirmar') _intentar();
      else if (target?.dataset.role === 'cancelar') _cerrar(false);
      else if (e.target === overlay) _cerrar(false);
    });

    document.addEventListener('keydown', _onKey);
  });
}
