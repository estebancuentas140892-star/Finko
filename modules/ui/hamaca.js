/**
 * ui/hamaca.js - la hamaca de "Todo al día" cabe con su mensaje (INI.6b,
 * ADR 181 D2).
 *
 * El ancho lo decide el CSS (`--hamaca`, identidad.css sección 12): el 78 %
 * del ancho, hasta 300 y no menos de 160. Lo que el CSS no puede saber es
 * cuánto alto queda, porque depende de dónde termina el saldo (la letra del
 * sistema, el área segura), de cuántas líneas ocupa el mensaje y de dónde
 * empieza "Registrar". Este módulo lo mide y lo deja en `--hamaca-libre`
 * del panel: el ancho más grande con el que el dibujo, colgado del saldo, y
 * su mensaje quedan sobre "Registrar" con su aire.
 *
 * Mide sin forzar maquetación: `ResizeObserver` llama después del layout,
 * también la primera vez y cuando el panel aparece. Las posiciones salen de
 * `offsetTop` y no de `getBoundingClientRect`: la cascada de entrada de
 * Inicio desliza las celdas 8 px y ese desliz no es lugar.
 */

/** Alto sobre ancho del dibujo (`viewBox` de `tino-hamaca.svg`). */
const ALTO_SOBRE_ANCHO = 1009.14 / 918.31;

/** Lo que los ganchos pisan el saldo, en fracción del ancho (ADR 155 D2). */
const GANCHOS = 0.0347;

/** Aire entre el mensaje y el círculo de "Registrar" (tablero). */
export const AIRE_HAMACA = 12;

/**
 * El ancho más grande con el que la hamaca y su mensaje caben (pura).
 *
 * El dibujo empieza `GANCHOS` de su ancho sobre el borde del saldo y mide
 * `ALTO_SOBRE_ANCHO` de su ancho; debajo va el mensaje. Todo tiene que
 * terminar antes del tope de "Registrar" menos el aire.
 *
 * @param {{ bordeSaldo: number, mensaje: number, topeRegistrar: number }} medidas
 *   en px, con la página sin desplazar: el borde de abajo del saldo, el alto
 *   del título y el texto con sus márgenes, y el borde de arriba del círculo.
 * @returns {number} px, entero y nunca negativo.
 */
export function anchoLibreHamaca({ bordeSaldo, mensaje, topeRegistrar }) {
  const alto = topeRegistrar - AIRE_HAMACA - bordeSaldo - mensaje;
  return Math.max(0, Math.floor(alto / (ALTO_SOBRE_ANCHO - GANCHOS)));
}

/** Distancia del borde de arriba del documento, sin transformaciones. */
function _arriba(el) {
  let y = 0;
  for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
  return y;
}

/**
 * Mide y deja `--hamaca-libre` en el panel. Sin panel a la vista (escritorio,
 * días con pagos) no hace nada. Con las cuentas abiertas el saldo crece: se
 * conserva la última medida, así Tino no se achica al abrirlas.
 */
export function medirHamaca() {
  const panel = document.getElementById('panel-todo-al-dia');
  const mece  = panel?.querySelector('.todo-al-dia__mece');
  const texto = panel?.querySelector('.todo-al-dia__texto');
  const saldo = document.querySelector('#sec-dash .hero-inicio');
  const fab   = document.querySelector('.nav-item--registrar .nav-item__fab');
  if (!mece || !texto || !saldo || !fab || !mece.offsetHeight || !fab.offsetHeight) return;
  if (document.querySelector('#saldo-fichas [aria-expanded="true"]')) return;

  const ancho = anchoLibreHamaca({
    bordeSaldo: _arriba(saldo) + saldo.offsetHeight,
    mensaje: (texto.offsetTop + texto.offsetHeight) - (mece.offsetTop + mece.offsetHeight),
    // La barra es fija: su lugar en la ventana es su lugar con la página arriba.
    topeRegistrar: fab.getBoundingClientRect().top,
  });
  const valor = `${ancho}px`;
  if (panel.style.getPropertyValue('--hamaca-libre') !== valor) panel.style.setProperty('--hamaca-libre', valor);
}

/**
 * Engancha la medición. Se llama una vez desde bootstrap.js. Observa el
 * encabezado y el saldo (crecen con la letra, cambian con el ancho y con las
 * cuentas abiertas), el título y el texto (cambian de líneas, aparecen
 * cuando sale Tino) y el alto de la ventana. No observa el dibujo: lo que
 * mide no depende de su tamaño, así que medir nunca vuelve a disparar la
 * medición.
 */
export function initHamaca() {
  if (typeof ResizeObserver !== 'function') return;
  const observador = new ResizeObserver(() => medirHamaca());
  const vigilados = [
    '#sec-dash .perfil-inicio', '#sec-dash .hero-inicio',
    '#panel-todo-al-dia .todo-al-dia__titulo', '#panel-todo-al-dia .todo-al-dia__texto',
  ];
  for (const sel of vigilados) {
    const el = document.querySelector(sel);
    if (el) observador.observe(el);
  }
  window.addEventListener('resize', medirHamaca, { passive: true });
}
