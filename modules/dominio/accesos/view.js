/**
 * accesos/view.js - fila de tiles personalizables + modal "Personalizar" (IN.4a).
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (toda en logic.js).
 */

import { S } from '../../core/state.js';
import { esc as _esc } from '../../infra/utils.js';
import { iconoCategoria, tejaCategoria } from '../../infra/icons.js';
import { ACCESOS_INICIO } from '../../core/constants.js';
import { accesosVisibles } from './logic.js';

/**
 * Renderiza los tiles de acceso rápido elegidos por el usuario, y siempre
 * deja visible el botón "Personalizar" (incluso con 0 tiles, para que el
 * usuario pueda agregar alguno).
 *
 * IN.9d (ADR 057 D4): dos copias del mismo contenido conviven en el DOM
 * (`#accesos-inicio-grid` en la fusión móvil, `#accesos-inicio-grid-escritorio`
 * en la columna propia de escritorio); render.js decide cuál se ve según el
 * ancho, esta función simplemente llena las dos. No-op si ninguna existe.
 */
export function renderAccesosInicio() {
  const grids = ['accesos-inicio-grid', 'accesos-inicio-grid-escritorio']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  if (grids.length === 0) return;

  const accesos = accesosVisibles(S.config?.accesosInicio, ACCESOS_INICIO);

  const html = accesos.map(a => `
    <a class="menu-mas__item" href="#${_esc(a.hash)}" data-section="${_esc(a.hash)}">
      ${iconoCategoria(a.icono, 'menu-mas__icon icon')}
      <span class="menu-mas__label">${_esc(a.nombre)}</span>
    </a>`).join('');

  grids.forEach(grid => { grid.innerHTML = html; });
}

/**
 * Renderiza en `#modal-personalizar-accesos-body` la lista completa del
 * catálogo, marcando activos los que ya están en `S.config.accesosInicio`.
 * Se re-inyecta en cada apertura y en cada toggle (accesos/index.js).
 */
export function renderModalPersonalizarAccesos() {
  const el = document.getElementById('modal-personalizar-accesos-body');
  if (!el) return;

  const activos = new Set(Array.isArray(S.config?.accesosInicio) ? S.config.accesosInicio : []);

  el.innerHTML = ACCESOS_INICIO.map(a => {
    const activo = activos.has(a.id);
    return `
      <button type="button" class="list-item accesos-row" data-action="accesos-toggle"
              data-id="${_esc(a.id)}" aria-pressed="${activo}">
        <div class="list-item__icon" aria-hidden="true">${tejaCategoria(a.icono, a.hash)}</div>
        <div class="list-item__body">
          <p class="list-item__title">${_esc(a.nombre)}</p>
        </div>
        <div class="list-item__meta accesos-row__check" aria-hidden="true">
          ${activo ? iconoCategoria('i-check-circle') : ''}
        </div>
      </button>`;
  }).join('');
}
