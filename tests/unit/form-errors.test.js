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
