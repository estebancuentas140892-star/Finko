/**
 * formularios-telefono.test.js - vigía de la regla del ADR 142 D2 en el
 * teléfono: ningún formulario muestra un `<select>`, un `type="date"` ni un
 * `type="number"` del sistema (FORM.2g). Los campos reales siguen ahí,
 * ocultos, con su `name`: lo que se ve es el control de Finko.
 *
 * Abre cada formulario por su `data-action`, como lo hace la app, a 390 px.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

test.use({ viewport: { width: 390, height: 844 } });

const CUENTAS = [
  { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 1_000_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
  { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 2_000_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
];
const DEUDA = {
  id: 'd1', descripcion: 'Tarjeta de prueba', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito',
  cupoTotal: 3_000_000, saldoTotal: 1_200_000, cuotaMensual: 200_000, frecuencia: 'Mensual', diaPago: 20, activo: true,
};

/** Acción → el formulario que debe abrir. */
const FORMULARIOS = [
  ['nuevo-gasto', {}, '#form-gasto'],
  ['nuevo-compromiso', {}, '#form-compromiso'],
  ['nuevo-gasto-fijo', {}, '#form-gasto-fijo'],
  ['abrir-abono', { id: 'd1' }, '#form-abono'],
  ['nueva-meta', {}, '#form-meta'],
  ['nuevo-ingreso', {}, '#form-ingreso'],
  ['nuevo-ingreso-puntual', {}, '#form-ingreso-puntual'],
  ['nueva-cuenta', {}, '#form-cuenta'],
  ['abrir-transferencia', {}, '#form-transferencia'],
  ['nuevo-apartado', {}, '#form-apartado'],
  ['nuevo-personal', {}, '#form-personal'],
  ['inversion-nueva', {}, '#form-inversion'],
  ['nuevo-presupuesto', {}, '#form-presupuesto'],
];

test.describe('ADR 142 D2: en el teléfono, los controles son de Finko', () => {
  for (const [accion, datos, formulario] of FORMULARIOS) {
    test(`${formulario}: sin <select>, type="date" ni type="number" a la vista`, async ({ page }) => {
      await sembrar(page, estadoBase({ cuentas: CUENTAS, compromisos: [DEUDA] }));
      await page.goto('/#dash');
      await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
      await page.evaluate(([a, d]) => {
        const b = document.createElement('button');
        b.dataset.action = a;
        Object.assign(b.dataset, d);
        document.body.appendChild(b);
        b.click();
        b.remove();
      }, [accion, datos]);
      const form = page.locator(formulario);
      await expect(form).toBeAttached({ timeout: 5_000 });
      await expect(page.locator('.modal-overlay[data-open]')).toHaveCount(1);
      const delSistema = await form.evaluate((f) => [...f.querySelectorAll('select, input[type="date"], input[type="number"]')]
        .filter(el => el.offsetParent !== null || el.getClientRects().length > 0)
        .map(el => el.name || el.id));
      expect(delSistema).toEqual([]);
    });
  }
});

test.describe('FORM.2h: Ajustes, la tasa alta y el banco (ADR 142 D2, D7, D9 y D10)', () => {
  test('Tu nombre se cambia en su mini-hoja y se guarda solo', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#config');
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });
    const form = page.locator('#form-perfil');
    await expect(form).toHaveAttribute('data-ajustes-montados', '');
    const fila = form.locator('.ajustes-lista .recibo__fila').first();
    await expect(fila).toContainText('Tu nombre');
    // "Tu perfil" se abre en su sitio (ADR 112) y adentro es una lista.
    await page.locator('[data-action="config-fila"][data-fila="perfil"]').click();
    await fila.click();
    await form.locator('#config-nombre').fill('Ana de prueba');
    await form.locator('.mini-hoja:not([hidden]) .mini-hoja__pie [data-mini-cerrar]').click();
    await expect(fila).toContainText('Ana de prueba');
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')).perfil?.nombre)).toBe('Ana de prueba');
  });

  test('una tasa muy alta avisa en ámbar y la deuda se guarda igual; la ⓘ abre a Tino', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#compromisos');
    await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
    await page.evaluate(() => { const b = document.createElement('button'); b.dataset.action = 'nuevo-compromiso'; document.body.appendChild(b); b.click(); b.remove(); });
    const form = page.locator('#form-compromiso');
    await form.locator('[data-tipo="deuda-entidad"]').click();
    // GAS.9d (ADR 183 D4): la tarjeta se agrega en Mis cuentas; aquí, un crédito.
    // GAS.15b (ADR 191): el tipo y la entidad en una pantalla; el nombre sale de ellos.
    await form.locator('.chip-cat', { hasText: 'Libre inversión' }).click();
    await form.locator('.deuda-entidad__op', { hasText: 'Bancolombia' }).click();
    await form.locator('[data-preguntas-seguir]').click();
    for (const t of ['1', '000', '000']) await form.locator(`[data-pregunta-on] [data-tecla="${t}"]`).click();
    await form.locator('[data-preguntas-seguir]').click();
    await form.locator('#comp-cuota').fill('100000');
    await form.locator('[data-dia="10"]').click();
    await form.locator('[data-preguntas-seguir]').click();
    await form.locator('[data-resumen-notas] .recibo__fila', { hasText: 'Tasa de interés' }).click();
    await form.locator('#comp-tasa').fill('280');
    await expect(form.locator('#comp-tasa-aviso')).toContainText('muy alto');
    await form.locator('[data-mini-ayuda="comp-tasa-ayuda"]').click();
    await expect(form.locator('#comp-tasa-ayuda .tino-sol[data-pose="explica"]')).toBeVisible();
    await form.locator('#comp-tasa-ayuda .mini-hoja__pie [data-mini-cerrar]').click();
    await form.locator('[data-preguntas-seguir]').click();
    await form.locator('button[type="submit"]').click();
    const dialogo = page.locator('body > .modal-overlay[data-open]:not([id])');
    if (await dialogo.count()) await dialogo.locator('[data-role="confirmar"]').click();
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')).compromisos?.at(-1)?.descripcion)).toBe('Libre inversión Bancolombia');
  });

  test('el banco se busca en el desplegable de Finko', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.evaluate(() => { const b = document.createElement('button'); b.dataset.action = 'nueva-cuenta'; document.body.appendChild(b); b.click(); b.remove(); });
    // GAS.8h (ADR 182 D8): la hoja busca la entidad y el formulario llega con ella.
    const hoja = page.locator('#modal-agregar-cuenta[data-open]');
    await hoja.locator('[data-action="cuenta-agregar-tipo"][data-tipo="ahorros"]').click();
    await hoja.locator('[data-agregar-buscar]').fill('davi');
    await expect(hoja.locator('.agregar-cuenta__entidad:visible')).toHaveCount(2);
    await hoja.locator('[data-action="cuenta-agregar-entidad"][data-banco="Daviplata"]').click();
    const form = page.locator('#form-cuenta');
    await expect(form.locator('[name="banco"]')).toHaveValue('Daviplata');
    // Y el desplegable de Finko sigue sirviendo para cambiarla.
    await page.locator('#modal-cuenta [data-preguntas-atras]').click();
    await form.locator('.bank-picker__trigger').click();
    const mini = form.locator('#cuenta-banco-mini');
    await expect(mini).toBeVisible();
    await mini.locator('[data-banco-buscar]').fill('davi');
    await expect(mini.locator('[data-valor]:visible')).toHaveCount(2);
    await mini.locator('[data-valor="Davivienda"]').click();
    await expect(mini).toBeHidden();
    await expect(form.locator('[name="banco"]')).toHaveValue('Davivienda');
  });
});

test.describe('Agregar cuenta por tipo y por entidad (GAS.8h, ADR 182 D8)', () => {
  const abrirAgregar = async (page) => {
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.evaluate(() => { const b = document.createElement('button'); b.dataset.action = 'nueva-cuenta'; document.body.appendChild(b); b.click(); b.remove(); });
    return page.locator('#modal-agregar-cuenta[data-open]');
  };

  test('la primera cuenta: dos grupos y Tino; el efectivo va directo a sus datos', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: [] }));
    const hoja = await abrirAgregar(page);
    await expect(hoja.locator('.agregar-cuenta__grupo-t')).toHaveText(['Dinero tuyo', 'Dinero prestado']);
    await expect(hoja.locator('.agregar-cuenta__primera')).toContainText('¿Es tu primera cuenta?');
    await hoja.locator('[data-action="cuenta-agregar-tipo"][data-tipo="efectivo"]').click();
    await expect(page.locator('#form-cuenta [name="banco"]')).toHaveValue('Efectivo');
    await expect(page.locator('#form-cuenta [data-preguntas-t]')).toHaveText('¿Cuánto tienes hoy en esta cuenta?');
  });

  test('la tarjeta: el banco en la tarjeta dibujada y la deuda llega con su nombre', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    const hoja = await abrirAgregar(page);
    await expect(hoja.locator('.agregar-cuenta__primera')).toHaveCount(0);
    await hoja.locator('[data-action="cuenta-agregar-tipo"][data-tipo="tarjeta"]').click();
    const seguir = hoja.locator('[data-action="cuenta-agregar-continuar"]');
    await expect(seguir).toBeDisabled();
    await hoja.locator('[data-action="cuenta-agregar-entidad"][data-banco="Bancolombia"]').click();
    await expect(hoja.locator('.agregar-cuenta__tarjeta-banco')).toHaveText('Bancolombia');
    await expect(seguir).toHaveText('Continuar con Bancolombia');
    await seguir.click();
    const form = page.locator('#modal-compromiso[data-open] #form-compromiso');
    await expect(form.locator('[name="categoria"][value="Tarjeta de crédito"]')).toBeChecked();
    await expect(form.locator('[name="descripcion"]')).toHaveValue('Tarjeta Bancolombia');
    // GAS.9d (ADR 183 D4): es la puerta de la tarjeta, y así se llama.
    await expect(page.locator('#modal-compromiso .modal__title')).toHaveText('Nueva tarjeta de crédito');
    await expect(form.locator('.deuda-sin-tarjeta')).toHaveCount(0);
  });

  test('desde Deudas, "Agrégala en Mis cuentas" abre Agregar cuenta con la tarjeta elegida (GAS.9d)', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#deudas');
    await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
    await page.evaluate(() => { const b = document.createElement('button'); b.dataset.action = 'nuevo-compromiso'; document.body.appendChild(b); b.click(); b.remove(); });
    const form = page.locator('#modal-compromiso[data-open] #form-compromiso');
    await form.locator('[data-tipo="deuda-entidad"]').click();
    await expect(form.locator('.chip-cat', { hasText: 'Tarjeta de crédito' })).toHaveCount(0);
    await form.locator('.deuda-sin-tarjeta [data-action="tc-agregar"]').click();
    await expect(page.locator('#modal-compromiso[data-open]')).toHaveCount(0);
    const hoja = page.locator('#modal-agregar-cuenta[data-open]');
    await expect(hoja.locator('[data-action="cuenta-agregar-continuar"]')).toBeDisabled();
    await hoja.locator('[data-action="cuenta-agregar-entidad"][data-banco="Davivienda"]').click();
    await hoja.locator('[data-action="cuenta-agregar-continuar"]').click();
    await expect(page.locator('#modal-compromiso[data-open] [name="categoria"][value="Tarjeta de crédito"]')).toBeChecked();
  });

  test('en Mis cuentas, la fila de la tarjeta abre su hoja: cupo, pagar, avance y su deuda (GAS.9d)', async ({ page }) => {
    const VISA = {
      id: 't1', descripcion: 'Visa Bancolombia', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito',
      saldoTotal: 800_000, cuotaMensual: 120_000, cupoTotal: 3_000_000, frecuencia: 'Mensual', diaPago: 28,
      activo: true, fechaCreacion: new Date().toISOString(),
    };
    await sembrar(page, estadoBase({ cuentas: CUENTAS, compromisos: [VISA] }));
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.locator('#tesoreria-tarjetas .cuenta-card--tarjeta[data-id="t1"] .list-item__detalle').click();
    const hoja = page.locator('#modal-detalle-fila[data-open]');
    await expect(hoja.locator('.detalle-fila__titulo')).toHaveText('Visa Bancolombia');
    await expect(hoja.locator('.detalle-gasto__dato', { hasText: 'Disponible' }).locator('dd')).toHaveText('$2.200.000');
    await expect(hoja.locator('[data-target-action="abrir-abono"]')).toBeVisible();
    await expect(hoja.locator('[data-target-action="abrir-avance"]')).toHaveText('Sacar un avance');
    await hoja.locator('[data-action="tc-ver-deuda"]').click();
    await expect(page).toHaveURL(/#deudas$/);
    await expect(page.locator('.deuda-inv__fila[data-id="t1"]')).toBeVisible();
  });

  test('"¿No está tu entidad?": se escribe y la cuenta lleva ese nombre', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    const hoja = await abrirAgregar(page);
    await hoja.locator('[data-action="cuenta-agregar-tipo"][data-tipo="corriente"]').click();
    await expect(hoja.locator('.agregar-cuenta__grupo-t')).toHaveText(['Bancos']);
    await hoja.locator('[data-action="cuenta-agregar-escribir"]').click();
    await hoja.locator('#agregar-cuenta-nombre').fill('Cooperativa Confiar');
    await hoja.locator('[data-action="cuenta-agregar-continuar"]').click();
    const form = page.locator('#form-cuenta');
    await expect(form.locator('[name="banco"]')).toHaveValue('Otro');
    await expect(form.locator('input[name="nombre"]')).toHaveValue('Cooperativa Confiar');
  });
});
