/**
 * movimientos/view.js - panel "Actividad reciente" en Inicio (TX.8a).
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (toda en logic.js).
 */

import { S } from '../../core/state.js';
import { f, esc as _esc, tiempoRelativo, fechaLegible, formateadorFecha } from '../../infra/utils.js';
import { emptyArt, tejaCategoria } from '../../infra/icons.js';
import { memoizar } from '../../infra/memo.js';
import { movimientosRecientes, movimientosCompletos, descripcionMovimiento, filtrarMovimientos } from './logic.js';

/**
 * Cuántos movimientos recientes muestra el panel de Inicio.
 *
 * El 5 se eligió para 390px (ADR 034 D7), donde el alto es el recurso escaso.
 * En escritorio la columna del panel deja sitio para 8 sin scroll y sin pedir
 * un dato nuevo: `movimientosRecientes()` ya recibe el límite por parámetro,
 * así que lo que cambia es el argumento, no la derivación (ADR 057 D4, IN.9b).
 */
const LIMITE_RECIENTES_MOVIL       = 5;
const LIMITE_RECIENTES_ESCRITORIO  = 8;

/**
 * Mismo umbral y misma forma que `_lanzarConfetti()` de `logros/index.js`: el
 * corte de escritorio de la app es 1024px.
 *
 * Se lee en cada render en vez de cachearse, porque el panel se repinta con
 * cada `state:change` y el ancho pudo cambiar en el medio. Un cambio de ancho
 * sin cambio de estado NO repinta: el panel se queda con el límite del último
 * render hasta la siguiente acción. Se acepta a propósito, para no montar un
 * observador de `resize` que ningún otro panel de Inicio tiene.
 */
function _limiteRecientes() {
  return window.matchMedia?.('(max-width: 1023.98px)').matches
    ? LIMITE_RECIENTES_MOVIL
    : LIMITE_RECIENTES_ESCRITORIO;
}

/**
 * PERF.2: ambas derivaciones concatenan y ordenan las 3 fuentes completas
 * (gastos + ingresos puntuales + aportes) aunque `movimientosRecientes()`
 * solo muestre 5 u 8 filas. El caller pasa un objeto envoltorio nuevo en cada
 * llamada (`{ gastos, ... }`), así que `extraerClave` compara los arrays de
 * adentro, no el envoltorio (que siempre sería una referencia distinta).
 */
const _extraerFuentes = (fuentes, limite) => [
  fuentes?.gastos, fuentes?.ingresosPuntuales, fuentes?.aportes, fuentes?.transferencias,
  fuentes?.categoriasPersonalizadas, limite,
];
const _SECCIONES_MOVIMIENTOS = ['gastos', 'ingresosPuntuales', 'ahorro', 'transferencias', 'categoriasPersonalizadas'];

const _movimientosRecientesMemo = memoizar(movimientosRecientes, _SECCIONES_MOVIMIENTOS, _extraerFuentes);
const _movimientosCompletosMemo = memoizar(movimientosCompletos, _SECCIONES_MOVIMIENTOS, _extraerFuentes);

/**
 * Cuántas entradas (ítems + divisores de mes) se agregan al DOM por lote en
 * la vista completa (PERF.1). Con años de historial, construir todos los
 * nodos de una sola vez es el cuello de botella más caro de la app (~4s con
 * 10 años de datos): en vez de eso, `renderMovimientosCompletos()` pinta solo
 * el primer lote y el resto se agrega bajo demanda vía `cargarMasMovimientos()`.
 */
const TAMANO_LOTE = 50;

/** Etiqueta legible por tipo de movimiento, usada en el subtítulo de la vista completa. */
const _TIPO_LABEL = { gasto: 'Gasto', ingreso: 'Ingreso', aporte: 'Aporte', transferencia: 'Transferencia' };

// ── FILTROS DE LA VISTA COMPLETA (MOV.2) ─────────────────────────

/**
 * Etiqueta legible por `Movimiento.dominio`, usada en los chips de filtro.
 * Distinto de `_TIPO_LABEL`: un gasto de categoría "Gastos fijos" es
 * `tipo: 'gasto'` pero `dominio: 'compromisos'` (colorea como Deudas). Filtrar
 * por dominio es lo que deja al usuario aislar "solo lo de Deudas" de "solo
 * gasto cotidiano", algo que `tipo` no distingue (ver Riesgos de la ficha).
 */
const _DOMINIO_LABEL = {
  gastos:      'Gastos',
  compromisos: 'Deudas',
  ingresos:    'Ingresos',
  ahorro:      'Ahorro',
  tesoreria:   'Transferencias',
};

/** Estado de los filtros de la vista completa. Vive acá (UI), no en `S`. */
let _filtroTexto      = '';
let _filtroDominio     = null;
let _filtroCategoria   = null;
let _filtroFechaDesde  = '';
let _filtroFechaHasta  = '';

/** @param {string} texto */
export function setFiltroTexto(texto) { _filtroTexto = texto || ''; }

/** @param {string|null} dominio Un valor de `Movimiento.dominio`, o null/'' = todos. */
export function setFiltroDominio(dominio) { _filtroDominio = dominio || null; }

/**
 * Categoría de gasto exacta, o null para quitarla (G5, ficha 07).
 *
 * No tiene chip propio en la barra: no es una de las opciones que la pantalla
 * ofrece, es un filtro con el que se **llega** desde un tope de Límites. Por
 * eso se pinta como una pastilla que se puede quitar y no como un chip más de
 * la fila, que insinuaría que hay una lista de categorías donde elegir.
 *
 * @param {string|null} categoria
 */
export function setFiltroCategoria(categoria) { _filtroCategoria = categoria || null; }

/** @param {string} fecha 'YYYY-MM-DD', o '' para quitar el piso. */
export function setFiltroFechaDesde(fecha) { _filtroFechaDesde = fecha || ''; }

/** @param {string} fecha 'YYYY-MM-DD', o '' para quitar el techo. */
export function setFiltroFechaHasta(fecha) { _filtroFechaHasta = fecha || ''; }

/** Vuelve los 5 filtros a "sin filtro". Llamado por "Limpiar filtros". */
export function limpiarFiltrosMovimientos() {
  _filtroTexto = '';
  _filtroDominio = null;
  _filtroCategoria = null;
  _filtroFechaDesde = '';
  _filtroFechaHasta = '';
}

/**
 * Días transcurridos desde una fecha ISO (YYYY-MM-DD) hasta hoy, en hora
 * local. Negativo si la fecha es futura (no debería pasar con movimientos ya
 * registrados, pero `tiempoRelativo` ya clampa a 0).
 *
 * @param {string} fechaISO
 * @returns {number}
 */
function _diasDesde(fechaISO) {
  const partes = fechaISO.split('-').map(Number);
  if (partes.length !== 3 || partes.some(Number.isNaN)) return 0;
  const [yyyy, mm, dd] = partes;
  const hoy   = new Date();
  const hoyMs = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const fchMs = new Date(yyyy, mm - 1, dd).getTime();
  return Math.round((hoyMs - fchMs) / 86_400_000);
}

/**
 * Renderiza los últimos movimientos derivados de gastos, ingresos puntuales
 * y aportes al fondo (ADR 028 D5). Vacío si no hay ninguno, y limpia el
 * panel para no ocupar espacio.
 *
 * DSK.1a (ADR 070 D2) revierte IN.9d: la celda de escritorio
 * (`#panel-actividad-reciente-escritorio`) desaparece del DOM. Cuenta el
 * pasado, y en monitor comparte anatomía con la lista de obligaciones (teja,
 * nombre, monto), así que a primera vista se confundían y solo una de las dos
 * exige algo. Movimientos sigue a un clic en la barra lateral. Queda el panel
 * de la fusión móvil. No-op si no existe.
 */
export function renderActividadReciente() {
  const targets = ['panel-actividad-reciente']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  if (targets.length === 0) return;

  // Se pide una fila de más que las que caben: es la forma barata de saber si
  // el historial completo tiene algo que este panel no esté mostrando ya.
  const limite = _limiteRecientes();
  const conSobrante = _movimientosRecientesMemo({
    gastos:                   S.gastos,
    ingresosPuntuales:        S.ingresosPuntuales,
    aportes:                  S.ahorro?.aportes,
    transferencias:           S.transferencias,
    categoriasPersonalizadas: S.categoriasPersonalizadas,
  }, limite + 1);

  const hayMas = conSobrante.length > limite;
  const movs   = conSobrante.slice(0, limite);

  if (movs.length === 0) {
    targets.forEach(el => { el.innerHTML = ''; el.hidden = true; });
    return;
  }

  const items = movs.map(m => {
    const esIngreso  = m.direccion === 'ingreso';
    const signo      = esIngreso ? '+' : (m.direccion === 'neutro' ? '' : '-');
    const claseMonto = esIngreso ? 'actividad-reciente__monto--ingreso' : 'actividad-reciente__monto--egreso';
    return `
      <li class="actividad-reciente__item">
        ${tejaCategoria(m.icono, m.dominio)}
        <div class="actividad-reciente__body">
          <p class="actividad-reciente__desc">${_esc(_descripcionMovimiento(m))}</p>
          <p class="actividad-reciente__cuando">${tiempoRelativo(_diasDesde(m.fecha))}</p>
        </div>
        <p class="actividad-reciente__monto ${claseMonto}">${signo}${f(m.monto)}</p>
      </li>`;
  }).join('');

  // IN.8g (ADR 034 D7): header propio (label + "Ver todo" en la misma fila)
  // en vez de depender de un encabezado externo.
  //
  // Ficha 02 (ADR 069): el enlace solo se dibuja cuando hay más historial que
  // el que cabe acá. Con 5 movimientos o menos, la sección completa mostraría
  // exactamente estas mismas filas y el enlace prometía una pantalla nueva
  // que no existía. Es el mismo criterio de "Ver los N" en Pendientes.
  const verTodo = hayMas
    ? '<a class="actividad-reciente__ver-todo" href="#movimientos">Ver todo</a>'
    : '';

  const html = `
    <div class="accesos-actividad__header">
      <span class="accesos-actividad__label">Actividad reciente</span>
      ${verTodo}
    </div>
    <ul class="actividad-reciente__list" role="list">${items}</ul>`;

  targets.forEach(el => { el.hidden = false; el.innerHTML = html; });
}

// ── VISTA COMPLETA (TX.8b, ruta propia #movimientos) ────────────

/** Historial completo derivado y memoizado, sin aplicar los filtros de MOV.2. */
function _todosLosMovimientos() {
  return _movimientosCompletosMemo({
    gastos:                   S.gastos,
    ingresosPuntuales:        S.ingresosPuntuales,
    aportes:                  S.ahorro?.aportes,
    transferencias:           S.transferencias,
    categoriasPersonalizadas: S.categoriasPersonalizadas,
  });
}

/**
 * PERF.7c: precalienta `_movimientosCompletosMemo` en idle, para que la
 * primera apertura de la vista completa (`#movimientos`) encuentre la caché
 * tibia. No toca el DOM.
 */
export function precalentarMovimientos() {
  _todosLosMovimientos();
}

/**
 * Renderiza la barra de filtros de la vista completa (MOV.2) en
 * `#movimientos-filtros`: búsqueda por texto, chips por dominio (reusa el
 * lenguaje `.chip`/`.filtros-bar` de Gastos, ningún componente nuevo) y rango
 * de fechas. No-op si el contenedor no existe. Vacío (sin filtros) si no hay
 * ningún movimiento: no tiene sentido filtrar una lista que no existe.
 *
 * Auto-resetea el filtro de dominio si su valor ya no aparece en los datos
 * (mismo criterio que `_filtroCategoria` en Gastos).
 */
export function renderFiltrosMovimientos() {
  const el = document.getElementById('movimientos-filtros');
  if (!el) return;

  const todos = _todosLosMovimientos();
  if (todos.length === 0) {
    el.innerHTML = '';
    return;
  }

  const dominios = [...new Set(todos.map(m => m.dominio))]
    .filter(d => _DOMINIO_LABEL[d])
    .sort((a, b) => _DOMINIO_LABEL[a].localeCompare(_DOMINIO_LABEL[b]));

  if (_filtroDominio !== null && !dominios.includes(_filtroDominio)) {
    _filtroDominio = null;
  }

  const todosActivo = _filtroDominio === null;
  const chipsDominio = dominios.map(dom => {
    const activo = _filtroDominio === dom;
    return `
        <button type="button" class="chip${activo ? ' chip--active' : ''}"
                data-action="movimientos-filtrar-dominio" data-dominio="${_esc(dom)}"
                aria-pressed="${activo}" aria-label="Filtrar por ${_esc(_DOMINIO_LABEL[dom])}">
          ${_esc(_DOMINIO_LABEL[dom])}
        </button>`;
  }).join('');

  el.innerHTML = `
    <input type="search" id="movimientos-buscar" class="input movimientos-filtros__busqueda"
           placeholder="Buscar por descripción..." value="${_esc(_filtroTexto)}"
           aria-label="Buscar movimientos por descripción" />
    ${_categoriaHtml()}
    <div class="filtros-bar" role="group" aria-label="Filtrar movimientos por tipo">
      <button type="button" class="chip${todosActivo ? ' chip--active' : ''}"
              data-action="movimientos-filtrar-dominio" data-dominio=""
              aria-pressed="${todosActivo}" aria-label="Ver todos los movimientos">
        Todos
      </button>
      ${chipsDominio}
    </div>
    <div class="movimientos-filtros__fechas">
      <label class="label" for="movimientos-desde">Desde</label>
      <input type="date" id="movimientos-desde" class="input" value="${_esc(_filtroFechaDesde)}" />
      <label class="label" for="movimientos-hasta">Hasta</label>
      <input type="date" id="movimientos-hasta" class="input" value="${_esc(_filtroFechaHasta)}" />
      <span id="movimientos-limpiar-slot">${_limpiarFiltrosHtml()}</span>
    </div>`;
}

/**
 * HTML del botón "Limpiar filtros", o '' si ningún filtro está activo.
 * Extraído para poder actualizarlo solo (ver `actualizarBotonLimpiarFiltros`),
 * sin recrear el resto de la barra.
 */
function _limpiarFiltrosHtml() {
  const hayFiltroActivo = Boolean(_filtroTexto || _filtroDominio || _filtroCategoria || _filtroFechaDesde || _filtroFechaHasta);
  return hayFiltroActivo
    ? `<button type="button" class="btn btn-ghost btn-sm" data-action="movimientos-limpiar-filtros">Limpiar filtros</button>`
    : '';
}

/**
 * La pastilla de la categoría con la que se llegó (G5). Se puede quitar, que es
 * lo que la distingue de los chips de dominio: no es una opción que la pantalla
 * ofrezca, es el filtro que trajo puesto quien entró desde un tope.
 *
 * @returns {string} HTML. `''` si no hay categoría puesta.
 */
function _categoriaHtml() {
  if (!_filtroCategoria) return '';
  return `
    <div class="movimientos-filtros__contexto">
      <button type="button" class="chip chip--active"
              data-action="movimientos-quitar-categoria"
              aria-label="Quitar el filtro de ${_esc(_filtroCategoria)}">
        ${_esc(_filtroCategoria)} <span aria-hidden="true">&times;</span>
      </button>
    </div>`;
}

/**
 * Actualiza SOLO el botón "Limpiar filtros" (MOV.2), sin tocar el resto de la
 * barra de filtros. Los handlers de texto y fecha (`index.js`) llaman a esto
 * en vez de `renderFiltrosMovimientos()` completo: repintar el contenedor
 * entero mientras el usuario escribe le haría perder el foco y el cursor a
 * mitad de palabra. No-op si el slot no existe (la barra está vacía porque
 * no hay movimientos).
 */
export function actualizarBotonLimpiarFiltros() {
  const slot = document.getElementById('movimientos-limpiar-slot');
  if (slot) slot.innerHTML = _limpiarFiltrosHtml();
}

/**
 * Nombre de la cuenta para mostrar en el subtítulo del movimiento, o `null`
 * si el movimiento no tiene cuenta asociada (aportes) o la cuenta ya no existe.
 * @param {string|null} cuentaId
 * @returns {string|null}
 */
function _nombreCuenta(cuentaId) {
  if (!cuentaId) return null;
  return S.cuentas?.find(c => c.id === cuentaId)?.nombre ?? null;
}

/**
 * Descripción a mostrar para un movimiento (delega en `logic.js`, MOV.2: el
 * mismo join cuenta→nombre que usa el filtro de texto, sin duplicarlo).
 * @param {import('./logic.js').Movimiento} m
 * @returns {string}
 */
function _descripcionMovimiento(m) {
  return descripcionMovimiento(m, S.cuentas);
}

/** "Julio 2026" a partir de una fecha ISO, para el divisor de mes. */
function _mesAnioLabel(fechaISO) {
  const d = new Date(`${fechaISO}T12:00:00Z`);
  const label = formateadorFecha('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Agrupa movimientos ya ordenados (más reciente primero) en bloques
 * consecutivos por mes calendario, para el divisor de la vista completa.
 * @param {import('./logic.js').Movimiento[]} movs
 * @returns {Array<{ label: string, items: import('./logic.js').Movimiento[] }>}
 */
function _agruparPorMes(movs) {
  const grupos = [];
  let claveActual = null;
  for (const m of movs) {
    const clave = m.fecha.slice(0, 7); // YYYY-MM
    if (clave !== claveActual) {
      grupos.push({ label: _mesAnioLabel(m.fecha), items: [] });
      claveActual = clave;
    }
    grupos[grupos.length - 1].items.push(m);
  }
  return grupos;
}

/**
 * MOV.1: acciones que ofrece cada fila del ledger, por `tipo` de movimiento.
 *
 * **El enrutador es `m.tipo`, NO `m.dominio`.** `m.dominio` es una etiqueta
 * visual (un gasto de categoría "Deudas" o "Gastos fijos" lleva
 * `dominio: 'compromisos'` para colorear su teja, pero su registro vive en
 * `S.gastos`); enrutar por ahí mandaría la acción al dominio equivocado.
 * `tipo` sí mapea 1:1 con la colección de origen.
 *
 * Solo routing/UI, cero lógica: son los mismos `data-action` que cada dominio
 * dueño YA registra para su propia lista, así que el ledger no reimplementa
 * nada y hereda gratis sus reversas (borrar un gasto devuelve el monto a la
 * cuenta y revierte el abono de la deuda; borrar un ingreso puntual revierte
 * su crédito). Mismo criterio que `_VEHICULO_META` en `ahorro/view.js`.
 *
 * Un tipo sin entrada (o sin una de las dos claves) simplemente no ofrece esa
 * acción: `ingreso`/`aporte` no se editan (EDIT.1). Cuando esas tarjetas
 * cierren, basta sumar la entrada acá.
 *
 * `transferencia` (MC.17f) solo ofrece `eliminar`, no `editar`: deshacer
 * devuelve el traslado (y el GMF) a ambas cuentas y borra el registro, mismo
 * mecanismo que `eliminar-gasto`. Editar una transferencia ya aplicada tocaría
 * dos saldos a la vez con GMF de por medio; se prefiere deshacer + recrear.
 */
const _ACCIONES_POR_TIPO = {
  gasto:         { editar: 'editar-gasto', eliminar: 'eliminar-gasto', nombre: 'gasto' },
  ingreso:       { eliminar: 'eliminar-ingreso-puntual',               nombre: 'ingreso' },
  aporte:        { eliminar: 'ahorro-eliminar-aporte',                 nombre: 'aporte al fondo' },
  transferencia: { eliminar: 'eliminar-transferencia',                 nombre: 'transferencia' },
};

/**
 * Botonera de la fila. Devuelve '' cuando el tipo no ofrece ninguna acción,
 * para no dejar un contenedor vacío ocupando espacio.
 * @param {import('./logic.js').Movimiento} m
 * @returns {string}
 */
function _renderAccionesMovimiento(m) {
  const acciones = _ACCIONES_POR_TIPO[m.tipo];
  if (!acciones) return '';

  const idEsc = _esc(m.id);
  // El aria-label nombra el movimiento concreto: en una lista larga, "Editar"
  // a secas no dice cuál (mismo criterio que la lista de Gastos y de aportes).
  const desc = _esc(_descripcionMovimiento(m));

  const btnEditar = acciones.editar
    ? `<button class="btn btn-ghost btn-icon" data-action="${acciones.editar}" data-id="${idEsc}"
               aria-label="Editar ${acciones.nombre}: ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>`
    : '';
  const btnEliminar = acciones.eliminar
    ? `<button class="btn btn-ghost btn-icon" data-action="${acciones.eliminar}" data-id="${idEsc}"
               aria-label="Eliminar ${acciones.nombre}: ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>`
    : '';

  return `<div class="list-item__action">${btnEditar}${btnEliminar}</div>`;
}

function _renderMovimientoItem(m) {
  const esIngreso     = m.direccion === 'ingreso';
  const signo         = esIngreso ? '+' : (m.direccion === 'neutro' ? '' : '-');
  const claseMonto    = esIngreso ? 'list-item__amount--ingreso' : '';
  const cuenta        = _nombreCuenta(m.cuentaId);
  // MC.17d: una transferencia con 4x1000 traza el gravamen en el subtítulo, sin
  // sumarlo al monto de la fila (que es lo que llegó al destino).
  const gmfNota       = m.tipo === 'transferencia' && m.costoGMF > 0
    ? `incluye ${f(m.costoGMF)} de 4x1000`
    : null;
  const subtitulo     = [_TIPO_LABEL[m.tipo] ?? m.tipo, fechaLegible(m.fecha), cuenta, gmfNota]
    .filter(Boolean).map(_esc).join(' · ');

  return `
    <article class="list-item" data-id="${_esc(m.id)}">
      <div class="list-item__icon" aria-hidden="true">${tejaCategoria(m.icono, m.dominio)}</div>
      <div class="list-item__body">
        <p class="list-item__title">${_esc(_descripcionMovimiento(m))}</p>
        <p class="list-item__subtitle">${subtitulo}</p>
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount ${claseMonto}">${signo}${f(m.monto)}</p>
      </div>
      ${_renderAccionesMovimiento(m)}
    </article>`;
}

function _renderEmptyMovimientos() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('recurring')}</div>
      <p class="empty-state__title">Todavía no hay movimientos</p>
      <p class="empty-state__desc">Tus gastos, ingresos y aportes al fondo aparecerán aquí, ordenados por fecha.</p>
    </div>`;
}

/**
 * Empty state cuando SÍ hay movimientos pero ninguno pasa los filtros activos
 * (MOV.2). Distinto del vacío real: acá el CTA es quitar el filtro, no crear
 * un registro nuevo.
 */
function _renderEmptySinResultados() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('recurring')}</div>
      <p class="empty-state__title">Nada coincide con esos filtros</p>
      <p class="empty-state__desc">Prueba con otra búsqueda o quita algún filtro.</p>
      <button type="button" class="btn btn-ghost" data-action="movimientos-limpiar-filtros">Limpiar filtros</button>
    </div>`;
}

// ── PAGINACIÓN DE LA VISTA COMPLETA (PERF.1) ─────────────────────

/**
 * Aplana los grupos por mes en una secuencia lineal de "entradas" (divisor de
 * mes o ítem), en el mismo orden en que se pintan. Paginar sobre esta lista
 * plana (en vez de sobre `grupos`) evita repetir o saltar un divisor cuando
 * un lote corta a mitad de mes.
 * @param {Array<{ label: string, items: import('./logic.js').Movimiento[] }>} grupos
 * @returns {Array<{ tipo: 'divisor', label: string } | { tipo: 'item', mov: import('./logic.js').Movimiento }>}
 */
function _aplanarEntradas(grupos) {
  const entradas = [];
  for (const { label, items } of grupos) {
    entradas.push({ tipo: 'divisor', label });
    for (const mov of items) entradas.push({ tipo: 'item', mov });
  }
  return entradas;
}

function _renderEntrada(entrada) {
  return entrada.tipo === 'divisor'
    ? `<div class="movimientos-mes" role="presentation">${_esc(entrada.label)}</div>`
    : _renderMovimientoItem(entrada.mov);
}

function _renderControlCargarMas() {
  return `
    <div class="movimientos-cargar-mas">
      <button type="button" class="btn btn-ghost" id="movimientos-cargar-mas"
              data-action="movimientos-cargar-mas">Cargar más movimientos</button>
    </div>`;
}

/** Entradas pendientes de pintar (divisores + ítems) y cursor del próximo lote. */
let _entradasPendientes = [];
let _cursorLote = 0;

/** Observer del control "Cargar más": lo dispara solo con que entre en viewport. */
let _observerCargarMas = null;

/** Desconecta el observer activo, si lo hay. Se llama en cada render nuevo. */
function _detenerCargaAutomatica() {
  _observerCargarMas?.disconnect();
  _observerCargarMas = null;
}

/**
 * Observa el control "Cargar más" recién insertado para disparar el
 * siguiente lote automáticamente al hacer scroll hasta él (progresivo: el
 * botón sigue siendo 100% operable con teclado/lector de pantalla sin esto).
 * @param {HTMLElement} el - contenedor `#lista-movimientos`.
 */
function _observarControlCargarMas(el) {
  if (typeof IntersectionObserver === 'undefined') return;
  const boton = el.querySelector('#movimientos-cargar-mas');
  if (!boton) return;
  _observerCargarMas = new IntersectionObserver((entradas) => {
    if (entradas.some((e) => e.isIntersecting)) cargarMasMovimientos();
  });
  _observerCargarMas.observe(boton);
}

/**
 * Pinta el siguiente lote al final de `el`, y deja (o quita) el control
 * "Cargar más" según si queda más por pintar.
 *
 * El lote se mide en `TAMANO_LOTE` ítems reales, no en entradas totales: un
 * divisor de mes no cuenta contra el cupo, para que un mes con muy pocos
 * movimientos no reduzca el tamaño efectivo del lote.
 *
 * @param {HTMLElement} el
 */
function _agregarSiguienteLote(el) {
  _detenerCargaAutomatica();
  el.querySelector('#movimientos-cargar-mas')?.closest('.movimientos-cargar-mas')?.remove();

  let itemsEnLote = 0;
  let fin = _cursorLote;
  while (fin < _entradasPendientes.length && itemsEnLote < TAMANO_LOTE) {
    if (_entradasPendientes[fin].tipo === 'item') itemsEnLote++;
    fin++;
  }

  const html = _entradasPendientes.slice(_cursorLote, fin).map(_renderEntrada).join('');
  el.insertAdjacentHTML('beforeend', html);
  _cursorLote = fin;

  if (_cursorLote < _entradasPendientes.length) {
    el.insertAdjacentHTML('beforeend', _renderControlCargarMas());
    _observarControlCargarMas(el);
  }
}

/**
 * Pinta el siguiente lote de la vista completa de Movimientos. Wired a la
 * acción `movimientos-cargar-mas` (clic en el botón) y al `IntersectionObserver`
 * del propio botón (scroll). No-op si ya no queda nada pendiente o el
 * contenedor no existe (ej. el usuario navegó a otra sección).
 */
export function cargarMasMovimientos() {
  const el = document.getElementById('lista-movimientos');
  if (!el || _cursorLote >= _entradasPendientes.length) return;
  _agregarSiguienteLote(el);
}

/**
 * Renderiza en `#lista-movimientos` el historial completo (TX.8b, ruta
 * `#movimientos`), agrupado por mes. No-op si el contenedor no existe.
 *
 * PERF.1: con años de historial, construir todos los nodos de una sola vez es
 * el cuello de botella más caro de la app. Acá solo se pinta el primer lote
 * (`TAMANO_LOTE` entradas); el resto se agrega bajo demanda con
 * `cargarMasMovimientos()`, sin recalcular el historial ya derivado.
 */
export function renderMovimientosCompletos() {
  const el = document.getElementById('lista-movimientos');
  if (!el) return;

  _detenerCargaAutomatica();

  const todos = _todosLosMovimientos();

  if (todos.length === 0) {
    el.innerHTML = _renderEmptyMovimientos();
    _entradasPendientes = [];
    _cursorLote = 0;
    return;
  }

  // MOV.2: filtrar sobre la fuente ya derivada, ANTES de agrupar/paginar.
  // Nunca sobre el DOM ya pintado: con años de historial PERF.1 ni siquiera
  // llegó a pintar todos los nodos.
  const movs = filtrarMovimientos(todos, {
    texto:     _filtroTexto,
    dominio:   _filtroDominio,
    categoria: _filtroCategoria,
    desde:     _filtroFechaDesde,
    hasta:     _filtroFechaHasta,
    cuentas:   S.cuentas,
  });

  if (movs.length === 0) {
    el.innerHTML = _renderEmptySinResultados();
    _entradasPendientes = [];
    _cursorLote = 0;
    return;
  }

  _entradasPendientes = _aplanarEntradas(_agruparPorMes(movs));
  _cursorLote = 0;
  el.innerHTML = '';
  _agregarSiguienteLote(el);
}
