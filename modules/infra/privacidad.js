/**
 * infra/privacidad.js - el ojo de ocultar montos, uno por sección (OJO.1,
 * [ADR 166](../../docs/DECISIONS/166-un-ojo-por-seccion.md)).
 *
 * Hasta OJO.1 un solo flag (`S.config.ocultarSaldo`) tapaba los montos de
 * toda la app: ocultar el saldo en Inicio tapaba también Gastos, Mis cuentas
 * y el resto. Ahora cada sección guarda el suyo en `S.config.ocultarPorSeccion`
 * (clave: el id de la sección en la URL, `gast`, `tesoreria`, `dash`...). Una
 * sección que todavía no tiene el suyo sigue lo que decía el flag de antes,
 * así nadie que tenía todo oculto lo ve aparecer al actualizar.
 *
 * Una pieza que pertenece a una sección pide su clave; una hoja o un
 * formulario que se abre desde cualquier lado (el detalle de un gasto, el
 * registro) sigue a la sección que está a la vista.
 */

import { S } from '../core/state.js';

/** Inicio responde a `#dash` y a la URL vacía. */
const _ALIAS = Object.freeze({ '': 'dash', inicio: 'dash' });

/**
 * La sección a la vista, por su id en la URL (`#gast` → `gast`).
 * @returns {string}
 */
export function seccionVisible() {
  const h = String(globalThis.location?.hash ?? '').slice(1).split(/[/?]/)[0];
  return _ALIAS[h] ?? h;
}

/**
 * ¿Los montos de esta sección van tapados?
 * @param {string} [seccion] - id de la sección; sin él, la que está a la vista.
 * @param {{ ocultarPorSeccion?: Record<string, boolean>, ocultarSaldo?: boolean } | undefined} [config]
 * @returns {boolean}
 */
export function montosOcultos(seccion = seccionVisible(), config = S.config) {
  const propio = config?.ocultarPorSeccion;
  if (propio && Object.hasOwn(propio, seccion)) return propio[seccion] === true;
  return config?.ocultarSaldo === true;
}

/**
 * El ojo de una sección: tapa o destapa sus montos y nada más. Devuelve el
 * estado nuevo. Quien llama guarda y repinta.
 * @param {string} [seccion]
 * @returns {boolean}
 */
export function alternarMontosOcultos(seccion = seccionVisible()) {
  const nuevo = !montosOcultos(seccion);
  S.config.ocultarPorSeccion = { ...(S.config.ocultarPorSeccion ?? {}), [seccion]: nuevo };
  return nuevo;
}
