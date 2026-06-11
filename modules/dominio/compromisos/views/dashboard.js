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
import { icon } from '../../../infra/icons.js';
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
    const icono = icon(ICONO_TIPO[tipo] ?? 'recurring');
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
 * Renderiza en `#panel-prioridades` los compromisos, préstamos personales y
 * apartados con vencimiento en los próximos 7 días, agrupados por día.
 *
 * Fuentes de datos:
 *   - S.compromisos  (diaPago recurrente)
 *   - S.personales   (fechaLimite, si el préstamo no está liquidado)
 *   - S.apartados    (fechaObjetivo, si el apartado no está completado)
 *
 * Si no hay nada activo en ninguna fuente, limpia el panel.
 * No-op si el contenedor no existe.
 */
export function renderPanelPrioridades() {
  const el = document.getElementById('panel-prioridades');
  if (!el) return;

  const proxComp = compromisosProximos(S.compromisos, 7);
  const proxPers = _personalesProximos(7);
  const proxApar = _apartadosProximos(7);

  const compActivos = compromisosActivos(S.compromisos).length > 0;
  if (!compActivos && proxPers.length === 0 && proxApar.length === 0) {
    el.innerHTML = '';
    return;
  }

  const proxTodos = [...proxComp, ...proxPers, ...proxApar]
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
  const grupos = agruparPorDiasRestantes(proxTodos);

  let bodyHtml;
  if (grupos.length === 0) {
    bodyHtml = `<p class="prioridades-card__empty">Sin vencimientos próximos. 🎉</p>`;
  } else {
    bodyHtml = grupos.map(g => {
      const items = g.items.map(c => {
        const tipo     = c.tipo ?? 'fijo';
        const dotTipo  = tipo === 'personal' ? 'deuda-personal'
          : tipo === 'apartado'  ? 'fijo'
          : tipo;
        const icono    = tipo === 'personal'  ? icon('personales')
          : tipo === 'apartado'  ? (c.icono ? _esc(c.icono) : icon('apartados'))
          : icon(ICONO_TIPO[tipo] ?? 'recurring');
        const desc  = _esc(c.descripcion ?? '(sin descripción)');
        const monto = Number.isFinite(Number(c.monto)) ? f(Number(c.monto)) : '';
        return `
          <li class="prioridades-card__item">
            <span class="prioridades-card__dot cal-dot--${dotTipo}" aria-hidden="true">${icono}</span>
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

// ── HELPERS ──────────────────────────────────────────────────────

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

/**
 * Días desde hoy hasta una fecha ISO YYYY-MM-DD.
 * Devuelve null si la fecha es inválida. Negativo si ya pasó.
 * Usa comparación local (sin UTC) para consistencia con el resto de la UI.
 */
function _diasHastaFechaISO(fechaISO) {
  if (!fechaISO || typeof fechaISO !== 'string') return null;
  const partes = fechaISO.split('-').map(Number);
  if (partes.length !== 3 || partes.some(isNaN)) return null;
  const [yyyy, mm, dd] = partes;
  const hoy    = new Date();
  const hoyMs  = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const targetMs = new Date(yyyy, mm - 1, dd).getTime();
  return Math.round((targetMs - hoyMs) / 86_400_000);
}

/**
 * Items de S.personales cuya fechaLimite cae en los próximos `diasLimite` días.
 * Solo incluye préstamos no liquidados.
 */
function _personalesProximos(diasLimite) {
  const lista = Array.isArray(S.personales) ? S.personales : [];
  const resultado = [];
  for (const p of lista) {
    if (p.liquidado || !p.fechaLimite) continue;
    const dias = _diasHastaFechaISO(p.fechaLimite);
    if (dias === null || dias < 0 || dias > diasLimite) continue;
    resultado.push({
      diasRestantes: dias,
      tipo:          'personal',
      descripcion:   `${p.persona} te debe`,
      monto:         Math.max(0, (p.monto || 0) - (p.pagado || 0)),
    });
  }
  return resultado;
}

/**
 * Items de S.apartados cuya fechaObjetivo cae en los próximos `diasLimite` días.
 * Solo incluye apartados no completados con fecha pactada.
 */
function _apartadosProximos(diasLimite) {
  const lista = Array.isArray(S.apartados) ? S.apartados : [];
  const resultado = [];
  for (const a of lista) {
    if (a.completado || !a.fechaObjetivo) continue;
    const dias = _diasHastaFechaISO(a.fechaObjetivo);
    if (dias === null || dias < 0 || dias > diasLimite) continue;
    resultado.push({
      diasRestantes: dias,
      tipo:          'apartado',
      descripcion:   a.nombre,
      monto:         Math.max(0, (a.montoObjetivo || 0) - (a.montoActual || 0)),
      icono:         a.icono ?? null,
    });
  }
  return resultado;
}
