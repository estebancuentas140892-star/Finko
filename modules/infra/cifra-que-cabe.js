/**
 * cifra-que-cabe.js - las cifras grandes caben con su ojo (TEL.1b, ADR 199
 * D9).
 *
 * A 320 px "$1.234.567" a 38 px más el ojo mide 261 y la tarjeta da 256; en
 * Inicio "$ 1.020.000" a 56 mide unos 305 y caben 288. Una cifra no baja de
 * línea, así que se achica hasta que cabe, con un mínimo: 28 en la tarjeta
 * del mes y 34 en el saldo de Inicio y en el monto que se marca. El tope lo
 * pone el CSS (la letra de 22 px o más crece como mucho 15 %).
 *
 * Cada cifra lleva `data-cabe="tarjeta|saldo|monto"`. Se mide con su valor
 * final: el saldo cuenta desde 0 al pintarse, y su número final va en
 * `data-cabe-final` del span que cuenta. El tamaño sale de una regla de tres
 * (el ancho de una cifra crece con su letra) y se afina de a 1 px: uno o dos
 * pasos, no uno por píxel. Se ajusta al pintarse (un observador de lo que
 * entra al documento, una vez por cuadro), al cambiar de sección y cuando
 * cambia el tamaño de la ventana o de la letra.
 */

const _MINIMO = { tarjeta: 28, saldo: 34, monto: 34 };
const _AIRE_OJO = 10;
/** Margen de la página en el teléfono: la cifra no llega al borde. */
const _MARGEN_PANTALLA = 16;

/** Ancho de lo escrito, aunque se salga de su caja. */
function _anchoTexto(el) {
  const r = document.createRange();
  r.selectNodeContents(el);
  return r.getBoundingClientRect().width;
}

/**
 * El ancho que la cifra tiene para ella: lo que se ve de su caja (la banda
 * del saldo sangra unos px fuera de la pantalla, así que se recorta a la
 * pantalla menos su margen), menos el ojo si va al lado.
 */
function _disponible(el) {
  const caja = el.parentElement;
  const cs = getComputedStyle(caja);
  const pl = parseFloat(cs.paddingLeft) || 0;
  const pr = parseFloat(cs.paddingRight) || 0;
  const r = caja.getBoundingClientRect();
  const pantalla = document.documentElement.clientWidth;
  const izq = Math.max(r.left + caja.clientLeft + pl, _MARGEN_PANTALLA);
  const der = Math.min(r.left + caja.clientLeft + caja.clientWidth - pr, pantalla - _MARGEN_PANTALLA);
  let ancho = der - izq;
  const ojo = el.nextElementSibling;
  if (ojo && /(^|\s|_)ojo\b|__ojo|tarjeta-ojo/.test(ojo.className) && ojo.getClientRects().length) {
    // El ojo va en la misma línea: su ancho, su aire y el espacio en blanco
    // que el HTML deja entre los dos (≈ 0,3 em de la letra de la caja).
    ancho -= ojo.getBoundingClientRect().width + _AIRE_OJO + parseFloat(cs.fontSize) * 0.3;
  }
  return ancho;
}

/** ¿La cifra no cabe? Lo escrito pasa el ancho que tiene. */
function _noCabe(el, disponible) {
  return _anchoTexto(el) > disponible + 0.5;
}

/**
 * Vuelve la cifra a su tamaño del CSS y, si no cabe, la achica hasta que
 * cabe o llega a su mínimo.
 *
 * @param {HTMLElement} el
 */
export function ajustarCifra(el) {
  if (!el?.isConnected || !el.getClientRects().length) return;
  const minimo = _MINIMO[el.dataset.cabe] ?? 28;
  // Mide con el número final, aunque el conteo vaya por la mitad.
  const contador = el.querySelector('[data-cabe-final]');
  const enCurso = contador?.textContent;
  if (contador && enCurso !== contador.dataset.cabeFinal) contador.textContent = contador.dataset.cabeFinal;
  try {
    el.style.fontSize = '';
    const tope = parseFloat(getComputedStyle(el).fontSize);
    const disponible = _disponible(el);
    const ancho = _anchoTexto(el);
    if (!(disponible > 0) || ancho <= disponible + 0.5) return;
    let fs = Math.max(minimo, Math.floor((tope * disponible) / ancho));
    el.style.fontSize = `${fs}px`;
    while (fs > minimo && _noCabe(el, disponible)) {
      fs -= 1;
      el.style.fontSize = `${fs}px`;
    }
  } finally {
    if (contador && enCurso !== contador.textContent) contador.textContent = enCurso;
  }
}

/** Ajusta todas las cifras de `raiz`. */
export function ajustarCifras(raiz = document) {
  raiz.querySelectorAll('[data-cabe]').forEach(ajustarCifra);
}

let _pendiente = false;
function _agendar() {
  if (_pendiente) return;
  _pendiente = true;
  requestAnimationFrame(() => {
    _pendiente = false;
    ajustarCifras();
  });
}

let _vigilando = false;
/**
 * Se llama una vez al arrancar: ajusta lo que entra al documento (solo
 * cuando entran elementos, no cuando cambia un texto: el conteo del saldo
 * no dispara nada), lo que aparece al cambiar de sección y lo que cambia de
 * tamaño.
 */
export function vigilarCifras() {
  if (_vigilando || typeof MutationObserver === 'undefined') return;
  _vigilando = true;
  new MutationObserver((registros) => {
    if (registros.some(r => [...r.addedNodes].some(n => n.nodeType === 1))) _agendar();
  }).observe(document.body, { childList: true, subtree: true });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(_agendar).observe(document.documentElement);
  window.addEventListener('hashchange', _agendar);
  document.fonts?.ready?.then(_agendar);
}
