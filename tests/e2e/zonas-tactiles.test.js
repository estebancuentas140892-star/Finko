/**
 * zonas-tactiles.test.js - ningún control del teléfono queda bajo 44 px (R4)
 * y ninguna barra de opciones esconde opciones con desborde (R9). ADR 121 D4,
 * la verificación que el tablero 6 del canvas móvil pide para cerrar el plan.
 *
 * Mide a 390 px, con la semilla normal, cada sección de la barra y de "Más".
 * Un control cuenta su zona sensible: su caja, o un `::before`/`::after`
 * posicionado que la agranda (la receta de los enlaces de texto, ADR 116 D7).
 */

import { test, expect } from '@playwright/test';
import { sembrar } from './helpers/estado.js';
import { semillaNormal } from './helpers/semillas.js';

test.use({ viewport: { width: 390, height: 844 } });

const SECCIONES = [
  'dash', 'gast', 'compromisos', 'presupuesto', 'agenda', 'personales', 'tesoreria',
  'ahorro', 'fondo', 'metas', 'apartados', 'inversion', 'movimientos', 'analisis', 'config',
];

/** Controles visibles de la sección activa cuya zona sensible mide menos de 44 px. */
function chicos() {
  const MINIMO = 43.5;
  const zona = (el) => {
    const r = el.getBoundingClientRect();
    let alto = r.height;
    let ancho = r.width;
    for (const pseudo of ['::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      if (cs.content === 'none' || cs.position !== 'absolute') continue;
      alto = Math.max(alto, parseFloat(cs.minHeight) || 0, parseFloat(cs.height) || 0);
      ancho = Math.max(ancho, parseFloat(cs.minWidth) || 0, parseFloat(cs.width) || 0);
    }
    return { alto, ancho };
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0' && !el.closest('[inert], [aria-hidden="true"]');
  };
  const raiz = [document.querySelector('.section.active'), document.querySelector('#sidebar')].filter(Boolean);
  const controles = raiz.flatMap(r => [...r.querySelectorAll(
    'button, a[href], [role="button"], select, summary, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])',
  )]);
  return controles
    .filter(visible)
    // Un control dentro de otro (el texto dentro de un botón) no es otro blanco.
    .filter(el => !el.parentElement?.closest('button, a[href], [role="button"]'))
    .map(el => ({ el, ...zona(el) }))
    .filter(({ alto, ancho }) => alto < MINIMO || ancho < MINIMO)
    .map(({ el, alto, ancho }) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(ancho)}x${Math.round(alto)}`);
}

/** Barras de opciones de la sección activa que desbordan a lo ancho (R9). */
function desbordadas() {
  const sec = document.querySelector('.section.active');
  if (!sec) return [];
  return [...sec.querySelectorAll('.filtros-bar, .bloque-tabs, .hub .chips, [role="group"]')]
    .filter(el => el.getBoundingClientRect().width > 0 && el.scrollWidth > el.clientWidth + 1)
    .map(el => `${el.className} ${el.scrollWidth}/${el.clientWidth}`);
}

test.describe('Zonas táctiles a 390 (R4, R9, ADR 121 D4)', () => {
  test('ningún control queda bajo 44 px y ninguna barra esconde opciones', async ({ page }) => {
    test.setTimeout(90_000);
    await sembrar(page, semillaNormal());
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    const problemas = [];
    for (const sec of SECCIONES) {
      await page.evaluate(s => { window.location.hash = '#' + s; }, sec);
      await page.waitForSelector(`#sec-${sec}.active`, { timeout: 5_000 });
      await page.waitForTimeout(150);
      for (const p of await page.evaluate(chicos)) problemas.push(`#${sec}: ${p}`);
      for (const p of await page.evaluate(desbordadas)) problemas.push(`#${sec} desborda: ${p}`);
    }
    expect(problemas, problemas.join('\n')).toEqual([]);
  });
});
