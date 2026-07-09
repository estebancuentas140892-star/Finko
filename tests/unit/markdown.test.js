import { describe, it, expect } from 'vitest';
import { mdToHtml } from '../../modules/infra/markdown.js';

describe('mdToHtml()', () => {
  it('convierte encabezados h1/h2 a h3/h4 (jerarquía del modal)', () => {
    expect(mdToHtml('# Título')).toBe('<h3>Título</h3>');
    expect(mdToHtml('## Sección')).toBe('<h4>Sección</h4>');
  });

  it('agrupa líneas consecutivas en un solo párrafo', () => {
    const html = mdToHtml('Primera línea\nsegunda línea.');
    expect(html).toBe('<p>Primera línea segunda línea.</p>');
  });

  it('separa párrafos por línea en blanco', () => {
    const html = mdToHtml('Uno.\n\nDos.');
    expect(html).toBe('<p>Uno.</p>\n<p>Dos.</p>');
  });

  it('convierte --- en <hr />', () => {
    expect(mdToHtml('Antes\n\n---\n\nDespués')).toBe('<p>Antes</p>\n<hr />\n<p>Después</p>');
  });

  it('convierte negrita', () => {
    expect(mdToHtml('Hola **mundo**.')).toBe('<p>Hola <strong>mundo</strong>.</p>');
  });

  it('convierte código en línea sin interpretar su contenido', () => {
    expect(mdToHtml('Usa `**no negrita**` aquí.')).toBe('<p>Usa <code>**no negrita**</code> aquí.</p>');
  });

  it('convierte enlaces externos con target blank', () => {
    const html = mdToHtml('[SIC](https://www.sic.gov.co)');
    expect(html).toContain('<a href="https://www.sic.gov.co" class="link" target="_blank" rel="noopener noreferrer">SIC</a>');
  });

  it('convierte enlaces a otro documento .md con data-doc-link', () => {
    const html = mdToHtml('[Términos](terminos-y-condiciones.md)');
    expect(html).toBe('<p><a href="#" class="link" data-doc-link="terminos-y-condiciones">Términos</a></p>');
  });

  it('convierte listas con guion', () => {
    const html = mdToHtml('- Uno\n- Dos');
    expect(html).toBe('<ul><li>Uno</li><li>Dos</li></ul>');
  });

  it('convierte una tabla con encabezado y filas, ignorando la fila separadora', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |';
    const html = mdToHtml(md);
    expect(html).toContain('<th>A</th><th>B</th>');
    expect(html).toContain('<td>1</td><td>2</td>');
    expect(html).not.toContain('---');
  });

  it('escapa HTML potencialmente inseguro en el texto de entrada', () => {
    const html = mdToHtml('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapa HTML dentro de negrita y enlaces', () => {
    expect(mdToHtml('**<img src=x>**')).toContain('&lt;img');
  });

  it('convierte líneas de cita (>) en un solo blockquote', () => {
    const html = mdToHtml('> Primera línea.\n> Segunda línea.');
    expect(html).toBe('<blockquote><p>Primera línea. Segunda línea.</p></blockquote>');
  });
});
