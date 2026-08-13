/**
 * resumen/index.js - API pública del dominio de resumen semanal (F8) y del
 * panel de avisos del dashboard (CFG.3b).
 *
 * Responsabilidades:
 * - Suscribirse a EventBus para re-renderizar cuando cambian sus fuentes.
 * - Re-pintar las cards en cada renderAll() y al navegar al dashboard.
 *
 * No registra acciones ni muta S: son paneles de solo lectura. El de avisos
 * lee el motor único (`infra/avisos.js`, ADR 066), que es infra y no un
 * dominio: cero imports cross-dominio (ADN 10 intacto).
 */

import { EventBus } from '../../core/state.js';
import { registrarRender, renderSmart, programarRender } from '../../infra/render.js';
import { renderPanelResumen, renderPanelAvisos } from './view.js';

/**
 * Render reactivo del panel, con identidad estable para que el coalescer de
 * PERF.6 pueda deduplicarlo: una acción que registra varios gastos de una vez
 * (ej. distribuir el ingreso) emite un `state:change` por gasto y este panel
 * barre todo el historial en cada uno.
 */
function _renderReactivo() {
  renderSmart(renderPanelResumen, 'dash');
}

/** Mismo patrón que `_renderReactivo`, para el panel de avisos (CFG.3b). */
function _renderAvisosReactivo() {
  renderSmart(renderPanelAvisos, 'dash');
}

// Secciones de S cuyo cambio puede alterar los avisos de `_TIPOS_SIN_PANEL_PROPIO`
// (apartado-listo, dia-de-pago, prestamo-vencido): el motor lee las seis a la vez,
// así que cualquiera de ellas puede mover la lista.
const _SECCIONES_AVISOS = ['compromisos', 'gastos', 'presupuestos', 'apartados', 'personales', 'ingresos'];

export function initResumen() {
  // El resumen vive en el dashboard: se actualiza en cada renderAll() para
  // reflejar gastos creados/editados desde otra sección. renderSmart corta si
  // el dashboard no está activo, así que llamarlo siempre es barato.
  registrarRender(() => renderSmart(renderPanelResumen, 'dash'));
  registrarRender(() => renderSmart(renderPanelAvisos, 'dash'));

  EventBus.on('state:change', ({ section }) => {
    if (section === 'gastos') programarRender(_renderReactivo);
    if (_SECCIONES_AVISOS.includes(section)) programarRender(_renderAvisosReactivo);
  });

  // Re-render al navegar a #dash.
  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1) || 'dash';
    if (hash === 'dash') {
      renderSmart(renderPanelResumen, 'dash');
      renderSmart(renderPanelAvisos, 'dash');
    }
  });

  renderSmart(renderPanelResumen, 'dash');
  renderSmart(renderPanelAvisos, 'dash');
}
