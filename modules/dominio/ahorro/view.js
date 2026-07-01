/**
 * ahorro/view.js - HTML del dominio Ahorro (J.1).
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, esc as _esc } from '../../infra/utils.js';
import { icon, emptyArt } from '../../infra/icons.js';
import { progressRing } from '../../infra/svg.js';
import {
  calcularObjetivoFondo,
  calcularProgresoFondo,
  mesesDeColchon,
  calcularMontoTotalFondo,
  ordenarAportesPorFecha,
  consolidarAhorro,
  META_MESES_MIN,
  META_MESES_MAX,
} from './logic.js';

// Mapa clave de vehículo → sección de destino + emoji. Solo routing/UI, no lógica.
const _VEHICULO_META = {
  fondo:       { seccion: 'ahorro',    emoji: '🛡️' },
  metas:       { seccion: 'metas',     emoji: '🎯' },
  apartados:   { seccion: 'apartados', emoji: '📦' },
  inversiones: { seccion: 'inversion', emoji: '📈' },
};

// ── RENDER PRINCIPAL ─────────────────────────────────────────────

/**
 * Renderiza el panel de Ahorro en `#panel-ahorro`.
 *
 * @param {number}      gastosFijosMensuales COP/mes calculado por index.js desde
 *                                           S.compromisos (regla ADN #10: view no
 *                                           lee otros dominios).
 * @param {number|null} tasaAhorro           Tasa de ahorro mensual (%) calculada
 *                                           por index.js desde S.ingresos + S.gastos.
 *                                           null si no hay ingresos registrados.
 */
export function renderAhorro(gastosFijosMensuales, tasaAhorro = null) {
  const el = document.getElementById('panel-ahorro');
  if (!el) return;

  const fondo = S.ahorro?.fondoEmergencia ?? { activo: false, metaMeses: 3, montoActual: 0 };

  if (!fondo.activo) {
    el.innerHTML = _renderEmptyState(gastosFijosMensuales);
    return;
  }

  el.innerHTML = _renderHero(fondo, gastosFijosMensuales, tasaAhorro);
}

// ── CONSOLIDADO DE AHORRO (F6) ───────────────────────────────────

/**
 * Renderiza en `#panel-ahorro-consolidado` el total de ahorro repartido entre
 * los cuatro vehículos (fondo, metas, apartados, inversiones). Solo lectura.
 *
 * Lee S directamente (permitido para un view), pero NO importa otros dominios:
 * suma inline los montos de cada slice, igual que compromisos/views/dashboard.js
 * lee S.personales y S.apartados sin importar esos módulos (regla ADN #10).
 *
 * Se oculta cuando el total es 0 (patrón [hidden] del resto de paneles).
 * No-op si el contenedor no existe.
 */
export function renderResumenAhorroConsolidado() {
  const el = document.getElementById('panel-ahorro-consolidado');
  if (!el) return;

  const fondo = S.ahorro?.fondoEmergencia ?? { activo: false };
  const fondoTotal = fondo.activo
    ? calcularMontoTotalFondo(fondo.montoActual, Array.isArray(S.ahorro?.aportes) ? S.ahorro.aportes : [])
    : 0;

  const metasTotal = (Array.isArray(S.metas) ? S.metas : [])
    .filter(m => m.completada !== true)
    .reduce((sum, m) => sum + (Number(m.montoActual) || 0), 0);

  const apartadosTotal = (Array.isArray(S.apartados) ? S.apartados : [])
    .reduce((sum, a) => sum + (Number(a.montoActual) || 0), 0);

  const inversionesTotal = (Array.isArray(S.inversiones) ? S.inversiones : [])
    .reduce((sum, i) => sum + (Number(i.monto) || 0), 0);

  const { total, desglose } = consolidarAhorro({
    fondo:       fondoTotal,
    metas:       metasTotal,
    apartados:   apartadosTotal,
    inversiones: inversionesTotal,
  });

  if (total <= 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const filas = desglose.map(d => {
    const meta = _VEHICULO_META[d.clave] ?? { seccion: 'ahorro', emoji: '💰' };
    const enlace = d.clave === 'fondo'
      ? ''
      : `<a href="#${meta.seccion}" class="ahorro-total__link" aria-label="Ir a ${_esc(d.label)}">Ver →</a>`;
    return `
      <li class="ahorro-total__item">
        <span class="ahorro-total__nombre">${meta.emoji} ${_esc(d.label)}</span>
        <span class="ahorro-total__barra" aria-hidden="true">
          <span class="ahorro-total__barra-fill" style="width:${d.pct}%"></span>
        </span>
        <span class="ahorro-total__monto">${f(d.monto)} <span class="ahorro-total__pct">${d.pct}%</span></span>
        ${enlace}
      </li>`;
  }).join('');

  el.innerHTML = `
    <section class="ahorro-total" aria-label="Tu ahorro total">
      <header class="ahorro-total__header">
        <p class="ahorro-total__label">Tu ahorro total</p>
        <p class="ahorro-total__valor">${f(total)}</p>
        <p class="ahorro-total__sub">Suma de fondo, metas, apartados e inversiones.</p>
      </header>
      <ul class="ahorro-total__lista" role="list">
        ${filas}
      </ul>
    </section>`;
}

// ── EMPTY STATE ──────────────────────────────────────────────────

function _renderEmptyState(gastosFijosMensuales) {
  const objetivoPreview = calcularObjetivoFondo(gastosFijosMensuales, 3);
  const preview = objetivoPreview > 0
    ? `<p class="empty-state__tip">${icon('analisis')} Con tus gastos fijos actuales, 3 meses de colchón equivalen a <strong>${f(objetivoPreview)}</strong>.</p>`
    : `<p class="empty-state__tip">${icon('lightbulb')} Tip: registra tus gastos fijos (arriendo, servicios, suscripciones) desde Calendario para que Finko calcule cuánto necesitas en tu fondo.</p>`;

  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('ahorro')}</div>
      <p class="empty-state__title">Empieza tu fondo de emergencia</p>
      <p class="empty-state__desc">Es la base de cualquier plan financiero: un colchón con 3 a 6 meses de tus gastos fijos para imprevistos (salud, trabajo, casa). Sin esto, una urgencia se paga con deuda cara.</p>
      <button class="btn btn-primary" data-action="ahorro-activar-fondo">+ Activar fondo</button>
      ${preview}
    </div>`;
}

// ── HERO DEL FONDO (estado activo) ───────────────────────────────

function _renderHero(fondo, gastosFijosMensuales, tasaAhorro) {
  const { metaMeses, montoActual: montoBase } = fondo;
  const aportes    = Array.isArray(S.ahorro?.aportes) ? S.ahorro.aportes : [];
  const montoTotal = calcularMontoTotalFondo(montoBase, aportes);
  const objetivo   = calcularObjetivoFondo(gastosFijosMensuales, metaMeses);
  const progreso   = calcularProgresoFondo(montoTotal, objetivo);
  const colchon    = mesesDeColchon(montoTotal, gastosFijosMensuales);
  const { porcentaje, faltante, completado } = progreso;

  const claseAnillo = completado ? 'complete' : porcentaje >= 80 ? 'near' : 'default';

  const subColchon = colchon === null
    ? `<span class="fondo-hero__sub">Registra tus gastos fijos para ver cuántos meses cubre.</span>`
    : completado
      ? `<span class="fondo-hero__sub fondo-hero__sub--ok">Cubre ${_fmtMeses(colchon)} de tus gastos fijos.</span>`
      : `<span class="fondo-hero__sub">Cubre ${_fmtMeses(colchon)} de los ${metaMeses} que apuntas.</span>`;

  const labelObjetivo = objetivo > 0
    ? `Objetivo: ${f(objetivo)} (${metaMeses} ${metaMeses === 1 ? 'mes' : 'meses'} de gastos fijos)`
    : `Aún no hay un objetivo: registra tus gastos fijos para calcularlo.`;

  const faltanteHtml = !completado && objetivo > 0
    ? `<p class="fondo-hero__faltante">Te faltan <strong>${f(faltante)}</strong>.</p>`
    : '';

  const banner = completado
    ? `<p class="fondo-hero__banner" role="status">${icon('trophy')} ¡Fondo de emergencia completo! Cualquier aporte extra suma colchón.</p>`
    : '';

  const compromisoMensual = Number(S.ahorro?.compromisoMensual) || 0;

  return `
    <article class="fondo-hero" aria-label="Fondo de emergencia">
      <header class="fondo-hero__header">
        <div class="progress-ring-wrap progress-ring-wrap--${claseAnillo}" aria-hidden="true">
          ${progressRing(porcentaje, { size: 88, strokeWidth: 7, ariaLabel: `Fondo de emergencia: ${porcentaje}%` })}
        </div>
        <div class="fondo-hero__title-wrap">
          <p class="fondo-hero__label">Fondo de emergencia</p>
          <p class="fondo-hero__title">${f(montoTotal)}</p>
          ${subColchon}
          ${faltanteHtml}
        </div>
        <button class="btn btn-ghost btn-icon"
                data-action="ahorro-editar"
                aria-label="Editar fondo de emergencia">
          <svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg>
        </button>
      </header>

      <p class="fondo-hero__meta">
        <span class="fondo-hero__meta-label">${labelObjetivo}</span>
      </p>

      ${banner}
    </article>

    ${_renderHabitoSection(aportes, compromisoMensual, tasaAhorro)}`;
}

// ── SECCIÓN DE HÁBITO (aportes + compromiso + tasa) ──────────────

function _renderHabitoSection(aportes, compromisoMensual, tasaAhorro) {
  const ordenados = ordenarAportesPorFecha(aportes);

  const compromisoHtml = compromisoMensual > 0
    ? `<div class="ahorro-habito__compromiso">
        <span>${icon('deudas')} Compromiso mensual: <strong>${f(compromisoMensual)}</strong></span>
        <button class="btn btn-ghost btn-sm" data-action="ahorro-editar-compromiso"
                aria-label="Editar compromiso mensual">Editar</button>
      </div>`
    : `<p class="ahorro-habito__sin-compromiso">
        ¿Cuánto quieres apartar cada mes?
        <button class="btn btn-ghost btn-sm" data-action="ahorro-editar-compromiso">Definir →</button>
      </p>`;

  const listaHtml = ordenados.length === 0
    ? `<p class="ahorro-habito__empty">Aún no has registrado aportes. Cada vez que apartes dinero para el fondo, regístralo aquí.</p>`
    : `<ul class="ahorro-habito__lista" role="list">
        ${ordenados.map(_renderAporteItem).join('')}
      </ul>`;

  const tasaHtml = tasaAhorro !== null
    ? _renderNudgeTasa(tasaAhorro)
    : '';

  return `
    <section class="ahorro-habito" aria-label="Historial de aportes">
      <div class="ahorro-habito__header">
        <h2 class="ahorro-habito__title">Aportes al fondo</h2>
        <button class="btn btn-sm btn-primary" data-action="ahorro-nuevo-aporte">+ Registrar</button>
      </div>
      ${compromisoHtml}
      ${listaHtml}
      ${tasaHtml}
    </section>`;
}

/** @param {{id:string, monto:number, fecha:string, nota?:string}} aporte */
function _renderAporteItem(aporte) {
  const nota = aporte.nota ? ` · ${_esc(aporte.nota)}` : '';
  return `
    <li class="list-item" data-id="${_esc(aporte.id)}">
      <div class="list-item__body">
        <p class="list-item__title">${f(aporte.monto)}</p>
        <p class="list-item__subtitle">${fechaLegible(aporte.fecha)}${nota}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="ahorro-eliminar-aporte"
                data-id="${_esc(aporte.id)}"
                aria-label="Eliminar aporte de ${f(aporte.monto)}">
          <svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg>
        </button>
      </div>
    </li>`;
}

function _renderNudgeTasa(tasaAhorro) {
  let icono, titulo, desc, nivel;

  if (tasaAhorro >= 20) {
    icono = icon('trophy'); nivel = 'nudge-success';
    titulo = `Excelente: ahorras el ${tasaAhorro}% de tus ingresos este mes.`;
    desc   = 'Superas el umbral recomendado del 20%. ¡Sigue así!';
  } else if (tasaAhorro >= 10) {
    icono = icon('inversion'); nivel = 'nudge-info';
    titulo = `Ahorras el ${tasaAhorro}% de tus ingresos este mes.`;
    desc   = 'Vas bien. La meta recomendada es el 20%. Un poco más y llegas.';
  } else if (tasaAhorro > 0) {
    icono = icon('lightbulb'); nivel = 'nudge-medium';
    titulo = `Ahorras el ${tasaAhorro}% de tus ingresos este mes.`;
    desc   = 'Antes de recortar el ahorro, revisa tus gastos de estilo de vida (entretenimiento, salidas, suscripciones). Son los más fáciles de ajustar.';
  } else if (tasaAhorro === 0) {
    icono = icon('alert'); nivel = 'nudge-medium';
    titulo = 'Este mes tus gastos igualan tus ingresos.';
    desc   = 'Revisa primero tus gastos de estilo de vida: entretenimiento, salidas, suscripciones. Son más fáciles de reducir que los fijos.';
  } else {
    icono = icon('alert'); nivel = 'nudge-high';
    titulo = `Este mes tus gastos superan tus ingresos en ${Math.abs(tasaAhorro)}%.`;
    desc   = 'Antes de tocar el ahorro, reduce gastos de estilo de vida. Si no alcanza, revisa tus gastos fijos.';
  }

  return `
    <div class="nudge ${nivel}" role="status">
      <span class="nudge__icon" aria-hidden="true">${icono}</span>
      <div class="nudge__body">
        <p class="nudge__title">${titulo}</p>
        <p class="nudge__desc">${desc}</p>
      </div>
    </div>`;
}

// ── FORMULARIO MODAL - FONDO (activar / editar) ──────────────────

/**
 * HTML del formulario para activar el fondo o editarlo (monto base + meta de meses).
 *
 * @param {Object} opts
 * @param {boolean} opts.editando
 * @param {number}  opts.metaMeses
 * @param {number}  opts.montoActual
 * @param {number}  opts.gastosFijosMensuales
 * @returns {string}
 */
export function renderFormFondo({ editando, metaMeses, montoActual, gastosFijosMensuales }) {
  const objetivoPreview = calcularObjetivoFondo(gastosFijosMensuales, metaMeses);
  const previewHtml = objetivoPreview > 0
    ? `<p class="form-hint">Con esa meta tu objetivo sería <strong>${f(objetivoPreview)}</strong> (${metaMeses} ${metaMeses === 1 ? 'mes' : 'meses'} × ${f(gastosFijosMensuales)} de gastos fijos al mes).</p>`
    : `<p class="form-hint">Aún no hay gastos fijos registrados. Cuando los agregues desde Calendario, Finko calcula automáticamente el objetivo.</p>`;

  return `
    <form id="form-fondo" novalidate>
      <div class="form-group">
        <label for="fondo-meta-meses" class="label">Meses de gastos fijos que quieres cubrir</label>
        <input id="fondo-meta-meses" name="metaMeses" class="input" type="number"
               min="${META_MESES_MIN}" max="${META_MESES_MAX}" step="1"
               value="${metaMeses}" required aria-required="true"
               inputmode="numeric" />
        <p class="form-hint">Recomendado: 3 meses si tienes ingresos estables, 6 si son variables.</p>
      </div>

      <div class="form-group">
        <label for="fondo-monto-actual" class="label">¿Cuánto ya tienes apartado? (COP)</label>
        <input id="fondo-monto-actual" name="montoActual" class="input" type="number"
               min="0" step="10000" value="${montoActual}"
               placeholder="0" required aria-required="true"
               inputmode="numeric" />
        <p class="form-hint">Si todavía no tienes nada, déjalo en 0. Lo vas a ir sumando con cada aporte.</p>
      </div>

      ${previewHtml}

      <div class="modal__footer">
        ${editando
          ? `<button type="button" class="btn btn-ghost" data-action="ahorro-desactivar">Desactivar fondo</button>`
          : `<button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>`}
        <button type="submit" class="btn btn-primary">${editando ? 'Guardar cambios' : 'Activar fondo'}</button>
      </div>
    </form>`;
}

// ── FORMULARIO MODAL - APORTE (J.1b) ─────────────────────────────

/**
 * HTML del formulario para registrar un nuevo aporte al fondo.
 *
 * @param {{ fecha: string }} opts  fecha en YYYY-MM-DD (default: hoy).
 * @returns {string}
 */
export function renderFormAporte({ fecha }) {
  return `
    <form id="form-aporte" novalidate>
      <div class="form-group">
        <label for="aporte-monto" class="label">Monto del aporte (COP)</label>
        <input id="aporte-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="100000"
               required aria-required="true" inputmode="numeric" autofocus />
        <p class="form-hint">¿Cuánto apartaste para el fondo?</p>
      </div>

      <div class="form-group">
        <label for="aporte-fecha" class="label">Fecha</label>
        <input id="aporte-fecha" name="fecha" class="input" type="date"
               value="${_esc(fecha)}" required aria-required="true" />
      </div>

      <div class="form-group">
        <label for="aporte-nota" class="label">Nota (opcional)</label>
        <input id="aporte-nota" name="nota" class="input" type="text"
               maxlength="80" placeholder="Ej. Parte de la quincena de mayo"
               autocomplete="off" />
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar aporte</button>
      </div>
    </form>`;
}

// ── FORMULARIO MODAL - COMPROMISO MENSUAL (J.1b) ─────────────────

/**
 * HTML del formulario para definir o editar el compromiso mensual de ahorro
 * ("págate primero": cuánto se compromete el usuario a apartar cada mes).
 *
 * @param {number} compromisoMensual Valor actual. 0 = sin compromiso.
 * @returns {string}
 */
export function renderFormCompromisoMensual(compromisoMensual) {
  return `
    <form id="form-compromiso" novalidate>
      <div class="form-group">
        <label for="compromiso-monto" class="label">¿Cuánto quieres apartar por mes? (COP)</label>
        <input id="compromiso-monto" name="compromisoMensual" class="input" type="number"
               min="0" step="10000" value="${Number(compromisoMensual) || 0}"
               placeholder="0" inputmode="numeric" autofocus />
        <p class="form-hint">Pon 0 para quitar el compromiso. Es un recordatorio personal: no afecta tu saldo hasta que registres el aporte.</p>
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

/**
 * Formatea una cantidad de meses con 1 decimal pero suprime el ".0" cuando es
 * entero. Ej: 1 → "1 mes", 2.5 → "2,5 meses", 3 → "3 meses".
 */
function _fmtMeses(n) {
  if (n == null) return '';
  const entero = Math.abs(n - Math.round(n)) < 0.05;
  const valor  = entero ? Math.round(n) : n.toString().replace('.', ',');
  return `${valor} ${Math.abs(n - 1) < 0.05 ? 'mes' : 'meses'}`;
}
