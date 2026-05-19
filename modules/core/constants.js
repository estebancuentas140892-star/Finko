/**
 * constants.js — constantes legales y de catálogo para Colombia.
 *
 * Reglas:
 * - Toda constante se exporta con nombre. Sin window.X.
 * - Las constantes con vencimiento llevan comentario `Vigente hasta: YYYY-MM-DD`
 *   y deben revisarse cada Q (ver docs/IA_CONTEXT.md → "Constantes legales").
 */

// ── VALORES MONETARIOS / NORMATIVOS ─────────────────────────────

/** Salario Mínimo Mensual Legal Vigente (COP) — año 2026.
 *  Valor: $1.750.905 (incremento del 23 % vs 2025).
 *  Fuente oficial: Decreto 1469 del 29 de diciembre de 2025 (Mintrabajo).
 *    Suspendido provisionalmente por el Consejo de Estado en feb-2026; el
 *    Decreto 0159 del 19 de febrero de 2026 mantiene transitoriamente el
 *    mismo valor mientras se decide la legalidad del decreto original.
 *  Vigencia desde: 2026-01-01. Vigente hasta: 2026-12-31. */
export const SMMLV_2026 = 1_750_905;

/** Auxilio de transporte mensual (COP) — año 2026.
 *  Valor: $249.095.
 *  Fuente oficial: Decreto 1470 del 29 de diciembre de 2025 (Mintrabajo).
 *  Vigencia desde: 2026-01-01. Vigente hasta: 2026-12-31. */
export const AUXILIO_TRANSPORTE_2026 = 249_095;

/** Unidad de Valor Tributario (COP) — año gravable 2026.
 *  Valor: $52.374 (incremento del 5,17 % vs 2025, basado en IPC DANE).
 *  Fuente oficial: Resolución DIAN 000238 del 15 de diciembre de 2025.
 *  Vigencia desde: 2026-01-01. Vigente hasta: 2026-12-31. */
export const UVT_2026 = 52_374;

/** Fecha en que entran en vigencia los valores 2026 (formato ISO YYYY-MM-DD). */
export const VIGENCIA_2026 = '2026-01-01';

// ── VALORES 2027 (pendientes de publicación oficial) ─────────────
//
// Calendario habitual:
//   • SMMLV: decreto presidencial expedido en la última semana de diciembre
//     del año anterior (Mintrabajo), tras el cierre de la Comisión de
//     Concertación de Políticas Salariales y Laborales.
//   • UVT:   resolución DIAN publicada antes del 1 de enero del año gravable,
//     basada en la variación del IPC DANE entre el 1 de octubre del año
//     anterior y el 1 de octubre del año en curso.
//
// Publicación esperada: diciembre de 2026.

/** SMMLV 2027 — null mientras no haya decreto oficial. */
export const SMMLV_2027 = null;

/** Auxilio de transporte 2027 — null mientras no haya decreto oficial. */
export const AUXILIO_TRANSPORTE_2027 = null;

/** UVT 2027 — null mientras no haya resolución DIAN. */
export const UVT_2027 = null;

/** Vigencia 2027 — null hasta confirmar fecha en los decretos/resoluciones. */
export const VIGENCIA_2027 = null;

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
