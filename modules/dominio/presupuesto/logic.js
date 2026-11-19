/**
 * presupuesto/logic.js - funciones puras del dominio de presupuesto por sobre.
 *
 * Modelo "envelope budgeting" simplificado:
 *   - Un envelope por categoría (no por mes).
 *   - Monto mensual recurrente.
 *   - Progreso = gastos del mes en esa categoría / monto asignado.
 *
 * Sin DOM. Sin S directo. Testeable en Node/Vitest.
 */

import { CATEGORIAS_GASTO, CATEGORIAS_GASTO_USUARIO, GRUPOS_FINANCIEROS, CATEGORIAS_AGENDA_NO_ESENCIALES, SUBCATEGORIAS_GASTO } from '../../core/constants.js';
import { hijosDeCategoria } from '../../infra/taxonomia.js';
import { gastosMes, esDelDiaADia } from '../gastos/logic.js';
import { gastosQueSalenDelIngreso } from '../../infra/naturaleza.js';
import { f } from '../../infra/utils.js';
import { resumenHormigaMes, topeHormiga, limiteHormiga, aprendidosDe, TOPE_HORMIGA_MIN, TOPE_HORMIGA_MAX } from '../../infra/hormiga.js';

// ── CONSTANTES ───────────────────────────────────────────────────

/** Umbrales de estado (fracciones del monto asignado). */
export const UMBRAL_ALERTA   = 0.75;
export const UMBRAL_EXCEDIDO = 1.00;

/** Estados posibles del progreso de un envelope. */
export const ESTADOS_PROGRESO = /** @type {const} */ (['ok', 'alerta', 'excedido']);

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra presupuestos con `activo !== false`.
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 */
export function presupuestosActivos(presupuestos) {
  return (presupuestos ?? []).filter(p => p.activo !== false);
}

/**
 * Los topes activos ordenados por urgencia: excedido primero, después en
 * alerta, después el resto, y dentro de cada estado el porcentaje más alto
 * arriba (ficha 12, hallazgo L5).
 *
 * El defecto: `presupuestosActivos()` es un `filter` sin `sort`, así que los
 * sobres salían en orden de creación y el excedido pesaba lo mismo que el que
 * va al 40%. Y el contraejemplo estaba **en este mismo archivo**:
 * `desgloseNecesidadesDelMes()` sí ordena, por estado de pago y luego por
 * monto. Un archivo, dos listas, un solo criterio aplicado.
 *
 * No lleva divisores, a diferencia de Metas y Reservas: la lista es corta y el
 * borde del sobre ya dice su estado.
 *
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {import('../../core/state.js').Presupuesto[]}
 */
export function ordenarPresupuestosPorUrgencia(presupuestos, gastos, anio, mes) {
  const PESO = { excedido: 0, alerta: 1, ok: 2 };

  return presupuestosActivos(presupuestos)
    .map(p => ({ p, r: calcularProgreso(p, gastos ?? [], anio, mes) }))
    .sort((a, b) => {
      const pa = PESO[a.r.estado] ?? 2;
      const pb = PESO[b.r.estado] ?? 2;
      if (pa !== pb) return pa - pb;
      return b.r.porcentaje - a.r.porcentaje;
    })
    .map(x => x.p);
}

/**
 * Suma gastos de una categoría específica en el mes dado.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} categoria
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {number} Total en COP.
 */
export function calcularGastadoCategoria(gastos, categoria, anio, mes) {
  return gastosMes(gastos ?? [], anio, mes)
    .filter(g => (g.categoria ?? 'Otros') === categoria)
    .reduce((acc, g) => acc + (g.monto ?? 0), 0);
}

/**
 * Calcula el progreso de un envelope contra los gastos del mes actual.
 *
 * Estados:
 *   - 'ok'        → gastado < 75% del asignado
 *   - 'alerta'    → 75% ≤ gastado ≤ 100%
 *   - 'excedido'  → gastado > 100%
 *
 * @param {import('../../core/state.js').Presupuesto} presupuesto
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {{
 *   gastado: number,
 *   asignado: number,
 *   restante: number,
 *   porcentaje: number,
 *   estado: 'ok' | 'alerta' | 'excedido',
 * }}
 */
export function calcularProgreso(presupuesto, gastos, anio, mes) {
  const asignado = Number(presupuesto?.montoMensual ?? 0);
  // GAS.8g (ADR 182 D7): el límite de una parte solo cuenta lo de esa parte.
  const gastado  = esLimiteDeUnaParte(presupuesto)
    ? gastadoDeLaParte(presupuesto, gastos, anio, mes)
    : calcularGastadoCategoria(gastos, presupuesto?.categoria, anio, mes);
  const restante = asignado - gastado;

  // Porcentaje: si no hay asignado, devolvemos 0 para no dividir por cero.
  const porcentaje = asignado > 0
    ? Math.round((gastado / asignado) * 100)
    : 0;

  let estado;
  if (asignado === 0)                            estado = 'ok';
  else if (gastado > asignado * UMBRAL_EXCEDIDO) estado = 'excedido';
  else if (gastado >= asignado * UMBRAL_ALERTA)  estado = 'alerta';
  else                                           estado = 'ok';

  return { gastado, asignado, restante, porcentaje, estado };
}

// ── GASTOS PEQUEÑOS (APR.1b, ADR 092) ────────────────────────────

/**
 * El límite de deseos pequeños del mes: la suma de los gastos hormiga (lo
 * pequeño que es un gusto, ADR 147 D6) contra el máximo que el usuario se puso
 * (`S.config.hormiga`). No es un tope por categoría: cruza todas. Mismo
 * criterio de estado que `calcularProgreso()`.
 *
 * Sin límite puesto devuelve igual el total del mes: la lente lo muestra para
 * ofrecer ponerle uno.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {{ hormiga?: { tope?: number, limite?: number | null } }} config - `S.config`.
 * @param {number} anio
 * @param {number} mes - 1-12
 * @param {ReadonlyArray<{ nombre: string, caracter?: string|null }>} [personalizadas] - las
 *   categorías del usuario, por el carácter que dijeron (SUS.2b).
 * @returns {{ tope: number, limite: number | null, gastado: number, cuantos: number,
 *   restante: number, porcentaje: number, estado: 'ok' | 'alerta' | 'excedido' }}
 */
export function progresoHormiga(gastos, config, anio, mes, personalizadas = []) {
  const tope   = topeHormiga(config);
  const limite = limiteHormiga(config);
  const mesISO = `${anio}-${String(mes).padStart(2, '0')}`;
  const { total: gastado, cuantos } = resumenHormigaMes(gastos, mesISO, tope, personalizadas, aprendidosDe(config));
  if (!limite) return { tope, limite: null, gastado, cuantos, restante: 0, porcentaje: 0, estado: 'ok' };

  const porcentaje = Math.round((gastado / limite) * 100);
  let estado = 'ok';
  if (gastado > limite * UMBRAL_EXCEDIDO)      estado = 'excedido';
  else if (gastado >= limite * UMBRAL_ALERTA)  estado = 'alerta';
  return { tope, limite, gastado, cuantos, restante: limite - gastado, porcentaje, estado };
}

/**
 * Valida el formulario de gastos pequeños: el tope de una compra dentro del
 * rango de `infra/hormiga.js` y, si viene, un límite del mes mayor que cero.
 *
 * @param {Record<string, string>} datos - `{ tope, limite }` del formulario.
 * @returns {string[]} mensajes de error; vacío = válido.
 */
export function validarHormiga(datos) {
  const errores = [];
  const tope = Number(datos?.tope);
  if (!Number.isFinite(tope) || tope < TOPE_HORMIGA_MIN || tope > TOPE_HORMIGA_MAX) {
    errores.push(`Una compra pequeña va de ${f(TOPE_HORMIGA_MIN)} a ${f(TOPE_HORMIGA_MAX)}: escribe un valor en ese rango.`);
  }
  const crudo = String(datos?.limite ?? '').trim();
  if (crudo !== '') {
    const limite = Number(crudo);
    if (!Number.isFinite(limite) || limite <= 0) errores.push('Escribe el límite del mes. Por ejemplo: 300.000');
  }
  return errores;
}

// ── RESUMEN POR GRUPO FINANCIERO (MC.5a, ADR 017) ─────────────────

/**
 * Agrega asignado/ejecutado/restante/% por cada uno de los 3 grupos
 * financieros (Necesidades, Estilo de vida, Ahorro), con el mismo criterio
 * de estado que `calcularProgreso` (75% alerta, 100% excedido).
 *
 * Pura: recibe los montos ya sumados por el caller (asignado desde la
 * distribución de ingreso, ejecutado desde los flujos del mes de cada
 * dominio); no lee `S` ni importa otros dominios (regla ADN #10).
 *
 * @param {Partial<Record<'necesidades'|'estilo-de-vida'|'ahorro', number>>} [asignadoPorGrupo]
 * @param {Partial<Record<'necesidades'|'estilo-de-vida'|'ahorro', number>>} [ejecutadoPorGrupo]
 * @returns {Record<string, {
 *   asignado: number,
 *   ejecutado: number,
 *   restante: number,
 *   pct: number,
 *   estado: 'ok' | 'alerta' | 'excedido',
 * }>}
 */
export function resumenGrupos(asignadoPorGrupo = {}, ejecutadoPorGrupo = {}) {
  const resumen = {};

  for (const grupo of GRUPOS_FINANCIEROS) {
    const asignado  = Number(asignadoPorGrupo?.[grupo])  || 0;
    const ejecutado = Number(ejecutadoPorGrupo?.[grupo]) || 0;
    const restante  = asignado - ejecutado;

    const pct = asignado > 0
      ? Math.round((ejecutado / asignado) * 100)
      : 0;

    let estado;
    if (asignado === 0)                             estado = 'ok';
    else if (ejecutado > asignado * UMBRAL_EXCEDIDO) estado = 'excedido';
    else if (ejecutado >= asignado * UMBRAL_ALERTA)  estado = 'alerta';
    else                                              estado = 'ok';

    resumen[grupo] = { asignado, ejecutado, restante, pct, estado };
  }

  return resumen;
}

/**
 * Ids de los gastos fijos que no son esenciales (Streaming y Suscripciones,
 * lista cerrada del ADR 014). Con ellos, un gasto ligado a un compromiso se
 * puede mandar a Estilo de vida sin importar otro dominio (regla ADN #10):
 * el criterio es la categoría del compromiso, que ya vive en `S.compromisos`.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @returns {Set<string>}
 */
export function idsFijosNoEsenciales(compromisos) {
  return new Set(
    (compromisos ?? [])
      .filter(c => c.tipo === 'fijo' && CATEGORIAS_AGENDA_NO_ESENCIALES.includes(c.categoria))
      .map(c => c.id),
  );
}

/**
 * Deriva el ejecutado del mes por grupo financiero desde los flujos ya
 * registrados en Finko (ADR 017, decisión 3). Sin schema nuevo: todo sale de
 * datos que cada dominio ya guarda.
 *
 * Partición de `gastos` (evita doble conteo entre Necesidades y Estilo de vida):
 *   - **Necesidades:** gastos del mes vinculados a un compromiso (`compromisoId`),
 *     es decir pagos de gastos fijos marcados en Calendario y abonos a deudas.
 *   - **Estilo de vida:** gastos variables del mes (sin `compromisoId`) y, desde
 *     LIM.1b, los pagos de fijos **no esenciales** (Streaming y Suscripciones,
 *     ADR 014): el streaming no puede pesar igual que el arriendo, porque es
 *     justo donde el usuario decide. Su asignado se mueve en la misma rebanada
 *     (`calcularFijosNoEsencialesMensuales` en tesorería), o Estilo de vida
 *     aparecería excedido contra un plan que no lo incluye.
 *   - **Fuera de los dos:** la compra con tarjeta de crédito (ADR 139 D2). Este
 *     es el plan del ingreso, y la compra todavía no sacó dinero: sale cuando
 *     se paga la tarjeta, como cuota de deuda en Necesidades (ADR 013). Antes
 *     contaba dos veces, y como Necesidad, porque lleva el `compromisoId` de
 *     la tarjeta.
 *
 * El pago de un fijo se registra con categoría 'Gastos fijos' (no la del
 * compromiso), así que la clasificación va por `compromisoId` y necesita la
 * lista de compromisos. **No filtra por `activo`**: un fijo dado de baja a mitad
 * de mes ya salió del asignado, y su pago del día 5 sigue siendo streaming.
 *
 * Ahorro se toma de los aportes fechados al fondo de emergencia
 * (`S.ahorro.aportes`). Metas, apartados e inversiones no guardan un historial
 * de aportes con fecha, así que su ejecutado mensual no es derivable hoy; queda
 * fuera del alcance de este slice (el copy es honesto: "según lo que registras").
 *
 * Pura: recibe los arrays ya extraídos de S por el caller; no lee S ni el DOM.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {import('../../core/state.js').Aporte[]} aportesFondo  S.ahorro.aportes
 * @param {number} anio
 * @param {number} mes - 1-12
 * @param {import('../../core/state.js').Compromiso[]} [compromisos]  S.compromisos
 * @returns {Record<'necesidades'|'estilo-de-vida'|'ahorro', number>}
 */
export function ejecutadoPorGrupoDelMes(gastos, aportesFondo, anio, mes, compromisos = []) {
  const delMes = gastosMes(gastosQueSalenDelIngreso(gastos), anio, mes);
  const noEsenciales = idsFijosNoEsenciales(compromisos);

  const esNecesidad = g => !!g.compromisoId && !noEsenciales.has(g.compromisoId);

  const necesidades = delMes
    .filter(esNecesidad)
    .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

  const estiloVida = delMes
    .filter(g => !esNecesidad(g))
    .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

  const prefijo = `${anio}-${String(mes).padStart(2, '0')}`;
  const ahorro = (aportesFondo ?? [])
    .filter(a => typeof a?.fecha === 'string' && a.fecha.startsWith(prefijo))
    .reduce((acc, a) => acc + (Number(a.monto) || 0), 0);

  return { necesidades, 'estilo-de-vida': estiloVida, ahorro };
}

// ── DESGLOSE POR ITEM DENTRO DE CADA GRUPO (MC.5c, ADR 017) ───────

/**
 * Desglose de Necesidades por item (gasto fijo o deuda) del mes en curso.
 *
 * ADR 017 decisión 4: en v1 no hay presupuesto por item (el presupuesto es el
 * del grupo); aquí solo se informa el monto de referencia del compromiso
 * (`monto` para fijos, `cuotaMensual` para deudas) y si ya se pagó este mes.
 *
 * LIM.1b: los fijos no esenciales no salen acá, porque ya no cargan Necesidades
 * (`ejecutadoPorGrupoDelMes`); listarlos dejaría un desglose que no suma lo que
 * la tarjeta del grupo muestra arriba.
 *
 * Pura: recibe compromisos y gastos ya extraídos de S; no importa
 * `compromisos/logic.js` (regla ADN #10, misma decisión que MC.5a/MC.5b).
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {Array<{
 *   id: string,
 *   descripcion: string,
 *   tipo: 'fijo'|'deuda',
 *   categoria: string|null,
 *   montoReferencia: number,
 *   ejecutado: number,
 *   estadoPago: 'ninguno'|'parcial'|'completo',
 * }>} Ordenado: pendientes primero, luego por monto de referencia descendente.
 */
export function desgloseNecesidadesDelMes(compromisos, gastos, anio, mes) {
  // ADR 139 D2: una compra con la tarjeta lleva su `compromisoId`, pero no es
  // un pago: no puede marcar la cuota de la tarjeta como pagada.
  const delMes = gastosMes(gastosQueSalenDelIngreso(gastos), anio, mes);
  const noEsenciales = idsFijosNoEsenciales(compromisos);

  const items = (compromisos ?? [])
    .filter(c => c.activo !== false
      && !noEsenciales.has(c.id)
      && (c.tipo === 'fijo' || c.tipo === 'deuda-entidad' || c.tipo === 'deuda-personal'))
    .map(c => {
      const esDeudaTipo = c.tipo !== 'fijo';
      const montoReferencia = Number(esDeudaTipo ? c.cuotaMensual : c.monto) || 0;
      const ejecutado = delMes
        .filter(g => g.compromisoId === c.id)
        .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

      let estadoPago;
      if (ejecutado <= 0)                                     estadoPago = 'ninguno';
      else if (!esDeudaTipo)                                  estadoPago = 'completo'; // fijos: un abono cubre el mes
      else if (montoReferencia > 0 && ejecutado < montoReferencia) estadoPago = 'parcial';
      else                                                     estadoPago = 'completo';

      return {
        id:              c.id,
        descripcion:     c.descripcion ?? '',
        tipo:            esDeudaTipo ? 'deuda' : 'fijo',
        categoria:       c.categoria ?? null,
        montoReferencia,
        ejecutado,
        estadoPago,
      };
    });

  const RANGO_ESTADO = { ninguno: 0, parcial: 1, completo: 2 };
  return items.sort((a, b) => {
    if (a.estadoPago !== b.estadoPago) return RANGO_ESTADO[a.estadoPago] - RANGO_ESTADO[b.estadoPago];
    return b.montoReferencia - a.montoReferencia;
  });
}

/**
 * Desglose de Ahorro por destino: fondo de emergencia, metas, apartados e
 * inversiones (ADR 017, decisión 1 y 4).
 *
 * Solo el fondo tiene aportes fechados (`ahorro.aportes`), así que solo él
 * reporta `aportadoEsteMes`; metas, apartados e inversiones no guardan un
 * historial de aportes con fecha (mismo límite que `ejecutadoPorGrupoDelMes`),
 * así que muestran su acumulado a la fecha (`acumulado`/`objetivo`), no un
 * corte mensual. La vista debe ser honesta sobre esta diferencia.
 *
 * Pura: recibe los arrays/objeto ya extraídos de S; no importa otros dominios.
 *
 * @param {import('../../core/state.js').Ahorro|null|undefined} ahorro
 * @param {import('../../core/state.js').Meta[]} metas
 * @param {import('../../core/state.js').Apartado[]} apartados
 * @param {import('../../core/state.js').Inversion[]} inversiones
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {Array<{
 *   id: string,
 *   nombre: string,
 *   tipo: 'fondo'|'meta'|'apartado'|'inversion',
 *   acumulado: number,
 *   objetivo: number|null,
 *   aportadoEsteMes: number|null,
 * }>}
 */
export function desgloseAhorroDelMes(ahorro, metas, apartados, inversiones, anio, mes) {
  const prefijo = `${anio}-${String(mes).padStart(2, '0')}`;
  const items = [];

  const fondo = ahorro?.fondoEmergencia;
  if (fondo?.activo) {
    const aportes       = ahorro?.aportes ?? [];
    const aportesTotal  = aportes.reduce((acc, a) => acc + (Number(a.monto) || 0), 0);
    const aportadoEsteMes = aportes
      .filter(a => typeof a?.fecha === 'string' && a.fecha.startsWith(prefijo))
      .reduce((acc, a) => acc + (Number(a.monto) || 0), 0);

    items.push({
      id:              'fondo',
      nombre:          'Fondo de emergencia',
      tipo:            'fondo',
      acumulado:       (Number(fondo.montoActual) || 0) + aportesTotal,
      objetivo:        null,
      aportadoEsteMes,
    });
  }

  for (const m of (metas ?? [])) {
    if (m.completada === true) continue;
    items.push({
      id: m.id, nombre: m.nombre, tipo: 'meta',
      acumulado:       Number(m.montoActual)   || 0,
      objetivo:        Number(m.montoObjetivo) || 0,
      aportadoEsteMes: null,
    });
  }

  for (const a of (apartados ?? [])) {
    if (a.completado === true) continue;
    items.push({
      id: a.id, nombre: a.nombre, tipo: 'apartado',
      acumulado:       Number(a.montoActual)   || 0,
      objetivo:        Number(a.montoObjetivo) || 0,
      aportadoEsteMes: null,
    });
  }

  for (const inv of (inversiones ?? [])) {
    items.push({
      id: inv.id, nombre: inv.nombre, tipo: 'inversion',
      acumulado:       Number(inv.monto) || 0,
      objetivo:        null,
      aportadoEsteMes: null,
    });
  }

  return items;
}

// ── MENSAJES POR ROL (MC.5d + MC.8a, ADR 017 y ADR 019) ───────────

/**
 * Genera los mensajes del mes por grupo financiero, con **tratamiento
 * asimétrico por rol** (ADR 019): cada grupo habla según su naturaleza, no
 * con una plantilla común. Tono orientativo, nunca prescriptivo (ADN regla 11).
 *
 * - **Necesidades = monitorear.** Son gastos esenciales que se pagan sí o sí:
 *   no se "limitan", se monitorean. Cuando el gasto en necesidades supera lo
 *   que la distribución les asignó, no es una falta del usuario, sino que sus
 *   necesidades pesan más sobre el ingreso. Se emite un mensaje **informativo**
 *   (`tipo: 'info'`), sin la palabra "límite" ni tono de alarma. Estar cerca
 *   del presupuesto (estado 'alerta') no genera nada: es normal.
 * - **Ahorro = celebrar.** Superar lo planeado es una victoria. Se refuerza
 *   siempre que `pct >= 100`, con más calidez cuando el usuario aportó de más
 *   (`ejecutado > asignado`) que cuando solo cumplió.
 * - **Estilo de vida = controlar.** Único grupo con alertas preventivas, por
 *   categoría (`alertasCategoria`) y por grupo. Sin cambios respecto a MC.5d.
 *
 * El refuerzo combinado ("cumpliste todas tus necesidades y aún ahorras")
 * exige que TODOS los items de Necesidades del mes estén pagados (dato más
 * fino que el ratio del grupo) y que el grupo Necesidades no esté excedido.
 *
 * Pura: recibe las estructuras ya calculadas por el caller (`alertasLimites`,
 * `resumenGrupos`, `desgloseNecesidadesDelMes`); no lee `S`.
 *
 * @param {{
 *   alertasCategoria?: ReturnType<typeof alertasLimites>,
 *   resumen?:          ReturnType<typeof resumenGrupos>,
 *   itemsNecesidades?: ReturnType<typeof desgloseNecesidadesDelMes>,
 * }} [datos]
 * @returns {Array<{
 *   id: string,
 *   grupo: 'necesidades'|'estilo-de-vida'|'ahorro'|null,
 *   tipo: 'alerta'|'refuerzo'|'info',
 *   severidad: 'alerta'|'excedido'|null,
 *   mensaje: string,
 * }>} `severidad` solo aplica a `tipo: 'alerta'`; es `null` para 'refuerzo' e 'info'.
 */
export function generarMensajesLimites({
  alertasCategoria = [],
  resumen           = {},
  itemsNecesidades  = [],
} = {}) {
  const mensajes = [];

  // 1) Estilo de vida por categoría: el único grupo que se controla (ADR 019).
  for (const a of alertasCategoria) {
    if (a.estado === 'excedido') {
      mensajes.push({
        id:      `categoria-${a.categoria}`,
        grupo:   'estilo-de-vida',
        tipo:    'alerta',
        severidad: 'excedido',
        mensaje: `Superaste tu límite para ${a.categoria} este mes. Revisa este gasto antes de que termine el mes.`,
      });
    } else if (a.estado === 'alerta') {
      mensajes.push({
        id:      `categoria-${a.categoria}`,
        grupo:   'estilo-de-vida',
        tipo:    'alerta',
        severidad: 'alerta',
        mensaje: `Ya usaste el ${a.porcentaje}% de tu presupuesto para ${a.categoria}. Intenta moderar este tipo de gastos los próximos días.`,
      });
    }
  }

  // 2) Necesidades: se monitorean, no se limitan (ADR 019). Solo informa cuando
  //    pesan más de lo previsto; estar cerca del presupuesto no genera nada.
  const nec = resumen?.necesidades;
  if (nec?.estado === 'excedido') {
    mensajes.push({
      id: 'grupo-necesidades', grupo: 'necesidades', tipo: 'info', severidad: null,
      mensaje: 'Tus necesidades están consumiendo una parte importante de tu ingreso este mes. Considera revisar tu plan general o dónde puedes reducir otros gastos.',
    });
  }

  // 3) Grupo Estilo de vida (nivel de grupo, además del detalle por categoría).
  const ev = resumen?.['estilo-de-vida'];
  if (ev?.estado === 'excedido') {
    mensajes.push({
      id: 'grupo-estilo-de-vida', grupo: 'estilo-de-vida', tipo: 'alerta', severidad: 'excedido',
      mensaje: 'Tus gastos de estilo de vida superaron lo que planeaste este mes.',
    });
  } else if (ev?.estado === 'alerta') {
    mensajes.push({
      id: 'grupo-estilo-de-vida', grupo: 'estilo-de-vida', tipo: 'alerta', severidad: 'alerta',
      mensaje: 'Tus gastos de estilo de vida están creciendo más rápido de lo previsto. Revisa si puedes reducir algunos consumos.',
    });
  }

  // 4) Ahorro: celebrar. Superar lo planeado se refuerza con más calidez que cumplir.
  const ah = resumen?.ahorro;
  if (ah && ah.asignado > 0 && ah.pct >= 100) {
    const superoLoPlaneado = ah.ejecutado > ah.asignado;
    mensajes.push({
      id: 'grupo-ahorro', grupo: 'ahorro', tipo: 'refuerzo', severidad: null,
      mensaje: superoLoPlaneado
        ? '¡Excelente! Este mes estás ahorrando más de lo planeado. Cada peso que ahorras hoy es tranquilidad mañana.'
        : 'Vas por buen camino. Cumpliste con el ahorro que planeaste este mes.',
    });
  }

  // 5) Refuerzo combinado: todas las necesidades del mes pagadas y aún hay ahorro.
  const necesidadesCompletas = itemsNecesidades.length > 0
    && itemsNecesidades.every(it => it.estadoPago === 'completo');
  const necesidadesSinExceso = nec?.estado !== 'excedido';
  if (necesidadesCompletas && necesidadesSinExceso && ah && ah.ejecutado > 0) {
    mensajes.push({
      id: 'refuerzo-combinado', grupo: null, tipo: 'refuerzo', severidad: null,
      mensaje: 'Cumpliste todas tus necesidades este mes y aún tienes dinero para ahorrar. Excelente trabajo.',
    });
  }

  return mensajes;
}

/**
 * Suma el monto mensual de todos los envelopes activos.
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 */
export function totalAsignadoMensual(presupuestos) {
  return presupuestosActivos(presupuestos)
    .reduce((acc, p) => acc + (p.montoMensual ?? 0), 0);
}

/**
 * Cobertura de los límites por categoría frente al presupuesto de Estilo de
 * vida (la "olla finita" de MC.8, ADR 019 decisión 2). Indica cuánto del
 * presupuesto de Estilo de vida (que sale de la distribución de Mis cuentas)
 * cubren los topes actuales y cuánto queda sin tope, para dar la noción de
 * presupuesto acotado sin obligar al usuario a asignar el 100% ni a ponerle
 * tope a cada categoría.
 *
 * Pura: reusa `totalAsignadoMensual`, no lee `S` ni el DOM.
 *
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 * @param {number} presupuestoEstiloVida - monto del grupo Estilo de vida (distribución).
 * @returns {{limites:number, presupuesto:number, sinTope:number, excede:boolean}}
 *   `sinTope` es lo que queda del presupuesto sin ningún tope (nunca negativo);
 *   `excede` es true cuando la suma de topes supera el presupuesto de Estilo de vida.
 */
export function coberturaLimitesEstiloVida(presupuestos, presupuestoEstiloVida) {
  const limites     = totalAsignadoMensual(presupuestos);
  const presupuesto = Math.max(0, Number(presupuestoEstiloVida) || 0);
  return {
    limites,
    presupuesto,
    sinTope: Math.max(0, presupuesto - limites),
    excede:  limites > presupuesto,
  };
}

/**
 * Dinero extraordinario recibido en el mes: la suma de `S.ingresosPuntuales`
 * fechados en ese mes (una prima, una venta, un préstamo que te devolvieron).
 *
 * **Se informa y no se reparte** ([ADR 045](../../../docs/DECISIONS/045-base-de-calculo-del-disponible-para-limites.md)
 * D3). No entra en la base del plan: el ingreso es el denominador de todos los
 * pisos de la distribución y el excedente cae en el residuo, así que sumarlo
 * engordaría sobre todo el presupuesto de Estilo de vida y dejaría el ahorro
 * igual. La cifra sirve para decirle al usuario que ese dinero existe y que
 * decida su destino, no para ampliarle el permiso de gasto.
 *
 * Mismo corte por mes calendario que `ejecutadoPorGrupoDelMes`.
 *
 * @param {import('../../core/state.js').IngresoPuntual[]} ingresosPuntuales
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {number} Total en COP (0 si no hubo ninguno).
 */
export function extraordinarioDelMes(ingresosPuntuales, anio, mes) {
  const prefijo = `${anio}-${String(mes).padStart(2, '0')}`;
  return (ingresosPuntuales ?? [])
    .filter(i => typeof i?.fecha === 'string' && i.fecha.startsWith(prefijo))
    .reduce((acc, i) => acc + (Number(i.monto) || 0), 0);
}

/**
 * Categorías que tienen gastos en el mes actual pero no tienen envelope creado.
 * Útil para mostrar al usuario qué presupuestos le faltan.
 *
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes
 * @returns {Array<{ categoria: string, gastado: number }>}
 */
export function categoriasSinPresupuesto(presupuestos, gastos, anio, mes) {
  const conPresupuesto = new Set(
    presupuestosActivos(presupuestos).map(p => p.categoria),
  );

  const gastosDelMes = gastosMes(gastos ?? [], anio, mes);
  const porCategoria = gastosDelMes.reduce((acc, g) => {
    const cat = g.categoria ?? 'Otros';
    if (!conPresupuesto.has(cat)) {
      acc[cat] = (acc[cat] ?? 0) + (g.monto ?? 0);
    }
    return acc;
  }, {});

  return Object.entries(porCategoria)
    .map(([categoria, gastado]) => ({ categoria, gastado }))
    .sort((a, b) => b.gastado - a.gastado);
}

/**
 * GAS.8f (ADR 182 D6): las categorías con gastos del mes y sin límite, con
 * cuánto suman y cuántos gastos son. Mismo orden que `categoriasSinPresupuesto`
 * (la que más suma primero); la sugerencia de Límites elige por la cantidad.
 *
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {Array<{categoria:string, gastado:number, cantidad:number}>}
 */
export function sinLimiteDelMes(presupuestos, gastos, anio, mes) {
  const conPresupuesto = new Set(presupuestosActivos(presupuestos).map(p => p.categoria));
  const por = new Map();
  for (const g of gastosMes(gastos ?? [], anio, mes)) {
    const cat = g.categoria ?? 'Otros';
    if (conPresupuesto.has(cat)) continue;
    const r = por.get(cat) ?? { categoria: cat, gastado: 0, cantidad: 0 };
    r.gastado += Number(g.monto) || 0;
    r.cantidad += 1;
    por.set(cat, r);
  }
  return [...por.values()].sort((a, b) => b.gastado - a.gastado);
}

/**
 * GAS.8f (ADR 182 D6): la categoría que la sugerencia de Límites propone, la
 * que más gastos tiene en el mes (a igual cantidad, la que más suma). Desde
 * tres gastos: con menos, un límite todavía no dice nada.
 *
 * @param {Array<{categoria:string, gastado:number, cantidad:number}>} sinLimite
 * @param {number} [minimo=3]
 * @returns {{categoria:string, gastado:number, cantidad:number} | null}
 */
export function categoriaParaSugerirLimite(sinLimite, minimo = 3) {
  const candidatas = (sinLimite ?? []).filter(s => s.cantidad >= minimo);
  if (candidatas.length === 0) return null;
  return [...candidatas].sort((a, b) => b.cantidad - a.cantidad || b.gastado - a.gastado)[0];
}

/** GAS.9e (ADR 183 D5): desde cuántos gastos del mes una categoría pide límite. */
export const MINIMO_GASTOS_SUGERIR_LIMITE = 3;

/**
 * GAS.9e (ADR 183 D5): la sugerencia de límite al registrar un gasto, o null.
 *
 * Sugiere solo cuando aporta y una vez: el gasto es del día a día (no el pago
 * de un fijo o una deuda) en una categoría que admite límite; la categoría no
 * tiene ningún límite activo (ni de toda ni de una parte: el usuario ya
 * decidió sobre ella); lleva `minimo` gastos o más en el mes del gasto; y esa
 * categoría no se sugirió ni se descartó ese mes (`vistas`, `descartada`). Y
 * como mucho una sugerencia al día (`ultimoDia`), aunque sean dos categorías.
 *
 * Si la categoría tiene partes y una de ellas pesa más de la mitad de lo
 * gastado, habiendo gasto en otra, la sugerencia es para esa parte ("Solo una
 * parte", ADR 182 D7); si todo es de una sola parte, la categoría entera dice
 * lo mismo y es más simple.
 *
 * @param {object} p
 * @param {import('../../core/state.js').Gasto} p.gasto el que se acaba de guardar.
 * @param {import('../../core/state.js').Gasto[]} p.gastos todos, con él incluido.
 * @param {import('../../core/state.js').Presupuesto[]} p.presupuestos
 * @param {string} p.hoyISO 'YYYY-MM-DD'
 * @param {string[]} [p.vistas] claves 'YYYY-MM:Categoría' ya sugeridas.
 * @param {string} [p.descartada] la clave descartada en Límites ("Ahora no").
 * @param {string} [p.ultimoDia] el día de la última sugerencia.
 * @param {{nombre:string}[]} [p.personalizadas] categorías del usuario.
 * @param {number} [p.minimo]
 * @returns {{ categoria:string, parte:{id:string, nombre:string}|null, cantidad:number, gastado:number, gastadoParte:number, clave:string } | null}
 */
export function sugerenciaDeLimiteAlRegistrar({
  gasto, gastos, presupuestos, hoyISO, vistas = [], descartada = '', ultimoDia = '',
  personalizadas = [], minimo = MINIMO_GASTOS_SUGERIR_LIMITE,
} = {}) {
  if (!gasto || typeof gasto.fecha !== 'string' || !esDelDiaADia(gasto)) return null;
  const categoria = gasto.categoria;
  const admite = CATEGORIAS_GASTO_USUARIO.includes(categoria)
    || (personalizadas ?? []).some(c => c?.nombre === categoria);
  if (!admite) return null;
  if (typeof hoyISO === 'string' && ultimoDia === hoyISO.slice(0, 10)) return null;
  if (presupuestosActivos(presupuestos).some(p => p.categoria === categoria)) return null;

  const mes = gasto.fecha.slice(0, 7);
  const clave = `${mes}:${categoria}`;
  if ((vistas ?? []).includes(clave) || descartada === clave) return null;

  const delMes = (gastos ?? []).filter(g => g?.categoria === categoria
    && typeof g.fecha === 'string' && g.fecha.startsWith(mes) && esDelDiaADia(g));
  if (delMes.length < minimo) return null;
  const gastado = delMes.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  if (gastado <= 0) return null;

  // La parte que pesa, si la hay.
  const partes = hijosDeCategoria(SUBCATEGORIAS_GASTO, categoria);
  const porParte = new Map();
  for (const g of delMes) {
    if (!partes.some(h => h.id === g.subcategoriaId)) continue;
    porParte.set(g.subcategoriaId, (porParte.get(g.subcategoriaId) ?? 0) + (Number(g.monto) || 0));
  }
  let parte = null;
  let gastadoParte = 0;
  const [mayor] = [...porParte.entries()].sort((a, b) => b[1] - a[1]);
  const hayOtra = delMes.some(g => g.subcategoriaId !== mayor?.[0]);
  if (mayor && hayOtra && mayor[1] / gastado > 0.5) {
    const h = partes.find(x => x.id === mayor[0]);
    parte = { id: h.id, nombre: h.nombre };
    gastadoParte = mayor[1];
  }
  return { categoria, parte, cantidad: delMes.length, gastado, gastadoParte, clave };
}

/**
 * GAS.8f (ADR 182 D6): el límite de la alerta de Límites. Uno solo: el más
 * cerca de pasarse (el de mayor porcentaje entre los que están en alerta);
 * si no hay uno cerca, el que más se pasó.
 *
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {{ presupuesto: object, progreso: ReturnType<typeof calcularProgreso> } | null}
 */
export function limiteDeLaAlerta(presupuestos, gastos, anio, mes) {
  const todos = presupuestosActivos(presupuestos)
    .map(p => ({ presupuesto: p, progreso: calcularProgreso(p, gastos ?? [], anio, mes) }));
  const porPct = (a, b) => b.progreso.porcentaje - a.progreso.porcentaje;
  const cerca = todos.filter(x => x.progreso.estado === 'alerta').sort(porPct)[0];
  if (cerca) return cerca;
  return todos.filter(x => x.progreso.estado === 'excedido').sort(porPct)[0] ?? null;
}

/**
 * Indica si una categoría ya tiene un envelope activo creado.
 * Útil para evitar duplicados en el formulario de creación.
 *
 * @param {string} categoria
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 * @returns {boolean}
 */
export function tienePresupuesto(categoria, presupuestos) {
  return presupuestosActivos(presupuestos).some(p => p.categoria === categoria);
}

/**
 * GAS.7b (ADR 179 D2 y D6): la tarjeta de Límites. Suma los topes activos y lo que
 * va gastado en sus categorías en el mes: lo que queda (negativo si se pasó)
 * y cuántos topes van excedidos.
 *
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {{ asignado:number, gastado:number, queda:number, excedidos:number, cantidad:number }}
 */
export function resumenLimitesDelMes(presupuestos, gastos, anio, mes) {
  const progresos = presupuestosActivos(presupuestos).map(p => calcularProgreso(p, gastos, anio, mes));
  const asignado = progresos.reduce((acc, p) => acc + p.asignado, 0);
  const gastado = progresos.reduce((acc, p) => acc + p.gastado, 0);
  return {
    asignado,
    gastado,
    queda: asignado - gastado,
    excedidos: progresos.filter(p => p.estado === 'excedido').length,
    cantidad: progresos.length,
  };
}

/**
 * Devuelve los envelopes activos que están en estado 'alerta' o 'excedido'
 * en el mes/año dados, ordenados: excedidos primero, luego por porcentaje desc.
 *
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {Array<{categoria:string, estado:string, porcentaje:number, gastado:number, asignado:number}>}
 */
export function alertasLimites(presupuestos, gastos, anio, mes) {
  return presupuestosActivos(presupuestos)
    .map(p => ({ categoria: p.categoria, ...calcularProgreso(p, gastos, anio, mes) }))
    .filter(r => r.estado === 'alerta' || r.estado === 'excedido')
    .sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === 'excedido' ? -1 : 1;
      return b.porcentaje - a.porcentaje;
    });
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida datos crudos de un formulario de presupuesto.
 * Si `presupuestoIdActual` está definido, ignora ese envelope al chequear duplicados
 * (para permitir editar sin que el chequeo falle contra el propio envelope).
 *
 * Las categorías que el usuario creó en Gastos (TX.9b) son válidas: el
 * formulario las ofrece desde que la lista de "gastas acá y no tiene tope" las
 * lista. Se reciben como parámetro para que la función siga siendo pura.
 *
 * @param {Record<string,string>} datos
 * @param {import('../../core/state.js').Presupuesto[]} [presupuestosExistentes=[]]
 * @param {string|null} [presupuestoIdActual=null]
 * @param {{nombre:string}[]} [categoriasPersonalizadas=[]]
 * @returns {string[]} mensajes de error; vacío = válido.
 */
export function validarPresupuesto(
  datos,
  presupuestosExistentes = [],
  presupuestoIdActual = null,
  categoriasPersonalizadas = [],
) {
  const errores = [];

  const esPersonalizada = categoriasPersonalizadas.some(c => c.nombre === datos.categoria);
  if (!datos.categoria?.trim()) {
    errores.push('Elige una categoría.');
  } else if (!CATEGORIAS_GASTO.includes(datos.categoria) && !esPersonalizada) {
    errores.push('Elige una categoría de la lista.');
  }

  // LIM.2 (ADR 164): por subcategoría, el máximo de la categoría es la suma;
  // basta con que una tenga el suyo.
  if (datos.modoLimite === 'subcategorias') {
    if (Object.keys(subcategoriasDeFormulario(datos)).length === 0) {
      errores.push('Escribe el máximo de al menos una subcategoría. Por ejemplo: 200.000');
    }
  } else {
    const monto = Number(datos.montoMensual);
    if (isNaN(monto) || monto <= 0) {
      errores.push('Escribe cuánto quieres gastar al mes. Por ejemplo: 600.000');
    }
  }

  // Duplicado: solo si NO estamos editando el mismo envelope.
  if (errores.length === 0) {
    const duplicado = presupuestosActivos(presupuestosExistentes)
      .some(p => p.categoria === datos.categoria && p.id !== presupuestoIdActual);
    if (duplicado) {
      errores.push(`Ya tienes un límite para "${datos.categoria}": cámbialo desde la lista.`);
    }
  }

  return errores;
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte datos crudos del formulario al shape de S.presupuestos.
 * Asume que los datos ya pasaron `validarPresupuesto()`.
 *
 * @param {Record<string,string>} datos
 * @returns {Omit<import('../../core/state.js').Presupuesto, 'id'>}
 */
export function normalizarPresupuesto(datos) {
  // LIM.2: explícito (null en toda la categoría) para que editar() limpie
  // los máximos por subcategoría al volver al tope único.
  const subcategorias = datos.modoLimite === 'subcategorias' ? subcategoriasDeFormulario(datos) : null;
  return {
    categoria:    datos.categoria,
    montoMensual: subcategorias
      ? Object.values(subcategorias).reduce((a, n) => a + n, 0)
      : Number(datos.montoMensual),
    subcategorias,
    // GAS.8g (ADR 182 D7): "Solo una parte" en la hoja del teléfono.
    ...(subcategorias && datos.soloParte === '1' ? { soloParte: true } : {}),
    activo:       true,
  };
}

// ── POR SUBCATEGORÍA (LIM.2, ADR 164) ────────────────────────────

/**
 * Los máximos por subcategoría que trae el formulario: campos
 * `limiteSub.<id>` con un monto (ya en dígitos). Solo los de la categoría
 * elegida y mayores que cero; un campo vacío es "sin límite".
 *
 * @param {Record<string, string>} datos
 * @returns {Record<string, number>}
 */
export function subcategoriasDeFormulario(datos) {
  const validas = new Set(hijosDeCategoria(SUBCATEGORIAS_GASTO, datos?.categoria).map(h => h.id));
  /** @type {Record<string, number>} */
  const out = {};
  for (const [k, v] of Object.entries(datos ?? {})) {
    if (!k.startsWith('limiteSub.')) continue;
    const id = k.slice('limiteSub.'.length);
    const n = Number(v);
    if (validas.has(id) && Number.isFinite(n) && n > 0) out[id] = n;
  }
  return out;
}

/**
 * ¿El tope va por subcategoría? Solo si guarda al menos un máximo.
 * @param {{ subcategorias?: Record<string, number>|null } | null | undefined} presupuesto
 * @returns {boolean}
 */
export function esLimitePorSubcategoria(presupuesto) {
  return Object.values(presupuesto?.subcategorias ?? {}).some(n => Number(n) > 0);
}

/**
 * GAS.8g (ADR 182 D7): "Solo una parte". El tope guarda sus subcategorías
 * como en el ADR 164, pero con `soloParte` lo gastado en el resto de la
 * categoría no cuenta: el límite es de esa parte y nada más.
 *
 * @param {{ subcategorias?: Record<string, number>|null, soloParte?: boolean } | null | undefined} presupuesto
 * @returns {boolean}
 */
export function esLimiteDeUnaParte(presupuesto) {
  return presupuesto?.soloParte === true && esLimitePorSubcategoria(presupuesto);
}

/**
 * Lo gastado en el mes en las subcategorías con máximo de un tope.
 *
 * @param {import('../../core/state.js').Presupuesto} presupuesto
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {number}
 */
export function gastadoDeLaParte(presupuesto, gastos, anio, mes) {
  const ids = new Set(Object.entries(presupuesto?.subcategorias ?? {})
    .filter(([, n]) => Number(n) > 0).map(([id]) => id));
  return gastosMes(gastos ?? [], anio, mes)
    .filter(g => (g.categoria ?? 'Otros') === presupuesto.categoria && ids.has(g.subcategoriaId))
    .reduce((acc, g) => acc + (g.monto ?? 0), 0);
}

/**
 * Lo que va el mes en cada subcategoría de una categoría, para elegir la
 * parte en "Nuevo límite" (GAS.8g, ADR 182 D7).
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} categoria
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {Record<string, { gastado: number, cantidad: number }>}
 */
export function gastoPorSubcategoria(gastos, categoria, anio, mes) {
  const out = {};
  for (const g of gastosMes(gastos ?? [], anio, mes)) {
    if ((g.categoria ?? 'Otros') !== categoria || !g.subcategoriaId) continue;
    const r = out[g.subcategoriaId] ?? { gastado: 0, cantidad: 0 };
    r.gastado += Number(g.monto) || 0;
    r.cantidad += 1;
    out[g.subcategoriaId] = r;
  }
  return out;
}

/**
 * El progreso de cada subcategoría con máximo, en el orden del catálogo,
 * con el mismo criterio de estado que `calcularProgreso`. Lo que el mes
 * gastó en la categoría sin una de esas subcategorías (otra o ninguna)
 * cuenta solo en el total de la categoría: va aparte, en `sinLimite`.
 *
 * @param {import('../../core/state.js').Presupuesto} presupuesto
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {{ subs: Array<{ id: string, nombre: string, gastado: number, asignado: number, restante: number, porcentaje: number, estado: 'ok'|'alerta'|'excedido' }>, sinLimite: number }}
 */
export function calcularProgresoSubcategorias(presupuesto, gastos, anio, mes) {
  if (!esLimitePorSubcategoria(presupuesto)) return { subs: [], sinLimite: 0 };
  const delMes = gastosMes(gastos ?? [], anio, mes).filter(g => (g.categoria ?? 'Otros') === presupuesto.categoria);
  const topes = presupuesto.subcategorias;
  const subs = hijosDeCategoria(SUBCATEGORIAS_GASTO, presupuesto.categoria)
    .filter(h => Number(topes[h.id]) > 0)
    .map(h => {
      const asignado = Number(topes[h.id]);
      const gastado = delMes.filter(g => g.subcategoriaId === h.id).reduce((a, g) => a + (g.monto ?? 0), 0);
      const porcentaje = Math.round((gastado / asignado) * 100);
      const estado = gastado > asignado * UMBRAL_EXCEDIDO ? 'excedido'
        : gastado >= asignado * UMBRAL_ALERTA ? 'alerta' : 'ok';
      return { id: h.id, nombre: h.nombre, gastado, asignado, restante: asignado - gastado, porcentaje, estado };
    });
  const conTope = new Set(subs.map(s => s.id));
  // GAS.8g: en el límite de una parte, lo demás no cuenta en el total.
  const sinLimite = presupuesto.soloParte === true ? 0
    : delMes.filter(g => !conTope.has(g.subcategoriaId)).reduce((a, g) => a + (g.monto ?? 0), 0);
  return { subs, sinLimite };
}
