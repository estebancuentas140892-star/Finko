/**
 * cuenta-helper.test.js - Tests del helper de selección inteligente de cuenta.
 *
 * `cuenta-helper.js` es infra DOM-bound: la mayor parte de su código crea
 * overlays y gestiona foco. Lo excluimos de coverage (como router.js, a11y.js).
 * Estos tests verifican las ramas de decisión core y que el DOM se construye
 * correctamente en happy-dom.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { resolverCuenta } from '../../modules/infra/cuenta-helper.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const cuentaActiva = (overrides = {}) => ({
  id:     'c1',
  nombre: 'Nequi',
  saldo:  500_000,
  activa: true,
  ...overrides,
});

// ── LIMPIEZA DE DOM ──────────────────────────────────────────────

afterEach(() => {
  // Quitar cualquier modal-overlay creado por el helper en cada test.
  document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
});

// ── RAMA: 1 CUENTA ───────────────────────────────────────────────

describe('resolverCuenta() - 1 cuenta activa', () => {
  it('devuelve el id de la única cuenta sin crear DOM', async () => {
    const cuentas = [cuentaActiva({ id: 'abc' })];
    const resultado = await resolverCuenta(cuentas);
    expect(resultado).toBe('abc');
    // No debe haber creado ningún overlay.
    expect(document.querySelector('.modal-overlay')).toBeNull();
  });

  it('ignora cuentas inactivas y retorna la activa', async () => {
    const cuentas = [
      cuentaActiva({ id: 'c-inactiva', activa: false }),
      cuentaActiva({ id: 'c-activa', activa: true }),
    ];
    const resultado = await resolverCuenta(cuentas);
    expect(resultado).toBe('c-activa');
  });

  it('ignora cuentas con activa=undefined como activas (retrocompat)', async () => {
    // Cuentas sin el campo 'activa' se tratan como activas.
    const { activa: _a, ...sinActiva } = cuentaActiva({ id: 'c-sin-campo' });
    const resultado = await resolverCuenta([sinActiva]);
    expect(resultado).toBe('c-sin-campo');
  });
});

// ── RAMA: 0 CUENTAS ─────────────────────────────────────────────

describe('resolverCuenta() - 0 cuentas activas', () => {
  it('devuelve null con lista vacía', async () => {
    const resultado = await resolverCuenta([]);
    expect(resultado).toBeNull();
  });

  it('devuelve null con lista undefined', async () => {
    const resultado = await resolverCuenta(undefined);
    expect(resultado).toBeNull();
  });

  it('devuelve null con solo cuentas inactivas', async () => {
    const cuentas = [
      cuentaActiva({ id: 'c1', activa: false }),
      cuentaActiva({ id: 'c2', activa: false }),
    ];
    const resultado = await resolverCuenta(cuentas);
    expect(resultado).toBeNull();
  });

  it('crea el diálogo guiado en el DOM', async () => {
    await resolverCuenta([]);
    // El diálogo debe haberse añadido al body.
    const titulo = document.getElementById('cta-sin-cuentas-title');
    expect(titulo).not.toBeNull();
    expect(titulo.textContent).toContain('Necesitás una cuenta primero');
  });
});

// ── RAMA: VARIAS CUENTAS ─────────────────────────────────────────

describe('resolverCuenta() - varias cuentas activas', () => {
  it('crea el picker en el DOM con botones por cuenta', async () => {
    const c1 = cuentaActiva({ id: 'c1', nombre: 'Nequi' });
    const c2 = cuentaActiva({ id: 'c2', nombre: 'Bancolombia' });

    // No awaiteamos aún: queremos inspeccionar el DOM mientras el picker está abierto.
    const promesa = resolverCuenta([c1, c2]);

    // Dar un tick para que el DOM se construya.
    await new Promise(r => setTimeout(r, 0));

    const picker = document.getElementById('cuenta-picker-title');
    expect(picker).not.toBeNull();
    expect(document.querySelectorAll('[data-role="elegir"]').length).toBe(2);

    // Cerrar el picker cancelando para que la promesa resuelva y no quede colgada.
    document.querySelector('[data-role="cancelar"]')?.click();
    const resultado = await promesa;
    expect(resultado).toBeNull();
  });

  it('resuelve con el id de la cuenta seleccionada', async () => {
    const c1 = cuentaActiva({ id: 'id-nequi',       nombre: 'Nequi' });
    const c2 = cuentaActiva({ id: 'id-bancolombia',  nombre: 'Bancolombia' });

    const promesa = resolverCuenta([c1, c2]);
    await new Promise(r => setTimeout(r, 0));

    // Simular selección de la segunda cuenta.
    const btn = document.querySelector('[data-cuenta-id="id-bancolombia"]');
    expect(btn).not.toBeNull();
    btn.click();

    const resultado = await promesa;
    expect(resultado).toBe('id-bancolombia');
  });

  it('resuelve con null si el usuario cancela el picker (Escape)', async () => {
    const c1 = cuentaActiva({ id: 'c1' });
    const c2 = cuentaActiva({ id: 'c2' });

    const promesa = resolverCuenta([c1, c2]);
    await new Promise(r => setTimeout(r, 0));

    // Simular tecla Escape.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    const resultado = await promesa;
    expect(resultado).toBeNull();
  });
});
