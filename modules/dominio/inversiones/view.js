/**
 * inversiones/view.js - HTML del dominio Inversión (J.2).
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible } from '../../infra/utils.js';
import { INFLACION_OBJETIVO } from '../../core/constants.js';
import {
  calcularTotalInvertido,
  calcularPorTipo,
  ordenarInversionesPorMonto,
  proyectarInversion,
  proyectarPortafolio,
  calcularRentabilidadRealPortafolio,
  detectarNudgesInversion,
  TIPOS_INVERSION,
} from './logic.js';

/** Inflación esperada (%) usada en la rentabilidad real del portafolio. */
const INFLACION_PCT = INFLACION_OBJETIVO * 100;

// ── RENDER PRINCIPAL ─────────────────────────────────────────────

/**
 * Renderiza el panel de Inversión en `#panel-inversion`.
 * No-op si el contenedor no existe.
 */
export function renderInversion() {
  const el = document.getElementById('panel-inversion');
  if (!el) return;

  const inversiones = Array.isArray(S.inversiones) ? S.inversiones : [];

  if (inversiones.length === 0) {
    el.innerHTML = _renderEmptyState();
    return;
  }

  el.innerHTML = `
    ${_renderHero(inversiones)}
    ${_renderProyeccion(inversiones)}
    ${_renderNudges(inversiones)}
    ${_renderLista(inversiones)}
    ${_renderTipHorizonte()}`;
}

// ── EMPTY STATE ──────────────────────────────────────────────────

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <p class="empty-state__icon" aria-hidden="true">📈</p>
      <p class="empty-state__title">Registra tus inversiones</p>
      <p class="empty-state__desc">Lleva en un solo lugar tu portafolio real: CDT, fondos, acciones o cripto. Ver cuánto tienes invertido es el primer paso para que tu dinero trabaje por ti.</p>
      <button class="btn btn-primary" data-action="inversion-nueva">+ Registrar inversión</button>
      <p class="empty-state__tip">💡 Tip: primero asegura tu fondo de emergencia en Ahorro. Invierte el dinero que no vas a necesitar a corto plazo.</p>
    </div>`;
}

// ── HERO (total invertido) ───────────────────────────────────────

function _renderHero(inversiones) {
  const total    = calcularTotalInvertido(inversiones);
  const cantidad = inversiones.length;
  const porTipo  = calcularPorTipo(inversiones);

  const desgloseHtml = porTipo.length > 0
    ? `<ul class="inversion-hero__tipos" role="list">
        ${porTipo.map(t => `
          <li class="inversion-hero__tipo">
            <span class="inversion-hero__tipo-label">${_esc(t.tipo)}</span>
            <span class="inversion-hero__tipo-pct">${t.pct}%</span>
          </li>`).join('')}
      </ul>`
    : '';

  return `
    <article class="inversion-hero" aria-label="Total invertido">
      <header class="inversion-hero__header">
        <div class="inversion-hero__icon" aria-hidden="true">
          <svg class="icon" aria-hidden="true"><use href="#i-inversion"/></svg>
        </div>
        <div class="inversion-hero__title-wrap">
          <p class="inversion-hero__label">Total invertido</p>
          <p class="inversion-hero__title">${f(total)}</p>
          <span class="inversion-hero__sub">${cantidad} ${cantidad === 1 ? 'inversión registrada' : 'inversiones registradas'}</span>
        </div>
      </header>
      ${desgloseHtml}
    </article>`;
}

// ── PROYECCIÓN DEL PORTAFOLIO (J.2b) ─────────────────────────────

function _renderProyeccion(inversiones) {
  const proy = proyectarPortafolio(inversiones);

  // Sin holdings proyectables (todos sin tasa o sin plazo): no mostramos la card,
  // pero sí una nota suave invitando a completar tasa/plazo para proyectar.
  if (proy.proyectables === 0) {
    return `
      <section class="inversion-proy inversion-proy--vacia" aria-label="Proyección">
        <p class="inversion-proy__nota">
          📅 Agrega la <strong>tasa EA</strong> y el <strong>plazo</strong> de tus inversiones de renta fija (CDT, fondos) para ver cuánto valdrían al vencimiento.
        </p>
      </section>`;
  }

  const real = calcularRentabilidadRealPortafolio(inversiones, INFLACION_PCT);

  const gananciaPositiva = proy.rendimientoEsperado >= 0;
  const notaNoProy = proy.noProyectables > 0
    ? `<p class="inversion-proy__hint">${proy.noProyectables} ${proy.noProyectables === 1 ? 'inversión de retorno variable no se proyecta' : 'inversiones de retorno variable no se proyectan'} (sin tasa o plazo fijo).</p>`
    : '';

  const realHtml = real
    ? `<div class="inversion-proy__real">
        <p class="inversion-proy__real-line">
          Rentabilidad nominal <strong>${_fmtTasa(real.tasaNominalPct)}%</strong> EA →
          real <strong class="${real.tasaRealPct >= 0 ? 'is-pos' : 'is-neg'}">${_fmtTasa(real.tasaRealPct)}%</strong>
        </p>
        <p class="inversion-proy__real-nota">Ya descontada una inflación estimada del ${_fmtTasa(INFLACION_PCT)}% (meta del Banco de la República). La inflación real puede variar.</p>
      </div>`
    : '';

  return `
    <section class="inversion-proy" aria-label="Proyección al vencimiento">
      <h2 class="inversion-proy__title">Proyección al vencimiento</h2>
      <div class="inversion-proy__grid">
        <div class="inversion-proy__metric">
          <p class="inversion-proy__metric-label">Valor proyectado</p>
          <p class="inversion-proy__metric-value">${f(proy.totalProyectado)}</p>
        </div>
        <div class="inversion-proy__metric">
          <p class="inversion-proy__metric-label">Ganancia esperada</p>
          <p class="inversion-proy__metric-value ${gananciaPositiva ? 'is-pos' : 'is-neg'}">
            ${gananciaPositiva ? '+' : ''}${f(proy.rendimientoEsperado)}
          </p>
        </div>
      </div>
      ${realHtml}
      ${notaNoProy}
    </section>`;
}

// ── NUDGES EDUCATIVOS (J.2c) ─────────────────────────────────────

function _renderNudges(inversiones) {
  // La vista puede leer S (no muta). Lee el estado del fondo sin importar el
  // dominio Ahorro (regla ADN #10): solo consulta el slice de estado.
  const fondo = S.ahorro?.fondoEmergencia;
  const contexto = {
    fondoActivo:     fondo?.activo === true,
    fondoCompletado: fondo?.completado === true,
  };

  const nudges = detectarNudgesInversion(inversiones, contexto);
  if (nudges.length === 0) return '';

  return `
    <section class="inversion-nudges" aria-label="Recomendaciones">
      ${nudges.map(_renderNudge).join('')}
    </section>`;
}

/** @param {{nivel:string, icono:string, titulo:string, desc:string}} n */
function _renderNudge(n) {
  // El nudge de fondo enlaza a la sección Ahorro como llamada a la acción.
  const cta = (n.id === 'fondo-primero' || n.id === 'fondo-incompleto')
    ? ` <a href="#ahorro" class="link">Ir a Ahorro</a>`
    : '';
  return `
    <div class="nudge ${_esc(n.nivel)}" role="status">
      <span class="nudge__icon" aria-hidden="true">${n.icono}</span>
      <div class="nudge__body">
        <p class="nudge__title">${_esc(n.titulo)}</p>
        <p class="nudge__desc">${_esc(n.desc)}${cta}</p>
      </div>
    </div>`;
}

/** Tip educativo evergreen sobre el horizonte de la inversión. */
function _renderTipHorizonte() {
  return `
    <p class="inversion-tip">
      💡 Invertir da frutos a largo plazo: el interés compuesto necesita tiempo. Define un horizonte y evita retirar antes del plazo salvo una emergencia.
    </p>`;
}

// ── LISTA DE HOLDINGS ────────────────────────────────────────────

function _renderLista(inversiones) {
  const ordenadas = ordenarInversionesPorMonto(inversiones);

  return `
    <section class="inversion-lista" aria-label="Mis inversiones">
      <div class="inversion-lista__header">
        <h2 class="inversion-lista__title">Mis inversiones</h2>
        <button class="btn btn-sm btn-primary" data-action="inversion-nueva">+ Registrar</button>
      </div>
      <ul class="inversion-lista__items" role="list">
        ${ordenadas.map(_renderItem).join('')}
      </ul>
    </section>`;
}

/**
 * @param {{id:string, tipo:string, nombre:string, monto:number,
 *          tasaEA:number, plazoMeses:number, fechaInicio:string}} inv
 */
function _renderItem(inv) {
  const tasaHtml = Number(inv.tasaEA) > 0
    ? `<span class="inversion-item__chip">${_fmtTasa(inv.tasaEA)}% EA</span>`
    : '';
  const plazoHtml = Number(inv.plazoMeses) > 0
    ? `<span class="inversion-item__chip">${inv.plazoMeses} ${inv.plazoMeses === 1 ? 'mes' : 'meses'}</span>`
    : '';
  const fechaHtml = inv.fechaInicio
    ? `<span class="inversion-item__fecha">Desde ${fechaLegible(inv.fechaInicio)}</span>`
    : '';

  // Proyección al vencimiento (solo holdings con tasa + plazo).
  const proy = proyectarInversion(inv);
  const proyHtml = proy
    ? `<p class="inversion-item__proy">
        Al vencimiento: <strong>${f(proy.valorFuturo)}</strong>
        <span class="inversion-item__proy-gain">(+${f(proy.rendimiento)})</span>
      </p>`
    : '';

  return `
    <li class="list-item" data-id="${_esc(inv.id)}">
      <div class="list-item__body">
        <p class="list-item__title">${_esc(inv.nombre)}</p>
        <p class="list-item__subtitle">
          <span class="inversion-item__tipo">${_esc(inv.tipo)}</span>
          ${tasaHtml}${plazoHtml}${fechaHtml}
        </p>
        ${proyHtml}
      </div>
      <div class="list-item__action">
        <span class="list-item__value">${f(inv.monto)}</span>
        <button class="btn btn-ghost btn-icon"
                data-action="inversion-eliminar"
                data-id="${_esc(inv.id)}"
                aria-label="Eliminar inversión ${_esc(inv.nombre)}">
          <svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg>
        </button>
      </div>
    </li>`;
}

// ── FORMULARIO MODAL - ALTA ──────────────────────────────────────

/**
 * HTML del formulario para registrar una nueva inversión.
 *
 * @param {{ fechaInicio: string }} opts  fecha en YYYY-MM-DD (default: hoy).
 * @returns {string}
 */
export function renderFormInversion({ fechaInicio }) {
  const opciones = TIPOS_INVERSION
    .map(t => `<option value="${_esc(t)}">${_esc(t)}</option>`)
    .join('');

  return `
    <form id="form-inversion" novalidate>
      <div class="form-group">
        <label for="inv-tipo" class="label">Tipo de inversión</label>
        <select id="inv-tipo" name="tipo" class="input" required aria-required="true">
          ${opciones}
        </select>
      </div>

      <div class="form-group">
        <label for="inv-nombre" class="label">Nombre</label>
        <input id="inv-nombre" name="nombre" class="input" type="text"
               maxlength="60" placeholder="Ej. CDT Bancolombia, ETF S&amp;P 500, Bitcoin"
               required aria-required="true" autocomplete="off" autofocus />
      </div>

      <div class="form-group">
        <label for="inv-monto" class="label">Monto invertido (COP)</label>
        <input id="inv-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="1000000"
               required aria-required="true" inputmode="numeric" />
      </div>

      <div class="form-group">
        <label for="inv-tasa" class="label">Tasa EA estimada (%) <span class="label__opt">opcional</span></label>
        <input id="inv-tasa" name="tasaEA" class="input" type="number"
               min="0" max="100" step="0.1" placeholder="0"
               inputmode="decimal" />
        <p class="form-hint">Déjalo en 0 si la rentabilidad es variable (acciones, cripto).</p>
      </div>

      <div class="form-group">
        <label for="inv-plazo" class="label">Plazo (meses) <span class="label__opt">opcional</span></label>
        <input id="inv-plazo" name="plazoMeses" class="input" type="number"
               min="0" step="1" placeholder="0" inputmode="numeric" />
        <p class="form-hint">Pon 0 si no tiene un plazo fijo.</p>
      </div>

      <div class="form-group">
        <label for="inv-fecha" class="label">Fecha de inicio</label>
        <input id="inv-fecha" name="fechaInicio" class="input" type="date"
               value="${_esc(fechaInicio)}" required aria-required="true" />
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar inversión</button>
      </div>
    </form>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

/**
 * Formatea una tasa a máximo 2 decimales, suprimiendo el ".0" cuando es entera
 * y usando coma decimal. 12 → "12", 12.5 → "12,5", 7.2816 → "7,28".
 */
function _fmtTasa(n) {
  const num = Math.round((Number(n) || 0) * 100) / 100;
  const entero = Math.abs(num - Math.round(num)) < 0.005;
  return entero ? String(Math.round(num)) : num.toString().replace('.', ',');
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
