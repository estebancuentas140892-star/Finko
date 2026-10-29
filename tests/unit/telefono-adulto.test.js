/**
 * telefono-adulto.test.js - "Este teléfono es de un adulto" (APR.6b, ADR 100 D5).
 *
 * Cubre:
 * - ofrecerTelefonoAdulto(): solo en un teléfono propio del niño sin nube.
 * - validarDatosAdulto(): nombre y los dos PIN, con la regla de siempre.
 * - htmlDatosAdulto() y htmlLegalAdulto(): los dos pasos; la aceptación es la
 *   completa (casilla), no el aviso del niño; los nombres se escapan.
 */

import { describe, it, expect } from 'vitest';
import {
  ofrecerTelefonoAdulto,
  validarDatosAdulto,
  htmlDatosAdulto,
  htmlLegalAdulto,
} from '../../modules/ui/telefono-adulto.js';

const div = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };

describe('ofrecerTelefonoAdulto()', () => {
  it('se ofrece en un teléfono propio del niño', () => {
    expect(ofrecerTelefonoAdulto({ dispositivoNino: 'n-1' }, null)).toBe(true);
  });

  it('no se ofrece si el teléfono está unido a la nube de su familia (NUBE.3)', () => {
    expect(ofrecerTelefonoAdulto({ dispositivoNino: 'n-1' }, { token: 't', ninoId: 'n-1' })).toBe(false);
  });

  it('no se ofrece en un teléfono con adulto', () => {
    expect(ofrecerTelefonoAdulto({}, null)).toBe(false);
    expect(ofrecerTelefonoAdulto(undefined, null)).toBe(false);
  });
});

describe('validarDatosAdulto()', () => {
  it('pide el nombre y un PIN válido', () => {
    expect(validarDatosAdulto({ nombre: '', pin: '', pin2: '' })).toEqual(['Escribe tu nombre.', 'Escribe un PIN.']);
    expect(validarDatosAdulto({ nombre: 'Laura', pin: '12', pin2: '12' })).toEqual(['El PIN debe tener entre 4 y 8 numeros.']);
  });

  it('los dos PIN tienen que coincidir', () => {
    expect(validarDatosAdulto({ nombre: 'Laura', pin: '1234', pin2: '4321' })).toEqual(['Los dos PIN no coinciden.']);
    expect(validarDatosAdulto({ nombre: 'Laura', pin: '1234', pin2: '1234' })).toEqual([]);
  });
});

describe('los dos pasos', () => {
  it('paso 1: nombre y dos PIN numéricos, y dice qué pasa con el niño', () => {
    const d = div(htmlDatosAdulto('Sofía'));
    expect(d.querySelector('#telefono-adulto-pin').getAttribute('inputmode')).toBe('numeric');
    expect(d.querySelector('#telefono-adulto-pin2').type).toBe('password');
    expect(d.querySelector('.onboarding__desc').textContent).toContain('Sofía sigue con todo lo suyo');
    expect(d.querySelector('[data-action="telefono-adulto-cancelar"]')).not.toBeNull();
  });

  it('paso 2: la aceptación completa, con su casilla', () => {
    const d = div(htmlLegalAdulto('Laura'));
    expect(d.querySelector('input[name="acepto"]').type).toBe('checkbox');
    expect(d.querySelector('#telefono-adulto-titulo').textContent).toBe('Un último paso, Laura');
  });

  it('los nombres se escapan', () => {
    expect(div(htmlDatosAdulto('<b>x</b>')).querySelector('.onboarding__desc').textContent).toContain('<b>x</b>');
    expect(div(htmlLegalAdulto('<i>y</i>')).querySelector('#telefono-adulto-titulo').textContent).toBe('Un último paso, <i>y</i>');
  });
});
