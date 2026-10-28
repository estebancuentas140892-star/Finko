/**
 * sw-aviso.js - aviso con el botón "Actualizar" cuando hay una versión nueva de
 * Finko (UPD.1, UPD.3).
 *
 * Desde UPD.3 es la forma normal en que entra una versión nueva con la app
 * abierta: `sw-register.js` ya no recarga sola, avisa. Actualizar es recargar
 * la página: los datos viven en `localStorage` y una recarga no los toca (el
 * guardado pendiente se escribe en `pagehide`, ver `initFlushOnHide()`). No
 * hace falta desinstalar la app ni borrar la caché.
 *
 * "Ahora no" lo cierra, y no es "nunca": vuelve a salir la próxima vez que la
 * persona regrese a la app, y la versión nueva entra sola al volver a abrirla.
 *
 * `sw-register.js` es un <script> clásico (no puede importar EventBus) y avisa
 * por dos lados: el CustomEvent `sw:actualizacion-lista` en `document` y el
 * atributo `data-sw-actualizacion="lista"` en `<html>`, que queda puesto.
 */

/** Inicializa el aviso. Llamar una vez al arrancar. */
export function initSwAviso() {
  document.addEventListener('sw:actualizacion-lista', mostrarAvisoActualizacion);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && versionNuevaLista()) mostrarAvisoActualizacion();
  });
  // El SW nuevo pudo tomar el control antes de que este módulo escuchara.
  if (versionNuevaLista()) mostrarAvisoActualizacion();
}

/**
 * true si ya hay una versión nueva activa y esta página sigue en la anterior:
 * solo falta recargar.
 * @returns {boolean}
 */
export function versionNuevaLista() {
  return document.documentElement.dataset.swActualizacion === 'lista';
}

/** Pinta el aviso. No-op si ya está a la vista. */
export function mostrarAvisoActualizacion() {
  if (document.querySelector('.sw-aviso')) return;

  const aviso = document.createElement('div');
  aviso.className = 'sw-aviso';
  aviso.setAttribute('role', 'status');
  aviso.setAttribute('aria-live', 'polite');
  aviso.innerHTML = `
    <p class="sw-aviso__cuerpo">
      <span class="sw-aviso__texto">Hay una versión nueva de Finko</span>
      <span class="sw-aviso__detalle">Tus datos se conservan.</span>
    </p>
    <div class="sw-aviso__acciones">
      <button type="button" class="btn btn-ghost btn-sm" data-role="despues">Ahora no</button>
      <button type="button" class="btn btn-primary btn-sm" data-role="aplicar">Actualizar</button>
    </div>`;

  document.body.appendChild(aviso);
  aviso.querySelector('[data-role="aplicar"]').addEventListener('click', () => location.reload());
  aviso.querySelector('[data-role="despues"]').addEventListener('click', () => aviso.remove());
}
