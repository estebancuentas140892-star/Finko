/**
 * movimientos/view.js - la vista completa del historial (TX.8b).
 *
 * Aquí vivía también el panel "Actividad reciente" de Inicio (TX.8a). El ADR 087
 * lo retiró de móvil extendiendo el ADR 070 D2, que ya lo había retirado de
 * escritorio: cuenta el pasado y comparte anatomía con la lista de
 * obligaciones, así que a primera vista se confundían y solo una de las dos
 * exige algo. La sección completa sigue a un toque desde "Más".
 *
 * MOV.4 ([ADR 200](../../../docs/DECISIONS/200-movimientos-buscar-y-filtrar.md)):
 * los resultados mandan y los controles quedan a un toque. Arriba, un
 * buscador que entiende criterios y un solo botón Filtros; debajo, los
 * filtros puestos en una fila que nunca pasa de una línea, y la lista. La
 * hoja de filtros vive en `hoja.js`; el modelo de filtros, en `filtros.js`.
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (toda en logic.js y
 * filtros.js).
 */

import { S } from '../../core/state.js';
import { f, esc as _esc, formateadorFecha, hoy } from '../../infra/utils.js';
import { tejaCategoria } from '../../infra/icons.js';
import { htmlTinoSol } from '../../infra/ilustraciones.js';
import { SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { memoizar } from '../../infra/memo.js';
import { movimientosCompletos, descripcionMovimiento, sumaDeMovimientos, esRetiro } from './logic.js';
import {
  prepararMovimientos, aplicarFiltros, filtrosVacios, chipsActivos, cuantosFiltros, resumen,
  grupoPorClave, plano, salidasSinResultados, fraseSinResultados, criterioActivo,
} from './filtros.js';
import { montosOcultos } from '../../infra/privacidad.js';
import { vigilarPlaceholder } from '../../ui/placeholder.js';

/**
 * PERF.2: la derivación concatena y ordena todas las fuentes. El caller pasa
 * un objeto envoltorio nuevo en cada llamada, así que `extraerClave` compara
 * los arrays de adentro. MOV.4: también las cuentas, porque la búsqueda mira
 * su nombre.
 */
const _extraerFuentes = (fuentes) => [
  fuentes?.gastos, fuentes?.ingresosPuntuales, fuentes?.aportes, fuentes?.transferencias,
  fuentes?.personales, fuentes?.categoriasPersonalizadas, fuentes?.compromisos, fuentes?.ajustesSaldo,
  fuentes?.metas, fuentes?.apartados, fuentes?.cuentas,
];
const _SECCIONES_MOVIMIENTOS = ['gastos', 'ingresosPuntuales', 'ahorro', 'transferencias', 'personales', 'categoriasPersonalizadas', 'compromisos', 'ajustesSaldo', 'metas', 'apartados', 'cuentas'];

const _movimientosMemo = memoizar(
  (fuentes) => prepararMovimientos(movimientosCompletos(fuentes), {
    compromisos: fuentes.compromisos, gastos: fuentes.gastos, cuentas: fuentes.cuentas,
  }),
  _SECCIONES_MOVIMIENTOS,
  _extraerFuentes,
);

/**
 * Cuántas entradas (ítems + divisores de mes) se agregan al DOM por lote en
 * la vista completa (PERF.1). Con años de historial, construir todos los
 * nodos de una sola vez es el cuello de botella más caro de la app (~4s con
 * 10 años de datos): en vez de eso, `renderMovimientosCompletos()` pinta solo
 * el primer lote y el resto se agrega bajo demanda vía `cargarMasMovimientos()`.
 */
const TAMANO_LOTE = 50;

// ── LOS FILTROS (MOV.4) ──────────────────────────────────────────

/**
 * Los filtros puestos. Viven en el estado de la vista, no en `S`: se
 * conservan al salir y volver en la misma sesión; una llegada desde otra
 * sección los reemplaza (ADR 200 D8).
 * @type {import('./filtros.js').FiltrosMov}
 */
let _f = filtrosVacios();

/** Los filtros puestos (una copia). */
export function filtrosMovimientos() {
  return { ..._f };
}

/** Pone los filtros (la hoja, los chips, el buscador, las llegadas). */
export function ponerFiltrosMovimientos(nuevos) {
  _f = { ...filtrosVacios(), ...nuevos };
}

/** Todos fuera, con el texto (el "Limpiar filtros" de antes y las pruebas). */
export function limpiarFiltrosMovimientos() {
  _f = filtrosVacios();
}

/** Lo que necesita `filtros.js` para nombrar los filtros. */
export function contextoFiltros() {
  return { hoyISO: hoy(), cuentas: S.cuentas ?? [], compromisos: S.compromisos ?? [] };
}

// ── VISTA COMPLETA (TX.8b, ruta propia #movimientos) ────────────

/** El historial completo derivado, preparado y memoizado, sin filtros. */
export function movimientosPreparados() {
  return _movimientosMemo({
    gastos:                   S.gastos,
    ingresosPuntuales:        S.ingresosPuntuales,
    aportes:                  S.ahorro?.aportes,
    transferencias:           S.transferencias,
    personales:               S.personales,
    categoriasPersonalizadas: S.categoriasPersonalizadas,
    compromisos:              S.compromisos,
    ajustesSaldo:             S.ajustesSaldo,
    metas:                    S.metas,
    apartados:                S.apartados,
    cuentas:                  S.cuentas,
  });
}

/**
 * PERF.7c: precalienta la derivación en idle, para que la primera apertura
 * de la vista completa (`#movimientos`) encuentre la caché tibia.
 */
export function precalentarMovimientos() {
  movimientosPreparados();
}

/**
 * Lo que la lista muestra ahora: el historial con los filtros puestos
 * (REV.3a: "Descargar el mes" baja exactamente eso).
 */
export function movimientosVisibles() {
  return aplicarFiltros(movimientosPreparados(), _f);
}

// ── LA BARRA: BUSCADOR, FILTROS Y LO PUESTO (ADR 200 D1, D2) ─────

/**
 * Pinta en `#movimientos-filtros` el buscador, el botón Filtros y la fila de
 * filtros activos. Sin ningún movimiento no se pinta nada: no hay qué buscar
 * (M11). El campo se conserva si ya existe, para no perder el foco ni el
 * cursor al repintar mientras se escribe.
 */
export function renderFiltrosMovimientos() {
  const el = document.getElementById('movimientos-filtros');
  if (!el) return;
  if (movimientosPreparados().length === 0) {
    el.innerHTML = '';
    return;
  }
  if (!el.querySelector('#movimientos-buscar')) {
    el.innerHTML = `
    <div class="mov-barra" role="search">
      <button type="button" class="mov-barra__volver" data-action="movimientos-salir-busqueda" aria-label="Cerrar la búsqueda" hidden>
        <svg class="icon" aria-hidden="true"><use href="#i-arrow-left"/></svg>
      </button>
      <div class="mov-buscar">
        <svg class="icon mov-buscar__lupa" aria-hidden="true"><use href="#i-search"/></svg>
        <input type="search" id="movimientos-buscar" class="mov-buscar__campo" autocomplete="off" enterkeyhint="search"
               placeholder="Netflix, Nequi, 45.000..."
               data-placeholder-largo="Netflix, Nequi, 45.000..." data-placeholder-corto="Buscar"
               aria-label="Buscar en tus movimientos" role="combobox" aria-autocomplete="list"
               aria-expanded="false" aria-controls="movimientos-sugerencias" />
        <button type="button" class="mov-buscar__borrar" data-action="movimientos-borrar-texto" aria-label="Borrar el texto" hidden>
          <svg class="icon" aria-hidden="true"><use href="#i-x"/></svg>
        </button>
      </div>
      <button type="button" class="mov-filtros-btn" data-action="movimientos-abrir-filtros" aria-haspopup="dialog" aria-controls="modal-filtros-movimientos">
        <svg class="icon" aria-hidden="true"><use href="#i-filtros"/></svg>
        <span class="mov-filtros-btn__n" aria-hidden="true"></span>
      </button>
    </div>
    <div class="mov-sugerencias" id="movimientos-sugerencias" hidden></div>
    <div class="mov-activos" id="movimientos-activos" role="group" aria-label="Filtros activos" hidden></div>`;
    // TEL.1c (ADR 199 D17): el texto de ayuda largo solo si cabe (S1: desde 360).
    vigilarPlaceholder(el.querySelector('#movimientos-buscar'));
  }
  const campo = el.querySelector('#movimientos-buscar');
  if (campo && campo.value !== _f.texto && document.activeElement !== campo) campo.value = _f.texto;
  el.querySelector('.mov-buscar__borrar').hidden = !(campo?.value);
  _pintarBotonFiltros(el.querySelector('.mov-filtros-btn'));
  _pintarActivos(el.querySelector('#movimientos-activos'));
}

/** El botón Filtros dice cuántos hay (S1, 2): solo los criterios, no el texto. */
function _pintarBotonFiltros(btn) {
  if (!btn) return;
  const n = cuantosFiltros(_f);
  btn.classList.toggle('mov-filtros-btn--activo', n > 0);
  btn.setAttribute('aria-label', n > 0 ? `Filtros, ${n} ${n === 1 ? 'activo' : 'activos'}` : 'Filtros');
  btn.querySelector('.mov-filtros-btn__n').textContent = n > 0 ? String(n) : '';
}

/**
 * La fila de filtros activos (S1, 6): una línea fija, los chips que caben
 * enteros, "+N" y "Limpiar". Nunca dos líneas ni se desliza (R9). Cuántos
 * caben se mide al pintar, con un lienzo (sin reflujo).
 */
function _pintarActivos(fila) {
  if (!fila) return;
  const chips = chipsActivos(_f, contextoFiltros());
  fila.hidden = chips.length === 0;
  if (chips.length === 0) { fila.innerHTML = ''; return; }
  fila.innerHTML = `${chips.map(c => `
      <span class="mov-chip" data-criterio="${c.clave}">
        <button type="button" class="mov-chip__cambiar" data-action="movimientos-abrir-criterio" data-criterio="${c.clave}"
                aria-label="${_esc(c.cambiar)}"><span class="mov-chip__texto">${_esc(c.texto)}</span></button>
        <button type="button" class="mov-chip__quitar" data-action="movimientos-quitar-filtro" data-criterio="${c.clave}"
                aria-label="${_esc(c.quitar)}"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>
      </span>`).join('')}
      <button type="button" class="mov-chip-mas" data-action="movimientos-abrir-criterio" hidden></button>
      <button type="button" class="mov-activos__limpiar" data-action="movimientos-limpiar-filtros">Limpiar</button>`;
  _acomodarChips(fila, chips);
}

let _lienzo = null;

/** Ancho de un texto con la letra de `el` (canvas: sin reflujo). */
function _anchoTexto(el, texto) {
  _lienzo ??= document.createElement('canvas').getContext?.('2d') ?? null;
  if (!_lienzo) return texto.length * 8;
  const cs = getComputedStyle(el);
  _lienzo.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return _lienzo.measureText(texto).width;
}

/**
 * Deja a la vista los chips que caben enteros y agrupa el resto en "+N",
 * que abre la hoja en el primer criterio oculto (S1, 6). Sin puntos
 * suspensivos (ADR 199 D2): un chip que no cabe entero, ni siquiera el
 * primero, va al "+N".
 */
function _acomodarChips(fila, chips) {
  const disponible = fila.clientWidth;
  if (!disponible) return;
  const els = [...fila.querySelectorAll('.mov-chip')];
  const mas = fila.querySelector('.mov-chip-mas');
  const limpiar = fila.querySelector('.mov-activos__limpiar');
  const muestra = els[0]?.querySelector('.mov-chip__texto');
  const GAP = 6;
  // Chip: 14 + texto + 4 de la etiqueta, 30 de la ×, 2 de borde.
  const anchoChip = (c) => 50 + _anchoTexto(muestra ?? fila, c.texto);
  const anchoMas = (n) => 26 + _anchoTexto(mas, `+${n}`);
  let usado = 8 + _anchoTexto(limpiar, 'Limpiar') + GAP;
  let visibles = 0;
  for (let i = 0; i < chips.length; i++) {
    const quedan = chips.length - i - 1;
    const necesita = anchoChip(chips[i]) + GAP + (quedan > 0 ? anchoMas(quedan) + GAP : 0);
    if (usado + necesita > disponible) break;
    usado += anchoChip(chips[i]) + GAP;
    visibles++;
  }
  els.forEach((el, i) => { el.hidden = i >= visibles; });
  const ocultos = chips.slice(visibles);
  mas.hidden = ocultos.length === 0;
  if (ocultos.length) {
    mas.textContent = `+${ocultos.length}`;
    mas.dataset.criterio = ocultos[0].clave;
    const nombres = ocultos.map(c => c.texto.toLocaleLowerCase('es')).join(' y ');
    const otros = visibles > 0 ? 'otros ' : '';
    mas.setAttribute('aria-label', ocultos.length === 1 ? `Ver ${visibles > 0 ? 'el otro filtro' : 'el filtro'}: ${nombres}` : `Ver los ${otros}${ocultos.length} filtros: ${nombres}`);
  }
}

/** Vuelve a acomodar los chips (cambió el ancho: giro, letra del sistema). */
export function reacomodarChipsMovimientos() {
  const fila = document.getElementById('movimientos-activos');
  if (fila && !fila.hidden) _acomodarChips(fila, chipsActivos(_f, contextoFiltros()));
}

// ── LA FILA (v2, ADR 200 D4) ─────────────────────────────────────

/**
 * Nombre de la cuenta para la fila, o `null` si el movimiento no tiene
 * cuenta asociada (aportes) o la cuenta ya no existe.
 * @param {string|null} cuentaId
 * @returns {string|null}
 */
function _nombreCuenta(cuentaId) {
  if (!cuentaId) return null;
  return S.cuentas?.find(c => c.id === cuentaId)?.nombre ?? null;
}

/** "-$187.600" o "+$300.000": el neto de un grupo, con el signo de las filas; con el ojo puesto, tapado. */
function _neto(movs) {
  const { neto } = sumaDeMovimientos(movs);
  if (montosOcultos('movimientos')) return SALDO_MASCARA_CUENTA;
  return `${neto < 0 ? '-' : neto > 0 ? '+' : ''}${f(Math.abs(neto))}`;
}

/**
 * El título de la fila. El pago de un fijo o de una deuda se nombra por el
 * fijo o la deuda, con su nombre vigente ("Microsoft 365", no "Pago:
 * Microsoft 365"): la segunda línea ya dice que es un gasto fijo (S1, 7).
 */
function _tituloMovimiento(m) {
  if (m.tipo === 'gasto' && m.compromisoId && (m.grupo === 'fijos' || m.grupo === 'deudas')) {
    const nombre = String(S.compromisos?.find(c => c.id === m.compromisoId)?.descripcion ?? '').trim();
    if (nombre) return nombre;
  }
  return descripcionMovimiento(m, S.cuentas);
}

/**
 * La segunda línea de la fila: qué es, en palabras (S1, 7). El tipo se dice
 * en palabras para que el color nunca vaya solo.
 * @param {object} m Movimiento preparado.
 * @param {string} titulo
 */
function _linea2(m, titulo) {
  const plata = (n) => (montosOcultos('movimientos') ? SALDO_MASCARA_CUENTA : f(n));
  const partes = [];
  if (m.agrupado) partes.push('Antes de este historial');
  switch (m.grupo) {
    case 'gastos':
      partes.push(m.categoria && m.categoria !== titulo ? m.categoria : 'Gasto del día a día');
      break;
    case 'fijos':
      partes.push('Gasto fijo');
      if (m.categoriaFiltro && m.categoriaFiltro !== titulo) partes.push(m.categoriaFiltro);
      break;
    case 'deudas':
      partes.push(m.tipo === 'recibido' ? 'Deuda recibida' : m.tipo === 'avance' ? 'Avance de tarjeta' : 'Pago de deuda');
      break;
    case 'ingresos':
      partes.push('Ingreso');
      if (m.categoriaIngreso && m.categoriaIngreso !== titulo) partes.push(m.categoriaIngreso);
      break;
    case 'transferencias':
      partes.push(esRetiro(m, S.cuentas) ? 'Retiro' : 'Transferencia');
      if (m.comision > 0) partes.push(`cajero ${plata(m.comision)}`);
      break;
    case 'ahorro':
      partes.push(m.tipo === 'aporte-meta' ? 'Aporte a meta' : m.tipo === 'aporte-reserva' ? 'Aporte a reserva' : 'Aporte al fondo');
      break;
    case 'personales':
      partes.push(m.tipo === 'prestamo' ? 'Préstamo' : 'Me deben');
      break;
    case 'ajustes':
      partes.push('Ajuste de saldo');
      break;
    default: break;
  }
  if (m.costoGMF > 0) partes.push(`4x1000 ${plata(m.costoGMF)}`);
  return partes.join(' · ');
}

/**
 * El título con lo buscado resaltado (S1, 7). "Café" y "cafe" coinciden: se
 * busca sobre el texto plano, que mide lo mismo que el original.
 */
function _resaltar(titulo) {
  const q = plano(_f.texto.trim());
  const i = q ? plano(titulo).indexOf(q) : -1;
  if (i < 0 || plano(titulo).length !== titulo.length) return _esc(titulo);
  return `${_esc(titulo.slice(0, i))}<mark class="mov-coincide">${_esc(titulo.slice(i, i + q.length))}</mark>${_esc(titulo.slice(i + q.length))}`;
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
 * nada y hereda gratis sus reversas.
 *
 * MOV.3 (ADR 154 D1): en gasto, ingreso y transferencia el botón de quitar es
 * "Deshacer movimiento" (`deshacer-movimiento`, `infra/deshacer.js`).
 */
const _DESHACER = 'deshacer-movimiento';
const _ACCIONES_POR_TIPO = {
  gasto:         { editar: 'editar-gasto', eliminar: _DESHACER, nombre: 'gasto' },
  ingreso:       { eliminar: _DESHACER,                         nombre: 'ingreso' },
  aporte:        { eliminar: 'ahorro-eliminar-aporte',          nombre: 'aporte al fondo' },
  transferencia: { eliminar: _DESHACER,                         nombre: 'transferencia' },
  // AVC.1a (ADR 169 D6): el avance se deshace, no se edita.
  avance:        { eliminar: _DESHACER,                         nombre: 'avance' },
};

/**
 * Botonera de la fila. Devuelve '' cuando el tipo no ofrece ninguna acción,
 * para no dejar un contenedor vacío ocupando espacio.
 */
function _renderAccionesMovimiento(m, desc) {
  const acciones = _ACCIONES_POR_TIPO[m.tipo];
  if (!acciones) return '';
  const idEsc = _esc(m.id);
  const btnEditar = acciones.editar
    ? `<button class="btn btn-ghost btn-icon" data-action="${acciones.editar}" data-id="${idEsc}"
               aria-label="Editar ${acciones.nombre}: ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>`
    : '';
  const quitar = acciones.eliminar === _DESHACER
    ? { texto: `Deshacer movimiento: ${desc}`, titulo: ' title="Deshacer movimiento"' }
    : { texto: `Eliminar ${acciones.nombre}: ${desc}`, titulo: '' };
  const btnEliminar = acciones.eliminar
    ? `<button class="btn btn-ghost btn-icon" data-action="${acciones.eliminar}" data-id="${idEsc}"${quitar.titulo}
               aria-label="${quitar.texto}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>`
    : '';
  return `<div class="list-item__action">${btnEditar}${btnEliminar}</div>`;
}

/**
 * La fila v2 (S1, 7): a la izquierda qué (teja por tipo, nombre, "Tipo ·
 * Categoría"); a la derecha cuánto y dónde (el monto, y debajo la cuenta).
 * La fecha la dice el encabezado del día (ADR 134 D6).
 */
function _renderMovimientoItem(m) {
  const esIngreso  = m.direccion === 'ingreso';
  const signo      = esIngreso ? '+' : (m.direccion === 'neutro' ? '' : '-');
  const claseMonto = esIngreso ? 'list-item__amount--ingreso' : '';
  // ADR 106 D3: el ojo del encabezado también enmascara el historial (R20).
  const monto      = montosOcultos('movimientos') ? SALDO_MASCARA_CUENTA : f(m.monto);
  const titulo     = _tituloMovimiento(m);
  const desc       = _esc(titulo);
  // La transferencia no lleva cuenta: su nombre ya dice de dónde a dónde.
  const cuenta     = m.tipo === 'transferencia' ? null : _nombreCuenta(m.cuentaId);
  const grupo      = grupoPorClave(m.grupo);
  // El gasto fijo usa el color de Por pagar (dom-agenda); ahorro y metas, el suyo.
  const dom        = m.grupo === 'ahorro' ? m.dominio : (grupo?.dom ?? m.dominio);

  // ADR 098 D4: con acciones, en móvil la fila abre la hoja de detalle
  // (ui/detalle-fila.js) y los botones salen de la fila. En escritorio no.
  const conAcciones = Boolean(_ACCIONES_POR_TIPO[m.tipo]);
  // ADR 134 D6: un gasto abre la hoja del gasto; el resto, la de la fila.
  const accionHoja  = m.tipo === 'gasto' ? 'gasto-detalle' : 'fila-detalle';
  const desde       = m.tipo === 'gasto' ? ' data-desde="movimientos"' : '';
  const detalle     = conAcciones
    ? `<button class="list-item__detalle" type="button" data-action="${accionHoja}" data-id="${_esc(m.id)}"${desde}
              aria-label="Ver detalle: ${desc}, ${signo}${monto}"></button>`
    : '';

  return `
    <article class="list-item mov-fila${conAcciones ? ' list-item--detalle' : ''}" data-id="${_esc(m.id)}">
      ${detalle}
      <div class="list-item__icon" aria-hidden="true">${tejaCategoria(m.icono, dom === 'neutro' ? '' : dom)}</div>
      <div class="list-item__body">
        <p class="list-item__title">${_resaltar(titulo)}</p>
        <p class="list-item__subtitle">${_esc(_linea2(m, titulo))}</p>
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount ${claseMonto}">${signo}${monto}</p>
        ${cuenta ? `<p class="list-item__hint mov-fila__cuenta">${_esc(cuenta)}</p>` : ''}
      </div>
      ${_renderAccionesMovimiento(m, desc)}
    </article>`;
}

// ── VACÍOS (M10, M11) ────────────────────────────────────────────

/** M11: sin ningún movimiento no hay buscador ni Filtros. */
function _renderEmptyMovimientos() {
  return `
    <div class="empty-state mov-vacio">
      ${htmlTinoSol('con-lupa', { tamano: 112, clase: 'empty-state__tino' })}
      <p class="empty-state__title">Todavía no hay movimientos</p>
      <p class="empty-state__desc">Cada gasto, ingreso, pago o transferencia que registres en Finko aparece aquí, ordenado por fecha. Luego podrás buscarlo por nombre, cuenta, categoría o monto.</p>
      <button type="button" class="btn btn-primary" data-action="registrar-abrir-hoja" data-modal="modal-registrar">Registrar un movimiento</button>
      <p class="mov-vacio__nota">El buscador y los filtros aparecen con tu primer registro.</p>
    </div>`;
}

/**
 * M10: con datos y sin resultados siempre hay una salida (S3): quitar un
 * filtro con su conteo, o quitarlos todos. Con solo texto, la frase dice qué
 * no se encontró.
 */
function _renderEmptySinResultados() {
  const ctx = contextoFiltros();
  const n = cuantosFiltros(_f);
  const texto = _f.texto.trim();
  if (n === 0 && texto) {
    return `
    <section class="empty-state mov-sin" aria-labelledby="mov-sin-titulo">
      ${htmlTinoSol('con-lupa', { tamano: 96, clase: 'empty-state__tino' })}
      <h2 class="empty-state__title" id="mov-sin-titulo">No encontramos "${_esc(texto)}"</h2>
      <p class="empty-state__desc">Revisa cómo está escrito o busca por categoría, cuenta o monto.</p>
      <button type="button" class="btn btn-ghost" data-action="movimientos-borrar-texto">Borrar la búsqueda</button>
    </section>`;
  }
  const salidas = salidasSinResultados(movimientosPreparados(), _f, ctx);
  const filas = salidas.map(s => `
        <button type="button" class="mov-sin__salida" data-action="movimientos-quitar-filtro" data-criterio="${s.clave}">
          <span class="mov-sin__sin">Sin <b>${_esc(s.texto)}</b></span>
          <span class="mov-sin__n">${s.n.toLocaleString('es-CO')}</span>
          <svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg>
        </button>`).join('');
  const total = salidas.length;
  return `
    <section class="empty-state mov-sin" aria-labelledby="mov-sin-titulo">
      ${htmlTinoSol('con-lupa', { tamano: 96, clase: 'empty-state__tino' })}
      <h2 class="empty-state__title" id="mov-sin-titulo">Nada coincide con ${total === 1 ? 'este filtro' : `estos ${total} filtros`}</h2>
      <p class="empty-state__desc">${_esc(fraseSinResultados(_f, ctx))}</p>
    </section>
    ${total > 1 ? `<p class="mov-sin__titulo">Prueba quitando uno</p>
    <div class="mov-sin__salidas">${filas}
    </div>` : ''}
    <button type="button" class="btn btn-ghost mov-sin__todos" data-action="movimientos-limpiar-filtros">${total === 1 && !texto ? 'Quitar el filtro' : 'Quitar todos los filtros'}</button>`;
}

/**
 * El resumen (S1, 6): "5 movimientos · salieron $187.600", solo con búsqueda
 * o filtros. No es región viva (R24): lo anuncia la acción que lo cambió.
 */
function _resumenHtml(movs) {
  const dinero = (n) => (montosOcultos('movimientos') ? SALDO_MASCARA_CUENTA : f(n));
  const { cuantos, cuanto } = resumen(movs, dinero);
  return `<p class="movimientos-resumen"><b>${cuantos}</b>${cuanto ? ` · ${cuanto}` : ''}</p>`;
}

/** Lo que se anuncia al cambiar los filtros (R48). */
export function anuncioDeResultados() {
  const movs = movimientosVisibles();
  const { cuantos, cuanto } = resumen(movs, (n) => (montosOcultos('movimientos') ? 'monto oculto' : f(n)));
  return cuanto ? `${cuantos}, ${cuanto}` : cuantos;
}

// ── FILAS DE ESPERA (ADR 121 D3) ─────────────────────────────────

/**
 * Desde este tamaño de historial, armar la lista en un teléfono de gama media
 * pasa de 300 ms (PERF.1): la pantalla se quedaba en blanco mientras tanto.
 */
export const UMBRAL_FILAS_DE_ESPERA = 1500;

/** ¿El historial es de los que tardan en armarse? */
export function historialGrande() {
  const n = (S.gastos?.length ?? 0) + (S.ingresosPuntuales?.length ?? 0)
    + (S.ahorro?.aportes?.length ?? 0) + (S.transferencias?.length ?? 0);
  return n >= UMBRAL_FILAS_DE_ESPERA;
}

/**
 * Pinta filas fantasma del alto de las reales mientras se arma la lista, para
 * que nada salte al llegar los datos. `renderMovimientosCompletos()` las
 * reemplaza.
 */
export function pintarFilasDeEspera() {
  const el = document.getElementById('lista-movimientos');
  if (!el) return;
  el.setAttribute('aria-busy', 'true');
  el.innerHTML = Array.from({ length: 8 }, () => `
    <div class="list-item list-item--fantasma" aria-hidden="true">
      <span class="list-item--fantasma__teja"></span>
      <span class="list-item--fantasma__lineas"><span></span><span></span></span>
    </div>`).join('');
}

// ── PAGINACIÓN DE LA VISTA COMPLETA (PERF.1) ─────────────────────

/**
 * "Julio" o "Julio de 2025" a partir de una fecha ISO, para el divisor de
 * mes: el año solo si no es el actual (ADR 121 D1, como el ADR 102).
 */
function _mesAnioLabel(fechaISO) {
  const d = new Date(`${fechaISO}T12:00:00Z`);
  const otroAnio = fechaISO.slice(0, 4) !== String(new Date().getFullYear());
  const label = formateadorFecha('es-CO', otroAnio
    ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
    : { month: 'long', timeZone: 'UTC' }).format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Agrupa movimientos ya ordenados en bloques consecutivos por mes calendario. */
function _agruparPorMes(movs) {
  const grupos = [];
  let claveActual = null;
  for (const m of movs) {
    const clave = m.fecha.slice(0, 7); // YYYY-MM
    if (clave !== claveActual) {
      grupos.push({ label: _mesAnioLabel(m.fecha), clave, items: [] });
      claveActual = clave;
    }
    grupos[grupos.length - 1].items.push(m);
  }
  for (const g of grupos) g.total = _neto(g.items);
  return grupos;
}

/**
 * Aplana los grupos por mes en una secuencia lineal de "entradas" (divisor de
 * mes, encabezado de día o ítem), en el mismo orden en que se pintan.
 */
function _aplanarEntradas(grupos) {
  const entradas = [];
  for (const { label, clave, items, total } of grupos) {
    entradas.push({ tipo: 'divisor', label, clave, total });
    // ADR 134 D6: dentro del mes, cada día con su encabezado y su total.
    let diaActual = null;
    let delDia = [];
    const cerrarDia = () => {
      if (delDia.length === 0) return;
      entradas.push({ tipo: 'dia', label: _etiquetaDia(diaActual), total: _neto(delDia) });
      for (const mov of delDia) entradas.push({ tipo: 'item', mov });
      delDia = [];
    };
    for (const mov of items) {
      if (mov.fecha !== diaActual) { cerrarDia(); diaActual = mov.fecha; }
      delDia.push(mov);
    }
    cerrarDia();
  }
  return entradas;
}

/** "Hoy, viernes 13", "Ayer, jueves 12" o "Martes 10" (ADR 134 D6). */
function _etiquetaDia(fechaISO) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaISO ?? '')) return '';
  const d = new Date(`${fechaISO}T12:00:00Z`);
  const dow = formateadorFecha('es-CO', { weekday: 'long', timeZone: 'UTC' }).format(d);
  const dia = `${dow} ${d.getUTCDate()}`;
  const hoyISO = hoy();
  const ayer = new Date(`${hoyISO}T12:00:00Z`);
  ayer.setUTCDate(ayer.getUTCDate() - 1);
  if (fechaISO === hoyISO) return `Hoy, ${dia}`;
  if (fechaISO === ayer.toISOString().slice(0, 10)) return `Ayer, ${dia}`;
  return dia.charAt(0).toUpperCase() + dia.slice(1);
}

function _renderEntrada(entrada) {
  if (entrada.tipo === 'dia') {
    return `<div class="movimientos-dia" role="presentation"><span>${_esc(entrada.label)}</span>${entrada.total ? `<span class="movimientos-dia__total">${entrada.total}</span>` : ''}</div>`;
  }
  return entrada.tipo === 'divisor'
    ? `<div class="movimientos-mes"><span class="movimientos-mes__nombre">${_esc(entrada.label)}</span>${entrada.total ? `<span class="movimientos-mes__total">${entrada.total}</span>` : ''}${_botonDescargarMes(entrada)}</div>`
    : _renderMovimientoItem(entrada.mov);
}

/** REV.3a: descargar el mes para Excel, junto a su total. */
function _botonDescargarMes({ label, clave }) {
  if (!clave) return '';
  return `<button type="button" class="btn btn-ghost btn-icon btn-sm movimientos-mes__descargar" data-action="movimientos-descargar-mes" data-mes="${_esc(clave)}" aria-label="Descargar ${_esc(label)} para Excel" title="Descargar para Excel"><svg class="icon" aria-hidden="true"><use href="#i-download"></use></svg></button>`;
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

function _detenerCargaAutomatica() {
  _observerCargarMas?.disconnect();
  _observerCargarMas = null;
}

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
 * Pinta el siguiente lote al final de `el`. El lote se mide en `TAMANO_LOTE`
 * ítems reales, no en entradas totales.
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

/** Pinta el siguiente lote (botón "Cargar más" y su observer). */
export function cargarMasMovimientos() {
  const el = document.getElementById('lista-movimientos');
  if (!el || _cursorLote >= _entradasPendientes.length) return;
  _agregarSiguienteLote(el);
}

/**
 * Renderiza en `#lista-movimientos` el historial completo, agrupado por mes y
 * por día, con los filtros puestos. Solo el primer lote (PERF.1).
 */
export function renderMovimientosCompletos() {
  const el = document.getElementById('lista-movimientos');
  if (!el) return;
  el.removeAttribute('aria-busy');
  _detenerCargaAutomatica();

  const todos = movimientosPreparados();
  if (todos.length === 0) {
    el.innerHTML = _renderEmptyMovimientos();
    _entradasPendientes = [];
    _cursorLote = 0;
    return;
  }

  // MOV.2: filtrar sobre la fuente ya derivada, ANTES de agrupar/paginar.
  const movs = movimientosVisibles();
  const hayFiltro = cuantosFiltros(_f) > 0 || criterioActivo(_f, 'texto');

  if (movs.length === 0) {
    el.innerHTML = `${_resumenHtml(movs)}${_renderEmptySinResultados()}`;
    _entradasPendientes = [];
    _cursorLote = 0;
    return;
  }

  _entradasPendientes = _aplanarEntradas(_agruparPorMes(movs));
  _cursorLote = 0;
  el.innerHTML = hayFiltro ? _resumenHtml(movs) : '';
  _agregarSiguienteLote(el);
}
