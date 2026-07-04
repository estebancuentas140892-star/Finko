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
 *   hint: string,
 *   eval: (s: object) => boolean,
 *   progreso?: (s: object) => { actual: number, meta: number },
 * }} Logro
 *
 * `desc` cuenta lo conseguido (se muestra al desbloquear); `hint` dice cómo
 * desbloquearlo en imperativo (se muestra mientras está pendiente, LG.1b).
 * `progreso` solo existe en logros de conteo con objetivo observable directo
 * de S (ADR 022): devuelve el avance parcial para la barra de la vitrina.
 */

/** @type {Logro[]} */
export const LOGROS = [
  {
    id:     'primer-paso',
    nombre: 'Primer paso',
    emoji:  '💚',
    desc:   'Completaste la configuración inicial de Finko.',
    hint:   'Completa la configuración inicial de Finko.',
    eval:   s => s.onboarded === true,
  },
  {
    id:     'primer-gasto',
    nombre: 'Primer gasto',
    emoji:  '💸',
    desc:   'Registraste tu primer gasto.',
    hint:   'Registra tu primer gasto en la sección Gastos.',
    eval:   s => Array.isArray(s.gastos) && s.gastos.length > 0,
  },
  {
    id:     'primer-compromiso',
    nombre: 'Deuda bajo control',
    emoji:  '📅',
    desc:   'Registraste tu primer compromiso.',
    hint:   'Registra tu primera deuda o gasto fijo.',
    eval:   s => Array.isArray(s.compromisos) && s.compromisos.length > 0,
  },
  {
    id:     'tesorero',
    nombre: 'Tesorero',
    emoji:  '🏦',
    desc:   'Registraste tu primera cuenta o billetera.',
    hint:   'Registra tu primera cuenta o billetera en Mis cuentas.',
    eval:   s => Array.isArray(s.cuentas) && s.cuentas.length > 0,
  },
  {
    id:     'soñador',
    nombre: 'Con un plan',
    emoji:  '🎯',
    desc:   'Creaste tu primera meta de ahorro.',
    hint:   'Crea tu primera meta de ahorro en la sección Metas.',
    eval:   s => Array.isArray(s.metas) && s.metas.length > 0,
  },
  {
    id:     'meta-lograda',
    nombre: 'Lo lograste',
    emoji:  '⭐',
    desc:   'Completaste tu primera meta de ahorro.',
    hint:   'Completa una meta de ahorro: cada abono te acerca.',
    eval:   s => Array.isArray(s.metas) && s.metas.some(m => m.completada === true),
  },
  {
    id:     'planificador',
    nombre: 'Planificador',
    emoji:  '📊',
    desc:   'Configuraste tu primer límite de gasto por categoría.',
    hint:   'Configura tu primer límite de gasto en Límites de gasto.',
    eval:   s => Array.isArray(s.presupuestos) && s.presupuestos.length > 0,
  },
  {
    id:     'diversificador',
    nombre: 'Bien diversificado',
    emoji:  '🏛️',
    desc:   'Tienes 3 o más cuentas o billeteras registradas.',
    hint:   'Ten 3 o más cuentas o billeteras activas en Mis cuentas.',
    eval:   s => Array.isArray(s.cuentas) &&
                 s.cuentas.filter(c => c.activa !== false).length >= 3,
    progreso: s => ({
      actual: Math.min(Array.isArray(s.cuentas) ? s.cuentas.filter(c => c.activa !== false).length : 0, 3),
      meta:   3,
    }),
  },
  {
    id:     'prestamista',
    nombre: 'Prestamista',
    emoji:  '🤝',
    desc:   'Registraste un préstamo que le diste a alguien.',
    hint:   'Registra en Me deben un préstamo que le diste a alguien.',
    eval:   s => Array.isArray(s.personales) && s.personales.length > 0,
  },
  {
    id:     'diez-gastos',
    nombre: 'Hábito registrado',
    emoji:  '🔥',
    desc:   'Llevas 10 o más gastos registrados.',
    hint:   'Registra 10 gastos: el hábito es lo que cuenta.',
    eval:   s => Array.isArray(s.gastos) && s.gastos.length >= 10,
    progreso: s => ({
      actual: Math.min(Array.isArray(s.gastos) ? s.gastos.length : 0, 10),
      meta:   10,
    }),
  },
  {
    id:     'fondo-emergencia',
    nombre: 'Red de seguridad',
    emoji:  '🛡️',
    desc:   'Completaste tu fondo de emergencia. Tu base financiera está lista.',
    hint:   'Completa tu fondo de emergencia en la sección Ahorro.',
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

// ── ESTADO PARA LA VITRINA (LG.1b, ADR 022) ──────────────────────

/**
 * Arma la lista render-ready de la vitrina de logros: cada logro con su
 * estado (desbloqueado o pendiente) y, si aplica, el progreso parcial.
 *
 * Desbloqueado = ya persistido en `idsPersistidos` (la persistencia manda:
 * un logro ganado no se revoca aunque el estado retroceda, ej. si el usuario
 * borra gastos) o cumplido en vivo (por si el render corre antes de que
 * initLogros persista los nuevos).
 *
 * @param {object}   s               Estado actual (típicamente S).
 * @param {string[]} idsPersistidos  `S.logros`.
 * @returns {Array<{
 *   id: string, nombre: string, emoji: string, desc: string, hint: string,
 *   desbloqueado: boolean,
 *   progreso: { actual: number, meta: number } | null,
 * }>}
 */
export function estadoLogros(s, idsPersistidos = []) {
  const ids = Array.isArray(idsPersistidos) ? idsPersistidos : [];
  return LOGROS.map(l => {
    let desbloqueado = ids.includes(l.id);
    if (!desbloqueado) {
      try { desbloqueado = l.eval(s) === true; } catch { desbloqueado = false; }
    }

    let progreso = null;
    if (!desbloqueado && typeof l.progreso === 'function') {
      try {
        const p = l.progreso(s);
        if (p && Number.isFinite(p.actual) && Number.isFinite(p.meta) && p.meta > 0) {
          progreso = { actual: Math.max(0, p.actual), meta: p.meta };
        }
      } catch {
        // Sin progreso si el evaluador falla; el logro sigue listándose.
      }
    }

    return {
      id:     l.id,
      nombre: l.nombre,
      emoji:  l.emoji,
      desc:   l.desc,
      hint:   l.hint,
      desbloqueado,
      progreso,
    };
  });
}
