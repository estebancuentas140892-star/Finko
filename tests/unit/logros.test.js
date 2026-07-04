/**
 * tests/unit/logros.test.js - cobertura de evaluarLogros(), estadoLogros()
 * y la vitrina de logros (LG.1b, ADR 022).
 *
 * El toast y confetti (index.js) requieren DOM completo y se verifican
 * manualmente en la app; la vitrina se prueba con happy-dom.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { evaluarLogros, estadoLogros, LOGROS } from '../../modules/dominio/logros/logic.js';
import { renderPanelLogros } from '../../modules/dominio/logros/view.js';
import { S, createInitialState } from '../../modules/core/state.js';

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
  test('todos los logros tienen id, nombre, emoji, desc, hint, eval', () => {
    for (const l of LOGROS) {
      expect(typeof l.id,     `id de ${l.id}`).toBe('string');
      expect(typeof l.nombre, `nombre de ${l.id}`).toBe('string');
      expect(typeof l.emoji,  `emoji de ${l.id}`).toBe('string');
      expect(typeof l.desc,   `desc de ${l.id}`).toBe('string');
      expect(typeof l.hint,   `hint de ${l.id}`).toBe('string');
      expect(typeof l.eval,   `eval de ${l.id}`).toBe('function');
    }
  });

  test('no hay IDs duplicados', () => {
    const ids = LOGROS.map(l => l.id);
    const unicos = new Set(ids);
    expect(unicos.size).toBe(ids.length);
  });

  test('progreso solo existe en los logros de conteo (ADR 022)', () => {
    const conProgreso = LOGROS.filter(l => typeof l.progreso === 'function').map(l => l.id);
    expect(conProgreso.sort()).toEqual(['diez-gastos', 'diversificador']);
  });
});

// ── estadoLogros() (LG.1b, ADR 022) ───────────────────────────────

describe('estadoLogros()', () => {
  test('devuelve todos los logros del catálogo con su estado', () => {
    const res = estadoLogros(estado(), []);
    expect(res).toHaveLength(LOGROS.length);
    expect(res.every(l => l.desbloqueado === false)).toBe(true);
  });

  test('un logro persistido queda desbloqueado aunque el estado retroceda', () => {
    // El usuario borró todos sus gastos: primer-gasto ya no se cumple en
    // vivo, pero el logro ganado no se revoca.
    const res = estadoLogros(estado(), ['primer-gasto']);
    const pg = res.find(l => l.id === 'primer-gasto');
    expect(pg.desbloqueado).toBe(true);
  });

  test('un logro cumplido en vivo cuenta como desbloqueado aunque no esté persistido', () => {
    const s = estado({ onboarded: true });
    const res = estadoLogros(s, []);
    expect(res.find(l => l.id === 'primer-paso').desbloqueado).toBe(true);
  });

  test('los pendientes de conteo exponen progreso parcial', () => {
    const s = estado({
      gastos:  Array.from({ length: 7 }, (_, i) => ({ id: String(i) })),
      cuentas: [{ id: '1', activa: true }, { id: '2', activa: true }],
    });
    const res = estadoLogros(s, []);
    expect(res.find(l => l.id === 'diez-gastos').progreso).toEqual({ actual: 7, meta: 10 });
    expect(res.find(l => l.id === 'diversificador').progreso).toEqual({ actual: 2, meta: 3 });
  });

  test('un logro desbloqueado no expone progreso (ya no aplica)', () => {
    const s = estado({
      gastos: Array.from({ length: 12 }, (_, i) => ({ id: String(i) })),
    });
    const res = estadoLogros(s, []);
    const dg = res.find(l => l.id === 'diez-gastos');
    expect(dg.desbloqueado).toBe(true);
    expect(dg.progreso).toBeNull();
  });

  test('los binarios no exponen progreso', () => {
    const res = estadoLogros(estado(), []);
    expect(res.find(l => l.id === 'primer-gasto').progreso).toBeNull();
    expect(res.find(l => l.id === 'fondo-emergencia').progreso).toBeNull();
  });
});

// ── renderPanelLogros() (vitrina, happy-dom) ──────────────────────

describe('renderPanelLogros()', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-logros"></div>';
    const base = createInitialState();
    for (const k of Object.keys(base)) S[k] = base[k];
  });

  test('renderiza la card con el resumen y todos los logros', () => {
    S.logros = ['primer-paso', 'primer-gasto'];
    renderPanelLogros();
    const panel = document.getElementById('panel-logros');
    expect(panel.textContent).toContain('🏆 Logros');
    expect(panel.textContent).toContain(`2 de ${LOGROS.length}`);
    expect(panel.querySelectorAll('.logro-item')).toHaveLength(LOGROS.length);
    expect(panel.querySelectorAll('.logro-item--on')).toHaveLength(2);
  });

  test('los desbloqueados muestran desc y los pendientes muestran hint', () => {
    S.logros = ['primer-gasto'];
    renderPanelLogros();
    const panel = document.getElementById('panel-logros');
    expect(panel.textContent).toContain('Registraste tu primer gasto.');
    expect(panel.textContent).toContain('Registra 10 gastos: el hábito es lo que cuenta.');
  });

  test('los pendientes de conteo muestran barra y texto de progreso', () => {
    S.gastos = Array.from({ length: 4 }, (_, i) => ({ id: String(i) }));
    renderPanelLogros();
    const panel = document.getElementById('panel-logros');
    const barras = panel.querySelectorAll('.progress[role="progressbar"]');
    expect(barras.length).toBeGreaterThan(0);
    expect(panel.textContent).toContain('4 de 10');
  });

  test('no-op si el contenedor no existe', () => {
    document.body.innerHTML = '';
    expect(() => renderPanelLogros()).not.toThrow();
  });
});
