/**
 * ui/toast.js - aviso visual efimero, generico para toda la app.
 *
 * Hasta GAS.2a el unico toast visual de Finko era `.logro-toast`, propiedad
 * privada del dominio `logros` (nadie mas puede importar su index.js sin
 * violar ADN 10). Este modulo es el mismo patron (cola de uno a la vez,
 * autocierre pausable por hover, cierre manual con la X, `role="status"`)
 * pero vive en `ui/` para que cualquier dominio lo use sin acoplarse a otro.
 *
 * Primer consumidor: `gastos/index.js` (`_guardarGasto()`), GAS.2a.
 *
 * CSS requerido (styles/components/nudges.css, bloque "TOAST GENERICO"):
 *   .fk-toast, .fk-toast--ok/--alerta/--peligro, .fk-toast__icono,
 *   .fk-toast__body, .fk-toast__titulo, .fk-toast__detalle,
 *   .fk-toast__cerrar; reusa @keyframes toastIn/toastOut de base.css.
 */

import { esc as _esc } from '../infra/utils.js';
import { icon } from '../infra/icons.js';

const DURACION_MS = 5000;

/** Icono por tono cuando el caller no elige uno explicito. */
const _ICONO_POR_TONO = {
  ok:      'check-circle',
  alerta:  'alert',
  peligro: 'alert',
};

// Un toast a la vez, igual que el de logros: todos se posicionan en el mismo
// punto fijo y con la pausa por hover la vida de un toast ya no es
// predecible como para escalonarlos con timers.
const _cola = [];
let _activo = false;

/**
 * Encola un toast. Si ya hay uno visible, este espera su turno.
 *
 * @param {{
 *   titulo:  string,
 *   detalle?: string,
 *   tono?:    'ok' | 'alerta' | 'peligro',
 *   icono?:   string,
 * }} opciones
 */
export function mostrarToast({ titulo, detalle = '', tono = 'ok', icono }) {
  _cola.push({ titulo, detalle, tono, icono: icono ?? _ICONO_POR_TONO[tono] });
  if (!_activo) _siguiente();
}

function _siguiente() {
  const sig = _cola.shift();
  if (!sig) { _activo = false; return; }
  _activo = true;
  _crear(sig);
}

function _crear({ titulo, detalle, tono, icono }) {
  const toast = document.createElement('div');
  toast.className = `fk-toast fk-toast--${tono}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span class="fk-toast__icono" aria-hidden="true">${icon(icono)}</span>
    <div class="fk-toast__body">
      <p class="fk-toast__titulo">${_esc(titulo)}</p>
      ${detalle ? `<p class="fk-toast__detalle">${_esc(detalle)}</p>` : ''}
    </div>
    <button type="button" class="fk-toast__cerrar" aria-label="Cerrar aviso">&times;</button>`;

  document.body.appendChild(toast);

  // Nota: NO armar un `animationend` defensivo global. La animacion de
  // entrada (`toastIn`) dispara `animationend` ~350ms despues; el listener
  // del fade se arma recien dentro de `cerrar()` para no confundirse con
  // la entrada (mismo cuidado que logros/index.js).
  let cerrado  = false;
  let removido = false;
  const cerrar = () => {
    if (cerrado || !toast.isConnected) return;
    cerrado = true;
    toast.classList.add('fade');
    const onFin = () => {
      if (removido) return; // animationend + fallback no deben avanzar la cola 2 veces
      removido = true;
      toast.remove();
      _siguiente();
    };
    toast.addEventListener('animationend', onFin, { once: true });
    // Fallback por si animationend no dispara (prefers-reduced-motion).
    setTimeout(onFin, 400);
  };

  // Autocierre pausable: al entrar el cursor se congela el tiempo restante,
  // al salir se retoma (con un minimo para que no muera apenas salga).
  let restante = DURACION_MS;
  let inicio   = Date.now();
  let timer    = setTimeout(cerrar, restante);

  toast.addEventListener('mouseenter', () => {
    if (cerrado || timer === null) return;
    clearTimeout(timer);
    timer = null;
    restante -= Date.now() - inicio;
  });
  toast.addEventListener('mouseleave', () => {
    if (cerrado || timer !== null) return;
    inicio = Date.now();
    timer = setTimeout(cerrar, Math.max(restante, 1000));
  });
  toast.querySelector('.fk-toast__cerrar').addEventListener('click', () => {
    if (timer !== null) clearTimeout(timer);
    cerrar();
  });
}
