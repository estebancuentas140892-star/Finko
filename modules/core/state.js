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
 * @property {boolean} [aplica4x1000]  Opcional. true si la cuenta está sujeta
 *                                     al GMF (4x1000). Siempre false para
 *                                     Efectivo. Ausente = no aplica.
 */

/**
 * @typedef {Object} Ingreso
 * @property {string}      id
 * @property {string}      descripcion
 * @property {number}      monto           COP.
 * @property {string}      frecuencia      Ver FRECUENCIAS.
 * @property {string|null} categoria       Ver CATEGORIAS_INGRESO. null si no se capturó (v16).
 * @property {number|null} diaPago         Día del mes (1-31) en que llega el pago.
 *                                          Para Quincenal: primer día (1-15); el segundo
 *                                          es diaPago + 15. null si no se capturó.
 * @property {boolean}     activo
 * @property {string}      fechaCreacion   ISO 8601.
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
 * @property {string} [compromisoId]  FK opcional a Compromiso.id (deuda). Marca este
 *                                    gasto como abono a la deuda y permite que al
 *                                    editar/eliminar el gasto se sincronice el
 *                                    saldoTotal del compromiso. Definido en ADR 002.
 */

/**
 * @typedef {Object} Compromiso
 * @property {string} id
 * @property {string} descripcion
 * @property {string} frecuencia         Ver FRECUENCIAS.
 * @property {number} diaPago            1-31.
 * @property {string} tipo               'fijo' | 'deuda-entidad' | 'deuda-personal'.
 *                                       Los antiguos 'deuda' y 'agenda' se migran en v6.
 * @property {boolean} activo
 * @property {string} fechaCreacion      ISO 8601.
 *
 * @property {number} [monto]            COP. Cuota fija mensual. Solo para tipo='fijo'.
 *
 * @property {number} [saldoTotal]       COP. Lo que aún se debe en total. Solo para
 *                                       deudas. Se descuenta al pagar (manual).
 * @property {number} [cuotaMensual]     COP. Lo que se paga al mes. Solo para deudas.
 *                                       Es lo que se proyecta como gasto del mes.
 * @property {number} [tasa]             Decimal 0-1 según `tasaUnidad`. Solo deudas.
 * @property {string} [tasaUnidad]       'EA' (anual, banco/tarjeta) o 'mensual'
 *                                       (gota a gota, préstamo personal). Solo deudas.
 *
 * @property {string|null} [categoria]   Para tipo='fijo': una de CATEGORIAS_AGENDA (v17).
 *                                       Para deudas: una de CATEGORIAS_DEUDA (v18).
 *                                       null si no se eligió.
 *
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
 * @typedef {Object} Apartado
 * @property {string}      id
 * @property {string}      nombre            Ej. "SOAT", "Productos personales".
 * @property {string}      icono             Emoji.
 * @property {number}      montoObjetivo     COP a reunir para el gasto previsible.
 * @property {number}      montoActual       COP acumulado vía aportes.
 * @property {string|null} fechaObjetivo     YYYY-MM-DD: cuándo se necesita. null si sin plazo.
 * @property {string}      frecuenciaAporte  Cada cuánto aporta: Diario|Semanal|Quincenal|Mensual.
 * @property {boolean}     recurrente        true si el gasto se repite (SOAT anual, impuestos). v14.
 * @property {number|null} periodoMeses      Cada cuántos meses se repite (12 anual, 6 semestral). v14.
 * @property {boolean}     completado
 * @property {string}      fechaCreacion     ISO 8601.
 */

/**
 * @typedef {Object} PerfilFiscal
 * @property {boolean} ivaResponsable        true si el usuario es responsable del IVA.
 * @property {boolean} obligadoContabilidad  true si está obligado a llevar contabilidad.
 * @property {boolean} declaranteObligado    true si la DIAN lo notificó como declarante.
 */

/**
 * @typedef {Object} DatosFiscalesAnio
 * @property {number} [ingresosBrutos]  COP. Ingresos brutos del año (Finko no los rastrea).
 * @property {number} [consumosTC]      COP. Consumos con tarjeta de crédito del año.
 * @property {number} [consignaciones]  COP. Consignaciones y depósitos del año.
 */

/**
 * @typedef {Object} Config
 * @property {boolean}     notificaciones - true si el usuario habilitó recordatorios push.
 *                                          Require también que Notification.permission === 'granted'.
 * @property {PerfilFiscal} [perfilFiscal] - Flags fiscales opcionales del usuario (K.2).
 *                                           Se añaden en v9. Ausentes = todos false.
 * @property {Record<string, DatosFiscalesAnio>} [datosFiscales] - Valores manuales
 *                                           del monitor de renta, keados por año (K.4).
 *                                           Se añaden en v10. Solo contienen los campos
 *                                           que el usuario registró explícitamente.
 */

/**
 * @typedef {Object} FondoEmergencia
 * @property {boolean} activo         true cuando el usuario ya activó el fondo.
 *                                    Mientras false, la sección muestra el empty state.
 * @property {number}  metaMeses      Cuántos meses de gastos fijos quiere cubrir
 *                                    (rango razonable 3-6, validado a 1-12).
 * @property {number}  montoActual    COP que ya tiene apartado para el fondo. Se
 *                                    edita manualmente; en J.1b se sumarán los
 *                                    aportes registrados desde un historial.
 */

/**
 * @typedef {Object} Aporte
 * @property {string} id
 * @property {number} monto              COP del aporte.
 * @property {string} fecha              ISO 8601 (YYYY-MM-DD).
 * @property {string} [nota]
 */

/**
 * @typedef {Object} Ahorro
 * @property {FondoEmergencia} fondoEmergencia
 * @property {Aporte[]} aportes               Historial de aportes (J.1b lo usa).
 * @property {number}   compromisoMensual     Cuánto se compromete a apartar por mes
 *                                            ("págate primero", J.1b).
 */

/**
 * @typedef {Object} Inversion
 * @property {string} id
 * @property {string} tipo            Uno de TIPOS_INVERSION (CDT, Fondo, etc.).
 * @property {string} nombre          Nombre legible ("CDT Bancolombia", "ETF S&P 500").
 * @property {number} monto           COP invertidos.
 * @property {number} tasaEA          Tasa efectiva anual estimada (%). 0 = variable.
 * @property {number} plazoMeses      Plazo en meses. 0 = sin plazo fijo.
 * @property {string} fechaInicio     ISO 8601 (YYYY-MM-DD).
 * @property {string} fechaCreacion   ISO 8601 timestamp.
 */

/**
 * Factory del estado inicial (schema v10). storage.js lo reutiliza para resetear S
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
 *   apartados: Apartado[],
 *   presupuestos: Presupuesto[],
 *   personales: Personal[],
 *   logros: string[],
 *   ahorro: Ahorro,
 *   inversiones: Inversion[],
 * }}
 */
export function createInitialState() {
  return {
    /** Versión del schema persistido. Bumpear en cada migración nueva. */
    _version: 14,

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
      perfilFiscal: {
        ivaResponsable:       false,
        obligadoContabilidad: false,
        declaranteObligado:   false,
      },
      datosFiscales: {},
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

    /** Apartados: sobres para gastos previsibles (SOAT, productos, etc.). v13. */
    apartados: [],

    /** Presupuestos por categoría (envelope budgeting). v2. */
    presupuestos: [],

    /** Préstamos personales: dinero que TÚ prestaste a otros (F.2, v3). */
    personales: [],

    /** IDs de logros ya desbloqueados por el usuario (G.3, v4). */
    logros: [],

    /** Ahorro: fondo de emergencia + hábito (J.1, v7). */
    ahorro: {
      fondoEmergencia: {
        activo:      false,
        metaMeses:   3,
        montoActual: 0,
      },
      aportes:           [],
      compromisoMensual: 0,
    },

    /** Inversiones reales: portafolio del usuario (J.2, v8). */
    inversiones: [],
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
