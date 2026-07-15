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
 * Consumidores: Agenda (`eventosDelMes`/`eventosIngresosDelMes` delegan aquí
 * la regla de frecuencias, ya no la duplican). Más adelante: la Distribución
 * v2 (`obligacionesYAportesDelCobro`, MC.13c) y los pagos automáticos (PA.1,
 * catch-up de vencidas). La mitad B (frecuencia de ingresos + aporte por
 * período) llega en MC.13b.
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
