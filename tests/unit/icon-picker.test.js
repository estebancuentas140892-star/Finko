import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderIconoPicker, wireIconoPicker } from '../../modules/infra/icon-picker.js';

const ICONOS = [
  { icono: 'c-pesa',   etiqueta: 'Gimnasio' },
  { icono: 'c-avion',  etiqueta: 'Viaje' },
  { icono: 'c-otros',  etiqueta: 'Otro' },
];

describe('renderIconoPicker()', () => {
  it('sin valorActual: el recuadro muestra el placeholder vacío, no un ícono', () => {
    const html = renderIconoPicker(ICONOS);
    const div = document.createElement('div');
    div.innerHTML = html;
    const recuadro = div.querySelector('.icono-picker__recuadro');
    expect(recuadro.querySelector('.icono-picker__vacio')).not.toBeNull();
    expect(recuadro.querySelector('svg')).toBeNull();
  });

  it('con valorActual: el recuadro muestra ese ícono y su botón nace aria-pressed', () => {
    const html = renderIconoPicker(ICONOS, { valorActual: 'c-avion' });
    expect(html).not.toContain('icono-picker__vacio');
    const div = document.createElement('div');
    div.innerHTML = html;
    const recuadro = div.querySelector('.icono-picker__recuadro');
    expect(recuadro.innerHTML).toContain('#c-avion');
    const btnAvion = div.querySelector('[data-icon="c-avion"]');
    expect(btnAvion.getAttribute('aria-pressed')).toBe('true');
  });

  it('el panel nace colapsado (hidden) y el recuadro con aria-expanded false', () => {
    const html = renderIconoPicker(ICONOS);
    const div = document.createElement('div');
    div.innerHTML = html;
    expect(div.querySelector('.icono-picker__panel').hidden).toBe(true);
    expect(div.querySelector('.icono-picker__recuadro').getAttribute('aria-expanded')).toBe('false');
  });

  it('un botón por ícono del catálogo recibido', () => {
    const html = renderIconoPicker(ICONOS);
    const div = document.createElement('div');
    div.innerHTML = html;
    expect(div.querySelectorAll('.icono-picker__btn').length).toBe(ICONOS.length);
  });

  it('el input oculto usa el name pedido y arranca con el valor actual', () => {
    const html = renderIconoPicker(ICONOS, { nombreCampo: 'miIcono', valorActual: 'c-pesa' });
    const div = document.createElement('div');
    div.innerHTML = html;
    const input = div.querySelector('input[type="hidden"]');
    expect(input.name).toBe('miIcono');
    expect(input.value).toBe('c-pesa');
  });

  it('sin valorActual, el input oculto arranca vacío', () => {
    const html = renderIconoPicker(ICONOS);
    const div = document.createElement('div');
    div.innerHTML = html;
    expect(div.querySelector('input[type="hidden"]').value).toBe('');
  });
});

describe('wireIconoPicker()', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = renderIconoPicker(ICONOS, { id: 'test-picker' });
    container = document.querySelector('[data-icono-picker="test-picker"]');
    wireIconoPicker(container);
  });

  it('tocar el recuadro abre el panel; tocarlo de nuevo lo cierra', () => {
    const recuadro = container.querySelector('.icono-picker__recuadro');
    const panel    = container.querySelector('.icono-picker__panel');

    recuadro.click();
    expect(panel.hidden).toBe(false);
    expect(recuadro.getAttribute('aria-expanded')).toBe('true');

    recuadro.click();
    expect(panel.hidden).toBe(true);
    expect(recuadro.getAttribute('aria-expanded')).toBe('false');
  });

  it('elegir un ícono lo marca, actualiza el recuadro y el input, y colapsa el panel', () => {
    const recuadro = container.querySelector('.icono-picker__recuadro');
    const panel    = container.querySelector('.icono-picker__panel');
    const input    = container.querySelector('input[type="hidden"]');

    recuadro.click(); // abrir
    const btn = panel.querySelector('[data-icon="c-avion"]');
    btn.click();

    expect(input.value).toBe('c-avion');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(recuadro.innerHTML).toContain('#c-avion');
    expect(panel.hidden).toBe(true);
    expect(recuadro.getAttribute('aria-expanded')).toBe('false');
  });

  it('elegir un ícono desmarca cualquier otro previamente marcado', () => {
    const panel = container.querySelector('.icono-picker__panel');
    panel.querySelector('[data-icon="c-pesa"]').click();
    panel.querySelector('[data-icon="c-avion"]').click();

    expect(panel.querySelector('[data-icon="c-pesa"]').getAttribute('aria-pressed')).toBe('false');
    expect(panel.querySelector('[data-icon="c-avion"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('dispara onSeleccionar con el ícono elegido', () => {
    const onSeleccionar = vi.fn();
    document.body.innerHTML = renderIconoPicker(ICONOS, { id: 'test-picker-2' });
    const c2 = document.querySelector('[data-icono-picker="test-picker-2"]');
    wireIconoPicker(c2, { onSeleccionar });

    c2.querySelector('[data-icon="c-otros"]').click();
    expect(onSeleccionar).toHaveBeenCalledWith('c-otros');
  });

  it('sin container, no lanza error (guard)', () => {
    expect(() => wireIconoPicker(null)).not.toThrow();
  });

  it('clic fuera de un botón dentro del panel no hace nada', () => {
    const panel = container.querySelector('.icono-picker__panel');
    const input = container.querySelector('input[type="hidden"]');
    panel.click(); // clic en el propio contenedor, no en un botón
    expect(input.value).toBe('');
  });
});
