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

import { miles, desdeMiles } from '../../infra/miles.js';
import { S, EventBus }                from '../../core/state.js';
import { save }                       from '../../core/storage.js';
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { registrarAccion }           from '../../ui/actions.js';
import { abrirModal, cerrarModal }   from '../../ui/modales.js';
import { renderSmart, registrarRender, programarRender } from '../../infra/render.js';
import { announce }                  from '../../infra/a11y.js';
import { mostrarErroresForm }        from '../../infra/form-errors.js';
import { confirmar }                 from '../../ui/confirm.js';
import { validarPresupuesto, normalizarPresupuesto, validarHormiga } from './logic.js';
import { renderPanelPresupuesto, renderFormPresupuesto, renderFormHormiga, renderFormLimiteTelefono } from './view.js';
import { topeHormiga, aprendidosDe, conRespuesta } from '../../infra/hormiga.js';
import { f } from '../../infra/utils.js';
import { renderBannerProposito } from '../../ui/proposito.js';
import { rangoMesBloque, mesBloque } from '../../infra/mes-bloque.js';
import { htmlDetalleLimite, htmlDetalleHormiga } from './detalle.js';

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

  // LIM.2 (ADR 164): el modo se ofrece si la categoría tiene subcategorías;
  // por subcategoría se ve su grupo de montos (el único habilitado, así
  // FormData no trae los de otra) y se oculta el monto único.
  const sincronizarModo = () => {
    const cat = form.querySelector('input[name="categoria"]:checked, input[name="categoria"][type="hidden"]')?.value ?? '';
    const grupo = form.querySelector(`[data-limite-subs="${CSS.escape(cat)}"]`);
    const bloqueModo = form.querySelector('[data-limite-modo]');
    if (bloqueModo) bloqueModo.hidden = !grupo;
    const porSub = Boolean(grupo) && form.querySelector('input[name="modoLimite"][value="subcategorias"]')?.checked === true;
    for (const g of form.querySelectorAll('[data-limite-subs]')) {
      const ver = porSub && g === grupo;
      g.hidden = !ver;
      g.disabled = !ver;
    }
    const bloqueSubs = form.querySelector('[data-limite-subs-bloque]');
    if (bloqueSubs) bloqueSubs.hidden = !porSub;
    const bloqueMonto = form.querySelector('[data-limite-monto]');
    if (bloqueMonto) bloqueMonto.hidden = porSub;
    sumarSubs();
  };
  const sumarSubs = () => {
    const total = [...form.querySelectorAll('[data-limite-subs]:not([disabled]) input[data-miles]')]
      .reduce((a, i) => a + (desdeMiles(i.value) ?? 0), 0);
    const el = form.querySelector('[data-limite-total]');
    if (el) el.textContent = f(total);
  };
  form.addEventListener('change', (e) => {
    if (e.target.name === 'categoria' || e.target.name === 'modoLimite') sincronizarModo();
  });
  form.addEventListener('input', (e) => {
    if (e.target.name?.startsWith('limiteSub.')) sumarSubs();
  });
  sincronizarModo();

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
        monto.value = miles(datos.sugerido);
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
  // GAS.8g (ADR 182 D7): en el teléfono, la hoja de dos pasos.
  if (_enTelefono()) {
    // GAS.9e (ADR 183 D5): la sugerencia al registrar puede traer la parte.
    const sub = el?.dataset.sub ?? '';
    _hojaNueva = { categoria: el?.dataset.categoria ?? '', modo: sub ? 'parte' : 'categoria', sub, paso: 1 };
    _pintarHojaNueva();
    _setTitulo(overlay, 'Nuevo límite');
    abrirModal(overlay);
    return;
  }
  _setBody(renderFormPresupuesto(null, el?.dataset.categoria ?? ''));
  _wireForm();
  _setTitulo(overlay, 'Nuevo límite de gasto');
  abrirModal(overlay);
}

// ── NUEVO LÍMITE EN DOS PASOS (GAS.8g, ADR 182 D7) ───────────────

/** Bajo el corte de escritorio de la app (1024px). */
function _enTelefono() {
  return window.matchMedia?.('(max-width: 1023.98px)').matches === true;
}

/** Lo elegido en la hoja de dos pasos mientras está abierta. */
let _hojaNueva = { categoria: '', modo: 'categoria', sub: '', paso: 1 };

/** Repinta la hoja con lo elegido y le devuelve el foco a su primer control. */
function _pintarHojaNueva() {
  _setBody(renderFormLimiteTelefono(_hojaNueva));
  const form = document.getElementById('form-presupuesto');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarPresupuesto(form);
  });
}

/** Cambia lo elegido, repinta y pone el foco donde sigue la tarea. */
function _cambiarHojaNueva(cambio, foco) {
  _hojaNueva = { ..._hojaNueva, ...cambio };
  _pintarHojaNueva();
  const form = document.getElementById('form-presupuesto');
  const destino = (foco && form?.querySelector(foco)) || form?.querySelector('h3');
  if (destino && !destino.hasAttribute('tabindex') && destino.tagName === 'H3') destino.setAttribute('tabindex', '-1');
  destino?.focus?.();
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
  const validar  = (d) => validarPresupuesto(d, S.presupuestos, idActual, S.categoriasPersonalizadas ?? []);
  const errores  = validar(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores, undefined, () => validar(Object.fromEntries(new FormData(form))));
    return;
  }

  if (idActual) {
    // LIM.2: el monto y los máximos por subcategoría (null al volver al único).
    const { montoMensual, subcategorias } = normalizarPresupuesto(datos);
    editar('presupuestos', idActual, { montoMensual, subcategorias });
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

// ── GASTOS PEQUEÑOS (APR.1b, ADR 092) ────────────────────────────

/** Escribe `S.config.hormiga` completo y avisa: lo leen Límites, Aprende y Logros. */
function _guardarConfigHormiga(tope, limite) {
  // SUS.2c: se conserva lo aprendido por concepto (`conceptos`).
  S.config.hormiga = { ...(S.config.hormiga ?? {}), tope, limite: limite > 0 ? limite : null };
  save();
  EventBus.emit('state:change', { section: 'config' });
}

/**
 * Abre el formulario de deseos pequeños en el modal del dominio. Con
 * `limitePropuesto` llega lleno desde otra superficie.
 * @param {number} [limitePropuesto]
 */
function _editarHormiga(limitePropuesto) {
  const overlay = _getOverlay();
  if (!overlay) return;
  _setBody(renderFormHormiga(limitePropuesto));
  _setTitulo(overlay, 'Deseos pequeños');
  const form = document.getElementById('form-hormiga');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(form));
    const errores = validarHormiga(datos);
    if (errores.length > 0) {
      mostrarErroresForm(form, errores, undefined, () => validarHormiga(Object.fromEntries(new FormData(form))));
      return;
    }
    const limite = String(datos.limite ?? '').trim() === '' ? null : Number(datos.limite);
    _guardarConfigHormiga(Number(datos.tope), limite);
    cerrarModal(overlay);
    renderPanelPresupuesto();
    announce(limite ? `Límite de deseos pequeños: ${f(limite)} al mes.` : 'Deseos pequeños sin límite.');
  });
  abrirModal(overlay);
}

async function _quitarLimiteHormiga() {
  const ok = await confirmar({
    titulo:         'Quitar el límite de deseos pequeños',
    mensaje:        '¿Quitar el límite? Tus gastos no se ven afectados y puedes volver a ponerlo cuando quieras.',
    confirmarTexto: 'Quitar',
    peligroso:      true,
  });
  if (!ok) return;
  _guardarConfigHormiga(topeHormiga(S.config), null);
  renderPanelPresupuesto();
  announce('Límite de deseos pequeños quitado.');
}

/**
 * Render reactivo de la sección, con identidad estable para el coalescer de
 * PERF.6: `gastos` se emite una vez por gasto registrado, así que una acción
 * que registra varios pintaba la sección tantas veces como gastos hubiera.
 * INI.1 (ADR 149 D2): el panel de alertas de Inicio ya no existe; un límite
 * pasado lo dice "Novedades" (`ui/atencion-hoy.js`).
 */
function _renderReactivo() {
  renderBannerProposito('presupuesto', _tienePlanOTope());
  renderSmart(renderPanelPresupuesto, 'presupuesto');
}

// ── INIT ─────────────────────────────────────────────────────────

export function initPresupuesto() {
  registrarAccion('nuevo-presupuesto',    _nuevoPresupuesto);
  // GAS.8g (ADR 182 D7): los controles de la hoja de dos pasos.
  registrarAccion('limite-elegir-categoria', (el) =>
    _cambiarHojaNueva({ categoria: el?.dataset?.categoria ?? '', modo: 'categoria', sub: '', paso: 1 }, '.limite-pasos__cambiar'));
  registrarAccion('limite-cambiar-categoria', () =>
    _cambiarHojaNueva({ categoria: '', modo: 'categoria', sub: '', paso: 1 }, '.limite-pasos__cat'));
  registrarAccion('limite-modo', (el) =>
    _cambiarHojaNueva({ modo: el?.dataset?.modo === 'parte' ? 'parte' : 'categoria', sub: '' }, '.limite-pasos__modo--on'));
  registrarAccion('limite-parte', (el) =>
    _cambiarHojaNueva({ sub: el?.dataset?.sub ?? '' }, '.limite-pasos__parte--on'));
  registrarAccion('limite-paso', (el) => {
    const paso = Number(el?.dataset?.paso) === 2 ? 2 : 1;
    _cambiarHojaNueva({ paso }, paso === 2 ? '#presupuesto-monto' : '.limite-pasos__principal');
  });
  registrarAccion('editar-presupuesto',   _editarPresupuesto);
  registrarAccion('eliminar-presupuesto', _eliminarPresupuesto);
  registrarAccion('hormiga-editar',       () => _editarHormiga());
  registrarAccion('hormiga-quitar',       _quitarLimiteHormiga);

  // ADR 132 D8: en el teléfono cada tope es una fila que abre su hoja (la de
  // la fila, `#modal-detalle-fila`), armada con los datos del tope en el mes
  // del bloque. Al cruzar los 1024px la lente cambia de anatomía y se repinta.
  const abrirHoja = (html) => {
    const hoja = document.getElementById('modal-detalle-fila');
    const cuerpo = document.getElementById('detalle-fila-body');
    if (!hoja || !cuerpo) return;
    cuerpo.innerHTML = html;
    abrirModal(hoja);
  };
  const mesVisible = () => { const { anio, mes } = mesBloque(); return { anio, mes: mes + 1 }; };
  registrarAccion('limite-detalle', (el) => {
    const p = (S.presupuestos ?? []).find(x => x.id === el.dataset.id);
    if (p) abrirHoja(htmlDetalleLimite(p, mesVisible()));
  });
  registrarAccion('hormiga-detalle', () => abrirHoja(htmlDetalleHormiga(mesVisible())));
  // GAS.8f (ADR 182 D6): "Ahora no" descarta la sugerencia de esa categoría
  // en ese mes.
  registrarAccion('limites-sugerencia-descartar', (el) => {
    S.config.limiteSugerenciaDescartada = el?.dataset?.clave ?? '';
    save();
    renderSmart(renderPanelPresupuesto, 'presupuesto');
  });
  // SUS.2d (ADR 147 D1): cambiar u olvidar lo que el usuario contestó por
  // concepto. Repinta la lente y, si se tocó en la hoja, la hoja, con la
  // lista abierta para seguir revisando.
  registrarAccion('hormiga-concepto', (el) => {
    const { concepto, etiqueta, respuesta } = el.dataset;
    if (!concepto) return;
    const enHoja = el.closest('#detalle-fila-body');
    S.config.hormiga = { ...(S.config.hormiga ?? {}), conceptos: conRespuesta(aprendidosDe(S.config), concepto, respuesta || null) };
    save();
    EventBus.emit('state:change', { section: 'config' });
    renderSmart(renderPanelPresupuesto, 'presupuesto');
    if (enHoja) enHoja.innerHTML = htmlDetalleHormiga(mesVisible());
    const contenedor = enHoja ?? document;
    contenedor.querySelectorAll('.hormiga-aprendidos').forEach(d => { d.open = true; });
    contenedor.querySelector('.hormiga-aprendidos__resumen')?.focus();
    announce(respuesta === 'gusto' ? `${etiqueta}: un deseo.`
      : respuesta === 'necesidad' ? `${etiqueta}: una necesidad.`
        : `Finko olvidó lo que dijiste de ${etiqueta}.`);
  });
  window.matchMedia?.('(max-width: 1023.98px)').addEventListener?.('change', () => {
    renderSmart(renderPanelPresupuesto, 'presupuesto');
  });

  // El Aplícalo de la unidad 3 (APR.1b, ADR 092 D7) propone un límite con su
  // monto ya escrito en el botón (R50): lo pone acá, que es su dueño, sin que
  // Aprende importe este dominio (ADN 10). El usuario lo ajusta en la lente.
  EventBus.on('hormiga:limite', ({ monto } = {}) => {
    if (!(Number(monto) > 0)) return;
    _guardarConfigHormiga(topeHormiga(S.config), Number(monto));
    announce(`Límite de deseos pequeños: ${f(Number(monto))} al mes.`);
  });

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
      || section === 'ingresosPuntuales' || section === 'config') {
      programarRender(_renderReactivo);
    }
  });

  // Igual que en "Por pagar": el reloj del bloque repinta con renderAll().
  registrarRender(() => renderSmart(_renderReactivo, 'presupuesto'));

  renderBannerProposito('presupuesto', _tienePlanOTope());
  renderSmart(renderPanelPresupuesto, 'presupuesto');

  // El hash routing puede entrar tarde a esta sección; re-renderizamos al navegar.
  window.addEventListener('hashchange', () => {
    renderBannerProposito('presupuesto', _tienePlanOTope());
    renderSmart(renderPanelPresupuesto, 'presupuesto');
  });
}

/** true si ya hay ingresos registrados (plan del mes posible) o algún tope por categoría. */
function _tienePlanOTope() {
  return (S.ingresos ?? []).length > 0 || (S.presupuestos ?? []).length > 0;
}
