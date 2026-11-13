/**
 * install-prompt.test.js - lo que dice Finko al instalar (ADR 137 D3).
 *
 * En Android el navegador instala sin avisar en la página: al aceptar, Finko
 * dice que está instalando y, al terminar, que quedó instalada. Mientras el
 * navegador pregunta, el botón no responde a un segundo toque. Fuera de
 * iPhone y sin el aviso del navegador, ya no abre las instrucciones de iPhone.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// El toast tiene su propia cola con tiempos: acá importa qué se pide decir.
vi.mock('../../modules/ui/toast.js', () => ({ mostrarToast: vi.fn() }));

import { initInstallPrompt, instaladaDesdeEsteNavegador } from '../../modules/ui/install-prompt.js';
import { dispatch } from '../../modules/ui/actions.js';
import { mostrarToast } from '../../modules/ui/toast.js';

/** El aviso que el navegador dispara cuando la app se puede instalar. */
function avisoDelNavegador(outcome) {
  const e = new Event('beforeinstallprompt');
  e.prompt = vi.fn();
  e.userChoice = Promise.resolve({ outcome });
  window.dispatchEvent(e);
  return e;
}

function tocarInstalar() {
  const boton = document.createElement('button');
  boton.dataset.action = 'install-pwa';
  document.body.appendChild(boton);
  dispatch(boton, new Event('click'));
  return boton;
}

const titulosDeToast = () => mostrarToast.mock.calls.map(([o]) => o.titulo);

describe('instalar Finko (ADR 137 D3)', () => {
  beforeAll(() => { initInstallPrompt(); });
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    mostrarToast.mockClear();
  });

  it('al aceptar dice que está instalando, y Ajustes ya la da por instalada', async () => {
    const aviso = avisoDelNavegador('accepted');
    const boton = tocarInstalar();
    expect(aviso.prompt).toHaveBeenCalled();
    expect(boton.disabled).toBe(true);
    await vi.waitFor(() => expect(titulosDeToast()).toContain('Instalando Finko…'));
    expect(boton.disabled).toBe(false);
    expect(instaladaDesdeEsteNavegador()).toBe(true);
  });

  it('al terminar la instalación dice que quedó instalada', () => {
    window.dispatchEvent(new Event('appinstalled'));
    expect(titulosDeToast()).toEqual(['Finko quedó instalada']);
    expect(instaladaDesdeEsteNavegador()).toBe(true);
  });

  it('sin el aviso del navegador y fuera de iPhone, dice dónde está en el menú', () => {
    tocarInstalar();
    expect(titulosDeToast()).toEqual(['Instálala desde el menú del navegador']);
    expect(document.getElementById('modal-install-ios')).toBeNull();
  });

  it('si el navegador vuelve a ofrecer instalar, lo instalado deja de valer', () => {
    localStorage.setItem('fk_install', JSON.stringify({ estado: 'installed', ts: Date.now() }));
    expect(instaladaDesdeEsteNavegador()).toBe(true);
    avisoDelNavegador('dismissed');
    expect(instaladaDesdeEsteNavegador()).toBe(false);
  });
});
