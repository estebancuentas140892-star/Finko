/**
 * aceptacion-legal.js - aceptación obligatoria versionada del paquete legal (LEG.2).
 *
 * Contrato:
 * - `renderBloqueAceptacion()` es el fragmento compartido (checkbox + enlaces al
 *   Centro Legal): lo usa el paso 2 del onboarding (usuario nuevo) y el gate
 *   independiente de esta misma pantalla (usuario existente cuya versión
 *   aceptada quedó vieja).
 * - `initAceptacionLegal()` solo actúa sobre usuarios YA onboarded: un usuario
 *   nuevo resuelve la aceptación dentro del wizard (onboarding.js), no acá.
 * - El overlay `#aceptacion-legal` es bloqueante (`data-bloqueante`, ver
 *   actions.js): sin botón de cerrar y el Escape global lo ignora, porque
 *   "obligatoria" significa que no hay forma de seguir usando la app sin
 *   aceptar la versión vigente.
 */

import { S, EventBus } from '../core/state.js';
import { save } from '../core/storage.js';
import { abrirModal, cerrarModal } from './modales.js';
import { announce } from '../infra/a11y.js';
import { hoy } from '../infra/utils.js';
import { VERSION_LEGAL } from '../dominio/config/legal.js';
import { mostrarNovedadesSiHay } from './novedades.js';

/**
 * true si el usuario ya completó el onboarding pero no aceptó la versión
 * vigente del paquete legal (nunca aceptó ninguna, o aceptó una anterior).
 * Un usuario nuevo (S.onboarded === false) no cuenta acá: su aceptación es
 * paso 2 del wizard, ver onboarding.js.
 * @returns {boolean}
 */
export function faltaAceptarLegal() {
  if (!S.onboarded) return false;
  const aceptado = S.config?.legalAceptado;
  return !aceptado || aceptado.version !== VERSION_LEGAL;
}

/**
 * Fragmento HTML compartido: checkbox único de aceptación con enlaces al
 * Centro Legal (reutiliza la acción global `abrir-legal` ya registrada por
 * config/index.js) + nota de versión en borrador. Sin `<form>` propio: cada
 * llamador lo envuelve en el suyo.
 * @returns {string}
 */
export function renderBloqueAceptacion() {
  return `
    <div class="form-group form-group--checkbox">
      <label class="checkbox-row">
        <input type="checkbox" name="acepto" required aria-required="true" />
        <span>
          Acepto los
          <button type="button" class="onboarding__link" data-action="abrir-legal" data-doc="terminos-y-condiciones">Términos y condiciones</button>,
          la
          <button type="button" class="onboarding__link" data-action="abrir-legal" data-doc="politica-de-privacidad">Política de privacidad</button>
          y el
          <button type="button" class="onboarding__link" data-action="abrir-legal" data-doc="tratamiento-de-datos-personales">Tratamiento de datos personales</button>.
        </span>
      </label>
    </div>
    <p class="onboarding__note">
      Paquete legal en <strong>${VERSION_LEGAL}</strong>: seguimos completando algunos datos
      (contacto y responsable) antes de la versión final. Tus datos ya viven solo en tu
      dispositivo, hoy y siempre.
    </p>`;
}

/**
 * Marca S.config.legalAceptado con la versión vigente y la fecha de hoy.
 * No hace save() ni cierra ningún overlay: cada llamador decide cuándo.
 */
export function registrarAceptacion() {
  if (!S.config || typeof S.config !== 'object') S.config = {};
  S.config.legalAceptado = { version: VERSION_LEGAL, fecha: hoy() };
}

/**
 * Inicializa el gate independiente para usuarios ya onboarded. No-op si no
 * hace falta (usuario al día o todavía no completó el onboarding).
 */
export function initAceptacionLegal() {
  if (!faltaAceptarLegal()) return;

  const overlay = document.getElementById('aceptacion-legal');
  if (!overlay) return;

  const body = overlay.querySelector('#aceptacion-legal-body');
  if (body) {
    body.innerHTML = `
      <form id="form-aceptacion-legal" novalidate>
        <h2 class="onboarding__title">Actualizamos nuestras políticas</h2>
        <p class="onboarding__desc">
          Antes de seguir usando Finko, confirma que las leíste y las aceptas.
        </p>
        ${renderBloqueAceptacion()}
        <div class="onboarding__footer">
          <button type="submit" class="btn btn-primary btn-lg">Aceptar y continuar</button>
        </div>
      </form>`;
  }

  abrirModal(overlay);
  overlay.addEventListener('submit', _onSubmitGate);
}

/** @param {SubmitEvent} e */
function _onSubmitGate(e) {
  e.preventDefault();
  const form = e.target;
  if (form.id !== 'form-aceptacion-legal') return;

  const acepto = form.querySelector('[name="acepto"]')?.checked === true;
  if (!acepto) {
    announce('Marca la casilla para confirmar que aceptas los documentos.', 'assertive');
    return;
  }

  registrarAceptacion();
  save();
  EventBus.emit('legal:aceptado');

  const overlay = document.getElementById('aceptacion-legal');
  if (overlay) cerrarModal(overlay);

  announce('Gracias, quedó registrada tu aceptación.');
  mostrarNovedadesSiHay();
}
