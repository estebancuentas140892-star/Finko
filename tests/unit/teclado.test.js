import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  alPulsarEnter, areaConTeclado, campoSiguiente, initTeclado, llevarCampoALaVista, marcarTeclaEnter, UMBRAL_TECLADO_PX,
} from '../../modules/ui/teclado.js';

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

  it('un campo de texto bajo el teclado sube al tope, no al centro (ADR 142 D8)', () => {
    const campo = hojaCon('<input type="text" />');
    expect(llevarCampoALaVista(campo, vv)).toBe(true);
    expect(campo.scrollIntoView).toHaveBeenCalledWith({ block: 'start', inline: 'nearest' });
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

// FORM.2a (ADR 142 D8): Enter avanza, no envía.

describe('Enter en una hoja del teléfono', () => {
  const matchMediaReal = window.matchMedia;
  /** Una hoja abierta con un formulario: dos campos, una casilla y uno plegado. */
  function hoja(extra = '') {
    document.body.innerHTML = `
      <div class="modal-overlay" data-open><div class="modal"><form id="f">
        <input name="nombre" type="text" />
        <input name="acepta" type="checkbox" />
        <div hidden><input name="plegado" type="text" /></div>
        <input name="monto" type="text" inputmode="numeric" />
        ${extra}
        <textarea name="nota"></textarea>
        <button type="submit">Guardar deuda</button>
      </form></div></div>`;
    const f = document.getElementById('f');
    return (n) => f.querySelector(`[name="${n}"]`);
  }
  const enter = (el) => {
    const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    el.dispatchEvent(e);
    return e;
  };

  beforeEach(() => { window.matchMedia = () => ({ matches: true, addEventListener() {} }); });
  afterEach(() => {
    window.matchMedia = matchMediaReal;
    document.removeEventListener('keydown', alPulsarEnter);
  });

  it('el siguiente es el próximo campo que abre teclado y se ve: no la casilla ni lo plegado', () => {
    const $ = hoja();
    expect(campoSiguiente($('nombre'))).toBe($('monto'));
    expect(campoSiguiente($('monto'))).toBe($('nota'));
    expect(campoSiguiente($('nota'))).toBeNull();
  });

  it('la tecla dice "Siguiente" o "Listo"; lo que el formulario ya trae escrito manda', () => {
    let $ = hoja('<input name="pin" type="text" enterkeyhint="go" />');
    marcarTeclaEnter($('nombre'));
    expect($('nombre').getAttribute('enterkeyhint')).toBe('next');
    marcarTeclaEnter($('pin'));
    expect($('pin').getAttribute('enterkeyhint')).toBe('go');
    $ = hoja();
    marcarTeclaEnter($('monto'));
    expect($('monto').getAttribute('enterkeyhint')).toBe('next');
    // El último de una línea, sin área de texto detrás: "Listo".
    document.body.innerHTML = '<div class="modal-overlay" data-open><form><input name="solo" type="text" /></form></div>';
    const solo = document.querySelector('[name="solo"]');
    marcarTeclaEnter(solo);
    expect(solo.getAttribute('enterkeyhint')).toBe('done');
  });

  it('Enter pasa al campo siguiente y no envía el formulario', () => {
    const $ = hoja();
    document.addEventListener('keydown', alPulsarEnter);
    let enviado = false;
    document.getElementById('f').addEventListener('submit', (e) => { enviado = true; e.preventDefault(); });
    $('nombre').focus();
    const e = enter($('nombre'));
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe($('monto'));
    expect(enviado).toBe(false);
  });

  it('en el último campo de una línea Enter cierra el teclado; el área de texto conserva su salto', () => {
    const $ = hoja();
    document.addEventListener('keydown', alPulsarEnter);
    expect(enter($('nota')).defaultPrevented).toBe(false);
    document.body.innerHTML = '<div class="modal-overlay" data-open><form><input name="solo" type="text" /></form></div>';
    const solo = document.querySelector('[name="solo"]');
    solo.focus();
    expect(enter(solo).defaultPrevented).toBe(true);
    expect(document.activeElement).not.toBe(solo);
  });

  it('en escritorio, o fuera de una hoja, Enter sigue siendo del navegador', () => {
    const $ = hoja();
    document.addEventListener('keydown', alPulsarEnter);
    window.matchMedia = () => ({ matches: false, addEventListener() {} });
    expect(enter($('nombre')).defaultPrevented).toBe(false);
    window.matchMedia = () => ({ matches: true, addEventListener() {} });
    document.body.innerHTML = '<form><input name="nombre" type="text" /><input name="b" type="text" /></form>';
    expect(enter(document.querySelector('[name="nombre"]')).defaultPrevented).toBe(false);
  });
});

// MV2.28: leer `visualViewport` obliga a maquetar; al arrancar va un cuadro después.
describe('initTeclado() no lee el área en el arranque (MV2.28)', () => {
  it('la primera lectura de visualViewport espera al cuadro siguiente', () => {
    const raf = globalThis.requestAnimationFrame;
    const pendientes = [];
    globalThis.requestAnimationFrame = (fn) => pendientes.push(fn);
    try {
      let lecturas = 0;
      const vv = new globalThis.EventTarget();
      Object.defineProperty(vv, 'height', { get() { lecturas++; return 500; } });
      Object.assign(vv, { offsetTop: 0, scale: 1 });
      Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });
      initTeclado(vv);
      expect(lecturas).toBe(0);
      expect('teclado' in document.documentElement.dataset).toBe(false);
      pendientes.splice(0).forEach((fn) => fn());
      expect(document.documentElement.dataset.teclado).toBe('abierto');
    } finally {
      globalThis.requestAnimationFrame = raf;
      delete document.documentElement.dataset.teclado;
      document.documentElement.removeAttribute('style');
    }
  });
});
