/**
 * tesoreria/views/ingresos.js - listas y formularios de ingresos (recurrentes y
 * puntuales) y nudge de proximo cobro.
 *
 * Sub-modulo de tesoreria/view.js (barrel). Reglas de la capa:
 * - Puede leer S. No puede mutarlo.
 * - Devuelve strings HTML o escribe en el DOM (no ambas cosas en la misma funcion).
 * - Sin logica de negocio: delegar a logic/.
 */

import { htmlTinoSol } from '../../../infra/ilustraciones.js';
import { miles } from '../../../infra/miles.js';
import { S } from '../../../core/state.js';
import { f, esc as _esc, fechaLegible } from '../../../infra/utils.js';
import { icon, tejaCategoria } from '../../../infra/icons.js';
import { renderSelectorCuenta } from '../../../infra/cuenta-helper.js';
import { SALDO_MASCARA_CUENTA } from '../../../infra/render.js';
import { FRECUENCIAS, CATEGORIAS_INGRESO, CATEGORIA_INGRESO_ICONO } from '../../../core/constants.js';
import { FRECUENCIAS_CON_DIA, calcularSalarioMinimo, detectarNudgeProximoIngreso, cuandoLlegaIngreso } from '../logic/ingresos.js';

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

/**
 * Renderiza la fila de altas de "Fuentes de ingreso" en `#ingresos-altas`
 * (ADR 080 D2). Dos botones al pie de las dos listas, no en el sub-encabezado:
 *
 * - **Fuente fija** crea una regla (algo que se repetirá cada período), y una
 *   regla vive en la sección que administra su lista.
 * - **Ingreso** es un movimiento de hoy, y su casa canónica es la hoja
 *   Registrar. Acá es un atajo declarado: mismo ícono (`#i-saldo`) y misma
 *   etiqueta que la teja de allá (R72), con la marca "Atajo" para que se lea
 *   como lo que es y no como un segundo camino distinto.
 *
 * Ninguno es primario: el único de la sección es "Nueva cuenta", que es el
 * verbo que no existe en Registrar.
 */
export function renderAltasIngreso() {
  const el = document.getElementById('ingresos-altas');
  if (!el) return;

  // ADR 135 D2: sin ningún ingreso, el vacío lleva sus dos salidas adentro.
  // Con alguno, "Ingreso fijo" y "De una vez" lado a lado y la diferencia en
  // una nota: el nombre de cada botón dice qué clase de ingreso crea.
  if (_sinNingunIngreso()) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <button class="btn btn-sm btn-secondary ingresos-altas__fuente" data-action="nuevo-ingreso"
            aria-label="Agregar un ingreso fijo">
      ${icon('plus')} Ingreso fijo
    </button>
    <button class="btn btn-sm btn-secondary ingresos-altas__fuente" data-action="nuevo-ingreso-puntual"
            aria-label="Registrar un ingreso de una vez">
      ${icon('plus')} De una vez
    </button>
    <p class="ingresos-altas__nota">Fijo: tu salario o un arriendo que recibes. De una vez: una venta, un trabajo suelto o un regalo.</p>`;
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
  // ADR 135 D2: sin ningún ingreso, una tarjeta con para qué sirve y sus dos
  // salidas: el fijo como primario y el de una vez como enlace.
  if (_sinNingunIngreso()) {
    return `
    <div class="ingresos-vacio">
      <p class="ingresos-vacio__titulo">Aún no registras de dónde entra tu dinero</p>
      <p class="ingresos-vacio__desc">Con tu ingreso, Finko te dice cuánto te queda en el mes y te ayuda a repartirlo.</p>
      <button type="button" class="btn btn-primary ingresos-vacio__fijo" data-action="nuevo-ingreso">
        ${icon('plus')} Agregar mi ingreso fijo
      </button>
      <button type="button" class="btn btn-ghost ingresos-vacio__puntual" data-action="nuevo-ingreso-puntual">¿Te entró dinero una sola vez? Regístralo</button>
    </div>`;
  }
  return `
    <div class="empty-state empty-state--small">
      <p class="empty-state__desc">Sin ingresos fijos registrados. Agrega tu salario u otro ingreso que se repita para ver tu tasa de ahorro.</p>
    </div>`;
}

/**
 * @param {import('../../../core/state.js').Ingreso} ing
 * @param {boolean} oculto - S.config.ocultarSaldo (MC.18d, ADR 035 D5).
 * @returns {string}
 */
function _renderIngresoItem(ing, oculto) {
  const desc = _esc(ing.descripcion);
  // ADR 135 D2: la línea dice cuándo llega ("Cada mes, el día 1 · el próximo
  // llega en 18 días"). Absorbe la frecuencia, el día de pago (antes una
  // segunda línea con el calendario) y el aviso del próximo cobro, que en el
  // teléfono se calla. La categoría ya la dice la teja.
  const cuando = _esc(cuandoLlegaIngreso(ing));

  // ID.3: teja de categoría de ingreso como ícono de la fila (verde del
  // dominio ingresos); sin categoría, la moneda genérica i-saldo.
  const teja = tejaCategoria(CATEGORIA_INGRESO_ICONO[ing.categoria] ?? 'i-saldo', 'ingresos');
  const montoTxt = oculto ? SALDO_MASCARA_CUENTA : f(ing.monto);

  // ADR 109 (MV2.9): en móvil la fila abre la hoja de detalle, que copia la
  // línea de cuándo llega. En escritorio el botón no se ve.
  return `
    <article class="list-item list-item--detalle" data-id="${_esc(ing.id)}">
      <button class="list-item__detalle" type="button" data-action="fila-detalle"
              aria-label="Ver detalle: ${desc}, ${montoTxt}"></button>
      <div class="list-item__icon" aria-hidden="true">${teja}</div>
      <div class="list-item__body">
        <p class="list-item__title">${desc}</p>
        <p class="list-item__subtitle">${cuando}</p>
      </div>
      <div class="list-item__meta">
        <p class="list-item__value ingreso-fijo__monto">${montoTxt}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="editar-ingreso"
                data-id="${_esc(ing.id)}"
                aria-label="Editar fuente de ingreso: ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-ingreso"
                data-id="${_esc(ing.id)}"
                aria-label="Eliminar fuente: ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
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
      </div>
      ${_renderToggleCreditoAutomatico(ingreso)}`;
  }

  return `
    ${renderSelectorCuenta(activas, {
      label:          '¿En qué cuenta recibes este ingreso?',
      selectedId:     ingreso?.cuentaId ?? null,
      preseleccionar: false,
      opcional:       true,
    })}
    <p class="form-hint form-hint--muted">Si lo indicas, al distribuir tu ingreso Finko parte de esa cuenta.</p>
    ${_renderToggleCreditoAutomatico(ingreso)}`;
}

/**
 * Toggle "Se abona automáticamente" (PA.1b, ADR 052 D2/D3): el mismo criterio
 * de confirmación que el débito automático de Compromisos (PA.1a), visto desde
 * el otro lado. No trae selector de cuenta propio porque `Ingreso.cuentaId` ya
 * lo resuelve arriba (0/1/varias): agregar uno segundo sería un dato duplicado
 * que podría discrepar del ya elegido.
 *
 * @param {import('../../../core/state.js').Ingreso|null} ingreso
 * @returns {string}
 */
function _renderToggleCreditoAutomatico(ingreso) {
  return `
      <div class="form-group">
        <label class="toggle-row">
          <span class="toggle">
            <input type="checkbox" id="ingreso-credito-auto" name="creditoAutomatico"${ingreso?.creditoAutomatico ? ' checked' : ''} />
            <span class="toggle__track" aria-hidden="true"></span>
          </span>
          <span class="toggle-row__text">
            <span class="toggle-row__label">Se abona automáticamente a esta cuenta</span>
            <span class="toggle-row__hint">Actívalo si tu banco te lo deposita solo cada vez que llega. Finko no lo registra por su cuenta: al abrir la app te lo deja listo y tú lo confirmas de un toque.</span>
          </span>
        </label>
      </div>`;
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
  const cuentaIngreso = _renderGrupoCuentaIngreso(ingreso);
  const { smmlv, auxilio } = calcularSalarioMinimo(true);

  return `
    <form id="form-ingreso" novalidate data-preguntas="${ingreso ? 'Tu ingreso fijo' : 'Ingreso fijo'}"
          data-resumen-titulo="Así queda tu ingreso" data-preguntas-inicio="${ingreso ? 'resumen' : ''}">
      <div data-pregunta="¿Qué tipo de ingreso es?" data-pregunta-id="tipo" data-resumen="Tipo">
      <div class="form-group">
        <label for="ingreso-cat" class="label">Categoría</label>
        <select id="ingreso-cat" name="categoria" class="input">
          <option value="">Seleccionar…</option>
          ${catOpts}
        </select>
      </div>
      </div>
      <div class="form-group" data-pregunta="¿Cómo lo llamas?" data-pregunta-id="nombre" data-resumen="Nombre"
           data-falta="Ponle un nombre para reconocerlo.">
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
      <div class="form-group" data-pregunta="¿Cuánto recibes?" data-pregunta-id="monto" data-resumen="Monto"
           data-falta="Escribe cuánto recibes. Por ejemplo: 2.500.000">
        <label for="ingreso-monto" class="label">Monto</label>
        <input id="ingreso-monto" name="monto" class="input" type="text" placeholder="0"
               value="${miles(ingreso ? ingreso.monto : '')}"
               required aria-required="true" inputmode="numeric" data-miles autocomplete="off" />
      </div>
      <div class="form-group" data-pregunta="¿Cada cuánto?" data-pregunta-id="frecuencia" data-resumen="Cada cuánto"
           data-falta="Elige cada cuánto lo recibes.">
        <label for="ingreso-frec" class="label">Frecuencia</label>
        <select id="ingreso-frec" name="frecuencia" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${frecOpts}
        </select>
      </div>
      <div class="form-group" id="form-group-dia-pago" data-opcional="Día de pago" data-control="dia" data-resumen="Día de pago"${ingreso && FRECUENCIAS_CON_DIA.includes(ingreso.frecuencia) ? '' : ' hidden'}>
        <label for="ingreso-dia-pago" class="label" id="label-dia-pago">${ingreso?.frecuencia === 'Quincenal' ? 'Día de la primera quincena' : 'Día de pago'} <span class="form-optional">Opcional</span></label>
        <input id="ingreso-dia-pago" name="diaPago" class="input" type="number"
               min="1" max="${ingreso?.frecuencia === 'Quincenal' ? '15' : '31'}" step="1"
               placeholder="${ingreso?.frecuencia === 'Quincenal' ? 'Ej. 15' : 'Ej. 30'}"
               value="${ingreso?.diaPago ?? ''}"
               inputmode="numeric" />
        <p class="form-hint form-hint--muted" id="hint-dia-pago">¿Qué día sueles recibir este pago? Del 1 al 31.</p>
      </div>
      ${cuentaIngreso ? `<div data-opcional="Cuenta donde llega">${cuentaIngreso}</div>` : ''}
      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${ingreso ? 'Actualizar ingreso fijo' : 'Guardar ingreso fijo'}</button>
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

  // ADR 098 D7 (hallazgo N8): con 200 ingresos, Mis cuentas medía 29
  // pantallas en móvil. Ahí se ven los 5 más recientes (el resto lleva
  // `--extra` y lo oculta responsive.css) y una salida al historial, donde
  // está el buscador. En escritorio la lista sigue completa.
  const visiblesMovil = 5;
  const salida = lista.length > visiblesMovil
    ? `<button type="button" class="btn btn-ghost lista-ingresos__ver-todos"
               data-action="ingresos-ver-historial">Ver los ${lista.length} en Movimientos</button>`
    : '';

  el.innerHTML = lista.length === 0
    ? _renderEmptyStateIngresosPuntuales()
    : lista.map((i, n) => _renderIngresoPuntualItem(i, oculto, n >= visiblesMovil)).join('') + salida;
}

/**
 * MC-DIS.9 C5: cuando las dos listas están vacías el mensaje único lo emite
 * `renderListaIngresos()`. ADR 135 D2: con ingresos fijos tampoco emite nada;
 * "De una vez" y su nota, al pie, ya dicen qué falta y cómo agregarlo.
 */
function _renderEmptyStateIngresosPuntuales() {
  return '';
}

/** Nombre legible de la cuenta destino, o '' si ya no existe. */
function _nombreCuenta(cuentaId) {
  const c = (S.cuentas ?? []).find(cta => cta.id === cuentaId);
  return c ? c.nombre : '';
}

/**
 * @param {import('../../../core/state.js').IngresoPuntual} ing
 * @param {boolean} oculto - S.config.ocultarSaldo (MC.18d, ADR 035 D5).
 * @param {boolean} [extra=false] - fuera de los 5 que se ven en móvil (ADR 098 D7).
 * @returns {string}
 */
function _renderIngresoPuntualItem(ing, oculto, extra = false) {
  const desc = _esc(ing.descripcion);
  const catLabel = ing.categoria ? `${_esc(ing.categoria)} · ` : '';
  const cuentaNom = _nombreCuenta(ing.cuentaId);
  const cuentaStr = cuentaNom ? ` · ${_esc(cuentaNom)}` : '';
  const montoTxt = oculto ? SALDO_MASCARA_CUENTA : f(ing.monto);

  // ID.3: misma teja de categoría que los ingresos fijos.
  const teja = tejaCategoria(CATEGORIA_INGRESO_ICONO[ing.categoria] ?? 'i-saldo', 'ingresos');

  // ADR 109 D2: la hoja gana "Ver en Movimientos", la misma salida al
  // historial que la lista ofrece pasados cinco. Ese botón nunca se ve en la
  // fila (`.list-item__solo-hoja`): solo lo copia la hoja.
  return `
    <article class="list-item list-item--detalle${extra ? ' list-item--extra' : ''}" data-id="${_esc(ing.id)}">
      <button class="list-item__detalle" type="button" data-action="fila-detalle"
              aria-label="Ver detalle: ${desc}, +${montoTxt}"></button>
      <div class="list-item__icon" aria-hidden="true">${teja}</div>
      <div class="list-item__body">
        <p class="list-item__title">${desc}</p>
        <p class="list-item__subtitle">${catLabel}${_esc(fechaLegible(ing.fecha))}${cuentaStr}</p>
      </div>
      <div class="list-item__meta">
        <p class="list-item__value list-item__value--in">+${montoTxt}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost list-item__solo-hoja"
                data-action="ingresos-ver-historial">Ver en Movimientos</button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-ingreso-puntual"
                data-id="${_esc(ing.id)}"
                aria-label="Eliminar ingreso: ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
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
        ${htmlTinoSol('pensando', { tamano: 104, clase: 'form-empty__tino' })}
        <p class="form-empty__title">Primero necesitas una cuenta</p>
        <p class="form-empty__desc">Un ingreso necesita una cuenta donde entre el dinero. Créala aquí y sigues sin perder el hilo.</p>
        <a class="btn btn-primary btn-lg" href="#tesoreria" data-action="ir-a-crear-cuenta">${icon('cuentas')} Crear una cuenta</a>
      </div>`;
  }

  const catOpts = CATEGORIAS_INGRESO
    .map(c => `<option value="${_esc(c)}">${_esc(c)}</option>`)
    .join('');

  return `
    <form id="form-ingreso-puntual" novalidate data-etapas-monto="¿Cuánto te llegó?">
      <div class="form-group">
        <label for="ingreso-p-monto" class="label">¿Cuánto recibiste?</label>
        <input id="ingreso-p-monto" name="monto" class="input input--big-amount"
               type="text" inputmode="numeric" data-miles placeholder="0"
               required aria-required="true" autocomplete="off" />
      </div>
      ${renderSelectorCuenta(cuentas, { label: '¿En qué cuenta entró el dinero?' })}
      <div class="form-group">
        <label for="ingreso-p-cat" class="label">Categoría <span class="form-optional">Opcional</span></label>
        <select id="ingreso-p-cat" name="categoria" class="input">
          <option value="">Seleccionar…</option>
          ${catOpts}
        </select>
      </div>
      <div class="form-group">
        <label for="ingreso-p-desc" class="label">Descripción <span class="form-optional">Opcional</span></label>
        <input id="ingreso-p-desc" name="descripcion" class="input" type="text"
               placeholder="Ej. Venta de la bici, Freelance, Regalo" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="ingreso-p-fecha" class="label">Fecha</label>
        <input id="ingreso-p-fecha" name="fecha" class="input" type="date"
               required aria-required="true" />
      </div>
      <div class="modal__footer modal__footer--principal">
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

/**
 * @param {{ principal: {descripcion: string, dias: number, fechaISO: string},
 *            otrosProximos: number }} nudge
 * @returns {string}
 */
function _renderNudgeProximo({ principal, otrosProximos }) {
  const { descripcion, dias, fechaISO } = principal;
  const urgencia  = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;
  const cuandoStr = dias <= 1 ? urgencia : `${urgencia} (${fechaLegible(fechaISO)})`;
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
