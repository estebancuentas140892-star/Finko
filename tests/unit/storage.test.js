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

  it('v5 → v6: tipo=deuda se migra a deuda-entidad con saldoTotal+cuotaMensual+tasa+tasaUnidad', () => {
    const v5 = {
      ...createInitialState(),
      _version: 5,
      compromisos: [{
        id: 'd1', descripcion: 'Tarjeta visa', tipo: 'deuda',
        monto: 300_000, frecuencia: 'Mensual', diaPago: 5, activo: true,
        fechaCreacion: '2025-12-01T00:00:00.000Z',
        saldoPendiente: 5_000_000, tasaEA: 0.28,
      }],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v5));

    loadData();

    expect(S._version).toBe(6);
    expect(S.compromisos[0].tipo).toBe('deuda-entidad');
    expect(S.compromisos[0].saldoTotal).toBe(5_000_000);
    expect(S.compromisos[0].cuotaMensual).toBe(300_000);
    expect(S.compromisos[0].tasa).toBe(0.28);
    expect(S.compromisos[0].tasaUnidad).toBe('EA');
    expect(S.compromisos[0].monto).toBeUndefined();
    expect(S.compromisos[0].saldoPendiente).toBeUndefined();
    expect(S.compromisos[0].tasaEA).toBeUndefined();
  });

  it('v5 → v6: deuda sin saldoPendiente estima saldoTotal como monto*12', () => {
    const v5 = {
      ...createInitialState(),
      _version: 5,
      compromisos: [{
        id: 'd2', descripcion: 'Crédito viejo', tipo: 'deuda',
        monto: 200_000, frecuencia: 'Mensual', diaPago: 10, activo: true,
        fechaCreacion: '2025-12-01T00:00:00.000Z',
      }],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v5));
    loadData();

    expect(S.compromisos[0].saldoTotal).toBe(2_400_000);
    expect(S.compromisos[0].cuotaMensual).toBe(200_000);
    expect(S.compromisos[0].tasa).toBe(0);
    expect(S.compromisos[0].tasaUnidad).toBe('EA');
  });

  it('v5 → v6: tipo=agenda se convierte a fijo con frecuencia=Única vez', () => {
    const v5 = {
      ...createInitialState(),
      _version: 5,
      compromisos: [{
        id: 'a1', descripcion: 'Cumple papá', tipo: 'agenda',
        monto: 50_000, frecuencia: 'Mensual', diaPago: 20, activo: true,
        fechaCreacion: '2026-01-01T00:00:00.000Z',
      }],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v5));
    loadData();

    expect(S.compromisos[0].tipo).toBe('fijo');
    expect(S.compromisos[0].frecuencia).toBe('Única vez');
    expect(S.compromisos[0].monto).toBe(50_000);
  });

  it('v5 → v6: tipo=fijo no se toca', () => {
    const fijo = {
      id: 'f1', descripcion: 'Arriendo', tipo: 'fijo',
      monto: 1_500_000, frecuencia: 'Mensual', diaPago: 1, activo: true,
      fechaCreacion: '2025-01-01T00:00:00.000Z',
    };
    const v5 = {
      ...createInitialState(),
      _version: 5,
      compromisos: [{ ...fijo }],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v5));
    loadData();

    expect(S.compromisos[0]).toEqual(fijo);
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
