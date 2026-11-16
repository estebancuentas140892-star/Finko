/**
 * toque.js - ¿el clic sobre una opción vino de un dedo o un mouse?
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
 */

/**
 * Vigila los toques de un formulario. Se llama una vez al montarlo, antes de
 * registrar el listener que pregunta.
 *
 * @param {HTMLElement} form
 * @returns {(e: MouseEvent, input: HTMLInputElement) => boolean} true si el
 *   clic `e` sobre `input` lo hizo un dedo o un mouse, directo o a través de
 *   su rótulo.
 */
export function vigilarToques(form) {
  /** El rótulo recién tocado, hasta que termina la tarea de ese toque. */
  let rotulo = null;

  form.addEventListener('click', (e) => {
    if (!(e.detail > 0)) return;
    const tocado = e.target.closest?.('label');
    if (!tocado || e.target.matches?.('input')) return;
    rotulo = tocado;
    setTimeout(() => { if (rotulo === tocado) rotulo = null; }, 0);
  }, true);

  return (e, input) => {
    if (e.detail > 0) return true;
    if (!rotulo) return false;
    return rotulo.contains(input) || (rotulo.htmlFor !== '' && rotulo.htmlFor === input.id);
  };
}
