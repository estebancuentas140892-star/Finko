/**
 * perfiles.test.js - APR.3a: perfiles de niño en el dispositivo, de punta a
 * punta (ADR 093 D1, D2 y P1).
 *
 * Cubre lo que los unitarios no pueden: el arranque en "¿Quién usa Finko?",
 * el cambio de piel con el fundido, el PIN de niño a adulto, el alta desde
 * Ajustes creando el candado y "Olvidé mi PIN" con la palabra.
 */

import { test, expect } from '@playwright/test';
import { sembrar, sembrarSiVacio, estadoBase, leerEstado } from './helpers/estado.js';
import { createInitialState } from '../../modules/core/state.js';

/**
 * Candado con PIN 1234: `SHA-256(salt + ':' + pin)` de `dominio/config/bloqueo.js`,
 * calculado una vez con `crearBloqueo('1234')`.
 */
const CANDADO_1234 = {
  hash: 'e3174484ebeec68f0933b4a5518a7ce757ff61899a332e68004eef36a36e788b',
  salt: '5de4f0acfa29e71ebc0497c3d5bf15b2',
  creado: '2026-10-25',
};

const SOFIA = { id: 'n-sofi', nombre: 'Sofía', edad: 8, dibujo: 'cometa', teNombra: 'Papá', creado: '2026-10-25' };

/**
 * Config completa más el candado. Sin `legalAceptado`: así la migración lo
 * da por aceptado, como a cualquier usuario existente, y el gate legal no
 * tapa la app después del PIN.
 */
const conCandado = () => {
  const { legalAceptado: _sinAceptacion, ...config } = createInitialState().config;
  return { ...config, bloqueo: CANDADO_1234 };
};

test.describe('APR.3a - perfiles en el dispositivo', () => {
  test('sin niños, el arranque no cambia: el candado de siempre', async ({ page }) => {
    await sembrar(page, estadoBase({ perfil: { nombre: 'Esteban', smmlv: 1750905 }, config: conCandado() }));
    await page.goto('/#dash');
    await expect(page.locator('#bloqueo-acceso[data-open]')).toHaveCount(1);
    await expect(page.locator('#quien-usa[data-open]')).toHaveCount(0);
  });

  test('con un niño abre en "¿Quién usa Finko?"; el niño entra libre y vuelve al adulto con PIN', async ({ page }) => {
    await sembrarSiVacio(page, estadoBase({ perfil: { nombre: 'Esteban Cardona', smmlv: 1750905 }, config: conCandado(), perfiles: [SOFIA] }));
    await page.goto('/#dash');
    const quien = page.locator('#quien-usa[data-open]');
    await expect(quien).toHaveCount(1);
    await expect(page.locator('#bloqueo-acceso[data-open]')).toHaveCount(0);
    await expect(quien).toContainText('Esteban Cardona');
    await expect(quien).toContainText('8 años');

    // De adulto a niño es libre: cambia la piel y el adulto desaparece.
    await quien.locator('[data-role="nino"]').click();
    await expect(page.locator('body.kid')).toHaveCount(1);
    await expect(page.locator('#nino-main h1')).toHaveText('¡Hola, Sofía!');
    await expect(page.locator('#app')).toBeHidden();
    await expect(page.locator('#nino-main h1')).toBeFocused();

    // De niño a adulto se pide el PIN.
    await page.click('#nino-main [data-action="perfil-cambiar"]');
    await page.locator('#quien-usa[data-open] [data-role="adulto"]').click();
    await page.fill('#quien-usa-pin', '0000');
    await page.click('#form-quien-usa-pin [type="submit"]');
    await expect(page.locator('#quien-usa-error')).toContainText('PIN incorrecto');
    await expect(page.locator('body.kid')).toHaveCount(1);

    await page.fill('#quien-usa-pin', '1234');
    await page.click('#form-quien-usa-pin [type="submit"]');
    await expect(page.locator('#quien-usa[data-open]')).toHaveCount(0);
    await expect(page.locator('body.kid')).toHaveCount(0);
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('#nino-main')).toBeEmpty();
  });

  test('el alta desde Ajustes crea el PIN antes del primer niño y el candado ya no se puede quitar', async ({ page }) => {
    await sembrarSiVacio(page, estadoBase({ perfil: { nombre: 'Esteban', smmlv: 1750905 } }));
    await page.goto('/#config');
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });
    await page.click('#config-familia [data-action="familia-agregar"]');
    const modal = page.locator('#modal-familia[data-open]');
    await expect(modal).toContainText('Aún no tienes candado.');

    await page.fill('#familia-nombre', 'Sofía');
    await modal.locator('.familia-opcion:has(input[name="edad"][value="8"])').click();
    await modal.locator('.familia-dibujo:has(input[value="cometa"])').click();
    await page.click('#form-familia-nino [type="submit"]');

    // Paso del candado: sin PIN no se agrega al niño (D1).
    await page.fill('#familia-pin', '1234');
    await page.fill('#familia-pin2', '1234');
    await page.click('#form-familia-pin [type="submit"]');
    // Paso 2: la mesada (APR.3e). Se puede dejar para después.
    await expect(modal).toContainText('Familia · paso 2 de 2');
    await page.click('[data-action="familia-sin-mesada"]');
    await expect(modal).toHaveCount(0);
    await expect(page.locator('#config-familia')).toContainText('Entrar como Sofía');
    await expect.poll(async () => (await leerEstado(page)).perfiles?.map(p => p.nombre)).toEqual(['Sofía']);
    expect((await leerEstado(page)).config.bloqueo?.hash).toBeTruthy();

    await page.click('#config-bloqueo-title ~ details summary');
    await expect(page.locator('#form-bloqueo-quitar')).toHaveCount(0);
    await expect(page.locator('#config-bloqueo-obligatorio')).toContainText('el candado es obligatorio');

    // Entrar como Sofía desde Ajustes, sin PIN.
    await page.click('[data-action="familia-entrar"]');
    await expect(page.locator('#nino-main h1')).toHaveText('¡Hola, Sofía!');
  });

  test('"Olvidé mi PIN" con niños pide escribir la palabra y avisa que borra sus perfiles', async ({ page }) => {
    await sembrar(page, estadoBase({ perfil: { nombre: 'Esteban', smmlv: 1750905 }, config: conCandado(), perfiles: [SOFIA] }));
    await page.goto('/#dash');
    await page.locator('#quien-usa[data-open] [data-role="adulto"]').click();
    await page.click('#quien-usa [data-role="olvide-pin"]');
    const dialogo = page.locator('.modal--confirm');
    await expect(dialogo).toContainText('también los perfiles de los niños');
    const confirmarBoton = dialogo.locator('[data-role="confirmar"]');
    await expect(confirmarBoton).toBeDisabled();
    await page.fill('#confirm-palabra', 'BORRAR');
    await expect(confirmarBoton).toBeEnabled();
    await dialogo.locator('[data-role="cancelar"]').click();
    await expect(page.locator('#quien-usa[data-open]')).toHaveCount(1);
  });
});

test.describe('APR.3c - la app del niño', () => {
  test('el niño sigue su ruta en orden, termina la unidad y la insignia queda en Yo', async ({ page }) => {
    const sofia = { ...SOFIA, aprende: { hechas: { 'k1-l1': '2026-10-01', 'k1-l2': '2026-10-01' }, sabidas: [], semanas: [], enCurso: null, ubicacion: null } };
    await sembrarSiVacio(page, estadoBase({ perfil: { nombre: 'Esteban', smmlv: 1750905 }, config: conCandado(), perfiles: [sofia] }));
    await page.goto('/#dash');
    await page.locator('#quien-usa[data-open] [data-role="nino"]').click();

    // Inicio ofrece la lección que sigue, con su unidad y su número.
    await expect(page.locator('#nino-main')).toContainText('Unidad 1 · lección 3');
    await expect(page.locator('#nino-nav [aria-current="page"]')).toContainText('Inicio');
    await page.click('#nino-main [data-action="leccion-abrir"]');
    const leccion = page.locator('#modal-leccion[data-open]');
    await expect(leccion).toHaveCount(1);
    await expect(leccion.locator('.leccion-nino__globo')).toBeVisible();
    await page.click('#leccion-panel [data-action="leccion-continuar"]');
    await page.click('[data-action="leccion-elegir"][data-idx="1"]');
    await expect(page.locator('.leccion-fb')).toContainText('¡Así es!');
    await page.click('.leccion-fb [data-action="leccion-continuar"]');

    // Cierre: insignia con destellos y "Úsalo de verdad".
    await expect(page.locator('#leccion-titulo')).toHaveText('¡Terminaste la unidad 1!');
    await expect(page.locator('#leccion-panel .destellos__punto')).toHaveCount(8);
    await expect(page.locator('#leccion-panel')).toContainText('Úsalo de verdad');
    await page.click('[data-action="leccion-salir-a"][data-vista="aprender"]');
    await expect(leccion).toHaveCount(0);
    await expect(page.locator('#nino-main')).toContainText('1 de 8 unidades');
    await expect(page.locator('#nino-nav [aria-current="page"]')).toContainText('Aprender');

    await page.click('#nino-nav [data-vista="yo"]');
    await expect(page.locator('#nino-main .kinsignia:not(.kinsignia--pendiente)')).toHaveCount(1);

    // El avance es del niño: el Aprende del adulto no se toca.
    await expect.poll(async () => Object.keys((await leerEstado(page)).perfiles?.[0]?.aprende?.hechas ?? {}).length).toBe(3);
    expect(Object.keys((await leerEstado(page)).aprende?.hechas ?? {})).toEqual([]);
  });
});

test.describe('APR.3d - la alcancía y la meta del niño', () => {
  test('guarda, no deja gastar de más y crea una meta que responde en semanas', async ({ page }) => {
    await sembrarSiVacio(page, estadoBase({ perfil: { nombre: 'Esteban', smmlv: 1750905 }, config: conCandado(), perfiles: [SOFIA] }));
    await page.goto('/#dash');
    await page.locator('#quien-usa[data-open] [data-role="nino"]').click();
    await page.click('#nino-nav [data-vista="alcancia"]');

    // Guardé: entra al frasco elegido, Ahorrar por defecto.
    await page.click('[data-action="nino-mov"][data-tipo="guarde"]');
    const hoja = page.locator('#modal-nino[data-open]');
    await expect(hoja).toContainText('¿Cuánto guardaste?');
    await page.click('[data-action="nino-monto"][data-monto="10000"]');
    await page.fill('#nino-nota', 'Regalo de la abuela');
    await page.click('#form-nino-mov [type="submit"]');
    await expect(hoja).toHaveCount(0);
    await expect(page.locator('.jar[data-frasco="ahorrar"] .jar__monto')).toHaveText('$10.000');

    // Gasté: no deja sacar más de lo que hay en Gastar.
    await page.click('[data-action="nino-mov"][data-tipo="gaste"]');
    await page.fill('#nino-monto', '2.000');
    await page.click('#form-nino-mov [type="submit"]');
    await expect(page.locator('#nino-mov-error')).toHaveText('En Gastar solo tienes $0.');
    await page.click('#modal-nino [data-action="modal-close"]');

    // La meta responde en semanas mientras el niño elige.
    await page.click('[data-action="nino-vista"][data-vista="meta"]');
    await page.locator('.kdibujo:has(input[value="balon"])').click();
    await page.fill('#nino-meta-nombre', 'balón');
    await page.fill('#nino-meta-precio', '30.000');
    await expect(page.locator('#nino-meta-plan')).toContainText('Lo tendrás en 10 semanas.');
    await page.click('[data-action="nino-meta-semana"][data-paso="1000"]');
    await expect(page.locator('#nino-meta-plan')).toContainText('Lo tendrás en 7 semanas.');
    await page.click('#form-nino-meta [type="submit"]');
    await expect(page.locator('#nino-main')).toContainText('Mi balón · $30.000');
    await expect(page.locator('#nino-main')).toContainText('Te faltan $20.000.');

    await expect.poll(async () => (await leerEstado(page)).perfiles?.[0]?.metas?.length).toBe(1);
    const nino = (await leerEstado(page)).perfiles[0];
    expect(nino.movimientos).toMatchObject([{ frasco: 'ahorrar', monto: 10_000, tipo: 'guarde', nota: 'Regalo de la abuela' }]);
  });
});

test.describe('APR.3e - el tutor en Ajustes, Familia', () => {
  test('la mesada entregada es un gasto Familia del tutor y entra a los frascos del niño', async ({ page }) => {
    // Hoy toca la mesada: día de la semana de hoy, desde hace una semana.
    const hoy = new Date();
    const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 500_000, activa: true, fechaCreacion: '2026-07-01T00:00:00.000Z' }];
    await sembrarSiVacio(page, estadoBase({ perfil: { nombre: 'Esteban', smmlv: 1750905 }, config: conCandado(), perfiles: [SOFIA], cuentas }));
    await page.goto('/#dash');
    await page.locator('#quien-usa[data-open] [data-role="adulto"]').click();
    await page.fill('#quien-usa-pin', '1234');
    await page.click('#form-quien-usa-pin [type="submit"]');
    await page.goto('/#config');
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });

    await page.click('#config-familia [data-action="familia-progreso"]');
    const modal = page.locator('#modal-familia[data-open]');
    await expect(modal).toContainText('Aún no tiene mesada.');
    await page.click('#modal-familia [data-action="familia-mesada"]');
    await page.selectOption('#familia-dia', String(hoy.getDay()));
    await page.click('#form-familia-mesada [type="submit"]');
    await expect(modal).toContainText('Toca entregar la mesada');

    await page.click('#modal-familia [data-action="familia-entregada"]');
    await expect(modal).toContainText('Al día.');
    await expect.poll(async () => (await leerEstado(page)).gastos?.filter(g => g.categoria === 'Familia').length).toBe(1);
    const estado = await leerEstado(page);
    const gasto = estado.gastos.find(g => g.categoria === 'Familia');
    expect(gasto).toMatchObject({ monto: 20_000, cuentaId: 'c1', descripcion: 'Mesada de Sofía', fecha: hoyISO });
    expect(estado.cuentas[0].saldo).toBe(480_000);
    expect(estado.perfiles[0].movimientos.map(m => `${m.frasco}:${m.monto}`)).toEqual(['ahorrar:10000', 'gastar:8000', 'compartir:2000']);

    // El premio se activa con su tasa y el niño lo ve en su alcancía.
    await page.click('#modal-familia [data-action="familia-premio"]');
    await page.click('#form-familia-premio [type="submit"]');
    await expect(modal).toContainText('Activo: le sumas $1 por cada $10');
    await page.click('#modal-familia [data-action="familia-entrar"]');
    await page.click('#nino-nav [data-vista="alcancia"]');
    await expect(page.locator('#nino-main')).toContainText('Mi mesada');
    await expect(page.locator('#nino-main')).toContainText('Papá te suma $1 por cada $10.');
  });
});

test.describe('APR.3f - la ruta completa del niño', () => {
  test('desde los 10 años, tres preguntas ubican al niño y lo sabido cuenta como hecho', async ({ page }) => {
    const mateo = { id: 'n-mateo', nombre: 'Mateo', edad: 11, dibujo: 'balon', teNombra: 'Mamá', creado: '2026-10-25' };
    await sembrarSiVacio(page, estadoBase({ perfil: { nombre: 'Esteban', smmlv: 1750905 }, config: conCandado(), perfiles: [mateo] }));
    await page.goto('/#dash');
    await page.locator('#quien-usa[data-open] [data-role="nino"]').click();
    await expect(page.locator('#nino-main')).toContainText('Antes de empezar, tres preguntas');
    await page.click('#nino-main [data-action="ubicacion-abrir"]');
    await expect(page.locator('.leccion__cuenta')).toHaveText('1 de 3');
    for (const idx of ['0', '1', '-1']) {
      await page.click(`[data-action="leccion-elegir"][data-idx="${idx}"]`);
      await page.click('.leccion-fb [data-action="leccion-continuar"]');
    }
    await expect(page.locator('#leccion-titulo')).toHaveText('Empiezas en la unidad 3');
    await page.click('[data-action="leccion-salir-a"][data-vista="aprender"]');
    await expect(page.locator('#nino-main')).toContainText('2 de 8 unidades');
    await expect(page.locator('#nino-main')).toContainText('Unidad 3 · vas aquí');
    await expect.poll(async () => (await leerEstado(page)).perfiles?.[0]?.aprende?.sabidas).toEqual(['k1', 'k2']);
  });
});

