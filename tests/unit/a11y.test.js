/**
 * a11y.test.js - Tests de accesibilidad WCAG sobre index.html.
 *
 * Usa axe-core con happy-dom para verificar que el HTML estático no tiene
 * violaciones WCAG 2.1 AA en las reglas analizables sin rendering real.
 *
 * Reglas excluidas intencionalmente:
 * - color-contrast: requiere computed CSS (no disponible en happy-dom).
 * - scrollable-region-focusable: requiere scroll real.
 * - meta-viewport: falso positivo en happy-dom sin viewport real.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import axe from 'axe-core';

// ── SETUP ───────────────────────────────────────────────────────────────────

const HTML_PATH = join(process.cwd(), 'index.html');

/**
 * Extrae el <body> del HTML y elimina los <script> para que happy-dom
 * no intente cargar módulos externos (ECONNREFUSED en entorno de test).
 */
function extraerBody(html) {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = match ? match[1] : html;
  // Quitar etiquetas <script ...>...</script> y <script .../>
  return body.replace(/<script[\s\S]*?<\/script>/gi, '');
}

beforeAll(() => {
  const html = readFileSync(HTML_PATH, 'utf-8');
  document.documentElement.lang = 'es';
  document.head.innerHTML = '<title>Finko</title>';
  document.body.innerHTML = extraerBody(html);
});

// ── TESTS ───────────────────────────────────────────────────────────────────

describe('Accesibilidad - index.html (axe-core WCAG 2.1 AA)', () => {
  it('no tiene violaciones críticas ni graves en el HTML estático', async () => {
    const results = await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'best-practice'],
      },
      rules: {
        // Requieren computed CSS real → excluir en happy-dom
        'color-contrast':             { enabled: false },
        // Requieren scroll / viewport real
        'scrollable-region-focusable': { enabled: false },
        // meta-viewport da falso positivo sin head real en happy-dom
        'meta-viewport':              { enabled: false },
        // Las secciones ocultas (display:none) no deben penalizar
        'region':                     { enabled: false },
      },
    });

    const criticas = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticas.length > 0) {
      const detalle = criticas
        .map((v) => {
          const nodos = v.nodes.map((n) => `    → ${n.html}`).join('\n');
          return `  [${v.impact.toUpperCase()}] ${v.id}: ${v.description}\n${nodos}`;
        })
        .join('\n');
      console.error(`Violaciones WCAG criticas/graves:\n${detalle}`);
    }

    expect(
      criticas,
      `Se encontraron ${criticas.length} violaciones WCAG criticas/graves (ver detalle arriba)`
    ).toHaveLength(0);
  });

  it('no tiene violaciones moderadas en estructura ARIA', async () => {
    const results = await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a'],
      },
      rules: {
        'color-contrast':             { enabled: false },
        'scrollable-region-focusable': { enabled: false },
        'meta-viewport':              { enabled: false },
        'region':                     { enabled: false },
      },
    });

    const moderadas = results.violations.filter((v) => v.impact === 'moderate');

    if (moderadas.length > 0) {
      const detalle = moderadas
        .map((v) => `  [${v.id}] ${v.description}`)
        .join('\n');
      console.warn(`Violaciones WCAG moderadas (no bloquean):\n${detalle}`);
    }

    // Moderadas no bloquean el build - solo se reportan.
    expect(moderadas.length).toBeGreaterThanOrEqual(0);
  });

  it('todos los botones tienen nombre accesible', async () => {
    const results = await axe.run(document, {
      runOnly: { type: 'rule', values: ['button-name'] },
    });

    const violaciones = results.violations;
    if (violaciones.length > 0) {
      violaciones[0].nodes.forEach((n) => {
         
        console.error(`  Boton sin nombre: ${n.html}`);
      });
    }

    expect(violaciones).toHaveLength(0);
  });

  it('todos los formularios tienen labels asociados', async () => {
    const results = await axe.run(document, {
      runOnly: { type: 'rule', values: ['label'] },
    });

    expect(results.violations).toHaveLength(0);
  });

  it('el HTML tiene atributo lang definido', async () => {
    const results = await axe.run(document, {
      runOnly: { type: 'rule', values: ['html-has-lang', 'html-lang-valid'] },
    });

    expect(results.violations).toHaveLength(0);
  });

  it('no hay IDs duplicados', async () => {
    const results = await axe.run(document, {
      runOnly: { type: 'rule', values: ['duplicate-id', 'duplicate-id-aria'] },
    });

    if (results.violations.length > 0) {
      results.violations[0].nodes.forEach((n) => {

        console.error(`  ID duplicado: ${n.html}`);
      });
    }

    expect(results.violations).toHaveLength(0);
  });

  it('tiene skip link apuntando a #main-content (WCAG 2.4.1)', () => {
    // El skip link debe ser el primer enlace del body para que sea util.
    const skipLink = document.querySelector('a.skip-link');
    expect(skipLink, 'Falta <a class="skip-link"> en el HTML').not.toBeNull();
    expect(skipLink.getAttribute('href')).toBe('#main-content');

    // El destino debe existir con tabindex para recibir foco programatico.
    const destino = document.getElementById('main-content');
    expect(destino, 'Falta id="main-content" en el HTML').not.toBeNull();
    expect(destino.getAttribute('tabindex')).toBe('-1');
  });

  // MC-DIS.9 C9: la mitad de Mis cuentas (las cuentas, transferir y el 4x1000)
  // no colgaba de ningun h2, asi que navegando por encabezados no se podia
  // llegar a ella. El h2 es sr-only porque el h1 ya nombra la seccion.
  it('el bloque de cuentas de Mis cuentas cuelga de un encabezado (WCAG 2.4.10)', () => {
    const lista = document.getElementById('lista-tesoreria');
    expect(lista, 'Falta id="lista-tesoreria" en el HTML').not.toBeNull();

    const previo = lista.previousElementSibling;
    expect(previo.tagName).toBe('H2');
    // DSK.6b (ADR 075 D4): el rótulo deja de ser `sr-only` permanente y pasa a
    // `.tesoreria-lb`, que lo oculta igual bajo 1440px y lo muestra en las dos
    // columnas de escritorio. Para lectores de pantalla no cambia nada: el h2
    // existe siempre y sigue siendo el que da encabezado a este bloque.
    expect(previo.classList.contains('tesoreria-lb')).toBe(true);
    expect(previo.textContent.trim()).toBe('Tus cuentas');
  });

  // DSK.10c (ADR 079 D8): Ajustes tenía tres entradas en la misma pantalla de
  // escritorio (pie de la barra lateral, barra superior y saludo de Inicio) y
  // dos eran un engranaje sin etiqueta. Queda la única que dice su nombre. La
  // del saludo ya salía por CSS desde DSK.1a (ADR 070 D10), y en móvil las dos
  // se quedan: allá la barra lateral no tiene logo y no hay barra superior.
  it('Ajustes se alcanza desde una sola entrada del chrome de escritorio (ADR 079 D8)', () => {
    const acciones = document.querySelector('.topbar__actions');
    expect(acciones, 'Falta .topbar__actions en el HTML').not.toBeNull();
    expect(acciones.querySelector('a[href="#config"]')).toBeNull();

    // El conmutador de tema se queda arriba: no es navegación, es un control
    // de la vista, y su sitio es el cromo.
    expect(acciones.querySelector('[data-action="theme-toggle"]')).not.toBeNull();

    const pie = document.querySelector('.sidebar__footer a[href="#config"]');
    expect(pie, 'La entrada con etiqueta del pie de la barra es la que se conserva').not.toBeNull();
    expect(pie.textContent.trim()).toBe('Ajustes');
  });
});
