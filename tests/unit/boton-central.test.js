/**
 * boton-central.test.js - el botón central registra según la sección (ADR 148).
 *
 * Cubre:
 * - altaDeSeccion(): qué botón de alta declara la sección activa (el primario
 *   del encabezado; en el Fondo, aportar o empezar) y cuándo no hay ninguno.
 * - La acción `registrar-segun-seccion`: dispara el alta con ese botón como
 *   origen y, sin alta, abre la hoja "Registrar" de siempre.
 * - El aria-label del botón central sigue a la sección (D4).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { altaDeSeccion, markActiveNav } from '../../modules/ui/shell.js';
import { initAcciones, registrarAccion, dispatch } from '../../modules/ui/actions.js';

const ARIA_BASE = 'Registrar: gasto, ingreso, pago o ahorro';

/** Encabezado con su primario; `extra` son atributos crudos del botón. */
const conPrimario = (id, accion, extra = '', texto = 'Nuevo') => `
  <section class="section" id="sec-${id}">
    <header class="section__header">
      <button class="btn btn-primary" data-action="${accion}" ${extra}>${texto}</button>
    </header>
  </section>`;

const sinPrimario = (id, cuerpo = '') => `
  <section class="section" id="sec-${id}">
    <header class="section__header"></header>
    ${cuerpo}
  </section>`;

function montar(seccionesHtml) {
  document.body.innerHTML = `
    <button class="nav-item nav-item--registrar" data-action="registrar-segun-seccion"
            aria-label="${ARIA_BASE}"></button>
    ${seccionesHtml}`;
}

const activar = (hash) => {
  document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === `sec-${hash}`));
  markActiveNav(hash);
};
const seccion = (hash) => document.getElementById(`sec-${hash}`);
const central = () => document.querySelector('.nav-item--registrar');

/** Sección y acción de alta esperada: el mapa del ADR 148 D1. */
const MAPA = [
  ['gast',        'nuevo-gasto'],
  ['compromisos', 'comp-elegir-tipo-nuevo'],
  ['presupuesto', 'nuevo-presupuesto'],
  ['tesoreria',   'nueva-cuenta'],
  ['personales',  'nuevo-personal'],
  ['metas',       'nueva-meta'],
  ['apartados',   'nuevo-apartado'],
];

describe('altaDeSeccion() (ADR 148)', () => {
  it.each(MAPA)('en %s devuelve el primario del encabezado (%s)', (hash, accion) => {
    montar(conPrimario(hash, accion));
    expect(altaDeSeccion(seccion(hash))?.dataset.action).toBe(accion);
  });

  it('cuenta el primario que solo existe en el teléfono (Inversión, ADR 133 D6)', () => {
    montar(conPrimario('inversion', 'inversion-nueva', 'data-solo-movil'));
    expect(altaDeSeccion(seccion('inversion'))?.dataset.action).toBe('inversion-nueva');
  });

  it('con el primario oculto por su dominio no hay alta', () => {
    montar(conPrimario('presupuesto', 'nuevo-presupuesto', 'hidden'));
    expect(altaDeSeccion(seccion('presupuesto'))).toBeNull();
  });

  it.each(['dash', 'movimientos', 'agenda', 'analisis', 'config'])(
    'en %s, sin primario en el encabezado, no hay alta', (hash) => {
      montar(sinPrimario(hash, '<button class="btn btn-primary" data-action="otra-cosa">Otra</button>'));
      expect(altaDeSeccion(seccion(hash))).toBeNull();
    });

  it('en el Fondo activo el alta es aportar', () => {
    montar(sinPrimario('fondo', `
      <button data-action="ahorro-editar">Editar</button>
      <button data-action="ahorro-nuevo-aporte">Aportar al fondo</button>`));
    expect(altaDeSeccion(seccion('fondo'))?.dataset.action).toBe('ahorro-nuevo-aporte');
  });

  it('en el Fondo sin empezar el alta es empezarlo', () => {
    montar(sinPrimario('fondo', '<button data-action="ahorro-activar-fondo">Empezar mi fondo</button>'));
    expect(altaDeSeccion(seccion('fondo'))?.dataset.action).toBe('ahorro-activar-fondo');
  });

  it('la excepción del Fondo no se contagia a otra sección', () => {
    montar(sinPrimario('analisis', '<button data-action="ahorro-nuevo-aporte">Aportar</button>'));
    expect(altaDeSeccion(seccion('analisis'))).toBeNull();
  });

  it('sin sección activa devuelve null', () => {
    expect(altaDeSeccion(null)).toBeNull();
  });
});

describe('acción registrar-segun-seccion (ADR 148)', () => {
  let hoja;

  beforeEach(() => {
    initAcciones();
    hoja = vi.fn();
    registrarAccion('registrar-abrir-hoja', hoja);
  });

  const tocarCentral = () => dispatch(central(), new Event('click', { cancelable: true }));

  it.each(MAPA)('en %s dispara %s con el primario como origen', (hash, accion) => {
    montar(conPrimario(hash, accion));
    activar(hash);
    const alta = vi.fn();
    registrarAccion(accion, alta);

    tocarCentral();

    expect(alta).toHaveBeenCalledOnce();
    expect(alta.mock.calls[0][0]).toBe(seccion(hash).querySelector('.btn-primary'));
    expect(hoja).not.toHaveBeenCalled();
  });

  it('en una sección sin alta abre la hoja de siempre', () => {
    montar(sinPrimario('analisis'));
    activar('analisis');
    tocarCentral();
    expect(hoja).toHaveBeenCalledOnce();
  });

  it('con el primario oculto abre la hoja', () => {
    montar(conPrimario('presupuesto', 'nuevo-presupuesto', 'hidden'));
    activar('presupuesto');
    const alta = vi.fn();
    registrarAccion('nuevo-presupuesto', alta);
    tocarCentral();
    expect(alta).not.toHaveBeenCalled();
    expect(hoja).toHaveBeenCalledOnce();
  });

  it('si la acción del alta no está registrada, abre la hoja en vez de no hacer nada', () => {
    montar(conPrimario('metas', 'accion-que-nadie-registro'));
    activar('metas');
    tocarCentral();
    expect(hoja).toHaveBeenCalledOnce();
  });

  it('solo mira la sección activa', () => {
    montar(conPrimario('metas', 'nueva-meta') + sinPrimario('dash'));
    activar('dash');
    const alta = vi.fn();
    registrarAccion('nueva-meta', alta);
    tocarCentral();
    expect(alta).not.toHaveBeenCalled();
    expect(hoja).toHaveBeenCalledOnce();
  });
});

describe('aria-label del botón central (ADR 148 D4)', () => {
  it('toma el nombre del alta de la sección y vuelve al de base', () => {
    montar(
      conPrimario('metas', 'nueva-meta', 'aria-label="Nueva meta de ahorro"', 'Meta')
      + sinPrimario('dash'));

    activar('metas');
    expect(central().getAttribute('aria-label')).toBe('Nueva meta de ahorro');

    activar('dash');
    expect(central().getAttribute('aria-label')).toBe(ARIA_BASE);
  });

  it('sin aria-label propio usa el texto del alta', () => {
    montar(conPrimario('gast', 'nuevo-gasto', '', 'Registrar gasto'));
    activar('gast');
    expect(central().getAttribute('aria-label')).toBe('Registrar gasto');
  });
});
