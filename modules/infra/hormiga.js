/**
 * infra/hormiga.js - criterio único de "gasto hormiga" (ADR 092 D11).
 *
 * Funciones puras, sin DOM. Hasta APR.1a el umbral vivía duplicado a
 * propósito en `gastos/logic.js` (`detectarHormigas`) y `logros/logic.js`
 * (`UMBRAL_GASTO_HORMIGA`) para no importar un dominio desde otro (ADN 10).
 * Con un tercer lector (`aprende`) la duplicación deja de ser barata: el
 * criterio sube a infra y los tres lo leen de aquí.
 *
 * El criterio (GAS.11b, ADR 186 D5; reemplaza el "lo pequeño que es un
 * gusto" del ADR 147 D6) es **lo pequeño que se repite**: una compra de hasta
 * el tope que no sea un pago (de un fijo o de una deuda) y cuyo mismo
 * concepto aparezca 3 veces en 30 días. El carácter (necesidad, deseo o
 * depende, `caracterDeGasto`) es otra pregunta y no entra: un tinto diario es
 * hormiga sea necesidad o deseo, y un gusto suelto no lo es. Un jarabe o una
 * herramienta de $15.000 siguen sin inflar la cifra porque no se repiten.
 *
 * Se decide sobre todo el historial (`gastosHormiga`) y cada superficie
 * filtra su mes de ahí: una repetición que cruza el cambio de mes cuenta.
 *
 * SUS.2c: lo que el usuario contesta a "¿Fue una necesidad o un deseo?" para
 * un concepto que se repite (`preguntaHormiga`) queda en
 * `S.config.hormiga.conceptos` y manda sobre la categoría y la subcategoría
 * para lo de antes y lo de después (`aprendidosDe`, `caracterDeGasto`). Desde
 * GAS.11b dice el carácter de esos gastos, no si son hormiga.
 */

import { CARACTER_CATEGORIA_GASTO, SUBCATEGORIAS_GASTO } from '../core/constants.js';
import { hijoPorId } from './taxonomia.js';
import { naturalezaDeGasto, NATURALEZA_GASTO } from './naturaleza.js';

/** Respuestas válidas a "¿Es un gusto o una necesidad?" (ADR 147 D4). */
const _RESPUESTAS = new Set(['gusto', 'necesidad']);

/** Sin nada aprendido: siempre el mismo objeto, para no romper memoizaciones. */
const _SIN_APRENDIDOS = Object.freeze({});

/**
 * Lo que el usuario ya contestó por concepto (SUS.2c): `{ [concepto]:
 * 'gusto' | 'necesidad' }`. Devuelve el objeto guardado tal cual (su
 * identidad sirve de clave de memoización); los valores se validan al leerlos.
 *
 * @param {{ hormiga?: { conceptos?: unknown } } | undefined} config - `S.config`.
 * @returns {Readonly<Record<string, string>>}
 */
export function aprendidosDe(config) {
  const c = config?.hormiga?.conceptos;
  return c && typeof c === 'object' && !Array.isArray(c) ? c : _SIN_APRENDIDOS;
}

/**
 * El carácter de un gasto (ADR 147 D1): 'necesidad', 'gusto' o 'depende'.
 * Gana lo más específico que el gasto diga:
 *
 *   1. lo que el usuario contestó para ese gasto (`gasto.caracter`, Otros);
 *   2. lo que contestó para su concepto cuando se repitió (SUS.2c);
 *   3. su subcategoría, si declara uno propio;
 *   4. su categoría personalizada, si el usuario lo contestó al crearla;
 *   5. su categoría nativa (`CARACTER_CATEGORIA_GASTO`);
 *   6. 'depende'.
 *
 * Una subcategoría que no es de la categoría del gasto se ignora: el dato
 * pudo quedar de una edición vieja y no puede decidir por otra categoría.
 *
 * @param {{ categoria?: string, subcategoriaId?: string|null, caracter?: string|null }} gasto
 * @param {ReadonlyArray<{ nombre: string, caracter?: string|null }>} [personalizadas]
 * @param {Readonly<Record<string, string>>} [aprendidos] - `aprendidosDe(S.config)`.
 * @returns {'necesidad'|'gusto'|'depende'}
 */
export function caracterDeGasto(gasto, personalizadas = [], aprendidos = _SIN_APRENDIDOS) {
  if (_RESPUESTAS.has(gasto?.caracter)) return gasto.caracter;
  const aprendido = aprendidos?.[conceptoDeGasto(gasto)];
  if (_RESPUESTAS.has(aprendido)) return aprendido;
  const categoria = gasto?.categoria ?? '';
  const sub = hijoPorId(SUBCATEGORIAS_GASTO, gasto?.subcategoriaId);
  if (sub?.caracter && sub.categorias.includes(categoria)) return sub.caracter;
  const propia = (personalizadas ?? []).find(c => c?.nombre === categoria);
  if (_RESPUESTAS.has(propia?.caracter)) return propia.caracter;
  return CARACTER_CATEGORIA_GASTO[categoria] ?? 'depende';
}

/** Monto máximo (inclusive) de una transacción para contar como hormiga, por defecto. */
export const UMBRAL_GASTO_HORMIGA = 20_000;

/** Rango que acepta el tope configurable (APR.1b): ni tan bajo que nada cuente, ni tan alto que todo. */
export const TOPE_HORMIGA_MIN = 1_000;
export const TOPE_HORMIGA_MAX = 100_000;

/**
 * Tope vigente: el que el usuario configuró en Límites (`S.config.hormiga.tope`,
 * APR.1b) o el de por defecto si no hay uno válido.
 *
 * @param {{ hormiga?: { tope?: unknown } } | undefined} config - `S.config`.
 * @returns {number}
 */
export function topeHormiga(config) {
  const tope = Number(config?.hormiga?.tope);
  return Number.isFinite(tope) && tope >= TOPE_HORMIGA_MIN && tope <= TOPE_HORMIGA_MAX
    ? tope
    : UMBRAL_GASTO_HORMIGA;
}

/**
 * Límite mensual para lo pequeño, o `null` si el usuario no se puso uno.
 *
 * @param {{ hormiga?: { limite?: unknown } } | undefined} config - `S.config`.
 * @returns {number | null}
 */
export function limiteHormiga(config) {
  const limite = Number(config?.hormiga?.limite);
  return config?.hormiga?.limite != null && Number.isFinite(limite) && limite > 0 ? limite : null;
}

/**
 * ¿Es una compra pequeña? Monto positivo y menor o igual al tope. Es la mitad
 * del criterio: lo pequeño solo es hormiga si además se repite
 * (`gastosHormiga`).
 *
 * @param {{ monto?: unknown }} gasto
 * @param {number} [tope=UMBRAL_GASTO_HORMIGA]
 * @returns {boolean}
 */
export function esGastoPequeno(gasto, tope = UMBRAL_GASTO_HORMIGA) {
  const monto = Number(gasto?.monto);
  return Number.isFinite(monto) && monto > 0 && monto <= tope;
}

/** Cuántas veces tiene que aparecer un concepto para contar (GAS.11b: cualquier carácter). */
export const REPETICIONES_HORMIGA = 3;

/** En cuántos días (inclusive) tienen que caer esas repeticiones. */
export const VENTANA_HORMIGA_DIAS = 30;

/** 'YYYY-MM-DD' a número de día (UTC), o null. */
function _dia(fecha) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(fecha ?? ''));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86_400_000 : null;
}

/** Primera palabra de 3 o más letras, sin tildes y en singular ("Helados de mora" → "helado"). */
function _palabraClave(texto) {
  const palabras = String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(p => p.length >= 3);
  const p = palabras[0] ?? '';
  return p.length > 3 && p.endsWith('s') ? p.slice(0, -1) : p;
}

/**
 * El concepto de un gasto, lo que se cuenta al ver si se repite (ADR 147 D1):
 * su subcategoría si la tiene; si no, su categoría y la primera palabra de su
 * nota ("Restaurantes|almuerzo"); sin nota, la categoría sola.
 *
 * @param {{ categoria?: string, subcategoriaId?: string|null, nota?: string, descripcion?: string }} gasto
 * @returns {string}
 */
export function conceptoDeGasto(gasto) {
  const categoria = gasto?.categoria || 'Otros';
  const sub = hijoPorId(SUBCATEGORIAS_GASTO, gasto?.subcategoriaId);
  if (sub && sub.categorias.includes(categoria)) return `s:${sub.id}`;
  return `c:${categoria}|${_palabraClave(gasto?.nota || gasto?.descripcion)}`;
}

/**
 * Los gastos hormiga de una lista (GAS.11b, ADR 186 D5): lo pequeño que se
 * repite (`REPETICIONES_HORMIGA` del mismo concepto en `VENTANA_HORMIGA_DIAS`),
 * sin mirar el carácter. El pago de un fijo o de una deuda nunca cuenta: no
 * es una compra. `personalizadas` y `aprendidos` ya no deciden nada aquí; se
 * aceptan para no romper a quien los pasa.
 *
 * Devuelve los objetos mismos, así quien filtra un mes de la misma lista los
 * reconoce por identidad. Pasar el historial completo, no un mes: una
 * repetición que cruza el cambio de mes cuenta, y también cuentan los dos
 * primeros de una serie que se completa después.
 *
 * @param {import('../core/state.js').Gasto[]} gastos
 * @param {{ tope?: number, personalizadas?: ReadonlyArray<{ nombre: string, caracter?: string|null }>, aprendidos?: Readonly<Record<string, string>> }} [opciones]
 * @returns {Set<import('../core/state.js').Gasto>}
 */
export function gastosHormiga(gastos, { tope = UMBRAL_GASTO_HORMIGA } = {}) {
  const hormiga = new Set();
  /** @type {Map<string, { g: object, dia: number }[]>} */
  const porConcepto = new Map();
  for (const g of gastos ?? []) {
    if (!esGastoPequeno(g, tope)) continue;
    const naturaleza = naturalezaDeGasto(g);
    if (naturaleza !== NATURALEZA_GASTO.CONSUMO && naturaleza !== NATURALEZA_GASTO.CONSUMO_TARJETA) continue;
    const dia = _dia(g.fecha);
    if (dia === null) continue;
    const clave = conceptoDeGasto(g);
    const lista = porConcepto.get(clave) ?? [];
    lista.push({ g, dia });
    porConcepto.set(clave, lista);
  }

  // Un gasto cuenta si alguna racha de 3 seguidos (en el orden de las fechas)
  // que lo incluye cabe en la ventana: cualquier ventana con 3 o más que lo
  // contenga tiene una racha así adentro.
  const n = REPETICIONES_HORMIGA;
  for (const lista of porConcepto.values()) {
    if (lista.length < n) continue;
    lista.sort((a, b) => a.dia - b.dia);
    for (let i = 0; i < lista.length; i++) {
      for (let j = Math.max(0, i - n + 1); j <= i && j + n - 1 < lista.length; j++) {
        if (lista[j + n - 1].dia - lista[j].dia < VENTANA_HORMIGA_DIAS) {
          hormiga.add(lista[i].g);
          break;
        }
      }
    }
  }
  return hormiga;
}

/**
 * GAS.15e ([ADR 193](../../docs/DECISIONS/193-el-gasto-del-lienzo.md) D3):
 * si un gasto que todavía no se guarda cuenta como hormiga con el historial,
 * y cuántos del mismo concepto van en los 30 días que terminan en su fecha
 * (él incluido): "4.º tinto en 30 días". `excluirId`: el gasto que se está
 * editando, para no contarlo dos veces. Pura.
 *
 * @param {import('../core/state.js').Gasto[]} gastos - el historial.
 * @param {{ categoria: string, subcategoriaId?: string|null, monto: number, fecha: string, nota?: string, cuentaId?: string }} gasto
 * @param {{ tope?: number, excluirId?: string|null }} [opciones]
 * @returns {{ concepto: string, etiqueta: string, veces: number } | null}
 */
export function hormigaDelGasto(gastos, gasto, { tope = UMBRAL_GASTO_HORMIGA, excluirId = null } = {}) {
  const otros = (gastos ?? []).filter(g => g && (excluirId === null || g.id !== excluirId));
  const nuevo = { ...gasto, id: gasto?.id ?? '__gasto-nuevo__' };
  const todos = [...otros, nuevo];
  if (!gastosHormiga(todos, { tope }).has(nuevo)) return null;
  const concepto = conceptoDeGasto(nuevo);
  const dia = _dia(nuevo.fecha);
  const veces = todos.filter(g => {
    if (!esGastoPequeno(g, tope) || conceptoDeGasto(g) !== concepto) return false;
    const naturaleza = naturalezaDeGasto(g);
    if (naturaleza !== NATURALEZA_GASTO.CONSUMO && naturaleza !== NATURALEZA_GASTO.CONSUMO_TARJETA) return false;
    const d = _dia(g.fecha);
    return d !== null && d <= dia && dia - d < VENTANA_HORMIGA_DIAS;
  }).length;
  return { concepto, etiqueta: etiquetaConcepto(concepto), veces };
}

/**
 * Lo aprendido con una respuesta cambiada (SUS.2d): devuelve un objeto nuevo,
 * nunca muta el recibido (las memoizaciones lo usan de clave). Una respuesta
 * que no es "gusto" ni "necesidad" (null, '') olvida el concepto.
 *
 * @param {Readonly<Record<string, string>>} aprendidos
 * @param {string} concepto
 * @param {string|null} respuesta
 * @returns {Record<string, string>}
 */
export function conRespuesta(aprendidos, concepto, respuesta) {
  const nuevo = { ...(aprendidos ?? {}) };
  if (_RESPUESTAS.has(respuesta)) nuevo[concepto] = respuesta;
  else delete nuevo[concepto];
  return nuevo;
}

/**
 * El nombre de un concepto para decírselo al usuario: la subcategoría
 * ("Domicilio"), la palabra de la nota con mayúscula ("Helado") o la
 * categoría ("Restaurantes").
 * @param {string} concepto - de `conceptoDeGasto`.
 * @returns {string}
 */
export function etiquetaConcepto(concepto) {
  const c = String(concepto ?? '');
  if (c.startsWith('s:')) return hijoPorId(SUBCATEGORIAS_GASTO, c.slice(2))?.nombre ?? '';
  const [categoria = '', palabra = ''] = c.slice(2).split('|');
  return palabra ? palabra.charAt(0).toUpperCase() + palabra.slice(1) : categoria;
}

/**
 * Qué preguntarle al usuario este mes (SUS.2c, ADR 147 D1): el concepto
 * "depende" que ya cuenta como hormiga porque se repite, todavía sin
 * respuesta, que más suma en el mes. null si no hay nada que preguntar.
 *
 * @param {import('../core/state.js').Gasto[]} gastos - el historial.
 * @param {string} mesISO - `YYYY-MM`.
 * @param {{ tope?: number, personalizadas?: ReadonlyArray<{ nombre: string, caracter?: string|null }>, aprendidos?: Readonly<Record<string, string>> }} [opciones]
 * @returns {{ concepto: string, etiqueta: string, veces: number, total: number } | null}
 */
export function preguntaHormiga(gastos, mesISO, opciones = {}) {
  if (typeof mesISO !== 'string' || mesISO.length < 7) return null;
  const mes = mesISO.slice(0, 7);
  const { personalizadas = [], aprendidos = _SIN_APRENDIDOS } = opciones;
  /** @type {Map<string, { concepto: string, veces: number, total: number }>} */
  const grupos = new Map();
  for (const g of gastosHormiga(gastos, opciones)) {
    if (typeof g?.fecha !== 'string' || g.fecha.slice(0, 7) !== mes) continue;
    if (caracterDeGasto(g, personalizadas, aprendidos) !== 'depende') continue;
    const concepto = conceptoDeGasto(g);
    const grupo = grupos.get(concepto) ?? { concepto, veces: 0, total: 0 };
    grupo.veces += 1;
    grupo.total += Number(g.monto);
    grupos.set(concepto, grupo);
  }
  const mayor = [...grupos.values()].sort((a, b) => b.total - a.total)[0];
  return mayor ? { ...mayor, etiqueta: etiquetaConcepto(mayor.concepto) } : null;
}

/**
 * Resumen del gasto hormiga de un mes calendario: total, número de compras
 * y desglose por categoría, de mayor a menor.
 *
 * @param {import('../core/state.js').Gasto[]} gastos - el historial: la
 *   repetición se mira sobre todos (`gastosHormiga`), el total solo del mes.
 * @param {string} mesISO - `YYYY-MM` (o un ISO completo, se usa el prefijo).
 * @param {number} [tope=UMBRAL_GASTO_HORMIGA]
 * @param {ReadonlyArray<{ nombre: string, caracter?: string|null }>} [personalizadas]
 * @param {Readonly<Record<string, string>>} [aprendidos] - `aprendidosDe(S.config)` (SUS.2c).
 * @returns {{ total: number, cuantos: number, porCategoria: { categoria: string, total: number, cuantos: number }[] }}
 */
export function resumenHormigaMes(gastos, mesISO, tope = UMBRAL_GASTO_HORMIGA, personalizadas = [], aprendidos = _SIN_APRENDIDOS) {
  const vacio = { total: 0, cuantos: 0, porCategoria: [] };
  if (typeof mesISO !== 'string' || mesISO.length < 7) return vacio;
  const mes = mesISO.slice(0, 7);

  let total = 0;
  let cuantos = 0;
  /** @type {Map<string, { categoria: string, total: number, cuantos: number }>} */
  const grupos = new Map();
  for (const g of gastosHormiga(gastos, { tope, personalizadas, aprendidos })) {
    if (typeof g?.fecha !== 'string' || g.fecha.slice(0, 7) !== mes) continue;
    const monto = Number(g.monto);
    total += monto;
    cuantos += 1;
    const categoria = g.categoria || 'Otros';
    const grupo = grupos.get(categoria) ?? { categoria, total: 0, cuantos: 0 };
    grupo.total += monto;
    grupo.cuantos += 1;
    grupos.set(categoria, grupo);
  }

  const porCategoria = [...grupos.values()].sort((a, b) => b.total - a.total);
  return { total, cuantos, porCategoria };
}
