/**
 * portapapeles.test.js - copiar un dato (MC.19, ADR 170 D4): con la
 * Clipboard API, con el respaldo de `execCommand` y sin ninguno de los dos.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { copiarTexto } from '../../modules/infra/portapapeles.js';

describe('copiarTexto()', () => {
  const clipboardReal = navigator.clipboard;
  const execReal = document.execCommand;
  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { value: clipboardReal, configurable: true });
    document.execCommand = execReal;
  });

  it('con la Clipboard API copia el texto tal cual', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    expect(await copiarTexto('3001234567')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('3001234567');
  });

  it('si la API falla, usa el campo oculto y no deja nada en la página', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('no')) }, configurable: true });
    let copiado = '';
    document.execCommand = vi.fn(() => { copiado = document.querySelector('textarea')?.value ?? ''; return true; });
    expect(await copiarTexto('@maria')).toBe(true);
    expect(copiado).toBe('@maria');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('sin API y sin respaldo, dice que no pudo; nada que copiar, tampoco', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    document.execCommand = vi.fn(() => false);
    expect(await copiarTexto('123')).toBe(false);
    expect(await copiarTexto('')).toBe(false);
  });
});
