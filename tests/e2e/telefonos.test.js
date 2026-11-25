/**
 * telefonos.test.js - TEL.1 (ADR 199): Inicio, Gastos y Movimientos en todos
 * los teléfonos. Criterios medibles del lienzo "Finko · Inicio, Gastos y
 * Movimientos en todos los teléfonos": con la letra del sistema al 100, 115
 * y 130 % (se simula con el tamaño de la raíz, que es lo que hace la
 * etiqueta `text-scale`), ningún texto se corta con puntos, ninguna palabra
 * se parte ni se sale de su caja, la página no se ensancha y la última fila
 * de cada lista termina sobre "Registrar".
 */

import { test, expect } from '@playwright/test';
import { sembrar } from './helpers/estado.js';

const hoy = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const enDias = (n) => Math.min(hoy.getDate() + n, 28);
const hace9 = new Date(hoy); hace9.setDate(hoy.getDate() - 9);

const ESTADO = {
  version: 1,
  perfil: { nombre: 'María Fernanda Restrepo', smmlv: 1750905 },
  onboarded: true,
  cuentas: [
    { id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 870_000, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
    { id: 'c2', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 150_000, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
  ],
  ingresos: [{ id: 'i1', descripcion: 'Salario mensual', monto: 3_500_000, frecuencia: 'Mensual', diaPago: enDias(2), activo: true, fechaCreacion: '2026-01-01' }],
  gastos: [
    { id: 'g1', descripcion: 'Almuerzo de trabajo', monto: 18_000, categoria: 'Restaurantes', fecha: iso(hoy), cuentaId: 'c2' },
    { id: 'g2', descripcion: 'Mercado quincenal completo', monto: 543_000, categoria: 'Mercado', fecha: iso(hoy), cuentaId: 'c1' },
    { id: 'g3', descripcion: 'Chaqueta impermeable', monto: 197_567, categoria: 'Ropa', fecha: iso(hoy), cuentaId: 'c1' },
  ],
  compromisos: [
    { id: 'f1', tipo: 'fijo', descripcion: 'Arriendo apartamento centro', monto: 1_200_000, frecuencia: 'Mensual', diaPago: enDias(2), categoria: 'Arriendo', activo: true, fechaCreacion: '2026-01-01' },
    { id: 'f2', tipo: 'fijo', descripcion: 'EPM', monto: 229_900, frecuencia: 'Mensual', diaPago: hace9.getDate(), categoria: 'Servicios públicos', activo: true, fechaCreacion: iso(hace9) },
    { id: 'd1', tipo: 'deuda-entidad', descripcion: 'Tarjeta de crédito Bancolombia', saldoTotal: 4_850_000, cuotaMensual: 385_000, tasa: null, frecuencia: 'Mensual', diaPago: enDias(1), categoria: 'Tarjeta de crédito' },
  ],
  presupuestos: [{ id: 'p1', categoria: 'Mercado', montoMensual: 300_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }],
  metas: [],
};

/** Lo que se corta con puntos, la palabra partida y la que se sale de su caja. */
function problemas() {
  const out = [];
  const sec = document.querySelector('.section.active');
  for (const raiz of [sec, document.querySelector('#sidebar')]) {
    for (const el of raiz.querySelectorAll('*')) {
      if (el.closest('[hidden], .sr-only, [aria-hidden="true"]')) continue;
      const caja = el.getBoundingClientRect();
      if (!caja.width || !caja.height) continue;
      const cs = getComputedStyle(el);
      const conTexto = [...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());
      if (!conTexto) continue;
      if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) out.push(`puntos: ${el.textContent.trim()}`);
      for (const n of el.childNodes) {
        if (n.nodeType !== 3) continue;
        for (const m of n.nodeValue.matchAll(/\S+/g)) {
          const r = document.createRange();
          r.setStart(n, m.index);
          r.setEnd(n, m.index + m[0].length);
          const rects = [...r.getClientRects()].filter(x => x.width > 0);
          if (rects.length > 1) out.push(`parte: ${m[0]}`);
          const ultimo = rects.at(-1);
          if (ultimo && ultimo.right > window.innerWidth + 1) out.push(`fuera: ${m[0]}`);
          if (ultimo && cs.display !== 'inline' && ultimo.right > caja.right + 1.5) out.push(`sale: ${m[0]}`);
        }
      }
    }
  }
  if (document.documentElement.scrollWidth > window.innerWidth) out.push(`ancho: ${document.documentElement.scrollWidth}`);
  return [...new Set(out)];
}

const SECCIONES = ['dash', 'gast', 'fijos', 'deudas', 'presupuesto', 'movimientos'];
const CASOS = [
  { viewport: { width: 320, height: 568 }, raiz: '16px' },
  { viewport: { width: 320, height: 568 }, raiz: '20.8px' },
  { viewport: { width: 360, height: 780 }, raiz: '18.4px' },
  { viewport: { width: 393, height: 852 }, raiz: '20.8px' },
  { viewport: { width: 430, height: 932 }, raiz: '16px' },
];

for (const { viewport, raiz } of CASOS) {
  test.describe(`${viewport.width} x ${viewport.height}, raíz a ${raiz}`, () => {
    test.use({ viewport });

    test('nada se corta con puntos, nada se parte ni se sale (TEL.1a, ADR 199 D2 a D4)', async ({ page }) => {
      test.setTimeout(60_000);
      await page.addInitScript((tam) => {
        document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = tam; });
      }, raiz);
      await sembrar(page, ESTADO);
      await page.goto('/#dash');
      await page.waitForSelector('#sec-dash.active', { timeout: 15_000 });
      for (const sec of SECCIONES) {
        await page.evaluate(s => { location.hash = '#' + s; }, sec);
        await page.waitForTimeout(400);
        expect(await page.evaluate(problemas), `#${sec}`).toEqual([]);
      }
    });
  });
}

test.describe('la barra y el fin de las listas (TEL.1a, ADR 199 D4)', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test('a 320 al 130 %: "Registrar" entero en su columna y la última fila termina sobre él', async ({ page }) => {
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '20.8px'; });
    });
    await sembrar(page, ESTADO);
    await page.goto('/#movimientos');
    await page.waitForSelector('#sec-movimientos.active', { timeout: 15_000 });
    const etiquetas = page.locator('#sidebar .nav-item:visible .nav-item__label');
    for (const el of await etiquetas.all()) {
      expect(await el.evaluate(e => getComputedStyle(e).textOverflow)).not.toBe('ellipsis');
      const r = await el.boundingBox();
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(320);
    }
    // Las etiquetas no se montan unas sobre otras.
    const cajas = await etiquetas.evaluateAll(els => els.map(e => e.getBoundingClientRect()).map(r => [r.left, r.right]));
    for (let i = 1; i < cajas.length; i++) expect(cajas[i][0]).toBeGreaterThanOrEqual(cajas[i - 1][1]);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    const ultima = await page.locator('#lista-movimientos .list-item').last().boundingBox();
    const fab = await page.locator('#sidebar .nav-item__fab').boundingBox();
    expect(ultima.y + ultima.height).toBeLessThanOrEqual(fab.y - 8 + 1);
  });
});

/** Simula la letra del sistema: con `text-scale`, 1rem crece con ella. */
const conLetra = (page, tam) => page.addInitScript((t) => {
  document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = t; });
}, tam);

/** Abre una hoja por su `data-action`, como lo hace un botón de la app. */
const abrir = (page, accion) => page.evaluate((a) => {
  const b = document.createElement('button');
  b.dataset.action = a;
  document.body.appendChild(b);
  b.click();
  b.remove();
}, accion);

test.describe('pestañas, tejas, días y cifras (TEL.1b, ADR 199 D1, D5, D6, D8, D9)', () => {
  test('la letra del sistema llega a 1rem: index.html pide text-scale (D1)', async ({ page }) => {
    await sembrar(page, ESTADO);
    await page.goto('/#dash');
    await expect(page.locator('meta[name="text-scale"]')).toHaveAttribute('content', 'scale');
  });

  for (const [ancho, alto, letra, filas] of [[320, 568, '20.8px', 2], [430, 932, '16px', 1]]) {
    test(`las cuatro pestañas a ${ancho} con la raíz a ${letra}: ${filas === 1 ? 'una fila' : '2 x 2'}, ninguna se sale (D5)`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: alto });
      await conLetra(page, letra);
      await sembrar(page, ESTADO);
      await page.goto('/#fijos');
      await page.waitForSelector('#sec-compromisos.active', { timeout: 15_000 });
      const riel = page.locator('#sec-compromisos .bloque-tabs');
      await expect(riel.locator('.bloque-tabs__badge:visible').first()).toBeVisible();
      const m = await riel.evaluate((r) => {
        const tabs = [...r.querySelectorAll('.bloque-tabs__tab')];
        return {
          alto: Math.round(r.getBoundingClientRect().height),
          filas: new Set(tabs.map(t => Math.round(t.getBoundingClientRect().top))).size,
          orden: tabs.map(t => t.dataset.section),
          salen: tabs.filter(t => t.scrollWidth > t.clientWidth + 1).length,
          fuera: tabs.filter(t => t.getBoundingClientRect().right > window.innerWidth).length,
        };
      });
      expect(m.filas).toBe(filas);
      // Una fila: 46 más el borde; dos: 86 al 100 % y algo más con la letra grande.
      if (filas === 1) expect(m.alto).toBeLessThanOrEqual(48);
      else expect(m.alto).toBeGreaterThanOrEqual(86);
      expect(m.orden).toEqual(['gast', 'fijos', 'deudas', 'presupuesto']);
      expect(m.salen + m.fuera).toBe(0);
    });
  }

  test('a 320 al 130 %: la cifra de la tarjeta cabe con su ojo y el saldo cabe en la pantalla (D9)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await conLetra(page, '20.8px');
    await sembrar(page, { ...ESTADO, cuentas: [{ ...ESTADO.cuentas[0], saldo: 12_345_678 }, ESTADO.cuentas[1]] });
    await page.goto('/#dash');
    await page.waitForSelector('#sec-dash.active', { timeout: 15_000 });
    await expect(page.locator('#saldo-total .hero-inicio__cifra')).toHaveText('12.495.678');
    await page.waitForTimeout(300);
    const saldo = await page.evaluate(() => {
      const r = document.createRange(); r.selectNodeContents(document.querySelector('#saldo-total'));
      const b = r.getBoundingClientRect();
      return { izq: b.left, der: b.right, fs: parseFloat(getComputedStyle(document.querySelector('#saldo-total')).fontSize) };
    });
    expect(saldo.izq).toBeGreaterThanOrEqual(0);
    expect(saldo.der).toBeLessThanOrEqual(320);
    expect(saldo.fs).toBeGreaterThanOrEqual(34);

    await page.goto('/#fijos');
    await page.waitForSelector('#sec-compromisos.active', { timeout: 15_000 });
    await page.waitForTimeout(300);
    const tarjeta = await page.evaluate(() => {
      const v = document.querySelector('#compromisos-hero [data-cabe]');
      const r = document.createRange(); r.selectNodeContents(v);
      const ojo = v.nextElementSibling.getBoundingClientRect();
      return { der: r.getBoundingClientRect().right, ojoIzq: ojo.left, ojoArriba: ojo.top, arriba: v.getBoundingClientRect().top, fs: parseFloat(getComputedStyle(v).fontSize) };
    });
    // El ojo va en la misma línea, a la derecha de la cifra.
    expect(tarjeta.ojoIzq).toBeGreaterThan(tarjeta.der);
    expect(Math.abs(tarjeta.ojoArriba - tarjeta.arriba)).toBeLessThan(20);
    expect(tarjeta.fs).toBeGreaterThanOrEqual(28);
  });

  test('a 360: entidades en columnas de su palabra más larga y días de 44 (D6, D8)', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 360, height: 780 });
    await sembrar(page, ESTADO);
    await page.goto('/#deudas');
    await page.waitForSelector('#sec-compromisos.active', { timeout: 15_000 });
    await abrir(page, 'nuevo-compromiso');
    const form = page.locator('#form-compromiso');
    await form.locator('[data-tipo="deuda-entidad"]').click();
    await expect(form.locator('.deuda-entidad')).toBeVisible();
    await page.waitForTimeout(200);
    const tejas = await form.locator('.deuda-entidad').evaluate((g) => {
      const ops = [...g.querySelectorAll('.deuda-entidad__op')];
      const malos = [];
      for (const op of ops) {
        const n = op.querySelector('.deuda-entidad__n');
        const caja = op.getBoundingClientRect();
        for (const m of n.textContent.matchAll(/\S+/g)) {
          const r = document.createRange();
          const t = n.firstChild;
          r.setStart(t, m.index); r.setEnd(t, m.index + m[0].length);
          const rects = [...r.getClientRects()];
          if (rects.length > 1 || rects.some(x => x.left < caja.left - 1 || x.right > caja.right + 1)) malos.push(m[0]);
        }
      }
      return { columnas: new Set(ops.map(o => Math.round(o.getBoundingClientRect().left))).size, malos };
    });
    expect(tejas.malos).toEqual([]);
    expect(tejas.columnas).toBe(3);

    await form.locator('.chip-cat', { hasText: 'Libre inversión' }).click();
    await form.locator('.deuda-entidad__op', { hasText: 'Bancolombia' }).click();
    await form.locator('[data-preguntas-seguir]').click();
    for (const t of ['1', '000', '000']) await form.locator(`[data-pregunta-on] [data-tecla="${t}"]`).click();
    await form.locator('[data-preguntas-seguir]').click();
    await expect(form.locator('[data-dia="10"]')).toBeVisible();
    for (const ancho of [320, 360]) {
      await page.setViewportSize({ width: ancho, height: 780 });
      await page.waitForTimeout(150);
      const minimo = await form.locator('.dias__rejilla').evaluate(g => Math.min(...[...g.querySelectorAll('.dia:not(.dia--ancho)')].map(d => d.getBoundingClientRect().width)));
      expect(minimo, `${ancho}px: ancho del día`).toBeGreaterThanOrEqual(44);
    }
  });
});
