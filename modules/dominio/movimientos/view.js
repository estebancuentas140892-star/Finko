/**
 * movimientos/view.js - panel "Actividad reciente" en Inicio (TX.8a).
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (toda en logic.js).
 */

import { S } from '../../core/state.js';
import { f, esc as _esc, tiempoRelativo, fechaLegible } from '../../infra/utils.js';
import { icon, emptyArt, tejaCategoria } from '../../infra/icons.js';
import { movimientosRecientes, movimientosCompletos } from './logic.js';

/** Cuántos movimientos recientes se muestran en el panel de Inicio. */
const LIMITE_RECIENTES = 5;

/**
 * Cuántas entradas (ítems + divisores de mes) se agregan al DOM por lote en
 * la vista completa (PERF.1). Con años de historial, construir todos los
 * nodos de una sola vez es el cuello de botella más caro de la app (~4s con
 * 10 años de datos): en vez de eso, `renderMovimientosCompletos()` pinta solo
 * el primer lote y el resto se agrega bajo demanda vía `cargarMasMovimientos()`.
 */
const TAMANO_LOTE = 50;

/** Etiqueta legible por tipo de movimiento, usada en el subtítulo de la vista completa. */
const _TIPO_LABEL = { gasto: 'Gasto', ingreso: 'Ingreso', aporte: 'Aporte' };

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
 * Renderiza en `#panel-actividad-reciente` los últimos movimientos derivados
 * de gastos, ingresos puntuales y aportes al fondo (ADR 028 D5). Vacío si no
 * hay ninguno, y limpia el panel para no ocupar espacio. No-op si el
 * contenedor no existe.
 */
export function renderActividadReciente() {
  const el = document.getElementById('panel-actividad-reciente');
  if (!el) return;

  const movs = movimientosRecientes({
    gastos:                   S.gastos,
    ingresosPuntuales:        S.ingresosPuntuales,
    aportes:                  S.ahorro?.aportes,
    categoriasPersonalizadas: S.categoriasPersonalizadas,
  }, LIMITE_RECIENTES);

  if (movs.length === 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const items = movs.map(m => {
    const esIngreso = m.direccion === 'ingreso';
    const signo      = esIngreso ? '+' : '-';
    const claseMonto = esIngreso ? 'actividad-reciente__monto--ingreso' : 'actividad-reciente__monto--egreso';
    return `
      <li class="actividad-reciente__item">
        <span class="actividad-reciente__icon" aria-hidden="true">${icon(m.icono)}</span>
        <div class="actividad-reciente__body">
          <p class="actividad-reciente__desc">${_esc(m.descripcion)}</p>
          <p class="actividad-reciente__cuando">${tiempoRelativo(_diasDesde(m.fecha))}</p>
        </div>
        <p class="actividad-reciente__monto ${claseMonto}">${signo}${f(m.monto)}</p>
      </li>`;
  }).join('');

  el.innerHTML = `
    <section class="actividad-reciente" aria-label="Actividad reciente">
      <header class="actividad-reciente__header">
        <h2 class="actividad-reciente__title">${icon('recurring')} Actividad reciente</h2>
      </header>
      <ul class="actividad-reciente__list" role="list">${items}</ul>
      <a class="actividad-reciente__ver-todo" href="#movimientos">Ver todo</a>
    </section>`;
}

// ── VISTA COMPLETA (TX.8b, ruta propia #movimientos) ────────────

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

/** "Julio 2026" a partir de una fecha ISO, para el divisor de mes. */
function _mesAnioLabel(fechaISO) {
  const d = new Date(`${fechaISO}T12:00:00Z`);
  const label = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
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

function _renderMovimientoItem(m) {
  const esIngreso     = m.direccion === 'ingreso';
  const signo         = esIngreso ? '+' : '-';
  const claseMonto    = esIngreso ? 'list-item__amount--ingreso' : '';
  const cuenta        = _nombreCuenta(m.cuentaId);
  const subtitulo     = [_TIPO_LABEL[m.tipo] ?? m.tipo, fechaLegible(m.fecha), cuenta]
    .filter(Boolean).map(_esc).join(' · ');

  return `
    <article class="list-item" data-id="${_esc(m.id)}">
      <div class="list-item__icon" aria-hidden="true">${tejaCategoria(m.icono, m.dominio)}</div>
      <div class="list-item__body">
        <p class="list-item__title">${_esc(m.descripcion)}</p>
        <p class="list-item__subtitle">${subtitulo}</p>
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount ${claseMonto}">${signo}${f(m.monto)}</p>
      </div>
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

  const movs = movimientosCompletos({
    gastos:                   S.gastos,
    ingresosPuntuales:        S.ingresosPuntuales,
    aportes:                  S.ahorro?.aportes,
    categoriasPersonalizadas: S.categoriasPersonalizadas,
  });

  if (movs.length === 0) {
    el.innerHTML = _renderEmptyMovimientos();
    _entradasPendientes = [];
    _cursorLote = 0;
    return;
  }

  _entradasPendientes = _aplanarEntradas(_agruparPorMes(movs));
  _cursorLote = 0;
  el.innerHTML = '';
  _agregarSiguienteLote(el);
}
