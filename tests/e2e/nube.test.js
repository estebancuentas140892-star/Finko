/**
 * nube.test.js - NUBE.1 (ADR 096): la cuenta en la nube de punta a punta,
 * con Supabase simulado.
 *
 * Cubre lo que los unitarios no pueden: el formulario de Ajustes, la subida
 * automática tras un cambio, el teléfono nuevo que trae todo al entrar y la
 * elección cuando los dos lados tienen datos. La red a Supabase nunca sale:
 * `page.route` contesta como lo haría el proyecto, con su CORS.
 */

import { Buffer } from 'node:buffer';
import { test, expect } from '@playwright/test';
import { sembrar, sembrarSiVacio, estadoBase, leerEstado } from './helpers/estado.js';
import { NUBE_URL } from '../../modules/infra/nube.js';

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
const NEQUI = { id: 'c-2', nombre: 'Nequi', tipo: 'ahorros', saldo: 80000, activa: true };

/**
 * Un Supabase de mentira, compartido entre los "teléfonos" de una prueba.
 * Guarda la fila de `respaldos` y cuenta cuántas veces se subió.
 */
function supabaseFalso() {
  const nube = { fila: null, subidas: 0 };
  const instalar = (page) => page.route(`${NUBE_URL}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const responder = (status, cuerpo) => route.fulfill({
      status, headers: { ...CORS, 'content-type': 'application/json' },
      body: cuerpo == null ? '' : JSON.stringify(cuerpo),
    });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (url.pathname === '/auth/v1/otp') {
      const { email } = req.postDataJSON();
      return email === CORREO
        ? responder(200, {})
        : responder(422, { code: 422, error_code: 'otp_disabled', msg: 'Signups not allowed for otp' });
    }
    if (url.pathname === '/auth/v1/verify') {
      return req.postDataJSON().token === CODIGO
        ? responder(200, { access_token: TOKEN, refresh_token: 'r-1', expires_in: 3600, user: { id: 'u-sofi', email: CORREO } })
        : responder(403, { error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
    }
    if (url.pathname === '/rest/v1/respaldos') {
      if (req.method() === 'GET') return responder(200, nube.fila ? [nube.fila] : []);
      if (req.method() === 'POST') {
        nube.fila = req.postDataJSON();
        nube.subidas++;
        return responder(201, null);
      }
      if (req.method() === 'DELETE') { nube.fila = null; return responder(204, null); }
    }
    return responder(404, { msg: 'ruta no simulada' });
  });
  return { nube, instalar };
}

/** Llena el acceso de Ajustes con el correo invitado y el código. */
async function entrar(page) {
  await page.goto('/#config');
  await page.fill('#nube-correo', CORREO);
  await page.check('#nube-autoriza');
  await page.click('#form-nube-correo [type="submit"]');
  await expect(page.locator('#nube-enviado')).toContainText(CORREO);
  await page.fill('#nube-codigo', CODIGO);
  await page.click('#form-nube-codigo [type="submit"]');
}

test.describe('NUBE.1 - cuenta y respaldo en la nube', () => {
  test('perder el teléfono: lo de este dispositivo sube solo y el teléfono nuevo lo trae al entrar', async ({ browser }) => {
    const { nube, instalar } = supabaseFalso();

    // Teléfono 1: tiene datos y nunca usó la nube.
    const tel1 = await browser.newContext();
    const p1 = await tel1.newPage();
    await instalar(p1);
    await sembrar(p1, estadoBase({ cuentas: [BANCOLOMBIA] }));
    await entrar(p1);
    await expect(p1.locator('#config-nube')).toContainText(`Tu cuenta: ${CORREO}`);
    await expect.poll(() => nube.fila?.datos?.cuentas?.[0]?.nombre).toBe('Bancolombia');
    // El PIN no viaja (096 D1) y la autorización queda registrada.
    expect(nube.fila.datos.config?.bloqueo).toBeUndefined();
    expect(nube.fila.datos.config?.autorizacionNube?.version).toBe('0.2');

    // Un cambio cualquiera se sube solo, unos segundos después.
    await p1.fill('#config-nombre', 'Sofía Gómez');
    await p1.click('#form-perfil [type="submit"]');
    await expect.poll(() => nube.fila?.datos?.perfil?.nombre, { timeout: 12_000 }).toBe('Sofía Gómez');
    await tel1.close();

    // Teléfono 2: recién instalado. Al entrar trae todo, sin preguntar.
    const tel2 = await browser.newContext();
    const p2 = await tel2.newPage();
    await instalar(p2);
    await sembrarSiVacio(p2, estadoBase());
    await entrar(p2);
    await expect.poll(async () => (await leerEstado(p2)).cuentas?.map(c => c.nombre)).toEqual(['Bancolombia']);
    await expect.poll(async () => (await leerEstado(p2)).perfil?.nombre).toBe('Sofía Gómez');
    await tel2.close();
  });

  test('con datos en los dos lados no sube nada hasta que la persona elige', async ({ browser }) => {
    const { nube, instalar } = supabaseFalso();
    nube.fila = {
      datos: { ...estadoBase({ cuentas: [BANCOLOMBIA] }), config: {} },
      version_schema: 48, actualizado: new Date().toISOString(), dispositivo: 'iPhone',
    };
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await instalar(page);
    await sembrarSiVacio(page, estadoBase({ cuentas: [NEQUI] }));
    await entrar(page);

    await expect(page.locator('#config-nube')).toContainText('Tienes datos aquí y en la nube');
    await expect(page.locator('#config-nube')).toContainText('desde iPhone');
    expect(nube.subidas).toBe(0);

    await page.click('[data-action="nube-traer"]');
    await page.locator('.confirm [data-role="confirmar"], [data-role="confirmar"]').first().click();
    await expect.poll(async () => (await leerEstado(page)).cuentas?.map(c => c.nombre)).toEqual(['Bancolombia']);
    expect(nube.subidas).toBe(0);
    await ctx.close();
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
});
