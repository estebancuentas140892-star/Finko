/**
 * movimientos/filtros.js - el buscador que entiende criterios y la hoja de
 * filtros de Movimientos (MOV.4, [ADR 200](../../../docs/DECISIONS/200-movimientos-buscar-y-filtrar.md)).
 *
 * Ocho criterios en cuatro grupos (cuándo, qué, dónde y con quién, cuánto),
 * más el texto del buscador, que se suma como uno más. Y entre criterios, o
 * dentro de uno: "Bancolombia o Nequi" y "noviembre" y "Suscripciones".
 *
 * Puro: no lee `S` ni el DOM. Recibe los movimientos ya derivados por
 * `logic.js` y lo que hace falta para nombrarlos (cuentas, compromisos).
 * Ningún dominio importa a otro (ADN 10): el catálogo de marcas y los
 * vencimientos salen de `infra/`.
 */

import { SUBCATEGORIAS_GASTO } from '../../core/constants.js';
import { marcaPorId, resolverMarca } from '../../infra/marcas.js';
import { vencimientoDeCadaPago } from '../../infra/vencimientos.js';
import { f as plata } from '../../infra/utils.js';
import { claseMovimiento, descripcionMovimiento } from './logic.js';

// ── LOS TIPOS EN OCHO GRUPOS (D3) ───────────────────────────────

/**
 * Los grupos de tipo, en el orden de la hoja: clave, nombre en la hoja,
 * nombre corto (chip y sugerencia), dominio de su teja e ícono.
 * Metas y ahorro van juntos ("Ahorro y metas"); el gasto fijo se separa de
 * la deuda (ADR 200 D3, reemplaza los chips del ADR 105 D1 y D2).
 */
export const GRUPOS_TIPO = Object.freeze([
  { clave: 'gastos',         nombre: 'Gastos del día a día', corto: 'Día a día',      dom: 'gastos',      icono: 'i-gastos' },
  { clave: 'fijos',          nombre: 'Gastos fijos',         corto: 'Gastos fijos',   dom: 'agenda',      icono: 'i-recurring' },
  { clave: 'deudas',         nombre: 'Pagos de deudas',      corto: 'Deudas',         dom: 'compromisos', icono: 'i-deudas' },
  { clave: 'ingresos',       nombre: 'Ingresos',             corto: 'Ingresos',       dom: 'ingresos',    icono: 'i-saldo' },
  { clave: 'transferencias', nombre: 'Transferencias',       corto: 'Transferencias', dom: 'tesoreria',   icono: 'i-transferencia' },
  { clave: 'ahorro',         nombre: 'Ahorro y metas',       corto: 'Ahorro y metas', dom: 'ahorro',      icono: 'i-ahorro' },
  { clave: 'personales',     nombre: 'Me deben',             corto: 'Me deben',       dom: 'personales',  icono: 'i-personales' },
  { clave: 'ajustes',        nombre: 'Ajustes de saldo',     corto: 'Ajustes',        dom: 'neutro',      icono: 'i-saldo' },
]);

const _GRUPO = Object.fromEntries(GRUPOS_TIPO.map(g => [g.clave, g]));

/** @param {string} clave */
export function grupoPorClave(clave) { return _GRUPO[clave] ?? null; }

/**
 * El grupo de tipo de un movimiento: la clase de GAS.11a con metas dentro de
 * ahorro. Las llegadas que mandan `dominio: 'metas'` caen en ahorro.
 * @param {object} m
 * @returns {string}
 */
export function grupoMovimiento(m) {
  const c = claseMovimiento(m);
  return c === 'metas' ? 'ahorro' : c;
}

/** Los criterios en el orden de la hoja y de la fila de activos (S1, 6). */
export const CRITERIOS = Object.freeze(['periodo', 'tipos', 'categorias', 'estado', 'cuentas', 'empresas', 'personas', 'valor']);

/** Los estados de un pago de fijo o deuda (D6). */
export const ESTADOS = Object.freeze([
  ['a-tiempo', 'A tiempo'],
  ['atraso', 'Con atraso'],
  ['parcial', 'Abono parcial'],
]);
const _ESTADO = Object.fromEntries(ESTADOS);

/** Los atajos de valor (S2): un atajo llena Desde y Hasta. */
export const ATAJOS_VALOR = Object.freeze([
  { clave: 'menos-50', nombre: 'Menos de $50.000', min: null, max: 49_999 },
  { clave: '50-200', nombre: '$50.000 a $200.000', min: 50_000, max: 200_000 },
  { clave: 'mas-200', nombre: 'Más de $200.000', min: 200_001, max: null },
]);

/** Los atajos de periodo (M05), dos columnas, ninguno de más de 16 letras. */
export const ATAJOS_PERIODO = Object.freeze([
  ['hoy', 'Hoy'],
  ['semana', 'Esta semana'],
  ['mes', 'Este mes'],
  ['mes-pasado', 'Mes pasado'],
  ['30-dias', 'Últimos 30 días'],
  ['anio', 'Este año'],
]);
const _ATAJO_PERIODO = Object.fromEntries(ATAJOS_PERIODO);

const _MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const _MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// ── EL ESTADO DE LOS FILTROS ────────────────────────────────────

/**
 * @typedef {Object} FiltrosMov
 * @property {string} texto
 * @property {{ atajo: string|null, desde: string, hasta: string } | null} periodo
 * @property {string[]} tipos          Claves de `GRUPOS_TIPO`.
 * @property {string[]} categorias     Categorías enteras (todas sus subcategorías).
 * @property {string[]} subcategorias  Ids sueltos (la categoría queda "parcial").
 * @property {string|null} estado      Clave de `ESTADOS`.
 * @property {string[]} cuentas        Ids de cuenta.
 * @property {'cualquiera'|'salio'|'llego'} sentido
 * @property {string[]} empresas
 * @property {string[]} personas
 * @property {{ min: number|null, max: number|null, atajo: string|null } | null} valor
 * @property {string|null} compromisoId Los pagos de un fijo o una deuda (GAS.14c).
 */

/** @returns {FiltrosMov} */
export function filtrosVacios() {
  return {
    texto: '', periodo: null, tipos: [], categorias: [], subcategorias: [], estado: null,
    cuentas: [], sentido: 'cualquiera', empresas: [], personas: [], valor: null, compromisoId: null,
  };
}

/**
 * ¿El criterio tiene algo elegido? `compromiso` es el filtro de llegada de
 * GAS.14c, sin fila propia en la hoja.
 * @param {FiltrosMov} f
 * @param {string} clave
 */
export function criterioActivo(f, clave) {
  switch (clave) {
    case 'periodo':    return Boolean(f.periodo && (f.periodo.desde || f.periodo.hasta));
    case 'tipos':      return f.tipos.length > 0;
    case 'categorias': return f.categorias.length > 0 || f.subcategorias.length > 0;
    case 'estado':     return Boolean(f.estado);
    case 'cuentas':    return f.cuentas.length > 0;
    case 'empresas':   return f.empresas.length > 0;
    case 'personas':   return f.personas.length > 0;
    case 'valor':      return Boolean(f.valor && (f.valor.min != null || f.valor.max != null));
    case 'compromiso': return Boolean(f.compromisoId);
    case 'texto':      return Boolean(String(f.texto ?? '').trim());
    default:           return false;
  }
}

/** Los criterios puestos, en su orden. El compromiso va tras la categoría. */
export function criteriosActivos(f) {
  const orden = ['periodo', 'tipos', 'categorias', 'compromiso', 'estado', 'cuentas', 'empresas', 'personas', 'valor'];
  return orden.filter(c => criterioActivo(f, c));
}

/**
 * Cuántos filtros hay, para la insignia del botón: el texto del buscador no
 * suma, solo los criterios (S1, 2).
 */
export function cuantosFiltros(f) {
  return criteriosActivos(f).length;
}

/**
 * Los filtros sin un criterio. Pura: devuelve otro objeto.
 * @param {FiltrosMov} f
 * @param {string} clave
 * @returns {FiltrosMov}
 */
export function sinCriterio(f, clave) {
  const v = filtrosVacios();
  const out = { ...f };
  switch (clave) {
    case 'periodo':    out.periodo = null; break;
    case 'tipos':      out.tipos = []; break;
    case 'categorias': out.categorias = []; out.subcategorias = []; break;
    case 'estado':     out.estado = null; break;
    case 'cuentas':    out.cuentas = []; out.sentido = v.sentido; break;
    case 'empresas':   out.empresas = []; break;
    case 'personas':   out.personas = []; break;
    case 'valor':      out.valor = null; break;
    case 'compromiso': out.compromisoId = null; break;
    case 'texto':      out.texto = ''; break;
    default: break;
  }
  return out;
}

/** Todos los criterios fuera; el texto del buscador se queda (no es un filtro). */
export function sinCriterios(f) {
  return { ...filtrosVacios(), texto: f.texto };
}

/** Alterna un valor en una lista (selección múltiple). Pura. */
export function alternar(lista, valor) {
  return lista.includes(valor) ? lista.filter(x => x !== valor) : [...lista, valor];
}

// ── FECHAS ──────────────────────────────────────────────────────

function _iso(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())}`;
}

function _fecha(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
}

/** Último día del mes de `prefijo` ('YYYY-MM'). */
function _finDeMes(prefijo) {
  const [a, m] = prefijo.split('-').map(Number);
  return _iso(new Date(Date.UTC(a, m, 0)));
}

/**
 * Desde y hasta de un atajo de periodo (S2: la semana de lunes a domingo, el
 * mes del 1 al último día, "Últimos 30 días" incluye hoy) o de un mes del
 * buscador ('mes:YYYY-MM').
 *
 * @param {string} atajo
 * @param {string} hoyISO
 * @returns {{ desde: string, hasta: string } | null}
 */
export function rangoDeAtajo(atajo, hoyISO) {
  const hoy = _fecha(hoyISO);
  const mes = /^mes:(\d{4}-\d{2})$/.exec(String(atajo ?? ''));
  if (mes) return { desde: `${mes[1]}-01`, hasta: _finDeMes(mes[1]) };
  if (!hoy) return null;
  const a = hoy.getUTCFullYear();
  const m = hoy.getUTCMonth();
  switch (atajo) {
    case 'hoy': return { desde: hoyISO, hasta: hoyISO };
    case 'semana': {
      const dow = (hoy.getUTCDay() + 6) % 7; // lunes = 0
      const lunes = new Date(Date.UTC(a, m, hoy.getUTCDate() - dow));
      const domingo = new Date(Date.UTC(a, m, hoy.getUTCDate() - dow + 6));
      return { desde: _iso(lunes), hasta: _iso(domingo) };
    }
    case 'mes': return { desde: _iso(new Date(Date.UTC(a, m, 1))), hasta: _iso(new Date(Date.UTC(a, m + 1, 0))) };
    case 'mes-pasado': return { desde: _iso(new Date(Date.UTC(a, m - 1, 1))), hasta: _iso(new Date(Date.UTC(a, m, 0))) };
    case '30-dias': return { desde: _iso(new Date(Date.UTC(a, m, hoy.getUTCDate() - 29))), hasta: hoyISO };
    case 'anio': return { desde: `${a}-01-01`, hasta: `${a}-12-31` };
    default: return null;
  }
}

/**
 * El periodo de una llegada (`movimientos:ver`): un mes entero (o del 1 a
 * hoy) se nombra como mes; lo demás, como fechas.
 * @param {string} desde
 * @param {string} hasta
 * @param {string} hoyISO
 */
export function periodoDeRango(desde, hasta, hoyISO) {
  if (!desde && !hasta) return null;
  if (desde && hasta && desde.endsWith('-01') && desde.slice(0, 7) === hasta.slice(0, 7)
      && (hasta === _finDeMes(desde.slice(0, 7)) || hasta === hoyISO)) {
    return { atajo: `mes:${desde.slice(0, 7)}`, desde, hasta: _finDeMes(desde.slice(0, 7)) };
  }
  return { atajo: null, desde: desde || '', hasta: hasta || '' };
}

function _nombreMes(prefijo, hoyISO) {
  const [a, m] = prefijo.split('-').map(Number);
  const nombre = _MESES[m - 1];
  const cap = nombre.charAt(0).toUpperCase() + nombre.slice(1);
  return String(a) === String(hoyISO).slice(0, 4) ? cap : `${cap} de ${a}`;
}

function _diaCorto(iso, hoyISO, conAnio) {
  const d = _fecha(iso);
  if (!d) return '';
  const base = `${d.getUTCDate()} ${_MESES_CORTOS[d.getUTCMonth()]}`;
  return conAnio || iso.slice(0, 4) !== String(hoyISO).slice(0, 4) ? `${base} ${iso.slice(0, 4)}` : base;
}

/**
 * Lo que dice el chip del periodo (S1, 6): "Noviembre", "16 al 22 nov",
 * "Últimos 30 días".
 * @param {FiltrosMov['periodo']} p
 * @param {string} hoyISO
 */
export function textoPeriodo(p, hoyISO) {
  if (!p) return '';
  const mes = /^mes:(\d{4}-\d{2})$/.exec(p.atajo ?? '');
  if (mes) return _nombreMes(mes[1], hoyISO);
  if (p.atajo === 'mes' || p.atajo === 'mes-pasado') return _nombreMes(p.desde.slice(0, 7), hoyISO);
  if (p.atajo && _ATAJO_PERIODO[p.atajo]) return _ATAJO_PERIODO[p.atajo];
  if (p.desde && p.hasta) {
    if (p.desde === p.hasta) return _diaCorto(p.desde, hoyISO);
    const mismoMes = p.desde.slice(0, 7) === p.hasta.slice(0, 7);
    const ini = mismoMes ? String(_fecha(p.desde).getUTCDate()) : _diaCorto(p.desde, hoyISO);
    return `${ini} al ${_diaCorto(p.hasta, hoyISO)}`;
  }
  if (p.desde) return `Desde ${_diaCorto(p.desde, hoyISO)}`;
  return `Hasta ${_diaCorto(p.hasta, hoyISO)}`;
}

/** Una fecha para el campo Desde o Hasta de la hoja: "1 nov 2026". */
export function fechaLarga(iso) {
  return _diaCorto(iso, '', true);
}

// ── PREPARAR LOS MOVIMIENTOS (D5) ───────────────────────────────

/** Minúsculas y sin tildes. */
export function plano(texto) {
  return String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Un monto escrito: "45000", "45.000" y "$45.000" son lo mismo. null si el
 * texto no es solo un número.
 * @param {string} texto
 * @returns {number|null}
 */
export function montoDeTexto(texto) {
  const t = String(texto ?? '').replace(/[\s$]/g, '');
  if (!/^(\d{1,3}(\.\d{3})+|\d+)$/.test(t)) return null;
  const n = Number(t.replace(/\./g, ''));
  return n > 0 ? n : null;
}

/**
 * Suma a cada movimiento lo que los criterios necesitan y hoy no trae
 * (S2, "Origen de cada criterio"): el grupo de tipo, la categoría que se
 * filtra (la del gasto, o la del fijo o la deuda que paga), la empresa o
 * entidad, la persona, el estado de un pago y el texto donde se busca.
 *
 * Pura: devuelve objetos nuevos y no toca los de entrada (vienen memoizados).
 *
 * @param {object[]} movimientos
 * @param {{ compromisos?: object[], gastos?: object[], cuentas?: Array<{id:string,nombre:string}> }} fuentes
 * @returns {object[]}
 */
export function prepararMovimientos(movimientos, { compromisos = [], gastos = [], cuentas = [] } = {}) {
  const porId = new Map((compromisos ?? []).filter(c => c?.id).map(c => [c.id, c]));
  const nombreCuenta = new Map((cuentas ?? []).map(c => [c.id, c.nombre]));
  const estados = _estadosDePagos(movimientos, porId, gastos);

  return (movimientos ?? []).map(m => {
    const grupo = grupoMovimiento(m);
    const c = m.compromisoId ? porId.get(m.compromisoId) : null;
    let categoriaFiltro = null;
    let empresa = null;
    let marcaId = null;
    let persona = m.persona ?? null;
    if (grupo === 'gastos' && m.tipo === 'gasto') {
      categoriaFiltro = m.categoria ?? null;
    } else if (grupo === 'fijos' && c) {
      categoriaFiltro = c.categoria ?? null;
      const marca = marcaPorId(c.marcaId) ?? resolverMarca(c.descripcion);
      if (marca) { empresa = marca.nombre; marcaId = marca.id; }
    } else if (grupo === 'deudas' && c) {
      categoriaFiltro = c.categoria ?? null;
      const nombre = String(c.descripcion ?? '').trim() || null;
      if (c.tipo === 'deuda-personal') persona = nombre;
      else {
        const marca = marcaPorId(c.marcaId) ?? resolverMarca(c.descripcion);
        empresa = marca?.nombre ?? nombre;
        marcaId = marca?.id ?? null;
      }
    }
    const estado = m.tipo === 'gasto' ? (estados.get(m.id) ?? null) : null;
    const cuentasDelMov = [m.cuentaId, m.cuentaOrigenId, m.cuentaDestinoId].filter(Boolean).map(id => nombreCuenta.get(id));
    const texto = plano([
      descripcionMovimiento(m, cuentas), m.categoria, m.subcategoria, categoriaFiltro, m.categoriaIngreso, m.nota,
      ...cuentasDelMov, empresa, persona,
    ].filter(Boolean).join(' \u0001 '));
    return { ...m, grupo, categoriaFiltro, empresa, marcaId, persona, estado, texto };
  });
}

/** El estado de cada pago de fijo o deuda, por id de gasto (D6). */
function _estadosDePagos(movimientos, porId, gastos) {
  const out = new Map();
  const ids = new Set();
  for (const m of movimientos ?? []) {
    if (m?.tipo === 'gasto' && m.compromisoId) {
      const g = grupoMovimiento(m);
      if (g === 'fijos' || g === 'deudas') ids.add(m.compromisoId);
    }
  }
  for (const id of ids) {
    const c = porId.get(id);
    if (!c) continue;
    const fijo = c.tipo === 'fijo';
    const cuota = Number(fijo ? c.monto : c.cuotaMensual) || 0;
    const pagos = vencimientoDeCadaPago(c, gastos, { cuota, parcialCubre: fijo });
    for (const [gid, p] of pagos) {
      out.set(gid, p.parcial ? 'parcial' : p.vence && p.fecha > p.vence ? 'atraso' : 'a-tiempo');
    }
  }
  return out;
}

// ── APLICAR LOS FILTROS ─────────────────────────────────────────

function _deLaCuenta(m, ids, sentido) {
  const en = (id) => Boolean(id) && ids.includes(id);
  if (sentido === 'salio') {
    if (m.tipo === 'transferencia') return en(m.cuentaOrigenId);
    if (m.tipo === 'aporte-meta' || m.tipo === 'aporte-reserva') return en(m.cuentaId);
    return m.direccion === 'egreso' && en(m.cuentaId);
  }
  if (sentido === 'llego') {
    if (m.tipo === 'transferencia') return en(m.cuentaDestinoId);
    return m.direccion === 'ingreso' && en(m.cuentaId);
  }
  // Cualquiera: la transferencia cuenta para sus dos cuentas (ADR 089 D3).
  return en(m.cuentaId) || en(m.cuentaOrigenId) || en(m.cuentaDestinoId);
}

/**
 * El predicado de un criterio, o null si no está puesto.
 * @param {FiltrosMov} f
 * @param {string} clave
 */
function _predicado(f, clave) {
  if (!criterioActivo(f, clave)) return null;
  switch (clave) {
    case 'periodo': {
      const { desde, hasta } = f.periodo;
      return m => (!desde || m.fecha >= desde) && (!hasta || m.fecha <= hasta);
    }
    case 'tipos': return m => f.tipos.includes(m.grupo ?? grupoMovimiento(m));
    case 'categorias':
      return m => (m.categoriaFiltro != null && f.categorias.includes(m.categoriaFiltro))
        || (m.subcategoriaId != null && f.subcategorias.includes(m.subcategoriaId));
    case 'estado': return m => m.estado === f.estado;
    case 'cuentas': return m => _deLaCuenta(m, f.cuentas, f.sentido);
    case 'empresas': return m => m.empresa != null && f.empresas.includes(m.empresa);
    case 'personas': return m => m.persona != null && f.personas.includes(m.persona);
    case 'valor': {
      const { min, max } = f.valor;
      return m => {
        const n = Number(m.monto) || 0;
        return (min == null || n >= min) && (max == null || n <= max);
      };
    }
    // GAS.14c (ADR 189 D3): los pagos (gastos) de un fijo o una deuda.
    case 'compromiso': return m => m.tipo === 'gasto' && m.compromisoId === f.compromisoId;
    case 'texto': return _predicadoTexto(f.texto);
    default: return null;
  }
}

/** El texto busca en todo lo que la fila dice; un número busca además el monto (S2). */
function _predicadoTexto(texto) {
  const q = plano(String(texto ?? '').trim());
  if (!q) return null;
  const monto = montoDeTexto(texto);
  return m => (m.texto ?? '').includes(q) || (monto != null && Number(m.monto) === monto);
}

const _TODOS = ['periodo', 'tipos', 'categorias', 'compromiso', 'estado', 'cuentas', 'empresas', 'personas', 'valor', 'texto'];

/**
 * Los movimientos que pasan los filtros. Sobre la fuente ya derivada, antes
 * de agrupar y paginar (MOV.2): es también lo que baja "Descargar para Excel".
 *
 * @param {object[]} movimientos  Preparados (`prepararMovimientos`).
 * @param {FiltrosMov} f
 * @param {{ sin?: string|null }} [opciones] `sin`: un criterio que no se
 *   aplica (los conteos de su propia lista).
 */
export function aplicarFiltros(movimientos, f, { sin = null } = {}) {
  const preds = _TODOS.filter(c => c !== sin).map(c => _predicado(f, c)).filter(Boolean);
  const lista = Array.isArray(movimientos) ? movimientos : [];
  if (preds.length === 0) return lista;
  return lista.filter(m => preds.every(p => p(m)));
}

/**
 * Lo que suman unos movimientos (lo que entró y lo que salió). Una
 * transferencia o un aporte (`neutro`) no suman a ningún lado.
 */
export function sumas(movimientos) {
  let entra = 0;
  let sale = 0;
  for (const m of movimientos ?? []) {
    const n = Number(m.monto) || 0;
    if (m.direccion === 'ingreso') entra += n;
    else if (m.direccion === 'egreso') sale += n;
  }
  return { entra, sale };
}

// ── LAS OPCIONES DE CADA CRITERIO, CON SU CONTEO (S1, 9) ────────

function _contar(lista, clave) {
  const c = new Map();
  for (const m of lista) {
    const v = clave(m);
    if (v == null) continue;
    c.set(v, (c.get(v) ?? 0) + 1);
  }
  return c;
}

/**
 * Las opciones de un criterio, sacadas de todo el historial (nunca una que
 * no tenga movimientos), cada una con cuántos quedarían si se elige, con lo
 * demás ya puesto (S2, "Conteos").
 *
 * @param {object[]} movimientos Preparados.
 * @param {FiltrosMov} f
 * @param {'tipos'|'categorias'|'estado'|'cuentas'|'empresas'|'personas'} clave
 * @param {{ cuentas?: Array<{id:string,nombre:string}> }} [ctx]
 * @returns {Array<{ valor: string, nombre: string, n: number, subs?: Array<{ valor: string, nombre: string, n: number }>, extra?: object }>}
 */
export function opcionesDe(movimientos, f, clave, { cuentas = [] } = {}) {
  const todos = movimientos ?? [];
  const base = aplicarFiltros(todos, f, { sin: clave });
  switch (clave) {
    case 'tipos': {
      const hay = new Set(todos.map(m => m.grupo));
      const n = _contar(base, m => m.grupo);
      return GRUPOS_TIPO.filter(g => hay.has(g.clave))
        .map(g => ({ valor: g.clave, nombre: g.nombre, n: n.get(g.clave) ?? 0, extra: g }));
    }
    case 'categorias': {
      const usos = _contar(todos, m => m.categoriaFiltro);
      const n = _contar(base, m => m.categoriaFiltro);
      const nSub = _contar(base, m => m.subcategoriaId);
      const subsHay = new Set(todos.map(m => m.subcategoriaId).filter(Boolean));
      return [...usos.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
        .map(([cat]) => ({
          valor: cat, nombre: cat, n: n.get(cat) ?? 0,
          subs: SUBCATEGORIAS_GASTO
            .filter(s => s.categorias.includes(cat) && subsHay.has(s.id))
            .map(s => ({ valor: s.id, nombre: s.nombre, n: nSub.get(s.id) ?? 0 })),
        }));
    }
    case 'estado': {
      const n = _contar(base, m => m.estado);
      return ESTADOS.map(([valor, nombre]) => ({ valor, nombre, n: n.get(valor) ?? 0 }));
    }
    case 'cuentas': {
      const hay = new Set(todos.flatMap(m => [m.cuentaId, m.cuentaOrigenId, m.cuentaDestinoId]).filter(Boolean));
      return (cuentas ?? []).filter(c => hay.has(c.id))
        .map(c => ({
          valor: c.id, nombre: c.nombre,
          n: base.filter(m => _deLaCuenta(m, [c.id], f.sentido)).length,
          extra: c,
        }))
        .sort((a, b) => b.n - a.n || String(a.nombre).localeCompare(String(b.nombre), 'es'));
    }
    case 'empresas':
    case 'personas': {
      const campo = clave === 'empresas' ? 'empresa' : 'persona';
      const usos = _contar(todos, m => m[campo]);
      const n = _contar(base, m => m[campo]);
      const origen = new Map();
      for (const m of todos) if (m[campo] && !origen.has(m[campo])) origen.set(m[campo], m);
      return [...usos.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
        .map(([nombre]) => ({ valor: nombre, nombre, n: n.get(nombre) ?? 0, extra: origen.get(nombre) }));
    }
    default: return [];
  }
}

/** Cuántos quedan si se elige un atajo de periodo (con lo demás puesto). */
export function conteoPeriodo(movimientos, f, atajo, hoyISO) {
  const r = rangoDeAtajo(atajo, hoyISO);
  if (!r) return 0;
  return aplicarFiltros(movimientos, { ...f, periodo: { atajo, ...r } }).length;
}

/** Cuántos quedan con un atajo de valor (con lo demás puesto). */
export function conteoValor(movimientos, f, atajo) {
  const a = ATAJOS_VALOR.find(x => x.clave === atajo);
  if (!a) return 0;
  return aplicarFiltros(movimientos, { ...f, valor: { min: a.min, max: a.max, atajo } }).length;
}

// ── LO QUE DICE CADA CRITERIO (fila de la hoja y chip) ─────────

function _plural(n, uno, varios) {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** "$50.000 a $200.000", "Más de $200.000", "Desde $50.000". */
export function textoValor(v) {
  if (!v) return '';
  const atajo = ATAJOS_VALOR.find(a => a.clave === v.atajo);
  if (atajo) return atajo.nombre;
  if (v.min != null && v.max != null) return v.min === v.max ? plata(v.min) : `${plata(v.min)} a ${plata(v.max)}`;
  if (v.min != null) return `Desde ${plata(v.min)}`;
  return `Hasta ${plata(v.max)}`;
}

/**
 * Lo que dice un criterio puesto: el chip de la fila de activos y el valor
 * de su fila en la hoja (S1, 6). '' si no está puesto.
 *
 * @param {FiltrosMov} f
 * @param {string} clave
 * @param {{ hoyISO: string, cuentas?: Array<{id:string,nombre:string}>, compromisos?: object[] }} ctx
 */
export function textoCriterio(f, clave, { hoyISO, cuentas = [], compromisos = [] }) {
  if (!criterioActivo(f, clave)) return '';
  const nombreCuenta = (id) => (cuentas ?? []).find(c => c.id === id)?.nombre ?? 'Cuenta eliminada';
  switch (clave) {
    case 'periodo': return textoPeriodo(f.periodo, hoyISO);
    case 'tipos':
      return f.tipos.length === 1 ? (grupoPorClave(f.tipos[0])?.corto ?? f.tipos[0]) : _plural(f.tipos.length, 'tipo', 'tipos');
    case 'categorias': {
      const total = f.categorias.length + f.subcategorias.length;
      if (total > 1) return _plural(total, 'categoría', 'categorías');
      if (f.categorias.length) return f.categorias[0];
      return SUBCATEGORIAS_GASTO.find(s => s.id === f.subcategorias[0])?.nombre ?? 'Subcategoría';
    }
    case 'estado': return _ESTADO[f.estado] ?? f.estado;
    case 'cuentas': {
      const pre = f.sentido === 'salio' ? 'De ' : f.sentido === 'llego' ? 'A ' : '';
      const que = f.cuentas.length === 1 ? nombreCuenta(f.cuentas[0]) : _plural(f.cuentas.length, 'cuenta', 'cuentas');
      return pre + que;
    }
    case 'empresas': return f.empresas.length === 1 ? f.empresas[0] : _plural(f.empresas.length, 'empresa', 'empresas');
    case 'personas': return f.personas.length === 1 ? f.personas[0] : _plural(f.personas.length, 'persona', 'personas');
    case 'valor': return textoValor(f.valor);
    case 'compromiso': {
      const c = (compromisos ?? []).find(x => x.id === f.compromisoId);
      return `Pagos de ${String(c?.descripcion ?? '').trim() || 'un compromiso'}`;
    }
    default: return '';
  }
}

/** Cómo se nombra un criterio en las frases ("Cambiar el periodo: noviembre"). */
export const NOMBRE_CRITERIO = Object.freeze({
  periodo: 'el periodo', tipos: 'el tipo', categorias: 'la categoría', compromiso: 'los pagos',
  estado: 'el estado', cuentas: 'la cuenta', empresas: 'la empresa', personas: 'la persona', valor: 'el valor',
});

/**
 * Los chips de la fila de activos, en su orden (S1, 6): el texto, el nombre
 * para cambiarlo y el nombre para quitarlo (S3, accesibilidad).
 *
 * @param {FiltrosMov} f
 * @param {Parameters<typeof textoCriterio>[2]} ctx
 * @returns {Array<{ clave: string, texto: string, cambiar: string, quitar: string }>}
 */
export function chipsActivos(f, ctx) {
  return criteriosActivos(f).map(clave => {
    const texto = textoCriterio(f, clave, ctx);
    const min = texto.toLocaleLowerCase('es');
    return {
      clave, texto,
      cambiar: `Cambiar ${NOMBRE_CRITERIO[clave]}: ${min}`,
      quitar: `Quitar el filtro ${min}`,
    };
  });
}

// ── EL RESUMEN Y SIN RESULTADOS ────────────────────────────────

/**
 * "5 movimientos · salieron $187.600" (S1, 6). Con el periodo puesto, el
 * periodo va en su chip y no se repite (R10).
 * @param {object[]} lista
 * @param {(n: number) => string} [dinero] Formatea (con el ojo, la máscara corta).
 * @returns {{ cuantos: string, cuanto: string }}
 */
export function resumen(lista, dinero = plata) {
  const n = lista.length;
  const cuantos = `${n.toLocaleString('es-CO')} ${n === 1 ? 'movimiento' : 'movimientos'}`;
  const { entra, sale } = sumas(lista);
  const partes = [];
  if (entra > 0) partes.push(`entraron ${dinero(entra)}`);
  if (sale > 0) partes.push(`salieron ${dinero(sale)}`);
  return { cuantos, cuanto: partes.join(' y ') };
}

/**
 * Sin resultados (M10): por cada criterio puesto, cuántos habría sin él,
 * para ofrecer quitar uno. El texto del buscador entra como uno más.
 * @param {object[]} movimientos Preparados.
 * @param {FiltrosMov} f
 * @param {Parameters<typeof textoCriterio>[2]} ctx
 */
export function salidasSinResultados(movimientos, f, ctx) {
  const claves = [...criteriosActivos(f), ...(criterioActivo(f, 'texto') ? ['texto'] : [])];
  return claves.map(clave => ({
    clave,
    texto: clave === 'texto' ? `"${String(f.texto).trim()}"` : textoCriterio(f, clave, ctx),
    n: aplicarFiltros(movimientos, sinCriterio(f, clave)).length,
  }));
}

/**
 * La frase de M10: "En octubre no hay suscripciones desde Bancolombia." Se
 * arma con lo que está puesto; si no se puede decir en una frase corta, la
 * genérica.
 * @param {FiltrosMov} f
 * @param {Parameters<typeof textoCriterio>[2]} ctx
 */
export function fraseSinResultados(f, ctx) {
  const partes = [];
  if (criterioActivo(f, 'periodo')) {
    const p = textoCriterio(f, 'periodo', ctx);
    const esMes = /^mes/.test(f.periodo.atajo ?? '') || f.periodo.atajo === 'mes-pasado';
    partes.push(esMes ? `En ${p.toLocaleLowerCase('es')}` : p);
  }
  let que = 'movimientos';
  if (criterioActivo(f, 'categorias')) que = textoCriterio(f, 'categorias', ctx).toLocaleLowerCase('es');
  else if (criterioActivo(f, 'tipos')) que = textoCriterio(f, 'tipos', ctx).toLocaleLowerCase('es');
  let frase = `no hay ${que}`;
  if (criterioActivo(f, 'cuentas')) {
    const c = textoCriterio(f, 'cuentas', ctx).replace(/^(De|A) /, '');
    frase += f.sentido === 'llego' ? ` que llegaran a ${c}` : f.sentido === 'salio' ? ` desde ${c}` : ` en ${c}`;
  }
  if (criterioActivo(f, 'empresas')) frase += ` de ${textoCriterio(f, 'empresas', ctx)}`;
  if (criterioActivo(f, 'personas')) frase += ` con ${textoCriterio(f, 'personas', ctx)}`;
  const texto = [...partes, frase].join(' ');
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}.`;
}

// ── EL BUSCADOR QUE ENTIENDE CRITERIOS (S1, 3) ─────────────────

/** Máximo de sugerencias en "Filtrar por". */
export const SUGERENCIAS_MAX = 5;

/** ¿Alguna palabra del nombre empieza por lo escrito? Devuelve dónde, o -1. */
function _coincide(nombre, q) {
  const p = plano(nombre);
  if (p.startsWith(q)) return 0;
  const i = p.indexOf(` ${q}`);
  return i >= 0 ? i + 1 : -1;
}

/**
 * Las sugerencias para lo escrito (desde 2 letras): primero "Filtrar por"
 * (tipo, categoría, subcategoría, cuenta, empresa, persona, mes, monto;
 * máximo 5) y al final "Buscar el texto". Cada una con cuántos movimientos
 * quedarían con lo ya puesto. Elegir una pone su filtro (`aplicarSugerencia`).
 *
 * @param {object[]} movimientos Preparados.
 * @param {string} texto
 * @param {FiltrosMov} f
 * @param {{ hoyISO: string, cuentas?: Array<{id:string,nombre:string}> }} ctx
 * @returns {{ filtros: Array<{ clave: string, valor: any, nombre: string, donde: string, inicio: number, largo: number, n: number, extra?: object }>, texto: { q: string, n: number } | null }}
 */
export function sugerencias(movimientos, texto, f, { hoyISO, cuentas = [] }) {
  const crudo = String(texto ?? '').trim();
  const q = plano(crudo);
  if (q.length < 2) return { filtros: [], texto: null };
  const todos = movimientos ?? [];
  const sinTexto = { ...f, texto: '' };
  const out = [];
  const contar = (g) => aplicarFiltros(todos, g).length;
  const poner = (clave, valor, nombre, donde, extra) => {
    const inicio = _coincide(nombre, q);
    if (inicio < 0 || out.some(s => s.clave === clave && s.valor === valor)) return;
    const n = contar(conSugerencia(sinTexto, { clave, valor }, hoyISO));
    if (n === 0) return;
    out.push({ clave, valor, nombre, donde, inicio, largo: q.length, n, extra });
  };

  for (const o of opcionesDe(todos, sinTexto, 'tipos')) poner('tipos', o.valor, o.nombre, 'Tipo de movimiento', o.extra);
  const cats = opcionesDe(todos, sinTexto, 'categorias');
  for (const o of cats) poner('categorias', o.valor, o.nombre, 'Categoría');
  for (const o of cats) for (const s of o.subs ?? []) poner('subcategorias', s.valor, s.nombre, `Subcategoría de ${o.nombre}`);
  for (const o of opcionesDe(todos, sinTexto, 'cuentas', { cuentas })) poner('cuentas', o.valor, o.nombre, 'Cuenta', o.extra);
  for (const o of opcionesDe(todos, sinTexto, 'empresas')) poner('empresas', o.valor, o.nombre, 'Empresa o entidad', o.extra);
  for (const o of opcionesDe(todos, sinTexto, 'personas')) poner('personas', o.valor, o.nombre, 'Persona', o.extra);

  // Un mes: "noviembre", "oct" (desde 3 letras), el más reciente que ya pasó.
  if (q.length >= 3) {
    const hoy = String(hoyISO);
    _MESES.forEach((nombre, i) => {
      if (!nombre.startsWith(q)) return;
      let anio = Number(hoy.slice(0, 4));
      if (i + 1 > Number(hoy.slice(5, 7))) anio -= 1;
      const prefijo = `${anio}-${String(i + 1).padStart(2, '0')}`;
      poner('periodo', `mes:${prefijo}`, _nombreMes(prefijo, hoy), 'Periodo');
    });
  }
  const monto = montoDeTexto(crudo);
  if (monto != null) {
    const n = contar({ ...sinTexto, valor: { min: monto, max: monto, atajo: null } });
    if (n > 0) out.push({ clave: 'valor', valor: monto, nombre: `Valor: ${plata(monto)}`, donde: 'Monto exacto', inicio: -1, largo: 0, n });
  }

  const conTexto = aplicarFiltros(todos, { ...f, texto: crudo }).length;
  return { filtros: out.slice(0, SUGERENCIAS_MAX), texto: { q: crudo, n: conTexto } };
}

/**
 * Los filtros con una sugerencia puesta (S1, 3: crea el chip y borra el
 * texto). Un mes reemplaza el periodo; un valor, el rango; lo demás se suma
 * a su lista.
 * @param {FiltrosMov} f
 * @param {{ clave: string, valor: any }} s
 * @param {string} hoyISO
 * @returns {FiltrosMov}
 */
export function conSugerencia(f, { clave, valor }, hoyISO) {
  const out = { ...f, texto: '' };
  const sumar = (lista) => (lista.includes(valor) ? lista : [...lista, valor]);
  switch (clave) {
    case 'tipos': out.tipos = sumar(f.tipos); break;
    case 'categorias': out.categorias = sumar(f.categorias); break;
    case 'subcategorias': out.subcategorias = sumar(f.subcategorias); break;
    case 'cuentas': out.cuentas = sumar(f.cuentas); break;
    case 'empresas': out.empresas = sumar(f.empresas); break;
    case 'personas': out.personas = sumar(f.personas); break;
    case 'periodo': {
      const r = rangoDeAtajo(valor, hoyISO);
      out.periodo = r ? { atajo: valor, ...r } : f.periodo;
      break;
    }
    case 'valor': out.valor = { min: valor, max: valor, atajo: null }; break;
    default: break;
  }
  return out;
}

/**
 * Los filtros de una llegada desde otra sección (`movimientos:ver`): la
 * reemplazan todos (S2, "Cuánto duran"). Lo que llega es un filtro más.
 * @param {{ categoria?: string|null, subcategoriaId?: string|null, compromisoId?: string|null, dominio?: string|null, cuentaId?: string|null, desde?: string, hasta?: string }} payload
 * @param {string} hoyISO
 * @returns {FiltrosMov}
 */
export function filtrosDeLlegada({ categoria = null, subcategoriaId = null, compromisoId = null, dominio = null, cuentaId = null, desde = '', hasta = '' } = {}, hoyISO) {
  const f = filtrosVacios();
  if (subcategoriaId) f.subcategorias = [subcategoriaId];
  else if (categoria) f.categorias = [categoria];
  if (compromisoId) f.compromisoId = compromisoId;
  if (dominio) f.tipos = [dominio === 'metas' ? 'ahorro' : dominio];
  if (cuentaId) f.cuentas = [cuentaId];
  f.periodo = periodoDeRango(desde, hasta, hoyISO);
  return f;
}
