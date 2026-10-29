/**
 * logros/index.js - detección y guardado de logros.
 *
 * Desde el ADR 101 (D2 y D3) el adulto ya no ve "Tu progreso" ni los avisos
 * de logro: Finko del adulto ayuda a decidir, no premia. Los logros se siguen
 * calculando y guardando en `S.logros`, en silencio, para que la historia no
 * se pierda si algún día vuelven. La vitrina (`view.js`) queda sin pantalla.
 *
 * Responsabilidades:
 * - Al arrancar y en cada state:change: evaluar y guardar los nuevos.
 * - Al terminar el onboarding, que fija `S.onboarded` sin state:change: lo
 *   mismo, para que "primer-paso" no espere a la siguiente recarga.
 */

import { S, EventBus } from '../../core/state.js';
import { save }        from '../../core/storage.js';
import { evaluarLogros } from './logic.js';

// ── PUNTO DE ENTRADA ─────────────────────────────────────────────

/** Inicializa el sistema de logros. Se llama una vez desde bootstrap.js. */
export function initLogros() {
  _evaluarYGuardar();
  EventBus.on('state:change', _evaluarYGuardar);
  EventBus.on('onboarding:completado', _evaluarYGuardar);
}

// ── LOGICA INTERNA ───────────────────────────────────────────────

/** Guarda en S.logros los logros cumplidos que todavía no estaban. */
function _evaluarYGuardar() {
  const cumplidos  = evaluarLogros(S);
  const yaLogrados = Array.isArray(S.logros) ? S.logros : [];
  const nuevos     = cumplidos.filter(id => !yaLogrados.includes(id));
  if (nuevos.length === 0) return;
  S.logros = [...yaLogrados, ...nuevos];
  save();
}
