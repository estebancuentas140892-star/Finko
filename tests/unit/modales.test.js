/**
 * modales.test.js - Contrato de abrirModal / cerrarModal (A11Y.4).
 *
 * Foco del test: al abrir un modal, el fondo de la app (`.app-shell`) queda
 * marcado `inert` para que el lector de pantalla no navegue el contenido de
 * atrás; al cerrar, el `inert` se libera antes de restaurar el foco.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { abrirModal, cerrarModal, resetModal } from '../../modules/ui/modales.js';

// ── SETUP ───────────────────────────────────────────────────────────────────

/**
 * Monta la estructura mínima: un fondo `.app-shell` con el botón que abre el
 * modal, y un `.modal-overlay` (hermano del fondo, como en index.html) cerrado.
 */
function montarDom() {
  document.body.innerHTML = `
    <div class="app-shell" id="app">
      <button id="abridor">Abrir</button>
    </div>
    <div class="modal-overlay" id="modal-test"
         role="dialog" aria-modal="true" aria-hidden="true">
      <div class="modal">
        <header class="modal__header">
          <button class="modal__close" data-action="modal-close" aria-label="Cerrar">x</button>
        </header>
        <div class="modal__body">
          <input id="campo" type="text" />
          <textarea id="nota"></textarea>
          <input id="check" type="checkbox" />
        </div>
      </div>
    </div>`;
}

beforeEach(montarDom);

const fondo = () => document.querySelector('.app-shell');
const overlay = () => document.getElementById('modal-test');

// ── TESTS ───────────────────────────────────────────────────────────────────

describe('abrirModal', () => {
  it('abre el overlay: pone data-open y quita aria-hidden', () => {
    abrirModal(overlay());
    expect(overlay().dataset.open).toBe('');
    expect(overlay().hasAttribute('aria-hidden')).toBe(false);
  });

  it('marca el fondo .app-shell como inert', () => {
    expect(fondo().hasAttribute('inert')).toBe(false);
    abrirModal(overlay());
    expect(fondo().hasAttribute('inert')).toBe(true);
  });

  it('mueve el foco al primer elemento interactivo del modal', () => {
    document.getElementById('abridor').focus();
    abrirModal(overlay());
    expect(document.activeElement).toBe(overlay().querySelector('.modal__close'));
  });

  it('no falla si no existe .app-shell en el DOM', () => {
    fondo().remove();
    expect(() => abrirModal(overlay())).not.toThrow();
    expect(overlay().dataset.open).toBe('');
  });
});

describe('cerrarModal', () => {
  it('cierra el overlay: quita data-open y restaura aria-hidden', () => {
    abrirModal(overlay());
    cerrarModal(overlay());
    expect(overlay().dataset.open).toBeUndefined();
    expect(overlay().getAttribute('aria-hidden')).toBe('true');
  });

  it('libera el inert del fondo .app-shell', () => {
    abrirModal(overlay());
    expect(fondo().hasAttribute('inert')).toBe(true);
    cerrarModal(overlay());
    expect(fondo().hasAttribute('inert')).toBe(false);
  });

  it('restaura el foco al elemento que abrió el modal', () => {
    const abridor = document.getElementById('abridor');
    abridor.focus();
    abrirModal(overlay());
    cerrarModal(overlay());
    expect(document.activeElement).toBe(abridor);
  });
});

describe('abrir/cerrar en secuencia', () => {
  it('deja el fondo interactivo tras un ciclo completo', () => {
    abrirModal(overlay());
    cerrarModal(overlay());
    abrirModal(overlay());
    expect(fondo().hasAttribute('inert')).toBe(true);
    cerrarModal(overlay());
    expect(fondo().hasAttribute('inert')).toBe(false);
  });
});

describe('resetModal', () => {
  it('limpia inputs, textarea y checkbox del modal', () => {
    const campo = document.getElementById('campo');
    const nota = document.getElementById('nota');
    const check = document.getElementById('check');
    campo.value = 'hola';
    nota.value = 'texto';
    check.checked = true;

    resetModal(overlay());

    expect(campo.value).toBe('');
    expect(nota.value).toBe('');
    expect(check.checked).toBe(false);
  });
});
