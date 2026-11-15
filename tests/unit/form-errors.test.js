import { describe, it, expect, beforeEach } from 'vitest';
import { mostrarErroresForm, limpiarErroresForm } from '../../modules/infra/form-errors.js';

describe('mostrarErroresForm() - encabezado del bloque', () => {
  let form;

  beforeEach(() => {
    document.body.innerHTML = '<form id="f"><input name="nombre" /></form>';
    form = document.getElementById('f');
  });

  const titulo = () => form.querySelector('.form-errors__title')?.textContent.trim();

  it('un error sin campo al que atarse va arriba, en la lista (ADR 142 D9)', () => {
    mostrarErroresForm(form, ['Elige dos cuentas distintas.']);
    expect(titulo()).toBe('Antes de guardar:');
    expect(form.querySelector('.form-errors__list').textContent).toContain('Elige dos cuentas distintas.');
    expect(form.querySelector('.form-errors__ir')).toBeNull();
  });

  it('con dos o más sin campo, la lista los trae todos', () => {
    mostrarErroresForm(form, ['Uno.', 'Dos.']);
    expect(titulo()).toBe('Antes de guardar:');
    expect(form.querySelectorAll('.form-errors__list li')).toHaveLength(2);
  });

  it('acepta un título propio para errores que no son "falta algo" (CFG.5a)', () => {
    mostrarErroresForm(form, ['El PIN actual no coincide.'], 'Revisa lo que escribiste:');
    expect(titulo()).toBe('Revisa lo que escribiste:');
    expect(form.querySelector('.form-errors').textContent).toContain('El PIN actual no coincide.');
  });

  it('escapa el título recibido en vez de inyectarlo como HTML', () => {
    mostrarErroresForm(form, ['Error.'], '<img src=x onerror=alert(1)>');
    expect(form.querySelector('.form-errors__title img')).toBeNull();
  });

  it('limpiarErroresForm() deja el formulario sin bloque de errores', () => {
    mostrarErroresForm(form, ['Error.'], 'Revisa lo que escribiste:');
    limpiarErroresForm(form);
    expect(form.querySelector('.form-errors')).toBeNull();
  });
});

describe('mostrarErroresForm() - el error va debajo de su campo (ADR 123 D2)', () => {
  let form;

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="f">
        <div class="form-group"><label for="d">Descripción</label><input id="d" name="descripcion" aria-describedby="d-hint" /><p id="d-hint">Pista</p></div>
        <div class="form-group"><label for="m">Monto</label><input id="m" name="monto" /></div>
      </form>`;
    form = document.getElementById('f');
  });

  it('escribe cada error bajo su campo, con ícono y texto visible', () => {
    mostrarErroresForm(form, ['La descripción es obligatoria.', 'El monto debe ser mayor a 0.']);
    const errores = [...form.querySelectorAll('.form-error')];
    expect(errores).toHaveLength(2);
    expect(errores[0].closest('.form-group').querySelector('input').name).toBe('descripcion');
    expect(errores[1].closest('.form-group').querySelector('input').name).toBe('monto');
    expect(errores[0].querySelector('svg use').getAttribute('href')).toBe('#i-alert');
    expect(errores[0].textContent).toBe('La descripción es obligatoria.');
    expect(form.textContent).not.toContain('⚠');
  });

  it('marca cada campo con aria-invalid y lo ata a su error sin perder su pista', () => {
    mostrarErroresForm(form, ['La descripción es obligatoria.', 'El monto debe ser mayor a 0.']);
    const d = form.querySelector('[name="descripcion"]');
    const m = form.querySelector('[name="monto"]');
    expect(d.getAttribute('aria-invalid')).toBe('true');
    expect(m.getAttribute('aria-invalid')).toBe('true');
    expect(d.getAttribute('aria-describedby')).toBe('d-hint f-error-0');
    expect(m.getAttribute('aria-describedby')).toBe('f-error-1');
    expect(d.classList.contains('field-invalid')).toBe(true);
  });

  it('con dos errores o más, el aviso de arriba los cuenta, no repite la lista y lleva al primero', () => {
    mostrarErroresForm(form, ['La descripción es obligatoria.', 'El monto debe ser mayor a 0.']);
    expect(form.querySelector('.form-errors__title').textContent).toBe('Revisa 2 datos para guardar.');
    expect(form.querySelector('.form-errors__list')).toBeNull();
    form.querySelector('.form-errors__ir').click();
    expect(document.activeElement.name).toBe('descripcion');
  });

  it('con un solo error de campo no hay aviso arriba: basta el de su campo (ADR 142 D9)', () => {
    mostrarErroresForm(form, ['El monto debe ser mayor a 0.']);
    expect(form.querySelector('.form-errors')).toBeNull();
    expect(form.querySelectorAll('.form-error')).toHaveLength(1);
  });

  it('un error sin campo sigue en la lista de arriba', () => {
    mostrarErroresForm(form, ['El monto debe ser mayor a 0.', 'Elige una cuenta con saldo.']);
    expect([...form.querySelectorAll('.form-errors__list li')].map(li => li.textContent)).toEqual(['Elige una cuenta con saldo.']);
    expect(form.querySelectorAll('.form-error')).toHaveLength(1);
  });

  it('corregir un campo limpia solo ese campo; el otro sigue marcado (ADR 142 D9)', () => {
    mostrarErroresForm(form, ['La descripción es obligatoria.', 'El monto debe ser mayor a 0.']);
    form.querySelector('[name="monto"]').dispatchEvent(new Event('input', { bubbles: true }));
    // Queda uno: el aviso de arriba ya no hace falta.
    expect(form.querySelector('.form-errors')).toBeNull();
    expect(form.querySelector('[name="monto"]').hasAttribute('aria-invalid')).toBe(false);
    expect(form.querySelector('[name="monto"]').hasAttribute('aria-describedby')).toBe(false);
    expect(form.querySelector('[name="descripcion"]').getAttribute('aria-invalid')).toBe('true');
    expect(form.querySelectorAll('.form-error')).toHaveLength(1);
    form.querySelector('[name="descripcion"]').dispatchEvent(new Event('input', { bubbles: true }));
    expect(form.querySelectorAll('.form-error, .field-invalid, [aria-invalid]')).toHaveLength(0);
    expect(form.querySelector('[name="descripcion"]').getAttribute('aria-describedby')).toBe('d-hint');
  });

  it('escribir en un campo sin error no toca el aviso de arriba', () => {
    form.insertAdjacentHTML('beforeend', '<div class="form-group"><input name="nota" /></div>');
    mostrarErroresForm(form, ['La descripción es obligatoria.', 'El monto debe ser mayor a 0.']);
    const aviso = form.querySelector('.form-errors');
    form.querySelector('[name="nota"]').dispatchEvent(new Event('input', { bubbles: true }));
    expect(form.querySelector('.form-errors')).toBe(aviso);
    expect(form.querySelectorAll('.form-error')).toHaveLength(2);
  });

  it('después de intentar guardar, salir de un campo lo vuelve a validar, y solo a él', () => {
    const monto = form.querySelector('[name="monto"]');
    const revalidar = () => {
      const e = ['La descripción es obligatoria.'];
      if (!(Number(monto.value) > 0)) e.push('Escribe cuánto fue. Por ejemplo: 45.000');
      return e;
    };
    mostrarErroresForm(form, revalidar(), undefined, revalidar);
    monto.value = 'abc';
    monto.dispatchEvent(new Event('input', { bubbles: true }));
    expect(form.querySelector('[data-campo="monto"]')).toBeNull();
    monto.dispatchEvent(new Event('focusout', { bubbles: true }));
    expect(form.querySelector('[data-campo="monto"]').textContent).toBe('Escribe cuánto fue. Por ejemplo: 45.000');
    monto.value = '45000';
    monto.dispatchEvent(new Event('focusout', { bubbles: true }));
    expect(form.querySelector('[data-campo="monto"]')).toBeNull();
    expect(form.querySelector('[data-campo="descripcion"]')).not.toBeNull();
  });

  it('mostrar dos veces no duplica los errores', () => {
    mostrarErroresForm(form, ['El monto debe ser mayor a 0.']);
    mostrarErroresForm(form, ['El monto debe ser mayor a 0.']);
    expect(form.querySelectorAll('.form-error')).toHaveLength(1);
    expect(form.querySelector('[name="monto"]').getAttribute('aria-describedby')).toBe('f-error-0');
  });
});

describe('mostrarErroresForm() - cada formulario llama distinto a su campo (ADR 123 D2)', () => {
  it('"monto objetivo" encuentra montoObjetivo y "fecha pactada" encuentra fechaLimite', () => {
    document.body.innerHTML = `
      <form id="m">
        <div class="form-group"><input name="nombre" /></div>
        <div class="form-group"><input name="montoObjetivo" /></div>
        <div class="form-group"><input name="fechaLimite" type="date" /></div>
      </form>`;
    const form = document.getElementById('m');
    mostrarErroresForm(form, ['El monto objetivo debe ser un número mayor a 0.', 'La fecha pactada no es válida.']);
    expect(form.querySelector('[name="montoObjetivo"]').getAttribute('aria-invalid')).toBe('true');
    expect(form.querySelector('[name="fechaLimite"]').getAttribute('aria-invalid')).toBe('true');
    expect(form.querySelector('[name="nombre"]').hasAttribute('aria-invalid')).toBe(false);
  });

  it('un campo oculto dentro de su grupo pone el error en el grupo sin marcarse', () => {
    document.body.innerHTML = `
      <form id="c">
        <div class="form-group"><button type="button">Seleccionar…</button><input type="hidden" name="banco" value="" /></div>
      </form>`;
    const form = document.getElementById('c');
    mostrarErroresForm(form, ['Debes elegir un banco o billetera.']);
    expect(form.querySelector('.form-group .form-error').textContent).toBe('Debes elegir un banco o billetera.');
    expect(form.querySelector('[name="banco"]').hasAttribute('aria-invalid')).toBe(false);
  });

  it('con un campo marcado y otro error suelto, el título no cuenta lo que la lista no muestra', () => {
    document.body.innerHTML = '<form id="x"><div class="form-group"><input name="monto" /></div></form>';
    const form = document.getElementById('x');
    mostrarErroresForm(form, ['El monto debe ser un número mayor a 0.', 'El origen y el destino deben ser cuentas distintas.']);
    expect(form.querySelector('.form-errors__title').textContent).toBe('Antes de guardar:');
    expect(form.querySelector('.form-errors__ir')).not.toBeNull();
    expect([...form.querySelectorAll('.form-errors__list li')].map(li => li.textContent)).toEqual(['El origen y el destino deben ser cuentas distintas.']);
  });
});
