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
