import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S, EventBus, createInitialState } from '../../modules/core/state.js';
import { _flushNow } from '../../modules/core/storage.js';
import { guardar, editar, eliminar } from '../../modules/infra/crud.js';

beforeEach(() => {
  Object.assign(S, createInitialState());
  EventBus._listeners = Object.create(null);
  localStorage.clear();
});

describe('guardar()', () => {
  it('agrega un ítem a la colección', () => {
    guardar('gastos', { descripcion: 'Café', monto: 5000, categoria: 'Alimentación', fecha: '2026-05-12' });
    expect(S.gastos).toHaveLength(1);
    expect(S.gastos[0].descripcion).toBe('Café');
  });

  it('asigna id automáticamente si no se provee', () => {
    guardar('gastos', { descripcion: 'Bus', monto: 2800 });
    expect(S.gastos[0].id).toBeTruthy();
    expect(typeof S.gastos[0].id).toBe('string');
  });

  it('preserva el id si ya viene en el ítem', () => {
    guardar('gastos', { id: 'mi-id-fijo', descripcion: 'Test', monto: 1000 });
    expect(S.gastos[0].id).toBe('mi-id-fijo');
  });

  it('asigna fechaCreacion si no se provee', () => {
    guardar('gastos', { descripcion: 'Almuerzo', monto: 15000 });
    expect(S.gastos[0].fechaCreacion).toBeTruthy();
    expect(() => new Date(S.gastos[0].fechaCreacion)).not.toThrow();
  });

  it('preserva fechaCreacion si ya viene en el ítem', () => {
    const fc = '2026-01-01T00:00:00.000Z';
    guardar('gastos', { descripcion: 'Histórico', monto: 100, fechaCreacion: fc });
    expect(S.gastos[0].fechaCreacion).toBe(fc);
  });

  it('retorna el ítem completo con id y fechaCreacion', () => {
    const result = guardar('metas', { nombre: 'Fondo emergencia', montoObjetivo: 5_000_000, montoActual: 0, completada: false });
    expect(result.id).toBeTruthy();
    expect(result.nombre).toBe('Fondo emergencia');
  });

  it('llama save() (persiste en localStorage tras flush)', () => {
    guardar('cuentas', { nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 0, activa: true });
    _flushNow();
    const raw = localStorage.getItem('fk_v1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed.cuentas).toHaveLength(1);
  });

  it('emite state:change con la sección correcta', () => {
    const spy = vi.fn();
    EventBus.on('state:change', spy);
    guardar('ingresos', { descripcion: 'Salario', monto: 1_423_500 });
    expect(spy).toHaveBeenCalledWith({ section: 'ingresos' });
  });

  it('puede guardar en distintas colecciones sin mezclar datos', () => {
    guardar('gastos', { descripcion: 'G1', monto: 100 });
    guardar('metas', { nombre: 'M1', montoObjetivo: 1000, montoActual: 0, completada: false });
    expect(S.gastos).toHaveLength(1);
    expect(S.metas).toHaveLength(1);
  });
});

describe('editar()', () => {
  it('actualiza campos del ítem por id', () => {
    guardar('gastos', { id: 'g1', descripcion: 'Café', monto: 5000 });
    editar('gastos', 'g1', { monto: 7000, descripcion: 'Café con leche' });
    expect(S.gastos[0].monto).toBe(7000);
    expect(S.gastos[0].descripcion).toBe('Café con leche');
  });

  it('hace merge shallow: no borra campos no incluidos en cambios', () => {
    guardar('gastos', { id: 'g1', descripcion: 'Café', monto: 5000, categoria: 'Alimentación' });
    editar('gastos', 'g1', { monto: 6000 });
    expect(S.gastos[0].descripcion).toBe('Café');
    expect(S.gastos[0].categoria).toBe('Alimentación');
  });

  it('retorna false si el id no existe', () => {
    expect(editar('gastos', 'no-existe', { monto: 100 })).toBe(false);
  });

  it('retorna el ítem actualizado cuando existe', () => {
    guardar('gastos', { id: 'g1', descripcion: 'Test', monto: 1000 });
    const result = editar('gastos', 'g1', { monto: 2000 });
    expect(result).toMatchObject({ id: 'g1', monto: 2000 });
  });

  it('emite state:change', () => {
    guardar('gastos', { id: 'g1', descripcion: 'Test', monto: 100 });
    const spy = vi.fn();
    EventBus.on('state:change', spy);
    editar('gastos', 'g1', { monto: 200 });
    expect(spy).toHaveBeenCalledWith({ section: 'gastos' });
  });
});

describe('eliminar()', () => {
  it('elimina el ítem de la colección', () => {
    guardar('gastos', { id: 'g1', descripcion: 'Test', monto: 100 });
    eliminar('gastos', 'g1');
    expect(S.gastos).toHaveLength(0);
  });

  it('retorna true al eliminar un ítem existente', () => {
    guardar('gastos', { id: 'g1', descripcion: 'Test', monto: 100 });
    expect(eliminar('gastos', 'g1')).toBe(true);
  });

  it('retorna false si el id no existe', () => {
    expect(eliminar('gastos', 'no-existe')).toBe(false);
  });

  it('no afecta otros ítems de la misma colección', () => {
    guardar('gastos', { id: 'g1', descripcion: 'G1', monto: 100 });
    guardar('gastos', { id: 'g2', descripcion: 'G2', monto: 200 });
    eliminar('gastos', 'g1');
    expect(S.gastos).toHaveLength(1);
    expect(S.gastos[0].id).toBe('g2');
  });

  it('emite state:change', () => {
    guardar('gastos', { id: 'g1', descripcion: 'Test', monto: 100 });
    const spy = vi.fn();
    EventBus.on('state:change', spy);
    eliminar('gastos', 'g1');
    expect(spy).toHaveBeenCalledWith({ section: 'gastos' });
  });
});
