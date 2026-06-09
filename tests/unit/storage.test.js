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

    // El cascade de migraciones lleva al SCHEMA_VERSION actual.
    expect(S._version).toBe(SCHEMA_VERSION);
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

describe('Migración v8 → v9 (perfil fiscal)', () => {
  it('agrega config.perfilFiscal con todos los flags en false cuando es v8', () => {
    const v8 = {
      ...createInitialState(),
      _version: 8,
      config: { notificaciones: false },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v8));

    loadData();

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.config.perfilFiscal).toEqual({
      ivaResponsable:       false,
      obligadoContabilidad: false,
      declaranteObligado:   false,
    });
  });

  it('preserva config.notificaciones existente al migrar de v8', () => {
    const v8 = {
      ...createInitialState(),
      _version: 8,
      config: { notificaciones: true },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v8));

    loadData();

    expect(S.config.notificaciones).toBe(true);
    expect(S.config.perfilFiscal).toBeDefined();
  });

  it('si config falta en v8, lo crea con perfilFiscal por defecto', () => {
    const v8 = { ...createInitialState(), _version: 8 };
    delete v8.config;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v8));

    loadData();

    expect(S.config.perfilFiscal).toEqual({
      ivaResponsable:       false,
      obligadoContabilidad: false,
      declaranteObligado:   false,
    });
  });

  it('v9 con perfilFiscal existente no se sobreescribe (idempotente)', () => {
    const v9 = {
      ...createInitialState(),
      _version: 9,
      config: {
        notificaciones: false,
        perfilFiscal: { ivaResponsable: true, obligadoContabilidad: false, declaranteObligado: true },
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v9));

    loadData();

    expect(S.config.perfilFiscal.ivaResponsable).toBe(true);
    expect(S.config.perfilFiscal.declaranteObligado).toBe(true);
    expect(S.config.perfilFiscal.obligadoContabilidad).toBe(false);
  });
});

describe('Migración v9 → v10 (datos fiscales)', () => {
  it('agrega config.datosFiscales como objeto vacío cuando es v9', () => {
    const v9 = {
      ...createInitialState(),
      _version: 9,
      config: {
        notificaciones: false,
        perfilFiscal: { ivaResponsable: false, obligadoContabilidad: false, declaranteObligado: false },
      },
    };
    delete v9.config.datosFiscales;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v9));

    loadData();

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.config.datosFiscales).toEqual({});
  });

  it('preserva perfilFiscal y notificaciones al migrar de v9', () => {
    const v9 = {
      ...createInitialState(),
      _version: 9,
      config: {
        notificaciones: true,
        perfilFiscal: { ivaResponsable: true, obligadoContabilidad: false, declaranteObligado: true },
      },
    };
    delete v9.config.datosFiscales;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v9));

    loadData();

    expect(S.config.notificaciones).toBe(true);
    expect(S.config.perfilFiscal.ivaResponsable).toBe(true);
    expect(S.config.perfilFiscal.declaranteObligado).toBe(true);
    expect(S.config.datosFiscales).toEqual({});
  });

  it('si config falta en v9, lo crea con datosFiscales vacío', () => {
    const v9 = { ...createInitialState(), _version: 9 };
    delete v9.config;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v9));

    loadData();

    expect(S.config.datosFiscales).toEqual({});
  });

  it('v10 con datosFiscales existente no se sobreescribe (idempotente)', () => {
    const v10 = {
      ...createInitialState(),
      _version: 10,
      config: {
        notificaciones: false,
        perfilFiscal: { ivaResponsable: false, obligadoContabilidad: false, declaranteObligado: false },
        datosFiscales: { 2026: { ingresosBrutos: 50_000_000, consumosTC: 10_000_000 } },
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v10));

    loadData();

    expect(S.config.datosFiscales['2026']).toEqual({ ingresosBrutos: 50_000_000, consumosTC: 10_000_000 });
  });

  it('normaliza datosFiscales corrupto (array) a objeto vacío', () => {
    const v9 = {
      ...createInitialState(),
      _version: 9,
      config: { notificaciones: false, datosFiscales: [1, 2, 3] },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v9));

    loadData();

    expect(S.config.datosFiscales).toEqual({});
  });
});

describe('Migración v10 → v11 (quitar tipo de cuenta Inversión)', () => {
  it('reasigna cuentas con tipo "Inversión" a "Otro"', () => {
    const v10 = {
      ...createInitialState(),
      _version: 10,
      cuentas: [
        { id: 'c1', nombre: 'CDT', banco: 'Bancolombia', tipo: 'Inversión', saldo: 5_000_000 },
        { id: 'c2', nombre: 'Ahorros', banco: 'Davivienda', tipo: 'Ahorros', saldo: 1_000_000 },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v10));

    loadData();

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.cuentas.find(c => c.id === 'c1').tipo).toBe('Otro');
  });

  it('no toca cuentas con otros tipos', () => {
    const v10 = {
      ...createInitialState(),
      _version: 10,
      cuentas: [
        { id: 'c2', nombre: 'Ahorros', banco: 'Davivienda', tipo: 'Ahorros', saldo: 1_000_000 },
        { id: 'c3', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 200_000 },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v10));

    loadData();

    expect(S.cuentas.find(c => c.id === 'c2').tipo).toBe('Ahorros');
    expect(S.cuentas.find(c => c.id === 'c3').tipo).toBe('Efectivo');
  });

  it('preserva el resto de campos de la cuenta migrada', () => {
    const v10 = {
      ...createInitialState(),
      _version: 10,
      cuentas: [
        { id: 'c1', nombre: 'CDT', banco: 'Bancolombia', tipo: 'Inversión', saldo: 5_000_000, aplica4x1000: true },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v10));

    loadData();

    const c = S.cuentas.find(c => c.id === 'c1');
    expect(c.nombre).toBe('CDT');
    expect(c.saldo).toBe(5_000_000);
    expect(c.aplica4x1000).toBe(true);
  });

  it('sin cuentas, la migración no falla (no-op)', () => {
    const v10 = { ...createInitialState(), _version: 10, cuentas: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v10));

    loadData();

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.cuentas).toEqual([]);
  });

  it('idempotente: ya en v11 con tipos válidos no cambia nada', () => {
    const v11 = {
      ...createInitialState(),
      _version: 11,
      cuentas: [
        { id: 'c1', nombre: 'Ahorros', banco: 'Davivienda', tipo: 'Ahorros', saldo: 1_000_000 },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v11));

    loadData();

    expect(S.cuentas.find(c => c.id === 'c1').tipo).toBe('Ahorros');
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
