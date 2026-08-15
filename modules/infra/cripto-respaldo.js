/**
 * infra/cripto-respaldo.js - cifrado del archivo de respaldo
 * (CFG.4c, [ADR 043](../../docs/DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) D2.3).
 *
 * Responde una sola pregunta: **cómo se guarda un respaldo que solo el usuario
 * puede abrir**. Hoy el JSON exportado va en claro y trae el historial
 * financiero completo: quien lo suba a Drive o lo deje en Descargas lo deja
 * legible para cualquiera con acceso a esa carpeta.
 *
 * **AES-GCM 256 con clave derivada por PBKDF2-SHA256.** Mismo `crypto.subtle`
 * que el candado del [ADR 063](../../docs/DECISIONS/063-candado-de-acceso-local.md)
 * ya usa, sin dependencias nuevas (ADN 1). AES-GCM además **autentica**: una
 * contraseña equivocada no devuelve basura, hace fallar el descifrado, y eso es
 * lo que permite decirle al usuario "esa contraseña no abre este archivo" en vez
 * de restaurar un estado corrupto.
 *
 * **El sobre es JSON, no un binario nuevo.** El archivo cifrado sigue siendo un
 * `.json` que `JSON.parse` lee: así el importador detecta el formato mirando un
 * campo, `restaurarBlob()` de `core/storage.js` no cambia, y un archivo cifrado
 * abierto por error en un editor se explica solo.
 *
 * **No hay recuperación de contraseña, y es deliberado** (ADR 043 D2.3): la
 * clave no se guarda en ninguna parte, ni siquiera hasheada. Si el usuario la
 * olvida, el archivo no se abre. La pantalla que la pide lo dice con esas
 * palabras; este módulo no finge lo contrario.
 *
 * Sin DOM y sin `S`: todo entra y sale como string.
 */

/** Marca del sobre. Es lo que mira el importador para decidir si descifrar. */
export const FORMATO_CIFRADO = 'finko-backup-cifrado';

/** Versión del sobre. Un cambio de parámetros de cripto sube este número. */
export const VERSION_CIFRADO = 1;

/**
 * Iteraciones de PBKDF2-SHA256. 600.000 es la recomendación vigente de OWASP
 * para este algoritmo. Cuesta unos cientos de milisegundos en un teléfono de
 * gama media, y se paga **una sola vez** por exportar o importar: es un acto
 * deliberado del usuario, no algo que ocurra mientras usa la app.
 */
export const ITERACIONES_PBKDF2 = 600_000;

/** Largo mínimo de la contraseña, en caracteres. */
export const LARGO_MIN_CONTRASENA = 8;

/** Bytes del salt de derivación y del IV de AES-GCM. */
const BYTES_SALT = 16;
const BYTES_IV   = 12;

/**
 * true si el entorno puede cifrar. `crypto.subtle` solo existe en contexto
 * seguro (https o localhost), igual que para el candado: abrir la app por
 * `http://192.168.x.x` la deja sin cifrado, y eso se dice en vez de fallar en
 * silencio.
 * @returns {boolean}
 */
export function cifradoDisponible() {
  return typeof globalThis.crypto?.subtle?.deriveKey === 'function'
      && typeof globalThis.crypto?.subtle?.encrypt === 'function'
      && typeof globalThis.crypto?.getRandomValues === 'function';
}

/**
 * Valida el formato de la contraseña que el usuario acaba de escribir.
 *
 * Solo largo, sin reglas de composición: la guía vigente del NIST (800-63B)
 * dice que exigir mayúsculas y símbolos empeora las contraseñas reales en vez
 * de mejorarlas. Lo que sí importa acá es que no se escriba mal, y de eso se
 * encarga el campo de confirmación en la pantalla.
 *
 * @param {unknown} contrasena
 * @returns {string|null} Mensaje de error, o null si es aceptable.
 */
export function validarContrasena(contrasena) {
  const texto = String(contrasena ?? '');
  if (texto.length === 0) return 'Escribe una contraseña.';
  if (texto.length < LARGO_MIN_CONTRASENA) {
    return `La contraseña debe tener al menos ${LARGO_MIN_CONTRASENA} caracteres.`;
  }
  return null;
}

// ── BASE64 (sin Buffer: esto corre en el navegador) ───────────────

/**
 * Bytes a base64. Convierte por trozos porque `String.fromCharCode(...bytes)`
 * con un respaldo de varios MB revienta la pila de argumentos.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function _aBase64(bytes) {
  const TROZO = 0x8000;
  let binario = '';
  for (let i = 0; i < bytes.length; i += TROZO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + TROZO));
  }
  return globalThis.btoa(binario);
}

/**
 * Base64 a bytes.
 * @param {string} texto
 * @returns {Uint8Array}
 */
function _deBase64(texto) {
  const binario = globalThis.atob(texto);
  const bytes   = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

// ── DERIVACIÓN Y CIFRADO ─────────────────────────────────────────

/**
 * Deriva la clave AES-GCM de 256 bits desde la contraseña y el salt.
 * @param {string} contrasena
 * @param {Uint8Array} salt
 * @param {number} iteraciones
 * @returns {Promise<CryptoKey>}
 */
async function _derivarClave(contrasena, salt, iteraciones) {
  const material = await globalThis.crypto.subtle.importKey(
    'raw',
    new globalThis.TextEncoder().encode(contrasena),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iteraciones, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * true si el texto es un sobre cifrado de Finko. Lo usa el importador para
 * decidir si pedir contraseña, **antes** de tocar nada del estado.
 *
 * Tolerante a basura a propósito: cualquier cosa que no sea el sobre exacto se
 * trata como respaldo en claro y sigue el camino de siempre.
 *
 * @param {unknown} texto Contenido crudo del archivo.
 * @returns {boolean}
 */
export function esRespaldoCifrado(texto) {
  try {
    const sobre = JSON.parse(String(texto ?? ''));
    return Boolean(sobre)
      && typeof sobre === 'object'
      && sobre.formato === FORMATO_CIFRADO
      && typeof sobre.datos === 'string';
  } catch {
    return false;
  }
}

/**
 * Cifra el JSON del respaldo y devuelve el sobre listo para escribir a archivo.
 *
 * Salt e IV nuevos en cada exportación: dos respaldos con la misma contraseña
 * no comparten clave derivada ni producen el mismo texto cifrado.
 *
 * @param {string} json      Respaldo en claro (lo que hoy se descarga tal cual).
 * @param {string} contrasena
 * @returns {Promise<string>} El sobre serializado, listo para el Blob.
 */
export async function cifrarRespaldo(json, contrasena) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(BYTES_SALT));
  const iv   = globalThis.crypto.getRandomValues(new Uint8Array(BYTES_IV));

  const clave = await _derivarClave(contrasena, salt, ITERACIONES_PBKDF2);
  const datos = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    clave,
    new globalThis.TextEncoder().encode(json),
  );

  // Los parámetros viajan con el archivo (no son secretos: el secreto es la
  // contraseña). Sin esto, un cambio futuro de iteraciones dejaría ilegibles
  // los respaldos viejos, que es justo lo que un respaldo no puede permitirse.
  return JSON.stringify({
    formato: FORMATO_CIFRADO,
    version: VERSION_CIFRADO,
    kdf: {
      nombre:      'PBKDF2',
      hash:        'SHA-256',
      iteraciones: ITERACIONES_PBKDF2,
      salt:        _aBase64(salt),
    },
    cifrado: { nombre: 'AES-GCM', iv: _aBase64(iv) },
    datos:   _aBase64(new Uint8Array(datos)),
  }, null, 2);
}

/**
 * Descifra un sobre y devuelve el JSON en claro.
 *
 * Distingue los dos fallos que le importan al usuario, porque piden acciones
 * distintas: **contraseña equivocada** (vuelve a intentar) y **archivo que no
 * es un sobre válido** (busca otro archivo). No los junta en un solo "error".
 *
 * @param {string} texto      Contenido crudo del archivo.
 * @param {string} contrasena
 * @returns {Promise<{ ok: true, json: string } | { ok: false, motivo: 'archivo-invalido'|'contrasena-incorrecta' }>}
 */
export async function descifrarRespaldo(texto, contrasena) {
  let sobre;
  try {
    sobre = JSON.parse(String(texto ?? ''));
  } catch {
    return { ok: false, motivo: 'archivo-invalido' };
  }

  if (!esRespaldoCifrado(texto)) return { ok: false, motivo: 'archivo-invalido' };

  let salt, iv, datos, iteraciones;
  try {
    salt        = _deBase64(sobre.kdf.salt);
    iv          = _deBase64(sobre.cifrado.iv);
    datos       = _deBase64(sobre.datos);
    iteraciones = Number(sobre.kdf.iteraciones);
  } catch {
    return { ok: false, motivo: 'archivo-invalido' };
  }

  if (!Number.isFinite(iteraciones) || iteraciones <= 0) {
    return { ok: false, motivo: 'archivo-invalido' };
  }

  try {
    const clave = await _derivarClave(contrasena, salt, iteraciones);
    const plano = await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, clave, datos);
    return { ok: true, json: new globalThis.TextDecoder().decode(plano) };
  } catch {
    // AES-GCM autentica: si el descifrado falla, o la contraseña no es la que
    // cifró el archivo, o el archivo llegó alterado. Para el usuario es la
    // misma acción (volver a escribir la contraseña), así que es un solo motivo.
    return { ok: false, motivo: 'contrasena-incorrecta' };
  }
}
