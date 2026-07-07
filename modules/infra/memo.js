/**
 * memo.js - memoización de derivaciones puras costosas (PERF.2).
 *
 * Por qué hace falta: varios widgets de solo lectura (resumen semanal,
 * actividad reciente, análisis financiero) recalculan sobre todo el
 * historial en cada render, aunque los datos de origen no hayan cambiado
 * desde el render anterior (ej. `renderAll()` repinta el dashboard completo,
 * o dos listeners de `state:change` distintos reaccionan a la misma acción
 * del usuario). `memoizar()` cachea la última llamada y sirve el resultado
 * cacheado si nada relevante cambió.
 *
 * Cómo detecta "cambió" sin Proxies ni observers sobre S (ADN 4):
 * - Contador de revisión por sección, alimentado por el propio EventBus
 *   (`state:change`), que ya es la señal canónica de mutación en toda la app
 *   (`infra/crud.js` y cada dominio la emiten tras mutar S + save()).
 * - Identidad de referencia de los valores clave (arrays de S, primitivos).
 *   Cubre el caso en que S se reemplaza sin pasar por EventBus (ej. tests
 *   que hacen `S.gastos = [...]` directo): la referencia nueva invalida la
 *   caché aunque el contador de revisión no se haya movido.
 *
 * Con cualquiera de las dos señales de cambio, se recalcula. Nunca se sirve
 * un resultado cacheado si hay duda: la caché solo ahorra trabajo cuando
 * ambas señales coinciden con la última llamada.
 */

import { EventBus } from '../core/state.js';

/** Contador de revisión por sección (clave de S). */
const _revisiones = Object.create(null);

EventBus.on('state:change', (data) => {
  const section = data?.section;
  if (!section) return;
  _revisiones[section] = (_revisiones[section] ?? 0) + 1;
});

/** Firma combinada de revisión para una lista de secciones observadas. */
function _firmaRevisiones(secciones) {
  return secciones.map((s) => _revisiones[s] ?? 0).join(':');
}

/**
 * Envuelve `fn` con una caché de 1 entrada.
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn - derivación pura a memoizar.
 * @param {string[]} secciones - claves de S (sección de `state:change`) de las
 *   que depende el resultado; su revisión se compara en cada llamada.
 * @param {(...args: Parameters<F>) => unknown[]} [extraerClave] - por defecto,
 *   los propios `args`. Úsalo cuando el caller pasa un objeto envoltorio nuevo
 *   en cada llamada (ej. `{ gastos, ingresos }`): extrae los valores reales a
 *   comparar (los arrays de adentro), no el envoltorio.
 * @returns {F}
 */
export function memoizar(fn, secciones, extraerClave = (...args) => args) {
  let claveAnterior = null;
  let firmaAnterior = null;
  let resultado;
  let tieneCache = false;

  return (...args) => {
    const clave = extraerClave(...args);
    const firma = _firmaRevisiones(secciones);
    const mismaClave = tieneCache
      && claveAnterior.length === clave.length
      && claveAnterior.every((v, i) => v === clave[i]);

    if (tieneCache && mismaClave && firma === firmaAnterior) {
      return resultado;
    }

    resultado = fn(...args);
    claveAnterior = clave;
    firmaAnterior = firma;
    tieneCache = true;
    return resultado;
  };
}
