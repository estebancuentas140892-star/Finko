/**
 * movimientos/busqueda.js - el modo búsqueda de Movimientos (MOV.4, ADR 200 D1).
 *
 * Al enfocar el campo se oculta el encabezado, aparece ← y se pinta el
 * panel: con el campo vacío, "Buscaste antes" y "Puedes buscar por" (ADR 137
 * D5: nada más hasta escribir); desde 2 letras, las sugerencias por criterio
 * ("Filtrar por") y al final "Buscar el texto". Elegir una sugerencia crea su
 * chip, borra el texto y deja el foco en el campo para seguir encadenando.
 * ← o Atrás del sistema salen y borran el texto.
 *
 * Solo UI: las sugerencias salen de `filtros.js`.
 */

import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { esc as _esc, hoy } from '../../infra/utils.js';
import { tejaCategoria } from '../../infra/icons.js';
import { tejaMarca, marcaPorId } from '../../infra/marcas.js';
import { announce } from '../../infra/a11y.js';
import { sugerencias, conSugerencia } from './filtros.js';
import { anotarBusquedaReciente } from './logic.js';
import { filtrosMovimientos, ponerFiltrosMovimientos, movimientosPreparados, contextoFiltros } from './view.js';

const MQ_MOVIL = '(max-width: 1023.98px)';
const _esMovil = () => window.matchMedia?.(MQ_MOVIL).matches === true;

/** Lo que el panel ofrece ahora (para elegir por índice). */
let _ultimas = { filtros: [], texto: null };
/** La opción marcada con las flechas (aria-activedescendant). */
let _activa = -1;
/** El atrás del sistema mientras se busca (S3: sale del modo búsqueda). */
let _vigia = null;
let _espera = null;

/** Quien repinta la barra y la lista (index.js). */
let _repintar = () => {};

const _campo = () => document.getElementById('movimientos-buscar');
const _panel = () => document.getElementById('movimientos-sugerencias');
const _seccion = () => document.getElementById('sec-movimientos');

/** ¿Se está buscando? (el encabezado oculto y ← a la vista). */
export function enModoBusqueda() {
  return _seccion()?.classList.contains('mov-buscando') === true;
}

// ── PINTAR EL PANEL ──────────────────────────────────────────────

const _icono = (id) => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;

/** El nombre con lo escrito en negrita (M03: "<b>Trans</b>porte"). */
function _conCoincidencia(nombre, inicio, largo) {
  if (inicio < 0 || !largo) return _esc(nombre);
  return `${_esc(nombre.slice(0, inicio))}<b>${_esc(nombre.slice(inicio, inicio + largo))}</b>${_esc(nombre.slice(inicio + largo))}`;
}

/** La teja de una sugerencia: la del tipo, la de la marca, iniciales o la lupa. */
function _figura(s) {
  if (s.clave === 'tipos' && s.extra) return tejaCategoria(s.extra.icono, s.extra.dom === 'neutro' ? '' : s.extra.dom);
  if (s.clave === 'empresas') {
    const marca = marcaPorId(s.extra?.marcaId);
    if (marca) return `<span class="mov-sug__logo">${tejaMarca(marca)}</span>`;
  }
  const iconos = { categorias: 'c-etiqueta', subcategorias: 'c-etiqueta', cuentas: 'i-cuentas', empresas: 'c-edificio', personas: 'i-users', periodo: 'i-agenda', valor: 'c-billete' };
  const dom = s.clave === 'categorias' || s.clave === 'subcategorias' ? 'gastos' : '';
  return tejaCategoria(iconos[s.clave] ?? 'i-search', dom);
}

function _opcion({ id, accion, datos = '', figura, nombre, detalle, final }) {
  return `
      <button type="button" role="option" class="mov-sug" id="${id}" aria-selected="false" data-action="${accion}"${datos}>
        <span class="mov-sug__teja" aria-hidden="true">${figura}</span>
        <span class="mov-sug__texto"><span class="mov-sug__nombre">${nombre}</span>${detalle ? `<span class="mov-sug__donde">${detalle}</span>` : ''}</span>
        ${final}
      </button>`;
}

/** Con el campo vacío (M02): lo que se buscó antes y por qué se puede buscar. */
function _panelVacio() {
  const recientes = Array.isArray(S.config?.busquedasRecientes) ? S.config.busquedasRecientes : [];
  _ultimas = { filtros: [], texto: null, recientes };
  const lista = recientes.map((t, i) => `
      <button type="button" role="option" class="mov-sug mov-sug--reciente" id="mov-sug-r${i}" aria-selected="false"
              data-action="movimientos-buscar-reciente" data-texto="${_esc(t)}">${_icono('i-clock')}<span class="mov-sug__nombre">${_esc(t)}</span></button>`).join('');
  return `${recientes.length ? `
    <p class="mov-sugerencias__titulo" id="mov-sug-recientes">Buscaste antes</p>
    <div role="listbox" aria-labelledby="mov-sug-recientes">${lista}
    </div>
    <hr class="mov-sugerencias__raya" />` : ''}
    <p class="mov-sugerencias__titulo" id="mov-sug-puedes">Puedes buscar por</p>
    <ul class="mov-puedes" aria-labelledby="mov-sug-puedes">
      <li>${_icono('i-gastos')}Descripción o nota</li>
      <li>${_icono('c-etiqueta')}Categoría</li>
      <li>${_icono('i-cuentas')}Cuenta</li>
      <li>${_icono('c-edificio')}Empresa o entidad</li>
      <li>${_icono('i-users')}Persona</li>
      <li>${_icono('c-billete')}Monto exacto</li>
    </ul>`;
}

/** Con texto (M03): "Filtrar por" y "Buscar el texto". */
function _panelConTexto(texto) {
  _ultimas = sugerencias(movimientosPreparados(), texto, filtrosMovimientos(), contextoFiltros());
  const mas = `<span class="mov-sug__mas" aria-hidden="true">${_icono('i-plus')}</span>`;
  const filtros = _ultimas.filtros.map((s, i) => _opcion({
    id: `mov-sug-${i}`, accion: 'movimientos-sugerencia', datos: ` data-i="${i}"`, figura: _figura(s),
    nombre: _conCoincidencia(s.nombre, s.inicio, s.largo),
    detalle: `${_esc(s.donde)} · ${s.n.toLocaleString('es-CO')}`, final: mas,
  })).join('');
  const t = _ultimas.texto;
  return `${filtros ? `
    <p class="mov-sugerencias__titulo" id="mov-sug-filtrar">Filtrar por</p>
    <div role="listbox" aria-labelledby="mov-sug-filtrar">${filtros}
    </div>
    <hr class="mov-sugerencias__raya" />` : ''}
    <p class="mov-sugerencias__titulo" id="mov-sug-texto">Buscar el texto</p>
    <div role="listbox" aria-labelledby="mov-sug-texto">${_opcion({
      id: 'mov-sug-t', accion: 'movimientos-buscar-texto', figura: tejaCategoria('i-search', ''),
      nombre: `"${_esc(t.q)}" en todo`, detalle: `Descripciones, notas y nombres · ${t.n.toLocaleString('es-CO')}`,
      final: _icono('i-chevron-right'),
    })}
    </div>`;
}

/** Pinta el panel según lo escrito. */
function _pintarPanel() {
  const panel = _panel();
  const campo = _campo();
  if (!panel || !campo) return;
  const texto = campo.value.trim();
  panel.innerHTML = texto.length >= 2 ? _panelConTexto(texto) : _panelVacio();
  _activa = -1;
  campo.removeAttribute('aria-activedescendant');
}

function _mostrarPanel(si) {
  const panel = _panel();
  const campo = _campo();
  if (!panel || !campo) return;
  panel.hidden = !si;
  campo.setAttribute('aria-expanded', String(si));
  _seccion()?.classList.toggle('mov-sugiriendo', si);
}

// ── ENTRAR Y SALIR ───────────────────────────────────────────────

function _entrar() {
  const sec = _seccion();
  if (!sec) return;
  if (_esMovil()) {
    sec.classList.add('mov-buscando');
    const volver = sec.querySelector('.mov-barra__volver');
    if (volver) volver.hidden = false;
    _armarVigia();
  }
  _pintarPanel();
  _mostrarPanel(true);
}

/** El atrás del sistema sale del modo búsqueda (S3), sin tocar el historial. */
function _armarVigia() {
  const Vigia = window.CloseWatcher;
  if (typeof Vigia !== 'function' || _vigia) return;
  _vigia = new Vigia();
  _vigia.onclose = () => { _vigia = null; salirDeBusqueda(); };
}

/**
 * Sale del modo búsqueda: borra el texto, cierra el panel y vuelve a
 * mostrar el encabezado. Con `conservarTexto`, solo cierra el panel (una
 * búsqueda confirmada sigue en el campo, M04).
 */
export function salirDeBusqueda({ conservarTexto = false, sinFoco = false } = {}) {
  const sec = _seccion();
  const campo = _campo();
  _mostrarPanel(false);
  if (conservarTexto) {
    if (document.activeElement === campo) campo.blur();
    return;
  }
  sec?.classList.remove('mov-buscando');
  const volver = sec?.querySelector('.mov-barra__volver');
  if (volver) volver.hidden = true;
  _vigia?.destroy();
  _vigia = null;
  const f = filtrosMovimientos();
  if (campo) campo.value = '';
  if (f.texto) {
    ponerFiltrosMovimientos({ ...f, texto: '' });
    _repintar();
  }
  if (campo && document.activeElement === campo) campo.blur();
  // El foco nunca queda en el body (R46): va al botón Filtros, sin teclado.
  if (!sinFoco) requestAnimationFrame(() => document.querySelector('.mov-filtros-btn')?.focus({ preventScroll: true }));
}

/** Confirma el texto (Buscar, Enter o "Buscar el texto"): se queda en el campo. */
function _confirmarTexto() {
  clearTimeout(_espera);
  const campo = _campo();
  const texto = campo?.value.trim() ?? '';
  const f = filtrosMovimientos();
  ponerFiltrosMovimientos({ ...f, texto });
  _repintar();
  if (texto && document.querySelector('#lista-movimientos .list-item')) {
    S.config.busquedasRecientes = anotarBusquedaReciente(S.config.busquedasRecientes, texto);
    save();
  }
  if (texto) salirDeBusqueda({ conservarTexto: true });
  else salirDeBusqueda();
}

// ── ACCIONES ─────────────────────────────────────────────────────

/** Elegir una sugerencia crea el chip, borra el texto y deja el foco (S1, 3). */
function _elegir(el) {
  const s = _ultimas.filtros[Number(el?.dataset?.i)];
  if (!s) return;
  const campo = _campo();
  const f = conSugerencia(filtrosMovimientos(), s, hoy());
  ponerFiltrosMovimientos(f);
  if (campo) campo.value = '';
  _repintar();
  _pintarPanel();
  announce(`Filtro puesto: ${s.nombre}.`);
  campo?.focus({ preventScroll: true });
}

function _buscarReciente(el) {
  const campo = _campo();
  if (!campo) return;
  campo.value = el?.dataset?.texto ?? '';
  _confirmarTexto();
}

/** La × del campo: borra el texto y sigue buscando (S1, 1). */
function _borrarTexto() {
  const campo = _campo();
  const f = filtrosMovimientos();
  ponerFiltrosMovimientos({ ...f, texto: '' });
  if (campo) campo.value = '';
  _repintar();
  if (enModoBusqueda() || document.activeElement === campo) {
    campo?.focus({ preventScroll: true });
    _pintarPanel();
    _mostrarPanel(true);
  } else {
    // "Borrar la búsqueda" de sin resultados: vuelve a la lista entera.
    salirDeBusqueda();
  }
}

// ── TECLADO ──────────────────────────────────────────────────────

function _opciones() {
  return [...(_panel()?.querySelectorAll('[role="option"]') ?? [])];
}

function _marcar(i) {
  const ops = _opciones();
  const campo = _campo();
  if (!campo || ops.length === 0) return;
  _activa = (i + ops.length) % ops.length;
  ops.forEach((o, j) => o.setAttribute('aria-selected', String(j === _activa)));
  campo.setAttribute('aria-activedescendant', ops[_activa].id);
  ops[_activa].scrollIntoView?.({ block: 'nearest' });
}

function _alTeclear(e) {
  if (e.target?.id !== 'movimientos-buscar') return;
  if (e.key === 'ArrowDown') { e.preventDefault(); _marcar(_activa + 1); return; }
  if (e.key === 'ArrowUp') { e.preventDefault(); _marcar(_activa - 1); return; }
  if (e.key === 'Enter') {
    e.preventDefault();
    const op = _opciones()[_activa];
    if (op) op.click();
    else _confirmarTexto();
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    if (_panel() && !_panel().hidden) _mostrarPanel(false);
    else salirDeBusqueda();
  }
}

function _alEscribir(e) {
  if (e.target?.id !== 'movimientos-buscar') return;
  const campo = e.target;
  const borrar = document.querySelector('.mov-buscar__borrar');
  if (borrar) borrar.hidden = !campo.value;
  // Espera de 150 ms (S1, 3); la lista se filtra al confirmar o al elegir.
  clearTimeout(_espera);
  _espera = setTimeout(() => {
    if (document.activeElement !== campo) return;
    _pintarPanel();
    _mostrarPanel(true);
  }, 150);
}

/**
 * @param {(nombre: string, fn: (el: HTMLElement) => void) => void} registrar
 * @param {() => void} repintar Repinta la barra y la lista.
 */
export function initBusqueda(registrar, repintar) {
  _repintar = repintar;
  registrar('movimientos-sugerencia', _elegir);
  registrar('movimientos-buscar-texto', _confirmarTexto);
  registrar('movimientos-buscar-reciente', _buscarReciente);
  registrar('movimientos-borrar-texto', _borrarTexto);
  registrar('movimientos-salir-busqueda', () => salirDeBusqueda());
  document.addEventListener('focusin', (e) => {
    if (e.target?.id === 'movimientos-buscar') _entrar();
  });
  document.addEventListener('input', _alEscribir);
  document.addEventListener('keydown', _alTeclear);
  // Tocar una opción no le quita el foco al campo (el teclado sigue abierto).
  document.addEventListener('mousedown', (e) => {
    if (e.target?.closest?.('#movimientos-sugerencias')) e.preventDefault();
  });
  // Tocar fuera de la barra y del panel cierra el panel; con texto
  // confirmado, el modo sigue (M04).
  document.addEventListener('click', (e) => {
    if (!_panel() || _panel().hidden) return;
    if (e.target?.closest?.('.mov-barra, #movimientos-sugerencias')) return;
    _mostrarPanel(false);
  });
}
