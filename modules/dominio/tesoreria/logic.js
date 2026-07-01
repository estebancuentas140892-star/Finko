/**
 * tesoreria/logic.js - funciones puras de la capa de tesorería.
 *
 * Reglas:
 * - Sin DOM. Sin S directo. Reciben datos, devuelven datos.
 * - Testeable en Node/Vitest sin ningún mock de navegador.
 */

import { GMF, FRECUENCIAS, BANCOS_CO, CATEGORIAS_INGRESO, SMMLV, AUXILIO_TRANSPORTE } from '../../core/constants.js';

// Tabla de conversión a mensual. Local para no importar de otro dominio (ADN #10).
// Frecuencias de baja periodicidad (Bimestral, Trimestral, Semestral, Anual,
// 'Única vez') se excluyen intencionalmente: no representan flujo mensual recurrente.
const _FACTOR_MENSUAL = {
  'Diario':    30,
  'Semanal':   4.33,
  'Quincenal': 2,
  'Mensual':   1,
};

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
 * Suma todos los ingresos activos proyectados a unidad mensual.
 * Usa _FACTOR_MENSUAL para convertir frecuencias distintas a Mensual.
 * Frecuencias no listadas (Bimestral, Anual, etc.) se excluyen del cómputo.
 *
 * @param {import('../../core/state.js').Ingreso[]} ingresos
 * @returns {number} COP/mes equivalente (0 si no hay ingresos con frecuencia reconocida).
 */
export function estimarSalarioMensual(ingresos) {
  return ingresos
    .filter(i => i.activo !== false)
    .reduce((acc, i) => acc + (i.monto ?? 0) * (_FACTOR_MENSUAL[i.frecuencia] ?? 0), 0);
}

/**
 * Suma los gastos fijos activos de S.compromisos proyectados a unidad mensual.
 * Solo cuenta tipo 'fijo'; las deudas tienen su propia cuotaMensual.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @returns {number} COP/mes equivalente.
 */
export function calcularGastosFijosMensuales(compromisos) {
  if (!Array.isArray(compromisos)) return 0;
  return compromisos
    .filter(c => c.activo !== false && c.tipo === 'fijo')
    .reduce((acc, c) => acc + (c.monto ?? 0) * (_FACTOR_MENSUAL[c.frecuencia] ?? 0), 0);
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

// ── DISTRIBUIR AL LLEGAR EL COBRO (ADR 012, MC.4d) ───────────────

/** Formatea un Date a 'YYYY-MM-DD' en hora local. */
function _isoFecha(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Devuelve la fecha (ISO 'YYYY-MM-DD') del cobro más reciente que ya ocurrió
 * (<= hoy) de un ingreso recurrente, o null si no aplica. Es el espejo hacia
 * atrás de `diasParaProximoPago`: mira el mes actual y el anterior y toma el
 * último día de cobro que no sea futuro. Solo soporta Mensual y Quincenal.
 *
 * @param {string}      frecuencia
 * @param {number|null} diaPago
 * @param {Date}        [hoy]
 * @returns {string | null}
 */
export function ultimoPagoHasta(frecuencia, diaPago, hoy = new Date()) {
  if (!diaPago || (frecuencia !== 'Mensual' && frecuencia !== 'Quincenal')) return null;

  const hoyNorm = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  function _fechaEnMes(anio, mes, dia) {
    const ultimo = new Date(anio, mes + 1, 0).getDate();
    return new Date(anio, mes, Math.min(dia, ultimo));
  }
  function _candidatosMes(anio, mes) {
    if (frecuencia === 'Mensual') return [_fechaEnMes(anio, mes, diaPago)];
    return [_fechaEnMes(anio, mes, diaPago), _fechaEnMes(anio, mes, diaPago + 15)];
  }

  const anio     = hoyNorm.getFullYear();
  const mes      = hoyNorm.getMonth();
  const prevMes  = mes === 0 ? 11 : mes - 1;
  const prevAnio = mes === 0 ? anio - 1 : anio;

  const ultimo = [
    ..._candidatosMes(prevAnio, prevMes),
    ..._candidatosMes(anio, mes),
  ]
    .filter(fch => fch <= hoyNorm)
    .sort((a, b) => b - a)[0];

  return ultimo ? _isoFecha(ultimo) : null;
}

/**
 * Estado de la acción "Distribuir mi ingreso" según la fecha de cobro de los
 * ingresos y el último periodo ya distribuido. Pura (sin S, sin DOM).
 *
 * El "periodo" es la fecha del cobro más reciente (<= hoy y no anterior a la
 * creación del ingreso) entre los ingresos activos con día de pago datable
 * (Mensual / Quincenal). Esa fecha ISO es la clave de de-duplicación.
 *
 * Estados:
 *   'sin-fecha'   : ningún ingreso activo tiene un cobro datable → el caller
 *                   mantiene la acción disponible (no se puede aplicar el guard).
 *   'pendiente'   : hay cobros datables pero el de este periodo aún no llega
 *                   (primer pago futuro tras crear el ingreso) → acción oculta.
 *   'listo'       : ya llegó el cobro de este periodo y no se ha distribuido.
 *   'distribuido' : el cobro de este periodo ya se distribuyó (mismo periodoISO).
 *
 * @param {import('../../core/state.js').Ingreso[]} ingresos
 * @param {string|null} ultimaDistribucionPeriodo - periodoISO de la última distribución.
 * @param {Date} [hoy]
 * @returns {{ estado:'sin-fecha'|'pendiente'|'listo'|'distribuido', periodoISO: string|null, esHoy: boolean }}
 */
export function estadoDistribucion(ingresos, ultimaDistribucionPeriodo = null, hoy = new Date()) {
  const base = { estado: 'sin-fecha', periodoISO: null, esHoy: false };
  if (!Array.isArray(ingresos)) return base;

  const activos = ingresos.filter(i => i.activo !== false && i.diaPago);
  let hayDatable = false;  // algún ingreso con frecuencia datable (Mensual/Quincenal)
  let mejorCobro = null;   // periodoISO más reciente de un cobro ya recibido

  for (const i of activos) {
    const ultISO = ultimoPagoHasta(i.frecuencia, i.diaPago, hoy);
    if (!ultISO) continue;          // frecuencia no datable (Anual, etc.)
    hayDatable = true;
    // No datar cobros anteriores a la creación del ingreso: evita el falso
    // "ya recibiste" al registrar hoy un ingreso cuyo día de pago ya pasó.
    const creadoISO = typeof i.fechaCreacion === 'string' ? i.fechaCreacion.slice(0, 10) : null;
    if (creadoISO && ultISO < creadoISO) continue;
    if (!mejorCobro || ultISO > mejorCobro) mejorCobro = ultISO;
  }

  if (!hayDatable) return base;                                          // 'sin-fecha'
  if (!mejorCobro) return { estado: 'pendiente', periodoISO: null, esHoy: false };

  const hoyISO = _isoFecha(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
  return {
    estado:     ultimaDistribucionPeriodo === mejorCobro ? 'distribuido' : 'listo',
    periodoISO: mejorCobro,
    esHoy:      mejorCobro === hoyISO,
  };
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
    errores.push('Debes elegir una frecuencia válida.');
  }
  if (datos.categoria && !CATEGORIAS_INGRESO.includes(datos.categoria)) {
    errores.push('La categoría seleccionada no es válida.');
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
  const categoria = datos.categoria && CATEGORIAS_INGRESO.includes(datos.categoria)
    ? datos.categoria
    : null;
  return {
    descripcion: datos.descripcion.trim(),
    monto:       Number(datos.monto),
    frecuencia:  datos.frecuencia,
    categoria,
    activo:      true,
    diaPago,
  };
}

/**
 * Calcula el monto del salario mínimo legal vigente con o sin subsidio de
 * transporte. Pura: lee las constantes legales exportadas.
 *
 * @param {boolean} conSubsidio - true si el usuario recibe auxilio de transporte.
 * @returns {{ smmlv: number, auxilio: number, total: number }}
 */
export function calcularSalarioMinimo(conSubsidio) {
  const auxilio = conSubsidio ? AUXILIO_TRANSPORTE : 0;
  return { smmlv: SMMLV, auxilio, total: SMMLV + auxilio };
}

/**
 * Convierte el salario mínimo (un ancla mensual: SMMLV + auxilio) al monto por
 * período de pago. El campo `monto` de un ingreso guarda el valor por período,
 * no el mensual: por eso Quincenal devuelve la mitad y Semanal una cuarta parte
 * aprox. Divide por _FACTOR_MENSUAL para que `monto × factor ≈ ancla mensual`,
 * consistente con estimarSalarioMensual. Frecuencias sin factor reconocido
 * (Bimestral, Anual, etc.) caen al valor mensual completo (factor 1).
 *
 * @param {boolean} conSubsidio - true si recibe auxilio de transporte.
 * @param {string}  frecuencia  - Frecuencia de pago ('Mensual', 'Quincenal', ...).
 * @returns {number} Monto por período en COP (redondeado a peso).
 */
export function montoSalarioMinimoPorPeriodo(conSubsidio, frecuencia) {
  const { total } = calcularSalarioMinimo(conSubsidio);
  const factor = _FACTOR_MENSUAL[frecuencia] ?? 1;
  return Math.round(total / factor);
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
    icono:             'gastos',
    cantidadCuentasGMF,
    gastosGravados,
    costoGMF,
  };
}

// ── DISTRIBUCIÓN ADAPTATIVA DEL INGRESO (Fase 3) ─────────────────

export const PRESETS_DISTRIBUCION = [
  { id: 'auto',     label: 'Automático', n: 0,  e: 0,  a: 0  },
  { id: '50-30-20', label: '50/30/20',   n: 50, e: 30, a: 20 },
  { id: '70-20-10', label: '70/20/10',   n: 70, e: 20, a: 10 },
  { id: '60-20-20', label: '60/20/20',   n: 60, e: 20, a: 20 },
];

/**
 * Valida una distribución de porcentajes creada por el usuario: los 3 valores
 * deben ser números finitos entre 0 y 100, y sumar exactamente 100.
 * Pura: no lee S, no toca el DOM.
 *
 * @param {{n:number, e:number, a:number}|null|undefined} d
 * @returns {boolean}
 */
export function esDistribucionPersonalizadaValida(d) {
  if (!d || typeof d !== 'object') return false;
  const { n, e, a } = d;
  if (![n, e, a].every(v => Number.isFinite(v) && v >= 0 && v <= 100)) return false;
  return n + e + a === 100;
}

/**
 * Calcula cuánto aportar por mes para llegar a tiempo a todas las metas
 * y apartados con fecha objetivo que aún tienen saldo pendiente.
 * Pura: recibe arrays planos, sin leer S ni el DOM.
 *
 * @param {Array<{montoObjetivo:number, montoActual:number, fechaLimite:string, completada:boolean}>} metas
 * @param {Array<{montoObjetivo:number, montoActual:number, fechaObjetivo:string|null, completado:boolean}>} apartados
 * @param {Date} [hoy]
 * @returns {number} Aporte mensual total necesario (COP, sin decimales).
 */
export function calcularAporteMensualObjetivos(metas = [], apartados = [], hoy = new Date()) {
  const tsHoy = hoy instanceof Date ? hoy.getTime() : Date.now();

  const candidatos = [
    ...metas
      .filter(m => !m.completada && m.fechaLimite)
      .map(m => ({
        faltante: Math.max(0, (Number(m.montoObjetivo) || 0) - (Number(m.montoActual) || 0)),
        fecha:    m.fechaLimite,
      })),
    ...apartados
      .filter(a => !a.completado && a.fechaObjetivo)
      .map(a => ({
        faltante: Math.max(0, (Number(a.montoObjetivo) || 0) - (Number(a.montoActual) || 0)),
        fecha:    a.fechaObjetivo,
      })),
  ];

  return candidatos.reduce((sum, { faltante, fecha }) => {
    if (faltante <= 0) return sum;
    const msRestantes = new Date(fecha).getTime() - tsHoy;
    if (msRestantes <= 0) return sum; // fecha ya pasó
    const mesesRestantes = Math.max(1, Math.round(msRestantes / (1000 * 60 * 60 * 24 * 30.44)));
    return sum + Math.ceil(faltante / mesesRestantes);
  }, 0);
}

// Constantes del modelo de pisos (ADR 013, MC.6a).
const _PISO_EV_PCT     = 10;  // % mínimo de estilo de vida (sostenibilidad)
const _HORIZONTE_FONDO = 12;  // meses para cerrar el fondo incompleto
const _BASE_AHORRO_PCT = 20;  // ahorro base sano cuando no hay prioridades activas

/**
 * Sugiere cómo distribuir el ingreso mensual en 3 grupos: Necesidades,
 * Estilo de vida y Ahorro. El modo 'auto' usa un modelo de pisos por prioridad
 * sobre los datos reales registrados (ADR 013, MC.6a).
 * Orientativo: nunca prescriptivo. Usa solo datos registrados en Finko.
 *
 * @param {number} ingresoMensual
 * @param {{
 *   gastosFijosMensuales?:    number,
 *   cuotasDeudaMensuales?:    number,
 *   faltanteFondo?:           number,
 *   aporteMensualObjetivos?:  number,
 *   sumaLimites?:             number,
 *   tieneDeudas?:             boolean,
 *   tieneFondoActivo?:        boolean,
 *   fondoCompleto?:           boolean,
 *   tieneInversiones?:        boolean,
 *   presetId?:                string,
 *   distribucionPersonalizada?: {n:number, e:number, a:number}|null,
 * }} [contexto]
 * @returns {{
 *   ingresoMensual:  number,
 *   pctFijos:        number,
 *   pctObligaciones: number,
 *   metodo:          string,
 *   razon:           string,
 *   alertas:         string[],
 *   ctas:            {label:string, seccion:string}[],
 *   split: {
 *     necesidades: {pct:number, monto:number, label:string},
 *     estiloVida:  {pct:number, monto:number, label:string},
 *     ahorro:      {pct:number, monto:number, label:string},
 *   },
 * } | null}
 */
export function sugerirDistribucionIngreso(ingresoMensual, {
  gastosFijosMensuales    = 0,
  cuotasDeudaMensuales    = 0,
  faltanteFondo           = 0,
  aporteMensualObjetivos  = 0,
  sumaLimites             = 0,
  tieneDeudas             = false,
  tieneFondoActivo        = false,
  fondoCompleto           = false,
  tieneInversiones        = false,
  presetId                = 'auto',
  distribucionPersonalizada = null,
} = {}) {
  if (!ingresoMensual || ingresoMensual <= 0) return null;

  const pctFijos = gastosFijosMensuales > 0
    ? Math.round((gastosFijosMensuales / ingresoMensual) * 100)
    : 0;

  const montoNec = (Number(gastosFijosMensuales) || 0) + (Number(cuotasDeudaMensuales) || 0);
  const pctObligaciones = montoNec > 0
    ? Math.min(100, Math.round(montoNec / ingresoMensual * 100))
    : 0;

  let necesidadesPct;
  let estiloVidaPct;
  let ahorroInvPct;
  let metodo;
  let razon;
  const alertas = [];
  const ctas    = [];

  const preset = presetId === 'personalizado'
    ? (esDistribucionPersonalizadaValida(distribucionPersonalizada)
        ? { label: 'Personalizada', ...distribucionPersonalizada }
        : null)
    : (presetId && presetId !== 'auto'
        ? PRESETS_DISTRIBUCION.find(p => p.id === presetId)
        : null);

  if (preset) {
    // ── Preset fijo o personalizado: aplica tal cual ──
    necesidadesPct = preset.n;
    estiloVidaPct  = preset.e;
    ahorroInvPct   = preset.a;
    metodo = preset.label;
    razon  = pctFijos > 0
      ? `Distribución ${preset.label} aplicada. Tus gastos fijos son el ${pctFijos}% de tus ingresos.`
      : `Distribución ${preset.label} aplicada.`;
    if (pctFijos > necesidadesPct) {
      const sujeto = presetId === 'personalizado' ? 'tu distribución' : 'el preset';
      alertas.push(`Tus gastos fijos (${pctFijos}%) superan lo asignado a necesidades (${necesidadesPct}%). Considera ajustar ${sujeto}.`);
    }
  } else {
    // ── Modo auto: modelo de pisos por prioridad (ADR 013, MC.6a) ──
    metodo = 'pisos';

    if (montoNec >= ingresoMensual) {
      // Caso extremo: obligaciones cubren todo el ingreso.
      necesidadesPct = 100;
      estiloVidaPct  = 0;
      ahorroInvPct   = 0;
      razon = `Tus obligaciones fijas (gastos en Calendario y cuotas de deudas) consumen la totalidad de tu ingreso registrado. Reducir compromisos es urgente.`;
      alertas.push(`Tus obligaciones (${pctObligaciones}%) consumen todo tu ingreso: no queda margen para ahorro ni estilo de vida. Revisa gastos fijos y deudas.`);
    } else {
      // Paso 2: ahorro ideal (prioridades en orden).
      let montoAhorroIdeal = 0;
      if (!fondoCompleto && faltanteFondo > 0) {
        montoAhorroIdeal += Math.ceil(faltanteFondo / _HORIZONTE_FONDO);
      }
      if (aporteMensualObjetivos > 0) {
        montoAhorroIdeal += aporteMensualObjetivos;
      }
      const tieneAhorroEspecifico = montoAhorroIdeal > 0;
      if (!tieneAhorroEspecifico) {
        montoAhorroIdeal = Math.round(ingresoMensual * _BASE_AHORRO_PCT / 100);
      }

      // Paso 3: estilo de vida residual con piso mínimo.
      // El piso cede ante Necesidades (piso duro) pero gana sobre el ahorro extra.
      const pisoEV = Math.round(ingresoMensual * _PISO_EV_PCT / 100);
      const disponibleParaAhorro = Math.max(0, ingresoMensual - montoNec - pisoEV);
      const montoAhorro = Math.max(0, Math.min(montoAhorroIdeal, disponibleParaAhorro));

      // Paso 4: convertir a pct, residuo de redondeo en estiloVida.
      necesidadesPct = Math.min(100, Math.round(montoNec    / ingresoMensual * 100));
      ahorroInvPct   = Math.min(100 - necesidadesPct, Math.round(montoAhorro / ingresoMensual * 100));
      estiloVidaPct  = 100 - necesidadesPct - ahorroInvPct;

      // Razón: refleja qué componentes influyeron.
      const partesRazon = [];
      if (pctObligaciones > 0) {
        partesRazon.push(`tus obligaciones son el ${pctObligaciones}% de tu ingreso`);
      }
      if (!fondoCompleto && faltanteFondo > 0) {
        partesRazon.push('tu fondo de emergencia aún no está completo');
      }
      if (aporteMensualObjetivos > 0) {
        partesRazon.push('tienes objetivos con fecha');
      }
      razon = partesRazon.length > 0
        ? `Calculamos tu distribución según tus datos: ${partesRazon.join(', ')}.`
        : 'Registra tus gastos fijos en Calendario y tus deudas en la sección Deudas para una recomendación a tu medida. Por ahora aplicamos una base saludable del 20% de ahorro.';

      // Alerta si las obligaciones dejan poco margen.
      if (pctObligaciones >= 80) {
        alertas.push(`Tus obligaciones representan el ${pctObligaciones}% de tu ingreso, dejando poco margen. Revisa si puedes reducir gastos fijos o deudas.`);
      }

      // Alerta informativa si los límites de gasto superan el Estilo de vida sugerido.
      const montoEV = Math.round(ingresoMensual * estiloVidaPct / 100);
      if (sumaLimites > 0 && sumaLimites > montoEV * 1.1) {
        alertas.push(`Tus límites de gasto suman más del presupuesto sugerido para Estilo de vida. Considera ajustar los límites o el preset.`);
      }
    }
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
    alertas.push('Tienes deudas activas: antes de reducir tu ahorro, intenta recortar primero tu presupuesto de estilo de vida.');
    ctas.push({ label: 'Ver estrategia de deudas', seccion: 'compromisos' });
  }

  const nMonto = Math.round(ingresoMensual * necesidadesPct / 100);
  const eMonto = Math.round(ingresoMensual * estiloVidaPct  / 100);
  const aMonto = Math.round(ingresoMensual * ahorroInvPct   / 100);

  return {
    ingresoMensual,
    pctFijos,
    pctObligaciones,
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

// ── DISTRIBUIR MI INGRESO: grupo Ahorro (ADR 012, MC.4a) ─────────

/**
 * Arma el plan por defecto para repartir el grupo Ahorro de un ingreso entre
 * sus destinos fondeables: fondo de emergencia, metas y apartados.
 *
 * Default teachable "fondo primero": si el fondo está activo y aún no se
 * completó, se le sugiere todo el presupuesto de ahorro (el usuario redistribuye
 * a su gusto en las filas editables). Metas y apartados empiezan en 0.
 *
 * Pura: recibe datos planos (sin S, sin DOM, sin importar otros dominios). El
 * estado de "completado" del fondo se pasa ya resuelto (la vista lo lee del flag
 * persistido `S.ahorro.fondoEmergencia.completado`).
 *
 * @param {{
 *   budget: number,
 *   fondo: { activo: boolean, completado: boolean } | null,
 *   metas?: Array<{ id: string, nombre: string }>,
 *   apartados?: Array<{ id: string, nombre: string }>,
 * }} args
 * @returns {Array<{ tipo: 'fondo'|'meta'|'apartado', id: string|null, nombre: string, monto: number }>}
 */
export function construirPlanAhorro({ budget, fondo, metas = [], apartados = [] }) {
  const b = Math.max(0, Math.round(Number(budget) || 0));
  const destinos = [];

  if (fondo && fondo.activo) {
    destinos.push({
      tipo:   'fondo',
      id:     null,
      nombre: 'Fondo de emergencia',
      monto:  fondo.completado ? 0 : b,
    });
  }
  for (const m of metas)     destinos.push({ tipo: 'meta',     id: m.id, nombre: m.nombre, monto: 0 });
  for (const a of apartados) destinos.push({ tipo: 'apartado', id: a.id, nombre: a.nombre, monto: 0 });

  return destinos;
}

/**
 * Resume un plan de distribución frente al monto total del ingreso.
 *
 * @param {number} montoIngreso - total que se está repartiendo.
 * @param {Array<{ monto: number }>} destinos - filas del plan (cualquier grupo).
 * @returns {{ asignado: number, sinAsignar: number, excede: boolean }}
 *   asignado: suma de los montos. sinAsignar: lo que queda del ingreso (>= 0).
 *   excede: true si se asignó más que el ingreso (no se puede confirmar).
 */
export function resumirPlanDistribucion(montoIngreso, destinos) {
  const asignado = (destinos ?? []).reduce((s, d) => s + (Number(d.monto) || 0), 0);
  const m = Number(montoIngreso) || 0;
  return {
    asignado,
    sinAsignar: Math.max(0, m - asignado),
    excede:     asignado > m,
  };
}

/**
 * Tasa efectiva anual (decimal) de una deuda según su `tasaUnidad`.
 * Replicado de compromisos/logic.js (`tasaEADe` / `tasaMensualToEA`) para no
 * crear dependencia cruzada entre dominios (ADN #10). Mantener en sync si la
 * fórmula cambia allá.
 *
 * @param {{ tasa?: number, tasaUnidad?: string }} c
 * @returns {number}
 */
function _tasaEADeuda(c) {
  const t = Number(c?.tasa);
  if (!Number.isFinite(t) || t < 0) return 0;
  return c?.tasaUnidad === 'mensual' ? Math.pow(1 + t, 12) - 1 : t;
}

/**
 * Arma las filas de deudas fondeables para "Distribuir mi ingreso" (MC.4b),
 * ordenadas por prioridad de pago estilo Avalancha (mayor interés efectivo
 * primero, que es la estrategia óptima recomendada). Empate por menor saldo.
 *
 * Cada fila arranca en monto 0 (el usuario decide cuánto abonar). `saldoTotal`
 * se incluye para mostrarlo y para topar el abono (no se paga más de lo que se
 * debe). Pura: recibe las deudas y no lee S ni el DOM.
 *
 * @param {{ deudas?: Array<{id:string, descripcion?:string, saldoTotal?:number, tasa?:number, tasaUnidad?:string}> }} args
 * @returns {Array<{ tipo:'deuda', id:string, nombre:string, monto:number, saldoTotal:number, tasaEA:number }>}
 */
export function construirPlanDeudas({ deudas = [] }) {
  return deudas
    .map(d => ({
      tipo:       'deuda',
      id:         d.id,
      nombre:     d.descripcion ?? d.nombre ?? 'Deuda',
      monto:      0,
      saldoTotal: Number(d.saldoTotal) || 0,
      tasaEA:     _tasaEADeuda(d),
    }))
    .sort((a, b) => (b.tasaEA - a.tasaEA) || (a.saldoTotal - b.saldoTotal));
}

/**
 * Arma las filas de inversiones fondeables para "Distribuir mi ingreso" (MC.4e).
 * Un aporte incrementa el `monto` (capital) del holding existente; aquí cada fila
 * arranca en 0 (el usuario decide cuánto aportar) y lleva el capital actual
 * (`invertido`) solo como contexto. Ordenadas por posición de mayor a menor.
 * Pura: recibe las inversiones y no lee S ni el DOM.
 *
 * @param {{ inversiones?: Array<{id:string, nombre?:string, tipo?:string, monto?:number}> }} args
 * @returns {Array<{ tipo:'inversion', id:string, nombre:string, monto:number, invertido:number }>}
 */
export function construirPlanInversiones({ inversiones = [] }) {
  return (Array.isArray(inversiones) ? inversiones : [])
    .map(inv => ({
      tipo:      'inversion',
      id:        inv.id,
      nombre:    inv.nombre ?? 'Inversión',
      monto:     0,
      invertido: Number(inv.monto) || 0,
    }))
    .sort((a, b) => b.invertido - a.invertido);
}
