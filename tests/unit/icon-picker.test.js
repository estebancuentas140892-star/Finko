import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderIconoPicker, wireIconoPicker, resetIconoPicker, setIconoPickerValor } from '../../modules/infra/icon-picker.js';

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

  it('CAT.2b: el input oculto expone su propio id (= el id del picker), para consumidores que necesitan resetearlo directo', () => {
    const html = renderIconoPicker(ICONOS, { id: 'meta-icono' });
    const div = document.createElement('div');
    div.innerHTML = html;
    expect(div.querySelector('#meta-icono')).not.toBeNull();
    expect(div.querySelector('#meta-icono').type).toBe('hidden');
  });

  it('CAT.2c: label vacío omite el <span> de etiqueta (uso compacto)', () => {
    const html = renderIconoPicker(ICONOS, { label: '' });
    const div = document.createElement('div');
    div.innerHTML = html;
    expect(div.querySelector('.icono-picker-field > .label')).toBeNull();
  });

  it('CAT.2c: label vacío igual deja un aria-label útil en el panel (no queda vacío)', () => {
    const html = renderIconoPicker(ICONOS, { label: '' });
    const div = document.createElement('div');
    div.innerHTML = html;
    const panelAriaLabel = div.querySelector('.icono-picker__panel').getAttribute('aria-label');
    expect(panelAriaLabel).toBeTruthy();
  });

  it('con label, sí renderiza el <span> de etiqueta', () => {
    const html = renderIconoPicker(ICONOS, { label: 'Ícono' });
    const div = document.createElement('div');
    div.innerHTML = html;
    expect(div.querySelector('.icono-picker-field > .label').textContent).toBe('Ícono');
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

describe('resetIconoPicker()', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = renderIconoPicker(ICONOS, { id: 'reset-picker', valorActual: 'c-avion' });
    container = document.querySelector('[data-icono-picker="reset-picker"]');
    wireIconoPicker(container);
  });

  it('vacía el input oculto y devuelve el recuadro al placeholder', () => {
    resetIconoPicker(container);
    const input    = container.querySelector('input[type="hidden"]');
    const recuadro = container.querySelector('.icono-picker__recuadro');
    expect(input.value).toBe('');
    expect(recuadro.querySelector('.icono-picker__vacio')).not.toBeNull();
  });

  it('desmarca cualquier botón previamente elegido y colapsa el panel', () => {
    const panel = container.querySelector('.icono-picker__panel');
    panel.querySelector('[data-icon="c-avion"]').setAttribute('aria-pressed', 'true');
    panel.hidden = false; // simula que quedó abierto

    resetIconoPicker(container);

    expect(panel.querySelector('[data-icon="c-avion"]').getAttribute('aria-pressed')).toBe('false');
    expect(panel.hidden).toBe(true);
    expect(container.querySelector('.icono-picker__recuadro').getAttribute('aria-expanded')).toBe('false');
  });

  it('sin container, no lanza error (guard)', () => {
    expect(() => resetIconoPicker(null)).not.toThrow();
  });

  it('después de resetear, elegir un ícono nuevo sigue funcionando (wiring intacto)', () => {
    resetIconoPicker(container);
    container.querySelector('.icono-picker__recuadro').click();
    container.querySelector('[data-icon="c-pesa"]').click();
    expect(container.querySelector('input[type="hidden"]').value).toBe('c-pesa');
  });
});

describe('setIconoPickerValor() (CAT.2c, valores externos como plantillas)', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = renderIconoPicker(ICONOS, { id: 'plantilla-picker' });
    container = document.querySelector('[data-icono-picker="plantilla-picker"]');
    wireIconoPicker(container);
  });

  it('fija el input oculto y el recuadro con un valor ajeno al catálogo (ej. un emoji)', () => {
    setIconoPickerValor(container, '🚗', '🚗');
    const input    = container.querySelector('input[type="hidden"]');
    const recuadro = container.querySelector('.icono-picker__recuadro');
    expect(input.value).toBe('🚗');
    expect(recuadro.innerHTML).toBe('🚗');
  });

  it('ningún botón de la grilla queda marcado cuando el valor no está en el catálogo', () => {
    setIconoPickerValor(container, '🚗', '🚗');
    const marcados = container.querySelectorAll('.icono-picker__btn[aria-pressed="true"]');
    expect(marcados.length).toBe(0);
  });

  it('si el valor SÍ coincide con un ícono del catálogo, ese botón queda marcado', () => {
    setIconoPickerValor(container, 'c-avion', '<svg></svg>');
    expect(container.querySelector('[data-icon="c-avion"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('colapsa el panel y dispara aria-expanded false', () => {
    container.querySelector('.icono-picker__recuadro').click(); // abrir
    setIconoPickerValor(container, '🚗', '🚗');
    expect(container.querySelector('.icono-picker__panel').hidden).toBe(true);
    expect(container.querySelector('.icono-picker__recuadro').getAttribute('aria-expanded')).toBe('false');
  });

  it('el picker sigue interactivo después: elegir de la grilla reemplaza el valor externo', () => {
    setIconoPickerValor(container, '🚗', '🚗');
    container.querySelector('.icono-picker__recuadro').click();
    container.querySelector('[data-icon="c-pesa"]').click();
    expect(container.querySelector('input[type="hidden"]').value).toBe('c-pesa');
  });

  it('sin container, no lanza error (guard)', () => {
    expect(() => setIconoPickerValor(null, 'x', 'x')).not.toThrow();
  });
});
