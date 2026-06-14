/**
 * compromisos/views/lista.js - lista de deudas en la sección Compromisos.
 *
 * Renderiza `#lista-compromisos` con el orden estratégico aplicado (cuando hay
 * una estrategia activa) o por urgencia de vencimiento. El estado de la
 * estrategia se lee desde `views/estrategia.js` (singleton `_uiEstrategia`).
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../../core/state.js';
import { f, esc as _esc } from '../../../infra/utils.js';
import { icon, emptyArt } from '../../../infra/icons.js';
import {
  compromisosActivos,
  proximoVencimiento,
  urgencia,
  filtrarDeudasPagables,
  esDeuda,
  tasaEADe,
  LABEL_TIPO,
  ICONO_TIPO,
} from '../logic.js';
import { getEstrategiaUI } from './estrategia.js';

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
    const { extraMensual, estrategia } = getEstrategiaUI();
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
 * @param {import('../../../core/state.js').Compromiso} compromiso
 * @param {number | null} ordenEstrategia 1-based: posición en la estrategia activa.
 */
function _renderCompromisoItem(compromiso, ordenEstrategia = null) {
  const desc     = _esc(compromiso.descripcion);
  const tipo     = compromiso.tipo;
  const icono    = icon(ICONO_TIPO[tipo] ?? 'recurring');
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
  // En entidad, tasa null = desconocida (el usuario no la registró): se invita
  // a confirmarla en vez de afirmar "sin interés", que casi nunca es cierto.
  const tasaDesconocida = compromiso.tasa === null || compromiso.tasa === undefined;
  const tasaMostrada = compromiso.tasa > 0
    ? (compromiso.tasaUnidad === 'mensual'
        ? `${Math.round(compromiso.tasa * 100)}% mensual`
        : `${Math.round(tasaEA)}%`)
    : tasaDesconocida && tipo === 'deuda-entidad'
      ? 'tasa por confirmar'
      : 'sin interés';

  // Jerarquía de la card: nombre (título) > saldo (monto, ancla a la derecha)
  // > cuota + día de pago (subtítulo accionable) > tipo + tasa (contexto).
  // Se elimina la línea "Saldo: …" redundante con el monto de la columna meta.
  const subtitle = cuota > 0
    ? `Cuota ${f(cuota)}/mes · día ${compromiso.diaPago}`
    : `${frec} · día ${compromiso.diaPago}`;
  const contexto = `${label} · ${tasaMostrada}`;

  const ordenBadge = ordenEstrategia
    ? `<span class="orden-badge" aria-label="Orden ${ordenEstrategia} en la estrategia">${ordenEstrategia}°</span>`
    : '';

  const esTipoDeuda = esDeuda(tipo);
  const saldada     = esTipoDeuda && saldo <= 0;

  const metaHtml = saldada
    ? `<span class="chip chip-success abono-saldada" role="status">Saldada</span>`
    : `<p class="list-item__amount">${f(saldo)}</p>
       ${esTipoDeuda
         ? `<button class="btn btn-primary btn-sm abono-btn"
                    data-action="abrir-abono"
                    data-id="${_esc(compromiso.id)}"
                    aria-label="Abonar a ${desc}">Abonar</button>`
         : ''}`;

  const accionHtml = saldada
    ? `<button class="btn btn-ghost btn-icon"
               data-action="archivar-compromiso"
               data-id="${_esc(compromiso.id)}"
               title="Archivar"
               aria-label="Archivar deuda saldada ${desc}">✓</button>`
    : `<button class="btn btn-ghost btn-icon"
               data-action="eliminar-compromiso"
               data-id="${_esc(compromiso.id)}"
               aria-label="Eliminar deuda ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>`;

  return `
    <article class="list-item" data-id="${_esc(compromiso.id)}">
      <div class="list-item__icon" aria-hidden="true">${ordenBadge || icono}</div>
      <div class="list-item__body">
        <p class="list-item__title">${desc}
          <span class="${chipClase}" aria-label="Vence en ${diasLabel}">${diasLabel}</span>
        </p>
        <p class="list-item__subtitle">${subtitle}</p>
        <p class="list-item__hint">${contexto}</p>
      </div>
      <div class="list-item__meta">
        ${metaHtml}
      </div>
      <div class="list-item__action">
        ${accionHtml}
      </div>
    </article>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">${emptyArt('deudas')}</div>
      <p class="empty-state__title">Sin deudas registradas</p>
      <p class="empty-state__desc">Agrega tus créditos con entidad (banco, tarjeta) o personales (familiar, gota a gota). Finko te muestra el orden óptimo de pago según la estrategia que elijas.</p>
      <button class="btn btn-primary" data-action="nuevo-compromiso">+ Agregar deuda</button>
      <p class="empty-state__tip">${icon('lightbulb')} Tip: los gastos fijos recurrentes (arriendo, servicios) se agregan desde la sección Agenda.</p>
    </div>`;
}
