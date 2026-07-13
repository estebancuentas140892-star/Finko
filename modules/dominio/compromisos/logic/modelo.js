/**
 * compromisos/logic/modelo.js - el compromiso como modelo: catalogos de tipos, tasas
 * (EA/mensual), consultas, validacion y normalizacion del formulario.
 *
 * Sub-modulo de compromisos/logic.js (barrel). Reglas de la capa:
 * - Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 */

import { FRECUENCIAS, CATEGORIAS_AGENDA, CATEGORIAS_DEUDA, CATEGORIAS_DEUDA_PERSONAL, ICONOS_CATEGORIA_PERSONALIZADA } from '../../../core/constants.js';

// ── CATÁLOGOS LOCALES ────────────────────────────────────────────

/**
 * Tipos vigentes (v6).
 * - 'fijo'           → gasto recurrente con cuota fija (arriendo, servicios, suscripciones).
 *                      Se crea desde la sección Agenda; la sección Compromisos no lo expone.
 * - 'deuda-entidad'  → deuda con banco/fintech/tarjeta (tasa EA por ley).
 * - 'deuda-personal' → préstamo de un particular o gota a gota (tasa mensual usual).
 *
 * Los tipos antiguos 'deuda' y 'agenda' se migran automáticamente en storage.js
 * (v5 → v6) y nunca aparecen en datos vigentes.
 */
export const TIPOS_COMPROMISO = ['fijo', 'deuda-entidad', 'deuda-personal'];

/** Tipos que la sección Compromisos crea/lista (solo deudas a partir de v6). */
export const TIPOS_DEUDA = ['deuda-entidad', 'deuda-personal'];

/** Etiqueta legible por tipo. */
export const LABEL_TIPO = {
  'fijo':           'Gasto fijo',
  'deuda-entidad':  'Deuda con entidad',
  'deuda-personal': 'Deuda personal',
};

/** Id de icono SVG por tipo de compromiso (referencia al sprite #i-*). */
export const ICONO_TIPO = {
  'fijo':           'recurring',
  'deuda-entidad':  'cuentas',
  'deuda-personal': 'personales',
};

/** Devuelve true si el tipo corresponde a una deuda (entidad o personal). */
export function esDeuda(tipo) {
  return tipo === 'deuda-entidad' || tipo === 'deuda-personal';
}

/**
 * AG.4: con una categoría predefinida de Agenda (cualquiera salvo 'Otro'),
 * el nombre del gasto fijo es la propia categoría: pedir un nombre aparte
 * sería redundante ("Mercado" ya lo dice todo). Solo con 'Otro' (o sin
 * categoría) el usuario escribe su propio nombre.
 * @param {{ tipo?: string, categoria?: string }} datos
 * @returns {boolean}
 */
function _categoriaFijoConNombreAuto(datos) {
  return datos.tipo === 'fijo'
    && !!datos.categoria
    && CATEGORIAS_AGENDA.includes(datos.categoria)
    && datos.categoria !== 'Otro';
}

/**
 * Convierte una tasa mensual a su equivalente efectivo anual exacto.
 * tasaEA = (1 + tasaMensual)^12 - 1
 * @param {number} tasaMensual decimal (0.10 = 10% mensual)
 */
export function tasaMensualToEA(tasaMensual) {
  return Math.pow(1 + tasaMensual, 12) - 1;
}

/**
 * Devuelve la tasa EA (decimal) de un compromiso de deuda según su `tasaUnidad`.
 * Para fijos o sin `tasa` devuelve 0.
 * @param {{ tasa?: number, tasaUnidad?: string }} c
 */
export function tasaEADe(c) {
  const t = Number(c?.tasa);
  if (!Number.isFinite(t) || t < 0) return 0;
  return c.tasaUnidad === 'mensual' ? tasaMensualToEA(t) : t;
}

/**
 * Cuántas veces ocurre cada frecuencia en un mes calendario promedio.
 * Definido localmente para no crear dependencia cruzada con ingresos/logic.js.
 */
const FACTOR_MENSUAL = {
  'Diario':     30,
  'Semanal':    4.33,
  'Quincenal':  2,
  'Mensual':    1,
  'Bimestral':  0.5,
  'Trimestral': 1 / 3,
  'Semestral':  1 / 6,
  'Anual':      1 / 12,
  'Única vez':  0,
};

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra compromisos con `activo !== false`.
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 */
export function compromisosActivos(compromisos) {
  return compromisos.filter(c => c.activo !== false);
}

/**
 * Proyecta el monto mensual equivalente de un compromiso.
 * - Para fijo: aplica el factor de frecuencia sobre `monto` (cuota recurrente).
 * - Para deudas (entidad/personal): `cuotaMensual` ya es lo que se paga al mes.
 *
 * @param {import('../../../core/state.js').Compromiso} compromiso
 * @returns {number} COP / mes equivalente.
 */
export function calcularCompromisoMensual(compromiso) {
  if (esDeuda(compromiso.tipo)) {
    return Number(compromiso.cuotaMensual) || 0;
  }
  const factor = FACTOR_MENSUAL[compromiso.frecuencia] ?? 0;
  return (compromiso.monto ?? 0) * factor;
}

/**
 * Suma la proyección mensual de todos los compromisos activos.
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @returns {number} Total mensual en COP.
 */
export function calcularTotalCompromisos(compromisos) {
  return compromisosActivos(compromisos)
    .reduce((acc, c) => acc + calcularCompromisoMensual(c), 0);
}

/**
 * Suma la proyección mensual de los compromisos tipo 'fijo' activos (arriendo,
 * servicios, suscripciones): los gastos recurrentes que NO son deuda. Es el
 * `fijosMensuales` que consume el motor de palanca (D.15d): la capacidad de
 * pago resta estos fijos aparte de las cuotas de deuda, para no doble-contar
 * (las cuotas de deuda las resta `recomendarPalanca` desde el array de deudas).
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @returns {number} Total mensual en COP de los compromisos fijos.
 */
export function calcularFijosMensuales(compromisos) {
  return compromisosActivos(compromisos)
    .filter(c => !esDeuda(c.tipo))
    .reduce((acc, c) => acc + calcularCompromisoMensual(c), 0);
}

/**
 * Resumen agregado de las deudas activas para el hero de la sección
 * (D.16a, ADR 036 D1). Solo deudas (entidad + personal): los gastos fijos
 * del mismo dominio (tipo 'fijo', viven en Calendario) no entran, porque
 * el hero habla de "lo que debes", no de pagos recurrentes.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @returns {{ saldoTotal: number, cuotaMensual: number, cantidad: number }}
 */
export function resumenDeudas(compromisos) {
  const deudas = compromisosActivos(compromisos).filter(c => esDeuda(c.tipo));
  return {
    saldoTotal:   deudas.reduce((acc, c) => acc + (Number(c.saldoTotal) || 0), 0),
    cuotaMensual: deudas.reduce((acc, c) => acc + calcularCompromisoMensual(c), 0),
    cantidad:     deudas.length,
  };
}

/**
 * Cuántos días faltan para el próximo vencimiento de un compromiso.
 * Si `diaPago` es hoy o en el futuro dentro del mes → días restantes en el mes actual.
 * Si ya pasó → días hasta el mismo día del mes siguiente.
 *
 * @param {import('../../../core/state.js').Compromiso} compromiso
 * @returns {number} Días hasta el próximo vencimiento (0 = hoy).
 */
export function proximoVencimiento(compromiso) {
  const hoy      = new Date();
  const diaHoy   = hoy.getDate();
  const diaPago  = compromiso.diaPago ?? 1;

  if (diaPago >= diaHoy) {
    return diaPago - diaHoy;
  }
  // Ya pasó en este mes → contar hasta el mismo día del mes siguiente.
  const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  return (ultimoDiaMes - diaHoy) + diaPago;
}

/**
 * Nivel de urgencia según días al próximo vencimiento.
 * @param {import('../../../core/state.js').Compromiso} compromiso
 * @returns {'urgente' | 'proximo' | 'normal'}
 */
export function urgencia(compromiso) {
  const dias = proximoVencimiento(compromiso);
  if (dias <= 3) return 'urgente';
  if (dias <= 7) return 'proximo';
  return 'normal';
}

/**
 * Filtra los compromisos activos cuyo próximo vencimiento es en ≤ `diasLimite` días.
 * Pensado para alimentar el sistema de notificaciones push.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @param {number} [diasLimite=3]
 * @returns {Array<import('../../../core/state.js').Compromiso & { diasRestantes: number }>}
 */
export function compromisosProximos(compromisos, diasLimite = 3) {
  return compromisosActivos(compromisos)
    .map(c => ({ ...c, diasRestantes: proximoVencimiento(c) }))
    .filter(c => c.diasRestantes <= diasLimite)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

/**
 * Nivel de urgencia para el nudge de mora inminente (G.3.F5).
 * Recibe la lista ya filtrada de `compromisosProximos()`.
 *
 * - `'high'`   → al menos un compromiso vence en ≤ 3 días.
 * - `'medium'` → todos vencen entre 4 y 5 días.
 * - `null`     → no hay compromisos proximos (no mostrar nudge).
 *
 * @param {Array<{ diasRestantes: number }>} proximos
 * @returns {'high' | 'medium' | null}
 */
export function nivelAlertaMora(proximos) {
  if (proximos.length === 0) return null;
  return proximos.some(c => c.diasRestantes <= 3) ? 'high' : 'medium';
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida los datos del formulario de compromiso.
 *
 * Reglas v6:
 * - tipo='fijo'           → requiere monto y frecuencia (Cuotas recurrentes).
 * - tipo='deuda-entidad'  → requiere saldoTotal, cuotaMensual; tasa opcional (% EA).
 * - tipo='deuda-personal' → requiere saldoTotal, cuotaMensual; tasa opcional (% mensual).
 *
 * @param {Record<string, string>} datos
 * @returns {string[]} Mensajes de error (vacío = válido).
 */
export function validarCompromiso(datos) {
  const errores = [];

  // AG.4: con categoría predefinida (no 'Otro'), el nombre lo da la propia
  // categoría; el campo de texto queda libre para una nota opcional.
  if (!_categoriaFijoConNombreAuto(datos) && !datos.descripcion?.trim()) {
    errores.push('La descripción del compromiso es obligatoria.');
  }
  if (!datos.frecuencia || !FRECUENCIAS.includes(datos.frecuencia)) {
    errores.push('Debes elegir la frecuencia.');
  }
  const diaPago = Number(datos.diaPago);
  if (!Number.isInteger(diaPago) || diaPago < 1 || diaPago > 31) {
    errores.push('El día de pago debe ser un número entero entre 1 y 31.');
  }
  if (!datos.tipo || !TIPOS_COMPROMISO.includes(datos.tipo)) {
    errores.push('Debes elegir el tipo de compromiso.');
  }

  if (datos.tipo === 'fijo') {
    const monto = Number(datos.monto);
    if (isNaN(monto) || monto <= 0) {
      errores.push('El monto debe ser un número mayor a 0.');
    }
    if (datos.categoria && !CATEGORIAS_AGENDA.includes(datos.categoria)) {
      errores.push('La categoría seleccionada no es válida.');
    }
  } else if (esDeuda(datos.tipo)) {
    const saldo = Number(datos.saldoTotal);
    if (isNaN(saldo) || saldo <= 0) {
      errores.push('El saldo total que aún debes debe ser mayor a 0.');
    }
    // D.13: en deuda personal la cuota es opcional (fiado, préstamos sin
    // cuota fija se abonan libre). Si viene, debe ser > 0. En entidad sigue
    // siendo obligatoria: sin cuota no hay plan de pago que simular.
    const esPersonal = datos.tipo === 'deuda-personal';
    const cuotaVacia = datos.cuotaMensual === '' || datos.cuotaMensual === undefined || datos.cuotaMensual === null;
    if (!(esPersonal && cuotaVacia)) {
      const cuota = Number(datos.cuotaMensual);
      if (isNaN(cuota) || cuota <= 0) {
        errores.push('La cuota mensual debe ser un número mayor a 0.');
      }
    }
    // D.10: el catálogo del eje "qué/con quién" depende del eje Entidad/Personal.
    const catalogoCat = esPersonal ? CATEGORIAS_DEUDA_PERSONAL : CATEGORIAS_DEUDA;
    if (datos.categoria && !catalogoCat.includes(datos.categoria)) {
      errores.push('La categoría seleccionada no es válida.');
    }
    const tasa = Number(datos.tasa);
    const tieneTasa = datos.tasa !== '' && datos.tasa !== undefined && datos.tasa !== null;
    if (datos.tipo === 'deuda-entidad') {
      // Opcional: muchas personas no conocen su tasa EA. Si la dan, validar rango.
      if (tieneTasa) {
        if (isNaN(tasa) || tasa < 0) {
          errores.push('La tasa EA debe ser un número mayor o igual a 0.');
        } else if (tasa > 200) {
          errores.push('La tasa EA parece demasiado alta (más de 200%). Verifica el valor.');
        }
      }
    } else if (tieneTasa) {
      // Personal: opcional pero si la ponen, validar rango razonable (mensual).
      if (isNaN(tasa) || tasa < 0) {
        errores.push('La tasa mensual debe ser un número mayor o igual a 0.');
      } else if (tasa > 100) {
        errores.push('La tasa mensual parece demasiado alta (más de 100% mensual). Verifica el valor.');
      }
    }
    if (tieneTasa) {
      const unidad = datos.tasaUnidad;
      if (unidad !== 'EA' && unidad !== 'mensual') {
        errores.push('La unidad de tasa debe ser EA o mensual.');
      }
    }
  }

  return errores;
}

/**
 * Detecta si la cuota declarada no cubre el interés mensual del crédito.
 * Si cuotaMensual <= interés mensual, la deuda crece (nunca baja) o se mantiene.
 *
 * Solo aplica a deudas con tasa > 0. Para deudas personales sin tasa la función
 * devuelve null (no hay intereses que comparar).
 *
 * @param {Record<string, string>} datos - datos crudos del formulario de compromiso.
 *   Espera: saldoTotal, cuotaMensual, tasa (en %), tasaUnidad ('EA' | 'mensual'), tipo.
 * @returns {{ interesMensual: number, cuotaMensual: number, deficit: number } | null}
 *   null si no hay alerta. Objeto con los montos si la cuota no cubre el interés mensual.
 */
export function detectarDeudaCreciente(datos) {
  if (datos.tipo !== 'deuda-entidad' && datos.tipo !== 'deuda-personal') return null;

  const cuota   = Number(datos.cuotaMensual);
  const saldo   = Number(datos.saldoTotal);
  const tasaPct = Number(datos.tasa);

  if (!(cuota > 0) || !(saldo > 0) || !(tasaPct > 0)) return null;

  const tasaDecimal  = tasaPct / 100;
  const tasaMensual  = datos.tasaUnidad === 'mensual'
    ? tasaDecimal
    : Math.pow(1 + tasaDecimal, 1 / 12) - 1;

  const interesMensual = saldo * tasaMensual;
  if (cuota <= interesMensual) {
    return {
      interesMensual,
      cuotaMensual: cuota,
      deficit:      interesMensual - cuota,
    };
  }
  return null;
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte datos crudos del formulario al shape de S.compromisos.
 * Asume que los datos ya pasaron `validarCompromiso()`.
 *
 * v6:
 * - 'fijo'           → { monto, frecuencia, diaPago, categoria|null, nota } (categoria desde v17,
 *                       CATEGORIAS_AGENDA; nota desde AG.4). Con categoría predefinida (no 'Otro'),
 *                       descripcion es la propia categoría y lo que llega en el campo de texto se
 *                       guarda como nota opcional; sin categoría (o con 'Otro'), descripcion es el
 *                       nombre que escribió el usuario y nota queda ''.
 * - 'deuda-entidad'  → { saldoTotal, cuotaMensual, categoria|null, tasa|null, tasaUnidad='EA', icono|null }
 *                       (tasa null = desconocida; 0 significaría "sin interés",
 *                       que en una entidad casi nunca es cierto; categoria desde v18, CATEGORIAS_DEUDA)
 * - 'deuda-personal' → { saldoTotal, cuotaMensual, categoria|null, tasa?, tasaUnidad?, icono|null }
 *                       (sin tasa = 0: el form dice "si no cobra interés, deja en blanco")
 *                       `icono` (CAT.2d): solo con categoría 'Otra'/'Otro' y un ícono elegido del
 *                       picker compartido (`ICONOS_CATEGORIA_PERSONALIZADA`); siempre explícito
 *                       (null si no aplica) para que `editar()` (Object.assign shallow) lo limpie
 *                       si el usuario cambia de categoría al editar, en vez de dejarlo huérfano.
 *
 * @param {Record<string, string>} datos
 */
export function normalizarCompromiso(datos) {
  const base = {
    descripcion: datos.descripcion.trim(),
    frecuencia:  datos.frecuencia,
    diaPago:     Number(datos.diaPago),
    tipo:        datos.tipo,
    activo:      true,
  };

  if (datos.tipo === 'fijo') {
    const categoria = datos.categoria && CATEGORIAS_AGENDA.includes(datos.categoria)
      ? datos.categoria
      : null;
    const nombreAuto = _categoriaFijoConNombreAuto(datos);

    base.monto = Number(datos.monto);
    base.categoria = categoria;
    base.descripcion = nombreAuto ? categoria : datos.descripcion.trim();
    base.nota = nombreAuto ? datos.descripcion.trim() : '';
    return base;
  }

  if (esDeuda(datos.tipo)) {
    base.saldoTotal   = Number(datos.saldoTotal);
    // D.13: sin cuota fija (deuda personal) se guarda 0: el simulador de
    // estrategia la excluye y la lista muestra la frecuencia en su lugar.
    base.cuotaMensual = Number(datos.cuotaMensual) || 0;
    const catalogoCat = datos.tipo === 'deuda-personal' ? CATEGORIAS_DEUDA_PERSONAL : CATEGORIAS_DEUDA;
    base.categoria    = datos.categoria && catalogoCat.includes(datos.categoria)
      ? datos.categoria
      : null;
    // CAT.2d: 'Otra' (entidad) / 'Otro' (personal) admite elegir un ícono del
    // picker compartido en vez del fijo c-otros. Siempre explícito (null si no
    // aplica), nunca ausente: ver nota de icono en el docstring de la función.
    const categoriaOtra = datos.tipo === 'deuda-personal' ? 'Otro' : 'Otra';
    const iconoValido = ICONOS_CATEGORIA_PERSONALIZADA.some(i => i.icono === datos.icono);
    base.icono = (base.categoria === categoriaOtra && iconoValido) ? datos.icono : null;
    const tasaPct = Number(datos.tasa);
    const tieneTasa = datos.tasa !== '' && datos.tasa !== undefined && datos.tasa !== null
      && !isNaN(tasaPct) && tasaPct >= 0;
    if (datos.tipo === 'deuda-entidad') {
      base.tasa       = tieneTasa ? tasaPct / 100 : null;
      base.tasaUnidad = 'EA';
    } else {
      base.tasa       = tieneTasa ? tasaPct / 100 : 0;
      base.tasaUnidad = tieneTasa ? (datos.tasaUnidad || 'mensual') : 'mensual';
    }
  }

  return base;
}
