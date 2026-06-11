/**
 * compromisos/views/alertas.js - nudges del dashboard relacionados con compromisos.
 *
 * Renderiza dos alertas independientes:
 *   - Fijos sin pagar este mes (G.1)
 *   - Deudas durmiendo sin actividad (G.1)
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (toda en logic.js).
 */

import { S } from '../../../core/state.js';
import { f, esc as _esc } from '../../../infra/utils.js';
import { icon } from '../../../infra/icons.js';
import {
  detectarFijosSinPagarEsteMes,
  detectarDeudasDurmiendo,
} from '../logic.js';

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
  const icono      = icon('alert');
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
  const icono   = hayAlta ? icon('alert') : icon('moon');
  const n       = deudas.length;
  const titulo  = n === 1
    ? '1 deuda lleva tiempo sin actividad'
    : `${n} deudas llevan tiempo sin actividad`;

  const items = deudas.slice(0, 3).map(d => {
    const desc    = _esc(d.descripcion);
    const meses   = d.mesesDesdeCreacion;
    const saldo   = f(d.saldoPendiente);
    const consejo = d.sugerencia === 'liquidar'
      ? 'puedes liquidarla con la próxima cuota'
      : 'retoma los pagos para evitar intereses';
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
