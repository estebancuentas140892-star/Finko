/**
 * movimientos/hoja.js - la hoja de filtros de Movimientos (MOV.4, ADR 200 D2).
 *
 * Ocho criterios en cuatro grupos, plegables, uno abierto a la vez. Aplica en
 * vivo: no hay borrador, lo que se marca ya es el filtro. "Ver N
 * movimientos" cierra; la ✕, deslizar abajo, el velo y Atrás también, y
 * conservan todo (S3). Cada opción dice cuántos movimientos tiene con lo ya
 * elegido, y el pie cuenta en vivo.
 *
 * Es la hoja del teléfono que ya existe (`modales.js`, `hojas.js`): sin
 * `<form>`, porque nada se pierde al cerrarla (ADR 142 D8 no pregunta).
 */

import { S } from '../../core/state.js';
import { esc as _esc, hoy } from '../../infra/utils.js';
import { tejaCategoria } from '../../infra/icons.js';
import { tejaMarca, marcaPorId } from '../../infra/marcas.js';
import { desdeMiles, miles } from '../../infra/miles.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import {
  ATAJOS_PERIODO, ATAJOS_VALOR, aplicarFiltros, opcionesDe, textoCriterio, criterioActivo,
  cuantosFiltros, rangoDeAtajo, conteoPeriodo, conteoValor, sinCriterios, alternar, plano,
} from './filtros.js';
import { filtrosMovimientos, ponerFiltrosMovimientos, movimientosPreparados, contextoFiltros } from './view.js';

const _ID = 'modal-filtros-movimientos';

/** Los grupos de la hoja y sus criterios, con su ícono (M05). */
const _GRUPOS = [
  { titulo: 'Cuándo', criterios: [['periodo', 'Fecha o periodo', 'i-agenda']] },
  { titulo: 'Qué', criterios: [['tipos', 'Tipo de movimiento', 'i-saldo'], ['categorias', 'Categoría', 'c-etiqueta'], ['estado', 'Estado', 'i-check-circle']] },
  { titulo: 'Dónde y con quién', criterios: [['cuentas', 'Cuenta', 'i-cuentas'], ['empresas', 'Empresa o entidad', 'c-edificio'], ['personas', 'Persona', 'i-users']] },
  { titulo: 'Cuánto', criterios: [['valor', 'Valor', 'c-billete']] },
];

/** Lo que dice un criterio sin elegir. */
const _TODOS = {
  periodo: 'Todo', tipos: 'Todos', categorias: 'Todas', estado: 'Cualquiera',
  cuentas: 'Todas', empresas: 'Todas', personas: 'Todas', valor: 'Cualquier valor',
};

/** Con más de 8 opciones aparece el buscador de la lista (S1, 9). */
const _CON_BUSCADOR = 8;

/** El criterio abierto (uno a la vez) y lo escrito en el buscador de su lista. */
let _abierto = null;
let _busqueda = '';

/** Quién repinta la barra y la lista tras un cambio (index.js). */
let _alCambiar = () => {};

/** @param {() => void} fn */
export function alCambiarFiltrosHoja(fn) { _alCambiar = fn; }

const _icono = (id) => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;

const _cuantos = (n) => `${n.toLocaleString('es-CO')} ${n === 1 ? 'movimiento' : 'movimientos'}`;

/**
 * ¿Estado se puede usar? Solo con fijos o deudas en Tipo o Categoría
 * (S2): sin ellos la fila se ve y no abre.
 */
function _estadoDisponible(f, movs) {
  if (f.tipos.some(t => t === 'fijos' || t === 'deudas')) return true;
  if (!f.categorias.length) return false;
  return movs.some(m => (m.grupo === 'fijos' || m.grupo === 'deudas') && f.categorias.includes(m.categoriaFiltro));
}

/** Las iniciales de un nombre: "Tía Rosa" → "TR". */
function _iniciales(nombre) {
  const p = String(nombre ?? '').trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : (p[0]?.[1] ?? ''))).toUpperCase();
}

// ── PINTAR ───────────────────────────────────────────────────────

/** Una opción con casilla real y su conteo en el nombre (S3). */
function _casilla({ nombre, id, valor, marcada, n, dato, figura = '', sub = false, detalle = '', parcial = false }) {
  const cero = n === 0 ? ' mov-opcion--cero' : '';
  return `
        <label class="mov-opcion${sub ? ' mov-opcion--sub' : ''}${cero}" for="${id}">
          <input type="checkbox" class="mov-opcion__casilla" id="${id}" data-${dato}="${_esc(valor)}"${marcada ? ' checked' : ''}${parcial ? ' data-parcial' : ''}
                 aria-label="${_esc(nombre)}, ${_cuantos(n)}" />
          <span class="mov-caja" aria-hidden="true">${_icono('i-check')}</span>
          ${figura}
          <span class="mov-opcion__nombre"><span>${_esc(nombre)}</span>${detalle ? `<small>${_esc(detalle)}</small>` : ''}</span>
          <span class="mov-opcion__n" aria-hidden="true">${n.toLocaleString('es-CO')}</span>
        </label>`;
}

function _radio({ nombre, name, valor, marcada, n = null, id }) {
  const cero = n === 0 ? ' mov-opcion--cero' : '';
  return `
        <label class="mov-opcion mov-opcion--radio${cero}" for="${id}">
          <input type="radio" class="mov-opcion__casilla" name="${name}" id="${id}" value="${_esc(valor)}"${marcada ? ' checked' : ''}
                 aria-label="${_esc(nombre)}${n == null ? '' : `, ${_cuantos(n)}`}" />
          <span class="mov-caja mov-caja--radio" aria-hidden="true"></span>
          <span class="mov-opcion__nombre"><span>${_esc(nombre)}</span></span>
          ${n == null ? '' : `<span class="mov-opcion__n" aria-hidden="true">${n.toLocaleString('es-CO')}</span>`}
        </label>`;
}

/** El buscador de una lista larga ("Buscar categoría"). */
function _buscadorLista(rotulo, total) {
  if (total <= _CON_BUSCADOR) return '';
  return `
        <div class="mov-hoja__buscar">
          ${_icono('i-search')}
          <input type="search" class="mov-hoja__buscar-campo" data-buscar-lista autocomplete="off"
                 placeholder="${rotulo}" aria-label="${rotulo}" value="${_esc(_busqueda)}" />
        </div>`;
}

const _pasa = (nombre) => !_busqueda || plano(nombre).includes(plano(_busqueda));

function _panelPeriodo(f, movs) {
  const hoyISO = hoy();
  const atajos = ATAJOS_PERIODO.map(([clave, nombre]) => {
    const activo = f.periodo?.atajo === clave;
    const n = conteoPeriodo(movs, f, clave, hoyISO);
    return `<button type="button" class="mov-atajo" data-action="movimientos-hoja-periodo" data-atajo="${clave}" aria-pressed="${activo}"
              aria-label="${nombre}, ${_cuantos(n)}">${activo ? _icono('i-check') : ''}${nombre}</button>`;
  }).join('');
  return `
      <div class="mov-hoja__atajos">${atajos}</div>
      <p class="mov-hoja__nota">O elige las fechas</p>
      <div class="mov-hoja__fechas">
        <label class="mov-fecha"><span>Desde</span><input type="date" class="input" data-fecha="desde" value="${_esc(f.periodo?.desde ?? '')}" /></label>
        <label class="mov-fecha"><span>Hasta</span><input type="date" class="input" data-fecha="hasta" value="${_esc(f.periodo?.hasta ?? '')}" /></label>
      </div>`;
}

function _panelTipos(f, movs) {
  return opcionesDe(movs, f, 'tipos').map(o => _casilla({
    nombre: o.nombre, id: `mov-tipo-${o.valor}`, valor: o.valor, dato: 'tipo', n: o.n,
    marcada: f.tipos.includes(o.valor),
    figura: tejaCategoria(o.extra.icono, o.extra.dom === 'neutro' ? '' : o.extra.dom),
  })).join('');
}

function _panelCategorias(f, movs) {
  const opciones = opcionesDe(movs, f, 'categorias');
  const filas = opciones.filter(o => _pasa(o.nombre) || (o.subs ?? []).some(s => _pasa(s.nombre))).map((o, i) => {
    const entera = f.categorias.includes(o.valor);
    const algunas = (o.subs ?? []).some(s => f.subcategorias.includes(s.valor));
    const cat = _casilla({
      nombre: o.nombre, id: `mov-cat-${i}`, valor: o.valor, dato: 'categoria', n: o.n,
      marcada: entera, parcial: !entera && algunas,
    });
    // Las subcategorías se abren con su categoría marcada o a medias (M06).
    const subs = (entera || algunas) ? (o.subs ?? []).map((s, j) => _casilla({
      nombre: s.nombre, id: `mov-cat-${i}-${j}`, valor: s.valor, dato: 'sub', n: s.n, sub: true,
      marcada: entera || f.subcategorias.includes(s.valor),
    })).join('') : '';
    return cat + subs;
  }).join('');
  return `${_buscadorLista('Buscar categoría', opciones.length)}<div class="mov-hoja__lista">${filas || '<p class="mov-hoja__nota">Ninguna categoría con ese nombre.</p>'}</div>`;
}

function _panelEstado(f, movs) {
  const opciones = opcionesDe(movs, f, 'estado');
  return `
      <div role="radiogroup" aria-label="Estado">
        ${_radio({ nombre: 'Cualquiera', name: 'mov-estado', valor: '', marcada: !f.estado, id: 'mov-estado-todos' })}
        ${opciones.map(o => _radio({ nombre: o.nombre, name: 'mov-estado', valor: o.valor, marcada: f.estado === o.valor, n: o.n, id: `mov-estado-${o.valor}` })).join('')}
      </div>
      <p class="mov-hoja__nota">Lo pendiente está en Por pagar.</p>`;
}

function _panelCuentas(f, movs) {
  const sentidos = [['cualquiera', 'Cualquiera'], ['salio', 'Salió de'], ['llego', 'Llegó a']];
  const seg = sentidos.map(([v, n]) => `
          <label class="mov-seg__op"><input type="radio" name="mov-sentido" value="${v}"${f.sentido === v ? ' checked' : ''} /><span>${n}</span></label>`).join('');
  const opciones = opcionesDe(movs, f, 'cuentas', { cuentas: S.cuentas ?? [] });
  const filas = opciones.filter(o => _pasa(o.nombre)).map((o, i) => _casilla({
    nombre: o.nombre, id: `mov-cuenta-${i}`, valor: o.valor, dato: 'cuenta', n: o.n,
    marcada: f.cuentas.includes(o.valor), detalle: o.extra?.tipo ?? '',
    figura: `<span class="mov-opcion__ini" aria-hidden="true">${_esc(_iniciales(o.nombre))}</span>`,
  })).join('');
  return `
      <div class="mov-seg" role="radiogroup" aria-label="Dirección del dinero">${seg}
      </div>
      ${_buscadorLista('Buscar cuenta', opciones.length)}<div class="mov-hoja__lista">${filas}</div>`;
}

function _panelLista(f, movs, clave) {
  const opciones = opcionesDe(movs, f, clave);
  const esEmpresa = clave === 'empresas';
  const filas = opciones.filter(o => _pasa(o.nombre)).map((o, i) => {
    const marca = esEmpresa ? marcaPorId(o.extra?.marcaId) : null;
    const figura = marca
      ? `<span class="mov-opcion__logo" aria-hidden="true">${tejaMarca(marca)}</span>`
      : `<span class="mov-opcion__ini" aria-hidden="true">${_esc(_iniciales(o.nombre))}</span>`;
    const detalle = esEmpresa ? '' : (o.extra?.grupo === 'personales' ? 'Me deben' : 'Deudas');
    return _casilla({
      nombre: o.nombre, id: `mov-${clave}-${i}`, valor: o.valor, dato: esEmpresa ? 'empresa' : 'persona', n: o.n,
      marcada: f[clave].includes(o.valor), figura, detalle,
    });
  }).join('');
  const rotulo = esEmpresa ? 'Buscar empresa' : 'Buscar persona';
  const vacio = esEmpresa ? 'Ningún pago tiene empresa o entidad todavía.' : 'Ningún movimiento tiene persona todavía.';
  return `${_buscadorLista(rotulo, opciones.length)}<div class="mov-hoja__lista">${filas || `<p class="mov-hoja__nota">${opciones.length ? 'Nadie con ese nombre.' : vacio}</p>`}</div>`;
}

function _panelValor(f, movs) {
  const atajos = ATAJOS_VALOR.map(a => {
    const activo = f.valor?.atajo === a.clave;
    const n = conteoValor(movs, f, a.clave);
    return `<button type="button" class="mov-atajo mov-atajo--ancho" data-action="movimientos-hoja-valor" data-atajo="${a.clave}" aria-pressed="${activo}"
              aria-label="${a.nombre}, ${_cuantos(n)}">${activo ? _icono('i-check') : ''}${a.nombre}</button>`;
  }).join('');
  const v = (n) => (n == null ? '' : miles(n));
  return `
      <div class="mov-hoja__atajos mov-hoja__atajos--una">${atajos}</div>
      <div class="mov-hoja__fechas">
        <label class="mov-fecha"><span>Desde</span><input type="text" class="input" inputmode="numeric" data-miles data-valor="min" value="${v(f.valor?.min)}" placeholder="$0" /></label>
        <label class="mov-fecha"><span>Hasta</span><input type="text" class="input" inputmode="numeric" data-miles data-valor="max" value="${v(f.valor?.max)}" placeholder="Sin tope" /></label>
      </div>
      <p class="mov-hoja__nota">El monto exacto se escribe en el buscador.</p>`;
}

function _panel(clave, f, movs) {
  switch (clave) {
    case 'periodo': return _panelPeriodo(f, movs);
    case 'tipos': return _panelTipos(f, movs);
    case 'categorias': return _panelCategorias(f, movs);
    case 'estado': return _panelEstado(f, movs);
    case 'cuentas': return _panelCuentas(f, movs);
    case 'empresas':
    case 'personas': return _panelLista(f, movs, clave);
    case 'valor': return _panelValor(f, movs);
    default: return '';
  }
}

/** Pinta el cuerpo, el encabezado y el pie de la hoja con los filtros de ahora. */
function _pintar() {
  const overlay = document.getElementById(_ID);
  if (!overlay) return;
  const f = filtrosMovimientos();
  const movs = movimientosPreparados();
  const ctx = contextoFiltros();
  const estadoOk = _estadoDisponible(f, movs);
  if (_abierto === 'estado' && !estadoOk) _abierto = null;

  const cuerpo = overlay.querySelector('#mov-hoja-cuerpo');
  cuerpo.innerHTML = _GRUPOS.map(g => `
    <p class="mov-hoja__grupo">${g.titulo}</p>
    ${g.criterios.map(([clave, nombre, icono]) => {
      const abierto = _abierto === clave;
      const puesto = criterioActivo(f, clave);
      const bloqueado = clave === 'estado' && !estadoOk;
      const valor = bloqueado ? 'Elige gastos fijos o deudas para usarlo' : (puesto ? textoCriterio(f, clave, ctx) : _TODOS[clave]);
      return `
    <div class="mov-criterio${abierto ? ' mov-criterio--abierto' : ''}" data-criterio="${clave}">
      <button type="button" class="mov-criterio__boton" id="mov-criterio-${clave}" data-action="movimientos-hoja-criterio" data-criterio="${clave}"
              aria-expanded="${abierto}" aria-controls="mov-panel-${clave}"${bloqueado ? ' aria-disabled="true"' : ''}>
        ${_icono(icono)}
        <span class="mov-criterio__nombre">${nombre}</span>
        <span class="mov-criterio__valor${puesto && !bloqueado ? ' mov-criterio__valor--puesto' : ''}">${_esc(valor)}</span>
        ${bloqueado ? '' : _icono(abierto ? 'i-chevron-up' : 'i-chevron-down')}
      </button>
      <div class="mov-criterio__panel" id="mov-panel-${clave}" role="group" aria-labelledby="mov-criterio-${clave}"${abierto ? '' : ' hidden'}>${abierto ? _panel(clave, f, movs) : ''}
      </div>
    </div>`;
    }).join('')}`).join('');

  // Las casillas a medias (S1, 9): solo algunas subcategorías marcadas.
  cuerpo.querySelectorAll('input[data-parcial]').forEach(c => { c.indeterminate = true; });

  const n = cuantosFiltros(f);
  overlay.querySelector('#mov-hoja-activos').textContent = n ? `${n} ${n === 1 ? 'activo' : 'activos'}` : '';
  _pintarPie(f, movs);
}

/** El pie cuenta en vivo: "Ver 24 movimientos"; con 0, "Sin movimientos" y apagado. */
function _pintarPie(f, movs) {
  const ver = document.getElementById('mov-hoja-ver');
  if (!ver) return;
  const total = aplicarFiltros(movs, f).length;
  ver.textContent = total === 0 ? 'Sin movimientos' : `Ver ${_cuantos(total)}`;
  ver.disabled = total === 0;
}

// ── ABRIR, CERRAR ────────────────────────────────────────────────

/**
 * Abre la hoja, con un criterio abierto si se pidió (tocar un chip o "+N"
 * la abre en su criterio, con el foco ahí: M08).
 * @param {string|null} [criterio]
 */
export function abrirHojaFiltros(criterio = null) {
  const overlay = document.getElementById(_ID);
  if (!overlay) return;
  _abierto = criterio === 'compromiso' ? null : criterio;
  _busqueda = '';
  _pintar();
  abrirModal(overlay);
  if (_abierto) _enfocarCriterio(_abierto);
}

/**
 * Lleva el criterio abierto al borde de arriba del cuerpo y le pasa el foco
 * (R46).
 */
function _enfocarCriterio(clave) {
  const boton = document.getElementById(`mov-criterio-${clave}`);
  const cuerpo = document.getElementById('mov-hoja-cuerpo');
  if (!boton || !cuerpo) return;
  requestAnimationFrame(() => {
    cuerpo.scrollTop = Math.max(0, boton.closest('.mov-criterio').offsetTop - cuerpo.offsetTop - 8);
    boton.focus({ preventScroll: true });
  });
}

/** ¿Está abierta la hoja? */
export function hojaFiltrosAbierta() {
  return document.getElementById(_ID)?.hasAttribute('data-open') === true;
}

// ── CAMBIOS (aplican en vivo) ────────────────────────────────────

/** Cambia los filtros, repinta la hoja y avisa (la barra y la lista detrás). */
function _cambiar(nuevos, foco = null) {
  ponerFiltrosMovimientos(nuevos);
  _pintar();
  if (foco) document.getElementById(foco)?.focus({ preventScroll: true });
  _alCambiar();
}

function _alternarCriterio(el) {
  const clave = el?.dataset?.criterio;
  if (!clave || el.getAttribute('aria-disabled') === 'true') return;
  _abierto = _abierto === clave ? null : clave;
  _busqueda = '';
  _pintar();
  document.getElementById(`mov-criterio-${clave}`)?.focus({ preventScroll: true });
  if (_abierto) _enfocarCriterio(clave);
}

function _elegirAtajoPeriodo(el) {
  const f = filtrosMovimientos();
  const atajo = el?.dataset?.atajo;
  if (f.periodo?.atajo === atajo) {
    _cambiar({ ...f, periodo: null }, el?.id);
    return;
  }
  const r = rangoDeAtajo(atajo, hoy());
  if (r) _cambiar({ ...f, periodo: { atajo, ...r } });
  document.querySelector(`#${_ID} [data-atajo="${atajo}"]`)?.focus({ preventScroll: true });
}

function _elegirAtajoValor(el) {
  const f = filtrosMovimientos();
  const atajo = el?.dataset?.atajo;
  const a = ATAJOS_VALOR.find(x => x.clave === atajo);
  if (!a) return;
  _cambiar({ ...f, valor: f.valor?.atajo === atajo ? null : { min: a.min, max: a.max, atajo } });
  document.querySelector(`#${_ID} [data-atajo="${atajo}"]`)?.focus({ preventScroll: true });
}

/**
 * Marcar una categoría la elige entera (todas sus subcategorías); marcar
 * una subcategoría de una categoría entera la deja a medias (S1, 9).
 */
function _alternarCategoria(f, cat) {
  const subs = movimientosPreparados().length
    ? (opcionesDe(movimientosPreparados(), f, 'categorias').find(o => o.valor === cat)?.subs ?? []).map(s => s.valor)
    : [];
  if (f.categorias.includes(cat)) {
    return { ...f, categorias: f.categorias.filter(c => c !== cat), subcategorias: f.subcategorias.filter(s => !subs.includes(s)) };
  }
  return { ...f, categorias: [...f.categorias, cat], subcategorias: f.subcategorias.filter(s => !subs.includes(s)) };
}

function _alternarSub(f, sub, cat) {
  const subs = (opcionesDe(movimientosPreparados(), f, 'categorias').find(o => o.valor === cat)?.subs ?? []).map(s => s.valor);
  if (f.categorias.includes(cat)) {
    // Entera: queda a medias, con todas menos esta.
    return { ...f, categorias: f.categorias.filter(c => c !== cat), subcategorias: [...f.subcategorias, ...subs.filter(s => s !== sub)] };
  }
  const nuevas = alternar(f.subcategorias, sub);
  // Todas marcadas: vuelve a ser la categoría entera.
  if (subs.length && subs.every(s => nuevas.includes(s))) {
    return { ...f, categorias: [...f.categorias, cat], subcategorias: nuevas.filter(s => !subs.includes(s)) };
  }
  return { ...f, subcategorias: nuevas };
}

let _esperaValor = null;
let _esperaBuscar = null;

/** Las casillas, los radios y los campos: `change` e `input` delegados. */
function _alCambiarControl(e) {
  const t = e.target;
  if (!t?.closest?.(`#${_ID}`)) return;
  const f = filtrosMovimientos();
  const foco = t.id || null;
  if (e.type === 'input') {
    if (t.matches('[data-buscar-lista]')) {
      _busqueda = t.value;
      clearTimeout(_esperaBuscar);
      _esperaBuscar = setTimeout(() => {
        const pos = t.selectionStart;
        _pintar();
        const campo = document.querySelector(`#${_ID} [data-buscar-lista]`);
        campo?.focus({ preventScroll: true });
        campo?.setSelectionRange?.(pos, pos);
      }, 120);
      return;
    }
    if (t.matches('[data-valor]')) {
      // Conteo en vivo con espera de 120 ms (S3), sin repintar el campo.
      clearTimeout(_esperaValor);
      _esperaValor = setTimeout(() => {
        const g = filtrosMovimientos();
        const min = desdeMiles(document.querySelector(`#${_ID} [data-valor="min"]`)?.value ?? '');
        const max = desdeMiles(document.querySelector(`#${_ID} [data-valor="max"]`)?.value ?? '');
        ponerFiltrosMovimientos({ ...g, valor: (min == null && max == null) ? null : { min: min ?? null, max: max ?? null, atajo: null } });
        _pintarPie(filtrosMovimientos(), movimientosPreparados());
        const boton = document.getElementById('mov-criterio-valor');
        const val = boton?.querySelector('.mov-criterio__valor');
        if (val) {
          const puesto = criterioActivo(filtrosMovimientos(), 'valor');
          val.textContent = puesto ? textoCriterio(filtrosMovimientos(), 'valor', contextoFiltros()) : _TODOS.valor;
          val.classList.toggle('mov-criterio__valor--puesto', puesto);
        }
        document.querySelectorAll(`#${_ID} [data-action="movimientos-hoja-valor"][aria-pressed="true"]`).forEach(b => {
          b.setAttribute('aria-pressed', 'false');
          b.querySelector('.icon')?.remove();
        });
        const n = cuantosFiltros(filtrosMovimientos());
        document.getElementById('mov-hoja-activos').textContent = n ? `${n} ${n === 1 ? 'activo' : 'activos'}` : '';
        _alCambiar();
      }, 120);
    }
    return;
  }
  if (t.matches('[data-tipo]')) return _cambiar({ ...f, tipos: alternar(f.tipos, t.dataset.tipo) }, foco);
  if (t.matches('[data-categoria]')) return _cambiar(_alternarCategoria(f, t.dataset.categoria), foco);
  if (t.matches('[data-sub]')) {
    const cat = opcionesDe(movimientosPreparados(), f, 'categorias').find(o => (o.subs ?? []).some(s => s.valor === t.dataset.sub))?.valor;
    return _cambiar(_alternarSub(f, t.dataset.sub, cat), foco);
  }
  if (t.matches('[data-cuenta]')) return _cambiar({ ...f, cuentas: alternar(f.cuentas, t.dataset.cuenta) }, foco);
  if (t.matches('[data-empresa]')) return _cambiar({ ...f, empresas: alternar(f.empresas, t.dataset.empresa) }, foco);
  if (t.matches('[data-persona]')) return _cambiar({ ...f, personas: alternar(f.personas, t.dataset.persona) }, foco);
  if (t.name === 'mov-estado') return _cambiar({ ...f, estado: t.value || null }, foco);
  if (t.name === 'mov-sentido') return _cambiar({ ...f, sentido: t.value }, null);
  if (t.matches('[data-fecha]')) {
    const desde = t.dataset.fecha === 'desde' ? t.value : (f.periodo?.desde ?? '');
    const hasta = t.dataset.fecha === 'hasta' ? t.value : (f.periodo?.hasta ?? '');
    return _cambiar({ ...f, periodo: desde || hasta ? { atajo: null, desde, hasta } : null }, null);
  }
  return undefined;
}

/** "Ver N movimientos": cierra y deja la lista arriba (S3). */
function _ver() {
  const overlay = document.getElementById(_ID);
  if (overlay) cerrarModal(overlay);
}

/** "Limpiar" del pie: todos fuera; la hoja sigue abierta. */
let _alLimpiar = () => {};
/** @param {(antes: object) => void} fn Quien ofrece Deshacer (index.js). */
export function alLimpiarHoja(fn) { _alLimpiar = fn; }

function _limpiar() {
  const antes = filtrosMovimientos();
  if (cuantosFiltros(antes) === 0) return;
  _cambiar(sinCriterios(antes));
  _alLimpiar(antes);
}

/** Repinta la hoja si está abierta (el Deshacer del aviso con la hoja abierta). */
export function repintarHojaFiltros() {
  if (hojaFiltrosAbierta()) _pintar();
}

/**
 * Cablea la hoja: los `data-action` los registra index.js con estas
 * funciones; los controles de formulario se oyen delegados.
 * @param {(nombre: string, fn: (el: HTMLElement) => void) => void} registrar
 * @param {() => void} alCerrar Al cerrarse la hoja, por cualquier camino.
 */
export function initHojaFiltros(registrar, alCerrar) {
  registrar('movimientos-hoja-criterio', _alternarCriterio);
  registrar('movimientos-hoja-periodo', _elegirAtajoPeriodo);
  registrar('movimientos-hoja-valor', _elegirAtajoValor);
  registrar('movimientos-hoja-limpiar', _limpiar);
  registrar('movimientos-hoja-ver', _ver);
  document.addEventListener('change', _alCambiarControl);
  document.addEventListener('input', _alCambiarControl);
  const overlay = document.getElementById(_ID);
  if (overlay && typeof MutationObserver === 'function') {
    let abierta = overlay.hasAttribute('data-open');
    new MutationObserver(() => {
      const ahora = overlay.hasAttribute('data-open');
      if (abierta && !ahora) alCerrar();
      abierta = ahora;
    }).observe(overlay, { attributes: true, attributeFilter: ['data-open'] });
  }
}

