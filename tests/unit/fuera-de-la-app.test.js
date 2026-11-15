/**
 * fuera-de-la-app.test.js - lo que Finko muestra fuera de la app (HF.3e, ADR 144).
 *
 * - D1: con el candado la notificación no nombra ni muestra cifras; con el ojo,
 *   nombra pero sin la cifra.
 * - D2: el número del ícono cuenta los avisos que pueden interrumpir, solo con
 *   los recordatorios activados, y se limpia en cero.
 * - D3: la notificación lleva la sección de su aviso y el service worker la
 *   abre ahí.
 * - D4: los cuatro accesos directos, `?accion=` como lista cerrada, y el SW
 *   sirve el shell de `/` a una dirección con query sin guardar otra copia.
 *
 * Todos los datos son inventados.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { S, createInitialState } from '../../modules/core/state.js';
import {
  formatearAvisoSistema, rutaDeAviso, avisosQueNotifican, actualizarInsignia, verificarYNotificar,
} from '../../modules/infra/notificaciones.js';
import {
  ACCIONES_DE_ARRANQUE, accionDeArranque, tomarAccionDeArranque, ejecutarAccionDeArranque,
} from '../../modules/ui/accion-arranque.js';
import { registrarAccion } from '../../modules/ui/actions.js';

const RAIZ = process.cwd();
const HOY = '2026-11-15';

const aviso = (o = {}) => ({
  id: 'compromiso-proximo:c1', tipo: 'compromiso-proximo', severidad: 'alta', nombre: 'Arriendo',
  monto: 1_500_000, dias: 0, sentido: 'restante', seccion: 'compromisos', extra: null, ...o,
});

/** Un estado con dos compromisos que vencen hoy (los dos interrumpen). */
function estadoConAvisos() {
  Object.assign(S, createInitialState());
  S.onboarded = true;
  const fijo = (id, descripcion, monto) => ({
    id, descripcion, tipo: 'fijo', categoria: 'Vivienda', monto, frecuencia: 'Mensual',
    diaPago: 15, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z',
  });
  S.compromisos = [fijo('c1', 'Arriendo', 1_500_000), fijo('c2', 'Internet', 90_000)];
  S.config = { ...S.config, notificaciones: true, primerUsoISO: HOY, ultimoRespaldoISO: HOY };
}

// ── D1 ──────────────────────────────────────────────────────────────

describe('D1: con candado, la notificación no dice qué ni cuánto', () => {
  it('con candado dice solo cuántos avisos esperan', () => {
    expect(formatearAvisoSistema(aviso(), 1, { candado: true }))
      .toEqual({ titulo: 'Tienes un aviso en Finko', cuerpo: 'Ábrela para verlo.' });
    expect(formatearAvisoSistema(aviso(), 3, { candado: true }))
      .toEqual({ titulo: 'Tienes 3 avisos en Finko', cuerpo: 'Ábrela para verlos.' });
  });

  it('con candado no queda ni el nombre ni la cifra ni el emoji', () => {
    const { titulo, cuerpo } = formatearAvisoSistema(aviso(), 2, { candado: true, oculto: true });
    expect(`${titulo} ${cuerpo}`).not.toMatch(/Arriendo|\$|1\.500\.000|⏰/);
  });

  it('con el ojo puesto nombra el aviso pero no lleva la cifra', () => {
    const r = formatearAvisoSistema(aviso(), 2, { oculto: true });
    expect(r.titulo).toBe('⏰ Arriendo vence hoy');
    expect(r.cuerpo).toBe('Tienes otro aviso en Finko.');
  });

  it('sin candado ni ojo, como antes: con la cifra', () => {
    expect(formatearAvisoSistema(aviso()).cuerpo).toBe('$1.500.000');
  });

  it('verificarYNotificar redacta con el candado de S y manda la sección en data.url', async () => {
    estadoConAvisos();
    S.config.bloqueo = { hash: 'h', salt: 's' };
    const mostrar = vi.fn();
    vi.stubGlobal('Notification', { permission: 'granted' });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistration: async () => ({ showNotification: mostrar }) },
    });
    await verificarYNotificar(HOY);
    expect(mostrar).toHaveBeenCalledTimes(1);
    const [titulo, opts] = mostrar.mock.calls[0];
    expect(titulo).toBe('Tienes 2 avisos en Finko');
    expect(opts.body).toBe('Ábrela para verlos.');
    expect(opts.data).toEqual({ url: '/#compromisos' });
    delete navigator.serviceWorker;
    vi.unstubAllGlobals();
  });
});

// ── D2 ──────────────────────────────────────────────────────────────

describe('D2: el número del ícono', () => {
  let poner;
  let limpiar;
  beforeEach(() => {
    estadoConAvisos();
    poner = vi.fn(async () => {});
    limpiar = vi.fn(async () => {});
    navigator.setAppBadge = poner;
    navigator.clearAppBadge = limpiar;
  });
  afterEach(() => {
    delete navigator.setAppBadge;
    delete navigator.clearAppBadge;
  });

  it('cuenta lo mismo que puede volverse notificación', async () => {
    expect(avisosQueNotifican(S, HOY)).toHaveLength(2);
    await actualizarInsignia(HOY);
    expect(poner).toHaveBeenCalledWith(2);
  });

  it('respeta la sección apagada', async () => {
    S.config.avisosPorSeccion = { compromisos: false };
    await actualizarInsignia(HOY);
    expect(poner).not.toHaveBeenCalled();
    expect(limpiar).toHaveBeenCalledTimes(1);
  });

  it('sin recordatorios activados, se limpia', async () => {
    S.config.notificaciones = false;
    await actualizarInsignia(HOY);
    expect(poner).not.toHaveBeenCalled();
    expect(limpiar).toHaveBeenCalledTimes(1);
  });

  it('el candado no lo apaga: un número no dice montos', async () => {
    S.config.bloqueo = { hash: 'h', salt: 's' };
    await actualizarInsignia(HOY);
    expect(poner).toHaveBeenCalledWith(2);
  });

  it('sin la API no hace nada', async () => {
    delete navigator.setAppBadge;
    await expect(actualizarInsignia(HOY)).resolves.toBeUndefined();
  });
});

// ── D3 ──────────────────────────────────────────────────────────────

describe('D3: la notificación abre la sección de su aviso', () => {
  it('cada sección del motor tiene su ruta; el respaldo va a Ajustes', () => {
    expect(rutaDeAviso(aviso())).toBe('/#compromisos');
    expect(rutaDeAviso(aviso({ seccion: 'presupuesto' }))).toBe('/#presupuesto');
    expect(rutaDeAviso(aviso({ seccion: 'apartados' }))).toBe('/#apartados');
    expect(rutaDeAviso(aviso({ seccion: 'personales' }))).toBe('/#personales');
    expect(rutaDeAviso(aviso({ seccion: 'tesoreria' }))).toBe('/#tesoreria');
    expect(rutaDeAviso(aviso({ seccion: 'respaldo' }))).toBe('/#config');
    expect(rutaDeAviso(aviso({ seccion: 'otra' }))).toBe('/#dash');
    expect(rutaDeAviso(null)).toBe('/#dash');
  });
});

/**
 * Corre `service-worker.js` con un `self` de mentira y devuelve sus listeners.
 * El archivo solo declara constantes y listeners al cargarse.
 */
function cargarSW({ ventanas = [], cache = {} } = {}) {
  const listeners = {};
  const abiertas = [];
  const self = {
    location: { origin: 'https://finko.test' },
    registration: { scope: 'https://finko.test/' },
    addEventListener: (tipo, fn) => { listeners[tipo] = fn; },
    skipWaiting: () => {},
    clients: {
      matchAll: async () => ventanas,
      openWindow: async (url) => { abiertas.push(url); },
      claim: async () => {},
    },
  };
  const caches = {
    match: vi.fn(async (req, opts) => {
      const u = new URL(typeof req === 'string' ? req : req.url, 'https://finko.test/');
      const clave = opts?.ignoreSearch ? u.pathname : `${u.pathname}${u.search}`;
      return cache[clave] ?? null;
    }),
    open: vi.fn(async () => ({ put: vi.fn() })),
    keys: async () => [],
  };
  const red = vi.fn(async () => ({ status: 200, type: 'basic', clone: () => ({}) }));
  const codigo = readFileSync(join(RAIZ, 'service-worker.js'), 'utf-8');
  new Function('self', 'caches', 'fetch', codigo)(self, caches, red);
  return { listeners, abiertas, caches, red };
}

/** Un evento de notificación con lo que el SW lee. */
function clic(data) {
  let espera;
  return {
    notification: { data, close: vi.fn() },
    waitUntil: (p) => { espera = p; },
    get espera() { return espera; },
  };
}

describe('D3: el service worker atiende el toque', () => {
  it('sin la app abierta, la abre en la sección', async () => {
    const { listeners, abiertas } = cargarSW();
    const e = clic({ url: '/#compromisos' });
    listeners.notificationclick(e);
    await e.espera;
    expect(e.notification.close).toHaveBeenCalled();
    expect(abiertas).toEqual(['https://finko.test/#compromisos']);
  });

  it('con la app abierta, la enfoca y la lleva a la sección', async () => {
    const ventana = { url: 'https://finko.test/#dash', focus: vi.fn(async () => {}), navigate: vi.fn(async () => {}) };
    const { listeners, abiertas } = cargarSW({ ventanas: [ventana] });
    const e = clic({ url: '/#presupuesto' });
    listeners.notificationclick(e);
    await e.espera;
    expect(ventana.focus).toHaveBeenCalled();
    expect(ventana.navigate).toHaveBeenCalledWith('https://finko.test/#presupuesto');
    expect(abiertas).toEqual([]);
  });

  it('una ruta que no escribió la app cae en Inicio', async () => {
    const { listeners, abiertas } = cargarSW();
    for (const data of [{ url: 'https://otro.sitio/' }, { url: '/#a?b' }, null]) {
      const e = clic(data);
      listeners.notificationclick(e);
      await e.espera;
    }
    expect(abiertas).toEqual(['https://finko.test/', 'https://finko.test/', 'https://finko.test/']);
  });
});

// ── D4 ──────────────────────────────────────────────────────────────

describe('D4: los accesos directos', () => {
  const MANIFEST = JSON.parse(readFileSync(join(RAIZ, 'manifest.json'), 'utf-8'));

  it('el manifiesto trae Hoy, Por pagar, Registrar gasto y Registrar ingreso', () => {
    expect(MANIFEST.shortcuts.map(s => [s.name, s.url])).toEqual([
      ['Hoy', '/#dash'],
      ['Por pagar', '/#compromisos'],
      ['Registrar gasto', '/?accion=nuevo-gasto#gast'],
      ['Registrar ingreso', '/?accion=nuevo-ingreso-puntual#tesoreria'],
    ]);
  });

  it('cada acción de un acceso es de la lista cerrada', () => {
    for (const { url } of MANIFEST.shortcuts) {
      const accion = new URL(url, 'https://finko.test/').searchParams.get('accion');
      if (accion) expect(ACCIONES_DE_ARRANQUE).toContain(accion);
    }
  });

  it('accionDeArranque ignora lo que no está en la lista', () => {
    expect(accionDeArranque('?accion=nuevo-gasto')).toBe('nuevo-gasto');
    expect(accionDeArranque('?accion=resetear-app')).toBeNull();
    expect(accionDeArranque('')).toBeNull();
    expect(accionDeArranque(undefined)).toBeNull();
  });

  it('tomarAccionDeArranque la borra de la dirección y deja el resto', () => {
    history.replaceState(null, '', '/?accion=nuevo-gasto&x=1#gast');
    expect(tomarAccionDeArranque()).toBe('nuevo-gasto');
    expect(`${location.search}${location.hash}`).toBe('?x=1#gast');
    history.replaceState(null, '', '/?accion=resetear-app#dash');
    expect(tomarAccionDeArranque()).toBeNull();
    expect(`${location.search}${location.hash}`).toBe('#dash');
    expect(tomarAccionDeArranque()).toBeNull();
  });

  it('ejecuta el mismo manejador del botón, solo con la app ya en uso', () => {
    const fn = vi.fn();
    registrarAccion('nuevo-gasto', fn);
    Object.assign(S, createInitialState());
    S.onboarded = false;
    expect(ejecutarAccionDeArranque('nuevo-gasto')).toBe(false);
    S.onboarded = true;
    expect(ejecutarAccionDeArranque('resetear-app')).toBe(false);
    expect(ejecutarAccionDeArranque('nuevo-gasto')).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0].dataset.action).toBe('nuevo-gasto');
  });

  it('el SW sirve el shell de / a una dirección con ?accion= y no guarda otra copia', async () => {
    const shell = { cuerpo: 'shell' };
    const { listeners, caches, red } = cargarSW({ cache: { '/': shell } });
    let respuesta;
    listeners.fetch({
      request: { method: 'GET', mode: 'navigate', url: 'https://finko.test/?accion=nuevo-gasto' },
      respondWith: (p) => { respuesta = p; },
    });
    expect(await respuesta).toBe(shell);
    expect(red).not.toHaveBeenCalled();
    expect(caches.open).not.toHaveBeenCalled();
  });
});
