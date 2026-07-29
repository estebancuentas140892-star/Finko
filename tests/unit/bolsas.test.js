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
