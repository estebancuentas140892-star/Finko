/**
 * tests/unit/logros.test.js - cobertura de evaluarLogros(), estadoLogros()
 * y "Tu progreso" (LG.2d, ADR 032 D6): apartado de Análisis + tarjeta de
 * Inicio. El ADR 022 (vitrina en Ajustes) quedó Superada.
 *
 * El toast y confetti (index.js) requieren DOM completo y se verifican
 * manualmente en la app; las dos superficies se prueban con happy-dom.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  evaluarLogros, estadoLogros, LOGROS,
  FAMILIAS, agruparVitrina, nivelUsuario, NIVELES_USUARIO,
  mesCompleto, rachaMesesCompletos, deudasSaldadas,
  gastoHormigaMes, hormigaALaRaya,
  UMBRAL_GASTO_HORMIGA, UMBRAL_HORMIGA_RELEVANTE,
} from '../../modules/dominio/logros/logic.js';
import { renderProgresoAnalisis, renderTarjetaProgresoInicio } from '../../modules/dominio/logros/view.js';
import { S, createInitialState } from '../../modules/core/state.js';

// Items visibles de la vitrina: los singles pasan tal cual y cada familia
// colapsa a una tarjeta (LG.2b, ADR 032).
const N_SINGLES  = LOGROS.filter(l => !l.familia).length;
const N_FAMILIAS = new Set(LOGROS.filter(l => l.familia).map(l => l.familia)).size;
const N_ITEMS_VITRINA = N_SINGLES + N_FAMILIAS;

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
    expect(conProgreso.sort()).toEqual([
      'diez-gastos', 'diversificador', 'doce-meses-seguidos',
      'seis-meses-seguidos', 'tres-deudas-saldadas', 'tres-meses-seguidos',
    ]);
  });

  test('toda familia declarada existe en FAMILIAS y sus niveles son 1..N sin huecos (ADR 032 D1)', () => {
    const porFamilia = new Map();
    for (const l of LOGROS) {
      if (!l.familia) continue;
      expect(FAMILIAS[l.familia], `familia "${l.familia}" de ${l.id} sin metadata`).toBeDefined();
      expect(typeof l.nivel, `nivel de ${l.id}`).toBe('number');
      if (!porFamilia.has(l.familia)) porFamilia.set(l.familia, []);
      porFamilia.get(l.familia).push(l.nivel);
    }
    for (const [familia, niveles] of porFamilia) {
      const ordenados = [...niveles].sort((a, b) => a - b);
      expect(ordenados, `niveles de "${familia}" deben ser consecutivos desde 1`)
        .toEqual(Array.from({ length: ordenados.length }, (_, i) => i + 1));
    }
  });
});

// ── agruparVitrina() (LG.2b, ADR 032 D1) ──────────────────────────

describe('agruparVitrina()', () => {
  test('colapsa cada familia a una entrada y deja los singles tal cual', () => {
    const items = agruparVitrina(estadoLogros(estado(), []));
    expect(items).toHaveLength(N_ITEMS_VITRINA);
    expect(items.filter(i => i.tipo === 'familia')).toHaveLength(N_FAMILIAS);
    expect(items.filter(i => i.tipo === 'logro')).toHaveLength(N_SINGLES);
  });

  test('la familia aparece en la posición de su primer nivel (orden de catálogo)', () => {
    const items = agruparVitrina(estadoLogros(estado(), []));
    // primer-gasto es el 2.º logro del catálogo: la familia registro va 2.ª.
    expect(items[1].tipo).toBe('familia');
    expect(items[1].familia).toBe('registro');
  });

  test('sin niveles desbloqueados: actual null y siguiente = nivel 1', () => {
    const items = agruparVitrina(estadoLogros(estado(), []));
    const reg = items.find(i => i.tipo === 'familia' && i.familia === 'registro');
    expect(reg.actual).toBeNull();
    expect(reg.siguiente.id).toBe('primer-gasto');
    expect(reg.desbloqueados).toBe(0);
    expect(reg.totalNiveles).toBe(6);
  });

  test('con nivel 1 ganado: actual = nivel 1 y siguiente = nivel 2 con su progreso', () => {
    const s = estado({ gastos: Array.from({ length: 4 }, (_, i) => ({ id: String(i) })) });
    const items = agruparVitrina(estadoLogros(s, []));
    const reg = items.find(i => i.tipo === 'familia' && i.familia === 'registro');
    expect(reg.actual.id).toBe('primer-gasto');
    expect(reg.siguiente.id).toBe('diez-gastos');
    expect(reg.siguiente.progreso).toEqual({ actual: 4, meta: 10 });
    expect(reg.desbloqueados).toBe(1);
  });

  test('familia completa: siguiente es null', () => {
    const idsRegistro = [
      'primer-gasto', 'diez-gastos', 'mes-completo',
      'tres-meses-seguidos', 'seis-meses-seguidos', 'doce-meses-seguidos',
    ];
    const items = agruparVitrina(estadoLogros(estado(), idsRegistro));
    const reg = items.find(i => i.tipo === 'familia' && i.familia === 'registro');
    expect(reg.actual.id).toBe('doce-meses-seguidos');
    expect(reg.siguiente).toBeNull();
    expect(reg.desbloqueados).toBe(6);
  });

  test('el nombre de la familia sale de FAMILIAS', () => {
    const items = agruparVitrina(estadoLogros(estado(), []));
    const reg = items.find(i => i.tipo === 'familia' && i.familia === 'registro');
    expect(reg.nombre).toBe('Constancia de registro');
  });

  test('entrada inválida devuelve lista vacía', () => {
    expect(agruparVitrina(null)).toEqual([]);
  });
});

// ── nivelUsuario() (LG.2b, ADR 032 D5) ────────────────────────────

describe('nivelUsuario()', () => {
  test('0 logros: primer nivel del catálogo', () => {
    expect(nivelUsuario(0).nombre).toBe(NIVELES_USUARIO[0].nombre);
  });

  test('los umbrales del ADR 032 D5 se respetan en los bordes', () => {
    expect(nivelUsuario(2).min).toBe(0);
    expect(nivelUsuario(3).min).toBe(3);
    expect(nivelUsuario(5).min).toBe(3);
    expect(nivelUsuario(6).min).toBe(6);
    expect(nivelUsuario(10).min).toBe(10);
    expect(nivelUsuario(14).min).toBe(14);
    // Umbral superior recalibrado en LG.2e: el catálogo cerró en 18 logros.
    expect(nivelUsuario(16).min).toBe(16);
    expect(nivelUsuario(50).min).toBe(16);
  });

  test('entrada inválida cae al primer nivel', () => {
    expect(nivelUsuario(NaN).min).toBe(0);
    expect(nivelUsuario(-3).min).toBe(0);
  });

  test('NIVELES_USUARIO está ordenado por min ascendente', () => {
    const mins = NIVELES_USUARIO.map(n => n.min);
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
  });

  test('el tramo superior es alcanzable sin el 100 % del catálogo (LG.2e)', () => {
    expect(NIVELES_USUARIO[NIVELES_USUARIO.length - 1].min).toBeLessThan(LOGROS.length);
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

// ── renderProgresoAnalisis() (apartado de Análisis, happy-dom) ────

describe('renderProgresoAnalisis()', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-analisis-progreso"></div>';
    const base = createInitialState();
    for (const k of Object.keys(base)) S[k] = base[k];
  });

  test('renderiza el apartado con el nivel de usuario y los items agrupados', () => {
    S.logros = ['primer-paso', 'primer-gasto'];
    renderProgresoAnalisis();
    const panel = document.getElementById('panel-analisis-progreso');
    expect(panel.textContent).toContain('Tu progreso');
    expect(panel.textContent).toContain(`${2} de ${LOGROS.length} logros`);
    // LG.2b: cada familia colapsa a una tarjeta; singles pasan tal cual.
    expect(panel.querySelectorAll('.logro-item')).toHaveLength(N_ITEMS_VITRINA);
    // primer-paso (single) + familia registro (tiene un nivel ganado) = 2 activas.
    expect(panel.querySelectorAll('.logro-item--on')).toHaveLength(2);
  });

  test('los desbloqueados muestran desc y los pendientes muestran hint', () => {
    S.logros = ['primer-gasto'];
    renderProgresoAnalisis();
    const panel = document.getElementById('panel-analisis-progreso');
    expect(panel.textContent).toContain('Registraste tu primer gasto.');
    expect(panel.textContent).toContain('Registra 10 gastos: el hábito es lo que cuenta.');
  });

  test('la familia con un nivel ganado muestra el chip de nivel y el siguiente objetivo', () => {
    S.logros = ['primer-gasto'];
    renderProgresoAnalisis();
    const panel = document.getElementById('panel-analisis-progreso');
    expect(panel.textContent).toContain('Constancia de registro');
    expect(panel.textContent).toContain('Nivel 1 de 6');
    expect(panel.textContent).toContain('Siguiente:');
  });

  test('los pendientes de conteo muestran barra y texto de progreso', () => {
    S.gastos = Array.from({ length: 4 }, (_, i) => ({ id: String(i) }));
    renderProgresoAnalisis();
    const panel = document.getElementById('panel-analisis-progreso');
    const barras = panel.querySelectorAll('.progress[role="progressbar"]');
    expect(barras.length).toBeGreaterThan(0);
    expect(panel.textContent).toContain('4 de 10');
  });

  test('conserva el estado abierto/cerrado entre renders (DIS.10 C11)', () => {
    S.logros = ['primer-gasto'];
    renderProgresoAnalisis();
    const panel = document.getElementById('panel-analisis-progreso');
    panel.querySelector('.analisis-grupo--progreso').open = true;
    renderProgresoAnalisis();
    expect(panel.querySelector('.analisis-grupo--progreso').open).toBe(true);
  });

  test('no-op si el contenedor no existe', () => {
    document.body.innerHTML = '';
    expect(() => renderProgresoAnalisis()).not.toThrow();
  });
});

// ── renderTarjetaProgresoInicio() (tarjeta compacta, happy-dom) ───

describe('renderTarjetaProgresoInicio()', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-progreso-inicio" hidden></div>';
    const base = createInitialState();
    for (const k of Object.keys(base)) S[k] = base[k];
  });

  test('oculta la tarjeta sin logros desbloqueados', () => {
    renderTarjetaProgresoInicio();
    const panel = document.getElementById('panel-progreso-inicio');
    expect(panel.hidden).toBe(true);
  });

  test('muestra nivel, último logro y próximo objetivo', () => {
    S.logros = ['primer-paso', 'primer-gasto'];
    renderTarjetaProgresoInicio();
    const panel = document.getElementById('panel-progreso-inicio');
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toContain('Tu progreso');
    expect(panel.textContent).toContain(`${2} de ${LOGROS.length} logros`);
    // Último logro persistido: el último id de S.logros.
    expect(panel.textContent).toContain('Registraste tu primer gasto.');
    // Próximo objetivo: primer pendiente en orden de vitrina.
    expect(panel.querySelectorAll('.logro-item')).toHaveLength(2);
  });

  test('sin objetivo pendiente (catálogo completo) no rompe', () => {
    S.logros = LOGROS.map(l => l.id);
    expect(() => renderTarjetaProgresoInicio()).not.toThrow();
    const panel = document.getElementById('panel-progreso-inicio');
    expect(panel.querySelectorAll('.logro-item')).toHaveLength(1);
  });

  test('no-op si el contenedor no existe', () => {
    document.body.innerHTML = '';
    expect(() => renderTarjetaProgresoInicio()).not.toThrow();
  });
});

// ── mesCompleto() (LG.2c, ADR 032 D3) ─────────────────────────────

describe('mesCompleto()', () => {
  test('true con gasto en 3 semanas distintas del mes', () => {
    const gastos = [
      { fecha: '2026-06-03', monto: 1 }, // bloque 1 (días 1-7)
      { fecha: '2026-06-10', monto: 1 }, // bloque 2 (días 8-14)
      { fecha: '2026-06-17', monto: 1 }, // bloque 3 (días 15-21)
    ];
    expect(mesCompleto(gastos, '2026-06')).toBe(true);
  });

  test('false con gasto en solo 2 semanas', () => {
    const gastos = [
      { fecha: '2026-06-03', monto: 1 },
      { fecha: '2026-06-10', monto: 1 },
    ];
    expect(mesCompleto(gastos, '2026-06')).toBe(false);
  });

  test('varios gastos en la misma semana cuentan como una sola', () => {
    const gastos = [
      { fecha: '2026-06-01', monto: 1 },
      { fecha: '2026-06-02', monto: 1 },
      { fecha: '2026-06-03', monto: 1 },
    ];
    expect(mesCompleto(gastos, '2026-06')).toBe(false);
  });

  test('el bloque final corto (días 29-31) cuenta como semana propia', () => {
    const gastos = [
      { fecha: '2026-01-03', monto: 1 }, // bloque 1
      { fecha: '2026-01-10', monto: 1 }, // bloque 2
      { fecha: '2026-01-31', monto: 1 }, // bloque 5 (29-31)
    ];
    expect(mesCompleto(gastos, '2026-01')).toBe(true);
  });

  test('ignora gastos de otros meses', () => {
    const gastos = [
      { fecha: '2026-05-03', monto: 1 },
      { fecha: '2026-05-10', monto: 1 },
      { fecha: '2026-05-17', monto: 1 },
    ];
    expect(mesCompleto(gastos, '2026-06')).toBe(false);
  });

  test('acepta un ISO completo como mesISO y usa solo el prefijo', () => {
    const gastos = [
      { fecha: '2026-06-03', monto: 1 },
      { fecha: '2026-06-10', monto: 1 },
      { fecha: '2026-06-17', monto: 1 },
    ];
    expect(mesCompleto(gastos, '2026-06-15')).toBe(true);
  });

  test('false con lista vacía, nula o mesISO inválido', () => {
    expect(mesCompleto([], '2026-06')).toBe(false);
    expect(mesCompleto(undefined, '2026-06')).toBe(false);
    expect(mesCompleto([{ fecha: '2026-06-03' }], '')).toBe(false);
    expect(mesCompleto([{ fecha: '2026-06-03' }], undefined)).toBe(false);
  });
});

// ── rachaMesesCompletos() (LG.2c, ADR 032 D3) ─────────────────────

describe('rachaMesesCompletos()', () => {
  /** 3 gastos en 3 semanas distintas del mes `mesISO` ('YYYY-MM'). */
  const mesCompletoFixture = (mesISO) => ([
    { fecha: `${mesISO}-03`, monto: 1 },
    { fecha: `${mesISO}-10`, monto: 1 },
    { fecha: `${mesISO}-17`, monto: 1 },
  ]);

  test('cuenta 3 meses completos consecutivos y corta en el primero incompleto', () => {
    const gastos = [
      ...mesCompletoFixture('2026-05'),
      ...mesCompletoFixture('2026-04'),
      ...mesCompletoFixture('2026-03'),
      { fecha: '2026-02-03', monto: 1 }, // solo 1 semana: rompe la racha
    ];
    expect(rachaMesesCompletos(gastos, '2026-06-15')).toBe(3);
  });

  test('el mes en curso nunca cuenta, aunque sea completo', () => {
    const gastos = [
      ...mesCompletoFixture('2026-06'), // mes en curso: no cuenta
      ...mesCompletoFixture('2026-05'),
    ];
    expect(rachaMesesCompletos(gastos, '2026-06-15')).toBe(1);
  });

  test('0 si el mes anterior no fue completo', () => {
    const gastos = mesCompletoFixture('2026-04'); // no es el mes anterior a junio
    expect(rachaMesesCompletos(gastos, '2026-06-15')).toBe(0);
  });

  test('la racha cruza el cambio de año sin romperse', () => {
    const gastos = [
      ...mesCompletoFixture('2025-12'),
      ...mesCompletoFixture('2025-11'),
    ];
    expect(rachaMesesCompletos(gastos, '2026-01-15')).toBe(2);
  });

  test('0 con lista vacía o hoyISO inválido', () => {
    expect(rachaMesesCompletos([], '2026-06-15')).toBe(0);
    expect(rachaMesesCompletos(mesCompletoFixture('2026-05'), '')).toBe(0);
    expect(rachaMesesCompletos(mesCompletoFixture('2026-05'), undefined)).toBe(0);
  });
});

// ── deudasSaldadas() (LG.2c, ADR 032 D4) ──────────────────────────

describe('deudasSaldadas()', () => {
  test('cuenta deudas de entidad y personales con saldoTotal 0', () => {
    const compromisos = [
      { tipo: 'deuda-entidad', saldoTotal: 0 },
      { tipo: 'deuda-personal', saldoTotal: 0 },
      { tipo: 'deuda-entidad', saldoTotal: 50000 },
    ];
    expect(deudasSaldadas(compromisos)).toBe(2);
  });

  test('ignora compromisos que no son deuda (fijo)', () => {
    const compromisos = [{ tipo: 'fijo', saldoTotal: 0 }];
    expect(deudasSaldadas(compromisos)).toBe(0);
  });

  test('excluye deudas consolidadas: activo:false pero saldoTotal > 0 (se transformó, no se pagó)', () => {
    const compromisos = [{ tipo: 'deuda-entidad', saldoTotal: 300000, activo: false }];
    expect(deudasSaldadas(compromisos)).toBe(0);
  });

  test('una deuda archivada DESPUÉS de llegar a 0 sigue contando: sí se pagó', () => {
    const compromisos = [{ tipo: 'deuda-entidad', saldoTotal: 0, activo: false }];
    expect(deudasSaldadas(compromisos)).toBe(1);
  });

  test('0 con lista vacía o no array', () => {
    expect(deudasSaldadas([])).toBe(0);
    expect(deudasSaldadas(undefined)).toBe(0);
    expect(deudasSaldadas(null)).toBe(0);
  });
});

// ── Catálogo v2: familia "registro" niveles 3-6 (LG.2c, integración) ──

describe('evaluarLogros() - familia registro, niveles 3-6 (LG.2c)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 2026-06-15
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mesCompletoFixture = (mesISO) => ([
    { fecha: `${mesISO}-03`, monto: 1 },
    { fecha: `${mesISO}-10`, monto: 1 },
    { fecha: `${mesISO}-17`, monto: 1 },
  ]);

  test('mes-completo se desbloquea con 1 mes anterior completo', () => {
    const s = estado({ gastos: mesCompletoFixture('2026-05') });
    expect(evaluarLogros(s)).toContain('mes-completo');
    expect(evaluarLogros(s)).not.toContain('tres-meses-seguidos');
  });

  test('sin ningún mes completo, no desbloquea ni siquiera el nivel 3', () => {
    const s = estado({ gastos: [{ fecha: '2026-05-03', monto: 1 }] });
    expect(evaluarLogros(s)).not.toContain('mes-completo');
  });

  test('tres-meses-seguidos se desbloquea con 3 meses consecutivos completos', () => {
    const s = estado({
      gastos: [
        ...mesCompletoFixture('2026-05'),
        ...mesCompletoFixture('2026-04'),
        ...mesCompletoFixture('2026-03'),
      ],
    });
    const cumplidos = evaluarLogros(s);
    expect(cumplidos).toContain('mes-completo');
    expect(cumplidos).toContain('tres-meses-seguidos');
    expect(cumplidos).not.toContain('seis-meses-seguidos');
  });

  test('doce-meses-seguidos exige los 12 meses completos', () => {
    let gastos = [];
    let anio = 2026, mes = 5; // empieza en mayo (mes anterior a junio)
    for (let i = 0; i < 12; i++) {
      const mesISO = `${anio}-${String(mes).padStart(2, '0')}`;
      gastos = gastos.concat(mesCompletoFixture(mesISO));
      mes -= 1;
      if (mes < 1) { mes = 12; anio -= 1; }
    }
    const s = estado({ gastos });
    const cumplidos = evaluarLogros(s);
    expect(cumplidos).toContain('doce-meses-seguidos');
  });
});

// ── Catálogo v2: familia "deudas" (LG.2c, integración) ────────────

describe('evaluarLogros() - familia deudas (LG.2c)', () => {
  test('primera-deuda-saldada se desbloquea con 1 deuda en saldo 0', () => {
    const s = estado({ compromisos: [{ tipo: 'deuda-entidad', saldoTotal: 0 }] });
    expect(evaluarLogros(s)).toContain('primera-deuda-saldada');
    expect(evaluarLogros(s)).not.toContain('tres-deudas-saldadas');
  });

  test('tres-deudas-saldadas exige 3 deudas en saldo 0', () => {
    const s = estado({
      compromisos: [
        { tipo: 'deuda-entidad', saldoTotal: 0 },
        { tipo: 'deuda-personal', saldoTotal: 0 },
        { tipo: 'deuda-entidad', saldoTotal: 0 },
      ],
    });
    expect(evaluarLogros(s)).toContain('tres-deudas-saldadas');
  });

  test('una deuda consolidada (activo:false, saldo > 0) no cuenta para el logro', () => {
    const s = estado({ compromisos: [{ tipo: 'deuda-entidad', saldoTotal: 200000, activo: false }] });
    expect(evaluarLogros(s)).not.toContain('primera-deuda-saldada');
  });
});

// ── Gasto hormiga (LG.2e, ADR 032 D4) ─────────────────────────────

/** 3 gastos grandes (no hormiga) en 3 semanas distintas: vuelven el mes completo. */
const anclasMesCompleto = (mesISO) => ([
  { fecha: `${mesISO}-03`, monto: 500_000 },
  { fecha: `${mesISO}-10`, monto: 500_000 },
  { fecha: `${mesISO}-17`, monto: 500_000 },
]);

/** `total` COP en gastos hormiga de 10.000 c/u, dentro del mes `mesISO`. */
const hormigasDelMes = (mesISO, total, unitario = 10_000) =>
  Array.from({ length: Math.round(total / unitario) }, (_, i) => ({
    fecha: `${mesISO}-0${(i % 3) + 1}`,
    monto: unitario,
  }));

/** Mes completo de registro con `totalHormiga` COP en gasto hormiga. */
const mesConHormiga = (mesISO, totalHormiga) => ([
  ...anclasMesCompleto(mesISO),
  ...hormigasDelMes(mesISO, totalHormiga),
]);

describe('gastoHormigaMes()', () => {
  test('suma solo las transacciones que no superan el umbral', () => {
    const gastos = [
      { fecha: '2026-05-03', monto: UMBRAL_GASTO_HORMIGA },      // cuenta
      { fecha: '2026-05-04', monto: UMBRAL_GASTO_HORMIGA + 1 },  // no cuenta
      { fecha: '2026-05-05', monto: 5_000 },                     // cuenta
    ];
    expect(gastoHormigaMes(gastos, '2026-05')).toBe(UMBRAL_GASTO_HORMIGA + 5_000);
  });

  test('ignora gastos de otros meses', () => {
    expect(gastoHormigaMes(hormigasDelMes('2026-04', 50_000), '2026-05')).toBe(0);
  });

  test('ignora montos no numéricos, negativos y fechas inválidas', () => {
    const gastos = [
      { fecha: '2026-05-03', monto: 'abc' },
      { fecha: '2026-05-03', monto: -5_000 },
      { fecha: '2026-05', monto: 5_000 },
      { monto: 5_000 },
    ];
    expect(gastoHormigaMes(gastos, '2026-05')).toBe(5_000);
  });

  test('acepta un ISO completo como mesISO y 0 con entradas inválidas', () => {
    const gastos = hormigasDelMes('2026-05', 30_000);
    expect(gastoHormigaMes(gastos, '2026-05-15')).toBe(30_000);
    expect(gastoHormigaMes(gastos, '')).toBe(0);
    expect(gastoHormigaMes(undefined, '2026-05')).toBe(0);
  });
});

describe('hormigaALaRaya()', () => {
  const HOY_ISO = '2026-06-15'; // mes cerrado = 2026-05; previos = 04, 03, 02

  const cuatroMeses = (cerrado, previos) => ([
    ...mesConHormiga('2026-05', cerrado),
    ...mesConHormiga('2026-04', previos),
    ...mesConHormiga('2026-03', previos),
    ...mesConHormiga('2026-02', previos),
  ]);

  test('true cuando el mes cerrado baja del promedio de los 3 anteriores', () => {
    expect(hormigaALaRaya(cuatroMeses(120_000, 200_000), HOY_ISO)).toBe(true);
  });

  test('false cuando el mes cerrado iguala o supera el promedio', () => {
    expect(hormigaALaRaya(cuatroMeses(200_000, 200_000), HOY_ISO)).toBe(false);
    expect(hormigaALaRaya(cuatroMeses(250_000, 200_000), HOY_ISO)).toBe(false);
  });

  test('guardia D2.3: false si alguno de los 4 meses no es mes completo', () => {
    const gastos = [
      ...mesConHormiga('2026-05', 120_000),
      ...mesConHormiga('2026-04', 200_000),
      ...hormigasDelMes('2026-03', 200_000), // sin anclas: solo 1 semana
      ...mesConHormiga('2026-02', 200_000),
    ];
    expect(hormigaALaRaya(gastos, HOY_ISO)).toBe(false);
  });

  test('no premia bajadas irrelevantes: promedio previo bajo el piso', () => {
    const bajoElPiso = UMBRAL_HORMIGA_RELEVANTE - 40_000;
    expect(hormigaALaRaya(cuatroMeses(10_000, bajoElPiso), HOY_ISO)).toBe(false);
  });

  test('el mes en curso no participa: su gasto hormiga no rompe el logro', () => {
    const gastos = [
      ...mesConHormiga('2026-06', 900_000), // mes en curso
      ...cuatroMeses(120_000, 200_000),
    ];
    expect(hormigaALaRaya(gastos, HOY_ISO)).toBe(true);
  });

  test('false si falta historial: solo 2 meses completos', () => {
    const gastos = [
      ...mesConHormiga('2026-05', 120_000),
      ...mesConHormiga('2026-04', 200_000),
    ];
    expect(hormigaALaRaya(gastos, HOY_ISO)).toBe(false);
  });

  test('la comparación cruza el cambio de año', () => {
    const gastos = [
      ...mesConHormiga('2025-12', 120_000),
      ...mesConHormiga('2025-11', 200_000),
      ...mesConHormiga('2025-10', 200_000),
      ...mesConHormiga('2025-09', 200_000),
    ];
    expect(hormigaALaRaya(gastos, '2026-01-10')).toBe(true);
  });

  test('false con lista vacía o hoyISO inválido', () => {
    expect(hormigaALaRaya([], HOY_ISO)).toBe(false);
    expect(hormigaALaRaya(cuatroMeses(120_000, 200_000), '')).toBe(false);
    expect(hormigaALaRaya(cuatroMeses(120_000, 200_000), undefined)).toBe(false);
  });
});

// ── Catálogo v2: familia "comportamiento" (LG.2e, integración) ────

describe('evaluarLogros() - familia comportamiento (LG.2e)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 2026-06-15
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('hormiga-a-raya se desbloquea con 4 meses completos y bajada real', () => {
    const s = estado({
      gastos: [
        ...mesConHormiga('2026-05', 120_000),
        ...mesConHormiga('2026-04', 200_000),
        ...mesConHormiga('2026-03', 200_000),
        ...mesConHormiga('2026-02', 200_000),
      ],
    });
    expect(evaluarLogros(s)).toContain('hormiga-a-raya');
  });

  test('no se desbloquea dejando de registrar el mes cerrado', () => {
    const s = estado({
      gastos: [
        ...hormigasDelMes('2026-05', 10_000), // 1 sola semana: mes incompleto
        ...mesConHormiga('2026-04', 200_000),
        ...mesConHormiga('2026-03', 200_000),
        ...mesConHormiga('2026-02', 200_000),
      ],
    });
    expect(evaluarLogros(s)).not.toContain('hormiga-a-raya');
  });

  test('la familia comportamiento colapsa a una tarjeta en la vitrina', () => {
    const items = agruparVitrina(estadoLogros(estado(), []));
    const fam = items.find(i => i.tipo === 'familia' && i.familia === 'comportamiento');
    expect(fam.nombre).toBe(FAMILIAS.comportamiento.nombre);
    expect(fam.totalNiveles).toBe(1);
    expect(fam.siguiente.id).toBe('hormiga-a-raya');
  });
});
