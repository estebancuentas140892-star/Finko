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
import { icon, iconoCategoria } from '../../../infra/icons.js';
import {
  compromisosActivos,
  compromisosProximos,
  detectarVencidosCompletos,
  agruparPorDiasRestantes,
  sumarMontos,
  ICONO_TIPO,
  LABEL_TIPO,
} from '../logic.js';

// IV.2c (ADR 031): "el color nunca viaja solo" (D1) - cada ítem de
// "Pendientes del mes" y "Próximas prioridades" lleva, además del icono y
// el color de su sección de origen, una etiqueta de texto con el tipo
// (`.dom-badge`, ya reutilizado en toda la app). `personal` (Me deben) y
// `apartado` no están en LABEL_TIPO (son de otros dominios, no de
// compromisos), por eso el mapeo vive local a este archivo.
const _DOM_BADGE_POR_TIPO = {
  'fijo':           'agenda',
  'deuda-entidad':  'compromisos',
  'deuda-personal': 'personales',
  'personal':       'personales',
  'apartado':       'ahorro',
};
const _LABEL_POR_TIPO = {
  ...LABEL_TIPO,
  'personal': 'Préstamo',
  'apartado': 'Apartado',
};
function _tipoBadge(tipo) {
  const dom = _DOM_BADGE_POR_TIPO[tipo] ?? 'agenda';
  const label = _LABEL_POR_TIPO[tipo] ?? tipo;
  return `<span class="dom-badge dom-badge--${dom}">${_esc(label)}</span>`;
}

// "Pendientes del mes" (IN.8e, ADR 034 D5) usa un badge más corto que el
// resto de la app ("Deuda" en vez de "Deuda con entidad"/"Deuda personal"):
// decisión propia de este panel, `_tipoBadge()` (arriba) sigue intacto para
// "Próximas prioridades", que no cambia con esta rebanada.
function _tipoBadgeCorto(tipo) {
  const dom = _DOM_BADGE_POR_TIPO[tipo] ?? 'agenda';
  const label = tipo === 'fijo' ? 'Gasto fijo' : 'Deuda';
  return `<span class="dom-badge dom-badge--${dom}">${label}</span>`;
}

/**
 * Ícono de un apartado (CAT.2c): `apartado.icono` admite dos formatos, id de
 * símbolo del catálogo ('c-carro') o emoji legacy. Antes se escapaba siempre,
 * así que un apartado con id del catálogo imprimía el texto "c-carro" dentro
 * del chip. Mismo criterio que `_iconoApartado()` en apartados/view.js,
 * replicado acá porque ningún dominio importa a otro (ADN 10).
 */
function _iconoApartado(valor) {
  if (!valor) return icon('apartados');
  return /^[a-z]-/.test(valor) ? iconoCategoria(valor) : _esc(valor);
}

// ── DASHBOARD: PANEL VENCIDOS ────────────────────────────────────

/** Filas visibles en "Pendientes del mes" antes de la fila "Ver los N". */
const MAX_VISIBLES = 4;

/**
 * Renderiza en `#panel-vencidos` la lista de compromisos vencidos del mes
 * (fijo, deuda, agenda con día de pago ya pasado). Vacío si no hay nada,
 * y limpia el panel para no ocupar espacio.
 *
 * Muestra hasta `MAX_VISIBLES` items; si hay más, el resto NO se esconde tras
 * un scroll interno (invisible en movil: el contador decia 5 y se veian 3, sin
 * ninguna pista), sino tras una fila explicita "Ver los N en el calendario".
 *
 * No-op si el contenedor no existe.
 */
export function renderPanelVencidos() {
  const el = document.getElementById('panel-vencidos');
  if (!el) return;

  const vencidos = detectarVencidosCompletos(S.compromisos, _hoyISOLocal());

  if (vencidos.length === 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const n = vencidos.length;
  // ADR 034 D5: el título deja de incluir el conteo ("2 pendientes del
  // mes"); el número vive solo en el badge circular del header.
  const contadorLabel = n === 1 ? '1 pendiente' : `${n} pendientes`;

  const items = vencidos.slice(0, MAX_VISIBLES).map(v => {
    const tipo  = v.tipo ?? 'fijo';
    const icono = icon(ICONO_TIPO[tipo] ?? 'recurring');
    const desc  = _esc(v.descripcion);
    const monto = f(v.monto);
    const dias  = v.diasAtraso;
    // Sin línea roja lateral (D5): la urgencia vive SOLO en este texto,
    // nunca en el borde/fondo de la tarjeta (ADR 019, "gastar no es
    // incumplir"). "Vence hoy" en warning; ya vencido, en danger.
    const esHoy = dias === 0;
    const estadoTexto = esHoy ? 'Vence hoy'
      : dias === 1              ? 'Venció ayer'
      :                           `Venció hace ${dias} días`;
    const estadoClase = esHoy ? 'vencidos-card__estado--warning' : 'vencidos-card__estado--danger';
    return `
      <li class="vencidos-card__item">
        <span class="vencidos-card__icon vencidos-card__icon--${tipo}" aria-hidden="true">${icono}</span>
        <div class="vencidos-card__body">
          <p class="vencidos-card__name">${desc}</p>
          <div class="vencidos-card__meta">
            ${_tipoBadgeCorto(tipo)}
            <span class="vencidos-card__estado ${estadoClase}">${estadoTexto}</span>
          </div>
        </div>
        <p class="vencidos-card__amount">${monto}</p>
      </li>`;
  }).join('');

  const total = f(sumarMontos(vencidos));

  // Los que no caben no desaparecen en silencio: fila tactil hacia el
  // calendario, que es donde estan todos.
  const verMas = n > MAX_VISIBLES
    ? `<a href="#agenda" class="vencidos-card__ver-mas">Ver los ${n} en el calendario</a>`
    : '';

  el.innerHTML = `
    <section class="vencidos-card" aria-label="Pendientes del mes">
      <header class="vencidos-card__header">
        <h2 class="vencidos-card__title">
          Pendientes del mes
          <span class="vencidos-card__counter" aria-label="${contadorLabel}">${n}</span>
        </h2>
        <a href="#agenda" class="vencidos-card__link"
           aria-label="Ir al calendario">Ver calendario</a>
      </header>
      <ul class="vencidos-card__list" role="list">
        ${items}
      </ul>
      ${verMas}
      <p class="vencidos-card__total">
        <span>Total pendiente de pago</span>
        <span class="vencidos-card__total-amount">${total}</span>
      </p>
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

  // Los que vencen hoy (diasRestantes === 0) ya se muestran en "Pendientes
  // del mes" (panel-vencidos, vía detectarVencidosCompletos): sin este
  // filtro, un mismo compromiso aparece duplicado el día que vence (IN.7).
  const proxComp = compromisosProximos(S.compromisos, 7).filter(c => c.diasRestantes > 0);
  const proxPers = _personalesProximos(7);
  const proxApar = _apartadosProximos(7);

  const compActivos = compromisosActivos(S.compromisos).length > 0;
  if (!compActivos && proxPers.length === 0 && proxApar.length === 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const proxTodos = [...proxComp, ...proxPers, ...proxApar]
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
  const grupos = agruparPorDiasRestantes(proxTodos);

  let bodyHtml;
  let totalHtml = '';
  if (grupos.length === 0) {
    bodyHtml = `<p class="prioridades-card__empty">Todo al día. Sin vencimientos en los próximos 7 días.</p>`;
  } else {
    const total = f(sumarMontos(proxTodos));
    totalHtml = `
      <p class="prioridades-card__total">
        <span>Total de próximas prioridades</span>
        <span class="prioridades-card__total-amount">${total}</span>
      </p>`;
    bodyHtml = grupos.map(g => {
      const items = g.items.map(c => {
        const tipo     = c.tipo ?? 'fijo';
        // chipTipo alimenta .prioridades-card__icon--* (mismo chip que
        // "Pendientes del mes"): deuda-personal para 'personal' (Me deben
        // comparte la familia rosa de personales), 'apartado' tiene el suyo
        // (IV.2c, antes prestaba 'fijo' por error: pintaba un apartado con el
        // color de gasto fijo).
        const chipTipo = tipo === 'personal' ? 'deuda-personal'
          : tipo;
        const icono    = tipo === 'personal'  ? icon('personales')
          : tipo === 'apartado'  ? _iconoApartado(c.icono)
          : icon(ICONO_TIPO[tipo] ?? 'recurring');
        const desc  = _esc(c.descripcion ?? '(sin descripción)');
        // Las deudas guardan su cuota en `cuotaMensual` (v6); fijos, préstamos
        // personales y apartados llegan con `monto`.
        const valor = Number(c.monto ?? c.cuotaMensual);
        const monto = Number.isFinite(valor) ? f(valor) : '';
        // Anatomía de dos líneas idéntica a .vencidos-card__item: el badge deja
        // de robarle ancho al nombre en la misma línea (a 390px truncaba a la
        // mitad) y el glifo deja de pintarse del color de su propio fondo.
        return `
          <li class="prioridades-card__item">
            <span class="prioridades-card__icon prioridades-card__icon--${chipTipo}" aria-hidden="true">${icono}</span>
            <div class="prioridades-card__body">
              <p class="prioridades-card__name">${desc}</p>
              <div class="prioridades-card__meta">${_tipoBadge(tipo)}</div>
            </div>
            ${monto ? `<p class="prioridades-card__amount">${monto}</p>` : ''}
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
        <h2 class="prioridades-card__title">Próximas prioridades</h2>
        <a href="#agenda" class="prioridades-card__link"
           aria-label="Ir al calendario">Ver calendario</a>
      </header>
      <div class="prioridades-card__body">
        ${bodyHtml}
      </div>
      ${totalHtml}
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
