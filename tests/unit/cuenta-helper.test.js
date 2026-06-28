/**
 * cuenta-helper.test.js - Tests del helper de selección inteligente de cuenta.
 *
 * `cuenta-helper.js` es infra DOM-bound: la mayor parte de su código crea
 * overlays y gestiona foco. Lo excluimos de coverage (como router.js, a11y.js).
 * Estos tests verifican las ramas de decisión core y que el DOM se construye
 * correctamente en happy-dom.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  resolverCuenta,
  renderSelectorCuenta,
  resolverPagoConPreferida,
} from '../../modules/infra/cuenta-helper.js';

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
    expect(titulo.textContent).toContain('Necesitas una cuenta primero');
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

// ── renderSelectorCuenta() ───────────────────────────────────────

describe('renderSelectorCuenta()', () => {
  it('sin cuentas activas: devuelve cadena vacía', () => {
    expect(renderSelectorCuenta([])).toBe('');
    expect(renderSelectorCuenta(undefined)).toBe('');
    expect(renderSelectorCuenta([cuentaActiva({ activa: false })])).toBe('');
  });

  it('renderiza un radio name="cuentaId" por cuenta activa', () => {
    const html = renderSelectorCuenta([
      cuentaActiva({ id: 'c1', nombre: 'Bancolombia', saldo: 600_000 }),
      cuentaActiva({ id: 'c2', nombre: 'Nequi', saldo: 400_000 }),
    ]);
    expect(html).toContain('cuenta-sel__lista');
    expect(html).toContain('type="radio"');
    expect(html).toContain('name="cuentaId"');
    expect(html).toContain('value="c1"');
    expect(html).toContain('value="c2"');
  });

  it('pre-selecciona la cuenta de mayor saldo por defecto', () => {
    const html = renderSelectorCuenta([
      cuentaActiva({ id: 'menor', saldo: 100_000 }),
      cuentaActiva({ id: 'mayor', saldo: 900_000 }),
    ]);
    expect(html).toMatch(/value="mayor"[^>]*checked|checked[^>]*value="mayor"/);
  });

  it('respeta selectedId si la cuenta existe', () => {
    const html = renderSelectorCuenta([
      cuentaActiva({ id: 'c1', saldo: 900_000 }),
      cuentaActiva({ id: 'c2', saldo: 100_000 }),
    ], { selectedId: 'c2' });
    expect(html).toMatch(/value="c2"[^>]*checked|checked[^>]*value="c2"/);
  });
});

// ── resolverPagoConPreferida() ───────────────────────────────────

describe('resolverPagoConPreferida()', () => {
  it('0 cuentas: devuelve null y abre el diálogo guiado', async () => {
    const resultado = await resolverPagoConPreferida([], 100_000, null);
    expect(resultado).toBeNull();
    expect(document.getElementById('cta-sin-cuentas-title')).not.toBeNull();
  });

  it('la cuenta preferida cubre el monto: un solo split, sin DOM', async () => {
    const cuentas = [
      cuentaActiva({ id: 'c1', saldo: 600_000 }),
      cuentaActiva({ id: 'c2', saldo: 400_000 }),
    ];
    const splits = await resolverPagoConPreferida(cuentas, 500_000, 'c1');
    expect(splits).toEqual([{ cuentaId: 'c1', monto: 500_000 }]);
    expect(document.querySelector('.modal-overlay')).toBeNull();
  });

  it('preferida no alcanza y es la única cuenta: split por el total (caller confirma)', async () => {
    const cuentas = [cuentaActiva({ id: 'c1', saldo: 100_000 })];
    const splits = await resolverPagoConPreferida(cuentas, 500_000, 'c1');
    expect(splits).toEqual([{ cuentaId: 'c1', monto: 500_000 }]);
    expect(document.querySelector('.modal-overlay')).toBeNull();
  });

  it('preferida no alcanza y hay más cuentas: abre el picker de reparto con aviso', async () => {
    const cuentas = [
      cuentaActiva({ id: 'c1', nombre: 'Nequi', saldo: 100_000 }),
      cuentaActiva({ id: 'c2', nombre: 'Bancolombia', saldo: 900_000 }),
    ];
    const promesa = resolverPagoConPreferida(cuentas, 500_000, 'c1');
    await new Promise(r => setTimeout(r, 0));

    expect(document.getElementById('cuenta-multi-title')).not.toBeNull();
    expect(document.querySelector('.cuenta-multi__aviso')).not.toBeNull();

    // Confirmar el reparto pre-sembrado (cubre con c1 + c2).
    document.querySelector('[data-role="confirmar"]')?.click();
    const splits = await promesa;
    expect(Array.isArray(splits)).toBe(true);
    expect(splits.reduce((s, x) => s + x.monto, 0)).toBe(500_000);
  });
});
