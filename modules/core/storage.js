/**
 * storage.js - persistencia en localStorage + migraciones idempotentes.
 *
 * Contrato:
 * - Clave: `fk_v1` (schema v1 - versión fresca del proyecto Finko Claude).
 * - `loadData()` hidrata S desde localStorage o lo deja en estado inicial.
 * - `save()` está debounced 200 ms y persiste S completo.
 * - Toda migración nueva se agrega a `_migrate()` y bumpea `SCHEMA_VERSION`.
 */

import { S, EventBus, createInitialState } from './state.js';

/** Clave de localStorage. Bumpear con cuidado: implica migración. */
const STORAGE_KEY = 'fk_v1';

/** Ventana de debounce para save() en milisegundos. */
const DEBOUNCE_MS = 200;

/** Versión esperada del schema en memoria. */
const SCHEMA_VERSION = 6;

/** Timer interno del debounce. Variable de módulo - nunca en window. */
let _saveTimer = null;

/**
 * Aplica un snapshot a S sin perder la referencia original.
 * Cualquier campo ausente en `snapshot` se restaura desde el estado inicial,
 * y cualquier campo ajeno al schema v1 se descarta silenciosamente.
 *
 * @param {Record<string, unknown>} snapshot
 */
function _applyToS(snapshot) {
  const base = createInitialState();
  for (const key of Object.keys(base)) {
    S[key] = Object.prototype.hasOwnProperty.call(snapshot, key)
      ? snapshot[key]
      : base[key];
  }
}

/**
 * Aplica todas las migraciones necesarias para llevar `raw` al schema actual.
 * Idempotente: si ya está al día, devuelve el mismo objeto sin cambios.
 *
 * @param {unknown} raw
 * @returns {Record<string, unknown>}
 */
function _migrate(raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return createInitialState();
  }

  const data = /** @type {Record<string, unknown>} */ (raw);

  // v1 → v2: nueva colección de presupuestos (envelope budgeting D.5).
  // El usuario existente arranca sin presupuestos; el resto del estado no cambia.
  if ((typeof data._version === 'number' ? data._version : 1) < 2) {
    if (!Array.isArray(data.presupuestos)) {
      data.presupuestos = [];
    }
  }

  // v2 → v3: nueva colección de préstamos personales (F.2).
  // El usuario existente arranca sin préstamos; el resto del estado no cambia.
  if ((typeof data._version === 'number' ? data._version : 1) < 3) {
    if (!Array.isArray(data.personales)) {
      data.personales = [];
    }
  }

  // v3 → v4: lista de logros desbloqueados (G.3).
  // El usuario existente arranca sin logros; se recalculan en initLogros().
  if ((typeof data._version === 'number' ? data._version : 1) < 4) {
    if (!Array.isArray(data.logros)) {
      data.logros = [];
    }
  }

  // v4 → v5: cuota de manejo opcional por cuenta + flag esCuotaManejo en
  // compromisos. No requiere mutar datos existentes: las cuentas viejas no
  // tienen cuotaManejo (undefined → tratado como "sin cuota"), y los
  // compromisos existentes no son cuotas auto-generadas (esCuotaManejo
  // undefined → tratado como false). El sync se aplica solo cuando el
  // usuario activa la cuota desde el form de cuenta.
  // Migración intencionalmente no-op: solo bump de versión.

  // v5 → v6: rediseño del dominio Compromisos.
  // - 'deuda' → 'deuda-entidad' (preserva tasaEA si existía).
  //   `cuotaMensual = monto`, `saldoTotal = saldoPendiente ?? monto * 12`,
  //   `tasa = tasaEA ?? 0`, `tasaUnidad = 'EA'`. El campo `monto` se elimina
  //   en deudas porque su rol pasa a `cuotaMensual`.
  // - 'agenda' → 'fijo' con frecuencia='Única vez'. La sección Compromisos
  //   solo creará deudas a partir de v6; los gastos fijos se manejan desde
  //   la sección Agenda. Los items existentes mantienen su semántica.
  // - 'fijo' queda intacto (monto sigue siendo la cuota fija).
  if ((typeof data._version === 'number' ? data._version : 1) < 6) {
    if (Array.isArray(data.compromisos)) {
      for (const c of data.compromisos) {
        if (!c || typeof c !== 'object') continue;
        if (c.tipo === 'deuda') {
          const cuotaPrev = Number(c.monto) || 0;
          const saldoPrev = Number(c.saldoPendiente);
          c.tipo         = 'deuda-entidad';
          c.cuotaMensual = cuotaPrev;
          c.saldoTotal   = Number.isFinite(saldoPrev) && saldoPrev > 0
            ? saldoPrev : cuotaPrev * 12;
          c.tasa         = Number.isFinite(Number(c.tasaEA)) ? Number(c.tasaEA) : 0;
          c.tasaUnidad   = 'EA';
          delete c.monto;
          delete c.saldoPendiente;
          delete c.tasaEA;
        } else if (c.tipo === 'agenda') {
          c.tipo       = 'fijo';
          c.frecuencia = 'Única vez';
        }
      }
    }
  }

  if (typeof data._version !== 'number' || data._version < SCHEMA_VERSION) {
    data._version = SCHEMA_VERSION;
  }
  return data;
}

/**
 * Hidrata S desde localStorage. Idempotente y tolerante a corrupción.
 *
 * - Si no hay datos persistidos: S queda en estado inicial.
 * - Si el JSON está corrupto: se loguea un warn y S vuelve al estado inicial.
 * - Si los datos son válidos: se aplican migraciones y se cargan en S.
 *
 * Nunca lanza excepción al caller.
 */
export function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored == null) {
    _applyToS(createInitialState());
    return;
  }

  try {
    const parsed = JSON.parse(stored);
    _applyToS(_migrate(parsed));
  } catch (err) {
    console.warn(
      `[storage] localStorage "${STORAGE_KEY}" corrupto, reseteo a estado inicial.`,
      err,
    );
    _applyToS(createInitialState());
  }
}

/**
 * Persiste S a localStorage tras `DEBOUNCE_MS` de inactividad.
 * Llamadas sucesivas reinician el temporizador - sólo el último estado se escribe.
 */
export function save() {
  if (_saveTimer != null) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_flush, DEBOUNCE_MS);
}

/** Escribe S a localStorage inmediatamente. Sólo se invoca desde el timer. */
function _flush() {
  _saveTimer = null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
    EventBus.emit('state:save');
  } catch (err) {
    console.error('[storage] save() falló:', err);
  }
}

/**
 * Sólo para tests: fuerza un flush inmediato sin esperar al debounce.
 * No usar en código de producción - siempre llamar a save().
 */
export function _flushNow() {
  if (_saveTimer != null) clearTimeout(_saveTimer);
  _flush();
}

export { STORAGE_KEY, SCHEMA_VERSION };
