/**
 * compromisos/logic.js - barrel de re-exports de la capa de logica pura.
 *
 * La logica del dominio esta dividida en 4 sub-modulos bajo `logic/`. Este
 * archivo solo re-exporta las funciones publicas, manteniendo la API estable
 * para views/, index.js, los tests y los consumidores externos documentados
 * (agenda, analisis e infra/notificaciones importan de aqui).
 *
 * Sub-modulos:
 *   - logic/modelo.js     -> tipos, tasas, consultas, validacion, normalizacion
 *   - logic/alertas.js    -> fijos sin pagar, deudas durmiendo, vencidos, prioridades
 *   - logic/estrategia.js -> simulaciones de pago, recomendacion, reparto del extra
 *   - logic/abonos.js     -> aritmetica de abonos y estado de pago del mes
 *   - logic/avances.js    -> el avance con tarjeta: costo, validacion y efectos (ADR 169)
 *
 * Regla: los sub-modulos siguen siendo puros (sin DOM, sin S directo),
 * testeables en Node/Vitest sin mocks de navegador.
 */

export {
  TIPOS_COMPROMISO,
  TIPOS_DEUDA,
  LABEL_TIPO,
  ICONO_TIPO,
  esDeuda,
  esDebitoAutomatico,
  tasaMensualToEA,
  tasaEADe,
  compromisosActivos,
  calcularCompromisoMensual,
  calcularTotalCompromisos,
  calcularFijosMensuales,
  resumenSuscripciones,
  MINIMO_SUSCRIPCIONES_AVISO,
  resumenDeudas,
  proximoVencimiento,
  urgencia,
  nivelAlertaMora,
  validarCompromiso,
  avisoTasaAlta,
  TASA_MUY_ALTA,
  TASA_IMPOSIBLE,
  detectarDeudaCreciente,
  tasaMensualDecimal,
  normalizarCompromiso,
  normalizarDatosPago,
  erroresDatosPago,
} from './logic/modelo.js';

export {
  detectarFijosSinPagarEsteMes,
  detectarDeudasDurmiendo,
  detectarVencidosCompletos,
  vencidosSinPagar,
  pendientesDeObligacion,
  compromisosProximos,
  agruparPorDiasRestantes,
  sumarMontos,
} from './logic/alertas.js';

export {
  simularPagoDeuda,
  simularRenegociacion,
  simularConsolidacion,
  filtrarDeudasPagables,
  simularEstrategiaPago,
  compararEstrategias,
  recomendarEstrategia,
  recomendarPalanca,
  repartirExtraEnCuotas,
} from './logic/estrategia.js';

export {
  aplicarAbonoASaldo,
  revertirAbonoDeSaldo,
  ajustarMontoAbono,
  consecuenciaDeAbono,
  validarAbono,
  calcularAbonosDelMes,
  totalesPagadosDelAnio,
  fechaUltimoAbono,
  estadoPagoMes,
  deltasSaldoCompromisoPorEdicionGasto,
} from './logic/abonos.js';

export {
  CUOTAS_AVANCE,
  EFECTIVO_NUEVO,
  cuentaEfectivoNueva,
  leerTasaEscrita,
  erroresTasaEscrita,
  textoCostoDeAvance,
  esTarjetaOperable,
  costoDeAvance,
  validarAvance,
  normalizarAvance,
  deltasDeAvance,
  aplicarAvance,
  reversionAvancesAlBorrar,
  buscarAvance,
  avancesRecientes,
  DIAS_AVANCES_RECIENTES,
  MINIMO_AVANCES_AVISO,
} from './logic/avances.js';
