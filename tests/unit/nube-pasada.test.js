/**
 * nube-pasada.test.js - PERF.11: la pasada de sincronización solo recorre el
 * estado entero (marcarCambios) cuando hubo un guardado local desde la última
 * vez. La pasada de cada minuto viene a bajar lo nuevo de la nube; anotar era
 * el 80 % de su costo. Sin red: `fetch` se simula como en nube.test.js.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../modules/infra/nube-sync.js', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, marcarCambios: vi.fn(real.marcarCambios) };
});

const { marcarCambios } = await import('../../modules/infra/nube-sync.js');
const { guardarSesion, olvidarLibro } = await import('../../modules/infra/nube.js');
const { EventBus } = await import('../../modules/core/state.js');
const { initNube } = await import('../../modules/dominio/config/nube.js');

const resp = (status, cuerpo) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => cuerpo,
  text: async () => (cuerpo == null ? '' : JSON.stringify(cuerpo)),
});

const fetchMock = vi.fn(async () => resp(200, []));

/** Deja correr la pasada en curso (fetch simulado, todo en microtareas). */
const asentar = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0)); };

/** Una pasada como la del minuto (misma función): la que dispara volver a tener red. */
const pasada = async () => {
  window.dispatchEvent(new Event('online'));
  await asentar();
};

// tests/setup.js vacía localStorage antes de cada test; acá la sesión y el
// libro tienen que seguir de una pasada a la otra, como en la app.
let _guardado = {};
const foto = () => {
  _guardado = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    _guardado[k] = localStorage.getItem(k);
  }
};
afterEach(foto);
beforeEach(() => { for (const [k, v] of Object.entries(_guardado)) localStorage.setItem(k, v); });

beforeAll(async () => {
  vi.stubGlobal('fetch', fetchMock);
  // initNube con sesión ya decidida hace la primera pasada al arrancar.
  guardarSesion({
    access_token: 'a.b.c', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600,
    usuario: 'u-1', email: 'sofi@correo.co',
  });
  initNube({ repintar: () => {} });
  await asentar();
  foto();
});

describe('la pasada solo anota cuando hubo un guardado (PERF.11)', () => {
  it('la primera pasada anota: no hay libro todavía', () => {
    expect(marcarCambios).toHaveBeenCalledTimes(1);
  });

  it('una pasada sin guardado de por medio no recorre el estado', async () => {
    marcarCambios.mockClear();
    fetchMock.mockClear();
    await pasada();
    // La pasada corrió (bajó de la nube), pero no anotó.
    expect(fetchMock).toHaveBeenCalled();
    expect(marcarCambios).not.toHaveBeenCalled();
  });

  it('tras un guardado, la pasada siguiente anota', async () => {
    marcarCambios.mockClear();
    EventBus.emit('state:save');
    await pasada();
    expect(marcarCambios).toHaveBeenCalledTimes(1);
    await pasada();
    expect(marcarCambios).toHaveBeenCalledTimes(1);
  });

  it('si la pasada falla, lo anotado se vuelve a anotar en la siguiente', async () => {
    marcarCambios.mockClear();
    EventBus.emit('state:save');
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await pasada();
    expect(marcarCambios).toHaveBeenCalledTimes(1);
    await pasada();
    expect(marcarCambios).toHaveBeenCalledTimes(2);
  });

  it('un guardado que falla también cuenta como cambio local', async () => {
    marcarCambios.mockClear();
    EventBus.emit('storage:error', {});
    await pasada();
    expect(marcarCambios).toHaveBeenCalledTimes(1);
  });

  it('sin libro (se reemplazó o se olvidó), anota aunque no haya guardado', async () => {
    marcarCambios.mockClear();
    olvidarLibro();
    await pasada();
    expect(marcarCambios).toHaveBeenCalledTimes(1);
  });
});
