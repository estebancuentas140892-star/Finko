/**
 * gastos-detalle.test.js - la hoja de un gasto trae datos propios (ADR 119 D2).
 *
 * De qué cuenta salió, la nota, cómo va el límite de su categoría en ese mes,
 * cuántos gastos tiene la categoría ese mes (con la salida a Movimientos) y
 * qué pasa al borrarlo. Las acciones viajan por `registrar-abrir`, el mismo
 * puente de la hoja genérica.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { S } from '../../modules/core/state.js';
import { f } from '../../modules/infra/utils.js';
import { htmlDetalleGasto, cuandoGasto } from '../../modules/dominio/gastos/detalle.js';

const gasto = (o = {}) => ({
  id: 'g1', monto: 46_900, categoria: 'Restaurantes', fecha: '2026-10-27',
  cuentaId: 'c1', nota: 'Rappi', ...o,
});

describe('cuandoGasto()', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 28, 10)); });
  afterEach(() => vi.useRealTimers());

  it('hoy y ayer se nombran, con el día de la semana y el mes en minúscula', () => {
    expect(cuandoGasto('2026-10-28')).toBe('Hoy, miércoles 28 de octubre');
    expect(cuandoGasto('2026-10-27')).toBe('Ayer, martes 27 de octubre');
    expect(cuandoGasto('2026-10-02')).toBe('Viernes 2 de octubre');
  });

  it('el año va solo si no es el actual', () => {
    expect(cuandoGasto('2025-12-31')).toBe('Miércoles 31 de diciembre de 2025');
  });
});

describe('htmlDetalleGasto()', () => {
  const montar = (g) => {
    document.body.innerHTML = `<div id="cuerpo">${htmlDetalleGasto(g)}</div>`;
    return document.getElementById('cuerpo');
  };
  const texto = (el) => el?.textContent.replace(/\s+/g, ' ').trim() ?? '';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 28, 10));
    S.cuentas = [{ id: 'c1', nombre: 'Bancolombia Ahorros', saldo: 500_000, activa: true }];
    S.gastos = [
      gasto(),
      gasto({ id: 'g2', monto: 120_000, fecha: '2026-10-10' }),
      gasto({ id: 'g3', monto: 111_900, fecha: '2026-10-03' }),
      gasto({ id: 'g4', monto: 50_000, fecha: '2026-09-30' }),
      gasto({ id: 'g5', monto: 9_000, categoria: 'Café', fecha: '2026-10-27' }),
    ];
    S.presupuestos = [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 250_000, activo: true }];
    S.config = {};
  });

  afterEach(() => {
    vi.useRealTimers();
    S.presupuestos = [];
    S.config = {};
  });

  it('título, monto, cuándo y sus datos en filas', () => {
    const el = montar(gasto());
    expect(texto(el.querySelector('#detalle-fila-titulo'))).toBe('Restaurantes');
    expect(texto(el.querySelector('.detalle-fila__monto'))).toBe(f(46_900));
    expect(texto(el.querySelector('.detalle-fila__cuando'))).toBe('Ayer, martes 27 de octubre');
    const filas = [...el.querySelectorAll('.detalle-gasto__dato')]
      .map(d => `${texto(d.querySelector('dt'))} ${texto(d.querySelector('dd'))}`);
    expect(filas).toEqual(['Salió de Bancolombia Ahorros', 'Nota Rappi', 'Categoría Restaurantes']);
  });

  it('dice cómo va el límite de la categoría en el mes del gasto, con su salida', () => {
    const el = montar(gasto());
    const linea = el.querySelector('.detalle-gasto__limite');
    expect(texto(linea)).toBe(`Restaurantes lleva ${f(278_800)} de su límite de ${f(250_000)} en octubre. Ver límite`);
    const ver = linea.querySelector('[data-action="ir-a-seccion"]');
    expect(ver.dataset.target).toBe('presupuesto');
  });

  it('sin límite en la categoría no hay línea', () => {
    S.presupuestos = [];
    expect(montar(gasto()).querySelector('.detalle-gasto__limite')).toBeNull();
  });

  it('cuenta los gastos de la categoría ese mes y lleva a Movimientos con el filtro', () => {
    const el = montar(gasto());
    const ver = el.querySelector('[data-action="gasto-ver-categoria"]');
    expect(texto(ver)).toContain('Los 3 gastos de Restaurantes en octubre');
    expect(texto(ver)).toContain('Se abre Movimientos con el filtro puesto');
    expect(ver.dataset.categoria).toBe('Restaurantes');
    expect(ver.dataset.desde).toBe('2026-10-01');
    expect(ver.dataset.hasta).toBe('2026-10-31');
  });

  it('con uno solo en el mes, lo dice en singular', () => {
    expect(texto(montar(gasto({ id: 'g5', categoria: 'Café', monto: 9_000 }))
      .querySelector('[data-action="gasto-ver-categoria"]'))).toContain('El único gasto de Café en octubre');
  });

  it('repetir, editar y borrar viajan por el puente de la hoja', () => {
    const el = montar(gasto());
    const destinos = [...el.querySelectorAll('[data-action="registrar-abrir"]')]
      .map(b => [b.dataset.targetAction, b.dataset.id, texto(b)]);
    expect(destinos).toEqual([
      ['repetir-gasto', 'g1', 'Repetir hoy'],
      ['editar-gasto', 'g1', 'Editar'],
      ['eliminar-gasto', 'g1', 'Borrar este gasto'],
    ]);
  });

  it('dice qué pasa al borrar: el monto vuelve a su cuenta', () => {
    const el = montar(gasto());
    expect(texto(el.querySelector('.detalle-gasto__al-borrar')))
      .toBe(`Te pediremos confirmar. Los ${f(46_900)} vuelven a Bancolombia Ahorros.`);
  });

  it('un gasto sin cuenta, o importado, no promete devolver nada', () => {
    expect(texto(montar(gasto({ cuentaId: null })).querySelector('.detalle-gasto__al-borrar')))
      .toBe('Te pediremos confirmar.');
    expect(texto(montar(gasto({ sinEfectoSaldo: true })).querySelector('.detalle-gasto__al-borrar')))
      .toBe('Te pediremos confirmar.');
  });

  it('con el ojo puesto se tapan los montos', () => {
    S.config = { ocultarSaldo: true };
    const el = montar(gasto());
    expect(el.textContent).not.toContain('46.900');
    expect(el.textContent).not.toContain('278.800');
  });
});
