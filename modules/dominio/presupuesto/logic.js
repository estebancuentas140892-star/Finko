/**
 * presupuesto/logic.js - funciones puras del dominio de presupuesto por sobre.
 *
 * Modelo "envelope budgeting" simplificado:
 *   - Un envelope por categoría (no por mes).
 *   - Monto mensual recurrente.
 *   - Progreso = gastos del mes en esa categoría / monto asignado.
 *
 * Sin DOM. Sin S directo. Testeable en Node/Vitest.
 */

import { CATEGORIAS_GASTO, GRUPOS_FINANCIEROS } from '../../core/constants.js';
import { gastosMes }        from '../gastos/logic.js';

// ── CONSTANTES ───────────────────────────────────────────────────

/** Umbrales de estado (fracciones del monto asignado). */
export const UMBRAL_ALERTA   = 0.75;
export const UMBRAL_EXCEDIDO = 1.00;

/** Estados posibles del progreso de un envelope. */
export const ESTADOS_PROGRESO = /** @type {const} */ (['ok', 'alerta', 'excedido']);

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra presupuestos con `activo !== false`.
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 */
export function presupuestosActivos(presupuestos) {
  return (presupuestos ?? []).filter(p => p.activo !== false);
}

/**
 * Suma gastos de una categoría específica en el mes dado.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} categoria
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {number} Total en COP.
 */
export function calcularGastadoCategoria(gastos, categoria, anio, mes) {
  return gastosMes(gastos ?? [], anio, mes)
    .filter(g => (g.categoria ?? 'Otros') === categoria)
    .reduce((acc, g) => acc + (g.monto ?? 0), 0);
}

/**
 * Calcula el progreso de un envelope contra los gastos del mes actual.
 *
 * Estados:
 *   - 'ok'        → gastado < 75% del asignado
 *   - 'alerta'    → 75% ≤ gastado ≤ 100%
 *   - 'excedido'  → gastado > 100%
 *
 * @param {import('../../core/state.js').Presupuesto} presupuesto
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {{
 *   gastado: number,
 *   asignado: number,
 *   restante: number,
 *   porcentaje: number,
 *   estado: 'ok' | 'alerta' | 'excedido',
 * }}
 */
export function calcularProgreso(presupuesto, gastos, anio, mes) {
  const asignado = Number(presupuesto?.montoMensual ?? 0);
  const gastado  = calcularGastadoCategoria(gastos, presupuesto?.categoria, anio, mes);
  const restante = asignado - gastado;

  // Porcentaje: si no hay asignado, devolvemos 0 para no dividir por cero.
  const porcentaje = asignado > 0
    ? Math.round((gastado / asignado) * 100)
    : 0;

  let estado;
  if (asignado === 0)                            estado = 'ok';
  else if (gastado > asignado * UMBRAL_EXCEDIDO) estado = 'excedido';
  else if (gastado >= asignado * UMBRAL_ALERTA)  estado = 'alerta';
  else                                           estado = 'ok';

  return { gastado, asignado, restante, porcentaje, estado };
}

// ── RESUMEN POR GRUPO FINANCIERO (MC.5a, ADR 017) ─────────────────

/**
 * Agrega asignado/ejecutado/restante/% por cada uno de los 3 grupos
 * financieros (Necesidades, Estilo de vida, Ahorro), con el mismo criterio
 * de estado que `calcularProgreso` (75% alerta, 100% excedido).
 *
 * Pura: recibe los montos ya sumados por el caller (asignado desde la
 * distribución de ingreso, ejecutado desde los flujos del mes de cada
 * dominio); no lee `S` ni importa otros dominios (regla ADN #10).
 *
 * @param {Partial<Record<'necesidades'|'estilo-de-vida'|'ahorro', number>>} [asignadoPorGrupo]
 * @param {Partial<Record<'necesidades'|'estilo-de-vida'|'ahorro', number>>} [ejecutadoPorGrupo]
 * @returns {Record<string, {
 *   asignado: number,
 *   ejecutado: number,
 *   restante: number,
 *   pct: number,
 *   estado: 'ok' | 'alerta' | 'excedido',
 * }>}
 */
export function resumenGrupos(asignadoPorGrupo = {}, ejecutadoPorGrupo = {}) {
  const resumen = {};

  for (const grupo of GRUPOS_FINANCIEROS) {
    const asignado  = Number(asignadoPorGrupo?.[grupo])  || 0;
    const ejecutado = Number(ejecutadoPorGrupo?.[grupo]) || 0;
    const restante  = asignado - ejecutado;

    const pct = asignado > 0
      ? Math.round((ejecutado / asignado) * 100)
      : 0;

    let estado;
    if (asignado === 0)                             estado = 'ok';
    else if (ejecutado > asignado * UMBRAL_EXCEDIDO) estado = 'excedido';
    else if (ejecutado >= asignado * UMBRAL_ALERTA)  estado = 'alerta';
    else                                              estado = 'ok';

    resumen[grupo] = { asignado, ejecutado, restante, pct, estado };
  }

  return resumen;
}

/**
 * Deriva el ejecutado del mes por grupo financiero desde los flujos ya
 * registrados en Finko (ADR 017, decisión 3). Sin schema nuevo: todo sale de
 * datos que cada dominio ya guarda.
 *
 * Partición de `gastos` (evita doble conteo entre Necesidades y Estilo de vida):
 *   - **Necesidades:** gastos del mes vinculados a un compromiso (`compromisoId`),
 *     es decir pagos de gastos fijos marcados en Calendario y abonos a deudas.
 *   - **Estilo de vida:** gastos variables del mes (sin `compromisoId`).
 *
 * Ahorro se toma de los aportes fechados al fondo de emergencia
 * (`S.ahorro.aportes`). Metas, apartados e inversiones no guardan un historial
 * de aportes con fecha, así que su ejecutado mensual no es derivable hoy; queda
 * fuera del alcance de este slice (el copy es honesto: "según lo que registras").
 *
 * Pura: recibe los arrays ya extraídos de S por el caller; no lee S ni el DOM.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {import('../../core/state.js').Aporte[]} aportesFondo  S.ahorro.aportes
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {Record<'necesidades'|'estilo-de-vida'|'ahorro', number>}
 */
export function ejecutadoPorGrupoDelMes(gastos, aportesFondo, anio, mes) {
  const delMes = gastosMes(gastos ?? [], anio, mes);

  const necesidades = delMes
    .filter(g => !!g.compromisoId)
    .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

  const estiloVida = delMes
    .filter(g => !g.compromisoId)
    .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

  const prefijo = `${anio}-${String(mes).padStart(2, '0')}`;
  const ahorro = (aportesFondo ?? [])
    .filter(a => typeof a?.fecha === 'string' && a.fecha.startsWith(prefijo))
    .reduce((acc, a) => acc + (Number(a.monto) || 0), 0);

  return { necesidades, 'estilo-de-vida': estiloVida, ahorro };
}

// ── DESGLOSE POR ITEM DENTRO DE CADA GRUPO (MC.5c, ADR 017) ───────

/**
 * Desglose de Necesidades por item (gasto fijo o deuda) del mes en curso.
 *
 * ADR 017 decisión 4: en v1 no hay presupuesto por item (el presupuesto es el
 * del grupo); aquí solo se informa el monto de referencia del compromiso
 * (`monto` para fijos, `cuotaMensual` para deudas) y si ya se pagó este mes.
 *
 * Pura: recibe compromisos y gastos ya extraídos de S; no importa
 * `compromisos/logic.js` (regla ADN #10, misma decisión que MC.5a/MC.5b).
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {Array<{
 *   id: string,
 *   descripcion: string,
 *   tipo: 'fijo'|'deuda',
 *   categoria: string|null,
 *   montoReferencia: number,
 *   ejecutado: number,
 *   estadoPago: 'ninguno'|'parcial'|'completo',
 * }>} Ordenado: pendientes primero, luego por monto de referencia descendente.
 */
export function desgloseNecesidadesDelMes(compromisos, gastos, anio, mes) {
  const delMes = gastosMes(gastos ?? [], anio, mes);

  const items = (compromisos ?? [])
    .filter(c => c.activo !== false
      && (c.tipo === 'fijo' || c.tipo === 'deuda-entidad' || c.tipo === 'deuda-personal'))
    .map(c => {
      const esDeudaTipo = c.tipo !== 'fijo';
      const montoReferencia = Number(esDeudaTipo ? c.cuotaMensual : c.monto) || 0;
      const ejecutado = delMes
        .filter(g => g.compromisoId === c.id)
        .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

      let estadoPago;
      if (ejecutado <= 0)                                     estadoPago = 'ninguno';
      else if (!esDeudaTipo)                                  estadoPago = 'completo'; // fijos: un abono cubre el mes
      else if (montoReferencia > 0 && ejecutado < montoReferencia) estadoPago = 'parcial';
      else                                                     estadoPago = 'completo';

      return {
        id:              c.id,
        descripcion:     c.descripcion ?? '',
        tipo:            esDeudaTipo ? 'deuda' : 'fijo',
        categoria:       c.categoria ?? null,
        montoReferencia,
        ejecutado,
        estadoPago,
      };
    });

  const RANGO_ESTADO = { ninguno: 0, parcial: 1, completo: 2 };
  return items.sort((a, b) => {
    if (a.estadoPago !== b.estadoPago) return RANGO_ESTADO[a.estadoPago] - RANGO_ESTADO[b.estadoPago];
    return b.montoReferencia - a.montoReferencia;
  });
}

/**
 * Desglose de Ahorro por destino: fondo de emergencia, metas, apartados e
 * inversiones (ADR 017, decisión 1 y 4).
 *
 * Solo el fondo tiene aportes fechados (`ahorro.aportes`), así que solo él
 * reporta `aportadoEsteMes`; metas, apartados e inversiones no guardan un
 * historial de aportes con fecha (mismo límite que `ejecutadoPorGrupoDelMes`),
 * así que muestran su acumulado a la fecha (`acumulado`/`objetivo`), no un
 * corte mensual. La vista debe ser honesta sobre esta diferencia.
 *
 * Pura: recibe los arrays/objeto ya extraídos de S; no importa otros dominios.
 *
 * @param {import('../../core/state.js').Ahorro|null|undefined} ahorro
 * @param {import('../../core/state.js').Meta[]} metas
 * @param {import('../../core/state.js').Apartado[]} apartados
 * @param {import('../../core/state.js').Inversion[]} inversiones
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {Array<{
 *   id: string,
 *   nombre: string,
 *   tipo: 'fondo'|'meta'|'apartado'|'inversion',
 *   acumulado: number,
 *   objetivo: number|null,
 *   aportadoEsteMes: number|null,
 * }>}
 */
export function desgloseAhorroDelMes(ahorro, metas, apartados, inversiones, anio, mes) {
  const prefijo = `${anio}-${String(mes).padStart(2, '0')}`;
  const items = [];

  const fondo = ahorro?.fondoEmergencia;
  if (fondo?.activo) {
    const aportes       = ahorro?.aportes ?? [];
    const aportesTotal  = aportes.reduce((acc, a) => acc + (Number(a.monto) || 0), 0);
    const aportadoEsteMes = aportes
      .filter(a => typeof a?.fecha === 'string' && a.fecha.startsWith(prefijo))
      .reduce((acc, a) => acc + (Number(a.monto) || 0), 0);

    items.push({
      id:              'fondo',
      nombre:          'Fondo de emergencia',
      tipo:            'fondo',
      acumulado:       (Number(fondo.montoActual) || 0) + aportesTotal,
      objetivo:        null,
      aportadoEsteMes,
    });
  }

  for (const m of (metas ?? [])) {
    if (m.completada === true) continue;
    items.push({
      id: m.id, nombre: m.nombre, tipo: 'meta',
      acumulado:       Number(m.montoActual)   || 0,
      objetivo:        Number(m.montoObjetivo) || 0,
      aportadoEsteMes: null,
    });
  }

  for (const a of (apartados ?? [])) {
    if (a.completado === true) continue;
    items.push({
      id: a.id, nombre: a.nombre, tipo: 'apartado',
      acumulado:       Number(a.montoActual)   || 0,
      objetivo:        Number(a.montoObjetivo) || 0,
      aportadoEsteMes: null,
    });
  }

  for (const inv of (inversiones ?? [])) {
    items.push({
      id: inv.id, nombre: inv.nombre, tipo: 'inversion',
      acumulado:       Number(inv.monto) || 0,
      objetivo:        null,
      aportadoEsteMes: null,
    });
  }

  return items;
}

/**
 * Suma el monto mensual de todos los envelopes activos.
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 */
export function totalAsignadoMensual(presupuestos) {
  return presupuestosActivos(presupuestos)
    .reduce((acc, p) => acc + (p.montoMensual ?? 0), 0);
}

/**
 * Categorías que tienen gastos en el mes actual pero no tienen envelope creado.
 * Útil para mostrar al usuario qué presupuestos le faltan.
 *
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes
 * @returns {Array<{ categoria: string, gastado: number }>}
 */
export function categoriasSinPresupuesto(presupuestos, gastos, anio, mes) {
  const conPresupuesto = new Set(
    presupuestosActivos(presupuestos).map(p => p.categoria),
  );

  const gastosDelMes = gastosMes(gastos ?? [], anio, mes);
  const porCategoria = gastosDelMes.reduce((acc, g) => {
    const cat = g.categoria ?? 'Otros';
    if (!conPresupuesto.has(cat)) {
      acc[cat] = (acc[cat] ?? 0) + (g.monto ?? 0);
    }
    return acc;
  }, {});

  return Object.entries(porCategoria)
    .map(([categoria, gastado]) => ({ categoria, gastado }))
    .sort((a, b) => b.gastado - a.gastado);
}

/**
 * Indica si una categoría ya tiene un envelope activo creado.
 * Útil para evitar duplicados en el formulario de creación.
 *
 * @param {string} categoria
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 * @returns {boolean}
 */
export function tienePresupuesto(categoria, presupuestos) {
  return presupuestosActivos(presupuestos).some(p => p.categoria === categoria);
}

/**
 * Devuelve los envelopes activos que están en estado 'alerta' o 'excedido'
 * en el mes/año dados, ordenados: excedidos primero, luego por porcentaje desc.
 *
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {Array<{categoria:string, estado:string, porcentaje:number, gastado:number, asignado:number}>}
 */
export function alertasLimites(presupuestos, gastos, anio, mes) {
  return presupuestosActivos(presupuestos)
    .map(p => ({ categoria: p.categoria, ...calcularProgreso(p, gastos, anio, mes) }))
    .filter(r => r.estado === 'alerta' || r.estado === 'excedido')
    .sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === 'excedido' ? -1 : 1;
      return b.porcentaje - a.porcentaje;
    });
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida datos crudos de un formulario de presupuesto.
 * Si `presupuestoIdActual` está definido, ignora ese envelope al chequear duplicados
 * (para permitir editar sin que el chequeo falle contra el propio envelope).
 *
 * @param {Record<string,string>} datos
 * @param {import('../../core/state.js').Presupuesto[]} [presupuestosExistentes=[]]
 * @param {string|null} [presupuestoIdActual=null]
 * @returns {string[]} mensajes de error; vacío = válido.
 */
export function validarPresupuesto(datos, presupuestosExistentes = [], presupuestoIdActual = null) {
  const errores = [];

  if (!datos.categoria?.trim()) {
    errores.push('Debes elegir una categoría.');
  } else if (!CATEGORIAS_GASTO.includes(datos.categoria)) {
    errores.push(`Categoría inválida. Usa una de: ${CATEGORIAS_GASTO.join(', ')}.`);
  }

  const monto = Number(datos.montoMensual);
  if (isNaN(monto) || monto <= 0) {
    errores.push('El monto mensual debe ser un número mayor a 0.');
  }

  // Duplicado: solo si NO estamos editando el mismo envelope.
  if (errores.length === 0) {
    const duplicado = presupuestosActivos(presupuestosExistentes)
      .some(p => p.categoria === datos.categoria && p.id !== presupuestoIdActual);
    if (duplicado) {
      errores.push(`Ya existe un límite para "${datos.categoria}". Edita el existente.`);
    }
  }

  return errores;
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte datos crudos del formulario al shape de S.presupuestos.
 * Asume que los datos ya pasaron `validarPresupuesto()`.
 *
 * @param {Record<string,string>} datos
 * @returns {Omit<import('../../core/state.js').Presupuesto, 'id'>}
 */
export function normalizarPresupuesto(datos) {
  return {
    categoria:    datos.categoria,
    montoMensual: Number(datos.montoMensual),
    activo:       true,
  };
}
