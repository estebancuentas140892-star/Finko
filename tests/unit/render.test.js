/**
 * render.test.js - updSaldo(): hero del dashboard con el ojo de ocultar
 * el dinero disponible (IN.2).
 *
 * Cubre:
 * - Monto visible formateado cuando no hay preferencia guardada.
 * - Máscara SALDO_MASCARA cuando S.config.ocultarSaldo === true, sin que el
 *   monto real toque el DOM.
 * - Lectura defensiva: solo `true` literal oculta (strings/números no).
 * - Sync del botón #saldo-ojo: aria-pressed + swap de icono ojo/ojo tachado.
 * - Empty state sin cuentas: guía visible, ojo/valor/desc ocultos.
 * - Acción `saldo-visibilidad` (actions.js): flip + re-render.
 *
 * Nota: los tests corren con location.hash = '#gast' (fuera del dashboard)
 * para que updSaldo escriba el texto directo sin countUp: las aserciones
 * son síncronas y no dependen de requestAnimationFrame.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../../modules/core/state.js';
import { updSaldo, SALDO_MASCARA } from '../../modules/infra/render.js';
import { initAcciones, dispatch } from '../../modules/ui/actions.js';

// ── SETUP ────────────────────────────────────────────────────────────────────

/** Réplica mínima del hero de index.html (ids reales que updSaldo consume). */
function montarHero() {
  document.body.innerHTML = `
    <svg class="bento__icon icon" id="hero-saldo-icon"><use href="#i-saldo"/></svg>
    <p class="bento__label" id="hero-saldo-label">Tu dinero disponible hoy</p>
    <div class="hero-saldo">
      <p class="bento__value" id="saldo-total">$0</p>
      <button class="btn btn-ghost btn-icon hero-saldo__ojo" type="button" id="saldo-ojo"
              data-action="saldo-visibilidad" aria-pressed="false"
              aria-label="Ocultar tu dinero disponible">
        <svg class="icon"><use href="#i-eye"/></svg>
      </button>
    </div>
    <p class="bento__desc" id="saldo-desc">efectivo + cuentas bancarias</p>
    <div id="hero-guia-saldo" hidden></div>`;
}

const cuenta = (saldo, overrides = {}) => ({
  id: 'c1', nombre: 'Efectivo', tipo: 'efectivo', saldo, activa: true, ...overrides,
});

beforeEach(() => {
  montarHero();
  // Fuera del dashboard: updSaldo escribe el texto directo, sin animación.
  location.hash = '#gast';
  S.cuentas = [cuenta(500_000)];
  S.config  = { notificaciones: false };
});

const elSaldo = () => document.getElementById('saldo-total');
const elOjo   = () => document.getElementById('saldo-ojo');
const hrefOjo = () => elOjo().querySelector('use').getAttribute('href');

// ── SALDO VISIBLE (default) ──────────────────────────────────────────────────

describe('updSaldo() - saldo visible (sin preferencia)', () => {
  it('muestra el monto formateado y el ojo sin presionar', () => {
    updSaldo();
    expect(elSaldo().textContent).toBe('$500.000');
    expect(elOjo().hidden).toBe(false);
    expect(elOjo().getAttribute('aria-pressed')).toBe('false');
    expect(hrefOjo()).toBe('#i-eye');
  });

  it('lectura defensiva: valores no booleanos en ocultarSaldo no ocultan', () => {
    for (const raro of ['true', 1, {}, null]) {
      S.config.ocultarSaldo = raro;
      updSaldo();
      expect(elSaldo().textContent).toBe('$500.000');
      expect(elOjo().getAttribute('aria-pressed')).toBe('false');
    }
  });

  it('S.config ausente no revienta y muestra el monto', () => {
    S.config = undefined;
    expect(() => updSaldo()).not.toThrow();
    expect(elSaldo().textContent).toBe('$500.000');
  });
});

// ── SALDO OCULTO (IN.2) ──────────────────────────────────────────────────────

describe('updSaldo() - saldo oculto (ocultarSaldo === true)', () => {
  beforeEach(() => {
    S.config.ocultarSaldo = true;
  });

  it('enmascara el monto con SALDO_MASCARA', () => {
    updSaldo();
    expect(elSaldo().textContent).toBe(SALDO_MASCARA);
  });

  it('el monto real no aparece en ninguna parte del DOM', () => {
    updSaldo();
    expect(document.body.innerHTML).not.toContain('500.000');
  });

  it('el botón queda presionado y con el ojo tachado', () => {
    updSaldo();
    expect(elOjo().getAttribute('aria-pressed')).toBe('true');
    expect(hrefOjo()).toBe('#i-eye-off');
  });

  it('volver a visible restaura monto, icono y aria-pressed', () => {
    updSaldo();
    S.config.ocultarSaldo = false;
    updSaldo();
    expect(elSaldo().textContent).toBe('$500.000');
    expect(elOjo().getAttribute('aria-pressed')).toBe('false');
    expect(hrefOjo()).toBe('#i-eye');
  });
});

// ── EMPTY STATE (sin cuentas) ────────────────────────────────────────────────

describe('updSaldo() - sin cuentas registradas', () => {
  beforeEach(() => {
    S.cuentas = [];
  });

  it('muestra la guía y oculta valor, descripción y ojo', () => {
    updSaldo();
    expect(document.getElementById('hero-guia-saldo').hidden).toBe(false);
    expect(document.getElementById('saldo-desc').hidden).toBe(true);
    expect(elSaldo().hidden).toBe(true);
    expect(elOjo().hidden).toBe(true);
  });

  it('con ocultarSaldo true el texto sigue siendo $0 (el empty state manda)', () => {
    S.config.ocultarSaldo = true;
    updSaldo();
    expect(elSaldo().textContent).toBe('$0');
  });

  it('cuentas inactivas cuentan como sin cuentas', () => {
    S.cuentas = [cuenta(900_000, { activa: false })];
    updSaldo();
    expect(document.getElementById('hero-guia-saldo').hidden).toBe(false);
    expect(elOjo().hidden).toBe(true);
  });
});

// ── ACCIÓN saldo-visibilidad (actions.js) ────────────────────────────────────

describe('acción saldo-visibilidad', () => {
  beforeEach(() => {
    initAcciones();
    updSaldo();
  });

  it('un click oculta: persiste la preferencia y enmascara', () => {
    dispatch(elOjo(), new Event('click'));
    expect(S.config.ocultarSaldo).toBe(true);
    expect(elSaldo().textContent).toBe(SALDO_MASCARA);
    expect(elOjo().getAttribute('aria-pressed')).toBe('true');
  });

  it('el segundo click vuelve a mostrar el monto', () => {
    dispatch(elOjo(), new Event('click'));
    dispatch(elOjo(), new Event('click'));
    expect(S.config.ocultarSaldo).toBe(false);
    expect(elSaldo().textContent).toBe('$500.000');
    expect(elOjo().getAttribute('aria-pressed')).toBe('false');
  });

  it('con un valor heredado raro en ocultarSaldo, el primer click cae en ocultar', () => {
    S.config.ocultarSaldo = 'si';
    dispatch(elOjo(), new Event('click'));
    expect(S.config.ocultarSaldo).toBe(true);
    expect(elSaldo().textContent).toBe(SALDO_MASCARA);
  });
});
