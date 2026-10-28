/**
 * infra/actualizacion.js - buscar a pedido una versión nueva de Finko y reparar
 * una instalación trabada (UPD.3).
 *
 * La ruta normal no pasa por acá: `sw-register.js` busca versión nueva al abrir
 * y al volver a la app, y cuando el SW nuevo toma el control `ui/sw-aviso.js`
 * muestra el aviso con el botón "Actualizar". Este módulo es lo que hay detrás
 * del bloque "Actualizar app" de Ajustes: buscar sin esperar a que el navegador
 * lo decida y, si la instalación quedó trabada en una versión vieja, volver a
 * descargar los archivos sin desinstalar ni borrar los datos del navegador.
 *
 * **Lo que nunca toca: `localStorage`.** Los datos del usuario viven ahí (clave
 * `fk_v1`); el cache del SW solo guarda archivos de la app. Por eso borrar ese
 * cache y volver a descargarlos no pierde nada, y "Borrar datos de navegación"
 * (que sí se lleva `localStorage`) deja de ser la salida.
 *
 * Sin DOM y sin `S`: `navigator` y `caches` entran por parámetro, mismo criterio
 * que `infra/persistencia.js`, así que se prueba con dobles.
 */

/** Resultados de `buscarActualizacion()`. `no-soportado` no es un fallo: es un navegador sin SW. */
export const ACTUALIZACION = Object.freeze({
  AL_DIA:       'al-dia',
  NUEVA:        'nueva',
  SIN_RED:      'sin-red',
  FALLO:        'fallo',
  NO_SOPORTADO: 'no-soportado',
});

/** Prefijo de `CACHE_NAME` en `service-worker.js` (`finko-v616`). */
const PREFIJO_VERSION = 'finko-v';

/**
 * El `navigator` real, o el que inyecte un test.
 * @param {object} [nav]
 * @returns {object|null}
 */
function _nav(nav) {
  if (nav) return nav;
  return typeof navigator === 'object' && navigator !== null ? navigator : null;
}

/**
 * El `caches` real (CacheStorage), o el que inyecte un test.
 * @param {object} [cs]
 * @returns {object|null}
 */
function _caches(cs) {
  if (cs) return cs;
  return typeof caches === 'object' && caches !== null ? caches : null;
}

/**
 * Registro del SW de esta página, o `null` si no hay (navegador sin SW, o
 * desarrollo: `sw-register.js` no registra en localhost).
 * @param {object} [nav]
 * @returns {Promise<object|null>}
 */
async function _registro(nav) {
  const sw = _nav(nav)?.serviceWorker;
  if (typeof sw?.getRegistration !== 'function') return null;
  try {
    return (await sw.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

/**
 * Número de la versión instalada, leído del nombre del cache del SW
 * (`finko-v616` → 616). Es el mismo número que sube el bump de cada publicación
 * y la clave de `NOVEDADES_POR_VERSION`. `null` si no hay cache (desarrollo o
 * primera carga sin terminar).
 *
 * Si conviven dos (el traspaso de `activate` dura un instante), gana el mayor.
 *
 * @param {object} [cs] Inyectable en tests.
 * @returns {Promise<number|null>}
 */
export async function versionInstalada(cs) {
  const c = _caches(cs);
  if (typeof c?.keys !== 'function') return null;
  try {
    const numeros = (await c.keys())
      .filter((n) => n.startsWith(PREFIJO_VERSION))
      .map((n) => Number(n.slice(PREFIJO_VERSION.length)))
      .filter((n) => Number.isInteger(n) && n > 0);
    return numeros.length > 0 ? Math.max(...numeros) : null;
  } catch {
    return null;
  }
}

/**
 * Pide al navegador que busque una versión nueva ya, y si la hay espera a que
 * quede instalada y activa.
 *
 * `reg.update()` descarga `service-worker.js` de la red (nunca del cache: ver
 * `updateViaCache` en `sw-register.js`). Si el archivo es idéntico, no hay
 * versión nueva. Si cambió, arranca la instalación, que precachea todos los
 * archivos y puede tardar unos segundos en un teléfono: `alDescargar` avisa que
 * empezó para que la vista no parezca colgada.
 *
 * Un `update()` que lanza casi siempre es falta de red. Una instalación que
 * termina en `redundant` es un precache que falló (un archivo que no llegó):
 * el SW viejo sigue mandando y el reintento lo hace el propio navegador.
 *
 * @param {{ alDescargar?: () => void, nav?: object }} [opciones]
 * @returns {Promise<'al-dia'|'nueva'|'sin-red'|'fallo'|'no-soportado'>}
 */
export async function buscarActualizacion({ alDescargar, nav } = {}) {
  const reg = await _registro(nav);
  if (!reg) return ACTUALIZACION.NO_SOPORTADO;
  if (_nav(nav)?.onLine === false) return ACTUALIZACION.SIN_RED;

  try {
    await reg.update();
  } catch {
    return ACTUALIZACION.SIN_RED;
  }

  const nuevo = reg.installing ?? reg.waiting;
  if (!nuevo) return ACTUALIZACION.AL_DIA;

  alDescargar?.();
  return _esperarActivacion(nuevo);
}

/**
 * Resuelve cuando el SW nuevo termina: activo (`nueva`) o descartado (`fallo`).
 * @param {object} worker - ServiceWorker en `installing` o `waiting`
 * @returns {Promise<'nueva'|'fallo'>}
 */
function _esperarActivacion(worker) {
  return new Promise((resolve) => {
    const revisar = () => {
      if (worker.state === 'activated') resolve(ACTUALIZACION.NUEVA);
      else if (worker.state === 'redundant') resolve(ACTUALIZACION.FALLO);
    };
    worker.addEventListener('statechange', revisar);
    revisar();
  });
}

/**
 * Deja la app sin SW ni archivos guardados para que la próxima carga los baje
 * todos de la red, como una instalación nueva. Es lo que el usuario hacía a
 * mano al "borrar la caché", menos la parte que se llevaba sus datos.
 *
 * **Sin red no borra nada y devuelve `false`.** Sin SW ni cache y sin red, la
 * próxima carga no tendría de dónde sacar la app. La prueba de red es el mismo
 * `reg.update()`, que va a la red sí o sí; sin registro, `navigator.onLine`.
 *
 * Solo borra caches `finko-`: lo de otro origen no se ve desde acá y lo de otra
 * app del mismo origen no es de Finko. El caller recarga después.
 *
 * @param {{ nav?: object, cs?: object }} [opciones]
 * @returns {Promise<boolean>} true si quedó listo para recargar.
 */
export async function repararArchivos({ nav, cs } = {}) {
  const n   = _nav(nav);
  const reg = await _registro(nav);

  if (reg) {
    try {
      await reg.update();
    } catch {
      return false;
    }
  } else if (n?.onLine === false) {
    return false;
  }

  try {
    const registros = typeof n?.serviceWorker?.getRegistrations === 'function'
      ? await n.serviceWorker.getRegistrations()
      : [];
    await Promise.all(registros.map((r) => r.unregister()));

    const c = _caches(cs);
    if (typeof c?.keys === 'function') {
      const nombres = await c.keys();
      await Promise.all(nombres.filter((x) => x.startsWith('finko-')).map((x) => c.delete(x)));
    }
  } catch (err) {
    // A medio camino igual conviene recargar: lo que se alcanzó a borrar baja
    // de la red y lo que no, sigue sirviendo como antes.
    console.warn('[actualizacion] reparar quedó incompleto:', err);
  }
  return true;
}
