/**
 * tesoreria/views/ingresos.js - listas y formularios de ingresos (recurrentes y
 * puntuales) y nudge de proximo cobro.
 *
 * Sub-modulo de tesoreria/view.js (barrel). Reglas de la capa:
 * - Puede leer S. No puede mutarlo.
 * - Devuelve strings HTML o escribe en el DOM (no ambas cosas en la misma funcion).
 * - Sin logica de negocio: delegar a logic/.
 */

import { S } from '../../../core/state.js';
import { f, esc as _esc, formateadorFecha } from '../../../infra/utils.js';
import { icon, tejaCategoria } from '../../../infra/icons.js';
import { renderSelectorCuenta } from '../../../infra/cuenta-helper.js';
import { SALDO_MASCARA_CUENTA } from '../../../infra/render.js';
import { FRECUENCIAS, CATEGORIAS_INGRESO, CATEGORIA_INGRESO_ICONO } from '../../../core/constants.js';
import { FRECUENCIAS_CON_DIA, calcularSalarioMinimo, detectarNudgeProximoIngreso } from '../logic/ingresos.js';

// ── INGRESOS RECURRENTES ─────────────────────────────────────────

/**
 * Renderiza la lista de ingresos activos en `#lista-ingresos`.
 * No-op si el contenedor no existe.
 *
 * MC.18d (ADR 035 D5): el ojo del hero enmascara también los montos de
 * ingreso, mismo flag `S.config.ocultarSaldo` que el total y los saldos
 * de cuenta.
 */
export function renderListaIngresos() {
  const el = document.getElementById('lista-ingresos');
  if (!el) return;

  const ingresos = _ingresosFijosActivos();
  const oculto = S.config?.ocultarSaldo === true;

  el.innerHTML = ingresos.length === 0
    ? _renderEmptyStateIngresos()
    : ingresos.map(i => _renderIngresoItem(i, oculto)).join('');
}

/** Ingresos fijos que la lista muestra (los dados de baja no cuentan). */
function _ingresosFijosActivos() {
  return Array.isArray(S.ingresos)
    ? S.ingresos.filter(i => i.activo !== false)
    : [];
}

/** Ingresos puntuales registrados. */
function _ingresosPuntuales() {
  return Array.isArray(S.ingresosPuntuales) ? S.ingresosPuntuales : [];
}

/**
 * Las dos listas de "Fuentes de ingreso" están vacías (MC-DIS.9 C5): el
 * encabezado único de MC.18d anuncia una sola cosa, así que el vacío también
 * es uno solo y lo emite la primera lista.
 */
function _sinNingunIngreso() {
  return _ingresosFijosActivos().length === 0 && _ingresosPuntuales().length === 0;
}

/**
 * MC-DIS.9 C5 (regla R18): MC.18d fusionó los dos sub-encabezados de ingresos
 * en "Fuentes de ingreso" pero dejó los dos estados vacíos, 164,2px cada uno,
 * diciendo dos veces que no hay nada con dos redacciones distintas. Con las dos
 * listas vacías se emite un solo mensaje que nombra las dos entradas; con una
 * de las dos con datos, cada lista se comporta como antes.
 */
function _renderEmptyStateIngresos() {
  const desc = _sinNingunIngreso()
    ? 'Aún no registras de dónde entra tu dinero. Agrega un ingreso fijo para tu salario o arriendo, o uno puntual para una venta o un trabajo suelto.'
    : 'Sin fuentes de ingreso registradas. Agrega tu salario u otras fuentes para ver tu tasa de ahorro.';
  return `
    <div class="empty-state empty-state--small">
      <p class="empty-state__desc">${desc}</p>
    </div>`;
}

/**
 * @param {import('../../../core/state.js').Ingreso} ing
 * @param {boolean} oculto - S.config.ocultarSaldo (MC.18d, ADR 035 D5).
 * @returns {string}
 */
function _renderIngresoItem(ing, oculto) {
  const desc = _esc(ing.descripcion);
  const frec = _esc(ing.frecuencia);
  // MC.15 (20): con "Salario mínimo" de categoría, es común que el usuario
  // escriba la misma frase en la descripción ("Salario mínimo" + "Quincenal
  // · Salario mínimo" se ve duplicado). Solo se omite cuando de verdad
  // coinciden (a diferencia de cuentas, aquí sí pueden divergir: la
  // descripción es texto libre real).
  const mismoTexto = (ing.descripcion ?? '').trim().toLowerCase() === (ing.categoria ?? '').trim().toLowerCase();
  const catLabel = (ing.categoria && !mismoTexto) ? ` · ${_esc(ing.categoria)}` : '';

  let diaHint = '';
  if (ing.diaPago) {
    const diaStr = ing.frecuencia === 'Quincenal'
      ? `días ${ing.diaPago} y ${ing.diaPago + 15} de cada mes`
      : `día ${ing.diaPago} de cada período`;
    // MC-DIS.9 C6: el 📅 pasa al símbolo i-agenda del sprite. MC.18b sacó los
    // emoji de la tarjeta de cuenta ("chips en vez de emoji") y dejó intacta
    // esta lista, tres bloques más abajo en la misma pantalla.
    diaHint = `<p class="list-item__hint list-item__hint--icono">${icon('agenda', 'icon icon--sm')}<span>${_esc(diaStr)}</span></p>`;
  }

  // ID.3: teja de categoría de ingreso como ícono de la fila (verde del
  // dominio ingresos); sin categoría, la moneda genérica i-saldo.
  const teja = tejaCategoria(CATEGORIA_INGRESO_ICONO[ing.categoria] ?? 'i-saldo', 'ingresos');

  return `
    <article class="list-item" data-id="${_esc(ing.id)}">
      <div class="list-item__icon" aria-hidden="true">${teja}</div>
      <div class="list-item__body">
        <p class="list-item__title">${desc}</p>
        <p class="list-item__subtitle">${frec}${catLabel}</p>
        ${diaHint}
      </div>
      <div class="list-item__meta">
        <p class="list-item__value">${oculto ? SALDO_MASCARA_CUENTA : f(ing.monto)}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="editar-ingreso"
                data-id="${_esc(ing.id)}"
                aria-label="Editar ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-ingreso"
                data-id="${_esc(ing.id)}"
                aria-label="Eliminar ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

/**
 * Bloque "¿en qué cuenta recibes este ingreso?" del formulario de ingreso fijo
 * (MC.13d, ADR 041 D5). Aplica el patrón 0/1/varias de la regla de cuenta única:
 *
 *   - 0 cuentas activas: nada. El campo es opcional y el ingreso puede existir
 *     antes que la cuenta; se elegirá al editarlo.
 *   - 1 cuenta activa: no se pregunta lo que tiene una sola respuesta posible.
 *     Se informa dónde caerá y el id viaja en un hidden (transparente, no
 *     silencioso).
 *   - 2+ cuentas: selector **sin preseleccionar**. Aquí no hay default honesto:
 *     a diferencia de un pago (donde la cuenta de mayor saldo es razonable),
 *     adivinar dónde le entra el sueldo al usuario guardaría un dato inventado
 *     que luego dirige mal el asistente. Dejarlo en blanco es válido.
 *
 * @param {import('../../../core/state.js').Ingreso|null} ingreso
 * @returns {string}
 */
function _renderGrupoCuentaIngreso(ingreso) {
  const activas = (S.cuentas ?? []).filter(c => c.activa !== false);
  if (activas.length === 0) return '';

  if (activas.length === 1) {
    const c = activas[0];
    return `
      <div class="form-group">
        <span class="label">¿Dónde recibes este dinero?</span>
        <p class="form-hint form-hint--muted">Lo recibes en <strong>${_esc(c.nombre)}</strong>, tu única cuenta activa.</p>
        <input type="hidden" name="cuentaId" value="${_esc(c.id)}" />
      </div>`;
  }

  return `
    ${renderSelectorCuenta(activas, {
      label:          '¿En qué cuenta recibes este ingreso?',
      selectedId:     ingreso?.cuentaId ?? null,
      preseleccionar: false,
    })}
    <p class="form-hint form-hint--muted">Opcional. Si lo indicas, al distribuir tu ingreso Finko parte de esa cuenta.</p>`;
}

/**
 * Devuelve el HTML del formulario de nuevo/editar ingreso.
 * @param {import('../../../core/state.js').Ingreso|null} [ingreso]
 * @returns {string}
 */
export function renderFormIngreso(ingreso = null) {
  const frecOpts = FRECUENCIAS
    .map(fr => `<option value="${_esc(fr)}"${ingreso?.frecuencia === fr ? ' selected' : ''}>${_esc(fr)}</option>`)
    .join('');

  const catOpts = CATEGORIAS_INGRESO
    .map(c => `<option value="${_esc(c)}"${ingreso?.categoria === c ? ' selected' : ''}>${_esc(c)}</option>`)
    .join('');

  const esSalarioMin = ingreso?.categoria === 'Salario mínimo';
  const { smmlv, auxilio } = calcularSalarioMinimo(true);

  return `
    <form id="form-ingreso" novalidate>
      <div class="form-group">
        <label for="ingreso-cat" class="label">Categoría</label>
        <select id="ingreso-cat" name="categoria" class="input">
          <option value="">Seleccionar…</option>
          ${catOpts}
        </select>
      </div>
      <div class="form-group">
        <label for="ingreso-desc" class="label">Descripción</label>
        <input id="ingreso-desc" name="descripcion" class="input" type="text"
               value="${ingreso ? _esc(ingreso.descripcion) : ''}"
               placeholder="Ej. Salario empresa, Arriendo apartamento"
               required aria-required="true" autocomplete="off" />
      </div>
      <div id="form-group-salario-min" class="form-group form-group--checkbox"${esSalarioMin ? '' : ' hidden'}>
        <label class="checkbox-row">
          <input type="checkbox" id="ingreso-subsidio" name="conSubsidio" />
          <span>Recibo subsidio de transporte</span>
        </label>
        <p class="form-hint form-hint--muted">
          SMMLV ${f(smmlv)} + auxilio ${f(auxilio)} = ${f(smmlv + auxilio)}.
          Si marcas esta opción, Finko ajusta el monto automáticamente.
        </p>
      </div>
      <div class="form-group">
        <label for="ingreso-monto" class="label">Monto (COP)</label>
        <input id="ingreso-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="0"
               value="${ingreso ? ingreso.monto : ''}"
               required aria-required="true" inputmode="numeric" />
      </div>
      <div class="form-group">
        <label for="ingreso-frec" class="label">Frecuencia</label>
        <select id="ingreso-frec" name="frecuencia" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${frecOpts}
        </select>
      </div>
      <div class="form-group" id="form-group-dia-pago"${ingreso && FRECUENCIAS_CON_DIA.includes(ingreso.frecuencia) ? '' : ' hidden'}>
        <label for="ingreso-dia-pago" class="label" id="label-dia-pago">${ingreso?.frecuencia === 'Quincenal' ? 'Día de la primera quincena (1-15)' : 'Día de pago (1-31)'}</label>
        <input id="ingreso-dia-pago" name="diaPago" class="input" type="number"
               min="1" max="${ingreso?.frecuencia === 'Quincenal' ? '15' : '31'}" step="1"
               placeholder="${ingreso?.frecuencia === 'Quincenal' ? 'Ej. 15' : 'Ej. 30'}"
               value="${ingreso?.diaPago ?? ''}"
               inputmode="numeric" />
        <p class="form-hint form-hint--muted">Opcional. ¿Qué día sueles recibir este pago?</p>
      </div>
      ${_renderGrupoCuentaIngreso(ingreso)}
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${ingreso ? 'Actualizar' : 'Guardar'}</button>
      </div>
    </form>`;
}

// ── INGRESOS PUNTUALES (NAV.A1) ──────────────────────────────────

/**
 * Renderiza la lista de ingresos puntuales en `#lista-ingresos-puntuales`,
 * más recientes primero. No-op si el contenedor no existe.
 *
 * MC.18d (ADR 035 D5): mismo enmascarado que `renderListaIngresos()`.
 */
export function renderListaIngresosPuntuales() {
  const el = document.getElementById('lista-ingresos-puntuales');
  if (!el) return;

  const lista = [..._ingresosPuntuales()];
  lista.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  const oculto = S.config?.ocultarSaldo === true;

  el.innerHTML = lista.length === 0
    ? _renderEmptyStateIngresosPuntuales()
    : lista.map(i => _renderIngresoPuntualItem(i, oculto)).join('');
}

/**
 * MC-DIS.9 C5: cuando las dos listas están vacías el mensaje único lo emite
 * `renderListaIngresos()` y esta no emite nada. Con ingresos fijos registrados
 * conserva su propio vacío, que ahí sí informa de algo que falta.
 */
function _renderEmptyStateIngresosPuntuales() {
  if (_sinNingunIngreso()) return '';
  return `
    <div class="empty-state empty-state--small">
      <p class="empty-state__desc">Sin ingresos puntuales registrados. Cuando recibas dinero por un trabajo, una venta o un regalo, regístralo aquí y se suma a tu cuenta.</p>
    </div>`;
}

/** Nombre legible de la cuenta destino, o '' si ya no existe. */
function _nombreCuenta(cuentaId) {
  const c = (S.cuentas ?? []).find(cta => cta.id === cuentaId);
  return c ? c.nombre : '';
}

/**
 * @param {import('../../../core/state.js').IngresoPuntual} ing
 * @param {boolean} oculto - S.config.ocultarSaldo (MC.18d, ADR 035 D5).
 * @returns {string}
 */
function _renderIngresoPuntualItem(ing, oculto) {
  const desc = _esc(ing.descripcion);
  const catLabel = ing.categoria ? `${_esc(ing.categoria)} · ` : '';
  const cuentaNom = _nombreCuenta(ing.cuentaId);
  const cuentaStr = cuentaNom ? ` · ${_esc(cuentaNom)}` : '';
  const montoTxt = oculto ? SALDO_MASCARA_CUENTA : f(ing.monto);

  // ID.3: misma teja de categoría que los ingresos fijos.
  const teja = tejaCategoria(CATEGORIA_INGRESO_ICONO[ing.categoria] ?? 'i-saldo', 'ingresos');

  return `
    <article class="list-item" data-id="${_esc(ing.id)}">
      <div class="list-item__icon" aria-hidden="true">${teja}</div>
      <div class="list-item__body">
        <p class="list-item__title">${desc}</p>
        <p class="list-item__subtitle">${catLabel}${_esc(fechaCorta(ing.fecha))}${cuentaStr}</p>
      </div>
      <div class="list-item__meta">
        <p class="list-item__value list-item__value--in">+${montoTxt}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-ingreso-puntual"
                data-id="${_esc(ing.id)}"
                aria-label="Eliminar ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

/**
 * Devuelve el HTML del formulario de nuevo ingreso puntual. Si no hay cuentas
 * activas, muestra un estado guiado (el ingreso necesita una cuenta destino).
 *
 * @returns {string}
 */
export function renderFormIngresoPuntual() {
  const cuentas = (S.cuentas ?? []).filter(c => c.activa !== false);

  if (cuentas.length === 0) {
    return `
      <div class="form-empty">
        <p class="form-empty__icon" aria-hidden="true">${icon('cuentas', 'icon icon--lg')}</p>
        <p class="form-empty__title">Primero necesitas una cuenta</p>
        <p class="form-empty__desc">Un ingreso necesita una cuenta donde entre el dinero. Créala aquí y sigues sin perder el hilo.</p>
        <a class="btn btn-primary btn-lg" href="#tesoreria" data-action="ir-a-crear-cuenta">${icon('cuentas')} Crear una cuenta</a>
      </div>`;
  }

  const catOpts = CATEGORIAS_INGRESO
    .map(c => `<option value="${_esc(c)}">${_esc(c)}</option>`)
    .join('');

  return `
    <form id="form-ingreso-puntual" novalidate>
      <div class="form-group">
        <label for="ingreso-p-monto" class="label">¿Cuánto recibiste? (COP)</label>
        <input id="ingreso-p-monto" name="monto" class="input input--big-amount"
               type="number" inputmode="numeric" min="1" step="10000" placeholder="0"
               required aria-required="true" autocomplete="off" />
      </div>
      ${renderSelectorCuenta(cuentas, { label: '¿En qué cuenta entró el dinero?' })}
      <div class="form-group">
        <label for="ingreso-p-cat" class="label">Categoría (opcional)</label>
        <select id="ingreso-p-cat" name="categoria" class="input">
          <option value="">Seleccionar…</option>
          ${catOpts}
        </select>
      </div>
      <div class="form-group">
        <label for="ingreso-p-desc" class="label">Descripción (opcional)</label>
        <input id="ingreso-p-desc" name="descripcion" class="input" type="text"
               placeholder="Ej. Venta de la bici, Freelance, Regalo" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="ingreso-p-fecha" class="label">Fecha</label>
        <input id="ingreso-p-fecha" name="fecha" class="input" type="date"
               required aria-required="true" />
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar ingreso</button>
      </div>
    </form>`;
}

// ── NUDGE PRÓXIMO INGRESO ────────────────────────────────────────

/**
 * Renderiza la alerta de próximo pago en `#ingresos-nudge-proximo`.
 * No-op si el contenedor no existe o no hay ingresos con próximo pago calculable.
 */
export function renderNudgeProximoIngreso() {
  const el = document.getElementById('ingresos-nudge-proximo');
  if (!el) return;
  const ingresos = Array.isArray(S.ingresos) ? S.ingresos : [];
  const nudge    = detectarNudgeProximoIngreso(ingresos);
  el.innerHTML   = nudge ? _renderNudgeProximo(nudge) : '';
}

/** Formatea una fecha ISO como texto corto en español: "30 jun", "1 jul". */
export function fechaCorta(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  return formateadorFecha('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
}

/**
 * @param {{ principal: {descripcion: string, dias: number, fechaISO: string},
 *            otrosProximos: number }} nudge
 * @returns {string}
 */
function _renderNudgeProximo({ principal, otrosProximos }) {
  const { descripcion, dias, fechaISO } = principal;
  const urgencia  = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;
  const cuandoStr = dias <= 1 ? urgencia : `${urgencia} (${fechaCorta(fechaISO)})`;
  const otrosHtml = otrosProximos > 0
    ? `<p class="nudge__desc">y ${otrosProximos} ${otrosProximos === 1 ? 'ingreso más próximo' : 'ingresos más próximos'} esta semana</p>`
    : '';
  return `
    <div class="nudge nudge-info" role="status">
      <span class="nudge__icon" aria-hidden="true">${icon('saldo')}</span>
      <div class="nudge__body">
        <p class="nudge__title">Recibes "${_esc(descripcion)}" ${cuandoStr}</p>
        ${otrosHtml}
      </div>
    </div>`;
}
