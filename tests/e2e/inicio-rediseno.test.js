/**
 * inicio-rediseno.test.js - Inicio en el teléfono según el tablero "Finko ·
 * Inicio, rediseño" (INI.2, ADR 152).
 *
 * Cubre en el navegador lo que los unitarios no pueden medir:
 * - D1 (INI.2a): el saldo centrado, el "$" volado a la mitad de la cifra y la
 *   ficha "En N cuentas" centrada.
 * - D2 (INI.2a): las cuentas abiertas con su tipo debajo del nombre y "Ver mis
 *   cuentas" al pie.
 * - D3 (INI.2b): "Atención hoy" resume los pagos con un botón "Pagar".
 * - D4 (INI.2b): "Esta semana" con "Calendario", "Sale" y el recuadro del día.
 * - D5 (INI.2c): la hoja "Pagos para hoy", tarjetas que se tocan enteras.
 * - D6 (INI.2d): "¿Desde qué cuenta pagas?", el aviso de lo que falta, volver
 *   al lote con las mismas casillas y pagar desde la marcada.
 * - D7 (INI.2e): "Completa el pago" reparte en el orden en que se marcan las
 *   cuentas y paga solo con el pago cubierto.
 * - D8 (INI.2f): sin nada hoy ni esta semana, Tino duerme en lugar de las dos
 *   tarjetas; con algo en una de las dos, no.
 *
 * Reloj fijo: lo vencido y lo de hoy dependen del día del mes.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

const HOY = new Date('2026-11-16T10:00:00');
// GAS.9c (ADR 183 D3): sin pagos, lo que vence desde la creación está vencido;
// los fijos nacen el día 1 del mes del escenario.
const FIJO_CREADO = '2026-11-01T15:00:00.000Z';

const CUENTAS = [
  { id: 'c1', nombre: 'Banco de Bogotá', banco: 'Banco de Bogotá', tipo: 'Ahorros', saldo: 1_373_900, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' },
  { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 2_180_500, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' },
  { id: 'c3', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 340_000, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' },
];

const fijo = (id, descripcion, monto, diaPago, categoria = 'Servicios') => ({
  id, descripcion, tipo: 'fijo', categoria, monto, frecuencia: 'Mensual',
  diaPago, activo: true, fechaCreacion: FIJO_CREADO,
});

/** El caso del tablero: un arriendo vencido ayer, Netflix y Claro hoy, el colegio el jueves. */
function estado(extra = {}) {
  return estadoBase({
    perfil: { nombre: 'Linay Muñoz', smmlv: 1750905 },
    cuentas: CUENTAS,
    compromisos: [
      fijo('k1', 'Arriendo', 1_350_000, 15, 'Vivienda'),
      fijo('k2', 'Netflix', 38_900, 16, 'Entretenimiento'),
      fijo('k3', 'Plan Claro', 65_000, 16),
      fijo('k4', 'Colegio', 682_016, 19, 'Educación'),
    ],
    ...extra,
  });
}

async function abrir(page, st = estado()) {
  await page.clock.setFixedTime(HOY);
  await sembrar(page, st);
  await page.goto('/#dash');
  await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
}

test.describe('INI.2a - el saldo al centro (ADR 152 D1 y D2)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('el saldo, centrado, con el "$" volado y la ficha de Bancos', async ({ page }) => {
    await abrir(page);
    await expect(page.locator('#hero-saldo-label')).toHaveText('Tu dinero disponible');
    await expect(page.locator('#saldo-total')).toHaveText('$3.894.400');
    // INI.6a (ADR 181 D1): sin efectivo, la ficha es solo Bancos.
    await expect(page.locator('#saldo-bancos')).toHaveText('$3.894.400');
    await expect(page.locator('#saldo-lado-efectivo')).toBeHidden();

    const medidas = await page.evaluate(() => {
      const caja = (s) => document.querySelector(s).getBoundingClientRect();
      const centro = (b) => b.left + b.width / 2;
      const signo = document.querySelector('#saldo-total .hero-inicio__signo');
      const cifra = document.querySelector('#saldo-total .hero-inicio__cifra');
      const valor = caja('#saldo-total');
      return {
        ancho: window.innerWidth,
        label: centro(caja('#hero-saldo-label')),
        pill: centro(caja('#saldo-lado-bancos')),
        // El monto ocupa lo que mide, centrado: "$" más cifra.
        monto: (signo.getBoundingClientRect().left + cifra.getBoundingClientRect().right) / 2,
        valorDentro: valor.left >= 0 && valor.right <= window.innerWidth,
        tamSigno: parseFloat(getComputedStyle(signo).fontSize),
        tamCifra: parseFloat(getComputedStyle(cifra).fontSize),
      };
    });
    expect(Math.abs(medidas.label - medidas.ancho / 2)).toBeLessThan(2);
    expect(Math.abs(medidas.pill - medidas.ancho / 2)).toBeLessThan(2);
    expect(Math.abs(medidas.monto - medidas.ancho / 2)).toBeLessThan(3);
    expect(medidas.valorDentro).toBe(true);
    expect(medidas.tamCifra).toBe(56);
    expect(medidas.tamSigno).toBe(28);
  });

  test('las cuentas abiertas dicen su tipo y llevan a Mis cuentas', async ({ page }) => {
    await abrir(page);
    await page.click('#saldo-lado-bancos');
    const filas = page.locator('#saldo-detalle .hero-inicio__cuenta');
    await expect(filas).toHaveCount(3);
    await expect(filas.nth(0).locator('.hero-inicio__cuenta-tipo')).toHaveText('Ahorros');
    await expect(filas.nth(2).locator('.hero-inicio__cuenta-tipo')).toHaveText('Depósito de bajo monto');
    await expect(filas.nth(2).locator('.hero-inicio__cuenta-saldo')).toHaveText('$340.000');
    const ir = page.locator('#saldo-detalle-caja .hero-inicio__ir-cuentas');
    await expect(ir).toHaveText('Ver mis cuentas');
    await expect(ir).toHaveAttribute('href', '#tesoreria');
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sobra).toBe(0);
  });

  // INI.7a (ADR 184 D1, tablero "Mejoras visuales de Inicio - Bancos,
  // Efectivo y Atención hoy", la alternativa): dos fichas en la banda, Bancos
  // y Efectivo con su monto, que suman el saldo. Cada una abre su grupo. En
  // una sola línea, centradas, con los montos enteros y la banda en 268.
  for (const ancho of [390, 360, 320]) {
    test(`a ${ancho}, dos fichas en la banda, en una línea, y cada una abre su grupo`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 844 });
      const efectivo = { id: 'c4', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 120_000, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' };
      await abrir(page, estado({ cuentas: [...CUENTAS, efectivo] }));
      await expect(page.locator('#saldo-total')).toHaveText('$4.014.400');
      await expect(page.locator('#saldo-bancos')).toHaveText('$3.894.400');
      await expect(page.locator('#saldo-efectivo')).toHaveText('$120.000');
      await expect(page.locator('#saldo-detalle-fichas .bank-avatar')).toHaveCount(3);
      await expect(page.locator('#saldo-lado-bancos')).toHaveAttribute('aria-label', 'Bancos $3.894.400. Ver tus cuentas de banco');
      await expect(page.locator('#saldo-lado-efectivo')).toHaveAttribute('aria-label', 'Efectivo $120.000. Ver tu efectivo');
      const medidas = await page.evaluate(() => {
        const b = document.querySelector('#saldo-lado-bancos').getBoundingClientRect();
        const e = document.querySelector('#saldo-lado-efectivo').getBoundingClientRect();
        const entero = (s) => { const m = document.querySelector(s); return m.scrollWidth <= m.clientWidth; };
        return {
          centro: (b.left + e.right) / 2 - window.innerWidth / 2,
          izquierda: b.left,
          derecha: window.innerWidth - e.right,
          espacio: e.left - b.right,
          mismaLinea: b.top === e.top,
          alto: [b.height, e.height],
          enteros: entero('#saldo-bancos') && entero('#saldo-efectivo'),
          flecha: document.querySelector('#saldo-fichas use[href="#i-chevron-down"]') === null,
          banda: document.querySelector('#sec-dash .hero-inicio').getBoundingClientRect().bottom,
        };
      });
      expect(Math.abs(medidas.centro)).toBeLessThan(2);
      expect(medidas.izquierda).toBeGreaterThanOrEqual(16);
      expect(medidas.derecha).toBeGreaterThanOrEqual(16);
      expect(medidas.espacio).toBeCloseTo(8, 0);
      expect(medidas.mismaLinea).toBe(true);
      expect(medidas.alto).toEqual([52, 52]);
      expect(medidas.enteros).toBe(true);
      expect(medidas.flecha).toBe(true);
      if (ancho === 390) expect(medidas.banda).toBe(268);

      await page.click('#saldo-lado-efectivo');
      await expect(page.locator('#saldo-lado-efectivo')).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#saldo-detalle .hero-inicio__grupo')).toHaveText(['En efectivo']);
      await expect(page.locator('#saldo-detalle .hero-inicio__cuenta-saldo')).toHaveText(['$120.000']);
      await expect(page.locator('#saldo-detalle .hero-inicio__cuenta-tipo')).toHaveText(['Lo que llevas encima']);
      await page.click('#saldo-lado-bancos');
      await expect(page.locator('#saldo-lado-efectivo')).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('#saldo-detalle .hero-inicio__grupo')).toHaveText(['En bancos · 3 cuentas']);
      await expect(page.locator('#saldo-detalle .hero-inicio__cuenta')).toHaveCount(3);
      await page.click('#saldo-lado-bancos');
      await expect(page.locator('#saldo-detalle-caja')).toBeHidden();
    });
  }

  test('a 320, las cifras largas caben enteras', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const cuentas = [
      { ...CUENTAS[1], saldo: 128_450_900 },
      { id: 'c4', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 2_380_000, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' },
    ];
    await abrir(page, estado({ cuentas }));
    await expect(page.locator('#saldo-bancos')).toHaveText('$128.450.900');
    const m = await page.evaluate(() => {
      const caja = (s) => document.querySelector(s).getBoundingClientRect();
      const entero = (s) => { const x = document.querySelector(s); return x.scrollWidth <= x.clientWidth; };
      return {
        dentro: caja('#saldo-lado-bancos').left >= 0 && caja('#saldo-lado-efectivo').right <= window.innerWidth,
        enteros: entero('#saldo-bancos') && entero('#saldo-efectivo'),
        sobra: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(m).toEqual({ dentro: true, enteros: true, sobra: 0 });
  });

  test('a 320px el saldo de mil millones cabe', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await abrir(page, estado({ cuentas: [{ ...CUENTAS[0], saldo: 1_234_567_890 }] }));
    await expect(page.locator('#saldo-total')).toHaveText('$1.234.567.890');
    const dentro = await page.evaluate(() => {
      const b = document.querySelector('#saldo-total .hero-inicio__cifra').getBoundingClientRect();
      return b.left >= 0 && b.right <= window.innerWidth;
    });
    expect(dentro).toBe(true);
  });
});

// INI.6d (ADR 181 D4): a la densidad de muchos Android (2,625) la junta del
// encabezado y el saldo caía a medio píxel físico y pintaba una raya oscura
// que aparecía al desplazar. El saldo monta 1 px sobre el encabezado.
test.describe('INI.6d - la junta del encabezado y el saldo sin raya', () => {
  test.use({ viewport: { width: 412, height: 640 }, deviceScaleFactor: 2.625 });

  test('el saldo monta 1 px sobre el encabezado y ninguna fila de la junta es más oscura', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await abrir(page);
    await page.click('#saldo-lado-bancos');
    const junta = await page.evaluate(() => ({
      encabezado: document.querySelector('#sec-dash .perfil-inicio').getBoundingClientRect().bottom,
      saldo: document.querySelector('#sec-dash .hero-inicio').getBoundingClientRect().top,
    }));
    expect(junta.saldo).toBe(junta.encabezado - 1);
    // Con el puntero encima (una ventana angosta con mouse), el saldo no se
    // levanta: "levantar lo que se pulsa" es de las tarjetas de escritorio.
    await page.hover('#saldo-lado-bancos');
    expect(await page.locator('#sec-dash .hero-inicio').evaluate(el => getComputedStyle(el).transform)).toBe('none');
    await page.mouse.move(400, 600);
    // Varias posiciones del desplazamiento: la raya dependía de la fase.
    for (const y of [0, 7.3, 13.7, 30.1]) {
      const sy = await page.evaluate((yy) => { window.scrollTo(0, yy); return window.scrollY; }, y);
      // Una franja de 8 px centrada en la junta, a la izquierda: ahí no pasan
      // los anillos ni el texto.
      const png = await page.screenshot({ clip: { x: 8, y: junta.encabezado - sy - 4, width: 24, height: 8 } });
      const filas = await page.evaluate(async (b64) => {
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const datos = ctx.getImageData(0, 0, c.width, c.height).data;
        const lum = [];
        for (let f = 0; f < c.height; f++) {
          let suma = 0;
          for (let x = 0; x < c.width; x++) {
            const i = (f * c.width + x) * 4;
            suma += (datos[i] + datos[i + 1] + datos[i + 2]) / 3;
          }
          lum.push(suma / c.width);
        }
        return lum;
      }, png.toString('base64'));
      const media = filas.reduce((a, b) => a + b, 0) / filas.length;
      for (const l of filas) expect(Math.abs(l - media), `desplazado ${y}`).toBeLessThan(8);
    }
  });
});

test.describe('INI.7b - Atención hoy en filas y Esta semana con el día (ADR 184 D2, ADR 152 D4)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // INI.7b (ADR 184 D2, tablero "Mejoras visuales de Inicio - Bancos,
  // Efectivo y Atención hoy"): cada compromiso es una fila de 84 con logo,
  // nombre, estado con ícono y palabra, y valor; "Pagar los N" al pie.
  test('cada pago es una fila y "Pagar los 3" abre el lote', async ({ page }) => {
    await abrir(page);
    const hoy = page.locator('#panel-atencion-hoy');
    await expect(hoy.locator('.atencion-hoy__titulo')).toHaveText('Atención hoy');
    await expect(hoy.locator('.atencion-hoy__resumen')).toHaveText('3 pagos · $1.453.900');
    await expect(hoy.locator('[data-action="atencion-hoy-ver"]')).toHaveCount(0);
    await expect(hoy.locator('.atencion-hoy__fila--destacada')).toHaveCount(0);
    const filas = hoy.locator('.atencion-hoy__lista--pagos .fila-atencion');
    await expect(filas.locator('.fila-atencion__nombre')).toHaveText(['Arriendo', 'Plan Claro', 'Netflix']);
    await expect(filas.locator('.fila-atencion__estado')).toHaveText(['Venció ayer', 'Vence hoy', 'Vence hoy']);
    await expect(filas.locator('.fila-atencion__valor')).toHaveText(['$1.350.000', '$65.000', '$38.900']);
    await expect(filas.nth(0).locator('.fila-atencion__estado--vencido use')).toHaveAttribute('href', '#i-alert');
    await expect(filas.nth(1).locator('.fila-atencion__estado--hoy use')).toHaveAttribute('href', '#i-clock');
    const pagar = hoy.locator('[data-action="inicio-pagar-lote"]');
    await expect(pagar).toHaveText('Pagar los 3');
    await expect(pagar).toHaveAttribute('aria-label', 'Pagar los 3 pagos para hoy');
    const medidas = await page.evaluate(() => {
      const caja = (s) => document.querySelector(s).getBoundingClientRect();
      const filas = [...document.querySelectorAll('#panel-atencion-hoy .fila-atencion__control')].map(b => Math.round(b.getBoundingClientRect().height));
      const logo = caja('#panel-atencion-hoy .fila-atencion__logo');
      const valor = document.querySelector('#panel-atencion-hoy .fila-atencion__valor');
      return {
        filas,
        logo: [Math.round(logo.width), Math.round(logo.height)],
        boton: Math.round(caja('#panel-atencion-hoy [data-action="inicio-pagar-lote"]').height),
        sobra: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        cifras: getComputedStyle(valor).fontVariantNumeric,
      };
    });
    expect(medidas).toEqual({ filas: [84, 84, 84], logo: [40, 40], boton: 48, sobra: 0, cifras: 'tabular-nums' });
    await pagar.click();
    await expect(page.locator('#modal-pago-lote')).toHaveAttribute('data-open', '');
    await expect(page.locator('#modal-pago-lote .lote-row__check:checked')).toHaveCount(3);
  });

  test('tocar un pago abre el lote con solo ese marcado', async ({ page }) => {
    await abrir(page);
    const fila = page.locator('#panel-atencion-hoy .fila-atencion__control', { hasText: 'Netflix' });
    await expect(fila).toHaveAttribute('aria-label', 'Pagar Netflix');
    await fila.click();
    const lote = page.locator('#modal-pago-lote');
    await expect(lote).toHaveAttribute('data-open', '');
    await expect(lote.locator('.lote-row__check')).toHaveCount(3);
    await expect(lote.locator('.lote-row__check:checked')).toHaveCount(1);
    await expect(lote.locator('.lote-row', { has: page.locator('.lote-row__check:checked') })).toContainText('Netflix');
    await expect(lote.locator('[data-role="lote-total"]')).toHaveText('$38.900');
  });

  test('Esta semana: "Calendario", "Sale" y el día al lado, a 28 de Atención hoy', async ({ page }) => {
    await abrir(page);
    const semana = page.locator('#panel-prioridades');
    await expect(semana.locator('.esta-semana__calendario')).toHaveAttribute('href', '#agenda');
    await expect(semana.locator('.esta-semana__totales')).toHaveText('Sale $682.016');
    const fila = semana.locator('.esta-semana__fila');
    await expect(fila).toHaveCount(1);
    await expect(fila.locator('.esta-semana__cuando')).toHaveText('Jue19');
    await expect(fila.locator('.esta-semana__tipo')).toHaveText('En 3 días · gasto fijo');
    await expect(fila.locator('.esta-semana__monto')).toHaveText('-$682.016');
    // Las tarjetas entran con un desliz: se mide cuando ya se asentaron.
    await expect.poll(() => page.evaluate(() => Math.round(
      document.querySelector('#panel-prioridades').getBoundingClientRect().top
      - document.querySelector('#panel-atencion-hoy').getBoundingClientRect().bottom,
    ))).toBe(28);
  });
});

test.describe('INI.2c - la hoja "Pagos para hoy" (ADR 152 D5)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('cada pago es una tarjeta con su logo y su estado; el pie cuenta', async ({ page }) => {
    await abrir(page);
    await page.locator('#panel-atencion-hoy [data-action="inicio-pagar-lote"]').click();
    const hoja = page.locator('#modal-pago-lote');
    await expect(hoja).toHaveAttribute('data-open', '');
    await expect(hoja.locator('#modal-pago-lote-title')).toHaveText('Pagos para hoy');
    await expect(hoja.locator('.modal__teja')).toHaveCount(0);
    const filas = hoja.locator('.lote-row');
    await expect(filas.locator('.lote-row__name')).toHaveText(['Arriendo', 'Plan Claro', 'Netflix']);
    await expect(filas.locator('.lote-row__sub')).toHaveText(['Venció el 15', 'Vence hoy', 'Vence hoy']);
    await expect(filas.nth(2).locator('.lote-row__logo .bank-avatar')).toBeVisible();
    await expect(hoja.locator('[data-role="lote-conteo"]')).toHaveText('3 de 3 seleccionados');
    await expect(hoja.locator('[data-role="lote-total"]')).toHaveText('$1.453.900');
    await expect(hoja.locator('[data-role="lote-cta-texto"]')).toHaveText('Pagar los 3');

    // La tarjeta se toca entera: la casilla la cubre toda.
    await filas.nth(0).click({ position: { x: 120, y: 20 } });
    await expect(filas.nth(0).locator('.lote-row__check')).not.toBeChecked();
    await expect(hoja.locator('[data-role="lote-conteo"]')).toHaveText('2 de 3 seleccionados');
    await expect(hoja.locator('[data-role="lote-total"]')).toHaveText('$103.900');

    await filas.nth(1).click();
    await filas.nth(2).click();
    const boton = hoja.locator('[data-action="compromisos-confirmar-lote"]');
    await expect(boton).toBeDisabled();
    await expect(boton).toHaveText('Elige al menos un pago');
    await expect(hoja.locator('[data-role="lote-total"]')).toHaveText('$0');
  });
});

test.describe('INI.2d - "¿Desde qué cuenta pagas?" (ADR 152 D6)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  async function hastaLaCuenta(page) {
    await abrir(page);
    await page.locator('#panel-atencion-hoy [data-action="inicio-pagar-lote"]').click();
    await page.locator('#modal-pago-lote [data-action="compromisos-confirmar-lote"]').click();
    const hoja = page.locator('.modal--cuenta-pago');
    await expect(hoja.locator('#cuenta-pref-title')).toHaveText('¿Desde qué cuenta pagas?');
    return hoja;
  }

  test('la propuesta es la de mayor saldo; la que no alcanza lo dice', async ({ page }) => {
    const hoja = await hastaLaCuenta(page);
    await expect(hoja.locator('.cuenta-pago__total')).toHaveText('Total a pagar $1.453.900');
    await expect(hoja.locator('input[name="cuentaId"]:checked')).toHaveValue('c2');
    await expect(hoja.locator('.cuenta-pago__tipo')).toHaveText(['Cuenta de ahorros', 'Cuenta de ahorros', 'Depósito de bajo monto']);
    const boton = hoja.locator('[data-role="confirmar"]');
    await expect(boton).toHaveText('Pagar $1.453.900');

    await hoja.locator('.cuenta-pago__opcion').nth(0).click();
    await expect(hoja.locator('.cuenta-pago__falta')).toContainText('faltan $80.000');
    await expect(boton).toHaveText('Completar con otra cuenta');
  });

  test('volver regresa al lote con las mismas casillas', async ({ page }) => {
    await abrir(page);
    await page.locator('#panel-atencion-hoy [data-action="inicio-pagar-lote"]').click();
    const lote = page.locator('#modal-pago-lote');
    await lote.locator('.lote-row').nth(2).click();
    await lote.locator('[data-action="compromisos-confirmar-lote"]').click();
    const hoja = page.locator('.modal--cuenta-pago');
    await expect(hoja.locator('.cuenta-pago__total')).toHaveText('Total a pagar $1.415.000');
    await hoja.locator('[data-role="volver"]').click();
    await expect(hoja).toHaveCount(0);
    await expect(lote).toHaveAttribute('data-open', '');
    await expect(lote.locator('.lote-row__check')).toHaveCount(3);
    await expect(lote.locator('[data-role="lote-conteo"]')).toHaveText('2 de 3 seleccionados');
  });

  test('pagar desde Bancolombia registra los tres y Atención hoy queda sin pagos', async ({ page }) => {
    const hoja = await hastaLaCuenta(page);
    await hoja.locator('[data-role="confirmar"]').click();
    await expect(hoja).toHaveCount(0);
    await expect(page.locator('#panel-atencion-hoy')).not.toContainText('pagos para hoy');
    await page.click('#saldo-lado-bancos');
    await expect(page.locator('#saldo-detalle .hero-inicio__cuenta').nth(1)).toContainText('$726.600');
  });
});

test.describe('INI.2e - "Completa el pago" (ADR 152 D7)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Bogotá no alcanza: Nequi completa los $80.000 y el pago sale de las dos', async ({ page }) => {
    await abrir(page);
    await page.locator('#panel-atencion-hoy [data-action="inicio-pagar-lote"]').click();
    await page.locator('#modal-pago-lote [data-action="compromisos-confirmar-lote"]').click();
    const cuenta = page.locator('.modal--cuenta-pago').first();
    await cuenta.locator('.cuenta-pago__opcion').nth(0).click();
    await cuenta.locator('[data-role="confirmar"]').click();

    const hoja = page.locator('.modal--completar');
    await expect(hoja.locator('#cuenta-multi-title')).toHaveText('Completa el pago');
    await expect(hoja.locator('.cuenta-multi__check:checked')).toHaveCount(1);
    await expect(hoja.locator('[data-role="resumen"]')).toHaveText('Faltan $80.000');
    const pagar = hoja.locator('[data-role="confirmar"]');
    await expect(pagar).toBeDisabled();
    await expect(pagar).toHaveText('Elige otra cuenta');

    await hoja.locator('.cuenta-multi__row').nth(2).click();
    await expect(hoja.locator('.cuenta-multi__usa')).toHaveText(['Usa $1.373.900', 'Usa $80.000']);
    await expect(hoja.locator('[data-role="resumen"]')).toHaveText('Pago completo');
    await expect(hoja.locator('[data-role="cubierto"]')).toHaveText('$1.453.900 de $1.453.900');
    // Nada se sale de la hoja a lo ancho.
    const sobra = await hoja.locator('.modal__body').evaluate(b => b.scrollWidth - b.clientWidth);
    expect(sobra).toBe(0);

    await pagar.click();
    await expect(hoja).toHaveCount(0);
    // INI.6a (ADR 181 D1): el pago sale de los bancos y la ficha lo dice.
    await expect(page.locator('#saldo-bancos')).toHaveText('$2.440.500');
    await page.click('#saldo-lado-bancos');
    const saldos = page.locator('#saldo-detalle .hero-inicio__cuenta-saldo');
    await expect(saldos).toHaveText(['$0', '$2.180.500', '$260.000']);
  });

  test('volver desde "Completa el pago" regresa a la cuenta con Bogotá marcada', async ({ page }) => {
    await abrir(page);
    await page.locator('#panel-atencion-hoy [data-action="inicio-pagar-lote"]').click();
    await page.locator('#modal-pago-lote [data-action="compromisos-confirmar-lote"]').click();
    await page.locator('.modal--cuenta-pago .cuenta-pago__opcion').nth(0).click();
    await page.locator('.modal--cuenta-pago [data-role="confirmar"]').click();
    await page.locator('.modal--completar [data-role="volver"]').click();
    await expect(page.locator('.modal--completar')).toHaveCount(0);
    await expect(page.locator('.modal--cuenta-pago input[name="cuentaId"]:checked')).toHaveValue('c1');
    await expect(page.locator('.modal--cuenta-pago .cuenta-pago__falta')).toBeVisible();
  });
});

test.describe('INI.2f - "Todo al día" (ADR 152 D8)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // INI.4 (ADR 155): la hamaca del tablero "Inicio · Tino descansa".
  test('sin nada hoy ni esta semana, Tino descansa en su hamaca en lugar de las dos tarjetas', async ({ page }) => {
    await abrir(page, estado({ compromisos: [fijo('k9', 'Seguro', 90_000, 28)] }));
    const tino = page.locator('#panel-todo-al-dia');
    await expect(tino).toBeVisible();
    await expect(tino.getByRole('heading', { level: 2 })).toHaveText('¡Fuera preocupaciones!');
    await expect(tino.locator('.todo-al-dia__texto')).toHaveText('No tienes pagos pendientes hoy ni esta semana.');
    await expect(tino.locator('img')).toHaveAttribute('src', 'assets/tino/tino-hamaca.svg');
    await expect(tino.locator('img')).toHaveAttribute('alt', '');
    await expect(page.locator('#panel-atencion-hoy')).toBeHidden();
    await expect(page.locator('#panel-prioridades')).toBeHidden();
    // Como el tablero "Mejoras visuales de Inicio" a 390 x 844 (INI.6b, ADR
    // 181 D2): la hamaca de 300, colgada 10 px sobre el borde del saldo,
    // centrada; el título en 599 y nada que desplazar (las celdas entran con
    // un desliz: se mide cuando se asientan). El ancho se lee sin el vaivén.
    await expect.poll(() => page.evaluate(() => {
      const caja = (s) => document.querySelector(s).getBoundingClientRect();
      const saldo = caja('#sec-dash .hero-inicio');
      const hamaca = caja('#panel-todo-al-dia .todo-al-dia__mece');
      const ancho = document.querySelector('#panel-todo-al-dia .todo-al-dia__mece').offsetWidth;
      const titulo = caja('#panel-todo-al-dia .todo-al-dia__titulo');
      return Math.abs(saldo.bottom - 10.4 - hamaca.top) < 2
        && Math.abs(hamaca.left + hamaca.width / 2 - 195) < 2
        && ancho === 300
        && Math.abs(titulo.top - 599) < 3
        && document.scrollingElement.scrollHeight <= window.innerHeight;
    })).toBe(true);
    // La hamaca se pinta encima del saldo: los ganchos no quedan tapados. No
    // recibe toques, así que se le prestan solo para preguntar qué se pinta.
    const encima = await page.evaluate(() => {
      const s = document.querySelector('#sec-dash .hero-inicio').getBoundingClientRect();
      const mece = document.querySelector('#panel-todo-al-dia .todo-al-dia__mece');
      const h = mece.getBoundingClientRect();
      const toques = getComputedStyle(mece).pointerEvents;
      mece.style.pointerEvents = 'auto';
      const el = document.elementFromPoint(h.left + h.width * 0.044, s.bottom - 3);
      mece.style.pointerEvents = '';
      return toques === 'none' && (el?.classList.contains('todo-al-dia__tino') ?? false);
    });
    expect(encima).toBe(true);
  });

  // INI.6b (ADR 181 D2): Tino y su mensaje se ven enteros, sin desplazar,
  // sobre "Registrar" con 12 de aire, en cualquier alto; la medida sale del
  // navegador, así que también con la letra del sistema más grande y al
  // cambiar el alto de la ventana.
  const cabeSobreRegistrar = (page) => page.evaluate(() => {
    const caja = (s) => document.querySelector(s).getBoundingClientRect();
    const texto = caja('#panel-todo-al-dia .todo-al-dia__texto');
    const fab = caja('.nav-item--registrar .nav-item__fab');
    const saldo = caja('#sec-dash .hero-inicio');
    const hamaca = caja('#panel-todo-al-dia .todo-al-dia__mece');
    return window.scrollY === 0 && texto.bottom <= fab.top - 11 && hamaca.top < saldo.bottom && texto.height > 0;
  });

  for (const [ancho, alto] of [[360, 640], [375, 667], [412, 915]]) {
    test(`a ${ancho} x ${alto}, Tino y su mensaje caben sobre "Registrar"`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: alto });
      await abrir(page, estado({ compromisos: [fijo('k9', 'Seguro', 90_000, 28)] }));
      await expect(page.locator('#panel-todo-al-dia')).toBeVisible();
      await expect.poll(() => cabeSobreRegistrar(page)).toBe(true);
    });
  }

  // TEL.1b (ADR 199 D9 y D10): a 320 la cifra del saldo va a 51 (el lienzo
  // pide 52; antes el 14,4 % del ancho la dejaba en 46) y la hamaca llega a
  // su mínimo: como en el lienzo, se acepta desplazar unos px y al final el
  // mensaje termina sobre "Registrar".
  test('a 320 x 568 manda el mínimo de la hamaca y, al desplazar, el mensaje termina sobre "Registrar"', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await abrir(page, estado({ compromisos: [fijo('k9', 'Seguro', 90_000, 28)] }));
    await expect(page.locator('#panel-todo-al-dia')).toBeVisible();
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => {
      const caja = (s) => document.querySelector(s).getBoundingClientRect();
      return {
        texto: caja('#panel-todo-al-dia .todo-al-dia__texto').bottom,
        fab: caja('.nav-item--registrar .nav-item__fab').top,
        hamaca: caja('#panel-todo-al-dia .todo-al-dia__mece').width,
        desplaza: document.documentElement.scrollHeight - window.innerHeight,
      };
    });
    expect(m.hamaca).toBeGreaterThanOrEqual(120);
    expect(m.desplaza).toBeLessThan(80);
    expect(m.texto).toBeLessThanOrEqual(m.fab - 8);
  });

  test('con la letra más grande y al cambiar el alto, la hamaca se vuelve a medir', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await abrir(page, estado({ compromisos: [fijo('k9', 'Seguro', 90_000, 28)] }));
    await expect.poll(() => cabeSobreRegistrar(page)).toBe(true);
    const anchoDe = () => page.locator('#panel-todo-al-dia .todo-al-dia__mece').evaluate(el => el.offsetWidth);
    const antes = await anchoDe();
    await page.addStyleTag({ content: 'html { font-size: 20px; }' });
    await expect.poll(() => cabeSobreRegistrar(page)).toBe(true);
    expect(await anchoDe()).toBeLessThan(antes);
    await page.setViewportSize({ width: 375, height: 812 });
    await expect.poll(anchoDe).toBeGreaterThan(antes);
    await expect.poll(() => cabeSobreRegistrar(page)).toBe(true);
  });

  // INI.6c (ADR 181 D3): se mece Tino con su hamaca; la luna se queda quieta.
  test('Tino se mece y la luna no; con "reducir movimiento" nada se mueve', async ({ page }) => {
    await abrir(page, estado({ compromisos: [fijo('k9', 'Seguro', 90_000, 28)] }));
    const tino = page.locator('#panel-todo-al-dia .todo-al-dia__tino');
    const luna = page.locator('#panel-todo-al-dia .todo-al-dia__luna');
    await expect(tino).toBeVisible();
    expect(await tino.evaluate(el => getComputedStyle(el).animationName)).toBe('todo-al-dia-mece');
    expect(await luna.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    expect(await page.locator('#panel-todo-al-dia .todo-al-dia__mece').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    // La luna es el disco del dibujo: centrada en la caja, el 74,4 % de su ancho.
    const geo = await page.evaluate(() => {
      const caja = document.querySelector('#panel-todo-al-dia .todo-al-dia__mece').getBoundingClientRect();
      const l = document.querySelector('#panel-todo-al-dia .todo-al-dia__luna').getBoundingClientRect();
      return { centro: l.left + l.width / 2 - (caja.left + caja.width / 2), ancho: l.width / caja.width, redonda: Math.abs(l.width - l.height) < 0.5 };
    });
    expect(Math.abs(geo.centro)).toBeLessThan(1);
    expect(geo.ancho).toBeCloseTo(0.744, 2);
    expect(geo.redonda).toBe(true);
    // Mientras Tino cambia de ladeo, la luna no se mueve dentro de su caja
    // (la caja entra con el desliz de las celdas, así que se mide contra ella).
    const foto = () => page.evaluate(() => {
      const caja = document.querySelector('#panel-todo-al-dia .todo-al-dia__mece').getBoundingClientRect();
      const l = document.querySelector('#panel-todo-al-dia .todo-al-dia__luna').getBoundingClientRect();
      return {
        luna: [l.left - caja.left, l.top - caja.top, l.width, l.height].map(n => Math.round(n * 100) / 100).join(),
        tino: getComputedStyle(document.querySelector('#panel-todo-al-dia .todo-al-dia__tino')).transform,
      };
    });
    const antes = await foto();
    await expect.poll(async () => (await foto()).tino).not.toBe(antes.tino);
    expect((await foto()).luna).toBe(antes.luna);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await tino.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  });

  test('con pagos hoy o algo esta semana, Tino no sale', async ({ page }) => {
    await abrir(page);
    await expect(page.locator('#panel-todo-al-dia')).toBeHidden();
    await expect(page.locator('#panel-atencion-hoy')).toBeVisible();
  });

  test('escritorio no cambia: Tino no sale', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await abrir(page, estado({ compromisos: [] }));
    await expect(page.locator('#panel-todo-al-dia')).toBeHidden();
  });
});
