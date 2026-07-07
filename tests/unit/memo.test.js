/**
 * memo.test.js - memoización de derivaciones puras costosas (PERF.2).
 *
 * Cubre:
 * - Cache hit: mismos args (por referencia) + sin state:change relevante → no recalcula.
 * - Cache miss por cambio de referencia en los args (ej. reasignación de S.gastos en tests).
 * - Cache miss por state:change en una sección observada, aunque los args sean la misma referencia.
 * - Sin cache miss por state:change en una sección NO observada.
 * - extraerClave: compara los valores reales aunque el caller pase un envoltorio nuevo cada vez.
 */

import { describe, it, expect, vi } from 'vitest';
import { memoizar } from '../../modules/infra/memo.js';
import { EventBus } from '../../modules/core/state.js';

describe('memoizar()', () => {
  it('devuelve el resultado cacheado si los args (misma referencia) no cambiaron', () => {
    const fn = vi.fn((arr) => arr.length);
    const memo = memoizar(fn, ['gastos']);

    const arr = [1, 2, 3];
    expect(memo(arr)).toBe(3);
    expect(memo(arr)).toBe(3);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('recalcula si la referencia del argumento cambió', () => {
    const fn = vi.fn((arr) => arr.length);
    const memo = memoizar(fn, ['gastos']);

    memo([1, 2, 3]);
    memo([1, 2, 3, 4]);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('recalcula tras un state:change en una sección observada, aunque los args sean la misma referencia', () => {
    const fn = vi.fn((arr) => arr.length);
    const memo = memoizar(fn, ['gastos']);
    const arr = [1, 2, 3];

    memo(arr);
    EventBus.emit('state:change', { section: 'gastos' });
    memo(arr);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('NO recalcula tras un state:change en una sección no observada', () => {
    const fn = vi.fn((arr) => arr.length);
    const memo = memoizar(fn, ['gastos']);
    const arr = [1, 2, 3];

    memo(arr);
    EventBus.emit('state:change', { section: 'metas' });
    memo(arr);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('ignora un evento state:change sin section', () => {
    const fn = vi.fn((arr) => arr.length);
    const memo = memoizar(fn, ['gastos']);
    const arr = [1, 2, 3];

    memo(arr);
    EventBus.emit('state:change', {});
    EventBus.emit('state:change');
    memo(arr);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('distingue por sección: dos memos independientes solo invalidan con su propia sección', () => {
    const fnA = vi.fn((arr) => arr.length);
    const fnB = vi.fn((arr) => arr.length);
    const memoA = memoizar(fnA, ['gastos']);
    const memoB = memoizar(fnB, ['compromisos']);
    const arr = [1, 2, 3];

    memoA(arr);
    memoB(arr);
    EventBus.emit('state:change', { section: 'gastos' });
    memoA(arr);
    memoB(arr);

    expect(fnA).toHaveBeenCalledTimes(2); // invalidado por 'gastos'
    expect(fnB).toHaveBeenCalledTimes(1); // 'compromisos' no cambió
  });

  it('extraerClave compara los valores reales, no el envoltorio (objeto nuevo cada llamada)', () => {
    const fn = vi.fn(({ gastos }) => gastos.length);
    const memo = memoizar(fn, ['gastos'], (fuentes) => [fuentes.gastos]);

    const gastos = [1, 2, 3];
    memo({ gastos }); // envoltorio #1
    memo({ gastos }); // envoltorio #2, mismo array interno

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('extraerClave detecta el cambio cuando el array interno sí cambió', () => {
    const fn = vi.fn(({ gastos }) => gastos.length);
    const memo = memoizar(fn, ['gastos'], (fuentes) => [fuentes.gastos]);

    memo({ gastos: [1, 2, 3] });
    memo({ gastos: [1, 2, 3, 4] });

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('primera llamada siempre calcula (sin cache previa)', () => {
    const fn = vi.fn(() => 42);
    const memo = memoizar(fn, []);
    expect(memo()).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('distinta cantidad de args cuenta como cambio', () => {
    const fn = vi.fn((...args) => args.length);
    const memo = memoizar(fn, ['gastos']);

    memo(1, 2);
    memo(1, 2, 3);

    expect(fn).toHaveBeenCalledTimes(2);
  });
});
