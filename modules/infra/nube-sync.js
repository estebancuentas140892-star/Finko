/**
 * infra/nube-sync.js - el motor de sincronización por registro (NUBE.2,
 * ADR 096 D4). Funciones puras: reciben el estado y el libro, devuelven
 * copias. La red y `localStorage` los pone `config/nube.js`.
 *
 * Cómo sabe qué cambió sin tocar los dominios (ADN 10): cada dispositivo
 * lleva un libro con la huella de cada registro tal como quedó sincronizado.
 * En cada pasada compara el estado contra el libro: una huella distinta es
 * un cambio local, un registro que ya no está es un borrado. Así ningún
 * dominio tiene que anotar fechas ni marcas, y el schema de `fk_v1` no cambia.
 *
 * Unidad de sincronización:
 * - cada elemento (con `id`) de las colecciones de `COLECCIONES` es un registro;
 * - cada otra clave de primer nivel (perfil, config sin el PIN, aprende,
 *   ahorro, logros...) es un registro de `RAIZ` y viaja entera.
 *
 * Conflicto: si los dos lados cambiaron el mismo registro desde la última
 * sincronización, gana el cambio más reciente (`cambiado`, la hora del
 * dispositivo que lo hizo). Un borrado es un cambio más.
 */

/** Colecciones cuyos elementos se sincronizan uno por uno. */
export const COLECCIONES = Object.freeze([
  'cuentas', 'ingresos', 'ingresosPuntuales', 'transferencias', 'gastos', 'categoriasPersonalizadas',
  'compromisos', 'metas', 'apartados', 'presupuestos', 'personales', 'perfiles', 'inversiones',
]);

/** Colección de las claves de primer nivel que viajan enteras. */
export const RAIZ = '_raiz';

/** Huella de un registro borrado. */
export const BORRADO = '-';

/** Lo que nunca viaja: la versión de schema es de cada instalación. */
const _SIN_VIAJE = new Set(['_version']);

/**
 * @typedef {{ h: string, t: number, p: 0|1 }} EntradaLibro
 *   h: huella sincronizada (o BORRADO); t: hora del último cambio (ms);
 *   p: 1 si hay un cambio local por subir.
 * @typedef {{ cursor: string|null, r: Record<string, EntradaLibro> }} Libro
 * @typedef {{ coleccion: string, id: string, datos: any, borrado: boolean, cambiado: number,
 *   version_schema: number, dispositivo?: string, actualizado?: string }} Fila
 */

/** @returns {Libro} */
export function libroVacio() {
  return { cursor: null, r: {} };
}

/**
 * JSON con las claves ordenadas: dos objetos iguales dan el mismo texto
 * aunque sus claves estén en otro orden (Postgres reordena las de un jsonb).
 * @param {any} v
 */
export function estable(v) {
  if (v === undefined) return 'null';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(x => estable(x)).join(',')}]`;
  return `{${Object.keys(v).filter(k => v[k] !== undefined).sort()
    .map(k => `${JSON.stringify(k)}:${estable(v[k])}`).join(',')}}`;
}

/**
 * Huella de 53 bits (cyrb53) del JSON estable.
 * @param {any} v
 */
export function huella(v) {
  const s = estable(v);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** La config que viaja: sin el PIN, que es de cada dispositivo (096 D1). */
function _configSinPin(config) {
  if (!config || typeof config !== 'object') return config;
  const { bloqueo: _pin, ...resto } = config;
  return resto;
}

const _esColeccionDeRegistros = (k, v) =>
  COLECCIONES.includes(k) && Array.isArray(v) && v.every(r => r && typeof r.id === 'string' && r.id);

/**
 * El estado partido en registros.
 * @param {any} estado
 * @returns {Map<string, { coleccion: string, id: string, datos: any }>}
 */
export function registrosDe(estado) {
  const mapa = new Map();
  for (const [k, v] of Object.entries(estado ?? {})) {
    if (_SIN_VIAJE.has(k) || v === undefined) continue;
    if (_esColeccionDeRegistros(k, v)) {
      for (const r of v) mapa.set(`${k}/${r.id}`, { coleccion: k, id: r.id, datos: r });
    } else {
      mapa.set(`${RAIZ}/${k}`, { coleccion: RAIZ, id: k, datos: k === 'config' ? _configSinPin(v) : v });
    }
  }
  return mapa;
}

/**
 * Anota en el libro lo que cambió localmente desde la última pasada.
 * @param {any} estado
 * @param {Libro} libro
 * @param {number} ahora - ms.
 * @returns {Libro}
 */
export function marcarCambios(estado, libro, ahora) {
  const r = { ...libro.r };
  const actuales = registrosDe(estado);
  for (const [clave, reg] of actuales) {
    const h = huella(reg.datos);
    if (r[clave]?.h !== h) r[clave] = { h, t: ahora, p: 1 };
  }
  for (const clave of Object.keys(r)) {
    if (!actuales.has(clave) && r[clave].h !== BORRADO) r[clave] = { h: BORRADO, t: ahora, p: 1 };
  }
  return { ...libro, r };
}

/** "coleccion/id" → [coleccion, id]; el id puede traer barras. */
function _partir(clave) {
  const i = clave.indexOf('/');
  return [clave.slice(0, i), clave.slice(i + 1)];
}

/**
 * Las filas por subir: los registros con un cambio local pendiente.
 * @param {any} estado
 * @param {Libro} libro
 * @param {{ version: number, dispositivo: string }} meta
 * @returns {Fila[]}
 */
export function filasPendientes(estado, libro, { version, dispositivo }) {
  const actuales = registrosDe(estado);
  const filas = [];
  for (const [clave, e] of Object.entries(libro.r)) {
    if (!e.p) continue;
    const [coleccion, id] = _partir(clave);
    const borrado = e.h === BORRADO;
    const reg = actuales.get(clave);
    if (!borrado && !reg) continue;
    filas.push({
      coleccion, id, datos: borrado ? null : reg.datos, borrado, cambiado: e.t, version_schema: version, dispositivo,
    });
  }
  return filas;
}

/**
 * Tras subir, deja como sincronizados los registros que no volvieron a
 * cambiar mientras viajaban.
 * @param {Libro} libro
 * @param {Fila[]} filas
 * @returns {Libro}
 */
export function confirmarSubidas(libro, filas) {
  const r = { ...libro.r };
  for (const f of filas) {
    const clave = `${f.coleccion}/${f.id}`;
    const h = f.borrado ? BORRADO : huella(f.datos);
    if (r[clave]?.h === h) r[clave] = { ...r[clave], p: 0 };
  }
  return { ...libro, r };
}

/**
 * Aplica lo que bajó de la nube. No toca el estado: devuelve `parcial`, las
 * claves de primer nivel que cambian (arreglos nuevos, para que la memoria
 * de `infra/memo.js` note el cambio por referencia).
 *
 * @param {any} estado
 * @param {Libro} libro - ya con los cambios locales marcados.
 * @param {Fila[]} filas
 * @param {{ version: number }} meta - la versión de schema de esta app.
 * @returns {{ parcial: Record<string, any>, libro: Libro, aplicadas: number,
 *   versionMinima: number, deAppNueva: number }}
 */
export function aplicarRemotas(estado, libro, filas, { version }) {
  const r = { ...libro.r };
  const parcial = {};
  let aplicadas = 0;
  let versionMinima = version;
  let deAppNueva = 0;
  let cursor = libro.cursor;
  const coleccion = (k) => (parcial[k] ??= Array.isArray(estado?.[k]) ? estado[k].slice() : []);

  const ordenadas = [...filas].sort((a, b) => String(a.actualizado ?? '').localeCompare(String(b.actualizado ?? '')));
  for (const f of ordenadas) {
    if (f.actualizado && (!cursor || f.actualizado > cursor)) cursor = f.actualizado;
    // Escrito por una app más nueva: esta no sabe leerlo sin riesgo.
    if (f.version_schema > version) { deAppNueva++; continue; }
    const clave = `${f.coleccion}/${f.id}`;
    const hRemota = f.borrado ? BORRADO : huella(f.datos);
    const local = r[clave];
    if (local?.h === hRemota) { r[clave] = { ...local, p: 0 }; continue; }
    // Los dos lados cambiaron: gana el más reciente.
    if (local?.p && local.t > f.cambiado) continue;

    if (f.coleccion === RAIZ) {
      if (f.borrado) continue;
      parcial[f.id] = f.id === 'config'
        ? { ...f.datos, ...(estado?.config?.bloqueo ? { bloqueo: estado.config.bloqueo } : {}) }
        : f.datos;
    } else if (COLECCIONES.includes(f.coleccion)) {
      const arr = coleccion(f.coleccion);
      const i = arr.findIndex(x => x?.id === f.id);
      if (f.borrado) { if (i >= 0) arr.splice(i, 1); }
      else if (i >= 0) arr[i] = f.datos;
      else arr.push(f.datos);
    } else {
      continue;
    }
    r[clave] = { h: hRemota, t: f.cambiado, p: 0 };
    aplicadas++;
    if (f.version_schema < versionMinima) versionMinima = f.version_schema;
  }
  return { parcial, libro: { cursor, r }, aplicadas, versionMinima, deAppNueva };
}

/**
 * El estado completo armado desde la nube, para reemplazar el de este
 * dispositivo ("traer"). Parte de la forma del estado local con sus
 * colecciones vacías y conserva su PIN.
 *
 * @param {any} base - el estado local (solo su forma, su config y su PIN).
 * @param {Fila[]} filas - todo lo que hay en la nube.
 * @param {number} version
 * @returns {{ estado: any, libro: Libro }}
 */
export function estadoDesdeNube(base, filas, version) {
  const esqueleto = JSON.parse(JSON.stringify(base ?? {}));
  for (const c of COLECCIONES) esqueleto[c] = [];
  const res = aplicarRemotas(esqueleto, libroVacio(), filas, { version });
  const estado = { ...esqueleto, ...res.parcial, _version: Math.min(version, res.versionMinima) };
  return { estado, libro: res.libro };
}

/**
 * Marca para subir todo lo de este dispositivo y borrar de la nube lo que
 * aquí no está ("subir los de este dispositivo").
 * @param {any} estado
 * @param {Fila[]} filasNube
 * @param {number} ahora
 * @returns {Libro}
 */
export function libroParaReemplazarNube(estado, filasNube, ahora) {
  const libro = marcarCambios(estado, libroVacio(), ahora);
  for (const f of filasNube) {
    const clave = `${f.coleccion}/${f.id}`;
    if (!libro.r[clave] && !f.borrado && f.coleccion !== RAIZ) libro.r[clave] = { h: BORRADO, t: ahora, p: 1 };
  }
  return libro;
}

/**
 * El cursor con un margen hacia atrás: una escritura que empezó antes y
 * terminó después de la última bajada tiene una hora anterior al cursor.
 * Volver a bajar unas filas no cuesta nada: aplicar es idempotente.
 * @param {string|null} cursor
 * @param {number} [margenMs]
 * @returns {string|null}
 */
export function cursorConMargen(cursor, margenMs = 10000) {
  if (!cursor) return null;
  const t = Date.parse(String(cursor).replace(/(\.\d{3})\d+/, '$1'));
  return Number.isFinite(t) ? new Date(t - margenMs).toISOString() : null;
}
