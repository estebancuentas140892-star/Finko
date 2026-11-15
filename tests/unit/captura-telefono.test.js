/**
 * captura-telefono.test.js - mover dinero en dos etapas y los controles de
 * Finko en el teléfono (FORM.2c, ADR 142 D2 y D4).
 *
 * - `fechaEnPalabras`: "Hoy", "Ayer" o el día con su nombre.
 * - `prepararHojaTelefono`: un formulario `data-etapas-monto` va en Monto ·
 *   Revisar con el teclado de Finko y sus atajos; un `<select>` y un
 *   `type="date"` pasan a ser el desplegable y la fecha de Finko, con los
 *   campos reales intactos para `FormData`. En escritorio no toca nada.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fechaEnPalabras, prepararHojaTelefono, OPCIONES_CON_BUSCADOR } from '../../modules/ui/captura-telefono.js';
import { S } from '../../modules/core/state.js';

describe('fechaEnPalabras()', () => {
  it('hoy, ayer y cualquier otro día', () => {
    expect(fechaEnPalabras('2026-11-14', '2026-11-14')).toBe('Hoy');
    expect(fechaEnPalabras('2026-11-13', '2026-11-14')).toBe('Ayer');
    expect(fechaEnPalabras('2026-10-31', '2026-11-01')).toBe('Ayer');
    expect(fechaEnPalabras('2026-11-03', '2026-11-14')).toBe('Martes 3 de noviembre');
    expect(fechaEnPalabras('2025-12-24', '2026-11-14')).toBe('Miércoles 24 de diciembre de 2025');
  });

  it('lo que no es una fecha: vacío', () => {
    expect(fechaEnPalabras('', '2026-11-14')).toBe('');
    expect(fechaEnPalabras('ayer', '2026-11-14')).toBe('');
  });
});

describe('prepararHojaTelefono()', () => {
  const matchMediaReal = window.matchMedia;
  let movil = true;

  const hoja = (form) => {
    document.body.innerHTML = `
      <div class="modal-overlay" id="hoja"><div class="modal">
        <header class="modal__header"><h2 class="modal__title">Abonar</h2></header>
        <div class="modal__body">${form}</div>
      </div></div>`;
    return document.getElementById('hoja');
  };

  const ABONO = `
    <form id="f" novalidate data-etapas-monto="¿Cuánto abonas?" data-atajos='[{"t":"La cuota","v":350000}]'>
      <input type="hidden" name="compromisoId" value="d1" />
      <div class="form-group">
        <label for="m" class="label">Monto del abono</label>
        <input id="m" name="monto" class="input" type="text" inputmode="numeric" data-miles />
        <p class="form-hint">Máximo $2.000.000.</p>
      </div>
      <div class="form-group">
        <label for="fe" class="label">Fecha del abono</label>
        <input id="fe" name="fecha" class="input" type="date" value="2026-11-14" required />
      </div>
      <div class="form-group">
        <label for="cat" class="label">Categoría <span class="form-optional">Opcional</span></label>
        <select id="cat" name="categoria" class="input">
          <option value="">Seleccionar…</option>
          <option value="Venta">Venta</option>
          <option value="Regalo">Regalo</option>
        </select>
      </div>
      <div class="modal__footer modal__footer--principal"><button type="submit" class="btn btn-primary">Registrar abono</button></div>
    </form>`;

  beforeEach(() => {
    movil = true;
    window.matchMedia = (q) => ({ matches: movil && q.includes('max-width'), media: q, addEventListener() {}, removeEventListener() {} });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 14, 10, 0, 0));
    S.config.tecladoTelefono = false;
  });
  afterEach(() => {
    window.matchMedia = matchMediaReal;
    vi.useRealTimers();
  });

  it('en escritorio no toca nada', () => {
    movil = false;
    const overlay = hoja(ABONO);
    prepararHojaTelefono(overlay);
    expect(overlay.querySelector('[data-etapa]')).toBeNull();
    expect(overlay.querySelector('#fe').type).toBe('date');
    expect(overlay.querySelector('#cat').hidden).toBe(false);
  });

  it('dos etapas: el monto con el teclado de Finko y lo demás en "Revisar"', () => {
    const overlay = hoja(ABONO);
    prepararHojaTelefono(overlay);
    const form = overlay.querySelector('form');
    expect(form.dataset.etapaActual).toBe('monto');
    expect([...form.querySelectorAll('.etapa')].map(e => e.textContent)).toEqual(['Monto', 'Revisar']);
    expect(form.querySelector('.pmonto__q').textContent).toBe('¿Cuánto abonas?');
    const campo = form.querySelector('[name="monto"]');
    expect(campo.closest('[data-etapa="monto"]')).not.toBeNull();
    expect(campo.inputMode).toBe('none');
    expect(form.querySelector('[data-etapa="revisar"]').hidden).toBe(true);
    // Lo oculto sigue en el formulario, fuera de las etapas.
    expect([...form.children].some(el => el.name === 'compromisoId')).toBe(true);
    // La ayuda del campo sigue a la vista en "Revisar".
    expect(form.querySelector('[data-etapa="revisar"] .form-hint').textContent).toContain('Máximo');
  });

  it('sin monto no se sigue; con el teclado y "Continuar", el recibo lo muestra', () => {
    const overlay = hoja(ABONO);
    prepararHojaTelefono(overlay);
    const form = overlay.querySelector('form');
    form.querySelector('[data-etapa-seguir]').click();
    expect(form.dataset.etapaActual).toBe('monto');
    expect(form.querySelector('.pmonto').classList.contains('pmonto--error')).toBe(true);
    for (const t of ['2', '0', '000']) form.querySelector(`[data-tecla="${t}"]`).click();
    form.querySelector('[data-etapa-seguir]').click();
    expect(form.dataset.etapaActual).toBe('revisar');
    expect(form.querySelector('[data-recibo-monto]').textContent).toBe('$20.000');
    expect(overlay.querySelector('[data-etapa-atras]').hidden).toBe(false);
    form.querySelector('[data-etapa-ir]').click();
    expect(form.dataset.etapaActual).toBe('monto');
  });

  it('un atajo escribe su monto y lleva a revisar', () => {
    const overlay = hoja(ABONO);
    prepararHojaTelefono(overlay);
    const form = overlay.querySelector('form');
    form.querySelector('[data-atajo-monto]').click();
    expect(form.querySelector('[name="monto"]').value).toBe('350.000');
    expect(form.dataset.etapaActual).toBe('revisar');
  });

  it('al volver a abrir, vuelve al monto sin duplicar las etapas', () => {
    const overlay = hoja(ABONO);
    prepararHojaTelefono(overlay);
    const form = overlay.querySelector('form');
    form.querySelector('[data-atajo-monto]').click();
    prepararHojaTelefono(overlay);
    expect(form.dataset.etapaActual).toBe('monto');
    expect(form.querySelectorAll('[data-etapa="monto"]')).toHaveLength(1);
    expect(form.querySelectorAll('.campo-finko')).toHaveLength(2);
  });

  it('la fecha de Finko: campo oculto con su valor, "Ayer" lo escribe y avisa', () => {
    const overlay = hoja(ABONO);
    prepararHojaTelefono(overlay);
    const form = overlay.querySelector('form');
    const fecha = form.querySelector('[name="fecha"]');
    expect(fecha.type).toBe('hidden');
    const boton = form.querySelector('#fe-finko');
    expect(form.querySelector('label[for="fe-finko"]')).not.toBeNull();
    expect(boton.textContent).toContain('Hoy');
    const cambios = vi.fn();
    fecha.addEventListener('change', cambios);
    boton.click();
    form.querySelector('[data-fecha-atajo="ayer"]').click();
    expect(fecha.value).toBe('2026-11-13');
    expect(cambios).toHaveBeenCalled();
    expect(boton.textContent).toContain('Ayer');
    expect(form.querySelector('#fe-mini').hidden).toBe(true);
    expect(new FormData(form).get('fecha')).toBe('2026-11-13');
  });

  it('el calendario elige un día', () => {
    const overlay = hoja(ABONO);
    prepararHojaTelefono(overlay);
    const form = overlay.querySelector('form');
    form.querySelector('#fe-finko').click();
    form.querySelector('[data-calf-dia="2026-11-03"]').click();
    expect(form.querySelector('[name="fecha"]').value).toBe('2026-11-03');
    expect(form.querySelector('#fe-finko').textContent).toContain('Martes 3 de noviembre');
  });

  it('el desplegable de Finko escribe el <select> de siempre', () => {
    const overlay = hoja(ABONO);
    prepararHojaTelefono(overlay);
    const form = overlay.querySelector('form');
    const select = form.querySelector('#cat');
    expect(select.hidden).toBe(true);
    const boton = form.querySelector('#cat-finko');
    expect(boton.textContent).toContain('Elegir');
    boton.click();
    const filas = [...form.querySelectorAll('#cat-mini [data-valor]')];
    expect(filas.map(f => f.textContent.trim())).toEqual(['Sin elegir', 'Venta', 'Regalo']);
    expect(form.querySelector('#cat-mini .mini-hoja__t').textContent).toBe('Categoría');
    const cambio = vi.fn();
    select.addEventListener('change', cambio);
    filas[2].click();
    expect(select.value).toBe('Regalo');
    expect(cambio).toHaveBeenCalledTimes(1);
    expect(boton.textContent).toContain('Regalo');
    expect(new FormData(form).get('categoria')).toBe('Regalo');
  });

  it(`con ${OPCIONES_CON_BUSCADOR} opciones o más, el desplegable trae buscador`, () => {
    const muchas = Array.from({ length: OPCIONES_CON_BUSCADOR }, (_, i) => `<option value="b${i}">Banco ${i}</option>`).join('');
    const overlay = hoja(`<form data-captura><label for="b">Banco</label><select id="b" name="banco" required>${muchas}<option value="nq">Nequi</option></select></form>`);
    prepararHojaTelefono(overlay);
    const form = overlay.querySelector('form');
    form.querySelector('#b-finko').click();
    const buscar = form.querySelector('[data-desplegable-buscar]');
    expect(buscar).not.toBeNull();
    buscar.value = 'nequ';
    buscar.dispatchEvent(new Event('input', { bubbles: true }));
    expect([...form.querySelectorAll('#b-mini [data-valor]')].map(f => f.dataset.valor)).toEqual(['nq']);
  });

  it('un valor puesto por el dominio antes de abrir se ve en el control', () => {
    const overlay = hoja(ABONO);
    prepararHojaTelefono(overlay);
    const form = overlay.querySelector('form');
    form.querySelector('#cat').value = 'Venta';
    form.querySelector('[name="fecha"]').value = '2026-11-10';
    prepararHojaTelefono(overlay);
    expect(form.querySelector('#cat-finko').textContent).toContain('Venta');
    expect(form.querySelector('#fe-finko').textContent).toContain('Martes 10 de noviembre');
  });
});
