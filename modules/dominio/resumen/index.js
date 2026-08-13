/**
 * resumen/index.js - API pública del dominio de resumen semanal (F8).
 *
 * Responsabilidades:
 * - Suscribirse a EventBus para re-renderizar cuando cambian los gastos.
 * - Re-pintar la card en cada renderAll() y al navegar al dashboard.
 *
 * No registra acciones ni muta S: es un panel de solo lectura derivado de
 * S.gastos. Cero imports cross-dominio (solo lee el estado compartido).
 */

import { EventBus } from '../../core/state.js';
import { registrarRender, renderSmart, programarRender } from '../../infra/render.js';
import { renderPanelResumen } from './view.js';

/**
 * Render reactivo del panel, con identidad estable para que el coalescer de
 * PERF.6 pueda deduplicarlo: una acción que registra varios gastos de una vez
 * (ej. distribuir el ingreso) emite un `state:change` por gasto y este panel
 * barre todo el historial en cada uno.
 */
function _renderReactivo() {
  renderSmart(renderPanelResumen, 'dash');
}

export function initResumen() {
  // El resumen vive en el dashboard: se actualiza en cada renderAll() para
  // reflejar gastos creados/editados desde otra sección. renderSmart corta si
  // el dashboard no está activo, así que llamarlo siempre es barato.
  registrarRender(() => renderSmart(renderPanelResumen, 'dash'));

  EventBus.on('state:change', ({ section }) => {
    if (section === 'gastos') programarRender(_renderReactivo);
  });

  // Re-render al navegar a #dash.
  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1) || 'dash';
    if (hash === 'dash') renderSmart(renderPanelResumen, 'dash');
  });

  renderSmart(renderPanelResumen, 'dash');
}
