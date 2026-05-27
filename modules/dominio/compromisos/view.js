/**
 * compromisos/view.js - generación de HTML para el dominio de compromisos.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f } from '../../infra/utils.js';
import { FRECUENCIAS, tasaUsuraVigente } from '../../core/constants.js';
import {
  compromisosActivos,
  calcularCompromisoMensual,
  proximoVencimiento,
  urgencia,
  compromisosProximos,
  filtrarDeudasPagables,
  compararEstrategias,
  detectarFijosSinPagarEsteMes,
  detectarDeudasDurmiendo,
  detectarVencidosCompletos,
  agruparPorDiasRestantes,
  esDeuda,
  tasaEADe,
  TIPOS_DEUDA,
  LABEL_TIPO,
  ICONO_TIPO,
} from './logic.js';

// Estado UI local: extra mensual y estrategia activa. Persiste mientras la pestaña está abierta.
const _uiEstrategia = {
  extraMensual: 0,
  estrategia:   'avalancha',
};

// ── ALERTA: FIJOS SIN PAGAR ESTE MES (G.1) ───────────────────────

/**
 * Renderiza (o limpia) la alerta de fijos cuyo dia de pago ya paso este mes
 * en `#nudge-fijos-sin-pagar`. No-op si el contenedor no existe.
 */
export function renderAlertaFijosSinPagar() {
  const el = document.getElementById('nudge-fijos-sin-pagar');
  if (!el) return;

  const hoyISO = new Date().toISOString().slice(0, 10);
  const fijos  = detectarFijosSinPagarEsteMes(S.compromisos, hoyISO);

  if (fijos.length === 0) {
    el.innerHTML = '';
    return;
  }

  const hayUrgente = fijos.some(f => f.severidad === 'urgente');
  const nivel      = hayUrgente ? 'nudge-high' : 'nudge-medium';
  const icono      = hayUrgente ? '🔴' : '🟡';
  const n          = fijos.length;
  const titulo     = n === 1
    ? '1 gasto fijo venció este mes'
    : `${n} gastos fijos vencieron este mes`;

  const items = fijos.slice(0, 3).map(fx => {
    const desc  = _esc(fx.descripcion);
    const dias  = fx.diasAtraso;
    const label = dias === 0 ? 'venció hoy'
      : dias === 1           ? 'venció hace 1 dia'
      :                        `venció hace ${dias} dias`;
    return `<p class="nudge__desc"><strong>${desc}</strong>: ${label} · ${f(fx.monto)}</p>`;
  }).join('');

  const extra = fijos.length > 3
    ? `<p class="nudge__desc nudge__desc--muted">+${fijos.length - 3} mas...</p>`
    : '';

  el.innerHTML = `
    <div class="nudge ${nivel}" role="alert" aria-live="polite">
      <span class="nudge__icon" aria-hidden="true">${icono}</span>
      <div class="nudge__body">
        <p class="nudge__title">${titulo}. ¿Ya los registraste?</p>
        ${items}${extra}
      </div>
    </div>`;
}

// ── ALERTA: DEUDAS DURMIENDO (G.1) ───────────────────────────────

/**
 * Renderiza (o limpia) la alerta de deudas sin actividad en `#nudge-deudas-durmiendo`.
 * Aparece cuando hay deudas con saldo pendiente creadas hace >= 2 meses.
 * No-op si el contenedor no existe.
 */
export function renderAlertaDeudasDurmiendo() {
  const el = document.getElementById('nudge-deudas-durmiendo');
  if (!el) return;

  const hoyISO  = new Date().toISOString().slice(0, 10);
  const deudas  = detectarDeudasDurmiendo(S.compromisos, hoyISO);

  if (deudas.length === 0) {
    el.innerHTML = '';
    return;
  }

  const hayAlta = deudas.some(d => d.severidad === 'alta');
  const nivel   = hayAlta ? 'nudge-high' : 'nudge-medium';
  const icono   = hayAlta ? '⚠️' : '💤';
  const n       = deudas.length;
  const titulo  = n === 1
    ? '1 deuda lleva tiempo sin actividad'
    : `${n} deudas llevan tiempo sin actividad`;

  const items = deudas.slice(0, 3).map(d => {
    const desc    = _esc(d.descripcion);
    const meses   = d.mesesDesdeCreacion;
    const saldo   = f(d.saldoPendiente);
    const consejo = d.sugerencia === 'liquidar'
      ? 'podés liquidarla con la proxima cuota'
      : 'retomá los pagos para evitar intereses';
    return `<p class="nudge__desc"><strong>${desc}</strong>: ${meses} meses · ${saldo} pendiente · ${consejo}</p>`;
  }).join('');

  const extra = deudas.length > 3
    ? `<p class="nudge__desc nudge__desc--muted">+${deudas.length - 3} mas...</p>`
    : '';

  el.innerHTML = `
    <div class="nudge ${nivel}" role="alert" aria-live="polite">
      <span class="nudge__icon" aria-hidden="true">${icono}</span>
      <div class="nudge__body">
        <p class="nudge__title">${titulo}</p>
        ${items}${extra}
      </div>
    </div>`;
}

// ── LISTA DE DEUDAS ──────────────────────────────────────────────

/**
 * Renderiza la lista de deudas en `#lista-compromisos`.
 *
 * v6: la sección Compromisos solo muestra deudas (entidad + personal).
 * Los gastos fijos se gestionan desde Agenda.
 *
 * Orden:
 *  - Si hay ≥ 2 deudas pagables con la estrategia activa, se respeta el orden
 *    de pago de la estrategia (avalancha = tasa↓, bola = saldo↑).
 *  - Si no, se ordena por urgencia de vencimiento (días al próximo pago).
 *
 * No-op si el contenedor no existe.
 */
export function renderListaCompromisos() {
  const el = document.getElementById('lista-compromisos');
  if (!el) return;

  const activos = compromisosActivos(S.compromisos).filter(c => esDeuda(c.tipo));

  if (activos.length === 0) {
    el.innerHTML = _renderEmptyState();
    return;
  }

  // Orden estratégico: si la estrategia tiene un orden definido para las deudas
  // pagables, las priorizamos según ese orden (1°, 2°, 3°…). El resto va al final
  // por urgencia.
  const pagables = filtrarDeudasPagables(S.compromisos);
  let ordenEstrategia = null;
  if (pagables.length >= 1) {
    const { extraMensual, estrategia } = _uiEstrategia;
    const sortFn = estrategia === 'bolaNieve'
      ? (a, b) => a.saldo - b.saldo
      : (a, b) => b.tasaEA - a.tasaEA;
    const ordenadas = [...pagables].sort(sortFn);
    ordenEstrategia = new Map(ordenadas.map((d, i) => [d.id, i + 1]));
    void extraMensual; // referenciado para que ESLint no se queje si quedara unused
  }

  const ordenados = [...activos].sort((a, b) => {
    const posA = ordenEstrategia?.get(a.id) ?? Infinity;
    const posB = ordenEstrategia?.get(b.id) ?? Infinity;
    if (posA !== posB) return posA - posB;
    return proximoVencimiento(a) - proximoVencimiento(b);
  });

  el.innerHTML = ordenados.map((c) => {
    const orden = ordenEstrategia?.get(c.id) ?? null;
    return _renderCompromisoItem(c, orden);
  }).join('');
}

/**
 * @param {import('../../core/state.js').Compromiso} compromiso
 * @param {number | null} ordenEstrategia 1-based: posición en la estrategia activa.
 */
function _renderCompromisoItem(compromiso, ordenEstrategia = null) {
  const desc     = _esc(compromiso.descripcion);
  const tipo     = compromiso.tipo;
  const icono    = _esc(ICONO_TIPO[tipo] ?? '💳');
  const label    = _esc(LABEL_TIPO[tipo] ?? tipo);
  const frec     = _esc(compromiso.frecuencia);
  const dias     = proximoVencimiento(compromiso);
  const nivel    = urgencia(compromiso);
  const cuota    = Number(compromiso.cuotaMensual) || 0;
  const saldo    = Number(compromiso.saldoTotal) || 0;
  const tasaEA   = tasaEADe(compromiso) * 100;

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

  // Tasa mostrada en la unidad original para que coincida con la entrada.
  const tasaMostrada = compromiso.tasa > 0
    ? (compromiso.tasaUnidad === 'mensual'
        ? `${(compromiso.tasa * 100).toFixed(2)}% mensual (~${tasaEA.toFixed(1)}% EA)`
        : `${tasaEA.toFixed(1)}% EA`)
    : 'sin interés';

  const subtitleParts = [
    `Día ${compromiso.diaPago} · ${frec}`,
    label,
    tasaMostrada,
  ];

  const ordenBadge = ordenEstrategia
    ? `<span class="orden-badge" aria-label="Orden ${ordenEstrategia} en la estrategia">${ordenEstrategia}°</span>`
    : '';

  return `
    <article class="list-item" data-id="${_esc(compromiso.id)}">
      <div class="list-item__icon" aria-hidden="true">${ordenBadge || icono}</div>
      <div class="list-item__body">
        <p class="list-item__title">${desc}
          <span class="${chipClase}" aria-label="Vence en ${diasLabel}">${diasLabel}</span>
        </p>
        <p class="list-item__subtitle">${subtitleParts.join(' · ')}</p>
        <p class="list-item__hint">Saldo: ${f(saldo)} · Cuota: ${f(cuota)}/mes</p>
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount">${f(saldo)}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-compromiso"
                data-id="${_esc(compromiso.id)}"
                aria-label="Eliminar deuda ${desc}">✕</button>
      </div>
    </article>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <p class="empty-state__icon" aria-hidden="true">💳</p>
      <p class="empty-state__title">Sin deudas registradas</p>
      <p class="empty-state__desc">Agregá tus créditos con entidad (banco, tarjeta) o personales (familiar, gota a gota). Finko te muestra el orden óptimo de pago según la estrategia que elijas.</p>
      <button class="btn btn-primary" data-action="nuevo-compromiso">+ Agregar deuda</button>
      <p class="empty-state__tip">💡 Tip: los gastos fijos recurrentes (arriendo, servicios) se agregan desde la sección Agenda.</p>
    </div>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de nueva deuda (v6).
 *
 * La sección Compromisos solo crea deudas. Los gastos fijos van por Agenda.
 *
 * @returns {string}
 */
export function renderFormCompromiso() {
  const frecOpts = FRECUENCIAS
    .map(fr => `<option value="${_esc(fr)}"${fr === 'Mensual' ? ' selected' : ''}>${_esc(fr)}</option>`)
    .join('');

  const tipoOpts = TIPOS_DEUDA
    .map(t => `<option value="${_esc(t)}">${_esc(LABEL_TIPO[t])}</option>`)
    .join('');

  const usura = tasaUsuraVigente();

  return `
    <form id="form-compromiso" novalidate>
      <div class="form-group">
        <label for="comp-tipo" class="label">Tipo de deuda</label>
        <select id="comp-tipo" name="tipo" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${tipoOpts}
        </select>
        <p class="form-hint">
          🏦 <strong>Entidad</strong>: banco, fintech, tarjeta de crédito.
          🤝 <strong>Personal</strong>: familiar, amigo, gota a gota.
        </p>
      </div>

      <div class="form-group">
        <label for="comp-descripcion" class="label">Descripción</label>
        <input id="comp-descripcion" name="descripcion" class="input" type="text"
               placeholder="Ej. Tarjeta Visa Bancolombia" required aria-required="true" autocomplete="off" />
      </div>

      <div class="form-group">
        <label for="comp-saldo" class="label">Saldo total que aún debés (COP)</label>
        <input id="comp-saldo" name="saldoTotal" class="input" type="number"
               min="1" step="10000" placeholder="0" required aria-required="true" autocomplete="off" />
        <p class="form-hint">Lo que falta por pagar hoy. Se descuenta de tu patrimonio neto.</p>
      </div>

      <div class="form-group">
        <label for="comp-cuota" class="label">Cuota mensual (COP)</label>
        <input id="comp-cuota" name="cuotaMensual" class="input" type="number"
               min="1" step="10000" placeholder="0" required aria-required="true" autocomplete="off" />
        <p class="form-hint">Lo que pagás cada mes. Es el gasto que se proyecta al Balance del mes.</p>
      </div>

      <div class="form-group">
        <label for="comp-tasa" class="label" id="comp-tasa-label">Tasa de interés (%)</label>
        <div class="tasa-input-group">
          <input id="comp-tasa" name="tasa" class="input" type="number"
                 min="0" max="200" step="0.01" placeholder="0"
                 aria-describedby="comp-tasa-hint" autocomplete="off" />
          <select id="comp-tasa-unidad" name="tasaUnidad" class="input" aria-label="Unidad de la tasa">
            <option value="EA">% EA (anual)</option>
            <option value="mensual">% mensual</option>
          </select>
        </div>
        <p id="comp-tasa-hint" class="form-hint">
          Entidad: usá <strong>% EA</strong>. La usura vigente es ~${(usura.tasa * 100).toFixed(2)}% EA (SFC, ${usura.periodo}).<br>
          Personal (gota a gota): solé venir en <strong>% mensual</strong> (5-20% es lo usual).
        </p>
      </div>

      <div class="form-group">
        <label for="comp-frecuencia" class="label">Frecuencia de pago</label>
        <select id="comp-frecuencia" name="frecuencia" class="input" required aria-required="true">
          ${frecOpts}
        </select>
      </div>

      <div class="form-group">
        <label for="comp-dia" class="label">Día de pago (1-31)</label>
        <input id="comp-dia" name="diaPago" class="input" type="number"
               min="1" max="31" step="1" placeholder="1" required aria-required="true" />
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar deuda</button>
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
 *
 * v6: ahora vive arriba de la lista de deudas y aparece con cualquier cantidad
 * de deudas pagables (≥ 1). El selector Avalancha solo es relevante si hay
 * tasa > 0 en al menos una deuda; si no, se sugiere directamente Bola de Nieve.
 *
 * El orden definido por la estrategia se aplica también a `renderListaCompromisos`.
 */
export function renderEstrategiaPago() {
  const el = document.getElementById('estrategia-pago');
  if (!el) return;

  const deudas = filtrarDeudasPagables(S.compromisos);
  if (deudas.length === 0) {
    el.innerHTML = '';
    return;
  }

  const hayTasaPositiva = deudas.some(d => d.tasaEA > 0);
  // Si no hay tasa positiva, forzar bolaNieve (avalancha no aporta info).
  if (!hayTasaPositiva && _uiEstrategia.estrategia !== 'bolaNieve') {
    _uiEstrategia.estrategia = 'bolaNieve';
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
                  role="tab" aria-selected="${estrategia === 'avalancha'}"
                  ${hayTasaPositiva ? '' : 'disabled aria-disabled="true" title="Avalancha requiere al menos una deuda con tasa > 0"'}>
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
  return `
    <p class="estrategia-card__ahorro">
      💰 Con ${nombreMejor} ${eligioMejor ? 'ahorrás' : 'ahorrarías'}
      <strong>${f(ahorroIntereses)}</strong>
      ${ahorroMeses > 0 ? `y <strong>${ahorroMeses} ${ahorroMeses === 1 ? 'mes' : 'meses'}</strong>` : ''}
      respecto a ${mejor === 'avalancha' ? 'Bola de nieve' : 'Avalancha'}.
    </p>`;
}

// ── DASHBOARD: PANEL VENCIDOS ────────────────────────────────────

/**
 * Renderiza en `#panel-vencidos` la lista de compromisos vencidos del mes
 * (fijo, deuda, agenda con día de pago ya pasado). Vacío si no hay nada,
 * y limpia el panel para no ocupar espacio.
 *
 * Muestra hasta `MAX_VISIBLES` items inicialmente; el resto queda accesible
 * por scroll vertical interno (max-height en CSS) para no inflar el dashboard.
 *
 * No-op si el contenedor no existe.
 */
export function renderPanelVencidos() {
  const el = document.getElementById('panel-vencidos');
  if (!el) return;

  const vencidos = detectarVencidosCompletos(S.compromisos, _hoyISOLocal());

  if (vencidos.length === 0) {
    el.innerHTML = '';
    return;
  }

  const n      = vencidos.length;
  const titulo = n === 1
    ? '1 pendiente del mes'
    : `${n} pendientes del mes`;

  const items = vencidos.map(v => {
    const tipo  = v.tipo ?? 'fijo';
    const icono = _esc(ICONO_TIPO[tipo] ?? '🔁');
    const desc  = _esc(v.descripcion);
    const monto = f(v.monto);
    const dias  = v.diasAtraso;
    const cuando = dias === 0 ? 'hoy'
      : dias === 1            ? 'ayer'
      :                         `hace ${dias} días`;
    return `
      <li class="vencidos-card__item vencidos-card__item--${v.severidad}">
        <span class="vencidos-card__icon cal-dot--${tipo}" aria-hidden="true">${icono}</span>
        <div class="vencidos-card__body">
          <p class="vencidos-card__name">${desc}</p>
          <p class="vencidos-card__sub">venció ${cuando}</p>
        </div>
        <p class="vencidos-card__amount">${monto}</p>
      </li>`;
  }).join('');

  el.innerHTML = `
    <section class="vencidos-card" aria-label="Compromisos vencidos">
      <header class="vencidos-card__header">
        <h2 class="vencidos-card__title">⚠️ ${titulo}</h2>
        <a href="#compromisos" class="vencidos-card__link"
           aria-label="Ir a compromisos">Gestionar</a>
      </header>
      <ul class="vencidos-card__list" role="list">
        ${items}
      </ul>
    </section>`;
}

// ── DASHBOARD: PANEL PRÓXIMAS PRIORIDADES ────────────────────────

/**
 * Renderiza en `#panel-prioridades` los compromisos de los próximos 7 días,
 * agrupados por día (HOY → mañana → en N días). Reemplaza a Card Hoy
 * unificando hoy + próximos en una sola sección.
 *
 * Si no hay compromisos activos, limpia el panel (sin ruido para usuarios
 * nuevos). Si hay activos pero ninguno en 7 días, muestra "Sin compromisos
 * próximos. 🎉".
 *
 * No-op si el contenedor no existe.
 */
export function renderPanelPrioridades() {
  const el = document.getElementById('panel-prioridades');
  if (!el) return;

  const activos = compromisosActivos(S.compromisos);
  if (activos.length === 0) {
    el.innerHTML = '';
    return;
  }

  const proximos = compromisosProximos(S.compromisos, 7);
  const grupos   = agruparPorDiasRestantes(proximos);

  let bodyHtml;
  if (grupos.length === 0) {
    bodyHtml = `<p class="prioridades-card__empty">Sin compromisos próximos. 🎉</p>`;
  } else {
    bodyHtml = grupos.map(g => {
      const items = g.items.map(c => {
        const tipo  = c.tipo ?? 'fijo';
        const icono = _esc(ICONO_TIPO[tipo] ?? '🔁');
        const desc  = _esc(c.descripcion ?? '(sin descripción)');
        const monto = Number.isFinite(Number(c.monto)) ? f(Number(c.monto)) : '';
        return `
          <li class="prioridades-card__item">
            <span class="prioridades-card__dot cal-dot--${tipo}" aria-hidden="true">${icono}</span>
            <span class="prioridades-card__name">${desc}</span>
            ${monto ? `<span class="prioridades-card__amount">${monto}</span>` : ''}
          </li>`;
      }).join('');

      const esHoy = g.dias === 0;
      return `
        <div class="prioridades-card__group${esHoy ? ' prioridades-card__group--hoy' : ''}">
          <p class="prioridades-card__group-label">${_esc(g.label)}</p>
          <ul class="prioridades-card__list" role="list">${items}</ul>
        </div>`;
    }).join('');
  }

  el.innerHTML = `
    <section class="prioridades-card" aria-label="Próximas prioridades">
      <header class="prioridades-card__header">
        <h2 class="prioridades-card__title">📅 Próximas prioridades</h2>
        <a href="#agenda" class="prioridades-card__link"
           aria-label="Ir a la agenda">Ver agenda</a>
      </header>
      <div class="prioridades-card__body">
        ${bodyHtml}
      </div>
    </section>`;
}

// ── HELPER ───────────────────────────────────────────────────────

/**
 * Devuelve la fecha local (no UTC) en formato YYYY-MM-DD.
 * Necesario para que el cómputo de "vencido hoy" use el día visible al usuario,
 * no el día UTC. En Colombia (GMT-5), `toISOString` arroja un día más
 * entre 19:00 y 23:59 local.
 */
function _hoyISOLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
