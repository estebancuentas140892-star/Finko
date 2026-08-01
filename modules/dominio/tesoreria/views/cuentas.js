/**
 * tesoreria/views/cuentas.js - lista de cuentas, formulario del modal e indicador GMF.
 *
 * Sub-modulo de tesoreria/view.js (barrel). Reglas de la capa:
 * - Puede leer S. No puede mutarlo.
 * - Devuelve strings HTML o escribe en el DOM (no ambas cosas en la misma funcion).
 * - Sin logica de negocio: delegar a logic/.
 */

import { S } from '../../../core/state.js';
import { f, hoy, esc as _esc } from '../../../infra/utils.js';
import { icon, emptyArt } from '../../../infra/icons.js';
import { bancoAvatar, bancoClase } from '../../../infra/bancos.js';
import { SALDO_MASCARA, SALDO_MASCARA_CUENTA } from '../../../infra/render.js';
import { BANCOS_CO, TIPOS_LLAVE, ICONOS_CATEGORIA_PERSONALIZADA } from '../../../core/constants.js';
import { renderIconoPicker } from '../../../infra/icon-picker.js';
import {
  cuentasActivas,
  calcularTotalCuentas,
  composicionCuentas,
  resumenCuentas,
  calcularCostoGMF,
  detectarNudgeGMF,
  tarjetasCredito,
} from '../logic/cuentas.js';

// ── HERO: TOTAL EN CUENTAS (MC.18a, ADR 035 D1+D3+D5) ────────────

/**
 * Opacidad de los segmentos de la barra de composición, por peso
 * (mayor saldo = más opaco).
 *
 * MC-DIS.9 C4: eran [1, 0.62, 0.34] con 0,2 de la cuarta en adelante, es
 * decir contrastes de 5,74 · 3,01 · 1,77 · 1,36 contra el fondo del hero: los
 * dos últimos por debajo del umbral no textual de 3:1 (SC 1.4.11) y entre sí
 * indistinguibles (1,3:1). `composicionCuentas()` deja de devolver una entrada
 * por cuenta (como máximo tres, con el resto agrupado en "otras"), así que
 * estos tres valores cubren la barra completa.
 *
 * El piso es 0,62 y no el 0,55 que pedía el informe: medido sobre el fondo real
 * del hero, 0,55 rinde 2,65:1 y no llega al umbral que la propia corrección
 * invoca. 0,62 es el primer paso que lo alcanza. Contrastes medidos con los
 * tres valores: 5,74 · 4,22 · 3,01.
 */
const _COMPO_OPACIDAD = [1, 0.81, 0.62];

/**
 * Renderiza el hero con el total en cuentas en `#tesoreria-hero`.
 * No-op si el contenedor no existe (sección no montada).
 *
 * - Total protagonista con `calcularTotalCuentas()`; enmascarado con
 *   `SALDO_MASCARA` cuando `S.config.ocultarSaldo` es true (mismo flag
 *   que el ojo de Inicio, IN.2: un solo control de privacidad).
 * - Ojo de privacidad anclado a la esquina (posición estable, solo cambia
 *   el contenido). Sin cuentas no se pinta: no hay nada que enmascarar
 *   (misma disciplina que updSaldo() en el hero de Inicio).
 * - Barra de composición (D3): un segmento por cuenta con saldo positivo hasta
 *   el tope de `composicionCuentas()` (MC-DIS.9 C4), ancho proporcional; el
 *   resumen en texto dice lo mismo que la barra (SC 1.4.11, regla R23).
 */
export function renderHeroTesoreria() {
  const el = document.getElementById('tesoreria-hero');
  if (!el) return;

  const activas    = cuentasActivas(S.cuentas);
  const sinCuentas = activas.length === 0;
  const oculto     = S.config?.ocultarSaldo === true;

  const label    = sinCuentas ? 'Aún no tienes cuentas' : 'Tu dinero en cuentas';
  const totalTxt = sinCuentas ? f(0)
                 : oculto     ? SALDO_MASCARA
                 :              f(calcularTotalCuentas(S.cuentas));

  const ojoHtml = sinCuentas ? '' : `
      <button class="hero-tesoreria__ojo" type="button" id="tesoreria-saldo-ojo"
              data-action="tesoreria-saldo-visibilidad"
              aria-pressed="${oculto}"
              aria-label="${oculto ? 'Mostrar tus saldos' : 'Ocultar tus saldos'}">
        <svg class="icon" aria-hidden="true"><use href="#i-eye${oculto ? '-off' : ''}"/></svg>
      </button>`;

  const compo = sinCuentas ? [] : composicionCuentas(S.cuentas);
  const compoHtml = compo.length === 0 ? '' : `
      <div class="hero-tesoreria__compo" aria-hidden="true">
        ${compo.map(() => '<div class="hero-tesoreria__compo-seg"></div>').join('')}
      </div>`;

  const resumen     = sinCuentas ? '' : resumenCuentas(S.cuentas);
  const resumenHtml = resumen
    ? `<p class="hero-tesoreria__resumen">${_esc(resumen)}</p>`
    : '';

  el.innerHTML = `
    <div class="hero-tesoreria">
      <svg class="decor decor--bottom-right" aria-hidden="true"><use href="#d-onda"/></svg>
      ${ojoHtml}
      <p class="hero-tesoreria__label">${label}</p>
      <p class="hero-tesoreria__valor">${totalTxt}</p>
      ${compoHtml}
      ${resumenHtml}
    </div>`;

  // Ancho y opacidad por peso van como propiedad JS tras el innerHTML
  // (cero style="" en el HTML generado, regla del proyecto).
  el.querySelectorAll('.hero-tesoreria__compo-seg').forEach((seg, i) => {
    seg.style.width   = `${compo[i].pct.toFixed(2)}%`;
    seg.style.opacity = String(_COMPO_OPACIDAD[i] ?? 0.62);
  });
}

// ── LISTA DE CUENTAS ─────────────────────────────────────────────

/**
 * Renderiza la lista de cuentas en `#lista-tesoreria`.
 * No-op si el contenedor no existe (sección no montada).
 *
 * MC.18b (ADR 035 D5): el ojo del hero enmascara también el saldo de cada
 * tarjeta, mismo flag `S.config.ocultarSaldo` que el total y el saldo de Inicio.
 */
export function renderListaCuentas() {
  const el = document.getElementById('lista-tesoreria');
  if (!el) return;

  const cuentas = cuentasActivas(S.cuentas);
  const oculto  = S.config?.ocultarSaldo === true;
  el.innerHTML = cuentas.length === 0
    ? _renderEmptyState()
    : cuentas.map(c => _renderCuentaItem(c, oculto)).join('');
}

/**
 * Etiqueta descriptiva del tipo de cuenta para la tarjeta (MC.18b): a
 * diferencia de `cuenta.tipo` (que para billeteras guarda el propio banco,
 * ej. tipo="Nequi", y para efectivo guarda "Efectivo"), esta etiqueta
 * siempre describe la CLASE de forma legible, sin duplicar el nombre que
 * ya se muestra arriba.
 *
 * MC-DIS.9 C11: para la clase efectivo devuelve '' y la tarjeta omite el
 * subtítulo. "Efectivo / Dinero en efectivo" decía lo mismo dos veces con más
 * palabras; es el caso que MC.15a resolvió para los bancos y que quedó
 * pendiente acá.
 *
 * @param {import('../../../core/state.js').Cuenta} cuenta
 * @returns {string}
 */
function _tipoLabel(cuenta) {
  const clase = bancoClase(cuenta.banco);
  if (clase === 'billetera') return 'Billetera digital';
  if (clase === 'efectivo')  return '';
  return cuenta.tipo || 'Cuenta';
}

/**
 * @param {import('../../../core/state.js').Cuenta} cuenta
 * @param {boolean} oculto - S.config.ocultarSaldo (MC.18b, ADR 035 D5).
 * @returns {string}
 */
function _renderCuentaItem(cuenta, oculto) {
  const banco = cuenta.banco;
  const tipo  = cuenta.tipo;

  // MC.15a: el form actual no ofrece un campo para escribir un nombre
  // propio, así que `nombre` sale siempre de `_autoNombre(banco, tipo)`
  // (logic/cuentas.js) y ya contiene banco + tipo ("Banco de Bogotá
  // Ahorros"). MC.18b separa la tarjeta en dos líneas (nombre arriba, tipo
  // debajo): con nombre autogenerado, el nombre se reduce al banco solo
  // ("Banco de Bogotá") y el tipo aporta la info real (`_tipoLabel()`), sin
  // repetir palabras. `normalizarCuenta()` sí respeta un nombre explícito si
  // algún día se habilita ese campo (ver sus tests): ahí el nombre completo
  // se conserva y el subtítulo vuelve a ser "banco · tipo" (informa a qué
  // cuenta real corresponde el nombre elegido).
  const combinado = banco === tipo ? banco : `${banco} ${tipo}`;
  const esAutoNombre = (cuenta.nombre ?? '').trim().toLowerCase() === combinado.trim().toLowerCase();
  const nombre    = _esc(esAutoNombre ? banco : cuenta.nombre);
  const subtitulo = esAutoNombre ? _tipoLabel(cuenta) : `${banco} · ${tipo}`;

  const saldoTxt = oculto ? SALDO_MASCARA_CUENTA : f(cuenta.saldo);

  const chips = [];
  if (cuenta.cuotaManejo) {
    chips.push({ icon: 'i-agenda', label: `Cuota ${f(cuenta.cuotaManejo.monto)} · día ${cuenta.cuotaManejo.diaCobro}` });
  }
  if (cuenta.aplica4x1000) {
    chips.push({ icon: 'i-percent', label: '4x1000' });
  }
  const transferenciaLabel = _labelDatosTransferencia(cuenta.datosTransferencia);
  if (transferenciaLabel) {
    chips.push({ icon: 'i-key', label: transferenciaLabel });
  }
  // MC-DIS.9 C1 (regla R19): la etiqueta viaja en `.chip__label` y no como nodo
  // de texto suelto, para que pueda truncarse con elipsis cuando el dato es
  // largo (un nodo suelto dentro del inline-flex del chip no lo acepta).
  const chipsHtml = chips.map(ch => `
          <span class="chip">
            <svg class="icon icon--sm" aria-hidden="true"><use href="#${ch.icon}"/></svg>
            <span class="chip__label">${ch.label}</span>
          </span>`).join('');

  // MC-DIS.9 C11: sin subtítulo (clase efectivo) el párrafo no se emite.
  const subtituloHtml = subtitulo
    ? `<p class="cuenta-card__tipo">${_esc(subtitulo)}</p>`
    : '';

  return `
    <article class="cuenta-card" data-id="${_esc(cuenta.id)}">
      <div class="cuenta-card__top">
        <div class="cuenta-card__icon" aria-hidden="true">${_bankAvatarHtml(cuenta.banco, cuenta.icono)}</div>
        <div class="cuenta-card__info">
          <p class="cuenta-card__nombre">${nombre}</p>
          ${subtituloHtml}
        </div>
        <span class="cuenta-card__saldo">${saldoTxt}</span>
      </div>
      <div class="cuenta-card__bottom">
        <div class="cuenta-card__chips">${chipsHtml}</div>
        <div class="cuenta-card__actions">
          <button class="btn btn-ghost btn-icon btn-sm"
                  data-action="editar-cuenta"
                  data-id="${_esc(cuenta.id)}"
                  aria-label="Editar cuenta ${nombre}"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
          <button class="btn btn-ghost btn-icon btn-sm cuenta-card__eliminar"
                  data-action="eliminar-cuenta"
                  data-id="${_esc(cuenta.id)}"
                  aria-label="Eliminar cuenta ${nombre}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
        </div>
      </div>
    </article>`;
}

/**
 * Dato de transferencia que muestra el chip de la tarjeta (MC.14, chip desde
 * MC.18b). Devuelve '' si la cuenta no tiene datos guardados.
 *
 * MC-DIS.9 C1 (bug H1): antes concatenaba los tres campos con "·" y el chip
 * medía 377,8px dentro de un contenedor de 222,7px: se salía de la tarjeta y
 * pasaba por debajo de los botones de editar y eliminar. Ahora muestra UN dato,
 * el que sirve para que a uno le consignen: la llave con su tipo, o el número
 * de cuenta si no hay llave, o el alias si es lo único guardado. El resto sigue
 * guardado y visible al editar la cuenta.
 *
 * @param {import('../../../core/state.js').DatosTransferencia|null|undefined} dt
 * @returns {string}
 */
function _labelDatosTransferencia(dt) {
  if (!dt) return '';
  if (dt.llave)        return `${_esc(dt.tipoLlave ?? 'Llave')} ${_esc(dt.llave)}`;
  if (dt.numeroCuenta) return `N.° ${_esc(dt.numeroCuenta)}`;
  if (dt.alias)        return _esc(dt.alias);
  return '';
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('cuentas')}</div>
      <p class="empty-state__title">Agrega tu primera cuenta</p>
      <p class="empty-state__desc">Bancaria, billetera digital o efectivo: verás tu saldo real en Inicio.</p>
      <button class="btn btn-primary" data-action="nueva-cuenta">+ Agregar cuenta</button>
      <p class="empty-state__tip">${icon('lightbulb')} Tip: Nequi, Daviplata y el efectivo también cuentan. Todo lo que tienes, en un solo lugar.</p>
    </div>`;
}

// ── TARJETAS DE CRÉDITO (MC.16c, ADR 051 D6) ──────────────────────

/**
 * Renderiza el bloque de tarjetas de crédito en `#tesoreria-tarjetas`.
 * No-op si el contenedor no existe o no hay tarjetas operables.
 *
 * Solo lectura: fuera del total de dinero disponible (D6, la tarjeta no es
 * un activo), con cupo usado/disponible y enlace a Deudas para operar. La
 * dueña de crear, editar y registrar abonos sigue siendo Deudas.
 */
export function renderTarjetasTC() {
  const el = document.getElementById('tesoreria-tarjetas');
  if (!el) return;

  const tarjetas = tarjetasCredito(S.compromisos);
  if (tarjetas.length === 0) {
    el.innerHTML = '';
    return;
  }

  const oculto = S.config?.ocultarSaldo === true;

  el.innerHTML = `
    <h2 class="sr-only">Tus tarjetas de crédito</h2>
    ${tarjetas.map(t => _renderTarjetaTC(t, oculto)).join('')}`;
}

/**
 * Reusa la anatomía de `.cuenta-card` (MC.18b): mismo componente visual que
 * el resto de la sección, sin vocabulario CSS nuevo. La diferencia es de
 * contenido, no de tarjeta: cupo como subtítulo, disponible como cifra
 * prominente, usado como chip, y el enlace a Deudas donde iban editar/eliminar.
 *
 * @param {import('../../../core/state.js').Compromiso} tarjeta
 * @param {boolean} oculto - S.config.ocultarSaldo (mismo flag que el resto de la sección).
 * @returns {string}
 */
function _renderTarjetaTC(tarjeta, oculto) {
  const cupoTotal   = Number(tarjeta.cupoTotal) || 0;
  const usado       = Number(tarjeta.saldoTotal) || 0;
  const disponible  = Math.max(cupoTotal - usado, 0);
  const nombre      = _esc(tarjeta.nombre);

  const disponibleTxt = oculto ? SALDO_MASCARA_CUENTA : f(disponible);
  const usadoTxt       = oculto ? SALDO_MASCARA_CUENTA : f(usado);

  return `
    <article class="cuenta-card">
      <div class="cuenta-card__top">
        <div class="cuenta-card__icon" aria-hidden="true">${_bankAvatarHtml('otro')}</div>
        <div class="cuenta-card__info">
          <p class="cuenta-card__nombre">${nombre}</p>
          <p class="cuenta-card__tipo">Cupo ${f(cupoTotal)}</p>
        </div>
        <span class="cuenta-card__saldo" aria-label="Disponible ${disponibleTxt}">${disponibleTxt}</span>
      </div>
      <div class="cuenta-card__bottom">
        <div class="cuenta-card__chips">
          <span class="chip"><span class="chip__label">Usado ${usadoTxt}</span></span>
        </div>
        <div class="cuenta-card__actions">
          <a class="btn btn-ghost btn-sm" href="#compromisos">Ver en Deudas</a>
        </div>
      </div>
    </article>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de nueva cuenta para inyectar en `#modal-cuenta-body`.
 * La función es pura: no toca el DOM.
 *
 * @returns {string}
 */
export function renderFormCuenta() {
  const bancoItems = BANCOS_CO.map(b => `
    <li role="option"
        class="bank-picker__item"
        data-value="${_esc(b.id)}"
        aria-selected="false"
        tabindex="-1">
      ${_bankAvatarHtml(b.id)}
      <span>${_esc(b.id)}</span>
    </li>`).join('');

  return `
    <form id="form-cuenta" novalidate>
      <div class="form-group">
        <label id="label-banco" class="label">Banco o billetera</label>
        <div class="bank-picker"
             role="combobox"
             aria-expanded="false"
             aria-haspopup="listbox"
             aria-labelledby="label-banco">
          <button type="button"
                  class="bank-picker__trigger"
                  aria-controls="banco-list"
                  aria-expanded="false">
            <span class="bank-picker__display">
              <span class="bank-picker__placeholder">Seleccionar…</span>
            </span>
            <span class="bank-picker__chevron" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </button>
          <input type="hidden" name="banco" value="" />
          <ul class="bank-picker__list"
              id="banco-list"
              role="listbox"
              aria-label="Banco o billetera"
              tabindex="-1"
              hidden>
            ${bancoItems}
          </ul>
        </div>
      </div>

      <div class="form-group" id="form-group-icono" hidden>
        ${renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'cuenta-icono', label: 'Ícono' })}
      </div>

      <div class="form-group" id="form-group-tipo" hidden>
        <label for="cuenta-tipo" class="label">Tipo de cuenta</label>
        <select id="cuenta-tipo" name="tipo" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
        </select>
      </div>
      <div class="form-group">
        <label for="cuenta-saldo" class="label">Saldo actual (COP)</label>
        <input id="cuenta-saldo" name="saldo" class="input" type="number"
               min="0" step="1000" placeholder="0" value="0" />
      </div>

      <div class="form-group form-group--checkbox" id="form-group-4x1000">
        <label class="checkbox-row">
          <input type="checkbox"
                 id="cuenta-4x1000"
                 name="aplica4x1000" />
          <span>A esta cuenta le aplica el 4x1000 (GMF)</span>
        </label>
      </div>

      <div class="form-group form-group--checkbox">
        <label class="checkbox-row">
          <input type="checkbox"
                 id="cuenta-cuota-toggle"
                 name="cuotaManejoActiva"
                 data-cuota-toggle />
          <span>Esta cuenta cobra cuota de manejo mensual</span>
        </label>
        <p class="form-hint form-hint--muted" id="cuenta-cuota-hint">
          ¿Seguro que esta cuenta no cobra cuota de manejo, seguros u otros costos periódicos?
        </p>
      </div>

      <fieldset id="cuenta-cuota-fieldset" class="cuota-fieldset" hidden>
        <div class="form-group">
          <label for="cuenta-cuota-monto" class="label">
            Monto de la cuota (COP)
          </label>
          <input id="cuenta-cuota-monto"
                 name="cuotaManejoMonto"
                 class="input"
                 type="number"
                 min="1"
                 step="100"
                 placeholder="Ej. 15000" />
        </div>
        <div class="form-group">
          <label for="cuenta-cuota-dia" class="label">Día de cobro (1-31)</label>
          <input id="cuenta-cuota-dia"
                 name="cuotaManejoDia"
                 class="input"
                 type="number"
                 min="1" max="31" step="1"
                 placeholder="Ej. 15" />
        </div>
        <p class="form-hint form-hint--muted">
          Finko crea un gasto fijo mensual con este monto y día. Lo verás en Calendario.
        </p>
      </fieldset>

      <div class="form-group form-group--checkbox" id="form-group-transferencia">
        <label class="checkbox-row">
          <input type="checkbox"
                 id="cuenta-transferencia-toggle"
                 name="transferenciaActiva"
                 data-transferencia-toggle />
          <span>Guardar los datos que compartes cuando alguien te va a consignar</span>
        </label>
      </div>

      <fieldset id="cuenta-transferencia-fieldset" class="cuota-fieldset" hidden>
        <div class="form-group">
          <label for="cuenta-numero" class="label">
            Número de cuenta <span class="form-optional">opcional</span>
          </label>
          <input id="cuenta-numero"
                 name="numeroCuenta"
                 class="input"
                 type="text"
                 autocomplete="off"
                 placeholder="Ej. 1234567890" />
        </div>
        <div class="form-group">
          <label for="cuenta-tipo-llave" class="label">
            Tipo de llave <span class="form-optional">opcional</span>
          </label>
          <select id="cuenta-tipo-llave" name="tipoLlave" class="input">
            <option value="">Seleccionar…</option>
            ${TIPOS_LLAVE.map(t => `<option value="${_esc(t)}">${_esc(t)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="cuenta-llave" class="label">
            Llave de transferencia <span class="form-optional">opcional</span>
          </label>
          <input id="cuenta-llave"
                 name="llave"
                 class="input"
                 type="text"
                 autocomplete="off"
                 placeholder="Ej. 300 123 4567, correo@ejemplo.com" />
        </div>
        <div class="form-group">
          <label for="cuenta-alias" class="label">
            Alias <span class="form-optional">opcional</span>
          </label>
          <input id="cuenta-alias"
                 name="alias"
                 class="input"
                 type="text"
                 autocomplete="off"
                 placeholder="Ej. @mi-alias" />
        </div>
        <p class="form-hint form-hint--muted">
          Finko solo guarda estos datos como referencia para que los consultes rápido. No ejecuta transferencias ni pide contraseñas o claves.
        </p>
      </fieldset>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">
          Cancelar
        </button>
        <button type="submit" class="btn btn-primary">
          Guardar cuenta
        </button>
      </div>
    </form>`;
}

// ── INDICADOR GMF (K.1, tarjeta insight desde MC.18c) ─────────────

/**
 * Renderiza la tarjeta insight de costo del GMF en `#tesoreria-gmf`.
 * Muestra el costo estimado del 4x1000 para el mes actual basado en
 * los gastos registrados desde cuentas con GMF. No-op si el contenedor
 * no existe o si no hay costo que reportar este mes.
 */
export function renderGMFIndicador() {
  const el = document.getElementById('tesoreria-gmf');
  if (!el) return;

  const fechaHoy = hoy();
  const anio = Number(fechaHoy.slice(0, 4));
  const mes  = Number(fechaHoy.slice(5, 7));

  const gmfData = calcularCostoGMF(S.gastos, S.cuentas, anio, mes);
  const nudge   = detectarNudgeGMF(gmfData);

  el.innerHTML = nudge ? _renderGMFInsight(nudge) : '';
}

/**
 * MC.18c (ADR 035 D4): antes nudge suelto (`.nudge nudge-info`), ahora
 * tarjeta insight compacta con tinte tesorería, pegada bajo la lista de
 * cuentas que generan el gravamen. Copy y cálculo sin cambios.
 *
 * MC-DIS.9 C10 (regla R24): sin `role="status"`. Es una tarjeta informativa
 * estable, no la respuesta a una acción, y `renderGMFIndicador()` corre en cada
 * `state:change` de la sección: registrar un gasto o guardar un ingreso hacía
 * que el lector de pantalla la volviera a anunciar con la cifra sin cambiar.
 *
 * @param {{ icono: string, nivel: string, cantidadCuentasGMF: number,
 *           gastosGravados: number, costoGMF: number }} nudge
 * @returns {string}
 */
function _renderGMFInsight(nudge) {
  const n = nudge.cantidadCuentasGMF === 1 ? '1 cuenta' : `${nudge.cantidadCuentasGMF} cuentas`;
  return `
    <div class="gmf-insight">
      <span class="gmf-insight__icon" aria-hidden="true">
        <svg class="icon" aria-hidden="true"><use href="#i-percent"/></svg>
      </span>
      <div class="gmf-insight__body">
        <p class="gmf-insight__title">4x1000 estimado este mes: ${f(nudge.costoGMF)}</p>
        <p class="gmf-insight__desc">Calculado desde ${f(nudge.gastosGravados)} en gastos registrados desde ${_esc(n)} con GMF. Las cuentas de nómina y AFC están exentas: consulta con tu banco si aplica.</p>
      </div>
    </div>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

/**
 * Devuelve el HTML de la teja de marca del banco (glifo oficial o iniciales
 * sobre el color corporativo, ADR 025). Si el banco no se encuentra en
 * BANCOS_CO, devuelve una teja generica con "?" y color gris.
 *
 * @param {string} bancoId - valor guardado en cuenta.banco.
 * @param {string|null} [icono] - `cuenta.icono` elegido para el banco "Otro" (CAT.2e).
 * @returns {string} HTML span de la teja.
 */
function _bankAvatarHtml(bancoId, icono = null) {
  return bancoAvatar(bancoId, icono);
}

