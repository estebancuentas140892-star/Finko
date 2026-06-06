/**
 * tests/unit/logros.test.js - cobertura de evaluarLogros().
 *
 * Solo prueba lógica pura (logic.js). El toast y confetti (index.js)
 * requieren DOM completo y se verifican manualmente en la app.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { evaluarLogros, LOGROS } from '../../modules/dominio/logros/logic.js';
import { createInitialState } from '../../modules/core/state.js';

// ── Helpers ───────────────────────────────────────────────────────

function estado(overrides = {}) {
  return { ...createInitialState(), ...overrides };
}

const HOY = new Date();
const MES_ACTUAL = `${HOY.getFullYear()}-${String(HOY.getMonth() + 1).padStart(2, '0')}`;

// ── Suite principal ───────────────────────────────────────────────

describe('evaluarLogros - guardia de inputs', () => {
  test('retorna [] si s es null', () => {
    expect(evaluarLogros(null)).toEqual([]);
  });

  test('retorna [] si s es undefined', () => {
    expect(evaluarLogros(undefined)).toEqual([]);
  });

  test('retorna [] si s es string', () => {
    expect(evaluarLogros('hola')).toEqual([]);
  });

  test('retorna array (puede estar vacio)', () => {
    const res = evaluarLogros(estado());
    expect(Array.isArray(res)).toBe(true);
  });
});

describe('evaluarLogros - estado inicial vacio', () => {
  let s;
  beforeEach(() => { s = createInitialState(); });

  test('sin onboarding: ningún logro cumplido', () => {
    const res = evaluarLogros(s);
    expect(res).toHaveLength(0);
  });

  test('primer-paso: solo se cumple cuando onboarded = true', () => {
    expect(evaluarLogros(s)).not.toContain('primer-paso');
    s.onboarded = true;
    expect(evaluarLogros(s)).toContain('primer-paso');
  });
});

describe('evaluarLogros - logros de primer registro', () => {
  test('primer-gasto: se cumple al agregar 1 gasto', () => {
    const s = estado({ onboarded: true, gastos: [{ id: '1' }] });
    expect(evaluarLogros(s)).toContain('primer-gasto');
  });

  test('primer-compromiso: se cumple al agregar 1 compromiso', () => {
    const s = estado({ onboarded: true, compromisos: [{ id: '1' }] });
    expect(evaluarLogros(s)).toContain('primer-compromiso');
  });

  test('tesorero: se cumple al agregar 1 cuenta', () => {
    const s = estado({ onboarded: true, cuentas: [{ id: '1' }] });
    expect(evaluarLogros(s)).toContain('tesorero');
  });

  test('soñador: se cumple al agregar 1 meta', () => {
    const s = estado({ onboarded: true, metas: [{ id: '1', completada: false }] });
    expect(evaluarLogros(s)).toContain('soñador');
  });

  test('planificador: se cumple al agregar 1 presupuesto', () => {
    const s = estado({ onboarded: true, presupuestos: [{ id: '1' }] });
    expect(evaluarLogros(s)).toContain('planificador');
  });

  test('prestamista: se cumple al agregar 1 prestamo personal', () => {
    const s = estado({ onboarded: true, personales: [{ id: '1' }] });
    expect(evaluarLogros(s)).toContain('prestamista');
  });
});

describe('evaluarLogros - meta-lograda', () => {
  test('no se cumple si no hay metas completadas', () => {
    const s = estado({ metas: [{ id: '1', completada: false }] });
    expect(evaluarLogros(s)).not.toContain('meta-lograda');
  });

  test('se cumple con al menos 1 meta completada', () => {
    const s = estado({
      onboarded: true,
      metas: [
        { id: '1', completada: false },
        { id: '2', completada: true },
      ],
    });
    expect(evaluarLogros(s)).toContain('meta-lograda');
  });
});

describe('evaluarLogros - diversificador (3+ cuentas activas)', () => {
  test('no se cumple con 2 cuentas', () => {
    const s = estado({
      cuentas: [
        { id: '1', activa: true },
        { id: '2', activa: true },
      ],
    });
    expect(evaluarLogros(s)).not.toContain('diversificador');
  });

  test('se cumple con 3 cuentas activas', () => {
    const s = estado({
      onboarded: true,
      cuentas: [
        { id: '1', activa: true },
        { id: '2', activa: true },
        { id: '3', activa: true },
      ],
    });
    expect(evaluarLogros(s)).toContain('diversificador');
  });

  test('no cuenta cuentas inactivas hacia el umbral de 3', () => {
    const s = estado({
      cuentas: [
        { id: '1', activa: true  },
        { id: '2', activa: false },
        { id: '3', activa: false },
      ],
    });
    expect(evaluarLogros(s)).not.toContain('diversificador');
  });

  test('4 cuentas activas: sigue en cumplido', () => {
    const s = estado({
      onboarded: true,
      cuentas: Array.from({ length: 4 }, (_, i) => ({ id: String(i), activa: true })),
    });
    expect(evaluarLogros(s)).toContain('diversificador');
  });
});

describe('evaluarLogros - diez-gastos', () => {
  test('no se cumple con 9 gastos', () => {
    const s = estado({
      gastos: Array.from({ length: 9 }, (_, i) => ({ id: String(i) })),
    });
    expect(evaluarLogros(s)).not.toContain('diez-gastos');
  });

  test('se cumple con exactamente 10 gastos', () => {
    const s = estado({
      onboarded: true,
      gastos: Array.from({ length: 10 }, (_, i) => ({ id: String(i) })),
    });
    expect(evaluarLogros(s)).toContain('diez-gastos');
  });

  test('se cumple con más de 10 gastos', () => {
    const s = estado({
      onboarded: true,
      gastos: Array.from({ length: 25 }, (_, i) => ({ id: String(i) })),
    });
    expect(evaluarLogros(s)).toContain('diez-gastos');
  });
});

describe('evaluarLogros - multiples logros simultaneos', () => {
  test('usuario con datos completos desbloquea varios logros a la vez', () => {
    const s = estado({
      onboarded:    true,
      gastos:       [{ id: 'g1', fecha: `${MES_ACTUAL}-10`, monto: 200000 }],
      compromisos:  [{ id: 'c1' }],
      cuentas:      [{ id: 'a1', activa: true }, { id: 'a2', activa: true }, { id: 'a3', activa: true }],
      metas:        [{ id: 'm1', completada: true }],
      presupuestos: [{ id: 'p1' }],
      personales:   [{ id: 'pe1' }],
    });
    const res = evaluarLogros(s);
    expect(res).toContain('primer-paso');
    expect(res).toContain('primer-gasto');
    expect(res).toContain('primer-compromiso');
    expect(res).toContain('tesorero');
    expect(res).toContain('diversificador');
    expect(res).toContain('soñador');
    expect(res).toContain('meta-lograda');
    expect(res).toContain('planificador');
    expect(res).toContain('prestamista');
  });
});

describe('evaluarLogros - fondo-emergencia', () => {
  test('no se cumple sin datos de ahorro', () => {
    const s = estado({ onboarded: true });
    expect(evaluarLogros(s)).not.toContain('fondo-emergencia');
  });

  test('no se cumple si el fondo no esta activo', () => {
    const s = estado({
      onboarded: true,
      ahorro: {
        fondoEmergencia: { activo: false, completado: false },
        aportes: [],
        compromisoMensual: 0,
      },
    });
    expect(evaluarLogros(s)).not.toContain('fondo-emergencia');
  });

  test('no se cumple si el fondo esta activo pero no completado', () => {
    const s = estado({
      onboarded: true,
      ahorro: {
        fondoEmergencia: { activo: true, completado: false },
        aportes: [],
        compromisoMensual: 0,
      },
    });
    expect(evaluarLogros(s)).not.toContain('fondo-emergencia');
  });

  test('no se cumple si completado es undefined', () => {
    const s = estado({
      onboarded: true,
      ahorro: {
        fondoEmergencia: { activo: true },
        aportes: [],
        compromisoMensual: 0,
      },
    });
    expect(evaluarLogros(s)).not.toContain('fondo-emergencia');
  });

  test('se cumple cuando completado = true', () => {
    const s = estado({
      onboarded: true,
      ahorro: {
        fondoEmergencia: { activo: true, completado: true },
        aportes: [],
        compromisoMensual: 0,
      },
    });
    expect(evaluarLogros(s)).toContain('fondo-emergencia');
  });
});

describe('LOGROS - integridad de la tabla', () => {
  test('todos los logros tienen id, nombre, emoji, desc, eval', () => {
    for (const l of LOGROS) {
      expect(typeof l.id,     `id de ${l.id}`).toBe('string');
      expect(typeof l.nombre, `nombre de ${l.id}`).toBe('string');
      expect(typeof l.emoji,  `emoji de ${l.id}`).toBe('string');
      expect(typeof l.desc,   `desc de ${l.id}`).toBe('string');
      expect(typeof l.eval,   `eval de ${l.id}`).toBe('function');
    }
  });

  test('no hay IDs duplicados', () => {
    const ids = LOGROS.map(l => l.id);
    const unicos = new Set(ids);
    expect(unicos.size).toBe(ids.length);
  });
});
