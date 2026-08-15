import { describe, it, expect, vi } from 'vitest';
import {
  PERSISTENCIA,
  soportaPersistencia,
  estadoPersistencia,
  solicitarPersistencia,
} from '../../modules/infra/persistencia.js';

// ── DOBLES ───────────────────────────────────────────────────────
//
// `navigator` entra por parámetro justamente para esto: los tres navegadores
// que importan se simulan sin tocar el global (happy-dom trae su propio
// `navigator.storage`, y pisarlo contaminaría las otras suites).

/** Navegador con la API completa. `persist` devuelve lo que se le diga. */
const navCon = ({ yaPersistido = false, concede = true } = {}) => ({
  storage: {
    persisted: vi.fn(async () => yaPersistido),
    persist:   vi.fn(async () => concede),
  },
});

describe('soportaPersistencia()', () => {
  it('true con las dos funciones presentes', () => {
    expect(soportaPersistencia(navCon())).toBe(true);
  });

  it('false sin navigator.storage', () => {
    expect(soportaPersistencia({})).toBe(false);
  });

  it('false con storage pero sin persist (el caso Safari viejo: solo estimate)', () => {
    expect(soportaPersistencia({ storage: { estimate: () => {}, persisted: async () => false } })).toBe(false);
  });

  it('false con persist pero sin persisted: no se muestra un botón que no se puede verificar', () => {
    expect(soportaPersistencia({ storage: { persist: async () => true } })).toBe(false);
  });
});

describe('estadoPersistencia()', () => {
  it('concedida cuando el navegador ya marcó el origen como persistente', async () => {
    await expect(estadoPersistencia(navCon({ yaPersistido: true }))).resolves.toBe(PERSISTENCIA.CONCEDIDA);
  });

  it('no-concedida cuando el origen sigue siendo best effort', async () => {
    await expect(estadoPersistencia(navCon({ yaPersistido: false }))).resolves.toBe(PERSISTENCIA.NO_CONCEDIDA);
  });

  it('no-soportado sin la API', async () => {
    await expect(estadoPersistencia({})).resolves.toBe(PERSISTENCIA.NO_SOPORTADO);
  });

  it('no-soportado si persisted() lanza (contexto inseguro), sin propagar el error', async () => {
    const nav = {
      storage: {
        persisted: async () => { throw new Error('SecurityError'); },
        persist:   async () => true,
      },
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(estadoPersistencia(nav)).resolves.toBe(PERSISTENCIA.NO_SOPORTADO);
    warn.mockRestore();
  });

  it('no pide nada: solo consulta', async () => {
    const nav = navCon();
    await estadoPersistencia(nav);
    expect(nav.storage.persist).not.toHaveBeenCalled();
  });
});

describe('solicitarPersistencia()', () => {
  it('concedida cuando el navegador acepta', async () => {
    await expect(solicitarPersistencia(navCon({ concede: true }))).resolves.toBe(PERSISTENCIA.CONCEDIDA);
  });

  it('no-concedida cuando el navegador dice que no (Firefox: permiso rechazado)', async () => {
    await expect(solicitarPersistencia(navCon({ concede: false }))).resolves.toBe(PERSISTENCIA.NO_CONCEDIDA);
  });

  it('con la protección ya concedida no vuelve a llamar a persist()', async () => {
    const nav = navCon({ yaPersistido: true });
    await expect(solicitarPersistencia(nav)).resolves.toBe(PERSISTENCIA.CONCEDIDA);
    expect(nav.storage.persist).not.toHaveBeenCalled();
  });

  it('sin la API no intenta pedir nada y reporta no-soportado', async () => {
    await expect(solicitarPersistencia({})).resolves.toBe(PERSISTENCIA.NO_SOPORTADO);
  });

  it('no-concedida si persist() lanza, sin propagar el error', async () => {
    const nav = {
      storage: {
        persisted: async () => false,
        persist:   async () => { throw new Error('NotAllowedError'); },
      },
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(solicitarPersistencia(nav)).resolves.toBe(PERSISTENCIA.NO_CONCEDIDA);
    warn.mockRestore();
  });
});
