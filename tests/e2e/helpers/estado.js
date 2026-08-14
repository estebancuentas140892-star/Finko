/**
 * helpers/estado.js - único sitio de los tests E2E que nombra la clave de
 * `localStorage` (PERF.10b, patrón P7 del ADR 068).
 *
 * Por qué existe: `page.addInitScript(fn)` serializa `fn` y la ejecuta en el
 * navegador, así que la función NO puede cerrar sobre una constante de Node.
 * Eso obligaba a teclear `'fk_v1'` dentro de cada bloque (105 siembras y 89
 * lecturas de vuelta repartidas en 13 suites). Acá la clave viaja como
 * **argumento** y el estado como **dato**: los valores calculados (un día del
 * mes, una fecha) se resuelven en Node y se serializan enteros, así que los
 * envoltorios `({ dia }) => { ... }` que solo existían para cruzar argumentos
 * al navegador desaparecen.
 *
 * La clave se importa de `storage.js`, no se teclea: mismo criterio que
 * `SCHEMA_VERSION` en `smoke.test.js` (MC.16a, un bump de schema no debe
 * poner los tests en rojo sin tocarlos).
 *
 * Cuándo usar cuál:
 * - `sembrar`        : el estado de partida del test, una sola navegación.
 * - `sembrarSiVacio` : cuando el test recarga o navega y la app guarda algo a
 *   mitad de camino. `addInitScript` se acumula y corre en CADA navegación, así
 *   que una siembra incondicional pisaría lo que la app acababa de persistir,
 *   que suele ser justo lo que el test verifica.
 * - `parchar`        : agregar colecciones sobre un estado ya sembrado (típico
 *   con un `beforeEach` que siembra vacío).
 * - `leerEstado`     : leer lo persistido para afirmar sobre él en Node.
 */

import { STORAGE_KEY } from '../../../modules/core/storage.js';

/**
 * Estado mínimo con el onboarding hecho: lo que casi todas las suites usan de
 * base. `extra` sobreescribe o agrega colecciones.
 *
 * @param {Record<string, unknown>} [extra]
 * @returns {Record<string, unknown>}
 */
export function estadoBase(extra = {}) {
  return {
    version:     1,
    perfil:      { nombre: 'TestUser', smmlv: 1750905 },
    onboarded:   true,
    cuentas:     [],
    ingresos:    [],
    gastos:      [],
    compromisos: [],
    metas:       [],
    ...extra,
  };
}

/**
 * Siembra el estado antes de que la app cargue. Incondicional: cada navegación
 * vuelve a dejar exactamente este estado.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, unknown>} estado
 */
export async function sembrar(page, estado) {
  await page.addInitScript(([clave, st]) => {
    localStorage.setItem(clave, JSON.stringify(st));
  }, [STORAGE_KEY, estado]);
}

/**
 * Siembra solo si no hay nada guardado. Para tests que recargan o navegan
 * después de que la app persistió algo por su cuenta.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, unknown>} estado
 */
export async function sembrarSiVacio(page, estado) {
  await page.addInitScript(([clave, st]) => {
    if (localStorage.getItem(clave)) return;
    localStorage.setItem(clave, JSON.stringify(st));
  }, [STORAGE_KEY, estado]);
}

/**
 * Mezcla `parche` (nivel superior) sobre el estado ya sembrado. Reemplaza cada
 * clave que traiga; no hace merge profundo, porque los tests siempre declaran
 * la colección completa que les interesa.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, unknown>} parche
 */
export async function parchar(page, parche) {
  await page.addInitScript(([clave, p]) => {
    const st = JSON.parse(localStorage.getItem(clave) || '{}');
    Object.assign(st, p);
    localStorage.setItem(clave, JSON.stringify(st));
  }, [STORAGE_KEY, parche]);
}

/**
 * Estado persistido, ya parseado. `{}` si no hay nada guardado.
 *
 * Recordar el debounce de `save()` (200 ms, ADN 5): para afirmar sobre algo que
 * la app acaba de guardar va dentro de un `expect.poll`, no en una lectura
 * única, que gana la carrera y ve el estado anterior.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Record<string, any>>}
 */
export async function leerEstado(page) {
  return page.evaluate(
    (clave) => JSON.parse(localStorage.getItem(clave) || '{}'),
    STORAGE_KEY,
  );
}
