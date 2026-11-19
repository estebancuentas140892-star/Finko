/**
 * hamaca.test.js - la hamaca de "Todo al día" cabe con su mensaje (INI.6b,
 * ADR 181 D2). La medición en el navegador la cubre `inicio-rediseno.test.js`;
 * acá, la cuenta.
 */

import { describe, it, expect } from 'vitest';
import { anchoLibreHamaca, AIRE_HAMACA } from '../../modules/ui/hamaca.js';

// El dibujo mide 1,0989 veces su ancho de alto y sube 0,0347 de su ancho sobre
// el saldo: lo que ocupa bajo el borde del saldo es 1,0642 veces su ancho.
const OCUPA = 1009.14 / 918.31 - 0.0347;

describe('anchoLibreHamaca()', () => {
  it('a 360 x 640, con el mensaje en dos líneas, el ancho que deja todo sobre "Registrar"', () => {
    const ancho = anchoLibreHamaca({ bordeSaldo: 264, mensaje: 84, topeRegistrar: 558 });
    expect(ancho).toBe(186);
    // Lo que ocupa termina a 12 o más del círculo.
    expect(264 + ancho * OCUPA + 84).toBeLessThanOrEqual(558 - AIRE_HAMACA);
    expect(264 + (ancho + 1) * OCUPA + 84).toBeGreaterThan(558 - AIRE_HAMACA);
  });

  it('un mensaje más alto (letra del sistema más grande) deja menos ancho', () => {
    const normal = anchoLibreHamaca({ bordeSaldo: 268, mensaje: 64, topeRegistrar: 762 });
    const grande = anchoLibreHamaca({ bordeSaldo: 268, mensaje: 104, topeRegistrar: 762 });
    expect(grande).toBeLessThan(normal);
  });

  it('nunca negativo, aunque no quepa nada', () => {
    expect(anchoLibreHamaca({ bordeSaldo: 500, mensaje: 120, topeRegistrar: 486 })).toBe(0);
  });

  it('entero: el CSS lo recibe en px', () => {
    expect(Number.isInteger(anchoLibreHamaca({ bordeSaldo: 263.84, mensaje: 83.7, topeRegistrar: 558 }))).toBe(true);
  });
});
