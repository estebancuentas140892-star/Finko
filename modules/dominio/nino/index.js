/**
 * nino/index.js - el perfil niño (APR.3a, ADR 093 D9).
 *
 * Pinta `#nino-main` cuando Finko entra al perfil de un niño y lo vacía al
 * volver al adulto: el niño nunca ve nada del adulto, y lo suyo no queda en
 * el DOM del adulto. Quién está activo lo dice `infra/perfiles.js`; el cambio
 * de piel lo hace `ui/quien-usa.js`.
 */

import { EventBus } from '../../core/state.js';
import { programarRender } from '../../infra/render.js';
import { perfilActivo } from '../../infra/perfiles.js';
import { htmlInicioNino } from './view.js';

/** Último HTML pintado: repintar lo mismo le quitaría el foco al niño. */
let _ultimo = null;

function _render() {
  const el = document.getElementById('nino-main');
  if (!el) return;
  const perfil = perfilActivo();
  const html = perfil ? htmlInicioNino(perfil) : '';
  if (html === _ultimo) return;
  _ultimo = html;
  el.innerHTML = html;
}

export function initNino() {
  // El foco al saludo lo pone ui/quien-usa.js cuando la piel ya cambió.
  EventBus.on('perfil:cambio', _render);
  EventBus.on('state:change', () => {
    if (perfilActivo()) programarRender(_render);
  });
}
