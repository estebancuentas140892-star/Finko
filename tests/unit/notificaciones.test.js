/**
 * notificaciones.test.js - tests para las funciones PURAS de notificaciones.
 *
 * Las funciones que tocan el DOM o la Notification API (pedirPermiso,
 * mostrarNotificacion, verificarYNotificar, estadoPermiso) no se testean
 * aquí porque requieren un entorno real de navegador.
 *
 * Lo que sí se testea: formatearMensajeNotificacion() - pura y sin side effects.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatearMensajeNotificacion,
  _resetNotificadoEstasSesion,
} from '../../modules/infra/notificaciones.js';

// Resetear flag de sesión antes de cada test para aislamiento.
beforeEach(() => {
  _resetNotificadoEstasSesion();
});

// ── FIXTURES ─────────────────────────────────────────────────────

const compromiso = (overrides = {}) => ({
  id:            'c1',
  descripcion:   'Arriendo',
  monto:         1_500_000,
  diasRestantes: 0,
  ...overrides,
});

// ── formatearMensajeNotificacion() ────────────────────────────────

describe('formatearMensajeNotificacion()', () => {
  it('devuelve strings vacíos con array vacío', () => {
    const { titulo, cuerpo } = formatearMensajeNotificacion([]);
    expect(titulo).toBe('');
    expect(cuerpo).toBe('');
  });

  it('un compromiso que vence hoy - título dice "vence hoy"', () => {
    const { titulo } = formatearMensajeNotificacion([compromiso({ diasRestantes: 0 })]);
    expect(titulo).toMatch(/hoy/i);
    expect(titulo).toContain('Arriendo');
  });

  it('un compromiso que vence mañana - título dice "mañana"', () => {
    const { titulo } = formatearMensajeNotificacion([compromiso({ diasRestantes: 1 })]);
    expect(titulo).toMatch(/ma[ñn]ana/i);
  });

  it('un compromiso que vence en N días - título contiene el número', () => {
    const { titulo } = formatearMensajeNotificacion([compromiso({ diasRestantes: 3 })]);
    expect(titulo).toContain('3');
    expect(titulo).toMatch(/días?/i);
  });

  it('título de único compromiso empieza con emoji ⏰', () => {
    const { titulo } = formatearMensajeNotificacion([compromiso()]);
    expect(titulo).toMatch(/^⏰/);
  });

  it('cuerpo de único compromiso menciona "Recordatorio"', () => {
    const { cuerpo } = formatearMensajeNotificacion([compromiso()]);
    expect(cuerpo).toMatch(/recordatorio/i);
  });

  it('múltiples compromisos - título dice cuántos y usa ⏰', () => {
    const proximos = [
      compromiso({ id: 'c1', descripcion: 'Arriendo',  diasRestantes: 0 }),
      compromiso({ id: 'c2', descripcion: 'Netflix',   diasRestantes: 1 }),
      compromiso({ id: 'c3', descripcion: 'Internet',  diasRestantes: 2 }),
    ];
    const { titulo } = formatearMensajeNotificacion(proximos);
    expect(titulo).toMatch(/^⏰/);
    expect(titulo).toContain('3');
  });

  it('múltiples compromisos - cuerpo contiene nombres de los compromisos', () => {
    const proximos = [
      compromiso({ id: 'c1', descripcion: 'Arriendo', diasRestantes: 0 }),
      compromiso({ id: 'c2', descripcion: 'Netflix',  diasRestantes: 1 }),
    ];
    const { cuerpo } = formatearMensajeNotificacion(proximos);
    expect(cuerpo).toContain('Arriendo');
    expect(cuerpo).toContain('Netflix');
  });

  it('cuando hay varios compromisos hoy - resumen dice "hoy"', () => {
    const proximos = [
      compromiso({ id: 'c1', descripcion: 'A', diasRestantes: 0 }),
      compromiso({ id: 'c2', descripcion: 'B', diasRestantes: 0 }),
    ];
    const { titulo } = formatearMensajeNotificacion(proximos);
    expect(titulo).toMatch(/hoy/i);
  });

  it('cuando hay varios compromisos mañana - resumen dice "mañana"', () => {
    const proximos = [
      compromiso({ id: 'c1', descripcion: 'A', diasRestantes: 1 }),
      compromiso({ id: 'c2', descripcion: 'B', diasRestantes: 1 }),
    ];
    const { titulo } = formatearMensajeNotificacion(proximos);
    expect(titulo).toMatch(/ma[ñn]ana/i);
  });

  it('más de 3 compromisos - cuerpo trunca y añade "y N más"', () => {
    const proximos = Array.from({ length: 5 }, (_, i) =>
      compromiso({ id: `c${i}`, descripcion: `Pago ${i}`, diasRestantes: 0 })
    );
    const { cuerpo } = formatearMensajeNotificacion(proximos);
    expect(cuerpo).toMatch(/y \d+ más/);
  });

  it('exactamente 3 compromisos - cuerpo NO agrega "y N más"', () => {
    const proximos = Array.from({ length: 3 }, (_, i) =>
      compromiso({ id: `c${i}`, descripcion: `Pago ${i}`, diasRestantes: 0 })
    );
    const { cuerpo } = formatearMensajeNotificacion(proximos);
    expect(cuerpo).not.toMatch(/y \d+ más/);
  });

  it('devuelve objeto con claves titulo y cuerpo', () => {
    const result = formatearMensajeNotificacion([compromiso()]);
    expect(result).toHaveProperty('titulo');
    expect(result).toHaveProperty('cuerpo');
    expect(typeof result.titulo).toBe('string');
    expect(typeof result.cuerpo).toBe('string');
  });
});
