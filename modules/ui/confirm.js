/**
 * confirm.js - modal de confirmacion estetico que reemplaza window.confirm().
 *
 * Antes: los dominios usaban `dialogo(msg)` que llamaba `window.confirm(msg)`,
 * mostrando el dialogo nativo del browser, completamente fuera de la estetica
 * de Finko. Romper el look era el reporte del usuario.
 *
 * Ahora: `confirmar({ ... })` crea un overlay con el estilo de los demas modales
 * de la app y retorna Promise<boolean>. Los call-sites se vuelven async/await.
 *
 * Uso:
 *   const ok = await confirmar({
 *     titulo: 'Eliminar cuenta',
 *     mensaje: `¿Querés eliminar "Davivienda Ahorros"?`,
 *     confirmarTexto: 'Eliminar',
 *     peligroso: true,
 *   });
 *   if (!ok) return;
 */

import { trapFocus, releaseFocus } from '../infra/a11y.js';
import { esc as _esc } from '../infra/utils.js';

/**
 * @typedef {{
 *   titulo?:          string,
 *   mensaje:          string,
 *   confirmarTexto?:  string,
 *   cancelarTexto?:   string,
 *   peligroso?:       boolean,
 * }} OpcionesConfirmar
 */

/**
 * Muestra el modal de confirmacion y resuelve cuando el usuario toma decision.
 * @param {OpcionesConfirmar} opciones
 * @returns {Promise<boolean>} true si confirma, false si cancela.
 */
export function confirmar(opciones) {
  const {
    titulo         = 'Confirmar',
    mensaje,
    confirmarTexto = 'Aceptar',
    cancelarTexto  = 'Cancelar',
    peligroso      = false,
  } = opciones;

  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.dataset.open = '';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'confirm-title');
    overlay.innerHTML = `
      <div class="modal modal--confirm" role="document">
        <header class="modal__header">
          <h2 id="confirm-title" class="modal__title">${_esc(titulo)}</h2>
        </header>
        <div class="modal__body">
          <p class="confirm__mensaje">${_esc(mensaje)}</p>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn-ghost" data-role="cancelar">${_esc(cancelarTexto)}</button>
          <button type="button" class="btn ${peligroso ? 'btn-danger' : 'btn-primary'}" data-role="confirmar">${_esc(confirmarTexto)}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const panel = overlay.querySelector('.modal');
    trapFocus(panel);

    // Focus en el boton primario (confirmar) por defecto.
    setTimeout(() => {
      overlay.querySelector('[data-role="confirmar"]')?.focus();
    }, 0);

    function _cerrar(valor) {
      releaseFocus();
      overlay.remove();
      document.removeEventListener('keydown', _onKey);
      resolve(valor);
    }

    function _onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        _cerrar(false);
      } else if (e.key === 'Enter' && !e.target.matches('[data-role="cancelar"]')) {
        e.preventDefault();
        _cerrar(true);
      }
    }

    overlay.addEventListener('click', e => {
      const target = e.target.closest('[data-role]');
      if (target?.dataset.role === 'confirmar') _cerrar(true);
      else if (target?.dataset.role === 'cancelar') _cerrar(false);
      // Click en backdrop (fuera del panel) cancela.
      else if (e.target === overlay) _cerrar(false);
    });

    document.addEventListener('keydown', _onKey);
  });
}

