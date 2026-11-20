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
    // GAS.10g (ADR 185 D8): "Cuotas de noviembre: $680.000".
    await expect(hero.locator('.hero-compromisos__linea')).toHaveText(/^Cuotas de [a-z]+: \$680\.000$/);
    await expect(hero.locator('.hero-gastos__ley')).toHaveText(['Entidades $7.450.000', 'Personas $600.000']);

    const puertas = page.locator('.deudas-puerta');
    // Un selector de dos pestañas con su conteo, sin la frase de cada una.
    await expect(puertas).toHaveText([/Con entidades\s*2/, /Con personas\s*1/]);
    await expect(puertas.first()).toHaveAttribute('aria-label', 'Con entidades, 2 deudas');
    await expect(page.locator('.deudas-frase')).toHaveCount(0);
    await expect(puertas.first()).toHaveAttribute('aria-pressed', 'true');
    // Con entidades: lo que falta, el avance pagado y el cupo usado.
    const d1 = page.locator('.deuda-inv__fila[data-id="d1"]');
    await expect(d1.locator('.deuda-inv__meta')).toHaveText(`Cuota $400.000 · día ${enTresDias}`);
    await expect(d1.locator('.deuda-inv__avance-texto')).toHaveText('40 % pagado');
    await expect(page.locator('.deuda-inv__fila[data-id="d2"] .deuda-inv__avance-texto')).toHaveText('73 % del cupo');
    await expect(page.locator('.deudas-agregar')).toHaveText('Agregar deuda con una entidad');

    // Con personas: su deuda, la pista de Me deben y su botón.
    await puertas.nth(1).click();
    await expect(puertas.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.deuda-inv__fila')).toHaveCount(1);
    await expect(page.locator('.deuda-inv__fila[data-id="d3"] .deuda-inv__meta')).toHaveText('Cuota $100.000 · día 15');
    await expect(page.locator('.deudas-pista')).toHaveAttribute('href', '#personales');
    await page.locator('.deudas-agregar').click();
    await expect(page.locator('#modal-compromiso[data-open] #form-compromiso')).toHaveCount(1);
  });

  test('sin deudas: un Tino, la pregunta, dos tarjetas lado a lado y la calma, sin desplazar (GAS.10g)', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 740 });
    await sembrar(page, estadoBase({ cuentas: [CUENTA] }));
    await page.goto('/#deudas');
    await expect(page.locator('#sec-compromisos .deudas-vacio .dia-nuevo__titulo')).toHaveText('¿Le debes dinero a alguien?', { timeout: 10_000 });
    await expect(page.locator('#compromisos-hero')).toBeEmpty();
    await expect(page.locator('#proposito-compromisos')).toBeHidden();
    const caminos = page.locator('.deudas-vacio .vacio-caminos__fila');
    await expect(caminos).toHaveCount(2);
    await expect(caminos).toHaveText([/Con una entidad\s*Banco, cooperativa o crédito\s*Agregar/, /Con una persona\s*Familia, amigos o conocidos\s*Agregar/]);
    // Lado a lado.
    const [a, b] = await caminos.evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)));
    expect(a).toBe(b);
    await expect(page.locator('.deudas-vacio .tino-sol')).toHaveCount(1);
    await expect(page.locator('.deudas-vacio__calma')).toHaveText('Si no le debes a nadie, no tienes que hacer nada aquí.');
    // Cabe en el Redmi Note 11 sin desplazar: la calma se ve encima de la barra.
    const calma = await page.locator('.deudas-vacio__calma').boundingBox();
    const barra = await page.locator('#sidebar').boundingBox();
    expect(calma.y + calma.height).toBeLessThanOrEqual(barra ? barra.y : 740);

    await caminos.filter({ hasText: 'Con una persona' }).click();
    await expect(page.locator('#modal-compromiso[data-open] #form-compromiso')).toHaveCount(1);
  });
});

test.describe('Límites (GAS.8f, ADR 182 D6)', () => {
  test('la lista con su pastilla, la alerta del más cerca y "Otras categorías sin límite"', async ({ page }) => {
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
    await expect(page.locator('.hero-limites__linea')).toHaveText('Usaste $585.000 de $600.000 en tus 2 límites', { timeout: 10_000 });
    await expect(page.locator('.limite-fila__pastilla')).toHaveText(['Te pasaste', 'Cerca']);
    await expect(page.locator('.limite-fila[data-id="p1"] .limite-fila__queda')).toContainText('por encima');

    // Una sola alerta: Mercado va en 85 % y se acerca; "Ver" abre su hoja.
    const alerta = page.locator('.limites-alerta');
    await expect(alerta).toHaveCount(1);
    await expect(alerta.locator('.franja-alerta__titulo')).toHaveText('Mercado va en 85 %');
    await alerta.click();
    await expect(page.locator('#modal-detalle-fila[data-open] .detalle-fila__titulo')).toHaveText('Mercado');
    await page.keyboard.press('Escape');

    await expect(page.locator('.envelope-huerfanas__title')).toHaveText('Otras categorías sin límite');
    await expect(page.locator('.envelope-huerfanas__btn[data-categoria="Salud"] .envelope-huerfanas__mes')).toHaveText('$96.500 · 1 gasto');
    const fijos = page.locator('.envelope-huerfanas__motivo--link', { hasText: 'Se controla en Fijos' });
    await expect(fijos).toHaveAttribute('href', '#fijos');
  });
});

test.describe('Nuevo límite en dos pasos (GAS.8g, ADR 182 D7)', () => {
  test('solo una parte: Domicilio con su máximo, y la fila se nombra por la parte', async ({ page }) => {
    const dia = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    await sembrar(page, estadoBase({
      cuentas: [CUENTA],
      presupuestos: [{ id: 'p1', categoria: 'Mercado', montoMensual: 400_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }],
      gastos: [
        { id: 'g1', categoria: 'Restaurantes', subcategoriaId: 'rest-domicilio', monto: 45_000, fecha: dia, cuentaId: 'c1' },
        { id: 'g2', categoria: 'Restaurantes', subcategoriaId: 'rest-almuerzo', monto: 62_000, fecha: dia, cuentaId: 'c1' },
      ],
    }));
    await page.goto('/#presupuesto');
    await page.locator('.limites-cabeza__nuevo').click();
    const hoja = page.locator('#modal-presupuesto[data-open]');
    await expect(hoja.locator('.limite-pasos__paso')).toHaveText('Paso 1 de 2 · Dónde');
    await hoja.locator('[data-action="limite-elegir-categoria"][data-categoria="Restaurantes"]').click();
    await expect(hoja.locator('.limite-pasos__elegida-sub')).toHaveText('Este mes: $107.000 en 2 gastos');
    await hoja.locator('[data-action="limite-modo"][data-modo="parte"]').click();
    await hoja.locator('[data-action="limite-parte"][data-sub="rest-domicilio"]').click();
    await expect(hoja.locator('.limite-pasos__nota')).toContainText('Los domicilios suelen crecer');
    await hoja.locator('.limite-pasos__principal').click();
    await expect(hoja.locator('.limite-pasos__paso')).toHaveText('Paso 2 de 2 · Cuánto');
    await hoja.locator('#presupuesto-monto').fill('60000');
    await hoja.locator('button[type="submit"]').click();
    await expect(page.locator('#modal-presupuesto[data-open]')).toHaveCount(0);

    const fila = page.locator('.limite-fila', { hasText: 'Restaurantes · Domicilio' });
    await expect(fila.locator('.limite-fila__uso')).toHaveText('Usaste $45.000 de $60.000');
    await expect(fila.locator('.limite-fila__pastilla')).toHaveText('Cerca');
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
    await expect(pista).toContainText('Anótalo en Fijos');
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

test.describe('Navegación entre las cuatro pestañas (GAS.9a, ADR 183 D1)', () => {
  test.use({ hasTouch: true });

  const semilla = () => estadoBase({
    cuentas: [CUENTA],
    compromisos: [
      { id: 'f1', tipo: 'fijo', descripcion: 'Arriendo', monto: 900_000, frecuencia: 'Mensual', diaPago: 28, categoria: 'Arriendo', activo: true },
      { id: 'd1', tipo: 'deuda-entidad', descripcion: 'Crédito', saldoTotal: 2_000_000, cuotaMensual: 200_000, frecuencia: 'Mensual', diaPago: 28, activo: true },
    ],
    presupuestos: [{ id: 'p1', categoria: 'Mercado', montoMensual: 400_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }],
    gastos: Array.from({ length: 24 }, (_, i) => ({
      id: `g${i}`, categoria: i % 2 ? 'Mercado' : 'Restaurantes', monto: 10_000 + i, fecha: iso(hoy), cuentaId: 'c1',
    })),
  });

  test('cada toque abre su pestaña y la marcada es la que se ve', async ({ page }) => {
    await sembrar(page, semilla());
    await page.goto('/#gast');
    await expect(page.locator('#sec-gast.active')).toBeVisible({ timeout: 10_000 });
    const recorrido = [
      ['fijos', 'sec-compromisos'], ['deudas', 'sec-compromisos'], ['presupuesto', 'sec-presupuesto'],
      ['gast', 'sec-gast'], ['deudas', 'sec-compromisos'], ['fijos', 'sec-compromisos'], ['presupuesto', 'sec-presupuesto'], ['gast', 'sec-gast'],
    ];
    for (const [hash, seccion] of recorrido) {
      await page.locator(`.section.active .bloque-tabs__tab[data-section="${hash}"]`).tap();
      await expect(page).toHaveURL(new RegExp(`#${hash}$`));
      await expect(page.locator(`#${seccion}.active`)).toBeVisible();
      await expect(page.locator('.section.active .bloque-tabs__tab.active')).toHaveAttribute('data-section', hash);
      await expect(page.locator('.section.active .bloque-tabs__tab.active')).toHaveCount(1);
    }
  });

  test('al volver a Día a día no se asoma la tarjeta compacta (la raya café)', async ({ page }) => {
    await sembrar(page, semilla());
    await page.goto('/#gast');
    await expect(page.locator('#sec-gast .hero-gastos')).toBeVisible({ timeout: 10_000 });
    const compacta = page.locator('#gastos-compacta');
    // Abajo, con la tarjeta grande ya arriba, la compacta sí está.
    // La página de prueba es corta: se alarga para poder bajar.
    await page.evaluate(() => { document.body.style.minHeight = '3000px'; window.scrollTo(0, 900); });
    await expect(compacta).toBeVisible();
    await page.locator('.section.active .bloque-tabs__tab[data-section="fijos"]').tap();
    await expect(page.locator('#sec-compromisos.active')).toBeVisible();
    await page.locator('.section.active .bloque-tabs__tab[data-section="gast"]').tap();
    // En el primer cuadro de vuelta, y después, sigue oculta.
    expect(await compacta.evaluate(el => el.hidden)).toBe(true);
    await page.waitForTimeout(300);
    await expect(compacta).toBeHidden();
  });
});

test.describe('Cada lugar con una función (GAS.10a, ADR 185 D1)', () => {
  test('pestañas arriba, el ojo en cada tarjeta y la lupa abre Movimientos con Gastos', async ({ page }) => {
    await sembrar(page, estadoBase({
      cuentas: [CUENTA],
      compromisos: [
        // Creado el mes pasado, el día 1 y sin pagos: está vencido.
        { id: 'f1', tipo: 'fijo', descripcion: 'Netflix', monto: 44_900, frecuencia: 'Mensual', diaPago: 1, categoria: 'Streaming', activo: true, fechaCreacion: iso(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)) },
        { id: 'd1', tipo: 'deuda-entidad', descripcion: 'Crédito', saldoTotal: 2_000_000, cuotaMensual: 200_000, frecuencia: 'Mensual', diaPago: 28, activo: true },
      ],
      gastos: [{ id: 'g1', categoria: 'Mercado', monto: 45_000, fecha: iso(hoy), cuentaId: 'c1' }],
    }));
    await page.goto('/#gast');
    const tabs = page.locator('#sec-gast .bloque-tabs');
    await expect(tabs).toBeVisible({ timeout: 10_000 });
    // Las pestañas son lo primero de la sección; sin franja de lo vencido.
    const arriba = await tabs.boundingBox();
    expect(arriba.y).toBeLessThan(40);
    await expect(page.locator('#sec-gast .franja-alerta')).toHaveCount(0);
    await expect(page.locator('#sec-gast .bloque-tabs__tab[data-section="fijos"] .bloque-tabs__badge--punto')).toBeVisible();
    await expect(page.locator('#sec-gast .bloque-tabs__tab[data-section="fijos"]')).toHaveAttribute('aria-label', 'Fijos, 1 vencido');

    // El ojo de la tarjeta, en la fila del rótulo.
    const ojo = page.locator('#sec-gast .hero-gastos__ojo');
    await expect(ojo).toBeVisible();
    const fila = await page.locator('#sec-gast .hero-gastos__label').boundingBox();
    const caja = await ojo.boundingBox();
    expect(Math.abs((caja.y + caja.height / 2) - (fila.y + fila.height / 2))).toBeLessThan(4);
    await page.locator('#sec-gast .bloque-tabs__tab[data-section="deudas"]').click();
    await expect(page.locator('#compromisos-hero .hero-deudas .hero-compromisos__ojo')).toBeVisible();
    await page.locator('#sec-compromisos .bloque-tabs__tab[data-section="gast"]').click();

    // La lupa: Movimientos con Gastos marcado y el foco en la búsqueda.
    await page.locator('#panel-filtros-gastos .filtros-bar__embudo').click();
    await expect(page).toHaveURL(/#movimientos/);
    await expect(page.locator('#movimientos-buscar')).toBeFocused();
  });
});
