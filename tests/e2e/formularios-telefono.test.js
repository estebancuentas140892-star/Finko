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
