/**
 * gastos/logic.js — funciones puras del dominio de gastos.
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 */

// ── FILTROS Y AGRUPACIÓN ─────────────────────────────────────────

/**
 * Filtra gastos que pertenecen al año y mes indicados.
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio — ej. 2026
 * @param {number} mes  — 1–12
 */
export function gastosMes(gastos, anio, mes) {
  const prefijo = `${anio}-${String(mes).padStart(2, '0')}`;
  return gastos.filter(g => g.fecha?.startsWith(prefijo));
}

/**
 * Suma los montos de un array de gastos.
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @returns {number} Total en COP.
 */
export function totalGastos(gastos) {
  return gastos.reduce((acc, g) => acc + (g.monto ?? 0), 0);
}

/**
 * Total de gastos del mes/año indicados.
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes
 */
export function totalGastosMes(gastos, anio, mes) {
  return totalGastos(gastosMes(gastos, anio, mes));
}

/**
 * Agrupa gastos por categoría y devuelve un mapa { categoria → totalCOP }.
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @returns {Record<string, number>}
 */
export function gastosPorCategoria(gastos) {
  return gastos.reduce((acc, g) => {
    const cat = g.categoria ?? 'Otros';
    acc[cat] = (acc[cat] ?? 0) + (g.monto ?? 0);
    return acc;
  }, {});
}

// ── DETECTOR DE HORMIGAS ─────────────────────────────────────────

/**
 * Identifica categorías con muchos gastos pequeños que suman un monto significativo.
 * "Gasto hormiga": transacciones individuales ≤ umbralMonto que en conjunto
 * superan umbralTotal en el período dado.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos — ya filtrados por período.
 * @param {number} [umbralMonto=20_000]  — monto máximo por transacción para ser "hormiga".
 * @param {number} [umbralTotal=100_000] — suma mínima para que la categoría sea alerta.
 * @returns {Array<{categoria:string, total:number, cantidad:number, promedio:number}>}
 */
export function detectarHormigas(gastos, umbralMonto = 20_000, umbralTotal = 100_000) {
  const hormiguitas = gastos.filter(g => (g.monto ?? 0) <= umbralMonto);

  const porCategoria = gastosPorCategoria(hormiguitas);

  return Object.entries(porCategoria)
    .filter(([, total]) => total >= umbralTotal)
    .map(([categoria, total]) => {
      const transacciones = hormiguitas.filter(g => (g.categoria ?? 'Otros') === categoria);
      return {
        categoria,
        total,
        cantidad: transacciones.length,
        promedio: Math.round(total / transacciones.length),
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida los datos del formulario de gasto.
 * @param {Record<string, string>} datos
 * @returns {string[]}
 */
export function validarGasto(datos) {
  const errores = [];

  if (!datos.descripcion?.trim()) {
    errores.push('La descripción del gasto es obligatoria.');
  }
  const monto = Number(datos.monto);
  if (isNaN(monto) || monto <= 0) {
    errores.push('El monto debe ser un número mayor a 0.');
  }
  if (!datos.categoria?.trim()) {
    errores.push('Debés elegir una categoría.');
  }
  if (!datos.fecha?.trim()) {
    errores.push('La fecha es obligatoria.');
  }

  return errores;
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte datos crudos del formulario al shape de S.gastos.
 * @param {Record<string, string>} datos
 */
export function normalizarGasto(datos) {
  return {
    descripcion: datos.descripcion.trim(),
    monto: Number(datos.monto),
    categoria: datos.categoria,
    fecha: datos.fecha,
    cuentaId: datos.cuentaId || null,
    nota: datos.nota?.trim() || '',
  };
}
