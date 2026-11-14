import { describe, it, expect, beforeEach, vi } from 'vitest';
import { areaConTeclado, initTeclado, llevarCampoALaVista, UMBRAL_TECLADO_PX } from '../../modules/ui/teclado.js';

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

// REV.2b (ADR 141 D4): el campo que se escribe no queda tapado por el teclado.

describe('llevarCampoALaVista()', () => {
  /** Una hoja abierta con un campo cuyo rectángulo fija el test. */
  function hojaCon(html, rect = { top: 700, bottom: 744 }) {
    document.body.innerHTML = `<div class="modal-overlay" data-open><div class="modal">${html}</div></div>`;
    const campo = document.body.querySelector('input, textarea, select, button');
    campo.getBoundingClientRect = () => rect;
    campo.scrollIntoView = vi.fn();
    return campo;
  }
  const vv = { height: 500, offsetTop: 0 };

  it('un campo de texto bajo el teclado sube al centro', () => {
    const campo = hojaCon('<input type="text" />');
    expect(llevarCampoALaVista(campo, vv)).toBe(true);
    expect(campo.scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'nearest' });
  });

  it('un campo tapado por el pie de la hoja también sube', () => {
    const campo = hojaCon('<input type="text" />', { top: 380, bottom: 424 });
    expect(llevarCampoALaVista(campo, vv)).toBe(true);
  });

  it('lo que ya se ve no se mueve', () => {
    const campo = hojaCon('<input type="text" />', { top: 120, bottom: 164 });
    expect(llevarCampoALaVista(campo, vv)).toBe(false);
    expect(campo.scrollIntoView).not.toHaveBeenCalled();
  });

  it('casillas, radios, botones y desplegables no abren teclado: no se mueven', () => {
    for (const html of ['<input type="checkbox" />', '<input type="radio" />', '<button>Ok</button>', '<select><option>1</option></select>']) {
      const campo = hojaCon(html);
      expect(llevarCampoALaVista(campo, vv)).toBe(false);
    }
  });

  it('fuera de una hoja abierta lo desplaza el navegador: no se toca', () => {
    document.body.innerHTML = '<input type="text" />';
    const campo = document.body.querySelector('input');
    campo.scrollIntoView = vi.fn();
    expect(llevarCampoALaVista(campo, vv)).toBe(false);
    expect(campo.scrollIntoView).not.toHaveBeenCalled();
  });

  it('al abrirse el teclado, el campo enfocado de la hoja sube; al desplazar, no', () => {
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });
    const raf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (fn) => { fn(); return 0; };
    try {
      const campo = hojaCon('<input type="text" />');
      campo.focus();
      const vvF = new globalThis.EventTarget();
      Object.assign(vvF, { height: 844, offsetTop: 0, scale: 1 });
      initTeclado(vvF);
      vvF.height = 500;
      vvF.dispatchEvent(new Event('resize'));
      expect(campo.scrollIntoView).toHaveBeenCalledTimes(1);
      vvF.dispatchEvent(new Event('scroll'));
      expect(campo.scrollIntoView).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.requestAnimationFrame = raf;
      delete document.documentElement.dataset.teclado;
    }
  });
});
