/**
 * perfiles.test.js - APR.3a: perfiles de niño en el dispositivo (ADR 093 D1,
 * D2 y P1). El modelo del niño, quién usa Finko ahora, "¿Quién usa Finko?",
 * el alta en Ajustes y "Olvidé mi PIN" con y sin niños.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S, EventBus, createInitialState } from '../../modules/core/state.js';
import {
  normalizarPerfil, validarNino, crearNino, ninos, hayNinos, perfilActivo, esPerfilNino, entrarComo,
  EDAD_MIN, EDAD_MAX,
} from '../../modules/infra/perfiles.js';
import { htmlQuienUsa, htmlPinAdulto } from '../../modules/ui/quien-usa.js';
import { olvideMiPin, PALABRA_BORRAR } from '../../modules/ui/bloqueo-acceso.js';
import { confirmar } from '../../modules/ui/confirm.js';
import { htmlFamilia, htmlAltaNino, htmlAltaPin } from '../../modules/dominio/config/familia-view.js';

const SOFIA = { id: 'n-sofi', nombre: 'Sofía', edad: 8, dibujo: 'cometa', teNombra: 'Papá', creado: '2026-10-25' };

beforeEach(() => {
  Object.assign(S, createInitialState());
  entrarComo(null);
  document.body.innerHTML = '';
});

describe('el modelo del niño (D1)', () => {
  it('normaliza un perfil a su forma completa, con su propio Aprende y su alcancía vacía', () => {
    const p = normalizarPerfil(SOFIA);
    expect(p).toMatchObject({ id: 'n-sofi', nombre: 'Sofía', edad: 8, dibujo: 'cometa', teNombra: 'Papá' });
    expect(p.aprende).toEqual({ hechas: {}, sabidas: [], semanas: [], enCurso: null, ubicacion: null });
    expect(p).toMatchObject({ movimientos: [], metas: [], mesada: null, premio: null });
  });

  it('descarta lo que no se puede rescatar y corrige lo que sí', () => {
    expect(normalizarPerfil(null)).toBeNull();
    expect(normalizarPerfil({ id: 'x' })).toBeNull();
    expect(normalizarPerfil({ nombre: 'Sin id' })).toBeNull();
    const p = normalizarPerfil({ id: 'n1', nombre: ' Mateo ', edad: 40, dibujo: 'foto', teNombra: '' });
    expect(p).toMatchObject({ nombre: 'Mateo', edad: EDAD_MAX, dibujo: 'balon', teNombra: 'Papá' });
  });

  it('el alta pide nombre, edad de 7 a 12, dibujo del catálogo y cómo te nombra', () => {
    expect(validarNino({})).toHaveLength(4);
    expect(validarNino({ nombre: 'Sofía', edad: 6, dibujo: 'cometa', teNombra: 'Papá' }))
      .toEqual([`Elige una edad de ${EDAD_MIN} a ${EDAD_MAX} años.`]);
    expect(validarNino({ nombre: 'Sofía', edad: 8, dibujo: 'cometa', teNombra: 'Tío Juan' })).toEqual([]);
    expect(crearNino({ nombre: 'Sofía', edad: '8', dibujo: 'cometa', teNombra: 'Mamá' }, '2026-10-25', 'n-1'))
      .toMatchObject({ id: 'n-1', edad: 8, teNombra: 'Mamá', creado: '2026-10-25' });
  });

  it('sin niños, Finko es de una sola persona como siempre', () => {
    expect(hayNinos()).toBe(false);
    S.perfiles = [SOFIA, { basura: true }];
    expect(ninos().map(p => p.nombre)).toEqual(['Sofía']);
    expect(hayNinos()).toBe(true);
  });
});

describe('quién usa Finko ahora (D1)', () => {
  it('entrar como un niño avisa el cambio; un id que no existe vuelve al adulto', () => {
    S.perfiles = [SOFIA];
    const oyente = vi.fn();
    EventBus.on('perfil:cambio', oyente);
    entrarComo('n-sofi');
    expect(esPerfilNino()).toBe(true);
    expect(perfilActivo().nombre).toBe('Sofía');
    expect(oyente).toHaveBeenLastCalledWith({ id: 'n-sofi' });
    entrarComo('n-no-existe');
    expect(perfilActivo()).toBeNull();
    expect(oyente).toHaveBeenLastCalledWith({ id: null });
    EventBus.off('perfil:cambio', oyente);
  });

  it('si el perfil del niño activo desaparece, no queda un perfil fantasma', () => {
    S.perfiles = [SOFIA];
    entrarComo('n-sofi');
    S.perfiles = [];
    expect(perfilActivo()).toBeNull();
  });
});

describe('"¿Quién usa Finko?" (D1)', () => {
  it('muestra al adulto con PIN, cada niño con su dibujo y su edad, y agregar un niño', () => {
    S.perfil.nombre = 'Esteban Cardona';
    S.perfiles = [SOFIA];
    const html = htmlQuienUsa();
    expect(html).toContain('¿Quién usa Finko?');
    expect(html).toContain('>EC<');
    expect(html).toContain('Adulto · con PIN');
    expect(html).toContain('data-role="nino" data-id="n-sofi"');
    expect(html).toContain('href="#il-cometa"');
    expect(html).toContain('8 años');
    expect(html).toContain('Agregar un niño');
    expect(html).toContain('cada niño solo ve su alcancía y sus lecciones');
  });

  it('el PIN del adulto dice para qué es y recuerda que el candado no cifra', () => {
    expect(htmlPinAdulto('adulto')).toContain('Escribe tu PIN para entrar a tu perfil.');
    expect(htmlPinAdulto('agregar')).toContain('Escribe tu PIN para agregar un niño.');
    expect(htmlPinAdulto('adulto')).toContain('No cifra tus datos.');
    expect(htmlPinAdulto('adulto')).toContain('data-role="olvide-pin"');
  });
});

describe('"Olvidé mi PIN" con y sin niños (P1)', () => {
  it('sin perfiles de niño, la salida del 063 D7 queda igual: sin palabra que escribir', async () => {
    const promesa = olvideMiPin();
    expect(document.querySelector('.confirm__mensaje').textContent).toBe(
      'Tu PIN no se puede recuperar: Finko no lo guarda en ninguna parte. La única forma de volver a entrar es borrar todo lo que tienes en este dispositivo (gastos, cuentas, metas y compromisos) y empezar de cero. No se puede deshacer.');
    expect(document.getElementById('confirm-palabra')).toBeNull();
    expect(document.querySelector('[data-role="confirmar"]').disabled).toBe(false);
    document.querySelector('[data-role="cancelar"]').click();
    expect(await promesa).toBe(false);
  });

  it('con niños pide escribir la palabra y avisa que también borra sus perfiles', async () => {
    S.perfiles = [SOFIA];
    const promesa = olvideMiPin();
    expect(document.querySelector('.confirm__mensaje').textContent).toContain('también los perfiles de los niños');
    expect(document.querySelector('label[for="confirm-palabra"]').textContent).toBe(`Escribe ${PALABRA_BORRAR} para confirmar`);
    const boton = document.querySelector('[data-role="confirmar"]');
    expect(boton.disabled).toBe(true);
    // Tocar confirmar sin la palabra no hace nada.
    boton.click();
    expect(document.querySelector('.modal-overlay')).not.toBeNull();
    document.querySelector('[data-role="cancelar"]').click();
    expect(await promesa).toBe(false);
  });

  it('el botón se enciende solo con la palabra escrita, sin importar mayúsculas', async () => {
    const promesa = confirmar({ mensaje: 'Borrar todo', palabra: 'BORRAR' });
    const campo = document.getElementById('confirm-palabra');
    const boton = document.querySelector('[data-role="confirmar"]');
    campo.value = 'borra';
    campo.dispatchEvent(new Event('input'));
    expect(boton.disabled).toBe(true);
    campo.value = ' borrar ';
    campo.dispatchEvent(new Event('input'));
    expect(boton.disabled).toBe(false);
    boton.click();
    expect(await promesa).toBe(true);
  });
});

describe('Familia en Ajustes (D2)', () => {
  it('sin niños invita a agregar uno; con niños los lista con "Entrar como"', () => {
    expect(htmlFamilia([])).toContain('Agregar un niño');
    const html = htmlFamilia([normalizarPerfil(SOFIA)]);
    expect(html).toContain('Entrar como Sofía');
    expect(html).toContain('8 años · te dice Papá');
    expect(html).toContain('aria-label="Eliminar el perfil de Sofía"');
    expect(html).toContain('Agregar otro niño');
  });

  it('el alta ofrece edades de 7 a 12, los ocho dibujos y dice qué verá el niño', () => {
    const html = htmlAltaNino({ candado: true });
    expect(html.match(/name="edad"/g)).toHaveLength(6);
    expect(html.match(/name="dibujo"/g)).toHaveLength(8);
    expect(html).toContain('Nada tuyo: ni cuentas, ni deudas, ni tarjetas, ni impuestos.');
    expect(html).not.toContain('Aún no tienes candado');
  });

  it('sin candado, el alta avisa que antes creará el PIN y ese paso lo explica', () => {
    expect(htmlAltaNino({ candado: false })).toContain('Aún no tienes candado.');
    const pin = htmlAltaPin('Sofía');
    expect(pin).toContain('así Sofía no');
    expect(pin).toContain('Crear PIN y agregar a Sofía');
  });
});
