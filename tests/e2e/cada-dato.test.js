/**
 * cada-dato.test.js - SIT.1 (ADR 202): cada dato en su sitio. Criterios de
 * aceptación del lienzo "Finko móvil: cada dato en su sitio" (página 6,
 * Especificación), medidos con el escenario largo del lienzo ("Tarjeta de
 * crédito Bancolombia Mastercard Black", "Empresas Públicas de Medellín
 * EPM", "Davivienda Cuenta de Nómina Empresarial") a 320, 360, 375, 393 y
 * 430 px con la letra al 100, 115 y 130 % (el tamaño de la raíz, como en
 * telefonos.test.js):
 *
 * 1. Ninguna unidad (`.fk-unidad`), cifra ni estado se parte en dos
 *    renglones (sus rectángulos de línea comparten renglón).
 * 2. Ningún texto visible de la sección contiene " · ".
 * 3. Al 100 %, `.fila__nombre` ocupa a lo más 2 renglones desde 360 px y 3
 *    a 320.
 * 4. En cada fila, la cifra va en el primer renglón del nombre (±1,5 px
 *    entre sus centros), salvo a 320 con la letra al 130 %.
 * 5. Nada calcula `text-overflow: ellipsis` ni `hyphens: auto`.
 */

import { test, expect } from '@playwright/test';
import { sembrar } from './helpers/estado.js';

const hoy = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Un día del mes corriente, `n` días antes de hoy (sin salirse del mes). */
const antes = (n) => { const d = new Date(hoy); d.setDate(Math.max(1, hoy.getDate() - n)); return iso(d); };
const enDias = (n) => Math.min(hoy.getDate() + n, 28);
const creada = '2026-01-01T00:00:00.000Z';

export const ESCENARIO_LARGO = {
  version: 1,
  perfil: { nombre: 'María Fernanda', smmlv: 1750905 },
  onboarded: true,
  cuentas: [
    { id: 'c1', nombre: 'Bancolombia Ahorros', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 2_845_300, activa: true, fechaCreacion: creada },
    { id: 'c2', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 150_000, activa: true, fechaCreacion: creada },
    { id: 'c3', nombre: 'Davivienda Cuenta de Nómina Empresarial', banco: 'Davivienda', tipo: 'Ahorros', saldo: 1_204_000, activa: true, fechaCreacion: creada },
    { id: 'c4', nombre: 'Scotiabank Colpatria Corriente', banco: 'Scotiabank Colpatria', tipo: 'Corriente', saldo: 380_000, activa: true, fechaCreacion: creada },
    { id: 'c5', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 85_000, activa: true, fechaCreacion: creada },
  ],
  ingresos: [{ id: 'i1', descripcion: 'Salario mensual', monto: 4_200_000, frecuencia: 'Mensual', diaPago: enDias(3), activo: true, fechaCreacion: '2026-01-01' }],
  gastos: [
    { id: 'g1', nota: 'Almuerzo', monto: 22_000, categoria: 'Restaurantes', subcategoriaId: 'rest-almuerzo', fecha: iso(hoy), cuentaId: 'c1' },
    { id: 'g2', monto: 8_000, categoria: 'Café', subcategoriaId: 'cafe-tinto', fecha: iso(hoy), cuentaId: 'c5' },
    { id: 'g3', monto: 12_600, categoria: 'Bus, taxi y apps', subcategoriaId: 'transp-bus', fecha: iso(hoy), cuentaId: 'c2' },
    { id: 'g4', monto: 35_000, categoria: 'Bus, taxi y apps', subcategoriaId: 'transp-taxi', fecha: antes(1), cuentaId: 'c1' },
    { id: 'g5', nota: 'Mercado quincenal en el Éxito de Laureles', monto: 385_500, categoria: 'Mercado', subcategoriaId: 'mercado-super', fecha: antes(2), cuentaId: 'c3' },
    { id: 'g6', nota: 'Domicilio Rappi hamburguesas El Corral', monto: 64_800, categoria: 'Restaurantes', subcategoriaId: 'rest-domicilio', fecha: antes(3), cuentaId: 'c4' },
    { id: 'g7', monto: 48_400, categoria: 'Bus, taxi y apps', fecha: antes(3), cuentaId: 'c1' },
  ],
  compromisos: [
    { id: 'f1', tipo: 'fijo', descripcion: 'Arriendo apartamento Laureles', monto: 1_450_000, frecuencia: 'Mensual', diaPago: enDias(2), categoria: 'Arriendo', activo: true, fechaCreacion: '2026-01-01' },
    { id: 'f2', tipo: 'fijo', descripcion: 'Empresas Públicas de Medellín EPM', monto: 229_900, frecuencia: 'Mensual', diaPago: enDias(5), categoria: 'Servicios públicos', activo: true, fechaCreacion: '2026-01-01' },
    { id: 'f3', tipo: 'fijo', descripcion: 'Seguro de vida Sura', monto: 92_000, frecuencia: 'Mensual', diaPago: 3, categoria: 'Seguros', activo: true, fechaCreacion: '2026-08-01' },
    { id: 'd1', tipo: 'deuda-entidad', descripcion: 'Tarjeta de crédito Bancolombia Mastercard Black', entidad: 'Bancolombia', saldoTotal: 12_850_000, cuotaMensual: 1_180_000, tasa: 2.1, frecuencia: 'Mensual', diaPago: 3, categoria: 'Tarjeta de crédito', fechaCreacion: '2026-01-01' },
    { id: 'd2', tipo: 'deuda-entidad', descripcion: 'Crédito de libre inversión', entidad: 'Banco de Occidente', saldoTotal: 32_400_000, cuotaMensual: 1_250_000, tasa: 1.6, frecuencia: 'Mensual', diaPago: enDias(4), categoria: 'Crédito de consumo', fechaCreacion: '2026-01-01' },
  ],
  presupuestos: [
    { id: 'p1', categoria: 'Bus, taxi y apps', montoMensual: 60_000, activo: true, fechaCreacion: creada },
    { id: 'p2', categoria: 'Mercado', montoMensual: 600_000, activo: true, fechaCreacion: creada },
  ],
  metas: [],
};

/** Las secciones del teléfono que ya siguen las reglas del ADR 202, con lo que dice que ya se pintaron. */
const SECCIONES = ['gast', 'fijos', 'deudas', 'dash', 'presupuesto'];
const LISTA = {
  gast: '#sec-gast.active',
  fijos: '#sec-compromisos.active[data-lente="fijo"]',
  deudas: '#sec-compromisos.active[data-lente="deuda"]',
  dash: '#sec-dash.active',
  presupuesto: '#sec-presupuesto.active',
};

/** Mide los cinco criterios en la sección activa. */
function medir({ nombreMax, alinear }) {
  const sec = document.querySelector('.section.active');
  const visible = (el) => {
    if (el.closest('[hidden], .sr-only')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const out = [];
  for (const el of sec.querySelectorAll('.fk-unidad, .fila__cifra, .fila__estado [class*="estado"]')) {
    if (!visible(el)) continue;
    // Un hijo en negrita parte la unidad en dos rectángulos del mismo
    // renglón: cuenta como partida solo si un pedazo baja de renglón.
    const rects = [...el.getClientRects()].filter(r => r.width > 0);
    if (rects.some(r => r.top >= rects[0].bottom - 2)) out.push(`partida: ${el.textContent.trim()}`);
  }
  const walker = document.createTreeWalker(sec, 4); // NodeFilter.SHOW_TEXT
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.includes(' · ')) continue;
    const el = n.parentElement;
    if (el && visible(el) && getComputedStyle(el).visibility !== 'hidden') out.push(`punto: ${el.textContent.trim()}`);
  }
  for (const nombre of sec.querySelectorAll('.fila__nombre')) {
    if (!visible(nombre)) continue;
    const alto = parseFloat(getComputedStyle(nombre).lineHeight);
    const renglones = Math.round(nombre.getBoundingClientRect().height / alto);
    if (nombreMax && renglones > nombreMax) out.push(`renglones ${renglones}: ${nombre.textContent.trim()}`);
    const cifra = nombre.parentElement.querySelector(':scope > .fila__der .fila__cifra');
    if (alinear && cifra && visible(cifra)) {
      const r = document.createRange();
      r.selectNodeContents(nombre);
      const primero = [...r.getClientRects()].find(x => x.width > 0);
      const c = cifra.getBoundingClientRect();
      if (primero && Math.abs((c.top + c.height / 2) - (primero.top + primero.height / 2)) > 1.5) {
        out.push(`cifra desalineada: ${nombre.textContent.trim()}`);
      }
    }
  }
  for (const el of sec.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) out.push(`puntos suspensivos: ${el.textContent.trim()}`);
    if (cs.hyphens === 'auto') out.push(`guiones: ${el.className}`);
  }
  return [...new Set(out)];
}

const ANCHOS = [320, 360, 375, 393, 430];
const RAICES = ['16px', '18.4px', '20.8px'];

for (const ancho of ANCHOS) {
  for (const raiz of RAICES) {
    test.describe(`${ancho} px, raíz a ${raiz}`, () => {
      test.use({ viewport: { width: ancho, height: 900 } });

      test('cada dato en su sitio (SIT.1, ADR 202)', async ({ page }) => {
        test.setTimeout(60_000);
        await page.addInitScript((tam) => {
          document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = tam; });
        }, raiz);
        await sembrar(page, ESCENARIO_LARGO);
        await page.goto('/#dash');
        await page.waitForSelector('#sec-dash.active', { timeout: 15_000 });
        // El tope de renglones del nombre vale con la letra de fábrica.
        const nombreMax = raiz === '16px' ? (ancho < 360 ? 3 : 2) : 0;
        // A 320 con la letra al 130 % la primera palabra larga ("Transporte")
        // no cabe junto a la cifra: la cifra se queda arriba a la derecha y el
        // nombre empieza debajo (ADR 202, ajustes al aplicar).
        const alinear = !(ancho < 360 && raiz === '20.8px');
        for (const sec of SECCIONES) {
          await page.evaluate(s => { location.hash = '#' + s; }, sec);
          await page.waitForSelector(LISTA[sec], { timeout: 10_000 });
          await page.waitForTimeout(400);
          expect(await page.evaluate(medir, { nombreMax, alinear }), `#${sec}`).toEqual([]);
        }
      });
    });
  }
}

test.describe('Día a día del teléfono (SIT.1a, ADR 202 D1 y D3)', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('la fila dice lo que fue, la clasificación y la cuenta; el día, "Hoy jueves 26" sin punto', async ({ page }) => {
    await sembrar(page, ESCENARIO_LARGO);
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 15_000 });
    const fila = page.locator('#lista-gastos .list-item--fila[data-id="g5"]');
    await expect(fila.locator('.fila__nombre')).toHaveText('Mercado quincenal en el Éxito de Laureles');
    await expect(fila.locator('.fila__dato')).toHaveText(['Supermercado', 'Davivienda Cuenta de Nómina Empresarial Ahorros']);
    await expect(fila.locator('.fila__cifra')).toHaveText('$385.500');
    const encabezado = page.locator('#lista-gastos .gastos-dia').first().locator('.gastos-dia__label');
    await expect(encabezado).toHaveText(/^Hoy [a-záéíóú]+ \d{1,2}$/);
  });
});

test.describe('Inicio sin información (SIT.1d, ADR 202 D9)', () => {
  test.use({ viewport: { width: 360, height: 800 } });
  const enDiasExactos = (n) => { const d = new Date(hoy); d.setDate(hoy.getDate() + n); return d.getDate(); };
  const cuenta = { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 500_000, activa: true, fechaCreacion: creada };

  test('sin nada hoy y con algo en la semana: "Nada pendiente hoy" y lo próximo', async ({ page }) => {
    test.skip(hoy.getDate() > 24, 'el pago de dentro de dos días tiene que caer en este mes');
    await sembrar(page, { ...ESCENARIO_LARGO, gastos: [], presupuestos: [], cuentas: [cuenta],
      compromisos: [{ id: 'f1', tipo: 'fijo', descripcion: 'Administración', monto: 320_000, frecuencia: 'Mensual', diaPago: enDiasExactos(2), categoria: 'Arriendo', activo: true, fechaCreacion: '2026-01-01' }],
      ingresos: [] });
    await page.goto('/#dash');
    const hoyBloque = page.locator('#panel-atencion-hoy');
    await expect(hoyBloque.locator('.atencion-hoy__ok .atencion-hoy__frase')).toHaveText('Nada pendiente hoy', { timeout: 15_000 });
    await expect(hoyBloque.locator('.atencion-hoy__ok .atencion-hoy__detalle')).toHaveText(/^Lo próximo es el [a-záéíóú]+ \d{1,2}$/);
    await expect(hoyBloque).toBeVisible();
    await expect(page.locator('#panel-prioridades .esta-semana__lista')).toBeVisible();
  });

  test('con un pago hoy y nada en la semana: "Nada más esta semana" con su enlace', async ({ page }) => {
    await sembrar(page, { ...ESCENARIO_LARGO, gastos: [], presupuestos: [], cuentas: [cuenta], ingresos: [],
      compromisos: [{ id: 'f1', tipo: 'fijo', descripcion: 'Netflix', monto: 38_900, frecuencia: 'Mensual', diaPago: hoy.getDate(), categoria: 'Suscripciones', activo: true, fechaCreacion: '2026-01-01' }] });
    await page.goto('/#dash');
    const semana = page.locator('#panel-prioridades');
    await expect(semana.locator('.esta-semana__vacia-titulo')).toHaveText('Nada más esta semana', { timeout: 15_000 });
    await expect(semana).toBeVisible();
    await expect(semana.locator('.esta-semana__calendario')).toHaveAttribute('href', '#agenda');
    await expect(page.locator('#panel-todo-al-dia')).toBeHidden();
  });
});
