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

const _RX_FECHA_CALENDARIO = /^(\d{4})-(\d{2})-(\d{2})$/;
const _RX_INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * Día de calendario local (`YYYY-MM-DD`) de una fecha guardada (HF.0e,
 * BUG-025, P3 del ADR 091). Distingue tres casos:
 *
 * - **Fecha de calendario** (`'2026-07-31'`): ya es un día. Se devuelve tal
 *   cual, sin pasar por ninguna zona horaria, si la fecha existe.
 * - **Instante ISO con hora** (`'2026-08-01T01:00:00.000Z'`, el sello de
 *   `crud.guardar()`): se convierte al día local del entorno. Quien crea algo en
 *   Colombia el 31 de julio a las 8:00 p. m. guarda ese instante, y su día es el
 *   31, no el 1 que dicen sus diez primeros caracteres. Sin zona escrita, el
 *   instante ya es hora local.
 * - **Ausente o inválido**: `null`. No se inventa una fecha.
 *
 * La zona es la del entorno, no una fija: el día de alguien es el de su reloj.
 *
 * @param {unknown} valor
 * @returns {string|null}
 */
export function fechaLocalISO(valor) {
  if (typeof valor !== 'string') return null;

  const cal = _RX_FECHA_CALENDARIO.exec(valor);
  if (cal) {
    const d = new Date(+cal[1], +cal[2] - 1, +cal[3]);
    const existe = d.getFullYear() === +cal[1] && d.getMonth() === +cal[2] - 1 && d.getDate() === +cal[3];
    return existe ? valor : null;
  }

  if (!_RX_INSTANTE.test(valor)) return null;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
 * Meses en tres letras (ADR 102 D1). Catálogo propio y no `Intl`: en es-CO
 * `Intl` abrevia septiembre como "sept" y su forma cambia entre motores.
 */
const _MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Día y mes de un `YYYY-MM-DD`, sin año: `2026-10-28` → `28 de oct`.
 * Para listas agrupadas por mes, donde el grupo ya dice el año (ADR 102 D2).
 * Se lee del texto, sin `Date`, así que no hay off-by-one en GMT-N.
 *
 * @param {string} iso - fecha en formato `YYYY-MM-DD`.
 * @returns {string} '' si `iso` no es una fecha.
 */
export function fechaDiaMes(iso) {
  const m = _RX_FECHA_CALENDARIO.exec(String(iso ?? '').slice(0, 10));
  const mes = m ? _MESES_CORTOS[Number(m[2]) - 1] : undefined;
  return mes ? `${Number(m[3])} de ${mes}` : '';
}

/**
 * La fecha que se lee en la app (ADR 102 D1): día y mes en tres letras, y el
 * año solo si no es el de hoy. Con hoy en 2026: `2026-10-28` → `28 de oct`,
 * `2027-04-30` → `30 de abr de 2027`.
 *
 * @param {string} iso - fecha en formato `YYYY-MM-DD`.
 * @returns {string} '' si `iso` no es una fecha.
 */
export function fechaLegible(iso) {
  const diaMes = fechaDiaMes(iso);
  if (!diaMes) return '';
  const anio = String(iso).slice(0, 4);
  return anio === hoy().slice(0, 4) ? diaMes : `${diaMes} de ${anio}`;
}