/**
 * contrasena-respaldo.js - pide la contraseña del archivo de respaldo
 * (CFG.4c, [ADR 043](../../docs/DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) D2.3).
 *
 * Dos momentos, un solo modal:
 * - **crear**: al exportar con cifrado activo. Dos campos que deben coincidir,
 *   porque una contraseña mal tecleada produce un archivo que nadie puede abrir
 *   y el usuario no se entera hasta el día que lo necesita.
 * - **abrir**: al importar un archivo cifrado. Un campo, y el error viene de
 *   intentar descifrar de verdad (AES-GCM autentica), no de comparar hashes.
 *
 * **No es el guard de CFG.5b y no lo reemplaza.** El PIN del
 * [ADR 063](../../docs/DECISIONS/063-candado-de-acceso-local.md) autoriza la
 * acción dentro de la app; esta contraseña abre un archivo. Son secretos
 * distintos con vidas distintas: exportar sigue pidiendo primero el PIN, y
 * después esto.
 *
 * Mismo esqueleto de modal que `confirmarPin()` (overlay creado a mano,
 * `trapFocus`, Escape cancela): acá no se reusa `confirmar()` porque necesita
 * devolver un valor escrito, no un booleano.
 */

import { announce, trapFocus, releaseFocus } from '../infra/a11y.js';
import { esc as _esc } from '../infra/utils.js';
import { validarContrasena, LARGO_MIN_CONTRASENA } from '../infra/cripto-respaldo.js';

/**
 * Aviso que no se suaviza (ADR 043 D2.3): sin recuperación posible, decirlo
 * antes es la única forma honesta de ofrecer cifrado.
 */
const AVISO_SIN_RECUPERACION =
  'Si olvidas esta contraseña, el archivo no se puede abrir. Nadie puede recuperarlo, ni Finko.';

/**
 * Abre el modal y resuelve con la contraseña escrita, o `null` si el usuario
 * canceló.
 *
 * En modo `abrir`, `verificar` permite que el llamador pruebe la contraseña sin
 * cerrar el modal: si devuelve un mensaje de error, el modal lo muestra y deja
 * reintentar. Sin `verificar`, el modal resuelve con lo primero que se escriba.
 *
 * @param {object} opciones
 * @param {'crear'|'abrir'} [opciones.modo='crear']
 * @param {(contrasena: string) => Promise<string|null>} [opciones.verificar]
 *   Devuelve un mensaje de error, o null si la contraseña sirve.
 * @returns {Promise<string|null>}
 */
export function pedirContrasenaRespaldo({ modo = 'crear', verificar } = {}) {
  const esCrear = modo === 'crear';

  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.dataset.open = '';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'contrasena-respaldo-title');

    const titulo = esCrear ? 'Protege tu respaldo' : 'Este respaldo está protegido';
    const mensaje = esCrear
      ? 'Elige una contraseña para cifrar el archivo. La vas a necesitar el día que lo restaures.'
      : 'Escribe la contraseña con la que se cifró este archivo.';

    overlay.innerHTML = `
      <div class="modal modal--confirm" role="document">
        <header class="modal__header">
          <h2 id="contrasena-respaldo-title" class="modal__title">${_esc(titulo)}</h2>
        </header>
        <div class="modal__body">
          <p class="confirm__mensaje">${_esc(mensaje)}</p>
          <div class="form-group">
            <label for="contrasena-respaldo-input" class="label">Contraseña</label>
            <input id="contrasena-respaldo-input" class="input" type="password"
                   autocomplete="${esCrear ? 'new-password' : 'current-password'}" />
            ${esCrear ? `<p class="form-hint">Al menos ${LARGO_MIN_CONTRASENA} caracteres.</p>` : ''}
          </div>
          ${esCrear ? `
          <div class="form-group">
            <label for="contrasena-respaldo-input2" class="label">Escríbela otra vez</label>
            <input id="contrasena-respaldo-input2" class="input" type="password"
                   autocomplete="new-password" />
          </div>
          <p class="form-hint">${_esc(AVISO_SIN_RECUPERACION)}</p>` : ''}
          <p class="form-hint form-hint--muted" id="contrasena-respaldo-error" role="alert"></p>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn-ghost" data-role="cancelar">Cancelar</button>
          <button type="button" class="btn btn-primary" data-role="confirmar">
            ${esCrear ? 'Cifrar y guardar' : 'Restaurar'}
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const panel = overlay.querySelector('.modal');
    trapFocus(panel);
    setTimeout(() => {
      overlay.querySelector('#contrasena-respaldo-input')?.focus();
    }, 0);

    function _cerrar(valor) {
      releaseFocus();
      overlay.remove();
      document.removeEventListener('keydown', _onKey);
      resolve(valor);
    }

    function _error(texto) {
      const el = overlay.querySelector('#contrasena-respaldo-error');
      if (el) el.textContent = texto ?? '';
      if (texto) announce(texto, 'assertive');
    }

    /** Bloquea los dos botones mientras se deriva la clave: PBKDF2 tarda. */
    function _ocupado(si) {
      overlay.querySelectorAll('[data-role]').forEach(b => { b.disabled = si; });
      const boton = overlay.querySelector('[data-role="confirmar"]');
      if (boton) {
        boton.textContent = si
          ? 'Un momento…'
          : (esCrear ? 'Cifrar y guardar' : 'Restaurar');
      }
    }

    async function _intentar() {
      const campo  = /** @type {HTMLInputElement|null} */ (overlay.querySelector('#contrasena-respaldo-input'));
      const campo2 = /** @type {HTMLInputElement|null} */ (overlay.querySelector('#contrasena-respaldo-input2'));
      const valor  = campo?.value ?? '';

      if (esCrear) {
        const error = validarContrasena(valor);
        if (error) { _error(error); campo?.focus(); return; }
        if (valor !== (campo2?.value ?? '')) {
          _error('Las dos contraseñas no coinciden.');
          if (campo2) { campo2.value = ''; campo2.focus(); }
          return;
        }
        _cerrar(valor);
        return;
      }

      if (valor.length === 0) { _error('Escribe la contraseña.'); return; }

      if (!verificar) { _cerrar(valor); return; }

      _error('');
      _ocupado(true);
      const error = await verificar(valor);
      _ocupado(false);

      if (!error) { _cerrar(valor); return; }
      _error(error);
      if (campo) { campo.value = ''; campo.focus(); }
    }

    function _onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        _cerrar(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        _intentar();
      }
    }

    overlay.addEventListener('click', e => {
      const target = e.target.closest('[data-role]');
      if (target?.dataset.role === 'confirmar') _intentar();
      else if (target?.dataset.role === 'cancelar') _cerrar(null);
      else if (e.target === overlay) _cerrar(null);
    });

    document.addEventListener('keydown', _onKey);
  });
}
