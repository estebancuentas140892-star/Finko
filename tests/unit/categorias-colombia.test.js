/**
 * GAS.10b (ADR 185 D3): las categorías para Colombia del tablero "Finko ·
 * Gastos móvil, propuesta integral" y la migración v58 que las lleva a los
 * datos guardados.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import { loadData, STORAGE_KEY, SCHEMA_VERSION } from '../../modules/core/storage.js';
import {
  AREAS_GASTO, CATEGORIAS_GASTO_USUARIO, SUBCATEGORIAS_GASTO, CARACTER_CATEGORIA_GASTO,
  CATEGORIA_ICONO, ICONOS_CATEGORIA_PERSONALIZADA,
} from '../../modules/core/constants.js';
import { hijosDeCategoria, hijoPorId } from '../../modules/infra/taxonomia.js';
import { caracterDeGasto } from '../../modules/infra/hormiga.js';

beforeEach(() => {
  Object.assign(S, createInitialState());
});

const nombres = (cat) => hijosDeCategoria(SUBCATEGORIAS_GASTO, cat).map(h => h.nombre);

describe('las áreas y las categorías (ADR 185 D3)', () => {
  it('cuatro áreas con las dieciséis del tablero, en su orden; Otros va sin área', () => {
    expect(AREAS_GASTO.map(a => a.nombre)).toEqual(['Comida', 'Transporte', 'Personal', 'Casa y familia']);
    expect(AREAS_GASTO.flatMap(a => a.categorias)).toEqual([
      'Mercado', 'Restaurantes', 'Café', 'Antojos', 'Bus, taxi y apps', 'Carro o moto',
      'Salud', 'Cuidado personal', 'Ropa', 'Entretenimiento', 'Hogar', 'Familia', 'Mascotas', 'Educación',
    ]);
    const enAreas = new Set(AREAS_GASTO.flatMap(a => a.categorias));
    expect(CATEGORIAS_GASTO_USUARIO.filter(c => !enAreas.has(c))).toEqual(['Otros']);
  });

  it('Carro o moto es nueva y Bus, taxi y apps (antes Transporte) queda con tres', () => {
    expect(nombres('Bus, taxi y apps')).toEqual(['Transporte público', 'Taxi', 'App de transporte']);
    expect(nombres('Carro o moto')).toEqual(['Gasolina', 'Parqueadero', 'Peajes', 'Lavado', 'Taller y repuestos']);
    expect(CATEGORIA_ICONO['Carro o moto']).toBe('c-carro');
    expect(CARACTER_CATEGORIA_GASTO['Carro o moto']).toBe('necesidad');
    // El carro sigue entre los íconos propios: metas, cuentas y fijos lo usan.
    expect(ICONOS_CATEGORIA_PERSONALIZADA.map(i => i.icono)).toContain('c-carro');
  });

  it('los nombres nuevos: Frutas y verduras, Paquetes y snacks, Maquillaje y belleza, Ferretería y arreglos', () => {
    expect(nombres('Mercado')).toContain('Frutas y verduras');
    expect(nombres('Antojos')).toContain('Paquetes y snacks');
    expect(nombres('Cuidado personal')).toContain('Maquillaje y belleza');
    expect(nombres('Hogar')).toEqual(['Aseo y limpieza', 'Ferretería y arreglos', 'Muebles y electrodomésticos', 'Decoración']);
    expect(hijoPorId(SUBCATEGORIAS_GASTO, 'hogar-arreglos')).toBeNull();
  });

  it('el carácter: Entretenimiento, Decoración y Uñas y spa son deseo; Muebles se pregunta', () => {
    expect(caracterDeGasto({ categoria: 'Entretenimiento', subcategoriaId: 'entret-cine' })).toBe('gusto');
    expect(caracterDeGasto({ categoria: 'Hogar', subcategoriaId: 'hogar-decoracion' })).toBe('gusto');
    expect(caracterDeGasto({ categoria: 'Cuidado personal', subcategoriaId: 'cuidado-unas' })).toBe('gusto');
    expect(caracterDeGasto({ categoria: 'Hogar', subcategoriaId: 'hogar-muebles' })).toBe('depende');
    expect(caracterDeGasto({ categoria: 'Hogar', subcategoriaId: 'hogar-aseo' })).toBe('necesidad');
  });
});

describe('Migración v57 → v58 (GAS.10b, ADR 185 D3)', () => {
  const cargar = (extra) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...createInitialState(), _version: 57, ...extra }));
    loadData();
  };

  it('Mecato pasa a Antojos en los gastos, los límites y lo aprendido', () => {
    cargar({
      gastos: [{ id: 'g1', monto: 4_000, categoria: 'Mecato', subcategoriaId: 'mecato-helado', fecha: '2026-11-02' }],
      presupuestos: [{ id: 'p1', categoria: 'Mecato', montoMensual: 50_000, activo: true }],
      config: { ...createInitialState().config, hormiga: { tope: 20_000, limite: null, conceptos: { 'c:Mecato|gomitas': 'gusto', 's:cafe-tinto': 'necesidad' } } },
    });
    expect(S.gastos[0].categoria).toBe('Antojos');
    expect(S.gastos[0].subcategoriaId).toBe('mecato-helado');
    expect(S.presupuestos[0].categoria).toBe('Antojos');
    expect(S.config.hormiga.conceptos).toEqual({ 'c:Antojos|gomitas': 'gusto', 's:cafe-tinto': 'necesidad' });
    expect(S._version).toBe(SCHEMA_VERSION);
  });

  it('gasolina, parqueadero y peajes pasan a Carro o moto; el bus se queda', () => {
    cargar({
      gastos: [
        { id: 'g1', monto: 80_000, categoria: 'Transporte', subcategoriaId: 'transp-gasolina', fecha: '2026-11-02' },
        { id: 'g2', monto: 3_000, categoria: 'Transporte', subcategoriaId: 'transp-bus', fecha: '2026-11-02' },
        { id: 'g3', monto: 9_000, categoria: 'Transporte', fecha: '2026-11-02' },
      ],
    });
    expect(S.gastos.map(g => g.categoria)).toEqual(['Carro o moto', 'Bus, taxi y apps', 'Bus, taxi y apps']);
  });

  it('el límite de Transporte por partes: si todas se van, va entero; si no, se parte', () => {
    cargar({
      presupuestos: [
        { id: 'p1', categoria: 'Transporte', montoMensual: 200_000, subcategorias: { 'transp-gasolina': 150_000, 'transp-peajes': 50_000 }, soloParte: true, activo: true },
        { id: 'p2', categoria: 'Transporte', montoMensual: 300_000, subcategorias: { 'transp-bus': 100_000, 'transp-parqueadero': 200_000 }, activo: true },
      ],
    });
    const [p1, p2, nuevo] = S.presupuestos;
    expect(p1).toMatchObject({ categoria: 'Carro o moto', montoMensual: 200_000, soloParte: true });
    expect(p2).toMatchObject({ categoria: 'Bus, taxi y apps', montoMensual: 100_000, subcategorias: { 'transp-bus': 100_000 } });
    expect(nuevo).toMatchObject({ id: 'p2-carro', categoria: 'Carro o moto', montoMensual: 200_000, subcategorias: { 'transp-parqueadero': 200_000 } });
  });

  it('Arreglos se une a Ferretería y arreglos, también en el máximo de un límite', () => {
    cargar({
      gastos: [{ id: 'g1', monto: 30_000, categoria: 'Hogar', subcategoriaId: 'hogar-arreglos', fecha: '2026-11-02' }],
      presupuestos: [{ id: 'p1', categoria: 'Hogar', montoMensual: 90_000, subcategorias: { 'hogar-arreglos': 40_000, 'hogar-herramientas': 50_000 }, activo: true }],
    });
    expect(S.gastos[0].subcategoriaId).toBe('hogar-herramientas');
    expect(S.presupuestos[0].subcategorias).toEqual({ 'hogar-herramientas': 90_000 });
  });

  it('una categoría propia que se llama como una nativa nueva se retira; sus gastos ya usan ese nombre', () => {
    cargar({
      categoriasPersonalizadas: [
        { id: 'c1', nombre: 'Carro o moto', icono: 'c-carro', seccion: 'gasto', fechaCreacion: '2026-01-01' },
        { id: 'c2', nombre: 'Gimnasio', icono: 'c-pesa', seccion: 'gasto', fechaCreacion: '2026-01-01' },
      ],
      gastos: [{ id: 'g1', monto: 20_000, categoria: 'Carro o moto', fecha: '2026-11-02' }],
    });
    expect(S.categoriasPersonalizadas.map(c => c.nombre)).toEqual(['Gimnasio']);
    expect(S.gastos[0].categoria).toBe('Carro o moto');
  });

  it('es idempotente: cargar dos veces no cambia nada más', () => {
    cargar({
      gastos: [{ id: 'g1', monto: 4_000, categoria: 'Mecato', fecha: '2026-11-02' }],
      presupuestos: [{ id: 'p2', categoria: 'Transporte', montoMensual: 300_000, subcategorias: { 'transp-bus': 100_000, 'transp-parqueadero': 200_000 }, activo: true }],
    });
    const despues = JSON.stringify({ g: S.gastos, p: S.presupuestos });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...S }));
    loadData();
    expect(JSON.stringify({ g: S.gastos, p: S.presupuestos })).toBe(despues);
  });
});

describe('Migración v58 → v59 (GAS.13a, ADR 188 D1)', () => {
  const cargar = (extra) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...createInitialState(), _version: 58, ...extra }));
    loadData();
  };

  it('Transporte pasa a "Bus, taxi y apps" en gastos, límites y lo aprendido; los ids y el dinero no cambian', () => {
    cargar({
      gastos: [{ id: 'g1', monto: 9_000, categoria: 'Transporte', subcategoriaId: 'transp-taxi', fecha: '2026-11-02' }],
      presupuestos: [{ id: 'p1', categoria: 'Transporte', montoMensual: 180_000, subcategorias: { 'transp-bus': 80_000, 'transp-app': 100_000 }, activo: true }],
      config: { ...createInitialState().config, hormiga: { tope: 20_000, limite: null, conceptos: { 'c:Transporte|bus': 'necesidad' } } },
    });
    expect(S.gastos[0]).toMatchObject({ categoria: 'Bus, taxi y apps', subcategoriaId: 'transp-taxi', monto: 9_000 });
    expect(S.presupuestos[0]).toMatchObject({ categoria: 'Bus, taxi y apps', montoMensual: 180_000, subcategorias: { 'transp-bus': 80_000, 'transp-app': 100_000 } });
    expect(S.config.hormiga.conceptos).toEqual({ 'c:Bus, taxi y apps|bus': 'necesidad' });
    expect(S._version).toBe(SCHEMA_VERSION);
  });

  it('el área es Transporte y la categoría conserva sus tres opciones', () => {
    expect(AREAS_GASTO.find(a => a.nombre === 'Transporte').categorias).toEqual(['Bus, taxi y apps', 'Carro o moto']);
    expect(CATEGORIAS_GASTO_USUARIO).not.toContain('Transporte');
    expect(CATEGORIA_ICONO['Bus, taxi y apps']).toBe('c-bus');
  });

  it('una categoría propia llamada "Bus, taxi y apps" se retira', () => {
    cargar({ categoriasPersonalizadas: [{ id: 'c1', nombre: 'Bus, taxi y apps', icono: 'c-bus', seccion: 'gasto', fechaCreacion: '2026-01-01' }] });
    expect(S.categoriasPersonalizadas).toEqual([]);
  });
});
