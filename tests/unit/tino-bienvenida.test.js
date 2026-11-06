/**
 * tino-bienvenida.test.js - Tino en la bienvenida del adulto y en las
 * novedades tras actualizar (ADR 130).
 *
 * Cubre:
 * - htmlPasoNombre(): Tino saluda en el lugar del isotipo (D1).
 * - mostrarNovedadesSiHay(): Tino explica arriba del título (D2) y la
 *   primera entrada del catálogo, la identidad v3 (D3).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import { NOVEDADES_POR_VERSION, ultimaVersionNovedadesConocida } from '../../modules/core/constants.js';
import { htmlPasoNombre } from '../../modules/ui/onboarding.js';
import { mostrarNovedadesSiHay } from '../../modules/ui/novedades.js';

const div = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };

describe('el paso del nombre del adulto (ADR 130 D1)', () => {
  it('Tino saluda sobre su sol, en el lugar del isotipo', () => {
    const d = div(htmlPasoNombre());
    const tino = d.querySelector('.tino-sol.onboarding__tino');
    expect(tino?.dataset.pose).toBe('saluda');
    expect(tino.getAttribute('aria-hidden')).toBe('true');
    expect(tino.querySelector('img').getAttribute('src')).toBe('assets/tino/tino-saluda.svg');
    expect(d.querySelector('.onboarding__hero')).toBeNull();
  });

  it('el formulario del nombre sigue igual', () => {
    const d = div(htmlPasoNombre());
    expect(d.querySelector('#form-onboarding input[name="nombre"]')).not.toBeNull();
    expect(d.querySelector('.onboarding__title').textContent).toBe('¡Bienvenido a Finko!');
  });
});

describe('las novedades tras actualizar (ADR 130 D2 y D3)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    document.body.innerHTML = '';
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('la primera entrada del catálogo anuncia la identidad v3', () => {
    expect(Object.keys(NOVEDADES_POR_VERSION)).toEqual(['672']);
    expect(NOVEDADES_POR_VERSION[672].titulo).toBe('Finko estrena imagen');
    expect(NOVEDADES_POR_VERSION[672].items.some((i) => i.includes('Tino'))).toBe(true);
  });

  it('quien venía de antes la ve una vez, con Tino explicando arriba del título', () => {
    S.config.ultimaVersionVista = 0;
    mostrarNovedadesSiHay();
    const modal = document.querySelector('.modal--novedades');
    expect(modal).not.toBeNull();
    const tino = modal.querySelector('.modal__header .tino-sol.novedades__tino');
    expect(tino?.dataset.pose).toBe('explica');
    // Tino va antes del título: el lector de pantalla salta la imagen decorativa.
    expect(tino.nextElementSibling.id).toBe('novedades-title');
    expect(modal.textContent).toContain('Finko estrena imagen');
  });

  it('al cerrarla queda al día y no vuelve a salir', () => {
    S.config.ultimaVersionVista = 0;
    mostrarNovedadesSiHay();
    document.querySelector('.modal--novedades [data-role="cerrar"]').click();
    expect(document.querySelector('.modal--novedades')).toBeNull();
    expect(S.config.ultimaVersionVista).toBe(ultimaVersionNovedadesConocida());
    mostrarNovedadesSiHay();
    expect(document.querySelector('.modal--novedades')).toBeNull();
  });

  it('un usuario nuevo arranca al día: no la ve', () => {
    expect(S.config.ultimaVersionVista).toBe(672);
    mostrarNovedadesSiHay();
    expect(document.querySelector('.modal--novedades')).toBeNull();
  });
});
