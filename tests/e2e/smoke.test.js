/**
 * smoke.test.js - Tests E2E de los flujos críticos de Finko.
 *
 * Cubre:
 * 1. Dashboard - carga correcta, métricas visibles.
 * 2. Onboarding - wizard aparece, se completa, no vuelve a aparecer.
 * 3. Navegación - secciones se activan con el router hash.
 * 4. Gastos - registrar gasto, verifica en lista.
 * 5. Tesorería - agregar cuenta, saldo en dashboard se actualiza.
 * 7. Gastos-Cuenta integrado - crear gasto con selector cuenta obligatorio,
 *    verificar saldo decrementado, editar (cambiar monto), eliminar y restaurar.
 * 8. Tema - toggle claro/oscuro actualiza aria-pressed.
 * 9. Sidebar - colapsable en desktop, estado persiste.
 * 10. Agenda - calendario mensual, navegación prev/next.
 * 11. Agenda - badge "Ya abonaste este mes" (ADR 002).
 */

import { test, expect } from '@playwright/test';

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Inyecta un estado inicial en localStorage para saltear el onboarding.
 * Se llama en `page.addInitScript` antes de que la app cargue.
 */
async function saltearOnboarding(page) {
  await page.addInitScript(() => {
    const estado = {
      version: 1,
      perfil: { nombre: 'TestUser', smmlv: 1750905 },
      onboarded: true,
      cuentas: [],
      ingresos: [],
      gastos: [],
      compromisos: [],
      metas: [],
    };
    localStorage.setItem('fk_v1', JSON.stringify(estado));
  });
}

/**
 * Selector robusto para modal cerrado:
 * - cerrarModal() hace setAttribute('aria-hidden', 'true')
 * - abrirModal() hace removeAttribute('aria-hidden') + dataset.open = ''
 */
const modalCerrado = (id) =>
  `#${id}:not([data-open])`;

/**
 * Fecha de hoy en `YYYY-MM-DD`, hora local (no UTC).
 * Replica `hoy()` de `modules/infra/utils.js`: usar `toISOString()` es
 * incorrecto porque en zonas horarias negativas (Colombia UTC-5) puede
 * devolver el dia siguiente cerca de medianoche, y la app filtra "este mes"
 * en hora local.
 */
function hoyLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Avanza el asistente "Distribuir mi ingreso" (MC.7d, shell paginado) hasta
 * que `selector` sea visible, o hasta el último paso si no se pasa selector
 * (donde vive el botón "Distribuir"). El panel debe estar ya abierto.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string|null} [selector] - selector CSS que se busca al avanzar.
 */
async function avanzarDistribuirHasta(page, selector = null) {
  const siguiente = page.locator('[data-action="distribuir-paso-siguiente"]');
  for (let i = 0; i < 5; i++) {
    if (selector && await page.locator(selector).first().isVisible()) return;
    if (!(await siguiente.isVisible())) return;
    await siguiente.click();
  }
}

/**
 * Crea una cuenta de tipo Efectivo con el saldo indicado.
 *
 * El form de cuenta fue rediseñado en v8.7-v8.9:
 * - Ya no tiene campo `nombre`; el nombre se autogenera como banco + tipo.
 * - El banco se elige con un custom bank-picker cuya lista flotante (_initBankPicker)
 *   se mueve a <body> con position:fixed, por eso los items se buscan desde `page`.
 * - Para "Efectivo" el campo tipo se oculta automáticamente (no requiere selección).
 * - Nombre autogenerado resultante: "Efectivo".
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} saldo - saldo inicial de la cuenta (entero, COP)
 */
async function crearCuentaEfectivo(page, saldo) {
  await page.click('[data-action="nueva-cuenta"]');
  await page.waitForSelector('#modal-cuenta[data-open]');

  // Abrir el bank-picker y seleccionar Efectivo (primer banco en la lista).
  // La lista flotante se mueve a <body> por JS; hay que buscarla desde page.
  const form = page.locator('#modal-cuenta-body form');
  await form.locator('.bank-picker__trigger').click();
  await page.waitForSelector('#banco-list:not([hidden])', { timeout: 5_000 });
  await page.locator('#banco-list .bank-picker__item[data-value="Efectivo"]').click();

  // Tipo se oculta para Efectivo; solo rellenar saldo.
  await form.locator('[name="saldo"]').fill(String(saldo));
  await form.locator('button[type="submit"]').click();

  // Esperar cierre del modal antes de continuar.
  await page.waitForSelector(modalCerrado('modal-cuenta'), { timeout: 5_000 });
}

// ── SUITE 1: Dashboard ──────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
  });

  test('carga el dashboard y activa la sección principal', async ({ page }) => {
    await expect(page.locator('#sec-dash.active')).toBeVisible();
    // Con cuentas vacías, I.1 muestra la guía de primeros pasos
    await expect(page.locator('#hero-guia-saldo')).toBeVisible();
  });

  test('con una cuenta nueva, el saldo total es $0', async ({ page }) => {
    // El beforeEach siembra estado vacío. Aquí agregamos una cuenta con saldo 0
    // (segundo addInitScript: lee el estado ya sembrado y agrega la cuenta).
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.cuentas = [{ id: 'c1', nombre: 'Efectivo', tipo: 'efectivo', saldo: 0, activa: true }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/');
    await page.waitForSelector('#saldo-total', { timeout: 10_000 });
    await expect(page.locator('#saldo-total')).toHaveText('$0');
  });

  test('sin cuentas registradas muestra la guía de primeros pasos hacia Tesorería', async ({ page }) => {
    // Estado vacío: la guía es visible y la descripción técnica se oculta.
    await expect(page.locator('#hero-guia-saldo')).toBeVisible();
    await expect(page.locator('#saldo-desc')).toBeHidden();

    // El botón de la guía lleva directo a Tesorería.
    await page.click('#hero-guia-saldo a[href="#tesoreria"]');
    await expect(page.locator('#sec-tesoreria.active')).toBeVisible();
  });

  test('con una cuenta registrada oculta la guía y muestra el saldo', async ({ page }) => {
    // El beforeEach siembra estado vacío vía addInitScript. Como addInitScript
    // se acumula y corre en CADA navegación, agregamos otro que inyecta una
    // cuenta (corre después del seed base) y recién ahí navegamos.
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.cuentas = [{ id: 'c1', nombre: 'Efectivo', tipo: 'efectivo', saldo: 500000, activa: true }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/');
    await page.waitForSelector('#saldo-total', { timeout: 10_000 });

    await expect(page.locator('#hero-guia-saldo')).toBeHidden();
    await expect(page.locator('#saldo-desc')).toBeVisible();
    await expect(page.locator('#saldo-total')).toHaveText('$500.000');
  });
});

// ── SUITE 1b: Ocultar/mostrar el dinero disponible (IN.2) ───────────────────
// Suite propia sin el beforeEach de Dashboard: el seed debe ser CONDICIONAL
// (solo si localStorage está vacío) porque los addInitScript corren de nuevo
// en cada navegación y un seed incondicional pisaría la preferencia
// `config.ocultarSaldo` que la app guarda a mitad del test, justo lo que el
// reload quiere verificar.

test.describe('Ocultar/mostrar el dinero disponible (IN.2)', () => {
  test('el ojo oculta el saldo, persiste tras recargar y lo vuelve a mostrar', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('fk_v1')) return;
      const estado = {
        version: 1,
        perfil: { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas: [{ id: 'c1', nombre: 'Efectivo', tipo: 'efectivo', saldo: 500000, activa: true }],
        ingresos: [],
        gastos: [],
        compromisos: [],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    // Estado inicial: monto visible, ojo sin presionar.
    await expect(page.locator('#saldo-total')).toHaveText('$500.000');
    await expect(page.locator('#saldo-ojo')).toHaveAttribute('aria-pressed', 'false');

    // Click en el ojo: el monto se enmascara.
    await page.click('#saldo-ojo');
    await expect(page.locator('#saldo-total')).toHaveText('$••••••');
    await expect(page.locator('#saldo-ojo')).toHaveAttribute('aria-pressed', 'true');

    // Persistencia entre sesiones: esperar el debounce de save() (200ms)
    // y recargar; la app debe arrancar con el saldo ya enmascarado.
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await expect(page.locator('#saldo-total')).toHaveText('$••••••');
    await expect(page.locator('#saldo-ojo')).toHaveAttribute('aria-pressed', 'true');

    // Segundo click: el monto vuelve.
    await page.click('#saldo-ojo');
    await expect(page.locator('#saldo-total')).toHaveText('$500.000');
    await expect(page.locator('#saldo-ojo')).toHaveAttribute('aria-pressed', 'false');
  });

  test('la posición del ojo no cambia al alternar la máscara (IN.8b, ADR 034 D3)', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('fk_v1')) return;
      const estado = {
        version: 1,
        perfil: { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas: [{ id: 'c1', nombre: 'Efectivo', tipo: 'efectivo', saldo: 2485000, activa: true }],
        ingresos: [],
        gastos: [],
        compromisos: [],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await expect(page.locator('#saldo-total')).toHaveText('$2.485.000');

    // El hover de .bento__cell aplica un lift de -2px por diseño: se mide en
    // reposo, con el mouse fuera de la card, en los tres estados.
    const enReposo = async () => {
      await page.mouse.move(5, 700);
      await page.waitForTimeout(250);
      return page.locator('#saldo-ojo').boundingBox();
    };

    const antes = await enReposo();
    await page.click('#saldo-ojo');
    await expect(page.locator('#saldo-total')).toHaveText('$••••••');
    const oculto = await enReposo();
    await page.click('#saldo-ojo');
    await expect(page.locator('#saldo-total')).toHaveText('$2.485.000');
    const despues = await enReposo();

    // Antes de IN.8b el ojo vivía en flujo junto al monto y se desplazaba
    // porque la máscara tiene otro ancho; ahora es absoluto al hero.
    expect(oculto.x).toBe(antes.x);
    expect(oculto.y).toBe(antes.y);
    expect(despues.x).toBe(antes.x);
    expect(despues.y).toBe(antes.y);
  });

  test('el detalle por cuenta expande, respeta la máscara y no persiste (IN.8c, ADR 034 D4)', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('fk_v1')) return;
      const estado = {
        version: 1,
        perfil: { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas: [
          { id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 1450000, activa: true },
          { id: 'c2', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 350000, activa: true },
        ],
        ingresos: [],
        gastos: [],
        compromisos: [],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    // Colapsado por defecto: conteo real visible, sin filas.
    await expect(page.locator('#saldo-detalle')).toBeHidden();
    await expect(page.locator('#saldo-desc')).toHaveText('efectivo + 1 cuenta bancaria');

    // Expandir: una fila por cuenta con su saldo; el conteo se oculta.
    await page.click('#saldo-detalle-toggle');
    await expect(page.locator('#saldo-detalle .hero-inicio__cuenta')).toHaveCount(2);
    await expect(page.locator('#saldo-detalle')).toContainText('Bancolombia');
    await expect(page.locator('#saldo-detalle')).toContainText('$1.450.000');
    await expect(page.locator('#saldo-desc')).toBeHidden();

    // El ojo enmascara total Y detalle juntos (extensión IN.2).
    await page.click('#saldo-ojo');
    await expect(page.locator('#saldo-total')).toHaveText('$••••••');
    await expect(page.locator('#saldo-detalle')).not.toContainText('1.450.000');
    await page.click('#saldo-ojo');
    await expect(page.locator('#saldo-detalle')).toContainText('$1.450.000');

    // Estado solo de UI: tras recargar vuelve colapsado (no se persiste).
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await expect(page.locator('#saldo-detalle')).toBeHidden();
    await expect(page.locator('#saldo-detalle-toggle')).toHaveAttribute('aria-expanded', 'false');
  });

  test('Pendientes del mes sin línea roja, badge corto y "Gestionar" al calendario (IN.8e, ADR 034 D5)', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('fk_v1')) return;
      const hoy = new Date();
      const dia = hoy.getDate();
      const diaPasado = ((dia - 2 + 28 - 1) % 28) + 1;
      const estado = {
        version: 1,
        perfil: { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas: [],
        ingresos: [],
        gastos: [],
        compromisos: [
          { id: 'v1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad', cuotaMensual: 180000, diaPago: diaPasado, activo: true, frecuencia: 'Mensual' },
          { id: 'v2', descripcion: 'Netflix', tipo: 'fijo', monto: 44900, diaPago: dia, activo: true, frecuencia: 'Mensual' },
        ],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    const panel = page.locator('#panel-vencidos');
    await expect(panel).toBeVisible();

    // Sin línea roja de alarma en toda la tarjeta (ADR 019: gastar no es incumplir).
    await expect(panel.locator('.vencidos-card')).toHaveCSS('border-left-width', '1px');

    // Título sin conteo embebido; el número vive en el badge circular.
    await expect(panel.locator('.vencidos-card__title')).toHaveText('Pendientes del mes 2');
    await expect(panel.locator('.vencidos-card__counter')).toHaveText('2');

    // Ítem vencido: badge corto "Deuda" + estado en color danger, sin borde propio.
    const item1 = panel.locator('.vencidos-card__item').first();
    await expect(item1).toContainText('Deuda');
    await expect(item1.locator('.vencidos-card__estado')).toHaveText('Venció hace 2 días');
    await expect(item1.locator('.vencidos-card__estado')).toHaveClass(/--danger/);

    // Ítem que vence hoy: badge corto "Gasto fijo" + estado en color warning.
    const item2 = panel.locator('.vencidos-card__item').nth(1);
    await expect(item2).toContainText('Gasto fijo');
    await expect(item2.locator('.vencidos-card__estado')).toHaveText('Vence hoy');
    await expect(item2.locator('.vencidos-card__estado')).toHaveClass(/--warning/);

    // "Gestionar" lleva al Calendario, no a la lista de compromisos.
    const gestionar = panel.locator('.vencidos-card__link');
    await expect(gestionar).toHaveAttribute('href', '#agenda');
    await gestionar.click();
    await expect(page.locator('#sec-agenda.active')).toBeVisible();
  });

  test('Resumen de la semana visual: monto, chip, barras y categoría top (IN.8f, ADR 034 D6)', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('fk_v1')) return;
      const hoy = new Date();
      const iso = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };
      const haceNDias = (n) => {
        const d = new Date(hoy);
        d.setDate(d.getDate() - n);
        return iso(d);
      };
      const estado = {
        version: 1,
        perfil: { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas: [],
        ingresos: [],
        gastos: [
          { id: 'g1', descripcion: 'Mercado semanal', categoria: 'Mercado', monto: 180000, fecha: iso(hoy), cuentaId: null, nota: '' },
          { id: 'g2', descripcion: 'Bus', categoria: 'Transporte', monto: 20000, fecha: haceNDias(3), cuentaId: null, nota: '' },
        ],
        compromisos: [],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    const panel = page.locator('#panel-resumen');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.resumen-semana__label')).toHaveText('Gastaste esta semana');
    await expect(panel.locator('.resumen-semana__monto')).toHaveText('$200.000');
    // Sin semana previa con datos: el chip no alarma con rojo (ADR 019).
    await expect(panel.locator('.resumen-semana__chip')).toContainText('Sin semana previa para comparar');
    await expect(panel.locator('.resumen-semana__chip')).toHaveClass(/--neutro/);

    await expect(panel.locator('.resumen-semana__barra')).toHaveCount(7);
    await expect(panel.locator('.resumen-semana__barra-fill--pico')).toHaveCount(1);

    await expect(panel.locator('.resumen-semana__top-titulo')).toHaveText('Mercado fue tu categoría top');
    await expect(panel.locator('.resumen-semana__top-sub')).toContainText('2 de 7 días activos');
    await expect(panel.locator('.resumen-semana__top-monto')).toHaveText('$180.000');
  });

  test('Accesos rápidos + Actividad reciente fusionados en un solo bloque (IN.8g, ADR 034 D7)', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('fk_v1')) return;
      const hoy = new Date();
      const iso = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };
      const estado = {
        version: 1,
        perfil: { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas: [],
        ingresos: [],
        gastos: [
          { id: 'g1', descripcion: 'Mercado semanal', categoria: 'Mercado', monto: 50000, fecha: iso(hoy), cuentaId: null, nota: '' },
        ],
        compromisos: [],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    // Un solo contenedor visual: ambas secciones son hijas directas del
    // mismo .accesos-actividad, no dos bento__cell separados.
    const contenedor = page.locator('.accesos-actividad');
    await expect(contenedor).toBeVisible();
    await expect(contenedor.locator('.accesos-actividad__label').first()).toHaveText('Accesos rápidos');
    await expect(contenedor.locator('[data-action="accesos-personalizar"]')).toBeVisible();
    await expect(page.locator('#accesos-inicio-grid .menu-mas__item').first()).toBeVisible();

    const actividad = page.locator('#panel-actividad-reciente');
    await expect(actividad).toBeVisible();
    await expect(actividad.locator('.accesos-actividad__label')).toHaveText('Actividad reciente');
    await expect(actividad.locator('.actividad-reciente__ver-todo')).toHaveAttribute('href', '#movimientos');
    await expect(actividad).toContainText('Mercado semanal');

    // El separador vive en la sección de actividad, no en toda la tarjeta.
    await expect(actividad).toHaveClass(/accesos-actividad__seccion--actividad/);
  });
});

// ── SUITE 1c: Metas - categorías con emoji (MT.1 + MT.3) ─────────────────────

test.describe('Metas - categorías con emoji (MT.1)', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await page.click('a[href="#metas"]');
    await expect(page.locator('#sec-metas.active')).toBeVisible();
  });

  test('crear una meta con categoría "Boda" muestra el anillo del sprite junto al nombre (ID.3)', async ({ page }) => {
    await page.click('[data-action="nueva-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');

    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Fiesta de matrimonio');
    await form.locator('#meta-objetivo').fill('5000000');
    await form.locator('#meta-categoria').selectOption('Boda');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    const titulo = page.locator('#lista-metas .list-item__title');
    await expect(titulo.locator('use[href="#c-anillo"]')).toHaveCount(1);
    await expect(titulo).toContainText('Fiesta de matrimonio');
  });

  test('MT.3: el campo de emoji está oculto salvo con categoría "Otra"', async ({ page }) => {
    await page.click('[data-action="nueva-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');

    const form = page.locator('#modal-meta-body form');
    await expect(form.locator('#form-group-meta-icono')).toBeHidden();

    // Cualquier categoría predefinida mantiene el emoji oculto: ya trae el suyo.
    await form.locator('#meta-categoria').selectOption('Viajes');
    await expect(form.locator('#form-group-meta-icono')).toBeHidden();

    // Solo "Otra" habilita elegir el emoji a mano.
    await form.locator('#meta-categoria').selectOption('Otra');
    await expect(form.locator('#form-group-meta-icono')).toBeVisible();
  });

  test('CAT.2b: con categoría "Otra" el ícono elegido en el picker queda en la lista', async ({ page }) => {
    await page.click('[data-action="nueva-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');

    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Estudio de grabación');
    await form.locator('#meta-objetivo').fill('3000000');
    await form.locator('#meta-categoria').selectOption('Otra');
    // El selector compacto (CAT.2b) reemplazó al input de emoji libre: tocar
    // el recuadro despliega la grilla, elegir un ícono la cierra.
    await form.locator('[data-icono-picker="meta-icono"] .icono-picker__recuadro').click();
    await form.locator('[data-icono-picker="meta-icono"] [data-icon="c-torta"]').click();
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    const titulo = page.locator('#lista-metas .list-item__title');
    await expect(titulo.locator('use[href="#c-torta"]')).toHaveCount(1);
  });

  test('CAT.2b: volver de "Otra" a otra categoría limpia el ícono elegido a mano', async ({ page }) => {
    await page.click('[data-action="nueva-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');

    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Reforma de la casa');
    await form.locator('#meta-objetivo').fill('4000000');

    // El usuario prueba "Otra" y elige un ícono, pero se arrepiente y vuelve
    // a una categoría predefinida antes de guardar.
    await form.locator('#meta-categoria').selectOption('Otra');
    await form.locator('[data-icono-picker="meta-icono"] .icono-picker__recuadro').click();
    await form.locator('[data-icono-picker="meta-icono"] [data-icon="c-torta"]').click();
    await form.locator('#meta-categoria').selectOption('Vivienda');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    // El ícono mostrado es la casa de Vivienda (sprite), no el elegido con "Otra".
    const titulo = page.locator('#lista-metas .list-item__title');
    await expect(titulo.locator('use[href="#i-home"]')).toHaveCount(1);
    await expect(titulo.locator('use[href="#c-torta"]')).toHaveCount(0);
  });
});

// ── SUITE 1d: Metas - abono con selector de cuenta compartido (MT.5) ─────────
// Antes el abono usaba un <select> propio y descontaba solo si el usuario
// elegía cuenta manualmente. MT.5 lo unifica con el selector de tarjetas de
// Apartados (AP.1): preselecciona la cuenta de mayor saldo y, si no alcanza,
// confirma el sobregiro (0/1 cuenta) o reparte (varias). Se verifica el
// descuento real de saldo en Tesorería, igual que la suite Gastos-Cuenta.

test.describe('Metas - abono con selector de cuenta compartido (MT.5)', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
  });

  /** Crea una meta simple (sin categoría) y devuelve al llamador para encadenar. */
  async function crearMetaSimple(page, nombre, montoObjetivo) {
    await page.goto('/#metas');
    await expect(page.locator('#sec-metas.active')).toBeVisible();
    await page.click('[data-action="nueva-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');
    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill(nombre);
    await form.locator('#meta-objetivo').fill(String(montoObjetivo));
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });
  }

  test('con una cuenta, el abono preselecciona su tarjeta y descuenta el saldo', async ({ page }) => {
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await crearCuentaEfectivo(page, 1_000_000);

    await crearMetaSimple(page, 'Laptop nueva', 3_000_000);

    await page.click('[data-action="abonar-meta"]');
    await page.waitForSelector('#modal-abono-meta[data-open]');

    // El selector compartido preselecciona la única cuenta activa.
    await expect(page.locator('#modal-abono-meta-body .cuenta-sel__radio')).toBeChecked();

    await page.locator('#abono-meta-monto').fill('200000');
    await page.locator('#form-abono-meta button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-abono-meta'), { timeout: 5_000 });

    // Progreso de la meta actualizado en la lista.
    await expect(page.locator('#lista-metas')).toContainText('$200.000 / $3.000.000');

    // Saldo de la cuenta descontado (1.000.000 - 200.000).
    await page.goto('/#tesoreria');
    await expect(page.locator('#lista-tesoreria')).toContainText('$800.000', { timeout: 3_000 });
  });

  test('un abono que no alcanza pide confirmar el sobregiro', async ({ page }) => {
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await crearCuentaEfectivo(page, 50_000);

    await crearMetaSimple(page, 'Viaje sorpresa', 1_000_000);

    await page.click('[data-action="abonar-meta"]');
    await page.waitForSelector('#modal-abono-meta[data-open]');

    await page.locator('#abono-meta-monto').fill('200000');
    await page.locator('#form-abono-meta button[type="submit"]').click();

    // Con una sola cuenta y sin alcanzar, se pide confirmar el sobregiro.
    await expect(page.locator('.modal--confirm .modal__title')).toHaveText('Registrar abono');
    await expect(page.locator('.confirm__mensaje')).toContainText('quedará en negativo');

    await page.click('.modal--confirm [data-role="confirmar"]');
    await page.waitForSelector(modalCerrado('modal-abono-meta'), { timeout: 5_000 });

    // Saldo queda en negativo (50.000 - 200.000 = -150.000).
    await page.goto('/#tesoreria');
    await expect(page.locator('#lista-tesoreria')).toContainText('-$150.000', { timeout: 3_000 });
  });
});

// ── SUITE 1e: Metas - ritmo de ahorro según frecuencia (MT.4) ────────────────
// Antes la lista siempre mostraba "$X/día". Ahora reparte el faltante entre
// los periodos de la frecuencia con la que el usuario cobra (S.ingresos).

test.describe('Metas - ritmo de ahorro según frecuencia (MT.4)', () => {
  test('con un ingreso Quincenal, la meta muestra el monto "por quincena", no "por día"', async ({ page }) => {
    await page.addInitScript(() => {
      const estado = {
        version: 1,
        perfil: { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas: [],
        ingresos: [{
          id: 'i1', descripcion: 'Nómina', monto: 1500000,
          frecuencia: 'Quincenal', activo: true, fechaCreacion: '2026-01-01',
        }],
        gastos: [],
        compromisos: [],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });
    await page.goto('/#metas');
    await expect(page.locator('#sec-metas.active')).toBeVisible();

    const futura = new Date();
    futura.setDate(futura.getDate() + 90);
    const anio = futura.getFullYear();
    const mes  = String(futura.getMonth() + 1).padStart(2, '0');
    const dia  = String(futura.getDate()).padStart(2, '0');

    await page.click('[data-action="nueva-meta"]');
    await page.waitForSelector('#modal-meta[data-open]');
    const form = page.locator('#modal-meta-body form');
    await form.locator('#meta-nombre').fill('Estudio de idiomas');
    await form.locator('#meta-objetivo').fill('600000');
    await form.locator('#meta-fecha').fill(`${anio}-${mes}-${dia}`);
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-meta'), { timeout: 5_000 });

    const subtitulo = page.locator('#lista-metas .list-item__subtitle');
    await expect(subtitulo).toContainText('por quincena');
    await expect(subtitulo).not.toContainText('/día');
  });
});

// ── SUITE 2: Onboarding ─────────────────────────────────────────────────────
// Modo serial: el SW compartido entre workers paralelos puede interferir con
// los tests de onboarding (que dependen de localStorage vacío). Serial garantiza
// ejecución secuencial dentro de esta suite sin afectar el resto.

test.describe.serial('Onboarding', () => {
  test('aparece el wizard en la primera visita (localStorage vacío)', async ({ page }) => {
    await page.goto('/');
    // Esperar el modal abierto (data-open="" y sin aria-hidden)
    await expect(page.locator('#onboarding[data-open]')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('se puede completar el wizard y no reaparece tras recarga', async ({ page }) => {
    // Cada test tiene su propio contexto de browser (localStorage limpio por defecto).
    // Solo navegamos directo; si hay contaminación por workers del SW, el retry
    // configurado en playwright.config.js lo resuelve.
    await page.goto('/');

    // Llenar nombre y enviar
    await page.locator('#onboarding input[name="nombre"]').fill('María Camila');
    await page.locator('#onboarding button[type="submit"]').click();

    // Wizard debe cerrarse
    await expect(page.locator(modalCerrado('onboarding'))).toBeAttached({
      timeout: 3_000,
    });

    // Esperar que el debounce de save() (200ms) complete antes de recargar.
    await page.waitForTimeout(400);

    // Recargar - el wizard no debe volver a aparecer
    await page.reload();
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
    await expect(page.locator('#onboarding[data-open]')).toHaveCount(0);
  });
});

// ── SUITE 3: Navegación ─────────────────────────────────────────────────────

test.describe('Navegación hash', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
  });

  const secciones = [
    { href: '#gast',        seccion: 'sec-gast' },
    { href: '#compromisos',  seccion: 'sec-compromisos' },
    { href: '#agenda',      seccion: 'sec-agenda' },
    { href: '#tesoreria',   seccion: 'sec-tesoreria' },
    { href: '#metas',       seccion: 'sec-metas' },
    { href: '#analisis',    seccion: 'sec-analisis' },
    { href: '#config',      seccion: 'sec-config' },
    { href: '#dash',        seccion: 'sec-dash' },
  ];

  for (const { href, seccion } of secciones) {
    test(`navega a ${href} y activa #${seccion}`, async ({ page }) => {
      await page.click(`.nav-item[href="${href}"]`);
      await expect(page.locator(`#${seccion}`)).toHaveClass(/active/);
    });
  }
});

// ── SUITE 5: Gastos ─────────────────────────────────────────────────────────

test.describe('Gastos - CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });
  });

  test('registrar gasto y verifica en lista', async ({ page }) => {
    // Precondición: crear una cuenta (cuentaId es obligatorio en gastos)
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await crearCuentaEfectivo(page, 500000);
    await expect(page.locator('#lista-tesoreria')).toContainText('Efectivo', { timeout: 3_000 });

    // Ir a Gastos
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');

    const form = page.locator('#modal-gasto-body form');
    // TX.9a: categoría es el primer campo y ya no se pide descripción; el
    // título de la lista pasa a mostrar la categoría elegida (Mercado, la
    // primera opción real del select).
    await form.locator('select[name="categoria"]').selectOption({ index: 1 });
    await form.locator('[name="monto"]').fill('150000');
    // Con una sola cuenta activa la cuenta se asume (hidden, sin selector).
    // Fecha (pre-rellenada por hoy() en el index.js; rellenar por si acaso)
    const hoy = hoyLocal();
    await form.locator('[name="fecha"]').fill(hoy);
    await form.locator('button[type="submit"]').click();

    await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({
      timeout: 3_000,
    });
    await expect(page.locator('#lista-gastos')).toContainText(
      'Mercado',
      { timeout: 3_000 }
    );
  });

  test('GAS.1a: el hero del mes muestra el total protagonista y el ojo lo enmascara', async ({ page }) => {
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await crearCuentaEfectivo(page, 500000);
    await expect(page.locator('#lista-tesoreria')).toContainText('Efectivo', { timeout: 3_000 });

    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    // Registrar un gasto de $150.000 (categoría = primera opción real).
    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');
    const form = page.locator('#modal-gasto-body form');
    await form.locator('select[name="categoria"]').selectOption({ index: 1 });
    await form.locator('[name="monto"]').fill('150000');
    await form.locator('[name="fecha"]').fill(hoyLocal());
    await form.locator('button[type="submit"]').click();
    await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({ timeout: 3_000 });

    // El hero (ADR 039 D1) muestra el total protagonista, su label y la
    // navegación de mes integrada.
    const hero = page.locator('.hero-gastos');
    await expect(hero.locator('.hero-gastos__label')).toHaveText('Gastaste este mes', { timeout: 3_000 });
    await expect(hero.locator('.hero-gastos__valor')).toHaveText('$150.000');
    await expect(hero.locator('[data-action="gastos-prev-mes"]')).toBeVisible();

    // El ojo enmascara y desenmascara el total (flag único IN.2, D9).
    await page.click('[data-action="gastos-saldo-visibilidad"]');
    await expect(hero.locator('.hero-gastos__valor')).toHaveText('$••••••');
    await page.click('[data-action="gastos-saldo-visibilidad"]');
    await expect(hero.locator('.hero-gastos__valor')).toHaveText('$150.000');
  });

  test('GAS.1b: la lista agrupa por día bajo "Hoy" con total, y el ojo enmascara los montos', async ({ page }) => {
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await crearCuentaEfectivo(page, 500000);
    await expect(page.locator('#lista-tesoreria')).toContainText('Efectivo', { timeout: 3_000 });

    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    // Dos gastos de hoy → un solo grupo "Hoy" con el total del día.
    for (const monto of ['85000', '32000']) {
      await page.click('[data-action="nuevo-gasto"]');
      await page.waitForSelector('#modal-gasto[data-open]');
      const form = page.locator('#modal-gasto-body form');
      await form.locator('select[name="categoria"]').selectOption({ index: 1 });
      await form.locator('[name="monto"]').fill(monto);
      await form.locator('[name="fecha"]').fill(hoyLocal());
      await form.locator('button[type="submit"]').click();
      await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({ timeout: 3_000 });
    }

    const grupo = page.locator('#lista-gastos .gastos-dia').first();
    await expect(grupo.locator('.gastos-dia__label')).toHaveText('Hoy', { timeout: 3_000 });
    await expect(grupo.locator('.gastos-dia__total')).toHaveText('$117.000');
    await expect(grupo.locator('.list-item')).toHaveCount(2);

    // El ojo enmascara el total del día y los montos de los ítems (D9).
    await page.click('[data-action="gastos-saldo-visibilidad"]');
    await expect(grupo.locator('.gastos-dia__total')).toHaveText('••••');
    await expect(grupo.locator('.list-item__amount').first()).toHaveText('••••');
  });

  test('GAS.1c: el insight de gastos hormiga aparece en la vista "Todos" y se oculta al filtrar', async ({ page }) => {
    // Sembrar 6 domicilios pequeños de hoy (≤ $20.000 c/u, suman $108.000):
    // exactamente el patrón que detectarHormigas() reporta. Vía initScript
    // (se registra DESPUÉS del de saltearOnboarding, así que gana al re-boot)
    // + reload (un goto a la misma URL con hash es navegación same-document:
    // no re-ejecuta init scripts ni re-arranca la app).
    await page.addInitScript(() => {
      const d = new Date();
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const estado = {
        version: 1,
        perfil: { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas: [],
        ingresos: [],
        gastos: Array.from({ length: 6 }, (_, i) => ({
          id: `h${i}`, categoria: 'Domicilios', monto: 18000, fecha: iso, cuentaId: null, nota: '',
        })),
        compromisos: [],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });
    await page.reload();
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    const insight = page.locator('#lista-gastos .gastos-insight');
    await expect(insight).toBeVisible();
    await expect(insight.locator('.gastos-insight__title')).toHaveText('Gastos hormiga: Domicilios');
    await expect(insight.locator('.gastos-insight__desc')).toContainText('6 gastos pequeños suman');
    await expect(insight.locator('.gastos-insight__desc')).toContainText('$108.000');

    // Con un filtro de categoría activo el insight se oculta (solo "Todos").
    await page.click('.filtros-bar [data-cat="Domicilios"]');
    await expect(page.locator('#lista-gastos .gastos-insight')).toHaveCount(0);
    await expect(page.locator('#lista-gastos .list-item')).toHaveCount(6);
  });

  test('TX.9b: crear categoría personalizada, verla en la lista y reusarla en un segundo gasto', async ({ page }) => {
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await crearCuentaEfectivo(page, 500000);
    await expect(page.locator('#lista-tesoreria')).toContainText('Efectivo', { timeout: 3_000 });

    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });
    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');

    const form = page.locator('#modal-gasto-body form');
    await form.locator('select[name="categoria"]').selectOption('__nueva__');
    await expect(page.locator('#categoria-nueva-fields')).toBeVisible();

    await form.locator('#categoria-nueva-nombre').fill('Gimnasio');
    // CAT.2: el selector de ícono nace como recuadro colapsado; hay que
    // tocarlo primero para desplegar la grilla antes de elegir un ícono.
    // Acotado a `form`: con CAT.2b (Metas) el picker vive en más de un
    // formulario inyectado en la página a la vez (aunque el otro modal esté
    // cerrado), así que un locator global sería ambiguo.
    await form.locator('.icono-picker__recuadro').click();
    await form.locator('.icono-picker__btn[data-icon="c-pesa"]').click();
    // Elegir un ícono colapsa el panel de nuevo (el recuadro ya muestra el elegido).
    await expect(form.locator('.icono-picker__panel')).toBeHidden();

    await form.locator('[name="monto"]').fill('80000');
    const hoy = hoyLocal();
    await form.locator('[name="fecha"]').fill(hoy);
    await form.locator('button[type="submit"]').click();

    await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({ timeout: 3_000 });
    await expect(page.locator('#lista-gastos .list-item__title')).toHaveText('Gimnasio', { timeout: 3_000 });

    // Registrar un segundo gasto: "Gimnasio" ya aparece como opción normal del
    // select (se comporta igual que una categoría nativa, sin duplicar el flujo).
    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');
    const form2 = page.locator('#modal-gasto-body form');
    await expect(form2.locator('select[name="categoria"] option', { hasText: 'Gimnasio' })).toHaveCount(1);
    await form2.locator('select[name="categoria"]').selectOption('Gimnasio');
    await expect(page.locator('#categoria-nueva-fields')).toBeHidden();
    await form2.locator('[name="monto"]').fill('30000');
    await form2.locator('[name="fecha"]').fill(hoy);
    await form2.locator('button[type="submit"]').click();

    await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({ timeout: 3_000 });
    const items = page.locator('#lista-gastos .list-item__title', { hasText: 'Gimnasio' });
    await expect(items).toHaveCount(2);
  });
});

// ── SUITE 6: Tesorería ──────────────────────────────────────────────────────

test.describe('Tesorería - cuenta y saldo', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
  });

  test('agregar cuenta actualiza saldo en dashboard', async ({ page }) => {
    await crearCuentaEfectivo(page, 850000);

    // Cuenta aparece en la lista con nombre auto-generado "Efectivo"
    await expect(page.locator('#lista-tesoreria')).toContainText(
      'Efectivo',
      { timeout: 3_000 }
    );

    // Ir al dashboard - saldo debe actualizar
    await page.click('a[href="#dash"]');
    await expect(page.locator('#saldo-total')).toHaveText('$850.000', {
      timeout: 3_000,
    });
  });

  test('MC.18a: el hero muestra el total en cuentas y el ojo lo enmascara', async ({ page }) => {
    // Sin cuentas: hero en estado vacío, sin ojo.
    await expect(page.locator('#tesoreria-hero')).toContainText('Aún no tienes cuentas');
    await expect(page.locator('#tesoreria-saldo-ojo')).toHaveCount(0);

    await crearCuentaEfectivo(page, 1000000);

    // Con cuenta: label, total y resumen de composición.
    const hero = page.locator('#tesoreria-hero');
    await expect(hero).toContainText('Tu dinero en cuentas', { timeout: 3_000 });
    await expect(hero.locator('.hero-tesoreria__valor')).toHaveText('$1.000.000');
    await expect(hero).toContainText('1 cuenta · efectivo');
    await expect(hero.locator('.hero-tesoreria__compo-seg')).toHaveCount(1);

    // El ojo enmascara el total y queda presionado; el monto real no viaja al DOM.
    await page.click('#tesoreria-saldo-ojo');
    await expect(hero.locator('.hero-tesoreria__valor')).toHaveText('$••••••');
    await expect(page.locator('#tesoreria-saldo-ojo')).toHaveAttribute('aria-pressed', 'true');

    // Es el mismo flag de Inicio (IN.2): el saldo del dashboard también queda oculto.
    await page.click('a[href="#dash"]');
    await expect(page.locator('#saldo-total')).toHaveText('$••••••', { timeout: 3_000 });

    // Volver y destapar: el total regresa.
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('#tesoreria-saldo-ojo');
    await expect(hero.locator('.hero-tesoreria__valor')).toHaveText('$1.000.000');
  });

  test('MC.18b: la tarjeta de cuenta muestra nombre, tipo, saldo, chips y se enmascara con el ojo', async ({ page }) => {
    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');
    const form = page.locator('#modal-cuenta-body form');

    await form.locator('.bank-picker__trigger').click();
    await page.waitForSelector('#banco-list:not([hidden])', { timeout: 5_000 });
    await page.locator('#banco-list .bank-picker__item[data-value="Bancolombia"]').click();
    await form.locator('#cuenta-tipo').selectOption('Ahorros');
    await form.locator('#cuenta-saldo').fill('1450000');
    await form.locator('#cuenta-4x1000').check();
    await form.locator('#cuenta-cuota-toggle').check();
    await form.locator('#cuenta-cuota-monto').fill('15000');
    await form.locator('#cuenta-cuota-dia').fill('15');
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-cuenta'), { timeout: 5_000 });

    const card = page.locator('.cuenta-card').first();
    await expect(card.locator('.cuenta-card__nombre')).toHaveText('Bancolombia');
    await expect(card.locator('.cuenta-card__tipo')).toHaveText('Ahorros');
    await expect(card.locator('.cuenta-card__saldo')).toHaveText('$1.450.000');
    await expect(card).toContainText('Cuota $15.000 · día 15');
    await expect(card).toContainText('4x1000');
    await expect(card.locator('[data-action="editar-cuenta"]')).toBeVisible();
    await expect(card.locator('[data-action="eliminar-cuenta"]')).toBeVisible();

    // El ojo del hero también enmascara el saldo de la tarjeta.
    await page.click('#tesoreria-saldo-ojo');
    await expect(card.locator('.cuenta-card__saldo')).toHaveText('••••');
    await expect(card).not.toContainText('1.450.000');
  });

  test('MC.18c: la tarjeta insight del GMF aparece bajo las cuentas cuando hay costo este mes', async ({ page }) => {
    // Sin gastos aún: el contenedor de GMF no pinta nada.
    await expect(page.locator('#tesoreria-gmf')).toBeEmpty();

    // Cuenta con 4x1000 activo.
    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');
    const form = page.locator('#modal-cuenta-body form');
    await form.locator('.bank-picker__trigger').click();
    await page.waitForSelector('#banco-list:not([hidden])', { timeout: 5_000 });
    await page.locator('#banco-list .bank-picker__item[data-value="Bancolombia"]').click();
    await form.locator('#cuenta-tipo').selectOption('Ahorros');
    await form.locator('#cuenta-saldo').fill('1000000');
    await form.locator('#cuenta-4x1000').check();
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-cuenta'), { timeout: 5_000 });

    // Sin gastos aún, la tarjeta insight sigue vacía.
    await expect(page.locator('#tesoreria-gmf')).toBeEmpty();

    // Un gasto este mes desde esa cuenta genera el costo del gravamen.
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });
    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');
    const formGasto = page.locator('#modal-gasto-body form');
    await formGasto.locator('select[name="categoria"]').selectOption({ index: 1 });
    await formGasto.locator('[name="monto"]').fill('500000');
    await formGasto.locator('[name="fecha"]').fill(hoyLocal());
    await formGasto.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-gasto'), { timeout: 3_000 });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    const insight = page.locator('.gmf-insight');
    await expect(insight).toContainText('4x1000 estimado este mes: $2.000');
    await expect(insight).toContainText('1 cuenta');
  });

  test('MC.18d: fuentes de ingreso fijas y puntuales agrupadas bajo un solo encabezado', async ({ page }) => {
    await crearCuentaEfectivo(page, 500000);

    // Un solo encabezado con las dos acciones.
    const subHeader = page.locator('.section__sub-header', { hasText: 'Fuentes de ingreso' });
    await expect(subHeader).toBeVisible();
    await expect(subHeader.locator('[data-action="nuevo-ingreso"]')).toBeVisible();
    await expect(subHeader.locator('[data-action="nuevo-ingreso-puntual"]')).toBeVisible();

    // Crear un ingreso fijo.
    await subHeader.locator('[data-action="nuevo-ingreso"]').click();
    await page.waitForSelector('#modal-ingreso[data-open]');
    const formFijo = page.locator('#modal-ingreso-body form');
    await formFijo.locator('#ingreso-cat').selectOption({ index: 1 });
    await formFijo.locator('#ingreso-desc').fill('Salario empresa');
    await formFijo.locator('#ingreso-monto').fill('1850000');
    await formFijo.locator('#ingreso-frec').selectOption('Mensual');
    await formFijo.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-ingreso'), { timeout: 5_000 });
    await expect(page.locator('#lista-ingresos')).toContainText('Salario empresa');

    // Crear un ingreso puntual.
    await subHeader.locator('[data-action="nuevo-ingreso-puntual"]').click();
    await page.waitForSelector('#modal-ingreso-puntual[data-open]');
    const formPuntual = page.locator('#modal-ingreso-puntual-body form');
    await formPuntual.locator('#ingreso-p-monto').fill('450000');
    await formPuntual.locator('#ingreso-p-desc').fill('Venta de la bici');
    await formPuntual.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-ingreso-puntual'), { timeout: 5_000 });
    await expect(page.locator('#lista-ingresos-puntuales')).toContainText('Venta de la bici');

    // NAV.A2b s2: con un ingreso fijo ya registrado, el asistente existe y
    // el ingreso puntual ofrece distribuirlo. No es el foco de este test.
    const confirmDistribuir = page.locator('[role="dialog"][aria-labelledby="confirm-title"]');
    if (await confirmDistribuir.isVisible().catch(() => false)) {
      await confirmDistribuir.locator('[data-role="cancelar"]').click();
    }

    // Ambas listas viven una tras otra bajo el mismo encabezado, sin
    // sub-header propio entre ellas (solo el de "Fuentes de ingreso"; la
    // tarjeta "Distribuir mi ingreso" de MC.18e agrega un segundo sub-header
    // legítimo y distinto al final de la sección, fuera del alcance de este check).
    await expect(page.locator('.section__sub-header', { hasText: 'Fuentes de ingreso' })).toHaveCount(1);

    // El ojo del hero también enmascara los montos de ambas listas (D5).
    await expect(page.locator('#lista-ingresos .list-item__value')).toHaveText('$1.850.000');
    await expect(page.locator('#lista-ingresos-puntuales .list-item__value')).toHaveText('+$450.000');
    await page.click('#tesoreria-saldo-ojo');
    await expect(page.locator('#lista-ingresos .list-item__value')).toHaveText('••••');
    await expect(page.locator('#lista-ingresos-puntuales .list-item__value')).toHaveText('+••••');
  });

  test('MC.13d: el ingreso fijo registra en qué cuenta se recibe', async ({ page }) => {
    await crearCuentaEfectivo(page, 500000);

    // Con una sola cuenta activa no se pregunta (regla de cuenta única): el form
    // informa dónde cae el dinero y manda el id en un hidden.
    await page.locator('[data-action="nuevo-ingreso"]').first().click();
    await page.waitForSelector('#modal-ingreso[data-open]');
    const form = page.locator('#modal-ingreso-body form');
    await expect(form).toContainText('¿Dónde recibes este dinero?');
    await expect(form.locator('input[type="hidden"][name="cuentaId"]')).toHaveCount(1);

    await form.locator('#ingreso-desc').fill('Salario empresa');
    await form.locator('#ingreso-monto').fill('1850000');
    await form.locator('#ingreso-frec').selectOption('Mensual');
    await form.locator('button[type="submit"]').click();
    await page.waitForSelector(modalCerrado('modal-ingreso'), { timeout: 5_000 });

    // El recorrido completo: el id elegido llega hasta localStorage y apunta a
    // una cuenta real (es lo que el asistente leerá en MC.13e). Se consulta con
    // reintento porque `save()` es debounced 200ms (ADN #5): leer de una sola
    // vez justo tras cerrar el modal gana la carrera y ve el estado anterior.
    await expect.poll(async () => page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      const ing = (st.ingresos ?? []).find(i => i.descripcion === 'Salario empresa');
      if (!ing) return null;
      return {
        version:      st._version,
        cuentaExiste: (st.cuentas ?? []).some(c => c.id === ing.cuentaId),
      };
    }), { timeout: 5_000 }).toEqual({ version: 27, cuentaExiste: true });
  });
});

// ── SUITE 6b: Fondo inerte con modal abierto (A11Y.4) ───────────────────────
// Con un modal abierto, el fondo `.app-shell` debe quedar `inert` para que el
// lector de pantalla y el teclado no alcancen el contenido de atrás; al cerrar,
// el `inert` se libera. Se valida en navegador real (happy-dom no aplica inert).

test.describe('Accesibilidad - fondo inerte con modal', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
  });

  test('abrir un modal marca .app-shell inert y cerrarlo lo libera', async ({ page }) => {
    const shell = page.locator('.app-shell');

    // Estado inicial: fondo interactivo.
    await expect(shell).not.toHaveAttribute('inert', '');

    // Abrir el modal de nueva cuenta.
    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');
    await expect(shell).toHaveAttribute('inert', '');

    // Cerrar el modal libera el fondo.
    await page.click('#modal-cuenta [data-action="modal-close"]');
    await page.waitForSelector(modalCerrado('modal-cuenta'), { timeout: 5_000 });
    await expect(shell).not.toHaveAttribute('inert', '');
  });
});

// ── SUITE 7: Gastos-Cuenta (flujo integrado) ────────────────────────────────
// Smoke test del flujo crítico: crear cuenta → crear gasto (selector cuenta
// obligatorio) → verificar saldo decrementado → editar gasto (cambiar monto/cuenta)
// → verificar saldo recalculado → eliminar gasto → verificar saldo restaurado.

test.describe('Gastos-Cuenta (integrado)', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    // Estado inicial: sin cuentas, sin gastos (localStorage vacío excepto onboarded)
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
  });

  test('crear cuenta, gasto con selector, verificar saldo decrementado', async ({ page }) => {
    // 1. Crear una cuenta
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await crearCuentaEfectivo(page, 1000000);

    // Cuenta aparece en la lista con nombre auto-generado "Efectivo"
    await expect(page.locator('#lista-tesoreria')).toContainText(
      'Efectivo',
      { timeout: 3_000 }
    );

    // 2. Ir a Gastos y crear un gasto con selector de cuenta
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');

    const formGasto = page.locator('#modal-gasto-body form');
    await formGasto.locator('select[name="categoria"]').selectOption({ index: 1 });
    await formGasto.locator('[name="monto"]').fill('100000');

    // Con una sola cuenta activa la cuenta se asume (hidden, sin selector).

    const hoy = hoyLocal();
    await formGasto.locator('[name="fecha"]').fill(hoy);
    await formGasto.locator('button[type="submit"]').click();

    // Esperar cierre y que el gasto aparezca (título = categoría, TX.9a)
    await expect(page.locator('#lista-gastos')).toContainText(
      'Mercado',
      { timeout: 3_000 }
    );

    // 3. Ir a Tesorería y verificar que el saldo decrementó de 1000000 a 900000
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    // Buscar la cuenta en la lista - debe contener el nuevo saldo $900.000
    await expect(page.locator('#lista-tesoreria')).toContainText('$900.000', {
      timeout: 3_000,
    });

    // 4. Ir a Dashboard y verificar "Tu dinero disponible hoy" muestra $900.000
    await page.goto('/#dash');
    await page.waitForSelector('#saldo-total', { timeout: 10_000 });
    await expect(page.locator('#saldo-total')).toHaveText('$900.000', {
      timeout: 3_000,
    });
  });

  test('editar gasto: cambiar monto, verificar saldo recalculado', async ({ page }) => {
    // Precondición: crear cuenta y gasto (similar a test anterior)
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    // Crear cuenta
    await crearCuentaEfectivo(page, 500000);
    await expect(page.locator('#lista-tesoreria')).toContainText(
      'Efectivo',
      { timeout: 3_000 }
    );

    // Crear gasto
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });
    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');
    const formGasto = page.locator('#modal-gasto-body form');
    await formGasto.locator('select[name="categoria"]').selectOption({ index: 1 });
    await formGasto.locator('[name="monto"]').fill('100000');
    // Con una sola cuenta activa la cuenta se asume (hidden, sin selector).
    const hoy = hoyLocal();
    await formGasto.locator('[name="fecha"]').fill(hoy);
    await formGasto.locator('button[type="submit"]').click();
    await expect(page.locator('#lista-gastos')).toContainText(
      'Mercado',
      { timeout: 3_000 }
    );

    // Saldo debe estar en 400000 (500000 - 100000)
    await page.goto('/#tesoreria');
    await expect(page.locator('#lista-tesoreria')).toContainText(
      '$400.000',
      { timeout: 3_000 }
    );

    // EDITAR: cambiar monto de 100000 a 150000 (total descuento 150000, saldo debe ser 350000)
    await page.goto('/#gast');

    // Único gasto en la lista: no hace falta filtrar por texto (TX.9a: el
    // título ahora es la categoría, no un texto libre distintivo).
    const gastoList = page.locator('#lista-gastos');
    const gastoItem = gastoList.locator('article').first();
    const editBtn = gastoItem.locator('[data-action="editar-gasto"]');
    await editBtn.click();

    await page.waitForSelector('#modal-gasto[data-open]');
    const formGastoEdit = page.locator('#modal-gasto-body form');
    await formGastoEdit.locator('[name="monto"]').fill('150000');
    await formGastoEdit.locator('button[type="submit"]').click();

    // Verificar que se cerró el modal
    await expect(page.locator(modalCerrado('modal-gasto'))).toBeAttached({
      timeout: 3_000,
    });

    // Ir a Tesorería y verificar que el saldo ahora es $350.000 (500000 - 150000)
    await page.goto('/#tesoreria');
    await expect(page.locator('#lista-tesoreria')).toContainText(
      '$350.000',
      { timeout: 3_000 }
    );
  });

  test('eliminar gasto, verificar saldo restaurado', async ({ page }) => {
    // Precondición: crear cuenta y gasto
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    // Crear cuenta con saldo 800000
    await crearCuentaEfectivo(page, 800000);
    await expect(page.locator('#lista-tesoreria')).toContainText(
      'Efectivo',
      { timeout: 3_000 }
    );

    // Crear gasto de 200000
    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });
    await page.click('[data-action="nuevo-gasto"]');
    await page.waitForSelector('#modal-gasto[data-open]');
    const formGasto = page.locator('#modal-gasto-body form');
    await formGasto.locator('select[name="categoria"]').selectOption({ index: 1 });
    await formGasto.locator('[name="monto"]').fill('200000');
    // Con una sola cuenta activa la cuenta se asume (hidden, sin selector).
    const hoy = hoyLocal();
    await formGasto.locator('[name="fecha"]').fill(hoy);
    await formGasto.locator('button[type="submit"]').click();
    await expect(page.locator('#lista-gastos')).toContainText(
      'Mercado',
      { timeout: 3_000 }
    );

    // Saldo debe estar en 600000 (800000 - 200000)
    await page.goto('/#tesoreria');
    await expect(page.locator('#lista-tesoreria')).toContainText(
      '$600.000',
      { timeout: 3_000 }
    );

    // ELIMINAR gasto
    await page.goto('/#gast');
    const gastoList = page.locator('#lista-gastos');
    const gastoItem = gastoList.locator('article').first();
    const deleteBtn = gastoItem.locator('[data-action="eliminar-gasto"]');
    await deleteBtn.click();

    // TX.9a: sin descripción, el mensaje de confirmación cae a la categoría
    // (no debe mostrar "undefined").
    await expect(page.locator('.confirm__mensaje')).toContainText('Mercado');
    await expect(page.locator('.confirm__mensaje')).not.toContainText('undefined');

    // Confirmar eliminación (modal de confirmación con data-role)
    const confirmBtn = page.locator('[data-role="confirmar"]');
    await confirmBtn.click();

    // El gasto debe desaparecer de la lista (vuelve al estado vacío)
    await expect(page.locator('#lista-gastos .gastos-empty__title')).toHaveText(
      'Sin gastos este mes',
      { timeout: 3_000 }
    );

    // Ir a Tesorería y verificar que el saldo volvió a 800000
    await page.goto('/#tesoreria');
    await expect(page.locator('#lista-tesoreria')).toContainText(
      '$800.000',
      { timeout: 3_000 }
    );
  });
});

// ── SUITE 8: Tema ────────────────────────────────────────────────────────────
// El toggle de tema vive solo en la sección Ajustes (#config), visible en
// todos los tamaños de pantalla. Es un <input type="checkbox">.

test.describe('Tema claro/oscuro', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#config');
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });
  });

  test('toggle cambia la clase light-theme en el body', async ({ page }) => {
    const checkbox = page.locator('#toggle-tema');

    // Estado inicial: oscuro (body sin light-theme)
    await expect(page.locator('body')).not.toHaveClass(/light-theme/);

    // Toggle → claro
    await checkbox.click();
    await expect(page.locator('body')).toHaveClass(/light-theme/);

    // Doble toggle → oscuro de nuevo
    await checkbox.click();
    await expect(page.locator('body')).not.toHaveClass(/light-theme/);
  });

  test('el tema persiste tras recarga', async ({ page }) => {
    await page.locator('#toggle-tema').click();
    await expect(page.locator('body')).toHaveClass(/light-theme/);

    await page.reload();
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });

    // Body debe seguir en light tras recarga
    await expect(page.locator('body')).toHaveClass(/light-theme/);
  });
});

// ── SUITE 8b: Perfil - situación laboral (CFG.1) ─────────────────────────────
// El encabezado del perfil en Ajustes reemplazó el SMMLV muerto por un selector
// de situación laboral. Verifica que se guarda y persiste tras recarga.

test.describe('Perfil - situación laboral', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#config');
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });
  });

  test('el encabezado del perfil ya no muestra el campo SMMLV', async ({ page }) => {
    await expect(page.locator('#config-situacion')).toBeVisible();
    await expect(page.locator('#config-smmlv')).toHaveCount(0);
  });

  test('guarda la situación laboral, la refleja en el perfil y la persiste', async ({ page }) => {
    // .config-info aparece dos veces (perfil y "Acerca de"): scopear a la de perfil.
    const perfilInfo = page.locator('section[aria-labelledby="config-perfil-title"] .config-info');

    await page.locator('#config-situacion').selectOption('independiente');
    await page.locator('#form-perfil button[type="submit"]').click();

    // Tras guardar, el panel se re-renderiza: el resumen muestra la etiqueta y el
    // selector conserva el valor (aquí en Chromium real, no en happy-dom).
    await expect(perfilInfo).toContainText('Independiente o freelance');
    await expect(page.locator('#config-situacion')).toHaveValue('independiente');

    // Persistencia real: el dato queda en localStorage (save debounced 200 ms).
    // No se recarga porque el addInitScript de saltearOnboarding resembraría
    // fk_v1 en cada carga; el chequeo del store es la prueba de persistencia.
    await page.waitForFunction(() => {
      try {
        return JSON.parse(localStorage.getItem('fk_v1') || '{}')?.perfil?.situacionLaboral === 'independiente';
      } catch { return false; }
    });
  });
});

// ── SUITE 8c: Centro Legal (LEG.1) ───────────────────────────────────────────
// Fetch real de docs/legal/*.md (mismo origen, servido por el server de test)
// + conversión con infra/markdown.js. Cubre: abrir un documento, navegar a
// otro por su enlace interno (data-doc-link) y cerrar el modal.

test.describe('Centro Legal', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#config');
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });
  });

  test('lista los 10 documentos y abre uno con su contenido real', async ({ page }) => {
    const botones = page.locator('[data-action="abrir-legal"]');
    await expect(botones).toHaveCount(10);

    await page.locator('[data-action="abrir-legal"][data-doc="politica-de-privacidad"]').click();
    await expect(page.locator('#modal-legal')).toHaveAttribute('data-open', '');
    await expect(page.locator('#modal-legal-title')).toHaveText('Política de privacidad');
    await expect(page.locator('#modal-legal-body')).toContainText('localStorage');
  });

  test('un enlace interno (.md) cambia de documento sin cerrar el modal', async ({ page }) => {
    await page.locator('[data-action="abrir-legal"][data-doc="politica-de-privacidad"]').click();
    await expect(page.locator('#modal-legal-body')).toContainText('localStorage');

    // politica-de-privacidad.md enlaza a tratamiento-de-datos-personales.md.
    await page.locator('#modal-legal-body [data-doc-link="tratamiento-de-datos-personales"]').first().click();

    await expect(page.locator('#modal-legal-title')).toHaveText('Tratamiento de datos personales');
    await expect(page.locator('#modal-legal')).toHaveAttribute('data-open', '');
  });

  test('cierra el modal con el botón de cerrar', async ({ page }) => {
    await page.locator('[data-action="abrir-legal"][data-doc="aviso-legal"]').click();
    await expect(page.locator('#modal-legal')).toHaveAttribute('data-open', '');

    await page.locator('#modal-legal [data-action="modal-close"]').click();
    await expect(page.locator('#modal-legal')).not.toHaveAttribute('data-open', '');
  });
});

// ── SUITE 8d: Vitrina de logros con niveles (LG.2b, ADR 032) ─────────────────
// La vitrina de Ajustes agrupa por familia y muestra el nivel de usuario
// derivado del conteo. El seed trae onboarded=true (logro primer-paso vivo).

test.describe('Vitrina de logros (niveles)', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#config');
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });
  });

  test('muestra el nivel de usuario y la familia agrupada sin listar sus niveles sueltos', async ({ page }) => {
    const panel = page.locator('#panel-logros');
    await expect(panel).toContainText('Tu nivel:');
    await expect(panel).toContainText('Constancia de registro');
    // La familia colapsa a una tarjeta: el nivel 2 no aparece como item propio.
    await expect(panel).not.toContainText('Hábito registrado');
  });
});

// ── SUITE 8e: Familia "deudas saldadas" en la vitrina (LG.2c, ADR 032) ───────

test.describe('Vitrina de logros - familia deudas (LG.2c)', () => {
  test('saldar una deuda desbloquea "Una deuda menos" agrupado en la familia', async ({ page }) => {
    await page.addInitScript(() => {
      const estado = {
        version: 1,
        perfil: { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas: [],
        ingresos: [],
        gastos: [],
        compromisos: [
          { id: 'd1', descripcion: 'Tarjeta pagada', tipo: 'deuda-entidad', saldoTotal: 0, cuotaMensual: 50000, diaPago: 5, activo: true },
        ],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });
    await page.goto('/#config');
    await page.waitForSelector('#sec-config.active', { timeout: 10_000 });

    const panel = page.locator('#panel-logros');
    await expect(panel).toContainText('Deudas saldadas');
    await expect(panel).toContainText('Nivel 1 de 2');
    await expect(panel).toContainText('Saldaste una deuda por completo.');
    await expect(panel).toContainText('Siguiente:');
    // La familia colapsa a una tarjeta: el nombre del nivel 2 ("Rompedeudas")
    // no aparece suelto, solo el nombre de la familia y los textos de estado.
    await expect(panel).not.toContainText('Rompedeudas');
  });
});

// ── SUITE 8: Sidebar colapsable ──────────────────────────────────────────────
// Solo aplica en desktop (viewport >= 1024px). El viewport por defecto de
// Playwright Chromium es 1280x720, suficiente para activar el sidebar lateral.

test.describe('Sidebar colapsable (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/');
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });
  });

  test('colapsa el sidebar y oculta los labels', async ({ page }) => {
    const btn = page.locator('[data-action="sidebar-toggle"]');

    // Estado inicial: expandido
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.sidebar__logo-text')).toBeVisible();

    // Colapsar
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.sidebar__logo-text')).not.toBeVisible();
  });

  test('expande el sidebar nuevamente', async ({ page }) => {
    const btn = page.locator('[data-action="sidebar-toggle"]');

    // Colapsar y volver a expandir
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');

    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.sidebar__logo-text')).toBeVisible();
  });

  test('el estado colapsado persiste tras recarga', async ({ page }) => {
    const btn = page.locator('[data-action="sidebar-toggle"]');

    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');

    await page.reload();
    await page.waitForSelector('#sec-dash.active', { timeout: 10_000 });

    // Debe seguir colapsado
    await expect(
      page.locator('[data-action="sidebar-toggle"]')
    ).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.sidebar__logo-text')).not.toBeVisible();
  });
});

// ── SUITE 9: Agenda ─────────────────────────────────────────────────────────
// Calendario mensual de compromisos. Verifica que la sección carga,
// muestra título, grilla días, y leyenda. Navega prev/next mes.

test.describe('Agenda', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
  });

  test('carga y muestra calendario del mes', async ({ page }) => {
    // Heading "Calendario"
    await expect(page.locator('h1').filter({ hasText: 'Calendario' })).toBeVisible();

    // Cabecera calendario: mes actual (Mayo o similar)
    await expect(page.locator('.cal-card__title')).toBeVisible();
    await expect(page.locator('.cal-card__subtitle')).toBeVisible();

    // Grilla con al menos un día visible
    await expect(page.locator('[role="grid"]').first()).toBeVisible();
  });

  test('CAL.2: sin compromisos ni ingresos este mes, la leyenda no se dibuja', async ({ page }) => {
    // El beforeEach siembra estado vacío: sin nada que explicar todavía.
    await expect(page.locator('.cal-legend')).toHaveCount(0);
  });

  test('navega mes anterior con botón <', async ({ page }) => {
    const btnPrev = page.locator('[data-action="agenda-prev-mes"]');
    const titulo = page.locator('.cal-card__title');

    const mesBefore = await titulo.textContent();

    await btnPrev.click();
    await page.waitForTimeout(100);

    const mesAfter = await titulo.textContent();

    // Debe cambiar el mes mostrado
    expect(mesBefore).not.toBe(mesAfter);
  });

  test('navega mes siguiente con botón >', async ({ page }) => {
    const btnNext = page.locator('[data-action="agenda-next-mes"]');
    const titulo = page.locator('.cal-card__title');

    const mesBefore = await titulo.textContent();

    await btnNext.click();
    await page.waitForTimeout(100);

    const mesAfter = await titulo.textContent();

    // Debe cambiar el mes mostrado
    expect(mesBefore).not.toBe(mesAfter);
  });
});

// ── SUITE 10b: Agenda - leyenda dinámica (CAL.2) ────────────────────────────
// La leyenda bajo el calendario solo lista los tipos de evento que el usuario
// ya usa este mes (no las 4 categorías fijas de siempre).

test.describe('Agenda - leyenda dinámica con los tres tipos de compromiso', () => {
  test('con un compromiso de cada tipo este mes, la leyenda los muestra a los tres', async ({ page }) => {
    const hoy  = new Date();
    const anio = hoy.getFullYear();
    const mes  = String(hoy.getMonth() + 1).padStart(2, '0');

    await page.addInitScript(({ anio, mes }) => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos: [
          { id: 'f1', tipo: 'fijo',           descripcion: 'Arriendo', monto: 500000,        frecuencia: 'Mensual', diaPago: 1, activo: true, fechaCreacion: `${anio}-${mes}-01T00:00:00Z` },
          { id: 'd1', tipo: 'deuda-entidad',  descripcion: 'Crédito',  cuotaMensual: 200000,  frecuencia: 'Mensual', diaPago: 1, activo: true, fechaCreacion: `${anio}-${mes}-01T00:00:00Z` },
          { id: 'd2', tipo: 'deuda-personal', descripcion: 'Préstamo',cuotaMensual: 100000,  frecuencia: 'Mensual', diaPago: 1, activo: true, fechaCreacion: `${anio}-${mes}-01T00:00:00Z` },
        ],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { anio, mes });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    await expect(page.locator('.cal-legend')).toBeVisible();
    await expect(page.locator('.cal-legend')).toContainText('Gasto fijo');
    await expect(page.locator('.cal-legend')).toContainText('Deuda entidad');
    await expect(page.locator('.cal-legend')).toContainText('Deuda personal');
  });
});

// ── SUITE 11: Agenda - badge abono (ADR 002) ────────────────────────────────
// Verifica que el badge "Ya abonaste este mes" aparece en el panel de detalle
// del día cuando hay un gasto-abono del mes actual vinculado al compromiso.

test.describe('Agenda - badge abono', () => {
  test('muestra badge "Ya pagaste este mes" en el detalle del día', async ({ page }) => {
    const compromisoId = 'comp-badge-e2e';
    const hoy     = new Date();
    const anio    = hoy.getFullYear();
    const mes     = String(hoy.getMonth() + 1).padStart(2, '0');
    const diaPago = 15;

    await page.addInitScript(({ compromisoId, anio, mes, diaPago }) => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos: [{
          id:          'gasto-abono-badge',
          compromisoId,
          descripcion: 'Abono cuota E2E',
          monto:       100000,
          categoria:   'Compromisos',
          cuentaId:    null,
          fecha:       `${anio}-${mes}-10`,
        }],
        compromisos: [{
          id:           compromisoId,
          tipo:         'deuda-entidad',
          descripcion:  'Deuda Badge E2E',
          saldoTotal:   400000,
          cuotaMensual: 100000,
          tasa:         24,
          tasaUnidad:   'EA',
          frecuencia:   'Mensual',
          diaPago,
        }],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { compromisoId, anio, mes, diaPago });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    // El día 15 tiene el compromiso: debe ser un botón con data-action
    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    // El panel de detalle debe mostrar el badge de abono
    const badge = page.locator('.cal-detail__badge-abono');
    await expect(badge).toBeVisible({ timeout: 3_000 });
    await expect(badge).toContainText('Ya pagaste este mes');
  });
});

// ── SUITE 12: Agenda - total a pagar por día (AG.5) ──────────────────────────
// Con dos compromisos el mismo día (un fijo y una deuda), el panel de
// detalle debe mostrar la sumatoria de ambos, no solo listarlos por separado.

test.describe('Agenda - total a pagar por día', () => {
  test('el detalle del día suma el gasto fijo y la cuota de la deuda', async ({ page }) => {
    const diaPago = 20;

    await page.addInitScript(({ diaPago }) => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos: [
          {
            id: 'fijo-total-e2e', tipo: 'fijo', descripcion: 'Arriendo E2E',
            monto: 900000, frecuencia: 'Mensual', diaPago,
          },
          {
            id: 'deuda-total-e2e', tipo: 'deuda-entidad', descripcion: 'Tarjeta E2E',
            saldoTotal: 3000000, cuotaMensual: 150000, tasa: 24, tasaUnidad: 'EA',
            frecuencia: 'Mensual', diaPago,
          },
        ],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { diaPago });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    const total = page.locator('.cal-detail__total');
    await expect(total).toBeVisible({ timeout: 3_000 });
    await expect(total).toContainText('Total a pagar');
    await expect(total).toContainText('$1.050.000'); // 900.000 + 150.000
  });
});

// ── SUITE 12c: Agenda - hero del mes (CAL.4a, ADR 037 D1/D7) ─────────────────
// El hero al tope de la sección muestra el total a pagar del mes visible y el
// progreso pagado/falta cruzando S.gastos por compromisoId; el ojo comparte
// S.config.ocultarSaldo con el resto de la app y enmascara los tres montos.

test.describe('Agenda - hero del mes (CAL.4a)', () => {
  test('muestra el total del mes y el progreso pagado/falta', async ({ page }) => {
    const hoy  = new Date();
    const anio = hoy.getFullYear();
    const mes  = String(hoy.getMonth() + 1).padStart(2, '0');

    await page.addInitScript(({ anio, mes }) => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos: [{
          id: 'gasto-hero-e2e', compromisoId: 'fijo-hero-e2e',
          descripcion: 'Pago: Arriendo Hero E2E', monto: 900000,
          categoria: 'Gastos fijos', cuentaId: null, fecha: `${anio}-${mes}-05`,
        }],
        compromisos: [
          {
            id: 'fijo-hero-e2e', tipo: 'fijo', descripcion: 'Arriendo Hero E2E',
            monto: 900000, frecuencia: 'Mensual', diaPago: 5,
          },
          {
            id: 'deuda-hero-e2e', tipo: 'deuda-entidad', descripcion: 'Tarjeta Hero E2E',
            saldoTotal: 3000000, cuotaMensual: 150000, tasa: 24, tasaUnidad: 'EA',
            frecuencia: 'Mensual', diaPago: 20,
          },
        ],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { anio, mes });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    const hero = page.locator('.hero-agenda');
    await expect(hero).toBeVisible();
    await expect(hero.locator('.hero-agenda__valor')).toHaveText('$1.050.000');
    await expect(hero.locator('.hero-agenda__pagado')).toContainText('$900.000');
    await expect(hero.locator('.hero-agenda__falta')).toContainText('$150.000');
  });

  test('el ojo enmascara los montos del hero y persiste el flag compartido', async ({ page }) => {
    await page.addInitScript(() => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos: [{
          id: 'fijo-ojo-e2e', tipo: 'fijo', descripcion: 'Arriendo Ojo E2E',
          monto: 900000, frecuencia: 'Mensual', diaPago: 5,
        }],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    await page.locator('[data-action="agenda-saldo-visibilidad"]').click();

    const hero = page.locator('.hero-agenda');
    await expect(hero.locator('.hero-agenda__valor')).toHaveText('$••••••');
    await expect(hero.locator('.hero-agenda__pagado')).toHaveText('Pagado ••••');
    await expect(hero.locator('[data-action="agenda-saldo-visibilidad"]'))
      .toHaveAttribute('aria-pressed', 'true');

    // El flag es el mismo de toda la app (IN.2): queda persistido en fk_v1.
    // save() es debounced 200ms (ADN 5), así que se espera con poll.
    await expect.poll(
      () => page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')).config?.ocultarSaldo),
      { timeout: 3_000 },
    ).toBe(true);
  });

  test('mes sin pagos programados muestra la variante de guía sin ojo', async ({ page }) => {
    await page.addInitScript(() => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos: [],
        metas:     [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    const hero = page.locator('.hero-agenda');
    await expect(hero).toBeVisible();
    await expect(hero.locator('.hero-agenda__titulo')).toHaveText('Sin pagos programados');
    await expect(hero.locator('.hero-agenda__ojo')).toHaveCount(0);
    await expect(hero.locator('.hero-agenda__valor')).toHaveCount(0);
  });
});

// ── SUITE 12e: Agenda - detalle del día accionable (CAL.4c, ADR 037 D4/D5) ───
// Con todos los compromisos del día cubiertos, el total del detalle pasa a
// "Pagado este día"; los CTA llevan la identidad de su tipo (Marcar pagado
// índigo, Abonar frambuesa) en vez del verde genérico.

test.describe('Agenda - detalle del día accionable (CAL.4c)', () => {
  test('día pagado muestra "Pagado este día" y el CTA Abonar lleva la clase de su tipo', async ({ page }) => {
    const hoy  = new Date();
    const anio = hoy.getFullYear();
    const mes  = String(hoy.getMonth() + 1).padStart(2, '0');

    await page.addInitScript(({ anio, mes }) => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos: [{
          id: 'gasto-cal4c-e2e', compromisoId: 'fijo-cal4c-e2e',
          descripcion: 'Pago: Arriendo CAL4c', monto: 900000,
          categoria: 'Gastos fijos', cuentaId: null, fecha: `${anio}-${mes}-15`,
        }],
        compromisos: [
          {
            id: 'fijo-cal4c-e2e', tipo: 'fijo', descripcion: 'Arriendo CAL4c',
            monto: 900000, frecuencia: 'Mensual', diaPago: 15,
          },
          {
            id: 'deuda-cal4c-e2e', tipo: 'deuda-entidad', descripcion: 'Tarjeta CAL4c',
            saldoTotal: 3000000, cuotaMensual: 150000, tasa: 24, tasaUnidad: 'EA',
            frecuencia: 'Mensual', diaPago: 20,
          },
        ],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { anio, mes });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    // Día 15: el fijo está pagado → total en verde + pill con ícono, sin CTA.
    await page.locator('[data-action="agenda-mostrar-dia"][data-day="15"]').click();
    const total = page.locator('.cal-detail__total');
    await expect(total).toContainText('Pagado este día');
    await expect(page.locator('.cal-detail__badge-abono')).toContainText('Ya pagaste este mes');
    await expect(page.locator('[data-action="agenda-marcar-pagado-fijo"]')).toHaveCount(0);

    // Día 20: la deuda está pendiente → CTA Abonar con la identidad del tipo.
    await page.locator('[data-action="agenda-mostrar-dia"][data-day="20"]').click();
    const abonar = page.locator('[data-action="abrir-abono"]');
    await expect(abonar).toBeVisible();
    await expect(abonar).toHaveClass(/cal-detail__cta--deuda-entidad/);
    await expect(page.locator('.cal-detail__total')).toContainText('Total a pagar');
  });
});

// ── SUITE 12d: Agenda - empty state del mes (CAL.4b, ADR 037 D6) ─────────────
// Un mes sin ningún evento muestra la card de guía bajo el calendario y su
// CTA abre el modal de gasto fijo (misma acción del header, nuevo-gasto-fijo).

test.describe('Agenda - empty state del mes (CAL.4b)', () => {
  test('mes vacío muestra "está despejado" y el CTA abre el modal de gasto fijo', async ({ page }) => {
    await page.addInitScript(() => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos: [],
        metas:     [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    const empty = page.locator('.cal-empty');
    await expect(empty).toBeVisible();
    await expect(empty.locator('.cal-empty__title')).toContainText('está despejado');

    await empty.locator('[data-action="nuevo-gasto-fijo"]').click();
    const modal = page.locator('#modal-gasto-fijo');
    await expect(modal).toBeVisible({ timeout: 3_000 });
    await expect(modal.locator('.modal__title')).toHaveText('Nuevo gasto fijo');
  });
});

// ── SUITE 12b: Agenda - CAL.3 selección automática del día actual ────────────
// Al navegar HACIA Calendario desde otra sección, si hoy tiene compromisos,
// el detalle se auto-abre sin que el usuario haga click. El fixture usa el
// día real de hoy (calculado en el navegador) para que el test sea válido
// sin importar qué día se ejecute. Cubre también que una carga directa en
// #agenda (page.goto) NO auto-abre nada: el mecanismo solo arma con
// hashchange, a propósito (ver agenda/index.js).

test.describe('Agenda - CAL.3 selección automática del día actual', () => {
  test('navegar desde otra sección auto-abre el detalle de hoy si hay compromisos', async ({ page }) => {
    await page.addInitScript(() => {
      const diaPago = new Date().getDate();
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos: [
          {
            id: 'cal3-e2e', tipo: 'fijo', descripcion: 'Suscripción CAL.3 E2E',
            monto: 45000, frecuencia: 'Mensual', diaPago,
          },
        ],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });

    await page.goto('/#gast');
    await page.waitForSelector('#sec-gast.active', { timeout: 10_000 });

    await page.click('.nav-item[href="#agenda"]');
    await page.waitForSelector('#sec-agenda.active', { timeout: 10_000 });

    const detalle = page.locator('.cal-detail');
    await expect(detalle).toBeVisible({ timeout: 3_000 });
    await expect(detalle.locator('.cal-detail__item')).toContainText('Suscripción CAL.3 E2E');
  });

  test('cargar la app directo en #agenda no auto-abre el detalle (solo aplica a navegar hacia la sección)', async ({ page }) => {
    await page.addInitScript(() => {
      const diaPago = new Date().getDate();
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos: [
          {
            id: 'cal3-boot-e2e', tipo: 'fijo', descripcion: 'Suscripción CAL.3 boot',
            monto: 45000, frecuencia: 'Mensual', diaPago,
          },
        ],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    await expect(page.locator('.cal-detail')).toHaveCount(0);
  });

  test('seleccionar un día sin compromisos muestra un mensaje explícito', async ({ page }) => {
    await page.addInitScript(() => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos: [],
        metas:     [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    // Cualquier día del grid es clickeable ahora, tenga o no eventos.
    await page.locator('[data-action="agenda-mostrar-dia"]').first().click();

    const detalle = page.locator('.cal-detail');
    await expect(detalle).toBeVisible({ timeout: 3_000 });
    await expect(detalle.locator('.cal-detail__subtitle')).toHaveText('Sin compromisos ni ingresos este día');
  });
});

// ── Agenda - leyenda sticky (AG.6) ───────────────────────────────────────────
// La leyenda va justo debajo del calendario y es sticky: con un día cargado
// de registros debe seguir dentro del viewport al desplazarse hasta el final
// del detalle. Cubre también la regresión de overflow en .main-content
// (un ancestro con overflow-x: hidden anularía el sticky).

test.describe('Agenda - leyenda sticky', () => {
  test('la leyenda sigue visible tras desplazarse al fondo del detalle', async ({ page }) => {
    const diaPago = 15;

    await page.addInitScript(({ diaPago }) => {
      const compromisos = [];
      for (let i = 1; i <= 10; i++) {
        compromisos.push({
          id: `sticky-e2e-${i}`, tipo: 'fijo', descripcion: `Fijo sticky ${i}`,
          monto: 50000, frecuencia: 'Mensual', diaPago,
        });
      }
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos,
        metas:     [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { diaPago });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();
    await expect(page.locator('.cal-detail')).toBeVisible({ timeout: 3_000 });

    // Desplazarse al final del documento. El guard de scrollY > 0 evita que
    // el test pase trivialmente si el contenido no alcanzara a desbordar.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);

    // Sin sticky, la leyenda quedaría fuera del viewport por arriba.
    const box      = await page.locator('.cal-legend').boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  });
});

// ── Agenda - marca de color por tipo en el detalle (AG.7, IV.2c) ────────────
// Cada registro del detalle del día lleva un fondo teñido de color según su
// tipo (mismos --fk-dom-* que los dots del calendario, AG.6), para distinguir
// de un vistazo qué es qué en fechas cargadas. Reemplaza la franja lateral
// (IV.2c, ADR 031: "la línea comunica poco").

test.describe('Agenda - marca de color por tipo', () => {
  test('un fijo y una deuda entidad el mismo día llevan fondos de color distintos', async ({ page }) => {
    const diaPago = 15;

    await page.addInitScript(({ diaPago }) => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos: [
          { id: 'fijo-color-e2e', tipo: 'fijo', descripcion: 'Mercado E2E',
            monto: 100000, frecuencia: 'Mensual', diaPago },
          { id: 'deuda-color-e2e', tipo: 'deuda-entidad', descripcion: 'Tarjeta E2E',
            saldoTotal: 2000000, cuotaMensual: 200000, tasa: 24, tasaUnidad: 'EA',
            frecuencia: 'Mensual', diaPago },
        ],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { diaPago });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    const itemFijo  = page.locator('.cal-detail__item--fijo');
    const itemDeuda = page.locator('.cal-detail__item--deuda-entidad');
    await expect(itemFijo).toBeVisible({ timeout: 3_000 });
    await expect(itemDeuda).toBeVisible({ timeout: 3_000 });

    const colorFijo  = await itemFijo.evaluate(el => window.getComputedStyle(el).backgroundColor);
    const colorDeuda = await itemDeuda.evaluate(el => window.getComputedStyle(el).backgroundColor);
    // sin modificador de tipo, .cal-detail__item queda en --fk-bg-elevated
    // puro (sin tinte): compararlo (mismo elemento base, sin clase --tipo)
    // confirma que fijo/deuda SÍ están teñidos, no solo que son distintos
    // entre sí.
    const colorSinTenir = await page.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'cal-detail__item';
      document.body.appendChild(el);
      const c = window.getComputedStyle(el).backgroundColor;
      el.remove();
      return c;
    });
    expect(colorFijo).not.toBe(colorDeuda);
    expect(colorFijo).not.toBe(colorSinTenir);
    expect(colorDeuda).not.toBe(colorSinTenir);
  });
});

// ── Agenda - teja de categoría como ícono principal (AG.2/ID.3) ──────────────
// Un gasto fijo con categoría muestra la teja de esa categoría como ícono
// principal (izquierda), no el genérico por tipo; sin categoría, cae al
// ícono genérico.

test.describe('Agenda - teja de categoría como ícono principal', () => {
  test('con categoría, el ícono principal es la teja con el glifo del sprite', async ({ page }) => {
    const diaPago = 15;

    await page.addInitScript(({ diaPago }) => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos: [
          { id: 'fijo-emoji-e2e', tipo: 'fijo', descripcion: 'Internet E2E',
            categoria: 'Internet', monto: 100000, frecuencia: 'Mensual', diaPago },
        ],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { diaPago });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    const iconoEl = page.locator('.cal-detail__icon');
    await expect(iconoEl).toBeVisible({ timeout: 3_000 });
    await expect(iconoEl.locator('.cat-teja')).toHaveCount(1);
    await expect(iconoEl.locator('use[href="#c-internet"]')).toHaveCount(1);
  });

  test('sin categoría, el ícono principal es el genérico del tipo (con <svg>)', async ({ page }) => {
    const diaPago = 15;

    await page.addInitScript(({ diaPago }) => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [],
        ingresos:  [],
        gastos:    [],
        compromisos: [
          { id: 'fijo-sin-cat-e2e', tipo: 'fijo', descripcion: 'Sin categoría E2E',
            monto: 100000, frecuencia: 'Mensual', diaPago },
        ],
        metas: [],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { diaPago });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    const iconoEl = page.locator('.cal-detail__icon');
    await expect(iconoEl).toBeVisible({ timeout: 3_000 });
    await expect(iconoEl.locator('svg')).toHaveCount(1);
  });
});

// ── Agenda - nombre automático según la categoría (AG.4) ─────────────────────
// Con una categoría predefinida, el nombre del gasto fijo pasa a ser la
// categoría y el campo de texto se convierte en una nota opcional; con
// "Otro" o sin categoría, el campo sigue siendo el nombre obligatorio.

test.describe('Agenda - nombre automático según la categoría', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
    await page.click('[data-action="nuevo-gasto-fijo"]');
    await expect(page.locator('#form-gasto-fijo')).toBeVisible({ timeout: 3_000 });
  });

  test('al elegir una categoría predefinida, el campo pasa a "Nota (opcional)" y deja de ser obligatorio', async ({ page }) => {
    const label = page.locator('#gfijo-descripcion-label');
    const input = page.locator('#gfijo-descripcion');
    await expect(label).toHaveText('Descripción');

    await page.selectOption('#gfijo-categoria', 'Mercado');

    await expect(label).toHaveText('Nota (opcional)');
    await expect(input).not.toHaveAttribute('aria-required', 'true');
  });

  test('al volver a "Otro", el campo vuelve a ser "Descripción" obligatoria', async ({ page }) => {
    const label = page.locator('#gfijo-descripcion-label');
    const input = page.locator('#gfijo-descripcion');

    await page.selectOption('#gfijo-categoria', 'Mercado');
    await expect(label).toHaveText('Nota (opcional)');

    await page.selectOption('#gfijo-categoria', 'Otro');
    await expect(label).toHaveText('Descripción');
    await expect(input).toHaveAttribute('aria-required', 'true');
  });

  test('guardar con categoría predefinida y sin texto: el registro usa la categoría como nombre', async ({ page }) => {
    await page.selectOption('#gfijo-categoria', 'Mercado');
    await page.fill('#gfijo-monto', '150000');
    await page.fill('#gfijo-dia', '10');
    await page.click('#form-gasto-fijo button[type="submit"]');

    await expect(page.locator('#modal-gasto-fijo')).not.toHaveAttribute('data-open');
    await page.click(`[data-action="agenda-mostrar-dia"][data-day="10"]`);

    const item = page.locator('.cal-detail__item').first();
    await expect(item.locator('.cal-detail__name')).toHaveText('Mercado');
  });

  test('guardar con categoría predefinida y una nota: la nota queda en el subtítulo, el nombre es la categoría', async ({ page }) => {
    await page.selectOption('#gfijo-categoria', 'Mercado');
    await page.fill('#gfijo-descripcion', 'Éxito de la esquina');
    await page.fill('#gfijo-monto', '150000');
    await page.fill('#gfijo-dia', '11');
    await page.click('#form-gasto-fijo button[type="submit"]');

    await expect(page.locator('#modal-gasto-fijo')).not.toHaveAttribute('data-open');
    await page.click(`[data-action="agenda-mostrar-dia"][data-day="11"]`);

    const item = page.locator('.cal-detail__item').first();
    await expect(item.locator('.cal-detail__name')).toHaveText('Mercado');
    await expect(item.locator('.cal-detail__sub')).toContainText('Éxito de la esquina');
  });
});

// ── Agenda - picker de ícono para "Otro" (CAT.2f) ────────────────────────────

test.describe('Agenda - picker de ícono para "Otro" (CAT.2f)', () => {
  test.beforeEach(async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });
    await page.click('[data-action="nuevo-gasto-fijo"]');
    await expect(page.locator('#form-gasto-fijo')).toBeVisible({ timeout: 3_000 });
  });

  test('elegir "Otro" revela el picker de ícono; una categoría predefinida lo oculta de nuevo', async ({ page }) => {
    const grupoIcono = page.locator('#form-group-gfijo-icono');
    await expect(grupoIcono).toBeHidden();

    await page.selectOption('#gfijo-categoria', 'Otro');
    await expect(grupoIcono).toBeVisible();

    await page.selectOption('#gfijo-categoria', 'Mercado');
    await expect(grupoIcono).toBeHidden();
  });

  test('crear un gasto fijo con categoría "Otro" y un ícono elegido queda en el detalle del día', async ({ page }) => {
    const form = page.locator('#form-gasto-fijo');
    await page.selectOption('#gfijo-categoria', 'Otro');
    await form.locator('[data-icono-picker="gfijo-icono"] .icono-picker__recuadro').click();
    await form.locator('[data-icono-picker="gfijo-icono"] [data-icon="c-cohete"]').click();
    await form.locator('#gfijo-descripcion').fill('Suscripción rara');
    await form.locator('#gfijo-monto').fill('50000');
    await form.locator('#gfijo-dia').fill('12');
    await form.locator('button[type="submit"]').click();

    await expect(page.locator('#modal-gasto-fijo')).not.toHaveAttribute('data-open');
    await page.click('[data-action="agenda-mostrar-dia"][data-day="12"]');

    const item = page.locator('.cal-detail__item').first();
    await expect(item.locator('.cal-detail__icon .cat-teja use[href="#c-cohete"]')).toHaveCount(1);
  });
});

// ── Límites de gasto: resumen por grupo (MC.5b, ADR 017) ─────────────────────

test.describe('Límites de gasto - resumen por grupo', () => {
  test('sin ingreso registrado guía a Mis cuentas', async ({ page }) => {
    await saltearOnboarding(page); // ingresos: []
    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const vacio = page.locator('.grupos-resumen--vacio');
    await expect(vacio).toBeVisible({ timeout: 3_000 });
    await expect(vacio.locator('a[href="#tesoreria"]')).toBeVisible();
  });

  test('con ingreso registrado muestra las 3 tarjetas de grupo', async ({ page }) => {
    await saltearOnboarding(page);
    // Segundo addInitScript: agrega un ingreso mensual al estado ya sembrado.
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    await expect(page.locator('.grupos-resumen__grid .grupo-card')).toHaveCount(3);
    await expect(page.locator('.grupo-card[data-grupo="necesidades"]')).toBeVisible();
    await expect(page.locator('.grupo-card[data-grupo="estilo-de-vida"]')).toBeVisible();
    await expect(page.locator('.grupo-card[data-grupo="ahorro"]')).toBeVisible();
  });

  test('desglose de Necesidades (MC.5c): un fijo pagado este mes aparece en el detalle', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.compromisos = [{
        id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual',
        diaPago: 5, monto: 800_000, activo: true, categoria: null,
        fechaCreacion: '2026-01-01T00:00:00.000Z',
      }];
      st.gastos = [{
        id: 'g1', descripcion: 'Pago arriendo', monto: 800_000, categoria: 'Vivienda',
        fecha: hoy, cuentaId: null, nota: '', compromisoId: 'cf1',
      }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const card = page.locator('.grupo-card[data-grupo="necesidades"]');
    await card.locator('.grupo-card__desglose summary').click();
    await expect(card.locator('.grupo-card__item')).toHaveCount(1);
    await expect(card.locator('.grupo-card__item-nombre')).toContainText('Arriendo');
    await expect(card.locator('.grupo-card__item-sub')).toContainText('Pagado');
  });

  test('desglose de Ahorro (MC.5c): fondo activo muestra aportado este mes', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.ahorro = {
        fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 100_000 },
        aportes: [{ id: 'a1', monto: 50_000, fecha: hoy }],
        compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const card = page.locator('.grupo-card[data-grupo="ahorro"]');
    await card.locator('.grupo-card__desglose summary').click();
    await expect(card.locator('.grupo-card__item')).toHaveCount(1);
    await expect(card.locator('.grupo-card__item-nombre')).toContainText('Fondo de emergencia');
    await expect(card.locator('.grupo-card__item-sub')).toContainText('este mes');
  });

  test('alerta de Estilo de vida (MC.5d): un límite por categoría en 80% muestra el nudge exacto del ADR', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.presupuestos = [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 100_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
      st.gastos = [{ id: 'g1', descripcion: 'Almuerzo', monto: 80_000, categoria: 'Restaurantes', fecha: hoy, cuentaId: null, nota: '' }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const nudge = page.locator('.grupo-card[data-grupo="estilo-de-vida"] .nudge-medium .nudge__title');
    await expect(nudge).toBeVisible({ timeout: 3_000 });
    await expect(nudge).toHaveText('Ya usaste el 80% de tu presupuesto para Restaurantes. Intenta moderar este tipo de gastos los próximos días.');
  });

  test('refuerzo de Ahorro (MC.8a): cumplir justo el ahorro planeado muestra el refuerzo "Cumpliste"', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      // Preset fijo 50/30/20: ahorro = 20% de 3.000.000 = 600.000. Se aporta justo eso.
      st.config = { notificaciones: false, presetDistribucion: '50-30-20' };
      st.ahorro = {
        fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 },
        aportes: [{ id: 'a1', monto: 600_000, fecha: hoy }],
        compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const nudge = page.locator('.grupo-card[data-grupo="ahorro"] .nudge-success .nudge__title');
    await expect(nudge).toBeVisible({ timeout: 3_000 });
    await expect(nudge).toHaveText('Vas por buen camino. Cumpliste con el ahorro que planeaste este mes.');
  });

  test('refuerzo de Ahorro (MC.8a): superar lo planeado muestra el refuerzo más cálido', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      // Ahorro planeado 600.000; se aporta 900.000 (más de lo planeado).
      st.config = { notificaciones: false, presetDistribucion: '50-30-20' };
      st.ahorro = {
        fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 },
        aportes: [{ id: 'a1', monto: 900_000, fecha: hoy }],
        compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const nudge = page.locator('.grupo-card[data-grupo="ahorro"] .nudge-success .nudge__title');
    await expect(nudge).toBeVisible({ timeout: 3_000 });
    await expect(nudge).toHaveText('¡Excelente! Este mes estás ahorrando más de lo planeado. Cada peso que ahorras hoy es tranquilidad mañana.');
  });

  test('MC.8: superar la meta de Ahorro se ve en verde (logro), nunca en rojo', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { notificaciones: false, presetDistribucion: '50-30-20' }; // ahorro planeado 600.000
      st.ahorro = {
        fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 },
        aportes: [{ id: 'a1', monto: 900_000, fecha: hoy }], // aporta más de lo planeado
        compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const card = page.locator('.grupo-card[data-grupo="ahorro"]');
    // Estado visual "logro" (verde), no "excedido" (rojo).
    await expect(card).toHaveAttribute('data-estado', 'logro');
    // Barra de progreso verde (progress-bar--complete), no roja (--danger).
    await expect(card.locator('.progress-bar.progress-bar--complete')).toBeVisible();
    await expect(card.locator('.progress-bar--danger')).toHaveCount(0);
    // La tercera cifra celebra el excedente en positivo, no lo marca como "Excedido" rojo.
    const fig = card.locator('.grupo-card__fig').last();
    await expect(fig.locator('dt')).toHaveText('Ahorrado de más');
    await expect(fig.locator('dd')).toHaveClass(/is-positive/);
    await expect(fig.locator('dd.is-negative')).toHaveCount(0);
  });

  test('EP.7b: la nota de complementariedad con Mis cuentas ya no vive en el resumen (la cubre el banner de propósito)', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    await expect(page.locator('.grupos-resumen__nota')).toHaveCount(0);
  });

  test('MC.8b: los topes por categoría viven dentro de la tarjeta de Estilo de vida, sin bloque suelto', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.presupuestos = [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 300_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const card = page.locator('.grupo-card[data-grupo="estilo-de-vida"]');
    // El envelope y el botón "Agregar límite" viven DENTRO de la tarjeta.
    await expect(card.locator('.estilo-limites')).toBeVisible();
    await expect(card.locator('.envelope[data-id="p1"]')).toBeVisible();
    await expect(card.locator('.estilo-limites [data-action="nuevo-presupuesto"]')).toHaveText('+ Agregar límite');
    // El bloque suelto y el hero antiguos ya no existen en ningún lado.
    await expect(page.locator('.estilo-detalle')).toHaveCount(0);
    await expect(page.locator('.presupuesto-hero')).toHaveCount(0);
  });

  test('MC.8b: la "olla finita" indica cuánto del Estilo de vida cubren los topes', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      // Preset 50/30/20: Estilo de vida = 30% de 3.000.000 = 900.000.
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { notificaciones: false, presetDistribucion: '50-30-20' };
      st.presupuestos = [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 300_000, activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const olla = page.locator('.grupo-card[data-grupo="estilo-de-vida"] .estilo-olla');
    await expect(olla).toBeVisible({ timeout: 3_000 });
    await expect(olla).toHaveText(
      'Tus límites cubren $300.000 de los $900.000 de tu Estilo de vida. Te quedan $600.000 sin tope.',
    );
  });

  test('MC.8b: Necesidades se monitorea sin alarma, aunque supere lo previsto', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      // Preset 50/30/20 con ingreso 1.000.000: Necesidades asignado = 500.000.
      // Se ejecutan 600.000 (por encima). Antes de MC.8b la tarjeta iba en rojo.
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 1_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { notificaciones: false, presetDistribucion: '50-30-20' };
      st.compromisos = [{
        id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual',
        diaPago: 5, monto: 600_000, activo: true, categoria: null,
        fechaCreacion: '2026-01-01T00:00:00.000Z',
      }];
      st.gastos = [{
        id: 'g1', descripcion: 'Pago arriendo', monto: 600_000, categoria: 'Vivienda',
        fecha: hoy, cuentaId: null, nota: '', compromisoId: 'cf1',
      }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());
    await page.goto('/#presupuesto');
    await page.waitForSelector('#panel-presupuesto', { timeout: 10_000 });

    const card = page.locator('.grupo-card[data-grupo="necesidades"]');
    // Estado neutro "monitor": nunca "excedido" (rojo) ni "alerta" (ámbar).
    await expect(card).toHaveAttribute('data-estado', 'monitor');
    await expect(card.locator('.progress-bar--danger')).toHaveCount(0);
    await expect(card.locator('.progress-bar--warn')).toHaveCount(0);
    // La tercera cifra informa el exceso sin pintarlo de rojo.
    const fig = card.locator('.grupo-card__fig').last();
    await expect(fig.locator('dt')).toHaveText('Sobre lo previsto');
    await expect(fig.locator('dd.is-negative')).toHaveCount(0);
  });
});

// ── Mis cuentas: Transferir entre cuentas propias (MC.17b) ───────────────────

test.describe('Mis cuentas - Transferir entre cuentas propias (MC.17b)', () => {
  test('con menos de 2 cuentas activas, la entrada no aparece', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 300_000, activa: true }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await expect(page.locator('#tesoreria-transferir')).toBeEmpty();
  });

  test('con exactamente 2 cuentas: el widget de par transfiere y actualiza ambos saldos', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.cuentas = [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 300_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 900_000, activa: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await page.click('[data-action="abrir-transferencia"]');
    await page.waitForSelector('#modal-transferencia[data-open]', { timeout: 5_000 });

    // Origen por defecto = mayor saldo (Bancolombia, $900.000).
    const wrap = page.locator('#transferencia-par-wrap');
    await expect(wrap).toContainText('Bancolombia');
    await expect(wrap).toContainText('Nequi');

    await page.fill('#transferencia-monto', '100000');
    await page.click('#form-transferencia button[type="submit"]');
    await page.waitForSelector(modalCerrado('modal-transferencia'), { timeout: 5_000 });

    await page.waitForTimeout(400); // save() debounced (ADN #5)
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));
    expect(st.cuentas.find(c => c.id === 'c2').saldo).toBe(800_000); // origen: 900.000 - 100.000
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(400_000); // destino: 300.000 + 100.000
    expect(st.transferencias).toHaveLength(1);
    expect(st.transferencias[0]).toMatchObject({ cuentaOrigenId: 'c2', cuentaDestinoId: 'c1', monto: 100_000 });

    // El traslado es interno: el patrimonio total en cuentas no cambia.
    const cardBancolombia = page.locator('.cuenta-card', { hasText: 'Bancolombia' });
    const cardNequi       = page.locator('.cuenta-card', { hasText: 'Nequi' });
    await expect(cardBancolombia.locator('.cuenta-card__saldo')).toHaveText('$800.000');
    await expect(cardNequi.locator('.cuenta-card__saldo')).toHaveText('$400.000');
  });

  test('invertir el par cambia cuál cuenta es el origen', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.cuentas = [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 300_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 900_000, activa: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await page.click('[data-action="abrir-transferencia"]');
    await page.waitForSelector('#modal-transferencia[data-open]', { timeout: 5_000 });

    const origenAntes = await page.locator('#transferencia-par-wrap input[name="cuentaOrigenId"]').inputValue();
    await page.click('[data-action="invertir-transferencia"]');
    const origenDespues = await page.locator('#transferencia-par-wrap input[name="cuentaOrigenId"]').inputValue();

    expect(origenDespues).not.toBe(origenAntes);
  });

  test('con 3+ cuentas: dos selectores independientes, la transferencia mueve el saldo correcto', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.cuentas = [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 300_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 900_000, activa: true },
        { id: 'c3', nombre: 'Daviplata', banco: 'Daviplata', tipo: 'Ahorros', saldo: 50_000, activa: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await page.click('[data-action="abrir-transferencia"]');
    await page.waitForSelector('#modal-transferencia[data-open]', { timeout: 5_000 });

    await expect(page.locator('#transferencia-par-wrap')).toHaveCount(0);
    await page.locator('input[name="cuentaOrigenId"][value="c2"]').check();
    await page.locator('input[name="cuentaDestinoId"][value="c3"]').check();
    await page.fill('#transferencia-monto', '50000');
    await page.click('#form-transferencia button[type="submit"]');
    await page.waitForSelector(modalCerrado('modal-transferencia'), { timeout: 5_000 });

    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));
    expect(st.cuentas.find(c => c.id === 'c2').saldo).toBe(850_000);
    expect(st.cuentas.find(c => c.id === 'c3').saldo).toBe(100_000);
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(300_000); // sin tocar
  });

  test('GMF (MC.17d): origen no exento descuenta monto + 4x1000 y lo traza en el ledger', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.cuentas = [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 300_000, activa: true, aplica4x1000: false },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 900_000, activa: true, aplica4x1000: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    await page.click('[data-action="abrir-transferencia"]');
    await page.waitForSelector('#modal-transferencia[data-open]', { timeout: 5_000 });

    // Origen por defecto = mayor saldo = Bancolombia (no exenta): el checkbox aparece marcado.
    const gmf = page.locator('input[name="aplicarGMF"]');
    await expect(gmf).toBeChecked();

    await page.fill('#transferencia-monto', '200000');
    await page.click('#form-transferencia button[type="submit"]');
    await page.waitForSelector(modalCerrado('modal-transferencia'), { timeout: 5_000 });

    await page.waitForTimeout(400); // save() debounced (ADN #5)
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));
    expect(st.cuentas.find(c => c.id === 'c2').saldo).toBe(699_200); // 900.000 - 200.000 - 800
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(500_000); // 300.000 + 200.000
    expect(st.transferencias[0].costoGMF).toBe(800);

    // El ledger de Movimientos traza el gravamen en el subtítulo de la fila.
    await page.goto('/#movimientos');
    await page.waitForSelector('#lista-movimientos', { timeout: 10_000 });
    const fila = page.locator('.list-item', { hasText: 'Nequi' }).first();
    await expect(fila.locator('.list-item__subtitle')).toContainText('incluye $800 de 4x1000');
  });
});

// ── Mis cuentas: CTA cruzado a Límites de gasto (MC.5e, ADR 017) ─────────────

test.describe('Mis cuentas - CTA cruzado a Límites de gasto', () => {
  test('la distribución sugerida siempre enlaza a Límites de gasto', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    const cta = page.locator('#ingresos-distribucion a[href="#presupuesto"]');
    await expect(cta).toBeVisible({ timeout: 3_000 });
    await expect(cta).toContainText('Ver tu seguimiento en Límites de gasto');
  });
});

// ── Mis cuentas: aporte de ahorro por objetivo en "Distribuir mi ingreso" (MC.7a/MC.7b, ADR 018) ──

test.describe('Mis cuentas - Distribuir mi ingreso: aporte por objetivo', () => {
  test('una meta con fecha muestra un aporte sugerido (no 0) y el fondo recibe el excedente', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      const futura = new Date();
      futura.setMonth(futura.getMonth() + 6);
      const fechaLimite = futura.toISOString().slice(0, 10);

      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { presetDistribucion: '50-30-20' }; // ahorro = 20% de 3.000.000 = 600.000
      st.metas = [{ id: 'm1', nombre: 'Viaje', montoObjetivo: 1_200_000, montoActual: 0, fechaLimite, completada: false }];
      st.ahorro = {
        fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 100_000 },
        aportes: [], compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    const inputMeta  = page.locator('input.distribuir__monto[data-dist-tipo="meta"][data-dist-id="m1"]');
    const inputFondo = page.locator('input.distribuir__monto[data-dist-tipo="fondo"]');
    await expect(inputMeta).toBeVisible({ timeout: 3_000 });

    const montoMeta  = Number(await inputMeta.inputValue());
    const montoFondo = Number(await inputFondo.inputValue());
    expect(montoMeta).toBeGreaterThan(0);
    expect(montoMeta).toBeLessThanOrEqual(1_200_000);
    expect(montoFondo).toBe(600_000 - montoMeta); // el fondo recibe el excedente, no el budget completo
  });

  test('una meta sin fecha sugiere 0 y muestra el hint invitando a ponerle fecha', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { presetDistribucion: '50-30-20' };
      st.metas = [{ id: 'm1', nombre: 'Viaje', montoObjetivo: 1_200_000, montoActual: 0, fechaLimite: null, completada: false }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    const inputMeta = page.locator('input.distribuir__monto[data-dist-tipo="meta"][data-dist-id="m1"]');
    await expect(inputMeta).toBeVisible({ timeout: 3_000 });
    await expect(inputMeta).toHaveValue('0');

    const hint = page.locator('.distribuir__hint a[href="#metas"]');
    await expect(hint).toBeVisible({ timeout: 3_000 });
  });

});

// ── Mis cuentas: checklist accionable de Necesidades (MC.7d, ADR 018 revisión 2026-07-02) ──

test.describe('Mis cuentas - Distribuir mi ingreso: checklist de Necesidades', () => {
  test('lista fijos mensuales y deudas, marcadas por defecto, con día de pago; excluye un fijo Quincenal', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.compromisos = [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', categoria: 'Arriendo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true },
        { id: 'cf2', descripcion: 'Mercado', tipo: 'fijo', categoria: 'Mercado', frecuencia: 'Quincenal', diaPago: 1, monto: 150_000, activo: true },
        { id: 'd1', descripcion: 'Tarjeta Bancolombia', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito', saldoTotal: 2_000_000, cuotaMensual: 250_000, diaPago: 15, activo: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    await expect(page.locator('[data-nec-toggle]')).toHaveCount(2); // cf1 + d1; cf2 (Quincenal) queda fuera
    await expect(page.locator('[data-nec-id="cf1"]')).toBeChecked();
    await expect(page.locator('[data-nec-id="d1"]')).toBeChecked();
    await expect(page.locator('[data-nec-id="cf2"]')).toHaveCount(0);

    const panel = page.locator('#distribuir-ingreso-panel');
    await expect(panel).toContainText('Arriendo');
    await expect(panel).toContainText('día 5');
    await expect(panel).toContainText('Tarjeta Bancolombia');
  });

  test('una Necesidad ya pagada este periodo aparece marcada, deshabilitada, con "Ya pagado"', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.compromisos = [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ];
      st.gastos = [{
        id: 'g1', descripcion: 'Pago: Arriendo', monto: 800_000, categoria: 'Gastos fijos',
        fecha: hoy, cuentaId: 'c1', compromisoId: 'cf1', nota: '',
      }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    const chk = page.locator('[data-nec-id="cf1"]');
    await expect(chk).toBeChecked();
    await expect(chk).toBeDisabled();
    await expect(page.locator('.distribuir__fila--pagado')).toContainText('Ya pagado');
  });

  test('confirmar con una Necesidad de fijo marcada registra el mismo pago que "Marcar pagado" y descuenta la cuenta', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.compromisos = [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page); // "Distribuir" vive en el último paso (MC.7d)
    await page.click('[data-action="confirmar-distribucion"]');

    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    // save() está debounced 200ms (ADN #5): esperar el flush antes de leer localStorage.
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(3_200_000); // 1.000.000 + 3.000.000 (ingreso) - 800.000 (pago)
    const gasto = st.gastos.find(g => g.compromisoId === 'cf1');
    expect(gasto).toBeTruthy();
    expect(gasto.monto).toBe(800_000);
    expect(gasto.categoria).toBe('Gastos fijos');
    expect(gasto.cuentaId).toBe('c1');
  });

  test('Deshacer revierte el pago de una Necesidad: borra el gasto y restaura el saldo de la cuenta', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.compromisos = [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page); // "Distribuir" vive en el último paso (MC.7d)
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.click('[data-action="deshacer-distribucion"]');

    // save() está debounced 200ms (ADN #5): esperar el flush antes de leer localStorage.
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000);
    expect(st.gastos.find(g => g.compromisoId === 'cf1')).toBeUndefined();
  });

  test('BUG-003: confirmar con una Necesidad ya pagada presente no la vuelve a pagar', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript((hoy) => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.compromisos = [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
        { id: 'cf2', descripcion: 'Internet', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 10, monto: 200_000, activo: true, categoria: null },
      ];
      st.gastos = [{
        id: 'g1', descripcion: 'Pago: Arriendo', monto: 800_000, categoria: 'Gastos fijos',
        fecha: hoy, cuentaId: 'c1', compromisoId: 'cf1', nota: '',
      }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    }, hoyLocal());

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    await expect(page.locator('[data-nec-id="cf1"]')).toBeChecked();
    await expect(page.locator('[data-nec-id="cf1"]')).toBeDisabled();

    // El resumen en vivo no debe contar la fila "Ya pagado": solo cf2 (200.000).
    await expect(page.locator('#distribuir-resumen')).toContainText('200.000');

    await avanzarDistribuirHasta(page);
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));

    expect(st.gastos.filter(g => g.compromisoId === 'cf1')).toHaveLength(1); // sigue existiendo solo el original
    expect(st.gastos.find(g => g.compromisoId === 'cf2')).toBeTruthy();
    // 1.000.000 + 3.000.000 (ingreso) - 200.000 (solo cf2, cf1 ya estaba pagado).
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(3_800_000);
  });

  test('BUG-004: el checklist topa la cuota de una deuda a su saldo pendiente y excluye una deuda saldada', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.compromisos = [
        { id: 'd1', descripcion: 'Tarjeta', tipo: 'deuda-entidad', saldoTotal: 50_000, cuotaMensual: 200_000, diaPago: 15, activo: true },
        { id: 'd2', descripcion: 'Ya saldada', tipo: 'deuda-entidad', saldoTotal: 0, cuotaMensual: 300_000, diaPago: 20, activo: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    // d1 aparece topada a su saldo (50.000, no 200.000); d2 no aparece (saldada).
    await expect(page.locator('[data-nec-id="d1"]')).toHaveAttribute('data-nec-monto', '50000');
    await expect(page.locator('[data-nec-id="d2"]')).toHaveCount(0);

    await avanzarDistribuirHasta(page);
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));

    const abono = st.gastos.find(g => g.compromisoId === 'd1');
    expect(abono.monto).toBe(50_000);
    expect(st.compromisos.find(c => c.id === 'd1').saldoTotal).toBe(0);
    // 1.000.000 + 3.000.000 (ingreso) - 50.000 (solo lo que realmente se debía).
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(3_950_000);
  });

  test('BUG-005: una cuota de manejo guardada con frecuencia "mensual" se migra a "Mensual" y aparece en el checklist', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      // Estado pre-fix (schema v19): la cuota de manejo nació con 'mensual' minúscula.
      // Al cargar, la migración v19→v20 debe capitalizarla, y entonces la cuota
      // entra al checklist de Necesidades (antes quedaba excluida por el filtro Mensual).
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st._version = 19;
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true,
        cuotaManejo: { monto: 15_000, diaCobro: 5 } }];
      st.compromisos = [
        { id: 'cm1', descripcion: 'Cuota de manejo Nequi', monto: 15_000, frecuencia: 'mensual',
          diaPago: 5, tipo: 'fijo', activo: true, cuentaId: 'c1', esCuotaManejo: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });

    // La migración v19→v20 corre en memoria (S) al cargar, como todas las
    // migraciones del proyecto (no fuerza un save; persiste en el próximo
    // guardado, idempotente en cada carga). El efecto observable es que la
    // cuota ya cuenta como Necesidad Mensual en el panel de distribución.
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await expect(page.locator('[data-nec-id="cm1"]')).toHaveCount(1);
    await expect(page.locator('[data-nec-id="cm1"]')).toHaveAttribute('data-nec-monto', '15000');

    // Al confirmar (dispara save), la frecuencia migrada ya queda persistida.
    await avanzarDistribuirHasta(page);
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });
    await page.waitForTimeout(400); // flush del save() debounced (ADN #5)
    const frec = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('fk_v1')).compromisos.find(c => c.id === 'cm1').frecuencia);
    expect(frec).toBe('Mensual');
  });
});

test.describe('Mis cuentas - Distribuir mi ingreso: abono extra a deudas (BUG-006)', () => {
  test('el abono extra a una deuda registra el gasto, baja el saldo y descuenta la cuenta una sola vez', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      // cuotaMensual 0: la deuda no aparece en el checklist de Necesidades, solo
      // en "Abonar extra a deudas". Así se aísla la ruta del abono extra (BUG-006).
      st.compromisos = [
        { id: 'd1', descripcion: 'Tarjeta', tipo: 'deuda-entidad', saldoTotal: 2_000_000, cuotaMensual: 0, diaPago: 15, activo: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    // No hay fila de checklist (cuotaMensual 0); sí un input de abono extra.
    await expect(page.locator('[data-nec-toggle]')).toHaveCount(0);
    const inputExtra = page.locator('.distribuir__monto[data-dist-tipo="deuda"]');
    await expect(inputExtra).toHaveCount(1);
    await inputExtra.fill('500000');

    await avanzarDistribuirHasta(page);
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.waitForTimeout(400); // flush del save() debounced (ADN #5)
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));

    // BUG-006: ahora existe el gasto-abono, con el mismo shape que el abono individual.
    const abono = st.gastos.find(g => g.compromisoId === 'd1');
    expect(abono).toBeTruthy();
    expect(abono.monto).toBe(500_000);
    expect(abono.categoria).toBe('Deudas');
    expect(abono.cuentaId).toBe('c1');
    // La deuda bajó y la cuenta se descontó una sola vez (tesorería centraliza el descuento).
    expect(st.compromisos.find(c => c.id === 'd1').saldoTotal).toBe(1_500_000);
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000 + 3_000_000 - 500_000);
  });

  test('Deshacer revierte el abono extra: borra el gasto y restaura el saldo de la deuda y la cuenta', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.compromisos = [
        { id: 'd1', descripcion: 'Tarjeta', tipo: 'deuda-entidad', saldoTotal: 2_000_000, cuotaMensual: 0, diaPago: 15, activo: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await page.locator('.distribuir__monto[data-dist-tipo="deuda"]').fill('500000');
    await avanzarDistribuirHasta(page);
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.click('[data-action="deshacer-distribucion"]');

    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));
    expect(st.gastos.find(g => g.compromisoId === 'd1')).toBeUndefined();
    expect(st.compromisos.find(c => c.id === 'd1').saldoTotal).toBe(2_000_000);
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000);
  });
});

test.describe('Mis cuentas - Distribuir mi ingreso: cuota del checklist + abono extra a la misma deuda no sobrepaga (BUG-009)', () => {
  test('el extra se topa a lo que queda tras la cuota marcada: la deuda llega a 0, nunca a negativo, y la cuenta se debita exactamente el saldo', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      // saldoTotal 300.000 con cuotaMensual 100.000: la deuda aparece a la vez en
      // el checklist (cuota, marcada por defecto) y en "Abonar extra a deudas".
      st.compromisos = [
        { id: 'd1', descripcion: 'Tarjeta', tipo: 'deuda-entidad', saldoTotal: 300_000, cuotaMensual: 100_000, diaPago: 15, activo: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    // La cuota (100.000) llega marcada por defecto en el checklist.
    const checklist = page.locator('[data-nec-toggle][data-nec-tipo="deuda"][data-nec-id="d1"]');
    await expect(checklist).toBeChecked();
    await expect(checklist).toHaveAttribute('data-nec-monto', '100000');

    // El usuario pide un extra de 300.000: más de lo que queda tras la cuota (200.000).
    // El abono extra vive en el paso 2 del asistente (MC.7d).
    await avanzarDistribuirHasta(page, '.distribuir__monto[data-dist-tipo="deuda"][data-dist-id="d1"]');
    const inputExtra = page.locator('.distribuir__monto[data-dist-tipo="deuda"][data-dist-id="d1"]');
    await inputExtra.fill('300000');

    // El resumen en vivo ya refleja el tope coordinado: asignado = 100.000 (cuota) + 200.000 (extra topado), no 400.000.
    await expect(page.locator('#distribuir-resumen')).toContainText('Asignado: $300.000');

    await avanzarDistribuirHasta(page);
    await page.click('[data-action="confirmar-distribucion"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.waitForTimeout(400); // flush del save() debounced (ADN #5)
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));

    // La deuda queda exactamente en 0, nunca negativa.
    expect(st.compromisos.find(c => c.id === 'd1').saldoTotal).toBe(0);
    // La suma de los dos gastos (cuota + extra topado) es el saldo real de la deuda, no más.
    const gastosDeuda = st.gastos.filter(g => g.compromisoId === 'd1');
    const totalAbonado = gastosDeuda.reduce((s, g) => s + g.monto, 0);
    expect(totalAbonado).toBe(300_000);
    // La cuenta se debita exactamente el saldo pagado, no cuota + extra sin topar (400.000).
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000 + 3_000_000 - 300_000);
  });
});

// ── Mis cuentas: asistente paginado + presupuesto sobre el remanente (MC.7d, ADR 018 R3) ──

test.describe('Mis cuentas - Distribuir mi ingreso: asistente paginado (MC.7d)', () => {
  test('el panel navega Necesidades → Ahorro → Estilo de vida con Atrás/Siguiente y confirma solo al final', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.config = { presetDistribucion: '50-30-20' };
      st.compromisos = [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ];
      st.ahorro = {
        fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 },
        aportes: [], compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    const indicador = page.locator('[data-dist-paso-indicador]');
    const atras     = page.locator('[data-action="distribuir-paso-atras"]');
    const siguiente = page.locator('[data-action="distribuir-paso-siguiente"]');
    const confirmar = page.locator('[data-action="confirmar-distribucion"]');

    // Paso 1: Necesidades visible, los demás ocultos; sin Atrás ni Distribuir.
    await expect(indicador).toHaveText('Paso 1 de 3: Necesidades');
    await expect(page.locator('[data-dist-paso="0"]')).toBeVisible();
    await expect(page.locator('[data-dist-paso="1"]')).toBeHidden();
    await expect(page.locator('[data-nec-id="cf1"]')).toBeVisible();
    await expect(atras).toBeHidden();
    await expect(siguiente).toBeVisible();
    await expect(confirmar).toBeHidden();

    // Paso 2: asignaciones (fondo) visible, checklist oculta, aparece Atrás.
    await siguiente.click();
    await expect(indicador).toHaveText('Paso 2 de 3: Ahorro, deudas e inversiones');
    await expect(page.locator('.distribuir__monto[data-dist-tipo="fondo"]')).toBeVisible();
    await expect(page.locator('[data-nec-id="cf1"]')).toBeHidden();
    await expect(atras).toBeVisible();

    // Paso 3 (último): Estilo de vida + Distribuir; Siguiente desaparece.
    await siguiente.click();
    await expect(indicador).toHaveText('Paso 3 de 3: Estilo de vida');
    await expect(page.locator('[data-dist-info="estiloVida"]')).toBeVisible();
    await expect(confirmar).toBeVisible();
    await expect(siguiente).toBeHidden();

    // Atrás regresa al paso 2 y Distribuir vuelve a ocultarse.
    await atras.click();
    await expect(indicador).toHaveText('Paso 2 de 3: Ahorro, deudas e inversiones');
    await expect(confirmar).toBeHidden();
  });

  test('MC.7f: al avanzar/retroceder el foco se mueve al contenedor del paso (a11y)', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      st.config = { presetDistribucion: '50-30-20' };
      st.compromisos = [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true, categoria: null },
      ];
      st.ahorro = {
        fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 },
        aportes: [], compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    // Apertura inicial: el foco real es el monto a distribuir, no el paso 1.
    await expect(page.locator('#distribuir-monto')).toBeFocused();

    await page.click('[data-action="distribuir-paso-siguiente"]');
    await expect(page.locator('[data-dist-paso="1"]')).toBeFocused();

    await page.click('[data-action="distribuir-paso-atras"]');
    await expect(page.locator('[data-dist-paso="0"]')).toBeFocused();
  });

  test('MC.7f: con un solo paso no se muestra el indicador "Paso X de N"', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      // Sin compromisos, sin ahorro/metas/apartados/inversiones: el único
      // contenido accionable es el reparto de Estilo de vida entre cuentas
      // (MC.7e), así que el asistente arranca y termina en un solo paso.
      st.cuentas = [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    await expect(page.locator('[data-dist-paso-indicador]')).toHaveCount(0);
    await expect(page.locator('[data-action="distribuir-paso-siguiente"]')).toBeHidden();
    await expect(page.locator('[data-action="confirmar-distribucion"]')).toBeVisible();
  });

  test('MC.7f: sin Necesidades marcables, el Paso 2 no muestra la sugerencia de ahorro si no hay dónde ponerla', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      // Sin fondo activo, sin metas ni apartados: ninguna fila de Ahorro. Con una
      // deuda para que el paso 2 sí exista (abono extra), sin mostrar el hint de
      // "sugerencia de ahorro" (estado vacío corregido en MC.7f).
      st.compromisos = [
        { id: 'd1', descripcion: 'Tarjeta', tipo: 'deuda-entidad', saldoTotal: 2_000_000, cuotaMensual: 0, diaPago: 15, activo: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    await expect(page.locator('text=💰 Ahorro, deudas e inversiones · ajusta cuánto destinar a cada una:')).toBeVisible();
    await expect(page.locator('[data-dist-sugerencia-ahorro]')).toHaveCount(0);
    await expect(page.locator('.distribuir__monto[data-dist-tipo="deuda"]')).toBeVisible();
  });

  test('R3: la sugerencia de ahorro se recalcula sobre el remanente real y respeta la edición manual del fondo', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      // Preset 50-30-20: teórico de ahorro = 600.000. El arriendo de 2.700.000
      // (marcado por defecto) deja un remanente de 300.000, que se reparte
      // 20:30 entre Ahorro y Estilo de vida: 120.000 y 180.000.
      st.config = { presetDistribucion: '50-30-20' };
      st.compromisos = [
        { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, monto: 2_700_000, activo: true, categoria: null },
      ];
      st.ahorro = {
        fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 },
        aportes: [], compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');

    const fondo = page.locator('.distribuir__monto[data-dist-tipo="fondo"]');
    const hint  = page.locator('[data-dist-sugerencia-ahorro]');
    const ev    = page.locator('[data-dist-info="estiloVida"]');

    // Con el arriendo marcado, la sugerencia sale del remanente (no del 20% teórico).
    await expect(fondo).toHaveValue('120000');
    await expect(hint).toHaveText('$120.000');
    await expect(ev).toHaveText('$180.000');

    // Desmarcar el arriendo libera remanente: la sugerencia sube en vivo,
    // topada al teórico del split (600.000, no el 40% del remanente).
    await page.locator('[data-nec-id="cf1"]').uncheck();
    await expect(fondo).toHaveValue('600000');
    await expect(hint).toHaveText('$600.000');
    await expect(ev).toHaveText('$900.000');

    // Editar el fondo a mano lo saca del modo automático: re-marcar el
    // arriendo actualiza el hint pero ya no pisa el valor del usuario.
    await avanzarDistribuirHasta(page, '.distribuir__monto[data-dist-tipo="fondo"]');
    await fondo.fill('50000');
    await page.locator('[data-action="distribuir-paso-atras"]').click();
    await page.locator('[data-nec-id="cf1"]').check();
    await expect(hint).toHaveText('$120.000');
    await expect(fondo).toHaveValue('50000');
  });
});

// ── Mis cuentas: Paso 3 accionable, reparto de Estilo de vida entre cuentas (MC.7e, ADR 018 decisión 4) ──

test.describe('Mis cuentas - Distribuir mi ingreso: reparto de Estilo de vida entre cuentas (MC.7e)', () => {
  test('con una sola cuenta activa, el paso final es solo informativo (sin filas de transferencia)', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
      // El fondo activo asegura que el panel tenga contenido que mostrar
      // (Ahorro): sin él, con una sola cuenta y sin compromisos, no habría
      // ningún destino ni Necesidad, y el botón "Distribuir" no aparecería.
      st.ahorro = {
        fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 },
        aportes: [], compromisoMensual: 0,
      };
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page);

    await expect(page.locator('.distribuir__monto[data-dist-tipo="cuenta"]')).toHaveCount(0);
    await expect(page.locator('text=¿Quieres mover parte a otras cuentas?')).toHaveCount(0);
  });

  test('con 2+ cuentas, el usuario reparte Estilo de vida sin marcar nada por defecto (todo queda en la cuenta de origen)', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { presetDistribucion: '50-30-20' }; // Estilo de vida = 30% de 3.000.000 = 900.000
      st.cuentas = [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page);

    // Dos filas de cuenta (Nequi con más saldo primero), ambas sin marcar por defecto.
    const filasCuenta = page.locator('.distribuir__monto[data-dist-tipo="cuenta"]');
    await expect(filasCuenta).toHaveCount(2);
    const filaNequiDiv = page.locator('.distribuir__fila').filter({ has: page.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c1"]') });
    const filaNequi = filaNequiDiv.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c1"]');
    const toggleNequi = filaNequiDiv.locator('[data-dist-destino-toggle]');
    await expect(toggleNequi).not.toBeChecked();
    await expect(filaNequi).toBeDisabled();

    await expect(page.locator('#distribuir-cuentas-resumen')).toContainText('Repartido entre cuentas: $0 de $900.000 disponibles.');
  });

  test('marcar una transferencia se refleja en el resumen y bloquea "Distribuir" si excede el presupuesto de Estilo de vida', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { presetDistribucion: '50-30-20' }; // Estilo de vida = 30% de 3.000.000 = 900.000
      st.cuentas = [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page);

    const filaBancolombiaDiv = page.locator('.distribuir__fila').filter({ has: page.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c2"]') });
    const filaBancolombia = filaBancolombiaDiv.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c2"]');
    const toggleBancolombia = filaBancolombiaDiv.locator('[data-dist-destino-toggle]');
    await toggleBancolombia.check();
    await filaBancolombia.fill('300000');

    await expect(page.locator('#distribuir-cuentas-resumen')).toContainText('Repartido entre cuentas: $300.000 de $900.000 disponibles.');
    await expect(page.locator('[data-action="confirmar-distribucion"]')).toBeEnabled();

    // Pedir más de lo disponible en Estilo de vida bloquea la confirmación.
    await filaBancolombia.fill('1000000');
    await expect(page.locator('#distribuir-cuentas-resumen')).toContainText('más de los $900.000 de Estilo de vida disponibles');
    await expect(page.locator('[data-action="confirmar-distribucion"]')).toBeDisabled();
  });

  test('confirmar con una transferencia marcada mueve el saldo entre cuentas (sin afectar Necesidades ni Ahorro)', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { presetDistribucion: '50-30-20' }; // Estilo de vida = 30% de 3.000.000 = 900.000
      st.cuentas = [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page);

    const filaBancolombiaDiv = page.locator('.distribuir__fila').filter({ has: page.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c2"]') });
    const filaBancolombia = filaBancolombiaDiv.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c2"]');
    const toggleBancolombia = filaBancolombiaDiv.locator('[data-dist-destino-toggle]');
    await toggleBancolombia.check();
    await filaBancolombia.fill('300000');

    await page.click('[data-action="confirmar-distribucion"]');
    // Con 2 cuentas, resolverCuenta abre un picker: la de mayor saldo aparece
    // primero y recibe foco; Nequi (mayor saldo) queda como cuenta de origen.
    await page.click('[data-role="elegir"][data-cuenta-id="c1"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.waitForTimeout(400); // flush del save() debounced (ADN #5)
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));

    // Bancolombia recibió la transferencia; Nequi (origen) la descontó junto al resto.
    expect(st.cuentas.find(c => c.id === 'c2').saldo).toBe(500_000 + 300_000);
    // Nequi: 1.000.000 + 3.000.000 (ingreso) - 300.000 (transferencia a Bancolombia).
    // Sin Necesidades ni Ahorro marcados en este estado (sin compromisos ni fondo activo).
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000 + 3_000_000 - 300_000);
  });

  test('Deshacer revierte la transferencia entre cuentas junto con el resto de la distribución', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
      st.config = { presetDistribucion: '50-30-20' }; // Estilo de vida = 30% de 3.000.000 = 900.000
      st.cuentas = [
        { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true },
        { id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });

    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="toggle-distribuir-ingreso"]');
    await avanzarDistribuirHasta(page);

    const filaBancolombiaDiv = page.locator('.distribuir__fila').filter({ has: page.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c2"]') });
    const filaBancolombia = filaBancolombiaDiv.locator('.distribuir__monto[data-dist-tipo="cuenta"][data-dist-id="c2"]');
    const toggleBancolombia = filaBancolombiaDiv.locator('[data-dist-destino-toggle]');
    await toggleBancolombia.check();
    await filaBancolombia.fill('300000');

    await page.click('[data-action="confirmar-distribucion"]');
    await page.click('[data-role="elegir"][data-cuenta-id="c1"]');
    await expect(page.locator('#snackbar-distribucion')).toBeVisible({ timeout: 3_000 });

    await page.click('[data-action="deshacer-distribucion"]');

    await page.waitForTimeout(400);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('fk_v1')));
    expect(st.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000);
    expect(st.cuentas.find(c => c.id === 'c2').saldo).toBe(500_000);
  });
});

// ── SUITE: Agenda - día de ingreso (ADR 021) ─────────────────────────────────
// El día de pago de un ingreso activo aparece en el calendario como evento
// propio, y su CTA "Distribuir" navega a Mis cuentas y abre el asistente
// "Distribuir mi ingreso" (una sola fuente de verdad para el reparto).

test.describe('Agenda - día de ingreso (ADR 021)', () => {
  test('el día de pago muestra el evento y Distribuir abre el asistente en Mis cuentas', async ({ page }) => {
    // El día de pago es HOY: así el gating por fecha del asistente (MC.4d)
    // queda en 'listo' y el panel existe al llegar desde el calendario.
    const diaPago = new Date().getDate();

    await page.addInitScript(({ diaPago }) => {
      const estado = {
        version:   1,
        perfil:    { nombre: 'TestUser', smmlv: 1750905 },
        onboarded: true,
        cuentas:   [
          { id: 'cta-ing-e2e', nombre: 'Nequi', tipo: 'Billetera digital', saldo: 500000, activa: true },
          { id: 'cta-ing-e2e-2', nombre: 'Bancolombia', tipo: 'Ahorros', saldo: 200000, activa: true },
        ],
        ingresos:  [{
          id: 'ing-e2e', descripcion: 'Salario', monto: 2000000,
          frecuencia: 'Mensual', diaPago, categoria: null, activo: true,
          fechaCreacion: '2026-01-10T10:00:00Z',
        }],
        gastos: [], compromisos: [],
        // Una meta con fecha: destino de ahorro fondeable para que el
        // asistente tenga pasos que mostrar.
        metas: [{
          id: 'meta-ing-e2e', nombre: 'Viaje', montoObjetivo: 3000000,
          montoActual: 0, fechaLimite: '2027-06-01', completada: false,
          fechaCreacion: '2026-01-10T10:00:00Z',
        }],
      };
      localStorage.setItem('fk_v1', JSON.stringify(estado));
    }, { diaPago });

    await page.goto('/#agenda');
    await page.waitForSelector('#panel-agenda', { timeout: 10_000 });

    // El día del ingreso es interactivo y su detalle muestra el evento verde.
    await page.locator(`[data-action="agenda-mostrar-dia"][data-day="${diaPago}"]`).click();

    const item = page.locator('.cal-detail__item--ingreso');
    await expect(item).toBeVisible({ timeout: 3_000 });
    await expect(item).toContainText('Salario');

    // El CTA navega a Mis cuentas y abre el asistente.
    await item.locator('[data-action="agenda-distribuir-ingreso"]').click();

    await expect(page).toHaveURL(/#tesoreria/);
    const panel = page.locator('#distribuir-ingreso-panel');
    await expect(panel).toBeVisible({ timeout: 3_000 });
  });
});

// ── SUITE: Apartados - selector de ícono compacto (CAT.2c) ───────────────────

test.describe('Apartados - selector de ícono compacto (CAT.2c)', () => {

  test('crear un apartado con una plantilla rápida conserva su emoji propio', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#apartados');
    await page.waitForSelector('#sec-apartados.active', { timeout: 10_000 });
    await page.click('[data-action="nuevo-apartado"]');
    await page.waitForSelector('#modal-apartado[data-open]');

    const form = page.locator('#modal-apartado-body form');
    // La plantilla SOAT (🚗) rellena nombre + ícono sin pasar por la grilla
    // del picker: el emoji curado de la plantilla se conserva tal cual.
    await form.locator('[data-action="apartado-plantilla"][data-nombre="SOAT"]').click();
    await expect(form.locator('#apartado-nombre')).toHaveValue('SOAT');
    await form.locator('#apartado-objetivo').fill('300000');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-apartado'), { timeout: 5_000 });

    const titulo = page.locator('#lista-apartados .list-item__title');
    await expect(titulo).toContainText('SOAT');
    await expect(titulo).toContainText('🚗');
  });

  test('crear un apartado con nombre propio y un ícono elegido en el picker', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#apartados');
    await page.waitForSelector('#sec-apartados.active', { timeout: 10_000 });
    await page.click('[data-action="nuevo-apartado"]');
    await page.waitForSelector('#modal-apartado[data-open]');

    const form = page.locator('#modal-apartado-body form');
    await form.locator('#apartado-nombre').fill('Repuestos del carro');
    // El selector nace como recuadro colapsado (CAT.2): tocarlo despliega la
    // grilla; elegir un ícono la cierra de nuevo.
    await form.locator('[data-icono-picker="apartado-icono"] .icono-picker__recuadro').click();
    await form.locator('[data-icono-picker="apartado-icono"] [data-icon="c-carro"]').click();
    await expect(form.locator('[data-icono-picker="apartado-icono"] .icono-picker__panel')).toBeHidden();
    await form.locator('#apartado-objetivo').fill('500000');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-apartado'), { timeout: 5_000 });

    const titulo = page.locator('#lista-apartados .list-item__title');
    await expect(titulo).toContainText('Repuestos del carro');
    await expect(titulo.locator('use[href="#c-carro"]')).toHaveCount(1);
  });

  test('elegir una plantilla y luego cambiar el ícono a mano reemplaza el emoji de la plantilla', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#apartados');
    await page.waitForSelector('#sec-apartados.active', { timeout: 10_000 });
    await page.click('[data-action="nuevo-apartado"]');
    await page.waitForSelector('#modal-apartado[data-open]');

    const form = page.locator('#modal-apartado-body form');
    await form.locator('[data-action="apartado-plantilla"][data-nombre="Regalos"]').click();
    // El usuario se arrepiente del emoji de la plantilla y elige uno propio.
    await form.locator('[data-icono-picker="apartado-icono"] .icono-picker__recuadro').click();
    await form.locator('[data-icono-picker="apartado-icono"] [data-icon="c-torta"]').click();
    await form.locator('#apartado-objetivo').fill('200000');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-apartado'), { timeout: 5_000 });

    const titulo = page.locator('#lista-apartados .list-item__title');
    await expect(titulo.locator('use[href="#c-torta"]')).toHaveCount(1);
  });

});

// ── SUITE: Deudas - selector de ícono para categoría "Otra"/"Otro" (CAT.2d) ──

test.describe('Deudas - picker de ícono en categoría "Otra"/"Otro" (CAT.2d)', () => {

  test('crear una deuda con entidad y categoría "Otra" con ícono elegido queda en la lista', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#compromisos');
    await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
    await page.click('[data-action="nuevo-compromiso"]');
    await page.waitForSelector('#modal-compromiso[data-open]');

    await page.click('[data-action="comp-elegir-tipo"][data-tipo="deuda-entidad"]');

    const form = page.locator('#modal-compromiso-body form');
    await form.locator('#comp-categoria').selectOption('Otra');
    // El picker (oculto salvo con "Otra") se despliega al tocar el recuadro.
    await expect(form.locator('#grupo-comp-icono')).toBeVisible();
    await form.locator('[data-icono-picker="comp-icono"] .icono-picker__recuadro').click();
    await form.locator('[data-icono-picker="comp-icono"] [data-icon="c-avion"]').click();
    await form.locator('#comp-descripcion').fill('Crédito de viaje');
    await form.locator('#comp-saldo').fill('2000000');
    await form.locator('#comp-cuota').fill('200000');
    await form.locator('#comp-dia').fill('10');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-compromiso'), { timeout: 5_000 });

    const card = page.locator('.deuda-card', { hasText: 'Crédito de viaje' });
    await expect(card.locator('.deuda-card__icon .cat-teja use[href="#c-avion"]')).toHaveCount(1);
    await expect(card.locator('.deuda-card__chip--entidad use[href="#c-avion"]')).toHaveCount(1);
  });

  test('sin elegir "Otra", el picker de ícono permanece oculto', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#compromisos');
    await page.waitForSelector('#sec-compromisos.active', { timeout: 10_000 });
    await page.click('[data-action="nuevo-compromiso"]');
    await page.waitForSelector('#modal-compromiso[data-open]');

    await page.click('[data-action="comp-elegir-tipo"][data-tipo="deuda-personal"]');

    const form = page.locator('#modal-compromiso-body form');
    await expect(form.locator('#grupo-comp-icono')).toBeHidden();
    await form.locator('#comp-categoria').selectOption('Familiar');
    await expect(form.locator('#grupo-comp-icono')).toBeHidden();
    await form.locator('#comp-categoria').selectOption('Otro');
    await expect(form.locator('#grupo-comp-icono')).toBeVisible();
  });

});

// ── SUITE: Mis cuentas - picker de ícono para banco "Otro" (CAT.2e) ──────────

test.describe('Mis cuentas - picker de ícono para banco "Otro" (CAT.2e)', () => {

  test('crear una cuenta con banco "Otro" y un ícono elegido queda en la teja de la lista', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');

    const form = page.locator('#modal-cuenta-body form');
    await form.locator('.bank-picker__trigger').click();
    await page.waitForSelector('#banco-list:not([hidden])', { timeout: 5_000 });
    await page.locator('#banco-list .bank-picker__item[data-value="Otro"]').click();

    await expect(form.locator('#form-group-icono')).toBeVisible();
    await form.locator('[data-icono-picker="cuenta-icono"] .icono-picker__recuadro').click();
    await form.locator('[data-icono-picker="cuenta-icono"] [data-icon="c-avion"]').click();

    await form.locator('#cuenta-tipo').selectOption('Ahorros');
    await form.locator('[name="saldo"]').fill('100000');
    await form.locator('button[type="submit"]').click();

    await page.waitForSelector(modalCerrado('modal-cuenta'), { timeout: 5_000 });

    const teja = page.locator('#lista-tesoreria .cuenta-card__icon .bank-avatar');
    await expect(teja.locator('use[href="#c-avion"]')).toHaveCount(1);
  });

  test('sin elegir "Otro", el picker de ícono permanece oculto; volver a un banco con glifo lo oculta de nuevo', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#tesoreria');
    await page.waitForSelector('#sec-tesoreria.active', { timeout: 10_000 });
    await page.click('[data-action="nueva-cuenta"]');
    await page.waitForSelector('#modal-cuenta[data-open]');

    const form = page.locator('#modal-cuenta-body form');
    await expect(form.locator('#form-group-icono')).toBeHidden();

    await form.locator('.bank-picker__trigger').click();
    await page.waitForSelector('#banco-list:not([hidden])', { timeout: 5_000 });
    await page.locator('#banco-list .bank-picker__item[data-value="Otro"]').click();
    await expect(form.locator('#form-group-icono')).toBeVisible();

    await form.locator('.bank-picker__trigger').click();
    await page.waitForSelector('#banco-list:not([hidden])', { timeout: 5_000 });
    await page.locator('#banco-list .bank-picker__item[data-value="Nequi"]').click();
    await expect(form.locator('#form-group-icono')).toBeHidden();
  });

});

// ── SUITE: Análisis v2 - score hero + chip de mes (ANL.2a, ADR 038) ──────────

test.describe('Análisis v2 - score hero + chip de mes (ANL.2a)', () => {

  test('el score se presenta como hero con anillo, pill de banda y 4 factores; el chip del header muestra el mes', async ({ page }) => {
    await saltearOnboarding(page);
    // Una cuenta con saldo + un gasto del mes: datos suficientes para que el
    // panel calcule un score real (banda distinta de "sin datos").
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      const d = new Date();
      const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      st.cuentas = [{ id: 'cu1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 2_000_000, activa: true }];
      st.gastos  = [{ id: 'g1', descripcion: 'Mercado', monto: 300_000, categoria: 'Mercado', fecha: hoy, cuentaId: 'cu1' }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#analisis');
    await page.waitForSelector('#sec-analisis.active', { timeout: 10_000 });

    const hero = page.locator('.score-hero');
    await expect(hero).toBeVisible();
    await expect(hero.locator('.progress-ring')).toBeVisible();
    await expect(hero.locator('.score-hero__num')).toHaveText(/^\d+$/);
    await expect(hero.locator('.score-hero__pill')).toHaveText(/Excelente|Buena|Ajustada|Crítica/);
    await expect(hero.locator('.score-hero__factor')).toHaveCount(4);

    const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    await expect(page.locator('#analisis-chip-mes-label')).toHaveText(MESES[new Date().getMonth()]);
  });

  test('el ojo del patrimonio enmascara neto, activos y pasivos (ANL.2b)', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      st.cuentas = [{ id: 'cu1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 800_000, activa: true }];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#analisis');
    await page.waitForSelector('#sec-analisis.active', { timeout: 10_000 });

    const card = page.locator('.patri-card');
    await expect(card.locator('.patri-card__valor')).toHaveText('$800.000');

    await page.click('[data-action="analisis-saldo-visibilidad"]');
    await expect(card.locator('.patri-card__valor')).toHaveText('$••••••');
    await expect(card.locator('.patri-card__col-valor').first()).toHaveText('••••');
    await expect(page.locator('#analisis-saldo-ojo')).toHaveAttribute('aria-pressed', 'true');

    await page.click('[data-action="analisis-saldo-visibilidad"]');
    await expect(card.locator('.patri-card__valor')).toHaveText('$800.000');
  });

  test('"A dónde va tu dinero" agrupa tendencia (chip de variación) y categorías (top al centro) (ANL.2c)', async ({ page }) => {
    await saltearOnboarding(page);
    await page.addInitScript(() => {
      const st = JSON.parse(localStorage.getItem('fk_v1') || '{}');
      const d = new Date();
      const fecha = (offset, dia) => {
        const x = new Date(d.getFullYear(), d.getMonth() + offset, dia);
        return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
      };
      st.cuentas = [{ id: 'cu1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 2_000_000, activa: true }];
      st.gastos = [
        { id: 'g1', descripcion: 'Mercado', monto: 400_000, categoria: 'Mercado', fecha: fecha(-1, 2), cuentaId: 'cu1' },
        { id: 'g2', descripcion: 'Mercado', monto: 300_000, categoria: 'Mercado', fecha: fecha(0, 2), cuentaId: 'cu1' },
      ];
      localStorage.setItem('fk_v1', JSON.stringify(st));
    });
    await page.goto('/#analisis');
    await page.waitForSelector('#sec-analisis.active', { timeout: 10_000 });

    const grupo = page.locator('.analisis__group');
    await expect(grupo.locator('.analisis__group-label')).toHaveText('A dónde va tu dinero');
    // Bajó el gasto → chip verde con la variación (ADR 019: solo bajar se celebra).
    await expect(grupo.locator('.tend-card__chip')).toContainText('↓ 25% vs mes anterior');
    await expect(grupo.locator('.tend-card__stat')).toHaveCount(3);
    await expect(grupo.locator('.catg-card__centro-cat')).toHaveText('Mercado');
    await expect(grupo.locator('.catg-card__total')).toHaveText('$300.000');
  });

  test('sin ningún dato, Análisis muestra un único empty state y su CTA abre el registro de gasto (ANL.2d)', async ({ page }) => {
    await saltearOnboarding(page);
    await page.goto('/#analisis');
    await page.waitForSelector('#sec-analisis.active', { timeout: 10_000 });

    // Un solo empty state: sin hero de score, sin patrimonio, sin colapsables.
    const empty = page.locator('.analisis-empty');
    await expect(empty).toBeVisible();
    await expect(empty.locator('.analisis-empty__title')).toHaveText('Aún no hay suficientes datos');
    await expect(page.locator('.score-hero')).toHaveCount(0);
    await expect(page.locator('.patri-card')).toHaveCount(0);
    await expect(page.locator('#panel-analisis .analisis-grupo')).toHaveCount(0);

    // El CTA reutiliza la acción global de gasto: abre el modal.
    await empty.locator('[data-action="nuevo-gasto"]').click();
    await page.waitForSelector('#modal-gasto[data-open]');
  });

});
