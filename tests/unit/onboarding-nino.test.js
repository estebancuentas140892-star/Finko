/**
 * onboarding-nino.test.js - el camino del niño en la primera visita (APR.6a,
 * ADR 100 D2 a D4).
 *
 * Cubre:
 * - validarPasoNino(): nombre y edad (7 a 12) y el dibujo, con la voz del niño.
 * - perfilNinoSolo(): el perfil que queda, con "Tu familia" donde no hay tutor.
 * - htmlNinoNombre(), htmlNinoDibujo(), htmlNinoAntes(): las tres pantallas;
 *   los nombres se escapan.
 */

import { describe, it, expect } from 'vitest';
import {
  validarPasoNino,
  perfilNinoSolo,
  htmlNinoNombre,
  htmlNinoDibujo,
  htmlNinoAntes,
  TE_NOMBRA_SIN_TUTOR,
} from '../../modules/ui/onboarding-nino.js';
import { DIBUJOS } from '../../modules/infra/ilustraciones.js';

const div = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };

describe('validarPasoNino()', () => {
  it('pide nombre y edad con la voz del niño', () => {
    expect(validarPasoNino({ nombre: '', edad: null }, 'nombre')).toEqual(['Escribe tu nombre.', 'Elige cuántos años tienes.']);
  });

  it('solo acepta edades de 7 a 12 (ADR 093 D1)', () => {
    expect(validarPasoNino({ nombre: 'Sofía', edad: 6 }, 'nombre')).toEqual(['Elige cuántos años tienes.']);
    expect(validarPasoNino({ nombre: 'Sofía', edad: 13 }, 'nombre')).toEqual(['Elige cuántos años tienes.']);
    expect(validarPasoNino({ nombre: 'Sofía', edad: 7 }, 'nombre')).toEqual([]);
    expect(validarPasoNino({ nombre: 'Sofía', edad: 12 }, 'nombre')).toEqual([]);
  });

  it('el dibujo tiene que ser del catálogo', () => {
    expect(validarPasoNino({ dibujo: 'foto' }, 'dibujo')).toEqual(['Elige tu dibujo.']);
    expect(validarPasoNino({ dibujo: DIBUJOS[0].id }, 'dibujo')).toEqual([]);
  });
});

describe('perfilNinoSolo()', () => {
  it('crea el perfil con lo que eligió y "Tu familia" como tutor (D4)', () => {
    const p = perfilNinoSolo({ nombre: ' Sofía ', edad: 8, dibujo: DIBUJOS[1].id }, '2026-10-29', 'n-1');
    expect(p).toMatchObject({ id: 'n-1', nombre: 'Sofía', edad: 8, dibujo: DIBUJOS[1].id, creado: '2026-10-29' });
    expect(p.teNombra).toBe(TE_NOMBRA_SIN_TUTOR);
    expect(p.mesada).toBeNull();
    expect(p.movimientos).toEqual([]);
  });
});

describe('las tres pantallas', () => {
  it('nombre y edad: seis edades de 7 a 12 y la salida al camino del adulto', () => {
    const d = div(htmlNinoNombre({ nombre: '', edad: null, dibujo: '' }));
    expect([...d.querySelectorAll('input[name="edad"]')].map(i => i.value)).toEqual(['7', '8', '9', '10', '11', '12']);
    expect(d.querySelector('[data-action="onboarding-adulto"]').textContent).toBe('Tengo 13 años o más');
    expect(d.querySelector('[data-action="onboarding-volver"]')).not.toBeNull();
  });

  it('nombre y edad: recuerda lo elegido al volver', () => {
    const d = div(htmlNinoNombre({ nombre: 'Sofía', edad: 9, dibujo: '' }));
    expect(d.querySelector('#onboarding-nino-nombre').value).toBe('Sofía');
    expect(d.querySelector('input[name="edad"]:checked').value).toBe('9');
  });

  it('dibujo: todo el catálogo, sin fotos, con el nombre del niño en el título', () => {
    const d = div(htmlNinoDibujo({ nombre: 'Sofía', edad: 8, dibujo: '' }));
    expect(d.querySelectorAll('input[name="dibujo"]')).toHaveLength(DIBUJOS.length);
    expect(d.querySelector('#onboarding-nino-titulo').textContent).toBe('Elige tu dibujo, Sofía');
  });

  it('antes de empezar: el botón es el aviso y los documentos quedan para el adulto (D3)', () => {
    const d = div(htmlNinoAntes({ nombre: 'Sofía', edad: 8, dibujo: DIBUJOS[0].id }));
    expect(d.querySelector('[type="submit"]').textContent.trim()).toBe('Un adulto de mi familia sabe que uso Finko');
    expect(d.querySelector('input[type="checkbox"]')).toBeNull();
    expect([...d.querySelectorAll('[data-action="abrir-legal"]')].map(b => b.dataset.doc))
      .toEqual(['terminos-y-condiciones', 'politica-de-privacidad']);
  });

  it('los nombres se escapan', () => {
    const d = div(htmlNinoAntes({ nombre: '<b>x</b>', edad: 8, dibujo: DIBUJOS[0].id }));
    expect(d.querySelector('#onboarding-nino-titulo').textContent).toBe('Antes de empezar, <b>x</b>');
  });
});
