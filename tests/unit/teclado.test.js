import { describe, it, expect, beforeEach } from 'vitest';
import { areaConTeclado, initTeclado, UMBRAL_TECLADO_PX } from '../../modules/ui/teclado.js';

// ADR 115 (MV2.5): con el teclado abierto, la hoja se pega al área visible.

describe('areaConTeclado()', () => {
  it('sin teclado, el área visible es la página: no hay nada que ajustar', () => {
    expect(areaConTeclado({ height: 844, offsetTop: 0 }, 844)).toBeNull();
  });

  it('la barra del navegador que se esconde no es teclado', () => {
    expect(areaConTeclado({ height: 844 - UMBRAL_TECLADO_PX + 1, offsetTop: 0 }, 844)).toBeNull();
  });

  it('con teclado devuelve el alto y el tope del área visible, redondeados', () => {
    expect(areaConTeclado({ height: 507.6, offsetTop: 120.2 }, 844)).toEqual({ alto: 508, arriba: 120 });
  });

  it('con la página ampliada el área se achica, pero no es teclado', () => {
    expect(areaConTeclado({ height: 422, offsetTop: 0, scale: 2 }, 844)).toBeNull();
  });

  it('sin datos no inventa nada', () => {
    expect(areaConTeclado(null, 844)).toBeNull();
    expect(areaConTeclado({ height: 400, offsetTop: 0 }, 0)).toBeNull();
  });
});

describe('initTeclado()', () => {
  /** Un visualViewport de mentira: propiedades que el test cambia y eventos. */
  function vvFalso(height) {
    const vv = new globalThis.EventTarget();
    Object.assign(vv, { height, offsetTop: 0, scale: 1 });
    return vv;
  }

  beforeEach(() => {
    const raiz = document.documentElement;
    raiz.removeAttribute('style');
    delete raiz.dataset.teclado;
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });
  });

  it('al abrirse el teclado marca <html> con el área, y al cerrarse la quita', () => {
    const vv = vvFalso(844);
    initTeclado(vv);
    const raiz = document.documentElement;
    expect('teclado' in raiz.dataset).toBe(false);

    vv.height = 500;
    vv.offsetTop = 40;
    vv.dispatchEvent(new Event('resize'));
    expect(raiz.dataset.teclado).toBe('abierto');
    expect(raiz.style.getPropertyValue('--fk-vv-alto')).toBe('500px');
    expect(raiz.style.getPropertyValue('--fk-vv-arriba')).toBe('40px');

    vv.height = 844;
    vv.offsetTop = 0;
    vv.dispatchEvent(new Event('resize'));
    expect('teclado' in raiz.dataset).toBe(false);
    expect(raiz.style.getPropertyValue('--fk-vv-alto')).toBe('');
  });

  it('sin visualViewport no hace nada', () => {
    expect(() => initTeclado(null)).not.toThrow();
    expect('teclado' in document.documentElement.dataset).toBe(false);
  });
});
