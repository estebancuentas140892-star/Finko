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
    await expect(page.locator('#sec-compromisos .pestana-vacia__titulo')).toHaveText('Anota lo que pagas cada mes', { timeout: 10_000 });
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

test.describe('Deudas (GAS.8e, ADR 182 D5)', () => {
  test('la tarjeta dice lo que debes; las puertas parten entidades y personas', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: [CUENTA],
      compromisos: [
        { id: 'd1', tipo: 'deuda-entidad', descripcion: 'Crédito libre inversión Davivienda', saldoTotal: 6_000_000, cuotaMensual: 400_000, frecuencia: 'Mensual', diaPago: enTresDias, categoria: 'Libre inversión', activo: true, fechaCreacion: '2026-01-01' },
        { id: 'd2', tipo: 'deuda-entidad', descripcion: 'Tarjeta', saldoTotal: 1_450_000, cupoTotal: 2_000_000, cuotaMensual: 180_000, frecuencia: 'Mensual', diaPago: enTresDias, categoria: 'Tarjeta de crédito', activo: true, fechaCreacion: '2026-01-01' },
        { id: 'd3', tipo: 'deuda-personal', descripcion: 'Juan Diego', saldoTotal: 600_000, cuotaMensual: 100_000, frecuencia: 'Mensual', diaPago: 15, activo: true, fechaCreacion: '2026-01-01' },
      ],
      gastos: [
        { id: 'a1', compromisoId: 'd1', categoria: 'Deudas', monto: 4_000_000, fecha: '2026-02-05', cuentaId: 'c1' },
      ],
    }));
    await page.goto('/#deudas');
    const hero = page.locator('#compromisos-hero .hero-deudas');
    await expect(hero.locator('.hero-compromisos__label')).toHaveText('Debes en total', { timeout: 10_000 });
    await expect(hero.locator('.hero-compromisos__valor')).toHaveText('$8.050.000');
    await expect(hero.locator('.hero-compromisos__linea')).toHaveText('Este mes pagas $680.000 en cuotas');
    await expect(hero.locator('.hero-gastos__ley')).toHaveText(['Entidades $7.450.000', 'Personas $600.000']);

    const puertas = page.locator('.deudas-puerta');
    await expect(puertas).toHaveText([/Con entidades\s*2 deudas/, /Con personas\s*1 deuda/]);
    await expect(puertas.first()).toHaveAttribute('aria-pressed', 'true');
    // Con entidades: lo que falta, el avance pagado y el cupo usado.
    const d1 = page.locator('.deuda-inv__fila[data-id="d1"]');
    await expect(d1.locator('.deuda-inv__meta')).toHaveText('Davivienda · cuota $400.000');
    await expect(d1.locator('.deuda-inv__avance-texto')).toHaveText('40 % pagado');
    await expect(page.locator('.deuda-inv__fila[data-id="d2"] .deuda-inv__avance-texto')).toHaveText('73 % del cupo');
    await expect(page.locator('.deudas-agregar')).toHaveText('Agregar deuda con una entidad');

    // Con personas: su deuda, la pista de Me deben y su botón.
    await puertas.nth(1).click();
    await expect(puertas.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.deuda-inv__fila')).toHaveCount(1);
    await expect(page.locator('.deuda-inv__fila[data-id="d3"] .deuda-inv__meta')).toHaveText('Le pagas $100.000 cada mes · el 15');
    await expect(page.locator('.deudas-pista')).toHaveAttribute('href', '#personales');
    await page.locator('.deudas-agregar').click();
    await expect(page.locator('#modal-compromiso[data-open] #form-compromiso')).toHaveCount(1);
  });

  test('sin deudas: la pregunta, dos caminos y Tino tranquilo', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: [CUENTA] }));
    await page.goto('/#deudas');
    await expect(page.locator('#sec-compromisos .deudas-vacio .dia-nuevo__titulo')).toHaveText('¿Le debes dinero a alguien?', { timeout: 10_000 });
    await expect(page.locator('#compromisos-hero')).toBeEmpty();
    await expect(page.locator('#proposito-compromisos')).toBeHidden();
    const caminos = page.locator('.deudas-vacio .vacio-caminos__fila');
    await expect(caminos).toHaveCount(2);
    await expect(page.locator('.deudas-vacio__calma')).toContainText('Así se está bien.');

    await caminos.filter({ hasText: 'A una persona' }).click();
    await expect(page.locator('#modal-compromiso[data-open] #form-compromiso')).toHaveCount(1);
  });
});

test.describe('Límites (GAS.7f, ADR 179 D6)', () => {
  test('los topes van por estado y "Sin límite" lleva a la pestaña que controla', async ({ page }) => {
    const dia = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    await sembrar(page, estadoBase({
      cuentas: [CUENTA],
      presupuestos: [
        { id: 'p1', categoria: 'Restaurantes', montoMensual: 200_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
        { id: 'p2', categoria: 'Mercado', montoMensual: 400_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
      ],
      gastos: [
        { id: 'g1', categoria: 'Restaurantes', monto: 245_000, fecha: dia, cuentaId: 'c1' },
        { id: 'g2', categoria: 'Mercado', monto: 340_000, fecha: dia, cuentaId: 'c1' },
        { id: 'g3', categoria: 'Salud', monto: 96_500, fecha: dia, cuentaId: 'c1' },
        { id: 'g4', categoria: 'Gastos fijos', monto: 120_000, fecha: dia, cuentaId: 'c1' },
      ],
    }));
    await page.goto('/#presupuesto');
    await expect(page.locator('.limites-grupo__titulo')).toHaveText(['Pasaste el límite', 'Cerca del límite'], { timeout: 10_000 });
    await expect(page.locator('.limites-grupo--excedido .limite-fila__meta')).toHaveText('Te pasaste $45.000 · límite $200.000');
    await expect(page.locator('.limites-grupo--alerta .limite-fila__meta')).toHaveText('Quedan $60.000 de $400.000');

    await expect(page.locator('.envelope-huerfanas__title')).toHaveText('Sin límite');
    await expect(page.locator('.envelope-huerfanas__mes').first()).toContainText('este mes');
    const fijos = page.locator('.envelope-huerfanas__motivo--link', { hasText: 'Se controla en Fijos' });
    await expect(fijos).toHaveAttribute('href', '#fijos');
  });
});

test.describe('Primera vez y mes sin gastos (GAS.7g, ADR 179 D7; GAS.8c, ADR 182 D3)', () => {
  test('sin gastos ni fijos: Tino, las cuatro tejas y la pista de Por pagar', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: [CUENTA] }));
    await page.goto('/#gast');
    const vacio = page.locator('.dia-nuevo');
    await expect(vacio.locator('.dia-nuevo__titulo')).toHaveText('Aquí verás en qué se va tu dinero', { timeout: 10_000 });
    await expect(page.locator('.hero-gastos')).toHaveCount(0);
    await expect(vacio.locator('.dia-nuevo__teja')).toHaveCount(4);

    const pista = vacio.locator('.dia-nuevo__pista');
    await expect(pista).toContainText('Agrégalo en Por pagar');
    await pista.click();
    await expect(page).toHaveURL(/#fijos$/);
  });

  test('un mes pasado sin gastos dice "Estás viendo" y ofrece volver o ver el siguiente', async ({ page }) => {
    test.skip(hoy.getMonth() < 2, 'hace falta que el mes de hace dos meses sea de este año');
    const hace2 = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
    const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    await sembrar(page, estadoBase({
      cuentas: [{ ...CUENTA, fechaCreacion: `${iso(hace2)}T00:00:00.000Z` }],
      gastos: [{ id: 'g1', categoria: 'Mercado', monto: 50_000, fecha: iso(hoy), cuentaId: 'c1' }],
    }));
    await page.goto('/#gast');
    await page.locator('.hero-gastos [data-action="bloque-elegir-mes"]').click({ timeout: 10_000 });
    await page.locator(`[data-action="bloque-ir-mes"][data-mes="${hace2.getMonth()}"]`).click();

    await expect(page.locator('.mes-viendo')).toContainText(`Estás viendo ${MESES[hace2.getMonth()]} ${hace2.getFullYear()}`);
    await expect(page.locator('.mes-vacio .pestana-vacia__titulo')).toHaveText(`No registraste gastos en ${MESES[hace2.getMonth()]}`);
    await expect(page.locator('.mes-vacio .pestana-vacia__texto')).toContainText('Fue tu primer mes en Finko.');
    await expect(page.locator('.mes-vacio__volver')).toHaveText(`Volver a ${MESES[hoy.getMonth()]}`);

    await page.locator('.mes-vacio__siguiente').click();
    await expect(page.locator('.mes-vacio .pestana-vacia__titulo')).toHaveText(`No registraste gastos en ${MESES[hoy.getMonth() - 1]}`);
    await expect(page.locator('.mes-vacio__siguiente')).toHaveCount(0);
    await page.locator('.mes-vacio__volver').click();
    await expect(page.locator('.hero-gastos')).toHaveCount(1);
  });
});
