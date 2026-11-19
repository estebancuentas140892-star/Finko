/**
 * gastos-pestanas.test.js - Gastos en cuatro pestañas en el teléfono
 * (GAS.7, ADR 179).
 *
 * Cubre lo que solo se ve con la app andando: la pestaña Fijos (D4) con sus
 * grupos y su tarjeta, y su vacío, cuyos caminos abren el gasto fijo con la
 * categoría ya elegida.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase } from './helpers/estado.js';

test.use({ viewport: { width: 390, height: 844 } });

const CUENTA = { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 3_000_000, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' };

const hoy = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Día del mes que cae dentro de los próximos siete días (o hoy, a fin de mes). */
const enTresDias = Math.min(hoy.getDate() + 3, new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate());

test.describe('Fijos (GAS.7d, ADR 179 D4)', () => {
  test('la tarjeta dice lo pagado y la lista va por semana', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: [CUENTA],
      compromisos: [
        { id: 'f1', tipo: 'fijo', descripcion: 'Arriendo', monto: 900_000, frecuencia: 'Mensual', diaPago: enTresDias, categoria: 'Arriendo', activo: true },
        { id: 'f2', tipo: 'fijo', descripcion: 'Agua', monto: 60_000, frecuencia: 'Mensual', diaPago: 1, categoria: 'Servicios públicos', activo: true, fechaCreacion: '2020-01-01' },
      ],
      gastos: [{ id: 'p1', compromisoId: 'f2', categoria: 'Gastos fijos', monto: 60_000, fecha: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), cuentaId: 'c1' }],
    }));
    await page.goto('/#fijos');
    const hero = page.locator('#compromisos-hero .hero-compromisos');
    await expect(hero.locator('.hero-compromisos__label')).toContainText('Te falta pagar en', { timeout: 10_000 });
    await expect(hero.locator('.hero-compromisos__linea')).toHaveText('Pagaste $60.000 de $960.000 · 1 de 2 pagos');

    const titulos = page.locator('#lista-compromisos .porpagar-grupo__head span[id]');
    await expect(titulos).toContainText(['Esta semana', 'Pagado este mes']);
    // La fila no repite "gasto fijo": la pestaña ya lo dice.
    await expect(page.locator('.deuda-card--fila[data-id="f1"] .deuda-card__estado')).not.toContainText('gasto fijo');
  });

  test('sin fijos: Tino y ocho caminos; Energía abre el gasto fijo en Servicios públicos', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: [CUENTA] }));
    await page.goto('/#fijos');
    await expect(page.locator('.pestana-vacia__titulo')).toHaveText('Anota lo que pagas cada mes', { timeout: 10_000 });
    await expect(page.locator('#compromisos-hero')).toBeEmpty();
    const chips = page.locator('.fijos-vacio__chip');
    await expect(chips).toHaveCount(8);

    await chips.filter({ hasText: 'Energía' }).click();
    const form = page.locator('#modal-gasto-fijo[data-open] #form-gasto-fijo');
    await expect(form).toHaveCount(1);
    await expect(form.locator('[name="categoria"][value="Servicios públicos"]')).toBeChecked();
    await expect(form.locator('[name="descripcion"]')).toHaveValue('Energía');
  });
});
