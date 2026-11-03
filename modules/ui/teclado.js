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

/**
 * Engancha `visualViewport`. Se llama una vez desde bootstrap.js; sin
 * `visualViewport` (navegadores viejos) no hace nada.
 *
 * @param {VisualViewport | null} [vv]
 */
export function initTeclado(vv = window.visualViewport ?? null) {
  if (!vv) return;
  const raiz = document.documentElement;
  const aplicar = () => {
    const area = areaConTeclado(vv, window.innerHeight);
    if (area) {
      raiz.style.setProperty('--fk-vv-alto', `${area.alto}px`);
      raiz.style.setProperty('--fk-vv-arriba', `${area.arriba}px`);
      raiz.dataset.teclado = 'abierto';
    } else if ('teclado' in raiz.dataset) {
      raiz.style.removeProperty('--fk-vv-alto');
      raiz.style.removeProperty('--fk-vv-arriba');
      delete raiz.dataset.teclado;
    }
  };
  vv.addEventListener('resize', aplicar);
  vv.addEventListener('scroll', aplicar);
  aplicar();
}
