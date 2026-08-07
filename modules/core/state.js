/**
 * state.js - singleton mutable S + EventBus.
 *
 * Reglas:
 * - S es la ÚNICA fuente de verdad. Toda la app comparte la misma referencia.
 * - Se exporta la referencia directa (no una copia) para permitir mutación.
 * - No hay reactivity ni proxies. Mutación es manual + save() + EventBus.emit().
 * - Schema versión: 1 (definida en _version). Migraciones en storage.js.
 */

import { SMMLV, ACCESOS_INICIO_DEFAULT, ultimaVersionNovedadesConocida } from './constants.js';

/**
 * @typedef {Object} CuotaManejo
 * @property {number} monto      COP/mes que cobra el banco por la cuenta.
 * @property {number} diaCobro   1-31. Día del mes en que se cobra.
 */

/**
 * @typedef {Object} DatosTransferencia
 * Datos públicos que el usuario comparte cuando alguien le va a consignar a
 * esta cuenta (MC.14). Solo identificadores públicos: nunca contraseñas,
 * tokens ni credenciales. Todos los campos son opcionales entre sí; el
 * objeto completo es `null` si el usuario no activó "guardar datos de
 * transferencia" o los dejó todos vacíos.
 * @property {string} [numeroCuenta]  Número de cuenta o de producto.
 * @property {string} [llave]         Valor de la llave de transferencia.
 * @property {string} [tipoLlave]     Ver TIPOS_LLAVE. Presente si `llave` lo está.
 * @property {string} [alias]         Alias corto que el usuario reconoce (ej. "@mi-alias").
 */

/**
 * @typedef {Object} Cuenta
 * @property {string} id
 * @property {string} nombre
 * @property {string} banco
 * @property {string} tipo            Tipo de cuenta (ver TIPOS_CUENTA).
 * @property {number} saldo           Saldo actual en COP.
 * @property {string|null} [icono]    Opcional (CAT.2e). Id de símbolo del catálogo
 *                                    compartido (`ICONOS_CATEGORIA_PERSONALIZADA`),
 *                                    elegido con el picker solo cuando `banco==='Otro'`
 *                                    (que no tiene glifo propio). `null` en cualquier
 *                                    otro caso, nunca ausente.
 * @property {boolean} activa
 * @property {string} fechaCreacion   ISO 8601.
 * @property {CuotaManejo|null} [cuotaManejo]  Opcional (v5). Si está, el
 *                                             dominio tesoreria crea
 *                                             automáticamente un Compromiso
 *                                             fijo mensual vinculado.
 * @property {boolean} [aplica4x1000]  Opcional. true si la cuenta está sujeta
 *                                     al GMF (4x1000). Siempre false para
 *                                     Efectivo. Ausente = no aplica.
 * @property {DatosTransferencia|null} [datosTransferencia]  Opcional (MC.14).
 *                                     Finko como punto de consulta rápida, no
 *                                     para ejecutar transferencias.
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
 * @property {string}      [cuentaId]      Opcional (v27, MC.13d). FK a Cuenta.id:
 *                                          cuenta donde se recibe este ingreso.
 *                                          Ausente = no se capturó (los ingresos
 *                                          anteriores a v27 y los creados sin
 *                                          cuentas): el asistente cae al patrón
 *                                          de cuenta única / pregunta, como antes.
 *                                          Es solo un dato: NO implica que Finko
 *                                          abone el dinero solo (eso es PA.1).
 */

/**
 * Ingreso puntual: dinero que entra una sola vez (un trabajo, una venta, un
 * regalo), a diferencia de `Ingreso` que es una fuente recurrente. Es un evento
 * del ledger, no una plantilla: tiene fecha y cuenta destino, y al registrarlo
 * acredita el saldo de esa cuenta (espejo de un Gasto, que lo descuenta).
 *
 * Solo tesorería lo lee. Análisis y el resumen semanal no lo consideran como
 * flujo de ingreso: desde v8.8 la app no rastrea ingresos como flujo, solo
 * refleja el efecto vía patrimonio (saldos − deudas). Ver NAV.A1 / ADR 024.
 *
 * @typedef {Object} IngresoPuntual
 * @property {string}      id
 * @property {string}      descripcion     Fuente legible ("Venta bici", "Freelance"). Puede autogenerarse.
 * @property {number}      monto           COP.
 * @property {string|null} categoria       Ver CATEGORIAS_INGRESO. null si no se capturó.
 * @property {string}      cuentaId        FK a Cuenta.id: cuenta que recibió el dinero.
 * @property {string}      fecha           ISO 8601 (YYYY-MM-DD): día en que se recibió.
 * @property {string}      fechaCreacion   ISO 8601 timestamp.
 */

/**
 * Transferencia entre dos cuentas propias del usuario (MC.17). Un traslado
 * interno de dinero: NO es ingreso ni gasto, así que el patrimonio neto
 * (Σ saldos − Σ deudas) no cambia. Vive en su propia colección porque no
 * encaja en `gastos` ni en `ingresosPuntuales`; el ledger de Movimientos la
 * deriva como un tipo propio con dirección neutra (MC.17c). A diferencia de
 * `Cuenta.datosTransferencia` (solo un punto de consulta), aquí Finko sí
 * ejecuta el traslado: mueve ambos saldos.
 *
 * @typedef {Object} Transferencia
 * @property {string} id
 * @property {string} cuentaOrigenId    FK a Cuenta.id: de dónde sale el dinero.
 * @property {string} cuentaDestinoId   FK a Cuenta.id: a dónde llega. Distinta del origen.
 * @property {number} monto             COP trasladados (lo que llega al destino).
 * @property {string} fecha             ISO 8601 (YYYY-MM-DD): día del traslado.
 * @property {string} [nota]            Nota opcional del usuario.
 * @property {number} [costoGMF]        Opcional (MC.17d). 4x1000 del retiro cuando
 *                                      la cuenta de origen no está exenta y el
 *                                      usuario opta por descontarlo: sale
 *                                      `monto + costoGMF` del origen, entra `monto`
 *                                      al destino (el neto baja el GMF). Ausente = 0
 *                                      (origen exento o el usuario no lo descontó).
 * @property {string} fechaCreacion     ISO 8601 timestamp.
 */

/**
 * @typedef {Object} Gasto
 * @property {string} id
 * @property {string} [descripcion]   Legacy: el formulario ya no la pide (TX.9a,
 *                                    la categoría es el concepto principal); se
 *                                    preserva en gastos existentes que ya la tenían.
 * @property {number} monto           COP.
 * @property {string} categoria       Ver CATEGORIAS_GASTO.
 * @property {string} fecha           ISO 8601 (YYYY-MM-DD).
 * @property {string} [cuentaId]      FK a Cuenta.id.
 * @property {string} [nota]
 * @property {string} [compromisoId]  FK opcional a Compromiso.id (deuda). Marca este
 *                                    gasto como abono a la deuda y permite que al
 *                                    editar/eliminar el gasto se sincronice el
 *                                    saldoTotal del compromiso. Definido en ADR 002.
 * @property {boolean} [consumoTC]    MC.16b (ADR 051 D3). true: el gasto se pagó con
 *                                    la tarjeta de `compromisoId`, así que no descuenta
 *                                    ninguna cuenta (`cuentaId` ausente) y SUBE el
 *                                    saldoTotal de la tarjeta. Fija el signo del ajuste,
 *                                    que el abono a esa misma tarjeta lleva invertido con
 *                                    el mismo compromisoId. Deducirlo de la ausencia de
 *                                    cuentaId sería frágil: un gasto sin cuenta ya es
 *                                    legal (efectivo no registrado).
 * @property {number} [cuotas]        MC.16d. Solo con `consumoTC`: a cuántas cuotas se
 *                                    difirió el consumo (1 = pago único). Sube
 *                                    `cuotaMensual` de la tarjeta en `monto / cuotas`; no
 *                                    crea un plan de pagos por compra (ADR 051 D2), el
 *                                    saldo sigue siendo revolvente.
 * @property {boolean} [avanceTC]     MC.16e (ADR 051 D7). Solo con `consumoTC`: el
 *                                    consumo fue un avance en efectivo, no una compra.
 *                                    Solo dispara el aviso de costo en el formulario:
 *                                    no cambia el saldo, la cuota ni ningún cálculo.
 *                                    Es dato del usuario porque no hay forma de
 *                                    deducirlo (la categoría del gasto no lo dice).
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
 * @property {string} [nota]             Texto libre opcional (MC.13e-2c). Se muestra junto
 *                                       a la fila en el asistente de distribución. Para
 *                                       tipo='fijo' con categoría predefinida es el campo
 *                                       de texto del form (AG.4, doble uso con descripcion);
 *                                       para deudas es un campo propio, directo del form.
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
 *                                       Para deuda-entidad: una de CATEGORIAS_DEUDA (v18).
 *                                       Para deuda-personal: una de CATEGORIAS_DEUDA_PERSONAL
 *                                       (D.10; valores de producto anteriores se conservan
 *                                       tal cual y se reclasifican al editar).
 *                                       null si no se eligió.
 *
 * @property {string}  [cuentaId]        FK a Cuenta.id. Solo se setea cuando
 *                                       el compromiso fue creado automáticamente
 *                                       por tesoreria como cuota de manejo (v5).
 * @property {boolean} [esCuotaManejo]   true para compromisos auto-generados
 *                                       desde la cuota de manejo de una cuenta (v5).
 *                                       Permite identificarlos sin ambigüedad
 *                                       para sincronizarlos cuando cambia la cuenta.
 *
 * @property {string|null} [cuentaOrigenId]  FK a Cuenta.id (D.14). Solo deudas:
 *                                       la cuenta donde se acreditó el dinero
 *                                       recibido al crear la deuda. null/undefined
 *                                       si no aplica (tarjeta ya consumida, deuda
 *                                       vieja registrada a posteriori, crédito que
 *                                       pagó directo a un tercero). Se fija solo al
 *                                       crear, nunca al editar.
 * @property {number}  [montoAcreditado] COP (D.14). Copia inmutable de saldoTotal
 *                                       en el momento de crear la deuda, para poder
 *                                       revertir el crédito exacto si se elimina más
 *                                       adelante sin que abonos posteriores lo afecten.
 *                                       Solo presente junto con cuentaOrigenId.
 *
 * @property {number}  [cupoTotal]       COP (ADR 051 D1). Cupo aprobado de una
 *                                       tarjeta de crédito (categoria='Tarjeta de
 *                                       crédito'). Discriminador de "tarjeta operable":
 *                                       con cupoTotal recibe consumos y muestra
 *                                       disponible (cupoTotal - saldoTotal, derivado,
 *                                       nunca almacenado); sin cupoTotal es una deuda
 *                                       vieja capturada a posteriori. Solo deuda-entidad.
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
 * @property {string} [nota]          Texto libre opcional (MC.13e-2c). Se muestra
 *                                    junto a la meta en el asistente de distribución.
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
 * @property {string}      [fechaInicioPlan] YYYY-MM-DD: arranque del ciclo vigente, lo anota
 *   `reiniciarCiclo()` al cerrar uno (DIS.15). Opcional y sin migración: quien no lo tenga
 *   mide su plan de referencia desde `fechaCreacion`, que es su primer ciclo.
 * @property {string}      [nota]            Texto libre opcional (MC.13e-2c). Se muestra
 *   junto al apartado en el asistente de distribución.
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
 * @typedef {Object} AceptacionLegal
 * @property {string} version   Valor de VERSION_LEGAL (config/legal.js) aceptado.
 * @property {string} fecha     ISO 8601 (YYYY-MM-DD) de la aceptación.
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
 * @property {AceptacionLegal|null} legalAceptado - Registro de aceptación versionada
 *                                           del paquete legal (LEG.2, schema v33). `null`
 *                                           = todavía no aceptó la versión vigente
 *                                           (`VERSION_LEGAL`): la app pide aceptación antes
 *                                           de continuar. Se añade en v33.
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
 * @property {string} [cuentaId]      Cuenta de la que salió el dinero (INV.1). Ausente = la
 *                                    inversión ya existía o el dinero vino de fuera de la app,
 *                                    y entonces ninguna cuenta se descontó al registrarla.
 *                                    Opcional y `undefined`-safe a propósito: hay cuatro casos
 *                                    legítimos sin origen (preexistente, descuento de nómina,
 *                                    rendimiento reinvertido, dinero externo) y adivinarlo para
 *                                    los registros viejos seria inventar el dato
 *                                    ([ADR 053](../../docs/DECISIONS/053-invariante-de-patrimonio.md) I4).
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
 *   perfil: { nombre: string, smmlv: number, situacionLaboral: string },
 *   config: Config,
 *   cuentas: Cuenta[],
 *   ingresos: Ingreso[],
 *   ingresosPuntuales: IngresoPuntual[],
 *   transferencias: Transferencia[],
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
      /**
       * @deprecated (CFG.1) Ningún cálculo lo lee: la lógica usa la constante
       * legal `SMMLV`, no este campo. Ya no se muestra ni se edita en Ajustes;
       * se conserva en el estado por compatibilidad de datos existentes.
       */
      smmlv: SMMLV,
      /** Situación laboral (CFG.1, schema v25). '' = sin especificar. Ids en `SITUACIONES_LABORALES`. */
      situacionLaboral: '',
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
      /** Accesos rápidos personalizables de Inicio (IN.4a, schema v23). */
      accesosInicio: [...ACCESOS_INICIO_DEFAULT],
      /** Última versión de NOVEDADES_POR_VERSION ya vista (UPD.1, schema v32). */
      ultimaVersionVista: ultimaVersionNovedadesConocida(),
      /** Aceptación versionada del paquete legal (LEG.2, schema v33). null = pendiente. */
      legalAceptado: null,
      /** Atajos de teclado de escritorio (INT.1h, schema v35). WCAG 2.1.4: apagable. */
      atajosTeclado: true,
    },

    /** Cuentas / tesorería. */
    cuentas: [],

    /** Fuentes de ingreso recurrentes (plantillas: salario, arriendo...). */
    ingresos: [],

    /** Ingresos puntuales: dinero que entra una sola vez, con fecha y cuenta destino (NAV.A1, v22). */
    ingresosPuntuales: [],

    /** Transferencias entre cuentas propias: traslado interno, no ingreso ni gasto (MC.17, v26). */
    transferencias: [],

    /** Gastos variables. */
    gastos: [],

    /**
     * Categorías creadas por el usuario, de Gastos o de Gastos fijos (TX.9b,
     * extendida a Gastos fijos en CAT.3a, schema v31, ADR 058 D1). El
     * `nombre` (no el `id` que le asigna `guardar()`) es la clave que se
     * guarda en `Gasto.categoria` o `Compromiso.categoria`, igual que una
     * nativa. `seccion` decide en qué formulario se **ofrece** como chip
     * (`'gasto'` o `'fijo'`); resolver su ícono ya guardado ignora la
     * sección (ADR 058 D2).
     * @type {{ id: string, nombre: string, icono: string, fechaCreacion: string, seccion: 'gasto' | 'fijo' }[]}
     */
    categoriasPersonalizadas: [],

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
 * Convención de nombres: `dominio:acción` (ej: `state:change`, `distribucion:aplicar`).
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
