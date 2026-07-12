/**
 * tesoreria/logic/cuentas.js - funciones puras de cuentas, cuota de manejo y GMF (4x1000).
 *
 * Sub-modulo de tesoreria/logic.js (barrel). Reglas de la capa:
 * - Sin DOM. Sin S directo. Reciben datos, devuelven datos.
 * - Testeable en Node/Vitest sin ningun mock de navegador.
 */

import { GMF, BANCOS_CO, TIPOS_LLAVE } from '../../../core/constants.js';

/**
 * Devuelve la clase de una entidad bancaria ('banco' | 'billetera' | 'efectivo' | 'otro').
 * Si el id no se encuentra en BANCOS_CO, devuelve 'otro' como fallback seguro.
 *
 * @param {string} bancoId
 * @returns {'banco'|'billetera'|'efectivo'|'otro'}
 */
function _claseBanco(bancoId) {
  return BANCOS_CO.find(b => b.id === bancoId)?.clase ?? 'otro';
}

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra las cuentas que están activas (`activa !== false`).
 *
 * @param {import('../../../core/state.js').Cuenta[]} cuentas
 * @returns {import('../../../core/state.js').Cuenta[]}
 */
export function cuentasActivas(cuentas) {
  return cuentas.filter(c => c.activa !== false);
}

/**
 * Suma el saldo de todas las cuentas activas.
 *
 * @param {import('../../../core/state.js').Cuenta[]} cuentas
 * @returns {number} Total en COP.
 */
export function calcularTotalCuentas(cuentas) {
  return cuentasActivas(cuentas).reduce((acc, c) => acc + (c.saldo ?? 0), 0);
}

/**
 * Composición del total por cuenta para la barra del hero (MC.18a, ADR 035 D3).
 * Solo cuentas activas con saldo mayor a 0, ordenadas de mayor a menor saldo.
 * `pct` es la porción del total (0 a 100, sin redondear: la vista formatea).
 * Devuelve [] cuando no hay saldo positivo que repartir (la barra no se pinta).
 *
 * @param {import('../../../core/state.js').Cuenta[]} cuentas
 * @returns {{ id: string, pct: number }[]}
 */
export function composicionCuentas(cuentas) {
  const conSaldo = cuentasActivas(cuentas).filter(c => (c.saldo ?? 0) > 0);
  const total = conSaldo.reduce((acc, c) => acc + c.saldo, 0);
  if (total <= 0) return [];
  return conSaldo
    .slice()
    .sort((a, b) => b.saldo - a.saldo)
    .map(c => ({ id: c.id, pct: (c.saldo / total) * 100 }));
}

/**
 * Resumen en texto de la composición para el hero (MC.18a, ADR 035 D3):
 * conteo total de cuentas + desglose de billeteras + presencia de efectivo,
 * ej. "3 cuentas · 1 billetera · efectivo". Acompaña a la barra para que el
 * color nunca viaje solo (SC 1.4.11). Devuelve '' sin cuentas activas.
 *
 * @param {import('../../../core/state.js').Cuenta[]} cuentas
 * @returns {string}
 */
export function resumenCuentas(cuentas) {
  const activas = cuentasActivas(cuentas);
  if (activas.length === 0) return '';

  const partes = [`${activas.length} ${activas.length === 1 ? 'cuenta' : 'cuentas'}`];
  const billeteras = activas.filter(c => _claseBanco(c.banco) === 'billetera').length;
  if (billeteras > 0) {
    partes.push(`${billeteras} ${billeteras === 1 ? 'billetera' : 'billeteras'}`);
  }
  if (activas.some(c => _claseBanco(c.banco) === 'efectivo')) partes.push('efectivo');
  return partes.join(' · ');
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
    errores.push('Debes elegir un banco o billetera.');
  }
  // Las billeteras y el efectivo no tienen un "tipo de cuenta" bancario:
  // el selector se oculta en el form y el tipo se normaliza automáticamente.
  const clase = _claseBanco(datos.banco ?? '');
  if (clase !== 'efectivo' && clase !== 'billetera'
      && (!datos.tipo?.trim() || datos.tipo === '')) {
    errores.push('Debes elegir el tipo de cuenta.');
  }
  const saldo = Number(datos.saldo);
  if (!Number.isFinite(saldo) || saldo < 0) {
    errores.push('El saldo debe ser un número igual o mayor a 0.');
  }

  // Validar cuota de manejo solo si el toggle está activo.
  if (_cuotaActiva(datos)) {
    const monto = Number(datos.cuotaManejoMonto);
    if (!Number.isFinite(monto) || monto <= 0) {
      errores.push('El monto de la cuota de manejo debe ser mayor a 0.');
    }
    const dia = Number(datos.cuotaManejoDia);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      errores.push('El día de cobro debe ser un número entre 1 y 31.');
    }
  }

  // MC.14: validar datos de transferencia solo si el toggle está activo.
  // Todos los campos son opcionales entre sí, salvo que si hay llave, debe
  // saberse de qué tipo es (celular, correo, documento...); sin eso el dato
  // no sirve de mucho para quien lo va a leer.
  if (_transferenciaActiva(datos)) {
    const llave     = datos.llave?.trim();
    const tipoLlave = datos.tipoLlave?.trim();
    if (llave && !tipoLlave) {
      errores.push('Debes indicar el tipo de llave.');
    }
    if (tipoLlave && !TIPOS_LLAVE.includes(tipoLlave)) {
      errores.push('El tipo de llave seleccionado no es válido.');
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

/**
 * Indica si el form pidió activar los datos de transferencia (MC.14).
 *
 * @param {Record<string, string>} datos
 * @returns {boolean}
 */
function _transferenciaActiva(datos) {
  return _checkOn(datos?.transferenciaActiva);
}

/**
 * Extrae los datos de transferencia del formulario (MC.14), o `null` si el
 * toggle no está activo o el usuario lo activó sin llenar ningún campo.
 * Asume que los datos ya pasaron `validarCuenta()`.
 *
 * @param {Record<string, string>} datos
 * @returns {import('../../../core/state.js').DatosTransferencia | null}
 */
export function parseDatosTransferencia(datos) {
  if (!_transferenciaActiva(datos)) return null;

  const numeroCuenta = datos.numeroCuenta?.trim() || '';
  const llave        = datos.llave?.trim() || '';
  const tipoLlave     = datos.tipoLlave?.trim() || '';
  const alias        = datos.alias?.trim() || '';

  if (!numeroCuenta && !llave && !alias) return null;

  const resultado = {};
  if (numeroCuenta) resultado.numeroCuenta = numeroCuenta;
  if (llave) {
    resultado.llave     = llave;
    resultado.tipoLlave = tipoLlave || null;
  }
  if (alias) resultado.alias = alias;
  return resultado;
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte los datos crudos del formulario al shape del schema de S.cuentas.
 * Asume que los datos ya pasaron `validarCuenta()`.
 *
 * @param {Record<string, string>} datos
 * @returns {Omit<import('../../../core/state.js').Cuenta, 'id' | 'fechaCreacion'>}
 */
export function normalizarCuenta(datos) {
  const banco  = datos.banco.trim();
  // Normalizar tipo según la clase de la entidad:
  //   efectivo  → 'Efectivo' (tipo oculto en el form, autogenerado)
  //   billetera → id del banco (ej. 'Nequi'): _autoNombre evita duplicar "Nequi Nequi"
  //   banco/otro → valor del select (lo eligió el usuario)
  const claseN = _claseBanco(banco);
  const tipo   = claseN === 'efectivo'  ? 'Efectivo'
               : claseN === 'billetera' ? banco
               : (datos.tipo ?? '');
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
    datosTransferencia: parseDatosTransferencia(datos),
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
 * La frecuencia es 'Mensual' capitalizada (BUG-005): todo el catálogo
 * `FRECUENCIAS` y las tablas de factor mensual (`FACTOR_MENSUAL` aquí,
 * `FACTOR_MENSUAL` en compromisos) comparan contra la forma capitalizada;
 * con 'mensual' en minúscula la cuota quedaba fuera de los gastos fijos
 * mensuales, del checklist de Necesidades y del objetivo del fondo. La
 * migración v19→v20 de storage.js corrige las cuotas ya guardadas.
 *
 * @param {import('../../../core/state.js').Cuenta} cuenta
 * @returns {Omit<import('../../../core/state.js').Compromiso, 'id' | 'fechaCreacion'> | null}
 */
export function compromisoDesdeCuotaManejo(cuenta) {
  if (!cuenta?.cuotaManejo) return null;
  const { monto, diaCobro } = cuenta.cuotaManejo;
  return {
    descripcion:    `Cuota de manejo ${cuenta.nombre}`,
    monto,
    frecuencia:     'Mensual',
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
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
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
 * @param {import('../../../core/state.js').Gasto[]}  gastos
 * @param {import('../../../core/state.js').Cuenta[]} cuentas
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
    icono:             'gastos',
    cantidadCuentasGMF,
    gastosGravados,
    costoGMF,
  };
}
