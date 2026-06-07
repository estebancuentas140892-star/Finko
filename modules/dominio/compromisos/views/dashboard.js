/**
 * compromisos/views/dashboard.js - paneles del dashboard relacionados con compromisos.
 *
 * Renderiza dos paneles independientes:
 *   - Vencidos del mes (`#panel-vencidos`)
 *   - Próximas prioridades a 7 días (`#panel-prioridades`)
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (toda en logic.js).
 */

import { S } from '../../../core/state.js';
import { f, esc as _esc } from '../../../infra/utils.js';
import {
  compromisosActivos,
  compromisosProximos,
  detectarVencidosCompletos,
  agruparPorDiasRestantes,
  ICONO_TIPO,
} from '../logic.js';

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
