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
