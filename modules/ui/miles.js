/**
 * ui/miles.js - los campos de dinero muestran el separador de miles mientras
 * se escribe (ADR 120, MV2.3 tanda 5; R16).
 *
 * Un campo de dinero se marca con `data-miles` (texto con teclado numérico).
 * Dos escuchas en `document` lo resuelven para todos:
 *
 * - `input`: reformatea "1500000" a "1.500.000" sin mover el cursor de entre
 *   los dígitos donde estaba. En captura, para que las vistas previas que
 *   escuchan el mismo campo ya lean el valor formateado.
 * - `formdata`: cuando un formulario arma su `FormData`, cada campo marcado
 *   viaja como dígitos ("1500000"). Así los formularios que validan con
 *   `Number(datos.monto)` no cambian. Quien lee `.value` directo usa
 *   `desdeMiles()`.
 */

import { miles, desdeMiles, posicionTrasMiles } from '../infra/miles.js';

function _alEscribir(e) {
  const campo = e.target;
  if (!campo?.matches?.('input[data-miles]')) return;
  const antes = campo.value;
  const cursor = campo.selectionStart ?? antes.length;
  const aLaDerecha = antes.slice(cursor).replace(/\D/g, '').length;
  const formateado = miles(antes);
  if (formateado === antes) return;
  campo.value = formateado;
  const pos = posicionTrasMiles(formateado, aLaDerecha);
  campo.setSelectionRange?.(pos, pos);
}

function _alArmarFormulario(e) {
  for (const campo of e.target?.querySelectorAll?.('input[data-miles][name]') ?? []) {
    if (!e.formData?.has(campo.name)) continue;
    const n = desdeMiles(campo.value);
    e.formData.set(campo.name, n === null ? '' : String(n));
  }
}

/** Se llama una vez desde bootstrap.js. */
export function initMiles() {
  document.addEventListener('input', _alEscribir, true);
  document.addEventListener('formdata', _alArmarFormulario, true);
}
