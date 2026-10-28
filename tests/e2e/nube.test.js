/**
 * nube.test.js - NUBE.1, NUBE.2 y NUBE.2b (ADR 096): la cuenta en la nube y la
 * sincronización entre dispositivos de punta a punta, con Supabase simulado.
 *
 * Cubre lo que los unitarios no pueden: el formulario de Ajustes, la
 * sincronización que corre sola tras un cambio, el teléfono nuevo que trae
 * todo al entrar, dos dispositivos abiertos a la vez (lo que se agrega o se
 * borra en uno llega al otro), la elección cuando los dos lados tienen
 * datos y borrar la cuenta. La red a Supabase nunca sale: `page.route`
 * contesta como lo haría el proyecto, con su CORS, su tabla `registros` y
 * las funciones de la familia (NUBE.3: el código del padre, el teléfono del
 * niño que solo ve y escribe lo suyo, y el desvínculo).
 */

import { Buffer } from 'node:buffer';
import { test, expect } from '@playwright/test';
import { sembrar, sembrarSiVacio, estadoBase, leerEstado } from './helpers/estado.js';
import { NUBE_URL } from '../../modules/infra/nube.js';
import { createInitialState } from '../../modules/core/state.js';

const CORREO = 'sofi@correo.co';
const CODIGO = '123456';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const TOKEN = `${b64({ alg: 'HS256' })}.${b64({ sub: 'u-sofi', email: CORREO })}.firma`;
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'apikey, authorization, content-type, prefer',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
};

const BANCOLOMBIA = { id: 'c-1', nombre: 'Bancolombia', tipo: 'ahorros', saldo: 5000000, activa: true };
const SOFIA = { id: 'n-sofi', nombre: 'Sofía', edad: 8, dibujo: 'cometa', teNombra: 'Papá', creado: '2026-10-25' };

/** Candado con PIN 1234 (mismo de perfiles.test.js): con niños es obligatorio. */
const CANDADO_1234 = {
  hash: 'e3174484ebeec68f0933b4a5518a7ce757ff61899a332e68004eef36a36e788b',
  salt: '5de4f0acfa29e71ebc0497c3d5bf15b2',
  creado: '2026-10-25',
};
const conCandado = () => {
  const { legalAceptado: _sinAceptacion, ...config } = createInitialState().config;
  return { ...config, bloqueo: CANDADO_1234 };
};
const NEQUI = { id: 'c-2', nombre: 'Nequi', tipo: 'ahorros', saldo: 80000, activa: true };

/**
 * Un Supabase de mentira, compartido entre los dispositivos de una prueba:
 * la tabla `registros` con su hora de servidor, sus filtros y su upsert.
 */
function supabaseFalso() {
  const tabla = new Map();
  const codigos = new Map();
  const vinculos = [];
  const nube = { tabla, vinculos, subidas: 0, cuentaBorrada: false, borradaCon: '', fila: (col, id) => tabla.get(`${col}/${id}`) };
  let reloj = Date.parse('2026-10-27T10:00:00Z');
  const guardar = (f) => {
    reloj += 1000;
    tabla.set(`${f.coleccion}/${f.id}`, { ...f, actualizado: new Date(reloj).toISOString() });
  };
  const delNino = (f, nino) => (f.coleccion === 'nino-aprende' && f.id === nino)
    || (['nino-mov', 'nino-metas'].includes(f.coleccion) && f.id.startsWith(`${nino}~`));

  const instalar = (page) => page.route(`${NUBE_URL}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const q = url.searchParams;
    const responder = (status, cuerpo) => route.fulfill({
      status, headers: { ...CORS, 'content-type': 'application/json' },
      body: cuerpo == null ? '' : JSON.stringify(cuerpo),
    });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (url.pathname === '/auth/v1/otp') {
      return req.postDataJSON().email === CORREO && !nube.cuentaBorrada
        ? responder(200, {})
        : responder(422, { code: 422, error_code: 'otp_disabled', msg: 'Signups not allowed for otp' });
    }
    if (url.pathname === '/auth/v1/verify') {
      return req.postDataJSON().token === CODIGO
        ? responder(200, { access_token: TOKEN, refresh_token: 'r-1', expires_in: 3600, user: { id: 'u-sofi', email: CORREO } })
        : responder(403, { error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
    }
    if (url.pathname === '/rest/v1/rpc/borrar_mi_cuenta') {
      // El usuario se va y, en cascada, sus registros y los teléfonos de sus niños (supabase/003-borrar-cuenta.sql).
      nube.cuentaBorrada = true;
      nube.borradaCon = req.headers().authorization ?? '';
      tabla.clear();
      vinculos.length = 0;
      return responder(204, null);
    }
    const aviso = (mensaje) => responder(400, { code: 'P0001', message: mensaje });
    if (url.pathname === '/rest/v1/rpc/crear_codigo_nino') {
      const { p_nino_id } = req.postDataJSON();
      if (!nube.fila('perfiles', p_nino_id)) return aviso('nino-sin-sincronizar');
      codigos.set('ABCD2345', p_nino_id);
      return responder(200, 'ABCD2345');
    }
    if (url.pathname === '/rest/v1/rpc/canjear_codigo_nino') {
      const codigo = String(req.postDataJSON().p_codigo).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const nino = codigos.get(codigo);
      if (!nino) return aviso('codigo-invalido');
      codigos.delete(codigo);
      const token = `tok-${vinculos.length}-${'x'.repeat(56)}`;
      vinculos.push({ token, nino_id: nino, dispositivo: req.postDataJSON().p_dispositivo, creado: new Date(reloj).toISOString() });
      return responder(200, [{ token, nino }]);
    }
    if (url.pathname === '/rest/v1/rpc/nino_bajar' || url.pathname === '/rest/v1/rpc/nino_subir') {
      const cuerpo = req.postDataJSON();
      const v = vinculos.find(x => x.token === cuerpo.p_token);
      if (!v) return aviso('vinculo-invalido');
      v.ultimo_uso = new Date(reloj).toISOString();
      if (url.pathname.endsWith('nino_subir')) {
        if (!cuerpo.p_filas.every(f => delNino(f, v.nino_id))) return aviso('fuera-del-nino');
        cuerpo.p_filas.forEach(guardar);
        return responder(200, cuerpo.p_filas.length);
      }
      const filas = [...tabla.values()]
        .filter(f => (f.coleccion === 'perfiles' && f.id === v.nino_id) || delNino(f, v.nino_id))
        .filter(f => !cuerpo.p_desde || Date.parse(f.actualizado) > Date.parse(cuerpo.p_desde))
        .sort((a, b) => a.actualizado.localeCompare(b.actualizado));
      return responder(200, filas.slice(cuerpo.p_offset ?? 0, (cuerpo.p_offset ?? 0) + 500));
    }
    if (url.pathname === '/rest/v1/vinculos_nino') {
      if (req.method() === 'DELETE') {
        const nino = q.get('nino_id')?.replace(/^eq\./, '');
        for (let i = vinculos.length - 1; i >= 0; i--) if (vinculos[i].nino_id === nino) vinculos.splice(i, 1);
        return responder(204, null);
      }
      return responder(200, vinculos.map(({ token: _t, ...v }) => v));
    }
    if (url.pathname === '/rest/v1/registros') {
      if (req.method() === 'POST') {
        req.postDataJSON().forEach(guardar);
        nube.subidas++;
        return responder(201, null);
      }
      if (req.method() === 'DELETE') { tabla.clear(); return responder(204, null); }
      let filas = [...tabla.values()];
      if (q.get('borrado') === 'eq.false') filas = filas.filter(f => !f.borrado);
      const gt = q.get('actualizado')?.replace(/^gt\./, '');
      if (gt) filas = filas.filter(f => Date.parse(f.actualizado) > Date.parse(gt));
      filas.sort((a, b) => a.actualizado.localeCompare(b.actualizado));
      if (q.get('order') === 'actualizado.desc') filas.reverse();
      const offset = Number(q.get('offset') ?? 0);
      const limit = Number(q.get('limit') ?? 1000);
      return responder(200, filas.slice(offset, offset + limit));
    }
    return responder(404, { msg: 'ruta no simulada' });
  });
  return { nube, instalar };
}

/** Llena el acceso de Ajustes con el correo invitado y el código. */
async function entrar(page, { navegar = true } = {}) {
  if (navegar) await page.goto('/#config');
  await page.fill('#nube-correo', CORREO);
  await page.check('#nube-autoriza');
  await page.click('#form-nube-correo [type="submit"]');
  await expect(page.locator('#nube-enviado')).toContainText(CORREO);
  await page.fill('#nube-codigo', CODIGO);
  await page.click('#form-nube-codigo [type="submit"]');
}

/** Cambia las cuentas como lo haría la app (S + save) y espera a que se guarde. */
async function cambiarCuentas(page, fn) {
  await page.evaluate(async (cuerpo) => {
    const { S } = await import('/modules/core/state.js');
    const { save } = await import('/modules/core/storage.js');
    S.cuentas = new Function('cuentas', cuerpo)(S.cuentas);
    save();
  }, fn);
}

const nombresDeCuentas = async (page) => (await leerEstado(page)).cuentas?.map(c => c.nombre).sort();

test.describe('NUBE - cuenta y sincronización entre dispositivos', () => {
  test('perder el teléfono: lo de este dispositivo sube solo y el teléfono nuevo lo trae al entrar', async ({ browser }) => {
    const { nube, instalar } = supabaseFalso();

    const tel1 = await browser.newContext();
    const p1 = await tel1.newPage();
    await instalar(p1);
    await sembrar(p1, estadoBase({ cuentas: [BANCOLOMBIA] }));
    await entrar(p1);
    await expect(p1.locator('#config-nube')).toContainText(`Tu cuenta: ${CORREO}`);
    await expect.poll(() => nube.fila('cuentas', 'c-1')?.datos?.nombre).toBe('Bancolombia');
    // El PIN no viaja (096 D1) y la autorización queda registrada.
    expect(nube.fila('_raiz', 'config').datos.bloqueo).toBeUndefined();
    await expect.poll(() => nube.fila('_raiz', 'config')?.datos?.autorizacionNube?.version).toBe('0.2');

    // Un cambio cualquiera se sincroniza solo, unos segundos después.
    await p1.fill('#config-nombre', 'Sofía Gómez');
    await p1.click('#form-perfil [type="submit"]');
    await expect.poll(() => nube.fila('_raiz', 'perfil')?.datos?.nombre, { timeout: 12_000 }).toBe('Sofía Gómez');
    await tel1.close();

    const tel2 = await browser.newContext();
    const p2 = await tel2.newPage();
    await instalar(p2);
    await sembrarSiVacio(p2, estadoBase());
    await entrar(p2);
    await expect.poll(() => nombresDeCuentas(p2)).toEqual(['Bancolombia']);
    await expect.poll(async () => (await leerEstado(p2)).perfil?.nombre).toBe('Sofía Gómez');
    await tel2.close();
  });

  test('dos dispositivos abiertos: lo que se agrega o se borra en uno llega al otro', async ({ browser }) => {
    const { nube, instalar } = supabaseFalso();
    const cel = await (await browser.newContext()).newPage();
    await instalar(cel);
    await sembrarSiVacio(cel, estadoBase({ cuentas: [BANCOLOMBIA] }));
    await entrar(cel);
    await expect.poll(() => nube.fila('cuentas', 'c-1')?.datos?.nombre).toBe('Bancolombia');

    const pc = await (await browser.newContext()).newPage();
    await instalar(pc);
    await sembrarSiVacio(pc, estadoBase());
    await entrar(pc);
    await expect.poll(() => nombresDeCuentas(pc)).toEqual(['Bancolombia']);

    // El celular agrega Nequi: sube solo y el computador lo trae.
    await cambiarCuentas(cel, `return [...cuentas, ${JSON.stringify(NEQUI)}];`);
    await expect.poll(() => nube.fila('cuentas', 'c-2')?.datos?.nombre, { timeout: 12_000 }).toBe('Nequi');
    await pc.locator('[data-action="nube-sincronizar"]').click();
    await expect.poll(() => nombresDeCuentas(pc)).toEqual(['Bancolombia', 'Nequi']);

    // El computador borra Bancolombia: el borrado viaja como marca.
    await cambiarCuentas(pc, `return cuentas.filter(c => c.id !== 'c-1');`);
    await expect.poll(() => nube.fila('cuentas', 'c-1')?.borrado, { timeout: 12_000 }).toBe(true);
    await cel.locator('[data-action="nube-sincronizar"]').click();
    await expect.poll(() => nombresDeCuentas(cel)).toEqual(['Nequi']);
  });

  test('con datos en los dos lados no sincroniza nada hasta que la persona elige', async ({ browser }) => {
    const { nube, instalar } = supabaseFalso();
    nube.tabla.set('cuentas/c-1', {
      coleccion: 'cuentas', id: 'c-1', datos: BANCOLOMBIA, borrado: false, cambiado: 1,
      version_schema: 48, dispositivo: 'iPhone', actualizado: '2026-10-27T09:00:00.000Z',
    });
    const page = await (await browser.newContext()).newPage();
    await instalar(page);
    await sembrarSiVacio(page, estadoBase({ cuentas: [NEQUI] }));
    await entrar(page);

    await expect(page.locator('#config-nube')).toContainText('Tienes datos aquí y en la nube');
    await expect(page.locator('#config-nube')).toContainText('desde iPhone');
    expect(nube.subidas).toBe(0);

    await page.click('[data-action="nube-traer"]');
    await page.locator('[data-role="confirmar"]').first().click();
    await expect.poll(() => nombresDeCuentas(page)).toEqual(['Bancolombia']);
    expect(nube.subidas).toBe(0);
  });

  test('borrar la cuenta: la nube queda vacía, el correo ya no entra y los datos de aquí se quedan', async ({ page }) => {
    const { nube, instalar } = supabaseFalso();
    await instalar(page);
    await sembrar(page, estadoBase({ cuentas: [BANCOLOMBIA] }));
    await entrar(page);
    await expect.poll(() => nube.fila('cuentas', 'c-1')?.datos?.nombre).toBe('Bancolombia');

    // Confirmación fuerte: el botón no responde hasta escribir BORRAR.
    await page.click('[data-action="nube-borrar-cuenta"]');
    const confirmarBorrado = page.locator('[data-role="confirmar"]');
    await expect(confirmarBorrado).toBeDisabled();
    await page.fill('#confirm-palabra', 'BORRAR');
    await confirmarBorrado.click();

    await expect(page.locator('#form-nube-correo')).toBeVisible();
    expect(nube.cuentaBorrada).toBe(true);
    expect(nube.borradaCon).toBe(`Bearer ${TOKEN}`);
    expect(nube.tabla.size).toBe(0);

    // Este dispositivo queda sin cuenta, con sus datos y sin la autorización de esa cuenta.
    await expect.poll(async () => (await leerEstado(page)).config?.autorizacionNube).toBeUndefined();
    expect(await nombresDeCuentas(page)).toEqual(['Bancolombia']);
    expect(await page.evaluate(() => [localStorage.getItem('fk_nube'), localStorage.getItem('fk_nube_sync')])).toEqual([null, null]);

    // El correo ya no está invitado: no vuelve a entrar.
    await page.fill('#nube-correo', CORREO);
    await page.check('#nube-autoriza');
    await page.click('#form-nube-correo [type="submit"]');
    await expect(page.locator('#config-nube [role="alert"]')).toContainText('no está invitado a la prueba');
  });

  test('un correo no invitado o sin autorización no pide nada', async ({ page }) => {
    const { instalar } = supabaseFalso();
    await instalar(page);
    await sembrar(page, estadoBase());
    await page.goto('/#config');

    await page.fill('#nube-correo', CORREO);
    await page.click('#form-nube-correo [type="submit"]');
    await expect(page.locator('#config-nube [role="alert"]')).toContainText('necesitamos tu autorización');

    await page.fill('#nube-correo', 'otra@correo.co');
    await page.check('#nube-autoriza');
    await page.click('#form-nube-correo [type="submit"]');
    await expect(page.locator('#config-nube [role="alert"]')).toContainText('no está invitado a la prueba');
    // El panel se repintó con el aviso: la autorización sigue marcada.
    await expect(page.locator('#nube-autoriza')).toBeChecked();
  });

  test('familia: el teléfono del niño entra con el código del padre y cada uno ve lo del otro', async ({ browser }) => {
    const { nube, instalar } = supabaseFalso();

    // El padre, con Sofía y su candado, entra a su cuenta.
    const padre = await (await browser.newContext()).newPage();
    await instalar(padre);
    await sembrarSiVacio(padre, estadoBase({ perfil: { nombre: 'Esteban', smmlv: 1750905 }, config: conCandado(), cuentas: [BANCOLOMBIA], perfiles: [SOFIA] }));
    await padre.goto('/#config');
    await padre.locator('#quien-usa[data-open] [data-role="adulto"]').click();
    await padre.fill('#quien-usa-pin', '1234');
    await padre.click('#form-quien-usa-pin [type="submit"]');
    await entrar(padre, { navegar: false });
    await expect.poll(() => nube.fila('perfiles', 'n-sofi')?.datos?.nombre).toBe('Sofía');

    // "Su teléfono": autoriza y recibe el código.
    await padre.click('[data-action="nube-vincular-nino"][data-id="n-sofi"]');
    await padre.click('#form-nube-vincular [type="submit"]');
    await expect(padre.locator('#modal-familia [role="alert"]')).toContainText('Marca las dos casillas');
    await padre.check('#nube-representante');
    await padre.check('#nube-escuchado');
    await padre.click('#form-nube-vincular [type="submit"]');
    await expect(padre.locator('#nube-codigo-generado')).toHaveText('ABCD-2345');

    // El teléfono de Sofía, recién instalado, entra con el código.
    const nino = await (await browser.newContext()).newPage();
    await instalar(nino);
    await nino.goto('/');
    await nino.click('[data-action="nube-codigo-nino"]');
    await nino.fill('#nube-codigo-nino', 'abcd-2345');
    await nino.click('#form-nube-codigo-nino [type="submit"]');
    await expect(nino.locator('#nino-nav')).toBeVisible();
    await expect(nino.locator('#nino-main')).toContainText('Sofía');
    // Su teléfono no tiene adulto: ni las cuentas del padre ni "Cambiar de perfil".
    expect((await leerEstado(nino)).cuentas ?? []).toEqual([]);
    await expect(nino.locator('[data-action="perfil-cambiar"]:visible')).toHaveCount(0);
    expect(nube.vinculos).toHaveLength(1);

    // Sofía anota en su teléfono: sube solo y el padre lo ve.
    await nino.evaluate(async () => {
      const { S } = await import('/modules/core/state.js');
      const { save } = await import('/modules/core/storage.js');
      S.perfiles = S.perfiles.map(p => ({ ...p, movimientos: [...p.movimientos, { id: 'm-tel', fecha: '2026-10-27', frasco: 'ahorrar', monto: 2000, tipo: 'guarde' }] }));
      save();
    });
    await expect.poll(() => nube.fila('nino-mov', 'n-sofi~m-tel')?.datos?.monto, { timeout: 12_000 }).toBe(2000);
    await padre.click('[data-action="nube-cerrar-modal"]');
    await padre.click('[data-action="nube-sincronizar"]');
    await expect.poll(async () => (await leerEstado(padre)).perfiles?.[0]?.movimientos?.map(m => m.id)).toEqual(['m-tel']);

    // El padre cambia la mesada: el teléfono de Sofía la baja.
    await padre.evaluate(async () => {
      const { S } = await import('/modules/core/state.js');
      const { save } = await import('/modules/core/storage.js');
      S.perfiles = S.perfiles.map(p => ({ ...p, mesada: { monto: 15000, frecuencia: 'semanal', dia: 5, reparto: { ahorrar: 50, gastar: 30, compartir: 20 } } }));
      save();
    });
    await expect.poll(() => nube.fila('perfiles', 'n-sofi')?.datos?.mesada?.monto, { timeout: 12_000 }).toBe(15000);
    await nino.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect.poll(async () => (await leerEstado(nino)).perfiles?.[0]?.mesada?.monto).toBe(15000);
    expect((await leerEstado(nino)).perfiles[0].movimientos.map(m => m.id)).toEqual(['m-tel']);

    // El padre desvincula: el teléfono deja de sincronizar y lo dice.
    await padre.click('[data-action="nube-vincular-nino"][data-id="n-sofi"]');
    await padre.click('[data-action="nube-desvincular-nino"]');
    await padre.locator('[data-role="confirmar"]').first().click();
    await expect.poll(() => nube.vinculos.length).toBe(0);
    await nino.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect.poll(() => nino.evaluate(() => localStorage.getItem('fk_nube_nino'))).toBeNull();
    expect((await leerEstado(nino)).perfiles[0].movimientos.map(m => m.id)).toEqual(['m-tel']);
  });
});
