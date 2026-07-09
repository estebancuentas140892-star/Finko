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
 *   familia?: string,
 *   nivel?: number,
 * }} Logro
 *
 * `desc` cuenta lo conseguido (se muestra al desbloquear); `hint` dice cómo
 * desbloquearlo en imperativo (se muestra mientras está pendiente, LG.1b).
 * `progreso` solo existe en logros de conteo con objetivo observable directo
 * de S (ADR 022): devuelve el avance parcial para la barra de la vitrina.
 * `familia`/`nivel` (ADR 032 D1): un logro con niveles se modela como varios
 * logros independientes que comparten `familia`; cada nivel tiene id propio
 * en S.logros (sin bump de schema, la no-revocación aplica por nivel). La
 * vitrina agrupa por familia y muestra una sola tarjeta (ver agruparVitrina).
 */

/**
 * Metadata de las familias de logros (ADR 032 D4). La tarjeta de la vitrina
 * usa este nombre; los niveles salen del catálogo LOGROS (campo familia).
 * Familias futuras (deudas en LG.2c, comportamiento en LG.2e) se agregan aquí.
 */
export const FAMILIAS = {
  registro: { nombre: 'Constancia de registro' },
  metas:    { nombre: 'Metas cumplidas' },
};

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
    id:      'primer-gasto',
    familia: 'registro',
    nivel:   1,
    nombre:  'Primer gasto',
    emoji:   '💸',
    desc:    'Registraste tu primer gasto.',
    hint:    'Registra tu primer gasto en la sección Gastos.',
    eval:    s => Array.isArray(s.gastos) && s.gastos.length > 0,
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
    id:      'meta-lograda',
    familia: 'metas',
    nivel:   1,
    nombre:  'Lo lograste',
    emoji:   '⭐',
    desc:    'Completaste tu primera meta de ahorro.',
    hint:    'Completa una meta de ahorro: cada abono te acerca.',
    eval:    s => Array.isArray(s.metas) && s.metas.some(m => m.completada === true),
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
    id:      'diez-gastos',
    familia: 'registro',
    nivel:   2,
    nombre:  'Hábito registrado',
    emoji:   '🔥',
    desc:    'Llevas 10 o más gastos registrados.',
    hint:    'Registra 10 gastos: el hábito es lo que cuenta.',
    eval:    s => Array.isArray(s.gastos) && s.gastos.length >= 10,
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
    hint:   'Completa tu fondo de emergencia en la sección Ahorros.',
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
 *   familia: string | null, nivel: number | null,
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
      id:      l.id,
      nombre:  l.nombre,
      emoji:   l.emoji,
      desc:    l.desc,
      hint:    l.hint,
      familia: l.familia ?? null,
      nivel:   l.nivel ?? null,
      desbloqueado,
      progreso,
    };
  });
}

// ── AGRUPACIÓN POR FAMILIA (LG.2b, ADR 032 D1) ───────────────────

/**
 * @typedef {ReturnType<typeof estadoLogros>[number]} EstadoLogro
 */

/**
 * Agrupa el estado de la vitrina: los logros sin familia pasan tal cual
 * (`tipo: 'logro'`) y cada familia colapsa a UNA entrada (`tipo: 'familia'`)
 * con el nivel más alto desbloqueado y el siguiente nivel como objetivo.
 * El orden de salida respeta el orden del catálogo (la familia aparece en
 * la posición de su primer nivel).
 *
 * @param {EstadoLogro[]} estados  Salida de estadoLogros().
 * @returns {Array<
 *   { tipo: 'logro',   logro: EstadoLogro } |
 *   { tipo: 'familia', familia: string, nombre: string,
 *     actual: EstadoLogro | null, siguiente: EstadoLogro | null,
 *     desbloqueados: number, totalNiveles: number }
 * >}
 */
export function agruparVitrina(estados) {
  const lista = Array.isArray(estados) ? estados : [];
  const items = [];
  const familiasVistas = new Set();

  for (const e of lista) {
    if (!e.familia) {
      items.push({ tipo: 'logro', logro: e });
      continue;
    }
    if (familiasVistas.has(e.familia)) continue;
    familiasVistas.add(e.familia);

    const niveles = lista
      .filter(x => x.familia === e.familia)
      .sort((a, b) => (a.nivel ?? 0) - (b.nivel ?? 0));
    const ganados = niveles.filter(x => x.desbloqueado);
    // Siguiente = el nivel pendiente más bajo (defensivo: aunque un nivel
    // alto esté desbloqueado y uno bajo no, el objetivo es cerrar el hueco).
    const siguiente = niveles.find(x => !x.desbloqueado) ?? null;

    items.push({
      tipo:          'familia',
      familia:       e.familia,
      nombre:        FAMILIAS[e.familia]?.nombre ?? e.familia,
      actual:        ganados.length ? ganados[ganados.length - 1] : null,
      siguiente,
      desbloqueados: ganados.length,
      totalNiveles:  niveles.length,
    });
  }
  return items;
}

// ── NIVEL DE USUARIO (LG.2b, ADR 032 D5) ─────────────────────────

/**
 * Niveles de usuario derivados del conteo de logros desbloqueados.
 * Sin puntos ni persistencia: el nivel se calcula siempre en vivo.
 * NOMBRES PROVISIONALES (ADR 032 D5): Esteban define los definitivos;
 * cambiar un nombre aquí no toca datos (nada de esto se persiste).
 */
export const NIVELES_USUARIO = [
  { min: 0,  nombre: 'Semilla' },
  { min: 3,  nombre: 'Brote' },
  { min: 6,  nombre: 'Constante' },
  { min: 10, nombre: 'Organizado' },
  { min: 14, nombre: 'Estratega' },
  { min: 18, nombre: 'Leyenda del ahorro' },
];

/**
 * Nivel del usuario según cuántos logros tiene desbloqueados.
 * @param {number} nDesbloqueados
 * @returns {{ min: number, nombre: string }}
 */
export function nivelUsuario(nDesbloqueados) {
  const n = Number.isFinite(nDesbloqueados) ? Math.max(0, nDesbloqueados) : 0;
  let nivel = NIVELES_USUARIO[0];
  for (const candidato of NIVELES_USUARIO) {
    if (n >= candidato.min) nivel = candidato;
  }
  return nivel;
}
