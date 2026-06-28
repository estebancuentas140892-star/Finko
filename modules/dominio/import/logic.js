/**
 * import/logic.js - validación, normalización y detección de duplicados para
 * importar gastos desde CSV.
 *
 * Decisión arquitectónica:
 *   Importamos SOLO gastos. Los ingresos en S son recurrentes (con frecuencia),
 *   no transacciones individuales - no encajan con el modelo de extracto bancario.
 *
 * Formato CSV soportado (case-insensitive en headers):
 *   - fecha       (requerido) - YYYY-MM-DD o DD/MM/YYYY
 *   - monto       (requerido) - número positivo en COP (acepta separadores miles)
 *   - descripcion (requerido) - texto no vacío
 *   - categoria   (opcional)  - default 'Otros'
 *   - cuenta      (opcional)  - nombre de cuenta existente; null si no matchea
 *   - nota        (opcional)  - texto libre
 *
 * Sin DOM. Sin S directo. Pure functions testeables en Node.
 */

import { parsearCSVaObjetos } from '../../infra/csv.js';

/** Headers reconocidos (lowercase). Cualquier otro header se ignora. */
const HEADERS_REQUERIDOS = ['fecha', 'monto', 'descripcion'];
const HEADERS_OPCIONALES = ['categoria', 'cuenta', 'nota'];
const HEADERS_VALIDOS    = [...HEADERS_REQUERIDOS, ...HEADERS_OPCIONALES];

// ── API PÚBLICA ──────────────────────────────────────────────────

/**
 * Parsea un texto CSV completo y devuelve filas listas para preview.
 *
 * Cada fila resultante tiene 3 estados:
 *   - estado: 'valido'    → listo para importar
 *   - estado: 'duplicado' → ya existe en gastosExistentes; se omite
 *   - estado: 'error'     → tiene errores de validación; no se importa
 *
 * @param {string} csvText
 * @param {import('../../core/state.js').Gasto[]} gastosExistentes
 * @param {import('../../core/state.js').Cuenta[]} [cuentas=[]]
 * @returns {{
 *   total: number,
 *   validos: Array<{ estado:'valido', fila: number, datos: import('../../core/state.js').Gasto }>,
 *   duplicados: Array<{ estado:'duplicado', fila: number, datos: import('../../core/state.js').Gasto }>,
 *   errores: Array<{ estado:'error', fila: number, mensajes: string[], crudo: Record<string,string> }>,
 *   headersDesconocidos: string[],
 *   error?: string,
 * }}
 */
export function procesarCSV(csvText, gastosExistentes = [], cuentas = []) {
  if (!csvText || typeof csvText !== 'string' || csvText.trim() === '') {
    return _resultadoVacio({ error: 'El archivo está vacío.' });
  }

  const rawObjetos = parsearCSVaObjetos(csvText);
  if (rawObjetos.length === 0) {
    return _resultadoVacio({ error: 'No hay filas de datos en el CSV.' });
  }

  // Validar headers presentes.
  const headersPresentes = Object.keys(rawObjetos[0]).map(h => h.toLowerCase());
  const faltantes = HEADERS_REQUERIDOS.filter(h => !headersPresentes.includes(h));
  if (faltantes.length > 0) {
    return _resultadoVacio({
      error: `Faltan columnas obligatorias: ${faltantes.join(', ')}.`,
    });
  }

  const headersDesconocidos = headersPresentes
    .filter(h => !HEADERS_VALIDOS.includes(h));

  // Set de hashes de gastos existentes para detectar duplicados (incluyendo dentro del propio CSV).
  const hashesExistentes = new Set(gastosExistentes.map(hashGasto));
  const hashesYaImportados = new Set();
  const nombresCuentas = new Map(
    (cuentas ?? []).filter(c => c.activa !== false).map(c => [c.nombre.toLowerCase(), c.id]),
  );

  const validos = [];
  const duplicados = [];
  const errores = [];

  rawObjetos.forEach((raw, idx) => {
    const numeroFila = idx + 2; // +1 por 0-index, +1 por header.
    const crudo = _normalizarHeaders(raw);
    const mensajes = validarFila(crudo);

    if (mensajes.length > 0) {
      errores.push({ estado: 'error', fila: numeroFila, mensajes, crudo });
      return;
    }

    const gasto = normalizarFila(crudo, nombresCuentas);
    const hash  = hashGasto(gasto);

    if (hashesExistentes.has(hash) || hashesYaImportados.has(hash)) {
      duplicados.push({ estado: 'duplicado', fila: numeroFila, datos: gasto });
      return;
    }

    hashesYaImportados.add(hash);
    validos.push({ estado: 'valido', fila: numeroFila, datos: gasto });
  });

  return {
    total: rawObjetos.length,
    validos,
    duplicados,
    errores,
    headersDesconocidos,
  };
}

/**
 * Hash determinista de un gasto para detectar duplicados.
 * Considera: fecha (ISO) + monto entero + descripcion lowercase trimmed.
 * Tolerante a variaciones de mayúsculas/espacios en la descripción.
 *
 * @param {{ fecha: string, monto: number, descripcion: string }} g
 * @returns {string}
 */
export function hashGasto(g) {
  const fecha = String(g.fecha ?? '').trim();
  const monto = Math.round(Number(g.monto) || 0);
  const desc  = String(g.descripcion ?? '').trim().toLowerCase();
  return `${fecha}|${monto}|${desc}`;
}

/**
 * Valida una fila ya normalizada por _normalizarHeaders. Devuelve errores
 * sin transformar valores (solo verifica).
 *
 * @param {Record<string,string>} fila
 * @returns {string[]}
 */
export function validarFila(fila) {
  const errores = [];

  // Fecha.
  const fechaParseada = parsearFecha(fila.fecha);
  if (!fechaParseada) {
    errores.push(`Fecha inválida: "${fila.fecha || '(vacía)'}". Usa YYYY-MM-DD o DD/MM/YYYY.`);
  }

  // Monto.
  const monto = parsearMonto(fila.monto);
  if (monto == null) {
    errores.push(`Monto inválido: "${fila.monto || '(vacío)'}".`);
  } else if (monto <= 0) {
    errores.push(`El monto debe ser mayor a 0.`);
  }

  // Descripción.
  if (!fila.descripcion || !fila.descripcion.trim()) {
    errores.push('La descripción es obligatoria.');
  }

  return errores;
}

/**
 * Convierte una fila validada al shape final del Gasto. No incluye `id` (lo
 * asigna crud.guardar al hacer push).
 *
 * @param {Record<string,string>} fila
 * @param {Map<string,string>} nombresCuentas - Map<nombreLower, cuentaId>.
 * @returns {Omit<import('../../core/state.js').Gasto, 'id'>}
 */
export function normalizarFila(fila, nombresCuentas = new Map()) {
  const cuentaNombre = (fila.cuenta ?? '').trim().toLowerCase();
  const cuentaId     = cuentaNombre ? (nombresCuentas.get(cuentaNombre) ?? null) : null;

  return {
    fecha:       parsearFecha(fila.fecha),
    monto:       parsearMonto(fila.monto),
    descripcion: fila.descripcion.trim(),
    categoria:   (fila.categoria ?? '').trim() || 'Otros',
    cuentaId,
    nota:        (fila.nota ?? '').trim(),
  };
}

// ── PARSERS UTILITARIOS ──────────────────────────────────────────

/**
 * Parsea una fecha en formatos comunes a ISO YYYY-MM-DD.
 * Devuelve null si no se reconoce.
 *
 * Formatos soportados:
 *   - YYYY-MM-DD
 *   - YYYY/MM/DD
 *   - DD/MM/YYYY
 *   - DD-MM-YYYY
 *
 * @param {string} raw
 * @returns {string|null}
 */
export function parsearFecha(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;

  // ISO YYYY-MM-DD o YYYY/MM/DD
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return _formatearFecha(Number(y), Number(mo), Number(d));
  }

  // DD/MM/YYYY o DD-MM-YYYY
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return _formatearFecha(Number(y), Number(mo), Number(d));
  }

  return null;
}

/**
 * Parsea un monto en formato colombiano o internacional.
 * - Acepta separadores de miles: `.` o `,` o ` ` (espacio).
 * - Acepta separadores decimales: `.` o `,` (heurística por última ocurrencia).
 * - Acepta símbolo `$` opcional.
 * - Negativos NO permitidos para gastos (devuelve null).
 *
 * @param {string} raw
 * @returns {number|null}
 */
export function parsearMonto(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/^\$/, '').replace(/\s/g, '');
  if (!s) return null;
  if (s.startsWith('-')) return null;

  // Si tiene punto y coma: el último es el decimal, el otro es miles.
  const tieneComa  = s.includes(',');
  const tienePunto = s.includes('.');

  let normalizado;
  if (tieneComa && tienePunto) {
    const ultimaComa  = s.lastIndexOf(',');
    const ultimoPunto = s.lastIndexOf('.');
    if (ultimaComa > ultimoPunto) {
      // Formato europeo: 1.234.567,89
      normalizado = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato US: 1,234,567.89
      normalizado = s.replace(/,/g, '');
    }
  } else if (tieneComa) {
    // Solo coma. Si hay más de una, es separador de miles. Si una sola y queda
    // <= 2 dígitos a la derecha, es decimal.
    const partes = s.split(',');
    if (partes.length > 2 || (partes[1] && partes[1].length === 3)) {
      normalizado = s.replace(/,/g, '');
    } else {
      normalizado = s.replace(',', '.');
    }
  } else if (tienePunto) {
    // Solo punto. Heurística similar.
    const partes = s.split('.');
    if (partes.length > 2 || (partes[1] && partes[1].length === 3)) {
      normalizado = s.replace(/\./g, '');
    } else {
      normalizado = s;
    }
  } else {
    normalizado = s;
  }

  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

// ── INTERNAS ─────────────────────────────────────────────────────

function _formatearFecha(y, m, d) {
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  // Verificar día válido para el mes (incluyendo bisiestos).
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Convierte los keys de una fila a lowercase. Hace match insensible a
 * mayúsculas con los headers válidos.
 */
function _normalizarHeaders(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k.toLowerCase()] = v;
  }
  return out;
}

function _resultadoVacio(extra = {}) {
  return {
    total: 0,
    validos: [],
    duplicados: [],
    errores: [],
    headersDesconocidos: [],
    ...extra,
  };
}
