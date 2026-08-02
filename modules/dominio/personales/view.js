/**
 * personales/view.js - HTML del dominio de préstamos personales.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, esc as _esc, hoy as hoyISO } from '../../infra/utils.js';
import { icon, emptyArt } from '../../infra/icons.js';
import { renderSelectorCuenta } from '../../infra/cuenta-helper.js';
import { SALDO_MASCARA, SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import {
  calcularPendiente,
  calcularCapitalPendiente,
  calcularInteresPendiente,
  calcularDias,
  clasificarAntiguedad,
  estadoPrestamo,
  labelEstado,
  porcentajePagado,
  calcularResumen,
  ordenarPersonales,
  tieneInteres,
} from './logic.js';

// ── LISTA + RESUMEN ──────────────────────────────────────────────

/**
 * Renderiza la lista de préstamos en `#lista-personales` + el resumen arriba.
 * No-op si el contenedor no existe.
 *
 * DIS.3 (V-8, regla R21): los liquidados se listan después de los activos, con
 * el mismo criterio "más viejos primero" dentro de cada grupo. `logic.js` no
 * cambia: el corte es de la vista, porque es una decisión de presentación.
 *
 * DIS.3 (V-4, regla R20): toda cifra de dinero respeta `S.config.ocultarSaldo`,
 * el mismo flag del ojo de Inicio (IN.2) que ya leen Gastos, Deudas, Calendario,
 * Mis cuentas y Análisis. Las barras de progreso se conservan: muestran
 * proporción, no magnitud (mismo criterio que el hero de Calendario, CAL.4a).
 */
export function renderListaPersonales() {
  const el = document.getElementById('lista-personales');
  if (!el) return;

  const lista = Array.isArray(S.personales) ? S.personales : [];
  const resumen = calcularResumen(lista);

  if (lista.length === 0) {
    el.innerHTML = _renderEmptyState();
    return;
  }

  const hoy    = new Date();
  const oculto = S.config?.ocultarSaldo === true;

  const ordenadas  = ordenarPersonales(lista, 'antiguo');
  const activos    = ordenadas.filter(p => calcularPendiente(p, hoy) > 0);
  const liquidados = ordenadas.filter(p => calcularPendiente(p, hoy) <= 0);

  el.innerHTML = `
    ${lista.length >= 2 ? _renderResumen(resumen, oculto) : ''}
    <div class="personales-lista">
      ${[...activos, ...liquidados].map(p => _renderPersonalItem(p, hoy, oculto)).join('')}
    </div>`;
}

/**
 * @param {ReturnType<import('./logic.js').calcularResumen>} r
 * @param {boolean} oculto `S.config.ocultarSaldo` (V-4, regla R20).
 */
function _renderResumen(r, oculto) {
  const barClass = r.pctCobrado >= 100 ? ' progress-bar--complete' : '';
  // V-3: "Pendiente" primero y un paso más grande (el modificador --primary por
  // fin pinta algo, bloque C4); el histórico y el conteo quedan detrás.
  const m = (n) => oculto ? SALDO_MASCARA : f(n);
  return `
    <section class="personales-resumen" aria-label="Resumen de préstamos">
      <div class="resumen-card__grid">
        <div class="resumen-card__stat resumen-card__stat--primary">
          <p class="resumen-card__label">Pendiente</p>
          <p class="resumen-card__value">${m(r.totalPendiente)}</p>
        </div>
        <div class="resumen-card__stat">
          <p class="resumen-card__label">Te han devuelto</p>
          <p class="resumen-card__value resumen-card__value--sm text-success">${m(r.totalCobrado)}</p>
        </div>
        <div class="resumen-card__stat">
          <p class="resumen-card__label">Total prestado</p>
          <p class="resumen-card__value resumen-card__value--sm">${m(r.totalPrestado)}</p>
        </div>
        <div class="resumen-card__stat">
          <p class="resumen-card__label">Activos</p>
          <p class="resumen-card__value resumen-card__value--sm">${r.activos}</p>
        </div>
      </div>
      <div class="personales-resumen__footer">
        <div class="progress" role="progressbar" data-dom="personales"
             aria-valuenow="${r.pctCobrado}" aria-valuemin="0" aria-valuemax="100"
             aria-label="${r.pctCobrado}% cobrado">
          <div class="progress-bar${barClass}" style="width:${r.pctCobrado}%"></div>
        </div>
        <p class="personales-resumen__hint">${r.pctCobrado}% cobrado</p>
      </div>
    </section>`;
}

/**
 * @param {import('./logic.js').Personal} prestamo
 * @param {Date} hoy
 * @param {boolean} [oculto=false] `S.config.ocultarSaldo` (V-4, regla R20).
 */
function _renderPersonalItem(prestamo, hoy, oculto = false) {
  const persona    = _esc(prestamo.persona);
  const motivo     = _esc(prestamo.motivo ?? '');
  const conInteres = tieneInteres(prestamo);
  const pendiente  = calcularPendiente(prestamo, hoy);
  const liquidado  = pendiente <= 0;
  const pct        = porcentajePagado(prestamo);
  const m          = (n) => oculto ? SALDO_MASCARA_CUENTA : f(n);

  // Copy por estado (fecha pactada > último abono > antigüedad); el tono del
  // chip sigue saliendo del reloj de incomodidad (que un abono reinicia).
  const estado = estadoPrestamo(prestamo, hoy);
  const antig  = clasificarAntiguedad(calcularDias(prestamo, hoy));

  const chipClase =
    estado.tipo === 'liquidado' ? 'chip chip-success'
    : estado.tipo === 'hoy'     ? 'chip chip-warning'
    : estado.tipo === 'vencido' ? (antig === 'viejo' ? 'chip chip-danger' : 'chip chip-warning')
    : antig === 'viejo'         ? 'chip chip-danger'
    : antig === 'mediano'       ? 'chip chip-warning'
    : 'chip';

  const chipLabel = labelEstado(estado);

  const fechaLim = prestamo.fechaLimite
    ? `<p class="list-item__hint">Pactó devolver: ${fechaLegible(prestamo.fechaLimite)}</p>`
    : '';

  // Cuando hay un abono, la antigüedad cuenta desde ahí: el hint explica
  // por qué el chip de días puede ser bajo aunque el préstamo sea viejo.
  const ultimoPagoHtml = (prestamo.ultimoPago && !liquidado)
    ? `<p class="list-item__hint">Último abono: ${fechaLegible(prestamo.ultimoPago)}</p>`
    : '';

  const motivoHtml = motivo
    ? `<p class="list-item__hint">«${motivo}»</p>`
    : '';

  // Con tasa (PE.1): desglose de interés en la card. El interés cobrado solo
  // se menciona cuando existe, para no meter ruido en préstamos recién creados.
  const interesCobrado = Number(prestamo.interesPagado) || 0;
  const interesHtml = conInteres
    ? `<p class="list-item__hint">Interés: ${prestamo.tasa}% mensual${
        interesCobrado > 0 ? ` · Ya cobraste ${m(interesCobrado)} en intereses` : ''
      }</p>`
    : '';

  // V-10 (regla R8): "Me pagaron" pierde `btn-sm` y queda en el piso táctil de
  // 44px, igual que el botón de eliminar. Con la fila de C2 las acciones tienen
  // su propio renglón en móvil, así que los 8px extra no aprietan nada.
  const accionPago = liquidado
    ? ''
    : `<button class="btn btn-ghost"
                data-action="pagar-personal"
                data-id="${_esc(prestamo.id)}"
                aria-label="Registrar pago de ${persona}">Me pagaron</button>`;

  // V-2 (regla R19): la columna ancla muestra lo que decide hoy (el pendiente)
  // y el histórico acompaña debajo en secundario, solo cuando hubo abonos que
  // expliquen la diferencia. El liquidado ya no tiene pendiente que mostrar:
  // conserva el monto original, que es su cifra final.
  const hayAbonos  = (Number(prestamo.pagado) || 0) > 0;
  const montoAncla = liquidado ? m(prestamo.monto) : m(pendiente);
  const historico  = (!liquidado && hayAbonos)
    ? `<p class="personal-item__de">de ${m(prestamo.monto)}</p>`
    : '';

  // El desglose capital + interés se queda en el subtítulo: es lo que el meta no
  // puede decir. En los préstamos sin tasa duplicaba la cifra del meta y sale.
  const subtituloHtml = (conInteres && !liquidado)
    ? `<p class="list-item__subtitle">capital ${m(calcularCapitalPendiente(prestamo))} + interés ${m(calcularInteresPendiente(prestamo, hoy))}</p>`
    : '';

  return `
    <article class="list-item" data-id="${_esc(prestamo.id)}" tabindex="-1">
      <div class="list-item__icon" aria-hidden="true">${liquidado ? icon('check-circle', 'icon icon--pop') : icon('personales')}</div>
      <div class="list-item__body">
        <p class="list-item__title">${persona}</p>
        <p class="personal-item__estado"><span class="${chipClase}">${chipLabel}</span></p>
        ${subtituloHtml}
        <div class="progress" role="progressbar" data-dom="personales"
             aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
             aria-label="${pct}% cobrado">
          <div class="progress-bar${liquidado ? ' progress-bar--complete' : ''}" style="width:${pct}%"></div>
        </div>
        ${interesHtml}
        ${motivoHtml}
        ${ultimoPagoHtml}
        ${fechaLim}
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount">${montoAncla}</p>
        ${historico}
      </div>
      <div class="list-item__action">
        ${accionPago}
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-personal"
                data-id="${_esc(prestamo.id)}"
                aria-label="Eliminar préstamo a ${persona}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

/**
 * V-7 (reglas R11 y R18): un solo primario por pantalla. El botón del encabezado
 * (`index.html`) es el que crea, así que el CTA del vacío baja a secundario y
 * ambos dicen lo mismo: misma acción, mismo nombre.
 */
function _renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('personales')}</div>
      <p class="empty-state__title">Nadie te debe nada (o no lo registraste)</p>
      <p class="empty-state__desc">Registra tu primer préstamo a familia o amigos.</p>
      <button class="btn btn-secondary" data-action="nuevo-personal">+ Agregar préstamo</button>
    </div>`;
}

// ── FORM DEL MODAL ───────────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de nuevo/editar préstamo.
 *
 * PE.7: incluye el selector de la cuenta de la que sale el dinero. Con 0
 * cuentas activas no se muestra (patrón 0/1/varias) y el préstamo se registra
 * igual, como seguimiento puro que no mueve ningún saldo.
 *
 * DIS.3 (V-11): el orden pregunta primero lo esencial [persona · monto · fecha ·
 * cuenta] y después lo opcional [tasa · motivo · fecha pactada]. Antes la tasa
 * (el caso raro) era el tercer campo y empujaba el selector de cuenta y el botón
 * Guardar por debajo del borde de la hoja. Colapsar los opcionales bajo "Más
 * detalles" es una pauta nueva de formulario y se decide en CAT.4, no acá.
 *
 * @returns {string}
 */
export function renderFormPersonal() {
  const hoy = hoyISO();
  const cuentasActivas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const cuentaHtml = renderSelectorCuenta(cuentasActivas, {
    label: '¿De qué cuenta sale el dinero?',
  });
  const notaCuenta = cuentaHtml
    ? `<p class="form-hint">Se descontará de esa cuenta, porque el dinero deja de estar disponible. Cuando te paguen, vuelve a entrar.</p>`
    : '';

  return `
    <form id="form-personal" novalidate>
      <div class="form-group">
        <label for="pers-persona" class="label">A quién le prestaste</label>
        <input id="pers-persona" name="persona" class="input" type="text"
               placeholder="Ej. Tía Marta" required aria-required="true"
               autocomplete="off" maxlength="60" />
      </div>
      <div class="form-group">
        <label for="pers-monto" class="label">Monto prestado (COP)</label>
        <input id="pers-monto" name="monto" class="input" type="number"
               min="1" step="1000" placeholder="0" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="pers-fecha" class="label">Fecha del préstamo</label>
        <input id="pers-fecha" name="fecha" class="input" type="date"
               value="${hoy}" required aria-required="true" />
      </div>

      ${cuentaHtml}
      ${notaCuenta}

      <div class="form-group">
        <label for="pers-tasa" class="label">Interés mensual (%) <span class="form-optional">opcional</span></label>
        <input id="pers-tasa" name="tasa" class="input" type="number"
               min="0" max="100" step="0.1" placeholder="Ej. 2"
               inputmode="decimal" />
        <p class="form-hint">Se calcula sobre el capital pendiente; cada pago cubre primero el interés.</p>
      </div>
      <div class="form-group">
        <label for="pers-motivo" class="label">Motivo <span class="form-optional">opcional</span></label>
        <input id="pers-motivo" name="motivo" class="input" type="text"
               placeholder="Ej. mercado, favor" maxlength="80"
               autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="pers-limite" class="label">Fecha pactada de devolución <span class="form-optional">opcional</span></label>
        <input id="pers-limite" name="fechaLimite" class="input" type="date" />
        <p class="form-hint">Si pasa esta fecha, el préstamo se marca como vencido.</p>
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar préstamo</button>
      </div>
    </form>`;
}

// ── FORM PAGO PARCIAL ────────────────────────────────────────────

/**
 * Devuelve el HTML del modal para registrar un pago parcial.
 *
 * PE.7: incluye el selector de la cuenta donde entra el dinero cobrado,
 * preseleccionando la cuenta de la que salió el préstamo (lo más probable es
 * que vuelva al mismo sitio). Con 0 cuentas activas no se muestra y el cobro
 * se registra igual, sin tocar saldos.
 *
 * @param {import('./logic.js').Personal} prestamo
 * @returns {string}
 */
export function renderFormPagoPersonal(prestamo) {
  const persona    = _esc(prestamo.persona);
  const conInteres = tieneInteres(prestamo);
  const pendiente  = calcularPendiente(prestamo);

  // Con tasa (PE.1): mostrar el desglose capital/interés del pendiente y
  // explicar el orden de aplicación del pago.
  const desgloseHtml = conInteres
    ? `<br />Capital: <strong>${f(calcularCapitalPendiente(prestamo))}</strong> · Interés acumulado: <strong>${f(calcularInteresPendiente(prestamo))}</strong>`
    : '';
  const hintInteres = conInteres
    ? ' El pago cubre primero el interés acumulado y el resto baja el capital.'
    : '';

  // PE.7: la cuenta del préstamo viene preseleccionada si sigue activa; si no
  // (o si el préstamo no tenía cuenta), cae al criterio normal del selector.
  const cuentasActivas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const cuentaHtml = renderSelectorCuenta(cuentasActivas, {
    label:      '¿En qué cuenta entró el dinero?',
    selectedId: prestamo.cuentaId ?? null,
  });

  return `
    <form id="form-pago-personal" novalidate data-id="${_esc(prestamo.id)}">
      <p class="modal__intro">
        ¿Cuánto te pagó <strong>${persona}</strong>?<br />
        Pendiente actual: <strong>${f(pendiente)}</strong>${desgloseHtml}
      </p>
      <div class="form-group">
        <label for="pago-monto" class="label">Monto recibido (COP)</label>
        <input id="pago-monto" name="monto" class="input" type="number"
               min="1" max="${pendiente}" step="1000"
               value="${pendiente}" required aria-required="true" />
        <p class="form-hint">El valor que aparece es todo lo que falta por cobrar. Si solo te pagaron una parte, puedes cambiarlo.${hintInteres}</p>
      </div>
      ${cuentaHtml}
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar pago</button>
      </div>
    </form>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

// `_hoyISO` local se borró en BUG-018: era una copia literal de `hoy()`
// (infra/utils.js), que ya es la única fuente de "hoy en ISO local".
