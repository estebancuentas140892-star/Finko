/**
 * teclado-finko.js - el teclado de Finko para todo lo que es dinero (ADR 142 D3).
 *
 * En el teléfono, el teclado del sistema tapaba media hoja cada vez que se
 * pedía un monto. El de Finko es parte de la pantalla, no una capa: 12
 * botones reales ("000" para los ceros y borrar con su ícono) que escriben en
 * el mismo `<input data-miles>` de siempre, con `inputmode="none"`. El campo
 * sigue aceptando foco, pegar y un teclado físico; `ui/miles.js` lo formatea
 * y el contrato `FormData` no cambia.
 *
 * La cifra va grande y debajo su lectura en palabras ("un millón quinientos
 * mil pesos"), anunciada con `aria-live`. "Usar el teclado del teléfono" deja
 * el campo con `inputmode="numeric"` para quien usa lector de pantalla o lo
 * prefiere; la elección se recuerda en `S.config.tecladoTelefono` y el mismo
 * botón la deshace ("Usar el teclado de Finko"). Registrar gasto no ofrece
 * esa salida (GAS.3, ADR 156 D4: `sistema: false`): ahí el teclado de Finko es
 * la única entrada en el teléfono, también para quien antes eligió el otro.
 *
 * Solo bajo 1024 px: en escritorio el campo es el de siempre.
 *
 * - Puras: `aplicarTecla` (qué produce cada tecla) y `montoEnPalabras`.
 * - DOM: `htmlTecladoFinko` y `montarTecladoFinko`.
 */

import { S } from '../core/state.js';
import { save } from '../core/storage.js';
import { miles, desdeMiles } from '../infra/miles.js';
import { marcarCambios } from './hojas.js';

const MQ_MOVIL = '(max-width: 1023.98px)';

/** Lo más largo que se deja escribir: $999.999.999.999. */
export const DIGITOS_MAX = 12;

// ── PURAS ────────────────────────────────────────────────────────

/**
 * Lo que queda escrito al tocar una tecla. Pura.
 *
 * - Un dígito se agrega al final; "000" agrega tres ceros. Un monto no
 *   empieza en cero: "0" y "000" sobre un campo vacío no escriben nada.
 * - "borrar" quita el último carácter.
 * - Con `decimales` (las tasas), "," agrega la coma una sola vez y después de
 *   ella caben hasta `decimales` dígitos; "0,5" sí empieza en cero.
 * - Nunca pasa de `max` dígitos enteros.
 *
 * @param {string} actual Lo escrito: solo dígitos (y una coma, con decimales).
 * @param {string} tecla '0'-'9', '000', ',' o 'borrar'.
 * @param {{ max?: number, decimales?: number }} [opciones]
 * @returns {string}
 */
export function aplicarTecla(actual, tecla, { max = DIGITOS_MAX, decimales = 0 } = {}) {
  const valor = String(actual ?? '');
  if (tecla === 'borrar') return valor.slice(0, -1);

  const [entero, fraccion] = valor.split(',');
  const conComa = valor.includes(',');

  if (tecla === ',') {
    if (!decimales || conComa) return valor;
    return (entero === '' ? '0' : entero) + ',';
  }
  if (!/^(\d|000)$/.test(tecla)) return valor;

  if (conComa) {
    const cabe = decimales - fraccion.length;
    return cabe > 0 ? valor + tecla.slice(0, cabe) : valor;
  }
  if (entero === '' && /^0+$/.test(tecla)) return valor;
  const nuevo = entero + tecla;
  return nuevo.length > max ? valor : nuevo;
}

const _UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
  'veinte', 'veintiún', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete',
  'veintiocho', 'veintinueve'];
const _DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const _CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos',
  'setecientos', 'ochocientos', 'novecientos'];

/** De 1 a 999, con "un" apocopado (se usa delante de "mil", "millones" y "pesos"). */
function _hasta999(n) {
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let texto = _CENTENAS[c];
  if (resto > 0) {
    let dos;
    if (resto < 30) dos = _UNIDADES[resto];
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      dos = _DECENAS[d] + (u ? ` y ${_UNIDADES[u]}` : '');
    }
    texto = texto ? `${texto} ${dos}` : dos;
  }
  return texto;
}

/** De 1 a 999.999. */
function _hasta999999(n) {
  const miles_ = Math.floor(n / 1000);
  const resto = n % 1000;
  const partes = [];
  if (miles_ === 1) partes.push('mil');
  else if (miles_ > 1) partes.push(`${_hasta999(miles_)} mil`);
  if (resto > 0) partes.push(_hasta999(resto));
  return partes.join(' ');
}

/**
 * Un monto en palabras, como se dice en Colombia: "un millón quinientos mil
 * pesos", "veintiún mil pesos", "un millón de pesos". Pura. Cero o un valor
 * que no es un entero positivo devuelve ''.
 *
 * @param {number} monto Pesos enteros.
 * @returns {string}
 */
export function montoEnPalabras(monto) {
  const n = Math.floor(Number(monto));
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n === 1) return 'Un peso';
  const millones = Math.floor(n / 1_000_000);
  const resto = n % 1_000_000;
  const partes = [];
  if (millones === 1) partes.push('un millón');
  else if (millones > 1) partes.push(`${_hasta999999(millones)} millones`);
  if (resto > 0) partes.push(_hasta999999(resto));
  // "un millón de pesos": con millones exactos va "de".
  const texto = partes.join(' ') + (resto === 0 ? ' de pesos' : ' pesos');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ── DOM ──────────────────────────────────────────────────────────

const _esMovil = () => window.matchMedia?.(MQ_MOVIL).matches === true;

const _TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'borrar'];

/**
 * El teclado de 12 botones. `data-sin-arrastre`: tocarlo no arrastra la hoja.
 *
 * @param {{ etiqueta?: string, sistema?: boolean }} [opciones] `sistema`:
 *   ofrece "Usar el teclado del teléfono" (por defecto, sí).
 * @returns {string}
 */
export function htmlTecladoFinko({ etiqueta = 'Teclado para escribir el monto', sistema = true } = {}) {
  const tecla = (t) => {
    if (t === 'borrar') {
      return `<button type="button" class="kp__k kp__k--suave" data-tecla="borrar" aria-label="Borrar"><svg class="icon" aria-hidden="true"><use href="#i-borrar"/></svg></button>`;
    }
    if (t === '000') return '<button type="button" class="kp__k kp__k--suave" data-tecla="000" aria-label="Tres ceros">000</button>';
    return `<button type="button" class="kp__k" data-tecla="${t}">${t}</button>`;
  };
  return `
    <div class="kp" role="group" aria-label="${etiqueta}" data-sin-arrastre>
      ${_TECLAS.map(tecla).join('')}
    </div>${sistema ? `
    <button type="button" class="kp__sistema" data-kp-sistema>Usar el teclado del teléfono</button>` : ''}`;
}

/**
 * Conecta el teclado de `raiz` con su campo. En el teléfono el campo queda
 * con `inputmode="none"` (salvo que la persona haya elegido el del sistema) y
 * cada tecla escribe en él y despacha `input`, como si se hubiera tecleado:
 * `miles.js`, los avisos del formulario y la limpieza de errores lo oyen.
 * La lectura en palabras se rehace con cada cambio, venga de donde venga.
 *
 * @param {HTMLElement} raiz Contiene `.kp` y `[data-kp-sistema]`.
 * @param {HTMLInputElement} campo El `<input data-miles>` del monto.
 * @param {HTMLElement | null} [lectura] Donde va el monto en palabras.
 * @param {{ vacio?: string, sistema?: boolean }} [opciones] `vacio`: lo que
 *   dice la lectura mientras no hay monto ("Márcalo con el teclado de abajo").
 *   `sistema: false`: el teclado de Finko siempre, sin mirar la preferencia
 *   guardada (va con `htmlTecladoFinko({ sistema: false })`).
 */
export function montarTecladoFinko(raiz, campo, lectura = null, { vacio = '', sistema = true } = {}) {
  if (!raiz || !campo) return;
  const usarSistema = () => !_esMovil() || (sistema && S.config?.tecladoTelefono === true);
  const boton = raiz.querySelector('[data-kp-sistema]');
  const aplicarModo = () => {
    const sistema = usarSistema();
    campo.inputMode = sistema ? 'numeric' : 'none';
    raiz.classList.toggle('kp-oculto', sistema);
    if (boton) boton.textContent = sistema ? 'Usar el teclado de Finko' : 'Usar el teclado del teléfono';
  };
  const leer = () => {
    if (!lectura) return;
    const palabras = montoEnPalabras(desdeMiles(campo.value) ?? 0);
    lectura.textContent = palabras || vacio;
    lectura.classList.toggle('pmonto__lee--vacia', !palabras);
  };

  raiz.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-tecla]');
    if (boton) {
      const digitos = String(desdeMiles(campo.value) ?? '');
      const nuevo = aplicarTecla(digitos, boton.dataset.tecla);
      campo.value = nuevo ? miles(Number(nuevo)) : '';
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      if (e.isTrusted) marcarCambios(campo);
      return;
    }
    if (e.target.closest('[data-kp-sistema]')) {
      S.config.tecladoTelefono = S.config.tecladoTelefono !== true;
      save();
      aplicarModo();
      if (usarSistema()) campo.focus();
    }
  });
  campo.addEventListener('input', leer);
  aplicarModo();
  leer();
}
