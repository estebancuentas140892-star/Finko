/**
 * tests/integration/flujos.test.js - C.1 / C.2 / C.3
 *
 * Prueba los flujos principales de usuario cruzando múltiples dominios.
 * A diferencia de los tests unitarios (que aíslan una función), aquí se
 * verifica que los módulos trabajen correctamente en conjunto.
 *
 * Flujos cubiertos:
 *   1. Onboarding → Cuenta → Ingreso → Gasto (estado final correcto)
 *   2. Análisis cross-domain sobre el estado construido
 *   3. Persistencia: roundtrip localStorage (flush + reload)
 *   4. Resiliencia: localStorage corrupto no rompe la app
 *   5. Backup/Restore: export CSV → reset → import (C.2)
 *   6. Migración schema v1 → v2 (C.3)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { S, createInitialState, EventBus } from '../../modules/core/state.js';
import { loadData, _flushNow, STORAGE_KEY, SCHEMA_VERSION } from '../../modules/core/storage.js';
import { guardar } from '../../modules/infra/crud.js';
import { cuentasActivas, calcularTotalCuentas } from '../../modules/dominio/tesoreria/logic.js';
import { gastosMes, totalGastosMes } from '../../modules/dominio/gastos/logic.js';
import { generarResumen } from '../../modules/dominio/analisis/logic.js';
import { gastosACSV } from '../../modules/dominio/export/logic.js';
import { procesarCSV } from '../../modules/dominio/import/logic.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function resetS() {
  Object.assign(S, createInitialState());
  EventBus._listeners = Object.create(null);
  localStorage.clear();
}

/**
 * Construye el estado base del flujo C.1:
 *   perfil → cuenta Nequi ($2M) → ingreso Salario ($3M/mes) → gasto Arriendo ($800K)
 * Devuelve las referencias a los ítems creados.
 */
function buildEstadoBase() {
  S.perfil.nombre = 'Esteban';
  S.perfil.smmlv  = 1_423_500;
  S.onboarded     = true;

  const cuenta  = guardar('cuentas', {
    nombre: 'Nequi',
    banco:  'Nequi',
    tipo:   'Ahorros',
    saldo:  2_000_000,
    activa: true,
  });

  const ingreso = guardar('ingresos', {
    descripcion: 'Salario',
    monto:       3_000_000,
    frecuencia:  'Mensual',
    activo:      true,
  });

  const gasto   = guardar('gastos', {
    descripcion: 'Arriendo',
    monto:       800_000,
    categoria:   'Vivienda',
    fecha:       '2026-05-01',
    cuentaId:    cuenta.id,
    nota:        '',
  });

  return { cuenta, ingreso, gasto };
}

// ── Suite 1 - Estado resultante del flujo ─────────────────────────────────────

describe('C.1 - Flujo onboarding → cuenta → ingreso → gasto', () => {
  let refs;

  beforeEach(() => {
    resetS();
    refs = buildEstadoBase();
  });

  it('onboarding: perfil y flag onboarded quedan en S', () => {
    expect(S.perfil.nombre).toBe('Esteban');
    expect(S.perfil.smmlv).toBe(1_423_500);
    expect(S.onboarded).toBe(true);
  });

  it('primera cuenta: activa, saldo correcto, aparece en cuentasActivas()', () => {
    const activas = cuentasActivas(S.cuentas);
    expect(activas).toHaveLength(1);
    expect(activas[0].nombre).toBe('Nequi');
    expect(activas[0].saldo).toBe(2_000_000);
    expect(calcularTotalCuentas(S.cuentas)).toBe(2_000_000);
  });

  it('primer gasto: aparece en el mes correcto y vinculado a la cuenta', () => {
    const del_mes = gastosMes(S.gastos, 2026, 5);
    expect(del_mes).toHaveLength(1);
    expect(del_mes[0].descripcion).toBe('Arriendo');
    expect(del_mes[0].cuentaId).toBe(refs.cuenta.id);
    expect(totalGastosMes(S.gastos, 2026, 5)).toBe(800_000);
  });

  it('el gasto NO aparece en un mes distinto', () => {
    expect(gastosMes(S.gastos, 2026, 4)).toHaveLength(0);
    expect(gastosMes(S.gastos, 2026, 6)).toHaveLength(0);
  });

  it('los ítems tienen id único asignado automáticamente', () => {
    expect(refs.cuenta.id).toBeTruthy();
    expect(refs.ingreso.id).toBeTruthy();
    expect(refs.gasto.id).toBeTruthy();
    expect(refs.cuenta.id).not.toBe(refs.ingreso.id);
    expect(refs.ingreso.id).not.toBe(refs.gasto.id);
  });
});

// ── Suite 2 - Análisis cross-domain ──────────────────────────────────────────

describe('C.1 - Análisis cross-domain sobre el estado construido', () => {
  beforeEach(() => {
    resetS();
    buildEstadoBase();
  });

  it('generarResumen() agrega gastos, compromisos y saldos (sin ingresos, v8.8)', () => {
    const r = generarResumen(S.gastos, S.compromisos, S.cuentas, 2026, 5, S.metas, S.apartados, S.inversiones);
    expect(r.gastoMes).toBe(800_000);
    expect(r.compromisoMensual).toBe(0);
    expect(r.egresos).toBe(800_000);
    expect(r.saldoCuentas).toBe(2_000_000);
    expect(r.patrimonioNeto).toBe(2_000_000); // activos 2M − pasivos 0
  });

  it('generarResumen() ya no expone métricas de ingreso ni balance', () => {
    const r = generarResumen(S.gastos, S.compromisos, S.cuentas, 2026, 5, S.metas, S.apartados, S.inversiones);
    expect(r).not.toHaveProperty('ingresoMensual');
    expect(r).not.toHaveProperty('balance');
    expect(r).not.toHaveProperty('tasaAhorro');
    expect(r).not.toHaveProperty('salud');
  });

  it('generarResumen() con mes sin gastos: egresos en cero', () => {
    const r = generarResumen(S.gastos, S.compromisos, S.cuentas, 2026, 4, S.metas, S.apartados, S.inversiones);
    expect(r.gastoMes).toBe(0);
    expect(r.egresos).toBe(0);
    expect(r.saldoCuentas).toBe(2_000_000);
  });
});

// ── Suite 3 - Persistencia: roundtrip localStorage ───────────────────────────

describe('C.1 - Persistencia roundtrip (flush + reload)', () => {
  it('todo el estado del flujo sobrevive a flush + loadData()', () => {
    resetS();
    const { cuenta } = buildEstadoBase();

    _flushNow();

    // Simula reapertura de la app: vaciar memoria y recargar desde localStorage.
    Object.assign(S, createInitialState());
    loadData();

    expect(S.perfil.nombre).toBe('Esteban');
    expect(S.onboarded).toBe(true);
    expect(S.cuentas).toHaveLength(1);
    expect(S.ingresos).toHaveLength(1);
    expect(S.gastos).toHaveLength(1);
    expect(S.gastos[0].cuentaId).toBe(cuenta.id);
    expect(S.cuentas[0].saldo).toBe(2_000_000);
  });

  it('los cálculos de análisis son idénticos antes y después del roundtrip', () => {
    resetS();
    buildEstadoBase();

    const resumenAntes = generarResumen(S.gastos, S.compromisos, S.cuentas, 2026, 5, S.metas, S.apartados, S.inversiones);

    _flushNow();
    Object.assign(S, createInitialState());
    loadData();

    const resumenDespues = generarResumen(S.gastos, S.compromisos, S.cuentas, 2026, 5, S.metas, S.apartados, S.inversiones);

    expect(resumenDespues.gastoMes).toBe(resumenAntes.gastoMes);
    expect(resumenDespues.egresos).toBe(resumenAntes.egresos);
    expect(resumenDespues.saldoCuentas).toBe(resumenAntes.saldoCuentas);
    expect(resumenDespues.patrimonioNeto).toBe(resumenAntes.patrimonioNeto);
  });

  it('loadData() es idempotente - múltiples recargas dan el mismo resultado', () => {
    resetS();
    guardar('gastos', { descripcion: 'Café', monto: 5_000, categoria: 'Alimentación', fecha: '2026-05-01' });
    _flushNow();

    loadData();
    const n1 = S.gastos.length;
    loadData();
    const n2 = S.gastos.length;

    expect(n1).toBe(1);
    expect(n2).toBe(1);
  });

  it('múltiples ítems se persisten y recuperan sin duplicados', () => {
    resetS();
    guardar('gastos', { descripcion: 'G1', monto: 10_000, categoria: 'A', fecha: '2026-05-01' });
    guardar('gastos', { descripcion: 'G2', monto: 20_000, categoria: 'B', fecha: '2026-05-02' });
    guardar('gastos', { descripcion: 'G3', monto: 30_000, categoria: 'C', fecha: '2026-05-03' });
    _flushNow();

    Object.assign(S, createInitialState());
    loadData();

    expect(S.gastos).toHaveLength(3);
    expect(totalGastosMes(S.gastos, 2026, 5)).toBe(60_000);
  });
});

// ── Suite 4 - Resiliencia ─────────────────────────────────────────────────────

describe('C.1 - Resiliencia de la capa de datos', () => {
  beforeEach(resetS);

  it('localStorage corrupto: loadData() no lanza y deja S en estado inicial', () => {
    localStorage.setItem(STORAGE_KEY, '{ json: invalido }}}}');
    expect(() => loadData()).not.toThrow();
    expect(S.gastos).toEqual([]);
    expect(S.cuentas).toEqual([]);
    expect(S.onboarded).toBe(false);
  });

  it('localStorage vacío: loadData() deja S en estado inicial limpio', () => {
    loadData();
    expect(S.gastos).toEqual([]);
    expect(S.ingresos).toEqual([]);
    expect(S.onboarded).toBe(false);
  });

  it('análisis sobre estado vacío no lanza y devuelve ceros', () => {
    const r = generarResumen([], [], [], 2026, 5, []);
    expect(r.gastoMes).toBe(0);
    expect(r.egresos).toBe(0);
    expect(r.saldoCuentas).toBe(0);
    expect(r.patrimonioNeto).toBe(0);
  });

  it('cuenta inactiva no aparece en cuentasActivas() ni en el total', () => {
    guardar('cuentas', { nombre: 'Cerrada', banco: 'Banco', tipo: 'Ahorros', saldo: 500_000, activa: false });
    guardar('cuentas', { nombre: 'Activa',  banco: 'Banco', tipo: 'Ahorros', saldo: 300_000, activa: true  });
    expect(cuentasActivas(S.cuentas)).toHaveLength(1);
    expect(calcularTotalCuentas(S.cuentas)).toBe(300_000);
  });
});

// ── Suite 5 - Backup/Restore: export → reset → import ──────────────────────

describe('C.2 - Flujo backup/restore (export → reset → import)', () => {
  beforeEach(resetS);

  it('exportar gastos a CSV preserva toda la información', () => {
    const cuenta = guardar('cuentas', {
      nombre: 'Nequi',
      banco:  'Nequi',
      tipo:   'Ahorros',
      saldo:  2_000_000,
      activa: true,
    });

    guardar('gastos', {
      descripcion: 'Arriendo',
      monto:       800_000,
      categoria:   'Vivienda',
      fecha:       '2026-05-01',
      cuentaId:    cuenta.id,
      nota:        'Pago mensual',
    });

    guardar('gastos', {
      descripcion: 'Café',
      monto:       5_000,
      categoria:   'Alimentación',
      fecha:       '2026-05-15',
      cuentaId:    null,
      nota:        '',
    });

    const csv = gastosACSV(S.gastos, S.cuentas);

    expect(csv).toBeTruthy();
    expect(csv).toContain('2026-05-01');
    expect(csv).toContain('800000');
    expect(csv).toContain('Arriendo');
    expect(csv).toContain('Nequi');
    expect(csv).toContain('2026-05-15');
    expect(csv).toContain('5000');
    expect(csv).toContain('Café');
  });

  it('CSV vacío cuando no hay gastos', () => {
    const csv = gastosACSV(S.gastos, S.cuentas);
    expect(csv).toBe('');
  });

  it('importar CSV detecta correctamente todos los gastos válidos', () => {
    const cuenta = guardar('cuentas', {
      nombre: 'Nequi',
      banco:  'Nequi',
      tipo:   'Ahorros',
      saldo:  2_000_000,
      activa: true,
    });

    // Exportar gastos originales
    guardar('gastos', {
      descripcion: 'Arriendo',
      monto:       800_000,
      categoria:   'Vivienda',
      fecha:       '2026-05-01',
      cuentaId:    cuenta.id,
      nota:        'Pago mensual',
    });

    guardar('gastos', {
      descripcion: 'Café',
      monto:       5_000,
      categoria:   'Alimentación',
      fecha:       '2026-05-15',
      cuentaId:    null,
      nota:        '',
    });

    const csv = gastosACSV(S.gastos, S.cuentas);

    // Simular reset: limpiar gastos pero mantener cuentas
    S.gastos = [];

    // Importar el CSV
    const resultado = procesarCSV(csv, S.gastos, S.cuentas);

    expect(resultado.total).toBe(2);
    expect(resultado.validos).toHaveLength(2);
    expect(resultado.duplicados).toHaveLength(0);
    expect(resultado.errores).toHaveLength(0);

    // Verificar datos importados
    expect(resultado.validos[0].datos.descripcion).toBe('Café');
    expect(resultado.validos[0].datos.monto).toBe(5_000);
    expect(resultado.validos[1].datos.descripcion).toBe('Arriendo');
    expect(resultado.validos[1].datos.monto).toBe(800_000);
  });

  it('roundtrip completo: crear → exportar → reset → importar → datos idénticos', () => {
    const cuenta = guardar('cuentas', {
      nombre: 'Nequi',
      banco:  'Nequi',
      tipo:   'Ahorros',
      saldo:  2_000_000,
      activa: true,
    });

    guardar('gastos', {
      descripcion: 'Arriendo',
      monto:       800_000,
      categoria:   'Vivienda',
      fecha:       '2026-05-01',
      cuentaId:    cuenta.id,
      nota:        'Pago mensual',
    });

    guardar('gastos', {
      descripcion: 'Supermercado',
      monto:       150_000,
      categoria:   'Alimentación',
      fecha:       '2026-05-10',
      cuentaId:    null,
      nota:        '',
    });

    const gastosOriginales = [...S.gastos];
    const csv = gastosACSV(S.gastos, S.cuentas);

    // Reset: limpiar todo menos cuentas
    S.gastos = [];

    // Importar
    const resultado = procesarCSV(csv, S.gastos, S.cuentas);
    expect(resultado.validos).toHaveLength(2);

    // Guardar los gastos importados
    resultado.validos.forEach(({ datos }) => {
      guardar('gastos', datos);
    });

    // Comparar datos
    expect(S.gastos).toHaveLength(gastosOriginales.length);
    const gastosActuales = S.gastos.sort((a, b) => a.fecha.localeCompare(b.fecha));
    const originalesOrdenados = gastosOriginales.sort((a, b) => a.fecha.localeCompare(b.fecha));

    gastosActuales.forEach((actual, i) => {
      const original = originalesOrdenados[i];
      expect(actual.fecha).toBe(original.fecha);
      expect(actual.monto).toBe(original.monto);
      expect(actual.descripcion).toBe(original.descripcion);
      expect(actual.categoria).toBe(original.categoria);
      expect(actual.cuentaId).toBe(original.cuentaId);
      expect(actual.nota).toBe(original.nota);
    });
  });

  it('detecta duplicados cuando se intenta importar lo mismo dos veces', () => {
    const cuenta = guardar('cuentas', {
      nombre: 'Nequi',
      banco:  'Nequi',
      tipo:   'Ahorros',
      saldo:  2_000_000,
      activa: true,
    });

    guardar('gastos', {
      descripcion: 'Arriendo',
      monto:       800_000,
      categoria:   'Vivienda',
      fecha:       '2026-05-01',
      cuentaId:    cuenta.id,
      nota:        '',
    });

    const csv = gastosACSV(S.gastos, S.cuentas);

    // Primera importación
    const resultado1 = procesarCSV(csv, S.gastos, S.cuentas);
    expect(resultado1.validos).toHaveLength(0);
    expect(resultado1.duplicados).toHaveLength(1);

    // Segunda importación sin cambios
    const resultado2 = procesarCSV(csv, S.gastos, S.cuentas);
    expect(resultado2.validos).toHaveLength(0);
    expect(resultado2.duplicados).toHaveLength(1);
  });

  it('importar CSV con gasto sin referencia a cuenta válida → cuentaId = null', () => {
    const csv = `fecha,monto,descripcion,categoria,cuenta,nota
2026-05-01,5000,Café,Alimentación,BancoFantasma,`;

    const resultado = procesarCSV(csv, S.gastos, S.cuentas);

    expect(resultado.validos).toHaveLength(1);
    expect(resultado.validos[0].datos.cuentaId).toBeNull();
  });

  it('importar CSV con múltiples errores → se rechazan todas las filas malas', () => {
    const csv = `fecha,monto,descripcion,categoria,cuenta,nota
2026-05-01,5000,Café,Alimentación,,,
2026-13-01,5000,Arriendo,Vivienda,,
2026-05-03,,Gasto sin monto,Otros,,
2026-05-04,5000,,Otros,,`;

    const resultado = procesarCSV(csv, S.gastos, S.cuentas);

    expect(resultado.validos).toHaveLength(1); // Solo la primera (primer gasto está OK)
    expect(resultado.errores).toHaveLength(3);
  });

  it('importar CSV con BOM UTF-8 funciona correctamente', () => {
    const cuenta = guardar('cuentas', {
      nombre: 'Mi Cuenta',
      banco:  'Banco',
      tipo:   'Ahorros',
      saldo:  1_000_000,
      activa: true,
    });

    guardar('gastos', {
      descripcion: 'Comida',
      monto:       50_000,
      categoria:   'Alimentación',
      fecha:       '2026-05-05',
      cuentaId:    cuenta.id,
      nota:        '',
    });

    const csv = gastosACSV(S.gastos, S.cuentas);
    expect(csv.charCodeAt(0)).toBe(0xFEFF); // Verificar BOM

    // Limpiar y reimportar
    S.gastos = [];
    const resultado = procesarCSV(csv, S.gastos, S.cuentas);

    expect(resultado.validos).toHaveLength(1);
    expect(resultado.validos[0].datos.descripcion).toBe('Comida');
  });
});

// ── Suite 6 - Migración schema v1 → v2 ──────────────────────────────────────

describe('C.3 - Migración schema v1 → v2 (envelope budgeting)', () => {
  beforeEach(resetS);

  /** Serializa un fixture en localStorage y dispara loadData(). */
  function loadFixture(fixture) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fixture));
    loadData();
  }

  /** Estado realista de un usuario que usaba Finko antes de D.5 (schema v1). */
  const BASE_V1 = {
    _version: 1,
    onboarded: true,
    perfil: { nombre: 'María', smmlv: 1_423_500 },
    config: { notificaciones: false },
    cuentas: [
      { id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 3_000_000, activa: true, fechaCreacion: '2026-01-01' },
    ],
    ingresos: [
      { id: 'i1', descripcion: 'Salario', monto: 2_500_000, frecuencia: 'Mensual', activo: true, fechaCreacion: '2026-01-01' },
    ],
    gastos: [
      { id: 'g1', descripcion: 'Mercado', monto: 400_000, categoria: 'Alimentación', fecha: '2026-04-10', cuentaId: 'c1', nota: '' },
    ],
    compromisos: [],
    metas: [],
    // sin presupuestos - característica de v1
  };

  it('v1 con _version:1 agrega presupuestos:[] y sube _version al actual', () => {
    loadFixture(BASE_V1);

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.presupuestos).toEqual([]);
  });

  it('v1 sin campo _version se trata como v1 y migra correctamente', () => {
    const { _version, ...sinVersion } = BASE_V1;
    loadFixture(sinVersion);

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.presupuestos).toEqual([]);
  });

  it('migración es idempotente: v2 ya migrado con presupuestos no pierde datos', () => {
    const fixtureV2 = {
      ...BASE_V1,
      _version: 2,
      presupuestos: [
        { id: 'p1', categoria: 'Alimentación', montoMensual: 500_000, activo: true, fechaCreacion: '2026-05-01' },
      ],
    };
    loadFixture(fixtureV2);

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.presupuestos).toHaveLength(1);
    expect(S.presupuestos[0].id).toBe('p1');
  });

  it('todos los datos de v1 sobreviven la migración sin alteraciones', () => {
    loadFixture(BASE_V1);

    expect(S.onboarded).toBe(true);
    expect(S.perfil.nombre).toBe('María');
    expect(S.perfil.smmlv).toBe(1_423_500);
    expect(S.cuentas).toHaveLength(1);
    expect(S.cuentas[0].id).toBe('c1');
    expect(S.cuentas[0].saldo).toBe(3_000_000);
    expect(S.ingresos).toHaveLength(1);
    expect(S.ingresos[0].descripcion).toBe('Salario');
    expect(S.gastos).toHaveLength(1);
    expect(S.gastos[0].descripcion).toBe('Mercado');
    expect(S.gastos[0].cuentaId).toBe('c1');
    expect(S.compromisos).toEqual([]);
    expect(S.metas).toEqual([]);
  });

  it('presupuestos preexistentes en v1 no se sobrescriben durante la migración', () => {
    // _migrate() solo agrega presupuestos si !Array.isArray(data.presupuestos)
    const fixtureConPresupuestos = {
      ...BASE_V1,
      presupuestos: [
        { id: 'p1', categoria: 'Transporte', montoMensual: 200_000, activo: true, fechaCreacion: '2026-01-01' },
      ],
    };
    loadFixture(fixtureConPresupuestos);

    expect(S.presupuestos).toHaveLength(1);
    expect(S.presupuestos[0].id).toBe('p1');
  });

  it('_version string ("1") se trata como v1 y migra correctamente', () => {
    // typeof "1" !== 'number' → fallback a 1 → 1 < 2 → migra
    loadFixture({ ...BASE_V1, _version: '1' });

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.presupuestos).toEqual([]);
  });

  it('_version null se trata como v1 y migra correctamente', () => {
    // typeof null !== 'number' → fallback a 1 → migra
    loadFixture({ ...BASE_V1, _version: null });

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.presupuestos).toEqual([]);
  });

  it('roundtrip post-migración: v1 → loadData → flush → loadData → estado v2 intacto', () => {
    loadFixture(BASE_V1);

    expect(S._version).toBe(SCHEMA_VERSION);
    const gastosAntes = S.gastos.length;

    _flushNow();

    // Simula reapertura: resetear memoria y recargar desde localStorage ya migrado
    Object.assign(S, createInitialState());
    loadData();

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.presupuestos).toEqual([]);
    expect(S.gastos).toHaveLength(gastosAntes);
    expect(S.perfil.nombre).toBe('María');
    expect(S.onboarded).toBe(true);
  });

  it('campos desconocidos en v1 son descartados por _applyToS', () => {
    // _applyToS itera sobre Object.keys(createInitialState()) y descarta el resto
    loadFixture({
      ...BASE_V1,
      transferencias: [{ id: 't1', monto: 100_000 }],
      campoBasura:    'valor_legacy',
    });

    expect(S).not.toHaveProperty('transferencias');
    expect(S).not.toHaveProperty('campoBasura');
    expect(S._version).toBe(SCHEMA_VERSION);
    // Datos válidos siguen intactos
    expect(S.gastos).toHaveLength(1);
  });
});

// ── Suite 7 - Migración schema v2 → v3 (F.2 préstamos personales) ───────────

describe('F.2 - Migración schema v2 → v3 (préstamos personales)', () => {
  beforeEach(resetS);

  function loadFixture(fixture) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fixture));
    loadData();
  }

  /** Usuario que estaba en v2 (envelope budgeting ya implementado, sin personales). */
  const BASE_V2 = {
    _version: 2,
    onboarded: true,
    perfil: { nombre: 'Carlos', smmlv: 1_423_500 },
    config: { notificaciones: false },
    cuentas: [
      { id: 'c1', nombre: 'Davivienda', banco: 'Davivienda', tipo: 'Ahorros', saldo: 5_000_000, activa: true, fechaCreacion: '2026-02-01' },
    ],
    ingresos: [],
    gastos: [],
    compromisos: [],
    metas: [],
    presupuestos: [
      { id: 'p1', categoria: 'Alimentación', montoMensual: 600_000, activo: true, fechaCreacion: '2026-03-01' },
    ],
    // sin personales - característica de v2
  };

  it('v2 con _version:2 agrega personales:[] y sube _version al actual', () => {
    loadFixture(BASE_V2);

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.personales).toEqual([]);
  });

  it('migración v2→v3 preserva presupuestos del schema anterior', () => {
    loadFixture(BASE_V2);

    expect(S.presupuestos).toHaveLength(1);
    expect(S.presupuestos[0].categoria).toBe('Alimentación');
  });

  it('migración es idempotente: v3 con personales no los pierde', () => {
    const fixtureV3 = {
      ...BASE_V2,
      _version: 3,
      personales: [
        { id: 'per1', persona: 'Tía Marta', monto: 200_000, pagado: 50_000, fecha: '2026-05-01', liquidado: false },
      ],
    };
    loadFixture(fixtureV3);

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.personales).toHaveLength(1);
    expect(S.personales[0].persona).toBe('Tía Marta');
    expect(S.personales[0].pagado).toBe(50_000);
  });

  it('migración salta de v1 directo a v3 (cubre ambos saltos en una sola pasada)', () => {
    const fixtureV1 = {
      _version: 1,
      onboarded: true,
      perfil: { nombre: 'Ana', smmlv: 1_423_500 },
      config: { notificaciones: false },
      cuentas: [],
      ingresos: [],
      gastos: [],
      compromisos: [],
      metas: [],
      // sin presupuestos ni personales
    };
    loadFixture(fixtureV1);

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.presupuestos).toEqual([]);
    expect(S.personales).toEqual([]);
  });

  it('roundtrip post-migración v2→v3: datos persisten correctamente', () => {
    loadFixture(BASE_V2);
    expect(S._version).toBe(SCHEMA_VERSION);

    // Agregar un préstamo personal post-migración
    S.personales.push({
      id: 'per-x', persona: 'Hermano', monto: 100_000,
      pagado: 0, fecha: '2026-05-18', liquidado: false,
      fechaCreacion: '2026-05-18T00:00:00.000Z',
    });
    _flushNow();

    // Simula reapertura
    Object.assign(S, createInitialState());
    loadData();

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.personales).toHaveLength(1);
    expect(S.personales[0].persona).toBe('Hermano');
    expect(S.presupuestos).toHaveLength(1);
  });

  it('personales preexistentes inválidos (no array) son reseteados a []', () => {
    // _migrate() solo agrega personales si !Array.isArray(data.personales)
    const fixtureMalformado = {
      ...BASE_V2,
      personales: 'esto no es array',
    };
    loadFixture(fixtureMalformado);

    expect(S.personales).toEqual([]);
  });

  // ── Migración v6 → v7 (J.1: ahorro / fondo de emergencia) ──────────

  it('migración v6→v7: usuario v6 sin slice ahorro recibe defaults', () => {
    const fixtureV6 = {
      ...BASE_V2,
      _version: 6,
      logros: [],
      // sin slice `ahorro` - simula usuario pre-J.1
    };
    loadFixture(fixtureV6);

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.ahorro).toBeDefined();
    expect(S.ahorro.fondoEmergencia).toEqual({
      activo: false, metaMeses: 3, montoActual: 0,
    });
    expect(S.ahorro.aportes).toEqual([]);
    expect(S.ahorro.compromisoMensual).toBe(0);
  });

  it('migración v6→v7: ahorro parcial preexistente se rellena defensivamente', () => {
    // Caso edge: usuario tocó S.ahorro manualmente o un snapshot intermedio
    // (devtools, import semi-completo) entró sin alguna sub-clave.
    const fixtureV6 = {
      ...BASE_V2,
      _version: 6,
      ahorro: {
        fondoEmergencia: { activo: true, metaMeses: 6 }, // sin montoActual
        // sin aportes ni compromisoMensual
      },
    };
    loadFixture(fixtureV6);

    expect(S.ahorro.fondoEmergencia.activo).toBe(true);
    expect(S.ahorro.fondoEmergencia.metaMeses).toBe(6);
    expect(S.ahorro.fondoEmergencia.montoActual).toBe(0); // default
    expect(S.ahorro.aportes).toEqual([]);
    expect(S.ahorro.compromisoMensual).toBe(0);
  });

  it('migración es idempotente: v7 con ahorro existente no lo pisa', () => {
    const fixtureV7 = {
      ...BASE_V2,
      _version: 7,
      ahorro: {
        fondoEmergencia: { activo: true, metaMeses: 4, montoActual: 1_500_000 },
        aportes: [{ id: 'a1', monto: 200_000, fecha: '2026-05-01', nota: 'test' }],
        compromisoMensual: 300_000,
      },
    };
    loadFixture(fixtureV7);

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.ahorro.fondoEmergencia).toEqual({
      activo: true, metaMeses: 4, montoActual: 1_500_000,
    });
    expect(S.ahorro.aportes).toHaveLength(1);
    expect(S.ahorro.compromisoMensual).toBe(300_000);
  });

  it('roundtrip post-migración v6→v7: cambios al fondo persisten', () => {
    const fixtureV6 = { ...BASE_V2, _version: 6, logros: [] };
    loadFixture(fixtureV6);

    // Activar el fondo y guardar
    S.ahorro.fondoEmergencia = { activo: true, metaMeses: 6, montoActual: 800_000 };
    _flushNow();

    // Simular reapertura
    Object.assign(S, createInitialState());
    loadData();

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.ahorro.fondoEmergencia.activo).toBe(true);
    expect(S.ahorro.fondoEmergencia.metaMeses).toBe(6);
    expect(S.ahorro.fondoEmergencia.montoActual).toBe(800_000);
  });

  // ── Migración v7 → v8 (J.2: inversiones / portafolio) ──────────────

  it('migración v7→v8: usuario v7 sin inversiones recibe [] y sube _version', () => {
    const fixtureV7 = {
      ...BASE_V2,
      _version: 7,
      ahorro: {
        fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 },
        aportes: [],
        compromisoMensual: 0,
      },
      // sin colección `inversiones` - simula usuario pre-J.2
    };
    loadFixture(fixtureV7);

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.inversiones).toEqual([]);
    // El slice ahorro de v7 sobrevive intacto.
    expect(S.ahorro.fondoEmergencia.metaMeses).toBe(3);
  });

  it('migración es idempotente: v8 con inversiones existentes no las pisa', () => {
    const fixtureV8 = {
      ...BASE_V2,
      _version: 8,
      ahorro: {
        fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 },
        aportes: [],
        compromisoMensual: 0,
      },
      inversiones: [
        { id: 'i1', tipo: 'CDT', nombre: 'CDT Bancolombia', monto: 5_000_000, tasaEA: 11.5, plazoMeses: 12, fechaInicio: '2026-01-15', fechaCreacion: '2026-01-15T00:00:00.000Z' },
      ],
    };
    loadFixture(fixtureV8);

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.inversiones).toHaveLength(1);
    expect(S.inversiones[0].nombre).toBe('CDT Bancolombia');
    expect(S.inversiones[0].monto).toBe(5_000_000);
  });

  it('roundtrip post-migración v7→v8: inversiones registradas persisten', () => {
    const fixtureV7 = { ...BASE_V2, _version: 7, logros: [] };
    loadFixture(fixtureV7);

    // Registrar una inversión y guardar.
    S.inversiones.push({
      id: 'i1', tipo: 'Acciones', nombre: 'ETF S&P 500', monto: 2_000_000,
      tasaEA: 0, plazoMeses: 0, fechaInicio: '2026-06-01',
      fechaCreacion: '2026-06-01T00:00:00.000Z',
    });
    _flushNow();

    // Simular reapertura.
    Object.assign(S, createInitialState());
    loadData();

    expect(S._version).toBe(SCHEMA_VERSION);
    expect(S.inversiones).toHaveLength(1);
    expect(S.inversiones[0].nombre).toBe('ETF S&P 500');
    expect(S.inversiones[0].monto).toBe(2_000_000);
  });
});
