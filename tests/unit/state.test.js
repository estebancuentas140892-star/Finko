import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S, EventBus, createInitialState } from '../../modules/core/state.js';
import { SMMLV } from '../../modules/core/constants.js';

// Reset del singleton antes de cada test: S y EventBus son compartidos.
beforeEach(() => {
  Object.assign(S, createInitialState());
  EventBus._listeners = Object.create(null);
});

describe('S - schema v3 inicial', () => {
  it('expone todos los campos del schema v3', () => {
    expect(S).toHaveProperty('_version');
    expect(S).toHaveProperty('onboarded');
    expect(S).toHaveProperty('perfil');
    expect(S).toHaveProperty('cuentas');
    expect(S).toHaveProperty('ingresos');
    expect(S).toHaveProperty('gastos');
    expect(S).toHaveProperty('compromisos');
    expect(S).toHaveProperty('metas');
    expect(S).toHaveProperty('apartados');
    expect(S).toHaveProperty('presupuestos');
    expect(S).toHaveProperty('personales');
    expect(S).toHaveProperty('ahorro');
    expect(S).toHaveProperty('inversiones');
  });

  it('arranca con _version = 13', () => {
    expect(S._version).toBe(13);
  });

  it('arranca con onboarded en false', () => {
    expect(S.onboarded).toBe(false);
  });

  it('arranca con cuentas, ingresos, gastos, compromisos, metas, presupuestos y personales como arrays vacíos', () => {
    expect(S.cuentas).toEqual([]);
    expect(S.ingresos).toEqual([]);
    expect(S.gastos).toEqual([]);
    expect(S.compromisos).toEqual([]);
    expect(S.metas).toEqual([]);
    expect(S.apartados).toEqual([]);
    expect(S.presupuestos).toEqual([]);
    expect(S.personales).toEqual([]);
    expect(S.inversiones).toEqual([]);
  });

  it('arranca con perfil semilla (nombre vacío + SMMLV vigente)', () => {
    expect(S.perfil).toEqual({ nombre: '', smmlv: SMMLV });
  });
});

describe('createInitialState()', () => {
  it('devuelve un objeto nuevo en cada llamada (no comparte referencia)', () => {
    const a = createInitialState();
    const b = createInitialState();
    expect(a).not.toBe(b);
    expect(a.cuentas).not.toBe(b.cuentas);
  });
});

describe('EventBus', () => {
  it('on() + emit() entrega data al listener', () => {
    const spy = vi.fn();
    EventBus.on('test:evento', spy);
    EventBus.emit('test:evento', { foo: 42 });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ foo: 42 });
  });

  it('off() elimina el listener', () => {
    const spy = vi.fn();
    EventBus.on('test:evento', spy);
    EventBus.off('test:evento', spy);
    EventBus.emit('test:evento', 'payload');

    expect(spy).not.toHaveBeenCalled();
  });

  it('emit() con 0 listeners no lanza', () => {
    expect(() => EventBus.emit('test:vacio', { x: 1 })).not.toThrow();
  });

  it('emit() aísla excepciones de los listeners (no rompe a los demás)', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const bueno = vi.fn();

    EventBus.on('test:err', () => { throw new Error('boom'); });
    EventBus.on('test:err', bueno);

    expect(() => EventBus.emit('test:err')).not.toThrow();
    expect(bueno).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });

  it('on() permite múltiples listeners para el mismo evento', () => {
    const a = vi.fn();
    const b = vi.fn();
    EventBus.on('test:multi', a);
    EventBus.on('test:multi', b);

    EventBus.emit('test:multi', 'x');
    expect(a).toHaveBeenCalledWith('x');
    expect(b).toHaveBeenCalledWith('x');
  });
});
