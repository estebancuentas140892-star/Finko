/**
 * analisis/index.js - API pública del dominio de análisis.
 *
 * Análisis es un dominio de sólo lectura: no registra acciones que muten
 * datos financieros, no tiene formulario. Se limita a re-renderizar cuando
 * cualquier dato cambia. Única acción propia: el ojo de privacidad del
 * patrimonio (ANL.2b), que solo alterna el flag de configuración
 * S.config.ocultarSaldo compartido con toda la app (IN.2).
 */

import { S, EventBus } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { renderSmart, registrarRender, updSaldo, programarRender } from '../../infra/render.js';
import { registrarAccion } from '../../ui/actions.js';
import { renderAnalisis } from './view.js';
import { renderBannerProposito } from '../../ui/proposito.js';

// Secciones cuyos cambios requieren re-analisis.
// CFG.2a suma `ingresos` e `ingresosPuntuales`: el criterio "Ingresos brutos"
// del monitor de renta se deriva de ellos, así que registrar un ingreso con
// Análisis en pantalla tiene que repintar el panel.
const SECCIONES_OBSERVADAS = new Set([
  'gastos', 'compromisos', 'cuentas', 'metas', 'ahorro',
  'ingresos', 'ingresosPuntuales',
]);

/**
 * Render reactivo de la seccion, con identidad estable para el coalescer de
 * PERF.6: son 7 secciones observadas y el render hace ~15 pasadas sobre
 * `S.gastos`, asi que repintarlo una vez por emision de una misma accion es el
 * peor caso de la app.
 */
function _renderReactivo() {
  renderBannerProposito('analisis', S.gastos.length > 0);
  renderSmart(renderAnalisis, 'analisis');
}

export function initAnalisis() {
  // Registrar en renderAll para que se actualice con cualquier render global.
  registrarRender(() => renderSmart(renderAnalisis, 'analisis'));

  // ANL.2b (ADR 038 D2): el ojo del patrimonio comparte el flag
  // S.config.ocultarSaldo con Inicio (IN.2), Mis cuentas (MC.18a), Deudas
  // (D.16a) y Calendario (CAL.4a): un solo control de privacidad en toda la
  // app. updSaldo() mantiene el hero de Inicio en sincronía.
  // Ficha 16 (Z3, ADR 090 D1): el aviso de deudas sin saldo sale a la lente
  // "Por pagar" con su chip puesto. Emite en vez de filtrar acá: el chip es
  // estado de `compromisos` y ningún dominio importa a otro (ADN 10). El
  // destino decide el chip a partir del compromiso, que es lo que este aviso
  // conoce (ADR 081).
  registrarAccion('analisis-completar-deuda', (el) => {
    EventBus.emit('porPagar:ver-compromiso', { id: el?.dataset?.id });
  });

  registrarAccion('analisis-saldo-visibilidad', () => {
    S.config.ocultarSaldo = S.config.ocultarSaldo !== true;
    save();
    updSaldo();
    renderSmart(renderAnalisis, 'analisis');
  });

  // Re-renderizar cuando cambia cualquier sección relevante.
  EventBus.on('state:change', ({ section }) => {
    if (SECCIONES_OBSERVADAS.has(section)) {
      programarRender(_renderReactivo);
    }
  });

  // Re-render al navegar a #analisis (sin esto la sección aparece vacía
  // hasta que cambien datos relevantes).
  window.addEventListener('hashchange', () => {
    renderBannerProposito('analisis', S.gastos.length > 0);
    renderSmart(renderAnalisis, 'analisis');
  });

  // Render inicial si arrancamos directamente en #analisis.
  renderBannerProposito('analisis', S.gastos.length > 0);
  renderSmart(renderAnalisis, 'analisis');
}
