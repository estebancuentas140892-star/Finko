/**
 * avisos.test.js - motor único de avisos (CFG.3a, ADR 066).
 *
 * El motor es puro: recibe las colecciones y `hoyISO`, devuelve datos. Lo que se
 * verifica acá es lo que decide el motor (qué entra, con qué severidad, en qué
 * orden), no las reglas de fecha ni de umbral de cada dominio: esas ya tienen
 * sus propios tests donde viven.
 */

import { describe, it, expect } from 'vitest';
import {
  recolectarAvisos,
  avisosQueInterrumpen,
  TIPOS_AVISO,
  SEVERIDADES,
  SEVERIDADES_QUE_INTERRUMPEN,
  DIAS_APARTADO_PROXIMO,
} from '../../modules/infra/avisos.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const HOY = '2026-08-13'; // jueves

const fijo = (overrides = {}) => ({
  id:            'c1',
  descripcion:   'Arriendo',
  tipo:          'fijo',
  categoria:     'Vivienda',
  monto:         1_500_000,
  frecuencia:    'Mensual',
  diaPago:       5,
  activo:        true,
  fechaCreacion: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const deuda = (overrides = {}) => ({
  id:            'd1',
  descripcion:   'Tarjeta',
  tipo:          'deuda-entidad',
  saldoTotal:    2_000_000,
  cuotaMensual:  200_000,
  frecuencia:    'Mensual',
  diaPago:       5,
  activo:        true,
  fechaCreacion: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const presupuesto = (overrides = {}) => ({
  id:            'p1',
  categoria:     'Restaurantes',
  montoMensual:  200_000,
  activo:        true,
  fechaCreacion: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const gasto = (overrides = {}) => ({
  id:          'g1',
  descripcion: 'Almuerzo',
  monto:       50_000,
  categoria:   'Restaurantes',
  fecha:       '2026-08-05',
  ...overrides,
});

const apartado = (overrides = {}) => ({
  id:               'a1',
  nombre:           'SOAT',
  icono:            '📦',
  montoObjetivo:    500_000,
  montoActual:      100_000,
  fechaObjetivo:    '2026-08-16',
  frecuenciaAporte: 'Mensual',
  recurrente:       false,
  periodoMeses:     null,
  completado:       false,
  fechaCreacion:    '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const prestamo = (overrides = {}) => ({
  id:            'pe1',
  persona:       'Juan',
  monto:         300_000,
  pagado:        0,
  fecha:         '2026-06-01',
  fechaLimite:   '2026-08-01',
  liquidado:     false,
  fechaCreacion: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

const ingreso = (overrides = {}) => ({
  id:            'i1',
  descripcion:   'Salario',
  monto:         2_000_000,
  frecuencia:    'Mensual',
  categoria:     'Salario',
  diaPago:       13,
  activo:        true,
  fechaCreacion: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

/** Busca el primer aviso de un tipo. */
const de = (avisos, tipo) => avisos.find(a => a.tipo === tipo);

// ── CONTRATO GENERAL ─────────────────────────────────────────────

describe('recolectarAvisos() - contrato', () => {
  it('sin datos no hay avisos', () => {
    expect(recolectarAvisos({ hoyISO: HOY })).toEqual([]);
  });

  it('sin argumentos devuelve lista vacía, no lanza', () => {
    expect(recolectarAvisos()).toEqual([]);
  });

  it('con una fecha que no tiene forma de fecha devuelve lista vacía', () => {
    const datos = { compromisos: [fijo()], hoyISO: '13/08/2026' };
    expect(recolectarAvisos(datos)).toEqual([]);
  });

  it('cada aviso trae las claves del contrato y un tipo conocido', () => {
    const avisos = recolectarAvisos({ compromisos: [fijo()], hoyISO: HOY });
    expect(avisos.length).toBeGreaterThan(0);
    for (const a of avisos) {
      expect(TIPOS_AVISO).toContain(a.tipo);
      expect(SEVERIDADES).toContain(a.severidad);
      expect(a.id).toBe(`${a.tipo}:c1`);
      expect(typeof a.nombre).toBe('string');
      expect(typeof a.seccion).toBe('string');
    }
  });

  it('nunca devuelve frases: no hay strings de copy en los campos de dato', () => {
    const avisos = recolectarAvisos({
      compromisos: [fijo()],
      apartados:   [apartado()],
      ingresos:    [ingreso()],
      hoyISO:      HOY,
    });
    for (const a of avisos) {
      expect(a.nombre).not.toMatch(/vence|venció|hoy|mañana|días/i);
    }
  });
});

// ── COMPROMISOS ──────────────────────────────────────────────────

describe('recolectarAvisos() - compromisos', () => {
  it('un fijo con el día de pago pasado y sin pagar entra como vencido', () => {
    const avisos = recolectarAvisos({ compromisos: [fijo({ diaPago: 5 })], hoyISO: HOY });
    const v = de(avisos, 'compromiso-vencido');
    expect(v).toBeTruthy();
    expect(v.dias).toBe(8);
    expect(v.sentido).toBe('atraso');
    expect(v.monto).toBe(1_500_000);
    expect(v.seccion).toBe('compromisos');
  });

  it('un fijo ya pagado este mes no genera aviso de vencido', () => {
    const avisos = recolectarAvisos({
      compromisos: [fijo({ diaPago: 5 })],
      gastos:      [gasto({ compromisoId: 'c1', monto: 1_500_000, fecha: '2026-08-05' })],
      hoyISO:      HOY,
    });
    expect(de(avisos, 'compromiso-vencido')).toBeUndefined();
  });

  it('el atraso escala la severidad: 8 días es alta, 12 es urgente', () => {
    const ochoDias = recolectarAvisos({ compromisos: [fijo({ diaPago: 5 })], hoyISO: HOY });
    const doceDias = recolectarAvisos({ compromisos: [fijo({ diaPago: 1 })], hoyISO: HOY });
    expect(de(ochoDias, 'compromiso-vencido').severidad).toBe('alta');
    expect(de(doceDias, 'compromiso-vencido').severidad).toBe('urgente');
  });

  it('lo que vence hoy es próximo con 0 días, nunca vencido: no se avisa dos veces', () => {
    const avisos = recolectarAvisos({ compromisos: [fijo({ diaPago: 13 })], hoyISO: HOY });
    expect(de(avisos, 'compromiso-vencido')).toBeUndefined();
    const p = de(avisos, 'compromiso-proximo');
    expect(p.dias).toBe(0);
    expect(p.severidad).toBe('alta');
  });

  it('lo que vence en tres días es media, no alta', () => {
    const avisos = recolectarAvisos({ compromisos: [fijo({ diaPago: 16 })], hoyISO: HOY });
    expect(de(avisos, 'compromiso-proximo').severidad).toBe('media');
  });

  it('una deuda próxima reporta la cuota como monto, no el saldo', () => {
    const avisos = recolectarAvisos({ compromisos: [deuda({ diaPago: 14 })], hoyISO: HOY });
    expect(de(avisos, 'compromiso-proximo').monto).toBe(200_000);
  });

  it('un compromiso inactivo no genera ningún aviso', () => {
    const avisos = recolectarAvisos({ compromisos: [fijo({ activo: false })], hoyISO: HOY });
    expect(avisos).toEqual([]);
  });
});

// ── LÍMITES DE GASTO ─────────────────────────────────────────────

describe('recolectarAvisos() - límites de gasto', () => {
  it('el tope excedido es severidad alta y trae el porcentaje en extra', () => {
    const avisos = recolectarAvisos({
      presupuestos: [presupuesto()],
      gastos:       [gasto({ monto: 250_000, fecha: '2026-08-10' })],
      hoyISO:       HOY,
    });
    const a = de(avisos, 'limite-excedido');
    expect(a.severidad).toBe('alta');
    expect(a.nombre).toBe('Restaurantes');
    expect(a.monto).toBe(250_000);
    expect(a.extra.porcentaje).toBeGreaterThan(100);
    expect(a.extra.asignado).toBe(200_000);
    expect(a.seccion).toBe('presupuesto');
  });

  it('el tope cerca del límite es media, no alta', () => {
    const avisos = recolectarAvisos({
      presupuestos: [presupuesto()],
      gastos:       [gasto({ monto: 160_000, fecha: '2026-08-10' })],
      hoyISO:       HOY,
    });
    expect(de(avisos, 'limite-alerta').severidad).toBe('media');
  });

  it('un tope con gasto bajo no genera aviso', () => {
    const avisos = recolectarAvisos({
      presupuestos: [presupuesto()],
      gastos:       [gasto({ monto: 20_000, fecha: '2026-08-10' })],
      hoyISO:       HOY,
    });
    expect(avisos).toEqual([]);
  });

  it('el gasto de otro mes no cuenta para el tope de este mes', () => {
    const avisos = recolectarAvisos({
      presupuestos: [presupuesto()],
      gastos:       [gasto({ monto: 300_000, fecha: '2026-07-10' })],
      hoyISO:       HOY,
    });
    expect(avisos).toEqual([]);
  });
});

// ── APARTADOS ────────────────────────────────────────────────────

describe('recolectarAvisos() - apartados', () => {
  it('un apartado con fecha dentro de la semana entra con lo que falta por reunir', () => {
    const avisos = recolectarAvisos({ apartados: [apartado()], hoyISO: HOY });
    const a = de(avisos, 'apartado-proximo');
    expect(a.dias).toBe(3);
    expect(a.monto).toBe(400_000);
    expect(a.severidad).toBe('media');
    expect(a.seccion).toBe('apartados');
  });

  it('el umbral del aviso es de una semana, no los 30 días de la sección', () => {
    expect(DIAS_APARTADO_PROXIMO).toBe(7);
    const avisos = recolectarAvisos({
      apartados: [apartado({ fechaObjetivo: '2026-09-05' })], // 23 días
      hoyISO:    HOY,
    });
    expect(de(avisos, 'apartado-proximo')).toBeUndefined();
  });

  it('un apartado recurrente que ya reunió el dinero entra como listo, severidad baja', () => {
    const avisos = recolectarAvisos({
      apartados: [apartado({ montoActual: 500_000, completado: true, recurrente: true, fechaObjetivo: null })],
      hoyISO:    HOY,
    });
    const a = de(avisos, 'apartado-listo');
    expect(a.severidad).toBe('baja');
    expect(a.monto).toBe(500_000);
  });

  it('un apartado no recurrente completado no avisa nada', () => {
    const avisos = recolectarAvisos({
      apartados: [apartado({ montoActual: 500_000, completado: true })],
      hoyISO:    HOY,
    });
    expect(avisos).toEqual([]);
  });
});

// ── PRÉSTAMOS PERSONALES ─────────────────────────────────────────

describe('recolectarAvisos() - préstamos personales', () => {
  it('un préstamo con la fecha pactada pasada entra con los días de atraso', () => {
    const avisos = recolectarAvisos({ personales: [prestamo()], hoyISO: HOY });
    const a = de(avisos, 'prestamo-vencido');
    expect(a.nombre).toBe('Juan');
    expect(a.dias).toBe(12);
    expect(a.sentido).toBe('atraso');
    expect(a.monto).toBe(300_000);
    expect(a.seccion).toBe('personales');
  });

  it('nunca sube de media, ni con un año de atraso: recuerda, no presiona (ADR 047)', () => {
    const avisos = recolectarAvisos({
      personales: [prestamo({ fechaLimite: '2025-08-01' })],
      hoyISO:     HOY,
    });
    expect(de(avisos, 'prestamo-vencido').severidad).toBe('media');
    expect(avisosQueInterrumpen(avisos)).toEqual([]);
  });

  it('la fecha pactada de hoy entra como próxima con 0 días', () => {
    const avisos = recolectarAvisos({ personales: [prestamo({ fechaLimite: HOY })], hoyISO: HOY });
    const a = de(avisos, 'prestamo-proximo');
    expect(a.dias).toBe(0);
    expect(a.severidad).toBe('baja');
  });

  it('una fecha pactada lejana no avisa todavía', () => {
    const avisos = recolectarAvisos({
      personales: [prestamo({ fechaLimite: '2026-09-30' })],
      hoyISO:     HOY,
    });
    expect(avisos).toEqual([]);
  });

  it('un préstamo liquidado no avisa aunque su fecha ya pasara', () => {
    const avisos = recolectarAvisos({
      personales: [prestamo({ pagado: 300_000, liquidado: true })],
      hoyISO:     HOY,
    });
    expect(avisos).toEqual([]);
  });

  it('un préstamo sin fecha pactada no genera aviso: no hay evento que datar', () => {
    const avisos = recolectarAvisos({
      personales: [prestamo({ fechaLimite: undefined })],
      hoyISO:     HOY,
    });
    expect(avisos).toEqual([]);
  });
});

// ── DÍA DE PAGO ──────────────────────────────────────────────────

describe('recolectarAvisos() - día de pago', () => {
  it('un ingreso mensual que cae hoy avisa con su monto', () => {
    const avisos = recolectarAvisos({ ingresos: [ingreso()], hoyISO: HOY });
    const a = de(avisos, 'dia-de-pago');
    expect(a.nombre).toBe('Salario');
    expect(a.monto).toBe(2_000_000);
    expect(a.dias).toBe(0);
    expect(a.seccion).toBe('tesoreria');
  });

  it('un ingreso que cae otro día no avisa', () => {
    const avisos = recolectarAvisos({ ingresos: [ingreso({ diaPago: 20 })], hoyISO: HOY });
    expect(avisos).toEqual([]);
  });

  it('la frecuencia la resuelve el motor de vencimientos: un quincenal cae el día 13 y el 28', () => {
    const quincenal = ingreso({ frecuencia: 'Quincenal', diaPago: 13 });
    expect(de(recolectarAvisos({ ingresos: [quincenal], hoyISO: HOY }), 'dia-de-pago')).toBeTruthy();
    expect(de(recolectarAvisos({ ingresos: [quincenal], hoyISO: '2026-08-28' }), 'dia-de-pago')).toBeTruthy();
    expect(de(recolectarAvisos({ ingresos: [quincenal], hoyISO: '2026-08-20' }), 'dia-de-pago')).toBeUndefined();
  });

  it('un ingreso inactivo no avisa', () => {
    const avisos = recolectarAvisos({ ingresos: [ingreso({ activo: false })], hoyISO: HOY });
    expect(avisos).toEqual([]);
  });
});

// ── ORDEN Y FILTRO DE INTERRUPCIÓN ───────────────────────────────

describe('recolectarAvisos() - orden', () => {
  it('ordena por severidad y, dentro de la misma, el atraso más grande primero', () => {
    const avisos = recolectarAvisos({
      compromisos: [
        fijo({ id: 'c1', descripcion: 'Arriendo', diaPago: 1 }),  // urgente, 12 días
        fijo({ id: 'c2', descripcion: 'Internet', diaPago: 5 }),  // alta, 8 días
        fijo({ id: 'c3', descripcion: 'Gimnasio', diaPago: 16 }), // media, en 3 días
      ],
      apartados: [apartado({ montoActual: 500_000, completado: true, recurrente: true, fechaObjetivo: null })],
      hoyISO:    HOY,
    });
    expect(avisos.map(a => a.severidad)).toEqual(['urgente', 'alta', 'media', 'baja']);
    expect(avisos[0].nombre).toBe('Arriendo');
  });

  it('con la misma severidad y el mismo día, gana el monto más alto', () => {
    const avisos = recolectarAvisos({
      compromisos: [
        fijo({ id: 'c1', descripcion: 'Barato', diaPago: 16, monto: 50_000 }),
        fijo({ id: 'c2', descripcion: 'Caro',   diaPago: 16, monto: 900_000 }),
      ],
      hoyISO: HOY,
    });
    expect(avisos.map(a => a.nombre)).toEqual(['Caro', 'Barato']);
  });

  it('el motor no recorta: seis fuentes distintas devuelven sus seis avisos', () => {
    const avisos = recolectarAvisos({
      compromisos:  [fijo({ diaPago: 5 }), fijo({ id: 'c2', descripcion: 'Internet', diaPago: 14 })],
      presupuestos: [presupuesto()],
      gastos:       [gasto({ monto: 250_000, fecha: '2026-08-10' })],
      apartados:    [apartado()],
      personales:   [prestamo()],
      ingresos:     [ingreso()],
      hoyISO:       HOY,
    });
    expect(avisos.length).toBe(6);
    expect(new Set(avisos.map(a => a.tipo)).size).toBe(6);
  });
});

describe('avisosQueInterrumpen()', () => {
  it('deja pasar solo urgente y alta, conservando el orden', () => {
    const avisos = recolectarAvisos({
      compromisos: [fijo({ diaPago: 1 }), fijo({ id: 'c2', descripcion: 'Gimnasio', diaPago: 16 })],
      apartados:   [apartado()],
      personales:  [prestamo()],
      hoyISO:      HOY,
    });
    const interrumpen = avisosQueInterrumpen(avisos);
    expect(interrumpen.length).toBe(1);
    expect(interrumpen[0].severidad).toBe('urgente');
  });

  it('sin avisos graves devuelve lista vacía', () => {
    const avisos = recolectarAvisos({ apartados: [apartado()], hoyISO: HOY });
    expect(avisos.length).toBe(1);
    expect(avisosQueInterrumpen(avisos)).toEqual([]);
  });

  it('con una entrada que no es lista devuelve lista vacía', () => {
    expect(avisosQueInterrumpen(null)).toEqual([]);
    expect(avisosQueInterrumpen(undefined)).toEqual([]);
  });

  it('las severidades que interrumpen son las dos primeras del ranking', () => {
    expect(SEVERIDADES_QUE_INTERRUMPEN).toEqual(['urgente', 'alta']);
    expect(SEVERIDADES.slice(0, 2)).toEqual([...SEVERIDADES_QUE_INTERRUMPEN]);
  });
});
