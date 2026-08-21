import { describe, it, expect, beforeEach } from 'vitest';
import {
  metasActivas,
  metasCumplidas,
  calcularProgreso,
  ordenarMetasPorPlazo,
  resumenMetas,
  consecuenciaDeAporte,
  calcularAhorroPorPeriodo,
  frecuenciaPrincipalIngresos,
  etiquetaPeriodoAhorro,
  validarMeta,
  validarAbono,
  normalizarMeta,
  generarPlanAportes,
} from '../../modules/dominio/metas/logic.js';
import { renderFormAbonoMeta, renderFormMeta, renderListaMetas } from '../../modules/dominio/metas/view.js';
import { CATEGORIAS_META_USUARIO } from '../../modules/core/constants.js';
import { SILUETAS } from '../../modules/infra/svg.js';
import { S } from '../../modules/core/state.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const metaBase = (overrides = {}) => ({
  id: 'm1',
  nombre: 'Fondo de emergencia',
  montoObjetivo: 5_000_000,
  montoActual:   1_000_000,
  fechaLimite:   null,
  icono:         '🛡️',
  completada:    false,
  ...overrides,
});

const datosFormValidos = {
  nombre:        'Viaje a Cartagena',
  montoObjetivo: '2000000',
  fechaLimite:   '',
  icono:         '✈️',
};

/**
 * Fecha `YYYY-MM-DD` a N días desde hoy, en hora local (no UTC).
 * `toISOString()` puede desplazar un día en zonas UTC-negativas (Colombia)
 * según la hora en que corra el test; este helper evita ese off-by-one,
 * igual que `hoyLocal()` en los E2E.
 */
function isoEnDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ── metasActivas() ────────────────────────────────────────────────

describe('metasActivas()', () => {
  it('devuelve todas cuando ninguna está completada', () => {
    const metas = [metaBase(), metaBase({ id: 'm2', nombre: 'Vacaciones' })];
    expect(metasActivas(metas)).toHaveLength(2);
  });

  it('excluye metas con completada === true', () => {
    const metas = [metaBase(), metaBase({ id: 'm2', completada: true })];
    expect(metasActivas(metas)).toHaveLength(1);
    expect(metasActivas(metas)[0].id).toBe('m1');
  });

  it('incluye metas sin campo completada (undefined ≠ true)', () => {
    const { completada: _, ...sinCompletada } = metaBase();
    expect(metasActivas([sinCompletada])).toHaveLength(1);
  });

  it('devuelve array vacío si no hay metas', () => {
    expect(metasActivas([])).toEqual([]);
  });
});

// ── metasCumplidas() (DIS.13, MT.d) ───────────────────────────────

describe('metasCumplidas()', () => {
  it('devuelve solo las marcadas como completadas', () => {
    const metas = [metaBase(), metaBase({ id: 'm2', completada: true })];
    expect(metasCumplidas(metas)).toHaveLength(1);
    expect(metasCumplidas(metas)[0].id).toBe('m2');
  });

  it('excluye las metas sin campo completada (undefined ≠ true)', () => {
    const { completada: _, ...sinCompletada } = metaBase();
    expect(metasCumplidas([sinCompletada])).toEqual([]);
  });

  it('junto con metasActivas() reparte todas las metas sin dejar ninguna fuera', () => {
    const metas = [metaBase(), metaBase({ id: 'm2', completada: true }), metaBase({ id: 'm3' })];
    expect(metasActivas(metas).length + metasCumplidas(metas).length).toBe(metas.length);
  });

  it('devuelve array vacío si no hay metas', () => {
    expect(metasCumplidas([])).toEqual([]);
  });
});

// ── calcularProgreso() ────────────────────────────────────────────

describe('calcularProgreso()', () => {
  it('calcula porcentaje correctamente (20%)', () => {
    const meta = metaBase({ montoActual: 1_000_000, montoObjetivo: 5_000_000 });
    expect(calcularProgreso(meta).porcentaje).toBe(20);
  });

  it('devuelve completada: true cuando alcanza el 100%', () => {
    const meta = metaBase({ montoActual: 5_000_000, montoObjetivo: 5_000_000 });
    const { completada, porcentaje, faltante } = calcularProgreso(meta);
    expect(completada).toBe(true);
    expect(porcentaje).toBe(100);
    expect(faltante).toBe(0);
  });

  it('no supera 100% aunque montoActual > montoObjetivo', () => {
    const meta = metaBase({ montoActual: 6_000_000, montoObjetivo: 5_000_000 });
    expect(calcularProgreso(meta).porcentaje).toBe(100);
    expect(calcularProgreso(meta).faltante).toBe(0);
  });

  it('faltante es objetivo − actual cuando incompleto', () => {
    const meta = metaBase({ montoActual: 2_000_000, montoObjetivo: 5_000_000 });
    expect(calcularProgreso(meta).faltante).toBe(3_000_000);
  });

  it('devuelve 0 porcentaje y 0 faltante cuando montoObjetivo es 0', () => {
    const meta = metaBase({ montoObjetivo: 0 });
    const result = calcularProgreso(meta);
    expect(result.porcentaje).toBe(0);
    expect(result.faltante).toBe(0);
    expect(result.completada).toBe(false);
  });

  it('trata montoActual undefined como 0', () => {
    const { montoActual: _, ...sinActual } = metaBase();
    expect(calcularProgreso(sinActual).porcentaje).toBe(0);
  });

  it('redondea al entero más cercano', () => {
    const meta = metaBase({ montoActual: 1_000_000, montoObjetivo: 3_000_000 });
    expect(calcularProgreso(meta).porcentaje).toBe(33);
  });
});

// ── ordenarMetasPorPlazo() (ficha 09, hallazgo G1) ───────────────

describe('ordenarMetasPorPlazo()', () => {
  it('ordena las metas con plazo por la fecha que vence primero', () => {
    const metas = [
      metaBase({ id: 'viaje',  fechaLimite: '2026-12-15' }),
      metaBase({ id: 'laptop', fechaLimite: '2026-09-30' }),
      metaBase({ id: 'moto',   fechaLimite: '2026-10-05' }),
    ];
    expect(ordenarMetasPorPlazo(metas).conPlazo.map(m => m.id))
      .toEqual(['laptop', 'moto', 'viaje']);
  });

  it('manda las metas sin fecha a su propio grupo, no al de plazo', () => {
    const metas = [
      metaBase({ id: 'curso',  fechaLimite: null }),
      metaBase({ id: 'laptop', fechaLimite: '2026-09-30' }),
    ];
    const { conPlazo, sinPlazo } = ordenarMetasPorPlazo(metas);
    expect(conPlazo.map(m => m.id)).toEqual(['laptop']);
    expect(sinPlazo.map(m => m.id)).toEqual(['curso']);
  });

  it('una fechaLimite ilegible cuenta como sin plazo', () => {
    const metas = [
      metaBase({ id: 'vacia',  fechaLimite: '' }),
      metaBase({ id: 'basura', fechaLimite: '30/09/2026' }),
      metaBase({ id: 'buena',  fechaLimite: '2026-09-30' }),
    ];
    const { conPlazo, sinPlazo } = ordenarMetasPorPlazo(metas);
    expect(conPlazo.map(m => m.id)).toEqual(['buena']);
    expect(sinPlazo.map(m => m.id)).toEqual(['vacia', 'basura']);
  });

  it('deja fuera las metas cumplidas: los dos grupos son de activas', () => {
    const metas = [
      metaBase({ id: 'cumplida', fechaLimite: '2026-01-01', completada: true }),
      metaBase({ id: 'activa',   fechaLimite: '2026-09-30' }),
      metaBase({ id: 'sinfecha', fechaLimite: null, completada: true }),
    ];
    const { conPlazo, sinPlazo } = ordenarMetasPorPlazo(metas);
    expect(conPlazo.map(m => m.id)).toEqual(['activa']);
    expect(sinPlazo).toEqual([]);
  });

  it('el empate de fecha conserva el orden de llegada', () => {
    const metas = [
      metaBase({ id: 'primera', fechaLimite: '2026-09-30' }),
      metaBase({ id: 'segunda', fechaLimite: '2026-09-30' }),
    ];
    expect(ordenarMetasPorPlazo(metas).conPlazo.map(m => m.id))
      .toEqual(['primera', 'segunda']);
  });

  it('no muta la lista que recibe', () => {
    const metas = [
      metaBase({ id: 'viaje',  fechaLimite: '2026-12-15' }),
      metaBase({ id: 'laptop', fechaLimite: '2026-09-30' }),
    ];
    ordenarMetasPorPlazo(metas);
    expect(metas.map(m => m.id)).toEqual(['viaje', 'laptop']);
  });

  it('devuelve los dos grupos vacíos sin lista', () => {
    expect(ordenarMetasPorPlazo(undefined)).toEqual({ conPlazo: [], sinPlazo: [] });
    expect(ordenarMetasPorPlazo([])).toEqual({ conPlazo: [], sinPlazo: [] });
  });
});

// ── resumenMetas() (ficha 09, hallazgo G2) ───────────────────────

describe('resumenMetas()', () => {
  it('suma lo reunido y lo que falta de las metas activas', () => {
    const metas = [
      metaBase({ id: 'a', montoActual: 1_200_000, montoObjetivo: 3_500_000 }),
      metaBase({ id: 'b', montoActual: 3_780_000, montoObjetivo: 4_200_000 }),
    ];
    const { reunido, faltante, objetivo } = resumenMetas(metas);
    expect(reunido).toBe(4_980_000);
    expect(faltante).toBe(2_720_000);
    expect(objetivo).toBe(7_700_000);
  });

  it('cuenta cuántas metas están en curso', () => {
    const metas = [
      metaBase({ id: 'a' }),
      metaBase({ id: 'b' }),
      metaBase({ id: 'c', completada: true }),
    ];
    expect(resumenMetas(metas).enCurso).toBe(2);
  });

  it('ignora las cumplidas en las tres cifras', () => {
    const metas = [
      metaBase({ id: 'activa',   montoActual: 1_000_000, montoObjetivo: 4_000_000 }),
      metaBase({ id: 'cumplida', montoActual: 9_000_000, montoObjetivo: 9_000_000, completada: true }),
    ];
    const { reunido, faltante, objetivo } = resumenMetas(metas);
    expect(reunido).toBe(1_000_000);
    expect(faltante).toBe(3_000_000);
    expect(objetivo).toBe(4_000_000);
  });

  it('calcula el porcentaje sobre el objetivo agregado', () => {
    const metas = [
      metaBase({ id: 'a', montoActual: 1_000_000, montoObjetivo: 2_000_000 }),
      metaBase({ id: 'b', montoActual:   500_000, montoObjetivo: 2_000_000 }),
    ];
    expect(resumenMetas(metas).porcentaje).toBe(38);
  });

  it('una meta sobrefinanciada no empuja el porcentaje sobre 100', () => {
    const metas = [metaBase({ montoActual: 6_000_000, montoObjetivo: 5_000_000 })];
    const { porcentaje, faltante } = resumenMetas(metas);
    expect(porcentaje).toBe(100);
    expect(faltante).toBe(0);
  });

  it('con objetivo 0 el porcentaje es 0, no NaN', () => {
    const metas = [metaBase({ montoActual: 0, montoObjetivo: 0 })];
    expect(resumenMetas(metas).porcentaje).toBe(0);
  });

  it('trata montoActual ausente como 0', () => {
    const { montoActual: _, ...sinActual } = metaBase({ montoObjetivo: 1_000_000 });
    expect(resumenMetas([sinActual]).reunido).toBe(0);
  });

  it('devuelve ceros sin lista', () => {
    expect(resumenMetas(undefined))
      .toEqual({ reunido: 0, faltante: 0, objetivo: 0, porcentaje: 0, enCurso: 0 });
  });
});

// ── consecuenciaDeAporte() (GAS.2c, ADR 062) ─────────────────────

describe('consecuenciaDeAporte()', () => {
  it('meta completada: gana a cuanto falta', () => {
    const r = consecuenciaDeAporte({ completada: true, faltante: 0, ocultarSaldo: false });
    expect(r).toEqual({ texto: 'Meta completada.', tono: 'ok' });
  });

  it('meta incompleta: muestra cuanto falta', () => {
    const r = consecuenciaDeAporte({ completada: false, faltante: 500_000, ocultarSaldo: false });
    expect(r).toEqual({ texto: 'Faltan $500.000 para tu meta.', tono: 'ok' });
  });

  it('ojo de privacidad activo: ninguna cifra, ni completada ni cuanto falta', () => {
    expect(consecuenciaDeAporte({ completada: true, faltante: 0, ocultarSaldo: true })).toBeNull();
    expect(consecuenciaDeAporte({ completada: false, faltante: 500_000, ocultarSaldo: true })).toBeNull();
  });
});

// `diasHastaFecha` salió de este dominio con ARQ.1a: era una función muerta
// (cero llamadores en `modules/`, solo este bloque de tests la mantenía viva) y
// además leía el reloj por dentro, así que no había forma de fijarle un día.
// La única medida de días de una bolsa es la de `infra/bolsas.js`, que recibe
// el día de referencia y la cubre `bolsas.test.js`.

// ── frecuenciaPrincipalIngresos() (MT.4) ──────────────────────────

describe('frecuenciaPrincipalIngresos()', () => {
  const ingreso = (frecuencia, activo = true) => ({
    id: 'i1', descripcion: 'Nómina', monto: 1_000_000, frecuencia, activo, fechaCreacion: '2026-01-01',
  });

  it('sin ingresos devuelve Mensual', () => {
    expect(frecuenciaPrincipalIngresos([])).toBe('Mensual');
    expect(frecuenciaPrincipalIngresos(null)).toBe('Mensual');
  });

  it('un ingreso Quincenal devuelve Quincenal', () => {
    expect(frecuenciaPrincipalIngresos([ingreso('Quincenal')])).toBe('Quincenal');
  });

  it('la frecuencia más común gana', () => {
    const lista = [ingreso('Quincenal'), ingreso('Quincenal'), ingreso('Mensual')];
    expect(frecuenciaPrincipalIngresos(lista)).toBe('Quincenal');
  });

  it('frecuencias no soportadas (Trimestral, Anual) se mapean a Mensual', () => {
    expect(frecuenciaPrincipalIngresos([ingreso('Trimestral')])).toBe('Mensual');
    expect(frecuenciaPrincipalIngresos([ingreso('Anual')])).toBe('Mensual');
  });

  it('los ingresos inactivos no cuentan', () => {
    const lista = [ingreso('Quincenal', false), ingreso('Mensual', true)];
    expect(frecuenciaPrincipalIngresos(lista)).toBe('Mensual');
  });

  it('en empate numérico prefiere la frecuencia más granular', () => {
    const lista = [ingreso('Quincenal'), ingreso('Mensual')];
    expect(frecuenciaPrincipalIngresos(lista)).toBe('Quincenal');
  });
});

// ── etiquetaPeriodoAhorro() (MT.4) ─────────────────────────────────

describe('etiquetaPeriodoAhorro()', () => {
  it('mapea cada frecuencia a su etiqueta', () => {
    expect(etiquetaPeriodoAhorro('Diario')).toBe('por día');
    expect(etiquetaPeriodoAhorro('Semanal')).toBe('por semana');
    expect(etiquetaPeriodoAhorro('Quincenal')).toBe('por quincena');
    expect(etiquetaPeriodoAhorro('Mensual')).toBe('al mes');
  });

  it('una frecuencia desconocida cae a "al mes"', () => {
    expect(etiquetaPeriodoAhorro('Trimestral')).toBe('al mes');
    expect(etiquetaPeriodoAhorro(undefined)).toBe('al mes');
  });
});

// ── calcularAhorroPorPeriodo() (MT.4) ──────────────────────────────

describe('calcularAhorroPorPeriodo()', () => {
  it('devuelve null si la meta ya está completa', () => {
    const meta = metaBase({ montoActual: 5_000_000, montoObjetivo: 5_000_000 });
    expect(calcularAhorroPorPeriodo(meta, 'Mensual')).toBeNull();
  });

  it('devuelve null si no hay fechaLimite', () => {
    const meta = metaBase({ fechaLimite: null });
    expect(calcularAhorroPorPeriodo(meta, 'Mensual')).toBeNull();
  });

  it('devuelve null si la fecha ya venció', () => {
    const meta = metaBase({ fechaLimite: '2020-01-01' });
    expect(calcularAhorroPorPeriodo(meta, 'Mensual')).toBeNull();
  });

  it('con frecuencia Quincenal reparte entre quincenas, no entre días', () => {
    const meta = metaBase({ montoActual: 0, montoObjetivo: 600_000, fechaLimite: isoEnDias(90) });

    const r = calcularAhorroPorPeriodo(meta, 'Quincenal');
    expect(r).not.toBeNull();
    expect(r.frecuencia).toBe('Quincenal');
    expect(r.etiqueta).toBe('por quincena');
    // 90 días / 15 = 6 quincenas.
    expect(r.numPeriodos).toBe(6);
    expect(r.montoPorPeriodo).toBe(Math.ceil(600_000 / 6));
    // El monto acumulado por periodo cubre el faltante.
    expect(r.montoPorPeriodo * r.numPeriodos).toBeGreaterThanOrEqual(600_000);
  });

  it('con frecuencia Semanal reparte entre semanas', () => {
    const meta = metaBase({ montoActual: 0, montoObjetivo: 700_000, fechaLimite: isoEnDias(70) });

    const r = calcularAhorroPorPeriodo(meta, 'Semanal');
    expect(r.frecuencia).toBe('Semanal');
    expect(r.etiqueta).toBe('por semana');
    expect(r.numPeriodos).toBe(10); // 70 / 7
    expect(r.montoPorPeriodo).toBe(Math.ceil(700_000 / 10));
  });

  it('una frecuencia no soportada cae a Mensual (lectura defensiva)', () => {
    const meta = metaBase({ montoActual: 0, montoObjetivo: 300_000, fechaLimite: isoEnDias(90) });
    const r = calcularAhorroPorPeriodo(meta, 'Trimestral');
    expect(r.frecuencia).toBe('Mensual');
  });

  it('descuenta lo ya ahorrado del faltante', () => {
    const meta = metaBase({ montoActual: 400_000, montoObjetivo: 1_000_000, fechaLimite: isoEnDias(100) });
    const r = calcularAhorroPorPeriodo(meta, 'Mensual');
    expect(r.montoPorPeriodo * r.numPeriodos).toBeGreaterThanOrEqual(600_000);
  });

  it('garantiza al menos 1 periodo cuando la fecha es muy cercana', () => {
    const meta = metaBase({ montoActual: 0, montoObjetivo: 100_000, fechaLimite: isoEnDias(1) });
    const r = calcularAhorroPorPeriodo(meta, 'Mensual');
    expect(r.numPeriodos).toBeGreaterThanOrEqual(1);
  });
});

// ── generarPlanAportes() (MT.6c, ADR 048 D3) ──────────────────────

describe('generarPlanAportes()', () => {
  const ingreso = (overrides = {}) => ({
    id: 'i1', descripcion: 'Nómina', monto: 3_000_000, frecuencia: 'Mensual',
    diaPago: 20, activo: true, fechaCreacion: '2026-01-01', ...overrides,
  });

  it('sin fechaLimite, no hay plan', () => {
    const meta = metaBase({ fechaLimite: null });
    expect(generarPlanAportes(meta, [ingreso()], '2026-07-14')).toEqual([]);
  });

  it('meta ya cumplida, no hay plan', () => {
    const meta = metaBase({ montoActual: 5_000_000, montoObjetivo: 5_000_000, fechaLimite: isoEnDias(90), completada: true });
    expect(generarPlanAportes(meta, [ingreso()], '2026-07-14')).toEqual([]);
  });

  it('sin faltante, no hay plan aunque haya fechaLimite', () => {
    const meta = metaBase({ montoActual: 5_000_000, montoObjetivo: 5_000_000, fechaLimite: isoEnDias(90) });
    expect(generarPlanAportes(meta, [ingreso()], '2026-07-14')).toEqual([]);
  });

  it('con un ingreso mensual con día de pago, ancla el plan a esas fechas reales', () => {
    const meta = metaBase({ montoActual: 0, montoObjetivo: 300_000, fechaLimite: '2026-10-20' });
    const plan = generarPlanAportes(meta, [ingreso()], '2026-07-14');
    expect(plan.map(a => a.fecha)).toEqual(['2026-07-20', '2026-08-20', '2026-09-20', '2026-10-20']);
    expect(plan.every(a => a.monto === Math.ceil(300_000 / 4))).toBe(true);
  });

  it('la suma de montos del plan cubre el faltante', () => {
    const meta = metaBase({ montoActual: 0, montoObjetivo: 310_000, fechaLimite: '2026-10-20' });
    const plan = generarPlanAportes(meta, [ingreso()], '2026-07-14');
    expect(plan.reduce((acc, a) => acc + a.monto, 0)).toBeGreaterThanOrEqual(310_000);
  });

  it('entre dos ingresos de distinta frecuencia (1 a 1), la más granular gana y su día de pago ancla el plan', () => {
    const meta = metaBase({ montoActual: 0, montoObjetivo: 300_000, fechaLimite: '2026-10-15' });
    const plan = generarPlanAportes(meta, [
      ingreso({ id: 'i1', monto: 500_000, frecuencia: 'Quincenal', diaPago: 1 }),
      ingreso({ id: 'i2', monto: 3_000_000, frecuencia: 'Mensual', diaPago: 20 }),
    ], '2026-07-14');
    // Empate 1 a 1: gana Quincenal (más granular, mismo criterio de
    // frecuenciaPrincipalIngresos), así que ancla en el día de pago de i1 (1),
    // no en el mayor monto de i2. Primera fecha: día 1 de julio ya pasó
    // (hoy es el 14), la siguiente ocurrencia quincenal es el 16.
    expect(plan[0].fecha).toBe('2026-07-16');
    expect(plan.every(a => a.fecha.endsWith('-01') || a.fecha.endsWith('-16'))).toBe(true);
  });

  it('sin ingresos activos, cae a Mensual sin día de pago (fechas espaciadas)', () => {
    const meta = metaBase({ montoActual: 0, montoObjetivo: 100_000, fechaLimite: isoEnDias(60) });
    const plan = generarPlanAportes(meta, [], '2026-07-14');
    expect(plan.length).toBeGreaterThan(0);
  });

  it('ignora los ingresos inactivos al elegir el ancla del plan', () => {
    const meta = metaBase({ montoActual: 0, montoObjetivo: 300_000, fechaLimite: '2026-10-20' });
    const plan = generarPlanAportes(meta, [
      ingreso({ id: 'i1', monto: 10_000_000, diaPago: 1, activo: false }),
      ingreso({ id: 'i2', monto: 3_000_000, diaPago: 20, activo: true }),
    ], '2026-07-14');
    expect(plan.every(a => a.fecha.endsWith('-20'))).toBe(true);
  });
});

// ── validarMeta() ─────────────────────────────────────────────────

describe('validarMeta()', () => {
  it('retorna array vacío con datos válidos', () => {
    expect(validarMeta(datosFormValidos)).toEqual([]);
  });

  it('reporta error si nombre está vacío', () => {
    const errores = validarMeta({ ...datosFormValidos, nombre: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/nombre/i);
  });

  it('reporta error si nombre es solo espacios', () => {
    const errores = validarMeta({ ...datosFormValidos, nombre: '   ' });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('reporta error si montoObjetivo es 0', () => {
    const errores = validarMeta({ ...datosFormValidos, montoObjetivo: '0' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/monto/i);
  });

  it('reporta error si montoObjetivo es negativo', () => {
    const errores = validarMeta({ ...datosFormValidos, montoObjetivo: '-500' });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('reporta error si montoObjetivo no es número', () => {
    const errores = validarMeta({ ...datosFormValidos, montoObjetivo: 'mucho' });
    expect(errores).toHaveLength(1);
  });

  it('acepta fechaLimite vacío (campo opcional)', () => {
    expect(validarMeta({ ...datosFormValidos, fechaLimite: '' })).toEqual([]);
  });

  it('puede tener múltiples errores a la vez', () => {
    const errores = validarMeta({ nombre: '', montoObjetivo: '0' });
    expect(errores.length).toBeGreaterThanOrEqual(2);
  });
});

// ── validarAbono() ────────────────────────────────────────────────

describe('validarAbono()', () => {
  it('retorna array vacío con monto válido', () => {
    expect(validarAbono('100000')).toEqual([]);
  });

  it('reporta error si el monto es 0', () => {
    expect(validarAbono('0').length).toBeGreaterThan(0);
  });

  it('reporta error si el monto es negativo', () => {
    expect(validarAbono('-1000').length).toBeGreaterThan(0);
  });

  it('reporta error si el monto no es número', () => {
    expect(validarAbono('nada').length).toBeGreaterThan(0);
  });
});

// ── normalizarMeta() ──────────────────────────────────────────────

describe('normalizarMeta()', () => {
  it('convierte montoObjetivo string a número', () => {
    const result = normalizarMeta(datosFormValidos);
    expect(typeof result.montoObjetivo).toBe('number');
    expect(result.montoObjetivo).toBe(2_000_000);
  });

  it('inicia montoActual en 0', () => {
    expect(normalizarMeta(datosFormValidos).montoActual).toBe(0);
  });

  it('recorta espacios del nombre', () => {
    const result = normalizarMeta({ ...datosFormValidos, nombre: '  Viaje  ' });
    expect(result.nombre).toBe('Viaje');
  });

  it('marca completada en false', () => {
    expect(normalizarMeta(datosFormValidos).completada).toBe(false);
  });

  it('ID.3: sin emoji del usuario, icono queda null (nada que almacenar)', () => {
    const result = normalizarMeta({ ...datosFormValidos, icono: '' });
    expect(result.icono).toBeNull();
  });

  it('preserva el icono si se proporciona', () => {
    expect(normalizarMeta(datosFormValidos).icono).toBe('✈️');
  });

  it('fechaLimite vacía queda como null', () => {
    const result = normalizarMeta({ ...datosFormValidos, fechaLimite: '' });
    expect(result.fechaLimite).toBeNull();
  });

  it('fechaLimite con fecha queda como string', () => {
    const result = normalizarMeta({ ...datosFormValidos, fechaLimite: '2026-12-31' });
    expect(result.fechaLimite).toBe('2026-12-31');
  });

  it('no incluye id (lo asigna crud.js)', () => {
    expect(normalizarMeta(datosFormValidos)).not.toHaveProperty('id');
  });
});

// ── normalizarMeta() - categoría (MT.1) ───────────────────────────

describe('normalizarMeta() - categoría', () => {
  it('categoria vacía o ausente queda como null', () => {
    expect(normalizarMeta(datosFormValidos).categoria).toBeNull();
    expect(normalizarMeta({ ...datosFormValidos, categoria: '' }).categoria).toBeNull();
  });

  it('preserva la categoria elegida', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: 'Boda', icono: '' });
    expect(result.categoria).toBe('Boda');
  });

  it('ID.3: sin emoji explícito no almacena ícono (la vista lo resuelve desde la categoría)', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: 'Boda', icono: '' });
    expect(result.icono).toBeNull();
  });

  it('un emoji explícito se conserva como dato del usuario', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: 'Otra', icono: '🎉' });
    expect(result.icono).toBe('🎉');
  });

  it('sin categoria ni emoji, icono queda null (la vista cae a la diana i-metas)', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: '', icono: '' });
    expect(result.icono).toBeNull();
  });
});

// ── normalizarMeta() - subcategoriaId (MT.6b, ADR 048 D1 / ADR 064) ──

describe('normalizarMeta() - subcategoriaId', () => {
  it('sin subcategoriaId enviado, queda null', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: 'Vehículo' });
    expect(result.subcategoriaId).toBeNull();
  });

  it('con subcategoriaId hija de la categoría enviada, se guarda', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: 'Vehículo', subcategoriaId: 'vehiculo-moto' });
    expect(result.subcategoriaId).toBe('vehiculo-moto');
  });

  it('un subcategoriaId que no es hija de la categoría enviada se descarta (riesgo de padre huérfano)', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: 'Educación', subcategoriaId: 'vehiculo-moto' });
    expect(result.subcategoriaId).toBeNull();
  });

  it('sin categoría, cualquier subcategoriaId enviado se descarta', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: '', subcategoriaId: 'vehiculo-moto' });
    expect(result.subcategoriaId).toBeNull();
  });

  it('categoría "Otra" (sin hijos en el catálogo) descarta cualquier subcategoriaId', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: 'Otra', subcategoriaId: 'vehiculo-moto' });
    expect(result.subcategoriaId).toBeNull();
  });
});

// ── renderFormMeta() - chips de categoría (MT.1, MT.6b) ───────────

describe('renderFormMeta() - chips de categoría', () => {
  it('incluye radios con name="categoria" dentro del grupo de chips', () => {
    const html = renderFormMeta();
    expect(html).toContain('id="meta-categoria-chips"');
    expect(html).toContain('name="categoria"');
  });

  it('el chip "Sin categoría" tiene value vacío y viene marcado por defecto', () => {
    const html = renderFormMeta();
    expect(html).toMatch(/value=""[^>]*checked/);
    expect(html).toContain('>Sin categoría<');
  });

  it('lista todas las CATEGORIAS_META_USUARIO como chips', () => {
    const html = renderFormMeta();
    for (const cat of CATEGORIAS_META_USUARIO) {
      expect(html).toContain(`value="${cat}"`);
      expect(html).toContain(`>${cat}<`);
    }
  });

  it('CAT.1c: no ofrece Cumpleaños ni Vacaciones en una meta nueva', () => {
    const html = renderFormMeta();
    expect(html).not.toContain('>Cumpleaños<');
    expect(html).not.toContain('>Vacaciones<');
    expect(html).toContain('>Viajes<');
  });

  it('CAT.1c: al editar una meta con categoría retirada, la conserva marcada', () => {
    const html = renderFormMeta(metaBase({ categoria: 'Vacaciones' }));
    expect(html).toMatch(/value="Vacaciones"[^>]*checked/);
  });

  it('CAT.1c: la categoría retirada no se duplica ni desordena el catálogo vigente', () => {
    const html = renderFormMeta(metaBase({ categoria: 'Cumpleaños' }));
    expect(html.match(/>Cumpleaños</g)).toHaveLength(1);
    expect(html.indexOf('>Viajes<')).toBeLessThan(html.indexOf('>Cumpleaños<'));
  });

  it('ADR 042 D6: ningún select nuevo para elegir categoría', () => {
    const html = renderFormMeta();
    expect(html).not.toContain('<select');
  });

  it('conserva el campo de emoji libre, oculto por defecto (MT.3)', () => {
    const html = renderFormMeta();
    expect(html).toContain('id="meta-icono"');
    expect(html).toContain('name="icono"');
    expect(html).toMatch(/<div class="form-group" id="form-group-meta-icono" hidden>/);
  });

  it('CAT.2b: el campo de ícono usa el selector compacto compartido, no un input de texto libre', () => {
    const html = renderFormMeta();
    expect(html).toContain('data-icono-picker="meta-icono"');
    expect(html).toContain('icono-picker__recuadro');
    expect(html).not.toContain('placeholder="🎯"');
  });
});

// ── renderFormMeta() - chips de subcategoría (MT.6b, ADR 048 D1/ADR 064) ──

describe('renderFormMeta() - chips de subcategoría', () => {
  it('sin meta (categoría "Sin categoría"), todos los grupos de subcategoría vienen ocultos y deshabilitados', () => {
    const html = renderFormMeta();
    expect(html).toContain('name="subcategoriaId"');
    expect(html).toMatch(/data-subcategoria-grupo="Vehículo"[^>]* hidden disabled/);
  });

  it('categoría "Otra" no tiene grupo de subcategoría (no está en SUBCATEGORIAS_META)', () => {
    const html = renderFormMeta(metaBase({ categoria: 'Otra' }));
    expect(html).not.toContain('data-subcategoria-grupo="Otra"');
  });

  it('categoría con hijos (Vehículo): su grupo queda visible y habilitado', () => {
    const html = renderFormMeta(metaBase({ categoria: 'Vehículo' }));
    expect(html).toMatch(/<fieldset class="subcategoria-fieldset" data-subcategoria-grupo="Vehículo">/);
    expect(html).toContain('value="vehiculo-carro"');
    expect(html).toContain('value="vehiculo-moto"');
  });

  it('categoría sin hijos (Boda no tiene, Educación sí): solo el grupo con hijos aparece habilitado', () => {
    const html = renderFormMeta(metaBase({ categoria: 'Educación' }));
    expect(html).toMatch(/data-subcategoria-grupo="Educación">/);
    expect(html).toMatch(/data-subcategoria-grupo="Viajes"[^>]* hidden disabled/);
  });

  it('con subcategoriaId guardado, el chip correspondiente viene checked', () => {
    const html = renderFormMeta(metaBase({ categoria: 'Vehículo', subcategoriaId: 'vehiculo-moto' }));
    expect(html).toMatch(/value="vehiculo-moto"[^>]*checked/);
  });
});

// ── renderListaMetas() - ícono de categoría en la lista (MT.1/ID.3) ──

// DIS.14 (arquitectura A2): el ícono dejó de ir en línea con el nombre y pasó
// al centro del arco (`.meta-card__arco-icono`), donde el progreso lo rodea.
// El nombre vive ahora en `.meta-card__nombre`.

describe('renderListaMetas() - ícono de categoría en la lista', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-metas"></div>';
  });

  it('una meta creada con categoría "Boda" muestra la silueta del anillo en el centro del arco', () => {
    S.metas = [{
      ...normalizarMeta({ ...datosFormValidos, nombre: 'Fiesta de bodas', categoria: 'Boda', icono: '' }),
      id: 'm1',
    }];
    renderListaMetas();
    const glifo = document.querySelector('.meta-card__arco-icono');
    expect(glifo.innerHTML).toContain(SILUETAS.anillo);
    expect(glifo.classList.contains('meta-card__arco-icono--silueta')).toBe(true);
    expect(document.querySelector('.meta-card__nombre').textContent).toContain('Fiesta de bodas');
  });

  it('una meta vieja con categoría y emoji almacenado migra sola a la silueta de su categoría', () => {
    S.metas = [{
      id: 'm1', nombre: 'Viaje a la playa', categoria: 'Viajes', icono: '✈️',
      montoObjetivo: 1_000_000, montoActual: 0, fechaLimite: null, completada: false,
    }];
    renderListaMetas();
    const glifo = document.querySelector('.meta-card__arco-icono');
    expect(glifo.innerHTML).toContain(SILUETAS.avion);
    expect(glifo.textContent).not.toContain('✈️');
  });

  it('el emoji elegido a mano (categoría "Otra") se conserva como dato del usuario', () => {
    S.metas = [{
      ...normalizarMeta({ ...datosFormValidos, nombre: 'Consola retro', categoria: 'Otra', icono: '🕹️' }),
      id: 'm1',
    }];
    renderListaMetas();
    const glifo = document.querySelector('.meta-card__arco-icono');
    expect(glifo.textContent).toContain('🕹️');
    expect(glifo.innerHTML).not.toContain('#c-otros');
  });

  it('categoría "Otra" sin emoji manual cae a la silueta de la caja', () => {
    S.metas = [{
      ...normalizarMeta({ ...datosFormValidos, nombre: 'Lo que sea', categoria: 'Otra', icono: '' }),
      id: 'm1',
    }];
    renderListaMetas();
    expect(document.querySelector('.meta-card__arco-icono').innerHTML).toContain(SILUETAS.caja);
  });

  // DIS.19: la silueta se llena hasta el porcentaje de la meta, y una cumplida
  // se dibuja llena aunque su objetivo haya cambiado despues (el corte del
  // bloque manda, igual que en su arco).
  it('la silueta se llena hasta el porcentaje: el nivel del agua baja al subir el avance', () => {
    S.metas = [{
      ...normalizarMeta({ ...datosFormValidos, nombre: 'Viaje', categoria: 'Viajes', icono: '' }),
      id: 'm1', montoObjetivo: 1_000_000, montoActual: 250_000,
    }];
    renderListaMetas();
    const agua = document.querySelector('.silueta__llena');
    // 25%: el nivel arranca en y = 18 de 24 y el agua mide 6.
    expect(agua.getAttribute('y')).toBe('18');
    expect(agua.getAttribute('height')).toBe('6');
  });

  it('una meta en cero no dibuja agua, solo la silueta vacia', () => {
    S.metas = [{
      ...normalizarMeta({ ...datosFormValidos, nombre: 'Viaje', categoria: 'Viajes', icono: '' }),
      id: 'm1', montoObjetivo: 1_000_000, montoActual: 0,
    }];
    renderListaMetas();
    expect(document.querySelector('.silueta__vacia')).not.toBeNull();
    expect(document.querySelector('.silueta__llena')).toBeNull();
  });

  it('cada silueta recorta con su propio clipPath: dos metas no comparten id', () => {
    S.metas = [
      { ...normalizarMeta({ ...datosFormValidos, nombre: 'Viaje', categoria: 'Viajes', icono: '' }), id: 'm1', montoActual: 500_000 },
      { ...normalizarMeta({ ...datosFormValidos, nombre: 'Casa', categoria: 'Vivienda', icono: '' }), id: 'm2', montoActual: 500_000 },
    ];
    renderListaMetas();
    const ids = [...document.querySelectorAll('clipPath')].map(c => c.getAttribute('id'));
    expect(ids).toEqual(['silueta-m1', 'silueta-m2']);
  });

  it('la silueta es decorativa: no repite el porcentaje que ya anuncia el arco', () => {
    S.metas = [{
      ...normalizarMeta({ ...datosFormValidos, nombre: 'Viaje', categoria: 'Viajes', icono: '' }),
      id: 'm1', montoActual: 500_000,
    }];
    renderListaMetas();
    const svg = document.querySelector('.silueta');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
  });

  it('una meta sin categoría ni emoji muestra la diana i-metas', () => {
    S.metas = [{
      ...normalizarMeta({ ...datosFormValidos, nombre: 'Objetivo libre', categoria: '', icono: '' }),
      id: 'm1',
    }];
    renderListaMetas();
    expect(document.querySelector('.meta-card__arco-icono').innerHTML).toContain('#i-metas');
  });

  it('CAT.2b: categoría "Otra" con ícono elegido del picker (id de sprite) renderiza el glifo, no texto crudo', () => {
    S.metas = [{
      ...normalizarMeta({ ...datosFormValidos, nombre: 'Bicicleta', categoria: 'Otra', icono: 'c-carro' }),
      id: 'm1',
    }];
    renderListaMetas();
    const glifo = document.querySelector('.meta-card__arco-icono');
    expect(glifo.innerHTML).toContain('#c-carro');
    expect(glifo.textContent).not.toContain('c-carro');
  });
});

// ── renderListaMetas() - ritmo de ahorro según frecuencia (MT.4) ──
//
// DIS.14 (arquitectura A2): el ritmo de ahorro se cuenta en aportes ("N aportes
// de $X por quincena") y vive entre los datos de la tarjeta, bajo el arco. La
// sugerencia automática deja de ser un dato suelto: es lo que mide un aporte.

/** Texto de las líneas de datos de la primera tarjeta. */
const datosTarjeta = () =>
  [...document.querySelectorAll('.meta-card__dato')].map(p => p.textContent);

describe('renderListaMetas() - ritmo de ahorro según frecuencia', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-metas"></div>';
    S.config = {};
  });

  it('con ingreso Quincenal, la meta muestra el monto "por quincena", no "por día"', () => {
    S.ingresos = [{ id: 'i1', descripcion: 'Nómina', monto: 1_500_000, frecuencia: 'Quincenal', activo: true, fechaCreacion: '2026-01-01' }];
    S.metas = [{
      ...normalizarMeta(datosFormValidos),
      id: 'm1',
      montoObjetivo: 600_000,
      montoActual: 0,
      fechaLimite: isoEnDias(90),
    }];

    renderListaMetas();
    const ritmo = datosTarjeta().find(t => t.includes('aporte'));
    expect(ritmo).toContain('por quincena');
    expect(ritmo).not.toContain('/día');
  });

  it('el plan dice cuántos aportes faltan, no solo cuánto guardar', () => {
    S.ingresos = [{ id: 'i1', descripcion: 'Nómina', monto: 1_500_000, frecuencia: 'Quincenal', activo: true, fechaCreacion: '2026-01-01' }];
    S.metas = [{
      ...normalizarMeta(datosFormValidos),
      id: 'm1',
      montoObjetivo: 600_000,
      montoActual: 0,
      fechaLimite: isoEnDias(90),
    }];

    renderListaMetas();
    expect(datosTarjeta().find(t => t.includes('aporte'))).toMatch(/^\d+ aportes? de /);
  });

  it('sin ingresos registrados, cae a "al mes" (Mensual por defecto)', () => {
    S.ingresos = [];
    S.metas = [{
      ...normalizarMeta(datosFormValidos),
      id: 'm1',
      montoObjetivo: 600_000,
      montoActual: 0,
      fechaLimite: isoEnDias(90),
    }];

    renderListaMetas();
    expect(datosTarjeta().find(t => t.includes('aporte'))).toContain('al mes');
  });

  it('sin fecha límite, no muestra ninguna línea de ritmo de ahorro', () => {
    S.ingresos = [];
    S.metas = [{ ...normalizarMeta(datosFormValidos), id: 'm1', fechaLimite: null }];

    renderListaMetas();
    expect(datosTarjeta().some(t => t.includes('aportes de'))).toBe(false);
  });
});

// ── renderListaMetas() - tarjeta v2, arquitectura A2 (DIS.14) ──────
//
// La meta dejó de ser una fila horizontal y pasó a ser una tarjeta vertical
// con medidor semicircular: el objetivo es el extremo de la escala del arco y
// no un número que compita con lo acumulado, el ícono vive en el centro del
// arco y la acción principal ocupa el ancho completo.

describe('renderListaMetas() - tarjeta de meta (DIS.14)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-metas" class="lista-metas"></div>';
    S.config   = {};
    S.ingresos = [];
    S.metas    = [];
  });

  it('la meta se pinta como .meta-card, no como fila de lista', () => {
    S.metas = [metaBase({ id: 'm1', nombre: 'Viaje', montoActual: 1_200_000, montoObjetivo: 3_500_000 })];
    renderListaMetas();
    expect(document.querySelector('.meta-card')).not.toBeNull();
    expect(document.querySelector('.list-item')).toBeNull();
  });

  it('el acumulado es la cifra grande y el objetivo, el extremo de la escala', () => {
    S.metas = [metaBase({ id: 'm1', montoActual: 1_200_000, montoObjetivo: 3_500_000 })];
    renderListaMetas();
    expect(document.querySelector('.meta-card__monto').textContent).toContain('1.200.000');
    const escala = [...document.querySelectorAll('.meta-card__escala span')].map(s => s.textContent);
    expect(escala[0]).toContain('0');
    expect(escala[1]).toContain('3.500.000');
  });

  it('"+ Aportar" es la acción principal, a ancho completo y fuera del renglón secundario', () => {
    S.metas = [metaBase({ id: 'm1' })];
    renderListaMetas();
    const aportar = document.querySelector('.meta-card__aportar');
    expect(aportar).not.toBeNull();
    expect(aportar.dataset.action).toBe('abonar-meta');
    expect(aportar.textContent).toContain('Aportar');
    expect(document.querySelector('.meta-card__secundarias [data-action="abonar-meta"]')).toBeNull();
  });

  it('los datos dicen el faltante y la fecha, sin "días restantes" ni "X / Y"', () => {
    S.metas = [metaBase({ id: 'm1', montoActual: 1_200_000, montoObjetivo: 3_500_000, fechaLimite: isoEnDias(120) })];
    renderListaMetas();
    const datos = datosTarjeta().join(' | ');
    expect(datos).toContain('Faltan');
    expect(datos).toContain('2.300.000');
    expect(datos).not.toContain('días restantes');
    expect(datos).toContain('Meta: ');
  });

  // Un dato que no existe se ofrece, no se rellena.
  it('sin fecha límite lo dice y ofrece ponerla, en el hueco del plan de aportes', () => {
    S.metas = [metaBase({ id: 'm1', fechaLimite: null })];
    renderListaMetas();
    expect(datosTarjeta().join(' | ')).toContain('Sin fecha límite');
    const nudge = document.querySelector('.meta-card__nudge');
    expect(nudge.textContent).toContain('Ponle una fecha');
    expect(nudge.querySelector('.meta-card__nudge-cta').dataset.action).toBe('editar-meta');
  });

  it('con fecha límite no aparece la invitación a ponerla', () => {
    S.metas = [metaBase({ id: 'm1', fechaLimite: isoEnDias(120) })];
    renderListaMetas();
    expect(document.querySelector('.meta-card__nudge')).toBeNull();
  });

  // Meta recién creada: el arco vacío enmarca la meta, y la cifra en cero cede
  // su línea a la frase que nombra el primer paso.
  it('con la meta en cero la cifra grande cede a una frase y el botón nombra el primer paso', () => {
    S.metas = [metaBase({ id: 'm1', montoActual: 0, montoObjetivo: 30_000_000 })];
    renderListaMetas();
    expect(document.querySelector('.meta-card__monto')).toBeNull();
    expect(document.querySelector('.meta-card__frase').textContent).toContain('Tu primer aporte');
    expect(document.querySelector('.meta-card__aportar').textContent).toContain('Hacer el primer aporte');
    expect(datosTarjeta().join(' | ')).toContain('Objetivo: ');
  });

  // Regla R11: el envoltorio no oculta lo que envuelve.
  it('el contenedor del arco no lleva aria-hidden y la etiqueta nombra la meta', () => {
    S.metas = [metaBase({ id: 'm1', nombre: 'Viaje', montoActual: 1_000_000, montoObjetivo: 5_000_000 })];
    renderListaMetas();
    const wrap = document.querySelector('.meta-card__medidor');
    expect(wrap.getAttribute('aria-hidden')).toBeNull();
    expect(wrap.querySelector('svg').getAttribute('aria-label')).toBe('Viaje: 20% de tu objetivo');
  });

  // Regla R20: el ojo esconde pesos, no progreso.
  it('con el saldo oculto enmascara montos y conserva el porcentaje del arco', () => {
    S.config = { ocultarSaldo: true };
    S.metas  = [metaBase({ id: 'm1', nombre: 'Viaje', montoActual: 1_000_000, montoObjetivo: 5_000_000 })];
    renderListaMetas();
    expect(document.querySelector('.meta-card__monto').textContent).not.toContain('1.000.000');
    expect(document.querySelector('.meta-card__escala').textContent).not.toContain('5.000.000');
    expect(datosTarjeta().join(' | ')).not.toContain('4.000.000');
    expect(document.querySelector('.progress-arc').getAttribute('aria-label')).toContain('20%');
  });

  it('sin el flag activo los montos se ven completos', () => {
    S.metas = [metaBase({ id: 'm1', montoActual: 1_000_000, montoObjetivo: 5_000_000 })];
    renderListaMetas();
    expect(document.querySelector('.meta-card__monto').textContent).toContain('1.000.000');
  });
});

// ── renderListaMetas() - metas cumplidas en fila compacta ─────────
//
// Ficha 09, hallazgo G3. DIS.13 (FM4) hizo que la meta cumplida dejara de
// desaparecer y DIS.14 le conservó la tarjeta entera, que cobra 290px por cada
// meta lograda. La fila compacta la baja a 52px sin hacerla desaparecer:
// conserva el editar (la fila entera) y el eliminar (su propio botón).

describe('renderListaMetas() - metas cumplidas', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-metas" class="lista-metas"></div>';
    S.config   = {};
    S.ingresos = [];
    S.metas    = [];
  });

  it('la cumplida sale bajo un divisor con su contador', () => {
    S.metas = [
      metaBase({ id: 'm1', nombre: 'Viaje' }),
      metaBase({ id: 'm2', nombre: 'Regalo', montoActual: 180_000, montoObjetivo: 180_000, completada: true }),
      metaBase({ id: 'm3', nombre: 'Moto',   montoActual: 400_000, montoObjetivo: 400_000, completada: true }),
    ];
    renderListaMetas();
    const divisores = [...document.querySelectorAll('.grupo-eyebrow')].map(p => p.textContent);
    expect(divisores).toContain('Cumplidas');
    expect(document.querySelector('.grupo-eyebrow-fila__extra').textContent).toBe('2');
  });

  it('no gasta una tarjeta: la cumplida es fila y solo la activa es tarjeta', () => {
    S.metas = [
      metaBase({ id: 'm1', nombre: 'Viaje' }),
      metaBase({ id: 'm2', nombre: 'Regalo', montoActual: 180_000, montoObjetivo: 180_000, completada: true }),
    ];
    renderListaMetas();
    expect([...document.querySelectorAll('.meta-card')].map(a => a.dataset.id)).toEqual(['m1']);
    expect([...document.querySelectorAll('.meta-fila')].map(a => a.dataset.id)).toEqual(['m2']);
  });

  it('las cumplidas van después de las activas', () => {
    S.metas = [
      metaBase({ id: 'm2', nombre: 'Regalo', montoActual: 180_000, montoObjetivo: 180_000, completada: true }),
      metaBase({ id: 'm1', nombre: 'Viaje' }),
    ];
    renderListaMetas();
    const ids = [...document.querySelectorAll('#lista-metas [data-id]')].map(el => el.dataset.id);
    expect(ids.indexOf('m1')).toBeLessThan(ids.indexOf('m2'));
  });

  it('la fila entera abre el editar y el eliminar tiene su propio botón', () => {
    S.metas = [metaBase({ id: 'm2', nombre: 'Regalo', montoActual: 180_000, montoObjetivo: 180_000, completada: true })];
    renderListaMetas();
    const fila = document.querySelector('.meta-fila');
    expect(fila.querySelector('.meta-fila__btn').dataset.action).toBe('editar-meta');
    expect(fila.querySelector('[data-action="eliminar-meta"]')).not.toBeNull();
    expect(fila.querySelector('[data-action="abonar-meta"]')).toBeNull();
    // Dos botones hermanos: un botón dentro de otro no es HTML válido.
    expect(fila.querySelector('button button')).toBeNull();
  });

  it('la fila muestra el monto logrado', () => {
    S.metas = [metaBase({ id: 'm2', nombre: 'Regalo', montoActual: 180_000, montoObjetivo: 180_000, completada: true })];
    renderListaMetas();
    expect(document.querySelector('.meta-fila__monto').textContent).toContain('180.000');
    expect(document.querySelector('.meta-fila__lb').textContent).toBe('Regalo');
  });

  it('el ojo de privacidad enmascara el monto de la fila', () => {
    S.config = { ocultarSaldo: true };
    S.metas  = [metaBase({ id: 'm2', nombre: 'Regalo', montoActual: 180_000, montoObjetivo: 180_000, completada: true })];
    renderListaMetas();
    expect(document.querySelector('.meta-fila__monto').textContent).not.toContain('180.000');
  });

  it('sin metas activas pero con cumplidas no aparece el estado vacío, ni la franja', () => {
    S.metas = [metaBase({ id: 'm2', montoActual: 180_000, montoObjetivo: 180_000, completada: true })];
    renderListaMetas();
    expect(document.querySelector('.empty-state')).toBeNull();
    expect(document.querySelector('.meta-fila')).not.toBeNull();
    // "Reunido en tus 0 metas $0" sería una cabeza que no encabeza nada.
    expect(document.querySelector('.hero-metas')).toBeNull();
  });

  it('sin ninguna meta sigue apareciendo el estado vacío', () => {
    S.metas = [];
    renderListaMetas();
    expect(document.querySelector('.empty-state')).not.toBeNull();
    expect(document.querySelector('.meta-fila')).toBeNull();
    expect(document.querySelector('.hero-metas')).toBeNull();
  });
});

// ── renderListaMetas() - franja y orden (ficha 09, G1 y G2) ───────

describe('renderListaMetas() - franja de la sección', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-metas" class="lista-metas"></div>';
    S.config   = {};
    S.ingresos = [];
    S.metas    = [];
  });

  it('encabeza la lista con lo reunido, lo que falta y el alcance declarado', () => {
    S.metas = [
      metaBase({ id: 'm1', montoActual: 1_200_000, montoObjetivo: 3_500_000 }),
      metaBase({ id: 'm2', montoActual: 3_780_000, montoObjetivo: 4_200_000 }),
    ];
    renderListaMetas();
    expect(document.querySelector('.hero-metas__label').textContent).toContain('en tus 2 metas');
    expect(document.querySelector('.hero-metas__valor').textContent).toContain('4.980.000');
    expect(document.querySelector('.hero-metas__meta').textContent).toContain('2.720.000');
  });

  it('con una sola meta el alcance va en singular', () => {
    S.metas = [metaBase({ id: 'm1' })];
    renderListaMetas();
    expect(document.querySelector('.hero-metas__label').textContent).toContain('en tu meta');
  });

  it('la franja va antes de la primera tarjeta', () => {
    S.metas = [metaBase({ id: 'm1' })];
    renderListaMetas();
    const hijos = [...document.getElementById('lista-metas').children];
    expect(hijos[0].classList.contains('hero-metas')).toBe(true);
  });

  it('el ojo enmascara las cifras de la franja pero no el conteo', () => {
    S.config = { ocultarSaldo: true };
    S.metas  = [metaBase({ id: 'm1', montoActual: 1_200_000, montoObjetivo: 3_500_000 })];
    renderListaMetas();
    expect(document.querySelector('.hero-metas__valor').textContent).not.toContain('1.200.000');
    expect(document.querySelector('.hero-metas__label').textContent).toContain('en tu meta');
  });

  it('la barra lleva el porcentaje del objetivo agregado', () => {
    S.metas = [metaBase({ id: 'm1', montoActual: 1_000_000, montoObjetivo: 4_000_000 })];
    renderListaMetas();
    expect(document.querySelector('.hero-metas__barra-fill').getAttribute('style')).toContain('25%');
  });
});

describe('renderListaMetas() - orden de la lista', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-metas" class="lista-metas"></div>';
    S.config   = {};
    S.ingresos = [];
    S.metas    = [];
  });

  it('la primera tarjeta es la meta que vence primero, no la primera creada', () => {
    S.metas = [
      metaBase({ id: 'viaje',  nombre: 'Viaje',  fechaLimite: '2026-12-15' }),
      metaBase({ id: 'laptop', nombre: 'Laptop', fechaLimite: '2026-09-30' }),
    ];
    renderListaMetas();
    expect([...document.querySelectorAll('.meta-card')].map(a => a.dataset.id))
      .toEqual(['laptop', 'viaje']);
  });

  it('las metas sin plazo van al final, bajo su divisor', () => {
    S.metas = [
      metaBase({ id: 'curso',  nombre: 'Curso',  fechaLimite: null }),
      metaBase({ id: 'laptop', nombre: 'Laptop', fechaLimite: '2026-09-30' }),
    ];
    renderListaMetas();
    expect([...document.querySelectorAll('.meta-card')].map(a => a.dataset.id))
      .toEqual(['laptop', 'curso']);
    expect([...document.querySelectorAll('.grupo-eyebrow')].map(p => p.textContent))
      .toEqual(['Con plazo', 'Sin plazo']);
  });

  it('con todas las metas fechadas no se pinta un divisor que no separa nada', () => {
    S.metas = [
      metaBase({ id: 'a', fechaLimite: '2026-09-30' }),
      metaBase({ id: 'b', fechaLimite: '2026-12-15' }),
    ];
    renderListaMetas();
    expect(document.querySelector('.grupo-eyebrow')).toBeNull();
  });

  it('con todas las metas sin plazo el divisor sí sale: dice por qué no hay orden', () => {
    S.metas = [metaBase({ id: 'a', fechaLimite: null }), metaBase({ id: 'b', fechaLimite: null })];
    renderListaMetas();
    expect([...document.querySelectorAll('.grupo-eyebrow')].map(p => p.textContent))
      .toEqual(['Sin plazo']);
  });
});

// ── renderFormAbonoMeta() ─────────────────────────────────────────

describe('renderFormAbonoMeta()', () => {
  it('genera un form con id "form-abono-meta"', () => {
    const html = renderFormAbonoMeta(metaBase());
    expect(html).toContain('id="form-abono-meta"');
  });

  it('incluye el id de la meta en un campo oculto', () => {
    const meta = metaBase({ id: 'meta-abc' });
    const html = renderFormAbonoMeta(meta);
    expect(html).toContain('name="metaId"');
    expect(html).toContain('value="meta-abc"');
  });

  it('incluye el input de monto con name="monto"', () => {
    const html = renderFormAbonoMeta(metaBase());
    expect(html).toContain('name="monto"');
    expect(html).toContain('id="abono-meta-monto"');
  });

  it('muestra el porcentaje de progreso actual', () => {
    const meta = metaBase({ montoActual: 1_000_000, montoObjetivo: 5_000_000 });
    const html = renderFormAbonoMeta(meta);
    expect(html).toContain('20%');
  });

  it('muestra "Faltante" cuando la meta no está completada', () => {
    const meta = metaBase({ montoActual: 1_000_000, montoObjetivo: 5_000_000 });
    const html = renderFormAbonoMeta(meta);
    expect(html).toContain('Faltante');
  });

  it('no muestra "Faltante" cuando la meta está al 100%', () => {
    const meta = metaBase({ montoActual: 5_000_000, montoObjetivo: 5_000_000 });
    const html = renderFormAbonoMeta(meta);
    expect(html).not.toContain('Faltante');
  });

  it('incluye botón "Registrar aporte"', () => {
    const html = renderFormAbonoMeta(metaBase());
    expect(html).toContain('Registrar aporte');
  });

  it('incluye botón Cancelar con data-action="modal-close"', () => {
    const html = renderFormAbonoMeta(metaBase());
    expect(html).toContain('data-action="modal-close"');
    expect(html).toContain('Cancelar');
  });

  it('escapa el nombre de la meta para prevenir XSS', () => {
    const meta = metaBase({ nombre: '<script>alert(1)</script>' });
    const html = renderFormAbonoMeta(meta);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('sin fecha límite no prellena el monto (no hay ritmo que sugerir)', () => {
    const html = renderFormAbonoMeta(metaBase({ fechaLimite: null }));
    expect(html).not.toMatch(/id="abono-meta-monto"[^>]*value=/);
  });

  it('con fecha límite prellena el monto con la cuota del período (MT.7)', () => {
    S.ingresos = [{ id: 'i1', frecuencia: 'Mensual', monto: 3_000_000 }];
    const meta = metaBase({
      montoActual: 0, montoObjetivo: 1_200_000, fechaLimite: isoEnDias(60),
    });
    const ahorro = calcularAhorroPorPeriodo(meta, frecuenciaPrincipalIngresos(S.ingresos));
    const html = renderFormAbonoMeta(meta);
    expect(ahorro).not.toBeNull();
    expect(html).toContain(`value="${ahorro.montoPorPeriodo}"`);
    expect(html).toContain(ahorro.etiqueta);
  });
});

// ── renderFormAbonoMeta() - selector de cuenta compartido (MT.5) ──

describe('renderFormAbonoMeta() - selector de cuenta', () => {
  const cuenta = (id, nombre, saldo = 500_000) => ({
    id, nombre, saldo, banco: 'Nequi', tipo: 'Ahorros', activa: true,
  });

  beforeEach(() => {
    S.cuentas = [];
  });

  it('sin cuentas activas no muestra selector (el abono vale como seguimiento)', () => {
    S.cuentas = [];
    const html = renderFormAbonoMeta(metaBase());
    expect(html).not.toContain('name="cuentaId"');
  });

  it('con una cuenta: una sola tarjeta del selector compartido, pre-seleccionada', () => {
    S.cuentas = [cuenta('c1', 'Nequi principal', 1_000_000)];
    const html = renderFormAbonoMeta(metaBase());
    expect(html).toContain('cuenta-sel__lista');
    expect(html).toContain('type="radio"');
    expect(html).toContain('name="cuentaId"');
    expect(html).toContain('value="c1"');
    expect(html).toContain('checked');
  });

  it('1 cuenta inactiva: no renderiza selector', () => {
    S.cuentas = [{ ...cuenta('c1', 'Inactiva'), activa: false }];
    const html = renderFormAbonoMeta(metaBase());
    expect(html).not.toContain('name="cuentaId"');
  });

  it('con varias cuentas: el selector de tarjetas lista todas y preselecciona la de mayor saldo', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000), cuenta('c2', 'Nequi', 400_000)];
    const html = renderFormAbonoMeta(metaBase());
    expect(html).toContain('cuenta-sel__lista');
    expect(html).toContain('value="c1"');
    expect(html).toContain('value="c2"');
    // c1 (mayor saldo) viene checked.
    expect(html).toMatch(/value="c1"[^>]*checked|checked[^>]*value="c1"/);
  });

  it('ya no usa el <select> de texto plano anterior', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000), cuenta('c2', 'Nequi', 400_000)];
    const html = renderFormAbonoMeta(metaBase());
    expect(html).not.toContain('id="abono-meta-cuenta"');
    expect(html).not.toContain('<select');
  });
});

// ── normalizarMeta(datos, metaExistente) - EDIT.1 ─────────────────

describe('normalizarMeta() - modo edición (EDIT.1)', () => {
  it('sin metaExistente, se comporta igual que antes: montoActual 0, completada false', () => {
    const r = normalizarMeta(datosFormValidos);
    expect(r.montoActual).toBe(0);
    expect(r.completada).toBe(false);
  });

  it('con metaExistente, conserva montoActual tal cual (no lo resetea a 0)', () => {
    const existente = metaBase({ montoActual: 2_000_000 });
    const r = normalizarMeta(datosFormValidos, existente);
    expect(r.montoActual).toBe(2_000_000);
  });

  it('recalcula completada al bajar el objetivo por debajo de lo ya aportado', () => {
    const existente = metaBase({ montoActual: 2_000_000, completada: false });
    const r = normalizarMeta({ ...datosFormValidos, montoObjetivo: '1000000' }, existente);
    expect(r.montoActual).toBe(2_000_000);
    expect(r.completada).toBe(true);
  });

  it('recalcula completada al subir el objetivo por encima de lo ya aportado', () => {
    const existente = metaBase({ montoActual: 5_000_000, montoObjetivo: 5_000_000, completada: true });
    const r = normalizarMeta({ ...datosFormValidos, montoObjetivo: '10000000' }, existente);
    expect(r.montoActual).toBe(5_000_000);
    expect(r.completada).toBe(false);
  });

  it('actualiza nombre, fecha y categoría normalmente', () => {
    const existente = metaBase({ montoActual: 500_000 });
    const r = normalizarMeta(
      { ...datosFormValidos, nombre: 'Viaje renombrado', fechaLimite: '2027-01-15', categoria: 'Viajes', icono: '' },
      existente,
    );
    expect(r.nombre).toBe('Viaje renombrado');
    expect(r.fechaLimite).toBe('2027-01-15');
    expect(r.categoria).toBe('Viajes');
    expect(r.montoActual).toBe(500_000);
  });

  it('metaExistente sin montoActual (defensivo) trata el histórico como 0', () => {
    const existente = { id: 'm1', nombre: 'X', montoObjetivo: 100 };
    const r = normalizarMeta(datosFormValidos, existente);
    expect(r.montoActual).toBe(0);
  });
});

// ── renderFormMeta(meta) - modo edición (EDIT.1) ──────────────────

describe('renderFormMeta() - modo edición (EDIT.1)', () => {
  it('sin meta, arranca en modo creación: botón "Guardar meta", campos vacíos', () => {
    const html = renderFormMeta();
    expect(html).toContain('>Guardar meta<');
    expect(html).not.toContain('>Actualizar meta<');
    expect(html).toMatch(/id="meta-nombre"[^>]*value=""/);
  });

  it('con una meta, prellena nombre, objetivo y fecha límite', () => {
    const meta = metaBase({ nombre: 'Viaje a Cartagena', montoObjetivo: 3_000_000, fechaLimite: '2026-12-01' });
    const html = renderFormMeta(meta);
    expect(html).toMatch(/id="meta-nombre"[^>]*value="Viaje a Cartagena"/);
    expect(html).toMatch(/id="meta-objetivo"[^>]*value="3000000"/);
    expect(html).toMatch(/id="meta-fecha"[^>]*value="2026-12-01"/);
  });

  it('con una meta, el botón dice "Actualizar meta"', () => {
    const html = renderFormMeta(metaBase());
    expect(html).toContain('>Actualizar meta<');
    expect(html).not.toContain('>Guardar meta<');
  });

  it('marca el chip de la categoría actual como checked', () => {
    const meta = metaBase({ categoria: 'Boda' });
    const html = renderFormMeta(meta);
    expect(html).toMatch(/value="Boda"[^>]*checked/);
  });

  it('con categoría "Otra", el grupo de ícono NO viene oculto', () => {
    const meta = metaBase({ categoria: 'Otra', icono: 'c-otros' });
    const html = renderFormMeta(meta);
    expect(html).toMatch(/<div class="form-group" id="form-group-meta-icono" >/);
  });

  it('con categoría "Otra" y un ícono de sprite válido (del catálogo), lo prellena en el picker', () => {
    const meta = metaBase({ categoria: 'Otra', icono: 'c-avion' });
    const html = renderFormMeta(meta);
    expect(html).toContain('value="c-avion"');
    expect(html).toContain('aria-pressed="true"');
  });

  it('con un emoji legacy (no id de sprite), el picker NO intenta usarlo como valor', () => {
    const meta = metaBase({ categoria: 'Otra', icono: '🎉' });
    const html = renderFormMeta(meta);
    // El input oculto del picker queda vacío: ningún botón coincide con un emoji.
    expect(html).toContain('id="meta-icono" value=""');
  });

  it('sin categoría "Otra", el grupo de ícono sigue oculto aunque haya meta', () => {
    const meta = metaBase({ categoria: 'Viajes' });
    const html = renderFormMeta(meta);
    expect(html).toMatch(/<div class="form-group" id="form-group-meta-icono" hidden>/);
  });
});

// ── renderListaMetas() - botón "Editar" (EDIT.1) ──────────────────

describe('renderListaMetas() - botón Editar (EDIT.1)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-metas"></div>';
  });

  it('cada meta trae un botón "editar-meta" con su id', () => {
    S.metas = [metaBase({ id: 'm1', nombre: 'Viaje' })];
    renderListaMetas();
    const btn = document.querySelector('.meta-card__secundaria[data-action="editar-meta"]');
    expect(btn).not.toBeNull();
    expect(btn.dataset.id).toBe('m1');
    expect(btn.getAttribute('aria-label')).toBe('Editar meta Viaje');
  });

  it('con varias metas, cada botón de editar lleva el id de SU propia meta', () => {
    S.metas = [
      metaBase({ id: 'm1', nombre: 'Viaje' }),
      metaBase({ id: 'm2', nombre: 'Laptop' }),
    ];
    renderListaMetas();
    const ids = [...document.querySelectorAll('.meta-card__secundaria[data-action="editar-meta"]')].map(b => b.dataset.id);
    expect(ids).toEqual(['m1', 'm2']);
  });
});
