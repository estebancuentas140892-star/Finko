/**
 * tests/integration/flujos.test.js — C.1
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
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { S, createInitialState, EventBus } from '../../modules/core/state.js';
import { loadData, _flushNow, STORAGE_KEY } from '../../modules/core/storage.js';
import { guardar } from '../../modules/infra/crud.js';
import { cuentasActivas, calcularTotalCuentas } from '../../modules/dominio/tesoreria/logic.js';
import { ingresosActivos, calcularTotalMensual, calcularIngresoMensual } from '../../modules/dominio/ingresos/logic.js';
import { gastosMes, totalGastosMes } from '../../modules/dominio/gastos/logic.js';
import {
  calcularBalance,
  calcularTasaAhorro,
  nivelSalud,
  generarResumen,
} from '../../modules/dominio/analisis/logic.js';
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

// ── Suite 1 — Estado resultante del flujo ─────────────────────────────────────

describe('C.1 — Flujo onboarding → cuenta → ingreso → gasto', () => {
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

  it('primer ingreso: activo y su cuota mensual es el monto declarado', () => {
    const activos = ingresosActivos(S.ingresos);
    expect(activos).toHaveLength(1);
    expect(calcularIngresoMensual(activos[0])).toBe(3_000_000);
    expect(calcularTotalMensual(S.ingresos)).toBe(3_000_000);
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

// ── Suite 2 — Análisis cross-domain ──────────────────────────────────────────

describe('C.1 — Análisis cross-domain sobre el estado construido', () => {
  beforeEach(() => {
    resetS();
    buildEstadoBase();
  });

  it('balance mensual: ingreso − gasto − compromisos = $2.200.000', () => {
    const ingresoMensual    = calcularTotalMensual(S.ingresos);
    const gastoMes          = totalGastosMes(S.gastos, 2026, 5);
    const compromisoMensual = 0;
    expect(calcularBalance(ingresoMensual, gastoMes, compromisoMensual)).toBe(2_200_000);
  });

  it('tasa de ahorro: 73% (redondeado) con $3M ingreso y $800K gasto', () => {
    const ingresoMensual = calcularTotalMensual(S.ingresos);
    const egresos        = totalGastosMes(S.gastos, 2026, 5);
    expect(calcularTasaAhorro(ingresoMensual, egresos)).toBe(73);
  });

  it('salud financiera: "excelente" (tasa ≥ 20%)', () => {
    expect(nivelSalud(73)).toBe('excelente');
  });

  it('generarResumen() agrega correctamente los 4 dominios', () => {
    const r = generarResumen(S.ingresos, S.gastos, S.compromisos, S.cuentas, 2026, 5);
    expect(r.ingresoMensual).toBe(3_000_000);
    expect(r.gastoMes).toBe(800_000);
    expect(r.compromisoMensual).toBe(0);
    expect(r.balance).toBe(2_200_000);
    expect(r.tasaAhorro).toBe(73);
    expect(r.salud).toBe('excelente');
    expect(r.saldoCuentas).toBe(2_000_000);
  });

  it('generarResumen() con mes sin gastos: balance = ingreso completo', () => {
    const r = generarResumen(S.ingresos, S.gastos, S.compromisos, S.cuentas, 2026, 4);
    expect(r.gastoMes).toBe(0);
    expect(r.balance).toBe(3_000_000);
    expect(r.tasaAhorro).toBe(100);
    expect(r.salud).toBe('excelente');
  });

  it('salud "critica" cuando egresos superan ingresos', () => {
    guardar('gastos', {
      descripcion: 'Gasto enorme',
      monto:       5_000_000,
      categoria:   'Otros',
      fecha:       '2026-05-15',
    });
    const ingresoMensual = calcularTotalMensual(S.ingresos);
    const egresos        = totalGastosMes(S.gastos, 2026, 5);
    const tasa           = calcularTasaAhorro(ingresoMensual, egresos);
    expect(tasa).toBeLessThan(0);
    expect(nivelSalud(tasa)).toBe('critica');
  });
});

// ── Suite 3 — Persistencia: roundtrip localStorage ───────────────────────────

describe('C.1 — Persistencia roundtrip (flush + reload)', () => {
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

    const resumenAntes = generarResumen(S.ingresos, S.gastos, S.compromisos, S.cuentas, 2026, 5);

    _flushNow();
    Object.assign(S, createInitialState());
    loadData();

    const resumenDespues = generarResumen(S.ingresos, S.gastos, S.compromisos, S.cuentas, 2026, 5);

    expect(resumenDespues.ingresoMensual).toBe(resumenAntes.ingresoMensual);
    expect(resumenDespues.gastoMes).toBe(resumenAntes.gastoMes);
    expect(resumenDespues.balance).toBe(resumenAntes.balance);
    expect(resumenDespues.salud).toBe(resumenAntes.salud);
  });

  it('loadData() es idempotente — múltiples recargas dan el mismo resultado', () => {
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

// ── Suite 4 — Resiliencia ─────────────────────────────────────────────────────

describe('C.1 — Resiliencia de la capa de datos', () => {
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
    const r = generarResumen([], [], [], [], 2026, 5);
    expect(r.ingresoMensual).toBe(0);
    expect(r.gastoMes).toBe(0);
    expect(r.balance).toBe(0);
    expect(r.salud).toBe('ajustada');
  });

  it('cuenta inactiva no aparece en cuentasActivas() ni en el total', () => {
    guardar('cuentas', { nombre: 'Cerrada', banco: 'Banco', tipo: 'Ahorros', saldo: 500_000, activa: false });
    guardar('cuentas', { nombre: 'Activa',  banco: 'Banco', tipo: 'Ahorros', saldo: 300_000, activa: true  });
    expect(cuentasActivas(S.cuentas)).toHaveLength(1);
    expect(calcularTotalCuentas(S.cuentas)).toBe(300_000);
  });
});

// ── Suite 5 — Backup/Restore: export → reset → import ──────────────────────

describe('C.2 — Flujo backup/restore (export → reset → import)', () => {
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
