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
  DIBUJOS, POSES_TINO, dibujoPorId, htmlDibujo, htmlTino, htmlFrasco, htmlDestellos,
  granosFrasco, GRANOS_FRASCO,
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
    const ids = [...DIBUJOS.map(d => `il-${d.id}`), ...POSES_TINO.map(p => `il-tino-${p}`), 'il-frasco', 'il-frasco-borde', 'il-cafe'];
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
  it('cada frasco toma su color y, con etiqueta, se nombra', () => {
    const html = htmlFrasco('gastar', 0.25, { etiqueta: 'Gastar: $6.000' });
    expect(html).toContain('var(--fk-kid-gastar');
    expect(html).toContain('aria-label="Gastar: $6.000"');
    expect(html).toContain('href="#il-frasco-borde"');
    expect(htmlFrasco('ahorrar', 0)).not.toContain('<path');
  });

  // ADR 128: el frasco se llena con los granos de café de Tino, no con líquido.
  it('vacío no tiene granos; con lo mínimo se ve la primera fila y lleno, todos', () => {
    expect(granosFrasco(0)).toEqual([]);
    expect(granosFrasco(-1)).toEqual([]);
    expect(granosFrasco(0.05)).toHaveLength(3);
    expect(granosFrasco(1)).toHaveLength(GRANOS_FRASCO.length);
    expect(granosFrasco(3)).toEqual(granosFrasco(1));
    // Más dinero, nunca menos granos.
    let antes = 0;
    for (let p = 0.05; p <= 1; p += 0.05) {
      const n = granosFrasco(p).length;
      expect(n).toBeGreaterThanOrEqual(antes);
      antes = n;
    }
  });

  it('cada grano cae dentro del vidrio (x 16 a 72, de la boca al fondo)', () => {
    for (const g of GRANOS_FRASCO) {
      expect(g.x - 7.5, `${g.x},${g.y}`).toBeGreaterThanOrEqual(19);
      expect(g.x + 7.5, `${g.x},${g.y}`).toBeLessThanOrEqual(69);
      expect(g.y - 5.25, `${g.x},${g.y}`).toBeGreaterThanOrEqual(22);
      expect(g.y + 5.25, `${g.x},${g.y}`).toBeLessThanOrEqual(96);
    }
  });

  // ADR 131: el vidrio va sin líquido ni tinte; los granos van entre el
  // vidrio y su borde.
  it('los granos van entre el vidrio y su borde, sin tinte, del color del café de Tino', () => {
    const html = htmlFrasco('compartir', 0.5);
    expect(html).not.toContain('frasco__tinte');
    expect(html).not.toContain('<path');
    const vidrio = html.indexOf('href="#il-frasco"');
    const grano = html.indexOf('href="#il-cafe"');
    const borde = html.indexOf('href="#il-frasco-borde"');
    expect(grano).toBeGreaterThan(vidrio);
    expect(borde).toBeGreaterThan(grano);
    const cafe = readFileSync(resolve(ROOT, 'assets/svg/ilustraciones/cafe.svg'), 'utf-8');
    expect(cafe).toContain('var(--fk-cafe-grano)');
    expect(cafe).not.toMatch(/fill="#/);
  });

  it('el color del frasco va en su tapa (ADR 131)', () => {
    const simbolo = INDEX.match(/<symbol id="il-frasco"[\s\S]*?<\/symbol>/)[0];
    expect(simbolo).toContain('<rect x="22" y="8" width="44" height="12" rx="4" fill="currentColor"/>');
    expect(htmlFrasco('gastar', 0)).toContain('--il-a: var(--fk-kid-gastar');
  });

  // Los números son los del diseño "Frascos sin líquido".
  it('Ahorrar se llena sin huecos; Gastar y Compartir dejan el hueco de cada grano usado', () => {
    const cuenta = (html, simbolo) => (html.match(new RegExp(`href="#${simbolo}"`, 'g')) ?? []).length;
    // Ahorrar hacia una meta de $40.000: $4.000, $16.000, $30.000 y $40.000.
    expect([0.1, 0.4, 0.75, 1].map(p => cuenta(htmlFrasco('ahorrar', p), 'il-cafe'))).toEqual([3, 8, 15, 20]);
    expect(cuenta(htmlFrasco('ahorrar', 0.4), 'il-cafe-hueco')).toBe(0);
    // Gastar con una mesada de $10.000: $10.000, $6.500, $2.500 y $0.
    const gastar = [1, 0.65, 0.25, 0].map(p => htmlFrasco('gastar', p, { huecos: true }));
    expect(gastar.map(h => cuenta(h, 'il-cafe'))).toEqual([20, 13, 5, 0]);
    expect(gastar.map(h => cuenta(h, 'il-cafe-hueco'))).toEqual([0, 7, 15, 20]);
    // El hueco queda arriba: lo primero que se usa es lo último que entró.
    const medio = gastar[1];
    expect(medio.lastIndexOf('href="#il-cafe"')).toBeLessThan(medio.indexOf('href="#il-cafe-hueco"'));
  });

  it('el hueco es el contorno del grano, punteado y del color del tema', () => {
    const simbolo = INDEX.match(/<symbol id="il-cafe-hueco"[\s\S]*?<\/symbol>/)[0];
    expect(simbolo).toContain('fill="none"');
    expect(simbolo).toContain('stroke="var(--fk-cafe-hueco)"');
    expect(simbolo).toContain('stroke-dasharray');
    const temas = readFileSync(resolve(ROOT, 'styles/themes.css'), 'utf-8');
    expect(temas.match(/--fk-cafe-hueco:/g)).toHaveLength(2);
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

// ADR 127 D6: Tino del adulto usa los dibujos originales, sobre su sol.
import { htmlTinoSol, TINO_ORIGINAL, encajeTinoSol } from '../../modules/infra/ilustraciones.js';
import { existsSync as _existe } from 'node:fs';

describe('htmlTinoSol (ADR 127 D6)', () => {
  it('cada pose del dibujo original existe en assets/tino', () => {
    for (const pose of Object.keys(TINO_ORIGINAL)) {
      const archivo = pose === 'tino' ? 'tino' : `tino-${pose}`;
      expect(_existe(resolve(ROOT, `assets/tino/${archivo}.svg`)), pose).toBe(true);
    }
  });

  it('pinta el dibujo original como imagen decorativa, con su lienzo reservado', () => {
    const html = htmlTinoSol('explica', { tamano: 80 });
    expect(html).toContain('src="assets/tino/tino-explica.svg"');
    expect(html).toContain('alt=""');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('width="651" height="987"');
    expect(html).toContain('--tino-sol:80px');
  });

  it('una pose desconocida cae en saluda (nunca triste)', () => {
    expect(htmlTinoSol('triste')).toContain('tino-saluda.svg');
  });

  // ADR 129: el lienzo de cada archivo es el que dice TINO_ORIGINAL.
  it('el lienzo de cada pose coincide con su viewBox', () => {
    for (const [pose, { ancho, alto }] of Object.entries(TINO_ORIGINAL)) {
      const archivo = pose === 'tino' ? 'tino' : `tino-${pose}`;
      const svg = readFileSync(resolve(ROOT, `assets/tino/${archivo}.svg`), 'utf-8');
      const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
      expect(Math.abs(w - ancho), pose).toBeLessThanOrEqual(1);
      expect(Math.abs(h - alto), pose).toBeLessThanOrEqual(1);
    }
  });

  it('un dibujo de pie va como siempre: sin encaje a lo ancho', () => {
    expect(encajeTinoSol(651, 987)).toBeNull();
    const html = htmlTinoSol('pensando');
    expect(html).not.toContain('tino-sol--ancho');
    expect(html).not.toContain('--tino-ancho');
  });

  it('un dibujo a lo ancho se mide por su ancho y no se sale del sol', () => {
    for (const [pose, { ancho, alto }] of Object.entries(TINO_ORIGINAL)) {
      const e = encajeTinoSol(ancho, alto);
      if (!e) continue;
      const w = e.ancho / 100;
      const h = w * alto / ancho;
      // El centro de la caja queda un poco bajo la mitad y dentro del disco.
      const centro = 1 - (e.base / 100 + h / 2);
      expect(centro, pose).toBeGreaterThan(0.5);
      expect(centro, pose).toBeLessThan(0.56);
      expect(w, pose).toBeLessThanOrEqual(0.92);
      // Las esquinas pasan del círculo a lo sumo un 6 % (más el redondeo a
      // una décima): ahí el dibujo es vacío.
      expect(Math.hypot(w, h), pose).toBeLessThanOrEqual(1.061);
    }
    const html = htmlTinoSol('tranquilo', { tamano: 56 });
    expect(html).toContain('class="tino-sol tino-sol--ancho"');
    expect(html).toMatch(/--tino-sol:56px;--tino-ancho:\d+(\.\d)?%;--tino-base:\d+(\.\d)?%/);
  });

  // El envoltorio de metadatos (Illustrator, o la procedencia que agregue la
  // herramienta que copió el archivo) no dibuja nada: no se mide.
  it('los SVG originales no traen texto ni scripts', () => {
    for (const pose of Object.keys(TINO_ORIGINAL)) {
      const archivo = pose === 'tino' ? 'tino' : `tino-${pose}`;
      const svg = readFileSync(resolve(ROOT, `assets/tino/${archivo}.svg`), 'utf-8');
      expect(svg).not.toMatch(/<script|<text\b|<foreignObject/);
    }
  });
});
