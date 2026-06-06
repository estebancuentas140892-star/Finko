/**
 * logros/logic.js - definicion y evaluacion de logros de usuario.
 *
 * Lógica pura, sin DOM, sin efectos secundarios.
 * Cada logro tiene un `id` unico, metadata visual (emoji, nombre, desc) y
 * una funcion `eval(S)` que retorna true cuando el logro se cumple.
 *
 * Regla: esta función solo opera sobre el singleton S, sin importar
 * lógica de otros dominios (regla 10: no cross-domain imports).
 */

// ── TABLA DE LOGROS ──────────────────────────────────────────────

/**
 * @typedef {{
 *   id: string,
 *   nombre: string,
 *   emoji: string,
 *   desc: string,
 *   eval: (s: object) => boolean,
 * }} Logro
 */

/** @type {Logro[]} */
export const LOGROS = [
  {
    id:     'primer-paso',
    nombre: 'Primer paso',
    emoji:  '💚',
    desc:   'Completaste la configuracion inicial de Finko.',
    eval:   s => s.onboarded === true,
  },
  {
    id:     'primer-gasto',
    nombre: 'Primer gasto',
    emoji:  '💸',
    desc:   'Registraste tu primer gasto.',
    eval:   s => Array.isArray(s.gastos) && s.gastos.length > 0,
  },
  {
    id:     'primer-compromiso',
    nombre: 'Deuda bajo control',
    emoji:  '📅',
    desc:   'Registraste tu primer compromiso.',
    eval:   s => Array.isArray(s.compromisos) && s.compromisos.length > 0,
  },
  {
    id:     'tesorero',
    nombre: 'Tesorero',
    emoji:  '🏦',
    desc:   'Registraste tu primera cuenta o billetera.',
    eval:   s => Array.isArray(s.cuentas) && s.cuentas.length > 0,
  },
  {
    id:     'soñador',
    nombre: 'Con un plan',
    emoji:  '🎯',
    desc:   'Creaste tu primera meta de ahorro.',
    eval:   s => Array.isArray(s.metas) && s.metas.length > 0,
  },
  {
    id:     'meta-lograda',
    nombre: 'Lo lograste',
    emoji:  '⭐',
    desc:   'Completaste tu primera meta de ahorro.',
    eval:   s => Array.isArray(s.metas) && s.metas.some(m => m.completada === true),
  },
  {
    id:     'planificador',
    nombre: 'Planificador',
    emoji:  '📊',
    desc:   'Configuraste tu primer presupuesto por categoria.',
    eval:   s => Array.isArray(s.presupuestos) && s.presupuestos.length > 0,
  },
  {
    id:     'diversificador',
    nombre: 'Bien diversificado',
    emoji:  '🏛️',
    desc:   'Tenes 3 o mas cuentas o billeteras registradas.',
    eval:   s => Array.isArray(s.cuentas) &&
                 s.cuentas.filter(c => c.activa !== false).length >= 3,
  },
  {
    id:     'prestamista',
    nombre: 'Prestamista',
    emoji:  '🤝',
    desc:   'Registraste un prestamo que vos le diste a alguien.',
    eval:   s => Array.isArray(s.personales) && s.personales.length > 0,
  },
  {
    id:     'diez-gastos',
    nombre: 'Hábito registrado',
    emoji:  '🔥',
    desc:   'Llevas 10 o mas gastos registrados.',
    eval:   s => Array.isArray(s.gastos) && s.gastos.length >= 10,
  },
  {
    id:     'fondo-emergencia',
    nombre: 'Red de seguridad',
    emoji:  '🛡️',
    desc:   'Completaste tu fondo de emergencia. Tu base financiera esta lista.',
    eval:   s => s.ahorro?.fondoEmergencia?.completado === true,
  },
];

// ── EVALUACION ───────────────────────────────────────────────────

/**
 * Evalua todos los logros contra el estado actual y retorna los IDs de los
 * que se cumplen. No persiste nada - esa responsabilidad es del caller.
 *
 * @param {object} s   Estado actual (tipicamente el singleton S).
 * @returns {string[]} IDs de logros que se cumplen en este momento.
 */
export function evaluarLogros(s) {
  if (!s || typeof s !== 'object') return [];
  const cumplidos = [];
  for (const logro of LOGROS) {
    try {
      if (logro.eval(s) === true) cumplidos.push(logro.id);
    } catch {
      // Ignorar errores en evaluadores; no bloquear el resto.
    }
  }
  return cumplidos;
}
