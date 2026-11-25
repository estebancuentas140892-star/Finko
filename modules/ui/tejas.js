/**
 * tejas.js - la columna de una rejilla de tejas no baja de su palabra más
 * larga (TEL.1b, ADR 199 D6).
 *
 * Las empresas del gasto fijo y las entidades de una deuda van en columnas
 * de al menos 4,5 rem. Con 4,5 rem caben cuatro a 360 px, pero "Bancolombia"
 * (77,4 px) y "Paramount+" (73) no caben en una columna de 73: la palabra se
 * salía. El CSS no sabe medir la palabra más larga de una lista, así que se
 * mide aquí y se pasa en `--palabra-larga`; la rejilla hace el resto
 * (`repeat(auto-fill, minmax(max(4.5rem, var(--palabra-larga)), 1fr))`).
 *
 * Se mide cuando la rejilla aparece o cambia de ancho (la letra del sistema
 * cambia el ancho de cada palabra): un solo ResizeObserver para todas.
 */

const _vigiladas = new WeakSet();
let _observador = null;
let _lienzo;

/**
 * Mide la palabra más ancha de los nombres de una rejilla y la deja en su
 * `--palabra-larga` (más 3 px de aire). Mide con la letra de cada nombre en
 * un lienzo (`measureText`): sin tocar el documento ni forzar un reflujo por
 * palabra, que con cuarenta nombres demoraba la pantalla.
 *
 * @param {HTMLElement} lista La rejilla, con `data-tejas` = selector del nombre.
 */
export function medirPalabraLarga(lista) {
  _lienzo ??= document.createElement('canvas').getContext?.('2d') ?? null;
  if (!_lienzo) return;
  const selector = lista.dataset.tejas || '.teja__nombre';
  let max = 0;
  let fuente = '';
  for (const nombre of lista.querySelectorAll(selector)) {
    const cs = getComputedStyle(nombre);
    const f = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if (f !== fuente) { _lienzo.font = f; fuente = f; }
    const espacio = parseFloat(cs.letterSpacing) || 0;
    for (const palabra of nombre.textContent.split(/\s+/).filter(Boolean)) {
      max = Math.max(max, _lienzo.measureText(palabra).width + espacio * palabra.length);
    }
  }
  if (max > 0) lista.style.setProperty('--palabra-larga', `${Math.ceil(max + 3)}px`);
}

/**
 * Mide ya las rejillas `[data-tejas]` de `raiz` que se ven. Se llama al
 * mostrar una pregunta, antes de que se pinte: así la rejilla no se ve un
 * cuadro con cuatro columnas y luego se reacomoda.
 *
 * @param {ParentNode} raiz
 */
export function medirTejas(raiz) {
  for (const lista of raiz.querySelectorAll('[data-tejas]')) {
    if (lista.getClientRects().length) medirPalabraLarga(lista);
  }
}

/**
 * Vigila las rejillas `[data-tejas]` de `raiz`: cada una se mide al verse
 * y al cambiar de ancho. Llamarla de nuevo sobre la misma raíz no repite.
 *
 * @param {ParentNode} raiz
 */
export function vigilarTejas(raiz) {
  if (typeof ResizeObserver === 'undefined') return;
  _observador ??= new ResizeObserver((entradas) => {
    for (const e of entradas) if (e.contentRect.width > 0) medirPalabraLarga(e.target);
  });
  for (const lista of raiz.querySelectorAll('[data-tejas]')) {
    if (_vigiladas.has(lista)) continue;
    _vigiladas.add(lista);
    _observador.observe(lista);
  }
}
