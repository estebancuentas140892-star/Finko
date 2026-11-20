/**
 * movimientos/index.js - dominio de solo lectura para la Actividad reciente
 * de Inicio (TX.8a, ADR 028 D5).
 *
 * Sin acciones propias (no crea/edita/borra nada): solo re-renderiza el panel
 * cuando cambian sus fuentes (gastos, ingresos puntuales, ahorro) o al
 * navegar de vuelta a Inicio. La excepción es "Deshacer movimiento" (MOV.3,
 * ADR 154): su recorrido vive en `ui/deshacer-movimiento.js` y se pide desde aquí.
 */

import { S, EventBus } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { registrarAccion } from '../../ui/actions.js';
import { renderSmart, registrarRender, programarRender } from '../../infra/render.js';
import {
  renderMovimientosCompletos, cargarMasMovimientos,
  renderFiltrosMovimientos, setFiltroTexto, setFiltroDominio, setFiltroCategoria, setFiltroCuenta,
  setFiltroFechaDesde, setFiltroFechaHasta, limpiarFiltrosMovimientos,
  actualizarBotonLimpiarFiltros, alternarTiposMovimientos,
  historialGrande, pintarFilasDeEspera, movimientosVisibles,
  setFiltroSubcategoria, alternarPanelMovimientos, cerrarPanelMovimientos,
} from './view.js';
import { anotarBusquedaReciente, filasDelMesParaExcel, csvDelMesParaExcel, rangoDePeriodo } from './logic.js';
import { hoy } from '../../infra/utils.js';
import { descargarCSV } from '../../infra/csv.js';
import { announce } from '../../infra/a11y.js';
import { deshacerConConfirmacion } from '../../ui/deshacer-movimiento.js';

/**
 * Secciones cuyos cambios pueden alterar el historial de movimientos.
 * `compromisos` desde AVC.1a (ADR 169 D5): el avance vive dentro de su
 * tarjeta, y deshacerlo solo edita la tarjeta (también la deuda recibida, D.14).
 */
const _SECCIONES_FUENTE = ['gastos', 'ingresosPuntuales', 'ahorro', 'transferencias', 'personales', 'compromisos'];

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

  const buscar = el.querySelector('#movimientos-buscar');
  buscar?.addEventListener('input', (e) => {
    setFiltroTexto(e.target.value);
    renderMovimientosCompletos();
    actualizarBotonLimpiarFiltros();
    _mostrarAtajos(true);
  });
  // ADR 121 D1: los atajos se ofrecen con el campo vacío y con el foco.
  buscar?.addEventListener('focus', () => _mostrarAtajos(true));
  // Una búsqueda confirmada (al salir del campo o con Enter) que dejó
  // resultados se recuerda.
  buscar?.addEventListener('change', (e) => _anotarBusqueda(e.target.value));
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

/**
 * Muestra (con el campo vacío) u oculta el panel de atajos (ADR 121 D1).
 * @param {boolean} quiere
 */
function _mostrarAtajos(quiere) {
  const atajos = document.getElementById('movimientos-atajos');
  const buscar = document.getElementById('movimientos-buscar');
  if (!atajos || !buscar) return;
  // ADR 137 D5: sin búsquedas recientes el panel está vacío y no se abre.
  atajos.hidden = !(quiere && buscar.value.trim() === '' && atajos.childElementCount > 0);
  buscar.setAttribute('aria-expanded', String(!atajos.hidden));
}

/** Anota la búsqueda si dejó resultados. */
function _anotarBusqueda(texto) {
  if (!String(texto ?? '').trim()) return;
  if (!document.querySelector('#lista-movimientos .list-item')) return;
  S.config.busquedasRecientes = anotarBusquedaReciente(S.config.busquedasRecientes, texto);
  save();
}

/** Un atajo pone su filtro y deja la lista a la vista. */
function _aplicarAtajo(poner) {
  poner();
  _renderVistaCompleta();
  _mostrarAtajos(false);
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

/**
 * ADR 121 D3: con un historial grande, al llegar se pintan primero las filas
 * de espera y la lista se arma en el cuadro siguiente, ya con ellas a la
 * vista. Con uno chico se arma de una vez: ahí las filas solo parpadearían.
 */
function _alLlegar() {
  if ((location.hash.slice(1) || 'dash') !== 'movimientos' || !historialGrande()) {
    _renderTodo();
    return;
  }
  pintarFilasDeEspera();
  requestAnimationFrame(() => setTimeout(_renderTodo, 0));
}

/** Chip de dominio (MOV.2): cambia el filtro y repinta filtros + lista. */
function _filtrarDominio(el) {
  setFiltroDominio(el?.dataset?.dominio || null);
  // ADR 105 D1: elegir pliega la fila en móvil (ya se encontró el tipo).
  if (el?.closest?.('.filtros-bar--abierta')) alternarTiposMovimientos();
  renderFiltrosMovimientos();
  renderMovimientosCompletos();
  _wireFiltrosMovimientos();
}

/** "+N tipos" / "Menos" de la fila plegada en móvil (ADR 105 D1). */
function _alternarTipos() {
  alternarTiposMovimientos();
  renderFiltrosMovimientos();
  _wireFiltrosMovimientos();
  document.querySelector('#movimientos-filtros .filtros-bar__mas')?.focus({ preventScroll: true });
}

/**
 * El chip "Fechas" abre y cierra el rango sin repintar la barra (ADR 105 D2):
 * los campos conservan lo escrito. Es el mismo `<details>` que en escritorio
 * se abre desde su propio rótulo.
 */
function _alternarFechas(el) {
  const rango = document.getElementById('movimientos-rango');
  if (!rango) return;
  rango.open = !rango.open;
  el?.setAttribute('aria-expanded', String(rango.open));
}

/** "Limpiar filtros" (MOV.2): vuelve los 6 filtros a su estado inicial. */
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
 * Quita la pastilla de la cuenta con la que se llegó (ficha 15, M3), con el
 * mismo criterio que la de categoría: el resto de los filtros se queda.
 */
function _quitarCuenta() {
  setFiltroCuenta(null);
  _renderVistaCompleta();
}

/**
 * GAS.11a (ADR 186 D2): "Categoría" y "Cuenta" abren su panel (uno a la vez)
 * y lo que se elige ahí queda como pastilla, con el resto de los filtros igual.
 * El foco vuelve al chip que abrió el panel, ya repintado.
 */
function _alternarPanel(el) {
  const panel = el?.dataset?.panel;
  alternarPanelMovimientos(panel);
  renderFiltrosMovimientos();
  _wireFiltrosMovimientos();
  document.querySelector(`#movimientos-filtros [data-panel="${panel}"]`)?.focus({ preventScroll: true });
}

function _elegirEnPanel(poner) {
  poner();
  cerrarPanelMovimientos();
  _renderVistaCompleta();
}

/**
 * GAS.11a (ADR 186 D4): un atajo de periodo pone "Desde" y "Hasta" y deja el
 * rango abierto, con las fechas a la vista para ajustarlas.
 */
function _elegirPeriodo(el) {
  const rango = rangoDePeriodo(el?.dataset?.periodo, hoy());
  if (!rango) return;
  setFiltroFechaDesde(rango.desde);
  setFiltroFechaHasta(rango.hasta);
  _renderVistaCompleta();
}

/**
 * Llegada prefiltrada desde un número del bloque Gastos (G5, ficha 07,
 * ADR 069 D8). Hoy la usa cada tope de la lente "Límites".
 *
 * El emisor no puede filtrar acá porque los filtros son estado de este módulo y
 * ningún dominio importa a otro (ADN 10), así que manda qué quiere ver y esta
 * pantalla lo pone. Se limpia primero para que dos llegadas seguidas no se
 * acumulen, y el `setTimeout` es el mismo apaño que usan las otras llegadas
 * del proyecto: si venimos de otra sección, el contenedor no existe hasta
 * después del re-render del `hashchange`.
 *
 * La ficha 15 (M3) le suma dos entradas: la lente "Día a día" del bloque Gastos
 * manda `dominio`, y una cuenta de Mis cuentas manda `cuentaId`. El emisor
 * nombra lo que conoce (su dominio, su cuenta) y no la taxonomía de esta
 * pantalla, mismo reparto que el ADR 081 fijó para las llegadas a "Por pagar".
 *
 * @param {{ categoria?: string|null, dominio?: string|null, cuentaId?: string|null,
 *           desde?: string, hasta?: string }} payload
 */
function _verPrefiltrado({ categoria = null, dominio = null, cuentaId = null, desde = '', hasta = '' } = {}) {
  limpiarFiltrosMovimientos();
  setFiltroCategoria(categoria);
  setFiltroDominio(dominio);
  setFiltroCuenta(cuentaId);
  setFiltroFechaDesde(desde);
  setFiltroFechaHasta(hasta);

  if ((location.hash.slice(1) || 'dash') !== 'movimientos') {
    location.hash = '#movimientos';
  }
  setTimeout(() => _renderVistaCompleta(), 0);
}

/**
 * REV.3a: baja el mes del divisor tocado como CSV para Excel, con lo mismo que
 * la lista muestra de ese mes (filtros incluidos).
 * @param {HTMLElement} el
 */
function _descargarMes(el) {
  const mes = el?.dataset?.mes;
  if (!/^\d{4}-\d{2}$/.test(mes ?? '')) return;
  const filas = filasDelMesParaExcel(movimientosVisibles(), mes, S.cuentas ?? []);
  const csv = csvDelMesParaExcel(filas);
  if (!csv) {
    announce('Este mes no tiene movimientos para descargar.', 'assertive');
    return;
  }
  try {
    descargarCSV(`finko-movimientos-${mes}.csv`, csv);
    announce(`${filas.length} movimiento${filas.length === 1 ? '' : 's'} descargado${filas.length === 1 ? '' : 's'} para Excel.`);
  } catch (err) {
    console.error('[movimientos] descargar el mes falló:', err);
    announce('No se pudo descargar. Intenta de nuevo.', 'assertive');
  }
}

export function initMovimientos() {
  // MOV.3 (ADR 154 D1): el recorrido es el mismo de "Eliminar" en Gastos y Mis cuentas.
  registrarAccion('deshacer-movimiento', (el) => deshacerConConfirmacion(el?.dataset?.id));
  registrarAccion('movimientos-cargar-mas', cargarMasMovimientos);
  registrarAccion('movimientos-descargar-mes', _descargarMes);
  registrarAccion('movimientos-filtrar-dominio', _filtrarDominio);
  registrarAccion('movimientos-tipos-alternar', _alternarTipos);
  registrarAccion('movimientos-fechas-alternar', _alternarFechas);
  registrarAccion('movimientos-limpiar-filtros', _limpiarFiltrosMovimientos);
  registrarAccion('movimientos-quitar-categoria', _quitarCategoria);
  registrarAccion('movimientos-quitar-cuenta', _quitarCuenta);
  // GAS.11a (ADR 186 D2 y D4): elegir categoría, detalle, cuenta y periodo.
  registrarAccion('movimientos-panel-alternar', _alternarPanel);
  registrarAccion('movimientos-elegir-categoria', (el) => _elegirEnPanel(() => setFiltroCategoria(el?.dataset?.categoria)));
  registrarAccion('movimientos-elegir-cuenta', (el) => _elegirEnPanel(() => setFiltroCuenta(el?.dataset?.cuenta)));
  registrarAccion('movimientos-elegir-sub', (el) => _elegirEnPanel(() => setFiltroSubcategoria(el?.dataset?.sub)));
  registrarAccion('movimientos-periodo', _elegirPeriodo);

  // ADR 121 D1: los atajos de la búsqueda.
  registrarAccion('movimientos-buscar-reciente', (el) => _aplicarAtajo(() => setFiltroTexto(el.dataset.texto)));
  // Tocar fuera del campo y de sus atajos los cierra; Escape también.
  document.addEventListener('click', (e) => {
    if (!e.target.closest?.('#movimientos-buscar, #movimientos-atajos')) _mostrarAtajos(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && e.target?.id === 'movimientos-buscar') _mostrarAtajos(false);
  });

  // G5 y ficha 15 (M3): de un número, de una lente o de una cuenta a los
  // movimientos que la explican, con el filtro puesto.
  EventBus.on('movimientos:ver', _verPrefiltrado);

  EventBus.on('state:change', ({ section }) => {
    // Agendado, no directo (PERF.6): las 5 secciones fuente se emiten varias
    // veces dentro de una misma acción (distribuir el ingreso registra un gasto
    // por necesidad más el aporte a ahorro), y cada pasada deriva y ordena todo
    // el historial. `_renderTodo` tiene identidad estable: la cola lo colapsa
    // a un solo pintado por tick.
    if (_SECCIONES_FUENTE.includes(section)) programarRender(_renderTodo);
  });

  // Re-render al navegar a #dash o #movimientos - sin esto el panel/vista
  // aparece vacío si el usuario llega navegando desde otra sección.
  window.addEventListener('hashchange', _alLlegar);

  // Para que renderAll() (bootstrap) también pinte ambos.
  registrarRender(_renderTodo);

  _renderTodo();
}
