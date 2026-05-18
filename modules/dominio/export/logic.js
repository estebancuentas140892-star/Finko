/**
 * export/logic.js — serialización de gastos a CSV.
 *
 * Formato de salida compatible con el importador (D.2): roundtrip garantizado.
 * Headers: fecha, monto, descripcion, categoria, cuenta, nota
 *
 * Sin DOM. Función pura testeable en Node.
 */

import { serializarCSV } from '../../infra/csv.js';

const HEADERS_EXPORT = ['fecha', 'monto', 'descripcion', 'categoria', 'cuenta', 'nota'];

/**
 * Convierte un array de gastos a texto CSV listo para descargar.
 *
 * - BOM UTF-8 incluido al inicio para compatibilidad con Excel en Windows.
 * - Orden cronológico inverso (más reciente primero).
 * - cuentaId se resuelve al nombre legible de la cuenta.
 * - Gasto sin cuenta → columna cuenta vacía.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {import('../../core/state.js').Cuenta[]} [cuentas=[]]
 * @returns {string} CSV completo, o '' si no hay gastos.
 */
export function gastosACSV(gastos, cuentas = []) {
  if (!Array.isArray(gastos) || gastos.length === 0) return '';

  const cuentasMap = new Map((cuentas ?? []).map(c => [c.id, c.nombre]));

  const ordenados = [...gastos].sort((a, b) =>
    String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')),
  );

  const filas = ordenados.map(g => ({
    fecha:       String(g.fecha ?? ''),
    monto:       String(g.monto ?? 0),
    descripcion: String(g.descripcion ?? ''),
    categoria:   String(g.categoria ?? ''),
    cuenta:      cuentasMap.get(g.cuentaId) ?? '',
    nota:        String(g.nota ?? ''),
  }));

  // ﻿ = BOM UTF-8: Excel en Windows lo necesita para decodificar tildes.
  return '﻿' + serializarCSV(filas, { headers: HEADERS_EXPORT });
}
