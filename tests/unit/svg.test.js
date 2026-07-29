import { describe, it, expect } from 'vitest';
import {
  sparkline,
  donut,
  progressRing,
  arcoProgreso,
  siluetaMeta,
  SILUETAS,
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
    // Sin área quedan dos paths: la línea y el marcador del último punto
    // (DIS.10 C4: el marcador dejó de ser un <circle>). Con área serían tres.
    const matches = out.match(/<path/g) ?? [];
    expect(matches.length).toBe(2);
    expect(sparkline([1, 2, 3]).match(/<path/g)).toHaveLength(3);
  });

  it('incluye marcador en el último punto, como punto de trazo no deformable', () => {
    const out = sparkline([1, 2, 3]);
    // DIS.10 (C4, regla R27): un <circle> se deformaba en elipse porque el SVG
    // se estira al ancho del contenedor. El marcador es un subpath de longitud
    // cero con tapa redonda y trazo inmune a la escala.
    expect(out).toContain('stroke-linecap="round" vector-effect="non-scaling-stroke"');
    expect(out).toMatch(/<path d="M([\d.]+),([\d.]+)L\1,\2"/);
  });

  it('el trazo de la línea no depende de la escala del contenedor', () => {
    const out = sparkline([1, 2, 3]);
    expect(out).toContain('stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"');
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

  it('el arco normaliza la circunferencia con pathLength=100', () => {
    // dashoffset = 100 - pct, sin importar size: permite animar el llenado
    // desde CSS con un keyframe genérico (from: dashoffset 100).
    const out = progressRing(50);
    expect(out).toContain('pathLength="100"');
    expect(out).toContain('stroke-dasharray="100"');
    expect(out).toContain('stroke-dashoffset="50.00"');
  });

  it('el dashoffset es independiente del tamaño del anillo', () => {
    expect(progressRing(75)).toContain('stroke-dashoffset="25.00"');
    expect(progressRing(75, { size: 120 })).toContain('stroke-dashoffset="25.00"');
  });

  it('100% cubre la circunferencia completa (dashoffset 0)', () => {
    const out = progressRing(100);
    expect(out).toContain('stroke-dashoffset="0.00"');
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

  it('etiqueta custom reemplaza el porcentaje en el label', () => {
    expect(progressRing(78, { etiqueta: 78 })).toContain('>78<');
    expect(progressRing(78, { etiqueta: 78 })).not.toContain('>78%<');
    expect(progressRing(50, { etiqueta: '<ok>' })).toContain('>&lt;ok&gt;<');
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

// ── arcoProgreso() (DIS.14) ──────────────────────────────────────

describe('arcoProgreso()', () => {
  it('genera un SVG con role img y la clase progress-arc', () => {
    const out = arcoProgreso(50);
    expect(out).toContain('<svg');
    expect(out).toContain('role="img"');
    expect(out).toContain('class="progress-arc"');
  });

  it('incluye el track y el arco con sus clases', () => {
    const out = arcoProgreso(50);
    expect(out).toContain('progress-arc__track');
    expect(out).toContain('progress-arc__bar');
  });

  it('con 0% no emite el arco (linecap round dibujaría un punto)', () => {
    const out = arcoProgreso(0);
    expect(out).toContain('progress-arc__track');
    expect(out).not.toContain('progress-arc__bar');
  });

  it('normaliza el semicírculo con pathLength=100, igual que el anillo', () => {
    const out = arcoProgreso(34);
    expect(out).toContain('pathLength="100"');
    expect(out).toContain('stroke-dasharray="100"');
    expect(out).toContain('stroke-dashoffset="66.00"');
  });

  it('100% cierra el arco (dashoffset 0)', () => {
    expect(arcoProgreso(100)).toContain('stroke-dashoffset="0.00"');
  });

  it('recorta porcentajes fuera de rango y trata NaN como 0', () => {
    expect(arcoProgreso(-20)).not.toContain('progress-arc__bar');
    expect(arcoProgreso(150)).toContain('>100%<');
    expect(arcoProgreso(NaN)).toContain('>0%<');
  });

  it('track y arco comparten la misma geometría (un solo semicírculo)', () => {
    const out = arcoProgreso(50);
    expect(out.match(/d="M 18 120 A 102 102 0 0 1 222 120"/g)).toHaveLength(2);
    expect(out).toContain('viewBox="0 0 240 132"');
  });

  it('el porcentaje va aria-hidden: lo anuncia el aria-label del SVG (regla R11)', () => {
    const out = arcoProgreso(34, { ariaLabel: 'Viaje: 34% de tu objetivo' });
    expect(out).toContain('aria-label="Viaje: 34% de tu objetivo"');
    expect(out).toMatch(/<text[^>]*aria-hidden="true"/);
  });

  it('conLabel:false quita el porcentaje dibujado', () => {
    expect(arcoProgreso(75, { conLabel: false })).not.toContain('<text');
  });

  it('aria-label por defecto y custom escapado', () => {
    expect(arcoProgreso(40)).toContain('aria-label="Progreso: 40%"');
    expect(arcoProgreso(40, { ariaLabel: 'Meta <viaje>' })).toContain('aria-label="Meta &lt;viaje&gt;"');
  });

  it('no fija ancho ni colores inline: los decide el contenedor y el CSS', () => {
    const out = arcoProgreso(50);
    expect(out).not.toContain('stroke="#');
    expect(out).not.toMatch(/<svg[^>]*\swidth=/);
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

// ── siluetaMeta() (DIS.19) ───────────────────────────────────────

describe('siluetaMeta()', () => {
  const base = { forma: 'avion', clave: 'm1' };

  it('dibuja la figura tres veces: vacia, agua recortada y borde', () => {
    const out = siluetaMeta(50, base);
    expect(out).toContain('class="silueta__vacia"');
    expect(out).toContain('class="silueta__llena"');
    expect(out).toContain('class="silueta__borde"');
    expect(out).toContain(SILUETAS.avion);
  });

  it('el nivel del agua baja a medida que sube el porcentaje', () => {
    const y = (pct) => Number(/class="silueta__llena" x="0" y="([\d.]+)"/.exec(siluetaMeta(pct, base))[1]);
    expect(y(25)).toBe(18);
    expect(y(50)).toBe(12);
    expect(y(100)).toBe(0);
  });

  it('la altura del agua y su nivel siempre suman el lado del lienzo', () => {
    for (const pct of [1, 33, 67, 99, 100]) {
      const m = /y="([\d.]+)" width="24" height="([\d.]+)"/.exec(siluetaMeta(pct, base));
      expect(Number(m[1]) + Number(m[2])).toBeCloseTo(24, 2);
    }
  });

  it('con 0% no emite agua: un rectangulo de altura cero no dice nada', () => {
    const out = siluetaMeta(0, base);
    expect(out).not.toContain('silueta__llena');
    expect(out).toContain('class="silueta__vacia"');
  });

  it('recorta el porcentaje fuera de rango en vez de deformar la figura', () => {
    expect(siluetaMeta(180, base)).toContain('y="0"');
    expect(siluetaMeta(-40, base)).not.toContain('silueta__llena');
  });

  it('con 100% no dibuja la linea del nivel: no hay nivel que marcar', () => {
    expect(siluetaMeta(100, base)).not.toContain('silueta__linea');
    expect(siluetaMeta(60, base)).toContain('silueta__linea');
  });

  it('el clipPath toma su id de la clave, asi que dos siluetas no colisionan', () => {
    expect(siluetaMeta(50, { forma: 'hogar', clave: 'm1' })).toContain('id="silueta-m1"');
    expect(siluetaMeta(50, { forma: 'hogar', clave: 'm2' })).toContain('id="silueta-m2"');
  });

  it('sin clave se dibuja vacia: mejor sin llenar que llenada con el recorte de otra', () => {
    const out = siluetaMeta(70, { forma: 'avion' });
    expect(out).not.toContain('silueta__llena');
    expect(out).not.toContain('clipPath');
  });

  it('una forma desconocida cae a la caja en vez de quedarse sin dibujo', () => {
    expect(siluetaMeta(50, { forma: 'no-existe', clave: 'm1' })).toContain(SILUETAS.caja);
  });

  it('por defecto se anuncia con role img y etiqueta', () => {
    const out = siluetaMeta(42, base);
    expect(out).toContain('role="img"');
    expect(out).toContain('aria-label="Progreso: 42%"');
  });

  it('decorativa se oculta al lector: el contexto ya dice el porcentaje', () => {
    const out = siluetaMeta(42, { ...base, decorativa: true });
    expect(out).toContain('aria-hidden="true"');
    expect(out).not.toContain('role="img"');
    expect(out).not.toContain('aria-label');
  });

  it('escapa la clave y la etiqueta que recibe', () => {
    const out = siluetaMeta(50, { forma: 'avion', clave: 'a"><b', ariaLabel: 'Meta <b>' });
    expect(out).not.toContain('<b>');
  });
});
