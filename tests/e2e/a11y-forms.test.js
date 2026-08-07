/**
 * a11y-forms.test.js - Pase axe sobre formularios dinámicos (A11Y.5).
 *
 * tests/unit/a11y.test.js solo audita el HTML estático de index.html; los
 * formularios se inyectan por JS al abrir cada modal y quedaban sin auditar.
 * Esta suite abre los modales representativos en Chromium real, inyecta
 * axe-core (la misma devDependency del test unitario, sin dependencias
 * nuevas) y corre WCAG 2.1 A/AA scoped al modal abierto.
 *
 * Criterio: cero violaciones critical/serious. En navegador real
 * color-contrast sí es computable, así que no se excluye.
 */

import { test, expect } from '@playwright/test';

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Estado con una cuenta activa y un ingreso mensual: suficiente para que
 * todos los formularios auditados rendericen su variante completa (el form
 * de gasto exige al menos una cuenta; "Distribuir mi ingreso" exige ingreso).
 */
async function seedEstadoBase(page) {
  await page.addInitScript(() => {
    const estado = {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [{
        id: 'cta-1', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo',
        saldo: 2_000_000, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z',
      }],
      ingresos: [{
        id: 'ing-1', descripcion: 'Salario', monto: 3_000_000,
        frecuencia: 'Mensual', activo: true,
      }],
      gastos: [],
      compromisos: [],
      metas: [],
    };
    localStorage.setItem('fk_v1', JSON.stringify(estado));
  });
}

/**
 * Inyecta axe-core en la página y lo corre scoped a `selector`.
 * Devuelve solo las violaciones critical/serious (WCAG 2.1 A/AA),
 * con el detalle de nodos para diagnóstico en el reporte.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector - contenedor a auditar (modal o panel abierto).
 */
/**
 * BUG-013: `[data-open]` se marca al INICIO del fundido de entrada
 * (`styles/modals.css`, `.modal-overlay { transition: opacity ... }`), no
 * cuando termina. Medir el contraste mientras el overlay sigue en tránsito
 * da un color mezclado con el fondo, no el real, y produce violaciones
 * `color-contrast` intermitentes que no existen con el modal ya asentado.
 *
 * Espera a que la opacidad computada del overlay (el propio `scope`, o su
 * ancestro `.modal-overlay` si `scope` es un descendiente, como el panel de
 * "Distribuir mi ingreso") llegue a `1`. Si no hay overlay que envuelva al
 * `scope` (no debería pasar hoy, pero un modal futuro sin ese contenedor no
 * debe colgar el test), no espera nada y deja que axe reporte lo que haya.
 */
async function esperarFundidoDeEntrada(page, selector) {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    const overlay = el?.closest('.modal-overlay') ?? el;
    if (!overlay) return true;
    return getComputedStyle(overlay).opacity === '1';
  }, selector, { timeout: 2_000 });
}

async function violacionesGraves(page, selector) {
  await esperarFundidoDeEntrada(page, selector);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  return await page.evaluate(async (scope) => {
    const el = document.querySelector(scope);
    if (!el) return [{ id: 'scope-no-encontrado', impact: 'critical', nodes: [scope] }];
    const results = await window.axe.run(el, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    return results.violations
      .filter(v => v.impact === 'critical' || v.impact === 'serious')
      .map(v => ({
        id: v.id,
        impact: v.impact,
        descripcion: v.description,
        nodes: v.nodes.map(n => n.html),
      }));
  }, selector);
}

/** Formatea las violaciones para que el fallo del test sea diagnosticable. */
function detalle(violaciones) {
  return violaciones
    .map(v => `[${v.impact}] ${v.id}: ${v.descripcion}\n${v.nodes.map(n => `  → ${n}`).join('\n')}`)
    .join('\n');
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe('A11Y.5 - axe sobre formularios dinámicos', () => {

  test('el modal "Nuevo gasto" no tiene violaciones graves', async ({ page }) => {
    await seedEstadoBase(page);
    await page.goto('/#gast');
    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');

    const violaciones = await violacionesGraves(page, '#modal-gasto');
    expect(violaciones, detalle(violaciones)).toHaveLength(0);
  });

  test('el modal "Nueva deuda" no tiene violaciones graves', async ({ page }) => {
    await seedEstadoBase(page);
    await page.goto('/#compromisos');
    // FD6: sin deudas el botón del encabezado se oculta y el CTA que conduce
    // es el del estado vacío (mismo verbo, misma acción).
    await page.click('.empty-state [data-action="nuevo-compromiso"]');
    await page.waitForSelector('#modal-compromiso[data-open]');

    const violaciones = await violacionesGraves(page, '#modal-compromiso');
    expect(violaciones, detalle(violaciones)).toHaveLength(0);
  });

  test('el modal "Nuevo gasto fijo" (Calendario) no tiene violaciones graves', async ({ page }) => {
    await seedEstadoBase(page);
    await page.goto('/#agenda');
    await page.click('[data-action="nuevo-gasto-fijo"]');
    await page.waitForSelector('#modal-gasto-fijo[data-open]');

    const violaciones = await violacionesGraves(page, '#modal-gasto-fijo');
    expect(violaciones, detalle(violaciones)).toHaveLength(0);
  });

  test('el modal "Nuevo apartado" no tiene violaciones graves', async ({ page }) => {
    await seedEstadoBase(page);
    await page.goto('/#apartados');
    await page.locator('#topbar-primario[data-action="nuevo-apartado"]:visible, #sec-apartados .section__header [data-action="nuevo-apartado"]:visible').click();
    await page.waitForSelector('#modal-apartado[data-open]');

    const violaciones = await violacionesGraves(page, '#modal-apartado');
    expect(violaciones, detalle(violaciones)).toHaveLength(0);
  });

  test('el modal "Nueva cuenta" no tiene violaciones graves', async ({ page }) => {
    await seedEstadoBase(page);
    await page.goto('/#tesoreria');
    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');

    const violaciones = await violacionesGraves(page, '#modal-cuenta');
    expect(violaciones, detalle(violaciones)).toHaveLength(0);
  });

  test('el asistente "Distribuir mi ingreso" abierto no tiene violaciones graves', async ({ page }) => {
    await seedEstadoBase(page);
    // El asistente solo se muestra si hay algo que repartir: un fondo de
    // emergencia activo garantiza al menos una fila de Ahorro.
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ahorro = {
        fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 100_000 },
        aportes: [], compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await page.waitForSelector('#distribuir-ingreso-panel', { timeout: 5_000 });

    const violaciones = await violacionesGraves(page, '#distribuir-ingreso-panel');
    expect(violaciones, detalle(violaciones)).toHaveLength(0);
  });
});
