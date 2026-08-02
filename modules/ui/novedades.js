/**
 * novedades.js - resumen de novedades tras actualizar (UPD.1).
 *
 * Compara `S.config.ultimaVersionVista` contra las claves de
 * `NOVEDADES_POR_VERSION` (constants.js) y muestra, una sola vez, un modal
 * con lo que el usuario aun no vio. Independiente del aviso de actualizacion
 * (sw-aviso.js): corre en cada arranque, sea que la version nueva haya
 * entrado por la recarga silenciosa o por el boton del aviso.
 */

import { S } from '../core/state.js';
import { save } from '../core/storage.js';
import { trapFocus, releaseFocus } from '../infra/a11y.js';
import { esc as _esc } from '../infra/utils.js';
import { NOVEDADES_POR_VERSION, ultimaVersionNovedadesConocida } from '../core/constants.js';

/** Muestra el modal de novedades si hay entradas mas nuevas que las ya vistas. */
export function mostrarNovedadesSiHay() {
  const vistas = typeof S.config?.ultimaVersionVista === 'number' ? S.config.ultimaVersionVista : 0;
  const pendientes = Object.keys(NOVEDADES_POR_VERSION)
    .map(Number)
    .filter((v) => v > vistas)
    .sort((a, b) => a - b);

  if (pendientes.length === 0) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.dataset.open = '';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'novedades-title');

  const bloques = pendientes
    .map((v) => {
      const { titulo, items } = NOVEDADES_POR_VERSION[v];
      const lis = items.map((i) => `<li>${_esc(i)}</li>`).join('');
      return `<h3>${_esc(titulo)}</h3><ul class="novedades__lista">${lis}</ul>`;
    })
    .join('');

  overlay.innerHTML = `
    <div class="modal modal--sm" role="document">
      <header class="modal__header">
        <h2 id="novedades-title" class="modal__title">Novedades de esta actualización</h2>
      </header>
      <div class="modal__body">${bloques}</div>
      <div class="modal__footer">
        <button type="button" class="btn btn-primary" data-role="cerrar">Entendido</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  const panel = overlay.querySelector('.modal');
  trapFocus(panel);
  setTimeout(() => overlay.querySelector('[data-role="cerrar"]')?.focus(), 0);

  function _cerrar() {
    releaseFocus();
    overlay.remove();
    document.removeEventListener('keydown', _onKey);
    S.config.ultimaVersionVista = ultimaVersionNovedadesConocida();
    save();
  }

  function _onKey(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      _cerrar();
    }
  }

  overlay.addEventListener('click', (e) => {
    if (e.target.closest('[data-role="cerrar"]') || e.target === overlay) _cerrar();
  });
  document.addEventListener('keydown', _onKey);
}
