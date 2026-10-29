/**
 * nino.test.js - APR.3c: la app del niño y su ruta (ADR 093 D9). La ruta en
 * orden, sus cuatro pantallas, la lección con la piel del niño y su cierre
 * "Úsalo de verdad", y el contenido de su unidad 1 con la voz del D6.
 */

import { describe, it, expect } from 'vitest';
import { UNIDADES_NINO } from '../../modules/infra/ruta-aprende.js';
import { normalizarPerfil, saldosFrascos } from '../../modules/infra/perfiles.js';
import {
  estadoRutaNino, siguienteLeccionNino, unidadesHechasNino, VISTAS_NINO,
  leerMonto, validarMovimiento, crearMovimientos, metaActiva, planMeta, validarMeta, llenadoFrasco, puedeMover,
  ofreceUbicacionNino, sinEmpezarNino,
} from '../../modules/dominio/nino/logic.js';
import {
  htmlBarraNino, htmlInicioNino, htmlRutaNino, htmlAlcanciaNino, htmlYoNino,
  htmlMovimientoNino, htmlMetaNino, htmlPlanMeta, htmlTarjetaMeta,
} from '../../modules/dominio/nino/view.js';
import { crearSesion, avanzar, responderElegir, unidadDeLeccion } from '../../modules/dominio/aprende/logic.js';
import { htmlLeccion } from '../../modules/dominio/aprende/view.js';
import k1 from '../../modules/dominio/aprende/lecciones/nino/k1.js';
import k2 from '../../modules/dominio/aprende/lecciones/nino/k2.js';
import k3 from '../../modules/dominio/aprende/lecciones/nino/k3.js';
import k4 from '../../modules/dominio/aprende/lecciones/nino/k4.js';
import k5 from '../../modules/dominio/aprende/lecciones/nino/k5.js';
import k6 from '../../modules/dominio/aprende/lecciones/nino/k6.js';
import k7 from '../../modules/dominio/aprende/lecciones/nino/k7.js';
import k8 from '../../modules/dominio/aprende/lecciones/nino/k8.js';
import ubicacionNino from '../../modules/dominio/aprende/lecciones/nino/ubicacion.js';
import { resultadoUbicacion } from '../../modules/dominio/aprende/logic.js';

/** El contenido del niño, por unidad. */
const CONTENIDO_NINO = { k1, k2, k3, k4, k5, k6, k7, k8 };

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

  it('terminada una unidad, la ruta sigue con la siguiente, en orden', () => {
    const ruta = estadoRutaNino({ hechas: hechas('k1-l1', 'k1-l2', 'k1-l3') });
    expect(ruta[0].estado).toBe('hecha');
    expect(ruta[1].estado).toBe('actual');
    expect(siguienteLeccionNino({ hechas: hechas('k1-l1', 'k1-l2', 'k1-l3') })).toMatchObject({ leccion: { id: 'k2-l1' } });
    expect(unidadesHechasNino({ hechas: hechas('k1-l1', 'k1-l2', 'k1-l3') })).toBe(1);
  });

  it('lo que la prueba marcó como sabido cuenta como hecho y es insignia', () => {
    const aprende = { hechas: {}, sabidas: ['k1', 'k2'] };
    const ruta = estadoRutaNino(aprende);
    expect(ruta.map(e => e.estado).slice(0, 3)).toEqual(['sabida', 'sabida', 'actual']);
    expect(unidadesHechasNino(aprende)).toBe(2);
    const yo = htmlYoNino(perfil(aprende));
    expect(yo.match(/href="#il-insignia"/g)).toHaveLength(2);
    expect(htmlRutaNino(perfil(aprende))).toContain('Ya lo sabes');
  });

  it('las ocho unidades tienen contenido escrito', () => {
    for (const u of UNIDADES_NINO) expect(u.lecciones.length, u.id).toBeGreaterThan(0);
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

  it('con el perfil, la barra suma su dibujo y "Cambiar", que solo se ven en el riel (APR.4b)', () => {
    const html = htmlBarraNino('inicio', perfil());
    expect(html.match(/data-action="nino-vista"/g)).toHaveLength(4);
    expect(html).toContain('class="knav__yo" aria-hidden="true"');
    expect(html).toMatch(/knav__it--cambiar" type="button" data-action="perfil-cambiar"\s+aria-label="Cambiar de perfil"/);
    expect(htmlBarraNino('inicio')).not.toContain('perfil-cambiar');
  });

  it('Inicio va en dos grupos y trae los tres frascos para el escritorio (APR.4b)', () => {
    const html = htmlInicioNino(perfil(), '2026-10-25');
    expect(html.match(/class="nino-inicio__grupo"/g)).toHaveLength(2);
    expect(html).toContain('class="knino-mini"');
    expect(html.match(/class="jar" data-frasco=/g)).toHaveLength(3);
  });

  it('Inicio saluda con Tino y ofrece la lección que sigue con su duración', () => {
    const html = htmlInicioNino(perfil());
    expect(html).toContain('¡Hola, Sofía!');
    expect(html).toContain('href="#il-tino-saluda"');
    expect(html).toContain('¿Aprendemos algo hoy? Son 3 minutos.');
    expect(html).toContain('Unidad 1 · lección 1');
    expect(html).toMatch(/data-action="leccion-abrir" data-id="k1-l1"/);
    expect(html).toContain('aria-label="Cambiar de perfil"');
  });

  it('Tino se presenta mientras el niño no empieza la ruta (094 D1)', () => {
    expect(htmlInicioNino(perfil())).toContain('Soy Tino, un guatín. ¿Aprendemos algo hoy?');
    expect(htmlInicioNino(perfil({}, { edad: 10 }))).toContain('Soy Tino, un guatín. Primero, tres preguntas cortas.');
    // Con la primera lección hecha, o algo sabido por la ubicación, ya no.
    expect(htmlInicioNino(perfil({ hechas: hechas('k1-l1') }))).not.toContain('Soy Tino');
    expect(sinEmpezarNino({ sabidas: ['k1'] })).toBe(false);
    expect(sinEmpezarNino(undefined)).toBe(true);
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
    const html = htmlAlcanciaNino(p, '2026-10-25');
    expect(html).toContain('$15.000');
    expect(html).toContain('Ahorrar');
    expect(html).toContain('href="#il-frasco"');
    expect(htmlAlcanciaNino(perfil(), '2026-10-25')).toContain('Cuando recibas dinero, toca Guardé.');
  });

  it('Yo muestra una insignia por unidad terminada y "Cambiar de perfil"', () => {
    const html = htmlYoNino(perfil({ hechas: hechas('k1-l1', 'k1-l2', 'k1-l3') }));
    expect(html.match(/href="#il-insignia"/g)).toHaveLength(1);
    expect(html.match(/kinsignia--pendiente/g)).toHaveLength(7);
    expect(html).toContain('Cambiar de perfil');
  });

  // APR.6b (ADR 100 D5): el enlace está siempre en el marcado; el CSS solo lo
  // muestra en un teléfono propio del niño sin nube (`.kid-propio`).
  it('Yo trae "Este teléfono es de un adulto", con su acción', () => {
    const doc = document.createElement('div');
    doc.innerHTML = htmlYoNino(perfil());
    const enlace = doc.querySelector('.knino-adulto');
    expect(enlace.textContent).toBe('Este teléfono es de un adulto');
    expect(enlace.dataset.action).toBe('telefono-adulto');
  });
});

describe('la lección con la piel del niño (D7, D9)', () => {
  const leccion = k1['k1-l1'];
  const ctx = { eyebrow: 'Unidad 1 · Para qué sirve el dinero', tope: 20_000, terminada: false, entrada: false, nino: true };

  it('Tino explica la idea en su globo', () => {
    const html = htmlLeccion(crearSesion(leccion), leccion, ctx);
    expect(html).toContain('href="#il-tino-explica"');
    expect(html).toContain('leccion-nino__globo');
    expect(html).toContain('>Siguiente<');
  });

  it('tras un error, Tino anima con "¡Casi!" y la correcta dice "Esta era"', () => {
    let s = avanzar(crearSesion(leccion), leccion).sesion;
    s = responderElegir(s, leccion, 1);
    const html = htmlLeccion(s, leccion, ctx);
    expect(html).toContain('¡Casi!');
    expect(html).toContain('href="#il-tino-anima"');
    expect(html).toContain('Esta era');
    expect(html).toContain('>Sigamos<');
    expect(html).not.toMatch(/danger|error/);
  });

  it('el adulto no ve a Tino ni la voz del niño', () => {
    let s = avanzar(crearSesion(leccion), leccion).sesion;
    s = responderElegir(s, leccion, 1);
    const html = htmlLeccion(s, leccion, { ...ctx, nino: false });
    expect(html).not.toContain('il-tino');
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
    // La unidad terminada trae a Tino en grande; la lección suelta, el de siempre.
    expect(html).toContain('href="#il-tino-celebra-grande"');
    expect(html).toContain('destellos__punto');
    expect(html).toContain('Nueva insignia en Yo');
    expect(html).toContain('En tu frasco Gastar tienes $6.000.');
    expect(html).toMatch(/data-action="leccion-salir-a" data-vista="alcancia"/);
    expect(html).toContain('Volver a la ruta');
    const vacio = htmlLeccion(s, leccion, { ...ctx, terminada: true, unidad, celebrarUnidad: false, avance: { hechas: 1, total: 3 }, usalo: { frasco: 'ahorrar', saldo: 0, pregunta: '¿Cuánto?' } });
    expect(vacio).toContain('¡Lección lista!');
    expect(vacio).toContain('href="#il-tino-celebra"');
    expect(vacio).not.toContain('il-tino-celebra-grande');
    expect(vacio).toContain('Tu frasco Ahorrar está vacío por ahora.');
  });
});

describe('contenido del niño, las ocho unidades (D6, APR.3f)', () => {
  const lecciones = Object.values(CONTENIDO_NINO).flatMap(u => Object.values(u));
  const pasos = [...lecciones, ubicacionNino].flatMap(l => l.pasos.map(p => [l.id, p]));

  it('cada lección del catálogo tiene su contenido y cierra con "Úsalo de verdad"', () => {
    for (const u of UNIDADES_NINO) {
      expect(Object.keys(CONTENIDO_NINO[u.id]).sort(), u.id).toEqual(u.lecciones.map(l => l.id).sort());
    }
    for (const l of lecciones) {
      expect(l.pasos.at(-1).tipo, l.id).toBe('aplica');
      expect(['ahorrar', 'gastar', 'compartir'], l.id).toContain(l.pasos.at(-1).usalo.frasco);
    }
  });

  it('frases de máximo 10 palabras y sin guiones largos ni medios', () => {
    const textos = pasos.flatMap(([, p]) => [
      p.titulo, p.texto, p.pregunta, p.bien, p.ayuda, ...(p.opciones ?? []), ...(p.casi ?? []), p.usalo?.pregunta,
      ...(p.tarjetas ?? []).flatMap(t => [t.titulo, t.detalle, t.casi]),
    ]).filter(Boolean);
    for (const t of textos) {
      for (const frase of t.split(/(?<=[.?!])\s+/)) {
        expect(frase.split(/\s+/).filter(Boolean).length, frase).toBeLessThanOrEqual(10);
      }
    }
    expect(JSON.stringify([CONTENIDO_NINO, ubicacionNino])).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`));
  });

  it('cada opción equivocada trae su explicación', () => {
    for (const [id, p] of pasos.filter(([, x]) => x.tipo === 'elegir')) {
      p.opciones.forEach((_, i) => { if (i !== p.correcta) expect(p.casi[i], `${id} ${i}`).toBeTruthy(); });
    }
  });

  it('clasificar va de los dos lados y cada tarjeta explica su "casi"', () => {
    for (const [id, p] of pasos.filter(([, x]) => x.tipo === 'clasificar')) {
      expect(p.tarjetas.some(t => t.es) && p.tarjetas.some(t => !t.es), id).toBe(true);
      for (const t of p.tarjetas) expect(t.casi, `${id} ${t.titulo}`).toBeTruthy();
      expect(p.bien, id).toBeTruthy();
    }
  });
});

describe('la prueba de ubicación del niño, desde los 10 (D9)', () => {
  it('tres preguntas, una por unidad de la 1 a la 3, con "Todavía no lo sé"', () => {
    expect(ubicacionNino.pasos.map(p => p.unidad)).toEqual(['k1', 'k2', 'k3']);
    expect(ubicacionNino.pasos.every(p => p.noSe && p.tipo === 'elegir')).toBe(true);
    expect(ubicacionNino.sinRepetir).toBe(true);
  });

  it('el resultado usa la ruta del niño: lo sabido y dónde empieza', () => {
    const sesion = { respuestas: { 0: true, 1: true, 2: false } };
    const r = resultadoUbicacion(ubicacionNino, sesion, UNIDADES_NINO);
    expect(r.sabidas).toEqual(['k1', 'k2']);
    expect(r.empieza.id).toBe('k3');
  });

  it('el resultado del niño nombra sus unidades y ofrece ver su ruta', () => {
    const sesion = { ...crearSesion(ubicacionNino), respuestas: { 0: true, 1: true, 2: false } };
    const html = htmlLeccion(sesion, ubicacionNino, {
      tope: 20_000, terminada: true, entrada: false, nino: true, catalogo: UNIDADES_NINO,
      ubicacion: resultadoUbicacion(ubicacionNino, sesion, UNIDADES_NINO),
    });
    expect(html).toContain('Empiezas en la unidad 3');
    expect(html).toContain('Y 3 unidades más: compartir, la reserva y el interés.');
    expect(html).toContain('Las dos que ya sabes ya son insignias en Yo.');
    expect(html).toContain('Ver mi ruta');
  });

  it('se ofrece solo desde los 10 años y antes de empezar', () => {
    expect(ofreceUbicacionNino(perfil({}, { edad: 8 }))).toBe(false);
    expect(ofreceUbicacionNino(perfil({}, { edad: 10 }))).toBe(true);
    expect(ofreceUbicacionNino(perfil({ hechas: { 'k1-l1': 'x' } }, { edad: 11 }))).toBe(false);
    expect(ofreceUbicacionNino(perfil({ ubicacion: '2026-10-25' }, { edad: 11 }))).toBe(false);
    expect(htmlInicioNino(perfil({}, { edad: 11 }), '2026-10-25')).toContain('Antes de empezar, tres preguntas');
    expect(htmlInicioNino(perfil({}, { edad: 8 }), '2026-10-25')).not.toContain('Antes de empezar');
  });
});

describe('la alcancía anota, no mueve dinero (APR.3d, D3 y D9)', () => {
  const conDinero = () => perfil({}, { movimientos: [{ frasco: 'ahorrar', monto: 27_000 }, { frasco: 'gastar', monto: 6_000 }, { frasco: 'compartir', monto: 3_000 }] });
  let n = 0;
  const id = () => `x${++n}`;

  it('lee montos como los escribe un niño', () => {
    expect(leerMonto('5.000')).toBe(5_000);
    expect(leerMonto('12 000')).toBe(12_000);
    expect(leerMonto('')).toBe(0);
  });

  it('"Guardé" entra al frasco que elija; "Gasté" y "Compartí" salen del suyo', () => {
    expect(crearMovimientos({ tipo: 'guarde', monto: 5_000, frasco: 'ahorrar', nota: ' Regalo ' }, '2026-10-25', id))
      .toMatchObject([{ frasco: 'ahorrar', monto: 5_000, tipo: 'guarde', nota: 'Regalo', fecha: '2026-10-25' }]);
    expect(crearMovimientos({ tipo: 'gaste', monto: 3_000 }, '2026-10-25', id)).toMatchObject([{ frasco: 'gastar', monto: -3_000 }]);
    expect(crearMovimientos({ tipo: 'comparti', monto: 1_000 }, '2026-10-25', id)).toMatchObject([{ frasco: 'compartir', monto: -1_000 }]);
  });

  it('mover deja dos movimientos con el mismo par: sale de uno y entra al otro', () => {
    const [sale, entra] = crearMovimientos({ tipo: 'mover', monto: 2_000, desde: 'gastar', hacia: 'ahorrar' }, '2026-10-25', id);
    expect(sale).toMatchObject({ frasco: 'gastar', monto: -2_000 });
    expect(entra).toMatchObject({ frasco: 'ahorrar', monto: 2_000 });
    expect(sale.par).toBe(entra.par);
  });

  it('no deja gastar más de lo que hay, y lo dice en la voz del niño', () => {
    expect(validarMovimiento({ tipo: 'gaste', monto: 7_000 }, conDinero())).toEqual(['En Gastar solo tienes $6.000.']);
    expect(validarMovimiento({ tipo: 'gaste', monto: 0 }, conDinero())).toContain('Escribe cuánto dinero.');
    expect(validarMovimiento({ tipo: 'guarde', monto: 5_000, frasco: 'ahorrar' }, perfil())).toEqual([]);
    expect(validarMovimiento({ tipo: 'mover', monto: 1_000, desde: 'gastar', hacia: 'gastar' }, conDinero())).toEqual(['Elige dos frascos distintos.']);
  });

  it('mover entre frascos lo decide el tutor; por defecto, sí', () => {
    expect(puedeMover(perfil())).toBe(true);
    const sinMover = perfil({}, { mesada: { puedeMover: false } });
    expect(puedeMover(sinMover)).toBe(false);
    expect(validarMovimiento({ tipo: 'mover', monto: 1_000, desde: 'gastar', hacia: 'ahorrar' }, sinMover)).toEqual(['Mover entre frascos no está activo.']);
  });

  it('la hoja pregunta en la voz del niño y dice cuánto hay en el frasco', () => {
    const gaste = htmlMovimientoNino('gaste', conDinero());
    expect(gaste).toContain('¿Cuánto gastaste?');
    expect(gaste).toContain('En Gastar tienes $6.000.');
    expect(gaste).toContain('data-monto="5000"');
    expect(htmlMovimientoNino('guarde', perfil())).toContain('¿En qué frasco?');
    expect(htmlMovimientoNino('mover', conDinero())).toContain('¿De qué frasco sale?');
  });

  it('la alcancía ofrece Guardé, Gasté y Compartí, y mover solo si hay dinero y está permitido', () => {
    const html = htmlAlcanciaNino(conDinero(), '2026-10-25');
    expect(html).toContain('data-tipo="guarde"');
    expect(html).toContain('data-tipo="gaste"');
    expect(html).toContain('data-tipo="comparti"');
    expect(html).toContain('Mover dinero entre frascos');
    expect(htmlAlcanciaNino(perfil(), '2026-10-25')).not.toContain('Mover dinero entre frascos');
  });
});

describe('la meta del niño responde en semanas y en fecha (APR.3d, D9)', () => {
  it('con lo que ya tiene en Ahorrar, dice cuántas semanas faltan y para qué día', () => {
    expect(planMeta({ precio: 32_000, semanal: 4_000, ahorrado: 0, hoyISO: '2026-10-24' }))
      .toMatchObject({ falta: 32_000, semanas: 8, fechaISO: '2026-12-19' });
    expect(planMeta({ precio: 45_000, semanal: 4_000, ahorrado: 27_000, hoyISO: '2026-10-24' }))
      .toMatchObject({ falta: 18_000, semanas: 5, proporcion: 0.6 });
    expect(planMeta({ precio: 10_000, semanal: 1_000, ahorrado: 12_000, hoyISO: '2026-10-24' }))
      .toMatchObject({ falta: 0, semanas: 0 });
    const html = htmlPlanMeta(perfil(), 32_000, 4_000, '2026-10-24');
    expect(html).toContain('Lo tendrás en 8 semanas.');
    expect(html).toContain('Para el 19 de diciembre.');
  });

  it('una meta pide dibujo, nombre, precio y cuánto guarda cada semana', () => {
    expect(validarMeta({})).toHaveLength(4);
    expect(validarMeta({ dibujo: 'libro', nombre: 'Libro de dinosaurios', precio: 32_000, semanal: 4_000 })).toEqual([]);
  });

  it('una meta a la vez; la tarjeta muestra lo que falta y, lograda, "Lo compré"', () => {
    const meta = { id: 'm1', dibujo: 'balon', nombre: 'balón', precio: 45_000, semanal: 4_000 };
    const p = perfil({}, { metas: [meta], movimientos: [{ frasco: 'ahorrar', monto: 27_000 }] });
    expect(metaActiva(p).id).toBe('m1');
    const html = htmlTarjetaMeta(p, '2026-10-24');
    expect(html).toContain('Mi balón · $45.000');
    expect(html).toContain('Te faltan $18.000. Unas 5 semanas.');
    expect(html).toContain('aria-valuenow="60"');
    const lista = perfil({}, { metas: [meta], movimientos: [{ frasco: 'ahorrar', monto: 45_000 }] });
    expect(htmlTarjetaMeta(lista, '2026-10-24')).toContain('Lo compré');
    expect(htmlTarjetaMeta(perfil(), '2026-10-24')).toContain('Crear una meta');
    expect(htmlMetaNino(perfil(), {}, '2026-10-24')).toContain('¿Para qué quieres ahorrar?');
  });

  it('cada frasco se llena contra lo suyo, nunca contra los otros dos (R60)', () => {
    const meta = { id: 'm1', dibujo: 'balon', nombre: 'balón', precio: 40_000, semanal: 4_000 };
    const p = perfil({}, {
      metas: [meta], mesada: { reparto: { gastar: 8_000, compartir: 2_000 } },
      movimientos: [{ frasco: 'ahorrar', monto: 20_000 }, { frasco: 'gastar', monto: 4_000 }, { frasco: 'compartir', monto: 2_000 }],
    });
    expect(llenadoFrasco('ahorrar', p)).toBe(0.5);
    expect(llenadoFrasco('gastar', p)).toBe(0.5);
    expect(llenadoFrasco('compartir', p)).toBe(1);
    // Sin con qué medir: un fondo visible si hay dinero, nada si no.
    expect(llenadoFrasco('gastar', perfil({}, { movimientos: [{ frasco: 'gastar', monto: 1_000 }] }))).toBe(0.15);
    expect(llenadoFrasco('gastar', perfil())).toBe(0);
  });
});

