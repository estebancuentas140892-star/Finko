/**
 * inicio-hoy.test.js - "Atención hoy" de Inicio en móvil (MV2.15a, ADR 099).
 *
 * Cubre en el navegador lo que los unitarios no pueden medir:
 * - D1: una fila por clase de aviso, tope de tres, y los paneles que reemplaza
 *   no se ven bajo 1024px.
 * - D3: la lente, "Ver los N" y la hoja dicen el mismo número; pagar desde la
 *   hoja la cierra y abre el lote con esos mismos pagos.
 * - D2: lo de mañana no cuenta arriba y sigue en la lista de la semana.
 * - D5 (MV2.15b): "Esta semana", con lo que entra primero y el pie por lado.
 * - Escritorio no cambia: la lista no existe y los paneles siguen.
 * - INI.1 (ADR 149 D2): el límite pasado ya no está en "Atención hoy"; lo dice
 *   "Novedades", en los dos anchos.
 * - A 320px nada desborda a lo ancho.
 * - D6 y D7 (MV2.15c): el avatar abre la hoja de perfil, que lleva a cada
 *   bloque de Ajustes y le pasa el teléfono a un niño; sin engranaje.
 *
 * Reloj fijo (`page.clock.setFixedTime`): lo vencido, lo de hoy y lo de
 * mañana dependen del día del mes (mismo criterio que BUG-021).
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

const HOY = new Date('2026-08-13T10:00:00');
// GAS.9c (ADR 183 D3): sin pagos, lo que vence desde la creación está vencido;
// los fijos nacen el día 1 del mes del escenario.
const FIJO_CREADO = '2026-08-01T15:00:00.000Z';

const fijo = (id, descripcion, monto, diaPago) => ({
  id, descripcion, tipo: 'fijo', categoria: 'Vivienda', monto, frecuencia: 'Mensual',
  diaPago, activo: true, fechaCreacion: FIJO_CREADO,
});

/**
 * Uso normal en pequeño: un arriendo vencido y un plan que vence hoy (2
 * pagos) y un salario sin distribuir (3 avisos de hoy). El límite pasado es
 * novedad (ADR 149 D2). Un colegio y un préstamo vencen mañana: no son de hoy.
 */
function estado() {
  return estadoBase({
    perfil: { nombre: 'Laura', smmlv: 1750905 },
    cuentas: [{ id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 3_000_000, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' }],
    ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 4_200_000, frecuencia: 'Mensual', categoria: 'Salario', diaPago: 1, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z', cuentaId: 'c1' }],
    compromisos: [fijo('k1', 'Arriendo', 1_350_000, 5), fijo('k2', 'Plan Claro', 65_000, 13), fijo('k3', 'Colegio', 682_016, 14)],
    presupuestos: [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 200_000, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z' }],
    gastos: [{ id: 'g1', monto: 250_000, categoria: 'Restaurantes', descripcion: 'Cena', fecha: '2026-08-10', cuentaId: 'c1' }],
    personales: [{ id: 'pe1', persona: 'Juan', monto: 100_000, pagado: 0, fecha: '2026-08-01', fechaLimite: '2026-08-14', liquidado: false, fechaCreacion: '2026-08-01T00:00:00.000Z' }],
  });
}

/**
 * Con una clase más de las que caben (INI.2b, ADR 152 D9): Ana debía pagar
 * ayer y la reserva del SOAT vence hoy sin completar.
 */
function estadoConMas() {
  const base = estado();
  return {
    ...base,
    // INI.7b (ADR 184 D2): cuatro pagos, uno más de los que caben.
    compromisos: [...base.compromisos, fijo('k4', 'Internet', 90_000, 13), fijo('k5', 'Gimnasio', 120_000, 13)],
    apartados: [{ id: 'a1', nombre: 'SOAT', montoObjetivo: 500_000, montoActual: 100_000, fechaObjetivo: '2026-08-13', completado: false, fechaCreacion: '2026-01-01T00:00:00.000Z' }],
    personales: [...base.personales, { id: 'pe2', persona: 'Ana', monto: 80_000, pagado: 0, fecha: '2026-08-01', fechaLimite: '2026-08-12', liquidado: false, fechaCreacion: '2026-08-01T00:00:00.000Z' }],
  };
}

async function abrir(page, st = estado()) {
  await page.clock.setFixedTime(HOY);
  await sembrar(page, st);
  await page.goto('/#dash');
  await page.waitForSelector('#panel-atencion-hoy:not([hidden]) .atencion-hoy__fila', { timeout: 10_000 });
}

test.describe('MV2.15a - Atención hoy en móvil (ADR 099)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('un pago por fila, lo demás aparte, y los paneles que reemplaza no se ven (D1)', async ({ page }) => {
    await abrir(page);
    // INI.7b (ADR 184 D2): cada pago es una fila; lo que no es un pago va
    // bajo "También necesita tu atención".
    const hoy = page.locator('#panel-atencion-hoy');
    await expect(hoy.locator('.atencion-hoy__resumen')).toHaveText('2 pagos · $1.415.000');
    await expect(hoy.locator('.atencion-hoy__lista--pagos .fila-atencion__nombre')).toHaveText(['Arriendo', 'Plan Claro']);
    await expect(hoy.locator('.atencion-hoy__lista--pagos .fila-atencion__estado')).toHaveText(['Venció hace 8 días', 'Vence hoy']);
    await expect(hoy.locator('[data-action="inicio-pagar-lote"]')).toHaveText('Pagar los 2');
    await expect(hoy.locator('.atencion-hoy__subtitulo')).toHaveText('También necesita tu atención');
    const otras = hoy.locator('.atencion-hoy__lista--otras .fila-atencion');
    await expect(otras).toHaveCount(1);
    await expect(otras.locator('.fila-atencion__nombre')).toHaveText('Tu ingreso del 1 de ago');
    await expect(otras.locator('.fila-atencion__estado--info')).toHaveText('Sin distribuir');
    // Todo cabe: no hay "Ver todos".
    await expect(hoy.locator('[data-action="atencion-hoy-ver"]')).toHaveCount(0);
    for (const id of ['#panel-vencidos', '#panel-distribuir-inicio', '#label-atencion-hoy']) {
      await expect(page.locator(id)).toBeHidden();
    }
    // INI.1 (ADR 149 D2): el límite pasado es novedad.
    await expect(page.locator('#panel-limites')).toHaveCount(0);
    await expect(page.locator('#panel-novedades')).toContainText('Restaurantes pasó su límite');
  });

  test('"N pagos más" abre la hoja con todo lo de hoy; lo de mañana no cuenta (D2, D3)', async ({ page }) => {
    await abrir(page, estadoConMas());
    // ADR 101 D1: Inicio ya no tiene lentes.
    await expect(page.locator('#tabs-dash')).toHaveCount(0);
    // INI.7b (ADR 184 D2): tres pagos a la vista y "1 pago más"; lo demás,
    // tu ingreso, el SOAT y Ana, en su tarjeta.
    await expect(page.locator('#panel-atencion-hoy .atencion-hoy__lista--pagos .fila-atencion:not(.fila-atencion--mas)')).toHaveCount(3);
    await expect(page.locator('#panel-atencion-hoy .atencion-hoy__lista--otras .fila-atencion__nombre'))
      .toHaveText(['Tu ingreso del 1 de ago', 'Ana', 'SOAT']);
    const ver = page.locator('#panel-atencion-hoy [data-action="atencion-hoy-ver"]');
    await expect(ver).toContainText('1 pago más');
    await expect(ver).toContainText('Ver todos');

    await ver.click();
    const hoja = page.locator('#modal-avisos-hoy');
    await expect(hoja).toHaveAttribute('data-open', '');
    await expect(hoja.locator('#avisos-hoy-titulo')).toHaveText('Avisos de hoy · 7');
    await expect(hoja.locator('.avisos-hoy__item')).toHaveCount(7);

    // Lo de mañana sigue abajo, y lo de hoy ya no se repite ahí.
    const prioridades = page.locator('#panel-prioridades');
    await expect(prioridades).toContainText('Colegio');
    await expect(prioridades).toContainText('Juan te debe');
    await expect(prioridades).not.toContainText('Plan Claro');
  });

  test('Esta semana: lo de mañana, lo que entra primero y el pie con cada lado (MV2.15b, D5)', async ({ page }) => {
    await abrir(page);
    const semana = page.locator('#panel-prioridades');
    await expect(semana.locator('.esta-semana__titulo')).toHaveText('Esta semana');
    const filas = semana.locator('.esta-semana__fila');
    await expect(filas).toHaveCount(2);
    await expect(filas.nth(0)).toContainText('Juan te debe');
    await expect(filas.nth(0).locator('.esta-semana__monto')).toHaveText('+$100.000');
    await expect(filas.nth(1)).toContainText('Colegio');
    await expect(filas.nth(1).locator('.esta-semana__tipo')).toHaveText('Mañana · gasto fijo');
    await expect(filas.nth(1).locator('.esta-semana__monto')).toHaveText('-$682.016');
    // ADR 126 D4: los totales van arriba de la tarjeta.
    await expect(semana.locator('.esta-semana__totales')).toContainText('Entra $100.000');
    await expect(semana.locator('.esta-semana__totales')).toContainText('Sale $682.016');
  });

  test('pagar desde la hoja la cierra y abre el lote con esos mismos pagos (D3)', async ({ page }) => {
    await abrir(page, estadoConMas());
    await page.locator('#panel-atencion-hoy [data-action="atencion-hoy-ver"]').click();
    await page.locator('#modal-avisos-hoy .avisos-hoy__cta[data-target-action="inicio-pagar-lote"]').click();

    await expect(page.locator('#modal-avisos-hoy')).not.toHaveAttribute('data-open', '');
    await expect(page.locator('#modal-pago-lote')).toHaveAttribute('data-open', '');
    await expect(page.locator('#modal-pago-lote-body input[type="checkbox"]')).toHaveCount(4);
  });

  test('a 320px nada desborda a lo ancho y los botones conservan 44px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await abrir(page);
    const medidas = await page.evaluate(() => ({
      sobra: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      altos: [...document.querySelectorAll('#panel-atencion-hoy .fila-atencion__control, #panel-atencion-hoy .atencion-hoy__boton')]
        // Redondeado: bajo carga se midió 43,99997 a mitad de la animación de entrada.
        .map(b => Math.round(b.getBoundingClientRect().height)),
    }));
    expect(medidas.sobra).toBe(0);
    for (const alto of medidas.altos) expect(alto).toBeGreaterThanOrEqual(44);
  });
});

test.describe('MV2.15a - escritorio sin cambios (ADR 099)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('la lista no existe y los paneles de siempre siguen', async ({ page }) => {
    await page.clock.setFixedTime(HOY);
    await sembrar(page, estado());
    await page.goto('/#dash');
    await page.waitForSelector('#panel-vencidos:not([hidden])', { timeout: 10_000 });
    await expect(page.locator('#panel-atencion-hoy')).toBeHidden();
    await expect(page.locator('#label-atencion-hoy')).toBeVisible();
    await expect(page.locator('#panel-distribuir-inicio')).toBeVisible();
    // INI.1 (ADR 149 D2): el panel de límites salió; el límite lo dice Novedades.
    await expect(page.locator('#panel-limites')).toHaveCount(0);
    await expect(page.locator('#panel-novedades')).toContainText('Restaurantes pasó su límite');
  });
});

// ── MV2.15c: el avatar abre tu perfil (ADR 099 D6 y D7) ─────────────────────

const SOFIA = { id: 'n-sofi', nombre: 'Sofía', edad: 8, dibujo: 'cometa', teNombra: 'Mamá', creado: '2026-10-25' };

/** Adulta con una niña en Familia, sin candado: "¿Quién usa Finko?" deja entrar. */
async function abrirConNina(page) {
  await sembrar(page, estadoBase({
    perfil: { nombre: 'Laura Gómez', smmlv: 1750905 },
    cuentas: [{ id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 3_000_000, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' }],
    perfiles: [SOFIA],
  }));
  await page.goto('/#dash');
  await page.locator('#quien-usa [data-role="adulto"]').click();
  await expect(page.locator('#quien-usa')).not.toHaveAttribute('data-open', '');
  await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
}

test.describe('MV2.15c - el avatar abre tu perfil (ADR 099)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('el avatar es un botón; la hoja lleva a cada bloque de Ajustes (D6, D7)', async ({ page }) => {
    await abrirConNina(page);
    await expect(page.locator('.perfil-inicio .perfil-inicio__ajustes')).toHaveCount(0);
    const avatar = page.locator('#perfil-boton');
    await expect(avatar).toHaveText('LG');

    await avatar.click();
    const hoja = page.locator('#modal-perfil');
    await expect(hoja).toHaveAttribute('data-open', '');
    await expect(hoja.locator('#perfil-hoja-titulo')).toHaveText('Laura Gómez');
    await expect(hoja.locator('[data-bloque="familia"]')).toContainText('Sofía, 8 años');

    await hoja.locator('[data-bloque="familia"]').click();
    await expect(page.locator('#sec-config.active')).toBeVisible();
    await expect(hoja).not.toHaveAttribute('data-open', '');
    await expect(page.locator('#config-familia-title')).toBeInViewport();
    // ADR 112 D5: bajo 1024px el bloque es una fila de Ajustes; llega abierta y
    // con el foco en su botón.
    const fila = page.locator('#config-familia-title .config-fila__boton');
    await expect(fila).toBeFocused();
    await expect(fila).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#config-fila-familia')).toBeVisible();
  });

  test('pasarle el teléfono a la niña abre su app; volver pide el PIN (D6, ADR 093 D1)', async ({ page }) => {
    await abrirConNina(page);
    await page.locator('#perfil-boton').click();
    await page.locator('#modal-perfil [data-action="perfil-pasar"]').click();
    await expect(page.locator('body')).toHaveClass(/\bkid\b/);
    await expect(page.locator('#nino-app')).toBeVisible();
    await expect(page.locator('#app')).toBeHidden();
  });
});

test.describe('MV2.15c - escritorio sin cambios (ADR 099)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('el avatar sigue decorativo y el botón no se ve', async ({ page }) => {
    await abrirConNina(page);
    await expect(page.locator('#perfil-avatar')).toBeVisible();
    await expect(page.locator('#perfil-avatar')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#perfil-boton')).toBeHidden();
  });
});
