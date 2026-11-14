/**
 * teclado.js - el pie de las hojas se apoya sobre el teclado (ADR 115, MV2.5).
 *
 * En iOS el teclado no achica la página: tapa la parte de abajo. Una hoja
 * (`.modal-overlay`, fija a toda la pantalla) dejaba su pie con "Guardar"
 * debajo del teclado, y con el teclado abierto solo se veía el monto
 * (hallazgo C1 de la auditoría móvil). Android hace lo mismo desde que
 * Chrome dejó de achicar la página por defecto.
 *
 * Qué hace: lee `visualViewport` (el área que de verdad se ve) y, mientras
 * el teclado ocupa pantalla, deja en `<html>` la marca `data-teclado` y dos
 * variables, `--fk-vv-alto` y `--fk-vv-arriba`. `responsive.css` pega la
 * hoja abierta a esa área, así que su pie queda encima del teclado. Sin
 * teclado no deja nada y la hoja es la de siempre.
 *
 * Se eligió `visualViewport` y no `interactive-widget=resizes-content` en el
 * viewport: ese atributo solo lo entiende Chrome en Android, y iOS necesita
 * esto igual. Un solo mecanismo para los dos.
 *
 * REV.2b (ADR 141 D4): al achicarse la hoja, el campo que se está escribiendo
 * podía quedar debajo del teclado (el navegador lo había llevado a la vista
 * antes de que la hoja cambiara de alto). Cuando el teclado se abre o cambia
 * de alto, y cuando se pasa a otro campo con el teclado abierto, el campo
 * enfocado sube al centro del área visible. Vale para todos los formularios.
 * No se hace al desplazar: el usuario que mueve la hoja con el teclado
 * abierto decide qué mira.
 */

/**
 * Lo que tapa el teclado por debajo de este umbral no es teclado: es la barra
 * del navegador que se esconde o aparece al desplazar.
 */
export const UMBRAL_TECLADO_PX = 120;

/**
 * El área visible mientras hay teclado, o `null` si no lo hay. Con la página
 * ampliada (pellizco) el área visible también se achica, pero no es teclado.
 *
 * @param {{ height: number, offsetTop: number, scale?: number }} vv
 * @param {number} altoPagina `window.innerHeight`
 * @returns {{ alto: number, arriba: number } | null}
 */
export function areaConTeclado(vv, altoPagina) {
  if (!vv || !(altoPagina > 0)) return null;
  if ((vv.scale ?? 1) > 1.01) return null;
  if (altoPagina - vv.height < UMBRAL_TECLADO_PX) return null;
  return { alto: Math.round(vv.height), arriba: Math.round(vv.offsetTop) };
}

/** Lo que abre el teclado al enfocarse: los campos de texto, no casillas ni botones. */
const CAMPO_CON_TECLADO =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="hidden"]), textarea, [contenteditable="true"]';

/**
 * Lo que tapa el pie de la hoja ("Cancelar" y "Guardar", pegado abajo): un
 * campo que termina dentro de esta franja tampoco se ve.
 */
export const PIE_HOJA_PX = 96;

/**
 * Sube el campo enfocado al centro del área visible (REV.2b, ADR 141 D4).
 * Solo un campo que abre el teclado y vive en una hoja abierta (las páginas
 * las desplaza el navegador solo); y solo si quedó fuera de la vista o bajo
 * el pie: lo que ya se ve no se mueve.
 *
 * @param {Element | null} [campo] Por defecto, el que tiene el foco.
 * @param {{ height: number, offsetTop: number } | null} [vv] El área visible.
 * @returns {boolean} Si lo movió.
 */
export function llevarCampoALaVista(campo = document.activeElement, vv = window.visualViewport ?? null) {
  if (!campo?.matches?.(CAMPO_CON_TECLADO) || typeof campo.scrollIntoView !== 'function') return false;
  if (!campo.closest('.modal-overlay[data-open]')) return false;
  if (vv) {
    const r = campo.getBoundingClientRect();
    const arriba = vv.offsetTop ?? 0;
    if (r.top >= arriba && r.bottom <= arriba + vv.height - PIE_HOJA_PX) return false;
  }
  campo.scrollIntoView({ block: 'center', inline: 'nearest' });
  return true;
}

/**
 * Engancha `visualViewport`. Se llama una vez desde bootstrap.js; sin
 * `visualViewport` (navegadores viejos) no hace nada.
 *
 * @param {VisualViewport | null} [vv]
 */
export function initTeclado(vv = window.visualViewport ?? null) {
  if (!vv) return;
  const raiz = document.documentElement;
  let altoAnterior = null;
  // Un cuadro después: primero `responsive.css` pega la hoja al área nueva y
  // después se calcula dónde queda el campo.
  const alCuadroSiguiente = (fn) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : fn());
  const aplicar = (e) => {
    const area = areaConTeclado(vv, window.innerHeight);
    if (area) {
      raiz.style.setProperty('--fk-vv-alto', `${area.alto}px`);
      raiz.style.setProperty('--fk-vv-arriba', `${area.arriba}px`);
      raiz.dataset.teclado = 'abierto';
      if (e?.type !== 'scroll' && area.alto !== altoAnterior) alCuadroSiguiente(() => llevarCampoALaVista(document.activeElement, vv));
      altoAnterior = area.alto;
    } else {
      altoAnterior = null;
      if ('teclado' in raiz.dataset) {
        raiz.style.removeProperty('--fk-vv-alto');
        raiz.style.removeProperty('--fk-vv-arriba');
        delete raiz.dataset.teclado;
      }
    }
  };
  vv.addEventListener('resize', aplicar);
  vv.addEventListener('scroll', aplicar);
  // Con el teclado ya abierto, pasar a otro campo no cambia el alto: el
  // campo nuevo se sube aparte.
  document.addEventListener('focusin', (e) => {
    if ('teclado' in raiz.dataset) alCuadroSiguiente(() => llevarCampoALaVista(e.target, vv));
  });
  aplicar();
}
