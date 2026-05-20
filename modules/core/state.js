/**
 * state.js - singleton mutable S + EventBus.
 *
 * Reglas:
 * - S es la ÚNICA fuente de verdad. Toda la app comparte la misma referencia.
 * - Se exporta la referencia directa (no una copia) para permitir mutación.
 * - No hay reactivity ni proxies. Mutación es manual + save() + EventBus.emit().
 * - Schema versión: 1 (definida en _version). Migraciones en storage.js.
 */

import { SMMLV } from './constants.js';

/**
 * @typedef {Object} CuotaManejo
 * @property {number} monto      COP/mes que cobra el banco por la cuenta.
 * @property {number} diaCobro   1-31. Día del mes en que se cobra.
 */

/**
 * @typedef {Object} Cuenta
 * @property {string} id
 * @property {string} nombre
 * @property {string} banco
 * @property {string} tipo            Tipo de cuenta (ver TIPOS_CUENTA).
 * @property {number} saldo           Saldo actual en COP.
 * @property {string} [icono]
 * @property {boolean} activa
 * @property {string} fechaCreacion   ISO 8601.
 * @property {CuotaManejo|null} [cuotaManejo]  Opcional (v5). Si está, el
 *                                             dominio tesoreria crea
 *                                             automáticamente un Compromiso
 *                                             fijo mensual vinculado.
 */

/**
 * @typedef {Object} Ingreso
 * @property {string} id
 * @property {string} descripcion
 * @property {number} monto           COP.
 * @property {string} frecuencia      Ver FRECUENCIAS.
 * @property {boolean} activo
 * @property {string} fechaCreacion   ISO 8601.
 */

/**
 * @typedef {Object} Gasto
 * @property {string} id
 * @property {string} descripcion
 * @property {number} monto           COP.
 * @property {string} categoria       Ver CATEGORIAS_GASTO.
 * @property {string} fecha           ISO 8601 (YYYY-MM-DD).
 * @property {string} [cuentaId]      FK a Cuenta.id.
 * @property {string} [nota]
 */

/**
 * @typedef {Object} Compromiso
 * @property {string} id
 * @property {string} descripcion
 * @property {number} monto              COP. Cuota mensual (no el saldo total).
 * @property {string} frecuencia         Ver FRECUENCIAS.
 * @property {number} diaPago            1-31.
 * @property {string} tipo               'fijo' | 'deuda' | 'agenda'.
 * @property {boolean} activo
 * @property {string} fechaCreacion      ISO 8601.
 * @property {number} [saldoPendiente]   COP. Solo para tipo='deuda'. Saldo total
 *                                       que aún falta pagar. Si no está, la deuda
 *                                       no se cuenta en el patrimonio neto.
 * @property {number} [tasaEA]           Tasa efectiva anual (0-1). Solo para
 *                                       tipo='deuda'. Opcional, reservada para
 *                                       cálculos avanzados futuros (alertas de
 *                                       usura, plan de amortización).
 * @property {string}  [cuentaId]        FK a Cuenta.id. Solo se setea cuando
 *                                       el compromiso fue creado automáticamente
 *                                       por tesoreria como cuota de manejo (v5).
 * @property {boolean} [esCuotaManejo]   true para compromisos auto-generados
 *                                       desde la cuota de manejo de una cuenta (v5).
 *                                       Permite identificarlos sin ambigüedad
 *                                       para sincronizarlos cuando cambia la cuenta.
 */

/**
 * @typedef {Object} Presupuesto
 * @property {string} id
 * @property {string} categoria          Una de CATEGORIAS_GASTO.
 * @property {number} montoMensual       COP asignados al mes para esta categoría.
 * @property {boolean} activo
 * @property {string} fechaCreacion      ISO 8601.
 */

/**
 * @typedef {Object} Personal
 * @property {string} id
 * @property {string} persona            Nombre de a quién le prestaste.
 * @property {number} monto              Monto total prestado en COP.
 * @property {number} pagado             Cuánto te ha devuelto hasta ahora (≤ monto).
 * @property {string} fecha              ISO 8601 (YYYY-MM-DD) del préstamo.
 * @property {string} [motivo]           Descripción opcional ("mercado", "favor").
 * @property {string} [fechaLimite]      ISO 8601 opcional, fecha pactada de devolución.
 * @property {boolean} liquidado         true cuando pagado ≥ monto.
 * @property {string} fechaCreacion      ISO 8601 timestamp.
 */

/**
 * @typedef {Object} Meta
 * @property {string} id
 * @property {string} nombre
 * @property {number} montoObjetivo   COP.
 * @property {number} montoActual     COP.
 * @property {string} [fechaLimite]   ISO 8601 (YYYY-MM-DD).
 * @property {string} [icono]
 * @property {boolean} completada
 */

/**
 * @typedef {Object} Config
 * @property {boolean} notificaciones - true si el usuario habilitó recordatorios push.
 *                                      Require también que Notification.permission === 'granted'.
 */

/**
 * Factory del estado inicial (schema v3). storage.js lo reutiliza para resetear S
 * cuando localStorage está vacío o corrupto, sin duplicar la forma del schema.
 *
 * Cada llamada devuelve un objeto nuevo, así nunca se filtran referencias entre
 * fixtures de tests o entre carga y persistencia.
 *
 * @returns {{
 *   _version: number,
 *   onboarded: boolean,
 *   perfil: { nombre: string, smmlv: number },
 *   config: Config,
 *   cuentas: Cuenta[],
 *   ingresos: Ingreso[],
 *   gastos: Gasto[],
 *   compromisos: Compromiso[],
 *   metas: Meta[],
 *   presupuestos: Presupuesto[],
 *   personales: Personal[],
 *   logros: string[],
 * }}
 */
export function createInitialState() {
  return {
    /** Versión del schema persistido. Bumpear en cada migración nueva. */
    _version: 5,

    /** True tras completar el wizard inicial. */
    onboarded: false,

    /** Perfil del usuario. */
    perfil: {
      nombre: '',
      smmlv: SMMLV,
    },

    /** Configuración del usuario (notificaciones, preferencias futuras). */
    config: {
      notificaciones: false,
    },

    /** Cuentas / tesorería. */
    cuentas: [],

    /** Ingresos recurrentes y únicos. */
    ingresos: [],

    /** Gastos variables. */
    gastos: [],

    /** Compromisos: gastos fijos, deudas y agenda de pagos. */
    compromisos: [],

    /** Metas de ahorro. */
    metas: [],

    /** Presupuestos por categoría (envelope budgeting). v2. */
    presupuestos: [],

    /** Préstamos personales: plata que TÚ prestaste a otros (F.2, v3). */
    personales: [],

    /** IDs de logros ya desbloqueados por el usuario (G.3, v4). */
    logros: [],
  };
}

/**
 * Singleton mutable con todos los datos de usuario.
 * Es la referencia exportada por el módulo: todo importador comparte el mismo objeto.
 */
export const S = createInitialState();

/**
 * EventBus pub/sub. Desacopla dominios entre sí.
 * Convención de nombres: `dominio:acción` (ej: `state:change`, `ui:navigate`).
 */
export const EventBus = {
  /** @type {Record<string, Array<(data: unknown) => void>>} */
  _listeners: Object.create(null),

  /**
   * Suscribe `fn` al evento `event`. Suscripciones duplicadas se permiten.
   * @param {string} event
   * @param {(data: unknown) => void} fn
   */
  on(event, fn) {
    if (typeof fn !== 'function') return;
    (this._listeners[event] ??= []).push(fn);
  },

  /**
   * Desuscribe `fn` del evento `event`. No-op si no estaba registrado.
   * @param {string} event
   * @param {(data: unknown) => void} fn
   */
  off(event, fn) {
    const list = this._listeners[event];
    if (!list) return;
    const idx = list.indexOf(fn);
    if (idx !== -1) list.splice(idx, 1);
  },

  /**
   * Despacha `data` a todos los listeners de `event`.
   * Nunca lanza al caller: cualquier excepción de un listener se loguea y se ignora.
   * @param {string} event
   * @param {unknown} [data]
   */
  emit(event, data) {
    const list = this._listeners[event];
    if (!list || list.length === 0) return;
    // Iterar sobre copia para que un listener pueda hacer off() sin alterar el loop.
    for (const fn of list.slice()) {
      try {
        fn(data);
      } catch (err) {
        console.error(`[EventBus] listener of "${event}" threw:`, err);
      }
    }
  },
};
