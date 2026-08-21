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

import { CATEGORIA_INGRESO_ICONO, iconoDeCategoriaGasto } from '../../core/constants.js';

/**
 * @typedef {Object} Movimiento
 * @property {string} id
 * @property {string} fecha        ISO 8601 (YYYY-MM-DD).
 * @property {'gasto'|'ingreso'|'aporte'|'transferencia'} tipo
 * @property {string} descripcion
 * @property {number} monto
 * @property {'ingreso'|'egreso'|'neutro'} direccion  'neutro' (MC.17c) es un
 *   traslado interno: no suma ni resta, se pinta sin signo ni color.
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
  return gastos.map(g => ({
    id:          g.id,
    fecha:       g.fecha,
    tipo:        'gasto',
    descripcion: g.descripcion?.trim() || g.categoria || 'Gasto',
    monto:       g.monto,
    direccion:   'egreso',
    icono:       iconoDeCategoriaGasto(g.categoria, categoriasPersonalizadas),
    cuentaId:    g.cuentaId ?? null,
    dominio:     _CATEGORIAS_COMPROMISOS.has(g.categoria) ? 'compromisos' : 'gastos',
    // G5 (ficha 07, ADR 069 D8): el único filtro que faltaba para llegar
    // prefiltrado desde un tope de Límites. Solo los gastos la llevan: un
    // aporte, un ingreso puntual o una transferencia no tienen categoría de
    // gasto, y el filtro los descarta a propósito cuando está puesto.
    categoria:   g.categoria ?? null,
  }));
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
  }));
}

/**
 * Normaliza `S.ahorro.aportes` a Movimiento. Un aporte no tiene categoría ni
 * cuenta (Aporte solo guarda id/monto/fecha/nota); la nota, si existe, sirve
 * de descripción.
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
    direccion:   'egreso',
    icono:       'i-ahorro',
    cuentaId:    null,
    dominio:     'ahorro',
  }));
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
        id:          `${p.id}:abono-${i}`,
        fecha:       a?.fecha,
        tipo:        'abono',
        descripcion: `Abono de ${p.persona || 'un préstamo'}`,
        monto:       a?.monto,
        direccion:   'ingreso',
        icono:       'i-personales',
        cuentaId:    a?.cuentaId ?? null,
        dominio:     'personales',
        agrupado:    a?.agrupado === true,
      });
    });
  }
  return lista;
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
  return `${nombre(m.cuentaOrigenId)} → ${nombre(m.cuentaDestinoId)}`;
}

/**
 * Filtra movimientos ya derivados por texto, dominio y rango de fechas
 * (MOV.2). Pura y barata (barrido lineal): se aplica sobre la fuente ya
 * combinada, ANTES de agrupar por mes y paginar (PERF.1): nunca sobre el DOM
 * ya pintado, que con años de historial ni siquiera tiene todos los nodos.
 *
 * @param {Movimiento[]} movimientos
 * @param {{
 *   texto?: string|null,     Substring, sin distinguir mayúsculas, contra la
 *                            descripción visible (incluida la de una transferencia).
 *   dominio?: string|null,   Un valor de `Movimiento.dominio` exacto, o null/'' = todos.
 *   categoria?: string|null, Categoría de gasto exacta, o null/'' = todas. Solo
 *                            los gastos la llevan, así que con este filtro
 *                            puesto el resto de las fuentes queda fuera (G5).
 *   desde?: string,          'YYYY-MM-DD' inclusive. '' = sin piso.
 *   hasta?: string,          'YYYY-MM-DD' inclusive. '' = sin techo.
 *   cuentas?: import('../../core/state.js').Cuenta[],  Para resolver el texto de una transferencia.
 * }} [filtros]
 * @returns {Movimiento[]}
 */
export function filtrarMovimientos(movimientos, { texto, dominio, categoria, cuentaId, desde, hasta, cuentas } = {}) {
  const lista = Array.isArray(movimientos) ? movimientos : [];
  const q = texto?.trim().toLowerCase() || null;

  // Una transferencia toca DOS cuentas y las dos cuentan como suyas: filtrar
  // por la cuenta origen y perder el traslado que entró ahí dejaría el saldo
  // sin explicación. El aporte al fondo no tiene cuenta (su dinero ya está
  // dentro de `cuentas`), así que queda fuera de cualquier filtro por cuenta.
  const esDeLaCuenta = m => m.cuentaId === cuentaId
    || m.cuentaOrigenId === cuentaId
    || m.cuentaDestinoId === cuentaId;

  return lista.filter(m => {
    if (dominio && m.dominio !== dominio) return false;
    if (categoria && m.categoria !== categoria) return false;
    if (cuentaId && !esDeLaCuenta(m)) return false;
    if (desde && m.fecha < desde) return false;
    if (hasta && m.fecha > hasta) return false;
    if (q && !descripcionMovimiento(m, cuentas).toLowerCase().includes(q)) return false;
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
export function movimientosRecientes({ gastos, ingresosPuntuales, aportes, transferencias, personales, categoriasPersonalizadas } = {}, limite = 5) {
  const todos = [
    ...movimientosDesdeGastos(gastos, categoriasPersonalizadas),
    ...movimientosDesdeIngresosPuntuales(ingresosPuntuales),
    ...movimientosDesdeAportes(aportes),
    ...movimientosDesdeTransferencias(transferencias),
    ...movimientosDesdeAbonos(personales),
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
