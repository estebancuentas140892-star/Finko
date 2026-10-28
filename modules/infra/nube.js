/**
 * infra/nube.js - cliente mínimo de Supabase para la nube de Finko (NUBE.1,
 * ADR 096).
 *
 * Sin librería: la autenticación y la API de datos de Supabase son REST, y
 * para lo que usa NUBE.1 (pedir el acceso por correo, entrar, renovar la
 * sesión y leer o escribir un respaldo) alcanza con `fetch`. Menos código de
 * terceros dentro del repo (ADN 1, SECURITY.md sección 4).
 *
 * La sesión vive en su propia clave (`fk_nube`), fuera de `fk_v1`: es de este
 * dispositivo, no viaja en los respaldos ni en la nube. Las funciones puras
 * de abajo (qué subir, qué hacer al entrar) no tocan red ni DOM.
 */

export const NUBE_URL = 'https://dqfpryvnerbluxmboick.supabase.co';

/**
 * Clave pública del proyecto. Va en el cliente por diseño: la barrera son
 * las reglas RLS de cada tabla (SECURITY.md sección 8). La secreta nunca.
 */
export const NUBE_CLAVE_PUBLICA = 'sb_publishable_RtnCD5_Ds3EA0ENJa340Fg_pL8_9goY';

/** Clave de localStorage de la sesión de este dispositivo. */
export const SESION_KEY = 'fk_nube';

/** Segundos antes del vencimiento en que el token se renueva. */
const _MARGEN_S = 60;

/**
 * @typedef {Object} SesionNube
 * @property {string} access_token
 * @property {string} refresh_token
 * @property {number} expires_at   - segundos Unix.
 * @property {string} usuario      - id del usuario en Supabase.
 * @property {string} email
 * @property {boolean} [porDecidir] - recién entró: falta comparar con la nube.
 */

/** Error con un código que la vista traduce a un mensaje humano. */
export class ErrorNube extends Error {
  /**
   * @param {'no-invitado'|'codigo-invalido'|'demasiados-intentos'|'sin-red'|'sesion-vencida'|'sin-sesion'|'servidor'} codigo
   * @param {string} [detalle]
   */
  constructor(codigo, detalle = '') {
    super(detalle || codigo);
    this.name = 'ErrorNube';
    this.codigo = codigo;
  }
}

// ── SESIÓN ────────────────────────────────────────────────────────

/** @returns {SesionNube | null} */
export function leerSesion() {
  try {
    const s = JSON.parse(localStorage.getItem(SESION_KEY) ?? 'null');
    return s && s.access_token && s.refresh_token ? s : null;
  } catch {
    return null;
  }
}

/** @param {SesionNube} sesion */
export function guardarSesion(sesion) {
  localStorage.setItem(SESION_KEY, JSON.stringify(sesion));
}

/** Olvida la sesión de este dispositivo, sin avisarle al servidor. */
export function olvidarSesion() {
  localStorage.removeItem(SESION_KEY);
}

/**
 * Lee `sub` y `email` del token sin verificarlo: la firma la verifica
 * Supabase en cada pedido; acá solo se muestra a quién pertenece.
 * @param {string} token
 * @returns {{ sub?: string, email?: string, exp?: number }}
 */
export function leerToken(token) {
  try {
    const parte = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(Array.from(atob(parte), c => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

/**
 * Arma la sesión desde la respuesta de Supabase (verificar o renovar).
 * @param {any} r
 * @param {number} [ahora] - segundos Unix.
 * @returns {SesionNube}
 */
export function sesionDesdeRespuesta(r, ahora = Math.floor(Date.now() / 1000)) {
  const datos = leerToken(r.access_token);
  return {
    access_token:  r.access_token,
    refresh_token: r.refresh_token,
    expires_at:    Number(r.expires_at) || ahora + (Number(r.expires_in) || 3600),
    usuario:       r.user?.id ?? datos.sub ?? '',
    email:         r.user?.email ?? datos.email ?? '',
  };
}

/**
 * El enlace del correo vuelve a Finko con la sesión en el hash
 * (`#access_token=...&refresh_token=...`), que choca con las rutas de la
 * app. Se llama en el arranque, antes del router: guarda la sesión y deja
 * el hash en `#config`. Devuelve qué encontró.
 *
 * @param {Location} [loc]
 * @returns {'sesion'|'error'|null}
 */
export function capturarEnlaceDeAcceso(loc = location) {
  const hash = String(loc.hash || '');
  if (!hash.includes('access_token=') && !hash.includes('error_description=')) return null;
  const p = new URLSearchParams(hash.slice(1));
  const destino = `${loc.pathname}${loc.search}#config`;
  history.replaceState(null, '', destino);
  if (!p.get('access_token') || !p.get('refresh_token')) {
    _resultadoEnlace = 'error';
    return 'error';
  }
  guardarSesion({
    ...sesionDesdeRespuesta(Object.fromEntries(p)),
    porDecidir: true,
  });
  _resultadoEnlace = 'sesion';
  return 'sesion';
}

/** @type {'sesion'|'error'|null} */
let _resultadoEnlace = null;

/** Qué encontró `capturarEnlaceDeAcceso()` en este arranque. */
export function resultadoEnlace() {
  return _resultadoEnlace;
}

// ── PEDIDOS ──────────────────────────────────────────────────────

/**
 * @param {string} ruta
 * @param {RequestInit & { token?: string }} opciones
 */
async function _pedir(ruta, { token, headers = {}, ...resto } = {}) {
  let res;
  try {
    res = await fetch(`${NUBE_URL}${ruta}`, {
      ...resto,
      headers: {
        apikey: NUBE_CLAVE_PUBLICA,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch (err) {
    throw new ErrorNube('sin-red', String(err?.message ?? err));
  }
  if (res.ok) return res.status === 204 ? null : res.text().then(t => (t ? JSON.parse(t) : null));

  let cuerpo = {};
  try { cuerpo = await res.json(); } catch { /* cuerpo vacío */ }
  const codigo = cuerpo.error_code ?? cuerpo.code ?? '';
  const detalle = cuerpo.msg ?? cuerpo.message ?? cuerpo.error_description ?? `HTTP ${res.status}`;
  if (res.status === 429 || codigo === 'over_email_send_rate_limit') throw new ErrorNube('demasiados-intentos', detalle);
  if (codigo === 'otp_disabled' || codigo === 'signup_disabled' || /signups not allowed/i.test(detalle)) {
    throw new ErrorNube('no-invitado', detalle);
  }
  if (codigo === 'otp_expired' || (ruta.startsWith('/auth/v1/verify') && res.status < 500)) {
    throw new ErrorNube('codigo-invalido', detalle);
  }
  throw new ErrorNube('servidor', detalle);
}

/**
 * Manda el correo de acceso. Solo a correos ya invitados: el registro
 * abierto está apagado en el proyecto y `create_user` va en falso.
 *
 * @param {string} email
 * @param {string} [volverA] - adónde lleva el enlace del correo.
 */
export async function pedirAcceso(email, volverA = `${location.origin}${location.pathname}`) {
  await _pedir(`/auth/v1/otp?redirect_to=${encodeURIComponent(volverA)}`, {
    method: 'POST',
    body: JSON.stringify({ email: String(email).trim(), create_user: false }),
  });
}

/**
 * Entra con el código del correo.
 * @param {string} email
 * @param {string} codigo
 * @returns {Promise<SesionNube>}
 */
export async function entrarConCodigo(email, codigo) {
  const r = await _pedir('/auth/v1/verify', {
    method: 'POST',
    body: JSON.stringify({ type: 'email', email: String(email).trim(), token: String(codigo).replace(/\s/g, '') }),
  });
  const sesion = { ...sesionDesdeRespuesta(r), porDecidir: true };
  guardarSesion(sesion);
  return sesion;
}

/**
 * Token vigente, renovándolo si está por vencer. Si la renovación falla
 * porque la sesión ya no existe, la olvida.
 * @param {number} [ahora] - segundos Unix.
 * @returns {Promise<SesionNube>}
 */
export async function sesionVigente(ahora = Math.floor(Date.now() / 1000)) {
  const s = leerSesion();
  if (!s) throw new ErrorNube('sin-sesion');
  if (s.expires_at - _MARGEN_S > ahora) return s;
  try {
    const r = await _pedir('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    // Conserva lo que el dispositivo anotó en la sesión (porDecidir, ultimaSubida).
    const nueva = { ...s, ...sesionDesdeRespuesta(r, ahora) };
    guardarSesion(nueva);
    return nueva;
  } catch (err) {
    if (err instanceof ErrorNube && err.codigo !== 'sin-red') {
      olvidarSesion();
      throw new ErrorNube('sesion-vencida', err.message);
    }
    throw err;
  }
}

/**
 * Cierra la sesión: en este dispositivo o en todos. La local se olvida
 * aunque el servidor no conteste.
 * @param {{ todos?: boolean }} [opciones]
 */
export async function cerrarSesion({ todos = false } = {}) {
  const s = leerSesion();
  olvidarSesion();
  if (!s) return;
  try {
    await _pedir(`/auth/v1/logout?scope=${todos ? 'global' : 'local'}`, { method: 'POST', token: s.access_token });
  } catch { /* la sesión local ya se olvidó */ }
}

// ── RESPALDO ─────────────────────────────────────────────────────

/**
 * @typedef {Object} RespaldoNube
 * @property {any} datos
 * @property {number} version_schema
 * @property {string} actualizado - ISO.
 * @property {string} [dispositivo]
 */

/** @returns {Promise<RespaldoNube | null>} */
export async function leerRespaldo() {
  const s = await sesionVigente();
  const filas = await _pedir('/rest/v1/respaldos?select=datos,version_schema,actualizado,dispositivo&limit=1', {
    token: s.access_token,
  });
  return Array.isArray(filas) && filas.length ? filas[0] : null;
}

/**
 * Reemplaza el respaldo del usuario en la nube.
 * @param {any} datos - el estado, ya preparado con `copiaParaNube()`.
 * @param {number} versionSchema
 * @param {string} dispositivo
 * @returns {Promise<string>} la fecha ISO con que quedó.
 */
export async function guardarRespaldo(datos, versionSchema, dispositivo) {
  const s = await sesionVigente();
  const actualizado = new Date().toISOString();
  await _pedir('/rest/v1/respaldos?on_conflict=usuario', {
    method: 'POST',
    token: s.access_token,
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ usuario: s.usuario, datos, version_schema: versionSchema, actualizado, dispositivo }),
  });
  return actualizado;
}

/** Borra el respaldo del usuario en la nube. */
export async function borrarRespaldo() {
  const s = await sesionVigente();
  await _pedir(`/rest/v1/respaldos?usuario=eq.${encodeURIComponent(s.usuario)}`, {
    method: 'DELETE',
    token: s.access_token,
  });
}

// ── DECISIONES PURAS ─────────────────────────────────────────────

/** Colecciones que cuentan como "datos" del usuario. */
const _COLECCIONES = [
  'cuentas', 'ingresos', 'ingresosPuntuales', 'transferencias', 'gastos', 'compromisos',
  'metas', 'apartados', 'presupuestos', 'personales', 'inversiones', 'perfiles',
];

/**
 * ¿Hay algo que perder en este dispositivo? Un estado recién instalado (o
 * solo con el onboarding) no tiene registros.
 * @param {any} estado
 */
export function hayDatosLocales(estado) {
  return _COLECCIONES.some(c => Array.isArray(estado?.[c]) && estado[c].length > 0);
}

/**
 * Qué hacer al entrar: subir lo de acá, traer lo de la nube o preguntar.
 * Nunca se pisa nada sin preguntar cuando los dos lados tienen datos.
 * @param {{ local: any, respaldo: RespaldoNube | null }} p
 * @returns {'subir'|'traer'|'preguntar'}
 */
export function decidirAlEntrar({ local, respaldo }) {
  if (!respaldo) return 'subir';
  if (!hayDatosLocales(local)) return 'traer';
  return 'preguntar';
}

/**
 * Lo que sube: el estado completo menos el PIN, que es de cada dispositivo
 * (ADR 096 D1, 063). No modifica el original.
 * @param {any} estado
 */
export function copiaParaNube(estado) {
  const copia = JSON.parse(JSON.stringify(estado));
  if (copia.config) delete copia.config.bloqueo;
  return copia;
}

/**
 * Lo que se restaura: el respaldo de la nube con el PIN de este
 * dispositivo, si lo tiene.
 * @param {any} datosNube
 * @param {any} bloqueoLocal
 */
export function prepararRestauracion(datosNube, bloqueoLocal) {
  const copia = JSON.parse(JSON.stringify(datosNube));
  copia.config = { ...(copia.config ?? {}) };
  if (bloqueoLocal) copia.config.bloqueo = bloqueoLocal;
  else delete copia.config.bloqueo;
  return copia;
}

/**
 * Nombre corto del dispositivo, para decir de dónde viene un respaldo.
 * @param {string} [ua]
 */
export function nombreDispositivo(ua = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'Celular Android' : 'Tableta Android';
  if (/Windows/i.test(ua)) return 'Computador Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Computador Linux';
  return 'Otro dispositivo';
}
