/**
 * ui/accion-arranque.js - la acción que pide un acceso directo del ícono
 * ([ADR 144](../../docs/DECISIONS/144-lo-que-finko-muestra-fuera-de-la-app.md) D4).
 *
 * "Registrar gasto" y "Registrar ingreso" abren la app en
 * `/?accion=<data-action>#seccion`. El parámetro va aparte del hash para no
 * mezclar acciones con secciones en el router, y es una **lista cerrada**:
 * cualquier otro valor se ignora. Se borra de la dirección apenas se lee, para
 * que recargar no vuelva a abrir el formulario, y se ejecuta después de los
 * gates (candado, aceptación legal): bootstrap decide cuándo.
 *
 * Nunca dentro del perfil de un niño ni antes del onboarding: esos accesos son
 * del adulto con la app ya en uso.
 */

import { S } from '../core/state.js';
import { dispatch } from './actions.js';
import { esPerfilNino } from '../infra/perfiles.js';

/** Las acciones que un acceso directo puede pedir. Crece solo con una decisión. */
export const ACCIONES_DE_ARRANQUE = Object.freeze(['nuevo-gasto', 'nuevo-ingreso-puntual']);

/**
 * La acción que trae la dirección, si es de la lista. Pura.
 *
 * @param {string} search `location.search`.
 * @returns {string|null}
 */
export function accionDeArranque(search) {
  const accion = new URLSearchParams(search ?? '').get('accion');
  return ACCIONES_DE_ARRANQUE.includes(accion) ? accion : null;
}

/**
 * Lee `?accion=` y lo borra de la dirección (con `replaceState`: no suma una
 * entrada al historial ni dispara `hashchange`). Conserva el resto.
 *
 * @returns {string|null} La acción, si es de la lista.
 */
export function tomarAccionDeArranque() {
  const params = new URLSearchParams(location.search);
  if (!params.has('accion')) return null;
  const accion = accionDeArranque(location.search);
  params.delete('accion');
  const resto = params.toString();
  history.replaceState(history.state, '', `${location.pathname}${resto ? `?${resto}` : ''}${location.hash}`);
  return accion;
}

/**
 * Ejecuta la acción como si se hubiera tocado su botón: el mismo manejador,
 * sin camino propio.
 *
 * @param {string|null} accion
 * @returns {boolean} true si la ejecutó.
 */
export function ejecutarAccionDeArranque(accion) {
  if (!ACCIONES_DE_ARRANQUE.includes(accion)) return false;
  if (S.onboarded !== true || esPerfilNino()) return false;
  const boton = document.createElement('button');
  boton.dataset.action = accion;
  dispatch(boton, new Event('click', { cancelable: true }));
  return true;
}
