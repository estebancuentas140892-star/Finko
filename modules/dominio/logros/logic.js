/**
 * logros/logic.js - definicion y evaluacion de logros de usuario.
 *
 * Lógica pura, sin DOM, sin efectos secundarios.
 * Cada logro tiene un `id` unico, metadata visual (emoji, nombre, desc) y
 * una funcion `eval(S)` que retorna true cuando el logro se cumple.
 *
 * Regla: esta función solo opera sobre el singleton S, sin importar
 * lógica de otros dominios (regla 10: no cross-domain imports). Los tipos
 * de deuda ('deuda-entidad'/'deuda-personal') se comparan como literales en
 * vez de importar `esDeuda()` de compromisos/logic.js por esa misma regla.
 */

import { hoy } from '../../infra/utils.js';
import { memoizar } from '../../infra/memo.js';
import { UMBRAL_GASTO_HORMIGA, topeHormiga } from '../../infra/hormiga.js';
import { contarUnidadesSabidas, contarSemanasActivas } from '../../infra/ruta-aprende.js';

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
 *   ir?: { hash: string, texto: string },
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
 * `ir` (ficha 17 de MOV.1, G3): la sección donde se cumple el `hint`. Su
 * `texto` es el rótulo vigente de esa sección y aparece tal cual dentro del
 * `hint`; la vista lo convierte en enlace, porque el pendiente es un encargo.
 */

/**
 * Metadata de las familias de logros (ADR 032 D4). La tarjeta de la vitrina
 * usa este nombre; los niveles salen del catálogo LOGROS (campo familia).
 * Familias futuras (deudas en LG.2c, comportamiento en LG.2e) se agregan aquí.
 */
export const FAMILIAS = {
  registro:       { nombre: 'Constancia de registro' },
  metas:          { nombre: 'Metas cumplidas' },
  deudas:         { nombre: 'Deudas saldadas' },
  comportamiento: { nombre: 'Hábitos de gasto' },
};

// ── DERIVACIONES DE CONSTANCIA (LG.2c, ADR 032 D3) ───────────────

/**
 * Cuántas semanas distintas de cada mes tienen al menos un gasto registrado.
 * Semana = bloque de 7 días desde el día 1 (el bloque final corto del mes
 * cuenta como semana propia). Un solo pase O(gastos), reutilizado tanto por
 * `mesCompleto()` como por `rachaMesesCompletos()` para no recorrer el
 * historial una vez por mes consultado.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @returns {Map<string, number>} mesISO ('YYYY-MM') → nº de semanas distintas
 */
function _semanasPorMes(gastos) {
  const semanas = new Map();
  for (const g of gastos ?? []) {
    if (typeof g?.fecha !== 'string' || g.fecha.length < 10) continue;
    const mesISO = g.fecha.slice(0, 7);
    const dd = Number(g.fecha.slice(8, 10));
    if (!Number.isFinite(dd) || dd < 1 || dd > 31) continue;
    const bloque = Math.ceil(dd / 7);
    let set = semanas.get(mesISO);
    if (!set) { set = new Set(); semanas.set(mesISO, set); }
    set.add(bloque);
  }
  const resultado = new Map();
  for (const [mes, set] of semanas) resultado.set(mes, set.size);
  return resultado;
}

/**
 * ¿El mes `mesISO` es "completo de registro" (D3, ADR 032)? Al menos 3
 * semanas distintas de ese mes con gasto registrado (de ~4.4 semanas):
 * deliberadamente laxo, premia el hábito sin castigar una semana de vacaciones.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} mesISO - `YYYY-MM` (o un ISO completo, se usa el prefijo).
 * @returns {boolean}
 */
export function mesCompleto(gastos, mesISO) {
  if (typeof mesISO !== 'string' || mesISO.length < 7) return false;
  return (_semanasPorMes(gastos).get(mesISO.slice(0, 7)) ?? 0) >= 3;
}

/**
 * Racha de meses completos consecutivos, contada hacia atrás desde el mes
 * ANTERIOR a hoy (el mes en curso nunca cuenta: todavía no terminó, D3).
 * Corta en el primer mes que no sea completo.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} hoyISO - `YYYY-MM-DD`.
 * @returns {number}
 */
export function rachaMesesCompletos(gastos, hoyISO) {
  if (typeof hoyISO !== 'string' || hoyISO.length < 10) return 0;
  const semanasPorMes = _semanasPorMes(gastos);

  let [anio, mes] = hoyISO.slice(0, 7).split('-').map(Number);
  if (!Number.isFinite(anio) || !Number.isFinite(mes)) return 0;
  mes -= 1;
  if (mes < 1) { mes = 12; anio -= 1; }

  let racha = 0;
  // Tope defensivo (20 años) por si llegan datos corruptos: nunca bucle infinito.
  for (let i = 0; i < 240; i++) {
    const mesISO = `${anio}-${String(mes).padStart(2, '0')}`;
    if ((semanasPorMes.get(mesISO) ?? 0) < 3) break;
    racha++;
    mes -= 1;
    if (mes < 1) { mes = 12; anio -= 1; }
  }
  return racha;
}

/** PERF.2: evita recorrer `S.gastos` una vez por cada nivel de la familia
 * "registro" (3-6) dentro de una misma pasada de `evaluarLogros()`. */
const _rachaMesesCompletosMemo = memoizar(rachaMesesCompletos, ['gastos']);

/**
 * Cuántas deudas (entidad o personal) llegaron a saldo 0. Excluye las
 * consolidadas: `_aplicarConsolidacion()` (compromisos/index.js) archiva la
 * deuda vieja (`activo:false`) pero NUNCA toca su `saldoTotal`, así que una
 * deuda transformada en un crédito nuevo no cuenta como "saldada" (ADR 032
 * D4: "la deuda no se pagó, se transformó"). Una deuda archivada manualmente
 * DESPUÉS de llegar a saldo 0 sigue contando: sí se pagó.
 *
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @returns {number}
 */
export function deudasSaldadas(compromisos) {
  if (!Array.isArray(compromisos)) return 0;
  return compromisos.filter(c =>
    (c.tipo === 'deuda-entidad' || c.tipo === 'deuda-personal') &&
    Number(c.saldoTotal) === 0
  ).length;
}

// ── DERIVACIONES DE COMPORTAMIENTO (LG.2e, ADR 032 D4) ───────────

/**
 * Monto máximo de una transacción para contar como "gasto hormiga". Vive en
 * `infra/hormiga.js` desde APR.1a (ADR 092 D11), donde lo leen también
 * `gastos` y `aprende`; se re-exporta para no romper a quien lo importa de acá.
 */
export { UMBRAL_GASTO_HORMIGA };

/**
 * Piso de relevancia del promedio hormiga mensual: por debajo de esto la
 * comparación no premia nada (bajar de 8.000 a 7.000 al mes no es un hábito).
 * Mismo valor que el `umbralTotal` de `detectarHormigas()`.
 */
export const UMBRAL_HORMIGA_RELEVANTE = 100_000;

/**
 * Cuánto suma al mes el gasto hormiga (transacciones ≤ UMBRAL_GASTO_HORMIGA).
 * Un solo pase O(gastos), igual que `_semanasPorMes`.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} [tope=UMBRAL_GASTO_HORMIGA] - el configurado en Límites (APR.1b).
 * @returns {Map<string, number>} mesISO ('YYYY-MM') → COP en gasto hormiga.
 */
function _hormigaPorMes(gastos, tope = UMBRAL_GASTO_HORMIGA) {
  const totales = new Map();
  for (const g of gastos ?? []) {
    if (typeof g?.fecha !== 'string' || g.fecha.length < 7) continue;
    const monto = Number(g.monto);
    if (!Number.isFinite(monto) || monto <= 0 || monto > tope) continue;
    const mesISO = g.fecha.slice(0, 7);
    totales.set(mesISO, (totales.get(mesISO) ?? 0) + monto);
  }
  return totales;
}

/**
 * Gasto hormiga de un mes calendario.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} mesISO - `YYYY-MM` (o un ISO completo, se usa el prefijo).
 * @param {number} [tope=UMBRAL_GASTO_HORMIGA]
 * @returns {number} COP.
 */
export function gastoHormigaMes(gastos, mesISO, tope = UMBRAL_GASTO_HORMIGA) {
  if (typeof mesISO !== 'string' || mesISO.length < 7) return 0;
  return _hormigaPorMes(gastos, tope).get(mesISO.slice(0, 7)) ?? 0;
}

/**
 * Los `cuantos` meses cerrados anteriores a `hoyISO`, del más reciente al más
 * viejo. El mes en curso nunca entra: todavía no terminó (D3).
 *
 * @param {string} hoyISO - `YYYY-MM-DD`.
 * @param {number} cuantos
 * @returns {string[]} mesISO ('YYYY-MM').
 */
function _mesesCerradosAtras(hoyISO, cuantos) {
  let [anio, mes] = hoyISO.slice(0, 7).split('-').map(Number);
  if (!Number.isFinite(anio) || !Number.isFinite(mes)) return [];
  const meses = [];
  for (let i = 0; i < cuantos; i++) {
    mes -= 1;
    if (mes < 1) { mes = 12; anio -= 1; }
    meses.push(`${anio}-${String(mes).padStart(2, '0')}`);
  }
  return meses;
}

/**
 * ¿El gasto hormiga del último mes cerrado quedó por debajo del promedio de
 * los 3 meses anteriores? Único logro de interpretación de la familia
 * "comportamiento" (ADR 032 D4).
 *
 * Guardias anti-gaming (D2): los 4 meses deben ser "mes completo de registro"
 * (D2.3, reducir dejando de registrar no desbloquea nada), el mes en curso no
 * participa (D3) y el promedio previo debe superar UMBRAL_HORMIGA_RELEVANTE.
 * Riesgo residual asumido: un mes completo se cumple con gastos en 3 semanas
 * aunque sean todos grandes. La guardia de la ADR es la de mes completo; no se
 * agrega una segunda por conteo de transacciones porque castigaría al usuario
 * que sí redujo (menos hormigas = menos transacciones).
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * El tope configurable (APR.1b) no abre una trampa: se aplica igual a los
 * cuatro meses que se comparan, así que cambiarlo mueve el promedio y el mes
 * cerrado juntos.
 *
 * @param {string} hoyISO - `YYYY-MM-DD`.
 * @param {number} [tope=UMBRAL_GASTO_HORMIGA]
 * @returns {boolean}
 */
export function hormigaALaRaya(gastos, hoyISO, tope = UMBRAL_GASTO_HORMIGA) {
  if (typeof hoyISO !== 'string' || hoyISO.length < 10) return false;
  const meses = _mesesCerradosAtras(hoyISO, 4);
  if (meses.length < 4) return false;

  const semanas = _semanasPorMes(gastos);
  if (meses.some(m => (semanas.get(m) ?? 0) < 3)) return false;

  const hormiga = _hormigaPorMes(gastos, tope);
  const [cerrado, ...previos] = meses;
  const promedio = previos.reduce((suma, m) => suma + (hormiga.get(m) ?? 0), 0) / previos.length;
  if (promedio < UMBRAL_HORMIGA_RELEVANTE) return false;

  return (hormiga.get(cerrado) ?? 0) < promedio;
}

/** D7: dos pasadas por `S.gastos` por cada `state:change` (evaluarLogros +
 * la vitrina) se sirven de la misma caché. */
const _hormigaALaRayaMemo = memoizar(hormigaALaRaya, ['gastos']);

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
    ir:      { hash: 'gast', texto: 'Gastos' },
    eval:    s => Array.isArray(s.gastos) && s.gastos.length > 0,
  },
  {
    id:     'primer-compromiso',
    nombre: 'Deuda bajo control',
    emoji:  '📅',
    desc:   'Registraste tu primer compromiso.',
    hint:   'Registra tu primera deuda o gasto fijo en Por pagar.',
    ir:     { hash: 'compromisos', texto: 'Por pagar' },
    eval:   s => Array.isArray(s.compromisos) && s.compromisos.length > 0,
  },
  {
    id:     'tesorero',
    nombre: 'Tesorero',
    emoji:  '🏦',
    desc:   'Registraste tu primera cuenta o billetera.',
    hint:   'Registra tu primera cuenta o billetera en Mis cuentas.',
    ir:     { hash: 'tesoreria', texto: 'Mis cuentas' },
    eval:   s => Array.isArray(s.cuentas) && s.cuentas.length > 0,
  },
  {
    id:     'soñador',
    nombre: 'Con un plan',
    emoji:  '🎯',
    desc:   'Creaste tu primera meta de ahorro.',
    hint:   'Crea tu primera meta de ahorro en la sección Metas.',
    ir:     { hash: 'metas', texto: 'Metas' },
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
    hint:   'Configura tu primer límite de gasto en Límites.',
    ir:     { hash: 'presupuesto', texto: 'Límites' },
    eval:   s => Array.isArray(s.presupuestos) && s.presupuestos.length > 0,
  },
  {
    id:     'diversificador',
    nombre: 'Bien diversificado',
    emoji:  '🏛️',
    desc:   'Tienes 3 o más cuentas o billeteras registradas.',
    hint:   'Ten 3 o más cuentas o billeteras activas en Mis cuentas.',
    ir:     { hash: 'tesoreria', texto: 'Mis cuentas' },
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
    ir:     { hash: 'personales', texto: 'Me deben' },
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
    id:      'mes-completo',
    familia: 'registro',
    nivel:   3,
    nombre:  'Un mes completo',
    emoji:   '📆',
    desc:    'Registraste gastos en al menos 3 semanas distintas de un mismo mes.',
    hint:    'Registra gastos en al menos 3 semanas distintas de un mismo mes.',
    eval:    s => _rachaMesesCompletosMemo(s.gastos, hoy()) >= 1,
  },
  {
    id:      'tres-meses-seguidos',
    familia: 'registro',
    nivel:   4,
    nombre:  'Tres meses seguidos',
    emoji:   '🌟',
    desc:    'Llevas 3 meses seguidos con registro constante.',
    hint:    'Completa 3 meses seguidos con gastos en al menos 3 semanas cada uno.',
    eval:    s => _rachaMesesCompletosMemo(s.gastos, hoy()) >= 3,
    progreso: s => ({ actual: Math.min(_rachaMesesCompletosMemo(s.gastos, hoy()), 3), meta: 3 }),
  },
  {
    id:      'seis-meses-seguidos',
    familia: 'registro',
    nivel:   5,
    nombre:  'Medio año de constancia',
    emoji:   '💎',
    desc:    'Llevas 6 meses seguidos con registro constante.',
    hint:    'Completa 6 meses seguidos con gastos en al menos 3 semanas cada uno.',
    eval:    s => _rachaMesesCompletosMemo(s.gastos, hoy()) >= 6,
    progreso: s => ({ actual: Math.min(_rachaMesesCompletosMemo(s.gastos, hoy()), 6), meta: 6 }),
  },
  {
    id:      'doce-meses-seguidos',
    familia: 'registro',
    nivel:   6,
    nombre:  'Un año contigo',
    emoji:   '👑',
    desc:    'Llevas 12 meses seguidos con registro constante.',
    hint:    'Completa 12 meses seguidos con gastos en al menos 3 semanas cada uno.',
    eval:    s => _rachaMesesCompletosMemo(s.gastos, hoy()) >= 12,
    progreso: s => ({ actual: Math.min(_rachaMesesCompletosMemo(s.gastos, hoy()), 12), meta: 12 }),
  },
  {
    id:      'primera-deuda-saldada',
    familia: 'deudas',
    nivel:   1,
    nombre:  'Una deuda menos',
    emoji:   '🎉',
    desc:    'Saldaste una deuda por completo.',
    hint:    'Abona a una deuda hasta llevar su saldo a cero.',
    eval:    s => deudasSaldadas(s.compromisos) >= 1,
  },
  {
    id:      'tres-deudas-saldadas',
    familia: 'deudas',
    nivel:   2,
    nombre:  'Rompedeudas',
    emoji:   '🏆',
    desc:    'Saldaste 3 deudas por completo.',
    hint:    'Sigue abonando: saldar 3 deudas te desbloquea este logro.',
    eval:    s => deudasSaldadas(s.compromisos) >= 3,
    progreso: s => ({ actual: Math.min(deudasSaldadas(s.compromisos), 3), meta: 3 }),
  },
  {
    id:      'hormiga-a-raya',
    familia: 'comportamiento',
    nivel:   1,
    nombre:  'Hormiga a raya',
    emoji:   '🐜',
    desc:    'Bajaste tus gastos hormiga por debajo del promedio de los 3 meses anteriores.',
    hint:    'Registra 4 meses seguidos y baja tus gastos pequeños frente al promedio de los 3 anteriores.',
    eval:    s => _hormigaALaRayaMemo(s.gastos, hoy(), topeHormiga(s.config)),
  },
  {
    id:     'fondo-emergencia',
    nombre: 'Red de seguridad',
    emoji:  '🛡️',
    desc:   'Completaste tu fondo de emergencia. Tu base financiera está lista.',
    hint:   'Completa tu Fondo de emergencia en Ahorro.',
    ir:     { hash: 'fondo', texto: 'Fondo de emergencia' },
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
 *   ir: { hash: string, texto: string } | null,
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
      ir:      l.ir ?? null,
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

/**
 * Conteo de la vitrina agrupada: cuántos de sus elementos están conseguidos y
 * cuántos hay en total. El denominador de "X de Y" tiene que salir de acá y no
 * del catálogo: `agruparVitrina()` colapsa cada familia en una sola tarjeta,
 * así que la pantalla dibuja 12 elementos mientras `LOGROS` tiene 18. El
 * encabezado describe lo que hay debajo (R88, bloque de Logros del handoff
 * móvil).
 *
 * El numerador sale del mismo conjunto que el denominador: una familia con al
 * menos un nivel desbloqueado cuenta como UN elemento conseguido, no como
 * tantos como niveles tenga. Así la cifra coincide con las tarjetas activas.
 *
 * No sustituye al conteo crudo de logros desbloqueados: `nivelUsuario()` se
 * calibró contra el catálogo completo (ADR 032 D5) y sigue leyéndolos uno a
 * uno.
 *
 * @param {ReturnType<typeof agruparVitrina>} vitrina
 * @returns {{ conseguidos: number, total: number }}
 */
export function conteoVitrina(vitrina) {
  const items = Array.isArray(vitrina) ? vitrina : [];
  return { conseguidos: items.filter(_conseguido).length, total: items.length };
}

/** Un elemento de la vitrina está conseguido: el logro, o la familia con al menos un nivel. */
function _conseguido(it) {
  return it.tipo === 'familia' ? it.desbloqueados > 0 : it.logro?.desbloqueado === true;
}

/**
 * Parte la vitrina en lo que te falta y lo que ya tienes (ficha 17 de MOV.1,
 * G4), cada grupo en el orden del catálogo. Usa el mismo criterio que
 * `conteoVitrina()`: una familia con un nivel ya está en "Ya los tienes",
 * con su chip "Nivel N de M" y su siguiente nivel, así que el "X de Y" de
 * arriba es el tamaño de ese grupo y se puede contar con el dedo (R88).
 *
 * @param {ReturnType<typeof agruparVitrina>} vitrina
 * @returns {{ faltan: ReturnType<typeof agruparVitrina>, tienes: ReturnType<typeof agruparVitrina> }}
 */
export function partirVitrina(vitrina) {
  const items = Array.isArray(vitrina) ? vitrina : [];
  return { faltan: items.filter(it => !_conseguido(it)), tienes: items.filter(_conseguido) };
}

// ── NIVEL DE USUARIO (LG.2b, ADR 032 D5) ─────────────────────────

/**
 * Niveles de usuario derivados del conteo de logros desbloqueados.
 * Sin puntos ni persistencia: el nivel se calcula siempre en vivo.
 * NOMBRES PROVISIONALES (ADR 032 D5): Esteban define los definitivos;
 * cambiar un nombre aquí no toca datos (nada de esto se persiste).
 *
 * Umbral superior recalibrado en LG.2e (18 → 16): D5 se calibró para ~20
 * logros y el catálogo cerró en 18, así que "min 18" exigía el 100 % del
 * catálogo, incluidos logros que dependen de tener un préstamo a favor
 * (`prestamista`) o el fondo de emergencia completo. Con 16 el tramo superior
 * es alcanzable sin ser regalado.
 */
export const NIVELES_USUARIO = [
  { min: 0,  nombre: 'Semilla' },
  { min: 3,  nombre: 'Brote' },
  { min: 6,  nombre: 'Constante' },
  { min: 10, nombre: 'Organizado' },
  { min: 14, nombre: 'Estratega' },
  { min: 16, nombre: 'Leyenda del ahorro' },
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

// ── UN SOLO SISTEMA DE PROGRESO (APR.1d, ADR 092 D3) ─────────────

/**
 * El progreso que muestra la lente "Tu progreso": lo que sabes (unidades de
 * Aprende terminadas o marcadas por la prueba de ubicación) y lo que haces
 * (logros por acción) suben el mismo nivel, paso por paso. Sin puntos de
 * experiencia (ADR 032 D5): un paso es una unidad o un logro, una sola vez.
 *
 * Las unidades no entran a `S.logros`: su permanencia ya la da
 * `S.aprende.hechas`, que guarda la primera fecha y no se revoca, igual que
 * un logro persistido.
 *
 * @param {object} s - estado (típicamente S).
 * @param {ReturnType<typeof estadoLogros>} [estados] - si ya se calcularon.
 * @returns {{ logros: number, unidades: number, pasos: number,
 *   nivel: { min: number, nombre: string },
 *   siguiente: { min: number, nombre: string } | null, faltan: number,
 *   semanas: number }}
 */
export function resumenProgreso(s, estados = estadoLogros(s, s?.logros)) {
  const logros = estados.filter(e => e.desbloqueado).length;
  const unidades = contarUnidadesSabidas(s?.aprende);
  const pasos = logros + unidades;
  const nivel = nivelUsuario(pasos);
  const siguiente = NIVELES_USUARIO.find(n => n.min > pasos) ?? null;
  return {
    logros,
    unidades,
    pasos,
    nivel,
    siguiente,
    faltan: siguiente ? siguiente.min - pasos : 0,
    semanas: contarSemanasActivas(s?.aprende, s?.gastos),
  };
}

