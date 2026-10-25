/**
 * nino.test.js - APR.3c: la app del niño y su ruta (ADR 093 D9). La ruta en
 * orden, sus cuatro pantallas, la lección con la piel del niño y su cierre
 * "Úsalo de verdad", y el contenido de su unidad 1 con la voz del D6.
 */

import { describe, it, expect } from 'vitest';
import { UNIDADES_NINO } from '../../modules/infra/ruta-aprende.js';
import { normalizarPerfil, saldosFrascos } from '../../modules/infra/perfiles.js';
import { estadoRutaNino, siguienteLeccionNino, unidadesHechasNino, VISTAS_NINO } from '../../modules/dominio/nino/logic.js';
import { htmlBarraNino, htmlInicioNino, htmlRutaNino, htmlAlcanciaNino, htmlYoNino } from '../../modules/dominio/nino/view.js';
import { crearSesion, avanzar, responderElegir, unidadDeLeccion } from '../../modules/dominio/aprende/logic.js';
import { htmlLeccion } from '../../modules/dominio/aprende/view.js';
import k1 from '../../modules/dominio/aprende/lecciones/nino/k1.js';

const hechas = (...ids) => Object.fromEntries(ids.map(id => [id, '2026-10-25']));
const perfil = (aprende = {}, extra = {}) => normalizarPerfil({ id: 'n-1', nombre: 'Sofía', edad: 8, dibujo: 'cometa', aprende, ...extra });

describe('la ruta del niño va en orden (D9)', () => {
  it('ocho unidades; la primera sin terminar es la actual y solo se abre la lección que sigue', () => {
    expect(UNIDADES_NINO.map(u => u.id)).toEqual(['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8']);
    const ruta = estadoRutaNino({ hechas: hechas('k1-l1') });
    expect(ruta[0].estado).toBe('actual');
    expect(ruta[0].lecciones.map(l => l.estado)).toEqual(['hecha', 'actual', 'despues']);
    expect(ruta.slice(1).every(e => e.estado === 'despues')).toBe(true);
    expect(siguienteLeccionNino({ hechas: hechas('k1-l1') })).toMatchObject({ numero: 2, leccion: { id: 'k1-l2' } });
  });

  it('terminada una unidad, la siguiente sin contenido detiene la ruta: no la salta', () => {
    const ruta = estadoRutaNino({ hechas: hechas('k1-l1', 'k1-l2', 'k1-l3') });
    expect(ruta[0].estado).toBe('hecha');
    expect(ruta[1].estado).toBe('preparacion');
    expect(siguienteLeccionNino({ hechas: hechas('k1-l1', 'k1-l2', 'k1-l3') })).toBeNull();
    expect(unidadesHechasNino({ hechas: hechas('k1-l1', 'k1-l2', 'k1-l3') })).toBe(1);
  });

  it('el motor encuentra las lecciones del niño en su propio catálogo', () => {
    expect(unidadDeLeccion('k1-l2').nombre).toBe('¿Qué es el dinero?');
    expect(unidadDeLeccion('u1-l1').id).toBe('u1');
  });
});

describe('las cuatro pantallas del niño (D9)', () => {
  it('la barra tiene Inicio, Aprender, Alcancía y Yo, con la actual marcada', () => {
    expect(VISTAS_NINO).toEqual(['inicio', 'aprender', 'alcancia', 'yo']);
    const html = htmlBarraNino('aprender');
    expect(html.match(/data-action="nino-vista"/g)).toHaveLength(4);
    expect(html).toMatch(/data-vista="aprender" aria-current="page"/);
  });

  it('Inicio saluda con Frai y ofrece la lección que sigue con su duración', () => {
    const html = htmlInicioNino(perfil());
    expect(html).toContain('¡Hola, Sofía!');
    expect(html).toContain('href="#il-frai-saluda"');
    expect(html).toContain('¿Aprendemos algo hoy? Son 3 minutos.');
    expect(html).toContain('Unidad 1 · lección 1');
    expect(html).toMatch(/data-action="leccion-abrir" data-id="k1-l1"/);
    expect(html).toContain('aria-label="Cambiar de perfil"');
  });

  it('Aprender muestra el camino de la unidad actual: hecha para repasar, la de hoy y las que vienen', () => {
    const html = htmlRutaNino(perfil({ hechas: hechas('k1-l1') }));
    expect(html).toContain('0 de 8 unidades');
    expect(html).toContain('Unidad 1 · vas aquí');
    expect(html).toContain('knode--hecha');
    expect(html).toMatch(/knode--ahora" type="button" data-action="leccion-abrir" data-id="k1-l2"/);
    expect(html).toContain('knode--despues');
    expect(html).toContain('Unidad 2 · después');
  });

  it('Alcancía suma los frascos y ninguno muestra menos de cero', () => {
    const p = perfil({}, { movimientos: [
      { frasco: 'ahorrar', monto: 10_000 }, { frasco: 'gastar', monto: 8_000 }, { frasco: 'gastar', monto: -3_000 },
      { frasco: 'compartir', monto: -1_000 }, { frasco: 'otro', monto: 99 },
    ] });
    expect(saldosFrascos(p)).toEqual({ ahorrar: 10_000, gastar: 5_000, compartir: 0, total: 15_000 });
    const html = htmlAlcanciaNino(p);
    expect(html).toContain('$15.000');
    expect(html).toContain('Ahorrar');
    expect(html).toContain('href="#il-frasco"');
    expect(htmlAlcanciaNino(perfil())).toContain('Cuando recibas dinero, aquí lo verás.');
  });

  it('Yo muestra una insignia por unidad terminada y "Cambiar de perfil"', () => {
    const html = htmlYoNino(perfil({ hechas: hechas('k1-l1', 'k1-l2', 'k1-l3') }));
    expect(html.match(/href="#il-insignia"/g)).toHaveLength(1);
    expect(html.match(/kinsignia--pendiente/g)).toHaveLength(7);
    expect(html).toContain('Cambiar de perfil');
  });
});

describe('la lección con la piel del niño (D7, D9)', () => {
  const leccion = k1['k1-l1'];
  const ctx = { eyebrow: 'Unidad 1 · Para qué sirve el dinero', tope: 20_000, terminada: false, entrada: false, nino: true };

  it('Frai explica la idea en su globo', () => {
    const html = htmlLeccion(crearSesion(leccion), leccion, ctx);
    expect(html).toContain('href="#il-frai-explica"');
    expect(html).toContain('leccion-nino__globo');
    expect(html).toContain('>Siguiente<');
  });

  it('tras un error, Frai anima con "¡Casi!" y la correcta dice "Esta era"', () => {
    let s = avanzar(crearSesion(leccion), leccion).sesion;
    s = responderElegir(s, leccion, 1);
    const html = htmlLeccion(s, leccion, ctx);
    expect(html).toContain('¡Casi!');
    expect(html).toContain('href="#il-frai-anima"');
    expect(html).toContain('Esta era');
    expect(html).toContain('>Sigamos<');
    expect(html).not.toMatch(/danger|error/);
  });

  it('el adulto no ve a Frai ni la voz del niño', () => {
    let s = avanzar(crearSesion(leccion), leccion).sesion;
    s = responderElegir(s, leccion, 1);
    const html = htmlLeccion(s, leccion, { ...ctx, nino: false });
    expect(html).not.toContain('il-frai');
    expect(html).toContain('Esta es');
  });

  it('el cierre celebra la unidad y "Úsalo de verdad" pregunta por su frasco', () => {
    const s = crearSesion(leccion);
    const unidad = UNIDADES_NINO[0];
    const html = htmlLeccion(s, leccion, {
      ...ctx, terminada: true, unidad, celebrarUnidad: true,
      usalo: { frasco: 'gastar', saldo: 6_000, pregunta: '¿Es para algo que necesitas o que quieres?' },
    });
    expect(html).toContain('¡Terminaste la unidad 1!');
    expect(html).toContain('destellos__punto');
    expect(html).toContain('Nueva insignia en Yo');
    expect(html).toContain('En tu frasco Gastar tienes $6.000.');
    expect(html).toMatch(/data-action="leccion-salir-a" data-vista="alcancia"/);
    expect(html).toContain('Volver a la ruta');
    const vacio = htmlLeccion(s, leccion, { ...ctx, terminada: true, unidad, celebrarUnidad: false, avance: { hechas: 1, total: 3 }, usalo: { frasco: 'ahorrar', saldo: 0, pregunta: '¿Cuánto?' } });
    expect(vacio).toContain('¡Lección lista!');
    expect(vacio).toContain('Tu frasco Ahorrar está vacío por ahora.');
  });
});

describe('contenido de la unidad 1 del niño (D6)', () => {
  const pasos = Object.values(k1).flatMap(l => l.pasos.map(p => [l.id, p]));

  it('cada lección del catálogo tiene su contenido y cierra con "Úsalo de verdad"', () => {
    expect(Object.keys(k1).sort()).toEqual(UNIDADES_NINO[0].lecciones.map(l => l.id).sort());
    for (const l of Object.values(k1)) {
      expect(l.pasos.at(-1).tipo, l.id).toBe('aplica');
      expect(['ahorrar', 'gastar', 'compartir'], l.id).toContain(l.pasos.at(-1).usalo.frasco);
    }
  });

  it('frases de máximo 10 palabras y sin guiones largos ni medios', () => {
    const textos = pasos.flatMap(([, p]) => [p.titulo, p.texto, p.pregunta, p.bien, ...(p.opciones ?? []), ...(p.casi ?? []), p.usalo?.pregunta])
      .filter(Boolean);
    for (const t of textos) {
      for (const frase of t.split(/(?<=[.?!])\s+/)) {
        expect(frase.split(/\s+/).filter(Boolean).length, frase).toBeLessThanOrEqual(10);
      }
    }
    expect(JSON.stringify(k1)).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`));
  });

  it('cada opción equivocada trae su explicación', () => {
    for (const [id, p] of pasos.filter(([, x]) => x.tipo === 'elegir')) {
      p.opciones.forEach((_, i) => { if (i !== p.correcta) expect(p.casi[i], `${id} ${i}`).toBeTruthy(); });
    }
  });
});
