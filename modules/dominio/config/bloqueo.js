/**
 * bloqueo.js - candado de acceso local (CFG.5a, ADR 063). Logica sin DOM.
 *
 * Contrato y alcance, tal cual los fija el ADR 063:
 * - El candado es una **pantalla de privacidad** frente a otra persona que usa
 *   el dispositivo. NO cifra `fk_v1`: los datos siguen en texto plano y quien
 *   tenga devtools, un respaldo exportado o el perfil del navegador los ve.
 * - Se persiste solo el hash: `SHA-256` sobre `salt + ':' + pin`, con salt de
 *   16 bytes aleatorios por usuario. El PIN en claro no se guarda ni se emite.
 * - El hash no es la frontera de seguridad (un PIN de 4 digitos tiene 10.000
 *   combinaciones): evita que el PIN quede legible en `localStorage`.
 * - El freno de intentos vive en memoria de este modulo, nunca en `S`.
 */

import { hoy } from '../../infra/utils.js';

/** Largo minimo y maximo del PIN, en digitos. */
export const PIN_LARGO_MIN = 4;
export const PIN_LARGO_MAX = 8;

/** Fallos consecutivos que activan el freno. */
export const FALLOS_ANTES_DE_FRENO = 5;

/** Duracion base del freno, en milisegundos. Escala por tanda de fallos. */
export const FRENO_MS = 30_000;

/**
 * Clave de `sessionStorage` donde vive el freno. No va en `S` (no es
 * configuración del usuario ni tiene que sobrevivir a cerrar la app) pero sí en
 * `sessionStorage`: si viviera solo en memoria, recargar la pestaña bastaría
 * para saltarse la espera que la pantalla acaba de anunciar.
 */
const CLAVE_FRENO = 'fk_bloqueo_freno';

/** Fallos consecutivos acumulados en esta sesión de la pestaña. */
let _fallos = 0;

/** Marca de tiempo (ms) en la que vence el freno vigente. 0 = sin freno. */
let _frenoHasta = 0;

// Rehidrata el freno al importar el módulo: la pestaña puede venir de un
// recargue en medio de una espera. Tolerante a basura y a modo restringido.
try {
  const guardado = JSON.parse(globalThis.sessionStorage?.getItem(CLAVE_FRENO) ?? 'null');
  if (guardado && typeof guardado === 'object') {
    _fallos     = Number(guardado.fallos) || 0;
    _frenoHasta = Number(guardado.hasta)  || 0;
  }
} catch { /* sin sessionStorage o con contenido corrupto: el freno arranca limpio. */ }

/** Persiste el freno vigente para que sobreviva a un recargue de la pestaña. */
function _guardarFreno() {
  try {
    if (_fallos === 0 && _frenoHasta === 0) {
      globalThis.sessionStorage?.removeItem(CLAVE_FRENO);
      return;
    }
    globalThis.sessionStorage?.setItem(
      CLAVE_FRENO, JSON.stringify({ fallos: _fallos, hasta: _frenoHasta }),
    );
  } catch { /* cupo lleno o storage bloqueado: el freno sigue valiendo en memoria. */ }
}

/**
 * @typedef {{ hash: string, salt: string, creado: string }} Bloqueo
 */

/**
 * true si el entorno puede hashear. `crypto.subtle` solo existe en contexto
 * seguro (https o localhost): abrir la app por `http://192.168.x.x` la deja sin
 * candado, y eso hay que decirlo en vez de fallar en silencio.
 * @returns {boolean}
 */
export function cryptoDisponible() {
  return typeof globalThis.crypto?.subtle?.digest === 'function'
      && typeof globalThis.crypto?.getRandomValues === 'function';
}

/**
 * true si el usuario tiene candado activo.
 * @param {unknown} bloqueo Valor de `S.config.bloqueo`.
 * @returns {boolean}
 */
export function candadoActivo(bloqueo) {
  return Boolean(
    bloqueo && typeof bloqueo === 'object'
    && typeof (/** @type {Bloqueo} */ (bloqueo).hash) === 'string'
    && typeof (/** @type {Bloqueo} */ (bloqueo).salt) === 'string'
    && (/** @type {Bloqueo} */ (bloqueo).hash).length > 0
    && (/** @type {Bloqueo} */ (bloqueo).salt).length > 0,
  );
}

/**
 * Valida el formato del PIN que el usuario acaba de escribir.
 * @param {unknown} pin
 * @returns {string|null} Mensaje de error, o null si el PIN es aceptable.
 */
export function validarPin(pin) {
  const texto = String(pin ?? '');
  if (texto.length === 0) return 'Escribe un PIN.';
  if (!/^\d+$/.test(texto)) return 'El PIN solo puede tener numeros.';
  if (texto.length < PIN_LARGO_MIN || texto.length > PIN_LARGO_MAX) {
    return `El PIN debe tener entre ${PIN_LARGO_MIN} y ${PIN_LARGO_MAX} numeros.`;
  }
  return null;
}

/** @param {Uint8Array} bytes @returns {string} */
function _hex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Salt nuevo de 16 bytes en hexadecimal.
 * @returns {string}
 */
export function generarSalt() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return _hex(bytes);
}

/**
 * `SHA-256` de `salt + ':' + pin`, en hexadecimal.
 * @param {string} pin
 * @param {string} salt
 * @returns {Promise<string>}
 */
export async function hashearPin(pin, salt) {
  const datos  = new globalThis.TextEncoder().encode(`${salt}:${pin}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', datos);
  return _hex(new Uint8Array(digest));
}

/**
 * Construye el objeto que se persiste en `S.config.bloqueo`. No valida el
 * formato: eso lo hace `validarPin()` antes, en el llamador.
 * @param {string} pin
 * @returns {Promise<Bloqueo>}
 */
export async function crearBloqueo(pin) {
  const salt = generarSalt();
  return { hash: await hashearPin(pin, salt), salt, creado: hoy() };
}

/**
 * true si el PIN corresponde al candado guardado.
 * @param {string} pin
 * @param {unknown} bloqueo
 * @returns {Promise<boolean>}
 */
export async function verificarPin(pin, bloqueo) {
  if (!candadoActivo(bloqueo)) return false;
  const b = /** @type {Bloqueo} */ (bloqueo);
  return (await hashearPin(String(pin ?? ''), b.salt)) === b.hash;
}

// ── FRENO A LA FUERZA BRUTA (en memoria, ADR 063 punto 6) ─────────

/**
 * Milisegundos que faltan para poder volver a intentar. 0 = sin freno.
 * @param {number} ahora Reloj inyectado para poder testearlo.
 * @returns {number}
 */
export function msDeFreno(ahora = Date.now()) {
  return Math.max(0, _frenoHasta - ahora);
}

/**
 * Registra un intento fallido y devuelve el freno resultante en milisegundos.
 * Cada tanda de `FALLOS_ANTES_DE_FRENO` suma otros `FRENO_MS`.
 * @param {number} ahora Reloj inyectado para poder testearlo.
 * @returns {number}
 */
export function registrarFallo(ahora = Date.now()) {
  _fallos += 1;
  if (_fallos % FALLOS_ANTES_DE_FRENO === 0) {
    const tandas = _fallos / FALLOS_ANTES_DE_FRENO;
    _frenoHasta  = ahora + FRENO_MS * tandas;
  }
  _guardarFreno();
  return msDeFreno(ahora);
}

/** Fallos consecutivos acumulados. Solo para mensajes de la vista. */
export function fallosAcumulados() {
  return _fallos;
}

/** Limpia el freno tras un desbloqueo correcto (o al montar el gate en tests). */
export function limpiarFallos() {
  _fallos      = 0;
  _frenoHasta  = 0;
  _guardarFreno();
}
