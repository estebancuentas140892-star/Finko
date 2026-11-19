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

const CUENTAS = [
  { id: 'c1', nombre: 'Banco de Bogotá', banco: 'Banco de Bogotá', tipo: 'Ahorros', saldo: 1_373_900, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' },
  { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 2_180_500, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' },
  { id: 'c3', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 340_000, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' },
];

const fijo = (id, descripcion, monto, diaPago, categoria = 'Servicios') => ({
  id, descripcion, tipo: 'fijo', categoria, monto, frecuencia: 'Mensual',
  diaPago, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z',
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
        pill: centro(caja('#saldo-detalle-toggle')),
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
    await page.click('#saldo-detalle-toggle');
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

  // INI.6a (ADR 181 D1, tablero "Mejoras visuales de Inicio", A): la ficha
  // partida. Bancos y Efectivo con su monto, que suman el saldo; abierta, las
  // cuentas en dos grupos.
  for (const ancho of [390, 360]) {
    test(`a ${ancho}, la ficha parte el saldo en Bancos y Efectivo y cabe`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 740 });
      const efectivo = { id: 'c4', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 120_000, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' };
      await abrir(page, estado({ cuentas: [...CUENTAS, efectivo] }));
      await expect(page.locator('#saldo-total')).toHaveText('$4.014.400');
      await expect(page.locator('#saldo-bancos')).toHaveText('$3.894.400');
      await expect(page.locator('#saldo-efectivo')).toHaveText('$120.000');
      await expect(page.locator('#saldo-detalle-fichas .bank-avatar')).toHaveCount(3);
      await expect(page.locator('#saldo-detalle-toggle')).toHaveAttribute('aria-label', 'Bancos $3.894.400, efectivo $120.000. Ver detalle por cuenta');
      const medidas = await page.evaluate(() => {
        const ficha = document.querySelector('#saldo-detalle-toggle').getBoundingClientRect();
        const dentro = (s) => {
          const b = document.querySelector(s).getBoundingClientRect();
          return b.left >= ficha.left && b.right <= ficha.right && b.width > 0;
        };
        const monto = document.querySelector('#saldo-bancos');
        return {
          centro: ficha.left + ficha.width / 2 - window.innerWidth / 2,
          ancho: ficha.width,
          alto: ficha.height,
          montos: dentro('#saldo-bancos') && dentro('#saldo-efectivo'),
          entero: monto.scrollWidth <= monto.clientWidth,
        };
      });
      expect(Math.abs(medidas.centro)).toBeLessThan(2);
      expect(medidas.ancho).toBeLessThanOrEqual(342);
      expect(medidas.alto).toBe(56);
      expect(medidas.montos).toBe(true);
      expect(medidas.entero).toBe(true);

      await page.click('#saldo-detalle-toggle');
      await expect(page.locator('#saldo-detalle .hero-inicio__grupo')).toHaveText(['En bancos', 'En efectivo']);
      await expect(page.locator('#saldo-detalle .hero-inicio__grupo-lista').nth(1).locator('.hero-inicio__cuenta-saldo')).toHaveText(['$120.000']);
    });
  }

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

test.describe('INI.2b - Atención hoy resumida y Esta semana con el día (ADR 152 D3 y D4)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('los pagos se resumen y "Pagar" abre el lote', async ({ page }) => {
    await abrir(page);
    const hoy = page.locator('#panel-atencion-hoy');
    await expect(hoy.locator('.atencion-hoy__titulo')).toHaveText('Atención hoy');
    await expect(hoy.locator('[data-action="atencion-hoy-ver"]')).toHaveCount(0);
    const destacada = hoy.locator('.atencion-hoy__fila--destacada');
    await expect(destacada.locator('.atencion-hoy__sev')).toHaveText('Importante');
    await expect(destacada.locator('.atencion-hoy__frase')).toHaveText('3 pagos para hoy');
    await expect(destacada.locator('.atencion-hoy__detalle')).toHaveText('$1.453.900 · 1 ya vencido');
    const pagar = destacada.locator('[data-action="inicio-pagar-lote"]');
    await expect(pagar).toHaveText('Pagar');
    await expect(pagar).toHaveAttribute('aria-label', 'Pagar los 3 pagos para hoy');
    const medidas = await page.evaluate(() => {
      const t = document.querySelector('#panel-atencion-hoy .atencion-hoy__fila--destacada .atencion-hoy__icono').getBoundingClientRect();
      const b = document.querySelector('#panel-atencion-hoy [data-action="inicio-pagar-lote"]').getBoundingClientRect();
      return { teja: Math.round(t.width), boton: Math.round(b.height) };
    });
    expect(medidas).toEqual({ teja: 48, boton: 50 });
    await pagar.click();
    await expect(page.locator('#modal-pago-lote')).toHaveAttribute('data-open', '');
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
    await page.click('#saldo-detalle-toggle');
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
    await page.click('#saldo-detalle-toggle');
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
    // Como el tablero a 390 x 844: la hamaca de 320, colgada 11 px sobre el
    // borde del saldo, centrada; el título en 628 y nada que desplazar (las
    // celdas entran con un desliz: se mide cuando se asientan).
    await expect.poll(() => page.evaluate(() => {
      const caja = (s) => document.querySelector(s).getBoundingClientRect();
      const saldo = caja('#sec-dash .hero-inicio');
      const hamaca = caja('#panel-todo-al-dia .todo-al-dia__mece');
      const titulo = caja('#panel-todo-al-dia .todo-al-dia__titulo');
      return Math.abs(saldo.bottom - 11 - hamaca.top) < 2
        && Math.abs(hamaca.left + hamaca.width / 2 - 195) < 2
        && Math.abs(hamaca.width - 320) < 2
        && Math.abs(titulo.top - 628) < 3
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

  test('la hamaca se mece, y con "reducir movimiento" se queda quieta', async ({ page }) => {
    await abrir(page, estado({ compromisos: [fijo('k9', 'Seguro', 90_000, 28)] }));
    const mece = page.locator('#panel-todo-al-dia .todo-al-dia__mece');
    await expect(mece).toBeVisible();
    expect(await mece.evaluate(el => getComputedStyle(el).animationName)).toBe('todo-al-dia-mece');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await mece.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
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
