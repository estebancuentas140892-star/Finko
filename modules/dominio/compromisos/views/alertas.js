/**
 * compromisos/views/alertas.js - nudges de la sección Deudas relacionados con compromisos.
 *
 * Renderiza la alerta de deudas durmiendo (G.1).
 * Los gastos fijos vencidos del mes se centralizaron en el panel
 * "N pendientes del mes" del Dashboard (#panel-vencidos, D.6).
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (toda en logic.js).
 */

import { S } from '../../../core/state.js';
import { f, esc as _esc } from '../../../infra/utils.js';
import { icon } from '../../../infra/icons.js';
import {
  detectarDeudasDurmiendo,
} from '../logic.js';

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
