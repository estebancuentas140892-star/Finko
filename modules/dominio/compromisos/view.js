/**
 * compromisos/view.js — generación de HTML para el dominio de compromisos.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f } from '../../infra/utils.js';
import { FRECUENCIAS } from '../../core/constants.js';
import {
  compromisosActivos,
  calcularCompromisoMensual,
  proximoVencimiento,
  urgencia,
  filtrarDeudasPagables,
  compararEstrategias,
  TIPOS_COMPROMISO,
  LABEL_TIPO,
  ICONO_TIPO,
} from './logic.js';

// Estado UI local: extra mensual y estrategia activa. Persiste mientras la pestaña está abierta.
const _uiEstrategia = {
  extraMensual: 0,
  estrategia:   'avalancha',
};

// ── LISTA DE COMPROMISOS ─────────────────────────────────────────

/**
 * Renderiza la lista de compromisos en `#lista-compromisos`.
 * No-op si el contenedor no existe.
 */
export function renderListaCompromisos() {
  const el = document.getElementById('lista-compromisos');
  if (!el) return;

  const activos = compromisosActivos(S.compromisos);
  // Ordenar: más urgentes primero.
  const ordenados = [...activos].sort(
    (a, b) => proximoVencimiento(a) - proximoVencimiento(b)
  );

  el.innerHTML = ordenados.length === 0
    ? _renderEmptyState()
    : ordenados.map(_renderCompromisoItem).join('');
}

/** @param {import('../../core/state.js').Compromiso} compromiso */
function _renderCompromisoItem(compromiso) {
  const desc     = _esc(compromiso.descripcion);
  const tipo     = compromiso.tipo ?? 'fijo';
  const icono    = _esc(ICONO_TIPO[tipo] ?? '🔁');
  const label    = _esc(LABEL_TIPO[tipo] ?? tipo);
  const frec     = _esc(compromiso.frecuencia);
  const dias     = proximoVencimiento(compromiso);
  const nivel    = urgencia(compromiso);
  const mensual  = calcularCompromisoMensual(compromiso);

  const chipClase = nivel === 'urgente'
    ? 'chip chip--danger'
    : nivel === 'proximo'
    ? 'chip chip--warning'
    : 'chip chip--neutral';

  const diasLabel = dias === 0
    ? 'Vence hoy'
    : dias === 1
    ? 'Mañana'
    : `${dias} días`;

  const subtitleParts = [
    `Día ${compromiso.diaPago} · ${frec}`,
    label,
  ];
  if (mensual !== compromiso.monto) {
    subtitleParts.push(`${f(mensual)}/mes`);
  }

  // Mostrar saldo pendiente de la deuda cuando está disponible.
  let saldoHtml = '';
  if (tipo === 'deuda') {
    const saldo = Number(compromiso.saldoPendiente);
    if (Number.isFinite(saldo) && saldo > 0) {
      subtitleParts.push(`Saldo: ${f(saldo)}`);
    } else {
      saldoHtml = `<p class="list-item__hint">Registrá el saldo para calcular tu patrimonio neto</p>`;
    }
  }

  return `
    <article class="list-item" data-id="${_esc(compromiso.id)}">
      <div class="list-item__icon" aria-hidden="true">${icono}</div>
      <div class="list-item__body">
        <p class="list-item__title">${desc}
          <span class="${chipClase}" aria-label="Vence en ${diasLabel}">${diasLabel}</span>
        </p>
        <p class="list-item__subtitle">${subtitleParts.join(' · ')}</p>
        ${saldoHtml}
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount">${f(compromiso.monto)}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-compromiso"
                data-id="${_esc(compromiso.id)}"
                aria-label="Eliminar compromiso ${desc}">✕</button>
      </div>
    </article>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <p class="empty-state__icon" aria-hidden="true">🔗</p>
      <p class="empty-state__title">Sin compromisos registrados</p>
      <p class="empty-state__desc">Agregá tus gastos fijos, deudas y pagos recurrentes para no olvidar ningún vencimiento.</p>
      <button class="btn btn-primary" data-action="nuevo-compromiso">+ Agregar compromiso</button>
    </div>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de nuevo compromiso.
 * @returns {string}
 */
export function renderFormCompromiso() {
  const frecOpts = FRECUENCIAS
    .map(fr => `<option value="${_esc(fr)}">${_esc(fr)}</option>`)
    .join('');

  const tipoOpts = TIPOS_COMPROMISO
    .map(t => `<option value="${_esc(t)}">${_esc(LABEL_TIPO[t])}</option>`)
    .join('');

  return `
    <form id="form-compromiso" novalidate>
      <div class="form-group">
        <label for="comp-descripcion" class="label">Descripción</label>
        <input id="comp-descripcion" name="descripcion" class="input" type="text"
               placeholder="Ej. Arriendo apartamento" required aria-required="true" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="comp-monto" class="label">Monto (COP)</label>
        <input id="comp-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="0" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="comp-frecuencia" class="label">Frecuencia</label>
        <select id="comp-frecuencia" name="frecuencia" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${frecOpts}
        </select>
      </div>
      <div class="form-group">
        <label for="comp-dia" class="label">Día de pago (1–31)</label>
        <input id="comp-dia" name="diaPago" class="input" type="number"
               min="1" max="31" step="1" placeholder="1" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="comp-tipo" class="label">Tipo</label>
        <select id="comp-tipo" name="tipo" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${tipoOpts}
        </select>
      </div>

      <!-- Campos opcionales — visibles solo cuando tipo = 'deuda' -->
      <div id="comp-deuda-campos" class="d-none">
        <p class="form-hint">
          Completá estos datos para ver tu patrimonio neto real.
          Si los dejás en blanco, la deuda igual se registra.
        </p>
        <div class="form-group">
          <label for="comp-saldo" class="label">Saldo pendiente (COP) <span class="form-optional">opcional</span></label>
          <input id="comp-saldo" name="saldoPendiente" class="input" type="number"
                 min="0" step="10000" placeholder="0" autocomplete="off" />
        </div>
        <div class="form-group">
          <label for="comp-tasa" class="label">Tasa EA (%) <span class="form-optional">opcional</span></label>
          <input id="comp-tasa" name="tasaEA" class="input" type="number"
                 min="0" max="200" step="0.01" placeholder="Ej. 26.5"
                 aria-describedby="comp-tasa-hint" autocomplete="off" />
          <p id="comp-tasa-hint" class="form-hint">
            Tasa efectiva anual. La usura vigente es ~28.17% EA (SFC, Q2 2026).
          </p>
        </div>
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar compromiso</button>
      </div>
    </form>`;
}

// ── ESTRATEGIA DE PAGO (F.4) ─────────────────────────────────────

/**
 * Estado UI exportado para que index.js pueda actualizarlo desde handlers.
 */
export function setEstrategiaUI(patch) {
  if (patch.extraMensual !== undefined) {
    const n = Number(patch.extraMensual);
    _uiEstrategia.extraMensual = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  if (patch.estrategia === 'avalancha' || patch.estrategia === 'bolaNieve') {
    _uiEstrategia.estrategia = patch.estrategia;
  }
}

export function getEstrategiaUI() {
  return { ..._uiEstrategia };
}

/**
 * Renderiza la card de estrategia de pago en `#estrategia-pago`.
 * Aparece solo si hay ≥ 2 deudas con saldoPendiente + tasaEA + monto válidos.
 */
export function renderEstrategiaPago() {
  const el = document.getElementById('estrategia-pago');
  if (!el) return;

  const deudas = filtrarDeudasPagables(S.compromisos);
  if (deudas.length < 2) {
    el.innerHTML = deudas.length === 1
      ? _renderEstrategiaHint()
      : '';
    return;
  }

  const { extraMensual, estrategia } = _uiEstrategia;
  const resultado = compararEstrategias(deudas, extraMensual);
  const activa    = resultado[estrategia];

  // Mapeo id → descripción para mostrar nombres en la tabla.
  const descById = Object.fromEntries(deudas.map(d => [d.id, d]));

  el.innerHTML = `
    <article class="estrategia-card">
      <header class="estrategia-card__header">
        <h2 class="estrategia-card__title">💡 Estrategia de pago de deudas</h2>
        <p class="estrategia-card__subtitle">
          Compará dos formas de pagar tus ${deudas.length} deudas activas.
        </p>
      </header>

      <div class="estrategia-card__controls">
        <div class="form-group">
          <label for="estrategia-extra" class="label">¿Cuánto extra podés pagar al mes? (COP)</label>
          <input id="estrategia-extra" class="input" type="number"
                 min="0" step="10000" value="${extraMensual}"
                 placeholder="0" autocomplete="off"
                 data-action="cambiar-extra-estrategia" />
        </div>
        <div class="estrategia-card__toggle" role="tablist" aria-label="Estrategia de pago">
          <button class="btn ${estrategia === 'avalancha' ? 'btn-primary' : 'btn-ghost'}"
                  data-action="elegir-estrategia" data-estrategia="avalancha"
                  role="tab" aria-selected="${estrategia === 'avalancha'}">
            🏔️ Avalancha
          </button>
          <button class="btn ${estrategia === 'bolaNieve' ? 'btn-primary' : 'btn-ghost'}"
                  data-action="elegir-estrategia" data-estrategia="bolaNieve"
                  role="tab" aria-selected="${estrategia === 'bolaNieve'}">
            ⚪ Bola de nieve
          </button>
        </div>
        <p class="estrategia-card__hint">
          ${estrategia === 'avalancha'
            ? 'Pagás primero la deuda de mayor tasa. Te ahorra intereses.'
            : 'Pagás primero la deuda más pequeña. Te motiva con victorias rápidas.'}
        </p>
      </div>

      <ol class="estrategia-card__orden">
        ${activa.orden.map((o, i) => {
          const d = descById[o.id];
          const tasa = (d.tasaEA * 100).toFixed(1);
          const mes  = o.mesPagado != null ? `pagada en mes ${o.mesPagado}` : 'sin pagar';
          return `
            <li class="estrategia-card__paso">
              <span class="estrategia-card__num">${i + 1}</span>
              <div class="estrategia-card__paso-body">
                <p class="estrategia-card__paso-desc">${_esc(d.descripcion)}</p>
                <p class="estrategia-card__paso-meta">${tasa}% EA · ${f(d.saldo)} · ${mes}</p>
              </div>
            </li>`;
        }).join('')}
      </ol>

      <div class="estrategia-card__totales">
        <div class="estrategia-card__total">
          <span class="estrategia-card__total-label">Libre de deudas en</span>
          <span class="estrategia-card__total-valor">
            ${activa.completo ? `${activa.meses} meses` : '> 50 años'}
          </span>
        </div>
        <div class="estrategia-card__total">
          <span class="estrategia-card__total-label">Intereses totales</span>
          <span class="estrategia-card__total-valor">${f(activa.interesesTotales)}</span>
        </div>
      </div>

      ${_renderComparacionAhorro(resultado, estrategia)}
    </article>`;
}

function _renderEstrategiaHint() {
  return `
    <div class="estrategia-card estrategia-card--hint">
      <p class="estrategia-card__title">💡 Estrategia de pago</p>
      <p class="estrategia-card__subtitle">
        Agregá al menos 2 deudas con saldo pendiente y tasa EA para ver las estrategias Avalancha y Bola de Nieve.
      </p>
    </div>`;
}

function _renderComparacionAhorro(resultado, activa) {
  const { mejor, ahorroIntereses, ahorroMeses } = resultado;
  if (mejor === 'empate' || (ahorroIntereses === 0 && ahorroMeses === 0)) {
    return `
      <p class="estrategia-card__ahorro estrategia-card__ahorro--neutral">
        Ambas estrategias dan el mismo resultado con estas deudas.
      </p>`;
  }
  const nombreMejor = mejor === 'avalancha' ? 'Avalancha' : 'Bola de nieve';
  const eligioMejor = activa === mejor;
  const verbo = eligioMejor ? 'Ahorrás' : 'Ahorrarías cambiando a Avalancha';
  // En la práctica Avalancha siempre es la "mejor" por intereses; mostramos el delta.
  return `
    <p class="estrategia-card__ahorro">
      💰 Con ${nombreMejor} ${eligioMejor ? 'ahorrás' : 'ahorrarías'}
      <strong>${f(ahorroIntereses)}</strong>
      ${ahorroMeses > 0 ? `y <strong>${ahorroMeses} ${ahorroMeses === 1 ? 'mes' : 'meses'}</strong>` : ''}
      respecto a ${mejor === 'avalancha' ? 'Bola de nieve' : 'Avalancha'}.
    </p>`;
}

// ── HELPER ───────────────────────────────────────────────────────

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
