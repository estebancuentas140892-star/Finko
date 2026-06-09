/**
 * analisis/index.js - API pública del dominio de análisis.
 *
 * Análisis es un dominio de sólo lectura: no registra acciones de mutación,
 * no tiene formulario. Se limita a re-renderizar cuando cualquier dato cambia.
 */

import { EventBus } from '../../core/state.js';
import { renderSmart, registrarRender } from '../../infra/render.js';
import { renderAnalisis } from './view.js';

// Secciones cuyos cambios requieren re-analisis.
const SECCIONES_OBSERVADAS = new Set([
  'gastos', 'compromisos', 'cuentas', 'metas', 'ahorro',
]);

export function initAnalisis() {
  // Registrar en renderAll para que se actualice con cualquier render global.
  registrarRender(() => renderSmart(renderAnalisis, 'analisis'));

  // Re-renderizar cuando cambia cualquier sección relevante.
  EventBus.on('state:change', ({ section }) => {
    if (SECCIONES_OBSERVADAS.has(section)) {
      renderSmart(renderAnalisis, 'analisis');
    }
  });

  // Re-render al navegar a #analisis (sin esto la sección aparece vacía
  // hasta que cambien datos relevantes).
  window.addEventListener('hashchange', () => {
    renderSmart(renderAnalisis, 'analisis');
  });

  // Render inicial si arrancamos directamente en #analisis.
  renderSmart(renderAnalisis, 'analisis');
}
