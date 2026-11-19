/**
 * inversion-entidad.test.js - "¿Dónde la tienes?" (MK.3b, ADR 172 D5 y D6):
 * la lista de bancos y plataformas, validar y normalizar `entidad`, Wenia
 * sugiere Cripto y la frase nueva de Cripto.
 */

import { describe, it, expect } from 'vitest';
import {
  entidadesInversion, validarEntidadInversion, tipoSugeridoPorEntidad, normalizarInversion, EXPLICACION_TIPO,
} from '../../modules/dominio/inversiones/logic.js';

const datos = (o = {}) => ({ tipo: 'CDT', nombre: 'CDT', monto: '1000000', tasaEA: '', plazoMeses: '', fechaInicio: '2026-10-01', ...o });

describe('entidadesInversion (ADR 172 D5)', () => {
  it('bancos y billeteras sin Efectivo ni Otro, y las plataformas del tag inversion', () => {
    const lista = entidadesInversion();
    const ids = lista.map(e => e.id);
    expect(ids).toContain('Bancolombia');
    expect(ids).toContain('Nequi');
    expect(ids).not.toContain('Efectivo');
    expect(ids).not.toContain('Otro');
    expect(lista.filter(e => e.grupo === 'plataforma').map(e => e.id)).toEqual(['trii', 'wenia']);
  });
});

describe('validar y normalizar entidad', () => {
  it('vacía no es error; un id fuera de la lista, sí', () => {
    expect(validarEntidadInversion('')).toEqual([]);
    expect(validarEntidadInversion('trii')).toEqual([]);
    expect(validarEntidadInversion('Bancolombia')).toEqual([]);
    expect(validarEntidadInversion('Inventado')).toHaveLength(1);
  });

  it('se guarda solo si está en la lista; sin ella la inversión es la de siempre', () => {
    expect(normalizarInversion(datos({ entidad: 'trii' })).entidad).toBe('trii');
    expect(normalizarInversion(datos({ entidad: '' }))).not.toHaveProperty('entidad');
    expect(normalizarInversion(datos({ entidad: 'Inventado' }))).not.toHaveProperty('entidad');
    // Al editar también se puede cambiar.
    expect(normalizarInversion(datos({ entidad: 'Bancolombia' }), { id: 'i1', cuentaId: 'c1' })).toMatchObject({ entidad: 'Bancolombia', cuentaId: 'c1' });
  });
});

describe('Wenia y Cripto (ADR 172 D5 y D6)', () => {
  it('Wenia sugiere Cripto; las demás no sugieren nada', () => {
    expect(tipoSugeridoPorEntidad('wenia')).toBe('Cripto');
    expect(tipoSugeridoPorEntidad('trii')).toBeNull();
    expect(tipoSugeridoPorEntidad('')).toBeNull();
  });

  it('la explicación de Cripto dice que las atadas al peso o al dólar no buscan subir', () => {
    expect(EXPLICACION_TIPO.Cripto).toContain('Las atadas al peso o al dólar no buscan subir, y tampoco tienen el seguro de depósito de una cuenta de ahorros.');
  });
});
