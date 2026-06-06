/**
 * inversiones/logic.js - funciones puras del dominio Inversión (J.2).
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 *
 * Registra inversiones reales del usuario (CDT, fondos, acciones, cripto) con
 * monto, tasa EA estimada, plazo y fecha de inicio. En J.2a solo se usa el
 * `monto` para el total invertido; la tasa y el plazo se capturan para que
 * J.2b proyecte el valor al vencimiento sin pedir datos de nuevo.
 *
 * Respeta la regla ADN #10: recibe primitivos/arrays, no importa de otro dominio.
 * Sí importa de `infra/financiero.js` (capa infra, no dominio): ahí viven las
 * fórmulas financieras CO reutilizables (CDT, interés compuesto, Fisher).
 */

import {
  calcularCDT,
  calcularInteresCompuesto,
  calcularRentabilidadReal,
} from '../../infra/financiero.js';

// ── TIPOS DE INVERSIÓN ───────────────────────────────────────────

/**
 * Tipos soportados. El orden define el del selector en el formulario.
 * 'Otro' cubre cualquier vehículo no listado (bonos, finca raíz, etc.).
 */
export const TIPOS_INVERSION = ['CDT', 'Fondo', 'Acciones', 'Cripto', 'Otro'];

/** Tasa EA máxima razonable para un campo de entrada (%). Evita valores absurdos. */
export const TASA_EA_MAX = 100;

/** Plazo máximo razonable en meses (50 años). Evita valores absurdos. */
export const PLAZO_MESES_MAX = 600;

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Suma el monto invertido de todas las inversiones registradas.
 *
 * @param {Array<{monto:number}>} inversiones
 * @returns {number} COP. Nunca negativo; 0 si el input no es válido o está vacío.
 */
export function calcularTotalInvertido(inversiones) {
  if (!Array.isArray(inversiones)) return 0;
  return inversiones.reduce((sum, inv) => {
    const m = Number(inv?.monto);
    return sum + (Number.isFinite(m) && m > 0 ? m : 0);
  }, 0);
}

/**
 * Agrupa el monto invertido por tipo, para un futuro desglose del portafolio.
 * Devuelve solo los tipos con monto > 0, ordenados de mayor a menor.
 *
 * @param {Array<{tipo:string, monto:number}>} inversiones
 * @returns {Array<{tipo:string, total:number, pct:number}>}
 */
export function calcularPorTipo(inversiones) {
  if (!Array.isArray(inversiones)) return [];
  const acc = Object.create(null);
  let total = 0;
  for (const inv of inversiones) {
    const m = Number(inv?.monto);
    if (!Number.isFinite(m) || m <= 0) continue;
    const tipo = typeof inv?.tipo === 'string' && inv.tipo ? inv.tipo : 'Otro';
    acc[tipo] = (acc[tipo] || 0) + m;
    total += m;
  }
  if (total <= 0) return [];
  return Object.entries(acc)
    .map(([tipo, t]) => ({ tipo, total: t, pct: Math.round((t / total) * 100) }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Ordena las inversiones de mayor a menor monto (posición más grande primero).
 * No muta el array original.
 *
 * @param {Array<{monto:number}>} inversiones
 * @returns {Array} copia ordenada.
 */
export function ordenarInversionesPorMonto(inversiones) {
  if (!Array.isArray(inversiones)) return [];
  return [...inversiones].sort((a, b) => (Number(b?.monto) || 0) - (Number(a?.monto) || 0));
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida el tipo de inversión contra TIPOS_INVERSION.
 * @param {string} raw
 * @returns {string[]} mensajes de error (vacío = válido).
 */
export function validarTipoInversion(raw) {
  if (typeof raw !== 'string' || !TIPOS_INVERSION.includes(raw)) {
    return ['Selecciona un tipo de inversión válido.'];
  }
  return [];
}

/**
 * Valida el nombre de la inversión (no vacío, hasta 60 caracteres).
 * @param {string} raw
 * @returns {string[]}
 */
export function validarNombreInversion(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return ['El nombre es requerido.'];
  }
  if (raw.trim().length > 60) {
    return ['El nombre no puede superar los 60 caracteres.'];
  }
  return [];
}

/**
 * Valida el monto invertido (número > 0).
 * @param {string|number} raw
 * @returns {string[]}
 */
export function validarMontoInversion(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return ['El monto debe ser un número.'];
  if (n <= 0)              return ['El monto invertido debe ser mayor que cero.'];
  return [];
}

/**
 * Valida la tasa EA estimada (%). Es opcional: 0 es válido (rentabilidad
 * variable, como acciones o cripto). Rango 0 a TASA_EA_MAX.
 * @param {string|number} raw
 * @returns {string[]}
 */
export function validarTasaEAInversion(raw) {
  if (raw === '' || raw == null) return []; // opcional: vacío = 0
  const n = Number(raw);
  if (!Number.isFinite(n))       return ['La tasa debe ser un número.'];
  if (n < 0)                     return ['La tasa no puede ser negativa.'];
  if (n > TASA_EA_MAX)           return [`La tasa no puede superar ${TASA_EA_MAX}%.`];
  return [];
}

/**
 * Valida el plazo en meses. Opcional: 0 = sin plazo fijo (acciones, cripto).
 * Debe ser entero entre 0 y PLAZO_MESES_MAX.
 * @param {string|number} raw
 * @returns {string[]}
 */
export function validarPlazoMeses(raw) {
  if (raw === '' || raw == null) return []; // opcional: vacío = 0
  const n = Number(raw);
  if (!Number.isFinite(n))         return ['El plazo debe ser un número.'];
  if (!Number.isInteger(n))        return ['El plazo debe ser un número entero de meses.'];
  if (n < 0)                       return ['El plazo no puede ser negativo.'];
  if (n > PLAZO_MESES_MAX)         return [`El plazo no puede superar ${PLAZO_MESES_MAX} meses.`];
  return [];
}

/**
 * Valida la fecha de inicio (formato YYYY-MM-DD requerido).
 * @param {string} raw
 * @returns {string[]}
 */
export function validarFechaInicio(raw) {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return ['La fecha de inicio es requerida.'];
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return ['El formato de fecha no es válido (se esperaba YYYY-MM-DD).'];
  }
  return [];
}

/**
 * Valida todos los campos del formulario de inversión de una sola pasada.
 * @param {{tipo:string, nombre:string, monto:string|number,
 *          tasaEA:string|number, plazoMeses:string|number, fechaInicio:string}} datos
 * @returns {string[]} todos los errores acumulados (vacío = válido).
 */
export function validarInversion(datos) {
  const d = datos ?? {};
  return [
    ...validarTipoInversion(d.tipo),
    ...validarNombreInversion(d.nombre),
    ...validarMontoInversion(d.monto),
    ...validarTasaEAInversion(d.tasaEA),
    ...validarPlazoMeses(d.plazoMeses),
    ...validarFechaInicio(d.fechaInicio),
  ];
}

// ── NORMALIZACIÓN ────────────────────────────────────────────────

/** Redondea el monto a entero COP; 0 si no es válido. */
export function normalizarMontoInversion(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

/** Tasa EA con 2 decimales, acotada a [0, TASA_EA_MAX]; 0 si vacío o inválido. */
export function normalizarTasaEAInversion(raw) {
  if (raw === '' || raw == null) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(Math.min(n, TASA_EA_MAX) * 100) / 100;
}

/** Plazo entero >= 0; 0 si vacío o inválido. */
export function normalizarPlazoMeses(raw) {
  if (raw === '' || raw == null) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), PLAZO_MESES_MAX);
}

/**
 * Construye un objeto inversión normalizado a partir de los datos crudos del
 * formulario. No asigna `id` ni `fechaCreacion`: eso lo hace crud.guardar().
 *
 * @param {{tipo:string, nombre:string, monto:string|number,
 *          tasaEA:string|number, plazoMeses:string|number, fechaInicio:string}} datos
 * @returns {{tipo:string, nombre:string, monto:number, tasaEA:number,
 *           plazoMeses:number, fechaInicio:string}}
 */
export function normalizarInversion(datos) {
  const d = datos ?? {};
  return {
    tipo:        TIPOS_INVERSION.includes(d.tipo) ? d.tipo : 'Otro',
    nombre:      String(d.nombre ?? '').trim(),
    monto:       normalizarMontoInversion(d.monto),
    tasaEA:      normalizarTasaEAInversion(d.tasaEA),
    plazoMeses:  normalizarPlazoMeses(d.plazoMeses),
    fechaInicio: String(d.fechaInicio ?? '').trim(),
  };
}

// ── PROYECCIÓN AL VENCIMIENTO (J.2b) ─────────────────────────────

/** Días promedio por mes, para convertir `plazoMeses` a días en el CDT. */
const DIAS_POR_MES = 365 / 12;

/**
 * Una inversión es "proyectable" solo si tiene tasa EA y plazo definidos.
 * Sin tasa (acciones/cripto de retorno variable) o sin plazo (posición
 * abierta) no se puede proyectar un valor al vencimiento de forma honesta.
 *
 * @param {{tasaEA:number, plazoMeses:number, monto:number}} inv
 * @returns {boolean}
 */
export function esProyectable(inv) {
  const tasa  = Number(inv?.tasaEA);
  const plazo = Number(inv?.plazoMeses);
  const monto = Number(inv?.monto);
  return (
    Number.isFinite(monto) && monto > 0 &&
    Number.isFinite(tasa)  && tasa  > 0 &&
    Number.isFinite(plazo) && plazo > 0
  );
}

/**
 * Proyecta el valor de una inversión a su vencimiento.
 *
 * - CDT: usa `calcularCDT` y aplica la retención en la fuente del 7 % sobre el
 *   rendimiento (igual que la herramienta CDT de la app). `valorFuturo` es neto.
 * - Resto (Fondo/Acciones/Cripto/Otro): crecimiento compuesto al EA sin retención
 *   (la retención de fondos varía y no se modela aquí). `valorFuturo` es bruto.
 *
 * @param {{tipo:string, monto:number, tasaEA:number, plazoMeses:number}} inv
 * @returns {{
 *   aplicaRetencion: boolean,
 *   valorFuturo: number,        // valor final (neto en CDT, bruto en el resto)
 *   valorFuturoBruto: number,   // antes de retención
 *   retencion: number,          // 0 si no aplica
 *   rendimiento: number,        // valorFuturo - monto
 * } | null} null si la inversión no es proyectable.
 */
export function proyectarInversion(inv) {
  if (!esProyectable(inv)) return null;

  const monto      = Number(inv.monto);
  const tasaEA     = Number(inv.tasaEA);
  const plazoMeses = Number(inv.plazoMeses);

  if (inv.tipo === 'CDT') {
    const dias = Math.max(1, Math.round(plazoMeses * DIAS_POR_MES));
    const r = calcularCDT(monto, tasaEA / 100, dias);
    return {
      aplicaRetencion:  true,
      valorFuturo:      r.totalNeto,
      valorFuturoBruto: r.valorFuturo,
      retencion:        r.retencion,
      rendimiento:      r.rendimientoNeto,
    };
  }

  // Capitalización anual (periodosPorAnio = 1) reproduce exactamente la tasa
  // efectiva anual: VF = monto × (1 + EA)^(plazoMeses/12).
  const anios = plazoMeses / 12;
  const r = calcularInteresCompuesto(monto, tasaEA, 1, anios);
  return {
    aplicaRetencion:  false,
    valorFuturo:      r.montoFinal,
    valorFuturoBruto: r.montoFinal,
    retencion:        0,
    rendimiento:      r.ganancia,
  };
}

/**
 * Agrega la proyección de todo el portafolio.
 * Los holdings no proyectables se cuentan a su valor invertido (no se asume
 * ninguna ganancia).
 *
 * @param {Array} inversiones
 * @returns {{
 *   totalInvertido: number,
 *   totalProyectado: number,
 *   rendimientoEsperado: number,
 *   proyectables: number,
 *   noProyectables: number,
 * }}
 */
export function proyectarPortafolio(inversiones) {
  const base = {
    totalInvertido: 0, totalProyectado: 0, rendimientoEsperado: 0,
    proyectables: 0, noProyectables: 0,
  };
  if (!Array.isArray(inversiones)) return base;

  for (const inv of inversiones) {
    const monto = Number(inv?.monto);
    if (!Number.isFinite(monto) || monto <= 0) continue;
    base.totalInvertido += monto;

    const p = proyectarInversion(inv);
    if (p) {
      base.totalProyectado += p.valorFuturo;
      base.proyectables    += 1;
    } else {
      base.totalProyectado += monto; // sin proyección: vale lo invertido
      base.noProyectables  += 1;
    }
  }

  base.rendimientoEsperado = base.totalProyectado - base.totalInvertido;
  return base;
}

/**
 * Tasa EA nominal promedio del portafolio, ponderada por monto, considerando
 * solo los holdings proyectables.
 *
 * @param {Array} inversiones
 * @returns {number|null} % EA (2 decimales), o null si no hay proyectables.
 */
export function tasaPromedioPonderada(inversiones) {
  if (!Array.isArray(inversiones)) return null;
  let sumaPonderada = 0;
  let sumaMontos    = 0;
  for (const inv of inversiones) {
    if (!esProyectable(inv)) continue;
    const monto = Number(inv.monto);
    sumaPonderada += monto * Number(inv.tasaEA);
    sumaMontos    += monto;
  }
  if (sumaMontos <= 0) return null;
  return Math.round((sumaPonderada / sumaMontos) * 100) / 100;
}

/**
 * Rentabilidad real del portafolio ajustada por inflación (fórmula de Fisher).
 * Usa la tasa nominal promedio ponderada y el capital de los holdings
 * proyectables.
 *
 * @param {Array} inversiones
 * @param {number} inflacionPct  inflación anual esperada en porcentaje (ej. 3).
 * @returns {{
 *   tasaNominalPct: number,
 *   tasaRealPct: number,
 *   capital: number,
 *   gananciaReal: number,
 *   perdidaInflacion: number,
 * } | null} null si no hay holdings proyectables.
 */
export function calcularRentabilidadRealPortafolio(inversiones, inflacionPct) {
  const tasaNominal = tasaPromedioPonderada(inversiones);
  if (tasaNominal === null) return null;

  let capital = 0;
  for (const inv of inversiones) {
    if (esProyectable(inv)) capital += Number(inv.monto) || 0;
  }

  const infl = Number.isFinite(Number(inflacionPct)) ? Number(inflacionPct) : 0;
  const r = calcularRentabilidadReal(capital, tasaNominal, infl);
  return {
    tasaNominalPct:   tasaNominal,
    tasaRealPct:      r.tasaRealPct,
    capital,
    gananciaReal:     r.gananciaReal,
    perdidaInflacion: r.perdidaInflacion,
  };
}

// ── EDUCACIÓN / NUDGES (J.2c) ────────────────────────────────────

/** Un solo tipo concentra demasiado el portafolio a partir de este %. */
export const UMBRAL_CONCENTRACION_PCT = 70;

/** El portafolio tiene demasiado peso en retorno variable a partir de este %. */
export const UMBRAL_VARIABLE_PCT = 50;

/**
 * Detecta nudges educativos sobre el portafolio. No tiene DOM ni efectos: el
 * caller (index/view) lee el estado del fondo de emergencia (`contexto`) sin
 * que este dominio importe a otro (regla ADN #10), y la vista pinta el HTML.
 *
 * Orden de prioridad (mayor severidad primero):
 *   1. Fondo de emergencia primero (high si no hay fondo, medium si incompleto).
 *   2. Concentración: un tipo supera UMBRAL_CONCENTRACION_PCT (con 2+ holdings).
 *   3. Retorno variable: el peso variable supera UMBRAL_VARIABLE_PCT.
 *   4. Refuerzo positivo: base sana (fondo completo + diversificado).
 *
 * @param {Array} inversiones
 * @param {{ fondoActivo?: boolean, fondoCompletado?: boolean }} [contexto]
 * @returns {Array<{id:string, nivel:string, icono:string, titulo:string, desc:string}>}
 */
export function detectarNudgesInversion(inversiones, contexto = {}) {
  const lista = Array.isArray(inversiones)
    ? inversiones.filter(i => Number(i?.monto) > 0)
    : [];
  if (lista.length === 0) return [];

  const { fondoActivo = false, fondoCompletado = false } = contexto;
  const total   = calcularTotalInvertido(lista);
  const porTipo = calcularPorTipo(lista);
  const nudges  = [];

  // 1. Fondo de emergencia primero.
  if (!fondoActivo) {
    nudges.push({
      id:     'fondo-primero',
      nivel:  'nudge-high',
      icono:  '🛡️',
      titulo: 'Asegura tu fondo de emergencia antes de invertir',
      desc:   'Si surge un imprevisto sin un colchón, podrías tener que vender una inversión en mal momento o endeudarte. Actívalo en la sección Ahorro.',
    });
  } else if (!fondoCompletado) {
    nudges.push({
      id:     'fondo-incompleto',
      nivel:  'nudge-medium',
      icono:  '🛡️',
      titulo: 'Tu fondo de emergencia aún no está completo',
      desc:   'Vas bien invirtiendo, pero prioriza terminar tu colchón: es tu red de seguridad antes que la rentabilidad.',
    });
  }

  // 2. Concentración por tipo (solo tiene sentido con 2 o más holdings).
  if (lista.length >= 2 && porTipo.length > 0 && porTipo[0].pct >= UMBRAL_CONCENTRACION_PCT) {
    nudges.push({
      id:     'concentracion',
      nivel:  'nudge-medium',
      icono:  '⚖️',
      titulo: `El ${porTipo[0].pct}% de tu portafolio está en ${porTipo[0].tipo}`,
      desc:   'Concentrar todo en un solo tipo aumenta el riesgo. Repartir entre varios (renta fija, fondos, acciones) suaviza los altibajos.',
    });
  }

  // 3. Peso en retorno variable (acciones/cripto sin tasa o plazo fijo).
  const montoVariable = lista
    .filter(i => !esProyectable(i))
    .reduce((s, i) => s + (Number(i.monto) || 0), 0);
  const pctVariable = total > 0 ? Math.round((montoVariable / total) * 100) : 0;
  if (pctVariable >= UMBRAL_VARIABLE_PCT) {
    nudges.push({
      id:     'riesgo-variable',
      nivel:  'nudge-info',
      icono:  '🎢',
      titulo: `El ${pctVariable}% de tu portafolio es de retorno variable`,
      desc:   'Acciones y cripto pueden subir mucho, pero también caer. Invierte aquí solo lo que no necesitarás a corto plazo y te haga sentir cómodo.',
    });
  }

  // 4. Refuerzo positivo: fondo completo y portafolio diversificado.
  const diversificado = porTipo.length >= 2 && (porTipo[0]?.pct ?? 100) < UMBRAL_CONCENTRACION_PCT;
  if (fondoCompletado && diversificado) {
    nudges.push({
      id:     'base-sana',
      nivel:  'nudge-success',
      icono:  '🌟',
      titulo: 'Vas por buen camino',
      desc:   'Tu fondo de emergencia está completo y tu portafolio está diversificado. Esa es una base financiera sólida.',
    });
  }

  return nudges;
}
