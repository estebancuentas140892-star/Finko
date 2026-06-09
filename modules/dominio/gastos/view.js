/**
 * gastos/view.js - generación de HTML para el dominio de gastos.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, esc as _esc } from '../../infra/utils.js';
import { CATEGORIAS_GASTO } from '../../core/constants.js';
import { gastosMes, filtrarGastos, gastosPendientes } from './logic.js';

// ── CONSTANTES ───────────────────────────────────────────────────

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

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

  const delMes = gastosMes(S.gastos, _viewYear, _viewMonth + 1); // gastosMes usa mes 1-indexed
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

  const delMes = gastosMes(S.gastos, _viewYear, _viewMonth + 1); // 1-indexed

  if (delMes.length === 0) {
    el.innerHTML = _renderEmptyState();
    return;
  }

  const filtrados = filtrarGastos(delMes, _filtroCategoria);

  el.innerHTML = filtrados.length === 0
    ? _renderEmptyFiltro()
    : filtrados.map(_renderGastoItem).join('');
}

/** @param {import('../../core/state.js').Gasto} gasto */
function _renderGastoItem(gasto) {
  // Un gasto sin descripcion (o con flag pendienteCompletar) es uno que se
  // registro con "Gasto rapido" y todavia no se completo. Muestra un placeholder
  // y un badge para que el usuario sepa que esta pendiente de describir.
  const sinCompletar = gasto.pendienteCompletar === true || !gasto.descripcion?.trim();
  const desc = sinCompletar
    ? '<span class="list-item__placeholder">Sin completar</span>'
    : _esc(gasto.descripcion);
  const cat  = _esc(gasto.categoria ?? 'Otros');
  const nota = gasto.nota ? ` · ${_esc(gasto.nota)}` : '';
  const badge = sinCompletar
    ? '<span class="badge badge--warn" title="Toca editar para completar este gasto">📝 Pendiente</span> '
    : '';

  return `
    <article class="list-item" data-id="${_esc(gasto.id)}">
      <div class="list-item__icon" aria-hidden="true">💸</div>
      <div class="list-item__body">
        <p class="list-item__title">${badge}${desc}</p>
        <p class="list-item__subtitle">${cat} · ${_esc(gasto.fecha)}${nota}</p>
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
      <p class="empty-state__icon" aria-hidden="true">💸</p>
      <p class="empty-state__title">Sin gastos este mes</p>
      <p class="empty-state__desc">Anota cada compra o pago que haces: supermercado, transporte, comida, servicios... Finko los agrupa por categoría para que veas a dónde va tu dinero.</p>
      <button class="btn btn-primary" data-action="nuevo-gasto">+ Registrar gasto</button>
      <p class="empty-state__tip">💡 Tip: desde el dashboard, el botón "Anotar un gasto" te permite apuntar el monto en segundos. La descripción la agregas después.</p>
    </div>`;
}

function _renderEmptyFiltro() {
  return `
    <div class="empty-state">
      <p class="empty-state__icon" aria-hidden="true">🔍</p>
      <p class="empty-state__title">Nada acá este mes</p>
      <p class="empty-state__desc">No registraste gastos en esta categoría todavía.</p>
      <button class="btn btn-ghost" data-action="gastos-filtrar-cat" data-cat="">Ver todos</button>
    </div>`;
}

// ── CARD DE PENDIENTES POR ORGANIZAR (dashboard) ─────────────────

/**
 * Renderiza en `#panel-gastos-pendientes` un recordatorio agregado de los
 * gastos registrados con "Gasto rápido" que aún no tienen descripción ni
 * categoría. Cuenta los pendientes de todos los meses (un gasto sin organizar
 * no debería perderse al cambiar de mes). Si no hay pendientes, deja el
 * contenedor vacío para no generar ruido visual. No-op si el contenedor no
 * existe (sección no montada).
 */
export function renderPendientesOrganizar() {
  const el = document.getElementById('panel-gastos-pendientes');
  if (!el) return;

  const n = gastosPendientes(S.gastos).length;
  if (n === 0) {
    el.innerHTML = '';
    return;
  }

  const titulo = n === 1
    ? 'Tienes 1 gasto por organizar'
    : `Tienes ${n} gastos por organizar`;

  el.innerHTML = `
    <div class="nudge nudge-info" role="status">
      <span class="nudge__icon" aria-hidden="true">📝</span>
      <div class="nudge__body">
        <p class="nudge__title">${_esc(titulo)}</p>
        <p class="nudge__desc">Los anotaste rápido, sin describirlos. Agrégales descripción y categoría para ver bien en qué se va tu dinero.</p>
      </div>
      <a class="nudge__cta btn btn-sm btn-primary" href="#gast">Organizar</a>
    </div>`;
}

// ── FORMULARIO DE GASTO RÁPIDO ───────────────────────────────────

/**
 * Devuelve el HTML que se inyecta en `#modal-gasto-rapido-body` en cada apertura.
 *
 * Tres estados según la cantidad de cuentas activas en S:
 *   - 0 cuentas: empty state guiado con CTA "Ir a Mis Cuentas".
 *   - 1 cuenta:  form con `<input type="hidden" name="cuentaId">` + hint de cuenta/saldo.
 *   - Varias:    form con `<select name="cuentaId">` para que el usuario elija.
 *
 * Se re-inyecta en cada apertura del modal para reflejar cambios en S.cuentas.
 *
 * @returns {string}
 */
export function renderFormGastoRapido() {
  const cuentas = (S.cuentas ?? []).filter(c => c.activa !== false);

  if (cuentas.length === 0) {
    return `
      <div class="form-empty">
        <p class="form-empty__icon" aria-hidden="true">🏦</p>
        <p class="form-empty__title">Primero necesitás una cuenta</p>
        <p class="form-empty__desc">Para registrar gastos, agregá al menos una cuenta o billetera en Mis Cuentas.</p>
        <a class="btn btn-primary btn-lg" href="#tesoreria" data-action="ir-a-seccion">🏦 Ir a Mis Cuentas</a>
      </div>`;
  }

  let cuentaHtml;
  if (cuentas.length === 1) {
    const c = cuentas[0];
    cuentaHtml = `
      <input type="hidden" name="cuentaId" value="${_esc(c.id)}" />
      <p class="quick-add__cuenta-hint" role="status">
        💳 Sale de: <strong>${_esc(c.nombre)}</strong> · Disponible: ${f(c.saldo ?? 0)}
      </p>`;
  } else {
    const opciones = cuentas
      .map(c => `<option value="${_esc(c.id)}">${_esc(c.nombre)} · ${f(c.saldo ?? 0)}</option>`)
      .join('');
    cuentaHtml = `
      <div class="form-group">
        <label for="gasto-rapido-cuenta" class="label">¿Desde qué cuenta?</label>
        <select id="gasto-rapido-cuenta" name="cuentaId" class="input" required aria-required="true">
          <option value="">Elegí una cuenta</option>
          ${opciones}
        </select>
      </div>`;
  }

  return `
    <p class="quick-add__hint">Apuntalo ahora. Lo completás después con calma.</p>
    <form id="form-gasto-rapido" novalidate>
      <div class="form-group">
        <label for="gasto-rapido-monto" class="label">¿Cuánto gastaste?</label>
        <input id="gasto-rapido-monto" name="monto"
               class="input input--big-amount"
               type="number" inputmode="numeric" pattern="[0-9]*"
               min="0" step="1000" placeholder="0"
               autocomplete="off" />
      </div>
      ${cuentaHtml}
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de nuevo gasto.
 *
 * Incluye un selector de cuenta obligatorio y un display reactivo
 * `#gasto-saldo-disponible` que muestra el saldo de la cuenta elegida
 * (lo actualiza el listener `change` en `gastos/index.js`).
 *
 * @returns {string}
 */
export function renderFormGasto() {
  const catOpts = CATEGORIAS_GASTO
    .map(c => `<option value="${_esc(c)}">${_esc(c)}</option>`)
    .join('');

  const cuentas = S.cuentas.filter(c => c.activa !== false);
  const cuentaOpts = cuentas
    .map(c => `<option value="${_esc(c.id)}">${_esc(c.nombre)}</option>`)
    .join('');

  // Si no hay cuentas activas, mostramos un estado vacío en lugar del form.
  // El gasto no puede existir sin cuenta de origen.
  if (cuentas.length === 0) {
    return `
      <div class="form-empty">
        <p class="form-empty__icon" aria-hidden="true">🏦</p>
        <p class="form-empty__title">Primero necesitas una cuenta</p>
        <p class="form-empty__desc">Para registrar un gasto, agrega al menos una cuenta o billetera en Mis cuentas. Así sabes de dónde sale el dinero.</p>
        <a class="btn btn-primary btn-lg" href="#tesoreria" data-action="ir-a-seccion">🏦 Ir a Mis cuentas</a>
      </div>`;
  }

  return `
    <form id="form-gasto" novalidate>
      <div class="form-group">
        <label for="gasto-descripcion" class="label">Descripción</label>
        <input id="gasto-descripcion" name="descripcion" class="input" type="text"
               placeholder="Ej. Almuerzo en restaurante" required aria-required="true" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="gasto-cuenta" class="label">De qué cuenta sale</label>
        <select id="gasto-cuenta" name="cuentaId" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${cuentaOpts}
        </select>
        <p id="gasto-saldo-disponible" class="form-hint form-hint--muted" aria-live="polite">
          Elige una cuenta para ver el saldo disponible.
        </p>
      </div>
      <div class="form-group">
        <label for="gasto-monto" class="label">Monto (COP)</label>
        <input id="gasto-monto" name="monto" class="input" type="number"
               min="1" step="1000" placeholder="0" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="gasto-categoria" class="label">Categoría</label>
        <select id="gasto-categoria" name="categoria" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${catOpts}
        </select>
      </div>
      <div class="form-group">
        <label for="gasto-fecha" class="label">Fecha</label>
        <input id="gasto-fecha" name="fecha" class="input" type="date"
               required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="gasto-nota" class="label">Nota (opcional)</label>
        <input id="gasto-nota" name="nota" class="input" type="text"
               placeholder="Detalle adicional" autocomplete="off" />
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar gasto</button>
      </div>
    </form>`;
}

