/**
 * storage.js — persistencia en localStorage + migraciones idempotentes.
 *
 * Contrato:
 * - Clave: `fk_v1` (schema v1 — versión fresca del proyecto Finko Claude).
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
const SCHEMA_VERSION = 2;

/** Timer interno del debounce. Variable de módulo — nunca en window. */
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
 * Llamadas sucesivas reinician el temporizador — sólo el último estado se escribe.
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
 * No usar en código de producción — siempre llamar a save().
 */
export function _flushNow() {
  if (_saveTimer != null) clearTimeout(_saveTimer);
  _flush();
}

export { STORAGE_KEY, SCHEMA_VERSION };
