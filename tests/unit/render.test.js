/**
 * render.test.js - updSaldo(): hero del dashboard con el ojo de ocultar
 * el dinero disponible (IN.2).
 *
 * Cubre:
 * - Monto visible formateado cuando no hay preferencia guardada.
 * - Máscara SALDO_MASCARA cuando S.config.ocultarSaldo === true, sin que el
 *   monto real toque el DOM.
 * - Lectura defensiva: solo `true` literal oculta (strings/números no).
 * - Sync del botón #saldo-ojo: aria-pressed + swap de icono ojo/ojo tachado.
 * - Empty state sin cuentas: guía visible, ojo/valor/desc ocultos.
 * - Acción `saldo-visibilidad` (actions.js): flip + re-render.
 * - `programarRender()`: coalescer de renders reactivos (PERF.6), dedup por
 *   identidad, vaciado en microtask y aislamiento de un render que lanza.
 *
 * Nota: los tests corren con location.hash = '#gast' (fuera del dashboard)
 * para que updSaldo escriba el texto directo sin countUp: las aserciones
 * son síncronas y no dependen de requestAnimationFrame.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { S } from '../../modules/core/state.js';
import {
  updSaldo, updSaludo, alternarDetalleCuentas, renderAll,
  programarRender, vaciarRendersProgramados,
  SALDO_MASCARA, SALDO_MASCARA_CUENTA,
} from '../../modules/infra/render.js';
import { initAcciones, dispatch } from '../../modules/ui/actions.js';

// ── SETUP ────────────────────────────────────────────────────────────────────

/** Réplica mínima del hero de index.html (ids reales que updSaldo consume).
 *  Marcado IN.8b (ADR 034 D2/D3): centrado, sin ícono decorativo, ojo
 *  absoluto en la esquina del hero. */
function montarHero() {
  document.body.innerHTML = `
    <article class="bento__cell bento__cell--full bento__cell--hero hero-inicio">
      <button class="hero-inicio__ojo" type="button" id="saldo-ojo"
              data-action="saldo-visibilidad" aria-pressed="false"
              aria-label="Ocultar tu dinero disponible">
        <svg class="icon"><use href="#i-eye"/></svg>
      </button>
      <p class="hero-inicio__label" id="hero-saldo-label">Tu dinero disponible hoy</p>
      <p class="hero-inicio__valor" id="saldo-total">$0</p>
      <button class="hero-inicio__pill" type="button" id="saldo-detalle-toggle"
              data-action="saldo-detalle" aria-expanded="false"
              aria-controls="saldo-detalle">
        <span class="hero-inicio__pill-icon"><svg class="icon"><use href="#i-cuentas"/></svg></span>
        <span id="saldo-detalle-label">Ver detalle por cuenta</span>
      </button>
      <ul class="hero-inicio__detalle" id="saldo-detalle" role="list" hidden></ul>
      <p class="hero-inicio__desc" id="saldo-desc">efectivo + cuentas bancarias</p>
      <div id="hero-guia-saldo" hidden></div>
    </article>
    <div class="bento__cell bento__cell--half" id="panel-cuentas-detalle"
         role="region" aria-labelledby="cuentas-detalle-titulo" hidden>
      <div class="card__header">
        <h2 class="card__title" id="cuentas-detalle-titulo">Dónde está tu dinero</h2>
      </div>
      <ul class="cuentas-inicio__lista" id="cuentas-detalle-lista" role="list"></ul>
    </div>`;
}

/**
 * IN.9c (ADR 057 D3): el detalle por cuenta es acordeón bajo 1024px y columna
 * propia desde ahí, así que cada test tiene que declarar su ancho.
 * happy-dom no tiene viewport real: `matchMedia` se falsea y `restaurarAncho`
 * lo devuelve a su sitio.
 */
const matchMediaReal = globalThis.window?.matchMedia;
const anchoDe = (esMovil) => { window.matchMedia = () => ({ matches: esMovil }); };
const restaurarAncho = () => { window.matchMedia = matchMediaReal; };

const cuenta = (saldo, overrides = {}) => ({
  id: 'c1', nombre: 'Efectivo', tipo: 'efectivo', saldo, activa: true, ...overrides,
});

beforeEach(() => {
  montarHero();
  // Fuera del dashboard: updSaldo escribe el texto directo, sin animación.
  location.hash = '#gast';
  S.cuentas = [cuenta(500_000)];
  S.config  = { notificaciones: false };
});

const elSaldo = () => document.getElementById('saldo-total');
const elOjo   = () => document.getElementById('saldo-ojo');
const hrefOjo = () => elOjo().querySelector('use').getAttribute('href');

// ── SALDO VISIBLE (default) ──────────────────────────────────────────────────

describe('updSaldo() - saldo visible (sin preferencia)', () => {
  it('muestra el monto formateado y el ojo sin presionar', () => {
    updSaldo();
    expect(elSaldo().textContent).toBe('$500.000');
    expect(elOjo().hidden).toBe(false);
    expect(elOjo().getAttribute('aria-pressed')).toBe('false');
    expect(hrefOjo()).toBe('#i-eye');
  });

  it('lectura defensiva: valores no booleanos en ocultarSaldo no ocultan', () => {
    for (const raro of ['true', 1, {}, null]) {
      S.config.ocultarSaldo = raro;
      updSaldo();
      expect(elSaldo().textContent).toBe('$500.000');
      expect(elOjo().getAttribute('aria-pressed')).toBe('false');
    }
  });

  it('S.config ausente no revienta y muestra el monto', () => {
    S.config = undefined;
    expect(() => updSaldo()).not.toThrow();
    expect(elSaldo().textContent).toBe('$500.000');
  });
});

// ── SALDO OCULTO (IN.2) ──────────────────────────────────────────────────────

describe('updSaldo() - saldo oculto (ocultarSaldo === true)', () => {
  beforeEach(() => {
    S.config.ocultarSaldo = true;
  });

  it('enmascara el monto con SALDO_MASCARA', () => {
    updSaldo();
    expect(elSaldo().textContent).toBe(SALDO_MASCARA);
  });

  it('el monto real no aparece en ninguna parte del DOM', () => {
    updSaldo();
    expect(document.body.innerHTML).not.toContain('500.000');
  });

  it('el botón queda presionado y con el ojo tachado', () => {
    updSaldo();
    expect(elOjo().getAttribute('aria-pressed')).toBe('true');
    expect(hrefOjo()).toBe('#i-eye-off');
  });

  it('volver a visible restaura monto, icono y aria-pressed', () => {
    updSaldo();
    S.config.ocultarSaldo = false;
    updSaldo();
    expect(elSaldo().textContent).toBe('$500.000');
    expect(elOjo().getAttribute('aria-pressed')).toBe('false');
    expect(hrefOjo()).toBe('#i-eye');
  });
});

// ── EMPTY STATE (sin cuentas) ────────────────────────────────────────────────

describe('updSaldo() - sin cuentas registradas', () => {
  beforeEach(() => {
    S.cuentas = [];
  });

  it('muestra la guía y oculta valor, descripción y ojo', () => {
    updSaldo();
    expect(document.getElementById('hero-guia-saldo').hidden).toBe(false);
    expect(document.getElementById('saldo-desc').hidden).toBe(true);
    expect(elSaldo().hidden).toBe(true);
    expect(elOjo().hidden).toBe(true);
  });

  it('con ocultarSaldo true el texto sigue siendo $0 (el empty state manda)', () => {
    S.config.ocultarSaldo = true;
    updSaldo();
    expect(elSaldo().textContent).toBe('$0');
  });

  it('cuentas inactivas cuentan como sin cuentas', () => {
    S.cuentas = [cuenta(900_000, { activa: false })];
    updSaldo();
    expect(document.getElementById('hero-guia-saldo').hidden).toBe(false);
    expect(elOjo().hidden).toBe(true);
  });
});

// ── ACCIÓN saldo-visibilidad (actions.js) ────────────────────────────────────

describe('acción saldo-visibilidad', () => {
  beforeEach(() => {
    initAcciones();
    updSaldo();
  });

  it('un click oculta: persiste la preferencia y enmascara', () => {
    dispatch(elOjo(), new Event('click'));
    expect(S.config.ocultarSaldo).toBe(true);
    expect(elSaldo().textContent).toBe(SALDO_MASCARA);
    expect(elOjo().getAttribute('aria-pressed')).toBe('true');
  });

  it('el segundo click vuelve a mostrar el monto', () => {
    dispatch(elOjo(), new Event('click'));
    dispatch(elOjo(), new Event('click'));
    expect(S.config.ocultarSaldo).toBe(false);
    expect(elSaldo().textContent).toBe('$500.000');
    expect(elOjo().getAttribute('aria-pressed')).toBe('false');
  });

  it('con un valor heredado raro en ocultarSaldo, el primer click cae en ocultar', () => {
    S.config.ocultarSaldo = 'si';
    dispatch(elOjo(), new Event('click'));
    expect(S.config.ocultarSaldo).toBe(true);
    expect(elSaldo().textContent).toBe(SALDO_MASCARA);
  });
});

// ── DETALLE POR CUENTA (IN.8c, ADR 034 D4) ───────────────────────────────────

describe('updSaldo() - detalle por cuenta expandible (móvil)', () => {
  const elPill    = () => document.getElementById('saldo-detalle-toggle');
  const elDetalle = () => document.getElementById('saldo-detalle');
  const elDesc    = () => document.getElementById('saldo-desc');

  /** Colapsa el detalle si un test anterior lo dejó abierto (estado de módulo). */
  function normalizarColapsado() {
    updSaldo();
    if (elPill().getAttribute('aria-expanded') === 'true') alternarDetalleCuentas();
  }

  afterEach(restaurarAncho);

  beforeEach(() => {
    anchoDe(true);
    S.cuentas = [
      cuenta(1_450_000, { id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros' }),
      cuenta(685_000,   { id: 'c2', nombre: 'Nequi',       banco: 'Nequi',       tipo: 'Ahorros' }),
      cuenta(350_000,   { id: 'c3', nombre: 'Efectivo',    banco: 'Efectivo',    tipo: 'Efectivo' }),
    ];
    normalizarColapsado();
  });

  it('colapsado por defecto: pill visible, detalle oculto, conteo visible', () => {
    expect(elPill().hidden).toBe(false);
    expect(elPill().getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('saldo-detalle-label').textContent).toBe('Ver detalle por cuenta');
    expect(elDetalle().hidden).toBe(true);
    expect(elDetalle().innerHTML).toBe('');
    expect(elDesc().hidden).toBe(false);
  });

  it('el conteo describe la composición real: efectivo + N cuentas bancarias', () => {
    expect(elDesc().textContent).toBe('efectivo + 2 cuentas bancarias');
  });

  it('conteo sin efectivo: solo cuentas bancarias (singular con 1)', () => {
    S.cuentas = [cuenta(100, { id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros' })];
    updSaldo();
    expect(elDesc().textContent).toBe('1 cuenta bancaria');
  });

  it('conteo solo con efectivo', () => {
    S.cuentas = [cuenta(100, { id: 'c1', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo' })];
    updSaldo();
    expect(elDesc().textContent).toBe('solo efectivo');
  });

  it('expandir muestra una fila por cuenta (teja + nombre + saldo) y oculta el conteo', () => {
    alternarDetalleCuentas();
    expect(elPill().getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('saldo-detalle-label').textContent).toBe('Ocultar detalle');
    expect(elDetalle().hidden).toBe(false);
    expect(elDetalle().querySelectorAll('.hero-inicio__cuenta').length).toBe(3);
    expect(elDetalle().innerHTML).toContain('Bancolombia');
    expect(elDetalle().innerHTML).toContain('$1.450.000');
    expect(elDetalle().innerHTML).toContain('$685.000');
    expect(elDetalle().innerHTML).toContain('$350.000');
    expect(elDetalle().querySelectorAll('.bank-avatar').length).toBe(3);
    expect(elDesc().hidden).toBe(true);
    alternarDetalleCuentas();
  });

  it('la máscara del ojo cubre total Y detalle: ningún saldo real toca el DOM', () => {
    S.config.ocultarSaldo = true;
    alternarDetalleCuentas();
    expect(elSaldo().textContent).toBe(SALDO_MASCARA);
    const saldos = [...elDetalle().querySelectorAll('.hero-inicio__cuenta-saldo')];
    expect(saldos.length).toBe(3);
    for (const s of saldos) expect(s.textContent).toBe(SALDO_MASCARA_CUENTA);
    expect(document.body.innerHTML).not.toContain('1.450.000');
    expect(document.body.innerHTML).not.toContain('685.000');
    expect(document.body.innerHTML).not.toContain('350.000');
    alternarDetalleCuentas();
  });

  it('colapsar limpia las filas y devuelve el conteo', () => {
    alternarDetalleCuentas();
    alternarDetalleCuentas();
    expect(elDetalle().hidden).toBe(true);
    expect(elDetalle().innerHTML).toBe('');
    expect(elDesc().hidden).toBe(false);
  });

  it('sin cuentas: pill y detalle ocultos junto con el resto del hero', () => {
    S.cuentas = [];
    updSaldo();
    expect(elPill().hidden).toBe(true);
    expect(elDetalle().hidden).toBe(true);
  });

  it('el nombre de la cuenta se escapa (sin inyección de HTML)', () => {
    S.cuentas = [cuenta(100, { id: 'c1', nombre: '<img src=x onerror=alert(1)>', banco: 'Nequi', tipo: 'Ahorros' })];
    alternarDetalleCuentas();
    expect(elDetalle().querySelector('img')).toBeNull();
    expect(elDetalle().innerHTML).toContain('&lt;img');
    alternarDetalleCuentas();
  });

  it('la acción saldo-detalle alterna sin persistir nada en S.config', () => {
    initAcciones();
    const antes = JSON.stringify(S.config);
    dispatch(elPill(), new Event('click'));
    expect(elPill().getAttribute('aria-expanded')).toBe('true');
    expect(JSON.stringify(S.config)).toBe(antes);
    dispatch(elPill(), new Event('click'));
    expect(elPill().getAttribute('aria-expanded')).toBe('false');
  });
});

// ── DETALLE POR CUENTA EN ESCRITORIO (IN.9c, ADR 057 D3) ─────────────────────

describe('updSaldo() - detalle por cuenta en columna propia (escritorio)', () => {
  const elPill   = () => document.getElementById('saldo-detalle-toggle');
  const elAcorde = () => document.getElementById('saldo-detalle');
  const elPanel  = () => document.getElementById('panel-cuentas-detalle');
  const elLista  = () => document.getElementById('cuentas-detalle-lista');
  const elDesc   = () => document.getElementById('saldo-desc');

  afterEach(restaurarAncho);

  beforeEach(() => {
    anchoDe(false);
    S.cuentas = [
      cuenta(1_450_000, { id: 'c1', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros' }),
      cuenta(685_000,   { id: 'c2', nombre: 'Nequi',       banco: 'Nequi',       tipo: 'Ahorros' }),
      cuenta(350_000,   { id: 'c3', nombre: 'Efectivo',    banco: 'Efectivo',    tipo: 'Efectivo' }),
    ];
    updSaldo();
  });

  it('la columna se muestra siempre, con una fila por cuenta', () => {
    expect(elPanel().hidden).toBe(false);
    expect(elLista().querySelectorAll('.hero-inicio__cuenta').length).toBe(3);
    expect(elLista().innerHTML).toContain('Bancolombia');
    expect(elLista().innerHTML).toContain('$1.450.000');
    expect(elLista().querySelectorAll('.bank-avatar').length).toBe(3);
  });

  it('el acordeón del hero no existe como estado: pill oculto y lista vacía', () => {
    expect(elPill().hidden).toBe(true);
    expect(elPill().getAttribute('aria-expanded')).toBe('false');
    expect(elAcorde().hidden).toBe(true);
    expect(elAcorde().innerHTML).toBe('');
  });

  it('el conteo del hero convive con la columna: el detalle ya no ocupa su sitio', () => {
    expect(elDesc().hidden).toBe(false);
    expect(elDesc().textContent).toBe('efectivo + 2 cuentas bancarias');
  });

  it('un solo ojo cubre el total y la columna: ningún saldo real toca el DOM', () => {
    S.config.ocultarSaldo = true;
    updSaldo();
    expect(elSaldo().textContent).toBe(SALDO_MASCARA);
    const saldos = [...elLista().querySelectorAll('.hero-inicio__cuenta-saldo')];
    expect(saldos.length).toBe(3);
    for (const s of saldos) expect(s.textContent).toBe(SALDO_MASCARA_CUENTA);
    expect(document.body.innerHTML).not.toContain('1.450.000');
    expect(document.body.innerHTML).not.toContain('685.000');
    expect(document.body.innerHTML).not.toContain('350.000');
  });

  it('sin cuentas: la columna se oculta y se vacía', () => {
    S.cuentas = [];
    updSaldo();
    expect(elPanel().hidden).toBe(true);
    expect(elLista().innerHTML).toBe('');
  });

  it('al pasar a móvil la columna se vacía: nada de saldos en un DOM que no se ve', () => {
    expect(elLista().innerHTML).not.toBe('');
    anchoDe(true);
    updSaldo();
    expect(elPanel().hidden).toBe(true);
    expect(elLista().innerHTML).toBe('');
    expect(elPill().hidden).toBe(false);
  });

  it('el nombre de la cuenta se escapa también en la columna', () => {
    S.cuentas = [cuenta(100, { id: 'c1', nombre: '<img src=x onerror=alert(1)>', banco: 'Nequi', tipo: 'Ahorros' })];
    updSaldo();
    expect(elLista().querySelector('img')).toBeNull();
    expect(elLista().innerHTML).toContain('&lt;img');
  });
});

// ── CIERRE DE INICIO SEGÚN EL ANCHO (DSK.1a, ADR 070 D2) ────────────────────
// En escritorio Inicio avisa, no resume: Accesos rápidos y Actividad reciente
// salieron del DOM (escritorio era su único hogar) y el Resumen semanal se
// fuerza oculto por ancho, porque bajo 1024px sigue vivo.

describe('renderAll() - cierre de Inicio según el ancho', () => {
  // De los tres modulos que el ADR 070 D2 retiro de Inicio en escritorio, dos
  // salieron tambien de movil con el ADR 087 y ya no estan en el DOM. Lo que
  // queda por decidir aca es solo Accesos rapidos, cuyo motivo si era de ancho:
  // en movil no hay barra lateral.
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="accesos-actividad-movil" hidden></div>
      <div id="panel-cuentas-detalle"></div>`;
    S.cuentas = [];
    S.config  = {};
  });

  afterEach(restaurarAncho);

  it('en escritorio oculta Accesos rapidos: la barra lateral ya los tiene', () => {
    anchoDe(false);
    renderAll();
    expect(document.getElementById('accesos-actividad-movil').hidden).toBe(true);
  });

  it('en movil los revela: no hay barra lateral que los duplique', () => {
    anchoDe(true);
    renderAll();
    expect(document.getElementById('accesos-actividad-movil').hidden).toBe(false);
  });

  it('no deja rastro de los dos paneles retirados', () => {
    anchoDe(true);
    renderAll();
    expect(document.getElementById('panel-resumen')).toBeNull();
    expect(document.getElementById('panel-actividad-reciente')).toBeNull();
  });
});

// ── updSaludo() - saludo dinámico (IN.6a, ADR 028 D3) ────────────────────────

describe('updSaludo()', () => {
  /** Réplica del header de perfil de index.html (IN.8d, ADR 034 D8). */
  beforeEach(() => {
    document.body.innerHTML = `
      <header class="section__header perfil-inicio">
        <h1 class="sr-only" id="title-dash">Tu resumen</h1>
        <span class="perfil-inicio__avatar" id="perfil-avatar" aria-hidden="true" hidden></span>
        <div class="perfil-inicio__saludo">
          <p class="perfil-inicio__franja" id="saludo-franja"></p>
          <p class="perfil-inicio__nombre" id="saludo-inicio" hidden></p>
        </div>
        <a class="perfil-inicio__ajustes" href="#config" aria-label="Ir a Ajustes"></a>
      </header>`;
    S.perfil = { nombre: 'Esteban', smmlv: 0 };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const elFranja = () => document.getElementById('saludo-franja');
  const elNombre = () => document.getElementById('saludo-inicio');
  const elAvatar = () => document.getElementById('perfil-avatar');

  it('saluda "Buenos días," entre las 5 y las 11, con el nombre en la línea 2', () => {
    vi.setSystemTime(new Date(2026, 6, 5, 8, 0));
    updSaludo();
    expect(elFranja().textContent).toBe('Buenos días,');
    expect(elNombre().textContent).toBe('Esteban');
    expect(elNombre().hidden).toBe(false);
  });

  it('saluda "Buenas tardes," entre las 12 y las 18', () => {
    vi.setSystemTime(new Date(2026, 6, 5, 15, 0));
    updSaludo();
    expect(elFranja().textContent).toBe('Buenas tardes,');
    expect(elNombre().textContent).toBe('Esteban');
  });

  it('saluda "Buenas noches," de 19 a 23 y de 0 a 4', () => {
    vi.setSystemTime(new Date(2026, 6, 5, 21, 0));
    updSaludo();
    expect(elFranja().textContent).toBe('Buenas noches,');

    vi.setSystemTime(new Date(2026, 6, 5, 3, 0));
    updSaludo();
    expect(elFranja().textContent).toBe('Buenas noches,');
  });

  it('el avatar muestra las iniciales del nombre (1 palabra → 1 letra)', () => {
    vi.setSystemTime(new Date(2026, 6, 5, 8, 0));
    updSaludo();
    expect(elAvatar().hidden).toBe(false);
    expect(elAvatar().textContent).toBe('E');
  });

  it('con dos o más palabras toma las iniciales de las dos primeras', () => {
    S.perfil = { nombre: 'juan pérez gómez', smmlv: 0 };
    vi.setSystemTime(new Date(2026, 6, 5, 8, 0));
    updSaludo();
    expect(elAvatar().textContent).toBe('JP');
  });

  it('sin nombre: la franja saluda sola (sin coma) y nombre y avatar se ocultan', () => {
    S.perfil = { nombre: '', smmlv: 0 };
    vi.setSystemTime(new Date(2026, 6, 5, 8, 0));
    updSaludo();
    expect(elFranja().textContent).toBe('Buenos días');
    expect(elNombre().hidden).toBe(true);
    expect(elAvatar().hidden).toBe(true);
    expect(elAvatar().textContent).toBe('');
  });

  it('S.perfil ausente no revienta y saluda sin nombre', () => {
    S.perfil = undefined;
    vi.setSystemTime(new Date(2026, 6, 5, 8, 0));
    expect(() => updSaludo()).not.toThrow();
    expect(elFranja().textContent).toBe('Buenos días');
  });

  it('no-op si los contenedores no existen', () => {
    document.body.innerHTML = '';
    expect(() => updSaludo()).not.toThrow();
  });
});

// ── COALESCER DE RENDERS (PERF.6) ────────────────────────────────────────────

describe('programarRender() - coalescer de renders reactivos (PERF.6)', () => {
  it('no pinta en el mismo tick: el render corre en el microtask', async () => {
    const fn = vi.fn();
    programarRender(fn);
    expect(fn).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('colapsa N agendas del mismo render en un solo pintado', async () => {
    const fn = vi.fn();
    for (let i = 0; i < 12; i++) programarRender(fn);
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('renders distintos corren todos, una vez cada uno', async () => {
    const a = vi.fn();
    const b = vi.fn();
    programarRender(a);
    programarRender(b);
    programarRender(a);
    await Promise.resolve();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('agendar en un tick posterior vuelve a pintar', async () => {
    const fn = vi.fn();
    programarRender(fn);
    await Promise.resolve();
    programarRender(fn);
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('un render que lanza no deja sin pintar a los demás', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const revienta = vi.fn(() => { throw new Error('render roto'); });
    const sano = vi.fn();
    programarRender(revienta);
    programarRender(sano);
    await Promise.resolve();
    expect(revienta).toHaveBeenCalledTimes(1);
    expect(sano).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('un render que agenda otro render no entra en bucle en el mismo vaciado', () => {
    const interno = vi.fn();
    const externo = vi.fn(() => programarRender(interno));
    programarRender(externo);
    vaciarRendersProgramados();
    expect(externo).toHaveBeenCalledTimes(1);
    expect(interno).not.toHaveBeenCalled();
    vaciarRendersProgramados();
    expect(interno).toHaveBeenCalledTimes(1);
  });

  it('ignora lo que no es función', async () => {
    expect(() => programarRender(null)).not.toThrow();
    expect(() => programarRender('renderizame')).not.toThrow();
    await Promise.resolve();
  });

  it('vaciarRendersProgramados() deja la cola vacía', () => {
    const fn = vi.fn();
    programarRender(fn);
    vaciarRendersProgramados();
    vaciarRendersProgramados();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
