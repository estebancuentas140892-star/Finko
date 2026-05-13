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

/** Tasa de usura Q1 2026 — 26.77 % EA.
 *  Fuente: Superintendencia Financiera de Colombia (SFC).
 *  Vigente hasta: 2026-03-31. Revisar al cierre de cada trimestre. */
export const TASA_USURA_Q1_2026 = 0.2677;

/** Gravamen a los Movimientos Financieros (4×1000).
 *  Fuente: Ley 1111/2006. Estable. */
export const GMF = 0.004;

/** Días base para cálculo de prima de servicios.
 *  Fuente: Ley 52/1975. Estable. */
export const DIAS_PRIMA = 360;

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
