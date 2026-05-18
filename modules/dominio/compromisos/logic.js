/**
 * compromisos/logic.js — funciones puras del dominio de compromisos.
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 *
 * Compromiso: gasto recurrente con un día de pago fijo en el mes.
 * Tipos: 'fijo' (arriendo, servicio), 'deuda' (cuota), 'agenda' (próximo pago puntual).
 */

import { FRECUENCIAS } from '../../core/constants.js';

// ── CATÁLOGOS LOCALES ────────────────────────────────────────────

export const TIPOS_COMPROMISO = ['fijo', 'deuda', 'agenda'];

/** Etiqueta legible por tipo. */
export const LABEL_TIPO = {
  fijo:   'Gasto fijo',
  deuda:  'Deuda',
  agenda: 'Agenda',
};

/** Emoji por tipo de compromiso. */
export const ICONO_TIPO = {
  fijo:   '🔁',
  deuda:  '💳',
  agenda: '📅',
};

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
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 */
export function compromisosActivos(compromisos) {
  return compromisos.filter(c => c.activo !== false);
}

/**
 * Proyecta el monto mensual equivalente de un compromiso.
 * @param {import('../../core/state.js').Compromiso} compromiso
 * @returns {number} COP / mes equivalente.
 */
export function calcularCompromisoMensual(compromiso) {
  const factor = FACTOR_MENSUAL[compromiso.frecuencia] ?? 0;
  return (compromiso.monto ?? 0) * factor;
}

/**
 * Suma la proyección mensual de todos los compromisos activos.
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @returns {number} Total mensual en COP.
 */
export function calcularTotalCompromisos(compromisos) {
  return compromisosActivos(compromisos)
    .reduce((acc, c) => acc + calcularCompromisoMensual(c), 0);
}

/**
 * Cuántos días faltan para el próximo vencimiento de un compromiso.
 * Si `diaPago` es hoy o en el futuro dentro del mes → días restantes en el mes actual.
 * Si ya pasó → días hasta el mismo día del mes siguiente.
 *
 * @param {import('../../core/state.js').Compromiso} compromiso
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
 * @param {import('../../core/state.js').Compromiso} compromiso
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
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @param {number} [diasLimite=3]
 * @returns {Array<import('../../core/state.js').Compromiso & { diasRestantes: number }>}
 */
export function compromisosProximos(compromisos, diasLimite = 3) {
  return compromisosActivos(compromisos)
    .map(c => ({ ...c, diasRestantes: proximoVencimiento(c) }))
    .filter(c => c.diasRestantes <= diasLimite)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida los datos del formulario de compromiso.
 *
 * Los campos `saldoPendiente` y `tasaEA` son opcionales incluso para tipo='deuda'.
 * Si el usuario los deja vacíos se aceptan; si los llena deben ser válidos.
 *
 * @param {Record<string, string>} datos
 * @returns {string[]} Mensajes de error (vacío = válido).
 */
export function validarCompromiso(datos) {
  const errores = [];

  if (!datos.descripcion?.trim()) {
    errores.push('La descripción del compromiso es obligatoria.');
  }
  const monto = Number(datos.monto);
  if (isNaN(monto) || monto <= 0) {
    errores.push('El monto debe ser un número mayor a 0.');
  }
  if (!datos.frecuencia || !FRECUENCIAS.includes(datos.frecuencia)) {
    errores.push('Debés elegir la frecuencia del compromiso.');
  }
  const diaPago = Number(datos.diaPago);
  if (!Number.isInteger(diaPago) || diaPago < 1 || diaPago > 31) {
    errores.push('El día de pago debe ser un número entero entre 1 y 31.');
  }
  if (!datos.tipo || !TIPOS_COMPROMISO.includes(datos.tipo)) {
    errores.push('Debés elegir el tipo de compromiso.');
  }

  // Validaciones opcionales para deudas (solo si el usuario completó los campos).
  if (datos.tipo === 'deuda') {
    if (datos.saldoPendiente !== '' && datos.saldoPendiente !== undefined) {
      const saldo = Number(datos.saldoPendiente);
      if (isNaN(saldo) || saldo < 0) {
        errores.push('El saldo pendiente debe ser un número igual o mayor a 0.');
      }
    }
    if (datos.tasaEA !== '' && datos.tasaEA !== undefined) {
      const tasa = Number(datos.tasaEA);
      if (isNaN(tasa) || tasa < 0 || tasa > 200) {
        errores.push('La tasa EA debe ser un porcentaje entre 0 y 200.');
      }
    }
  }

  return errores;
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte datos crudos del formulario al shape de S.compromisos.
 * Asume que los datos ya pasaron `validarCompromiso()`.
 *
 * Para tipo='deuda', incluye campos opcionales solo si tienen valor válido:
 * - `saldoPendiente` — COP (número ≥ 0).
 * - `tasaEA`         — tasa efectiva anual como decimal 0–1 (se convierte desde %).
 *
 * @param {Record<string, string>} datos
 */
export function normalizarCompromiso(datos) {
  const base = {
    descripcion: datos.descripcion.trim(),
    monto:       Number(datos.monto),
    frecuencia:  datos.frecuencia,
    diaPago:     Number(datos.diaPago),
    tipo:        datos.tipo,
    activo:      true,
  };

  if (datos.tipo === 'deuda') {
    const saldo = Number(datos.saldoPendiente);
    if (datos.saldoPendiente !== '' && datos.saldoPendiente !== undefined && !isNaN(saldo) && saldo >= 0) {
      base.saldoPendiente = saldo;
    }
    const tasaPct = Number(datos.tasaEA);
    if (datos.tasaEA !== '' && datos.tasaEA !== undefined && !isNaN(tasaPct) && tasaPct >= 0) {
      base.tasaEA = tasaPct / 100;
    }
  }

  return base;
}
