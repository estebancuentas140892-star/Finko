/**
 * movimientos.test.js - dominio de solo lectura para la Actividad reciente
 * de Inicio (TX.8a, ADR 028 D5).
 *
 * Cubre:
 * - Normalización de gastos/ingresos puntuales/aportes al shape común.
 * - Orden (más reciente primero) y límite de movimientosRecientes().
 * - renderActividadReciente(): vacío/oculto sin movimientos, ícono/monto/
 *   dirección correctos, límite de 5 en el DOM.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  movimientosDesdeGastos,
  movimientosDesdeIngresosPuntuales,
  movimientosDesdeAportes,
  movimientosRecientes,
  movimientosCompletos,
} from '../../modules/dominio/movimientos/logic.js';
import { renderActividadReciente, renderMovimientosCompletos } from '../../modules/dominio/movimientos/view.js';
import { S } from '../../modules/core/state.js';

const cuenta = (id, nombre) => ({ id, nombre, saldo: 0, banco: 'Nequi', tipo: 'Ahorros', activa: true });

// ── FIXTURES ─────────────────────────────────────────────────────

const gasto = (overrides = {}) => ({
  id: 'g1', descripcion: 'Mercado', monto: 50_000, categoria: 'Mercado',
  fecha: '2026-07-04', cuentaId: 'c1', nota: '', ...overrides,
});

const ingresoPuntual = (overrides = {}) => ({
  id: 'ip1', descripcion: 'Venta bici', monto: 300_000, categoria: 'Venta',
  fecha: '2026-07-03', cuentaId: 'c1', ...overrides,
});

const aporte = (overrides = {}) => ({
  id: 'a1', monto: 100_000, fecha: '2026-07-02', ...overrides,
});

// ── movimientosDesdeGastos() ──────────────────────────────────────

describe('movimientosDesdeGastos()', () => {
  it('normaliza un gasto a movimiento de egreso con ícono de su categoría', () => {
    const [m] = movimientosDesdeGastos([gasto()]);
    expect(m).toMatchObject({
      id: 'g1', tipo: 'gasto', descripcion: 'Mercado', monto: 50_000,
      direccion: 'egreso', icono: 'c-mercado', cuentaId: 'c1', fecha: '2026-07-04',
    });
  });

  it('categoría interna "Deudas" usa el ícono i-deudas (revela el origen)', () => {
    const [m] = movimientosDesdeGastos([gasto({ categoria: 'Deudas', descripcion: 'Abono: Préstamo moto' })]);
    expect(m.icono).toBe('i-deudas');
  });

  it('categoría interna "Gastos fijos" usa el ícono i-recurring', () => {
    const [m] = movimientosDesdeGastos([gasto({ categoria: 'Gastos fijos', descripcion: 'Pago: Arriendo' })]);
    expect(m.icono).toBe('i-recurring');
  });

  it('un gasto cotidiano tiene dominio "gastos"', () => {
    const [m] = movimientosDesdeGastos([gasto()]);
    expect(m.dominio).toBe('gastos');
  });

  it('categoría interna "Deudas" tiene dominio "compromisos" (TX.8b)', () => {
    const [m] = movimientosDesdeGastos([gasto({ categoria: 'Deudas' })]);
    expect(m.dominio).toBe('compromisos');
  });

  it('categoría interna "Gastos fijos" tiene dominio "compromisos" (TX.8b)', () => {
    const [m] = movimientosDesdeGastos([gasto({ categoria: 'Gastos fijos' })]);
    expect(m.dominio).toBe('compromisos');
  });

  it('categoría sin mapeo cae al ícono genérico i-gastos', () => {
    const [m] = movimientosDesdeGastos([gasto({ categoria: 'Categoría inexistente' })]);
    expect(m.icono).toBe('i-gastos');
  });

  it('resuelve el ícono de una categoría personalizada (TX.9b)', () => {
    const personalizadas = [{ nombre: 'Gimnasio', icono: 'c-pesa' }];
    const [m] = movimientosDesdeGastos([gasto({ categoria: 'Gimnasio' })], personalizadas);
    expect(m.icono).toBe('c-pesa');
  });

  it('sin personalizadas (default []), una categoría desconocida sigue cayendo al genérico', () => {
    const [m] = movimientosDesdeGastos([gasto({ categoria: 'Gimnasio' })]);
    expect(m.icono).toBe('i-gastos');
  });

  it('sin cuentaId, cuentaId queda null', () => {
    const [m] = movimientosDesdeGastos([gasto({ cuentaId: undefined })]);
    expect(m.cuentaId).toBeNull();
  });

  it('argumento no-array devuelve []', () => {
    expect(movimientosDesdeGastos(null)).toEqual([]);
    expect(movimientosDesdeGastos(undefined)).toEqual([]);
  });
});

// ── movimientosDesdeIngresosPuntuales() ───────────────────────────

describe('movimientosDesdeIngresosPuntuales()', () => {
  it('normaliza un ingreso puntual a movimiento de ingreso', () => {
    const [m] = movimientosDesdeIngresosPuntuales([ingresoPuntual()]);
    expect(m).toMatchObject({
      id: 'ip1', tipo: 'ingreso', descripcion: 'Venta bici', monto: 300_000,
      direccion: 'ingreso', icono: 'c-bolsa', cuentaId: 'c1', fecha: '2026-07-03',
    });
  });

  it('categoría sin mapeo cae al ícono genérico i-saldo', () => {
    const [m] = movimientosDesdeIngresosPuntuales([ingresoPuntual({ categoria: null })]);
    expect(m.icono).toBe('i-saldo');
  });

  it('tiene dominio "ingresos"', () => {
    const [m] = movimientosDesdeIngresosPuntuales([ingresoPuntual()]);
    expect(m.dominio).toBe('ingresos');
  });

  it('argumento no-array devuelve []', () => {
    expect(movimientosDesdeIngresosPuntuales(null)).toEqual([]);
  });
});

// ── movimientosDesdeAportes() ─────────────────────────────────────

describe('movimientosDesdeAportes()', () => {
  it('normaliza un aporte a movimiento de egreso sin cuenta, ícono i-ahorro', () => {
    const [m] = movimientosDesdeAportes([aporte()]);
    expect(m).toMatchObject({
      id: 'a1', tipo: 'aporte', monto: 100_000, direccion: 'egreso',
      icono: 'i-ahorro', cuentaId: null, fecha: '2026-07-02',
    });
  });

  it('usa la nota como descripción si existe', () => {
    const [m] = movimientosDesdeAportes([aporte({ nota: 'Prima de junio' })]);
    expect(m.descripcion).toBe('Prima de junio');
  });

  it('sin nota, describe como "Aporte al fondo de emergencia"', () => {
    const [m] = movimientosDesdeAportes([aporte({ nota: undefined })]);
    expect(m.descripcion).toBe('Aporte al fondo de emergencia');
  });

  it('nota en blanco se trata como ausente', () => {
    const [m] = movimientosDesdeAportes([aporte({ nota: '   ' })]);
    expect(m.descripcion).toBe('Aporte al fondo de emergencia');
  });

  it('argumento no-array devuelve []', () => {
    expect(movimientosDesdeAportes(undefined)).toEqual([]);
  });

  it('tiene dominio "ahorro"', () => {
    const [m] = movimientosDesdeAportes([aporte()]);
    expect(m.dominio).toBe('ahorro');
  });
});

// ── movimientosRecientes() ────────────────────────────────────────

describe('movimientosRecientes()', () => {
  it('combina las 3 fuentes ordenadas por fecha descendente', () => {
    const r = movimientosRecientes({
      gastos: [gasto({ fecha: '2026-07-01' })],
      ingresosPuntuales: [ingresoPuntual({ fecha: '2026-07-05' })],
      aportes: [aporte({ fecha: '2026-07-03' })],
    });
    expect(r.map(m => m.fecha)).toEqual(['2026-07-05', '2026-07-03', '2026-07-01']);
  });

  it('respeta el límite pasado', () => {
    const gastos = Array.from({ length: 10 }, (_, i) => gasto({ id: `g${i}`, fecha: `2026-07-${String(i + 1).padStart(2, '0')}` }));
    const r = movimientosRecientes({ gastos }, 3);
    expect(r).toHaveLength(3);
    expect(r[0].fecha).toBe('2026-07-10');
  });

  it('límite por defecto es 5', () => {
    const gastos = Array.from({ length: 10 }, (_, i) => gasto({ id: `g${i}`, fecha: `2026-07-${String(i + 1).padStart(2, '0')}` }));
    expect(movimientosRecientes({ gastos })).toHaveLength(5);
  });

  it('sin ninguna fuente devuelve []', () => {
    expect(movimientosRecientes({})).toEqual([]);
    expect(movimientosRecientes()).toEqual([]);
  });

  it('ignora movimientos sin fecha válida', () => {
    const r = movimientosRecientes({ gastos: [gasto({ fecha: '' }), gasto({ id: 'g2', fecha: '2026-07-01' })] });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('g2');
  });
});

// ── renderActividadReciente() ──────────────────────────────────────

describe('renderActividadReciente()', () => {
  const elPanel = () => document.getElementById('panel-actividad-reciente');

  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-actividad-reciente" hidden></div>';
    S.gastos = [];
    S.ingresosPuntuales = [];
    S.ahorro = { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 };
  });

  it('no-op si el contenedor no existe', () => {
    document.body.innerHTML = '';
    expect(() => renderActividadReciente()).not.toThrow();
  });

  it('oculto y vacío sin ningún movimiento', () => {
    renderActividadReciente();
    expect(elPanel().hidden).toBe(true);
    expect(elPanel().innerHTML).toBe('');
  });

  it('visible con un gasto: muestra descripción y monto con signo -', () => {
    S.gastos = [gasto()];
    renderActividadReciente();
    expect(elPanel().hidden).toBe(false);
    expect(elPanel().innerHTML).toContain('Mercado');
    expect(elPanel().innerHTML).toContain('-$50.000');
  });

  it('visible con un ingreso puntual: monto con signo +', () => {
    S.ingresosPuntuales = [ingresoPuntual()];
    renderActividadReciente();
    expect(elPanel().innerHTML).toContain('Venta bici');
    expect(elPanel().innerHTML).toContain('+$300.000');
  });

  it('visible con un aporte al fondo', () => {
    S.ahorro.aportes = [aporte()];
    renderActividadReciente();
    expect(elPanel().innerHTML).toContain('Aporte al fondo de emergencia');
    expect(elPanel().innerHTML).toContain('-$100.000');
  });

  it('muestra como máximo 5 movimientos aunque haya más', () => {
    S.gastos = Array.from({ length: 8 }, (_, i) => gasto({ id: `g${i}`, fecha: `2026-07-${String(i + 1).padStart(2, '0')}` }));
    renderActividadReciente();
    const items = elPanel().querySelectorAll('.actividad-reciente__item');
    expect(items).toHaveLength(5);
  });

  it('vuelve a ocultarse si se vacían las fuentes tras un render previo', () => {
    S.gastos = [gasto()];
    renderActividadReciente();
    expect(elPanel().hidden).toBe(false);

    S.gastos = [];
    renderActividadReciente();
    expect(elPanel().hidden).toBe(true);
    expect(elPanel().innerHTML).toBe('');
  });

  it('incluye el link "Ver todo" hacia #movimientos cuando hay actividad', () => {
    S.gastos = [gasto()];
    renderActividadReciente();
    const link = elPanel().querySelector('.actividad-reciente__ver-todo');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('#movimientos');
  });
});

// ── movimientosCompletos() ────────────────────────────────────────

describe('movimientosCompletos()', () => {
  it('devuelve todos los movimientos sin límite de 5', () => {
    const gastos = Array.from({ length: 8 }, (_, i) => gasto({ id: `g${i}`, fecha: `2026-07-${String(i + 1).padStart(2, '0')}` }));
    expect(movimientosCompletos({ gastos })).toHaveLength(8);
  });

  it('ordena por fecha descendente igual que movimientosRecientes', () => {
    const r = movimientosCompletos({
      gastos: [gasto({ fecha: '2026-07-01' })],
      ingresosPuntuales: [ingresoPuntual({ fecha: '2026-07-05' })],
      aportes: [aporte({ fecha: '2026-07-03' })],
    });
    expect(r.map(m => m.fecha)).toEqual(['2026-07-05', '2026-07-03', '2026-07-01']);
  });

  it('sin ninguna fuente devuelve []', () => {
    expect(movimientosCompletos()).toEqual([]);
    expect(movimientosCompletos({})).toEqual([]);
  });
});

// ── renderMovimientosCompletos() ───────────────────────────────────

describe('renderMovimientosCompletos()', () => {
  const elLista = () => document.getElementById('lista-movimientos');

  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-movimientos"></div>';
    S.gastos = [];
    S.ingresosPuntuales = [];
    S.ahorro = { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 };
    S.cuentas = [];
  });

  it('no-op si el contenedor no existe', () => {
    document.body.innerHTML = '';
    expect(() => renderMovimientosCompletos()).not.toThrow();
  });

  it('muestra el estado vacío sin ningún movimiento', () => {
    renderMovimientosCompletos();
    expect(elLista().querySelector('.empty-state')).not.toBeNull();
  });

  it('renderiza más de 5 movimientos (no aplica el límite del panel compacto)', () => {
    S.gastos = Array.from({ length: 8 }, (_, i) => gasto({ id: `g${i}`, fecha: `2026-07-${String(i + 1).padStart(2, '0')}` }));
    renderMovimientosCompletos();
    expect(elLista().querySelectorAll('.list-item')).toHaveLength(8);
  });

  it('muestra el nombre de la cuenta cuando existe', () => {
    S.cuentas = [cuenta('c1', 'Nequi principal')];
    S.gastos = [gasto({ cuentaId: 'c1' })];
    renderMovimientosCompletos();
    expect(elLista().innerHTML).toContain('Nequi principal');
  });

  it('sin cuenta asociada (aporte), no rompe ni muestra "null"', () => {
    S.ahorro.aportes = [aporte()];
    renderMovimientosCompletos();
    expect(elLista().innerHTML).not.toContain('null');
  });

  it('un ingreso se muestra con signo + y clase de color de ingreso', () => {
    S.ingresosPuntuales = [ingresoPuntual()];
    renderMovimientosCompletos();
    expect(elLista().innerHTML).toContain('+$300.000');
    expect(elLista().querySelector('.list-item__amount--ingreso')).not.toBeNull();
  });

  it('agrupa movimientos de meses distintos bajo divisores separados', () => {
    S.gastos = [
      gasto({ id: 'g1', fecha: '2026-07-05' }),
      gasto({ id: 'g2', fecha: '2026-06-20' }),
    ];
    renderMovimientosCompletos();
    const divisores = elLista().querySelectorAll('.movimientos-mes');
    expect(divisores).toHaveLength(2);
    expect(divisores[0].textContent).toContain('2026');
  });

  it('la teja del ícono lleva el dominio correcto (colores por sección)', () => {
    S.gastos = [gasto({ categoria: 'Deudas' })];
    renderMovimientosCompletos();
    expect(elLista().querySelector('.cat-teja[data-dom="compromisos"]')).not.toBeNull();
  });
});
