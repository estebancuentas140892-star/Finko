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
    expect(htmlBannerProposito('desconocida', false)).toBe('');
    expect(htmlBannerProposito('', false)).toBe('');
  });

  it('renderiza el banner cuando la sección no tiene datos', () => {
    const html = htmlBannerProposito('apartados', false);
    expect(html).toContain('banner-proposito');
    expect(html).toContain('data-seccion="apartados"');
  });

  it('tieneDatos por defecto es false: renderiza si se omite el argumento', () => {
    const html = htmlBannerProposito('apartados');
    expect(html).toContain('banner-proposito');
  });

  it('devuelve string vacío cuando la sección ya tiene datos (divulgación progresiva)', () => {
    const html = htmlBannerProposito('apartados', true);
    expect(html).toBe('');
  });

  it('el banner contiene el texto del copy de Apartados', () => {
    const html = htmlBannerProposito('apartados', false);
    expect(html).toContain('SOAT');
    expect(html).toContain('Apartados te ayuda');
  });

  it('MC.5e (ADR 017 decisión 7): el propósito de Límites de gasto se alinea con "Mis cuentas planifica, Límites vigila"', () => {
    const { texto } = PROPOSITOS_SECCION.presupuesto;
    expect(texto).toContain('Mis cuentas');
    expect(texto).toContain('Necesidades');
    expect(texto).toContain('Estilo de vida');
    expect(texto).toContain('Ahorro');
  });

  it('EP.7d: el propósito de Me deben ya no dice "Personales"', () => {
    const { texto } = PROPOSITOS_SECCION.personales;
    expect(texto).toContain('Me deben');
  });
});
