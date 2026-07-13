/**
 * tesoreria/logic/ingresos.js - funciones puras de ingresos (recurrentes y puntuales):
 * validacion, salario minimo, fechas de cobro y prima de servicios.
 *
 * Sub-modulo de tesoreria/logic.js (barrel). Reglas de la capa:
 * - Sin DOM. Sin S directo. Reciben datos, devuelven datos.
 * - Testeable en Node/Vitest sin ningun mock de navegador.
 */

import { FRECUENCIAS, CATEGORIAS_INGRESO, SMMLV, AUXILIO_TRANSPORTE } from '../../../core/constants.js';

// Tabla de conversión a mensual. Local al dominio (ADN #10); compartida con logic/distribucion.js.
// Frecuencias de baja periodicidad (Bimestral, Trimestral, Semestral, Anual,
// 'Única vez') se excluyen intencionalmente: no representan flujo mensual recurrente.
export const FACTOR_MENSUAL = {
  'Diario':    30,
  'Semanal':   4.33,
  'Quincenal': 2,
  'Mensual':   1,
};

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

// `estimarSalarioMensual` se movió a infra/financiero.js (D.15d): con
// presupuesto y compromisos como consumidores además de tesorería, su hogar
// único sin dueño de dominio es infra. El barrel tesoreria/logic.js la
// re-exporta desde ahí para no romper a los consumidores existentes.

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
 * @param {import('../../../core/state.js').Ingreso[]} ingresos
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
export function isoFecha(d) {
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

  return ultimo ? isoFecha(ultimo) : null;
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
  if (!Number.isFinite(monto) || monto <= 0) {
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
 * @returns {Omit<import('../../../core/state.js').Ingreso, 'id' | 'fechaCreacion'>}
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
 * aprox. Divide por FACTOR_MENSUAL para que `monto × factor ≈ ancla mensual`,
 * consistente con estimarSalarioMensual. Frecuencias sin factor reconocido
 * (Bimestral, Anual, etc.) caen al valor mensual completo (factor 1).
 *
 * @param {boolean} conSubsidio - true si recibe auxilio de transporte.
 * @param {string}  frecuencia  - Frecuencia de pago ('Mensual', 'Quincenal', ...).
 * @returns {number} Monto por período en COP (redondeado a peso).
 */
export function montoSalarioMinimoPorPeriodo(conSubsidio, frecuencia) {
  const { total } = calcularSalarioMinimo(conSubsidio);
  const factor = FACTOR_MENSUAL[frecuencia] ?? 1;
  return Math.round(total / factor);
}

// ── VALIDACIÓN INGRESOS PUNTUALES (NAV.A1) ───────────────────────

/**
 * Valida los datos del formulario de ingreso puntual (dinero que entra una
 * sola vez). A diferencia del ingreso recurrente, no tiene frecuencia ni día de
 * pago: es un evento con monto, cuenta destino y fecha. La descripción y la
 * categoría son opcionales.
 *
 * @param {Record<string, string>} datos
 * @returns {string[]} Mensajes de error (vacío = válido).
 */
export function validarIngresoPuntual(datos) {
  const errores = [];
  const monto = Number(datos.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    errores.push('El monto debe ser un número mayor a 0.');
  }
  if (!datos.cuentaId?.trim()) {
    errores.push('Debes elegir la cuenta donde recibiste el dinero.');
  }
  if (!datos.fecha?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) {
    errores.push('La fecha es obligatoria.');
  }
  if (datos.categoria && !CATEGORIAS_INGRESO.includes(datos.categoria)) {
    errores.push('La categoría seleccionada no es válida.');
  }
  return errores;
}

/**
 * Convierte los datos crudos del formulario al shape de S.ingresosPuntuales[].
 * Asume que los datos ya pasaron `validarIngresoPuntual()`. Si la descripción
 * viene vacía, se autogenera desde la categoría (o "Ingreso" como fallback):
 * un ingreso puntual debe poder registrarse en segundos, sin obligar a escribir.
 *
 * @param {Record<string, string>} datos
 * @returns {Omit<import('../../../core/state.js').IngresoPuntual, 'id' | 'fechaCreacion'>}
 */
export function normalizarIngresoPuntual(datos) {
  const categoria = datos.categoria && CATEGORIAS_INGRESO.includes(datos.categoria)
    ? datos.categoria
    : null;
  const descripcion = datos.descripcion?.trim() || categoria || 'Ingreso';
  return {
    descripcion,
    monto:     Number(datos.monto),
    categoria,
    cuentaId:  datos.cuentaId.trim(),
    fecha:     datos.fecha,
  };
}
