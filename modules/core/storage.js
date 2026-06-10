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
const SCHEMA_VERSION = 14;

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

  // v6 → v7: nuevo slice `ahorro` para el fondo de emergencia + hábito (J.1).
  // El usuario existente arranca con el fondo inactivo y cero aportes; al
  // activarlo desde la nueva sección se persisten las preferencias. La forma
  // se rellena defensivamente por si la migración corre sobre un snapshot
  // intermedio en el que ya existe `ahorro` parcial.
  if ((typeof data._version === 'number' ? data._version : 1) < 7) {
    const prev = (typeof data.ahorro === 'object' && data.ahorro !== null) ? data.ahorro : {};
    const prevFE = (typeof prev.fondoEmergencia === 'object' && prev.fondoEmergencia !== null)
      ? prev.fondoEmergencia : {};
    data.ahorro = {
      fondoEmergencia: {
        activo:      prevFE.activo === true,
        metaMeses:   Number.isFinite(Number(prevFE.metaMeses))   ? Number(prevFE.metaMeses)   : 3,
        montoActual: Number.isFinite(Number(prevFE.montoActual)) ? Number(prevFE.montoActual) : 0,
      },
      aportes:           Array.isArray(prev.aportes) ? prev.aportes : [],
      compromisoMensual: Number.isFinite(Number(prev.compromisoMensual)) ? Number(prev.compromisoMensual) : 0,
    };
  }

  // v7 → v8: nueva colección `inversiones` para el portafolio real (J.2).
  // El usuario existente arranca sin inversiones; el resto del estado no cambia.
  if ((typeof data._version === 'number' ? data._version : 1) < 8) {
    if (!Array.isArray(data.inversiones)) {
      data.inversiones = [];
    }
  }

  // v8 → v9: perfil fiscal opcional en config (K.2).
  // El usuario existente arranca con todos los flags en false.
  // Se preserva config.notificaciones y cualquier otro campo ya presente.
  if ((typeof data._version === 'number' ? data._version : 1) < 9) {
    if (typeof data.config !== 'object' || data.config === null) {
      data.config = {};
    }
    if (typeof data.config.perfilFiscal !== 'object' || data.config.perfilFiscal === null) {
      data.config.perfilFiscal = {
        ivaResponsable:       false,
        obligadoContabilidad: false,
        declaranteObligado:   false,
      };
    }
  }

  // v9 → v10: datos fiscales manuales del monitor de renta, keados por año (K.4).
  // El usuario existente arranca sin valores (objeto vacío); el resto no cambia.
  if ((typeof data._version === 'number' ? data._version : 1) < 10) {
    if (typeof data.config !== 'object' || data.config === null) {
      data.config = {};
    }
    if (typeof data.config.datosFiscales !== 'object' || data.config.datosFiscales === null
        || Array.isArray(data.config.datosFiscales)) {
      data.config.datosFiscales = {};
    }
  }

  // v10 → v11: se elimina 'Inversión' del catálogo de tipos de cuenta. Las
  // inversiones reales viven en el dominio Inversión (J.2), no como un tipo de
  // cuenta de tesorería. Las cuentas existentes con tipo 'Inversión' se
  // reasignan a 'Otro' para no quedar con un tipo fuera del catálogo.
  // Idempotente: si no hay cuentas con ese tipo (o ya corrió), no cambia nada.
  if ((typeof data._version === 'number' ? data._version : 1) < 11) {
    if (Array.isArray(data.cuentas)) {
      for (const c of data.cuentas) {
        if (c && typeof c === 'object' && c.tipo === 'Inversión') {
          c.tipo = 'Otro';
        }
      }
    }
  }

  // v11 → v12: se agrega `diaPago` (día del mes, 1-31) a los ingresos recurrentes.
  // Los ingresos existentes quedan con diaPago: null (dato no capturado aún).
  // Idempotente: si diaPago ya está presente en el item, no se sobreescribe.
  if ((typeof data._version === 'number' ? data._version : 1) < 12) {
    if (Array.isArray(data.ingresos)) {
      for (const i of data.ingresos) {
        if (i && typeof i === 'object' && !('diaPago' in i)) {
          i.diaPago = null;
        }
      }
    }
  }

  // v12 → v13: nuevo dominio Apartados (sobres para gastos previsibles).
  // Los usuarios existentes arrancan con la colección vacía. Idempotente: si
  // `apartados` ya existe como array, no se toca.
  if ((typeof data._version === 'number' ? data._version : 1) < 13) {
    if (!Array.isArray(data.apartados)) {
      data.apartados = [];
    }
  }

  // v13 → v14: recurrencia en apartados (gasto que se repite, como el SOAT anual).
  // Los apartados existentes pasan a ser no recurrentes (gasto único). Idempotente:
  // si el campo ya está presente, no se sobreescribe.
  if ((typeof data._version === 'number' ? data._version : 1) < 14) {
    if (Array.isArray(data.apartados)) {
      for (const a of data.apartados) {
        if (a && typeof a === 'object') {
          if (!('recurrente' in a))   a.recurrente = false;
          if (!('periodoMeses' in a)) a.periodoMeses = null;
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
