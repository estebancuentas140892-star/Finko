import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S, EventBus, createInitialState } from '../../modules/core/state.js';
import {
  loadData,
  save,
  _flushNow,
  STORAGE_KEY,
  SCHEMA_VERSION,
  LIMITE_LOCALSTORAGE_CHARS,
  evaluarCuota,
  estadoCuota,
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

// ── MONITOR DE CUOTA (ADR 030) ────────────────────────────────────

describe('evaluarCuota()', () => {
  const LIM = 1000;

  it('nivel ok por debajo del 80%', () => {
    expect(evaluarCuota(700, LIM).nivel).toBe('ok');
  });

  it('nivel aviso a partir del 80%', () => {
    expect(evaluarCuota(800, LIM).nivel).toBe('aviso');
    expect(evaluarCuota(940, LIM).nivel).toBe('aviso');
  });

  it('nivel critico a partir del 95%', () => {
    expect(evaluarCuota(950, LIM).nivel).toBe('critico');
    expect(evaluarCuota(5000, LIM).nivel).toBe('critico');
  });

  it('calcula el ratio usados/limite', () => {
    expect(evaluarCuota(500, LIM).ratio).toBe(0.5);
  });

  it('usa el límite por defecto cuando no se pasa uno', () => {
    const r = evaluarCuota(0);
    expect(r.limite).toBe(LIMITE_LOCALSTORAGE_CHARS);
    expect(r.nivel).toBe('ok');
  });

  it('trata valores inválidos como 0 usados / límite por defecto', () => {
    expect(evaluarCuota(-5, LIM).usados).toBe(0);
    expect(evaluarCuota(NaN, LIM).usados).toBe(0);
    expect(evaluarCuota(500, 0).limite).toBe(LIMITE_LOCALSTORAGE_CHARS);
  });
});

describe('estadoCuota()', () => {
  it('un estado inicial pequeño está en nivel ok, sin fallo', () => {
    const e = estadoCuota();
    expect(e.nivel).toBe('ok');
    expect(e.falloUltimoGuardado).toBe(false);
    expect(e.usados).toBeGreaterThan(0); // S serializado no es vacío
  });

  it('refleja el crecimiento de S en usados', () => {
    const antes = estadoCuota().usados;
    S.gastos = Array.from({ length: 500 }, (_, i) => ({
      id: `g${i}`, monto: 1000, categoria: 'Mercado', fecha: '2026-07-01',
    }));
    expect(estadoCuota().usados).toBeGreaterThan(antes);
  });
});

describe('_flush() - guardado que falla (cupo lleno, ADR 030)', () => {
  it('emite storage:error y marca falloUltimoGuardado en vez de morir en silencio', () => {
    // storage.js lee el global `localStorage` en cada llamada, así que se
    // sustituye el global entero por un stub cuyo setItem simula el cupo lleno
    // (más robusto que espiar el método interno de happy-dom).
    vi.stubGlobal('localStorage', {
      getItem:    () => null,
      setItem:    () => { throw new DOMException('quota', 'QuotaExceededError'); },
      removeItem: () => {},
      clear:      () => {},
    });

    const errores = [];
    const onError = (e) => errores.push(e);
    EventBus.on('storage:error', onError);

    try {
      save();
      _flushNow();
    } finally {
      vi.unstubAllGlobals();
    }

    expect(errores).toHaveLength(1);
    expect(errores[0].falloUltimoGuardado).toBe(true);
    expect(estadoCuota().falloUltimoGuardado).toBe(true);

    EventBus.off('storage:error', onError);

    // Tras un guardado exitoso, el fallo se limpia.
    save();
    _flushNow();
    expect(estadoCuota().falloUltimoGuardado).toBe(false);
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

    // El cascade de migraciones llega hasta v17, que agrega categoria: null
    // a los fijos sin categoria (no afecta el resto de los campos).
    expect(S.compromisos[0]).toEqual({ ...fijo, categoria: null });
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

describe('Migración v24 → v25 (situación laboral en el perfil, CFG.1)', () => {
  it('agrega perfil.situacionLaboral = "" cuando falta (v24)', () => {
    const v24 = { ...createInitialState(), _version: 24 };
    delete v24.perfil.situacionLaboral;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v24));

    loadData();

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.perfil.situacionLaboral).toBe('');
  });

  it('preserva una situación laboral ya registrada (idempotente)', () => {
    const v25 = {
      ...createInitialState(),
      _version: 25,
      perfil: { nombre: 'Ana', smmlv: 1_750_905, situacionLaboral: 'independiente' },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v25));

    loadData();

    expect(S.perfil.situacionLaboral).toBe('independiente');
    expect(S.perfil.nombre).toBe('Ana');
  });

  it('preserva nombre y SMMLV al migrar de v24', () => {
    const v24 = {
      ...createInitialState(),
      _version: 24,
      perfil: { nombre: 'Carlos', smmlv: 1_500_000 },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v24));

    loadData();

    expect(S.perfil.nombre).toBe('Carlos');
    expect(S.perfil.smmlv).toBe(1_500_000);
    expect(S.perfil.situacionLaboral).toBe('');
  });

  it('repone un perfil ausente o corrupto con el perfil por defecto', () => {
    const v24 = { ...createInitialState(), _version: 24 };
    delete v24.perfil;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v24));

    loadData();

    expect(S.perfil.nombre).toBe('');
    expect(S.perfil.situacionLaboral).toBe('');
  });
});

describe('Migración v25 → v26 (colección de transferencias, MC.17)', () => {
  it('agrega transferencias = [] cuando falta (v25)', () => {
    const v25 = { ...createInitialState(), _version: 25 };
    delete v25.transferencias;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v25));

    loadData();

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(Array.isArray(S.transferencias)).toBe(true);
    expect(S.transferencias).toHaveLength(0);
  });

  it('preserva transferencias ya existentes (idempotente)', () => {
    const previa = {
      id: 't1', cuentaOrigenId: 'c1', cuentaDestinoId: 'c2',
      monto: 100_000, fecha: '2026-07-10', fechaCreacion: '2026-07-10T09:00:00Z',
    };
    const v26 = { ...createInitialState(), _version: 26, transferencias: [previa] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v26));

    loadData();

    expect(S.transferencias).toHaveLength(1);
    expect(S.transferencias[0]).toMatchObject(previa);
  });

  it('no toca el resto del estado al migrar de v25', () => {
    const v25 = {
      ...createInitialState(),
      _version: 25,
      cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 300_000, activa: true }],
      gastos:  [{ id: 'g1', monto: 50_000, categoria: 'Mercado', fecha: '2026-07-01' }],
    };
    delete v25.transferencias;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v25));

    loadData();

    expect(S.cuentas).toHaveLength(1);
    expect(S.cuentas[0].saldo).toBe(300_000);
    expect(S.gastos).toHaveLength(1);
    expect(S.transferencias).toEqual([]);
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

describe('Migración v11 → v12 (diaPago en ingresos)', () => {
  it('ingresos existentes reciben diaPago: null', () => {
    const v11 = {
      ...createInitialState(),
      _version: 11,
      ingresos: [
        { id: 'i1', descripcion: 'Salario', monto: 3_500_000, frecuencia: 'Mensual', activo: true },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v11));

    loadData();

    expect(S.ingresos.find(i => i.id === 'i1').diaPago).toBeNull();
    expect(S._version).toBe(SCHEMA_VERSION);
  });

  it('ingresos con diaPago ya seteado no se sobreescriben (idempotente)', () => {
    const v11 = {
      ...createInitialState(),
      _version: 11,
      ingresos: [
        { id: 'i1', descripcion: 'Salario', monto: 2_000_000, frecuencia: 'Mensual', activo: true, diaPago: 30 },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v11));

    loadData();

    expect(S.ingresos.find(i => i.id === 'i1').diaPago).toBe(30);
  });

  it('sin ingresos en el snapshot → no lanza', () => {
    const v11 = { ...createInitialState(), _version: 11, ingresos: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v11));

    expect(() => loadData()).not.toThrow();
    expect(S.ingresos).toEqual([]);
  });

  it('varios ingresos: todos reciben diaPago: null si no lo tenían', () => {
    const v11 = {
      ...createInitialState(),
      _version: 11,
      ingresos: [
        { id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true },
        { id: 'i2', descripcion: 'Arriendo', monto: 800_000, frecuencia: 'Mensual', activo: true },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v11));

    loadData();

    expect(S.ingresos.every(i => 'diaPago' in i)).toBe(true);
    expect(S.ingresos.find(i => i.id === 'i1').diaPago).toBeNull();
    expect(S.ingresos.find(i => i.id === 'i2').diaPago).toBeNull();
  });
});

describe('Migración v12 → v13 (dominio Apartados)', () => {
  it('snapshot sin apartados recibe la colección vacía', () => {
    const v12 = { ...createInitialState(), _version: 12 };
    delete v12.apartados;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v12));

    loadData();

    expect(Array.isArray(S.apartados)).toBe(true);
    expect(S.apartados).toEqual([]);
    expect(S._version).toBe(SCHEMA_VERSION);
  });

  it('apartados existentes se preservan (idempotente)', () => {
    const v12 = {
      ...createInitialState(),
      _version: 12,
      apartados: [
        { id: 'a1', nombre: 'SOAT', icono: '🚗', montoObjetivo: 360_000,
          montoActual: 60_000, fechaObjetivo: '2026-12-10',
          frecuenciaAporte: 'Quincenal', completado: false },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v12));

    loadData();

    expect(S.apartados).toHaveLength(1);
    expect(S.apartados[0].id).toBe('a1');
    expect(S.apartados[0].montoActual).toBe(60_000);
  });

  it('apartados con valor no-array se normaliza a []', () => {
    const v12 = { ...createInitialState(), _version: 12, apartados: null };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v12));

    expect(() => loadData()).not.toThrow();
    expect(S.apartados).toEqual([]);
  });
});

describe('Migración v13 → v14 (recurrencia en apartados)', () => {
  it('apartados existentes pasan a no recurrentes', () => {
    const v13 = {
      ...createInitialState(),
      _version: 13,
      apartados: [
        { id: 'a1', nombre: 'SOAT', icono: '🚗', montoObjetivo: 360_000,
          montoActual: 60_000, fechaObjetivo: '2026-12-10',
          frecuenciaAporte: 'Quincenal', completado: false },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v13));

    loadData();

    expect(S.apartados[0].recurrente).toBe(false);
    expect(S.apartados[0].periodoMeses).toBeNull();
    expect(S._version).toBe(SCHEMA_VERSION);
  });

  it('apartados con recurrencia ya seteada no se sobreescriben (idempotente)', () => {
    const v13 = {
      ...createInitialState(),
      _version: 13,
      apartados: [
        { id: 'a1', nombre: 'SOAT', icono: '🚗', montoObjetivo: 360_000,
          montoActual: 0, fechaObjetivo: '2026-12-10',
          frecuenciaAporte: 'Quincenal', completado: false,
          recurrente: true, periodoMeses: 12 },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v13));

    loadData();

    expect(S.apartados[0].recurrente).toBe(true);
    expect(S.apartados[0].periodoMeses).toBe(12);
  });

  it('sin apartados en el snapshot no lanza', () => {
    const v13 = { ...createInitialState(), _version: 13, apartados: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v13));

    expect(() => loadData()).not.toThrow();
    expect(S.apartados).toEqual([]);
  });
});

describe('Migración v16 → v17 (categoria en gastos fijos de Agenda)', () => {
  it('compromisos tipo=fijo sin categoria quedan con categoria: null', () => {
    const v16 = {
      ...createInitialState(),
      _version: 16,
      compromisos: [
        { id: 'c1', descripcion: 'Arriendo', monto: 1_500_000, frecuencia: 'Mensual',
          diaPago: 5, tipo: 'fijo', activo: true },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v16));

    loadData();

    expect(S.compromisos[0].categoria).toBeNull();
    expect(S._version).toBe(SCHEMA_VERSION);
  });

  it('compromisos con categoria ya seteada no se sobreescriben (idempotente)', () => {
    const v16 = {
      ...createInitialState(),
      _version: 16,
      compromisos: [
        { id: 'c1', descripcion: 'Internet hogar', monto: 89_000, frecuencia: 'Mensual',
          diaPago: 5, tipo: 'fijo', activo: true, categoria: 'Internet' },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v16));

    loadData();

    expect(S.compromisos[0].categoria).toBe('Internet');
  });

  it('la migración v16→v17 en sí no toca deudas (lo hace v17→v18, ver siguiente describe)', () => {
    const v16 = {
      ...createInitialState(),
      _version: 16,
      compromisos: [
        { id: 'c1', descripcion: 'Tarjeta', saldoTotal: 1_000_000, cuotaMensual: 100_000,
          frecuencia: 'Mensual', diaPago: 5, tipo: 'deuda-entidad', activo: true },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v16));

    loadData();

    // El cascade de migraciones llega hasta v18, que sí agrega categoria: null
    // a las deudas (no es que v16→v17 la haya tocado).
    expect(S.compromisos[0].categoria).toBeNull();
  });

  it('sin compromisos en el snapshot no lanza', () => {
    const v16 = { ...createInitialState(), _version: 16, compromisos: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v16));

    expect(() => loadData()).not.toThrow();
    expect(S.compromisos).toEqual([]);
  });
});

describe('Migración v17 → v18 (categoria/tipo de obligación en deudas)', () => {
  it('deudas (entidad y personal) sin categoria quedan con categoria: null', () => {
    const v17 = {
      ...createInitialState(),
      _version: 17,
      compromisos: [
        { id: 'c1', descripcion: 'Tarjeta Visa', saldoTotal: 2_000_000, cuotaMensual: 200_000,
          frecuencia: 'Mensual', diaPago: 5, tipo: 'deuda-entidad', activo: true },
        { id: 'c2', descripcion: 'Préstamo de mamá', saldoTotal: 500_000, cuotaMensual: 50_000,
          frecuencia: 'Mensual', diaPago: 10, tipo: 'deuda-personal', activo: true },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v17));

    loadData();

    expect(S.compromisos[0].categoria).toBeNull();
    expect(S.compromisos[1].categoria).toBeNull();
    expect(S._version).toBe(SCHEMA_VERSION);
  });

  it('deudas con categoria ya seteada no se sobreescriben (idempotente)', () => {
    const v17 = {
      ...createInitialState(),
      _version: 17,
      compromisos: [
        { id: 'c1', descripcion: 'Tarjeta Visa', saldoTotal: 2_000_000, cuotaMensual: 200_000,
          frecuencia: 'Mensual', diaPago: 5, tipo: 'deuda-entidad', activo: true,
          categoria: 'Tarjeta de crédito' },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v17));

    loadData();

    expect(S.compromisos[0].categoria).toBe('Tarjeta de crédito');
  });

  it('no agrega categoria a gastos fijos (campo exclusivo de deudas en esta migración)', () => {
    const v17 = {
      ...createInitialState(),
      _version: 17,
      compromisos: [
        { id: 'c1', descripcion: 'Arriendo', monto: 1_500_000, frecuencia: 'Mensual',
          diaPago: 5, tipo: 'fijo', activo: true, categoria: null },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v17));

    loadData();

    expect(S.compromisos[0].categoria).toBeNull();
  });

  it('sin compromisos en el snapshot no lanza', () => {
    const v17 = { ...createInitialState(), _version: 17, compromisos: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v17));

    expect(() => loadData()).not.toThrow();
    expect(S.compromisos).toEqual([]);
  });
});

describe('Migración v18 → v19 (curación de Tipo de deuda, ADR 015)', () => {
  it('remapea los valores viejos de categoria a los nuevos', () => {
    const v18 = {
      ...createInitialState(),
      _version: 18,
      compromisos: [
        { id: 'c1', descripcion: 'Tarjeta', saldoTotal: 2_000_000, cuotaMensual: 200_000,
          frecuencia: 'Mensual', diaPago: 5, tipo: 'deuda-entidad', activo: true,
          categoria: 'Crédito de consumo' },
        { id: 'c2', descripcion: 'Gota a gota', saldoTotal: 500_000, cuotaMensual: 50_000,
          frecuencia: 'Mensual', diaPago: 10, tipo: 'deuda-personal', activo: true,
          categoria: 'Gota a gota' },
        { id: 'c3', descripcion: 'Casa', saldoTotal: 100_000_000, cuotaMensual: 1_000_000,
          frecuencia: 'Mensual', diaPago: 1, tipo: 'deuda-entidad', activo: true,
          categoria: 'Crédito hipotecario' },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v18));

    loadData();

    expect(S.compromisos[0].categoria).toBe('Libre inversión');
    expect(S.compromisos[1].categoria).toBe('Libre inversión');
    expect(S.compromisos[2].categoria).toBe('Vivienda');
    expect(S._version).toBe(SCHEMA_VERSION);
  });

  it('preserva los valores que no cambian de etiqueta (Tarjeta de crédito) y deja null sin tocar', () => {
    const v18 = {
      ...createInitialState(),
      _version: 18,
      compromisos: [
        { id: 'c1', descripcion: 'Visa', saldoTotal: 1_000_000, cuotaMensual: 100_000,
          frecuencia: 'Mensual', diaPago: 5, tipo: 'deuda-entidad', activo: true,
          categoria: 'Tarjeta de crédito' },
        { id: 'c2', descripcion: 'Sin tipo', saldoTotal: 300_000, cuotaMensual: 30_000,
          frecuencia: 'Mensual', diaPago: 8, tipo: 'deuda-personal', activo: true,
          categoria: null },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v18));

    loadData();

    expect(S.compromisos[0].categoria).toBe('Tarjeta de crédito');
    expect(S.compromisos[1].categoria).toBeNull();
  });

  it('es idempotente: un valor ya curado (Vivienda) no se altera', () => {
    const v19 = {
      ...createInitialState(),
      _version: 19,
      compromisos: [
        { id: 'c1', descripcion: 'Casa', saldoTotal: 100_000_000, cuotaMensual: 1_000_000,
          frecuencia: 'Mensual', diaPago: 1, tipo: 'deuda-entidad', activo: true,
          categoria: 'Vivienda' },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v19));

    loadData();

    expect(S.compromisos[0].categoria).toBe('Vivienda');
  });

  it('no toca la categoria de los gastos fijos', () => {
    const v18 = {
      ...createInitialState(),
      _version: 18,
      compromisos: [
        { id: 'c1', descripcion: 'Arriendo', monto: 1_500_000, frecuencia: 'Mensual',
          diaPago: 5, tipo: 'fijo', activo: true, categoria: 'Crédito de consumo' },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v18));

    loadData();

    // El remapeo solo aplica a deudas; un fijo con ese string raro se deja igual.
    expect(S.compromisos[0].categoria).toBe('Crédito de consumo');
  });
});

describe('Migración v19 → v20 (frecuencia de la cuota de manejo, BUG-005)', () => {
  it('capitaliza la frecuencia "mensual" de las cuotas de manejo ya guardadas', () => {
    const v19 = {
      ...createInitialState(),
      _version: 19,
      compromisos: [
        { id: 'cm1', descripcion: 'Cuota de manejo Nequi', monto: 15_000, frecuencia: 'mensual',
          diaPago: 5, tipo: 'fijo', activo: true, cuentaId: 'c1', esCuotaManejo: true },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v19));

    loadData();

    expect(S.compromisos[0].frecuencia).toBe('Mensual');
    expect(S._version).toBe(SCHEMA_VERSION);
  });

  it('no toca la frecuencia de un gasto fijo normal que no es cuota de manejo', () => {
    const v19 = {
      ...createInitialState(),
      _version: 19,
      compromisos: [
        // Un fijo normal jamás tuvo 'mensual' en minúscula (el form usa el catálogo
        // 'Mensual'); pero aunque lo tuviera por corrupción, sin esCuotaManejo se deja igual.
        { id: 'f1', descripcion: 'Arriendo', monto: 1_500_000, frecuencia: 'mensual',
          diaPago: 5, tipo: 'fijo', activo: true },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v19));

    loadData();

    expect(S.compromisos[0].frecuencia).toBe('mensual');
  });

  it('es idempotente: una cuota de manejo ya en "Mensual" no se altera', () => {
    const v20 = {
      ...createInitialState(),
      _version: 20,
      compromisos: [
        { id: 'cm1', descripcion: 'Cuota de manejo Davivienda', monto: 12_000, frecuencia: 'Mensual',
          diaPago: 3, tipo: 'fijo', activo: true, cuentaId: 'c1', esCuotaManejo: true },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v20));

    loadData();

    expect(S.compromisos[0].frecuencia).toBe('Mensual');
  });

  it('sin compromisos, la migración no falla (no-op)', () => {
    const v19 = { ...createInitialState(), _version: 19, compromisos: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v19));

    loadData();

    expect(S._version).toBe(SCHEMA_VERSION);
  });
});

describe('Migración v20 → v21 (tasa de interés en préstamos personales, PE.1)', () => {
  it('los préstamos existentes quedan sin tasa y con acumuladores derivados de pagado', () => {
    const v20 = {
      ...createInitialState(),
      _version: 20,
      personales: [
        { id: 'p1', persona: 'Tía Marta', monto: 100_000, pagado: 40_000,
          fecha: '2026-01-01', liquidado: false, fechaCreacion: '2026-01-01T10:00:00Z' },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v20));

    loadData();

    const p = S.personales[0];
    expect(p.tasa).toBeNull();
    expect(p.capitalPagado).toBe(40_000);      // todo lo cobrado fue capital
    expect(p.interesPagado).toBe(0);
    expect(p.interesPendiente).toBe(0);
    expect(S._version).toBe(SCHEMA_VERSION);
  });

  it('clampea capitalPagado a monto si pagado venía inflado', () => {
    const v20 = {
      ...createInitialState(),
      _version: 20,
      personales: [
        { id: 'p1', persona: 'X', monto: 100_000, pagado: 250_000,
          fecha: '2026-01-01', liquidado: true, fechaCreacion: '2026-01-01T10:00:00Z' },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v20));

    loadData();

    expect(S.personales[0].capitalPagado).toBe(100_000);
  });

  it('es idempotente: no sobreescribe campos ya presentes', () => {
    const v21 = {
      ...createInitialState(),
      _version: 21,
      personales: [
        { id: 'p1', persona: 'X', monto: 1_000_000, pagado: 50_000,
          fecha: '2026-05-01', tasa: 2, capitalPagado: 30_000,
          interesPagado: 20_000, interesPendiente: 1_500,
          liquidado: false, fechaCreacion: '2026-05-01T10:00:00Z' },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v21));

    loadData();

    const p = S.personales[0];
    expect(p.tasa).toBe(2);
    expect(p.capitalPagado).toBe(30_000);
    expect(p.interesPagado).toBe(20_000);
    expect(p.interesPendiente).toBe(1_500);
  });

  it('sin préstamos personales, la migración no falla (no-op)', () => {
    const v20 = { ...createInitialState(), _version: 20, personales: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v20));

    loadData();

    expect(S._version).toBe(SCHEMA_VERSION);
  });
});

describe('Migración v21 → v22 (ingresos puntuales, NAV.A1)', () => {
  it('un estado sin ingresosPuntuales recibe la colección vacía', () => {
    const v21 = { ...createInitialState(), _version: 21 };
    delete v21.ingresosPuntuales;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v21));

    loadData();

    expect(S.ingresosPuntuales).toEqual([]);
    expect(S._version).toBe(SCHEMA_VERSION);
  });

  it('es idempotente: no borra ingresos puntuales ya presentes', () => {
    const existente = {
      id: 'ip1', descripcion: 'Venta bici', monto: 300_000, categoria: 'Venta',
      cuentaId: 'c1', fecha: '2026-07-01', fechaCreacion: '2026-07-01T10:00:00Z',
    };
    const v22 = { ...createInitialState(), _version: 22, ingresosPuntuales: [existente] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v22));

    loadData();

    expect(S.ingresosPuntuales).toEqual([existente]);
  });
});

describe('Migración v22 → v23 (accesos rápidos de Inicio, IN.4a)', () => {
  it('un estado sin config.accesosInicio recibe el default (Mis cuentas, Ahorros, Límites)', () => {
    const v22 = { ...createInitialState(), _version: 22 };
    delete v22.config.accesosInicio;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v22));

    loadData();

    expect(S.config.accesosInicio).toEqual(['tesoreria', 'ahorro', 'presupuesto']);
    expect(S._version).toBe(SCHEMA_VERSION);
  });

  it('un estado v22 sin config en absoluto no revienta la migración', () => {
    const v22 = { ...createInitialState(), _version: 22 };
    delete v22.config;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v22));

    loadData();

    expect(S.config.accesosInicio).toEqual(['tesoreria', 'ahorro', 'presupuesto']);
  });

  it('es idempotente: no pisa una personalización ya guardada', () => {
    const v23 = { ...createInitialState(), _version: 23 };
    v23.config.accesosInicio = ['analisis', 'compromisos'];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v23));

    loadData();

    expect(S.config.accesosInicio).toEqual(['analisis', 'compromisos']);
  });
});

describe('Migración v23 → v24 (categorías de gasto personalizadas, TX.9b)', () => {
  it('un estado sin categoriasPersonalizadas recibe el array vacío', () => {
    const v23 = { ...createInitialState(), _version: 23 };
    delete v23.categoriasPersonalizadas;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v23));

    loadData();

    expect(S.categoriasPersonalizadas).toEqual([]);
    expect(S._version).toBe(SCHEMA_VERSION);
  });

  it('es idempotente: no borra categorías personalizadas ya creadas', () => {
    const existente = { id: 'cat1', nombre: 'Gimnasio', icono: 'c-pesa', fechaCreacion: '2026-07-05T10:00:00Z' };
    const v24 = { ...createInitialState(), _version: 24, categoriasPersonalizadas: [existente] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v24));

    loadData();

    expect(S.categoriasPersonalizadas).toEqual([existente]);
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
