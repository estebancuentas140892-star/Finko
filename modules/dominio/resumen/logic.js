/**
 * resumen/logic.js - funciones puras del resumen semanal (rediseño 2026, F8).
 *
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 * Todo se deriva de S.gastos: no hay schema nuevo, no hay migración.
 *
 * Decisión de producto: solo resumen semanal con "días activos del mes" como
 * dato amable. Sin racha con castigo, sin telemetría. Ver ADR 008.
 */

// ── HELPERS DE FECHA ─────────────────────────────────────────────

/**
 * Convierte un string ISO `YYYY-MM-DD` a milisegundos locales (medianoche).
 * Devuelve null si la fecha es inválida o no es string.
 * Usa los componentes locales (no UTC) para que "hace 7 días" coincida con
 * el día visible al usuario en Colombia (GMT-5).
 *
 * @param {string} iso
 * @returns {number|null}
 */
function _ms(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const partes = iso.slice(0, 10).split('-').map(Number);
  if (partes.length !== 3 || partes.some(Number.isNaN)) return null;
  const [yyyy, mm, dd] = partes;
  return new Date(yyyy, mm - 1, dd).getTime();
}

/**
 * Cuántos días atrás cae `fechaISO` respecto de `hoyISO`.
 * 0 = hoy, 1 = ayer, 7 = hace una semana. Negativo si está en el futuro.
 * Devuelve null si alguna fecha es inválida.
 *
 * @param {string} fechaISO
 * @param {string} hoyISO
 * @returns {number|null}
 */
function _diasAtras(fechaISO, hoyISO) {
  const hoyMs   = _ms(hoyISO);
  const fechaMs = _ms(fechaISO);
  if (hoyMs === null || fechaMs === null) return null;
  return Math.round((hoyMs - fechaMs) / 86_400_000);
}

/**
 * Suma los montos de los gastos cuya fecha cae en la ventana
 * [minDias, maxDias] días atrás (ambos inclusive) respecto de hoy.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} hoyISO
 * @param {number} minDias
 * @param {number} maxDias
 * @returns {number} Total en COP.
 */
function _sumarVentana(gastos, hoyISO, minDias, maxDias) {
  let total = 0;
  for (const g of gastos ?? []) {
    const d = _diasAtras(g.fecha, hoyISO);
    if (d !== null && d >= minDias && d <= maxDias) total += (g.monto ?? 0);
  }
  return total;
}

// ── AGREGADOS SEMANALES ──────────────────────────────────────────

/**
 * Total gastado en los últimos 7 días (hoy y los 6 anteriores).
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} hoyISO - `YYYY-MM-DD`.
 * @returns {number}
 */
export function gastoUltimos7Dias(gastos, hoyISO) {
  return _sumarVentana(gastos, hoyISO, 0, 6);
}

/**
 * Total gastado en la semana previa (días 7 a 13 atrás), para comparar.
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} hoyISO
 * @returns {number}
 */
export function gastoSemanaPrevia(gastos, hoyISO) {
  return _sumarVentana(gastos, hoyISO, 7, 13);
}

/**
 * Cantidad de gastos registrados en los últimos 7 días.
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} hoyISO
 * @returns {number}
 */
export function registrosUltimos7Dias(gastos, hoyISO) {
  let n = 0;
  for (const g of gastos ?? []) {
    const d = _diasAtras(g.fecha, hoyISO);
    if (d !== null && d >= 0 && d <= 6) n++;
  }
  return n;
}

/**
 * Compara el gasto de esta semana contra la previa.
 * Direcciones:
 *   - 'subió'      gasté más que la semana pasada.
 *   - 'bajó'       gasté menos.
 *   - 'igual'      mismo monto (ambas con datos).
 *   - 'sin-previa' la semana pasada no hubo gasto: no hay base para comparar.
 *
 * `pct` es el cambio porcentual sobre la semana previa (entero, sin signo),
 * o null cuando no hay base de comparación.
 *
 * @param {number} actual - gasto de esta semana.
 * @param {number} previa - gasto de la semana pasada.
 * @returns {{ direccion: string, delta: number, pct: number|null }}
 */
export function compararSemanas(actual, previa) {
  const a = Number(actual) || 0;
  const p = Number(previa) || 0;
  const delta = a - p;

  let direccion;
  if (p === 0)        direccion = 'sin-previa';
  else if (delta > 0) direccion = 'subió';
  else if (delta < 0) direccion = 'bajó';
  else                direccion = 'igual';

  const pct = p > 0 ? Math.round((Math.abs(delta) / p) * 100) : null;
  return { direccion, delta, pct };
}

/**
 * Categoría con más gasto en los últimos 7 días.
 * Devuelve null si no hubo gasto en la semana.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} hoyISO
 * @returns {{ categoria: string, total: number }|null}
 */
export function categoriaTopSemana(gastos, hoyISO) {
  const porCategoria = Object.create(null);
  for (const g of gastos ?? []) {
    const d = _diasAtras(g.fecha, hoyISO);
    if (d === null || d < 0 || d > 6) continue;
    const cat = g.categoria ?? 'Otros';
    porCategoria[cat] = (porCategoria[cat] ?? 0) + (g.monto ?? 0);
  }

  let topCat = null;
  let topTotal = -Infinity;
  for (const [cat, total] of Object.entries(porCategoria)) {
    if (total > topTotal) {
      topTotal = total;
      topCat = cat;
    }
  }
  return topCat === null ? null : { categoria: topCat, total: topTotal };
}

/**
 * Días distintos del mes con al menos un gasto registrado.
 * Mide actividad financiera anotada, no aperturas de la app (ADR 008).
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} mesISO - prefijo del mes `YYYY-MM`.
 * @returns {number}
 */
export function diasActivosMes(gastos, mesISO) {
  if (!mesISO || typeof mesISO !== 'string') return 0;
  const prefijo = mesISO.slice(0, 7);
  const dias = new Set();
  for (const g of gastos ?? []) {
    if (typeof g.fecha === 'string' && g.fecha.startsWith(prefijo)) {
      dias.add(g.fecha.slice(0, 10));
    }
  }
  return dias.size;
}

// ── AGREGADO PRINCIPAL ───────────────────────────────────────────

/**
 * Construye el resumen semanal completo a partir de los gastos.
 * Es la única función que la vista necesita llamar.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} hoyISO - `YYYY-MM-DD` (inyectado para testeabilidad).
 * @returns {{
 *   actual: number,
 *   previa: number,
 *   comparacion: { direccion: string, delta: number, pct: number|null },
 *   top: { categoria: string, total: number }|null,
 *   registros: number,
 *   diasActivos: number,
 * }}
 */
export function resumenSemanal(gastos, hoyISO) {
  const actual = gastoUltimos7Dias(gastos, hoyISO);
  const previa = gastoSemanaPrevia(gastos, hoyISO);
  return {
    actual,
    previa,
    comparacion: compararSemanas(actual, previa),
    top:         categoriaTopSemana(gastos, hoyISO),
    registros:   registrosUltimos7Dias(gastos, hoyISO),
    diasActivos: diasActivosMes(gastos, hoyISO),
  };
}

/**
 * Indica si hay actividad suficiente para mostrar el resumen.
 * Regla: al menos un gasto en los últimos 7 días. Así un usuario nuevo (o una
 * semana sin movimientos) no ve una card con cifras en cero.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} hoyISO
 * @returns {boolean}
 */
export function hayResumen(gastos, hoyISO) {
  return registrosUltimos7Dias(gastos, hoyISO) > 0;
}
