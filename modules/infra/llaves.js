/**
 * infra/llaves.js - las llaves de Bre-B y los datos para transferir
 * (MC.19, [ADR 170](../../docs/DECISIONS/170-tus-llaves-a-un-toque.md); PAG.1,
 * [ADR 175](../../docs/DECISIONS/175-a-donde-se-paga.md)).
 *
 * Lo que comparten las llaves propias de una cuenta (Mis cuentas) y el dato
 * para pagarle a alguien (Por pagar): cómo se guarda cada tipo, su formato,
 * el rechazo de un número de tarjeta y cómo se ve. Vive en infra porque lo
 * usan dos dominios, que no se importan entre sí (ADN 10). Puro: sin DOM ni S.
 */

import { TIPOS_LLAVE } from '../core/constants.js';

/**
 * ¿Parece el número de una tarjeta? 15 o 16 dígitos (con o sin espacios o
 * guiones) que pasan la prueba de Luhn. Finko no guarda tarjetas (ADR 170 D3).
 * @param {string} texto
 * @returns {boolean}
 */
export function pareceTarjeta(texto) {
  const d = String(texto ?? '').replace(/[\s-]/g, '');
  if (!/^\d{15,16}$/.test(d)) return false;
  let suma = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    suma += n;
  }
  return suma % 10 === 0;
}

/**
 * Una llave como se guarda (ADR 170 D3): el celular solo con sus dígitos, el
 * documento sin puntos ni espacios, el correo en minúsculas; lo demás, tal
 * cual (sin los espacios de los bordes).
 * @param {string} tipo
 * @param {string} valor
 * @returns {string}
 */
export function limpiarLlave(tipo, valor) {
  const v = String(valor ?? '').trim();
  if (tipo === 'Celular') return v.replace(/[\s-]/g, '');
  if (tipo === 'Documento') return v.replace(/[.\s]/g, '');
  if (tipo === 'Correo') return v.toLowerCase();
  return v;
}

/** Lo que dice cada tipo cuando el formato no cuadra (ADR 142 D9: qué hacer). */
const _FORMATO_LLAVE = {
  'Celular':      [/^3\d{9}$/, 'El celular lleva 10 dígitos y empieza por 3. Por ejemplo: 300 123 4567'],
  'Documento':    [/^[0-9A-Za-z]{5,15}$/, 'El documento lleva de 5 a 15 números o letras, sin puntos'],
  'Correo':       [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Escribe un correo completo. Por ejemplo: nombre@correo.com'],
  'Alfanumérica': [/^@[\p{L}\p{N}]+$/u, 'La llave alfanumérica empieza por @ y sigue con letras o números. Por ejemplo: @maria123'],
};

/**
 * El error de formato de una llave ya limpia, o null si cumple (o si su tipo,
 * como Otro, no pide formato).
 * @param {string} tipo uno de `TIPOS_LLAVE`
 * @param {string} valor como se guarda (`limpiarLlave`)
 * @returns {string|null}
 */
export function errorFormatoLlave(tipo, valor) {
  const formato = _FORMATO_LLAVE[tipo];
  return formato && !formato[0].test(valor) ? `${formato[1]}.` : null;
}

/** ¿Es uno de los tipos de Bre-B? */
export const esTipoLlave = (tipo) => TIPOS_LLAVE.includes(tipo);

/**
 * Cómo se ve una llave, un número de cuenta o una referencia (ADR 170 D5): el
 * celular con espacios (`300 123 4567`), el correo, la alfanumérica y la
 * referencia completos, el documento y el número enmascarados (`•••• 4567`)
 * salvo que se pida verlo, y todo enmascarado con el ojo de la sección cerrado.
 * @param {string} tipo uno de `TIPOS_LLAVE`, 'Número de cuenta' o 'Referencia'
 * @param {string} valor como se guarda
 * @param {{ oculto?: boolean, ver?: boolean }} [opciones]
 * @returns {string}
 */
export function textoLlave(tipo, valor, { oculto = false, ver = false } = {}) {
  const v = String(valor ?? '');
  const mascara = `•••• ${v.slice(-4)}`;
  if (oculto) return mascara;
  if ((tipo === 'Documento' || tipo === 'Número de cuenta') && !ver) return mascara;
  if (tipo === 'Celular' && /^\d{10}$/.test(v)) return `${v.slice(0, 3)} ${v.slice(3, 6)} ${v.slice(6)}`;
  return v;
}

/**
 * Los datos para pagarle a alguien, en orden (PAG.1, ADR 175 D2): la llave, el
 * número de cuenta (con su entidad) y la referencia. `dato` es lo que viaja
 * en `data-dato` para copiar o ver sin poner el valor en el HTML.
 * @param {import('../core/state.js').DatosPago|null|undefined} dp
 * @returns {Array<{ dato: 'llave'|'numero'|'referencia', tipo: string, valor: string, rotulo: string }>}
 */
export function datosDePago(dp) {
  if (!dp) return [];
  const lista = [];
  if (dp.llave?.valor) lista.push({ dato: 'llave', tipo: dp.llave.tipo, valor: dp.llave.valor, rotulo: `Llave · ${dp.llave.tipo}` });
  if (dp.numeroCuenta) lista.push({ dato: 'numero', tipo: 'Número de cuenta', valor: dp.numeroCuenta, rotulo: dp.entidad ? `Cuenta · ${dp.entidad}` : 'Número de cuenta' });
  if (dp.referencia) lista.push({ dato: 'referencia', tipo: 'Referencia', valor: dp.referencia, rotulo: 'Referencia' });
  return lista;
}

/**
 * Cómo se nombra un dato de pago al copiarlo: "la llave de Martha Gómez", "la
 * referencia de EPM" (ADR 175 D2).
 * @param {'llave'|'numero'|'referencia'} dato
 * @param {string} quien el titular o, sin él, el nombre del pago
 * @returns {string}
 */
export function nombreDatoPago(dato, quien) {
  const que = dato === 'llave' ? 'la llave' : dato === 'numero' ? 'el número de cuenta' : 'la referencia';
  return quien ? `${que} de ${quien}` : que;
}
