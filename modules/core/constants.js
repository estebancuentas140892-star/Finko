/**
 * constants.js - constantes legales y de catálogo para Colombia.
 *
 * ── Filosofía: Single Source of Truth ─────────────────────────────
 *
 * Los valores legales anuales (SMMLV, UVT, auxilio de transporte) se
 * almacenan en una tabla histórica indexada por año:
 *   - `LEGAL_POR_ANIO[anio]` → valores anuales (smmlv, uvt, auxilio).
 *
 * El resto del proyecto importa los exports estables (`SMMLV`, `UVT`,
 * `AUXILIO_TRANSPORTE`, `VIGENCIA`, `ANIO_VIGENTE`), que apuntan
 * automáticamente al año vigente según la fecha actual.
 *
 * Nota: la tasa de usura (certificación trimestral de la SFC) se eliminó
 * en 2026-06 por su alto costo de mantenimiento. Ver ADR 004.
 *
 * ── Cómo actualizar valores legales ──────────────────────────────
 *
 * Año nuevo (cada diciembre/enero):
 *   1. Agregar UNA entrada en `LEGAL_POR_ANIO` con los valores oficiales:
 *      2027: { smmlv: ..., auxilioTransporte: ..., uvt: ...,
 *               vigenciaDesde: '2027-01-01', fuentes: { ... } }
 *   2. Listo. Toda la app (UI, cálculos, tests) usa los valores nuevos
 *      automáticamente cuando la fecha del sistema entra en 2027.
 *
 * Reglas:
 *   - Toda constante se exporta con nombre. Sin window.X.
 *   - Las constantes con vencimiento se manejan en este archivo.
 */

// ── TABLA HISTÓRICA: VALORES ANUALES ─────────────────────────────
//
// Cada entrada anual contiene los valores oficiales publicados por el
// Ministerio de Trabajo (SMMLV, auxilio) y la DIAN (UVT).

/** @typedef {{
 *    smmlv: number,
 *    auxilioTransporte: number,
 *    uvt: number,
 *    vigenciaDesde: string,
 *    fuentes: { smmlv: string, auxilio: string, uvt: string }
 *  }} ValoresLegalesAnio */

/** @type {Record<number, ValoresLegalesAnio | null>} */
const LEGAL_POR_ANIO = {
  2025: {
    smmlv:             1_300_000, // Decreto 2292/2024 - incluido para histórico/migraciones
    auxilioTransporte:   162_000,
    uvt:                  47_065,
    vigenciaDesde: '2025-01-01',
    fuentes: {
      smmlv:   'Decreto 2292/2024 (Mintrabajo)',
      auxilio: 'Decreto 2293/2024 (Mintrabajo)',
      uvt:     'Resolución DIAN 000193/2024',
    },
  },
  2026: {
    smmlv:             1_750_905,
    auxilioTransporte:   249_095,
    uvt:                  52_374,
    vigenciaDesde: '2026-01-01',
    fuentes: {
      smmlv:   'Decreto 1469 del 29-12-2025 (Mintrabajo), ratificado por Decreto 0159 del 19-02-2026',
      auxilio: 'Decreto 1470 del 29-12-2025 (Mintrabajo)',
      uvt:     'Resolución DIAN 000238 del 15-12-2025',
    },
  },
  // 2027: agregar aquí cuando se publiquen los decretos/resoluciones
  //       (esperado: última semana de diciembre 2026).
  2027: null,
};

// ── SELECTORES (vigencia dinámica por fecha) ─────────────────────

/**
 * Devuelve los valores legales vigentes en una fecha dada.
 * Si la fecha cae en un año sin entrada (ej. enero 2027 antes de que se
 * publiquen los valores), retorna el último año publicado disponible.
 *
 * @param {Date} [fecha] - Por defecto: ahora.
 * @returns {ValoresLegalesAnio & { anio: number }}
 */
export function legalVigente(fecha = new Date()) {
  const anioActual = fecha.getFullYear();

  // 1) Si hay entrada para el año actual, usarla.
  if (LEGAL_POR_ANIO[anioActual]) {
    return { anio: anioActual, ...LEGAL_POR_ANIO[anioActual] };
  }

  // 2) Fallback: último año publicado anterior o igual al actual.
  const publicados = Object.keys(LEGAL_POR_ANIO)
    .map(Number)
    .filter(a => LEGAL_POR_ANIO[a] != null && a <= anioActual)
    .sort((a, b) => b - a);

  if (publicados.length > 0) {
    const anio = publicados[0];
    return { anio, ...LEGAL_POR_ANIO[anio] };
  }

  // 3) Caso extremo: ningún año publicado ≤ actual (no debería pasar).
  //    Devolver el primer año disponible para no romper la app.
  const anyAnio = Object.keys(LEGAL_POR_ANIO)
    .map(Number)
    .filter(a => LEGAL_POR_ANIO[a] != null)
    .sort()[0];
  return { anio: anyAnio, ...LEGAL_POR_ANIO[anyAnio] };
}

/**
 * Devuelve los valores legales de un año específico (lectura histórica).
 * Útil para reportes o análisis sobre datos antiguos.
 *
 * @param {number} anio
 * @returns {ValoresLegalesAnio | null}
 */
export function legalDelAnio(anio) {
  return LEGAL_POR_ANIO[anio] ?? null;
}

/**
 * Devuelve la lista de años con valores legales publicados.
 * @returns {number[]}
 */
export function aniosPublicados() {
  return Object.keys(LEGAL_POR_ANIO)
    .map(Number)
    .filter(a => LEGAL_POR_ANIO[a] != null)
    .sort((a, b) => a - b);
}

/**
 * Indica si los valores legales que está usando la app corresponden a un año
 * anterior al actual. Ocurre cuando empieza un año nuevo pero todavía no se
 * cargaron en `LEGAL_POR_ANIO` los valores oficiales de ese año: la app cae al
 * último año publicado como referencia provisional (ver `legalVigente`).
 *
 * Las vistas usan este estado para avisar al usuario que las cifras (SMMLV,
 * UVT, topes de renta) pueden estar desactualizadas, en vez de mostrarlas como
 * si fueran del año en curso sin más.
 *
 * @param {Date} [fecha] - Por defecto: ahora.
 * @returns {{ desactualizado: boolean, anioActual: number, anioVigente: number }}
 */
export function estadoVigenciaLegal(fecha = new Date()) {
  const anioActual  = fecha.getFullYear();
  const anioVigente = legalVigente(fecha).anio;
  return {
    desactualizado: anioVigente < anioActual,
    anioActual,
    anioVigente,
  };
}

// ── EXPORTS ESTABLES (los que importa el resto del proyecto) ─────
//
// Estos valores se resuelven una vez al cargar el módulo. Para la mayoría
// de cálculos eso es suficiente (la app se recarga al menos una vez al
// día). Si necesitas el valor para una fecha específica, llama a
// `legalVigente(fecha)` directamente.

const _vigente = legalVigente();

/** Salario Mínimo Mensual Legal Vigente (COP). */
export const SMMLV = _vigente.smmlv;

/** Auxilio de transporte mensual (COP). */
export const AUXILIO_TRANSPORTE = _vigente.auxilioTransporte;

/** Unidad de Valor Tributario (COP). */
export const UVT = _vigente.uvt;

/** Fecha ISO desde la cual rigen los valores vigentes. */
export const VIGENCIA = _vigente.vigenciaDesde;

/** Año al que corresponden los valores vigentes. */
export const ANIO_VIGENTE = _vigente.anio;

// ── OTRAS CONSTANTES NORMATIVAS (sin vencimiento o estables) ─────

/** Gravamen a los Movimientos Financieros (4×1000).
 *  Fuente: Ley 1111/2006. Estable. */
export const GMF = 0.004;

/** Topes de obligación de declarar renta para personas naturales, expresados
 *  en múltiplos de UVT. Los valores en pesos se derivan en vivo de `UVT`
 *  para que actualizar el UVT del año recalcule todos los topes solos.
 *
 *  Fuente: Estatuto Tributario art. 594-3 y Decreto reglamentario anual.
 *  Estable en el número de UVT desde hace varios años; lo que cambia es la UVT.
 *
 *  Sin tope superado: no obliga declarar por ese criterio (basta con uno
 *  para quedar obligado). El umbral de alerta preventiva es del 80 %. */
export const TOPES_RENTA_UVT = {
  ingresosBrutos:   1400,
  patrimonioBruto:  4500,
  consumosTotales:  1400,
  consumosTC:       1400,
  consignaciones:   1400,
};

/** Porcentaje del tope sobre el cual Finko emite alerta preventiva
 *  ("estás cerca del límite"). Antes era 80; subir es menos sensible. */
export const UMBRAL_ALERTA_RENTA = 0.80;

/** Meta de inflación de largo plazo del Banco de la República (3 % EA).
 *  Supuesto por defecto para proyectar la rentabilidad REAL de inversiones
 *  (descuenta la pérdida de poder adquisitivo). Es una meta puntual, no el
 *  dato del mes: la inflación observada puede diferir.
 *  Fuente: Banco de la República, meta puntual de inflación de largo plazo.
 *  Revisar: anual (la meta puntual es estable en 3 % desde 2010). */
export const INFLACION_OBJETIVO = 0.03;

// ── METADATOS DE LA APP ──────────────────────────────────────────

/** Nombre comercial. Usado en títulos, headers, "Acerca de". */
export const APP_NAME = 'Finko';

/** Versión semántica. Debe mantenerse en sync con `package.json`. */
export const APP_VERSION = '0.1.0';

// ── ALIASES DE COMPATIBILIDAD (DEPRECATED) ───────────────────────
//
// Estos exports mantienen el código viejo funcional mientras se migra.
// Nuevos usos: importar `SMMLV`, `UVT`, etc. sin sufijo de año.
// TODO: eliminar en una próxima fase cuando no queden consumidores.

/** @deprecated Usar `SMMLV` (sin sufijo). */
export const SMMLV_2026 = SMMLV;
/** @deprecated Usar `AUXILIO_TRANSPORTE` (sin sufijo). */
export const AUXILIO_TRANSPORTE_2026 = AUXILIO_TRANSPORTE;
/** @deprecated Usar `UVT` (sin sufijo). */
export const UVT_2026 = UVT;
/** @deprecated Usar `VIGENCIA` (sin sufijo). */
export const VIGENCIA_2026 = VIGENCIA;

// ── CATÁLOGOS PARA SELECTS ──────────────────────────────────────

/**
 * Bancos y billeteras digitales principales en Colombia.
 *
 * Cada entrada tiene:
 *   id        - string que se guarda en localStorage (compatible con datos previos).
 *   iniciales - letras para el avatar visual (max 2 chars).
 *   color     - fondo del avatar (color corporativo aproximado).
 *   texto     - color del texto dentro del avatar (#ffffff o #1a1a1a).
 *   clase     - familia de la entidad: 'efectivo' | 'banco' | 'billetera' | 'otro'.
 *               Maneja qué campos muestra el formulario de cuenta (tipos de
 *               cuenta compatibles, 4x1000, cuota de manejo). Ver TIPOS_POR_CLASE.
 *
 * Agregar un banco nuevo no rompe datos existentes: el id es el valor guardado.
 */
export const BANCOS_CO = [
  { id: 'Efectivo',             iniciales: '💵', color: '#16a34a', texto: '#ffffff', clase: 'efectivo'  },
  { id: 'Bancolombia',          iniciales: 'BC', color: '#FFC727', texto: '#1a1a1a', clase: 'banco'     },
  { id: 'Davivienda',           iniciales: 'DV', color: '#E31837', texto: '#ffffff', clase: 'banco'     },
  { id: 'Banco de Bogotá',      iniciales: 'BB', color: '#00438C', texto: '#ffffff', clase: 'banco'     },
  { id: 'BBVA Colombia',        iniciales: 'BV', color: '#004A9C', texto: '#ffffff', clase: 'banco'     },
  { id: 'Banco Popular',        iniciales: 'BP', color: '#0B5394', texto: '#ffffff', clase: 'banco'     },
  { id: 'Scotiabank Colpatria', iniciales: 'SC', color: '#EC111A', texto: '#ffffff', clase: 'banco'     },
  { id: 'Banco de Occidente',   iniciales: 'BO', color: '#005B8E', texto: '#ffffff', clase: 'banco'     },
  { id: 'Banco AV Villas',      iniciales: 'AV', color: '#E4002B', texto: '#ffffff', clase: 'banco'     },
  { id: 'Nequi',                iniciales: 'Nq', color: '#9C00FF', texto: '#ffffff', clase: 'billetera' },
  { id: 'Daviplata',            iniciales: 'Dp', color: '#FF8000', texto: '#ffffff', clase: 'billetera' },
  { id: 'Nubank',               iniciales: 'Nu', color: '#820AD1', texto: '#ffffff', clase: 'billetera' },
  { id: 'Lulo Bank',            iniciales: 'LB', color: '#FF5A1F', texto: '#ffffff', clase: 'billetera' },
  { id: 'Otro',                 iniciales: '?',  color: '#6B7280', texto: '#ffffff', clase: 'otro'      },
];

/**
 * Tipos de cuenta soportados en el módulo de tesorería.
 *
 * "Inversión" se eliminó en v11: las inversiones reales (CDT, fondos, acciones,
 * cripto) viven en el dominio Inversión (sección "Crecer"), con monto, tasa y
 * plazo. Una cuenta de tesorería es un saldo disponible, no un instrumento de
 * inversión. Las cuentas viejas con tipo 'Inversión' se migran a 'Otro'.
 */
export const TIPOS_CUENTA = [
  'Corriente',
  'Ahorros',
  'Efectivo',
  'Otro',
];

/**
 * Tipos de cuenta válidos según la clase de entidad (BANCOS_CO[i].clase).
 * El formulario de cuenta filtra el selector "Tipo de cuenta" con esta tabla:
 *   - banco:     Corriente o Ahorros.
 *   - billetera: saldo único, no aplica tipo bancario (selector oculto).
 *   - efectivo:  no aplica (selector oculto; tipo se normaliza a 'Efectivo').
 *   - otro:      genérico (Ahorros u Otro).
 * Una lista vacía significa "no mostrar el selector de tipo".
 */
export const TIPOS_POR_CLASE = {
  banco:     ['Corriente', 'Ahorros'],
  billetera: [],
  efectivo:  [],
  otro:      ['Ahorros', 'Otro'],
};

/** Categorías de gasto variable. */
export const CATEGORIAS_GASTO = [
  'Alimentación',
  'Transporte',
  'Vivienda',
  'Salud',
  'Educación',
  'Entretenimiento',
  'Ropa',
  'Servicios públicos',
  'Deudas',
  'Ahorro',
  'Otros',
];

/** Emoji visual por categoría de gasto. Usar solo en UI; nunca en el valor almacenado. */
export const CATEGORIA_EMOJI = {
  'Alimentación':       '🛒',
  'Transporte':         '🚗',
  'Vivienda':           '🏠',
  'Salud':              '💊',
  'Educación':          '📚',
  'Entretenimiento':    '🎉',
  'Ropa':               '👕',
  'Servicios públicos': '💡',
  'Deudas':             '💳',
  'Ahorro':             '💰',
  'Otros':              '📦',
};

/** Frecuencias soportadas en compromisos e ingresos recurrentes. */
export const FRECUENCIAS = [
  'Diario',
  'Semanal',
  'Quincenal',
  'Mensual',
  'Bimestral',
  'Trimestral',
  'Semestral',
  'Anual',
  'Única vez',
];
