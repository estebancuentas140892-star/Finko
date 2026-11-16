/**
 * fila-pago.js - las dos piezas que comparten las filas de un pago en Inicio
 * (AH.1, [ADR 150](../../docs/DECISIONS/150-estados-de-pago-y-logos-en-inicio.md)):
 * la teja que dice qué se paga y la pastilla que dice en qué estado está.
 *
 * - La teja (D2): el logo de la marca si el pago la tiene (Netflix, la
 *   "Tarjeta Bancolombia" hereda el logo del banco); sin marca, la teja de su
 *   categoría en el color de Por pagar. El tamaño lo pone quien la contiene.
 * - El estado (D1): ícono y palabra, nunca solo color. Vencido es el único
 *   con fondo fuerte; "para hoy" va en ámbar; "próximo" solo informa, en gris
 *   y sin fondo.
 *
 * Capa infra: importa de core y de sus hermanas. Sin DOM, sin estado: quien
 * llama le pasa el compromiso.
 */

import { CATEGORIA_DEUDA_ICONO, iconoDeCategoriaGasto } from '../core/constants.js';
import { esc } from './utils.js';
import { icon, tejaCategoria } from './icons.js';
import { marcaPorId, resolverMarca, tejaMarca } from './marcas.js';

/** Los tres estados de un pago y el ícono que los acompaña (D1). */
export const ICONO_ESTADO_PAGO = Object.freeze({
  vencido: 'alert',
  hoy:     'clock',
  proximo: 'agenda',
});

/**
 * La teja de un pago: la marca guardada (`marcaId`), la que menciona su
 * nombre o, sin marca, el ícono de su categoría sobre el tinte de Por pagar.
 *
 * @param {{ descripcion?: string, nota?: string, tipo?: string, categoria?: string,
 *           icono?: string, marcaId?: string|null } | null | undefined} compromiso
 * @param {string} [nombre] el nombre que dice la fila, si no hay compromiso.
 * @param {Array} [personalizadas] `S.categoriasPersonalizadas`.
 * @returns {string} HTML de `.bank-avatar` o `.cat-teja`.
 */
export function tejaDePago(compromiso, nombre = '', personalizadas = []) {
  const c = compromiso ?? {};
  const marca = (c.marcaId ? marcaPorId(c.marcaId) : null)
    ?? resolverMarca(`${c.descripcion ?? nombre ?? ''} ${c.nota ?? ''}`);
  if (marca) return tejaMarca(marca);
  const esFijo = (c.tipo ?? 'fijo') === 'fijo';
  const simbolo = c.icono
    || (esFijo
      ? (c.categoria ? iconoDeCategoriaGasto(c.categoria, personalizadas) : null)
      : CATEGORIA_DEUDA_ICONO[c.categoria]);
  return tejaCategoria(simbolo || 'i-deudas', 'compromisos');
}

/**
 * La pastilla del estado de un pago: "Venció hace 2 días", "Vence hoy",
 * "Jue 19 · en 3 días". Estado desconocido: solo el texto, sin pastilla.
 *
 * @param {'vencido'|'hoy'|'proximo'|string|null|undefined} estado
 * @param {string} texto
 * @returns {string}
 */
export function chipEstadoPago(estado, texto) {
  const glifo = ICONO_ESTADO_PAGO[estado];
  if (!glifo) return texto ? `<span class="chip-estado">${esc(texto)}</span>` : '';
  return `<span class="chip-estado chip-estado--${estado}">${icon(glifo, 'icon chip-estado__icono')}${esc(texto)}</span>`;
}
