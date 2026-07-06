/**
 * movimientos/view.js - panel "Actividad reciente" en Inicio (TX.8a).
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (toda en logic.js).
 */

import { S } from '../../core/state.js';
import { f, esc as _esc, tiempoRelativo, fechaLegible } from '../../infra/utils.js';
import { icon, emptyArt, tejaCategoria } from '../../infra/icons.js';
import { movimientosRecientes, movimientosCompletos } from './logic.js';

/** Cuántos movimientos recientes se muestran en el panel de Inicio. */
const LIMITE_RECIENTES = 5;

/** Etiqueta legible por tipo de movimiento, usada en el subtítulo de la vista completa. */
const _TIPO_LABEL = { gasto: 'Gasto', ingreso: 'Ingreso', aporte: 'Aporte' };

/**
 * Días transcurridos desde una fecha ISO (YYYY-MM-DD) hasta hoy, en hora
 * local. Negativo si la fecha es futura (no debería pasar con movimientos ya
 * registrados, pero `tiempoRelativo` ya clampa a 0).
 *
 * @param {string} fechaISO
 * @returns {number}
 */
function _diasDesde(fechaISO) {
  const partes = fechaISO.split('-').map(Number);
  if (partes.length !== 3 || partes.some(Number.isNaN)) return 0;
  const [yyyy, mm, dd] = partes;
  const hoy   = new Date();
  const hoyMs = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const fchMs = new Date(yyyy, mm - 1, dd).getTime();
  return Math.round((hoyMs - fchMs) / 86_400_000);
}

/**
 * Renderiza en `#panel-actividad-reciente` los últimos movimientos derivados
 * de gastos, ingresos puntuales y aportes al fondo (ADR 028 D5). Vacío si no
 * hay ninguno, y limpia el panel para no ocupar espacio. No-op si el
 * contenedor no existe.
 */
export function renderActividadReciente() {
  const el = document.getElementById('panel-actividad-reciente');
  if (!el) return;

  const movs = movimientosRecientes({
    gastos:                   S.gastos,
    ingresosPuntuales:        S.ingresosPuntuales,
    aportes:                  S.ahorro?.aportes,
    categoriasPersonalizadas: S.categoriasPersonalizadas,
  }, LIMITE_RECIENTES);

  if (movs.length === 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const items = movs.map(m => {
    const esIngreso = m.direccion === 'ingreso';
    const signo      = esIngreso ? '+' : '-';
    const claseMonto = esIngreso ? 'actividad-reciente__monto--ingreso' : 'actividad-reciente__monto--egreso';
    return `
      <li class="actividad-reciente__item">
        <span class="actividad-reciente__icon" aria-hidden="true">${icon(m.icono)}</span>
        <div class="actividad-reciente__body">
          <p class="actividad-reciente__desc">${_esc(m.descripcion)}</p>
          <p class="actividad-reciente__cuando">${tiempoRelativo(_diasDesde(m.fecha))}</p>
        </div>
        <p class="actividad-reciente__monto ${claseMonto}">${signo}${f(m.monto)}</p>
      </li>`;
  }).join('');

  el.innerHTML = `
    <section class="actividad-reciente" aria-label="Actividad reciente">
      <header class="actividad-reciente__header">
        <h2 class="actividad-reciente__title">${icon('recurring')} Actividad reciente</h2>
      </header>
      <ul class="actividad-reciente__list" role="list">${items}</ul>
      <a class="actividad-reciente__ver-todo" href="#movimientos">Ver todo</a>
    </section>`;
}

// ── VISTA COMPLETA (TX.8b, ruta propia #movimientos) ────────────

/**
 * Nombre de la cuenta para mostrar en el subtítulo del movimiento, o `null`
 * si el movimiento no tiene cuenta asociada (aportes) o la cuenta ya no existe.
 * @param {string|null} cuentaId
 * @returns {string|null}
 */
function _nombreCuenta(cuentaId) {
  if (!cuentaId) return null;
  return S.cuentas?.find(c => c.id === cuentaId)?.nombre ?? null;
}

/** "Julio 2026" a partir de una fecha ISO, para el divisor de mes. */
function _mesAnioLabel(fechaISO) {
  const d = new Date(`${fechaISO}T12:00:00Z`);
  const label = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Agrupa movimientos ya ordenados (más reciente primero) en bloques
 * consecutivos por mes calendario, para el divisor de la vista completa.
 * @param {import('./logic.js').Movimiento[]} movs
 * @returns {Array<{ label: string, items: import('./logic.js').Movimiento[] }>}
 */
function _agruparPorMes(movs) {
  const grupos = [];
  let claveActual = null;
  for (const m of movs) {
    const clave = m.fecha.slice(0, 7); // YYYY-MM
    if (clave !== claveActual) {
      grupos.push({ label: _mesAnioLabel(m.fecha), items: [] });
      claveActual = clave;
    }
    grupos[grupos.length - 1].items.push(m);
  }
  return grupos;
}

function _renderMovimientoItem(m) {
  const esIngreso     = m.direccion === 'ingreso';
  const signo         = esIngreso ? '+' : '-';
  const claseMonto    = esIngreso ? 'list-item__amount--ingreso' : '';
  const cuenta        = _nombreCuenta(m.cuentaId);
  const subtitulo     = [_TIPO_LABEL[m.tipo] ?? m.tipo, fechaLegible(m.fecha), cuenta]
    .filter(Boolean).map(_esc).join(' · ');

  return `
    <article class="list-item" data-id="${_esc(m.id)}">
      <div class="list-item__icon" aria-hidden="true">${tejaCategoria(m.icono, m.dominio)}</div>
      <div class="list-item__body">
        <p class="list-item__title">${_esc(m.descripcion)}</p>
        <p class="list-item__subtitle">${subtitulo}</p>
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount ${claseMonto}">${signo}${f(m.monto)}</p>
      </div>
    </article>`;
}

function _renderEmptyMovimientos() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('recurring')}</div>
      <p class="empty-state__title">Todavía no hay movimientos</p>
      <p class="empty-state__desc">Tus gastos, ingresos y aportes al fondo aparecerán aquí, ordenados por fecha.</p>
    </div>`;
}

/**
 * Renderiza en `#lista-movimientos` el historial completo (TX.8b, ruta
 * `#movimientos`), agrupado por mes. No-op si el contenedor no existe.
 */
export function renderMovimientosCompletos() {
  const el = document.getElementById('lista-movimientos');
  if (!el) return;

  const movs = movimientosCompletos({
    gastos:                   S.gastos,
    ingresosPuntuales:        S.ingresosPuntuales,
    aportes:                  S.ahorro?.aportes,
    categoriasPersonalizadas: S.categoriasPersonalizadas,
  });

  if (movs.length === 0) {
    el.innerHTML = _renderEmptyMovimientos();
    return;
  }

  el.innerHTML = _agruparPorMes(movs).map(({ label, items }) => `
    <div class="movimientos-mes" role="presentation">${_esc(label)}</div>
    ${items.map(_renderMovimientoItem).join('')}`).join('');
}
