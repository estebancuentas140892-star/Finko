/**
 * movimientos-filtros.test.js - MOV.4 (ADR 200): el buscador que entiende
 * criterios, la hoja de filtros y la fila de lo puesto, recorridos como en
 * el lienzo "Rediseño de Movimientos: Finko móvil" (S3), más axe y las
 * zonas de 44 en los dos temas.
 */

import { test, expect } from '@playwright/test';
import { sembrar } from './helpers/estado.js';
import { estadoMovimientos } from './helpers/movimientos.js';

test.use({ viewport: { width: 393, height: 840 } });

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MES_HOY = MESES[new Date().getMonth()];

async function llegar(page, extra = {}) {
  await sembrar(page, estadoMovimientos(extra));
  await page.goto('/#movimientos');
  await expect(page.locator('#lista-movimientos .list-item').first()).toBeVisible({ timeout: 15_000 });
}

const hoja = (page) => page.locator('#modal-filtros-movimientos');
const abrirCriterio = (page, c) => hoja(page).locator(`[data-action="movimientos-hoja-criterio"][data-criterio="${c}"]`).click();
const chip = (page, c) => page.locator(`.mov-chip[data-criterio="${c}"]`);

test.describe('El buscador que entiende criterios (S1, 3)', () => {
  test('escribir, elegir y seguir: categoría, cuenta y mes sin abrir la hoja', async ({ page }) => {
    await llegar(page);
    const campo = page.locator('#movimientos-buscar');
    const panel = page.locator('#movimientos-sugerencias');

    await campo.fill('suscrip');
    const sug = panel.locator('[data-action="movimientos-sugerencia"]').first();
    await expect(sug).toContainText('Suscripciones');
    await expect(sug).toContainText('Categoría');
    await sug.click();
    // Crea el chip, borra el texto y deja el foco para seguir encadenando.
    await expect(campo).toHaveValue('');
    await expect(campo).toBeFocused();

    await campo.fill('banco');
    await panel.locator('[data-action="movimientos-sugerencia"]', { hasText: 'Bancolombia' }).click();
    await campo.fill(MES_HOY.slice(0, 3));
    await panel.locator('[data-action="movimientos-sugerencia"]', { hasText: 'Periodo' }).first().click();

    await page.locator('.mov-barra__volver').click();
    await expect(chip(page, 'categorias')).toContainText('Suscripciones');
    await expect(page.locator('.mov-filtros-btn')).toHaveAttribute('aria-label', 'Filtros, 3 activos');
    const filas = page.locator('#lista-movimientos .list-item');
    await expect(filas.first()).toContainText('Microsoft 365');
    // MOV.5 (ADR 204): en el teléfono, la fila de Día a día. Qué es en su
    // renglón (la categoría va en la hoja) y la cuenta con su logo y su tipo.
    await expect(filas.first().locator('.mov-fila__tipo')).toHaveText('Gasto fijo');
    await expect(filas.first().locator('.fila__cuenta-t')).toHaveText('Bancolombia Ahorros');
  });

  test('un monto escrito busca el monto: 45.000 y $45000 son lo mismo', async ({ page }) => {
    await llegar(page);
    const campo = page.locator('#movimientos-buscar');
    await campo.fill('$45000');
    await expect(page.locator('#movimientos-sugerencias [data-action="movimientos-sugerencia"]').last()).toContainText('Valor: $45.000');
    await campo.press('Enter');
    await expect(page.locator('#lista-movimientos .list-item')).toHaveCount(1);
    await expect(page.locator('#lista-movimientos .list-item')).toContainText('Almuerzo');
  });

  test('las flechas recorren las sugerencias y Enter elige', async ({ page }) => {
    await llegar(page);
    const campo = page.locator('#movimientos-buscar');
    await campo.fill('trans');
    await expect(page.locator('#mov-sug-0')).toBeVisible();
    await campo.press('ArrowDown');
    const activa = await campo.getAttribute('aria-activedescendant');
    expect(activa).toBe('mov-sug-0');
    await campo.press('Enter');
    await expect(campo).toHaveValue('');
    await page.locator('.mov-barra__volver').click();
    await expect(chip(page, 'tipos')).toContainText('Transferencias');
  });
});

test.describe('La hoja de filtros (S1, 8 y 9)', () => {
  test('aplica en vivo, el pie cuenta y con 0 se apaga', async ({ page }) => {
    await llegar(page);
    await page.locator('[data-action="movimientos-abrir-filtros"]').click();
    await expect(hoja(page)).toHaveAttribute('data-open', '');
    const ver = page.locator('#mov-hoja-ver');
    const total = Number((await ver.textContent()).match(/\d+/)[0]);

    await abrirCriterio(page, 'tipos');
    await hoja(page).locator('input[data-tipo="fijos"]').check();
    await hoja(page).locator('input[data-tipo="deudas"]').check();
    await expect(ver).not.toHaveText(`Ver ${total} movimientos`);
    // Estado solo con fijos o deudas puestos.
    const estado = hoja(page).locator('[data-action="movimientos-hoja-criterio"][data-criterio="estado"]');
    await expect(estado).not.toHaveAttribute('aria-disabled', 'true');
    await estado.click();
    await expect(hoja(page).locator('input[name="mov-estado"]')).toHaveCount(4);

    await abrirCriterio(page, 'valor');
    await hoja(page).locator('[data-action="movimientos-hoja-valor"][data-atajo="menos-50"]').click();
    await abrirCriterio(page, 'personas');
    await hoja(page).locator('input[data-persona="Camila"]').check();
    await expect(ver).toHaveText('Sin movimientos');
    await expect(ver).toBeDisabled();
  });

  test('sin fijos ni deudas, Estado se ve y no abre', async ({ page }) => {
    await llegar(page);
    await page.locator('[data-action="movimientos-abrir-filtros"]').click();
    const estado = hoja(page).locator('[data-action="movimientos-hoja-criterio"][data-criterio="estado"]');
    await expect(estado).toHaveAttribute('aria-disabled', 'true');
    await expect(estado).toContainText('Elige gastos fijos o deudas para usarlo');
    await estado.dispatchEvent('click');
    await expect(hoja(page).locator('#mov-panel-estado')).toBeHidden();
  });

  test('una subcategoría deja su categoría a medias; todas, entera', async ({ page }) => {
    await llegar(page);
    await page.locator('[data-action="movimientos-abrir-filtros"]').click();
    await abrirCriterio(page, 'categorias');
    const cat = hoja(page).locator('input[data-categoria="Bus, taxi y apps"]');
    await cat.check();
    const taxi = hoja(page).locator('input[data-sub="transp-taxi"]');
    await expect(taxi).toBeChecked();
    await taxi.uncheck();
    await expect(hoja(page).locator('input[data-categoria="Bus, taxi y apps"]')).toHaveJSProperty('indeterminate', true);
    await hoja(page).locator('input[data-sub="transp-taxi"]').check();
    await expect(hoja(page).locator('input[data-categoria="Bus, taxi y apps"]')).toBeChecked();
    await expect(page.locator('#mov-hoja-ver')).toHaveText('Ver 2 movimientos');
  });

  test('la cuenta con dirección: Llegó a', async ({ page }) => {
    await llegar(page);
    await page.locator('[data-action="movimientos-abrir-filtros"]').click();
    await abrirCriterio(page, 'cuentas');
    await hoja(page).locator('input[data-cuenta="nq"]').check();
    await hoja(page).locator('.mov-seg__op', { hasText: 'Llegó a' }).click();
    await page.locator('#mov-hoja-ver').click();
    await expect(chip(page, 'cuentas')).toContainText('A Nequi');
    const filas = page.locator('#lista-movimientos .list-item');
    await expect(filas).toHaveCount(2);
  });

  test('tocar un chip abre la hoja en su criterio, con el foco ahí (M08)', async ({ page }) => {
    await llegar(page);
    await page.locator('[data-action="movimientos-abrir-filtros"]').click();
    await abrirCriterio(page, 'cuentas');
    await hoja(page).locator('input[data-cuenta="bc"]').check();
    await page.keyboard.press('Escape');
    await expect(hoja(page)).not.toHaveAttribute('data-open');
    await chip(page, 'cuentas').locator('.mov-chip__cambiar').click();
    await expect(hoja(page)).toHaveAttribute('data-open', '');
    const boton = hoja(page).locator('#mov-criterio-cuentas');
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
    await expect(boton).toBeFocused();
  });

  test('cerrar por cualquier camino conserva lo elegido', async ({ page }) => {
    await llegar(page);
    await page.locator('[data-action="movimientos-abrir-filtros"]').click();
    await abrirCriterio(page, 'tipos');
    await hoja(page).locator('input[data-tipo="ingresos"]').check();
    await hoja(page).locator('[data-action="modal-close"]').click();
    await expect(chip(page, 'tipos')).toContainText('Ingresos');
    await expect(page.locator('#lista-movimientos .list-item')).toHaveCount(1);
  });
});

test.describe('Lo puesto: una línea, quitar y Deshacer (S1, 4 y 6)', () => {
  test('a 320 lo que no cabe va al "+N", que abre la hoja en el primero oculto', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await llegar(page);
    await page.locator('[data-action="movimientos-abrir-filtros"]').click();
    await abrirCriterio(page, 'periodo');
    await hoja(page).locator('[data-action="movimientos-hoja-periodo"][data-atajo="anio"]').click();
    await abrirCriterio(page, 'categorias');
    await hoja(page).locator('input[data-categoria="Suscripciones"]').check();
    await abrirCriterio(page, 'cuentas');
    await hoja(page).locator('input[data-cuenta="bc"]').check();
    await page.locator('#mov-hoja-ver').click();

    const mas = page.locator('.mov-chip-mas');
    await expect(mas).toBeVisible();
    const fila = page.locator('#movimientos-activos');
    expect((await fila.boundingBox()).height).toBe(40);
    expect(await fila.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    const primero = await mas.getAttribute('data-criterio');
    await mas.click();
    await expect(hoja(page).locator(`#mov-criterio-${primero}`)).toHaveAttribute('aria-expanded', 'true');
  });

  test('Limpiar quita todo y Deshacer lo devuelve (M09)', async ({ page }) => {
    await llegar(page);
    await page.locator('[data-action="movimientos-abrir-filtros"]').click();
    await abrirCriterio(page, 'tipos');
    await hoja(page).locator('input[data-tipo="fijos"]').check();
    await abrirCriterio(page, 'cuentas');
    await hoja(page).locator('input[data-cuenta="bc"]').check();
    await page.locator('#mov-hoja-ver').click();
    const filas = page.locator('#lista-movimientos .list-item');
    const conFiltros = await filas.count();

    await page.locator('.mov-activos__limpiar').click();
    await expect(page.locator('#movimientos-activos')).toBeHidden();
    const aviso = page.locator('.fk-toast', { hasText: 'Quitaste 2 filtros' });
    await expect(aviso).toBeVisible();
    await aviso.locator('.fk-toast__accion').click();
    await expect(filas).toHaveCount(conFiltros);
    await expect(page.locator('.mov-filtros-btn')).toHaveAttribute('aria-label', 'Filtros, 2 activos');
  });

  test('sin resultados, "Prueba quitando uno" quita ese filtro (M10)', async ({ page }) => {
    await llegar(page);
    await page.locator('[data-action="movimientos-abrir-filtros"]').click();
    await abrirCriterio(page, 'tipos');
    await hoja(page).locator('input[data-tipo="ingresos"]').check();
    await abrirCriterio(page, 'cuentas');
    await hoja(page).locator('input[data-cuenta="nq"]').check();
    // Con 0, "Ver" se apaga; la × cierra y conserva lo elegido.
    await expect(page.locator('#mov-hoja-ver')).toBeDisabled();
    await hoja(page).locator('[data-action="modal-close"]').click();

    await expect(page.locator('#lista-movimientos .empty-state__title')).toHaveText('Nada coincide con estos 2 filtros');
    const salida = page.locator('.mov-sin__salida', { hasText: 'Nequi' });
    await expect(salida.locator('.mov-sin__n')).toHaveText('1');
    await salida.click();
    await expect(page.locator('#lista-movimientos .list-item')).toHaveCount(1);
    await expect(chip(page, 'cuentas')).toHaveCount(0);
  });
});

test.describe('Sin movimientos (M11)', () => {
  test('no hay buscador ni Filtros; la salida es registrar', async ({ page }) => {
    await sembrar(page, estadoMovimientos({ gastos: [], ingresosPuntuales: [], transferencias: [], personales: [] }));
    await page.goto('/#movimientos');
    await expect(page.locator('#lista-movimientos .empty-state__title')).toHaveText('Todavía no hay movimientos', { timeout: 15_000 });
    await expect(page.locator('#movimientos-buscar')).toHaveCount(0);
    await expect(page.locator('#lista-movimientos [data-action="registrar-abrir-hoja"]')).toHaveText('Registrar un movimiento');
  });
});

// ── Accesibilidad: axe y las zonas de 44 (como a11y-gastos, GAS.17) ──

async function violaciones(page) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  return page.evaluate(async () => {
    const raiz = [...document.querySelectorAll('.modal-overlay[data-open]')].at(-1) ?? document.querySelector('#sec-movimientos');
    const r = await window.axe.run(raiz, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    return r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
      .map(v => `${v.id}: ${v.nodes.map(n => n.html.slice(0, 90)).join(' | ')}`);
  });
}

function zonasChicas() {
  const raiz = [...document.querySelectorAll('.modal-overlay[data-open]')].at(-1) ?? document.querySelector('#sec-movimientos');
  const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden], [inert]'); };
  const controles = [...raiz.querySelectorAll('button:not(:disabled), a[href], input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), label:has(> input[type="radio"]), label:has(> input[type="checkbox"])')].filter(visible);
  const out = [];
  for (const c of controles) {
    c.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
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
    if (lf + rt + 1 < 44 || up + dn + 1 < 44) out.push(`${lf + rt + 1}x${up + dn + 1}: ${nombre}`);
  }
  return out;
}

async function revisar(page, pantalla, malos) {
  await page.waitForTimeout(250);
  for (const v of await violaciones(page)) malos.push(`${pantalla} axe ${v}`);
  for (const z of await page.evaluate(zonasChicas)) malos.push(`${pantalla} toque ${z}`);
}

for (const tema of ['dark', 'light']) {
  test.describe(`Movimientos accesible, tema ${tema === 'dark' ? 'oscuro' : 'claro'} (MOV.4)`, () => {
    test.use({ colorScheme: tema });
    test.beforeEach(async ({ page }) => {
      if (tema === 'light') await page.addInitScript(() => localStorage.setItem('fk_theme', 'light'));
    });

    test('la barra con chips, el buscador y cada criterio de la hoja', async ({ page }) => {
      test.setTimeout(90_000);
      await llegar(page);
      const malos = [];
      await page.locator('#movimientos-buscar').focus();
      await revisar(page, 'buscar vacío', malos);
      await page.locator('#movimientos-buscar').fill('trans');
      await page.waitForTimeout(300);
      await revisar(page, 'sugerencias', malos);
      await page.locator('.mov-barra__volver').click();

      await page.locator('[data-action="movimientos-abrir-filtros"]').click();
      for (const c of ['periodo', 'tipos', 'categorias', 'cuentas', 'empresas', 'personas', 'valor']) {
        await abrirCriterio(page, c);
        await revisar(page, `hoja ${c}`, malos);
      }
      await hoja(page).locator('[data-action="movimientos-hoja-criterio"][data-criterio="tipos"]').click();
      await hoja(page).locator('input[data-tipo="fijos"]').check();
      await abrirCriterio(page, 'estado');
      await revisar(page, 'hoja estado', malos);
      await abrirCriterio(page, 'cuentas');
      await hoja(page).locator('input[data-cuenta="bc"]').check();
      await page.locator('#mov-hoja-ver').click();
      await expect(hoja(page)).not.toHaveAttribute('data-open');
      await revisar(page, 'lista con chips', malos);
      expect(malos).toEqual([]);
    });
  });
}
