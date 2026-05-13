/**
 * onboarding.js — wizard inicial para usuarios nuevos.
 *
 * Fase 6: stub funcional que detecta el estado y auto-completa.
 * Fase 12: reemplaza _completarOnboarding() por el wizard de 3 pasos completo
 *           (nombre, primera cuenta, primer ingreso) con los modales del design system.
 */

import { S, EventBus } from '../core/state.js';
import { save } from '../core/storage.js';

/**
 * Inicializa el flujo de onboarding.
 * Si el usuario ya completó el wizard, retorna inmediatamente.
 * Si no, ejecuta el wizard (Fase 12) o el auto-complete (Fase 6).
 */
export function initOnboarding() {
  if (S.onboarded) return;
  _completarOnboarding();
}

/**
 * Marca el onboarding como completado.
 * Fase 12 reemplaza esta función por el wizard interactivo completo.
 */
function _completarOnboarding() {
  S.onboarded = true;
  save();
  EventBus.emit('onboarding:completado');
}
