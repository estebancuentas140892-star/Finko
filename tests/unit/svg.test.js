import { describe, it, expect } from 'vitest';
import {
  sparkline,
  donut,
  progressRing,
  colorearSegmentos,
  PALETA_CATEGORIAS,
} from '../../modules/infra/svg.js';

// ── sparkline() ──────────────────────────────────────────────────

describe('sparkline()', () => {
  it('devuelve cadena vacía con array vacío', () => {
    expect(sparkline([])).toBe('');
  });

  it('devuelve cadena vacía si no recibe array', () => {
    expect(sparkline(null)).toBe('');
    expect(sparkline(undefined)).toBe('');
  });

  it('un solo valor renderiza un circle, no un path', () => {
    const out = sparkline([100]);
    expect(out).toContain('<svg');
    expect(out).toContain('<circle');
    expect(out).not.toContain('<path');
  });

  it('múltiples valores renderizan un <path>', () => {
    const out = sparkline([10, 20, 30, 20, 10]);
    expect(out).toContain('<path');
  });

  it('incluye el viewBox con las dimensiones por defecto', () => {
    const out = sparkline([1, 2, 3]);
    expect(out).toContain('viewBox="0 0 200 60"');
  });

  it('respeta dimensiones custom', () => {
    const out = sparkline([1, 2, 3], { width: 400, height: 100 });
    expect(out).toContain('viewBox="0 0 400 100"');
  });

  it('incluye aria-label', () => {
    const out = sparkline([1, 2, 3], { ariaLabel: 'Mi gráfico' });
    expect(out).toContain('aria-label="Mi gráfico"');
  });

  it('escapa caracteres especiales en aria-label', () => {
    const out = sparkline([1, 2], { ariaLabel: 'A & B <test>' });
    expect(out).toContain('A &amp; B &lt;test&gt;');
  });

  it('valores idénticos no rompen el render (range=0)', () => {
    const out = sparkline([100, 100, 100, 100]);
    expect(out).toContain('<path');
    // Todos los puntos deben tener la misma Y
    expect(out).not.toContain('NaN');
  });

  it('usa color por defecto currentColor', () => {
    const out = sparkline([1, 2, 3]);
    expect(out).toContain('stroke="currentColor"');
  });

  it('permite desactivar el área de relleno', () => {
    const out = sparkline([1, 2, 3], { area: false });
    // Solo debe haber un path (la línea), no dos (línea + área).
    const matches = out.match(/<path/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('incluye marcador en el último punto', () => {
    const out = sparkline([1, 2, 3]);
    expect(out).toContain('<circle');
  });
});

// ── donut() ──────────────────────────────────────────────────────

describe('donut()', () => {
  it('devuelve cadena vacía con array vacío', () => {
    expect(donut([])).toBe('');
  });

  it('devuelve cadena vacía si no recibe array', () => {
    expect(donut(null)).toBe('');
  });

  it('devuelve cadena vacía si la suma es 0', () => {
    expect(donut([{ label: 'A', valor: 0, color: '#000' }])).toBe('');
  });

  it('genera un <circle> por segmento con valor > 0', () => {
    const out = donut([
      { label: 'A', valor: 100, color: '#f00' },
      { label: 'B', valor: 200, color: '#0f0' },
    ]);
    const matches = out.match(/<circle/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it('omite segmentos con valor 0', () => {
    const out = donut([
      { label: 'A', valor: 100, color: '#f00' },
      { label: 'B', valor: 0,   color: '#0f0' },
    ]);
    const matches = out.match(/<circle/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('cada segmento incluye su color', () => {
    const out = donut([
      { label: 'A', valor: 100, color: '#aabbcc' },
    ]);
    expect(out).toContain('stroke="#aabbcc"');
  });

  it('cada segmento incluye un <title> con el label (tooltip nativo)', () => {
    const out = donut([{ label: 'Comida', valor: 100, color: '#000' }]);
    expect(out).toContain('<title>Comida</title>');
  });

  it('respeta tamaño custom', () => {
    const out = donut([{ label: 'A', valor: 100, color: '#000' }], { size: 200 });
    expect(out).toContain('viewBox="0 0 200 200"');
  });

  it('escapa el label en el <title>', () => {
    const out = donut([{ label: 'A & B', valor: 100, color: '#000' }]);
    expect(out).toContain('A &amp; B');
  });

  it('rotación inicial -90° para arrancar arriba', () => {
    const out = donut([{ label: 'A', valor: 100, color: '#000' }]);
    expect(out).toContain('rotate(-90');
  });

  it('respeta strokeWidth custom', () => {
    const out = donut([{ label: 'A', valor: 100, color: '#000' }], { strokeWidth: 30 });
    expect(out).toContain('stroke-width="30"');
  });
});

// ── progressRing() ───────────────────────────────────────────────

describe('progressRing()', () => {
  it('genera un SVG con role img y la clase progress-ring', () => {
    const out = progressRing(50);
    expect(out).toContain('<svg');
    expect(out).toContain('role="img"');
    expect(out).toContain('class="progress-ring"');
  });

  it('incluye el track y el arco con sus clases', () => {
    const out = progressRing(50);
    expect(out).toContain('progress-ring__track');
    expect(out).toContain('progress-ring__bar');
  });

  it('con 0% no emite el arco (linecap round dibujaría un punto)', () => {
    const out = progressRing(0);
    expect(out).toContain('progress-ring__track');
    expect(out).not.toContain('progress-ring__bar');
  });

  it('recorta porcentajes fuera de rango', () => {
    expect(progressRing(-20)).not.toContain('progress-ring__bar'); // → 0
    expect(progressRing(150)).toContain('>100%<');                  // → 100
  });

  it('NaN y undefined se tratan como 0', () => {
    expect(progressRing(NaN)).toContain('>0%<');
    expect(progressRing(undefined)).toContain('>0%<');
  });

  it('el dasharray del arco es proporcional al porcentaje', () => {
    // size=64, strokeWidth=6 → r=29, circunferencia=182.21; 50% → 91.11
    const out = progressRing(50);
    expect(out).toContain('stroke-dasharray="91.11 91.11"');
  });

  it('100% cubre la circunferencia completa', () => {
    const out = progressRing(100);
    expect(out).toContain('stroke-dasharray="182.21 0.00"');
  });

  it('viewBox por defecto 64x64 y custom con opts.size', () => {
    expect(progressRing(50)).toContain('viewBox="0 0 64 64"');
    expect(progressRing(50, { size: 100 })).toContain('viewBox="0 0 100 100"');
  });

  it('respeta strokeWidth custom', () => {
    const out = progressRing(50, { strokeWidth: 10 });
    expect(out).toContain('stroke-width="10"');
  });

  it('muestra el porcentaje centrado por defecto y lo oculta con conLabel:false', () => {
    expect(progressRing(75)).toContain('>75%<');
    expect(progressRing(75, { conLabel: false })).not.toContain('<text');
  });

  it('redondea el label con porcentajes decimales', () => {
    expect(progressRing(33.4)).toContain('>33%<');
  });

  it('aria-label por defecto y custom escapado', () => {
    expect(progressRing(40)).toContain('aria-label="Progreso: 40%"');
    const out = progressRing(40, { ariaLabel: 'Meta <viaje>' });
    expect(out).toContain('aria-label="Meta &lt;viaje&gt;"');
  });

  it('el arco arranca arriba (rotación -90°)', () => {
    expect(progressRing(50)).toContain('rotate(-90');
  });

  it('no fija colores inline: el color vive en CSS', () => {
    expect(progressRing(50)).not.toContain('stroke="#');
  });
});

// ── PALETA_CATEGORIAS y colorearSegmentos() ──────────────────────

describe('PALETA_CATEGORIAS', () => {
  it('tiene exactamente 7 colores', () => {
    expect(PALETA_CATEGORIAS).toHaveLength(7);
  });

  it('todos son strings hex válidos', () => {
    for (const c of PALETA_CATEGORIAS) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('colorearSegmentos()', () => {
  it('asigna un color a cada segmento por posición', () => {
    const segmentos = [
      { categoria: 'A', total: 100, pct: 50 },
      { categoria: 'B', total: 100, pct: 50 },
    ];
    const out = colorearSegmentos(segmentos);
    expect(out[0].color).toBe(PALETA_CATEGORIAS[0]);
    expect(out[1].color).toBe(PALETA_CATEGORIAS[1]);
  });

  it('"Otros" siempre usa el último color reservado', () => {
    const segmentos = [
      { categoria: 'A',     total: 100, pct: 50 },
      { categoria: 'Otros', total: 100, pct: 50 },
    ];
    const out = colorearSegmentos(segmentos);
    expect(out[1].color).toBe(PALETA_CATEGORIAS[PALETA_CATEGORIAS.length - 1]);
  });

  it('cada elemento mapea categoria→label y total→valor', () => {
    const segmentos = [{ categoria: 'Comida', total: 500_000, pct: 50 }];
    const out = colorearSegmentos(segmentos);
    expect(out[0].label).toBe('Comida');
    expect(out[0].valor).toBe(500_000);
    expect(out[0].pct).toBe(50);
  });

  it('preserva pct en la salida', () => {
    const segmentos = [
      { categoria: 'A', total: 100, pct: 33 },
      { categoria: 'B', total: 100, pct: 67 },
    ];
    const out = colorearSegmentos(segmentos);
    expect(out.map(s => s.pct)).toEqual([33, 67]);
  });

  it('cicla la paleta si hay más segmentos que colores (sin contar Otros)', () => {
    const segmentos = Array.from({ length: 8 }, (_, i) => ({
      categoria: `C${i}`, total: 100, pct: 12,
    }));
    const out = colorearSegmentos(segmentos);
    // El módulo es 6 (paleta - 1 reservado para Otros), así que el 7º vuelve al primero
    expect(out[6].color).toBe(PALETA_CATEGORIAS[0]);
  });

  it('array vacío → array vacío', () => {
    expect(colorearSegmentos([])).toEqual([]);
  });
});
