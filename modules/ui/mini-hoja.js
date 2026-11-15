/**
 * mini-hoja.js - un dato a la vez, en una hoja chica dentro de la hoja
 * (ADR 142 D2, D4 y D6).
 *
 * En el recibo de Registrar gasto, tocar "Sale de", "Fecha" o "Nota" abre
 * una mini-hoja con ese dato y nada más: el desplegable de Finko, las
 * pastillas de la fecha con su calendario o el campo de la nota. No es un
 * modal nuevo sino un panel **dentro del mismo formulario**: sus controles
 * son los campos reales (`name="cuentaId"`, `name="nota"`...), así el
 * contrato `FormData` no cambia, y no se anida un segundo trap de foco
 * (`infra/a11y.js` no es una pila; ver la ficha de captura).
 *
 * Se dibuja pegada al borde de abajo de la hoja, sobre un velo. Mientras está
 * abierta, el resto de la hoja queda `inert`. Se cierra con su ✕, tocando el
 * velo, con Escape y con el atrás del sistema: el Escape que despacha
 * `hojas.js` pasa primero por la hoja (captura), así que cierra solo la
 * mini-hoja y se vuelve a armar el atrás para la hoja de abajo.
 *
 * - HTML: `htmlMiniHoja`.
 * - DOM: `abrirMiniHoja`, `cerrarMiniHoja`, `miniHojaAbierta`.
 */

import { esc as _esc } from '../infra/utils.js';
import { vigilarHoja } from './hojas.js';

/**
 * El HTML de una mini-hoja, oculta. Va dentro del `<form>` de la hoja, fuera
 * de las partes que se vuelven `inert` al abrirla.
 *
 * @param {{ id: string, titulo: string, cuerpo: string, pie?: string }} opciones
 * @returns {string}
 */
export function htmlMiniHoja({ id, titulo, cuerpo, pie = '' }) {
  const t = `${_esc(id)}-t`;
  return `
    <div class="mini-hoja" id="${_esc(id)}" hidden>
      <div class="mini-hoja__velo" data-mini-cerrar></div>
      <div class="mini-hoja__panel" role="dialog" aria-modal="true" aria-labelledby="${t}">
        <div class="mini-hoja__cab">
          <h3 class="mini-hoja__t" id="${t}">${_esc(titulo)}</h3>
          <button type="button" class="btn btn-icon btn-ghost mini-hoja__cerrar" data-mini-cerrar aria-label="Cerrar"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>
        </div>
        <div class="mini-hoja__cuerpo">${cuerpo}</div>
        ${pie ? `<div class="mini-hoja__pie">${pie}</div>` : ''}
      </div>
    </div>`;
}

/** Lo que cada mini-hoja abierta necesita para cerrarse. */
const _abiertas = new WeakMap();

/** @param {HTMLElement} mini */
export const miniHojaAbierta = (mini) => _abiertas.has(mini);

/**
 * Abre la mini-hoja. El foco va a lo elegido (el radio marcado), si no al
 * primer campo, y al cerrar vuelve a `origen`.
 *
 * @param {HTMLElement} mini `.mini-hoja`
 * @param {{ origen?: HTMLElement | null, alCerrar?: () => void }} [opciones]
 */
export function abrirMiniHoja(mini, { origen = null, alCerrar = null } = {}) {
  if (!mini || _abiertas.has(mini)) return;
  const hoja = mini.closest('.modal') ?? mini.parentElement;
  // El resto de la hoja no se toca ni se lee mientras tanto.
  const fondo = [
    ...[...hoja.children].filter(el => el.matches('.modal__header')),
    ...hoja.querySelectorAll('.etapas, [data-etapa]'),
  ].filter(el => !el.contains(mini) && !el.hasAttribute('inert'));
  for (const el of fondo) el.setAttribute('inert', '');

  const alTecla = (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    cerrarMiniHoja(mini);
  };
  const alClic = (e) => {
    if (e.target.closest('[data-mini-cerrar]')) cerrarMiniHoja(mini);
  };
  hoja.addEventListener('keydown', alTecla, { capture: true });
  mini.addEventListener('click', alClic);
  _abiertas.set(mini, { hoja, fondo, origen, alCerrar, alTecla, alClic });

  mini.hidden = false;
  hoja.dataset.miniHoja = '';
  const foco = mini.querySelector('input:checked, input:not([type="radio"]):not([type="hidden"]), textarea, button:not([data-mini-cerrar])')
    ?? mini.querySelector('.mini-hoja__cerrar');
  foco?.focus({ preventScroll: true });
}

/**
 * Cierra la mini-hoja y devuelve el foco a quien la abrió.
 *
 * @param {HTMLElement} mini
 */
export function cerrarMiniHoja(mini) {
  const estado = _abiertas.get(mini);
  if (!estado) return;
  _abiertas.delete(mini);
  const { hoja, fondo, origen, alCerrar, alTecla, alClic } = estado;
  hoja.removeEventListener('keydown', alTecla, { capture: true });
  mini.removeEventListener('click', alClic);
  for (const el of fondo) el.removeAttribute('inert');
  mini.hidden = true;
  delete hoja.dataset.miniHoja;
  if (origen?.isConnected) origen.focus({ preventScroll: true });
  // El atrás del sistema que la cerró gastó el vigía de la hoja de abajo.
  vigilarHoja(hoja);
  alCerrar?.();
}
