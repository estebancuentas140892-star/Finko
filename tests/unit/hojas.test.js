/**
 * hojas.test.js - toda hoja se cierra de tres formas (ADR 118).
 *
 * - `arrastreCierra`: cuánto hay que bajar la hoja (o qué tan rápido) para
 *   que se cierre.
 * - El atrás del sistema: un `CloseWatcher` por hoja abierta en el teléfono,
 *   que al dispararse cierra como Escape y se suelta cuando la hoja se cierra
 *   por otro camino. happy-dom no trae `CloseWatcher`: se falsea.
 * - Escape cierra la hoja de arriba y el fondo sigue inerte si queda otra.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { arrastreCierra, cerrarComoEscape, initHojas, UMBRAL_CIERRE_PX } from '../../modules/ui/hojas.js';
import { initAcciones } from '../../modules/ui/actions.js';
import { abrirModal, cerrarModal } from '../../modules/ui/modales.js';

describe('arrastreCierra()', () => {
  it('cierra al bajar el umbral, o un cuarto de la hoja si es más baja', () => {
    expect(arrastreCierra(UMBRAL_CIERRE_PX, 1000, 800)).toBe(true);
    expect(arrastreCierra(UMBRAL_CIERRE_PX - 1, 1000, 800)).toBe(false);
    // Hoja de 300px: con 75 basta.
    expect(arrastreCierra(75, 1000, 300)).toBe(true);
    expect(arrastreCierra(74, 1000, 300)).toBe(false);
  });

  it('un arrastre corto pero rápido también cierra; uno lento no', () => {
    expect(arrastreCierra(60, 80, 800)).toBe(true);
    expect(arrastreCierra(60, 400, 800)).toBe(false);
    // Muy corto no cuenta aunque sea rápido: es un toque que tembló.
    expect(arrastreCierra(30, 10, 800)).toBe(false);
  });

  it('hacia arriba o sin moverse no cierra', () => {
    expect(arrastreCierra(0, 100, 800)).toBe(false);
    expect(arrastreCierra(-200, 100, 800)).toBe(false);
  });
});

describe('el atrás del sistema y Escape (ADR 118)', () => {
  const matchMediaReal = window.matchMedia;
  /** Vigías creados, para dispararlos como lo haría el atrás de Android. */
  let vigias = [];
  class VigiaFalso {
    constructor() { this.destruido = false; this.onclose = null; vigias.push(this); }
    destroy() { this.destruido = true; }
    disparar() { if (!this.destruido) this.onclose?.(); }
  }

  beforeAll(() => {
    initAcciones();
    initHojas();
  });

  beforeEach(() => {
    vigias = [];
    window.CloseWatcher = VigiaFalso;
    window.matchMedia = () => ({ matches: true, addEventListener() {} }); // teléfono
    document.body.innerHTML = `
      <div class="app-shell"><button id="abridor">Abrir</button></div>
      <div class="modal-overlay" id="hoja-a" aria-hidden="true">
        <div class="modal"><button class="modal__close" data-action="modal-close">x</button></div>
      </div>
      <div class="modal-overlay" id="hoja-b" aria-hidden="true">
        <div class="modal"><button class="modal__close" data-action="modal-close">x</button></div>
      </div>
      <div class="modal-overlay" id="gate" data-bloqueante aria-hidden="true">
        <div class="modal"><button>Aceptar</button></div>
      </div>`;
  });

  afterEach(() => {
    for (const o of document.querySelectorAll('.modal-overlay[data-open]')) cerrarModal(o);
    delete window.CloseWatcher;
    window.matchMedia = matchMediaReal;
  });

  const hoja = (id) => document.getElementById(id);
  const tick = () => Promise.resolve();

  it('abrir una hoja en el teléfono crea su vigía; el atrás la cierra y el foco vuelve', async () => {
    document.getElementById('abridor').focus();
    abrirModal(hoja('hoja-a'));
    expect(vigias).toHaveLength(1);
    vigias[0].disparar();
    expect('open' in hoja('hoja-a').dataset).toBe(false);
    expect(document.activeElement.id).toBe('abridor');
    await tick();
    expect(vigias[0].destruido).toBe(true);
  });

  it('cerrada por la ✕, su vigía se suelta: el atrás siguiente ya no la toca', async () => {
    abrirModal(hoja('hoja-a'));
    cerrarModal(hoja('hoja-a'));
    await tick();
    expect(vigias[0].destruido).toBe(true);
  });

  it('con una hoja sobre otra, el atrás cierra la de arriba y deja la de abajo', async () => {
    abrirModal(hoja('hoja-a'));
    abrirModal(hoja('hoja-b'));
    expect(vigias).toHaveLength(2);
    vigias[1].disparar();
    expect('open' in hoja('hoja-b').dataset).toBe(false);
    expect('open' in hoja('hoja-a').dataset).toBe(true);
    await tick();
    expect(vigias[0].destruido).toBe(false);
  });

  it('Escape cierra la de arriba, y el fondo sigue inerte mientras quede otra', async () => {
    abrirModal(hoja('hoja-a'));
    abrirModal(hoja('hoja-b'));
    await new Promise((ok) => requestAnimationFrame(() => setTimeout(ok, 0)));
    cerrarComoEscape(hoja('hoja-b').querySelector('.modal'));
    expect('open' in hoja('hoja-b').dataset).toBe(false);
    expect('open' in hoja('hoja-a').dataset).toBe(true);
    expect(document.querySelector('.app-shell').hasAttribute('inert')).toBe(true);
  });

  it('una hoja bloqueante no tiene vigía: el atrás no la salta', () => {
    abrirModal(hoja('gate'));
    expect(vigias).toHaveLength(0);
  });

  it('en escritorio no hay vigías', () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {} });
    abrirModal(hoja('hoja-a'));
    expect(vigias).toHaveLength(0);
  });

  it('sin la API (iOS) no pasa nada', () => {
    delete window.CloseWatcher;
    expect(() => abrirModal(hoja('hoja-a'))).not.toThrow();
  });
});
