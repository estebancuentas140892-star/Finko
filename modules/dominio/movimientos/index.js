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
  renderMovimientosCompletos, cargarMasMovimientos,
  renderFiltrosMovimientos, setFiltroTexto, setFiltroDominio, setFiltroCategoria,
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

/**
 * Quita la pastilla de categoría con la que se llegó (G5), dejando el resto de
 * los filtros como estén: quien entró desde un tope y luego amplía a todo el
 * mes no quiere perder también el rango de fechas.
 */
function _quitarCategoria() {
  setFiltroCategoria(null);
  _renderVistaCompleta();
}

/**
 * Llegada prefiltrada desde un número del bloque Gastos (G5, ficha 07,
 * ADR 069 D8). Hoy la usa cada tope de la lente "Límites".
 *
 * El emisor no puede filtrar acá porque los filtros son estado de este módulo y
 * ningún dominio importa a otro (ADN 10), así que manda categoría y rango y
 * esta pantalla los pone. Se limpia primero para que dos llegadas seguidas no
 * se acumulen, y el `setTimeout` es el mismo apaño que usan las otras llegadas
 * del proyecto: si venimos de otra sección, el contenedor no existe hasta
 * después del re-render del `hashchange`.
 *
 * @param {{ categoria?: string|null, desde?: string, hasta?: string }} payload
 */
function _verPrefiltrado({ categoria = null, desde = '', hasta = '' } = {}) {
  limpiarFiltrosMovimientos();
  setFiltroCategoria(categoria);
  setFiltroFechaDesde(desde);
  setFiltroFechaHasta(hasta);

  if ((location.hash.slice(1) || 'dash') !== 'movimientos') {
    location.hash = '#movimientos';
  }
  setTimeout(() => _renderVistaCompleta(), 0);
}

export function initMovimientos() {
  registrarAccion('movimientos-cargar-mas', cargarMasMovimientos);
  registrarAccion('movimientos-filtrar-dominio', _filtrarDominio);
  registrarAccion('movimientos-limpiar-filtros', _limpiarFiltrosMovimientos);
  registrarAccion('movimientos-quitar-categoria', _quitarCategoria);

  // G5: de un número a los movimientos que lo forman, con el filtro puesto.
  EventBus.on('movimientos:ver', _verPrefiltrado);

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
