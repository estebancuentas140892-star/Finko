/**
 * nino/logic.js - la ruta del niño, sin DOM (APR.3c, ADR 093 D9).
 *
 * A diferencia del adulto (092 D8), el niño sigue la secuencia: la unidad
 * actual es la primera sin terminar, y dentro de ella solo se abre la
 * lección que sigue (más las hechas, para repasar). Así no se pierde.
 */

import { UNIDADES_NINO, unidadTerminada } from '../../infra/ruta-aprende.js';
import { saldosFrascos, FRASCOS, NOMBRE_MAX } from '../../infra/perfiles.js';
import { DIBUJOS } from '../../infra/ilustraciones.js';
import { f } from '../../infra/utils.js';

/** @param {unknown} aprende */
function _hechas(aprende) {
  const h = /** @type {any} */ (aprende)?.hechas;
  return h && typeof h === 'object' && !Array.isArray(h) ? h : {};
}

/**
 * Estado de cada unidad y de cada lección de la unidad actual.
 *
 * - unidad `hecha`: todas sus lecciones terminadas.
 * - unidad `actual`: la primera sin terminar, si ya tiene contenido.
 * - unidad `preparacion`: la primera sin terminar, sin contenido todavía:
 *   la ruta se detiene ahí, no la salta.
 * - unidad `despues`: el resto.
 * - lección `hecha`, `actual` (la que sigue) o `despues`.
 *
 * @param {unknown} aprende - el `aprende` del niño.
 */
export function estadoRutaNino(aprende) {
  const hechas = _hechas(aprende);
  const sabidas = Array.isArray(/** @type {any} */ (aprende)?.sabidas) ? /** @type {any} */ (aprende).sabidas : [];
  let detenida = false;
  return UNIDADES_NINO.map(unidad => {
    let estado = 'despues';
    // Lo que la prueba marcó como sabido cuenta como hecho (D3, D9).
    if (!detenida && sabidas.includes(unidad.id)) estado = 'sabida';
    else if (!detenida && unidadTerminada(unidad, hechas)) estado = 'hecha';
    else if (!detenida) {
      estado = unidad.lecciones.length ? 'actual' : 'preparacion';
      detenida = true;
    }
    let hayActual = false;
    const lecciones = unidad.lecciones.map((leccion, i) => {
      let e = 'despues';
      if (hechas[leccion.id]) e = 'hecha';
      else if (estado === 'actual' && !hayActual) {
        e = 'actual';
        hayActual = true;
      }
      return { leccion, numero: i + 1, estado: e };
    });
    return { unidad, estado, lecciones };
  });
}

/**
 * La lección que sigue en la ruta del niño, o `null` si no queda ninguna
 * escrita por hacer.
 *
 * @param {unknown} aprende
 * @returns {{ unidad: any, leccion: any, numero: number } | null}
 */
export function siguienteLeccionNino(aprende) {
  const actual = estadoRutaNino(aprende).find(e => e.estado === 'actual');
  const l = actual?.lecciones.find(x => x.estado === 'actual');
  return l ? { unidad: actual.unidad, leccion: l.leccion, numero: l.numero } : null;
}

/** Cuántas unidades sabe el niño, hechas o sabidas: cada una es una insignia en "Yo". */
export function unidadesHechasNino(aprende) {
  return estadoRutaNino(aprende).filter(e => e.estado === 'hecha' || e.estado === 'sabida').length;
}

/** Desde esta edad la ruta empieza con tres preguntas de ubicación (D9). */
export const EDAD_UBICACION_NINO = 10;

/**
 * ¿Se le ofrece la prueba de ubicación? Solo desde los 10 años, una vez y
 * antes de empezar: sin nada hecho, sabido ni en curso (D9).
 */
export function ofreceUbicacionNino(perfil) {
  const a = perfil?.aprende ?? {};
  return Number(perfil?.edad) >= EDAD_UBICACION_NINO && !a.ubicacion && !a.enCurso
    && !(Array.isArray(a.sabidas) && a.sabidas.length) && !Object.keys(_hechas(a)).length;
}

/** Las cuatro pantallas del niño, en el orden de su barra (D9). */
export const VISTAS_NINO = Object.freeze(['inicio', 'aprender', 'alcancia', 'yo']);

// ── ALCANCÍA (APR.3d, ADR 093 D9) ────────────────────────────────

/** Nombre visible de cada frasco, para los mensajes. */
const _NOMBRE = { ahorrar: 'Ahorrar', gastar: 'Gastar', compartir: 'Compartir' };

/**
 * Qué anota cada acción de la alcancía: de qué frasco sale o a cuál entra.
 * "Guardé" entra al frasco que elija (Ahorrar por defecto); "Gasté" sale
 * de Gastar y "Compartí", de Compartir; "Mover" pasa de uno a otro.
 */
export const ACCIONES_ALCANCIA = Object.freeze({
  guarde:   { signo: 1,  frasco: null },
  gaste:    { signo: -1, frasco: 'gastar' },
  comparti: { signo: -1, frasco: 'compartir' },
  mover:    { signo: 0,  frasco: null },
});

/** Monto en pesos completos a partir de lo que escribe el niño ("5.000" → 5000). */
export function leerMonto(texto) {
  const n = Number(String(texto ?? '').replace(/\D/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** ¿Puede mover dinero entre frascos? Lo decide el tutor; por defecto, sí (D2). */
export function puedeMover(perfil) {
  return perfil?.mesada?.puedeMover !== false;
}

/**
 * Valida un movimiento de la alcancía con los saldos de hoy. Mensajes en la
 * voz del niño (D6).
 *
 * @param {{ tipo: string, monto: number, frasco?: string, desde?: string, hacia?: string }} mov
 * @param {any} perfil
 * @returns {string[]}
 */
export function validarMovimiento(mov, perfil) {
  const accion = ACCIONES_ALCANCIA[mov.tipo];
  if (!accion) return ['No sé qué anotar.'];
  const errores = [];
  const monto = Number(mov.monto);
  if (!Number.isInteger(monto) || monto <= 0) errores.push('Escribe cuánto dinero.');
  const saldos = saldosFrascos(perfil);
  if (mov.tipo === 'guarde') {
    if (!FRASCOS.includes(mov.frasco)) errores.push('Elige en qué frasco guardas.');
  } else if (mov.tipo === 'mover') {
    if (!puedeMover(perfil)) return ['Mover entre frascos no está activo.'];
    if (!FRASCOS.includes(mov.desde) || !FRASCOS.includes(mov.hacia) || mov.desde === mov.hacia) {
      errores.push('Elige dos frascos distintos.');
    } else if (monto > saldos[mov.desde]) {
      errores.push(`En ${_NOMBRE[mov.desde]} solo tienes ${f(saldos[mov.desde])}.`);
    }
  } else if (monto > saldos[accion.frasco]) {
    errores.push(`En ${_NOMBRE[accion.frasco]} solo tienes ${f(saldos[accion.frasco])}.`);
  }
  return errores;
}

/**
 * Los movimientos que deja una acción ya validada: uno, o dos si es mover
 * (sale de un frasco y entra al otro, con el mismo `par`).
 *
 * @param {{ tipo: string, monto: number, frasco?: string, desde?: string, hacia?: string, nota?: string }} mov
 * @param {string} hoyISO
 * @param {() => string} nuevoId
 * @returns {object[]}
 */
export function crearMovimientos(mov, hoyISO, nuevoId) {
  const nota = String(mov.nota ?? '').trim().slice(0, 40);
  const monto = Number(mov.monto);
  if (mov.tipo === 'mover') {
    const par = nuevoId();
    return [
      { id: nuevoId(), fecha: hoyISO, frasco: mov.desde, monto: -monto, tipo: 'mover', par, nota },
      { id: nuevoId(), fecha: hoyISO, frasco: mov.hacia, monto, tipo: 'mover', par, nota },
    ];
  }
  const accion = ACCIONES_ALCANCIA[mov.tipo];
  const frasco = accion.frasco ?? mov.frasco;
  return [{ id: nuevoId(), fecha: hoyISO, frasco, monto: accion.signo * monto, tipo: mov.tipo, nota }];
}

// ── METAS (APR.3d, ADR 093 D9) ───────────────────────────────────

/** La meta que el niño persigue ahora (una a la vez), o `null`. */
export function metaActiva(perfil) {
  const metas = Array.isArray(perfil?.metas) ? perfil.metas : [];
  return metas.find(m => m && !m.lograda) ?? null;
}

/**
 * Cuánto falta y en cuántas semanas se logra, guardando `semanal` cada
 * semana sobre lo que ya hay en Ahorrar. La fecha es para decirla en
 * palabras ("Para el 19 de diciembre").
 *
 * @param {{ precio: number, semanal: number, ahorrado: number, hoyISO: string }} datos
 * @returns {{ falta: number, semanas: number, fechaISO: string, proporcion: number }}
 */
export function planMeta({ precio, semanal, ahorrado, hoyISO }) {
  const p = Math.max(0, Number(precio) || 0);
  const falta = Math.max(0, p - Math.max(0, Number(ahorrado) || 0));
  const s = Math.max(0, Number(semanal) || 0);
  const semanas = falta === 0 ? 0 : s > 0 ? Math.ceil(falta / s) : Infinity;
  let fechaISO = hoyISO;
  if (Number.isFinite(semanas) && semanas > 0) {
    const d = new Date(`${hoyISO}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + semanas * 7);
    fechaISO = d.toISOString().slice(0, 10);
  }
  return { falta, semanas, fechaISO, proporcion: p > 0 ? Math.min(1, (p - falta) / p) : 0 };
}

/**
 * Valida una meta nueva del niño (D9): su dibujo, un nombre, el precio y
 * cuánto guarda cada semana.
 *
 * @param {{ dibujo?: string, nombre?: string, precio?: number, semanal?: number }} datos
 * @returns {string[]}
 */
export function validarMeta(datos) {
  const errores = [];
  if (!DIBUJOS.some(d => d.id === datos.dibujo)) errores.push('Elige un dibujo para tu meta.');
  const nombre = String(datos.nombre ?? '').trim();
  if (!nombre) errores.push('Ponle nombre a tu meta.');
  else if (nombre.length > NOMBRE_MAX + 20) errores.push('El nombre es muy largo.');
  if (!(Number(datos.precio) > 0)) errores.push('Escribe cuánto cuesta.');
  if (!(Number(datos.semanal) > 0)) errores.push('Elige cuánto guardas cada semana.');
  return errores;
}

/**
 * Cuánto se llena cada frasco, siempre contra lo suyo y nunca contra los
 * otros dos (R60): Ahorrar contra la meta; Gastar y Compartir contra lo que
 * les toca de la mesada. Sin con qué medir, un frasco con dinero muestra un
 * fondo visible y uno vacío no muestra nada.
 *
 * @param {'ahorrar'|'gastar'|'compartir'} frasco
 * @param {any} perfil
 * @returns {number} 0 a 1.
 */
export function llenadoFrasco(frasco, perfil) {
  const saldo = saldosFrascos(perfil)[frasco] ?? 0;
  if (saldo <= 0) return 0;
  const meta = metaActiva(perfil);
  const referencia = frasco === 'ahorrar'
    ? Number(meta?.precio) || 0
    : Number(perfil?.mesada?.reparto?.[frasco]) || 0;
  if (referencia <= 0) return 0.15;
  return Math.min(1, Math.max(0.05, saldo / referencia));
}

