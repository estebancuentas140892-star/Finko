/**
 * hoja-perfil.test.js - la hoja "Tu perfil" que abre el avatar de Inicio en
 * móvil (MV2.15c, ADR 099 D6 y D7).
 *
 * Cubre:
 * - textoFamilia(): quién está en Familia, o la invitación a agregar.
 * - datosHojaPerfil(): nombre, niños y el correo de la nube si hay sesión.
 * - htmlHojaPerfil(): "Pasarle el teléfono" va primero, uno por niño, con
 *   el cambio de perfil de siempre; cada fila lleva a su bloque de Ajustes;
 *   los nombres se escapan.
 */

import { describe, it, expect } from 'vitest';
import { textoFamilia, datosHojaPerfil, htmlHojaPerfil } from '../../modules/ui/hoja-perfil.js';

const SOFIA = { id: 'n-sofi', nombre: 'Sofía', edad: 8, dibujo: 'cometa', teNombra: 'Mamá', creado: '2026-10-25' };
const TOMAS = { id: 'n-tomi', nombre: 'Tomás', edad: 6, dibujo: 'balon', teNombra: 'Mamá', creado: '2026-10-25' };

/** Un token con la forma de Supabase: solo importa la carga útil. */
const token = (carga) => `x.${btoa(JSON.stringify(carga)).replace(/=+$/, '')}.y`;

const div = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };

describe('textoFamilia()', () => {
  it('sin niños invita a agregarlos', () => {
    expect(textoFamilia([])).toBe('Agrega a tus hijos');
  });

  it('con uno dice su nombre y su edad; con dos, los dos nombres', () => {
    expect(textoFamilia([SOFIA])).toBe('Sofía, 8 años');
    expect(textoFamilia([SOFIA, TOMAS])).toBe('Sofía y Tomás');
  });

  it('con tres o más, cuántos', () => {
    expect(textoFamilia([SOFIA, TOMAS, { ...TOMAS, id: 'n-3', nombre: 'Ana' }])).toBe('3 niños');
  });
});

describe('datosHojaPerfil()', () => {
  it('lee el nombre, los niños y el correo de la sesión de la nube', () => {
    const d = datosHojaPerfil(
      { perfil: { nombre: '  Laura Gómez ' }, perfiles: [SOFIA] },
      { access_token: token({ email: 'laura@correo.co' }) },
    );
    expect(d.nombre).toBe('Laura Gómez');
    expect(d.hijos).toEqual([{ id: 'n-sofi', nombre: 'Sofía', edad: 8 }]);
    expect(d.correo).toBe('laura@correo.co');
  });

  it('sin sesión no hay correo', () => {
    expect(datosHojaPerfil({ perfil: { nombre: 'Laura' }, perfiles: [] }, null).correo).toBe('');
  });
});

describe('htmlHojaPerfil()', () => {
  const base = { nombre: 'Laura Gómez', hijos: [], correo: '' };

  it('la cabeza dice tu nombre con tus iniciales', () => {
    const d = div(htmlHojaPerfil(base));
    expect(d.querySelector('#perfil-hoja-titulo').textContent).toBe('Laura Gómez');
    expect(d.querySelector('.hoja-perfil__avatar').textContent).toBe('LG');
  });

  it('pasarle el teléfono a un niño va primero, uno por niño, con el cambio de perfil de siempre', () => {
    const d = div(htmlHojaPerfil({ ...base, hijos: [SOFIA, TOMAS] }));
    const pasar = [...d.querySelectorAll('[data-action="perfil-pasar"]')];
    expect(pasar.map(b => b.dataset.id)).toEqual(['n-sofi', 'n-tomi']);
    expect(pasar[0].textContent).toContain('Pasarle el teléfono a Sofía');
    expect(pasar[0].textContent).toContain('se pide tu PIN');
    // Antes que la lista del adulto.
    const orden = [...d.querySelectorAll('button')].map(b => b.dataset.action);
    expect(orden.indexOf('perfil-pasar')).toBeLessThan(orden.indexOf('perfil-ir'));
  });

  it('sin niños no hay fila para pasar el teléfono', () => {
    expect(div(htmlHojaPerfil(base)).querySelector('[data-action="perfil-pasar"]')).toBeNull();
  });

  it('cada fila lleva a su bloque de Ajustes; "Ajustes" va a la sección sin bloque', () => {
    const d = div(htmlHojaPerfil(base));
    const bloques = [...d.querySelectorAll('[data-action="perfil-ir"]')].map(b => b.dataset.bloque);
    expect(bloques).toEqual(['perfil', 'familia', 'nube', '']);
  });

  it('la copia en la nube dice el correo si hay sesión', () => {
    const conSesion = div(htmlHojaPerfil({ ...base, correo: 'laura@correo.co' }));
    expect(conSesion.querySelector('[data-bloque="nube"]').textContent).toContain('laura@correo.co');
    const sin = div(htmlHojaPerfil(base));
    expect(sin.querySelector('[data-bloque="nube"]').textContent).toContain('Úsala también en otro teléfono');
  });

  it('los nombres se escapan', () => {
    const d = div(htmlHojaPerfil({ ...base, nombre: '<b>x</b>', hijos: [{ id: 'n"1', nombre: '<i>y</i>', edad: 7 }] }));
    expect(d.querySelector('#perfil-hoja-titulo').textContent).toBe('<b>x</b>');
    expect(d.querySelector('[data-action="perfil-pasar"]').dataset.id).toBe('n"1');
    expect(d.querySelector('[data-action="perfil-pasar"]').textContent).toContain('<i>y</i>');
  });
});
