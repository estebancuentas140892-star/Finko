/**
 * preguntas.test.js - crear algo nuevo: una pregunta por pantalla y un
 * resumen (FORM.2e, ADR 142 D5).
 *
 * - `valorDeBloque`: lo que dice cada respuesta en el resumen.
 * - El armazón sobre un formulario de prueba con los atributos de siempre:
 *   progreso, elegir que avanza, "Siguiente" que no deja seguir sin
 *   responder, el teclado de Finko en el dinero, el selector de día, el
 *   resumen con sus filas, "Agrega si quieres" y editar desde el resumen.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { valorDeBloque } from '../../modules/ui/preguntas.js';
import { prepararHojaTelefono } from '../../modules/ui/captura-telefono.js';
import { S } from '../../modules/core/state.js';

const div = (html) => {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.firstElementChild;
};

describe('valorDeBloque()', () => {
  it('opción elegida, dinero con sufijo, día, texto, lista y sí o no', () => {
    expect(valorDeBloque(div(`<div><label class="chip-cat"><input type="radio" name="c" checked /><span class="chip-cat__label">Tarjeta</span></label></div>`))).toBe('Tarjeta');
    expect(valorDeBloque(div(`<div data-resumen-sufijo=" al mes"><input data-miles value="350.000" /></div>`))).toBe('$350.000 al mes');
    expect(valorDeBloque(div(`<div data-control="dia"><input type="hidden" value="28" /><button aria-pressed="true">28</button></div>`))).toBe('El 28 de cada mes');
    expect(valorDeBloque(div(`<div data-control="dia"><input type="hidden" value="31" /></div>`))).toBe('El último día de cada mes');
    expect(valorDeBloque(div(`<div><input type="text" value=" Visa " /></div>`))).toBe('Visa');
    expect(valorDeBloque(div(`<div><select><option value="Mensual" selected>Mensual</option></select></div>`))).toBe('Mensual');
    expect(valorDeBloque(div(`<div><input type="checkbox" /></div>`))).toBe('');
    expect(valorDeBloque(div(`<div><input type="checkbox" checked /><label><input type="radio" checked /><span class="cuenta-picker__nombre">Nequi</span></label></div>`))).toBe('Sí · Nequi');
  });

  it('sin respuesta: vacío', () => {
    expect(valorDeBloque(div('<div><input type="text" value="" /></div>'))).toBe('');
    expect(valorDeBloque(div('<div><input data-miles value="" /></div>'))).toBe('');
  });
});

describe('el armazón de preguntas', () => {
  const matchMediaReal = window.matchMedia;

  const FORM = (inicio = '') => `
    <div class="modal-overlay" id="hoja"><div class="modal">
      <header class="modal__header"><h2 class="modal__title">Nueva deuda</h2></header>
      <div class="modal__body">
        <form id="f" novalidate data-preguntas="Nueva deuda" data-resumen-titulo="Así queda tu deuda" data-preguntas-inicio="${inicio}">
          <input type="hidden" name="tipo" value="deuda-entidad" />
          <div data-pregunta="¿Qué tipo de deuda es?" data-resumen="Tipo" data-falta="Elige una opción para seguir.">
            <label class="chip-cat"><input type="radio" name="categoria" value="Tarjeta" required /><span class="chip-cat__label">Tarjeta</span></label>
            <label class="chip-cat" data-no-avanza><input type="radio" name="categoria" value="Otra" required /><span class="chip-cat__label">Otra</span></label>
          </div>
          <div class="form-group" data-pregunta="¿Cómo la reconoces?" data-resumen="Nombre" data-falta="Ponle un nombre para reconocerla.">
            <label for="d" class="label">¿Cuál es la deuda?</label>
            <input id="d" name="descripcion" type="text" required />
          </div>
          <div class="monto-hero" data-pregunta="¿Cuánto debes hoy?" data-resumen="Lo que debes hoy">
            <input id="s" name="saldoTotal" data-miles required />
          </div>
          <div class="form-group" data-opcional="Nota"><input id="n" name="nota" type="text" /></div>
          <div class="form-group" data-pregunta="¿Qué día pagas la cuota?" data-control="dia" data-resumen="Día de pago">
            <input id="dia" name="diaPago" type="number" value="${inicio ? '15' : ''}" required />
          </div>
          <div class="modal__footer modal__footer--principal"><button type="submit" class="btn btn-primary">Guardar deuda</button></div>
        </form>
      </div>
    </div></div>`;

  beforeEach(() => {
    window.matchMedia = (q) => ({ matches: q.includes('max-width'), media: q, addEventListener() {}, removeEventListener() {} });
    S.config.tecladoTelefono = false;
  });
  afterEach(() => { window.matchMedia = matchMediaReal; });

  const abrir = (html = FORM()) => {
    document.body.innerHTML = html;
    const overlay = document.getElementById('hoja');
    prepararHojaTelefono(overlay);
    overlay.dataset.open = '';
    return overlay.querySelector('form');
  };
  const titulo = (form) => form.querySelector('[data-preguntas-t]').textContent;
  const seguir = (form) => form.querySelector('[data-preguntas-seguir]').click();
  const tocar = (input) => input.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }));

  it('una pregunta a la vez, con su progreso', () => {
    const form = abrir();
    expect(titulo(form)).toBe('¿Qué tipo de deuda es?');
    expect(form.querySelector('[data-preguntas-n]').textContent).toBe('Nueva deuda · 1 de 4');
    expect(form.querySelectorAll('.prog__s')).toHaveLength(4);
    expect(form.querySelectorAll('[data-pregunta-on]')).toHaveLength(2); // el bloque y su pie
    // El día del mes deja de ser un número del sistema.
    expect(form.querySelector('[name="diaPago"]').type).toBe('hidden');
    expect(form.querySelectorAll('.dia')).toHaveLength(32);
  });

  it('en Safari elegir con el dedo también avanza: el clic reenviado trae detail 0', async () => {
    const form = abrir();
    const tarjeta = form.querySelector('input[value="Tarjeta"]');
    tarjeta.checked = true;
    // Con las flechas del teclado no avanza.
    tarjeta.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 0 }));
    await new Promise(r => setTimeout(r, 0));
    expect(titulo(form)).toBe('¿Qué tipo de deuda es?');
    // El dedo toca el rótulo y Safari reenvía el clic al radio con detail 0.
    tocar(tarjeta.closest('label').querySelector('.chip-cat__label'));
    tarjeta.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 0 }));
    await new Promise(r => setTimeout(r, 0));
    expect(titulo(form)).toBe('¿Cómo la reconoces?');
  });

  it('elegir con el dedo avanza; "Otra" no', async () => {
    const form = abrir();
    const otra = form.querySelector('input[value="Otra"]');
    otra.checked = true;
    tocar(otra);
    await new Promise(r => setTimeout(r, 0));
    expect(titulo(form)).toBe('¿Qué tipo de deuda es?');
    const tarjeta = form.querySelector('input[value="Tarjeta"]');
    tarjeta.checked = true;
    tocar(tarjeta);
    await new Promise(r => setTimeout(r, 0));
    expect(titulo(form)).toBe('¿Cómo la reconoces?');
  });

  it('sin responder no se sigue, y el error dice qué hacer', () => {
    const form = abrir();
    form.querySelector('input[value="Tarjeta"]').checked = true;
    seguir(form);
    seguir(form);
    expect(titulo(form)).toBe('¿Cómo la reconoces?');
    expect(form.querySelector('.form-errors, .form-error').textContent).toContain('Ponle un nombre');
  });

  it('el dinero con el teclado de Finko, el día con su botón y el resumen con sus filas', () => {
    const form = abrir();
    form.querySelector('input[value="Tarjeta"]').checked = true;
    seguir(form);
    form.querySelector('#d').value = 'Visa';
    seguir(form);
    expect(titulo(form)).toBe('¿Cuánto debes hoy?');
    expect(form.querySelector('#s').inputMode).toBe('none');
    for (const t of ['3', '000', '000']) form.querySelector(`[data-pregunta-on] [data-tecla="${t}"]`).click();
    seguir(form);
    expect(titulo(form)).toBe('¿Qué día pagas la cuota?');
    expect(form.querySelector('[data-preguntas-n]').textContent).toContain('la última');
    form.querySelector('[data-dia="28"]').click();
    expect(form.dataset.preguntaActual).toBe('resumen');
    expect(titulo(form)).toBe('Así queda tu deuda');
    const filas = [...form.querySelectorAll('[data-resumen-filas] .recibo__fila')]
      .map(f => [f.querySelector('.recibo__k').textContent, f.querySelector('.recibo__v').textContent]);
    expect(filas).toEqual([
      ['Tipo', 'Tarjeta'], ['Nombre', 'Visa'], ['Lo que debes hoy', '$3.000.000'], ['Día de pago', 'El 28 de cada mes'],
    ]);
    expect([...form.querySelectorAll('[data-resumen-fichas] .add')].map(b => b.textContent.trim())).toEqual(['Nota']);
    // El botón de guardar del formulario va en el resumen.
    expect(form.querySelector('button[type="submit"]').closest('[data-pregunta-on]')).not.toBeNull();
    expect(new FormData(form).get('diaPago')).toBe('28');
  });

  it('una fila del resumen vuelve a su pregunta y "Listo" regresa', () => {
    const form = abrir(FORM('resumen'));
    form.querySelector('input[value="Tarjeta"]').checked = true;
    form.querySelector('#d').value = 'Visa';
    form.querySelector('#s').value = '1.000';
    prepararHojaTelefono(document.getElementById('hoja'));
    expect(form.dataset.preguntaActual).toBe('resumen');
    form.querySelector('[data-resumen-filas] .recibo__fila:nth-child(2)').click();
    expect(titulo(form)).toBe('¿Cómo la reconoces?');
    expect(form.querySelector('[data-preguntas-seguir]').textContent).toBe('Listo');
    form.querySelector('#d').value = 'Mastercard';
    seguir(form);
    expect(form.dataset.preguntaActual).toBe('resumen');
    expect(form.querySelector('[data-resumen-filas]').textContent).toContain('Mastercard');
  });

  it('"Agrega si quieres" abre lo opcional y vuelve con su fila', () => {
    const form = abrir(FORM('resumen'));
    form.querySelector('[data-resumen-fichas] .add').click();
    expect(titulo(form)).toBe('Nota');
    form.querySelector('#n').value = 'Referencia 123';
    seguir(form);
    expect(form.dataset.preguntaActual).toBe('resumen');
    expect(form.querySelector('[data-resumen-filas]').textContent).toContain('Referencia 123');
    expect(form.querySelector('[data-resumen-fichas]').textContent).not.toContain('Nota');
  });

  it('en escritorio no toca nada', () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    const form = abrir();
    expect(form.querySelector('.preguntas__cab')).toBeNull();
    expect(form.querySelector('[name="diaPago"]').type).toBe('number');
  });
});
