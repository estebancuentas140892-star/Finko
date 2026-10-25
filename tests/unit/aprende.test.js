/**
 * aprende.test.js - capa Aprende del adulto (APR.1a, ADR 092).
 *
 * Cubre:
 * - infra/hormiga.js: criterio único de gasto hormiga y su resumen del mes.
 * - Ruta: estado de cada unidad, unidad actual, siguiente lección (D8).
 * - Motor de la lección: elegir, clasificar, control, ordenar; la pregunta
 *   fallada vuelve al final pero antes del Aplícalo; el contador no se infla
 *   con una pregunta que vuelve (D7).
 * - Una lección suma una sola vez y las semanas activas son monótonas (D3).
 * - Aplícalo de la unidad 3: dato real o pedido del dato (R57).
 * - Contenido de la unidad 3 bien formado para el motor.
 * - Vista: la ruta y cada tipo de paso se pintan sin rojo ni datos rotos.
 */

import { describe, it, expect } from 'vitest';
import { UMBRAL_GASTO_HORMIGA, esGastoHormiga, resumenHormigaMes, topeHormiga, limiteHormiga } from '../../modules/infra/hormiga.js';
import { UMBRAL_GASTO_HORMIGA as UMBRAL_LOGROS } from '../../modules/dominio/logros/logic.js';
import {
  UNIDADES, unidadDeLeccion, metaLeccion, leccionDisponible, normalizarAprende,
  estadoRuta, siguienteLeccion, semanaISO, registrarLeccionHecha,
  crearSesion, pasoActual, numeroDePaso, responderElegir, clasificarTarjeta,
  seguirClasificando, cambiarControl, moverItem, comprobarOrden, avanzar,
  pasoParaRetomar, mezclarSinAcertar, CALCULOS, RESULTADOS, limiteSugerido, aplicaHormiga,
} from '../../modules/dominio/aprende/logic.js';
import { htmlRuta, htmlLeccion, htmlSiguientePaso } from '../../modules/dominio/aprende/view.js';
import u1 from '../../modules/dominio/aprende/lecciones/u1.js';
import u2 from '../../modules/dominio/aprende/lecciones/u2.js';
import u3 from '../../modules/dominio/aprende/lecciones/u3.js';
import u4 from '../../modules/dominio/aprende/lecciones/u4.js';
import { APLICA, modeloAplica, mesesEnPalabras, gastosFijosMensuales, tasaMensualDeuda } from '../../modules/dominio/aprende/aplica.js';

/** Contenido escrito, por unidad. Cada unidad nueva se suma acá. */
const CONTENIDO = { u1, u2, u3, u4 };
/** Todas las lecciones escritas, en un solo mapa id → lección. */
const LECCIONES = Object.assign({}, ...Object.values(CONTENIDO));

/** Lección mínima con los cuatro tipos de paso respondibles y un cierre. */
const LECCION = {
  id: 'u3-l2',
  pasos: [
    { tipo: 'concepto', titulo: 'Idea' },
    { tipo: 'elegir', pregunta: '¿Cuál?', opciones: ['a', 'b', 'c'], correcta: 1, bien: 'ok', casi: ['x', '', 'y'] },
    { tipo: 'clasificar', pregunta: '¿Es?', si: 'Sí', no: 'No', tarjetas: [
      { titulo: 'T1', monto: 5_000, es: true, casi: 'c1' },
      { titulo: 'T2', monto: 900_000, es: false, casi: 'c2' },
    ] },
    { tipo: 'ordenar', pregunta: 'Ordena', items: ['uno', 'dos', 'tres'], bien: 'ok', casi: 'casi' },
    { tipo: 'aplica', calculo: 'hormiga-mes' },
  ],
};

const HOY = '2026-10-24';

// ── infra/hormiga.js ─────────────────────────────────────────────

describe('infra/hormiga.js', () => {
  it('es la única fuente del umbral: logros re-exporta el mismo valor', () => {
    expect(UMBRAL_GASTO_HORMIGA).toBe(20_000);
    expect(UMBRAL_LOGROS).toBe(UMBRAL_GASTO_HORMIGA);
  });

  it('cuenta el tope inclusive y descarta montos inválidos', () => {
    expect(esGastoHormiga({ monto: 20_000 })).toBe(true);
    expect(esGastoHormiga({ monto: 20_001 })).toBe(false);
    expect(esGastoHormiga({ monto: 0 })).toBe(false);
    expect(esGastoHormiga({ monto: 'abc' })).toBe(false);
    expect(esGastoHormiga({ monto: 25_000 }, 30_000)).toBe(true);
  });

  it('resume el mes: total, compras y categorías de mayor a menor', () => {
    const gastos = [
      { fecha: '2026-10-02', monto: 6_000, categoria: 'Café' },
      { fecha: '2026-10-03', monto: 4_000, categoria: 'Café' },
      { fecha: '2026-10-05', monto: 18_000, categoria: 'Domicilios' },
      { fecha: '2026-10-06', monto: 300_000, categoria: 'Mercado' },
      { fecha: '2026-09-30', monto: 5_000, categoria: 'Café' },
      { fecha: '2026-10-07', monto: 2_000 },
    ];
    const r = resumenHormigaMes(gastos, '2026-10');
    expect(r.total).toBe(30_000);
    expect(r.cuantos).toBe(4);
    expect(r.porCategoria.map(g => g.categoria)).toEqual(['Domicilios', 'Café', 'Otros']);
    expect(r.porCategoria[1]).toMatchObject({ total: 10_000, cuantos: 2 });
  });

  it('topeHormiga() lee el configurado y cae al de siempre si no es válido', () => {
    expect(topeHormiga({ hormiga: { tope: 15_000 } })).toBe(15_000);
    expect(topeHormiga({ hormiga: { tope: 500 } })).toBe(UMBRAL_GASTO_HORMIGA);
    expect(topeHormiga({ hormiga: { tope: 'x' } })).toBe(UMBRAL_GASTO_HORMIGA);
    expect(topeHormiga(undefined)).toBe(UMBRAL_GASTO_HORMIGA);
  });

  it('limiteHormiga() devuelve null sin límite o con uno inválido', () => {
    expect(limiteHormiga({ hormiga: { limite: 150_000 } })).toBe(150_000);
    expect(limiteHormiga({ hormiga: { limite: null } })).toBeNull();
    expect(limiteHormiga({ hormiga: { limite: 0 } })).toBeNull();
    expect(limiteHormiga({})).toBeNull();
  });

  it('un mes inválido o sin gastos devuelve el resumen vacío', () => {
    expect(resumenHormigaMes([], '2026-10')).toEqual({ total: 0, cuantos: 0, porCategoria: [] });
    expect(resumenHormigaMes(undefined, '')).toEqual({ total: 0, cuantos: 0, porCategoria: [] });
  });
});

// ── Catálogo y ruta ──────────────────────────────────────────────

describe('catálogo de la ruta (D8)', () => {
  it('tiene nueve unidades numeradas en orden, cada una con su sección', () => {
    expect(UNIDADES.map(u => u.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const u of UNIDADES) {
      expect(u.seccion).toBeTruthy();
      expect(u.dominio).toBeTruthy();
    }
  });

  it('resuelve la unidad y los metadatos de una lección por su id', () => {
    expect(unidadDeLeccion('u3-l2')?.nombre).toBe('Gastos hormiga y límites');
    expect(metaLeccion('u3-l2')?.titulo).toBe('Encuentra tus gastos hormiga');
    expect(unidadDeLeccion('zz-l1')).toBeUndefined();
  });

  it('toda lección del catálogo tiene su contenido, y todo contenido está en el catálogo', () => {
    const delCatalogo = UNIDADES.flatMap(u => u.lecciones.filter(leccionDisponible).map(l => l.id)).sort();
    expect(Object.keys(LECCIONES).sort()).toEqual(delCatalogo);
    for (const id of delCatalogo) expect(LECCIONES[id].id).toBe(id);
  });

  it('toda unidad con lecciones dice qué aprendiste, para su celebración', () => {
    for (const u of UNIDADES.filter(x => x.lecciones.length)) expect(u.aprendiste, u.id).toBeTruthy();
  });
});

/** `hechas` con todas las lecciones escritas de las unidades pedidas. */
const hechasDe = (...ids) => Object.fromEntries(UNIDADES.filter(u => ids.includes(u.id))
  .flatMap(u => u.lecciones.map(l => [l.id, '2026-10-01'])));

describe('estadoRuta() y siguienteLeccion()', () => {
  const primera = UNIDADES.find(u => u.lecciones.some(leccionDisponible));

  it('sin avance, la actual es la primera unidad con lecciones escritas', () => {
    const ruta = estadoRuta(undefined);
    expect(ruta.find(e => e.estado === 'actual')?.unidad.id).toBe(primera.id);
    expect(ruta.filter(e => e.estado === 'actual')).toHaveLength(1);
    expect(siguienteLeccion(undefined)?.id).toBe(primera.lecciones[0].id);
  });

  it('una unidad marcada por la prueba de ubicación queda como sabida', () => {
    const ruta = estadoRuta({ sabidas: ['u1', 'u2'] });
    expect(ruta[0].estado).toBe('sabida');
    expect(ruta[1].estado).toBe('sabida');
  });

  it('cuenta las lecciones hechas y recomienda la primera que falta', () => {
    const ruta = estadoRuta({ hechas: { 'u3-l1': '2026-10-01' } });
    expect(ruta.find(e => e.unidad.id === 'u3')).toMatchObject({ hechas: 1, total: 4 });
  });

  it('terminar la unidad 3 la deja hecha y la ruta sigue con la 4', () => {
    const hechas = hechasDe('u3');
    const ruta = estadoRuta({ hechas, sabidas: ['u1', 'u2'] });
    expect(ruta.find(e => e.unidad.id === 'u3').estado).toBe('hecha');
    expect(ruta.find(e => e.estado === 'actual')?.unidad.id).toBe('u4');
    expect(siguienteLeccion({ hechas, sabidas: ['u1', 'u2'] })?.id).toBe('u4-l1');
  });

  it('con todas las lecciones escritas hechas no queda unidad actual', () => {
    const hechas = hechasDe(...UNIDADES.map(u => u.id));
    expect(estadoRuta({ hechas }).some(e => e.estado === 'actual')).toBe(false);
    expect(siguienteLeccion({ hechas })).toBeNull();
    expect(htmlRuta({ hechas })).toContain('Ya hiciste todas las lecciones disponibles');
  });

  it('normalizarAprende tolera un estado roto', () => {
    expect(normalizarAprende({ hechas: [], sabidas: 'x', semanas: null, enCurso: { paso: 2 } }))
      .toEqual({ hechas: {}, sabidas: [], semanas: [], enCurso: null });
  });
});

// ── Semanas activas y registro (D3) ──────────────────────────────

describe('semanaISO()', () => {
  it('numera semanas ISO, también en los bordes del año', () => {
    expect(semanaISO('2026-10-24')).toBe('2026-W43');
    expect(semanaISO('2026-01-01')).toBe('2026-W01');
    expect(semanaISO('2027-01-01')).toBe('2026-W53');
    expect(semanaISO('2024-12-30')).toBe('2025-W01');
    expect(semanaISO('nada')).toBeNull();
  });
});

describe('registrarLeccionHecha()', () => {
  it('la primera vez guarda la fecha, suma la semana y suelta el avance guardado', () => {
    const { aprende, primeraVez } = registrarLeccionHecha(
      { enCurso: { id: 'u3-l2', paso: 3 } }, 'u3-l2', HOY);
    expect(primeraVez).toBe(true);
    expect(aprende.hechas['u3-l2']).toBe(HOY);
    expect(aprende.semanas).toEqual(['2026-W43']);
    expect(aprende.enCurso).toBeNull();
  });

  it('repasar no suma otra vez: conserva la primera fecha (regla anti-trampa)', () => {
    const antes = { hechas: { 'u3-l2': '2026-09-01' }, semanas: ['2026-W36'] };
    const { aprende, primeraVez } = registrarLeccionHecha(antes, 'u3-l2', HOY);
    expect(primeraVez).toBe(false);
    expect(aprende.hechas['u3-l2']).toBe('2026-09-01');
    expect(aprende.semanas).toEqual(['2026-W36', '2026-W43']);
  });

  it('no duplica una semana ya activa y no muta la entrada', () => {
    const antes = { hechas: {}, semanas: ['2026-W43'] };
    const { aprende } = registrarLeccionHecha(antes, 'u3-l2', HOY);
    expect(aprende.semanas).toEqual(['2026-W43']);
    expect(antes.hechas).toEqual({});
  });
});

// ── Motor de la lección (D7) ─────────────────────────────────────

/** Sesión parada en el paso de índice `i` (crearSesion retoma ahí). */
const en = (i) => crearSesion(LECCION, i);

/** Ordena con las flechas, como lo haría una persona, hasta acertar. */
function ordenarAMano(s) {
  let t = s;
  for (let pasada = 0; pasada < t.orden.length; pasada++) {
    for (let i = 0; i < t.orden.length - 1; i++) {
      if (t.orden[i] > t.orden[i + 1]) t = moverItem(t, i, 1);
    }
  }
  return t;
}

describe('motor de la lección', () => {
  it('cuenta los pasos abiertos: una pregunta fallada no frena el contador del siguiente', () => {
    const s = avanzar(responderElegir(en(1), LECCION, 0), LECCION).sesion;
    expect(pasoActual(s, LECCION).tipo).toBe('clasificar');
    expect(numeroDePaso(s)).toBe(3);
  });

  it('arranca en el primer paso y cuenta "1 de N"', () => {
    const s = crearSesion(LECCION);
    expect(pasoActual(s, LECCION).tipo).toBe('concepto');
    expect(numeroDePaso(s)).toBe(1);
    expect(s.total).toBe(5);
  });

  it('el concepto deja avanzar; una pregunta sin responder no', () => {
    expect(pasoActual(avanzar(en(0), LECCION).sesion, LECCION).tipo).toBe('elegir');
    const s = en(1);
    expect(avanzar(s, LECCION).sesion).toBe(s);
  });

  it('acertar en "elegir" deja avanzar sin repetir la pregunta', () => {
    const s = responderElegir(en(1), LECCION, 1);
    expect(s.revision).toEqual({ correcto: true, elegida: 1 });
    expect(s.cola).toEqual([0, 1, 2, 3, 4]);
  });

  it('fallar en "elegir" vuelve a poner la pregunta al final, antes del Aplícalo', () => {
    const s = responderElegir(en(1), LECCION, 0);
    expect(s.revision.correcto).toBe(false);
    expect(s.cola).toEqual([0, 1, 2, 3, 1, 4]);
  });

  it('una respuesta revisada no se puede cambiar', () => {
    const s = responderElegir(en(1), LECCION, 0);
    expect(responderElegir(s, LECCION, 1)).toBe(s);
  });

  it('clasificar: el acierto saca la tarjeta; el error la manda al fondo y pide seguir', () => {
    let s = clasificarTarjeta(en(2), LECCION, false);   // T1 es hormiga: error
    expect(s.revision).toEqual({ correcto: false, elegida: 0 });
    expect(s.tarjetas.cola).toEqual([1, 0]);
    expect(clasificarTarjeta(s, LECCION, true)).toBe(s); // bloqueado hasta seguir
    s = seguirClasificando(s);
    s = clasificarTarjeta(s, LECCION, false);            // T2 no es: acierto
    expect(s.tarjetas).toMatchObject({ cola: [0], no: 1, si: 0 });
    expect(avanzar(s, LECCION).sesion).toBe(s);          // falta una tarjeta
    s = clasificarTarjeta(s, LECCION, true);
    expect(s.tarjetas).toMatchObject({ cola: [], si: 1, no: 1 });
    expect(pasoActual(avanzar(s, LECCION).sesion, LECCION).tipo).toBe('ordenar');
  });

  it('ordenar: arranca desordenado, las flechas mueven y comprobar revisa', () => {
    const s = en(3);
    expect(s.orden).not.toEqual([0, 1, 2]);
    expect(moverItem(s, 0, -1)).toBe(s);                 // fuera de rango
    expect(comprobarOrden(s, LECCION).revision.correcto).toBe(false);
    const t = ordenarAMano(s);
    expect(t.orden).toEqual([0, 1, 2]);
    expect(comprobarOrden(t, LECCION).revision.correcto).toBe(true);
  });

  it('mezclarSinAcertar nunca devuelve el orden correcto', () => {
    for (let n = 2; n < 7; n++) {
      for (let semilla = 0; semilla < 10; semilla++) {
        const orden = mezclarSinAcertar(n, semilla);
        expect([...orden].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
        expect(orden.every((x, i) => x === i)).toBe(false);
      }
    }
  });

  it('la pregunta que vuelve no infla el contador y la lección termina en el Aplícalo', () => {
    let s = avanzar(en(0), LECCION).sesion;                         // elegir
    s = avanzar(responderElegir(s, LECCION, 2), LECCION).sesion;   // falla, clasificar
    s = clasificarTarjeta(clasificarTarjeta(s, LECCION, true), LECCION, false);
    s = avanzar(s, LECCION).sesion;                                 // ordenar
    s = comprobarOrden(ordenarAMano(s), LECCION);
    const vuelta = avanzar(s, LECCION);
    expect(vuelta.terminada).toBe(false);
    expect(pasoActual(vuelta.sesion, LECCION).tipo).toBe('elegir');
    expect(vuelta.sesion.repaso).toBe(true);
    expect(numeroDePaso(vuelta.sesion)).toBe(4);                   // no pasa de 4 de 5
    const cierre = avanzar(responderElegir(vuelta.sesion, LECCION, 1), LECCION);
    expect(cierre.terminada).toBe(true);
    expect(pasoActual(cierre.sesion, LECCION).tipo).toBe('aplica');
  });

  it('retoma en el paso guardado y calcula desde dónde retomar', () => {
    const s = en(2);
    expect(pasoActual(s, LECCION).tipo).toBe('clasificar');
    expect(pasoParaRetomar(s)).toBe(2);
    expect(pasoParaRetomar(crearSesion(LECCION))).toBe(0);
    expect(pasoActual(crearSesion(LECCION, 99), LECCION).tipo).toBe('concepto');
  });
});

describe('pasos "control"', () => {
  const paso = u3['u3-l2'].pasos.find(p => p.tipo === 'control');
  const leccion = { id: 'x', pasos: [paso] };

  it('el cálculo del tinto da las cifras del diseño', () => {
    expect(CALCULOS['gasto-repetido-anual']({ precio: 4_500, dias: 5 }))
      .toEqual({ anual: 1_170_000, mensual: 97_500, ahorroConTres: 468_000 });
    expect(CALCULOS['gasto-repetido-anual']({ precio: 3_000, dias: 3 }).ahorroConTres).toBe(0);
  });

  it('arranca con los valores iniciales y rechaza valores fuera de las opciones o del rango', () => {
    let s = crearSesion(leccion);
    expect(s.valores).toEqual({ precio: 4_500, dias: 5 });
    expect(cambiarControl(s, leccion, 'precio', 5_000)).toBe(s);
    expect(cambiarControl(s, leccion, 'dias', 9)).toBe(s);
    s = cambiarControl(s, leccion, 'dias', 3);
    expect(s.valores.dias).toBe(3);
  });
});

// ── Aplícalo ─────────────────────────────────────────────────────

describe('aplicaHormiga() y limiteSugerido()', () => {
  it('sugiere un límite un poco menor, no la mitad (80 %, a la decena de mil)', () => {
    expect(limiteSugerido(186_400)).toBe(150_000);
    expect(limiteSugerido(12_000)).toBe(10_000);
    expect(limiteSugerido(0)).toBe(0);
  });

  it('con gastos pequeños en el mes devuelve total, compras, grupos y diferencia', () => {
    const gastos = [
      { fecha: '2026-10-02', monto: 15_000, categoria: 'Café' },
      { fecha: '2026-10-03', monto: 18_000, categoria: 'Domicilios' },
      { fecha: '2026-10-04', monto: 120_000, categoria: 'Mercado' },
    ];
    expect(aplicaHormiga(gastos, HOY)).toMatchObject({
      sinDato: false, mesNombre: 'octubre', total: 33_000, cuantos: 2, limite: 30_000, diferencia: 3_000,
    });
  });

  it('sin gastos pequeños en el mes pide el dato en vez de rellenar (R57)', () => {
    expect(aplicaHormiga([], HOY)).toMatchObject({ sinDato: true, mesNombre: 'octubre' });
  });
});

// ── Aplícalo de cada unidad (aplica.js) ──────────────────────────

/** Datos vacíos de partida; cada prueba sobreescribe lo que le interesa. */
const datos = (extra = {}) => ({
  gastos: [], cuentas: [], ingresos: [], compromisos: [], metas: [], inversiones: [],
  ahorro: { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [] },
  categoriasPersonalizadas: [], hoyISO: HOY, tope: 20_000, limite: null, paso: null, ...extra,
});

describe('APLICA: el Aplícalo de cada unidad', () => {
  const ACCIONES_GLOBALES = new Set(['ir-a-seccion', 'registrar-abrir', 'leccion-limite-hormiga']);

  it('todo cálculo pide el dato que falta o muestra el real, y siempre tiene salida', () => {
    for (const [nombre, fn] of Object.entries(APLICA)) {
      const m = fn(datos());
      expect(m.lead, nombre).toBeTruthy();
      expect(m.acciones.length, nombre).toBeGreaterThan(0);
      for (const a of m.acciones) expect(ACCIONES_GLOBALES.has(a.action), `${nombre} ${a.action}`).toBe(true);
    }
  });

  it('todo paso "aplica" del contenido usa un cálculo que existe', () => {
    for (const leccion of Object.values(LECCIONES)) {
      for (const paso of leccion.pasos.filter(p => p.tipo === 'aplica')) {
        expect(APLICA[paso.calculo], `${leccion.id} ${paso.calculo}`).toBeTypeOf('function');
      }
    }
  });

  it('un cálculo desconocido no deja la lección sin salida', () => {
    expect(modeloAplica('no-existe', datos()).acciones[0].datos.target).toBe('aprende');
  });

  it('meses en palabras y gastos fijos del mes, como en el Fondo', () => {
    expect(mesesEnPalabras(1.5)).toBe('1 mes y 2 semanas');
    expect(mesesEnPalabras(0)).toBe('0 meses');
    expect(gastosFijosMensuales([
      { tipo: 'fijo', monto: 1_000_000, frecuencia: 'Mensual' },
      { tipo: 'fijo', monto: 1_200_000, frecuencia: 'Anual' },
      { tipo: 'fijo', monto: 500_000, frecuencia: 'Mensual', activo: false },
      { tipo: 'deuda-entidad', cuotaMensual: 300_000 },
    ])).toBe(1_100_000);
  });

  it('fondo-meses: con fondo dice cuánto te cubre; sin gastos fijos los pide', () => {
    expect(APLICA['fondo-meses'](datos()).sinDato).toBe(true);
    const m = APLICA['fondo-meses'](datos({
      compromisos: [{ tipo: 'fijo', monto: 1_750_000, frecuencia: 'Mensual' }],
      ahorro: { fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 2_000_000 }, aportes: [{ monto: 625_000 }] },
    }));
    expect(m.cifra).toBe('1 mes y 2 semanas');
    expect(m.linea).toContain('3 meses son $5.250.000');
    expect(m.nota).toContain('Te faltan $2.625.000');
  });

  it('dinero-hoy: suma tus cuentas y descuenta lo comprometido del mes', () => {
    const m = APLICA['dinero-hoy'](datos({
      cuentas: [{ nombre: 'Nequi', saldo: 500_000 }, { nombre: 'Ahorros', saldo: 2_000_000 }],
      compromisos: [{ tipo: 'fijo', monto: 1_000_000, frecuencia: 'Mensual' }],
    }));
    expect(m.cifra).toBe('$2.500.000');
    expect(m.linea).toContain('te quedan $1.500.000 libres');
    expect(m.filas[0].nombre).toBe('Ahorros');
  });

  it('reparto-503020: reparte tu ingreso del mes', () => {
    const m = APLICA['reparto-503020'](datos({ ingresos: [{ monto: 2_000_000, frecuencia: 'Mensual' }] }));
    expect(m.filas.map(f => f.monto)).toEqual(['$1.000.000', '$600.000', '$400.000']);
    expect(m.acciones[0]).toMatchObject({ action: 'registrar-abrir', datos: { targetAction: 'presupuesto-abrir-distribucion' } });
  });

  it('deudas: suma saldos y cuotas, y estima los intereses del mes con la tasa anotada', () => {
    const m = APLICA['deudas'](datos({ compromisos: [
      { tipo: 'deuda-entidad', descripcion: 'Tarjeta', saldoTotal: 1_000_000, cuotaMensual: 100_000, tasa: 0.02, tasaUnidad: 'mensual' },
      { tipo: 'deuda-personal', descripcion: 'Primo', saldoTotal: 300_000, cuotaMensual: 50_000 },
    ] }));
    expect(m.cifra).toBe('$1.300.000');
    expect(m.linea).toContain('unos $20.000 se van en intereses');
    expect(tasaMensualDeuda({ tasa: 0.2682, tasaUnidad: 'EA' })).toBeCloseTo(0.02, 3);
  });

  it('metas, inversion-72 e impuestos muestran el dato real o lo piden', () => {
    expect(APLICA['metas'](datos({ metas: [{ nombre: 'Viaje', montoObjetivo: 1_000_000, montoActual: 250_000 }] })).nota)
      .toContain('"Viaje" no tiene fecha');
    expect(APLICA['inversion-72'](datos({ inversiones: [{ nombre: 'CDT', monto: 1_000_000, tasaEA: 12 }] })).filas[0].detalle)
      .toContain('se duplica en unos 6 años');
    expect(APLICA['impuestos'](datos()).sinDato).toBe(true);
    expect(APLICA['impuestos'](datos({ ingresos: [{ monto: 3_000_000, frecuencia: 'Mensual' }] })).cifra).toBe('$36.000.000');
  });
});

describe('RESULTADOS: la lectura de cada control', () => {
  it('todo paso "control" del contenido usa un cálculo con su lectura', () => {
    for (const leccion of Object.values(LECCIONES)) {
      for (const paso of leccion.pasos.filter(p => p.tipo === 'control')) {
        expect(RESULTADOS[paso.calculo], `${leccion.id} ${paso.calculo}`).toBeTypeOf('function');
        const valores = Object.fromEntries(paso.controles.map(c => [c.id, c.inicial]));
        const r = RESULTADOS[paso.calculo](valores);
        expect(r.lead && r.cifra && r.linea, leccion.id).toBeTruthy();
      }
    }
  });

  it('las cifras de cada cálculo', () => {
    expect(RESULTADOS['fondo-objetivo']({ gastos: 1_750_000, meses: 3 }).cifra).toBe('$5.250.000');
    expect(RESULTADOS['aporte-meses']({ meta: 5_250_000, aporte: 250_000 }).cifra).toBe('1 año y 9 meses');
    expect(RESULTADOS['meta-mensual']({ precio: 1_800_000, meses: 6 }).cifra).toBe('$300.000');
    expect(RESULTADOS['libre-por-dia']({ ingreso: 2_000_000, fijos: 1_400_000 }).linea).toContain('$20.000 por día');
    expect(RESULTADOS['regla-503020']({ ingreso: 2_000_000 }).cifra).toBe('$400.000');
    expect(CALCULOS['credito-cuotas']({ monto: 1_000_000, cuotas: 12 }).cuota).toBe(94_560);
    expect(RESULTADOS['gota-a-gota']({ prestamo: 500_000 }).cifra).toBe('$600.000');
    expect(RESULTADOS['interes-compuesto']({ inicial: 1_000_000, anios: 10 }).cifra).toBe('$2.593.742');
    expect(RESULTADOS['regla-72']({ tasa: 8 }).cifra).toBe('9 años');
  });
});

// ── Contenido de todas las unidades ──────────────────────────────

describe('contenido de las lecciones', () => {
  const todosLosPasos = Object.values(LECCIONES).flatMap(l => l.pasos.map(p => [l.id, p]));

  it('la lección 2 de la unidad 3 sigue el diseño: concepto, elegir, clasificar, control y cierre', () => {
    expect(u3['u3-l2'].pasos.map(p => p.tipo)).toEqual(['concepto', 'elegir', 'clasificar', 'control', 'aplica']);
    expect(u3['u3-l2'].pasos[2].tarjetas).toHaveLength(6);
  });

  it('toda lección termina en un Aplícalo, una sola vez y al final', () => {
    for (const leccion of Object.values(LECCIONES)) {
      const tipos = leccion.pasos.map(p => p.tipo);
      expect(tipos.at(-1), leccion.id).toBe('aplica');
      expect(tipos.filter(t => t === 'aplica'), leccion.id).toHaveLength(1);
      expect(tipos.length, leccion.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('cada opción equivocada trae su explicación, y la correcta su "así es"', () => {
    for (const [id, paso] of todosLosPasos.filter(([, p]) => p.tipo === 'elegir')) {
      expect(paso.correcta, id).toBeLessThan(paso.opciones.length);
      paso.opciones.forEach((_, i) => {
        if (i !== paso.correcta) expect(paso.casi[i], `${id} opción ${i}`).toBeTruthy();
      });
      expect(paso.bien, id).toBeTruthy();
    }
  });

  it('las tarjetas para clasificar van de los dos lados y cada una explica su "casi"', () => {
    for (const [id, paso] of todosLosPasos.filter(([, p]) => p.tipo === 'clasificar')) {
      expect(paso.tarjetas.some(t => t.es), id).toBe(true);
      expect(paso.tarjetas.some(t => !t.es), id).toBe(true);
      for (const t of paso.tarjetas) expect(t.casi, `${id} ${t.titulo}`).toBeTruthy();
    }
  });

  it('si el criterio es el gasto pequeño, las tarjetas respetan el tope de la app', () => {
    const hormiga = todosLosPasos.filter(([, p]) => p.tipo === 'clasificar' && p.criterio === 'hormiga');
    expect(hormiga.length).toBeGreaterThan(0);
    for (const [id, paso] of hormiga) {
      for (const t of paso.tarjetas) expect(esGastoHormiga(t), `${id} ${t.titulo}`).toBe(Boolean(t.es));
    }
  });

  it('los pasos "ordenar" traen la explicación de los dos casos', () => {
    for (const [id, paso] of todosLosPasos.filter(([, p]) => p.tipo === 'ordenar')) {
      expect(paso.items.length, id).toBeGreaterThan(2);
      expect(paso.bien && paso.casi, id).toBeTruthy();
    }
  });

  it('ningún texto usa guion largo ni guion medio (CLAUDE.md sección 6)', () => {
    expect(JSON.stringify(CONTENIDO)).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`));
  });
});

// ── Vista ────────────────────────────────────────────────────────

describe('vista', () => {
  it('la ruta pinta la unidad actual con su botón y las demás en "Después"', () => {
    const html = htmlRuta(undefined);
    expect(html).toContain('Unidad 1 · vas aquí');
    expect(html).toMatch(/data-action="leccion-abrir"\s+data-id="u1-l1"/);
    expect(html).toContain('Empezar la lección 1');
    expect(html).toContain('Fondo de emergencia');
    expect(html).toContain('En preparación');
  });

  it('Tu siguiente paso no repite "con tus" cuando la lección ya dice con qué datos termina', () => {
    const u1Meta = UNIDADES[0];
    const conDatos = htmlSiguientePaso({ tipo: 'leccion', leccion: u1Meta.lecciones[0], unidad: u1Meta, hormiga: { cuantos: 0 } }, 20_000);
    expect(conDatos).toContain('Termina en Mis cuentas, con tus saldos.');
    const sinDatos = htmlSiguientePaso({ tipo: 'leccion', leccion: u1Meta.lecciones[1], unidad: u1Meta, hormiga: { cuantos: 0 } }, 20_000);
    expect(sinDatos).toContain('Termina en Mis cuentas, con tus datos.');
  });

  it('con la lección guardada a medias, el botón dice "Seguir"', () => {
    expect(htmlRuta({ enCurso: { id: 'u1-l1', paso: 1 } })).toContain('Seguir la lección 1');
  });

  it('un error se explica con "Casi" en el tono informativo, nunca en rojo', () => {
    const leccion = u3['u3-l2'];
    let s = crearSesion(leccion);
    s = avanzar(s, leccion).sesion;
    s = responderElegir(s, leccion, 2);
    const html = htmlLeccion(s, leccion, { eyebrow: 'Unidad 3', tope: 20_000, terminada: false, entrada: false });
    expect(html).toContain('leccion-fb--casi');
    expect(html).toContain('Esta pregunta vuelve al final');
    expect(html).toContain('Tu respuesta');
    expect(html).toContain('Esta es');
    expect(html).not.toMatch(/danger|error/);
  });

  it('una tarjeta mal clasificada se ve y se explica ella, no la siguiente', () => {
    const leccion = u3['u3-l2'];
    let s = crearSesion(leccion, 2);
    s = clasificarTarjeta(s, leccion, true);            // Arriendo no es hormiga
    const html = htmlLeccion(s, leccion, { eyebrow: 'Unidad 3', tope: 20_000, terminada: false, entrada: false });
    expect(html).toContain('<p class="leccion-tarjeta__titulo">Arriendo</p>');
    expect(html).toContain(leccion.pasos[2].tarjetas[0].casi);
  });

  it('una tarjeta sin monto no pinta la cifra', () => {
    const leccion = u4['u4-l1'];
    const html = htmlLeccion(crearSesion(leccion, 1), leccion, { eyebrow: 'Unidad 4', tope: 20_000, terminada: false, entrada: false });
    expect(html).not.toContain('leccion-tarjeta__monto');
  });

  it('el concepto reemplaza {tope} y los valores legales por sus cifras', () => {
    const leccion = u3['u3-l2'];
    const html = htmlLeccion(crearSesion(leccion), leccion, { eyebrow: 'Unidad 3', tope: 20_000, terminada: false, entrada: true });
    expect(html).not.toContain('{tope}');
    expect(html).toContain('20.000');
    expect(html).toContain('leccion__cuerpo--entra');
    const otra = { id: 'x', pasos: [{ tipo: 'concepto', titulo: 'Hasta {exento4x1000} al mes', texto: 'UVT de {anio}' }, { tipo: 'aplica', calculo: 'x' }] };
    const conValores = htmlLeccion(crearSesion(otra), otra, {
      eyebrow: '', tope: 20_000, terminada: false, entrada: false, valores: { exento4x1000: '$18.000.000', anio: '2026' },
    });
    expect(conValores).toContain('Hasta $18.000.000 al mes');
    expect(conValores).toContain('UVT de 2026');
  });

  /** Cierre de una lección con su modelo del Aplícalo. */
  function cierre(calculo, d, extra = {}) {
    const leccion = u3['u3-l2'];
    return htmlLeccion(crearSesion(leccion), leccion, {
      eyebrow: 'Unidad 3', tope: 20_000, terminada: true, entrada: true,
      unidad: unidadDeLeccion('u3-l2'), avance: { hechas: 1, total: 4 },
      aplica: modeloAplica(calculo, d), ...extra,
    });
  }
  const conGasto = (extra = {}) => datos({ gastos: [{ fecha: '2026-10-02', monto: 15_000, categoria: 'Café' }], ...extra });

  it('el cierre sin datos pide registrar un gasto con la acción global (R57)', () => {
    const html = cierre('hormiga-mes', datos());
    expect(html).toContain('Lección lista');
    expect(html).toContain('Llevas 1 de 4 en Gastos hormiga y límites.');
    expect(html).toContain('data-action="registrar-abrir" data-target-action="nuevo-gasto"');
  });

  it('el cierre con datos propone el límite con su monto en el botón (R50)', () => {
    const html = cierre('hormiga-mes', conGasto());
    expect(html).toContain('Tus gastos pequeños de octubre suman');
    expect(html).toContain('data-action="leccion-limite-hormiga" data-monto="10000"');
    expect(html).toContain('Poner un límite de $10.000');
    expect(html).toContain('Lo ajustas en Límites');
    expect(html).toContain('<strong>Hormiga a raya</strong>');
  });

  it('con un límite ya puesto, el cierre lleva a verlo en vez de proponer otro', () => {
    const html = cierre('hormiga-mes', conGasto({ limite: 150_000 }));
    expect(html).not.toContain('leccion-limite-hormiga');
    expect(html).toContain('data-action="ir-a-seccion" data-target="presupuesto"');
    expect(html).toContain('Tu límite para lo pequeño es $150.000');
  });

  it('el cierre de la lección 1 lleva a Gastos', () => {
    const html = cierre('hormiga-mes', conGasto({ paso: u3['u3-l1'].pasos.at(-1) }));
    expect(html).toContain('data-action="ir-a-seccion" data-target="gast"');
  });

  it('la lección que completa la unidad celebra con la insignia, no con el chulo', () => {
    const html = cierre('hormiga-mes', conGasto(), { celebrarUnidad: true });
    expect(html).toContain('href="#il-insignia"');
    expect(html).toContain('Terminaste la unidad 3');
    expect(html).not.toContain('leccion-lista__check');
  });
});
