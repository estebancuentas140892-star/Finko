/**
 * compromisos/logic.js - funciones puras del dominio de compromisos.
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 *
 * Compromiso: gasto recurrente con un día de pago fijo en el mes.
 * Tipos: 'fijo' (arriendo, servicio), 'deuda' (cuota), 'agenda' (próximo pago puntual).
 */

import { FRECUENCIAS } from '../../core/constants.js';

// ── CATÁLOGOS LOCALES ────────────────────────────────────────────

/**
 * Tipos vigentes (v6).
 * - 'fijo'           → gasto recurrente con cuota fija (arriendo, servicios, suscripciones).
 *                      Se crea desde la sección Agenda; la sección Compromisos no lo expone.
 * - 'deuda-entidad'  → deuda con banco/fintech/tarjeta (tasa EA por ley).
 * - 'deuda-personal' → préstamo de un particular o gota a gota (tasa mensual usual).
 *
 * Los tipos antiguos 'deuda' y 'agenda' se migran automáticamente en storage.js
 * (v5 → v6) y nunca aparecen en datos vigentes.
 */
export const TIPOS_COMPROMISO = ['fijo', 'deuda-entidad', 'deuda-personal'];

/** Tipos que la sección Compromisos crea/lista (solo deudas a partir de v6). */
export const TIPOS_DEUDA = ['deuda-entidad', 'deuda-personal'];

/** Etiqueta legible por tipo. */
export const LABEL_TIPO = {
  'fijo':           'Gasto fijo',
  'deuda-entidad':  'Deuda con entidad',
  'deuda-personal': 'Deuda personal',
};

/** Id de icono SVG por tipo de compromiso (referencia al sprite #i-*). */
export const ICONO_TIPO = {
  'fijo':           'recurring',
  'deuda-entidad':  'cuentas',
  'deuda-personal': 'personales',
};

/** Devuelve true si el tipo corresponde a una deuda (entidad o personal). */
export function esDeuda(tipo) {
  return tipo === 'deuda-entidad' || tipo === 'deuda-personal';
}

/**
 * Convierte una tasa mensual a su equivalente efectivo anual exacto.
 * tasaEA = (1 + tasaMensual)^12 - 1
 * @param {number} tasaMensual decimal (0.10 = 10% mensual)
 */
export function tasaMensualToEA(tasaMensual) {
  return Math.pow(1 + tasaMensual, 12) - 1;
}

/**
 * Devuelve la tasa EA (decimal) de un compromiso de deuda según su `tasaUnidad`.
 * Para fijos o sin `tasa` devuelve 0.
 * @param {{ tasa?: number, tasaUnidad?: string }} c
 */
export function tasaEADe(c) {
  const t = Number(c?.tasa);
  if (!Number.isFinite(t) || t < 0) return 0;
  return c.tasaUnidad === 'mensual' ? tasaMensualToEA(t) : t;
}

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
 * - Para fijo: aplica el factor de frecuencia sobre `monto` (cuota recurrente).
 * - Para deudas (entidad/personal): `cuotaMensual` ya es lo que se paga al mes.
 *
 * @param {import('../../core/state.js').Compromiso} compromiso
 * @returns {number} COP / mes equivalente.
 */
export function calcularCompromisoMensual(compromiso) {
  if (esDeuda(compromiso.tipo)) {
    return Number(compromiso.cuotaMensual) || 0;
  }
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
 * Reglas v6:
 * - tipo='fijo'           → requiere monto y frecuencia (Cuotas recurrentes).
 * - tipo='deuda-entidad'  → requiere saldoTotal, cuotaMensual; tasa opcional (% EA).
 * - tipo='deuda-personal' → requiere saldoTotal, cuotaMensual; tasa opcional (% mensual).
 *
 * @param {Record<string, string>} datos
 * @returns {string[]} Mensajes de error (vacío = válido).
 */
export function validarCompromiso(datos) {
  const errores = [];

  if (!datos.descripcion?.trim()) {
    errores.push('La descripción del compromiso es obligatoria.');
  }
  if (!datos.frecuencia || !FRECUENCIAS.includes(datos.frecuencia)) {
    errores.push('Debes elegir la frecuencia.');
  }
  const diaPago = Number(datos.diaPago);
  if (!Number.isInteger(diaPago) || diaPago < 1 || diaPago > 31) {
    errores.push('El día de pago debe ser un número entero entre 1 y 31.');
  }
  if (!datos.tipo || !TIPOS_COMPROMISO.includes(datos.tipo)) {
    errores.push('Debes elegir el tipo de compromiso.');
  }

  if (datos.tipo === 'fijo') {
    const monto = Number(datos.monto);
    if (isNaN(monto) || monto <= 0) {
      errores.push('El monto debe ser un número mayor a 0.');
    }
  } else if (esDeuda(datos.tipo)) {
    const saldo = Number(datos.saldoTotal);
    if (isNaN(saldo) || saldo <= 0) {
      errores.push('El saldo total que aún debes debe ser mayor a 0.');
    }
    const cuota = Number(datos.cuotaMensual);
    if (isNaN(cuota) || cuota <= 0) {
      errores.push('La cuota mensual debe ser un número mayor a 0.');
    }
    const tasa = Number(datos.tasa);
    const tieneTasa = datos.tasa !== '' && datos.tasa !== undefined && datos.tasa !== null;
    if (datos.tipo === 'deuda-entidad') {
      // Opcional: muchas personas no conocen su tasa EA. Si la dan, validar rango.
      if (tieneTasa) {
        if (isNaN(tasa) || tasa < 0) {
          errores.push('La tasa EA debe ser un número mayor o igual a 0.');
        } else if (tasa > 200) {
          errores.push('La tasa EA parece demasiado alta (más de 200%). Verifica el valor.');
        }
      }
    } else if (tieneTasa) {
      // Personal: opcional pero si la ponen, validar rango razonable (mensual).
      if (isNaN(tasa) || tasa < 0) {
        errores.push('La tasa mensual debe ser un número mayor o igual a 0.');
      } else if (tasa > 100) {
        errores.push('La tasa mensual parece demasiado alta (más de 100% mensual). Verifica el valor.');
      }
    }
    if (tieneTasa) {
      const unidad = datos.tasaUnidad;
      if (unidad !== 'EA' && unidad !== 'mensual') {
        errores.push('La unidad de tasa debe ser EA o mensual.');
      }
    }
  }

  return errores;
}

/**
 * Detecta si la cuota declarada no cubre el interés mensual del crédito.
 * Si cuotaMensual <= interés mensual, la deuda crece (nunca baja) o se mantiene.
 *
 * Solo aplica a deudas con tasa > 0. Para deudas personales sin tasa la función
 * devuelve null (no hay intereses que comparar).
 *
 * @param {Record<string, string>} datos - datos crudos del formulario de compromiso.
 *   Espera: saldoTotal, cuotaMensual, tasa (en %), tasaUnidad ('EA' | 'mensual'), tipo.
 * @returns {{ interesMensual: number, cuotaMensual: number, deficit: number } | null}
 *   null si no hay alerta. Objeto con los montos si la cuota no cubre el interés mensual.
 */
export function detectarDeudaCreciente(datos) {
  if (datos.tipo !== 'deuda-entidad' && datos.tipo !== 'deuda-personal') return null;

  const cuota   = Number(datos.cuotaMensual);
  const saldo   = Number(datos.saldoTotal);
  const tasaPct = Number(datos.tasa);

  if (!(cuota > 0) || !(saldo > 0) || !(tasaPct > 0)) return null;

  const tasaDecimal  = tasaPct / 100;
  const tasaMensual  = datos.tasaUnidad === 'mensual'
    ? tasaDecimal
    : Math.pow(1 + tasaDecimal, 1 / 12) - 1;

  const interesMensual = saldo * tasaMensual;
  if (cuota <= interesMensual) {
    return {
      interesMensual,
      cuotaMensual: cuota,
      deficit:      interesMensual - cuota,
    };
  }
  return null;
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte datos crudos del formulario al shape de S.compromisos.
 * Asume que los datos ya pasaron `validarCompromiso()`.
 *
 * v6:
 * - 'fijo'           → { monto, frecuencia, diaPago }
 * - 'deuda-entidad'  → { saldoTotal, cuotaMensual, tasa|null, tasaUnidad='EA' }
 *                       (tasa null = desconocida; 0 significaría "sin interés",
 *                       que en una entidad casi nunca es cierto)
 * - 'deuda-personal' → { saldoTotal, cuotaMensual, tasa?, tasaUnidad? }
 *                       (sin tasa = 0: el form dice "si no cobra interés, deja en blanco")
 *
 * @param {Record<string, string>} datos
 */
export function normalizarCompromiso(datos) {
  const base = {
    descripcion: datos.descripcion.trim(),
    frecuencia:  datos.frecuencia,
    diaPago:     Number(datos.diaPago),
    tipo:        datos.tipo,
    activo:      true,
  };

  if (datos.tipo === 'fijo') {
    base.monto = Number(datos.monto);
    return base;
  }

  if (esDeuda(datos.tipo)) {
    base.saldoTotal   = Number(datos.saldoTotal);
    base.cuotaMensual = Number(datos.cuotaMensual);
    const tasaPct = Number(datos.tasa);
    const tieneTasa = datos.tasa !== '' && datos.tasa !== undefined && datos.tasa !== null
      && !isNaN(tasaPct) && tasaPct >= 0;
    if (datos.tipo === 'deuda-entidad') {
      base.tasa       = tieneTasa ? tasaPct / 100 : null;
      base.tasaUnidad = 'EA';
    } else {
      base.tasa       = tieneTasa ? tasaPct / 100 : 0;
      base.tasaUnidad = tieneTasa ? (datos.tasaUnidad || 'mensual') : 'mensual';
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

  const anioHoy = +mh[1];
  const mesHoy  = +mh[2];
  const diaHoy  = +mh[3];
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

    // Si el fijo se creó este mes después de su día de pago, el ciclo de
    // este mes no le aplica: el próximo vencimiento real es el mes siguiente.
    if (typeof c.fechaCreacion === 'string') {
      const mc = _RX_FECHA_COMP.exec(c.fechaCreacion);
      if (mc) {
        const anioC = +mc[1];
        const mesC  = +mc[2];
        const diaC  = +mc[3];
        if (anioC === anioHoy && mesC === mesHoy && diaC > diaPago) continue;
      }
    }

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
 * "Durmiendo" se define como: deuda (entidad o personal), activa, saldoTotal > 0,
 * y fecha de creación >= umbral meses atrás sin actualización de saldo.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @param {string} hoyISO   YYYY-MM-DD
 * @param {object} [config]
 * @param {number} [config.mesesUmbral=2] Meses mínimos de antigüedad para marcar como durmiendo.
 * @returns {Array<{
 *   id: string, descripcion: string, tipo: string,
 *   saldoTotal: number, cuota: number,
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
    if (!esDeuda(c.tipo)) continue;

    const saldo = Number(c.saldoTotal);
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

    const cuota = Number(c.cuotaMensual) || 0;

    out.push({
      id:                 c.id,
      descripcion:        c.descripcion || 'Sin nombre',
      tipo:               c.tipo,
      saldoTotal:         saldo,
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
    return b.saldoTotal - a.saldoTotal;
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
 * Regla anti-falso-positivo: si el compromiso se creó este mismo mes/año
 * y su `fechaCreacion` es posterior al día de pago, no se marca como vencido.
 * Recién agregar un fijo cuyo día ya pasó no implica mora (ese ciclo no
 * existía). El próximo vencimiento real es el mes siguiente.
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

  const anioHoy = +mh[1];
  const mesHoy  = +mh[2];
  const diaHoy  = +mh[3];
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

    // Si el compromiso se creó este mes después de su día de pago, el ciclo
    // de este mes no le aplica: el próximo vencimiento real es el mes siguiente.
    if (typeof c.fechaCreacion === 'string') {
      const mc = _RX_FECHA_COMP.exec(c.fechaCreacion);
      if (mc) {
        const anioC = +mc[1];
        const mesC  = +mc[2];
        const diaC  = +mc[3];
        if (anioC === anioHoy && mesC === mesHoy && diaC > diaPago) continue;
      }
    }

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
 * Simula el pago de una deuda individual mes a mes con interés compuesto.
 * Devuelve cuántos meses toma saldarla y cuánto se paga en intereses.
 *
 * @param {number} saldo         Saldo actual en COP.
 * @param {number} tasaEA        Tasa efectiva anual como decimal (0.28 = 28%).
 * @param {number} cuotaMensual  Cuota mensual fija (sin el extra).
 * @param {number} [abonoExtra=0] Monto extra que se agrega a la cuota cada mes.
 * @returns {{ meses: number, intereses: number }}
 */
export function simularPagoDeuda(saldo, tasaEA, cuotaMensual, abonoExtra = 0) {
  if (!Number.isFinite(saldo) || saldo <= 0) return { meses: 0, intereses: 0 };

  const tasaMensual = tasaEA > 0 ? _tasaMensualDesdeEA(tasaEA) : 0;
  const cuotaTotal  = (cuotaMensual || 0) + (abonoExtra || 0);
  if (cuotaTotal <= 0) return { meses: MAX_MESES_SIMULACION, intereses: 0 };

  let s = saldo;
  let meses = 0;
  let intereses = 0;

  while (s > 0.01 && meses < MAX_MESES_SIMULACION) {
    meses++;
    const interesMes = s * tasaMensual;
    s += interesMes;
    intereses += interesMes;
    s -= Math.min(cuotaTotal, s);
  }

  return { meses, intereses: Math.round(intereses) };
}

/**
 * Filtra compromisos que pueden entrar en una estrategia de pago.
 * Requiere: deuda (entidad o personal), activo, saldoTotal>0, cuotaMensual>0.
 * La tasa se convierte a EA si está en mensual; si no hay tasa válida, queda 0.
 *
 * `tasaDesconocida` marca las deudas con entidad cuya tasa el usuario no registró
 * (tasa null). En la simulación se tratan como 0%, lo que subestima sus intereses:
 * el motor de recomendación lo señala para que el usuario confirme la tasa real.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @returns {Array<{ id: string, descripcion: string, tipo: string,
 *                   saldo: number, tasaEA: number, cuota: number,
 *                   tasaDesconocida: boolean }>}
 */
export function filtrarDeudasPagables(compromisos) {
  return compromisosActivos(compromisos)
    .filter(c => esDeuda(c.tipo))
    .filter(c => Number.isFinite(c.saldoTotal) && c.saldoTotal > 0)
    .filter(c => Number.isFinite(c.cuotaMensual) && c.cuotaMensual > 0)
    .map(c => ({
      id:          c.id,
      descripcion: c.descripcion,
      tipo:        c.tipo,
      saldo:       c.saldoTotal,
      tasaEA:      tasaEADe(c),
      cuota:       c.cuotaMensual,
      tasaDesconocida: c.tipo === 'deuda-entidad' && (c.tasa === null || c.tasa === undefined),
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

/**
 * Ahorro de intereses (COP) a partir del cual avalancha "vale el esfuerzo"
 * frente a bola de nieve cuando ambas estrategias completan el plan. Por debajo,
 * el ahorro marginal no compensa la motivación de cerrar deudas chicas primero.
 */
const UMBRAL_AHORRO_MATERIAL = 50_000;

/**
 * Recomienda una estrategia de pago analizando la simulación real de ambas
 * estrategias, no solo la dispersión de tasas. El motor decide en este orden:
 *
 *  1. 0 o 1 deuda → no recomienda nada (una sola deuda no necesita estrategia).
 *  2. Ninguna estrategia completa el plan (`viable: false`) → no recomienda
 *     avalancha ni bola: diagnostica qué deudas crecen porque su cuota no cubre
 *     el interés, y calcula el pago extra mínimo para que el plan sí termine.
 *  3. Solo una estrategia completa → esa (la otra dejaría una deuda creciendo).
 *  4. Ambas completan:
 *     - Todas sin interés → bola de nieve (avalancha no aporta nada).
 *     - Avalancha ahorra de forma material (≥ UMBRAL_AHORRO_MATERIAL en
 *       intereses o ≥ 1 mes) → avalancha.
 *     - Ahorro inmaterial o empate → bola de nieve (la motivación pesa más).
 *
 * La decisión usa `extraMensual` porque cambia el resultado: un plan inviable
 * sin extra puede volverse viable (y cambiar de recomendación) con un aporte.
 *
 * @param {ReturnType<typeof filtrarDeudasPagables>} deudas
 * @param {number} [extraMensual=0] COP adicionales por mes que el usuario aporta.
 * @returns {{
 *   estrategia: 'avalancha' | 'bolaNieve' | null,
 *   razon: string,
 *   viable: boolean,
 *   diagnostico: {
 *     deudasCrecientes: Array<{ id: string, descripcion: string, deficitMensual: number }>,
 *     extraMinimo: number | null,
 *   } | null,
 *   ahorroIntereses: number,
 *   ahorroMeses: number,
 * }}
 */
export function recomendarEstrategia(deudas, extraMensual = 0) {
  const vacia = {
    estrategia: null, razon: '', viable: true, diagnostico: null,
    ahorroIntereses: 0, ahorroMeses: 0,
  };
  if (!Array.isArray(deudas) || deudas.length < 2) return vacia;

  const comp = compararEstrategias(deudas, extraMensual);
  const avalanchaCompleta = comp.avalancha.completo;
  const bolaCompleta      = comp.bolaNieve.completo;

  // Caso 2: ningún plan cierra → inviable. Diagnóstico + pago extra mínimo.
  if (!avalanchaCompleta && !bolaCompleta) {
    return {
      estrategia: null,
      razon: '',
      viable: false,
      diagnostico: _diagnosticarInviabilidad(deudas),
      ahorroIntereses: 0,
      ahorroMeses: 0,
    };
  }

  // Caso 3: solo una estrategia logra terminar el plan.
  if (avalanchaCompleta && !bolaCompleta) {
    return {
      estrategia: 'avalancha',
      razon: 'Con tu pago actual, solo atacando primero la deuda más cara (Avalancha) logras terminar de pagar todo. Con Bola de nieve, la deuda de interés más alto seguiría creciendo.',
      viable: true, diagnostico: null,
      ahorroIntereses: comp.ahorroIntereses, ahorroMeses: comp.ahorroMeses,
    };
  }
  if (bolaCompleta && !avalanchaCompleta) {
    return {
      estrategia: 'bolaNieve',
      razon: 'Con tu pago actual, el orden Bola de nieve es el único que logra cerrar todas tus deudas. Liberar cuotas al cerrar las más chicas te da el flujo para terminar.',
      viable: true, diagnostico: null,
      ahorroIntereses: comp.ahorroIntereses, ahorroMeses: comp.ahorroMeses,
    };
  }

  // Caso 4: ambas completan. Decidir por ahorro real.
  const todasSinInteres = deudas.every(d => (d.tasaEA ?? 0) === 0);
  if (todasSinInteres) {
    return {
      estrategia: 'bolaNieve',
      razon: 'Tus deudas no cobran intereses, así que cerrar la más pequeña primero te da progreso visible sin perder dinero por elegir un orden u otro.',
      viable: true, diagnostico: null,
      ahorroIntereses: 0, ahorroMeses: 0,
    };
  }

  const ahorroMaterial = comp.ahorroIntereses >= UMBRAL_AHORRO_MATERIAL || comp.ahorroMeses >= 1;
  if (comp.mejor === 'avalancha' && ahorroMaterial) {
    return {
      estrategia: 'avalancha',
      razon: 'Atacar primero la deuda con la tasa más alta te ahorra más en intereses y/o te hace terminar antes. Mira el detalle para ver cuánto.',
      viable: true, diagnostico: null,
      ahorroIntereses: comp.ahorroIntereses, ahorroMeses: comp.ahorroMeses,
    };
  }

  return {
    estrategia: 'bolaNieve',
    razon: 'El ahorro por priorizar la deuda más cara es pequeño en tu caso, así que pesa más la motivación: cerrar primero la deuda más chica te da impulso visible para seguir.',
    viable: true, diagnostico: null,
    ahorroIntereses: comp.ahorroIntereses, ahorroMeses: comp.ahorroMeses,
  };
}

/**
 * Diagnostica por qué un plan de deudas no cierra: lista las deudas cuya cuota
 * no alcanza a cubrir su propio interés mensual (crecen mes a mes) y calcula el
 * pago extra mínimo que volvería viable el plan completo.
 *
 * @param {ReturnType<typeof filtrarDeudasPagables>} deudas
 * @returns {{
 *   deudasCrecientes: Array<{ id: string, descripcion: string, deficitMensual: number }>,
 *   extraMinimo: number | null,
 * }}
 */
function _diagnosticarInviabilidad(deudas) {
  const deudasCrecientes = deudas
    .map(d => {
      const tasaMensual    = _tasaMensualDesdeEA(d.tasaEA ?? 0);
      const interesMensual = d.saldo * tasaMensual;
      return {
        id:             d.id,
        descripcion:    d.descripcion,
        deficitMensual: interesMensual - (d.cuota || 0),
      };
    })
    .filter(x => x.deficitMensual > 0.01)
    .map(({ id, descripcion, deficitMensual }) => ({ id, descripcion, deficitMensual }));

  return {
    deudasCrecientes,
    extraMinimo: _calcularExtraMinimoViable(deudas),
  };
}

/**
 * Calcula el pago extra mensual mínimo (múltiplo de $10.000) que hace que el
 * plan complete bajo la estrategia Avalancha (la óptima en intereses).
 *
 * Cota superior segura: si el extra cubre todo el interés del primer mes
 * (cuando los saldos, y por tanto los intereses, son máximos), el saldo total
 * baja desde el inicio y el plan cierra. Sobre esa cota se hace búsqueda binaria.
 *
 * @param {ReturnType<typeof filtrarDeudasPagables>} deudas
 * @returns {number | null} Extra mínimo en COP, o null si no se pudo determinar.
 */
function _calcularExtraMinimoViable(deudas) {
  const PASO = 10_000;
  const interesPrimerMes = deudas.reduce(
    (acc, d) => acc + d.saldo * _tasaMensualDesdeEA(d.tasaEA ?? 0), 0);
  const sumaCuotas = deudas.reduce((acc, d) => acc + (d.cuota || 0), 0);

  // Extra que faltaría para cubrir el interés del primer mes, redondeado al
  // siguiente múltiplo de PASO (estrictamente por encima del punto de equilibrio
  // para garantizar que el saldo total baje y no se estanque).
  let hi = Math.ceil(Math.max(PASO, interesPrimerMes - sumaCuotas) / PASO) * PASO;

  // Seguridad: si la cota teórica no cerrara (no debería), ampliar una vez.
  if (!simularEstrategiaPago(deudas, hi, 'avalancha').completo) {
    hi *= 2;
    if (!simularEstrategiaPago(deudas, hi, 'avalancha').completo) return null;
  }

  // Búsqueda binaria del menor múltiplo de PASO en [0, hi] que completa el plan.
  let lo = 0;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / (2 * PASO)) * PASO;
    if (simularEstrategiaPago(deudas, mid, 'avalancha').completo) {
      hi = mid;
    } else {
      lo = mid + PASO;
    }
  }
  return lo;
}

// ── ABONOS A DEUDAS (ADR 002) ────────────────────────────────────
//
// Un "abono" es un Gasto categorizado como "Deudas" con el campo opcional
// `compromisoId` apuntando a la deuda. Al crear el abono, el saldoTotal de
// la deuda se reduce por el monto. Al editar/eliminar el gasto, se sincroniza
// de vuelta. Estas funciones puras encapsulan toda la aritmética; los handlers
// las invocan desde compromisos/index.js y gastos/index.js.

/**
 * Resta `monto` del saldo de una deuda sin permitir resultado negativo.
 *
 * @param {number} saldoActual COP. Saldo antes del abono.
 * @param {number} monto       COP del abono.
 * @returns {number} Nuevo saldo (siempre >= 0).
 */
export function aplicarAbonoASaldo(saldoActual, monto) {
  const s = Number(saldoActual);
  const m = Number(monto);
  if (!Number.isFinite(s) || !Number.isFinite(m)) return 0;
  return Math.max(0, s - m);
}

/**
 * Suma `monto` al saldo de una deuda (revierte un abono previo).
 * Usado al eliminar o editar un gasto con `compromisoId`.
 *
 * @param {number} saldoActual COP.
 * @param {number} monto       COP que se va a revertir.
 * @returns {number} Nuevo saldo.
 */
export function revertirAbonoDeSaldo(saldoActual, monto) {
  const s = Number(saldoActual);
  const m = Number(monto);
  if (!Number.isFinite(s)) return Number.isFinite(m) ? m : 0;
  if (!Number.isFinite(m)) return s;
  return s + m;
}

/**
 * Caps `monto` al saldo de la deuda. Si el usuario intentó abonar más de lo
 * que debe, devuelve el monto exacto necesario para saldar la deuda.
 *
 * @param {number} monto       COP del abono solicitado.
 * @param {number} saldoActual COP que se debe.
 * @returns {{ montoAjustado: number, saldaDeuda: boolean }}
 *   montoAjustado: el monto efectivo a registrar (≤ saldoActual).
 *   saldaDeuda:    true si después del abono saldoActual queda en 0.
 */
export function ajustarMontoAbono(monto, saldoActual) {
  const m = Number(monto);
  const s = Number(saldoActual);
  if (!Number.isFinite(m) || m <= 0) {
    return { montoAjustado: 0, saldaDeuda: false };
  }
  if (!Number.isFinite(s) || s <= 0) {
    return { montoAjustado: 0, saldaDeuda: true };
  }
  if (m >= s) {
    return { montoAjustado: s, saldaDeuda: true };
  }
  return { montoAjustado: m, saldaDeuda: false };
}

/**
 * Valida los datos del formulario de abono a una deuda.
 *
 * Reglas:
 *   - monto: número > 0.
 *   - fecha: requerida y con formato YYYY-MM-DD.
 *   - deuda: debe existir, estar activa y tener saldoTotal > 0.
 *
 * La cuenta (o cuentas) de origen se eligen al confirmar, no en el formulario,
 * así que no se validan aquí.
 *
 * @param {{ monto?: string|number, fecha?: string }} datos
 * @param {import('../../core/state.js').Compromiso | null | undefined} deuda
 * @returns {string[]} Lista de errores (vacía si todo OK).
 */
export function validarAbono(datos, deuda) {
  const errores = [];
  const monto = Number(datos?.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    errores.push('El monto del abono debe ser mayor a 0.');
  }
  if (!datos?.fecha?.trim?.()) {
    errores.push('La fecha es obligatoria.');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) {
    errores.push('La fecha debe estar en formato YYYY-MM-DD.');
  }
  if (!deuda) {
    errores.push('No se encontró la deuda a abonar.');
  } else {
    if (!esDeuda(deuda.tipo)) {
      errores.push('Solo se puede abonar a deudas (entidad o personal).');
    }
    if (deuda.activo === false) {
      errores.push('No puedes abonar a una deuda archivada.');
    }
    const saldo = Number(deuda.saldoTotal);
    if (!Number.isFinite(saldo) || saldo <= 0) {
      errores.push('Esta deuda ya está saldada.');
    }
  }
  return errores;
}

/**
 * Suma los abonos de un compromiso en un mes dado.
 * Un abono es un gasto en S.gastos con `compromisoId` apuntando al compromiso
 * y fecha dentro del mes indicado por `prefijoMes` ('YYYY-MM').
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} compromisoId
 * @param {string} prefijoMes 'YYYY-MM'
 * @returns {number} Total abonado en COP.
 */
export function calcularAbonosDelMes(gastos, compromisoId, prefijoMes) {
  if (!Array.isArray(gastos) || !compromisoId || !prefijoMes) return 0;
  return gastos
    .filter(g => g.compromisoId === compromisoId && g.fecha?.startsWith(prefijoMes))
    .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
}

/**
 * Estado de pago de un compromiso en el mes indicado por `prefijoMes` ('YYYY-MM').
 *
 * - 'ninguno':  no hay gastos vinculados ese mes.
 * - 'parcial':  hay abonos pero no cubren la cuotaMensual (solo aplica a deudas).
 * - 'completo': los abonos cubren o superan la cuotaMensual; o es un gasto fijo
 *               con cualquier gasto vinculado (los fijos se pagan de una vez).
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {import('../../core/state.js').Compromiso} compromiso
 * @param {string} prefijoMes 'YYYY-MM'
 * @returns {'ninguno' | 'parcial' | 'completo'}
 */
export function estadoPagoMes(gastos, compromiso, prefijoMes) {
  if (!compromiso?.id || !prefijoMes) return 'ninguno';

  const totalAbonado = calcularAbonosDelMes(gastos, compromiso.id, prefijoMes);
  if (totalAbonado <= 0) return 'ninguno';

  // Gastos fijos: cualquier importe registrado = pagado (no tienen cuota parcial).
  if (compromiso.tipo === 'fijo') return 'completo';

  // Deudas: comparar abonos contra cuota mensual.
  const cuota = Number(compromiso.cuotaMensual) || 0;
  if (cuota <= 0) return 'completo';
  return totalAbonado >= cuota ? 'completo' : 'parcial';
}

/**
 * Calcula el delta a aplicar al `saldoTotal` de uno o dos compromisos cuando
 * un gasto se edita o crea o elimina.
 *
 * Las tres operaciones se modelan con `antes` y `después` así:
 *   - Crear: antes = null, después = el nuevo gasto.
 *   - Editar: antes = gasto previo, después = gasto editado.
 *   - Eliminar: antes = el gasto, después = null.
 *
 * Regla:
 *   - Si un gasto pasa de tener `compromisoId=X` y monto=A
 *     a tener `compromisoId=X` y monto=B: delta sobre X = A - B
 *     (positivo si el monto bajó: el saldo de la deuda sube).
 *   - Si cambia el compromiso (vinculado a otra deuda): el saldo del primero
 *     sube en A (revierte el abono), el del nuevo baja en B (aplica el abono).
 *   - Si solo el de antes tiene compromisoId (se desvinculó): el saldo sube en A.
 *   - Si solo el de después tiene compromisoId (se vinculó): el saldo baja en B.
 *
 * Devuelve un mapa { compromisoId → delta a sumar al saldoTotal }.
 * Un delta positivo significa "el saldo de la deuda sube" (revertir abono);
 * negativo significa "el saldo de la deuda baja" (aplicar abono).
 *
 * @param {{ compromisoId?: string|null, monto?: number } | null | undefined} antes
 * @param {{ compromisoId?: string|null, monto?: number } | null | undefined} despues
 * @returns {Record<string, number>}
 */
export function deltasSaldoCompromisoPorEdicionGasto(antes, despues) {
  const deltas = {};
  const compAntes  = antes?.compromisoId   ?? null;
  const compDesp   = despues?.compromisoId ?? null;
  const montoAntes = Number(antes?.monto   ?? 0);
  const montoDesp  = Number(despues?.monto ?? 0);

  if (compAntes === compDesp) {
    if (compAntes !== null) {
      // Mismo compromiso: solo aplica la diferencia de monto.
      // Si el nuevo monto es mayor, el saldo de la deuda baja más → delta negativo.
      const delta = montoAntes - montoDesp;
      if (delta !== 0) deltas[compAntes] = delta;
    }
    return deltas;
  }

  // Compromisos distintos (incluye desvincular o vincular): revierte en el viejo,
  // aplica en el nuevo.
  if (compAntes !== null) deltas[compAntes] = (deltas[compAntes] ?? 0) + montoAntes;
  if (compDesp  !== null) deltas[compDesp]  = (deltas[compDesp]  ?? 0) - montoDesp;

  return deltas;
}
