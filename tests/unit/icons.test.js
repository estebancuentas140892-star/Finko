import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { icon, emptyArt } from '../../modules/infra/icons.js';

const _INDEX_HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

/** Extrae el contenido interno de un <symbol id="..."> del sprite. */
function _symbolBody(id) {
  const m = _INDEX_HTML.match(new RegExp(`<symbol id="${id}"[^>]*>([\\s\\S]*?)</symbol>`));
  return m ? m[1] : null;
}

// ── icon() ───────────────────────────────────────────────────────

describe('icon()', () => {
  it('referencia el symbol del sprite por id', () => {
    expect(icon('metas')).toContain('href="#i-metas"');
  });

  it('clase por defecto "icon" y custom con el segundo argumento', () => {
    expect(icon('alert')).toContain('class="icon"');
    expect(icon('alert', 'icon icon--lg')).toContain('class="icon icon--lg"');
  });

  it('es decorativo: aria-hidden siempre presente', () => {
    expect(icon('saldo')).toContain('aria-hidden="true"');
  });
});

// ── emptyArt() ───────────────────────────────────────────────────

describe('emptyArt()', () => {
  it('compone la ilustración con fondo, órbita, puntos e icono central', () => {
    const out = emptyArt('metas');
    expect(out).toContain('class="empty-art"');
    expect(out).toContain('empty-art__bg');
    expect(out).toContain('empty-art__orbit');
    expect(out).toContain('empty-art__dot');
    expect(out).toContain('empty-art__icon');
    expect(out).toContain('href="#i-metas"');
  });

  it('es decorativa: aria-hidden y sin texto', () => {
    const out = emptyArt('ahorro');
    expect(out).toContain('aria-hidden="true"');
    expect(out).not.toContain('<text');
  });

  it('no fija colores inline: el color vive en CSS', () => {
    const out = emptyArt('gastos');
    expect(out).not.toContain('fill="#');
    expect(out).not.toContain('stroke="#');
    expect(out).not.toContain('style=');
  });
});

// ── Sprite - símbolos estructurales v2 (ID.7, ADR 023 revisado) ───

describe('sprite i-* estructurales - duotono 22% y chispa (ID.7)', () => {
  // Los 13 símbolos recalentados a v2 en ID.7. i-saldo y i-star no llevan
  // punto de valor por diseño (rule 5: la propia forma ya es la firma),
  // así que quedan fuera de la aserción de chispa pero sí de duotono.
  const CON_DUOTONO = ['saldo', 'lightbulb', 'alert', 'bolt', 'trophy', 'mountain', 'circle', 'star', 'bar-chart'];
  const CON_CHISPA  = ['recurring', 'lightbulb', 'alert', 'bolt', 'trophy', 'mountain', 'circle', 'percent', 'trending-up', 'info', 'bar-chart'];

  it('ninguno de los símbolos recalentados conserva el duotono v1 (opacidad .15)', () => {
    for (const id of CON_DUOTONO) {
      const body = _symbolBody(`i-${id}`);
      expect(body, `i-${id}: symbol no encontrado en el sprite`).not.toBeNull();
      expect(body, `i-${id}: aún tiene fill-opacity=".15" (v1)`).not.toContain('fill-opacity=".15"');
      expect(body, `i-${id}: falta fill-opacity=".22" (v2)`).toContain('fill-opacity=".22"');
    }
  });

  it('todo símbolo con punto de valor enciende la chispa vía --fk-icon-dot', () => {
    for (const id of CON_CHISPA) {
      const body = _symbolBody(`i-${id}`);
      expect(body, `i-${id}: symbol no encontrado en el sprite`).not.toBeNull();
      expect(body, `i-${id}: el punto sigue en currentColor plano, sin chispa`)
        .toContain('var(--fk-icon-dot, currentColor)');
    }
  });

  it('i-saldo y i-star no llevan punto adicional (la forma ya es la firma, regla 5)', () => {
    expect(_symbolBody('i-saldo')).not.toContain('var(--fk-icon-dot');
    expect(_symbolBody('i-star')).not.toContain('var(--fk-icon-dot');
  });

  it('i-percent enciende la chispa en sus dos círculos (ambos son el punto de valor)', () => {
    const body = _symbolBody('i-percent');
    const matches = body.match(/var\(--fk-icon-dot, currentColor\)/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it('i-mountain, i-bolt y i-star mantienen sus vértices agudos (metáfora primero, regla 5)', () => {
    // Ningún comando de arco (a/A) en el path principal de la silueta:
    // picos, punta del rayo y puntas de la estrella siguen rectos.
    const sinArco = /<path d="[^"]*[aA][\d.\s-]/;
    expect(_symbolBody('i-mountain')).not.toMatch(sinArco);
    expect(_symbolBody('i-bolt')).not.toMatch(sinArco);
    expect(_symbolBody('i-star')).not.toMatch(sinArco);
  });

  it('i-bar-chart usa esquinas tipo cápsula (rx igual a la mitad del ancho de la barra)', () => {
    const body = _symbolBody('i-bar-chart');
    const rects = [...body.matchAll(/<rect[^>]*>/g)].map(m => m[0]);
    expect(rects.length).toBe(3);
    for (const r of rects) {
      expect(r).toMatch(/width="4"/);
      expect(r).toMatch(/rx="2"/);
    }
  });
});
