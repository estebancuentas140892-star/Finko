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
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { valorDeBloque, PAUSA_ELEGIR_MS, simboloDeFilaFactura } from '../../modules/ui/preguntas.js';
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
      ['Tipo', 'Tarjeta'], ['Nombre', 'Visa'], ['Día de pago', 'El 28 de cada mes'],
    ]);
    // FAC.1 (ADR 180 D4): lo que debes es la cifra de la factura, una vez.
    expect(form.querySelector('[data-resumen-cifra]').hidden).toBe(false);
    expect(form.querySelector('[data-resumen-monto]').textContent).toBe('$3.000.000');
    expect(form.querySelector('[data-resumen-que]').textContent).toBe('Lo que debes hoy');
    expect([...form.querySelectorAll('[data-resumen-fichas] .add')].map(b => b.textContent.trim())).toEqual(['Nota']);
    // El botón de guardar del formulario va en el resumen.
    expect(form.querySelector('button[type="submit"]').closest('[data-pregunta-on]')).not.toBeNull();
    expect(new FormData(form).get('diaPago')).toBe('28');
  });

  it('GF.1 (ADR 167 D1): el dinero con data-cifra se viste como el monto de Registrar gasto', () => {
    const form = abrir(FORM().replace('class="monto-hero" data-pregunta="¿Cuánto debes hoy?"', 'class="monto-hero" data-cifra data-pregunta="¿Cuánto debes hoy?"'));
    form.querySelector('input[value="Tarjeta"]').checked = true;
    seguir(form);
    form.querySelector('#d').value = 'Visa';
    seguir(form);
    const bloque = form.querySelector('[data-pregunta-on][data-cifra]');
    // La pregunta va al centro, dentro de la cifra; el título grande no se repite.
    expect(form.querySelector('.preguntas__cab').classList.contains('preguntas__cab--cifra')).toBe(true);
    expect(bloque.querySelector('.pmonto__q').textContent).toBe('¿Cuánto debes hoy?');
    expect(bloque.querySelector('.pmonto__caja #s')).not.toBeNull();
    expect(bloque.querySelector('.pmonto__lee').textContent).toBe('Márcalo con el teclado de abajo');
    // Sin salida al teclado del teléfono, también para quien lo había elegido.
    expect(bloque.querySelector('[data-kp-sistema]')).toBeNull();
    // Sin monto no sigue, y lo dice en la lectura.
    seguir(form);
    expect(bloque.querySelector('.pmonto').classList.contains('pmonto--error')).toBe(true);
    expect(bloque.querySelector('.pmonto__lee').textContent).toBe('Escribe cuánto. Por ejemplo: 50.000');
    for (const t of ['3', '000', '000']) bloque.querySelector(`[data-tecla="${t}"]`).click();
    expect(bloque.querySelector('.pmonto').classList.contains('pmonto--error')).toBe(false);
    expect(bloque.querySelector('.pmonto__caja').dataset.valor).toBe('3.000.000');
    expect(bloque.querySelector('.pmonto__lee').textContent).toBe('Tres millones de pesos');
    seguir(form);
    expect(titulo(form)).toBe('¿Qué día pagas la cuota?');
    expect(form.querySelector('.preguntas__cab').classList.contains('preguntas__cab--cifra')).toBe(false);
    expect(new FormData(form).get('saldoTotal')).toBe('3.000.000');
  });

  it('GF.1: con data-cifra tampoco hay salida al teclado del teléfono si la persona lo había elegido', () => {
    S.config.tecladoTelefono = true;
    const form = abrir(FORM().replace('class="monto-hero" data-pregunta="¿Cuánto debes hoy?"', 'class="monto-hero" data-cifra data-pregunta="¿Cuánto debes hoy?"'));
    expect(form.querySelector('#s').inputMode).toBe('none');
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
    // FAC.1: la nota va aparte, tras otro corte.
    expect(form.querySelector('[data-resumen-notas]').hidden).toBe(false);
    expect(form.querySelector('[data-resumen-notas]').textContent).toContain('Referencia 123');
    expect(form.querySelector('[data-resumen-filas]').textContent).not.toContain('Referencia 123');
    expect(form.querySelector('[data-resumen-fichas]').textContent).not.toContain('Nota');
  });

  it('en escritorio no toca nada', () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    const form = abrir();
    expect(form.querySelector('.preguntas__cab')).toBeNull();
    expect(form.querySelector('[name="diaPago"]').type).toBe('number');
  });
});

describe('el armazón con pasos con nombre (GF.2, ADR 177)', () => {
  const matchMediaReal = window.matchMedia;

  const FORM = (inicio = '') => `
    <div class="modal-overlay" id="hoja"><div class="modal">
      <header class="modal__header"><h2 class="modal__title">Nuevo gasto fijo</h2></header>
      <div class="modal__body">
        <form id="f" novalidate data-preguntas="Nuevo gasto fijo" data-pasos="Monto|Qué es|Cuándo|Revisar"
              data-resumen-titulo="Así queda tu gasto fijo" data-resumen-agregar="También puedes hacerlo después." data-preguntas-inicio="${inicio}">
          <div class="monto-hero" data-pregunta="¿Cuánto pagas?" data-pregunta-id="monto" data-paso="Monto" data-resumen="Cuánto pagas" data-resumen-orden="2">
            <span hidden data-resumen-icono>$</span>
            <input id="m" name="monto" data-miles value="${inicio ? '85.000' : ''}" required />
          </div>
          <div data-pregunta="¿Qué es?" data-pregunta-id="que" data-paso="Qué es" data-resumen="Qué es" data-resumen-orden="1" data-falta="Elige una categoría.">
            <span hidden data-contexto><span class="ctx">Pagas $85.000</span></span>
            <label class="chip-cat"><input type="radio" name="categoria" value="Arriendo" required ${inicio ? 'checked' : ''} /><span class="chip-cat__label">Arriendo</span></label>
            <label class="chip-cat"><input type="radio" name="categoria" value="Streaming" required /><span class="chip-cat__label">Streaming</span></label>
            <label class="chip-cat"><input type="radio" name="categoria" value="__nueva__" required /><span class="chip-cat__label">Crear categoría</span></label>
          </div>
          <div id="emp" data-pregunta="¿Cuál plataforma?" data-pregunta-id="empresa" data-paso="Qué es" data-resumen="" data-saltar="Sin empresa" hidden>
            <div hidden data-contexto><button type="button" data-preguntas-volver>Cambiar</button></div>
            <label class="chip-cat"><input type="radio" name="marcaId" value="netflix" /><span class="chip-cat__label">Netflix</span></label>
          </div>
          <div id="nueva" data-pregunta="Crea tu categoría" data-pregunta-id="nueva" data-paso="Qué es" data-resumen="" data-seguir="Usar esta categoría" hidden>
            <input id="nn" name="categoriaNuevaNombre" type="text" required />
          </div>
          <div data-pregunta="¿Cuándo lo pagas?" data-pregunta-id="cuando" data-paso="Cuándo" data-resumen-orden="3" data-falta="Toca el día de pago.">
            <div data-resumen-parte="Cada cuánto"><span hidden data-resumen-valor>Cada mes</span>
              <label class="chip-fecha"><input type="radio" name="frecuenciaOpcion" value="Mensual" checked />Mensual</label>
              <label class="chip-fecha"><input type="radio" name="frecuenciaOpcion" value="Quincenal" />Quincenal</label>
              <label class="chip-fecha" data-no-avanza><input type="radio" name="frecuenciaOpcion" value="otra" />Otra</label>
              <label for="frec">Frecuencia</label>
              <select id="frec" name="frecuencia" required><option value="Mensual" selected>Mensual</option><option value="Bimestral">Bimestral</option></select>
            </div>
            <div data-control="dia" data-resumen-parte="Día de pago"><input id="dia" name="diaPago" type="number" value="${inicio ? '15' : ''}" required /></div>
            <div class="aviso-cal" data-resumen-aviso><p id="banner" aria-live="polite">Aparecerá cada mes en tu calendario el día 15.</p></div>
          </div>
          <div data-opcional="Nota"><input id="n" name="nota" type="text" /></div>
          <div class="modal__footer modal__footer--principal"><button type="submit" class="btn btn-primary">Guardar gasto fijo</button></div>
        </form>
      </div>
    </div></div>`;

  beforeEach(() => {
    window.matchMedia = (q) => ({ matches: q.includes('max-width'), media: q, addEventListener() {}, removeEventListener() {} });
    S.config.tecladoTelefono = false;
  });
  afterEach(() => { window.matchMedia = matchMediaReal; vi.useRealTimers(); });

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
  const pasoActual = (form) => form.querySelector('.etapa--on')?.textContent;
  const pie = (form) => form.querySelector('[data-preguntas-pie]');
  const sinBoton = (form) => pie(form).classList.contains('preguntas__pie--suave');
  const relojFalso = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  const pausa = () => vi.advanceTimersByTime(PAUSA_ELEGIR_MS);

  it('los pasos van rotulados en lugar de "1 de 4", y el contexto sube sobre la pregunta', () => {
    const form = abrir();
    expect([...form.querySelectorAll('.preguntas__cab .etapa')].map(e => e.textContent)).toEqual(['Monto', 'Qué es', 'Cuándo', 'Revisar']);
    expect(form.querySelector('.prog')).toBeNull();
    expect(form.querySelector('[data-preguntas-n]').textContent).toBe('');
    expect(pasoActual(form)).toBe('Monto');
    for (const t of ['8', '5', '000']) form.querySelector(`[data-pregunta-on] [data-tecla="${t}"]`).click();
    seguir(form);
    expect(titulo(form)).toBe('¿Qué es?');
    expect(pasoActual(form)).toBe('Qué es');
    expect(form.querySelector('.etapa--hecha').textContent).toBe('Monto');
    const ctx = form.querySelector('[data-preguntas-ctx]');
    expect(ctx.hidden).toBe(false);
    expect(ctx.textContent.trim()).toBe('Pagas $85.000');
    expect(form.querySelector('[data-preguntas-seguir]').textContent).toBe('Siguiente');
  });

  it('GF.3 (ADR 178): elegir es seguir, sin botón; la opción se ve elegida un instante antes de pasar', () => {
    const form = abrir();
    relojFalso();
    form.querySelector('#m').value = '85.000';
    seguir(form);
    expect(titulo(form)).toBe('¿Qué es?');
    expect(sinBoton(form)).toBe(true);
    const arriendo = form.querySelector('[value="Arriendo"]');
    arriendo.checked = true;
    tocar(arriendo);
    vi.advanceTimersByTime(PAUSA_ELEGIR_MS - 1);
    expect(titulo(form)).toBe('¿Qué es?');
    vi.advanceTimersByTime(1);
    expect(titulo(form)).toBe('¿Cuándo lo pagas?');
    expect(pasoActual(form)).toBe('Cuándo');
    // Cada pantalla entra con su fundido: la cabecera lleva la clase de nuevo.
    expect(form.querySelector('.preg__fila').classList.contains('preguntas__entra')).toBe(true);
    expect(form.querySelector('.preguntas__cab > .etapas').classList.contains('preguntas__entra')).toBe(false);
  });

  it('GF.3: "Crear categoría" lleva a su pantalla, que conserva su botón para escribir', () => {
    const form = abrir();
    relojFalso();
    form.querySelector('#m').value = '85.000';
    seguir(form);
    const crear = form.querySelector('[value="__nueva__"]');
    crear.checked = true;
    form.querySelector('#nueva').hidden = false; // el dominio la muestra al elegir
    tocar(crear);
    pausa();
    expect(titulo(form)).toBe('Crea tu categoría');
    expect(pasoActual(form)).toBe('Qué es');
    expect(sinBoton(form)).toBe(false);
    expect(form.querySelector('[data-preguntas-seguir]').hidden).toBe(false);
    expect(form.querySelector('[data-preguntas-seguir]').textContent).toBe('Usar esta categoría');
  });

  it('GF.3: un segundo toque durante la pausa no salta otra pantalla, y Atrás la anula', () => {
    const form = abrir();
    relojFalso();
    form.querySelector('#m').value = '85.000';
    seguir(form);
    const streaming = form.querySelector('[value="Streaming"]');
    streaming.checked = true;
    form.querySelector('#emp').hidden = false;
    tocar(streaming);
    tocar(streaming);
    pausa();
    pausa();
    expect(titulo(form)).toBe('¿Cuál plataforma?');
    const netflix = form.querySelector('[value="netflix"]');
    netflix.checked = true;
    tocar(netflix);
    document.querySelector('[data-preguntas-atras]').click();
    pausa();
    expect(titulo(form)).toBe('¿Qué es?');
  });

  it('el armazón conserva data-no-avanza y data-avanza para quien los pida', () => {
    const form = abrir(FORM()
      .replace('data-pregunta-id="que"', 'data-pregunta-id="que" data-no-avanza')
      .replace('<label class="chip-cat"><input type="radio" name="categoria" value="__nueva__"', '<label class="chip-cat" data-avanza><input type="radio" name="categoria" value="__nueva__"'));
    relojFalso();
    form.querySelector('#m').value = '85.000';
    seguir(form);
    expect(sinBoton(form)).toBe(false);
    const arriendo = form.querySelector('[value="Arriendo"]');
    arriendo.checked = true;
    tocar(arriendo);
    pausa();
    expect(titulo(form)).toBe('¿Qué es?');
    const crear = form.querySelector('[value="__nueva__"]');
    crear.checked = true;
    form.querySelector('#nueva').hidden = false;
    tocar(crear);
    pausa();
    expect(titulo(form)).toBe('Crea tu categoría');
  });

  it('"Sin empresa" deja la pregunta sin responder y sigue; "Cambiar" vuelve; tocar una empresa sigue', () => {
    const form = abrir();
    form.querySelector('#m').value = '85.000';
    seguir(form);
    form.querySelector('[value="Streaming"]').checked = true;
    form.querySelector('#emp').hidden = false;
    seguir(form);
    expect(titulo(form)).toBe('¿Cuál plataforma?');
    expect(form.querySelector('[data-preguntas-opcional]').hidden).toBe(false);
    const saltar = form.querySelector('[data-preguntas-saltar]');
    expect(saltar.hidden).toBe(false);
    expect(saltar.textContent).toBe('Sin empresa');
    // GF.3 (ADR 178 D1): el pie se queda solo con "Sin empresa".
    expect(sinBoton(form)).toBe(false);
    expect(form.querySelector('[data-preguntas-seguir]').hidden).toBe(true);
    form.querySelector('[data-preguntas-ctx] [data-preguntas-volver]').click();
    expect(titulo(form)).toBe('¿Qué es?');
    seguir(form);
    form.querySelector('[value="netflix"]').checked = true;
    saltar.click();
    expect(form.querySelector('[value="netflix"]').checked).toBe(false);
    expect(titulo(form)).toBe('¿Cuándo lo pagas?');
    expect(saltar.hidden).toBe(true);
    expect(form.querySelector('[data-preguntas-opcional]').hidden).toBe(true);
    // Tocar una empresa sigue a "¿Cuándo lo pagas?".
    relojFalso();
    document.querySelector('[data-preguntas-atras]').click();
    expect(titulo(form)).toBe('¿Cuál plataforma?');
    const netflix = form.querySelector('[value="netflix"]');
    netflix.checked = true;
    tocar(netflix);
    pausa();
    expect(titulo(form)).toBe('¿Cuándo lo pagas?');
  });

  it('GF.3: cada cuánto espera al día sin marcar error; el día sigue; con el día puesto, cada cuánto sigue', () => {
    const form = abrir();
    relojFalso();
    form.querySelector('#m').value = '85.000';
    seguir(form);
    form.querySelector('[value="Arriendo"]').checked = true;
    seguir(form);
    expect(titulo(form)).toBe('¿Cuándo lo pagas?');
    expect(sinBoton(form)).toBe(true);
    const quincenal = form.querySelector('[value="Quincenal"]');
    quincenal.checked = true;
    tocar(quincenal);
    pausa();
    expect(titulo(form)).toBe('¿Cuándo lo pagas?');
    expect(form.textContent).not.toContain('Toca el día de pago.');
    form.querySelector('[data-dia="15"]').click();
    expect(form.querySelector('[data-dia="15"]').getAttribute('aria-pressed')).toBe('true');
    expect(titulo(form)).toBe('¿Cuándo lo pagas?');
    pausa();
    expect(form.dataset.preguntaActual).toBe('resumen');
    expect(pasoActual(form)).toBe('Revisar');
    // Atrás desde el resumen: con el día puesto, cambiar cada cuánto sigue.
    document.querySelector('[data-preguntas-atras]').click();
    expect(titulo(form)).toBe('¿Cuándo lo pagas?');
    const mensual = form.querySelector('[value="Mensual"]');
    mensual.checked = true;
    tocar(mensual);
    pausa();
    expect(form.dataset.preguntaActual).toBe('resumen');
  });

  it('GF.3: "Otra" frecuencia frena; elegir en su desplegable sigue si ya hay día', () => {
    const form = abrir(FORM('resumen'));
    relojFalso();
    form.querySelector('[data-resumen-filas] .recibo__fila:nth-child(3)').click();
    expect(titulo(form)).toBe('¿Cuándo lo pagas?');
    const otra = form.querySelector('[value="otra"]');
    otra.checked = true;
    tocar(otra);
    pausa();
    expect(titulo(form)).toBe('¿Cuándo lo pagas?');
    // Elegir en el desplegable de Finko escribe el select y despacha change.
    const frec = form.querySelector('#frec');
    frec.value = 'Bimestral';
    frec.dispatchEvent(new Event('change', { bubbles: true }));
    pausa();
    expect(form.dataset.preguntaActual).toBe('resumen');
  });

  it('GF.3: un select que cambia con otra pregunta a la vista no avanza nada', () => {
    const form = abrir();
    relojFalso();
    const frec = form.querySelector('#frec');
    frec.value = 'Bimestral';
    frec.dispatchEvent(new Event('change', { bubbles: true }));
    pausa();
    expect(titulo(form)).toBe('¿Cuánto pagas?');
    expect(form.dataset.preguntaActual).toBe('monto');
  });

  it('el resumen ordena las filas, parte un bloque en dos, lleva sus íconos y repite el aviso', () => {
    const form = abrir(FORM('resumen'));
    expect(titulo(form)).toBe('Así queda tu gasto fijo');
    expect(form.querySelector('[data-preguntas-s]').hidden).toBe(false);
    const filas = [...form.querySelectorAll('[data-resumen-filas] .recibo__fila')]
      .map(f => [f.querySelector('.recibo__k').textContent, f.querySelector('.recibo__v').textContent]);
    expect(filas).toEqual([
      ['Qué es', 'Arriendo'], ['Cada cuánto', 'Cada mes'], ['Día de pago', 'El 15 de cada mes'],
    ]);
    // FAC.1 (ADR 180 D4): el bloque `data-cifra` es la cifra de la factura,
    // con el título del formulario; tocarla vuelve a su pregunta.
    expect(form.querySelector('[data-resumen-monto]').textContent).toBe('$85.000');
    expect(form.querySelector('[data-resumen-que]').textContent).toBe('Cuánto pagas');
    expect(form.querySelector('[data-resumen-cifra]').dataset.preguntasIr).toBe('monto');
    // Cada fila lleva un ícono: el propio del bloque o uno de contorno.
    expect([...form.querySelectorAll('[data-resumen-filas] .recibo__fila')].every(f => f.querySelector('.recibo__ico'))).toBe(true);
    const aviso = form.querySelector('[data-resumen-aviso-caja]');
    expect(aviso.hidden).toBe(false);
    expect(aviso.classList.contains('aviso-cal')).toBe(true);
    expect(aviso.textContent.trim()).toBe('Aparecerá cada mes en tu calendario el día 15.');
    // Copia sin id ni aria-live.
    expect(aviso.querySelector('[id], [aria-live]')).toBeNull();
    expect(form.querySelector('.preguntas__agregar-s').textContent).toBe('También puedes hacerlo después.');
  });

  it('desde el resumen, "Qué es" lleva a las preguntas de su paso antes de volver', () => {
    const form = abrir(FORM('resumen'));
    form.querySelector('[data-resumen-filas] .recibo__fila').click();
    expect(titulo(form)).toBe('¿Qué es?');
    // GF.3 (ADR 178 D1): sin "Listo" en una pantalla de elegir; Atrás vuelve.
    expect(sinBoton(form)).toBe(true);
    form.querySelector('[value="Streaming"]').checked = true;
    form.querySelector('#emp').hidden = false;
    // Con la empresa a la vista, sigue a ella y no al resumen.
    seguir(form);
    expect(titulo(form)).toBe('¿Cuál plataforma?');
    expect(form.querySelector('[data-preguntas-seguir]').hidden).toBe(true);
    expect(form.querySelector('[data-preguntas-saltar]').hidden).toBe(false);
    document.querySelector('[data-preguntas-atras]').click();
    expect(titulo(form)).toBe('¿Qué es?');
    seguir(form);
    seguir(form);
    expect(form.dataset.preguntaActual).toBe('resumen');
    // La empresa no tiene fila propia.
    expect([...form.querySelectorAll('.recibo__k')].map(k => k.textContent)).not.toContain('¿Cuál plataforma?');
  });
});

describe('simboloDeFilaFactura() - el ícono de contorno de una fila de la factura (FAC.1, ADR 180 D4)', () => {
  it('elige el ícono por lo que dice el rótulo, y un documento si no hay pista', () => {
    expect(simboloDeFilaFactura('Nota')).toBe('i-nota');
    expect(simboloDeFilaFactura('Cada cuánto')).toBe('i-recurring');
    expect(simboloDeFilaFactura('Día de pago')).toBe('i-agenda');
    expect(simboloDeFilaFactura('Cuenta donde llega')).toBe('i-cuentas');
    expect(simboloDeFilaFactura('Tasa de interés')).toBe('i-percent');
    expect(simboloDeFilaFactura('Con quién')).toBe('i-users');
    expect(simboloDeFilaFactura('Cuota')).toBe('i-saldo');
    expect(simboloDeFilaFactura('Nombre')).toBe('c-etiqueta');
    expect(simboloDeFilaFactura('Algo raro')).toBe('i-doc');
  });
});
