/**
 * constants.js — constantes legales y de catálogo para Colombia.
 *
 * Reglas:
 * - Toda constante se exporta con nombre. Sin window.X.
 * - Las constantes con vencimiento llevan comentario `Vigente hasta: YYYY-MM-DD`
 *   y deben revisarse cada Q (ver docs/IA_CONTEXT.md → "Constantes legales").
 */

// ── VALORES MONETARIOS / NORMATIVOS ─────────────────────────────

/** Salario Mínimo Mensual Legal Vigente (COP).
 *  Fuente: Mintrabajo. Vigente hasta: 2026-12-31. */
export const SMMLV_2026 = 1_423_500;

/** Auxilio de transporte mensual (COP).
 *  Fuente: Mintrabajo. Vigente hasta: 2026-12-31. */
export const AUXILIO_TRANSPORTE_2026 = 200_000;

/** Unidad de Valor Tributario (COP).
 *  Fuente: DIAN. Vigente hasta: 2026-12-31. */
export const UVT_2026 = 49_799;

/** Tasa de usura Q2 2026 — 28.17 % EA.
 *  Fuente: Superintendencia Financiera de Colombia (SFC), Resolución trimestral.
 *  Vigente hasta: 2026-06-30. Revisar al cierre de cada trimestre. */
export const TASA_USURA_Q2_2026 = 0.2817;

/** Gravamen a los Movimientos Financieros (4×1000).
 *  Fuente: Ley 1111/2006. Estable. */
export const GMF = 0.004;

/** Días base para cálculo de prima de servicios.
 *  Fuente: Ley 52/1975. Estable. */
export const DIAS_PRIMA = 360;

/** Aporte salud para independientes — 12.5 % del IBC.
 *  Fuente: Ley 100/1993, Decreto 1273/2018. Estable. */
export const SALUD_INDEPEND = 0.125;

/** Aporte pensión para independientes — 16 % del IBC.
 *  Fuente: Ley 100/1993, Decreto 1273/2018. Estable. */
export const PENSION_INDEPEND = 0.16;

/** ARL clase I (riesgo mínimo, oficinas) — 0.522 % del IBC.
 *  Fuente: Decreto 1295/1994, tabla de cotización. Estable.
 *  Otras clases: II=1.044%, III=2.436%, IV=4.350%, V=6.960%. */
export const ARL_CLASE_I = 0.00522;

// ── CATÁLOGOS PARA SELECTS ──────────────────────────────────────

/** Bancos y billeteras digitales principales en Colombia. */
export const BANCOS_CO = [
  'Bancolombia',
  'Davivienda',
  'Banco de Bogotá',
  'BBVA Colombia',
  'Banco Popular',
  'Scotiabank Colpatria',
  'Banco de Occidente',
  'Banco AV Villas',
  'Nequi',
  'Daviplata',
  'Nubank',
  'Lulo Bank',
  'Otro',
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
