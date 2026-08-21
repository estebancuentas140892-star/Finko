/**
 * bolsas.test.js - las dos piezas que DIS.19 movió a infra.
 *
 * Lo que prueba este archivo no es el cálculo (eso ya lo cubren
 * apartados.test.js sobre `planDeReferencia` e inversiones.test.js sobre la
 * proyección y las columnas, las dos suites intactas tras el movimiento): es la
 * **frontera**. Cada test importa dos veces la misma función, una desde infra y
 * otra desde el dominio, y exige que sean el mismo objeto. Si alguien vuelve a
 * escribir una copia local para no importar de infra, estos tests fallan: es la
 * única red que impide que la duplicación regrese sin que nadie la note.
 *
 * Motivo del movimiento: la casa de Ahorro dibuja la línea del plan de
 * Apartados y las dos columnas de Inversión en sus carriles, y ADN #10 le
 * prohíbe importar esos dominios.
 *
 * ARQ.1c suma la tercera pieza, `etapaDePortafolio()`: el mismo motivo, con un
 * matiz que las dos anteriores no tenían. Acá no se movió una función entera
 * sino el **corte** que decide la etapa; las frases del momento se quedaron en
 * `inversiones/logic.js`, así que la frontera se prueba por comportamiento
 * (mismo número por las dos puertas) y no por identidad.
 */

import { describe, it, expect } from 'vitest';

import * as bolsas     from '../../modules/infra/bolsas.js';
import * as portafolio from '../../modules/infra/portafolio.js';
import * as apartados  from '../../modules/dominio/apartados/logic.js';
import * as inversiones from '../../modules/dominio/inversiones/logic.js';
import * as metas      from '../../modules/dominio/metas/logic.js';
import * as ahorro     from '../../modules/dominio/ahorro/logic.js';

describe('infra/bolsas.js - frontera con el dominio Apartados', () => {
  it('el dominio re-exporta la misma función, no una copia', () => {
    expect(apartados.planDeReferencia).toBe(bolsas.planDeReferencia);
    expect(apartados.diasHastaFecha).toBe(bolsas.diasHastaFecha);
  });

  it('planDeReferencia se puede llamar desde infra sin pasar por el dominio', () => {
    const plan = bolsas.planDeReferencia({
      montoObjetivo: 1200000,
      montoActual:   600000,
      fechaObjetivo: '2026-12-31',
      fechaCreacion: '2026-01-01',
      frecuenciaAporte: 'Mensual',
    }, '2026-07-01');

    expect(plan).not.toBeNull();
    expect(plan.totalAportes).toBeGreaterThan(0);
    expect(plan.aportesEsperados).toBeLessThanOrEqual(plan.totalAportes);
    expect(plan.delta).toBe(plan.aportesEquivalentes - plan.aportesEsperados);
  });

  it('diasHastaFecha cuenta calendario y acepta fechas pasadas como negativas', () => {
    expect(bolsas.diasHastaFecha('2026-07-31', '2026-07-01')).toBe(30);
    expect(bolsas.diasHastaFecha('2026-06-30', '2026-07-01')).toBe(-1);
    expect(bolsas.diasHastaFecha('', '2026-07-01')).toBeNull();
  });
});

describe('progresoDeBolsa - la única cuenta de progreso de las cuatro bolsas', () => {
  it('reparte porcentaje, faltante y completado', () => {
    expect(bolsas.progresoDeBolsa(360_000, 90_000))
      .toEqual({ porcentaje: 25, faltante: 270_000, completado: false });
  });

  it('topa el porcentaje en 100 y el faltante en 0 cuando sobra dinero', () => {
    expect(bolsas.progresoDeBolsa(360_000, 500_000))
      .toEqual({ porcentaje: 100, faltante: 0, completado: true });
  });

  it('sin objetivo positivo devuelve progreso neutro', () => {
    for (const objetivo of [0, -100, NaN, null, undefined, 'no-es-monto']) {
      expect(bolsas.progresoDeBolsa(objetivo, 500_000))
        .toEqual({ porcentaje: 0, faltante: 0, completado: false });
    }
  });

  it('trata un acumulado negativo o no numérico como 0', () => {
    expect(bolsas.progresoDeBolsa(1_000_000, -500_000).porcentaje).toBe(0);
    expect(bolsas.progresoDeBolsa(1_000_000, NaN).porcentaje).toBe(0);
    expect(bolsas.progresoDeBolsa(1_000_000, undefined).faltante).toBe(1_000_000);
  });
});

// Los tres dominios envuelven la función de infra en vez de re-exportarla (cada
// uno recibe su propio registro y Metas además renombra el campo a femenino),
// así que la frontera no se puede probar por identidad como las de abajo. Se
// prueba por comportamiento, y con los dos bordes estrictos justamente: eran los
// que cada copia local resolvía distinto, así que una copia nueva los falla.
describe('las cuatro bolsas comparten los bordes del cálculo (ARQ.1a)', () => {
  it('un objetivo NaN no se cuela como porcentaje NaN en ninguna', () => {
    expect(apartados.calcularProgreso({ montoObjetivo: NaN, montoActual: 100 }))
      .toEqual({ porcentaje: 0, faltante: 0, completado: false });
    expect(metas.calcularProgreso({ montoObjetivo: NaN, montoActual: 100 }))
      .toEqual({ porcentaje: 0, faltante: 0, completada: false });
    expect(ahorro.calcularProgresoFondo(100, NaN))
      .toEqual({ porcentaje: 0, faltante: 0, completado: false });
  });

  it('un acumulado negativo se recorta a 0 en las tres', () => {
    expect(apartados.calcularProgreso({ montoObjetivo: 1_000, montoActual: -500 }).porcentaje).toBe(0);
    expect(metas.calcularProgreso({ montoObjetivo: 1_000, montoActual: -500 }).porcentaje).toBe(0);
    expect(ahorro.calcularProgresoFondo(-500, 1_000).porcentaje).toBe(0);
  });

  it('el mismo par de montos da el mismo porcentaje por las tres puertas', () => {
    const objetivo = 3_000_000;
    const actual   = 1_000_000;
    const esperado = bolsas.progresoDeBolsa(objetivo, actual).porcentaje;

    expect(apartados.calcularProgreso({ montoObjetivo: objetivo, montoActual: actual }).porcentaje).toBe(esperado);
    expect(metas.calcularProgreso({ montoObjetivo: objetivo, montoActual: actual }).porcentaje).toBe(esperado);
    expect(ahorro.calcularProgresoFondo(actual, objetivo).porcentaje).toBe(esperado);
  });

  it('estadoDeBolsa lee el mismo porcentaje que la bolsa que lo alimenta', () => {
    const bolsa = { montoObjetivo: 1_200_000, montoActual: 400_000 };
    expect(bolsas.estadoDeBolsa(bolsa, '2026-07-01').pct)
      .toBe(bolsas.progresoDeBolsa(bolsa.montoObjetivo, bolsa.montoActual).porcentaje);
  });
});

// ── ordenarBolsasPorFecha (ficha 09) ─────────────────────────────
//
// Cuarta pieza con más de un lector: la lista de Metas la consume envuelta en
// `ordenarMetasPorPlazo()` y la hoja Registrar la importa directo, porque su
// cabecera le prohíbe importar el dominio. El orden del picker y el de la
// sección tienen que ser el mismo (eso se prueba en registrar.test.js); acá se
// prueba la pieza.

describe('ordenarBolsasPorFecha - el orden que Metas y Registrar comparten', () => {
  it('ordena por la fecha que llega primero', () => {
    const lista   = [{ id: 'c', fechaLimite: '2026-12-15' }, { id: 'a', fechaLimite: '2026-09-30' }, { id: 'b', fechaLimite: '2026-10-05' }];
    expect(bolsas.ordenarBolsasPorFecha(lista, 'fechaLimite').conFecha.map(b => b.id))
      .toEqual(['a', 'b', 'c']);
  });

  it('lee el campo que se le pide, no uno fijo', () => {
    const lista   = [{ id: 'b', fechaObjetivo: '2026-11-01' }, { id: 'a', fechaObjetivo: '2026-03-01' }];
    expect(bolsas.ordenarBolsasPorFecha(lista, 'fechaObjetivo').conFecha.map(b => b.id))
      .toEqual(['a', 'b']);
    // Con el campo equivocado nada tiene fecha: no adivina.
    expect(bolsas.ordenarBolsasPorFecha(lista, 'fechaLimite').conFecha).toEqual([]);
  });

  it('una fecha ilegible cuenta como ausente', () => {
    const lista   = [
      { id: 'buena',  fechaLimite: '2026-09-30' },
      { id: 'vacia',  fechaLimite: '' },
      { id: 'basura', fechaLimite: '30/09/2026' },
      { id: 'nula',   fechaLimite: null },
    ];
    const { conFecha, sinFecha } = bolsas.ordenarBolsasPorFecha(lista, 'fechaLimite');
    expect(conFecha.map(b => b.id)).toEqual(['buena']);
    expect(sinFecha.map(b => b.id)).toEqual(['vacia', 'basura', 'nula']);
  });

  it('el empate conserva el orden de llegada y no muta la lista', () => {
    const lista   = [{ id: 'primera', fechaLimite: '2026-09-30' }, { id: 'segunda', fechaLimite: '2026-09-30' }];
    expect(bolsas.ordenarBolsasPorFecha(lista, 'fechaLimite').conFecha.map(b => b.id))
      .toEqual(['primera', 'segunda']);
    expect(lista.map(b => b.id)).toEqual(['primera', 'segunda']);
  });

  it('sin lista devuelve los dos grupos vacíos', () => {
    expect(bolsas.ordenarBolsasPorFecha(undefined, 'fechaLimite')).toEqual({ conFecha: [], sinFecha: [] });
    expect(bolsas.ordenarBolsasPorFecha([], 'fechaLimite')).toEqual({ conFecha: [], sinFecha: [] });
  });
});

describe('infra/portafolio.js - frontera con el dominio Inversión', () => {
  it('el dominio re-exporta las mismas funciones, no copias', () => {
    expect(inversiones.calcularTotalInvertido).toBe(portafolio.calcularTotalInvertido);
    expect(inversiones.calcularPorTipo).toBe(portafolio.calcularPorTipo);
    expect(inversiones.esProyectable).toBe(portafolio.esProyectable);
    expect(inversiones.proyectarInversion).toBe(portafolio.proyectarInversion);
    expect(inversiones.proyectarPortafolio).toBe(portafolio.proyectarPortafolio);
    expect(inversiones.columnasPortafolio).toBe(portafolio.columnasPortafolio);
  });

  it('columnasPortafolio se puede llamar desde infra sin pasar por el dominio', () => {
    const cols = portafolio.columnasPortafolio([
      { tipo: 'CDT',   monto: 5000000, tasaEA: 10, plazoMeses: 12 },
      { tipo: 'Fondo', monto: 2550000, tasaEA: 8,  plazoMeses: 24 },
    ]);

    expect(cols).not.toBeNull();
    expect(cols.totalInvertido).toBe(7550000);
    expect(cols.segmentos).toHaveLength(2);
    // Las dos columnas comparten escala: el cuerpo más el tiempo valen 100.
    expect(cols.altoCuerpo + cols.altoTiempo).toBeCloseTo(100, 2);
  });

  it('columnasPortafolio devuelve null sin capital registrado', () => {
    expect(portafolio.columnasPortafolio([])).toBeNull();
    expect(portafolio.columnasPortafolio(null)).toBeNull();
  });
});

// ARQ.1c: la casa de Ahorro necesita decir la etapa de su carril de Inversión y
// no puede importar `momentoInversion()` (ADN #10). El corte que decide la
// etapa baja a infra; las frases se quedan en la sección. Estos tests son la
// red que impide que el carril vuelva a calcularlo por su cuenta.
describe('etapaDePortafolio - el corte que Ahorro e Inversión comparten (ARQ.1c)', () => {
  const cdt = { tipo: 'CDT',   monto: 5_000_000, tasaEA: 11.5, plazoMeses: 12 };
  const fic = { tipo: 'Fondo', monto: 3_000_000, tasaEA: 8,    plazoMeses: 24 };

  it('sin inversiones con monto no hay etapa', () => {
    expect(portafolio.etapaDePortafolio([])).toBeNull();
    expect(portafolio.etapaDePortafolio(null)).toBeNull();
    expect(portafolio.etapaDePortafolio([{ tipo: 'CDT', monto: 0 }])).toBeNull();
  });

  it('una sola inversión es la etapa 1; dos o más, la 2', () => {
    expect(portafolio.etapaDePortafolio([cdt]).numero).toBe(1);
    expect(portafolio.etapaDePortafolio([cdt, fic]).numero).toBe(2);
  });

  it('abiertas cuenta solo las que tienen monto, y activas es esa misma lista', () => {
    const etapa = portafolio.etapaDePortafolio([cdt, { tipo: 'Cripto', monto: 0 }, fic]);
    expect(etapa.abiertas).toBe(2);
    expect(etapa.activas).toEqual([cdt, fic]);
  });

  it('la sección Inversión lee la etapa de infra, no una copia propia', () => {
    const listo = { fondoActivo: true, fondoCompletado: true };
    for (const lista of [[cdt], [cdt, fic]]) {
      expect(inversiones.momentoInversion(lista, listo).numero)
        .toBe(portafolio.etapaDePortafolio(lista).numero);
    }
  });

  it('el carril de Ahorro y la seccion nombran igual la misma etapa', () => {
    // Las dos pantallas escriben la palabra por su cuenta (infra no guarda copy),
    // pero tienen que coincidir: el carril lleva a esa sección y el usuario debe
    // reconocer ahí lo que leyó en el hub. Si una de las dos se renombra sola,
    // este test falla.
    //
    // Ficha 13 (ADR 086 D1): la palabra de la etapa se mudó de sitio dentro de
    // la sección. Era el `chip` y ahora es el kicker (`etapa`), porque el chip
    // pasó a decir de qué está hecha la etapa ("2 inversiones · 2 tipos"). Lo
    // que se compara sigue siendo la palabra, no el slot que la lleva.
    for (const lista of [[cdt], [cdt, fic]]) {
      const etapa = portafolio.etapaDePortafolio(lista);
      const momento = inversiones.momentoInversion(lista, { fondoActivo: true, fondoCompletado: true });
      const carril = ahorro.casaAhorro({
        inversionesAbiertas: etapa.abiertas,
        etapaInversion:      etapa.numero,
      }).filas[3].estado;

      expect(carril.toLowerCase()).toContain(momento.etapa.toLowerCase());
    }
  });

  it('el conteo del carril y la etapa salen del mismo filtro', () => {
    const lista = [cdt, { tipo: 'Cripto', monto: 0 }, fic];
    const etapa = portafolio.etapaDePortafolio(lista);
    // El carril de Ahorro puede contar inversiones abiertas y nombrar su etapa
    // con una sola llamada, sin importar el dominio Inversión.
    expect(etapa.abiertas).toBe(etapa.activas.length);
    expect(inversiones.momentoInversion(lista).numero).toBe(etapa.numero);
  });
});
