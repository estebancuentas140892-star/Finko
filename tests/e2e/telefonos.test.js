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

// INI.8 (ADR 201): con la letra del sistema grande, abrir "Bancos" ensanchaba
// la columna del bento (la fila de Nequi no bajaba de línea) y la banda entera
// se corría a la derecha. `main` recorta lo que sobra, así que el ancho de la
// página no lo delataba: se mide la banda antes y después de abrir.
test.describe('el desplegable de bancos no corre la banda (INI.8, ADR 201)', () => {
  for (const [ancho, alto, letra] of [[393, 852, '20.8px'], [393, 852, '18.4px'], [360, 780, '18.4px'], [320, 568, '20.8px']]) {
    test(`a ${ancho} con la raíz a ${letra}`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: alto });
      await conLetra(page, letra);
      await sembrar(page, ESTADO);
      await page.goto('/#dash');
      await page.waitForSelector('#sec-dash.active', { timeout: 15_000 });
      const banda = page.locator('#sec-dash .hero-inicio');
      const antes = await banda.boundingBox();

      await page.click('#saldo-lado-bancos');
      await expect(page.locator('#saldo-detalle-caja')).toBeVisible();
      await expect(page.locator('#saldo-detalle .hero-inicio__cuenta-tipo').nth(1)).toHaveText('Depósito de bajo monto');
      const despues = await banda.boundingBox();
      expect(Math.round(despues.x)).toBe(Math.round(antes.x));
      expect(Math.round(despues.width)).toBe(Math.round(antes.width));

      // Cada fila queda dentro de la caja y la caja dentro de la pantalla.
      const fuera = await page.evaluate(() => {
        const caja = document.getElementById('saldo-detalle-caja').getBoundingClientRect();
        const out = caja.right > window.innerWidth + 0.5 ? [`caja: ${caja.right}`] : [];
        for (const el of document.querySelectorAll('#saldo-detalle-caja *')) {
          const r = el.getBoundingClientRect();
          if (r.width && (r.left < caja.left - 0.5 || r.right > caja.right + 0.5)) out.push(el.className || el.tagName);
        }
        return out;
      });
      expect(fuera).toEqual([]);
      expect(await page.evaluate(problemas)).toEqual([]);
    });
  }
});

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

test.describe('hojas, teclas, ficha, búsqueda y tinta (TEL.1c, ADR 199 D11, D12, D14, D17, D19)', () => {
  test('la hoja sube hasta 40 del borde, o la zona superior + 8 (isla de 59: 67) (D11)', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await sembrar(page, ESTADO);
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 15_000 });
    await page.locator('.nav-item--registrar').click();
    const hoja = page.locator('#modal-gasto[data-open] > .modal');
    await expect(hoja).toBeVisible();
    await page.waitForTimeout(500);
    expect(Math.round((await hoja.boundingBox()).y)).toBe(40);
    await page.addStyleTag({ content: ':root { --fk-zona-arriba: 59px; }' });
    await page.waitForTimeout(100);
    expect(Math.round((await hoja.boundingBox()).y)).toBe(67);
  });

  test('a 932 de alto las teclas de "Nuevo límite" miden 56 (D12)', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await sembrar(page, ESTADO);
    await page.goto('/#presupuesto');
    await page.locator('.limites-cabeza__nuevo').click({ timeout: 15_000 });
    await page.locator('#form-presupuesto [data-categoria="Restaurantes"]').click();
    const tecla = page.locator('#form-presupuesto .limite-monto__teclado .kp__k').first();
    await expect(tecla).toBeVisible();
    expect(Math.round((await tecla.boundingBox()).height)).toBe(56);
  });

  test('en la ficha del gasto, 8 entre la papelera y la ✕; el subtítulo baja de línea (D14)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await sembrar(page, ESTADO);
    await page.goto('/#gast');
    await page.locator('#lista-gastos .list-item .list-item__detalle').first().click({ timeout: 15_000 });
    const cab = page.locator('#modal-gasto[data-open] .modal__header[data-etapa-cab="ficha"]');
    await expect(cab).toBeVisible();
    const m = await cab.evaluate((c) => {
      const p = c.querySelector('.modal__papelera').getBoundingClientRect();
      const x = c.querySelector('.modal__close').getBoundingClientRect();
      const sub = c.querySelector('.modal__sub');
      return { aire: x.left - p.right, puntos: getComputedStyle(sub).textOverflow, sale: sub.scrollWidth > sub.clientWidth + 1 };
    });
    expect(m.aire).toBeGreaterThanOrEqual(8);
    expect(m.puntos).not.toBe('ellipsis');
    expect(m.sale).toBe(false);
  });

  test('la búsqueda de Movimientos usa la versión corta solo si la larga no cabe (D17)', async ({ page }) => {
    await sembrar(page, ESTADO);
    // MOV.4 (ADR 200, S1): "Netflix, Nequi, 45.000..." donde cabe; si no, "Buscar".
    for (const [ancho, letra, texto] of [[320, '20.8px', 'Buscar'], [430, '16px', 'Netflix, Nequi, 45.000...']]) {
      await page.setViewportSize({ width: ancho, height: 800 });
      await page.goto('/#movimientos');
      await page.evaluate((t) => { document.documentElement.style.fontSize = t; }, letra);
      const campo = page.locator('#movimientos-buscar');
      await expect(campo).toHaveAttribute('placeholder', texto);
    }
  });

  test('en oscuro, la insignia lleva tinta oscura sobre el rojo (5,87:1) (D19)', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await sembrar(page, ESTADO);
    await page.goto('/#fijos');
    const insignia = page.locator('#sec-compromisos .bloque-tabs__badge:visible').first();
    await expect(insignia).toBeVisible({ timeout: 15_000 });
    expect(await insignia.evaluate(el => getComputedStyle(el).color)).toBe('rgb(27, 5, 8)');
  });
});

test.describe('avanzar al tocar, con frenos (TEL.1c, ADR 199 D15)', () => {
  test.use({ viewport: { width: 393, height: 852 }, hasTouch: true });

  test('un temblor que toca dos veces en 120 ms elige una sola cosa; con calma, el toque elige', async ({ page }) => {
    await sembrar(page, ESTADO);
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 15_000 });
    await page.locator('.nav-item--registrar').click();
    const g = page.locator('#form-gasto');
    for (const t of ['4', '5', '0', '0']) await g.locator(`[data-tecla="${t}"]`).first().click();
    await g.locator('[data-gasto-seguir="monto"]').click();
    const cafe = g.locator('.teja-op', { hasText: 'Café' });
    await expect(cafe).toBeVisible();
    await page.waitForTimeout(400);
    const c = await cafe.boundingBox();
    // Primer toque: elige Café y pasa a "¿En qué fue?". El segundo, 120 ms
    // después en el mismo punto, cae en la pantalla nueva: no elige nada.
    await page.touchscreen.tap(c.x + c.width / 2, c.y + c.height / 2);
    await page.waitForTimeout(120);
    await page.touchscreen.tap(c.x + c.width / 2, c.y + c.height / 2);
    await expect(g).toHaveAttribute('data-etapa-actual', 'detalle');
    await page.waitForTimeout(200);
    expect(await g.locator('[data-sub-grupo]:not([disabled]) input[name="subcategoriaId"]:checked').count()).toBe(0);
    await expect(g).toHaveAttribute('data-etapa-actual', 'detalle');
    // Pasada la gracia, un toque tranquilo elige.
    await page.waitForTimeout(400);
    const op = g.locator('[data-sub-grupo]:not([disabled]) label:has(input[name="subcategoriaId"])').first();
    const o = await op.boundingBox();
    await page.touchscreen.tap(o.x + o.width / 2, o.y + o.height / 2);
    await expect(g.locator('[data-sub-grupo]:not([disabled]) input[name="subcategoriaId"]:checked')).toHaveCount(1);
  });
});
