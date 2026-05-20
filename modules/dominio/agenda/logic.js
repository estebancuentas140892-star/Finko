/**
 * agenda/logic.js - funciones puras del dominio Agenda.
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 *
 * La Agenda es una vista calendario sobre S.compromisos (no agrega datos
 * nuevos). Mapea cada compromiso activo a los días del mes en que cae,
 * respetando su frecuencia (Mensual, Quincenal, Bimestral, etc).
 */

// ── HELPERS ──────────────────────────────────────────────────────

const _RX_FECHA = /^(\d{4})-(\d{2})-(\d{2})/;

/** Devuelve el número de días del mes (1-31). month es 0-indexed (0-11). */
function _diasDelMes(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/** Parsea 'YYYY-MM-DD' a {year, month0Idx, day}. null si no matchea. */
function _parseFechaISO(s) {
  if (typeof s !== 'string') return null;
  const m = _RX_FECHA.exec(s);
  if (!m) return null;
  return { year: +m[1], month: +m[2] - 1, day: +m[3] };
}

/**
 * Para frecuencias periódicas largas (Bimestral, Trimestral, Semestral, Anual)
 * el compromiso aparece sólo en los meses que caen dentro del ciclo desde
 * `fechaCreacion`. Sin fechaCreacion, mostramos siempre (no perdemos al usuario).
 */
function _caeEnCiclo(compromiso, year, month, periodoMeses) {
  const fc = _parseFechaISO(compromiso.fechaCreacion);
  if (!fc) return true;
  const mesesDesde = (year - fc.year) * 12 + (month - fc.month);
  if (mesesDesde < 0) return false;
  return mesesDesde % periodoMeses === 0;
}

/**
 * Días del mes en los que aparece un compromiso, según su frecuencia.
 * Asume diaPago válido (1-31). Devuelve siempre días dentro del rango del mes.
 */
function _diasParaCompromiso(c, year, month, diasEnMes) {
  const diaPago = Math.min(Number(c.diaPago), diasEnMes);
  const freq    = c.frecuencia;

  switch (freq) {
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
      return _caeEnCiclo(c, year, month, 2) ? [diaPago] : [];

    case 'Trimestral':
      return _caeEnCiclo(c, year, month, 3) ? [diaPago] : [];

    case 'Semestral':
      return _caeEnCiclo(c, year, month, 6) ? [diaPago] : [];

    case 'Anual':
      return _caeEnCiclo(c, year, month, 12) ? [diaPago] : [];

    case 'Única vez': {
      const fc = _parseFechaISO(c.fechaCreacion);
      if (!fc) return [];
      return (fc.year === year && fc.month === month) ? [diaPago] : [];
    }

    default:
      // Frecuencia desconocida: comportamiento conservador (cae mensual).
      return [diaPago];
  }
}

// ── API PÚBLICA ──────────────────────────────────────────────────

/**
 * Mapea compromisos a los días del mes en que caen.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @param {number} year   Año completo (ej. 2026).
 * @param {number} month  Mes 0-indexed (0=Enero, 11=Diciembre). Match con Date.
 * @returns {Record<number, Array<import('../../core/state.js').Compromiso & {dia:number}>>}
 *   Mapa { dia: [compromiso, ...] }. Sólo incluye días que tienen al menos un evento.
 */
export function eventosDelMes(compromisos, year, month) {
  if (!Array.isArray(compromisos)) return {};
  if (!Number.isInteger(year))    return {};
  if (!Number.isInteger(month) || month < 0 || month > 11) return {};

  const diasEnMes = _diasDelMes(year, month);
  /** @type {Record<number, any[]>} */
  const eventos = {};

  for (const c of compromisos) {
    if (!c || typeof c !== 'object') continue;
    if (c.activo === false) continue;

    const diaPagoRaw = Number(c.diaPago);
    if (!Number.isInteger(diaPagoRaw) || diaPagoRaw < 1 || diaPagoRaw > 31) continue;

    const dias = _diasParaCompromiso(c, year, month, diasEnMes);
    for (const d of dias) {
      if (!eventos[d]) eventos[d] = [];
      eventos[d].push({ ...c, dia: d });
    }
  }

  return eventos;
}

/**
 * Cuenta total de eventos en el mes (suma de longitudes de cada día).
 * Útil para badges o resúmenes en la cabecera del calendario.
 *
 * @param {ReturnType<typeof eventosDelMes>} eventos
 * @returns {number}
 */
export function totalEventosDelMes(eventos) {
  if (!eventos || typeof eventos !== 'object') return 0;
  return Object.values(eventos).reduce((acc, arr) => acc + (arr?.length ?? 0), 0);
}
