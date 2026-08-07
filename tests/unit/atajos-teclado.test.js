import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S } from '../../modules/core/state.js';
import { initAcciones, registrarAccion } from '../../modules/ui/actions.js';

describe('atajos de teclado de escritorio (INT.1h)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="modal-overlay" id="modal-atajos" aria-hidden="true"></div>
    `;
    S.config = { atajosTeclado: true };
    initAcciones();
  });

  function disparar(key, target = document.body) {
    const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    Object.defineProperty(e, 'target', { value: target, enumerable: true });
    document.dispatchEvent(e);
  }

  it('N dispara la accion registrar-abrir-hoja', () => {
    const abrir = vi.fn();
    registrarAccion('registrar-abrir-hoja', abrir);
    disparar('n');
    expect(abrir).toHaveBeenCalledOnce();
  });

  it('? abre el modal de atajos', () => {
    disparar('?');
    const overlay = document.getElementById('modal-atajos');
    expect(overlay.hasAttribute('data-open')).toBe(true);
  });

  it('G solo no navega: arma el prefijo y espera la letra', () => {
    const navegar = vi.fn();
    registrarAccion('registrar-abrir-hoja', navegar);
    disparar('g');
    disparar('x');
    expect(navegar).not.toHaveBeenCalled();
  });

  it('con S.config.atajosTeclado en false, N no dispara nada', () => {
    S.config.atajosTeclado = false;
    const abrir = vi.fn();
    registrarAccion('registrar-abrir-hoja', abrir);
    disparar('n');
    expect(abrir).not.toHaveBeenCalled();
  });

  it('con S.config.atajosTeclado en false, ? no abre el modal', () => {
    S.config.atajosTeclado = false;
    disparar('?');
    const overlay = document.getElementById('modal-atajos');
    expect(overlay.hasAttribute('data-open')).toBe(false);
  });

  it('escribiendo en un input, N no dispara la accion (no choca con escritura)', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const abrir = vi.fn();
    registrarAccion('registrar-abrir-hoja', abrir);
    disparar('n', input);
    expect(abrir).not.toHaveBeenCalled();
  });

  it('con un modal abierto, N no dispara la accion (foco atrapado)', () => {
    const otro = document.createElement('div');
    otro.className = 'modal-overlay';
    otro.setAttribute('data-open', '');
    document.body.appendChild(otro);
    const abrir = vi.fn();
    registrarAccion('registrar-abrir-hoja', abrir);
    disparar('n');
    expect(abrir).not.toHaveBeenCalled();
  });

  it('Escape sigue cerrando el modal abierto sin data-bloqueante', () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('data-open', '');
    document.body.appendChild(overlay);
    disparar('Escape');
    expect(overlay.hasAttribute('data-open')).toBe(false);
  });
});
