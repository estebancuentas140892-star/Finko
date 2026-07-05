/**
 * marcas.js - resolución de identidad de marca por nombre libre (ADR 025 D4).
 *
 * `resolverMarca(texto)` busca una marca conocida dentro de un texto escrito
 * por el usuario (nombre de un gasto fijo, una suscripción o una deuda)
 * comparando aliases normalizados por palabra o frase completa:
 * "Netflix Premium" resuelve a Netflix, pero "clarooscuro" NO resuelve a
 * Claro (sin substring agresivo: los falsos positivos se evitan con aliases
 * conservadores, ADR 025 "Consecuencias").
 *
 * Busca primero en MARCAS (marcas globales) y después en BANCOS_CO (solo
 * bancos y billeteras: una deuda "Tarjeta Bancolombia" hereda la identidad
 * del banco; Efectivo y Otro quedan fuera porque "otro" es palabra común).
 * Sin match devuelve null y el consumidor cae a su ícono de categoría o de
 * tipo: el fallback automático de la ADR.
 *
 * `tejaMarca(entrada)` renderiza la teja (ADR 025 D1): glifo oficial del
 * sprite o iniciales, sobre el color de la marca. `bancoAvatar()` de
 * bancos.js delega aquí para que exista un solo render de teja.
 *
 * Capa infra: solo importa de core. Sin DOM, sin estado.
 */

import { MARCAS, BANCOS_CO } from '../core/constants.js';

/**
 * Normaliza un texto libre para el match por alias: minúsculas, sin tildes
 * ni diacríticos, y todo lo que no sea letra o dígito colapsa a un espacio
 * ("Disney+ Premium" → "disney premium").
 *
 * @param {string} texto
 * @returns {string}
 */
export function normalizarAlias(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Candidatos de resolución precomputados al cargar el módulo: primero las
 * marcas globales (en su orden de catálogo: la primera que matchee gana),
 * después bancos y billeteras con su id normalizado como alias implícito.
 * Todos comparten la forma de teja { nombre, color, texto, iniciales, simbolo? }.
 */
const _CANDIDATOS = [
  ...MARCAS.map(m => ({ aliases: m.aliases, marca: m })),
  ...BANCOS_CO
    .filter(b => b.clase === 'banco' || b.clase === 'billetera')
    .map(b => ({
      aliases: [normalizarAlias(b.id), ...(b.aliases ?? [])],
      marca: b,
    })),
];

/**
 * Resuelve la marca mencionada en un texto libre, o null si no hay match.
 *
 * @param {string} texto - nombre escrito por el usuario (descripción, nota).
 * @returns {{ nombre?: string, id?: string, color: string, texto: string,
 *             iniciales: string, simbolo?: string } | null}
 */
export function resolverMarca(texto) {
  const t = ` ${normalizarAlias(texto)} `;
  if (t.trim() === '') return null;

  for (const c of _CANDIDATOS) {
    for (const alias of c.aliases) {
      if (t.includes(` ${alias} `)) return c.marca;
    }
  }
  return null;
}

/**
 * Devuelve el HTML de la teja de marca (ADR 025 D1): el glifo oficial del
 * sprite si la entrada tiene `simbolo`, o sus iniciales como fallback,
 * siempre sobre el color de la marca. Con entrada null devuelve la teja
 * genérica gris con "?".
 *
 * La clase es `.bank-avatar` (la teja de marca ES el avatar evolucionado de
 * MK.1): todo el CSS y los consumidores existentes siguen válidos.
 *
 * @param {{ color: string, texto: string, iniciales?: string, simbolo?: string } | null} marca
 * @returns {string} HTML del span `.bank-avatar`.
 */
export function tejaMarca(marca) {
  const color = marca?.color ?? '#6B7280';
  const texto = marca?.texto ?? '#ffffff';

  const contenido = marca?.simbolo
    ? `<svg class="icon bank-avatar__glifo"><use href="#${marca.simbolo}"/></svg>`
    : (marca?.iniciales ?? '?');

  return `<span class="bank-avatar"
               style="background:${color};color:${texto}"
               aria-hidden="true">${contenido}</span>`;
}
