/**
 * por-completar.test.js - "Por completar" de Inicio (INI.1, ADR 149 D3).
 *
 * Cubre:
 * - gastosSinNombre(): gastos en "Otros" de los últimos 30 días que no dicen
 *   en qué fueron (sin nota, descripción ni subcategoría, sin compromiso).
 * - pendientesPorCompletar(): las dos piezas en orden, y la pregunta de
 *   SUS.2c que no se hace sobre "Otros" a secas.
 * - htmlPorCompletar() y renderPorCompletar(): la fila abre el gasto con
 *   `editar-gasto`, la pregunta trae sus dos respuestas, el ojo tapa montos y
 *   sin nada por completar la celda se oculta.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { S } from '../../modules/core/state.js';
import { gastosSinNombre, pendientesPorCompletar, DIAS_GASTO_SIN_NOMBRE } from '../../modules/infra/pendientes.js';
import { htmlPorCompletar, renderPorCompletar } from '../../modules/ui/por-completar.js';
import { SALDO_MASCARA_CUENTA } from '../../modules/infra/render.js';
import { f } from '../../modules/infra/utils.js';

const HOY = '2026-11-16';

const gasto = (id, o = {}) => ({ id, monto: 12_000, categoria: 'Otros', fecha: HOY, ...o });

// ── LÓGICA ───────────────────────────────────────────────────────

describe('gastosSinNombre()', () => {
  it('solo los de "Otros" que no dicen en qué fueron, del más reciente al más viejo', () => {
    const r = gastosSinNombre([
      gasto('a', { fecha: '2026-11-10' }),
      gasto('b', { fecha: '2026-11-15' }),
      gasto('con-nota', { nota: 'recarga' }),
      gasto('con-desc', { descripcion: 'Regalo' }),
      gasto('con-sub', { subcategoriaId: 'x' }),
      gasto('pago-fijo', { compromisoId: 'c1' }),
      gasto('mercado', { categoria: 'Mercado' }),
      gasto('sin-cat', { categoria: undefined, fecha: '2026-11-01' }),
    ], HOY);
    expect(r.map(g => g.id)).toEqual(['b', 'a', 'sin-cat']);
  });

  it('una nota hecha solo de espacios no cuenta como nombre', () => {
    expect(gastosSinNombre([gasto('a', { nota: '   ' })], HOY)).toHaveLength(1);
  });

  it(`mira los últimos ${DIAS_GASTO_SIN_NOMBRE} días, sin fechas futuras`, () => {
    const r = gastosSinNombre([
      gasto('limite', { fecha: '2026-10-17' }),
      gasto('viejo', { fecha: '2026-10-16' }),
      gasto('futuro', { fecha: '2026-11-17' }),
    ], HOY);
    expect(r.map(g => g.id)).toEqual(['limite']);
  });

  it('con datos raros no revienta', () => {
    expect(gastosSinNombre(null, HOY)).toEqual([]);
    expect(gastosSinNombre([null, {}], HOY)).toEqual([]);
    expect(gastosSinNombre([gasto('a')], 'mañana')).toEqual([]);
  });
});

describe('pendientesPorCompletar()', () => {
  it('sin nada a medias devuelve una lista vacía', () => {
    expect(pendientesPorCompletar({ gastos: [gasto('m', { categoria: 'Mercado' })], hoyISO: HOY })).toEqual([]);
  });

  it('los gastos sin nombre van juntos, con su total', () => {
    const [p] = pendientesPorCompletar({ gastos: [gasto('a', { monto: 10_000 }), gasto('b', { monto: 5_000 })], hoyISO: HOY });
    expect(p.tipo).toBe('gastos-sin-nombre');
    expect(p.gastos.map(g => g.id)).toEqual(['a', 'b']);
    expect(p.total).toBe(15_000);
  });

  it('trae la pregunta "¿es un gusto o algo que necesitas?" del concepto que se repite', () => {
    const domicilios = [1, 2, 3].map(i => gasto(`d${i}`, {
      categoria: 'Restaurantes', subcategoriaId: 'rest-domicilio', fecha: `2026-11-1${i}`, monto: 15_000,
    }));
    const r = pendientesPorCompletar({ gastos: domicilios, hoyISO: HOY });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ tipo: 'gusto-o-necesidad', concepto: 's:rest-domicilio', veces: 3, total: 45_000 });
  });

  it('ya contestada, la pregunta no vuelve', () => {
    const domicilios = [1, 2, 3].map(i => gasto(`d${i}`, {
      categoria: 'Restaurantes', subcategoriaId: 'rest-domicilio', fecha: `2026-11-1${i}`, monto: 15_000,
    }));
    const r = pendientesPorCompletar({
      gastos: domicilios, hoyISO: HOY,
      opcionesHormiga: { aprendidos: { 's:rest-domicilio': 'necesidad' } },
    });
    expect(r).toEqual([]);
  });

  it('a "Otros" sin nombre no se le pregunta si es gusto: primero hay que decir en qué fue', () => {
    const otros = [1, 2, 3].map(i => gasto(`o${i}`, { fecha: `2026-11-1${i}` }));
    const r = pendientesPorCompletar({ gastos: otros, hoyISO: HOY });
    expect(r.map(p => p.tipo)).toEqual(['gastos-sin-nombre']);
  });
});

// ── VISTA ────────────────────────────────────────────────────────

describe('htmlPorCompletar()', () => {
  const div = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };

  beforeEach(() => { S.config = { ...S.config, ocultarSaldo: false }; });

  it('un gasto sin nombre: dice cuánto y cuándo, y la fila abre ese gasto', () => {
    const d = div(htmlPorCompletar([{ tipo: 'gastos-sin-nombre', gastos: [gasto('g9', { monto: 8_000 })], total: 8_000 }], HOY));
    expect(d.querySelector('#por-completar-titulo').textContent).toBe('Por completar');
    expect(d.querySelector('.atencion-hoy__frase').textContent).toBe('Un gasto en Otros no dice en qué fue');
    expect(d.querySelector('.atencion-hoy__detalle').textContent).toBe(`${f(8_000)} · hoy`);
    const fila = d.querySelector('.atencion-hoy__control');
    expect(fila.dataset.action).toBe('editar-gasto');
    expect(fila.dataset.id).toBe('g9');
  });

  it('varios: cuántos, cuánto suman y abre el más reciente', () => {
    const gastos = [gasto('nuevo', { fecha: '2026-11-15' }), gasto('viejo', { fecha: '2026-11-02' })];
    const d = div(htmlPorCompletar([{ tipo: 'gastos-sin-nombre', gastos, total: 24_000 }], HOY));
    expect(d.querySelector('.atencion-hoy__frase').textContent).toBe('2 gastos en Otros no dicen en qué fueron');
    expect(d.querySelector('.atencion-hoy__detalle').textContent).toBe(`Suman ${f(24_000)} · el último, ayer`);
    expect(d.querySelector('.atencion-hoy__control').dataset.id).toBe('nuevo');
  });

  it('la pregunta trae sus dos respuestas, con la acción de Gastos', () => {
    const p = { tipo: 'gusto-o-necesidad', concepto: 's:rest-domicilio', etiqueta: 'Domicilios', veces: 3, total: 45_000 };
    const d = div(htmlPorCompletar([p], HOY));
    expect(d.querySelector('.atencion-hoy__frase').textContent).toBe('Domicilios: ¿es un gusto o algo que necesitas?');
    const botones = [...d.querySelectorAll('[data-action="gastos-gusto-o-necesidad"]')];
    expect(botones.map(b => b.dataset.respuesta)).toEqual(['gusto', 'necesidad']);
    expect(botones.every(b => b.dataset.concepto === 's:rest-domicilio' && b.dataset.etiqueta === 'Domicilios')).toBe(true);
  });

  it('con el ojo puesto, los montos se tapan', () => {
    S.config = { ...S.config, ocultarSaldo: true };
    const d = div(htmlPorCompletar([{ tipo: 'gastos-sin-nombre', gastos: [gasto('g1')], total: 12_000 }], HOY));
    expect(d.querySelector('.atencion-hoy__detalle').textContent).toBe(`${SALDO_MASCARA_CUENTA} · hoy`);
  });

  it('los textos del usuario se escapan', () => {
    const p = { tipo: 'gusto-o-necesidad', concepto: 'c:Otros|x', etiqueta: '<b>x</b>', veces: 3, total: 1 };
    const d = div(htmlPorCompletar([p], HOY));
    expect(d.querySelector('.atencion-hoy__frase').textContent).toContain('<b>x</b>');
  });
});

describe('renderPorCompletar()', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-por-completar" hidden></div>';
    S.gastos = [];
    S.config = { ...S.config, ocultarSaldo: false };
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 16, 12));
  });
  afterEach(() => vi.useRealTimers());

  const el = () => document.getElementById('panel-por-completar');

  it('sin nada por completar, la celda queda oculta y vacía', () => {
    renderPorCompletar();
    expect(el().hidden).toBe(true);
    expect(el().innerHTML).toBe('');
  });

  it('con un gasto sin nombre, aparece', () => {
    S.gastos = [gasto('g1')];
    renderPorCompletar();
    expect(el().hidden).toBe(false);
    expect(el().querySelector('[data-action="editar-gasto"]').dataset.id).toBe('g1');
  });

  it('no revienta sin el contenedor', () => {
    document.body.innerHTML = '';
    expect(() => renderPorCompletar()).not.toThrow();
  });
});
