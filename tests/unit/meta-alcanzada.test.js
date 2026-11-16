/**
 * meta-alcanzada.test.js - la meta alcanzada como novedad de Inicio
 * (INI.1, ADR 149 D4).
 *
 * Cubre:
 * - fechaMetaAlcanzada(): la fecha del último aporte de una meta cumplida.
 * - El aviso `meta-alcanzada` del motor: dura DIAS_META_ALCANZADA días, es de
 *   severidad baja (nunca interrumpe) y lo pide `avisosDeHoy` con `S.metas`.
 */

import { describe, it, expect } from 'vitest';
import { fechaMetaAlcanzada } from '../../modules/dominio/metas/logic.js';
import {
  recolectarAvisos, avisosDeHoy, avisosQueInterrumpen, DIAS_META_ALCANZADA, TIPOS_AVISO,
} from '../../modules/infra/avisos.js';

const HOY = '2026-11-16';

const meta = (o = {}) => ({
  id: 'm1', nombre: 'Moto', montoObjetivo: 2_000_000, montoActual: 2_000_000, completada: true,
  aportes: [
    { id: 'a1', fecha: '2026-10-01', monto: 1_500_000, cuentaId: null },
    { id: 'a2', fecha: '2026-11-14', monto: 500_000, cuentaId: null },
  ],
  ...o,
});

describe('fechaMetaAlcanzada()', () => {
  it('es la fecha del último aporte, sin importar el orden en que se guardaron', () => {
    expect(fechaMetaAlcanzada(meta())).toBe('2026-11-14');
    expect(fechaMetaAlcanzada(meta({ aportes: [...meta().aportes].reverse() }))).toBe('2026-11-14');
  });

  it('una meta sin cumplir, o cumplida sin aportes con fecha, no tiene fecha', () => {
    expect(fechaMetaAlcanzada(meta({ completada: false }))).toBeNull();
    expect(fechaMetaAlcanzada(meta({ aportes: [] }))).toBeNull();
    expect(fechaMetaAlcanzada(meta({ aportes: undefined }))).toBeNull();
    expect(fechaMetaAlcanzada(meta({ aportes: [{ fecha: 'ayer' }] }))).toBeNull();
    expect(fechaMetaAlcanzada(null)).toBeNull();
  });
});

describe('aviso meta-alcanzada (motor)', () => {
  const avisos = (metas, hoyISO = HOY) => recolectarAvisos({ metas, hoyISO }).filter(a => a.tipo === 'meta-alcanzada');

  it('es un tipo del motor', () => {
    expect(TIPOS_AVISO).toContain('meta-alcanzada');
  });

  it('avisa la meta alcanzada hace pocos días, con cuánto reuniste y hace cuántos días', () => {
    const [a] = avisos([meta()]);
    expect(a).toMatchObject({
      id: 'meta-alcanzada:m1', severidad: 'baja', nombre: 'Moto', monto: 2_000_000,
      dias: 2, sentido: 'atraso', seccion: 'metas',
    });
  });

  it(`dura ${DIAS_META_ALCANZADA} días y después se va sola`, () => {
    const conFecha = (fecha) => meta({ aportes: [{ id: 'a', fecha, monto: 2_000_000, cuentaId: null }] });
    expect(avisos([conFecha('2026-11-16')])).toHaveLength(1);
    expect(avisos([conFecha('2026-11-09')])).toHaveLength(1);
    expect(avisos([conFecha('2026-11-08')])).toHaveLength(0);
  });

  it('una meta activa no avisa', () => {
    expect(avisos([meta({ completada: false })])).toHaveLength(0);
  });

  it('nunca despierta el teléfono', () => {
    expect(avisosQueInterrumpen(recolectarAvisos({ metas: [meta()], hoyISO: HOY }))).toHaveLength(0);
  });

  it('avisosDeHoy la recoge desde S.metas', () => {
    const state = { metas: [meta()], config: {} };
    expect(avisosDeHoy(state, HOY).map(a => a.tipo)).toContain('meta-alcanzada');
  });
});
