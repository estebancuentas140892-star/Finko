/**
 * nube-sync.test.js - NUBE.2 (ADR 096 D4): el motor de sincronización por
 * registro. Puro: estados, libros y filas en memoria, sin red.
 */

import { describe, it, expect } from 'vitest';
import {
  COLECCIONES, RAIZ, BORRADO, libroVacio, estable, huella, registrosDe, marcarCambios, filasPendientes,
  confirmarSubidas, aplicarRemotas, estadoDesdeNube, libroParaReemplazarNube, cursorConMargen,
} from '../../modules/infra/nube-sync.js';

const V = 48;
const meta = { version: V, dispositivo: 'iPhone' };
const estadoBase = (extra = {}) => ({
  _version: V,
  onboarded: true,
  perfil: { nombre: 'Sofía' },
  config: { tema: 'oscuro', bloqueo: { hash: 'pin-local' } },
  gastos: [],
  cuentas: [],
  logros: ['primer-gasto'],
  ...extra,
});
const gasto = (id, monto = 1000) => ({ id, monto, descripcion: `Gasto ${id}` });

/** Lo que haría Postgres con un jsonb: las claves en otro orden. */
const comoJsonb = (v) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return v;
  return Object.fromEntries(Object.keys(v).reverse().map(k => [k, comoJsonb(v[k])]));
};

/** El "servidor": aplica las filas subidas y les pone hora, como el trigger. */
function servidor() {
  const filas = new Map();
  let reloj = 0;
  return {
    subir(lote) {
      for (const f of lote) {
        reloj++;
        filas.set(`${f.coleccion}/${f.id}`, { ...f, datos: comoJsonb(f.datos), actualizado: `2026-10-27T10:00:${String(reloj).padStart(2, '0')}.000000+00:00` });
      }
    },
    desde(cursor) { return [...filas.values()].filter(f => !cursor || f.actualizado > cursor); },
    todo() { return [...filas.values()]; },
  };
}

describe('huellas estables', () => {
  it('el orden de las claves no cambia la huella; un valor distinto sí', () => {
    expect(estable({ b: 1, a: { d: 2, c: 3 } })).toBe(estable({ a: { c: 3, d: 2 }, b: 1 }));
    expect(huella({ b: 1, a: 2 })).toBe(huella({ a: 2, b: 1 }));
    expect(huella({ a: 1 })).not.toBe(huella({ a: 2 }));
    // Lo que JSON no guarda tampoco cuenta.
    expect(huella({ a: 1, b: undefined })).toBe(huella({ a: 1 }));
  });
});

describe('el estado partido en registros', () => {
  it('cada elemento con id es un registro; lo demás viaja entero; el PIN y la versión no', () => {
    const regs = registrosDe(estadoBase({ gastos: [gasto('g1'), gasto('g2')] }));
    expect(regs.get('gastos/g1').datos).toMatchObject({ monto: 1000 });
    expect(regs.get(`${RAIZ}/perfil`).datos).toEqual({ nombre: 'Sofía' });
    expect(regs.get(`${RAIZ}/logros`).datos).toEqual(['primer-gasto']);
    expect(regs.get(`${RAIZ}/config`).datos).toEqual({ tema: 'oscuro' });
    expect(regs.has(`${RAIZ}/_version`)).toBe(false);
    expect(COLECCIONES).toContain('perfiles');
  });

  it('una colección con un elemento sin id viaja entera, para no perderlo', () => {
    const regs = registrosDe(estadoBase({ gastos: [gasto('g1'), { monto: 5 }] }));
    expect(regs.has('gastos/g1')).toBe(false);
    expect(regs.get(`${RAIZ}/gastos`).datos).toHaveLength(2);
  });
});

describe('qué cambió aquí', () => {
  it('nuevo, cambiado y borrado quedan pendientes; lo igual no', () => {
    let libro = marcarCambios(estadoBase({ gastos: [gasto('g1'), gasto('g2')] }), libroVacio(), 100);
    libro = confirmarSubidas(libro, filasPendientes(estadoBase({ gastos: [gasto('g1'), gasto('g2')] }), libro, meta));
    expect(Object.values(libro.r).every(e => e.p === 0)).toBe(true);

    const despues = estadoBase({ gastos: [gasto('g1', 9999), gasto('g3')] });
    const l2 = marcarCambios(despues, libro, 200);
    expect(l2.r['gastos/g1']).toMatchObject({ p: 1, t: 200 });
    expect(l2.r['gastos/g3']).toMatchObject({ p: 1, t: 200 });
    expect(l2.r['gastos/g2']).toEqual({ h: BORRADO, t: 200, p: 1 });
    expect(l2.r[`${RAIZ}/perfil`].p).toBe(0);

    const filas = filasPendientes(despues, l2, meta);
    expect(filas.find(f => f.id === 'g2')).toMatchObject({ borrado: true, datos: null, cambiado: 200 });
    expect(filas.find(f => f.id === 'g1')).toMatchObject({ borrado: false, datos: { monto: 9999 }, version_schema: V, dispositivo: 'iPhone' });

    // Un borrado ya anotado no se vuelve a marcar.
    const l3 = marcarCambios(despues, confirmarSubidas(l2, filas), 300);
    expect(l3.r['gastos/g2'].t).toBe(200);
  });

  it('si el registro cambió mientras subía, sigue pendiente', () => {
    const e1 = estadoBase({ gastos: [gasto('g1')] });
    const libro = marcarCambios(e1, libroVacio(), 100);
    const filas = filasPendientes(e1, libro, meta);
    const e2 = estadoBase({ gastos: [gasto('g1', 5)] });
    const confirmado = confirmarSubidas(marcarCambios(e2, libro, 150), filas);
    expect(confirmado.r['gastos/g1'].p).toBe(1);
  });
});

describe('lo que llega de la nube', () => {
  it('agrega, reemplaza y borra sin tocar el estado original', () => {
    const estado = estadoBase({ gastos: [gasto('g1'), gasto('g2')] });
    const libro = confirmarSubidas(marcarCambios(estado, libroVacio(), 1), filasPendientes(estado, marcarCambios(estado, libroVacio(), 1), meta));
    const res = aplicarRemotas(estado, libro, [
      { coleccion: 'gastos', id: 'g3', datos: gasto('g3'), borrado: false, cambiado: 50, version_schema: V, actualizado: 'b' },
      { coleccion: 'gastos', id: 'g1', datos: gasto('g1', 7), borrado: false, cambiado: 50, version_schema: V, actualizado: 'a' },
      { coleccion: 'gastos', id: 'g2', datos: null, borrado: true, cambiado: 50, version_schema: V, actualizado: 'c' },
    ], { version: V });
    expect(res.aplicadas).toBe(3);
    expect(res.parcial.gastos.map(g => `${g.id}:${g.monto}`)).toEqual(['g1:7', 'g3:1000']);
    expect(res.parcial.gastos).not.toBe(estado.gastos);
    expect(estado.gastos).toHaveLength(2);
    expect(res.libro.cursor).toBe('c');
  });

  it('cuando los dos cambiaron el mismo registro, gana el más reciente', () => {
    const estado = estadoBase({ gastos: [gasto('g1', 111)] });
    const libro = marcarCambios(estado, libroVacio(), 500);
    const remota = (cambiado) => ({ coleccion: 'gastos', id: 'g1', datos: gasto('g1', 222), borrado: false, cambiado, version_schema: V, actualizado: 'x' });
    expect(aplicarRemotas(estado, libro, [remota(400)], { version: V }).aplicadas).toBe(0);
    const gana = aplicarRemotas(estado, libro, [remota(600)], { version: V });
    expect(gana.parcial.gastos[0].monto).toBe(222);
    expect(gana.libro.r['gastos/g1'].p).toBe(0);
  });

  it('la config de la nube conserva el PIN de este dispositivo y no vuelve a quedar pendiente', () => {
    const estado = estadoBase();
    const libro = marcarCambios(estado, libroVacio(), 1);
    const res = aplicarRemotas(estado, libro, [
      { coleccion: RAIZ, id: 'config', datos: { tema: 'claro' }, borrado: false, cambiado: 99, version_schema: V, actualizado: 'x' },
    ], { version: V });
    expect(res.parcial.config).toEqual({ tema: 'claro', bloqueo: { hash: 'pin-local' } });
    const nuevo = { ...estado, ...res.parcial };
    expect(marcarCambios(nuevo, res.libro, 200).r[`${RAIZ}/config`].p).toBe(0);
  });

  it('lo de una app más nueva no se aplica; lo de una más vieja avisa para migrar', () => {
    const estado = estadoBase();
    const res = aplicarRemotas(estado, libroVacio(), [
      { coleccion: 'gastos', id: 'n', datos: gasto('n'), borrado: false, cambiado: 1, version_schema: V + 1, actualizado: 'a' },
      { coleccion: 'gastos', id: 'v', datos: gasto('v'), borrado: false, cambiado: 1, version_schema: V - 3, actualizado: 'b' },
    ], { version: V });
    expect(res.deAppNueva).toBe(1);
    expect(res.parcial.gastos.map(g => g.id)).toEqual(['v']);
    expect(res.versionMinima).toBe(V - 3);
  });
});

describe('dos dispositivos de punta a punta', () => {
  it('lo del celular llega al computador, y la vuelta por jsonb no inventa cambios', () => {
    const nube = servidor();
    const celular = estadoBase({ gastos: [gasto('g1'), gasto('g2')], cuentas: [{ id: 'c1', nombre: 'Nequi' }] });
    let libroCel = marcarCambios(celular, libroVacio(), 100);
    const subida = filasPendientes(celular, libroCel, meta);
    nube.subir(subida);
    libroCel = confirmarSubidas(libroCel, subida);

    // El computador empieza vacío y trae todo.
    const { estado: pc, libro: libroPc } = estadoDesdeNube(estadoBase({ config: { tema: 'claro', bloqueo: { hash: 'pin-pc' } } }), nube.todo(), V);
    expect(pc.gastos.map(g => g.id)).toEqual(['g1', 'g2']);
    expect(pc.cuentas[0].nombre).toBe('Nequi');
    // Cada dispositivo conserva su PIN: el del celular nunca viajó.
    expect(pc.config).toEqual({ tema: 'oscuro', bloqueo: { hash: 'pin-pc' } });
    // Nada queda pendiente pese al reorden de claves de jsonb.
    expect(filasPendientes(pc, marcarCambios(pc, libroPc, 300), meta)).toHaveLength(0);

    // El computador borra g2 y agrega g3; el celular lo baja desde su cursor.
    const pc2 = { ...pc, gastos: [pc.gastos[0], gasto('g3')] };
    const libroPc2 = marcarCambios(pc2, libroPc, 400);
    nube.subir(filasPendientes(pc2, libroPc2, meta));
    const marcado = marcarCambios(celular, libroCel, 500);
    const res = aplicarRemotas(celular, marcado, nube.desde(libroCel.cursor), { version: V });
    expect(res.parcial.gastos.map(g => g.id)).toEqual(['g1', 'g3']);
  });
});

describe('reemplazar todo y el cursor', () => {
  it('subir los de este dispositivo borra de la nube lo que aquí no está', () => {
    const estado = estadoBase({ gastos: [gasto('g1')] });
    const libro = libroParaReemplazarNube(estado, [
      { coleccion: 'gastos', id: 'g1', borrado: false },
      { coleccion: 'gastos', id: 'ajeno', borrado: false },
      { coleccion: 'gastos', id: 'viejo', borrado: true },
    ], 900);
    expect(libro.r['gastos/g1']).toMatchObject({ p: 1, t: 900 });
    expect(libro.r['gastos/ajeno']).toEqual({ h: BORRADO, t: 900, p: 1 });
    expect(libro.r['gastos/viejo']).toBeUndefined();
  });

  it('el cursor retrocede un margen y entiende las microsegundos de Postgres', () => {
    expect(cursorConMargen('2026-10-27T10:00:30.123456+00:00')).toBe('2026-10-27T10:00:20.123Z');
    expect(cursorConMargen(null)).toBeNull();
  });
});
