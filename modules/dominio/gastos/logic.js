/**
 * gastos/logic.js - funciones puras del dominio de gastos.
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 */

// ── FILTROS Y AGRUPACIÓN ─────────────────────────────────────────

/**
 * Filtra un array de gastos por categoría exacta.
 * Si `categoria` es null, vacío o indefinido devuelve todos (sin filtrar).
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string|null|undefined} categoria
 * @returns {import('../../core/state.js').Gasto[]}
 */
export function filtrarGastos(gastos, categoria) {
  if (!categoria) return gastos;
  return gastos.filter(g => (g.categoria ?? 'Otros') === categoria);
}

/**
 * Filtra gastos que pertenecen al año y mes indicados.
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio - ej. 2026
 * @param {number} mes  - 1-12
 */
export function gastosMes(gastos, anio, mes) {
  const prefijo = `${anio}-${String(mes).padStart(2, '0')}`;
  return gastos.filter(g => g.fecha?.startsWith(prefijo));
}

/**
 * Ordena gastos para mostrar primero los más recientes: por fecha descendente
 * y, a igualdad de fecha, el último registrado primero. El desempate sale del
 * orden de inserción inverso: `guardar` hace `push` (último al final) y `genId`
 * es aleatorio (no ordenable por tiempo), así que la posición en el array es la
 * única señal de "cuál se registró después". No muta el array recibido.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @returns {import('../../core/state.js').Gasto[]}
 */
export function ordenarRecientesPrimero(gastos) {
  // reverse() deja el último registrado primero; el sort estable (ES2019)
  // conserva ese orden dentro de los gastos con la misma fecha.
  return [...gastos]
    .reverse()
    .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''));
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
 * @param {import('../../core/state.js').Gasto[]} gastos - ya filtrados por período.
 * @param {number} [umbralMonto=20_000]  - monto máximo por transacción para ser "hormiga".
 * @param {number} [umbralTotal=100_000] - suma mínima para que la categoría sea alerta.
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

// ── PENDIENTES POR ORGANIZAR ─────────────────────────────────────

/**
 * Indica si un gasto quedó sin organizar: se registró con "Gasto rápido"
 * (flag `pendienteCompletar`) o no tiene descripción. Misma regla que el
 * badge "📝 Pendiente" de la lista, para que el conteo del dashboard y la
 * marca por ítem siempre coincidan.
 *
 * @param {import('../../core/state.js').Gasto} gasto
 * @returns {boolean}
 */
export function esGastoPendiente(gasto) {
  return gasto?.pendienteCompletar === true || !gasto?.descripcion?.trim();
}

/**
 * Filtra los gastos que aún están sin organizar (de cualquier mes).
 * El dashboard usa la cantidad para mostrar un recordatorio agregado.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @returns {import('../../core/state.js').Gasto[]}
 */
export function gastosPendientes(gastos) {
  return (gastos ?? []).filter(esGastoPendiente);
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
    errores.push('Debes elegir una categoría.');
  }
  if (!datos.fecha?.trim()) {
    errores.push('La fecha es obligatoria.');
  }
  if (!datos.cuentaId?.trim()) {
    errores.push('Debes elegir de qué cuenta sale el dinero.');
  }

  return errores;
}

// ── EFECTO SOBRE CUENTAS ─────────────────────────────────────────

/**
 * Calcula el nuevo saldo de una cuenta tras aplicarle un gasto.
 * El saldo puede quedar negativo: la app no impide sobregirar (es
 * decisión del usuario y permite registrar movimientos sin importar
 * el orden de carga).
 *
 * @param {number} saldoActual
 * @param {number} monto
 * @returns {number} nuevo saldo
 */
export function aplicarGastoASaldo(saldoActual, monto) {
  return (saldoActual ?? 0) - (monto ?? 0);
}

/**
 * Calcula el nuevo saldo de una cuenta tras revertir un gasto previamente
 * descontado (al editar o eliminar).
 *
 * @param {number} saldoActual
 * @param {number} monto
 * @returns {number} nuevo saldo
 */
export function revertirGastoDeSaldo(saldoActual, monto) {
  return (saldoActual ?? 0) + (monto ?? 0);
}

/**
 * Calcula el delta que hay que aplicar al saldo de una cuenta cuando un
 * gasto se edita. Maneja tres casos:
 *   1. Cambia solo el monto: delta sobre la misma cuenta.
 *   2. Cambia solo la cuenta: revierte en la vieja, descuenta en la nueva.
 *   3. Cambian ambos.
 *
 * Devuelve un mapa { cuentaId → deltaASumar }.
 * Un delta positivo significa "el saldo debe subir" (revertir un descuento);
 * un delta negativo significa "el saldo debe bajar" (aplicar un descuento).
 *
 * @param {{ cuentaId: string|null, monto: number }} antes
 * @param {{ cuentaId: string|null, monto: number }} despues
 * @returns {Record<string, number>}
 */
export function deltasPorEdicionDeGasto(antes, despues) {
  const deltas = {};
  const cuentaAntes  = antes?.cuentaId  ?? null;
  const cuentaDesp   = despues?.cuentaId ?? null;
  const montoAntes   = Number(antes?.monto  ?? 0);
  const montoDespues = Number(despues?.monto ?? 0);

  if (cuentaAntes === cuentaDesp) {
    if (cuentaAntes !== null) {
      // Misma cuenta: solo aplico la diferencia de monto.
      // Si el nuevo monto es mayor, el saldo baja más → delta negativo.
      const delta = montoAntes - montoDespues;
      if (delta !== 0) deltas[cuentaAntes] = delta;
    }
    return deltas;
  }

  // Cuentas distintas: revierto en la vieja, descuento en la nueva.
  if (cuentaAntes !== null)   deltas[cuentaAntes] = (deltas[cuentaAntes]  ?? 0) + montoAntes;
  if (cuentaDesp  !== null)   deltas[cuentaDesp]  = (deltas[cuentaDesp]   ?? 0) - montoDespues;

  return deltas;
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
    compromisoId: datos.compromisoId || null,
    pendienteCompletar: false,
  };
}

/**
 * Normaliza un gasto rapido: solo el monto + cuenta de origen, defaults para lo demas.
 * - descripcion: '' (vacia, se completa despues)
 * - categoria: 'Otros'
 * - fecha: hoy
 * - pendienteCompletar: true (marca para completar descripcion/categoria despues)
 * - cuentaId: el id de la cuenta de origen (o null si no se proporcionó).
 *
 * @param {string|number} monto
 * @param {string} fechaHoy - YYYY-MM-DD (inyectada para testeabilidad).
 * @param {string|null} [cuentaId] - cuenta desde la que sale el dinero.
 */
export function normalizarGastoRapido(monto, fechaHoy, cuentaId = null) {
  return {
    descripcion: '',
    monto: Number(monto),
    categoria: 'Otros',
    fecha: fechaHoy,
    cuentaId: cuentaId || null,
    nota: '',
    pendienteCompletar: true,
  };
}

/**
 * Valida un gasto rapido.
 *
 * @param {string|number} monto
 * @param {string|null}   [cuentaId]       - cuenta elegida (null si no hay o no se seleccionó).
 * @param {boolean}       [requiereCuenta] - true cuando hay varias cuentas y el usuario debe elegir.
 * @returns {string[]}
 */
export function validarGastoRapido(monto, cuentaId = null, requiereCuenta = false) {
  const errores = [];
  const m = Number(monto);
  if (isNaN(m) || m <= 0) {
    errores.push('El monto debe ser un número mayor a 0.');
  }
  if (requiereCuenta && !cuentaId?.trim?.()) {
    errores.push('Elige desde qué cuenta sale el dinero.');
  }
  return errores;
}
