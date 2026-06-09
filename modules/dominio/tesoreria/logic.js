/**
 * tesoreria/logic.js - funciones puras de la capa de tesorería.
 *
 * Reglas:
 * - Sin DOM. Sin S directo. Reciben datos, devuelven datos.
 * - Testeable en Node/Vitest sin ningún mock de navegador.
 */

import { GMF, FRECUENCIAS } from '../../core/constants.js';

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra las cuentas que están activas (`activa !== false`).
 *
 * @param {import('../../core/state.js').Cuenta[]} cuentas
 * @returns {import('../../core/state.js').Cuenta[]}
 */
export function cuentasActivas(cuentas) {
  return cuentas.filter(c => c.activa !== false);
}

/**
 * Suma el saldo de todas las cuentas activas.
 *
 * @param {import('../../core/state.js').Cuenta[]} cuentas
 * @returns {number} Total en COP.
 */
export function calcularTotalCuentas(cuentas) {
  return cuentasActivas(cuentas).reduce((acc, c) => acc + (c.saldo ?? 0), 0);
}

// ── PRIMA DE SERVICIOS - recordatorio (G.3.F9) ──────────────────

/**
 * Calcula los días que faltan para la próxima prima de servicios.
 *
 * Fechas de pago en Colombia:
 *   Primer semestre:  30 de junio.
 *   Segundo semestre: 20 de diciembre.
 *
 * @param {Date} [hoy] - Fecha de referencia (default: ahora).
 * @returns {{ dias: number, fecha: string, semestre: 1 | 2 }}
 */
export function diasParaPrimaSemestral(hoy = new Date()) {
  // Normalizar a medianoche local para comparación limpia de fechas.
  const hoyNorm = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const anio    = hoyNorm.getFullYear();

  const candidatos = [
    { fecha: new Date(anio,      5, 30), semestre: 1 },  // 30 jun este año
    { fecha: new Date(anio,     11, 20), semestre: 2 },  // 20 dic este año
    { fecha: new Date(anio + 1,  5, 30), semestre: 1 },  // 30 jun próximo año
  ];

  // Tomar el candidato más próximo que no haya pasado aún (>= hoy).
  const proximo = candidatos
    .filter(c => c.fecha >= hoyNorm)
    .sort((a, b) => a.fecha - b.fecha)[0];

  const msPerDay = 1000 * 60 * 60 * 24;
  const dias     = Math.round((proximo.fecha.getTime() - hoyNorm.getTime()) / msPerDay);
  const d        = proximo.fecha;
  const fecha    = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return { dias, fecha, semestre: proximo.semestre };
}

// ── PRIMA DE SERVICIOS - distribución (G.3.F8) ──────────────────

/**
 * Estima el salario mensual como suma de todos los ingresos activos
 * con frecuencia 'Mensual'. Proxy para calcular la prima semestral.
 *
 * @param {import('../../core/state.js').Ingreso[]} ingresos
 * @returns {number} COP/mes (0 si no hay ingresos mensuales registrados).
 */
export function estimarSalarioMensual(ingresos) {
  return ingresos
    .filter(i => i.activo !== false && i.frecuencia === 'Mensual')
    .reduce((acc, i) => acc + (i.monto ?? 0), 0);
}

/**
 * Calcula la prima semestral estimada y sugiere su distribución.
 *
 * Fórmula simplificada (semestre completo = 180 dias trabajados):
 *   prima = salario * 180 / 360
 *
 * Distribución sugerida:
 *   50% → fondo de emergencia
 *   30% → pago de deudas activas (solo si tieneDeudas = true)
 *   20% → metas de ahorro (sube a 50% cuando no hay deudas)
 *
 * @param {number} salario       - Ingreso mensual en COP.
 * @param {boolean} tieneDeudas  - true si hay compromisos tipo 'deuda' activos.
 * @returns {{
 *   prima:     number,
 *   fondo:     number,
 *   deudas:    number,
 *   ahorro:    number,
 *   fondoPct:  number,
 *   deudasPct: number,
 *   ahorroPct: number,
 * }}
 */
export function sugerirDistribucionPrima(salario, tieneDeudas) {
  const prima     = Math.round(salario * 180 / 360);
  const fondoPct  = 50;
  const deudasPct = tieneDeudas ? 30 : 0;
  const ahorroPct = 100 - fondoPct - deudasPct;      // 20 con deudas, 50 sin

  return {
    prima,
    fondo:     Math.round(prima * fondoPct  / 100),
    deudas:    Math.round(prima * deudasPct / 100),
    ahorro:    Math.round(prima * ahorroPct / 100),
    fondoPct,
    deudasPct,
    ahorroPct,
  };
}

// ── VALIDACIÓN INGRESOS ──────────────────────────────────────────

/**
 * Valida los datos del formulario de ingreso recurrente.
 * Devuelve un array de mensajes de error (vacío = válido).
 *
 * @param {Record<string, string>} datos
 * @returns {string[]}
 */
export function validarIngreso(datos) {
  const errores = [];
  if (!datos.descripcion?.trim()) {
    errores.push('La descripción es obligatoria.');
  }
  const monto = Number(datos.monto);
  if (isNaN(monto) || monto <= 0) {
    errores.push('El monto debe ser un número mayor a 0.');
  }
  if (!datos.frecuencia || !FRECUENCIAS.includes(datos.frecuencia)) {
    errores.push('Debés elegir una frecuencia válida.');
  }
  return errores;
}

/**
 * Convierte los datos crudos del formulario al shape de S.ingresos[].
 * Asume que los datos ya pasaron `validarIngreso()`.
 *
 * @param {Record<string, string>} datos
 * @returns {Omit<import('../../core/state.js').Ingreso, 'id' | 'fechaCreacion'>}
 */
export function normalizarIngreso(datos) {
  return {
    descripcion: datos.descripcion.trim(),
    monto:       Number(datos.monto),
    frecuencia:  datos.frecuencia,
    activo:      true,
  };
}

// ── VALIDACIÓN CUENTAS ───────────────────────────────────────────

/**
 * Valida los datos del formulario antes de guardar.
 * Devuelve un array de mensajes de error (vacío = válido).
 *
 * @param {Record<string, string>} datos - entradas del formulario (valores como string).
 * @returns {string[]}
 */
export function validarCuenta(datos) {
  const errores = [];

  // Nombre es opcional: si esta vacio, normalizarCuenta() lo autogenera.
  if (!datos.banco?.trim() || datos.banco === '') {
    errores.push('Debés elegir un banco o billetera.');
  }
  if (datos.banco !== 'Efectivo' && (!datos.tipo?.trim() || datos.tipo === '')) {
    errores.push('Debés elegir el tipo de cuenta.');
  }
  const saldo = Number(datos.saldo);
  if (isNaN(saldo) || saldo < 0) {
    errores.push('El saldo debe ser un número igual o mayor a 0.');
  }

  // Validar cuota de manejo solo si el toggle está activo.
  if (_cuotaActiva(datos)) {
    const monto = Number(datos.cuotaManejoMonto);
    if (isNaN(monto) || monto <= 0) {
      errores.push('El monto de la cuota de manejo debe ser mayor a 0.');
    }
    const dia = Number(datos.cuotaManejoDia);
    if (isNaN(dia) || !Number.isInteger(dia) || dia < 1 || dia > 31) {
      errores.push('El día de cobro debe ser un número entre 1 y 31.');
    }
  }

  return errores;
}

/**
 * Indica si un valor de checkbox HTML5 está marcado.
 * Un checkbox manda 'on' (o cualquier truthy) cuando está checked
 * y no aparece en FormData cuando está unchecked.
 *
 * @param {string|undefined} v
 * @returns {boolean}
 */
function _checkOn(v) {
  return v === 'on' || v === 'true' || v === '1';
}

/**
 * Indica si el form pidió activar la cuota de manejo.
 *
 * @param {Record<string, string>} datos
 * @returns {boolean}
 */
function _cuotaActiva(datos) {
  return _checkOn(datos?.cuotaManejoActiva);
}

/**
 * Extrae el objeto CuotaManejo del formulario, o devuelve `null` si no se activó.
 * Asume que los datos ya pasaron `validarCuenta()`.
 *
 * @param {Record<string, string>} datos
 * @returns {{monto: number, diaCobro: number} | null}
 */
export function parseCuotaManejo(datos) {
  if (!_cuotaActiva(datos)) return null;
  return {
    monto:    Number(datos.cuotaManejoMonto) || 0,
    diaCobro: Number(datos.cuotaManejoDia)   || 1,
  };
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte los datos crudos del formulario al shape del schema de S.cuentas.
 * Asume que los datos ya pasaron `validarCuenta()`.
 *
 * @param {Record<string, string>} datos
 * @returns {Omit<import('../../core/state.js').Cuenta, 'id' | 'fechaCreacion'>}
 */
export function normalizarCuenta(datos) {
  const banco  = datos.banco.trim();
  // Cuando el banco es Efectivo el campo tipo está oculto: normalizar a 'Efectivo'
  // para que _autoNombre devuelva 'Efectivo' (sin duplicar "Efectivo Efectivo").
  const tipo   = banco === 'Efectivo' ? 'Efectivo' : (datos.tipo ?? '');
  // Si el usuario no escribio nombre, autogenerar uno legible:
  //   "Davivienda Ahorros" / "Nequi Otro" / "Efectivo".
  // Para el banco "Efectivo" + tipo "Efectivo" evitamos duplicar.
  const nombreUsuario = datos.nombre?.trim();
  const nombre = nombreUsuario || _autoNombre(banco, tipo);
  return {
    nombre,
    banco,
    tipo,
    saldo: Number(datos.saldo) || 0,
    icono: datos.icono?.trim() || _iconoPorBanco(banco),
    activa: true,
    cuotaManejo: parseCuotaManejo(datos),
    // El efectivo nunca está sujeto al GMF (no hay movimiento financiero).
    aplica4x1000: banco !== 'Efectivo' && _checkOn(datos.aplica4x1000),
  };
}

// ── CUOTA DE MANEJO → COMPROMISO ─────────────────────────────────

/**
 * Genera el shape de Compromiso fijo mensual que representa la cuota de
 * manejo de una cuenta. Devuelve `null` si la cuenta no tiene cuota.
 *
 * Se usa en tesoreria/index.js para sincronizar: tras guardar la cuenta,
 * o se crea/actualiza el compromiso vinculado, o se elimina.
 *
 * NO incluye `id` ni `fechaCreacion`: los asigna crud.js cuando se persiste.
 *
 * @param {import('../../core/state.js').Cuenta} cuenta
 * @returns {Omit<import('../../core/state.js').Compromiso, 'id' | 'fechaCreacion'> | null}
 */
export function compromisoDesdeCuotaManejo(cuenta) {
  if (!cuenta?.cuotaManejo) return null;
  const { monto, diaCobro } = cuenta.cuotaManejo;
  return {
    descripcion:    `Cuota de manejo ${cuenta.nombre}`,
    monto,
    frecuencia:     'mensual',
    diaPago:        diaCobro,
    tipo:           'fijo',
    activo:         cuenta.activa !== false,
    cuentaId:       cuenta.id,
    esCuotaManejo:  true,
  };
}

/**
 * Busca en una lista de compromisos el que representa la cuota de manejo
 * de una cuenta dada. Devuelve `undefined` si no hay match.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @param {string} cuentaId
 */
export function compromisoCuotaManejoDeCuenta(compromisos, cuentaId) {
  if (!Array.isArray(compromisos)) return undefined;
  return compromisos.find(c => c?.esCuotaManejo === true && c?.cuentaId === cuentaId);
}

/** Genera un nombre legible cuando el usuario lo deja en blanco. */
function _autoNombre(banco, tipo) {
  if (!banco) return tipo || 'Cuenta';
  if (!tipo)  return banco;
  // Evitar redundancia "Efectivo Efectivo".
  if (banco.toLowerCase() === tipo.toLowerCase()) return banco;
  return `${banco} ${tipo}`;
}

/**
 * Devuelve un emoji representativo según el banco/billetera.
 * Fallback general: '🏦'.
 *
 * @param {string} banco
 * @returns {string}
 */
function _iconoPorBanco(banco) {
  const mapa = {
    Nequi: '💚',
    Daviplata: '🟡',
    Nubank: '💜',
    'Lulo Bank': '🟠',
    Efectivo: '💵',
  };
  return mapa[banco] ?? '🏦';
}

// ── GMF / 4x1000 ─────────────────────────────────────────────────

/**
 * Calcula el costo estimado del GMF (4x1000) para el mes indicado,
 * sumando los gastos registrados desde cuentas sujetas al gravamen.
 *
 * Nota: el GMF real se aplica sobre retiros y transferencias bancarias.
 * Esta función usa los gastos del mes como proxy razonable para orientar
 * al usuario sobre su exposición al gravamen.
 *
 * @param {import('../../core/state.js').Gasto[]}  gastos
 * @param {import('../../core/state.js').Cuenta[]} cuentas
 * @param {number} anio
 * @param {number} mes  1-12.
 * @returns {{ cantidadCuentasGMF: number, gastosGravados: number, costoGMF: number }}
 */
export function calcularCostoGMF(gastos, cuentas, anio, mes) {
  const cuentasArr = Array.isArray(cuentas) ? cuentas : [];
  const gastosArr  = Array.isArray(gastos)  ? gastos  : [];

  const idsConGMF = new Set(
    cuentasArr.filter(c => c?.aplica4x1000 === true).map(c => c.id),
  );

  if (idsConGMF.size === 0) {
    return { cantidadCuentasGMF: 0, gastosGravados: 0, costoGMF: 0 };
  }

  const mesPad  = String(mes).padStart(2, '0');
  const prefijo = `${anio}-${mesPad}`;

  const gastosGravados = gastosArr
    .filter(g => g?.fecha?.startsWith(prefijo) && idsConGMF.has(g.cuentaId))
    .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

  return {
    cantidadCuentasGMF: idsConGMF.size,
    gastosGravados:     Math.round(gastosGravados),
    costoGMF:           Math.round(gastosGravados * GMF),
  };
}

/**
 * Detecta si aplica mostrar el nudge de costo del GMF.
 * Devuelve un objeto de nudge cuando el costo estimado del mes es mayor a 0,
 * o null cuando no hay nada que reportar.
 *
 * El objeto devuelto incluye los valores numéricos en crudo para que la
 * vista los formatee con la función de moneda correspondiente.
 *
 * @param {{ cantidadCuentasGMF: number, gastosGravados: number, costoGMF: number }} gmfData
 * @returns {{ id: string, nivel: string, icono: string, cantidadCuentasGMF: number,
 *             gastosGravados: number, costoGMF: number } | null}
 */
export function detectarNudgeGMF(gmfData) {
  const {
    cantidadCuentasGMF = 0,
    gastosGravados     = 0,
    costoGMF           = 0,
  } = gmfData ?? {};

  if (costoGMF <= 0) return null;

  return {
    id:                'gmf-costo',
    nivel:             'nudge-info',
    icono:             '💸',
    cantidadCuentasGMF,
    gastosGravados,
    costoGMF,
  };
}
