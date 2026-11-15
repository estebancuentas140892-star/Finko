/**
 * modales.test.js - Contrato de abrirModal / cerrarModal (A11Y.4).
 *
 * Foco del test: al abrir un modal, el fondo de la app (`.app-shell`) queda
 * marcado `inert` para que el lector de pantalla no navegue el contenido de
 * atrás; al cerrar, el `inert` se libera antes de restaurar el foco.
 *
 * Desde PERF.11 el `inert` llega un cuadro después de abrir (recalcular el
 * estilo de todo el fondo retrasaba el primer cuadro de la hoja): los tests
 * esperan ese cuadro con `cuadro()` antes de afirmar sobre él.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { abrirModal, cerrarModal, resetModal, registrarAlAbrir, despertarOverlaysEnIdle } from '../../modules/ui/modales.js';
import { despertarOverlay } from '../../modules/infra/a11y.js';

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

/** Deja pasar el cuadro tras el que abrirModal marca el fondo inerte. */
const cuadro = () => new Promise((ok) => requestAnimationFrame(() => setTimeout(ok, 0)));

// ── TESTS ───────────────────────────────────────────────────────────────────

describe('abrirModal', () => {
  it('abre el overlay: pone data-open y quita aria-hidden', () => {
    abrirModal(overlay());
    expect(overlay().dataset.open).toBe('');
    expect(overlay().hasAttribute('aria-hidden')).toBe(false);
  });

  it('marca el fondo .app-shell como inert un cuadro después', async () => {
    expect(fondo().hasAttribute('inert')).toBe(false);
    abrirModal(overlay());
    // En el mismo tick no: el recálculo de estilo esperaría al primer cuadro.
    expect(fondo().hasAttribute('inert')).toBe(false);
    await cuadro();
    expect(fondo().hasAttribute('inert')).toBe(true);
  });

  it('no deja el fondo inerte si el modal se cerró antes de ese cuadro', async () => {
    abrirModal(overlay());
    cerrarModal(overlay());
    await cuadro();
    expect(fondo().hasAttribute('inert')).toBe(false);
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

  it('libera el inert del fondo .app-shell', async () => {
    abrirModal(overlay());
    await cuadro();
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
  it('deja el fondo interactivo tras un ciclo completo', async () => {
    abrirModal(overlay());
    cerrarModal(overlay());
    abrirModal(overlay());
    await cuadro();
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

describe('abrirModal() - el foco no cae en el ícono de la teja (ADR 123)', () => {
  it('el <use href> de un SVG no cuenta como enfocable: el foco va a la ✕', () => {
    document.body.innerHTML = `
      <div class="app-shell"><button id="abridor">Abrir</button></div>
      <div class="modal-overlay" id="modal-teja" role="dialog" aria-modal="true" aria-hidden="true">
        <div class="modal">
          <header class="modal__header">
            <span class="modal__teja" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#i-metas"/></svg></span>
            <h2 class="modal__title">Nueva meta</h2>
            <button class="modal__close" data-action="modal-close" aria-label="Cerrar">x</button>
          </header>
          <div class="modal__body"><input id="campo" type="text" /></div>
        </div>
      </div>`;
    abrirModal(document.getElementById('modal-teja'));
    expect(document.activeElement?.classList.contains('modal__close')).toBe(true);
  });
});

// PERF.16: un overlay cerrado y sin abrir nunca no se maqueta por dentro
// (`content-visibility: hidden` en modals.css); se despierta antes de abrirlo.
describe('despertarOverlay() (PERF.16)', () => {
  const overlayNuevo = () => {
    document.body.innerHTML = '<div class="app-shell"></div><div class="modal-overlay" id="m"><div class="modal"><button>ok</button></div></div>';
    return document.getElementById('m');
  };

  it('marca el overlay como vivo y lo deja así al cerrar', () => {
    const overlay = overlayNuevo();
    expect('vivo' in overlay.dataset).toBe(false);
    abrirModal(overlay);
    expect('vivo' in overlay.dataset).toBe(true);
    cerrarModal(overlay);
    expect('vivo' in overlay.dataset).toBe(true);
  });

  it('despierta antes de preparar la hoja y de poner data-open, para que la entrada anime', () => {
    const overlay = overlayNuevo();
    const visto = [];
    registrarAlAbrir((o) => { if (o === overlay) visto.push({ vivo: 'vivo' in o.dataset, open: 'open' in o.dataset }); });
    abrirModal(overlay);
    expect(visto).toEqual([{ vivo: true, open: false }]);
  });

  it('por sí solo no abre: solo marca', () => {
    const overlay = overlayNuevo();
    despertarOverlay(overlay);
    expect('open' in overlay.dataset).toBe(false);
    expect('vivo' in overlay.dataset).toBe(true);
  });

  it('es idempotente y tolera un overlay sin panel o nulo', () => {
    const overlay = overlayNuevo();
    despertarOverlay(overlay);
    expect(() => despertarOverlay(overlay)).not.toThrow();
    overlay.innerHTML = '';
    delete overlay.dataset.vivo;
    expect(() => despertarOverlay(overlay)).not.toThrow();
    expect(() => despertarOverlay(null)).not.toThrow();
  });
});

describe('despertarOverlaysEnIdle() (PERF.16)', () => {
  it('despierta solo las hojas más usadas, de a una por turno de idle', () => {
    document.body.innerHTML = ['modal-registrar', 'modal-mas', 'modal-gasto', 'modal-apartado']
      .map((id) => `<div class="modal-overlay" id="${id}"><div class="modal"></div></div>`).join('');
    const raf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (fn) => fn();
    try {
      const turnos = [];
      despertarOverlaysEnIdle((fn) => turnos.push(fn));
      const vivos = () => [...document.querySelectorAll('[data-vivo]')].map((o) => o.id);
      expect(vivos()).toEqual([]);
      turnos.shift()();
      expect(vivos()).toEqual(['modal-registrar']);
      while (turnos.length) turnos.shift()();
      expect(vivos()).toEqual(['modal-registrar', 'modal-mas', 'modal-gasto']);
    } finally {
      globalThis.requestAnimationFrame = raf;
    }
  });
});
