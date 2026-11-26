/**
 * movimientos/logic.js - deriva un historial unificado de movimientos desde
 * los registros que ya existen en otros dominios (TX.8a, ADR 028 D5).
 *
 * No hay log paralelo: se normaliza lo que ya está en S.gastos,
 * S.ingresosPuntuales y S.ahorro.aportes a un shape común. Puro: no lee S
 * directamente, no toca el DOM. Recibe los arrays como parámetros (el
 * caller, view.js, es quien lee S). Ningún dominio importa a otro (ADN 10):
 * los íconos salen de catálogos en core/constants.js, no de otros dominios.
 *
 * Limitación aceptada v1: metas y apartados no tienen historial fechado por
 * aporte (solo `montoActual`), así que no aparecen en el historial todavía.
 */

import { CATEGORIA_INGRESO_ICONO, SUBCATEGORIAS_GASTO, iconoDeCategoriaGasto } from '../../core/constants.js';
import { hijoPorId } from '../../infra/taxonomia.js';
import { fechaLocalISO, f } from '../../infra/utils.js';
import { serializarCSV } from '../../infra/csv.js';
import { bancoClase } from '../../infra/bancos.js';

/**
 * @typedef {Object} Movimiento
 * @property {string} id
 * @property {string} fecha        ISO 8601 (YYYY-MM-DD).
 * @property {'gasto'|'ingreso'|'aporte'|'transferencia'|'abono'|'prestamo'|'recibido'|'ajuste'|'aporte-meta'|'aporte-reserva'|'avance'} tipo
 *   `prestamo`, `recibido` y `ajuste` (HF.1d-1, ADR 143): lo prestado, el
 *   dinero recibido de una deuda (D.14) y el ajuste a mano del saldo.
 *   `avance` (AVC.1a, ADR 169): el avance de una tarjeta que llegó a una cuenta.
 * @property {string} descripcion
 * @property {number} monto
 * @property {'ingreso'|'egreso'|'neutro'} direccion  'neutro' (MC.17c) es un
 *   traslado interno o un aporte al fondo (ADR 139 D3): no suma ni resta, se
 *   pinta sin signo ni color.
 * @property {string} icono        Id de símbolo del sprite.
 * @property {string|null} cuentaId
 * @property {string} [cuentaOrigenId]   Solo en tipo 'transferencia' (MC.17c).
 * @property {string} [cuentaDestinoId]  Solo en tipo 'transferencia' (MC.17c).
 * @property {number} [costoGMF]         Solo en tipo 'transferencia' (MC.17d): 4x1000
 *   del retiro, 0 si el origen es exento o no se descontó. La vista lo muestra en
 *   el subtítulo ("incluye $X de 4x1000") sin sumarlo al monto de la fila.
 * @property {'gastos'|'compromisos'|'ingresos'|'ahorro'|'tesoreria'} dominio  Sección
 *   dueña del movimiento (TX.8b): colorea la teja del ícono en la vista completa
 *   (`cat-teja[data-dom]`, ADR 025 D1/D3), igual que el resto de la app.
 */

/**
 * Categorías internas de `S.gastos` que en realidad son un pago de deuda o de
 * un fijo del Calendario (ver `docs/ARCHITECTURE.md` 13.1: "Deudas incluye
 * también gastos fijos"), no gasto cotidiano. El dominio dueño es
 * `compromisos`, no `gastos`.
 */
const _CATEGORIAS_COMPROMISOS = new Set(['Deudas', 'Gastos fijos']);

/**
 * Normaliza `S.gastos` a Movimiento. Los gastos con categoría interna
 * ('Deudas', 'Gastos fijos') ya revelan su origen real vía el propio
 * catálogo de íconos (TX.6/TX.7 no hace falta: `CATEGORIA_ICONO` alcanza) y
 * vía `dominio: 'compromisos'` (colorea distinto de un gasto cotidiano). La
 * descripción ya no es obligatoria en el formulario de gasto (TX.9a): sin
 * ella, la categoría hace de descripción (mismo criterio que el título del
 * ítem en la lista de Gastos). `iconoDeCategoriaGasto()` resuelve tanto
 * categorías nativas como personalizadas por el usuario (TX.9b); no importa
 * `gastos/logic.js` (ADN 10), el resolver vive en `core/constants.js`.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {{ nombre: string, icono: string }[]} [categoriasPersonalizadas]
 * @returns {Movimiento[]}
 */
export function movimientosDesdeGastos(gastos, categoriasPersonalizadas = []) {
  if (!Array.isArray(gastos)) return [];
  return gastos.map(g => _movimientoDeGasto(g, categoriasPersonalizadas));
}

/**
 * Un gasto como Movimiento. GAS.11a (ADR 186 D1): el título es el de la fila
 * de Gastos (`textosFilaGasto`): lo que la persona escribió (la descripción
 * de antes de TX.9a o la nota), si no la subcategoría ("Taxi") y si no la
 * categoría. Antes la nota no llegaba aquí: "Almuerzo de trabajo" se leía
 * "Restaurantes" y la búsqueda no lo encontraba.
 * @param {import('../../core/state.js').Gasto} g
 * @param {{ nombre: string, icono: string }[]} categoriasPersonalizadas
 * @returns {Movimiento}
 */
function _movimientoDeGasto(g, categoriasPersonalizadas) {
  const sub = hijoPorId(SUBCATEGORIAS_GASTO, g.subcategoriaId);
  const subcategoria = sub && sub.categorias.includes(g.categoria) ? sub : null;
  const nota = g.nota?.trim() || null;
  return {
    id:          g.id,
    fecha:       g.fecha,
    tipo:        'gasto',
    descripcion: g.descripcion?.trim() || nota || subcategoria?.nombre || g.categoria || 'Gasto',
    monto:       g.monto,
    direccion:   'egreso',
    icono:       iconoDeCategoriaGasto(g.categoria, categoriasPersonalizadas),
    cuentaId:    g.cuentaId ?? null,
    // GMF.1b (ADR 165 D4): el 4x1000 que el gasto le costó a la cuenta.
    costoGMF:    Number(g.costoGMF) || 0,
    dominio:     _CATEGORIAS_COMPROMISOS.has(g.categoria) ? 'compromisos' : 'gastos',
      ...(g.sinEfectoSaldo ? { sinEfectoSaldo: true } : {}),
    // G5 (ficha 07, ADR 069 D8): el único filtro que faltaba para llegar
    // prefiltrado desde un tope de Límites. Solo los gastos la llevan: un
    // aporte, un ingreso puntual o una transferencia no tienen categoría de
    // gasto, y el filtro los descarta a propósito cuando está puesto.
    categoria:   g.categoria ?? null,
    // GAS.11a (ADR 186 D2): la subcategoría (filtro) y la nota (búsqueda).
    subcategoriaId: subcategoria?.id ?? null,
    // GAS.14c (ADR 189 D3): el fijo o la deuda que paga (o la tarjeta de una
    // compra), para ver los pagos de uno solo.
    compromisoId: g.compromisoId ?? null,
    subcategoria:   subcategoria?.nombre ?? null,
    nota,
  };
}

/**
 * GAS.11a (ADR 186 D3): el tipo de un movimiento para el filtro, lo que la
 * persona entiende por "tipo". `dominio` colorea la teja y junta en
 * `compromisos` el pago de un gasto fijo, el de una deuda, el dinero que
 * entró de una deuda y el avance: filtrar por él decía "Deudas" y mostraba
 * Netflix. La clase los separa; `gastos` e `ingresos` valen lo mismo que el
 * dominio de antes, así las llegadas de Gastos y de Mis cuentas no cambian.
 *
 * @param {Movimiento} m
 * @returns {'gastos'|'fijos'|'deudas'|'ingresos'|'transferencias'|'ajustes'|'ahorro'|'metas'|'personales'|string}
 */
export function claseMovimiento(m) {
  switch (m?.tipo) {
    case 'gasto':
      if (m.categoria === 'Gastos fijos') return 'fijos';
      return m.categoria === 'Deudas' ? 'deudas' : 'gastos';
    case 'ingreso':        return 'ingresos';
    case 'transferencia':  return 'transferencias';
    case 'ajuste':         return 'ajustes';
    case 'recibido':
    case 'avance':         return 'deudas';
    case 'abono':
    case 'prestamo':       return 'personales';
    case 'aporte-meta':    return 'metas';
    case 'aporte':
    case 'aporte-reserva': return 'ahorro';
    default:               return m?.dominio ?? 'otros';
  }
}

/**
 * Las clases en el orden en que se ofrecen, con su nombre (GAS.11a).
 */
export const CLASES_MOVIMIENTO = Object.freeze([
  ['gastos', 'Gastos'],
  ['fijos', 'Gastos fijos'],
  ['deudas', 'Deudas'],
  ['ingresos', 'Ingresos'],
  ['transferencias', 'Transferencias'],
  ['ahorro', 'Ahorro'],
  ['metas', 'Metas'],
  ['personales', 'Me deben'],
  ['ajustes', 'Ajustes de saldo'],
]);

/** Minúsculas y sin tildes: "Café" y "cafe" se encuentran (GAS.11a). */
function _plano(texto) {
  return String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * GAS.11a (ADR 186 D4): el periodo de un atajo de fechas, en 'YYYY-MM-DD'.
 * "mes" (lo que va del mes), "mes-pasado" (el mes anterior entero),
 * "tres-meses" (este mes y los dos anteriores) y "anio" (lo que va del año).
 *
 * @param {'mes'|'mes-pasado'|'tres-meses'|'anio'} periodo
 * @param {string} hoyISO 'YYYY-MM-DD'
 * @returns {{ desde: string, hasta: string } | null}
 */
export function rangoDePeriodo(periodo, hoyISO) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(hoyISO ?? ''));
  if (!m) return null;
  const anio = +m[1];
  const mes = +m[2] - 1;
  const iso = (a, me, d) => {
    const fecha = new Date(Date.UTC(a, me, d));
    return fecha.toISOString().slice(0, 10);
  };
  switch (periodo) {
    case 'mes':        return { desde: iso(anio, mes, 1), hasta: hoyISO };
    case 'mes-pasado': return { desde: iso(anio, mes - 1, 1), hasta: iso(anio, mes, 0) };
    case 'tres-meses': return { desde: iso(anio, mes - 2, 1), hasta: hoyISO };
    case 'anio':       return { desde: iso(anio, 0, 1), hasta: hoyISO };
    default:           return null;
  }
}

/**
 * GAS.11a (ADR 186 D2): lo que se puede elegir en los filtros, sacado de los
 * movimientos que hay (nunca una opción que deje la lista vacía). Las
 * categorías de los gastos del día a día, de la más usada a la menos (los
 * pagos de fijos y deudas tienen su tipo); las subcategorías de cada una, en
 * el orden del catálogo, y las cuentas que aparecen en algún movimiento.
 *
 * @param {Movimiento[]} movimientos
 * @returns {{ categorias: string[], subcategorias: Record<string, Array<{ id: string, nombre: string }>>, cuentaIds: string[] }}
 */
export function opcionesDeFiltro(movimientos) {
  const delDia = (movimientos ?? []).filter(m => m?.tipo === 'gasto' && claseMovimiento(m) === 'gastos');
  const categorias = categoriasFrecuentes(delDia);
  const subcategorias = {};
  for (const c of categorias) {
    const ids = new Set(delDia.filter(m => m.categoria === c && m.subcategoriaId).map(m => m.subcategoriaId));
    const lista = SUBCATEGORIAS_GASTO.filter(s => ids.has(s.id)).map(s => ({ id: s.id, nombre: s.nombre }));
    if (lista.length) subcategorias[c] = lista;
  }
  const cuentaIds = new Set();
  for (const m of movimientos ?? []) {
    for (const id of [m?.cuentaId, m?.cuentaOrigenId, m?.cuentaDestinoId]) if (id) cuentaIds.add(id);
  }
  return { categorias, subcategorias, cuentaIds: [...cuentaIds] };
}

/**
 * Normaliza `S.ingresosPuntuales` a Movimiento.
 *
 * @param {import('../../core/state.js').IngresoPuntual[]} ingresosPuntuales
 * @returns {Movimiento[]}
 */
export function movimientosDesdeIngresosPuntuales(ingresosPuntuales) {
  if (!Array.isArray(ingresosPuntuales)) return [];
  return ingresosPuntuales.map(i => ({
    id:          i.id,
    fecha:       i.fecha,
    tipo:        'ingreso',
    descripcion: i.descripcion,
    monto:       i.monto,
    direccion:   'ingreso',
    icono:       CATEGORIA_INGRESO_ICONO[i.categoria] ?? 'i-saldo',
    cuentaId:    i.cuentaId ?? null,
    dominio:     'ingresos',
    // MOV.4 (ADR 200 D4): "Ingreso · Salario" en la fila y en la búsqueda.
    categoriaIngreso: i.categoria ?? null,
  }));
}

/**
 * Normaliza `S.ahorro.aportes` a Movimiento. Un aporte no tiene categoría ni
 * cuenta (Aporte solo guarda id/monto/fecha/nota); la nota, si existe, sirve
 * de descripción.
 *
 * Dirección `neutro` (ADR 139 D3): el aporte al fondo no saca dinero de ninguna
 * cuenta, se queda donde estaba (ADR 020). Como egreso restaba del neto del
 * día un dinero que nunca salió.
 *
 * @param {import('../../core/state.js').Aporte[]} aportes
 * @returns {Movimiento[]}
 */
export function movimientosDesdeAportes(aportes) {
  if (!Array.isArray(aportes)) return [];
  return aportes.map(a => ({
    id:          a.id,
    fecha:       a.fecha,
    tipo:        'aporte',
    descripcion: a.nota?.trim() || 'Aporte al fondo de emergencia',
    monto:       a.monto,
    direccion:   'neutro',
    icono:       'i-ahorro',
    cuentaId:    null,
    dominio:     'ahorro',
  }));
}

/**
 * Los aportes a metas y a reservas (HF.1c, [ADR 145](../../../docs/DECISIONS/145-los-aportes-de-metas-y-reservas-tienen-fecha.md) D3).
 * Un aporte cambia el dinero de bolsillo, no lo gasta: dirección `neutro`,
 * como la transferencia y el aporte al Fondo, con la cuenta de donde salió.
 * `efectoEnCuenta()` lo resta de esa cuenta. Lo anterior a la v50 no tiene
 * fila: es saldo de apertura (ADR 145 D2).
 *
 * @param {Array<{id:string, nombre?:string, aportes?:import('../../core/state.js').AporteBolsa[]}>} bolsas
 * @param {'aporte-meta'|'aporte-reserva'} tipo
 * @returns {Movimiento[]}
 */
function _movimientosDeBolsas(bolsas, tipo) {
  if (!Array.isArray(bolsas)) return [];
  const esMeta = tipo === 'aporte-meta';
  const out = [];
  for (const b of bolsas) {
    if (!b || !Array.isArray(b.aportes)) continue;
    for (const a of b.aportes) {
      if (!a || typeof a.fecha !== 'string') continue;
      out.push({
        id:          a.id,
        fecha:       a.fecha,
        tipo,
        descripcion: `Aporte a ${String(b.nombre ?? '').trim() || (esMeta ? 'tu meta' : 'tu reserva')}`,
        monto:       Number(a.monto) || 0,
        direccion:   'neutro',
        icono:       esMeta ? 'i-metas' : 'i-apartados',
        cuentaId:    a.cuentaId ?? null,
        dominio:     esMeta ? 'metas' : 'ahorro',
      });
    }
  }
  return out;
}

/** @param {import('../../core/state.js').Meta[]} metas */
export function movimientosDesdeAportesMetas(metas) {
  return _movimientosDeBolsas(metas, 'aporte-meta');
}

/** @param {import('../../core/state.js').Apartado[]} apartados */
export function movimientosDesdeAportesReservas(apartados) {
  return _movimientosDeBolsas(apartados, 'aporte-reserva');
}

/**
 * Normaliza `S.transferencias` a Movimiento (MC.17c). Una transferencia es un
 * traslado interno, no un ingreso ni un gasto (invariante de MC.17, ver
 * `contexto/mis-cuentas.md`): dirección 'neutro' (sin signo, sin color), una
 * sola fila por transferencia. La descripción "Origen → Destino" se arma en
 * la vista (`view.js`), no acá: los nombres de cuenta pueden cambiar sin que
 * eso invalide este historial derivado (mismo criterio que `cuentaId` en las
 * otras fuentes, resuelto en vivo con `_nombreCuenta`).
 *
 * @param {import('../../core/state.js').Transferencia[]} transferencias
 * @returns {Movimiento[]}
 */
export function movimientosDesdeTransferencias(transferencias) {
  if (!Array.isArray(transferencias)) return [];
  return transferencias.map(t => ({
    id:              t.id,
    fecha:           t.fecha,
    tipo:            'transferencia',
    descripcion:     '',
    monto:           t.monto,
    direccion:       'neutro',
    icono:           'i-transferencia',
    cuentaId:        null,
    cuentaOrigenId:  t.cuentaOrigenId,
    cuentaDestinoId: t.cuentaDestinoId,
    costoGMF:        t.costoGMF ?? 0,
    comision:        t.comision ?? 0,
    dominio:         'tesoreria',
  }));
}

/**
 * Normaliza los abonos recibidos de `S.personales` a Movimiento (ficha 15, M1).
 *
 * Quinta fuente del ledger, y la única que no necesitó cambiar el modelo: cada
 * abono guarda fecha, monto, desglose y cuenta desde el schema v34 (PE.6b), que
 * es exactamente la forma que este historial pide. Antes de esto, un abono
 * recibido no aparecía en ninguna vista cronológica de la app.
 *
 * Recibe los préstamos y no los abonos porque el nombre de la persona vive en
 * el padre, y es lo que hace legible la fila ("Abono de Camila").
 *
 * El id es sintético (`prestamo.id` + índice): un abono no tiene id propio, y
 * la fila no ofrece acciones. Cobrar y corregir un abono se hace en Me deben,
 * donde está el préstamo entero con su desglose; el ledger lo enumera.
 *
 * El abono `agrupado` (el que dejó la migración v33 a v34) entra igual, con su
 * marca: resume lo cobrado antes de que existiera el historial y su fecha es
 * aproximada. La vista lo rotula distinto en vez de hacer pasar esa fecha por
 * exacta, mismo criterio que el historial de Me deben.
 *
 * @param {import('../../core/state.js').Personal[]} personales
 * @returns {Movimiento[]}
 */
export function movimientosDesdeAbonos(personales) {
  if (!Array.isArray(personales)) return [];
  const lista = [];
  for (const p of personales) {
    if (!p || !Array.isArray(p.abonos)) continue;
    p.abonos.forEach((a, i) => {
      lista.push({
        // ADR 143 D5: un abono nuevo trae su id; los viejos, el sintético.
        id:          a?.id ?? `${p.id}:abono-${i}`,
        fecha:       a?.fecha,
        tipo:        'abono',
        descripcion: `Abono de ${p.persona || 'un préstamo'}`,
        monto:       a?.monto,
        direccion:   'ingreso',
        icono:       'i-personales',
        cuentaId:    a?.cuentaId ?? null,
        dominio:     'personales',
        agrupado:    a?.agrupado === true,
        // MOV.4 (ADR 200 D5): el filtro y la búsqueda por persona.
        persona:     String(p.persona ?? '').trim() || null,
      });
    });
  }
  return lista;
}

/**
 * Lo que prestaste (HF.1d-1, ADR 143 D2): un préstamo con cuenta salió de
 * ella al crearse, por su monto vigente (editarlo ya ajusta la cuenta por la
 * diferencia). Sin cuenta no movió ningún saldo y no da fila.
 *
 * @param {import('../../core/state.js').Personal[]} personales
 * @returns {Movimiento[]}
 */
export function movimientosDesdePrestamos(personales) {
  if (!Array.isArray(personales)) return [];
  return personales
    .filter(p => p && p.cuentaId && Number(p.monto) > 0)
    .map(p => ({
      id:          `${p.id}:prestamo`,
      fecha:       p.fecha,
      tipo:        'prestamo',
      descripcion: `Le prestaste a ${p.persona || 'alguien'}`,
      monto:       Number(p.monto),
      direccion:   'egreso',
      icono:       'i-personales',
      cuentaId:    p.cuentaId,
      dominio:     'personales',
      persona:     String(p.persona ?? '').trim() || null,
    }));
}

/**
 * El dinero recibido de una deuda (D.14, HF.1d-1, ADR 143 D2): entró a su
 * cuenta por `montoAcreditado` el día que se creó la deuda. Borrar la deuda
 * ya lo revierte, así que la fila se va con ella.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @returns {Movimiento[]}
 */
export function movimientosDesdeDeudasRecibidas(compromisos) {
  if (!Array.isArray(compromisos)) return [];
  return compromisos
    .filter(c => c && c.cuentaOrigenId && Number(c.montoAcreditado) > 0)
    .map(c => ({
      id:          `${c.id}:recibido`,
      fecha:       fechaLocalISO(c.fechaCreacion) ?? '',
      tipo:        'recibido',
      descripcion: `Recibiste: ${c.descripcion || 'una deuda'}`,
      monto:       Number(c.montoAcreditado),
      direccion:   'ingreso',
      icono:       'i-deudas',
      cuentaId:    c.cuentaOrigenId,
      dominio:     'compromisos',
      // MOV.4 (ADR 200 D5): la deuda, para su categoría, su entidad o su persona.
      compromisoId: c.id,
    }));
}

/**
 * Los avances de una tarjeta que llegaron a una cuenta (AVC.1a, ADR 169 D5):
 * entran a la cuenta de destino por su monto, en su fecha, como el dinero
 * recibido de una deuda (ADR 143 D2). No son ingreso: Análisis, la renta y la
 * tasa de ahorro no leen Movimientos. Se leen de `Compromiso.avances` sin
 * importar el dominio de compromisos (ADN 10).
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @returns {Movimiento[]}
 */
export function movimientosDesdeAvances(compromisos) {
  if (!Array.isArray(compromisos)) return [];
  const lista = [];
  for (const c of compromisos) {
    if (!c || !Array.isArray(c.avances)) continue;
    for (const a of c.avances) {
      if (!a?.id || !a.cuentaId || !(Number(a.monto) > 0)) continue;
      lista.push({
        id:          a.id,
        fecha:       a.fecha,
        tipo:        'avance',
        descripcion: `Avance de ${c.descripcion || 'tu tarjeta'}`,
        monto:       Number(a.monto),
        direccion:   'ingreso',
        icono:       'i-deudas',
        cuentaId:    a.cuentaId,
        dominio:     'compromisos',
        compromisoId: c.id,
      });
    }
  }
  return lista;
}

/**
 * Los ajustes a mano del saldo (HF.1d-1, ADR 143 D3): entran o salen según su
 * signo. No son ingreso ni gasto.
 *
 * @param {{ id: string, cuentaId: string, fecha: string, monto: number }[]} ajustes
 * @returns {Movimiento[]}
 */
export function movimientosDesdeAjustes(ajustes) {
  if (!Array.isArray(ajustes)) return [];
  return ajustes
    .filter(a => a && a.cuentaId && Number(a.monto) !== 0 && Number.isFinite(Number(a.monto)))
    .map(a => ({
      id:          a.id,
      fecha:       a.fecha,
      tipo:        'ajuste',
      descripcion: 'Ajuste de saldo',
      monto:       Math.abs(Number(a.monto)),
      direccion:   Number(a.monto) > 0 ? 'ingreso' : 'egreso',
      icono:       'i-saldo',
      cuentaId:    a.cuentaId,
      dominio:     'tesoreria',
    }));
}

/**
 * Lo que las filas dicen que le pasó a una cuenta (R-HF2, ADR 143 D1): entra
 * suma, sale resta; una transferencia resta del origen lo enviado más su
 * 4x1000 y suma al destino lo que llegó. Un gasto importado (`sinEfectoSaldo`,
 * HF.0c) no movió la cuenta y no cuenta. Pura.
 *
 * El saldo de hoy de una cuenta es su saldo de apertura más este número.
 *
 * @param {Movimiento[]} movimientos
 * @param {string} cuentaId
 * @returns {number}
 */
export function efectoEnCuenta(movimientos, cuentaId) {
  let total = 0;
  for (const m of movimientos ?? []) {
    const monto = Number(m?.monto) || 0;
    if (m?.tipo === 'transferencia') {
      // MC.20a (ADR 171 D4): lo que cobró el cajero sale con el 4x1000.
      if (m.cuentaOrigenId === cuentaId) total -= monto + (Number(m.costoGMF) || 0) + (Number(m.comision) || 0);
      if (m.cuentaDestinoId === cuentaId) total += monto;
      continue;
    }
    // HF.1c (ADR 145 D3): el aporte es neutro en la lista, pero sale de su cuenta.
    if (m?.tipo === 'aporte-meta' || m?.tipo === 'aporte-reserva') {
      if (m.cuentaId === cuentaId) total -= monto;
      continue;
    }
    if (m?.cuentaId !== cuentaId || m.sinEfectoSaldo) continue;
    if (m.direccion === 'ingreso') total += monto;
    else if (m.direccion === 'egreso') total -= monto + (Number(m.costoGMF) || 0);
  }
  return total;
}

/**
 * Descripción visible de un movimiento. Una transferencia (MC.17c) no trae
 * descripción propia: se arma con los nombres VIGENTES de sus cuentas
 * ("Origen → Destino"), resueltos en vivo (si el usuario renombra una cuenta
 * después, el historial ya derivado no queda desactualizado). Pura: recibe
 * `cuentas` como parámetro, no lee `S` (ADN 10, mismo criterio que
 * `categoriasPersonalizadas` en `movimientosDesdeGastos`).
 *
 * Extraída de `view.js` (MOV.2) para que el filtro de texto pueda buscar
 * sobre el mismo texto que ve el usuario en la fila, sin duplicar el join
 * cuenta→nombre en dos archivos.
 *
 * @param {Movimiento} m
 * @param {import('../../core/state.js').Cuenta[]} [cuentas]
 * @returns {string}
 */
export function descripcionMovimiento(m, cuentas = []) {
  if (m.tipo !== 'transferencia') return m.descripcion;
  const nombre = (id) => (cuentas ?? []).find(c => c.id === id)?.nombre ?? 'Cuenta eliminada';
  // MC.20a (ADR 171 D5): la que llega a una cuenta de efectivo es un retiro.
  if (esRetiro(m, cuentas)) return `Retiro de ${nombre(m.cuentaOrigenId)}`;
  return `${nombre(m.cuentaOrigenId)} → ${nombre(m.cuentaDestinoId)}`;
}

/**
 * ¿La transferencia es un retiro? Llega a una cuenta de efectivo (ADR 171
 * D5): se deriva del destino, no hay un campo que lo diga.
 * @param {Movimiento} m
 * @param {import('../../core/state.js').Cuenta[]} [cuentas]
 * @returns {boolean}
 */
export function esRetiro(m, cuentas = []) {
  if (m?.tipo !== 'transferencia') return false;
  const destino = (cuentas ?? []).find(c => c.id === m.cuentaDestinoId);
  if (!destino) return false;
  return destino.banco ? bancoClase(destino.banco) === 'efectivo' : /^efectivo$/i.test(destino.tipo ?? '');
}

/**
 * Filtra movimientos ya derivados por texto, dominio y rango de fechas
 * (MOV.2). Pura y barata (barrido lineal): se aplica sobre la fuente ya
 * combinada, ANTES de agrupar por mes y paginar (PERF.1): nunca sobre el DOM
 * ya pintado, que con años de historial ni siquiera tiene todos los nodos.
 *
 * @param {Movimiento[]} movimientos
 * @param {{
 *   texto?: string|null,     Substring, sin distinguir mayúsculas ni tildes, contra
 *                            la descripción visible (incluida la de una
 *                            transferencia), la categoría, la subcategoría y la nota.
 *   dominio?: string|null,   Una clase (`claseMovimiento`) exacta, o null/'' = todos.
 *                            Se llama `dominio` por las llegadas de `movimientos:ver`.
 *   categoria?: string|null, Categoría de gasto exacta, o null/'' = todas. Solo
 *                            los gastos la llevan, así que con este filtro
 *                            puesto el resto de las fuentes queda fuera (G5).
 *   subcategoriaId?: string|null, Id de subcategoría exacto (GAS.11a).
 *   desde?: string,          'YYYY-MM-DD' inclusive. '' = sin piso.
 *   hasta?: string,          'YYYY-MM-DD' inclusive. '' = sin techo.
 *   cuentas?: import('../../core/state.js').Cuenta[],  Para resolver el texto de una transferencia.
 * }} [filtros]
 * @returns {Movimiento[]}
 */
export function filtrarMovimientos(movimientos, { texto, dominio, categoria, subcategoriaId, compromisoId, cuentaId, desde, hasta, cuentas } = {}) {
  const lista = Array.isArray(movimientos) ? movimientos : [];
  const q = _plano(texto?.trim()) || null;
  // GAS.11a (ADR 186 D2): se busca en lo que la fila dice (título, categoría y
  // subcategoría) y en la nota, sin tildes ni mayúsculas.
  const buscable = m => _plano([descripcionMovimiento(m, cuentas), m.categoria, m.subcategoria, m.nota].filter(Boolean).join(' '));

  // Una transferencia toca DOS cuentas y las dos cuentan como suyas: filtrar
  // por la cuenta origen y perder el traslado que entró ahí dejaría el saldo
  // sin explicación. El aporte al fondo no tiene cuenta (su dinero ya está
  // dentro de `cuentas`), así que queda fuera de cualquier filtro por cuenta.
  const esDeLaCuenta = m => m.cuentaId === cuentaId
    || m.cuentaOrigenId === cuentaId
    || m.cuentaDestinoId === cuentaId;

  return lista.filter(m => {
    // GAS.11a (ADR 186 D3): el tipo es la clase, no el dominio que colorea.
    if (dominio && claseMovimiento(m) !== dominio) return false;
    if (categoria && m.categoria !== categoria) return false;
    if (subcategoriaId && m.subcategoriaId !== subcategoriaId) return false;
    // MOV.4: la deuda recibida y el avance llevan su compromiso, pero no son pagos.
    if (compromisoId && (m.tipo !== 'gasto' || m.compromisoId !== compromisoId)) return false;
    if (cuentaId && !esDeLaCuenta(m)) return false;
    if (desde && m.fecha < desde) return false;
    if (hasta && m.fecha > hasta) return false;
    if (q && !buscable(m).includes(q)) return false;
    return true;
  });
}

/**
 * Combina y ordena (más reciente primero) los movimientos de las 5 fuentes.
 * A igualdad de fecha, el orden entre movimientos de tipos distintos no está
 * garantizado (no hay hora de creación en el dato de origen); dentro de un
 * mismo tipo se conserva el orden de inserción de su colección.
 *
 * @param {{ gastos?: unknown, ingresosPuntuales?: unknown, aportes?: unknown, transferencias?: unknown, personales?: unknown, categoriasPersonalizadas?: unknown }} fuentes
 * @param {number} [limite=5]
 * @returns {Movimiento[]}
 */
export function movimientosRecientes({ gastos, ingresosPuntuales, aportes, transferencias, personales, categoriasPersonalizadas, compromisos, ajustesSaldo, metas, apartados } = {}, limite = 5) {
  const todos = [
    ...movimientosDesdeGastos(gastos, categoriasPersonalizadas),
    ...movimientosDesdeIngresosPuntuales(ingresosPuntuales),
    ...movimientosDesdeAportes(aportes),
    ...movimientosDesdeTransferencias(transferencias),
    ...movimientosDesdeAbonos(personales),
    // HF.1d-1 (ADR 143): todo cambio de saldo con su fila.
    ...movimientosDesdePrestamos(personales),
    ...movimientosDesdeDeudasRecibidas(compromisos),
    // AVC.1a (ADR 169 D5): el avance que llegó a una cuenta.
    ...movimientosDesdeAvances(compromisos),
    ...movimientosDesdeAjustes(ajustesSaldo),
    // HF.1c (ADR 145 D3): los aportes a metas y reservas.
    ...movimientosDesdeAportesMetas(metas),
    ...movimientosDesdeAportesReservas(apartados),
  ];
  return todos
    .filter(m => typeof m.fecha === 'string' && m.fecha)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, limite);
}

/**
 * Historial completo (TX.8b): las 5 fuentes combinadas y ordenadas por fecha
 * descendente, sin límite. Vista completa de Movimientos en ruta propia.
 *
 * @param {{ gastos?: unknown, ingresosPuntuales?: unknown, aportes?: unknown, transferencias?: unknown, personales?: unknown }} fuentes
 * @returns {Movimiento[]}
 */
export function movimientosCompletos(fuentes = {}) {
  return movimientosRecientes(fuentes, Infinity);
}

// ── BUSCAR (ADR 121 D1) ──────────────────────────────────────────

/** Las columnas del mes para Excel, en su orden (REV.3a). */
export const COLUMNAS_EXCEL = ['Fecha', 'Descripción', 'Categoría', 'Cuenta', 'Entrada', 'Salida'];

/** Qué es la fila cuando no es un gasto con categoría: la columna Categoría no queda vacía. */
const _CATEGORIA_POR_TIPO = {
  gasto:         'Gasto',
  ingreso:       'Ingreso',
  aporte:        'Ahorro',
  transferencia: 'Transferencia',
  abono:         'Abono recibido',
  prestamo:      'Préstamo',
  recibido:      'Préstamo recibido',
  ajuste:        'Ajuste de saldo',
  avance:        'Avance de tarjeta',
};

/**
 * Las filas de un mes para Excel (REV.3a), de la más vieja a la más reciente,
 * con las columnas de `COLUMNAS_EXCEL`. Recibe lo que la lista muestra (ya
 * filtrado) y se queda con el mes pedido. Entrada y Salida van como números
 * sin formato, para que Excel los sume: Entrada menos Salida da el total que
 * la lista pone junto al mes. Una transferencia o un aporte al fondo no suman
 * a ningún lado (`neutro`): su monto va en la descripción, no en las columnas.
 *
 * Pura: no lee `S` ni el DOM.
 *
 * @param {Movimiento[]} movimientos
 * @param {string} prefijoMes 'YYYY-MM'.
 * @param {Array<{id:string, nombre:string}>} [cuentas]
 * @returns {Array<Record<string, string|number>>}
 */
export function filasDelMesParaExcel(movimientos, prefijoMes, cuentas = []) {
  const nombreCuenta = (id) => (cuentas ?? []).find(c => c.id === id)?.nombre ?? '';
  return (movimientos ?? [])
    .filter(m => typeof m?.fecha === 'string' && m.fecha.startsWith(`${prefijoMes}-`))
    .reverse()
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(m => {
      const monto = Number(m.monto) || 0;
      const desc  = descripcionMovimiento(m, cuentas);
      return {
        Fecha:         m.fecha,
        'Descripción': m.direccion === 'neutro' ? `${desc}: ${f(monto)}` : desc,
        'Categoría':   m.categoria || _CATEGORIA_POR_TIPO[m.tipo] || '',
        Cuenta:        m.tipo === 'transferencia' ? '' : nombreCuenta(m.cuentaId),
        Entrada:       m.direccion === 'ingreso' ? monto : '',
        Salida:        m.direccion === 'egreso' ? monto : '',
      };
    });
}

/**
 * El CSV del mes para Excel (REV.3a): separador `;` (el que Excel en español
 * abre en columnas) y BOM UTF-8 al inicio, sin el cual Excel muestra mal las
 * tildes. Vacío si el mes no tiene filas.
 *
 * @param {ReturnType<typeof filasDelMesParaExcel>} filas
 * @returns {string}
 */
export function csvDelMesParaExcel(filas) {
  if (!Array.isArray(filas) || filas.length === 0) return '';
  return `\uFEFF${serializarCSV(filas, { separador: ';', headers: COLUMNAS_EXCEL })}`;
}

/** Cuántas búsquedas recientes se recuerdan. */
export const BUSQUEDAS_RECIENTES_MAX = 5;

/**
 * Lo que suman unos movimientos: lo que sale, lo que entra y el neto. Una
 * transferencia (`neutro`) mueve dinero entre cuentas propias y no suma a
 * ningún lado.
 *
 * @param {Movimiento[]} movimientos
 * @returns {{ sale: number, entra: number, neto: number }}
 */
export function sumaDeMovimientos(movimientos) {
  let sale = 0;
  let entra = 0;
  for (const m of movimientos ?? []) {
    const monto = Number(m.monto) || 0;
    if (m.direccion === 'egreso') sale += monto;
    else if (m.direccion === 'ingreso') entra += monto;
  }
  return { sale, entra, neto: entra - sale };
}

/**
 * Las categorías más usadas, para los atajos de la búsqueda. A igual uso, en
 * orden alfabético, para que el orden no salte entre visitas.
 *
 * @param {Movimiento[]} movimientos
 * @param {number} [tope=Infinity]
 * @returns {string[]}
 */
export function categoriasFrecuentes(movimientos, tope = Infinity) {
  const conteo = new Map();
  for (const m of movimientos ?? []) {
    if (!m.categoria) continue;
    conteo.set(m.categoria, (conteo.get(m.categoria) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .slice(0, tope)
    .map(([categoria]) => categoria);
}

/**
 * La lista de búsquedas recientes con `texto` primero, sin repetir (sin
 * importar mayúsculas) y topada en `BUSQUEDAS_RECIENTES_MAX`. Un texto vacío
 * no se anota.
 *
 * @param {string[] | undefined} lista
 * @param {string} texto
 * @returns {string[]}
 */
export function anotarBusquedaReciente(lista, texto) {
  const previas = Array.isArray(lista) ? lista : [];
  const t = String(texto ?? '').trim();
  if (!t) return previas;
  const clave = t.toLocaleLowerCase('es');
  return [t, ...previas.filter(b => String(b).toLocaleLowerCase('es') !== clave)]
    .slice(0, BUSQUEDAS_RECIENTES_MAX);
}
