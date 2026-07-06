/**
 * movimientos/view.js - panel "Actividad reciente" en Inicio (TX.8a).
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (toda en logic.js).
 */

import { S } from '../../core/state.js';
import { f, esc as _esc, tiempoRelativo } from '../../infra/utils.js';
import { icon } from '../../infra/icons.js';
import { movimientosRecientes } from './logic.js';

/** Cuántos movimientos recientes se muestran en el panel de Inicio. */
const LIMITE_RECIENTES = 5;

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
    gastos:            S.gastos,
    ingresosPuntuales:  S.ingresosPuntuales,
    aportes:            S.ahorro?.aportes,
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
    </section>`;
}
