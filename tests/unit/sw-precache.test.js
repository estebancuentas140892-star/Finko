/**
 * sw-precache.test.js - la lista de precache del Service Worker cubre todo lo
 * que la app importa (UPD.2).
 *
 * ## Por qué existe este test
 *
 * La estrategia del SW es Cache First con relleno en `fetch`: un asset que no
 * está en `CORE_ASSETS` igual acaba cacheado la primera vez que el navegador lo
 * pide. Eso hace que una omisión en la lista **no se note** mientras la
 * instalación no se actualice, y por eso siete módulos estuvieron fuera durante
 * meses, entre ellos `infra/cuenta-helper.js`, que importan 18 módulos.
 *
 * Al actualizar sí se notaba: `activate` borraba el cache anterior con esos
 * módulos dentro y el nuevo no los traía. Sin red, cada uno devolvía 503, y
 * como el grafo de imports es estático (cero `import()` dinámico en el
 * proyecto) un solo 503 impide que `bootstrap.js` corra: la app queda en el
 * HTML estático, que se lee como "volví a una versión vieja".
 *
 * El SW tiene desde UPD.2 una red de abajo (traspasa del cache viejo al nuevo
 * lo que el nuevo no trae), pero la red de arriba es esta: que la lista no
 * pueda quedarse corta sin que alguien se entere.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, posix } from 'node:path';

const RAIZ = process.cwd();
const SW   = readFileSync(join(RAIZ, 'service-worker.js'), 'utf-8');

/** Rutas relativas que el SW declara, sin el `./` inicial. */
const declaradas = new Set(
  [...SW.matchAll(/['"]\.\/([^'"]+)['"]/g)].map(m => m[1]),
);

/**
 * Todos los archivos de un directorio, recursivo, con separador POSIX (el que
 * usa el SW). Windows devuelve `\`, así que se normaliza.
 */
function archivos(dir, base = dir, out = []) {
  for (const entrada of readdirSync(join(RAIZ, dir), { withFileTypes: true })) {
    const rel = posix.join(dir, entrada.name);
    if (entrada.isDirectory()) archivos(rel, base, out);
    else out.push(rel);
  }
  return out;
}

const modulos = archivos('modules').filter(f => f.endsWith('.js'));
const hojas   = archivos('styles').filter(f => f.endsWith('.css'));

describe('service-worker.js - cobertura del precache', () => {
  it('precachea todos los módulos de la app', () => {
    const faltan = modulos.filter(f => !declaradas.has(f));
    expect(faltan, `módulos sin precachear:\n  ${faltan.join('\n  ')}`).toEqual([]);
  });

  it('precachea todas las hojas de estilo', () => {
    const faltan = hojas.filter(f => !declaradas.has(f));
    expect(faltan, `hojas sin precachear:\n  ${faltan.join('\n  ')}`).toEqual([]);
  });

  // Un asset listado que ya no existe hace fallar `cache.addAll()` entero, y
  // con él el install: el SW nuevo no se activa y el usuario se queda en la
  // versión anterior para siempre. Es el fallo simétrico del de arriba y
  // rompe la actualización de forma más ruidosa.
  it('no declara ningún asset que ya no exista', () => {
    const rutas = [...declaradas].filter(f => /\.(js|css)$/.test(f));
    const fantasmas = rutas.filter((f) => {
      try {
        readFileSync(join(RAIZ, f));
        return false;
      } catch {
        return true;
      }
    });
    expect(fantasmas, `assets declarados que no existen:\n  ${fantasmas.join('\n  ')}`).toEqual([]);
  });

  it('precachea el shell por sus dos claves: la raíz y el nombre de archivo', () => {
    // `'./'` e `'./index.html'` son dos entradas distintas del cache aunque el
    // servidor devuelva el mismo cuerpo. La raíz se busca literal: el patrón de
    // `declaradas` exige al menos un carácter después de `./`.
    expect(SW).toMatch(/^\s*'\.\/',$/m);
    expect(declaradas.has('index.html')).toBe(true);
  });

  it('el nombre del cache sube en cada versión, que es lo que dispara la actualización', () => {
    const m = SW.match(/const CACHE_NAME = 'finko-v(\d+)';/);
    expect(m, 'CACHE_NAME no tiene la forma finko-vNNN').not.toBeNull();
    expect(Number(m[1])).toBeGreaterThan(0);
  });
});

describe('service-worker.js - ciclo de actualización', () => {
  it('el SW nuevo no espera a que se cierren las pestañas', () => {
    expect(SW).toContain('self.skipWaiting()');
  });

  // UPD.2: el claim va DESPUÉS del traspaso. Reclamar la página con el cache a
  // medio poblar es el hueco por el que se colaba el 503.
  it('reclama la página solo cuando el cache nuevo está completo', () => {
    expect(SW).toMatch(/waitUntil\(\s*_traspasarYPurgar\(\)\.then\(\(\) => self\.clients\.claim\(\)\)\s*\)/);
  });

  it('traspasa del cache viejo al nuevo antes de purgar', () => {
    // El orden importa: si se purga primero, lo que el viejo tenía y el nuevo
    // no se pierde sin remedio.
    const iPut    = SW.indexOf('nuevo.put(req, res.clone())');
    const iDelete = SW.indexOf('viejos.map((n) => caches.delete(n))');
    expect(iPut).toBeGreaterThan(-1);
    expect(iDelete).toBeGreaterThan(iPut);
  });

  it('solo purga caches de Finko, no los de otros orígenes de la misma máquina', () => {
    expect(SW).toContain("n.startsWith('finko-')");
  });
});
