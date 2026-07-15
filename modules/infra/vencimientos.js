/**
 * infra/vencimientos.js - motor compartido de vencimientos (MC.13a, ADR 041).
 *
 * Mitad A del motor: ocurrencias de una obligación o ingreso según su
 * frecuencia, y la ventana de un cobro. Puro: sin DOM, sin S, sin importar
 * dominios (es infra, la consumen todos; ADN #10 intacto, mismo hogar que
 * `estimarSalarioMensual` en infra/financiero.js).
 *
 * Un "item" es cualquier objeto con la forma relevante de frecuencia:
 * `{ frecuencia, diaPago, fechaCreacion? }`. Compromisos e ingresos la
 * comparten, por eso el motor no distingue dominio.
 *
 * Mitad B (MC.13b): frecuencia real de cobro del usuario y cuánto toca aportar
 * por período. Es la copia única de lo que vivía duplicado en `metas/logic.js`
 * y `apartados/logic.js` (cada uno lo comentaba como "duplicado intencional":
 * ADN #10 les impedía importarse entre sí, pero ambos pueden importar infra).
 *
 * Consumidores: Agenda (`eventosDelMes`/`eventosIngresosDelMes` delegan aquí
 * la regla de frecuencias, ya no la duplican), Metas (`calcularAhorroPorPeriodo`)
 * y Apartados (`calcularAporteSugerido`), que ahora son envoltorios delgados
 * sobre la mitad B. Más adelante: la Distribución v2
 * (`obligacionesYAportesDelCobro`, MC.13c), el fondo de emergencia (AH.5) y los
 * pagos automáticos (PA.1, catch-up de vencidas).
 */

const _RX_FECHA = /^(\d{4})-(\d{2})-(\d{2})/;

/** Número de días del mes (1-31). month es 0-indexed (0-11). */
function _diasDelMes(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/** Parsea 'YYYY-MM-DD' a {year, month (0-idx), day}. null si no matchea. */
function _parseFechaISO(s) {
  if (typeof s !== 'string') return null;
  const m = _RX_FECHA.exec(s);
  if (!m) return null;
  return { year: +m[1], month: +m[2] - 1, day: +m[3] };
}

/** Formatea un Date (medianoche local) a 'YYYY-MM-DD'. */
function _iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Suma n días a un Date (n puede ser negativo). JS normaliza el desbordamiento. */
function _addDias(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/**
 * Suma n meses a un Date, clampeando el día al último del mes destino
 * (31 ene + 1 mes = 28/29 feb), mismo criterio que `diasParaProximoPago`.
 */
function _addMeses(d, n) {
  const day    = d.getDate();
  const base   = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const ultimo = _diasDelMes(base.getFullYear(), base.getMonth());
  return new Date(base.getFullYear(), base.getMonth(), Math.min(day, ultimo));
}

/**
 * Para frecuencias periódicas largas (Bimestral, Trimestral, Semestral, Anual)
 * el item aparece sólo en los meses que caen dentro del ciclo desde
 * `fechaCreacion`. Sin fechaCreacion, cae siempre (no perdemos al usuario).
 */
function _caeEnCiclo(item, year, month, periodoMeses) {
  const fc = _parseFechaISO(item.fechaCreacion);
  if (!fc) return true;
  const mesesDesde = (year - fc.year) * 12 + (month - fc.month);
  if (mesesDesde < 0) return false;
  return mesesDesde % periodoMeses === 0;
}

/**
 * Días del mes (1-31) en que un item cae, según su frecuencia. Devuelve
 * siempre días dentro del rango del mes. `[]` si el item no tiene un
 * `diaPago` válido (1-31) o el mes/año son inválidos: el caller no necesita
 * un guard propio.
 *
 * Es la primitiva que centraliza la regla de frecuencias (antes duplicada en
 * `_diasParaCompromiso` de agenda/logic.js). Agenda la consume; su
 * `eventosDelMes` sólo agrega el filtro de dominio (activo) y el mapeo a días.
 *
 * @param {{frecuencia?:string, diaPago?:number, fechaCreacion?:string}} item
 * @param {number} year   Año completo (ej. 2026).
 * @param {number} month  Mes 0-indexed (0=Enero, 11=Diciembre). Match con Date.
 * @returns {number[]} Días del mes, en orden ascendente.
 */
export function ocurrenciasEnMes(item, year, month) {
  if (!item || typeof item !== 'object') return [];
  if (!Number.isInteger(year)) return [];
  if (!Number.isInteger(month) || month < 0 || month > 11) return [];

  const diaPagoRaw = Number(item.diaPago);
  if (!Number.isInteger(diaPagoRaw) || diaPagoRaw < 1 || diaPagoRaw > 31) return [];

  const diasEnMes = _diasDelMes(year, month);
  const diaPago   = Math.min(diaPagoRaw, diasEnMes);

  switch (item.frecuencia) {
    case 'Mensual':
      return [diaPago];

    case 'Quincenal': {
      const d2 = diaPago + 15;
      return d2 <= diasEnMes ? [diaPago, d2] : [diaPago];
    }

    case 'Semanal': {
      const out = [];
      for (let d = diaPago; d <= diasEnMes; d += 7) out.push(d);
      return out;
    }

    case 'Diario': {
      const out = [];
      for (let d = 1; d <= diasEnMes; d++) out.push(d);
      return out;
    }

    case 'Bimestral':
      return _caeEnCiclo(item, year, month, 2) ? [diaPago] : [];

    case 'Trimestral':
      return _caeEnCiclo(item, year, month, 3) ? [diaPago] : [];

    case 'Semestral':
      return _caeEnCiclo(item, year, month, 6) ? [diaPago] : [];

    case 'Anual':
      return _caeEnCiclo(item, year, month, 12) ? [diaPago] : [];

    case 'Única vez': {
      const fc = _parseFechaISO(item.fechaCreacion);
      if (!fc) return [];
      return (fc.year === year && fc.month === month) ? [diaPago] : [];
    }

    default:
      // Frecuencia desconocida: comportamiento conservador (cae mensual).
      return [diaPago];
  }
}

/**
 * Fechas ISO ('YYYY-MM-DD') en que un item cae dentro del rango
 * `[inicioISO, finISO]` (ambos inclusive), según su frecuencia. Generaliza
 * `ocurrenciasEnMes` de un mes a un rango arbitrario que puede cruzar meses
 * (una quincena del 25 de julio al 9 de agosto). Es la base de la ventana de
 * cobro de la Distribución v2 (MC.13c): "qué obligaciones caen en la ventana
 * de este cobro".
 *
 * @param {{frecuencia?:string, diaPago?:number, fechaCreacion?:string}} item
 * @param {string} inicioISO 'YYYY-MM-DD' (inclusive).
 * @param {string} finISO    'YYYY-MM-DD' (inclusive).
 * @returns {string[]} Fechas ISO en orden ascendente. `[]` si el rango es
 *   inválido (fin antes de inicio, o fechas no parseables).
 */
export function ocurrenciasEnRango(item, inicioISO, finISO) {
  const ini = _parseFechaISO(inicioISO);
  const fin = _parseFechaISO(finISO);
  if (!item || typeof item !== 'object' || !ini || !fin) return [];

  const inicioDate = new Date(ini.year, ini.month, ini.day);
  const finDate    = new Date(fin.year, fin.month, fin.day);
  if (finDate < inicioDate) return [];

  const out = [];
  let y = ini.year;
  let m = ini.month;
  // Recorre mes a mes desde el inicio hasta el mes del fin (inclusive).
  while (y < fin.year || (y === fin.year && m <= fin.month)) {
    for (const d of ocurrenciasEnMes(item, y, m)) {
      const fecha = new Date(y, m, d);
      if (fecha >= inicioDate && fecha <= finDate) out.push(_iso(fecha));
    }
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return out;
}

/**
 * Ventana de un cobro: desde el día del cobro hasta el día anterior al
 * siguiente cobro de la misma frecuencia. Responde "hasta cuándo tiene que
 * durar este dinero" para la Distribución v2. A diferencia de
 * `ultimoPagoHasta`/`diasParaProximoPago` (tesoreria/logic/ingresos.js, sólo
 * Mensual y Quincenal), cubre todas las frecuencias.
 *
 * Longitud de la ventana: Diario un día; Semanal siete; Quincenal quince;
 * Mensual el mes calendario (día equivalente del mes siguiente menos uno, así
 * respeta meses de distinta duración). Bimestral/Trimestral/Semestral/Anual
 * usan su número de meses. Cualquier otra (Variable, Única vez, desconocida)
 * cae a un mes, criterio conservador.
 *
 * @param {string} frecuencia
 * @param {string} fechaCobroISO 'YYYY-MM-DD' del cobro.
 * @returns {{ inicioISO:string, finISO:string } | null} null si la fecha no
 *   es parseable.
 */
export function ventanaDelCobro(frecuencia, fechaCobroISO) {
  const p = _parseFechaISO(fechaCobroISO);
  if (!p) return null;

  const inicio = new Date(p.year, p.month, p.day);
  let fin;
  switch (frecuencia) {
    case 'Diario':     fin = inicio;                              break;
    case 'Semanal':    fin = _addDias(inicio, 6);                 break;
    case 'Quincenal':  fin = _addDias(inicio, 14);                break;
    case 'Mensual':    fin = _addDias(_addMeses(inicio, 1), -1);  break;
    case 'Bimestral':  fin = _addDias(_addMeses(inicio, 2), -1);  break;
    case 'Trimestral': fin = _addDias(_addMeses(inicio, 3), -1);  break;
    case 'Semestral':  fin = _addDias(_addMeses(inicio, 6), -1);  break;
    case 'Anual':      fin = _addDias(_addMeses(inicio, 12), -1); break;
    default:           fin = _addDias(_addMeses(inicio, 1), -1);  break;
  }
  return { inicioISO: _iso(inicio), finISO: _iso(fin) };
}

// ── MITAD B: APORTES POR PERÍODO (MC.13b) ────────────────────────

/**
 * Frecuencias con sentido como "cada cuánto aporto", alineadas a la frecuencia
 * con la que el usuario cobra. Subconjunto de FRECUENCIAS (core/constants.js):
 * las más largas (Bimestral en adelante) no son ritmos de aporte, se planifican
 * al mes. Copia única: Metas la re-exporta como FRECUENCIAS_AHORRO y Apartados
 * como FRECUENCIAS_APORTE, que era el mismo array escrito dos veces.
 */
export const FRECUENCIAS_APORTE = ['Diario', 'Semanal', 'Quincenal', 'Mensual'];

/** Mapeo de FRECUENCIAS (core) → FRECUENCIAS_APORTE; las más largas caen a 'Mensual'. */
const _MAPA_FRECUENCIA_A_APORTE = {
  Diario:     'Diario',
  Semanal:    'Semanal',
  Quincenal:  'Quincenal',
  Mensual:    'Mensual',
  Bimestral:  'Mensual',
  Trimestral: 'Mensual',
  Semestral:  'Mensual',
  Anual:      'Mensual',
};

/** Días calendario que dura cada período de aporte (promedio). */
const _DIAS_POR_PERIODO = {
  Diario:    1,
  Semanal:   7,
  Quincenal: 15,
  Mensual:   30,
};

/**
 * Date a medianoche local desde 'YYYY-MM-DD', o null si la fecha no existe.
 * Más estricto que `_parseFechaISO`: rechaza el desbordamiento silencioso de
 * Date ('2026-13-45' no se convierte en una fecha de 2027).
 */
function _fechaDesdeISO(s) {
  const p = _parseFechaISO(s);
  if (!p) return null;
  const d = new Date(p.year, p.month, p.day);
  if (d.getFullYear() !== p.year || d.getMonth() !== p.month || d.getDate() !== p.day) return null;
  return d;
}

/**
 * Días calendario entre dos fechas ISO (negativo si `hastaISO` ya pasó).
 * null si alguna no es una fecha real. Ambas se leen a medianoche local, así
 * que la diferencia es un número entero de días en cualquier zona horaria.
 */
function _diasEntre(desdeISO, hastaISO) {
  const desde = _fechaDesdeISO(desdeISO);
  const hasta = _fechaDesdeISO(hastaISO);
  if (!desde || !hasta) return null;
  return Math.round((hasta - desde) / 86_400_000);
}

/**
 * Normaliza una frecuencia cualquiera a una de FRECUENCIAS_APORTE.
 * Lectura defensiva: lo desconocido cae a 'Mensual'.
 * @param {string} frecuencia
 * @returns {string} Una de FRECUENCIAS_APORTE.
 */
export function normalizarFrecuenciaAporte(frecuencia) {
  return _MAPA_FRECUENCIA_A_APORTE[frecuencia] ?? 'Mensual';
}

/**
 * Días que dura un período de la frecuencia dada (promedio).
 * @param {string} frecuencia - una de FRECUENCIAS_APORTE; otra cae a 'Mensual'.
 * @returns {number}
 */
export function diasPorPeriodo(frecuencia) {
  return _DIAS_POR_PERIODO[frecuencia] ?? _DIAS_POR_PERIODO.Mensual;
}

/**
 * Etiqueta legible del período, para el copy de la UI.
 * @param {string} frecuencia - una de FRECUENCIAS_APORTE.
 * @returns {string} ej. "por quincena", "al mes".
 */
export function etiquetaPeriodo(frecuencia) {
  switch (frecuencia) {
    case 'Diario':    return 'por día';
    case 'Semanal':   return 'por semana';
    case 'Quincenal': return 'por quincena';
    case 'Mensual':   return 'al mes';
    default:          return 'al mes';
  }
}

/**
 * Frecuencia real con la que cobra el usuario: la más común entre sus ingresos
 * activos, mapeada a una de FRECUENCIAS_APORTE. Sin ingresos activos devuelve
 * 'Mensual' (el supuesto más seguro y el más común en Colombia).
 *
 * `ingresos` se inyecta (no se lee S ni se importa tesorería): infra no conoce
 * dominios. Es la respuesta a "cada cuánto entra dinero", de la que cuelgan la
 * cuota por período de Metas/Apartados/fondo y la ventana de cobro de la
 * Distribución v2.
 *
 * @param {{frecuencia?:string, activo?:boolean}[]} ingresos
 * @returns {string} Una de FRECUENCIAS_APORTE.
 */
export function frecuenciaPrincipalIngresos(ingresos) {
  const activos = (ingresos ?? []).filter(i => i.activo !== false);
  if (activos.length === 0) return 'Mensual';

  const conteo = {};
  for (const i of activos) {
    const f = normalizarFrecuenciaAporte(i.frecuencia);
    conteo[f] = (conteo[f] ?? 0) + 1;
  }

  // Más frecuente primero; en empate, la de mayor granularidad (índice menor).
  return Object.entries(conteo)
    .sort((a, b) => b[1] - a[1] || FRECUENCIAS_APORTE.indexOf(a[0]) - FRECUENCIAS_APORTE.indexOf(b[0]))
    .at(0)?.[0] ?? 'Mensual';
}

/**
 * Cuánto aportar por período para reunir `faltante` antes de `fechaObjetivoISO`,
 * repartido entre los períodos de la frecuencia con la que el usuario cobra (no
 * entre días sueltos ni entre meses): "aparta $30.000 por quincena".
 *
 * Copia única de lo que calculaban `calcularAhorroPorPeriodo` (Metas) y
 * `calcularAporteSugerido` (Apartados), hoy envoltorios de esta función.
 * En MC.13c la consumen también la cuota del período del asistente de
 * distribución (punto 21 del brief) y el fondo de emergencia (AH.5).
 *
 * Devuelve `null` cuando no hay ritmo que sugerir: ya está cubierto
 * (`faltante` <= 0), no hay plazo, la fecha no es real, o el plazo ya venció.
 *
 * @param {number} faltante         Lo que falta por reunir (COP).
 * @param {string} fechaObjetivoISO 'YYYY-MM-DD' en que se necesita el dinero.
 * @param {string} frecuencia       Frecuencia de cobro; se normaliza a FRECUENCIAS_APORTE.
 * @param {string} hoyISO           'YYYY-MM-DD' de referencia (inyectable: tests deterministas).
 * @returns {{
 *   montoPorPeriodo: number,
 *   numPeriodos: number,
 *   frecuencia: string,
 *   etiqueta: string,
 *   dias: number,
 * } | null}
 */
export function aportePorPeriodo(faltante, fechaObjetivoISO, frecuencia, hoyISO) {
  const monto = Number(faltante);
  if (!Number.isFinite(monto) || monto <= 0) return null;

  const dias = _diasEntre(hoyISO, fechaObjetivoISO);
  if (dias === null || dias <= 0) return null;

  const frec = FRECUENCIAS_APORTE.includes(frecuencia) ? frecuencia : 'Mensual';

  const numPeriodos     = Math.max(1, Math.ceil(dias / diasPorPeriodo(frec)));
  const montoPorPeriodo = Math.ceil(monto / numPeriodos);

  return {
    montoPorPeriodo,
    numPeriodos,
    frecuencia: frec,
    etiqueta: etiquetaPeriodo(frec),
    dias,
  };
}
