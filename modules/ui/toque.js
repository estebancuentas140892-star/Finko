/**
 * toque.js - ¿el clic sobre una opción vino de un dedo o un mouse, y lo
 * quiso dar?
 *
 * Los formularios del teléfono avanzan al tocar una opción (una teja, un
 * radio) y no al elegirla con el teclado, donde se sigue con Enter. La señal
 * era `event.detail > 0`, y no alcanza: una opción vive dentro de su
 * `<label>`, el toque cae en el rótulo y el navegador le reenvía el clic al
 * `<input>`. Chrome reenvía ese clic con `detail` 1; Safari, con `detail` 0,
 * igual que el de las flechas del teclado. En un iPhone la opción quedaba
 * elegida y el formulario no avanzaba.
 *
 * Por eso se mira también el clic anterior: el del rótulo sí trae `detail`
 * mayor que 0 y llega justo antes, en la misma tarea, que el reenviado.
 *
 * TEL.1c (ADR 199 D15): avanzar al tocar se queda (ahorra un toque por paso),
 * con tres frenos para el temblor y el Parkinson. Un toque sobre una opción
 * no cuenta si cae en los primeros 350 ms de una pantalla u hoja nueva (el
 * segundo toque de un temblor caía en la pantalla siguiente y elegía otra
 * cosa), si el dedo viajó más de 10 px (rozar al desplazar elegía lo que
 * estaba debajo) o si empezó en otra opción. Los frenos son para el dedo
 * y el lápiz (`pointerType` touch o pen), donde pasan el temblor y el roce
 * al desplazar; el mouse y el teclado no los tienen: con Enter se sigue sin
 * esperar.
 */

/** Tiempo de gracia de una pantalla u hoja nueva. */
export const GRACIA_MS = 350;

/** Lo que el dedo puede moverse y que siga siendo un toque. */
export const VIAJE_PX = 10;

/** La opción (su rótulo o su radio suelto) bajo `el`, o null. */
function _opcion(el) {
  const rotulo = el?.closest?.('label');
  if (rotulo?.querySelector('input[type="radio"], input[type="checkbox"]')) return rotulo;
  return el?.matches?.('input[type="radio"], input[type="checkbox"]') ? el : null;
}

/**
 * Vigila los toques de un formulario. Se llama una vez al montarlo, antes de
 * registrar el listener que pregunta.
 *
 * @param {HTMLElement} form
 * @returns {((e: MouseEvent, input: HTMLInputElement) => boolean) & { nuevaPantalla: () => void }}
 *   true si el clic `e` sobre `input` lo hizo un dedo o un mouse, directo o a
 *   través de su rótulo. `nuevaPantalla()` se llama al mostrar cada paso: la
 *   gracia vuelve a contar desde ahí.
 */
export function vigilarToques(form) {
  /** El rótulo recién tocado, hasta que termina la tarea de ese toque. */
  let rotulo = null;
  /** Desde cuándo se ve la pantalla de ahora. */
  let desde = performance.now();
  /** Dónde y sobre qué opción empezó el último toque. */
  let inicio = null;

  form.addEventListener('pointerdown', (e) => {
    inicio = e.pointerType === 'mouse' ? null
      : { x: e.clientX, y: e.clientY, t: performance.now(), op: _opcion(e.target) };
  }, true);

  form.addEventListener('click', (e) => {
    if (!(e.detail > 0)) return;
    const op = _opcion(e.target);
    if (op && inicio) {
      const temprano = inicio.t - desde < GRACIA_MS;
      const viajo = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > VIAJE_PX;
      const otra = inicio.op !== op && !(inicio.op?.contains(op) || op.contains(inicio.op));
      if (temprano || viajo || otra) {
        // Nadie quiso este toque: no elige ni avanza.
        e.preventDefault();
        e.stopImmediatePropagation();
        inicio = null;
        return;
      }
    }
    const tocado = e.target.closest?.('label');
    if (!tocado || e.target.matches?.('input')) return;
    rotulo = tocado;
    setTimeout(() => { if (rotulo === tocado) rotulo = null; }, 0);
  }, true);

  const esToque = (e, input) => {
    if (e.detail > 0) return true;
    if (!rotulo) return false;
    return rotulo.contains(input) || (rotulo.htmlFor !== '' && rotulo.htmlFor === input.id);
  };
  esToque.nuevaPantalla = () => { desde = performance.now(); };
  return esToque;
}

/** Cuándo se envió cada formulario por última vez. */
const _envios = new WeakMap();

/** Tiempo en el que un segundo envío del mismo formulario no cuenta. */
export const UNA_VEZ_MS = 1000;

/**
 * Guardar, Crear y Pagar: un segundo toque dentro de 1 s no anota dos veces
 * (TEL.1c, ADR 199 D15). Se llama una vez desde bootstrap.js. Frena el envío
 * que llega antes del segundo cuando la hoja de ese formulario ya se está
 * cerrando (el primero guardó): un "Guardar" que falló por un campo vacío
 * deja la hoja abierta y el segundo intento sí cuenta.
 */
export function vigilarEnvios() {
  document.addEventListener('submit', (e) => {
    const form = e.target;
    const ahora = performance.now();
    const antes = _envios.get(form) ?? -Infinity;
    _envios.set(form, ahora);
    const hoja = form.closest?.('.modal-overlay');
    if (ahora - antes < UNA_VEZ_MS && hoja && !('open' in hoja.dataset)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
}
