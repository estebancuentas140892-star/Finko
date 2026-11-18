/**
 * infra/portapapeles.js - copiar un dato (MC.19, [ADR 170](../../docs/DECISIONS/170-tus-llaves-a-un-toque.md) D4).
 *
 * El primer "copiar" de la app: una llave o un número de cuenta, para pegarlo
 * en la app del banco. Usa la Clipboard API y, si el navegador no la tiene o
 * no la deja usar, el respaldo de siempre: un campo oculto, seleccionado, y
 * `document.execCommand('copy')`. Debe llamarse dentro del toque del usuario:
 * en el iPhone, la app instalada solo copia ahí.
 *
 * No muestra nada: quien llama dice el resultado con su toast.
 */

/**
 * Copia `texto` al portapapeles.
 * @param {string} texto
 * @returns {Promise<boolean>} true si se copió.
 */
export async function copiarTexto(texto) {
  const valor = String(texto ?? '');
  if (!valor) return false;
  try {
    if (globalThis.navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(valor);
      return true;
    }
  } catch {
    // Sin permiso o fuera de un contexto seguro: se prueba el respaldo.
  }
  return _copiarConCampo(valor);
}

/** El respaldo: un `<textarea>` fuera de la vista, seleccionado y copiado. */
function _copiarConCampo(valor) {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false;
  const campo = document.createElement('textarea');
  campo.value = valor;
  campo.setAttribute('readonly', '');
  campo.setAttribute('aria-hidden', 'true');
  campo.style.position = 'fixed';
  campo.style.top = '-1000px';
  campo.style.opacity = '0';
  document.body.appendChild(campo);
  const antes = document.activeElement;
  try {
    campo.select();
    campo.setSelectionRange?.(0, valor.length);
    return document.execCommand('copy') === true;
  } catch {
    return false;
  } finally {
    campo.remove();
    if (antes && typeof antes.focus === 'function') antes.focus({ preventScroll: true });
  }
}
