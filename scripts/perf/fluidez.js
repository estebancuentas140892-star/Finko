/**
 * scripts/perf/fluidez.js - mide la fluidez de la app en un navegador real:
 * arranque, cambio de sección, abrir y cerrar hojas, scroll. Es el instrumento
 * que pedía la auditoría de jank móvil (AUDITORIA-JANK-MOVIL-2026-07-29.md, "El
 * punto ciego del harness"): `pnpm perf` corre en happy-dom, que no tiene
 * estilo, layout, paint ni compositor.
 *
 * Cómo mide:
 * - Chromium de Playwright (ya es devDependency de los E2E: nada que
 *   instalar), emulando un teléfono (Pixel 5: 393x727, DPR 2,75, táctil).
 * - CPU frenada con CDP (`Emulation.setCPUThrottlingRate`, 4x por defecto):
 *   la gama media de referencia de la auditoría. Frena el hilo principal; el
 *   compositor y el raster corren sin freno.
 * - Estado sembrado con `seed.js` (el mismo del harness), repartido en 3 años.
 * - Por interacción, dos cifras:
 *   - `inp`: Event Timing del navegador (del toque al cuadro pintado tras el
 *     handler), la métrica de INP. No ve el trabajo que corre en una tarea
 *     posterior, como el render que dispara `hashchange` al cambiar de sección.
 *   - `respuesta`: del toque al cuadro siguiente a aquel en que la pantalla ya
 *     cambió (sección activa, hoja abierta). Esa sí incluye el `hashchange`.
 *   - `peor`: el cuadro más largo en el segundo que sigue al toque (entradas
 *     animadas, repintados).
 * - Scroll: gesto de rueda sintético de CDP (`Input.synthesizeScrollGesture`)
 *   con traza. Se cuenta lo que la GPU del teléfono paga en cada cuadro
 *   (render passes y quads, independientes del hardware) y el tiempo de dibujo
 *   (acá raster por software: proporcional, no absoluto).
 *
 * Uso:
 *   node scripts/perf/fluidez.js [--cpu 4] [--gastos 3000] [--rondas 5]
 *                                [--json salida.json] [--trazas carpeta]
 *
 * `--trazas` guarda las trazas crudas de la primera ronda (se abren en el panel
 * Performance de DevTools). Levanta su propio servidor (python -m http.server)
 * en un puerto libre. No es un test: no afirma nada, mide.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
/* eslint-disable no-console -- es un script de medición: su salida es el reporte */
import { chromium, devices } from '@playwright/test';
import { construirEstadoGrande } from './seed.js';
import { STORAGE_KEY } from '../../modules/core/storage.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// ── argumentos ──────────────────────────────────────────────────

function arg(nombre, porDefecto) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > -1 ? process.argv[i + 1] : porDefecto;
}
const CPU         = Number(arg('cpu', 4));
const GASTOS      = Number(arg('gastos', 3000));
const RONDAS      = Number(arg('rondas', 5));
const JSON_SALIDA = arg('json', null);
const TRAZAS      = arg('trazas', null);

// ── utilidades ──────────────────────────────────────────────────

const mediana = (xs) => {
  const o = xs.filter((x) => typeof x === 'number').sort((a, b) => a - b);
  if (!o.length) return null;
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};
const r1 = (x) => (x === null ? null : Math.round(x * 10) / 10);

function puertoLibre() {
  return new Promise((ok, mal) => {
    const s = createServer();
    s.unref();
    s.on('error', mal);
    s.listen(0, () => { const { port } = s.address(); s.close(() => ok(port)); });
  });
}

async function levantarServidor() {
  const puerto = await puertoLibre();
  const proc = spawn('python', ['-m', 'http.server', String(puerto)], { cwd: RAIZ, stdio: 'ignore' });
  const url = `http://localhost:${puerto}`;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(url)).ok) return { url, proc }; } catch { /* todavía no */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  proc.kill();
  throw new Error('El servidor de prueba no arrancó');
}

/** Estado sembrado: el del harness, con la aceptación legal dada por la migración. */
function estadoSembrado() {
  const S = construirEstadoGrande({ gastos: GASTOS, anios: 3, cuentas: 5, seed: 42 });
  // v32: la migración v33 da por aceptadas las políticas, como a un usuario
  // existente (si no, el gate legal tapa la app).
  S._version = 32;
  delete S.config.legalAceptado;
  return S;
}

// ── instrumentos dentro de la página ────────────────────────────

// Se inyecta antes de que cargue la app: corre en el navegador, no en Node.
/* global PerformanceObserver, addEventListener, removeEventListener */
function instalarInstrumentos() {
  const fk = { ev: [], loaf: [] };
  window.__fk = fk;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) fk.ev.push(e.toJSON()); })
    .observe({ type: 'event', buffered: true, durationThreshold: 16 });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) fk.loaf.push({ startTime: e.startTime, duration: e.duration, blockingDuration: e.blockingDuration });
  }).observe({ type: 'long-animation-frame', buffered: true });

  // Graba los cuadros (rAF) desde el próximo toque hasta `ms` después.
  // `listo` es el texto de una expresión: la pantalla ya cambió.
  fk.grabar = (listo, ms) => {
    const cumple = new Function(`return (${listo});`);
    let t0 = null;
    let listoEn = null;
    const marcas = [];
    const alTocar = (e) => { if (t0 === null) t0 = e.timeStamp; };
    addEventListener('pointerdown', alTocar, { capture: true });
    fk.grabacion = new Promise((ok) => {
      const paso = (ts) => {
        if (t0 !== null) {
          marcas.push(ts);
          if (listoEn === null && cumple()) listoEn = marcas.length - 1;
          if ((ts - t0 > ms && listoEn !== null) || ts - t0 > 5 * ms) {
            removeEventListener('pointerdown', alTocar, { capture: true });
            const deltas = marcas.map((t, i) => t - (i ? marcas[i - 1] : t0));
            ok({
              respuesta: marcas[listoEn + 1] !== undefined ? marcas[listoEn + 1] - t0 : null,
              peor: Math.max(...deltas),
              largos: deltas.filter((d) => d > 50).length,
            });
            return;
          }
        }
        requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    });
  };
}

// ── traza ───────────────────────────────────────────────────────

const CATEGORIAS = [
  'devtools.timeline', 'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame', 'blink', 'cc', 'gpu', 'viz', 'benchmark',
];

/** Lo que importa para la fluidez, sumado por hilo. */
function leerTraza(json) {
  const eventos = JSON.parse(json).traceEvents ?? [];
  const nombres = new Map();
  for (const e of eventos) {
    if (e.ph === 'M' && e.name === 'thread_name') nombres.set(`${e.pid}:${e.tid}`, e.args.name);
  }
  const hilo = (e) => nombres.get(`${e.pid}:${e.tid}`) ?? '';
  const suma = {};
  const sumar = (k, d) => { suma[k] = (suma[k] ?? 0) + d; };
  let dibujos = 0, passes = 0, quads = 0;
  for (const e of eventos) {
    if (e.ph !== 'X' || typeof e.dur !== 'number') continue;
    const h = hilo(e);
    const ms = e.dur / 1000;
    if (h === 'CrRendererMain') {
      if (e.name === 'RunTask') sumar('principal', ms);
      else if (e.name === 'UpdateLayoutTree') sumar('estilo', ms);
      else if (e.name === 'Layout') sumar('layout', ms);
      else if (e.name === 'Paint') sumar('paint', ms);
      else if (e.name === 'FunctionCall' || e.name === 'v8.evaluateModule') sumar('script', ms);
    } else if (h === 'VizCompositorThread') {
      if (e.name === 'Display::DrawAndSwap') { dibujos++; sumar('dibujo', ms); }
      else if (e.name === 'DirectRenderer::DrawRenderPass') passes++;
      else if (e.name === 'SoftwareRenderer::DoDrawQuad') quads++;
    }
  }
  const out = Object.fromEntries(Object.entries(suma).map(([k, v]) => [k, r1(v)]));
  return {
    ...out,
    cuadros: dibujos,
    msPorCuadro: dibujos ? r1((suma.dibujo ?? 0) / dibujos) : null,
    passesPorCuadro: dibujos ? r1(passes / dibujos) : null,
    quadsPorCuadro: dibujos ? r1(quads / dibujos) : null,
  };
}

/** Cierra la traza en curso; la guarda cruda si se pidió `--trazas`. */
async function cerrarTraza(browser, nombre) {
  const buf = await browser.stopTracing();
  if (TRAZAS) {
    mkdirSync(TRAZAS, { recursive: true });
    writeFileSync(resolve(TRAZAS, `${nombre.replace(/[^a-z0-9]+/gi, '-')}.json`), buf);
  }
  return leerTraza(buf.toString());
}

// ── escenarios ──────────────────────────────────────────────────

const quieta = (page, ms) => page.waitForTimeout(ms);

/** Peor Event Timing de las interacciones desde `t0` (máximo por interactionId). */
function inpDesde(page, t0) {
  return page.evaluate((desde) => {
    let peor = 0;
    for (const e of window.__fk.ev) {
      if (e.startTime >= desde && e.interactionId && e.duration > peor) peor = e.duration;
    }
    return peor;
  }, t0);
}

/**
 * Una interacción: toque sobre `selector` y espera a que se cumpla `listo`.
 * Con `traza` ({ browser, nombre }) suma el desglose del hilo principal.
 */
async function tocar(page, selector, listo, traza) {
  if (traza) await traza.browser.startTracing(page, { categories: CATEGORIAS });
  const t0 = await page.evaluate(([l]) => { window.__fk.grabar(l, 1000); return performance.now(); }, [listo]);
  await page.locator(selector).filter({ visible: true }).first().tap();
  const cuadros = await page.evaluate(() => window.__fk.grabacion);
  await quieta(page, 300);
  const desglose = traza ? await cerrarTraza(traza.browser, traza.nombre) : null;
  return { inp: await inpDesde(page, t0), ...cuadros, desglose };
}

async function irA(page, hash) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForFunction((h) => document.getElementById(`sec-${h}`)?.classList.contains('active'), hash.slice(1));
  await quieta(page, 600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await quieta(page, 200);
}

async function scrollear(page, cdp, browser, nombre) {
  await browser.startTracing(page, { categories: CATEGORIAS });
  // Rueda, no toque: en headless el gesto táctil sintético no desplaza.
  await cdp.send('Input.synthesizeScrollGesture', { x: 196, y: 500, yDistance: -2400, speed: 1600, gestureSourceType: 'mouse' });
  await quieta(page, 300);
  await cdp.send('Input.synthesizeScrollGesture', { x: 196, y: 300, yDistance: 2400, speed: 1600, gestureSourceType: 'mouse' });
  await quieta(page, 300);
  return cerrarTraza(browser, nombre);
}

const INTERACCIONES = [
  // [nombre, selector, la pantalla ya cambió]
  ['tab Gastos',       '.sidebar__nav [data-section="gast"]',    'document.getElementById("sec-gast").classList.contains("active")'],
  ['tab Ahorro',       '.sidebar__nav [data-section="ahorro"]',  'document.getElementById("sec-ahorro").classList.contains("active")'],
  ['tab Inicio',       '.sidebar__nav [data-section="dash"]',    'document.getElementById("sec-dash").classList.contains("active")'],
  ['tab Gastos (otra)', '.sidebar__nav [data-section="gast"]',   'document.getElementById("sec-gast").classList.contains("active")'],
  ['abrir Registrar',  '.sidebar__nav [data-action="registrar-abrir-hoja"]', 'document.getElementById("modal-registrar").hasAttribute("data-open")'],
  ['form Gasto',       '#modal-registrar [data-target-action="nuevo-gasto"]', 'document.getElementById("modal-gasto").hasAttribute("data-open")'],
  ['cerrar form',      '#modal-gasto [data-action="modal-close"]', '!document.getElementById("modal-gasto").hasAttribute("data-open")'],
  ['abrir Más',        '.sidebar__nav [data-modal="modal-mas"]', 'document.getElementById("modal-mas").hasAttribute("data-open")'],
  ['Más a Análisis',   '#modal-mas [data-section="analisis"]',   'document.getElementById("sec-analisis").classList.contains("active")'],
  ['tab Inicio (otra)', '.sidebar__nav [data-section="dash"]',   'document.getElementById("sec-dash").classList.contains("active")'],
];

const SCROLL = ['#dash', '#gast', '#movimientos', '#analisis', '#fondo'];

// ── principal ───────────────────────────────────────────────────

async function main() {
  const { url, proc } = await levantarServidor();
  const browser = await chromium.launch({ headless: true });
  const res = { cpu: CPU, gastos: GASTOS, rondas: RONDAS, arranque: [], interacciones: {}, scroll: {}, errores: [] };
  try {
    const estado = JSON.stringify(estadoSembrado());
    for (let ronda = 0; ronda < RONDAS; ronda++) {
      const primera = ronda === 0;
      const ctx = await browser.newContext({ ...devices['Pixel 5'], baseURL: url, serviceWorkers: 'block' });
      await ctx.addInitScript(([clave, st]) => {
        if (!localStorage.getItem(clave)) localStorage.setItem(clave, st);
      }, [STORAGE_KEY, estado]);
      await ctx.addInitScript(instalarInstrumentos);
      const page = await ctx.newPage();
      page.on('pageerror', (e) => res.errores.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error') res.errores.push(m.text()); });
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });

      // Arranque: primera carga con la semilla (incluye migraciones).
      if (primera) await browser.startTracing(page, { categories: CATEGORIAS });
      await page.goto('/#dash');
      await page.waitForFunction(() => document.getElementById('sec-dash')?.classList.contains('active'));
      await quieta(page, 3000);
      const arr = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const largas = window.__fk.loaf.filter((l) => l.startTime < 8000);
        return {
          dcl: nav.domContentLoadedEventEnd,
          bloqueo: largas.reduce((s, l) => s + l.blockingDuration, 0),
          cuadroMasLargo: Math.max(0, ...largas.map((l) => l.duration)),
          nodos: document.getElementsByTagName('*').length,
        };
      });
      if (primera) arr.traza = await cerrarTraza(browser, 'arranque');
      res.arranque.push(arr);

      // El toast de logros de la siembra tapa la barra inferior.
      await page.evaluate(() => document.querySelectorAll('.logro-toast, .confetti-piece').forEach((t) => t.remove()));

      for (const [nombre, selector, listo] of INTERACCIONES) {
        // Desglose por traza solo en la primera ronda: trazar agrega costo.
        const v = await tocar(page, selector, listo, primera ? { browser, nombre } : null);
        (res.interacciones[nombre] ??= []).push(v);
      }

      if (primera) {
        for (const h of SCROLL) {
          await irA(page, h);
          res.scroll[h] = await scrollear(page, cdp, browser, `scroll-${h.slice(1)}`);
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    proc.kill();
  }
  res.errores = [...new Set(res.errores)];
  reportar(res);
  if (JSON_SALIDA) writeFileSync(JSON_SALIDA, JSON.stringify(res, null, 2));
}

function reportar(res) {
  const med = (xs, k) => r1(mediana(xs.map((x) => x[k])));
  const a = res.arranque;
  console.log(`\nFluidez de Finko: CPU ${res.cpu}x, ${res.gastos} gastos, Pixel 5, ${res.rondas} rondas (medianas, ms)\n`);
  console.log(`Arranque: DCL ${med(a, 'dcl')}, bloqueo ${med(a, 'bloqueo')}, cuadro más largo ${med(a, 'cuadroMasLargo')}, nodos ${med(a, 'nodos')}`);
  if (a[0].traza) console.log('  traza:', JSON.stringify(a[0].traza));
  console.log('\nInteracción              inp  respuesta   peor  largos   (1.ª ronda: principal estilo layout paint script)');
  for (const [k, xs] of Object.entries(res.interacciones)) {
    const d = xs[0].desglose ?? {};
    const c = (v) => String(v ?? '-').padStart(7);
    console.log(`${k.padEnd(20)}${c(med(xs, 'inp'))}${c(med(xs, 'respuesta'))}${c(med(xs, 'peor'))}${c(med(xs, 'largos'))}     ${[d.principal, d.estilo, d.layout, d.paint, d.script].map((v) => v ?? 0).join(' / ')}`);
  }
  console.log('\nScroll, ida y vuelta de 2400 px (cuadros, ms de dibujo por cuadro, render passes y quads por cuadro, hilo principal)');
  for (const [k, v] of Object.entries(res.scroll)) {
    console.log(`${k.padEnd(14)} cuadros ${v.cuadros}  ms/cuadro ${v.msPorCuadro}  passes ${v.passesPorCuadro}  quads ${v.quadsPorCuadro}  principal ${v.principal}`);
  }
  if (res.errores.length) console.log('\nErrores de consola:', res.errores);
}

main().catch((e) => { console.error(e); process.exit(1); });
