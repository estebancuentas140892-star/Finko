// VIS.1 (ADR 168 D1): qué queda bajo el pliegue al entrar a cada sección, en
// teléfono (390x844, menos la barra de abajo) y escritorio (1440x900), con la
// semilla "normal" de los E2E. Deja una captura de página completa con la
// línea del pliegue y resultado.json. Necesita un servidor ya levantado.
// Uso: node scripts/auditoria-pliegue.js <baseURL> <carpetaSalida> [dash,gast,...]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { semillaNormal } from '../tests/e2e/helpers/semillas.js';
import { STORAGE_KEY } from '../modules/core/storage.js';

const [, , BASE, SALIDA] = process.argv;
fs.mkdirSync(SALIDA, { recursive: true });

const SECCIONES = process.argv[4] ? process.argv[4].split(',') : ['dash', 'gast', 'compromisos', 'presupuesto', 'tesoreria', 'fondo', 'metas', 'apartados',
  'inversion', 'personales', 'agenda', 'analisis', 'movimientos'];
const VISTAS = [
  { nombre: 'movil', width: 390, height: 844, mobile: true },
  { nombre: 'escritorio', width: 1440, height: 900, mobile: false },
];

const resultado = {};
const browser = await chromium.launch();
for (const v of VISTAS) {
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: v.mobile, hasTouch: v.mobile });
  const page = await ctx.newPage();
  const estado = semillaNormal();
  await page.addInitScript(([clave, st]) => {
    if (!localStorage.getItem(clave)) localStorage.setItem(clave, JSON.stringify(st));
  }, [STORAGE_KEY, estado]);
  await page.goto(`${BASE}/#dash`);
  await page.waitForSelector('#sec-dash.active', { timeout: 20_000 });
  await page.waitForTimeout(800);
  for (const sec of SECCIONES) {
    await page.evaluate(s => { window.location.hash = '#' + s; }, sec);
    await page.waitForSelector(`#sec-${sec}.active`, { timeout: 15_000 });
    await page.waitForTimeout(900);
    await page.evaluate(() => window.scrollTo(0, 0));
    const datos = await page.evaluate((sec) => {
      const raiz = document.getElementById(`sec-${sec}`);
      const alto = window.innerHeight;
      // La barra de abajo del teléfono tapa su alto: el pliegue útil es menor.
      const barra = [...document.querySelectorAll('.sidebar, nav')].map(n => n.getBoundingClientRect())
        .filter(r => r.height > 0 && r.top > alto / 2 && r.width > window.innerWidth * 0.8)
        .reduce((m, r) => Math.min(m, r.top), alto);
      const pliegue = Math.min(alto, barra);
      const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.height > 4 && r.width > 4 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      const envoltorio = (el) => /\b(bento|section__body|section__content|seccion__cuerpo|grid|columns|cols|stack)\b/.test(el.className || '');
      const bloques = [];
      const recorrer = (el, prof) => {
        for (const h of el.children) {
          if (!visible(h)) continue;
          const hijosVisibles = [...h.children].filter(visible);
          if (prof < 3 && (envoltorio(h) || (hijosVisibles.length === 1 && h.children.length === 1))) { recorrer(h, prof + 1); continue; }
          const r = h.getBoundingClientRect();
          const titulo = (h.querySelector('h1, h2, h3, .section-title, [class*="__title"], [class*="__titulo"], legend')?.textContent ?? h.textContent ?? '')
            .replace(/\s+/g, ' ').trim().slice(0, 70);
          bloques.push({
            el: `${h.tagName.toLowerCase()}${h.id ? '#' + h.id : ''}${h.className && typeof h.className === 'string' ? '.' + h.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`,
            titulo, top: Math.round(r.top + window.scrollY), alto: Math.round(r.height),
            bajoPliegue: r.top + window.scrollY >= pliegue, cortado: r.top < pliegue && r.bottom > pliegue,
          });
        }
      };
      if (raiz) recorrer(raiz, 0);
      return { pliegue: Math.round(pliegue), altoPagina: document.documentElement.scrollHeight, bloques };
    }, sec);
    // La línea del pliegue sobre la captura de página completa.
    await page.evaluate((y) => {
      const l = document.createElement('div');
      l.id = 'aud-pliegue';
      l.style.cssText = `position:absolute;left:0;right:0;top:${y}px;height:0;border-top:3px dashed #e11;z-index:99999;pointer-events:none`;
      document.body.appendChild(l);
    }, datos.pliegue);
    const archivo = `${v.nombre}-${sec}.png`;
    await page.screenshot({ path: path.join(SALIDA, archivo), fullPage: true });
    await page.evaluate(() => document.getElementById('aud-pliegue')?.remove());
    resultado[`${v.nombre}/${sec}`] = { ...datos, archivo };
    const bajo = datos.bloques.filter(b => b.bajoPliegue).length;
    // eslint-disable-next-line no-console
    console.log(`${v.nombre.padEnd(10)} ${sec.padEnd(12)} pliegue ${datos.pliegue} alto ${datos.altoPagina} bloques ${datos.bloques.length} bajo ${bajo}`);
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(SALIDA, 'resultado.json'), JSON.stringify(resultado, null, 2));
