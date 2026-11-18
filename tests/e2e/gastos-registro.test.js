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
  test('el vacío no trae botón ni flecha: el halo late en el botón central, sin desplazar la página', async ({ page }) => {
    await sembrar(page, estadoBase({ cuentas: CUENTAS }));
    await page.goto('/#gast');
    const vacio = page.locator('#lista-gastos .gastos-empty--primera');
    await expect(vacio.locator('.gastos-empty__title')).toHaveText('Anota tu primera compra', { timeout: 10_000 });
    await expect(vacio.locator('.gastos-empty__desc--movil')).toBeVisible();
    await expect(vacio.locator('button, [data-action]')).toHaveCount(0);
    // En el teléfono el banner de propósito no se pinta encima.
    await expect(page.locator('#proposito-gast')).toBeHidden();

    const medidas = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const boton = r('.nav-item--registrar .nav-item__fab');
      const halo = r('.gastos-empty__guia--halo');
      return {
        centroX: Math.abs((halo.left + halo.width / 2) - (boton.left + boton.width / 2)),
        centroY: Math.abs((halo.top + halo.height / 2) - (boton.top + boton.height / 2)),
        desborda: document.documentElement.scrollHeight - window.innerHeight,
      };
    });
    // GAS.5a (ADR 161 D1): la flecha punteada se fue; el halo rodea el botón.
    await expect(vacio.locator('.gastos-empty__guia--trazo, .gastos-empty__guia--punta')).toHaveCount(0);
    await expect(vacio.locator('.tino-sol')).toHaveAttribute('data-pose', 'anota');
    expect(medidas.centroX).toBeLessThan(1);
    expect(medidas.centroY).toBeLessThan(1);
    expect(medidas.desborda).toBeLessThanOrEqual(0);

    // El botón central abre el gasto de esta lente (ADR 148).
    await page.locator('.nav-item--registrar').click();
    await expect(page.locator('#form-gasto[data-etapas]')).toBeVisible();
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

    // 2. Categoría: todas a la vista y cada nombre en una línea a 390.
    await expect(form.locator('#gasto-cat-q')).toHaveText('Elige la categoría en la que gastaste tu dinero');
    expect(await sobra(page)).toBe(0);
    const lineas = await form.locator('.teja-op__t').evaluateAll(ts => ts
      .filter(t => t.getBoundingClientRect().height > parseFloat(getComputedStyle(t).lineHeight) * 1.5)
      .map(t => t.textContent));
    expect(lineas).toEqual([]);
    await form.locator('.teja-op', { hasText: 'Entretenimiento' }).click();

    // 3. "¿En qué fue?" (GAS.5c, ADR 162 D1): Cine depende del día, así
    // que pregunta si fue necesidad o deseo; todo cabe sin desplazar.
    await expect(form.locator('#gasto-detalle-q')).toHaveText('¿En qué fue?');
    const detalle = form.locator('[data-etapa="detalle"]');
    await detalle.locator('.chip-cat', { hasText: 'Cine' }).click();
    await expect(form).toHaveAttribute('data-etapa-actual', 'detalle');
    await expect(detalle.locator('[data-caracter-grupo] legend')).toHaveText('¿Fue una necesidad o un deseo?');
    expect(await sobra(page)).toBe(0);
    await detalle.locator('[data-caracter-grupo] .chip-cat', { hasText: 'Deseo' }).click();

    // 4. Recibo: cada dato una vez y un solo botón.
    await expect(form.locator('#gasto-fila-detalle [data-fila-v]')).toHaveText('Cine · Deseo');
    await expect(form.locator('[data-recibo-cat]')).toHaveText('Entretenimiento');
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
    await expect(form.locator('#gasto-fila-cuenta')).toContainText('Te quedan $2.300.678');

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
    await expect(form.locator('#gasto-mini-nota .mini-hoja__sub')).toHaveText('Lo que escribas aparece en tu lista de gastos.');
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
    expect(gasto).toMatchObject({ monto: 45_000, categoria: 'Entretenimiento', subcategoriaId: 'entret-cine', caracter: 'gusto', cuentaId: 'c1', fecha, nota: 'Con el equipo' });
  });
});
