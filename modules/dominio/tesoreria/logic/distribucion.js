/**
 * tesoreria/logic/distribucion.js - funciones puras del asistente "Distribuir mi ingreso":
 * contexto, sugerencia de reparto, necesidades, planes por destino y topes.
 *
 * Sub-modulo de tesoreria/logic.js (barrel). Reglas de la capa:
 * - Sin DOM. Sin S directo. Reciben datos, devuelven datos.
 * - Testeable en Node/Vitest sin ningun mock de navegador.
 */

import { obligacionesYAportesDelCobro, frecuenciaPrincipalIngresos, normalizarFrecuenciaAporte } from '../../../infra/vencimientos.js';
import { FACTOR_MENSUAL, isoFecha, ultimoPagoHasta } from './ingresos.js';

/**
 * Suma los gastos fijos activos de S.compromisos proyectados a unidad mensual.
 * Solo cuenta tipo 'fijo'; las deudas tienen su propia cuotaMensual.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @returns {number} COP/mes equivalente.
 */
export function calcularGastosFijosMensuales(compromisos) {
  if (!Array.isArray(compromisos)) return 0;
  return compromisos
    .filter(c => c.activo !== false && c.tipo === 'fijo')
    .reduce((acc, c) => acc + (c.monto ?? 0) * (FACTOR_MENSUAL[c.frecuencia] ?? 0), 0);
}

/**
 * Desglose itemizado y accionable de Necesidades para el Paso 1 del asistente
 * "Distribuir mi ingreso" (MC.7d, ADR 018 revisión 2026-07-02, R1): una fila
 * por gasto fijo y por deuda que toque cubrir con ESTE cobro, con nombre,
 * categoría, lo que hay que pagar, el día de pago y si ya se pagó. El usuario
 * marca cuáles cubre; al confirmar, cada marca genera el mismo registro que su
 * flujo individual existente (pago de fijo o abono de deuda), ver
 * `_aplicarNecesidad` en tesoreria/acciones/distribucion.js.
 *
 * Desde MC.13c-2 (ADR 041) delega en el motor compartido
 * `obligacionesYAportesDelCobro`, con dos consecuencias decididas con Esteban:
 *
 *  1. **Todas las frecuencias** (cierra MC.7g). Antes solo entraban fijos
 *     'Mensual', porque uno Quincenal/Semanal/Diario tiene varias ocurrencias
 *     por periodo y la fila no sabía cuántas cubría. El motor las cuenta: la
 *     fila vale `monto unitario × ocurrencias en el rango`.
 *  2. **"Ya pagado" es por la ventana del cobro**, no por el mes calendario.
 *     La regla vieja marcaba pagadas TODAS las ocurrencias de un quincenal en
 *     cuanto había un solo gasto vinculado en el mes.
 *
 * Muestra `enVentana`: lo que vence entre hoy y el próximo cobro, que es lo que
 * este dinero tiene que cubrir. **Lo `vencido` NO entra aquí** aunque el motor
 * lo calcule: mezclarlo sumaría dos periodos en la misma fila (el arriendo
 * impago del mes pasado más el del que viene = "debes $1.600.000"), y como
 * Finko sólo sabe que algo está pagado si el usuario registró el gasto, a quien
 * no lleve el registro al día le inflaría la checklist. Lo vencido tiene su
 * propio copy en el asistente v2 (MC.13e, puntos 9-10 del brief), separado de
 * lo por vencer, tal como fija el ADR.
 *
 * Una fila por compromiso: `monto` = unitario × ocurrencias en la ventana, así
 * una marca sigue siendo un `Gasto` por el total (lo que hace
 * `_aplicarNecesidad`) y el id de la fila sigue siendo único en el DOM. El
 * motor ya topa la deuda al saldo (BUG-004) y excluye las saldadas.
 *
 * Pura: no lee `S` ni el DOM, no importa otros dominios (ADN #10: el motor es
 * infra, no un dominio).
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @param {import('../../../core/state.js').Gasto[]} [gastos]
 * @param {Date} [hoy]
 * @param {{frecuencia?:string, fechaISO?:string}|null} [cobro] El cobro que se
 *   está distribuyendo. Sin fecha datable (`estadoDistribucion` sólo data
 *   Mensual/Quincenal) se asume que el cobro es hoy: la ventana arranca hoy,
 *   que es exactamente lo que el usuario está repartiendo.
 * @returns {Array<{id:string, nombre:string, categoria:string|null, icono:string|null, tipo:'fijo'|'deuda', monto:number, diaPago:number|null, pagado:boolean, ocurrencias:number}>}
 *   Los no pagados primero (de mayor a menor monto), luego los ya pagados.
 */
export function construirDesgloseNecesidades(compromisos = [], gastos = [], hoy = new Date(), cobro = null) {
  const hoyISO = isoFecha(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));

  const r = obligacionesYAportesDelCobro({
    cobro: {
      frecuencia: cobro?.frecuencia ?? 'Mensual',
      fechaISO:   cobro?.fechaISO   ?? hoyISO,
    },
    compromisos,
    gastos,
    hoyISO,
  });
  if (!r) return [];

  return r.enVentana.map(o => {
    const diaPagoNum = Number(compromisos.find(c => c.id === o.id)?.diaPago);
    return {
      id:        o.id,
      nombre:    o.nombre,
      categoria: o.categoria,
      // CAT.2d: ícono elegido para la categoría 'Otra'/'Otro' de una deuda
      // (mismo campo que ya resuelve el ícono en la lista de Deudas).
      icono:       o.icono,
      tipo:        o.tipo,
      monto:       o.monto,
      diaPago:     Number.isInteger(diaPagoNum) ? diaPagoNum : null,
      pagado:      o.pagado,
      ocurrencias: o.ocurrencias.length,
    };
  });
}

/**
 * Estado de la acción "Distribuir mi ingreso" según la fecha de cobro de los
 * ingresos y el último periodo ya distribuido. Pura (sin S, sin DOM).
 *
 * El "periodo" es la fecha del cobro más reciente (<= hoy y no anterior a la
 * creación del ingreso) entre los ingresos activos con día de pago datable
 * (Mensual / Quincenal). Esa fecha ISO es la clave de de-duplicación.
 *
 * Estados:
 *   'sin-fecha'     : ningún ingreso activo tiene un cobro datable → el caller
 *                     mantiene la acción disponible (no se puede aplicar el guard).
 *   'por-confirmar' : hay un cobro datable pero es ANTERIOR a la fecha de
 *                     creación del ingreso, así que Finko no puede afirmar que
 *                     se recibió (MC.13f). `periodoISO` trae esa fecha
 *                     candidata para que la UI pregunte en vez de asumir.
 *   'listo'         : ya llegó el cobro de este periodo y no se ha distribuido.
 *   'distribuido'   : el cobro de este periodo ya se distribuyó (mismo periodoISO).
 *
 * **Por qué el candidato existe siempre en 'por-confirmar' (MC.13f)**: a esta
 * rama solo se llega si algún ingreso produjo una fecha de cobro válida y TODAS
 * quedaron descartadas por creación tardía. Antes se devolvía `periodoISO: null`
 * y el estado se llamaba 'pendiente', lo que dejaba a quien registraba un
 * ingreso a mitad de periodo (la quincena ya cobrada) sin poder distribuir hasta
 * el cobro siguiente. La fecha candidata no es cosmética: es la que produce el
 * `periodoISO` que el guard de de-duplicación necesita para sellar
 * `ultimaDistribucionPeriodo`; sin ella, habilitar el botón permitiría
 * distribuir el mismo periodo más de una vez.
 *
 * `cobroConfirmadoPeriodo` es la respuesta del usuario a esa pregunta (vive en
 * `S.config`, junto a `ultimaDistribucionPeriodo` y con el mismo trato de campo
 * opcional sin bump de schema): si coincide con el candidato, el cobro pasa a
 * contar como recibido y el estado sigue el camino normal ('listo' /
 * 'distribuido'). Una confirmación vieja no estorba a un cobro datado después,
 * porque solo se consulta en la rama del candidato.
 *
 * @param {import('../../../core/state.js').Ingreso[]} ingresos
 * @param {string|null} ultimaDistribucionPeriodo - periodoISO de la última distribución.
 * @param {Date} [hoy]
 * @param {string|null} [cobroConfirmadoPeriodo] - periodoISO que el usuario ya
 *   confirmó haber recibido (MC.13f).
 * @returns {{ estado:'sin-fecha'|'por-confirmar'|'listo'|'distribuido', periodoISO: string|null, esHoy: boolean }}
 */
export function estadoDistribucion(
  ingresos,
  ultimaDistribucionPeriodo = null,
  hoy = new Date(),
  cobroConfirmadoPeriodo = null,
) {
  const base = { estado: 'sin-fecha', periodoISO: null, esHoy: false };
  if (!Array.isArray(ingresos)) return base;

  const activos = ingresos.filter(i => i.activo !== false && i.diaPago);
  let hayDatable = false;  // algún ingreso con frecuencia datable (Mensual/Quincenal)
  let mejorCobro = null;   // periodoISO más reciente de un cobro ya recibido
  let candidato  = null;   // el más reciente descartado por creación tardía (MC.13f)

  for (const i of activos) {
    const ultISO = ultimoPagoHasta(i.frecuencia, i.diaPago, hoy);
    if (!ultISO) continue;          // frecuencia no datable (Anual, etc.)
    hayDatable = true;
    // No datar cobros anteriores a la creación del ingreso: evita el falso
    // "ya recibiste" al registrar hoy un ingreso cuyo día de pago ya pasó.
    // El descartado no se tira: queda como candidato a confirmar (MC.13f).
    const creadoISO = typeof i.fechaCreacion === 'string' ? i.fechaCreacion.slice(0, 10) : null;
    if (creadoISO && ultISO < creadoISO) {
      if (!candidato || ultISO > candidato) candidato = ultISO;
      continue;
    }
    if (!mejorCobro || ultISO > mejorCobro) mejorCobro = ultISO;
  }

  if (!hayDatable) return base;                                          // 'sin-fecha'

  // Sin cobro datado, el candidato manda: confirmado por el usuario cuenta como
  // recibido; sin confirmar, la UI pregunta antes de dejar repartir.
  if (!mejorCobro) {
    if (cobroConfirmadoPeriodo !== candidato) {
      return { estado: 'por-confirmar', periodoISO: candidato, esHoy: false };
    }
    mejorCobro = candidato;
  }

  const hoyISO = isoFecha(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
  return {
    estado:     ultimaDistribucionPeriodo === mejorCobro ? 'distribuido' : 'listo',
    periodoISO: mejorCobro,
    esHoy:      mejorCobro === hoyISO,
  };
}

/**
 * Cuenta de destino del ingreso principal (MC.13e-2f-1, mitad desbloqueada de
 * MC.13e-2f): el asistente parte de `Ingreso.cuentaId` (MC.13d) en vez de
 * preguntar siempre con `resolverCuenta()`. El "principal" es el mismo
 * criterio de `frecuenciaPrincipalIngresos` (la frecuencia con más ingresos
 * activos); entre esos, el primero que ya tiene `cuentaId` guardado. `null`
 * si ninguno la tiene (el caller cae a `resolverCuenta()` como hoy).
 *
 * Pura: no lee `S` ni el DOM.
 *
 * @param {import('../../../core/state.js').Ingreso[]} ingresos
 * @returns {string|null}
 */
export function cuentaIngresoPrincipal(ingresos = []) {
  const activos = (ingresos ?? []).filter(i => i.activo !== false);
  if (activos.length === 0) return null;

  const principal = frecuenciaPrincipalIngresos(activos);
  const conCuenta = activos.find(i =>
    normalizarFrecuenciaAporte(i.frecuencia) === principal && i.cuentaId);
  return conCuenta?.cuentaId ?? null;
}

// ── DISTRIBUCIÓN ADAPTATIVA DEL INGRESO (Fase 3) ─────────────────

export const PRESETS_DISTRIBUCION = [
  { id: 'auto',     label: 'Automático', n: 0,  e: 0,  a: 0  },
  { id: '50-30-20', label: '50/30/20',   n: 50, e: 30, a: 20 },
  { id: '70-20-10', label: '70/20/10',   n: 70, e: 20, a: 10 },
  { id: '60-20-20', label: '60/20/20',   n: 60, e: 20, a: 20 },
];

/**
 * Valida una distribución de porcentajes creada por el usuario: los 3 valores
 * deben ser números finitos entre 0 y 100, y sumar exactamente 100.
 * Pura: no lee S, no toca el DOM.
 *
 * @param {{n:number, e:number, a:number}|null|undefined} d
 * @returns {boolean}
 */
export function esDistribucionPersonalizadaValida(d) {
  if (!d || typeof d !== 'object') return false;
  const { n, e, a } = d;
  if (![n, e, a].every(v => Number.isFinite(v) && v >= 0 && v <= 100)) return false;
  return n + e + a === 100;
}

/**
 * Aporte mensual ideal para UN objetivo con fecha: el faltante repartido
 * entre los meses que quedan hasta esa fecha, redondeado hacia arriba (mejor
 * pasarse un poco que llegar corto). 0 si ya se cumplió, si no tiene fecha,
 * o si la fecha ya pasó. Fórmula compartida por `calcularAporteMensualObjetivos`
 * (total agregado) y `construirDesgloseAhorroPorObjetivo` (fila por fila,
 * MC.7a, ADR 018) para no duplicar el cálculo.
 *
 * @param {number} montoObjetivo
 * @param {number} montoActual
 * @param {string|null|undefined} fecha - YYYY-MM-DD.
 * @param {number} tsHoy - `Date.getTime()` de "hoy".
 * @returns {number}
 */
function _aporteMensualObjetivo(montoObjetivo, montoActual, fecha, tsHoy) {
  const faltante = Math.max(0, (Number(montoObjetivo) || 0) - (Number(montoActual) || 0));
  if (faltante <= 0 || !fecha) return 0;
  const msRestantes = new Date(fecha).getTime() - tsHoy;
  if (msRestantes <= 0) return 0; // fecha ya pasó
  const mesesRestantes = Math.max(1, Math.round(msRestantes / (1000 * 60 * 60 * 24 * 30.44)));
  return Math.ceil(faltante / mesesRestantes);
}

/**
 * Calcula cuánto aportar por mes para llegar a tiempo a todas las metas
 * y apartados con fecha objetivo que aún tienen saldo pendiente.
 * Pura: recibe arrays planos, sin leer S ni el DOM.
 *
 * @param {Array<{montoObjetivo:number, montoActual:number, fechaLimite:string, completada:boolean}>} metas
 * @param {Array<{montoObjetivo:number, montoActual:number, fechaObjetivo:string|null, completado:boolean}>} apartados
 * @param {Date} [hoy]
 * @returns {number} Aporte mensual total necesario (COP, sin decimales).
 */
export function calcularAporteMensualObjetivos(metas = [], apartados = [], hoy = new Date()) {
  const tsHoy = hoy instanceof Date ? hoy.getTime() : Date.now();

  const aportesMetas = metas
    .filter(m => !m.completada && m.fechaLimite)
    .map(m => _aporteMensualObjetivo(m.montoObjetivo, m.montoActual, m.fechaLimite, tsHoy));
  const aportesApartados = apartados
    .filter(a => !a.completado && a.fechaObjetivo)
    .map(a => _aporteMensualObjetivo(a.montoObjetivo, a.montoActual, a.fechaObjetivo, tsHoy));

  return [...aportesMetas, ...aportesApartados].reduce((sum, monto) => sum + monto, 0);
}

/**
 * Desglose de aportes de ahorro sugeridos por objetivo, para las filas de
 * Ahorro del panel "Distribuir mi ingreso" (MC.7a/MC.7b, ADR 018 decisión 3).
 * Reparte un aporte sugerido POR CADA meta y apartado activo, usando la misma
 * fórmula que `calcularAporteMensualObjetivos` (faltante entre meses
 * restantes) pero fila por fila en vez de solo el total. Los objetivos sin
 * fecha no se pueden calcular con certeza: sugieren 0 en vez de adivinar
 * (decisión del usuario). Cada fila expone `sinFecha` para que la vista
 * muestre un hint invitando a ponerle fecha al objetivo (MC.7b).
 *
 * El fondo de emergencia conserva su prioridad: recibe el excedente del
 * presupuesto de ahorro que quede tras los aportes sugeridos a metas y
 * apartados (nunca negativo). Si el fondo ya está completo, o si los
 * objetivos ya consumen todo el presupuesto, el fondo queda en 0. La suma de
 * los montos puede superar `budgetAhorro` si hay objetivos urgentes; eso se
 * valida en la capa que integra el plan (`resumirPlanDistribucion`), no aquí:
 * todo es editable, el auto-cálculo es solo el punto de partida.
 *
 * Pura: no lee `S` ni el DOM, no importa otros dominios (ADN #10).
 *
 * @param {{
 *   metas?:       Array<{id:string, nombre:string, montoObjetivo:number, montoActual:number, fechaLimite:string|null, completada:boolean}>,
 *   apartados?:   Array<{id:string, nombre:string, montoObjetivo:number, montoActual:number, fechaObjetivo:string|null, completado:boolean}>,
 *   fondo?:       {activo:boolean, completado:boolean}|null,
 *   budgetAhorro?: number,
 *   hoy?:         Date,
 * }} [args]
 * @returns {Array<{tipo:'fondo'|'meta'|'apartado', id:string|null, nombre:string, monto:number, sinFecha:boolean, autoExcedente?:boolean}>}
 *   Fondo primero (si activo), luego metas, luego apartados.
 *   `sinFecha` siempre es `false` para la fila del fondo (no aplica).
 *   `autoExcedente` solo existe en la fila del fondo: `true` cuando está
 *   incompleto, es decir, cuando su sugerencia es el excedente del presupuesto
 *   y debe re-absorberlo en vivo si el presupuesto cambia (R3, MC.7d).
 */
export function construirDesgloseAhorroPorObjetivo({
  metas = [], apartados = [], fondo = null, budgetAhorro = 0, hoy = new Date(),
} = {}) {
  const tsHoy  = hoy instanceof Date ? hoy.getTime() : Date.now();
  const budget = Math.max(0, Math.round(Number(budgetAhorro) || 0));

  const filasMetas = metas
    .filter(m => m.completada !== true)
    .map(m => ({
      tipo: 'meta', id: m.id, nombre: m.nombre,
      monto: _aporteMensualObjetivo(m.montoObjetivo, m.montoActual, m.fechaLimite, tsHoy),
      sinFecha: !m.fechaLimite,
    }));

  const filasApartados = apartados
    .filter(a => a.completado !== true)
    .map(a => ({
      tipo: 'apartado', id: a.id, nombre: a.nombre,
      monto: _aporteMensualObjetivo(a.montoObjetivo, a.montoActual, a.fechaObjetivo, tsHoy),
      sinFecha: !a.fechaObjetivo,
    }));

  const totalObjetivos = [...filasMetas, ...filasApartados].reduce((s, f) => s + f.monto, 0);
  const excedente = Math.max(0, budget - totalObjetivos);

  const filas = [];
  if (fondo && fondo.activo) {
    filas.push({
      tipo: 'fondo', id: null, nombre: 'Fondo de emergencia',
      monto: fondo.completado ? 0 : excedente,
      sinFecha: false,
      autoExcedente: fondo.completado !== true,
    });
  }
  filas.push(...filasMetas, ...filasApartados);

  return filas;
}

/**
 * Presupuestos de Ahorro y Estilo de vida sobre el remanente real del cobro
 * (MC.7d, ADR 018 revisión 2026-07-02, R3): el asistente sugiere sus aportes
 * de ahorro sobre lo que queda del monto a distribuir tras las Necesidades
 * marcadas en el Paso 1, no sobre el porcentaje teórico del split completo.
 *
 * Reglas:
 * - El remanente se reparte entre Ahorro y Estilo de vida conservando la
 *   proporción del split (`ahorroPct : estiloVidaPct`): si las Necesidades
 *   marcadas pesan más que su porcentaje teórico, ambos grupos se encogen en
 *   proporción en vez de sugerir dinero que ya no queda.
 * - Ningún grupo supera su sugerencia teórica (`pct% × monto`): marcar menos
 *   Necesidades no infla el ahorro sugerido, porque lo no marcado sigue
 *   comprometido (se paga después desde Calendario o Deudas, no es excedente).
 * - `estiloVida` es el resto del remanente tras el ahorro (topado a su
 *   teórico), así `ahorro + estiloVida` nunca supera el remanente.
 *
 * Pura: no lee `S` ni el DOM.
 *
 * @param {number} montoIngreso Monto a distribuir en este cobro.
 * @param {number} necesidadesMarcadas Suma de las Necesidades marcadas en el Paso 1.
 * @param {number} ahorroPct % del split para Ahorro (0-100).
 * @param {number} estiloVidaPct % del split para Estilo de vida (0-100).
 * @returns {{remanente:number, ahorro:number, estiloVida:number}}
 */
export function presupuestosSobreRemanente(montoIngreso, necesidadesMarcadas, ahorroPct, estiloVidaPct) {
  const monto = Number(montoIngreso) || 0;
  const nec   = Math.max(0, Number(necesidadesMarcadas) || 0);
  const a     = Math.max(0, Number(ahorroPct) || 0);
  const e     = Math.max(0, Number(estiloVidaPct) || 0);

  const remanente = Math.max(0, monto - nec);
  if (monto <= 0 || remanente <= 0) return { remanente: 0, ahorro: 0, estiloVida: 0 };

  const ahorro = a > 0
    ? Math.min(Math.round(monto * a / 100), Math.round(remanente * a / (a + e)))
    : 0;
  const estiloVida = Math.min(Math.round(monto * e / 100), remanente - ahorro);
  return { remanente, ahorro, estiloVida };
}

/**
 * Promedio mensual del gasto variable de los últimos meses completos (MC.6c):
 * el mejor proxy del estilo de vida real del usuario. Variable = gasto
 * registrado a mano, sin vínculo a un compromiso (`compromisoId`) y fuera de
 * las categorías internas ('Deudas' = abonos, 'Ahorro' = aportes,
 * 'Gastos fijos' = pagos de Calendario): lo demás sale del presupuesto de
 * Estilo de vida en la práctica.
 *
 * El mes corriente se excluye (está a medias). Solo promedia los meses que
 * tienen algún gasto: un mes sin registros no diluye el promedio (el usuario
 * pudo no usar la app). Sin ningún mes con datos devuelve 0 (señal apagada).
 *
 * @param {import('../../../core/state.js').Gasto[]} gastos
 * @param {Date} [hoy]
 * @param {number} [meses=3] Ventana de meses completos hacia atrás.
 * @returns {number} COP/mes (entero, ≥ 0).
 */
export function calcularGastoVariablePromedio(gastos, hoy = new Date(), meses = 3) {
  const lista = Array.isArray(gastos) ? gastos : [];
  const EXCLUIDAS = new Set(['Deudas', 'Ahorro', 'Gastos fijos']);

  const totales = [];
  for (let i = 1; i <= meses; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const prefijo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const suma = lista
      .filter(g => g && typeof g.fecha === 'string' && g.fecha.startsWith(prefijo)
        && !g.compromisoId && !EXCLUIDAS.has(g.categoria))
      .reduce((s, g) => s + (Number(g.monto) || 0), 0);
    if (suma > 0) totales.push(suma);
  }

  if (totales.length === 0) return 0;
  return Math.round(totales.reduce((a, b) => a + b, 0) / totales.length);
}

/**
 * Construye el contexto que espera `sugerirDistribucionIngreso` a partir de los
 * datos crudos del estado (compromisos, ahorro, metas, apartados, inversiones,
 * presupuestos, config). Centraliza la lectura de la "realidad registrada" para
 * que Mis cuentas (la distribución) y Límites (el seguimiento, MC.5) construyan
 * el reparto sobre exactamente los mismos insumos.
 *
 * Pura: recibe las porciones del estado como argumento (no lee el singleton S
 * ni el DOM). Se invoca como `construirContextoDistribucion(S)` porque S ya
 * expone estas claves; los tests pueden pasar objetos mínimos.
 *
 * @param {{
 *   compromisos?:  import('../../../core/state.js').Compromiso[],
 *   ahorro?:       import('../../../core/state.js').Ahorro|null,
 *   metas?:        import('../../../core/state.js').Meta[],
 *   apartados?:    import('../../../core/state.js').Apartado[],
 *   inversiones?:  import('../../../core/state.js').Inversion[],
 *   presupuestos?: import('../../../core/state.js').Presupuesto[],
 *   gastos?:       import('../../../core/state.js').Gasto[],
 *   config?:       import('../../../core/state.js').Config|null,
 * }} [estado]
 * @returns {Parameters<typeof sugerirDistribucionIngreso>[1]}
 */
export function construirContextoDistribucion({
  compromisos  = [],
  ahorro       = null,
  metas        = [],
  apartados    = [],
  inversiones  = [],
  presupuestos = [],
  gastos       = [],
  config       = null,
} = {}) {
  const gastosFijosMensuales = calcularGastosFijosMensuales(compromisos ?? []);

  const tieneDeudas = (compromisos ?? [])
    .some(c => c.activo !== false && (c.tipo === 'deuda-entidad' || c.tipo === 'deuda-personal'));

  const tieneFondoActivo = ahorro?.fondoEmergencia?.activo === true;
  const montoFondo = (ahorro?.fondoEmergencia?.montoActual ?? 0)
    + (ahorro?.aportes ?? []).reduce((acc, a) => acc + (a.monto ?? 0), 0);
  const objetivoFondo = tieneFondoActivo && gastosFijosMensuales > 0
    ? gastosFijosMensuales * (ahorro?.fondoEmergencia?.metaMeses ?? 3)
    : 0;
  const fondoCompleto = tieneFondoActivo && objetivoFondo > 0 && montoFondo >= objetivoFondo;

  const tieneInversiones = (inversiones ?? []).length > 0;

  // Cuotas mínimas mensuales de todas las deudas activas (Necesidades, ADR 013).
  const cuotasDeudaMensuales = (compromisos ?? [])
    .filter(c => c.activo !== false
      && (c.tipo === 'deuda-entidad' || c.tipo === 'deuda-personal'))
    .reduce((sum, c) => sum + (Number(c.cuotaMensual) || 0), 0);

  // Faltante del fondo de emergencia (Ahorro, ADR 013).
  const faltanteFondo = (() => {
    const fe = ahorro?.fondoEmergencia;
    if (!fe?.activo || fondoCompleto) return 0;
    const objetivo = gastosFijosMensuales > 0
      ? gastosFijosMensuales * (fe.metaMeses ?? 3)
      : 0;
    if (objetivo <= 0) return 0;
    const actual = (Number(fe.montoActual) || 0)
      + (ahorro?.aportes ?? []).reduce((a, ap) => a + (Number(ap.monto) || 0), 0);
    return Math.max(0, objetivo - actual);
  })();

  // Aporte mensual para metas y apartados con fecha objetivo (Ahorro, ADR 013).
  const metasConFecha     = (metas     ?? []).filter(m => !m.completada && m.fechaLimite);
  const apartadosConFecha = (apartados ?? []).filter(a => !a.completado && a.fechaObjetivo);
  const aporteMensualObjetivos = calcularAporteMensualObjetivos(metasConFecha, apartadosConFecha);

  // Suma de límites de gasto (informativo: valida el Estilo de vida sugerido).
  const sumaLimites = (presupuestos ?? [])
    .reduce((sum, p) => sum + (Number(p.montoMensual) || 0), 0);

  // Gastos ya registrados en el mes calendario actual (MC.11: déficit real).
  const ahora   = new Date();
  const prefijo = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  const gastosDelMes = (gastos ?? [])
    .filter(g => g?.fecha?.startsWith(prefijo))
    .reduce((sum, g) => sum + (Number(g.monto) || 0), 0);

  // Historial de gasto variable como proxy del estilo de vida real (MC.6c).
  const gastoVariablePromedio = calcularGastoVariablePromedio(gastos ?? [], ahora);

  return {
    gastosFijosMensuales,
    cuotasDeudaMensuales,
    faltanteFondo,
    aporteMensualObjetivos,
    sumaLimites,
    gastosDelMes,
    gastoVariablePromedio,
    tieneDeudas,
    tieneFondoActivo,
    fondoCompleto,
    tieneInversiones,
    presetId:                  config?.presetDistribucion ?? 'auto',
    distribucionPersonalizada: config?.distribucionPersonalizada ?? null,
  };
}

// Constantes del modelo de pisos (ADR 013, MC.6a; revisión MC.10).
const _PISO_EV_PCT     = 10;  // % mínimo de estilo de vida (sostenibilidad)
const _PISO_AHORRO_PCT = 5;   // % mínimo de ahorro cuando el margen es corto (MC.10)
const _HORIZONTE_FONDO = 12;  // meses para cerrar el fondo incompleto
const _BASE_AHORRO_PCT = 20;  // ahorro base sano cuando no hay prioridades activas

/**
 * Sugiere cómo distribuir el ingreso mensual en 3 grupos: Necesidades,
 * Estilo de vida y Ahorro. El modo 'auto' usa un modelo de pisos por prioridad
 * sobre los datos reales registrados (ADR 013, MC.6a).
 * Orientativo: nunca prescriptivo. Usa solo datos registrados en Finko.
 *
 * @param {number} ingresoMensual
 * @param {{
 *   gastosFijosMensuales?:    number,
 *   cuotasDeudaMensuales?:    number,
 *   faltanteFondo?:           number,
 *   aporteMensualObjetivos?:  number,
 *   sumaLimites?:             number,
 *   gastosDelMes?:            number,
 *   gastoVariablePromedio?:   number,
 *   tieneDeudas?:             boolean,
 *   tieneFondoActivo?:        boolean,
 *   fondoCompleto?:           boolean,
 *   tieneInversiones?:        boolean,
 *   presetId?:                string,
 *   distribucionPersonalizada?: {n:number, e:number, a:number}|null,
 * }} [contexto]
 * @returns {{
 *   ingresoMensual:  number,
 *   pctFijos:        number,
 *   pctObligaciones: number,
 *   metodo:          string,
 *   razon:           string,
 *   alertas:         string[],
 *   ctas:            {label:string, seccion:string}[],
 *   split: {
 *     necesidades: {pct:number, monto:number, label:string},
 *     estiloVida:  {pct:number, monto:number, label:string},
 *     ahorro:      {pct:number, monto:number, label:string},
 *   },
 * } | null}
 */
export function sugerirDistribucionIngreso(ingresoMensual, {
  gastosFijosMensuales    = 0,
  cuotasDeudaMensuales    = 0,
  faltanteFondo           = 0,
  aporteMensualObjetivos  = 0,
  sumaLimites             = 0,
  gastosDelMes            = 0,
  gastoVariablePromedio   = 0,
  tieneDeudas             = false,
  tieneFondoActivo        = false,
  fondoCompleto           = false,
  tieneInversiones        = false,
  presetId                = 'auto',
  distribucionPersonalizada = null,
} = {}) {
  if (!ingresoMensual || ingresoMensual <= 0) return null;

  const pctFijos = gastosFijosMensuales > 0
    ? Math.round((gastosFijosMensuales / ingresoMensual) * 100)
    : 0;

  const montoNec = (Number(gastosFijosMensuales) || 0) + (Number(cuotasDeudaMensuales) || 0);
  const pctObligaciones = montoNec > 0
    ? Math.min(100, Math.round(montoNec / ingresoMensual * 100))
    : 0;

  let necesidadesPct;
  let estiloVidaPct;
  let ahorroInvPct;
  let metodo;
  let razon;
  const alertas = [];
  const ctas    = [];

  const preset = presetId === 'personalizado'
    ? (esDistribucionPersonalizadaValida(distribucionPersonalizada)
        ? { label: 'Personalizada', ...distribucionPersonalizada }
        : null)
    : (presetId && presetId !== 'auto'
        ? PRESETS_DISTRIBUCION.find(p => p.id === presetId)
        : null);

  if (preset) {
    // ── Preset fijo o personalizado: aplica tal cual ──
    necesidadesPct = preset.n;
    estiloVidaPct  = preset.e;
    ahorroInvPct   = preset.a;
    metodo = preset.label;
    razon  = pctFijos > 0
      ? `Distribución ${preset.label} aplicada. Tus gastos fijos son el ${pctFijos}% de tus ingresos.`
      : `Distribución ${preset.label} aplicada.`;
    if (pctFijos > necesidadesPct) {
      const sujeto = presetId === 'personalizado' ? 'tu distribución' : 'el preset';
      alertas.push(`Tus gastos fijos (${pctFijos}%) superan lo asignado a necesidades (${necesidadesPct}%). Considera ajustar ${sujeto}.`);
    }
  } else {
    // ── Modo auto: modelo de pisos por prioridad (ADR 013, MC.6a) ──
    metodo = 'pisos';

    if (montoNec >= ingresoMensual) {
      // Caso extremo: obligaciones cubren todo el ingreso.
      necesidadesPct = 100;
      estiloVidaPct  = 0;
      ahorroInvPct   = 0;
      razon = `Tus obligaciones fijas (gastos en Calendario y cuotas de deudas) consumen la totalidad de tu ingreso registrado. Reducir compromisos es urgente.`;
      alertas.push(`Tus obligaciones (${pctObligaciones}%) consumen todo tu ingreso: no queda margen para ahorro ni estilo de vida. Revisa gastos fijos y deudas.`);
    } else {
      // Paso 2: ahorro ideal (prioridades en orden).
      let montoAhorroIdeal = 0;
      if (!fondoCompleto && faltanteFondo > 0) {
        montoAhorroIdeal += Math.ceil(faltanteFondo / _HORIZONTE_FONDO);
      }
      if (aporteMensualObjetivos > 0) {
        montoAhorroIdeal += aporteMensualObjetivos;
      }
      const tieneAhorroEspecifico = montoAhorroIdeal > 0;
      if (!tieneAhorroEspecifico) {
        montoAhorroIdeal = Math.round(ingresoMensual * _BASE_AHORRO_PCT / 100);
      }

      // MC.11: déficit real. Los gastos ya registrados este mes superan el
      // ingreso (ej. un gasto fijo que no está en Calendario): cualquier %
      // de ahorro sería inventado. Se comunica y el ahorro va a 0.
      const deficitReal = gastosDelMes > ingresoMensual;

      // Paso 3: repartir el residuo entre Ahorro y Estilo de vida.
      // El piso de EV cede ante Necesidades (piso duro) pero gana sobre el
      // ahorro EXTRA; desde MC.10 el ahorro tiene su propio piso que compite:
      // si el margen no alcanza para ambos pisos, el residuo se reparte
      // proporcional a los pisos, y el ahorro solo queda en $0 cuando de
      // verdad no hay margen (o hay déficit real).
      const residuo    = ingresoMensual - montoNec;
      // MC.6c: el historial de gasto variable eleva el piso de Estilo de
      // vida a la vida real del usuario: sugerir menos de lo que de verdad
      // gasta produce planes incumplibles (y ahorros que no se concretan).
      // El 10% del ingreso sigue siendo el mínimo de sostenibilidad.
      const pisoEVBase = Math.round(ingresoMensual * _PISO_EV_PCT / 100);
      const gastoVar   = Math.max(0, Math.round(Number(gastoVariablePromedio) || 0));
      const pisoEV     = Math.max(pisoEVBase, gastoVar);
      const pisoAhorro = Math.round(ingresoMensual * _PISO_AHORRO_PCT / 100);

      let montoAhorro;
      if (deficitReal) {
        montoAhorro = 0;
      } else if (residuo >= montoAhorroIdeal + pisoEV) {
        montoAhorro = montoAhorroIdeal;
      } else if (residuo >= pisoAhorro + pisoEV) {
        // Alcanza para ambos pisos: EV conserva el suyo y el resto va a
        // ahorro (sin superar su ideal).
        montoAhorro = Math.min(montoAhorroIdeal, residuo - pisoEV);
      } else {
        // MC.10: ni los dos pisos caben. Reparto proporcional a los pisos
        // (con piso EV 10% y piso ahorro 5%, el ahorro recibe 1/3 del margen).
        montoAhorro = Math.min(
          montoAhorroIdeal,
          Math.round(residuo * pisoAhorro / (pisoAhorro + pisoEV)),
        );
      }

      // Paso 4: convertir a pct, residuo de redondeo en estiloVida.
      necesidadesPct = Math.min(100, Math.round(montoNec    / ingresoMensual * 100));
      ahorroInvPct   = Math.min(100 - necesidadesPct, Math.round(montoAhorro / ingresoMensual * 100));
      estiloVidaPct  = 100 - necesidadesPct - ahorroInvPct;

      if (deficitReal) {
        const pctGastado = Math.round(gastosDelMes / ingresoMensual * 100);
        razon = `Este mes tus gastos registrados ya van en el ${pctGastado}% de tu ingreso: estás gastando más de lo que entra, así que no sugerimos ahorro hasta cerrar ese hueco.`;
        alertas.push('Gastos del mes por encima del ingreso: revisa tus gastos en Análisis y recorta primero Estilo de vida. Si un gasto fijo no está en Calendario, regístralo para que el plan lo tenga en cuenta.');
      } else {
        // Razón: refleja qué componentes influyeron.
        const partesRazon = [];
        if (pctObligaciones > 0) {
          partesRazon.push(`tus obligaciones son el ${pctObligaciones}% de tu ingreso`);
        }
        if (!fondoCompleto && faltanteFondo > 0) {
          partesRazon.push('tu fondo de emergencia aún no está completo');
        }
        if (aporteMensualObjetivos > 0) {
          partesRazon.push('tienes objetivos con fecha');
        }
        // MC.6c: el historial de gasto variable influyó en el reparto.
        if (pisoEV > pisoEVBase) {
          const pctVar = Math.round(pisoEV / ingresoMensual * 100);
          partesRazon.push(`tu gasto variable reciente promedia el ${pctVar}% de tu ingreso y el plan lo respeta`);
        }
        // MC.6c: con el fondo completo, el ahorro apunta a las inversiones.
        if (fondoCompleto && tieneInversiones) {
          partesRazon.push('tu fondo está completo, así que el ahorro puede ir a tus inversiones');
        }
        razon = partesRazon.length > 0
          ? `Calculamos tu distribución según tus datos: ${partesRazon.join(', ')}.`
          : 'Registra tus gastos fijos en Calendario y tus deudas en la sección Deudas para una recomendación a tu medida. Por ahora aplicamos una base saludable del 20% de ahorro.';
      }

      // MC.6c: si el estilo de vida real apretó el ahorro por debajo de su
      // ideal, decirlo con el rubro accionable (mismo espíritu que MC.11).
      if (!deficitReal && pisoEV > pisoEVBase && montoAhorro < montoAhorroIdeal) {
        const pctVar = Math.round(pisoEV / ingresoMensual * 100);
        alertas.push(`Tu gasto variable de los últimos meses promedia el ${pctVar}% de tu ingreso y limita cuánto puedes ahorrar. Si quieres ahorrar más, ese es el rubro a recortar (revísalo en Análisis).`);
      }

      // Alerta si las obligaciones dejan poco margen.
      if (pctObligaciones >= 80) {
        alertas.push(`Tus obligaciones representan el ${pctObligaciones}% de tu ingreso, dejando poco margen. Revisa si puedes reducir gastos fijos o deudas.`);
      }

      // Alerta informativa si los límites de gasto superan el Estilo de vida sugerido.
      const montoEV = Math.round(ingresoMensual * estiloVidaPct / 100);
      if (sumaLimites > 0 && sumaLimites > montoEV * 1.1) {
        alertas.push(`Tus límites de gasto suman más del presupuesto sugerido para Estilo de vida. Considera ajustar los límites o el preset.`);
      }
    }
  }

  if (!tieneFondoActivo) {
    alertas.push('Sin fondo de emergencia activo: destina el porcentaje de ahorro aquí primero.');
    ctas.push({ label: 'Activar fondo de emergencia', seccion: 'ahorro' });
  } else if (!fondoCompleto) {
    alertas.push('Tu fondo de emergencia aún no está completo: dale prioridad al ahorro.');
    ctas.push({ label: 'Ver progreso del fondo', seccion: 'ahorro' });
  } else if (!tieneInversiones) {
    ctas.push({ label: 'Explorar inversiones', seccion: 'inversion' });
  } else {
    // MC.6c: fondo completo y ya invierte: la siguiente prioridad del
    // ahorro son sus inversiones.
    ctas.push({ label: 'Aportar a tus inversiones', seccion: 'inversion' });
  }

  if (tieneDeudas) {
    alertas.push('Tienes deudas activas: antes de reducir tu ahorro, intenta recortar primero tu presupuesto de estilo de vida.');
    ctas.push({ label: 'Ver estrategia de deudas', seccion: 'compromisos' });
  }

  // CTA cruzado (MC.5e, ADR 017 decisión 7): Mis cuentas planifica el reparto,
  // Límites de gasto vigila que se cumpla. Siempre presente cuando hay distribución.
  ctas.push({ label: 'Ver tu seguimiento en Límites de gasto', seccion: 'presupuesto' });

  const nMonto = Math.round(ingresoMensual * necesidadesPct / 100);
  const eMonto = Math.round(ingresoMensual * estiloVidaPct  / 100);
  const aMonto = Math.round(ingresoMensual * ahorroInvPct   / 100);

  return {
    ingresoMensual,
    pctFijos,
    pctObligaciones,
    metodo,
    razon,
    alertas,
    ctas,
    split: {
      necesidades: { pct: necesidadesPct, monto: nMonto, label: 'Necesidades' },
      estiloVida:  { pct: estiloVidaPct,  monto: eMonto, label: 'Estilo de vida' },
      ahorro:      { pct: ahorroInvPct,   monto: aMonto, label: tieneInversiones ? 'Ahorro e inversión' : 'Ahorro' },
    },
  };
}

// ── DISTRIBUIR MI INGRESO: grupo Ahorro (ADR 012, MC.4a) ─────────

/**
 * Resume un plan de distribución frente al monto total del ingreso.
 *
 * @param {number} montoIngreso - total que se está repartiendo.
 * @param {Array<{ monto: number }>} destinos - filas del plan (cualquier grupo).
 * @returns {{ asignado: number, sinAsignar: number, excede: boolean }}
 *   asignado: suma de los montos. sinAsignar: lo que queda del ingreso (>= 0).
 *   excede: true si se asignó más que el ingreso (no se puede confirmar).
 */
export function resumirPlanDistribucion(montoIngreso, destinos) {
  const asignado = (destinos ?? []).reduce((s, d) => s + (Number(d.monto) || 0), 0);
  const m = Number(montoIngreso) || 0;
  return {
    asignado,
    sinAsignar: Math.max(0, m - asignado),
    excede:     asignado > m,
  };
}


/**
 * Tope del abono extra a una deuda cuando su cuota del checklist de
 * Necesidades ya está marcada en el mismo movimiento (BUG-009). El checklist
 * y "Abonar extra a deudas" leen el mismo `saldoTotal` de forma independiente;
 * sin coordinar sus topes, marcar ambos para la misma deuda podía debitar de
 * la cuenta más de lo que la deuda realmente debe. El extra nunca puede
 * superar lo que queda del saldo después de la cuota marcada; si la cuota ya
 * cubre todo el saldo, el extra queda en 0.
 *
 * Pura: no lee `S` ni el DOM.
 *
 * @param {number} saldoTotal Saldo pendiente de la deuda antes de aplicar nada.
 * @param {number} cuotaMarcada Cuota de esta deuda marcada en el checklist (0 si no está marcada).
 * @param {number} extraSolicitado Monto que el usuario escribió en "Abonar extra".
 * @returns {number}
 */
export function topeAbonoExtraDeuda(saldoTotal, cuotaMarcada, extraSolicitado) {
  const disponible = Math.max(0, (Number(saldoTotal) || 0) - (Number(cuotaMarcada) || 0));
  return Math.min(Number(extraSolicitado) || 0, disponible);
}

/**
 * Arma las filas de inversiones fondeables para "Distribuir mi ingreso" (MC.4e).
 * Un aporte incrementa el `monto` (capital) del holding existente; aquí cada fila
 * arranca en 0 (el usuario decide cuánto aportar) y lleva el capital actual
 * (`invertido`) solo como contexto. Ordenadas por posición de mayor a menor.
 * Pura: recibe las inversiones y no lee S ni el DOM.
 *
 * @param {{ inversiones?: Array<{id:string, nombre?:string, tipo?:string, monto?:number}> }} args
 * @returns {Array<{ tipo:'inversion', id:string, nombre:string, monto:number, invertido:number }>}
 */
export function construirPlanInversiones({ inversiones = [] }) {
  return (Array.isArray(inversiones) ? inversiones : [])
    .map(inv => ({
      tipo:      'inversion',
      id:        inv.id,
      nombre:    inv.nombre ?? 'Inversión',
      monto:     0,
      invertido: Number(inv.monto) || 0,
    }))
    .sort((a, b) => b.invertido - a.invertido);
}

/**
 * Arma las filas de cuentas activas para el reparto de Estilo de vida entre
 * cuentas (Paso 3, MC.7e, ADR 018 decisión 4). A diferencia de las demás filas
 * del asistente, estas no representan gasto ni ahorro: son transferencias
 * internas entre las cuentas del propio usuario, para decidir en qué cuenta
 * queda disponible cada parte del dinero de Estilo de vida. Arrancan en monto
 * 0 y sin marcar: por defecto no se mueve nada (el remanente completo queda en
 * la cuenta de origen, como hoy); el usuario decide cuánto mover a cada una.
 *
 * Con una sola cuenta activa este reparto no aporta nada (no hay a dónde
 * transferir); el caller omite la sección cuando `cuentas.length <= 1`
 * (regla de cuenta única).
 *
 * Pura: recibe las cuentas y no lee S ni el DOM.
 *
 * @param {import('../../../core/state.js').Cuenta[]} cuentas - cuentas activas.
 * @returns {Array<{tipo:'cuenta', id:string, nombre:string, monto:number, saldoActual:number}>}
 *   Ordenadas de mayor a menor saldo (mismo criterio que el selector de cuentas).
 */
export function construirFilasTransferenciaCuentas(cuentas = []) {
  return (Array.isArray(cuentas) ? cuentas : [])
    .map(c => ({
      tipo:        'cuenta',
      id:          c.id,
      nombre:      c.nombre ?? 'Cuenta',
      monto:       0,
      saldoActual: Number(c.saldo) || 0,
    }))
    .sort((a, b) => b.saldoActual - a.saldoActual);
}
