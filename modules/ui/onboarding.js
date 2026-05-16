/**
 * onboarding.js — wizard inicial para usuarios nuevos.
 *
 * Fase 6: stub funcional que auto-completaba el onboarding.
 * Fase 13: wizard real de 2 pasos (nombre + bienvenida) usando el sistema de modales.
 *
 * Contrato:
 * - Si el usuario ya completó el wizard, no hace nada.
 * - Si cierra con Escape, S.onboarded queda en false → el wizard reaparece en la próxima visita.
 * - Solo el botón "Empezar" persiste el onboarding.
 */

import { S, EventBus } from '../core/state.js';
import { save } from '../core/storage.js';
import { abrirModal, cerrarModal } from './modales.js';
import { renderAll } from '../infra/render.js';
import { announce } from '../infra/a11y.js';

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

  // Inyectar el contenido del wizard en el body del modal.
  const body = overlay.querySelector('#onboarding-body');
  if (body) body.innerHTML = _renderPaso1();

  abrirModal(overlay);

  // Listener del formulario — delegado dentro del overlay.
  overlay.addEventListener('submit', _onSubmitWizard);
}

function _onSubmitWizard(e) {
  e.preventDefault();
  const form = e.target;
  if (form.id !== 'form-onboarding') return;

  const nombre = form.querySelector('[name="nombre"]')?.value?.trim() ?? '';

  if (!nombre) {
    announce('Por favor escribí tu nombre para continuar.', 'assertive');
    return;
  }

  // Guardar perfil y marcar onboarding completo.
  S.perfil.nombre = nombre;
  S.onboarded     = true;
  save();
  EventBus.emit('onboarding:completado');

  // Cerrar overlay y re-renderizar con los datos del usuario.
  const overlay = document.getElementById('onboarding');
  if (overlay) cerrarModal(overlay);

  renderAll();
  announce(`¡Bienvenido a Finko, ${nombre}!`);
}

// ── TEMPLATES ────────────────────────────────────────────────────

function _renderPaso1() {
  return `
    <form id="form-onboarding" novalidate>
      <div class="onboarding__hero" aria-hidden="true">💚</div>
      <h2 class="onboarding__title">¡Bienvenido a Finko!</h2>
      <p class="onboarding__desc">
        Tu gestión financiera personal, en tu idioma y sin complicaciones.
        Primero, ¿cómo te llamás?
      </p>
      <div class="form-group">
        <label for="onboarding-nombre" class="label">Tu nombre</label>
        <input id="onboarding-nombre" name="nombre" class="input" type="text"
               placeholder="Ej. Camilo" required aria-required="true"
               autocomplete="given-name" />
      </div>
      <div class="onboarding__footer">
        <button type="submit" class="btn btn-primary btn-lg">Empezar →</button>
      </div>
      <p class="onboarding__note">
        Tus datos se guardan solo en tu dispositivo. Sin cuentas. Sin servidores.
      </p>
    </form>`;
}
