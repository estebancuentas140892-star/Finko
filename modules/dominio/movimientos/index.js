/**
 * movimientos/index.js - la vista completa del historial (TX.8b) y sus
 * filtros (MOV.4, [ADR 200](../../../docs/DECISIONS/200-movimientos-buscar-y-filtrar.md)).
 *
 * Sin acciones propias sobre los datos (no crea/edita/borra nada): solo
 * repinta cuando cambian sus fuentes o al navegar. La excepción es "Deshacer
 * movimiento" (MOV.3, ADR 154): su recorrido vive en `ui/deshacer-movimiento.js`.
 *
 * MOV.4: un buscador que entiende criterios (`busqueda.js`), un solo botón
 * Filtros que abre la hoja (`hoja.js`) y la fila de filtros puestos, donde
 * tocar un chip lo cambia y su × lo quita, con Deshacer.
 */

import { S, EventBus } from '../../core/state.js';
import { registrarAccion } from '../../ui/actions.js';
import { renderSmart, registrarRender, programarRender } from '../../infra/render.js';
import {
  renderMovimientosCompletos, cargarMasMovimientos, renderFiltrosMovimientos,
  historialGrande, pintarFilasDeEspera, movimientosVisibles, filtrosMovimientos, ponerFiltrosMovimientos,
  contextoFiltros, anuncioDeResultados, reacomodarChipsMovimientos,
} from './view.js';
import { filasDelMesParaExcel, csvDelMesParaExcel } from './logic.js';
import { sinCriterio, sinCriterios, textoCriterio, cuantosFiltros, filtrosDeLlegada, criteriosActivos } from './filtros.js';
import { abrirHojaFiltros, initHojaFiltros, alCambiarFiltrosHoja, alLimpiarHoja, repintarHojaFiltros, hojaFiltrosAbierta } from './hoja.js';
import { initBusqueda, enModoBusqueda, salirDeBusqueda } from './busqueda.js';
import { hoy } from '../../infra/utils.js';
import { descargarCSV } from '../../infra/csv.js';
import { announce } from '../../infra/a11y.js';
import { mostrarToast } from '../../ui/toast.js';
import { deshacerConConfirmacion } from '../../ui/deshacer-movimiento.js';

/**
 * Secciones cuyos cambios pueden alterar el historial de movimientos.
 * `compromisos` desde AVC.1a (ADR 169 D5): el avance vive dentro de su
 * tarjeta, y deshacerlo solo edita la tarjeta (también la deuda recibida, D.14).
 * `cuentas` desde MOV.4: la búsqueda mira el nombre de la cuenta.
 */
const _SECCIONES_FUENTE = ['gastos', 'ingresosPuntuales', 'ahorro', 'transferencias', 'personales', 'compromisos', 'cuentas'];

/** Pinta la barra y la lista. */
function _renderVistaCompleta() {
  renderFiltrosMovimientos();
  renderMovimientosCompletos();
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
  if ((location.hash.slice(1) || 'dash') !== 'movimientos') {
    // Salir de la sección cierra el panel; sin texto buscado, también el
    // modo búsqueda (el encabezado vuelve). Con texto, se conserva (S2).
    if (enModoBusqueda()) salirDeBusqueda({ conservarTexto: Boolean(filtrosMovimientos().texto), sinFoco: true });
    _renderTodo();
    return;
  }
  if (!historialGrande()) {
    _renderTodo();
    return;
  }
  pintarFilasDeEspera();
  requestAnimationFrame(() => setTimeout(_renderTodo, 0));
}

/** Repinta tras un cambio de filtros (la hoja aplica en vivo; espera de 120 ms, S3). */
let _esperaRepintar = null;
function _repintarPronto() {
  clearTimeout(_esperaRepintar);
  _esperaRepintar = setTimeout(_renderVistaCompleta, 120);
}

/**
 * Al cerrar la hoja, por cualquier camino: la lista vuelve arriba y se
 * anuncia cuántos quedaron (S3, R48).
 */
function _alCerrarHoja() {
  clearTimeout(_esperaRepintar);
  _renderVistaCompleta();
  document.getElementById('sec-movimientos')?.scrollIntoView?.({ block: 'start' });
  announce(anuncioDeResultados());
}

/**
 * Quitar uno o todos, con Deshacer (S1, 4): "Quitaste Bancolombia",
 * "Quitaste 3 filtros". Deshacer los devuelve.
 */
function _avisarQuitados(antes, titulo) {
  mostrarToast({
    titulo,
    icono: 'check-circle',
    accion: {
      texto: 'Deshacer',
      alTocar: () => {
        ponerFiltrosMovimientos(antes);
        _renderVistaCompleta();
        repintarHojaFiltros();
        announce(`Filtros devueltos. ${anuncioDeResultados()}`);
      },
    },
  });
}

function _quitarFiltro(el) {
  const clave = el?.dataset?.criterio;
  if (!clave) return;
  const antes = filtrosMovimientos();
  const nombre = clave === 'texto' ? `"${antes.texto.trim()}"` : textoCriterio(antes, clave, contextoFiltros());
  ponerFiltrosMovimientos(sinCriterio(antes, clave));
  if (clave === 'texto') {
    const campo = document.getElementById('movimientos-buscar');
    if (campo) campo.value = '';
  }
  _renderVistaCompleta();
  _avisarQuitados(antes, `Quitaste ${nombre}`);
  // R46: el chip se fue; el foco va al botón Filtros.
  document.querySelector('.mov-filtros-btn')?.focus({ preventScroll: true });
  announce(anuncioDeResultados());
}

function _limpiar() {
  const antes = filtrosMovimientos();
  const n = cuantosFiltros(antes);
  if (n === 0) return;
  const solo = criteriosActivos(antes)[0];
  ponerFiltrosMovimientos(sinCriterios(antes));
  _renderVistaCompleta();
  _avisarQuitados(antes, n === 1 ? `Quitaste ${textoCriterio(antes, solo, contextoFiltros())}` : `Quitaste ${n} filtros`);
  document.querySelector('.mov-filtros-btn')?.focus({ preventScroll: true });
  announce(anuncioDeResultados());
}

/**
 * Llegada prefiltrada desde otra sección (G5, ficha 07, ficha 15, GAS.14c):
 * un tope de Límites, la lente Día a día, una cuenta de Mis cuentas, los
 * pagos de un fijo. Lo que llega reemplaza los filtros puestos y se ve como
 * chips comunes (ADR 200 D8, reemplaza las pastillas del ADR 089 D3).
 *
 * El emisor no puede filtrar acá porque los filtros son estado de este módulo y
 * ningún dominio importa a otro (ADN 10). El `setTimeout` es el mismo apaño de
 * las otras llegadas: si venimos de otra sección, el contenedor no existe
 * hasta después del re-render del `hashchange`.
 */
function _verPrefiltrado(payload = {}) {
  ponerFiltrosMovimientos(filtrosDeLlegada(payload, hoy()));
  const campo = document.getElementById('movimientos-buscar');
  if (campo) campo.value = '';
  if ((location.hash.slice(1) || 'dash') !== 'movimientos') {
    location.hash = '#movimientos';
  }
  setTimeout(() => _renderVistaCompleta(), 0);
}

/**
 * REV.3a: baja el mes del divisor tocado como CSV para Excel, con lo mismo que
 * la lista muestra de ese mes (filtros incluidos).
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

/**
 * El borde de abajo de la barra pegada aparece al despegarse del encabezado
 * (S3): un centinela antes de la barra dice cuándo dejó la pantalla.
 */
function _vigilarBarraPegada() {
  const barra = document.getElementById('movimientos-filtros');
  if (!barra || typeof IntersectionObserver === 'undefined') return;
  const centinela = document.createElement('div');
  centinela.className = 'mov-centinela';
  centinela.setAttribute('aria-hidden', 'true');
  barra.before(centinela);
  new IntersectionObserver(([e]) => {
    barra.toggleAttribute('data-pegada', !e.isIntersecting && e.boundingClientRect.top < 0);
  }).observe(centinela);
}

export function initMovimientos() {
  // MOV.3 (ADR 154 D1): el recorrido es el mismo de "Eliminar" en Gastos y Mis cuentas.
  registrarAccion('deshacer-movimiento', (el) => deshacerConConfirmacion(el?.dataset?.id));
  registrarAccion('movimientos-cargar-mas', cargarMasMovimientos);
  registrarAccion('movimientos-descargar-mes', _descargarMes);

  // MOV.4 (ADR 200): Filtros, los chips, quitar y limpiar.
  registrarAccion('movimientos-abrir-filtros', () => abrirHojaFiltros(null));
  registrarAccion('movimientos-abrir-criterio', (el) => abrirHojaFiltros(el?.dataset?.criterio ?? null));
  registrarAccion('movimientos-quitar-filtro', _quitarFiltro);
  registrarAccion('movimientos-limpiar-filtros', _limpiar);

  alCambiarFiltrosHoja(_repintarPronto);
  alLimpiarHoja((antes) => {
    const n = cuantosFiltros(antes);
    _avisarQuitados(antes, n === 1 ? `Quitaste ${textoCriterio(antes, criteriosActivos(antes)[0], contextoFiltros())}` : `Quitaste ${n} filtros`);
  });
  initHojaFiltros(registrarAccion, _alCerrarHoja);
  initBusqueda(registrarAccion, () => {
    _renderVistaCompleta();
    announce(anuncioDeResultados());
  });

  // G5 y ficha 15 (M3): de un número, de una lente o de una cuenta a los
  // movimientos que la explican, con el filtro puesto.
  EventBus.on('movimientos:ver', _verPrefiltrado);

  EventBus.on('state:change', ({ section }) => {
    // Agendado, no directo (PERF.6): la cola colapsa varias emisiones de una
    // misma acción a un solo pintado por tick.
    if (_SECCIONES_FUENTE.includes(section)) programarRender(_renderTodo);
  });

  // Re-render al navegar: sin esto la vista aparece vacía si el usuario
  // llega navegando desde otra sección.
  window.addEventListener('hashchange', _alLlegar);
  // Los chips que caben dependen del ancho (giro, letra del sistema).
  window.addEventListener('resize', () => {
    if (!hojaFiltrosAbierta()) reacomodarChipsMovimientos();
  });

  registrarRender(_renderTodo);
  _vigilarBarraPegada();
  _renderTodo();
}
