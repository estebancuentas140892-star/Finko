/**
 * utils.js - utilidades transversales sin dependencias de dominio.
 *
 * Reglas:
 * - Sin DOM.
 * - Todas las funciones son puras o tienen efectos acotados y documentados.
 */

// ── ESCAPE HTML ──────────────────────────────────────────────────

/**
 * Escapa caracteres especiales HTML para evitar XSS en templates de string.
 * Única fuente de verdad: todos los view.js importan esta función.
 *
 * @param {string | null | undefined} str - texto a escapar.
 * @returns {string}
 */
export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

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
 * Convierte una cantidad de días en tiempo relativo natural en español.
 * Pensado para antigüedades ("hace 5 años" en vez de "1.825 días").
 *
 * Escala: 0 → `hoy` · 1 → `ayer` · 2-6 → `hace N días` ·
 * 7-29 → `hace N semanas` · 30-364 → `hace N meses` · 365+ → `hace N años`.
 * Siempre en minúscula: el llamador capitaliza si va al inicio de frase.
 *
 * @param {number} dias - días transcurridos (negativos o inválidos cuentan como 0).
 * @returns {string}
 */
export function tiempoRelativo(dias) {
  const d = Math.max(0, Math.floor(Number(dias) || 0));
  if (d === 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 7)   return `hace ${d} días`;
  if (d < 30) {
    const sem = Math.floor(d / 7);
    return sem === 1 ? 'hace 1 semana' : `hace ${sem} semanas`;
  }
  if (d < 365) {
    const meses = Math.floor(d / 30);
    return meses === 1 ? 'hace 1 mes' : `hace ${meses} meses`;
  }
  const anios = Math.floor(d / 365);
  return anios === 1 ? 'hace 1 año' : `hace ${anios} años`;
}

/**
 * Caché de instancias de `Intl.DateTimeFormat` por firma (locale + opciones).
 *
 * Construir un `Intl.DateTimeFormat` es caro (PERF.7): las vistas de lista lo
 * hacían una vez por ítem (decenas de construcciones por render, cientos con
 * años de historial en Movimientos). Cachear por firma reduce eso a una sola
 * construcción por combinación durante toda la vida de la app. `format()`
 * produce exactamente lo mismo que `Date.prototype.toLocaleDateString` con los
 * mismos argumentos, así que el texto no cambia.
 *
 * @type {Map<string, Intl.DateTimeFormat>}
 */
const _cacheFormatoFecha = new Map();

/**
 * Devuelve un `Intl.DateTimeFormat` cacheado para `locale` + `opciones`.
 * La firma de caché serializa las opciones: dos llamadas con el mismo locale y
 * las mismas opciones (mismo orden de claves) comparten instancia.
 *
 * @param {string} locale
 * @param {Intl.DateTimeFormatOptions} opciones
 * @returns {Intl.DateTimeFormat}
 */
export function formateadorFecha(locale, opciones) {
  const clave = `${locale}|${JSON.stringify(opciones)}`;
  let fmt = _cacheFormatoFecha.get(clave);
  if (fmt === undefined) {
    fmt = new Intl.DateTimeFormat(locale, opciones);
    _cacheFormatoFecha.set(clave, fmt);
  }
  return fmt;
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
  return formateadorFecha('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}