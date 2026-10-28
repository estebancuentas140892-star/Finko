/**
 * sw-aviso.test.js - el aviso "Hay una versión nueva de Finko" (UPD.3).
 *
 * `sw-register.js` no se puede importar (es un <script> clásico y el ciclo del
 * SW no corre en localhost); acá se prueba el otro lado del puente: lo que
 * hace el aviso con las dos señales que ese archivo deja.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initSwAviso,
  versionNuevaLista,
  mostrarAvisoActualizacion,
} from '../../modules/ui/sw-aviso.js';

const aviso = () => document.querySelector('.sw-aviso');

beforeEach(() => {
  document.body.innerHTML = '';
  delete document.documentElement.dataset.swActualizacion;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('mostrarAvisoActualizacion()', () => {
  it('ofrece actualizar y dice que los datos se conservan', () => {
    mostrarAvisoActualizacion();
    expect(aviso().textContent).toContain('Hay una versión nueva de Finko');
    expect(aviso().textContent).toContain('Tus datos se conservan');
    expect(aviso().querySelector('[data-role="aplicar"]').textContent).toBe('Actualizar');
    expect(aviso().getAttribute('role')).toBe('status');
  });

  it('no se duplica si ya está a la vista', () => {
    mostrarAvisoActualizacion();
    mostrarAvisoActualizacion();
    expect(document.querySelectorAll('.sw-aviso')).toHaveLength(1);
  });

  it('"Ahora no" lo cierra sin recargar', () => {
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
    mostrarAvisoActualizacion();
    aviso().querySelector('[data-role="despues"]').click();
    expect(aviso()).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  it('"Actualizar" recarga la página', () => {
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
    mostrarAvisoActualizacion();
    aviso().querySelector('[data-role="aplicar"]').click();
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe('versionNuevaLista()', () => {
  it('lee la marca que deja sw-register.js en <html>', () => {
    expect(versionNuevaLista()).toBe(false);
    document.documentElement.dataset.swActualizacion = 'lista';
    expect(versionNuevaLista()).toBe(true);
  });
});

describe('initSwAviso()', () => {
  // initSwAviso() agrega listeners a `document` que sobreviven entre tests;
  // por eso cada caso se arma de cero y verifica solo lo suyo.

  it('muestra el aviso al llegar el evento del SW', () => {
    initSwAviso();
    expect(aviso()).toBeNull();
    document.dispatchEvent(new CustomEvent('sw:actualizacion-lista'));
    expect(aviso()).not.toBeNull();
  });

  it('lo muestra al arrancar si el SW nuevo tomó el control antes de que escuchara', () => {
    document.documentElement.dataset.swActualizacion = 'lista';
    initSwAviso();
    expect(aviso()).not.toBeNull();
  });

  it('tras "Ahora no" vuelve a salir cuando la persona regresa a la app', () => {
    document.documentElement.dataset.swActualizacion = 'lista';
    initSwAviso();
    aviso().querySelector('[data-role="despues"]').click();
    expect(aviso()).toBeNull();

    document.dispatchEvent(new Event('visibilitychange'));
    expect(aviso()).not.toBeNull();
  });
});
