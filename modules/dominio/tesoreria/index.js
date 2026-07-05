/**
 * tesoreria/index.js - API publica del dominio de tesoreria.
 *
 * El dominio esta dividido en 3 subsistemas, cada uno con su logica pura
 * (logic/), su vista (views/) y sus handlers (acciones/):
 *   - cuentas      -> cuentas bancarias, cuota de manejo, GMF, bank picker
 *   - ingresos     -> ingresos recurrentes y puntuales, nudge de proximo cobro
 *   - distribucion -> asistente "Distribuir mi ingreso" (pasos, aplicar, deshacer)
 *
 * Este archivo solo coordina: registra los handlers de cada subsistema,
 * inyecta el formulario del modal, se suscribe al EventBus y hace el primer
 * render. Sin calculos ni HTML aqui.
 */

import { S, EventBus } from '../../core/state.js';
import { renderSmart, registrarRender, updSaldo } from '../../infra/render.js';
import { renderBannerProposito } from '../../ui/proposito.js';
import { initAccionesCuentas, inyectarFormCuenta } from './acciones/cuentas.js';
import { initAccionesIngresos } from './acciones/ingresos.js';
import { initAccionesDistribucion, abrirAsistenteDistribucion } from './acciones/distribucion.js';
import { renderTesoreria, renderNudgeDistribucionInicio } from './view.js';

/**
 * Inicializa el dominio de tesoreria.
 * Registra acciones, inyecta el form, suscribe al EventBus y hace el primer render.
 */
export function initTesoreria() {
  initAccionesCuentas();
  initAccionesIngresos();
  initAccionesDistribucion();

  inyectarFormCuenta();

  EventBus.on('state:change', ({ section }) => {
    if (
      section === 'cuentas'    ||
      section === 'tesoreria'  ||
      section === 'compromisos' ||
      section === 'ingresos'   ||
      section === 'ingresosPuntuales' ||
      section === 'ahorro'     ||
      section === 'inversiones'
    ) {
      renderBannerProposito('tesoreria', _tieneDatosTesoreria());
      renderSmart(renderTesoreria, 'tesoreria');
      renderSmart(renderNudgeDistribucionInicio, 'dash');
      updSaldo();
    }
  });

  // Re-render al navegar a #tesoreria o #dash - sin esto la sección aparece
  // vacía cuando el usuario llega navegando desde otra (no hay state:change
  // que la dispare).
  window.addEventListener('hashchange', () => {
    renderBannerProposito('tesoreria', _tieneDatosTesoreria());
    renderSmart(renderTesoreria, 'tesoreria');
    renderSmart(renderNudgeDistribucionInicio, 'dash');
  });

  // Para que renderAll() (bootstrap) también pinte el nudge de Inicio.
  registrarRender(() => renderSmart(renderNudgeDistribucionInicio, 'dash'));

  // ADR 021 / NAV.A2b s2: piden abrir el asistente. Puede llegar desde otra
  // sección: se navega primero y el panel se abre tras el re-render del
  // hashchange (por eso el setTimeout, que además fija el monto ya renderizado).
  // El payload opcional lleva `preacreditado` cuando el ingreso ya subió el saldo.
  EventBus.on('distribuir:abrir', (payload = {}) => {
    if ((location.hash.slice(1) || 'dash') !== 'tesoreria') {
      location.hash = '#tesoreria';
    }
    setTimeout(() => abrirAsistenteDistribucion(payload), 0);
  });

  // Render inicial si ya estamos en #tesoreria o #dash al cargar.
  renderBannerProposito('tesoreria', _tieneDatosTesoreria());
  renderSmart(renderTesoreria, 'tesoreria');
  renderSmart(renderNudgeDistribucionInicio, 'dash');
}

/** true si ya hay alguna cuenta o algún ingreso registrado. */
function _tieneDatosTesoreria() {
  return (S.cuentas ?? []).length > 0 || (S.ingresos ?? []).length > 0;
}
