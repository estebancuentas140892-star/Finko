/**
 * toast-pausa.test.js - el aviso con "Deshacer" espera (TEL.1c, ADR 199 D16).
 *
 * En el teléfono no hay puntero encima: el aviso se pausa mientras el dedo o
 * el foco están en él y sigue al soltar.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mostrarToast } from '../../modules/ui/toast.js';

const aviso = () => document.querySelector('.fk-toast');
const puntero = (tipo, pointerType = 'touch') => aviso().dispatchEvent(new window.PointerEvent(tipo, { bubbles: true, pointerType }));

describe('el aviso con "Deshacer" espera al dedo y al foco', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    document.body.innerHTML = '';
    mostrarToast({ titulo: 'Gasto eliminado', accion: { texto: 'Deshacer', alTocar: () => {} } });
  });
  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('sin tocarlo se cierra a los 8 s', () => {
    vi.advanceTimersByTime(8_100);
    expect(aviso().classList.contains('fade')).toBe(true);
  });

  it('con el dedo encima no se cierra; al soltar le queda lo que le faltaba', () => {
    vi.advanceTimersByTime(3_000);
    puntero('pointerdown');
    vi.advanceTimersByTime(20_000);
    expect(aviso().classList.contains('fade')).toBe(false);
    puntero('pointerup');
    vi.advanceTimersByTime(4_900);
    expect(aviso().classList.contains('fade')).toBe(false);
    vi.advanceTimersByTime(200);
    expect(aviso().classList.contains('fade')).toBe(true);
  });

  it('con el foco en "Deshacer" no se cierra; al salir el foco, sigue', () => {
    const boton = aviso().querySelector('.fk-toast__accion');
    boton.focus();
    boton.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(20_000);
    expect(aviso().classList.contains('fade')).toBe(false);
    boton.blur();
    boton.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    vi.advanceTimersByTime(8_100);
    expect(aviso().classList.contains('fade')).toBe(true);
  });
});
