/**
 * nino-visual.test.js - APR.3b: el sistema visual del niño (ADR 093 D5, D7
 * y D8). El catálogo de dibujos y Tino (ADR 094 y 095) contra el sprite,
 * el frasco que se llena contra su propia meta y el AA de cada par de color
 * del modo niño, medido sobre los valores reales de themes.css en los dos
 * temas.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DIBUJOS, POSES_TINO, dibujoPorId, htmlDibujo, htmlTino, rellenoFrasco, htmlFrasco, htmlDestellos,
} from '../../modules/infra/ilustraciones.js';

const ROOT = resolve(import.meta.dirname, '../..');
const INDEX = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const THEMES = readFileSync(resolve(ROOT, 'styles/themes.css'), 'utf8');

/** Tokens declarados dentro del primer bloque `selector { ... }` exacto. */
function tokens(selector) {
  const i = THEMES.indexOf(`${selector} {`);
  expect(i, selector).toBeGreaterThan(-1);
  const bloque = THEMES.slice(i, THEMES.indexOf('}', i));
  return Object.fromEntries([...bloque.matchAll(/(--fk-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map(m => [m[1], m[2]]));
}

/** Luminancia relativa y contraste WCAG 2.x. */
function luminancia(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

describe('catálogo de dibujos y Tino contra el sprite (093 D8, 094, 095)', () => {
  it('los ocho dibujos, las cinco poses de Tino y el frasco están en el sprite', () => {
    expect(DIBUJOS.map(d => d.id)).toEqual(['balon', 'libro', 'bici', 'tenis', 'cometa', 'colores', 'audifonos', 'patineta']);
    const ids = [...DIBUJOS.map(d => `il-${d.id}`), ...POSES_TINO.map(p => `il-tino-${p}`), 'il-frasco', 'il-frasco-borde'];
    for (const id of ids) expect(INDEX, id).toContain(`<symbol id="${id}"`);
    // Frai se retiró con su dibujo (094 D6).
    expect(INDEX).not.toContain('il-frai-');
  });

  it('cada dibujo del catálogo pesa menos de 1 KB (D8)', () => {
    for (const d of DIBUJOS) {
      expect(statSync(resolve(ROOT, `assets/svg/ilustraciones/${d.id}.svg`)).size, d.id).toBeLessThan(1024);
    }
  });

  it('cada pose de Tino pesa menos de 16 KB (095 D1)', () => {
    for (const p of POSES_TINO) {
      expect(statSync(resolve(ROOT, `assets/svg/ilustraciones/tino-${p}.svg`)).size, p).toBeLessThan(16 * 1024);
    }
  });

  it('Tino pinta solo con sus roles, y cada rol existe en el tema oscuro (095 D2)', () => {
    const declarados = Object.keys(tokens('body.kid'));
    for (const p of POSES_TINO) {
      const svg = readFileSync(resolve(ROOT, `assets/svg/ilustraciones/tino-${p}.svg`), 'utf8');
      const fills = [...svg.matchAll(/fill="([^"]*)"/g)].map(m => m[1]);
      expect(fills.length, p).toBeGreaterThan(0);
      for (const fill of fills) {
        const rol = fill.match(/^var\((--fk-tino-[a-z]+)\)$/)?.[1];
        expect(rol, `${p}: ${fill}`).toBeTruthy();
        expect(declarados, `${p}: ${rol}`).toContain(rol);
      }
    }
  });

  it('un dibujo con etiqueta es una imagen con nombre y lleva el color de su dominio', () => {
    const html = htmlDibujo('cometa', { tamano: 72, etiqueta: 'Cometa' });
    expect(html).toContain('role="img" aria-label="Cometa"');
    expect(html).toContain('--il-a: var(--fk-dom-personales)');
    expect(html).toContain('--fk-il-b: var(--fk-dom-presupuesto)');
    expect(html).toContain('href="#il-cometa"');
    expect(htmlDibujo('balon')).toContain('aria-hidden="true"');
    expect(htmlDibujo('foto')).toBe('');
    expect(dibujoPorId('patineta').nombre).toBe('Patineta');
  });

  it('Tino usa su pose a su tamaño, decorativo', () => {
    const html = htmlTino('celebra-grande', { tamano: 128 });
    expect(html).toContain('href="#il-tino-celebra-grande"');
    expect(html).toContain('width:128px;height:128px');
    expect(html).toContain('aria-hidden="true"');
    // Una pose que no existe no rompe: saluda.
    expect(htmlTino('triste')).toContain('href="#il-tino-saluda"');
  });

  it('Tino no se ve triste: ninguna pose se llama así ni hay símbolo para eso', () => {
    expect(POSES_TINO).toEqual(['saluda', 'explica', 'celebra', 'celebra-grande', 'anima']);
    expect(INDEX).not.toMatch(/il-tino-(triste|decepcion|enojo)/);
  });
});

describe('el frasco se llena contra su propia meta (R60)', () => {
  it('vacío no dibuja relleno, lleno redondea los hombros y la mitad queda a media altura', () => {
    expect(rellenoFrasco(0)).toBe('');
    expect(rellenoFrasco(1)).toMatch(/^M20 30 Q20 24 26 24/);
    expect(rellenoFrasco(0.5)).toMatch(/^M20 55 H68/);
    // Fuera de rango se acota, nunca desborda el frasco.
    expect(rellenoFrasco(3)).toBe(rellenoFrasco(1));
    expect(rellenoFrasco(-1)).toBe('');
  });

  it('cada frasco toma su color y, con etiqueta, se nombra', () => {
    const html = htmlFrasco('gastar', 0.25, { etiqueta: 'Gastar: $6.000' });
    expect(html).toContain('var(--fk-kid-gastar');
    expect(html).toContain('aria-label="Gastar: $6.000"');
    expect(html).toContain('href="#il-frasco-borde"');
    expect(htmlFrasco('ahorrar', 0)).not.toContain('<path');
  });

  it('los destellos son ocho y escalonados', () => {
    const html = htmlDestellos();
    expect(html.match(/destellos__punto/g)).toHaveLength(8);
    expect(html).toContain('--i:7');
  });
});

describe('contraste AA del modo niño en los dos temas (D5)', () => {
  for (const [tema, selector] of [['oscuro', 'body.kid'], ['claro', 'body.light-theme.kid']]) {
    it(`tema ${tema}: texto, frascos y botón pasan AA; Tino pasa 3:1 como gráfico`, () => {
      const t = tokens(selector);
      const fondos = ['--fk-bg-base', '--fk-bg-surface', '--fk-bg-elevated'];
      for (const fondo of fondos) {
        for (const texto of ['--fk-text-primary', '--fk-text-secondary']) {
          expect(contraste(t[texto], t[fondo]), `${texto} sobre ${fondo}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      for (const texto of ['--fk-kid-ahorrar-text', '--fk-kid-gastar-text', '--fk-kid-compartir-text', '--fk-kid-sun-text', '--fk-kid-hint']) {
        expect(contraste(t[texto], t['--fk-bg-surface']), `${texto} sobre la tarjeta`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contraste(t['--fk-kid-on-primary'], t['--fk-kid-primary']), 'texto del botón').toBeGreaterThanOrEqual(4.5);
      // El pelo dibuja la silueta de Tino; el contorno es línea interior (095 D3).
      for (const fondo of ['--fk-bg-base', '--fk-bg-surface']) {
        expect(contraste(t['--fk-tino-pelo'], t[fondo]), `pelo de Tino sobre ${fondo}`).toBeGreaterThanOrEqual(3);
      }
      // Lo que se dibuja con tinta sobre papel (el balón) tiene que verse.
      expect(contraste(t['--fk-il-line'], t['--fk-il-paper']), 'contorno sobre papel').toBeGreaterThanOrEqual(3);
    });
  }

  it('el modo niño suma tokens sin tocar los del adulto', () => {
    const adulto = THEMES.slice(THEMES.indexOf('body.light-theme {'), THEMES.indexOf('/* ── MODO NIÑO'));
    expect(adulto).not.toContain('--fk-kid-');
  });
});
