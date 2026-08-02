/**
 * sw-aviso.js - aviso discreto cuando el SW aplico una version nueva pero no
 * pudo recargar solo (modal abierto o input con foco en ese momento, ver
 * sw-register.js). Sin este aviso el usuario no tenia ninguna senal hasta la
 * proxima recarga casual (UPD.1).
 *
 * `sw-register.js` es un <script> clasico (no puede importar EventBus) y
 * avisa via CustomEvent en `document`; este modulo solo escucha y pinta.
 */

/** Inicializa el listener del aviso. Llamar una vez al arrancar. */
export function initSwAviso() {
  document.addEventListener('sw:actualizacion-lista', _mostrarAviso, { once: true });
}

function _mostrarAviso() {
  const aviso = document.createElement('div');
  aviso.className = 'sw-aviso';
  aviso.setAttribute('role', 'status');
  aviso.setAttribute('aria-live', 'polite');
  aviso.innerHTML = `
    <span class="sw-aviso__texto">Hay una versión nueva de Finko lista</span>
    <button type="button" class="btn btn-primary btn-sm" data-role="aplicar">Actualizar ahora</button>`;

  document.body.appendChild(aviso);
  aviso.querySelector('[data-role="aplicar"]').addEventListener('click', () => location.reload());
}
