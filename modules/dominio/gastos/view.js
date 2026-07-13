/**
 * gastos/view.js - generación de HTML para el dominio de gastos.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, esc as _esc } from '../../infra/utils.js';
import { icon, emptyArt, tejaCategoria } from '../../infra/icons.js';
import { CATEGORIAS_GASTO_USUARIO, ICONOS_CATEGORIA_PERSONALIZADA, iconoDeCategoriaGasto } from '../../core/constants.js';
import { renderSelectorCuenta } from '../../infra/cuenta-helper.js';
import { renderIconoPicker } from '../../infra/icon-picker.js';
import { gastosMes, filtrarGastos, ordenarRecientesPrimero, totalGastos, iconoPorOrigen } from './logic.js';

// ── CONSTANTES ───────────────────────────────────────────────────

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Valor especial del `<select>` de categoría que revela los campos de "Otra categoría" (TX.9b). */
export const CATEGORIA_NUEVA_VALUE = '__nueva__';

/**
 * Categorías internas que el código asigna a pagos de deuda ('Deudas') y de
 * fijos del Calendario ('Gastos fijos'), no gasto cotidiano (TX.8b, ADR 028).
 * Gastos deja de listarlas para enfocarse en lo que el usuario sí decide
 * gastar día a día; siguen viviendo en `S.gastos` sin cambios, así que
 * Análisis y Límites (que leen todo el historial) no se ven afectados.
 */
const _CATEGORIAS_INTERNAS = new Set(['Deudas', 'Gastos fijos']);

/** @param {import('../../core/state.js').Gasto[]} gastos */
function _sinInternas(gastos) {
  return gastos.filter(g => !_CATEGORIAS_INTERNAS.has(g.categoria));
}

// ── ESTADO LOCAL DE VISTA ────────────────────────────────────────

/** Mes visualizado (0-indexed, igual que Date.getMonth()). `null` = mes actual. */
let _viewYear  = null;
let _viewMonth = null;

/** Categoría activa en el filtro de chips. `null` = "Todos". */
let _filtroCategoria = null;

/** Inicializa el mes al mes actual si aún no se ha establecido. */
function _ensureMes() {
  if (_viewYear === null || _viewMonth === null) {
    const hoyDate  = new Date();
    _viewYear  = hoyDate.getFullYear();
    _viewMonth = hoyDate.getMonth();
  }
}

/**
 * Mueve el mes visualizado en `delta` pasos (positivo = adelante, negativo = atrás).
 * Resetea el filtro de categoría al cambiar de mes (las categorías del nuevo mes
 * pueden ser distintas). El caller debe llamar renderFiltrosGastos + renderListaGastos.
 * @param {number} delta
 */
export function navegarMesGastos(delta) {
  _ensureMes();
  let m = _viewMonth + delta;
  let y = _viewYear;
  while (m < 0)  { m += 12; y -= 1; }
  while (m > 11) { m -= 12; y += 1; }
  _viewMonth        = m;
  _viewYear         = y;
  _filtroCategoria  = null; // reset al cambiar mes
}

/** Actualiza el filtro activo. Llamado desde index.js al hacer clic en un chip. */
export function setFiltroCategoria(cat) {
  _filtroCategoria = cat || null;
}

// ── BARRA DE FILTROS ─────────────────────────────────────────────

/**
 * Renderiza el selector de mes + chips de categoría en `#panel-filtros-gastos`.
 * El encabezado muestra "« Mes Año »" con botones de navegación.
 * Los chips filtran por categoría dentro del mes seleccionado.
 * Auto-resetea `_filtroCategoria` si la categoría activa ya no existe en el mes.
 */
export function renderFiltrosGastos() {
  const el = document.getElementById('panel-filtros-gastos');
  if (!el) return;

  _ensureMes();

  const delMes = _sinInternas(gastosMes(S.gastos, _viewYear, _viewMonth + 1)); // gastosMes usa mes 1-indexed
  const label  = `${MONTHS[_viewMonth]} ${_viewYear}`;

  // Chips: solo si hay gastos en el mes.
  let chipsHtml = '';
  if (delMes.length > 0) {
    const cats = [...new Set(delMes.map(g => g.categoria ?? 'Otros'))].sort();

    // Si la categoría activa desapareció, resetear a "Todos".
    if (_filtroCategoria !== null && !cats.includes(_filtroCategoria)) {
      _filtroCategoria = null;
    }

    const todosActivo = _filtroCategoria === null;
    const chips = cats.map(cat => {
      const activo = _filtroCategoria === cat;
      return `
        <button type="button"
                class="chip${activo ? ' chip--active' : ''}"
                data-action="gastos-filtrar-cat"
                data-cat="${_esc(cat)}"
                aria-pressed="${activo}"
                aria-label="Filtrar por ${_esc(cat)}">
          ${_esc(cat)}
        </button>`;
    }).join('');

    chipsHtml = `
      <div class="filtros-bar" role="group" aria-label="Filtrar gastos por categoría">
        <button type="button"
                class="chip${todosActivo ? ' chip--active' : ''}"
                data-action="gastos-filtrar-cat"
                data-cat=""
                aria-pressed="${todosActivo}"
                aria-label="Ver todos los gastos">
          Todos
        </button>
        ${chips}
      </div>`;
  } else {
    _filtroCategoria = null;
  }

  el.innerHTML = `
    <div class="mes-nav" role="group" aria-label="Seleccionar mes">
      <button type="button" class="mes-nav__btn"
              data-action="gastos-prev-mes"
              aria-label="Mes anterior">‹</button>
      <span class="mes-nav__label">${_esc(label)}</span>
      <button type="button" class="mes-nav__btn"
              data-action="gastos-next-mes"
              aria-label="Mes siguiente">›</button>
    </div>
    ${chipsHtml}`;
}

// ── LISTA DE GASTOS ──────────────────────────────────────────────

/**
 * Renderiza la lista de gastos en `#lista-gastos`, aplicando el mes
 * seleccionado (`_viewYear`/`_viewMonth`) y el filtro de categoría activo.
 * No-op si el contenedor no existe.
 */
export function renderListaGastos() {
  const el = document.getElementById('lista-gastos');
  if (!el) return;

  _ensureMes();

  const delMes = _sinInternas(gastosMes(S.gastos, _viewYear, _viewMonth + 1)); // 1-indexed

  if (delMes.length === 0) {
    el.innerHTML = _renderEmptyState();
    return;
  }

  const filtrados = filtrarGastos(delMes, _filtroCategoria);

  if (filtrados.length === 0) {
    el.innerHTML = _renderEmptyFiltro();
    return;
  }

  // Más recientes primero: el último gasto registrado queda al tope, visible
  // sin desplazarse. El total del resumen es independiente del orden.
  const ordenados = ordenarRecientesPrimero(filtrados);
  el.innerHTML = _renderResumen(ordenados) + ordenados.map(_renderGastoItem).join('');
}

/**
 * Barra de total al tope de la lista. Describe siempre lo que está visible:
 * sin filtro es el total del mes; con una categoría activa es el total de esa
 * categoría (el chip activo lo desambigua). Solo se renderiza cuando hay ítems.
 * @param {import('../../core/state.js').Gasto[]} gastos visibles
 */
function _renderResumen(gastos) {
  const n     = gastos.length;
  const conteo = n === 1 ? '1 gasto' : `${n} gastos`;
  const total = totalGastos(gastos);
  return `
    <div class="gastos-resumen" role="status"
         aria-label="${conteo}, total ${f(total)}">
      <span class="gastos-resumen__count">${conteo}</span>
      <span class="gastos-resumen__total">${f(total)}</span>
    </div>`;
}

/**
 * TX.9a: la categoría es el concepto principal del gasto (título del ítem),
 * no la descripción libre (el formulario ya no la pide).
 * @param {import('../../core/state.js').Gasto} gasto
 */
function _renderGastoItem(gasto) {
  const catKey = gasto.categoria ?? 'Otros';
  const cat    = _esc(catKey);
  // Descripción legacy (gastos de antes de TX.9a que ya la tenían) + nota:
  // ambas son detalle opcional, ahora en el subtítulo junto a la fecha.
  const descripcionLegacy = gasto.descripcion?.trim() ? ` · ${_esc(gasto.descripcion.trim())}` : '';
  const nota = gasto.nota ? ` · ${_esc(gasto.nota)}` : '';

  // TX.6/TX.7: un gasto nacido de un fijo o de un abono a deuda hereda el
  // ícono de su compromiso de origen (categoría de Agenda, o i-cuentas /
  // i-personales por tipo de deuda); solo sin origen aplica el de la
  // categoría del gasto (nativa o personalizada, TX.9b). ID.3: el glifo va
  // en la teja teñida del dominio.
  const simbolo = iconoPorOrigen(gasto, S.compromisos) ?? iconoDeCategoriaGasto(catKey, S.categoriasPersonalizadas);

  return `
    <article class="list-item" data-id="${_esc(gasto.id)}">
      <div class="list-item__icon" aria-hidden="true">${tejaCategoria(simbolo, 'gastos')}</div>
      <div class="list-item__body">
        <p class="list-item__title">${cat}</p>
        <p class="list-item__subtitle">${fechaLegible(gasto.fecha)}${descripcionLegacy}${nota}</p>
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount">${f(gasto.monto)}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="editar-gasto"
                data-id="${_esc(gasto.id)}"
                aria-label="Editar gasto"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-gasto"
                data-id="${_esc(gasto.id)}"
                aria-label="Eliminar gasto"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('gastos')}</div>
      <p class="empty-state__title">Sin gastos este mes</p>
      <p class="empty-state__desc">Anota tu primera compra o pago.</p>
      <button class="btn btn-primary" data-action="nuevo-gasto">+ Registrar gasto</button>
    </div>`;
}

function _renderEmptyFiltro() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('search')}</div>
      <p class="empty-state__title">Nada acá este mes</p>
      <p class="empty-state__desc">No registraste gastos en esta categoría todavía.</p>
      <button class="btn btn-ghost" data-action="gastos-filtrar-cat" data-cat="">Ver todos</button>
    </div>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de nuevo gasto.
 *
 * Selección de cuenta:
 *   - 0 cuentas: empty state guiado con CTA "Crear una cuenta".
 *   - Creación (`modoEdicion=false`): sin selector inline; la(s) cuenta(s) se
 *     se eligen al confirmar (reparto multi-cuenta).
 *
 * El formulario muestra el selector de cuenta (tarjetas con icono de entidad)
 * tanto en creación como en edición. En creación, si la cuenta elegida no
 * alcanza, el reparto entre varias se resuelve al confirmar (sin negativos);
 * en edición el registro sigue siendo de una sola cuenta. La pre-selección la
 * ajusta el caller (`_editarGasto`) en modo edición.
 *
 * @returns {string}
 */
export function renderFormGasto() {
  const catOpts = CATEGORIAS_GASTO_USUARIO
    .map(c => `<option value="${_esc(c)}">${_esc(c)}</option>`)
    .join('');

  // TX.9b: las categorías creadas por el usuario aparecen en su propio grupo,
  // seguidas de la opción para crear una nueva. Se comportan igual que una
  // nativa una vez elegidas (mismo <option>, mismo name="categoria").
  const personalizadas = S.categoriasPersonalizadas ?? [];
  const catPersonalizadasOpts = personalizadas.length > 0
    ? `<optgroup label="Tus categorías">
        ${personalizadas.map(c => `<option value="${_esc(c.nombre)}">${_esc(c.nombre)}</option>`).join('')}
      </optgroup>`
    : '';

  const cuentas = (S.cuentas ?? []).filter(c => c.activa !== false);

  // Si no hay cuentas activas, mostramos un estado vacío en lugar del form.
  // El gasto no puede existir sin cuenta de origen.
  if (cuentas.length === 0) {
    return `
      <div class="form-empty">
        <p class="form-empty__icon" aria-hidden="true">${icon('cuentas', 'icon icon--lg')}</p>
        <p class="form-empty__title">Primero necesitas una cuenta</p>
        <p class="form-empty__desc">Un gasto necesita una cuenta de donde salga el dinero. Créala aquí y sigues sin perder el hilo.</p>
        <a class="btn btn-primary btn-lg" href="#tesoreria" data-action="ir-a-crear-cuenta">${icon('cuentas')} Crear una cuenta</a>
      </div>`;
  }

  return `
    <form id="form-gasto" novalidate>
      <div class="form-group">
        <label for="gasto-categoria" class="label">Categoría</label>
        <select id="gasto-categoria" name="categoria" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${catOpts}
          ${catPersonalizadasOpts}
          <option value="${CATEGORIA_NUEVA_VALUE}">+ Otra categoría…</option>
        </select>
        <p id="hint-categoria-fija" class="form-hint form-hint--info" hidden></p>
      </div>
      <div class="form-group" id="categoria-nueva-fields" hidden>
        <label for="categoria-nueva-nombre" class="label">Nombre de tu categoría</label>
        <input id="categoria-nueva-nombre" name="categoriaNuevaNombre" class="input" type="text"
               placeholder="Ej. Gimnasio" autocomplete="off" />
        ${renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'categoria-nueva-icono', nombreCampo: 'categoriaNuevaIcono' })}
      </div>
      <div class="form-group">
        <label for="gasto-monto" class="label">Monto (COP)</label>
        <input id="gasto-monto" name="monto" class="input" type="number"
               min="1" step="1000" placeholder="0" required aria-required="true" />
      </div>
      ${renderSelectorCuenta(cuentas)}
      <div class="form-group">
        <label for="gasto-fecha" class="label">Fecha</label>
        <input id="gasto-fecha" name="fecha" class="input" type="date"
               required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="gasto-nota" class="label">Nota (opcional)</label>
        <input id="gasto-nota" name="nota" class="input" type="text"
               placeholder="Detalle adicional, ej. con quién fue" autocomplete="off" />
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar gasto</button>
      </div>
    </form>`;
}

