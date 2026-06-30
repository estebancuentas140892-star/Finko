import { describe, it, expect } from 'vitest';
import { htmlBannerProposito, PROPOSITOS_SECCION } from '../../modules/ui/proposito.js';

describe('PROPOSITOS_SECCION', () => {
  it('tiene la sección apartados con titulo y texto', () => {
    const ap = PROPOSITOS_SECCION.apartados;
    expect(ap).toBeDefined();
    expect(typeof ap.titulo).toBe('string');
    expect(ap.titulo.length).toBeGreaterThan(0);
    expect(typeof ap.texto).toBe('string');
    expect(ap.texto.length).toBeGreaterThan(0);
  });
});

describe('htmlBannerProposito', () => {
  it('devuelve string vacío para sección sin copy', () => {
    expect(htmlBannerProposito('desconocida', {})).toBe('');
    expect(htmlBannerProposito('', {})).toBe('');
  });

  it('renderiza el banner expandido cuando no hay preferencia', () => {
    const html = htmlBannerProposito('apartados', {});
    expect(html).toContain('banner-proposito');
    expect(html).not.toContain('banner-proposito--colapsado');
    expect(html).toContain('data-action="colapsar-proposito"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('data-seccion="apartados"');
    expect(html).toContain('Entendido, ocultar');
  });

  it('renderiza expandido cuando propositoColapsado no tiene la sección', () => {
    const html = htmlBannerProposito('apartados', { propositoColapsado: { gastos: true } });
    expect(html).not.toContain('banner-proposito--colapsado');
    expect(html).toContain('data-action="colapsar-proposito"');
  });

  it('renderiza el banner colapsado cuando propositoColapsado[seccion] === true', () => {
    const html = htmlBannerProposito('apartados', { propositoColapsado: { apartados: true } });
    expect(html).toContain('banner-proposito--colapsado');
    expect(html).toContain('data-action="expandir-proposito"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('data-action="colapsar-proposito"');
  });

  it('el banner expandido contiene el texto del copy de Apartados', () => {
    const html = htmlBannerProposito('apartados', {});
    expect(html).toContain('SOAT');
    expect(html).toContain('Apartados te ayuda');
  });

  it('el banner colapsado muestra el título', () => {
    const html = htmlBannerProposito('apartados', { propositoColapsado: { apartados: true } });
    expect(html).toContain(PROPOSITOS_SECCION.apartados.titulo);
  });

  it('config=null se trata como sin preferencias (expandido)', () => {
    const html = htmlBannerProposito('apartados', null ?? {});
    expect(html).toContain('data-action="colapsar-proposito"');
  });

  it('propositoColapsado con false no se trata como colapsado', () => {
    const html = htmlBannerProposito('apartados', { propositoColapsado: { apartados: false } });
    expect(html).not.toContain('banner-proposito--colapsado');
  });
});
