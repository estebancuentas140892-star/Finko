/**
 * volver.test.js - el volver de móvil (ADR 098 D1 y D2).
 *
 * Cubre:
 * - clasificarLlegada(): una entrada sellada es un regreso; una nueva toma el
 *   origen solo si el toque es reciente, de otra sección y con nombre.
 * - htmlVolverContexto(): el nombre de la sección de origen, como lo dice la
 *   barra o el menú Más.
 * - initVolver() en el DOM: un toque en el contenido deja "‹ {origen}" en la
 *   sección de llegada y aparta el volver fijo; un toque en la navegación
 *   principal no deja nada; un volver fijo al mismo origen se reusa.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import {
  NOMBRE_SECCION,
  RAIZ_NAVEGACION,
  clasificarLlegada,
  htmlVolverContexto,
  initVolver,
} from '../../modules/ui/volver.js';

describe('clasificarLlegada()', () => {
  it('una entrada ya sellada es un regreso, venga de donde venga', () => {
    expect(clasificarLlegada({ fkEntrada: 'e1' }, { desde: 'gast', t: 0 }, 'movimientos', 10))
      .toEqual({ tipo: 'regreso' });
  });

  it('una entrada nueva tras un toque reciente en otra sección guarda el origen', () => {
    expect(clasificarLlegada(null, { desde: 'gast', t: 1000 }, 'movimientos', 1400))
      .toEqual({ tipo: 'nueva', origen: 'gast' });
  });

  it('un toque viejo no es la causa de la navegación', () => {
    expect(clasificarLlegada(null, { desde: 'gast', t: 0 }, 'movimientos', 5000))
      .toEqual({ tipo: 'nueva', origen: null });
  });

  it('sin toque, o con un toque en la misma sección, no hay origen', () => {
    expect(clasificarLlegada(null, null, 'gast', 10)).toEqual({ tipo: 'nueva', origen: null });
    expect(clasificarLlegada(null, { desde: 'gast', t: 0 }, 'gast', 10))
      .toEqual({ tipo: 'nueva', origen: null });
  });

  it('un origen sin nombre conocido no se ofrece', () => {
    expect(clasificarLlegada(null, { desde: 'inventado', t: 0 }, 'gast', 10))
      .toEqual({ tipo: 'nueva', origen: null });
  });
});

describe('htmlVolverContexto()', () => {
  it('nombra el origen y vuelve por acción, no por hash', () => {
    document.body.innerHTML = htmlVolverContexto('tesoreria');
    const a = document.querySelector('.section__volver--contexto');
    expect(a.textContent.trim()).toBe('Mis cuentas');
    expect(a.getAttribute('aria-label')).toBe('Volver a Mis cuentas');
    expect(a.dataset.action).toBe('volver-contexto');
    expect(a.getAttribute('href')).toBe('#tesoreria');
  });

  it('cada sección del router tiene nombre', () => {
    for (const hash of ['dash', 'gast', 'compromisos', 'presupuesto', 'movimientos', 'tesoreria',
      'ahorro', 'fondo', 'metas', 'apartados', 'inversion', 'agenda', 'analisis', 'personales',
      'config', 'aprende', 'progreso']) {
      expect(NOMBRE_SECCION[hash], hash).toBeTruthy();
    }
  });

  it('la navegación principal incluye la barra, el menú Más y las franjas de los bloques', () => {
    for (const sel of ['#sidebar', '#modal-mas', '.bloque-tabs', '.bloque-chips']) {
      expect(RAIZ_NAVEGACION).toContain(sel);
    }
  });
});

describe('initVolver() en el DOM', () => {
  const llegarA = (hash) => {
    location.hash = `#${hash}`;
    window.dispatchEvent(new Event('hashchange'));
  };

  beforeAll(() => {
    // Móvil: matchMedia de happy-dom no evalúa anchos; se fuerza el caso.
    vi.stubGlobal('matchMedia', (q) => ({
      matches: q.includes('max-width'), media: q,
      addEventListener() {}, removeEventListener() {},
    }));
    window.scrollTo = () => {};
    document.body.innerHTML = '';
    initVolver();
  });

  beforeEach(() => {
    document.body.innerHTML = `
      <nav id="sidebar"><a class="nav-item" href="#tesoreria">Mis cuentas</a></nav>
      <section class="section" id="sec-gast"><a class="ver" href="#movimientos">Ver todo</a></section>
      <section class="section" id="sec-movimientos">
        <a class="section__volver" href="#dash">Inicio</a>
      </section>
      <section class="section" id="sec-ahorro"><a class="carril" href="#metas">Ver todo</a></section>
      <section class="section" id="sec-metas">
        <a class="section__volver section__volver--ahorro-hija" href="#ahorro">Ahorro</a>
      </section>
      <section class="section" id="sec-tesoreria"></section>`;
    history.replaceState(null, '', '#gast');
  });

  it('desde el contenido, la llegada dice de dónde vino y aparta el volver fijo', () => {
    document.querySelector('#sec-gast .ver').dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
    llegarA('movimientos');

    const ctx = document.querySelector('#sec-movimientos .section__volver--contexto');
    expect(ctx).not.toBeNull();
    expect(ctx.textContent.trim()).toBe('Gastos');
    expect(document.getElementById('sec-movimientos').classList.contains('tiene-volver-contexto')).toBe(true);
    expect(history.state.fkOrigen).toBe('gast');
  });

  it('desde la navegación principal no hay volver contextual', () => {
    document.querySelector('#sidebar a').dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
    llegarA('tesoreria');
    expect(document.querySelector('.section__volver--contexto')).toBeNull();
    expect(history.state.fkOrigen).toBeNull();
  });

  it('si la sección ya trae un volver al mismo origen, se reusa y vuelve atrás', () => {
    history.replaceState(null, '', '#ahorro');
    document.querySelector('#sec-ahorro .carril').dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
    llegarA('metas');

    expect(document.querySelector('#sec-metas .section__volver--contexto')).toBeNull();
    const propio = document.querySelector('#sec-metas .section__volver--ahorro-hija');
    expect(propio.hasAttribute('data-volver-atras')).toBe(true);

    const atras = vi.spyOn(history, 'back').mockImplementation(() => {});
    const ev = new Event('click', { bubbles: true, cancelable: true });
    propio.dispatchEvent(ev);
    expect(atras).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(true);
    atras.mockRestore();
  });
});
