/**
 * tesoreria/logic.js - funciones puras de la capa de tesorería.
 *
 * Reglas:
 * - Sin DOM. Sin S directo. Reciben datos, devuelven datos.
 * - Testeable en Node/Vitest sin ningún mock de navegador.
 */

import { GMF, FRECUENCIAS, BANCOS_CO } from '../../core/constants.js';

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

// ── PRÓXIMO PAGO ─────────────────────────────────────────────────

/**
 * Calcula cuántos días faltan para el próximo cobro de un ingreso recurrente.
 * Solo soporta Mensual y Quincenal: son los únicos con diaPago basado en día del mes.
 * Para Quincenal, los dos días de cobro son `diaPago` y `diaPago + 15`.
 *
 * @param {string}      frecuencia
 * @param {number|null} diaPago    Día del mes (1-31). Para Quincenal: primer día (1-15).
 * @param {Date}        [hoy]      Fecha de referencia (default: hoy).
 * @returns {{ dias: number, fechaISO: string } | null}
 */
export function diasParaProximoPago(frecuencia, diaPago, hoy = new Date()) {
  if (!diaPago || (frecuencia !== 'Mensual' && frecuencia !== 'Quincenal')) return null;

  const hoyNorm = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const msDay   = 1000 * 60 * 60 * 24;

  function _fechaEnMes(anio, mes, dia) {
    const ultimo = new Date(anio, mes + 1, 0).getDate();
    return new Date(anio, mes, Math.min(dia, ultimo));
  }

  function _candidatosMes(anio, mes) {
    if (frecuencia === 'Mensual') return [_fechaEnMes(anio, mes, diaPago)];
    return [_fechaEnMes(anio, mes, diaPago), _fechaEnMes(anio, mes, diaPago + 15)];
  }

  const anio    = hoyNorm.getFullYear();
  const mes     = hoyNorm.getMonth();
  const nextMes  = mes === 11 ? 0 : mes + 1;
  const nextAnio = mes === 11 ? anio + 1 : anio;

  const proxima = [
    ..._candidatosMes(anio, mes),
    ..._candidatosMes(nextAnio, nextMes),
  ]
    .filter(f => f >= hoyNorm)
    .sort((a, b) => a - b)[0];

  if (!proxima) return null;

  const dias     = Math.round((proxima.getTime() - hoyNorm.getTime()) / msDay);
  const fechaISO = `${proxima.getFullYear()}-${String(proxima.getMonth() + 1).padStart(2, '0')}-${String(proxima.getDate()).padStart(2, '0')}`;
  return { dias, fechaISO };
}

/**
 * Detecta el nudge de próximo ingreso a cobrar.
 * Devuelve el ingreso más próximo con su urgencia y cuántos más llegan esa semana.
 * Devuelve null si no hay ingresos con próximo pago calculable.
 *
 * @param {import('../../core/state.js').Ingreso[]} ingresos
 * @param {Date} [hoy]
 * @returns {{ principal: {descripcion: string, dias: number, fechaISO: string},
 *             otrosProximos: number } | null}
 */
export function detectarNudgeProximoIngreso(ingresos, hoy = new Date()) {
  if (!Array.isArray(ingresos)) return null;

  const proximos = ingresos
    .filter(i => i.activo !== false && i.diaPago)
    .map(i => {
      const prox = diasParaProximoPago(i.frecuencia, i.diaPago, hoy);
      if (!prox) return null;
      return { descripcion: i.descripcion, ...prox };
    })
    .filter(Boolean)
    .sort((a, b) => a.dias - b.dias);

  if (proximos.length === 0) return null;

  const otrosProximos = proximos.slice(1).filter(p => p.dias <= 7).length;
  return { principal: proximos[0], otrosProximos };
}

// ── VALIDACIÓN INGRESOS ──────────────────────────────────────────

/**
 * Frecuencias en las que aplica capturar el día del mes en que llega el pago.
 * Excluye Diario, Semanal (día de semana), Variable y Única vez.
 */
export const FRECUENCIAS_CON_DIA = [
  'Quincenal', 'Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual',
];

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
  // diaPago es opcional; si se proporcionó y la frecuencia lo soporta, validar rango.
  if (datos.diaPago !== undefined && datos.diaPago !== '' && FRECUENCIAS_CON_DIA.includes(datos.frecuencia)) {
    const dia    = Number(datos.diaPago);
    const maxDia = datos.frecuencia === 'Quincenal' ? 15 : 31;
    if (!Number.isInteger(dia) || dia < 1 || dia > maxDia) {
      errores.push(datos.frecuencia === 'Quincenal'
        ? 'El día de la primera quincena debe estar entre 1 y 15.'
        : 'El día de pago debe estar entre 1 y 31.');
    }
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
  const diaRaw  = datos.diaPago;
  const diaPago = (diaRaw !== undefined && diaRaw !== '' && FRECUENCIAS_CON_DIA.includes(datos.frecuencia))
    ? Number(diaRaw)
    : null;
  return {
    descripcion: datos.descripcion.trim(),
    monto:       Number(datos.monto),
    frecuencia:  datos.frecuencia,
    activo:      true,
    diaPago,
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
  // Las billeteras y el efectivo no tienen un "tipo de cuenta" bancario:
  // el selector se oculta en el form y el tipo se normaliza automáticamente.
  const clase = _claseBanco(datos.banco ?? '');
  if (clase !== 'efectivo' && clase !== 'billetera'
      && (!datos.tipo?.trim() || datos.tipo === '')) {
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

// ── DISTRIBUCIÓN ADAPTATIVA DEL INGRESO (Fase 3) ─────────────────

/**
 * Sugiere cómo distribuir el ingreso mensual adaptando la regla 50/30/20
 * al peso real de los gastos fijos del usuario.
 * Orientativo: nunca prescriptivo. Usa solo datos registrados en Finko.
 *
 * @param {number} ingresoMensual
 * @param {{
 *   gastosFijosMensuales?: number,
 *   tieneDeudas?:          boolean,
 *   tieneFondoActivo?:     boolean,
 *   fondoCompleto?:        boolean,
 *   tieneInversiones?:     boolean,
 * }} [contexto]
 * @returns {{
 *   ingresoMensual: number,
 *   pctFijos:       number,
 *   metodo:         string,
 *   razon:          string,
 *   alertas:        string[],
 *   ctas:           {label:string, seccion:string}[],
 *   split: {
 *     necesidades: {pct:number, monto:number, label:string},
 *     estiloVida:  {pct:number, monto:number, label:string},
 *     ahorro:      {pct:number, monto:number, label:string},
 *   },
 * } | null}
 */
export function sugerirDistribucionIngreso(ingresoMensual, {
  gastosFijosMensuales = 0,
  tieneDeudas          = false,
  tieneFondoActivo     = false,
  fondoCompleto        = false,
  tieneInversiones     = false,
} = {}) {
  if (!ingresoMensual || ingresoMensual <= 0) return null;

  const pctFijos = gastosFijosMensuales > 0
    ? Math.round((gastosFijosMensuales / ingresoMensual) * 100)
    : 0;

  let necesidadesPct;
  let estiloVidaPct;
  let ahorroInvPct;
  let metodo;
  let razon;
  const alertas = [];
  const ctas    = [];

  if (pctFijos > 70) {
    necesidadesPct = Math.min(pctFijos, 85);
    const restante = 100 - necesidadesPct;
    ahorroInvPct   = Math.max(5, Math.round(restante * 0.3));
    estiloVidaPct  = restante - ahorroInvPct;
    metodo = 'ajustado-fijos-altos';
    razon  = `Tus gastos fijos representan el ${pctFijos}% de tus ingresos (según lo que registras en Finko). Hay poco margen: cubre lo necesario primero.`;
    alertas.push(`Tus gastos fijos consumen más del 70% de tus ingresos. Revisa compromisos y suscripciones recurrentes.`);
  } else if (pctFijos > 50) {
    necesidadesPct = pctFijos;
    const restante = 100 - necesidadesPct;
    ahorroInvPct   = Math.max(10, Math.round(restante * 0.4));
    estiloVidaPct  = restante - ahorroInvPct;
    metodo = 'ajustado';
    razon  = `Tus gastos fijos son el ${pctFijos}% de tus ingresos (según lo que registras en Finko). Ajustamos para que el ahorro no quede en cero.`;
  } else {
    necesidadesPct = 50;
    estiloVidaPct  = 30;
    ahorroInvPct   = 20;
    metodo = '50/30/20';
    razon  = pctFijos > 0
      ? `Tus gastos fijos son el ${pctFijos}% de tus ingresos: dentro del rango saludable. La distribución 50/30/20 aplica bien.`
      : 'Registra tus gastos fijos en Compromisos para una recomendación más precisa.';
  }

  if (!tieneFondoActivo) {
    alertas.push('Sin fondo de emergencia activo: destina el porcentaje de ahorro aquí primero.');
    ctas.push({ label: 'Activar fondo de emergencia', seccion: 'ahorro' });
  } else if (!fondoCompleto) {
    alertas.push('Tu fondo de emergencia aún no está completo: dale prioridad al ahorro.');
    ctas.push({ label: 'Ver progreso del fondo', seccion: 'ahorro' });
  } else if (!tieneInversiones) {
    ctas.push({ label: 'Explorar inversiones', seccion: 'inversion' });
  }

  if (tieneDeudas) {
    alertas.push('Tienes deudas activas: considera destinar parte del ahorro al pago de deudas.');
    ctas.push({ label: 'Ver estrategia de deudas', seccion: 'compromisos' });
  }

  const nMonto = Math.round(ingresoMensual * necesidadesPct / 100);
  const eMonto = Math.round(ingresoMensual * estiloVidaPct  / 100);
  const aMonto = Math.round(ingresoMensual * ahorroInvPct   / 100);

  return {
    ingresoMensual,
    pctFijos,
    metodo,
    razon,
    alertas,
    ctas,
    split: {
      necesidades: { pct: necesidadesPct, monto: nMonto, label: 'Necesidades' },
      estiloVida:  { pct: estiloVidaPct,  monto: eMonto, label: 'Estilo de vida' },
      ahorro:      { pct: ahorroInvPct,   monto: aMonto, label: tieneInversiones ? 'Ahorro e inversión' : 'Ahorro' },
    },
  };
}
