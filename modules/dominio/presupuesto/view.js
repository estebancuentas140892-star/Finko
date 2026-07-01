/**
 * presupuesto/view.js - generación de HTML para el dominio de presupuesto.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S }                  from '../../core/state.js';
import { f, esc as _esc }     from '../../infra/utils.js';
import { icon, emptyArt }     from '../../infra/icons.js';
import {
  CATEGORIAS_GASTO_USUARIO,
  CATEGORIA_EMOJI,
  GRUPOS_FINANCIEROS,
  LABEL_GRUPO_FINANCIERO,
} from '../../core/constants.js';
import {
  presupuestosActivos,
  calcularProgreso,
  totalAsignadoMensual,
  categoriasSinPresupuesto,
  tienePresupuesto,
  alertasLimites,
  resumenGrupos,
  ejecutadoPorGrupoDelMes,
  desgloseNecesidadesDelMes,
  desgloseAhorroDelMes,
  generarMensajesLimites,
} from './logic.js';
import {
  estimarSalarioMensual,
  construirContextoDistribucion,
  sugerirDistribucionIngreso,
} from '../tesoreria/logic.js';

// ── RESUMEN + LISTA ──────────────────────────────────────────────

/**
 * Renderiza el panel completo de presupuesto en `#panel-presupuesto`.
 * Estructura (ADR 017, MC.5b):
 *   1. Resumen de los 3 grupos financieros (centro de control): asignado desde
 *      la distribución de Mis cuentas, ejecutado desde los flujos del mes.
 *   2. Detalle de Estilo de vida: los topes por categoría (envelope budgeting).
 * No-op si el contenedor no existe.
 */
export function renderPanelPresupuesto() {
  const el = document.getElementById('panel-presupuesto');
  if (!el) return;

  const ahora = new Date();
  const anio  = ahora.getFullYear();
  const mes   = ahora.getMonth() + 1;

  const activos = presupuestosActivos(S.presupuestos);

  el.innerHTML = `
    ${_renderResumenGrupos(anio, mes)}
    <section class="estilo-detalle" aria-labelledby="estilo-detalle-title">
      <h2 class="estilo-detalle__title" id="estilo-detalle-title">Estilo de vida: topes por categoría</h2>
      <p class="estilo-detalle__hint">Ponle un máximo mensual a las categorías donde más gastas. Es el detalle del grupo Estilo de vida.</p>
      ${_renderHero(activos, S.gastos, anio, mes)}
      ${activos.length === 0
        ? _renderEmptyState()
        : `<div class="envelope-list">${activos.map(p => _renderEnvelope(p, S.gastos, anio, mes)).join('')}</div>`
      }
      ${_renderSinPresupuesto(activos)}
    </section>
  `;
}

// ── RESUMEN POR GRUPO FINANCIERO (MC.5b/MC.5c, ADR 017) ──────────

/**
 * Resumen read-only de los 3 grupos financieros del mes en curso.
 * El presupuesto asignado sale de la distribución de ingreso de Mis cuentas
 * (misma función que "Distribuir mi ingreso"); el ejecutado, de los flujos ya
 * registrados. Si no hay ingreso registrado, guía al usuario a Mis cuentas.
 * Necesidades y Ahorro incluyen, además, un desglose colapsable por item
 * (MC.5c); Estilo de vida tiene el suyo más abajo (topes por categoría).
 *
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {string} HTML.
 */
function _renderResumenGrupos(anio, mes) {
  const ingresoMensual = estimarSalarioMensual(S.ingresos ?? []);
  const dist = ingresoMensual
    ? sugerirDistribucionIngreso(ingresoMensual, construirContextoDistribucion(S))
    : null;

  if (!dist) return _renderResumenGruposVacio();

  const asignadoPorGrupo = {
    'necesidades':    dist.split.necesidades.monto,
    'estilo-de-vida': dist.split.estiloVida.monto,
    'ahorro':         dist.split.ahorro.monto,
  };
  const ejecutadoPorGrupo = ejecutadoPorGrupoDelMes(
    S.gastos ?? [], S.ahorro?.aportes ?? [], anio, mes,
  );
  const resumen = resumenGrupos(asignadoPorGrupo, ejecutadoPorGrupo);

  const itemsNecesidades = desgloseNecesidadesDelMes(S.compromisos ?? [], S.gastos ?? [], anio, mes);
  const itemsAhorro       = desgloseAhorroDelMes(
    S.ahorro, S.metas ?? [], S.apartados ?? [], S.inversiones ?? [], anio, mes,
  );
  const desglosePorGrupo = {
    'necesidades':    _renderDesgloseNecesidades(itemsNecesidades),
    'estilo-de-vida': '',
    'ahorro':         _renderDesgloseAhorro(itemsAhorro),
  };

  const alertasCategoria = alertasLimites(S.presupuestos ?? [], S.gastos ?? [], anio, mes);
  const mensajes = generarMensajesLimites({ alertasCategoria, resumen, itemsNecesidades });

  const cards = GRUPOS_FINANCIEROS
    .map(g => _renderGrupoCard(g, resumen[g], desglosePorGrupo[g], _renderNudgesGrupo(mensajes, g)))
    .join('');

  return `
    <section class="grupos-resumen" aria-label="Seguimiento de tus tres grupos financieros este mes">
      <header class="grupos-resumen__header">
        <h2 class="grupos-resumen__title">Tu plan del mes por grupo</h2>
        <a href="#tesoreria" class="grupos-resumen__link" aria-label="Ajustar tu distribución en Mis cuentas">Ajustar en Mis cuentas</a>
      </header>
      ${_renderRefuerzoCombinado(mensajes)}
      <div class="grupos-resumen__grid">${cards}</div>
      <p class="grupos-resumen__nota">Mis cuentas planifica cómo repartes tu ingreso; Límites de gasto vigila que cumplas ese plan. Lo ejecutado refleja lo que registras en Finko este mes.</p>
    </section>`;
}

/**
 * Una tarjeta de grupo dentro del resumen.
 *
 * Ahorro = celebrar (ADR 019): cumplir o superar la meta es un logro, no un
 * exceso. Su tarjeta usa la paleta positiva (verde), nunca ámbar ni rojo:
 * barra `progress-bar--complete` al llegar al 100%, estado visual `logro`
 * (borde/fondo verde) y la tercera cifra en positivo ("Ahorrado de más"). Los
 * demás grupos conservan su estado de gasto (alerta/excedido) por ahora; el
 * reencuadre de Necesidades es MC.8b.
 *
 * @param {string} grupo - clave de GRUPOS_FINANCIEROS.
 * @param {{asignado:number, ejecutado:number, restante:number, pct:number, estado:string}} r
 * @param {string} [desgloseHtml=''] - HTML del detalle colapsable por item (MC.5c).
 * @param {string} [nudgesHtml=''] - HTML de alertas/refuerzos del grupo (MC.5d).
 * @returns {string} HTML.
 */
function _renderGrupoCard(grupo, r, desgloseHtml = '', nudgesHtml = '') {
  const label       = LABEL_GRUPO_FINANCIERO[grupo] ?? grupo;
  const pctVisual   = Math.min(r.pct, 100);
  const restanteNeg = r.restante < 0;
  const esAhorro    = grupo === 'ahorro';
  const ahorroLogrado = esAhorro && r.asignado > 0 && r.pct >= 100;

  const estadoVisual = esAhorro ? (ahorroLogrado ? 'logro' : 'ok') : r.estado;
  const claseBarra   = esAhorro ? (ahorroLogrado ? 'progress-bar--complete' : '') : _claseProgreso(r.pct);

  // Tercera cifra: para Ahorro, superar la meta es positivo ("Ahorrado de más",
  // verde) y no llegar aún es neutro ("Te falta"). Para el resto, disponible/excedido.
  const figLabel = esAhorro
    ? (restanteNeg ? 'Ahorrado de más' : 'Te falta')
    : (restanteNeg ? 'Excedido' : 'Disponible');
  const figClase = restanteNeg
    ? (esAhorro ? 'is-positive' : 'is-negative')
    : '';

  return `
    <article class="grupo-card" data-grupo="${grupo}" data-estado="${estadoVisual}">
      <div class="grupo-card__header">
        <p class="grupo-card__name">${label}</p>
        <span class="grupo-card__pct">${r.pct}%</span>
      </div>
      <div class="progress" role="progressbar"
           aria-valuenow="${r.pct}" aria-valuemin="0" aria-valuemax="100"
           aria-label="Uso de ${label}: ${r.pct}%">
        <div class="progress-bar ${claseBarra}" style="width:${pctVisual}%"></div>
      </div>
      <dl class="grupo-card__figs">
        <div class="grupo-card__fig">
          <dt>Ejecutado</dt>
          <dd>${f(r.ejecutado)}</dd>
        </div>
        <div class="grupo-card__fig">
          <dt>Presupuesto</dt>
          <dd>${f(r.asignado)}</dd>
        </div>
        <div class="grupo-card__fig">
          <dt>${figLabel}</dt>
          <dd class="${figClase}">${f(Math.abs(r.restante))}</dd>
        </div>
      </dl>
      ${nudgesHtml}
      ${desgloseHtml}
    </article>`;
}

// ── ALERTAS Y REFUERZOS POR ROL (MC.5d + MC.8a, ADR 017 y ADR 019) ──

const _NUDGE_CLASE = { excedido: 'nudge-high', alerta: 'nudge-medium', info: 'nudge-info', refuerzo: 'nudge-success' };
const _NUDGE_ICONO = { excedido: '⚠️', alerta: '⏰', info: 'ℹ️', refuerzo: '✅' };

/**
 * Nivel visual de un nudge según el tipo/severidad del mensaje. Los mensajes
 * de refuerzo (Ahorro) van en verde; los informativos (Necesidades, ADR 019)
 * en azul calmado; las alertas de Estilo de vida en ámbar (`alerta`) o rojo
 * (`excedido`).
 * @param {ReturnType<typeof generarMensajesLimites>[number]} m
 * @returns {'excedido'|'alerta'|'info'|'refuerzo'}
 */
function _nivelNudge(m) {
  if (m.tipo === 'refuerzo') return 'refuerzo';
  if (m.tipo === 'info')     return 'info';
  return m.severidad === 'excedido' ? 'excedido' : 'alerta';
}

/**
 * HTML de un mensaje individual, reusando el sistema de nudges de la app
 * (`.nudge nudge-high|nudge-medium|nudge-info|nudge-success`).
 * @param {ReturnType<typeof generarMensajesLimites>[number]} m
 */
function _renderNudge(m) {
  const nivel = _nivelNudge(m);
  return `
    <div class="nudge ${_NUDGE_CLASE[nivel]}" role="status">
      <span class="nudge__icon" aria-hidden="true">${_NUDGE_ICONO[nivel]}</span>
      <div class="nudge__body">
        <p class="nudge__title">${_esc(m.mensaje)}</p>
      </div>
    </div>`;
}

/**
 * Mensajes de un grupo específico (excluye el refuerzo combinado, que no
 * pertenece a ningún grupo y se muestra aparte).
 * @param {ReturnType<typeof generarMensajesLimites>} mensajes
 * @param {string} grupo
 * @returns {string} HTML.
 */
function _renderNudgesGrupo(mensajes, grupo) {
  return mensajes.filter(m => m.grupo === grupo).map(_renderNudge).join('');
}

/** Refuerzo combinado (no pertenece a ningún grupo específico). */
function _renderRefuerzoCombinado(mensajes) {
  const m = mensajes.find(x => x.grupo === null);
  return m ? _renderNudge(m) : '';
}

// ── DESGLOSE POR ITEM (MC.5c, ADR 017) ───────────────────────────

const _EMOJI_ITEM_NECESIDAD = { fijo: '🏠', deuda: '💳' };
const _ETIQUETA_ESTADO_PAGO = { ninguno: 'Pendiente', parcial: 'Abono parcial', completo: 'Pagado' };
const _EMOJI_ITEM_AHORRO    = { fondo: '🛟', meta: '🎯', apartado: '📦', inversion: '📈' };

/**
 * Detalle colapsable de Necesidades: un item por gasto fijo o deuda activa,
 * con su monto de referencia y si ya se pagó este mes.
 * @param {ReturnType<typeof desgloseNecesidadesDelMes>} items
 * @returns {string} HTML. `''` si no hay items (el caller no debería mostrar el `<details>`).
 */
function _renderDesgloseNecesidades(items) {
  if (items.length === 0) {
    return `<p class="grupo-card__desglose-empty">Aún no registras gastos fijos ni deudas en Calendario.</p>`;
  }

  const filas = items.map(it => {
    const emoji = _EMOJI_ITEM_NECESIDAD[it.tipo] ?? '📦';
    const sub   = it.estadoPago === 'ninguno'
      ? `Pendiente · ${f(it.montoReferencia)}`
      : `${_ETIQUETA_ESTADO_PAGO[it.estadoPago]} · ${f(it.ejecutado)}`;

    return `
      <li class="grupo-card__item" data-estado-pago="${it.estadoPago}">
        <span class="grupo-card__item-nombre">${emoji} ${_esc(it.descripcion)}</span>
        <span class="grupo-card__item-sub">${sub}</span>
      </li>`;
  }).join('');

  return `
    <details class="analisis-grupo grupo-card__desglose">
      <summary class="analisis-grupo__summary">Ver detalle (${items.length})</summary>
      <ul class="grupo-card__item-list" role="list">${filas}</ul>
    </details>`;
}

/**
 * Detalle colapsable de Ahorro: un item por destino (fondo, meta, apartado,
 * inversión). Solo el fondo tiene corte mensual; el resto muestra su
 * acumulado a la fecha (el copy lo aclara para no confundir con "este mes").
 * @param {ReturnType<typeof desgloseAhorroDelMes>} items
 * @returns {string} HTML.
 */
function _renderDesgloseAhorro(items) {
  if (items.length === 0) {
    return `<p class="grupo-card__desglose-empty">Aún no tienes un fondo, meta, apartado o inversión activos.</p>`;
  }

  const filas = items.map(it => {
    const emoji = _EMOJI_ITEM_AHORRO[it.tipo] ?? '📦';
    const sub   = it.tipo === 'fondo'
      ? `${f(it.aportadoEsteMes)} este mes · ${f(it.acumulado)} acumulado`
      : it.objetivo
        ? `${f(it.acumulado)} de ${f(it.objetivo)}`
        : `${f(it.acumulado)} acumulado`;

    return `
      <li class="grupo-card__item">
        <span class="grupo-card__item-nombre">${emoji} ${_esc(it.nombre)}</span>
        <span class="grupo-card__item-sub">${sub}</span>
      </li>`;
  }).join('');

  return `
    <details class="analisis-grupo grupo-card__desglose">
      <summary class="analisis-grupo__summary">Ver detalle (${items.length})</summary>
      <ul class="grupo-card__item-list" role="list">${filas}</ul>
      <p class="grupo-card__desglose-hint">Salvo el fondo de emergencia, estos montos son el acumulado a la fecha, no solo de este mes.</p>
    </details>`;
}

/** Estado vacío del resumen: sin ingreso registrado, guía a Mis cuentas. */
function _renderResumenGruposVacio() {
  return `
    <section class="grupos-resumen grupos-resumen--vacio" aria-label="Seguimiento por grupo financiero">
      <p class="grupos-resumen__vacio-title">Aún no tienes un plan del mes por grupo</p>
      <p class="grupos-resumen__vacio-desc">Registra tus ingresos y usa "Distribuir mi ingreso" en Mis cuentas para repartirlos entre Necesidades, Estilo de vida y Ahorro. Aquí verás cuánto llevas ejecutado en cada grupo.</p>
      <a href="#tesoreria" class="btn btn-secondary">Ir a Mis cuentas</a>
    </section>`;
}

// ── HERO ─────────────────────────────────────────────────────────

function _renderHero(presupuestos, gastos, anio, mes) {
  const asignado = totalAsignadoMensual(presupuestos);
  const gastado  = presupuestos.reduce((acc, p) => {
    return acc + calcularProgreso(p, gastos, anio, mes).gastado;
  }, 0);
  const restante   = asignado - gastado;
  const porcentaje = asignado > 0 ? Math.round((gastado / asignado) * 100) : 0;

  return `
    <section class="presupuesto-hero" aria-label="Resumen de tus límites de gasto del mes">
      <div class="presupuesto-hero__totales">
        <div class="presupuesto-hero__metric">
          <span class="presupuesto-hero__label">Asignado</span>
          <span class="presupuesto-hero__value">${f(asignado)}</span>
        </div>
        <div class="presupuesto-hero__metric">
          <span class="presupuesto-hero__label">Gastado</span>
          <span class="presupuesto-hero__value">${f(gastado)}</span>
        </div>
        <div class="presupuesto-hero__metric">
          <span class="presupuesto-hero__label">Restante</span>
          <span class="presupuesto-hero__value ${restante < 0 ? 'is-negative' : ''}">${f(restante)}</span>
        </div>
      </div>
      ${asignado > 0 ? `
        <div class="progress" role="progressbar"
             aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"
             aria-label="Uso total de tus límites de gasto: ${porcentaje}%">
          <div class="progress-bar ${_claseProgreso(porcentaje)}" style="width:${Math.min(porcentaje, 100)}%"></div>
        </div>
      ` : ''}
    </section>`;
}

// ── ENVELOPE INDIVIDUAL ──────────────────────────────────────────

/**
 * @param {import('../../core/state.js').Presupuesto} presupuesto
 * @param {import('../../core/state.js').Gasto[]} gastos
 */
function _renderEnvelope(presupuesto, gastos, anio, mes) {
  const { gastado, asignado, restante, porcentaje, estado } = calcularProgreso(presupuesto, gastos, anio, mes);
  const categoria = _esc(presupuesto.categoria);
  const widthVisual = Math.min(porcentaje, 100);
  const estadoIcono = estado === 'excedido' ? '⚠️ ' : estado === 'alerta' ? '⏰ ' : '';

  return `
    <article class="envelope" data-id="${_esc(presupuesto.id)}" data-estado="${estado}">
      <div class="envelope__header">
        <p class="envelope__title">${estadoIcono}${categoria}</p>
        <p class="envelope__subtitle">${f(gastado)} / ${f(asignado)}</p>
      </div>
      <div class="progress" role="progressbar"
           aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"
           aria-label="Progreso de ${categoria}: ${porcentaje}%">
        <div class="progress-bar ${_claseProgreso(porcentaje)}" style="width:${widthVisual}%"></div>
      </div>
      <p class="envelope__meta">
        <span class="envelope__porcentaje">${porcentaje}%</span>
        ${restante >= 0
          ? `· Restante: ${f(restante)}`
          : `· Excedido: <strong>${f(-restante)}</strong>`}
      </p>
      <div class="envelope__actions">
        <button class="btn btn-ghost btn-sm"
                data-action="editar-presupuesto"
                data-id="${_esc(presupuesto.id)}"
                aria-label="Editar límite de gasto de ${categoria}">Editar</button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-presupuesto"
                data-id="${_esc(presupuesto.id)}"
                aria-label="Eliminar límite de gasto de ${categoria}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

// ── CATEGORÍAS HUÉRFANAS ─────────────────────────────────────────

function _renderSinPresupuesto(presupuestos) {
  const ahora = new Date();
  const huerfanas = categoriasSinPresupuesto(presupuestos, S.gastos, ahora.getFullYear(), ahora.getMonth() + 1);
  if (huerfanas.length === 0) return '';

  return `
    <section class="envelope-huerfanas" aria-label="Categorías con gastos sin límite asignado">
      <h3 class="envelope-huerfanas__title">Categorías con gastos del mes sin límite asignado</h3>
      <ul class="envelope-huerfanas__list">
        ${huerfanas.map(h => `
          <li>
            <span class="envelope-huerfanas__cat">${_esc(h.categoria)}</span>
            <span class="envelope-huerfanas__monto">${f(h.gastado)}</span>
          </li>
        `).join('')}
      </ul>
      <p class="envelope-huerfanas__hint">Asígnales un límite para hacer seguimiento mensual.</p>
    </section>`;
}

// ── EMPTY STATE ──────────────────────────────────────────────────

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('presupuesto')}</div>
      <p class="empty-state__title">Sin límites de gasto</p>
      <p class="empty-state__desc">Pon un tope mensual por categoría, por ejemplo, $500.000 para Alimentación, y Finko te avisa cuando te acerques al límite.</p>
      <button class="btn btn-primary" data-action="nuevo-presupuesto">+ Crear límite</button>
      <p class="empty-state__tip">${icon('lightbulb')} Tip: empieza con 2 o 3 categorías donde más gastas. Finko muestra el avance en tiempo real cada vez que registras un gasto.</p>
      <p class="empty-state__tip empty-state__tip--muted">¿Quieres reunir dinero para un gasto que viene (SOAT, vacaciones)? Eso va en Apartados. Aquí solo le pones un tope a lo que gastas.</p>
    </div>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * HTML del formulario de creación/edición.
 * Si se pasa un presupuesto, el formulario viene pre-llenado para editar.
 *
 * @param {import('../../core/state.js').Presupuesto|null} [actual=null]
 * @returns {string}
 */
export function renderFormPresupuesto(actual = null) {
  const editando = !!actual;
  const opciones = CATEGORIAS_GASTO_USUARIO
    .filter(c => editando ? true : !tienePresupuesto(c, S.presupuestos))
    .map(c => {
      const selected = editando && actual.categoria === c ? 'selected' : '';
      return `<option value="${_esc(c)}" ${selected}>${CATEGORIA_EMOJI[c] ?? ''} ${_esc(c)}</option>`;
    })
    .join('');

  return `
    <form id="form-presupuesto" novalidate ${editando ? `data-id="${_esc(actual.id)}"` : ''}>
      <div class="form-group">
        <label for="presupuesto-categoria" class="label">Categoría</label>
        <select id="presupuesto-categoria" name="categoria" class="input" required aria-required="true"
                ${editando ? 'disabled' : ''}>
          <option value="">Elige una categoría…</option>
          ${opciones}
        </select>
        ${editando
          ? '<p class="form-hint">La categoría no se puede cambiar. Si necesitas otra, elimina este límite y crea uno nuevo.</p>'
          : ''}
      </div>
      <div class="form-group">
        <label for="presupuesto-monto" class="label">Monto mensual (COP)</label>
        <input id="presupuesto-monto" name="montoMensual" class="input" type="number"
               min="1" step="10000" required aria-required="true"
               value="${editando ? actual.montoMensual : ''}"
               placeholder="500000" />
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${editando ? 'Guardar cambios' : 'Crear límite'}</button>
      </div>
    </form>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

function _claseProgreso(porcentaje) {
  if (porcentaje > 100) return 'progress-bar--danger';
  if (porcentaje >= 75) return 'progress-bar--warn';
  return '';
}

// ── PANEL DE ALERTAS EN DASHBOARD ───────────────────────────────

/**
 * Renderiza en `#panel-limites` las alertas de límites de gasto del mes actual.
 * Solo aparece cuando hay envelopes en estado 'alerta' (>=75%) o 'excedido' (>100%).
 * No-op si el contenedor no existe.
 */
export function renderPanelLimites() {
  const el = document.getElementById('panel-limites');
  if (!el) return;

  const hoy    = new Date();
  const anio   = hoy.getFullYear();
  const mes    = hoy.getMonth() + 1;
  const alertas = alertasLimites(S.presupuestos ?? [], S.gastos ?? [], anio, mes);

  if (alertas.length === 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const items = alertas.map(a => {
    const emoji    = CATEGORIA_EMOJI[a.categoria] ?? '📦';
    const cls      = a.estado === 'excedido' ? 'excedido' : 'alerta';
    const badgeTxt = a.estado === 'excedido'
      ? `Superado ${a.porcentaje}%`
      : `${a.porcentaje}% usado`;
    const sub = a.estado === 'excedido'
      ? `Gastaste ${f(a.gastado)} de ${f(a.asignado)} (${f(a.gastado - a.asignado)} extra)`
      : `Te quedan ${f(a.asignado - a.gastado)} de ${f(a.asignado)}`;

    return `
      <li class="limites-card__item">
        <div class="limites-card__body">
          <p class="limites-card__name">${emoji} ${_esc(a.categoria)}</p>
          <p class="limites-card__sub">${sub}</p>
        </div>
        <span class="limites-card__badge limites-card__badge--${cls}">${badgeTxt}</span>
      </li>`;
  }).join('');

  const n      = alertas.length;
  const titulo = n === 1 ? '1 límite de gasto en alerta' : `${n} límites de gasto en alerta`;

  el.innerHTML = `
    <section class="limites-card" aria-label="Alertas de límites de gasto">
      <header class="limites-card__header">
        <h2 class="limites-card__title">${icon('presupuesto')} ${titulo}</h2>
        <a href="#presupuesto" class="limites-card__link" aria-label="Ir a Límites de gasto">Ver todos</a>
      </header>
      <ul class="limites-card__list" role="list">
        ${items}
      </ul>
    </section>`;
}
