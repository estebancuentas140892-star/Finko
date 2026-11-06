/**
 * celebraciones.test.js - Tino celebra los primeros pasos y los logros
 * grandes del adulto, una vez y sin confundir una puesta al día con un
 * logro (ADR 127 D9).
 */
import { describe, it, expect } from 'vitest';
import { HITOS, fotoHitos, hitosNuevos } from '../../modules/ui/celebraciones.js';

const foto = (extra = {}) => ({ logros: [], ingresos: 0, apartados: 0, ...extra });

describe('fotoHitos', () => {
  it('cuenta los ingresos fijos y los puntuales juntos', () => {
    const f = fotoHitos({ ingresos: [{}], ingresosPuntuales: [{}, {}], apartados: [{}], logros: ['tesorero'] });
    expect(f).toEqual({ logros: ['tesorero'], ingresos: 3, apartados: 1 });
  });

  it('un estado vacío o roto da ceros', () => {
    expect(fotoHitos(null)).toEqual({ logros: [], ingresos: 0, apartados: 0 });
    expect(fotoHitos({ ingresos: 'x' })).toEqual({ logros: [], ingresos: 0, apartados: 0 });
  });
});

describe('hitosNuevos', () => {
  it('el primer ingreso cuenta al pasar de 0 a 1', () => {
    expect(hitosNuevos(foto(), foto({ ingresos: 1 })).map(h => h.id)).toEqual(['primer-ingreso']);
  });

  it('de 0 a varios de golpe no es un primer paso (un respaldo, la nube)', () => {
    expect(hitosNuevos(foto(), foto({ ingresos: 4, apartados: 3 }))).toEqual([]);
  });

  it('el segundo ingreso no se celebra', () => {
    expect(hitosNuevos(foto({ ingresos: 1 }), foto({ ingresos: 2 }))).toEqual([]);
  });

  it('la primera reserva cuenta al pasar de 0 a 1', () => {
    expect(hitosNuevos(foto(), foto({ apartados: 1 })).map(h => h.id)).toEqual(['primera-reserva']);
  });

  it('un logro nuevo, solo, se celebra con su pose', () => {
    const [h] = hitosNuevos(foto({ logros: ['primer-gasto'] }), foto({ logros: ['primer-gasto', 'meta-lograda'] }));
    expect(h.id).toBe('meta-lograda');
    expect(h.pose).toBe('meta-cumplida'); // ADR 129
  });

  it('el límite y la meta salen de sus logros de siempre', () => {
    expect(hitosNuevos(foto(), foto({ logros: ['planificador'] })).map(h => h.id)).toEqual(['primer-limite']);
    expect(hitosNuevos(foto(), foto({ logros: ['soñador'] })).map(h => h.id)).toEqual(['primera-meta']);
  });

  it('dos logros o más en un mismo cambio son una puesta al día: no se celebran', () => {
    expect(hitosNuevos(foto(), foto({ logros: ['planificador', 'soñador', 'tesorero'] }))).toEqual([]);
  });

  it('un logro que ya estaba no se vuelve a celebrar', () => {
    expect(hitosNuevos(foto({ logros: ['mes-completo'] }), foto({ logros: ['mes-completo'] }))).toEqual([]);
  });

  it('un logro sin hito (primer gasto) no celebra nada', () => {
    expect(hitosNuevos(foto(), foto({ logros: ['primer-gasto'] }))).toEqual([]);
  });

  it('sin foto previa no hay comparación', () => {
    expect(hitosNuevos(null, foto({ ingresos: 1 }))).toEqual([]);
  });

  it('lo grande va antes que lo pequeño', () => {
    const ids = HITOS.map(h => h.id);
    expect(ids.indexOf('meta-lograda')).toBeLessThan(ids.indexOf('primer-ingreso'));
    expect(HITOS.every(h => ['celebra', 'celebra-grande', 'meta-cumplida'].includes(h.pose))).toBe(true);
  });

  it('los textos siguen el estilo de escritura (sin guion largo ni medio)', () => {
    for (const h of HITOS) {
      expect(`${h.titulo} ${h.detalle}`).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
