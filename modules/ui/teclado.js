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
 *
 * FORM.2a (ADR 142 D8): el campo se ancla arriba del cuerpo, no al centro
 * (`scroll-padding` del cuerpo deja ver su rótulo), y Enter avanza en vez de
 * enviar: en una hoja del teléfono la tecla dice "Siguiente" y pasa al campo
 * que sigue, o "Listo" en el último y cierra el teclado. Solo el botón
 * guarda: se acaba el envío implícito con el formulario a medias.
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
 * Lo que tapa el pie de la hoja (el botón de guardar, pegado abajo): un
 * campo que termina dentro de esta franja tampoco se ve.
 */
export const PIE_HOJA_PX = 96;

/**
 * Sube el campo enfocado al tope del área visible (REV.2b, ADR 141 D4; arriba
 * y no al centro desde el ADR 142 D8).
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
  campo.scrollIntoView({ block: 'start', inline: 'nearest' });
  return true;
}

const MQ_MOVIL = '(max-width: 1023.98px)';
const _esMovil = () => window.matchMedia?.(MQ_MOVIL).matches === true;

/** ¿Se ve? Un campo de un bloque plegado o escondido no recibe el foco. */
function _seVe(el) {
  if (el.disabled || el.readOnly || el.closest('[hidden], [inert]')) return false;
  return typeof el.checkVisibility === 'function' ? el.checkVisibility() : el.getClientRects().length > 0;
}

/**
 * El campo que sigue en el mismo formulario y abre el teclado, o `null` si
 * es el último (ADR 142 D8). Una casilla, un botón o un grupo de pastillas
 * no cuentan: Enter no los elige.
 *
 * @param {Element} campo
 * @returns {HTMLElement | null}
 */
export function campoSiguiente(campo) {
  const form = campo?.closest?.('form');
  if (!form) return null;
  const campos = [...form.querySelectorAll(CAMPO_CON_TECLADO)].filter(c => c === campo || _seVe(c));
  const i = campos.indexOf(campo);
  return i >= 0 ? campos[i + 1] ?? null : null;
}

/** Un campo de una línea en el formulario de una hoja abierta del teléfono. */
const _campoDeHoja = (el) =>
  el?.matches?.('input') && el.matches(CAMPO_CON_TECLADO) && el.closest('.modal-overlay[data-open] form') != null && _esMovil();

/**
 * La tecla Enter dice lo que hace: "Siguiente" o "Listo". Lo que el
 * formulario ya trae escrito manda; lo que pone este módulo se recalcula
 * cada vez, porque un campo puede aparecer o plegarse entre un foco y otro.
 *
 * @param {Element} campo
 */
export function marcarTeclaEnter(campo) {
  if (!_campoDeHoja(campo)) return;
  if (campo.hasAttribute('enterkeyhint') && !('enterAuto' in campo.dataset)) return;
  campo.setAttribute('enterkeyhint', campoSiguiente(campo) ? 'next' : 'done');
  campo.dataset.enterAuto = '';
}

/**
 * Enter en un campo de una hoja avanza al siguiente o, en el último, cierra
 * el teclado. Nunca envía: el envío implícito del navegador queda apagado.
 * Un área de texto conserva su salto de línea.
 *
 * @param {KeyboardEvent} e
 */
export function alPulsarEnter(e) {
  if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing || !_campoDeHoja(e.target)) return;
  e.preventDefault();
  const siguiente = campoSiguiente(e.target);
  if (siguiente) siguiente.focus();
  else e.target.blur();
}

/**
 * Engancha `visualViewport`. Se llama una vez desde bootstrap.js; sin
 * `visualViewport` (navegadores viejos) no hace nada.
 *
 * @param {VisualViewport | null} [vv]
 */
export function initTeclado(vv = window.visualViewport ?? null) {
  // Enter y su tecla valen también sin visualViewport. La marca se pone al
  // tocar el campo, antes de que el teclado se abra, y otra vez al enfocarlo.
  document.addEventListener('keydown', alPulsarEnter);
  document.addEventListener('pointerdown', (e) => marcarTeclaEnter(e.target), { capture: true, passive: true });
  document.addEventListener('focusin', (e) => marcarTeclaEnter(e.target));
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
  // Un cuadro después (MV2.28): leer `visualViewport` obliga a maquetar la
  // página en el acto, y en pleno arranque eso eran 148 ms a 4x de un layout
  // que el primer cuadro repetía. Al arrancar no hay teclado que atender.
  alCuadroSiguiente(() => aplicar());
}
