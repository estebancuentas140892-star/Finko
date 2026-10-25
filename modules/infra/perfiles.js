/**
 * infra/perfiles.js - perfiles de niño en el dispositivo y quién usa Finko
 * ahora (APR.3a, ADR 093 D1).
 *
 * El adulto sigue siendo el estado de siempre en `S`; cada niño es un objeto
 * de `S.perfiles` (schema v48). Lo comparten Ajustes (Familia, el tutor), el
 * perfil niño y "¿Quién usa Finko?": como ningún dominio importa a otro
 * (ADN 10), vive acá.
 *
 * El perfil activo es estado de sesión y NO se guarda en `fk_v1`: con niños,
 * Finko abre siempre en "¿Quién usa Finko?" (D1), así que recargar nunca
 * deja a un niño dentro del perfil adulto.
 */

import { S, EventBus } from '../core/state.js';
import { DIBUJOS } from './ilustraciones.js';

/** Edades del perfil niño (D1). */
export const EDAD_MIN = 7;
export const EDAD_MAX = 12;

/** Largo máximo del nombre del niño y de cómo nombra al tutor. */
export const NOMBRE_MAX = 20;

/** Cómo te nombra el niño, además de "Otro nombre" (D2). */
export const COMO_TE_NOMBRA = Object.freeze(['Papá', 'Mamá']);

/**
 * @typedef {Object} PerfilNino
 * @property {string} id
 * @property {string} nombre
 * @property {number} edad       - 7 a 12.
 * @property {string} dibujo     - id del catálogo de `infra/ilustraciones.js`.
 * @property {string} teNombra   - cómo nombra al tutor ("Papá", "Mamá"...).
 * @property {string} creado     - `YYYY-MM-DD` local.
 * @property {{ hechas: Record<string,string>, sabidas: string[], semanas: string[], enCurso: {id:string,paso:number}|null, ubicacion: string|null }} aprende
 * @property {object[]} movimientos - la alcancía (APR.3d): cada entrada y salida de un frasco.
 * @property {object[]} metas       - sus metas (APR.3d).
 * @property {object|null} mesada   - la que fija el tutor (APR.3e).
 * @property {object|null} premio   - premio por ahorrar (APR.3e).
 */

/** Progreso de Aprende vacío: el niño usa el mismo motor que el adulto. */
export function aprendeVacio() {
  return { hechas: {}, sabidas: [], semanas: [], enCurso: null, ubicacion: null };
}

const _esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Deja un perfil con su forma completa, o `null` si no se puede rescatar
 * (sin id o sin nombre). Tolera un respaldo editado a mano.
 *
 * @param {unknown} p
 * @returns {PerfilNino | null}
 */
export function normalizarPerfil(p) {
  if (!_esObjeto(p) || typeof p.id !== 'string' || !p.id) return null;
  const nombre = typeof p.nombre === 'string' ? p.nombre.trim().slice(0, NOMBRE_MAX) : '';
  if (!nombre) return null;
  const edad = Number.isInteger(p.edad) ? Math.min(EDAD_MAX, Math.max(EDAD_MIN, p.edad)) : EDAD_MIN;
  const a = _esObjeto(p.aprende) ? p.aprende : {};
  return {
    id: p.id,
    nombre,
    edad,
    dibujo: DIBUJOS.some(d => d.id === p.dibujo) ? p.dibujo : DIBUJOS[0].id,
    teNombra: typeof p.teNombra === 'string' && p.teNombra.trim() ? p.teNombra.trim().slice(0, NOMBRE_MAX) : COMO_TE_NOMBRA[0],
    creado: typeof p.creado === 'string' ? p.creado : '',
    aprende: {
      hechas:  _esObjeto(a.hechas) ? a.hechas : {},
      sabidas: Array.isArray(a.sabidas) ? a.sabidas : [],
      semanas: Array.isArray(a.semanas) ? a.semanas : [],
      enCurso: a.enCurso && typeof a.enCurso.id === 'string' ? a.enCurso : null,
      ubicacion: typeof a.ubicacion === 'string' ? a.ubicacion : null,
    },
    movimientos: Array.isArray(p.movimientos) ? p.movimientos : [],
    metas: Array.isArray(p.metas) ? p.metas : [],
    mesada: _esObjeto(p.mesada) ? p.mesada : null,
    premio: _esObjeto(p.premio) ? p.premio : null,
  };
}

/**
 * Valida lo que el tutor escribe en el alta (paso 1, D2).
 *
 * @param {{ nombre?: unknown, edad?: unknown, dibujo?: unknown, teNombra?: unknown }} datos
 * @returns {string[]} errores en lenguaje humano; vacío si todo está bien.
 */
export function validarNino(datos) {
  const errores = [];
  const nombre = String(datos.nombre ?? '').trim();
  if (!nombre) errores.push('Escribe el nombre del niño.');
  else if (nombre.length > NOMBRE_MAX) errores.push(`El nombre puede tener hasta ${NOMBRE_MAX} letras.`);
  const edad = Number(datos.edad);
  if (!Number.isInteger(edad) || edad < EDAD_MIN || edad > EDAD_MAX) errores.push(`Elige una edad de ${EDAD_MIN} a ${EDAD_MAX} años.`);
  if (!DIBUJOS.some(d => d.id === datos.dibujo)) errores.push('Elige su dibujo.');
  const teNombra = String(datos.teNombra ?? '').trim();
  if (!teNombra) errores.push('Escribe cómo te nombra.');
  else if (teNombra.length > NOMBRE_MAX) errores.push(`Cómo te nombra puede tener hasta ${NOMBRE_MAX} letras.`);
  return errores;
}

/**
 * Crea el perfil de un niño ya validado.
 *
 * @param {{ nombre: string, edad: number|string, dibujo: string, teNombra: string }} datos
 * @param {string} hoyISO
 * @param {string} id
 * @returns {PerfilNino}
 */
export function crearNino(datos, hoyISO, id) {
  return /** @type {PerfilNino} */ (normalizarPerfil({
    id,
    nombre: datos.nombre,
    edad: Number(datos.edad),
    dibujo: datos.dibujo,
    teNombra: datos.teNombra,
    creado: hoyISO,
  }));
}

/**
 * Los niños de esta instalación, ya normalizados.
 * @param {any} [state]
 * @returns {PerfilNino[]}
 */
export function ninos(state = S) {
  return Array.isArray(state?.perfiles) ? state.perfiles.map(normalizarPerfil).filter(Boolean) : [];
}

/** true si hay al menos un niño en el dispositivo. */
export function hayNinos(state = S) {
  return ninos(state).length > 0;
}

// ── SESIÓN: QUIÉN USA FINKO AHORA ────────────────────────────────

/** Id del niño activo; `null` es el adulto. Solo en memoria (ver arriba). */
let _activo = null;

/** El niño activo, o `null` si está el adulto. */
export function perfilActivo(state = S) {
  if (!_activo) return null;
  return ninos(state).find(p => p.id === _activo) ?? null;
}

/** true si Finko está en el perfil de un niño. */
export function esPerfilNino() {
  return perfilActivo() !== null;
}

/**
 * Cambia de perfil. `null` vuelve al adulto: quien lo llame ya pidió el PIN
 * (de niño a adulto siempre se pide, D1). Un id que no existe también
 * vuelve al adulto: nunca queda un perfil activo fantasma.
 *
 * @param {string | null} id
 */
export function entrarComo(id) {
  const antes = _activo;
  _activo = id && ninos().some(p => p.id === id) ? id : null;
  if (antes !== _activo) EventBus.emit('perfil:cambio', { id: _activo });
}
