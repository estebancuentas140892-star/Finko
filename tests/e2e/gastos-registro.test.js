/**
 * gastos-registro.test.js - Registrar gasto en el teléfono, de principio a fin
 * (GAS.3, ADR 156, tablero "Gastos · Rediseño integral").
 *
 * Lo que los unitarios no miden: que la flecha del vacío llegue al botón
 * central, que las tres etapas quepan sin desplazar, que cada día del
 * calendario caiga bajo su letra, que una cuenta sin saldo apague "Guardar
 * gasto" y que guardar deje un solo registro con todo lo elegido. Todos los
 * datos son inventados.
 */

import { test, expect } from '@playwright/test';
import { sembrar, estadoBase, leerEstado } from './helpers/estado.js';

test.use({ viewport: { width: 390, height: 844 } });

const CUENTAS = [
  { id: 'c1', nombre: 'Bancolombia Ahorros', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 2_345_678, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
  { id: 'c2', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 0, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' },
];

/** El alto que le sobra al cuerpo de la hoja: 0 si cabe sin desplazar. */
const sobra = (page) => page.locator('#modal-gasto-body').evaluate(b => b.scrollHeight - b.clientHeight);

test.describe('GAS.3: Registrar gasto (ADR 156)', () => {
  test('el mes sin gastos: Tino y cuatro tejas; Mercado abre el gasto con su categoría (GAS.8c; GAS.10a, ADR 185 D2)', async ({ page }) => {
    // GAS.8c (ADR 182 D3): con un fijo anotado no va la pista de Por pagar.
    const hoy = new Date();
    const hoyIso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    await sembrar(page, estadoBase({
      cuentas: CUENTAS,
      compromisos: [{ id: 'f1', tipo: 'fijo', descripcion: 'Arriendo', monto: 900_000, frecuencia: 'Mensual', diaPago: hoy.getDate(), activo: true, fechaCreacion: hoyIso }],
    }));
    await page.goto('/#gast');
    const vacio = page.locator('#lista-gastos .dia-nuevo');
    await expect(vacio.locator('.dia-nuevo__titulo')).toHaveText('Aquí verás en qué se va tu dinero', { timeout: 10_000 });
    await expect(vacio.locator('.tino-sol')).toHaveAttribute('data-pose', 'explica');
    await expect(vacio.locator('.dia-nuevo__cta')).toHaveCount(0);
    await expect(vacio.locator('.dia-nuevo__teja')).toHaveText(['Mercado', 'Restaurantes', 'Transporte', 'Café']);
    await expect(vacio.locator('.dia-nuevo__pista')).toHaveCount(0);
    // En el teléfono el banner de propósito no se pinta encima.
    await expect(page.locator('#proposito-gast')).toBeHidden();

    await vacio.locator('.dia-nuevo__teja', { hasText: 'Mercado' }).click();
    const form = page.locator('#modal-gasto[data-open] #form-gasto[data-etapas]');
    await expect(form).toBeVisible();
    await expect(form.locator('[name="categoria"][value="Mercado"]')).toBeChecked();
  });

  test('de principio a fin: tres etapas sin desplazar, saldo que no alcanza, otra fecha, nota y un solo registro', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#gast');
    await page.locator('.nav-item--registrar').click();
    const form = page.locator('#form-gasto');

    // 1. Monto: el teclado de Finko y nada más.
    await expect(form.locator('.kp__k')).toHaveCount(12, { timeout: 10_000 });
    await expect(form.locator('[data-kp-sistema]')).toHaveCount(0);
    for (const t of ['4', '5', '000']) await form.locator(`[data-tecla="${t}"]`).click();
    await expect(form.locator('#gasto-monto')).toHaveValue('45.000');
    expect(await sobra(page)).toBe(0);
    await form.locator('[data-gasto-seguir="monto"]').click();

    // 2. Categoría (GAS.10c, ADR 185 D4): por áreas, todas a la vista a
    // 390; ningún nombre pasa de dos líneas y Entretenimiento va en una.
    await expect(form.locator('.tejas__area')).toHaveText(['Comida', 'Movilidad', 'Personal', 'Casa y familia']);
    expect(await sobra(page)).toBe(0);
    const partidas = await form.locator('.teja-op__t').evaluateAll(ts => ts
      .filter(t => t.getBoundingClientRect().height > parseFloat(getComputedStyle(t).lineHeight) * 2.5)
      .map(t => t.textContent));
    expect(partidas).toEqual([]);
    const entret = form.locator('.teja-op__t', { hasText: 'Entretenimiento' });
    expect(await entret.evaluate(t => t.getBoundingClientRect().height <= parseFloat(getComputedStyle(t).lineHeight) * 1.5)).toBe(true);
    await form.locator('.teja-op', { hasText: 'Transporte' }).click();

    // 3. El detalle (GAS.10c): la categoría arriba; Taxi depende del
    // momento, así que "Necesidad" y "Deseo" aparecen dentro de la opción.
    await expect(form.locator('#gasto-detalle-q')).toHaveText('Transporte');
    const detalle = form.locator('[data-etapa="detalle"]');
    await detalle.locator('.chip-cat', { hasText: 'Taxi' }).click();
    await expect(form).toHaveAttribute('data-etapa-actual', 'detalle');
    const deseo = detalle.locator('[data-caracter-grupo] .chip-cat', { hasText: 'Deseo' });
    await expect(deseo).toBeVisible();
    const taxi = await detalle.locator('.chip-cat', { hasText: 'Taxi' }).boundingBox();
    const caja = await deseo.boundingBox();
    expect(caja.y).toBeGreaterThan(taxi.y + taxi.height - 1);
    expect(caja.y).toBeLessThan(taxi.y + taxi.height + 20);
    expect(await sobra(page)).toBe(0);
    await deseo.click();

    // 4. Recibo: cada dato una vez y un solo botón.
    await expect(form.locator('#gasto-fila-detalle [data-fila-v]')).toHaveText('Taxi · Deseo');
    await expect(form.locator('[data-recibo-cat]')).toHaveText('Transporte');
    await expect(form.locator('[data-recibo-monto]')).toHaveText('$45.000');
    await expect(form.locator('[data-etapa="revisar"]')).not.toContainText('Cuarenta y cinco mil');
    await expect(form.locator('[data-etapa="revisar"]')).not.toContainText('Toca cualquier dato');
    await expect(form.locator('.recibo__pie button')).toHaveCount(1);
    expect(await sobra(page)).toBe(0);

    // "Sale de": Nequi en $0 apaga "Guardar gasto" con un solo mensaje.
    await form.locator('#gasto-fila-cuenta').click();
    await form.locator('#gasto-mini-cuenta .cuenta-pago__opcion', { hasText: 'Nequi' }).click();
    await expect(form.locator('#gasto-aviso-saldo')).toHaveText('No tienes saldo suficiente en esta cuenta: faltan $45.000. Elige otro método de pago para completar el gasto.');
    await expect(form.locator('.recibo__pie [type="submit"]')).toBeDisabled();
    await form.locator('#gasto-fila-cuenta').click();
    await form.locator('#gasto-mini-cuenta .cuenta-pago__opcion', { hasText: 'Bancolombia' }).click();
    await expect(form.locator('#gasto-aviso-saldo')).toBeHidden();
    await expect(form.locator('#gasto-fila-cuenta')).toContainText('quedan $2.300.678');

    // "Otra fecha": cada día bajo su letra, y el elegido queda.
    await form.locator('#gasto-fila-fecha').click();
    await form.locator('#gasto-mini-fecha .chip-fecha', { hasText: 'Otra fecha' }).click();
    const descentrados = await form.locator('#gasto-calendario').evaluate((cal) => {
      const letras = [...cal.querySelectorAll('.calf__nombre')].map(n => { const r = n.getBoundingClientRect(); return r.left + r.width / 2; });
      const malos = [];
      for (const fila of cal.querySelectorAll('.calf__semana:not(.calf__semana--nombres)')) {
        [...fila.children].forEach((celda, i) => {
          const dia = celda.querySelector('.calf__dia');
          if (!dia) return;
          const rango = document.createRange();
          rango.selectNodeContents(dia);
          const texto = rango.getBoundingClientRect();
          if (Math.abs(texto.left + texto.width / 2 - letras[i]) > 1.5) malos.push(dia.textContent);
        });
      }
      return malos;
    });
    expect(descentrados).toEqual([]);
    const primero = form.locator('#gasto-calendario [data-calf-dia$="-01"]');
    const fecha = await primero.getAttribute('data-calf-dia');
    await primero.click();
    await expect(form.locator('[name="fecha"]')).toHaveValue(fecha);

    // Nota: se escribe, se conserva y no mueve la hoja.
    await form.locator('#gasto-fila-nota').click();
    // GAS.10d (ADR 185 D5): "Nota", el campo y "Listo"; la factura no se mueve.
    await expect(form.locator('#gasto-mini-nota .mini-hoja__sub')).toHaveCount(0);
    await form.locator('#gasto-nota').fill('Con el equipo');
    await form.locator('#gasto-mini-nota .mini-hoja__pie .btn').click();
    await expect(form.locator('#gasto-fila-nota [data-fila-v]')).toHaveText('Con el equipo');

    await form.locator('.recibo__pie [type="submit"]').click();
    await expect(page.locator('#modal-gasto[data-open]')).toHaveCount(0);
    await expect.poll(async () => {
      const st = await leerEstado(page);
      return { gastos: st.gastos.length, saldo: st.cuentas.find(c => c.id === 'c1').saldo, nequi: st.cuentas.find(c => c.id === 'c2').saldo };
    }).toEqual({ gastos: 1, saldo: 2_300_678, nequi: 0 });
    const [gasto] = (await leerEstado(page)).gastos;
    expect(gasto).toMatchObject({ monto: 45_000, categoria: 'Transporte', subcategoriaId: 'transp-taxi', caracter: 'gusto', cuentaId: 'c1', fecha, nota: 'Con el equipo' });
  });
});
