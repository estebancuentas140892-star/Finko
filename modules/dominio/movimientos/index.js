/**
 * movimientos/index.js - dominio de solo lectura para la Actividad reciente
 * de Inicio (TX.8a, ADR 028 D5).
 *
 * Sin acciones propias (no crea/edita/borra nada): solo re-renderiza el panel
 * cuando cambian sus fuentes (gastos, ingresos puntuales, ahorro) o al
 * navegar de vuelta a Inicio.
 */

import { EventBus } from '../../core/state.js';
import { registrarAccion } from '../../ui/actions.js';
import { renderSmart, registrarRender, programarRender } from '../../infra/render.js';
import {
  renderActividadReciente, renderMovimientosCompletos, cargarMasMovimientos,
  renderFiltrosMovimientos, setFiltroTexto, setFiltroDominio,
  setFiltroFechaDesde, setFiltroFechaHasta, limpiarFiltrosMovimientos,
  actualizarBotonLimpiarFiltros,
} from './view.js';

/** Secciones cuyos cambios pueden alterar el historial de movimientos. */
const _SECCIONES_FUENTE = ['gastos', 'ingresosPuntuales', 'ahorro', 'transferencias'];

/**
 * Cablea los inputs de texto y fecha de la barra de filtros (MOV.2) recién
 * inyectada. No son `data-action` de clic: se atan directo, mismo patrón que
 * el input de ingreso override en `ahorro/index.js`. Como el contenedor se
 * reemplaza entero en cada `renderFiltrosMovimientos()`, no hace falta
 * desconectar listeners viejos (se van con sus nodos).
 *
 * Solo repinta la LISTA (`renderMovimientosCompletos`) + el botón "Limpiar
 * filtros" (`actualizarBotonLimpiarFiltros`, un slot aparte), nunca la barra
 * de filtros completa: si volviera a pintar el input de búsqueda mientras el
 * usuario escribe, perdería el foco y el cursor a mitad de palabra.
 */
function _wireFiltrosMovimientos() {
  const el = document.getElementById('movimientos-filtros');
  if (!el) return;

  el.querySelector('#movimientos-buscar')?.addEventListener('input', (e) => {
    setFiltroTexto(e.target.value);
    renderMovimientosCompletos();
    actualizarBotonLimpiarFiltros();
  });
  el.querySelector('#movimientos-desde')?.addEventListener('change', (e) => {
    setFiltroFechaDesde(e.target.value);
    renderMovimientosCompletos();
    actualizarBotonLimpiarFiltros();
  });
  el.querySelector('#movimientos-hasta')?.addEventListener('change', (e) => {
    setFiltroFechaHasta(e.target.value);
    renderMovimientosCompletos();
    actualizarBotonLimpiarFiltros();
  });
}

/** Pinta filtros + lista de la vista completa y cablea sus inputs. */
function _renderVistaCompleta() {
  renderFiltrosMovimientos();
  renderMovimientosCompletos();
  _wireFiltrosMovimientos();
}

function _renderTodo() {
  renderSmart(renderActividadReciente, 'dash');
  renderSmart(_renderVistaCompleta, 'movimientos');
}

/** Chip de dominio (MOV.2): cambia el filtro y repinta filtros + lista. */
function _filtrarDominio(el) {
  setFiltroDominio(el?.dataset?.dominio || null);
  renderFiltrosMovimientos();
  renderMovimientosCompletos();
  _wireFiltrosMovimientos();
}

/** "Limpiar filtros" (MOV.2): vuelve los 4 filtros a su estado inicial. */
function _limpiarFiltrosMovimientos() {
  limpiarFiltrosMovimientos();
  renderFiltrosMovimientos();
  renderMovimientosCompletos();
  _wireFiltrosMovimientos();
}

export function initMovimientos() {
  registrarAccion('movimientos-cargar-mas', cargarMasMovimientos);
  registrarAccion('movimientos-filtrar-dominio', _filtrarDominio);
  registrarAccion('movimientos-limpiar-filtros', _limpiarFiltrosMovimientos);

  EventBus.on('state:change', ({ section }) => {
    // Agendado, no directo (PERF.6): las 4 secciones fuente se emiten varias
    // veces dentro de una misma acción (distribuir el ingreso registra un gasto
    // por necesidad más el aporte a ahorro), y cada pasada deriva y ordena todo
    // el historial. `_renderTodo` tiene identidad estable: la cola lo colapsa
    // a un solo pintado por tick.
    if (_SECCIONES_FUENTE.includes(section)) programarRender(_renderTodo);
  });

  // Re-render al navegar a #dash o #movimientos - sin esto el panel/vista
  // aparece vacío si el usuario llega navegando desde otra sección.
  window.addEventListener('hashchange', _renderTodo);

  // Para que renderAll() (bootstrap) también pinte ambos.
  registrarRender(_renderTodo);

  _renderTodo();
}
