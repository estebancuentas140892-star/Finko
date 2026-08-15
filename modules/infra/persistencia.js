/**
 * infra/persistencia.js - durabilidad del almacenamiento del origen
 * (CFG.4a, [ADR 043](../../docs/DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) D2.1).
 *
 * Responde una sola pregunta: **¿este navegador puede borrar los datos de Finko
 * por su cuenta?** Por defecto sí: el almacenamiento de un origen es "best
 * effort" y el navegador lo desaloja cuando el dispositivo se queda sin espacio,
 * sin avisar y sin pedir permiso. `navigator.storage.persist()` lo marca como
 * persistente y lo saca de ese desalojo automático.
 *
 * Es la única palanca de durabilidad que **no le pide nada al usuario después de
 * concederla**: no depende de que recuerde exportar. El hecho 7 del
 * [ADR 068](../../docs/DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md)
 * ya la había identificado (cero ocurrencias de `navigator.storage` en el repo);
 * acá se toma.
 *
 * **Lo que NO hace, y por eso el copy de Ajustes no lo promete:** no protege del
 * extravío del dispositivo, ni de desinstalar la app, ni de "Borrar datos de
 * navegación", que es una orden explícita del usuario y se cumple igual. Contra
 * eso solo hay respaldo.
 *
 * Sin DOM y sin `S`: `navigator` entra por parámetro, así que se prueba en Node
 * con un doble. Ningún caller necesita pasarlo.
 */

/** Los tres estados posibles. `no-soportado` no es un fallo: es un navegador viejo. */
export const PERSISTENCIA = Object.freeze({
  CONCEDIDA:    'concedida',
  NO_CONCEDIDA: 'no-concedida',
  NO_SOPORTADO: 'no-soportado',
});

/**
 * El `navigator` real, o el que inyecte un test.
 * @param {object} [nav]
 * @returns {object|null}
 */
function _nav(nav) {
  if (nav) return nav;
  return typeof navigator === 'object' && navigator !== null ? navigator : null;
}

/**
 * true si este navegador expone la API completa (consultar y pedir).
 *
 * Se exigen las dos funciones: hay contextos donde `navigator.storage` existe
 * pero `persist` no (Safari expuso `estimate()` antes que `persist()`), y ahí
 * mostrar un botón que no puede hacer nada sería mentir.
 *
 * @param {object} [nav] Inyectable en tests.
 * @returns {boolean}
 */
export function soportaPersistencia(nav) {
  const n = _nav(nav);
  return typeof n?.storage?.persist === 'function'
      && typeof n?.storage?.persisted === 'function';
}

/**
 * Estado actual, sin pedir nada ni mostrar ningún diálogo.
 *
 * @param {object} [nav] Inyectable en tests.
 * @returns {Promise<'concedida'|'no-concedida'|'no-soportado'>}
 */
export async function estadoPersistencia(nav) {
  if (!soportaPersistencia(nav)) return PERSISTENCIA.NO_SOPORTADO;
  try {
    const ya = await _nav(nav).storage.persisted();
    return ya ? PERSISTENCIA.CONCEDIDA : PERSISTENCIA.NO_CONCEDIDA;
  } catch (err) {
    // Contexto inseguro o API deshabilitada: no es un error del usuario y no
    // hay nada que reintentar. Mismo criterio que `cryptoDisponible()` con el
    // candado: se reporta como "este navegador no lo permite", no como fallo.
    console.warn('[persistencia] persisted() falló:', err);
    return PERSISTENCIA.NO_SOPORTADO;
  }
}

/**
 * Pide que el almacenamiento pase a persistente y devuelve el estado resultante.
 *
 * Quién decide es el navegador, no Finko: Chromium concede sin preguntar cuando
 * la app está instalada o el sitio tiene señal de uso frecuente, Firefox abre un
 * permiso, y un `false` es una respuesta legítima. Por eso el caller nunca
 * anuncia éxito por haber llamado: anuncia lo que devuelve esta función.
 *
 * Consulta antes de pedir: si ya estaba concedida, no vuelve a llamar a
 * `persist()` (en Firefox eso abriría un permiso que ya está resuelto).
 *
 * @param {object} [nav] Inyectable en tests.
 * @returns {Promise<'concedida'|'no-concedida'|'no-soportado'>}
 */
export async function solicitarPersistencia(nav) {
  const actual = await estadoPersistencia(nav);
  if (actual !== PERSISTENCIA.NO_CONCEDIDA) return actual;

  try {
    const ok = await _nav(nav).storage.persist();
    return ok ? PERSISTENCIA.CONCEDIDA : PERSISTENCIA.NO_CONCEDIDA;
  } catch (err) {
    console.warn('[persistencia] persist() falló:', err);
    return PERSISTENCIA.NO_CONCEDIDA;
  }
}
