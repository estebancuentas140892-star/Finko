/**
 * onboarding.js - wizard inicial para usuarios nuevos.
 *
 * Fase 6: stub funcional que auto-completaba el onboarding.
 * Fase 13: wizard real de 2 pasos (nombre + bienvenida) usando el sistema de modales.
 * LEG.2: paso 2, aceptación obligatoria del paquete legal antes de entrar.
 *
 * Contrato:
 * - Si el usuario ya completó el wizard, no hace nada.
 * - Si cierra con Escape en cualquier paso, S.onboarded queda en false y
 *   nada se guarda → el wizard reaparece desde el paso 1 en la próxima visita.
 * - Solo aceptar el paso legal (paso 2) persiste el onboarding.
 */

import { S, EventBus } from '../core/state.js';
import { save } from '../core/storage.js';
import { abrirModal, cerrarModal } from './modales.js';
import { renderAll } from '../infra/render.js';
import { announce } from '../infra/a11y.js';
import { esc } from '../infra/utils.js';
import { renderBloqueAceptacion, registrarAceptacion } from './aceptacion-legal.js';

/** Nombre capturado en el paso 1, en memoria hasta que el paso 2 lo persiste. */
let _nombreTemp = '';

/**
 * Inicializa el flujo de onboarding.
 * Si el usuario ya completó el wizard, retorna inmediatamente.
 */
export function initOnboarding() {
  if (S.onboarded) return;
  _mostrarWizard();
}

// ── WIZARD ───────────────────────────────────────────────────────

function _mostrarWizard() {
  const overlay = document.getElementById('onboarding');
  if (!overlay) return;

  _nombreTemp = '';

  // Inyectar el contenido del wizard en el body del modal.
  const body = overlay.querySelector('#onboarding-body');
  if (body) body.innerHTML = _renderPaso1();

  abrirModal(overlay);

  // Listener del formulario - delegado dentro del overlay.
  overlay.addEventListener('submit', _onSubmitWizard);
}

function _onSubmitWizard(e) {
  e.preventDefault();
  const form = e.target;

  if (form.id === 'form-onboarding') {
    _onSubmitPaso1(form);
  } else if (form.id === 'form-onboarding-legal') {
    _onSubmitPaso2(form);
  }
}

function _onSubmitPaso1(form) {
  const nombre = form.querySelector('[name="nombre"]')?.value?.trim() ?? '';

  if (!nombre) {
    announce('Por favor escribe tu nombre para continuar.', 'assertive');
    return;
  }

  _nombreTemp = nombre;

  const overlay = document.getElementById('onboarding');
  const body = overlay?.querySelector('#onboarding-body');
  if (body) {
    body.innerHTML = _renderPaso2(nombre);
    body.querySelector('input, button')?.focus();
  }
}

function _onSubmitPaso2(form) {
  const acepto = form.querySelector('[name="acepto"]')?.checked === true;
  if (!acepto) {
    announce('Marca la casilla para confirmar que aceptas los documentos.', 'assertive');
    return;
  }

  // Guardar perfil, aceptación legal y marcar onboarding completo.
  S.perfil.nombre = _nombreTemp;
  registrarAceptacion();
  S.onboarded = true;
  save();
  EventBus.emit('onboarding:completado');

  // Cerrar overlay y re-renderizar con los datos del usuario.
  const overlay = document.getElementById('onboarding');
  if (overlay) cerrarModal(overlay);

  renderAll();
  announce(`¡Bienvenido a Finko, ${_nombreTemp}!`);
}

// ── TEMPLATES ────────────────────────────────────────────────────

/**
 * Paso 1 del wizard. El hero lleva la marca "F" de NAV2.1b (ADR 040 D4) y
 * no un emoji: el 💚 se renderizaba distinto en cada sistema operativo, así
 * que la primera impresión de la app cambiaba de dibujo según el teléfono
 * (DIS.6/C2, hallazgo H2). Los estilos de las clases .onboarding__* viven
 * en styles/modals.css.
 */
function _renderPaso1() {
  return `
    <form id="form-onboarding" novalidate>
      <div class="onboarding__hero" aria-hidden="true">F</div>
      <h2 class="onboarding__title">¡Bienvenido a Finko!</h2>
      <p class="onboarding__desc">
        Tu gestión financiera personal, en tu idioma y sin complicaciones.
        Primero, ¿cómo te llamas?
      </p>
      <div class="form-group">
        <label for="onboarding-nombre" class="label">Tu nombre</label>
        <input id="onboarding-nombre" name="nombre" class="input" type="text"
               placeholder="Ej. Camilo" required aria-required="true"
               autocomplete="given-name" />
      </div>
      <div class="onboarding__footer">
        <button type="submit" class="btn btn-primary btn-lg">Siguiente →</button>
      </div>
      <p class="onboarding__note">
        Tus datos se guardan solo en tu dispositivo. Sin cuentas. Sin servidores.
      </p>
    </form>`;
}

/**
 * Paso 2 del wizard (LEG.2): aceptación obligatoria del paquete legal antes
 * de entrar. El bloque de checkbox + enlaces es compartido con el gate de
 * re-aceptación de usuarios existentes (aceptacion-legal.js).
 * @param {string} nombre - ya validado en el paso 1, solo para personalizar el saludo.
 */
function _renderPaso2(nombre) {
  return `
    <form id="form-onboarding-legal" novalidate>
      <h2 class="onboarding__title">Gracias, ${esc(nombre)}</h2>
      <p class="onboarding__desc">
        Un último paso antes de entrar: revisa y acepta estos documentos.
      </p>
      ${renderBloqueAceptacion()}
      <div class="onboarding__footer">
        <button type="submit" class="btn btn-primary btn-lg">Entrar a Finko</button>
      </div>
    </form>`;
}
