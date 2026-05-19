import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import {
  loadData,
  save,
  _flushNow,
  STORAGE_KEY,
  SCHEMA_VERSION,
} from '../../modules/core/storage.js';

beforeEach(() => {
  // setup.js global ya hace localStorage.clear(); reaseguramos S limpio.
  Object.assign(S, createInitialState());
});

describe('loadData() - localStorage vacío', () => {
  it('deja S en estado inicial válido', () => {
    loadData();
    expect(S).toEqual(createInitialState());
  });

  it('no lanza si localStorage está vacío', () => {
    expect(() => loadData()).not.toThrow();
  });
});

describe('save()', () => {
  it('escribe en localStorage bajo la key fk_v1', () => {
    save();
    _flushNow();

    expect(STORAGE_KEY).toBe('fk_v1');
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('escribe JSON parseable', () => {
    save();
    _flushNow();

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('persiste mutaciones de S', () => {
    S.onboarded = true;
    S.gastos.push({
      id: 'g1',
      descripcion: 'Café',
      monto: 5000,
      categoria: 'Alimentación',
      fecha: '2026-05-12',
    });

    save();
    _flushNow();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.onboarded).toBe(true);
    expect(stored.gastos).toHaveLength(1);
    expect(stored.gastos[0].descripcion).toBe('Café');
  });
});

describe('round-trip save() + loadData()', () => {
  it('restaura los datos persistidos', () => {
    S.perfil.nombre = 'Esteban';
    S.cuentas.push({
      id: 'c1',
      nombre: 'Bolsillo principal',
      banco: 'Nequi',
      tipo: 'Ahorros',
      saldo: 1_000_000,
      activa: true,
      fechaCreacion: '2026-05-12T00:00:00Z',
    });
    save();
    _flushNow();

    // Simular nueva sesión: corromper S en memoria.
    Object.assign(S, createInitialState());
    expect(S.perfil.nombre).toBe('');
    expect(S.cuentas).toHaveLength(0);

    loadData();

    expect(S.perfil.nombre).toBe('Esteban');
    expect(S.cuentas).toHaveLength(1);
    expect(S.cuentas[0].banco).toBe('Nequi');
  });

  it('preserva _version tras save() + loadData()', () => {
    save();
    _flushNow();
    Object.assign(S, createInitialState(), { _version: 999 });

    loadData();

    expect(S._version).toBe(SCHEMA_VERSION);
  });
});

describe('loadData() - corrupción', () => {
  it('resetea a estado inicial si el JSON está corrupto', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, '{esto no es json válido');

    expect(() => loadData()).not.toThrow();
    expect(S).toEqual(createInitialState());
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('resetea a estado inicial si el payload es un array', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));

    loadData();

    expect(S).toEqual(createInitialState());
    warnSpy.mockRestore();
  });
});

describe('Migración idempotente', () => {
  it('llamar loadData() dos veces seguidas produce el mismo S', () => {
    S.perfil.nombre = 'Ana';
    save();
    _flushNow();

    loadData();
    const snapshot1 = JSON.stringify(S);

    loadData();
    const snapshot2 = JSON.stringify(S);

    expect(snapshot2).toBe(snapshot1);
  });

  it('un payload sin _version recibe el valor actual del schema', () => {
    const sinVersion = createInitialState();
    delete sinVersion._version;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sinVersion));

    loadData();

    expect(S._version).toBe(SCHEMA_VERSION);
  });
});

describe('save() - debounce', () => {
  it('no escribe inmediatamente: requiere esperar al timer o forzar _flushNow', () => {
    vi.useFakeTimers();

    save();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    vi.advanceTimersByTime(200);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    vi.useRealTimers();
  });

  it('llamadas sucesivas colapsan en una sola escritura', () => {
    vi.useFakeTimers();
    // happy-dom 15+ implementa setItem como propiedad propia del objeto, no del prototype.
    const setSpy = vi.spyOn(localStorage, 'setItem');

    save();
    save();
    save();

    vi.advanceTimersByTime(200);

    // Una sola escritura para la key fk_v1 (filtramos por si otros setters corren).
    const writes = setSpy.mock.calls.filter(([key]) => key === STORAGE_KEY);
    expect(writes).toHaveLength(1);

    setSpy.mockRestore();
    vi.useRealTimers();
  });
});
