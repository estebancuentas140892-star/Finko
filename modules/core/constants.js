/**
 * constants.js - constantes legales y de catálogo para Colombia.
 *
 * ── Filosofía: Single Source of Truth ─────────────────────────────
 *
 * Los valores legales (SMMLV, UVT, auxilio de transporte, tasa de usura)
 * se almacenan en **dos tablas históricas indexadas por período**:
 *   - `LEGAL_POR_ANIO[anio]`       → valores anuales (smmlv, uvt, auxilio).
 *   - `USURA_POR_PERIODO['anio-Qn']` → tasa de usura trimestral.
 *
 * El resto del proyecto importa los exports estables (`SMMLV`, `UVT`,
 * `AUXILIO_TRANSPORTE`, `TASA_USURA`, `VIGENCIA`, `ANIO_VIGENTE`), que
 * apuntan automáticamente al período vigente según la fecha actual.
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
 * Tasa de usura (cada trimestre, SFC):
 *   1. Agregar UNA entrada en `USURA_POR_PERIODO`:
 *      '2026-Q3': { tasa: 0.NN, desde: '2026-07-01', hasta: '2026-09-30',
 *                    fuente: 'Resolución SFC N° XXXX' }
 *   2. Listo. Hints, validaciones y clasificadores se actualizan solos.
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

// ── TABLA HISTÓRICA: TASA DE USURA (TRIMESTRAL) ──────────────────
//
// La SFC certifica la tasa máxima permitida (TEUM convertida a EA) al
// inicio de cada trimestre.

/** @typedef {{
 *    tasa: number,
 *    desde: string,
 *    hasta: string,
 *    fuente: string
 *  }} UsuraPeriodo */

/** @type {Record<string, UsuraPeriodo>} */
const USURA_POR_PERIODO = {
  '2026-Q1': {
    tasa:  0.2677,
    desde: '2026-01-01',
    hasta: '2026-03-31',
    fuente: 'Resolución SFC Q1 2026',
  },
  '2026-Q2': {
    tasa:  0.2817,
    desde: '2026-04-01',
    hasta: '2026-06-30',
    fuente: 'Resolución SFC Q2 2026',
  },
  // Agregar trimestres futuros aquí.
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
 * Devuelve la tasa de usura vigente en una fecha dada.
 * Si la fecha cae fuera de cualquier período registrado, retorna el
 * último período conocido.
 *
 * @param {Date} [fecha] - Por defecto: ahora.
 * @returns {UsuraPeriodo & { periodo: string }}
 */
export function tasaUsuraVigente(fecha = new Date()) {
  const iso = fecha.toISOString().slice(0, 10);

  // 1) Buscar período que incluye la fecha.
  for (const [periodo, p] of Object.entries(USURA_POR_PERIODO)) {
    if (iso >= p.desde && iso <= p.hasta) {
      return { periodo, ...p };
    }
  }

  // 2) Fallback: último período registrado (más reciente).
  const periodos = Object.keys(USURA_POR_PERIODO).sort();
  const ultima = periodos[periodos.length - 1];
  return { periodo: ultima, ...USURA_POR_PERIODO[ultima] };
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

// ── EXPORTS ESTABLES (los que importa el resto del proyecto) ─────
//
// Estos valores se resuelven una vez al cargar el módulo. Para la mayoría
// de cálculos eso es suficiente (la app se recarga al menos una vez al
// día). Si necesitás el valor para una fecha específica, llamá a
// `legalVigente(fecha)` o `tasaUsuraVigente(fecha)` directamente.

const _vigente = legalVigente();
const _usura   = tasaUsuraVigente();

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

/** Tasa de usura vigente como decimal (ej. 0.2817 para 28.17 % EA). */
export const TASA_USURA = _usura.tasa;

/** Período de la tasa de usura vigente (ej. '2026-Q2'). */
export const PERIODO_USURA = _usura.periodo;

// ── OTRAS CONSTANTES NORMATIVAS (sin vencimiento o estables) ─────

/** Gravamen a los Movimientos Financieros (4×1000).
 *  Fuente: Ley 1111/2006. Estable. */
export const GMF = 0.004;

/** Días base para cálculo de prima de servicios.
 *  Fuente: Ley 52/1975. Estable. */
export const DIAS_PRIMA = 360;

/** Aporte salud para independientes - 12.5 % del IBC.
 *  Fuente: Ley 100/1993, Decreto 1273/2018. Estable. */
export const SALUD_INDEPEND = 0.125;

/** Aporte pensión para independientes - 16 % del IBC.
 *  Fuente: Ley 100/1993, Decreto 1273/2018. Estable. */
export const PENSION_INDEPEND = 0.16;

/** Aporte salud que descuenta el TRABAJADOR dependiente - 4 % del IBC.
 *  El otro 8.5 % lo paga el empleador (total 12.5 %).
 *  Fuente: Ley 100/1993 art. 204, Ley 1122/2007. Estable. */
export const SALUD_EMPLEADO = 0.04;

/** Aporte pensión que descuenta el TRABAJADOR dependiente - 4 % del IBC.
 *  El otro 12 % lo paga el empleador (total 16 %).
 *  Fuente: Ley 100/1993 art. 20, Ley 797/2003. Estable. */
export const PENSION_EMPLEADO = 0.04;

/** Tramos del Fondo de Solidaridad Pensional (FSP), aporte adicional del
 *  trabajador según su IBC medido en múltiplos de SMMLV. Solo aplica desde
 *  4 SMMLV. `hasta` es exclusivo (el último tramo es 20 SMMLV en adelante).
 *  Fuente: Ley 100/1993 art. 27, Decreto 1833/2016. Estable. */
export const FSP_TRAMOS = [
  { desdeSMMLV: 4,  hastaSMMLV: 16, tasa: 0.010 },
  { desdeSMMLV: 16, hastaSMMLV: 17, tasa: 0.012 },
  { desdeSMMLV: 17, hastaSMMLV: 18, tasa: 0.014 },
  { desdeSMMLV: 18, hastaSMMLV: 19, tasa: 0.016 },
  { desdeSMMLV: 19, hastaSMMLV: 20, tasa: 0.018 },
  { desdeSMMLV: 20, hastaSMMLV: Infinity, tasa: 0.020 },
];

/** Tasa anual de los intereses sobre cesantías - 12 % del saldo acumulado.
 *  Fuente: Ley 50/1990 art. 99. Estable. */
export const INTERESES_CESANTIAS = 0.12;

/** ARL clase I (riesgo mínimo, oficinas) - 0.522 % del IBC.
 *  Fuente: Decreto 1295/1994, tabla de cotización. Estable.
 *  Otras clases: II=1.044%, III=2.436%, IV=4.350%, V=6.960%. */
export const ARL_CLASE_I = 0.00522;

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
/** @deprecated Usar `TASA_USURA` (sin sufijo). */
export const TASA_USURA_Q2_2026 = TASA_USURA;

// ── CATÁLOGOS PARA SELECTS ──────────────────────────────────────

/**
 * Bancos y billeteras digitales principales en Colombia.
 *
 * Cada entrada tiene:
 *   id        - string que se guarda en localStorage (compatible con datos previos).
 *   iniciales - letras para el avatar visual (max 2 chars).
 *   color     - fondo del avatar (color corporativo aproximado).
 *   texto     - color del texto dentro del avatar (#ffffff o #1a1a1a).
 *
 * Agregar un banco nuevo no rompe datos existentes: el id es el valor guardado.
 */
export const BANCOS_CO = [
  { id: 'Efectivo',             iniciales: '💵', color: '#16a34a', texto: '#ffffff' },
  { id: 'Bancolombia',          iniciales: 'BC', color: '#FFC727', texto: '#1a1a1a' },
  { id: 'Davivienda',           iniciales: 'DV', color: '#E31837', texto: '#ffffff' },
  { id: 'Banco de Bogotá',      iniciales: 'BB', color: '#00438C', texto: '#ffffff' },
  { id: 'BBVA Colombia',        iniciales: 'BV', color: '#004A9C', texto: '#ffffff' },
  { id: 'Banco Popular',        iniciales: 'BP', color: '#0B5394', texto: '#ffffff' },
  { id: 'Scotiabank Colpatria', iniciales: 'SC', color: '#EC111A', texto: '#ffffff' },
  { id: 'Banco de Occidente',   iniciales: 'BO', color: '#005B8E', texto: '#ffffff' },
  { id: 'Banco AV Villas',      iniciales: 'AV', color: '#E4002B', texto: '#ffffff' },
  { id: 'Nequi',                iniciales: 'Nq', color: '#9C00FF', texto: '#ffffff' },
  { id: 'Daviplata',            iniciales: 'Dp', color: '#FF8000', texto: '#ffffff' },
  { id: 'Nubank',               iniciales: 'Nu', color: '#820AD1', texto: '#ffffff' },
  { id: 'Lulo Bank',            iniciales: 'LB', color: '#FF5A1F', texto: '#ffffff' },
  { id: 'Otro',                 iniciales: '?',  color: '#6B7280', texto: '#ffffff' },
];

/** Tipos de cuenta soportados en el módulo de tesorería. */
export const TIPOS_CUENTA = [
  'Corriente',
  'Ahorros',
  'Efectivo',
  'Inversión',
  'Otro',
];

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
