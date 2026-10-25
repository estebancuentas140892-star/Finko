/**
 * infra/mesada.js - la mesada y el premio por ahorrar del niño, sin DOM
 * (APR.3e, ADR 093 D2 a D4).
 *
 * La mesada la fija el tutor y se anota cuando él la marca "Entregada": un
 * solo hecho con dos consecuencias (091 R-HF1), un gasto suyo en Familia y la
 * entrada a los frascos del niño. El premio suma cada mes una parte de lo
 * que el niño guardó todo el mes. Lo leen Ajustes (el tutor) y la alcancía
 * del niño: como ningún dominio importa a otro (ADN 10), vive acá.
 */

import { saldosFrascos } from './perfiles.js';

/** Cada cuánto llega la mesada (D2). */
export const FRECUENCIAS_MESADA = Object.freeze({
  semanal: 'Cada semana',
  quincenal: 'Cada 15 días',
  mensual: 'Cada mes',
});

/** Días de la semana, domingo = 0, como `Date#getUTCDay()`. */
export const DIAS_SEMANA = Object.freeze(['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']);

/** Las tres tasas del premio (D4): cuánto suma por cada cuánto guardado. */
export const TASAS_PREMIO = Object.freeze({
  '1x20': { suma: 1, por: 20, texto: '$1 por cada $20' },
  '1x10': { suma: 1, por: 10, texto: '$1 por cada $10' },
  '2x10': { suma: 2, por: 10, texto: '$2 por cada $10' },
});

/** "cada sábado", "cada 15 días, el sábado", "cada mes, el día 5". */
export function textoFrecuencia(mesada) {
  if (!mesada) return '';
  if (mesada.frecuencia === 'mensual') return `cada mes, el día ${mesada.dia}`;
  const dia = DIAS_SEMANA[mesada.dia] ?? '';
  return mesada.frecuencia === 'quincenal' ? `cada 15 días, el ${dia}` : `cada ${dia}`;
}

/** Tasa del premio por defecto (D4). */
export const TASA_POR_DEFECTO = '1x10';

const _d = (iso) => new Date(`${iso}T12:00:00Z`);
const _iso = (d) => d.toISOString().slice(0, 10);
const _sumar = (iso, dias) => {
  const d = _d(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return _iso(d);
};

/**
 * Reparto por defecto (D2): la mitad a Ahorrar, un décimo a Compartir y el
 * resto a Gastar, en cientos redondos. $20.000 → $10.000, $8.000 y $2.000.
 *
 * @param {number} monto
 * @returns {{ ahorrar: number, gastar: number, compartir: number }}
 */
export function repartoPorDefecto(monto) {
  const m = Math.max(0, Math.round(Number(monto) || 0));
  const ahorrar = Math.round(m * 0.5 / 100) * 100;
  const compartir = Math.round(m * 0.1 / 100) * 100;
  return { ahorrar, gastar: m - ahorrar - compartir, compartir };
}

/**
 * Valida la mesada que fija el tutor. Mensajes en la voz del adulto (ADN 11).
 *
 * @param {{ monto?: number, frecuencia?: string, dia?: number, reparto?: Record<string, number>, anotarGasto?: boolean, cuentaId?: string|null }} m
 * @returns {string[]}
 */
export function validarMesada(m) {
  const errores = [];
  const monto = Number(m.monto);
  if (!Number.isInteger(monto) || monto <= 0) errores.push('Escribe cuánto le das.');
  if (!Object.hasOwn(FRECUENCIAS_MESADA, m.frecuencia ?? '')) errores.push('Elige cada cuánto se la das.');
  const dia = Number(m.dia);
  const diaValido = m.frecuencia === 'mensual' ? dia >= 1 && dia <= 28 : dia >= 0 && dia <= 6;
  if (!Number.isInteger(dia) || !diaValido) errores.push('Elige qué día se la das.');
  const r = m.reparto ?? {};
  const suma = ['ahorrar', 'gastar', 'compartir'].reduce((t, k) => t + (Number(r[k]) || 0), 0);
  if (['ahorrar', 'gastar', 'compartir'].some(k => !(Number(r[k]) >= 0))) errores.push('El reparto no puede tener montos negativos.');
  else if (monto > 0 && suma !== monto) errores.push(`El reparto suma ${suma.toLocaleString('es-CO')} y la mesada es ${monto.toLocaleString('es-CO')}: tienen que coincidir.`);
  if (m.anotarGasto && !m.cuentaId) errores.push('Elige de qué cuenta sale la mesada para anotarla en tus gastos.');
  return errores;
}

/**
 * ¿Toca mesada este día? Semanal: el día de la semana elegido. Quincenal:
 * ese día de la semana, cada 14 días desde el primero que cae en `desde` o
 * después. Mensual: ese día del mes (1 a 28, para que exista todos los meses).
 *
 * @param {{ frecuencia: string, dia: number, desde: string }} mesada
 * @param {string} iso
 */
function _toca(mesada, iso) {
  const d = _d(iso);
  if (mesada.frecuencia === 'mensual') return d.getUTCDate() === Number(mesada.dia);
  if (d.getUTCDay() !== Number(mesada.dia)) return false;
  if (mesada.frecuencia === 'semanal') return true;
  // Quincenal: la primera fecha válida desde `desde` fija la cadencia.
  let primera = mesada.desde;
  while (_d(primera).getUTCDay() !== Number(mesada.dia)) primera = _sumar(primera, 1);
  const dias = Math.round((_d(iso) - _d(primera)) / 86_400_000);
  return dias >= 0 && dias % 14 === 0;
}

/**
 * La última fecha en que tocaba mesada, hoy incluido, desde que existe.
 * `null` si todavía no ha tocado ninguna.
 *
 * @param {any} mesada
 * @param {string} hoyISO
 * @returns {string | null}
 */
export function ultimaMesadaDebida(mesada, hoyISO) {
  if (!mesada?.desde) return null;
  for (let iso = hoyISO, i = 0; iso >= mesada.desde && i < 62; iso = _sumar(iso, -1), i++) {
    if (_toca(mesada, iso)) return iso;
  }
  return null;
}

/**
 * La próxima fecha en que toca mesada, después de hoy.
 *
 * @param {any} mesada
 * @param {string} hoyISO
 * @returns {string | null}
 */
export function proximaMesada(mesada, hoyISO) {
  if (!mesada?.desde) return null;
  let iso = hoyISO < mesada.desde ? _sumar(mesada.desde, -1) : hoyISO;
  for (let i = 0; i < 62; i++) {
    iso = _sumar(iso, 1);
    if (_toca(mesada, iso)) return iso;
  }
  return null;
}

/**
 * La mesada que el tutor todavía no marcó "Entregada": la última que tocaba,
 * si no está en `entregas`. Solo cuenta la última: Finko no acumula mesadas
 * atrasadas por su cuenta.
 *
 * @param {any} mesada
 * @param {string} hoyISO
 * @returns {string | null} la fecha que tocaba, o `null` si está al día.
 */
export function mesadaPendiente(mesada, hoyISO) {
  const ultima = ultimaMesadaDebida(mesada, hoyISO);
  if (!ultima) return null;
  const entregas = Array.isArray(mesada.entregas) ? mesada.entregas : [];
  return entregas.some(e => e?.fecha === ultima) ? null : ultima;
}

// ── PREMIO POR AHORRAR (D4) ──────────────────────────────────────

/** `YYYY-MM` del mes anterior a `hoyISO`. */
export function mesAnterior(hoyISO) {
  const d = _d(`${hoyISO.slice(0, 7)}-01`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return _iso(d).slice(0, 7);
}

/** Primer día del mes siguiente a `hoyISO`, cuando se paga el premio de este mes. */
export function primeroDelMesSiguiente(hoyISO) {
  const d = _d(`${hoyISO.slice(0, 7)}-01`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return _iso(d);
}

/**
 * Lo que el niño guardó TODO el mes `mes` (`YYYY-MM`): el saldo más bajo de
 * Ahorrar en ese mes, desde que el premio está activo y hasta `hastaISO`.
 * Si sacó dinero, cuenta lo que quedó (D4).
 *
 * @param {any} perfil
 * @param {string} mes
 * @param {{ desde?: string, hastaISO?: string }} [opciones]
 */
export function guardadoTodoElMes(perfil, mes, { desde = '', hastaISO = `${mes}-31` } = {}) {
  const inicio = desde > `${mes}-01` ? desde : `${mes}-01`;
  const movs = (Array.isArray(perfil?.movimientos) ? perfil.movimientos : [])
    .filter(m => m?.frasco === 'ahorrar')
    .map((m, i) => ({ ...m, i }))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.i - b.i));
  let saldo = 0;
  for (const m of movs) if (m.fecha < inicio) saldo += Number(m.monto) || 0;
  let minimo = saldo;
  for (const m of movs) {
    if (m.fecha < inicio || m.fecha > hastaISO || m.fecha.slice(0, 7) !== mes) continue;
    saldo += Number(m.monto) || 0;
    // Lo que entra el mismo día no cuenta como guardado "todo el mes", pero
    // lo que sale sí baja el piso: el mínimo se toma después de cada salida.
    if ((Number(m.monto) || 0) < 0) minimo = Math.min(minimo, saldo);
  }
  return Math.max(0, minimo);
}

/**
 * El premio que corresponde a lo guardado, con la tasa elegida.
 *
 * @param {number} guardado
 * @param {string} tasa
 */
export function montoPremio(guardado, tasa) {
  const t = TASAS_PREMIO[tasa] ?? TASAS_PREMIO[TASA_POR_DEFECTO];
  return Math.floor(Math.max(0, Number(guardado) || 0) / t.por) * t.suma;
}

/**
 * El premio que falta sumarle al niño: el del mes pasado, si el premio ya
 * estaba activo ese mes y no se pagó. `null` si no hay ninguno.
 *
 * @param {any} perfil
 * @param {string} hoyISO
 * @returns {{ mes: string, guardado: number, monto: number } | null}
 */
export function premioPendiente(perfil, hoyISO) {
  const premio = perfil?.premio;
  if (!premio?.desde) return null;
  const mes = mesAnterior(hoyISO);
  if (mes < premio.desde.slice(0, 7)) return null;
  if ((Array.isArray(premio.pagados) ? premio.pagados : []).includes(mes)) return null;
  const guardado = guardadoTodoElMes(perfil, mes, { desde: premio.desde });
  return { mes, guardado, monto: montoPremio(guardado, premio.tasa) };
}

/**
 * Lo que recibirá el niño el primero del mes que viene si guarda lo que
 * tiene hoy, para decirlo antes de que pase (R50).
 *
 * @param {any} perfil
 * @param {string} hoyISO
 * @param {string} [tasa]
 * @returns {{ fechaISO: string, monto: number, ahorrado: number }}
 */
export function proximoPremio(perfil, hoyISO, tasa = perfil?.premio?.tasa) {
  const ahorrado = saldosFrascos(perfil).ahorrar;
  return { fechaISO: primeroDelMesSiguiente(hoyISO), monto: montoPremio(ahorrado, tasa), ahorrado };
}
