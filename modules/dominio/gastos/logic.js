/**
 * gastos/logic.js - funciones puras del dominio de gastos.
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 */

import { CATEGORIA_AGENDA_ICONO, CATEGORIAS_GASTO, ICONOS_CATEGORIA_PERSONALIZADA } from '../../core/constants.js';

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

/**
 * Variación del gasto de un mes contra el anterior, para el chip del hero
 * (GAS.1a, ADR 039 D2). Aquí solo se calculan dirección y magnitud; el
 * criterio de color es del caller (IV.3/ADR 038 D4: verde solo al bajar,
 * neutro al subir, nunca alarmante).
 *
 * Devuelve null cuando no hay base de comparación (mes anterior sin gasto):
 * un porcentaje contra cero no significa nada (mismo criterio que la
 * tendencia de Análisis). Una diferencia que redondea a 0% se reporta como
 * 'igual' (decir "0% menos" confunde).
 *
 * @param {number} totalActual   total del mes visible.
 * @param {number} totalAnterior total del mes anterior.
 * @returns {{ direccion: 'menos'|'mas'|'igual', pct: number }|null}
 */
export function variacionMensualGasto(totalActual, totalAnterior) {
  const actual   = Number(totalActual)   || 0;
  const anterior = Number(totalAnterior) || 0;
  if (anterior <= 0) return null;

  const pct = Math.round((Math.abs(actual - anterior) / anterior) * 100);
  if (pct === 0) return { direccion: 'igual', pct: 0 };
  return { direccion: actual < anterior ? 'menos' : 'mas', pct };
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

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida los datos del formulario de gasto. La descripción ya no es
 * obligatoria (TX.9a): la categoría es el concepto principal del gasto;
 * quien quiera detalle adicional usa el campo Nota, opcional.
 * @param {Record<string, string>} datos
 * @returns {string[]}
 */
export function validarGasto(datos) {
  const errores = [];

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

/**
 * Valida una categoría de gasto personalizada nueva (TX.9b): nombre no
 * vacío, sin duplicar (sin distinguir mayúsculas/tildes de más o de menos)
 * ninguna categoría nativa ni una ya creada por el usuario, e ícono elegido
 * del catálogo curado.
 *
 * @param {{ nombre: string, icono: string }} datos
 * @param {{ nombre: string, icono: string }[]} existentes personalizadas ya guardadas
 * @returns {string[]}
 */
export function validarCategoriaPersonalizada(datos, existentes = []) {
  const errores = [];
  const nombre = datos.nombre?.trim() ?? '';

  if (!nombre) {
    errores.push('Escribe un nombre para tu categoría.');
  } else {
    const normalizar = (s) => s.toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const normalizado = normalizar(nombre);
    const nativas = CATEGORIAS_GASTO.map(normalizar);
    const propias = existentes.map(c => normalizar(c.nombre));
    if (nativas.includes(normalizado) || propias.includes(normalizado)) {
      errores.push('Ya existe una categoría con ese nombre.');
    }
  }

  const iconosValidos = new Set(ICONOS_CATEGORIA_PERSONALIZADA.map(i => i.icono));
  if (!datos.icono || !iconosValidos.has(datos.icono)) {
    errores.push('Elige un ícono para tu categoría.');
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
 * Convierte datos crudos del formulario al shape de S.gastos. El formulario
 * ya no pide descripción (TX.9a): la clave `descripcion` solo se incluye si
 * `datos` la trae (compatibilidad hacia atrás con algún caller externo). Al
 * omitirla, `editar()` (merge superficial vía `Object.assign`) no borra la
 * descripción de gastos existentes que ya la tenían.
 * @param {Record<string, string>} datos
 */
export function normalizarGasto(datos) {
  const base = {
    monto: Number(datos.monto),
    categoria: datos.categoria,
    fecha: datos.fecha,
    cuentaId: datos.cuentaId || null,
    nota: datos.nota?.trim() || '',
    compromisoId: datos.compromisoId || null,
  };
  if (datos.descripcion?.trim()) base.descripcion = datos.descripcion.trim();
  return base;
}

// ── ÍCONO POR ORIGEN (TX.6 / TX.7, sprite desde ID.3) ────────────

/**
 * Ícono del gasto según su origen, como id completo del sprite. Un gasto
 * con `compromisoId` nació de un fijo de Calendario (pago del checklist o
 * "marcar pagado") o de un abono a deuda; su ícono debe salir del
 * compromiso de origen, no de la categoría genérica del gasto:
 *
 * - Fijo → `comp.icono` si el usuario eligió uno para la categoría "Otro"
 *   (CAT.2f), si no el ícono de su categoría de Agenda (CATEGORIA_AGENDA_ICONO).
 * - Deuda con entidad → i-cuentas (institución financiera).
 *   Deuda personal → i-personales (persona), como en la lista de Deudas.
 *
 * Devuelve null si el gasto no tiene origen resoluble (sin `compromisoId`,
 * compromiso eliminado, o fijo sin categoría): el caller decide el fallback.
 *
 * @param {import('../../core/state.js').Gasto} gasto
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @returns {string|null}
 */
export function iconoPorOrigen(gasto, compromisos) {
  if (!gasto?.compromisoId) return null;
  const comp = (compromisos ?? []).find(c => c.id === gasto.compromisoId);
  if (!comp) return null;
  if (comp.tipo === 'deuda-entidad')  return 'i-cuentas';
  if (comp.tipo === 'deuda-personal') return 'i-personales';
  if (comp.tipo === 'fijo')           return comp.icono || CATEGORIA_AGENDA_ICONO[comp.categoria] || null;
  return null;
}
