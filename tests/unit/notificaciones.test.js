/**
 * notificaciones.test.js - tests para las funciones PURAS de notificaciones.
 *
 * Las funciones que tocan el DOM o la Notification API (pedirPermiso,
 * mostrarNotificacion, verificarYNotificar, estadoPermiso) no se testean
 * aquí porque requieren un entorno real de navegador.
 *
 * Lo que sí se testea: `formatearAvisoSistema()`, pura y sin side effects. Es el
 * copy de una superficie (CFG.3a, ADR 066 D2): el motor `infra/avisos.js`
 * devuelve datos y esta función los redacta.
 */

import { describe, it, expect } from 'vitest';
import { formatearAvisoSistema } from '../../modules/infra/notificaciones.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const aviso = (overrides = {}) => ({
  id:        'compromiso-proximo:c1',
  tipo:      'compromiso-proximo',
  severidad: 'alta',
  nombre:    'Arriendo',
  monto:     1_500_000,
  dias:      0,
  sentido:   'restante',
  seccion:   'compromisos',
  extra:     null,
  ...overrides,
});

// ── CONTRATO ─────────────────────────────────────────────────────

describe('formatearAvisoSistema() - contrato', () => {
  it('devuelve objeto con claves titulo y cuerpo', () => {
    const r = formatearAvisoSistema(aviso());
    expect(typeof r.titulo).toBe('string');
    expect(typeof r.cuerpo).toBe('string');
  });

  it('sin aviso devuelve strings vacíos', () => {
    expect(formatearAvisoSistema(null)).toEqual({ titulo: '', cuerpo: '' });
    expect(formatearAvisoSistema(undefined)).toEqual({ titulo: '', cuerpo: '' });
  });

  it('el título abre con el emoji del tipo', () => {
    expect(formatearAvisoSistema(aviso()).titulo).toMatch(/^⏰/);
    expect(formatearAvisoSistema(aviso({ tipo: 'limite-excedido' })).titulo).toMatch(/^⚠️/);
    expect(formatearAvisoSistema(aviso({ tipo: 'dia-de-pago' })).titulo).toMatch(/^💰/);
    expect(formatearAvisoSistema(aviso({ tipo: 'prestamo-vencido' })).titulo).toMatch(/^🤝/);
    expect(formatearAvisoSistema(aviso({ tipo: 'apartado-listo' })).titulo).toMatch(/^📦/);
  });

  it('un tipo desconocido cae al nombre, sin romper', () => {
    const { titulo } = formatearAvisoSistema(aviso({ tipo: 'inventado' }));
    expect(titulo).toBe('⏰ Arriendo');
  });

  it('un aviso sin nombre no deja el título colgando', () => {
    const { titulo } = formatearAvisoSistema(aviso({ nombre: '', tipo: 'inventado' }));
    expect(titulo).toBe('⏰ Un pendiente');
  });
});

// ── COPY POR TIPO ────────────────────────────────────────────────

describe('formatearAvisoSistema() - copy de compromisos', () => {
  it('lo que vence hoy dice "vence hoy" y nombra el compromiso', () => {
    const { titulo } = formatearAvisoSistema(aviso({ dias: 0 }));
    expect(titulo).toMatch(/hoy/i);
    expect(titulo).toContain('Arriendo');
  });

  it('lo que vence mañana dice "mañana"', () => {
    expect(formatearAvisoSistema(aviso({ dias: 1 })).titulo).toMatch(/ma[ñn]ana/i);
  });

  it('lo que vence en N días dice el número', () => {
    const { titulo } = formatearAvisoSistema(aviso({ dias: 3 }));
    expect(titulo).toContain('3');
    expect(titulo).toMatch(/días?/i);
  });

  it('lo vencido ayer se dice "ayer", no "hace 1 días"', () => {
    const { titulo } = formatearAvisoSistema(aviso({ tipo: 'compromiso-vencido', dias: 1, sentido: 'atraso' }));
    expect(titulo).toMatch(/ayer/i);
    expect(titulo).not.toMatch(/1 días/);
  });

  it('lo vencido hace varios días dice cuántos', () => {
    const { titulo } = formatearAvisoSistema(aviso({ tipo: 'compromiso-vencido', dias: 8, sentido: 'atraso' }));
    expect(titulo).toMatch(/venció hace 8 días/i);
  });
});

describe('formatearAvisoSistema() - copy del resto de fuentes', () => {
  it('el tope excedido nombra la categoría', () => {
    const { titulo } = formatearAvisoSistema(aviso({
      tipo: 'limite-excedido', nombre: 'Restaurantes', monto: 250_000, dias: null,
    }));
    expect(titulo).toContain('Restaurantes');
    expect(titulo).toMatch(/tope/i);
  });

  it('el tope cerca del límite dice el porcentaje que trae extra', () => {
    const { titulo } = formatearAvisoSistema(aviso({
      tipo: 'limite-alerta', nombre: 'Restaurantes', dias: null, extra: { porcentaje: 82 },
    }));
    expect(titulo).toContain('82%');
  });

  it('el día de pago habla del ingreso, no de un vencimiento', () => {
    const { titulo } = formatearAvisoSistema(aviso({ tipo: 'dia-de-pago', nombre: 'Salario', dias: 0 }));
    expect(titulo).toMatch(/hoy te llega/i);
    expect(titulo).toContain('Salario');
    expect(titulo).not.toMatch(/vence/i);
  });

  it('el apartado próximo habla de cuándo se necesita el dinero', () => {
    const { titulo } = formatearAvisoSistema(aviso({ tipo: 'apartado-proximo', nombre: 'SOAT', dias: 3 }));
    expect(titulo).toMatch(/en 3 días necesitas el dinero de SOAT/i);
  });

  it('el apartado listo es buena noticia, sin urgencia', () => {
    const { titulo } = formatearAvisoSistema(aviso({ tipo: 'apartado-listo', nombre: 'SOAT', dias: null }));
    expect(titulo).toMatch(/ya reuniste/i);
  });

  it('el préstamo vencido recuerda sin presionar: ni "debes" ni "cobra"', () => {
    const { titulo } = formatearAvisoSistema(aviso({
      tipo: 'prestamo-vencido', nombre: 'Juan', dias: 12, sentido: 'atraso',
    }));
    expect(titulo).toContain('Juan');
    expect(titulo).not.toMatch(/cobra|debe|reclama|exige/i);
  });
});

// ── CUERPO ───────────────────────────────────────────────────────

describe('formatearAvisoSistema() - cuerpo', () => {
  it('el cuerpo trae la cifra en juego', () => {
    expect(formatearAvisoSistema(aviso()).cuerpo).toContain('$1.500.000');
  });

  it('con un aviso más, el cuerpo lo dice en singular', () => {
    const { cuerpo } = formatearAvisoSistema(aviso(), 2);
    expect(cuerpo).toMatch(/otro aviso/i);
  });

  it('con varios avisos más, el cuerpo dice cuántos', () => {
    const { cuerpo } = formatearAvisoSistema(aviso(), 4);
    expect(cuerpo).toMatch(/3 avisos más/i);
  });

  it('nunca lista los otros avisos por nombre', () => {
    const { cuerpo } = formatearAvisoSistema(aviso(), 6);
    expect(cuerpo).not.toContain('Arriendo');
  });

  it('sin cifra y sin más avisos, el cuerpo no queda vacío', () => {
    const { cuerpo } = formatearAvisoSistema(aviso({ monto: null }), 1);
    expect(cuerpo).toMatch(/recordatorio/i);
  });

  it('un total inválido se lee como un solo aviso', () => {
    const { cuerpo } = formatearAvisoSistema(aviso(), 0);
    expect(cuerpo).not.toMatch(/avisos? más|otro aviso/i);
  });
});
