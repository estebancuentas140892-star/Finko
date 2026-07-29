/**
 * comparador.test.js - el gráfico de bolsas comparadas (DIS.19, item 5).
 *
 * `ui/comparador.js` es puro: recibe columnas ya calculadas y devuelve HTML, así
 * que se prueba sin DOM. Lo que traduce un apartado a una columna se prueba en
 * apartados.test.js, donde vive el vocabulario del dominio.
 */

import { describe, it, expect } from 'vitest';
import { htmlComparador, pieComparador } from '../../modules/ui/comparador.js';

const col = (overrides = {}) => ({
  id: 'a1',
  nombre: 'SOAT',
  iconoHtml: '<svg class="icon"></svg>',
  pct: 50,
  plan: 71,
  nota: '12 días',
  estado: '',
  ...overrides,
});

describe('htmlComparador()', () => {
  it('sin columnas no dibuja nada: comparar contra nada no es un gráfico', () => {
    expect(htmlComparador([])).toBe('');
    expect(htmlComparador(null)).toBe('');
  });

  it('la altura del relleno es el porcentaje reunido', () => {
    const out = htmlComparador([col({ pct: 37 })]);
    expect(out).toContain('style="height:37%"');
  });

  it('la marca del plan se posiciona con bottom en su propio porcentaje', () => {
    const out = htmlComparador([col({ plan: 71 })]);
    expect(out).toContain('class="cmp__plan" style="bottom:71%"');
  });

  it('sin plan no dibuja la marca: una línea inventada acusaría de atraso contra nada', () => {
    const out = htmlComparador([col({ plan: null })]);
    expect(out).not.toContain('cmp__plan');
  });

  it('recorta porcentajes fuera de rango en vez de desbordar el riel', () => {
    expect(htmlComparador([col({ pct: 180, plan: -20 })])).toContain('style="height:100%"');
    expect(htmlComparador([col({ pct: 180, plan: -20 })])).toContain('bottom:0%');
  });

  it('el estado terminal y el atraso se marcan con clase, no con estilo inline', () => {
    expect(htmlComparador([col({ estado: 'listo' })])).toContain('cmp__fill--listo');
    expect(htmlComparador([col({ estado: 'atras' })])).toContain('cmp__fill--atras');
    expect(htmlComparador([col({ estado: '' })])).not.toContain('cmp__fill--');
  });

  it('sin acción las columnas son spans y el gráfico se oculta al lector', () => {
    const out = htmlComparador([col()], { pie: 'lo dice el pie' });
    expect(out).toContain('<span class="cmp__col">');
    expect(out).toContain('aria-hidden="true"');
    expect(out).not.toContain('<button');
  });

  it('con acción cada columna es un botón con id, estado y nombre accesible', () => {
    const out = htmlComparador([col({ seleccionada: true })], { accion: 'ahorro-elegir-apartado' });
    expect(out).toContain('data-action="ahorro-elegir-apartado"');
    expect(out).toContain('data-id="a1"');
    expect(out).toContain('aria-pressed="true"');
    expect(out).toContain('aria-label="SOAT: 12 días"');
    // Interactivo deja de estar oculto: ahora sí hay algo que hacer.
    expect(out).not.toContain('aria-hidden="true"');
  });

  it('la etiqueta accesible se puede pasar completa cuando el nombre no basta', () => {
    const out = htmlComparador([col({ etiquetaAccesible: 'Aportar al SOAT, 50% reunido' })], { accion: 'x' });
    expect(out).toContain('aria-label="Aportar al SOAT, 50% reunido"');
  });

  it('la cabecera solo aparece si se le pasa título', () => {
    expect(htmlComparador([col()])).not.toContain('cmp__head');
    const out = htmlComparador([col()], { titulo: 'Todos juntos', medida: 'altura = lo reunido' });
    expect(out).toContain('Todos juntos');
    expect(out).toContain('altura = lo reunido');
  });

  it('escapa el nombre y la nota que recibe', () => {
    const out = htmlComparador([col({ nombre: '<b>x</b>', nota: '<i>y</i>' })]);
    expect(out).not.toContain('<b>');
    expect(out).not.toContain('<i>');
  });
});

describe('pieComparador()', () => {
  it('sin columnas no dice nada', () => {
    expect(pieComparador([])).toBe('');
  });

  it('sin ninguna con plan, pide lo que falta en vez de fingir la marca', () => {
    const out = pieComparador([col({ plan: null }), col({ plan: null })]);
    expect(out).toContain('Ponle fecha');
  });

  it('todos sobre la línea: lo dice sin nombrar a nadie', () => {
    const out = pieComparador([col({ estado: '' }), col({ estado: 'listo' })]);
    expect(out).toContain('estás al día');
  });

  it('nombra al único atrasado en singular', () => {
    const out = pieComparador([col({ nombre: 'SOAT', estado: 'atras' }), col({ nombre: 'Matrícula' })]);
    expect(out).toContain('<strong>SOAT</strong> va por debajo');
  });

  it('nombra a dos atrasados con "y", sin coma', () => {
    const out = pieComparador([
      col({ nombre: 'SOAT', estado: 'atras' }),
      col({ nombre: 'Impuestos', estado: 'atras' }),
    ]);
    expect(out).toContain('SOAT y Impuestos');
    expect(out).toContain('van por debajo');
  });

  it('con tres o más, enumera con comas y cierra con "y"', () => {
    const out = pieComparador([
      col({ nombre: 'SOAT', estado: 'atras' }),
      col({ nombre: 'Impuestos', estado: 'atras' }),
      col({ nombre: 'Matrícula', estado: 'atras' }),
    ]);
    expect(out).toContain('SOAT, Impuestos y Matrícula');
  });

  it('escapa los nombres que nombra', () => {
    expect(pieComparador([col({ nombre: '<b>x</b>', estado: 'atras' })])).not.toContain('<b>x</b>');
  });
});
