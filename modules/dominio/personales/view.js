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
  estadoPrestamo,
  labelEstado,
  porcentajePagado,
  calcularResumen,
  agruparPersonalesPorUrgencia,
  tieneInteres,
  historialAbonos,
  calcularRendimiento,
  estadisticasPorPersona,
} from './logic.js';

/**
 * Porcentaje con un decimal como máximo y coma decimal (es-CO). `2` sale "2",
 * `2.5` sale "2,5": el entero redondo no se escribe "2,0".
 * @param {number} n
 * @returns {string}
 */
function _pct(n) {
  return Number(n).toLocaleString('es-CO', { maximumFractionDigits: 1 });
}

// ── LISTA + RESUMEN ──────────────────────────────────────────────

/**
 * Renderiza la lista de préstamos en `#lista-personales` + el resumen arriba.
 * No-op si el contenedor no existe.
 *
 * DIS.3 (V-8, regla R21): los liquidados se listan después de los activos, con
 * el mismo criterio "más viejos primero" dentro de cada grupo. El corte es de
 * la vista, porque es una decisión de presentación.
 *
 * MOV.1 ficha 14 (C1): los activos ya no son una sola tirada por antigüedad.
 * `agruparPersonalesPorUrgencia()` los reparte por urgencia de cobro y acá se
 * nombran los grupos; "más viejos primero" sigue mandando dentro de cada uno.
 *
 * DSK.5a (ADR 074 D4): ese corte ahora **se ve**. Estaba tomado en el código y
 * en el comentario de arriba desde DIS.3, pero en pantalla eran cinco tarjetas
 * seguidas y el único indicio era el chip verde de cada liquidada: con dos de
 * cinco cerradas, el 40 % de la lista era historia con el mismo peso visual que
 * lo que sigue abierto. El rótulo solo aparece si hay liquidadas.
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

  const { vencidos, vencenHoy, sinFecha, adelante, liquidados } =
    agruparPersonalesPorUrgencia(lista, hoy);

  // Los rótulos son de la vista, igual que el corte de los liquidados: `logic.js`
  // devuelve los grupos y acá se nombran. Los divisores aparecen desde dos
  // préstamos, el mismo umbral del resumen: con uno solo el rótulo describiría
  // la lista entera y añadiría un renglón sin dividir nada.
  //
  // "La fecha es hoy" no está en la ficha, que nombra tres grupos. Va aparte de
  // "La fecha ya pasó" porque el chip de esas filas dice "Vence hoy": meterlas
  // bajo un rótulo que diga que la fecha pasó sería contradecirlas en la misma
  // pantalla, y juntarlas con "Con fecha por delante" las hundiría por debajo
  // de préstamos menos urgentes.
  const grupos = [
    ['La fecha ya pasó',      vencidos],
    ['La fecha es hoy',       vencenHoy],
    ['Sin fecha pactada',     sinFecha],
    ['Con fecha por delante', adelante],
  ].filter(([, g]) => g.length > 0);

  const conDivisor = lista.length >= 2;
  const activosHtml = grupos.map(([rotulo, g]) => `
      ${conDivisor ? `<p class="personales-corte">${rotulo}</p>` : ''}
      ${g.map(p => _renderPersonalItem(p, hoy, oculto)).join('')}`).join('');

  el.innerHTML = `
    ${lista.length >= 2 ? _renderResumen(resumen, oculto) : ''}
    ${_renderPorPersona(lista, hoy, oculto)}
    <div class="personales-lista">
      ${activosHtml}
      ${liquidados.length > 0 ? '<p class="personales-corte">Ya te pagaron</p>' : ''}
      ${liquidados.map(p => _renderPersonalItem(p, hoy, oculto)).join('')}
    </div>`;
}

/**
 * Historial por persona (PE.6e, ADR 047 D5), plegado bajo el resumen.
 *
 * Solo aparece para quien tiene **más de un préstamo**: con uno solo, el bloque
 * repetiría la fila que está justo debajo y no habría historial del cual hablar.
 *
 * El copy describe y no califica (D5, ADR 003): dice cuántos préstamos hubo,
 * cuánto volvió y qué pasó con las fechas pactadas. Nada de puntajes, bandas ni
 * semáforos sobre una persona que ni siquiera usa la app. Los préstamos sin
 * fecha pactada no aparecen en el conteo de puntualidad porque no había fecha
 * que cumplir, y decirlo así es lo que evita que la ausencia parezca una falta.
 *
 * @param {import('./logic.js').Personal[]} lista
 * @param {Date} hoy
 * @param {boolean} oculto `S.config.ocultarSaldo` (V-4, regla R20).
 * @returns {string} '' si nadie tiene más de un préstamo.
 */
function _renderPorPersona(lista, hoy, oculto) {
  const conVarios = estadisticasPorPersona(lista, hoy).filter(e => e.prestamos > 1);
  if (conVarios.length === 0) return '';

  const m = (n) => oculto ? SALDO_MASCARA_CUENTA : f(n);

  const filas = conVarios.map(e => {
    const puntualidad = e.conFechaPactada > 0
      ? `<p class="persona-stat__linea">Con fecha pactada: ${e.aTiempo} a tiempo, ${e.conRetraso} con retraso.</p>`
      : '';
    const duracion = e.diasPromedioEnDevolver !== null
      ? `<p class="persona-stat__linea">${e.liquidados === 1
          ? `El préstamo que cerró lo cerró en ${e.diasPromedioEnDevolver} días.`
          : `Los que cerró los cerró en ${e.diasPromedioEnDevolver} días en promedio.`}</p>`
      : '';
    return `
        <li class="persona-stat">
          <p class="persona-stat__nombre">${_esc(e.persona)}</p>
          <p class="persona-stat__linea">${e.prestamos} préstamos: le prestaste ${m(e.totalPrestado)} y te devolvió ${m(e.totalRecuperado)}.</p>
          ${puntualidad}
          ${duracion}
        </li>`;
  }).join('');

  return `
    <details class="personales-personas">
      <summary class="personales-personas__summary">Historial por persona</summary>
      <ul class="personales-personas__lista">${filas}
      </ul>
    </details>`;
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

  // PE.6d (ADR 047 D6): los cinco estados (al día, próximo a vencer, pago
  // parcial, vencido, finalizado) se distinguen de un vistazo por tipo, no por
  // antigüedad en días: un vencido es vencido aunque sea reciente, y mezclar
  // el reloj de incomodidad aquí volvía indistinguibles pago parcial y al día.
  // `abonado` (pago parcial) gana chip-info: sin eso caía en el mismo `chip`
  // plano que `pendiente` (al día), el par que el punto 7 del ADR 047 pedía
  // distinguir. Sin colores nuevos: chip-info ya existe en atoms.css.
  const estado = estadoPrestamo(prestamo, hoy);

  const chipClase =
    estado.tipo === 'liquidado' ? 'chip chip-success'
    : estado.tipo === 'vencido' ? 'chip chip-danger'
    : (estado.tipo === 'proximo' || estado.tipo === 'hoy') ? 'chip chip-warning'
    : estado.tipo === 'abonado' ? 'chip chip-info'
    : 'chip';

  const chipLabel = labelEstado(estado);

  // DSK.5b (ADR 074 D2): las notas dejan de ser párrafos apilados y pasan a
  // chips, que es lo que son: datos cortos de contexto. Es la anatomía que
  // `.deuda-card` ya estrenó en la sección espejo, cuyo propio comentario dice
  // que "reemplaza al .list-item con hints apilados". A 1376 cada uno de estos
  // párrafos medía 970px para un texto de 30 a 60 caracteres, y eran hasta
  // tres seguidos bajo el nombre.
  const fechaLim = prestamo.fechaLimite
    ? `<span class="chip">Pactó devolver: ${fechaLegible(prestamo.fechaLimite)}</span>`
    : '';

  // MOV.1 ficha 14 (C2): `calcularTotalPorCobrar()` filtra por `cuentaId` antes
  // de sumar, así que un préstamo sin cuenta vinculada no entra al "Por cobrar"
  // del patrimonio en Análisis. La regla del código es correcta (no salió de
  // ninguna cuenta registrada); lo que faltaba era decirlo donde se ve. Ámbar
  // de aviso y no rojo de error: no es un fallo del usuario, es una elección
  // válida que tiene una consecuencia fuera de esta lista. La redacción final
  // depende de cómo Análisis presente "Por cobrar" y se verifica en la ficha 16.
  const soloSeguimiento = (!prestamo.cuentaId && !liquidado)
    ? '<span class="chip chip-warning">Solo seguimiento: no salió de ninguna cuenta</span>'
    : '';

  // Cuando hay un abono, la antigüedad cuenta desde ahí: el chip explica
  // por qué el de días puede ser bajo aunque el préstamo sea viejo.
  const ultimoPagoHtml = (prestamo.ultimoPago && !liquidado)
    ? `<span class="chip">Último abono: ${fechaLegible(prestamo.ultimoPago)}</span>`
    : '';

  // El motivo NO es un chip: es una cita del usuario, no un dato. Se queda
  // como texto, en una sola línea.
  const motivoHtml = motivo
    ? `<p class="personal-item__motivo">«${motivo}»</p>`
    : '';

  // Con tasa (PE.1): desglose de interés en la card. El interés cobrado solo
  // se menciona cuando existe, para no meter ruido en préstamos recién creados.
  //
  // PE.6c (ADR 047 D4): a lo cobrado se le suma cuánto representa sobre lo
  // prestado, que es la pregunta que el monto solo no responde. El liquidado
  // cambia a pasado cerrado: ya no hay nada que seguir, hay un resultado.
  const rend = conInteres ? calcularRendimiento(prestamo, hoy) : null;
  const interesHtml = conInteres
    ? (liquidado
        ? `<span class="chip">Te dejó ${m(rend.interesGanado)} en intereses, el ${_pct(rend.rentabilidad)}% de lo que prestaste.</span>`
        : `<span class="chip">Interés: ${prestamo.tasa}% mensual${
            rend.interesGanado > 0 ? ` · Ya ganaste ${m(rend.interesGanado)}, el ${_pct(rend.rentabilidad)}% de lo prestado` : ''
          }</span>`)
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
    <article class="list-item${liquidado ? ' personal-item--liquidado' : ''}" data-id="${_esc(prestamo.id)}" tabindex="-1">
      <div class="list-item__icon" aria-hidden="true">${liquidado ? icon('check-circle', 'icon icon--pop') : icon('personales')}</div>
      <div class="list-item__body">
        <p class="list-item__title">${persona}</p>
        <p class="personal-item__estado"><span class="${chipClase}">${chipLabel}</span></p>
        ${subtituloHtml}
        ${motivoHtml}
        <div class="personal-item__notas">
          ${interesHtml}
          ${ultimoPagoHtml}
          ${fechaLim}
          ${soloSeguimiento}
        </div>
        <div class="personal-item__avance">
          <div class="progress" role="progressbar" data-dom="personales"
               aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
               aria-label="${pct}% cobrado">
            <div class="progress-bar${liquidado ? ' progress-bar--complete' : ''}" style="width:${pct}%"></div>
          </div>
          <span class="personal-item__avance-t">${pct}% cobrado</span>
        </div>
        ${_renderHistorialAbonos(prestamo, conInteres, m)}
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount">${montoAncla}</p>
        ${historico}
      </div>
      <div class="list-item__action">
        ${accionPago}
        <button class="btn btn-ghost btn-icon"
                data-action="editar-personal"
                data-id="${_esc(prestamo.id)}"
                aria-label="Editar préstamo a ${persona}"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-personal"
                data-id="${_esc(prestamo.id)}"
                aria-label="Eliminar préstamo a ${persona}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

/**
 * Historial de abonos de un préstamo (PE.6b, ADR 047 D3), plegado.
 *
 * Va colapsado en un `<details>` nativo, sin JS: la fila ya ancla el pendiente
 * (regla R19) y el historial es consulta, no lo que se decide de un vistazo.
 * Mismo criterio y mismo mecanismo que los desplegables de Ajustes y Análisis.
 *
 * El abono `agrupado` (el que dejó la migración v33 → v34) se rotula distinto a
 * propósito: dice que resume lo cobrado antes de que existiera el historial, en
 * vez de hacer pasar una fecha aproximada por una fecha exacta.
 *
 * @param {import('./logic.js').Personal} prestamo
 * @param {boolean} conInteres
 * @param {(n: number) => string} m helper de dinero con máscara (V-4, regla R20).
 * @returns {string} '' si el préstamo no tiene abonos registrados.
 */
function _renderHistorialAbonos(prestamo, conInteres, m) {
  const abonos = historialAbonos(prestamo);
  if (abonos.length === 0) return '';

  const filas = abonos.map(a => {
    const desglose = (conInteres && Number(a.aInteres) > 0)
      ? `<span class="personal-abono__desglose">capital ${m(a.aCapital)} · interés ${m(a.aInteres)}</span>`
      : '';
    const cuando = a.agrupado
      ? 'Antes de este historial'
      : (a.fecha ? fechaLegible(a.fecha) : 'Sin fecha');
    return `
        <li class="personal-abono">
          <span class="personal-abono__fecha">${_esc(cuando)}</span>
          <span class="personal-abono__monto">${m(a.monto)}</span>
          ${desglose}
        </li>`;
  }).join('');

  const resumen = abonos.length === 1
    ? 'Ver el abono recibido'
    : `Ver los ${abonos.length} abonos recibidos`;

  return `
        <details class="personal-item__abonos">
          <summary class="personal-item__abonos-summary">${resumen}</summary>
          <ul class="personal-item__abonos-lista">${filas}
          </ul>
        </details>`;
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
      <button class="btn btn-secondary" data-action="nuevo-personal">${icon('plus')} Nuevo préstamo</button>
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
 * EDIT.1: con `prestamo`, prellena los campos para editar en vez de crear. La
 * cuenta de origen no se vuelve a preguntar (mismo criterio que Inversión,
 * ADR 053): si el préstamo tiene `cuentaId`, se muestra como nota de solo
 * lectura (`_renderCuentaEditable`); reasignarla permitiría mover el
 * descuento histórico de una cuenta a otra sin dejar rastro.
 *
 * DIS.3 (V-11): el orden pregunta primero lo esencial [persona · monto · fecha ·
 * cuenta] y después lo opcional [tasa · motivo · fecha pactada]. Antes la tasa
 * (el caso raro) era el tercer campo y empujaba el selector de cuenta y el botón
 * Guardar por debajo del borde de la hoja. Colapsar los opcionales bajo "Más
 * detalles" es una pauta nueva de formulario y se decide en CAT.4, no acá.
 *
 * @param {{ prestamo?: import('./logic.js').Personal|null }} [opts]
 * @returns {string}
 */
export function renderFormPersonal({ prestamo = null } = {}) {
  const hoy = hoyISO();
  const cuentaHtml = prestamo
    ? _renderCuentaEditable(prestamo)
    : _renderCuentaSelector();
  const botonTexto = prestamo ? 'Actualizar préstamo' : 'Guardar préstamo';

  return `
    <form id="form-personal" novalidate>
      <div class="form-group">
        <label for="pers-persona" class="label">A quién le prestaste</label>
        <input id="pers-persona" name="persona" class="input" type="text"
               placeholder="Ej. Tía Marta" required aria-required="true"
               autocomplete="off" maxlength="60"
               value="${_esc(prestamo?.persona ?? '')}" />
      </div>
      <div class="form-group">
        <label for="pers-monto" class="label">Monto prestado (COP)</label>
        <input id="pers-monto" name="monto" class="input" type="number"
               min="1" step="1000" placeholder="0" required aria-required="true"
               value="${prestamo ? Number(prestamo.monto) || '' : ''}" />
      </div>
      <div class="form-group">
        <label for="pers-fecha" class="label">Fecha del préstamo</label>
        <input id="pers-fecha" name="fecha" class="input" type="date"
               value="${prestamo ? _esc(prestamo.fecha ?? '') : hoy}" required aria-required="true" />
      </div>

      ${cuentaHtml}

      <div class="form-group">
        <label for="pers-tasa" class="label">Interés mensual (%) <span class="form-optional">opcional</span></label>
        <input id="pers-tasa" name="tasa" class="input" type="number"
               min="0" max="100" step="0.1" placeholder="Ej. 2"
               inputmode="decimal"
               value="${prestamo && tieneInteres(prestamo) ? prestamo.tasa : ''}" />
        <p class="form-hint">Se calcula sobre el capital pendiente; cada pago cubre primero el interés.</p>
      </div>
      <div class="form-group">
        <label for="pers-motivo" class="label">Motivo <span class="form-optional">opcional</span></label>
        <input id="pers-motivo" name="motivo" class="input" type="text"
               placeholder="Ej. mercado, favor" maxlength="80"
               autocomplete="off"
               value="${_esc(prestamo?.motivo ?? '')}" />
      </div>
      <div class="form-group">
        <label for="pers-limite" class="label">Fecha pactada de devolución <span class="form-optional">opcional</span></label>
        <input id="pers-limite" name="fechaLimite" class="input" type="date"
               value="${_esc(prestamo?.fechaLimite ?? '')}" />
        <p class="form-hint">Si pasa esta fecha, el préstamo se marca como vencido.</p>
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${botonTexto}</button>
      </div>
    </form>`;
}

/** Selector de cuenta de origen al crear (PE.7). */
function _renderCuentaSelector() {
  const cuentasActivas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const cuentaHtml = renderSelectorCuenta(cuentasActivas, {
    label: '¿De qué cuenta sale el dinero?',
  });
  const notaCuenta = cuentaHtml
    ? `<p class="form-hint">Se descontará de esa cuenta, porque el dinero deja de estar disponible. Cuando te paguen, vuelve a entrar.</p>`
    : '';
  return `${cuentaHtml}${notaCuenta}`;
}

/**
 * Nota de solo lectura del origen del dinero al editar (EDIT.1). Ver el
 * porqué de no reabrir la pregunta en `renderFormPersonal`.
 * @param {import('./logic.js').Personal} prestamo
 * @returns {string} '' si el préstamo no tiene cuenta de origen.
 */
function _renderCuentaEditable(prestamo) {
  if (!prestamo.cuentaId) return '';
  const cuenta = (S.cuentas ?? []).find(c => c.id === prestamo.cuentaId);
  return `
      <p class="form-hint">Este dinero salió de <strong>${_esc(cuenta?.nombre ?? 'una cuenta')}</strong>. Si cambias el monto, Finko ajusta el saldo de esa cuenta.</p>`;
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
