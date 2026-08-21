/**
 * presupuesto/index.js - API pública del dominio de presupuesto.
 *
 * Responsabilidades:
 * - Registrar acciones data-action: nuevo-presupuesto, editar-presupuesto, eliminar-presupuesto.
 * - Coordinar logic.js + view.js.
 * - Inyectar el formulario en el modal según contexto (crear vs editar).
 * - Suscribirse a EventBus para re-render cuando cambian presupuestos O gastos
 *   (los gastos afectan el progreso visual de los envelopes).
 */

import { S, EventBus }                from '../../core/state.js';
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { registrarAccion }           from '../../ui/actions.js';
import { abrirModal, cerrarModal }   from '../../ui/modales.js';
import { renderSmart, registrarRender, programarRender } from '../../infra/render.js';
import { announce }                  from '../../infra/a11y.js';
import { mostrarErroresForm }        from '../../infra/form-errors.js';
import { confirmar }                 from '../../ui/confirm.js';
import { validarPresupuesto, normalizarPresupuesto } from './logic.js';
import { renderPanelPresupuesto, renderFormPresupuesto, renderPanelLimites } from './view.js';
import { renderBannerProposito } from '../../ui/proposito.js';
import { rangoMesBloque } from '../../infra/mes-bloque.js';

// ── HELPERS DE MODAL ─────────────────────────────────────────────

function _getOverlay() {
  return document.getElementById('modal-presupuesto');
}

function _setBody(html) {
  const body = document.getElementById('modal-presupuesto-body');
  if (body) body.innerHTML = html;
}

/** El modal es uno solo: su título dice qué estás haciendo (crear o editar). */
function _setTitulo(overlay, texto) {
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = texto;
}

function _wireForm() {
  const form = document.getElementById('form-presupuesto');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarPresupuesto(form);
  });

  // La pista y el monto propuesto siguen a la categoría elegida: cada chip trae
  // los dos ya calculados por la vista (LIM.1c).
  const chips = form.querySelector('.chips-cat');
  const hint  = document.getElementById('presupuesto-monto-hint');
  const monto = document.getElementById('presupuesto-monto');

  // El monto solo se reemplaza mientras lo haya escrito Finko (`data-sugerido`).
  // En cuanto el usuario teclea, el campo es suyo y cambiar de categoría ya no
  // le pisa el número: la sugerencia es una propuesta, no un valor impuesto.
  monto?.addEventListener('input', () => { delete monto.dataset.sugerido; });

  if (chips && hint) {
    chips.addEventListener('change', (e) => {
      const datos = e.target?.dataset ?? {};
      if (datos.hint) hint.textContent = datos.hint;
      if (!monto) return;
      if (monto.dataset.sugerido !== '1' && monto.value !== '') return;

      if (datos.sugerido) {
        monto.value = datos.sugerido;
        monto.dataset.sugerido = '1';
      } else {
        monto.value = '';
        delete monto.dataset.sugerido;
      }
    });
  }
}

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

/**
 * Abre el formulario de creación. Si la acción viene de una fila de "Gastas
 * acá y no tiene tope" o del aviso de sugerencia (LIM.1c), esa categoría llega
 * precargada (regla R35): el consejo y su puerta son el mismo control. El monto
 * propuesto lo calcula el formulario a partir de la categoría, no viaja en el
 * DOM.
 * @param {HTMLElement} [el]
 */
function _nuevoPresupuesto(el) {
  const overlay = _getOverlay();
  if (!overlay) return;
  _setBody(renderFormPresupuesto(null, el?.dataset.categoria ?? ''));
  _wireForm();
  _setTitulo(overlay, 'Nuevo límite de gasto');
  abrirModal(overlay);
}

/** @param {HTMLElement} el */
function _editarPresupuesto(el) {
  const id = el.dataset.id;
  if (!id) return;
  const actual = S.presupuestos.find(p => p.id === id);
  if (!actual) return;

  const overlay = _getOverlay();
  if (!overlay) return;
  _setBody(renderFormPresupuesto(actual));
  _wireForm();
  _setTitulo(overlay, `Editar límite de ${actual.categoria}`);
  abrirModal(overlay);
}

/** @param {HTMLFormElement} form */
function _guardarPresupuesto(form) {
  const datos    = Object.fromEntries(new FormData(form));
  const idActual = form.dataset.id || null;
  const errores  = validarPresupuesto(datos, S.presupuestos, idActual, S.categoriasPersonalizadas ?? []);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  if (idActual) {
    editar('presupuestos', idActual, { montoMensual: Number(datos.montoMensual) });
    announce('Límite de gasto actualizado.');
  } else {
    guardar('presupuestos', normalizarPresupuesto(datos));
    announce(`Límite de gasto creado para "${datos.categoria}".`);
  }

  const overlay = _getOverlay();
  if (overlay) cerrarModal(overlay);
  renderPanelPresupuesto();
}

/** @param {HTMLElement} el */
async function _eliminarPresupuesto(el) {
  const id = el.dataset.id;
  if (!id) return;
  const p = S.presupuestos.find(x => x.id === id);
  if (!p) return;

  const ok = await confirmar({
    titulo:         'Eliminar límite de gasto',
    mensaje:        `¿Eliminar el límite de gasto de "${p.categoria}"? Los gastos no se ven afectados.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('presupuestos', id);
  renderPanelPresupuesto();
  announce(`Límite de gasto de "${p.categoria}" eliminado.`);
}

/**
 * Render reactivo de los dos paneles del dominio (sección + dashboard), con
 * identidad estable para el coalescer de PERF.6: `gastos` se emite una vez por
 * gasto registrado, así que una acción que registra varios pintaba el panel de
 * límites tantas veces como gastos hubiera.
 */
function _renderReactivo() {
  renderBannerProposito('presupuesto', _tienePlanOTope());
  renderSmart(renderPanelPresupuesto, 'presupuesto');
  renderSmart(renderPanelLimites, 'dash');
}

// ── INIT ─────────────────────────────────────────────────────────

export function initPresupuesto() {
  registrarAccion('nuevo-presupuesto',    _nuevoPresupuesto);
  registrarAccion('editar-presupuesto',   _editarPresupuesto);
  registrarAccion('eliminar-presupuesto', _eliminarPresupuesto);

  // ADR 080 D4: las dos salidas de esta lente hacia el reparto del ingreso
  // abren el asistente en vez de navegar a la sección que lo contiene. El
  // evento es el que ya usan Calendario e Inicio (ADR 028 D4) y lo atiende
  // tesorería, que es su dueña: acá no hay import cruzado (ADN 10).
  registrarAccion('presupuesto-abrir-distribucion', () => EventBus.emit('distribuir:abrir'));

  // G5 (ficha 07, ADR 069 D8): de un tope a los movimientos que lo forman. La
  // categoría la trae el botón; el mes sale del reloj del bloque, así que se
  // abre el mismo mes que la lente estaba mostrando.
  registrarAccion('presupuesto-ver-movimientos', (el) => {
    const categoria = el?.dataset?.categoria;
    if (!categoria) return;
    EventBus.emit('movimientos:ver', { categoria, ...rangoMesBloque() });
  });

  // Los gastos afectan el progreso visual; re-render ante cualquier cambio
  // de gastos o de presupuestos. `ingresosPuntuales` entra en LIM.1a: la línea
  // de dinero extraordinario del mes se calcula sobre esa colección.
  EventBus.on('state:change', ({ section }) => {
    if (section === 'presupuestos' || section === 'gastos' || section === 'ingresos'
      || section === 'ingresosPuntuales') {
      programarRender(_renderReactivo);
    }
  });

  // El panel de alertas vive en el dashboard: se actualiza en cada renderAll().
  registrarRender(() => renderSmart(renderPanelLimites, 'dash'));

  // Igual que en "Por pagar": el reloj del bloque repinta con renderAll().
  registrarRender(() => renderSmart(_renderReactivo, 'presupuesto'));

  renderBannerProposito('presupuesto', _tienePlanOTope());
  renderSmart(renderPanelPresupuesto, 'presupuesto');
  renderPanelLimites();

  // El hash routing puede entrar tarde a esta sección; re-renderizamos al navegar.
  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1) || 'dash';
    renderBannerProposito('presupuesto', _tienePlanOTope());
    renderSmart(renderPanelPresupuesto, 'presupuesto');
    if (hash === 'dash') renderPanelLimites();
  });
}

/** true si ya hay ingresos registrados (plan del mes posible) o algún tope por categoría. */
function _tienePlanOTope() {
  return (S.ingresos ?? []).length > 0 || (S.presupuestos ?? []).length > 0;
}
