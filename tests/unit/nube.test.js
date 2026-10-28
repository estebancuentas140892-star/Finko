/**
 * nube.test.js - NUBE.1, NUBE.2 y NUBE.2b (ADR 096): el cliente de Supabase de
 * `infra/nube.js`, sus decisiones puras y el bloque de Ajustes. El motor de
 * sincronización tiene su propio archivo (nube-sync.test.js). Sin red:
 * `fetch` se simula y cada prueba revisa el pedido exacto que saldría.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  NUBE_URL, NUBE_CLAVE_PUBLICA, SESION_KEY, ErrorNube, leerSesion, guardarSesion, leerToken,
  capturarEnlaceDeAcceso, pedirAcceso, entrarConCodigo, sesionVigente, cerrarSesion,
  hayRegistros, ultimoCambioNube, bajarRegistros, subirRegistros, borrarRegistros, borrarCuenta,
  leerLibro, guardarLibro, olvidarLibro, LIBRO_KEY, hayDatosLocales, decidirAlEntrar, nombreDispositivo,
  leerVinculo, guardarVinculo, olvidarVinculo, crearCodigoNino, canjearCodigoNino, ninoBajar, ninoSubir,
  vinculosNino, desvincularNino,
} from '../../modules/infra/nube.js';
import {
  htmlNube, haceCuanto, MENSAJES_NUBE, htmlVincularNino, htmlCodigoNino, codigoLegible,
} from '../../modules/dominio/config/nube-view.js';

/** base64url de un JSON en UTF-8, como viene un JWT real. */
const b64 = (o) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
  .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = (payload) => `${b64({ alg: 'HS256' })}.${b64(payload)}.firma`;
const resp = (status, cuerpo) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => cuerpo,
  text: async () => (cuerpo == null ? '' : JSON.stringify(cuerpo)),
});
const ahora = () => Math.floor(Date.now() / 1000);
const sesion = (extra = {}) => ({
  access_token: jwt({ sub: 'u-1', email: 'sofi@correo.co' }),
  refresh_token: 'r-1',
  expires_at: ahora() + 3600,
  usuario: 'u-1',
  email: 'sofi@correo.co',
  ...extra,
});

/** El pedido número `n` que hizo la app: URL, método, cabeceras y cuerpo. */
function pedido(fetchMock, n = 0) {
  const [url, init] = fetchMock.mock.calls[n];
  return { url, metodo: init.method ?? 'GET', h: init.headers, cuerpo: init.body ? JSON.parse(init.body) : null };
}

let fetchMock;
beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('pedir el acceso y entrar (096 D1)', () => {
  it('pide el correo solo para invitados: create_user en falso y la clave pública, sin token', async () => {
    fetchMock.mockResolvedValue(resp(200, {}));
    await pedirAcceso('  sofi@correo.co ', 'https://finko-brown.vercel.app/');
    const p = pedido(fetchMock);
    expect(p.url).toBe(`${NUBE_URL}/auth/v1/otp?redirect_to=${encodeURIComponent('https://finko-brown.vercel.app/')}`);
    expect(p.metodo).toBe('POST');
    expect(p.h.apikey).toBe(NUBE_CLAVE_PUBLICA);
    expect(p.h.Authorization).toBeUndefined();
    expect(p.cuerpo).toEqual({ email: 'sofi@correo.co', create_user: false });
  });

  it('traduce cada respuesta de error a un código que la vista sabe decir', async () => {
    const casos = [
      [resp(422, { code: 422, error_code: 'otp_disabled', msg: 'Signups not allowed for otp' }), 'no-invitado'],
      [resp(429, { msg: 'too many' }), 'demasiados-intentos'],
      [resp(500, { msg: 'boom' }), 'servidor'],
    ];
    for (const [r, codigo] of casos) {
      fetchMock.mockResolvedValueOnce(r);
      await expect(pedirAcceso('x@y.co')).rejects.toMatchObject({ codigo });
    }
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(pedirAcceso('x@y.co')).rejects.toMatchObject({ codigo: 'sin-red' });
    fetchMock.mockResolvedValueOnce(resp(403, { error_code: 'otp_expired', msg: 'Token has expired or is invalid' }));
    await expect(entrarConCodigo('x@y.co', '123456')).rejects.toBeInstanceOf(ErrorNube);
  });

  it('el código abre la sesión de este dispositivo, todavía sin comparar con la nube', async () => {
    fetchMock.mockResolvedValue(resp(200, {
      access_token: jwt({ sub: 'u-1' }), refresh_token: 'r-1', expires_in: 3600,
      user: { id: 'u-1', email: 'sofi@correo.co' },
    }));
    await entrarConCodigo('sofi@correo.co', ' 123 456 ');
    expect(pedido(fetchMock).cuerpo).toEqual({ type: 'email', email: 'sofi@correo.co', token: '123456' });
    const s = leerSesion();
    expect(s).toMatchObject({ usuario: 'u-1', email: 'sofi@correo.co', refresh_token: 'r-1', porDecidir: true });
    expect(s.expires_at).toBeGreaterThan(ahora());
    // La sesión vive en su propia clave, nunca dentro de fk_v1.
    expect(localStorage.getItem('fk_v1')).toBeNull();
    expect(localStorage.getItem(SESION_KEY)).toContain('u-1');
  });

  it('el enlace del correo deja la sesión y limpia el hash antes del router', () => {
    const token = jwt({ sub: 'u-9', email: 'papa@correo.co' });
    history.replaceState(null, '', `/#access_token=${token}&refresh_token=r-9&expires_in=3600&type=magiclink`);
    expect(capturarEnlaceDeAcceso()).toBe('sesion');
    expect(location.hash).toBe('#config');
    expect(leerSesion()).toMatchObject({ usuario: 'u-9', email: 'papa@correo.co', porDecidir: true });

    localStorage.clear();
    history.replaceState(null, '', '/#error=access_denied&error_code=otp_expired&error_description=expired');
    expect(capturarEnlaceDeAcceso()).toBe('error');
    expect(leerSesion()).toBeNull();

    history.replaceState(null, '', '/#gastos');
    expect(capturarEnlaceDeAcceso()).toBeNull();
    expect(location.hash).toBe('#gastos');
  });

  it('lee a quién pertenece un token sin depender de la firma', () => {
    expect(leerToken(jwt({ sub: 'u-1', email: 'ñandú@correo.co' }))).toMatchObject({ email: 'ñandú@correo.co' });
    expect(leerToken('basura')).toEqual({});
  });
});

describe('la sesión se renueva sola y se olvida si ya no sirve', () => {
  it('renueva el token por vencer y conserva lo que anotó el dispositivo', async () => {
    guardarSesion(sesion({ expires_at: ahora() + 10, ultimaSubida: '2026-10-27T10:00:00Z', porDecidir: false }));
    fetchMock.mockResolvedValue(resp(200, { access_token: jwt({ sub: 'u-1' }), refresh_token: 'r-2', expires_in: 3600 }));
    const s = await sesionVigente();
    expect(pedido(fetchMock).url).toBe(`${NUBE_URL}/auth/v1/token?grant_type=refresh_token`);
    expect(pedido(fetchMock).cuerpo).toEqual({ refresh_token: 'r-1' });
    expect(s).toMatchObject({ refresh_token: 'r-2', ultimaSubida: '2026-10-27T10:00:00Z', porDecidir: false });
  });

  it('si la renovación es rechazada, olvida la sesión; sin red, la conserva', async () => {
    guardarSesion(sesion({ expires_at: ahora() - 5 }));
    fetchMock.mockResolvedValueOnce(resp(400, { error_code: 'refresh_token_not_found' }));
    await expect(sesionVigente()).rejects.toMatchObject({ codigo: 'sesion-vencida' });
    expect(leerSesion()).toBeNull();

    guardarSesion(sesion({ expires_at: ahora() - 5 }));
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await expect(sesionVigente()).rejects.toMatchObject({ codigo: 'sin-red' });
    expect(leerSesion()).not.toBeNull();
  });

  it('cerrar sesión la olvida aunque el servidor no conteste, y puede cerrarla en todos lados', async () => {
    guardarSesion(sesion());
    fetchMock.mockRejectedValue(new TypeError('offline'));
    await cerrarSesion({ todos: true });
    expect(pedido(fetchMock).url).toBe(`${NUBE_URL}/auth/v1/logout?scope=global`);
    expect(leerSesion()).toBeNull();
  });
});

describe('los registros en la nube (NUBE.2)', () => {
  beforeEach(() => guardarSesion(sesion()));

  it('sube en lotes con el token del usuario, reemplazando por (usuario, colección, id)', async () => {
    fetchMock.mockResolvedValue(resp(201, null));
    const filas = Array.from({ length: 501 }, (_, i) => ({
      coleccion: 'gastos', id: `g${i}`, datos: { id: `g${i}` }, borrado: false, cambiado: 1, version_schema: 48,
    }));
    await subirRegistros(filas);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const p = pedido(fetchMock);
    expect(p.url).toBe(`${NUBE_URL}/rest/v1/registros?on_conflict=usuario,coleccion,id`);
    expect(p.h.Authorization).toBe(`Bearer ${sesion().access_token}`);
    expect(p.h.Prefer).toContain('resolution=merge-duplicates');
    expect(p.cuerpo).toHaveLength(500);
    expect(p.cuerpo[0]).toMatchObject({ usuario: 'u-1', coleccion: 'gastos', id: 'g0' });
    expect(pedido(fetchMock, 1).cuerpo).toHaveLength(1);
  });

  it('baja desde el cursor, en orden y por páginas', async () => {
    const pagina = Array.from({ length: 500 }, (_, i) => ({ coleccion: 'gastos', id: `g${i}` }));
    fetchMock.mockResolvedValueOnce(resp(200, pagina)).mockResolvedValueOnce(resp(200, [{ coleccion: 'gastos', id: 'ultimo' }]));
    const filas = await bajarRegistros('2026-10-27T10:00:00.000Z');
    expect(filas).toHaveLength(501);
    expect(pedido(fetchMock).url).toContain(`actualizado=gt.${encodeURIComponent('2026-10-27T10:00:00.000Z')}`);
    expect(pedido(fetchMock).url).toContain('order=actualizado.asc');
    expect(pedido(fetchMock, 1).url).toContain('offset=500');
    fetchMock.mockResolvedValueOnce(resp(200, []));
    await bajarRegistros(null);
    expect(pedido(fetchMock, 2).url).not.toContain('actualizado=gt');
  });

  it('sabe si hay algo en la nube, cuál fue el último cambio, y borra solo lo del usuario', async () => {
    fetchMock.mockResolvedValueOnce(resp(200, [{ id: 'g1' }]));
    expect(await hayRegistros()).toBe(true);
    expect(pedido(fetchMock).url).toContain('borrado=eq.false');
    fetchMock.mockResolvedValueOnce(resp(200, []));
    expect(await hayRegistros()).toBe(false);
    fetchMock.mockResolvedValueOnce(resp(200, [{ actualizado: 'x', dispositivo: 'iPhone' }]));
    expect(await ultimoCambioNube()).toEqual({ actualizado: 'x', dispositivo: 'iPhone' });
    fetchMock.mockResolvedValueOnce(resp(204, null));
    await borrarRegistros();
    expect(pedido(fetchMock, 3)).toMatchObject({ metodo: 'DELETE', url: `${NUBE_URL}/rest/v1/registros?usuario=eq.u-1` });
  });

  it('sin sesión no hay pedido', async () => {
    localStorage.clear();
    await expect(bajarRegistros(null)).rejects.toMatchObject({ codigo: 'sin-sesion' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('el libro vive en su propia clave y se puede olvidar', () => {
    expect(leerLibro()).toBeNull();
    guardarLibro({ cursor: 'c', r: { 'gastos/g1': { h: 'x', t: 1, p: 0 } } });
    expect(leerLibro()).toMatchObject({ cursor: 'c' });
    expect(localStorage.getItem(LIBRO_KEY)).toContain('gastos/g1');
    olvidarLibro();
    expect(leerLibro()).toBeNull();
  });
});

describe('borrar la cuenta completa (NUBE.2b)', () => {
  beforeEach(() => guardarSesion(sesion()));

  it('llama a la función del servidor con el token del usuario, sin la clave secreta, y olvida la sesión', async () => {
    fetchMock.mockResolvedValue(resp(204, null));
    await borrarCuenta();
    const p = pedido(fetchMock);
    expect(p).toMatchObject({ metodo: 'POST', url: `${NUBE_URL}/rest/v1/rpc/borrar_mi_cuenta`, cuerpo: {} });
    expect(p.h.apikey).toBe(NUBE_CLAVE_PUBLICA);
    expect(p.h.Authorization).toBe(`Bearer ${sesion().access_token}`);
    expect(leerSesion()).toBeNull();
  });

  it('si la nube no contesta, la sesión queda para volver a intentar', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await expect(borrarCuenta()).rejects.toMatchObject({ codigo: 'sin-red' });
    fetchMock.mockResolvedValueOnce(resp(500, { message: 'boom' }));
    await expect(borrarCuenta()).rejects.toMatchObject({ codigo: 'servidor' });
    expect(leerSesion()).not.toBeNull();
  });

  it('sin sesión no hay pedido', async () => {
    localStorage.clear();
    await expect(borrarCuenta()).rejects.toMatchObject({ codigo: 'sin-sesion' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('la función solo borra a quien la llama y nadie sin sesión la puede llamar', () => {
    const sql = readFileSync(resolve(process.cwd(), 'supabase/003-borrar-cuenta.sql'), 'utf-8');
    expect(sql).toMatch(/function public\.borrar_mi_cuenta\(\)/);
    expect(sql).toMatch(/security definer\s+set search_path = ''/);
    expect(sql).toMatch(/delete from auth\.users where id = yo;/);
    expect(sql).toMatch(/yo uuid := auth\.uid\(\);/);
    expect(sql).toMatch(/revoke all on function public\.borrar_mi_cuenta\(\) from public, anon, authenticated;/);
    expect(sql).toMatch(/grant execute on function public\.borrar_mi_cuenta\(\) to authenticated;/);
  });

  it('toda tabla con datos de un usuario cae con él: si no, borrar la cuenta la dejaría atrás', () => {
    const dir = resolve(process.cwd(), 'supabase');
    const columnas = readdirSync(dir).filter(f => f.endsWith('.sql'))
      .flatMap(f => readFileSync(resolve(dir, f), 'utf-8').split('\n').map(l => [f, l.trim()]))
      .filter(([, l]) => /^usuario\s+uuid\b/i.test(l));
    for (const [f, l] of columnas) {
      expect(l, f).toMatch(/references auth\.users \(id\) on delete cascade/i);
    }
  });
});

describe('al entrar nunca se pisa un lado sin preguntar', () => {
  const conDatos = { gastos: [{ id: 'g1' }], config: {} };
  const vacio = { gastos: [], cuentas: [], config: {}, onboarded: true };

  it('cuenta como datos cualquier registro, y el onboarding solo no', () => {
    expect(hayDatosLocales(vacio)).toBe(false);
    expect(hayDatosLocales(conDatos)).toBe(true);
    expect(hayDatosLocales({ perfiles: [{ id: 'n' }] })).toBe(true);
  });

  it('nube vacía sube; con datos en la nube y nada aquí trae; con los dos, pregunta', () => {
    expect(decidirAlEntrar({ local: conDatos, hayEnNube: false })).toBe('subir');
    expect(decidirAlEntrar({ local: vacio, hayEnNube: true })).toBe('traer');
    expect(decidirAlEntrar({ local: conDatos, hayEnNube: true })).toBe('preguntar');
  });

  it('nombra el dispositivo de donde viene un respaldo', () => {
    expect(nombreDispositivo('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('iPhone');
    expect(nombreDispositivo('Mozilla/5.0 (Linux; Android 14) Mobile Safari')).toBe('Celular Android');
    expect(nombreDispositivo('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Computador Windows');
  });
});

describe('el bloque "Guardar en la nube" de Ajustes', () => {
  const base = { sesion: null, paso: 'correo', correo: '', ocupado: false, error: '', ultimaSubida: '', pendiente: false, eleccion: null };

  it('sin sesión pide el correo y la autorización, y dice que es solo para invitados', () => {
    const html = htmlNube(base);
    expect(html).toContain('id="form-nube-correo"');
    expect(html).toContain('id="nube-autoriza"');
    expect(html).toContain('padre, madre o representante legal');
    expect(html).toContain('invitados a la prueba');
    expect(html).not.toContain('data-action="nube-cerrar"');
    // Tras un error el panel se repinta: la autorización marcada no se pierde.
    expect(htmlNube({ ...base, autoriza: true, error: 'no-invitado' })).toMatch(/id="nube-autoriza" checked/);
  });

  it('después de pedir el acceso, espera el enlace o el código, con el correo escapado', () => {
    const html = htmlNube({ ...base, paso: 'codigo', correo: '<b>x</b>@y.co', error: 'codigo-invalido' });
    expect(html).toContain('id="form-nube-codigo"');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;@y.co');
    expect(html).toContain(MENSAJES_NUBE['codigo-invalido']);
    expect(html).toContain('data-action="nube-otro-correo"');
  });

  it('con datos en los dos lados solo ofrece elegir: nada se sube mientras tanto', () => {
    const html = htmlNube({
      ...base, sesion: { email: 'sofi@correo.co' },
      eleccion: { actualizado: new Date().toISOString(), dispositivo: 'iPhone' },
    });
    expect(html).toContain('data-action="nube-traer"');
    expect(html).toContain('data-action="nube-subir-local"');
    expect(html).toContain('desde iPhone');
    expect(html).not.toContain('data-action="nube-sincronizar"');
  });

  it('conectado, muestra la cuenta, la última sincronización y cómo salir o borrar', () => {
    const html = htmlNube({ ...base, sesion: { email: 'sofi@correo.co' }, ultimaSubida: new Date().toISOString() });
    expect(html).toContain('sofi@correo.co');
    expect(html).toContain('hace un momento');
    for (const a of ['nube-sincronizar', 'nube-traer', 'nube-cerrar', 'nube-cerrar-todo', 'nube-borrar', 'nube-borrar-cuenta']) {
      expect(html).toContain(`data-action="${a}"`);
    }
    expect(html).toContain('Borrar mi cuenta');
    expect(html).toContain('Lo de este dispositivo se queda.');
  });

  it('dice hace cuánto en palabras', () => {
    const ahoraFija = new Date('2026-10-27T12:00:00Z');
    expect(haceCuanto('2026-10-27T11:59:30Z', ahoraFija)).toBe('hace un momento');
    expect(haceCuanto('2026-10-27T11:45:00Z', ahoraFija)).toBe('hace 15 min');
    expect(haceCuanto('2026-10-27T09:00:00Z', ahoraFija)).toBe('hace 3 h');
    expect(haceCuanto('basura', ahoraFija)).toBe('');
  });
});

describe('el teléfono del niño (NUBE.3)', () => {
  it('el padre pide el código con su sesión y su autorización', async () => {
    guardarSesion(sesion());
    fetchMock.mockResolvedValue(resp(200, 'ABCD2345'));
    expect(await crearCodigoNino('n-sofi', { version: '0.2' })).toBe('ABCD2345');
    const p = pedido(fetchMock);
    expect(p.url).toBe(`${NUBE_URL}/rest/v1/rpc/crear_codigo_nino`);
    expect(p.h.Authorization).toBe(`Bearer ${sesion().access_token}`);
    expect(p.cuerpo).toEqual({ p_nino_id: 'n-sofi', p_autorizacion: { version: '0.2' } });
  });

  it('el teléfono del niño canjea sin sesión y entiende los avisos de la base', async () => {
    fetchMock.mockResolvedValueOnce(resp(200, [{ token: 't'.repeat(64), nino: 'n-sofi' }]));
    expect(await canjearCodigoNino('abcd-2345', 'iPhone')).toEqual({ token: 't'.repeat(64), ninoId: 'n-sofi' });
    expect(pedido(fetchMock).h.Authorization).toBeUndefined();
    expect(pedido(fetchMock).cuerpo).toEqual({ p_codigo: 'abcd-2345', p_dispositivo: 'iPhone' });

    fetchMock.mockResolvedValueOnce(resp(400, { code: 'P0001', message: 'codigo-invalido' }));
    await expect(canjearCodigoNino('X', 'iPhone')).rejects.toMatchObject({ codigo: 'codigo-invalido' });
    fetchMock.mockResolvedValueOnce(resp(400, { code: 'P0001', message: 'vinculo-invalido' }));
    await expect(ninoBajar('t', null)).rejects.toMatchObject({ codigo: 'vinculo-invalido' });
  });

  it('baja por páginas con el token y sube en lotes', async () => {
    fetchMock.mockResolvedValueOnce(resp(200, Array.from({ length: 500 }, (_, i) => ({ id: `x${i}` }))))
      .mockResolvedValueOnce(resp(200, []));
    expect(await ninoBajar('tok', '2026-10-27T10:00:00.000Z')).toHaveLength(500);
    expect(pedido(fetchMock).cuerpo).toEqual({ p_token: 'tok', p_desde: '2026-10-27T10:00:00.000Z', p_offset: 0 });
    expect(pedido(fetchMock, 1).cuerpo.p_offset).toBe(500);

    fetchMock.mockResolvedValue(resp(200, 1));
    await ninoSubir('tok', [{ coleccion: 'nino-mov', id: 'n~m' }]);
    expect(pedido(fetchMock, 2)).toMatchObject({ url: `${NUBE_URL}/rest/v1/rpc/nino_subir`, cuerpo: { p_token: 'tok' } });
  });

  it('el padre ve y desvincula los teléfonos', async () => {
    guardarSesion(sesion());
    fetchMock.mockResolvedValueOnce(resp(200, [{ nino_id: 'n-sofi', dispositivo: 'iPhone' }]));
    expect(await vinculosNino()).toHaveLength(1);
    fetchMock.mockResolvedValueOnce(resp(204, null));
    await desvincularNino('n-sofi');
    expect(pedido(fetchMock, 1)).toMatchObject({ metodo: 'DELETE', url: `${NUBE_URL}/rest/v1/vinculos_nino?nino_id=eq.n-sofi` });
  });

  it('el vínculo vive en su propia clave', () => {
    expect(leerVinculo()).toBeNull();
    guardarVinculo({ token: 't', ninoId: 'n-sofi' });
    expect(leerVinculo()).toEqual({ token: 't', ninoId: 'n-sofi' });
    olvidarVinculo();
    expect(leerVinculo()).toBeNull();
  });

  it('"Su teléfono": sin cuenta explica, con cuenta pide la autorización y luego muestra el código', () => {
    const nino = { id: 'n-sofi', nombre: 'Sofía' };
    expect(htmlVincularNino({ nino, sesion: false, paso: 'autorizar', vinculos: [] })).toContain('Guardar en la nube');
    const autorizar = htmlVincularNino({ nino, sesion: true, paso: 'autorizar', vinculos: [], error: 'autorizacion-nino' });
    expect(autorizar).toContain('id="form-nube-vincular"');
    expect(autorizar).toContain('id="nube-representante"');
    expect(autorizar).toContain('id="nube-escuchado"');
    expect(autorizar).toContain(MENSAJES_NUBE['autorizacion-nino']);
    const codigo = htmlVincularNino({
      nino, sesion: true, paso: 'codigo', codigo: 'ABCD2345',
      vinculos: [{ dispositivo: 'Celular Android', ultimo_uso: new Date().toISOString() }],
    });
    expect(codigo).toContain('ABCD-2345');
    expect(codigo).toContain('Celular Android: sincronizó hace un momento');
    expect(codigo).toContain('data-action="nube-desvincular-nino" data-id="n-sofi"');
    expect(codigoLegible('ABC')).toBe('ABC');
  });

  it('la pantalla del niño pide el código con su voz', () => {
    const html = htmlCodigoNino({ error: 'codigo-invalido' });
    expect(html).toContain('id="form-nube-codigo-nino"');
    expect(html).toContain('Entra con tu código');
    expect(html).toContain(MENSAJES_NUBE['codigo-invalido']);
    expect(html).toContain('data-action="nube-codigo-nino-volver"');
  });
});

