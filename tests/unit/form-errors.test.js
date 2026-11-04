import { describe, it, expect, beforeEach } from 'vitest';
import { mostrarErroresForm, limpiarErroresForm } from '../../modules/infra/form-errors.js';

describe('mostrarErroresForm() - encabezado del bloque', () => {
  let form;

  beforeEach(() => {
    document.body.innerHTML = '<form id="f"><input name="nombre" /></form>';
    form = document.getElementById('f');
  });

  const titulo = () => form.querySelector('.form-errors__title')?.textContent.trim();

  it('sin título explícito habla de campos que faltan (comportamiento previo)', () => {
    mostrarErroresForm(form, ['La descripción es obligatoria.']);
    expect(titulo()).toBe('Falta información para guardar:');
  });

  it('con dos o más errores cuenta los campos, como siempre', () => {
    mostrarErroresForm(form, ['Uno.', 'Dos.']);
    expect(titulo()).toBe('Faltan 2 campos por completar:');
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

  it('arriba solo cuenta los campos marcados y no repite la lista', () => {
    mostrarErroresForm(form, ['La descripción es obligatoria.', 'El monto debe ser mayor a 0.']);
    expect(form.querySelector('.form-errors__title').textContent).toBe('Revisa los 2 campos marcados.');
    expect(form.querySelector('.form-errors__list')).toBeNull();
    mostrarErroresForm(form, ['El monto debe ser mayor a 0.']);
    expect(form.querySelector('.form-errors__title').textContent).toBe('Revisa el campo marcado.');
  });

  it('un error sin campo sigue en la lista de arriba', () => {
    mostrarErroresForm(form, ['El monto debe ser mayor a 0.', 'Elige una cuenta con saldo.']);
    expect([...form.querySelectorAll('.form-errors__list li')].map(li => li.textContent)).toEqual(['Elige una cuenta con saldo.']);
    expect(form.querySelectorAll('.form-error')).toHaveLength(1);
  });

  it('volver a escribir limpia los errores, las marcas y deja la pista del campo', () => {
    mostrarErroresForm(form, ['La descripción es obligatoria.', 'El monto debe ser mayor a 0.']);
    form.querySelector('[name="monto"]').dispatchEvent(new Event('input', { bubbles: true }));
    expect(form.querySelector('.form-errors')).toBeNull();
    expect(form.querySelectorAll('.form-error, .field-invalid, [aria-invalid]')).toHaveLength(0);
    expect(form.querySelector('[name="descripcion"]').getAttribute('aria-describedby')).toBe('d-hint');
    expect(form.querySelector('[name="monto"]').hasAttribute('aria-describedby')).toBe(false);
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
    expect(form.querySelector('.form-errors__title').textContent).toBe('Falta información para guardar:');
    expect([...form.querySelectorAll('.form-errors__list li')].map(li => li.textContent)).toEqual(['El origen y el destino deben ser cuentas distintas.']);
  });
});
