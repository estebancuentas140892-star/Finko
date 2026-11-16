/**
 * toque.test.js - el clic sobre una opción, ¿vino de un dedo o del teclado?
 *
 * Safari reenvía el clic del `<label>` a su `<input>` con `detail` 0, igual
 * que el de las flechas del teclado. `vigilarToques` lo distingue por el clic
 * del rótulo, que llega justo antes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { vigilarToques } from '../../modules/ui/toque.js';

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
