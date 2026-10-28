import { describe, it, expect, vi } from 'vitest';
import {
  ACTUALIZACION,
  versionInstalada,
  buscarActualizacion,
  repararArchivos,
} from '../../modules/infra/actualizacion.js';

// ── DOBLES ───────────────────────────────────────────────────────
//
// `navigator` y `caches` entran por parámetro (mismo criterio que
// persistencia.test.js): el ciclo de un SW no existe en happy-dom y pisar los
// globales contaminaría las otras suites.

/** CacheStorage con los nombres dados. */
const cachesCon = (nombres) => {
  const vivos = new Set(nombres);
  return {
    keys:   vi.fn(async () => [...vivos]),
    delete: vi.fn(async (n) => vivos.delete(n)),
    vivos,
  };
};

/**
 * ServiceWorker en instalación que recorre los estados dados al llamar a
 * `avanzar()`. Emite `statechange` como el real.
 */
const workerQueVa = (...estados) => {
  const oyentes = [];
  const w = {
    state: 'installing',
    addEventListener: (_tipo, fn) => oyentes.push(fn),
    avanzar() {
      for (const e of estados) {
        w.state = e;
        oyentes.forEach((fn) => fn());
      }
    },
  };
  return w;
};

/** navigator con un registro de SW. `update` hace lo que se le diga. */
const navCon = ({ reg, onLine = true, registros } = {}) => ({
  onLine,
  serviceWorker: {
    getRegistration:  vi.fn(async () => reg),
    getRegistrations: vi.fn(async () => registros ?? (reg ? [reg] : [])),
  },
});

const registro = ({ update = async () => {}, installing = null, waiting = null } = {}) => ({
  update:     vi.fn(update),
  unregister: vi.fn(async () => true),
  installing,
  waiting,
});

describe('versionInstalada()', () => {
  it('lee el número del cache del SW', async () => {
    await expect(versionInstalada(cachesCon(['finko-v616']))).resolves.toBe(616);
  });

  it('con dos caches a la vez (traspaso de activate) gana el mayor', async () => {
    await expect(versionInstalada(cachesCon(['finko-v616', 'finko-v617']))).resolves.toBe(617);
  });

  it('ignora caches que no son de una versión de Finko', async () => {
    await expect(versionInstalada(cachesCon(['otra-app', 'finko-vX', 'finko-v12']))).resolves.toBe(12);
  });

  it('null sin caches (desarrollo o primera carga) y sin la API', async () => {
    await expect(versionInstalada(cachesCon([]))).resolves.toBeNull();
    await expect(versionInstalada({})).resolves.toBeNull();
  });

  it('null si keys() lanza, sin propagar el error', async () => {
    await expect(versionInstalada({ keys: async () => { throw new Error('SecurityError'); } })).resolves.toBeNull();
  });
});

describe('buscarActualizacion()', () => {
  it('no-soportado sin SW registrado (desarrollo) o sin la API', async () => {
    await expect(buscarActualizacion({ nav: navCon({ reg: undefined }) })).resolves.toBe(ACTUALIZACION.NO_SOPORTADO);
    await expect(buscarActualizacion({ nav: {} })).resolves.toBe(ACTUALIZACION.NO_SOPORTADO);
  });

  it('sin-red si el navegador ya sabe que está desconectado, sin llamar a update()', async () => {
    const reg = registro();
    await expect(buscarActualizacion({ nav: navCon({ reg, onLine: false }) })).resolves.toBe(ACTUALIZACION.SIN_RED);
    expect(reg.update).not.toHaveBeenCalled();
  });

  it('sin-red si update() lanza (no pudo bajar service-worker.js)', async () => {
    const reg = registro({ update: async () => { throw new TypeError('Failed to fetch'); } });
    await expect(buscarActualizacion({ nav: navCon({ reg }) })).resolves.toBe(ACTUALIZACION.SIN_RED);
  });

  it('al-dia si update() no encontró un SW distinto', async () => {
    const reg = registro();
    const alDescargar = vi.fn();
    await expect(buscarActualizacion({ nav: navCon({ reg }), alDescargar })).resolves.toBe(ACTUALIZACION.AL_DIA);
    expect(reg.update).toHaveBeenCalledOnce();
    expect(alDescargar).not.toHaveBeenCalled();
  });

  it('nueva cuando el SW nuevo termina activo, y avisa que empezó a descargar', async () => {
    const worker = workerQueVa('installed', 'activating', 'activated');
    const reg = registro();
    reg.update = vi.fn(async () => { reg.installing = worker; });
    const alDescargar = vi.fn();

    const promesa = buscarActualizacion({ nav: navCon({ reg }), alDescargar });
    await vi.waitFor(() => expect(alDescargar).toHaveBeenCalledOnce());
    worker.avanzar();

    await expect(promesa).resolves.toBe(ACTUALIZACION.NUEVA);
  });

  it('fallo cuando la instalación termina descartada (un archivo del precache no llegó)', async () => {
    const worker = workerQueVa('redundant');
    const reg = registro();
    reg.update = vi.fn(async () => { reg.installing = worker; });

    const promesa = buscarActualizacion({ nav: navCon({ reg }) });
    await vi.waitFor(() => expect(reg.update).toHaveBeenCalled());
    worker.avanzar();

    await expect(promesa).resolves.toBe(ACTUALIZACION.FALLO);
  });

  it('nueva de inmediato si el SW en espera ya estaba activo al revisar', async () => {
    const reg = registro({ waiting: { state: 'activated', addEventListener: () => {} } });
    await expect(buscarActualizacion({ nav: navCon({ reg }) })).resolves.toBe(ACTUALIZACION.NUEVA);
  });
});

describe('repararArchivos()', () => {
  it('con red: quita el SW y borra solo los caches de Finko', async () => {
    const reg = registro();
    const cs  = cachesCon(['finko-v616', 'finko-v617', 'otra-app']);

    await expect(repararArchivos({ nav: navCon({ reg }), cs })).resolves.toBe(true);

    expect(reg.unregister).toHaveBeenCalledOnce();
    expect([...cs.vivos]).toEqual(['otra-app']);
  });

  it('nunca toca localStorage: ahí viven los datos del usuario', async () => {
    localStorage.setItem('fk_v1', '{"datos":true}');
    await repararArchivos({ nav: navCon({ reg: registro() }), cs: cachesCon(['finko-v617']) });
    expect(localStorage.getItem('fk_v1')).toBe('{"datos":true}');
  });

  it('sin red no borra nada: sin SW ni cache la próxima carga no tendría de dónde sacar la app', async () => {
    const reg = registro({ update: async () => { throw new TypeError('Failed to fetch'); } });
    const cs  = cachesCon(['finko-v617']);

    await expect(repararArchivos({ nav: navCon({ reg }), cs })).resolves.toBe(false);

    expect(reg.unregister).not.toHaveBeenCalled();
    expect(cs.delete).not.toHaveBeenCalled();
  });

  it('sin SW registrado usa navigator.onLine como prueba de red', async () => {
    const cs = cachesCon(['finko-v617']);
    await expect(repararArchivos({ nav: navCon({ reg: undefined, onLine: false }), cs })).resolves.toBe(false);
    expect(cs.delete).not.toHaveBeenCalled();

    await expect(repararArchivos({ nav: navCon({ reg: undefined, onLine: true }), cs })).resolves.toBe(true);
    expect(cs.vivos.size).toBe(0);
  });

  it('si borrar falla a medio camino igual queda listo para recargar', async () => {
    const reg = registro();
    const cs  = { keys: async () => { throw new Error('boom'); } };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(repararArchivos({ nav: navCon({ reg }), cs })).resolves.toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
