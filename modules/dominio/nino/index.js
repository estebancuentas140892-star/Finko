/**
 * nino/index.js - la app del niño (APR.3c, ADR 093 D9).
 *
 * Pinta `#nino-main` y su barra `#nino-nav` cuando Finko entra al perfil de
 * un niño, y los vacía al volver al adulto: el niño nunca ve nada del adulto
 * y lo suyo no queda en el DOM del adulto. Quién está activo lo dice
 * `infra/perfiles.js`; el cambio de piel lo hace `ui/quien-usa.js`; la
 * lección la abre Aprende (`leccion-abrir`), con el mismo motor.
 *
 * Las cuatro pantallas son estado de la app del niño, no rutas del hash: el
 * router del adulto no las conoce y el niño no puede llegar a una sección
 * adulta escribiendo una dirección.
 */

import { EventBus } from '../../core/state.js';
import { registrarAccion } from '../../ui/actions.js';
import { programarRender } from '../../infra/render.js';
import { perfilActivo } from '../../infra/perfiles.js';
import { VISTAS_NINO } from './logic.js';
import { htmlBarraNino, htmlInicioNino, htmlRutaNino, htmlAlcanciaNino, htmlYoNino } from './view.js';

const _VISTA_HTML = {
  inicio: htmlInicioNino,
  aprender: htmlRutaNino,
  alcancia: htmlAlcanciaNino,
  yo: htmlYoNino,
};

/** Pantalla actual del niño. */
let _vista = 'inicio';

/** Último HTML pintado: repintar lo mismo le quitaría el foco al niño. */
let _ultimo = null;

function _render() {
  const main = document.getElementById('nino-main');
  const nav = document.getElementById('nino-nav');
  if (!main) return;
  const perfil = perfilActivo();
  const html = perfil ? _VISTA_HTML[_vista](perfil) : '';
  if (nav) nav.innerHTML = perfil ? htmlBarraNino(_vista) : '';
  if (html === _ultimo) return;
  _ultimo = html;
  main.innerHTML = html;
}

/** Cambia de pantalla y lleva el foco a su título. */
function _irA(vista) {
  if (!VISTAS_NINO.includes(vista) || !perfilActivo()) return;
  _vista = vista;
  _render();
  window.scrollTo?.(0, 0);
  document.querySelector('#nino-main h1')?.focus({ preventScroll: true });
}

export function initNino() {
  // Entrar a un perfil siempre empieza en Inicio. El foco al saludo lo pone
  // ui/quien-usa.js cuando la piel ya cambió.
  EventBus.on('perfil:cambio', () => {
    _vista = 'inicio';
    _render();
  });
  EventBus.on('state:change', () => {
    if (perfilActivo()) programarRender(_render);
  });
  registrarAccion('nino-vista', (el) => _irA(el?.dataset?.vista));
  // El cierre de la lección pide una pantalla ("Ver mi alcancía", "Volver a
  // la ruta") sin importar este dominio (ADN 10).
  EventBus.on('nino:vista', ({ vista } = {}) => _irA(vista));
}
