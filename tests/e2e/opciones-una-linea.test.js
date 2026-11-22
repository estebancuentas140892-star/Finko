/**
 * opciones-una-linea.test.js - GAS.16 (ADR 197): las opciones de las hojas de
 * Gastos en una sola línea, sin salirse de su celda ni partir palabras, en
 * teléfonos angostos y con la letra del sistema más grande (Android la sube
 * en "Tamaño de fuente"; aquí se simula con el tamaño de la raíz).
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

const CUENTA = { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 3_000_000, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' };

/** Lo que se sale de su caja o la palabra que cae en dos líneas, por opción. */
function problemas(sel) {
  const out = [];
  for (const caja of document.querySelectorAll(sel)) {
    const r = caja.getBoundingClientRect();
    if (!r.width || caja.closest('[hidden]')) continue;
    const walker = document.createTreeWalker(caja, 4); // NodeFilter.SHOW_TEXT
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('.sr-only, [hidden]') || getComputedStyle(el).display === 'none') continue;
      const re = /\S+/g;
      let m;
      while ((m = re.exec(n.nodeValue))) {
        const rg = document.createRange();
        rg.setStart(n, m.index);
        rg.setEnd(n, m.index + m[0].length);
        const rects = [...rg.getClientRects()].filter(x => x.width > 0);
        if (rects.length > 1) out.push(`parte: ${m[0]}`);
        if (rects.some(x => x.right > r.right + 1 || x.left < r.left - 1)) out.push(`sale: ${m[0]}`);
      }
    }
  }
  return out;
}

/** Cuántas líneas ocupa el nombre de cada opción. */
function lineasDe([sel, nombre]) {
  return [...document.querySelectorAll(sel)].map((caja) => {
    const el = caja.querySelector(nombre);
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 16;
    return Math.round(el.getBoundingClientRect().height / lh);
  });
}

for (const ancho of [360, 393]) {
  test.describe(`a ${ancho} px con la letra al 115 %`, () => {
    test.use({ viewport: { width: ancho, height: 740 } });
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '18.4px'; });
      });
    });

    test('el gasto fijo: "¿Qué es?" en una línea por opción; "Cuándo" y la factura sin salirse', async ({ page }) => {
      await sembrar(page, estadoBase({ cuentas: [CUENTA] }));
      await page.goto('/#fijos');
      await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
      await page.evaluate(() => { const b = document.createElement('button'); b.dataset.action = 'nuevo-gasto-fijo'; document.body.appendChild(b); b.click(); b.remove(); });
      const form = page.locator('#form-gasto-fijo');
      for (const t of ['8', '5', '000']) await form.locator(`[data-pregunta-on] [data-tecla="${t}"]`).click();
      await form.locator('[data-preguntas-seguir]').click();
      const que = '#form-gasto-fijo [data-pregunta-on] .chip-cat';
      await expect(form.locator('[data-pregunta-on] .chip-cat', { hasText: 'Administración' })).toBeVisible();
      expect(await page.evaluate(problemas, que)).toEqual([]);
      expect(new Set(await page.evaluate(lineasDe, [que, '.chip-cat__label']))).toEqual(new Set([1]));
      await form.locator('.chip-cat', { hasText: 'Servicios públicos' }).click();
      expect(await page.evaluate(problemas, '#form-gasto-fijo [data-plataforma-grupo]:not([hidden]) .chip-cat')).toEqual([]);
      await form.locator('[data-pregunta-on] .chip-cat--marca:has(input[value="epm"])').click();
      expect(await page.evaluate(problemas, '#gfijo-cuando :is(.chip-fecha, .dia, .campo-finko)')).toEqual([]);
      await form.locator('[data-dia="15"]').click();
      await form.locator('[data-preguntas-seguir]').click();
      await expect(form.locator('[data-preguntas-t]')).toHaveText('Así queda tu gasto fijo');
      expect(await page.evaluate(problemas, '#form-gasto-fijo [data-preguntas-resumen] :is(.factura__quien, .recibo__fila)')).toEqual([]);
    });

    test('el gasto y el límite: la categoría en una línea por opción', async ({ page }) => {
      await sembrar(page, estadoBase({
        cuentas: [CUENTA],
        presupuestos: [{ id: 'p1', categoria: 'Mercado', montoMensual: 400_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }],
      }));
      await page.goto('/#presupuesto');
      await page.locator('.limites-cabeza__nuevo').click({ timeout: 10_000 });
      await expect(page.locator('#form-presupuesto .limite-cat').first()).toBeVisible();
      expect(await page.evaluate(problemas, '#form-presupuesto .limite-cat')).toEqual([]);
      expect(new Set(await page.evaluate(lineasDe, ['#form-presupuesto .limite-cat', '.limite-cat__n']))).toEqual(new Set([1]));
    });
  });
}
