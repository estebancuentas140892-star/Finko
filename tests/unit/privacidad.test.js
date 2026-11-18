/**
 * privacidad.test.js - OJO.1 (ADR 166): el ojo de ocultar montos es uno por
 * sección. Una sección sin el suyo sigue el flag de antes (`ocultarSaldo`).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import { montosOcultos, alternarMontosOcultos, seccionVisible } from '../../modules/infra/privacidad.js';
import { estadosMas } from '../../modules/ui/menu-mas.js';

describe('montosOcultos() y alternarMontosOcultos()', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    location.hash = '#gast';
  });

  it('ocultar en Gastos no tapa Mis cuentas ni Inicio', () => {
    expect(alternarMontosOcultos('gast')).toBe(true);
    expect(montosOcultos('gast')).toBe(true);
    expect(montosOcultos('tesoreria')).toBe(false);
    expect(montosOcultos('dash')).toBe(false);
    expect(alternarMontosOcultos('gast')).toBe(false);
    expect(montosOcultos('gast')).toBe(false);
  });

  it('quien tenía todo oculto lo sigue teniendo, hasta tocar el ojo de cada sección', () => {
    S.config.ocultarSaldo = true;
    expect(montosOcultos('gast')).toBe(true);
    expect(montosOcultos('tesoreria')).toBe(true);
    alternarMontosOcultos('tesoreria');
    expect(montosOcultos('tesoreria')).toBe(false);
    expect(montosOcultos('gast')).toBe(true);
  });

  it('sin sección, la que está a la vista; Inicio es #dash o la URL vacía', () => {
    expect(seccionVisible()).toBe('gast');
    alternarMontosOcultos();
    expect(montosOcultos('gast')).toBe(true);
    location.hash = '';
    expect(seccionVisible()).toBe('dash');
  });

  it('el menú Más tapa cada resumen con el ojo de su sección', () => {
    S.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', saldo: 300_000, activa: true }];
    S.config.ocultarPorSeccion = { tesoreria: true };
    expect(estadosMas(S, '2026-11-17').tesoreria.texto).not.toContain('300.000');
    S.config.ocultarPorSeccion = { tesoreria: false, gast: true };
    expect(estadosMas(S, '2026-11-17').tesoreria.texto).toContain('$300.000');
  });
});

describe('claveDelOjo() (OJO.1): cada ojo es de su lente o de su sección', () => {
  it('lente del bloque Gastos, encabezado de otra sección o la que está a la vista', async () => {
    const { claveDelOjo } = await import('../../modules/ui/bloque-gastos.js');
    document.body.innerHTML = `
      <section id="sec-gast"><div id="tabs-compromisos"><button id="a"></button></div></section>
      <section id="sec-movimientos"><header><button id="b"></button></header></section>
      <button id="c"></button>`;
    expect(claveDelOjo(document.getElementById('a'))).toBe('compromisos');
    expect(claveDelOjo(document.getElementById('b'))).toBe('movimientos');
    expect(claveDelOjo(document.getElementById('c'))).toBeUndefined();
  });
});
