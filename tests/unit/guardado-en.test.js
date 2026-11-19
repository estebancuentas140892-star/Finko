/**
 * guardado-en.test.js - "¿Dónde lo guardas?" (AH.9, ADR 174 D2 a D4): leer,
 * validar y decir dónde está una meta, una reserva o el fondo; y qué dice
 * estar en una cuenta. Solo referencia: ningún cálculo lo lee.
 */

import { describe, it, expect } from 'vitest';
import {
  leerGuardadoEn, validarGuardadoEn, cuentaDeGuardado, lugarGuardado, guardadoEnCuenta, BOLSILLO_MAX,
} from '../../modules/infra/guardado-en.js';
import { normalizarMeta } from '../../modules/dominio/metas/logic.js';
import { normalizarApartado } from '../../modules/dominio/apartados/logic.js';

const nequi = { id: 'c2', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', activa: true };
const vieja = { id: 'c9', nombre: 'Vieja', banco: 'Bancolombia', tipo: 'Ahorros', activa: false };

describe('leerGuardadoEn', () => {
  it('cuenta y bolsillo, recortados; sin cuenta no hay dato', () => {
    expect(leerGuardadoEn({ guardadoCuentaId: 'c2', guardadoBolsillo: '  Viaje ' })).toEqual({ cuentaId: 'c2', bolsillo: 'Viaje' });
    expect(leerGuardadoEn({ guardadoCuentaId: 'c2', guardadoBolsillo: '' })).toEqual({ cuentaId: 'c2', bolsillo: null });
    expect(leerGuardadoEn({ guardadoBolsillo: 'Viaje' })).toBeNull();
    expect(leerGuardadoEn({})).toBeNull();
  });
});

describe('validarGuardadoEn', () => {
  it('vacío no es error; una cuenta inactiva o un bolsillo largo sí', () => {
    expect(validarGuardadoEn({}, [nequi])).toEqual([]);
    expect(validarGuardadoEn({ guardadoCuentaId: 'c2', guardadoBolsillo: 'Viaje' }, [nequi])).toEqual([]);
    expect(validarGuardadoEn({ guardadoCuentaId: 'c9' }, [nequi, vieja])).toHaveLength(1);
    expect(validarGuardadoEn({ guardadoCuentaId: 'c2', guardadoBolsillo: 'x'.repeat(BOLSILLO_MAX + 1) }, [nequi])).toHaveLength(1);
  });
});

describe('dónde está (ADR 174 D3)', () => {
  it('"Nequi, bolsillo Viaje", solo "Nequi", y nada si la cuenta ya no está', () => {
    expect(lugarGuardado({ cuentaId: 'c2', bolsillo: 'Viaje' }, [nequi])).toBe('Nequi, bolsillo Viaje');
    expect(lugarGuardado({ cuentaId: 'c2', bolsillo: null }, [nequi])).toBe('Nequi');
    expect(lugarGuardado({ cuentaId: 'c9', bolsillo: 'X' }, [nequi, vieja])).toBe('');
    expect(lugarGuardado(null, [nequi])).toBe('');
    expect(cuentaDeGuardado({ cuentaId: 'c2' }, [nequi])).toBe(nequi);
  });

  it('lo que dice estar en una cuenta: metas y reservas aparte del fondo', () => {
    const estado = {
      metas: [{ id: 'm1', nombre: 'Viaje', montoActual: 300_000, guardadoEn: { cuentaId: 'c2', bolsillo: 'Viaje' } }, { id: 'm2', nombre: 'Otra', montoActual: 1 }],
      apartados: [{ id: 'a1', nombre: 'SOAT', montoActual: 120_000, guardadoEn: { cuentaId: 'c2', bolsillo: null } }],
      ahorro: { fondoEmergencia: { activo: true, montoActual: 500_000, guardadoEn: { cuentaId: 'c2', bolsillo: 'Colchón' } }, aportes: [{ monto: 100_000 }] },
    };
    const r = guardadoEnCuenta('c2', estado);
    expect(r.bolsas).toEqual([
      { tipo: 'meta', nombre: 'Viaje', bolsillo: 'Viaje', monto: 300_000 },
      { tipo: 'reserva', nombre: 'SOAT', bolsillo: null, monto: 120_000 },
    ]);
    expect(r.fondo).toEqual({ bolsillo: 'Colchón', monto: 600_000 });
    expect(guardadoEnCuenta('c1', estado)).toEqual({ bolsas: [], fondo: null });
  });
});

describe('la meta y la reserva lo guardan al normalizar', () => {
  it('normalizarMeta y normalizarApartado llevan guardadoEn (o null)', () => {
    expect(normalizarMeta({ nombre: 'Viaje', montoObjetivo: '1000000', guardadoCuentaId: 'c2', guardadoBolsillo: 'Viaje' }).guardadoEn)
      .toEqual({ cuentaId: 'c2', bolsillo: 'Viaje' });
    expect(normalizarMeta({ nombre: 'Viaje', montoObjetivo: '1000000' }).guardadoEn).toBeNull();
    expect(normalizarApartado({ nombre: 'SOAT', montoObjetivo: '520000', guardadoCuentaId: 'c2' }).guardadoEn)
      .toEqual({ cuentaId: 'c2', bolsillo: null });
  });
});
