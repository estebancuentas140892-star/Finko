/**
 * a11y-gastos.test.js - GAS.17 (ADR 198): las hojas de Gastos en el teléfono,
 * pantalla por pantalla, en oscuro y en claro:
 *  - axe sin violaciones graves de WCAG 2.0, 2.1 y 2.2 (A y AA);
 *  - cada control habilitado con una zona de toque de al menos 44 x 44 px
 *    (WCAG 2.5.8 pide 24; la regla R4 de Finko, 44), medida tocando: los
 *    seudo-elementos que agrandan la zona cuentan y lo que tapa el control no.
 *
 * Antes de GAS.17, axe solo miraba la primera pantalla de seis formularios y
 * las zonas táctiles solo las secciones, no lo que pasa dentro de las hojas.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

const CUENTA = { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 3_000_000, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' };
const hoy = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DIA = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 2));
const INI = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));

/** axe sobre la hoja abierta (o la sección): solo lo serio y lo crítico. */
async function violaciones(page) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  return page.evaluate(async () => {
    const raiz = [...document.querySelectorAll('.modal-overlay[data-open]')].at(-1) ?? document.querySelector('main') ?? document.body;
    const r = await window.axe.run(raiz, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    return r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
      .map(v => `${v.id}: ${v.nodes.map(n => n.html.slice(0, 90)).join(' | ')}`);
  });
}

/** Los controles habilitados cuya zona de toque real queda bajo 44 px. */
function zonasChicas() {
  const raiz = [...document.querySelectorAll('.modal-overlay[data-open]')].at(-1) ?? document.querySelector('main');
  const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden], [inert]'); };
  const controles = [...raiz.querySelectorAll('button:not(:disabled), a[href], input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), select, textarea, label:has(> input[type="radio"]), label:has(> input[type="checkbox"])')].filter(visible);
  const out = [];
  for (const c of controles) {
    c.scrollIntoView({ block: 'center', inline: 'nearest' });
    const r = c.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const es = (x, y) => { const e = document.elementFromPoint(x, y); return Boolean(e && (e === c || c.contains(e) || e.closest('label') === c)); };
    const nombre = (c.getAttribute('aria-label') || c.textContent || c.id || c.className).replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!es(cx, cy)) { out.push(`tapado: ${nombre}`); continue; }
    let up = 0; while (up < 30 && es(cx, cy - up - 1)) up++;
    let dn = 0; while (dn < 30 && es(cx, cy + dn + 1)) dn++;
    let lf = 0; while (lf < 30 && es(cx - lf - 1, cy)) lf++;
    let rt = 0; while (rt < 30 && es(cx + rt + 1, cy)) rt++;
    const w = lf + rt + 1;
    const h = up + dn + 1;
    if (w < 44 || h < 44) out.push(`${w}x${h}: ${nombre}`);
  }
  return out;
}

async function revisar(page, pantalla, malos) {
  await page.waitForTimeout(250);
  for (const v of await violaciones(page)) malos.push(`${pantalla} axe ${v}`);
  for (const z of await page.evaluate(zonasChicas)) malos.push(`${pantalla} toque ${z}`);
}

const abrir = (page, accion, datos = {}) => page.evaluate(([a, d]) => {
  const b = document.createElement('button');
  b.dataset.action = a;
  Object.assign(b.dataset, d);
  document.body.appendChild(b);
  b.click();
  b.remove();
}, [accion, datos]);

for (const tema of ['dark', 'light']) {
  test.describe(`Hojas de Gastos accesibles, tema ${tema === 'dark' ? 'oscuro' : 'claro'} (GAS.17, ADR 198)`, () => {
    test.use({ viewport: { width: 393, height: 740 }, colorScheme: tema });
    test.beforeEach(async ({ page }) => {
      if (tema === 'light') await page.addInitScript(() => localStorage.setItem('fk_theme', 'light'));
    });

    test('el gasto fijo, de la cifra a la factura', async ({ page }) => {
      test.setTimeout(90_000);
      await sembrar(page, estadoBase({ cuentas: [CUENTA] }));
      await page.goto('/#fijos');
      await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
      await abrir(page, 'nuevo-gasto-fijo');
      const f = page.locator('#form-gasto-fijo');
      const malos = [];
      await revisar(page, 'monto', malos);
      for (const t of ['8', '5', '000']) await f.locator(`[data-pregunta-on] [data-tecla="${t}"]`).click();
      await f.locator('[data-preguntas-seguir]').click();
      await revisar(page, 'qué es', malos);
      await f.locator('.chip-cat', { hasText: 'Servicios públicos' }).click();
      await revisar(page, 'empresa', malos);
      await f.locator('[data-plataforma-grupo]:not([hidden]) .chip-cat--sin').click();
      await f.locator('#gfijo-servicio').fill('Agua del conjunto');
      await revisar(page, 'sin empresa', malos);
      await f.locator('[data-preguntas-seguir]').click();
      await f.locator('#gfijo-cuando .chip-fecha', { hasText: 'Otra' }).click();
      await f.locator('#gfijo-frecuencia-otra .chip-fecha', { hasText: 'Cada semana' }).click();
      await f.locator('.gfijo-semana__dia').nth(2).click();
      await revisar(page, 'cuándo', malos);
      await f.locator('[data-preguntas-seguir]').click();
      await expect(f.locator('[data-preguntas-t]')).toHaveText('Así queda tu gasto fijo');
      await revisar(page, 'factura', malos);
      expect(malos, malos.join('\n')).toEqual([]);
    });

    test('el gasto del día a día y "Nuevo límite"', async ({ page }) => {
      test.setTimeout(90_000);
      await sembrar(page, estadoBase({
        cuentas: [CUENTA],
        presupuestos: [{ id: 'p1', categoria: 'Mercado', montoMensual: 400_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }],
        gastos: [{ id: 'g1', categoria: 'Café', subcategoriaId: 'cafe-tinto', monto: 4_500, fecha: DIA, cuentaId: 'c1' }],
      }));
      const malos = [];
      await page.goto('/#gast');
      await page.locator('.nav-item--registrar').click({ timeout: 10_000 });
      const g = page.locator('#form-gasto');
      for (const t of ['4', '5', '0', '0']) await g.locator(`[data-tecla="${t}"]`).first().click();
      await g.locator('[data-gasto-seguir="monto"]').click();
      await revisar(page, 'gasto categoría', malos);
      await g.locator('.teja-op', { hasText: 'Café' }).click();
      await revisar(page, 'gasto detalle', malos);
      await page.keyboard.press('Escape');
      await page.goto('about:blank');
      await page.goto('/#presupuesto');
      await page.locator('.limites-cabeza__nuevo').click({ timeout: 10_000 });
      await revisar(page, 'límite categoría', malos);
      await page.locator('#form-presupuesto [data-categoria="Café"]').click();
      await revisar(page, 'límite monto', malos);
      await page.locator('#form-presupuesto [data-modo="parte"]').click();
      await revisar(page, 'límite parte', malos);
      expect(malos, malos.join('\n')).toEqual([]);
    });

    test('las pestañas, la ficha del fijo y "Nueva deuda"', async ({ page }) => {
      test.setTimeout(90_000);
      await sembrar(page, estadoBase({
        cuentas: [CUENTA],
        compromisos: [{ id: 'f1', tipo: 'fijo', descripcion: 'Netflix', categoria: 'Streaming', marcaId: 'netflix', monto: 44_900, diaPago: 3, frecuencia: 'Mensual', activo: true, fechaCreacion: INI }],
        presupuestos: [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 200_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }],
        gastos: [{ id: 'g1', categoria: 'Restaurantes', monto: 245_000, fecha: DIA, cuentaId: 'c1' }],
      }));
      const malos = [];
      for (const h of ['gast', 'fijos', 'deudas', 'presupuesto']) {
        await page.goto(`/#${h}`);
        await page.waitForTimeout(700);
        await revisar(page, `#${h}`, malos);
      }
      await page.goto('/#fijos');
      await page.locator('.deuda-card--fila [data-action="compromiso-detalle"]').first().click({ timeout: 10_000 });
      await revisar(page, 'ficha del fijo', malos);
      await page.goto('about:blank');
      await page.goto('/#deudas');
      await page.waitForTimeout(700);
      await abrir(page, 'nuevo-compromiso');
      await revisar(page, 'nueva deuda', malos);
      expect(malos, malos.join('\n')).toEqual([]);
    });
  });
}
