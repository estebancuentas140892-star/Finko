/**
 * toque.test.js - el clic sobre una opción, ¿vino de un dedo o del teclado?
 *
 * Safari reenvía el clic del `<label>` a su `<input>` con `detail` 0, igual
 * que el de las flechas del teclado. `vigilarToques` lo distingue por el clic
 * del rótulo, que llega justo antes.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vigilarToques, vigilarEnvios, GRACIA_MS } from '../../modules/ui/toque.js';

const clic = (el, detail) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail }));
const tarea = () => new Promise(r => setTimeout(r, 0));

describe('vigilarToques', () => {
  let form;
  let esToque;
  /** Lo que respondió `esToque` en cada clic que llegó a un radio. */
  let respuestas;

  beforeEach(() => {
    document.body.innerHTML = `
      <form>
        <label id="la"><input type="radio" name="c" value="a" /><span id="sa">A</span></label>
        <label id="lb"><input type="radio" name="c" value="b" /><span id="sb">B</span></label>
        <label id="lx" for="x"><span id="sx">X</span></label>
        <input type="radio" name="c" value="x" id="x" />
        <button type="button" id="otro">Otro</button>
      </form>`;
    form = document.querySelector('form');
    esToque = vigilarToques(form);
    respuestas = [];
    form.addEventListener('click', (e) => {
      const radio = e.target.closest('input[type="radio"]');
      if (radio) respuestas.push(esToque(e, radio));
    });
  });

  const radio = (valor) => form.querySelector(`input[value="${valor}"]`);

  it('un clic directo con detail mayor que 0 es un toque (Chrome)', () => {
    clic(radio('a'), 1);
    expect(respuestas).toEqual([true]);
  });

  it('las flechas del teclado no son un toque', () => {
    clic(radio('a'), 0);
    expect(respuestas).toEqual([false]);
  });

  it('Safari: el clic reenviado desde el rótulo llega con detail 0 y es un toque', () => {
    clic(document.getElementById('sa'), 1);
    clic(radio('a'), 0);
    expect(respuestas).toEqual([true]);
  });

  it('vale también para el rótulo unido con for', () => {
    clic(document.getElementById('sx'), 1);
    clic(radio('x'), 0);
    expect(respuestas).toEqual([true]);
  });

  it('el toque de un rótulo no vale para la opción de otro', () => {
    clic(document.getElementById('sa'), 1);
    clic(radio('b'), 0);
    expect(respuestas).toEqual([false]);
  });

  it('el toque caduca al terminar su tarea: el teclado después no avanza', async () => {
    clic(document.getElementById('sa'), 1);
    await tarea();
    clic(radio('a'), 0);
    expect(respuestas).toEqual([false]);
  });

  it('un toque fuera de un rótulo no cuenta', () => {
    clic(document.getElementById('otro'), 1);
    clic(radio('a'), 0);
    expect(respuestas).toEqual([false]);
  });
});

/**
 * TEL.1c (ADR 199 D15): los frenos del dedo. El toque sobre una opción no
 * cuenta en los primeros 350 ms de una pantalla nueva, si el dedo viajó más
 * de 10 px o si empezó en otra opción. El mouse y el teclado no se frenan.
 */
describe('vigilarToques: los frenos del dedo', () => {
  let form;
  let esToque;
  let elegidos;

  /** Un toque: el dedo baja en (x, y) sobre `desde` y suelta en (x2, y) sobre `hasta`. */
  const toque = (desde, hasta = desde, { x = 10, y = 10, x2 = x, tipo = 'touch' } = {}) => {
    desde.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerType: tipo, clientX: x, clientY: y }));
    hasta.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, clientX: x2, clientY: y }));
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['performance', 'setTimeout', 'clearTimeout', 'Date'] });
    document.body.innerHTML = `
      <form>
        <label id="la"><input type="radio" name="c" value="a" /><span id="sa">A</span></label>
        <label id="lb"><input type="radio" name="c" value="b" /><span id="sb">B</span></label>
      </form>`;
    form = document.querySelector('form');
    esToque = vigilarToques(form);
    elegidos = [];
    form.addEventListener('click', (e) => {
      const radio = e.target.closest('label')?.querySelector('input');
      if (radio && esToque(e, radio)) elegidos.push(radio.value);
    });
  });
  afterEach(() => vi.useRealTimers());

  const sa = () => document.getElementById('sa');
  const sb = () => document.getElementById('sb');

  it('en los primeros 350 ms de la pantalla el toque cae en el vacío', () => {
    vi.advanceTimersByTime(120);
    toque(sa());
    expect(elegidos).toEqual([]);
    vi.advanceTimersByTime(GRACIA_MS);
    toque(sa());
    expect(elegidos).toEqual(['a']);
  });

  it('cada pantalla nueva vuelve a contar la gracia: el segundo toque de un temblor no elige', () => {
    vi.advanceTimersByTime(400);
    toque(sa());
    esToque.nuevaPantalla();
    vi.advanceTimersByTime(120);
    toque(sb());
    expect(elegidos).toEqual(['a']);
  });

  it('el dedo que viaja más de 10 px (rozar al desplazar) no elige; 8 px sí', () => {
    vi.advanceTimersByTime(400);
    toque(sa(), sa(), { x: 10, x2: 24 });
    expect(elegidos).toEqual([]);
    toque(sa(), sa(), { x: 10, x2: 18 });
    expect(elegidos).toEqual(['a']);
  });

  it('el toque que empieza en una opción y termina en otra no elige', () => {
    vi.advanceTimersByTime(400);
    toque(sa(), sb());
    expect(elegidos).toEqual([]);
  });

  it('el mouse y el teclado no tienen frenos', () => {
    toque(sa(), sa(), { tipo: 'mouse' });
    expect(elegidos).toEqual(['a']);
    sb().closest('label').querySelector('input').dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 0 }));
    expect(elegidos).toEqual(['a']);
  });
});

describe('vigilarEnvios: Guardar dos veces no anota dos veces (TEL.1c, ADR 199 D15)', () => {
  let envios;
  let hoja;
  let form;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['performance', 'setTimeout', 'clearTimeout', 'Date'] });
    document.body.innerHTML = '<div class="modal-overlay" data-open=""><form><button>Guardar</button></form></div>';
    hoja = document.querySelector('.modal-overlay');
    form = document.querySelector('form');
    envios = 0;
    form.addEventListener('submit', (e) => { e.preventDefault(); envios += 1; });
    vigilarEnvios();
  });
  afterEach(() => vi.useRealTimers());

  const enviar = () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

  it('con la hoja cerrándose, el segundo envío dentro de 1 s no cuenta', () => {
    enviar();
    delete hoja.dataset.open;
    vi.advanceTimersByTime(300);
    enviar();
    expect(envios).toBe(1);
  });

  it('con la hoja abierta (el primero falló por un campo), el segundo sí cuenta', () => {
    enviar();
    vi.advanceTimersByTime(300);
    enviar();
    expect(envios).toBe(2);
  });
});
