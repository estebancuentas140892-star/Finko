/**
 * utils.js - utilidades transversales sin dependencias de dominio.
 *
 * Reglas:
 * - Sin DOM (excepto dialogo, que es UI de último recurso).
 * - Todas las funciones son puras o tienen efectos acotados y documentados.
 * - dialogo() es un wrapper temporal hasta que Fase 12 entregue modales propios.
 */

// ── FORMATO MONEDA ───────────────────────────────────────────────

/**
 * Formatea un número como pesos colombianos.
 * Sin dependencia de Intl locales para garantizar consistencia cross-env.
 *
 * @param {number} monto - valor en COP (puede ser negativo).
 * @returns {string} - ej. `$1.423.500` o `-$500`
 */
export function f(monto) {
  const redondeado = Math.round(monto);
  const abs = Math.abs(redondeado);
  const miles = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (redondeado < 0 ? '-$' : '$') + miles;
}

// ── FECHAS ───────────────────────────────────────────────────────

/**
 * Devuelve la fecha de hoy como string `YYYY-MM-DD` en hora local.
 * Seguro en cualquier zona horaria porque usa los getters locales de Date.
 *
 * @returns {string}
 */
export function hoy() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Dado un string `YYYY-MM-DD`, devuelve la representación legible en español.
 * Ej. `2026-05-12` → `12 de mayo de 2026`
 *
 * @param {string} iso - fecha en formato `YYYY-MM-DD`.
 * @returns {string}
 */
export function fechaLegible(iso) {
  // Forzamos UTC mediodia para evitar off-by-one en zonas GMT-N.
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// ── DIÁLOGO ──────────────────────────────────────────────────────

/**
 * Diálogo de confirmación o alerta.
 *
 * **v1 - wrapper temporal.** Fase 12 reemplaza la implementación por modales
 * propios del design system; la firma pública no cambia.
 *
 * @param {string} msg - texto a mostrar al usuario.
 * @param {'confirm' | 'alert'} [tipo='confirm']
 * @returns {boolean} - `true` si el usuario confirmó (o si es tipo `alert`).
 */
export function dialogo(msg, tipo = 'confirm') {
  if (tipo === 'confirm') return window.confirm(msg);
  window.alert(msg);
  return true;
}
