/**
 * compromisos/logic.js - funciones puras del dominio de compromisos.
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 *
 * Compromiso: gasto recurrente con un día de pago fijo en el mes.
 * Tipos: 'fijo' (arriendo, servicio), 'deuda' (cuota), 'agenda' (próximo pago puntual).
 */

import { FRECUENCIAS } from '../../core/constants.js';

// ── CATÁLOGOS LOCALES ────────────────────────────────────────────

export const TIPOS_COMPROMISO = ['fijo', 'deuda', 'agenda'];

/** Etiqueta legible por tipo. */
export const LABEL_TIPO = {
  fijo:   'Gasto fijo',
  deuda:  'Deuda',
  agenda: 'Agenda',
};

/** Emoji por tipo de compromiso. */
export const ICONO_TIPO = {
  fijo:   '🔁',
  deuda:  '💳',
  agenda: '📅',
};

/**
 * Cuántas veces ocurre cada frecuencia en un mes calendario promedio.
 * Definido localmente para no crear dependencia cruzada con ingresos/logic.js.
 */
const FACTOR_MENSUAL = {
  'Diario':     30,
  'Semanal':    4.33,
  'Quincenal':  2,
  'Mensual':    1,
  'Bimestral':  0.5,
  'Trimestral': 1 / 3,
  'Semestral':  1 / 6,
  'Anual':      1 / 12,
  'Única vez':  0,
};

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra compromisos con `activo !== false`.
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 */
export function compromisosActivos(compromisos) {
  return compromisos.filter(c => c.activo !== false);
}

/**
 * Proyecta el monto mensual equivalente de un compromiso.
 * @param {import('../../core/state.js').Compromiso} compromiso
 * @returns {number} COP / mes equivalente.
 */
export function calcularCompromisoMensual(compromiso) {
  const factor = FACTOR_MENSUAL[compromiso.frecuencia] ?? 0;
  return (compromiso.monto ?? 0) * factor;
}

/**
 * Suma la proyección mensual de todos los compromisos activos.
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @returns {number} Total mensual en COP.
 */
export function calcularTotalCompromisos(compromisos) {
  return compromisosActivos(compromisos)
    .reduce((acc, c) => acc + calcularCompromisoMensual(c), 0);
}

/**
 * Cuántos días faltan para el próximo vencimiento de un compromiso.
 * Si `diaPago` es hoy o en el futuro dentro del mes → días restantes en el mes actual.
 * Si ya pasó → días hasta el mismo día del mes siguiente.
 *
 * @param {import('../../core/state.js').Compromiso} compromiso
 * @returns {number} Días hasta el próximo vencimiento (0 = hoy).
 */
export function proximoVencimiento(compromiso) {
  const hoy      = new Date();
  const diaHoy   = hoy.getDate();
  const diaPago  = compromiso.diaPago ?? 1;

  if (diaPago >= diaHoy) {
    return diaPago - diaHoy;
  }
  // Ya pasó en este mes → contar hasta el mismo día del mes siguiente.
  const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  return (ultimoDiaMes - diaHoy) + diaPago;
}

/**
 * Nivel de urgencia según días al próximo vencimiento.
 * @param {import('../../core/state.js').Compromiso} compromiso
 * @returns {'urgente' | 'proximo' | 'normal'}
 */
export function urgencia(compromiso) {
  const dias = proximoVencimiento(compromiso);
  if (dias <= 3) return 'urgente';
  if (dias <= 7) return 'proximo';
  return 'normal';
}

/**
 * Filtra los compromisos activos cuyo próximo vencimiento es en ≤ `diasLimite` días.
 * Pensado para alimentar el sistema de notificaciones push.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @param {number} [diasLimite=3]
 * @returns {Array<import('../../core/state.js').Compromiso & { diasRestantes: number }>}
 */
export function compromisosProximos(compromisos, diasLimite = 3) {
  return compromisosActivos(compromisos)
    .map(c => ({ ...c, diasRestantes: proximoVencimiento(c) }))
    .filter(c => c.diasRestantes <= diasLimite)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

/**
 * Nivel de urgencia para el nudge de mora inminente (G.3.F5).
 * Recibe la lista ya filtrada de `compromisosProximos()`.
 *
 * - `'high'`   → al menos un compromiso vence en ≤ 3 días.
 * - `'medium'` → todos vencen entre 4 y 5 días.
 * - `null`     → no hay compromisos proximos (no mostrar nudge).
 *
 * @param {Array<{ diasRestantes: number }>} proximos
 * @returns {'high' | 'medium' | null}
 */
export function nivelAlertaMora(proximos) {
  if (proximos.length === 0) return null;
  return proximos.some(c => c.diasRestantes <= 3) ? 'high' : 'medium';
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida los datos del formulario de compromiso.
 *
 * Los campos `saldoPendiente` y `tasaEA` son opcionales incluso para tipo='deuda'.
 * Si el usuario los deja vacíos se aceptan; si los llena deben ser válidos.
 *
 * @param {Record<string, string>} datos
 * @returns {string[]} Mensajes de error (vacío = válido).
 */
export function validarCompromiso(datos) {
  const errores = [];

  if (!datos.descripcion?.trim()) {
    errores.push('La descripción del compromiso es obligatoria.');
  }
  const monto = Number(datos.monto);
  if (isNaN(monto) || monto <= 0) {
    errores.push('El monto debe ser un número mayor a 0.');
  }
  if (!datos.frecuencia || !FRECUENCIAS.includes(datos.frecuencia)) {
    errores.push('Debés elegir la frecuencia del compromiso.');
  }
  const diaPago = Number(datos.diaPago);
  if (!Number.isInteger(diaPago) || diaPago < 1 || diaPago > 31) {
    errores.push('El día de pago debe ser un número entero entre 1 y 31.');
  }
  if (!datos.tipo || !TIPOS_COMPROMISO.includes(datos.tipo)) {
    errores.push('Debés elegir el tipo de compromiso.');
  }

  // Validaciones opcionales para deudas (solo si el usuario completó los campos).
  if (datos.tipo === 'deuda') {
    if (datos.saldoPendiente !== '' && datos.saldoPendiente !== undefined) {
      const saldo = Number(datos.saldoPendiente);
      if (isNaN(saldo) || saldo < 0) {
        errores.push('El saldo pendiente debe ser un número igual o mayor a 0.');
      }
    }
    if (datos.tasaEA !== '' && datos.tasaEA !== undefined) {
      const tasa = Number(datos.tasaEA);
      if (isNaN(tasa) || tasa < 0 || tasa > 200) {
        errores.push('La tasa EA debe ser un porcentaje entre 0 y 200.');
      }
    }
  }

  return errores;
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte datos crudos del formulario al shape de S.compromisos.
 * Asume que los datos ya pasaron `validarCompromiso()`.
 *
 * Para tipo='deuda', incluye campos opcionales solo si tienen valor válido:
 * - `saldoPendiente` - COP (número ≥ 0).
 * - `tasaEA`         - tasa efectiva anual como decimal 0-1 (se convierte desde %).
 *
 * @param {Record<string, string>} datos
 */
export function normalizarCompromiso(datos) {
  const base = {
    descripcion: datos.descripcion.trim(),
    monto:       Number(datos.monto),
    frecuencia:  datos.frecuencia,
    diaPago:     Number(datos.diaPago),
    tipo:        datos.tipo,
    activo:      true,
  };

  if (datos.tipo === 'deuda') {
    const saldo = Number(datos.saldoPendiente);
    if (datos.saldoPendiente !== '' && datos.saldoPendiente !== undefined && !isNaN(saldo) && saldo >= 0) {
      base.saldoPendiente = saldo;
    }
    const tasaPct = Number(datos.tasaEA);
    if (datos.tasaEA !== '' && datos.tasaEA !== undefined && !isNaN(tasaPct) && tasaPct >= 0) {
      base.tasaEA = tasaPct / 100;
    }
  }

  return base;
}

// ── DETECTORES DE ALERTA (G.1) ───────────────────────────────────

const _RX_FECHA_COMP = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Detecta compromisos fijos activos cuyo día de pago ya pasó en el mes actual.
 * Sirve como recordatorio para registrar el gasto correspondiente.
 *
 * Nota: Finko no persiste un historial de pagos en compromisos.
 * Esta función no verifica si el pago fue registrado - avisa que el plazo ya
 * pasó para que el usuario confirme que lo pagó y lo registró en gastos.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @param {string} hoyISO   YYYY-MM-DD
 * @param {object} [config]
 * @param {number} [config.umbralDiasAtraso=0] Mínimo de días de atraso para incluir.
 * @returns {Array<{
 *   id: string, descripcion: string, monto: number,
 *   diaPago: number, diasAtraso: number, severidad: 'leve'|'moderada'|'urgente'
 * }>}
 */
export function detectarFijosSinPagarEsteMes(compromisos, hoyISO, config = {}) {
  if (!Array.isArray(compromisos) || compromisos.length === 0) return [];
  if (typeof hoyISO !== 'string') return [];

  const mh = _RX_FECHA_COMP.exec(hoyISO);
  if (!mh) return [];

  const diaHoy = +mh[3];
  const cfg = typeof config === 'object' && config ? config : {};
  const umbral = Number.isFinite(+cfg.umbralDiasAtraso) && +cfg.umbralDiasAtraso >= 0
    ? Math.floor(+cfg.umbralDiasAtraso) : 0;

  const out = [];

  for (const c of compromisos) {
    if (!c || typeof c !== 'object') continue;
    if (c.activo === false) continue;
    if (c.tipo !== 'fijo') continue;

    const diaPago = Number(c.diaPago) || 1;
    if (diaPago < 1 || diaPago > 31) continue;

    const diasAtraso = diaHoy - diaPago;
    if (diasAtraso < umbral) continue;

    const severidad = diasAtraso <= 3 ? 'leve'
      : diasAtraso <= 10             ? 'moderada'
      :                                'urgente';

    out.push({
      id:          c.id,
      descripcion: c.descripcion || 'Sin nombre',
      monto:       Number(c.monto) || 0,
      diaPago,
      diasAtraso,
      severidad,
    });
  }

  // Mas urgentes (mayor atraso) primero.
  out.sort((a, b) => b.diasAtraso - a.diasAtraso);
  return out;
}

/**
 * Detecta deudas activas con saldo pendiente que llevan demasiado tiempo sin
 * actividad desde su creación. Util para recordar revisarlas o liquidarlas.
 *
 * Nota: Finko no persiste historial de pagos en compromisos.
 * "Durmiendo" se define como: tipo='deuda', activo, saldoPendiente > 0,
 * y fecha de creación >= umbral meses atrás sin actualización de saldo.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @param {string} hoyISO   YYYY-MM-DD
 * @param {object} [config]
 * @param {number} [config.mesesUmbral=2] Meses mínimos de antigüedad para marcar como durmiendo.
 * @returns {Array<{
 *   id: string, descripcion: string, tipo: string,
 *   saldoPendiente: number, cuota: number,
 *   mesesDesdeCreacion: number, severidad: 'baja'|'media'|'alta',
 *   sugerencia: 'liquidar'|'retomar'
 * }>}
 */
export function detectarDeudasDurmiendo(compromisos, hoyISO, config = {}) {
  if (!Array.isArray(compromisos) || compromisos.length === 0) return [];
  if (typeof hoyISO !== 'string') return [];

  const mHoy = _RX_FECHA_COMP.exec(hoyISO);
  if (!mHoy) return [];

  const cfg = typeof config === 'object' && config ? config : {};
  const umbral = Number.isFinite(+cfg.mesesUmbral) && +cfg.mesesUmbral > 0
    ? Math.floor(+cfg.mesesUmbral) : 2;

  const tHoy = Date.UTC(+mHoy[1], +mHoy[2] - 1, +mHoy[3]);
  const out = [];

  for (const c of compromisos) {
    if (!c || typeof c !== 'object') continue;
    if (c.activo === false) continue;
    if (c.tipo !== 'deuda') continue;

    const saldo = Number(c.saldoPendiente);
    if (!Number.isFinite(saldo) || saldo <= 0) continue;

    if (typeof c.fechaCreacion !== 'string') continue;
    const mC = _RX_FECHA_COMP.exec(c.fechaCreacion);
    if (!mC) continue;

    const tCreacion = Date.UTC(+mC[1], +mC[2] - 1, +mC[3]);
    if (tCreacion > tHoy) continue;

    const dias = Math.floor((tHoy - tCreacion) / 86_400_000);
    const meses = Math.floor(dias / 30);
    if (meses < umbral) continue;

    const severidad = meses >= 6 ? 'alta'
      : meses >= 3               ? 'media'
      :                            'baja';

    const cuota = Number(c.monto) || 0;

    out.push({
      id:                 c.id,
      descripcion:        c.descripcion || 'Sin nombre',
      tipo:               c.tipo,
      saldoPendiente:     saldo,
      cuota,
      mesesDesdeCreacion: meses,
      severidad,
      sugerencia: (cuota > 0 && saldo <= cuota) ? 'liquidar' : 'retomar',
    });
  }

  const rank = { alta: 0, media: 1, baja: 2 };
  out.sort((a, b) => {
    const r = rank[a.severidad] - rank[b.severidad];
    if (r !== 0) return r;
    return b.saldoPendiente - a.saldoPendiente;
  });
  return out;
}

// ── DASHBOARD: PRIORIDADES + VENCIDOS ────────────────────────────

/**
 * Detecta compromisos activos cuyo día de pago ya pasó este mes,
 * cubriendo los tres tipos (fijo, deuda, agenda).
 *
 * Generalización de `detectarFijosSinPagarEsteMes` para alimentar el panel
 * "Pendientes/Vencidos" del dashboard. La función vieja queda intacta para
 * el nudge de la sección compromisos (retrocompatibilidad).
 *
 * Limitación conocida: para tipo='agenda' con frecuencia='Única vez' creada
 * en meses anteriores, `diasAtraso` se calcula contra el mes en curso, no
 * contra la fecha original. Si el usuario olvidó desactivar el item, el
 * atraso reportado será menor al real. Aceptable para v1: se resuelve con
 * disciplina del usuario (toggle "activo=false" al pagar).
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @param {string} hoyISO   YYYY-MM-DD
 * @param {object} [config]
 * @param {number} [config.umbralDiasAtraso=0] Mínimo de días de atraso para incluir.
 * @returns {Array<{
 *   id: string, descripcion: string, tipo: 'fijo'|'deuda'|'agenda',
 *   monto: number, diaPago: number, diasAtraso: number,
 *   severidad: 'leve'|'moderada'|'urgente'
 * }>}
 */
export function detectarVencidosCompletos(compromisos, hoyISO, config = {}) {
  if (!Array.isArray(compromisos) || compromisos.length === 0) return [];
  if (typeof hoyISO !== 'string') return [];

  const mh = _RX_FECHA_COMP.exec(hoyISO);
  if (!mh) return [];

  const diaHoy = +mh[3];
  const cfg = typeof config === 'object' && config ? config : {};
  const umbral = Number.isFinite(+cfg.umbralDiasAtraso) && +cfg.umbralDiasAtraso >= 0
    ? Math.floor(+cfg.umbralDiasAtraso) : 0;

  const out = [];

  for (const c of compromisos) {
    if (!c || typeof c !== 'object') continue;
    if (c.activo === false) continue;
    if (!TIPOS_COMPROMISO.includes(c.tipo)) continue;

    const diaPago = Number(c.diaPago) || 1;
    if (diaPago < 1 || diaPago > 31) continue;

    const diasAtraso = diaHoy - diaPago;
    if (diasAtraso < umbral) continue;

    const severidad = diasAtraso <= 3 ? 'leve'
      : diasAtraso <= 10             ? 'moderada'
      :                                'urgente';

    out.push({
      id:          c.id,
      descripcion: c.descripcion || 'Sin nombre',
      tipo:        c.tipo,
      monto:       Number(c.monto) || 0,
      diaPago,
      diasAtraso,
      severidad,
    });
  }

  // Más urgentes primero (mayor atraso).
  out.sort((a, b) => b.diasAtraso - a.diasAtraso);
  return out;
}

/**
 * Agrupa el resultado de `compromisosProximos()` por días restantes,
 * con labels listos para mostrar en el panel de Prioridades del dashboard.
 *
 * Buckets: HOY (0), Mañana (1), En N días (2-7).
 * El caller decide cuántos días pedir a `compromisosProximos()`.
 *
 * @param {Array<{ diasRestantes: number }>} proximos
 * @returns {Array<{ label: string, dias: number, items: Array<object> }>}
 *   Ordenado por días ascendente. Grupos vacíos se omiten.
 */
export function agruparPorDiasRestantes(proximos) {
  if (!Array.isArray(proximos) || proximos.length === 0) return [];

  const map = new Map();
  for (const p of proximos) {
    const d = Number(p.diasRestantes);
    if (!Number.isInteger(d) || d < 0) continue;
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(p);
  }

  const dias = [...map.keys()].sort((a, b) => a - b);
  return dias.map(d => ({
    label: d === 0 ? 'Hoy'
         : d === 1 ? 'Mañana'
         :           `En ${d} días`,
    dias:  d,
    items: map.get(d),
  }));
}

// ── ESTRATEGIAS DE PAGO (F.4) ────────────────────────────────────

/**
 * Tope duro de meses en la simulación para evitar loops infinitos cuando
 * el aporte mensual no alcanza ni para cubrir los intereses. 600 meses = 50 años.
 */
const MAX_MESES_SIMULACION = 600;

/**
 * Filtra compromisos que pueden entrar en una estrategia de pago.
 * Requiere: tipo='deuda', activo, saldoPendiente>0, tasaEA>=0, monto>0.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @returns {Array<{ id: string, descripcion: string, saldo: number, tasaEA: number, cuota: number }>}
 */
export function filtrarDeudasPagables(compromisos) {
  return compromisosActivos(compromisos)
    .filter(c => c.tipo === 'deuda')
    .filter(c => Number.isFinite(c.saldoPendiente) && c.saldoPendiente > 0)
    .filter(c => Number.isFinite(c.tasaEA) && c.tasaEA >= 0)
    .filter(c => Number.isFinite(c.monto) && c.monto > 0)
    .map(c => ({
      id:          c.id,
      descripcion: c.descripcion,
      saldo:       c.saldoPendiente,
      tasaEA:      c.tasaEA,
      cuota:       c.monto,
    }));
}

/**
 * Convierte una tasa efectiva anual a su equivalente mensual exacto.
 * tasaMensual = (1 + tasaEA)^(1/12) - 1
 * @param {number} tasaEA decimal (0.28 = 28% EA)
 */
function _tasaMensualDesdeEA(tasaEA) {
  return Math.pow(1 + tasaEA, 1 / 12) - 1;
}

/**
 * Simula el pago mes a mes de un conjunto de deudas siguiendo una estrategia.
 *
 * Algoritmo:
 * 1. Ordenar deudas según estrategia (avalancha = tasa↓, bolaNieve = saldo↑).
 * 2. Cada mes: aplicar interés, pagar cuota mínima en todas, volcar
 *    (extraMensual + cuotas liberadas) en la deuda prioritaria.
 * 3. Cuando una deuda llega a saldo ≤ 0, su cuota se libera para la siguiente.
 * 4. Repetir hasta saldo total = 0 o tope de meses alcanzado.
 *
 * @param {ReturnType<typeof filtrarDeudasPagables>} deudas
 * @param {number} extraMensual COP adicionales por mes (≥ 0).
 * @param {'avalancha' | 'bolaNieve'} estrategia
 * @returns {{
 *   orden: Array<{ id: string, descripcion: string, mesPagado: number | null }>,
 *   meses: number,
 *   interesesTotales: number,
 *   pagadoTotal: number,
 *   completo: boolean,
 * }}
 */
export function simularEstrategiaPago(deudas, extraMensual, estrategia) {
  if (!Array.isArray(deudas) || deudas.length === 0) {
    return { orden: [], meses: 0, interesesTotales: 0, pagadoTotal: 0, completo: true };
  }

  const extra = Number.isFinite(extraMensual) && extraMensual > 0 ? extraMensual : 0;

  // Copia mutable, ordenada según estrategia.
  const sortFn = estrategia === 'bolaNieve'
    ? (a, b) => a.saldo - b.saldo
    : (a, b) => b.tasaEA - a.tasaEA;

  const deudasSim = deudas.map(d => ({
    id:          d.id,
    descripcion: d.descripcion,
    saldo:       d.saldo,
    tasaEA:      d.tasaEA,
    tasaMensual: _tasaMensualDesdeEA(d.tasaEA),
    cuota:       d.cuota,
    pagada:      false,
    mesPagado:   null,
  })).sort(sortFn);

  let meses = 0;
  let interesesTotales = 0;
  let pagadoTotal = 0;

  while (deudasSim.some(d => !d.pagada) && meses < MAX_MESES_SIMULACION) {
    meses++;

    // 1. Aplicar interés mensual a deudas activas.
    for (const d of deudasSim) {
      if (d.pagada) continue;
      const interes = d.saldo * d.tasaMensual;
      d.saldo += interes;
      interesesTotales += interes;
    }

    // 2. Calcular "presupuesto" disponible este mes: cuotas de TODAS las deudas
    //    (activas y pagadas - las pagadas liberan su cuota) + extra mensual.
    let presupuesto = extra + deudasSim.reduce((acc, d) => acc + d.cuota, 0);

    // 3. Pagar cuota mínima en deudas no prioritarias (de la 2da en adelante).
    for (let i = 1; i < deudasSim.length; i++) {
      const d = deudasSim[i];
      if (d.pagada) continue;
      const pago = Math.min(d.cuota, d.saldo, presupuesto);
      d.saldo -= pago;
      presupuesto -= pago;
      pagadoTotal += pago;
      if (d.saldo <= 0.01) {
        d.saldo = 0;
        d.pagada = true;
        d.mesPagado = meses;
      }
    }

    // 4. Volcar TODO lo restante en la deuda prioritaria (índice 0 activo).
    const prioritaria = deudasSim.find(d => !d.pagada);
    if (prioritaria && presupuesto > 0) {
      const pago = Math.min(prioritaria.saldo, presupuesto);
      prioritaria.saldo -= pago;
      presupuesto -= pago;
      pagadoTotal += pago;
      if (prioritaria.saldo <= 0.01) {
        prioritaria.saldo = 0;
        prioritaria.pagada = true;
        prioritaria.mesPagado = meses;
      }
    }

    // 5. Safety: si presupuesto < interés mensual mínimo total → no avanzamos.
    //    Detectamos esto si todas las deudas siguen vivas y ninguna bajó saldo.
    //    En la práctica, el tope MAX_MESES_SIMULACION lo agarra.
  }

  const completo = deudasSim.every(d => d.pagada);

  return {
    orden: deudasSim.map(d => ({
      id:          d.id,
      descripcion: d.descripcion,
      mesPagado:   d.mesPagado,
    })),
    meses:            completo ? meses : MAX_MESES_SIMULACION,
    interesesTotales,
    pagadoTotal,
    completo,
  };
}

/**
 * Compara las dos estrategias para un mismo conjunto de deudas.
 * Devuelve los resultados de ambas + el ahorro (meses + intereses) de la
 * mejor sobre la peor.
 *
 * @param {ReturnType<typeof filtrarDeudasPagables>} deudas
 * @param {number} extraMensual
 * @returns {{
 *   avalancha: ReturnType<typeof simularEstrategiaPago>,
 *   bolaNieve: ReturnType<typeof simularEstrategiaPago>,
 *   ahorroIntereses: number,
 *   ahorroMeses: number,
 *   mejor: 'avalancha' | 'bolaNieve' | 'empate',
 * }}
 */
export function compararEstrategias(deudas, extraMensual) {
  const avalancha = simularEstrategiaPago(deudas, extraMensual, 'avalancha');
  const bolaNieve = simularEstrategiaPago(deudas, extraMensual, 'bolaNieve');

  // Avalancha es matemáticamente óptima (≤ intereses). Cuando empata,
  // suele ser porque las tasas son idénticas o sólo hay una deuda.
  const ahorroIntereses = Math.max(0, bolaNieve.interesesTotales - avalancha.interesesTotales);
  const ahorroMeses     = Math.max(0, bolaNieve.meses - avalancha.meses);

  let mejor = 'empate';
  if (avalancha.interesesTotales < bolaNieve.interesesTotales - 0.5) mejor = 'avalancha';
  else if (bolaNieve.interesesTotales < avalancha.interesesTotales - 0.5) mejor = 'bolaNieve';

  return { avalancha, bolaNieve, ahorroIntereses, ahorroMeses, mejor };
}
