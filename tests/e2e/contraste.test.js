/**
 * contraste.test.js - el texto se lee en los dos temas (tablero 12 del canvas
 * móvil: "contraste AA en claro y oscuro"). ADR 123 D3.
 *
 * Corre la regla `color-contrast` de axe (WCAG 2 AA: 4,5:1 el texto normal,
 * 3:1 el grande) a 390 px sobre las secciones que más se usan y sobre un
 * formulario con sus errores a la vista, en tema oscuro y en claro. En
 * Chromium real el contraste se calcula con los colores que de verdad pinta
 * la página, así que la prueba mira lo mismo que el usuario.
 */

import { test, expect } from '@playwright/test';
import { sembrar } from './helpers/estado.js';
import { semillaNormal } from './helpers/semillas.js';

test.use({ viewport: { width: 390, height: 844 } });

const SECCIONES = ['dash', 'gast', 'compromisos', 'metas', 'apartados', 'config'];
const TEMAS = [['oscuro', 'dark'], ['claro', 'light']];

/** Fija el tema antes de que arranque la app (la misma clave que usa shell.js). */
async function conTema(page, tema) {
  await page.addInitScript((t) => { localStorage.setItem('fk_theme', t); }, tema);
}

/**
 * Violaciones de contraste dentro de `selector`, con el texto y los colores
 * medidos para que el fallo diga qué arreglar.
 */
async function faltasDeContraste(page, selector) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  return page.evaluate(async (sel) => {
    const el = document.querySelector(sel);
    if (!el) return [`${sel}: no está`];
    const r = await window.axe.run(el, { runOnly: { type: 'rule', values: ['color-contrast'] } });
    return r.violations.flatMap(v => v.nodes.map((n) => {
      const d = n.any[0]?.data ?? {};
      return `${n.target.join(' ')} "${(n.html.match(/>([^<]{1,40})/) ?? [])[1] ?? ''}" ${d.contrastRatio}:1 (${d.fgColor} sobre ${d.bgColor}, pide ${d.expectedContrastRatio})`;
    }));
  }, selector);
}

/** Espera a que la página quede quieta: sin fundidos de tema ni de sección. */
async function quieta(page) {
  await page.waitForFunction(() => !document.documentElement.classList.contains('theme-transitioning')
    && document.getAnimations().every(a => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity));
}

test.describe('Contraste AA en oscuro y claro (tablero 12, ADR 123 D3)', () => {
  for (const [nombre, tema] of TEMAS) {
    test(`tema ${nombre}: las secciones principales no tienen texto bajo AA`, async ({ page }) => {
      test.setTimeout(90_000);
      await conTema(page, tema);
      await sembrar(page, semillaNormal());
      await page.goto('/#dash');
      await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
      expect(await page.evaluate(() => document.body.classList.contains('light-theme'))).toBe(tema === 'light');
      const faltas = [];
      for (const sec of SECCIONES) {
        await page.evaluate(s => { window.location.hash = '#' + s; }, sec);
        await page.waitForSelector(`#sec-${sec}.active`, { timeout: 5_000 });
        await quieta(page);
        for (const f of await faltasDeContraste(page, `#sec-${sec}`)) faltas.push(`#${sec}: ${f}`);
      }
      expect(faltas, faltas.join('\n')).toEqual([]);
    });

    test(`tema ${nombre}: un formulario con errores se lee`, async ({ page }) => {
      await conTema(page, tema);
      await sembrar(page, semillaNormal());
      await page.goto('/#metas');
      await page.waitForSelector('#sec-metas.active', { timeout: 10_000 });
      await page.locator('#sec-metas [data-action="nueva-meta"]:visible').first().click();
      await page.waitForSelector('#modal-meta[data-open]');
      await page.locator('#modal-meta .modal__footer .btn-primary').click();
      await expect(page.locator('#modal-meta .form-error')).toHaveCount(2);
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#modal-meta')).opacity === '1');
      await quieta(page);
      const faltas = await faltasDeContraste(page, '#modal-meta');
      expect(faltas, faltas.join('\n')).toEqual([]);
    });
  }
});
